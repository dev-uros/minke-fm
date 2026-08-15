import {ref, Ref} from "vue";

/**
 * `navigator.onLine` only tells us whether an interface is up - it stays true on
 * a wifi network with no route to the internet, and WKWebView does not always
 * fire the online/offline events on macOS. So we treat it as a hint and confirm
 * with a cheap request against the radio-browser API.
 */

const PROBE_ENDPOINTS = [
    'https://de1.api.radio-browser.info/json/stats',
    'https://nl1.api.radio-browser.info/json/stats'
];

const PROBE_TIMEOUT_MS = 4_000;
const OFFLINE_POLL_MS = 5_000;
const FAILURE_DEBOUNCE_MS = 1_000;

export interface Connectivity {
    online: Ref<boolean>;
    checking: Ref<boolean>;
    probe: () => Promise<boolean>;
    reportReachable: () => void;
    reportUnreachable: () => void;
    dispose: () => void;
}

export function useConnectivity(): Connectivity {
    const online = ref(navigator.onLine);
    const checking = ref(false);

    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let failureTimer: ReturnType<typeof setTimeout> | undefined;
    let inFlight: Promise<boolean> | null = null;
    let disposed = false;

    const hit = async (url: string): Promise<boolean> => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
        try {
            const response = await fetch(url, {
                cache: 'no-store',
                signal: controller.signal
            });
            // Always drain or cancel the body. An unread body keeps the socket
            // alive and buffering, which is what leaked memory before.
            await response.body?.cancel();
            return response.ok;
        } catch {
            return false;
        } finally {
            clearTimeout(timeout);
            controller.abort();
        }
    };

    const setOnline = (value: boolean) => {
        online.value = value;
        if (value) {
            stopPolling();
        } else {
            startPolling();
        }
    };

    const probe = async (): Promise<boolean> => {
        if (inFlight) return inFlight;

        checking.value = true;
        inFlight = (async () => {
            for (const endpoint of PROBE_ENDPOINTS) {
                if (await hit(endpoint)) return true;
            }
            return false;
        })();

        try {
            const reachable = await inFlight;
            if (!disposed) setOnline(reachable);
            return reachable;
        } finally {
            inFlight = null;
            checking.value = false;
        }
    };

    function startPolling() {
        if (pollTimer || disposed) return;
        pollTimer = setInterval(() => void probe(), OFFLINE_POLL_MS);
    }

    function stopPolling() {
        if (!pollTimer) return;
        clearInterval(pollTimer);
        pollTimer = undefined;
    }

    /** The player is receiving bytes, so we are online whatever navigator says. */
    const reportReachable = () => {
        if (failureTimer) {
            clearTimeout(failureTimer);
            failureTimer = undefined;
        }
        if (!online.value) setOnline(true);
    };

    /** A stream failed. One failure is not an outage - confirm before flipping. */
    const reportUnreachable = () => {
        if (failureTimer || disposed) return;
        failureTimer = setTimeout(() => {
            failureTimer = undefined;
            void probe();
        }, FAILURE_DEBOUNCE_MS);
    };

    const onOnlineEvent = () => void probe();
    const onOfflineEvent = () => setOnline(false);

    window.addEventListener('online', onOnlineEvent);
    window.addEventListener('offline', onOfflineEvent);

    if (!navigator.onLine) startPolling();

    const dispose = () => {
        disposed = true;
        stopPolling();
        if (failureTimer) clearTimeout(failureTimer);
        window.removeEventListener('online', onOnlineEvent);
        window.removeEventListener('offline', onOfflineEvent);
    };

    return {online, checking, probe, reportReachable, reportUnreachable, dispose};
}
