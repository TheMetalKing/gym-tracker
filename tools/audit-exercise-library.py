import re
from collections import Counter
from pathlib import Path


def normalize(value):
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


app = Path("js/app.js").read_text(encoding="utf-8")
catalogue_block = re.search(r"const EXERCISE_CATALOGUE = \[(.*?)\n    \]\.map", app, re.S).group(1)
catalogue_names = re.findall(r'^\s*\["([^"]+)"\s*,', catalogue_block, re.M)

media = Path("js/exercise-media.js").read_text(encoding="utf-8")
media_names = re.findall(r'name: "([^"]+)"', media)
media_paths = re.findall(r'path: "([^"]+)"', media)

duplicate_catalogue = [
    name for name, count in Counter(normalize(name) for name in catalogue_names).items()
    if count > 1
]
missing_media_paths = [path for path in media_paths if not Path(path).exists()]

print(f"catalogue_count={len(catalogue_names)}")
print(f"media_count={len(media_paths)}")
print(f"catalogue_duplicate_normalized={duplicate_catalogue}")
print(f"missing_media_paths={missing_media_paths}")
