import { useId, type ComponentPropsWithoutRef } from 'react';
import { Icon } from './primitives/Icon';
import './DiffPreview.css';

export type DiffPreviewRow = {
  id: string;
  label: string;
  period: string;
  from: string | null;
  to: string;
  amount: string;
};

export type DiffPreviewTotal = { period: string; amount: string };

export type DiffPreviewProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  rows: readonly DiffPreviewRow[];
  totals: readonly DiffPreviewTotal[];
  context?: string;
  note?: string;
};

export function DiffPreview({ rows, totals, context, note, className, ...rest }: DiffPreviewProps) {
  const summaryId = useId();
  const noteId = useId();
  return (
    <div {...rest} className={['ui-diff-preview', className].filter(Boolean).join(' ')}>
      {context && <p>{context}</p>}
      <p id={summaryId}>
        {rows.length === 0 ? 'No rows would move' : <>
          {rows.length} {rows.length === 1 ? 'row' : 'rows'} would move
          {totals.map((total, index) => <span key={index}> · {total.period}: {total.amount}</span>)}
        </>}
      </p>
      {note && <p id={noteId}>{note}</p>}
      {rows.length > 0 && (
        <div className="ui-table-scroll" role="region" aria-label="Change preview" tabIndex={0}>
          <table className="ui-table ui-table--dense" aria-labelledby={summaryId} aria-describedby={note ? noteId : undefined}>
            <thead><tr>
              <th scope="col">Row</th><th scope="col">Period</th><th scope="col">From</th>
              <th aria-hidden="true" /><th scope="col">To</th><th scope="col" className="ui-table__num">Amount</th>
            </tr></thead>
            <tbody>{rows.map(row => <tr key={row.id}>
              <td>{row.label}</td><td>{row.period}</td>
              <td className="ui-diff-preview__from">{row.from ?? <><span aria-hidden="true">—</span><span className="ui-sr">Unclassified</span></>}</td>
              <td aria-hidden="true"><Icon name="arrowRight" /></td>
              <td className="ui-diff-preview__to">{row.to}</td>
              <td className="ui-table__num">{row.amount}</td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
