(function (root) {
  function validateWorkoutInput(workout) {
    if (!workout.exercise || workout.exercise.length < 2) {
      return 'Le nom de l\'exercice doit contenir au moins 2 caractères.';
    }
    if (!Number.isInteger(workout.reps) || workout.reps < 1 || workout.reps > 200) {
      return 'Les répétitions doivent être entre 1 et 200.';
    }
    if (!Number.isInteger(workout.sets) || workout.sets < 1 || workout.sets > 20) {
      return 'Les séries doivent être entre 1 et 20.';
    }
    if (!Number.isInteger(workout.duration) || workout.duration < 10 || workout.duration > 600) {
      return 'La durée d\'exercice doit être entre 10 et 600 secondes.';
    }
    if (!Number.isInteger(workout.rest) || workout.rest < 5 || workout.rest > 300) {
      return 'Le repos doit être entre 5 et 300 secondes.';
    }
    return '';
  }

  function computeSuggestion(workouts) {
    if (!workouts.length) return 'Ajoutez des exercices pour recevoir des conseils personnalisés.';
    const avgReps = workouts.reduce((sum, w) => sum + w.reps, 0) / workouts.length;
    if (avgReps < 12) return 'Suggestion: montez progressivement à 12-15 reps pour améliorer l\'endurance.';
    if (avgReps <= 20) return 'Suggestion: bon niveau. Ajoutez une série sur 1 exercice clé cette semaine.';
    return 'Suggestion: volume élevé. Planifiez 1 journée de récupération active.';
  }

  function computeChallenge(completedSets) {
    if (completedSets >= 50) return 'Défi élite: terminez 5 séries de gainage de 60 secondes.';
    if (completedSets >= 20) return 'Défi intermédiaire: ajoutez une série bonus sur votre exercice favori.';
    return 'Défi du jour: complétez 3 séries sans interruption.';
  }

  function computeStreak(lastActive, today, currentStreak) {
    if (!lastActive) return 1;
    if (lastActive === today) return currentStreak;
    const yesterday = new Date(new Date(today).getTime() - 86400000).toISOString().slice(0, 10);
    if (lastActive === yesterday) return currentStreak + 1;
    return 1;
  }

  function computeBadges(stats) {
    const badges = [];
    if (stats.completedWorkouts >= 1) badges.push('🎯 Premier entraînement');
    if (stats.streak >= 3) badges.push('🔥 Streak 3 jours');
    if (stats.completedSets >= 25) badges.push('💪 25 séries validées');
    if (stats.completedWorkouts >= 10) badges.push('🏆 10 séances terminées');
    return badges;
  }

  function sanitizeImportData(parsed) {
    return {
      workouts: Array.isArray(parsed.workouts) ? parsed.workouts : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
      stats: parsed.stats || { completedWorkouts: 0, completedSets: 0, lastActive: '', streak: 0 },
      settings: parsed.settings || { weeklyGoal: 4, onboarded: true },
    };
  }

  const api = {
    validateWorkoutInput,
    computeSuggestion,
    computeChallenge,
    computeStreak,
    computeBadges,
    sanitizeImportData,
  };

  root.FitoLogic = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
