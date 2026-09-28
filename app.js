/* ============================================
   HARLEY FITNESS TRACKER — app.js
   ============================================ */

// ── State ──────────────────────────────────
const STATE = {
  timerInterval: null,
  totalSeconds:  30 * 60,   // 30 minutes
  secondsLeft:   30 * 60,
  startTime:     null,
  currentStep:   1,
  finished:      false,
};

// ── Telegram Web App Init ──────────────────
(function initTelegram() {
  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#0a0a0a');
    tg.setBackgroundColor('#0a0a0a');
  }
})();

// ── Helpers ────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// ── Timer ──────────────────────────────────
function startTimer() {
  STATE.startTime   = Date.now();
  STATE.secondsLeft = STATE.totalSeconds;

  STATE.timerInterval = setInterval(() => {
    STATE.secondsLeft--;

    const display = document.getElementById('timer-display');
    display.textContent = formatTime(STATE.secondsLeft);

    // Color states
    display.classList.remove('warning', 'danger');
    if (STATE.secondsLeft <= 60)       display.classList.add('danger');
    else if (STATE.secondsLeft <= 300) display.classList.add('warning');

    if (STATE.secondsLeft <= 0) {
      clearInterval(STATE.timerInterval);
      if (!STATE.finished) finishWorkout(true);
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(STATE.timerInterval);
}

function getElapsedMinutes() {
  const elapsed = STATE.totalSeconds - STATE.secondsLeft;
  return Math.max(1, Math.round(elapsed / 60));
}

// ── Start Workout ──────────────────────────
function startWorkout() {
  vibrate([50, 30, 50]);
  showScreen('screen-training');
  startTimer();
  goToStep(1);
}

// ── Step Navigation ────────────────────────
function goToStep(stepNum) {
  // Hide all steps
  document.querySelectorAll('.exercise-card').forEach(card => {
    card.classList.remove('active-step');
    card.classList.add('hidden-step');
  });

  // Show target step
  const target = document.getElementById(`step-${stepNum}`);
  if (target) {
    target.classList.remove('hidden-step');
    target.classList.add('active-step');
  }

  STATE.currentStep = stepNum;

  // Update progress bar & indicator
  const progressMap = { 1: '33%', 2: '66%', 3: '100%' };
  document.getElementById('progress-bar').style.width = progressMap[stepNum] || '33%';
  document.getElementById('step-indicator').textContent = `${stepNum} / 3`;

  // Scroll to top of training screen
  document.getElementById('screen-training').scrollTo({ top: 0, behavior: 'smooth' });

  vibrate(30);
}

// ── Checkbox Logic ─────────────────────────
function checkSets(stepNum) {
  const checkboxes = document.querySelectorAll(
    `#step-${stepNum} .set-checkbox`
  );
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);

  // Update visual state for each set item
  checkboxes.forEach((cb, idx) => {
    const setItem = cb.closest('.set-item');
    const statusEl = setItem.querySelector('.set-status');

    if (cb.checked) {
      setItem.classList.add('completed');
      statusEl.textContent = '✅';
      vibrate(20);
    } else {
      setItem.classList.remove('completed');
      statusEl.textContent = '⏳';
    }
  });

  // Unlock next/finish button
  if (stepNum === 3) {
    const btn = document.getElementById('btn-finish');
    btn.disabled = !allChecked;
    if (allChecked) {
      btn.style.animation = 'pulseGlow 1.5s ease-in-out infinite';
      vibrate([50, 30, 100]);
    }
  } else {
    const btn = document.getElementById(`btn-next-${stepNum}`);
    btn.disabled = !allChecked;
    if (allChecked) vibrate([50, 30, 100]);
  }
}

// ── Finish Workout ─────────────────────────
function finishWorkout(timerExpired = false) {
  if (STATE.finished) return;
  STATE.finished = true;

  stopTimer();
  vibrate([100, 50, 100, 50, 200]);

  const minutes = getElapsedMinutes();
  document.getElementById('finish-time').textContent = minutes;

  showScreen('screen-finish');

  // Notify Telegram (optional)
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.showPopup({
      title: '🏆 Workout Complete!',
      message: `Mission accomplished, HARLEY! Completed in ${minutes} min.`,
      buttons: [{ type: 'ok' }]
    });
  }
}

// ── Reset App ──────────────────────────────
function resetApp() {
  // Reset state
  STATE.secondsLeft = STATE.totalSeconds;
  STATE.currentStep = 1;
  STATE.finished    = false;
  stopTimer();

  // Reset timer display
  const display = document.getElementById('timer-display');
  display.textContent = '30:00';
  display.classList.remove('warning', 'danger');

  // Reset progress
  document.getElementById('progress-bar').style.width = '33%';
  document.getElementById('step-indicator').textContent = '1 / 3';

  // Reset all checkboxes
  document.querySelectorAll('.set-checkbox').forEach(cb => {
    cb.checked = false;
    const setItem = cb.closest('.set-item');
    setItem.classList.remove('completed');
    setItem.querySelector('.set-status').textContent = '⏳';
  });

  // Reset all buttons
  ['btn-next-1', 'btn-next-2', 'btn-finish'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = true;
      btn.style.animation = '';
    }
  });

  showScreen('screen-welcome');
}