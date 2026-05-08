// mpl-project/mpl-backend/controllers/admin/auctionController.js
// Season registrations (payment tracking), auction pool, and auction state.
// Captain £12, Player £7. Without food: £4 less (Captain £8, Player £3). Auction: £300/team, 4 players, min £10.

const pool = require('../../config/db');

const CAPTAIN_FEE = 12;
const PLAYER_FEE = 7;
const FOOD_DISCOUNT = 4;
const AUCTION_BUDGET = 300;
const MIN_BID = 10;
const BID_INCREMENT_UNDER_50 = 5;
const BID_INCREMENT_OVER_50 = 10;
const SLOTS_PER_TEAM = 4;

function nextBid(current) {
  const c = Number(current) || MIN_BID;
  if (c < 50) return c + BID_INCREMENT_UNDER_50;
  return c + BID_INCREMENT_OVER_50;
}

function parseAuctionPools(poolOrderRaw) {
  const parsed = poolOrderRaw && (typeof poolOrderRaw === 'string' ? JSON.parse(poolOrderRaw) : poolOrderRaw);
  // Backward compatibility: old format was a simple array.
  if (Array.isArray(parsed)) return { main: parsed, unsold: [] };
  return {
    main: Array.isArray(parsed?.main) ? parsed.main : [],
    unsold: Array.isArray(parsed?.unsold) ? parsed.unsold : [],
  };
}

function serializeAuctionPools(pools) {
  return JSON.stringify({ main: pools.main || [], unsold: pools.unsold || [] });
}

function getActiveQueue(pools) {
  if ((pools.main || []).length > 0) return { queue: pools.main, phase: 'main' };
  return { queue: pools.unsold || [], phase: 'unsold' };
}

// GET /api/admin/auction/registrations?season_id=X
exports.getRegistrations = async (req, res, next) => {
  const { season_id } = req.query;
  if (!season_id || isNaN(parseInt(season_id))) {
    return res.status(400).json({ message: 'Valid season_id is required.' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT sr.id, sr.season_id, sr.player_id, sr.payment_status, sr.amount_paid, sr.paid_at, sr.created_at,
              COALESCE(sr.without_food, 0) as without_food,
              p.name as player_name,
              (CASE WHEN t.captain_player_id = p.player_id THEN ? ELSE ? END)
                - (CASE WHEN COALESCE(sr.without_food, 0) = 1 THEN ? ELSE 0 END) as amount_due
       FROM season_registrations sr
       JOIN players p ON p.player_id = sr.player_id
       LEFT JOIN teams t ON t.season_id = sr.season_id AND t.captain_player_id = p.player_id
       WHERE sr.season_id = ?
       ORDER BY sr.payment_status ASC, p.name ASC`,
      [CAPTAIN_FEE, PLAYER_FEE, FOOD_DISCOUNT, season_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('getRegistrations:', err);
    next(err);
  }
};

// POST /api/admin/auction/registrations
// Body: { season_id, player_id, without_food?: boolean }
exports.addRegistration = async (req, res, next) => {
  const { season_id, player_id, without_food } = req.body;
  if (!season_id || !player_id || isNaN(parseInt(season_id)) || isNaN(parseInt(player_id))) {
    return res.status(400).json({ message: 'season_id and player_id are required.' });
  }
  const withoutFood = Boolean(without_food);
  try {
    const [seasonCheck] = await pool.query('SELECT 1 FROM seasons WHERE season_id = ?', [season_id]);
    if (seasonCheck.length === 0) return res.status(404).json({ message: 'Season not found.' });
    const [playerCheck] = await pool.query('SELECT 1 FROM players WHERE player_id = ?', [player_id]);
    if (playerCheck.length === 0) return res.status(404).json({ message: 'Player not found.' });
    await pool.query(
      `INSERT INTO season_registrations (season_id, player_id, payment_status, without_food)
       VALUES (?, ?, 'pending', ?)
       ON DUPLICATE KEY UPDATE without_food = VALUES(without_food)`,
      [season_id, player_id, withoutFood ? 1 : 0]
    );
    const [rows] = await pool.query(
      'SELECT id, season_id, player_id, payment_status, amount_paid, paid_at, without_food FROM season_registrations WHERE season_id = ? AND player_id = ?',
      [season_id, player_id]
    );
    res.status(201).json(rows[0] || { message: 'Registered.' });
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({ message: 'Database missing without_food column. Run scripts/add-without-food-registration.sql' });
    }
    console.error('addRegistration:', err);
    next(err);
  }
};

// PATCH /api/admin/auction/registrations/:id — Body: { without_food?: boolean }. Only for pending.
exports.updateRegistration = async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ message: 'Invalid registration ID.' });
  const { without_food } = req.body;
  try {
    const [reg] = await pool.query('SELECT id, payment_status FROM season_registrations WHERE id = ?', [id]);
    if (reg.length === 0) return res.status(404).json({ message: 'Registration not found.' });
    if (reg[0].payment_status === 'paid') return res.status(400).json({ message: 'Cannot change option after payment.' });
    const withoutFood = Boolean(without_food);
    await pool.query('UPDATE season_registrations SET without_food = ? WHERE id = ?', [withoutFood ? 1 : 0, id]);
    const [updated] = await pool.query('SELECT * FROM season_registrations WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('updateRegistration:', err);
    next(err);
  }
};

// POST /api/admin/auction/registrations/:id/confirm-payment
exports.confirmPayment = async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ message: 'Invalid registration ID.' });
  try {
    const [reg] = await pool.query('SELECT id, season_id, player_id, without_food FROM season_registrations WHERE id = ?', [id]);
    if (reg.length === 0) return res.status(404).json({ message: 'Registration not found.' });
    const { season_id, player_id, without_food } = reg[0];
    const [captainCheck] = await pool.query(
      'SELECT 1 FROM teams WHERE season_id = ? AND captain_player_id = ?',
      [season_id, player_id]
    );
    const baseAmount = captainCheck.length > 0 ? CAPTAIN_FEE : PLAYER_FEE;
    const discount = (without_food === 1 || without_food === true) ? FOOD_DISCOUNT : 0;
    const amount = baseAmount - discount;
    await pool.query(
      'UPDATE season_registrations SET payment_status = ?, amount_paid = ?, paid_at = NOW() WHERE id = ?',
      ['paid', amount, id]
    );
    const [updated] = await pool.query('SELECT * FROM season_registrations WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('confirmPayment:', err);
    next(err);
  }
};

// GET /api/admin/auction/pool?season_id=X — paid registrations not yet in any team (auction pool)
exports.getAuctionPool = async (req, res, next) => {
  const { season_id } = req.query;
  if (!season_id || isNaN(parseInt(season_id))) {
    return res.status(400).json({ message: 'Valid season_id is required.' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT sr.player_id, p.name as player_name
       FROM season_registrations sr
       JOIN players p ON p.player_id = sr.player_id
       WHERE sr.season_id = ? AND sr.payment_status = 'paid'
         AND sr.player_id NOT IN (SELECT player_id FROM teamplayers WHERE season_id = ?)
       ORDER BY p.name ASC`,
      [season_id, season_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('getAuctionPool:', err);
    next(err);
  }
};

/** Budget slots + captain + auction purchases per team (same season). */
async function buildAuctionTeamsAndRosters(seasonId) {
  const [teams] = await pool.query(
    `SELECT t.team_id, t.name, t.budget,
            COALESCE(SUM(CASE WHEN tp.is_captain = 0 THEN tp.purchase_price ELSE 0 END), 0) as spent,
            COUNT(CASE WHEN tp.is_captain = 0 THEN 1 END) as players_won
     FROM teams t
     LEFT JOIN teamplayers tp ON tp.team_id = t.team_id AND tp.season_id = t.season_id
     WHERE t.season_id = ?
     GROUP BY t.team_id, t.name, t.budget`,
    [seasonId]
  );

  const [captainRows] = await pool.query(
    `SELECT t.team_id, t.captain_player_id, cap.name AS captain_name
     FROM teams t
     LEFT JOIN players cap ON cap.player_id = t.captain_player_id
     WHERE t.season_id = ?`,
    [seasonId]
  );
  const captainByTeam = new Map(captainRows.map((r) => [r.team_id, r]));

  const [purchaseRows] = await pool.query(
    `SELECT tp.team_id, tp.player_id, p.name AS player_name, tp.purchase_price
     FROM teamplayers tp
     JOIN players p ON p.player_id = tp.player_id
     WHERE tp.season_id = ? AND tp.is_captain = 0
     ORDER BY tp.team_id, p.name`,
    [seasonId]
  );
  const purchasesByTeam = new Map();
  for (const row of purchaseRows) {
    const tid = row.team_id;
    if (!purchasesByTeam.has(tid)) purchasesByTeam.set(tid, []);
    purchasesByTeam.get(tid).push({
      player_id: row.player_id,
      name: row.player_name,
      purchase_price: Number(row.purchase_price) || 0,
    });
  }

  const team_rosters = teams.map((t) => {
    const cap = captainByTeam.get(t.team_id);
    const captain =
      cap && cap.captain_player_id
        ? {
            player_id: cap.captain_player_id,
            name: cap.captain_name || 'Captain',
            price: 0,
          }
        : null;
    return {
      team_id: t.team_id,
      name: t.name,
      captain,
      purchases: purchasesByTeam.get(t.team_id) || [],
    };
  });

  const teamsWithSlotsSync = teams.map((t) => {
    const spent = Number(t.spent) || 0;
    const budget = Number(t.budget) || AUCTION_BUDGET;
    const wins = Number(t.players_won) || 0;
    return {
      team_id: t.team_id,
      name: t.name,
      budget_total: budget,
      budget_spent: spent,
      budget_remaining: budget - spent,
      players_won: wins,
      slots_remaining: SLOTS_PER_TEAM - wins,
    };
  });
  return { teamsWithSlotsSync, team_rosters };
}

// GET /api/admin/auction/state?season_id=X (admin and public)
exports.getAuctionState = async (req, res, next) => {
  const { season_id } = req.query;
  if (!season_id || isNaN(parseInt(season_id))) {
    return res.status(400).json({ message: 'Valid season_id is required.' });
  }
  try {
    const [stateRows] = await pool.query(
      'SELECT season_id, pool_order, current_pool_index, current_bid, current_team_id, status FROM auction_state WHERE season_id = ?',
      [season_id]
    );
    const state = stateRows[0] || null;
    const { teamsWithSlotsSync, team_rosters } = await buildAuctionTeamsAndRosters(season_id);
    if (!state) {
      return res.json({
        state: null,
        currentPlayer: null,
        currentTeamName: null,
        teams: teamsWithSlotsSync,
        team_rosters,
      });
    }
    const pools = parseAuctionPools(state.pool_order);
    const active = getActiveQueue(pools);
    const currentPlayerId = active.queue[state.current_pool_index] || null;
    let currentPlayer = null;
    if (currentPlayerId) {
      const [p] = await pool.query('SELECT player_id, name FROM players WHERE player_id = ?', [currentPlayerId]);
      currentPlayer = p[0] || null;
    }
    let currentTeamName = null;
    if (state.current_team_id) {
      const [t] = await pool.query('SELECT name FROM teams WHERE team_id = ?', [state.current_team_id]);
      currentTeamName = t[0] ? t[0].name : null;
    }
    res.json({
      state: {
        season_id: state.season_id,
        current_pool_index: state.current_pool_index,
        current_bid: state.current_bid,
        current_team_id: state.current_team_id,
        status: state.status,
        current_phase: active.phase,
        pool_length: active.queue.length,
        main_pool_length: pools.main.length,
        unsold_pool_length: pools.unsold.length,
      },
      currentPlayer,
      currentTeamName,
      teams: teamsWithSlotsSync,
      team_rosters,
    });
  } catch (err) {
    console.error('getAuctionState:', err);
    next(err);
  }
};

// POST /api/admin/auction/start — Body: { season_id }. Build pool from paid registrations not in team, init state.
exports.startAuction = async (req, res, next) => {
  const { season_id } = req.body;
  if (!season_id || isNaN(parseInt(season_id))) {
    return res.status(400).json({ message: 'season_id is required.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [poolPlayers] = await connection.query(
      `SELECT sr.player_id FROM season_registrations sr
       WHERE sr.season_id = ? AND sr.payment_status = 'paid'
         AND sr.player_id NOT IN (SELECT player_id FROM teamplayers WHERE season_id = ?)`,
      [season_id, season_id]
    );
    const poolOrder = poolPlayers.map(r => r.player_id);
    const pools = { main: poolOrder, unsold: [] };
    const startIndex = 0;
    await connection.query(
      `INSERT INTO auction_state (season_id, pool_order, current_pool_index, current_bid, current_team_id, status)
       VALUES (?, ?, ?, ?, NULL, 'active')
       ON DUPLICATE KEY UPDATE pool_order = VALUES(pool_order), current_pool_index = VALUES(current_pool_index), current_bid = ?, current_team_id = NULL, status = 'active'`,
      [season_id, serializeAuctionPools(pools), startIndex, MIN_BID, MIN_BID]
    );
    await connection.commit();
    res.json({ message: 'Auction started.', pool_size: poolOrder.length });
  } catch (err) {
    await connection.rollback();
    console.error('startAuction:', err);
    next(err);
  } finally {
    connection.release();
  }
};

// POST /api/admin/auction/bid — Body: { season_id, team_id }. Increase bid for that team (if allowed).
exports.placeBid = async (req, res, next) => {
  const { season_id, team_id } = req.body;
  if (!season_id || !team_id || isNaN(parseInt(season_id)) || isNaN(parseInt(team_id))) {
    return res.status(400).json({ message: 'season_id and team_id are required.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [stateRows] = await connection.query(
      'SELECT pool_order, current_pool_index, current_bid, current_team_id, status FROM auction_state WHERE season_id = ? FOR UPDATE',
      [season_id]
    );
    if (stateRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Auction not started for this season.' });
    }
    const state = stateRows[0];
    if (state.status !== 'active') {
      await connection.rollback();
      return res.status(400).json({ message: 'Auction is not active.' });
    }
    const pools = parseAuctionPools(state.pool_order);
    const active = getActiveQueue(pools);
    if (state.current_pool_index >= active.queue.length) {
      await connection.rollback();
      return res.status(400).json({ message: 'No current player in pool.' });
    }
    // First bid for this player stays at minimum (10); subsequent bids increment
    const currentBidVal = Number(state.current_bid) || MIN_BID;
    const newBid = state.current_team_id != null ? nextBid(currentBidVal) : currentBidVal;
    const [teamRows] = await connection.query(
      'SELECT team_id, budget FROM teams WHERE team_id = ? AND season_id = ?',
      [team_id, season_id]
    );
    if (teamRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Team not found for this season.' });
    }
    const budgetTotal = Number(teamRows[0].budget) || AUCTION_BUDGET;
    const [spentRows] = await connection.query(
      'SELECT COALESCE(SUM(purchase_price), 0) as spent FROM teamplayers WHERE team_id = ? AND season_id = ? AND is_captain = 0',
      [team_id, season_id]
    );
    const spent = Number(spentRows[0].spent) || 0;
    const remaining = budgetTotal - spent;
    if (remaining < newBid) {
      await connection.rollback();
      return res.status(400).json({ message: `Team does not have enough budget. Remaining: £${remaining}, bid would be £${newBid}.` });
    }
    const [winsRows] = await connection.query(
      'SELECT COUNT(*) as c FROM teamplayers WHERE team_id = ? AND season_id = ? AND is_captain = 0',
      [team_id, season_id]
    );
    const wins = Number(winsRows[0].c) || 0;
    const slotsLeftAfter = SLOTS_PER_TEAM - wins - 1;
    const budgetLeftAfter = remaining - newBid;
    if (slotsLeftAfter > 0 && budgetLeftAfter < slotsLeftAfter * MIN_BID) {
      await connection.rollback();
      return res.status(400).json({ message: `After this bid team would have £${budgetLeftAfter} left for ${slotsLeftAfter} slot(s). Minimum £${MIN_BID} per slot required.` });
    }
    await connection.query(
      'UPDATE auction_state SET current_bid = ?, current_team_id = ? WHERE season_id = ?',
      [newBid, team_id, season_id]
    );
    await connection.commit();
    res.json({ current_bid: newBid, current_team_id: team_id });
  } catch (err) {
    await connection.rollback();
    console.error('placeBid:', err);
    next(err);
  } finally {
    connection.release();
  }
};

// POST /api/admin/auction/sell — Body: { season_id }. Assign current player to current team at current bid, advance.
exports.sellPlayer = async (req, res, next) => {
  const { season_id } = req.body;
  if (!season_id || isNaN(parseInt(season_id))) {
    return res.status(400).json({ message: 'season_id is required.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [stateRows] = await connection.query(
      'SELECT pool_order, current_pool_index, current_bid, current_team_id, status FROM auction_state WHERE season_id = ? FOR UPDATE',
      [season_id]
    );
    if (stateRows.length === 0 || stateRows[0].status !== 'active') {
      await connection.rollback();
      return res.status(400).json({ message: 'Auction not active.' });
    }
    const state = stateRows[0];
    const pools = parseAuctionPools(state.pool_order);
    const active = getActiveQueue(pools);
    const idx = state.current_pool_index;
    if (idx >= active.queue.length || !state.current_team_id) {
      await connection.rollback();
      return res.status(400).json({ message: 'No current player or no leading team.' });
    }
    const playerId = active.queue[idx];
    const teamId = state.current_team_id;
    const bid = state.current_bid;
    await connection.query(
      'INSERT INTO teamplayers (team_id, player_id, season_id, purchase_price, is_captain) VALUES (?, ?, ?, ?, 0)',
      [teamId, playerId, season_id, bid]
    );
    await connection.query('UPDATE players SET current_team_id = ? WHERE player_id = ?', [teamId, playerId]);
    const remainingActive = [...active.queue.slice(0, idx), ...active.queue.slice(idx + 1)];
    if (active.phase === 'main') pools.main = remainingActive;
    else pools.unsold = remainingActive;
    const nextActive = getActiveQueue(pools);
    const nextBidVal = MIN_BID;
    const nextTeamId = null;
    const newStatus = nextActive.queue.length === 0 ? 'completed' : 'active';
    const nextIndex = 0;
    await connection.query(
      'UPDATE auction_state SET pool_order = ?, current_pool_index = ?, current_bid = ?, current_team_id = ?, status = ? WHERE season_id = ?',
      [serializeAuctionPools(pools), nextIndex, nextBidVal, nextTeamId, newStatus, season_id]
    );
    await connection.commit();
    res.json({
      message: 'Player sold.',
      sold_player_id: playerId,
      sold_to_team_id: teamId,
      sold_at_bid: bid,
      next_pool_index: nextIndex,
      pool_remaining: nextActive.queue.length,
      auction_status: newStatus,
    });
  } catch (err) {
    await connection.rollback();
    console.error('sellPlayer:', err);
    next(err);
  } finally {
    connection.release();
  }
};

/** Move current player to unsold pool; continue main queue first. */
function computePoolAfterPark(pools, idx) {
  const active = getActiveQueue(pools);
  if (!active.queue.length || idx < 0 || idx >= active.queue.length) return null;
  const playerId = active.queue[idx];
  const rest = [...active.queue.slice(0, idx), ...active.queue.slice(idx + 1)];
  const updatedPools = {
    main: [...(pools.main || [])],
    unsold: [...(pools.unsold || [])],
  };
  if (active.phase === 'main') updatedPools.main = rest;
  else updatedPools.unsold = rest;
  updatedPools.unsold.push(playerId);
  const nextActive = getActiveQueue(updatedPools);
  return { pools: updatedPools, nextIndex: 0, parked_player_id: playerId, pool_remaining: nextActive.queue.length };
}

// POST /api/admin/auction/park — Body: { season_id }. Unsold: move current player to end of pool, reset bid.
exports.parkUnsoldPlayer = async (req, res, next) => {
  const { season_id } = req.body;
  if (!season_id || isNaN(parseInt(season_id))) {
    return res.status(400).json({ message: 'season_id is required.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [stateRows] = await connection.query(
      'SELECT pool_order, current_pool_index, status FROM auction_state WHERE season_id = ? FOR UPDATE',
      [season_id]
    );
    if (stateRows.length === 0 || stateRows[0].status !== 'active') {
      await connection.rollback();
      return res.status(400).json({ message: 'Auction not active.' });
    }
    const state = stateRows[0];
    const pools = parseAuctionPools(state.pool_order);
    const active = getActiveQueue(pools);
    const idx = state.current_pool_index;
    if (idx >= active.queue.length || active.queue.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'No current player in pool.' });
    }
    if (active.queue.length === 1 && (active.phase === 'unsold' || pools.main.length === 0)) {
      await connection.rollback();
      return res.status(400).json({ message: 'Cannot park: only one player left in the pool. Use Sell or add more players.' });
    }
    const result = computePoolAfterPark(pools, idx);
    if (!result) {
      await connection.rollback();
      return res.status(400).json({ message: 'Could not park player.' });
    }
    const { pools: updatedPools, nextIndex, parked_player_id, pool_remaining } = result;
    const nextActive = getActiveQueue(updatedPools);
    await connection.query(
      'UPDATE auction_state SET pool_order = ?, current_pool_index = ?, current_bid = ?, current_team_id = NULL, status = ? WHERE season_id = ?',
      [serializeAuctionPools(updatedPools), nextIndex, MIN_BID, nextActive.queue.length === 0 ? 'completed' : 'active', season_id]
    );
    await connection.commit();
    res.json({
      message: 'Player parked to end of queue.',
      parked_player_id,
      next_pool_index: nextIndex,
      pool_remaining,
    });
  } catch (err) {
    await connection.rollback();
    console.error('parkUnsoldPlayer:', err);
    next(err);
  } finally {
    connection.release();
  }
};
