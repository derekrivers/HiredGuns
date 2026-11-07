"""Measure recorded outcome intervals; never infer missing work, tokens or savings."""

import argparse
import json
from pathlib import Path

from studio_state import fields, stamp, text
from verify_review_receipt import parse_json


PHASES = {"implementation", "review", "handoff_wait", "administration", "blocked"}


def union_seconds(intervals):
    merged = []
    for start, end in sorted(intervals):
        if merged and start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(end, merged[-1][1]))
        else:
            merged.append((start, end))
    return sum((end - start).total_seconds() for start, end in merged)


def measure(record):
    fields(record, "outcomeId readyAt acceptedAt intervals", "flow sample")
    if not text(record["outcomeId"]) or not isinstance(record["intervals"], list):
        raise ValueError("outcome and intervals required")
    ready, accepted = stamp(record["readyAt"]), stamp(record["acceptedAt"])
    if any(record[k] is not None and not stamp(record[k]) for k in ("readyAt", "acceptedAt")):
        raise ValueError("invalid lifecycle timestamp")
    if accepted and (not ready or accepted < ready):
        raise ValueError("acceptance requires a known earlier ready timestamp")
    phases = {p: [] for p in sorted(PHASES)}
    unknown = {p: 0 for p in phases}
    failed, token_totals, attempts = set(), {}, set()
    for row in record["intervals"]:
        fields(row, "taskId attempt phase start end result tokens", "interval")
        phase = row["phase"]
        if phase not in PHASES or not text(row["taskId"]) or type(row["attempt"]) is not int or row["attempt"] < 1:
            raise ValueError("invalid phase or attempt")
        if row["result"] not in {"complete", "failed", "interrupted", "unknown"}:
            raise ValueError("invalid interval result")
        start, end = stamp(row["start"]), stamp(row["end"])
        if any(row[k] is not None and not stamp(row[k]) for k in ("start", "end")) or (start and end and end < start):
            raise ValueError("invalid interval timestamps")
        if start and end:
            phases[phase].append((start, end))
        else:
            unknown[phase] += 1
        identity = (row["taskId"], row["attempt"])
        attempts.add(identity)
        if row["result"] in {"failed", "interrupted"}:
            failed.add(identity)
        # Tokens are an attempt total, never per interval. Repeated exposed
        # totals must agree; unknown does not erase an actual measurement.
        tokens = row["tokens"]
        if tokens is not None:
            if type(tokens) is not int or tokens < 0:
                raise ValueError("tokens must be measured nonnegative integers or null")
            if identity in token_totals and token_totals[identity] != tokens:
                raise ValueError("conflicting attempt token measurements")
            token_totals[identity] = tokens
    return {"outcomeId": record["outcomeId"], "readyToAcceptedSeconds": (accepted - ready).total_seconds() if ready and accepted else None,
            "recordedSecondsByPhase": {p: union_seconds(v) if v else None for p, v in phases.items()},
            "unknownIntervalsByPhase": unknown, "failedOrInterruptedAttempts": len(failed),
            "measuredTokens": sum(token_totals.values()) if token_totals else None,
            "attemptsWithoutTokenMeasurement": len(attempts - token_totals.keys()),
            "limits": "Recorded interval coverage only; phases can overlap and must not be added. Missing phases are unknown. No savings or acceptance inferred."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sample", type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(measure(parse_json(args.sample.read_bytes())), indent=2))
    except (OSError, ValueError, TypeError) as error:
        print(json.dumps({"valid": False, "error": str(error)}))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
