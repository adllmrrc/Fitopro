(function (root) {
  const CURRENT_SCHEMA = 2;
  const DEFAULTS = {
    workouts: [],
    stats: { completedWorkouts: 0, completedSets: 0, lastActive: '', streak: 0 },
    history: [],
    settings: {
      weeklyGoal: 4,
      onboarded: false,
      watchBridgeUrl: '',
      watchLiveEnabled: false,
      watchToken: '',
      hrAlertThreshold: 170,
      consentAccepted: false,
      accountEmail: '',
      sessionToken: '',
    },
  };

  function migrate(raw) {
    const migrated = {
      workouts: Array.isArray(raw.workouts) ? raw.workouts : [],
      stats: { ...DEFAULTS.stats, ...(raw.stats || {}) },
      history: Array.isArray(raw.history) ? raw.history : [],
      settings: { ...DEFAULTS.settings, ...(raw.settings || {}) },
    };

    if (!migrated.settings.hrAlertThreshold) migrated.settings.hrAlertThreshold = 170;
    if (typeof migrated.settings.consentAccepted !== 'boolean') migrated.settings.consentAccepted = false;
    return migrated;
  }

  function safeParseItem(key, fallback) {
    try {
      const rawValue = localStorage.getItem(key);
      if (rawValue === null || rawValue === undefined) {
        return JSON.parse(fallback);
      }
      return JSON.parse(rawValue);
    } catch {
      // corrupted localStorage value: fallback to default and reset later
      return JSON.parse(fallback);
    }
  }

  function load() {
    const meta = safeParseItem('fitopro.meta', '{"schema":1}');
    const raw = {
      workouts: safeParseItem('fitopro.workouts', '[]'),
      stats: safeParseItem('fitopro.stats', '{}'),
      history: safeParseItem('fitopro.history', '[]'),
      settings: safeParseItem('fitopro.settings', '{}'),
    };

    const result = migrate(raw);
    if ((meta.schema || 1) < CURRENT_SCHEMA) {
      localStorage.setItem('fitopro.meta', JSON.stringify({ schema: CURRENT_SCHEMA }));
      localStorage.setItem('fitopro.settings', JSON.stringify(result.settings));
    }
    return result;
  }

  function persist(state) {
    localStorage.setItem('fitopro.workouts', JSON.stringify(state.workouts));
    localStorage.setItem('fitopro.stats', JSON.stringify(state.stats));
    localStorage.setItem('fitopro.history', JSON.stringify(state.history));
    localStorage.setItem('fitopro.settings', JSON.stringify(state.settings));
    localStorage.setItem('fitopro.meta', JSON.stringify({ schema: CURRENT_SCHEMA }));
  }

  const api = { load, persist, DEFAULTS, CURRENT_SCHEMA };
  root.FitState = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
