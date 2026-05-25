"""Extract all `en` category names from lib/word-list.ts -> classes_full.json"""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, "..", "lib", "word-list.ts"), encoding="utf-8").read()
names = re.findall(r'\{\s*en:\s*"([^"]+)"', src)
out = os.path.join(HERE, "classes_full.json")
json.dump(names, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(f"extracted {len(names)} classes -> {out}")
print("first/last:", names[0], "...", names[-1])
