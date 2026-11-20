#!/usr/bin/env python3
"""Generates the PLACEHOLDER pixel-art sprites used by the play mode (characters, coin, car parts, obstacles, upgrade icons).
Replace the PNGs in assets/game/ with your own Aseprite exports (same layout) — see README."""
import sys, pathlib
from PIL import Image
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'assets/game')
(OUT / 'characters').mkdir(parents=True, exist_ok=True)

def rgb(h): h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4)) + (255,)
BASE = {'K': '#141414', 'S': '#f5c9a8', 's': '#d9a383', 'E': '#3b1010'}

CHARS = {
 'maipa-chan': dict(pal={'H': '#d11717', 'h': '#8f0f0f', 'T': '#262626', 'A': '#d11717', 'B': '#2f2f2f', 'X': '#f5c9a8', 'O': '#2a2a2a', 'F': '#1c1c1c'},
                    hair='bob'),
 'remi':       dict(pal={'H': '#a8652a', 'h': '#7a4519', 'T': '#f2f2f2', 'A': '#b5b5b5', 'B': '#22252c', 'X': '#f5c9a8', 'O': '#1f1f1f', 'F': '#f4f4f4'},
                    hair='long'),
 'maipa-senpai': dict(pal={'H': '#1b1b22', 'h': '#33333f', 'T': '#7d1214', 'A': '#d11717', 'B': '#1d2230', 'X': '#1d2230', 'O': '#1d2230', 'F': '#101010'},
                    hair='short'),
}
UPPER = {
 'bob': [
  "......KKKKK.....", ".....KHHHHHKK...", "....KHHHHHHHHK..", "...KHHHHHHHHHHK.",
  "...KHHHHhSSSSHK.", "...KHHHhSSSSESK.", "...KHHHhSSSSESK.", "...KHHHHSSSSSK..",
  "...KHHhKKSSKK...", "...KHhKTTTTTTK..", "...KhKTTATATTTK.", "....KKTTAAATSSK.", ".....KBBBBBBBK.."],
 'long': [
  "......KKKKK.....", ".....KHHHHHKK...", "....KHHHHHHHHK..", "...KHHHHHHHHHHK.",
  "...KHHHHhSSSSHK.", "...KHHHhSSSSESK.", "...KHHHhSSSSESK.", "...KHHHHSSSSSK..",
  "...KHHHKKSSKK...", "..KHHhKTTTTTTK..", "..KHhKTTTATTTTK.", "..KhKKSSSSSSSSK.", "...K.KBBBBBBBK.."],
 'short': [
  ".....KK.KK......", "....KHHKHHKK....", "....KHHHHHHHHK..", "...KHHHHHHHHHHK.",
  "...KHHHHHSSSSHK.", "...KHHHhSSSSESK.", "....KHHSSSSSESK.", "....KKSSSSSSSK..",
  ".....KKKKSSKK...", "....KTTKAAATTK..", "...KTTKAKKAKTTK.", "...KTTKAAAKTSSK.", ".....KBBBBBBBK.."],
}
LEGS = {
 'stand': ["......KXK.KXK...", "......KOK.KOK...", "......FFF.FFFF.."],
 'run1':  [".....KXK..KXK...", "....KOK....KOK..", "....FFF....FFFF."],
 'run2':  ["......KXKKXK....", ".......KOOK.....", ".......FFFFF...."],
 'run3':  ["......KXKKXK....", ".....KOK..KOK...", ".....FFFF.FFF..."],
 'jump':  [".....KXKK.KXK...", "....KOK....KK...", "....FF.........."],
 'fall':  ["....KXK....KXK..", "...KOK......KOK.", "...FF........FF."],
 'climb1':[".....KXK..KXK...", ".....KOK..KOK...", ".....FF....FFF.."],
 'climb2':["......KXK.KXK...", "......KOK.KOK...", "......FFF..FF..."],
}
def compose(kind, pal, leg, dy=0, arm=None):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); px = im.load()
    colors = {**{k: rgb(v) for k, v in BASE.items()}, **{k: rgb(v) for k, v in pal.items()}}
    for y, row in enumerate(LEGS[leg]):
        for x, c in enumerate(row):
            if c != '.': px[x, 13 + y] = colors[c]
    for y, row in enumerate(UPPER[kind]):
        for x, c in enumerate(row):
            if c != '.' and 0 <= y + dy < 16: px[x, y + dy] = colors[c]
    if arm:  # raised arm(s): list of (x, y, colorKey)
        for x, y, c in arm: px[x, y] = colors[c]
    return im
# raised right arm (wave) and arms for climbing
WAVE1 = [(13, 11, 'T'), (14, 11, 'T'), (14, 10, 'T'), (14, 9, 'T'), (15, 8, 'K'), (14, 8, 'S'), (15, 7, 'S'), (14, 7, 'S'), (15, 6, 'K')]
WAVE2 = [(13, 11, 'T'), (14, 11, 'T'), (14, 10, 'T'), (14, 9, 'T'), (14, 8, 'S'), (13, 7, 'S'), (14, 7, 'S'), (13, 6, 'K'), (15, 8, 'K')]
CLIMB1 = [(14, 11, 'T'), (15, 10, 'S'), (15, 9, 'S'), (14, 7, 'T'), (15, 6, 'S'), (15, 5, 'S')]
CLIMB2 = [(14, 11, 'T'), (15, 12, 'S'), (14, 8, 'T'), (15, 7, 'S'), (15, 6, 'S'), (15, 4, 'S')]
SLIDE = [(14, 8, 'T'), (15, 7, 'S'), (15, 6, 'S'), (15, 5, 'K')]

# frame layout (shared by every character):
# 0-1 idle | 2-5 run | 6 jump | 7 fall | 8-9 wave | 10-11 climb | 12 wall slide
for name, c in CHARS.items():
    k, pal = c['hair'], c['pal']
    frames = [compose(k, pal, 'stand'), compose(k, pal, 'stand', 1),
              compose(k, pal, 'run1'), compose(k, pal, 'run2', 1), compose(k, pal, 'run3'), compose(k, pal, 'run2', 1),
              compose(k, pal, 'jump'), compose(k, pal, 'fall'),
              compose(k, pal, 'stand', 0, WAVE1), compose(k, pal, 'stand', 0, WAVE2),
              compose(k, pal, 'climb1', 0, CLIMB1), compose(k, pal, 'climb2', 1, CLIMB2),
              compose(k, pal, 'stand', 0, SLIDE)]
    sheet = Image.new('RGBA', (16 * len(frames), 16))
    for i, f in enumerate(frames): sheet.paste(f, (16 * i, 0))
    sheet.save(OUT / 'characters' / f'{name}.png')

# ---- coin (8x8, 4 frames)
coin = [["..KKKK..", ".KRRRRK.", "KRWRRWRK", "KRWWWWRK", "KRWRRWRK", "KRWRRWRK", ".KRRRRK.", "..KKKK.."],
        ["..KKK...", ".KRRRK..", ".KWRWK..", ".KWWWK..", ".KWRWK..", ".KRRRK..", ".KRRRK..", "..KKK..."],
        ["...KK...", "...KK...", "...KK...", "...KK...", "...KK...", "...KK...", "...KK...", "...KK..."],
        ["...KKK..", "..KRRRK.", "..KWRWK.", "..KWWWK.", "..KWRWK.", "..KRRRK.", "..KRRRK.", "...KKK.."]]
CP = {'K': rgb('#141414'), 'R': rgb('#d11717'), 'W': rgb('#ffffff')}
cs = Image.new('RGBA', (32, 8))
for i, f in enumerate(coin):
    for y, row in enumerate(f):
        for x, ch in enumerate(row):
            if ch != '.': cs.putpixel((8 * i + x, y), CP[ch])
cs.save(OUT / 'coin.png')

# ================= CAR GAME (assets/game/car/) =================
CARDIR = OUT / 'car'
for sub in ('bodies', 'wheels', 'obstacles', 'upgrades'):
    (CARDIR / sub).mkdir(parents=True, exist_ok=True)

def paint(rows, pal, size, at=(0, 0), img=None):
    img = img or Image.new('RGBA', size, (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != '.' and ch in pal:
                img.putpixel((at[0] + x, at[1] + y), pal[ch])
    return img

# Body 32x16 WITHOUT wheels (wheels are separate sprites drawn at "wheelAnchors" from data/game.json).
# Keep the body colours exactly #d11717 (paint) and #8f0f0f (shade) if you want to recolour in code later.
BODY = [
 "................................",
 "................................",
 "................................",
 "..........KKKKKKKKKKKK..........",
 ".........KwWWWWKRKwWWWK.........",
 "........KWWWWWWKRKWWWWWK........",
 "..KKKKKKRRRRRRRRRRRRRRRRRKKKKK..",
 ".KTRRRRRRRRRRRRRRRRRRRRRRRRRRYK.",
 ".KRRRRRRRRRRRRRRRRRRRRRRRRRRRRK.",
 ".KKKrRRRRRRRRRRRRRRRRRRRRRRrKKK.",
 ".KrrKK....KrrrrrrrrrrrKK....KrK.",
 "..KKK......KKKKKKKKKKK......KK..",
]
BODIES = {
  'classic':  {'R': '#d11717', 'r': '#8f0f0f'},
  'midnight': {'R': '#24242a', 'r': '#121216', 'S': '#d11717'},
  'sunset':   {'R': '#ff7a1a', 'r': '#b84f06'},
  'mint':     {'R': '#2ec4a6', 'r': '#1a7d6a'},
}
for name, cols in BODIES.items():
    pal = {k: rgb(v) for k, v in {'K': '#141414', 'W': '#1f2833', 'w': '#4a5b70', 'T': '#ff4a4a', 'Y': '#ffe9a8', **cols}.items()}
    img = paint(BODY, pal, (32, 16), (0, 1))
    if 'S' in cols:  # racing stripe
        for x in range(3, 29): img.putpixel((x, 9), pal['S'])
    img.save(CARDIR / 'bodies' / f'{name}.png')

# Wheels: 8x8 frames, 4-frame rotation strip (32x8). The same animation works for every body.
def wheel(rim, hub):
    pal = {'B': rgb('#111111'), 'G': rgb(rim), 'H': rgb(hub)}
    spokes = [
      ["..BBBB..", ".BBGGBB.", "BBGBBGBB", "BGBHHBGB", "BGBHHBGB", "BBGBBGBB", ".BBGGBB.", "..BBBB.."],
      ["..BBBB..", ".BGBBGB.", "BBBGGBBB", "BBGHHGBB", "BBGHHGBB", "BBBGGBBB", ".BGBBGB.", "..BBBB.."],
      ["..BBBB..", ".BBBGBB.", "BGBGBBBB", "BBGHHBGB", "BGBHHGBB", "BBBBGBGB", ".BBGBBB.", "..BBBB.."],
      ["..BBBB..", ".BBGBBB.", "BBBBGBGB", "BGBHHGBB", "BBGHHBGB", "BGBGBBBB", ".BBBGBB.", "..BBBB.."],
    ]
    strip = Image.new('RGBA', (32, 8), (0, 0, 0, 0))
    for i, f in enumerate(spokes): paint(f, pal, (8, 8), (8 * i, 0), strip)
    return strip
wheel('#9a9a9a', '#5a5a5a').save(CARDIR / 'wheels' / 'standard.png')
wheel('#d11717', '#ffffff').save(CARDIR / 'wheels' / 'sport.png')
wheel('#e8b923', '#fff1a8').save(CARDIR / 'wheels' / 'gold.png')

# Obstacles
OP = {'K': rgb('#141414'), 'O': rgb('#ff7a1a'), 'W': rgb('#ffffff'), 'R': rgb('#d11717'), 'G': rgb('#4d4c4d'),
      'D': rgb('#1a1a1a'), 'd': rgb('#3a3a3a'), 'Y': rgb('#ffd23f'), 'B': rgb('#2b2b33'), 'L': rgb('#6fc3ff')}
CONE = ["...OO...", "..WWWW..", "..OOOO..", ".WWWWWW.", ".OOOOOO.", ".WWWWWW.", "OOOOOOOO", "OOOOOOOO", "KKKKKKKK", "KKKKKKKK"]
paint(CONE, OP, (8, 10)).save(CARDIR / 'obstacles' / 'cone.png')
cones = Image.new('RGBA', (20, 10), (0, 0, 0, 0)); paint(CONE, OP, (20, 10), (0, 0), cones); paint(CONE, OP, (20, 10), (12, 0), cones)
cones.save(CARDIR / 'obstacles' / 'cones.png')
BARRIER = ["KKKKKKKKKKKKKKKKKK", "RRRWWWRRRWWWRRRWWW", "RRRWWWRRRWWWRRRWWW", "RRRWWWRRRWWWRRRWWW", "KKKKKKKKKKKKKKKKKK",
           "..GG..........GG..", "..GG..........GG..", "..GG..........GG..", ".GGGG........GGGG."]
paint(BARRIER, OP, (18, 9)).save(CARDIR / 'obstacles' / 'barrier.png')
TIRE = ["DDDDDDDDDD", "DddddddddD", "DdDDDDDDdD", "DDDDDDDDDD"]
tires = Image.new('RGBA', (10, 14), (0, 0, 0, 0))
for i in range(3): paint(TIRE, OP, (10, 14), (0, i * 5), tires)
tires.save(CARDIR / 'obstacles' / 'tires.png')
# flying drone: 16x8, 2 frames (rotors)
DRONE = [
  ["KKKKK....KKKKK..", "..K........K....", "..KKKKKKKKKK....", ".KBBBBBBBBBBK...", ".KBRBLLLLBRBK...", ".KBBBBBBBBBBK...", "..KK......KK....", "................"],
  ["..KKKKK....KKKKK", "..K........K....", "..KKKKKKKKKK....", ".KBBBBBBBBBBK...", ".KBRBLLLLBRBK...", ".KBBBBBBBBBBK...", "..KK......KK....", "................"],
]
drone = Image.new('RGBA', (32, 8), (0, 0, 0, 0))
for i, f in enumerate(DRONE): paint(f, OP, (16, 8), (16 * i, 0), drone)
drone.save(CARDIR / 'obstacles' / 'drone.png')
# ramp: 24x10 wedge rising to the right
ramp = Image.new('RGBA', (24, 10), (0, 0, 0, 0))
for x in range(24):
    h = max(1, round((x + 1) * 10 / 24))
    for y in range(10 - h, 10):
        c = 'K' if (y == 10 - h or x == 23 or y == 9) else ('Y' if ((x + y) // 3) % 2 == 0 else 'K')
        ramp.putpixel((x, y), OP[c])
ramp.save(CARDIR / 'obstacles' / 'ramp.png')

# Upgrade icons 16x16
UP = {'K': rgb('#141414'), 'R': rgb('#d11717'), 'W': rgb('#ffffff'), 'G': rgb('#9a9a9a'), 'B': rgb('#6fc3ff'), 'Y': rgb('#ffd23f')}
SPRINGS = ["................", "...KKKKKKKKKK...", "...KGGGGGGGGK...", "....KKKKKKKK....", "...KGGGGGGGGK...", "....KKKKKKKK....",
           "...KGGGGGGGGK...", "....KKKKKKKK....", "...KGGGGGGGGK...", "....KKKKKKKK....", "...KGGGGGGGGK...", "...KKKKKKKKKK...",
           "...KRRRRRRRRK...", "...KKKKKKKKKK...", "................", "................"]
NITRO = ["......KKKK......", ".....KWWWWK.....", "......KKKK......", ".....KRRRRK.....", "....KRRRRRRK....", "....KRWRRRRK....",
         "....KRWRRRRK....", "....KRRRRRRK....", "....KRRRRRRK....", "....KRRRRRRK....", "....KRRRRRRK....", "....KKKKKKKK....",
         ".....KYYYYK.....", "......KYYK......", ".......KK.......", "................"]
CAGE = ["................", "..KKKKKKKKKKKK..", ".KGGGGGGGGGGGGK.", ".KGKKKKGKKKKKGK.", ".KGK..KGK...KGK.", ".KGK.KGGGK..KGK.",
        ".KGKKG...GK.KGK.", ".KGGK.....KGGGK.", ".KGK.......KGK..", ".KGK.......KGK..", ".KGK.......KGK..", ".KKK.......KKK..",
        "................", "................", "................", "................"]
paint(SPRINGS, UP, (16, 16)).save(CARDIR / 'upgrades' / 'springs.png')
paint(NITRO, UP, (16, 16)).save(CARDIR / 'upgrades' / 'doubleJump.png')
paint(CAGE, UP, (16, 16)).save(CARDIR / 'upgrades' / 'shield.png')

print('sprites written to', OUT)
