import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
interface Provenance { status: 'declared' | 'unknown'; source: string | null; scope: string | null }
interface Envelope {
  state: Json;
  events: Json[];
  provenance: Provenance;
  preservation?: { before: Json; after: Json };
}
interface Value { present: boolean; value?: Json }
interface Difference {
  kind: 'missing' | 'extra' | 'type' | 'value';
  path: string;
  baseline: Value;
  candidate: Value;
}
const pointer = (base: string, key: string | number): string => `${base}/${String(key).replaceAll('~', '~0').replaceAll('/', '~1')}`;
const kind = (value: Json): string => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;

function validateJson(value: unknown, ancestors = new Set<object>(), depth = 0): asserts value is Json {
  if (depth > 100) throw new Error('JSON nesting exceeds 100 levels.');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (!value || typeof value !== 'object') throw new Error('Expected finite JSON data.');
  if (ancestors.has(value)) throw new Error('Cyclic JSON data.');
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    throw new Error('Expected plain JSON object.');
  }
  const keys = Reflect.ownKeys(value);
  if (Array.isArray(value) && (keys.length !== value.length + 1 || Array.from({ length: value.length }, (_, i) => i).some(i => !Object.hasOwn(value, i)))) {
    throw new Error('Expected dense JSON array without extra fields.');
  }
  ancestors.add(value);
  for (const key of keys) {
    if (Array.isArray(value) && key === 'length') continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (typeof key !== 'string' || !descriptor.enumerable || !('value' in descriptor)) throw new Error('Expected JSON own data fields.');
    validateJson(descriptor.value, ancestors, depth + 1);
  }
  ancestors.delete(value);
}

function object(value: Json, fields: string[], required: string[], label: string): asserts value is { [key: string]: Json } {
  if (value === null || Array.isArray(value) || typeof value !== 'object' ||
      Object.keys(value).some(key => !fields.includes(key)) || required.some(key => !Object.hasOwn(value, key))) {
    throw new Error(`Malformed ${label} fields.`);
  }
}

function envelope(value: unknown): Envelope {
  validateJson(value);
  object(value, ['state', 'events', 'provenance', 'preservation'], ['state', 'events'], 'comparison envelope');
  if (!Array.isArray(value.events)) throw new Error('Expected ordered events array.');
  let provenance: Provenance = { status: 'unknown', source: null, scope: null };
  if (Object.hasOwn(value, 'provenance')) {
    object(value.provenance!, ['status', 'source', 'scope'], ['status'], 'provenance');
    const p = value.provenance!;
    if (p.status !== 'declared' && p.status !== 'unknown') throw new Error('Unknown provenance status.');
    for (const key of ['source', 'scope']) {
      if (Object.hasOwn(p, key) && (typeof p[key] !== 'string' || !(p[key] as string).trim())) throw new Error('Provenance descriptions must be nonempty strings.');
    }
    provenance = { status: p.status === 'declared' && p.source && p.scope ? 'declared' : 'unknown',
      source: p.source as string ?? null, scope: p.scope as string ?? null };
  }
  let preservation: Envelope['preservation'];
  if (Object.hasOwn(value, 'preservation')) {
    object(value.preservation!, ['before', 'after'], ['before', 'after'], 'preservation');
    preservation = { before: value.preservation!.before!, after: value.preservation!.after! };
  }
  return { state: value.state!, events: value.events, provenance, preservation };
}

/** Exact JSON values; object key order is immaterial, array order is mandatory. */
function differences(baseline: Json, candidate: Json, path: string): Difference[] {
  if (kind(baseline) !== kind(candidate)) return [{ kind: 'type', path, baseline: { present: true, value: baseline }, candidate: { present: true, value: candidate } }];
  if (baseline !== null && candidate !== null && typeof baseline === 'object' && typeof candidate === 'object') {
    const result: Difference[] = [];
    const keys = Array.isArray(baseline) && Array.isArray(candidate)
      ? Array.from({ length: Math.max(baseline.length, candidate.length) }, (_, i) => String(i))
      : [...new Set([...Object.keys(baseline), ...Object.keys(candidate)])].sort();
    for (const key of keys) {
      const hasBaseline = Object.hasOwn(baseline, key), hasCandidate = Object.hasOwn(candidate, key);
      const a = (baseline as { [key: string]: Json })[key], b = (candidate as { [key: string]: Json })[key];
      const childPath = pointer(path, key);
      if (!hasBaseline || !hasCandidate) result.push({ kind: hasBaseline ? 'missing' : 'extra', path: childPath,
        baseline: hasBaseline ? { present: true, value: a! } : { present: false },
        candidate: hasCandidate ? { present: true, value: b! } : { present: false } });
      else result.push(...differences(a!, b!, childPath));
    }
    return result;
  }
  return Object.is(baseline, candidate) ? [] : [{ kind: 'value', path,
    baseline: { present: true, value: baseline }, candidate: { present: true, value: candidate } }];
}

export function compareReference(baselineInput: unknown, candidateInput: unknown) {
  const baseline = envelope(baselineInput), candidate = envelope(candidateInput);
  const mismatches = [...differences(baseline.state, candidate.state, '/state'), ...differences(baseline.events, candidate.events, '/events')];
  const preservation = ([['baseline', baseline], ['candidate', candidate]] as const).map(([side, input]) => ({
    side, status: input.preservation ? 'checked' : 'not-supplied',
    failures: input.preservation ? differences(input.preservation.before, input.preservation.after, '/preservation') : [],
  }));
  const failed = mismatches.length > 0 || preservation.some(check => check.failures.length > 0);
  const unknown = baseline.provenance.status === 'unknown' || candidate.provenance.status === 'unknown';
  return {
    schemaVersion: 1,
    result: failed ? 'different' : unknown ? 'inconclusive' : 'equal-with-declared-provenance',
    valuesEqual: mismatches.length === 0,
    provenance: { baseline: baseline.provenance, candidate: candidate.provenance, independentlyVerified: false },
    ignoredPaths: [],
    mismatchCount: mismatches.length,
    firstMismatch: mismatches[0] ?? null,
    mismatches,
    preservation,
  };
}

async function main(): Promise<void> {
  if (process.argv.length !== 4) throw new Error('Usage: npx tsx tools/compare-reference.ts <baseline.json> <candidate.json>');
  const files = await Promise.all(process.argv.slice(2).map(path => readFile(path)));
  const [baseline, candidate] = files.map(bytes => JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, '')) as unknown);
  const report = { ...compareReference(baseline, candidate), inputSha256: files.map(bytes => createHash('sha256').update(bytes).digest('hex')) };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.result === 'different' ? 1 : report.result === 'inconclusive' ? 2 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}\n`);
    process.exitCode = 3;
  });
}
