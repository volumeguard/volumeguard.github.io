/** State shared between the home page script and the 3D road (kept tiny so the page loads without Three.js). */
export const story = {
  /** Story progress, 0 at the hero, 1 at the line. */
  p: 0,
  /** Loud peaks the orb has passed and tamed. */
  peaks: 0,
  /** An opaque panel covers the canvas; skip rendering. */
  covered: false,
};
