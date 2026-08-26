(function () {
    const WEEKLY_WORKOUT_TARGET = 4;

    function safeArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function localDateKey(date) {
        const d = new Date(date);

        if (Number.isNaN(d.getTime())) {
            return String(date || "").slice(0, 10);
        }

        const offset = d.getTimezoneOffset();
        return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
    }

    function mondayOf(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);

        const day = (d.getDay() + 6) % 7;
        d.setDate(d.getDate() - day);

        return d;
    }

    function workoutDate(workout) {
        return new Date(`${workout?.date || ""}T12:00:00`);
    }

    function getSortedWorkoutsDesc() {
        return [...safeArray(trackerData.workouts)].sort((a, b) => {
            const dateCompare = workoutDate(b) - workoutDate(a);
            return dateCompare || new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
        });
    }

    function weeklyWorkouts() {
        const start = mondayOf(new Date());
        const end = new Date(start);
        end.setDate(end.getDate() + 7);

        return safeArray(trackerData.workouts).filter(workout => {
            const d = workoutDate(workout);
            return d >= start && d < end;
        });
    }

    function sumWorkoutStats(workouts) {
        return workouts.reduce(
            (total, workout) => {
                const stats = getWorkoutTotals(workout);

                total.volume += stats.volume || 0;
                total.sets += stats.sets || 0;
                total.reps += stats.reps || 0;
                total.exercises += stats.exercises || 0;

                return total;
            },
            { volume: 0, sets: 0, reps: 0, exercises: 0 }
        );
    }

    function getWorkoutName(workout) {
        if (typeof getWorkoutDisplayName === "function") {
            return getWorkoutDisplayName(workout);
        }

        if (workout?.isFreeWorkout) return "Extra Workout";
        const day = safeArray(trackerData.days).find(item => item.id === workout?.dayId);
        return day?.name || "Workout";
    }

    function getExerciseName(exerciseId) {
        return safeArray(trackerData.exercises).find(item => item.id === exerciseId)?.name || "Exercise";
    }

    function formatWeightValue(value) {
        return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
    }

    function getWorkoutPrs(workout) {
        try {
            if (
                typeof buildWorkoutCompletionData !== "function" ||
                typeof getWorkoutsBeforeSavedWorkout !== "function"
            ) {
                return [];
            }

            const data = buildWorkoutCompletionData(workout, getWorkoutsBeforeSavedWorkout(workout));
            return safeArray(data.exercises).flatMap(exercise =>
                safeArray(exercise.prs).map(pr => ({
                    ...pr,
                    exerciseId: exercise.exerciseId,
                    exerciseName: exercise.name
                }))
            );
        } catch (error) {
            console.warn("Dashboard PR reconstruction skipped:", error);
            return [];
        }
    }

    function getWeeklyPrCount(workouts) {
        return workouts.reduce((sum, workout) => sum + getWorkoutPrs(workout).length, 0);
    }

    function formatPrType(pr) {
        const type = String(pr?.type || "").toLowerCase();
        if (type === "estimated1rm") return "Estimated 1RM PR";
        if (type === "weight") return "Weight PR";
        if (type === "volume") return "Volume PR";
        if (type === "reps") return "Rep PR";
        return pr?.label || "PR";
    }

    function formatPrValue(pr) {
        const value = String(pr?.value || "").trim();
        if (value) return value;

        return String(pr?.label || "")
            .replace(/^new\s+rep\s+pr:?\s*/i, "")
            .replace(/^rep\s+pr:?\s*/i, "")
            .replace(/^new\s+/i, "")
            .trim();
    }

    function collectRecentPrs(limit = 5) {
        const prs = [];

        getSortedWorkoutsDesc().forEach(workout => {
            getWorkoutPrs(workout).forEach(pr => {
                if (prs.length >= limit) return;

                prs.push({
                    ...pr,
                    workoutId: workout.id,
                    date: workout.date
                });
            });
        });

        return prs.slice(0, limit);
    }

    function renderWeekHtml(workouts) {
        const start = mondayOf(new Date());
        const todayKey = localDateKey(new Date());
        const completedKeys = new Set(workouts.map(workout => workout.date));
        const labels = ["M", "T", "W", "T", "F", "S", "S"];

        return Array.from({ length: 7 }, (_, index) => {
            const d = new Date(start);
            d.setDate(start.getDate() + index);

            const key = localDateKey(d);
            const isToday = key === todayKey;
            const done = completedKeys.has(key);

            return `
                <div class="modern-week-day ${isToday ? "today" : ""} ${done ? "done" : ""}">
                    <strong>${labels[index]}</strong>
                    <div class="modern-day-dot">${done ? "✓" : d.getDate()}</div>
                </div>
            `;
        }).join("");
    }

    function weeklyGoalText(workoutCount, target) {
        if (workoutCount < target) return `${workoutCount} of ${target} sessions`;
        if (workoutCount === target) return `${workoutCount} of ${target} sessions · target reached`;
        return `${workoutCount} workouts · ${workoutCount - target} above target`;
    }

    function renderNextWorkoutExercises(nextDay) {
        const exerciseIds = safeArray(nextDay?.exerciseIds);

        if (!exerciseIds.length) {
            return `
                <div class="modern-next-empty">
                    No exercises are planned for this workout yet.
                </div>
            `;
        }

        return `
            <div class="modern-next-exercises">
                ${exerciseIds.slice(0, 6).map(exerciseId => {
                    const exercise = safeArray(trackerData.exercises).find(item => item.id === exerciseId);
                    if (!exercise) return "";

                    const settings = typeof getProgressionSettings === "function"
                        ? getProgressionSettings(exercise)
                        : { minReps: 8, maxReps: 12 };
                    const setCount = Number(exercise.defaultSets) || 3;
                    const target = typeof calculateExerciseTargetForSet === "function"
                        ? calculateExerciseTargetForSet(exercise, 0, setCount)
                        : null;
                    const targetText = target?.weightKg
                        ? `${formatWeightValue(target.weightKg)} kg × ${target.reps}`
                        : `${settings.minReps}-${settings.maxReps} reps`;

                    return `
                        <div class="modern-next-exercise">
                            <strong>${escapeHtml(exercise.name)}</strong>
                            <span>${setCount} sets · ${settings.minReps}-${settings.maxReps} reps</span>
                            <em>${escapeHtml(targetText)}</em>
                        </div>
                    `;
                }).join("")}
                ${exerciseIds.length > 6 ? `
                    <div class="modern-next-empty">
                        +${exerciseIds.length - 6} more exercise${exerciseIds.length - 6 === 1 ? "" : "s"}
                    </div>
                ` : ""}
            </div>
        `;
    }

    function lastWorkoutHtml(lastWorkout) {
        if (!lastWorkout) {
            return `
                <div class="empty-message">
                    Saved workouts will appear here after your first session.
                </div>
            `;
        }

        const stats = getWorkoutTotals(lastWorkout);
        const prCount = getWorkoutPrs(lastWorkout).length;

        return `
            <div class="modern-last-workout">
                <div>
                    <h4>${escapeHtml(getWorkoutName(lastWorkout))}</h4>
                    <span>${escapeHtml(lastWorkout.date)}</span>
                </div>
                <div class="modern-last-metrics">
                    <div><strong>${stats.exercises}</strong><span>Exercises</span></div>
                    <div><strong>${stats.sets}</strong><span>Sets</span></div>
                    <div><strong>${Math.round(stats.volume).toLocaleString()} kg</strong><span>Volume</span></div>
                    <div><strong>${prCount}</strong><span>PRs</span></div>
                </div>
                <button class="button secondary small" type="button"
                    onclick="openSavedWorkoutReview('${lastWorkout.id}', 'dashboardPage')">
                    Review
                </button>
            </div>
        `;
    }

    function recentPrsHtml(prs) {
        if (!prs.length) {
            return `
                <div class="empty-message">
                    New PRs will appear here when a saved workout beats previous history.
                </div>
            `;
        }

        return `
            <div class="modern-pr-list">
                ${prs.map(pr => `
                    <button class="modern-pr-item" type="button"
                        onclick="openExerciseDetail('${pr.exerciseId}')">
                        <span>
                            <strong>${escapeHtml(pr.exerciseName || getExerciseName(pr.exerciseId))}</strong>
                            <em>${escapeHtml(formatPrValue(pr) || pr.date)}</em>
                        </span>
                        <small>${escapeHtml(formatPrType(pr))}</small>
                    </button>
                `).join("")}
            </div>
        `;
    }

    function signedChange(value, suffix = "") {
        if (!Number.isFinite(value)) return "No comparison";
        const sign = value > 0 ? "+" : "";
        return `${sign}${value.toFixed(1)}${suffix}`;
    }

    function getBodyTrend() {
        const entries = [...safeArray(trackerData.bodyEntries)]
            .filter(entry => Number(entry?.weightKg) > 0 && entry?.date)
            .sort((a, b) => new Date(`${a.date}T12:00:00`) - new Date(`${b.date}T12:00:00`));

        const latest = entries.at(-1) || null;
        const previous = entries.length > 1 ? entries.at(-2) : null;

        let thirtyDayEntry = null;
        if (latest) {
            const cutoff = new Date(`${latest.date}T12:00:00`);
            cutoff.setDate(cutoff.getDate() - 30);
            thirtyDayEntry = [...entries]
                .reverse()
                .find(entry => new Date(`${entry.date}T12:00:00`) <= cutoff) || null;
        }

        return { entries, latest, previous, thirtyDayEntry };
    }

    function sparklineSvg(entries) {
        const points = entries.slice(-12);
        if (points.length < 2) return "";

        const values = points.map(entry => Number(entry.weightKg));
        let min = Math.min(...values);
        let max = Math.max(...values);
        if (min === max) {
            min -= 1;
            max += 1;
        }

        const coords = values.map((value, index) => {
            const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
            const y = 34 - ((value - min) / (max - min)) * 28;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(" ");

        return `
            <svg class="modern-weight-sparkline" viewBox="0 0 100 40" role="img" aria-label="Body weight trend">
                <polyline points="${coords}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
            </svg>
        `;
    }

    function bodyWeightTrendHtml() {
        const trend = getBodyTrend();

        if (!trend.latest) {
            return `
                <div class="empty-message">
                    Add a body measurement to see your weight trend.
                </div>
            `;
        }

        const previousChange = trend.previous
            ? Number(trend.latest.weightKg) - Number(trend.previous.weightKg)
            : NaN;
        const thirtyDayChange = trend.thirtyDayEntry
            ? Number(trend.latest.weightKg) - Number(trend.thirtyDayEntry.weightKg)
            : NaN;

        return `
            <button class="modern-weight-card" type="button" onclick="modernNavigate('bodyPage')">
                <div>
                    <span>Latest weight</span>
                    <strong>${Number(trend.latest.weightKg).toFixed(1)} kg</strong>
                    <small>${escapeHtml(trend.latest.date)}</small>
                </div>
                ${sparklineSvg(trend.entries)}
                <div class="modern-weight-changes">
                    <span>${escapeHtml(signedChange(previousChange, " kg"))} vs previous</span>
                    <span>${escapeHtml(signedChange(thirtyDayChange, " kg"))} over ~30 days</span>
                </div>
            </button>
        `;
    }

    function consistencyHtml(weekCount, weeklyTarget, activePlan, progress) {
        const percent = Math.round(Math.min(1, weekCount / weeklyTarget) * 100);

        return `
            <div class="modern-consistency">
                <div>
                    <span>This week</span>
                    <strong>${weekCount} / ${weeklyTarget}</strong>
                    <small>${escapeHtml(weeklyGoalText(weekCount, weeklyTarget))}</small>
                </div>
                <div>
                    <span>Programme</span>
                    <strong>${activePlan ? `Week ${progress.week}` : "No active plan"}</strong>
                    <small>${activePlan ? `${progress.completed} / ${progress.total} planned workouts` : "Set one up in Plans"}</small>
                </div>
                <div class="modern-goal-meter" aria-hidden="true">
                    <span style="width:${percent}%"></span>
                </div>
            </div>
        `;
    }

    window.renderModernHome = function renderModernHome() {
        const root = document.getElementById("modernHome");
        if (!root) return;

        const activePlan = getActivePlan();
        const progress = activePlan ? getPlanProgress(activePlan) : null;
        const nextDay = activePlan?.days?.length
            ? activePlan.days[progress.completed % activePlan.days.length]
            : null;
        const week = weeklyWorkouts();
        const weekly = sumWorkoutStats(week);
        const weeklyTarget = WEEKLY_WORKOUT_TARGET;
        const weeklyPrs = getWeeklyPrCount(week);
        const lastWorkout = getSortedWorkoutsDesc()[0] || null;
        const recentPrs = collectRecentPrs(5);
        const longDate = new Intl.DateTimeFormat(
            undefined,
            { weekday: "long", month: "short", day: "numeric" }
        ).format(new Date());

        root.innerHTML = `
            <div class="modern-page-title">
                <div class="modern-kicker">Today</div>
                <h1>${escapeHtml(longDate)}</h1>
                <p>
                    ${activePlan
                        ? `Week ${progress.week} of ${activePlan.durationWeeks} in ${escapeHtml(activePlan.name)}.`
                        : "Choose a plan and make today's session count."
                    }
                </p>
            </div>

            <div class="modern-home">
                <section class="modern-hero">
                    <div class="modern-hero-copy">
                        <div class="modern-hero-label">${nextDay ? "Next workout" : "Training"}</div>
                        <h2>${escapeHtml(nextDay?.name || "Ready when you are")}</h2>
                        <p class="modern-hero-sub">
                            ${nextDay
                                ? `${nextDay.exerciseIds.length} exercises ready from your active plan.`
                                : "Add a workout day to your active plan to begin."
                            }
                        </p>

                        <div class="modern-plan-line">
                            ${activePlan
                                ? `
                                    <span>${escapeHtml(activePlan.name)}</span>
                                    <span>Week ${progress.week} / ${activePlan.durationWeeks}</span>
                                    <span>${progress.completed} / ${progress.total} planned workouts</span>
                                `
                                : ""
                            }
                        </div>

                        ${nextDay ? renderNextWorkoutExercises(nextDay) : ""}

                        ${nextDay
                            ? `
                                <button class="modern-primary-action" type="button" onclick="startWorkout('${nextDay.id}')">
                                    <span class="modern-play-icon"></span>
                                    Start workout
                                </button>
                            `
                            : `
                                <button class="modern-primary-action" type="button" onclick="modernNavigate('programmePage')">
                                    Set up plan
                                </button>
                            `
                        }

                        <button class="modern-link-button" type="button" onclick="startFreeWorkout()">
                            Extra workout
                        </button>
                    </div>
                </section>

                <section class="modern-week-strip">
                    <div class="modern-section-row">
                        <h3>This week</h3>
                        <span>${week.length} / ${weeklyTarget} workout target</span>
                    </div>

                    <section class="modern-stats-grid dashboard-week-stats">
                        <article class="modern-stat-card">
                            <span>Workouts</span>
                            <strong>${week.length}</strong>
                            <small>${escapeHtml(weeklyGoalText(week.length, weeklyTarget))}</small>
                        </article>
                        <article class="modern-stat-card">
                            <span>Sets</span>
                            <strong>${weekly.sets}</strong>
                            <small>${weekly.exercises} exercises logged</small>
                        </article>
                        <article class="modern-stat-card">
                            <span>Volume</span>
                            <strong>${Math.round(weekly.volume).toLocaleString()} kg</strong>
                            <small>${weekly.reps.toLocaleString()} reps</small>
                        </article>
                        <article class="modern-stat-card">
                            <span>PRs</span>
                            <strong>${weeklyPrs}</strong>
                            <small>${weeklyPrs ? "From saved workouts" : "No new PRs this week"}</small>
                        </article>
                    </section>

                    <div class="modern-week-days">
                        ${renderWeekHtml(week)}
                    </div>
                </section>

                <section class="modern-split">
                    <article class="modern-card">
                        <div class="modern-section-row">
                            <h3>Last workout</h3>
                            <button class="modern-link-button" type="button" onclick="modernNavigate('progressPage')">
                                View progress
                            </button>
                        </div>
                        ${lastWorkoutHtml(lastWorkout)}
                    </article>

                    <article class="modern-card">
                        <div class="modern-section-row">
                            <h3>Recent PRs</h3>
                            <span>${recentPrs.length ? `${recentPrs.length} latest` : "All-time"}</span>
                        </div>
                        ${recentPrsHtml(recentPrs)}
                    </article>
                </section>

                <section class="modern-split dashboard-secondary-split">
                    <article class="modern-card">
                        <div class="modern-section-row">
                            <h3>Weight trend</h3>
                            <button class="modern-link-button" type="button" onclick="modernNavigate('bodyPage')">
                                Body
                            </button>
                        </div>
                        ${bodyWeightTrendHtml()}
                    </article>

                    <article class="modern-card">
                        <div class="modern-section-row">
                            <h3>Consistency</h3>
                            <button class="modern-link-button" type="button" onclick="modernNavigate('programmePage')">
                                Plans
                            </button>
                        </div>
                        ${consistencyHtml(week.length, weeklyTarget, activePlan, progress)}
                    </article>
                </section>
            </div>
        `;
    };
})();
