/**
 * Metro (via expo) uses Array.prototype.toReversed (ES2023), which Node 18 lacks.
 * Prefer Node.js 20.19+ for this project; this lets `npm start` run on Node 18 if needed.
 */
if (typeof Array.prototype.toReversed !== 'function') {
  Object.defineProperty(Array.prototype, 'toReversed', {
    value: function toReversed() {
      return [...this].reverse();
    },
    writable: true,
    configurable: true,
  });
}
