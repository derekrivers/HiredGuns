import { describe, expect, it, vi } from 'vitest';
import { importCharacters } from '../src/import/characters';
import { importItems, ITEM_FILE_BYTES, OCS_ITEMS_SHA256 } from '../src/import/items';
import { constructInitialTeam, initializeOriginalTeam } from '../src/import/original-team';
import { characterFixture } from './helpers/character-fixture';

function rosterBytes() {
  const bytes = characterFixture();
  // Authored data: all templates use item1; carried counts vary by canonical index.
  for (let r = 0; r < 60; r++) for (let s = 0; s < 20; s++) bytes.set([1, 2, r + 1, 0], r * 272 + 192 + s * 4);
  return bytes;
}
function itemBytes() {
  const bytes = new Uint8Array(ITEM_FILE_BYTES);
  bytes[254] = 4; new DataView(bytes.buffer).setUint16(260, 140);
  return bytes;
}
async function catalogs() { return { roster: await importCharacters(rosterBytes()), items: await importItems(itemBytes()) }; }
const order = [11, 2, 8, 0];

describe('pure initial team construction without source authority', () => {
  it('preserves explicit team order, full initial stats, cleared equipment, separate actions and independent copies', async () => {
    const { roster, items } = await catalogs();
    const original = structuredClone({ roster, items });
    const team = constructInitialTeam(roster, items, order);
    expect(team.actors.map(a => a.canonicalIndex)).toEqual(order);
    expect(team.actors[0]).toMatchObject({ stats: { fitness: 65535, physique: 311, agility: 511 }, weight: { status: 'computed', totalWeight: 16800, quotient: 120, usingGrenade: 0 } });
    for (const actor of team.actors) {
      expect(actor.inventory.equipped.rawHex).toBe('00000000');
      expect(actor.inventory.carried).toHaveLength(30); expect(actor.inventory.actions).toHaveLength(10);
      expect(actor.inventory.carried.slice(10).every(s => s.rawHex === '00000000')).toBe(true);
      expect(actor).not.toHaveProperty('dead'); expect(actor).not.toHaveProperty('position');
    }
    expect({ roster, items }).toEqual(original);
    team.actors[0]!.inventory.carried[0]!.ammo = 99;
    team.actors[0]!.inventory.carried[10]!.ammo = 88;
    team.actors[0]!.inventory.actions[0]!.ammo = 77;
    team.actors[0]!.stats.fitness = 0;
    expect(roster).toEqual(original.roster);
    expect(team.actors[0]!.inventory.carried[11]!.ammo).toBe(0);
    expect(team.actors[1]!.stats.fitness).toBe(65535);
    expect(constructInitialTeam(roster, items, order).actors[0]!.stats.fitness).toBe(65535);
    roster.records[2]!.stats.agility = 0; roster.records[2]!.inventory[0]!.ammo = 0;
    expect(team.actors[1]!.stats.agility).toBe(502);
    expect(team.actors[1]!.inventory.carried[0]!.ammo).toBe(3);
  });
  it('rejects missing, duplicate, noncanonical, nonnumeric and sparse choices', async () => {
    const { roster, items } = await catalogs();
    for (const indices of [[], [0, 1, 2], [0, 1, 2, 2], [0, 1, 2, 12], [0, 1, 2, -1], [0, 1, 2, NaN], [0, 1, 2, 1.5], [0, 1, 2, '3'], new Array(4)]) {
      expect(() => constructInitialTeam(roster, items, indices as number[])).toThrow();
      await expect(initializeOriginalTeam(roster, items, indices as number[])).rejects.toThrow();
    }
    const inherited = [0, 1, 2, 3]; delete inherited[1];
    Object.setPrototypeOf(inherited, { 1: 1 });
    expect(() => constructInitialTeam(roster, items, inherited)).toThrow();
  });
  it('rejects malformed stats, inventory bytes, sparse arrays and carried/action references', async () => {
    const base = await catalogs();
    const changes = [
      (c: typeof base) => { c.roster.records[0]!.stats.fitness = -1; },
      (c: typeof base) => { c.roster.records[0]!.bank = 1; },
      (c: typeof base) => { delete c.roster.records[0]!.inventory[1]; },
      (c: typeof base) => { delete c.roster.records[0]!.actions[1]; },
      (c: typeof base) => { delete c.items.records[50]; },
      (c: typeof base) => { c.roster.records[0]!.inventory[0]!.rawHex = '00000000'; },
      (c: typeof base) => { Object.assign(c.roster.records[0]!.inventory[0]!, { itemId: 255, rawHex: 'ff020100' }); },
      (c: typeof base) => { Object.assign(c.roster.records[0]!.actions[0]!, { itemId: 255, rawHex: 'ff020100' }); },
      (c: typeof base) => { c.items.records[0]!.itemId = 2; },
      (c: typeof base) => { c.items.records[0]!.category = 256; },
      (c: typeof base) => {
        Object.assign(c.roster.records[0]!.actions[0]!, { itemId: 2, rawHex: '02020100' });
        c.items.records[1]!.weight = NaN;
      },
    ];
    for (const change of changes) { const current = structuredClone(base); change(current); expect(() => constructInitialTeam(current.roster, current.items, [0, 1, 2, 3])).toThrow(); }
  });
});

describe('exact-hash original authority', () => {
  it('rejects unknown raw/catalog pairs, CD32 claims, mixed claims and forged exact identities', async () => {
    await expect(initializeOriginalTeam(rosterBytes(), itemBytes(), order)).rejects.toThrow('exact verified OCS');
    const { roster, items } = await catalogs();
    await expect(initializeOriginalTeam(roster, items, order)).rejects.toThrow('exact verified OCS');
    roster.source.sha256 = 'f207ce723e555c89d350e3f95d88f6f576377188e11b56cefc4147a877031f47';
    roster.source.revision = 'cd32-archive';
    await expect(initializeOriginalTeam(roster, items, order)).rejects.toThrow('source identity');
    roster.source.sha256 = '79a712653bcbef89f4579ef27a036897aa43dd74bbd965dd440deac13c3e5439';
    roster.source.revision = 'ocs-source-data'; items.source.sha256 = OCS_ITEMS_SHA256; items.source.revision = 'ocs-runtime';
    roster.records[0]!.stats.fitness = 123;
    await expect(initializeOriginalTeam(roster, items, order)).rejects.toThrow('source identity');
  });
  it('rejects malformed raw evidence and missing source fields before asynchronous work', async () => {
    const base = await catalogs();
    for (const mutate of [
      (c: typeof base) => { c.roster.records[0]!.rawHex = '00'; },
      (c: typeof base) => { delete c.items.records[1]; },
      (c: typeof base) => { c.items.source = {} as typeof c.items.source; },
    ]) { const c = structuredClone(base); mutate(c); await expect(initializeOriginalTeam(c.roster, c.items, order)).rejects.toThrow(); }
    await expect(initializeOriginalTeam(new Uint8Array(3), itemBytes(), order)).rejects.toThrow();
  });
  it('snapshots both raw sources, choices, raw catalog records and identity metadata before either hash awaits', async () => {
    const { roster, items } = await catalogs();
    const digest = crypto.subtle.digest.bind(crypto.subtle), seen: Uint8Array[] = [];
    const gates: (() => void)[] = [];
    const spy = vi.spyOn(crypto.subtle, 'digest').mockImplementation(async (algorithm, bytes) => {
      seen.push(new Uint8Array(bytes as ArrayBuffer));
      await new Promise<void>(resolve => gates.push(resolve));
      return digest(algorithm, bytes);
    });
    try {
      const indices = [...order], rawRoster = rosterBytes(), rawItems = itemBytes();
      const rawPending = initializeOriginalTeam(rawRoster, rawItems, indices);
      const pending = initializeOriginalTeam(roster, items, indices);
      // Both operations may reject on the same event-loop turn. Observe both
      // before releasing the hashes so neither failure is temporarily unhandled.
      const rejections = Promise.all([
        expect(rawPending).rejects.toThrow('exact verified OCS'),
        expect(pending).rejects.toThrow('exact verified OCS'),
      ]);
      rawRoster.fill(0); rawItems.fill(0); indices.fill(0);
      roster.records[0]!.rawHex = '00'; items.records[0]!.rawHex = '00'; roster.source.sha256 = 'forged'; items.source.sha256 = 'forged';
      expect(seen).toEqual([rosterBytes(), itemBytes(), rosterBytes(), itemBytes()]);
      gates.forEach(resolve => resolve());
      await rejections;
    } finally { spy.mockRestore(); }
  });
});
