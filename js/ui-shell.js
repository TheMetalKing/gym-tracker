(function () {
    document.body.classList.add("modern-ui");


    /* =========================================================
       ICONS
       ========================================================= */

    function icon(name) {
        const icons = {
            home:
                '<svg viewBox="0 0 24 24">' +
                '<path d="M3 11.5 12 4l9 7.5"/>' +
                '<path d="M5.5 10v10h13V10"/>' +
                '<path d="M9.5 20v-6h5v6"/>' +
                '</svg>',

            progress:
                '<svg viewBox="0 0 24 24">' +
                '<path d="M4 18 9 12l4 3 7-9"/>' +
                '<path d="M4 4v16h16"/>' +
                '</svg>',

            play:
                '<svg viewBox="0 0 24 24">' +
                '<path d="m9 6 9 6-9 6Z" fill="currentColor" stroke="none"/>' +
                '</svg>',

            exercises:
                '<svg viewBox="0 0 24 24">' +
                '<path d="M4 9v6"/>' +
                '<path d="M7 7v10"/>' +
                '<path d="M17 7v10"/>' +
                '<path d="M20 9v6"/>' +
                '<path d="M7 12h10"/>' +
                '</svg>',

            body:
                '<svg viewBox="0 0 24 24">' +
                '<path d="M6 20h12"/>' +
                '<path d="M7 20l2-12h6l2 12"/>' +
                '<path d="M9 8a3 3 0 0 1 6 0"/>' +
                '<path d="M10 13h4"/>' +
                '</svg>',

            backup:
                '<svg viewBox="0 0 24 24">' +
                '<path d="M12 3v10"/>' +
                '<path d="m8 9 4 4 4-4"/>' +
                '<path d="M5 17v3h14v-3"/>' +
                '</svg>',

            account:
                '<svg viewBox="0 0 24 24">' +
                '<circle cx="12" cy="8" r="4"/>' +
                '<path d="M4 21a8 8 0 0 1 16 0"/>' +
                '</svg>',

            more:
                '<svg viewBox="0 0 24 24">' +
                '<circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/>' +
                '<circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>' +
                '<circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>' +
                '</svg>'
        };

        return icons[name];
    }


    /* =========================================================
       MODERN HEADER
       ========================================================= */

    const app =
        document.querySelector(".app");


    if (
        app &&
        !document.getElementById(
            "modernTopbar"
        )
    ) {

        app.insertAdjacentHTML(
            "afterbegin",
            `
            <header
                class="modern-topbar"
                id="modernTopbar"
            >

                <button
                    class="modern-brand"
                    type="button"
                    onclick="modernNavigate('dashboardPage')"
                    aria-label="Go to Metal's Gym Tracker home"
                >

                    <img
                        class="modern-brand-icon"
                        src="assets/app-icon.png"
                        alt=""
                    >


                    <div class="modern-brand-text">

                        <strong class="modern-brand-metal">
                            METAL'S
                        </strong>

                        <span class="modern-brand-gym">
                            GYM TRACKER
                        </span>

                    </div>

                </button>


                <div class="modern-topbar-actions">

                    <div
                        class="modern-icon-menu data-backup-panel collapsed"
                        id="dataBackupPanel">

                        <button
                            class="modern-header-icon-button data-backup-summary"
                            type="button"
                            onclick="toggleBackupPanel()"
                            aria-expanded="false"
                            aria-label="Backup and restore">

                            ${icon("backup")}

                        </button>


                        <div class="data-backup-popover data-backup-content">

                            <div class="small-label">
                                Data & Backup
                            </div>

                            <h2>
                                Backup and restore
                            </h2>

                            <div class="data-backup-actions">

                                <button
                                    class="button secondary small"
                                    type="button"
                                    onclick="exportTrackerBackup()">

                                    Export Backup

                                </button>


                                <button
                                    class="button small"
                                    type="button"
                                    onclick="chooseTrackerBackupFile()">

                                    Restore Backup

                                </button>


                                <input
                                    id="backupRestoreInput"
                                    type="file"
                                    accept="application/json,.json"
                                    onchange="restoreTrackerBackupFromFile(this.files && this.files[0]); this.value = '';">

                            </div>


                            <p class="muted">
                                Storage status:<br>
                                <span id="storageStatusText">
                                    Saved on this device
                                </span>
                            </p>


                            <div
                                id="backupStatus"
                                class="backup-status">
                            </div>

                        </div>

                    </div>


                    <div
                        class="modern-icon-menu account-menu-panel collapsed"
                        id="accountMenuPanel">

                        <button
                            class="modern-header-icon-button account-menu-summary"
                            type="button"
                            onclick="toggleAccountPanel()"
                            aria-expanded="false"
                            aria-label="Account">

                            ${icon("account")}

                        </button>


                        <div class="account-popover">

                            <div class="cloud-account-panel">

                                <div class="small-label">
                                    Account
                                </div>

                                <div
                                    id="cloudAccountStatus"
                                    class="cloud-account-status">
                                    Connecting account service...
                                </div>

                                <div
                                    id="cloudAuthForm"
                                    class="cloud-auth-form">

                                    <input
                                        id="cloudEmail"
                                        type="email"
                                        autocomplete="email"
                                        placeholder="Email">

                                    <input
                                        id="cloudPassword"
                                        type="password"
                                        autocomplete="current-password"
                                        placeholder="Password">

                                    <div class="cloud-auth-actions">

                                        <button
                                            class="button small"
                                            type="button"
                                            onclick="cloudSignInFromHeader()">
                                            Sign in
                                        </button>

                                        <button
                                            class="button secondary small"
                                            type="button"
                                            onclick="cloudSignUpFromHeader()">
                                            Sign up
                                        </button>

                                    </div>

                                    <button
                                        class="button secondary small full"
                                        type="button"
                                        onclick="cloudResetPasswordFromHeader()">
                                        Reset password
                                    </button>

                                </div>

                                <div
                                    id="cloudUserPanel"
                                    class="cloud-user-panel">

                                    <button
                                        id="cloudFirstSyncButton"
                                        class="button small full"
                                        type="button"
                                        onclick="cloudOpenFirstSyncFromHeader()">
                                        Set up cloud sync
                                    </button>


                                    <div
                                        id="cloudSyncDecisionPanel"
                                        class="cloud-sync-decision-panel">
                                    </div>


                                    <button
                                        class="button secondary small full"
                                        type="button"
                                        onclick="cloudSyncNowFromHeader()">
                                        Sync now
                                    </button>


                                    <button
                                        class="button secondary small full"
                                        type="button"
                                        onclick="cloudSignOutFromHeader()">
                                        Sign out
                                    </button>

                                </div>

                                <div
                                    id="cloudAuthStatus"
                                    class="backup-status">
                                </div>

                            </div>

                        </div>

                    </div>


                    <div class="modern-storage-pill" aria-label="Storage status">

                        <span
                            class="modern-storage-text"
                            id="storagePillText">
                            Saved on this device
                        </span>

                    </div>

                </div>

            </header>
            `
        );
    }


    /* =========================================================
       STORAGE MENU
       ========================================================= */

    document.addEventListener(
        "click",
        event => {

            const backupPanel =
                document.getElementById(
                    "dataBackupPanel"
                );
            const accountPanel =
                document.getElementById(
                    "accountMenuPanel"
                );

            if (
                backupPanel?.contains(event.target) ||
                accountPanel?.contains(event.target)
            ) {

                return;

            }

            if (
                typeof window.renderBackupPanel ===
                "function"
            ) {

                window.renderBackupPanel(false);

            }

            if (
                typeof window.renderAccountPanel ===
                "function"
            ) {

                window.renderAccountPanel(false);

            }

        }
    );


    /* =========================================================
       BOTTOM NAV
       ========================================================= */

    if (
        !document.getElementById(
            "modernBottomNav"
        )
    ) {

        document.body.insertAdjacentHTML(
            "beforeend",
            `
            <nav
                class="modern-bottom-nav"
                id="modernBottomNav"
                aria-label="Main navigation"
            >

                <button
                    class="modern-nav-item active"
                    data-modern-page="dashboardPage"
                    type="button"
                >

                    ${icon("home")}

                    <span>
                        Home
                    </span>

                </button>


                <button
                    class="modern-nav-item"
                    data-modern-page="progressPage"
                    type="button"
                >

                    ${icon("progress")}

                    <span>
                        Progress
                    </span>

                </button>


                <button
                    class="modern-nav-item workout-launch"
                    data-modern-page="workoutPage"
                    type="button"
                >

                    ${icon("play")}

                    <span>
                        Workout
                    </span>

                </button>


                <button
                    class="modern-nav-item"
                    data-modern-page="programmePage"
                    type="button"
                >

                    ${icon("more")}

                    <span>
                        Plans
                    </span>

                </button>


                <button
                    class="modern-nav-item"
                    data-modern-page="bodyPage"
                    type="button"
                >

                    ${icon("body")}

                    <span>
                        Body
                    </span>

                </button>

            </nav>
            `
        );
    }


    /* =========================================================
       NAVIGATION
       ========================================================= */

    window.modernNavigate =
        function modernNavigate(pageId) {

            showPage(pageId);


            document
                .querySelectorAll(
                    "[data-modern-page]"
                )
                .forEach(button => {

                    button.classList.toggle(
                        "active",
                        button.dataset.modernPage ===
                            pageId
                    );

                });


            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });


            if (
                pageId === "dashboardPage" &&
                window.renderModernHome
            ) {

                renderModernHome();

            }

        };


    document
        .querySelectorAll(
            "[data-modern-page]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    modernNavigate(
                        button.dataset.modernPage
                    );

                }
            );

        });


    /* =========================================================
       KEEP HOME UPDATED
       ========================================================= */

    const previousRenderDashboard =
        window.renderDashboard;


    window.renderDashboard =
        function renderDashboard() {

            if (
                typeof previousRenderDashboard ===
                "function"
            ) {

                try {

                    previousRenderDashboard();

                } catch (error) {

                    console.warn(
                        "Legacy dashboard render skipped:",
                        error
                    );

                }

            }


            if (
                window.renderModernHome
            ) {

                renderModernHome();

            }

        };


    /* =========================================================
       EXERCISE PICKER EXPANSION
       ========================================================= */

    const previousToggleExerciseFilter =
        window.toggleExerciseFilter;


    if (
        typeof previousToggleExerciseFilter ===
        "function"
    ) {

        window.toggleExerciseFilter =
            function toggleExerciseFilter(type) {

                previousToggleExerciseFilter(
                    type
                );


                const modal =
                    document.querySelector(
                        ".exercise-picker-modal"
                    );


                modal?.classList.toggle(
                    "filter-expanded",
                    Boolean(
                        exercisePickerOpenFilter
                    )
                );

            };

    }


    const previousClearPickerFilter =
        window.clearPickerFilter;


    if (
        typeof previousClearPickerFilter ===
        "function"
    ) {

        window.clearPickerFilter =
            function clearPickerFilter(type) {

                previousClearPickerFilter(
                    type
                );


                document
                    .querySelector(
                        ".exercise-picker-modal"
                    )
                    ?.classList.add(
                        "filter-expanded"
                    );

            };

    }


    /* =========================================================
       WORKOUT TAG HELPERS
       ========================================================= */

    function workoutMuscleTags(
        exercise
    ) {

        const values = [

            ...(
                exercise.primaryMuscles ||
                []
            ),

            ...(
                exercise.secondaryMuscles ||
                []
            ),

            ...(
                exercise.exerciseDbTargetMuscles ||
                []
            ),

            ...(
                exercise.exerciseDbSecondaryMuscles ||
                []
            )

        ];


        return [
            ...new Set(values)
        ]

            .filter(Boolean)

            .slice(
                0,
                5
            );

    }


    function workoutEquipment(
        exercise
    ) {

        const values = [

            ...(
                exercise.equipment ||
                []
            ),

            ...(
                exercise.exerciseDbEquipments ||
                []
            )

        ];


        return [
            ...new Set(values)
        ]

            .filter(Boolean)

            .slice(
                0,
                2
            );

    }


    /* =========================================================
       TARGETS
       ========================================================= */

    function manualTargetForSet(
        exercise,
        setIndex
    ) {

        if (
            Array.isArray(
                exercise.targetReps
            )
        ) {

            return (
                exercise.targetReps[
                    setIndex
                ] ??
                null
            );

        }


        if (
            exercise.targetReps !==
                undefined &&
            exercise.targetReps !==
                null &&
            exercise.targetReps !==
                ""
        ) {

            return exercise.targetReps;

        }


        return null;

    }


    function targetForSet(
        exercise,
        setIndex,
        plannedSetCount
    ) {

        if (
            typeof calculateExerciseTargetForSet ===
            "function"
        ) {

            const calculated =
                calculateExerciseTargetForSet(
                    exercise,
                    setIndex,
                    plannedSetCount
                );

            if (
                calculated
            ) {

                return calculated;

            }

        }


        const manual =
            manualTargetForSet(
                exercise,
                setIndex
            );


        if (
            manual === null
        ) {

            return null;

        }


        return {
            weightKg: null,
            reps: manual,
            source: "manual"
        };

    }


    /* =========================================================
       SET ROW
       ========================================================= */

    function formatTarget(
        target
    ) {

        if (
            !target ||
            target.reps === undefined ||
            target.reps === null ||
            target.reps === ""
        ) {

            return "\u2014";

        }


        if (
            target.weightKg !== undefined &&
            target.weightKg !== null &&
            target.weightKg !== ""
        ) {

            return `
                ${target.weightKg}
                kg \u00d7
                ${target.reps}
            `;

        }


        return `
            ${target.reps}
            reps
        `;

    }


    function modernSetRow(
        exercise,
        setIndex,
        previousSet = null,
        isExtra = false
    ) {

        const previousText =
            previousSet

                ? `
                    ${previousSet.weightKg}
                    kg ×
                    ${previousSet.reps}
                `

                : isExtra

                    ? "Extra set"

                    : "—";


        const target =
            targetForSet(
                exercise,
                setIndex,
                exercise.defaultSets
            );


        const targetText = formatTarget(target);
        const weightValue =
            target?.weightKg ??
            previousSet?.weightKg ??
            "";
        const repsValue =
            target?.reps ??
            previousSet?.reps ??
            "";

        return `
            <div
                class="set-row modern-set-row"
                data-set-row="${exercise.id}-${setIndex}"
            >

                <div class="modern-set-number">

                    <span>
                        ${setIndex + 1}
                    </span>

                </div>


                <div class="modern-set-previous">

                    ${escapeHtml(
                        previousText
                    )}

                </div>


                <div class="modern-set-target">

                    ${escapeHtml(
                        targetText
                    )}

                </div>


                <div class="modern-set-input-wrap">

                    <input
                        class="workout-weight modern-set-input"
                        data-exercise-id="${exercise.id}"
                        data-set-index="${setIndex}"
                        data-previous="${previousSet?.weightKg ?? ""}"
                        type="number"
                        min="0"
                        step="0.25"
                        inputmode="decimal"
                        placeholder="0"
                        value="${escapeHtml(weightValue)}"
                        aria-label="Set ${setIndex + 1} weight in kilograms"
                    >

                </div>


                <div class="modern-set-input-wrap">

                    <input
                        class="workout-reps modern-set-input"
                        data-exercise-id="${exercise.id}"
                        data-set-index="${setIndex}"
                        data-previous="${previousSet?.reps ?? ""}"
                        type="number"
                        min="0"
                        step="1"
                        inputmode="numeric"
                        placeholder="0"
                        value="${escapeHtml(repsValue)}"
                        aria-label="Set ${setIndex + 1} reps"
                    >

                </div>


                <button
                    class="set-complete-button modern-set-check"
                    type="button"
                    data-exercise-id="${exercise.id}"
                    data-set-index="${setIndex}"
                    aria-label="Mark set ${setIndex + 1} complete"
                    aria-pressed="false"
                    onclick="toggleSetComplete('${exercise.id}', ${setIndex})"
                >

                    ✓

                </button>

            </div>
        `;

    }


    /* =========================================================
       EXTRA SET ROW
       ========================================================= */

    function modernBuildExtraSetRow(
        exerciseId,
        setIndex
    ) {

        const exercise =
            trackerData.exercises.find(
                item =>
                    item.id ===
                    exerciseId
            );


        if (!exercise) {
            return "";
        }


        return modernSetRow(
            exercise,
            setIndex,
            null,
            true
        );

    }


    /* =========================================================
       MODERN WORKOUT LOGGER
       ========================================================= */

    const workoutDemoTimers =
        new Map();


    function formatDemoWeight(value) {

        const number =
            Number(value);


        if (
            !Number.isFinite(number) ||
            number <= 0
        ) {

            return "—";

        }


        return `${number.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;

    }


    function demoSelector(
        exerciseId
    ) {

        const escaped =
            window.CSS?.escape
                ? CSS.escape(
                    exerciseId
                )
                : String(
                    exerciseId
                ).replace(
                    /"/g,
                    '\\"'
                );


        return `[data-workout-demo="${escaped}"]`;

    }


    function renderWorkoutDemoShell(
        exercise,
        stats = null
    ) {

        const safeId =
            escapeHtml(
                exercise.id
            );


        const lastPerformed =
            stats?.lastPerformed ||
            "";


        return `
            <div
                class="modern-workout-demo"
                data-workout-demo="${safeId}"
            >

                <div class="modern-workout-demo-frame">

                    <div class="modern-workout-demo-status">
                        Loading demo…
                    </div>

                </div>


                <div class="modern-workout-demo-info">

                    <div class="modern-workout-demo-label">
                        Exercise demo
                    </div>


                    <div class="modern-workout-demo-stats">

                        <span>
                            Last
                            <strong>
                                ${escapeHtml(lastPerformed || "—")}
                            </strong>
                        </span>


                        <span>
                            Best
                            <strong>
                                ${escapeHtml(formatDemoWeight(stats?.bestWeight))}
                            </strong>
                        </span>


                        <span>
                            Est. 1RM
                            <strong>
                                ${escapeHtml(formatDemoWeight(stats?.bestEstimated1RM))}
                            </strong>
                        </span>

                    </div>

                </div>

            </div>
        `;

    }


    function stopWorkoutDemo(
        exerciseId
    ) {

        const demo =
            document.querySelector(
                demoSelector(
                    exerciseId
                )
            );


        if (
            !demo
        ) {

            return;

        }


        const image =
            demo.querySelector(
                "img"
            );


        const replay =
            demo.querySelector(
                ".modern-workout-demo-replay"
            );


        if (
            image
        ) {

            image.classList.add(
                "paused"
            );

        }


        if (
            replay
        ) {

            replay.classList.add(
                "visible"
            );

        }

    }


    function scheduleWorkoutDemoStop(
        exerciseId
    ) {

        if (
            workoutDemoTimers.has(
                exerciseId
            )
        ) {

            clearTimeout(
                workoutDemoTimers.get(
                    exerciseId
                )
            );

        }


        workoutDemoTimers.set(
            exerciseId,
            setTimeout(
                () => {

                    stopWorkoutDemo(
                        exerciseId
                    );

                },
                10000
            )
        );

    }


    window.replayWorkoutDemo =
        function replayWorkoutDemo(
            exerciseId
        ) {

            const demo =
                document.querySelector(
                    demoSelector(
                        exerciseId
                    )
                );


            const image =
                demo?.querySelector(
                    "img"
                );


            const replay =
                demo?.querySelector(
                    ".modern-workout-demo-replay"
                );


            if (
                !image
            ) {

                return;

            }


            const original =
                image.dataset.originalSrc ||
                image.dataset.pausedSrc ||
                image.src;


            image.style.visibility =
                "visible";


            image.classList.remove(
                "paused",
                "load-error"
            );


            if (
                replay
            ) {

                replay.classList.remove(
                    "visible"
                );

            }


            const separator =
                original.includes("?")
                    ? "&"
                    : "?";


            image.src =
                `${original}${separator}replay=${Date.now()}`;


            scheduleWorkoutDemoStop(
                exerciseId
            );

        };


    window.handleWorkoutDemoLoaded =
        function handleWorkoutDemoLoaded(
            exerciseId
        ) {

            const demo =
                document.querySelector(
                    demoSelector(
                        exerciseId
                    )
                );


            demo
                ?.querySelector(
                    ".modern-workout-demo-status"
                )
                ?.remove();


            scheduleWorkoutDemoStop(
                exerciseId
            );

        };


    window.handleWorkoutDemoError =
        function handleWorkoutDemoError(
            exerciseId
        ) {

            const demo =
                document.querySelector(
                    demoSelector(
                        exerciseId
                    )
                );


            if (
                !demo
            ) {

                return;

            }


            if (
                workoutDemoTimers.has(
                    exerciseId
                )
            ) {

                clearTimeout(
                    workoutDemoTimers.get(
                        exerciseId
                    )
                );

                workoutDemoTimers.delete(
                    exerciseId
                );

            }


            demo.classList.add(
                "missing"
            );


            const frame =
                demo.querySelector(
                    ".modern-workout-demo-frame"
                );


            if (
                frame
            ) {

                frame.innerHTML =
                    `<div class="modern-workout-demo-status">No demo available</div>`;

            }

        };


    async function hydrateWorkoutDemo(
        exerciseId
    ) {

        const demo =
            document.querySelector(
                demoSelector(
                    exerciseId
                )
            );


        if (
            !demo
        ) {

            return;

        }


        try {

            const resolver =
                window.gymExerciseMedia
                    ?.resolveWorkoutExerciseDemo;


            const result =
                resolver
                    ? await resolver(
                        exerciseId
                    )
                    : null;


            if (
                !result ||
                result.status !== "ready" ||
                !result.url
            ) {

                window.handleWorkoutDemoError(
                    exerciseId
                );

                return;

            }


            const frame =
                demo.querySelector(
                    ".modern-workout-demo-frame"
                );


            if (
                !frame
            ) {

                return;

            }


            frame.innerHTML = `
                <img
                    class="modern-workout-demo-media"
                    src="${escapeHtml(result.url)}"
                    data-original-src="${escapeHtml(result.url)}"
                    alt="${escapeHtml(result.matchName || "Exercise demonstration")}"
                    loading="lazy"
                    decoding="async"
                    referrerpolicy="no-referrer"
                    onload="handleWorkoutDemoLoaded('${exerciseId}')"
                    onerror="handleWorkoutDemoError('${exerciseId}')"
                >

                <button
                    class="modern-workout-demo-replay"
                    type="button"
                    onclick="replayWorkoutDemo('${exerciseId}')"
                >
                    Replay
                </button>
            `;


            const label =
                demo.querySelector(
                    ".modern-workout-demo-label"
                );


            if (
                label
            ) {

                label.textContent =
                    result.label ||
                    "Exercise demo";

            }

        } catch (error) {

            console.warn(
                "Workout demo could not be loaded:",
                exerciseId,
                error
            );


            window.handleWorkoutDemoError(
                exerciseId
            );

        }

    }


    function hydrateWorkoutDemos(
        exerciseIds
    ) {

        workoutDemoTimers.forEach(
            timer =>
                clearTimeout(
                    timer
                )
        );


        workoutDemoTimers.clear();


        exerciseIds.forEach(
            exerciseId => {

                hydrateWorkoutDemo(
                    exerciseId
                );

            }
        );

    }

    function modernRenderWorkoutLogger() {

        const selectedDayId =
            document
                .getElementById(
                    "workoutDaySelect"
                )
                .value;


        const day =
            trackerData.days.find(
                item =>
                    item.id ===
                    selectedDayId
            );


        const logger =
            document.getElementById(
                "workoutLogger"
            );


        if (
            (
                !currentWorkoutIsFree &&
                !day
            ) ||
            !logger
        ) {

            return;

        }


        const permanentIdsForToday =
            currentWorkoutIsFree

                ? []

                : day.exerciseIds.filter(

                    id =>
                        !excludedWorkoutExerciseIds
                            .includes(id)

                );


        const combinedIds = [

            ...new Set([

                ...permanentIdsForToday,

                ...temporaryWorkoutExerciseIds

            ])

        ];


        /* =====================================================
           EMPTY WORKOUT
           ===================================================== */

        if (
            !combinedIds.length
        ) {

            logger.innerHTML = `
                <div class="modern-workout-empty">

                    <div class="modern-workout-empty-icon">
                        +
                    </div>

                    <h3>
                        No exercises yet
                    </h3>

                    <p>
                        ${
                            currentWorkoutIsFree
                                ? "Add any exercise from your library to build this extra workout."
                                : "Add an exercise above for today, or add one permanently to this workout day."
                        }
                    </p>

                </div>
            `;


            return;

        }


        /* =====================================================
           EXERCISE CARDS
           ===================================================== */

        const cards =
            combinedIds

                .map(
                    (
                        exerciseId,
                        exerciseIndex
                    ) => {

                        const exercise =
                            trackerData
                                .exercises
                                .find(
                                    item =>
                                        item.id ===
                                        exerciseId
                                );


                        if (
                            !exercise
                        ) {

                            return "";

                        }


                        const previous =
                            getLastExercisePerformance(
                                exerciseId
                            );


                        const isTemporary =
                            temporaryWorkoutExerciseIds
                                .includes(
                                    exerciseId
                                );


                        const workoutSetCount =

                            exercise.defaultSets +

                            (
                                workoutExtraSetCounts[
                                    exercise.id
                                ] ||
                                0
                            );


                        const tags =
                            workoutMuscleTags(
                                exercise
                            );


                        const equipment =
                            workoutEquipment(
                                exercise
                            );

                        const demoStats =
                            window.gymExerciseMedia
                                ?.getExerciseDemoStats
                                ? window.gymExerciseMedia
                                    .getExerciseDemoStats(
                                        exercise.id
                                    )
                                : null;


                        const tagHtml = [

                            ...tags.map(
                                tag =>
                                    `
                                    <span class="modern-workout-tag">
                                        ${escapeHtml(tag)}
                                    </span>
                                    `
                            ),

                            ...equipment.map(
                                tag =>
                                    `
                                    <span class="modern-workout-tag equipment">
                                        ${escapeHtml(tag)}
                                    </span>
                                    `
                            )

                        ].join("");


                        const setRows =
                            Array.from(

                                {
                                    length:
                                        workoutSetCount
                                },

                                (
                                    _,
                                    index
                                ) =>

                                    modernSetRow(

                                        exercise,

                                        index,

                                        previous
                                            ?.sets[
                                                index
                                            ] ||
                                            null,

                                        index >=
                                            exercise.defaultSets

                                    )

                            ).join("");


                        return `
                            <article
                                class="exercise-card modern-workout-card"
                                data-workout-exercise="${exercise.id}"
                            >

                                <div class="modern-workout-card-head">

                                    <div class="modern-workout-card-title">

                                        <div class="modern-workout-exercise-index">

                                            ${exerciseIndex + 1}

                                        </div>


                                        <div>

                                            <button
                                                class="modern-workout-exercise-name"
                                                type="button"
                                                onclick="openExerciseDetail('${exercise.id}')"
                                            >

                                                ${escapeHtml(
                                                    exercise.name
                                                )}

                                                <span>
                                                    ›
                                                </span>

                                            </button>


                                            <div class="modern-workout-meta">

                                                ${
                                                    previous

                                                        ? `
                                                            Last performed
                                                            ${escapeHtml(
                                                                previous.date
                                                            )}
                                                        `

                                                        : `
                                                            No previous workout recorded
                                                        `
                                                }


                                                ${
                                                    isTemporary

                                                        ? `
                                                            <span class="temporary-badge">
                                                                Today only
                                                            </span>
                                                        `

                                                        : ""
                                                }

                                            </div>


                                            ${
                                                tagHtml

                                                    ? `
                                                        <div class="modern-workout-tags">
                                                            ${tagHtml}
                                                        </div>
                                                    `

                                                    : ""
                                            }

                                        </div>

                                    </div>


                                    <div class="modern-workout-card-actions">

                                        <div class="modern-workout-allsets">

                                            <span>
                                                All sets
                                            </span>


                                            <button
                                                class="exercise-complete-button"
                                                type="button"
                                                data-exercise-master="${exercise.id}"
                                                aria-label="Mark all ${escapeHtml(exercise.name)} sets complete"
                                                aria-pressed="false"
                                                onclick="toggleExerciseComplete('${exercise.id}')"
                                            >

                                                ✓

                                            </button>

                                        </div>


                                        <div
                                            class="exercise-set-count modern-workout-set-count"
                                            data-exercise-set-count="${exercise.id}"
                                        >

                                            ${workoutSetCount}
                                            sets

                                        </div>

                                    </div>

                                </div>


                                ${renderWorkoutDemoShell(
                                    exercise,
                                    demoStats
                                )}


                                <div class="modern-set-table">

                                    <div class="modern-set-header">

                                        <div>
                                            Set
                                        </div>

                                        <div>
                                            Previous
                                        </div>

                                        <div>
                                            Target
                                        </div>

                                        <div>
                                            Kg
                                        </div>

                                        <div>
                                            Reps
                                        </div>

                                        <div>
                                        </div>

                                    </div>


                                    <div
                                        class="exercise-set-list modern-set-list"
                                        data-set-list="${exercise.id}"
                                    >

                                        ${setRows}

                                    </div>

                                </div>


                                <div class="modern-workout-card-footer">

                                    <div class="add-set-actions modern-add-set-actions">

                                        <button
                                            class="button secondary small"
                                            type="button"
                                            onclick="addWorkoutSet('${exercise.id}', 1)"
                                        >

                                            + Add set

                                        </button>


                                        <button
                                            class="button secondary small"
                                            type="button"
                                            onclick="addMultipleWorkoutSets('${exercise.id}')"
                                        >

                                            + Add multiple

                                        </button>


                                        <button
                                            class="button secondary small"
                                            type="button"
                                            onclick="removeWorkoutSet('${exercise.id}')"
                                        >

                                            − Remove set

                                        </button>

                                    </div>


                                    <div class="exercise-swap-actions modern-swap-actions">

                                        <button
                                            class="button secondary small"
                                            type="button"
                                            onclick="swapWorkoutExercise('${exercise.id}', false)"
                                        >

                                            Swap today

                                        </button>


                                        ${currentWorkoutIsFree ? "" : `
                                            <button
                                                class="button secondary small"
                                                type="button"
                                                onclick="swapWorkoutExercise('${exercise.id}', true)"
                                            >

                                                Swap permanently

                                            </button>
                                        `}

                                    </div>

                                </div>


                                <details class="modern-workout-note">

                                    <summary>
                                        Exercise note
                                    </summary>


                                    <textarea
                                        placeholder="Technique reminder, machine setting or anything useful next time..."
                                        onchange="updateExerciseNote('${exercise.id}', this.value)"
                                    >${escapeHtml(
                                        exercise.notes ||
                                        ""
                                    )}</textarea>

                                </details>

                            </article>
                        `;

                    }
                )

                .join("");


        /* =====================================================
           WORKOUT PAGE
           ===================================================== */

        logger.innerHTML = `

            <div class="modern-workout-session-head">

                <div>

                    <div class="modern-kicker">
                        ${currentWorkoutIsFree ? "Extra workout" : "Workout"}
                    </div>


                    <h2>
                        ${escapeHtml(
                            currentWorkoutIsFree ? "Extra Workout" : day.name
                        )}
                    </h2>


                    <p>
                        ${escapeHtml(
                            currentWorkoutIsFree ? "Extra session" : day.label
                        )}
                        ·
                        ${combinedIds.length}
                        exercises
                    </p>

                </div>


                <div class="modern-workout-date">

                    <label for="workoutDate">
                        Date
                    </label>


                    <input
                        id="workoutDate"
                        type="date"
                        value="${getTodayDate()}"
                    >

                </div>

            </div>



            <div class="workout-progress-panel modern-workout-progress">

                <div class="workout-progress-heading">

                    <div>

                        <div class="small-label">
                            Workout progress
                        </div>


                        <strong>

                            <span id="completedExerciseCount">
                                0
                            </span>

                            /

                            <span id="totalExerciseCount">
                                ${combinedIds.length}
                            </span>

                            exercises

                        </strong>

                    </div>


                    <div
                        class="workout-progress-percent"
                        id="workoutProgressPercent"
                    >
                        0%
                    </div>

                </div>


                <div class="workout-progress-track">

                    <div
                        class="workout-progress-fill"
                        id="workoutProgressFill"
                    >
                    </div>

                </div>


                <div class="workout-progress-stats">

                    <span>

                        <strong id="completedSetCount">
                            0
                        </strong>

                        /

                        <span id="totalSetCount">
                            0
                        </span>

                        sets complete

                    </span>


                    <span>
                        Previous values are pre-filled
                    </span>

                </div>

            </div>



            <div class="modern-workout-help">

                Enter only what changed and tick
                each set when you finish it.
                Only completed sets are saved.

            </div>



            <div class="modern-workout-cards">

                ${cards}

            </div>



            <div class="workout-actions modern-workout-finish-actions">

                <button
                    class="button secondary"
                    type="button"
                    onclick="clearWorkoutInputs()"
                >
                    Clear
                </button>


                <button
                    class="button"
                    type="button"
                    onclick="reviewWorkout()"
                >
                    Review workout
                </button>

            </div>
        `;


        updateWorkoutProgress();

        hydrateWorkoutDemos(
            combinedIds
        );

    }


    /* =========================================================
       WORKOUT CSS
       ========================================================= */

    function injectWorkoutUiStyles() {

        if (
            document.getElementById(
                "modernWorkoutUiStyles"
            )
        ) {

            return;

        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "modernWorkoutUiStyles";


        style.textContent = `

            #workoutPage {
                max-width: 1180px;
                margin: 0 auto;
            }


            #workoutPage > .panel {
                padding: 18px 20px;

                border:
                    1px solid
                    var(
                        --modern-border,
                        #292d33
                    );

                background:
                    var(
                        --modern-surface,
                        #121417
                    );
            }


            #workoutPage > .panel h2 {
                margin-top: 0;

                font-size: 1rem;
            }


            #workoutPage > .panel .form-grid {
                gap: 12px;
            }


            .modern-workout-session-head {
                display: flex;

                align-items: end;
                justify-content: space-between;

                gap: 22px;

                margin:
                    26px 0 16px;
            }


            .modern-workout-session-head h2 {
                margin:
                    4px 0 4px;

                font-size:
                    clamp(
                        2rem,
                        4vw,
                        3.15rem
                    );

                line-height: 1;

                letter-spacing:
                    -.04em;
            }


            .modern-workout-session-head p {
                margin: 0;

                color:
                    var(
                        --modern-muted,
                        #8c939c
                    );
            }


            .modern-workout-date {
                width: 180px;

                flex:
                    0 0 180px;
            }


            .modern-workout-date label {
                display: block;

                margin-bottom: 6px;

                color:
                    var(
                        --modern-muted,
                        #8c939c
                    );

                font-size: .7rem;
                font-weight: 800;

                letter-spacing: .1em;

                text-transform:
                    uppercase;
            }


            .modern-workout-date input {
                width: 100%;

                min-height: 42px;
            }


            .modern-workout-progress {
                margin-bottom: 14px;

                padding:
                    18px 20px;

                border:
                    1px solid
                    var(
                        --modern-border,
                        #292d33
                    );

                border-radius: 20px;

                background:
                    var(
                        --modern-surface,
                        #121417
                    );
            }


            .modern-workout-help {
                margin-bottom: 14px;

                padding:
                    11px 14px;

                border:
                    1px solid
                    #292d33;

                border-radius: 14px;

                background:
                    #0f1114;

                color:
                    #8c939c;

                font-size: .82rem;
            }


            .modern-workout-cards {
                display: grid;

                gap: 16px;
            }


            .modern-workout-card {
                overflow: hidden;

                margin: 0;

                padding:
                    0 !important;

                border:
                    1px solid
                    var(
                        --modern-border,
                        #292d33
                    )
                    !important;

                border-radius:
                    22px !important;

                background:
                    var(
                        --modern-surface,
                        #121417
                    )
                    !important;

                box-shadow:
                    0 15px 44px
                    rgba(
                        0,
                        0,
                        0,
                        .18
                    );
            }


            .modern-workout-card-head {
                display: flex;

                align-items:
                    flex-start;

                justify-content:
                    space-between;

                gap: 18px;

                padding:
                    18px 20px 15px;

                border-bottom:
                    1px solid
                    #25292f;
            }


            .modern-workout-card-title {
                display: flex;

                align-items:
                    flex-start;

                min-width: 0;

                gap: 13px;
            }


            .modern-workout-exercise-index {
                display: grid;

                place-items: center;

                width: 34px;
                height: 34px;

                flex:
                    0 0 34px;

                border-radius: 11px;

                background:
                    #202329;

                color:
                    var(
                        --modern-accent-2,
                        #ff7b57
                    );

                font-size: .8rem;
                font-weight: 900;
            }


            .modern-workout-exercise-name {
                display: flex;

                align-items: center;

                gap: 8px;

                padding: 0;

                border: 0;

                background: none;

                color: #f5f6f7;

                font-size: 1.18rem;
                font-weight: 900;

                text-align: left;

                cursor: pointer;
            }


            .modern-workout-exercise-name span {
                color:
                    var(
                        --modern-accent-2,
                        #ff7b57
                    );

                font-size: 1.45rem;

                line-height: .8;
            }


            .modern-workout-meta {
                display: flex;

                flex-wrap: wrap;

                align-items: center;

                gap: 8px;

                margin-top: 5px;

                color: #7f8790;

                font-size: .73rem;
            }


            .modern-workout-tags {
                display: flex;

                flex-wrap: wrap;

                gap: 6px;

                margin-top: 9px;
            }


            .modern-workout-tag {
                padding:
                    5px 8px;

                border:
                    1px solid
                    #30353b;

                border-radius: 999px;

                background:
                    #171a1e;

                color: #b3b8bf;

                font-size: .66rem;
            }


            .modern-workout-tag.equipment {
                color: #d7a18d;
            }


            .modern-workout-card-actions {
                display: flex;

                align-items: center;

                gap: 11px;
            }


            .modern-workout-allsets {
                display: flex;

                align-items: center;

                gap: 7px;

                color: #8c939c;

                font-size: .68rem;
                font-weight: 800;

                text-transform:
                    uppercase;

                letter-spacing:
                    .08em;
            }


            .modern-workout-set-count {
                padding:
                    6px 9px;

                border-radius: 999px;

                background:
                    #1a1d21;

                color: #8c939c;

                font-size: .68rem;
            }


            .modern-workout-demo {
                display: grid;

                grid-template-columns:
                    132px
                    minmax(
                        0,
                        1fr
                    );

                gap: 12px;

                align-items: center;

                margin:
                    0 20px 10px;

                padding:
                    10px;

                border:
                    1px solid
                    #25292f;

                border-radius:
                    14px;

                background:
                    #0d1013;
            }


            .modern-workout-demo-frame {
                position: relative;

                overflow: hidden;

                width: 132px;

                aspect-ratio:
                    4 / 3;

                border:
                    1px solid
                    #30353b;

                border-radius:
                    12px;

                background:
                    #080a0d;
            }


            .modern-workout-demo-media {
                display: block;

                width: 100%;
                height: 100%;

                object-fit:
                    cover;
            }


            .modern-workout-demo-media.paused {
                opacity: .32;

                filter:
                    grayscale(1);
            }


            .modern-workout-demo-status {
                display: grid;

                place-items: center;

                width: 100%;
                height: 100%;

                padding:
                    10px;

                color:
                    #8c939c;

                font-size: .72rem;
                font-weight: 800;

                text-align: center;
            }


            .modern-workout-demo-replay {
                position: absolute;

                inset:
                    auto 8px 8px 8px;

                display: none;

                padding:
                    7px 9px;

                border:
                    1px solid
                    rgba(
                        255,
                        123,
                        87,
                        .55
                    );

                border-radius:
                    999px;

                background:
                    rgba(
                        8,
                        10,
                        13,
                        .9
                    );

                color:
                    #ffb29c;

                font-size: .72rem;
                font-weight: 900;

                cursor: pointer;
            }


            .modern-workout-demo-replay.visible {
                display: block;
            }


            .modern-workout-demo-info {
                min-width: 0;
            }


            .modern-workout-demo-label {
                margin-bottom:
                    8px;

                color:
                    #8c939c;

                font-size: .68rem;
                font-weight: 900;

                letter-spacing:
                    .08em;

                text-transform:
                    uppercase;
            }


            .modern-workout-demo-stats {
                display: flex;

                flex-wrap: wrap;

                gap:
                    7px;
            }


            .modern-workout-demo-stats span {
                display: grid;

                gap:
                    2px;

                min-width:
                    80px;

                padding:
                    7px 8px;

                border:
                    1px solid
                    #25292f;

                border-radius:
                    10px;

                background:
                    #12161a;

                color:
                    #737b84;

                font-size:
                    .62rem;

                font-weight:
                    850;

                letter-spacing:
                    .06em;

                text-transform:
                    uppercase;
            }


            .modern-workout-demo-stats strong {
                color:
                    #f5f6f7;

                font-size:
                    .76rem;

                letter-spacing:
                    0;

                text-transform:
                    none;
            }


            .modern-set-table {
                overflow-x: auto;

                padding:
                    0 20px 6px;
            }


            .modern-set-header,
            .modern-set-row {
                display:
                    grid !important;

                grid-template-columns:
                    52px
                    minmax(
                        150px,
                        1.35fr
                    )
                    minmax(
                        90px,
                        .75fr
                    )
                    92px
                    82px
                    46px
                    !important;

                gap:
                    10px !important;

                align-items:
                    center !important;

                min-width: 650px;
            }


            .modern-set-header {
                padding:
                    12px 4px 8px;

                color: #737b84;

                font-size: .65rem;
                font-weight: 850;

                letter-spacing:
                    .09em;

                text-transform:
                    uppercase;
            }


            .modern-set-row {
                padding:
                    8px 4px !important;

                border:
                    0 !important;

                border-top:
                    1px solid
                    #22262b
                    !important;

                background:
                    transparent
                    !important;
            }


            .modern-set-row.set-done {
                background:
                    rgba(
                        113,
                        199,
                        153,
                        .055
                    )
                    !important;
            }


            .modern-set-number {
                color: #9da4ac;

                font-size: .78rem;
                font-weight: 900;
            }


            .modern-set-number span {
                display: grid;

                place-items: center;

                width: 30px;
                height: 30px;

                border-radius: 10px;

                background:
                    #1b1f23;
            }


            .modern-set-previous,
            .modern-set-target {
                color: #a2a9b1;

                font-size: .78rem;

                white-space: nowrap;
            }


            .modern-set-target {
                color: #737b84;
            }


            .modern-set-input-wrap {
                min-width: 0;
            }


            .modern-set-input {
                width:
                    100% !important;

                min-width:
                    0 !important;

                height:
                    38px !important;

                padding:
                    7px 9px !important;

                border:
                    1px solid
                    #30353b
                    !important;

                border-radius:
                    10px !important;

                background:
                    #0d0f12
                    !important;

                color:
                    #f5f6f7
                    !important;

                text-align:
                    center;

                font-size:
                    .88rem !important;

                font-weight: 800;
            }


            .modern-set-input:focus {
                border-color:
                    var(
                        --modern-accent-2,
                        #ff7b57
                    )
                    !important;

                outline:
                    none !important;

                box-shadow:
                    0 0 0 2px
                    rgba(
                        255,
                        123,
                        87,
                        .12
                    );
            }


            .modern-set-check {
                justify-self: center;

                width:
                    34px !important;

                height:
                    34px !important;

                min-width:
                    34px !important;

                padding:
                    0 !important;

                border-radius:
                    11px !important;
            }


            .modern-workout-card-footer {
                display: flex;

                align-items: center;

                justify-content:
                    space-between;

                gap: 14px;

                padding:
                    12px 20px 14px;

                border-top:
                    1px solid
                    #22262b;
            }


            .modern-add-set-actions,
            .modern-swap-actions {
                display: flex;

                flex-wrap: wrap;

                gap: 7px;
            }


            .modern-workout-note {
                margin:
                    0 20px 18px;

                border:
                    1px solid
                    #272b30;

                border-radius: 12px;

                background:
                    #0f1114;
            }


            .modern-workout-note summary {
                padding:
                    10px 12px;

                color: #949ba3;

                font-size: .75rem;
                font-weight: 800;

                cursor: pointer;
            }


            .modern-workout-note textarea {
                min-height: 74px;

                border:
                    0 !important;

                border-top:
                    1px solid
                    #272b30
                    !important;

                border-radius:
                    0 0 12px 12px
                    !important;
            }


            .modern-workout-finish-actions {
                display: flex;

                justify-content:
                    flex-end;

                gap: 9px;

                margin:
                    18px 0 10px;

                padding: 0;
            }


            .modern-workout-empty {
                margin-top: 24px;

                padding:
                    44px 20px;

                border:
                    1px dashed
                    #343941;

                border-radius: 20px;

                background:
                    #111316;

                text-align: center;
            }


            .modern-workout-empty-icon {
                display: grid;

                place-items: center;

                width: 48px;
                height: 48px;

                margin:
                    0 auto 12px;

                border-radius: 50%;

                background:
                    #1c2025;

                color:
                    var(
                        --modern-accent-2,
                        #ff7b57
                    );

                font-size: 1.5rem;
            }


            .modern-workout-empty h3 {
                margin: 0;
            }


            .modern-workout-empty p {
                max-width: 520px;

                margin:
                    8px auto 0;

                color: #8c939c;
            }


            @media (
                max-width: 760px
            ) {

                .modern-workout-session-head {
                    align-items:
                        stretch;

                    flex-direction:
                        column;
                }


                .modern-workout-date {
                    width: 100%;

                    flex-basis:
                        auto;
                }


                .modern-workout-card-head,
                .modern-workout-card-footer {
                    align-items:
                        stretch;

                    flex-direction:
                        column;
                }


                .modern-workout-card-actions {
                    justify-content:
                        space-between;
                }


                .modern-workout-demo {
                    grid-template-columns:
                        104px
                        minmax(
                            0,
                            1fr
                        );

                    margin:
                        0 12px 10px;

                    padding:
                        8px;
                }


                .modern-workout-demo-frame {
                    width:
                        104px;
                }


                .modern-workout-demo-stats {
                    gap:
                        5px;
                }


                .modern-workout-demo-stats span {
                    min-width:
                        68px;

                    padding:
                        6px 7px;
                }


                .modern-set-table {
                    padding-left:
                        12px;

                    padding-right:
                        12px;
                }


                .modern-set-header,
                .modern-set-row {
                    grid-template-columns:
                        44px
                        132px
                        78px
                        78px
                        70px
                        42px
                        !important;

                    gap:
                        7px !important;

                    min-width:
                        505px;
                }


                .modern-workout-note {
                    margin-left:
                        12px;

                    margin-right:
                        12px;
                }

            }

        `;


        document.head.appendChild(
            style
        );

    }


    /* =========================================================
       ENABLE NEW WORKOUT UI
       ========================================================= */

    injectWorkoutUiStyles();


    renderWorkoutLogger =
        modernRenderWorkoutLogger;


    buildExtraSetRow =
        modernBuildExtraSetRow;


    /* =========================================================
       INITIAL RENDER
       ========================================================= */

    renderAll();


    modernNavigate(
        "dashboardPage"
    );

})();
