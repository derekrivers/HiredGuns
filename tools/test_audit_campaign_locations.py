"""Synthetic-only tests for the disconnected campaign-location audit."""
import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest

import audit_campaign_locations as audit


def container(raw, payload=b"synthetic payload"):
    return (b"RNC\x01" + len(raw).to_bytes(4, "big")
            + len(payload).to_bytes(4, "big")
            + audit.crc16(raw).to_bytes(2, "big")
            + audit.crc16(payload).to_bytes(2, "big") + b"\x00\x03" + payload)


class LocationAuditTests(unittest.TestCase):
    def setUp(self):
        self.raw = bytes(audit.RECORD_SIZE * audit.RECORD_COUNT)
        self.packed = container(self.raw)
        self.decoder = b"def unpack(data):\n return bytes(25474), {'synthetic': True}\n"

    def test_crc_known_vector(self):
        self.assertEqual(audit.crc16(b"123456789"), 0xbb3d)

    def test_exact_layout(self):
        self.assertEqual(sum(size for _, size in audit.FIELD_SIZES), 542)
        offsets = {}
        offset = 0
        for field, size in audit.FIELD_SIZES:
            offsets[field] = offset
            offset += size
        self.assertEqual(offsets["locn_info"], 260)
        self.assertEqual(offsets["locn_map_num"], 526)
        self.assertEqual(offsets["locn_destinations"], 534)

    def test_identical(self):
        report = audit.compare_records(self.raw, self.raw)
        self.assertTrue(report["byte_identical"])
        self.assertEqual(report["records"], [])

    def test_diff_boundaries_all_bytes_once(self):
        other = bytearray(self.raw)
        offsets = (0, 1, 2, 9, 10, 259, 260, 524, 525, 533, 534, 541, 542, len(other)-1)
        for off in offsets:
            other[off] = 255
        report = audit.compare_records(self.raw, bytes(other))
        self.assertEqual(report["changed_byte_count"], len(offsets))
        self.assertEqual([r["record_one_based"] for r in report["records"]], [1, 2, 47])
        reconstructed = []
        for record in report["records"]:
            base = record["table_span"][0]
            for field in record["fields"]:
                for start, end in field["changed_spans"]:
                    self.assertGreaterEqual(start, field["field_span"][0])
                    self.assertLessEqual(end, field["field_span"][1])
                    reconstructed.extend(range(base+start, base+end))
        self.assertEqual(reconstructed, list(offsets))

    def test_entire_table_diff(self):
        report = audit.compare_records(self.raw, b"\xff" * len(self.raw))
        self.assertEqual(report["changed_byte_count"], len(self.raw))
        self.assertEqual(report["changed_record_count"], 47)
        self.assertEqual(len(report["records"][0]["fields"]), len(audit.FIELD_SIZES))

    def test_comparison_rejects_partial_or_extra_record(self):
        for bad in (self.raw[:-1], self.raw+b"\0", b""):
            with self.subTest(size=len(bad)), self.assertRaises(audit.AuditError):
                audit.compare_records(bad, self.raw)
            with self.assertRaises(audit.AuditError):
                audit.compare_records(self.raw, bad)

    def test_verified_external_decoder(self):
        raw, header = audit.unpack_verified(self.packed, audit.sha256(self.packed),
                                            self.decoder, audit.sha256(self.decoder))
        self.assertEqual(raw, self.raw)
        self.assertEqual(header["chunks"], 3)

    def test_identity_and_container_checks_precede_decoder(self):
        bomb = b"raise RuntimeError('must not execute')\n"
        mutations = [b"", b"RNC\x02"+self.packed[4:], self.packed[:-1], self.packed+b"x"]
        for offset in (4, 8, 14, 18):
            bad = bytearray(self.packed)
            bad[offset] ^= 1
            mutations.append(bytes(bad))
        for bad in mutations:
            with self.subTest(size=len(bad)), self.assertRaises(audit.AuditError):
                audit.unpack_verified(bad, audit.sha256(bad), bomb, audit.sha256(bomb))
        for archive_hash, decoder_hash in (("0"*64, audit.sha256(bomb)),
                                           (audit.sha256(self.packed), "0"*64),
                                           ("BAD", audit.sha256(bomb))):
            with self.assertRaises(audit.AuditError):
                audit.unpack_verified(self.packed, archive_hash, bomb, decoder_hash)

    def test_output_is_independently_validated(self):
        for body in ("return bytes(25473), {}", "return b'x'*25474, {}",
                     "return bytearray(25474), {}", "return bytes(25474)"):
            source = ("def unpack(data):\n " + body + "\n").encode()
            with self.subTest(body=body), self.assertRaises(audit.AuditError):
                audit.unpack_verified(self.packed, audit.sha256(self.packed),
                                      source, audit.sha256(source))

    def test_maps_bind_order_paths_and_full_contents(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for index in reversed(range(47)):
                (root / f"{index:02}.map").write_bytes(bytes([index])*audit.MAP_SIZE)
            headers, manifest = audit.read_maps(root)
            self.assertEqual(headers[542], 1)
            self.assertEqual(json.loads(manifest)[0][0], "00.map")
            changed = bytearray((root/"00.map").read_bytes())
            changed[-1] = 1
            (root/"00.map").write_bytes(changed)
            new_headers, new_manifest = audit.read_maps(root)
            self.assertEqual(headers, new_headers)
            self.assertNotEqual(manifest, new_manifest)
            (root/"00.map").write_bytes(b"short")
            with self.assertRaises(audit.AuditError):
                audit.read_maps(root)
            (root/"00.map").unlink()
            with self.assertRaises(audit.AuditError):
                audit.read_maps(root)

    def test_cli_inventory_and_required_pins(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            maps = root/"maps"
            maps.mkdir()
            for i in range(47):
                (maps/f"{i:02}.map").write_bytes(bytes(audit.MAP_SIZE))
            (root/"archive").write_bytes(self.packed)
            (root/"decoder.py").write_bytes(self.decoder)
            args = ["--archive", str(root/"archive"), "--maps", str(maps),
                    "--decoder", str(root/"decoder.py")]
            with contextlib.redirect_stdout(io.StringIO()) as output:
                self.assertEqual(audit.main(args+["--identify"]), 0)
            ids = json.loads(output.getvalue())
            with contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(audit.main(args), 2)
            pins = ["--archive-sha256", ids["archive_sha256"],
                    "--maps-sha256", ids["maps_manifest_sha256"],
                    "--decoder-sha256", ids["decoder_sha256"]]
            with contextlib.redirect_stdout(io.StringIO()) as output:
                self.assertEqual(audit.main(args+pins), 0)
            report = json.loads(output.getvalue())
            self.assertTrue(report["comparison"]["byte_identical"])
            self.assertNotIn("synthetic", output.getvalue())

    def test_runtime_raw_and_packed_corroboration(self):
        map_raw = bytes(audit.MAP_SIZE)
        map_other = bytearray(map_raw)
        map_other[260] = 1
        source = b"def unpack(data):\n return bytes(157738), {}\n"
        report = audit.corroborate_runtime_maps(
            [(1, bytes(map_other)), (47, container(map_raw))], self.raw,
            source, audit.sha256(source))
        self.assertEqual(report["header_match_count"], 1)
        self.assertEqual(report["destination_match_count"], 2)
        self.assertEqual(report["maps"][0]["fields"][0]["field"], "locn_info")
        self.assertEqual(report["maps"][1]["storage"], "rnc1")
        map_other[541] = 1
        report = audit.corroborate_runtime_maps([(1, bytes(map_other))], self.raw,
                                               source, audit.sha256(source))
        self.assertFalse(report["maps"][0]["destinations_identical"])
        with self.assertRaises(audit.AuditError):
            audit.corroborate_runtime_maps([(1, b"short")], self.raw, source, audit.sha256(source))

    def test_runtime_manifest_indices_and_contents(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for i in range(1, 42):
                (root/f"{i:02}.map").write_bytes(b"synthetic")
            maps, manifest = audit.read_runtime_maps(root)
            self.assertEqual(maps[0], (1, b"synthetic"))
            self.assertEqual(len(json.loads(manifest)), 41)
            (root/"01.map").rename(root/"1.map")
            _, new_manifest = audit.read_runtime_maps(root)
            self.assertNotEqual(manifest, new_manifest)
            (root/"02.map").rename(root/"01.map")
            with self.assertRaises(audit.AuditError):
                audit.read_runtime_maps(root)
            (root/"01.map").rename(root/"48.map")
            with self.assertRaises(audit.AuditError):
                audit.read_runtime_maps(root)
            (root/"48.map").rename(root/"name.map")
            with self.assertRaises(audit.AuditError):
                audit.read_runtime_maps(root)
            (root/"name.map").unlink()
            with self.assertRaises(audit.AuditError):
                audit.read_runtime_maps(root)


if __name__ == "__main__":
    unittest.main()
