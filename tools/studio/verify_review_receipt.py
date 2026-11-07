"""Verify local review identity/integrity; never authorize execution or acceptance."""

import argparse
import hashlib
import json
from pathlib import Path
import re
import uuid


ACCEPTED = {"ACCEPT", "PASS", "APPROVE"}


def accepting(value):
    return isinstance(value, str) and value in ACCEPTED


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON key")
        result[key] = value
    return result


def load_json(path):
    return parse_json(Path(path).read_bytes())


def parse_json(data):
    return json.loads(data.decode("utf-8-sig"), object_pairs_hook=unique_object)


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


def valid_paths(paths):
    return (isinstance(paths, list) and bool(paths)
            and all(isinstance(path, str) and bool(path.strip())
                    and "\\" not in path and not path.startswith("/")
                    and not any(part in ("", ".", "..") for part in path.split("/"))
                    for path in paths)
            and len(set(paths)) == len(paths))


def check_candidate(actual, review_base, accepted_base, head, tree, paths, label,
                    manifest=False, legacy=False):
    errors = []
    base_key, head_key, paths_key = (("accepted_base", "commit", "changed_paths") if manifest
                                    else ("base", "head", "changedPaths"))
    review_key = "review_base" if manifest else "reviewBase"
    allowed = {base_key, head_key, paths_key, review_key, "tree"}
    if legacy:
        allowed.add("parent")
    if manifest:
        allowed.add("accepted_base_is_ancestor")
    if (not isinstance(actual, dict) or not set(actual) <= allowed
            or actual.get(base_key) != accepted_base or actual.get(head_key) != head
            or actual.get(review_key, actual.get("parent") if legacy else None) != review_base
            or actual.get("tree") != tree or not valid_paths(actual.get(paths_key))
            or set(actual[paths_key]) != set(paths)):
        errors.append(label + " candidate differs from observed base/head/tree/paths")
    if isinstance(actual, dict):
        if legacy and review_key in actual and "parent" in actual and actual[review_key] != actual["parent"]:
            errors.append(label + " has competing legacy review-base identities")
        if "parent" in actual and not is_sha(actual["parent"], 40):
            errors.append(label + " parent must be a full Git identity")
        if "accepted_base_is_ancestor" in actual and actual["accepted_base_is_ancestor"] is not True:
            errors.append(label + " declares invalid accepted-base ancestry")
    return errors


def validate(receipt, base, head, tree, observed_thread, author_thread,
             status=None, status_base=None, *, expected_base, accepted_base, changed_paths):
    errors = []
    if not isinstance(receipt, dict):
        return ["receipt must be an object"]
    if not all(is_sha(value, 40) for value in (expected_base, accepted_base, head, tree)):
        errors.append("expected base/head/tree must be full Git identities")
    if not valid_paths(changed_paths):
        return errors + ["expected changed paths must be a nonempty unique Git path list"]
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
    if not accepting(receipt.get("disposition")):
        errors.append("receipt has no accepting review disposition")

    errors.extend(check_candidate(candidate, expected_base, accepted_base, head, tree,
                                  changed_paths, "receipt",
                                  legacy=receipt.get("schema") == "obs135-current-review-receipt-v3"))
    if receipt.get("authorThreadId") != author_thread:
        errors.append("receipt author differs from observed chat")
    if "findings" in receipt and receipt["findings"] != []:
        errors.append("receipt retains findings or qualifications")
    if set(reviewer) != {"kind", "threadId", "independent"}:
        errors.append("receipt reviewer fields are ambiguous")

    evidence = {}
    for label in ("report", "manifest"):
        try:
            path = local_path(receipt.get(label + "Path"), base)
            data = path.read_bytes()
            digest = receipt.get(label + "Sha256")
            if not is_sha(digest, 64):
                errors.append(label + " digest must be SHA-256")
            elif hashlib.sha256(data).hexdigest() != digest:
                errors.append(label + " file does not match its digest")
            if not data.strip():
                errors.append(label + " evidence is empty")
            if label + "Bytes" in receipt and (type(receipt[label + "Bytes"]) is not int
                                               or receipt[label + "Bytes"] != len(data)):
                errors.append(label + " byte count differs from receipt")
            evidence[label] = (path, digest, data)
        except (OSError, ValueError, TypeError):
            errors.append(label + " evidence is missing or unreadable")

    if "manifest" in evidence:
        try:
            manifest_path, _, data = evidence["manifest"]
            manifest = parse_json(data)
            allowed = {"schema", "sealed_at_utc", "review_thread_id", "author_thread_id",
                       "source_thread_id", "verdict", "findings", "candidate", "report",
                       "reviewed_blobs", "context_blobs", "parent_relative_diff",
                       "verification_mode", "private_diagnostic_authorized", "prior_report_accessed",
                       "observed_model", "observed_reasoning", "token_usage"}
            if (not isinstance(manifest, dict) or not set(manifest) <= allowed
                    or manifest.get("schema") not in {"studio-review-manifest-v1",
                                                      "obs135-independent-exact-candidate-review-v1"}):
                raise ValueError("unsupported manifest schema")
            errors.extend(check_candidate(manifest.get("candidate"), expected_base, accepted_base,
                                          head, tree, changed_paths, "manifest", manifest=True,
                                          legacy=manifest["schema"] == "obs135-independent-exact-candidate-review-v1"))
            if manifest.get("review_thread_id") != observed_thread:
                errors.append("manifest reviewer differs from observed fresh chat")
            # The existing OBS135 schema records a coordinator, not the author.
            # Author identity is bound by the receipt and native observation in that schema.
            if (manifest.get("author_thread_id") != author_thread
                    and (manifest.get("schema") == "studio-review-manifest-v1"
                         or "author_thread_id" in manifest)):
                errors.append("manifest author differs from observed chat")
            if not accepting(manifest.get("verdict")) or manifest.get("verdict") != receipt.get("disposition"):
                errors.append("manifest has no matching accepting review disposition")
            if manifest.get("findings") != []:
                errors.append("manifest retains findings or qualifications")
            report = manifest.get("report")
            if not isinstance(report, dict) or set(report) != {"path", "bytes", "sha256"}:
                errors.append("manifest report reference is missing or ambiguous")
            elif "report" in evidence:
                path, digest, report_data = evidence["report"]
                if (local_path(report["path"], manifest_path.parent) != path
                        or report["sha256"] != digest
                        or type(report["bytes"]) is not int or report["bytes"] != len(report_data)):
                    errors.append("manifest report reference differs from receipt bytes/path/digest")
            if (isinstance(manifest.get("candidate"), dict) and "parent" in candidate
                    and manifest["candidate"].get("parent") != candidate["parent"]):
                errors.append("manifest parent differs from receipt")
        except (OSError, ValueError, TypeError):
            errors.append("manifest evidence is not supported unambiguous review JSON")

    if "report" in evidence:
        try:
            report = parse_json(evidence["report"][2])
            allowed = {"schema", "author_thread_id", "review_thread_id", "candidate",
                       "verdict", "findings", "summary", "checks", "limitations"}
            if (not isinstance(report, dict) or set(report) != allowed
                    or report["schema"] != "studio-review-report-v1"):
                raise ValueError("unsupported report schema")
            errors.extend(check_candidate(report["candidate"], expected_base, accepted_base,
                                          head, tree, changed_paths, "report", manifest=True))
            if report["author_thread_id"] != author_thread or report["review_thread_id"] != observed_thread:
                errors.append("report author/reviewer differs from observed chats")
            if not accepting(report["verdict"]) or report["verdict"] != receipt.get("disposition") or report["findings"] != []:
                errors.append("report has no matching unqualified accepting disposition")
            if (not isinstance(report["summary"], str) or not report["summary"].strip()
                    or not isinstance(report["checks"], list) or not isinstance(report["limitations"], list)):
                errors.append("report summary/checks/limitations are missing")
        except (OSError, ValueError, TypeError):
            errors.append("report evidence is not supported unambiguous review JSON")

    if status is not None:
        if not isinstance(status, dict):
            return errors + ["current owner status block must be an object"]
        if status.get("head") != head or status.get("headTree") != tree:
            errors.append("owner status differs from observed candidate")
        if "commit" in status and status["commit"] != head:
            errors.append("owner status has competing current commit identities")
        if status.get("reviewThreadId") != observed_thread:
            errors.append("owner status reviewer differs from observed chat")
        if ("independentReviewThreadId" in status
                and status["independentReviewThreadId"] != observed_thread):
            errors.append("owner status has competing current reviewer identities")
        for key, expected in (("acceptedBase", accepted_base), ("reviewBase", expected_base),
                              ("authorThreadId", author_thread)):
            if key in status and status[key] != expected:
                errors.append("owner status " + key + " differs from observed identity")
        if "changedPaths" in status and (not valid_paths(status["changedPaths"])
                                         or set(status["changedPaths"]) != set(changed_paths)):
            errors.append("owner status changed paths differ from observed review scope")
        if status.get("reviewDisposition") != receipt.get("disposition"):
            errors.append("owner status review disposition differs from receipt")
        if "independentReview" in status:
            old_disposition = status["independentReview"]
            if not isinstance(old_disposition, str) or old_disposition not in {"ACCEPT", "PASS", "APPROVE", "COMPLETE_ACCEPT", "COMPLETE_PASS", "COMPLETE_APPROVE"}:
                errors.append("owner status retains a competing current rejection or unknown disposition")
        for label, (path, digest, _) in evidence.items():
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
    parser.add_argument("--base", required=True, help="independently observed review diff base SHA")
    parser.add_argument("--accepted-base", required=True, help="independently observed accepted/PR base SHA")
    parser.add_argument("--changed-paths", type=Path, required=True,
                        help="JSON array of the complete independently observed review-base-to-head Git paths")
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
                          args.status.resolve().parent if args.status else None,
                          expected_base=args.base, accepted_base=args.accepted_base,
                          changed_paths=load_json(args.changed_paths))
    except (OSError, ValueError, TypeError):
        errors = ["receipt/status cannot be read as unambiguous JSON"]
    print(json.dumps({"valid": not errors, "errors": errors,
                      "scope": "identity/integrity only; not CI, runtime, launch or product acceptance"}))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
