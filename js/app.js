const STORAGE_KEY = "metalsGymTrackerDataV1";

    const defaultData = {
        days: [
            { id: "day-1", label: "Day 1", name: "Back & Biceps", exerciseIds: [] },
            { id: "day-2", label: "Day 2", name: "Shoulders", exerciseIds: [] },
            { id: "day-3", label: "Day 3", name: "Legs", exerciseIds: [] },
            { id: "day-4", label: "Day 4", name: "Chest & Triceps", exerciseIds: [] }
        ],
        exercises: [],
        workouts: [],
        bodyEntries: [],
        plans: [],
        activePlanId: null,
        selectedPlanId: null,
        planRuns: []
    };

    const DEFAULT_PROGRESSION = {
        enabled: true,
        minReps: 8,
        maxReps: 12,
        incrementKg: 2.5,
        rounding: "increment"
    };

    const EXERCISE_NAME_ALIASES = new Map([
        ["bb bench press", "bench press"],
        ["barbell bench press", "bench press"],
        ["db bench press", "dumbbell bench press"],
        ["db row", "dumbbell row"],
        ["db curl", "dumbbell curl"],
        ["db shoulder press", "dumbbell shoulder press"],
        ["lat pull down", "lat pulldown"],
        ["cable lat pull down", "lat pulldown"],
        ["seated cable row", "cable row"],
        ["cable seated row", "cable row"],
        ["rdl", "romanian deadlift"],
        ["barbell romanian deadlift", "romanian deadlift"],
        ["ohp", "overhead press"],
        ["barbell overhead press", "overhead press"],
        ["triceps pushdown", "tricep pushdown"],
        ["triceps dip", "tricep dips"],
        ["dip", "dips"],
        ["barbell full squat", "back squat"],
        ["barbell squat", "back squat"],
        ["squat", "back squat"],
        ["calf raise", "standing calf raise"],
        ["hip adduction", "adductor machine"],
        ["hip abduction", "abductor machine"]
    ]);

    const EQUIPMENT_ALIASES = new Map([
        ["bb", "Barbell"],
        ["barbell", "Barbell"],
        ["db", "Dumbbell"],
        ["dumbbell", "Dumbbell"],
        ["cable machine", "Cable"],
        ["cable", "Cable"],
        ["machine", "Machine"],
        ["leverage machine", "Machine"],
        ["body weight", "Bodyweight"],
        ["bodyweight", "Bodyweight"],
        ["ez barbell", "EZ Bar"],
        ["ez bar", "EZ Bar"],
        ["smith", "Smith Machine"],
        ["smith machine", "Smith Machine"]
    ]);

    function ensureExerciseProgressionDefaults(exercise) {
        if (!exercise) return;

        exercise.progression ??= {};
        exercise.progression.enabled ??= DEFAULT_PROGRESSION.enabled;
        exercise.progression.minReps = normalizePositiveInteger(exercise.progression.minReps, DEFAULT_PROGRESSION.minReps);
        exercise.progression.maxReps = Math.max(
            exercise.progression.minReps,
            normalizePositiveInteger(exercise.progression.maxReps, DEFAULT_PROGRESSION.maxReps)
        );
        exercise.progression.incrementKg = normalizePositiveNumber(exercise.progression.incrementKg, DEFAULT_PROGRESSION.incrementKg, 0.25);
        exercise.progression.rounding ??= DEFAULT_PROGRESSION.rounding;
    }

    function migrateTrackerDataObject(data) {
        if (!data || typeof data !== "object" || Array.isArray(data)) {
            throw new Error("Backup root must be an object.");
        }

        data.days ??= structuredClone(defaultData.days);
        data.exercises ??= [];
        data.workouts ??= [];
        data.bodyEntries ??= [];
        data.plans ??= [];
        data.planRuns ??= [];

        // v1.4 migration: the old four-day programme becomes the first saved plan.
        if (!data.plans.length) {
            const migratedPlanId = createId("plan");
            data.plans.push({
                id: migratedPlanId,
                name: "My Training Plan",
                durationWeeks: 8,
                days: structuredClone(data.days || defaultData.days),
                createdAt: new Date().toISOString()
            });
            data.activePlanId = migratedPlanId;
            data.selectedPlanId = migratedPlanId;
        }

        data.activePlanId ??= data.plans[0]?.id || null;
        data.selectedPlanId ??= data.activePlanId;
        const activePlan = data.plans.find(plan => plan.id === data.activePlanId) || data.plans[0];
        if (activePlan) data.days = activePlan.days;

        data.exercises.forEach(exercise => {
            exercise.defaultSets = normalizePositiveInteger(exercise.defaultSets, 3);
            exercise.notes ??= "";
            exercise.guideMedia ??= "";
            exercise.exerciseDbId ??= "";
            exercise.exerciseDbName ??= "";
            exercise.exerciseDbGifUrl ??= "";
            exercise.exerciseDbBodyParts ??= [];
            exercise.exerciseDbTargetMuscles ??= [];
            exercise.exerciseDbSecondaryMuscles ??= [];
            exercise.exerciseDbEquipments ??= [];
            exercise.exerciseDbInstructions ??= [];
            exercise.youtubeUrl ??= "";
            exercise.exerciseDbManualMatch ??= false;
            exercise.exerciseDbMatchVersion ??= 0;
            exercise.primaryMuscles = [...new Set((exercise.primaryMuscles || []).map(item => String(item || "").trim()).filter(Boolean))];
            exercise.secondaryMuscles = [...new Set((exercise.secondaryMuscles || []).map(item => String(item || "").trim()).filter(Boolean))];
            exercise.equipment = [...new Set((exercise.equipment || []).map(canonicalizeEquipmentName).filter(Boolean))];
            ensureExerciseProgressionDefaults(exercise);

            if (exercise.exerciseDbMatchVersion < 3 && !exercise.exerciseDbManualMatch) {
                exercise.exerciseDbId = "";
                exercise.exerciseDbName = "";
                exercise.exerciseDbGifUrl = "";
                exercise.exerciseDbBodyParts = [];
                exercise.exerciseDbTargetMuscles = [];
                exercise.exerciseDbSecondaryMuscles = [];
                exercise.exerciseDbEquipments = [];
                exercise.exerciseDbInstructions = [];
                exercise.exerciseDbMatchVersion = 3;
            }
        });

        repairPlanExerciseReferences(data);

        return data;
    }

    function normalizePositiveInteger(value, fallback) {
        const number = Number(value);
        return Number.isInteger(number) && number > 0 ? number : fallback;
    }

    function normalizePositiveNumber(value, fallback, minimum = 0) {
        const number = Number(value);
        return Number.isFinite(number) && number >= minimum ? number : fallback;
    }

    function canonicalizeEquipmentName(value) {
        const key = String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        return EQUIPMENT_ALIASES.get(key) || String(value || "").trim();
    }

    function repairExerciseRecord(exercise) {
        if (!exercise) return;
        exercise.defaultSets = normalizePositiveInteger(exercise.defaultSets, 3);
        exercise.primaryMuscles = [...new Set((exercise.primaryMuscles || []).map(item => String(item || "").trim()).filter(Boolean))];
        exercise.secondaryMuscles = [...new Set((exercise.secondaryMuscles || []).map(item => String(item || "").trim()).filter(Boolean))];
        exercise.equipment = [...new Set((exercise.equipment || []).map(canonicalizeEquipmentName).filter(Boolean))];
        ensureExerciseProgressionDefaults(exercise);
        ensureExerciseTags(exercise);
    }

    function repairPlanExerciseReferences(data) {
        const validExerciseIds = new Set((data.exercises || []).map(exercise => exercise?.id).filter(Boolean));
        (data.plans || []).forEach(plan => {
            (plan.days || []).forEach(day => {
                const seen = new Set();
                day.exerciseIds = (day.exerciseIds || []).filter(exerciseId => {
                    if (!validExerciseIds.has(exerciseId) || seen.has(exerciseId)) return false;
                    seen.add(exerciseId);
                    return true;
                });
            });
        });
        (data.days || []).forEach(day => {
            const seen = new Set();
            day.exerciseIds = (day.exerciseIds || []).filter(exerciseId => {
                if (!validExerciseIds.has(exerciseId) || seen.has(exerciseId)) return false;
                seen.add(exerciseId);
                return true;
            });
        });
    }

    function validateTrackerBackupShape(data) {
        if (!data || typeof data !== "object" || Array.isArray(data)) {
            return "Backup must contain a tracker data object.";
        }

        const requiredArrays = ["exercises", "workouts", "bodyEntries"];
        const missingArray = requiredArrays.find(key => !Array.isArray(data[key]));
        if (missingArray) {
            return `Backup is missing the ${missingArray} array.`;
        }

        const plans = Array.isArray(data.plans) ? data.plans : [];
        if (!Array.isArray(data.days) && !plans.some(plan => Array.isArray(plan?.days))) {
            return "Backup must contain workout days or plans with workout days.";
        }

        if (data.workouts.some(workout => !workout || typeof workout !== "object" || !Array.isArray(workout.exercises))) {
            return "Backup contains an invalid workout record.";
        }

        if (data.exercises.some(exercise => !exercise || typeof exercise !== "object" || typeof exercise.id !== "string")) {
            return "Backup contains an invalid exercise record.";
        }

        if (plans.some(plan => !plan || typeof plan !== "object" || typeof plan.id !== "string" || !Array.isArray(plan.days))) {
            return "Backup contains an invalid programme record.";
        }

        return "";
    }

    let trackerData = loadData();
    if (!trackerData.plans?.length) {
        const initialPlanId = createId("plan");
        trackerData.plans = [{ id:initialPlanId, name:"My Training Plan", durationWeeks:8, days:trackerData.days, createdAt:new Date().toISOString() }];
        trackerData.activePlanId = initialPlanId;
        trackerData.selectedPlanId = initialPlanId;
        trackerData.planRuns = [];
    }
    let temporaryWorkoutExerciseIds = [];
    let excludedWorkoutExerciseIds = [];
    let currentWorkoutIsFree = false;
    let selectedProgressMetric = "estimated1RM";
    let pendingWorkoutDraft = null;
    let workoutExtraSetCounts = {};
    let activeExerciseDetailId = null;
    let workoutCompleteCardIndex = 0;
    let workoutCompleteReturnPageId = "dashboardPage";
    let selectedChartRange = "ALL";
    let selectedMuscleBalanceRange = 7;
    let selectedMuscleBalanceName = "";
    let selectedPlateauFilter = "all";
    let selectedExerciseDetailMetric = "estimated1RM";
    let selectedBodyMetric = "weightKg";
    let selectedBodyRange = "ALL";
    let isBackupPanelExpanded = false;
    let isAccountPanelExpanded = false;
    let pendingEditRestartPlanId = null;
    let exerciseGuideStopTimer = null;
    let exerciseDbLibraryPromise = null;
    let exerciseDbLastError = null;
    const EXERCISEDB_CACHE_KEY = "metalsGymTrackerExerciseDbCacheV2";
    const EXERCISEDB_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

    function loadData() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return structuredClone(defaultData);

        let parsed;

        try {
            parsed = JSON.parse(stored);
        } catch (error) {
            console.error("Unable to parse saved data:", error);
            return structuredClone(defaultData);
        }

        if (!parsed || typeof parsed !== "object") {
            return structuredClone(defaultData);
        }

        try {
            return migrateTrackerDataObject(parsed);
        } catch (error) {
            console.error("Unable to migrate saved data. Using original stored data without resetting it:", error);
            parsed.days ??= structuredClone(defaultData.days);
            parsed.exercises ??= [];
            parsed.workouts ??= [];
            parsed.bodyEntries ??= [];
            parsed.plans ??= [];
            parsed.planRuns ??= [];
            return parsed;
        }
    }

    function saveData() {
        syncActivePlanDays();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trackerData));
        notifyCloudTrackerChanged("local-save");
    }

    function notifyCloudTrackerChanged(reason) {
        try {
            window.gymTrackerCloud?.handleLocalTrackerSaved?.(reason);
        } catch (error) {
            console.warn("Cloud sync notification failed after local save:", error);
        }
    }

    function getBackupDateStamp() {
        return getTodayDate();
    }

    function setBackupStatus(message, isError = false) {
        const status = document.getElementById("backupStatus");
        if (!status) return;
        status.textContent = message;
        status.classList.toggle("error", isError);
        if (message) renderBackupPanel(true);
    }

    function renderBackupPanel(expanded = isBackupPanelExpanded) {
        isBackupPanelExpanded = expanded;
        const panel = document.getElementById("dataBackupPanel");
        if (!panel) return;

        panel.classList.toggle("collapsed", !expanded);
        panel.classList.toggle("expanded", expanded);
        panel.querySelector(".data-backup-summary")?.setAttribute("aria-expanded", String(expanded));

        if (expanded) renderAccountPanel(false);
    }

    function toggleBackupPanel() {
        renderBackupPanel(!isBackupPanelExpanded);
    }

    function renderAccountPanel(expanded = isAccountPanelExpanded) {
        isAccountPanelExpanded = expanded;
        const panel = document.getElementById("accountMenuPanel");
        if (!panel) return;

        panel.classList.toggle("collapsed", !expanded);
        panel.classList.toggle("expanded", expanded);
        panel.querySelector(".account-menu-summary")?.setAttribute("aria-expanded", String(expanded));

        if (expanded) renderBackupPanel(false);
    }

    function toggleAccountPanel() {
        renderAccountPanel(!isAccountPanelExpanded);
    }

    function downloadJsonFile(data, filename) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function exportTrackerBackup() {
        try {
            syncActivePlanDays();
            const backupData = structuredClone(trackerData);
            downloadJsonFile(
                backupData,
                `metals-gym-tracker-backup-${getBackupDateStamp()}.json`
            );
            setBackupStatus(`Backup exported for ${getBackupDateStamp()}.`);
        } catch (error) {
            console.error("Unable to export backup:", error);
            setBackupStatus("Could not export backup. Your saved data was not changed.", true);
        }
    }

    function chooseTrackerBackupFile() {
        document.getElementById("backupRestoreInput")?.click();
    }

    async function restoreTrackerBackupFromFile(file) {
        if (!file) return;

        let parsed;
        try {
            parsed = JSON.parse(await file.text());
        } catch (error) {
            console.error("Invalid backup JSON:", error);
            setBackupStatus("Restore failed: choose a valid JSON backup file.", true);
            alert("Restore failed: that file is not valid JSON. Your current data was not changed.");
            return;
        }

        const validationError = validateTrackerBackupShape(parsed);
        if (validationError) {
            setBackupStatus(`Restore failed: ${validationError}`, true);
            alert(`Restore failed: ${validationError}\n\nYour current data was not changed.`);
            return;
        }

        let restoredData;
        try {
            restoredData = migrateTrackerDataObject(structuredClone(parsed));
        } catch (error) {
            console.error("Unable to prepare backup for restore:", error);
            setBackupStatus("Restore failed: backup could not be prepared. Current data was not changed.", true);
            alert("Restore failed: this backup could not be prepared safely. Your current data was not changed.");
            return;
        }

        if (!confirm("Restore this backup and replace the current tracker data?\n\nA safety backup of your current data will download first. Workout history in the selected backup will be restored.")) {
            setBackupStatus("Restore cancelled. Current data was not changed.");
            return;
        }

        const currentRaw = localStorage.getItem(STORAGE_KEY);
        let storageReplaced = false;

        try {
            syncActivePlanDays();
            downloadJsonFile(
                structuredClone(trackerData),
                `metals-gym-tracker-safety-before-restore-${getBackupDateStamp()}.json`
            );

            localStorage.setItem(STORAGE_KEY, JSON.stringify(restoredData));
            storageReplaced = true;
            trackerData = restoredData;
            temporaryWorkoutExerciseIds = [];
            excludedWorkoutExerciseIds = [];
            currentWorkoutIsFree = false;
            pendingWorkoutDraft = null;
            workoutExtraSetCounts = {};
            pendingEditRestartPlanId = null;
            renderAll();
            showPage("programmePage");
            notifyCloudTrackerChanged("manual-restore");
            setBackupStatus(`Backup restored from ${file.name}.`);
            alert("Backup restored successfully.");
        } catch (error) {
            console.error("Unable to restore backup:", error);
            if (storageReplaced) {
                if (currentRaw === null) localStorage.removeItem(STORAGE_KEY);
                else localStorage.setItem(STORAGE_KEY, currentRaw);
                trackerData = loadData();
                try { renderAll(); } catch {}
            }
            setBackupStatus("Restore failed. Current data was kept in place.", true);
            alert("Restore failed. Your current data was kept in place.");
        }
    }

    function getTrackerDataSnapshot() {
        syncActivePlanDays();
        return structuredClone(trackerData);
    }

    function prepareTrackerDataForSafeRestore(candidate) {
        const validationError = validateTrackerBackupShape(candidate);
        if (validationError) {
            return { error: validationError, data: null };
        }

        try {
            return {
                error: "",
                data: migrateTrackerDataObject(structuredClone(candidate))
            };
        } catch (error) {
            console.error("Unable to prepare tracker data for safe restore:", error);
            return {
                error: "Tracker data could not be prepared safely.",
                data: null
            };
        }
    }

    function resetRuntimeWorkoutState() {
        temporaryWorkoutExerciseIds = [];
        excludedWorkoutExerciseIds = [];
        currentWorkoutIsFree = false;
        pendingWorkoutDraft = null;
        workoutExtraSetCounts = {};
        pendingEditRestartPlanId = null;
    }

    function replaceLocalTrackerDataSafely(restoredData, sourceLabel = "cloud tracker") {
        const prepared = prepareTrackerDataForSafeRestore(restoredData);
        if (prepared.error) {
            return { ok: false, error: prepared.error };
        }

        const currentRaw = localStorage.getItem(STORAGE_KEY);
        let storageReplaced = false;

        try {
            downloadJsonFile(
                getTrackerDataSnapshot(),
                `metals-gym-tracker-safety-before-cloud-restore-${getBackupDateStamp()}.json`
            );

            localStorage.setItem(STORAGE_KEY, JSON.stringify(prepared.data));
            storageReplaced = true;
            trackerData = prepared.data;
            resetRuntimeWorkoutState();
            renderAll();
            showPage("homePage");
            setBackupStatus(`Local tracker restored from ${sourceLabel}.`);
            return { ok: true, error: "", data: prepared.data };
        } catch (error) {
            console.error("Unable to replace local tracker data safely:", error);
            if (storageReplaced) {
                if (currentRaw === null) localStorage.removeItem(STORAGE_KEY);
                else localStorage.setItem(STORAGE_KEY, currentRaw);
                trackerData = loadData();
                resetRuntimeWorkoutState();
                try { renderAll(); } catch {}
            }
            setBackupStatus("Cloud restore failed. Current local data was kept in place.", true);
            return { ok: false, error: "Cloud restore failed. Current local data was kept in place." };
        }
    }

    function replaceLocalTrackerDataFromCloudPull(restoredData) {
        const prepared = prepareTrackerDataForSafeRestore(restoredData);
        if (prepared.error) {
            return { ok: false, error: prepared.error };
        }

        const currentRaw = localStorage.getItem(STORAGE_KEY);
        let storageReplaced = false;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(prepared.data));
            storageReplaced = true;
            trackerData = prepared.data;
            resetRuntimeWorkoutState();
            renderAll();
            return { ok: true, error: "", data: prepared.data };
        } catch (error) {
            console.error("Unable to apply cloud pull safely:", error);
            if (storageReplaced) {
                if (currentRaw === null) localStorage.removeItem(STORAGE_KEY);
                else localStorage.setItem(STORAGE_KEY, currentRaw);
                trackerData = loadData();
                resetRuntimeWorkoutState();
                try { renderAll(); } catch {}
            }
            return { ok: false, error: "Cloud pull failed. Current local data was kept in place." };
        }
    }

    function syncActivePlanDays() {
        const activePlan = trackerData.plans?.find(plan => plan.id === trackerData.activePlanId);
        if (activePlan) activePlan.days = trackerData.days;
    }

    function syncEditedPlanToActiveDays(plan) {
        if (plan) plan.days ??= [];
        if (plan?.id === trackerData.activePlanId) {
            trackerData.days = plan.days;
        }
    }

    function saveProgrammeEdit(plan, preferredProgrammeDayId = "") {
        syncEditedPlanToActiveDays(plan);
        saveData();
        renderAll();
        if (preferredProgrammeDayId && plan?.days?.some(day => day.id === preferredProgrammeDayId)) {
            const select = document.getElementById("newExerciseDay");
            if (select) select.value = preferredProgrammeDayId;
        }
    }

    function getActivePlan() {
        const plan = trackerData.plans?.find(plan => plan.id === trackerData.activePlanId) || null;
        if (plan) plan.days ??= [];
        return plan;
    }

    function getSelectedPlan() {
        const plan = trackerData.plans?.find(plan => plan.id === trackerData.selectedPlanId) || getActivePlan();
        if (plan) plan.days ??= [];
        return plan;
    }

    function getActivePlanRun() {
        const plan = getActivePlan();
        if (!plan) return null;
        return [...(trackerData.planRuns || [])].reverse().find(run => run.planId === plan.id && !run.completedAt) || null;
    }

    function ensureActivePlanRun() {
        const plan = getActivePlan();
        if (!plan) return null;
        let run = getActivePlanRun();
        if (!run) {
            run = { id: createId("run"), planId: plan.id, startedAt: new Date().toISOString(), completedAt: null };
            trackerData.planRuns.push(run);
        }
        return run;
    }

    function createId(prefix) {
        return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function getTodayDate() {
        const now = new Date();
        const offset = now.getTimezoneOffset();
        return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
    }

    function showPage(pageId) {
        document.querySelectorAll(".page").forEach(page => {
            page.classList.toggle("active", page.id === pageId);
        });

        document.querySelectorAll(".nav-button").forEach(button => {
            button.classList.toggle("active", button.dataset.page === pageId);
        });

        if (pageId === "programmePage") renderProgramme();
        if (pageId === "workoutPage") renderWorkoutLogger();
        if (pageId === "libraryPage") renderLibrary();
        if (pageId === "progressPage") renderProgressPage();
        if (pageId === "bodyPage") renderBodyHistory();
    }

    document.querySelectorAll(".nav-button").forEach(button => {
        button.addEventListener("click", () => showPage(button.dataset.page));
    });

    const MUSCLE_GROUPS = {
        "Back": ["Lats", "Upper Back", "Traps", "Lower Back"],
        "Chest": ["Chest", "Upper Chest", "Lower Chest"],
        "Shoulders": ["Front Delts", "Side Delts", "Rear Delts"],
        "Biceps": ["Biceps", "Brachialis"],
        "Triceps": ["Triceps"],
        "Legs": ["Quads", "Hamstrings", "Glutes", "Calves", "Adductors", "Abductors"],
        "Core": ["Abs", "Obliques", "Lower Back"],
        "Forearms": ["Forearms"]
    };

    // Our own local catalogue. It is intentionally simple and can grow over time.
    const EXERCISE_CATALOGUE = [
        ["lat pulldown","Back",["Lats"],["Biceps","Upper Back"],["Cable"]],
        ["wide grip lat pulldown","Back",["Lats"],["Biceps","Upper Back"],["Cable"]],
        ["close grip lat pulldown","Back",["Lats"],["Biceps","Upper Back"],["Cable"]],
        ["straight arm pulldown","Back",["Lats"],["Upper Back"],["Cable"]],
        ["cable row","Back",["Upper Back"],["Lats","Biceps","Rear Delts"],["Cable"]],
        ["barbell row","Back",["Upper Back"],["Lats","Biceps","Rear Delts"],["Barbell"]],
        ["dumbbell row","Back",["Lats"],["Upper Back","Biceps","Rear Delts"],["Dumbbell"]],
        ["chest supported row","Back",["Upper Back"],["Lats","Biceps","Rear Delts"],["Machine"]],
        ["t bar row","Back",["Upper Back"],["Lats","Biceps","Rear Delts"],["Machine"]],
        ["machine row","Back",["Upper Back"],["Lats","Biceps","Rear Delts"],["Machine"]],
        ["high row","Back",["Upper Back"],["Lats","Rear Delts","Biceps"],["Machine"]],
        ["low row","Back",["Lats"],["Upper Back","Biceps"],["Machine"]],
        ["pull up","Back",["Lats"],["Biceps","Upper Back"],["Bodyweight"]],
        ["chin up","Back",["Lats"],["Biceps","Upper Back"],["Bodyweight"]],
        ["shrugs","Back",["Traps"],["Upper Back"],["Barbell"]],
        ["dumbbell shrug","Back",["Traps"],["Upper Back"],["Dumbbell"]],
        ["back extension","Back",["Lower Back"],["Glutes","Hamstrings"],["Bodyweight"]],
        ["deadlift","Back",["Lower Back"],["Glutes","Hamstrings","Traps"],["Barbell"]],
        ["romanian deadlift","Legs",["Hamstrings"],["Glutes","Lower Back"],["Barbell"]],

        ["bench press","Chest",["Chest"],["Triceps","Front Delts"],["Barbell"]],
        ["dumbbell bench press","Chest",["Chest"],["Triceps","Front Delts"],["Dumbbell"]],
        ["incline bench press","Chest",["Upper Chest"],["Triceps","Front Delts"],["Barbell"]],
        ["incline dumbbell press","Chest",["Upper Chest"],["Triceps","Front Delts"],["Dumbbell"]],
        ["decline bench press","Chest",["Lower Chest"],["Triceps","Front Delts"],["Barbell"]],
        ["chest press","Chest",["Chest"],["Triceps","Front Delts"],["Machine"]],
        ["cable fly","Chest",["Chest"],["Front Delts"],["Cable"]],
        ["dumbbell fly","Chest",["Chest"],["Front Delts"],["Dumbbell"]],
        ["pec deck","Chest",["Chest"],["Front Delts"],["Machine"]],
        ["push up","Chest",["Chest"],["Triceps","Front Delts"],["Bodyweight"]],
        ["dips","Chest",["Lower Chest"],["Triceps","Front Delts"],["Bodyweight"]],

        ["shoulder press","Shoulders",["Front Delts"],["Side Delts","Triceps"],["Machine"]],
        ["overhead press","Shoulders",["Front Delts"],["Side Delts","Triceps"],["Barbell"]],
        ["dumbbell shoulder press","Shoulders",["Front Delts"],["Side Delts","Triceps"],["Dumbbell"]],
        ["arnold press","Shoulders",["Front Delts"],["Side Delts","Triceps"],["Dumbbell"]],
        ["lateral raise","Shoulders",["Side Delts"],[],["Dumbbell"]],
        ["cable lateral raise","Shoulders",["Side Delts"],[],["Cable"]],
        ["front raise","Shoulders",["Front Delts"],["Side Delts"],["Dumbbell"]],
        ["reverse fly","Shoulders",["Rear Delts"],["Upper Back"],["Dumbbell"]],
        ["rear delt fly","Shoulders",["Rear Delts"],["Upper Back"],["Machine"]],
        ["face pull","Shoulders",["Rear Delts"],["Upper Back","Traps"],["Cable"]],
        ["upright row","Shoulders",["Side Delts"],["Traps","Biceps"],["Barbell"]],

        ["barbell curl","Biceps",["Biceps"],["Brachialis","Forearms"],["Barbell"]],
        ["ez bar curl","Biceps",["Biceps"],["Brachialis","Forearms"],["EZ Bar"]],
        ["dumbbell curl","Biceps",["Biceps"],["Brachialis","Forearms"],["Dumbbell"]],
        ["hammer curl","Biceps",["Brachialis"],["Biceps","Forearms"],["Dumbbell"]],
        ["incline dumbbell curl","Biceps",["Biceps"],["Brachialis"],["Dumbbell"]],
        ["preacher curl","Biceps",["Biceps"],["Brachialis"],["EZ Bar"]],
        ["cable curl","Biceps",["Biceps"],["Brachialis","Forearms"],["Cable"]],
        ["concentration curl","Biceps",["Biceps"],["Brachialis"],["Dumbbell"]],
        ["spider curl","Biceps",["Biceps"],["Brachialis"],["EZ Bar"]],

        ["tricep pushdown","Triceps",["Triceps"],[],["Cable"]],
        ["rope pushdown","Triceps",["Triceps"],[],["Cable"]],
        ["overhead cable extension","Triceps",["Triceps"],[],["Cable"]],
        ["dumbbell overhead extension","Triceps",["Triceps"],[],["Dumbbell"]],
        ["skull crushers","Triceps",["Triceps"],[],["EZ Bar"]],
        ["close grip bench press","Triceps",["Triceps"],["Chest","Front Delts"],["Barbell"]],
        ["tricep dips","Triceps",["Triceps"],["Chest","Front Delts"],["Bodyweight"]],
        ["single arm cable extension","Triceps",["Triceps"],[],["Cable"]],

        ["back squat","Legs",["Quads"],["Glutes","Hamstrings"],["Barbell"]],
        ["front squat","Legs",["Quads"],["Glutes"],["Barbell"]],
        ["hack squat","Legs",["Quads"],["Glutes"],["Machine"]],
        ["leg press","Legs",["Quads"],["Glutes","Hamstrings"],["Machine"]],
        ["leg extension","Legs",["Quads"],[],["Machine"]],
        ["leg curl","Legs",["Hamstrings"],[],["Machine"]],
        ["seated leg curl","Legs",["Hamstrings"],[],["Machine"]],
        ["lying leg curl","Legs",["Hamstrings"],[],["Machine"]],
        ["stiff leg deadlift","Legs",["Hamstrings"],["Glutes","Lower Back"],["Dumbbell"]],
        ["bulgarian split squat","Legs",["Quads"],["Glutes","Hamstrings"],["Dumbbell"]],
        ["walking lunge","Legs",["Quads"],["Glutes","Hamstrings"],["Dumbbell"]],
        ["reverse lunge","Legs",["Quads"],["Glutes","Hamstrings"],["Dumbbell"]],
        ["goblet squat","Legs",["Quads"],["Glutes"],["Dumbbell"]],
        ["hip thrust","Legs",["Glutes"],["Hamstrings"],["Barbell"]],
        ["glute bridge","Legs",["Glutes"],["Hamstrings"],["Bodyweight"]],
        ["standing calf raise","Legs",["Calves"],[],["Machine"]],
        ["seated calf raise","Legs",["Calves"],[],["Machine"]],
        ["adductor machine","Legs",["Adductors"],[],["Machine"]],
        ["abductor machine","Legs",["Abductors"],["Glutes"],["Machine"]],

        ["crunch","Core",["Abs"],[],["Bodyweight"]],
        ["cable crunch","Core",["Abs"],[],["Cable"]],
        ["leg raise","Core",["Abs"],[],["Bodyweight"]],
        ["hanging leg raise","Core",["Abs"],[],["Bodyweight"]],
        ["ab wheel","Core",["Abs"],["Obliques"],["Bodyweight"]],
        ["plank","Core",["Abs"],["Obliques"],["Bodyweight"]],
        ["russian twist","Core",["Obliques"],["Abs"],["Bodyweight"]],
        ["bicycle crunch","Core",["Abs"],["Obliques"],["Bodyweight"]],

        ["wrist curl","Forearms",["Forearms"],[],["Dumbbell"]],
        ["reverse wrist curl","Forearms",["Forearms"],[],["Dumbbell"]],
        ["reverse curl","Forearms",["Forearms"],["Biceps"],["Barbell"]],
        ["farmer's walk","Forearms",["Forearms"],["Traps","Core"],["Dumbbell"]]
    ].map(([name, category, primary, secondary, equipment]) => ({
        name, category, primary, secondary, equipment
    }));

    function normalizeExerciseName(value) {
        const normalized = String(value || "")
            .toLowerCase()
            .replace(/\([^)]*\)/g, " ")
            .replace(/&/g, " and ")
            .replace(/\bpull\s+down\b/g, "pulldown")
            .replace(/\bpush[-\s]+up\b/g, "push up")
            .replace(/\bpull[-\s]+up\b/g, "pull up")
            .replace(/\bchin[-\s]+up\b/g, "chin up")
            .replace(/\bsit[-\s]+up\b/g, "sit up")
            .replace(/\bone\s+arm\b/g, "single arm")
            .replace(/\bdb\b/g, "dumbbell")
            .replace(/\bbb\b/g, "barbell")
            .replace(/\brdl\b/g, "romanian deadlift")
            .replace(/\bohp\b/g, "overhead press")
            .replace(/\btriceps\b/g, "tricep")
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\b(test|machine loaded|plate loaded)\b/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        return EXERCISE_NAME_ALIASES.get(normalized) || normalized;
    }

    function toTitleCaseExerciseName(value) {
        return String(value || "")
            .split(/\s+/)
            .filter(Boolean)
            .map(word => {
                const lower = word.toLowerCase();
                if (["ez", "rdl"].includes(lower)) return lower.toUpperCase();
                if (lower === "t") return "T";
                return lower.charAt(0).toUpperCase() + lower.slice(1);
            })
            .join(" ")
            .replace(/\bPulldown\b/g, "Pulldown");
    }

    function getPreferredExerciseName(value) {
        const preferred = {
            "bench press": "Bench Press",
            "dumbbell bench press": "Dumbbell Bench Press",
            "incline bench press": "Incline Bench Press",
            "incline dumbbell press": "Incline Dumbbell Press",
            "decline bench press": "Decline Bench Press",
            "lat pulldown": "Lat Pulldown",
            "wide grip lat pulldown": "Wide Grip Lat Pulldown",
            "close grip lat pulldown": "Close Grip Lat Pulldown",
            "straight arm pulldown": "Straight Arm Pulldown",
            "cable row": "Cable Row",
            "dumbbell row": "Dumbbell Row",
            "barbell row": "Barbell Row",
            "t bar row": "T-Bar Row",
            "romanian deadlift": "Romanian Deadlift",
            "overhead press": "Overhead Press",
            "dumbbell shoulder press": "Dumbbell Shoulder Press",
            "tricep pushdown": "Tricep Pushdown",
            "tricep dips": "Tricep Dips",
            "back squat": "Back Squat",
            "standing calf raise": "Standing Calf Raise",
            "adductor machine": "Adductor Machine",
            "abductor machine": "Abductor Machine",
            "farmer s walk": "Farmer's Walk"
        };
        const normalized = normalizeExerciseName(value);
        return preferred[normalized] || toTitleCaseExerciseName(normalized || value);
    }

    function scoreCatalogueName(query, candidate) {
        const q = normalizeExerciseName(query);
        const c = normalizeExerciseName(candidate);
        if (!q || !c) return 0;
        if (q === c) return 1000;
        if (q.includes(c) || c.includes(q)) return 650;
        const qt = q.split(" ");
        const ct = new Set(c.split(" "));
        const matches = qt.filter(t => ct.has(t)).length;
        return (matches / Math.max(qt.length, 1)) * 500 + matches * 35;
    }

    function inferExerciseTags(name) {
        const ranked = EXERCISE_CATALOGUE
            .map(item => ({ item, score: scoreCatalogueName(name, item.name) }))
            .sort((a,b) => b.score - a.score);

        if (ranked[0]?.score >= 420) {
            return {
                category: ranked[0].item.category,
                primaryMuscles: [...ranked[0].item.primary],
                secondaryMuscles: [...ranked[0].item.secondary],
                equipment: [...ranked[0].item.equipment],
                confidence: ranked[0].score >= 900 ? "Exact match" : "Suggested match"
            };
        }

        const n = normalizeExerciseName(name);
        if (/\b(row|pulldown|pull up|chin up|shrug)\b/.test(n))
            return {category:"Back", primaryMuscles:[n.includes("shrug")?"Traps":n.includes("pulldown")?"Lats":"Upper Back"], secondaryMuscles:["Biceps"], equipment:[], confidence:"Name guess"};
        if (/\b(curl)\b/.test(n) && !/\bleg curl\b/.test(n))
            return {category:"Biceps", primaryMuscles:["Biceps"], secondaryMuscles:["Forearms"], equipment:[], confidence:"Name guess"};
        if (/\b(lateral raise)\b/.test(n))
            return {category:"Shoulders", primaryMuscles:["Side Delts"], secondaryMuscles:[], equipment:[], confidence:"Name guess"};
        if (/\b(shoulder press|overhead press)\b/.test(n))
            return {category:"Shoulders", primaryMuscles:["Front Delts"], secondaryMuscles:["Side Delts","Triceps"], equipment:[], confidence:"Name guess"};
        if (/\b(bench|chest press|fly|flye)\b/.test(n))
            return {category:"Chest", primaryMuscles:[n.includes("incline")?"Upper Chest":"Chest"], secondaryMuscles:["Triceps","Front Delts"], equipment:[], confidence:"Name guess"};
        if (/\b(pushdown|tricep|triceps|skull crusher)\b/.test(n))
            return {category:"Triceps", primaryMuscles:["Triceps"], secondaryMuscles:[], equipment:[], confidence:"Name guess"};
        if (/\b(squat|leg press|leg extension|lunge)\b/.test(n))
            return {category:"Legs", primaryMuscles:["Quads"], secondaryMuscles:["Glutes"], equipment:[], confidence:"Name guess"};
        if (/\b(leg curl|rdl|romanian deadlift)\b/.test(n))
            return {category:"Legs", primaryMuscles:["Hamstrings"], secondaryMuscles:["Glutes"], equipment:[], confidence:"Name guess"};
        if (/\b(crunch|plank|ab|core)\b/.test(n))
            return {category:"Core", primaryMuscles:["Abs"], secondaryMuscles:[], equipment:[], confidence:"Name guess"};

        return {category:"Other", primaryMuscles:[], secondaryMuscles:[], equipment:[], confidence:"Needs review"};
    }

    function applyTagsToExercise(exercise, tags) {
        exercise.category = tags.category || "Other";
        exercise.primaryMuscles = [...(tags.primaryMuscles || [])];
        exercise.secondaryMuscles = [...(tags.secondaryMuscles || [])];
        exercise.equipment = [...(tags.equipment || [])];
        exercise.tagsAutoGenerated = true;
    }

    function ensureExerciseTags(exercise) {
        if (!exercise) return;
        exercise.primaryMuscles ??= [];
        exercise.secondaryMuscles ??= [];
        exercise.equipment ??= [];
        if (!exercise.category || exercise.category === "Other") {
            const inferred = inferExerciseTags(exercise.name);
            if (inferred.category !== "Other" || !exercise.category) applyTagsToExercise(exercise, inferred);
        }
    }

    function renderExerciseTagPreview() {
        const input = document.getElementById("newExerciseName");
        const preview = document.getElementById("exerciseTagPreview");
        if (!input || !preview) return;

        const name = input.value.trim();
        if (!name) {
            preview.innerHTML = `<div class="small-label">Automatic exercise tags</div>
                <div class="tag-preview-empty">Start typing an exercise name and I'll suggest its muscles.</div>`;
            return;
        }

        const tags = inferExerciseTags(name);
        const chips = [
            tags.category && tags.category !== "Other" ? `<span class="exercise-tag-chip category">${escapeHtml(tags.category)}</span>` : "",
            ...tags.primaryMuscles.map(m => `<span class="exercise-tag-chip primary">Primary · ${escapeHtml(m)}</span>`),
            ...tags.secondaryMuscles.map(m => `<span class="exercise-tag-chip">Secondary · ${escapeHtml(m)}</span>`),
            ...tags.equipment.map(m => `<span class="exercise-tag-chip equipment">${escapeHtml(m)}</span>`)
        ].filter(Boolean).join("");

        preview.innerHTML = `
            <div class="tag-preview-top">
                <div>
                    <div class="small-label">Automatic exercise tags</div>
                    <strong>${escapeHtml(tags.confidence)}</strong>
                </div>
                <button class="button secondary small" type="button" onclick="editNewExerciseTags()">Edit tags</button>
            </div>
            <div class="exercise-tag-chips">${chips || '<span class="tag-preview-empty">No confident tags yet — you can edit them manually.</span>'}</div>`;
        preview.dataset.tags = JSON.stringify(tags);
    }

    function editNewExerciseTags() {
        const preview = document.getElementById("exerciseTagPreview");
        const name = document.getElementById("newExerciseName").value.trim();
        if (!name) return alert("Enter an exercise name first.");

        const current = preview?.dataset.tags ? JSON.parse(preview.dataset.tags) : inferExerciseTags(name);
        const category = prompt("Body part / category:", current.category || "Other");
        if (category === null) return;
        const primary = prompt("Primary muscles (separate with commas):", (current.primaryMuscles || []).join(", "));
        if (primary === null) return;
        const secondary = prompt("Secondary muscles (separate with commas):", (current.secondaryMuscles || []).join(", "));
        if (secondary === null) return;
        const equipment = prompt("Equipment (separate with commas):", (current.equipment || []).join(", "));
        if (equipment === null) return;

        const tags = {
            category: category.trim() || "Other",
            primaryMuscles: primary.split(",").map(v=>v.trim()).filter(Boolean),
            secondaryMuscles: secondary.split(",").map(v=>v.trim()).filter(Boolean),
            equipment: equipment.split(",").map(v=>v.trim()).filter(Boolean),
            confidence: "Edited by you"
        };
        preview.dataset.tags = JSON.stringify(tags);

        const chips = [
            `<span class="exercise-tag-chip category">${escapeHtml(tags.category)}</span>`,
            ...tags.primaryMuscles.map(m => `<span class="exercise-tag-chip primary">Primary · ${escapeHtml(m)}</span>`),
            ...tags.secondaryMuscles.map(m => `<span class="exercise-tag-chip">Secondary · ${escapeHtml(m)}</span>`),
            ...tags.equipment.map(m => `<span class="exercise-tag-chip equipment">${escapeHtml(m)}</span>`)
        ].join("");

        preview.innerHTML = `
            <div class="tag-preview-top">
                <div><div class="small-label">Automatic exercise tags</div><strong>Edited by you</strong></div>
                <button class="button secondary small" type="button" onclick="editNewExerciseTags()">Edit tags</button>
            </div>
            <div class="exercise-tag-chips">${chips}</div>`;
        preview.dataset.tags = JSON.stringify(tags);
    }

    const EXERCISE_CATEGORY_ORDER = [
        "Back", "Biceps", "Shoulders", "Legs", "Chest", "Triceps",
        "Core", "Forearms", "Other"
    ];

    function getExerciseCategory(exercise) {
        ensureExerciseTags(exercise);
        if (exercise?.category && EXERCISE_CATEGORY_ORDER.includes(exercise.category)) {
            return exercise.category;
        }

        const primary = (exercise?.primaryMuscles || []).join(" ").toLowerCase();
        if (/lat|upper back|trap|lower back/.test(primary)) return "Back";
        if (/bicep|brachialis/.test(primary)) return "Biceps";
        if (/delt/.test(primary)) return "Shoulders";
        if (/quad|hamstring|glute|calf|adductor|abductor/.test(primary)) return "Legs";
        if (/chest/.test(primary)) return "Chest";
        if (/tricep/.test(primary)) return "Triceps";
        if (/abs|oblique/.test(primary)) return "Core";
        if (/forearm/.test(primary)) return "Forearms";
        return "Other";
    }

    function getExercisesGroupedByCategory() {
        const groups = Object.fromEntries(
            EXERCISE_CATEGORY_ORDER.map(category => [category, []])
        );

        trackerData.exercises.forEach(exercise => {
            groups[getExerciseCategory(exercise)].push(exercise);
        });

        EXERCISE_CATEGORY_ORDER.forEach(category => {
            groups[category].sort((a, b) => a.name.localeCompare(b.name));
        });

        return groups;
    }

    function buildGroupedExerciseOptions(placeholder) {
        const groups = getExercisesGroupedByCategory();
        let html = `<option value="">${escapeHtml(placeholder)}</option>`;

        EXERCISE_CATEGORY_ORDER.forEach(category => {
            const exercises = groups[category];
            if (!exercises.length) return;

            html += `<optgroup label="${escapeHtml(category)}">`;
            html += exercises.map(exercise =>
                `<option value="${exercise.id}">${escapeHtml(exercise.name)}</option>`
            ).join("");
            html += `</optgroup>`;
        });

        return html;
    }

    function selectPlan(planId) {
        syncActivePlanDays();
        if (!trackerData.plans.some(plan => plan.id === planId)) return;
        trackerData.selectedPlanId = planId;
        saveData();
        populateSelectors();
        renderProgramme();
    }

    function activatePlan(planId) {
        syncActivePlanDays();
        const plan = trackerData.plans.find(item => item.id === planId);
        if (!plan) return;
        trackerData.activePlanId = planId;
        trackerData.selectedPlanId = planId;
        trackerData.days = plan.days;
        temporaryWorkoutExerciseIds = [];
        excludedWorkoutExerciseIds = [];
        workoutExtraSetCounts = {};
        ensureActivePlanRun();
        saveData();
        renderAll();
    }

    function createPlan() {
        const name = prompt("Name your new workout plan:", "New Training Plan");
        if (name === null || !name.trim()) return;
        const weeksAnswer = prompt("How many weeks do you want to run this plan?", "8");
        if (weeksAnswer === null) return;
        const durationWeeks = Number(weeksAnswer);
        if (!Number.isInteger(durationWeeks) || durationWeeks < 1 || durationWeeks > 104) {
            alert("Plan length must be between 1 and 104 weeks."); return;
        }
        const plan = { id:createId("plan"), name:name.trim(), durationWeeks, days:[], createdAt:new Date().toISOString() };
        trackerData.plans.push(plan);
        trackerData.selectedPlanId = plan.id;
        saveData(); populateSelectors(); renderProgramme();
    }

    function editSelectedPlan() {
        const plan = getSelectedPlan(); if (!plan) return;
        const name = prompt("Plan name:", plan.name); if (name === null || !name.trim()) return;
        const weeksAnswer = prompt("Plan length in weeks:", String(plan.durationWeeks || 8)); if (weeksAnswer === null) return;
        const weeks = Number(weeksAnswer);
        if (!Number.isInteger(weeks) || weeks < 1 || weeks > 104) { alert("Plan length must be between 1 and 104 weeks."); return; }
        plan.name = name.trim(); plan.durationWeeks = weeks;
        saveData(); renderAll();
    }

    function deleteSelectedPlan() {
        const plan = getSelectedPlan(); if (!plan) return;
        if (trackerData.plans.length === 1) { alert("Keep at least one plan. You can edit this one instead."); return; }
        if (!confirm(`Delete the plan “${plan.name}”?\n\nYour saved workout and exercise history will NOT be deleted.`)) return;
        trackerData.plans = trackerData.plans.filter(item => item.id !== plan.id);
        if (trackerData.activePlanId === plan.id) {
            const next = trackerData.plans[0]; trackerData.activePlanId = next.id; trackerData.days = next.days;
        }
        trackerData.selectedPlanId = trackerData.activePlanId;
        saveData(); renderAll();
    }

    function restartActivePlan(editFirst = false) {
        const plan = getActivePlan(); if (!plan) return;
        if (editFirst) {
            pendingEditRestartPlanId = plan.id;
            trackerData.selectedPlanId = plan.id;
            renderProgramme();
            alert("Edit the active programme, then use Start fresh run to restart from Week 1 / Day 1. Workout history will stay saved.");
            return;
        }
        const current = getActivePlanRun(); if (current) current.completedAt = new Date().toISOString();
        const run = { id:createId("run"), planId:plan.id, startedAt:new Date().toISOString(), completedAt:null };
        trackerData.planRuns.push(run); saveData(); renderAll();
    }

    function confirmEditRestartActivePlan() {
        const plan = getActivePlan(); if (!plan) return;
        if (!confirm(`Start a fresh run of “${plan.name}” from Week 1 / Day 1?\n\nSaved workout history will remain.`)) return;
        const current = getActivePlanRun(); if (current) current.completedAt = new Date().toISOString();
        const run = { id:createId("run"), planId:plan.id, startedAt:new Date().toISOString(), completedAt:null };
        trackerData.planRuns.push(run);
        pendingEditRestartPlanId = null;
        saveData();
        renderAll();
    }

    function cancelEditRestart() {
        pendingEditRestartPlanId = null;
        renderProgramme();
    }

    function createWorkoutDayForPlan(plan, name) {
        const dayNumber = plan.days.length + 1;
        const day = { id:createId("day"), label:`Day ${dayNumber}`, name:name || `Day ${dayNumber}`, exerciseIds:[] };
        plan.days.push(day);
        plan.days.forEach((item,index) => item.label = `Day ${index+1}`);
        return day;
    }

    function addPlanDay() {
        const plan = getSelectedPlan(); if (!plan) return;
        const name = prompt("Name this workout day:", `Day ${plan.days.length + 1}`);
        if (name === null || !name.trim()) return;
        const day = createWorkoutDayForPlan(plan, name.trim());
        saveProgrammeEdit(plan, day.id);
    }

    function addDefaultPlanDay() {
        const plan = getSelectedPlan(); if (!plan) return alert("Choose or create a programme first.");
        const day = createWorkoutDayForPlan(plan, `Day ${plan.days.length + 1}`);
        saveProgrammeEdit(plan, day.id);
    }

    function renamePlanDay(dayId) {
        const plan = getSelectedPlan(); if (!plan) return;
        const day = plan.days.find(item => item.id === dayId); if (!day) return;
        const name = prompt("Workout day name:", day.name); if (name === null || !name.trim()) return;
        day.name = name.trim(); saveProgrammeEdit(plan);
    }

    function deletePlanDay(dayId) {
        const plan = getSelectedPlan(); if (!plan) return;
        const day = plan.days.find(item => item.id === dayId); if (!day) return;
        if (!confirm(`Delete ${day.label} — ${day.name} from this plan?\n\nSaved workout history will remain.`)) return;
        plan.days = plan.days.filter(item => item.id !== dayId);
        plan.days.forEach((item,index) => item.label = `Day ${index+1}`);
        saveProgrammeEdit(plan);
    }

    function movePlanDay(dayId, direction) {
        const plan = getSelectedPlan(); if (!plan) return;
        const index = plan.days.findIndex(item => item.id === dayId); if (index < 0) return;
        const next = index + direction; if (next < 0 || next >= plan.days.length) return;
        [plan.days[index], plan.days[next]] = [plan.days[next], plan.days[index]];
        plan.days.forEach((item,i) => item.label = `Day ${i+1}`);
        saveProgrammeEdit(plan);
    }

    function swapPlanDays() {
        const plan = getSelectedPlan(); if (!plan) return;
        if (plan.days.length < 2) return alert("Add at least two workout days first.");
        const list = plan.days.map((d,i)=>`${i+1}. ${d.name}`).join("\n");
        const a = Number(prompt(`Which day do you want to move?\n\n${list}`, "1")) - 1;
        if (!Number.isInteger(a) || !plan.days[a]) return;
        const b = Number(prompt(`Swap ${plan.days[a].name} with which day?\n\n${list}`, String(a===0?2:1))) - 1;
        if (!Number.isInteger(b) || !plan.days[b] || a===b) return;
        [plan.days[a],plan.days[b]]=[plan.days[b],plan.days[a]];
        plan.days.forEach((d,i)=>d.label=`Day ${i+1}`);
        saveProgrammeEdit(plan);
    }

    function getPlanProgress(plan) {
        if (!plan || plan.id !== trackerData.activePlanId) return {completed:0,total:(plan?.durationWeeks||0)*(plan?.days?.length||0),week:1};
        const run = getActivePlanRun();
        const completed = run ? trackerData.workouts.filter(w => w.planRunId === run.id).length : 0;
        const daysPerWeek = Math.max(1, plan.days.length);
        return { completed, total: plan.durationWeeks * plan.days.length, week: Math.min(plan.durationWeeks, Math.floor(completed/daysPerWeek)+1) };
    }

    function populateSelectors() {
        const selectedPlan = getSelectedPlan();
        const programmeDays = selectedPlan?.days || [];
        const programmeDayOptions = programmeDays.map(day => `
            <option value="${day.id}">${escapeHtml(day.label)} — ${escapeHtml(day.name)}</option>
        `).join("");

        const dayOptions = trackerData.days.map(day => `
            <option value="${day.id}">${escapeHtml(day.label)} — ${escapeHtml(day.name)}</option>
        `).join("");

        const programmeDaySelect = document.getElementById("newExerciseDay");
        const currentProgrammeDay = programmeDaySelect.value;
        const currentWorkoutDay = document.getElementById("workoutDaySelect").value;

        programmeDaySelect.innerHTML = programmeDayOptions || `<option value="">Add a workout day first</option>`;
        programmeDaySelect.disabled = programmeDays.length === 0;
        const emptyPlanDayButton = document.getElementById("emptyPlanDayButton");
        if (emptyPlanDayButton) emptyPlanDayButton.hidden = programmeDays.length > 0;
        const exercisePickerOpenButton = document.getElementById("exercisePickerOpenButton");
        if (exercisePickerOpenButton) exercisePickerOpenButton.disabled = programmeDays.length === 0;
        document.getElementById("workoutDaySelect").innerHTML = dayOptions;

        if (programmeDays.some(day => day.id === currentProgrammeDay)) {
            programmeDaySelect.value = currentProgrammeDay;
        } else {
            programmeDaySelect.value = programmeDays[0]?.id || "";
        }

        if (trackerData.days.some(day => day.id === currentWorkoutDay)) {
            document.getElementById("workoutDaySelect").value = currentWorkoutDay;
        }

        document.getElementById("workoutExerciseSelect").innerHTML =
            buildGroupedExerciseOptions("Choose from library");

        const currentProgressId = document.getElementById("progressExerciseSelect").value;
        document.getElementById("progressExerciseSelect").innerHTML =
            buildGroupedExerciseOptions("Choose an exercise");

        if (trackerData.exercises.some(ex => ex.id === currentProgressId)) {
            document.getElementById("progressExerciseSelect").value = currentProgressId;
        }
    }

    function renderDashboard() {
        const latestBodyEntry = [...trackerData.bodyEntries]
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

        document.getElementById("dashboardWeight").textContent =
            latestBodyEntry ? `${latestBodyEntry.weightKg.toFixed(2)} kg` : "No entry";

        document.getElementById("dashboardBodyFat").textContent =
            latestBodyEntry ? `${latestBodyEntry.bodyFat.toFixed(1)}%` : "No entry";

        document.getElementById("dashboardWaist").textContent =
            latestBodyEntry ? `${latestBodyEntry.waistCm.toFixed(1)} cm` : "No entry";

        document.getElementById("dashboardWorkoutCount").textContent = trackerData.workouts.length;

        const activePlan = getActivePlan();
        const planBox = document.getElementById("dashboardActivePlan");
        if (activePlan && planBox) {
            const progress = getPlanProgress(activePlan);
            const nextDay = activePlan.days.length ? activePlan.days[progress.completed % activePlan.days.length] : null;
            planBox.innerHTML = `<article class="active-plan-card"><div><div class="small-label">Active programme</div><h2>${escapeHtml(activePlan.name)}</h2><p>Week ${progress.week} of ${activePlan.durationWeeks} · ${progress.completed} / ${progress.total} planned workouts completed</p>${nextDay ? `<strong>Next: ${escapeHtml(nextDay.label)} — ${escapeHtml(nextDay.name)}</strong>` : '<strong>Add a workout day to begin.</strong>'}</div>${nextDay ? `<button class="button" onclick="startWorkout('${nextDay.id}')">Start next workout</button>` : `<button class="button secondary" onclick="showPage('programmePage')">Edit plan</button>`}</article>`;
        }

        document.getElementById("dashboardDays").innerHTML = trackerData.days.map(day => {
            const names = day.exerciseIds
                .map(id => trackerData.exercises.find(ex => ex.id === id))
                .filter(Boolean)
                .map(ex => ex.name);

            return `
                <article class="day-card">
                    <div class="day-number">${escapeHtml(day.label)}</div>
                    <h3>${escapeHtml(day.name)}</h3>
                    <p>${escapeHtml(names.length ? names.join(", ") : "No exercises added yet.")}</p>
                    <button class="button full" onclick="startWorkout('${day.id}')">Start workout</button>
                </article>
            `;
        }).join("");

        renderRecentWorkouts();
    }

    function renderRecentWorkouts() {
        const container = document.getElementById("dashboardRecentWorkouts");
        if (!container) return;

        const recent = [...trackerData.workouts]
            .sort((a, b) => {
                const dateCompare = new Date(b.date) - new Date(a.date);
                return dateCompare || new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            })
            .slice(0, 10);

        if (!recent.length) {
            container.innerHTML = `
                <div class="panel">
                    <p class="empty-message">No workouts have been saved yet.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = recent.map(workout => {
            const day = trackerData.days.find(item => item.id === workout.dayId);
            const workoutLabel = workout.isFreeWorkout ? "Extra" : day?.label || "Workout";
            const workoutName = workout.isFreeWorkout ? "Extra Workout" : day?.name || "Workout";
            const totals = getWorkoutTotals(workout);
            const exerciseNames = workout.exercises
                .map(item => trackerData.exercises.find(exercise => exercise.id === item.exerciseId)?.name)
                .filter(Boolean);

            return `
                <article class="recent-workout-card">
                    <div class="recent-workout-main">
                        <div class="day-number">${escapeHtml(workoutLabel)}</div>
                        <h3>${escapeHtml(workoutName)}</h3>
                        <div class="recent-workout-date">${escapeHtml(workout.date)}</div>
                        <div class="recent-workout-exercises">
                            ${escapeHtml(exerciseNames.join(", ") || "No exercises")}
                        </div>
                    </div>

                    <div class="recent-workout-stats">
                        <span>${totals.exercises} exercises</span>
                        <span>${totals.sets} sets</span>
                        <span>${totals.reps} reps</span>
                        <span>${Math.round(totals.volume).toLocaleString()} kg</span>
                    </div>

                    <div class="recent-workout-actions">
                        <button class="button secondary small" type="button"
                            onclick="openSavedWorkoutReview('${workout.id}', 'dashboardPage')">
                            Review
                        </button>
                        <button class="button danger small" type="button"
                            onclick="deleteWorkout('${workout.id}', 'dashboardPage')">
                            Delete workout
                        </button>
                    </div>
                </article>
            `;
        }).join("");
    }

    function findOrCreateExercise(name, sets) {
        let exercise = trackerData.exercises.find(
            item => normalizeExerciseName(item.name) === normalizeExerciseName(name)
        );

        if (!exercise) {
            exercise = {
                id: createId("exercise"),
                name: getPreferredExerciseName(name),
                defaultSets: sets,
                createdAt: new Date().toISOString(),
                notes: "",
                guideMedia: "",
                exerciseDbId: "",
                exerciseDbName: "",
                exerciseDbGifUrl: "",
                exerciseDbBodyParts: [],
                exerciseDbTargetMuscles: [],
                exerciseDbSecondaryMuscles: [],
                exerciseDbEquipments: [],
                exerciseDbInstructions: [],
                youtubeUrl: "",
                exerciseDbManualMatch: false,
                exerciseDbMatchVersion: 3,
                progression: structuredClone(DEFAULT_PROGRESSION)
            };
            ensureExerciseProgressionDefaults(exercise);
            applyTagsToExercise(exercise, inferExerciseTags(name));
            trackerData.exercises.push(exercise);
        } else {
            exercise.defaultSets = sets;
            exercise.name = getPreferredExerciseName(exercise.name);
            repairExerciseRecord(exercise);
            ensureExerciseTags(exercise);
            ensureExerciseProgressionDefaults(exercise);
        }

        return exercise;
    }

    function addExercise() {
        const name = document.getElementById("newExerciseName").value.trim();
        const dayId = document.getElementById("newExerciseDay").value;
        const sets = Number(document.getElementById("newExerciseSets").value);

        if (!name) return alert("Enter an exercise name.");
        if (!Number.isInteger(sets) || sets < 1 || sets > 10) {
            return alert("Sets must be between 1 and 10.");
        }

        const exercise = findOrCreateExercise(name, sets);
        const preview = document.getElementById("exerciseTagPreview");
        if (preview?.dataset.tags) {
            try {
                const chosenTags = JSON.parse(preview.dataset.tags);
                applyTagsToExercise(exercise, chosenTags);
                exercise.tagsAutoGenerated = chosenTags.confidence !== "Edited by you";
            } catch {}
        }

        const plan = getSelectedPlan();
        const day = plan?.days.find(item => item.id === dayId);
        if (!day) return alert("Choose a workout day.");
        if (!day.exerciseIds.includes(exercise.id)) day.exerciseIds.push(exercise.id);

        syncEditedPlanToActiveDays(plan);
        saveData();
        document.getElementById("newExerciseName").value = "";
        document.getElementById("newExerciseSets").value = "3";
        if (preview) {
            preview.dataset.tags = "";
            renderExerciseTagPreview();
        }
        renderAll();
    }

    function addExerciseToWorkout(makePermanent) {
        const selectedExistingId = document.getElementById("workoutExerciseSelect").value;
        const newName = document.getElementById("workoutNewExerciseName").value.trim();
        const sets = Number(document.getElementById("workoutExerciseSets").value);
        const dayId = document.getElementById("workoutDaySelect").value;

        if (!Number.isInteger(sets) || sets < 1 || sets > 10) {
            return alert("Sets must be between 1 and 10.");
        }

        let exercise;

        if (newName) {
            exercise = findOrCreateExercise(newName, sets);
        } else if (selectedExistingId) {
            exercise = trackerData.exercises.find(item => item.id === selectedExistingId);
            exercise.defaultSets = sets;
        } else {
            return alert("Choose an existing exercise or enter a new exercise name.");
        }

        const day = trackerData.days.find(item => item.id === dayId);

        if (currentWorkoutIsFree) {
            if (!temporaryWorkoutExerciseIds.includes(exercise.id)) {
                temporaryWorkoutExerciseIds.push(exercise.id);
            }
        } else if (makePermanent) {
            if (!day.exerciseIds.includes(exercise.id)) day.exerciseIds.push(exercise.id);
            temporaryWorkoutExerciseIds = temporaryWorkoutExerciseIds.filter(id => id !== exercise.id);
        } else if (!day.exerciseIds.includes(exercise.id) &&
                   !temporaryWorkoutExerciseIds.includes(exercise.id)) {
            temporaryWorkoutExerciseIds.push(exercise.id);
        }

        saveData();
        document.getElementById("workoutExerciseSelect").value = "";
        document.getElementById("workoutNewExerciseName").value = "";
        document.getElementById("workoutExerciseSets").value = "3";
        renderAll();
        showPage("workoutPage");
    }

    function removeExerciseFromDay(dayId, exerciseId) {
        const plan = getSelectedPlan(); if (!plan) return;
        const day = plan.days.find(item => item.id === dayId);
        if (!day) return;
        day.exerciseIds = day.exerciseIds.filter(id => id !== exerciseId);
        saveProgrammeEdit(plan);
    }

    function updateExerciseSets(exerciseId, value) {
        const sets = Number(value);
        if (!Number.isInteger(sets) || sets < 1 || sets > 10) return;

        const exercise = trackerData.exercises.find(item => item.id === exerciseId);
        exercise.defaultSets = sets;
        saveData();
        renderAll();
    }

    function moveProgrammeExercise(dayId, exerciseId, direction) {
        const plan = getSelectedPlan(); if (!plan) return;
        const day = plan.days.find(item => item.id === dayId); if (!day) return;
        const index = day.exerciseIds.indexOf(exerciseId); if (index < 0) return;
        const next = index + direction; if (next < 0 || next >= day.exerciseIds.length) return;
        [day.exerciseIds[index], day.exerciseIds[next]] = [day.exerciseIds[next], day.exerciseIds[index]];
        saveProgrammeEdit(plan);
    }

    function updateExerciseProgression(exerciseId, field, value) {
        const exercise = trackerData.exercises.find(item => item.id === exerciseId);
        if (!exercise) return;
        ensureExerciseProgressionDefaults(exercise);

        const next = Number(value);
        if (!Number.isFinite(next)) return;

        if (field === "minReps") {
            exercise.progression.minReps = Math.max(1, Math.round(next));
            if (exercise.progression.maxReps < exercise.progression.minReps) {
                exercise.progression.maxReps = exercise.progression.minReps;
            }
        } else if (field === "maxReps") {
            exercise.progression.maxReps = Math.max(
                Math.max(1, exercise.progression.minReps),
                Math.round(next)
            );
        } else if (field === "incrementKg") {
            exercise.progression.incrementKg = Math.max(0.25, Math.round(next * 100) / 100);
        }

        saveData();
        renderAll();
    }

    function renderProgramme() {
        const tabs = document.getElementById("planTabs");
        const overview = document.getElementById("planOverview");
        const selected = getSelectedPlan();
        if (!tabs || !overview || !selected) return;

        tabs.innerHTML = trackerData.plans.map(plan => `
            <button type="button" class="plan-tab ${plan.id === selected.id ? "active" : ""}"
                onclick="selectPlan('${plan.id}')">
                ${escapeHtml(plan.name)}${plan.id === trackerData.activePlanId ? '<span>ACTIVE</span>' : ''}
            </button>`).join("");

        const progress = getPlanProgress(selected);
        overview.innerHTML = `
            <div class="plan-overview-card">
                <div>
                    <div class="small-label">${selected.id === trackerData.activePlanId ? "Active plan" : "Saved plan"}</div>
                    <h3>${escapeHtml(selected.name)}</h3>
                    <p>${selected.durationWeeks} weeks · ${selected.days.length} workout day${selected.days.length===1?'':'s'}
                    ${selected.id === trackerData.activePlanId ? ` · Week ${progress.week} of ${selected.durationWeeks}` : ''}</p>
                </div>
                <div class="plan-actions">
                    ${selected.id !== trackerData.activePlanId ? `<button class="button" onclick="activatePlan('${selected.id}')">Make active</button>` : ''}
                    <button class="button secondary" onclick="editSelectedPlan()">Edit plan</button>
                    ${selected.id === trackerData.activePlanId ? `<button class="button secondary" onclick="restartActivePlan(false)">Restart</button><button class="button secondary" onclick="restartActivePlan(true)">Edit & restart</button>` : ''}
                    <button class="button danger" onclick="deleteSelectedPlan()">Delete plan</button>
                </div>
            </div>`;

        const editor = document.getElementById("activePlanEditor");
        editor.style.display = "block";

        const restartPending = pendingEditRestartPlanId === selected.id && selected.id === trackerData.activePlanId;
        if (restartPending) {
            overview.innerHTML += `
                <div class="notice edit-restart-notice">
                    Edit this programme, then start a fresh run from Week 1 / Day 1.
                    <div class="plan-actions">
                        <button class="button" onclick="confirmEditRestartActivePlan()">Start fresh run</button>
                        <button class="button secondary" onclick="cancelEditRestart()">Cancel</button>
                    </div>
                </div>`;
        }

        document.getElementById("programmeDays").innerHTML = selected.days.map((day,dayIndex) => {
            const rows = day.exerciseIds.map((exerciseId,index) => {
                const exercise=trackerData.exercises.find(item=>item.id===exerciseId); if(!exercise)return "";
                ensureExerciseProgressionDefaults(exercise);
                ensureExerciseTags(exercise);
                const progression = getProgressionSettings(exercise);
                const muscleSummary = [
                    ...(exercise.primaryMuscles || []).map(m => `Primary: ${m}`),
                    ...(exercise.secondaryMuscles || []).slice(0,2).map(m => `Secondary: ${m}`)
                ].join(" · ");
                return `<div class="programme-row programme-exercise-row">
                    <div class="programme-exercise-main">
                        <strong>${index+1}. ${escapeHtml(exercise.name)}</strong>
                        <div class="programme-muscle-tags">${escapeHtml(muscleSummary || exercise.category || "")}</div>
                    </div>

                    <label class="programme-mini-field">
                        <span>Sets</span>
                        <input type="number" min="1" max="10" value="${exercise.defaultSets}"
                            onchange="updateExerciseSets('${exercise.id}',this.value)">
                    </label>

                    <div class="programme-progression-grid">
                        <label class="programme-mini-field">
                            <span>Min reps</span>
                            <input type="number" min="1" max="50" value="${progression.minReps}"
                                onchange="updateExerciseProgression('${exercise.id}','minReps',this.value)">
                        </label>
                        <label class="programme-mini-field">
                            <span>Max reps</span>
                            <input type="number" min="1" max="50" value="${progression.maxReps}"
                                onchange="updateExerciseProgression('${exercise.id}','maxReps',this.value)">
                        </label>
                        <label class="programme-mini-field">
                            <span>Increment kg</span>
                            <input type="number" min="0.25" max="50" step="0.25" value="${progression.incrementKg}"
                                onchange="updateExerciseProgression('${exercise.id}','incrementKg',this.value)">
                        </label>
                    </div>

                    <div class="programme-row-actions">
                        <button class="button secondary small" onclick="moveProgrammeExercise('${day.id}','${exercise.id}',-1)" ${index===0?'disabled':''}>↑</button>
                        <button class="button secondary small" onclick="moveProgrammeExercise('${day.id}','${exercise.id}',1)" ${index===day.exerciseIds.length-1?'disabled':''}>↓</button>
                        <button class="button secondary small" onclick="swapProgrammeExercise('${day.id}','${exercise.id}')">Swap</button>
                        <button class="button danger small" onclick="removeExerciseFromDay('${day.id}','${exercise.id}')">Remove</button>
                    </div>
                </div>`;
            }).join("");
            return `<section class="programme-day"><div class="programme-header"><div><div class="day-number">${escapeHtml(day.label)}</div><h3>${escapeHtml(day.name)}</h3></div>
                <div class="day-edit-actions"><button class="button secondary small" onclick="movePlanDay('${day.id}',-1)" ${dayIndex===0?'disabled':''}>↑</button><button class="button secondary small" onclick="movePlanDay('${day.id}',1)" ${dayIndex===selected.days.length-1?'disabled':''}>↓</button><button class="button secondary small" onclick="renamePlanDay('${day.id}')">Rename</button><button class="button danger small" onclick="deletePlanDay('${day.id}')">Delete day</button></div></div>
                <div class="programme-list">${rows||'<div class="empty-message">No exercises added.</div>'}</div></section>`;
        }).join("") || `<div class="panel"><p class="empty-message">This plan has no workout days yet. Click <strong>+ Add workout day</strong> to build it.</p></div>`;
    }

    function askForReplacementExercise(currentExerciseId) {
        const current = trackerData.exercises.find(item => item.id === currentExerciseId);
        if (!current) return null;

        const replacementName = prompt(
            `Replace ${current.name} with which exercise?\n\n` +
            `Enter an existing exercise name exactly, or type a new exercise name.`,
            ""
        );

        if (replacementName === null) return null;
        const cleanName = replacementName.trim();
        if (!cleanName) {
            alert("Enter a replacement exercise name.");
            return null;
        }

        const setsAnswer = prompt(
            `How many sets for ${cleanName}?`,
            String(current.defaultSets || 3)
        );

        if (setsAnswer === null) return null;
        const sets = Number(setsAnswer);

        if (!Number.isInteger(sets) || sets < 1 || sets > 10) {
            alert("Sets must be a whole number between 1 and 10.");
            return null;
        }

        return findOrCreateExercise(cleanName, sets);
    }

    function swapProgrammeExercise(dayId, currentExerciseId) {
        const replacement = askForReplacementExercise(currentExerciseId);
        if (!replacement) return;

        if (replacement.id === currentExerciseId) {
            alert("That is already the selected exercise.");
            return;
        }

        const plan = getSelectedPlan(); if (!plan) return;
        const day = plan.days.find(item => item.id === dayId);
        if (!day) return;
        const index = day.exerciseIds.indexOf(currentExerciseId);
        if (index < 0) return;

        day.exerciseIds[index] = replacement.id;
        day.exerciseIds = [...new Set(day.exerciseIds)];

        saveProgrammeEdit(plan);
    }

    function swapWorkoutExercise(currentExerciseId, makePermanent) {
        const replacement = askForReplacementExercise(currentExerciseId);
        if (!replacement) return;

        if (replacement.id === currentExerciseId) {
            alert("That is already the selected exercise.");
            return;
        }

        const dayId = document.getElementById("workoutDaySelect").value;
        const day = trackerData.days.find(item => item.id === dayId);

        if (currentWorkoutIsFree) {
            temporaryWorkoutExerciseIds = temporaryWorkoutExerciseIds
                .map(id => id === currentExerciseId ? replacement.id : id)
                .filter((id, index, ids) => ids.indexOf(id) === index);
            saveData();
            renderAll();
            showPage("workoutPage");
            return;
        }

        const permanentIndex = day.exerciseIds.indexOf(currentExerciseId);

        if (makePermanent) {
            if (permanentIndex >= 0) {
                day.exerciseIds[permanentIndex] = replacement.id;
            } else if (!day.exerciseIds.includes(replacement.id)) {
                day.exerciseIds.push(replacement.id);
            }

            day.exerciseIds = [...new Set(day.exerciseIds)];
            temporaryWorkoutExerciseIds = temporaryWorkoutExerciseIds
                .filter(id => id !== currentExerciseId && id !== replacement.id);
            excludedWorkoutExerciseIds = excludedWorkoutExerciseIds
                .filter(id => id !== currentExerciseId && id !== replacement.id);
        } else {
            if (permanentIndex >= 0 && !excludedWorkoutExerciseIds.includes(currentExerciseId)) {
                excludedWorkoutExerciseIds.push(currentExerciseId);
            }

            temporaryWorkoutExerciseIds = temporaryWorkoutExerciseIds
                .filter(id => id !== currentExerciseId);

            if (day.exerciseIds.includes(replacement.id)) {
                excludedWorkoutExerciseIds = excludedWorkoutExerciseIds
                    .filter(id => id !== replacement.id);
            } else if (!temporaryWorkoutExerciseIds.includes(replacement.id)) {
                temporaryWorkoutExerciseIds.push(replacement.id);
            }
        }

        saveData();
        renderAll();
        showPage("workoutPage");
    }

    function startWorkout(dayId) {
        document.getElementById("workoutDaySelect").value = dayId;
        currentWorkoutIsFree = false;
        temporaryWorkoutExerciseIds = [];
        excludedWorkoutExerciseIds = [];
        workoutExtraSetCounts = {};
        showPage("workoutPage");
    }

    function startFreeWorkout() {
        currentWorkoutIsFree = true;
        temporaryWorkoutExerciseIds = [];
        excludedWorkoutExerciseIds = [];
        workoutExtraSetCounts = {};
        showPage("workoutPage");
        document.querySelectorAll("[data-modern-page]").forEach(button => {
            button.classList.toggle("active", button.dataset.modernPage === "workoutPage");
        });
    }

    function changeWorkoutDay() {
        currentWorkoutIsFree = false;
        temporaryWorkoutExerciseIds = [];
        excludedWorkoutExerciseIds = [];
        workoutExtraSetCounts = {};
        renderWorkoutLogger();
    }

    function getLastExercisePerformance(exerciseId) {
        const matching = trackerData.workouts
            .filter(workout => workout.exercises.some(ex => ex.exerciseId === exerciseId))
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        if (!matching.length) return null;

        const workout = matching[0];
        const performance = workout.exercises.find(ex => ex.exerciseId === exerciseId);
        return { date: workout.date, sets: performance.sets };
    }

    function getProgressionSettings(exercise) {
        const progression = exercise?.progression || {};
        const minReps = Math.max(1, Number(progression.minReps) || DEFAULT_PROGRESSION.minReps);
        const maxReps = Math.max(minReps, Number(progression.maxReps) || DEFAULT_PROGRESSION.maxReps);
        const incrementKg = Math.max(0.25, Number(progression.incrementKg) || DEFAULT_PROGRESSION.incrementKg);

        return {
            enabled: progression.enabled !== false,
            minReps,
            maxReps,
            incrementKg,
            rounding: progression.rounding || DEFAULT_PROGRESSION.rounding
        };
    }

    function isValidProgressionSet(set) {
        return Number(set?.weightKg) > 0 && Number(set?.reps) > 0;
    }

    function getLastValidExerciseSets(exerciseId, workouts = trackerData.workouts) {
        const matching = workouts
            .map(workout => {
                const exercise = workout.exercises?.find(item => item.exerciseId === exerciseId);
                if (!exercise) return null;

                const sets = (exercise.sets || [])
                    .filter(isValidProgressionSet)
                    .map(set => ({
                        weightKg: Number(set.weightKg),
                        reps: Number(set.reps)
                    }));

                if (!sets.length) return null;

                return {
                    date: workout.date,
                    createdAt: workout.createdAt || "",
                    sets
                };
            })
            .filter(Boolean)
            .sort((a, b) => {
                const dateCompare = new Date(`${b.date}T12:00:00`) - new Date(`${a.date}T12:00:00`);
                return dateCompare || new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            });

        return matching[0] || null;
    }

    function roundWeightToIncrement(weightKg, incrementKg = DEFAULT_PROGRESSION.incrementKg, direction = "nearest") {
        const weight = Number(weightKg);
        const increment = Number(incrementKg);
        if (!(weight > 0) || !(increment > 0)) return weightKg;

        const ratio = weight / increment;
        const roundedRatio = direction === "up"
            ? Math.ceil(ratio - Number.EPSILON)
            : direction === "down"
                ? Math.floor(ratio + Number.EPSILON)
                : Math.round(ratio);

        return Number((roundedRatio * increment).toFixed(3));
    }

    function getProgressionBaselineSets(previousSets, plannedSetCount) {
        const validSets = (previousSets || []).filter(isValidProgressionSet);
        const setCount = Math.max(1, Number(plannedSetCount) || validSets.length);
        const lastSet = validSets[validSets.length - 1];

        return Array.from({ length: setCount }, (_, index) =>
            validSets[index] || lastSet
        ).filter(Boolean);
    }

    function buildProgressionTargetsFromSets(previousSets, plannedSetCount, settings) {
        const validSets = (previousSets || []).filter(isValidProgressionSet);
        if (!validSets.length || !settings?.enabled) return [];

        const baseline = getProgressionBaselineSets(validSets, plannedSetCount);

        const allAtTop = baseline.every(set => Number(set.reps) >= settings.maxReps);

        if (allAtTop) {
            const nextWeight = roundWeightToIncrement(
                Math.max(...baseline.map(set => Number(set.weightKg))) + settings.incrementKg,
                settings.incrementKg,
                "up"
            );

            return baseline.map(() => ({
                weightKg: nextWeight,
                reps: settings.minReps,
                source: "automatic"
            }));
        }

        const targets = baseline.map(set => ({
            weightKg: roundWeightToIncrement(set.weightKg, settings.incrementKg),
            reps: Math.max(settings.minReps, Math.min(Number(set.reps), settings.maxReps)),
            source: "automatic"
        }));

        const progressionIndex = baseline
            .map((set, index) => ({ set, index }))
            .reverse()
            .find(item => Number(item.set.reps) < settings.maxReps)?.index;

        if (progressionIndex !== undefined) {
            targets[progressionIndex].reps = Math.min(
                settings.maxReps,
                Math.max(settings.minReps, Number(baseline[progressionIndex].reps) + 1)
            );
        }

        return targets;
    }

    function formatTargetSetValue(target) {
        const weight = Number(target?.weightKg);
        const reps = Number(target?.reps);
        if (!(weight > 0) || !(reps > 0)) return "No target yet";
        return `${formatWeight(weight)} kg × ${reps}`;
    }

    function formatPreviousSetValue(set) {
        const weight = Number(set?.weightKg);
        const reps = Number(set?.reps);
        if (!(weight > 0) || !(reps > 0)) return "No previous set";
        return `${formatWeight(weight)} kg × ${reps}`;
    }

    function getProgressionExplanation(exercise, setIndex, plannedSetCount = exercise?.defaultSets) {
        const fallback = {
            type: "fallback",
            title: "Target generated",
            message: "Target generated from your previous valid performance.",
            previous: "No previous set",
            target: "No target yet",
            targetSet: null,
            previousSet: null
        };

        if (!exercise) return fallback;

        try {
            const settings = getProgressionSettings(exercise);
            const previous = getLastValidExerciseSets(exercise.id);
            const target = calculateExerciseTargetForSet(exercise, setIndex, plannedSetCount);
            const manualReps = getManualTargetRepsForSet(exercise, setIndex);
            const validSets = previous?.sets?.filter(isValidProgressionSet) || [];
            const baseline = getProgressionBaselineSets(validSets, plannedSetCount);
            const previousSet = baseline[setIndex] || validSets[validSets.length - 1] || null;
            const previousText = previousSet
                ? `${formatTargetSetValue(previousSet)} on ${previous.date || "your last valid workout"}`
                : "No previous valid performance";
            const targetText = formatTargetSetValue(target);

            if (!previous && manualReps !== null && target) {
                return {
                    type: "manual_target",
                    title: "Manual target",
                    message: "This exercise has a manual rep target, but there is not enough previous valid performance yet to suggest a matching weight.",
                    previous: previousText,
                    target: targetText,
                    targetSet: target,
                    previousSet
                };
            }

            if (!previous || !validSets.length) {
                return {
                    type: "baseline",
                    title: "Build a baseline",
                    message: "Not enough previous performance data yet. Complete this exercise to establish a progression baseline.",
                    previous: previousText,
                    target: targetText,
                    targetSet: target,
                    previousSet
                };
            }

            if (target?.source === "manual") {
                return {
                    type: "manual_target",
                    title: "Manual target",
                    message: `This exercise is using its manual rep target. The weight is carried from your previous valid set when available.`,
                    previous: previousText,
                    target: targetText,
                    targetSet: target,
                    previousSet
                };
            }

            if (!settings.enabled || !target) {
                return {
                    ...fallback,
                    type: "baseline",
                    title: "No automatic target",
                    message: "Automatic progression is disabled or no reliable target could be generated for this set.",
                    previous: previousText,
                    target: targetText,
                    targetSet: target,
                    previousSet
                };
            }

            const allAtTop = baseline.every(set => Number(set.reps) >= settings.maxReps);
            const progressionIndex = baseline
                .map((set, index) => ({ set, index }))
                .reverse()
                .find(item => Number(item.set.reps) < settings.maxReps)?.index;
            const currentBaselineReps = Number(previousSet?.reps) || 0;
            const clampedBaselineReps = Math.max(
                settings.minReps,
                Math.min(currentBaselineReps, settings.maxReps)
            );
            const setCount = baseline.length;
            const rangeText = `${settings.minReps}-${settings.maxReps}`;

            if (allAtTop) {
                return {
                    type: "weight_progression",
                    title: "Weight progression",
                    message: `All ${setCount} working set${setCount === 1 ? "" : "s"} in the progression baseline reached the top of your ${rangeText} rep range last time, so weight increased by ${formatWeight(settings.incrementKg)} kg and reps reset to ${settings.minReps}.`,
                    previous: previousText,
                    target: targetText,
                    targetSet: target,
                    previousSet
                };
            }

            if (previousSet && currentBaselineReps < settings.minReps) {
                return {
                    type: "partial_completion",
                    title: "Build into the rep range",
                    message: `You completed fewer than ${settings.minReps} reps for this set last time, so the target stays at the same weight and asks for the bottom of your ${rangeText} rep range.`,
                    previous: previousText,
                    target: targetText,
                    targetSet: target,
                    previousSet
                };
            }

            if (
                setIndex === progressionIndex &&
                Number(target.reps) > clampedBaselineReps
            ) {
                return {
                    type: "rep_progression",
                    title: "Rep progression",
                    message: `Keep the same weight and aim for 1 more rep. You completed ${formatTargetSetValue(previousSet)} last time and are still within your ${rangeText} rep range.`,
                    previous: previousText,
                    target: targetText,
                    targetSet: target,
                    previousSet
                };
            }

            return {
                type: "maintain_target",
                title: "Maintain target",
                message: `Keep this set based on the previous valid performance. The progression algorithm moves gradually by adding a rep to the last baseline set below ${settings.maxReps}; weight only increases by ${formatWeight(settings.incrementKg)} kg when every baseline set reaches the top of the ${rangeText} range.`,
                previous: previousText,
                target: targetText,
                targetSet: target,
                previousSet
            };
        } catch (error) {
            console.warn("Progression explanation unavailable:", exercise?.id || exercise?.name || "unknown", error);
            return fallback;
        }
    }

    function getTargetExplanationButtonId(exerciseId, setIndex) {
        return `targetExplainButton-${String(exerciseId).replace(/[^a-zA-Z0-9_-]/g, "-")}-${setIndex}`;
    }

    function renderSetTargetExplanation(exercise, setIndex, plannedSetCount) {
        const explanation = getProgressionExplanation(exercise, setIndex, plannedSetCount);
        const buttonId = getTargetExplanationButtonId(exercise.id, setIndex);
        return {
            explanation,
            html: `
                <div class="set-target-line">
                    <strong>${escapeHtml(explanation.target)}</strong>
                    <button class="target-explain-button" id="${escapeHtml(buttonId)}"
                        data-target-explanation-button
                        data-exercise-id="${escapeHtml(exercise.id)}"
                        data-set-index="${setIndex}"
                        type="button"
                        aria-expanded="false"
                        onclick="toggleTargetExplanation('${exercise.id.replaceAll("'", "\\'")}', ${setIndex})">
                        Why?
                    </button>
                </div>
                <div class="target-explanation-panel"
                    data-target-explanation
                    data-exercise-id="${escapeHtml(exercise.id)}"
                    data-set-index="${setIndex}"
                    hidden>
                    <div class="small-label">Why this target?</div>
                    <div class="target-explanation-meta">
                        <span><strong>Previous</strong>${escapeHtml(explanation.previous)}</span>
                        <span><strong>Target</strong>${escapeHtml(explanation.target)}</span>
                    </div>
                    <h4>${escapeHtml(explanation.title)}</h4>
                    <p>${escapeHtml(explanation.message)}</p>
                </div>
            `
        };
    }

    function toggleTargetExplanation(exerciseId, setIndex) {
        const panels = [...document.querySelectorAll("[data-target-explanation]")];
        const buttons = [...document.querySelectorAll("[data-target-explanation-button]")];
        const panel = panels.find(item =>
            item.dataset.exerciseId === exerciseId &&
            Number(item.dataset.setIndex) === Number(setIndex)
        );
        if (!panel) return;

        const shouldOpen = panel.hasAttribute("hidden");
        panels.forEach(item => {
            item.hidden = true;
        });
        buttons.forEach(button => {
            button.setAttribute("aria-expanded", "false");
        });

        panel.hidden = !shouldOpen;
        const button = buttons.find(item =>
            item.dataset.exerciseId === exerciseId &&
            Number(item.dataset.setIndex) === Number(setIndex)
        );
        if (button) button.setAttribute("aria-expanded", String(shouldOpen));
    }

    function getManualTargetRepsForSet(exercise, setIndex) {
        if (Array.isArray(exercise?.targetReps)) {
            return exercise.targetReps[setIndex] ?? null;
        }

        if (
            exercise?.targetReps !== undefined &&
            exercise.targetReps !== null &&
            exercise.targetReps !== ""
        ) {
            return exercise.targetReps;
        }

        return null;
    }

    function calculateExerciseTargetForSet(exercise, setIndex, plannedSetCount = exercise?.defaultSets) {
        if (!exercise) return null;

        const settings = getProgressionSettings(exercise);
        const previous = getLastValidExerciseSets(exercise.id);
        const automaticTargets = previous
            ? buildProgressionTargetsFromSets(previous.sets, plannedSetCount, settings)
            : [];

        if (automaticTargets[setIndex]) {
            return automaticTargets[setIndex];
        }

        const manualReps = getManualTargetRepsForSet(exercise, setIndex);
        if (manualReps !== null) {
            const previousSet = previous?.sets?.[setIndex] || previous?.sets?.at(-1);
            return {
                weightKg: previousSet?.weightKg ?? null,
                reps: manualReps,
                source: "manual"
            };
        }

        return null;
    }

    function renderWorkoutLogger() {
        const permanentButton = document.getElementById("workoutAddPermanentButton");
        if (permanentButton) {
            permanentButton.textContent = currentWorkoutIsFree ? "Add to extra workout" : "Add permanently";
        }

        const selectedDayId = document.getElementById("workoutDaySelect").value;
        const day = trackerData.days.find(item => item.id === selectedDayId);
        const logger = document.getElementById("workoutLogger");

        if (!currentWorkoutIsFree && !day) return;

        const permanentIdsForToday = currentWorkoutIsFree
            ? []
            : day.exerciseIds.filter(
                id => !excludedWorkoutExerciseIds.includes(id)
            );
        const combinedIds = [...new Set([...permanentIdsForToday, ...temporaryWorkoutExerciseIds])];

        if (!combinedIds.length) {
            logger.innerHTML = `
                <div class="panel">
                    <p class="empty-message">
                        No exercises are currently added. Use the box above to add one for today
                        or add it permanently to this training day.
                    </p>
                </div>
            `;
            return;
        }

        const cards = combinedIds.map(exerciseId => {
            const exercise = trackerData.exercises.find(item => item.id === exerciseId);
            if (!exercise) return "";

            const previous = getLastExercisePerformance(exerciseId);
            const isTemporary = temporaryWorkoutExerciseIds.includes(exerciseId);

            const workoutSetCount = exercise.defaultSets + (workoutExtraSetCounts[exercise.id] || 0);

            const setRows = Array.from({ length: workoutSetCount }, (_, index) => {
                const previousSet = previous?.sets[index];
                const previousText = previousSet
                    ? `Previous: ${previousSet.weightKg} kg × ${previousSet.reps}`
                    : "No previous set";
                const targetInfo = renderSetTargetExplanation(exercise, index, workoutSetCount);
                const targetSet = targetInfo.explanation.targetSet;
                const weightValue = targetSet?.weightKg ?? previousSet?.weightKg ?? "";
                const repsValue = targetSet?.reps ?? previousSet?.reps ?? "";
                return `
                    <div class="set-row" data-set-row="${exercise.id}-${index}">
                        <div class="set-number">Set ${index + 1}</div>
                        <div class="set-previous">${escapeHtml(previousText)}</div>
                        <div class="set-target-cell">${targetInfo.html}</div>
                        <div class="field">
                            <label>Weight kg</label>
                            <input class="workout-weight" data-exercise-id="${exercise.id}"
                                data-set-index="${index}" data-previous="${previousSet?.weightKg ?? ""}" type="number" min="0" step="0.25" placeholder="0" value="${weightValue}">
                        </div>
                        <div class="field">
                            <label>Reps</label>
                            <input class="workout-reps" data-exercise-id="${exercise.id}"
                                data-set-index="${index}" data-previous="${previousSet?.reps ?? ""}" type="number" min="0" step="1" placeholder="0" value="${repsValue}">
                        </div>
                        <button class="set-complete-button" type="button"
                            data-exercise-id="${exercise.id}" data-set-index="${index}"
                            aria-label="Mark set ${index + 1} complete"
                            aria-pressed="false"
                            onclick="toggleSetComplete('${exercise.id}', ${index})">✓</button>
                    </div>
                `;
            }).join("");

            return `
                <article class="exercise-card" data-workout-exercise="${exercise.id}">
                    <div class="exercise-top">
                        <div>
                            <button class="exercise-title-button" type="button"
                                onclick="openExerciseDetail('${exercise.id}')">
                                ${escapeHtml(exercise.name)}
                                <span class="exercise-title-chevron">›</span>
                            </button>
                            <div class="previous">
                                ${previous ? `Last performed: ${escapeHtml(previous.date)}` : "No previous workout recorded"}
                            </div>
                            ${isTemporary ? `<span class="temporary-badge">Today only</span>` : ""}
                        </div>
                        <div class="exercise-card-actions">
                            <div class="exercise-complete-wrap">
                                <span>All sets</span>
                                <button class="exercise-complete-button" type="button"
                                    data-exercise-master="${exercise.id}"
                                    aria-label="Mark all ${escapeHtml(exercise.name)} sets complete"
                                    aria-pressed="false"
                                    onclick="toggleExerciseComplete('${exercise.id}')">✓</button>
                            </div>
                            <div class="exercise-set-count" data-exercise-set-count="${exercise.id}">${workoutSetCount} sets</div>
                            <div class="exercise-swap-actions">
                                <button class="button secondary small"
                                    onclick="swapWorkoutExercise('${exercise.id}', false)">Swap today</button>
                                <button class="button secondary small"
                                    onclick="swapWorkoutExercise('${exercise.id}', true)">Swap permanently</button>
                            </div>
                        </div>
                    </div>
                    <div class="exercise-set-list" data-set-list="${exercise.id}">
                        ${setRows}
                    </div>
                    <div class="add-set-actions">
                        <button class="button secondary small" type="button"
                            onclick="addWorkoutSet('${exercise.id}', 1)">+ Add set</button>
                        <button class="button secondary small" type="button"
                            onclick="addMultipleWorkoutSets('${exercise.id}')">+ Add multiple</button>
                        <button class="button secondary small" type="button"
                            onclick="removeWorkoutSet('${exercise.id}')">− Remove set</button>
                    </div>
                    <div class="field exercise-note">
                        <label>Exercise note</label>
                        <textarea placeholder="Technique reminder, machine setting or anything useful next time..."
                            onchange="updateExerciseNote('${exercise.id}', this.value)">${escapeHtml(exercise.notes || "")}</textarea>
                    </div>
                </article>
            `;
        }).join("");

        logger.innerHTML = `
            <div class="panel">
                <div class="field">
                    <label for="workoutDate">Workout date</label>
                    <input id="workoutDate" type="date" value="${getTodayDate()}">
                </div>
            </div>
            <div class="workout-progress-panel">
                <div class="workout-progress-heading">
                    <div>
                        <div class="small-label">Workout progress</div>
                        <strong>${escapeHtml(day.label)} — ${escapeHtml(day.name)}</strong>
                    </div>
                    <div class="workout-progress-percent" id="workoutProgressPercent">0%</div>
                </div>
                <div class="workout-progress-track">
                    <div class="workout-progress-fill" id="workoutProgressFill"></div>
                </div>
                <div class="workout-progress-stats">
                    <span><strong id="completedExerciseCount">0</strong> / <span id="totalExerciseCount">${combinedIds.length}</span> exercises</span>
                    <span><strong id="completedSetCount">0</strong> / <span id="totalSetCount">0</span> sets</span>
                </div>
            </div>
            <div class="prefilled-notice">
                Previous sets are filled in automatically. Edit only what changed, then tick each completed set. Only ticked sets are saved.
            </div>
            ${cards}
            <div class="workout-actions">
                <button class="button secondary" onclick="clearWorkoutInputs()">Clear</button>
                <button class="button" onclick="reviewWorkout()">Review workout</button>
            </div>
        `;

        updateWorkoutProgress();
    }

    function buildExtraSetRow(exerciseId, setIndex, plannedSetCount = setIndex + 1) {
        const exercise = trackerData.exercises.find(item => item.id === exerciseId);
        const previous = getLastExercisePerformance(exerciseId);
        const previousSet = previous?.sets[setIndex];
        const previousText = previousSet
            ? `Previous: ${previousSet.weightKg} kg × ${previousSet.reps}`
            : "Extra set";
        const targetInfo = exercise
            ? renderSetTargetExplanation(exercise, setIndex, plannedSetCount)
            : null;
        const targetSet = targetInfo?.explanation?.targetSet;
        const weightValue = targetSet?.weightKg ?? previousSet?.weightKg ?? "";
        const repsValue = targetSet?.reps ?? previousSet?.reps ?? "";

        return `
            <div class="set-row" data-set-row="${exerciseId}-${setIndex}">
                <div class="set-number">Set ${setIndex + 1}</div>
                <div class="set-previous">${escapeHtml(previousText)}</div>
                <div class="set-target-cell">${targetInfo?.html || ""}</div>
                <div class="field">
                    <label>Weight kg</label>
                    <input class="workout-weight" data-exercise-id="${exerciseId}"
                        data-set-index="${setIndex}" data-previous="" type="number"
                        min="0" step="0.25" placeholder="0" value="${weightValue}">
                </div>
                <div class="field">
                    <label>Reps</label>
                    <input class="workout-reps" data-exercise-id="${exerciseId}"
                        data-set-index="${setIndex}" data-previous="" type="number"
                        min="0" step="1" placeholder="0" value="${repsValue}">
                </div>
                <button class="set-complete-button" type="button"
                    data-exercise-id="${exerciseId}" data-set-index="${setIndex}"
                    aria-label="Mark set ${setIndex + 1} complete"
                    aria-pressed="false"
                    onclick="toggleSetComplete('${exerciseId}', ${setIndex})">✓</button>
            </div>
        `;
    }

    function addWorkoutSet(exerciseId, amount = 1) {
        const exercise = trackerData.exercises.find(item => item.id === exerciseId);
        const list = document.querySelector(`[data-set-list="${exerciseId}"]`);
        if (!exercise || !list) return;

        const safeAmount = Math.max(1, Math.min(10, Number(amount) || 1));
        const currentExtra = workoutExtraSetCounts[exerciseId] || 0;
        const startingIndex = exercise.defaultSets + currentExtra;

        for (let offset = 0; offset < safeAmount; offset += 1) {
            list.insertAdjacentHTML(
                "beforeend",
                buildExtraSetRow(exerciseId, startingIndex + offset, exercise.defaultSets + currentExtra + safeAmount)
            );
        }

        workoutExtraSetCounts[exerciseId] = currentExtra + safeAmount;

        const countLabel = document.querySelector(
            `[data-exercise-set-count="${exerciseId}"]`
        );
        if (countLabel) {
            const total = exercise.defaultSets + workoutExtraSetCounts[exerciseId];
            countLabel.textContent = `${total} set${total === 1 ? "" : "s"}`;
        }

        updateExerciseMasterState(exerciseId);
        updateWorkoutProgress();
    }

    function addMultipleWorkoutSets(exerciseId) {
        const answer = prompt("How many extra sets do you want to add? (1–10)", "3");
        if (answer === null) return;

        const amount = Number(answer);
        if (!Number.isInteger(amount) || amount < 1 || amount > 10) {
            alert("Enter a whole number from 1 to 10.");
            return;
        }

        addWorkoutSet(exerciseId, amount);
    }

    function removeWorkoutSet(exerciseId) {
        const exercise = trackerData.exercises.find(item => item.id === exerciseId);
        const list = document.querySelector(`[data-set-list="${exerciseId}"]`);
        if (!exercise || !list) return;

        const currentExtra = workoutExtraSetCounts[exerciseId] || 0;
        if (currentExtra <= 0) return;

        const rows = list.querySelectorAll(".set-row");
        const lastRow = rows[rows.length - 1];
        if (lastRow) lastRow.remove();

        workoutExtraSetCounts[exerciseId] = currentExtra - 1;

        const countLabel = document.querySelector(
            `[data-exercise-set-count="${exerciseId}"]`
        );

        if (countLabel) {
            const total = exercise.defaultSets + workoutExtraSetCounts[exerciseId];
            countLabel.textContent = `${total} set${total === 1 ? "" : "s"}`;
        }

        updateExerciseMasterState(exerciseId);
        updateWorkoutProgress();
    }

    function updateExerciseNote(exerciseId, value) {
        const exercise = trackerData.exercises.find(item => item.id === exerciseId);
        if (!exercise) return;
        exercise.notes = value.trim();
        saveData();
    }

    function getSetFields(exerciseId, setIndex) {
        const weightInput = document.querySelector(
            `.workout-weight[data-exercise-id="${exerciseId}"][data-set-index="${setIndex}"]`
        );
        const repsInput = document.querySelector(
            `.workout-reps[data-exercise-id="${exerciseId}"][data-set-index="${setIndex}"]`
        );
        return { weightInput, repsInput };
    }

    function setButtonComplete(button, isComplete) {
        if (!button) return;
        button.classList.toggle("complete", isComplete);
        button.setAttribute("aria-pressed", String(isComplete));

        const exerciseId = button.dataset.exerciseId;
        const setIndex = button.dataset.setIndex;
        const row = document.querySelector(`[data-set-row="${exerciseId}-${setIndex}"]`);
        if (row) row.classList.toggle("set-done", isComplete);
    }

    function toggleSetComplete(exerciseId, setIndex) {
        const button = document.querySelector(
            `.set-complete-button[data-exercise-id="${exerciseId}"][data-set-index="${setIndex}"]`
        );
        if (!button) return;

        const willComplete = !button.classList.contains("complete");

        if (willComplete) {
            const { weightInput, repsInput } = getSetFields(exerciseId, setIndex);
            const weightKg = Number(weightInput?.value);
            const reps = Number(repsInput?.value);

            if (!(weightKg > 0) || !(reps > 0)) {
                alert("Enter the weight and reps before marking this set complete.");
                return;
            }
        }

        setButtonComplete(button, willComplete);
        updateExerciseMasterState(exerciseId);
        updateWorkoutProgress();
    }

    function toggleExerciseComplete(exerciseId) {
        const buttons = [...document.querySelectorAll(
            `.set-complete-button[data-exercise-id="${exerciseId}"]`
        )];
        if (!buttons.length) return;

        const allComplete = buttons.every(button => button.classList.contains("complete"));
        const shouldComplete = !allComplete;

        if (shouldComplete) {
            for (const button of buttons) {
                const setIndex = Number(button.dataset.setIndex);
                const { weightInput, repsInput } = getSetFields(exerciseId, setIndex);
                const weightKg = Number(weightInput?.value);
                const reps = Number(repsInput?.value);

                if (!(weightKg > 0) || !(reps > 0)) {
                    alert("Enter the weight and reps for every set before marking the whole exercise complete.");
                    return;
                }
            }
        }

        buttons.forEach(button => setButtonComplete(button, shouldComplete));
        updateExerciseMasterState(exerciseId);
        updateWorkoutProgress();
    }

    function updateExerciseMasterState(exerciseId) {
        const buttons = [...document.querySelectorAll(
            `.set-complete-button[data-exercise-id="${exerciseId}"]`
        )];
        const master = document.querySelector(`[data-exercise-master="${exerciseId}"]`);
        if (!master || !buttons.length) return;

        const allComplete = buttons.every(button => button.classList.contains("complete"));
        const someComplete = buttons.some(button => button.classList.contains("complete"));

        master.classList.toggle("complete", allComplete);
        master.classList.toggle("partial", someComplete && !allComplete);
        master.setAttribute("aria-pressed", String(allComplete));
    }

    function updateWorkoutProgress() {
        const setButtons = [...document.querySelectorAll(".set-complete-button")];
        const exerciseCards = [...document.querySelectorAll("[data-workout-exercise]")];
        const completedSets = setButtons.filter(button => button.classList.contains("complete")).length;

        const completedExercises = exerciseCards.filter(card => {
            const exerciseId = card.dataset.workoutExercise;
            const buttons = [...card.querySelectorAll(
                `.set-complete-button[data-exercise-id="${exerciseId}"]`
            )];
            return buttons.length > 0 && buttons.every(button => button.classList.contains("complete"));
        }).length;

        const totalSets = setButtons.length;
        const percent = totalSets ? Math.round((completedSets / totalSets) * 100) : 0;

        const setCount = document.getElementById("completedSetCount");
        const totalSetCount = document.getElementById("totalSetCount");
        const exerciseCount = document.getElementById("completedExerciseCount");
        const totalExerciseCount = document.getElementById("totalExerciseCount");
        const fill = document.getElementById("workoutProgressFill");
        const percentLabel = document.getElementById("workoutProgressPercent");

        if (setCount) setCount.textContent = completedSets;
        if (totalSetCount) totalSetCount.textContent = totalSets;
        if (exerciseCount) exerciseCount.textContent = completedExercises;
        if (totalExerciseCount) totalExerciseCount.textContent = exerciseCards.length;
        if (fill) fill.style.width = `${percent}%`;
        if (percentLabel) percentLabel.textContent = `${percent}%`;
    }

    function clearWorkoutInputs() {
        document.querySelectorAll(".workout-weight, .workout-reps").forEach(input => {
            input.value = "";
        });

        document.querySelectorAll(".set-complete-button").forEach(button => {
            setButtonComplete(button, false);
        });

        document.querySelectorAll(".exercise-complete-button").forEach(button => {
            button.classList.remove("complete", "partial");
            button.setAttribute("aria-pressed", "false");
        });

        updateWorkoutProgress();
    }

    function collectWorkoutDraft() {
        const dayId = currentWorkoutIsFree ? null : document.getElementById("workoutDaySelect").value;
        const date = document.getElementById("workoutDate").value;
        if (!date) {
            alert("Choose a workout date.");
            return null;
        }

        const day = currentWorkoutIsFree ? null : trackerData.days.find(item => item.id === dayId);
        const permanentIdsForToday = currentWorkoutIsFree
            ? []
            : day.exerciseIds.filter(
                id => !excludedWorkoutExerciseIds.includes(id)
            );
        const combinedIds = [...new Set([...permanentIdsForToday, ...temporaryWorkoutExerciseIds])];
        const workoutExercises = [];

        combinedIds.forEach(exerciseId => {
            const completedButtons = [...document.querySelectorAll(
                `.set-complete-button.complete[data-exercise-id="${exerciseId}"]`
            )].sort((a, b) => Number(a.dataset.setIndex) - Number(b.dataset.setIndex));

            const sets = [];
            completedButtons.forEach(button => {
                const setIndex = Number(button.dataset.setIndex);
                const { weightInput, repsInput } = getSetFields(exerciseId, setIndex);
                const weightKg = Number(weightInput?.value);
                const reps = Number(repsInput?.value);

                if (weightKg > 0 && reps > 0) {
                    sets.push({ weightKg, reps });
                }
            });

            if (sets.length) workoutExercises.push({ exerciseId, sets });
        });

        if (!workoutExercises.length) {
            alert("Tick at least one completed set before reviewing the workout.");
            return null;
        }

        return {
            id: createId("workout"),
            dayId,
            ...(currentWorkoutIsFree ? { isFreeWorkout: true } : {}),
            date,
            exercises: workoutExercises,
            createdAt: new Date().toISOString()
        };
    }

    function getWorkoutTotals(workout) {
        const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];

        return exercises.reduce((totals, exercise) => {
            const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
            sets.forEach(set => {
                const weightKg = Number(set?.weightKg);
                const reps = Number(set?.reps);
                if (!Number.isFinite(weightKg) || !Number.isFinite(reps) || weightKg <= 0 || reps <= 0) return;
                totals.sets += 1;
                totals.reps += reps;
                totals.volume += weightKg * reps;
            });
            return totals;
        }, { exercises: exercises.length, sets: 0, reps: 0, volume: 0 });
    }

    function getPreviousDayWorkout(dayId, beforeDate) {
        return [...trackerData.workouts]
            .filter(workout => workout.dayId === dayId && workout.date <= beforeDate)
            .sort((a, b) => {
                const dateCompare = new Date(b.date) - new Date(a.date);
                return dateCompare || new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            })[0] || null;
    }

    function getWeightKey(weightKg) {
        return Number(Number(weightKg).toFixed(3)).toString();
    }

    function getBestRepsByWeight(history) {
        const bestByWeight = new Map();

        (history || []).forEach(item => {
            (item.sets || []).filter(isValidProgressionSet).forEach(set => {
                const key = getWeightKey(set.weightKg);
                const reps = Number(set.reps);
                const previousBest = bestByWeight.get(key) || 0;

                if (reps > previousBest) {
                    bestByWeight.set(key, reps);
                }
            });
        });

        return bestByWeight;
    }

    function getRepPRsForSets(sets, oldBestRepsByWeight) {
        const bestDraftRepsByWeight = new Map();

        (sets || []).filter(isValidProgressionSet).forEach(set => {
            const key = getWeightKey(set.weightKg);
            const reps = Number(set.reps);
            const previousDraftBest = bestDraftRepsByWeight.get(key) || 0;

            if (reps > previousDraftBest) {
                bestDraftRepsByWeight.set(key, reps);
            }
        });

        return [...bestDraftRepsByWeight.entries()]
            .filter(([weightKey, reps]) => reps > (oldBestRepsByWeight.get(weightKey) || 0))
            .sort((a, b) => Number(b[0]) - Number(a[0]))
            .map(([weightKey, reps]) => `Rep PR: ${weightKey} kg \u00d7 ${reps}`);
    }

    function getExercisePRsForDraft(exerciseId, sets) {
        const oldHistory = getExerciseHistory(exerciseId);
        const oldBestWeight = oldHistory.length ? Math.max(...oldHistory.map(item => item.bestWeight)) : 0;
        const oldBest1RM = oldHistory.length ? Math.max(...oldHistory.map(item => item.estimated1RM)) : 0;
        const oldBestVolume = oldHistory.length ? Math.max(...oldHistory.map(item => item.volume)) : 0;
        const oldBestRepsByWeight = getBestRepsByWeight(oldHistory);

        const validSets = (sets || []).filter(isValidProgressionSet);
        if (!validSets.length) return [];

        const bestWeight = Math.max(...validSets.map(set => Number(set.weightKg)));
        const best1RM = Math.max(...validSets.map(set => estimate1RM(Number(set.weightKg), Number(set.reps))));
        const volume = validSets.reduce((sum, set) => sum + Number(set.weightKg) * Number(set.reps), 0);

        const prs = new Set();
        if (bestWeight > oldBestWeight) prs.add("New weight PR");
        if (best1RM > oldBest1RM + 0.05) prs.add("New estimated 1RM PR");
        if (volume > oldBestVolume) prs.add("New volume PR");

        getRepPRsForSets(validSets, oldBestRepsByWeight)
            .forEach(pr => prs.add(pr));

        return [...prs];
    }

    function reviewWorkout() {
        const draft = collectWorkoutDraft();
        if (!draft) return;

        pendingWorkoutDraft = draft;
        const day = trackerData.days.find(item => item.id === draft.dayId);
        const dayLabel = draft.isFreeWorkout ? "Extra Workout" : day?.label || "Workout";
        const dayName = draft.isFreeWorkout ? "Extra Workout" : day?.name || "Workout";
        const totals = getWorkoutTotals(draft);
        const previousWorkout = getPreviousDayWorkout(draft.dayId, draft.date);
        const previousTotals = previousWorkout ? getWorkoutTotals(previousWorkout) : null;
        const volumeDifference = previousTotals ? totals.volume - previousTotals.volume : null;

        const exerciseRows = draft.exercises.map(item => {
            const exercise = trackerData.exercises.find(entry => entry.id === item.exerciseId);
            const prs = getExercisePRsForDraft(item.exerciseId, item.sets);
            const setsText = item.sets.map(set => `${set.weightKg} kg × ${set.reps}`).join(", ");

            return `
                <div class="summary-exercise">
                    <strong>${escapeHtml(exercise?.name || "Exercise")}</strong>
                    <div class="library-meta">${escapeHtml(setsText)}</div>
                    ${prs.map(pr => `<span class="pr-badge">🏆 ${escapeHtml(pr)}</span>`).join("")}
                </div>
            `;
        }).join("");

        document.getElementById("summaryTitle").textContent = draft.isFreeWorkout
            ? "Extra Workout"
            : `${dayLabel} \u2014 ${dayName}`;
        document.getElementById("workoutSummaryContent").innerHTML = `
            <div class="summary-grid">
                <article class="stat-card">
                    <div class="stat-label">Exercises</div>
                    <div class="stat-value">${totals.exercises}</div>
                </article>
                <article class="stat-card">
                    <div class="stat-label">Completed sets</div>
                    <div class="stat-value">${totals.sets}</div>
                </article>
                <article class="stat-card">
                    <div class="stat-label">Total reps</div>
                    <div class="stat-value">${totals.reps}</div>
                </article>
                <article class="stat-card">
                    <div class="stat-label">Workout volume</div>
                    <div class="stat-value">${Math.round(totals.volume).toLocaleString()} kg</div>
                </article>
                <article class="stat-card">
                    <div class="stat-label">Compared with last ${escapeHtml(dayLabel)}</div>
                    <div class="stat-value ${volumeDifference > 0 ? "positive" : volumeDifference < 0 ? "negative" : ""}">
                        ${volumeDifference === null ? "First entry" : `${volumeDifference > 0 ? "+" : ""}${Math.round(volumeDifference).toLocaleString()} kg`}
                    </div>
                </article>
                <article class="stat-card">
                    <div class="stat-label">Workout date</div>
                    <div class="stat-value" style="font-size:1.2rem;">${escapeHtml(draft.date)}</div>
                </article>
            </div>
            <div class="panel" style="margin-bottom:0;">
                <h3>Exercises</h3>
                ${exerciseRows}
            </div>
        `;

        const modal = document.getElementById("workoutSummaryModal");
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
    }

    function closeWorkoutSummary() {
        const modal = document.getElementById("workoutSummaryModal");
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
        pendingWorkoutDraft = null;
    }

    function getWorkoutDisplayName(workout) {
        if (workout?.isFreeWorkout) return "Extra Workout";
        const day = (trackerData.days || []).find(item => item.id === workout?.dayId)
            || trackerData.plans
                ?.flatMap(plan => plan.days || [])
                .find(item => item.id === workout?.dayId);
        return day?.name || day?.label || "Workout";
    }

    function getCurrentPageId() {
        return document.querySelector(".page.active")?.id || "dashboardPage";
    }

    function getWorkoutTime(workout) {
        const timestamp = workout?.createdAt || (workout?.date ? `${workout.date}T12:00:00` : "");
        const time = new Date(timestamp).getTime();
        return Number.isFinite(time) ? time : 0;
    }

    function getWorkoutsBeforeSavedWorkout(savedWorkout) {
        const targetIndex = (trackerData.workouts || []).findIndex(workout => workout?.id === savedWorkout?.id);
        const targetTime = getWorkoutTime(savedWorkout);

        return (trackerData.workouts || []).filter((workout, index) => {
            if (!workout || workout.id === savedWorkout?.id) return false;

            const workoutTime = getWorkoutTime(workout);
            if (targetTime && workoutTime && workoutTime !== targetTime) {
                return workoutTime < targetTime;
            }

            return targetIndex >= 0 && index < targetIndex;
        });
    }

    function openSavedWorkoutReview(workoutId, returnPageId = "") {
        const workout = (trackerData.workouts || []).find(item => item.id === workoutId);
        if (!workout) {
            alert("That saved workout could not be found.");
            return;
        }

        try {
            const completionData = buildWorkoutCompletionData(
                workout,
                getWorkoutsBeforeSavedWorkout(workout)
            );
            completionData.reviewMode = "history";
            const detailModal = document.getElementById("exerciseDetailModal");
            if (detailModal?.classList.contains("open")) closeExerciseDetail();
            showWorkoutComplete(completionData, {
                returnPageId: returnPageId || getCurrentPageId(),
                mode: "history"
            });
        } catch (error) {
            console.error("Unable to open saved workout review:", error);
            alert("This workout review could not be opened.");
        }
    }

    function getValidWorkoutSets(sets) {
        return (sets || [])
            .map(set => ({
                weightKg: Number(set.weightKg),
                reps: Number(set.reps)
            }))
            .filter(isValidProgressionSet);
    }

    function getExerciseSessionMetrics(sets) {
        const validSets = getValidWorkoutSets(sets);
        if (!validSets.length) {
            return {
                sets: 0,
                reps: 0,
                volume: 0,
                bestWeight: 0,
                estimated1RM: 0,
                bestSet: null
            };
        }

        const bestSet = [...validSets].sort((a, b) => {
            if (b.weightKg !== a.weightKg) return b.weightKg - a.weightKg;
            return b.reps - a.reps;
        })[0];

        return {
            sets: validSets.length,
            reps: validSets.reduce((sum, set) => sum + set.reps, 0),
            volume: validSets.reduce((sum, set) => sum + set.weightKg * set.reps, 0),
            bestWeight: Math.max(...validSets.map(set => set.weightKg)),
            estimated1RM: Math.max(...validSets.map(set => estimate1RM(set.weightKg, set.reps))),
            bestSet
        };
    }

    function getExerciseHistoryFromWorkouts(exerciseId, workouts) {
        return (workouts || [])
            .map(workout => {
                const exercise = Array.isArray(workout?.exercises)
                    ? workout.exercises.find(item => item.exerciseId === exerciseId)
                    : null;
                if (!exercise) return null;
                const metrics = getExerciseSessionMetrics(exercise.sets);
                if (!metrics.sets) return null;
                return {
                    workoutId: workout.id,
                    workout,
                    date: workout.date,
                    createdAt: workout.createdAt || "",
                    sets: getValidWorkoutSets(exercise.sets),
                    ...metrics
                };
            })
            .filter(Boolean)
            .sort((a, b) => {
                const dateCompare = new Date(a.date) - new Date(b.date);
                return dateCompare || new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
            });
    }

    function getExercisePRsForSavedWorkout(exerciseId, sets, previousWorkouts) {
        const oldHistory = getExerciseHistoryFromWorkouts(exerciseId, previousWorkouts);
        const oldBestWeight = oldHistory.length ? Math.max(...oldHistory.map(item => item.bestWeight)) : 0;
        const oldBest1RM = oldHistory.length ? Math.max(...oldHistory.map(item => item.estimated1RM)) : 0;
        const oldBestVolume = oldHistory.length ? Math.max(...oldHistory.map(item => item.volume)) : 0;
        const oldBestRepsByWeight = getBestRepsByWeight(oldHistory);
        const metrics = getExerciseSessionMetrics(sets);
        if (!metrics.sets) return [];

        const prs = [];
        if (metrics.bestWeight > oldBestWeight) {
            prs.push({ type: "weight", label: "New weight PR", value: `${formatWeight(metrics.bestWeight)} kg` });
        }
        if (metrics.estimated1RM > oldBest1RM + 0.05) {
            prs.push({ type: "estimated1RM", label: "New estimated 1RM", value: `${metrics.estimated1RM.toFixed(1)} kg` });
        }
        if (metrics.volume > oldBestVolume) {
            prs.push({ type: "volume", label: "New volume PR", value: `${Math.round(metrics.volume).toLocaleString()} kg` });
        }
        getRepPRsForSets(sets, oldBestRepsByWeight).forEach(pr => {
            prs.push({ type: "reps", label: pr.replace("Rep PR: ", "New rep PR"), value: "" });
        });

        return prs;
    }

    function getPreviousExerciseSession(exerciseId, previousWorkouts) {
        const history = getExerciseHistoryFromWorkouts(exerciseId, previousWorkouts);
        return history[history.length - 1] || null;
    }

    function getPreviousComparableWorkout(savedWorkout, previousWorkouts) {
        if (savedWorkout?.isFreeWorkout || !savedWorkout?.dayId) return null;
        return [...(previousWorkouts || [])]
            .filter(workout => workout && !workout.isFreeWorkout && workout.dayId === savedWorkout.dayId)
            .sort((a, b) => {
                const dateCompare = new Date(b.date) - new Date(a.date);
                return dateCompare || new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            })[0] || null;
    }

    function formatWeight(value) {
        return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
    }

    function formatMetricChange(current, previous, suffix = "", options = {}) {
        const change = current - previous;
        const sign = change > 0 ? "+" : "";
        const precision = options.precision ?? 0;
        const value = precision
            ? change.toFixed(precision)
            : Math.round(change).toLocaleString();
        const percent = previous ? ` (${sign}${((change / previous) * 100).toFixed(1)}%)` : "";
        return `${sign}${value}${suffix}${percent}`;
    }

    function buildWorkoutCompletionData(savedWorkout, previousWorkouts) {
        const totals = getWorkoutTotals(savedWorkout);
        const workoutName = getWorkoutDisplayName(savedWorkout);
        let previousWorkout = null;
        let previousTotals = null;

        try {
            previousWorkout = getPreviousComparableWorkout(savedWorkout, previousWorkouts);
            previousTotals = previousWorkout ? getWorkoutTotals(previousWorkout) : null;
        } catch (error) {
            console.warn("Workout completion comparison skipped:", error);
        }

        const savedExercises = Array.isArray(savedWorkout?.exercises) ? savedWorkout.exercises : [];
        const exercises = savedExercises.map(item => {
            const exercise = (trackerData.exercises || []).find(entry => entry.id === item?.exerciseId);
            const metrics = getExerciseSessionMetrics(item?.sets);
            let previousSession = null;
            let prs = [];

            try {
                previousSession = getPreviousExerciseSession(item?.exerciseId, previousWorkouts);
            } catch (error) {
                console.warn("Exercise completion comparison skipped:", item?.exerciseId, error);
            }

            try {
                prs = getExercisePRsForSavedWorkout(item?.exerciseId, item?.sets, previousWorkouts);
            } catch (error) {
                console.warn("Exercise completion PRs skipped:", item?.exerciseId, error);
            }

            return {
                exerciseId: item?.exerciseId || "",
                name: exercise?.name || "Exercise",
                sets: getValidWorkoutSets(item?.sets),
                metrics,
                prs: Array.isArray(prs) ? prs : [],
                previousSession
            };
        });

        return {
            workoutId: savedWorkout?.id || "",
            workoutName,
            date: savedWorkout?.date || getTodayDate(),
            isFreeWorkout: Boolean(savedWorkout?.isFreeWorkout),
            totals,
            previousWorkout,
            previousWorkoutName: previousWorkout ? getWorkoutDisplayName(previousWorkout) : "",
            previousTotals,
            exercises,
            prCount: exercises.reduce((sum, exercise) => sum + (Array.isArray(exercise.prs) ? exercise.prs.length : 0), 0)
        };
    }

    function renderExerciseComparison(exercise) {
        try {
        const previous = exercise?.previousSession;
        if (!previous) return "";
        const current = exercise?.metrics || getExerciseSessionMetrics(exercise?.sets);
        const rows = [
            ["Volume", `${Math.round(previous.volume).toLocaleString()} kg`, `${Math.round(current.volume).toLocaleString()} kg`, formatMetricChange(current.volume, previous.volume, " kg")],
            ["Best weight", `${formatWeight(previous.bestWeight)} kg`, `${formatWeight(current.bestWeight)} kg`, formatMetricChange(current.bestWeight, previous.bestWeight, " kg", { precision: 1 })],
            ["Estimated 1RM", `${previous.estimated1RM.toFixed(1)} kg`, `${current.estimated1RM.toFixed(1)} kg`, formatMetricChange(current.estimated1RM, previous.estimated1RM, " kg", { precision: 1 })]
        ];

        return `
            <div class="completion-comparison">
                <div class="completion-comparison-title">Compared with previous ${escapeHtml(exercise?.name || "exercise")} session</div>
                ${rows.map(([label, oldValue, newValue, change]) => `
                    <div class="completion-comparison-row">
                        <span>${escapeHtml(label)}</span>
                        <strong>${escapeHtml(oldValue)} → ${escapeHtml(newValue)}</strong>
                        <em class="${change.startsWith("+") ? "positive" : change.startsWith("-") ? "negative" : ""}">${escapeHtml(change)}</em>
                    </div>
                `).join("")}
            </div>
        `;
        } catch (error) {
            console.warn("Exercise completion comparison render skipped:", error);
            return "";
        }
    }

    function renderWorkoutComparison(data) {
        try {
        if (!data?.previousTotals) return "";
        const rows = [
            ["Volume", `${Math.round(data.previousTotals.volume).toLocaleString()} kg`, `${Math.round(data.totals.volume).toLocaleString()} kg`, formatMetricChange(data.totals.volume, data.previousTotals.volume, " kg")],
            ["Sets", data.previousTotals.sets, data.totals.sets, formatMetricChange(data.totals.sets, data.previousTotals.sets)],
            ["Reps", data.previousTotals.reps, data.totals.reps, formatMetricChange(data.totals.reps, data.previousTotals.reps)]
        ];

        return `
            <section class="completion-section">
                <div class="completion-section-heading">Compared with last ${escapeHtml(data.previousWorkoutName)} workout</div>
                <div class="completion-comparison workout-comparison">
                    ${rows.map(([label, oldValue, newValue, change]) => `
                        <div class="completion-comparison-row">
                            <span>${escapeHtml(label)}</span>
                            <strong>${escapeHtml(oldValue)} → ${escapeHtml(newValue)}</strong>
                            <em class="${change.startsWith("+") ? "positive" : change.startsWith("-") ? "negative" : ""}">${escapeHtml(change)}</em>
                        </div>
                    `).join("")}
                </div>
            </section>
        `;
        } catch (error) {
            console.warn("Workout completion comparison render skipped:", error);
            return "";
        }
    }

    function showWorkoutComplete(data, options = {}) {
        const totals = data?.totals || { exercises: 0, sets: 0, reps: 0, volume: 0 };
        const exercises = Array.isArray(data?.exercises) ? data.exercises : [];
        const isHistoryReview = options.mode === "history" || data?.reviewMode === "history";
        workoutCompleteReturnPageId = options.returnPageId || "dashboardPage";

        document.getElementById("workoutCompleteEyebrow").textContent = isHistoryReview ? "Workout review" : "Workout complete";
        document.getElementById("workoutCompleteTitle").textContent = data?.workoutName || (isHistoryReview ? "Workout review" : "Workout complete");
        document.getElementById("workoutCompleteSubtitle").textContent =
            `${data?.date || getTodayDate()} • ${isHistoryReview ? "Saved workout" : "Saved"} • ${totals.volume ? `${Math.round(totals.volume).toLocaleString()} kg` : "0 kg"} volume`;

        const summaryCards = [
            ["Date", data?.date || getTodayDate()],
            ["Exercises completed", totals.exercises],
            ["Total sets", totals.sets],
            ["Total reps", totals.reps],
            ["Total volume", `${Math.round(totals.volume).toLocaleString()} kg`],
            ["PRs achieved", Number(data?.prCount) || 0]
        ].map(([label, value]) => `
            <article class="completion-review-stat">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(value)}</strong>
            </article>
        `).join("");

        const exerciseRows = exercises.map(exercise => {
            const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
            const prs = Array.isArray(exercise?.prs) ? exercise.prs : [];
            return `
            <article class="completion-review-exercise">
                <div class="completion-review-exercise-head">
                    <strong>${escapeHtml(exercise?.name || "Exercise")}</strong>
                    ${prs.length ? `<span class="completion-pr-chip">New PR</span>` : ""}
                </div>
                <div class="completion-set-line">
                    ${sets.map(set => `<span>${formatWeight(set.weightKg)} kg × ${set.reps}</span>`).join("")}
                </div>
                ${prs.length ? `
                    <div class="completion-pr-list compact">
                        ${prs.map(pr => `
                            <span class="pr-badge">🏆 ${escapeHtml(pr?.label || "New PR")}${pr?.value ? ` — ${escapeHtml(pr.value)}` : ""}</span>
                        `).join("")}
                    </div>
                ` : ""}
                ${renderExerciseComparison(exercise)}
            </article>
        `;
        }).join("");

        document.getElementById("workoutCompleteCards").innerHTML = `
            <section class="completion-review-summary">
                ${summaryCards}
            </section>

            <section class="completion-section">
                <div class="completion-section-heading">Exercises</div>
                <div class="completion-review-exercise-list">
                    ${exerciseRows || `<div class="empty-message">No exercises recorded.</div>`}
                </div>
            </section>

            ${renderWorkoutComparison(data)}
        `;

        const page = document.getElementById("workoutCompletePage");
        if (page) page.setAttribute("aria-hidden", "false");
        showPage("workoutCompletePage");
        document.querySelectorAll("[data-modern-page]").forEach(button => {
            button.classList.remove("active");
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function updateWorkoutCompleteDots() {
        document.querySelectorAll("[data-completion-dot]").forEach((dot, index) => {
            dot.classList.toggle("active", index === workoutCompleteCardIndex);
        });
    }

    function showWorkoutCompleteCard(index) {
        const track = document.getElementById("workoutCompleteCards");
        if (!track) return;

        const cardCount = track.children.length;
        workoutCompleteCardIndex = Math.max(0, Math.min(cardCount - 1, index));

        track.scrollTo({
            left: track.clientWidth * workoutCompleteCardIndex,
            behavior: "smooth"
        });

        updateWorkoutCompleteDots();
    }

    function shiftWorkoutCompleteCard(direction) {
        showWorkoutCompleteCard(workoutCompleteCardIndex + direction);
    }

    function syncWorkoutCompleteCardFromScroll() {
        const track = document.getElementById("workoutCompleteCards");
        if (!track || !track.clientWidth) return;

        workoutCompleteCardIndex = Math.round(track.scrollLeft / track.clientWidth);
        updateWorkoutCompleteDots();
    }

    function closeWorkoutComplete() {
        const page = document.getElementById("workoutCompletePage");
        if (page) page.setAttribute("aria-hidden", "true");
        const returnPageId = workoutCompleteReturnPageId || "dashboardPage";
        workoutCompleteReturnPageId = "dashboardPage";
        if (typeof window.modernNavigate === "function") {
            window.modernNavigate(returnPageId);
        } else {
            showPage(returnPageId);
        }
    }

    function confirmSaveWorkout() {
        if (!pendingWorkoutDraft) return;

        const completedWorkout = pendingWorkoutDraft;
        if (completedWorkout.isFreeWorkout) {
            completedWorkout.planId = null;
            delete completedWorkout.planRunId;
        } else {
            const activeRun = ensureActivePlanRun();
            completedWorkout.planId = trackerData.activePlanId || null;
            completedWorkout.planRunId = activeRun?.id || null;
        }
        const previousWorkouts = structuredClone(trackerData.workouts);

        trackerData.workouts.push(completedWorkout);
        pendingWorkoutDraft = null;
        currentWorkoutIsFree = false;
        temporaryWorkoutExerciseIds = [];
        excludedWorkoutExerciseIds = [];
        workoutExtraSetCounts = {};
        saveData();

        const modal = document.getElementById("workoutSummaryModal");
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");

        try {
            const completionData = buildWorkoutCompletionData(completedWorkout, previousWorkouts);
            showWorkoutComplete(completionData);
        } catch (error) {
            console.error("Unable to show workout completion review after save:", error);
            showPage("workoutCompletePage");
            const page = document.getElementById("workoutCompletePage");
            if (page) page.setAttribute("aria-hidden", "false");
            document.getElementById("workoutCompleteTitle").textContent = "Workout complete";
            document.getElementById("workoutCompleteSubtitle").textContent = `${completedWorkout.date} • Saved`;
            document.getElementById("workoutCompleteCards").innerHTML = `
                <section class="completion-section">
                    <div class="empty-message">
                        Workout saved. The detailed review could not be generated.
                    </div>
                </section>
            `;
        }
    }

    function openExerciseDetail(exerciseId) {
        const exercise = trackerData.exercises.find(item => item.id === exerciseId);
        if (!exercise) return;

        activeExerciseDetailId = exerciseId;
        document.getElementById("exerciseDetailTitle").textContent = exercise.name;
        renderExerciseGuide(exercise);
        renderExerciseDetailTab("history");

        const modal = document.getElementById("exerciseDetailModal");
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
    }

    function closeExerciseDetail() {
        if (exerciseGuideStopTimer) {
            clearTimeout(exerciseGuideStopTimer);
            exerciseGuideStopTimer = null;
        }

        const modal = document.getElementById("exerciseDetailModal");
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
        activeExerciseDetailId = null;
    }

    const EXERCISEDB_FREE_API = "https://oss.exercisedb.dev/api/v1/exercises";

    function normalizeExerciseSearchName(value) {
        return String(value || "")
            .toLowerCase()
            .replace(/\([^)]*\)/g, " ")
            .replace(/\bpull\s+down\b/g, "pulldown")
            .replace(/\bpush\s+down\b/g, "pushdown")
            .replace(/\btri\s+cep\b/g, "tricep")
            .replace(/\bromanian\s+dead\s+lift\b/g, "romanian deadlift")
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function getExerciseNameTokens(value) {
        const ignored = new Set([
            "the", "a", "an", "with", "and", "or", "of", "on", "in",
            "exercise", "loaded", "test", "movement"
        ]);

        return normalizeExerciseSearchName(value)
            .split(" ")
            .filter(token => token && !ignored.has(token));
    }

    function scoreExerciseDbMatch(queryName, candidate) {
        const queryTokens = getExerciseNameTokens(queryName);
        const candidateTokens = getExerciseNameTokens(candidate?.name);

        if (!queryTokens.length || !candidateTokens.length) return -1;

        const query = queryTokens.join(" ");
        const name = candidateTokens.join(" ");
        const candidateName = String(candidate?.name || "").toLowerCase();
        const equipments = (candidate?.equipments || []).map(value => String(value).toLowerCase());

        let score = 0;

        if (query === name) score += 1400;
        if (name.includes(query)) score += 360;
        if (query.includes(name)) score += 300;

        const candidateSet = new Set(candidateTokens);
        const matches = queryTokens.filter(token => candidateSet.has(token)).length;
        const coverage = matches / queryTokens.length;
        const precision = matches / candidateTokens.length;

        score += coverage * 320;
        score += precision * 180;
        score += matches * 60;

        if (coverage === 1) score += 200;

        const queryLower = String(queryName || "").toLowerCase();

        const unwantedModifiers = [
            ["band", 260],
            ["underhand", 160],
            ["reverse", 140],
            ["single arm", 140],
            ["one arm", 140],
            ["one-arm", 140],
            ["unilateral", 120],
            ["kneeling", 100],
            ["behind neck", 120],
            ["straight arm", 110],
            ["rope", 80]
        ];

        unwantedModifiers.forEach(([modifier, penalty]) => {
            if (candidateName.includes(modifier) && !queryLower.includes(modifier)) {
                score -= penalty;
            }
        });

        if (queryLower.includes("pulldown")) {
            if (candidateName.includes("pulldown") || candidateName.includes("pull down")) score += 260;
            if (equipments.includes("cable")) score += 220;
            if (equipments.some(value => value.includes("leverage"))) score += 100;
            if (equipments.includes("band") && !queryLower.includes("band")) score -= 220;
        }

        if (queryLower.includes("row")) {
            if (candidateName.includes("row")) score += 180;
            if (queryLower.includes("cable") && equipments.includes("cable")) score += 180;
            if (queryLower.includes("dumbbell") && equipments.includes("dumbbell")) score += 180;
        }

        if (queryLower.includes("squat")) {
            if (candidateName.includes("squat")) score += 220;
            if (queryLower.includes("barbell") && equipments.includes("barbell")) score += 120;
        }

        if (queryLower.includes("romanian deadlift")) {
            if (candidateName.includes("romanian") && candidateName.includes("deadlift")) score += 300;
            if (candidateName.includes("stiff") && !queryLower.includes("stiff")) score -= 80;
        }

        if (candidateName.includes("classic") && !queryLower.includes("classic")) {
            score -= 40;
        }

        return score;
    }

    function getExerciseDemoStats(exerciseId) {
        try {
            const history = getExerciseHistory(exerciseId);
            const last = history[history.length - 1] || null;
            if (!last) {
                return {
                    lastPerformed: "",
                    bestWeight: 0,
                    bestEstimated1RM: 0
                };
            }

            return {
                lastPerformed: last.date || "",
                bestWeight: Math.max(...history.map(item => Number(item.bestWeight) || 0)),
                bestEstimated1RM: Math.max(...history.map(item => Number(item.estimated1RM) || 0))
            };
        } catch (error) {
            console.warn("Exercise demo stats unavailable:", error);
            return {
                lastPerformed: "",
                bestWeight: 0,
                bestEstimated1RM: 0
            };
        }
    }

    function extractExerciseDbRows(payload) {
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload?.data?.exercises)) return payload.data.exercises;
        if (Array.isArray(payload?.exercises)) return payload.exercises;
        if (Array.isArray(payload?.results)) return payload.results;
        return [];
    }

    function readExerciseDbCache() {
        try {
            const raw = localStorage.getItem(EXERCISEDB_CACHE_KEY);
            if (!raw) return null;

            const cached = JSON.parse(raw);
            if (!cached?.savedAt || !Array.isArray(cached?.exercises)) return null;
            if (Date.now() - cached.savedAt > EXERCISEDB_CACHE_MAX_AGE) return null;

            return cached.exercises;
        } catch {
            return null;
        }
    }

    function writeExerciseDbCache(exercises) {
        try {
            localStorage.setItem(EXERCISEDB_CACHE_KEY, JSON.stringify({
                savedAt: Date.now(),
                exercises
            }));
        } catch (error) {
            console.warn("ExerciseDB cache could not be saved:", error);
        }
    }

    async function fetchExerciseDbLibrary() {
        const cached = readExerciseDbCache();
        if (cached?.length >= 500) return cached;

        if (exerciseDbLibraryPromise) return exerciseDbLibraryPromise;

        exerciseDbLastError = null;

        exerciseDbLibraryPromise = (async () => {
            const allExercises = [];
            const seenIds = new Set();

            let after = "";
            let hasNextPage = true;
            let requests = 0;

            while (hasNextPage && requests < 30) {
                const params = new URLSearchParams({ limit: "100" });
                if (after) params.set("after", after);

                const response = await fetch(`${EXERCISEDB_FREE_API}?${params.toString()}`, {
                    headers: { "Accept": "application/json" },
                    cache: "default"
                });

                if (!response.ok) {
                    throw new Error(`ExerciseDB returned ${response.status}`);
                }

                const payload = await response.json();
                const rows = extractExerciseDbRows(payload)
                    .filter(item => item?.exerciseId && item?.name);

                rows.forEach(item => {
                    if (!seenIds.has(item.exerciseId)) {
                        seenIds.add(item.exerciseId);
                        allExercises.push(item);
                    }
                });

                const meta = payload?.meta || {};
                hasNextPage = Boolean(meta.hasNextPage && meta.nextCursor);

                if (hasNextPage) {
                    if (meta.nextCursor === after) break;
                    after = meta.nextCursor;
                }

                requests += 1;
            }

            if (!allExercises.length) {
                throw new Error("ExerciseDB returned no exercises.");
            }

            writeExerciseDbCache(allExercises);
            return allExercises;
        })().catch(error => {
            exerciseDbLastError = error;
            exerciseDbLibraryPromise = null;
            throw error;
        });

        return exerciseDbLibraryPromise;
    }

    function applyExerciseDbMatch(exercise, match, manual = false) {
        exercise.exerciseDbId = match.exerciseId || "";
        exercise.exerciseDbName = match.name || "";
        exercise.exerciseDbGifUrl = match.gifUrl || "";
        exercise.exerciseDbBodyParts = match.bodyParts || [];
        exercise.exerciseDbTargetMuscles = match.targetMuscles || [];
        exercise.exerciseDbSecondaryMuscles = match.secondaryMuscles || [];
        exercise.exerciseDbEquipments = match.equipments || [];
        exercise.exerciseDbInstructions = match.instructions || [];
        exercise.exerciseDbManualMatch = manual;
        exercise.exerciseDbMatchVersion = 3;
        saveData();
    }

    async function autoMatchExerciseDb(exercise, force = false, searchName = null) {
        if (!exercise) return null;
        if (!force && exercise.exerciseDbId && exercise.exerciseDbGifUrl) return exercise;

        const library = await fetchExerciseDbLibrary();
        const query = searchName || exercise.name;

        const ranked = library
            .map(item => ({ item, score: scoreExerciseDbMatch(query, item) }))
            .sort((a, b) => b.score - a.score);

        const best = ranked[0];

        if (!best || best.score < 250) return null;

        applyExerciseDbMatch(exercise, best.item, false);
        return exercise;
    }

    async function resolveExerciseDemo(exerciseOrId) {
        const exercise = typeof exerciseOrId === "string"
            ? trackerData.exercises.find(item => item.id === exerciseOrId)
            : exerciseOrId;
        const exerciseId = exercise?.id || (typeof exerciseOrId === "string" ? exerciseOrId : "");
        if (!exercise) {
            return { status: "missing", url: "", source: "", label: "No demo available", stats: getExerciseDemoStats(exerciseId) };
        }

        const stats = getExerciseDemoStats(exerciseId);
        const localDemo = window.gymLocalExerciseMedia?.resolve?.(exercise);

        if (localDemo?.path) {
            return {
                status: "ready",
                url: localDemo.path,
                source: "local",
                label: "Local demo",
                matchName: localDemo.name || exercise.name,
                providerKey: localDemo.key || "",
                stats
            };
        }

        if (exercise.guideMedia) {
            return {
                status: "ready",
                url: exercise.guideMedia,
                source: "custom",
                label: "Custom demo",
                matchName: exercise.name,
                stats
            };
        }

        if (exercise.exerciseDbGifUrl) {
            return {
                status: "ready",
                url: exercise.exerciseDbGifUrl,
                source: "exercisedb",
                label: "ExerciseDB demo",
                matchName: exercise.exerciseDbName || exercise.name,
                stats
            };
        }

        try {
            await autoMatchExerciseDb(exercise);
        } catch (error) {
            console.warn("Workout exercise demo lookup failed:", exercise.name, error);
        }

        if (exercise.exerciseDbGifUrl) {
            return {
                status: "ready",
                url: exercise.exerciseDbGifUrl,
                source: "exercisedb",
                label: "ExerciseDB demo",
                matchName: exercise.exerciseDbName || exercise.name,
                stats
            };
        }

        return {
            status: "missing",
            url: "",
            source: "",
            label: "No demo available",
            matchName: exercise.name,
            stats
        };
    }

    async function resolveWorkoutExerciseDemo(exerciseId) {
        return resolveExerciseDemo(exerciseId);
    }

    function getExerciseDbMetaHtml(exercise) {
        const chips = [];

        (exercise.exerciseDbTargetMuscles || []).forEach(value =>
            chips.push(`<span><strong>Primary</strong>${escapeHtml(value)}</span>`)
        );

        (exercise.exerciseDbSecondaryMuscles || []).slice(0, 3).forEach(value =>
            chips.push(`<span><strong>Secondary</strong>${escapeHtml(value)}</span>`)
        );

        (exercise.exerciseDbEquipments || []).slice(0, 2).forEach(value =>
            chips.push(`<span><strong>Equipment</strong>${escapeHtml(value)}</span>`)
        );

        return chips.length ? `<div class="exercise-db-meta">${chips.join("")}</div>` : "";
    }

    function getYouTubeVideoId(url) {
        const value = String(url || "").trim();
        if (!value) return "";

        try {
            const parsed = new URL(value);

            if (parsed.hostname === "youtu.be") {
                return parsed.pathname.split("/").filter(Boolean)[0] || "";
            }

            if (
                parsed.hostname.includes("youtube.com") ||
                parsed.hostname.includes("youtube-nocookie.com")
            ) {
                if (parsed.pathname === "/watch") {
                    return parsed.searchParams.get("v") || "";
                }

                const parts = parsed.pathname.split("/").filter(Boolean);
                const markerIndex = parts.findIndex(part =>
                    ["embed", "shorts", "live"].includes(part)
                );

                if (markerIndex >= 0 && parts[markerIndex + 1]) {
                    return parts[markerIndex + 1];
                }
            }
        } catch {
            return "";
        }

        return "";
    }

    function getYouTubeEmbedUrl(url) {
        const videoId = getYouTubeVideoId(url);
        if (!videoId) return "";

        return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0&playsinline=1`;
    }

    function renderYouTubeExerciseGuide(exercise, message = "") {
        const container = document.getElementById("exerciseGuideArea");
        if (!container || !exercise) return;

        const embedUrl = getYouTubeEmbedUrl(exercise.youtubeUrl);

        if (!embedUrl) {
            container.innerHTML = `
                <div class="exercise-guide-empty">
                    <strong>No exercise demo available</strong>
                    <span>${escapeHtml(message || "Add a YouTube technique video for this exercise.")}</span>
                </div>

                <div class="exercise-guide-meta">
                    <div>
                        <div class="small-label">YouTube fallback</div>
                        <div class="exercise-guide-help">Paste a normal YouTube, youtu.be or Shorts link.</div>
                    </div>

                    <button class="button secondary small" type="button"
                        onclick="editExerciseYouTube('${exercise.id}')">
                        Add YouTube video
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="exercise-guide-youtube-frame">
                <iframe
                    src="${escapeHtml(embedUrl)}"
                    title="${escapeHtml(exercise.name)} technique video"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowfullscreen
                    loading="lazy">
                </iframe>
            </div>

            <div class="exercise-guide-meta">
                <div>
                    <div class="small-label">YouTube technique video</div>
                    <div class="exercise-guide-help">${escapeHtml(exercise.youtubeUrl)}</div>
                </div>

                <div class="exercise-guide-button-row">
                    <button class="button secondary small" type="button"
                        onclick="editExerciseYouTube('${exercise.id}')">
                        Change video
                    </button>
                    <button class="button danger small" type="button"
                        onclick="removeExerciseYouTube('${exercise.id}')">
                        Remove
                    </button>
                </div>
            </div>

            ${message ? `
                <div class="exercise-youtube-fallback-note">
                    ${escapeHtml(message)}
                </div>
            ` : ""}
        `;
    }

    function editExerciseYouTube(exerciseId) {
        const exercise = trackerData.exercises.find(item => item.id === exerciseId);
        if (!exercise) return;

        const answer = prompt(
            "Paste the YouTube video link for this exercise:",
            exercise.youtubeUrl || ""
        );

        if (answer === null) return;

        const clean = answer.trim();

        if (!clean) {
            exercise.youtubeUrl = "";
            saveData();
            renderExerciseGuide(exercise);
            return;
        }

        if (!getYouTubeVideoId(clean)) {
            alert("That doesn't look like a valid YouTube link.");
            return;
        }

        exercise.youtubeUrl = clean;
        saveData();
        renderExerciseGuide(exercise);
    }

    function removeExerciseYouTube(exerciseId) {
        const exercise = trackerData.exercises.find(item => item.id === exerciseId);
        if (!exercise) return;

        exercise.youtubeUrl = "";
        saveData();
        renderExerciseGuide(exercise);
    }

    function renderResolvedExerciseGuide(exercise, demo) {
        const container = document.getElementById("exerciseGuideArea");
        if (!container || !exercise || !demo?.url) return false;

        const isLocal = demo.source === "local";
        const label = isLocal ? "Local demo" : demo.label || "Exercise demo";
        const matchName = demo.matchName || exercise.name;

        container.innerHTML = `
            <div class="exercise-guide-media-frame ${isLocal ? "exercise-local-frame" : "exercise-db-frame"}">
                <img id="exerciseDbGif" class="exercise-guide-media"
                    src="${escapeHtml(demo.url)}"
                    data-original-src="${escapeHtml(demo.url)}"
                    data-demo-source="${escapeHtml(demo.source || "")}"
                    referrerpolicy="no-referrer"
                    alt="${escapeHtml(matchName)} demonstration"
                    onload="handleExerciseDbGifLoaded()"
                    onerror="handleExerciseGuideGifError('${exercise.id}')">
            </div>

            <div class="exercise-guide-meta">
                <div>
                    <div class="small-label">${escapeHtml(label)}</div>
                    <div class="exercise-guide-match-name">
                        ${escapeHtml(matchName)}
                    </div>
                </div>

                <div class="exercise-guide-button-row">
                    ${isLocal ? "" : `
                        <button class="button secondary small" type="button"
                            onclick="changeExerciseDbMatch('${exercise.id}')">
                            Change match
                        </button>
                    `}
                    <button class="button secondary small" type="button"
                        onclick="editExerciseYouTube('${exercise.id}')">
                        ${exercise.youtubeUrl ? "Change YouTube" : "Add YouTube"}
                    </button>
                </div>
            </div>

            ${isLocal ? "" : getExerciseDbMetaHtml(exercise)}

            ${!isLocal && exercise.exerciseDbInstructions?.length ? `
                <details class="exercise-db-instructions">
                    <summary>Technique instructions</summary>
                    <ol>
                        ${exercise.exerciseDbInstructions.map(step => `
                            <li>${escapeHtml(String(step).replace(/^Step:\d+\s*/i, ""))}</li>
                        `).join("")}
                    </ol>
                </details>
            ` : ""}
        `;

        return true;
    }

    async function renderExerciseGuide(exercise) {
        const container = document.getElementById("exerciseGuideArea");
        if (!container || !exercise) return;

        container.innerHTML = `
            <div class="exercise-guide-loading">
                <div class="exercise-guide-spinner"></div>
                <strong>Finding exercise demo…</strong>
                <span>Checking local demos for ${escapeHtml(exercise.name)}</span>
            </div>
        `;

        let resolvedDemo = null;

        try {
            resolvedDemo = await resolveExerciseDemo(exercise);
        } catch (error) {
            console.warn("Exercise demo resolver failed:", exercise.name, error);
        }

        if (activeExerciseDetailId !== exercise.id) return;

        if (resolvedDemo?.status === "ready" && resolvedDemo.url) {
            renderResolvedExerciseGuide(exercise, resolvedDemo);
            return;
        }

        renderYouTubeExerciseGuide(
            exercise,
            "No automatic GIF match was found for this exercise."
        );
        return;

    }

    function handleExerciseDbGifLoaded() {
        const gif = document.getElementById("exerciseDbGif");
        if (gif) gif.classList.remove("gif-load-error");
    }

    function handleExerciseGuideGifError(exerciseId) {
        const gif = document.getElementById("exerciseDbGif");
        const exercise = trackerData.exercises.find(item => item.id === exerciseId);
        if (!gif || !exercise) return;

        if (gif.dataset.demoSource === "local") {
            const container = document.getElementById("exerciseGuideArea");
            if (container) {
                container.innerHTML = `
                    <div class="exercise-guide-empty">
                        <strong>No exercise demo available</strong>
                        <span>The local demo file could not be loaded.</span>
                    </div>
                `;
            }
            return;
        }

        handleExerciseDbGifError(exerciseId);
    }

    async function handleExerciseDbGifError(exerciseId) {
        const gif = document.getElementById("exerciseDbGif");
        const exercise = trackerData.exercises.find(item => item.id === exerciseId);
        if (!gif || !exercise) return;

        const original = exercise.exerciseDbGifUrl;
        if (!original) return;

        if (gif.dataset.blobAttempted === "true") {
            renderYouTubeExerciseGuide(
                exercise,
                "The automatic GIF could not be loaded, so YouTube is available as the fallback."
            );
            return;
        }

        gif.dataset.blobAttempted = "true";

        try {
            const response = await fetch(original, {
                method: "GET",
                mode: "cors",
                cache: "force-cache",
                referrerPolicy: "no-referrer"
            });

            if (!response.ok) throw new Error(`GIF returned ${response.status}`);

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);

            gif.onload = () => {
                gif.classList.remove("gif-load-error");
                setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
            };

            gif.onerror = () => {
                renderYouTubeExerciseGuide(
                    exercise,
                    "The automatic GIF could not be loaded, so YouTube is available as the fallback."
                );
            };

            gif.src = objectUrl;
        } catch (error) {
            console.error("ExerciseDB GIF could not be loaded:", error);
            renderYouTubeExerciseGuide(
                exercise,
                "The automatic GIF could not be loaded, so YouTube is available as the fallback."
            );
        }
    }

    async function changeExerciseDbMatch(exerciseId) {
        const exercise = trackerData.exercises.find(item => item.id === exerciseId);
        if (!exercise) return;

        const searchTerm = prompt(
            "Search ExerciseDB for this exercise:",
            exercise.exerciseDbName || exercise.name
        );
        if (searchTerm === null || !searchTerm.trim()) return;

        try {
            const library = await fetchExerciseDbLibrary();
            const ranked = library
                .map(item => ({ item, score: scoreExerciseDbMatch(searchTerm, item) }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 8);

            if (!ranked.length) {
                alert("No ExerciseDB matches were found.");
                return;
            }

            const options = ranked.map((result, index) =>
                `${index + 1}. ${result.item.name} — ${(result.item.equipments || []).join(", ")}`
            ).join("\n");

            const choice = prompt(
                `Choose the correct match by entering 1-${ranked.length}:\n\n${options}`,
                "1"
            );

            if (choice === null) return;

            const selectedIndex = Number(choice) - 1;
            if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= ranked.length) {
                alert("That wasn't a valid selection.");
                return;
            }

            applyExerciseDbMatch(exercise, ranked[selectedIndex].item, true);
            renderExerciseGuide(exercise);
        } catch (error) {
            console.error("ExerciseDB search failed:", error);
            alert("ExerciseDB could not be reached right now. Try again later.");
        }
    }

    function clearCustomExerciseGuide(exerciseId) {
        const exercise = trackerData.exercises.find(item => item.id === exerciseId);
        if (!exercise) return;
        exercise.guideMedia = "";
        saveData();
        renderExerciseGuide(exercise);
    }

    function setChartRange(range) {
        selectedChartRange = range;

        const progressPage = document.getElementById("progressPage");
        if (progressPage?.classList.contains("active")) {
            renderProgressPage();
        }

        const detailModal = document.getElementById("exerciseDetailModal");
        if (activeExerciseDetailId && detailModal?.classList.contains("open")) {
            const activeTab = document.querySelector(
                "[data-exercise-detail-tab].active"
            )?.dataset.exerciseDetailTab;

            if (activeTab === "charts") renderExerciseDetailTab("charts");
        }
    }

    function getRangeStartDate(range) {
        if (range === "ALL") return null;

        const now = new Date();
        const start = new Date(now);

        if (range === "1M") start.setMonth(start.getMonth() - 1);
        if (range === "3M") start.setMonth(start.getMonth() - 3);
        if (range === "6M") start.setMonth(start.getMonth() - 6);
        if (range === "1Y") start.setFullYear(start.getFullYear() - 1);
        if (range === "YTD") {
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);
        }

        return start;
    }

    function filterHistoryByRange(history, range = selectedChartRange) {
        const start = getRangeStartDate(range);
        if (!start) return history;

        return history.filter(item => new Date(`${item.date}T23:59:59`) >= start);
    }

    function renderChartRangeButtons() {
        return `
            <div class="chart-range-toolbar">
                ${["1M", "3M", "6M", "YTD", "1Y", "ALL"].map(range => `
                    <button class="chart-range-button ${selectedChartRange === range ? "active" : ""}"
                        type="button" onclick="setChartRange('${range}')">${range}</button>
                `).join("")}
            </div>
        `;
    }

    function setExerciseDetailMetric(metric) {
        selectedExerciseDetailMetric = metric;
        renderExerciseDetailTab("charts");
    }

    function getBestSetFromHistory(history) {
        const candidates = history.flatMap(item =>
            item.sets.map(set => ({
                ...set,
                date: item.date,
                estimated1RM: estimate1RM(set.weightKg, set.reps),
                setVolume: set.weightKg * set.reps
            }))
        );

        return candidates.sort((a, b) =>
            b.estimated1RM - a.estimated1RM ||
            b.weightKg - a.weightKg ||
            b.reps - a.reps
        )[0] || null;
    }

    function renderExerciseDetailTab(tabName) {
        if (!activeExerciseDetailId) return;

        document.querySelectorAll("[data-exercise-detail-tab]").forEach(button => {
            button.classList.toggle("active", button.dataset.exerciseDetailTab === tabName);
        });

        const exercise = trackerData.exercises.find(item => item.id === activeExerciseDetailId);
        const history = getExerciseHistory(activeExerciseDetailId);
        const content = document.getElementById("exerciseDetailContent");

        if (!exercise || !content) return;

        const last = history.at(-1);
        const lifetimeVolume = history.reduce((sum, item) => sum + item.volume, 0);
        const totalSets = history.reduce((sum, item) => sum + item.sets.length, 0);
        const totalReps = history.reduce((sum, item) => sum + item.totalReps, 0);
        const bestWeight = history.length ? Math.max(...history.map(item => item.bestWeight)) : null;
        const best1RM = history.length ? Math.max(...history.map(item => item.estimated1RM)) : null;
        const bestVolume = history.length ? Math.max(...history.map(item => item.volume)) : null;
        const maxReps = history.length ? Math.max(...history.map(item => item.maxReps)) : null;
        const bestSet = getBestSetFromHistory(history);

        if (tabName === "records") {
            content.innerHTML = `
                <div class="exercise-record-grid">
                    <article>
                        <span>Best set</span>
                        <strong>${bestSet ? `${bestSet.weightKg} kg × ${bestSet.reps}` : "—"}</strong>
                        <small>${bestSet ? escapeHtml(bestSet.date) : ""}</small>
                    </article>
                    <article>
                        <span>Heaviest weight</span>
                        <strong>${bestWeight === null ? "—" : `${bestWeight} kg`}</strong>
                    </article>
                    <article>
                        <span>Most reps</span>
                        <strong>${maxReps === null ? "—" : `${maxReps} reps`}</strong>
                    </article>
                    <article>
                        <span>Estimated 1RM</span>
                        <strong>${best1RM === null ? "—" : `${best1RM.toFixed(1)} kg`}</strong>
                    </article>
                    <article>
                        <span>Best session volume</span>
                        <strong>${bestVolume === null ? "—" : `${Math.round(bestVolume).toLocaleString()} kg`}</strong>
                    </article>
                    <article>
                        <span>Sessions</span>
                        <strong>${history.length}</strong>
                    </article>
                    <article>
                        <span>Lifetime sets</span>
                        <strong>${totalSets.toLocaleString()}</strong>
                    </article>
                    <article>
                        <span>Lifetime reps</span>
                        <strong>${totalReps.toLocaleString()}</strong>
                    </article>
                    <article class="wide">
                        <span>Lifetime volume</span>
                        <strong>${Math.round(lifetimeVolume).toLocaleString()} kg</strong>
                    </article>
                </div>
            `;
            return;
        }

        if (tabName === "charts") {
            const rangedHistory = filterHistoryByRange(history);
            const metrics = {
                estimated1RM: { label: "Estimated 1RM", suffix: " kg" },
                bestWeight: { label: "Best weight", suffix: " kg" },
                volume: { label: "Training volume", suffix: " kg" }
            };
            if (!metrics[selectedExerciseDetailMetric]) selectedExerciseDetailMetric = "estimated1RM";
            const metric = metrics[selectedExerciseDetailMetric];

            content.innerHTML = `
                <div class="exercise-detail-chart-controls">
                    <div class="chart-toolbar">
                        ${Object.entries(metrics).map(([key, info]) => `
                            <button class="button small ${selectedExerciseDetailMetric === key ? "" : "secondary"}"
                                type="button" onclick="setExerciseDetailMetric('${key}')">
                                ${info.label}
                            </button>
                        `).join("")}
                    </div>
                    ${renderChartRangeButtons()}
                </div>

                <div class="exercise-detail-chart-card">
                    <div class="exercise-detail-section-heading">
                        <h3>${metric.label}</h3>
                        <span>${selectedChartRange}</span>
                    </div>

                    ${rangedHistory.length ? `
                        <div class="chart-wrap">
                            <canvas id="exerciseDetailChart"></canvas>
                        </div>
                    ` : `
                        <div class="empty-message">
                            No workouts for this exercise in the selected range.
                        </div>
                    `}
                </div>
            `;

            if (rangedHistory.length) {
                requestAnimationFrame(() =>
                    drawExerciseDetailChart(rangedHistory, selectedExerciseDetailMetric)
                );
            }
            return;
        }

        const historyHtml = history.length
            ? [...history].reverse().map(item => {
                const workout = trackerData.workouts.find(entry => entry.id === item.workoutId);
                const day = trackerData.days.find(entry => entry.id === workout?.dayId);
                const dayLabel = day ? `${day.label} — ${day.name}` : "Workout";
                const prBadges = getHistoryPrBadges(item);

                return `
                    <article class="exercise-history-card">
                        <div class="exercise-history-header">
                            <div>
                                <strong>${escapeHtml(item.date)}</strong>
                                <span>${escapeHtml(dayLabel)}</span>
                            </div>
                            <div class="exercise-history-volume">
                                ${Math.round(item.volume).toLocaleString()} kg
                            </div>
                        </div>

                        <div class="exercise-history-metrics">
                            <div>
                                <span>Best set</span>
                                <strong>${escapeHtml(getBestSetLabel(item))}</strong>
                            </div>
                            <div>
                                <span>Best weight</span>
                                <strong>${item.bestWeight} kg</strong>
                            </div>
                            <div>
                                <span>Total reps</span>
                                <strong>${item.totalReps}</strong>
                            </div>
                            <div>
                                <span>Est. 1RM</span>
                                <strong>${item.estimated1RM.toFixed(1)} kg</strong>
                            </div>
                        </div>

                        <div class="exercise-history-sets">
                            ${item.sets.map((set, index) => `
                                <div>
                                    <span>Set ${index + 1}</span>
                                    <strong>${set.weightKg} kg × ${set.reps}</strong>
                                </div>
                            `).join("")}
                        </div>

                        <div class="exercise-history-footer">
                            <span>${item.sets.length} sets</span>
                            <button class="button secondary small" type="button"
                                onclick="openSavedWorkoutReview('${item.workoutId}')">
                                Review workout
                            </button>
                            <span>${prBadges.map(pr => `<span class="pr-badge">${escapeHtml(pr)}</span>`).join("")}</span>
                        </div>
                    </article>
                `;
            }).join("")
            : `<div class="empty-message">No workout history recorded for this exercise yet.</div>`;

        content.innerHTML = `
            <div class="exercise-detail-summary">
                <article>
                    <span>Sessions</span>
                    <strong>${history.length}</strong>
                </article>
                <article>
                    <span>Best weight</span>
                    <strong>${bestWeight === null ? "—" : `${bestWeight} kg`}</strong>
                </article>
                <article>
                    <span>Lifetime sets</span>
                    <strong>${totalSets.toLocaleString()}</strong>
                </article>
                <article>
                    <span>Lifetime volume</span>
                    <strong>${Math.round(lifetimeVolume).toLocaleString()} kg</strong>
                </article>
            </div>

            ${exercise.notes ? `
                <div class="exercise-detail-note">
                    <div class="small-label">Your note</div>
                    <p>${escapeHtml(exercise.notes)}</p>
                </div>
            ` : ""}

            <div class="exercise-detail-section-heading">
                <h3>History</h3>
                <span>${last ? `Last: ${escapeHtml(last.date)}` : "No sessions yet"}</span>
            </div>

            <div class="exercise-history-list">
                ${historyHtml}
            </div>
        `;
    }

    function drawExerciseDetailChart(history, metric) {
        const canvas = document.getElementById("exerciseDetailChart");
        if (!canvas) return;
        drawChartOnCanvas(canvas, history, metric);
    }

    function renderLibrary() {
        const container = document.getElementById("exerciseLibrary");

        if (!trackerData.exercises.length) {
            container.className = "exercise-library-categories";
            container.innerHTML = `<div class="panel"><p class="empty-message">Your exercise library is empty.</p></div>`;
            return;
        }

        container.className = "exercise-library-categories";
        const groups = getExercisesGroupedByCategory();

        container.innerHTML = EXERCISE_CATEGORY_ORDER.map(category => {
            const exercises = groups[category];
            if (!exercises.length) return "";

            const cards = exercises.map(exercise => {
                const history = getExerciseHistory(exercise.id);
                const last = history.at(-1);
                const bestWeight = history.length
                    ? Math.max(...history.map(item => item.bestWeight))
                    : 0;

                return `
                    <article class="library-item">
                        <button class="library-exercise-title" type="button"
                            onclick="openExerciseDetail('${exercise.id}')">${escapeHtml(exercise.name)}</button>
                        <div class="library-meta">
                            Workouts recorded: ${history.length}<br>
                            Best weight: ${bestWeight ? `${bestWeight} kg` : "No data"}<br>
                            Last performance: ${
                                last
                                    ? last.sets.map(set => `${set.weightKg} kg × ${set.reps}`).join(", ")
                                    : "No performance recorded"
                            }
                        </div>
                        <div class="library-actions">
                            <button class="button small" onclick="openExerciseProgress('${exercise.id}')">
                                View progress
                            </button>
                        </div>
                    </article>
                `;
            }).join("");

            return `
                <section class="exercise-category-section">
                    <div class="exercise-category-heading">
                        <h3>${escapeHtml(category)}</h3>
                        <span>${exercises.length} exercise${exercises.length === 1 ? "" : "s"}</span>
                    </div>
                    <div class="library-grid">${cards}</div>
                </section>
            `;
        }).join("");
    }

    function openExerciseProgress(exerciseId) {
        document.getElementById("progressExerciseSelect").value = exerciseId;
        showPage("progressPage");
    }

    function estimate1RM(weight, reps) {
        return weight * (1 + reps / 30);
    }

    function getBestSetLabel(item) {
        const bestSet = getBestSetFromHistory([item]);
        return bestSet ? `${bestSet.weightKg} kg \u00d7 ${bestSet.reps}` : "\u2014";
    }

    function getHistoryPrBadges(item) {
        return [
            item.prs?.bestWeight ? "Weight PR" : "",
            item.prs?.estimated1RM ? "1RM PR" : "",
            item.prs?.volume ? "Volume PR" : ""
        ].filter(Boolean);
    }

    function getExerciseHistory(exerciseId) {
        let bestWeightSoFar = 0;
        let best1RMSoFar = 0;
        let bestVolumeSoFar = 0;

        return trackerData.workouts
            .map(workout => {
                const exercise = workout.exercises.find(item => item.exerciseId === exerciseId);
                if (!exercise) return null;

                const bestWeight = Math.max(...exercise.sets.map(set => set.weightKg));
                const maxReps = Math.max(...exercise.sets.map(set => set.reps));
                const totalReps = exercise.sets.reduce((sum, set) => sum + set.reps, 0);
                const volume = exercise.sets.reduce(
                    (sum, set) => sum + set.weightKg * set.reps, 0
                );
                const estimated1RM = Math.max(
                    ...exercise.sets.map(set => estimate1RM(set.weightKg, set.reps))
                );

                return {
                    workoutId: workout.id,
                    date: workout.date,
                    sets: exercise.sets,
                    bestWeight,
                    maxReps,
                    totalReps,
                    volume,
                    estimated1RM
                };
            })
            .filter(Boolean)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map(item => {
                const prs = {
                    bestWeight: item.bestWeight > bestWeightSoFar,
                    estimated1RM: item.estimated1RM > best1RMSoFar + 0.05,
                    volume: item.volume > bestVolumeSoFar
                };

                bestWeightSoFar = Math.max(bestWeightSoFar, item.bestWeight);
                best1RMSoFar = Math.max(best1RMSoFar, item.estimated1RM);
                bestVolumeSoFar = Math.max(bestVolumeSoFar, item.volume);

                return { ...item, prs };
            });
    }

    function setProgressMetric(metric) {
        selectedProgressMetric = metric;
        renderProgressPage();
    }

    function formatChange(latest, previous, suffix = "") {
        if (previous === null || previous === undefined) return "No comparison";
        const change = latest - previous;
        const percentage = previous !== 0 ? (change / previous) * 100 : 0;
        const sign = change > 0 ? "+" : "";
        return `${sign}${change.toFixed(1)}${suffix} (${sign}${percentage.toFixed(1)}%)`;
    }

    function deleteWorkout(workoutId, returnPage = "progressPage") {
        const workout = trackerData.workouts.find(item => item.id === workoutId);
        if (!workout) return;

        const day = trackerData.days.find(item => item.id === workout.dayId);
        const dayName = workout.isFreeWorkout
            ? "Extra Workout"
            : day ? `${day.label} \u2014 ${day.name}` : "this session";

        const confirmed = confirm(
            `Delete the workout from ${workout.date}?\n\n` +
            `This will remove every exercise recorded in ${dayName} on that date. ` +
            `This cannot be undone.`
        );

        if (!confirmed) return;

        trackerData.workouts = trackerData.workouts.filter(item => item.id !== workoutId);
        saveData();
        renderAll();
        showPage(returnPage);
    }

    const MUSCLE_BALANCE_RANGES = [7, 30, 90];
    const MUSCLE_BALANCE_GROUPS = [
        "Chest",
        "Lats",
        "Upper Back",
        "Shoulders",
        "Biceps",
        "Triceps",
        "Forearms",
        "Quads",
        "Hamstrings",
        "Glutes",
        "Calves",
        "Core"
    ];
    const MUSCLE_BALANCE_NORMALIZATION = new Map([
        ["chest", "Chest"],
        ["pecs", "Chest"],
        ["pectorals", "Chest"],
        ["upper chest", "Chest"],
        ["lower chest", "Chest"],
        ["lats", "Lats"],
        ["lat", "Lats"],
        ["latissimus dorsi", "Lats"],
        ["upper back", "Upper Back"],
        ["traps", "Upper Back"],
        ["trapezius", "Upper Back"],
        ["rhomboids", "Upper Back"],
        ["rear delts", "Shoulders"],
        ["rear deltoids", "Shoulders"],
        ["front delts", "Shoulders"],
        ["front deltoids", "Shoulders"],
        ["side delts", "Shoulders"],
        ["side deltoids", "Shoulders"],
        ["delts", "Shoulders"],
        ["deltoids", "Shoulders"],
        ["shoulders", "Shoulders"],
        ["biceps", "Biceps"],
        ["brachialis", "Biceps"],
        ["triceps", "Triceps"],
        ["tricep", "Triceps"],
        ["forearms", "Forearms"],
        ["forearm", "Forearms"],
        ["quads", "Quads"],
        ["quadriceps", "Quads"],
        ["hamstrings", "Hamstrings"],
        ["hamstring", "Hamstrings"],
        ["glutes", "Glutes"],
        ["gluteus", "Glutes"],
        ["calves", "Calves"],
        ["calf", "Calves"],
        ["gastrocnemius", "Calves"],
        ["soleus", "Calves"],
        ["core", "Core"],
        ["abs", "Core"],
        ["abdominals", "Core"],
        ["obliques", "Core"],
        ["lower back", "Core"]
    ]);

    function normalizeMuscleBalanceName(value) {
        const key = String(value || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        return MUSCLE_BALANCE_NORMALIZATION.get(key) || "";
    }

    function getMuscleBalanceRangeWindow(rangeDays) {
        const safeDays = MUSCLE_BALANCE_RANGES.includes(Number(rangeDays)) ? Number(rangeDays) : 7;
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        const start = new Date(end);
        start.setDate(start.getDate() - safeDays + 1);
        start.setHours(0, 0, 0, 0);
        return { start, end, days: safeDays };
    }

    function createEmptyMuscleStats() {
        const muscles = {};
        MUSCLE_BALANCE_GROUPS.forEach(name => {
            muscles[name] = {
                name,
                effectiveSets: 0,
                completedSets: 0,
                primarySets: 0,
                secondarySets: 0,
                exercises: new Map()
            };
        });
        return muscles;
    }

    function addMuscleContribution(muscle, exercise, completedSets, weight, role) {
        if (!muscle || !exercise || !completedSets) return;
        const effectiveSets = completedSets * weight;
        muscle.effectiveSets += effectiveSets;
        muscle.completedSets += completedSets;
        if (role === "primary") muscle.primarySets += completedSets;
        if (role === "secondary") muscle.secondarySets += completedSets;

        const existing = muscle.exercises.get(exercise.id) || {
            exerciseId: exercise.id,
            name: exercise.name || "Exercise",
            completedSets: 0,
            effectiveSets: 0,
            primarySets: 0,
            secondarySets: 0
        };
        existing.completedSets += completedSets;
        existing.effectiveSets += effectiveSets;
        if (role === "primary") existing.primarySets += completedSets;
        if (role === "secondary") existing.secondarySets += completedSets;
        muscle.exercises.set(exercise.id, existing);
    }

    function getMuscleContributions(exercise, completedSets) {
        const primary = [...new Set((exercise?.primaryMuscles || []).map(normalizeMuscleBalanceName).filter(Boolean))];
        const secondary = [...new Set((exercise?.secondaryMuscles || []).map(normalizeMuscleBalanceName).filter(Boolean))]
            .filter(name => !primary.includes(name));

        return { primary, secondary, hasKnownMuscle: Boolean(primary.length || secondary.length) };
    }

    function getMuscleTrainingStats(rangeDays = selectedMuscleBalanceRange) {
        const window = getMuscleBalanceRangeWindow(rangeDays);
        const muscles = createEmptyMuscleStats();
        const excluded = new Map();
        let workoutCount = 0;
        let validSetCount = 0;

        (trackerData.workouts || []).forEach(workout => {
            const workoutTime = new Date(`${workout?.date || ""}T12:00:00`);
            if (!(workoutTime >= window.start && workoutTime <= window.end)) return;

            let workoutHasSets = false;
            (workout.exercises || []).forEach(item => {
                const sets = getValidWorkoutSets(item?.sets);
                if (!sets.length) return;

                const exercise = (trackerData.exercises || []).find(entry => entry.id === item?.exerciseId);
                const completedSets = sets.length;
                const contributions = getMuscleContributions(exercise, completedSets);
                validSetCount += completedSets;
                workoutHasSets = true;

                if (!contributions.hasKnownMuscle) {
                    const key = exercise?.id || item?.exerciseId || "unknown";
                    const current = excluded.get(key) || {
                        exerciseId: key,
                        name: exercise?.name || "Unknown exercise",
                        completedSets: 0
                    };
                    current.completedSets += completedSets;
                    excluded.set(key, current);
                    return;
                }

                contributions.primary.forEach(name =>
                    addMuscleContribution(muscles[name], exercise, completedSets, 1, "primary")
                );
                contributions.secondary.forEach(name =>
                    addMuscleContribution(muscles[name], exercise, completedSets, 0.5, "secondary")
                );
            });

            if (workoutHasSets) workoutCount += 1;
        });

        const muscleList = Object.values(muscles)
            .map(muscle => ({
                ...muscle,
                exercises: [...muscle.exercises.values()]
                    .sort((a, b) => b.effectiveSets - a.effectiveSets || a.name.localeCompare(b.name))
            }))
            .sort((a, b) => b.effectiveSets - a.effectiveSets || a.name.localeCompare(b.name));

        return {
            ...window,
            workoutCount,
            validSetCount,
            muscles: muscleList,
            excluded: [...excluded.values()].sort((a, b) => b.completedSets - a.completedSets)
        };
    }

    function getMuscleIntensity(muscle) {
        const effectiveSets = Number(muscle?.effectiveSets) || 0;
        if (effectiveSets <= 0) return { level: 0, label: "Not trained" };
        if (effectiveSets < 3) return { level: 1, label: "Lightly trained" };
        if (effectiveSets < 6) return { level: 2, label: "Moderately trained" };
        if (effectiveSets < 10) return { level: 3, label: "Well trained" };
        return { level: 4, label: "High workload" };
    }

    function formatEffectiveSets(value) {
        const number = Number(value) || 0;
        return number % 1 === 0 ? String(number) : number.toFixed(1);
    }

    function getMuscleBalanceSummary(stats) {
        const totalsFor = names => names.reduce((sum, name) => {
            const muscle = stats.muscles.find(item => item.name === name);
            return sum + (muscle?.effectiveSets || 0);
        }, 0);
        const upper = totalsFor(["Chest", "Lats", "Upper Back", "Shoulders", "Biceps", "Triceps", "Forearms"]);
        const lower = totalsFor(["Quads", "Hamstrings", "Glutes", "Calves"]);
        const core = totalsFor(["Core"]);
        const push = totalsFor(["Chest", "Shoulders", "Triceps"]);
        const pull = totalsFor(["Lats", "Upper Back", "Biceps", "Forearms"]);
        const legs = lower;
        const observations = [];

        if (!stats.workoutCount || !stats.validSetCount) {
            observations.push(`No completed workouts in the last ${stats.days} days.`);
        } else {
            if (upper && lower) {
                const ratio = Math.max(upper, lower) / Math.max(1, Math.min(upper, lower));
                if (ratio < 1.4) observations.push("Upper and lower body received similar training exposure.");
                else if (upper > lower) observations.push("Upper body received substantially more training exposure than lower body.");
                else observations.push("Lower body received substantially more training exposure than upper body.");
            } else if (upper) {
                observations.push("Only upper-body training was recorded in this period.");
            } else if (lower) {
                observations.push("Only lower-body training was recorded in this period.");
            }

            if (push && pull) {
                const ratio = Math.max(push, pull) / Math.max(1, Math.min(push, pull));
                if (ratio < 1.35) observations.push("Push and pull exposure is broadly balanced.");
                else if (push > pull) observations.push("Push muscles received more exposure than pull muscles.");
                else observations.push("Pull muscles received more exposure than push muscles.");
            }

            const calves = stats.muscles.find(item => item.name === "Calves");
            if (!calves?.effectiveSets) observations.push("No direct calf work was classified in this period.");

            const biceps = stats.muscles.find(item => item.name === "Biceps");
            if (biceps?.primarySets && biceps?.secondarySets) {
                observations.push("Biceps received both direct and secondary work.");
            }
        }

        return {
            upper,
            lower,
            core,
            push,
            pull,
            legs,
            observations: observations.slice(0, 3)
        };
    }

    function renderMuscleDetailPanel(stats) {
        const selected = stats.muscles.find(item => item.name === selectedMuscleBalanceName);
        if (!selected) return "";
        const intensity = getMuscleIntensity(selected);

        return `
            <aside class="muscle-detail-panel">
                <div class="muscle-detail-heading">
                    <div>
                        <span class="small-label">Selected period</span>
                        <h3>${escapeHtml(selected.name)}</h3>
                    </div>
                    <span class="muscle-intensity-pill" data-intensity="${intensity.level}">
                        ${escapeHtml(intensity.label)}
                    </span>
                </div>
                <div class="muscle-detail-total">
                    <strong>${formatEffectiveSets(selected.effectiveSets)}</strong>
                    <span>effective sets in ${stats.days}D</span>
                </div>
                <div class="muscle-contribution-list">
                    ${selected.exercises.length ? selected.exercises.map(exercise => `
                        <div class="muscle-contribution-row">
                            <strong>${escapeHtml(exercise.name)}</strong>
                            <span>
                                ${exercise.completedSets} completed set${exercise.completedSets === 1 ? "" : "s"}
                                · ${formatEffectiveSets(exercise.effectiveSets)} effective
                            </span>
                        </div>
                    `).join("") : `<div class="empty-message">No contributing exercises in this period.</div>`}
                </div>
            </aside>
        `;
    }

    function renderMuscleTrainingBalance() {
        const container = document.getElementById("muscleTrainingBalance");
        if (!container) return;

        if (!MUSCLE_BALANCE_RANGES.includes(Number(selectedMuscleBalanceRange))) {
            selectedMuscleBalanceRange = 7;
        }

        const stats = getMuscleTrainingStats(selectedMuscleBalanceRange);
        const maxEffectiveSets = Math.max(1, ...stats.muscles.map(item => item.effectiveSets));
        const activeMuscle = stats.muscles.find(item => item.name === selectedMuscleBalanceName);
        if (!selectedMuscleBalanceName || !activeMuscle) {
            selectedMuscleBalanceName = stats.muscles.find(item => item.effectiveSets > 0)?.name || "Chest";
        }
        const balance = getMuscleBalanceSummary(stats);

        container.innerHTML = `
            <section class="panel muscle-balance-panel">
                <div class="muscle-balance-header">
                    <div>
                        <div class="small-label">Training balance</div>
                        <h2>Muscle Heatmap</h2>
                        <p>
                            Effective sets from saved workouts in the selected rolling period.
                        </p>
                    </div>
                    <div class="muscle-range-controls" aria-label="Muscle heatmap range">
                        ${MUSCLE_BALANCE_RANGES.map(range => `
                            <button class="chart-range-button ${Number(selectedMuscleBalanceRange) === range ? "active" : ""}"
                                type="button" onclick="setMuscleBalanceRange(${range})">${range}D</button>
                        `).join("")}
                    </div>
                </div>

                <div class="muscle-balance-summary-grid">
                    <article>
                        <span>Workouts</span>
                        <strong>${stats.workoutCount}</strong>
                    </article>
                    <article>
                        <span>Completed sets</span>
                        <strong>${stats.validSetCount}</strong>
                    </article>
                    <article>
                        <span>Classified muscles</span>
                        <strong>${stats.muscles.filter(item => item.effectiveSets > 0).length}</strong>
                    </article>
                    <article>
                        <span>Excluded exercises</span>
                        <strong>${stats.excluded.length}</strong>
                    </article>
                </div>

                <div class="muscle-balance-layout">
                    <div class="muscle-heatmap-grid">
                        ${stats.muscles.map(muscle => {
                            const intensity = getMuscleIntensity(muscle);
                            const percent = Math.round((muscle.effectiveSets / maxEffectiveSets) * 100);
                            const contributors = muscle.exercises.slice(0, 3).map(item => item.name).join(" · ");
                            return `
                                <button class="muscle-heatmap-card ${selectedMuscleBalanceName === muscle.name ? "active" : ""}"
                                    data-intensity="${intensity.level}"
                                    type="button"
                                    onclick="selectMuscleBalance('${muscle.name}')">
                                    <div>
                                        <strong>${escapeHtml(muscle.name)}</strong>
                                        <span>${escapeHtml(intensity.label)}</span>
                                    </div>
                                    <em>${formatEffectiveSets(muscle.effectiveSets)} effective sets</em>
                                    <div class="muscle-heatmap-meter" aria-hidden="true">
                                        <span style="width:${percent}%"></span>
                                    </div>
                                    <small>${escapeHtml(contributors || "No contributing exercises")}</small>
                                </button>
                            `;
                        }).join("")}
                    </div>

                    ${renderMuscleDetailPanel(stats)}
                </div>

                <div class="training-balance-notes">
                    <div>
                        <h3>Balance notes</h3>
                        ${balance.observations.length
                            ? `<ul>${balance.observations.map(note => `<li>${escapeHtml(note)}</li>`).join("")}</ul>`
                            : `<p class="empty-message">No balance notes available yet.</p>`
                        }
                    </div>
                    <div class="training-balance-groups">
                        <span>Upper ${formatEffectiveSets(balance.upper)}</span>
                        <span>Lower ${formatEffectiveSets(balance.lower)}</span>
                        <span>Core ${formatEffectiveSets(balance.core)}</span>
                        <span>Push ${formatEffectiveSets(balance.push)}</span>
                        <span>Pull ${formatEffectiveSets(balance.pull)}</span>
                        <span>Legs ${formatEffectiveSets(balance.legs)}</span>
                    </div>
                </div>

                ${stats.excluded.length ? `
                    <div class="muscle-excluded-note">
                        ${stats.excluded.length} exercise${stats.excluded.length === 1 ? "" : "s"} excluded due to missing or unrecognized muscle information:
                        ${escapeHtml(stats.excluded.slice(0, 4).map(item => item.name).join(", "))}
                        ${stats.excluded.length > 4 ? "..." : ""}
                    </div>
                ` : ""}
            </section>
        `;
    }

    function setMuscleBalanceRange(rangeDays) {
        selectedMuscleBalanceRange = MUSCLE_BALANCE_RANGES.includes(Number(rangeDays)) ? Number(rangeDays) : 7;
        renderMuscleTrainingBalance();
    }

    function selectMuscleBalance(muscleName) {
        selectedMuscleBalanceName = muscleName;
        renderMuscleTrainingBalance();
    }

    const PLATEAU_MIN_EXPOSURES = 4;
    const PLATEAU_REVIEW_EXPOSURES = 6;
    const PLATEAU_FILTERS = [
        { key: "all", label: "All" },
        { key: "plateau", label: "Plateau" },
        { key: "possible", label: "Possible" },
        { key: "progressing", label: "Progressing" }
    ];
    const PLATEAU_STATUS_META = {
        plateau: { label: "Plateau", rank: 0 },
        possible: { label: "Possible Plateau", rank: 1 },
        stable: { label: "Stable", rank: 2 },
        progressing: { label: "Progressing", rank: 3 },
        not_enough: { label: "Not enough data", rank: 4 }
    };

    function getLastItem(items) {
        return Array.isArray(items) && items.length ? items[items.length - 1] : null;
    }

    function getExerciseExposureHistory(exerciseId) {
        return (trackerData.workouts || [])
            .map(workout => {
                const entry = Array.isArray(workout?.exercises)
                    ? workout.exercises.find(item => item.exerciseId === exerciseId)
                    : null;
                const sets = getValidWorkoutSets(entry?.sets);
                if (!sets.length) return null;

                const metrics = getExerciseSessionMetrics(sets);
                const repsByWeight = new Map();
                sets.forEach(set => {
                    const key = getWeightKey(set.weightKg);
                    repsByWeight.set(key, Math.max(repsByWeight.get(key) || 0, Number(set.reps)));
                });

                return {
                    workout,
                    workoutId: workout.id,
                    date: workout.date,
                    createdAt: workout.createdAt || "",
                    sets,
                    metrics,
                    bestWeight: metrics.bestWeight,
                    bestSet: metrics.bestSet,
                    estimated1RM: metrics.estimated1RM,
                    volume: metrics.volume,
                    repsByWeight,
                    improvements: [],
                    hasPrior: false
                };
            })
            .filter(Boolean)
            .sort((a, b) => {
                const dateCompare = new Date(`${a.date}T12:00:00`) - new Date(`${b.date}T12:00:00`);
                return dateCompare || new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
            });
    }

    function getExposureTopSetLabel(exposure) {
        const set = exposure?.bestSet;
        return set ? `${formatWeight(set.weightKg)} kg × ${set.reps}` : "—";
    }

    function summarizeExposureImprovements(exercise, exposures) {
        const settings = getProgressionSettings(exercise);
        const increment = Math.max(0.25, Number(settings.incrementKg) || DEFAULT_PROGRESSION.incrementKg);
        const e1rmTolerance = Math.max(0.5, increment * 0.1);
        let previousBestWeight = 0;
        let previousBest1RM = 0;
        const previousBestRepsByWeight = new Map();

        exposures.forEach(exposure => {
            exposure.hasPrior = previousBestWeight > 0 || previousBest1RM > 0 || previousBestRepsByWeight.size > 0;

            const improvements = [];
            if (exposure.hasPrior) {
                if (exposure.bestWeight >= previousBestWeight + increment - 0.001) {
                    improvements.push(`Weight increased by at least ${formatWeight(increment)} kg.`);
                }

                const improvedRepSet = exposure.sets.find(set => {
                    const key = getWeightKey(set.weightKg);
                    return previousBestRepsByWeight.has(key) && Number(set.reps) >= previousBestRepsByWeight.get(key) + 1;
                });
                if (improvedRepSet) {
                    improvements.push(`Reps increased at ${formatWeight(improvedRepSet.weightKg)} kg.`);
                }

                if (exposure.estimated1RM > previousBest1RM + e1rmTolerance) {
                    improvements.push(`Estimated 1RM improved by more than ${e1rmTolerance.toFixed(1)} kg.`);
                }

                const existingPrs = getExercisePRsForSavedWorkout(
                    exercise.id,
                    exposure.sets,
                    getWorkoutsBeforeSavedWorkout(exposure.workout)
                );
                if (existingPrs.length) {
                    improvements.push("Existing PR logic detected a new PR.");
                }
            }

            exposure.improvements = [...new Set(improvements)];
            previousBestWeight = Math.max(previousBestWeight, exposure.bestWeight);
            previousBest1RM = Math.max(previousBest1RM, exposure.estimated1RM);
            exposure.repsByWeight.forEach((reps, weightKey) => {
                previousBestRepsByWeight.set(weightKey, Math.max(previousBestRepsByWeight.get(weightKey) || 0, reps));
            });
        });
    }

    function describeLastImprovement(exposures) {
        const latest = getLastItem(exposures);
        const latestIndex = exposures.length - 1;
        const improvedIndex = getLastItem(exposures.map((exposure, index) => ({ exposure, index }))
            .filter(item => item.exposure.improvements.length)
        );

        if (!latest) return "No valid exposures yet";
        if (!improvedIndex) return "No meaningful improvement detected yet";

        const workoutsAgo = latestIndex - improvedIndex.index;
        const daysAgo = Math.max(
            0,
            Math.round((new Date(`${latest.date}T12:00:00`) - new Date(`${improvedIndex.exposure.date}T12:00:00`)) / 86400000)
        );

        if (workoutsAgo === 0) return "Latest exposure";
        if (daysAgo > 0) return `${workoutsAgo} workout${workoutsAgo === 1 ? "" : "s"} ago · ${daysAgo} days ago`;
        return `${workoutsAgo} workout${workoutsAgo === 1 ? "" : "s"} ago`;
    }

    function getPlateauExplanation(status, exposures, recentWindow) {
        const latestImprovement = getLastItem(recentWindow.filter(exposure => exposure.improvements.length));
        const latest = getLastItem(exposures);
        const recentCount = recentWindow.length;
        const topSet = getExposureTopSetLabel(latest);

        if (status === "not_enough") {
            return `${exposures.length} valid exposure${exposures.length === 1 ? "" : "s"} recorded. At least ${PLATEAU_MIN_EXPOSURES} are needed.`;
        }

        if (status === "progressing") {
            return latestImprovement?.improvements[0] || "A meaningful weight, rep, estimated 1RM, or PR improvement was detected recently.";
        }

        if (status === "plateau") {
            return `No meaningful weight, rep, estimated 1RM, or PR improvement across the last ${recentCount} valid exposures.`;
        }

        if (status === "possible") {
            return `No meaningful weight, rep, estimated 1RM, or PR improvement across the last ${recentCount} valid exposures.`;
        }

        return `Recent best is ${topSet}; no sustained plateau pattern yet.`;
    }

    function detectExercisePlateau(exercise) {
        const exposures = getExerciseExposureHistory(exercise.id);
        summarizeExposureImprovements(exercise, exposures);

        const latest = getLastItem(exposures);
        const recentSix = exposures.slice(-PLATEAU_REVIEW_EXPOSURES);
        const recentFour = exposures.slice(-PLATEAU_MIN_EXPOSURES);
        const recentWithPriorSix = recentSix.filter(exposure => exposure.hasPrior);
        const recentWithPriorFour = recentFour.filter(exposure => exposure.hasPrior);
        const recentImprovement = recentSix.some(exposure => exposure.improvements.length);
        let status = "stable";

        if (exposures.length < PLATEAU_MIN_EXPOSURES) {
            status = "not_enough";
        } else if (recentImprovement) {
            status = "progressing";
        } else if (
            exposures.length >= PLATEAU_REVIEW_EXPOSURES &&
            recentWithPriorSix.length >= PLATEAU_MIN_EXPOSURES &&
            recentWithPriorSix.every(exposure => !exposure.improvements.length)
        ) {
            status = "plateau";
        } else if (
            recentWithPriorFour.length >= PLATEAU_MIN_EXPOSURES - 1 &&
            recentWithPriorFour.every(exposure => !exposure.improvements.length)
        ) {
            status = "possible";
        }

        const recentWindow = status === "plateau" ? recentSix : recentFour;
        const settings = getProgressionSettings(exercise);

        return {
            exercise,
            exerciseId: exercise.id,
            name: exercise.name || "Exercise",
            status,
            statusLabel: PLATEAU_STATUS_META[status].label,
            exposures,
            recentWindow,
            exposureCount: exposures.length,
            lastTrained: latest?.date || "",
            lastImprovement: describeLastImprovement(exposures),
            recentBest: getExposureTopSetLabel(latest),
            latestEstimated1RM: latest?.estimated1RM || 0,
            explanation: getPlateauExplanation(status, exposures, recentWindow),
            incrementKg: settings.incrementKg,
            repRange: `${settings.minReps}-${settings.maxReps}`,
            evidenceScore: status === "plateau"
                ? recentWithPriorSix.length
                : status === "possible"
                    ? recentWithPriorFour.length
                    : 0
        };
    }

    function getPlateauFallbackAnalysis(exercise, error) {
        return {
            exercise,
            exerciseId: exercise?.id || "",
            name: exercise?.name || "Exercise",
            status: "not_enough",
            statusLabel: PLATEAU_STATUS_META.not_enough.label,
            exposures: [],
            recentWindow: [],
            exposureCount: 0,
            lastTrained: "",
            lastImprovement: "Analysis unavailable",
            recentBest: "—",
            latestEstimated1RM: 0,
            explanation: "This exercise could not be analyzed from the current saved workout records.",
            incrementKg: DEFAULT_PROGRESSION.incrementKg,
            repRange: `${DEFAULT_PROGRESSION.minReps}-${DEFAULT_PROGRESSION.maxReps}`,
            evidenceScore: 0
        };
    }

    function getPlateauAnalysis() {
        return (trackerData.exercises || [])
            .map(exercise => {
                try {
                    return detectExercisePlateau(exercise);
                } catch (error) {
                    return getPlateauFallbackAnalysis(exercise, error);
                }
            })
            .sort((a, b) => {
                const rankCompare = PLATEAU_STATUS_META[a.status].rank - PLATEAU_STATUS_META[b.status].rank;
                if (rankCompare) return rankCompare;
                if (b.evidenceScore !== a.evidenceScore) return b.evidenceScore - a.evidenceScore;
                return new Date(`${b.lastTrained || "1900-01-01"}T12:00:00`) - new Date(`${a.lastTrained || "1900-01-01"}T12:00:00`);
            });
    }

    function renderPlateauSparkline(exposures) {
        const points = exposures.slice(-6);
        if (points.length < 2) return "";

        const values = points.map(item => Number(item.estimated1RM) || 0);
        let min = Math.min(...values);
        let max = Math.max(...values);
        if (min === max) {
            min = Math.max(0, min - 1);
            max += 1;
        }

        const coords = values.map((value, index) => {
            const x = (index / (values.length - 1)) * 100;
            const y = 30 - ((value - min) / (max - min)) * 24;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(" ");

        return `
            <svg class="plateau-sparkline" viewBox="0 0 100 34" role="img" aria-label="Estimated 1RM recent trend">
                <polyline points="${coords}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
            </svg>
        `;
    }

    function filterPlateauAnalysis(analysis) {
        if (selectedPlateauFilter === "plateau") return analysis.filter(item => item.status === "plateau");
        if (selectedPlateauFilter === "possible") return analysis.filter(item => item.status === "possible");
        if (selectedPlateauFilter === "progressing") return analysis.filter(item => item.status === "progressing");
        return analysis;
    }

    function renderPlateauSection() {
        const container = document.getElementById("plateauDetection");
        if (!container) return;

        if (!PLATEAU_FILTERS.some(filter => filter.key === selectedPlateauFilter)) {
            selectedPlateauFilter = "all";
        }

        let analysis = [];
        let analysisError = null;
        try {
            analysis = getPlateauAnalysis();
        } catch (error) {
            analysisError = error;
            console.warn("Plateau detection could not analyze saved workouts:", error);
        }

        const filtered = filterPlateauAnalysis(analysis);
        const counts = analysis.reduce((summary, item) => {
            summary[item.status] = (summary[item.status] || 0) + 1;
            return summary;
        }, {});

        container.innerHTML = `
            <section class="panel plateau-panel">
                <div class="plateau-header">
                    <div>
                        <div class="small-label">Progress analysis</div>
                        <h2>Plateau Detection</h2>
                        <p>
                            Conservative exposure-based analysis from saved workouts.
                        </p>
                    </div>
                    <div class="plateau-filters" aria-label="Plateau filters">
                        ${PLATEAU_FILTERS.map(filter => `
                            <button class="chart-range-button ${selectedPlateauFilter === filter.key ? "active" : ""}"
                                type="button" onclick="setPlateauFilter('${filter.key}')">
                                ${escapeHtml(filter.label)}
                            </button>
                        `).join("")}
                    </div>
                </div>

                <div class="plateau-summary-grid">
                    <article data-status="plateau"><span>Plateau</span><strong>${counts.plateau || 0}</strong></article>
                    <article data-status="possible"><span>Possible</span><strong>${counts.possible || 0}</strong></article>
                    <article data-status="stable"><span>Stable</span><strong>${counts.stable || 0}</strong></article>
                    <article data-status="progressing"><span>Progressing</span><strong>${counts.progressing || 0}</strong></article>
                    <article data-status="not_enough"><span>Not enough data</span><strong>${counts.not_enough || 0}</strong></article>
                </div>

                ${analysisError ? `
                    <div class="empty-message">
                        Plateau analysis could not read every saved workout record, so no automatic status was applied.
                    </div>
                ` : ""}

                ${analysis.length ? `
                    <div class="plateau-card-list">
                        ${filtered.length ? filtered.map(item => `
                            <article class="plateau-card" data-status="${item.status}">
                                <div class="plateau-card-main">
                                    <button class="plateau-exercise-name" type="button"
                                        onclick="openExerciseDetail('${item.exerciseId}')">
                                        ${escapeHtml(item.name)}
                                    </button>
                                    <span class="plateau-status-badge" data-status="${item.status}">
                                        ${escapeHtml(item.statusLabel)}
                                    </span>
                                </div>
                                <div class="plateau-metrics">
                                    <div><span>Exposures</span><strong>${item.exposureCount}</strong></div>
                                    <div><span>Last trained</span><strong>${escapeHtml(item.lastTrained || "—")}</strong></div>
                                    <div><span>Recent best</span><strong>${escapeHtml(item.recentBest)}</strong></div>
                                    <div><span>Last improvement</span><strong>${escapeHtml(item.lastImprovement)}</strong></div>
                                </div>
                                <div class="plateau-card-detail">
                                    <p>${escapeHtml(item.explanation)}</p>
                                    ${renderPlateauSparkline(item.exposures)}
                                </div>
                                <div class="plateau-card-footer">
                                    <span>Range ${escapeHtml(item.repRange)} · Increment ${formatWeight(item.incrementKg)} kg</span>
                                    <button class="button secondary small" type="button"
                                        onclick="openExerciseProgress('${item.exerciseId}')">
                                        View Progress
                                    </button>
                                </div>
                            </article>
                        `).join("") : `
                            <div class="empty-message">
                                No exercises match this filter.
                            </div>
                        `}
                    </div>
                ` : `
                    <div class="empty-message">
                        Keep logging workouts. Plateau analysis begins after ${PLATEAU_MIN_EXPOSURES} valid exposures for an exercise.
                    </div>
                `}
            </section>
        `;
    }

    function setPlateauFilter(filter) {
        selectedPlateauFilter = PLATEAU_FILTERS.some(item => item.key === filter) ? filter : "all";
        renderPlateauSection();
    }

    function renderProgressPage() {
        renderMuscleTrainingBalance();
        renderPlateauSection();

        const exerciseId = document.getElementById("progressExerciseSelect").value;
        const content = document.getElementById("progressContent");

        if (!exerciseId) {
            content.innerHTML = `<div class="panel"><p class="empty-message">Choose an exercise to view its progress.</p></div>`;
            return;
        }

        const exercise = trackerData.exercises.find(item => item.id === exerciseId);
        const history = getExerciseHistory(exerciseId);

        if (!history.length) {
            content.innerHTML = `
                <div class="panel">
                    <h2>${escapeHtml(exercise.name)}</h2>
                    <p class="empty-message">No workouts have been logged for this exercise yet.</p>
                </div>
            `;
            return;
        }

        const first = history[0];
        const latest = history.at(-1);
        const previous = history.length > 1 ? history.at(-2) : null;
        const bestWeight = Math.max(...history.map(item => item.bestWeight));
        const best1RM = Math.max(...history.map(item => item.estimated1RM));
        const bestVolume = Math.max(...history.map(item => item.volume));
        if (!["estimated1RM", "bestWeight", "volume"].includes(selectedProgressMetric)) {
            selectedProgressMetric = "estimated1RM";
        }

        content.innerHTML = `
            <div class="metric-grid">
                <article class="stat-card">
                    <div class="stat-label">Workouts</div>
                    <div class="stat-value">${history.length}</div>
                </article>
                <article class="stat-card">
                    <div class="stat-label">Best weight</div>
                    <div class="stat-value">${bestWeight.toFixed(1)} kg</div>
                </article>
                <article class="stat-card">
                    <div class="stat-label">Best estimated 1RM</div>
                    <div class="stat-value">${best1RM.toFixed(1)} kg</div>
                </article>
                <article class="stat-card">
                    <div class="stat-label">Best session volume</div>
                    <div class="stat-value">${Math.round(bestVolume)} kg</div>
                </article>
            </div>

            <div class="panel">
                <h2>${escapeHtml(exercise.name)}</h2>
                <div class="chart-toolbar">
                    <button class="button small ${selectedProgressMetric === "estimated1RM" ? "" : "secondary"}"
                        onclick="setProgressMetric('estimated1RM')">Estimated 1RM</button>
                    <button class="button small ${selectedProgressMetric === "bestWeight" ? "" : "secondary"}"
                        onclick="setProgressMetric('bestWeight')">Best weight</button>
                    <button class="button small ${selectedProgressMetric === "volume" ? "" : "secondary"}"
                        onclick="setProgressMetric('volume')">Volume</button>
                </div>
                ${renderChartRangeButtons()}
                <div class="chart-wrap">
                    <canvas id="progressChart"></canvas>
                </div>
            </div>

            <div class="panel">
                <h3>Latest progress</h3>
                <p>
                    Latest versus previous:
                    <strong>${formatChange(
                        latest[selectedProgressMetric],
                        previous ? previous[selectedProgressMetric] : null,
                        selectedProgressMetric === "totalReps" ? " reps" : " kg"
                    )}</strong>
                </p>
                <p>
                    Latest versus first:
                    <strong>${formatChange(
                        latest[selectedProgressMetric],
                        first[selectedProgressMetric],
                        selectedProgressMetric === "totalReps" ? " reps" : " kg"
                    )}</strong>
                </p>
            </div>

            <div class="panel">
                <h3>Workout history</h3>
                <div class="exercise-progress-history-list">
                    ${[...history].reverse().map(item => {
                        const prBadges = getHistoryPrBadges(item);
                        return `
                            <article class="exercise-progress-history-card">
                                <div class="exercise-history-header">
                                    <div>
                                        <strong>${escapeHtml(item.date)}</strong>
                                        <span>${item.sets.length} sets</span>
                                    </div>
                                    <div class="exercise-history-volume">
                                        ${Math.round(item.volume).toLocaleString()} kg
                                    </div>
                                </div>

                                <div class="exercise-history-metrics">
                                    <div>
                                        <span>Best set</span>
                                        <strong>${escapeHtml(getBestSetLabel(item))}</strong>
                                    </div>
                                    <div>
                                        <span>Best weight</span>
                                        <strong>${item.bestWeight.toFixed(1)} kg</strong>
                                    </div>
                                    <div>
                                        <span>Total reps</span>
                                        <strong>${item.totalReps}</strong>
                                    </div>
                                    <div>
                                        <span>Est. 1RM</span>
                                        <strong>${item.estimated1RM.toFixed(1)} kg</strong>
                                    </div>
                                </div>

                                <div class="exercise-history-footer">
                                    <span>${prBadges.map(pr => `<span class="pr-badge">${escapeHtml(pr)}</span>`).join("")}</span>
                                    <span class="exercise-history-actions">
                                        <button class="button secondary small" type="button"
                                            onclick="openSavedWorkoutReview('${item.workoutId}', 'progressPage')">Review workout</button>
                                        <button class="button danger small" type="button"
                                            onclick="deleteWorkout('${item.workoutId}')">Delete workout</button>
                                    </span>
                                </div>
                            </article>
                        `;
                    }).join("")}
                    <table class="history-table">
                        <thead>
                            <tr>
                                <th>Date</th><th>Sets</th><th>Best weight</th>
                                <th>Est. 1RM</th><th>Volume</th><th>Total reps</th><th></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${[...history].reverse().map(item => `
                                <tr>
                                    <td>${escapeHtml(item.date)}</td>
                                    <td>${escapeHtml(item.sets.map(set => `${set.weightKg}×${set.reps}`).join(", "))}</td>
                                    <td>${item.bestWeight.toFixed(1)} kg</td>
                                    <td>${item.estimated1RM.toFixed(1)} kg</td>
                                    <td>${Math.round(item.volume)} kg</td>
                                    <td>${item.totalReps}</td>
                                    <td>
                                        <button class="button secondary small" type="button"
                                            onclick="openSavedWorkoutReview('${item.workoutId}', 'progressPage')">Review</button>
                                        <button class="button danger small" type="button"
                                            onclick="deleteWorkout('${item.workoutId}')">Delete workout</button>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        requestAnimationFrame(() => drawProgressChart(filterHistoryByRange(history), selectedProgressMetric));
    }

    function drawProgressChart(history, metric) {
        const canvas = document.getElementById("progressChart");
        if (!canvas || !history.length) return;
        drawChartOnCanvas(canvas, history, metric);
    }

    function drawChartOnCanvas(canvas, history, metric) {
        if (!canvas || !history.length) return;

        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(600, rect.width) * dpr;
        canvas.height = 320 * dpr;

        const ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);

        const width = canvas.width / dpr;
        const height = canvas.height / dpr;
        const pad = { left: 58, right: 20, top: 25, bottom: 55 };

        ctx.clearRect(0, 0, width, height);

        const values = history.map(item => item[metric]);
        let min = Math.min(...values);
        let max = Math.max(...values);

        if (min === max) {
            min = Math.max(0, min - 1);
            max += 1;
        }

        const range = max - min;
        min = Math.max(0, min - range * .1);
        max += range * .1;

        const x = index => {
            if (history.length === 1) {
                return pad.left + (width - pad.left - pad.right) / 2;
            }

            return pad.left +
                index * (width - pad.left - pad.right) / (history.length - 1);
        };

        const y = value =>
            pad.top +
            (max - value) *
            (height - pad.top - pad.bottom) /
            (max - min);

        ctx.strokeStyle = "#353d48";
        ctx.fillStyle = "#a8b0bb";
        ctx.lineWidth = 1;
        ctx.font = "12px Arial";

        for (let i = 0; i <= 4; i++) {
            const value = min + (max - min) * i / 4;
            const py = y(value);

            ctx.beginPath();
            ctx.moveTo(pad.left, py);
            ctx.lineTo(width - pad.right, py);
            ctx.stroke();

            ctx.fillText(
                value.toFixed(metric === "totalReps" || metric === "maxReps" ? 0 : 1),
                8,
                py + 4
            );
        }

        ctx.strokeStyle = "#eb5134";
        ctx.lineWidth = 3;
        ctx.beginPath();

        history.forEach((item, index) => {
            const px = x(index);
            const py = y(item[metric]);

            if (index === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });

        ctx.stroke();

        history.forEach((item, index) => {
            const px = x(index);
            const py = y(item[metric]);

            ctx.fillStyle = "#eb5134";
            ctx.beginPath();
            ctx.arc(px, py, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#a8b0bb";
            const label = item.date.slice(5);
            ctx.save();
            ctx.translate(px, height - 15);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(label, 0, 0);
            ctx.restore();
        });
    }

    function calculateMaleNavyBodyFat(heightCm, neckCm, waistCm) {
        if (heightCm <= 0 || neckCm <= 0 || waistCm <= neckCm) return null;

        const heightInches = heightCm / 2.54;
        const neckInches = neckCm / 2.54;
        const waistInches = waistCm / 2.54;

        const bodyFat =
            86.010 * Math.log10(waistInches - neckInches)
            - 70.041 * Math.log10(heightInches)
            + 36.76;

        if (!Number.isFinite(bodyFat)) return null;
        return Math.max(2, Math.min(bodyFat, 70));
    }

    function getBodyFormValues() {
        return {
            date: document.getElementById("bodyDate").value,
            heightCm: Number(document.getElementById("heightCm").value),
            weightKg: Number(document.getElementById("bodyWeight").value),
            neckCm: Number(document.getElementById("neckCm").value),
            waistCm: Number(document.getElementById("waistCm").value)
        };
    }

    function previewBodyFat() {
        const values = getBodyFormValues();
        const bodyFat = calculateMaleNavyBodyFat(values.heightCm, values.neckCm, values.waistCm);
        const result = document.getElementById("bodyFatResult");

        if (bodyFat === null) {
            result.innerHTML = `
                <div class="small-label">Estimated body fat</div>
                <div class="result-main">Check your measurements</div>
            `;
            return;
        }

        const fatMass = values.weightKg > 0 ? values.weightKg * bodyFat / 100 : null;
        const leanMass = fatMass !== null ? values.weightKg - fatMass : null;

        result.innerHTML = `
            <div class="small-label">Estimated body fat</div>
            <div class="result-main">${bodyFat.toFixed(1)}%</div>
            ${fatMass !== null ? `
                <div class="stat-subtext">
                    Estimated fat mass: ${fatMass.toFixed(1)} kg<br>
                    Estimated lean mass: ${leanMass.toFixed(1)} kg
                </div>
            ` : ""}
        `;
    }

    function saveBodyEntry() {
        const values = getBodyFormValues();

        if (!values.date || values.heightCm <= 0 || values.weightKg <= 0 ||
            values.neckCm <= 0 || values.waistCm <= 0) {
            return alert("Complete all body measurement fields.");
        }

        const bodyFat = calculateMaleNavyBodyFat(values.heightCm, values.neckCm, values.waistCm);
        if (bodyFat === null) {
            return alert("The waist measurement must be larger than the neck measurement.");
        }

        const existingIndex = trackerData.bodyEntries.findIndex(entry => entry.date === values.date);
        const entry = {
            id: existingIndex >= 0
                ? trackerData.bodyEntries[existingIndex].id
                : createId("body"),
            ...values,
            bodyFat
        };

        if (existingIndex >= 0) trackerData.bodyEntries[existingIndex] = entry;
        else trackerData.bodyEntries.push(entry);

        saveData();
        previewBodyFat();
        renderAll();
        alert("Body measurement saved.");
    }

    function deleteBodyEntry(entryId) {
        if (!confirm("Delete this body measurement entry?")) return;
        trackerData.bodyEntries = trackerData.bodyEntries.filter(entry => entry.id !== entryId);
        saveData();
        renderAll();
    }

    function getBodyMetricInfo() {
        return {
            weightKg: { label: "Weight", suffix: " kg", decimals: 2 },
            bodyFat: { label: "Body Fat", suffix: "%", decimals: 1 },
            both: { label: "Both", suffix: "", decimals: 1 }
        };
    }

    function setBodyMetric(metric) {
        if (!getBodyMetricInfo()[metric]) return;
        selectedBodyMetric = metric;
        renderBodyHistory();
    }

    function setBodyRange(range) {
        selectedBodyRange = range;
        renderBodyHistory();
    }

    function filterBodyEntriesByRange(entries) {
        const start = getRangeStartDate(selectedBodyRange);
        if (!start) return entries;

        return entries.filter(entry => new Date(`${entry.date}T23:59:59`) >= start);
    }

    function formatBodyValue(entry, metric) {
        const info = getBodyMetricInfo()[metric];
        const value = Number(entry?.[metric]);
        if (!info || !Number.isFinite(value)) return "\u2014";
        return `${value.toFixed(info.decimals)}${info.suffix}`;
    }

    function renderBodyDashboard(entriesDesc) {
        const root = document.getElementById("bodyProgressDashboard");
        const trendsRoot = document.getElementById("bodyProgressTrends");
        if (!root) return;

        const latest = entriesDesc[0];
        const metrics = getBodyMetricInfo();
        const entriesAsc = [...entriesDesc].reverse();
        const rangedEntries = filterBodyEntriesByRange(entriesAsc);
        if (!metrics[selectedBodyMetric]) selectedBodyMetric = "weightKg";

        if (!latest) {
            root.innerHTML = `
                <div class="panel">
                    <p class="empty-message">No body measurements saved yet.</p>
                </div>
            `;
            if (trendsRoot) trendsRoot.innerHTML = "";
            return;
        }

        root.innerHTML = `
            <section class="body-current-grid">
                <article class="stat-card">
                    <div class="stat-label">Weight</div>
                    <div class="stat-value">${latest.weightKg.toFixed(2)} kg</div>
                </article>
                <article class="stat-card">
                    <div class="stat-label">Waist</div>
                    <div class="stat-value">${latest.waistCm.toFixed(1)} cm</div>
                </article>
                <article class="stat-card">
                    <div class="stat-label">Neck</div>
                    <div class="stat-value">${latest.neckCm.toFixed(1)} cm</div>
                </article>
                <article class="stat-card">
                    <div class="stat-label">Body fat</div>
                    <div class="stat-value">${latest.bodyFat.toFixed(1)}%</div>
                </article>
            </section>
        `;

        if (!trendsRoot) return;

        trendsRoot.innerHTML = `
            <section class="panel body-chart-panel">
                <div class="exercise-detail-section-heading">
                    <h3>${selectedBodyMetric === "both" ? "Weight and body fat trend" : `${metrics[selectedBodyMetric].label} trend`}</h3>
                    <span>${selectedBodyRange}</span>
                </div>

                <div class="chart-toolbar">
                    ${Object.entries(metrics).map(([key, info]) => `
                        <button class="button small ${selectedBodyMetric === key ? "" : "secondary"}"
                            type="button" onclick="setBodyMetric('${key}')">${info.label}</button>
                    `).join("")}
                </div>

                <div class="chart-range-toolbar">
                    ${["1M", "3M", "6M", "YTD", "1Y", "ALL"].map(range => `
                        <button class="chart-range-button ${selectedBodyRange === range ? "active" : ""}"
                            type="button" onclick="setBodyRange('${range}')">${range}</button>
                    `).join("")}
                </div>

                ${rangedEntries.length ? `
                    ${selectedBodyMetric === "both" ? `
                        <div class="body-chart-legend">
                            <span><i class="weight"></i>Weight kg</span>
                            <span><i class="body-fat"></i>Body Fat %</span>
                        </div>
                    ` : ""}
                    <div class="chart-wrap">
                        <canvas id="bodyProgressChart"></canvas>
                    </div>
                ` : `
                    <div class="empty-message">No measurements in this range.</div>
                `}
            </section>

            <div class="section-heading compact-section-heading">
                <h2>Measurement History</h2>
            </div>

            <section class="body-entry-list">
                ${entriesDesc.map(entry => `
                    <article class="body-entry-card">
                        <div>
                            <strong>${escapeHtml(entry.date)}</strong>
                            <span>${entry.weightKg.toFixed(2)} kg</span>
                        </div>
                        <div>
                            <span>Waist</span>
                            <strong>${entry.waistCm.toFixed(1)} cm</strong>
                        </div>
                        <div>
                            <span>Neck</span>
                            <strong>${entry.neckCm.toFixed(1)} cm</strong>
                        </div>
                        <div>
                            <span>Body fat</span>
                            <strong>${entry.bodyFat.toFixed(1)}%</strong>
                        </div>
                        <button class="button danger small"
                            type="button"
                            onclick="deleteBodyEntry('${entry.id}')">Delete</button>
                    </article>
                `).join("")}
            </section>
        `;

        if (rangedEntries.length) {
            requestAnimationFrame(() => drawBodyProgressChart(rangedEntries));
        }
    }

    function drawBodyProgressChart(entries) {
        const canvas = document.getElementById("bodyProgressChart");
        if (!canvas || !entries.length) return;
        const metric = selectedBodyMetric;

        if (metric === "both") {
            drawBodyDualAxisChart(canvas, entries);
            return;
        }

        const chartItems = entries.map(entry => ({
            date: entry.date,
            [metric]: Number(entry[metric])
        }));
        drawChartOnCanvas(canvas, chartItems, metric);
    }

    function drawBodyDualAxisChart(canvas, entries) {
        const ctx = canvas.getContext("2d");
        const rect = canvas.parentElement.getBoundingClientRect();
        const width = Math.max(320, rect.width);
        const height = 260;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        ctx.clearRect(0, 0, width, height);

        const pad = { left: 58, right: 58, top: 24, bottom: 52 };
        const plotWidth = width - pad.left - pad.right;
        const plotHeight = height - pad.top - pad.bottom;
        const weightValues = entries.map(entry => Number(entry.weightKg)).filter(Number.isFinite);
        const bodyFatValues = entries.map(entry => Number(entry.bodyFat)).filter(Number.isFinite);
        if (!weightValues.length || !bodyFatValues.length) return;

        const getDomain = values => {
            let min = Math.min(...values);
            let max = Math.max(...values);
            if (min === max) {
                min -= 1;
                max += 1;
            }
            const padding = (max - min) * 0.12;
            return { min: min - padding, max: max + padding };
        };

        const weightDomain = getDomain(weightValues);
        const fatDomain = getDomain(bodyFatValues);
        const xForIndex = index => entries.length === 1
            ? pad.left + plotWidth / 2
            : pad.left + (index / (entries.length - 1)) * plotWidth;
        const yForValue = (value, domain) => pad.top + (1 - (value - domain.min) / (domain.max - domain.min)) * plotHeight;

        ctx.strokeStyle = "rgba(255,255,255,.08)";
        ctx.lineWidth = 1;
        ctx.font = "12px Arial";
        ctx.fillStyle = "#a8b0bb";
        for (let i = 0; i <= 4; i += 1) {
            const y = pad.top + (plotHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(pad.left, y);
            ctx.lineTo(width - pad.right, y);
            ctx.stroke();

            const weightLabel = weightDomain.max - ((weightDomain.max - weightDomain.min) / 4) * i;
            const fatLabel = fatDomain.max - ((fatDomain.max - fatDomain.min) / 4) * i;
            ctx.fillStyle = "#66d9ef";
            ctx.textAlign = "right";
            ctx.fillText(`${weightLabel.toFixed(1)} kg`, pad.left - 8, y + 4);
            ctx.fillStyle = "#ff7a1a";
            ctx.textAlign = "left";
            ctx.fillText(`${fatLabel.toFixed(1)}%`, width - pad.right + 8, y + 4);
        }

        const drawSeries = (key, color, domain) => {
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            entries.forEach((entry, index) => {
                const value = Number(entry[key]);
                if (!Number.isFinite(value)) return;
                const x = xForIndex(index);
                const y = yForValue(value, domain);
                if (index === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();

            entries.forEach((entry, index) => {
                const value = Number(entry[key]);
                if (!Number.isFinite(value)) return;
                ctx.beginPath();
                ctx.arc(xForIndex(index), yForValue(value, domain), 4, 0, Math.PI * 2);
                ctx.fill();
            });
        };

        drawSeries("weightKg", "#66d9ef", weightDomain);
        drawSeries("bodyFat", "#ff7a1a", fatDomain);

        ctx.fillStyle = "#a8b0bb";
        ctx.textAlign = "center";
        entries.forEach((entry, index) => {
            const x = xForIndex(index);
            const label = entry.date.slice(5);
            ctx.save();
            ctx.translate(x, height - 15);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(label, 0, 0);
            ctx.restore();
        });
    }

    function renderBodyHistory() {
        const bodyHistory = document.getElementById("bodyHistory");
        const entries = [...trackerData.bodyEntries]
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        renderBodyDashboard(entries);

        if (!entries.length) {
            bodyHistory.innerHTML = `<tr><td colspan="8">No measurements saved yet.</td></tr>`;
            return;
        }

        bodyHistory.innerHTML = entries.map(entry => {
            const fatMass = entry.weightKg * entry.bodyFat / 100;
            const leanMass = entry.weightKg - fatMass;

            return `
                <tr>
                    <td>${escapeHtml(entry.date)}</td>
                    <td>${entry.weightKg.toFixed(2)} kg</td>
                    <td>${entry.neckCm.toFixed(1)} cm</td>
                    <td>${entry.waistCm.toFixed(1)} cm</td>
                    <td>${entry.bodyFat.toFixed(1)}%</td>
                    <td>${fatMass.toFixed(1)} kg</td>
                    <td>${leanMass.toFixed(1)} kg</td>
                    <td>
                        <button class="button danger small"
                            onclick="deleteBodyEntry('${entry.id}')">Delete</button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function renderAll() {
        populateSelectors();
        renderDashboard();
        renderProgramme();
        renderWorkoutLogger();
        renderLibrary();
        renderProgressPage();
        renderBodyHistory();
        renderBackupPanel();
        renderAccountPanel();
    }

    document.getElementById("bodyDate").value = getTodayDate();

    window.addEventListener("resize", () => {
        const exerciseId = document.getElementById("progressExerciseSelect").value;
        if (!exerciseId || !document.getElementById("progressChart")) return;
        drawProgressChart(getExerciseHistory(exerciseId), selectedProgressMetric);
    });

    trackerData.exercises.forEach(repairExerciseRecord);

    const newExerciseNameInput = document.getElementById("newExerciseName");
    if (newExerciseNameInput) {
        newExerciseNameInput.addEventListener("input", renderExerciseTagPreview);
        newExerciseNameInput.addEventListener("change", renderExerciseTagPreview);
    }

    window.gymExerciseMedia = {
        resolveWorkoutExerciseDemo,
        getExerciseDemoStats
    };

    renderAll();

    document.getElementById("workoutSummaryModal").addEventListener("click", event => {
        if (event.target.id === "workoutSummaryModal") closeWorkoutSummary();
    });

    document.getElementById("exerciseDetailModal").addEventListener("click", event => {
        if (event.target.id === "exerciseDetailModal") closeExerciseDetail();
    });

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;

        if (document.getElementById("exerciseDetailModal").classList.contains("open")) {
            closeExerciseDetail();
            return;
        }

        if (document.getElementById("workoutSummaryModal").classList.contains("open")) {
            closeWorkoutSummary();
            return;
        }

        if (document.getElementById("workoutCompletePage")?.classList.contains("active")) {
            closeWorkoutComplete();
        }
    });

// v1.4.2 — searchable exercise picker with multi-muscle and equipment filters
let exercisePickerMuscles = new Set();
let exercisePickerEquipment = new Set();
let exercisePickerSelected = new Set();
let exercisePickerOpenFilter = null;

const PICKER_MUSCLES = ["Chest","Front Delts","Side Delts","Rear Delts","Biceps","Triceps","Forearms","Lats","Upper Back","Traps","Lower Back","Neck","Abs","Obliques","Glutes","Quads","Hamstrings","Calves","Adductors","Abductors"];
const PICKER_EQUIPMENT = ["Barbell","Dumbbell","Kettlebell","Machine","Bodyweight","Cardio","Smith Machine","Cable","Safety Bar","EZ Bar","Other"];


function getMusclePickerIcon(muscle){
    const name=String(muscle||"");
    const backMuscles=new Set(["Lats","Upper Back","Traps","Lower Back","Rear Delts"]);
    const back=backMuscles.has(name);

    const zones={
        "Chest":[[15,18,7,5],[25,18,7,5]],
        "Front Delts":[[11,17,4,5],[29,17,4,5]],
        "Side Delts":[[9,18,4,6],[31,18,4,6]],
        "Rear Delts":[[10,18,4,5],[30,18,4,5]],
        "Biceps":[[7,25,3,7],[33,25,3,7]],
        "Triceps":[[7,25,3,7],[33,25,3,7]],
        "Forearms":[[5,34,3,8],[35,34,3,8]],
        "Lats":[[12,24,5,10],[28,24,5,10]],
        "Upper Back":[[16,22,12,8]],
        "Traps":[[17,16,10,7]],
        "Lower Back":[[18,31,8,8]],
        "Neck":[[19,11,6,6]],
        "Abs":[[17,24,10,16]],
        "Obliques":[[13,26,4,14],[27,26,4,14]],
        "Glutes":[[15,42,7,7],[25,42,7,7]],
        "Quads":[[13,48,6,14],[27,48,6,14]],
        "Hamstrings":[[13,48,6,14],[27,48,6,14]],
        "Calves":[[14,63,5,12],[27,63,5,12]],
        "Adductors":[[18,48,4,13],[24,48,4,13]],
        "Abductors":[[11,46,5,10],[29,46,5,10]]
    };

    const marks=(zones[name]||[]).map(([x,y,w,h]) =>
        `<ellipse cx="${x+w/2}" cy="${y+h/2}" rx="${w/2}" ry="${h/2}" fill="#ff7a18" opacity=".95"/>`
    ).join("");

    return `<svg viewBox="0 0 44 80" aria-hidden="true" focusable="false">
        <circle cx="22" cy="7" r="5" fill="#5a616a"/>
        <path d="M16 14 Q22 11 28 14 L32 30 L29 43 L27 48 L29 73 L24 73 L22 51 L20 73 L15 73 L17 48 L15 43 L12 30 Z" fill="#444b54"/>
        <path d="M13 18 L7 34 L4 48 M31 18 L37 34 L40 48" stroke="#555d66" stroke-width="5" stroke-linecap="round"/>
        ${back?`<path d="M16 17 L28 17 M14 28 L30 28 M17 39 L27 39" stroke="#6b737d" stroke-width="1" opacity=".8"/>`:
                `<path d="M17 19 L27 19 M16 28 L28 28 M18 36 L26 36" stroke="#6b737d" stroke-width="1" opacity=".8"/>`}
        ${marks}
    </svg>`;
}

function getEquipmentPickerIcon(equipment){
    const e=String(equipment||"Other");
    const icons={
        "Barbell":"🏋",
        "Dumbbell":"◐─◑",
        "Kettlebell":"◒",
        "Machine":"▥",
        "Bodyweight":"◆",
        "Cardio":"↗",
        "Smith Machine":"▦",
        "Cable":"⌁",
        "Safety Bar":"⊣━⊢",
        "EZ Bar":"⌇",
        "Other":"•••"
    };
    return `<span class="equipment-glyph">${escapeHtml(icons[e]||"•••")}</span>`;
}

function getExercisePickerThumb(ex){
    const primary=(ex.primaryMuscles||[])[0];
    if(primary) return getMusclePickerIcon(primary);
    const category=ex.category||"";
    const categoryMuscle={
        "Back":"Upper Back","Chest":"Chest","Shoulders":"Side Delts","Biceps":"Biceps",
        "Triceps":"Triceps","Legs":"Quads","Core":"Abs","Forearms":"Forearms"
    }[category];
    return categoryMuscle?getMusclePickerIcon(categoryMuscle):`<span class="picker-thumb-fallback">${escapeHtml((category||ex.name||"?").slice(0,2).toUpperCase())}</span>`;
}

function getPickerCatalogueExercises(){
    const byName = new Map();
    EXERCISE_CATALOGUE.forEach(item => {
        const key = normalizeExerciseName(item.name);
        byName.set(key,{id:`catalogue:${key}`,name:item.name.replace(/\b\w/g,c=>c.toUpperCase()),category:item.category,primaryMuscles:[...item.primary],secondaryMuscles:[...item.secondary],equipment:[...item.equipment],catalogue:true});
    });
    trackerData.exercises.forEach(ex => {
        ensureExerciseTags(ex);
        const key=normalizeExerciseName(ex.name);
        byName.set(key,{...ex,catalogue:false});
    });
    return [...byName.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
function getSelectedPlanPickerDay(){
    const plan=getSelectedPlan(), dayId=document.getElementById("newExerciseDay")?.value||"", day=plan?.days?.find(d=>d.id===dayId)||null;
    return {plan,dayId,day};
}
function openExercisePicker(){
    const target=getSelectedPlanPickerDay();
    if(!target.plan) return alert("Choose or create a programme first.");
    if(!target.plan.days.length) return alert("Add a workout day to this programme before adding exercises.");
    if(!target.day){populateSelectors();const refreshed=getSelectedPlanPickerDay();if(!refreshed.day)return alert("Choose a valid training day before adding exercises.");}
    exercisePickerMuscles.clear(); exercisePickerEquipment.clear(); exercisePickerSelected.clear(); exercisePickerOpenFilter=null;
    const modal=document.getElementById("exercisePickerModal"); modal.classList.add("open"); modal.setAttribute("aria-hidden","false"); document.body.classList.add("exercise-picker-open");
    document.getElementById("exercisePickerSearch").value="";
    document.getElementById("exercisePickerFilterPanel").classList.remove("open");
    document.getElementById("exerciseCreatorPanel").classList.remove("open");
    updateExercisePickerButtons(); renderExercisePickerResults();
}
function closeExercisePicker(){const m=document.getElementById("exercisePickerModal");m.classList.remove("open");m.setAttribute("aria-hidden","true");document.body.classList.remove("exercise-picker-open")}
function toggleExerciseFilter(type){exercisePickerOpenFilter=exercisePickerOpenFilter===type?null:type;renderExercisePickerFilterPanel();updateExercisePickerButtons()}
function renderExercisePickerFilterPanel(){
    const panel=document.getElementById("exercisePickerFilterPanel");
    if(!exercisePickerOpenFilter){panel.classList.remove("open");panel.innerHTML="";return}
    const muscle=exercisePickerOpenFilter==="muscle", values=muscle?PICKER_MUSCLES:PICKER_EQUIPMENT, selected=muscle?exercisePickerMuscles:exercisePickerEquipment;
    panel.classList.add("open");
    panel.innerHTML=`<button class="filter-choice ${selected.size===0?'selected':''}" onclick="clearPickerFilter('${exercisePickerOpenFilter}')"><span class="filter-choice-icon filter-all-icon">⌘</span><strong>All</strong></button>`+
        values.map(v=>`<button class="filter-choice ${selected.has(v)?'selected':''}" onclick="togglePickerChoice('${exercisePickerOpenFilter}','${v.replaceAll("'","\\'")}')"><span class="filter-choice-icon">${muscle?getMusclePickerIcon(v):getEquipmentPickerIcon(v)}</span><span>${escapeHtml(v)}</span></button>`).join("");
}
function togglePickerChoice(type,value){const set=type==="muscle"?exercisePickerMuscles:exercisePickerEquipment;set.has(value)?set.delete(value):set.add(value);renderExercisePickerFilterPanel();updateExercisePickerButtons();renderExercisePickerResults()}
function clearPickerFilter(type){(type==="muscle"?exercisePickerMuscles:exercisePickerEquipment).clear();renderExercisePickerFilterPanel();updateExercisePickerButtons();renderExercisePickerResults()}
function updateExercisePickerButtons(){
    const mb=document.getElementById("muscleFilterButton"), eb=document.getElementById("equipmentFilterButton");
    const label=(set,all)=>set.size?([...set].slice(0,2).join(", ")+(set.size>2?`, +${set.size-2}`:"")):all;
    mb.textContent=label(exercisePickerMuscles,"All Muscle Groups")+(exercisePickerOpenFilter==="muscle"?"⌃":"⌄"); eb.textContent=label(exercisePickerEquipment,"All Equipment")+(exercisePickerOpenFilter==="equipment"?"⌃":"⌄");
    mb.classList.toggle("active",exercisePickerMuscles.size>0||exercisePickerOpenFilter==="muscle"); eb.classList.toggle("active",exercisePickerEquipment.size>0||exercisePickerOpenFilter==="equipment");
    const n=exercisePickerSelected.size;document.getElementById("exercisePickerSelectedText").textContent=`${n} selected`;const add=document.getElementById("exercisePickerAddButton"), target=getSelectedPlanPickerDay(), hasTarget=!!target.day;add.textContent=hasTarget?`Add Exercises (${n})`:target.plan?.days?.length?"Choose Training Day":"Add Workout Day First";add.disabled=n===0||!hasTarget;
}
function pickerMatches(ex){
    const q=document.getElementById("exercisePickerSearch").value.trim().toLowerCase(); if(q&&!ex.name.toLowerCase().includes(q))return false;
    const muscles=[...(ex.primaryMuscles||[]),...(ex.secondaryMuscles||[])]; if(exercisePickerMuscles.size&&![...exercisePickerMuscles].some(m=>muscles.includes(m)))return false;
    if(exercisePickerEquipment.size&&![...exercisePickerEquipment].some(e=>(ex.equipment||[]).includes(e)))return false; return true;
}
function renderExercisePickerResults(){
    const box=document.getElementById("exercisePickerResults");if(!box)return;
    const list=getPickerCatalogueExercises().filter(pickerMatches); const q=document.getElementById("exercisePickerSearch").value.trim();
    if(!list.length){box.innerHTML=`<div class="empty-message" style="padding:28px 22px">No matching exercises. Try different filters or use <strong>Create New</strong>.</div>`;return}
    box.innerHTML=`<div class="exercise-picker-section-title">${q?'Search results':exercisePickerMuscles.size||exercisePickerEquipment.size?'Matching exercises':'Exercise library'} · ${list.length}</div>`+list.map(ex=>{
        const key=ex.catalogue?ex.id:ex.id, selected=exercisePickerSelected.has(key); const muscles=[...(ex.primaryMuscles||[]),...(ex.secondaryMuscles||[])];
        return `<div class="exercise-picker-row ${selected?'selected':''}" onclick="togglePickerExercise('${key.replaceAll("'","\\'")}')"><div class="exercise-picker-thumb">${getExercisePickerThumb(ex)}</div><div><div class="exercise-picker-name">${escapeHtml(ex.name)}</div><div class="exercise-picker-meta">${escapeHtml(muscles.join(', ')||ex.category||'Other')}</div><div class="exercise-picker-equip">${escapeHtml((ex.equipment||[]).join(' · '))}</div></div><div class="exercise-picker-check">${selected?'✓':''}</div></div>`}).join("");
}
function togglePickerExercise(key){exercisePickerSelected.has(key)?exercisePickerSelected.delete(key):exercisePickerSelected.add(key);updateExercisePickerButtons();renderExercisePickerResults()}
function resolvePickerExercise(key,sets){
    if(!key.startsWith("catalogue:"))return trackerData.exercises.find(e=>e.id===key);
    const normalized=key.slice(10);const item=EXERCISE_CATALOGUE.find(x=>normalizeExerciseName(x.name)===normalized);if(!item)return null;
    let ex=trackerData.exercises.find(e=>normalizeExerciseName(e.name)===normalized);if(!ex){ex=findOrCreateExercise(item.name.replace(/\b\w/g,c=>c.toUpperCase()),sets);applyTagsToExercise(ex,{category:item.category,primaryMuscles:item.primary,secondaryMuscles:item.secondary,equipment:item.equipment})}return ex;
}
function addSelectedExercisesFromPicker(){
    const target=getSelectedPlanPickerDay(), sets=Number(document.getElementById("newExerciseSets").value)||3;
    if(!target.plan)return alert("Choose or create a programme first.");
    if(!target.plan.days.length)return alert("Add a workout day to this programme before adding exercises.");
    if(!target.day){populateSelectors();const refreshed=getSelectedPlanPickerDay();if(!refreshed.day)return alert("Choose a valid training day before adding exercises.");target.day=refreshed.day}
    if(!exercisePickerSelected.size)return;
    let added=0, duplicates=0;
    exercisePickerSelected.forEach(key=>{const ex=resolvePickerExercise(key,sets);if(ex){ex.defaultSets=sets;if(!target.day.exerciseIds.includes(ex.id)){target.day.exerciseIds.push(ex.id);added+=1}else{duplicates+=1}}});
    if(!added){alert(duplicates?"Selected exercises are already in this workout day.":"No valid exercises were selected.");updateExercisePickerButtons();return}
    syncEditedPlanToActiveDays(target.plan);saveData();exercisePickerSelected.clear();closeExercisePicker();renderAll();
}
function showExerciseCreator(){
    exercisePickerOpenFilter=null;document.getElementById("exercisePickerFilterPanel").classList.remove("open");
    const p=document.getElementById("exerciseCreatorPanel");p.classList.add("open");
    p.innerHTML=`<div class="creator-grid"><div class="field wide"><label>Exercise name</label><input id="pickerNewName" placeholder="Example: Chest Supported Row" oninput="prefillPickerCreatorTags()"></div><div class="field"><label>Primary muscle</label><select id="pickerNewPrimary">${PICKER_MUSCLES.map(x=>`<option>${x}</option>`).join('')}</select></div><div class="field"><label>Equipment</label><select id="pickerNewEquipment">${PICKER_EQUIPMENT.map(x=>`<option>${x}</option>`).join('')}</select></div><div class="field wide"><label>Secondary muscles</label><div id="pickerSecondaryMuscles" class="creator-checks">${PICKER_MUSCLES.map(x=>`<button type="button" class="creator-chip" data-muscle="${x}" onclick="this.classList.toggle('selected')">${x}</button>`).join('')}</div></div><div class="field wide"><label>YouTube demo URL (optional)</label><input id="pickerNewYoutube" placeholder="https://www.youtube.com/watch?v=..."></div><div class="wide" style="display:flex;gap:10px;justify-content:flex-end"><button class="button secondary" type="button" onclick="hideExerciseCreator()">Cancel</button><button class="button" type="button" onclick="createExerciseFromPicker()">Create & Select</button></div></div>`;
}
function hideExerciseCreator(){document.getElementById("exerciseCreatorPanel").classList.remove("open");document.getElementById("exerciseCreatorPanel").innerHTML=""}
function prefillPickerCreatorTags(){const name=document.getElementById("pickerNewName")?.value||"";if(name.length<3)return;const t=inferExerciseTags(name);const p=document.getElementById("pickerNewPrimary"),e=document.getElementById("pickerNewEquipment");if(t.primaryMuscles[0]&&PICKER_MUSCLES.includes(t.primaryMuscles[0]))p.value=t.primaryMuscles[0];if(t.equipment[0]&&PICKER_EQUIPMENT.includes(t.equipment[0]))e.value=t.equipment[0];document.querySelectorAll('#pickerSecondaryMuscles .creator-chip').forEach(b=>b.classList.toggle('selected',t.secondaryMuscles.includes(b.dataset.muscle)))}
function createExerciseFromPicker(){
    const name=document.getElementById("pickerNewName").value.trim();if(!name)return alert("Enter an exercise name.");const sets=Number(document.getElementById("newExerciseSets").value)||3;let ex=findOrCreateExercise(name,sets);
    const primary=document.getElementById("pickerNewPrimary").value, equipment=document.getElementById("pickerNewEquipment").value, secondary=[...document.querySelectorAll('#pickerSecondaryMuscles .creator-chip.selected')].map(b=>b.dataset.muscle).filter(m=>m!==primary);
    applyTagsToExercise(ex,{category:Object.entries(MUSCLE_GROUPS).find(([,m])=>m.includes(primary))?.[0]||"Other",primaryMuscles:[primary],secondaryMuscles:secondary,equipment:[equipment]});ex.tagsAutoGenerated=false;ex.youtubeUrl=document.getElementById("pickerNewYoutube").value.trim();saveData();exercisePickerSelected.add(ex.id);hideExerciseCreator();updateExercisePickerButtons();renderExercisePickerResults();
}

document.getElementById("exercisePickerModal")?.addEventListener("click",e=>{if(e.target.id==="exercisePickerModal")closeExercisePicker()});
