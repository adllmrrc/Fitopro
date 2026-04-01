
// ════════════════════════════════════════
//  LOCAL STATE (cache + offline support)
// ════════════════════════════════════════



// ════════════════════════════════════════
//  SUPABASE AUTH
// ════════════════════════════════════════
let authMode = 'login';

// Global auth listener moved to after all vars defined
let appReady = false;

function getAppPageUrl(path) {
  return new URL(path, window.location.href).href;
}

async function saveSession(session) {
  return addSession(session);
}

async function saveCustomWorkout(workout) {
  return addWorkout(workout);
}

async function deleteCustomWorkout(id) {
  return deleteWorkout(id);
}

async function saveProfile(updates) {
  return updateProfile(updates);
}

async function flushPendingQueue() {
  return flushQueue();
}

const {
  TAGLINES,
  DEFAULT_WORKOUTS,
  EXERCISE_LIBRARY,
  EXERCISE_LOOKUP,
  EXERCISE_PACKS,
  EXERCISE_POOL: EX_POOL
} = window.FITOPRO_DATA;
const {
  getTotalSessions,
  getTotalCalories,
  getTotalMinutes,
  getStreak,
  getWeeklyCount,
  getWeeklyActivity,
} = window.FITOPRO_STATS;

const BUILDER_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'recent', label: 'Recent' },
  { id: 'bodyweight', label: 'Bodyweight', category: 'Bodyweight' },
  { id: 'machines', label: 'Machines', category: 'Machines' },
  { id: 'free', label: 'Free Weights', category: 'Free Weights' },
  { id: 'core_cardio', label: 'Core/Cardio', category: 'Core & Cardio' },
  { id: 'chest', label: 'Chest', muscle: 'Chest' },
  { id: 'back', label: 'Back', muscle: 'Back' },
  { id: 'legs', label: 'Legs', muscle: 'Legs' },
  { id: 'shoulders', label: 'Shoulders', muscle: 'Shoulders' },
  { id: 'arms', label: 'Arms', muscle: 'Arms' },
  { id: 'core', label: 'Core', muscle: 'Core' },
  { id: 'cardio', label: 'Cardio', muscle: 'Cardio' },
];

async function ensureProfileRecord(user, fallbackName = '') {
  if (!user?.id) return;

  const profilePayload = {
    id: user.id,
    email: user.email || null,
    display_name:
      user.user_metadata?.display_name ||
      user.user_metadata?.name ||
      state.profile.display_name ||
      fallbackName ||
      'Athlete',
    weekly_goal: state.profile.weekly_goal || 4,
    experience_level: state.profile.experience_level || 'intermediate',
    body_weight: state.profile.body_weight || 75,
    settings: state.profile.settings,
    onboarded: state.profile.onboarded || false,
  };

  const { error } = await sb.from('profiles').upsert(profilePayload);
  if (error) {
    console.error('Profile sync failed:', error);
    throw error;
  }
}

// SUPABASE AUTH - with sb safety check
if (typeof sb !== 'undefined') {
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'INITIAL_SESSION') return;

    if (!session) {
      state.user = null;
      appReady = false;
      hideSyncBanner();
      updateAuthUI();
      setSyncStatus('offline', 'Guest mode');
      updateAllUI();
      return;
    }

    try {
      state.user = session.user;
      setSyncStatus('syncing', 'Syncing...');
      showSyncBanner('Loading your data from cloud...');
      
      await ensureProfileRecord(session.user);
      await loadAllUserData(session.user);
      await flushPendingQueue();
      
      hideSyncBanner();
      setSyncStatus('online', 'Synced');
      appReady = true;
      
      checkAchievements();
      updateAllUI();
    } catch (err) {
      console.error('Auth sync failed:', err);
      setSyncStatus('offline', 'Sync failed');
      showSyncBanner(getFriendlySyncError(err));
      showToast(getFriendlySyncError(err), 'error');
      updateAllUI();
    }
  });
} else {
  console.error('Supabase not available - guest mode only');
}

window.switchAuthMode = (mode) => {
  authMode = mode;
  document.querySelectorAll('.auth-mode-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-' + mode)?.classList.add('active');
  const isLogin = mode === 'login';
  document.getElementById('auth-mode-label').textContent = isLogin ? '👋 Welcome back' : '🎉 Create your account';
  document.getElementById('auth-sheet-title').textContent = isLogin ? 'Sign In' : 'Register';
  document.getElementById('name-group').style.display = isLogin ? 'none' : 'block';
  document.getElementById('auth-btn-text').textContent = isLogin ? 'Sign In' : 'Create Account';
  document.getElementById('auth-error').style.display = 'none';
};

window.handleAuthSubmit = async () => {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const name = document.getElementById('auth-name').value.trim();
  const errEl = document.getElementById('auth-error');
  errEl.style.display = 'none';
  if (!email || !password) { showAuthError('Email and password are required'); return; }
  if (password.length < 6) { showAuthError('Password must be at least 6 characters'); return; }
  if (authMode === 'register' && !name) { showAuthError('Please enter your name'); return; }
  const btn = document.getElementById('auth-submit');
  btn.disabled = true;
  showLoading(authMode === 'login' ? 'Signing in...' : 'Creating account...');
  try {
    if (authMode === 'register') {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: { name, display_name: name },
          emailRedirectTo: getAppPageUrl('./auth/confirm/'),
        },
      });
      if (error) throw error;
      await saveProfile({
        display_name: name,
        weekly_goal: state.profile.weekly_goal || 4,
        experience_level: state.profile.experience_level || 'intermediate',
        body_weight: state.profile.body_weight || 75,
        settings: state.profile.settings,
        onboarded: false,
      });

      hideLoading();
      closeModal('auth-modal');
      showToast('🎉 Account created! Check your email.', 'success');
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      hideLoading();
      closeModal('auth-modal');
      showToast('✅ Welcome back!', 'success');
    }
  } catch (err) {
    hideLoading();
    showAuthError(getFriendlyAuthError(err, authMode));
  } finally { btn.disabled = false; }
};

window.handleForgotPassword = async () => {
  const email = document.getElementById('auth-email').value.trim();
  if (!email) {
    showAuthError('Enter your email first, then tap Forgot password.');
    return;
  }

  try {
    showLoading('Sending reset email...');
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: getAppPageUrl('./auth/reset-password/'),
    });
    if (error) throw error;
    hideLoading();
    showToast('📩 Password reset link sent. Check your email.', 'success');
  } catch (err) {
    hideLoading();
    showAuthError(getFriendlyAuthError(err, 'login'));
  }
};

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = '❌ ' + msg;
  el.style.display = 'block';
}

window.handleGoogleAuth = async () => {
  try {
    showLoading('Connecting Google...');
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } });
    if (error) throw error;
  } catch (err) {
    hideLoading();
    showToast('❌ ' + getFriendlyAuthError(err, 'login'), 'error');
  }
};

window.continueAsGuest = () => {
  closeModal('auth-modal');
  if (!state.profile.onboarded) setTimeout(() => openModal('onboarding-modal'), 300);
};

window.handleSignOut = async () => {
  showConfirm('Sign Out', 'Sign out of your account?', async () => {
    showLoading('Signing out...');
    await sb.auth.signOut();
    state.user = null; state.sessions = []; state.workouts = []; state.prs = {}; state.pending = [];
    LS.rm('sessions'); LS.rm('workouts'); LS.rm('prs'); LS.rm('pending');
    localStorage.removeItem('sync_queue');
    persist();
    hideSyncBanner();
    setSyncStatus('offline', 'Guest mode');
    hideLoading();
    showToast('🔓 Signed out');
    updateAllUI();
  });
};

window.handleAuthHeaderBtn = () => {
  if (state.user) navTo('profile'); else openModal('auth-modal');
};

// ════════════════════════════════════════
//  DATA LAYER — SUPABASE OPERATIONS
// ════════════════════════════════════════
// Shared persistence helpers are wired above.

// ════════════════════════════════════════
//  UI UTILITIES
// ════════════════════════════════════════

function getAllWorkouts() {
  return [...DEFAULT_WORKOUTS, ...state.workouts.map(w => ({ ...w, isCustom: true }))];
}

// ════════════════════════════════════════
//  HOME UI
// ════════════════════════════════════════
function updateHomeUI() {
  const p = state.profile || {};
  const name = p.display_name || 'Athlete';
  const sessions = getTotalSessions();
  const streak = getStreak();
  const kcal = getTotalCalories();
  const weekly = getWeeklyCount();
  const goal = p.weekly_goal || 4;

  const $ = id => document.getElementById(id);
  if ($('h-greeting')) $('h-greeting').textContent = `${getGreeting()}, ${name.split(' ')[0].toUpperCase()} 👋`;
  if ($('h-tagline')) $('h-tagline').textContent = TAGLINES[Math.floor(Math.random() * TAGLINES.length)];
  if ($('h-sessions')) $('h-sessions').textContent = sessions;
  if ($('h-streak')) $('h-streak').textContent = streak + '🔥';
  if ($('h-kcal')) $('h-kcal').textContent = kcal.toLocaleString();
  if ($('h-goal')) $('h-goal').textContent = `${Math.min(100, Math.round((weekly / goal) * 100))}%`;

  const lastS = state.sessions[0];
  if (lastS && $('last-workout-hint')) $('last-workout-hint').textContent = `Last: ${lastS.workout_name} · ${timeAgo(lastS.started_at || lastS.date)}`;
  else if ($('last-workout-hint')) $('last-workout-hint').textContent = 'Choose a plan and start moving';

  if ($('h-start-meta')) $('h-start-meta').textContent = weekly >= goal ? 'Goal smashed' : `${Math.max(goal - weekly, 0)} sessions left`;
  if ($('h-summary')) $('h-summary').textContent = streak >= 3 ? `You are on a ${streak}-day streak. Keep the momentum alive.` : `Your next session starts with one tap. Build consistency one workout at a time.`;

  const focusTitle = weekly >= goal ? 'Goal achieved' : streak >= 3 ? 'Protect the streak' : weekly === 0 ? 'Open strong this week' : 'One more step today';
  const focusSub = weekly >= goal
    ? 'You hit your weekly target. Stack a bonus session or focus on recovery.'
    : streak >= 3
      ? `You have ${streak} days in a row. A focused session keeps the fire going.`
      : weekly === 0
        ? 'Start the week with a clean session and set the tone early.'
        : `${Math.max(goal - weekly, 0)} sessions remain to hit your target this week.`;
  const focusChip = weekly >= goal ? 'Achieved' : streak >= 3 ? 'On Fire' : 'Momentum';
  if ($('h-focus-title')) $('h-focus-title').textContent = focusTitle;
  if ($('h-focus-sub')) $('h-focus-sub').textContent = focusSub;
  if ($('h-focus-chip')) $('h-focus-chip').textContent = focusChip;

  const pct = Math.min(100, Math.round((weekly / goal) * 100));
  if ($('goal-bar')) $('goal-bar').style.width = pct + '%';
  if ($('goal-pill')) $('goal-pill').textContent = `${weekly} / ${goal}`;
  if ($('goal-msg')) $('goal-msg').textContent = weekly >= goal ? '🎉 Goal achieved!' : weekly === goal-1 ? '1 more session to go!' : `${goal - weekly} sessions left`;
  if ($('goal-target')) $('goal-target').textContent = `Goal: ${goal}/week`;
  if ($('h-workout-total')) $('h-workout-total').textContent = `${getAllWorkouts().length} plans`;
  if ($('h-workouts-copy')) $('h-workouts-copy').textContent = state.workouts.length ? 'Custom plans and built-ins, ready to launch.' : 'Your saved training plans will show up here.';

  renderWorkoutList();
}

function renderWorkoutList() {
  const list = document.getElementById('workout-list'); if (!list) return;
  const all = getAllWorkouts();
  if (!all.length) { list.innerHTML = '<div class="empty-state"><div class="empty-icon">🏋️</div><div class="empty-title">No workouts</div><div class="empty-sub">Create your first plan</div></div>'; return; }
  list.innerHTML = all.map((w,i) => `
    <div class="w-row premium" onclick="startWorkout(${i})" data-idx="${i}">
      <div class="w-icon">${w.icon||'🏋️'}</div>
      <div class="w-info">
        <div class="w-topline">
          <div class="w-name">${w.name}</div>
          ${w.isCustom ? '<span class="tag b">Custom</span>' : '<span class="tag g">Built-in</span>'}
        </div>
        <div class="w-preview">${w.exercises?.[0]?.name || 'Ready to train'}${w.exercises?.length > 1 ? ` +${w.exercises.length - 1} more` : ''}</div>
        <div class="w-meta">
          <span class="tag g">${w.exercises?.length||0} exercises</span>
          <span class="tag o">${Math.max(8, (w.exercises?.reduce((sum, ex) => sum + ((ex.sets || 3) * ((ex.rest || 60) + 45)), 0) || 0) / 60 | 0)} min</span>
          ${w.description ? `<span class="tag">${w.description}</span>` : ''}
        </div>
      </div>
      ${w.isCustom ? `<button onclick="event.stopPropagation();confirmDeleteWorkout('${w.id}')" class="w-action-btn premium">🗑️</button>` : ''}
      <div class="w-arrow">›</div>
    </div>
  `).join('');
  window._allWorkouts = all;
}

window.confirmDeleteWorkout = (id) => {
  showConfirm('Delete Workout', 'Delete this custom workout? This cannot be undone.', async () => {
    await deleteCustomWorkout(id); renderWorkoutList();
    showToast('🗑️ Workout deleted');
  });
};

// ════════════════════════════════════════
//  PICK + CREATE WORKOUTS
// ════════════════════════════════════════
window.openPickModal = () => {
  const all = getAllWorkouts(); window._allWorkouts = all;
  const list = document.getElementById('pick-list'); if (!list) return;
  list.innerHTML = all.map((w,i) => `
    <div class="w-row premium" onclick="pickWorkout(${i})" style="cursor:pointer">
      <div class="w-icon">${w.icon||'🏋️'}</div>
      <div class="w-info">
        <div class="w-topline">
          <div class="w-name">${w.name}</div>
          ${w.isCustom ? '<span class="tag b">Custom</span>' : '<span class="tag g">Built-in</span>'}
        </div>
        <div class="w-preview">${w.exercises?.[0]?.name || 'Ready to train'}${w.exercises?.length > 1 ? ` +${w.exercises.length - 1} more` : ''}</div>
        <div class="w-meta">
          <span class="tag">${w.exercises?.length||0} exercises</span>
          ${w.description ? `<span class="tag g">${w.description}</span>` : ''}
        </div>
      </div>
      <div class="w-arrow">›</div>
    </div>
  `).join('');
  openModal('pick-modal');
};

window.pickWorkout = (i) => {
  closeModal('pick-modal');
  setTimeout(() => startWorkout(i), 220);
};

let builderFilter = 'all';
let draggedExerciseRow = null;
let touchDraggedExerciseRow = null;

function getFavoriteExercises() {
  return state.profile?.favorite_exercises || [];
}

function getRecentExercises() {
  return state.profile?.recent_exercises || [];
}

function queueProfilePreferenceUpdate(updates) {
  saveProfile(updates).catch((err) => console.error('Preference sync failed:', err));
}

function rememberRecentExercises(exerciseNames = []) {
  const next = [
    ...exerciseNames.filter(Boolean),
    ...getRecentExercises(),
  ].filter((name, index, array) => array.indexOf(name) === index).slice(0, 8);
  queueProfilePreferenceUpdate({ recent_exercises: next });
  renderBuilderFilters();
}

function toggleFavoriteExercise(name) {
  if (!name) return;
  const favorites = getFavoriteExercises();
  const next = favorites.includes(name)
    ? favorites.filter((item) => item !== name)
    : [name, ...favorites].slice(0, 12);
  queueProfilePreferenceUpdate({ favorite_exercises: next });
  renderBuilderFilters();
  refreshBuilderRows();
}

function getTemplateWorkout(pack) {
  return {
    id: `tpl_${pack.id}_${Date.now()}`,
    name: pack.workout.name,
    icon: pack.icon,
    description: pack.workout.description,
    exercises: pack.workout.exercises.map((exerciseName) => {
      const preset = getExercisePreset(exerciseName);
      return {
        name: preset.name,
        icon: preset.icon,
        sets: preset.sets,
        reps: preset.reps,
        rest: preset.rest,
        weight: preset.weight || 0,
      };
    }),
    createdAt: new Date().toISOString(),
  };
}

function getRecommendedTemplates(profile = state.profile || {}) {
  const levelRank = { beginner: 1, intermediate: 2, advanced: 3 };
  const targetLevel = levelRank[profile.experience_level || 'intermediate'] || 2;
  const preferredEquipment = profile.preferred_equipment || 'mixed';

  return EXERCISE_PACKS
    .map((pack) => ({
      ...pack,
      recommended:
        (levelRank[pack.level] || 2) <= targetLevel &&
        (pack.equipment.includes(preferredEquipment) || pack.equipment.includes('mixed')),
    }))
    .sort((a, b) => Number(b.recommended) - Number(a.recommended));
}

function renderBuilderTemplates() {
  const container = document.getElementById('builder-templates');
  if (!container) return;
  const templates = getRecommendedTemplates().slice(0, 5);
  container.innerHTML = templates.map((pack) => `
    <button class="template-card ${pack.recommended ? 'recommended' : ''}" onclick="loadBuilderTemplate('${pack.id}')">
      <span class="template-icon">${pack.icon}</span>
      <span class="template-copy">
        <span class="template-title">${pack.title}</span>
        <span class="template-desc">${pack.desc}</span>
      </span>
      ${pack.recommended ? '<span class="template-badge">Recommended</span>' : ''}
    </button>
  `).join('');
}

function renderBuilderFilters() {
  const container = document.getElementById('builder-filters');
  if (!container) return;
  container.innerHTML = BUILDER_FILTERS.map((filter) => `
    <button class="filter-chip ${builderFilter === filter.id ? 'active' : ''}" onclick="setBuilderFilter('${filter.id}')">
      ${filter.label}
    </button>
  `).join('');
}

window.setBuilderFilter = (filterId) => {
  builderFilter = filterId;
  renderBuilderFilters();
  refreshBuilderRows();
};

function matchesBuilderFilter(name) {
  if (builderFilter === 'all') return true;
  if (builderFilter === 'favorites') return getFavoriteExercises().includes(name);
  if (builderFilter === 'recent') return getRecentExercises().includes(name);
  const preset = EXERCISE_LOOKUP[name];
  if (!preset) return false;
  const target = BUILDER_FILTERS.find((filter) => filter.id === builderFilter);
  if (!target) return true;
  if (target.category) return preset.category === target.category;
  if (target.muscle) return preset.muscle === target.muscle;
  return true;
}

function refreshBuilderRows() {
  document.querySelectorAll('#ex-list .ex-row').forEach((row) => {
    const select = row.querySelector('.ex-preset');
    const searchInput = row.querySelector('.ex-search-t');
    const currentName = row.dataset.exerciseName || row.querySelector('.ex-name-t')?.value || '';
    if (select) {
      select.innerHTML = getExerciseOptionsMarkup(currentName, searchInput?.value || '');
      if (select.querySelector(`option[value="${currentName}"]`)) select.value = currentName;
    }
    const favBtn = row.querySelector('.ex-fav');
    if (favBtn) favBtn.classList.toggle('active', getFavoriteExercises().includes(currentName));
  });
}

function getExerciseOptionsMarkup(selectedName = '', searchTerm = '') {
  const query = searchTerm.trim().toLowerCase();
  const groups = EXERCISE_LIBRARY.map(group => {
    const matches = group.exercises.filter(name => (!query || name.toLowerCase().includes(query)) && matchesBuilderFilter(name));
    if (!matches.length) return '';
    return `
    <optgroup label="${group.label}">
      ${matches.map(name => `<option value="${name}" ${name === selectedName ? 'selected' : ''}>${name}</option>`).join('')}
    </optgroup>
  `;
  }).filter(Boolean);

  if (!groups.length) {
    return '<option value="">No matching exercises</option>';
  }

  return groups.join('');
}

function setTimerPlayButton(running) {
  const button = document.getElementById('t-play-btn');
  if (!button) return;
  button.innerHTML = running ? '⏸<span>Pause</span>' : '▶<span>Play</span>';
}

function findExerciseByName(name = '') {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;
  return EX_POOL.find(exercise => exercise.toLowerCase() === normalized) || null;
}

function getExercisePreset(name = '') {
  return EXERCISE_LOOKUP[name] || {
    name: name || 'Exercise',
    category: 'Custom',
    icon: '🏋️',
    sets: 3,
    reps: 12,
    rest: 60,
    weight: 0,
  };
}

function updateBuilderSummary() {
  const rows = Array.from(document.querySelectorAll('#ex-list .ex-row'));
  const exerciseCount = rows.length;
  const totalSets = rows.reduce((sum, row) => sum + (parseInt(row.querySelector('[data-field=sets]')?.value, 10) || 0), 0);
  const totalRest = rows.reduce((sum, row) => sum + (parseInt(row.querySelector('[data-field=rest]')?.value, 10) || 0), 0);
  const estimatedMinutes = Math.max(0, Math.round(((totalSets * 45) + totalRest) / 60));
  const countEl = document.getElementById('builder-count');
  const setsEl = document.getElementById('builder-total-sets');
  const timeEl = document.getElementById('builder-est-time');
  if (countEl) countEl.textContent = String(exerciseCount);
  if (setsEl) setsEl.textContent = String(totalSets);
  if (timeEl) timeEl.textContent = `${estimatedMinutes}m`;
}

function applyExercisePreset(row, exerciseName, syncSearch = true) {
  const preset = getExercisePreset(exerciseName);
  const iconEl = row.querySelector('.ex-ico');
  const nameInput = row.querySelector('.ex-name-t');
  const searchInput = row.querySelector('.ex-search-t');
  const select = row.querySelector('.ex-preset');
  const setsInput = row.querySelector('[data-field=sets]');
  const repsInput = row.querySelector('[data-field=reps]');
  const restInput = row.querySelector('[data-field=rest]');
  const favoriteBtn = row.querySelector('.ex-fav');

  if (iconEl) iconEl.textContent = preset.icon;
  if (nameInput) nameInput.value = preset.name;
  if (syncSearch && searchInput) searchInput.value = preset.name;
  if (setsInput) setsInput.value = preset.sets;
  if (repsInput) repsInput.value = preset.reps;
  if (restInput) restInput.value = preset.rest;
  row.dataset.exerciseName = preset.name;
  row.dataset.exerciseIcon = preset.icon;
  row.dataset.exerciseMuscle = preset.muscle || '';

  if (select) {
    select.innerHTML = getExerciseOptionsMarkup(preset.name, searchInput?.value || preset.name);
    if (select.querySelector(`option[value="${preset.name}"]`)) {
      select.value = preset.name;
    }
  }
  if (favoriteBtn) favoriteBtn.classList.toggle('active', getFavoriteExercises().includes(preset.name));
  updateBuilderSummary();
}

function wireExerciseRow(row) {
  const searchInput = row.querySelector('.ex-search-t');
  const select = row.querySelector('.ex-preset');
  const nameInput = row.querySelector('.ex-name-t');
  const favoriteBtn = row.querySelector('.ex-fav');

  searchInput?.addEventListener('input', (event) => {
    const query = event.target.value.trim();
    const currentValue = select?.value || row.dataset.exerciseName || '';
    if (select) {
      select.innerHTML = getExerciseOptionsMarkup(currentValue, query);
      const firstOption = select.querySelector('option');
      if (firstOption && firstOption.value) {
        select.value = firstOption.value;
      }
    }

    const exactMatch = findExerciseByName(query);
    if (exactMatch) {
      applyExercisePreset(row, exactMatch, false);
    } else if (nameInput) {
      nameInput.value = query;
      row.dataset.exerciseName = query;
      row.dataset.exerciseIcon = '🏋️';
      const iconEl = row.querySelector('.ex-ico');
      if (iconEl) iconEl.textContent = '🏋️';
      updateBuilderSummary();
    }
  });

  select?.addEventListener('change', (event) => {
    if (!event.target.value) return;
    applyExercisePreset(row, event.target.value);
    rememberRecentExercises([event.target.value]);
  });

  nameInput?.addEventListener('input', (event) => {
    const value = event.target.value.trim();
    const exactMatch = findExerciseByName(value);
    if (exactMatch) {
      applyExercisePreset(row, exactMatch);
      return;
    }

    row.dataset.exerciseName = value;
    row.dataset.exerciseIcon = '🏋️';
    const iconEl = row.querySelector('.ex-ico');
    if (iconEl) iconEl.textContent = '🏋️';
    updateBuilderSummary();
  });

  favoriteBtn?.addEventListener('click', () => {
    const currentName = row.dataset.exerciseName || nameInput?.value?.trim();
    toggleFavoriteExercise(currentName);
  });

  row.querySelectorAll('[data-field=sets],[data-field=reps],[data-field=rest]').forEach((input) => {
    input.addEventListener('input', updateBuilderSummary);
  });

  const handle = row.querySelector('.ex-drag');
  row.draggable = true;
  handle?.addEventListener('mousedown', () => row.classList.add('drag-armed'));
  handle?.addEventListener('mouseup', () => row.classList.remove('drag-armed'));
  row.addEventListener('dragstart', () => {
    draggedExerciseRow = row;
    row.classList.add('dragging');
  });
  row.addEventListener('dragend', () => {
    row.classList.remove('dragging', 'drag-armed');
    draggedExerciseRow = null;
    updateBuilderSummary();
  });
  row.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (!draggedExerciseRow || draggedExerciseRow === row) return;
    const rect = row.getBoundingClientRect();
    const insertAfter = event.clientY > rect.top + rect.height / 2;
    const parent = row.parentElement;
    if (!parent) return;
    if (insertAfter) parent.insertBefore(draggedExerciseRow, row.nextSibling);
    else parent.insertBefore(draggedExerciseRow, row);
  });

  handle?.addEventListener('touchstart', () => {
    touchDraggedExerciseRow = row;
    row.classList.add('dragging', 'drag-armed');
  }, { passive: true });

  handle?.addEventListener('touchmove', (event) => {
    if (!touchDraggedExerciseRow) return;
    const touch = event.touches[0];
    if (!touch) return;
    const target = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.ex-row');
    if (!target || target === touchDraggedExerciseRow) return;
    const rect = target.getBoundingClientRect();
    const insertAfter = touch.clientY > rect.top + rect.height / 2;
    const parent = target.parentElement;
    if (!parent) return;
    if (insertAfter) parent.insertBefore(touchDraggedExerciseRow, target.nextSibling);
    else parent.insertBefore(touchDraggedExerciseRow, target);
    event.preventDefault();
  }, { passive: false });

  handle?.addEventListener('touchend', () => {
    row.classList.remove('dragging', 'drag-armed');
    touchDraggedExerciseRow = null;
    updateBuilderSummary();
  });
}

let selectedIcon = '💪';
document.getElementById('icon-picker')?.addEventListener('click', e => {
  const opt = e.target.closest('.icon-opt'); if (!opt) return;
  document.querySelectorAll('.icon-opt').forEach(o => o.classList.remove('selected'));
  opt.classList.add('selected'); selectedIcon = opt.dataset.icon;
});

window.addExToList = (preferredName = '') => {
  const list = document.getElementById('ex-list'); if (!list) return;
  const name = preferredName || EX_POOL[Math.floor(Math.random()*EX_POOL.length)];
  const preset = getExercisePreset(name);
  const d = document.createElement('div'); d.className = 'ex-row';
  d.innerHTML = `
    <div class="ex-drag" title="Drag to reorder">⋮⋮</div>
    <div class="ex-ico">${preset.icon}</div>
    <div class="ex-info">
      <input class="ex-search-t inp" type="text" value="${name}" placeholder="Search an exercise" style="margin-bottom:8px">
      <select class="ex-preset inp" style="margin-bottom:8px">
        ${getExerciseOptionsMarkup(name, name)}
      </select>
      <input class="ex-name-t inp" type="text" value="${name}" placeholder="Exercise name" style="margin-bottom:8px">
      <div class="ex-meta-row">
        <div><div style="font-size:9px;color:var(--t3);font-weight:700;margin-bottom:3px">SETS</div><input class="ex-meta-inp" type="number" value="${preset.sets}" min="1" max="20" data-field="sets"></div>
        <div><div style="font-size:9px;color:var(--t3);font-weight:700;margin-bottom:3px">REPS / SEC</div><input class="ex-meta-inp" type="number" value="${preset.reps}" min="1" max="1000" data-field="reps"></div>
        <div><div style="font-size:9px;color:var(--t3);font-weight:700;margin-bottom:3px">REST(s)</div><input class="ex-meta-inp" type="number" value="${preset.rest}" min="0" max="600" data-field="rest"></div>
      </div>
    </div>
    <button class="ex-fav ${getFavoriteExercises().includes(name) ? 'active' : ''}" type="button" title="Favorite this exercise">★</button>
    <div class="ex-rm" onclick="removeExerciseRow(this)">✕</div>
  `;
  list.appendChild(d);
  wireExerciseRow(d);
  applyExercisePreset(d, name);
  d.querySelector('.ex-name-t').focus();
};

window.loadBuilderTemplate = (templateId) => {
  const template = EXERCISE_PACKS.find((pack) => pack.id === templateId);
  if (!template) return;

  const list = document.getElementById('ex-list');
  if (!list) return;

  const workout = getTemplateWorkout(template);
  document.getElementById('plan-name').value = workout.name;
  document.getElementById('plan-desc').value = workout.description;
  list.innerHTML = '';
  selectedIcon = workout.icon;
  document.querySelectorAll('.icon-opt').forEach((option) => {
    option.classList.toggle('selected', option.dataset.icon === selectedIcon);
  });
  workout.exercises.forEach((exercise) => addExToList(exercise.name));
  rememberRecentExercises(workout.exercises.map((exercise) => exercise.name));
  showToast(`Loaded ${template.title}`, 'success');
};

window.removeExerciseRow = (button) => {
  button.closest('.ex-row')?.remove();
  updateBuilderSummary();
};

window.saveNewWorkout = async () => {
  const name = document.getElementById('plan-name').value.trim();
  if (!name) { showToast('⚠️ Enter workout name'); return; }
  const rows = document.querySelectorAll('#ex-list .ex-row');
  if (!rows.length) { showToast('⚠️ Add at least one exercise'); return; }
  const exercises = Array.from(rows).map(row => ({
    name: row.querySelector('.ex-name-t')?.value?.trim() || 'Exercise',
    icon: row.dataset.exerciseIcon || row.querySelector('.ex-ico')?.textContent?.trim() || '🏋️',
    sets: parseInt(row.querySelector('[data-field=sets]')?.value) || 3,
    reps: parseInt(row.querySelector('[data-field=reps]')?.value) || 12,
    rest: parseInt(row.querySelector('[data-field=rest]')?.value) || 60,
    weight: 0
  }));
  const desc = document.getElementById('plan-desc').value.trim();
  const workout = { id: 'c_' + Date.now(), name, icon: selectedIcon, description: desc || `${exercises.length} exercises`, exercises, createdAt: new Date().toISOString() };
  showLoading('Saving workout...');
  await saveCustomWorkout(workout);
  rememberRecentExercises(exercises.map((exercise) => exercise.name));
  hideLoading();
  document.getElementById('plan-name').value = '';
  document.getElementById('plan-desc').value = '';
  document.getElementById('ex-list').innerHTML = '';
  renderBuilderTemplates();
  renderBuilderFilters();
  updateBuilderSummary();
  closeModal('new-workout-modal');
  showToast('✅ ' + name + ' saved!', 'success');
  renderWorkoutList();
  checkAchievements();
};

// ════════════════════════════════════════
//  TIMER ENGINE
// ════════════════════════════════════════
let curWorkout = null, curExIdx = 0, curSet = 0, totalSets = 3;
let secs = 90, totalSecs = 90, isRest = false;
let timerIv = null, timerRunning = false;
let sessionStart = null, sessionSets = [], elapsedIv = null;
const RING_CIRC = 691;

window.startWorkout = (idx) => {
  const all = window._allWorkouts || getAllWorkouts();
  const w = all[idx]; if (!w || !w.exercises?.length) { showToast('⚠️ No exercises in this workout'); return; }
  curWorkout = w; curExIdx = 0; curSet = 0; isRest = false;
  sessionStart = Date.now(); sessionSets = [];
  clearInterval(timerIv); clearInterval(elapsedIv); timerRunning = false;
  const $= id => document.getElementById(id);
  if ($('t-workout-name')) $('t-workout-name').textContent = w.name;
  if ($('t-total-ex')) $('t-total-ex').textContent = String(w.exercises.length);
  setTimerPlayButton(false);
  loadExercise(0);
  navTo('timer');
  showToast('🏋️ ' + w.name + ' started!');
  haptic([30,20,30]);
  startBpmSim();
  elapsedIv = setInterval(updateElapsed, 1000);
};

function loadExercise(idx) {
  if (!curWorkout) return;
  const ex = curWorkout.exercises[idx]; if (!ex) { endWorkout(); return; }
  totalSets = ex.sets || 3; secs = 90; totalSecs = 90; isRest = false; curSet = 0;
  const $ = id => document.getElementById(id);
  setPhase('WORKOUT', 'var(--g1)', '#39ff14', ex.name, `${ex.sets}×${ex.reps}${ex.weight?' · '+ex.weight+'kg':''} · ${ex.rest}s rest`, `Get ready: ${ex.name}. ${ex.sets} sets of ${ex.reps} reps.`);
  const ring = $('t-ring'); if (ring) ring.style.strokeDashoffset = RING_CIRC;
  renderDots(); updateTimerDisplay(); buildNextList(); updateSessionProgress();
  speak(`Next up: ${ex.name}. ${ex.sets} sets of ${ex.reps} reps.`);
}

function setPhase(phase, phaseColor, ringColor, exercise, sub, coach) {
  const $ = id => document.getElementById(id);
  if ($('t-phase')) { $('t-phase').textContent = phase; $('t-phase').style.color = phaseColor; }
  if ($('t-ring')) $('t-ring').style.stroke = ringColor;
  if ($('t-exercise')) $('t-exercise').textContent = exercise;
  if ($('t-sub')) $('t-sub').textContent = sub;
  if ($('t-coach')) $('t-coach').textContent = coach;
  const timerPage = $('page-timer');
  if (timerPage) timerPage.dataset.phase = phase.toLowerCase();
  const burst = $('t-phase-burst');
  if (burst) {
    burst.className = 'timer-phase-burst';
    void burst.offsetWidth;
    burst.classList.add(phase.toLowerCase() === 'rest' ? 'rest' : 'work', 'show');
  }
}

function getFriendlyAuthError(err, mode = 'login') {
  const raw = err?.message || 'Authentication failed';
  const msg = raw.toLowerCase();

  if (msg.includes('email rate limit exceeded')) {
    return 'Too many email attempts were sent. Wait a few minutes, or sign in if the account already exists.';
  }
  if (msg.includes('user already registered')) {
    return 'This email is already registered. Try signing in instead.';
  }
  if (msg.includes('invalid login credentials')) {
    return 'Incorrect email or password. Double-check your details and try again.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Your email is not confirmed yet. Open the confirmation email, then sign in again.';
  }
  if (msg.includes('password should be at least')) {
    return 'Use a stronger password with at least 6 characters.';
  }
  if (msg.includes('network')) {
    return mode === 'register'
      ? 'The network request failed while creating your account. Check your connection and try again.'
      : 'The network request failed while signing in. Check your connection and try again.';
  }
  return raw;
}

function getFriendlySyncError(err) {
  const raw = err?.message || 'Cloud sync failed.';
  const msg = raw.toLowerCase();
  if (msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'Cloud sync is blocked by your Supabase table policies. Tap to retry after fixing the policy.';
  }
  if (msg.includes('network')) {
    return 'Cloud sync is offline right now. Tap to retry when your connection is back.';
  }
  return 'Cloud sync failed. Tap this banner to retry.';
}

window.retryCloudSync = async () => {
  if (!state.user) {
    showToast('Sign in first to sync your cloud data.', 'error');
    return;
  }

  try {
    setSyncStatus('syncing', 'Retrying...');
    showSyncBanner('Retrying cloud sync...');
    await ensureProfileRecord(state.user);
    await loadAllUserData(state.user);
    await flushPendingQueue();
    hideSyncBanner();
    setSyncStatus('online', 'Synced');
    updateAllUI();
    showToast('Cloud sync restored.', 'success');
  } catch (err) {
    console.error('Retry sync failed:', err);
    setSyncStatus('offline', 'Sync failed');
    showSyncBanner(getFriendlySyncError(err));
    showToast(getFriendlySyncError(err), 'error');
  }
};

window.timerToggle = () => {
  if (timerRunning) {
    clearInterval(timerIv); timerRunning = false;
    setTimerPlayButton(false);
    document.getElementById('t-coach').textContent = 'Paused — tap ▶ to resume.';
  } else {
    timerRunning = true;
    setTimerPlayButton(true);
    timerIv = setInterval(() => { secs--; if (secs <= 0) { clearInterval(timerIv); timerRunning = false; setTimerPlayButton(false); autoNextPhase(); } updateTimerDisplay(); }, 1000);
    const ex = curWorkout?.exercises[curExIdx];
    if (!isRest && ex) document.getElementById('t-coach').textContent = `Go! ${ex.reps} reps of ${ex.name}. Push hard!`;
    else document.getElementById('t-coach').textContent = 'Rest up. Breathe and recover.';
    haptic([20]);
  }
};

window.timerReset = () => {
  clearInterval(timerIv); timerRunning = false; secs = totalSecs;
  setTimerPlayButton(false);
  document.getElementById('t-coach').textContent = 'Reset — tap ▶ to start.';
  updateTimerDisplay(); showToast('↩ Timer reset');
};

window.timerSkip = () => { clearInterval(timerIv); timerRunning = false; setTimerPlayButton(false); autoNextPhase(); };

function autoNextPhase(logEntry = null) {
  if (!curWorkout) return;
  if (!isRest) {
    curSet++;
    sessionSets.push(logEntry || { exercise: curWorkout.exercises[curExIdx]?.name, set: curSet, timestamp: Date.now() });
    renderDots(); updateSessionProgress();
    if (curSet >= totalSets) {
      speak('Exercise complete! Rest up.'); showToast('✅ ' + curWorkout.exercises[curExIdx]?.name + ' done!'); haptic([100,50,100]);
      curExIdx++;
      if (curExIdx >= curWorkout.exercises.length) { endWorkout(); return; }
      isRest = true; secs = 60; totalSecs = 60;
      const nextEx = curWorkout.exercises[curExIdx];
      setPhase('REST', 'var(--blue)', '#00b4ff', `Rest — ${nextEx.name} next`, `60s transition rest`, `Rest up! ${nextEx.name} coming next.`);
    } else {
      const ex = curWorkout.exercises[curExIdx];
      isRest = true; secs = ex.rest; totalSecs = ex.rest;
      setPhase('REST', 'var(--blue)', '#00b4ff', `${ex.name} — Set ${curSet+1} next`, `${ex.rest}s rest`, `Good set! Rest ${ex.rest}s. Set ${curSet+1} coming up.`);
      speak(`Good set. Rest for ${ex.rest} seconds.`); haptic([80,30,80]);
    }
  } else {
    isRest = false;
    if (curExIdx >= curWorkout.exercises.length) { endWorkout(); return; }
    const ex = curWorkout.exercises[curExIdx];
    secs = 90; totalSecs = 90;
    setPhase('WORKOUT', 'var(--g1)', '#39ff14', ex.name, `Set ${curSet+1} of ${totalSets}`, `Set ${curSet+1} — go for it!`);
    speak(`Set ${curSet+1}. Go!`); haptic([200]);
  }
  updateTimerDisplay();
  if (state.profile?.settings?.rest_timer) window.timerToggle();
}

function updateTimerDisplay() {
  const m = String(Math.floor(Math.max(0,secs)/60)).padStart(2,'0');
  const s = String(Math.max(0,secs)%60).padStart(2,'0');
  const tEl = document.getElementById('t-time'); if (tEl) tEl.textContent = m+':'+s;
  const slEl = document.getElementById('t-set-label'); if (slEl) slEl.textContent = `Set ${curSet+1} of ${totalSets}`;
  const ring = document.getElementById('t-ring');
  if (ring) ring.style.strokeDashoffset = RING_CIRC * (Math.max(0,secs)/totalSecs);
}

function renderDots() {
  const d = document.getElementById('t-dots'); if (!d) return;
  d.innerHTML = '';
  for (let i=0; i<totalSets; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot' + (i<curSet?' done':i===curSet?' active':'');
    d.appendChild(dot);
  }
}

function buildNextList() {
  const list = document.getElementById('t-next-list'); if (!list||!curWorkout) return;
  const rem = curWorkout.exercises.slice(curExIdx+1, curExIdx+4);
  if (!rem.length) { list.innerHTML = '<div style="font-size:13px;color:var(--t3);text-align:center;padding:8px">🏁 Last exercise!</div>'; return; }
  list.innerHTML = rem.map((ex,i) => `
    <div class="next-row">
      <div class="next-num">${curExIdx+i+2}</div>
      <div class="next-info"><div class="next-name">${ex.icon||'🏋️'} ${ex.name}</div><div class="next-meta">${ex.sets}×${ex.reps}${ex.weight?' · '+ex.weight+'kg':''}</div></div>
    </div>`).join('');
}

function updateSessionProgress() {
  if (!curWorkout) return;
  const pct = Math.round((curExIdx/curWorkout.exercises.length)*100);
  const bar = document.getElementById('t-prog-bar'); if (bar) bar.style.width = pct+'%';
  const txt = document.getElementById('t-prog-pct'); if (txt) txt.textContent = pct+'%';
  const sets = document.getElementById('t-sets-done'); if (sets) sets.textContent = sessionSets.length+' sets';
  const current = document.getElementById('t-current-ex'); if (current) current.textContent = String(Math.min(curExIdx + 1, curWorkout.exercises.length));
  const progressCopy = document.getElementById('t-progress-copy');
  if (progressCopy) progressCopy.textContent = isRest ? 'Recover, breathe, reset.' : 'Locked in and moving.';
  const nextCount = document.getElementById('t-next-count');
  if (nextCount) nextCount.textContent = `${Math.max(curWorkout.exercises.length - curExIdx - 1, 0)} left`;
}

function updateElapsed() {
  if (!sessionStart) return;
  const e = Math.floor((Date.now()-sessionStart)/1000);
  const m = String(Math.floor(e/60)).padStart(2,'0'); const s = String(e%60).padStart(2,'0');
  const el = document.getElementById('t-elapsed'); if (el) el.textContent = m+':'+s+' elapsed';
}

// ── LOG SET ──
window.logSet = () => {
  if (!curWorkout) { showToast('⚠️ Start a workout first'); return; }
  const ex = curWorkout.exercises[curExIdx]||{};
  document.getElementById('efm-icon').textContent = ex.icon||'💪';
  document.getElementById('efm-name').textContent = ex.name||'Exercise';
  document.getElementById('efm-reps').textContent = ex.reps||10;
  document.getElementById('efm-weight').value = ex.weight||0;
  document.getElementById('efm-notes').value = '';
  document.getElementById('efm-set-info').textContent = `Set ${curSet+1} of ${totalSets}`;
  openModal('ex-focus-modal');
};

window.adjReps = (d) => {
  const el = document.getElementById('efm-reps'); if (el) el.textContent = Math.max(1, parseInt(el.textContent||'10')+d);
};

window.confirmSet = async () => {
  const reps = parseInt(document.getElementById('efm-reps').textContent)||0;
  const weight = parseFloat(document.getElementById('efm-weight').value)||0;
  const notes = document.getElementById('efm-notes').value.trim();
  const ex = curWorkout?.exercises[curExIdx]||{};
  const logEntry = { exercise: ex.name, reps, weight, notes, bpm: curBpm, set: curSet+1, timestamp: Date.now() };
  // Check PR
  if (weight > 0) {
    const isNewPR = await savePR(ex.name, weight, reps);
    if (isNewPR) { showToast(`🏆 New PR! ${ex.name}: ${weight}kg × ${reps} reps`, 'success'); haptic([200,100,200]); }
    else showToast(`✅ ${reps} reps @ ${weight}kg logged`);
  } else showToast(`✅ ${reps} reps logged`);
  closeModal('ex-focus-modal');
  clearInterval(timerIv);
  timerRunning = false;
  setTimerPlayButton(false);
  speak(`Great set! ${reps} reps logged.`); haptic([50,20,50]);
  autoNextPhase(logEntry);
};

// ── END WORKOUT ──
window.confirmEndWorkout = () => {
  showConfirm('End Workout', 'Finish and save this session?', endWorkout);
};

async function endWorkout() {
  clearInterval(timerIv); clearInterval(elapsedIv); timerRunning = false;
  if (!curWorkout) { navTo('home'); return; }
  const durationSecs = Math.floor((Date.now()-sessionStart)/1000);
  const durationMins = Math.max(1, Math.round(durationSecs/60));
  const kcal = Math.max(50, Math.round(durationMins * 8.5));
  const totalVol = sessionSets.reduce((s,l) => s+(l.weight||0)*(l.reps||0), 0);
  const avgHR = bpmHistory.length ? Math.round(bpmHistory.reduce((a,b)=>a+b,0)/bpmHistory.length) : 0;
  const maxHR = bpmHistory.length ? Math.max(...bpmHistory) : 0;
  const xpGained = Math.round(50 + durationMins*2 + sessionSets.length*5);
  const session = {
    workout_name: curWorkout.name, workout_icon: curWorkout.icon||'🏋️',
    started_at: new Date(sessionStart).toISOString(),
    duration_seconds: durationSecs, exercises_completed: curExIdx+1,
    total_exercises: curWorkout.exercises.length, sets_logged: sessionSets.length,
    calories_burned: kcal, total_volume: totalVol, avg_heart_rate: avgHR, max_heart_rate: maxHR,
    set_logs: sessionSets, notes: '', status: 'completed'
  };
  showLoading('Saving workout...', 50);
  await saveSession(session);
  // Update profile stats
  const newXP = (state.profile.xp||0) + xpGained;
  await saveProfile({ xp: newXP, level: Math.floor(newXP/500)+1, total_workouts: getTotalSessions() });
  hideLoading();
  stopBpmSim();
  curWorkout = null; bpmHistory = [];
  checkAchievements();
  showToast(`🎉 Done! ${durationMins}min · ${kcal}kcal · +${xpGained} XP`, 'success');
  speak('Workout complete! Great job! Rest up and recover.');
  haptic([200,100,200,100,200]);
  navTo('home');
}

// ════════════════════════════════════════
//  HEART RATE
// ════════════════════════════════════════
let curBpm = 0, bpmIv = null, bpmHistory = [];

function getBPMZone(bpm) {
  if (bpm < 60 || bpm === 0) return { label:'Rest', cls:'zone-rest' };
  if (bpm < 114) return { label:'Fat Burn', cls:'zone-fat' };
  if (bpm < 152) return { label:'Cardio', cls:'zone-cardio' };
  return { label:'Peak', cls:'zone-peak' };
}

function updateBPMUI(bpm) {
  curBpm = bpm; if (bpm > 0) bpmHistory.push(bpm);
  const zone = getBPMZone(bpm);
  ['t-bpm','modal-bpm'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=bpm||'--'; });
  ['t-bpm-zone','modal-zone'].forEach(id => { const el=document.getElementById(id); if(el) { el.textContent=zone.label; el.className='bpm-zone '+zone.cls; } });
}

function startBpmSim() {
  stopBpmSim(); let base = 75;
  bpmIv = setInterval(() => {
    base += (Math.random()-.38)*8;
    if (timerRunning && !isRest) base = Math.max(base, 100+curExIdx*3);
    if (isRest) base = Math.min(base, 125);
    base = Math.max(55, Math.min(190, base));
    updateBPMUI(Math.round(base));
  }, 2000);
}
function stopBpmSim() { clearInterval(bpmIv); }
window.startHRSimulation = startBpmSim;
window.stopHRSimulation = () => { stopBpmSim(); updateBPMUI(0); showToast('⏹ Monitor stopped'); };

window.importCSV = (input) => {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const lines = e.target.result.split('\n').filter(l=>l.trim());
    let imported = 0;
    lines.forEach(line => { const cols = line.split(','); const bpm = parseInt(cols[1]||cols[0]); if (bpm>30&&bpm<250) { bpmHistory.push(bpm); imported++; } });
    showToast(imported ? `✅ Imported ${imported} BPM readings` : '⚠️ No HR data found');
  };
  reader.readAsText(file);
};

// ════════════════════════════════════════
//  STATS PAGE
// ════════════════════════════════════════
function renderStats() {
  const $ = id => document.getElementById(id);
  const sessions = getTotalSessions();
  const kcal = getTotalCalories();
  const mins = getTotalMinutes();
  const streak = getStreak();
  if ($('s-sessions')) $('s-sessions').textContent = sessions;
  if ($('s-streak')) $('s-streak').textContent = streak + '🔥';
  if ($('s-kcal')) $('s-kcal').textContent = kcal.toLocaleString();
  if ($('s-min')) $('s-min').textContent = mins;
  if ($('stats-subtitle')) $('stats-subtitle').textContent = state.user ? `Synced · ${sessions} sessions recorded` : 'Local data · Sign in to sync';
  renderPRList();
  renderHistoryList();
}

function renderPRList() {
  const list = document.getElementById('pr-list'); if (!list) return;
  const entries = Object.entries(state.prs);
  if (!entries.length) { list.innerHTML = '<div class="empty-state"><div class="empty-icon">🏆</div><div class="empty-title">No records yet</div><div class="empty-sub">Log sets with weight to set records</div></div>'; return; }
  list.innerHTML = `<div class="pr-grid">${entries.slice(0,8).map(([name, pr]) => `
    <div class="pr-card record">
      <div class="pr-weight">${pr.weight}kg</div>
      <div class="pr-name">${name}</div>
      <div class="pr-date">${pr.reps} reps · ${timeAgo(pr.date)}</div>
    </div>`).join('')}</div>`;
}

function renderHistoryList() {
  const list = document.getElementById('history-list'); if (!list) return;
  const hist = state.sessions.filter(s => s.status==='completed');
  if (!hist.length) { list.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-title">No history yet</div><div class="empty-sub">Complete a workout to see it here</div></div>'; return; }
  list.innerHTML = hist.slice(0,30).map(h => `
    <div class="history-row" onclick="showSessionDetail('${h.id||''}')">
      <div class="history-icon">${h.workout_icon||h.icon||'🏋️'}</div>
      <div class="history-info">
        <div class="history-name">${h.workout_name||h.name}</div>
        <div class="history-meta">${timeAgo(h.started_at||h.date)} · ${fmtDuration(h.duration_seconds||0)} · ${h.sets_logged||0} sets</div>
      </div>
      <div class="history-kcal">${(h.calories_burned||h.kcal||0)} kcal</div>
    </div>`).join('');
}

window.showSessionDetail = (id) => {
  const session = state.sessions.find(s => s.id === id) || state.sessions[0]; if (!session) return;
  document.getElementById('sd-title').textContent = session.workout_name || 'Workout';
  document.getElementById('sd-content').innerHTML = `
    <div class="detail-stat"><span class="detail-stat-lbl">Date</span><span class="detail-stat-val">${new Date(session.started_at||session.date).toLocaleString()}</span></div>
    <div class="detail-stat"><span class="detail-stat-lbl">Duration</span><span class="detail-stat-val">${fmtDuration(session.duration_seconds||0)}</span></div>
    <div class="detail-stat"><span class="detail-stat-lbl">Exercises</span><span class="detail-stat-val">${session.exercises_completed||0} / ${session.total_exercises||0}</span></div>
    <div class="detail-stat"><span class="detail-stat-lbl">Sets Logged</span><span class="detail-stat-val">${session.sets_logged||0}</span></div>
    <div class="detail-stat"><span class="detail-stat-lbl">Calories</span><span class="detail-stat-val" style="color:var(--orange)">${session.calories_burned||0} kcal</span></div>
    <div class="detail-stat"><span class="detail-stat-lbl">Volume</span><span class="detail-stat-val">${(session.total_volume||0).toLocaleString()} kg</span></div>
    ${session.avg_heart_rate ? `<div class="detail-stat"><span class="detail-stat-lbl">Avg HR</span><span class="detail-stat-val" style="color:var(--red)">${session.avg_heart_rate} BPM</span></div>` : ''}
    ${(session.set_logs||[]).length ? `<div style="margin-top:16px"><div class="sec-label">Set Log</div>${session.set_logs.map(l=>`<div class="detail-stat"><span class="detail-stat-lbl">${l.exercise} ×${l.reps}</span><span class="detail-stat-val">${l.weight?l.weight+'kg':'BW'}${l.notes?'  📝':''}</span></div>`).join('')}</div>` : ''}
  `;
  openModal('session-detail-modal');
};

function renderCharts() {
  const { labels, sessData, calData } = getWeeklyActivity();
  drawBars('sessionsChart', labels, sessData, '#39ff14');
  drawBars('calsChart', labels, calData, '#ff8c00');
}

function drawBars(id, labels, data, color) {
  const c = document.getElementById(id); if (!c) return;
  const dpr = window.devicePixelRatio||1;
  c.width = c.offsetWidth*dpr; c.height = c.offsetHeight*dpr;
  const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
  const W = c.offsetWidth, H = c.offsetHeight, pad = 10;
  const max = Math.max(...data, 1);
  const bW = (W-pad*2)/labels.length;
  labels.forEach((l,i) => {
    const v = data[i], bh = Math.max(v>0?6:2,(v/max)*(H-32)), x = pad+i*bW+bW*.12, bw = bW*.76, y = H-bh-22;
    const gr = ctx.createLinearGradient(0,y,0,H-22); gr.addColorStop(0,color); gr.addColorStop(1,color+'28');
    ctx.fillStyle = v>0 ? gr : 'rgba(255,255,255,.05)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x,y,bw,Math.max(bh,2),5); else ctx.rect(x,y,bw,Math.max(bh,2));
    ctx.fill();
    if (v>0) { ctx.fillStyle=color; ctx.font='bold 10px Outfit'; ctx.textAlign='center'; ctx.fillText(v,x+bw/2,y-4); }
    ctx.fillStyle='rgba(255,255,255,.45)'; ctx.font='500 10px Outfit'; ctx.textAlign='center'; ctx.fillText(l,x+bw/2,H-5);
  });
}

// ════════════════════════════════════════
//  PROFILE PAGE
// ════════════════════════════════════════
function fillProfileFormFields() {
  const p = state.profile || {};
  const setVal = (id, value = '') => {
    const el = document.getElementById(id);
    if (el) el.value = value ?? '';
  };

  setVal('edit-name', p.display_name || '');
  setVal('edit-bio', p.bio || '');
  setVal('edit-goal', p.weekly_goal || 4);
  setVal('edit-weight', p.body_weight || 75);
  setVal('edit-height', p.height || '');
  setVal('edit-age', p.age || '');
  setVal('edit-exp', p.experience_level || 'intermediate');
  setVal('edit-avatar', p.avatar_url || '');
}

function renderProfilePage() {
  const p = state.profile||{}; const $ = id => document.getElementById(id);
  const av = $('profile-av-el');
  if (av) { av.innerHTML = p.avatar_url ? `<img src="${p.avatar_url}" alt="Avatar">` : (p.display_name||'A')[0].toUpperCase(); }
  if ($('profile-name-el')) $('profile-name-el').textContent = p.display_name||'Athlete';
  if ($('profile-email-el')) $('profile-email-el').textContent = state.user?.email || 'Guest mode';
  if ($('profile-sub-el')) $('profile-sub-el').textContent = `Level ${p.level||1} · ${getTotalSessions()} sessions · ${p.experience_level||'intermediate'}`;
  const xpInLvl = (p.xp||0)%500, xpPct = (xpInLvl/500)*100;
  if ($('xp-bar')) $('xp-bar').style.width = xpPct+'%';
  if ($('xp-label')) $('xp-label').textContent = `Level ${p.level||1} · ${(p.xp||0).toLocaleString()} XP · ${500-xpInLvl} to next level`;
  // Goal
  const weekly = getWeeklyCount(), goal = p.weekly_goal||4;
  const gpct = Math.min(100, Math.round((weekly/goal)*100));
  if ($('p-goal-bar')) $('p-goal-bar').style.width = gpct+'%';
  if ($('p-goal-pill')) $('p-goal-pill').textContent = `${weekly}/${goal}`;
  if ($('p-goal-msg')) $('p-goal-msg').textContent = `${weekly} sessions this week`;
  if ($('p-goal-target')) $('p-goal-target').textContent = `Goal: ${goal}/week`;
  // Auth section
  if (state.user) {
    $('sign-in-btn')&&($('sign-in-btn').style.display='none');
    $('signed-in-section')&&($('signed-in-section').style.display='block');
    if ($('acct-email-display')) $('acct-email-display').textContent = state.user.email;
    if ($('acct-uid-display')) $('acct-uid-display').textContent = 'ID: '+state.user.id.slice(0,12)+'...';
  } else {
    $('sign-in-btn')&&($('sign-in-btn').style.display='block');
    $('signed-in-section')&&($('signed-in-section').style.display='none');
  }
  // Settings toggles
  const settings = p.settings||{};
  ['sound','rest_timer','haptic','notifications'].forEach(k => {
    const el = document.getElementById('toggle-'+k);
    if (el) { if (settings[k]!==false) el.classList.add('on'); else el.classList.remove('on'); }
  });
  fillProfileFormFields();
  renderBadges();
}

function renderBadges() {
  const grid = document.getElementById('badges-grid'); if (!grid) return;
  const earned = state.profile?.badges||[];
  grid.innerHTML = ACHIEVEMENTS.map(a => `
    <div class="badge-card ${earned.includes(a.id)?'earned':''}">
      <div class="badge-icon ${earned.includes(a.id)?'':'badge-locked'}">${a.icon}</div>
      <div class="badge-name">${a.name}</div>
      <div class="badge-desc">${a.desc}</div>
    </div>`).join('');
}

window.saveProfileData = async () => {
  const name = document.getElementById('edit-name').value.trim();
  if (!name) { showToast('⚠️ Name required'); return; }
  showLoading('Saving profile...');
  await saveProfile({
    display_name: name,
    bio: document.getElementById('edit-bio').value.trim(),
    weekly_goal: parseInt(document.getElementById('edit-goal').value)||4,
    body_weight: parseFloat(document.getElementById('edit-weight').value)||75,
    height: parseFloat(document.getElementById('edit-height').value)||175,
    age: parseInt(document.getElementById('edit-age').value)||25,
    experience_level: document.getElementById('edit-exp').value,
    avatar_url: document.getElementById('edit-avatar').value.trim(),
  });
  hideLoading();
  closeModal('profile-edit-modal');
  updateAllUI();
  showToast('✅ Profile saved!', 'success');
};

window.toggleSetting = async (key) => {
  if (!state.profile.settings) state.profile.settings = {};
  state.profile.settings[key] = !state.profile.settings[key];
  const el = document.getElementById('toggle-'+key);
  if (el) { if (state.profile.settings[key]) el.classList.add('on'); else el.classList.remove('on'); }
  persist();
  if (state.user) await saveProfile({ settings: state.profile.settings });
  showToast(state.profile.settings[key] ? `✅ ${key.replace('_',' ')} on` : `🔕 ${key.replace('_',' ')} off`);
};

// ════════════════════════════════════════
//  ONBOARDING
// ════════════════════════════════════════
window.completeOnboarding = async () => {
  const name = document.getElementById('onboard-name').value.trim();
  if (!name) { showToast('⚠️ Enter your name'); return; }
  const goal = parseInt(document.getElementById('onboard-goal').value)||4;
  const exp = document.getElementById('onboard-exp').value||'intermediate';
  const equip = document.getElementById('onboard-equip')?.value || 'mixed';
  const weight = parseFloat(document.getElementById('onboard-weight').value)||75;
  showLoading('Saving...');
  await saveProfile({
    display_name: name,
    weekly_goal: goal,
    experience_level: exp,
    preferred_equipment: equip,
    body_weight: weight,
    onboarded: true
  });
  const shouldSeedStarterPlans = !state.workouts.length && !state.profile.starter_pack_applied;
  if (shouldSeedStarterPlans) {
    const recommended = getRecommendedTemplates({
      ...state.profile,
      experience_level: exp,
      preferred_equipment: equip,
    }).slice(0, 2);
    for (const pack of recommended) {
      await saveCustomWorkout(getTemplateWorkout(pack));
    }
    await saveProfile({ starter_pack_applied: true });
  }
  hideLoading();
  closeModal('onboarding-modal');
  updateAllUI();
  showToast(`🎉 Welcome, ${name}! ${shouldSeedStarterPlans ? 'Starter plans are ready.' : 'Time to train.'}`, 'success');
  const dot = document.getElementById('notif-dot'); if (dot) dot.style.display = 'block';
};

// ════════════════════════════════════════
//  ACHIEVEMENTS
// ════════════════════════════════════════
const ACHIEVEMENTS = [
  {id:'first',name:'First Step',icon:'🎯',desc:'Complete your first workout',check:()=>getTotalSessions()>=1},
  {id:'five',name:'High Five',icon:'✋',desc:'Complete 5 workouts',check:()=>getTotalSessions()>=5},
  {id:'ten',name:'Dedicated',icon:'💪',desc:'Complete 10 workouts',check:()=>getTotalSessions()>=10},
  {id:'fifty',name:'Iron Will',icon:'⚡',desc:'Complete 50 workouts',check:()=>getTotalSessions()>=50},
  {id:'streak3',name:'On Fire 🔥',icon:'🔥',desc:'3-day workout streak',check:()=>getStreak()>=3},
  {id:'streak7',name:'Week Warrior',icon:'🗓️',desc:'7-day streak',check:()=>getStreak()>=7},
  {id:'pr',name:'Record Breaker',icon:'🏆',desc:'Set your first PR',check:()=>Object.keys(state.prs).length>=1},
  {id:'pr5',name:'Strength King',icon:'👑',desc:'Set 5 personal records',check:()=>Object.keys(state.prs).length>=5},
  {id:'custom',name:'Creator',icon:'🛠️',desc:'Create a custom workout',check:()=>state.workouts.length>=1},
  {id:'kcal1k',name:'Calorie Crusher',icon:'🔥',desc:'Burn 1,000 total calories',check:()=>getTotalCalories()>=1000},
  {id:'min60',name:'Endurance',icon:'⏰',desc:'60+ total workout minutes',check:()=>getTotalMinutes()>=60},
  {id:'vol10k',name:'Volume Lord',icon:'📈',desc:'Lift 10,000kg total',check:()=>state.sessions.reduce((s,h)=>s+(h.total_volume||0),0)>=10000},
];

async function checkAchievements() {
  const earned = state.profile?.badges||[];
  const newEarned = [];
  ACHIEVEMENTS.forEach(a => { if (!earned.includes(a.id) && a.check()) newEarned.push(a.id); });
  if (newEarned.length) {
    const allBadges = [...earned, ...newEarned];
    await saveProfile({ badges: allBadges });
    newEarned.forEach(id => {
      const a = ACHIEVEMENTS.find(x=>x.id===id);
      if (a) setTimeout(() => showToast(`🏅 Achievement Unlocked: ${a.name}!`, 'success'), 1500);
    });
  }
}

// ════════════════════════════════════════
//  AUTH UI
// ════════════════════════════════════════
function updateAuthUI() {
  const btn = document.getElementById('auth-header-btn');
  if (btn) btn.textContent = state.user ? '✅' : '👤';
}

// ════════════════════════════════════════
//  VOICE COACHING
// ════════════════════════════════════════
function speak(text) {
  if (!state.profile?.settings?.sound) return;
  if ('speechSynthesis' in window) {
    try { const u = new SpeechSynthesisUtterance(text); u.rate=1.05; u.pitch=1; u.volume=0.85; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch {}
  }
}

// ════════════════════════════════════════
//  NOTIFICATIONS
// ════════════════════════════════════════
window.dismissNotif = () => {
  const dot = document.getElementById('notif-dot'); if (dot) dot.style.display = 'none';
  showToast('🔔 All caught up!');
};

// ════════════════════════════════════════
//  KEYBOARD SHORTCUTS
// ════════════════════════════════════════
document.addEventListener('keydown', e => {
  if (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.contentEditable==='true') return;
  if (e.key===' ' && document.getElementById('page-timer')?.classList.contains('active')) { e.preventDefault(); window.timerToggle(); }
  if (e.key==='Escape') document.querySelectorAll('.overlay.open').forEach(o => closeModal(o.id));
});

// ════════════════════════════════════════
//  UPDATE ALL UI
// ════════════════════════════════════════
function updateAllUI() {
  updateHomeUI(); updateAuthUI();
  renderBuilderTemplates(); renderBuilderFilters(); refreshBuilderRows();
  if (document.getElementById('page-stats')?.classList.contains('active')) { renderStats(); renderCharts(); }
  if (document.getElementById('page-profile')?.classList.contains('active')) renderProfilePage();
}

// ════════════════════════════════════════
//  RESIZE
// ════════════════════════════════════════
window.addEventListener('resize', () => {
  if (document.getElementById('page-stats')?.classList.contains('active')) renderCharts();
});

function setSplashStatus(msg) {
  const el = document.getElementById('splash-status');
  if (el) el.textContent = msg;
}

function hideSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;
  splash.classList.add('out');
  setTimeout(() => { splash.style.display = 'none'; }, 650);
}

async function initApp() {
  setSplashStatus('Preparing your dashboard...');
  updateAuthUI();
  updateAllUI();

  try {
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;

    if (data.session?.user) {
      state.user = data.session.user;
      setSplashStatus('Loading cloud data...');
      setSyncStatus('syncing', 'Syncing...');
      showSyncBanner('Loading your data from cloud...');
      await ensureProfileRecord(data.session.user);
      await loadAllUserData(data.session.user);
      await flushPendingQueue();
      hideSyncBanner();
      setSyncStatus('online', 'Synced');
      appReady = true;
    } else {
      state.user = null;
      setSyncStatus('offline', 'Guest mode');
    }
  } catch (err) {
    console.error('Initialization failed:', err);
    state.user = null;
    hideSyncBanner();
    setSyncStatus('offline', 'Offline');
    showToast('Cloud sync unavailable. Using local data.', 'error');
  }

  renderWorkoutList();
  renderProfilePage();
  updateAllUI();
  updateBuilderSummary();
  checkAchievements();
  hideLoading();
  hideSplash();

  if (!state.user && !state.profile.onboarded) {
    setTimeout(() => openModal('auth-modal'), 250);
  }
}

window.addEventListener('online', async () => {
  if (!state.user) return;
  setSyncStatus('syncing', 'Syncing...');
  await flushPendingQueue();
  setSyncStatus('online', 'Synced');
});

window.addEventListener('offline', () => {
  setSyncStatus('offline', state.user ? 'Offline' : 'Guest mode');
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
  initApp();
}

