import { useEffect, useLayoutEffect, useRef } from 'react';
import { animate } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus, type LucideIcon } from 'lucide-react';
import { formatNumber } from '../../lib/format';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery';
import { cx } from '../../lib/cx';
import { EASE } from '../../lib/motion';

type Format = (value: number) => string;

/** Counts gently between numeric values, writing formatted text straight to the node. */
function CountUp({ value, format }: { value: number; format: Format }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);
  const reducedMotion = usePrefersReducedMotion();
  const formatRef = useRef(format);
  formatRef.current = format;

  useLayoutEffect(() => {
    if (ref.current && !ref.current.textContent) ref.current.textContent = formatRef.current(shown.current);
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (reducedMotion) {
      shown.current = value;
      node.textContent = formatRef.current(value);
      return undefined;
    }
    const controls = animate(shown.current, value, {
      duration: 1.1,
      ease: EASE,
      onUpdate: (latest) => {
        shown.current = latest;
        node.textContent = formatRef.current(latest);
      },
    });
    return () => controls.stop();
  }, [value, reducedMotion]);

  return <span ref={ref} aria-hidden="true" />;
}

interface StatCardProps {
  label: string;
  value: number;
  format?: Format;
  /** Percentage change against `compareLabel`; null shows `caption` instead. */
  delta?: number | null;
  compareLabel?: string;
  caption?: string;
  icon?: LucideIcon;
  /** 'dark' is the lead figure of a page: forest green, with the sunlit guiding line. */
  tone?: 'light' | 'dark';
  /** Hide the guiding line when something else on the page already carries the yellow. */
  guide?: boolean;
  upIsGood?: boolean;
  /** Makes the whole card a button. */
  onClick?: () => void;
}

/**
 * Summary figure: a small uppercase label, a large calm numeral, and either a signed
 * change against a named period or a plain caption.
 */
export default function StatCard({
  label,
  value,
  format = formatNumber,
  delta = null,
  compareLabel,
  caption,
  icon: Icon,
  tone = 'light',
  guide = true,
  upIsGood = true,
  onClick,
}: StatCardProps) {
  const hasDelta = delta !== null && Number.isFinite(delta);
  const flat = hasDelta && Math.abs(delta) < 0.05;
  const rising = hasDelta && delta >= 0;
  const good = rising === upIsGood;
  // A card with an action is a real button; typed as one so the shared props check out.
  const Tag = (onClick ? 'button' : 'div') as 'button';

  return (
    <Tag className={cx('stat', `stat--${tone}`, onClick && 'stat--action')} {...(onClick ? { type: 'button' as const, onClick } : {})}>
      {tone === 'dark' && guide && <span className="stat__guide" aria-hidden="true" />}
      <span className="stat__top">
        <span className="stat__label">{label}</span>
        {Icon && (
          <span className="stat__icon">
            <Icon size={17} strokeWidth={1.7} />
          </span>
        )}
      </span>
      <span className="stat__value">
        <CountUp value={value} format={format} />
        <span className="sr-only">{format(value)}</span>
      </span>
      <span className="stat__foot">
        {hasDelta ? (
          <>
            {flat ? (
              <span className="delta delta--flat">
                <Minus size={13} strokeWidth={2.2} />
                No change
              </span>
            ) : (
              <span className={cx('delta', good ? 'delta--good' : 'delta--bad')}>
                {rising ? <ArrowUpRight size={13} strokeWidth={2.2} /> : <ArrowDownRight size={13} strokeWidth={2.2} />}
                {rising ? '+' : '−'}
                {Math.abs(delta) >= 1000 ? Math.round(Math.abs(delta)).toLocaleString() : Math.abs(delta).toFixed(1)}%
              </span>
            )}
            <span className="stat__compare">{compareLabel}</span>
          </>
        ) : (
          <span className="stat__compare">{caption}</span>
        )}
        {onClick && (
          <span className="stat__more">
            View <ChevronRight size={14} />
          </span>
        )}
      </span>
    </Tag>
  );
}
