# Review receipt integrity

Use this with the [review policy](POLICY.md#review-and-acceptance). A passing hash check is not independent review, CI, runtime proof, diagnostic admission or product acceptance.

The receiving coordinator verifies the exact candidate and reviewer using current native chat/Git evidence, then checks the report/manifest and its current status references. An old report with a newly copied digest is an invalid reference even if a different, correct report exists elsewhere. Preserve previous reports and findings as history; current receipt fields must identify one reviewed candidate.

For new accepting review receipts, record:

```json
{
  "candidate": {
    "base": "full observed accepted/PR base SHA",
    "reviewBase": "full observed review diff base SHA",
    "head": "full observed Git SHA",
    "tree": "full observed tree SHA",
    "changedPaths": ["every/path/in/the/review-diff"]
  },
  "authorThreadId": "native observed author chat UUID",
  "reviewer": {
    "kind": "fresh_chat",
    "threadId": "native observed reviewer chat UUID",
    "independent": true
  },
  "disposition": "ACCEPT",
  "reportPath": "local report path",
  "reportSha256": "report SHA-256",
  "manifestPath": "local manifest path",
  "manifestSha256": "manifest SHA-256"
}
```

Filled receipts stay ignored locally. Evidence paths are absolute or relative to the receipt file. A current owner-status block linked to the receipt uses `head`, `headTree`, `reviewThreadId`, `reviewDisposition`, `reviewReport`, `reviewReportSha256`, `reviewManifest` and `reviewManifestSha256`; its relative paths resolve against the status file's directory. Archive superseded flat commit/rejection fields into clearly dated history rather than leaving competing current identities.

Run the portable standard-library helper from the verified framework checkout, substituting actual identities independently observed by the receiver:

```text
python tools/studio/verify_review_receipt.py --receipt RECEIPT --base REVIEW_DIFF_BASE --accepted-base ACCEPTED_PR_BASE --changed-paths PATHS_JSON --head HEAD --tree TREE --review-thread REVIEWER_CHAT --author-thread AUTHOR_CHAT --status OWNER_STATUS --status-key implementationCandidate
```

`PATHS_JSON` is a JSON array of the complete independently observed review-base-to-head changed-path set. Supply Git paths with forward slashes, no duplicates and no empty scope. Path order is immaterial. The accepted/PR base and the review diff base are separate identities: full-PR review uses the PR base for both; a bounded repair review uses its prior candidate as the diff base. A bounded review never implies full-PR coverage. Its packet must state unchanged-path evidence reuse and let the independent reviewer assess whether that reuse is sufficient.

The report may be prose. Its hash alone proves no verdict. The structured reviewer manifest must bind its exact report path, byte count and SHA-256 to the native review chat, author, accepting verdict and candidate scope:

```json
{
  "schema": "studio-review-manifest-v1",
  "review_thread_id": "native observed reviewer chat UUID",
  "author_thread_id": "native observed author chat UUID",
  "verdict": "ACCEPT",
  "findings": [],
  "candidate": {
    "accepted_base": "full observed accepted/PR base SHA",
    "review_base": "full observed review diff base SHA",
    "commit": "full observed Git SHA",
    "tree": "full observed tree SHA",
    "changed_paths": ["every/path/in/the/review-diff"]
  },
  "report": {"path": "actual report path", "bytes": 123, "sha256": "actual report SHA-256"}
}
```

Manifest-relative report paths resolve against the manifest directory. The manifest uses a closed set of identity fields; unsupported schemas, competing aliases, missing fields, nonempty findings, rejecting or differing verdicts, stale report seals and mismatched scopes fail. `ACCEPT`, `PASS` and `APPROVE` are accepting dispositions, but receipt and manifest must agree exactly. Optional receipt `reportBytes`/`manifestBytes` must match actual bytes. Report bytes are read once for hashing and manifest-seal checks; the validator does not infer approval from prose. The receiver must verify that the native reviewer actually issued this manifest and report and that their meaning matches the declared verdict; an authored JSON declaration cannot authenticate itself.

The existing `obs135-current-review-receipt-v3` receipt and `obs135-independent-exact-candidate-review-v1` manifest remain readable without rewriting historical evidence. For these explicit schemas only, `candidate.parent` supplies a missing review diff base. That manifest has no author field: its author binding is the receipt's `authorThreadId` checked against native observation; `source_thread_id` is a coordinator and must never substitute for the author. A supplied manifest author field must still agree. Its two-file parent-relative scope cannot validate against a larger PR diff. Historical formats lacking the required identities/seals remain pending rather than being silently upgraded.

Use the actual current block name with `--status-key`. Include `--status` when the owner record links to this receipt; do not omit it to hide a mismatch. The helper exits nonzero for invalid identity, a missing fresh-chat declaration, matching reviewer/author IDs, unreadable or changed evidence, duplicate JSON keys, or inconsistent current status references. It prints only diagnostic categories, not report contents or private paths. It does not fetch chats/GitHub or prove that a declared reviewer was independent: the receiver must verify those facts through native evidence before supplying the IDs. Never fabricate an ID to satisfy the helper. A tool/runtime limitation leaves the gate pending; equivalent explicit integrity checks may be recorded when Python is unavailable.

Existing subagent or historical reviews remain useful evidence, but cannot silently substitute for a required new user-visible review chat. Any exception needs actual applicable human authority, not an approval inferred from a coordinator message. A non-accepting or qualified review retains its findings and restrictions; this accepting-receipt helper must not convert it into a pass.

Synthetic helper regression checks:

```text
python -m unittest discover -s tools/studio -p test_review_receipt.py
```
