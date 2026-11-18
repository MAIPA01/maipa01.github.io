#!/usr/bin/env python3
"""
Converts large PNG/JPG images to lightweight WebP copies for the website.

  python tools/optimize-images.py images/renders            # whole folder (recursive)
  python tools/optimize-images.py images/projects/x.png      # single file
  python tools/optimize-images.py images/renders --max 2560 --quality 88

Creates <name>.webp next to every source image (skips files whose .webp is newer).
Keep the originals if you want — the site only references the .webp files.
Requires Pillow:  pip install pillow
"""
import argparse, pathlib, sys
from PIL import Image

p = argparse.ArgumentParser()
p.add_argument('paths', nargs='+')
p.add_argument('--max', type=int, default=1920, help='max width/height in px (default 1920)')
p.add_argument('--quality', type=int, default=85)
p.add_argument('--force', action='store_true')
a = p.parse_args()

exts = {'.png', '.jpg', '.jpeg'}
files = []
for raw in a.paths:
    path = pathlib.Path(raw)
    files += [f for f in path.rglob('*') if f.suffix.lower() in exts] if path.is_dir() else [path]

total_in = total_out = 0
for f in sorted(files):
    out = f.with_suffix('.webp')
    if out.exists() and not a.force and out.stat().st_mtime >= f.stat().st_mtime:
        continue
    im = Image.open(f)
    im.thumbnail((a.max, a.max), Image.LANCZOS)
    has_alpha = im.mode in ('RGBA', 'LA') and im.getextrema()[-1][0] < 255
    im = im.convert('RGBA' if has_alpha else 'RGB')
    im.save(out, 'WEBP', quality=a.quality, method=6)
    total_in += f.stat().st_size; total_out += out.stat().st_size
    print(f'{f}  {f.stat().st_size/1e6:.1f} MB  ->  {out.name}  {out.stat().st_size/1e3:.0f} KB')
if total_in:
    print(f'\nTotal: {total_in/1e6:.1f} MB -> {total_out/1e6:.1f} MB')
