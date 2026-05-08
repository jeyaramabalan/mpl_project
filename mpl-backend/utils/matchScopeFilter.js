/**
 * Calendar-year scope for stats (match_datetime) vs season_id.
 * Year filter: [Y-01-01 00:00:00, (Y+1)-01-01 00:00:00).
 */

const MIN_YEAR = 1990;
const MAX_YEAR = 2100;

function parseYearParam(raw) {
    if (raw === undefined || raw === null || raw === '') return null;
    const y = parseInt(String(raw), 10);
    if (Number.isNaN(y) || y < MIN_YEAR || y > MAX_YEAR) return null;
    return y;
}

function yearRangeForMatchDatetime(y) {
    return {
        start: `${y}-01-01 00:00:00`,
        end: `${y + 1}-01-01 00:00:00`,
    };
}

/**
 * @returns {{ mode: 'year', year: number, start: string, end: string, clause: string, params: any[] }
 *   | { mode: 'season', year: null, clause: string, params: any[] }
 *   | { mode: 'all', year: null, clause: string, params: [] }}
 */
function leaderboardMatchScope(season_id, yearRaw) {
    const y = parseYearParam(yearRaw);
    if (y != null) {
        const { start, end } = yearRangeForMatchDatetime(y);
        return {
            mode: 'year',
            year: y,
            start,
            end,
            clause: 'WHERE m.match_datetime >= ? AND m.match_datetime < ?',
            params: [start, end],
        };
    }
    if (season_id === 'all' || season_id === undefined || season_id === null) {
        return { mode: 'all', year: null, clause: '', params: [] };
    }
    const sid = parseInt(season_id, 10);
    if (Number.isNaN(sid)) {
        return { mode: 'all', year: null, clause: '', params: [] };
    }
    return {
        mode: 'season',
        year: null,
        clause: 'WHERE m.season_id = ?',
        params: [sid],
    };
}

module.exports = {
    parseYearParam,
    yearRangeForMatchDatetime,
    leaderboardMatchScope,
    MIN_YEAR,
    MAX_YEAR,
};
