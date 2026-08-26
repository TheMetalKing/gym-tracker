(function () {
    "use strict";

    const LOCAL_DEMOS = [
        {
            key: "barbell-bench-press",
            name: "Barbell Bench Press",
            datasetId: "0025",
            datasetName: "barbell bench press",
            path: "assets/exercise-demos/barbell-bench-press.gif",
            aliases: [
                            "bench press",
                            "barbell bench press"
            ]
        },
        {
            key: "incline-barbell-bench-press",
            name: "Incline Barbell Bench Press",
            datasetId: "0047",
            datasetName: "barbell incline bench press",
            path: "assets/exercise-demos/incline-barbell-bench-press.gif",
            aliases: [
                            "incline bench press",
                            "barbell incline bench press",
                            "incline barbell bench press"
            ]
        },
        {
            key: "decline-bench-press",
            name: "Decline Bench Press",
            datasetId: "0033",
            datasetName: "barbell decline bench press",
            path: "assets/exercise-demos/decline-bench-press.gif",
            aliases: [
                            "decline bench press",
                            "barbell decline bench press"
            ]
        },
        {
            key: "dumbbell-bench-press",
            name: "Dumbbell Bench Press",
            datasetId: "0289",
            datasetName: "dumbbell bench press",
            path: "assets/exercise-demos/dumbbell-bench-press.gif",
            aliases: [
                            "dumbbell bench press",
                            "db bench press"
            ]
        },
        {
            key: "incline-dumbbell-press",
            name: "Incline Dumbbell Press",
            datasetId: "0314",
            datasetName: "dumbbell incline bench press",
            path: "assets/exercise-demos/incline-dumbbell-press.gif",
            aliases: [
                            "incline dumbbell press",
                            "incline dumbbell bench press",
                            "dumbbell incline bench press"
            ]
        },
        {
            key: "dumbbell-fly",
            name: "Dumbbell Fly",
            datasetId: "0308",
            datasetName: "dumbbell fly",
            path: "assets/exercise-demos/dumbbell-fly.gif",
            aliases: [
                            "dumbbell fly",
                            "dumbbell flyes",
                            "db fly"
            ]
        },
        {
            key: "cable-fly",
            name: "Cable Fly",
            datasetId: "0227",
            datasetName: "cable standing fly",
            path: "assets/exercise-demos/cable-fly.gif",
            aliases: [
                            "cable fly",
                            "cable standing fly",
                            "cable crossover",
                            "cable cross over"
            ]
        },
        {
            key: "pec-deck",
            name: "Pec Deck",
            datasetId: "0596",
            datasetName: "lever seated fly",
            path: "assets/exercise-demos/pec-deck.gif",
            aliases: [
                            "pec deck",
                            "lever seated fly",
                            "machine fly",
                            "chest fly machine"
            ]
        },
        {
            key: "chest-press-machine",
            name: "Chest Press Machine",
            datasetId: "0577",
            datasetName: "lever chest press",
            path: "assets/exercise-demos/chest-press-machine.gif",
            aliases: [
                            "chest press",
                            "machine chest press",
                            "chest press machine",
                            "lever chest press"
            ]
        },
        {
            key: "push-up",
            name: "Push Up",
            datasetId: "0662",
            datasetName: "push-up",
            path: "assets/exercise-demos/push-up.gif",
            aliases: [
                            "push up",
                            "push-up",
                            "press up"
            ]
        },
        {
            key: "dips",
            name: "Dips",
            datasetId: "0251",
            datasetName: "chest dip",
            path: "assets/exercise-demos/dips.gif",
            aliases: [
                            "dips",
                            "dip",
                            "chest dip"
            ]
        },
        {
            key: "lat-pulldown",
            name: "Lat Pulldown",
            datasetId: "0198",
            datasetName: "cable pulldown",
            path: "assets/exercise-demos/lat-pulldown.gif",
            aliases: [
                            "lat pulldown",
                            "lat pull down",
                            "cable lat pulldown",
                            "cable lat pull down"
            ]
        },
        {
            key: "close-grip-lat-pulldown",
            name: "Close Grip Lat Pulldown",
            datasetId: "0818",
            datasetName: "twin handle parallel grip lat pulldown",
            path: "assets/exercise-demos/close-grip-lat-pulldown.gif",
            aliases: [
                            "close grip lat pulldown",
                            "close grip lat pull down",
                            "parallel grip lat pulldown",
                            "twin handle lat pulldown"
            ]
        },
        {
            key: "wide-grip-lat-pulldown",
            name: "Wide Grip Lat Pulldown",
            datasetId: "0150",
            datasetName: "cable bar lateral pulldown",
            path: "assets/exercise-demos/wide-grip-lat-pulldown.gif",
            aliases: [
                            "wide grip lat pulldown",
                            "wide grip lat pull down",
                            "lat pulldown wide grip",
                            "cable bar lat pulldown",
                            "cable bar lateral pulldown"
            ]
        },
        {
            key: "cable-row",
            name: "Cable Row",
            datasetId: "0861",
            datasetName: "cable seated row",
            path: "assets/exercise-demos/cable-row.gif",
            aliases: [
                            "cable row",
                            "seated cable row",
                            "cable seated row",
                            "low cable row"
            ]
        },
        {
            key: "dumbbell-row",
            name: "Dumbbell Row",
            datasetId: "0292",
            datasetName: "dumbbell one arm bent-over row",
            path: "assets/exercise-demos/dumbbell-row.gif",
            aliases: [
                            "dumbbell row",
                            "db row",
                            "one arm dumbbell row",
                            "single arm dumbbell row",
                            "dumbbell one arm row"
            ]
        },
        {
            key: "barbell-row",
            name: "Barbell Row",
            datasetId: "0027",
            datasetName: "barbell bent over row",
            path: "assets/exercise-demos/barbell-row.gif",
            aliases: [
                            "barbell row",
                            "barbell bent over row",
                            "bent over row"
            ]
        },
        {
            key: "t-bar-row",
            name: "T-Bar Row",
            datasetId: "0606",
            datasetName: "lever t bar row",
            path: "assets/exercise-demos/t-bar-row.gif",
            aliases: [
                            "t bar row",
                            "t-bar row",
                            "lever t bar row"
            ]
        },
        {
            key: "chest-supported-row",
            name: "Chest Supported Row",
            datasetId: "0327",
            datasetName: "dumbbell incline row",
            path: "assets/exercise-demos/chest-supported-row.gif",
            aliases: [
                            "chest supported row",
                            "dumbbell incline row",
                            "incline row"
            ]
        },
        {
            key: "machine-row",
            name: "Machine Row",
            datasetId: "1350",
            datasetName: "lever seated row",
            path: "assets/exercise-demos/machine-row.gif",
            aliases: [
                            "machine row",
                            "lever seated row",
                            "seated machine row"
            ]
        },
        {
            key: "pull-up",
            name: "Pull Up",
            datasetId: "0652",
            datasetName: "pull-up",
            path: "assets/exercise-demos/pull-up.gif",
            aliases: [
                            "pull up",
                            "pull-up"
            ]
        },
        {
            key: "chin-up",
            name: "Chin Up",
            datasetId: "1326",
            datasetName: "chin-up",
            path: "assets/exercise-demos/chin-up.gif",
            aliases: [
                            "chin up",
                            "chin-up"
            ]
        },
        {
            key: "straight-arm-pulldown",
            name: "Straight Arm Pulldown",
            datasetId: "0238",
            datasetName: "cable straight arm pulldown",
            path: "assets/exercise-demos/straight-arm-pulldown.gif",
            aliases: [
                            "straight arm pulldown",
                            "straight arm pull down",
                            "cable straight arm pulldown"
            ]
        },
        {
            key: "deadlift",
            name: "Deadlift",
            datasetId: "0032",
            datasetName: "barbell deadlift",
            path: "assets/exercise-demos/deadlift.gif",
            aliases: [
                            "deadlift",
                            "barbell deadlift",
                            "conventional deadlift"
            ]
        },
        {
            key: "barbell-overhead-press",
            name: "Barbell Overhead Press",
            datasetId: "0091",
            datasetName: "barbell seated overhead press",
            path: "assets/exercise-demos/barbell-overhead-press.gif",
            aliases: [
                            "barbell overhead press",
                            "overhead press",
                            "barbell seated overhead press",
                            "military press"
            ]
        },
        {
            key: "dumbbell-shoulder-press",
            name: "Dumbbell Shoulder Press",
            datasetId: "0405",
            datasetName: "dumbbell seated shoulder press",
            path: "assets/exercise-demos/dumbbell-shoulder-press.gif",
            aliases: [
                            "dumbbell shoulder press",
                            "db shoulder press",
                            "dumbbell seated shoulder press"
            ]
        },
        {
            key: "arnold-press",
            name: "Arnold Press",
            datasetId: "2137",
            datasetName: "dumbbell arnold press",
            path: "assets/exercise-demos/arnold-press.gif",
            aliases: [
                            "arnold press",
                            "dumbbell arnold press"
            ]
        },
        {
            key: "machine-shoulder-press",
            name: "Machine Shoulder Press",
            datasetId: "0603",
            datasetName: "lever shoulder press",
            path: "assets/exercise-demos/machine-shoulder-press.gif",
            aliases: [
                            "machine shoulder press",
                            "lever shoulder press"
            ]
        },
        {
            key: "dumbbell-lateral-raise",
            name: "Dumbbell Lateral Raise",
            datasetId: "0334",
            datasetName: "dumbbell lateral raise",
            path: "assets/exercise-demos/dumbbell-lateral-raise.gif",
            aliases: [
                            "dumbbell lateral raise",
                            "lateral raise",
                            "dumbbell side lateral raise"
            ]
        },
        {
            key: "cable-lateral-raise",
            name: "Cable Lateral Raise",
            datasetId: "0178",
            datasetName: "cable lateral raise",
            path: "assets/exercise-demos/cable-lateral-raise.gif",
            aliases: [
                            "cable lateral raise",
                            "cable side lateral raise"
            ]
        },
        {
            key: "front-raise",
            name: "Front Raise",
            datasetId: "0310",
            datasetName: "dumbbell front raise",
            path: "assets/exercise-demos/front-raise.gif",
            aliases: [
                            "front raise",
                            "dumbbell front raise"
            ]
        },
        {
            key: "reverse-fly",
            name: "Reverse Fly",
            datasetId: "0383",
            datasetName: "dumbbell reverse fly",
            path: "assets/exercise-demos/reverse-fly.gif",
            aliases: [
                            "reverse fly",
                            "dumbbell reverse fly"
            ]
        },
        {
            key: "rear-delt-fly",
            name: "Rear Delt Fly",
            datasetId: "0602",
            datasetName: "lever seated reverse fly",
            path: "assets/exercise-demos/rear-delt-fly.gif",
            aliases: [
                            "rear delt fly",
                            "rear deltoid fly",
                            "lever seated reverse fly",
                            "reverse pec deck"
            ]
        },
        {
            key: "upright-row",
            name: "Upright Row",
            datasetId: "0120",
            datasetName: "barbell upright row",
            path: "assets/exercise-demos/upright-row.gif",
            aliases: [
                            "upright row",
                            "barbell upright row"
            ]
        },
        {
            key: "shrugs",
            name: "Shrugs",
            datasetId: "0095",
            datasetName: "barbell shrug",
            path: "assets/exercise-demos/shrugs.gif",
            aliases: [
                            "shrugs",
                            "shrug",
                            "barbell shrug"
            ]
        },
        {
            key: "barbell-curl",
            name: "Barbell Curl",
            datasetId: "0031",
            datasetName: "barbell curl",
            path: "assets/exercise-demos/barbell-curl.gif",
            aliases: [
                            "barbell curl"
            ]
        },
        {
            key: "ez-bar-curl",
            name: "EZ Bar Curl",
            datasetId: "0447",
            datasetName: "ez barbell curl",
            path: "assets/exercise-demos/ez-bar-curl.gif",
            aliases: [
                            "ez bar curl",
                            "ez-bar curl",
                            "ez barbell curl"
            ]
        },
        {
            key: "dumbbell-curl",
            name: "Dumbbell Curl",
            datasetId: "0294",
            datasetName: "dumbbell biceps curl",
            path: "assets/exercise-demos/dumbbell-curl.gif",
            aliases: [
                            "dumbbell curl",
                            "dumbbell biceps curl",
                            "db curl"
            ]
        },
        {
            key: "hammer-curl",
            name: "Hammer Curl",
            datasetId: "0313",
            datasetName: "dumbbell hammer curl",
            path: "assets/exercise-demos/hammer-curl.gif",
            aliases: [
                            "hammer curl",
                            "dumbbell hammer curl"
            ]
        },
        {
            key: "incline-dumbbell-curl",
            name: "Incline Dumbbell Curl",
            datasetId: "0318",
            datasetName: "dumbbell incline curl",
            path: "assets/exercise-demos/incline-dumbbell-curl.gif",
            aliases: [
                            "incline dumbbell curl",
                            "dumbbell incline curl"
            ]
        },
        {
            key: "preacher-curl",
            name: "Preacher Curl",
            datasetId: "0070",
            datasetName: "barbell preacher curl",
            path: "assets/exercise-demos/preacher-curl.gif",
            aliases: [
                            "preacher curl",
                            "barbell preacher curl"
            ]
        },
        {
            key: "cable-curl",
            name: "Cable Curl",
            datasetId: "0868",
            datasetName: "cable curl",
            path: "assets/exercise-demos/cable-curl.gif",
            aliases: [
                            "cable curl"
            ]
        },
        {
            key: "concentration-curl",
            name: "Concentration Curl",
            datasetId: "0297",
            datasetName: "dumbbell concentration curl",
            path: "assets/exercise-demos/concentration-curl.gif",
            aliases: [
                            "concentration curl",
                            "dumbbell concentration curl"
            ]
        },
        {
            key: "spider-curl",
            name: "Spider Curl",
            datasetId: "0454",
            datasetName: "ez barbell spider curl",
            path: "assets/exercise-demos/spider-curl.gif",
            aliases: [
                            "spider curl",
                            "ez bar spider curl",
                            "ez barbell spider curl"
            ]
        },
        {
            key: "tricep-pushdown",
            name: "Tricep Pushdown",
            datasetId: "0241",
            datasetName: "cable triceps pushdown (v-bar)",
            path: "assets/exercise-demos/tricep-pushdown.gif",
            aliases: [
                            "tricep pushdown",
                            "triceps pushdown",
                            "cable tricep pushdown",
                            "cable triceps pushdown"
            ]
        },
        {
            key: "rope-pushdown",
            name: "Rope Pushdown",
            datasetId: "0200",
            datasetName: "cable pushdown (with rope attachment)",
            path: "assets/exercise-demos/rope-pushdown.gif",
            aliases: [
                            "rope pushdown",
                            "cable rope pushdown",
                            "cable pushdown with rope"
            ]
        },
        {
            key: "overhead-cable-extension",
            name: "Overhead Cable Extension",
            datasetId: "0194",
            datasetName: "cable overhead triceps extension (rope attachment)",
            path: "assets/exercise-demos/overhead-cable-extension.gif",
            aliases: [
                            "overhead cable extension",
                            "cable overhead tricep extension",
                            "cable overhead triceps extension"
            ]
        },
        {
            key: "dumbbell-overhead-extension",
            name: "Dumbbell Overhead Extension",
            datasetId: "2188",
            datasetName: "dumbbell seated triceps extension",
            path: "assets/exercise-demos/dumbbell-overhead-extension.gif",
            aliases: [
                            "dumbbell overhead extension",
                            "dumbbell overhead tricep extension",
                            "dumbbell seated triceps extension"
            ]
        },
        {
            key: "skull-crushers",
            name: "Skull Crushers",
            datasetId: "0060",
            datasetName: "barbell lying triceps extension skull crusher",
            path: "assets/exercise-demos/skull-crushers.gif",
            aliases: [
                            "skull crushers",
                            "skull crusher",
                            "barbell lying triceps extension skull crusher"
            ]
        },
        {
            key: "close-grip-bench-press",
            name: "Close Grip Bench Press",
            datasetId: "0030",
            datasetName: "barbell close-grip bench press",
            path: "assets/exercise-demos/close-grip-bench-press.gif",
            aliases: [
                            "close grip bench press",
                            "barbell close grip bench press",
                            "barbell close-grip bench press"
            ]
        },
        {
            key: "tricep-dips",
            name: "Tricep Dips",
            datasetId: "0814",
            datasetName: "triceps dip",
            path: "assets/exercise-demos/tricep-dips.gif",
            aliases: [
                            "tricep dips",
                            "triceps dip",
                            "tricep dip"
            ]
        },
        {
            key: "single-arm-cable-extension",
            name: "Single Arm Cable Extension",
            datasetId: "0231",
            datasetName: "cable standing one arm triceps extension",
            path: "assets/exercise-demos/single-arm-cable-extension.gif",
            aliases: [
                            "single arm cable extension",
                            "cable one arm tricep extension",
                            "cable standing one arm triceps extension"
            ]
        },
        {
            key: "back-squat",
            name: "Back Squat",
            datasetId: "0043",
            datasetName: "barbell full squat",
            path: "assets/exercise-demos/back-squat.gif",
            aliases: [
                            "back squat",
                            "squat",
                            "barbell squat",
                            "barbell back squat",
                            "barbell full squat"
            ]
        },
        {
            key: "front-squat",
            name: "Front Squat",
            datasetId: "0042",
            datasetName: "barbell front squat",
            path: "assets/exercise-demos/front-squat.gif",
            aliases: [
                            "front squat",
                            "barbell front squat"
            ]
        },
        {
            key: "hack-squat",
            name: "Hack Squat",
            datasetId: "0743",
            datasetName: "sled hack squat",
            path: "assets/exercise-demos/hack-squat.gif",
            aliases: [
                            "hack squat",
                            "sled hack squat"
            ]
        },
        {
            key: "leg-press",
            name: "Leg Press",
            datasetId: "0739",
            datasetName: "sled 45 degrees leg press",
            path: "assets/exercise-demos/leg-press.gif",
            aliases: [
                            "leg press",
                            "sled leg press",
                            "sled 45 degree leg press",
                            "sled 45 degrees leg press"
            ]
        },
        {
            key: "leg-extension",
            name: "Leg Extension",
            datasetId: "0585",
            datasetName: "lever leg extension",
            path: "assets/exercise-demos/leg-extension.gif",
            aliases: [
                            "leg extension",
                            "lever leg extension"
            ]
        },
        {
            key: "leg-curl",
            name: "Leg Curl",
            datasetId: "0586",
            datasetName: "lever lying leg curl",
            path: "assets/exercise-demos/leg-curl.gif",
            aliases: [
                            "leg curl",
                            "lying leg curl",
                            "lever lying leg curl"
            ]
        },
        {
            key: "romanian-deadlift",
            name: "Romanian Deadlift",
            datasetId: "0085",
            datasetName: "barbell romanian deadlift",
            path: "assets/exercise-demos/romanian-deadlift.gif",
            aliases: [
                            "romanian deadlift",
                            "rdl",
                            "barbell romanian deadlift"
            ]
        },
        {
            key: "stiff-leg-deadlift",
            name: "Stiff Leg Deadlift",
            datasetId: "0432",
            datasetName: "dumbbell stiff leg deadlift",
            path: "assets/exercise-demos/stiff-leg-deadlift.gif",
            aliases: [
                            "stiff leg deadlift",
                            "dumbbell stiff leg deadlift"
            ]
        },
        {
            key: "bulgarian-split-squat",
            name: "Bulgarian Split Squat",
            datasetId: "0410",
            datasetName: "dumbbell single leg split squat",
            path: "assets/exercise-demos/bulgarian-split-squat.gif",
            aliases: [
                            "bulgarian split squat",
                            "dumbbell single leg split squat",
                            "single leg split squat"
            ]
        },
        {
            key: "walking-lunge",
            name: "Walking Lunge",
            datasetId: "1460",
            datasetName: "walking lunge",
            path: "assets/exercise-demos/walking-lunge.gif",
            aliases: [
                            "walking lunge"
            ]
        },
        {
            key: "reverse-lunge",
            name: "Reverse Lunge",
            datasetId: "0381",
            datasetName: "dumbbell rear lunge",
            path: "assets/exercise-demos/reverse-lunge.gif",
            aliases: [
                            "reverse lunge",
                            "rear lunge",
                            "dumbbell rear lunge"
            ]
        },
        {
            key: "goblet-squat",
            name: "Goblet Squat",
            datasetId: "1760",
            datasetName: "dumbbell goblet squat",
            path: "assets/exercise-demos/goblet-squat.gif",
            aliases: [
                            "goblet squat",
                            "dumbbell goblet squat"
            ]
        },
        {
            key: "glute-bridge",
            name: "Glute Bridge",
            datasetId: "1409",
            datasetName: "barbell glute bridge",
            path: "assets/exercise-demos/glute-bridge.gif",
            aliases: [
                            "glute bridge",
                            "barbell glute bridge"
            ]
        },
        {
            key: "standing-calf-raise",
            name: "Standing Calf Raise",
            datasetId: "0605",
            datasetName: "lever standing calf raise",
            path: "assets/exercise-demos/standing-calf-raise.gif",
            aliases: [
                            "standing calf raise",
                            "lever standing calf raise",
                            "calf raise"
            ]
        },
        {
            key: "seated-calf-raise",
            name: "Seated Calf Raise",
            datasetId: "0594",
            datasetName: "lever seated calf raise",
            path: "assets/exercise-demos/seated-calf-raise.gif",
            aliases: [
                            "seated calf raise",
                            "lever seated calf raise"
            ]
        },
        {
            key: "adductor-machine",
            name: "Adductor Machine",
            datasetId: "0598",
            datasetName: "lever seated hip adduction",
            path: "assets/exercise-demos/adductor-machine.gif",
            aliases: [
                            "adductor machine",
                            "hip adduction",
                            "lever seated hip adduction"
            ]
        },
        {
            key: "abductor-machine",
            name: "Abductor Machine",
            datasetId: "0597",
            datasetName: "lever seated hip abduction",
            path: "assets/exercise-demos/abductor-machine.gif",
            aliases: [
                            "abductor machine",
                            "hip abduction",
                            "lever seated hip abduction"
            ]
        },
        {
            key: "cable-crunch",
            name: "Cable Crunch",
            datasetId: "0175",
            datasetName: "cable kneeling crunch",
            path: "assets/exercise-demos/cable-crunch.gif",
            aliases: [
                            "cable crunch",
                            "cable kneeling crunch"
            ]
        },
        {
            key: "crunch",
            name: "Crunch",
            datasetId: "0267",
            datasetName: "crunch (hands overhead)",
            path: "assets/exercise-demos/crunch.gif",
            aliases: [
                            "crunch",
                            "floor crunch"
            ]
        },
        {
            key: "sit-up",
            name: "Sit Up",
            datasetId: "3204",
            datasetName: "arms overhead full sit-up (male)",
            path: "assets/exercise-demos/sit-up.gif",
            aliases: [
                            "sit up",
                            "sit-up",
                            "full sit up"
            ]
        },
        {
            key: "hanging-leg-raise",
            name: "Hanging Leg Raise",
            datasetId: "0472",
            datasetName: "hanging leg raise",
            path: "assets/exercise-demos/hanging-leg-raise.gif",
            aliases: [
                            "hanging leg raise",
                            "leg raise"
            ]
        },
        {
            key: "ab-wheel",
            name: "Ab Wheel",
            datasetId: "0857",
            datasetName: "wheel rollerout",
            path: "assets/exercise-demos/ab-wheel.gif",
            aliases: [
                            "ab wheel",
                            "ab wheel rollout",
                            "wheel rollout",
                            "wheel rollerout"
            ]
        },
        {
            key: "plank",
            name: "Plank",
            datasetId: "2135",
            datasetName: "weighted front plank",
            path: "assets/exercise-demos/plank.gif",
            aliases: [
                            "plank",
                            "front plank"
            ]
        },
        {
            key: "russian-twist",
            name: "Russian Twist",
            datasetId: "0687",
            datasetName: "russian twist",
            path: "assets/exercise-demos/russian-twist.gif",
            aliases: [
                            "russian twist"
            ]
        },
        {
            key: "bicycle-crunch",
            name: "Bicycle Crunch",
            datasetId: "0003",
            datasetName: "air bike",
            path: "assets/exercise-demos/bicycle-crunch.gif",
            aliases: [
                            "bicycle crunch",
                            "air bike"
            ]
        },
        {
            key: "wrist-curl",
            name: "Wrist Curl",
            datasetId: "1412",
            datasetName: "barbell palms up wrist curl over a bench",
            path: "assets/exercise-demos/wrist-curl.gif",
            aliases: [
                            "wrist curl",
                            "barbell wrist curl",
                            "palms up wrist curl"
            ]
        },
        {
            key: "reverse-wrist-curl",
            name: "Reverse Wrist Curl",
            datasetId: "0082",
            datasetName: "barbell reverse wrist curl",
            path: "assets/exercise-demos/reverse-wrist-curl.gif",
            aliases: [
                            "reverse wrist curl",
                            "barbell reverse wrist curl"
            ]
        },
        {
            key: "reverse-curl",
            name: "Reverse Curl",
            datasetId: "0080",
            datasetName: "barbell reverse curl",
            path: "assets/exercise-demos/reverse-curl.gif",
            aliases: [
                            "reverse curl",
                            "barbell reverse curl"
            ]
        },
        {
            key: "farmers-walk",
            name: "Farmer's Walk",
            datasetId: "2133",
            datasetName: "farmers walk",
            path: "assets/exercise-demos/farmers-walk.gif",
            aliases: [
                            "farmer's walk",
                            "farmers walk",
                            "farmer walk"
            ]
        }
    ];

    function normalizeName(value) {
        return String(value || "")
            .toLowerCase()
            .replace(/&/g, " and ")
            .replace(/\([^)]*\)/g, " ")
            .replace(/\bpull\s+down\b/g, "pulldown")
            .replace(/\bpush[-\s]+up\b/g, "push up")
            .replace(/\bpull[-\s]+up\b/g, "pull up")
            .replace(/\bchin[-\s]+up\b/g, "chin up")
            .replace(/\bsit[-\s]+up\b/g, "sit up")
            .replace(/\bromanian\s+dead\s+lift\b/g, "romanian deadlift")
            .replace(/\bone\s+arm\b/g, "single arm")
            .replace(/\bdb\b/g, "dumbbell")
            .replace(/\btriceps\b/g, "tricep")
            .replace(/\bez[-\s]+barbell\b/g, "ez bar")
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
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
