(function () {
    "use strict";

    const LOCAL_DEMOS = [
        {
            key: "lat-pulldown",
            name: "Lat Pulldown",
            datasetId: "0197",
            datasetName: "cable pulldown (pro lat bar)",
            path: "assets/exercise-demos/lat-pulldown.gif",
            aliases: [
                "lat pulldown",
                "lat pull down",
                "cable lat pulldown",
                "cable lat pull down",
                "wide grip lat pulldown",
                "wide grip lat pull down"
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
                "low cable row",
                "cable low row"
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
            key: "squat",
            name: "Squat",
            datasetId: "0043",
            datasetName: "barbell full squat",
            path: "assets/exercise-demos/squat.gif",
            aliases: [
                "squat",
                "barbell squat",
                "back squat",
                "barbell back squat",
                "full squat"
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
        }
    ];

    function normalizeName(value) {
        return String(value || "")
            .toLowerCase()
            .replace(/\([^)]*\)/g, " ")
            .replace(/\bpull\s+down\b/g, "pulldown")
            .replace(/\bromanian\s+dead\s+lift\b/g, "romanian deadlift")
            .replace(/\bone\s+arm\b/g, "single arm")
            .replace(/\bdb\b/g, "dumbbell")
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
