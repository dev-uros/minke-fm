import {computed, ref} from "vue";

/**
 * Pauses the radio after a while, fading it out over the last half minute so
 * falling asleep is not interrupted by a hard cut to silence.
 *
 * The fade is a separate factor, not a change to the volume setting: the
 * setting is remembered between runs, and a timer that ended at zero must not
 * leave the next start silent. Whoever drives the engine multiplies the two.
 */

/** What each press of the shortcut moves to, in minutes; past the last is off. */
const STEPS = [15, 30, 60, 90];
const FADE_MS = 30_000;
/** Short enough that the fade sounds smooth rather than stepped. */
const TICK_MS = 250;

export function useSleepTimer(pause: () => void) {
    /** Index into STEPS, or -1 while off. */
    const step = ref(-1);
    const endsAt = ref<number | null>(null);
    const now = ref(Date.now());
    /** 1 until the fade starts, then down to 0 as the timer runs out. */
    const fade = ref(1);
    let ticker: ReturnType<typeof setInterval> | undefined;

    /**
     * Time left, for display: whole minutes, rounded up so it never reads "0
     * min", then a seconds countdown for the last minute - which is when the
     * fade starts and the listener wants to know why it is getting quiet.
     */
    const timeLeft = computed(() => {
        if (endsAt.value === null) return null;
        const seconds = Math.max(0, Math.ceil((endsAt.value - now.value) / 1000));
        if (seconds > 60) return `${Math.ceil(seconds / 60)} min`;
        return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    });

    const stopTicking = () => {
        clearInterval(ticker);
        ticker = undefined;
    };

    const cancel = () => {
        stopTicking();
        step.value = -1;
        endsAt.value = null;
        fade.value = 1;
    };

    const tick = () => {
        now.value = Date.now();
        if (endsAt.value === null) return;

        const left = endsAt.value - now.value;
        if (left <= 0) {
            pause();
            cancel();
            return;
        }
        fade.value = Math.min(1, left / FADE_MS);
    };

    /** Moves to the next length, or off after the longest. Returns what it is now. */
    const cycle = (): number | null => {
        const next = step.value + 1;
        if (next >= STEPS.length) {
            cancel();
            return null;
        }

        step.value = next;
        endsAt.value = Date.now() + STEPS[next] * 60_000;
        now.value = Date.now();
        // A fade already under way is undone by choosing a longer time.
        fade.value = 1;
        if (!ticker) ticker = setInterval(tick, TICK_MS);
        return STEPS[next];
    };

    /**
     * Someone touched the app while it was fading out, so they are not asleep:
     * call the timer off and bring the sound back. Before the fade starts the
     * timer stays - setting it and then picking a station is the normal order.
     * Returns whether it did anything.
     */
    const wake = (): boolean => {
        if (endsAt.value === null || fade.value >= 1) return false;
        cancel();
        return true;
    };

    const dispose = () => stopTicking();

    return {timeLeft, fade, cycle, cancel, wake, dispose};
}
