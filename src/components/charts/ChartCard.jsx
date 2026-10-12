import { useState } from 'react';
import { ChartColumn, Table2 } from 'lucide-react';

/**
 * Card frame shared by the charts. Every chart has a table twin so each value
 * is readable without hovering; the toggle switches between the two.
 * table: { caption, columns: [{ key, label, align? }], rows: [{...}] }
 */
export default function ChartCard({ title, subtitle, legend, table, className = '', children }) {
  const [view, setView] = useState('chart');
  const showTable = view === 'table' && table;

  return (
    <section className={`card chart-card ${className}`}>
      <header className="card__header">
        <div>
          <h2 className="card__title">{title}</h2>
          {subtitle && <p className="card__subtitle">{subtitle}</p>}
        </div>
        {table && (
          <div className="view-toggle" role="group" aria-label={`${title} view`}>
            <button type="button" aria-pressed={view === 'chart'} aria-label="Chart view" onClick={() => setView('chart')}>
              <ChartColumn size={15} />
            </button>
            <button type="button" aria-pressed={view === 'table'} aria-label="Table view" onClick={() => setView('table')}>
              <Table2 size={15} />
            </button>
          </div>
        )}
      </header>

      {legend && !showTable && <div className="legend">{legend}</div>}

      {showTable ? (
        <div className="chart-table">
          <table className="table table--compact">
            <caption className="sr-only">{table.caption || title}</caption>
            <thead>
              <tr>
                {table.columns.map((column) => (
                  <th key={column.key} scope="col" className={column.align === 'end' ? 'is-numeric' : undefined}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, index) => (
                <tr key={index}>
                  {table.columns.map((column) => (
                    <td key={column.key} className={column.align === 'end' ? 'is-numeric' : undefined}>
                      {row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
