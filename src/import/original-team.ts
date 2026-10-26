import { importCharacters, type CharacterCatalog, type CharacterRecord } from './characters';
import { importItems, OCS_ITEMS_SHA256, type ItemCatalog } from './items';
import { computeSourceWeight, initializeInventory, type SelectionInventory, type WeightValues } from './inventory';

const OCS_ROSTER_SHA256 = '79a712653bcbef89f4579ef27a036897aa43dd74bbd965dd440deac13c3e5439';
export interface InitialActor {
  canonicalIndex: number;
  stats: CharacterRecord['stats'];
  inventory: SelectionInventory;
  weight: WeightValues & { status: 'computed' };
}
export interface ConstructedTeam { actors: InitialActor[] }
export interface OriginalTeam {
  profile: 'ocs-initial-team-v1';
  sources: { roster: CharacterCatalog['source']; items: ItemCatalog['source'] };
  actors: (Omit<InitialActor, 'weight'> & { weight: WeightValues & { status: 'verified' } })[];
}

function dense(value: unknown, length: number): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length !== length || Object.keys(value).length !== length ||
      !Array.from({ length }, (_, i) => Object.hasOwn(value, i)).every(Boolean)) throw new Error('Expected a dense array of the required length.');
}
function choices(indices: readonly number[]): number[] {
  dense(indices, 4);
  if (new Set(indices).size !== 4 || !indices.every(i => Number.isInteger(i) && i >= 0 && i < 12)) throw new Error('Choose four distinct canonical indices from 0 through 11.');
  return [...indices];
}
const word = (value: number) => Number.isInteger(value) && value >= 0 && value <= 65535;

/** Pure construction for authored tests/inspection. It never grants original-source authority. */
export function constructInitialTeam(roster: CharacterCatalog, items: ItemCatalog, indices: readonly number[]): ConstructedTeam {
  const selected = choices(indices);
  dense(roster.records, 60); dense(items.records, 114);
  return { actors: selected.map(canonicalIndex => {
    const record = roster.records[canonicalIndex]!;
    if (!record || record.index !== canonicalIndex || record.bank !== 0 || !record.stats ||
        Object.keys(record.stats).sort().join(',') !== 'agility,experience,fitness,footstep,grunt,physique' ||
        !Object.values(record.stats).every(word)) throw new Error('Malformed canonical character stats.');
    dense(record.inventory, 10); dense(record.actions, 10);
    const inventory = initializeInventory(record);
    // Actions are separate from weight, but their nonzero references must also exist.
    for (const slot of [...inventory.carried, ...inventory.actions]) {
      if (slot.itemId !== 0) {
        const item = items.records[slot.itemId - 1];
        if (!item || item.itemId !== slot.itemId || !word(item.weight) || !Number.isInteger(item.category) || item.category < 0 || item.category > 255) throw new Error('Invalid initial inventory/action item reference.');
      }
    }
    const weight = computeSourceWeight(items, inventory, record.stats.physique);
    if (weight.status !== 'computed') throw new Error(`Initial weight unavailable: ${weight.reason}`);
    // Main.s:5329 resets live fitness to the full unsigned word, not the roster template.
    return { canonicalIndex, stats: { ...record.stats, fitness: 65535 }, inventory, weight };
  }) };
}

type Evidence<C> = { bytes: Uint8Array; claimedSource?: C };
function snapshot<C extends { records: { rawHex: string }[]; source: object }>(input: Uint8Array | C, count: number, width: number): Evidence<C['source']> {
  if (input instanceof Uint8Array) return { bytes: new Uint8Array(input) };
  if (!input || typeof input !== 'object') throw new Error('Expected local raw bytes or an imported catalog.');
  dense(input.records, count);
  const bytes = new Uint8Array(count * width);
  input.records.forEach((record, i) => {
    if (!record || typeof record.rawHex !== 'string' || !new RegExp(`^[0-9a-f]{${width * 2}}$`).test(record.rawHex)) throw new Error('Malformed catalog raw evidence.');
    for (let j = 0; j < width; j++) bytes[i * width + j] = parseInt(record.rawHex.slice(j * 2, j * 2 + 2), 16);
  });
  if (!input.source || typeof input.source !== 'object' || Array.isArray(input.source) ||
      Object.keys(input.source).sort().join(',') !== 'byteLength,layout,revision,sha256') throw new Error('Malformed catalog source identity.');
  return { bytes, claimedSource: { ...input.source } };
}
function matchSource(claimed: object | undefined, actual: object) {
  if (claimed && Object.keys(actual).some(key => claimed[key as keyof typeof claimed] !== actual[key as keyof typeof actual])) throw new Error('Catalog source identity does not match its raw evidence.');
}

/** Source-bound initialization only. No world, controller, position, death or environmental state. */
export async function initializeOriginalTeam(rosterInput: Uint8Array | CharacterCatalog, itemInput: Uint8Array | ItemCatalog, indices: readonly number[]): Promise<OriginalTeam> {
  // Snapshot ALL arguments before the first await, including both sources and selection order.
  const selected = choices(indices);
  const rosterEvidence = snapshot(rosterInput, 60, 272);
  const itemEvidence = snapshot(itemInput, 114, 286);
  const [roster, items] = await Promise.all([importCharacters(rosterEvidence.bytes), importItems(itemEvidence.bytes)]);
  matchSource(rosterEvidence.claimedSource, roster.source); matchSource(itemEvidence.claimedSource, items.source);
  if (roster.source.sha256 !== OCS_ROSTER_SHA256 || items.source.sha256 !== OCS_ITEMS_SHA256) throw new Error('Initial original team requires the exact verified OCS roster and OCS item-table pair.');
  const team = constructInitialTeam(roster, items, selected);
  return {
    profile: 'ocs-initial-team-v1', sources: { roster: { ...roster.source }, items: { ...items.source } },
    actors: team.actors.map(actor => ({ ...actor, weight: { ...actor.weight, status: 'verified' } })),
  };
}
