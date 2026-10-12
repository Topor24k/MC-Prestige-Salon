import { useId, useState } from 'react';
import { niceScale } from '../../lib/scale';
import { useElementWidth } from '../../hooks/useMediaQuery';

const SERIES = { Hair: 'var(--color-series-hair)', Nails: 'var(--color-series-nails)' };
const BAR_WIDTH = 22;

/**
 * Hair vs Nail service bookings: one column per service group, coloured by its
 * service line, bracketed under "Hair" and "Nails".
 * groups: [{ label, line: 'Hair' | 'Nails', value }]
 */
export default function BookingsChart({ groups, height = 290 }) {
  const [ref, width] = useElementWidth();
  const [active, setActive] = useState(null);
  const clipId = useId();

  const margin = { top: 26, right: 10, bottom: 58, left: 34 };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = height - margin.top - margin.bottom;
  const scale = niceScale(Math.max(...groups.map((g) => g.value), 0), true);
  const band = innerW / Math.max(groups.length, 1);
  const centre = (i) => margin.left + band * i + band / 2;
  const yOf = (v) => margin.top + innerH - (v / scale.max) * innerH;
  const baseline = yOf(0);
  const total = groups.reduce((t, g) => t + g.value, 0);

  // Consecutive groups that share a service line get one bracket underneath.
  const brackets = [];
  groups.forEach((g, i) => {
    const last = brackets[brackets.length - 1];
    if (last && last.line === g.line) last.to = i;
    else brackets.push({ line: g.line, from: i, to: i });
  });

  const current = active === null ? null : groups[active];

  return (
    <div ref={ref} className="chart" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Bookings by service group, split by Hair and Nails">
          <defs>
            <clipPath id={clipId}>
              <rect x="0" y="0" width={width} height={baseline} />
            </clipPath>
          </defs>

          {scale.ticks.map((tick) => (
            <g key={tick}>
              <line className="chart__grid" x1={margin.left} x2={width - margin.right} y1={yOf(tick)} y2={yOf(tick)} />
              <text className="chart__tick" x={margin.left - 10} y={yOf(tick)} dy="0.32em" textAnchor="end">
                {tick}
              </text>
            </g>
          ))}

          <g clipPath={`url(#${clipId})`}>
            {groups.map((g, i) => {
              const top = yOf(g.value);
              return (
                <rect
                  key={g.label}
                  className={`chart__bar${active === i ? ' is-active' : ''}${active !== null && active !== i ? ' is-dimmed' : ''}`}
                  x={centre(i) - BAR_WIDTH / 2}
                  y={top}
                  width={BAR_WIDTH}
                  // Extends past the baseline so only the data end is rounded.
                  height={Math.max(0, baseline - top) + 8}
                  rx="8"
                  fill={SERIES[g.line]}
                  style={{ animationDelay: `${i * 70}ms` }}
                />
              );
            })}
          </g>

          {groups.map((g, i) => (
            <g key={g.label}>
              <text className="chart__value" x={centre(i)} y={yOf(g.value) - 8} textAnchor="middle">
                {g.value}
              </text>
              <text className="chart__tick chart__tick--category" x={centre(i)} y={baseline + 20} textAnchor="middle">
                {g.label}
              </text>
              {/* Hit area is the whole band, far larger than the bar itself. */}
              <rect
                className="chart__hit"
                x={margin.left + band * i}
                y={margin.top - 10}
                width={band}
                height={innerH + 34}
                tabIndex={0}
                role="img"
                aria-label={`${g.label} (${g.line}): ${g.value} bookings`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={(event) => {
                  if (event.pointerType === 'mouse') setActive(null);
                }}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              />
            </g>
          ))}

          {brackets.map((b) => {
            const x1 = centre(b.from) - band * 0.36;
            const x2 = centre(b.to) + band * 0.36;
            return (
              <g key={b.line}>
                <line className="chart__bracket" x1={x1} x2={x2} y1={baseline + 32} y2={baseline + 32} />
                <text className="chart__group" x={(x1 + x2) / 2} y={baseline + 49} textAnchor="middle">
                  {b.line}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      {current && (
        <div
          className="chart-tooltip"
          style={{ left: Math.min(Math.max(centre(active), 84), Math.max(84, width - 84)), top: yOf(current.value) - 14 }}
          role="status"
        >
          <strong>
            {current.value} booking{current.value === 1 ? '' : 's'}
          </strong>
          <span>
            <i className="chart-tooltip__key chart-tooltip__key--box" style={{ background: SERIES[current.line] }} />
            {current.label} · {current.line}
            {total > 0 ? ` · ${Math.round((current.value / total) * 100)}%` : ''}
          </span>
        </div>
      )}
    </div>
  );
}
