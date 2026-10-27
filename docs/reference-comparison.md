# Bounded JSON reference comparison

`tools/compare-reference.ts` compares parsed JSON state and ordered events, plus optional preservation snapshots. It does not execute original code, infer source layouts or grant fixture authority. Existing private comparison scripts remain the authority for adapting native evidence encodings. Keep adapters, original inputs and reports under ignored local directories.

```sh
npx tsx tools/compare-reference.ts baseline.json candidate.json
npx vitest run tests/compare-reference.test.ts
```

The CLI reads both files without modifying them and emits a JSON report to stdout. `inputSha256` contains hashes of the exact baseline and candidate file bytes in that order. UTF-8 BOMs are accepted for parsing but remain part of the hash. Exit codes: 0 means equal values with complete declared provenance and no supplied preservation failure; 1 means a value or preservation mismatch; 2 means equal values with unknown provenance; 3 means invalid input or execution failure. No original trace should be published as a CI artifact.

Each input uses this envelope (synthetic example):

```json
{
  "provenance": {
    "status": "declared",
    "source": "authored synthetic fixture",
    "scope": "counter transition only"
  },
  "state": { "tick": 7, "opaque": [3, 4] },
  "events": [{ "kind": "write", "before": 1, "after": 2 }],
  "preservation": {
    "before": { "inputCounter": 6 },
    "after": { "inputCounter": 6 }
  }
}
```

`state` and `events` are required; `events` must be an array. Empty events mean only that the adapter supplied no events. They do not establish an absence of original writes. Every supplied state/event field, including opaque or unknown fields, is compared. Object key order is immaterial; arrays retain their exact index order. Values use exact types and numbers, with no tolerances, coercion, sorting of events or dropped zero/null values. The in-process API distinguishes negative zero from positive zero; JSON report serialization prints either as zero. Numbers have JavaScript JSON parsing precision, so encode wider integers/bytes as agreed strings. This is parsed JSON comparison, not byte equivalence or duplicate-key detection.

The report gives all mismatches, a count and the first mismatch. Paths are RFC 6901 JSON pointers under `/state` or `/events`. Objects traverse sorted keys, arrays traverse numeric indices, and state precedes events. Missing and extra entries are relative to baseline and distinguish absence from null. Mismatch values are included, so reports derived from private evidence must stay private. Input must contain finite JSON data: malformed envelopes, unknown envelope fields, non-data properties, sparse arrays and cycles reject. Nesting is limited to 100 levels; the tool is intended for small bounded reports, not unrestricted full-memory traces.

Provenance is compared as context rather than payload: both declarations are reported separately and `independentlyVerified` is always false. Missing provenance, explicit `unknown`, or a declaration missing its source/scope makes equal values inconclusive. A declaration is a caller claim, not independent verification of its origin or acceptance. Different provenance descriptions do not imply a gameplay mismatch. Unknown envelope metadata rejects; put storage that requires exact comparison inside `state`, not provenance.

Preservation is checked separately for each supplied before/after pair, using the same exact comparison. Every pair reports failures, including unknown-field changes. A failure makes the overall result `different` even if baseline and candidate final states match. Missing pairs are explicitly `not-supplied`: a successful final-state comparison does not prove input immutability, complete memory preservation or that an adapter included every field. The tool never constructs omitted backing state.

There is no ignore facility in this packet. `ignoredPaths` is always an explicit empty array, and extra options/envelope fields reject. No gameplay field can be suppressed. Adapters must document their projection and scope; the comparator cannot discover omitted evidence.

## One accepted private case

This batch reuses the field mapping in the existing ignored drowning-decision comparator for one frozen, already accepted threshold case. Its baseline retains the native frozen evidence row; its candidate retains the native current `decideDrowning` result and input snapshots. A private adapter maps only the decision result into the shared JSON envelope. It does not rerun CPU execution or expand the case matrix. The original evidence file, adapter, chosen case identifier, file hashes and reports remain local. The accepted public scope is described in [drowning-decision-contract.md](drowning-decision-contract.md).

The comparison checks the bounded decision's counter, indicator, threshold, overflow decisions and inert hit request. It checks the candidate input before/after snapshots. This case supplies no ordered event stream, so event behavior is demonstrated only by authored synthetic tests. Original CPU flags, full memory, initialized caller provenance, death continuations, hardware timing and whole-game parity are outside the result. The original case's construction and authority restrictions remain intact.

An intentional synthetic tick mismatch demonstrates the first-path/value diagnostic. Further tests exercise reordered/extra/missing events, opaque storage changes, missing/extra fields, unknown provenance and preservation failure. No browser surface changes; a browser playtest is not evidence for this filesystem-only comparator.

The smallest next integration task is to connect one existing private transition comparator that already emits ordered records to this envelope, retaining its native encoding, provenance and full preservation checks. That is deferred pending review of this packet; no new reference execution is requested.
