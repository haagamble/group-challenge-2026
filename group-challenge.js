const DB_URL = window.GROUP_CHALLENGE_FIREBASE_CONFIG?.databaseURL || '';
const FIREBASE_API_KEY = window.GROUP_CHALLENGE_FIREBASE_CONFIG?.apiKey || '';
const JOIN_CODE = 'group26';
const CHALLENGE_MONTH = 8; // September is month index 8 (zero-based).
const CHALLENGE_YEAR = 2026;
const CHALLENGE_TIME_ZONE = 'America/New_York';
const DAYS_IN_MONTH = 30;
const PERSON_GOAL = 7500;
const TEST_STORAGE_KEY = 'group-challenge-test-data';
const TEST_IDENTITY_STORAGE_KEY = 'group-challenge-test-player';
const AUTH_STORAGE_KEY = 'group-challenge-firebase-auth';
const INSTALL_DISMISSED_KEY = 'group-challenge-install-dismissed';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const ACTIVITY_DEFS = [
  { id: 'pushups', name: 'Push ups', unit: 'reps', pointsPerAmount: 2, amountPerPointUnit: 1, pointCapAmount: 50, maxPoints: 100, capLabel: '100 pt cap', notes: 'Enter reps - 2 pts each', detail: 'Wall pushups, knee pushups, and full pushups all count.' },
  { id: 'pullups', name: 'Pull ups', unit: 'reps', pointsPerAmount: 10, amountPerPointUnit: 1, pointCapAmount: 10, maxPoints: 100, capLabel: '100 pt cap', notes: 'Enter reps - 10 pts each' },
  { id: 'squats', name: 'Squats', unit: 'reps', pointsPerAmount: 1, amountPerPointUnit: 1, pointCapAmount: 100, maxPoints: 100, capLabel: '100 pt cap', notes: 'Enter reps - 1 pt each' },
  { id: 'situps', name: 'Sit ups', unit: 'reps', pointsPerAmount: 1, amountPerPointUnit: 1, pointCapAmount: 100, maxPoints: 100, capLabel: '100 pt cap', notes: 'Enter reps - 1 pt each', detail: 'Full sit ups and crunches both count.' },
  { id: 'plank', name: 'Plank', unit: 'seconds', pointsPerAmount: 10, amountPerPointUnit: 30, pointCapAmount: 300, maxPoints: 100, capLabel: '100 pt cap', notes: 'Enter seconds - 10 pts per 30 sec' },
  { id: 'walking', name: 'Walking', unit: 'minutes', pointsPerAmount: 10, amountPerPointUnit: 5, pointCapAmount: 50, maxPoints: 100, capLabel: '100 pt cap', notes: 'Enter minutes - 10 pts per 5 min' },
  { id: 'running', name: 'Running', unit: 'minutes', pointsPerAmount: 10, amountPerPointUnit: 5, pointCapAmount: 50, maxPoints: 100, capLabel: '100 pt cap', notes: 'Enter minutes - 10 pts per 5 min' },
  { id: 'dancing', name: 'Dancing', unit: 'minutes', pointsPerAmount: 20, amountPerPointUnit: 5, pointCapAmount: 25, maxPoints: 100, capLabel: '100 pt cap', notes: 'Enter minutes - 20 pts per 5 min' },
  { id: 'stairs', name: 'Stairs', unit: 'stairs', pointsPerAmount: 1, amountPerPointUnit: 5, pointCapAmount: 500, maxPoints: 100, capLabel: '100 pt cap', notes: 'Enter stairs - 1 pt per 5 stairs' },
  { id: 'bird-dog', name: 'Bird dog', unit: 'reps', pointsPerAmount: 2, amountPerPointUnit: 1, pointCapAmount: 50, maxPoints: 100, capLabel: '100 pt cap', notes: 'Enter reps - 2 pts each', detail: 'One rep means a right-left pair.' }
];

const DOUBLE_ACTIVITY_SCHEDULE = [
  'pushups', 'walking', 'situps', 'stairs', 'running', 'plank', 'dancing', 'pullups', 'squats', 'bird-dog',
  'plank', 'running', 'pushups', 'bird-dog', 'walking', 'situps', 'pullups', 'dancing', 'stairs', 'squats',
  'dancing', 'squats', 'stairs', 'walking', 'bird-dog', 'pullups', 'plank', 'running', 'situps', 'pushups'
];

const QUERY_PARAMS = new URLSearchParams(window.location.search);
const TEST_MODE = QUERY_PARAMS.get('test') === '1';

let participants = [];
let entriesByUid = {};
let ownedUid = TEST_MODE ? localStorage.getItem(TEST_IDENTITY_STORAGE_KEY) : null;
let currentUid = null;
let authSession = null;
let authPromise = null;
let hasInvite = false;
let joinOpen = false;
let loadState = 'loading';
let installPrompt = null;

const els = {};

function init() {
  cacheElements();
  checkInvite();
  bindEvents();
  setupInstallPrompt();
  registerServiceWorker();
  startApp();
}

function cacheElements() {
  els.joinBox = document.getElementById('joinBox');
  els.joinName = document.getElementById('joinName');
  els.joinButton = document.getElementById('joinButton');
  els.joinInstructions = document.getElementById('joinInstructions');
  els.nameStatus = document.getElementById('nameStatus');
  els.identityNote = document.getElementById('identityNote');
  els.nameGrid = document.getElementById('nameGrid');
  els.challengeContent = document.getElementById('challengeContent');
  els.testBanner = document.getElementById('testBanner');
  els.resetButton = document.getElementById('resetTestButton');
  els.teamToday = document.getElementById('teamToday');
  els.teamMonth = document.getElementById('teamMonth');
  els.goalPace = document.getElementById('goalPace');
  els.goalText = document.getElementById('goalText');
  els.goalBar = document.getElementById('goalBar');
  els.goalMessage = document.getElementById('goalMessage');
  els.activityGrid = document.getElementById('activityGrid');
  els.todayHeadline = document.getElementById('todayHeadline');
  els.doubleDayBadge = document.getElementById('doubleDayBadge');
  els.personalMonth = document.getElementById('personalMonth');
  els.personalToday = document.getElementById('personalToday');
  els.personalAverage = document.getElementById('personalAverage');
  els.personalActivities = document.getElementById('personalActivities');
  els.clubList = document.getElementById('clubList');
  els.participationList = document.getElementById('participationList');
  els.installCard = document.getElementById('installCard');
  els.installTitle = document.getElementById('installTitle');
  els.installMessage = document.getElementById('installMessage');
  els.installButton = document.getElementById('installButton');
  els.installDismiss = document.getElementById('installDismiss');
  els.toast = document.getElementById('toast');
}

function bindEvents() {
  els.joinButton.addEventListener('click', joinChallenge);
  els.resetButton.addEventListener('click', resetTestData);
  els.joinName.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') joinChallenge();
  });
}

function isStandaloneApp() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function checkInvite() {
  hasInvite = TEST_MODE || QUERY_PARAMS.get('join') === JOIN_CODE || isStandaloneApp();
}

function escapeHtml(value) {
  const chars = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value).replace(/[&<>"']/g, (char) => chars[char]);
}

function storeAuthSession(data) {
  const expiresIn = Number(data.expiresIn || data.expires_in || 3600);
  authSession = {
    idToken: data.idToken || data.id_token,
    refreshToken: data.refreshToken || data.refresh_token,
    localId: data.localId || data.user_id,
    expiresAt: Date.now() + (expiresIn * 1000) - 60000
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authSession));
  return authSession;
}

function readAuthSession() {
  if (authSession) return authSession;
  try {
    authSession = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
  } catch {
    authSession = null;
  }
  return authSession;
}

async function createAnonymousAccount() {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true })
    }
  );
  if (!response.ok) throw new Error('Anonymous Firebase Authentication is not enabled.');
  return storeAuthSession(await response.json());
}

async function refreshAnonymousAccount(session) {
  const response = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken
      })
    }
  );
  if (!response.ok) throw new Error('This device could not restore its Firebase identity.');
  return storeAuthSession(await response.json());
}

async function ensureAuthenticated(forceRefresh = false) {
  if (TEST_MODE) return null;
  if (authPromise) return authPromise;

  authPromise = (async () => {
    const session = readAuthSession();
    if (session && !forceRefresh && session.idToken && session.expiresAt > Date.now()) return session;
    if (session?.refreshToken) return refreshAnonymousAccount(session);
    return createAnonymousAccount();
  })();

  try {
    return await authPromise;
  } finally {
    authPromise = null;
  }
}

async function firebaseRequest(path, options = {}, hasRetried = false) {
  const session = await ensureAuthenticated();
  const separator = path.includes('?') ? '&' : '?';
  const response = await fetch(
    `${DB_URL}/${path}.json${separator}auth=${encodeURIComponent(session.idToken)}`,
    options
  );

  if (response.status === 401 && !hasRetried) {
    await ensureAuthenticated(true);
    return firebaseRequest(path, options, true);
  }
  return response;
}

async function fetchAll() {
  if (TEST_MODE) {
    const data = JSON.parse(localStorage.getItem(TEST_STORAGE_KEY) || 'null');
    participants = data?.participants || [];
    entriesByUid = data?.entriesByUid || {};
    joinOpen = true;
    loadState = 'ready';
    return;
  }

  try {
    const [challengeResponse, joinResponse] = await Promise.all([
      firebaseRequest('groupChallenge'),
      firebaseRequest('settings/joinOpen')
    ]);
    if (!challengeResponse.ok) throw new Error(`Firebase returned ${challengeResponse.status}`);

    const data = await challengeResponse.json();
    joinOpen = joinResponse.ok && await joinResponse.json() === true;
    participants = [];
    entriesByUid = {};
    ownedUid = null;

    if (data && typeof data === 'object') {
      for (const [uid, record] of Object.entries(data)) {
        if (!record?.name) continue;
        participants.push({ uid, name: record.name });
        entriesByUid[uid] = sanitizeEntries(record.entries || {});
        if (uid === authSession.localId) ownedUid = uid;
      }
    }

    participants.sort((a, b) => a.name.localeCompare(b.name));
    loadState = 'ready';
  } catch (error) {
    console.error(error);
    loadState = 'error';
  }
}

function sanitizeEntries(entries) {
  const clean = {};
  if (!entries || typeof entries !== 'object') return clean;

  for (const [dateKey, entry] of Object.entries(entries)) {
    if (!isChallengeDateKey(dateKey) || !entry || typeof entry !== 'object') continue;
    const selected = Array.isArray(entry.selected)
      ? entry.selected.filter((id) => ACTIVITY_DEFS.some((activity) => activity.id === id)).slice(0, 3)
      : [];
    const values = {};
    selected.forEach((activityId) => {
      const activity = getActivity(activityId);
      const rawValue = Number(entry.values?.[activityId] || 0);
      values[activityId] = normalizeActivityAmount(activity, rawValue);
    });
    clean[dateKey] = { selected, values };
  }

  return clean;
}

async function saveOwnedRecord() {
  if (!ownedUid) return;

  if (TEST_MODE) {
    localStorage.setItem(TEST_STORAGE_KEY, JSON.stringify({ participants, entriesByUid }));
    return;
  }

  const participant = participants.find((item) => item.uid === ownedUid);
  if (!participant) return;

  const response = await firebaseRequest(`groupChallenge/${ownedUid}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: participant.name,
      entries: entriesByUid[ownedUid] || {}
    })
  });

  if (!response.ok) throw new Error(`Firebase rejected the write (${response.status}).`);
}

async function joinChallenge() {
  const name = (els.joinName.value || '').trim();
  if (!name) {
    showToast('Please enter your first name.');
    return;
  }

  if (!TEST_MODE && ownedUid) {
    showToast('This device has already joined the challenge.');
    return;
  }
  if (!TEST_MODE && (!hasInvite || !joinOpen)) {
    showToast('Joining is currently closed.');
    return;
  }
  if (participants.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
    showToast('That name is already taken.');
    return;
  }

  const uid = TEST_MODE ? `test-${Date.now()}` : authSession.localId;
  participants.push({ uid, name });
  participants.sort((a, b) => a.name.localeCompare(b.name));
  entriesByUid[uid] = {};
  ownedUid = uid;
  currentUid = uid;

  if (TEST_MODE) localStorage.setItem(TEST_IDENTITY_STORAGE_KEY, uid);

  try {
    await saveOwnedRecord();
  } catch (error) {
    participants = participants.filter((item) => item.uid !== uid);
    delete entriesByUid[uid];
    ownedUid = null;
    currentUid = null;
    showToast(error.message || 'Save failed. Check your connection.');
    render();
    return;
  }

  els.joinName.value = '';
  render();
  showToast(`${name} joined the challenge.`);
}

function resetTestData() {
  if (!TEST_MODE) return;
  localStorage.removeItem(TEST_STORAGE_KEY);
  localStorage.removeItem(TEST_IDENTITY_STORAGE_KEY);
  participants = [];
  entriesByUid = {};
  ownedUid = null;
  currentUid = null;
  render();
  showToast('Test data reset.');
}

function startPolling() {
  fetchAll().then(refreshAll);
  window.setInterval(async () => {
    await fetchAll();
    refreshAll();
  }, 15000);
}

async function startApp() {
  if (TEST_MODE) {
    els.testBanner.classList.remove('hidden');
    startPolling();
    return;
  }

  if (!FIREBASE_API_KEY || FIREBASE_API_KEY === 'REPLACE_WITH_FIREBASE_WEB_API_KEY' || !DB_URL) {
    loadState = 'config';
    render();
    return;
  }

  try {
    await ensureAuthenticated();
    startPolling();
  } catch (error) {
    console.error(error);
    loadState = 'error';
    render();
  }
}

function refreshAll() {
  if (ownedUid && !participants.some((item) => item.uid === ownedUid)) {
    if (TEST_MODE) localStorage.removeItem(TEST_IDENTITY_STORAGE_KEY);
    ownedUid = null;
  }
  if (!currentUid && ownedUid) currentUid = ownedUid;
  if (currentUid && !participants.some((item) => item.uid === currentUid)) currentUid = ownedUid || null;
  render();
}

function render() {
  renderNames();
  renderGoalMeta();
  renderDailyActivities();
  renderPersonalSummary();
  renderClubList();
  renderParticipationList();
  els.challengeContent.classList.toggle('hidden', loadState !== 'ready' || participants.length === 0);
}

function renderNames() {
  els.nameGrid.replaceChildren();

  const canJoin = TEST_MODE || (hasInvite && joinOpen && !ownedUid && loadState === 'ready');
  els.joinBox.classList.toggle('hidden', !canJoin);

  participants.forEach((participant) => {
    const chip = document.createElement(TEST_MODE ? 'button' : 'div');
    chip.className = `member-chip ${participant.uid === currentUid ? 'active' : ''} ${participant.uid === ownedUid ? 'me' : ''}`;
    chip.textContent = participant.uid === ownedUid ? `${participant.name} (you)` : participant.name;
    if (TEST_MODE) {
      chip.type = 'button';
      chip.addEventListener('click', () => selectParticipant(participant.uid));
    }
    els.nameGrid.appendChild(chip);
  });

  els.nameGrid.classList.toggle('hidden', participants.length === 0);
  renderStatus();
  renderIdentityNote();
}

function renderStatus() {
  if (loadState === 'config') {
    els.nameStatus.classList.remove('hidden');
    els.nameStatus.innerHTML = '<strong>Firebase setup is incomplete.</strong>Add your Firebase Web API key and database URL in firebase-config.js.';
    return;
  }
  if (loadState === 'error') {
    els.nameStatus.classList.remove('hidden');
    els.nameStatus.innerHTML = '<strong>We could not load the challenge.</strong>Check your Firebase setup and refresh the page.';
    return;
  }
  if (loadState === 'loading') {
    els.nameStatus.classList.remove('hidden');
    els.nameStatus.innerHTML = '<strong>Loading challenge...</strong>';
    return;
  }
  if (participants.length === 0) {
    els.nameStatus.classList.remove('hidden');
    if (TEST_MODE) {
      els.nameStatus.innerHTML = '<strong>Your test group is empty.</strong>Add a pretend participant above to get started.';
    } else if (hasInvite && joinOpen) {
      els.nameStatus.innerHTML = '<strong>Be the first to join.</strong> Enter your first name above to start the challenge.';
    } else if (hasInvite && !joinOpen) {
      els.nameStatus.innerHTML = '<strong>Joining is closed.</strong>Ask the challenge organizer if you still need access.';
    } else {
      els.nameStatus.innerHTML = '<strong>Ready to join?</strong> Open the invitation link you were sent.';
    }
    return;
  }

  els.nameStatus.classList.add('hidden');
}

function renderIdentityNote() {
  els.identityNote.replaceChildren();
  els.identityNote.classList.toggle('hidden', participants.length === 0);
  if (participants.length === 0) return;

  const message = document.createElement('span');
  if (!ownedUid) {
    message.textContent = TEST_MODE
      ? 'Choose a test user. This browser will remember your choice.'
      : 'Member names are shown for reference. Open your invite link to join from this device.';
  } else {
    const name = getParticipantName(ownedUid);
    message.append('This device is linked to ');
    const strong = document.createElement('strong');
    strong.textContent = name;
    message.append(strong, '.');
  }
  els.identityNote.appendChild(message);

  if (TEST_MODE && ownedUid) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.textContent = 'Change user';
    button.addEventListener('click', forgetTestIdentity);
    els.identityNote.appendChild(button);
  }
}

function selectParticipant(uid) {
  if (!TEST_MODE) return;
  if (!ownedUid) {
    const confirmed = window.confirm(`Use this device as ${getParticipantName(uid)}? You will be able to update this person's progress.`);
    if (!confirmed) return;
    ownedUid = uid;
    localStorage.setItem(TEST_IDENTITY_STORAGE_KEY, uid);
  }
  currentUid = uid;
  render();
}

function forgetTestIdentity() {
  if (!TEST_MODE) return;
  localStorage.removeItem(TEST_IDENTITY_STORAGE_KEY);
  ownedUid = null;
  currentUid = null;
  render();
}

function renderGoalMeta() {
  const teamTotal = computeTeamTotalForDate(getCurrentDate());
  const monthTotal = computeMonthTotal();
  const goalTotal = participants.length * PERSON_GOAL;
  const progress = goalTotal === 0 ? 0 : Math.min((monthTotal / goalTotal) * 100, 100);
  const daysElapsed = Math.max(1, getDaysElapsed());
  const paceTarget = Math.floor((goalTotal / DAYS_IN_MONTH) * daysElapsed);
  const onPace = monthTotal >= paceTarget;

  els.teamToday.textContent = formatNumber(teamTotal);
  els.teamMonth.textContent = formatNumber(monthTotal);
  els.goalPace.textContent = `${Math.round(progress)}%`;
  els.goalText.textContent = `${formatNumber(monthTotal)} / ${formatNumber(goalTotal)}`;
  els.goalBar.style.width = `${progress}%`;
  els.goalMessage.textContent = isBeforeChallenge()
    ? `The challenge starts ${formatDate(getChallengeStartDate())}.`
    : onPace
    ? 'We are on pace to reach the goal.'
    : `We need ${formatNumber(Math.max(0, paceTarget - monthTotal))} more points to stay on target.`;
}

function renderDailyActivities() {
  const today = getCurrentDate();
  const dateKey = formatDateKey(today);
  const currentEntry = getPlayerEntry(ownedUid, dateKey) || { selected: [], values: {} };
  const doubleId = getDoubleActivityId(today);
  const canLog = canLogToday();

  els.todayHeadline.textContent = isBeforeChallenge()
    ? `Starts ${formatDate(today)}`
    : formatDate(today);
  document.getElementById('dailyHint').textContent = isBeforeChallenge()
    ? 'You can join now. Logging opens when the challenge starts on Eastern time.'
    : 'Choose 3 activities. Aim for 250 points today. Max 400. Challenge days follow Eastern time.';
  els.doubleDayBadge.textContent = `2x today: ${getActivity(doubleId).name}`;
  els.doubleDayBadge.classList.remove('hidden');
  els.activityGrid.replaceChildren();

  ACTIVITY_DEFS.forEach((activity) => {
    const selected = currentEntry.selected.includes(activity.id);
    const isDouble = activity.id === doubleId;
    const card = document.createElement('div');
    card.className = `activity-card ${selected ? 'selected' : ''} ${isDouble ? 'double' : ''}`;

    const head = document.createElement('div');
    head.className = 'activity-head';
    const label = document.createElement('div');
    label.className = 'activity-name';
    label.textContent = activity.name;
    const badge = document.createElement('div');
    badge.className = 'activity-badge';
    badge.textContent = activity.capLabel;
    head.append(label, badge);

    const meta = document.createElement('div');
    meta.className = 'activity-meta';
    meta.textContent = activity.notes;

    const doubleCallout = document.createElement('div');
    doubleCallout.className = 'activity-double-callout';
    doubleCallout.textContent = 'Double points today';

    const points = document.createElement('div');
    points.className = 'activity-points';
    const amount = selected ? getActivityValueForToday(activity.id, dateKey) : 0;
    const basePoints = computeActivityBasePoints(activity, amount);
    const earnedPoints = isDouble ? basePoints * 2 : basePoints;
    points.textContent = selected
      ? `${earnedPoints} pts from ${formatAmount(activity, amount)}`
      : `Enter ${activity.unit}`;

    const actions = document.createElement('div');
    actions.className = 'activity-actions';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'activity-toggle';
    toggle.textContent = selected ? 'Selected' : 'Select';
    toggle.disabled = !canLog;
    toggle.addEventListener('click', () => toggleActivity(activity.id));

    const value = document.createElement('input');
    value.type = 'text';
    value.className = 'activity-value';
    value.inputMode = 'numeric';
    value.pattern = '[0-9]*';
    value.setAttribute('aria-label', `${activity.name} ${activity.unit}`);
    value.placeholder = activity.unit;
    value.value = selected ? String(getActivityValueForToday(activity.id, dateKey)) : '0';
    value.disabled = !canLog || !selected;
    value.addEventListener('focus', (event) => event.target.select());
    value.addEventListener('input', (event) => {
      event.target.value = event.target.value.replace(/\D/g, '');
    });
    value.addEventListener('change', (event) => updateActivityValue(activity.id, event.target.value));
    value.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') event.target.blur();
    });

    actions.append(toggle, value);
    card.append(head);
    if (isDouble) card.appendChild(doubleCallout);
    card.append(meta);
    card.append(points, actions);
    els.activityGrid.appendChild(card);
  });
}

function toggleActivity(activityId) {
  if (isBeforeChallenge()) {
    showToast(`The challenge starts ${formatDate(getChallengeStartDate())}.`);
    return;
  }

  if (!ownedUid) {
    showToast('Join the challenge before logging points.');
    return;
  }

  const dateKey = formatDateKey(getCurrentDate());
  const entry = getPlayerEntry(ownedUid, dateKey) || { selected: [], values: {} };
  const selectedIndex = entry.selected.indexOf(activityId);

  if (selectedIndex >= 0) {
    entry.selected.splice(selectedIndex, 1);
    delete entry.values[activityId];
  } else {
    if (entry.selected.length >= 3) {
      showToast('Choose 3 activities max for the day.');
      return;
    }
    entry.selected.push(activityId);
    entry.values[activityId] = 0;
  }

  setOwnedEntry(dateKey, entry);
}

function updateActivityValue(activityId, value) {
  if (isBeforeChallenge()) return;
  if (!ownedUid) return;
  const dateKey = formatDateKey(getCurrentDate());
  const entry = getPlayerEntry(ownedUid, dateKey) || { selected: [], values: {} };
  const activity = getActivity(activityId);
  if (!activity || !entry.selected.includes(activityId)) return;

  entry.values[activityId] = normalizeActivityAmount(activity, value);
  setOwnedEntry(dateKey, entry);
}

async function setOwnedEntry(dateKey, entry) {
  if (!ownedUid) return;
  if (!entriesByUid[ownedUid]) entriesByUid[ownedUid] = {};
  if (entry.selected.length === 0) {
    delete entriesByUid[ownedUid][dateKey];
  } else {
    entriesByUid[ownedUid][dateKey] = entry;
  }
  render();
  try {
    await saveOwnedRecord();
  } catch (error) {
    showToast(error.message || 'Save failed. Check your connection.');
    await fetchAll();
    render();
  }
}

function renderPersonalSummary() {
  if (!ownedUid) {
    els.personalMonth.textContent = '0';
    els.personalToday.textContent = '0';
    els.personalAverage.textContent = '0';
    renderPersonalActivities(null);
    return;
  }

  const todayKey = formatDateKey(getCurrentDate());
  els.personalMonth.textContent = formatNumber(computePlayerMonthTotal(ownedUid));
  els.personalToday.textContent = formatNumber(computePlayerTotalsForDate(ownedUid, todayKey));
  els.personalAverage.textContent = formatNumber(computePlayerDailyAverage(ownedUid));
  renderPersonalActivities(getPlayerEntry(ownedUid, todayKey));
}

function renderPersonalActivities(entry) {
  els.personalActivities.replaceChildren();
  if (!entry?.selected?.length) {
    const empty = document.createElement('div');
    empty.className = 'personal-activity-empty';
    empty.textContent = 'No activities entered yet today.';
    els.personalActivities.appendChild(empty);
    return;
  }

  const dateKey = formatDateKey(getCurrentDate());
  const doubleActivityId = getDoubleActivityId(new Date(`${dateKey}T00:00:00Z`));
  entry.selected.forEach((activityId) => {
    const activity = getActivity(activityId);
    if (!activity) return;
    const amount = normalizeActivityAmount(activity, entry.values?.[activityId] || 0);
    const basePoints = computeActivityBasePoints(activity, amount);
    const points = activityId === doubleActivityId ? basePoints * 2 : basePoints;
    const row = document.createElement('div');
    row.className = 'personal-activity-row';
    const label = document.createElement('span');
    label.textContent = activity.name;
    const value = document.createElement('strong');
    value.textContent = `${formatAmount(activity, amount)} - ${points} pts`;
    row.append(label, value);
    els.personalActivities.appendChild(row);
  });
}

function renderClubList() {
  const previousDay = new Date(getCurrentDate().getTime() - ONE_DAY_MS);
  const previousKey = formatDateKey(previousDay);
  const names = participants
    .filter((participant) => computePlayerTotalsForDate(participant.uid, previousKey) >= 400)
    .map((participant) => participant.name);

  els.clubList.replaceChildren();
  if (!names.length) {
    const item = document.createElement('div');
    item.className = 'club-item';
    item.textContent = 'No one hit 400 yesterday.';
    els.clubList.appendChild(item);
    return;
  }

  names.forEach((name) => {
    const item = document.createElement('div');
    item.className = 'club-item';
    const span = document.createElement('span');
    span.textContent = name;
    const strong = document.createElement('strong');
    strong.textContent = '400 club';
    item.append(span, strong);
    els.clubList.appendChild(item);
  });
}

function renderParticipationList() {
  const today = formatDateKey(getCurrentDate());
  els.participationList.replaceChildren();

  participants.forEach((participant) => {
    const entry = getPlayerEntry(participant.uid, today);
    const hasSaved = !!entry && entry.selected && entry.selected.length > 0;
    const item = document.createElement('div');
    item.className = 'participant-item';
    item.innerHTML = `<span class="participant-name">${escapeHtml(participant.name)}</span>`;
    if (hasSaved) {
      const status = document.createElement('span');
      status.className = 'participant-status active';
      status.textContent = 'Participating';
      item.appendChild(status);
    }
    els.participationList.appendChild(item);
  });
}

function computeTeamTotalForDate(date) {
  const dateKey = formatDateKey(date);
  return participants.reduce((total, participant) => total + computePlayerTotalsForDate(participant.uid, dateKey), 0);
}

function computePlayerTotalsForDate(uid, dateKey) {
  const entry = getPlayerEntry(uid, dateKey);
  if (!entry?.selected) return 0;

  const doubleActivityId = getDoubleActivityId(new Date(`${dateKey}T00:00:00Z`));
  return entry.selected.reduce((total, activityId) => {
    const activity = getActivity(activityId);
    if (!activity) return total;
    const rawValue = normalizeActivityAmount(activity, Number(entry.values?.[activityId] || 0));
    const basePoints = computeActivityBasePoints(activity, rawValue);
    return total + (activityId === doubleActivityId ? basePoints * 2 : basePoints);
  }, 0);
}

function normalizeActivityAmount(activity, value) {
  return Math.max(0, Math.min(Math.round(Number(value) || 0), 9999));
}

function computeActivityBasePoints(activity, amount) {
  const pointUnits = Math.floor(amount / activity.amountPerPointUnit);
  return Math.min(pointUnits * activity.pointsPerAmount, activity.maxPoints);
}

function formatAmount(activity, amount) {
  return `${formatNumber(amount)} ${activity.unit}`;
}

function computePlayerMonthTotal(uid) {
  const entryMap = entriesByUid[uid] || {};
  return Object.keys(entryMap).reduce((total, dateKey) => total + computePlayerTotalsForDate(uid, dateKey), 0);
}

function computePlayerDailyAverage(uid) {
  const entryMap = entriesByUid[uid] || {};
  const loggedDates = Object.keys(entryMap).filter((dateKey) => {
    const entry = entryMap[dateKey];
    return entry?.selected?.length > 0;
  });
  if (!loggedDates.length) return 0;

  const total = loggedDates.reduce((sum, dateKey) => sum + computePlayerTotalsForDate(uid, dateKey), 0);
  return Math.round(total / loggedDates.length);
}

function computeMonthTotal() {
  return participants.reduce((total, participant) => total + computePlayerMonthTotal(participant.uid), 0);
}

function getPlayerEntry(uid, dateKey) {
  if (!uid) return null;
  return entriesByUid[uid]?.[dateKey] || null;
}

function getActivityValueForToday(activityId, dateKey) {
  return getPlayerEntry(ownedUid, dateKey)?.values?.[activityId] ?? 0;
}

function getActivity(activityId) {
  return ACTIVITY_DEFS.find((activity) => activity.id === activityId);
}

function getParticipantName(uid) {
  return participants.find((participant) => participant.uid === uid)?.name || 'Challenge member';
}

function getCurrentDate() {
  const parts = getChallengeDateParts();
  const challengeMonth = CHALLENGE_MONTH + 1;
  if (parts.year < CHALLENGE_YEAR || (parts.year === CHALLENGE_YEAR && parts.month < challengeMonth)) {
    return dateFromChallengeParts(CHALLENGE_YEAR, challengeMonth, 1);
  }
  if (parts.year > CHALLENGE_YEAR || (parts.year === CHALLENGE_YEAR && parts.month > challengeMonth)) {
    return dateFromChallengeParts(CHALLENGE_YEAR, challengeMonth, DAYS_IN_MONTH);
  }
  return dateFromChallengeParts(CHALLENGE_YEAR, challengeMonth, Math.min(parts.day, DAYS_IN_MONTH));
}

function getChallengeStartDate() {
  return dateFromChallengeParts(CHALLENGE_YEAR, CHALLENGE_MONTH + 1, 1);
}

function isBeforeChallenge() {
  const parts = getChallengeDateParts();
  const challengeMonth = CHALLENGE_MONTH + 1;
  return parts.year < CHALLENGE_YEAR || (parts.year === CHALLENGE_YEAR && parts.month < challengeMonth);
}

function canLogToday() {
  return !!ownedUid && !isBeforeChallenge();
}

function getDaysElapsed() {
  const parts = getChallengeDateParts();
  const challengeMonth = CHALLENGE_MONTH + 1;
  if (parts.year < CHALLENGE_YEAR || (parts.year === CHALLENGE_YEAR && parts.month < challengeMonth)) return 1;
  if (parts.year > CHALLENGE_YEAR || (parts.year === CHALLENGE_YEAR && parts.month > challengeMonth)) return DAYS_IN_MONTH;
  return Math.max(1, Math.min(parts.day, DAYS_IN_MONTH));
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(date);
}

function formatDateKey(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isChallengeDateKey(dateKey) {
  return /^2026-09-(0[1-9]|[12][0-9]|30)$/.test(dateKey);
}

function getDoubleActivityId(date) {
  const dayNumber = date.getUTCDate();
  return DOUBLE_ACTIVITY_SCHEDULE[dayNumber - 1] || ACTIVITY_DEFS[(dayNumber - 1) % ACTIVITY_DEFS.length].id;
}

function getChallengeDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CHALLENGE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day)
  };
}

function dateFromChallengeParts(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day));
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  window.clearTimeout(showToast.timerId);
  showToast.timerId = window.setTimeout(() => {
    els.toast.classList.remove('show');
  }, 2200);
}

function setupInstallPrompt() {
  const isIos = isIosDevice();
  const isStandalone = isStandaloneApp();

  els.installTitle.textContent = 'Add this app to your phone';

  if (isIos && !isStandalone && hasInvite) {
    els.joinInstructions.textContent = 'For the smoothest setup, add this page to your Home Screen first, then open the app and join there.';
    els.installCard.classList.remove('hidden');
  }

  if (isStandalone || localStorage.getItem(INSTALL_DISMISSED_KEY) === 'yes') return;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
    els.installTitle.textContent = 'Add this app to your device';
    els.installButton.classList.remove('hidden');
    els.installCard.classList.remove('hidden');
  });

  els.installButton.addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    els.installCard.classList.add('hidden');
  });

  els.installDismiss.addEventListener('click', () => {
    localStorage.setItem(INSTALL_DISMISSED_KEY, 'yes');
    els.installCard.classList.add('hidden');
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    els.installCard.classList.add('hidden');
  });
}

function registerServiceWorker() {
  const isLocalHost = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
  if ('serviceWorker' in navigator && (TEST_MODE || isLocalHost)) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => {});
    return;
  }

  if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./service-worker.js', {
          updateViaCache: 'none'
        });
        await registration.update();
      } catch {
        // The service worker is optional for local test usage.
      }
    });
  }
}

init();
