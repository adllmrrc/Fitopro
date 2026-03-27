(function (root) {
  function initSession() {
    return { phase: 'idle', setIndex: 0, workoutIndex: 0, completedSets: 0, completedWorkouts: 0 };
  }

  function startWorkout(session) {
    return { ...session, phase: 'exercice', setIndex: 1 };
  }

  function validateStep(session, workout) {
    if (session.phase === 'exercice') {
      const completedSets = session.completedSets + 1;
      if (session.setIndex < workout.sets) {
        return { ...session, phase: 'repos', completedSets };
      }
      return {
        ...session,
        phase: 'terminé',
        completedSets,
        completedWorkouts: session.completedWorkouts + 1,
      };
    }

    if (session.phase === 'repos') {
      return { ...session, phase: 'exercice', setIndex: session.setIndex + 1 };
    }

    return session;
  }

  const api = { initSession, startWorkout, validateStep };
  root.FitFlow = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
