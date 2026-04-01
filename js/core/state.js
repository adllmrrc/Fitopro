(() => {
  const LS = {
    get: (k, def = {}) => {
      try {
        return JSON.parse(localStorage.getItem("fp3." + k) || "null") ?? def;
      } catch {
        return def;
      }
    },
    set: (k, v) => {
      try {
        localStorage.setItem("fp3." + k, JSON.stringify(v));
      } catch {}
    },
    rm: (k) => localStorage.removeItem("fp3." + k),
  };

  const state = {
    user: null,
    profile: LS.get("profile", {
      display_name: "Athlete",
      weekly_goal: 4,
      experience_level: "intermediate",
      preferred_equipment: "mixed",
      body_weight: 75,
      xp: 0,
      level: 1,
      badges: [],
      favorite_exercises: [],
      recent_exercises: [],
      starter_pack_applied: false,
      settings: { sound: true, rest_timer: true, haptic: true, notifications: true },
      onboarded: false,
    }),
    sessions: LS.get("sessions", []),
    workouts: LS.get("workouts", []),
    prs: LS.get("prs", {}),
    pending: LS.get("pending", []),
    syncing: false,
  };

  function persist() {
    LS.set("profile", state.profile);
    LS.set("sessions", state.sessions);
    LS.set("workouts", state.workouts);
    LS.set("prs", state.prs);
    LS.set("pending", state.pending);
  }

  window.LS = LS;
  window.state = state;
  window.persist = persist;
})();
