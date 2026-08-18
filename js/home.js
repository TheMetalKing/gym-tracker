(function () {
    const WEEKLY_WORKOUT_TARGET = 4;

    function localDateKey(date) {
        const d = new Date(date);

        if (Number.isNaN(d.getTime())) {
            return String(date || "").slice(0, 10);
        }

        const offset = d.getTimezoneOffset();

        return new Date(
            d.getTime() - offset * 60000
        )
            .toISOString()
            .slice(0, 10);
    }


    function mondayOf(date) {
        const d = new Date(date);

        d.setHours(0, 0, 0, 0);

        const day =
            (d.getDay() + 6) % 7;

        d.setDate(
            d.getDate() - day
        );

        return d;
    }


    function weeklyWorkouts() {
        const start =
            mondayOf(new Date());

        const end =
            new Date(start);

        end.setDate(
            end.getDate() + 7
        );

        return trackerData.workouts.filter(
            workout => {

                const d =
                    new Date(
                        `${workout.date}T12:00:00`
                    );

                return (
                    d >= start &&
                    d < end
                );

            }
        );
    }


    function sumWorkoutStats(workouts) {
        return workouts.reduce(
            (total, workout) => {

                const stats =
                    getWorkoutTotals(workout);

                total.volume +=
                    stats.volume || 0;

                total.sets +=
                    stats.sets || 0;

                total.reps +=
                    stats.reps || 0;

                total.exercises +=
                    stats.exercises || 0;

                return total;

            },
            {
                volume: 0,
                sets: 0,
                reps: 0,
                exercises: 0
            }
        );
    }


    function recentWorkoutsHtml(limit = 5) {
        const recent =
            [...trackerData.workouts]
                .sort(
                    (a, b) =>
                        new Date(
                            `${b.date}T12:00:00`
                        ) -
                        new Date(
                            `${a.date}T12:00:00`
                        )
                )
                .slice(
                    0,
                    limit
                );


        if (!recent.length) {
            return `
                <div class="empty-message">
                    Your saved workouts will appear here.
                </div>
            `;
        }


        return recent
            .map(workout => {

                const day =
                    trackerData.days.find(
                        item =>
                            item.id ===
                            workout.dayId
                    );

                const stats =
                    getWorkoutTotals(
                        workout
                    );


                return `
                    <div class="modern-activity-item">

                        <div class="modern-activity-icon">
                            ✓
                        </div>


                        <div class="modern-activity-main">

                            <strong>
                                ${escapeHtml(
                                    workout.isFreeWorkout
                                        ? "Extra Workout"
                                        : day?.name ||
                                            "Workout"
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    workout.date
                                )}
                                ·
                                ${stats.sets}
                                sets
                            </span>

                        </div>


                        <div class="modern-activity-stats">
                            ${Math.round(
                                stats.volume
                            ).toLocaleString()}
                            kg
                        </div>

                    </div>
                `;

            })
            .join("");
    }


    function renderWeekHtml(workouts) {
        const start =
            mondayOf(new Date());

        const todayKey =
            localDateKey(
                new Date()
            );

        const completedKeys =
            new Set(
                workouts.map(
                    workout =>
                        workout.date
                )
            );

        const labels =
            [
                "M",
                "T",
                "W",
                "T",
                "F",
                "S",
                "S"
            ];


        return Array.from(
            {
                length: 7
            },

            (_, index) => {

                const d =
                    new Date(start);

                d.setDate(
                    start.getDate() +
                    index
                );

                const key =
                    localDateKey(d);

                const isToday =
                    key === todayKey;

                const done =
                    completedKeys.has(
                        key
                    );


                return `
                    <div
                        class="
                            modern-week-day
                            ${isToday ? "today" : ""}
                            ${done ? "done" : ""}
                        "
                    >

                        <strong>
                            ${labels[index]}
                        </strong>


                        <div class="modern-day-dot">
                            ${done ? "✓" : d.getDate()}
                        </div>

                    </div>
                `;

            }
        ).join("");
    }


    function weeklyGoalText(
        workoutCount,
        target
    ) {
        if (
            workoutCount < target
        ) {
            return `${workoutCount} of ${target} sessions`;
        }

        if (
            workoutCount === target
        ) {
            return `${workoutCount} of ${target} sessions · target reached`;
        }

        return `${workoutCount} workouts · ${workoutCount - target} above target`;
    }


    window.renderModernHome =
        function renderModernHome() {

            const root =
                document.getElementById(
                    "modernHome"
                );


            if (!root) {
                return;
            }


            const activePlan =
                getActivePlan();


            const progress =
                activePlan
                    ? getPlanProgress(
                        activePlan
                    )
                    : null;


            const nextDay =
                activePlan?.days?.length

                    ? activePlan.days[
                        progress.completed %
                        activePlan.days.length
                    ]

                    : null;


            const week =
                weeklyWorkouts();


            const weekly =
                sumWorkoutStats(
                    week
                );


            const weeklyTarget =
                WEEKLY_WORKOUT_TARGET;


            const goalPercent =
                Math.round(
                    Math.min(
                        1,
                        week.length /
                        weeklyTarget
                    ) *
                    100
                );


            const latestBody =
                [...trackerData.bodyEntries]
                    .sort(
                        (a, b) =>
                            new Date(
                                b.date
                            ) -
                            new Date(
                                a.date
                            )
                    )[0];


            const now =
                new Date();


            const longDate =
                new Intl.DateTimeFormat(
                    undefined,
                    {
                        weekday: "long",
                        month: "short",
                        day: "numeric"
                    }
                ).format(now);


            root.innerHTML = `
                <div class="modern-page-title">

                    <div class="modern-kicker">
                        Today
                    </div>


                    <h1>
                        ${escapeHtml(
                            longDate
                        )}
                    </h1>


                    <p>

                        ${
                            activePlan

                                ? `
                                    Week
                                    ${progress.week}
                                    of
                                    ${activePlan.durationWeeks}
                                    in
                                    ${escapeHtml(
                                        activePlan.name
                                    )}.
                                `

                                : `
                                    Choose a plan and make
                                    today's session count.
                                `
                        }

                    </p>

                </div>



                <div class="modern-home">


                    <section class="modern-hero">

                        <div class="modern-hero-copy">

                            <div class="modern-hero-label">
                                ${
                                    nextDay
                                        ? "Today's focus"
                                        : "Training"
                                }
                            </div>


                            <h2>
                                ${escapeHtml(
                                    nextDay?.name ||
                                    "Ready when you are"
                                )}
                            </h2>


                            <p class="modern-hero-sub">

                                ${
                                    nextDay

                                        ? `
                                            ${nextDay.exerciseIds.length}
                                            exercises ready from
                                            your active plan.
                                        `

                                        : `
                                            Add a workout day
                                            to your active plan
                                            to begin.
                                        `
                                }

                            </p>


                            <div class="modern-plan-line">

                                ${
                                    activePlan

                                        ? `
                                            <span>
                                                ${escapeHtml(
                                                    activePlan.name
                                                )}
                                            </span>

                                            <span>
                                                Week
                                                ${progress.week}
                                                /
                                                ${activePlan.durationWeeks}
                                            </span>

                                            <span>
                                                ${progress.completed}
                                                /
                                                ${progress.total}
                                                planned workouts
                                            </span>
                                        `

                                        : ""
                                }

                            </div>


                            ${
                                nextDay

                                    ? `
                                        <button
                                            class="modern-primary-action"
                                            type="button"
                                            onclick="startWorkout('${nextDay.id}')"
                                        >
                                            <span class="modern-play-icon"></span>

                                            Start workout
                                        </button>
                                    `

                                    : `
                                        <button
                                            class="modern-primary-action"
                                            type="button"
                                            onclick="modernNavigate('programmePage')"
                                        >
                                            Set up plan
                                        </button>
                                    `
                            }


                            <button
                                class="modern-link-button"
                                type="button"
                                onclick="startFreeWorkout()"
                            >
                                Extra workout
                            </button>

                        </div>

                    </section>



                    <section class="modern-week-strip">

                        <div class="modern-section-row">

                            <h3>
                                This week
                            </h3>


                            <span>
                                ${week.length}
                                /
                                ${weeklyTarget}
                                workout target
                            </span>

                        </div>


                        <div class="modern-week-days">
                            ${renderWeekHtml(
                                week
                            )}
                        </div>

                    </section>



                    <section class="modern-stats-grid">

                        <article class="modern-stat-card">

                            <span>
                                Volume this week
                            </span>

                            <strong>
                                ${Math.round(
                                    weekly.volume
                                ).toLocaleString()}
                                kg
                            </strong>

                            <small>
                                ${weekly.reps.toLocaleString()}
                                reps
                            </small>

                        </article>


                        <article class="modern-stat-card">

                            <span>
                                Sets this week
                            </span>

                            <strong>
                                ${weekly.sets}
                            </strong>

                            <small>
                                ${weekly.exercises}
                                exercises logged
                            </small>

                        </article>


                        <article class="modern-stat-card">

                            <span>
                                Weekly goal
                            </span>

                            <strong>
                                ${goalPercent}%
                            </strong>

                            <small>
                                ${weeklyGoalText(
                                    week.length,
                                    weeklyTarget
                                )}
                            </small>

                        </article>


                        <article class="modern-stat-card">

                            <span>
                                Body weight
                            </span>

                            <strong>
                                ${
                                    latestBody

                                        ? `
                                            ${latestBody.weightKg.toFixed(2)}
                                            kg
                                        `

                                        : "—"
                                }
                            </strong>

                            <small>
                                ${
                                    latestBody

                                        ? `
                                            ${latestBody.bodyFat.toFixed(1)}%
                                            body fat
                                        `

                                        : `
                                            No body entry yet
                                        `
                                }
                            </small>

                        </article>

                    </section>



                    <section class="modern-split">

                        <article class="modern-card">

                            <div class="modern-section-row">

                                <h3>
                                    Recent activity
                                </h3>


                                <button
                                    class="modern-link-button"
                                    type="button"
                                    onclick="modernNavigate('progressPage')"
                                >
                                    View progress
                                </button>

                            </div>


                            <div class="modern-activity-list">
                                ${recentWorkoutsHtml()}
                            </div>

                        </article>



                        <article class="modern-card">

                            <div class="modern-section-row">

                                <h3>
                                    ${
                                        activePlan
                                            ? escapeHtml(
                                                activePlan.name
                                            )
                                            : "Training plan"
                                    }
                                </h3>


                                <button
                                    class="modern-link-button"
                                    type="button"
                                    onclick="modernNavigate('programmePage')"
                                >
                                    Manage plan
                                </button>

                            </div>


                            <div class="modern-plan-days">

                                ${
                                    activePlan?.days?.length

                                        ? activePlan.days
                                            .map(
                                                (
                                                    day,
                                                    index
                                                ) => `
                                                    <div class="modern-plan-day">

                                                        <div>

                                                            <strong>
                                                                ${escapeHtml(
                                                                    day.name
                                                                )}
                                                            </strong>

                                                            <span>
                                                                ${escapeHtml(
                                                                    day.label
                                                                )}
                                                                ·
                                                                ${day.exerciseIds.length}
                                                                exercises
                                                            </span>

                                                        </div>


                                                        <span>
                                                            ${
                                                                index ===
                                                                (
                                                                    progress.completed %
                                                                    activePlan.days.length
                                                                )

                                                                    ? "NEXT"
                                                                    : ""
                                                            }
                                                        </span>

                                                    </div>
                                                `
                                            )
                                            .join("")

                                        : `
                                            <div class="empty-message">
                                                No workout days yet.
                                            </div>
                                        `
                                }

                            </div>

                        </article>

                    </section>


                </div>
            `;
        };
})();
