import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck,
  CalendarPlus,
  ChartColumn,
  ChartLine,
  Coins,
  Download,
  Ellipsis,
  Lightbulb,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  UserPlus,
  Wallet,
} from 'lucide-react';
import BookingsChart from '../../components/charts/BookingsChart';
import ChartCard from '../../components/charts/ChartCard';
import RevenueChart from '../../components/charts/RevenueChart';
import PeriodFilter from '../../components/ui/PeriodFilter';
import StatCard from '../../components/ui/StatCard';
import { Avatar, EmptyState, PageHeader, StatusBadge } from '../../components/ui/bits';
import { useToast } from '../../components/ui/useToast';
import { useSalon } from '../../store/useSalon';
import { SALON } from '../../data/catalog';
import { bookingComparison, buildRecommendations, financeTotals, revenueSeries, serviceRanking, topClients } from '../../lib/analytics';
import { downloadFile, rowsToCSV } from '../../lib/csv';
import { formatDate, formatPeso, formatTime, parseISODate, todayISO, toISODate } from '../../lib/format';
import { bookingLabel } from '../../lib/services';
import { getPeriodRange, inPeriod, inPeriodToDate, inPreviousPeriod, monthsFromDates, percentChange } from '../../lib/period';
import { useIsMobile } from '../../hooks/useMediaQuery';

const TREND_TITLES = { month: 'Monthly Revenue Trend', week: 'Weekly Revenue Trend', day: 'Daily Revenue Trend' };
const TIP_ICONS = { positive: TrendingUp, idea: Lightbulb, warning: TriangleAlert };
const TOP_SERVICES = 6;

export default function Dashboard() {
  const { appointments, transactions, customers, services } = useSalon();
  const navigate = useNavigate();
  const toast = useToast();
  const isMobile = useIsMobile();
  const [period, setPeriod] = useState('this-year');
  const [showAll, setShowAll] = useState(false);

  const today = todayISO();
  const range = useMemo(() => getPeriodRange(period), [period]);
  const months = useMemo(() => monthsFromDates(transactions.map((t) => t.date)), [transactions]);

  const kpis = useMemo(() => {
    const totals = financeTotals(transactions, range.start, range.end);
    const previous = range.prevStart ? financeTotals(transactions, range.prevStart, range.prevEnd) : null;

    const bookings = appointments.filter((a) => inPeriod(a.date, range)).length;
    const bookingsToDate = appointments.filter((a) => inPeriodToDate(a.date, range)).length;
    const bookingsBefore = appointments.filter((a) => inPreviousPeriod(a.date, range)).length;

    const lastMonthDay = parseISODate(today);
    lastMonthDay.setMonth(lastMonthDay.getMonth() - 1);
    const todays = appointments.filter((a) => a.date === today);
    const sameDayLastMonth = appointments.filter((a) => a.date === toISODate(lastMonthDay)).length;

    const newClients = customers.filter((c) => inPeriod(c.registeredAt, range)).length;
    const newClientsBefore = customers.filter((c) => inPreviousPeriod(c.registeredAt, range)).length;

    // Average Appointment Value = Total Revenue ÷ Total Appointments, like for like.
    const average = bookingsToDate ? totals.gross / bookingsToDate : 0;
    const averageBefore = previous && bookingsBefore ? previous.gross / bookingsBefore : 0;

    return {
      totals,
      bookings,
      todays,
      newClients,
      average,
      revenueChange: previous ? percentChange(totals.gross, previous.gross) : null,
      todaysChange: percentChange(todays.length, sameDayLastMonth),
      clientsChange: range.prevStart ? percentChange(newClients, newClientsBefore) : null,
      averageChange: previous ? percentChange(average, averageBefore) : null,
    };
  }, [appointments, customers, transactions, range, today]);

  const trend = useMemo(() => revenueSeries(transactions, range), [transactions, range]);
  const comparison = useMemo(() => bookingComparison(appointments, services, range.start, range.end), [appointments, services, range]);
  const ranking = useMemo(() => serviceRanking(appointments, services, range.start, range.end), [appointments, services, range]);
  const returning = useMemo(() => topClients(appointments, services, range.start, range.end), [appointments, services, range]);
  const tips = useMemo(() => buildRecommendations({ appointments, transactions, services, range }), [appointments, transactions, services, range]);

  const shownRanking = showAll ? ranking : ranking.slice(0, TOP_SERVICES);
  const schedule = [...kpis.todays].sort((a, b) => a.time.localeCompare(b.time));

  const exportReport = () => {
    const rows = [
      [`${SALON.fullName} — Analytics Report`],
      ['Period', range.caption],
      ['Generated', formatDate(today)],
      [],
      ['KPI', 'Value'],
      ['Total Revenue', kpis.totals.gross.toFixed(2)],
      ['Total Expenses', kpis.totals.expenses.toFixed(2)],
      ['Net Sales', kpis.totals.net.toFixed(2)],
      ['Total Appointments', kpis.bookings],
      ["Today's Appointments", kpis.todays.length],
      ['New Clients', kpis.newClients],
      ['Avg. Appointment Value', kpis.average.toFixed(2)],
      [],
      [TREND_TITLES[trend.granularity]],
      ['Period', 'Revenue'],
      ...trend.points.map((p) => [p.rangeLabel, p.value.toFixed(2)]),
      [],
      ['Hair vs Nail Service Bookings'],
      ['Service Group', 'Service Line', 'Bookings'],
      ...comparison.groups.map((g) => [g.label, g.line, g.value]),
      [],
      ['Top Performing Services'],
      ['Rank', 'Service', 'Category', 'Bookings', 'Revenue', 'Conversion Rate'],
      ...ranking.map((r, i) => [i + 1, r.name, r.category, r.bookings, r.revenue.toFixed(2), `${r.conversion.toFixed(1)}%`]),
      [],
      ['Top Returning Clients'],
      ['Client', 'Completed Visits', 'Spend'],
      ...returning.map((c) => [c.name, c.visits, c.spend.toFixed(2)]),
      [],
      ['Key Performance Recommendations'],
      ...(tips.length ? tips.map((t) => [t.title, t.body]) : [['More data is needed for recommendations.']]),
    ];
    downloadFile(`analytics-report-${range.caption.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`, rowsToCSV(rows));
    toast({ title: 'Report ready', description: `Analytics summary · ${range.caption}` });
  };

  return (
    <>
      <PageHeader
        eyebrow="Analytics & Reporting"
        title="Salon"
        accent="overview"
        subtitle={`How ${SALON.name} is performing · ${range.caption}`}
        primary={{ label: 'New appointment', icon: CalendarPlus, onClick: () => navigate('/admin/appointments', { state: { command: 'new' } }) }}
        actions={
          <>
            <PeriodFilter value={period} onChange={setPeriod} months={months} label={range.label} />
            <button type="button" className="btn btn--secondary btn--sm" onClick={exportReport}>
              <Download size={15} /> Export
            </button>
          </>
        }
        menuItems={[{ key: 'export', label: 'Export analytics report', description: range.caption, icon: Download, onSelect: exportReport }]}
        menuIcon={<Ellipsis size={18} />}
      />

      {isMobile && <PeriodFilter value={period} onChange={setPeriod} months={months} label={range.label} />}

      <section className="stats stats--four" aria-label="Key performance indicators">
        <StatCard
          tone="dark"
          guide={false}
          label="Total Revenue"
          value={kpis.totals.gross}
          format={formatPeso}
          delta={kpis.revenueChange}
          compareLabel={range.compareLabel}
          caption={range.caption}
          icon={Coins}
        />
        <StatCard
          label="Today’s Appointments"
          value={kpis.todays.length}
          delta={kpis.todaysChange}
          compareLabel="vs same day last month"
          caption={formatDate(today, { weekday: 'long', month: 'short', day: 'numeric' })}
          icon={CalendarCheck}
        />
        <StatCard
          label="New Clients"
          value={kpis.newClients}
          delta={kpis.clientsChange}
          compareLabel={range.compareLabel}
          caption={range.caption}
          icon={UserPlus}
        />
        <StatCard
          label="Avg. Appointment Value"
          value={kpis.average}
          format={formatPeso}
          delta={kpis.averageChange}
          compareLabel={range.compareLabel}
          caption="Revenue ÷ appointments"
          icon={Wallet}
        />
      </section>

      <div className="grid grid--charts">
        <ChartCard
          title={TREND_TITLES[trend.granularity]}
          subtitle={`${formatPeso(trend.total)} total · ${range.caption}`}
          table={{
            caption: 'Revenue by period',
            columns: [
              { key: 'period', label: 'Period' },
              { key: 'revenue', label: 'Revenue', align: 'end' },
            ],
            rows: trend.points.map((p) => ({ period: p.rangeLabel, revenue: formatPeso(p.value) })),
          }}
        >
          {trend.total > 0 ? (
            <RevenueChart points={trend.points} seriesKey={`${range.key}-${trend.points.length}`} height={isMobile ? 240 : 300} />
          ) : (
            <EmptyState icon={ChartLine} title="No data available" description={`No income was recorded for ${range.caption}.`} />
          )}
        </ChartCard>

        <ChartCard
          title="Hair vs Nail Service Bookings"
          subtitle={`${comparison.lines.Hair} hair · ${comparison.lines.Nails} nail bookings`}
          legend={
            <>
              <span className="legend__item">
                <i style={{ background: 'var(--color-series-hair)' }} /> Hair
              </span>
              <span className="legend__item">
                <i style={{ background: 'var(--color-series-nails)' }} /> Nails
              </span>
            </>
          }
          table={{
            caption: 'Bookings by service group',
            columns: [
              { key: 'label', label: 'Service group' },
              { key: 'line', label: 'Line' },
              { key: 'value', label: 'Bookings', align: 'end' },
            ],
            rows: comparison.groups,
          }}
        >
          {comparison.total > 0 ? (
            <BookingsChart groups={comparison.groups} height={isMobile ? 250 : 272} />
          ) : (
            <EmptyState icon={ChartColumn} title="No data available" description={`No hair or nail bookings in ${range.caption}.`} />
          )}
        </ChartCard>
      </div>

      <div className="grid grid--charts">
        <section className="card">
          <header className="card__header">
            <div>
              <h2 className="card__title">Top Performing Services</h2>
              <p className="card__subtitle">Ranked by bookings and revenue · {range.caption}</p>
            </div>
            {ranking.length > TOP_SERVICES && (
              <button type="button" className="link link--button" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
                {showAll ? `Show top ${TOP_SERVICES}` : 'View All'} <ArrowRight size={14} />
              </button>
            )}
          </header>

          {!ranking.length ? (
            <EmptyState icon={Sparkles} title="No data available" description={`No services were booked in ${range.caption}.`} />
          ) : isMobile ? (
            <ol className="list list--ranked">
              {shownRanking.map((r, i) => (
                <li key={r.name} className="list__item">
                  <span className="rank">{i + 1}</span>
                  <div className="list__body">
                    <p className="list__title">{r.name}</p>
                    <p className="list__meta">
                      {r.bookings} bookings · {Math.round(r.conversion)}% completed
                    </p>
                  </div>
                  <div className="list__trail">
                    <strong>{formatPeso(r.revenue, { whole: true })}</strong>
                    <span>{r.category}</span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col" className="is-rank">#</th>
                    <th scope="col">Service Name</th>
                    <th scope="col" className="is-numeric">Total Bookings</th>
                    <th scope="col" className="is-numeric">Total Revenue</th>
                    <th scope="col">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {shownRanking.map((r, i) => (
                    <tr key={r.name}>
                      <td className="is-rank">
                        <span className="rank">{i + 1}</span>
                      </td>
                      <td>
                        <span className="strong">{r.name}</span>
                        <span className="cell-sub">{r.category}</span>
                      </td>
                      <td className="is-numeric">{r.bookings}</td>
                      <td className="is-numeric">{formatPeso(r.revenue, { whole: true })}</td>
                      <td>
                        <span className="meter" role="img" aria-label={`${r.conversion.toFixed(0)}% of bookings completed`}>
                          <span className="meter__track">
                            <span className="meter__fill" style={{ width: `${Math.min(100, r.conversion)}%` }} />
                          </span>
                          <span className="meter__value">{r.conversion.toFixed(0)}%</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card card--tinted">
          <header className="card__header">
            <div>
              <h2 className="card__title">Key Performance Recommendations</h2>
              <p className="card__subtitle">Generated from this period’s data</p>
            </div>
          </header>
          {tips.length ? (
            <ul className="tips">
              {tips.map((tip) => {
                const Icon = TIP_ICONS[tip.tone] || Lightbulb;
                return (
                  <li key={tip.title} className={`tip tip--${tip.tone}`}>
                    <span className="tip__icon">
                      <Icon size={15} strokeWidth={2} />
                    </span>
                    <div>
                      <p className="tip__title">{tip.title}</p>
                      <p className="tip__body">{tip.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={Lightbulb} title="More data is needed" description="Record more appointments and income for this period to see recommendations." />
          )}
        </section>
      </div>

      <div className="grid grid--halves">
        <section className="card">
          <header className="card__header">
            <div>
              <h2 className="card__title">Top Returning Clients</h2>
              <p className="card__subtitle">By completed visits and spend · {range.caption}</p>
            </div>
          </header>
          {returning.length ? (
            <ol className="list list--ranked">
              {returning.map((c, i) => (
                <li key={c.id || c.name} className="list__item">
                  <span className="rank">{i + 1}</span>
                  <Avatar name={c.name} />
                  <div className="list__body">
                    <p className="list__title">{c.name}</p>
                    <p className="list__meta">
                      {c.visits} completed visit{c.visits === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="list__trail">
                    <strong>{formatPeso(c.spend, { whole: true })}</strong>
                    <span>spend</span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState icon={UserPlus} title="No data available" description={`No completed visits in ${range.caption}.`} />
          )}
        </section>

        <section className="card">
          <header className="card__header">
            <div>
              <h2 className="card__title">Today’s Schedule</h2>
              <p className="card__subtitle">{formatDate(today, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            <Link to="/admin/appointments" className="link link--button">
              Appointments <ArrowRight size={14} />
            </Link>
          </header>
          {schedule.length ? (
            <ul className="list">
              {schedule.map((a) => (
                <li key={a.id} className="list__item">
                  <span className="time-chip">{formatTime(a.time)}</span>
                  <div className="list__body">
                    <p className="list__title">{a.name}</p>
                    <p className="list__meta">{bookingLabel(a)}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={CalendarCheck} title="No appointments today" description="New bookings for today will show up here." />
          )}
        </section>
      </div>
    </>
  );
}
