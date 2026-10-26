import type { SelectionInventory, WeightValues } from '../import/inventory';
import type { ItemCatalog } from '../import/items';
import { decideDrowning, type DrowningDecision } from './drowning-decision';
import { transitionDrowningWaterInventory } from './water-inventory';

export interface ImmersionActor {
  statsDeadWord: number;
  windowType: number;
  controlMethod: number;
  race: number;
  physique: number;
  fitness: number;
  spellWater: number;
  spellWings: number;
  underwaterCount: number;
  drowningIndicator: number;
  inventory: SelectionInventory;
  weight: WeightValues;
}
export interface ImmersionInput {
  actor: ImmersionActor;
  /** Packed unsigned map-cell long; opaque bits are retained unchanged. */
  cellLong: number;
  items: ItemCatalog;
}
export interface ImmersionResult {
  status: 'ineligible' | 'breath' | 'submerged';
  candidate: ImmersionActor;
  cellLong: number;
  inventoryStatus: 'not-visited' | 'skipped' | 'processed';
  decision: DrowningDecision | null;
  /** Inert damage_fitness argument, never dispatched. Zero differs from null. */
  damageRequest: { requestedHit: number } | null;
}

function keys(value: unknown, fields: string[]): void {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Reflect.ownKeys(value).length !== fields.length || fields.some(key => !Object.hasOwn(value, key))) {
    throw new Error('Malformed immersion fields.');
  }
}
const unsigned = (value: unknown, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max;

/** One invocation of the OCS drown helper, disconnected from scheduling/world state. */
export function transitionImmersion(input: ImmersionInput): ImmersionResult {
  keys(input, ['actor', 'cellLong', 'items']);
  keys(input.actor, ['statsDeadWord', 'windowType', 'controlMethod', 'race', 'physique', 'fitness',
    'spellWater', 'spellWings', 'underwaterCount', 'drowningIndicator', 'inventory', 'weight']);
  const actor = input.actor;
  if (!unsigned(input.cellLong, 0xffffffff) ||
      ![actor.statsDeadWord, actor.windowType, actor.physique, actor.fitness, actor.spellWater,
        actor.spellWings, actor.underwaterCount, actor.drowningIndicator].every(value => unsigned(value, 65535)) ||
      ![actor.controlMethod, actor.race].every(value => unsigned(value, 255))) {
    throw new Error('Malformed immersion storage.');
  }
  keys(actor.weight, ['totalWeight', 'quotient', 'tooHeavy', 'usingGrenade']);
  if (!unsigned(actor.weight.totalWeight, 0xffffffff) || !unsigned(actor.weight.quotient, 65535) ||
      typeof actor.weight.tooHeavy !== 'boolean' || ![0, 2].includes(actor.weight.usingGrenade)) {
    throw new Error('Malformed immersion weight.');
  }
  const inventoryInput = { inventory: actor.inventory, items: input.items, physique: actor.physique,
    spellWater: actor.spellWater, spellWings: actor.spellWings };
  // Validate/copy even on an unvisited branch, without inventing a weight call.
  const validated = transitionDrowningWaterInventory({ ...inventoryInput, spellWater: 100 });
  const candidate: ImmersionActor = {
    statsDeadWord: actor.statsDeadWord, windowType: actor.windowType, controlMethod: actor.controlMethod,
    race: actor.race, physique: actor.physique, fitness: actor.fitness, spellWater: actor.spellWater,
    spellWings: actor.spellWings, underwaterCount: actor.underwaterCount,
    drowningIndicator: actor.drowningIndicator, inventory: validated.candidate,
    weight: { totalWeight: actor.weight.totalWeight, quotient: actor.weight.quotient,
      tooHeavy: actor.weight.tooHeavy, usingGrenade: actor.weight.usingGrenade },
  };
  const result: ImmersionResult = { status: 'ineligible', candidate, cellLong: input.cellLong,
    inventoryStatus: 'not-visited', decision: null, damageRequest: null };
  // These guards return without the breath counter reset, even on dry cells.
  if (actor.statsDeadWord !== 0 || actor.windowType === 7 || actor.controlMethod === 0) return result;
  const depth = (input.cellLong >>> 17) & 3;
  if ((input.cellLong & 4) === 0 || depth < 2) {
    candidate.underwaterCount = 0;
    result.status = 'breath';
    return result;
  }
  // Inventory processing precedes both breath-immunity branches.
  const water = transitionDrowningWaterInventory(inventoryInput);
  candidate.inventory = water.candidate;
  if (water.weight !== null) candidate.weight = water.weight;
  result.inventoryStatus = water.status;
  if (actor.race === 1 || actor.spellWater === 97) {
    candidate.underwaterCount = 0;
    result.status = 'breath';
    return result;
  }
  const decision = decideDrowning({ underwaterCount: actor.underwaterCount, physique: actor.physique,
    fitness: actor.fitness, drowningIndicator: actor.drowningIndicator });
  candidate.underwaterCount = decision.nextCounter;
  candidate.drowningIndicator = decision.drowningIndicator;
  result.status = 'submerged';
  result.decision = decision;
  result.damageRequest = decision.requestedHit === null ? null : { requestedHit: decision.requestedHit };
  return result;
}
