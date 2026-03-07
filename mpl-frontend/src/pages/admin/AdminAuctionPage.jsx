// mpl-project/mpl-frontend/src/pages/admin/AdminAuctionPage.jsx
// Registrations & payment tracking (Captain £12, Player £7), then Run Auction (£300/team, 4 players).
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import { toList } from '../../utils/apiResponse';
import LoadingFallback from '../../components/LoadingFallback';
import SearchablePlayerSelect from '../../components/SearchablePlayerSelect';

const TAB_REGISTRATIONS = 'registrations';
const TAB_AUCTION = 'auction';

export default function AdminAuctionPage() {
  const [seasons, setSeasons] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [auctionState, setAuctionState] = useState(null);
  const [pool, setPool] = useState([]);
  const [activeTab, setActiveTab] = useState(TAB_REGISTRATIONS);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [addPlayerId, setAddPlayerId] = useState('');
  const [addWithoutFood, setAddWithoutFood] = useState(false);
  const [updatingRegId, setUpdatingRegId] = useState(null);

  const fetchSeasons = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/seasons');
      setSeasons(toList(data));
    } catch (e) {
      setError(e?.message || 'Failed to load seasons.');
    }
  }, []);

  const fetchPlayers = useCallback(async () => {
    try {
      const { data } = await api.get('/players');
      setPlayers(toList(data));
    } catch (e) {
      setError(e?.message || 'Failed to load players.');
    }
  }, []);

  const fetchRegistrations = useCallback(async () => {
    if (!selectedSeasonId) return;
    setFormLoading(true);
    try {
      const { data } = await api.get(`/admin/auction/registrations?season_id=${selectedSeasonId}`);
      setRegistrations(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || 'Failed to load registrations.');
    } finally {
      setFormLoading(false);
    }
  }, [selectedSeasonId]);

  const fetchAuctionState = useCallback(async () => {
    if (!selectedSeasonId) return;
    try {
      const { data } = await api.get(`/admin/auction/state?season_id=${selectedSeasonId}`);
      setAuctionState(data);
    } catch (e) {
      setAuctionState(null);
    }
  }, [selectedSeasonId]);

  const fetchPool = useCallback(async () => {
    if (!selectedSeasonId) return;
    try {
      const { data } = await api.get(`/admin/auction/pool?season_id=${selectedSeasonId}`);
      setPool(Array.isArray(data) ? data : []);
    } catch (e) {
      setPool([]);
    }
  }, [selectedSeasonId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      await Promise.all([fetchSeasons(), fetchPlayers()]);
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [fetchSeasons, fetchPlayers]);

  const auctionSeasons = useMemo(() => seasons.filter(s => s.status !== 'Completed'), [seasons]);
  useEffect(() => {
    if (selectedSeasonId && !auctionSeasons.some(s => s.season_id == selectedSeasonId)) {
      setSelectedSeasonId('');
    }
  }, [auctionSeasons, selectedSeasonId]);

  useEffect(() => {
    if (selectedSeasonId) {
      fetchRegistrations();
      fetchAuctionState();
      fetchPool();
    } else {
      setRegistrations([]);
      setAuctionState(null);
      setPool([]);
    }
  }, [selectedSeasonId, fetchRegistrations, fetchAuctionState, fetchPool]);

  const handleAddRegistration = async (e) => {
    e.preventDefault();
    if (!addPlayerId || !selectedSeasonId) return;
    setFormLoading(true);
    setError('');
    try {
      await api.post('/admin/auction/registrations', {
        season_id: parseInt(selectedSeasonId),
        player_id: parseInt(addPlayerId),
        without_food: addWithoutFood,
      });
      setAddPlayerId('');
      fetchRegistrations();
    } catch (e) {
      setError(e?.message || 'Failed to add registration.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleWithoutFood = async (reg) => {
    if (reg.payment_status === 'paid') return;
    setUpdatingRegId(reg.id);
    setError('');
    try {
      await api.patch(`/admin/auction/registrations/${reg.id}`, { without_food: !reg.without_food });
      fetchRegistrations();
    } catch (e) {
      setError(e?.message || 'Failed to update option.');
    } finally {
      setUpdatingRegId(null);
    }
  };

  const handleConfirmPayment = async (regId) => {
    setFormLoading(true);
    setError('');
    try {
      await api.post(`/admin/auction/registrations/${regId}/confirm-payment`);
      fetchRegistrations();
    } catch (e) {
      setError(e?.message || 'Failed to confirm payment.');
    } finally {
      setFormLoading(false);
    }
  };

  const formatDateForWhatsApp = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = d.getDate();
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
    return `${days[d.getDay()]} ${day}${suffix} ${months[d.getMonth()]}`;
  };

  const buildWhatsAppMessage = () => {
    const season = seasons.find(s => s.season_id == selectedSeasonId);
    const seasonName = season?.name || `Season ${selectedSeasonId}`;
    const datePart = formatDateForWhatsApp(season?.start_date);
    const header = datePart ? `${seasonName} ${datePart}` : seasonName;
    let msg = `*${header}*:\nPayment Status:\n`;
    registrations.forEach((r, i) => {
      const amount = r.payment_status === 'paid' ? (r.amount_paid ?? r.amount_due) : r.amount_due;
      const amountStr = amount != null ? ` - £${Number(amount)}` : '';
      const tick = r.payment_status === 'paid' ? ' ✅' : '';
      msg += `${i + 1}. ${r.player_name}${amountStr}${tick}\n`;
    });
    return msg.trim();
  };

  const handleCopyWhatsApp = () => {
    const msg = buildWhatsAppMessage();
    navigator.clipboard.writeText(msg).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }).catch(() => setError('Could not copy to clipboard.'));
  };

  const handleStartAuction = async () => {
    if (!selectedSeasonId) return;
    setFormLoading(true);
    setError('');
    try {
      await api.post('/admin/auction/start', { season_id: parseInt(selectedSeasonId) });
      fetchAuctionState();
      fetchPool();
    } catch (e) {
      setError(e?.message || 'Failed to start auction.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleBid = async (teamId) => {
    if (!selectedSeasonId) return;
    setFormLoading(true);
    setError('');
    try {
      await api.post('/admin/auction/bid', { season_id: parseInt(selectedSeasonId), team_id: teamId });
      fetchAuctionState();
    } catch (e) {
      setError(e?.message || 'Bid failed.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSell = async () => {
    if (!selectedSeasonId) return;
    setFormLoading(true);
    setError('');
    try {
      await api.post('/admin/auction/sell', { season_id: parseInt(selectedSeasonId) });
      fetchAuctionState();
      fetchPool();
      fetchRegistrations();
    } catch (e) {
      setError(e?.message || 'Sell failed.');
    } finally {
      setFormLoading(false);
    }
  };

  const seasonName = seasons.find(s => s.season_id == selectedSeasonId)?.name || '';
  const registeredPlayerIds = registrations.map(r => r.player_id);
  const availableToAdd = players.filter(p => !registeredPlayerIds.includes(p.player_id));

  if (loading) return <LoadingFallback message="Loading..." />;

  return (
    <div className="admin-auction-page">
      <h2>Auction – Registrations &amp; Bidding</h2>
      {error && <p className="error-message">{error}</p>}

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="auction-season">Season: </label>
        <select
          id="auction-season"
          value={selectedSeasonId}
          onChange={(e) => setSelectedSeasonId(e.target.value)}
        >
          <option value="">-- Select Season --</option>
          {auctionSeasons.map(s => (
            <option key={s.season_id} value={s.season_id}>{s.name} ({s.year})</option>
          ))}
        </select>
      </div>

      {!selectedSeasonId && <p>Select a season to manage registrations and run the auction.</p>}

      {selectedSeasonId && (
        <>
          <div className="admin-auction-tabs" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className={activeTab === TAB_REGISTRATIONS ? 'active' : ''}
              onClick={() => setActiveTab(TAB_REGISTRATIONS)}
            >
              Registrations &amp; Payments
            </button>
            <button
              type="button"
              className={activeTab === TAB_AUCTION ? 'active' : ''}
              onClick={() => setActiveTab(TAB_AUCTION)}
            >
              Run Auction
            </button>
          </div>

          {activeTab === TAB_REGISTRATIONS && (
            <section className="admin-auction-registrations" style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: 8 }}>
              <h3>Season registrations – {seasonName}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--mpl-text-muted)' }}>Captain £12, Player £7. Without food: £4 less. Confirm payment to add to auction pool.</p>
              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <SearchablePlayerSelect
                  id="add-reg-player"
                  label="Add player to registration"
                  players={availableToAdd}
                  value={addPlayerId}
                  onChange={setAddPlayerId}
                  placeholder="Select player..."
                  disabled={formLoading}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={addWithoutFood}
                    onChange={(e) => setAddWithoutFood(e.target.checked)}
                    disabled={formLoading}
                  />
                  <span>Without food (£4 less)</span>
                </label>
                <button type="button" onClick={handleAddRegistration} disabled={formLoading || !addPlayerId}>
                  Add to list
                </button>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <button type="button" onClick={handleCopyWhatsApp} disabled={registrations.length === 0} style={{ marginRight: '0.5rem' }}>
                  {copyFeedback ? 'Copied!' : 'Copy for WhatsApp'}
                </button>
                <span style={{ fontSize: '0.85rem' }}>Paste in WhatsApp and send.</span>
              </div>
              {formLoading && registrations.length === 0 && <p>Loading...</p>}
              {registrations.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Player</th>
                      <th style={{ textAlign: 'left' }}>Amount due</th>
                      <th style={{ textAlign: 'left' }}>Without food</th>
                      <th style={{ textAlign: 'left' }}>Status</th>
                      <th style={{ textAlign: 'left' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map(reg => (
                      <tr key={reg.id}>
                        <td>{reg.player_name}</td>
                        <td>£{reg.amount_due}</td>
                        <td>
                          {reg.payment_status !== 'paid' ? (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <input
                                type="checkbox"
                                checked={!!reg.without_food}
                                onChange={() => handleToggleWithoutFood(reg)}
                                disabled={updatingRegId === reg.id || formLoading}
                              />
                              <span>{reg.without_food ? 'Yes (£4 less)' : 'No'}</span>
                            </label>
                          ) : (
                            reg.without_food ? 'Yes' : 'No'
                          )}
                        </td>
                        <td>{reg.payment_status === 'paid' ? `Paid £${reg.amount_paid ?? reg.amount_due}` : 'Pending'}</td>
                        <td>
                          {reg.payment_status !== 'paid' && (
                            <button type="button" onClick={() => handleConfirmPayment(reg.id)} disabled={formLoading}>
                              Confirm payment
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )}

          {activeTab === TAB_AUCTION && (
            <section className="admin-auction-run" style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: 8 }}>
              <h3>Run auction – {seasonName}</h3>
              <p style={{ fontSize: '0.9rem' }}>£300 per team, 4 players. Min bid £10; +£5 to £50, then +£10. Captain already at £0.</p>
              {!auctionState?.state && (
                <div style={{ marginBottom: '1rem' }}>
                  <button type="button" onClick={handleStartAuction} disabled={formLoading || pool.length === 0}>
                    Start auction ({pool.length} in pool)
                  </button>
                  {pool.length === 0 && selectedSeasonId && (
                    <span style={{ marginLeft: '0.5rem', color: 'var(--mpl-text-muted)' }}>Confirm payments first to add players to pool.</span>
                  )}
                </div>
              )}
              {auctionState?.state && auctionState.state.status === 'active' && (
                <>
                  <div className="auction-current" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--mpl-surface)', borderRadius: 8 }}>
                    <h4>Current player</h4>
                    {auctionState.currentPlayer ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <img
                          src={`/images/players/${auctionState.currentPlayer.player_id}.jpg`}
                          alt={auctionState.currentPlayer.name}
                          style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.nextSibling;
                            if (fallback) { fallback.style.display = 'flex'; }
                          }}
                        />
                        <span style={{ display: 'none', width: 64, height: 64, borderRadius: '50%', background: '#ccc', flex: '0 0 64px', alignItems: 'center', justifyContent: 'center' }}>{auctionState.currentPlayer.name?.charAt(0)}</span>
                        <div>
                          <strong>{auctionState.currentPlayer.name}</strong>
                          <p>Current bid: £{auctionState.state.current_bid} {auctionState.currentTeamName && `– ${auctionState.currentTeamName}`}</p>
                        </div>
                      </div>
                    ) : (
                      <p>No current player.</p>
                    )}
                  </div>
                  <div className="auction-teams" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                    {(auctionState.teams || []).map(t => (
                      <div key={t.team_id} style={{ border: '1px solid #ccc', padding: '0.75rem', borderRadius: 8, minWidth: 160 }}>
                        <div><strong>{t.name}</strong></div>
                        <div style={{ fontSize: '0.9rem' }}>£{t.budget_remaining} left · {t.slots_remaining}/4 slots</div>
                        <button
                          type="button"
                          onClick={() => handleBid(t.team_id)}
                          disabled={formLoading || t.budget_remaining < (auctionState.state.current_bid < 50 ? auctionState.state.current_bid + 5 : auctionState.state.current_bid + 10)}
                          style={{ marginTop: '0.5rem' }}
                        >
                          Bid
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={handleSell} disabled={formLoading || !auctionState.state.current_team_id}>
                    Sell to current team
                  </button>
                </>
              )}
              {auctionState?.state && auctionState.state.status === 'completed' && (
                <p>Auction completed for this season.</p>
              )}
              {auctionState?.teams && auctionState.teams.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4>Team summary</h4>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {auctionState.teams.map(t => (
                      <li key={t.team_id} style={{ marginBottom: '0.5rem' }}>
                        {t.name}: £{t.budget_remaining} remaining, {t.players_won}/4 players
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {selectedSeasonId && (
        <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
          <a href={`/auction?season_id=${selectedSeasonId}`} target="_blank" rel="noopener noreferrer">Open public auction view</a>
        </p>
      )}
    </div>
  );
}
