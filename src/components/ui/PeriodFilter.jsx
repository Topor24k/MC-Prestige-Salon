import { useEffect, useRef } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import ActionMenu from './ActionMenu';
import { PERIODS } from '../../lib/period';
import { useIsMobile } from '../../hooks/useMediaQuery';

const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

function MonthSelect({ value, months, onChange, className }) {
  const selected = value.startsWith('month:') ? value.slice(6) : '';
  return (
    <label className={className}>
      <CalendarDays size={15} aria-hidden="true" />
      <span className="sr-only">Specific month</span>
      <select
        value={selected}
        onChange={(event) => event.target.value && onChange(`month:${event.target.value}`)}
      >
        <option value="">Specific month…</option>
        {months.map((key) => (
          <option key={key} value={key}>
            {monthLabel(key)}
          </option>
        ))}
      </select>
      <ChevronDown size={14} aria-hidden="true" />
    </label>
  );
}

/**
 * Reporting-period control. Presets first, a specific month behind them.
 * Desktop: one dropdown button. Phone: a swipeable row of chips.
 */
export default function PeriodFilter({ value, onChange, months = [], label }) {
  const isMobile = useIsMobile();
  const scrollerRef = useRef(null);

  // Keep the selected chip in view inside the swipeable row.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const active = scroller?.querySelector('[aria-pressed="true"], .is-active');
    if (!scroller || !active) return;
    scroller.scrollTo({ left: active.offsetLeft - (scroller.clientWidth - active.offsetWidth) / 2, behavior: 'smooth' });
  }, [value, isMobile]);

  if (isMobile) {
    return (
      <div ref={scrollerRef} className="chip-scroller" role="group" aria-label="Reporting period">
        {PERIODS.map((period) => (
          <button
            key={period.key}
            type="button"
            className="chip"
            aria-pressed={value === period.key}
            onClick={() => onChange(period.key)}
          >
            {period.label}
          </button>
        ))}
        {months.length > 0 && (
          <MonthSelect
            value={value}
            months={months}
            onChange={onChange}
            className={`chip chip--select${value.startsWith('month:') ? ' is-active' : ''}`}
          />
        )}
      </div>
    );
  }

  return (
    <ActionMenu
      className="btn btn--secondary btn--sm"
      title="Reporting period"
      items={PERIODS.map((period) => ({
        key: period.key,
        label: period.label,
        checked: value === period.key,
        onSelect: () => onChange(period.key),
      }))}
      footer={
        months.length > 0
          ? (close) => (
              <MonthSelect
                value={value}
                months={months}
                className="menu-select"
                onChange={(key) => {
                  onChange(key);
                  close();
                }}
              />
            )
          : undefined
      }
    >
      <CalendarDays size={15} />
      {label}
      <ChevronDown size={14} />
    </ActionMenu>
  );
}
