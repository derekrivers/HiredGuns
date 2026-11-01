"""Verify local review identity/integrity; never authorize execution or acceptance."""

import argparse
import hashlib
import json
from pathlib import Path
import re
import uuid


ACCEPTED = {"ACCEPT", "PASS", "APPROVE"}


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON key")
        result[key] = value
    return result


def load_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"),
                      object_pairs_hook=unique_object)


def is_sha(value, length):
    return isinstance(value, str) and bool(re.fullmatch(r"[0-9a-f]{%d}" % length, value))


def is_chat(value):
    try:
        return isinstance(value, str) and str(uuid.UUID(value)) == value
    except (ValueError, AttributeError):
        return False


def local_path(value, base):
    if not isinstance(value, str) or not value.strip():
        raise ValueError("missing evidence path")
    path = Path(value)
    return (path if path.is_absolute() else base / path).resolve()


def validate(receipt, base, head, tree, observed_thread, author_thread,
             status=None, status_base=None):
    errors = []
    if not isinstance(receipt, dict):
        return ["receipt must be an object"]
    if not is_sha(head, 40) or not is_sha(tree, 40):
        errors.append("expected head/tree must be full Git identities")
    candidate = receipt.get("candidate", {})
    if not isinstance(candidate, dict):
        candidate = {}
    if candidate.get("head") != head or candidate.get("tree") != tree:
        errors.append("receipt candidate differs from observed head/tree")
    reviewer = receipt.get("reviewer", {})
    if not isinstance(reviewer, dict):
        reviewer = {}
    if reviewer.get("kind") != "fresh_chat":
        errors.append("fresh user-visible review chat is not evidenced")
    if not is_chat(observed_thread) or reviewer.get("threadId") != observed_thread:
        errors.append("reviewer differs from observed chat identity")
    if not is_chat(author_thread) or observed_thread == author_thread:
        errors.append("reviewer and author must be distinct observed chats")
    if reviewer.get("independent") is not True:
        errors.append("independent review declaration is missing")
    if receipt.get("disposition") not in ACCEPTED:
        errors.append("receipt has no accepting review disposition")

    evidence = {}
    for label in ("report", "manifest"):
        try:
            path = local_path(receipt.get(label + "Path"), base)
            digest = receipt.get(label + "Sha256")
            if not is_sha(digest, 64):
                errors.append(label + " digest must be SHA-256")
            elif hashlib.sha256(path.read_bytes()).hexdigest() != digest:
                errors.append(label + " file does not match its digest")
            evidence[label] = (path, digest)
        except (OSError, ValueError, TypeError):
            errors.append(label + " evidence is missing or unreadable")

    if status is not None:
        if not isinstance(status, dict):
            return errors + ["current owner status block must be an object"]
        if status.get("head") != head or status.get("headTree") != tree:
            errors.append("owner status differs from observed candidate")
        if "commit" in status and status["commit"] != head:
            errors.append("owner status has competing current commit identities")
        if status.get("reviewThreadId") != observed_thread:
            errors.append("owner status reviewer differs from observed chat")
        if status.get("reviewDisposition") != receipt.get("disposition"):
            errors.append("owner status review disposition differs from receipt")
        if "REQUEST_CHANGES" in str(status.get("independentReview", "")):
            errors.append("owner status retains a competing current rejection")
        for label, (path, digest) in evidence.items():
            prefix = "review" + label.title()
            try:
                linked = local_path(status.get(prefix), status_base or base)
                if linked != path or status.get(prefix + "Sha256") != digest:
                    errors.append("owner status " + label + " reference differs from receipt")
            except (OSError, ValueError, TypeError):
                errors.append("owner status " + label + " reference is missing")
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--receipt", type=Path, required=True)
    parser.add_argument("--head", required=True)
    parser.add_argument("--tree", required=True)
    parser.add_argument("--review-thread", required=True)
    parser.add_argument("--author-thread", required=True)
    parser.add_argument("--status", type=Path)
    parser.add_argument("--status-key", default="implementationCandidate")
    args = parser.parse_args()
    try:
        receipt = load_json(args.receipt)
        status = None
        if args.status:
            document = load_json(args.status)
            if (not isinstance(document, dict) or args.status_key not in document
                    or not isinstance(document[args.status_key], dict)):
                raise ValueError("current status block is missing")
            status = document[args.status_key]
        errors = validate(receipt, args.receipt.resolve().parent, args.head, args.tree,
                          args.review_thread, args.author_thread, status,
                          args.status.resolve().parent if args.status else None)
    except (OSError, ValueError, TypeError):
        errors = ["receipt/status cannot be read as unambiguous JSON"]
    print(json.dumps({"valid": not errors, "errors": errors,
                      "scope": "identity/integrity only; not CI, runtime, launch or product acceptance"}))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
