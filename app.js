/* ============================================
   HARLEY FITNESS TRACKER — app.js v2.0
   ============================================ */

const STATE = {
  timerInterval: null,
  totalSeconds:  30 * 60,
  secondsLeft:   30 * 60,
  startTime:     null,
  currentStep:   1,
  finished:      false,
  totalSteps:    5,
};

// ── Telegram Init ──────────────────────────
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

// ── Звук фінішу ────────────────────────────
function playFinishSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const signals = [
      { freq: 523, start: 0,    duration: 0.3 },
      { freq: 659, start: 0.4,  duration: 0.3 },
      { freq: 784, start: 0.8,  duration: 0.3 },
      { freq: 1047, start: 1.2, duration: 0.8 },
    ];
    signals.forEach(({ freq, start, duration }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + start + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration + 0.1);
    });
  } catch (e) {
    console.log('Звук недоступний:', e);
  }
}

// ── Звук чекбокса ──────────────────────────
function playCheckSound() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}

// ── Timer ──────────────────────────────────
function startTimer() {
  STATE.startTime   = Date.now();
  STATE.secondsLeft = STATE.totalSeconds;

  STATE.timerInterval = setInterval(() => {
    STATE.secondsLeft--;
    const display = document.getElementById('timer-display');
    display.textContent = formatTime(STATE.secondsLeft);

    display.classList.remove('warning', 'danger');
    if (STATE.secondsLeft <= 60)       display.classList.add('danger');
    else if (STATE.secondsLeft <= 300) display.classList.add('warning');

    if (STATE.secondsLeft <= 0) {
      clearInterval(STATE.timerInterval);
      if (!STATE.finished) {
        playFinishSound();
        vibrate([200, 100, 200, 100, 400]);
        finishWorkout(true);
      }
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

// ── Start ──────────────────────────────────
function startWorkout() {
  vibrate([50, 30, 50]);
  showScreen('screen-training');
  startTimer();
  goToStep(1);
}

// ── Navigation ─────────────────────────────
function goToStep(stepNum) {
  document.querySelectorAll('.exercise-card').forEach(card => {
    card.classList.remove('active-step');
    card.classList.add('hidden-step');
  });

  const target = document.getElementById(`step-${stepNum}`);
  if (target) {
    target.classList.remove('hidden-step');
    target.classList.add('active-step');
  }

  STATE.currentStep = stepNum;

  // Прогрес бар
  const pct = (stepNum / STATE.totalSteps) * 100;
  document.getElementById('progress-bar').style.width = `${pct}%`;
  document.getElementById('step-indicator').textContent = `${stepNum} / ${STATE.totalSteps}`;

  document.getElementById('screen-training').scrollTo({ top: 0, behavior: 'smooth' });
  vibrate(30);
}

// ── Checkboxes ─────────────────────────────
function checkSets(stepNum) {
  const checkboxes = document.querySelectorAll(`#step-${stepNum} .set-checkbox`);
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);

  checkboxes.forEach(cb => {
    const setItem  = cb.closest('.set-item');
    const statusEl = setItem.querySelector('.set-status');
    if (cb.checked) {
      setItem.classList.add('completed');
      statusEl.textContent = '✅';
      playCheckSound();
      vibrate(20);
    } else {
      setItem.classList.remove('completed');
      statusEl.textContent = '⏳';
    }
  });

  // Остання вправа
  if (stepNum === STATE.totalSteps) {
    const btn = document.getElementById('btn-finish');
    btn.disabled = !allChecked;
    if (allChecked) vibrate([50, 30, 100]);
  } else {
    const btn = document.getElementById(`btn-next-${stepNum}`);
    if (btn) {
      btn.disabled = !allChecked;
      if (allChecked) vibrate([50, 30, 100]);
    }
  }
}

// ── Finish ─────────────────────────────────
function finishWorkout(timerExpired = false) {
  if (STATE.finished) return;
  STATE.finished = true;
  stopTimer();
  playFinishSound();
  vibrate([100, 50, 100, 50, 200]);

  const minutes = getElapsedMinutes();
  document.getElementById('finish-time').textContent = minutes;
  showScreen('screen-finish');

  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.showPopup({
      title: '🏆 Тренування завершено!',
      message: `Місія виконана, HARLEY! Завершено за ${minutes} хв.`,
      buttons: [{ type: 'ok' }]
    });
  }
}

// ── Reset ──────────────────────────────────
function resetApp() {
  STATE.secondsLeft = STATE.totalSeconds;
  STATE.currentStep = 1;
  STATE.finished    = false;
  stopTimer();

  const display = document.getElementById('timer-display');
  display.textContent = '30:00';
  display.classList.remove('warning', 'danger');

  document.getElementById('progress-bar').style.width = '20%';
  document.getElementById('step-indicator').textContent = '1 / 5';

  document.querySelectorAll('.set-checkbox').forEach(cb => {
    cb.checked = false;
    const setItem = cb.closest('.set-item');
    setItem.classList.remove('completed');
    setItem.querySelector('.set-status').textContent = '⏳';
  });

  // Скидаємо всі кнопки
  for (let i = 1; i <= STATE.totalSteps - 1; i++) {
    const btn = document.getElementById(`btn-next-${i}`);
    if (btn) btn.disabled = true;
  }
  const finBtn = document.getElementById('btn-finish');
  if (finBtn) finBtn.disabled = true;

  showScreen('screen-welcome');
}
