import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { createDemoLevel } from '../src/demo';
import { importEditorMap } from '../src/import/editor-map';
import { ITEM_FILE_BYTES } from '../src/import/items';
import { initializeOriginalTeam } from '../src/import/original-team';
import { exportCheckpoint, importCheckpoint } from '../src/sim/checkpoint';
import { createWorld, stepWorld } from '../src/sim/world';
import { createTrainingSession, exportTrainingSession, importTrainingSession, isTrainingSessionSave, MAX_SESSION_BYTES } from '../src/sim/training-session';
import { characterFixture } from './helpers/character-fixture';

const sources = () => ({ roster: characterFixture(), items: new Uint8Array(ITEM_FILE_BYTES) });
const order = [11, 3, 0, 5];
const privateInputs = !!(process.env.HIRED_GUNS_TRAINING_MAP && process.env.HIRED_GUNS_CHARACTERS && process.env.HIRED_GUNS_ITEMS);
async function local() {
  const [map, roster, items] = await Promise.all([process.env.HIRED_GUNS_TRAINING_MAP!, process.env.HIRED_GUNS_CHARACTERS!, process.env.HIRED_GUNS_ITEMS!].map(async p => new Uint8Array(await readFile(p))));
  return { level: (await importEditorMap(map!)).level, sources: { roster: roster!, items: items! } };
}

describe('standalone Training43 session refusals without forged source authority', () => {
  it('rejects authored maps without changing inputs or their navigation world', async () => {
    const level = createDemoLevel(), world = createWorld(level), inputs = sources();
    const before = structuredClone({ level, world, inputs, order });
    await expect(createTrainingSession(level, inputs, order)).rejects.toThrow('verified local Training43');
    expect({ level, world, inputs, order }).toEqual(before);
  });
  it('rejects malformed, extended and oversized envelopes before any installation', async () => {
    const level = createDemoLevel(), inputs = sources(), before = structuredClone({ level, inputs });
    for (const json of ['null', '[]', '{}', '{', ' '.repeat(MAX_SESSION_BYTES), JSON.stringify({ format: 'hired-guns-training-session', version: 1, sources: {}, indices: order, checkpoint: '{}', actors: [] })]) {
      await expect(importTrainingSession(level, inputs, json)).rejects.toThrow();
    }
    expect({ level, inputs }).toEqual(before);
  });
  it('retains existing checkpoint flow without a selected-team session', async () => {
    const level = createDemoLevel();
    const world = stepWorld(level, createWorld(level), [{ mercenaryId: 0, action: 'turn-right' }]).world;
    const json = await exportCheckpoint(level, world);
    expect(isTrainingSessionSave(json)).toBe(false);
    expect(isTrainingSessionSave('{')).toBe(false);
    expect(await importCheckpoint(level, json)).toEqual(world);
    expect(isTrainingSessionSave(JSON.stringify({ format: 'hired-guns-training-session' }))).toBe(true);
  });
});

describe.skipIf(!privateInputs)('opt-in exact local Training43 / OCS session (never in public CI)', () => {
  it('owns a detached immutable initial team in explicit order and a static mission world', async () => {
    const { level, sources } = await local();
    const expected = await initializeOriginalTeam(sources.roster, sources.items, order);
    const indices = [...order];
    const pending = createTrainingSession(level, sources, indices);
    indices.reverse(); sources.roster.fill(0); sources.items.fill(0);
    const result = await pending;
    expect(result.session.indices).toEqual(order); expect(result.session.team).toEqual(expected);
    expect(result.world.tick).toBe(0); expect(result.world.physics).toEqual({ mode: 'static' });
    expect(result.world.mission.rules.mode).toBe('cooperative-extraction');
    expect(result.session.names.every(Boolean)).toBe(true);
    expect(Object.isFrozen(result.session.team.actors[0]!.inventory.carried[0])).toBe(true);
    expect(() => { result.session.team.actors[0]!.stats.fitness = 0; }).toThrow();
  });
  it('round trips world pose, mission, tick and RNG using reconstructed initial actors only', async () => {
    const { level, sources } = await local();
    const initial = await createTrainingSession(level, sources, order);
    const world = stepWorld(level, initial.world, [{ mercenaryId: 0, action: 'turn-right' }]).world;
    const json = await exportTrainingSession(level, world, initial.session, sources);
    const envelope = JSON.parse(json);
    expect(Object.keys(envelope).sort()).toEqual(['checkpoint', 'commands', 'format', 'indices', 'sources', 'version']);
    expect(JSON.parse(envelope.checkpoint).version).toBe(3);
    expect(envelope).not.toHaveProperty('team');
    const restored = await importTrainingSession(level, sources, json);
    expect(restored.world).toEqual(world); expect(restored.session).toEqual(initial.session);
    expect(restored.session.team).not.toBe(initial.session.team);
    expect(restored.session.team.actors[0]!.stats.fitness).toBe(65535);
  });
  it('rejects changed/missing sources, invalid choices and tampered wrapper/checkpoint atomically', async () => {
    const { level, sources } = await local();
    const initial = await createTrainingSession(level, sources, order);
    const json = await exportTrainingSession(level, initial.world, initial.session, sources);
    const before = structuredClone(initial), envelope = JSON.parse(json);
    const changes = [
      (e: typeof envelope) => { e.indices = [0, 0, 1, 2]; },
      (e: typeof envelope) => { e.indices = [0, 1, 2, 12]; },
      (e: typeof envelope) => { e.indices = [0, 1, 2]; },
      (e: typeof envelope) => { e.indices = [0, 1, 2, '3']; },
      (e: typeof envelope) => { e.sources.roster.sha256 = '0'.repeat(64); },
      (e: typeof envelope) => { e.sources.items.revision = 'unverified'; },
      (e: typeof envelope) => { e.sources.map = '0'.repeat(64); },
      (e: typeof envelope) => { e.sources.items.extra = true; },
      (e: typeof envelope) => { const c = JSON.parse(e.checkpoint); c.world.mercenaries[1] = c.world.mercenaries[0]; e.checkpoint = JSON.stringify(c); },
      (e: typeof envelope) => { const c = JSON.parse(e.checkpoint); c.world.mission.clock.subticks = -1; e.checkpoint = JSON.stringify(c); },
      (e: typeof envelope) => { const c = JSON.parse(e.checkpoint); c.levelHash = '0'.repeat(64); e.checkpoint = JSON.stringify(c); },
    ];
    for (const change of changes) {
      const e = structuredClone(envelope); change(e);
      await expect(importTrainingSession(level, sources, JSON.stringify(e))).rejects.toThrow();
      expect(initial).toEqual(before);
    }
    const changed = { roster: sources.roster.slice(), items: sources.items.slice() }; changed.items[0] = changed.items[0]! ^ 1;
    await expect(importTrainingSession(level, changed, json)).rejects.toThrow('exact verified OCS');
    await expect(importTrainingSession(level, { ...sources, roster: new Uint8Array() }, json)).rejects.toThrow();
    const changedLevel = structuredClone(level); changedLevel.name += ' changed';
    await expect(importTrainingSession(changedLevel, sources, json)).rejects.toThrow('content mismatch');
    await expect(importTrainingSession(createDemoLevel(), sources, json)).rejects.toThrow('verified local Training43');
    expect(initial).toEqual(before);
  });
  it('snapshots restore sources before hashing and never aliases the saved world', async () => {
    const { level, sources } = await local();
    const initial = await createTrainingSession(level, sources, order);
    const json = await exportTrainingSession(level, initial.world, initial.session, sources);
    const pending = importTrainingSession(level, sources, json);
    sources.roster.fill(0); sources.items.fill(0); level.name += ' changed';
    const restored = await pending;
    expect(restored.session).toEqual(initial.session); expect(restored.world).toEqual(initial.world);
    restored.world.mercenaries[0].facing = ((restored.world.mercenaries[0].facing + 1) % 4) as 0 | 1 | 2 | 3;
    expect(restored.world).not.toEqual(initial.world);
  });
});
