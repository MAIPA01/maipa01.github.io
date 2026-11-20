#!/usr/bin/env python3
"""Checks data/*.json against schemas/*.schema.json and cross-references (team/person/related ids).
   pip install jsonschema referencing      then:   python tools/validate-data.py"""
import json, pathlib, sys
from jsonschema import Draft7Validator
from referencing import Registry, Resource

root = pathlib.Path(__file__).resolve().parent.parent
schemas = {p.name: json.loads(p.read_text(encoding='utf-8')) for p in (root / 'schemas').glob('*.json')}
registry = Registry().with_resources([(name, Resource.from_contents(s)) for name, s in schemas.items()])
pairs = {'projects': 'projects', 'teams': 'teams', 'people': 'people', 'characters': 'characters',
         'socials': 'socials', 'profile': 'profile', 'game': 'game', 'i18n/languages': 'languages'}
errors = 0
data = {}
for f, s in pairs.items():
    d = json.loads((root / 'data' / f'{f}.json').read_text(encoding='utf-8'))
    data[f] = d
    for e in sorted(Draft7Validator(schemas[f'{s}.schema.json'], registry=registry).iter_errors(d), key=lambda e: list(e.path)):
        errors += 1
        print(f'data/{f}.json  {"/".join(map(str, e.path))}:  {e.message[:160]}')
# cross references
people = {p['id'] for p in data['people']['people']}
teams = {t['id']: t for t in data['teams']['teams']}
projects = {p['id'] for p in data['projects']['projects']}
for t in teams.values():
    for img in (t.get('logo'), t.get('banner')):
        if img and not (root / img).exists(): errors += 1; print(f'teams: {t["id"]} → missing file {img}')
    for m in t.get('members', []):
        if m not in people: errors += 1; print(f'teams: {t["id"]} → unknown person "{m}"')
for p in data['projects']['projects']:
    tm = p.get('team')
    if tm:
        if tm['id'] not in teams: errors += 1; print(f'projects: {p["id"]} → unknown team "{tm["id"]}"')
        if tm.get('logo') and not (root / tm['logo']).exists(): errors += 1; print(f'projects: {p["id"]} → missing team logo {tm["logo"]}')
        for m in tm.get('members', []):
            if m['person'] not in people: errors += 1; print(f'projects: {p["id"]} → unknown person "{m["person"]}"')
    for r in p.get('related', []):
        if r not in projects: errors += 1; print(f'projects: {p["id"]} → unknown related project "{r}"')
    for img in [p.get('icon'), p.get('banner')] + [g.get('src') for g in p.get('gallery', [])] + [v['src'] for g in p.get('gallery', []) for v in g.get('variants', [])]:
        if img and not (root / img).exists(): errors += 1; print(f'projects: {p["id"]} → missing file {img}')
print('OK — no problems found' if not errors else f'\n{errors} problem(s)')
sys.exit(1 if errors else 0)
