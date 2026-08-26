import argparse
import json
from pathlib import Path
from shutil import copy2

from PIL import Image, ImageDraw, ImageFont, ImageSequence


DATASET_ROOT = Path(".codex-dataset-fitness-exercises")
DATASET_JSON = DATASET_ROOT / "data" / "exercises.json"
DATASET_VIDEOS = DATASET_ROOT / "videos"
SELECTION_FILE = Path("tools/exercise-demo-selection.json")
ASSET_DIR = Path("assets/exercise-demos")
SHEET_DIR = Path("tools/exercise-demo-candidates")
MEDIA_JS = Path("js/exercise-media.js")


def gif_index():
    return {path.name.split("-", 1)[0]: path for path in DATASET_VIDEOS.glob("*.gif")}


def metadata_index():
    items = json.loads(DATASET_JSON.read_text(encoding="utf-8"))
    return {str(item["id"]): item for item in items}


def load_selection():
    return json.loads(SELECTION_FILE.read_text(encoding="utf-8"))


def pick_frame(gif_path, position=0.5):
    with Image.open(gif_path) as image:
        frames = [frame.copy().convert("RGB") for frame in ImageSequence.Iterator(image)]
    index = min(len(frames) - 1, max(0, int((len(frames) - 1) * position)))
    frame = frames[index]
    frame.thumbnail((170, 170))
    return frame


def make_sheet(selection, output_path, columns=4):
    gifs = gif_index()
    meta = metadata_index()
    cell_w, cell_h = 260, 252
    rows = (len(selection) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * cell_w, max(1, rows) * cell_h), "#101419")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()

    for index, item in enumerate(selection):
        x = (index % columns) * cell_w
        y = (index // columns) * cell_h
        gif_path = gifs.get(str(item["datasetId"]))
        if not gif_path:
            continue
        frame = pick_frame(gif_path)
        sheet.paste(frame, (x + (cell_w - frame.width) // 2, y + 8))
        dataset = meta.get(str(item["datasetId"]), {})
        lines = [
            f"{item['name']}",
            f"{item['datasetId']} {dataset.get('name', '')}",
            f"{dataset.get('equipment', '')} | {dataset.get('body_part', '')}",
        ]
        text_y = y + 184
        for line in lines:
            draw.text((x + 8, text_y), line[:46], fill="#f5f7fa", font=font)
            text_y += 16

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path)


def copy_assets(selection):
    gifs = gif_index()
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    copied = []
    for item in selection:
        source = gifs.get(str(item["datasetId"]))
        if not source:
            raise FileNotFoundError(f"No GIF found for dataset ID {item['datasetId']}")
        target = ASSET_DIR / item["filename"]
        copy2(source, target)
        copied.append(target)
    return copied


def js_string(value):
    return json.dumps(value, ensure_ascii=False)


def clean_dataset_name(value):
    return str(value or "").replace("45в°", "45 degrees").replace("45°", "45 degrees")


def write_media_js(selection):
    meta = metadata_index()
    rows = []
    for item in selection:
        dataset = meta.get(str(item["datasetId"]), {})
        rows.append(
            "        {\n"
            f"            key: {js_string(item['key'])},\n"
            f"            name: {js_string(item['name'])},\n"
            f"            datasetId: {js_string(str(item['datasetId']))},\n"
            f"            datasetName: {js_string(clean_dataset_name(dataset.get('name', item['name'])))},\n"
            f"            path: {js_string('assets/exercise-demos/' + item['filename'])},\n"
            f"            aliases: {json.dumps(item.get('aliases', []), ensure_ascii=False, indent=16).replace(chr(10), chr(10) + '            ')}\n"
            "        }"
        )

    content = """(function () {
    "use strict";

    const LOCAL_DEMOS = [
%s
    ];

    function normalizeName(value) {
        return String(value || "")
            .toLowerCase()
            .replace(/&/g, " and ")
            .replace(/\\([^)]*\\)/g, " ")
            .replace(/\\bpull\\s+down\\b/g, "pulldown")
            .replace(/\\bpush[-\\s]+up\\b/g, "push up")
            .replace(/\\bpull[-\\s]+up\\b/g, "pull up")
            .replace(/\\bchin[-\\s]+up\\b/g, "chin up")
            .replace(/\\bsit[-\\s]+up\\b/g, "sit up")
            .replace(/\\bromanian\\s+dead\\s+lift\\b/g, "romanian deadlift")
            .replace(/\\bone\\s+arm\\b/g, "single arm")
            .replace(/\\bdb\\b/g, "dumbbell")
            .replace(/\\btriceps\\b/g, "tricep")
            .replace(/\\bez[-\\s]+barbell\\b/g, "ez bar")
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\\s+/g, " ")
            .trim();
    }

    const exactMap = new Map();
    const aliasMap = new Map();

    LOCAL_DEMOS.forEach(demo => {
        exactMap.set(normalizeName(demo.name), demo);
        exactMap.set(normalizeName(demo.datasetName), demo);
        demo.aliases.forEach(alias => aliasMap.set(normalizeName(alias), demo));
    });

    function resolve(exercise) {
        const normalized = normalizeName(exercise?.name);
        if (!normalized) return null;

        return exactMap.get(normalized) || aliasMap.get(normalized) || null;
    }

    window.gymLocalExerciseMedia = {
        demos: LOCAL_DEMOS,
        normalizeName,
        resolve
    };
})();
""" % ",\n".join(rows)

    MEDIA_JS.write_text(content, encoding="utf-8")


def print_stats(paths):
    sizes = [(path, path.stat().st_size) for path in paths]
    total = sum(size for _, size in sizes)
    largest = max(sizes, key=lambda row: row[1]) if sizes else (None, 0)
    print(f"GIF count: {len(sizes)}")
    print(f"Total bytes: {total}")
    print(f"Total MB: {total / (1024 * 1024):.2f}")
    print(f"Average KB: {(total / max(1, len(sizes))) / 1024:.1f}")
    print(f"Largest: {largest[0]} ({largest[1] / 1024:.1f} KB)")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sheet", action="store_true")
    parser.add_argument("--copy", action="store_true")
    parser.add_argument("--write-media-js", action="store_true")
    args = parser.parse_args()

    selection = load_selection()

    if args.sheet:
        for start in range(0, len(selection), 24):
            make_sheet(selection[start:start + 24], SHEET_DIR / f"selected-sheet-{start // 24 + 1}.jpg")
        print(f"Wrote visual sheets to {SHEET_DIR}")

    paths = []
    if args.copy:
        paths = copy_assets(selection)
        print_stats(paths)

    if args.write_media_js:
        write_media_js(selection)
        print(f"Wrote {MEDIA_JS}")


if __name__ == "__main__":
    main()
