import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createDemoLevel } from '../src/demo';
import { cellIndex, type LevelData, type PlayerCommand, type WorldState } from '../src/contracts';
import { exportCheckpoint, importCheckpoint, MAX_CHECKPOINT_BYTES } from '../src/sim/checkpoint';
import { createWorld, nextRandom, stepWorld } from '../src/sim/world';

type EditableEnvelope = {
  format: unknown; version: unknown; levelHash: unknown;
  world: { mercenaries: Record<string, unknown>[]; [key: string]: unknown };
  [key: string]: unknown;
};
async function fixture() {
  const level = createDemoLevel(); const world = createWorld(level);
  const json = await exportCheckpoint(level, world);
  return { level, world, json, envelope: JSON.parse(json) as EditableEnvelope };
}
describe('navigation checkpoint v1', () => {
  it('round trips all state and continues with identical moves, events and explicit RNG', async () => {
    const { level } = await fixture(); let world = createWorld(level);
    for (let i = 0; i < 3; i++) {
      world = stepWorld(level, world, [{mercenaryId:0,action:'forward'}]).world;
      world.rng = nextRandom(world.rng);
    }
    const json = await exportCheckpoint(level, world);
    const loaded = await importCheckpoint(level, json);
    expect(loaded).toEqual(world); expect(loaded).not.toBe(world);
    expect(loaded.mercenaries[0]).not.toBe(world.mercenaries[0]);
    const commands: PlayerCommand[] = [{mercenaryId:0,action:'turn-right'},{mercenaryId:2,action:'forward'}];
    expect(stepWorld(level, loaded, commands)).toEqual(stepWorld(level, world, commands));
    expect(nextRandom(loaded.rng)).toBe(nextRandom(world.rng));
    const envelope = JSON.parse(json);
    expect(Object.keys(envelope).sort()).toEqual(['format','levelHash','version','world']);
    expect(json).not.toContain('layers'); expect(json.length).toBeLessThan(16384);
  });

  it('binds an independently calculated canonical full-level SHA-256 and ignores object insertion order', async () => {
    const { level, world, json } = await fixture();
    // Independent JSON normalization through JSON.stringify's sorted property-list form.
    const keys = new Set<string>();
    JSON.stringify(level, (key, value: unknown) => { if (key) keys.add(key); return value; });
    const canonical = JSON.stringify(level, [...keys].sort());
    expect(JSON.parse(json).levelHash).toBe(createHash('sha256').update(canonical).digest('hex'));
    const reordered = Object.fromEntries(Object.entries(level).reverse()) as unknown as LevelData;
    reordered.source = Object.fromEntries(Object.entries(level.source).reverse()) as LevelData['source'];
    expect(await exportCheckpoint(reordered, world)).toBe(json);
    expect(await importCheckpoint(reordered, json)).toEqual(world);
  });

  it('rejects changed level content with the same id, including geometry with an unchanged source hash', async () => {
    const {level, json} = await fixture();
    const mutations: ((l: LevelData) => void)[] = [
      l => { l.layers[0][0] = l.layers[0][0]! ^ 1; },
      l => { l.layers[1][0] = 0x80000000; }, l => { l.layers[2][0] = 7; },
      l => { l.starts[0].facing = 1; }, l => { l.starts[0].x++; },
      l => { l.exit.x++; }, l => { l.name += ' changed'; },
      l => { l.source.sha256 = 'a'.repeat(64); },
      l => { l.source.kind = 'editor-map'; },
      l => { l.source.revision = 'unverified-editor'; },
      l => { l.unsupportedMechanics.push('future'); },
      l => { l.size.height++; l.layers.forEach(layer => layer.push(...Array<number>(144).fill(0))); },
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(level); mutate(changed);
      expect(changed.id).toBe(level.id);
      await expect(importCheckpoint(changed, json)).rejects.toThrow('content mismatch');
    }
  });

  it('rejects malformed, primitive, truncated, oversized and UTF-8 oversized input before loading', async () => {
    const { level, json } = await fixture();
    for (const bad of ['', '{', json.slice(0,-1), 'null', '[]', 'true', '1', '"save"', ' '.repeat(MAX_CHECKPOINT_BYTES), `"${'é'.repeat(9000)}"`]) await expect(importCheckpoint(level,bad)).rejects.toThrow();
    await expect(importCheckpoint(level, `${json}${' '.repeat(MAX_CHECKPOINT_BYTES)}`)).rejects.toThrow('16 KiB');
    await expect(importCheckpoint(level, `"${'é'.repeat(9000)}"`)).rejects.toThrow('16 KiB');
    expect(await importCheckpoint(level, json.padEnd(MAX_CHECKPOINT_BYTES - 1, ' '))).toEqual(createWorld(level));
    await expect(importCheckpoint(level, json.padEnd(MAX_CHECKPOINT_BYTES, ' '))).rejects.toThrow('16 KiB');
  });

  it('rejects wrong formats, versions, hashes, schemas and level identities', async () => {
    const {level, envelope} = await fixture();
    const mutations: ((e: EditableEnvelope) => void)[] = [
      e => { e.format = 'other'; }, e => { e.version = 2; }, e => { e.version = '1'; },
      e => { e.levelHash = '0'.repeat(64); }, e => { e.levelHash = 'ABC'; }, e => { e.levelHash = null; },
      e => { e.world.schemaVersion = 2; }, e => { e.world.schemaVersion = '1'; }, e => { e.world.levelId = 'other'; },
    ];
    for (const mutate of mutations) { const bad = structuredClone(envelope); mutate(bad); await expect(importCheckpoint(level,JSON.stringify(bad))).rejects.toThrow(); }
  });

  it('rejects every missing or extra envelope, world and mercenary field', async () => {
    const {level, envelope} = await fixture();
    for (const group of ['envelope','world','mercenary'] as const) {
      const original = group === 'envelope' ? envelope : group === 'world' ? envelope.world : envelope.world.mercenaries[0]!;
      for (const field of [...Object.keys(original),'inventory']) {
        const bad = structuredClone(envelope);
        const target = group === 'envelope' ? bad : group === 'world' ? bad.world : bad.world.mercenaries[0]!;
        if (field === 'inventory') target[field] = [];
        else delete target[field];
        await expect(importCheckpoint(level,JSON.stringify(bad))).rejects.toThrow();
      }
    }
    const polluted = JSON.stringify(envelope).replace('"version":1', '"__proto__":{},"version":1');
    await expect(importCheckpoint(level,polluted)).rejects.toThrow('extra');
  });

  it('requires exactly four ordered unique mercenaries, valid bounds and cardinal facing', async () => {
    const {level, envelope} = await fixture();
    const mutations: ((e: EditableEnvelope) => void)[] = [
      e => { e.world.mercenaries.pop(); }, e => { e.world.mercenaries.push({...e.world.mercenaries[0]}); },
      e => { e.world.mercenaries.reverse(); }, e => { e.world.mercenaries[1]!.id = 0; },
      e => { e.world.mercenaries[0]!.id = '0'; }, e => { e.world.mercenaries[0] = null as unknown as Record<string,unknown>; },
    ];
    for (const [field, values] of Object.entries({ x:[-1,level.size.width,0.5,'3',null], y:[-1,level.size.depth], z:[-1,level.size.height], facing:[-1,4,1.5,'0',null] })) {
      for (const value of values) mutations.push(e => { e.world.mercenaries[0]![field] = value; });
    }
    for (const mutate of mutations) { const bad = structuredClone(envelope); mutate(bad); await expect(importCheckpoint(level,JSON.stringify(bad))).rejects.toThrow(); }
  });

  it('rejects unsafe ticks, unsigned RNG violations and non-finite parsed numbers', async () => {
    const {level, world, envelope} = await fixture();
    for (const [field, values] of Object.entries({ tick:[-1,1.5,Number.MAX_SAFE_INTEGER+1,'1',null,true], rng:[-1,0x100000000,0.5,'1',null,false] })) {
      for (const value of values) { const bad = structuredClone(envelope); bad.world[field] = value; await expect(importCheckpoint(level,JSON.stringify(bad))).rejects.toThrow(); }
    }
    await expect(importCheckpoint(level,JSON.stringify(envelope).replace('"tick":0','"tick":1e309'))).rejects.toThrow();
    for (const value of [NaN,Infinity,-Infinity]) { const bad = structuredClone(world); bad.rng = value; await expect(exportCheckpoint(level,bad)).rejects.toThrow(); }
    world.tick = Number.MAX_SAFE_INTEGER; world.rng = 0xffffffff;
    expect(await importCheckpoint(level,await exportCheckpoint(level,world))).toEqual(world);
    world.rng = 0; expect((await importCheckpoint(level,await exportCheckpoint(level,world))).rng).toBe(0);
  });

  it('rejects overlaps and conservative obstructions rather than repositioning mercenaries', async () => {
    const {level, world, envelope} = await fixture();
    const overlap = structuredClone(envelope);
    Object.assign(overlap.world.mercenaries[1]!, {...overlap.world.mercenaries[0],id:1});
    await expect(importCheckpoint(level,JSON.stringify(overlap))).rejects.toThrow('overlap');
    for (const word of [2,64,4,16,32,256,0]) {
      const changed = structuredClone(level); const p = world.mercenaries[0];
      changed.layers[0][cellIndex(changed,p)] = word;
      changed.layers[0][cellIndex(changed,{...p,z:p.z-1})] = 0;
      await expect(exportCheckpoint(changed,world)).rejects.toThrow('obstructed');
    }
  });

  it('validates export and snapshots both inputs before async hashing without mutating on failure', async () => {
    const {level, world, json} = await fixture();
    const original = structuredClone(world);
    const bad = {...world, inventory:[]} as WorldState;
    await expect(exportCheckpoint(level,bad)).rejects.toThrow('extra');
    const hidden = structuredClone(world); Object.defineProperty(hidden,'inventory',{value:[]});
    await expect(exportCheckpoint(level,hidden)).rejects.toThrow('extra');
    await expect(importCheckpoint(level,'{}')).rejects.toThrow(); expect(world).toEqual(original);
    const pendingExport = exportCheckpoint(level,world);
    world.tick++; level.layers[1][0] = 99;
    expect(await pendingExport).toBe(json);
    const freshLevel = createDemoLevel(); const pendingImport = importCheckpoint(freshLevel,json);
    freshLevel.layers[0].fill(2);
    expect(await pendingImport).toEqual(original);
  });
});
