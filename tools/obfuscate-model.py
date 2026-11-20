#!/usr/bin/env python3
"""
Obfuscates 3D model files (.glb / .vrm) so they can't be grabbed with a simple
"Save as" or by opening the URL — the website decodes them in memory.

  python tools/obfuscate-model.py models/glock18D/HighPoly.glb      -> models/glock18D/HighPoly.glb.obf
  python tools/obfuscate-model.py models/characters/*.vrm

Then point the JSON to the new file, e.g.  "src": "models/glock18D/HighPoly.glb.obf"
and do NOT commit the original .glb / .vrm (add it to .gitignore).

IMPORTANT: this is a deterrent, not real protection. Anything a browser can display
can be extracted by someone determined (the decoder is in js/core/viewer3d.js). See README → "Ochrona modeli".
"""
import os, sys, glob

MAGIC = b'MAIPAOBF1'

def obfuscate(data: bytes) -> bytes:
    salt = os.urandom(16)
    out = bytearray(data)
    x = 0x9E3779B9
    for i in range(len(out)):
        x ^= (x << 13) & 0xFFFFFFFF
        x ^= x >> 17
        x ^= (x << 5) & 0xFFFFFFFF
        x &= 0xFFFFFFFF
        out[i] ^= (x ^ salt[i & 15]) & 0xFF
    return MAGIC + salt + bytes(out)

if __name__ == '__main__':
    files = [f for a in sys.argv[1:] for f in glob.glob(a)]
    if not files:
        sys.exit(__doc__)
    for f in files:
        if f.endswith('.obf'):
            continue
        data = open(f, 'rb').read()
        open(f + '.obf', 'wb').write(obfuscate(data))
        print(f'{f} -> {f}.obf  ({len(data) / 1e6:.1f} MB)')
