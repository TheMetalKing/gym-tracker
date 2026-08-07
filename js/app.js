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
        bodyEntries: []
    };

    let trackerData = loadData();
    let temporaryWorkoutExerciseIds = [];
    let excludedWorkoutExerciseIds = [];
    let selectedProgressMetric = "estimated1RM";
    let pendingWorkoutDraft = null;
    let workoutExtraSetCounts = {};
    let activeExerciseDetailId = null;

    function loadData() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return structuredClone(defaultData);

            const parsed = JSON.parse(stored);
            parsed.days ??= structuredClone(defaultData.days);
            parsed.exercises ??= [];
            parsed.workouts ??= [];
            parsed.bodyEntries ??= [];
            parsed.exercises.forEach(exercise => exercise.notes ??= "");
            return parsed;
        } catch (error) {
            console.error("Unable to load saved data:", error);
            return structuredClone(defaultData);
        }
    }

    function saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trackerData));
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

    function populateSelectors() {
        const dayOptions = trackerData.days.map(day => `
            <option value="${day.id}">${escapeHtml(day.label)} — ${escapeHtml(day.name)}</option>
        `).join("");

        const currentProgrammeDay = document.getElementById("newExerciseDay").value;
        const currentWorkoutDay = document.getElementById("workoutDaySelect").value;

        document.getElementById("newExerciseDay").innerHTML = dayOptions;
        document.getElementById("workoutDaySelect").innerHTML = dayOptions;

        if (trackerData.days.some(day => day.id === currentProgrammeDay)) {
            document.getElementById("newExerciseDay").value = currentProgrammeDay;
        }

        if (trackerData.days.some(day => day.id === currentWorkoutDay)) {
            document.getElementById("workoutDaySelect").value = currentWorkoutDay;
        }

        const exerciseOptions = [
            `<option value="">Choose from library</option>`,
            ...[...trackerData.exercises]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(exercise => `<option value="${exercise.id}">${escapeHtml(exercise.name)}</option>`)
        ].join("");

        document.getElementById("workoutExerciseSelect").innerHTML = exerciseOptions;

        const currentProgressId = document.getElementById("progressExerciseSelect").value;
        document.getElementById("progressExerciseSelect").innerHTML = [
            `<option value="">Choose an exercise</option>`,
            ...[...trackerData.exercises]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(exercise => `<option value="${exercise.id}">${escapeHtml(exercise.name)}</option>`)
        ].join("");

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
    }

    function findOrCreateExercise(name, sets) {
        let exercise = trackerData.exercises.find(
            item => item.name.toLowerCase() === name.toLowerCase()
        );

        if (!exercise) {
            exercise = {
                id: createId("exercise"),
                name,
                defaultSets: sets,
                createdAt: new Date().toISOString(),
                notes: ""
            };
            trackerData.exercises.push(exercise);
        } else {
            exercise.defaultSets = sets;
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
        const day = trackerData.days.find(item => item.id === dayId);

        if (!day.exerciseIds.includes(exercise.id)) day.exerciseIds.push(exercise.id);

        saveData();
        document.getElementById("newExerciseName").value = "";
        document.getElementById("newExerciseSets").value = "3";
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

        if (makePermanent) {
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
        const day = trackerData.days.find(item => item.id === dayId);
        day.exerciseIds = day.exerciseIds.filter(id => id !== exerciseId);
        saveData();
        renderAll();
    }

    function updateExerciseSets(exerciseId, value) {
        const sets = Number(value);
        if (!Number.isInteger(sets) || sets < 1 || sets > 10) return;

        const exercise = trackerData.exercises.find(item => item.id === exerciseId);
        exercise.defaultSets = sets;
        saveData();
        renderAll();
    }

    function renderProgramme() {
        document.getElementById("programmeDays").innerHTML = trackerData.days.map(day => {
            const rows = day.exerciseIds.map((exerciseId, index) => {
                const exercise = trackerData.exercises.find(item => item.id === exerciseId);
                if (!exercise) return "";

                return `
                    <div class="programme-row">
                        <strong>${index + 1}. ${escapeHtml(exercise.name)}</strong>
                        <div>${exercise.defaultSets} sets</div>
                        <input type="number" min="1" max="10" value="${exercise.defaultSets}"
                            onchange="updateExerciseSets('${exercise.id}', this.value)">
                        <div style="display:flex; gap:8px; flex-wrap:wrap;">
                            <button class="button secondary small"
                                onclick="swapProgrammeExercise('${day.id}', '${exercise.id}')">Swap</button>
                            <button class="button danger small"
                                onclick="removeExerciseFromDay('${day.id}', '${exercise.id}')">Remove</button>
                        </div>
                    </div>
                `;
            }).join("");

            return `
                <section class="programme-day">
                    <div class="programme-header">
                        <div>
                            <div class="day-number">${escapeHtml(day.label)}</div>
                            <h3>${escapeHtml(day.name)}</h3>
                        </div>
                        <div>${day.exerciseIds.length} exercise${day.exerciseIds.length === 1 ? "" : "s"}</div>
                    </div>
                    <div class="programme-list">
                        ${rows || `<div class="empty-message">No exercises added.</div>`}
                    </div>
                </section>
            `;
        }).join("");
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

        const day = trackerData.days.find(item => item.id === dayId);
        const index = day.exerciseIds.indexOf(currentExerciseId);
        if (index < 0) return;

        day.exerciseIds[index] = replacement.id;
        day.exerciseIds = [...new Set(day.exerciseIds)];

        saveData();
        renderAll();
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
        temporaryWorkoutExerciseIds = [];
        excludedWorkoutExerciseIds = [];
        workoutExtraSetCounts = {};
        showPage("workoutPage");
    }

    function changeWorkoutDay() {
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

    function renderWorkoutLogger() {
        const selectedDayId = document.getElementById("workoutDaySelect").value;
        const day = trackerData.days.find(item => item.id === selectedDayId);
        const logger = document.getElementById("workoutLogger");

        if (!day) return;

        const permanentIdsForToday = day.exerciseIds.filter(
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

                return `
                    <div class="set-row" data-set-row="${exercise.id}-${index}">
                        <div class="set-number">Set ${index + 1}</div>
                        <div class="field">
                            <label>Weight kg</label>
                            <input class="workout-weight" data-exercise-id="${exercise.id}"
                                data-set-index="${index}" data-previous="${previousSet?.weightKg ?? ""}" type="number" min="0" step="0.25" placeholder="0" value="${previousSet?.weightKg ?? ""}">
                        </div>
                        <div class="field">
                            <label>Reps</label>
                            <input class="workout-reps" data-exercise-id="${exercise.id}"
                                data-set-index="${index}" data-previous="${previousSet?.reps ?? ""}" type="number" min="0" step="1" placeholder="0" value="${previousSet?.reps ?? ""}">
                        </div>
                        <div class="set-previous">${escapeHtml(previousText)}</div>
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

    function buildExtraSetRow(exerciseId, setIndex) {
        return `
            <div class="set-row" data-set-row="${exerciseId}-${setIndex}">
                <div class="set-number">Set ${setIndex + 1}</div>
                <div class="field">
                    <label>Weight kg</label>
                    <input class="workout-weight" data-exercise-id="${exerciseId}"
                        data-set-index="${setIndex}" data-previous="" type="number"
                        min="0" step="0.25" placeholder="0" value="">
                </div>
                <div class="field">
                    <label>Reps</label>
                    <input class="workout-reps" data-exercise-id="${exerciseId}"
                        data-set-index="${setIndex}" data-previous="" type="number"
                        min="0" step="1" placeholder="0" value="">
                </div>
                <div class="set-previous">Extra set</div>
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
                buildExtraSetRow(exerciseId, startingIndex + offset)
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
        const dayId = document.getElementById("workoutDaySelect").value;
        const date = document.getElementById("workoutDate").value;
        if (!date) {
            alert("Choose a workout date.");
            return null;
        }

        const day = trackerData.days.find(item => item.id === dayId);
        const permanentIdsForToday = day.exerciseIds.filter(
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
            date,
            exercises: workoutExercises,
            createdAt: new Date().toISOString()
        };
    }

    function getWorkoutTotals(workout) {
        return workout.exercises.reduce((totals, exercise) => {
            exercise.sets.forEach(set => {
                totals.sets += 1;
                totals.reps += set.reps;
                totals.volume += set.weightKg * set.reps;
            });
            return totals;
        }, { exercises: workout.exercises.length, sets: 0, reps: 0, volume: 0 });
    }

    function getPreviousDayWorkout(dayId, beforeDate) {
        return [...trackerData.workouts]
            .filter(workout => workout.dayId === dayId && workout.date <= beforeDate)
            .sort((a, b) => {
                const dateCompare = new Date(b.date) - new Date(a.date);
                return dateCompare || new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            })[0] || null;
    }

    function getExercisePRsForDraft(exerciseId, sets) {
        const oldHistory = getExerciseHistory(exerciseId);
        const oldBestWeight = oldHistory.length ? Math.max(...oldHistory.map(item => item.bestWeight)) : 0;
        const oldBest1RM = oldHistory.length ? Math.max(...oldHistory.map(item => item.estimated1RM)) : 0;
        const oldBestVolume = oldHistory.length ? Math.max(...oldHistory.map(item => item.volume)) : 0;

        const bestWeight = Math.max(...sets.map(set => set.weightKg));
        const best1RM = Math.max(...sets.map(set => estimate1RM(set.weightKg, set.reps)));
        const volume = sets.reduce((sum, set) => sum + set.weightKg * set.reps, 0);

        const prs = [];
        if (bestWeight > oldBestWeight) prs.push("New weight PR");
        if (best1RM > oldBest1RM + 0.05) prs.push("New estimated 1RM PR");
        if (volume > oldBestVolume) prs.push("New volume PR");
        return prs;
    }

    function reviewWorkout() {
        const draft = collectWorkoutDraft();
        if (!draft) return;

        pendingWorkoutDraft = draft;
        const day = trackerData.days.find(item => item.id === draft.dayId);
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

        document.getElementById("summaryTitle").textContent = `${day.label} — ${day.name}`;
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
                    <div class="stat-label">Compared with last ${escapeHtml(day.label)}</div>
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

    function confirmSaveWorkout() {
        if (!pendingWorkoutDraft) return;
        trackerData.workouts.push(pendingWorkoutDraft);
        pendingWorkoutDraft = null;
        temporaryWorkoutExerciseIds = [];
        excludedWorkoutExerciseIds = [];
        workoutExtraSetCounts = {};
        saveData();

        const modal = document.getElementById("workoutSummaryModal");
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");

        renderAll();
        showPage("dashboardPage");
        alert("Workout saved.");
    }

    function openExerciseDetail(exerciseId) {
        const exercise = trackerData.exercises.find(item => item.id === exerciseId);
        if (!exercise) return;

        activeExerciseDetailId = exerciseId;
        document.getElementById("exerciseDetailTitle").textContent = exercise.name;
        renderExerciseDetailTab("history");

        const modal = document.getElementById("exerciseDetailModal");
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
    }

    function closeExerciseDetail() {
        const modal = document.getElementById("exerciseDetailModal");
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
        activeExerciseDetailId = null;
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

        if (tabName === "records") {
            content.innerHTML = `
                <div class="exercise-detail-coming">
                    <strong>Records is next.</strong>
                    <span>Your full PR page will be added after the History screen is tested.</span>
                </div>
            `;
            return;
        }

        if (tabName === "charts") {
            content.innerHTML = `
                <div class="exercise-detail-coming">
                    <strong>Charts is next.</strong>
                    <span>This will contain the exercise graphs once the detail screen is stable.</span>
                </div>
            `;
            return;
        }

        const last = history.at(-1);
        const bestWeight = history.length
            ? Math.max(...history.map(item => item.bestWeight))
            : null;
        const lifetimeVolume = history.reduce((sum, item) => sum + item.volume, 0);
        const totalSets = history.reduce((sum, item) => sum + item.sets.length, 0);

        const historyHtml = history.length
            ? [...history].reverse().map(item => {
                const workout = trackerData.workouts.find(entry => entry.id === item.workoutId);
                const day = trackerData.days.find(entry => entry.id === workout?.dayId);
                const dayLabel = day ? `${day.label} — ${day.name}` : "Workout";

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
                        <div class="exercise-history-sets">
                            ${item.sets.map((set, index) => `
                                <div>
                                    <span>Set ${index + 1}</span>
                                    <strong>${set.weightKg} kg × ${set.reps}</strong>
                                </div>
                            `).join("")}
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
                    <strong>${totalSets}</strong>
                </article>
                <article>
                    <span>Lifetime volume</span>
                    <strong>${lifetimeVolume >= 1000
                        ? `${(lifetimeVolume / 1000).toFixed(1)} t`
                        : `${Math.round(lifetimeVolume)} kg`}</strong>
                    ${lifetimeVolume >= 1000
                        ? `<small>(${Math.round(lifetimeVolume).toLocaleString()} kg)</small>`
                        : ""}
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

    function renderLibrary() {
        const container = document.getElementById("exerciseLibrary");

        if (!trackerData.exercises.length) {
            container.innerHTML = `<div class="panel"><p class="empty-message">Your exercise library is empty.</p></div>`;
            return;
        }

        container.innerHTML = [...trackerData.exercises]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(exercise => {
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
    }

    function openExerciseProgress(exerciseId) {
        document.getElementById("progressExerciseSelect").value = exerciseId;
        showPage("progressPage");
    }

    function estimate1RM(weight, reps) {
        return weight * (1 + reps / 30);
    }

    function getExerciseHistory(exerciseId) {
        return trackerData.workouts
            .map(workout => {
                const exercise = workout.exercises.find(item => item.exerciseId === exerciseId);
                if (!exercise) return null;

                const bestWeight = Math.max(...exercise.sets.map(set => set.weightKg));
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
                    totalReps,
                    volume,
                    estimated1RM
                };
            })
            .filter(Boolean)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
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

    function deleteWorkout(workoutId) {
        const workout = trackerData.workouts.find(item => item.id === workoutId);
        if (!workout) return;

        const day = trackerData.days.find(item => item.id === workout.dayId);
        const dayName = day ? `${day.label} — ${day.name}` : "this session";

        const confirmed = confirm(
            `Delete the workout from ${workout.date}?\n\n` +
            `This will remove every exercise recorded in ${dayName} on that date. ` +
            `This cannot be undone.`
        );

        if (!confirmed) return;

        trackerData.workouts = trackerData.workouts.filter(item => item.id !== workoutId);
        saveData();
        renderAll();
        showPage("progressPage");
    }

    function renderProgressPage() {
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
                    <button class="button small ${selectedProgressMetric === "totalReps" ? "" : "secondary"}"
                        onclick="setProgressMetric('totalReps')">Total reps</button>
                </div>
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
                <div style="overflow-x:auto;">
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
                                        <button class="button danger small"
                                            onclick="deleteWorkout('${item.workoutId}')">Delete workout</button>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        requestAnimationFrame(() => drawProgressChart(history, selectedProgressMetric));
    }

    function drawProgressChart(history, metric) {
        const canvas = document.getElementById("progressChart");
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(600, rect.width) * dpr;
        canvas.height = 320 * dpr;

        const ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);

        const width = canvas.width / dpr;
        const height = canvas.height / dpr;
        const pad = { left: 55, right: 20, top: 25, bottom: 55 };

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
            if (history.length === 1) return pad.left + (width - pad.left - pad.right) / 2;
            return pad.left + index * (width - pad.left - pad.right) / (history.length - 1);
        };

        const y = value => {
            return pad.top + (max - value) * (height - pad.top - pad.bottom) / (max - min);
        };

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

            ctx.fillText(value.toFixed(metric === "totalReps" ? 0 : 1), 8, py + 4);
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

    function renderBodyHistory() {
        const bodyHistory = document.getElementById("bodyHistory");
        const entries = [...trackerData.bodyEntries]
            .sort((a, b) => new Date(b.date) - new Date(a.date));

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
    }

    document.getElementById("bodyDate").value = getTodayDate();

    window.addEventListener("resize", () => {
        const exerciseId = document.getElementById("progressExerciseSelect").value;
        if (!exerciseId || !document.getElementById("progressChart")) return;
        drawProgressChart(getExerciseHistory(exerciseId), selectedProgressMetric);
    });

    renderAll();

    document.getElementById("workoutSummaryModal").addEventListener("click", event => {
        if (event.target.id === "workoutSummaryModal") closeWorkoutSummary();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && document.getElementById("workoutSummaryModal").classList.contains("open")) {
            closeWorkoutSummary();
        }
    });
