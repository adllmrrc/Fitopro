(() => {
  const DEFAULT_SETTINGS = {
    sound: true,
    rest_timer: true,
    haptic: true,
    notifications: true,
  };

  function makeId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function persistAndCache() {
    window.persist();
    window.cache.save("app_state", window.state);
  }

  function queueIfSignedIn(action, payload) {
    if (!window.state.user?.id) return false;
    window.addToQueue(action, payload);
    return true;
  }

  function normalizeProfile(updates = {}) {
    const mergedSettings = {
      ...DEFAULT_SETTINGS,
      ...(window.state.profile?.settings || {}),
      ...(updates.settings || {}),
    };

    return {
      ...window.state.profile,
      ...updates,
      preferred_equipment:
        updates.preferred_equipment ||
        updates.settings?.preferred_equipment ||
        window.state.profile?.preferred_equipment ||
        window.state.profile?.settings?.preferred_equipment ||
        "mixed",
      favorite_exercises: Array.isArray(updates.favorite_exercises)
        ? updates.favorite_exercises
        : Array.isArray(updates.settings?.favorite_exercises)
          ? updates.settings.favorite_exercises
        : Array.isArray(window.state.profile?.favorite_exercises)
          ? window.state.profile.favorite_exercises
          : Array.isArray(window.state.profile?.settings?.favorite_exercises)
            ? window.state.profile.settings.favorite_exercises
          : [],
      recent_exercises: Array.isArray(updates.recent_exercises)
        ? updates.recent_exercises
        : Array.isArray(updates.settings?.recent_exercises)
          ? updates.settings.recent_exercises
        : Array.isArray(window.state.profile?.recent_exercises)
          ? window.state.profile.recent_exercises
          : Array.isArray(window.state.profile?.settings?.recent_exercises)
            ? window.state.profile.settings.recent_exercises
          : [],
      starter_pack_applied:
        typeof updates.starter_pack_applied === "boolean"
          ? updates.starter_pack_applied
          : typeof updates.settings?.starter_pack_applied === "boolean"
            ? updates.settings.starter_pack_applied
          : !!window.state.profile?.starter_pack_applied,
      settings: {
        ...mergedSettings,
        preferred_equipment:
          updates.preferred_equipment ||
          mergedSettings.preferred_equipment ||
          window.state.profile?.preferred_equipment ||
          "mixed",
        favorite_exercises: Array.isArray(updates.favorite_exercises)
          ? updates.favorite_exercises
          : Array.isArray(mergedSettings.favorite_exercises)
            ? mergedSettings.favorite_exercises
            : Array.isArray(window.state.profile?.favorite_exercises)
              ? window.state.profile.favorite_exercises
              : [],
        recent_exercises: Array.isArray(updates.recent_exercises)
          ? updates.recent_exercises
          : Array.isArray(mergedSettings.recent_exercises)
            ? mergedSettings.recent_exercises
            : Array.isArray(window.state.profile?.recent_exercises)
              ? window.state.profile.recent_exercises
              : [],
        starter_pack_applied:
          typeof updates.starter_pack_applied === "boolean"
            ? updates.starter_pack_applied
            : typeof mergedSettings.starter_pack_applied === "boolean"
              ? mergedSettings.starter_pack_applied
              : !!window.state.profile?.starter_pack_applied,
      },
    };
  }

  function normalizeWorkout(workout = {}) {
    return {
      ...workout,
      id: workout.id || makeId("workout"),
      user_id: workout.user_id || window.state.user?.id || null,
      created_at: workout.created_at || workout.createdAt || new Date().toISOString(),
    };
  }

  function normalizeSession(sessionData = {}) {
    const startedAt = sessionData.started_at || sessionData.date || new Date().toISOString();
    return {
      ...sessionData,
      id: sessionData.id || makeId("session"),
      user_id: sessionData.user_id || window.state.user?.id || null,
      started_at: startedAt,
      date: sessionData.date || startedAt,
      status: sessionData.status || "completed",
    };
  }

  function isBetterPR(current, nextWeight, nextReps) {
    if (!current) return true;
    if (nextWeight > (current.weight || 0)) return true;
    return nextWeight === (current.weight || 0) && nextReps > (current.reps || 0);
  }

  async function addSession(sessionData) {
    const session = normalizeSession(sessionData);
    window.state.sessions = [
      session,
      ...window.state.sessions.filter((entry) => entry.id !== session.id),
    ];
    persistAndCache();

    if (queueIfSignedIn("ADD_SESSION", session)) {
      await window.sync();
    }

    return session;
  }

  async function addWorkout(workout) {
    const normalizedWorkout = normalizeWorkout(workout);
    window.state.workouts = [
      normalizedWorkout,
      ...window.state.workouts.filter((entry) => entry.id !== normalizedWorkout.id),
    ];
    persistAndCache();

    if (queueIfSignedIn("ADD_WORKOUT", normalizedWorkout)) {
      await window.sync();
    }

    return normalizedWorkout;
  }

  async function deleteWorkout(id) {
    window.state.workouts = window.state.workouts.filter((workout) => workout.id !== id);
    persistAndCache();

    if (queueIfSignedIn("DELETE_WORKOUT", { id, user_id: window.state.user.id })) {
      await window.sync();
    }
  }

  async function updateWorkout(workout) {
    const normalizedWorkout = normalizeWorkout(workout);
    const index = window.state.workouts.findIndex((entry) => entry.id === normalizedWorkout.id);

    if (index === -1) window.state.workouts.unshift(normalizedWorkout);
    else window.state.workouts[index] = normalizedWorkout;

    persistAndCache();

    if (queueIfSignedIn("UPDATE_WORKOUT", normalizedWorkout)) {
      await window.sync();
    }

    return normalizedWorkout;
  }

  async function updateProfile(updates) {
    window.state.profile = normalizeProfile(updates);
    persistAndCache();

    if (queueIfSignedIn("UPDATE_PROFILE", window.state.profile)) {
      await window.sync();
    }

    return window.state.profile;
  }

  async function savePR(exerciseName, weight, reps) {
    const current = window.state.prs[exerciseName];
    const nextWeight = Number(weight) || 0;
    const nextReps = Number(reps) || 0;

    if (!isBetterPR(current, nextWeight, nextReps)) {
      return false;
    }

    const pr = {
      ...(current || {}),
      user_id: window.state.user?.id || null,
      exercise_name: exerciseName,
      weight: nextWeight,
      reps: nextReps,
      recorded_at: new Date().toISOString(),
      date: new Date().toISOString(),
    };

    window.state.prs[exerciseName] = pr;
    persistAndCache();

    if (queueIfSignedIn("ADD_PR", pr)) {
      await window.sync();
    }

    return true;
  }

  async function loadAllUserData(currentUser = window.state.user) {
    if (!currentUser?.id) return window.state;

    const uid = currentUser.id;

    try {
      const { data: profile, error: profileError } = await window.sb
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile) {
        window.state.profile = normalizeProfile(profile);
      }

      const { data: sessions, error: sessionError } = await window.sb
        .from("workout_sessions")
        .select("*")
        .eq("user_id", uid)
        .order("started_at", { ascending: false })
        .limit(100);

      if (sessionError) throw sessionError;
      if (sessions) window.state.sessions = sessions.map(normalizeSession);

      const { data: workouts, error: workoutError } = await window.sb
        .from("workouts")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (workoutError) throw workoutError;
      if (workouts) window.state.workouts = workouts.map(normalizeWorkout);

      const { data: prsData, error: prError } = await window.sb
        .from("personal_records")
        .select("*")
        .eq("user_id", uid);

      if (prError) throw prError;

      if (prsData) {
        window.state.prs = {};
        prsData.forEach((pr) => {
          window.state.prs[pr.exercise_name] = {
            ...pr,
            date: pr.recorded_at,
          };
        });
      }

      persistAndCache();
    } catch (err) {
      console.error("Load failed:", err);
    }

    return window.state;
  }

  async function flushQueue() {
    return window.sync();
  }

  window.addSession = addSession;
  window.addWorkout = addWorkout;
  window.deleteWorkout = deleteWorkout;
  window.updateWorkout = updateWorkout;
  window.updateProfile = updateProfile;
  window.savePR = savePR;
  window.loadAllUserData = loadAllUserData;
  window.flushQueue = flushQueue;
})();
