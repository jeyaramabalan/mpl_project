// src/pages/ChampionsPage.jsx
// Champions: table of Season | Winner | Runner. Team names link to final match scorecard.

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { toList } from '../utils/apiResponse';
import './ChampionsPage.css';

function ChampionsPage() {
  const [champions, setChampions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchChampions = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/matches/champions');
        if (isMounted) setChampions(toList(data));
      } catch (err) {
        if (isMounted) {
          setError(err?.response?.data?.message || 'Failed to load champions.');
          setChampions([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchChampions();
    return () => { isMounted = false; };
  }, []);

  const viewFinalTitle = 'View season final scorecard';
  const teamInitials = (name) => (name || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="champions-page mpl-section">
      <div className="champions-header">
        <h1 className="mpl-page-title champions-title">
          <span className="champions-title-icon" aria-hidden>🏆</span>
          Champions
        </h1>
        <p className="champions-intro">Season winners and runners each completed season.</p>
      </div>

      {error && <p className="error-message">{error}</p>}

      {loading && (
        <div className="champions-skeleton">
          <div className="champions-skeleton-table">
            <div className="champions-skeleton-row" />
            <div className="champions-skeleton-row" />
            <div className="champions-skeleton-row" />
            <div className="champions-skeleton-row" />
          </div>
        </div>
      )}

      {!loading && champions.length === 0 && !error && (
        <div className="champions-empty">
          <span className="champions-empty-icon" aria-hidden>🏆</span>
          <p className="champions-empty-title">No champions yet</p>
          <p className="champions-empty-text">Complete a season’s final match to see winners and runners here.</p>
        </div>
      )}

      {!loading && champions.length > 0 && (
        <>
          <div className="table-responsive champions-table-wrap">
            <table className="champions-table">
              <thead>
                <tr>
                  <th className="th-season">Season</th>
                  <th className="th-winner"><span className="th-icon" aria-hidden>🏆</span> Winner</th>
                  <th className="th-runner"><span className="th-icon" aria-hidden>🥈</span> Runner</th>
                  <th className="th-action"> </th>
                </tr>
              </thead>
              <tbody>
                {champions.map((row, index) => (
                  <tr key={`${row.season_id}-${row.match_id}`} className={index % 2 === 0 ? 'row-even' : 'row-odd'}>
                    <td className="season-cell">{row.season_name || `Season ${row.year}`}{row.year != null ? ` (${row.year})` : ''}</td>
                    <td className="team-cell winner-cell">
                      <Link to={`/matches/${row.match_id}`} className="champions-team-link" title={viewFinalTitle}>
                        <span className="champions-team-logo-wrap">
                          {row.winner_team_id ? (
                            <>
                              <img
                                src={`/images/teams/${row.winner_team_id}.jpg`}
                                alt={row.winner_team_name || 'Winner'}
                                className="champions-team-logo"
                                onError={(e) => e.currentTarget.classList.add('is-hidden')}
                              />
                              <span className="champions-team-logo-fallback" aria-hidden="true">{teamInitials(row.winner_team_name)}</span>
                            </>
                          ) : (
                            <span className="champions-team-logo-fallback" aria-hidden="true">{teamInitials(row.winner_team_name)}</span>
                          )}
                        </span>
                        <span className="champions-team-name">
                          {row.winner_team_name || '—'}
                        </span>
                      </Link>
                    </td>
                    <td className="team-cell runner-cell">
                      <Link to={`/matches/${row.match_id}`} className="champions-team-link" title={viewFinalTitle}>
                        <span className="champions-team-logo-wrap">
                          {row.runner_team_id ? (
                            <>
                              <img
                                src={`/images/teams/${row.runner_team_id}.jpg`}
                                alt={row.runner_team_name || 'Runner'}
                                className="champions-team-logo"
                                onError={(e) => e.currentTarget.classList.add('is-hidden')}
                              />
                              <span className="champions-team-logo-fallback" aria-hidden="true">{teamInitials(row.runner_team_name)}</span>
                            </>
                          ) : (
                            <span className="champions-team-logo-fallback" aria-hidden="true">{teamInitials(row.runner_team_name)}</span>
                          )}
                        </span>
                        <span className="champions-team-name">
                          {row.runner_team_name || '—'}
                        </span>
                      </Link>
                    </td>
                    <td className="action-cell">
                      <Link to={`/matches/${row.match_id}`} className="champions-view-final" title={viewFinalTitle}>
                        View final →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="champions-cards">
            {champions.map((row) => (
              <div key={`card-${row.season_id}-${row.match_id}`} className="champions-card">
                <div className="champions-card-season">{row.season_name || `Season ${row.year}`}{row.year != null ? ` (${row.year})` : ''}</div>
                <div className="champions-card-row">
                  <span className="champions-card-label">Winner</span>
                  <Link to={`/matches/${row.match_id}`} className="champions-team-link champions-card-team" title={viewFinalTitle}>
                    <span className="champions-team-logo-wrap">
                      {row.winner_team_id ? (
                        <>
                          <img
                            src={`/images/teams/${row.winner_team_id}.jpg`}
                            alt={row.winner_team_name || 'Winner'}
                            className="champions-team-logo"
                            onError={(e) => e.currentTarget.classList.add('is-hidden')}
                          />
                          <span className="champions-team-logo-fallback" aria-hidden="true">{teamInitials(row.winner_team_name)}</span>
                        </>
                      ) : (
                        <span className="champions-team-logo-fallback" aria-hidden="true">{teamInitials(row.winner_team_name)}</span>
                      )}
                    </span>
                    <span className="champions-team-name">
                      {row.winner_team_name || '—'}
                    </span>
                  </Link>
                </div>
                <div className="champions-card-row">
                  <span className="champions-card-label">Runner</span>
                  <Link to={`/matches/${row.match_id}`} className="champions-team-link champions-card-team" title={viewFinalTitle}>
                    <span className="champions-team-logo-wrap">
                      {row.runner_team_id ? (
                        <>
                          <img
                            src={`/images/teams/${row.runner_team_id}.jpg`}
                            alt={row.runner_team_name || 'Runner'}
                            className="champions-team-logo"
                            onError={(e) => e.currentTarget.classList.add('is-hidden')}
                          />
                          <span className="champions-team-logo-fallback" aria-hidden="true">{teamInitials(row.runner_team_name)}</span>
                        </>
                      ) : (
                        <span className="champions-team-logo-fallback" aria-hidden="true">{teamInitials(row.runner_team_name)}</span>
                      )}
                    </span>
                    <span className="champions-team-name">
                      {row.runner_team_name || '—'}
                    </span>
                  </Link>
                </div>
                <Link to={`/matches/${row.match_id}`} className="champions-card-btn" title={viewFinalTitle}>View final →</Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default ChampionsPage;
