// Root app entrypoint. Required by npm style checks (node --check app.js).
// Actual UI implementation lives in public/app.js, which relies on browser DOM.
module.exports = {
  info: 'Use public/app.js in browser context',
};
