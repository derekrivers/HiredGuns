# Review receipt integrity

Use this with the [review policy](POLICY.md#review-and-acceptance). A passing hash check is not independent review, CI, runtime proof, diagnostic admission or product acceptance.

The receiving coordinator verifies the exact candidate and reviewer using current native chat/Git evidence, then checks the report/manifest and its current status references. An old report with a newly copied digest is an invalid reference even if a different, correct report exists elsewhere. Preserve previous reports and findings as history; current receipt fields must identify one reviewed candidate.

For new accepting review receipts, record:

```json
{
  "candidate": {"head": "full observed Git SHA", "tree": "full observed tree SHA"},
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
python tools/studio/verify_review_receipt.py --receipt RECEIPT --head HEAD --tree TREE --review-thread REVIEWER_CHAT --author-thread AUTHOR_CHAT --status OWNER_STATUS --status-key implementationCandidate
```

Use the actual current block name with `--status-key`. Include `--status` when the owner record links to this receipt; do not omit it to hide a mismatch. The helper exits nonzero for invalid identity, a missing fresh-chat declaration, matching reviewer/author IDs, unreadable or changed evidence, duplicate JSON keys, or inconsistent current status references. It prints only diagnostic categories, not report contents or private paths. It does not fetch chats/GitHub or prove that a declared reviewer was independent: the receiver must verify those facts through native evidence before supplying the IDs. Never fabricate an ID to satisfy the helper. A tool/runtime limitation leaves the gate pending; equivalent explicit integrity checks may be recorded when Python is unavailable.

Existing subagent or historical reviews remain useful evidence, but cannot silently substitute for a required new user-visible review chat. Any exception needs actual applicable human authority, not an approval inferred from a coordinator message. A non-accepting or qualified review retains its findings and restrictions; this accepting-receipt helper must not convert it into a pass.

Synthetic helper regression checks:

```text
python -m unittest discover -s tools/studio -p test_review_receipt.py
```
