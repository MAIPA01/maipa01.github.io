#!/usr/bin/env python3
"""Generates the PLACEHOLDER pixel-art sprite sheets used by the play mode.
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

# ---- car (32x16, 2 frames: wheels rotate)
CAR = [
 "................................",
 "................................",
 "..........KKKKKKKKKKKK..........",
 ".........KwWWWWKRKwWWWK.........",
 "........KWWWWWWKRKWWWWWK........",
 "..KKKKKKRRRRRRRRRRRRRRRRRKKKKK..",
 ".KTRRRRRRRRRRRRRRRRRRRRRRRRRRYK.",
 ".KRRRRRRRRRRRRRRRRRRRRRRRRRRRRK.",
 ".KKKrRRRRRRRRRRRRRRRRRRRRRRrKKK.",
 ".KrrKKKKKrrrrrrrrrrrrrKKKKKrrrK.",
 "..KKK....KKKKKKKKKKKKK.....KKK..",
]
WHEEL = [["..BBBB..", ".BGBBGB.", ".BBGGBB.", ".BGBBGB.", "..BBBB.."],
         ["..BBBB..", ".BBGGBB.", ".BGBBGB.", ".BBGGBB.", "..BBBB.."]]
CC = {'K': rgb('#141414'), 'R': rgb('#d11717'), 'r': rgb('#8f0f0f'), 'W': rgb('#1f2833'), 'w': rgb('#4a5b70'),
      'T': rgb('#ff4a4a'), 'Y': rgb('#ffe9a8'), 'B': rgb('#111111'), 'G': rgb('#9a9a9a')}
car = Image.new('RGBA', (64, 16))
for f in range(2):
    for y, row in enumerate(CAR):
        for x, ch in enumerate(row):
            if ch != '.': car.putpixel((32 * f + x, y + 1), CC[ch])
    for wx in (4, 20):
        for y, row in enumerate(WHEEL[f]):
            for x, ch in enumerate(row):
                if ch != '.': car.putpixel((32 * f + wx + x, 10 + y), CC[ch])
car.save(OUT / 'car.png')
print('sprites written to', OUT)
