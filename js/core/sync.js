(() => {
  const QUEUE_KEY = "sync_queue";

  function readQueue() {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function writeQueue(queue) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {}
  }

  function getCurrentUserId() {
    return window.state?.user?.id || null;
  }

  function buildProfilePayload(profile, userId) {
    const source = profile && typeof profile === "object" ? profile : {};
    const {
      display_name,
      bio,
      weekly_goal,
      body_weight,
      height,
      age,
      experience_level,
      avatar_url,
      xp,
      level,
      total_workouts,
      badges,
      onboarded,
      settings,
      preferred_equipment,
      favorite_exercises,
      recent_exercises,
      starter_pack_applied,
    } = source;

    return {
      id: userId,
      display_name,
      bio,
      weekly_goal,
      body_weight,
      height,
      age,
      experience_level,
      avatar_url,
      xp,
      level,
      total_workouts,
      badges,
      onboarded,
      settings: {
        ...(settings || {}),
        preferred_equipment:
          preferred_equipment ||
          settings?.preferred_equipment ||
          "mixed",
        favorite_exercises: Array.isArray(favorite_exercises)
          ? favorite_exercises
          : Array.isArray(settings?.favorite_exercises)
            ? settings.favorite_exercises
            : [],
        recent_exercises: Array.isArray(recent_exercises)
          ? recent_exercises
          : Array.isArray(settings?.recent_exercises)
            ? settings.recent_exercises
            : [],
        starter_pack_applied:
          typeof starter_pack_applied === "boolean"
            ? starter_pack_applied
            : !!settings?.starter_pack_applied,
      },
    };
  }

  let syncQueue = readQueue();

  async function sync() {
    syncQueue = readQueue();

    if (!syncQueue.length || !getCurrentUserId()) {
      return syncQueue.length === 0;
    }

    for (let i = 0; i < syncQueue.length; i++) {
      const item = syncQueue[i];
      const userId = item.payload?.user_id || item.user_id || getCurrentUserId();
      const payload =
        item.payload && typeof item.payload === "object"
          ? { ...item.payload, user_id: item.payload.user_id || userId }
          : item.payload;

      try {
        let error = null;

        switch (item.action) {
          case "ADD_SESSION":
            ({ error } = await window.sb.from("workout_sessions").insert(payload));
            break;

          case "ADD_WORKOUT":
            ({ error } = await window.sb.from("workouts").insert(payload));
            break;

          case "DELETE_WORKOUT":
            ({ error } = await window.sb
              .from("workouts")
              .delete()
              .eq("id", payload.id)
              .eq("user_id", userId));
            break;

          case "UPDATE_WORKOUT":
            ({ error } = await window.sb
              .from("workouts")
              .update(payload)
              .eq("id", payload.id)
              .eq("user_id", userId));
            break;

          case "UPDATE_PROFILE":
            ({ error } = await window.sb.from("profiles").upsert(buildProfilePayload(payload, userId)));
            break;

          case "ADD_PR":
            ({ error } = await window.sb
              .from("personal_records")
              .upsert(payload, { onConflict: "user_id,exercise_name" }));
            break;

          default:
            break;
        }

        if (error) throw error;

        syncQueue.splice(i, 1);
        i--;
      } catch (err) {
        console.error("SYNC FAILED:", item.action, err);
        break;
      }
    }

    writeQueue(syncQueue);
    return syncQueue.length === 0;
  }

  function addToQueue(action, payload) {
    syncQueue.push({
      action,
      payload,
      timestamp: Date.now(),
      user_id: getCurrentUserId(),
    });
    writeQueue(syncQueue);
  }

  window.addToQueue = addToQueue;
  window.sync = sync;
})();
