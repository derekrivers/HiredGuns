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
        self.git_base = "c" * 40
        self.paths = ["tools/studio/verify_review_receipt.py", "docs/studio/review-receipts.md"]
        self.reviewer = "11111111-1111-4111-8111-111111111111"
        self.author = "22222222-2222-4222-8222-222222222222"
        self.receipt = {
            "candidate": {"base": self.git_base, "head": self.head, "tree": self.tree,
                          "changedPaths": self.paths, "reviewBase": self.git_base},
            "authorThreadId": self.author,
            "reviewer": {"kind": "fresh_chat", "threadId": self.reviewer,
                         "independent": True},
            "disposition": "ACCEPT",
        }
        self.status = {"head": self.head, "headTree": self.tree,
                       "reviewThreadId": self.reviewer, "reviewDisposition": "ACCEPT"}
        self.documents = {}
        self.documents["report"] = {
            "schema": "studio-review-report-v1", "author_thread_id": self.author,
            "review_thread_id": self.reviewer, "verdict": "ACCEPT", "findings": [],
            "candidate": {"accepted_base": self.git_base, "commit": self.head,
                          "tree": self.tree, "changed_paths": self.paths, "review_base": self.git_base},
            "summary": "Synthetic scoped review", "checks": [], "limitations": ["static review only"],
        }
        self.write_evidence("report", self.documents["report"])
        self.documents["manifest"] = {
            "schema": "studio-review-manifest-v1",
            "candidate": {"accepted_base": self.git_base, "commit": self.head,
                          "tree": self.tree, "changed_paths": self.paths, "review_base": self.git_base},
            "review_thread_id": self.reviewer, "author_thread_id": self.author,
            "verdict": "ACCEPT", "findings": [],
            "report": {"path": self.receipt["reportPath"],
                       "bytes": Path(self.receipt["reportPath"]).stat().st_size,
                       "sha256": self.receipt["reportSha256"]},
        }
        self.write_evidence("manifest", self.documents["manifest"])

    def write_evidence(self, label, document):
        path = self.base / (label + ".json")
        path.write_text(document if isinstance(document, str) else json.dumps(document), encoding="utf-8")
        self.rehash(label)

    def rehash(self, label):
        path = self.base / (label + ".json")
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        self.receipt[label + "Path"] = str(path)
        self.receipt[label + "Sha256"] = digest
        self.status["review" + label.title()] = str(path)
        self.status["review" + label.title() + "Sha256"] = digest
        if label == "report" and "manifest" in self.documents:
            self.documents["manifest"]["report"]["sha256"] = digest
            self.documents["manifest"]["report"]["bytes"] = path.stat().st_size
            self.write_evidence("manifest", self.documents["manifest"])

    def errors(self, receipt=None, status=None, reviewer=None):
        return validate(receipt or self.receipt, self.base, self.head, self.tree,
                        reviewer or self.reviewer, self.author,
                        status if status is not None else self.status, self.base,
                        expected_base=self.git_base, accepted_base=self.git_base, changed_paths=self.paths)

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
        errors = validate(receipt, self.base, self.head, self.tree, chat, chat.upper(),
                          expected_base=self.git_base, accepted_base=self.git_base, changed_paths=self.paths)
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
        self.assertIn("owner status retains a competing current rejection or unknown disposition", self.errors(status=status))

    def test_rejecting_or_ambiguous_current_status_cannot_coexist_with_accept(self):
        for disposition in ("REJECT", "COMPLETE_REJECT", "FAIL", "pending", "accept with conditions"):
            with self.subTest(disposition=disposition):
                self.assertTrue(self.errors(status=dict(self.status, independentReview=disposition)))

    def test_conflicting_legacy_parent_and_review_base_fail(self):
        self.receipt["schema"] = "obs135-current-review-receipt-v3"
        self.receipt["candidate"]["parent"] = "d" * 40
        manifest = self.documents["manifest"]
        manifest["schema"] = "obs135-independent-exact-candidate-review-v1"
        manifest["candidate"]["parent"] = "d" * 40
        self.write_evidence("manifest", manifest)
        errors = self.errors()
        self.assertIn("receipt has competing legacy review-base identities", errors)
        self.assertIn("manifest has competing legacy review-base identities", errors)

    def test_resealed_rejecting_or_unrelated_report_cannot_pass(self):
        original = copy.deepcopy(self.documents["report"])
        for field, value in (("verdict", "REQUEST_CHANGES"), ("review_thread_id", self.author),
                             ("findings", ["blocking defect"]), ("candidate", {})):
            with self.subTest(field=field):
                report = copy.deepcopy(original)
                report[field] = value
                self.write_evidence("report", report)  # also updates the manifest seal
                self.assertTrue(self.errors())
        self.write_evidence("report", "Unrelated prose with a fresh hash")
        self.assertIn("report evidence is not supported unambiguous review JSON", self.errors())

    def test_duplicate_json_keys_rejected(self):
        path = self.base / "duplicate.json"
        path.write_text('{"disposition":"REQUEST_CHANGES","disposition":"ACCEPT"}')
        with self.assertRaises(ValueError):
            load_json(path)

    def test_unrelated_evidence_rejected_even_with_correct_hashes(self):
        for content in ("policy or test source", "{}", "[]", "null", ""):
            with self.subTest(content=content):
                self.write_evidence("manifest", content)
                self.assertTrue(self.errors())

    def test_each_evidence_identity_is_bound(self):
        mutations = [
            ("candidate", "accepted_base", "0" * 40), ("candidate", "commit", "0" * 40),
            ("candidate", "review_base", "0" * 40),
            ("candidate", "tree", "0" * 40), ("candidate", "paths", []),
            ("candidate", "changed_paths", []), ("candidate", "changed_paths", [self.paths[0]]),
            ("candidate", "changed_paths", self.paths + ["unreviewed.py"]),
            ("candidate", "changed_paths", self.paths * 2),
            (None, "review_thread_id", "33333333-3333-4333-8333-333333333333"),
            (None, "author_thread_id", self.reviewer),
            (None, "verdict", "REQUEST_CHANGES"), (None, "verdict", "PASS"),
            (None, "verdict", None), (None, "schema", "unrelated-v1"),
            (None, "disposition", "REQUEST_CHANGES"),
            ("report", "path", "unrelated.txt"), ("report", "bytes", 0),
            ("report", "sha256", "0" * 64),
        ]
        for label in ("manifest",):
            for section, key, value in mutations:
                with self.subTest(label=label, section=section, key=key, value=value):
                    original = copy.deepcopy(self.documents[label])
                    document = copy.deepcopy(original)
                    (document[section] if section else document)[key] = value
                    self.write_evidence(label, document)
                    self.assertTrue(self.errors())
                    self.write_evidence(label, original)

    def test_missing_fields_and_qualified_reports_rejected(self):
        for label in ("manifest",):
            for key in self.documents[label]:
                with self.subTest(label=label, missing=key):
                    document = copy.deepcopy(self.documents[label])
                    del document[key]
                    self.write_evidence(label, document)
                    self.assertTrue(self.errors())
            self.write_evidence(label, self.documents[label])
        for value in ([{"severity": "P2", "summary": "repair required"}], None, "none"):
            document = dict(self.documents["manifest"], findings=value)
            self.write_evidence("manifest", document)
            self.assertIn("manifest retains findings or qualifications", self.errors())

    def test_manifest_binds_exact_report_bytes(self):
        Path(self.receipt["reportPath"]).write_text("Unrelated or rejecting report")
        # Update the receipt/status hashes, but preserve the reviewer's report seal.
        digest = hashlib.sha256(Path(self.receipt["reportPath"]).read_bytes()).hexdigest()
        self.receipt["reportSha256"] = digest
        self.status["reviewReportSha256"] = digest
        self.assertIn("manifest report reference differs from receipt bytes/path/digest", self.errors())

    def test_duplicate_evidence_keys_rejected_with_matching_hash(self):
        for label in ("manifest",):
            document = json.dumps(self.documents[label])
            Path(self.receipt[label + "Path"]).write_text(
                '{"verdict":"REQUEST_CHANGES",' + document[1:], encoding="utf-8")
            self.rehash(label)
            self.assertIn("manifest evidence is not supported unambiguous review JSON", self.errors())
            self.write_evidence(label, self.documents[label])

    def test_expected_base_and_complete_path_set_required(self):
        for git_base, paths in [("0" * 40, self.paths), ("short", self.paths),
                                (self.git_base, []), (self.git_base, [self.paths[0]]),
                                (self.git_base, self.paths * 2), (self.git_base, ["../escape"])]:
            with self.subTest(base=git_base, paths=paths):
                self.assertTrue(validate(self.receipt, self.base, self.head, self.tree,
                                         self.reviewer, self.author,
                                         expected_base=git_base, accepted_base=self.git_base, changed_paths=paths))

    def test_path_order_does_not_change_scope(self):
        self.assertEqual(validate(self.receipt, self.base, self.head, self.tree,
                                  self.reviewer, self.author, expected_base=self.git_base, accepted_base=self.git_base,
                                  changed_paths=list(reversed(self.paths))), [])

    def test_receipt_identity_scope_and_author_are_required(self):
        for key, value in [("base", "0" * 40), ("reviewBase", "0" * 40),
                           ("changedPaths", []), ("changedPaths", [self.paths[0]]),
                           ("changedPaths", self.paths * 2)]:
            with self.subTest(key=key, value=value):
                receipt = copy.deepcopy(self.receipt)
                receipt["candidate"][key] = value
                self.assertTrue(self.errors(receipt))
        for key in ("base", "reviewBase", "changedPaths"):
            receipt = copy.deepcopy(self.receipt)
            del receipt["candidate"][key]
            self.assertTrue(self.errors(receipt))
        for key, value in [("authorThreadId", self.reviewer), ("disposition", []),
                           ("disposition", "REQUEST_CHANGES"), ("findings", ["P2"])]:
            receipt = copy.deepcopy(self.receipt)
            receipt[key] = value
            self.assertTrue(self.errors(receipt))

    def test_review_base_is_distinct_from_accepted_base(self):
        review_base = "d" * 40
        self.receipt["candidate"]["reviewBase"] = review_base
        self.documents["manifest"]["candidate"]["review_base"] = review_base
        self.documents["report"]["candidate"]["review_base"] = review_base
        self.write_evidence("report", self.documents["report"])
        self.write_evidence("manifest", self.documents["manifest"])
        self.assertEqual(validate(self.receipt, self.base, self.head, self.tree, self.reviewer,
                                  self.author, expected_base=review_base,
                                  accepted_base=self.git_base, changed_paths=self.paths), [])
        self.assertTrue(self.errors())

    def test_legacy_parent_relative_manifest_preserves_scope(self):
        receipt = copy.deepcopy(self.receipt)
        receipt["schema"] = "obs135-current-review-receipt-v3"
        receipt["candidate"]["parent"] = receipt["candidate"].pop("reviewBase")
        manifest = copy.deepcopy(self.documents["manifest"])
        manifest["schema"] = "obs135-independent-exact-candidate-review-v1"
        manifest["candidate"]["parent"] = manifest["candidate"].pop("review_base")
        del manifest["author_thread_id"]
        self.write_evidence("manifest", manifest)
        receipt["manifestSha256"] = self.receipt["manifestSha256"]
        self.assertEqual(self.errors(receipt), [])
        self.assertTrue(validate(receipt, self.base, self.head, self.tree, self.reviewer,
                                 self.author, expected_base=self.git_base,
                                 accepted_base=self.git_base, changed_paths=self.paths + ["extra.py"]))

    def test_report_replacement_must_keep_reviewer_seal(self):
        original = copy.deepcopy(self.documents["manifest"])
        for text in ("Unrelated policy file", "REQUEST_CHANGES: P2 remains", ""):
            self.write_evidence("report", text)
            self.write_evidence("manifest", original)
            self.assertTrue(self.errors())

    def test_manifest_wrong_types_and_competing_status_rejected(self):
        for key, value in [("verdict", []), ("report", []), ("candidate", []),
                           ("findings", {}), ("schema", "unrelated")]:
            self.write_evidence("manifest", dict(self.documents["manifest"], **{key: value}))
            self.assertTrue(self.errors())
        self.write_evidence("manifest", self.documents["manifest"])
        for key, value in [("acceptedBase", "0" * 40), ("reviewBase", "0" * 40),
                           ("changedPaths", []), ("independentReviewThreadId", self.author)]:
            self.assertTrue(self.errors(status=dict(self.status, **{key: value})))

    def test_cli_cannot_skip_requested_null_status(self):
        receipt = self.base / "receipt.json"
        status = self.base / "status.json"
        receipt.write_text(json.dumps(self.receipt))
        paths = self.base / "paths.json"
        paths.write_text(json.dumps(self.paths))
        status.write_text('{"implementationCandidate": null}')
        result = subprocess.run(
            [sys.executable, str(Path(__file__).with_name("verify_review_receipt.py")),
             "--receipt", str(receipt), "--head", self.head, "--tree", self.tree,
             "--base", self.git_base, "--accepted-base", self.git_base, "--changed-paths", str(paths),
             "--review-thread", self.reviewer, "--author-thread", self.author,
             "--status", str(status)], capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 1)
        self.assertFalse(json.loads(result.stdout)["valid"])

    def test_cli_valid_scope_and_required_inputs(self):
        receipt = self.base / "receipt.json"
        paths = self.base / "paths.json"
        receipt.write_text(json.dumps(self.receipt), encoding="utf-8")
        paths.write_text(json.dumps(self.paths), encoding="utf-8")
        command = [sys.executable, str(Path(__file__).with_name("verify_review_receipt.py")),
                   "--receipt", str(receipt), "--head", self.head, "--tree", self.tree,
                   "--review-thread", self.reviewer, "--author-thread", self.author]
        result = subprocess.run(command + ["--base", self.git_base, "--accepted-base", self.git_base,
                                          "--changed-paths", str(paths)],
                                capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(json.loads(result.stdout)["valid"])
        for missing in ("--base", "--accepted-base", "--changed-paths"):
            scope_args = [arg for flag, value in [("--base", self.git_base),
                          ("--accepted-base", self.git_base), ("--changed-paths", str(paths))]
                          if flag != missing for arg in (flag, value)]
            result = subprocess.run(command + scope_args, capture_output=True, text=True, check=False)
            self.assertEqual(result.returncode, 2)


if __name__ == "__main__":
    unittest.main()
