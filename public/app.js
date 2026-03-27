const form = document.getElementById('workout-form');
const workoutList = document.getElementById('workout-list');
const historyList = document.getElementById('history-list');
const currentTask = document.getElementById('current-task');
const phaseBadge = document.getElementById('phase-badge');
const timerEl = document.getElementById('timer');
const formError = document.getElementById('form-error');

const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const nextBtn = document.getElementById('next-btn');
const resetBtn = document.getElementById('reset-btn');

const completedWorkoutsEl = document.getElementById('completed-workouts');
const completedSetsEl = document.getElementById('completed-sets');
const streakEl = document.getElementById('streak');
const suggestionEl = document.getElementById('suggestion');
const challengeEl = document.getElementById('challenge');
const badgesEl = document.getElementById('badges');

const weeklyGoalInput = document.getElementById('weekly-goal');
const goalProgress = document.getElementById('goal-progress');

const exportBtn = document.getElementById('export-btn');
const importInput = document.getElementById('import-input');
const clearDataBtn = document.getElementById('clear-data-btn');

const templateBeginnerBtn = document.getElementById('template-beginner');
const templateStrengthBtn = document.getElementById('template-strength');
const templateLossBtn = document.getElementById('template-loss');
const templateTabataBtn = document.getElementById('template-tabata');
const templateEmomBtn = document.getElementById('template-emom');

const onboarding = document.getElementById('onboarding');
const closeOnboardingBtn = document.getElementById('close-onboarding');
const consentCheck = document.getElementById('consent-check');
const toastEl = document.getElementById('toast');
const preloadingScreen = document.getElementById('preloading-screen');
const welcomeScreen = document.getElementById('welcome-screen');
const enterAppBtn = document.getElementById('enter-app-btn');
const focusMode = document.getElementById('focus-mode');
const focusTimer = document.getElementById('focus-timer');
const focusTask = document.getElementById('focus-task');
const focusPhase = document.getElementById('focus-phase');
const focusPauseBtn = document.getElementById('focus-pause-btn');
const focusNextBtn = document.getElementById('focus-next-btn');
const focusExitBtn = document.getElementById('focus-exit-btn');
const focusHeartRate = document.getElementById('focus-heart-rate');
const watchImportInput = document.getElementById('watch-import-input');
const watchStatus = document.getElementById('watch-status');
const watchLiveStatus = document.getElementById('watch-live-status');
const watchBridgeUrlInput = document.getElementById('watch-bridge-url');
const watchBridgeTokenInput = document.getElementById('watch-bridge-token');
const hrAlertThresholdInput = document.getElementById('hr-alert-threshold');
const watchLiveConnectBtn = document.getElementById('watch-live-connect-btn');
const watchLiveDisconnectBtn = document.getElementById('watch-live-disconnect-btn');
const hrLiveChart = document.getElementById('hr-live-chart');
const cloudEmailInput = document.getElementById('cloud-email');
const cloudPasswordInput = document.getElementById('cloud-password');
const cloudRegisterBtn = document.getElementById('cloud-register-btn');
const cloudLoginBtn = document.getElementById('cloud-login-btn');
const cloudSaveBtn = document.getElementById('cloud-save-btn');
const cloudLoadBtn = document.getElementById('cloud-load-btn');
const cloudStatus = document.getElementById('cloud-status');

const dailyChart = document.getElementById('daily-chart');
const exerciseChart = document.getElementById('exercise-chart');

const templates = {
  beginner: [
    { exercise: 'Pompes', reps: 8, sets: 3, duration: 30, rest: 30 },
    { exercise: 'Squats', reps: 12, sets: 3, duration: 40, rest: 30 },
    { exercise: 'Gainage', reps: 1, sets: 3, duration: 30, rest: 30 },
  ],
  strength: [
    { exercise: 'Pompes explosives', reps: 10, sets: 4, duration: 35, rest: 45 },
    { exercise: 'Fentes', reps: 12, sets: 4, duration: 40, rest: 45 },
    { exercise: 'Burpees', reps: 10, sets: 4, duration: 45, rest: 45 },
  ],
  loss: [
    { exercise: 'Jumping Jacks', reps: 30, sets: 4, duration: 45, rest: 20 },
    { exercise: 'Mountain Climbers', reps: 20, sets: 4, duration: 40, rest: 20 },
    { exercise: 'Squat jumps', reps: 15, sets: 4, duration: 40, rest: 20 },
  ],
  tabata: [
    { exercise: 'Tabata Sprint', reps: 1, sets: 8, duration: 20, rest: 10 },
  ],
  emom: [
    { exercise: 'EMOM Burpees', reps: 12, sets: 10, duration: 40, rest: 20 },
  ],
};

const loadedState = FitState.load();
const state = {
  workouts: loadedState.workouts,
  stats: loadedState.stats,
  history: loadedState.history,
  settings: loadedState.settings,
  session: {
    workoutIndex: 0,
    setIndex: 0,
    phase: 'idle',
    secondsLeft: 0,
    timerId: null,
    paused: false,
  },
  watchLive: {
    heartRate: null,
    pollId: null,
    points: [],
  },
};

const workoutTimer = FitTimer.createTimer({
  onTick: (remaining) => {
    state.session.secondsLeft = Math.max(0, remaining);
    renderTimer();
  },
  onDone: () => {
    state.session.secondsLeft = 0;
    renderTimer();
    currentTask.textContent = 'Temps écoulé. Cliquez sur "Valider" pour continuer.';
    setControlState({ start: true, pause: true, resume: true, next: false });
  },
});

function save() {
  FitState.persist(state);
}

function updateStatsView() {
  completedWorkoutsEl.textContent = state.stats.completedWorkouts;
  completedSetsEl.textContent = state.stats.completedSets;
  streakEl.textContent = state.stats.streak;
}

function updateSuggestion() {
  suggestionEl.textContent = FitoLogic.computeSuggestion(state.workouts);
}

function updateChallenge() {
  challengeEl.textContent = FitoLogic.computeChallenge(state.stats.completedSets);
}

function updateBadges() {
  const badges = FitoLogic.computeBadges(state.stats);
  badgesEl.textContent = badges.length ? badges.join(' • ') : 'Aucun badge débloqué pour l\'instant.';
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 1800);
}

window.addEventListener('error', () => {
  showToast('Une erreur UI est survenue. Vérifiez votre connexion.');
});
window.addEventListener('unhandledrejection', () => {
  showToast('Erreur réseau/service détectée.');
});
window.addEventListener('offline', () => {
  watchLiveStatus.textContent = 'Hors ligne.';
  showToast('Mode hors ligne: certaines fonctionnalités live indisponibles.');
});
window.addEventListener('online', () => {
  showToast('Connexion rétablie.');
});

function triggerHaptic() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(8);
  }
}

function playSatisfyAnimation(level = 'set') {
  timerEl.classList.remove('pop');
  currentTask.classList.remove('celebrate');
  void timerEl.offsetWidth;
  timerEl.classList.add('pop');
  currentTask.classList.add('celebrate');
  setTimeout(() => {
    currentTask.classList.remove('celebrate');
  }, 650);
  if (level === 'workout') {
    showToast('✨ Excellent ! Séance validée.');
  }
}

function closeWelcomeScreen() {
  welcomeScreen.classList.add('hide');
  welcomeScreen.setAttribute('aria-hidden', 'true');
  showToast('Bienvenue 👋 Bonne séance !');
}

function launchIntroSequence() {
  setTimeout(() => {
    preloadingScreen.classList.add('hide');
    preloadingScreen.setAttribute('aria-hidden', 'true');
    welcomeScreen.classList.remove('hidden-until-load');
    welcomeScreen.setAttribute('aria-hidden', 'false');
  }, 1300);
}

function syncFocusDisplay() {
  focusTimer.textContent = timerEl.textContent;
  focusTask.textContent = currentTask.textContent;
  focusPhase.textContent = `PHASE: ${state.session.phase.toUpperCase()}`;
}

async function openFocusMode() {
  focusMode.classList.remove('hidden-until-load', 'hide');
  focusMode.setAttribute('aria-hidden', 'false');
  syncFocusDisplay();
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    // fallback silently when fullscreen is blocked by browser policy
  }
}

async function closeFocusMode() {
  focusMode.classList.add('hide');
  focusMode.setAttribute('aria-hidden', 'true');
  if (document.fullscreenElement && document.exitFullscreen) {
    try {
      await document.exitFullscreen();
    } catch {
      // noop
    }
  }
}

function parseCsvLine(line) {
  const items = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '\"') inQuote = !inQuote;
    else if (ch === ',' && !inQuote) {
      items.push(current.trim());
      current = '';
    } else current += ch;
  }
  items.push(current.trim());
  return items.map((item) => item.replace(/^\"|\"$/g, ''));
}

function importAppleWatchCsv(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || '');
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      watchStatus.textContent = 'CSV Apple Watch invalide.';
      return;
    }

    const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const startIdx = header.findIndex((h) => h.includes('start'));
    const durationIdx = header.findIndex((h) => h.includes('duration'));
    const typeIdx = header.findIndex((h) => h.includes('workout') || h.includes('type'));

    if (startIdx === -1) {
      watchStatus.textContent = 'Colonnes Apple Watch non reconnues (start date manquant).';
      return;
    }

    let imported = 0;
    for (let i = 1; i < lines.length; i += 1) {
      const row = parseCsvLine(lines[i]);
      const dateRaw = row[startIdx];
      if (!dateRaw) continue;
      const day = new Date(dateRaw).toISOString().slice(0, 10);
      const durationMin = Number.parseFloat(row[durationIdx] || '20');
      const workoutName = row[typeIdx] || 'Apple Watch Workout';
      const setsDone = Math.max(1, Math.round((Number.isFinite(durationMin) ? durationMin : 20) / 5));
      state.history.push({ day, workoutName, setsDone, sessions: 1 });
      state.stats.completedWorkouts += 1;
      imported += 1;
    }

    if (imported > 0) {
      save();
      hydrate();
      watchStatus.textContent = `${imported} entraînement(s) Apple Watch importé(s).`;
      showToast('Données Apple Watch importées.');
    } else {
      watchStatus.textContent = 'Aucune ligne valide trouvée dans le CSV.';
    }
  };
  reader.readAsText(file);
}

const watchBridge = FitWatch.createWatchBridge({
  getUrl: () => state.settings.watchBridgeUrl,
  getToken: () => state.settings.watchToken,
  onData: (normalized) => {
    state.watchLive.heartRate = normalized.heartRate;
    watchLiveStatus.textContent = `Connecté • ❤️ ${normalized.heartRate ?? '--'} bpm • zone ${normalized.zone}`;
    focusHeartRate.textContent = `❤️ ${normalized.heartRate ?? '--'} bpm`;
    if (normalized.heartRate) {
      state.watchLive.points.push(normalized.heartRate);
      if (state.watchLive.points.length > 40) state.watchLive.points.shift();
      drawHrLiveChart();
      if (normalized.heartRate >= (state.settings.hrAlertThreshold || 170)) {
        FitUI.playTone('alert');
        FitUI.speak('Attention fréquence cardiaque élevée');
        showToast(`⚠️ HR élevée: ${normalized.heartRate} bpm`);
      }
    }
  },
  onError: (_error, retryCount) => {
    watchLiveStatus.textContent = `Connexion instable… tentative ${retryCount}`;
  },
  onOffline: () => {
    watchLiveStatus.textContent = 'Bridge offline. Reconnexion automatique.';
  },
});

function startWatchLivePolling() {
  if (!state.settings.watchBridgeUrl) {
    watchLiveStatus.textContent = 'Ajoutez une URL bridge valide.';
    return;
  }
  stopWatchLivePolling();
  state.settings.watchLiveEnabled = true;
  save();
  watchLiveStatus.textContent = 'Connexion en cours…';
  watchBridge.start();
}

function stopWatchLivePolling() {
  watchBridge.stop();
  state.settings.watchLiveEnabled = false;
  save();
  watchLiveStatus.textContent = 'Non connecté.';
  focusHeartRate.textContent = '❤️ -- bpm';
}

async function cloudAuth(endpoint) {
  if (!state.settings.watchBridgeUrl) {
    cloudStatus.textContent = 'Définissez d’abord URL bridge.';
    return;
  }
  const email = cloudEmailInput.value.trim();
  const password = cloudPasswordInput.value;
  const response = await fetch(state.settings.watchBridgeUrl.replace('/api/watch/live', endpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'auth_failed');
  state.settings.accountEmail = data.email;
  state.settings.sessionToken = data.token;
  save();
  cloudStatus.textContent = `Connecté: ${data.email}`;
}

async function cloudSave() {
  const token = state.settings.sessionToken;
  if (!token) {
    cloudStatus.textContent = 'Connecte-toi au cloud.';
    return;
  }
  const url = state.settings.watchBridgeUrl.replace('/api/watch/live', '/api/sync/save');
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workouts: state.workouts,
      stats: state.stats,
      history: state.history,
      settings: state.settings,
    }),
  });
  if (!response.ok) throw new Error('save_failed');
  cloudStatus.textContent = 'Données synchronisées vers le cloud.';
}

async function cloudLoad() {
  const token = state.settings.sessionToken;
  if (!token) {
    cloudStatus.textContent = 'Connecte-toi au cloud.';
    return;
  }
  const url = state.settings.watchBridgeUrl.replace('/api/watch/live', '/api/sync/load');
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('load_failed');
  const data = await response.json();
  if (data.workouts) {
    state.workouts = data.workouts;
    state.stats = data.stats || state.stats;
    state.history = data.history || state.history;
    save();
    hydrate();
  }
  cloudStatus.textContent = 'Données chargées depuis le cloud.';
}

function workoutCountLast7Days() {
  const cutoff = Date.now() - 6 * 86400000;
  return state.history
    .filter((entry) => new Date(entry.day).getTime() >= cutoff)
    .reduce((acc, entry) => acc + (entry.sessions || 0), 0);
}

function updateWeeklyGoalView() {
  const completed = workoutCountLast7Days();
  const goal = state.settings.weeklyGoal;
  goalProgress.textContent = `${completed} / ${goal} séances cette semaine`;
  if (completed <= Math.max(1, Math.floor(goal / 2))) {
    challengeEl.textContent = 'Plan adaptatif: réduisez le volume aujourd’hui et concentrez-vous sur la régularité.';
  }
}

function renderWorkouts() {
  workoutList.innerHTML = '';

  state.workouts.forEach((w, index) => {
    const li = document.createElement('li');
    li.textContent = `${w.exercise} • ${w.reps} reps × ${w.sets} séries (${w.duration}s, repos ${w.rest}s)`;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Supprimer';
    removeBtn.style.marginLeft = '0.5rem';
    removeBtn.addEventListener('click', () => {
      state.workouts.splice(index, 1);
      if (state.session.workoutIndex >= state.workouts.length) {
        state.session.workoutIndex = 0;
      }
      save();
      renderWorkouts();
      updateSuggestion();
    });

    li.appendChild(removeBtn);
    workoutList.appendChild(li);
  });
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function renderTimer() {
  const minutes = Math.floor(state.session.secondsLeft / 60);
  const seconds = state.session.secondsLeft % 60;
  timerEl.textContent = `${pad(minutes)}:${pad(seconds)}`;
  syncFocusDisplay();
}

function setPhase(phase) {
  state.session.phase = phase;
  phaseBadge.textContent = `Phase: ${phase}`;
  syncFocusDisplay();
}

function stopTick() {
  workoutTimer.stop();
  state.session.timerId = null;
}

function setControlState({ start, pause, resume, next }) {
  startBtn.disabled = start;
  pauseBtn.disabled = pause;
  resumeBtn.disabled = resume;
  nextBtn.disabled = next;
}

function activeWorkout() {
  return state.workouts[state.session.workoutIndex];
}

function markActiveDay() {
  const today = new Date().toISOString().slice(0, 10);
  state.stats.streak = FitoLogic.computeStreak(state.stats.lastActive, today, state.stats.streak);
  state.stats.lastActive = today;
}

function addHistoryEntry(workoutName, setsDone) {
  const day = new Date().toISOString().slice(0, 10);
  state.history.push({
    day,
    workoutName,
    setsDone,
    sessions: 1,
  });

  if (state.history.length > 500) {
    state.history = state.history.slice(-500);
  }
}

function renderHistory() {
  const grouped = {};
  state.history.forEach((entry) => {
    if (!grouped[entry.day]) grouped[entry.day] = { sets: 0, sessions: 0 };
    grouped[entry.day].sets += entry.setsDone;
    grouped[entry.day].sessions += entry.sessions || 0;
  });

  const days = Object.keys(grouped).sort().slice(-7).reverse();
  historyList.innerHTML = '';

  if (!days.length) {
    const li = document.createElement('li');
    li.textContent = 'Aucun historique pour le moment.';
    historyList.appendChild(li);
    return;
  }

  days.forEach((day) => {
    const li = document.createElement('li');
    li.textContent = `${day} • ${grouped[day].sessions} séance(s) • ${grouped[day].sets} séries`;
    historyList.appendChild(li);
  });
}

function drawBars(canvas, labels, values, color) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const w = canvas.width;
  const h = canvas.height;

  if (!labels.length) {
    ctx.fillStyle = '#6b7280';
    ctx.font = '14px sans-serif';
    ctx.fillText('Pas encore de données.', 20, 30);
    return;
  }

  const maxValue = Math.max(...values, 1);
  const barAreaWidth = w - 60;
  const barWidth = Math.max(18, Math.floor(barAreaWidth / labels.length) - 8);

  labels.forEach((label, index) => {
    const x = 40 + index * (barWidth + 8);
    const barHeight = Math.round((values[index] / maxValue) * (h - 70));
    const y = h - 30 - barHeight;

    ctx.fillStyle = color;
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = '#1f2937';
    ctx.font = '12px sans-serif';
    ctx.fillText(String(values[index]), x, y - 6);
    ctx.fillText(label.slice(5, 10), x, h - 10);
  });
}

function drawHrLiveChart() {
  const ctx = hrLiveChart.getContext('2d');
  ctx.clearRect(0, 0, hrLiveChart.width, hrLiveChart.height);
  const points = state.watchLive.points;
  if (!points.length) {
    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.fillText('Fréquence cardiaque live en attente…', 20, 30);
    return;
  }

  const max = Math.max(...points, 120);
  const min = Math.min(...points, 50);
  const range = Math.max(1, max - min);
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3;
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = (i / Math.max(1, points.length - 1)) * (hrLiveChart.width - 40) + 20;
    const y = hrLiveChart.height - 20 - ((p - min) / range) * (hrLiveChart.height - 50);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.fillStyle = '#0f172a';
  ctx.fillText(`HR actuel: ${points[points.length - 1]} bpm`, 20, hrLiveChart.height - 6);
}

function renderCharts() {
  const dailyGrouped = {};
  state.history.forEach((entry) => {
    dailyGrouped[entry.day] = (dailyGrouped[entry.day] || 0) + entry.setsDone;
  });

  const dailyLabels = Object.keys(dailyGrouped).sort().slice(-7);
  const dailyValues = dailyLabels.map((d) => dailyGrouped[d]);
  drawBars(dailyChart, dailyLabels, dailyValues, '#2563eb');

  const byExercise = {};
  state.history.forEach((entry) => {
    byExercise[entry.workoutName] = (byExercise[entry.workoutName] || 0) + entry.setsDone;
  });

  const topExercises = Object.entries(byExercise)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  drawBars(
    exerciseChart,
    topExercises.map((x) => x[0]),
    topExercises.map((x) => x[1]),
    '#0ea5e9'
  );
}

function startTick() {
  stopTick();
  state.session.paused = false;
  setControlState({ start: true, pause: false, resume: true, next: true });
  workoutTimer.start(state.session.secondsLeft);
  state.session.timerId = true;
}

function startSession() {
  triggerHaptic();
  FitUI.playTone('ok');
  FitUI.speak('Séance démarrée');
  if (!state.workouts.length) {
    showToast('Ajoutez au moins un exercice avant de démarrer.');
    return;
  }

  const workout = activeWorkout();
  state.session.setIndex = 1;
  state.session.secondsLeft = workout.duration;
  setPhase('exercice');
  currentTask.textContent = `${workout.exercise} • Série ${state.session.setIndex}/${workout.sets}`;
  renderTimer();
  openFocusMode();
  startTick();
}

function pauseSession() {
  triggerHaptic();
  if (!state.session.timerId) return;
  workoutTimer.pause();
  state.session.timerId = null;
  state.session.paused = true;
  currentTask.textContent = 'Pause en cours…';
  setControlState({ start: true, pause: true, resume: false, next: true });
}

function resumeSession() {
  triggerHaptic();
  if (!state.session.paused || state.session.secondsLeft <= 0) return;
  currentTask.textContent = 'Session reprise.';
  workoutTimer.resume();
  state.session.timerId = true;
  state.session.paused = false;
  setControlState({ start: true, pause: false, resume: true, next: true });
}

function validateStep() {
  triggerHaptic();
  const workout = activeWorkout();
  if (!workout) return;
  if (state.session.secondsLeft > 0) return;

  if (state.session.phase === 'exercice') {
    state.stats.completedSets += 1;
    playSatisfyAnimation('set');

    if (state.session.setIndex < workout.sets) {
      setPhase('repos');
      FitUI.speak('Repos');
      state.session.secondsLeft = workout.rest;
      currentTask.textContent = `Repos avant série ${state.session.setIndex + 1}/${workout.sets}`;
      renderTimer();
      startTick();
      save();
      updateStatsView();
      updateChallenge();
      return;
    }

    state.stats.completedWorkouts += 1;
    playSatisfyAnimation('workout');
    addHistoryEntry(workout.exercise, workout.sets);
    markActiveDay();

    if (state.session.workoutIndex < state.workouts.length - 1) {
      state.session.workoutIndex += 1;
      const nextWorkout = activeWorkout();
      state.session.setIndex = 1;
      state.session.secondsLeft = nextWorkout.duration;
      setPhase('exercice');
      currentTask.textContent = `${nextWorkout.exercise} • Série ${state.session.setIndex}/${nextWorkout.sets}`;
      renderTimer();
      startTick();
    } else {
      setPhase('terminé');
      currentTask.textContent = 'Programme terminé ✅ Bravo !';
      state.session.workoutIndex = 0;
      state.session.setIndex = 0;
      state.session.secondsLeft = 0;
      renderTimer();
      setControlState({ start: false, pause: true, resume: true, next: true });
      closeFocusMode();
    }
  } else if (state.session.phase === 'repos') {
    setPhase('exercice');
    FitUI.speak('On repart');
    state.session.setIndex += 1;
    state.session.secondsLeft = workout.duration;
    currentTask.textContent = `${workout.exercise} • Série ${state.session.setIndex}/${workout.sets}`;
    renderTimer();
    startTick();
  }

  updateStatsView();
  updateChallenge();
  updateBadges();
  updateWeeklyGoalView();
  renderHistory();
  renderCharts();
  save();
}

function resetSession() {
  triggerHaptic();
  stopTick();
  state.session.workoutIndex = 0;
  state.session.setIndex = 0;
  state.session.secondsLeft = 0;
  state.session.phase = 'idle';
  state.session.paused = false;
  renderTimer();
  setPhase('attente');
  currentTask.textContent = 'Séance réinitialisée. Prêt à repartir !';
  setControlState({ start: false, pause: true, resume: true, next: true });
  closeFocusMode();
}

function applyTemplate(name) {
  triggerHaptic();
  const chosen = templates[name];
  if (!chosen) return;
  state.workouts = chosen.map((item) => ({ ...item }));
  save();
  renderWorkouts();
  updateSuggestion();
  showToast('Template appliqué.');
}

function exportData() {
  const payload = {
    workouts: state.workouts,
    stats: state.stats,
    history: state.history,
    settings: state.settings,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'fitopro-export.json';
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Export JSON téléchargé.');
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const safe = FitoLogic.sanitizeImportData(parsed);
      state.workouts = safe.workouts;
      state.history = safe.history;
      state.stats = safe.stats;
      state.settings = {
        weeklyGoal: safe.settings.weeklyGoal ?? 4,
        onboarded: safe.settings.onboarded ?? true,
        watchBridgeUrl: safe.settings.watchBridgeUrl || '',
        watchLiveEnabled: Boolean(safe.settings.watchLiveEnabled),
        watchToken: safe.settings.watchToken || '',
        hrAlertThreshold: safe.settings.hrAlertThreshold || 170,
      };
      save();
      hydrate();
      showToast('Import réussi.');
    } catch {
      showToast('Fichier JSON invalide.');
    }
  };
  reader.readAsText(file);
}

function clearAllData() {
  const ok = confirm('Confirmation: cette action supprimera définitivement toutes vos données locales FitoPro. Continuer ?');
  if (!ok) return;
  localStorage.removeItem('fitopro.workouts');
  localStorage.removeItem('fitopro.stats');
  localStorage.removeItem('fitopro.history');
  localStorage.removeItem('fitopro.settings');
  stopWatchLivePolling();
  state.workouts = [];
  state.stats = { completedWorkouts: 0, completedSets: 0, lastActive: '', streak: 0 };
  state.history = [];
  state.settings = {
    weeklyGoal: 4,
    onboarded: true,
    watchBridgeUrl: '',
    watchLiveEnabled: false,
    watchToken: '',
    hrAlertThreshold: 170,
  };
  resetSession();
  hydrate();
  showToast('Données locales supprimées.');
}

function hydrate() {
  weeklyGoalInput.value = state.settings.weeklyGoal;
  watchBridgeUrlInput.value = state.settings.watchBridgeUrl || '';
  watchBridgeTokenInput.value = state.settings.watchToken || '';
  hrAlertThresholdInput.value = state.settings.hrAlertThreshold || 170;
  cloudEmailInput.value = state.settings.accountEmail || '';
  cloudStatus.textContent = state.settings.sessionToken ? `Connecté: ${state.settings.accountEmail}` : 'Cloud non connecté.';
  renderTimer();
  renderWorkouts();
  renderHistory();
  renderCharts();
  updateStatsView();
  updateSuggestion();
  updateChallenge();
  updateBadges();
  updateWeeklyGoalView();
  if (state.settings.watchLiveEnabled && state.settings.watchBridgeUrl) startWatchLivePolling();
  else watchLiveStatus.textContent = 'Non connecté.';
  drawHrLiveChart();
}

function initOnboarding() {
  if (!state.settings.onboarded) {
    onboarding.classList.add('show');
    onboarding.setAttribute('aria-hidden', 'false');
  }
}

function closeOnboarding() {
  if (!consentCheck.checked) {
    showToast('Veuillez accepter la politique de confidentialité.');
    return;
  }
  state.settings.onboarded = true;
  state.settings.consentAccepted = true;
  onboarding.classList.remove('show');
  onboarding.setAttribute('aria-hidden', 'true');
  save();
  showToast('Bienvenue sur FitoPro !');
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  formError.textContent = '';

  const workout = {
    exercise: document.getElementById('exercise').value.trim(),
    reps: Number.parseInt(document.getElementById('reps').value, 10),
    sets: Number.parseInt(document.getElementById('sets').value, 10),
    duration: Number.parseInt(document.getElementById('duration').value, 10),
    rest: Number.parseInt(document.getElementById('rest').value, 10),
  };

  const errorMessage = FitoLogic.validateWorkoutInput(workout);
  if (errorMessage) {
    formError.textContent = errorMessage;
    return;
  }

  state.workouts.push(workout);
  form.reset();
  document.getElementById('reps').value = 10;
  document.getElementById('sets').value = 3;
  document.getElementById('duration').value = 45;
  document.getElementById('rest').value = 30;

  save();
  renderWorkouts();
  updateSuggestion();
  showToast('Exercice ajouté au programme.');
});

weeklyGoalInput.addEventListener('change', () => {
  const value = Number.parseInt(weeklyGoalInput.value, 10);
  state.settings.weeklyGoal = Number.isInteger(value) && value > 0 ? value : 4;
  weeklyGoalInput.value = state.settings.weeklyGoal;
  save();
  updateWeeklyGoalView();
});

startBtn.addEventListener('click', startSession);
pauseBtn.addEventListener('click', pauseSession);
resumeBtn.addEventListener('click', resumeSession);
nextBtn.addEventListener('click', validateStep);
resetBtn.addEventListener('click', resetSession);
focusPauseBtn.addEventListener('click', pauseSession);
focusNextBtn.addEventListener('click', validateStep);
focusExitBtn.addEventListener('click', closeFocusMode);

exportBtn.addEventListener('click', exportData);
importInput.addEventListener('change', (event) => importData(event.target.files[0]));
clearDataBtn.addEventListener('click', clearAllData);
watchImportInput.addEventListener('change', (event) => importAppleWatchCsv(event.target.files[0]));
watchBridgeUrlInput.addEventListener('change', () => {
  state.settings.watchBridgeUrl = watchBridgeUrlInput.value.trim();
  save();
});
watchBridgeTokenInput.addEventListener('change', () => {
  state.settings.watchToken = watchBridgeTokenInput.value.trim();
  save();
});
hrAlertThresholdInput.addEventListener('change', () => {
  const v = Number.parseInt(hrAlertThresholdInput.value, 10);
  state.settings.hrAlertThreshold = Number.isFinite(v) ? v : 170;
  hrAlertThresholdInput.value = state.settings.hrAlertThreshold;
  save();
});
watchLiveConnectBtn.addEventListener('click', startWatchLivePolling);
watchLiveDisconnectBtn.addEventListener('click', stopWatchLivePolling);
cloudRegisterBtn.addEventListener('click', async () => {
  try { await cloudAuth('/api/auth/register'); } catch { cloudStatus.textContent = 'Échec création compte.'; }
});
cloudLoginBtn.addEventListener('click', async () => {
  try { await cloudAuth('/api/auth/login'); } catch { cloudStatus.textContent = 'Échec connexion cloud.'; }
});
cloudSaveBtn.addEventListener('click', async () => {
  try { await cloudSave(); } catch { cloudStatus.textContent = 'Échec sync cloud.'; }
});
cloudLoadBtn.addEventListener('click', async () => {
  try { await cloudLoad(); } catch { cloudStatus.textContent = 'Échec récupération cloud.'; }
});

templateBeginnerBtn.addEventListener('click', () => applyTemplate('beginner'));
templateStrengthBtn.addEventListener('click', () => applyTemplate('strength'));
templateLossBtn.addEventListener('click', () => applyTemplate('loss'));
templateTabataBtn.addEventListener('click', () => applyTemplate('tabata'));
templateEmomBtn.addEventListener('click', () => applyTemplate('emom'));

closeOnboardingBtn.addEventListener('click', closeOnboarding);
enterAppBtn.addEventListener('click', closeWelcomeScreen);

setPhase('attente');
setControlState({ start: false, pause: true, resume: true, next: true });
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./public/sw.js').catch(() => {});
}
hydrate();
initOnboarding();
launchIntroSequence();
