/**
 * Picks a clean tick step that covers the data in 3–5 intervals with the least
 * empty headroom, e.g. 119,463 -> 0 / 25K / 50K / 75K / 100K / 125K.
 */
export function niceScale(maxValue, wholeNumbers = false) {
  const top = Math.max(maxValue, wholeNumbers ? 4 : 1);
  const magnitude = 10 ** Math.floor(Math.log10(top));
  let best = null;
  for (const power of [magnitude / 10, magnitude]) {
    for (const multiple of [1, 2, 2.5, 5]) {
      const step = multiple * power;
      if (wholeNumbers && !Number.isInteger(step)) continue;
      const intervals = Math.ceil(top / step);
      if (intervals < 3 || intervals > 5) continue;
      const max = step * intervals;
      if (!best || max < best.max || (max === best.max && intervals < best.intervals)) best = { step, intervals, max };
    }
  }
  if (!best) best = { step: top / 4, intervals: 4, max: top };
  return { max: best.max, ticks: Array.from({ length: best.intervals + 1 }, (_, i) => best.step * i) };
}
