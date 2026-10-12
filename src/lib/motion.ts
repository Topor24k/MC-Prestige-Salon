// Motion tokens for Framer Motion, mirroring --ease-calm and --duration-* in styles/theme.css.
// Everything is slow, smooth and breathing; nothing snaps or bounces.
type Bezier = [number, number, number, number];

export const EASE: Bezier = [0.22, 1, 0.36, 1];

/** Seconds. */
export const DURATION = {
  quick: 0.3, // hovers, presses
  calm: 0.45, // panels, menus, state changes
  slow: 0.6, // page entrances, charts
} as const;

/** The default transition for most movement. */
export const CALM = { duration: DURATION.calm, ease: EASE } as const;
