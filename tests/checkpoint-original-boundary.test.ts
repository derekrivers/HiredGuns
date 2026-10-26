import { describe, expect, it } from 'vitest';
import { createDemoLevel, createFallDemo } from '../src/demo';
import { exportCheckpoint, importCheckpoint } from '../src/sim/checkpoint';
import { createWorld, stepWorld } from '../src/sim/world';

describe('original-team persistence remains gated', () => {
  it('round trips navigation without sources and migrates old saves without acquiring a team', async () => {
    const level = createDemoLevel();
    const world = stepWorld(level, createWorld(level), [{ mercenaryId: 0, action: 'turn-right' }]).world;
    const current = JSON.parse(await exportCheckpoint(level, world));
    for (const version of [1, 2, 3]) {
      const saved = structuredClone(current);
      saved.version = version; saved.world.schemaVersion = version;
      if (version < 3) delete saved.world.physics;
      if (version === 1) delete saved.world.mission;
      const loaded = await importCheckpoint(level, JSON.stringify(saved));
      expect(loaded).toEqual(world);
      expect(Object.keys(loaded).sort()).toEqual(['levelId', 'mercenaries', 'mission', 'physics', 'rng', 'schemaVersion', 'tick']);
      expect(loaded.mercenaries.every(actor => Object.keys(actor).sort().join() === 'facing,id,x,y,z')).toBe(true);
      expect(JSON.parse(await exportCheckpoint(level, loaded)).version).toBe(3);
    }
  });

  it('rejects attempted source/team attachments and future schemas without modifying the working world', async () => {
    const level = createDemoLevel(), world = createWorld(level), before = structuredClone(world);
    const current = JSON.parse(await exportCheckpoint(level, world));
    const pair = { roster: { sha256: '1'.repeat(64) }, items: { sha256: '2'.repeat(64) } };
    for (const version of [1, 2, 3]) {
      const saved = structuredClone(current);
      saved.version = version; saved.world.schemaVersion = version;
      if (version < 3) delete saved.world.physics;
      if (version === 1) delete saved.world.mission;
      for (const field of ['originalTeam', 'sources', 'inventory']) {
        const injected = structuredClone(saved); injected.world[field] = pair;
        await expect(importCheckpoint(level, JSON.stringify(injected))).rejects.toThrow('extra');
      }
      const actor = structuredClone(saved); actor.world.mercenaries[0].canonicalIndex = 3;
      await expect(importCheckpoint(level, JSON.stringify(actor))).rejects.toThrow('extra');
    }
    const future = structuredClone(current); future.version = 4; future.world.schemaVersion = 4;
    await expect(importCheckpoint(level, JSON.stringify(future))).rejects.toThrow('version');
    await expect(exportCheckpoint(level, { ...world, originalTeam: pair } as typeof world)).rejects.toThrow('extra');
    expect(world).toEqual(before);
  });

  it('retains the authored fall profile and rejects original stats grafted into it', async () => {
    const level = createFallDemo(), world = createWorld(level);
    const saved = JSON.parse(await exportCheckpoint(level, world));
    expect(saved.world.physics.profileId).toBe('synthetic-empty-v1');
    saved.world.physics.actors[0].weight = 140;
    await expect(importCheckpoint(level, JSON.stringify(saved))).rejects.toThrow('synthetic profile');
    expect(await importCheckpoint(level, await exportCheckpoint(level, world))).toEqual(world);
  });
});
