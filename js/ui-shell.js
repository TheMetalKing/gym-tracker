(function () {
    document.body.classList.add("modern-ui");

    function icon(name) {
        const icons = {
            home: `
                <svg viewBox="0 0 24 24">
                    <path d="M3 11.5 12 4l9 7.5"/>
                    <path d="M5.5 10v10h13V10"/>
                    <path d="M9.5 20v-6h5v6"/>
                </svg>
            `,

            progress: `
                <svg viewBox="0 0 24 24">
                    <path d="M4 18 9 12l4 3 7-9"/>
                    <path d="M4 4v16h16"/>
                </svg>
            `,

            play: `
                <svg viewBox="0 0 24 24">
                    <path
                        d="m9 6 9 6-9 6Z"
                        fill="currentColor"
                        stroke="none"
                    />
                </svg>
            `,

            exercises: `
                <svg viewBox="0 0 24 24">
                    <path d="M4 9v6"/>
                    <path d="M7 7v10"/>
                    <path d="M17 7v10"/>
                    <path d="M20 9v6"/>
                    <path d="M7 12h10"/>
                </svg>
            `,

            more: `
                <svg viewBox="0 0 24 24">
                    <circle
                        cx="5"
                        cy="12"
                        r="1.5"
                        fill="currentColor"
                        stroke="none"
                    />
                    <circle
                        cx="12"
                        cy="12"
                        r="1.5"
                        fill="currentColor"
                        stroke="none"
                    />
                    <circle
                        cx="19"
                        cy="12"
                        r="1.5"
                        fill="currentColor"
                        stroke="none"
                    />
                </svg>
            `
        };

        return icons[name];
    }


    const app = document.querySelector(".app");


    /*
        =====================================================
        MODERN TOP HEADER
        =====================================================
    */

    if (
        app &&
        !document.getElementById("modernTopbar")
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

                    <div class="modern-storage-pill">

                        <span class="modern-storage-text">
                            Saved on this device
                        </span>

                    </div>

                </div>

            </header>
            `
        );
    }


    /*
        =====================================================
        MODERN BOTTOM NAVIGATION
        =====================================================
    */

    if (
        !document.getElementById("modernBottomNav")
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
                    data-modern-page="libraryPage"
                    type="button"
                >

                    ${icon("exercises")}

                    <span>
                        Exercises
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

            </nav>
            `
        );
    }


    /*
        =====================================================
        MODERN PAGE NAVIGATION
        =====================================================
    */

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
                        button.dataset.modernPage === pageId
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


    /*
        =====================================================
        KEEP MODERN HOME REFRESHED
        =====================================================
    */

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


    /*
        =====================================================
        EXERCISE PICKER FILTER EXPANSION
        =====================================================
    */

    const previousToggleExerciseFilter =
        window.toggleExerciseFilter;


    if (
        typeof previousToggleExerciseFilter ===
        "function"
    ) {

        window.toggleExerciseFilter =
            function toggleExerciseFilter(type) {

                previousToggleExerciseFilter(type);


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

                previousClearPickerFilter(type);


                document
                    .querySelector(
                        ".exercise-picker-modal"
                    )
                    ?.classList.add(
                        "filter-expanded"
                    );

            };

    }


    /*
        =====================================================
        INITIAL RENDER
        =====================================================
    */

    renderAll();

    modernNavigate(
        "dashboardPage"
    );

})();
