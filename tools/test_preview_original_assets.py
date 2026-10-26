"""Synthetic-only contract checks for the offline indexed-image viewer."""
import copy
import hashlib
import json
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest
import zlib

from preview_original_assets import png, render, unique_object, validate


class PreviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        path = Path(self.temp.name) / 'authored.bin'
        path.write_bytes(b'authored synthetic source')
        self.sources = {'synthetic': path}
        self.data = {
            'schemaVersion': 1,
            'sources': [{'id': 'synthetic', 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}],
            'image': {'sourceId': 'synthetic', 'width': 2, 'height': 1,
                      'palette': [[1, 2, 3], [240, 230, 220]], 'indices': [0, 1],
                      'paletteSourceId': 'synthetic', 'paletteEvidence': 'Authored RGB triples',
                      'layoutEvidence': 'Authored two-pixel row', 'frame': 'still', 'direction': 'front',
                      'alpha': {'mode': 'mask', 'sourceId': 'synthetic',
                                'evidence': 'Explicit authored mask', 'values': [255, 0]}}}

    def test_zero_index_can_be_opaque(self):
        self.assertEqual(validate(self.data, self.sources), bytes([1, 2, 3, 255, 240, 230, 220, 0]))

    def test_explicit_opaque(self):
        self.data['image']['alpha'].update(mode='opaque', values=None)
        self.assertEqual(validate(self.data, self.sources)[3::4], bytes([255, 255]))

    def test_png_preserves_rgba_and_dimensions(self):
        raw = validate(self.data, self.sources)
        encoded = png(2, 1, raw)
        self.assertEqual(struct.unpack('>II', encoded[16:24]), (2, 1))
        pos = 8
        compressed = b''
        while pos < len(encoded):
            size = struct.unpack('>I', encoded[pos:pos+4])[0]
            tag = encoded[pos+4:pos+8]
            payload = encoded[pos+8:pos+8+size]
            self.assertEqual(zlib.crc32(tag + payload), struct.unpack('>I', encoded[pos+8+size:pos+12+size])[0])
            if tag == b'IDAT':
                compressed += payload
            pos += size + 12
        self.assertEqual(zlib.decompress(compressed), b'\0' + raw)

    def test_malformed_contracts_reject(self):
        mutations = [
            ('schemaVersion', True), ('schemaVersion', 2), ('extra', 1),
            ('image.width', 0), ('image.width', True), ('image.height', 1025),
            ('image.width', 1024), ('image.indices', [0]), ('image.indices', [0, 2]),
            ('image.indices', [False, 1]), ('image.indices', [0, -1]),
            ('image.palette', []), ('image.palette', [[0, 1]]),
            ('image.palette', [[0, 1, 256]]), ('image.palette', [[True, 1, 2]]),
            ('image.alpha.mode', 'unknown'), ('image.alpha.values', [255]),
            ('image.alpha.values', [255, 128]), ('image.alpha.values', [255, True]),
            ('image.alpha.sourceId', 'absent'), ('image.paletteSourceId', 'absent'),
            ('image.sourceId', 'absent'), ('image.paletteEvidence', ''),
            ('image.layoutEvidence', None), ('image.frame', ''), ('image.direction', '\n'),
            ('sources', []), ('sources', [{'id': 'synthetic', 'sha256': '0' * 64}]),
            ('sources', self.data['sources'] * 2),
        ]
        for dotted, value in mutations:
            with self.subTest(field=dotted, value=value):
                data = copy.deepcopy(self.data)
                target = data
                parts = dotted.split('.')
                for key in parts[:-1]:
                    target = target[key]
                target[parts[-1]] = value
                with self.assertRaises(ValueError):
                    validate(data, self.sources)

    def test_pixel_limit(self):
        self.data['image'].update(width=1024, height=1024)
        with self.assertRaisesRegex(ValueError, 'pixel limit'):
            validate(self.data, self.sources)

    def test_missing_or_additional_source(self):
        for sources in ({}, dict(self.sources, other=self.sources['synthetic'])):
            with self.assertRaises(ValueError):
                validate(self.data, sources)

    def test_changed_actual_bytes_reject(self):
        self.sources['synthetic'].write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError, 'hash mismatch'):
            validate(self.data, self.sources)

    def test_opaque_does_not_accept_mask(self):
        self.data['image']['alpha']['mode'] = 'opaque'
        with self.assertRaises(ValueError):
            validate(self.data, self.sources)

    def test_duplicate_json_key_rejected(self):
        with self.assertRaises(ValueError):
            json.loads('{"x":1,"x":2}', object_pairs_hook=unique_object)

    def test_cli_rejects_bad_input_without_creating_output(self):
        root = Path(self.temp.name)
        source = root / 'input.json'
        output = root / '.local/asset-proof/index.html'
        source.write_text(json.dumps(self.data), encoding='utf-8')
        command = [sys.executable, str(Path(__file__).with_name('preview_original_assets.py')),
                   str(source), '--source', f"synthetic={self.sources['synthetic']}", '--out', str(output)]
        self.sources['synthetic'].write_bytes(b'wrong bytes')
        result = subprocess.run(command, cwd=root, capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn('hash mismatch', result.stderr)
        self.assertFalse(output.exists())

    def test_cli_private_output_and_no_overwrite(self):
        root = Path(self.temp.name)
        source = root / 'input.json'
        output = root / '.local/asset-proof/index.html'
        source.write_text(json.dumps(self.data), encoding='utf-8')
        command = [sys.executable, str(Path(__file__).with_name('preview_original_assets.py')),
                   str(source), '--source', f"synthetic={self.sources['synthetic']}", '--out']
        outside = subprocess.run(command + [str(root / 'public.html')], cwd=root, capture_output=True)
        self.assertEqual(outside.returncode, 2)
        first = subprocess.run(command + [str(output)], cwd=root, capture_output=True)
        self.assertEqual(first.returncode, 0, first.stderr)
        before = output.read_bytes()
        second = subprocess.run(command + [str(output)], cwd=root, capture_output=True)
        self.assertEqual(second.returncode, 2)
        self.assertEqual(output.read_bytes(), before)

    def test_html_is_deterministic_inert_and_escaped(self):
        self.data['image']['frame'] = '</pre><script>alert(1)</script>'
        first = render(self.data, self.sources)
        self.assertEqual(first, render(copy.deepcopy(self.data), self.sources))
        self.assertNotIn('<script>', first)
        self.assertIn('&lt;script&gt;', first)
        self.assertIn("default-src 'none'", first)
        self.assertIn("connect-src 'none'", first)
        self.assertEqual(first.count('data:image/png;base64,'), 3)
        self.assertIn('width="12" height="6"', first)


if __name__ == '__main__':
    unittest.main()
