"""Validate and replace private owner snapshots without losing history.

This is record integrity, not authority, dispatch, resource release or acceptance.
Only the owner (or an explicitly authorized migration) supplies the snapshot.
"""

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import tempfile

from verify_review_receipt import is_chat, is_sha, parse_json


FIELDS = {"schema", "schemaVersion", "department", "ownerThreadId", "revision", "updatedAt",
          "observedAt", "authorityRef", "state", "activeTask", "candidates",
          "currentBlockers", "nextAction", "resources", "handoffs", "evidenceRefs",
          "historyRef"}


def text(value):
    return isinstance(value, str) and bool(value.strip())


def stamp(value):
    if not isinstance(value, str) or not value.endswith("Z"):
        return None
    try:
        return datetime.fromisoformat(value[:-1] + "+00:00")
    except ValueError:
        return None


def digest(data):
    return hashlib.sha256(data).hexdigest()


def fields(value, names, label):
    if not isinstance(value, dict) or set(value) != set(names.split()):
        raise ValueError(label + " has missing or unsupported fields")


def validate(record):
    if not isinstance(record, dict) or set(record) != FIELDS:
        raise ValueError("owner snapshot has missing or unsupported fields")
    if record["schema"] != "studio-owner-status-v2" or record["schemaVersion"] != 2 or type(record["revision"]) is not int or record["revision"] < 1:
        raise ValueError("invalid schema or revision")
    if not text(record["department"]) or not is_chat(record["ownerThreadId"]):
        raise ValueError("owner identity is missing")
    if not text(record["authorityRef"]) or not text(record["nextAction"]):
        raise ValueError("authority and next action must be explicit")
    if record["state"] not in {"unknown", "idle", "working", "waiting", "blocked"}:
        raise ValueError("unsupported owner state")
    updated, observed = stamp(record["updatedAt"]), stamp(record["observedAt"])
    if not updated or (record["observedAt"] is not None and not observed):
        raise ValueError("timestamps must be UTC ISO timestamps or an unknown observation")
    if observed and observed > updated:
        raise ValueError("observation cannot be newer than snapshot")
    if record["state"] in {"working", "idle"} and not observed:
        raise ValueError("execution state requires an observation")
    for key in ("candidates", "currentBlockers", "resources", "handoffs", "evidenceRefs"):
        if not isinstance(record[key], list):
            raise ValueError(key + " must be an array")
    if not all(text(ref) for ref in record["evidenceRefs"]):
        raise ValueError("evidence references must be explicit")
    ids = set()
    for candidate in record["candidates"]:
        fields(candidate, "id base head tree disposition evidenceRef", "candidate")
        if not text(candidate["id"]) or candidate["id"] in ids:
            raise ValueError("candidate IDs must be nonempty and unique")
        ids.add(candidate["id"])
        if not all(is_sha(candidate[k], 40) for k in ("base", "head", "tree")):
            raise ValueError("candidate must have full base/head/tree identities")
        if candidate["disposition"] not in {"pending", "held", "accepted", "rejected"}:
            raise ValueError("invalid candidate disposition")
        if not text(candidate["evidenceRef"]):
            raise ValueError("candidate needs scoped evidence; acceptance is independently checked")
    task = record["activeTask"]
    if task is not None:
        fields(task, "taskId threadId status candidateId", "task")
        if not text(task["taskId"]) or not is_chat(task["threadId"]):
            raise ValueError("task identity missing")
        if task["status"] not in {"unknown", "running", "waiting", "interrupted", "ready_for_review", "in_review"}:
            raise ValueError("invalid task execution state")
        if task["candidateId"] is not None and task["candidateId"] not in ids:
            raise ValueError("task refers to an unknown candidate")
    if record["state"] == "working" and (not task or task["status"] != "running"):
        raise ValueError("working requires an observed running task")
    if record["state"] == "idle" and task is not None:
        raise ValueError("idle cannot retain an active task; use waiting or unknown")
    if task and task["status"] == "running" and not observed:
        raise ValueError("running task requires an observation")
    for blocker in record["currentBlockers"]:
        fields(blocker, "id scope owner nextAction exitCriterion evidenceRef", "blocker")
        if not all(text(v) for v in blocker.values()):
            raise ValueError("blocker must have scope, owner, action, exit and evidence")
    if record["state"] == "blocked" and not record["currentBlockers"]:
        raise ValueError("blocked requires a scoped blocker")
    names = set()
    for resource in record["resources"]:
        fields(resource, "name state holderTask observedAt evidenceRef", "resource")
        if not text(resource["name"]) or resource["name"] in names:
            raise ValueError("duplicate or missing resource name")
        names.add(resource["name"])
        if resource["state"] not in {"unknown", "held", "released"}:
            raise ValueError("invalid resource state")
        if resource["state"] == "released" and resource["holderTask"] is not None:
            raise ValueError("released resource cannot retain a holder")
        if resource["state"] == "held" and not text(resource["holderTask"]):
            raise ValueError("held resource requires a holder")
        when = stamp(resource["observedAt"])
        if resource["state"] != "unknown" and (not when or not text(resource["evidenceRef"])):
            raise ValueError("resource disposition requires observed evidence")
        if resource["observedAt"] is not None and (not when or when > updated):
            raise ValueError("invalid resource observation time")
    handoff_ids = set()
    for handoff in record["handoffs"]:
        fields(handoff, "id candidateId transition receiver disposition evidenceRef nextCheck", "handoff")
        if not text(handoff["id"]) or handoff["id"] in handoff_ids:
            raise ValueError("duplicate or missing handoff ID")
        handoff_ids.add(handoff["id"])
        if handoff["candidateId"] is not None and handoff["candidateId"] not in ids:
            raise ValueError("handoff refers to an unknown candidate")
        if handoff["disposition"] not in {"pending", "delivery_uncertain", "acknowledged", "needs_information", "rejected"}:
            raise ValueError("invalid handoff disposition")
        if not all(text(handoff[k]) for k in ("transition", "receiver", "evidenceRef", "nextCheck")):
            raise ValueError("handoff needs receiver, evidence and an actual next check or explicit unavailable reason")
    if record["historyRef"] is not None:
        fields(record["historyRef"], "path sha256", "history reference")
        if not text(record["historyRef"]["path"]) or not is_sha(record["historyRef"]["sha256"], 64):
            raise ValueError("invalid history reference")


def write_snapshot(path, draft, expected_sha, owner, migrate=False):
    """Compare-and-replace under an exclusive lock; keep exact old bytes first.

    A lock is never expired automatically. A crash before replace leaves the old
    state and possibly its history copy. A crash after replace leaves a valid
    new state linking that history. No partial new snapshot is visible.
    """
    path = Path(path).resolve()
    lock = path.with_name(path.name + ".lock")
    fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    temp = None
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump({"pid": os.getpid(), "owner": owner}, handle)
        before = path.read_bytes()
        if not is_sha(expected_sha, 64) or digest(before) != expected_sha:
            raise ValueError("owner record changed; reread and reconcile before retry")
        previous = parse_json(before)
        if not isinstance(previous, dict):
            raise ValueError("previous owner record is not an object")
        validate(draft)
        if draft["department"] != owner:
            raise ValueError("writer owner differs from snapshot owner")
        if previous.get("schema") == "studio-owner-status-v2":
            validate(previous)
            if draft["ownerThreadId"] != previous["ownerThreadId"] or previous["department"] != owner:
                raise ValueError("owner transfer requires a separately recorded recovery decision")
            if draft["revision"] != previous["revision"] + 1:
                raise ValueError("revision must advance exactly once")
            if stamp(draft["updatedAt"]) < stamp(previous["updatedAt"]):
                raise ValueError("snapshot time cannot move backwards")
        elif not migrate or draft["revision"] != 1:
            raise ValueError("legacy state requires explicit migration with revision one")
        history = path.parent / "history" / path.stem / (expected_sha + ".json")
        history.parent.mkdir(parents=True, exist_ok=True)
        if history.exists():
            if history.read_bytes() != before:
                raise ValueError("history digest collision or damaged archive")
        else:
            with history.open("xb") as handle:
                handle.write(before)
                handle.flush()
                os.fsync(handle.fileno())
        if digest(history.read_bytes()) != expected_sha:
            raise ValueError("history verification failed")
        draft = dict(draft, historyRef={"path": os.path.relpath(history, path.parent).replace("\\", "/"), "sha256": expected_sha})
        data = (json.dumps(draft, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix=path.name + ".", suffix=".tmp", delete=False) as handle:
            temp = Path(handle.name)
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        # Also detect writers which did not honor our lock before publication.
        if digest(path.read_bytes()) != expected_sha:
            raise ValueError("owner record changed during write; migration not published")
        os.replace(temp, path)
        temp = None
        return digest(data)
    finally:
        if temp is not None:
            temp.unlink(missing_ok=True)
        lock.unlink(missing_ok=True)


def render(records):
    lines = ["# Studio owner snapshots", "", "Recorded observations, not live execution or acceptance. Refresh before dispatch.", "",
             "| Owner | Recorded state | Observed at | Task | Next action |", "|---|---|---|---|---|"]
    def cell(value):
        return str(value).replace("|", "\\|").replace("\n", " ").replace("\r", " ")
    for record in records:
        validate(record)
        task = record["activeTask"]
        lines.append("| " + " | ".join(cell(v) for v in (record["department"], record["state"], record["observedAt"] or "unknown",
                                                       task["taskId"] + " / " + task["status"] if task else "none recorded", record["nextAction"])) + " |")
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    check = sub.add_parser("validate")
    check.add_argument("paths", nargs="+", type=Path)
    write = sub.add_parser("write")
    write.add_argument("--state", type=Path, required=True)
    write.add_argument("--draft", type=Path, required=True)
    write.add_argument("--expected-sha256", required=True)
    write.add_argument("--owner", required=True)
    write.add_argument("--migrate", action="store_true")
    view = sub.add_parser("render")
    view.add_argument("paths", nargs="+", type=Path)
    args = parser.parse_args()
    try:
        if args.command == "write":
            sha = write_snapshot(args.state, parse_json(args.draft.read_bytes()), args.expected_sha256, args.owner, args.migrate)
            print(json.dumps({"written": True, "sha256": sha}))
        else:
            records = [parse_json(p.read_bytes()) for p in args.paths]
            for record in records:
                validate(record)
            print(render(records) if args.command == "render" else json.dumps({"valid": True, "records": len(records)}))
    except (OSError, ValueError, TypeError) as error:
        print(json.dumps({"valid": False, "error": str(error)}))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
