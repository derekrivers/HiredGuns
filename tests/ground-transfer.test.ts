import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import type { InventorySlot } from '../src/import/characters';
import { importItems, ITEM_FILE_BYTES } from '../src/import/items';
import { initializeOriginalTeam } from '../src/import/original-team';
import { groundTransferCommand, transferGroundItem, transferOriginalGroundItem, type GroundTransferCommand, type GroundTransferState } from '../src/items/ground-transfer';

const slot = (itemId: number, damage = 17, ammo = 3, fourthByte = 201): InventorySlot => ({ itemId, damage, ammo, fourthByte,
  rawHex: [itemId, damage, ammo, fourthByte].map(n => n.toString(16).padStart(2, '0')).join('') });
const command = (kind: GroundTransferCommand['kind']): GroundTransferCommand => ({ version: 1, kind });
function state(count = 3, equipped = 0): GroundTransferState {
  return { ground: slot(9, 178, 7, 253), selection: 0, inventory: { equipped: slot(equipped, 91, 2, 93),
    carried: Array.from({ length: 30 }, (_, i) => slot(i < count ? 7 : 0, i + 11, i + 12, i + 13)),
    actions: Array.from({ length: 10 }, (_, i) => slot(i + 1)) } };
}
async function table() {
  const bytes = new Uint8Array(ITEM_FILE_BYTES), view = new DataView(bytes.buffer);
  for (let i = 0; i < 114; i++) view.setUint16(i * 286 + 260, (i + 1) * 140);
  bytes[8 * 286 + 254] = 21;
  return importItems(bytes);
}
function ownership(s: GroundTransferState) {
  return [s.ground, s.inventory.equipped, ...s.inventory.carried].filter(s => s.itemId).map(s => s.rawHex).sort();
}

describe('explicit logical ground transfers with synthetic data', () => {
  it('picks up into empty equipment even with all 30 carried slots occupied, preserving full bytes', async () => {
    const items = await table(), source = state(30), original = structuredClone(source);
    const result = transferGroundItem(source, items, 1000, command('pickup-equipment'));
    expect(result.outcome).toBe('transferred');
    expect(result.state.inventory.equipped).toEqual(source.ground);
    expect(result.state.ground).toEqual(slot(0, 178, 7, 253));
    expect(result.state.inventory.carried).toEqual(source.inventory.carried);
    expect(result.state.inventory.actions).toEqual(source.inventory.actions);
    expect(result.weight).toEqual({ status: 'computed', totalWeight: (30 * 7 + 9 * 7) * 140, quotient: 273, tooHeavy: false, usingGrenade: 2 });
    expect(ownership(result.state)).toEqual(ownership(source));
    result.state.inventory.actions[0]!.ammo = 255; result.state.inventory.carried[0]!.damage = 0;
    expect(source).toEqual(original);
  });
  it('stows occupied equipment and inserts ground into carried at every supported position/prefix', async () => {
    const items = await table();
    for (const kind of ['pickup-equipment', 'pickup-carried'] as const) {
      for (let count = 0; count < 30; count++) for (let selection = 0; selection <= Math.max(0, count - 1); selection++) {
        const source = state(count, 3); source.selection = selection;
        const before = structuredClone(source), expected = structuredClone(source);
        const inserted = kind === 'pickup-equipment' ? source.inventory.equipped : source.ground;
        expected.inventory.carried = [...source.inventory.carried.slice(0, selection), inserted, ...source.inventory.carried.slice(selection, 29)];
        if (kind === 'pickup-equipment') expected.inventory.equipped = source.ground;
        expected.ground = slot(0, 178, 7, 253);
        const result = transferGroundItem(source, items, 1000, command(kind));
        expect(result.outcome).toBe('transferred'); expect(result.state).toEqual(expected);
        expect(result.weight.totalWeight).toBe((count * 7 + 3 + 9 * 7) * 140);
        expect(result.weight.usingGrenade).toBe(kind === 'pickup-equipment' ? 2 : 0);
        expect(ownership(result.state)).toEqual(ownership(source)); expect(source).toEqual(before);
      }
    }
  });
  it('refuses actual full carried storage atomically, and allows a pickup to cross the weight threshold', async () => {
    const items = await table();
    for (const kind of ['pickup-equipment', 'pickup-carried'] as const) {
      const source = state(30, 3); source.selection = 29; const original = structuredClone(source);
      const result = transferGroundItem(source, items, 1000, command(kind));
      expect(result.outcome).toBe('no-room'); expect(result.state).toEqual(original); expect(source).toEqual(original);
    }
    const source = state(1), picked = transferGroundItem(source, items, 7, command('pickup-equipment'));
    expect(picked.outcome).toBe('transferred'); expect(picked.weight.tooHeavy).toBe(true);
    const next = { ...picked.state, ground: slot(2) }, refused = transferGroundItem(next, items, 7, command('pickup-carried'));
    expect(refused.outcome).toBe('already-too-heavy'); expect(refused.state).toEqual(next);
    const dropped = transferGroundItem({ ...picked.state, ground: slot(0, 4, 5, 6) }, items, 7, command('drop-equipment'));
    expect(dropped.outcome).toBe('transferred'); expect(dropped.weight.tooHeavy).toBe(false);
  });
  it('drops full equipment, clears only the ID, and refuses an occupied ground slot without swapping', async () => {
    const items = await table(), source = state(30, 9); source.ground = slot(0, 66, 67, 68);
    const before = structuredClone(source), result = transferGroundItem(source, items, 1000, command('drop-equipment'));
    expect(result.state.ground).toEqual(source.inventory.equipped);
    expect(result.state.inventory.equipped).toEqual(slot(0, 91, 2, 93));
    expect(result.state.inventory.carried).toEqual(source.inventory.carried);
    expect(result.state.inventory.actions).toEqual(source.inventory.actions);
    expect(result.weight.totalWeight).toBe(30 * 7 * 140); expect(result.weight.usingGrenade).toBe(0);
    expect(source).toEqual(before); expect(ownership(result.state)).toEqual(ownership(source));
    const refused = transferGroundItem(state(3, 9), items, 1000, command('drop-equipment'));
    expect(refused.outcome).toBe('ground-occupied'); expect(refused.state).toEqual(state(3, 9));
    expect(transferGroundItem(state(), items, 1000, command('drop-equipment')).outcome).toBe('empty-equipment');
    const empty = state(); empty.ground = slot(0);
    expect(transferGroundItem(empty, items, 1000, command('pickup-carried')).outcome).toBe('empty-ground');
  });
  it('uses category-specific count weight, zero count, signed physique words, and fails closed on DIVU overflow', async () => {
    const items = await table();
    for (const category of [4, 21, 23, 0]) {
      items.records[8]!.category = category;
      for (const ammo of [0, 1, 255]) {
        const source = state(0); source.ground = slot(9, 2, ammo, 99);
        const result = transferGroundItem(source, items, 32767, command('pickup-equipment'));
        expect(result.weight.totalWeight).toBe(9 * 140 * (category === 0 ? 1 : ammo));
      }
    }
    expect(transferGroundItem(state(0), items, 65535, command('pickup-carried')).outcome).toBe('already-too-heavy');
    items.records[8]!.category = 21; items.records[8]!.weight = 65535;
    const source = state(0); source.ground = slot(9, 0, 255);
    expect(() => transferGroundItem(source, items, 32767, command('pickup-equipment'))).toThrow('overflow');
  });
  it('requires exact command fields/version and validates all slots, tails/actions, widths and selection domains', async () => {
    for (const value of [null, {}, [], { version: 2, kind: 'drop-equipment' }, { version: 1, kind: 'exchange' },
      { version: 1, kind: 'pickup-carried', slot: 0 }, Object.create({ version: 1, kind: 'drop-equipment' }),
      Object.defineProperty({ version: 1 }, 'kind', { enumerable: true, get: () => 'drop-equipment' })]) expect(() => groundTransferCommand(value)).toThrow();
    expect(groundTransferCommand(command('pickup-carried'))).toEqual(command('pickup-carried'));
    const items = await table();
    const changes: ((s: GroundTransferState) => void)[] = [
      s => { s.inventory.carried.pop(); }, s => { s.inventory.actions.pop(); },
      s => { delete s.inventory.carried[29]; }, s => { delete s.inventory.actions[9]; },
      s => { s.inventory.carried[1] = slot(0); }, s => { s.selection = 3; },
      s => { s.inventory.actions[9]!.rawHex = 'bad'; }, s => { s.inventory.carried[29]!.fourthByte = 256; },
      s => { s.inventory.equipped.ammo = -1; }, s => { s.ground = slot(115); },
      s => { s.inventory.actions[0] = slot(255); }, s => { s.ground.damage = 0.1; },
      s => { Object.assign(s.ground, { extra: true }); }, s => { Object.assign(s.inventory.carried, { extra: true }); },
      s => { Object.defineProperty(s.inventory.actions, 9, { enumerable: true, get: () => slot(1) }); },
    ];
    for (const change of changes) {
      const source = state(); change(source);
      for (const kind of ['pickup-carried', 'pickup-equipment', 'drop-equipment'] as const) expect(() => transferGroundItem(source, items, 1000, command(kind))).toThrow();
    }
    for (const number of [-1, 65536, NaN, 1.1]) expect(() => transferGroundItem(state(), items, number, command('pickup-carried'))).toThrow();
    const source = state(), before = structuredClone(source); items.records[6]!.weight = -1;
    expect(() => transferGroundItem(source, items, 1000, command('pickup-carried'))).toThrow(); expect(source).toEqual(before);
  });
  it('replays serialized commands deterministically with conserved ownership through repeated pickup/drop', async () => {
    const items = await table(), original = state(3, 3);
    original.ground = slot(0, 8, 9, 10);
    const commands = Array.from({ length: 128 }, (_, i) => command(i % 2 === 0 ? 'drop-equipment' : 'pickup-equipment'));
    const replay = () => commands.reduce((s, c) => {
      const next = transferGroundItem(s, items, 1000, groundTransferCommand(JSON.parse(JSON.stringify(c))));
      expect(next.outcome).toBe('transferred'); expect(ownership(next.state)).toEqual(ownership(original));
      return JSON.parse(JSON.stringify(next.state)) as GroundTransferState;
    }, structuredClone(original));
    expect(replay()).toEqual(replay());
  });
  it('rejects claimed source authority from synthetic raw inputs', async () => {
    await expect(transferOriginalGroundItem(state(), command('pickup-equipment'), { roster: new Uint8Array(16320), items: new Uint8Array(ITEM_FILE_BYTES) }, 0)).rejects.toThrow('exact verified OCS');
  });
});

const privateInputs = !!(process.env.HIRED_GUNS_CHARACTERS && process.env.HIRED_GUNS_ITEMS);
describe.skipIf(!privateInputs)('private verified OCS bytes (never a public fixture)', () => {
  it('derives canonical physique and table weight from raw evidence, snapshots before await, and matches packed-byte ownership', async () => {
    const sources = { roster: new Uint8Array(await readFile(process.env.HIRED_GUNS_CHARACTERS!)), items: new Uint8Array(await readFile(process.env.HIRED_GUNS_ITEMS!)) };
    const original = await initializeOriginalTeam(sources.roster, sources.items, [0, 1, 2, 3]);
    const items = await importItems(sources.items);
    for (const actor of original.actors) {
      const source: GroundTransferState = { inventory: actor.inventory, ground: slot(0, 4, 5, 6), selection: 0 };
      const occupied = actor.inventory.carried.find(s => s.itemId)!;
      // Explicit authored placement uses a verified inventory entry; no map injection.
      source.ground = { ...occupied };
      const result = await transferOriginalGroundItem(source, command('pickup-equipment'), sources, actor.canonicalIndex);
      expect(result.outcome).toBe('transferred'); expect(result.weight.status).toBe('verified');
      const raw = Buffer.from(occupied.rawHex, 'hex');
      expect(result.state.inventory.equipped).toEqual(slot(raw[0]!, raw[1]!, raw[2]!, raw[3]!));
      expect(result.state.inventory.carried).toEqual(actor.inventory.carried);
      expect(ownership(result.state)).toEqual(ownership(source));
      const expectedWeight = (s: GroundTransferState) => [s.inventory.equipped, ...s.inventory.carried].reduce((sum, entry) => {
        const id = parseInt(entry.rawHex.slice(0, 2), 16); if (!id) return sum;
        const record = Buffer.from(items.records[id - 1]!.rawHex, 'hex');
        return sum + record.readUInt16BE(260) * ([4, 21, 23].includes(record[254]!) ? parseInt(entry.rawHex.slice(4, 6), 16) : 1);
      }, 0);
      expect(result.weight.totalWeight).toBe(expectedWeight(result.state));
      const dropped = await transferOriginalGroundItem(result.state, command('drop-equipment'), sources, actor.canonicalIndex);
      expect(dropped.state.ground).toEqual(occupied); expect(dropped.weight.totalWeight).toBe(expectedWeight(source));
    }
    const input = state(0), before = structuredClone(input), op = command('pickup-carried');
    const expected = await transferOriginalGroundItem(before, op, sources, 0);
    const pending = transferOriginalGroundItem(input, op, sources, 0);
    sources.roster.fill(0); sources.items.fill(0); input.ground.itemId = 0; op.kind = 'drop-equipment';
    expect(await pending).toEqual(expected);
    await expect(transferOriginalGroundItem(before, command('pickup-carried'), sources, 0)).rejects.toThrow();
  });
});
