import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from studio_state import digest, render, validate, write_snapshot


def snapshot():
    return {"schema": "studio-owner-status-v2", "schemaVersion": 2, "department": "qa", "ownerThreadId": "11111111-1111-4111-8111-111111111111",
            "revision": 1, "updatedAt": "2026-11-07T12:00:00Z", "observedAt": None,
            "authorityRef": "synthetic authorized migration", "state": "unknown", "activeTask": None,
            "candidates": [], "currentBlockers": [], "nextAction": "Verify owner and process state",
            "resources": [], "handoffs": [], "evidenceRefs": [], "historyRef": None}


class StateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "qa-status.json"
        self.original = b'{"schemaVersion": 1, "old": "preserve bytes and failed attempts"}\r\n'
        self.path.write_bytes(self.original)
        self.record = snapshot()

    def write(self, **kwargs):
        return write_snapshot(self.path, self.record, digest(self.original), "qa", migrate=True, **kwargs)

    def test_migration_preserves_exact_original_and_history_link(self):
        self.write()
        current = json.loads(self.path.read_bytes())
        archived = self.path.parent / current["historyRef"]["path"]
        self.assertEqual(archived.read_bytes(), self.original)
        self.assertEqual(current["historyRef"]["sha256"], digest(self.original))
        validate(current)

    def test_legacy_version_number_collision_needs_explicit_migration(self):
        self.original = b'{"schemaVersion": 2, "oldDepartmentFormat": true}'
        self.path.write_bytes(self.original)
        with self.assertRaisesRegex(ValueError, "explicit migration"):
            write_snapshot(self.path, self.record, digest(self.original), "qa")
        self.write()
        self.assertEqual(json.loads(self.path.read_bytes())["schema"], "studio-owner-status-v2")

    def test_stale_expected_hash_does_not_overwrite_new_work(self):
        self.path.write_bytes(self.original + b" ")
        with self.assertRaisesRegex(ValueError, "changed"):
            self.write()
        self.assertEqual(self.path.read_bytes(), self.original + b" ")

    def test_lock_never_expires_automatically(self):
        lock = self.path.with_suffix(".json.lock")
        lock.write_text("another holder")
        with self.assertRaises(FileExistsError):
            self.write()
        self.assertEqual(lock.read_text(), "another holder")
        self.assertEqual(self.path.read_bytes(), self.original)

    def test_replace_failure_preserves_old_state_and_releases_own_lock(self):
        with patch("studio_state.os.replace", side_effect=OSError("simulated crash before replace")):
            with self.assertRaises(OSError):
                self.write()
        self.assertEqual(self.path.read_bytes(), self.original)
        self.assertFalse(self.path.with_suffix(".json.lock").exists())
        self.assertEqual(list(self.path.parent.glob("*.tmp")), [])
        self.write()  # previously saved history is reusable only if its bytes match

    def test_new_revision_preserves_previous_snapshot_and_owner(self):
        self.write()
        before = self.path.read_bytes()
        updated = dict(json.loads(before), revision=2)
        write_snapshot(self.path, updated, digest(before), "qa")
        self.assertEqual(json.loads(self.path.read_bytes())["revision"], 2)
        with self.assertRaisesRegex(ValueError, "revision"):
            write_snapshot(self.path, updated, digest(self.path.read_bytes()), "qa")

    def test_unknown_fields_and_conflicting_candidate_aliases_rejected(self):
        self.record["candidateHead"] = "a" * 40
        with self.assertRaisesRegex(ValueError, "unsupported"):
            validate(self.record)

    def test_released_resource_cannot_keep_holder(self):
        self.record["resources"] = [{"name": "heavy", "state": "released", "holderTask": "old-task",
                                     "observedAt": "2026-11-07T11:59:00Z", "evidenceRef": "stopped process receipt"}]
        with self.assertRaisesRegex(ValueError, "holder"):
            validate(self.record)

    def test_missing_observation_cannot_claim_working(self):
        self.record["state"] = "working"
        with self.assertRaisesRegex(ValueError, "observation"):
            validate(self.record)

    def test_idle_and_unobserved_running_task_are_rejected(self):
        self.record["state"] = "idle"
        self.record["observedAt"] = self.record["updatedAt"]
        self.record["activeTask"] = {"taskId": "worker-1", "threadId": self.record["ownerThreadId"],
                                     "status": "running", "candidateId": None}
        with self.assertRaisesRegex(ValueError, "idle"):
            validate(self.record)
        self.record["state"] = "unknown"
        self.record["observedAt"] = None
        with self.assertRaisesRegex(ValueError, "observation"):
            validate(self.record)

    def test_history_corruption_aborts_before_replacement(self):
        self.write()
        current = json.loads(self.path.read_bytes())
        history = self.path.parent / current["historyRef"]["path"]
        self.path.write_bytes(self.original)
        history.write_text("corrupt")
        with self.assertRaisesRegex(ValueError, "archive"):
            self.write()
        self.assertEqual(self.path.read_bytes(), self.original)

    def test_duplicate_candidates_and_dangling_handoffs_rejected(self):
        candidate = {"id": "PR1", "base": "a" * 40, "head": "b" * 40, "tree": "c" * 40,
                     "disposition": "held", "evidenceRef": "review held"}
        self.record["candidates"] = [candidate, copy.deepcopy(candidate)]
        with self.assertRaisesRegex(ValueError, "unique"):
            validate(self.record)
        self.record["candidates"] = []
        self.record["handoffs"] = [{"id": "h1", "candidateId": "missing", "transition": "review", "receiver": "qa",
                                    "disposition": "pending", "evidenceRef": "packet", "nextCheck": "manual owner turn"}]
        with self.assertRaisesRegex(ValueError, "unknown candidate"):
            validate(self.record)

    def test_render_preserves_unknown_observation(self):
        output = render([self.record])
        self.assertIn("unknown", output)
        self.assertNotIn("working", output)


if __name__ == "__main__":
    unittest.main()
