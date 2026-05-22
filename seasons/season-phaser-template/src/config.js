import { EraConfigs } from '@shared/phaser/EraConfigs.js';

// CHANGE THIS to the era matching your season.
// Keys: atari2600 | nes | snes | ps1 | ps2 | ps3 | ps4 | currentGen
export const ERA_KEY = 'nes';
export const ERA = EraConfigs[ERA_KEY];

// Override individual properties if needed, e.g.:
// export const ERA = { ...EraConfigs.nes, fps: 30 };
