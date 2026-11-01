<script setup lang="ts">
/**
 * The few icons the skinned players share. Filled glyphs for the transport,
 * outline ones (Tabler, MIT) for everything else, all on a 24 grid and drawn in
 * currentColor so each skin colours them itself.
 */
export type IconName = 'prev' | 'next' | 'play' | 'pause' | 'shuffle' | 'list' | 'star' | 'reset' | 'disc';

defineProps<{ name: IconName; size?: number }>();

const FILLED: Partial<Record<IconName, string>> = {
  prev: 'm20.341 4.247l-8 7a1 1 0 0 0 0 1.506l8 7c.647.565 1.659.106 1.659-.753V5c0-.86-1.012-1.318-1.659-.753m-11 0l-8 7a1 1 0 0 0 0 1.506l8 7C9.988 20.318 11 19.859 11 19V5c0-.86-1.012-1.318-1.659-.753',
  next: 'M2 5v14c0 .86 1.012 1.318 1.659.753l8-7a1 1 0 0 0 0-1.506l-8-7C3.012 3.682 2 4.141 2 5m11 0v14c0 .86 1.012 1.318 1.659.753l8-7a1 1 0 0 0 0-1.506l-8-7C14.012 3.682 13 4.141 13 5',
  play: 'M6 4v16a1 1 0 0 0 1.524.852l13-8a1 1 0 0 0 0-1.704l-13-8A1 1 0 0 0 6 4',
  pause: 'M9 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2m8 0h-2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2',
};

const STROKED: Partial<Record<IconName, string>> = {
  shuffle: 'M18 4l3 3l-3 3M18 20l3-3l-3-3M3 7h3a5 5 0 0 1 5 5a5 5 0 0 0 5 5h5M21 7h-5a4.98 4.98 0 0 0-3 1m-4 8a4.98 4.98 0 0 1-3 1H3',
  list: 'M9 6h11M9 12h11M9 18h11M5 6v.01M5 12v.01M5 18v.01',
  star: 'M12 17.75l-6.172 3.245l1.179-6.873l-5-4.867l6.9-1l3.086-6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z',
  reset: 'M20 11A8.1 8.1 0 0 0 4.5 9M4 5v4h4m-4 4a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4',
  disc: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0m8 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0m-4 0a5 5 0 0 1 5-5m0 10a5 5 0 0 0 5-5',
};
</script>

<template>
  <svg xmlns="http://www.w3.org/2000/svg" :width="size ?? 22" :height="size ?? 22" viewBox="0 0 24 24" aria-hidden="true">
    <path v-if="FILLED[name]" fill="currentColor" :d="FILLED[name]"/>
    <path v-else fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          :d="STROKED[name]"/>
  </svg>
</template>
