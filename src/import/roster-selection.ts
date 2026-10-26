import { CHARACTER_COUNT, type CharacterCatalog } from './characters';

/** A preparation plan, separate from world/checkpoint state. Contains no original stats/assets. */
export interface RosterSelection {
  format: 'hired-guns-roster-selection'; version: 1;
  source: CharacterCatalog['source'];
  characters: [number, number, number, number];
}
export const MAX_SELECTION_BYTES = 2048;
function exact(value: unknown, keys: string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join(',') !== [...keys].sort().join(',')) throw new Error('Invalid roster selection fields.');
}
export function selectRoster(catalog: CharacterCatalog, indices: readonly number[]): RosterSelection {
  if (indices.length !== 4 || Object.keys(indices).length !== 4 || new Set(indices).size !== 4 || !indices.every(i => Number.isInteger(i) && i >= 0 && i < CHARACTER_COUNT)) throw new Error('Choose four different characters from the canonical bank.');
  return { format: 'hired-guns-roster-selection', version: 1, source: { ...catalog.source }, characters: [...indices] as RosterSelection['characters'] };
}
export function exportRosterSelection(catalog: CharacterCatalog, indices: readonly number[]): string {
  return JSON.stringify(selectRoster(catalog, indices));
}
export function importRosterSelection(catalog: CharacterCatalog, json: string): RosterSelection {
  if (json.length >= MAX_SELECTION_BYTES || new TextEncoder().encode(json).length >= MAX_SELECTION_BYTES) throw new Error('Roster selection must be smaller than 2 KiB.');
  const value: unknown = JSON.parse(json);
  exact(value, ['format', 'version', 'source', 'characters']);
  if (value.format !== 'hired-guns-roster-selection' || value.version !== 1) throw new Error('Unsupported roster selection version.');
  exact(value.source, ['sha256', 'byteLength', 'layout', 'revision']);
  for (const key of ['sha256', 'byteLength', 'layout', 'revision'] as const) {
    if (value.source[key] !== catalog.source[key]) throw new Error('Roster source identity mismatch. Reopen the exact same Characters data.');
  }
  if (!Array.isArray(value.characters)) throw new Error('Invalid character selection.');
  return selectRoster(catalog, value.characters);
}
