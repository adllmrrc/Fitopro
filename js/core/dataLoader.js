(() => {
  const DEFAULT_SETTINGS = {
    sound: true,
    rest_timer: true,
    haptic: true,
    notifications: true,
  };

  async function loadUserData(currentUser = window.state?.user) {
    if (!currentUser?.id) return;

    const uid = currentUser.id;

    try {
      const { data: profile, error: profileError } = await window.sb
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile) {
        window.state.profile = {
          ...window.state.profile,
          ...profile,
          preferred_equipment:
            profile.preferred_equipment ||
            profile.settings?.preferred_equipment ||
            window.state.profile?.preferred_equipment ||
            "mixed",
          favorite_exercises:
            profile.favorite_exercises ||
            profile.settings?.favorite_exercises ||
            window.state.profile?.favorite_exercises ||
            [],
          recent_exercises:
            profile.recent_exercises ||
            profile.settings?.recent_exercises ||
            window.state.profile?.recent_exercises ||
            [],
          starter_pack_applied:
            typeof profile.starter_pack_applied === "boolean"
              ? profile.starter_pack_applied
              : !!profile.settings?.starter_pack_applied,
          settings: {
            ...DEFAULT_SETTINGS,
            ...(window.state.profile?.settings || {}),
            ...(profile.settings || {}),
          },
        };
      }

      const { data: sessions, error: sessionError } = await window.sb
        .from("workout_sessions")
        .select("*")
        .eq("user_id", uid)
        .order("started_at", { ascending: false })
        .limit(100);

      if (sessionError) throw sessionError;
      if (sessions) window.state.sessions = sessions;

      const { data: workouts, error: workoutError } = await window.sb
        .from("workouts")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (workoutError) throw workoutError;
      if (workouts) window.state.workouts = workouts;

      const { data: prs, error: prError } = await window.sb
        .from("personal_records")
        .select("*")
        .eq("user_id", uid);

      if (prError) throw prError;

      if (prs) {
        window.state.prs = {};
        prs.forEach((pr) => {
          window.state.prs[pr.exercise_name] = {
            id: pr.id,
            weight: pr.weight,
            reps: pr.reps,
            date: pr.recorded_at,
            recorded_at: pr.recorded_at,
          };
        });
      }

      window.persist();
    } catch (err) {
      console.error("Load data error:", err);
    }
  }

  window.loadUserData = loadUserData;
})();
