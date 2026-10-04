import { useEffect, useState } from 'react';
import {
  getMovieBoxOffice,
  refreshMovieBoxOffice,
  refreshMovieInternationalBoxOffice,
} from '../../services/movies.service';
import { BoxOfficeHistory, BoxOfficePoint, InternationalHistory } from '../../types';
import styles from './MovieDetails.module.css';

const formatMoney = (n: number | null | undefined) =>
  n != null ? `$${n.toLocaleString()}` : '-';

function PeriodTable({ title, rows }: { title: string; rows: BoxOfficePoint[] }) {
  if (rows.length === 0) {
    return (
      <p>
        <strong>{title}:</strong> no data
      </p>
    );
  }

  return (
    <div>
      <p>
        <strong>{title}</strong> ({rows.length} rows)
      </p>
      <div className={styles['history-table-wrap']}>
        <table className={styles['history-table']}>
          <thead>
            <tr>
              <th>#</th>
              <th>Dates</th>
              <th>Gross</th>
              <th>To date</th>
              <th>Rank</th>
              <th>Theaters</th>
              <th>Est.</th>
              <th>Scraped</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.startDate}>
                <td>{r.period ?? '-'}</td>
                <td>
                  {r.startDate} to {r.endDate}
                </td>
                <td>{formatMoney(r.gross)}</td>
                <td>{formatMoney(r.grossToDate)}</td>
                <td>{r.rank ?? '-'}</td>
                <td>{r.theaters?.toLocaleString() ?? '-'}</td>
                <td>{r.isEstimate ? 'yes' : ''}</td>
                <td>{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InternationalSection({
  international,
  tracked,
}: {
  international?: InternationalHistory;
  tracked?: boolean;
}) {
  if (!tracked) {
    return (
      <p>
        <strong>International:</strong> not tracked (only movies with at least one guess)
      </p>
    );
  }

  const territories = international?.territories ?? [];
  const weekly = international?.weekly ?? [];
  const totals = international?.totals ?? [];

  return (
    <>
      <p>
        <strong>International weekly (calendar weeks)</strong> ({weekly.length} rows)
      </p>
      {weekly.length > 0 ? (
        <div className={styles['history-table-wrap']}>
          <table className={styles['history-table']}>
            <thead>
              <tr>
                <th>#</th>
                <th>Week ending</th>
                <th>To date</th>
                <th>Reporting</th>
                <th>Territories to date</th>
              </tr>
            </thead>
            <tbody>
              {weekly.map((w) => (
                <tr key={w.weekEnding}>
                  <td>{w.period}</td>
                  <td>{w.weekEnding}</td>
                  <td>{formatMoney(w.grossToDate)}</td>
                  <td>{w.territoriesReporting}</td>
                  <td>{w.territoriesToDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>no territory weekend data yet</p>
      )}

      <p>
        <strong>Territories</strong> ({territories.length})
      </p>
      {territories.length > 0 && (
        <div className={styles['history-table-wrap']}>
          <table className={styles['history-table']}>
            <thead>
              <tr>
                <th>Area</th>
                <th>Market</th>
                <th>Released</th>
                <th>Opening</th>
                <th>Gross</th>
                <th>Weekend table read</th>
              </tr>
            </thead>
            <tbody>
              {territories.map((t) => (
                <tr key={t.releaseId}>
                  <td>{t.region ?? '-'}</td>
                  <td>
                    <a
                      href={`https://www.boxofficemojo.com/release/${t.releaseId}/weekend/`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t.market}
                    </a>
                  </td>
                  <td>{t.releaseDate ?? '-'}</td>
                  <td>{formatMoney(t.opening)}</td>
                  <td>{formatMoney(t.gross)}</td>
                  <td>{t.periodsScrapedAt ? new Date(t.periodsScrapedAt).toLocaleString() : 'never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p>
        <strong>Total snapshots (changes only)</strong> ({totals.length})
      </p>
      {totals.length > 0 && (
        <div className={styles['history-table-wrap']}>
          <table className={styles['history-table']}>
            <thead>
              <tr>
                <th>Captured</th>
                <th>Scope</th>
                <th>Gross</th>
              </tr>
            </thead>
            <tbody>
              {totals.map((s) => (
                <tr key={`${s.scope}-${s.capturedOn}`}>
                  <td>{s.capturedOn}</td>
                  <td>{s.scope}</td>
                  <td>{formatMoney(s.gross)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

interface BoxOfficeHistoryAdminProps {
  movieId: string;
  bomReleaseId?: string | null;
}

export default function BoxOfficeHistoryAdmin({ movieId, bomReleaseId }: BoxOfficeHistoryAdminProps) {
  const [history, setHistory] = useState<BoxOfficeHistory | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefreshingForeign, setIsRefreshingForeign] = useState(false);
  const [forceForeign, setForceForeign] = useState(false);
  const [foreignResult, setForeignResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHistory(null);
    setError(null);
    getMovieBoxOffice(movieId)
      .then((result) => {
        if (!cancelled) setHistory(result);
      })
      .catch((err) => {
        console.error('Error fetching box office history:', err);
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [movieId]);

  const handleForeignRefresh = async () => {
    setIsRefreshingForeign(true);
    setError(null);
    setForeignResult(null);
    try {
      const { refreshResult, ...result } = await refreshMovieInternationalBoxOffice(movieId, {
        force: forceForeign,
      });
      setHistory(result);
      setForeignResult(
        `Re-read ${refreshResult.scraped} of ${refreshResult.total} territories` +
          ` (${refreshResult.due} due, ${refreshResult.rows} weekend rows saved` +
          `${refreshResult.failed ? `, ${refreshResult.failed} failed` : ''}),` +
          ` ${refreshResult.snapshots} totals changed.`
      );
    } catch (err) {
      console.error('Error refreshing foreign history:', err);
      setError(err instanceof Error ? err.message : 'Foreign refresh failed');
    } finally {
      setIsRefreshingForeign(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      setHistory(await refreshMovieBoxOffice(movieId));
    } catch (err) {
      console.error('Error refreshing box office history:', err);
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className={styles['history-section']}>
      <p>
        <strong>Box Office Mojo release:</strong>{' '}
        {bomReleaseId ? (
          <a
            href={`https://www.boxofficemojo.com/release/${bomReleaseId}/weekly/`}
            target="_blank"
            rel="noreferrer"
          >
            {bomReleaseId}
          </a>
        ) : (
          'not set (run Update Data)'
        )}
      </p>
      {bomReleaseId && (
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={isRefreshing ? styles['disabled-btn'] : styles['update-btn']}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh domestic history'}
        </button>
      )}
      {history?.tracked && (
        <div className={styles['history-actions']}>
          <button
            type="button"
            onClick={handleForeignRefresh}
            disabled={isRefreshingForeign}
            className={isRefreshingForeign ? styles['disabled-btn'] : styles['update-btn']}
          >
            {isRefreshingForeign ? 'Refreshing foreign history...' : 'Refresh foreign history'}
          </button>
          <label>
            <input
              type="checkbox"
              checked={forceForeign}
              onChange={(e) => setForceForeign(e.target.checked)}
              disabled={isRefreshingForeign}
            />{' '}
            Re-read every territory (not just changed ones)
          </label>
          <small>One request per territory, 1.5s apart: up to a few minutes on the first run.</small>
        </div>
      )}
      {foreignResult && <p>{foreignResult}</p>}
      {error && <p className={styles['history-error']}>{error}</p>}
      {history ? (
        <>
          <PeriodTable title="Weekly (domestic)" rows={history.weekly} />
          <PeriodTable title="Weekend (domestic)" rows={history.weekend} />
          <InternationalSection international={history.international} tracked={history.tracked} />
        </>
      ) : (
        !error && <p>Loading box office history...</p>
      )}
    </div>
  );
}
