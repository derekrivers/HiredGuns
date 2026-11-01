import copy
import hashlib
from pathlib import Path
import tempfile
import unittest
import json
import subprocess
import sys

from verify_review_receipt import load_json, validate


class ReceiptTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.head, self.tree = "a" * 40, "b" * 40
        self.reviewer = "11111111-1111-4111-8111-111111111111"
        self.author = "22222222-2222-4222-8222-222222222222"
        self.receipt = {
            "candidate": {"head": self.head, "tree": self.tree},
            "reviewer": {"kind": "fresh_chat", "threadId": self.reviewer,
                         "independent": True},
            "disposition": "ACCEPT",
        }
        self.status = {"head": self.head, "headTree": self.tree,
                       "reviewThreadId": self.reviewer, "reviewDisposition": "ACCEPT"}
        for label in ("report", "manifest"):
            path = self.base / (label + ".txt")
            path.write_bytes(("synthetic " + label).encode())
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            self.receipt[label + "Path"] = str(path)
            self.receipt[label + "Sha256"] = digest
            self.status["review" + label.title()] = str(path)
            self.status["review" + label.title() + "Sha256"] = digest

    def errors(self, receipt=None, status=None, reviewer=None):
        return validate(receipt or self.receipt, self.base, self.head, self.tree,
                        reviewer or self.reviewer, self.author,
                        status if status is not None else self.status, self.base)

    def test_valid_linked_evidence(self):
        self.assertEqual(self.errors(), [])

    def test_mutated_evidence_rejected(self):
        Path(self.receipt["reportPath"]).write_text("changed")
        self.assertIn("report file does not match its digest", self.errors())

    def test_old_candidate_rejected(self):
        receipt = copy.deepcopy(self.receipt)
        receipt["candidate"]["head"] = "c" * 40
        self.assertIn("receipt candidate differs from observed head/tree", self.errors(receipt))

    def test_subagent_is_not_fresh_chat(self):
        receipt = copy.deepcopy(self.receipt)
        receipt["reviewer"] = "/root/reviewer"
        self.assertIn("fresh user-visible review chat is not evidenced", self.errors(receipt))

    def test_author_cannot_review_own_candidate(self):
        receipt = copy.deepcopy(self.receipt)
        receipt["reviewer"]["threadId"] = self.author
        self.assertIn("reviewer and author must be distinct observed chats",
                      self.errors(receipt, reviewer=self.author))

    def test_case_variation_cannot_hide_self_review(self):
        chat = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        receipt = copy.deepcopy(self.receipt)
        receipt["reviewer"]["threadId"] = chat
        errors = validate(receipt, self.base, self.head, self.tree, chat, chat.upper())
        self.assertIn("reviewer and author must be distinct observed chats", errors)

    def test_wrong_status_path_even_when_receipt_is_valid(self):
        status = copy.deepcopy(self.status)
        old = self.base / "old-review.txt"
        old.write_text("old P2 finding")
        status["reviewReport"] = str(old)
        self.assertIn("owner status report reference differs from receipt", self.errors(status=status))

    def test_competing_status_identity_rejected(self):
        status = dict(self.status, commit="d" * 40, independentReview="COMPLETE_REQUEST_CHANGES")
        self.assertIn("owner status has competing current commit identities", self.errors(status=status))
        self.assertIn("owner status retains a competing current rejection", self.errors(status=status))

    def test_duplicate_json_keys_rejected(self):
        path = self.base / "duplicate.json"
        path.write_text('{"disposition":"REQUEST_CHANGES","disposition":"ACCEPT"}')
        with self.assertRaises(ValueError):
            load_json(path)

    def test_cli_cannot_skip_requested_null_status(self):
        receipt = self.base / "receipt.json"
        status = self.base / "status.json"
        receipt.write_text(json.dumps(self.receipt))
        status.write_text('{"implementationCandidate": null}')
        result = subprocess.run(
            [sys.executable, str(Path(__file__).with_name("verify_review_receipt.py")),
             "--receipt", str(receipt), "--head", self.head, "--tree", self.tree,
             "--review-thread", self.reviewer, "--author-thread", self.author,
             "--status", str(status)], capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 1)
        self.assertFalse(json.loads(result.stdout)["valid"])


if __name__ == "__main__":
    unittest.main()
