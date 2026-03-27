const assert = require('node:assert/strict');
const {
  validateWorkoutInput,
  computeSuggestion,
  computeChallenge,
  computeStreak,
  computeBadges,
  sanitizeImportData,
} = require('../logic.js');

function run() {
  assert.equal(validateWorkoutInput({ exercise: '', reps: 10, sets: 3, duration: 45, rest: 30 }).length > 0, true);
  assert.equal(validateWorkoutInput({ exercise: 'Pompes', reps: 0, sets: 3, duration: 45, rest: 30 }).length > 0, true);
  assert.equal(validateWorkoutInput({ exercise: 'Pompes', reps: 10, sets: 3, duration: 45, rest: 30 }), '');

  assert.match(computeSuggestion([]), /Ajoutez/);
  assert.match(computeSuggestion([{ reps: 8 }]), /12-15/);
  assert.match(computeSuggestion([{ reps: 15 }]), /bon niveau/);
  assert.match(computeSuggestion([{ reps: 25 }]), /récupération active/);

  assert.match(computeChallenge(5), /Défi du jour/);
  assert.match(computeChallenge(25), /intermédiaire/);
  assert.match(computeChallenge(60), /élite/);

  assert.equal(computeStreak('', '2026-03-26', 0), 1);
  assert.equal(computeStreak('2026-03-26', '2026-03-26', 2), 2);
  assert.equal(computeStreak('2026-03-25', '2026-03-26', 2), 3);
  assert.equal(computeStreak('2026-03-20', '2026-03-26', 4), 1);

  assert.deepEqual(computeBadges({ completedWorkouts: 0, streak: 0, completedSets: 0 }), []);
  assert.equal(computeBadges({ completedWorkouts: 10, streak: 3, completedSets: 30 }).length, 4);

  const sanitizedEmpty = sanitizeImportData({});
  assert.deepEqual(sanitizedEmpty.workouts, []);
  assert.equal(sanitizedEmpty.settings.weeklyGoal, 4);

  const sanitizedFilled = sanitizeImportData({
    workouts: [{ exercise: 'Pompes', reps: 10, sets: 3, duration: 45, rest: 30 }],
    history: [{ day: '2026-03-26', workoutName: 'Pompes', setsDone: 3, sessions: 1 }],
    stats: { completedWorkouts: 1, completedSets: 3, lastActive: '2026-03-26', streak: 1 },
    settings: { weeklyGoal: 5, onboarded: true },
  });
  assert.equal(sanitizedFilled.workouts.length, 1);
  assert.equal(sanitizedFilled.settings.weeklyGoal, 5);

  console.log('logic tests: OK');
}

run();
