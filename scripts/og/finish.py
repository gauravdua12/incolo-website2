#!/usr/bin/env python3
"""Turn the 2x render into the published preview image.

Downscales 2400x1260 -> 1200x630 with Lanczos (crisper text edges than rendering at 1x)
and saves JPEG with 4:4:4 chroma (no colour subsampling), which keeps thin blue text sharp.
Usage: python3 scripts/og/finish.py <render.png> <out.jpg>
"""
import os
import sys
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
if im.size != (1200, 630):
    im = im.resize((1200, 630), Image.LANCZOS)
im.save(out, 'JPEG', quality=92, subsampling=0, optimize=True, progressive=True)
size = os.path.getsize(out)
print(f'{out}: {im.size[0]}x{im.size[1]}, {size // 1024} KB')
if size > 300 * 1024:
    sys.exit('Too large for reliable WhatsApp previews (keep under ~300 KB)')
