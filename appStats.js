(() => {
  function getCompletedSessions() {
    return (window.state?.sessions || []).filter((session) => session.status === "completed");
  }

  function getTotalSessions() {
    return getCompletedSessions().length;
  }

  function getTotalCalories() {
    return (window.state?.sessions || []).reduce(
      (sum, session) => sum + (session.calories_burned || session.kcal || 0),
      0
    );
  }

  function getTotalMinutes() {
    return Math.round(
      (window.state?.sessions || []).reduce(
        (sum, session) => sum + ((session.duration_seconds || 0) / 60),
        0
      )
    );
  }

  function getStreak() {
    const history = getCompletedSessions();
    if (!history.length) return 0;

    let streak = 0;
    let check = new Date();
    check.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i += 1) {
      const hasWorkout = history.some((session) => {
        const date = new Date(session.started_at || session.date);
        date.setHours(0, 0, 0, 0);
        return date.getTime() === check.getTime();
      });

      if (hasWorkout) {
        streak += 1;
        check.setDate(check.getDate() - 1);
      } else if (i === 0) {
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  function getWeeklyCount() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    return (window.state?.sessions || []).filter((session) => {
      const date = new Date(session.started_at || session.date);
      return date >= weekStart && session.status === "completed";
    }).length;
  }

  function getWeeklyActivity() {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = new Array(7).fill(0);
    const calories = new Array(7).fill(0);
    const now = new Date();

    getCompletedSessions().forEach((session) => {
      const date = new Date(session.started_at || session.date);
      const diff = Math.floor((now - date) / 86400000);
      if (diff < 7) {
        counts[date.getDay()] += 1;
        calories[date.getDay()] += session.calories_burned || session.kcal || 0;
      }
    });

    const today = now.getDay();
    const labels = [];
    const sessData = [];
    const calData = [];

    for (let i = 6; i >= 0; i -= 1) {
      const index = (today - i + 7) % 7;
      labels.push(days[index]);
      sessData.push(counts[index]);
      calData.push(calories[index]);
    }

    return { labels, sessData, calData };
  }

  window.FITOPRO_STATS = Object.freeze({
    getTotalSessions,
    getTotalCalories,
    getTotalMinutes,
    getStreak,
    getWeeklyCount,
    getWeeklyActivity,
  });
})();
