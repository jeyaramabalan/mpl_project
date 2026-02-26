/**
 * Normalize API response to an array.
 * Backend or proxy may return: raw array, or { data: [] }, { players: [] }, { matches: [] }, etc.
 * Use this whenever you set list state from api.get() so all pages work regardless of response shape.
 * @param {*} data - response.data from axios
 * @returns {Array} - always an array (possibly empty)
 */
export function toList(data) {
    if (Array.isArray(data)) return data;
    if (data != null && typeof data === 'object') {
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data.players)) return data.players;
        if (Array.isArray(data.items)) return data.items;
        if (Array.isArray(data.result)) return data.result;
        if (Array.isArray(data.matches)) return data.matches;
        if (Array.isArray(data.seasons)) return data.seasons;
        if (Array.isArray(data.teams)) return data.teams;
        if (Array.isArray(data.standings)) return data.standings;
        if (Array.isArray(data.fixtures)) return data.fixtures;
        const arr = Object.values(data).find((v) => Array.isArray(v));
        return arr || [];
    }
    return [];
}
