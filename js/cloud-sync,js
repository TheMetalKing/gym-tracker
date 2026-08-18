(function () {
    "use strict";

    const SUPABASE_URL = "https://kkafefnjiibllrtqzsda.supabase.co";
    const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_MydEextXNa-Mp-59N_CD_A_t0kTHf26";
    const SYNC_META_KEY = "metalsGymTrackerSyncV1";

    let supabaseClient = null;
    let currentSession = null;
    let initializationStarted = false;
    let initializationPromise = null;

    function createClientId() {
        if (window.crypto?.randomUUID) return window.crypto.randomUUID();
        return `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function loadSyncMeta() {
        try {
            const parsed = JSON.parse(localStorage.getItem(SYNC_META_KEY) || "{}");
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                throw new Error("Invalid sync metadata.");
            }

            parsed.clientId ||= createClientId();
            parsed.userId ??= null;
            parsed.cloudRevision ??= null;
            parsed.lastSyncedAt ??= null;
            parsed.lastAuthEventAt ??= null;
            parsed.pendingSync ??= false;
            parsed.syncEnabled = false;
            return parsed;
        } catch (error) {
            return {
                clientId: createClientId(),
                userId: null,
                cloudRevision: null,
                lastSyncedAt: null,
                lastAuthEventAt: null,
                pendingSync: false,
                syncEnabled: false
            };
        }
    }

    function saveSyncMeta(meta) {
        localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
    }

    let syncMeta = loadSyncMeta();
    saveSyncMeta(syncMeta);

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function setCloudStatus(message, isError = false) {
        const element = document.getElementById("cloudAuthStatus");
        if (!element) return;
        element.textContent = message || "";
        element.classList.toggle("error", isError);
    }

    function getSupabaseCreateClient() {
        return window.supabase?.createClient || window.supabaseJs?.createClient || null;
    }

    async function waitForSupabaseCreateClient() {
        const existing = getSupabaseCreateClient();
        if (existing) return existing;

        for (let attempt = 0; attempt < 20; attempt += 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
            const createClient = getSupabaseCreateClient();
            if (createClient) return createClient;
        }

        const module = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
        if (module?.createClient) return module.createClient;

        throw new Error("Supabase library did not load.");
    }

    async function ensureSupabaseClient() {
        if (supabaseClient) return supabaseClient;
        await initializeCloudAuth();
        return supabaseClient;
    }

    function getRedirectUrl() {
        return window.location.origin + window.location.pathname;
    }

    function renderCloudAccount(session = currentSession) {
        currentSession = session || null;
        const user = currentSession?.user || null;
        const signedIn = Boolean(user);
        const authForm = document.getElementById("cloudAuthForm");
        const userPanel = document.getElementById("cloudUserPanel");

        if (authForm) authForm.style.display = signedIn ? "none" : "grid";
        if (userPanel) userPanel.style.display = signedIn ? "block" : "none";

        setText("storagePillText", "Saved on this device");
        setText(
            "cloudAccountStatus",
            signedIn
                ? `${user.email || "Signed in"}\nCloud sync is not enabled yet.`
                : "Sign in to prepare cloud sync. Tracker data stays local in Phase 1."
        );
    }

    function getAuthFields() {
        const email = document.getElementById("cloudEmail")?.value.trim() || "";
        const password = document.getElementById("cloudPassword")?.value || "";
        return { email, password };
    }

    function validateEmail(email) {
        return email.includes("@") && email.includes(".");
    }

    async function signInFromHeader() {
        await ensureSupabaseClient();
        if (!supabaseClient) return setCloudStatus("Supabase client is unavailable.", true);
        const { email, password } = getAuthFields();
        if (!validateEmail(email) || !password) {
            return setCloudStatus("Enter your email and password.", true);
        }

        setCloudStatus("Signing in...");
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) return setCloudStatus(error.message, true);
        setCloudStatus("Signed in. Cloud sync is not enabled yet.");
    }

    async function signUpFromHeader() {
        await ensureSupabaseClient();
        if (!supabaseClient) return setCloudStatus("Supabase client is unavailable.", true);
        const { email, password } = getAuthFields();
        if (!validateEmail(email) || password.length < 6) {
            return setCloudStatus("Enter an email and a password of at least 6 characters.", true);
        }

        setCloudStatus("Creating account...");
        const { error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: getRedirectUrl() }
        });
        if (error) return setCloudStatus(error.message, true);
        setCloudStatus("Account created. Check your email if confirmation is enabled.");
    }

    async function resetPasswordFromHeader() {
        await ensureSupabaseClient();
        if (!supabaseClient) return setCloudStatus("Supabase client is unavailable.", true);
        const { email } = getAuthFields();
        if (!validateEmail(email)) {
            return setCloudStatus("Enter your email address first.", true);
        }

        setCloudStatus("Sending reset email...");
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: getRedirectUrl()
        });
        if (error) return setCloudStatus(error.message, true);
        setCloudStatus("Password reset email sent.");
    }

    async function signOutFromHeader() {
        await ensureSupabaseClient();
        if (!supabaseClient) return setCloudStatus("Supabase client is unavailable.", true);
        setCloudStatus("Signing out...");
        const { error } = await supabaseClient.auth.signOut({ scope: "local" });
        if (error) return setCloudStatus(error.message, true);
        setCloudStatus("Signed out. Tracker data remains saved on this device.");
    }

    async function initializeCloudAuth() {
        if (initializationPromise) return initializationPromise;
        initializationStarted = true;

        initializationPromise = (async () => {
            renderCloudAccount(null);
            setCloudStatus("Connecting account service...");

            let createClient;
            try {
                createClient = await waitForSupabaseCreateClient();
            } catch (error) {
                console.error("Supabase library unavailable:", error);
                setCloudStatus("Supabase library did not load. Local tracker still works.", true);
                initializationStarted = false;
                initializationPromise = null;
                return;
            }

            supabaseClient = createClient(
                SUPABASE_URL,
                SUPABASE_PUBLISHABLE_KEY,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    }
                }
            );

            const { data, error } = await supabaseClient.auth.getSession();
            if (error) setCloudStatus(error.message, true);
            else setCloudStatus("");

            currentSession = data?.session || null;
            syncMeta.userId = currentSession?.user?.id || null;
            syncMeta.lastAuthEventAt = new Date().toISOString();
            syncMeta.pendingSync = false;
            syncMeta.syncEnabled = false;
            saveSyncMeta(syncMeta);
            renderCloudAccount(currentSession);

            supabaseClient.auth.onAuthStateChange((event, session) => {
                currentSession = session || null;
                syncMeta.userId = currentSession?.user?.id || null;
                syncMeta.lastAuthEventAt = new Date().toISOString();
                syncMeta.pendingSync = false;
                syncMeta.syncEnabled = false;
                saveSyncMeta(syncMeta);
                renderCloudAccount(currentSession);

                if (event === "SIGNED_OUT") {
                    setCloudStatus("Signed out. Tracker data remains saved on this device.");
                }
            });
        })();

        return initializationPromise;
    }

    window.cloudSignInFromHeader = signInFromHeader;
    window.cloudSignUpFromHeader = signUpFromHeader;
    window.cloudResetPasswordFromHeader = resetPasswordFromHeader;
    window.cloudSignOutFromHeader = signOutFromHeader;
    window.gymTrackerCloud = {
        getClient: () => supabaseClient,
        getSession: () => currentSession,
        getSyncMeta: () => structuredClone(syncMeta),
        isSyncEnabled: () => false
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeCloudAuth);
    } else {
        initializeCloudAuth();
    }
}());
