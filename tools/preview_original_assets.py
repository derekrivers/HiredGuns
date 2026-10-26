"""Validate an explicitly supplied indexed image and emit a network-free HTML proof.

This generic viewer never extracts original formats. Source bytes are read only to
verify declared SHA-256 identities; correspondence is the adapter's evidence.
"""
import argparse
import base64
import hashlib
import html
import json
from pathlib import Path
import re
import struct
import zlib

MAX_BYTES = 8 * 1024 * 1024
MAX_PIXELS = 262144


def keys(value, expected, label):
    if type(value) is not dict or set(value) != set(expected):
        raise ValueError(f'{label}: unexpected or missing fields')


def label(value):
    if (type(value) is not str or not 1 <= len(value) <= 500
            or any(ord(c) < 32 or ord(c) == 127 for c in value)):
        raise ValueError('invalid evidence/identity string')
    return value


def integer(value, low, high):
    if type(value) is not int or not low <= value <= high:
        raise ValueError('integer out of bounds')
    return value


def validate(data, sources):
    """Return RGBA bytes after structural and actual source identity validation."""
    keys(data, ('schemaVersion', 'sources', 'image'), 'root')
    if type(data['schemaVersion']) is not int or data['schemaVersion'] != 1:
        raise ValueError('unsupported schema version')
    declared = data['sources']
    if type(declared) is not list or not 1 <= len(declared) <= 16:
        raise ValueError('invalid sources')
    identities = {}
    for source in declared:
        keys(source, ('id', 'sha256'), 'source')
        sid = label(source['id'])
        digest = source['sha256']
        if sid in identities or type(digest) is not str or not re.fullmatch('[0-9a-f]{64}', digest):
            raise ValueError('duplicate source or invalid digest')
        identities[sid] = digest
    if set(sources) != set(identities):
        raise ValueError('supply exactly one actual file for every declared source ID')
    for sid, digest in identities.items():
        if hashlib.sha256(Path(sources[sid]).read_bytes()).hexdigest() != digest:
            raise ValueError(f'source hash mismatch: {sid}')
    image = data['image']
    keys(image, ('sourceId', 'width', 'height', 'palette', 'indices', 'alpha',
                 'paletteSourceId', 'paletteEvidence', 'layoutEvidence', 'frame', 'direction'), 'image')
    for field in ('sourceId', 'paletteSourceId'):
        if image[field] not in identities:
            raise ValueError('unknown source reference')
    for field in ('paletteEvidence', 'layoutEvidence', 'frame', 'direction'):
        label(image[field])
    width = integer(image['width'], 1, 1024)
    height = integer(image['height'], 1, 1024)
    count = width * height
    if count > MAX_PIXELS:
        raise ValueError('pixel limit exceeded')
    palette = image['palette']
    if type(palette) is not list or not 1 <= len(palette) <= 256:
        raise ValueError('invalid palette')
    for rgb in palette:
        if type(rgb) is not list or len(rgb) != 3:
            raise ValueError('palette must be RGB triples')
        for channel in rgb:
            integer(channel, 0, 255)
    indices = image['indices']
    if type(indices) is not list or len(indices) != count:
        raise ValueError('index length mismatch')
    for index in indices:
        integer(index, 0, len(palette) - 1)
    alpha = image['alpha']
    keys(alpha, ('mode', 'sourceId', 'evidence', 'values'), 'alpha')
    if alpha['sourceId'] not in identities:
        raise ValueError('unknown alpha source')
    label(alpha['evidence'])
    if alpha['mode'] == 'opaque':
        if alpha['values'] is not None:
            raise ValueError('opaque alpha must have null values')
        opacity = [255] * count
    elif alpha['mode'] == 'mask':
        opacity = alpha['values']
        if type(opacity) is not list or len(opacity) != count:
            raise ValueError('mask length mismatch')
        for value in opacity:
            integer(value, 0, 255)
            if value not in (0, 255):
                raise ValueError('mask must be binary 0/255')
    else:
        raise ValueError('unverified/unsupported alpha')
    return bytes(channel for index, a in zip(indices, opacity)
                 for channel in (*palette[index], a))


def png(width, height, rgba):
    def chunk(tag, payload):
        return struct.pack('>I', len(payload)) + tag + payload + struct.pack('>I', zlib.crc32(tag + payload))
    rows = b''.join(b'\0' + rgba[y * width * 4:(y + 1) * width * 4] for y in range(height))
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(rows)) + chunk(b'IEND', b''))


def render(data, sources):
    rgba = validate(data, sources)
    image = data['image']
    width, height = image['width'], image['height']
    url = 'data:image/png;base64,' + base64.b64encode(png(width, height, rgba)).decode('ascii')
    style = '''body{margin:32px;background:#171a1c;color:#e4e7e8;font:16px system-ui;line-height:1.5}main{max-width:1100px}h1{font-size:26px}section{display:flex;flex-wrap:wrap;gap:24px}article{padding:24px;background:#25282a;border:1px solid #666}img{display:block;image-rendering:pixelated;max-width:none}figure{margin:18px 0;overflow:auto;background:#303030;width:max-content;max-width:100%}.enhanced{border-color:#a5acb1;background:radial-gradient(ellipse at top,#354149,#25282a 70%);box-shadow:0 6px 18px #0004}.enhanced figure{outline:1px solid #939b9f;outline-offset:8px}small{color:#c4cbcf}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px monospace}'''
    shash = base64.b64encode(hashlib.sha256(style.encode()).digest()).decode()
    def picture(scale, name):
        return f'<figure><img alt="{name}" width="{width * scale}" height="{height * scale}" src="{url}"></figure>'
    evidence = {'sources': data['sources'], 'dimensions': [width, height],
                'frame': image['frame'], 'direction': image['direction'],
                'layoutEvidence': image['layoutEvidence'], 'paletteEvidence': image['paletteEvidence'],
                'alpha': {k: v for k, v in image['alpha'].items() if k != 'values'},
                'rgbaSha256': hashlib.sha256(rgba).hexdigest()}
    return f'''<!doctype html><html lang="en"><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'sha256-{shash}'; base-uri 'none'; form-action 'none'; connect-src 'none'">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Original indexed asset proof</title>
<style>{style}</style><main><h1>Original indexed asset proof</h1>
<p>Verified input identities • explicit palette and alpha • fixed integer proportions</p>
<section><article><h2>Original — neutral</h2><small>Native 1× · {width} × {height}</small>{picture(1, 'Original at native scale')}<small>Integer 6×</small>{picture(6, 'Original at integer scale')}</article>
<article class="enhanced"><h2>Optional presentation enhancement</h2><small>Same pixels at 6× · surrounding frame and lighting only</small>{picture(6, 'Unchanged original with enhanced surrounding presentation')}</article></section>
<p>Source-derived proof; extraction claims require adapter review. No emulator/display colorimetry parity is asserted.</p>
<details open><summary>Source identities and evidence</summary><pre>{html.escape(json.dumps(evidence, indent=2, ensure_ascii=True))}</pre></details></main></html>'''


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('duplicate JSON key')
        result[key] = value
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('--source', action='append', default=[], metavar='ID=PATH')
    parser.add_argument('--out', required=True, type=Path)
    args = parser.parse_args()
    try:
        if args.input.stat().st_size > MAX_BYTES:
            raise ValueError('JSON byte limit exceeded')
        data = json.loads(args.input.read_text(encoding='utf-8'), object_pairs_hook=unique_object,
                          parse_constant=lambda value: (_ for _ in ()).throw(ValueError('non-finite JSON number')))
        sources = {}
        for item in args.source:
            sid, path = item.split('=', 1)
            if sid in sources:
                raise ValueError('duplicate supplied source')
            sources[sid] = path
        output = render(data, sources)
        private_root = (Path.cwd() / '.local' / 'asset-proof').resolve()
        if not args.out.resolve().is_relative_to(private_root):
            raise ValueError('output must remain under this worktree .local/asset-proof/')
        args.out.parent.mkdir(parents=True, exist_ok=True)
        with args.out.open('x', encoding='utf-8', newline='\n') as handle:
            handle.write(output)
        print(f'Validated local preview: {args.out.resolve()}')
    except (ValueError, TypeError, KeyError, OSError, RecursionError) as error:
        parser.exit(2, f'Rejected: {error}\n')


if __name__ == '__main__':
    main()
