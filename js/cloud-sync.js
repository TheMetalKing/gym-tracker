(function () {
    "use strict";

    const SUPABASE_URL = "https://kkafefnjiibllrtqzsda.supabase.co";
    const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_MydEextXNa-Mp-59N_CD_A_t0kTHf26";
    const TRACKER_STORAGE_KEY = "metalsGymTrackerDataV1";
    const SYNC_META_KEY = "metalsGymTrackerSyncV1";
    const SYNC_DEBOUNCE_MS = 1200;
    const CLOUD_CHECK_DEBOUNCE_MS = 1500;
    const LOW_FREQUENCY_CHECK_MS = 5 * 60 * 1000;
    const INITIAL_RETRY_DELAY_MS = 5000;
    const MAX_RETRY_DELAY_MS = 60000;

    let supabaseClient = null;
    let currentSession = null;
    let initializationStarted = false;
    let initializationPromise = null;
    let syncTimer = null;
    let retryDelayMs = INITIAL_RETRY_DELAY_MS;
    let syncInFlight = false;
    let cloudCheckTimer = null;
    let cloudCheckInFlight = false;
    let lowFrequencyCheckTimer = null;
    let lastSyncError = "";
    let localChangeVersion = 0;

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
            parsed.lastUserId ??= parsed.userId ?? null;
            parsed.cloudRevision ??= null;
            parsed.lastSyncedAt ??= null;
            parsed.lastAuthEventAt ??= null;
            parsed.lastCloudCheckedAt ??= null;
            parsed.lastKnownCloudRevision ??= parsed.cloudRevision ?? null;
            parsed.pendingSync ??= false;
            parsed.conflict ??= null;
            parsed.cloudReady ??= false;
            parsed.syncEnabled = Boolean(
                parsed.syncEnabled ||
                (parsed.cloudReady && parsed.cloudRevision !== null && !parsed.conflict)
            );
            return parsed;
        } catch (error) {
            return {
                clientId: createClientId(),
                userId: null,
                lastUserId: null,
                cloudRevision: null,
                lastSyncedAt: null,
                lastAuthEventAt: null,
                lastCloudCheckedAt: null,
                lastKnownCloudRevision: null,
                pendingSync: false,
                conflict: null,
                cloudReady: false,
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

    function setStorageStatus(label, state = "local") {
        setText("storagePillText", label);
        const pill = document.querySelector(".modern-storage-pill");
        if (!pill) return;
        pill.classList.remove(
            "sync-state-local",
            "sync-state-pending",
            "sync-state-synced",
            "sync-state-conflict",
            "sync-state-offline",
            "sync-state-checking",
            "sync-state-newer"
        );
        pill.classList.add(`sync-state-${state}`);
    }

    function isBrowserOnline() {
        return navigator.onLine !== false;
    }

    function isBackgroundSyncReady() {
        return Boolean(
            currentSession?.user &&
            syncMeta.cloudReady &&
            syncMeta.syncEnabled &&
            syncMeta.cloudRevision !== null &&
            !syncMeta.conflict
        );
    }

    function renderSyncStatus() {
        if (syncMeta.conflict) {
            setStorageStatus("Sync conflict", "conflict");
            return;
        }

        if (!currentSession?.user || !syncMeta.cloudReady || !syncMeta.syncEnabled) {
            setStorageStatus("Saved on this device", "local");
            return;
        }

        if (cloudCheckInFlight) {
            setStorageStatus("Checking cloud...", "checking");
            return;
        }

        if (!syncMeta.lastCloudCheckedAt) {
            setStorageStatus("Checking cloud...", "checking");
            return;
        }

        if (!isBrowserOnline() && syncMeta.pendingSync) {
            setStorageStatus("Offline - saved locally", "offline");
            return;
        }

        if (syncMeta.lastKnownCloudRevision > syncMeta.cloudRevision) {
            setStorageStatus("Newer cloud data available", "newer");
            return;
        }

        if (syncMeta.pendingSync || syncInFlight) {
            setStorageStatus("Sync pending", "pending");
            return;
        }

        setStorageStatus("Cloud synced", "synced");
    }

    function setFirstSyncPanel(html = "") {
        const element = document.getElementById("cloudSyncDecisionPanel");
        if (!element) return;
        element.innerHTML = html;
        element.classList.toggle("open", Boolean(html));
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
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
        const firstSyncButton = document.getElementById("cloudFirstSyncButton");

        if (authForm) authForm.style.display = signedIn ? "none" : "grid";
        if (userPanel) userPanel.style.display = signedIn ? "block" : "none";
        if (!signedIn) setFirstSyncPanel("");

        const cloudReady = Boolean(syncMeta.cloudReady && syncMeta.cloudRevision !== null);
        const conflict = Boolean(syncMeta.conflict);
        if (firstSyncButton) {
            firstSyncButton.style.display = signedIn && (!cloudReady || conflict) ? "block" : "none";
            firstSyncButton.textContent = conflict ? "Resolve sync conflict" : "Set up cloud sync";
        }

        renderSyncStatus();
        setText(
            "cloudAccountStatus",
            signedIn
                ? `${user.email || "Signed in"}\n${getAccountSyncStatusText()}`
                : "Sign in to prepare cloud sync. Tracker data stays local in Phase 1."
        );
    }

    function formatSyncTime(value) {
        if (!value) return "Never";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleString([], {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function getAccountSyncStatusText() {
        if (syncMeta.conflict) {
            return `Sync conflict\n${syncMeta.conflict.message || "Choose which tracker to keep."}`;
        }
        if (!syncMeta.cloudReady || !syncMeta.syncEnabled) return "Cloud setup required.";
        if (cloudCheckInFlight) return "Checking cloud...";
        if (!syncMeta.lastCloudCheckedAt) return "Checking cloud...";
        if (syncMeta.lastKnownCloudRevision > syncMeta.cloudRevision) {
            return `Newer cloud data available\nRevision: ${syncMeta.lastKnownCloudRevision}`;
        }
        if (!isBrowserOnline() && syncMeta.pendingSync) return "Offline - saved locally\nSync pending";
        if (syncMeta.pendingSync || syncInFlight) return "Saved locally\nSync pending";
        return `Cloud synced\nLast sync: ${formatSyncTime(syncMeta.lastSyncedAt)}\nRevision: ${syncMeta.cloudRevision ?? "None"}\nLast checked: ${formatSyncTime(syncMeta.lastCloudCheckedAt)}`;
    }

    function cloneValue(value) {
        return typeof structuredClone === "function"
            ? structuredClone(value)
            : JSON.parse(JSON.stringify(value));
    }

    function parseStoredLocalTracker() {
        const raw = localStorage.getItem(TRACKER_STORAGE_KEY);
        if (!raw) return { exists: false, data: null, error: "" };

        try {
            return { exists: true, data: JSON.parse(raw), error: "" };
        } catch (error) {
            return { exists: true, data: null, error: "Local tracker data is not valid JSON." };
        }
    }

    function countExerciseIdsInPlans(data) {
        const plans = Array.isArray(data?.plans) ? data.plans : [];
        const days = Array.isArray(data?.days) ? data.days : [];
        const planDayIds = plans.flatMap(plan => Array.isArray(plan?.days) ? plan.days : []);
        return [...days, ...planDayIds]
            .reduce((total, day) => total + (Array.isArray(day?.exerciseIds) ? day.exerciseIds.length : 0), 0);
    }

    function isNonDefaultPlan(plan) {
        if (!plan || typeof plan !== "object") return false;
        if (plan.name && plan.name !== "My Training Plan") return true;
        if (Number(plan.durationWeeks) && Number(plan.durationWeeks) !== 8) return true;
        return Array.isArray(plan.days)
            && plan.days.some(day => Array.isArray(day?.exerciseIds) && day.exerciseIds.length);
    }

    function summarizeTrackerData(data, exists = true) {
        const workouts = Array.isArray(data?.workouts) ? data.workouts.length : 0;
        const bodyEntries = Array.isArray(data?.bodyEntries) ? data.bodyEntries.length : 0;
        const exercises = Array.isArray(data?.exercises) ? data.exercises.length : 0;
        const planRuns = Array.isArray(data?.planRuns) ? data.planRuns.length : 0;
        const plans = Array.isArray(data?.plans) ? data.plans : [];
        const plannedExerciseLinks = countExerciseIdsInPlans(data);
        const customPlans = plans.filter(isNonDefaultPlan).length;

        return {
            exists,
            workouts,
            bodyEntries,
            exercises,
            planRuns,
            plans: plans.length,
            plannedExerciseLinks,
            meaningful: Boolean(
                exists &&
                (workouts || bodyEntries || exercises || planRuns || plannedExerciseLinks || customPlans || plans.length > 1)
            )
        };
    }

    function renderSummaryRows(localSummary, cloudSummary, cloudRow) {
        return `
            <div class="cloud-sync-comparison">
                <div>
                    <strong>Device</strong>
                    <span>${localSummary.workouts} workouts</span>
                    <span>${localSummary.bodyEntries} body entries</span>
                </div>
                <div>
                    <strong>Cloud</strong>
                    <span>${cloudSummary.workouts} workouts</span>
                    <span>${cloudSummary.bodyEntries} body entries</span>
                </div>
            </div>
            <div class="cloud-sync-meta">
                <span>Last local sync: ${escapeHtml(syncMeta.lastSyncedAt || "Never")}</span>
                <span>Cloud updated: ${escapeHtml(cloudRow?.updated_at || "Not yet")}</span>
                <span>Cloud revision: ${escapeHtml(cloudRow?.revision ?? "None")}</span>
            </div>
        `;
    }

    function getLocalTrackerForCloud() {
        if (typeof getTrackerDataSnapshot === "function") return getTrackerDataSnapshot();
        const parsed = parseStoredLocalTracker();
        if (parsed.error) throw new Error(parsed.error);
        return parsed.data;
    }

    function prepareCloudTrackerData(data) {
        if (typeof prepareTrackerDataForSafeRestore === "function") {
            return prepareTrackerDataForSafeRestore(data);
        }

        if (typeof validateTrackerBackupShape !== "function" || typeof migrateTrackerDataObject !== "function") {
            return { error: "Local tracker validation helpers are unavailable.", data: null };
        }

        const validationError = validateTrackerBackupShape(data);
        if (validationError) return { error: validationError, data: null };

        try {
            return { error: "", data: migrateTrackerDataObject(cloneValue(data)) };
        } catch (error) {
            console.error("Unable to prepare cloud tracker data:", error);
            return { error: "Cloud tracker data could not be prepared safely.", data: null };
        }
    }

    async function getCloudTrackerRow() {
        await ensureSupabaseClient();
        if (!supabaseClient || !currentSession?.user) {
            throw new Error("Sign in before setting up cloud sync.");
        }

        const { data, error } = await supabaseClient
            .from("user_tracker_data")
            .select("tracker_data, revision, updated_at")
            .eq("user_id", currentSession.user.id)
            .maybeSingle();

        if (error) throw error;
        return data || null;
    }

    function normalizeRpcResult(data) {
        const result = Array.isArray(data) ? data[0] : data;
        if (typeof result === "number") return { ok: true, revision: result };
        if (!result || typeof result !== "object") return { ok: true, revision: null };

        if (result.saved === false) {
            return {
                ok: false,
                error: result.error || "Cloud revision changed before save.",
                revision: result.revision ?? result.current_revision ?? null
            };
        }

        if (result.success === false || result.ok === false) {
            return {
                ok: true,
                syncError: result.error || "Cloud save did not complete.",
                error: result.error || "Cloud data changed before save.",
                revision: result.revision ?? result.current_revision ?? null
            };
        }

        return {
            ok: true,
            revision: result.revision ?? result.new_revision ?? result.cloud_revision ?? result.current_revision ?? null,
            updatedAt: result.updated_at ?? result.updatedAt ?? null
        };
    }

    async function callRevisionSaveRpc(trackerDataToSave, expectedRevision) {
        return supabaseClient.rpc("save_tracker_data_if_revision", {
            expected_revision: expectedRevision,
            new_tracker_data: trackerDataToSave,
            client_id: syncMeta.clientId
        });
    }

    function updateSyncMetaAfterSuccess(row, keepPending = false) {
        syncMeta.userId = currentSession?.user?.id || null;
        syncMeta.cloudRevision = row?.revision ?? syncMeta.cloudRevision ?? null;
        syncMeta.lastSyncedAt = new Date().toISOString();
        syncMeta.pendingSync = Boolean(keepPending);
        syncMeta.conflict = null;
        syncMeta.cloudReady = syncMeta.cloudRevision !== null;
        syncMeta.syncEnabled = syncMeta.cloudReady;
        syncMeta.lastKnownCloudRevision = syncMeta.cloudRevision;
        syncMeta.lastCloudCheckedAt = new Date().toISOString();
        retryDelayMs = INITIAL_RETRY_DELAY_MS;
        lastSyncError = "";
        saveSyncMeta(syncMeta);
        renderCloudAccount(currentSession);
    }

    function applySessionToSyncMeta(session) {
        const nextUserId = session?.user?.id || null;
        if (syncMeta.lastUserId && nextUserId && syncMeta.lastUserId !== nextUserId) {
            syncMeta.cloudRevision = null;
            syncMeta.lastSyncedAt = null;
            syncMeta.pendingSync = false;
            syncMeta.conflict = null;
            syncMeta.cloudReady = false;
            syncMeta.syncEnabled = false;
        }

        if (!nextUserId) {
            syncMeta.syncEnabled = false;
            clearScheduledSync();
            clearCloudCheckTimers();
        } else if (syncMeta.cloudReady && syncMeta.cloudRevision !== null && !syncMeta.conflict) {
            syncMeta.syncEnabled = true;
            syncMeta.lastUserId = nextUserId;
        }

        syncMeta.userId = nextUserId;
        if (nextUserId) syncMeta.lastUserId = nextUserId;
        syncMeta.lastAuthEventAt = new Date().toISOString();
        saveSyncMeta(syncMeta);
    }

    function markSyncConflict(message) {
        syncMeta.pendingSync = true;
        syncMeta.conflict = {
            message,
            at: new Date().toISOString()
        };
        syncMeta.syncEnabled = false;
        saveSyncMeta(syncMeta);
        renderCloudAccount(currentSession);
    }

    function isFalseRpcConflictState(conflict) {
        return /could not find|schema cache|function/i.test(conflict?.message || "");
    }

    function clearFalseRpcConflictIfNeeded() {
        if (!isFalseRpcConflictState(syncMeta.conflict)) return;
        syncMeta.conflict = null;
        syncMeta.pendingSync = true;
        syncMeta.syncEnabled = Boolean(currentSession?.user && syncMeta.cloudReady && syncMeta.cloudRevision !== null);
        saveSyncMeta(syncMeta);
    }

    function clearScheduledSync() {
        if (syncTimer) {
            clearTimeout(syncTimer);
            syncTimer = null;
        }
    }

    function scheduleCloudSync(delay = SYNC_DEBOUNCE_MS) {
        if (!isBackgroundSyncReady()) {
            renderCloudAccount(currentSession);
            return;
        }

        clearScheduledSync();
        syncTimer = setTimeout(() => {
            syncTimer = null;
            performQueuedCloudSync();
        }, delay);
        renderCloudAccount(currentSession);
    }

    function markPendingSync(reason = "local-save") {
        if (!currentSession?.user || !syncMeta.cloudReady || syncMeta.cloudRevision === null) {
            renderCloudAccount(currentSession);
            return;
        }

        syncMeta.pendingSync = true;
        syncMeta.lastLocalChangeAt = new Date().toISOString();
        syncMeta.lastLocalChangeReason = reason;
        syncMeta.syncEnabled = !syncMeta.conflict;
        localChangeVersion += 1;
        saveSyncMeta(syncMeta);

        if (!isBrowserOnline()) {
            renderCloudAccount(currentSession);
            return;
        }

        scheduleCloudSync();
    }

    async function performQueuedCloudSync() {
        if (syncInFlight || !syncMeta.pendingSync) return;
        if (!isBackgroundSyncReady()) {
            renderCloudAccount(currentSession);
            return;
        }

        if (!isBrowserOnline()) {
            renderCloudAccount(currentSession);
            return;
        }

        syncInFlight = true;
        const syncStartedAtVersion = localChangeVersion;
        renderCloudAccount(currentSession);

        try {
            const localData = getLocalTrackerForCloud();
            const prepared = prepareCloudTrackerData(localData);
            if (prepared.error) {
                lastSyncError = prepared.error;
                syncMeta.pendingSync = true;
                saveSyncMeta(syncMeta);
                setCloudStatus("Sync stopped: local data could not be validated.", true);
                return;
            }

            const expectedRevision = syncMeta.cloudRevision;
            const { data, error } = await callRevisionSaveRpc(prepared.data, expectedRevision);
            if (error) {
                lastSyncError = error.message || "Cloud sync failed.";
                syncMeta.pendingSync = true;
                saveSyncMeta(syncMeta);
                scheduleRetry();
                setCloudStatus("Saved locally. Cloud sync will retry.");
                return;
            }

            const result = normalizeRpcResult(data);
            if (result.syncError) {
                lastSyncError = result.syncError;
                syncMeta.pendingSync = true;
                saveSyncMeta(syncMeta);
                scheduleRetry();
                setCloudStatus("Saved locally. Cloud sync will retry.");
                return;
            }

            if (!result.ok) {
                markSyncConflict(result.error || "Cloud revision changed before save.");
                setCloudStatus("Sync conflict. Choose which tracker to keep.", true);
                return;
            }

            let latestRow = null;
            try {
                latestRow = await getCloudTrackerRow();
            } catch (error) {
                console.warn("Cloud tracker synced, but latest row could not be re-read:", error);
            }
            const newerLocalChangeQueued = localChangeVersion > syncStartedAtVersion;
            updateSyncMetaAfterSuccess(
                latestRow || { revision: result.revision, updated_at: result.updatedAt },
                newerLocalChangeQueued
            );
            setCloudStatus(newerLocalChangeQueued ? "Saved locally. Sync continuing..." : "Cloud synced.");
            if (newerLocalChangeQueued) scheduleCloudSync(SYNC_DEBOUNCE_MS);
        } catch (error) {
            console.error("Automatic cloud sync failed:", error);
            lastSyncError = error.message || "Cloud sync failed.";
            syncMeta.pendingSync = true;
            saveSyncMeta(syncMeta);
            scheduleRetry();
            setCloudStatus(isBrowserOnline() ? "Saved locally. Cloud sync will retry." : "Offline - saved locally.");
        } finally {
            syncInFlight = false;
            renderCloudAccount(currentSession);
        }
    }

    function scheduleRetry() {
        if (!isBackgroundSyncReady()) return;
        if (!isBrowserOnline()) {
            renderCloudAccount(currentSession);
            return;
        }

        const delay = retryDelayMs;
        retryDelayMs = Math.min(retryDelayMs * 2, MAX_RETRY_DELAY_MS);
        scheduleCloudSync(delay);
    }

    function hasUnsyncedLocalChanges() {
        return Boolean(syncMeta.pendingSync || syncMeta.conflict);
    }

    function updateCloudCheckMeta(row) {
        syncMeta.lastCloudCheckedAt = new Date().toISOString();
        syncMeta.lastKnownCloudRevision = row?.revision ?? null;
        saveSyncMeta(syncMeta);
    }

    function clearCloudCheckTimers() {
        if (cloudCheckTimer) {
            clearTimeout(cloudCheckTimer);
            cloudCheckTimer = null;
        }
        if (lowFrequencyCheckTimer) {
            clearTimeout(lowFrequencyCheckTimer);
            lowFrequencyCheckTimer = null;
        }
    }

    function scheduleCloudRevisionCheck(delay = CLOUD_CHECK_DEBOUNCE_MS) {
        if (!isBackgroundSyncReady()) {
            renderCloudAccount(currentSession);
            return;
        }
        if (!isBrowserOnline()) {
            renderCloudAccount(currentSession);
            return;
        }

        if (cloudCheckTimer) clearTimeout(cloudCheckTimer);
        cloudCheckTimer = setTimeout(() => {
            cloudCheckTimer = null;
            checkCloudRevisionAndPullIfSafe("scheduled");
        }, delay);
    }

    function scheduleLowFrequencyCloudCheck() {
        if (lowFrequencyCheckTimer) clearTimeout(lowFrequencyCheckTimer);
        if (!isBackgroundSyncReady()) return;
        lowFrequencyCheckTimer = setTimeout(() => {
            lowFrequencyCheckTimer = null;
            checkCloudRevisionAndPullIfSafe("interval");
            scheduleLowFrequencyCloudCheck();
        }, LOW_FREQUENCY_CHECK_MS);
    }

    function applyCloudPull(row) {
        if (!row?.tracker_data) {
            return { ok: false, error: "Cloud tracker data is missing." };
        }

        const prepared = prepareCloudTrackerData(row.tracker_data);
        if (prepared.error) {
            return { ok: false, error: prepared.error };
        }

        if (typeof replaceLocalTrackerDataFromCloudPull === "function") {
            return replaceLocalTrackerDataFromCloudPull(prepared.data);
        }

        return { ok: false, error: "Local cloud-pull helper is unavailable." };
    }

    async function checkCloudRevisionAndPullIfSafe(reason = "check") {
        if (cloudCheckInFlight) return;
        if (!isBackgroundSyncReady()) {
            renderCloudAccount(currentSession);
            return;
        }
        if (!isBrowserOnline()) {
            renderCloudAccount(currentSession);
            return;
        }

        cloudCheckInFlight = true;
        renderCloudAccount(currentSession);

        try {
            const row = await getCloudTrackerRow();
            updateCloudCheckMeta(row);

            const cloudRevision = Number(row?.revision ?? -1);
            const localRevision = Number(syncMeta.cloudRevision ?? -1);

            if (!row || cloudRevision < 0) {
                setCloudStatus("Cloud tracker was not found. Local data was not changed.", true);
                return;
            }

            if (cloudRevision === localRevision) {
                syncMeta.lastKnownCloudRevision = cloudRevision;
                saveSyncMeta(syncMeta);
                if (!syncMeta.pendingSync) setCloudStatus(reason === "manual" ? "Cloud synced." : "");
                return;
            }

            if (cloudRevision < localRevision) {
                setCloudStatus("Cloud revision is behind this device. Local data was not changed.", true);
                return;
            }

            if (hasUnsyncedLocalChanges()) {
                syncMeta.lastKnownCloudRevision = cloudRevision;
                markSyncConflict("Cloud has a newer revision and this device has unsynced local changes.");
                firstSyncCloudRow = row;
                await openFirstSyncDecision();
                return;
            }

            setCloudStatus("Newer cloud data found. Updating this device...");
            const result = applyCloudPull(row);
            if (!result.ok) {
                lastSyncError = result.error;
                setCloudStatus(`Cloud pull stopped: ${result.error}`, true);
                return;
            }

            updateSyncMetaAfterSuccess(row);
            syncMeta.lastCloudCheckedAt = new Date().toISOString();
            syncMeta.lastKnownCloudRevision = cloudRevision;
            saveSyncMeta(syncMeta);
            localChangeVersion = 0;
            setCloudStatus("Cloud data loaded on this device.");
        } catch (error) {
            console.error("Cloud revision check failed:", error);
            lastSyncError = error.message || "Cloud check failed.";
            setCloudStatus(isBrowserOnline() ? "Cloud check failed. Will retry later." : "Offline - saved locally.", true);
        } finally {
            cloudCheckInFlight = false;
            renderCloudAccount(currentSession);
        }
    }

    async function syncNowFromHeader() {
        if (!currentSession?.user) {
            setCloudStatus("Sign in before syncing.", true);
            return;
        }

        if (!syncMeta.cloudReady || syncMeta.cloudRevision === null) {
            await openFirstSyncDecision();
            return;
        }

        if (syncMeta.conflict) {
            await openFirstSyncDecision();
            return;
        }

        if (syncMeta.pendingSync) {
            await performQueuedCloudSync();
        }

        if (!syncMeta.pendingSync && !syncMeta.conflict) {
            await checkCloudRevisionAndPullIfSafe("manual");
        }
    }

    async function uploadLocalTrackerToCloud(expectedRevision) {
        const localData = getLocalTrackerForCloud();
        const prepared = prepareCloudTrackerData(localData);
        if (prepared.error) {
            setCloudStatus(`Upload stopped: ${prepared.error}`, true);
            return;
        }

        setCloudStatus("Uploading this device to cloud...");
        const { data, error } = await callRevisionSaveRpc(prepared.data, expectedRevision);
        if (error) {
            setCloudStatus(`Upload stopped: ${error.message}`, true);
            await openFirstSyncDecision();
            return;
        }

        const result = normalizeRpcResult(data);
        if (result.syncError) {
            setCloudStatus(`Upload stopped: ${result.syncError}`, true);
            await openFirstSyncDecision();
            return;
        }

        if (!result.ok) {
            markSyncConflict(result.error);
            setCloudStatus("Cloud changed before save. Review the choice again.", true);
            await openFirstSyncDecision();
            return;
        }

        let latestRow = null;
        try {
            latestRow = await getCloudTrackerRow();
        } catch (error) {
            console.warn("Cloud tracker saved, but latest row could not be re-read:", error);
        }
        updateSyncMetaAfterSuccess(latestRow || { revision: result.revision, updated_at: result.updatedAt });
        setFirstSyncPanel(`<div class="cloud-sync-card"><strong>Cloud ready</strong><p>This device's tracker is now stored in your account. Future local saves will sync in the background.</p></div>`);
        setCloudStatus("Cloud ready.");
    }

    async function useCloudTrackerOnDevice(cloudRow) {
        if (!cloudRow?.tracker_data) {
            setCloudStatus("No cloud tracker data is available to use.", true);
            return;
        }

        const prepared = prepareCloudTrackerData(cloudRow.tracker_data);
        if (prepared.error) {
            setCloudStatus(`Cloud data was not used: ${prepared.error}`, true);
            return;
        }

        if (!confirm("Use cloud tracker data on this device?\n\nA safety backup of the current local tracker will download first. Local tracker data will only be replaced if validation succeeds.")) {
            setCloudStatus("Cloud restore cancelled. Local data was not changed.");
            return;
        }

        let result;
        if (typeof replaceLocalTrackerDataSafely === "function") {
            result = replaceLocalTrackerDataSafely(prepared.data, "cloud tracker");
        } else {
            result = { ok: false, error: "Local safe restore helper is unavailable." };
        }

        if (!result.ok) {
            setCloudStatus(result.error || "Cloud restore failed. Local data was not changed.", true);
            return;
        }

        updateSyncMetaAfterSuccess(cloudRow);
        setFirstSyncPanel(`<div class="cloud-sync-card"><strong>Cloud ready</strong><p>Cloud tracker data is now on this device. Future local saves will sync in the background.</p></div>`);
        setCloudStatus("Cloud tracker loaded on this device.");
    }

    function exportBothTrackers(cloudRow) {
        const stamp = new Date().toISOString().slice(0, 10);
        try {
            if (typeof downloadJsonFile !== "function") throw new Error("Backup download helper is unavailable.");
            downloadJsonFile(getLocalTrackerForCloud(), `metals-gym-tracker-local-before-sync-${stamp}.json`);
            if (cloudRow?.tracker_data) {
                downloadJsonFile(cloudRow.tracker_data, `metals-gym-tracker-cloud-before-sync-${stamp}.json`);
            }
            setCloudStatus("Local and cloud backups exported. Choose how to continue when ready.");
        } catch (error) {
            console.error("Unable to export both trackers:", error);
            setCloudStatus("Could not export both trackers. No data was changed.", true);
        }
    }

    function renderFirstSyncDecision(localSummary, cloudSummary, cloudRow) {
        const rows = renderSummaryRows(localSummary, cloudSummary, cloudRow);
        const cloudRevision = cloudRow?.revision ?? null;

        if (localSummary.meaningful && !cloudSummary.meaningful) {
            setFirstSyncPanel(`
                <div class="cloud-sync-card">
                    <strong>Your account has no cloud tracker yet.</strong>
                    <p>Upload this device's tracker to start cloud setup.</p>
                    ${rows}
                    <div class="cloud-sync-actions">
                        <button class="button small" type="button" onclick="cloudUploadLocalFirstSync(${cloudRevision === null ? "null" : Number(cloudRevision)})">Upload this device to cloud</button>
                        <button class="button secondary small" type="button" onclick="cloudCancelFirstSync()">Cancel</button>
                    </div>
                </div>
            `);
            return;
        }

        if (!localSummary.meaningful && cloudSummary.meaningful) {
            setFirstSyncPanel(`
                <div class="cloud-sync-card">
                    <strong>Cloud tracker found.</strong>
                    <p>Use your cloud tracker on this device.</p>
                    ${rows}
                    <div class="cloud-sync-actions">
                        <button class="button small" type="button" onclick="cloudUseCloudFirstSync()">Use cloud data on this device</button>
                        <button class="button secondary small" type="button" onclick="cloudCancelFirstSync()">Cancel</button>
                    </div>
                </div>
            `);
            return;
        }

        if (localSummary.meaningful && cloudSummary.meaningful) {
            setFirstSyncPanel(`
                <div class="cloud-sync-card">
                    <strong>Choose which tracker to keep.</strong>
                    <p>Both this device and your account contain tracker data. Nothing will be picked automatically.</p>
                    ${rows}
                    <div class="cloud-sync-actions">
                        <button class="button small" type="button" onclick="cloudUploadLocalFirstSync(${cloudRevision === null ? "null" : Number(cloudRevision)})">Keep this device and upload it</button>
                        <button class="button secondary small" type="button" onclick="cloudUseCloudFirstSync()">Use cloud data</button>
                        <button class="button secondary small" type="button" onclick="cloudExportBothFirstSync()">Export both first</button>
                        <button class="button secondary small" type="button" onclick="cloudCancelFirstSync()">Cancel</button>
                    </div>
                </div>
            `);
            return;
        }

        setFirstSyncPanel(`
            <div class="cloud-sync-card">
                <strong>No tracker data found yet.</strong>
                <p>Log workouts locally first, or upload the current empty tracker if you want to initialise cloud storage.</p>
                ${rows}
                <div class="cloud-sync-actions">
                    <button class="button small" type="button" onclick="cloudUploadLocalFirstSync(${cloudRevision === null ? "null" : Number(cloudRevision)})">Upload this device to cloud</button>
                    <button class="button secondary small" type="button" onclick="cloudCancelFirstSync()">Cancel</button>
                </div>
            </div>
        `);
    }

    let firstSyncCloudRow = null;

    async function openFirstSyncDecision() {
        try {
            setCloudStatus("Checking local and cloud tracker data...");
            const localParsed = parseStoredLocalTracker();
            if (localParsed.error) {
                setCloudStatus(`${localParsed.error} Cloud setup stopped.`, true);
                return;
            }

            const cloudRow = await getCloudTrackerRow();
            firstSyncCloudRow = cloudRow;
            const localSummary = summarizeTrackerData(localParsed.data, localParsed.exists);

            if (cloudRow?.tracker_data) {
                const preparedCloud = prepareCloudTrackerData(cloudRow.tracker_data);
                if (preparedCloud.error) {
                    setFirstSyncPanel(`
                        <div class="cloud-sync-card">
                            <strong>Cloud tracker could not be validated.</strong>
                            <p>${escapeHtml(preparedCloud.error)} No local or cloud data was changed.</p>
                            <div class="cloud-sync-actions">
                                <button class="button secondary small" type="button" onclick="cloudExportBothFirstSync()">Export both first</button>
                                <button class="button secondary small" type="button" onclick="cloudCancelFirstSync()">Cancel</button>
                            </div>
                        </div>
                    `);
                    setCloudStatus("Cloud tracker validation failed. Nothing was changed.", true);
                    if (typeof renderAccountPanel === "function") renderAccountPanel(true);
                    return;
                }
            }

            const cloudSummary = summarizeTrackerData(cloudRow?.tracker_data, Boolean(cloudRow?.tracker_data));

            renderFirstSyncDecision(localSummary, cloudSummary, cloudRow);
            setCloudStatus("");
            if (typeof renderAccountPanel === "function") renderAccountPanel(true);
        } catch (error) {
            console.error("Unable to inspect cloud tracker data:", error);
            setCloudStatus(`Cloud setup could not start: ${error.message || error}`, true);
        }
    }

    function cancelFirstSync() {
        setFirstSyncPanel("");
        setCloudStatus("Cloud setup cancelled. Local tracker data was not changed.");
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
        setCloudStatus(syncMeta.cloudReady ? "Signed in. Checking cloud..." : "Signed in. Cloud setup required.");
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
            applySessionToSyncMeta(currentSession);
            clearFalseRpcConflictIfNeeded();
            renderCloudAccount(currentSession);
            if (syncMeta.pendingSync) scheduleCloudSync(800);
            else scheduleCloudRevisionCheck(1000);
            scheduleLowFrequencyCloudCheck();

            supabaseClient.auth.onAuthStateChange((event, session) => {
                currentSession = session || null;
                applySessionToSyncMeta(currentSession);
                clearFalseRpcConflictIfNeeded();
                renderCloudAccount(currentSession);

                if (event === "SIGNED_OUT") {
                    setCloudStatus("Signed out. Tracker data remains saved on this device.");
                } else if (syncMeta.pendingSync) {
                    scheduleCloudSync(800);
                } else {
                    scheduleCloudRevisionCheck(1000);
                }
                scheduleLowFrequencyCloudCheck();
            });
        })();

        return initializationPromise;
    }

    window.cloudSignInFromHeader = signInFromHeader;
    window.cloudSignUpFromHeader = signUpFromHeader;
    window.cloudResetPasswordFromHeader = resetPasswordFromHeader;
    window.cloudSignOutFromHeader = signOutFromHeader;
    window.cloudOpenFirstSyncFromHeader = openFirstSyncDecision;
    window.cloudUploadLocalFirstSync = uploadLocalTrackerToCloud;
    window.cloudUseCloudFirstSync = async function () {
        try {
            const latestRow = await getCloudTrackerRow();
            firstSyncCloudRow = latestRow;
            await useCloudTrackerOnDevice(latestRow);
        } catch (error) {
            console.error("Unable to use cloud tracker:", error);
            setCloudStatus(`Could not load cloud data: ${error.message || error}`, true);
        }
    };
    window.cloudExportBothFirstSync = function () {
        exportBothTrackers(firstSyncCloudRow);
    };
    window.cloudCancelFirstSync = cancelFirstSync;
    window.cloudSyncNowFromHeader = syncNowFromHeader;
    window.gymTrackerCloud = {
        getClient: () => supabaseClient,
        getSession: () => currentSession,
        getSyncMeta: () => structuredClone(syncMeta),
        handleLocalTrackerSaved: markPendingSync,
        openFirstSyncDecision,
        checkCloudRevision: checkCloudRevisionAndPullIfSafe,
        isCloudReady: () => Boolean(syncMeta.cloudReady && syncMeta.cloudRevision !== null),
        isSyncEnabled: () => isBackgroundSyncReady()
    };

    window.addEventListener("online", () => {
        retryDelayMs = INITIAL_RETRY_DELAY_MS;
        if (syncMeta.pendingSync) scheduleCloudSync(800);
        else scheduleCloudRevisionCheck(800);
        scheduleLowFrequencyCloudCheck();
    });

    window.addEventListener("offline", () => {
        clearScheduledSync();
        clearCloudCheckTimers();
        renderCloudAccount(currentSession);
    });

    window.addEventListener("focus", () => {
        scheduleCloudRevisionCheck(CLOUD_CHECK_DEBOUNCE_MS);
    });

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) scheduleCloudRevisionCheck(CLOUD_CHECK_DEBOUNCE_MS);
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeCloudAuth);
    } else {
        initializeCloudAuth();
    }
}());
