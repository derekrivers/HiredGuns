"""Offline location-table comparison; never activates campaign travel.

All offsets are zero based, spans are half open. No original bytes or decoded
strings are emitted. The decoder is a separately supplied, hash-pinned local
Python file exporting unpack(bytes) -> (bytes, metadata); it is trusted code.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys
import types

RECORD_SIZE = 542
MAP_SIZE = 157738
RECORD_COUNT = 47
# Equates.i world-map record layout, independently present in OCS and CD32.
FIELD_SIZES = (
    ("locn_x", 2), ("locn_y", 2), ("locn_hit_width", 2),
    ("locn_hit_height", 2), ("locn_players", 1), ("locn_type_flag", 1),
    ("locn_legend", 51), ("locn_legend2", 132), ("locn_legend3", 67),
    ("locn_info", 265), ("locn_disk", 1), ("locn_map_num", 1),
    ("locn_picture_num", 1), ("locn_music_num", 1), ("locn_atmos", 1),
    ("locn_mons1", 1), ("locn_mons2", 1), ("locn_sky", 1),
    ("locn_style", 1), ("locn_destinations", 8),
)


class AuditError(ValueError):
    """An identity, container, or record-layout check failed."""


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def crc16(data: bytes) -> int:
    """RNC CRC-16, reflected polynomial 0xa001, initial value zero."""
    crc = 0
    for byte in data:
        crc ^= byte
        for _ in range(8):
            crc = (crc >> 1) ^ (0xa001 if crc & 1 else 0)
    return crc


def check_identity(data: bytes, expected: str, label: str) -> None:
    if len(expected) != 64 or any(c not in "0123456789abcdef" for c in expected):
        raise AuditError(f"{label}: expected lowercase SHA-256 required")
    if sha256(data) != expected:
        raise AuditError(f"{label}: SHA-256 identity mismatch")


def read_maps(root: Path) -> tuple[bytes, bytes]:
    """Return headers and identity manifest. Sort matches catalogue_campaign.py.

    Manifest identity binds relative POSIX paths AND complete map-file hashes.
    JSON uses ASCII escapes, compact separators, no trailing newline.
    """
    files = sorted(root.rglob("*.map"))
    if len(files) != RECORD_COUNT:
        raise AuditError(f"expected exactly {RECORD_COUNT} editor maps")
    manifest = []
    headers = []
    for path in files:
        data = path.read_bytes()
        if len(data) != MAP_SIZE:
            raise AuditError("editor map length mismatch")
        manifest.append([path.relative_to(root).as_posix(), sha256(data)])
        headers.append(data[:RECORD_SIZE])
    return b"".join(headers), json.dumps(manifest, separators=(",", ":")).encode("ascii")


def parse_rnc(data: bytes, expected_length: int = RECORD_SIZE * RECORD_COUNT) -> dict:
    if len(data) < 18 or data[:4] != b"RNC\x01":
        raise AuditError("expected complete RNC method-1 header")
    header = {
        "unpacked_length": int.from_bytes(data[4:8], "big"),
        "packed_length": int.from_bytes(data[8:12], "big"),
        "unpacked_crc16": int.from_bytes(data[12:14], "big"),
        "packed_crc16": int.from_bytes(data[14:16], "big"),
        "leeway": data[16], "chunks": data[17],
    }
    if header["unpacked_length"] != expected_length:
        raise AuditError("RNC unpacked length does not match expected structure")
    if header["packed_length"] == 0 or len(data) != 18 + header["packed_length"]:
        raise AuditError("RNC packed length mismatch (including trailing bytes)")
    if crc16(data[18:]) != header["packed_crc16"]:
        raise AuditError("RNC packed payload CRC mismatch")
    return header


def validate_unpacked(raw: bytes, header: dict) -> None:
    if type(raw) is not bytes:
        raise AuditError("decoder must return bytes")
    if len(raw) != header["unpacked_length"]:
        raise AuditError("decoder output length mismatch")
    if crc16(raw) != header["unpacked_crc16"]:
        raise AuditError("decoder output CRC mismatch")


def unpack_verified(data: bytes, archive_hash: str, decoder: bytes,
                    decoder_hash: str,
                    expected_length: int = RECORD_SIZE * RECORD_COUNT) -> tuple[bytes, dict]:
    # Every input identity and packed-container check precedes decoder execution.
    check_identity(data, archive_hash, "archive")
    check_identity(decoder, decoder_hash, "decoder")
    header = parse_rnc(data, expected_length)
    module = types.ModuleType("_local_location_decoder")
    module.__file__ = "<hash-verified-local-decoder>"
    exec(compile(decoder, module.__file__, "exec"), module.__dict__)
    result = module.unpack(data)
    if not isinstance(result, tuple) or len(result) != 2:
        raise AuditError("decoder must return (bytes, metadata)")
    raw, _metadata = result
    validate_unpacked(raw, header)
    return raw, header


def changed_spans(left: bytes, right: bytes) -> list[list[int]]:
    spans = []
    start = None
    for offset, (a, b) in enumerate(zip(left, right)):
        if a != b and start is None:
            start = offset
        if a == b and start is not None:
            spans.append([start, offset])
            start = None
    if start is not None:
        spans.append([start, len(left)])
    return spans


def compare_records(editor: bytes, runtime: bytes, count: int = RECORD_COUNT) -> dict:
    expected = count * RECORD_SIZE
    if len(editor) != expected or len(runtime) != expected:
        raise AuditError("comparison requires two exact count-by-542-byte tables")
    if sum(size for _, size in FIELD_SIZES) != RECORD_SIZE:
        raise AuditError("field layout does not cover exact record")
    records = []
    for index in range(count):
        base = index * RECORD_SIZE
        left = editor[base:base + RECORD_SIZE]
        right = runtime[base:base + RECORD_SIZE]
        fields = []
        offset = 0
        for name, size in FIELD_SIZES:
            end = offset + size
            spans = changed_spans(left[offset:end], right[offset:end])
            if spans:
                fields.append({"field": name, "field_span": [offset, end],
                               "changed_spans": [[offset + a, offset + b] for a, b in spans],
                               "changed_bytes": sum(b - a for a, b in spans)})
            offset = end
        if fields:
            records.append({"record_one_based": index + 1,
                            "table_span": [base, base + RECORD_SIZE], "fields": fields})
    return {"byte_identical": editor == runtime,
            "changed_record_count": len(records),
            "changed_byte_count": sum(f["changed_bytes"] for r in records for f in r["fields"]),
            "records": records}


def read_runtime_maps(root: Path) -> tuple[list[tuple[int, bytes]], bytes]:
    files = sorted(root.rglob("*.map"))
    if len(files) != 41:
        raise AuditError("expected exactly 41 runtime maps")
    seen = set()
    maps = []
    manifest = []
    for path in files:
        if not path.stem.isascii() or not path.stem.isdecimal():
            raise AuditError("runtime map filenames must be numeric record indices")
        index = int(path.stem)
        if not 1 <= index <= RECORD_COUNT or index in seen:
            raise AuditError("runtime map record index invalid or duplicate")
        seen.add(index)
        data = path.read_bytes()
        maps.append((index, data))
        manifest.append([path.relative_to(root).as_posix(), sha256(data)])
    return maps, json.dumps(manifest, separators=(",", ":")).encode("ascii")


def corroborate_runtime_maps(maps: list[tuple[int, bytes]], table: bytes,
                             decoder: bytes, decoder_hash: str) -> dict:
    rows = []
    for index, data in maps:
        if len(data) == MAP_SIZE and data[:4] != b"RNC\x01":
            raw = data
            storage = "raw"
        else:
            raw, _ = unpack_verified(data, sha256(data), decoder, decoder_hash, MAP_SIZE)
            storage = "rnc1"
        header = table[(index - 1)*RECORD_SIZE:index*RECORD_SIZE]
        comparison = compare_records(header, raw[:RECORD_SIZE], count=1)
        rows.append({"record_one_based": index, "storage": storage,
                     "header_identical": comparison["byte_identical"],
                     "destinations_identical": header[534:542] == raw[534:542],
                     "changed_byte_count": comparison["changed_byte_count"],
                     "fields": comparison["records"][0]["fields"] if comparison["records"] else []})
    return {"map_count": len(rows), "header_match_count": sum(r["header_identical"] for r in rows),
            "destination_match_count": sum(r["destinations_identical"] for r in rows), "maps": rows}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, required=True)
    parser.add_argument("--maps", type=Path, required=True, help="editor Maps/Game directory")
    parser.add_argument("--decoder", type=Path, required=True)
    parser.add_argument("--identify", action="store_true", help="hash inputs only; does not establish authority")
    parser.add_argument("--archive-sha256")
    parser.add_argument("--maps-sha256", help="SHA-256 of ordered full-file manifest")
    parser.add_argument("--decoder-sha256")
    parser.add_argument("--runtime-maps", type=Path, help="optional archived runtime Maps directory")
    parser.add_argument("--runtime-maps-sha256", help="ordered full-file manifest identity")
    args = parser.parse_args(argv)
    try:
        archive = args.archive.read_bytes()
        decoder = args.decoder.read_bytes()
        editor, manifest = read_maps(args.maps)
        identities = {"archive_sha256": sha256(archive), "decoder_sha256": sha256(decoder),
                      "maps_manifest_sha256": sha256(manifest)}
        runtime_maps = None
        if args.runtime_maps:
            runtime_maps, runtime_manifest = read_runtime_maps(args.runtime_maps)
            identities["runtime_maps_manifest_sha256"] = sha256(runtime_manifest)
        if args.identify:
            report = {"mode": "identity-inventory-only", **identities}
        else:
            if not all((args.archive_sha256, args.maps_sha256, args.decoder_sha256)):
                raise AuditError("all three identity pins required; inventory with --identify first")
            check_identity(manifest, args.maps_sha256, "maps manifest")
            if runtime_maps is not None:
                if not args.runtime_maps_sha256:
                    raise AuditError("runtime map manifest identity pin required")
                check_identity(runtime_manifest, args.runtime_maps_sha256, "runtime maps manifest")
            runtime, header = unpack_verified(archive, args.archive_sha256,
                                              decoder, args.decoder_sha256)
            report = {"schema_version": 1, "offsets": "zero-based, half-open; field spans relative to record",
                      "authority": "diagnostic comparison only; campaign travel remains disabled",
                      **identities, "record_count": RECORD_COUNT, "record_size": RECORD_SIZE,
                      "editor_sha256": sha256(editor), "runtime_sha256": sha256(runtime),
                      "editor_crc16": f"{crc16(editor):04x}",
                      "runtime_crc16": f"{crc16(runtime):04x}", "rnc_header": header,
                      "comparison": compare_records(editor, runtime)}
            if runtime_maps is not None:
                report["runtime_map_corroboration"] = corroborate_runtime_maps(
                    runtime_maps, runtime, decoder, args.decoder_sha256)
        print(json.dumps(report, indent=2))
        return 0
    except Exception as exc:
        # Decoder exception text could contain original strings; keep errors generic.
        message = str(exc) if isinstance(exc, AuditError) else type(exc).__name__
        print(f"location audit failed: {message}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
