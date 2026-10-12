const PERIOD = 1200;
const HEIGHT = 300;

/**
 * A ridge line that repeats every PERIOD units, drawn across two periods so it can
 * drift sideways forever without a seam. `waves` are [amplitude, cycles, phase].
 */
function ridge(base: number, waves: Array<[number, number, number]>): string {
  const points: string[] = [];
  for (let x = 0; x <= PERIOD * 2; x += 20) {
    const y = waves.reduce((sum, [amplitude, cycles, phase]) => sum + amplitude * Math.sin((x / PERIOD) * Math.PI * 2 * cycles + phase), base);
    points.push(`${x} ${y.toFixed(1)}`);
  }
  return `M ${points.join(' L ')} L ${PERIOD * 2} ${HEIGHT} L 0 ${HEIGHT} Z`;
}

const FAR = ridge(150, [[34, 1, 0.4], [12, 3, 1.9]]);
const MID = ridge(196, [[28, 2, 2.6], [10, 5, 0.3]]);
const NEAR = ridge(244, [[20, 1, 4.1], [9, 4, 1.2]]);

/**
 * Ambient background: three layers of distant hills drifting very slowly, in tones
 * only a shade away from the page. It adds a little life without asking for attention,
 * and stands still for anyone who prefers reduced motion.
 */
export default function Ambient() {
  return (
    <div className="ambient" aria-hidden="true">
      <svg viewBox={`0 0 ${PERIOD * 2} ${HEIGHT}`} preserveAspectRatio="none">
        <path className="ambient__far" d={FAR} />
        <path className="ambient__mid" d={MID} />
        <path className="ambient__near" d={NEAR} />
      </svg>
    </div>
  );
}
