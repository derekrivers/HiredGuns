import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import type { InventorySlot } from '../src/import/characters';
import { importItems, ITEM_FILE_BYTES } from '../src/import/items';
import type { SelectionInventory } from '../src/import/inventory';
import { importEditorMap } from '../src/import/editor-map';
import { MAX_INVENTORY_COMMANDS, exchangeOccupiedEquipment, equipCommands, inventoryCommands, returnEquipmentToBackpack, transferIntoEmptyEquipment } from '../src/sim/training-inventory';
import { createTrainingSession, equipTrainingSession, returnTrainingSession, exchangeTrainingSession, exportTrainingSession, importTrainingSession, resetTrainingInventory } from '../src/sim/training-session';
import { stepWorld } from '../src/sim/world';

const slot = (id: number, damage = 17, ammo = 3, fourthByte = 93): InventorySlot => ({ itemId: id, damage, ammo, fourthByte,
  rawHex: [id, damage, ammo, fourthByte].map(n => n.toString(16).padStart(2, '0')).join('') });
const inventory = (): SelectionInventory => ({ equipped: slot(0, 91, 92, 93),
  carried: [slot(7), slot(3, 34, 5, 99), slot(9, 77, 2, 255), ...Array.from({ length: 27 }, (_, i) => slot(0, i, i + 1, i + 2))],
  actions: Array.from({ length: 10 }, (_, i) => slot(i + 1)) });
async function table() {
  const bytes = new Uint8Array(ITEM_FILE_BYTES), view = new DataView(bytes.buffer);
  for (let i = 0; i < 114; i++) view.setUint16(i * 286 + 260, (i + 1) * 140);
  bytes[2 * 286 + 254] = 4; bytes[8 * 286 + 254] = 21;
  return importItems(bytes);
}

describe('logical empty-equipment transfer with authored data (no original authority)', () => {
  it('copies all four bytes, compacts forward, clears only final ID and preserves actions/empty tails', async () => {
    const source = inventory(), items = await table(), before = structuredClone({ source, items });
    const result = transferIntoEmptyEquipment(source, items, 100, 0);
    expect(result.inventory.equipped).toEqual(source.carried[0]);
    expect(result.inventory.carried.slice(0, 2)).toEqual(source.carried.slice(1, 3));
    expect(result.inventory.carried[2]).toEqual({ ...source.carried[2], itemId: 0, rawHex: '004d02ff' });
    expect(result.inventory.carried.slice(3)).toEqual(source.carried.slice(3));
    expect(result.inventory.actions).toEqual(source.actions); expect(result.selection).toBe(0);
    expect(result.weight).toEqual({ totalWeight: (7 + 3 * 5 + 9 * 2) * 140, quotient: 40, tooHeavy: false, usingGrenade: 0 });
    result.inventory.carried[3]!.fourthByte = 0;
    expect({ source, items }).toEqual(before);
  });
  it('last/sole removal adjusts selection and equipped grenade metadata follows weight arithmetic only', async () => {
    const source = inventory(), items = await table();
    const last = transferIntoEmptyEquipment(source, items, 39, 2);
    expect(last.selection).toBe(1); expect(last.inventory.carried.slice(0, 2)).toEqual(source.carried.slice(0, 2));
    expect(last.weight.tooHeavy).toBe(true); expect(last.weight.usingGrenade).toBe(2);
    const sole = inventory(); sole.carried = [slot(7), ...sole.carried.slice(1).map(s => ({ ...s, itemId: 0, rawHex: `00${s.rawHex.slice(2)}` }))];
    expect(transferIntoEmptyEquipment(sole, items, 7, 0).selection).toBe(0);
  });
  it('rejects holes, full/empty prefixes, bad selections, occupied equipment and malformed weight atomically', async () => {
    const items = await table();
    for (const change of [
      (s: SelectionInventory) => { s.equipped = slot(7); },
      (s: SelectionInventory) => { s.carried[1] = slot(0); },
      (s: SelectionInventory) => { s.carried = Array.from({ length: 30 }, () => slot(7)); },
      (s: SelectionInventory) => { s.carried = Array.from({ length: 30 }, () => slot(0)); },
      (s: SelectionInventory) => { s.carried[0]!.rawHex = 'invalid'; },
      (s: SelectionInventory) => { s.carried[0] = slot(255); },
    ]) {
      const source = inventory(); change(source); const before = structuredClone(source);
      expect(() => transferIntoEmptyEquipment(source, items, 100, 0)).toThrow(); expect(source).toEqual(before);
    }
    for (const index of [-1, 3, 30, 0.5, NaN]) expect(() => transferIntoEmptyEquipment(inventory(), items, 100, index)).toThrow();
  });
  it('bounds commands with strict fields, dense storage and unique actors', () => {
    expect(equipCommands([{ actor: 3, slot: 29 }])).toEqual([{ actor: 3, slot: 29 }]);
    for (const value of [null, {}, new Array(1), [{ actor: 0, slot: 0 }, { actor: 0, slot: 1 }], [{ actor: 4, slot: 0 }], [{ actor: 0, slot: '0' }], [{ actor: 0, slot: 0, extra: 1 }], Array.from({ length: 5 }, (_, actor) => ({ actor, slot: 0 }))]) expect(() => equipCommands(value)).toThrow();
  });
  it('returns at every supported prefix/position with complete reverse copies and ID-only clearing', async () => {
    const items = await table();
    for (let end = 0; end < 30; end++) for (let position = 0; position <= Math.max(0, end - 1); position++) {
      const source = inventory(); source.equipped = slot(9, 67, 3, 201);
      source.carried = Array.from({ length: 30 }, (_, i) => slot(i < end ? 7 : 0, i + 11, i + 12, i + 13));
      const before = structuredClone(source), result = returnEquipmentToBackpack(source, items, 100, position);
      const expected = structuredClone(source);
      expected.carried = [...source.carried.slice(0, position), source.equipped, ...source.carried.slice(position, 29)];
      expected.equipped = { ...source.equipped, itemId: 0, rawHex: `00${source.equipped.rawHex.slice(2)}` };
      expect(result.inventory).toEqual(expected); expect(result.selection).toBe(position);
      expect(result.weight.usingGrenade).toBe(0); expect(source).toEqual(before);
      expect(result.inventory.carried[29]).toEqual(source.carried[28]);
      result.inventory.actions[0]!.ammo = 0; expect(source).toEqual(before);
    }
  });
  it('refuses empty equipment, full/holey storage, invalid insertion range and unavailable weight atomically', async () => {
    const items = await table();
    for (const change of [
      (s: SelectionInventory) => { s.equipped = slot(0); },
      (s: SelectionInventory) => { s.carried[1] = slot(0); },
      (s: SelectionInventory) => { s.carried = Array.from({ length: 30 }, () => slot(7)); },
      (s: SelectionInventory) => { s.equipped.rawHex = 'invalid'; },
      (s: SelectionInventory) => { s.equipped = slot(255); },
      (s: SelectionInventory) => { s.actions.pop(); },
    ]) {
      const source = inventory(); source.equipped = slot(9); change(source); const before = structuredClone(source);
      expect(() => returnEquipmentToBackpack(source, items, 100, 0)).toThrow(); expect(source).toEqual(before);
    }
    const source = inventory(); source.equipped = slot(9); const before = structuredClone(source);
    for (const index of [-1, 3, 29, 30, 0.5, NaN]) expect(() => returnEquipmentToBackpack(source, items, 100, index)).toThrow();
    expect(() => returnEquipmentToBackpack(source, items, -1, 0)).toThrow(); expect(source).toEqual(before);
  });
  it('exchanges complete occupied entries at every carried slot, including full storage, without touching tails/actions', async () => {
    const items = await table();
    for (let index = 0; index < 30; index++) {
      const source = inventory(); source.equipped = slot(7, 221, 19, 213);
      source.carried[index] = slot(9, 135, 7, 192);
      const before = structuredClone(source), expected = structuredClone(source);
      [expected.equipped, expected.carried[index]] = [expected.carried[index]!, expected.equipped];
      const result = exchangeOccupiedEquipment(source, items, 1, index);
      expect(result.inventory).toEqual(expected); expect(result.selection).toBe(index);
      expect(result.weight.usingGrenade).toBe(2);
      const back = exchangeOccupiedEquipment(result.inventory, items, 1, index);
      expect(back.inventory).toEqual(source); expect(back.weight.totalWeight).toBe(result.weight.totalWeight);
      expect(back.weight.usingGrenade).toBe(0); expect(source).toEqual(before);
      result.inventory.actions[0]!.ammo = 0; expect(source).toEqual(before);
    }
    const full = inventory(); full.equipped = slot(7); full.carried = Array.from({ length: 30 }, () => slot(3));
    expect(exchangeOccupiedEquipment(full, items, 100, 29).inventory.equipped).toEqual(full.carried[29]);
    for (const change of [
      (a: SelectionInventory) => { a.equipped = slot(0); },
      (a: SelectionInventory) => { a.carried[0] = slot(0); },
      (a: SelectionInventory) => { a.equipped.rawHex = 'invalid'; },
      (a: SelectionInventory) => { a.carried[0] = slot(255); },
      (a: SelectionInventory) => { a.actions.pop(); },
      (a: SelectionInventory) => { a.carried.pop(); },
    ]) {
      const source = inventory(); source.equipped = slot(7); change(source); const before = structuredClone(source);
      expect(() => exchangeOccupiedEquipment(source, items, 100, 0)).toThrow(); expect(source).toEqual(before);
    }
    const source = inventory(); source.equipped = slot(7);
    for (const index of [-1, 3, 30, 0.5, NaN]) expect(() => exchangeOccupiedEquipment(source, items, 100, index)).toThrow();
    expect(() => exchangeOccupiedEquipment(source, items, -1, 0)).toThrow();
  });
  it('keeps actor phases independent with any number of occupied exchanges and exact v3/v4 restrictions', () => {
    const e = { kind: 'equip', actor: 0, slot: 0 }, x = { kind: 'exchange', actor: 0, slot: 29 }, r = { kind: 'return', actor: 0, slot: 0 };
    const commands = [e, x, { ...e, actor: 1 }, x, { ...x, actor: 1 }, r, { ...x, actor: 1 }, e, x];
    expect(inventoryCommands(commands)).toEqual(commands);
    for (const value of [[x], [e, r, x], [e, x, e], [e, { ...x, slot: 30 }], [e, { ...x, slot: -1 }], [e, { ...x, extra: true }]]) expect(() => inventoryCommands(value)).toThrow();
    expect(() => inventoryCommands([e, x], false, false)).toThrow();
    expect(() => inventoryCommands([e, x], true)).toThrow();
    expect(inventoryCommands([e, r, e], false, false)).toEqual([e, r, e]);
    const full = [e, ...Array.from({ length: 127 }, () => x)];
    expect(inventoryCommands(full)).toHaveLength(128);
    expect(() => inventoryCommands([...full, x])).toThrow('budget');
  });
  it('bounds v4 total replay cost while allowing all four actors to alternate repeatedly', () => {
    const commands = Array.from({ length: MAX_INVENTORY_COMMANDS }, (_, i) => ({ kind: Math.floor(i / 4) % 2 ? 'return' : 'equip', actor: i % 4, slot: 0 }));
    expect(inventoryCommands(commands)).toEqual(commands);
    expect(() => inventoryCommands([...commands, { kind: 'equip', actor: 0, slot: 0 }])).toThrow('budget');
    expect(() => inventoryCommands(commands, true)).toThrow();
    expect(() => inventoryCommands([{ kind: 'return', actor: 0, slot: 0 }])).toThrow();
    expect(() => inventoryCommands([{ kind: 'equip', actor: 0, slot: 0 }, { kind: 'equip', actor: 0, slot: 1 }])).toThrow();
  });
  it('replays successive reorders against a packed-byte oracle without normalizing accumulated tails', async () => {
    const items = await table(); let actual = inventory(); const original = structuredClone(actual);
    const rows = [actual.equipped, ...actual.carried].map(e => Buffer.from(e.rawHex, 'hex'));
    const decode = (b: Buffer) => slot(b[0]!, b[1]!, b[2]!, b[3]!);
    for (let cycle = 0; cycle < 64; cycle++) {
      const pick = cycle % 3, position = cycle % 2;
      const selected = Buffer.from(rows[pick + 1]!);
      const tail = Buffer.from(rows[3]!); rows.splice(pick + 1, 1); tail[0] = 0; rows.splice(3, 0, tail); rows[0] = selected;
      actual = transferIntoEmptyEquipment(actual, items, 100, pick).inventory;
      expect([actual.equipped, ...actual.carried]).toEqual(rows.map(decode));
      rows.splice(position + 1, 0, Buffer.from(rows[0]!)); rows.pop(); rows[0] = Buffer.from(rows[0]!); rows[0]![0] = 0;
      actual = returnEquipmentToBackpack(actual, items, 100, position).inventory;
      expect([actual.equipped, ...actual.carried]).toEqual(rows.map(decode));
      expect(actual.actions).toEqual(original.actions);
    }
    expect(actual.carried.slice(3)).not.toEqual(original.carried.slice(3));
  });
  it('retains exact v3 one-cycle validation separately from v4 alternation', () => {
    const equip = { kind: 'equip', actor: 0, slot: 0 }, back = { kind: 'return', actor: 0, slot: 0 };
    expect(inventoryCommands([])).toEqual([]);
    const all = [0, 1, 2, 3].flatMap(actor => [{ ...equip, actor }, { ...back, actor }]);
    expect(inventoryCommands(all)).toEqual(all);
    for (const value of [new Array(1), [back], [equip, equip], [equip, back, equip], [equip, back, back], [...all, equip],
      [{ ...equip, kind: 'use' }], [{ actor: 0, slot: 0 }], [{ ...equip, actor: 4 }], [{ ...equip, slot: -1 }],
      [{ ...equip, extra: true }], [equip, { ...back, slot: 29 }], [{ ...equip, slot: '0' }]]) expect(() => inventoryCommands(value, true)).toThrow();
  });
});

const privateInputs = !!(process.env.HIRED_GUNS_TRAINING_MAP && process.env.HIRED_GUNS_CHARACTERS && process.env.HIRED_GUNS_ITEMS);
describe.skipIf(!privateInputs)('exact private selected-team inventory and recovery', () => {
  async function local() {
    const [map, roster, items] = await Promise.all([process.env.HIRED_GUNS_TRAINING_MAP!, process.env.HIRED_GUNS_CHARACTERS!, process.env.HIRED_GUNS_ITEMS!].map(async p => new Uint8Array(await readFile(p))));
    return { level: (await importEditorMap(map!)).level, sources: { roster: roster!, items: items! } };
  }
  it('replays interleaved exact-source occupied exchanges, preserves current world and rejects legacy exchange injection', async () => {
    const { level, sources } = await local(), initial = await createTrainingSession(level, sources, [11, 3, 0, 5]);
    const world = stepWorld(level, initial.world, [{ mercenaryId: 0, action: 'turn-right' }]).world;
    let session = initial.session;
    for (let actor = 0; actor < 4; actor++) {
      session = (await equipTrainingSession(level, sources, session, actor, 0, true, world)).session;
      for (const index of [1, 0, 1]) {
        const before = structuredClone(session.inventory.actors), current = before[actor]!;
        const result = await exchangeTrainingSession(level, sources, session, actor, index, true, world);
        [current.inventory.equipped, current.inventory.carried[index]] = [current.inventory.carried[index]!, current.inventory.equipped];
        current.selection = index;
        // Genuine selected ordinary entries; equipped grenade metadata is checked separately with authored category fixtures.
        expect(result.session.inventory.actors).toEqual(before); expect(result.world).toEqual(world); session = result.session;
      }
      session = (await returnTrainingSession(level, sources, session, actor, 0, true, world)).session;
    }
    const saved = await exportTrainingSession(level, world, session, sources), before = structuredClone(session);
    expect(JSON.parse(saved).version).toBe(5); expect(await importTrainingSession(level, sources, saved)).toEqual({ session, world });
    for (const version of [2, 3, 4]) {
      const bad = JSON.parse(saved); bad.version = version;
      await expect(importTrainingSession(level, sources, JSON.stringify(bad))).rejects.toThrow();
    }
    const old = JSON.parse(await exportTrainingSession(level, world, initial.session, sources)); old.version = 4;
    old.commands = [{ kind: 'equip', actor: 0, slot: 0 }, { kind: 'return', actor: 0, slot: 0 }, { kind: 'equip', actor: 0, slot: 1 }];
    expect((await importTrainingSession(level, sources, JSON.stringify(old))).session.inventory.commands).toEqual(old.commands);
    await expect(exchangeTrainingSession(level, sources, session, 0, 0, true, world)).rejects.toThrow();
    await expect(exchangeTrainingSession(level, sources, initial.session, 0, 0, false, world)).rejects.toThrow('Pause');
    expect(session).toEqual(before); expect(resetTrainingInventory(session)).toEqual(initial.session);
  });
  it('accepts the actual 128th command, rejects the 129th atomically and restores full history', async () => {
    const { level, sources } = await local(), initial = await createTrainingSession(level, sources, [11, 3, 0, 5]);
    const commands = Array.from({ length: 127 }, (_, i) => ({ kind: Math.floor(i / 4) % 2 ? 'return' : 'equip', actor: i % 4, slot: i < 4 ? 1 : 0 }));
    const near = await createTrainingSession(level, sources, initial.session.indices, commands);
    const world = stepWorld(level, initial.world, [{ mercenaryId: 0, action: 'turn-right' }]).world;
    const full = await returnTrainingSession(level, sources, near.session, 3, 0, true, world);
    expect(full.world).toEqual(world); expect(full.session.inventory.commands).toHaveLength(128);
    const before = structuredClone(full), json = await exportTrainingSession(level, world, full.session, sources);
    expect(Buffer.byteLength(json)).toBeLessThan(24 * 1024); expect(Buffer.byteLength(JSON.parse(json).checkpoint)).toBeLessThan(16 * 1024);
    expect(await importTrainingSession(level, sources, json)).toEqual(full);
    await expect(equipTrainingSession(level, sources, full.session, 0, 0, true, world)).rejects.toThrow('budget');
    await expect(createTrainingSession(level, sources, initial.session.indices, [...full.session.inventory.commands, { kind: 'equip', actor: 0, slot: 0 }])).rejects.toThrow('budget');
    const bad = JSON.parse(json); bad.commands.push({ kind: 'equip', actor: 0, slot: 0 });
    await expect(importTrainingSession(level, sources, JSON.stringify(bad))).rejects.toThrow('budget'); expect(full).toEqual(before);
    const v3 = JSON.parse(await exportTrainingSession(level, world, initial.session, sources)); v3.version = 3;
    v3.commands = [{ kind: 'equip', actor: 0, slot: 0 }, { kind: 'return', actor: 0, slot: 0 }];
    expect((await importTrainingSession(level, sources, JSON.stringify(v3))).session.inventory.commands).toEqual(v3.commands);
    v3.commands.push({ kind: 'equip', actor: 0, slot: 1 });
    await expect(importTrainingSession(level, sources, JSON.stringify(v3))).rejects.toThrow();
    // An invalid current world cannot expose even a valid next overlay.
    const invalid = structuredClone(world); invalid.tick = -1;
    await expect(equipTrainingSession(level, sources, initial.session, 0, 0, true, invalid)).rejects.toThrow();
    expect(resetTrainingInventory(full.session)).toEqual(initial.session);
  });
  it('replays all four bounded cycles, preserves every byte, migrates v2 exactly and snapshots the save log', async () => {
    const { level, sources } = await local(), initial = await createTrainingSession(level, sources, [11, 3, 0, 5]);
    const before = structuredClone(initial); let session = initial.session;
    for (let actor = 0; actor < 4; actor++) {
      const equipped = await equipTrainingSession(level, sources, session, actor, 0, true);
      const v2 = JSON.parse(await exportTrainingSession(level, initial.world, equipped.session, sources));
      v2.version = 2; v2.commands = v2.commands.map(({ actor, slot }: { actor: number; slot: number }) => ({ actor, slot }));
      // A v2 save cannot carry previous returns. Check migration on one fresh actor instead.
      if (actor === 0) {
        const old = JSON.stringify(v2);
        expect((await importTrainingSession(level, sources, old)).session).toEqual(equipped.session);
        expect(JSON.stringify(v2)).toBe(old);
      }
      const current = equipped.session.inventory.actors[actor]!, end = current.inventory.carried.findIndex(s => !s.itemId), position = Math.max(0, end - 1);
      const next = await returnTrainingSession(level, sources, equipped.session, actor, position, true);
      const expected = structuredClone(current);
      expected.inventory.carried = [...current.inventory.carried.slice(0, position), current.inventory.equipped, ...current.inventory.carried.slice(position, 29)];
      expected.inventory.equipped = { ...current.inventory.equipped, itemId: 0, rawHex: `00${current.inventory.equipped.rawHex.slice(2)}` }; expected.selection = position;
      // These actual selected entries are ordinary; grenade metadata is also derived anew.
      expected.weight.usingGrenade = 0;
      expect(next.session.inventory.actors[actor]).toEqual(expected);
      for (let j = 0; j < 4; j++) if (j !== actor) expect(next.session.inventory.actors[j]).toEqual(equipped.session.inventory.actors[j]);
      expect((await equipTrainingSession(level, sources, next.session, actor, 0, true)).session.inventory.commands).toHaveLength((actor + 1) * 2 + 1);
      await expect(returnTrainingSession(level, sources, next.session, actor, 0, true)).rejects.toThrow();
      session = next.session;
    }
    const world = stepWorld(level, initial.world, [{ mercenaryId: 0, action: 'turn-right' }]).world;
    const snapshot = structuredClone(session), pending = exportTrainingSession(level, world, snapshot, sources);
    snapshot.inventory.commands.length = 0;
    const saved = await pending; expect(JSON.parse(saved).version).toBe(5); expect(JSON.parse(saved).commands).toHaveLength(8);
    expect(await importTrainingSession(level, sources, saved)).toEqual({ session, world });
    await expect(returnTrainingSession(level, sources, initial.session, 0, 0, true)).rejects.toThrow();
    await expect(returnTrainingSession(level, sources, session, 0, 0, false)).rejects.toThrow('Pause');
    expect(resetTrainingInventory(session)).toEqual(initial.session); expect(initial).toEqual(before);
  });
  it('binds actual initial slots; four independent equips round trip overlay/world/mission/tick/RNG, with v1 migration/reset', async () => {
    const { level, sources } = await local();
    const initial = await createTrainingSession(level, sources, [11, 3, 0, 5]);
    const before = structuredClone(initial);
    let session = initial.session;
    for (let actor = 0; actor < 4; actor++) {
      const index = actor === 1 ? 9 : actor === 3 ? 8 : 1;
      const next = await equipTrainingSession(level, sources, session, actor, index, true);
      expect(next.session.inventory.actors[actor]!.inventory.equipped).toEqual(initial.session.team.actors[actor]!.inventory.carried[index]);
      expect(next.session.inventory.actors[actor]!.weight.totalWeight).toBe(initial.session.team.actors[actor]!.weight.totalWeight);
      expect(next.session.team).toEqual(initial.session.team);
      for (let j = 0; j < 4; j++) if (j !== actor) expect(next.session.inventory.actors[j]).toEqual(session.inventory.actors[j]);
      session = next.session;
    }
    expect(initial).toEqual(before);
    await expect(equipTrainingSession(level, sources, session, 0, 0, true)).rejects.toThrow();
    await expect(equipTrainingSession(level, sources, initial.session, 0, 0, false)).rejects.toThrow('Pause');
    const world = stepWorld(level, initial.world, [{ mercenaryId: 0, action: 'turn-right' }]).world;
    const json = await exportTrainingSession(level, world, session, sources);
    const restored = await importTrainingSession(level, sources, json);
    expect(restored).toEqual({ session, world });
    const v2 = JSON.parse(json); v2.version = 2;
    v2.commands = v2.commands.map(({ actor, slot }: { actor: number; slot: number }) => ({ actor, slot }));
    const legacy = JSON.stringify(v2);
    expect(await importTrainingSession(level, sources, legacy)).toEqual({ session, world });
    expect(JSON.stringify(v2)).toBe(legacy);
    expect(resetTrainingInventory(session)).toEqual(initial.session);
    const v1 = JSON.parse(await exportTrainingSession(level, world, initial.session, sources)); delete v1.commands; v1.version = 1;
    expect(await importTrainingSession(level, sources, JSON.stringify(v1))).toEqual({ session: initial.session, world });
    expect(Object.isFrozen(session.inventory.actors[0]!.inventory.carried[0])).toBe(true);
  });
  it('rejects duplicate/conflicting/malformed/out-of-range/empty commands and wrong sources without changing a candidate', async () => {
    const { level, sources } = await local(), initial = await createTrainingSession(level, sources, [11, 3, 0, 5]);
    const before = structuredClone(initial), saved = JSON.parse(await exportTrainingSession(level, initial.world, initial.session, sources));
    for (const commands of [[{ actor: 0, slot: 0 }, { actor: 0, slot: 1 }], [{ actor: 0, slot: 29 }], [{ actor: -1, slot: 0 }], [{ actor: 0, slot: 0, rawHex: '01020304' }], null]) {
      await expect(importTrainingSession(level, sources, JSON.stringify({ ...saved, commands }))).rejects.toThrow(); expect(initial).toEqual(before);
    }
    for (const version of [0, 6, '3', null]) await expect(importTrainingSession(level, sources, JSON.stringify({ ...saved, version }))).rejects.toThrow();
    const e = { kind: 'equip', actor: 0, slot: 0 }, r = { kind: 'return', actor: 0, slot: 0 };
    for (const commands of [[r], [e, e], [e, r, r], [{ ...e, kind: 'unknown' }], [{ ...e, slot: 29 }], [e, { ...r, slot: 29 }]]) {
      await expect(importTrainingSession(level, sources, JSON.stringify({ ...saved, commands }))).rejects.toThrow(); expect(initial).toEqual(before);
    }
    await expect(importTrainingSession(level, sources, JSON.stringify({ ...saved, version: 2, commands: [e] }))).rejects.toThrow();
    await expect(importTrainingSession(level, sources, JSON.stringify({ ...saved, version: 1 }))).rejects.toThrow();
    const changed = { ...sources, items: sources.items.slice() }; changed.items[0] = changed.items[0]! ^ 1;
    await expect(equipTrainingSession(level, changed, initial.session, 0, 0, true)).rejects.toThrow('exact verified OCS');
    expect(initial).toEqual(before);
  });
});
