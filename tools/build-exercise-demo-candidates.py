import argparse
import json
import math
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageSequence


DATASET_ROOT = Path(".codex-dataset-fitness-exercises")
DATASET_JSON = DATASET_ROOT / "data" / "exercises.json"
DATASET_VIDEOS = DATASET_ROOT / "videos"
OUTPUT_DIR = Path("tools/exercise-demo-candidates")
GIF_INDEX = {}


TARGET_EXERCISES = [
    "Barbell Bench Press", "Incline Barbell Bench Press", "Decline Bench Press",
    "Dumbbell Bench Press", "Incline Dumbbell Press", "Dumbbell Fly", "Cable Fly",
    "Pec Deck", "Chest Press Machine", "Push Up", "Dips",
    "Lat Pulldown", "Close Grip Lat Pulldown", "Wide Grip Lat Pulldown", "Cable Row",
    "Dumbbell Row", "Barbell Row", "T-Bar Row", "Chest Supported Row", "Machine Row",
    "Pull Up", "Chin Up", "Straight Arm Pulldown", "Face Pull", "Deadlift",
    "Barbell Overhead Press", "Dumbbell Shoulder Press", "Arnold Press",
    "Machine Shoulder Press", "Dumbbell Lateral Raise", "Cable Lateral Raise",
    "Front Raise", "Reverse Fly", "Rear Delt Fly", "Upright Row", "Shrugs",
    "Barbell Curl", "EZ Bar Curl", "Dumbbell Curl", "Hammer Curl",
    "Incline Dumbbell Curl", "Preacher Curl", "Cable Curl", "Concentration Curl",
    "Spider Curl", "Tricep Pushdown", "Rope Pushdown", "Overhead Cable Extension",
    "Dumbbell Overhead Extension", "Skull Crushers", "Close Grip Bench Press",
    "Tricep Dips", "Single Arm Cable Extension", "Back Squat", "Front Squat",
    "Hack Squat", "Leg Press", "Leg Extension", "Leg Curl", "Romanian Deadlift",
    "Stiff Leg Deadlift", "Bulgarian Split Squat", "Walking Lunge", "Reverse Lunge",
    "Goblet Squat", "Hip Thrust", "Glute Bridge", "Standing Calf Raise",
    "Seated Calf Raise", "Adductor Machine", "Abductor Machine", "Cable Crunch",
    "Crunch", "Sit Up", "Hanging Leg Raise", "Hanging Knee Raise", "Ab Wheel",
    "Plank", "Russian Twist", "Bicycle Crunch", "Wrist Curl", "Reverse Wrist Curl",
    "Reverse Curl", "Farmer's Walk",
]


SYNONYMS = {
    "barbell bench press": ["barbell bench press", "bench press"],
    "incline barbell bench press": ["barbell incline bench press", "incline bench press"],
    "decline bench press": ["barbell decline bench press", "decline bench press"],
    "dumbbell bench press": ["dumbbell bench press"],
    "incline dumbbell press": ["dumbbell incline bench press", "incline dumbbell bench press", "incline dumbbell press"],
    "dumbbell fly": ["dumbbell fly", "dumbbell flyes"],
    "cable fly": ["cable fly", "cable crossover"],
    "pec deck": ["lever pec deck fly", "pec deck"],
    "chest press machine": ["lever chest press", "chest press machine", "machine chest press"],
    "push up": ["push-up", "push up"],
    "dips": ["chest dip", "dips"],
    "lat pulldown": ["cable pulldown", "lat pulldown", "front pulldown"],
    "close grip lat pulldown": ["close grip lat pulldown", "close-grip front lat pulldown"],
    "wide grip lat pulldown": ["wide grip lat pulldown", "wide-grip lat pulldown", "wide grip rear pulldown"],
    "cable row": ["cable seated row", "seated cable row"],
    "dumbbell row": ["dumbbell one arm row", "dumbbell one arm bent-over row", "dumbbell row"],
    "barbell row": ["barbell bent over row", "barbell row"],
    "t-bar row": ["t-bar row", "lever t-bar row"],
    "chest supported row": ["chest supported row", "incline row"],
    "machine row": ["lever seated row", "machine row"],
    "pull up": ["pull-up", "pull up"],
    "chin up": ["chin-up", "chin up"],
    "straight arm pulldown": ["cable straight arm pulldown", "straight arm pulldown"],
    "face pull": ["cable face pull", "face pull"],
    "deadlift": ["barbell deadlift", "deadlift"],
    "barbell overhead press": ["barbell standing military press", "barbell overhead press", "military press"],
    "dumbbell shoulder press": ["dumbbell shoulder press", "dumbbell seated shoulder press"],
    "arnold press": ["dumbbell arnold press", "arnold press"],
    "machine shoulder press": ["lever shoulder press", "machine shoulder press"],
    "dumbbell lateral raise": ["dumbbell lateral raise", "dumbbell side lateral raise"],
    "cable lateral raise": ["cable lateral raise", "cable one arm lateral raise"],
    "front raise": ["dumbbell front raise", "front raise"],
    "reverse fly": ["dumbbell reverse fly", "reverse fly"],
    "rear delt fly": ["lever seated reverse fly", "rear delt fly", "reverse pec deck fly"],
    "upright row": ["barbell upright row", "upright row"],
    "shrugs": ["barbell shrug", "dumbbell shrug", "shrug"],
    "barbell curl": ["barbell curl"],
    "ez bar curl": ["ez-barbell curl", "ez bar curl"],
    "dumbbell curl": ["dumbbell curl"],
    "hammer curl": ["dumbbell hammer curl", "hammer curl"],
    "incline dumbbell curl": ["dumbbell incline curl", "incline dumbbell curl"],
    "preacher curl": ["preacher curl"],
    "cable curl": ["cable curl"],
    "concentration curl": ["dumbbell concentration curl", "concentration curl"],
    "spider curl": ["spider curl"],
    "tricep pushdown": ["cable triceps pushdown", "triceps pushdown", "tricep pushdown"],
    "rope pushdown": ["cable rope pushdown", "rope pushdown"],
    "overhead cable extension": ["cable overhead triceps extension", "overhead cable triceps extension"],
    "dumbbell overhead extension": ["dumbbell overhead triceps extension", "dumbbell triceps extension"],
    "skull crushers": ["ez barbell lying triceps extension", "skull crusher", "skull crushers"],
    "close grip bench press": ["barbell close grip bench press", "close grip bench press"],
    "tricep dips": ["triceps dip", "bench dip", "tricep dip"],
    "single arm cable extension": ["cable one arm tricep pushdown", "cable one arm triceps extension"],
    "back squat": ["barbell full squat", "barbell squat", "back squat"],
    "front squat": ["barbell front squat", "front squat"],
    "hack squat": ["sled hack squat", "hack squat"],
    "leg press": ["sled 45 degrees leg press", "leg press"],
    "leg extension": ["lever leg extension", "leg extension"],
    "leg curl": ["lever lying leg curl", "lever seated leg curl", "leg curl"],
    "romanian deadlift": ["barbell romanian deadlift", "romanian deadlift"],
    "stiff leg deadlift": ["barbell stiff leg deadlift", "stiff leg deadlift"],
    "bulgarian split squat": ["bulgarian split squat"],
    "walking lunge": ["dumbbell walking lunge", "walking lunge"],
    "reverse lunge": ["dumbbell rear lunge", "reverse lunge"],
    "goblet squat": ["dumbbell goblet squat", "goblet squat"],
    "hip thrust": ["barbell hip thrust", "hip thrust"],
    "glute bridge": ["glute bridge", "barbell glute bridge"],
    "standing calf raise": ["standing calf raise", "lever standing calf raise"],
    "seated calf raise": ["lever seated calf raise", "seated calf raise"],
    "adductor machine": ["lever seated hip adduction", "hip adduction"],
    "abductor machine": ["lever seated hip abduction", "hip abduction"],
    "cable crunch": ["cable kneeling crunch", "cable crunch"],
    "crunch": ["crunch"],
    "sit up": ["sit-up", "sit up"],
    "hanging leg raise": ["hanging leg raise"],
    "hanging knee raise": ["hanging knee raise"],
    "ab wheel": ["wheel rollout", "ab wheel rollout"],
    "plank": ["front plank", "plank"],
    "russian twist": ["russian twist"],
    "bicycle crunch": ["air bike", "bicycle crunch"],
    "wrist curl": ["wrist curl"],
    "reverse wrist curl": ["reverse wrist curl"],
    "reverse curl": ["reverse curl"],
    "farmer's walk": ["farmer walk", "farmers walk", "farmer's walk"],
}


def normalize(value):
    text = str(value or "").lower()
    text = text.replace("&", " and ")
    text = re.sub(r"\([^)]*\)", " ", text)
    text = text.replace("pull down", "pulldown")
    text = text.replace("push-up", "push up").replace("pull-up", "pull up").replace("chin-up", "chin up")
    text = text.replace("sit-up", "sit up")
    text = re.sub(r"\bez[- ]barbell\b", "ez bar", text)
    text = re.sub(r"\btriceps\b", "tricep", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def gif_for(item):
    return GIF_INDEX.get(str(item["id"]))


def score_target(target, item):
    target_norm = normalize(target)
    name_norm = normalize(item["name"])
    aliases = [normalize(x) for x in SYNONYMS.get(target_norm, [target])]
    score = 0
    if name_norm == target_norm:
        score = max(score, 1000)
    for alias in aliases:
        if name_norm == alias:
            score = max(score, 980)
        elif alias in name_norm:
            score = max(score, 820 + len(alias))
        elif name_norm in alias:
            score = max(score, 760 + len(name_norm))
    target_tokens = set(target_norm.split())
    name_tokens = set(name_norm.split())
    shared = len(target_tokens & name_tokens)
    if shared:
        score = max(score, shared * 120 - abs(len(target_tokens) - len(name_tokens)) * 25)
    return score


def pick_frame(gif_path):
    with Image.open(gif_path) as image:
        frames = [frame.copy().convert("RGB") for frame in ImageSequence.Iterator(image)]
    frame = frames[min(len(frames) - 1, max(0, len(frames) // 2))]
    frame.thumbnail((180, 180))
    return frame


def make_sheet(candidates, output_path, columns=4):
    cell_w, cell_h = 240, 240
    rows = math.ceil(len(candidates) / columns)
    sheet = Image.new("RGB", (columns * cell_w, max(1, rows) * cell_h), "#101419")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, candidate in enumerate(candidates):
        x = (index % columns) * cell_w
        y = (index // columns) * cell_h
        gif_path = gif_for(candidate["item"])
        if not gif_path:
            continue
        frame = pick_frame(gif_path)
        sheet.paste(frame, (x + (cell_w - frame.width) // 2, y + 8))
        lines = [
            f"{candidate['target']}",
            f"{candidate['item']['id']} {candidate['item']['name']}",
            f"{candidate['item'].get('equipment', '')} | {candidate['item'].get('body_part', '')}",
        ]
        text_y = y + 188
        for line in lines:
            draw.text((x + 8, text_y), line[:42], fill="#f5f7fa", font=font)
            text_y += 15
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--top", type=int, default=4)
    parser.add_argument("--sheets", action="store_true")
    args = parser.parse_args()

    items = json.loads(DATASET_JSON.read_text(encoding="utf-8"))
    GIF_INDEX.update({path.name.split("-", 1)[0]: path for path in DATASET_VIDEOS.glob("*.gif")})
    all_candidates = []
    manifest = {}

    for target in TARGET_EXERCISES:
        ranked = []
        for item in items:
            gif_path = gif_for(item)
            if not gif_path:
                continue
            score = score_target(target, item)
            if score >= 220:
                ranked.append({"target": target, "score": score, "item": item, "gif": str(gif_path)})
        ranked.sort(key=lambda row: (-row["score"], row["item"]["name"]))
        manifest[target] = ranked[: args.top]
        all_candidates.extend(ranked[: args.top])

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / "candidate-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    flat = []
    for target, rows in manifest.items():
        flat.extend(rows)
    if args.sheets:
        for sheet_index in range(0, len(flat), 24):
            make_sheet(flat[sheet_index:sheet_index + 24], OUTPUT_DIR / f"candidate-sheet-{sheet_index // 24 + 1}.jpg")

    print(f"Wrote {len(flat)} candidates for {len(TARGET_EXERCISES)} targets to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
