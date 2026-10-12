import { useId, useState } from 'react';
import { formatPeso, formatPesoCompact } from '../../lib/format';
import { niceScale } from '../../lib/scale';
import { useElementWidth } from '../../hooks/useMediaQuery';

/** Monotone cubic path — smooth, without overshooting the data. */
function monotonePath(pts) {
  const n = pts.length;
  if (!n) return '';
  if (n === 1) return `M ${pts[0][0]} ${pts[0][1]}`;
  const dx = [];
  const slope = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx[i] = pts[i + 1][0] - pts[i][0];
    slope[i] = (pts[i + 1][1] - pts[i][1]) / dx[i];
  }
  const t = [slope[0]];
  for (let i = 1; i < n - 1; i += 1) t[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  t[n - 1] = slope[n - 2];
  for (let i = 0; i < n - 1; i += 1) {
    if (slope[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
    } else {
      const a = t[i] / slope[i];
      const b = t[i + 1] / slope[i];
      const s = a * a + b * b;
      if (s > 9) {
        const k = 3 / Math.sqrt(s);
        t[i] = k * a * slope[i];
        t[i + 1] = k * b * slope[i];
      }
    }
  }
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const c1x = pts[i][0] + dx[i] / 3;
    const c1y = pts[i][1] + (t[i] * dx[i]) / 3;
    const c2x = pts[i + 1][0] - dx[i] / 3;
    const c2y = pts[i + 1][1] - (t[i + 1] * dx[i]) / 3;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${pts[i + 1][0].toFixed(2)} ${pts[i + 1][1].toFixed(2)}`;
  }
  return d;
}

/**
 * Revenue trend: one smooth line over a fill that fades away, a sunlit mark on the
 * current point, and a crosshair that snaps
 * to the nearest bucket and a tooltip showing the exact date range and revenue.
 * points: [{ label, sublabel, value, rangeLabel, partial }]
 */
export default function RevenueChart({ points, height = 290, seriesKey }) {
  const [ref, width] = useElementWidth();
  const [active, setActive] = useState(null);
  const fadeId = useId();

  const hasYears = points.some((p) => p.sublabel);
  const margin = { top: 18, right: 18, bottom: hasYears ? 46 : 32, left: 52 };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = height - margin.top - margin.bottom;
  const scale = niceScale(Math.max(...points.map((p) => p.value), 0));
  const xOf = (i) => margin.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yOf = (v) => margin.top + innerH - (v / scale.max) * innerH;
  const coords = points.map((p, i) => [xOf(i), yOf(p.value)]);
  const baseline = yOf(0);

  // A period still in progress is not comparable with finished ones: the solid
  // line stops at the last complete bucket and a faint lead-in reaches "to date".
  const openEnded = points.length > 1 && points[points.length - 1].partial;
  const settled = openEnded ? coords.slice(0, -1) : coords;
  const line = monotonePath(settled);
  const area = settled.length > 1 ? `${line} L ${settled[settled.length - 1][0]} ${baseline} L ${settled[0][0]} ${baseline} Z` : '';
  const leadIn = openEnded ? `M ${settled[settled.length - 1].join(' ')} L ${coords[coords.length - 1].join(' ')}` : '';

  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(innerW / 58))));
  const lastIndex = points.length - 1;
  const current = active === null ? null : points[active];

  const snap = (clientX, rect) => {
    if (!points.length) return;
    const x = clientX - rect.left;
    const ratio = points.length === 1 ? 0 : (x - margin.left) / innerW;
    setActive(Math.min(lastIndex, Math.max(0, Math.round(ratio * lastIndex))));
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const step = event.key === 'ArrowRight' ? 1 : -1;
      setActive((i) => Math.min(lastIndex, Math.max(0, (i ?? (step > 0 ? -1 : lastIndex + 1)) + step)));
    } else if (event.key === 'Escape') {
      setActive(null);
    }
  };

  const tooltipLeft = current ? Math.min(Math.max(coords[active][0], 92), Math.max(92, width - 92)) : 0;
  const tooltipBelow = current ? coords[active][1] < 86 : false;

  return (
    <div
      ref={ref}
      className="chart"
      style={{ height }}
      role="group"
      tabIndex={0}
      aria-label="Revenue trend. Use the left and right arrow keys to read each point."
      onKeyDown={onKeyDown}
      onBlur={() => setActive(null)}
    >
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Revenue by period, ${points.length} points`}
          onPointerMove={(event) => snap(event.clientX, event.currentTarget.getBoundingClientRect())}
          onPointerDown={(event) => snap(event.clientX, event.currentTarget.getBoundingClientRect())}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') setActive(null);
          }}
        >
          <defs>
            <linearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-leaf)" stopOpacity="0.26" />
              <stop offset="100%" stopColor="var(--color-leaf)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {scale.ticks.map((tick) => (
            <g key={tick}>
              <line className="chart__grid" x1={margin.left} x2={width - margin.right} y1={yOf(tick)} y2={yOf(tick)} />
              <text className="chart__tick" x={margin.left - 10} y={yOf(tick)} dy="0.32em" textAnchor="end">
                {formatPesoCompact(tick)}
              </text>
            </g>
          ))}

          {points.map((p, i) =>
            i % labelEvery === 0 ? (
              <text key={i} className="chart__tick" x={xOf(i)} y={height - margin.bottom + 20} textAnchor="middle">
                {p.label}
                {p.sublabel && (
                  <tspan className="chart__tick-sub" x={xOf(i)} dy="14">
                    {p.sublabel}
                  </tspan>
                )}
              </text>
            ) : null,
          )}

          <g key={seriesKey} className="chart__series">
            {area && <path className="chart__area" d={area} fill={`url(#${fadeId})`} />}
            <path className="chart__line" d={line} pathLength="1" />
            {leadIn && <path className="chart__lead-in" d={leadIn} />}
            {coords.length > 0 && (
              <>
                <circle className="chart__now-halo" cx={coords[lastIndex][0]} cy={coords[lastIndex][1]} r="11" />
                <circle className="chart__now" cx={coords[lastIndex][0]} cy={coords[lastIndex][1]} r="5.5" />
              </>
            )}
          </g>

          {current && (
            <g pointerEvents="none">
              <line className="chart__crosshair" x1={coords[active][0]} x2={coords[active][0]} y1={margin.top} y2={baseline} />
              <circle className="chart__dot" cx={coords[active][0]} cy={coords[active][1]} r="5.5" />
            </g>
          )}
        </svg>
      )}

      {current && (
        <div
          className={`chart-tooltip${tooltipBelow ? ' chart-tooltip--below' : ''}`}
          style={{ left: tooltipLeft, top: coords[active][1] }}
          role="status"
        >
          <strong>{formatPeso(current.value)}</strong>
          <span>
            <i className="chart-tooltip__key" style={{ background: 'var(--color-series-hair)' }} />
            {current.rangeLabel}
            {current.partial ? ' · month to date' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
