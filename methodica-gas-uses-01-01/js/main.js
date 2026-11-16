/* methodica-gas-uses-01-01 — js/main.js
   Engine + per-screen logic. Part 01 = component 01 of the script (slides 3-18):
   hook, teaching ("הקנייה") and two warm-up questions. Not gated (720 journey:
   הקנייה and שאלות חימום are never score-gated).
   Engine ported from methodica-science-mass-liquid-02-02 (720-templates
   _global-components: canvas, goTo / advanceScreen gates, feedback popup,
   pointer drag-and-drop, image zoom, hint, Progress question, dev bridge).
   Built: S0 (slide 3), S1 (4), S2 (5-6), S3 (7), S4 (8), S5 (9), S6 (10), S7 (11-12), S8 (13), S9 (14),
   S10 (15), S11 (16), S12 (17), S13 (18). S4 / S5: question + interactive applet (not gating). */
'use strict';

const TOTAL_SCREENS = 14;   // slides 3-18 = 14 screens (docs/02-screen-map.md); slide 2 (divider) is Q-01
let currentScreen = 0;

/* ===================== Unit / journey constants =====================
   720-templates _learning-journey.md: part 01 (הוק + הקנייה + חימום) has no gate and
   continues into part 02 (תרגול סטנדרטי א'). Reporting / Resume are added after QA by
   the 720 layer (docs/02-screen-map.md); this part only keeps per-screen results
   (SCREEN_RESULT) that such a layer can read. Nothing here invents a rule the
   journey does not state. */
const LOMDA_ID = 'methodica-gas-uses-01';
const PART_ID = 'methodica-gas-uses-01-01';
const NEXT_PART_ID = 'methodica-gas-uses-01-02';
/* Part 02 exists at ../methodica-gas-uses-01-02/index.html (path verified 2026-10-19, Noa approved
   enabling the crossing): the last screen's Continue now hops to it and pushes this part on
   the route stack, so part 02's first-screen Back returns here (#last). */
const NEXT_PART_AVAILABLE = true;

/* ===================== Companion character (state contract only) =====================
   _global-components "Companion character system". This script has NO character
   selection screen and names no character file (S-05), so no asset map exists yet;
   every character slot is a marked placeholder. The namespaced key and the validated
   read are in place so later parts share one contract. Part 01 never restores a
   selection from storage into its own UI. */
const CHARACTER_STORAGE_KEY = LOMDA_ID + '_selectedCharacter';
const CHARACTER_IDS = ['character-1', 'character-2'];
const DEFAULT_CHARACTER = 'character-1';
function getCharacter() {
  let stored = null;
  try { stored = localStorage.getItem(CHARACTER_STORAGE_KEY); } catch (err) {}
  return CHARACTER_IDS.includes(stored) ? stored : DEFAULT_CHARACTER;
}
window.lomdaState = window.lomdaState || {};
window.lomdaState.selectedCharacter = getCharacter();

/* ===================== Cross-part Back (session-scoped route stack) =====================
   _global-components "Back navigation in a branched journey": every forward hop between
   parts pushes the part being left; the first screen's Back pops it. Part 01 is the
   unit's first part, so with no recorded crossing its first-screen Back stays hidden. */
const NAV_STACK_KEY = LOMDA_ID + '_navStack';
function navStackRead() {
  try {
    const arr = JSON.parse(sessionStorage.getItem(NAV_STACK_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (err) { return []; }
}
function navStackWrite(arr) {
  try { sessionStorage.setItem(NAV_STACK_KEY, JSON.stringify(arr)); } catch (err) {}
}
function hasPrevPart() { return navStackRead().length > 0; }
/* A second press while the next/previous part is loading would push or pop the stack twice
   (Q-48 check 10); the flag is local to this page load - as parts 06/07 (integration, 2026-10-20). */
let leavingPart = false;
window.addEventListener('pageshow', (e) => { if (e.persisted) { leavingPart = false; syncS0Back(); } });   // restored from the back-forward cache
function goToPrevPart() {
  if (leavingPart) return;
  const stack = navStackRead();
  const prev = stack.pop();
  if (!prev) return;
  leavingPart = true;
  navStackWrite(stack);
  window.location.href = '../' + prev + '/index.html#last';
}
function goToNextPart() {
  if (leavingPart) return;
  if (!NEXT_PART_AVAILABLE) return;
  leavingPart = true;
  const stack = navStackRead();
  stack.push(PART_ID);
  navStackWrite(stack);
  window.location.href = '../' + NEXT_PART_ID + '/index.html';
}
function syncS0Back() {
  const btn = document.getElementById('s0-back');
  if (btn) btn.hidden = !hasPrevPart();
}

/* ===================== Canvas scaling ===================== */
/* Viewport-filling canvas (as the reference): scale so the 1280x710 design fits, then
   grow #app along the spare axis (in design px) so it covers the whole window. */
function scaleApp() {
  const app = document.getElementById('app');
  const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 710);
  app.style.width = (window.innerWidth / scale) + 'px';
  app.style.height = (window.innerHeight / scale) + 'px';
  app.style.transform = 'scale(' + scale + ')';
  app.style.left = '0px';
  app.style.top = '0px';
}
window.addEventListener('resize', scaleApp);
window.addEventListener('load', scaleApp);
window.addEventListener('pageshow', scaleApp);

/* ===================== Navigation ===================== */
function closeAllOverlays() {
  document.querySelectorAll('.scq-popup, [id$="-hint-overlay"]').forEach(el => el.classList.add('hidden'));
}

function goTo(n, viaBack) {
  if (n < 0 || n >= TOTAL_SCREENS) return;
  closeAllOverlays();
  closeImgZoom();
  const prev = document.querySelector('.screen.active');
  if (prev) { Motion.cancel(prev); prev.querySelectorAll('video, audio').forEach(v => v.pause()); }
  s2GhStop();
  s7GhStop();
  s4Applet.ghStop();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const next = document.querySelector('.screen[data-screen="' + n + '"]');
  if (next) { next.classList.add('active'); Motion.reveal(next); }
  currentScreen = n;
  resetScreenState(n);
  if (viaBack) reopenFeedbackIfResolved(n);
}

function goBack() {
  if (currentScreen === 0) { goToPrevPart(); return; }
  goTo(currentScreen - 1, true);
}

/* Per-screen "may we advance" gates — the resolved state, never correctness. They live
   here so the Continue button and the ← key agree (_global-components "Advance gates").
   No score gate anywhere in this part. Unbuilt (stub) screens are ungated. */
const SCREEN_GATES = {
  1: () => s1InputOk() && s1Revealed,
  2: () => frcRevealed.s2.every(Boolean),
  4: () => s4.done,
  5: () => s5.done,
  6: () => s6Done,
  7: () => frcRevealed.s7.every(Boolean),
  8: () => s8Heard,
  9: () => s9Done,
  10: () => s10Done,
  12: () => s12Done,
  13: () => s13Done
};
function advanceScreen() {
  const gate = SCREEN_GATES[currentScreen];
  if (gate && !gate()) return;
  if (currentScreen === TOTAL_SCREENS - 1) { goToNextPart(); return; }   // end of the part
  goTo(currentScreen + 1);
}

/* Back onto a resolved question reopens its feedback (final-wrong: on the solution view). */
function reopenFeedbackIfResolved(n) {
  if (n === 4) s4.reopen();
  if (n === 5) s5.reopen();
  if (n === 6 && s6Done) { if (s6Outcome === 'wrong2') s6ApplyView(); else s6ShowPopup(s6Outcome); }
  if (n === 9 && s9Done) { if (s9Outcome === 'wrong2') s9ApplyView(); else s9ShowPopup(s9Outcome); }
  if (n === 10 && s10Done) { if (s10Outcome === 'wrong2') s10ApplyView(); else s10ShowPopup(s10Outcome); }
  if (n === 12 && s12Done) s12ShowPopup(s12Outcome);
  if (n === 13 && s13Done) { if (s13Outcome === 'wrong2') s13ApplyView(); else s13ShowPopup(s13Outcome); }
}

/* Arrow keys navigate — but never while the learner is typing (S1's textarea). */
document.addEventListener('keydown', (e) => {
  const t = e.target;
  if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.isContentEditable || (t.closest && t.closest('.report-modal-overlay')))) return;
  if (e.key === 'ArrowLeft') advanceScreen();
  if (e.key === 'ArrowRight') goBack();
});

/* S8 companion clip: decorative muted one-shot from the start on every entry (goTo pauses it on leave).
   Reduced motion: stays on the first frame, static (Noa 2026-10-25). */
function s8Enter() {
  const v = document.getElementById('s8-video');
  if (!v) return;
  v.pause();
  v.currentTime = 0;
  if (!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  }
  s8NarrationStart();
}

/* S8 narration (request 2026-11-11): plays from the start on every entry (goTo pauses it on leave), the
   text phrases appear as the voice reaches them (data-t), Pause/Play button, Continue opens when the
   narration ends (once heard it stays open on revisits). If the file cannot load, text shows in full and
   Continue is not held back. */
const S8_RATE = 1.1;   // narration speed, 1 = as recorded
let s8Heard = false;
function s8Audio() { return document.getElementById('s8-audio'); }
function s8Sync() {
  const a = s8Audio(), scr = document.getElementById('s8');
  if (!a || !scr) return;
  scr.querySelectorAll('.s8-seg').forEach(el => {
    el.classList.toggle('is-shown', a.currentTime >= parseFloat(el.dataset.t) - 0.05 || a.ended);
  });
}
function s8SetBtn() {
  const a = s8Audio(), btn = document.getElementById('s8-audio-btn');
  if (!a || !btn) return;
  const playing = !a.paused && !a.ended;
  const label = a.ended ? 'إعادة التشغيل' : playing ? 'إيقاف مؤقت' : 'متابعة التشغيل';
  document.getElementById('s8-audio-label').textContent = label;
  document.getElementById('s8-audio-ico').firstElementChild.setAttribute('d', playing
    ? 'M6 4h4v16H6zM14 4h4v16h-4z'
    : a.ended ? 'M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z' : 'M7 4l13 8-13 8z');
  btn.setAttribute('aria-label', a.ended ? 'إعادة تشغيل التعليق الصوتي' : playing ? 'إيقاف التعليق الصوتي مؤقتًا' : 'متابعة تشغيل التعليق الصوتي');
}
function s8Unlock() {
  s8Heard = true;
  const c = document.getElementById('s8-continue');
  if (c) c.disabled = false;
}
function s8NarrationStart() {
  const a = s8Audio(), scr = document.getElementById('s8'), c = document.getElementById('s8-continue');
  if (!a || !scr) return;
  a.pause();
  a.currentTime = 0;
  a.defaultPlaybackRate = S8_RATE; a.playbackRate = S8_RATE; a.preservesPitch = true;
  scr.classList.add('narr-on');
  if (c) c.disabled = !s8Heard;
  s8Sync();
  s8SetBtn();
  const p = a.play();
  if (p && p.catch) p.catch(err => { if (err && err.name === 'NotSupportedError') s8Fallback(); s8SetBtn(); });
}
function s8Fallback() {
  document.getElementById('s8').classList.remove('narr-on');
  s8Unlock();
}
function s8ToggleAudio() {
  const a = s8Audio();
  if (!a) return;
  const v = document.getElementById('s8-video');
  if (a.ended) { a.currentTime = 0; s8Sync(); }
  if (a.paused || a.ended) { a.play().catch(() => {}); if (v && !v.ended) v.play().catch(() => {}); }
  else { a.pause(); if (v) v.pause(); }
  s8SetBtn();
}
(function s8Wire() {
  const a = s8Audio();
  if (!a) return;
  a.addEventListener('timeupdate', s8Sync);
  /* timeupdate ticks only ~4x/s; while playing, follow the audio clock every frame so phrases land on cue. */
  const tick = () => { s8Sync(); if (!a.paused && !a.ended) requestAnimationFrame(tick); };
  a.addEventListener('play', () => { a.playbackRate = S8_RATE; s8SetBtn(); requestAnimationFrame(tick); });
  a.addEventListener('pause', s8SetBtn);
  a.addEventListener('ended', () => { s8Sync(); s8SetBtn(); s8Unlock(); });
  a.addEventListener('error', s8Fallback);
})();

/* S11 companion clip (stretching): same treatment as S8 (Noa 2026-10-25). */
function s11Enter() {
  const v = document.getElementById('s11-video');
  if (!v) return;
  v.pause();
  v.currentTime = 0;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const p = v.play();
  if (p && p.catch) p.catch(() => {});
}

/* S0 diver clip: decorative muted loop from the start on every entry (goTo pauses it on leave).
   Reduced motion: stays on the poster, static. */
function s0PlayVideo(sel = '#s0 video') {
  const v = document.querySelector(sel);
  if (!v) return;
  v.pause();
  v.currentTime = 0;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const p = v.play();
  if (p && p.catch) p.catch(() => {});
}

function resetScreenState(n) {
  if (n === 0) { syncS0Back(); s0PlayVideo(); }
  else if (n === 1) s1Enter();
  else if (n === 2) { frcEnter('s2'); s2GhStart(); }
  else if (n === 4) { s4.enter(); s4Applet.init(); s4Applet.ghEnter(); }
  else if (n === 5) { s5.enter(); s5Applet.init(); }
  else if (n === 6) s6Enter();
  else if (n === 7) { frcEnter('s7'); s7GhStart(); }
  else if (n === 8) s8Enter();
  else if (n === 9) s9Enter();
  else if (n === 10) s10Enter();
  else if (n === 11) s11Enter();
  else if (n === 12) s12Enter();
  else if (n === 13) s13Enter();
}

/* ===================== Progress question (warm-up, 2 questions) =====================
   _global-components "Progress Question". Slide 17: "שאלה 1 מתוך 2 – תרגול חימום",
   slide 18: "שאלה 2 מתוך 2". Item state is derived from the screens' own results. */
const warmupProgress = {
  questions: [
    { number: 1, screens: [12] },
    { number: 2, screens: [13] }
  ]
};
/* Each question screen's own result: null while unresolved, else 'correct' | 'incorrect'.
   Also the read-only seam for the 720 reporting layer (added after QA). */
const SCREEN_RESULT = {
  4: () => s4.done ? (s4.outcome === 'correct' ? 'correct' : 'incorrect') : null,
  5: () => s5.done ? (s5.outcome === 'correct' ? 'correct' : 'incorrect') : null,
  6: () => s6Done ? (s6Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  9: () => s9Done ? (s9Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  10: () => s10Done ? (s10Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  12: () => s12Done ? (s12Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  13: () => s13Done ? (s13Outcome === 'correct' ? 'correct' : 'incorrect') : null
};
function progressItemResult(q) {
  if (!q.screens.length) return null;
  const results = q.screens.map(n => (SCREEN_RESULT[n] ? SCREEN_RESULT[n]() : null));
  if (results.some(r => r === null)) return null;
  return results.every(r => r === 'correct') ? 'correct' : 'incorrect';
}
function progressItemState(q) {
  const result = progressItemResult(q);
  if (result) return result;
  return q.screens.includes(currentScreen) ? 'current' : 'not-answered';
}
const PQ_GLYPHS =
  '<svg class="progress-question__glyph progress-question__glyph--check" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.74578 16.5938C9.38451 16.594 9.03803 16.4504 8.78278 16.1947L5.87132 13.2843C5.55804 12.9709 5.55804 12.463 5.87132 12.1496C6.1847 11.8363 6.69268 11.8363 7.00605 12.1496L9.74578 14.8893L16.9939 7.64114C17.3073 7.32787 17.8153 7.32787 18.1287 7.64114C18.442 7.95452 18.442 8.4625 18.1287 8.77587L10.7088 16.1947C10.4535 16.4504 10.1071 16.594 9.74578 16.5938Z" fill="#fff"/></svg>' +
  '<svg class="progress-question__glyph progress-question__glyph--x" viewBox="0 0 24 24" aria-hidden="true"><path d="M16.7674 7.23264C16.6184 7.08368 16.4163 7 16.2056 7C15.9949 7 15.7929 7.08368 15.6439 7.23264L12 10.8765L8.35615 7.23264C8.20714 7.08368 8.00508 7 7.79439 7C7.5837 7 7.38164 7.08368 7.23264 7.23264C7.08368 7.38164 7 7.5837 7 7.79439C7 8.00508 7.08368 8.20714 7.23264 8.35615L10.8765 12L7.23264 15.6439C7.08368 15.7929 7 15.9949 7 16.2056C7 16.4163 7.08368 16.6184 7.23264 16.7674C7.38164 16.9163 7.5837 17 7.79439 17C8.00508 17 8.20714 16.9163 8.35615 16.7674L12 13.1235L15.6439 16.7674C15.7929 16.9163 15.9949 17 16.2056 17C16.4163 17 16.6184 16.9163 16.7674 16.7674C16.9163 16.6184 17 16.4163 17 16.2056C17 15.9949 16.9163 15.7929 16.7674 15.6439L13.1235 12L16.7674 8.35615C16.9163 8.20714 17 8.00508 17 7.79439C17 7.5837 16.9163 7.38164 16.7674 7.23264Z" fill="#fff"/></svg>';
function updateProgressQuestion(container, state) {
  state.questions.forEach((q, i) => {
    const item = container.querySelector('[data-question="' + (i + 1) + '"]');
    if (!item) return;
    const icon = item.querySelector('.progress-question__icon');
    const label = item.querySelector('.progress-question__label');
    if (!icon.querySelector('.progress-question__glyph')) icon.innerHTML = PQ_GLYPHS;
    icon.classList.remove('progress-question__icon--current', 'progress-question__icon--correct', 'progress-question__icon--incorrect');
    const qState = progressItemState(q);
    const visited = qState !== 'not-answered';
    if (visited) icon.classList.add('progress-question__icon--' + qState);
    label.classList.toggle('progress-question__label--visited', visited);
    const target = q.screens[0];
    const navigable = visited && target != null && target !== currentScreen;
    item.style.cursor = navigable ? 'pointer' : '';
    item.onclick = navigable ? (() => goTo(target)) : null;
  });
  for (let n = 1; n < state.questions.length; n++) {
    const conn = container.querySelector('[data-connector="' + n + '"]');
    if (!conn) continue;
    const qState = progressItemState(state.questions[n - 1]);
    conn.classList.toggle('progress-question__connector--visited', qState === 'correct' || qState === 'incorrect');
  }
}
function syncWarmupProgressNav(sectionEl) {
  const nav = sectionEl && sectionEl.querySelector('.progress-question');
  if (nav) updateProgressQuestion(nav, warmupProgress);
}

/* ===================== Shared: draggable feedback popup ===================== */
let popupDrag = null;
function toCanvas(e) {
  const app = document.getElementById('app');
  const m = app.style.transform.match(/scale\(([^)]+)\)/);
  const scale = m ? parseFloat(m[1]) : 1;
  return { x: (e.clientX - (parseFloat(app.style.left) || 0)) / scale, y: (e.clientY - (parseFloat(app.style.top) || 0)) / scale };
}
function clampPopupPosition(x, y, popupEl) {
  const app = document.getElementById('app');
  const w = popupEl.offsetWidth, h = popupEl.offsetHeight;
  return { x: Math.min(Math.max(x, 0), app.offsetWidth - w), y: Math.min(Math.max(y, 0), (app.offsetHeight - 74) - h) };
}
function popupPointerDown(e, id) {
  if (e.target.closest && e.target.closest('.popup-action')) return;
  const popup = document.getElementById(id);
  if (!popup) return;
  const { x, y } = toCanvas(e);
  const top = isNaN(parseFloat(popup.style.top)) ? popup.offsetTop : parseFloat(popup.style.top);
  popup.style.top = top + 'px';
  popup.style.bottom = 'auto';
  popupDrag = { id, offX: x - (parseFloat(popup.style.left) || popup.offsetLeft), offY: y - top };
  e.preventDefault();
}
window.addEventListener('pointermove', (e) => {
  if (!popupDrag) return;
  if (e.buttons === 0) { popupDrag = null; return; }
  const popup = document.getElementById(popupDrag.id);
  if (!popup) return;
  const { x, y } = toCanvas(e);
  const p = clampPopupPosition(x - popupDrag.offX, y - popupDrag.offY, popup);
  popup.style.left = p.x + 'px';
  popup.style.top = p.y + 'px';
});
window.addEventListener('pointerup', () => { popupDrag = null; });
window.addEventListener('pointercancel', () => { popupDrag = null; });
function resetPopupPosition(popup) {
  popup.style.left = '';
  popup.style.top = '';
  popup.style.bottom = '';
}
function renderPopupAction(popupId, action, onClick, reserve) {
  const popup = document.getElementById(popupId);
  let actions = popup.querySelector('.scq-popup-actions');
  if (actions) actions.remove();
  if (!action) return;
  actions = document.createElement('div');
  actions.className = 'scq-popup-actions';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'popup-action';
  const label = document.createElement('span');
  label.className = 'nav-label';
  [...new Set([action.label, ...(reserve || [])])].forEach(t => {
    const r = document.createElement('span');
    r.className = 'nav-label__reserve';
    r.setAttribute('aria-hidden', 'true');
    r.textContent = t;
    label.appendChild(r);
  });
  const txt = document.createElement('span');
  txt.setAttribute('data-m-swap', '');
  txt.textContent = action.label;
  label.appendChild(txt);
  btn.appendChild(label);
  btn.onclick = onClick;
  actions.appendChild(btn);
  popup.appendChild(actions);
}
function dismissRetryPopup(popupId, done) {
  if (done) return;
  const p = document.getElementById(popupId);
  if (p) p.classList.add('hidden');
}
/* View My Answer toggle: only the changed lines fade (Motion.swap). */
function splitFeedbackTitle(title) {
  const i = title.indexOf('<br>');
  return i < 0 ? { l1: title, l2: null } : { l1: title.slice(0, i), l2: title.slice(i + 4) };
}
function feedbackTitleHtml(t) {
  return t.l2 === null ? t.l1 : t.l1 + '<br><span data-m-swap>' + t.l2 + '</span>';
}
function swapFeedbackView(popup, type, cfg, bodyHtml) {
  const t = splitFeedbackTitle(cfg.title), cur = popup._fb;
  const l2 = popup.querySelector('.scq-popup-title [data-m-swap]'), lab = popup.querySelector('.popup-action [data-m-swap]');
  if (popup.classList.contains('hidden') || !cur || cur.type !== type || cur.l1 !== t.l1 || cur.body !== bodyHtml ||
      t.l2 === null || !l2 || !lab || !cfg.action) return false;
  Motion.swap(l2, t.l2);
  Motion.swap(lab, cfg.action.label);
  return true;
}
/* Body items are paragraphs; an item built by feedbackList() is an authored bulleted list. */
const feedbackList = items => '<ul class="fb-list">' + items.map(t => '<li>' + t + '</li>').join('') + '</ul>';
const feedbackBodyHtml = body => body.map(p => p.startsWith('<ul') ? p : '<p>' + p + '</p>').join('');
/* Shared renderer for a popup config { title, body[], action? }; returns nothing. */
function showFeedback(popupId, type, cfg, base, onToggle) {
  const popup = document.getElementById(popupId);
  const bodyHtml = feedbackBodyHtml(cfg.body);
  if (swapFeedbackView(popup, type, cfg, bodyHtml)) return;
  const t = splitFeedbackTitle(cfg.title);
  popup.classList.remove('type-retry', 'type-correct', 'type-wrong2');
  popup.classList.add('type-' + type);
  popup.querySelector('.scq-popup-title').innerHTML = feedbackTitleHtml(t);
  popup.querySelector('.scq-popup-body').innerHTML = bodyHtml;
  const reserve = [base.action, base.answerView && base.answerView.action].filter(Boolean).map(a => a.label);
  renderPopupAction(popupId, cfg.action || null, onToggle, reserve);
  popup._fb = { type, l1: t.l1, body: bodyHtml };
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);
  popup.classList.remove('hidden');
}
/* Canonical View My Answer copy (_question-template-defaults): the learner-answer view
   keeps the first title line and the body; its second line is fixed UI copy. */
const ANSWER_VIEW_LINE = 'يمكنكم مشاهدة الحل الصحيح مرة أخرى.';
const TOGGLE_TO_ANSWER = 'الانتقال إلى إجابتي';
const TOGGLE_TO_SOLUTION = 'الإجابة الصحيحة';
function wrong2Config(firstLine, solutionLine, body) {
  return {
    title: firstLine + '<br>' + solutionLine, body,
    action: { label: TOGGLE_TO_ANSWER, view: 'answer' },
    answerView: { title: firstLine + '<br>' + ANSWER_VIEW_LINE, action: { label: TOGGLE_TO_SOLUTION, view: 'solution' } }
  };
}

/* ===================== Shared: pointer drag-and-drop helper =====================
   Pointer Events only (mouse, touch, pen); a clone follows the pointer; drop targets
   are hit-tested under the pointer; a press without a move is a tap. */
function createPointerDnd(opts) {
  const targets = new Map();
  let active = null;
  const appScale = () => {
    const m = document.getElementById('app').style.transform.match(/scale\(([^)]+)\)/);
    return m ? parseFloat(m[1]) : 1;
  };
  function attachSource(elem, dragId) {
    if (!elem) return;
    elem.dataset.pdragId = dragId;
    if (elem.dataset.pdragAttached === '1') return;
    elem.dataset.pdragAttached = '1';
    elem.addEventListener('pointerdown', onDown);
  }
  function attachTarget(elem, targetId) { if (elem) targets.set(elem, targetId); }
  function onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const src = e.currentTarget, dragId = src.dataset.pdragId;
    if (!dragId || (opts.canDrag && !opts.canDrag(dragId, src))) return;
    e.preventDefault();
    const rect = src.getBoundingClientRect(), scale = appScale();
    const ghost = src.cloneNode(true);
    ghost.removeAttribute('id'); ghost.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    Object.assign(ghost.style, { position: 'fixed', left: rect.left + 'px', top: rect.top + 'px', width: rect.width / scale + 'px', height: rect.height / scale + 'px', margin: '0', pointerEvents: 'none', zIndex: '9999', opacity: '0.92', transform: 'scale(' + scale + ')', transformOrigin: 'top left' });
    ghost.classList.remove('dragging', 'is-selected');
    ghost.classList.add('pointer-drag-ghost');
    document.body.appendChild(ghost);
    active = { dragId, src, ghost, pointerId: e.pointerId, offX: e.clientX - rect.left, offY: e.clientY - rect.top, moved: false, over: null };
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }
  function hitTarget(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    for (const [t, id] of targets) if (t === el || t.contains(el)) return { t, id };
    return null;
  }
  function onMove(e) {
    if (!active || e.pointerId !== active.pointerId) return;
    if (e.buttons === 0) { onUp(e); return; }
    e.preventDefault();
    if (!active.moved) { active.moved = true; active.src.classList.add('dragging'); if (opts.onPick) opts.onPick(active.dragId, active.src); }
    active.ghost.style.left = e.clientX - active.offX + 'px';
    active.ghost.style.top = e.clientY - active.offY + 'px';
    const hit = hitTarget(e.clientX, e.clientY), id = hit ? hit.id : null;
    if (id !== active.over) {
      for (const [t] of targets) t.classList.remove('drag-over');
      if (hit) hit.t.classList.add('drag-over');
      active.over = id;
    }
  }
  function onUp(e) {
    if (!active || (e && e.pointerId !== undefined && e.pointerId !== active.pointerId)) return;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
    const { dragId, src, ghost, moved, over } = active;
    for (const [t] of targets) t.classList.remove('drag-over');
    active = null;
    src.classList.remove('dragging');
    ghost.remove();
    if (!moved) { if (opts.onTap) opts.onTap(dragId, src); return; }
    if (over && opts.onDrop) opts.onDrop(dragId, over); else if (opts.onCancel) opts.onCancel(dragId);
  }
  return { attachSource, attachTarget };
}

/* ===================== Image zoom (global) ===================== */
/* Image Zoom Surface: fit the media ratio inside 1200x690, with 24/72 padding. */
const ZOOM_MEDIA_MAX_W = 1200 - 2 * 72, ZOOM_MEDIA_MAX_H = 690 - 2 * 24;
let zoomReturnFocus = null;
function openImgZoom(trigger) {
  const wrapper = trigger.closest('[data-zoom-wrapper]');
  const modal = document.getElementById('img-zoom-modal');
  const stage = document.getElementById('img-zoom-modal-stage');
  if (!wrapper || !modal || !stage) return;
  const panel = modal.querySelector('.img-zoom-modal__panel');
  const img = wrapper.querySelector('img');
  const ratio = img && img.naturalWidth ? img.naturalWidth / img.naturalHeight : wrapper.offsetWidth / wrapper.offsetHeight;
  let uw = wrapper.offsetWidth, uh = uw / ratio;
  if (uh > wrapper.offsetHeight) { uh = wrapper.offsetHeight; uw = uh * ratio; }
  // Enlarge even when the screen already displays the source at its native resolution.
  const k = Math.min(ZOOM_MEDIA_MAX_W / uw, ZOOM_MEDIA_MAX_H / uh);
  const clone = wrapper.cloneNode(true);
  clone.querySelectorAll('.img-zoom-btn').forEach(b => b.remove());
  clone.querySelectorAll('[data-reveal]').forEach(el => el.removeAttribute('data-reveal'));
  Object.assign(clone.style, { position: 'absolute', left: '0', top: '0', margin: '0', borderRadius: '0',
    width: uw + 'px', height: uh + 'px', transform: 'scale(' + k + ')', transformOrigin: '0 0' });
  stage.innerHTML = '';
  stage.style.width = (uw * k) + 'px';
  stage.style.height = (uh * k) + 'px';
  // The clone is outside #sN: fill it without the question image's size caps.
  const cimg = clone.querySelector('img');
  if (cimg) Object.assign(cimg.style, { width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none' });
  stage.appendChild(clone);
  panel.setAttribute('aria-label', trigger.dataset.zoomAlt || 'عرض الصورة مكبّرة');
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  zoomReturnFocus = trigger;
  modal.querySelector('.img-zoom-modal__close').focus();
}
function closeImgZoom() {
  const modal = document.getElementById('img-zoom-modal');
  if (!modal || modal.classList.contains('hidden')) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  document.getElementById('img-zoom-modal-stage').innerHTML = '';
  if (zoomReturnFocus && document.contains(zoomReturnFocus)) zoomReturnFocus.focus();
  zoomReturnFocus = null;
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-zoom-src]');
  if (t) { openImgZoom(t); return; }
  if (e.target.closest('[data-zoom-close]')) closeImgZoom();
});

/* ===================== Hint overlay (shared) ===================== */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const hint = document.querySelector('[id$="-hint-overlay"]:not(.hidden)');
  if (hint) { closeHintOverlay(hint); return; }
  closeImgZoom();
});
let hintReturnFocus = null;
function openHintOverlay(id, trigger) {
  const ov = document.getElementById(id);
  if (!ov) return;
  hintReturnFocus = trigger || null;
  ov.classList.remove('hidden');
  const btn = ov.querySelector('.hint-card__close');
  if (btn) btn.focus();
}
function closeHintOverlay(ov) {
  if (!ov || ov.classList.contains('hidden')) return;
  ov.classList.add('hidden');
  if (hintReturnFocus && document.contains(hintReturnFocus)) hintReturnFocus.focus();
  hintReturnFocus = null;
}

/* ===================== Nav labels ===================== */
function initNavLabels() {
  document.querySelectorAll('.nav-label').forEach(l => {
    const span = l.querySelector('span');
    if (span) l.dataset.label = span.textContent;
  });
}
function setNavLabel(btn, text) {
  const l = btn && btn.querySelector('.nav-label');
  if (!l) return;
  l.querySelector('span').textContent = text;
  l.dataset.label = text;
}

/* ===================== S1 (index 1) — HookOpenQuestion, local variant (slide 4) =====================
   720-templates HookOpenQuestion: free text, no check, no score, no feedback.
   Local variant (producer approval 2026-10-22): the bottom primary button enables from
   the textarea. First press reveals the companion and bubble, then changes to "המשך";
   second press advances. Re-entry preserves both the typed text and the reveal state.
   S1_MIN_CHARS — the script does not state a minimum (HookOpenQuestion.md: read it from
   the source, do not assume 2). PROVISIONAL value 1 = any non-blank text, pending Q-23. */
const S1_MIN_CHARS = 1;   // PROVISIONAL — Q-23
let s1Revealed = false;
function s1InputOk() {
  const el = document.getElementById('s1-input');
  return !!el && el.value.trim().length >= S1_MIN_CHARS;
}
function s1InputChange() {
  const ok = s1InputOk();
  const btn = document.getElementById('s1-continue');
  btn.disabled = !ok;
  setNavLabel(btn, s1Revealed ? 'متابعة' : 'هل إجابتي صحيحة؟');
}
function s1Primary() {
  if (!s1InputOk()) return;
  if (s1Revealed) { advanceScreen(); return; }
  s1Reveal();
}
function s1Reveal() {
  if (!s1InputOk() || s1Revealed) return;
  s1Revealed = true;
  document.getElementById('s1-character').hidden = false;
  s1PlayVideo();
  s1InputChange();
}
function s1Enter() {
  document.getElementById('s1-character').hidden = !s1Revealed;
  s0PlayVideo('#s1 .scq-img video');
  if (s1Revealed) s1PlayVideo();
  s1InputChange();
}
/* S1 companion clip (thinking): same treatment as S8/S11 — from the start, static under
   reduced motion (Noa 2026-10-26); goTo() pauses it on leave. */
function s1PlayVideo() {
  const v = document.getElementById('s1-video');
  if (!v) return;
  v.pause();
  v.currentTime = 0;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const p = v.play();
  if (p && p.catch) p.catch(() => {});
}

/* ===================== S2 / S7 — FlipCardsReveal (slides 5-6, 11-12) =====================
   S2 local two-way variant (Noa approved 2026-11-04): click / Enter / Space toggles
   image/text; s2FrcFlipped tracks the current face separately from seen-at-least-once.
   S7 is two-way as well (Noa approved 2026-11-05), same mechanics as S2.
   The canonical unlock rule: Continue enables once every card has been revealed, and stays
   enabled across navigation (frcRevealed only ever turns true). frcEnter() restores the faces
   and the button on every entry. One state array per screen, keyed by the section id. */
const frcRevealed = { s2: [false, false], s7: [false, false, false] };
const s2FrcFlipped = [false, false];
const s7FrcFlipped = [false, false, false];
function frcApply(card, revealed) {
  card.classList.toggle('is-flipped', revealed);
  card.setAttribute('aria-expanded', revealed ? 'true' : 'false');
  card.querySelector('.frc-card-front').setAttribute('aria-hidden', revealed ? 'true' : 'false');
  card.querySelector('.frc-card-back').setAttribute('aria-hidden', revealed ? 'false' : 'true');
  card.querySelector('.frc-hint-text').textContent = revealed
    ? ' انقروا لقلب البطاقة والعودة إلى الصورة.'
    : ' انقروا لقلب البطاقة.';
  // S7 fronts are looping videos: play while the front face shows, pause on the back.
  const vid = card.querySelector('.frc-card-front video');
  if (vid) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (revealed || reduce) vid.pause();
    else if (card.closest('.screen').classList.contains('active')) vid.play().catch(() => {});
  }
}
function frcCheckUnlock(id) {
  document.getElementById(id + '-continue').disabled = !frcRevealed[id].every(Boolean);
}
function frcFlip(card) {
  const id = card.closest('.screen').id, i = +card.dataset.index;
  const flipped = id === 's2' ? s2FrcFlipped : s7FrcFlipped;
  if (id === 's2') { s2GhUnderstood = true; s2GhStop(); }
  else { s7GhUnderstood = true; s7GhStop(); }
  flipped[i] = !flipped[i];
  frcRevealed[id][i] = true;
  frcApply(card, flipped[i]);
  frcCheckUnlock(id);
}
function frcEnter(id) {
  const flipped = id === 's2' ? s2FrcFlipped : s7FrcFlipped;
  document.querySelectorAll('#' + id + ' .frc-card').forEach(c => frcApply(c, flipped[+c.dataset.index]));
  frcCheckUnlock(id);
}

/* S2 gesture hint (Noa approved 2026-11-04): reuse S7's hand/rings and
   two-cycle timing locally. Stop on any card activation or departure; after
   the first activation it never replays. Kept outside the rotating card. */
const S2_GH_DELAY = 1000;
let s2GhUnderstood = false, s2GhToken = 0, s2GhTimer = null;
function s2GhStop() {
  s2GhToken++;
  if (s2GhTimer) { clearTimeout(s2GhTimer); s2GhTimer = null; }
  const el = document.getElementById('s2-gh');
  el.onanimationend = null;
  el.classList.remove('s7gh-active');
  el.classList.add('hidden');
}
function s2GhStart() {
  s2GhStop();
  if (s2GhUnderstood) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const myToken = s2GhToken, el = document.getElementById('s2-gh');
  s2GhTimer = setTimeout(() => {
    s2GhTimer = null;
    if (myToken !== s2GhToken) return;
    el.classList.remove('hidden');
    void el.offsetWidth;
    el.classList.add('s7gh-active');
    el.onanimationend = (e) => {
      if (e.target !== el || myToken !== s2GhToken) return;
      s2GhStop();
    };
  }, S2_GH_DELAY);
}

/* S7 gesture hint (Noa 2026-11-03) - _gesture-hints.md, finite-keyframe shape: two
   demonstrations on entry, then hidden; a flip of any card (frcFlip, the real mechanic)
   sets s7GhUnderstood and stops it for good; goTo() stops it on leave. Starts once the
   cards' reveal (data-reveal="2") has landed. Reduced motion = no hint. */
const S7_GH_DELAY = 1000;
let s7GhUnderstood = false, s7GhToken = 0, s7GhTimer = null;
function s7GhStop() {
  s7GhToken++;
  if (s7GhTimer) { clearTimeout(s7GhTimer); s7GhTimer = null; }
  const el = document.getElementById('s7-gh');
  el.classList.remove('s7gh-active');
  el.classList.add('hidden');
}
function s7GhStart() {
  s7GhStop();
  if (s7GhUnderstood) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const myToken = s7GhToken, el = document.getElementById('s7-gh');
  s7GhTimer = setTimeout(() => {
    s7GhTimer = null;
    if (myToken !== s7GhToken) return;
    el.classList.remove('hidden');
    void el.offsetWidth;
    el.classList.add('s7gh-active');
    el.addEventListener('animationend', function onEnd(e) {
      if (e.target !== el) return;                 // the rings' own ends bubble up
      el.removeEventListener('animationend', onEnd);
      if (myToken !== s7GhToken) return;
      el.classList.remove('s7gh-active');
      el.classList.add('hidden');
    });
  }, S7_GH_DELAY);
}

/* ===================== S6 (index 6) — DragAndDropQuestion, Image Top (slide 10) =====================
   Ported from methodica-science-mass-liquid-02-01 S7: each target holds one chip;
   dropping on an occupied target evicts its chip to the bank; placed chips stay
   draggable until checked; Check enables when all three targets are filled; two
   attempts (template default, none authored otherwise): retry -> each target ✓ / ✕
   until its content changes, Retry gate on the identical placement; final wrong ->
   solution at once + View My Answer Toggle (the slide's "מעבר לתשובה שלי"). No hint (note).
   Feedback = slide 10's boxes as authored (incl. the spelling "וממפלא", copied verbatim -
   docs/03 D, not corrected without approval). Final-wrong when partly right = the slide's
   own "התשובה נכונה חלקית." + its solution line; when nothing is right, the canonical
   first line "התשובה אינה נכונה." + the same solution line. */
const S6Q = {
  accept: { 's6-t-shape': ['s6-d-shape'], 's6-t-fill': ['s6-d-fill'], 's6-t-compress': ['s6-d-compress'] },
  reveal: { 's6-t-shape': 's6-d-shape', 's6-t-fill': 's6-d-fill', 's6-t-compress': 's6-d-compress' },
  maxAttempts: 2
};
const S6_LABEL = { 's6-d-shape': 'ليس له شكل ثابت', 's6-d-fill': 'يأخذ شكل الوعاء، ويملأ حجمه كله', 's6-d-compress': 'قابل للانضغاط (حجمه يصغُر)' };
const S6_NAME = { 's6-t-shape': 'الصورة اليمنى', 's6-t-fill': 'الصورة الوسطى', 's6-t-compress': 'الصورة اليسرى' };
/* The slide's three property lines are a bulleted list (buChar •) - rendered as one <ul>. */
const S6_EXPLAIN = ['هذه خصائص الغاز التي تعلّمناها:', feedbackList(['ليس له شكل ثابت.', 'إنه يأخذ شكل الوعاء الذي يوجد فيه، ويملأ حجمه كله.', 'إنه قابل للانضغاط.'])];
const S6_SOLUTION_LINE = 'الإجابة الصحيحة معروضة.';
const S6_FEEDBACK = {
  retry:        { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مجددًا؟'] },
  retryPartial: { title: 'الإجابة ليست صحيحة بالكامل.', body: ['هل نحاول مجددًا؟'] },
  correct:      { title: 'أحسنتم!', body: S6_EXPLAIN },
  wrong2:        wrong2Config('الإجابة غير صحيحة.', S6_SOLUTION_LINE, S6_EXPLAIN),
  wrong2Partial: wrong2Config('الإجابة صحيحة جزئيًا.', S6_SOLUTION_LINE, S6_EXPLAIN)
};
const s6Place = { 's6-d-shape': 'source', 's6-d-fill': 'source', 's6-d-compress': 'source' };
let s6Attempts = 0, s6Done = false, s6Outcome = null, s6LastWrong = null;
let s6Marks = null, s6Judged = null;
let s6Answer = null, s6View = 'solution', s6RetryPartial = false;
let s6Pick = null, s6Dnd = null, s6SkipClick = false;
const s6Targets = () => Object.keys(S6Q.accept);
const s6In = t => Object.keys(s6Place).find(d => s6Place[d] === t) || null;
const s6Snap = () => JSON.stringify(s6Place);
function s6MarkOf(t) {
  if (!s6Marks) return null;
  if (s6Done || !s6Judged) return s6Marks[t];
  return s6In(t) === s6Judged[t] ? s6Marks[t] : null;
}
function s6Announce(msg) { const l = document.getElementById('s6-live'); if (l) l.textContent = msg; }
function s6Render() {
  Object.keys(s6Place).forEach(d => {
    const chip = document.getElementById(d), placed = s6Place[d] !== 'source';
    chip.classList.remove('dragging');
    chip.classList.toggle('is-placed', placed);
    chip.classList.toggle('is-selected', s6Pick === d);
    chip.setAttribute('aria-pressed', s6Pick === d ? 'true' : 'false');
    chip.disabled = placed || s6Done;
    chip.setAttribute('aria-hidden', placed ? 'true' : 'false');
  });
  s6Targets().forEach(t => {
    const zone = document.getElementById(t), d = s6In(t), mark = s6MarkOf(t);
    zone.textContent = '';
    zone.classList.toggle('occupied', !!d && !mark);
    zone.classList.toggle('correct', mark === 'correct');
    zone.classList.toggle('wrong', mark === 'wrong');
    zone.classList.toggle('locked', s6Done);
    if (mark) { const m = document.createElement('span'); m.className = 'itd-mark'; m.setAttribute('aria-hidden', 'true'); zone.appendChild(m); }
    if (d) {
      const card = document.createElement('span');
      card.className = 'itd-placed';
      card.innerHTML = '<span class="itd-label">' + S6_LABEL[d] + '</span>';
      zone.appendChild(card);
      if (!s6Done && s6Dnd) s6Dnd.attachSource(card, d);
    }
    const state = mark === 'correct' ? '، صحيح' : mark === 'wrong' ? '، غير صحيح' : '';
    zone.setAttribute('aria-label', S6_NAME[t] + ': ' + (d ? S6_LABEL[d] : 'فارغة') + state);
    zone.tabIndex = s6Done ? -1 : 0;
  });
  s6UpdateCheck();
}
function s6UpdateCheck() {
  const btn = document.getElementById('s6-check');
  if (s6Done) { btn.disabled = false; return; }
  const full = s6Targets().every(t => !!s6In(t));
  btn.disabled = !full || s6Snap() === s6LastWrong;
}
function s6StartEdit() { dismissRetryPopup('s6-popup', s6Done); }
function s6PlaceChip(d, t) {
  const evicted = s6In(t);
  if (evicted && evicted !== d) s6Place[evicted] = 'source';
  s6Place[d] = t;
  s6Pick = null;
  s6Render();
  s6Announce(S6_LABEL[d] + ' وُضع تحت' + S6_NAME[t]);
}
function s6InitDnd() {
  if (s6Dnd) return;
  s6Dnd = createPointerDnd({
    canDrag: () => !s6Done,
    onPick: d => { s6StartEdit(); s6Pick = null; s6Place[d] = 'source'; s6Render(); document.getElementById(d).classList.add('dragging'); },
    onDrop: (d, t) => { s6SkipClick = true; s6PlaceChip(d, t); },
    onCancel: () => { s6SkipClick = true; s6Render(); },
    onTap: (d, src) => { s6SkipClick = true; if (src.classList.contains('itd-placed')) s6ZonePress(s6Place[d]); else s6ChipPress(d); }
  });
  Object.keys(s6Place).forEach(d => s6Dnd.attachSource(document.getElementById(d), d));
  s6Targets().forEach(t => {
    const zone = document.getElementById(t);
    s6Dnd.attachTarget(zone, t);
    zone.addEventListener('click', () => { if (s6SkipClick) { s6SkipClick = false; return; } s6ZonePress(t); });
    zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s6ZonePress(t); } });
  });
  Object.keys(s6Place).forEach(d => document.getElementById(d).addEventListener('click', e => { if (e.detail === 0) s6ChipPress(d); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && currentScreen === 6 && s6Pick) { s6Pick = null; s6Render(); } });
  document.addEventListener('pointerdown', () => { s6SkipClick = false; }, true);
}
function s6ChipPress(d) {
  if (s6Done || s6Place[d] !== 'source') return;
  s6StartEdit();
  s6Pick = (s6Pick === d) ? null : d;
  s6Render();
  if (s6Pick) s6Announce('تم اختيار الخاصية: ' + S6_LABEL[d] + '. اختاروا صورة لوضع الخاصية تحتها.');
}
function s6ZonePress(t) {
  if (s6Done) return;
  if (s6Pick) { s6StartEdit(); s6PlaceChip(s6Pick, t); return; }
  const d = s6In(t);
  if (!d) return;
  s6StartEdit();
  s6Place[d] = 'source'; s6Pick = d;
  s6Render();
  s6Announce('تم اختيار الخاصية: ' + S6_LABEL[d] + '. اختاروا صورة لوضع الخاصية تحتها.');
}
function s6MarksFor(placement) {
  const m = {};
  s6Targets().forEach(t => { const d = Object.keys(placement).find(k => placement[k] === t); m[t] = S6Q.accept[t].includes(d) ? 'correct' : 'wrong'; });
  return m;
}
const s6AnyRight = placement => Object.values(s6MarksFor(placement)).some(v => v === 'correct');
function s6Primary() {
  if (s6Done) { advanceScreen(); return; }
  s6Check();
}
function s6Check() {
  if (s6Done || !s6Targets().every(t => !!s6In(t))) return;
  s6Pick = null;
  s6Attempts++;
  const marks = s6MarksFor(s6Place);
  if (Object.values(marks).every(v => v === 'correct')) {
    s6Marks = marks; s6Finish('correct');
  } else if (s6Attempts >= S6Q.maxAttempts) {
    s6Answer = Object.assign({}, s6Place);
    s6View = 'solution';
    s6Finish('wrong2');
  } else {
    s6LastWrong = s6Snap();
    s6Marks = marks;
    s6Judged = {}; s6Targets().forEach(t => { s6Judged[t] = s6In(t); });
    s6RetryPartial = s6AnyRight(s6Place);
    s6Targets().forEach(t => { if (marks[t] === 'wrong') { const d = s6In(t); if (d) s6Place[d] = 'source'; } });   // wrong cards go back to the bank (s6 retry), as in the approved יעד 14 build
    s6Render();
    s6ShowPopup('retry');
  }
}
function s6Finish(outcome) {
  s6Done = true; s6Outcome = outcome;
  setNavLabel(document.getElementById('s6-check'), 'متابعة');
  if (outcome === 'wrong2') { s6ApplyView(); return; }
  s6Render();
  s6ShowPopup(outcome);
}
function s6ApplyView() {
  if (s6Answer === null) return;
  Object.keys(s6Place).forEach(d => { s6Place[d] = 'source'; });
  if (s6View === 'answer') { Object.assign(s6Place, s6Answer); s6Marks = s6MarksFor(s6Answer); }
  else { Object.keys(S6Q.reveal).forEach(t => { s6Place[S6Q.reveal[t]] = t; }); s6Marks = s6MarksFor(s6Place); }
  s6Render();
  s6ShowPopup('wrong2', s6View);
}
function s6ToggleView() {
  if (s6Answer === null) return;
  s6View = (s6View === 'solution') ? 'answer' : 'solution';
  s6ApplyView();
}
function s6ShowPopup(type, view) {
  const partial = type === 'retry' ? s6RetryPartial : type === 'wrong2' ? s6AnyRight(s6Answer || s6Place) : false;
  const base = S6_FEEDBACK[partial ? type + 'Partial' : type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;
  showFeedback('s6-popup', type, cfg, base, s6ToggleView);
}
function s6Enter() {
  s6InitDnd();
  document.getElementById('s6-popup').classList.add('hidden');
  if (s6Done) {
    if (s6Answer !== null) { s6View = 'solution'; Object.keys(s6Place).forEach(d => { s6Place[d] = 'source'; }); Object.keys(S6Q.reveal).forEach(t => { s6Place[S6Q.reveal[t]] = t; }); s6Marks = s6MarksFor(s6Place); }
    setNavLabel(document.getElementById('s6-check'), 'متابعة');
    s6Render();
    return;
  }
  s6Pick = null;
  setNavLabel(document.getElementById('s6-check'), 'هل إجابتي صحيحة؟');
  s6Render();
}

/* ===================== S9 (index 9) — categorisation DnD, two bins (slide 14) =====================
   Ported from methodica-science-mass-liquid-02-02 S6 (bins that hold several items, in
   drop order) with text chips. Check enables when all six are in a box; one attempt
   (Noa 2026-11-03). The existing retry branch remains inactive with maxAttempts: 1:
   retry -> right chips ✓ and lock, wrong ones ✕ until moved, Retry gate; final wrong ->
   solution + View My Answer Toggle. No hint (note).
   Feedback = slide 14's boxes as authored. NOTE: the slide authors the SAME body for the
   final-wrong box, including the praise line "הצלחתם להבחין..." - kept as authored and
   flagged (Q-24), never rewritten here. */
const S9Q = {
  accept: {
    's9-b-tech': ['s9-d-dive', 's9-d-tyre', 's9-d-airbag'],
    's9-b-sci':  ['s9-d-props', 's9-d-test', 's9-d-fill']
  },
  maxAttempts: 1
};
const S9_LABEL = {
  's9-d-props': 'البحث في خصائص الغاز', 's9-d-dive': 'استخدام قابلية الغاز للانضغاط في أسطوانة الغوص',
  's9-d-fill': 'فحص الطريقة التي يملأ بها الغاز حجم الوعاء', 's9-d-tyre': 'استخدام خصائص الغاز في تطوير إطار دراجة',
  's9-d-test': 'فحص قابلية الغاز للانضغاط', 's9-d-airbag': 'استخدام خصائص الغاز في تطوير وسادة هوائية'
};
const S9_BIN_NAME = { 's9-b-tech': 'مطوِّرة تكنولوجيا', 's9-b-sci': 'عالِم' };
const S9_CORRECT_BODY = ['نجحتم في التمييز بين البحث العلمي والتطوير التكنولوجي.', '<strong>للتلخيص:</strong>', 'العلم – يُعنى باستقصاء العالم وفهم ظواهر المواد وخصائصها.', 'التكنولوجيا – تستخدم المعرفة العلمية لتطوير منتجات وحلول لاحتياجات مختلفة.'];   // the slide's mid-sentence break before "של חומרים" is technical - removed (producer 2026-10-18)
const S9_WRONG_BODY = ['من المهم التمييز بين البحث العلمي والتطوير التكنولوجي.', '<strong>للتلخيص:</strong>', 'العلم – يُعنى باستقصاء العالم وفهم ظواهر المواد وخصائصها.', 'التكنولوجيا – تستخدم المعرفة العلمية لتطوير منتجات وحلول لاحتياجات مختلفة.'];
const S9_SOLUTION_LINE = 'الإجابة الصحيحة معروضة.';
const S9_FEEDBACK = {
  retry:         { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مجددًا؟'] },
  retryPartial:  { title: 'الإجابة ليست صحيحة بالكامل.', body: ['هل نحاول مجددًا؟'] },
  correct:       { title: 'ممتاز!', body: S9_CORRECT_BODY },
  wrong2:        wrong2Config('الإجابة غير صحيحة.', S9_SOLUTION_LINE, S9_WRONG_BODY),
  wrong2Partial: wrong2Config('الإجابة صحيحة جزئيًا.', S9_SOLUTION_LINE, S9_WRONG_BODY)
};
const s9Place = {};
Object.keys(S9_LABEL).forEach(d => { s9Place[d] = 'source'; });
const s9Order = { 's9-b-tech': [], 's9-b-sci': [] };
let s9Attempts = 0, s9Done = false, s9Outcome = null, s9LastWrong = null;
let s9Marks = null, s9Judged = null, s9Answer = null, s9View = 'solution';
const s9Kept = new Set();
let s9Pick = null, s9Dnd = null, s9SkipClick = false;
const s9Bins = () => Object.keys(S9Q.accept);
const s9Chips = () => Object.keys(S9_LABEL);
const s9Snap = () => JSON.stringify(s9Place);
function s9Announce(msg) { const l = document.getElementById('s9-live'); if (l) l.textContent = msg; }
function s9MarkOf(d) {
  if (!s9Marks) return null;
  const m = s9Marks[d] || null;
  if (s9Done || !s9Judged || m !== 'wrong') return m;
  return s9Place[d] === s9Judged[d] ? m : null;
}
function s9SetPlace(d, where) {
  const from = s9Place[d];
  if (from !== 'source') { const i = s9Order[from].indexOf(d); if (i >= 0) s9Order[from].splice(i, 1); }
  s9Place[d] = where;
  if (where !== 'source' && !s9Order[where].includes(d)) s9Order[where].push(d);
}
function s9MarksFor(placement) {
  const m = {};
  s9Chips().forEach(d => { const b = placement[d]; m[d] = (b !== 'source' && S9Q.accept[b].includes(d)) ? 'correct' : 'wrong'; });
  return m;
}
const s9RetryIsPartial = () => s9Kept.size > 0;
const s9FinalIsPartial = () => !!s9Answer && Object.values(s9MarksFor(s9Answer)).some(v => v === 'correct');
function s9Render() {
  s9Chips().forEach(d => {
    const chip = document.getElementById(d), placed = s9Place[d] !== 'source';
    chip.classList.toggle('is-placed', placed);
    chip.classList.remove('dragging');
    chip.classList.toggle('is-selected', s9Pick === d);
    chip.setAttribute('aria-pressed', s9Pick === d ? 'true' : 'false');
    chip.disabled = placed || s9Done;
  });
  s9Bins().forEach(b => {
    const bin = document.getElementById(b), box = bin.querySelector('.ddc-bin__cards');
    box.innerHTML = '';
    const chips = s9Order[b].filter(d => s9Place[d] === b);
    bin.dataset.count = String(chips.length);
    bin.classList.toggle('occupied', chips.length > 0);
    chips.forEach(d => {
      const mark = s9MarkOf(d);
      const locked = s9Done || s9Kept.has(d);
      const el = document.createElement('span');
      el.className = 'ddqp-chip ddc-chip ddc-chip--placed';
      el.classList.toggle('correct', mark === 'correct');
      el.classList.toggle('wrong', mark === 'wrong');
      el.classList.toggle('locked', locked);
      if (mark) { const m = document.createElement('span'); m.className = 'ddqp-mark'; m.setAttribute('aria-hidden', 'true'); el.appendChild(m); }
      el.appendChild(document.createTextNode(S9_LABEL[d]));
      el.setAttribute('aria-label', S9_LABEL[d] + (mark === 'correct' ? '، صحيح' : mark === 'wrong' ? '، غير صحيح' : ''));
      if (!locked) { el.tabIndex = 0; el.setAttribute('role', 'button'); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s9PlacedPress(d); } }); if (s9Dnd) s9Dnd.attachSource(el, d); }
      box.appendChild(el);
    });
    bin.setAttribute('aria-label', S9_BIN_NAME[b] + ': ' + (chips.length ? chips.map(d => S9_LABEL[d]).join('، ') : 'لا توجد مهام'));
    bin.tabIndex = 0;   // keep overflow keyboard-scrollable, including the locked answer view
    bin.setAttribute('role', s9Done ? 'region' : 'button');
  });
  s9UpdateCheck();
}
function s9UpdateCheck() {
  const btn = document.getElementById('s9-check');
  if (s9Done) { btn.disabled = false; return; }
  const full = s9Chips().every(d => s9Place[d] !== 'source');
  btn.disabled = !full || s9Snap() === s9LastWrong;
}
function s9StartEdit() { dismissRetryPopup('s9-popup', s9Done); }
function s9PlaceChip(d, b) {
  s9SetPlace(d, b);
  s9Pick = null;
  s9Render();
  s9Announce(S9_LABEL[d] + ' وُضع عند ' + S9_BIN_NAME[b]);
}
function s9InitDnd() {
  if (s9Dnd) return;
  s9Dnd = createPointerDnd({
    canDrag: d => !s9Done && !s9Kept.has(d),
    onPick: d => { s9StartEdit(); s9Pick = null; s9SetPlace(d, 'source'); s9Render(); document.getElementById(d).classList.add('dragging'); },
    onDrop: (d, b) => { s9SkipClick = true; s9PlaceChip(d, b); },
    onCancel: () => { s9SkipClick = true; s9Render(); },
    onTap: (d, src) => { s9SkipClick = true; if (src.classList.contains('ddc-chip--placed')) { if (s9Pick) s9BinPress(s9Place[d]); else s9PlacedPress(d); } else s9ChipPress(d); }
  });
  s9Chips().forEach(d => s9Dnd.attachSource(document.getElementById(d), d));
  s9Bins().forEach(b => {
    const bin = document.getElementById(b);
    s9Dnd.attachTarget(bin, b);
    bin.addEventListener('click', e => { if (s9SkipClick) { s9SkipClick = false; return; } if (!s9Pick && e.target.closest('.ddc-chip--placed')) return; s9BinPress(b); });
    bin.addEventListener('keydown', e => { if (e.target !== bin) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s9BinPress(b); } });
  });
  s9Chips().forEach(d => document.getElementById(d).addEventListener('click', e => { if (e.detail === 0) s9ChipPress(d); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && currentScreen === 9 && s9Pick) { s9Pick = null; s9Render(); } });
  document.addEventListener('pointerdown', () => { s9SkipClick = false; }, true);
}
function s9ChipPress(d) {
  if (s9Done || s9Place[d] !== 'source') return;
  s9StartEdit();
  s9Pick = (s9Pick === d) ? null : d;
  s9Render();
  if (s9Pick) s9Announce('تم اختيار المهمة: ' + S9_LABEL[d] + '. اختاروا صاحب مهنة لوضعها.');
}
function s9PlacedPress(d) {
  if (s9Done || s9Kept.has(d)) return;
  s9StartEdit();
  s9SetPlace(d, 'source'); s9Pick = d;
  s9Render();
  s9Announce('تم اختيار المهمة: ' + S9_LABEL[d] + '. اختاروا صاحب مهنة لوضعها.');
}
function s9BinPress(b) {
  if (s9Done || !s9Pick) return;
  s9StartEdit();
  s9PlaceChip(s9Pick, b);
}
function s9Primary() {
  if (s9Done) { advanceScreen(); return; }
  s9Check();
}
function s9Check() {
  if (s9Done || !s9Chips().every(d => s9Place[d] !== 'source')) return;
  s9Pick = null;
  s9Attempts++;
  const marks = s9MarksFor(s9Place);
  if (Object.values(marks).every(v => v === 'correct')) {
    s9Marks = marks; s9Finish('correct');
  } else if (s9Attempts >= S9Q.maxAttempts) {
    s9Answer = Object.assign({}, s9Place);
    s9View = 'solution';
    s9Finish('wrong2');
  } else {
    s9LastWrong = s9Snap();
    s9Marks = {};
    s9Chips().forEach(d => { if (marks[d] === 'correct') { s9Marks[d] = 'correct'; s9Kept.add(d); } else s9Marks[d] = 'wrong'; });
    s9Judged = Object.assign({}, s9Place);
    s9Render();
    s9ShowPopup('retry');
  }
}
function s9Finish(outcome) {
  s9Done = true; s9Outcome = outcome;
  setNavLabel(document.getElementById('s9-check'), 'متابعة');
  if (outcome === 'wrong2') { s9ApplyView(); return; }
  s9Render();
  s9ShowPopup(outcome);
}
function s9SetBoard(placement) {
  s9Chips().forEach(d => { s9Place[d] = 'source'; });
  s9Bins().forEach(b => { s9Order[b] = []; });
  s9Chips().forEach(d => { if (placement[d] !== 'source') s9SetPlace(d, placement[d]); });
}
function s9Solution() { const p = {}; s9Bins().forEach(b => S9Q.accept[b].forEach(d => { p[d] = b; })); return p; }
function s9ApplyView() {
  if (s9Answer === null) return;
  if (s9View === 'answer') { s9SetBoard(s9Answer); s9Marks = s9MarksFor(s9Answer); }
  else { s9SetBoard(s9Solution()); s9Marks = s9MarksFor(s9Place); }
  s9Render();
  s9ShowPopup('wrong2', s9View);
}
function s9ToggleView() {
  if (s9Answer === null) return;
  s9View = (s9View === 'solution') ? 'answer' : 'solution';
  s9ApplyView();
}
function s9ShowPopup(type, view) {
  const partial = type === 'retry' ? s9RetryIsPartial() : type === 'wrong2' ? s9FinalIsPartial() : false;
  const base = S9_FEEDBACK[partial ? type + 'Partial' : type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;
  showFeedback('s9-popup', type, cfg, base, s9ToggleView);
}
function s9Enter() {
  s9InitDnd();
  document.getElementById('s9-popup').classList.add('hidden');
  if (s9Done) {
    if (s9Answer !== null) { s9View = 'solution'; s9SetBoard(s9Solution()); s9Marks = s9MarksFor(s9Place); }
    setNavLabel(document.getElementById('s9-check'), 'متابعة');
    s9Render();
    return;
  }
  s9Pick = null;
  setNavLabel(document.getElementById('s9-check'), 'هل إجابتي صحيحة؟');
  s9Render();
}

/* ===================== S10 (index 10) — table fill-in with dropdowns (slide 15) =====================
   720-templates DropdownQuestion (multi-blank) in the table's blank cells - ported from
   methodica-science-mass-liquid-02-06 S3. Three blanks, options "כן" / "לא"; correct (Q-06):
   1 solid/compressed = לא, 2 liquid/flows = כן, 3 gas/keeps volume = לא. One attempt
   (Noa, 2026-11-03). One list open at a time; a click outside or Escape closes
   it; "צדקתי?" enables when every blank has a value. Wrong answers immediately show the
   correct value (green) at once + the View My Answer Toggle. No hint (note: "ללא כפתור רמז").
   Feedback = slide 15's boxes: correct "כל הכבוד!" + its line; final wrong, when part of the
   answer is right = the authored "התשובה אינה נכונה במלואה" (verbatim, no period) + the fallback
   solution line, when nothing is right = the canonical "התשובה אינה נכונה."; retry = defaults. */
const S10Q = { correct: { 1: 'لا', 2: 'نعم', 3: 'لا' }, maxAttempts: 1 };
const S10_SLOTS = [1, 2, 3];
const S10_EXPLAIN = ['الآن يمكن أن نرى في الجدول الخصائص المشتركة والمختلفة للمادة الصلبة والمادة السائلة والمادة الغازية.'];
const S10_SOLUTION_LINE = 'الإجابة الصحيحة معروضة.';
const S10_FEEDBACK = {
  retry:         { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مجددًا؟'] },
  retryPartial:  { title: 'الإجابة ليست صحيحة بالكامل.', body: ['هل نحاول مجددًا؟'] },
  correct:       { title: 'أحسنتم!', body: S10_EXPLAIN },
  wrong2:        wrong2Config('الإجابة غير صحيحة.', S10_SOLUTION_LINE, S10_EXPLAIN),
  wrong2Partial: wrong2Config('الإجابة ليست صحيحة بالكامل', S10_SOLUTION_LINE, S10_EXPLAIN)
};
const DQ_CHECK_SVG = '<svg class="dq-verdict-ico" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6.52036 15C6.12296 15.0002 5.74183 14.8126 5.46106 14.4787L2.25845 10.6774C1.91385 10.2681 1.91385 9.60467 2.25845 9.19536C2.60317 8.78619 3.16194 8.78619 3.50666 9.19536L6.52036 12.7737L14.4933 3.30688C14.8381 2.89771 15.3968 2.89771 15.7415 3.30688C16.0862 3.71618 16.0862 4.37966 15.7415 4.78896L7.57966 14.4787C7.29889 14.8126 6.91776 15.0002 6.52036 15Z" fill="#609E12"/></svg>';
const DQ_WRONG_SVG = '<svg class="dq-verdict-ico" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M15.6743 2.32569C15.4657 2.11715 15.1828 2 14.8879 2C14.5929 2 14.31 2.11715 14.1014 2.32569L9 7.42709L3.8986 2.32569C3.69 2.11715 3.40711 2 3.11215 2C2.81718 2 2.53429 2.11715 2.32569 2.32569C2.11715 2.53429 2 2.81718 2 3.11215C2 3.40711 2.11715 3.69 2.32569 3.8986L7.42709 9L2.32569 14.1014C2.11715 14.31 2 14.5929 2 14.8879C2 15.1828 2.11715 15.4657 2.32569 15.6743C2.53429 15.8829 2.81718 16 3.11215 16C3.40711 16 3.69 15.8829 3.8986 15.6743L9 10.5729L14.1014 15.6743C14.31 15.8829 14.5929 16 14.8879 16C15.1828 16 15.4657 15.8829 15.6743 15.6743C15.8829 15.4657 16 15.1828 16 14.8879C16 14.5929 15.8829 14.31 15.6743 14.1014L10.5729 9L15.6743 3.8986C15.8829 3.69 16 3.40711 16 3.11215C16 2.81718 15.8829 2.53429 15.6743 2.32569Z" fill="#B20010"/></svg>';
const DQ_PROMPT = 'اختاروا إجابة';
const s10Sel = { 1: null, 2: null, 3: null };
let s10Attempts = 0, s10Done = false, s10Outcome = null, s10LastWrong = null;
let s10Answer = null, s10View = 'solution', s10OpenSlot = null;
const s10Kept = new Set();    // right after a non-final wrong attempt (✓, locked)
const s10Wrong = new Set();   // ✕ after it, until the learner opens or changes the blank
const s10Snap = () => JSON.stringify(s10Sel);
function s10Announce(msg) { const l = document.getElementById('s10-live'); if (l) l.textContent = msg; }
const s10Label = n => document.getElementById('s10-w' + n).textContent;
/* Value shown in a blank and its verdict - derived from the recorded state (single owner). */
function s10Shown(n) {
  if (s10Done && s10Outcome === 'wrong2') return s10View === 'answer' ? s10Answer[n].value : S10Q.correct[n];
  return s10Sel[n];
}
function s10MarkOf(n) {
  if (s10Done) {
    if (s10Outcome === 'wrong2' && s10View === 'answer') return s10Answer[n].correct ? 'correct' : 'wrong';
    return 'correct';
  }
  if (s10Kept.has(n)) return 'correct';
  return s10Wrong.has(n) ? 'wrong' : null;
}
const s10Locked = n => s10Done || s10Kept.has(n);
function s10Render() {
  S10_SLOTS.forEach(n => {
    const btn = document.getElementById('s10-btn-' + n), sel = document.getElementById('s10-sel-' + n);
    const mark = s10MarkOf(n), open = s10OpenSlot === n, val = s10Shown(n);
    btn.classList.toggle('dq-correct', mark === 'correct');
    btn.classList.toggle('dq-wrong', mark === 'wrong');
    btn.disabled = s10Locked(n);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.querySelector('.dq-verdict-ico')?.remove();
    if (mark) btn.insertAdjacentHTML('afterbegin', mark === 'correct' ? DQ_CHECK_SVG : DQ_WRONG_SVG);
    sel.textContent = val || DQ_PROMPT;
    sel.classList.toggle('is-prompt', !val);
    document.getElementById('s10-verdict-' + n).textContent = mark === 'correct' ? '، صحيح' : mark === 'wrong' ? '، غير صحيح' : '';
    document.getElementById('s10-wrap-' + n).classList.toggle('is-open', open);
    const list = document.getElementById('s10-list-' + n);
    list.classList.toggle('hidden', !open);
    list.querySelectorAll('.dq-option').forEach(o => o.setAttribute('aria-selected', o.dataset.value === val ? 'true' : 'false'));
  });
  const btn = document.getElementById('s10-check');
  btn.disabled = !s10Done && (!S10_SLOTS.every(n => s10Sel[n]) || s10Snap() === s10LastWrong);   // Retry gate
}
function s10CloseList(focusTrigger) {
  const n = s10OpenSlot;
  s10OpenSlot = null;
  s10Render();
  if (focusTrigger && n) document.getElementById('s10-btn-' + n).focus();
}
function s10Toggle(n) {
  if (s10Locked(n)) return;
  dismissRetryPopup('s10-popup', s10Done);   // opening a list is a corrective action
  s10Wrong.delete(n);
  s10OpenSlot = (s10OpenSlot === n) ? null : n;
  s10Render();
}
function s10Select(n, value) {
  if (s10Locked(n)) return;
  dismissRetryPopup('s10-popup', s10Done);
  s10Wrong.delete(n);
  s10Sel[n] = value;
  s10OpenSlot = null;
  s10Render();
  document.getElementById('s10-btn-' + n).focus();
  s10Announce(s10Label(n) + ': ' + value);
}
function s10FocusOption(n, i, exact) {
  const opts = [...document.querySelectorAll('#s10-list-' + n + ' .dq-option')];
  const o = exact ? opts[i] : opts[(i + opts.length) % opts.length];
  if (o) o.focus();
}
function s10BtnKey(e, n) {
  if (s10Locked(n)) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (s10OpenSlot !== n) { dismissRetryPopup('s10-popup', s10Done); s10Wrong.delete(n); s10OpenSlot = n; s10Render(); }
    const opts = [...document.querySelectorAll('#s10-list-' + n + ' .dq-option')];
    const cur = opts.findIndex(o => o.getAttribute('aria-selected') === 'true');
    s10FocusOption(n, cur >= 0 ? cur : 0, true);
  } else if (e.key === 'Escape' && s10OpenSlot === n) { e.preventDefault(); s10CloseList(true); }
}
function s10OptKey(e, n) {
  const opts = [...document.querySelectorAll('#s10-list-' + n + ' .dq-option')];
  const i = opts.indexOf(e.currentTarget);
  if (e.key === 'ArrowDown') { e.preventDefault(); s10FocusOption(n, i + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); s10FocusOption(n, i - 1); }
  else if (e.key === 'Home') { e.preventDefault(); s10FocusOption(n, 0, true); }
  else if (e.key === 'End') { e.preventDefault(); s10FocusOption(n, opts.length - 1, true); }
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s10Select(n, e.currentTarget.dataset.value); }
  else if (e.key === 'Escape') { e.preventDefault(); s10CloseList(true); }
  else if (e.key === 'Tab') { s10CloseList(false); }
}
/* One document-level listener: a click outside every dropdown closes the open list. */
document.addEventListener('click', (e) => {
  if (s10OpenSlot !== null && !e.target.closest('.dq-dropdown-wrap')) s10CloseList(false);
});
function s10Primary() {
  if (s10Done) { advanceScreen(); return; }
  s10Check();
}
function s10Check() {
  if (s10Done || !S10_SLOTS.every(n => s10Sel[n]) || s10Snap() === s10LastWrong) return;
  s10OpenSlot = null;
  s10Attempts++;
  const right = {};
  S10_SLOTS.forEach(n => { right[n] = s10Sel[n] === S10Q.correct[n]; });
  if (S10_SLOTS.every(n => right[n])) { s10Finish('correct'); return; }
  if (s10Attempts >= S10Q.maxAttempts) {
    s10Answer = {};
    S10_SLOTS.forEach(n => { s10Answer[n] = { value: s10Sel[n], correct: right[n] }; });   // before the reveal overwrites a wrong blank
    s10View = 'solution';
    s10Finish('wrong2');
    return;
  }
  S10_SLOTS.forEach(n => { if (right[n]) s10Kept.add(n); else s10Wrong.add(n); });
  s10LastWrong = s10Snap();
  s10Render();
  s10ShowPopup('retry');
}
function s10Finish(outcome) {
  s10Done = true; s10Outcome = outcome;
  setNavLabel(document.getElementById('s10-check'), 'متابعة');
  if (outcome === 'wrong2') { s10ApplyView(); return; }
  s10Render();
  s10ShowPopup(outcome);
}
function s10ApplyView() {
  if (s10Answer === null) return;
  s10Render();
  s10ShowPopup('wrong2', s10View);
}
function s10ToggleView() {
  if (s10Answer === null) return;
  s10View = (s10View === 'solution') ? 'answer' : 'solution';
  s10ApplyView();
}
function s10ShowPopup(type, view) {
  const partial = type === 'retry' ? s10Kept.size > 0
    : type === 'wrong2' ? S10_SLOTS.some(n => s10Answer[n].correct) : false;
  const base = S10_FEEDBACK[partial ? type + 'Partial' : type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;
  showFeedback('s10-popup', type, cfg, base, s10ToggleView);
}
function s10Enter() {
  document.getElementById('s10-popup').classList.add('hidden');
  s10OpenSlot = null;
  if (s10Done && s10Answer !== null) s10View = 'solution';   // a resolved screen returns on the solution view
  setNavLabel(document.getElementById('s10-check'), s10Done ? 'متابعة' : 'هل إجابتي صحيحة؟');
  s10Render();
}

/* ===================== S4 / S5 (slides 8, 9) — SingleChoiceQuestion + applet zone =====================
   720-templates SingleChoiceQuestion, the same flow as S12 without a hint (both notes: "ללא כפתור
   רמז"): two attempts (default); retry -> chosen option red, correct not revealed, Retry gate;
   final wrong -> correct green + chosen red. The two screens differ only in content, so they
   share one small controller. Feedback = the slides' off-canvas boxes (correct "התשובה נכונה.";
   final wrong "התשובה לא נכונה." + "התשובה הנכונה מוצגת."); retry = template default.
   Interim (producer, 2026-10-19): the applet zones are static placeholders and do NOT gate the
   answer; the gate is the resolved question only. */
function createScq(id, cfg) {
  const st = { selected: null, attempts: 0, done: false, lastWrong: null, outcome: null };
  const opts = () => document.querySelectorAll('#' + id + ' .scq-opt');
  const popupEl = () => document.getElementById(id + '-popup');
  function render() {
    opts().forEach(o => {
      const oid = o.dataset.id;
      let cls = '';
      if (st.done) {
        if (oid === cfg.correctId) cls = 'correct';
        else if (st.outcome === 'wrong2' && oid === st.selected) cls = 'wrong';
      } else if (oid === st.lastWrong && oid === st.selected) cls = 'wrong';
      else if (oid === st.selected) cls = 'selected';
      o.classList.toggle('selected', cls === 'selected');
      o.classList.toggle('correct', cls === 'correct');
      o.classList.toggle('wrong', cls === 'wrong');
      o.setAttribute('aria-checked', oid === st.selected ? 'true' : 'false');
      o.disabled = st.done;
    });
    const btn = document.getElementById(id + '-check');
    setNavLabel(btn, st.done ? cfg.continueLabel : 'هل إجابتي صحيحة؟');
    btn.disabled = !st.done && (!st.selected || st.selected === st.lastWrong);
  }
  function showPopup(type) {
    const fb = cfg.feedback[type];
    const popup = popupEl();
    popup.classList.remove('type-retry', 'type-correct', 'type-wrong2');
    popup.classList.add('type-' + type);
    popup.querySelector('.scq-popup-title').innerHTML = fb.title;
    popup.querySelector('.scq-popup-body').innerHTML = feedbackBodyHtml(fb.body);
    resetPopupPosition(popup);
    popup.classList.remove('hidden');
  }
  function finish(outcome) {
    st.done = true; st.outcome = outcome;
    render();
    showPopup(outcome);
  }
  function check() {
    if (!st.selected || st.done || st.selected === st.lastWrong) return;
    st.attempts++;
    if (st.selected === cfg.correctId) { finish('correct'); return; }
    if (st.attempts >= cfg.maxAttempts) { finish('wrong2'); return; }
    st.lastWrong = st.selected;
    render();
    showPopup('retry');
  }
  return {
    get done() { return st.done; },
    get outcome() { return st.outcome; },
    enter() { popupEl().classList.add('hidden'); render(); },
    reopen() { if (st.done) showPopup(st.outcome); },
    select(oid) {
      if (st.done) return;
      dismissRetryPopup(id + '-popup', st.done);
      st.selected = oid;
      render();
    },
    primary() { if (st.done) { advanceScreen(); return; } check(); }
  };
}
const SCQ_APPLET_RETRY = { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مجددًا؟'] };
const SCQ_APPLET_WRONG2_TITLE = 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.';
const S4_EXPLAIN = ['في جميع الأوعية أخذ الغاز شكل الوعاء وملأ كل الحجم المتاح له.', '<strong>الاستنتاج:</strong> ليس للغاز شكل ثابت ولا حجم ثابت. إنه يأخذ شكل الوعاء ويملأ حجمه بالكامل.'];
const s4 = createScq('s4', {
  correctId: 'b', maxAttempts: 2, continueLabel: 'متابعة',   // slide 8 authors no progression copy
  feedback: { retry: SCQ_APPLET_RETRY, correct: { title: 'الإجابة صحيحة.', body: S4_EXPLAIN }, wrong2: { title: SCQ_APPLET_WRONG2_TITLE, body: S4_EXPLAIN } }
});
const S5_EXPLAIN = ['انضغط كلٌّ من الغاز والماء عندما ضغطنا عليهما، لكن التغيّر في الغاز كان أكبر بكثير.', '<strong>الاستنتاج:</strong> يمكن تقليل حجم الغاز بشكل كبير، ولذلك نقول إن الغاز قابل للانضغاط.'];
const s5 = createScq('s5', {
  correctId: 'c', maxAttempts: 2, continueLabel: 'متابعة',      // Q-02; "متابعة" = slide 9's authored button copy
  feedback: { retry: SCQ_APPLET_RETRY, correct: { title: 'الإجابة صحيحة.', body: S5_EXPLAIN }, wrong2: { title: SCQ_APPLET_WRONG2_TITLE, body: S5_EXPLAIN } }
});

/* ===================== Applets (S4, S5) — shared helpers =====================
   Applet-local motion only (Web Animations); the screen-reveal engine (motion.js) is untouched.
   Reduced motion: every step is instant. The applets never gate the question (producer, 2026-10-19). */
const appletReduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
function appletAnimator() {
  const running = new Set();
  return {
    run(el, keyframes, ms, easing) {
      if (!ms || appletReduced() || !el.animate) return Promise.resolve();
      const a = el.animate(keyframes, { duration: ms, easing: easing || 'ease-out', fill: 'forwards' });
      running.add(a);
      return a.finished.then(() => { running.delete(a); return a; }, () => { running.delete(a); return null; });
    },
    cancelAll() { running.forEach(a => a.cancel()); running.clear(); }
  };
}

/* ===================== S4 applet — "גז בכלים" (slide 8) =====================
   Note: a light-purple gas cloud that can be dragged; below it a cup, a test tube and a bottle.
   Dropped on a vessel: the gas flows into it (smooth), the lid closes AFTER the gas is in
   ("חשוב!"), then the gas spreads and fills the closed vessel by its shape. Producer decisions
   (2026-10-19): vessels start open; one cloud, back at its start after each successful drop;
   a full vessel takes no more gas. Approved 2026-11-03: filling and reset only;
   full vessels stay closed until reset. The question is not gated.
   Keyboard: Enter / Space on an empty vessel fills it. */
const s4Applet = (() => {
  const V = {
    cup:    { mouth: [93.5, 38],  empty: 'كأس فارغة ومفتوحة. مفتاح Enter يملؤها بالغاز.',    full: 'كأس مملوءة بالغاز ومغلقة. يمكن إفراغها بواسطة إعادة الضبط.',    filled: 'دخل الغاز إلى الكأس، وأُغلق الغطاء، فملأ الغاز الكأس كلها.',     already: 'الكأس مملوءة بالغاز بالفعل.' },
    tube:   { mouth: [115, 34],   empty: 'أنبوب اختبار فارغ ومفتوح. مفتاح Enter يملؤه بالغاز.',  full: 'أنبوب الاختبار مملوء بالغاز ومغلق. يمكن إفراغه بواسطة إعادة الضبط.',  filled: 'دخل الغاز إلى أنبوب الاختبار، وأُغلقت السدادة، فملأ الغاز الأنبوب كله.',   already: 'أنبوب الاختبار مملوء بالغاز بالفعل.' },
    bottle: { mouth: [109, 28],   empty: 'زجاجة فارغة ومفتوحة. مفتاح Enter يملؤها بالغاز.',    full: 'زجاجة مملوءة بالغاز ومغلقة. يمكن إفراغها بواسطة إعادة الضبط.',    filled: 'دخل الغاز إلى الزجاجة، وأُغلق الغطاء، فملأ الغاز الزجاجة كلها.',    already: 'الزجاجة مملوءة بالغاز بالفعل.' }
  };
  const CLOUD_HOME = { x: 69 + 116, y: -8 + 77.5 };   // centre of the cloud at rest (zone px)
  const anim = appletAnimator();
  let inited = false, gen = 0, cloudBusy = false, drag = null;
  const zone = () => document.getElementById('s4-applet');
  const cloud = () => document.getElementById('s4-cloud');
  const vEl = n => zone().querySelector('.s4-vessel[data-vessel="' + n + '"]');
  const sOf = n => parseFloat(vEl(n).style.getPropertyValue('--s'));
  const k = () => zone().getBoundingClientRect().width / zone().offsetWidth;
  const announce = msg => { document.getElementById('s4-live').textContent = msg; };
  function local(e) { const r = zone().getBoundingClientRect(); return { x: (e.clientX - r.left) / k(), y: (e.clientY - r.top) / k() }; }
  function mouth(n) { const v = vEl(n), s = sOf(n); return { x: v.offsetLeft + V[n].mouth[0] * s, y: v.offsetTop + V[n].mouth[1] * s }; }
  function vesselAt(p) {
    const z = zone().getBoundingClientRect();
    return Object.keys(V).find(n => {
      const r = vEl(n).querySelector('.s4-vessel-hit').getBoundingClientRect();
      const l = (r.left - z.left) / k(), t = (r.top - z.top) / k(), rr = (r.right - z.left) / k(), b = (r.bottom - z.top) / k();
      return p.x >= l - 8 && p.x <= rr + 8 && p.y >= t - 24 && p.y <= b;
    }) || null;
  }
  function setState(n, st) {
    const v = vEl(n);
    v.dataset.state = st;
    const hit = v.querySelector('.s4-vessel-hit');
    hit.setAttribute('aria-label', st === 'full' ? V[n].full : st === 'busy' ? 'يمتلئ الوعاء بالغاز.' : V[n].empty);
    hit.setAttribute('aria-disabled', String(st !== 'empty'));
    syncReset();
  }
  // "איפוס" is enabled only while there is something to reset (Noa 2026-11-03).
  function syncReset() {
    document.getElementById('s4-reset').disabled = !cloudBusy && Object.keys(V).every(n => vEl(n).dataset.state === 'empty');
  }
  /* Finite drag hint: two cloud-to-vessel demonstrations, cancelled immediately on
     interaction or screen exit. No lid hint: full vessels only empty through reset. */
  const GH_DELAY = 1200, GH_FADE = 300, GH_MOVE = 1200;
  let dragUnderstood = false;
  let dragToken = 0, dragTimers = [];
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ghPlace = (el, p) => { el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; };
  const dragWait = (ms, t) => new Promise(res => { dragTimers.push(setTimeout(() => res(t === dragToken), ms)); });
  function dragStop() {
    dragToken++;
    dragTimers.forEach(clearTimeout); dragTimers = [];
    const el = document.getElementById('s4-gh-drag');
    el.classList.remove('is-shown', 'is-moving');
    el.classList.add('hidden');
  }
  async function dragStart() {
    dragStop();
    if (dragUnderstood || reduced()) return;
    const t = dragToken, el = document.getElementById('s4-gh-drag');
    if (!await dragWait(GH_DELAY, t)) return;
    for (let i = 0; i < 2; i++) {
      el.classList.remove('is-moving');            // placed at the cloud while invisible
      ghPlace(el, CLOUD_HOME);
      el.classList.remove('hidden');
      void el.offsetWidth;
      el.classList.add('is-shown');
      if (!await dragWait(GH_FADE + 200, t)) return;
      el.classList.add('is-moving');
      ghPlace(el, mouth('tube'));
      if (!await dragWait(GH_MOVE + 300, t)) return;
      el.classList.remove('is-shown');             // fade out in place; the return happens unseen
      if (!await dragWait(GH_FADE + 100, t)) return;
    }
    el.classList.remove('is-moving');
    el.classList.add('hidden');
  }
  function clearOver() { zone().querySelectorAll('.s4-vessel.is-over').forEach(v => v.classList.remove('is-over')); }
  function cloudHome(fromTransform) {
    const c = cloud();
    if (!fromTransform) { c.style.transform = ''; return Promise.resolve(); }
    return anim.run(c, [{ transform: fromTransform }, { transform: 'none' }], 250).then(() => { c.style.transform = ''; c.getAnimations().forEach(a => a.cancel()); });
  }
  async function fill(n, fromTransform) {
    const g = gen, v = vEl(n), s = sOf(n), m = mouth(n);
    const body = v.querySelector('.s4-gas-body'), spread = v.querySelector('.s4-spread'), lid = v.querySelector('.s4-lid'), c = cloud();
    cloudBusy = true;
    setState(n, 'busy');
    const to = 'translate(' + (m.x - CLOUD_HOME.x) + 'px, ' + (m.y - CLOUD_HOME.y) + 'px) scale(.2)';
    // 1. flow: the cloud pours into the mouth while a small amount of gas appears inside
    await Promise.all([
      anim.run(c, [{ transform: fromTransform || 'none', opacity: 1 }, { transform: to, opacity: 0 }], 550, 'ease-in'),
      anim.run(body, [{ opacity: 0 }, { opacity: 0, offset: .4 }, { opacity: .9 }], 550),
      anim.run(spread, [{ transform: 'scale(.04)' }, { transform: 'scale(.04)', offset: .4 }, { transform: 'scale(.14)' }], 550)
    ]);
    if (g !== gen) return;
    // 2. the lid closes after the gas is in
    await anim.run(lid, [{ opacity: 0, transform: 'translateY(' + (-24 * s) + 'px)' }, { opacity: 1, transform: 'none' }], 320, 'ease-in');
    if (g !== gen) return;
    // 3. the gas spreads from the mouth and fills the closed vessel by its shape
    await Promise.all([
      anim.run(body, [{ opacity: .9 }, { opacity: 1 }], 900),
      anim.run(spread, [{ transform: 'scale(.14)' }, { transform: 'scale(1)' }], 900, 'ease-in-out')
    ]);
    if (g !== gen) return;
    setState(n, 'full');
    [body, spread, lid].forEach(el => el.getAnimations().forEach(a => a.cancel()));
    c.style.transform = ''; c.getAnimations().forEach(a => a.cancel());
    announce(V[n].filled);
    await anim.run(c, [{ opacity: 0 }, { opacity: 1 }], 300);
    if (g !== gen) return;
    c.getAnimations().forEach(a => a.cancel());
    cloudBusy = false;
    syncReset();
  }
  function reset() {
    gen++;
    anim.cancelAll();
    zone().querySelectorAll('.s4-gas-body, .s4-lid, .s4-spread').forEach(el => el.getAnimations().forEach(a => a.cancel()));
    cloud().getAnimations().forEach(a => a.cancel());
    zone().querySelectorAll('.s4-spread').forEach(el => el.getAnimations().forEach(a => a.cancel()));
    Object.keys(V).forEach(n => {
      const v = vEl(n), body = v.querySelector('.s4-gas-body'), lid = v.querySelector('.s4-lid');
      body.style.opacity = ''; lid.style.opacity = ''; lid.style.transform = '';
      setState(n, 'empty');
    });
    clearOver();
    const c = cloud(); c.style.transform = ''; c.classList.remove('is-dragging');
    drag = null; cloudBusy = false;
    const btn = document.getElementById('s4-reset'), hadFocus = document.activeElement === btn;
    syncReset();
    if (hadFocus) vEl('cup').querySelector('.s4-vessel-hit').focus();   // the disabled button drops focus
    announce('تمت إعادة الضبط التطبيق: جميع الأوعية فارغة ومفتوحة.');
  }
  function onDown(e) {
    if (cloudBusy || drag) return;
    e.preventDefault();
    dragUnderstood = true; dragStop();
    const c = cloud();
    c.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, start: local(e), over: null };
    c.classList.add('is-dragging');
  }
  function offset(e) { const p = local(e); return { x: p.x - drag.start.x, y: p.y - drag.start.y }; }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = offset(e);
    cloud().style.transform = 'translate(' + d.x + 'px, ' + d.y + 'px)';
    const over = vesselAt({ x: CLOUD_HOME.x + d.x, y: CLOUD_HOME.y + d.y });
    clearOver();
    if (over && vEl(over).dataset.state === 'empty') vEl(over).classList.add('is-over');
    drag.over = over;
  }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = offset(e), over = vesselAt({ x: CLOUD_HOME.x + d.x, y: CLOUD_HOME.y + d.y });
    const from = 'translate(' + d.x + 'px, ' + d.y + 'px)';
    drag = null;
    cloud().classList.remove('is-dragging');
    clearOver();
    if (over && vEl(over).dataset.state === 'empty') { fill(over, from); return; }
    if (over) announce(V[over].already);
    cloudHome(from);
  }
  function onVessel(n, e) {
    const st = vEl(n).dataset.state;
    if (st === 'full') { announce(V[n].already); return; }
    if (st === 'empty' && e.detail === 0 && !cloudBusy) { dragUnderstood = true; dragStop(); fill(n, null); }   // keyboard activation
  }
  return {
    init() {
      if (inited) return;
      inited = true;
      const c = cloud();
      c.addEventListener('pointerdown', onDown);
      c.addEventListener('pointermove', onMove);
      c.addEventListener('pointerup', onUp);
      c.addEventListener('pointercancel', () => {
        drag = null; c.classList.remove('is-dragging'); c.style.transform = ''; clearOver();
      });
      Object.keys(V).forEach(n => {
        setState(n, 'empty');
        vEl(n).querySelector('.s4-vessel-hit').addEventListener('click', e => onVessel(n, e));
      });
      document.getElementById('s4-reset').addEventListener('click', reset);
    },
    state() { const o = {}; Object.keys(V).forEach(n => { o[n] = vEl(n).dataset.state; }); return o; },
    ghEnter() { dragStart(); },
    ghStop() { dragStop(); }
  };
})();

/* ===================== S5 applet — "דחיסת גז" (slide 9) =====================
   Note: two identical graduated vessels, both at 70 mL (gas / liquid); above each a piston with a
   black handle that slides down; the handles blink gently until the learner moves them. Gas: the
   piston goes down a lot and the cloud looks denser; liquid: it goes down very little, visibly.
   Producer decisions (2026-10-19): SVG pistons over the original picture, continuous drag, live
   mL reading, the piston stays where it is released and can be pulled back up, each handle stops
   blinking on its own first move, the question is not gated.
   VALUES (Noa 2026-10-19): gas 70 -> 40 approved; liquid 70 -> 68 (Q-43), inside the script's
   "68–69" range - 69 moved the piston only ~1.7 screen px. Physical scale unchanged. */
const S5_VALUES = { start: 70, gas: 40, liquid: 68 };
const S5_PX_PER_ML = 2.13333;   // picture pixels per mL (10 mL = 21.33 px)
const s5Applet = (() => {
  const st = { gas: { t: 0 }, liquid: { t: 0 } };
  const LABEL = { gas: 'حجم الغاز', liquid: 'حجم السائل' };
  let inited = false, drag = null;
  const vEl = kind => document.querySelector('#s5-applet .s5-vessel--' + kind);
  const maxT = kind => (S5_VALUES.start - S5_VALUES[kind]) * S5_PX_PER_ML;
  function render(kind) {
    const v = vEl(kind), t = st[kind].t;
    v.querySelector('.s5-piston').setAttribute('transform', 'translate(0 ' + t + ')');
    const fill = v.querySelector('.s5-fill'), top = +fill.dataset.top;
    fill.setAttribute('y', top + t); fill.setAttribute('height', 289 - top - t);
    const dense = v.querySelector('.s5-dense');
    if (dense) { dense.setAttribute('y', top + t); dense.setAttribute('height', 289 - top - t); dense.style.opacity = (.3 * t / maxT(kind)).toFixed(3); }
    const ml = Math.round(S5_VALUES.start - t / S5_PX_PER_ML);
    const h = v.querySelector('.s5-handle');
    h.setAttribute('aria-valuenow', ml);
    h.setAttribute('aria-valuetext', LABEL[kind] + ': ' + ml + ' مل');
    document.getElementById('s5-read-' + kind).textContent = ml + ' مل';
  }
  function setT(kind, t) {
    st[kind].t = Math.max(0, Math.min(maxT(kind), t));
    vEl(kind).querySelector('.s5-handle').classList.remove('is-hint');
    render(kind);
  }
  const pxPerScreen = kind => 328 / vEl(kind).querySelector('.s5-svg').getBoundingClientRect().height;
  function onDown(kind, e) {
    if (drag) return;
    e.preventDefault();
    const svg = vEl(kind).querySelector('.s5-svg');
    svg.setPointerCapture(e.pointerId);
    drag = { kind, id: e.pointerId, y0: e.clientY, t0: st[kind].t, svg };
    vEl(kind).querySelector('.s5-handle').classList.add('is-dragging');
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    setT(drag.kind, drag.t0 + (e.clientY - drag.y0) * pxPerScreen(drag.kind));
  }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    vEl(drag.kind).querySelector('.s5-handle').classList.remove('is-dragging');
    drag = null;   // the piston stays where it is released
  }
  function onKey(kind, e) {
    const step = S5_PX_PER_ML, t = st[kind].t;
    const next = { ArrowDown: t + step, ArrowUp: t - step, PageDown: t + 5 * step, PageUp: t - 5 * step, Home: 0, End: maxT(kind) }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setT(kind, Math.round(next / step) * step);
  }
  return {
    init() {
      if (inited) return;
      inited = true;
      ['gas', 'liquid'].forEach(kind => {
        const v = vEl(kind), h = v.querySelector('.s5-handle'), svg = v.querySelector('.s5-svg');
        const fill = v.querySelector('.s5-fill');
        fill.dataset.top = fill.getAttribute('y');
        h.classList.add('is-hint');
        h.addEventListener('pointerdown', e => onDown(kind, e));
        svg.addEventListener('pointermove', onMove);
        svg.addEventListener('pointerup', onUp);
        svg.addEventListener('pointercancel', onUp);
        h.addEventListener('keydown', e => onKey(kind, e));
        render(kind);
      });
    },
    state() { return { gas: Math.round(S5_VALUES.start - st.gas.t / S5_PX_PER_ML), liquid: +(S5_VALUES.start - st.liquid.t / S5_PX_PER_ML).toFixed(2) }; }
  };
})();

/* ===================== S12 (index 12) — SingleChoiceQuestionImage (slide 17, warm-up 1/2) =====================
   720-templates SingleChoiceQuestion. Correct = option a. Two attempts (default): retry ->
   chosen option red + ✗, correct not revealed, Retry gate; final wrong -> correct green +
   chosen red. Hint = slide 17's box, "רמז אחרי טעות ראשונה" (note): hidden (visibility)
   until the first wrong attempt, reusable until the question resolves.
   Feedback = slide 17's boxes: correct "נכון מאוד!" + explanation; final wrong = the
   authored "טעית, וזה בסדר גמור, כך בדיוק לומדים." + the fallback solution line (none
   authored) + the shared explanation; retry = template default. */
const S12Q = { correctId: 'a', maxAttempts: 2 };
let s12Selected = null, s12Attempts = 0, s12Done = false, s12LastWrong = null, s12Outcome = null;
const S12_EXPLAIN = ['قابلية الانضغاط هي الخاصية التي تميّز الغاز.', 'يمكن تقليل حجمه عندما نضغط عليه، في حين أن المواد الصلبة والسوائل لا تكاد تنضغط.'];
const S12_FEEDBACK = {
  retry:   { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مجددًا؟'] },
  correct: { title: 'صحيح جدًا!', body: S12_EXPLAIN },
  wrong2:  { title: 'أخطأتم، وهذا طبيعي تمامًا، فهكذا بالضبط نتعلّم.<br>الإجابة الصحيحة معروضة.', body: S12_EXPLAIN }
};
const s12Opts = () => document.querySelectorAll('#s12 .scq-opt');
function s12Enter() {
  document.getElementById('s12-popup').classList.add('hidden');
  syncWarmupProgressNav(document.getElementById('s12'));
  s12Render();
}
function s12Render() {
  s12Opts().forEach(o => {
    const id = o.dataset.id;
    let cls = '';
    if (s12Done) {
      if (id === S12Q.correctId) cls = 'correct';
      else if (s12Outcome === 'wrong2' && id === s12Selected) cls = 'wrong';
    } else if (id === s12LastWrong && id === s12Selected) cls = 'wrong';
    else if (id === s12Selected) cls = 'selected';
    o.classList.toggle('selected', cls === 'selected');
    o.classList.toggle('correct', cls === 'correct');
    o.classList.toggle('wrong', cls === 'wrong');
    o.setAttribute('aria-checked', id === s12Selected ? 'true' : 'false');
    o.disabled = s12Done;
  });
  const btn = document.getElementById('s12-check');
  setNavLabel(btn, s12Done ? 'متابعة' : 'هل إجابتي صحيحة؟');
  btn.disabled = !s12Done && (!s12Selected || s12Selected === s12LastWrong);
  const h = document.getElementById('s12-hint');
  h.hidden = s12Done;
  h.style.visibility = (!s12Done && s12Attempts > 0) ? 'visible' : 'hidden';
}
function s12Select(id) {
  if (s12Done) return;
  dismissRetryPopup('s12-popup', s12Done);
  s12Selected = id;
  s12Render();
}
function s12Primary() {
  if (s12Done) { advanceScreen(); return; }
  s12Check();
}
function s12Check() {
  if (!s12Selected || s12Done || s12Selected === s12LastWrong) return;
  s12Attempts++;
  if (s12Selected === S12Q.correctId) { s12Finish('correct'); return; }
  if (s12Attempts >= S12Q.maxAttempts) { s12Finish('wrong2'); return; }
  s12LastWrong = s12Selected;
  s12Render();
  s12ShowPopup('retry');
}
function s12Finish(outcome) {
  s12Done = true; s12Outcome = outcome;
  closeHintOverlay(document.getElementById('s12-hint-overlay'));
  s12Render();
  syncWarmupProgressNav(document.getElementById('s12'));
  s12ShowPopup(outcome);
}
function s12ShowPopup(type) {
  const cfg = S12_FEEDBACK[type];
  const popup = document.getElementById('s12-popup');
  popup.classList.remove('type-retry', 'type-correct', 'type-wrong2');
  popup.classList.add('type-' + type);
  popup.querySelector('.scq-popup-title').innerHTML = cfg.title;
  popup.querySelector('.scq-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  resetPopupPosition(popup);
  popup.classList.remove('hidden');
}
function s12OpenHint() { if (!s12Done && s12Attempts > 0) openHintOverlay('s12-hint-overlay', document.getElementById('s12-hint')); }
function s12CloseHint() { closeHintOverlay(document.getElementById('s12-hint-overlay')); }
function s12CloseHintOnBackdrop(e) { if (!e.target.closest('.hint-card')) s12CloseHint(); }

/* ===================== S13 (index 13) — sentence blank + word bank (slide 18, warm-up 2/2) =====================
   Paragraph-blanks local variant (methodica-science-mass-liquid-02-02 S1) with one blank.
   Two attempts (default; the note authors none): retry -> ✕ on the blank until its word
   changes, Retry gate; final wrong -> the solution + View My Answer Toggle (DnD default).
   No hint (note: "ללא רמז"). Feedback = slide 18's boxes; final wrong = the authored
   "טעית, זו הזדמנות לעצור ולחדד את הרעיון." + the fallback solution line. */
const S13Q = { accept: { 's13-t1': ['s13-d-fill'] }, reveal: { 's13-t1': 's13-d-fill' }, maxAttempts: 2 };
const S13_LABEL = { 's13-d-block': 'يسدّ', 's13-d-fill': 'يملأ', 's13-d-empty': 'يُفرِغ', 's13-d-shrink': 'يقلّل' };
const S13_EXPLAIN = ['يتمدد الغاز حتى يملأ كامل حجم الوعاء الذي يوجد فيه، ولذلك يأخذ شكل الوعاء.'];
const S13_FEEDBACK = {
  retry:   { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مجددًا؟'] },
  correct: { title: 'رائع!', body: S13_EXPLAIN },
  wrong2:  wrong2Config('أخطأتم، وهذه فرصة للتوقف وتوضيح الفكرة.', 'الإجابة الصحيحة معروضة.', S13_EXPLAIN)
};
const s13Place = {};
Object.keys(S13_LABEL).forEach(d => { s13Place[d] = 'source'; });
let s13Attempts = 0, s13Done = false, s13Outcome = null, s13LastWrong = null;
let s13Marks = null, s13Judged = null, s13Answer = null, s13View = 'solution';
let s13Pick = null, s13Dnd = null, s13SkipClick = false;
const s13Targets = () => Object.keys(S13Q.accept);
const s13In = t => Object.keys(s13Place).find(d => s13Place[d] === t) || null;
const s13Snap = () => JSON.stringify(s13Place);
function s13Announce(msg) { const l = document.getElementById('s13-live'); if (l) l.textContent = msg; }
function s13MarkOf(t) {
  if (!s13Marks) return null;
  const m = s13Marks[t] || null;
  if (s13Done || !s13Judged || m !== 'wrong') return m;
  return s13In(t) === s13Judged[t] ? m : null;
}
function s13Render() {
  Object.keys(s13Place).forEach(d => {
    const chip = document.getElementById(d), placed = s13Place[d] !== 'source';
    chip.classList.toggle('is-placed', placed);
    chip.classList.remove('dragging');
    chip.classList.toggle('is-selected', s13Pick === d);
    chip.setAttribute('aria-pressed', s13Pick === d ? 'true' : 'false');
    chip.disabled = placed || s13Done;
  });
  s13Targets().forEach(t => {
    const zone = document.getElementById(t), d = s13In(t), mark = s13MarkOf(t);
    zone.innerHTML = '';
    zone.classList.toggle('occupied', !!d && !mark);
    zone.classList.toggle('correct', mark === 'correct');
    zone.classList.toggle('wrong', mark === 'wrong');
    zone.classList.toggle('locked', s13Done);
    if (mark) { const m = document.createElement('span'); m.className = 'ddqp-mark'; m.setAttribute('aria-hidden', 'true'); zone.appendChild(m); }
    if (d) {
      const card = document.createElement('span');
      card.className = 'ddqp-placed';
      card.textContent = S13_LABEL[d];
      zone.appendChild(card);
      if (!s13Done && s13Dnd) s13Dnd.attachSource(card, d);
    }
    const verdict = mark === 'correct' ? '، صحيح' : mark === 'wrong' ? '، غير صحيح' : '';
    zone.setAttribute('aria-label', 'مكان فارغ: ' + (d ? S13_LABEL[d] : 'لا توجد كلمة') + verdict);
    zone.tabIndex = s13Done ? -1 : 0;
    if (s13Done) zone.removeAttribute('role'); else zone.setAttribute('role', 'button');
  });
  const btn = document.getElementById('s13-check');
  if (s13Done) btn.disabled = false;
  else btn.disabled = !s13Targets().every(t => !!s13In(t)) || s13Snap() === s13LastWrong;
}
function s13StartEdit() { dismissRetryPopup('s13-popup', s13Done); }
function s13PlaceChip(d, t) {
  const evicted = s13In(t);
  if (evicted && evicted !== d) s13Place[evicted] = 'source';
  s13Place[d] = t;
  s13Pick = null;
  s13Render();
  s13Announce('تم وضع الكلمة: ' + S13_LABEL[d] + ' في المكان الفارغ');
}
function s13InitDnd() {
  if (s13Dnd) return;
  s13Dnd = createPointerDnd({
    canDrag: () => !s13Done,
    onPick: d => { s13StartEdit(); s13Pick = null; s13Place[d] = 'source'; s13Render(); document.getElementById(d).classList.add('dragging'); },
    onDrop: (d, t) => { s13SkipClick = true; s13PlaceChip(d, t); },
    onCancel: () => { s13SkipClick = true; s13Render(); },
    onTap: (d, src) => { s13SkipClick = true; if (src.classList.contains('ddqp-placed')) s13ZonePress(s13Place[d]); else s13ChipPress(d); }
  });
  Object.keys(s13Place).forEach(d => s13Dnd.attachSource(document.getElementById(d), d));
  s13Targets().forEach(t => {
    const zone = document.getElementById(t);
    s13Dnd.attachTarget(zone, t);
    zone.addEventListener('click', () => { if (s13SkipClick) { s13SkipClick = false; return; } s13ZonePress(t); });
    zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s13ZonePress(t); } });
  });
  Object.keys(s13Place).forEach(d => document.getElementById(d).addEventListener('click', e => { if (e.detail === 0) s13ChipPress(d); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && currentScreen === 13 && s13Pick) { s13Pick = null; s13Render(); } });
  document.addEventListener('pointerdown', () => { s13SkipClick = false; }, true);
}
function s13ChipPress(d) {
  if (s13Done || s13Place[d] !== 'source') return;
  s13StartEdit();
  s13Pick = (s13Pick === d) ? null : d;
  s13Render();
  if (s13Pick) s13Announce('تم اختيار الكلمة: ' + S13_LABEL[d] + '. اختاروا المكان الفارغ لوضعها.');
}
function s13ZonePress(t) {
  if (s13Done) return;
  if (s13Pick) { s13StartEdit(); s13PlaceChip(s13Pick, t); return; }
  const d = s13In(t);
  if (!d) return;
  s13StartEdit();
  s13Place[d] = 'source'; s13Pick = d;
  s13Render();
  s13Announce('تم اختيار الكلمة: ' + S13_LABEL[d] + '. اختاروا المكان الفارغ لوضعها.');
}
function s13MarksFor(placement) {
  const m = {};
  s13Targets().forEach(t => { const d = Object.keys(placement).find(k => placement[k] === t); m[t] = S13Q.accept[t].includes(d) ? 'correct' : 'wrong'; });
  return m;
}
function s13Primary() {
  if (s13Done) { advanceScreen(); return; }
  s13Check();
}
function s13Check() {
  if (s13Done || !s13Targets().every(t => !!s13In(t))) return;
  s13Pick = null;
  s13Attempts++;
  const marks = s13MarksFor(s13Place);
  if (Object.values(marks).every(v => v === 'correct')) {
    s13Marks = marks; s13Finish('correct');
  } else if (s13Attempts >= S13Q.maxAttempts) {
    s13Answer = Object.assign({}, s13Place);
    s13View = 'solution';
    s13Finish('wrong2');
  } else {
    s13LastWrong = s13Snap();
    s13Marks = marks;
    s13Judged = {}; s13Targets().forEach(t => { s13Judged[t] = s13In(t); });
    s13Targets().forEach(t => { if (marks[t] === 'wrong') { const d = s13In(t); if (d) s13Place[d] = 'source'; } });   // wrong cards go back to the bank (s13 retry), as in the approved יעד 14 build
    s13Render();
    s13ShowPopup('retry');
  }
}
function s13Finish(outcome) {
  s13Done = true; s13Outcome = outcome;
  setNavLabel(document.getElementById('s13-check'), 'متابعة');
  syncWarmupProgressNav(document.getElementById('s13'));
  if (outcome === 'wrong2') { s13ApplyView(); return; }
  s13Render();
  s13ShowPopup(outcome);
}
function s13ApplyView() {
  if (s13Answer === null) return;
  Object.keys(s13Place).forEach(d => { s13Place[d] = 'source'; });
  if (s13View === 'answer') { Object.assign(s13Place, s13Answer); s13Marks = s13MarksFor(s13Answer); }
  else { Object.keys(S13Q.reveal).forEach(t => { s13Place[S13Q.reveal[t]] = t; }); s13Marks = s13MarksFor(s13Place); }
  s13Render();
  s13ShowPopup('wrong2', s13View);
}
function s13ToggleView() {
  if (s13Answer === null) return;
  s13View = (s13View === 'solution') ? 'answer' : 'solution';
  s13ApplyView();
}
function s13ShowPopup(type, view) {
  const base = S13_FEEDBACK[type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;
  showFeedback('s13-popup', type, cfg, base, s13ToggleView);
}
function s13Enter() {
  s13InitDnd();
  document.getElementById('s13-popup').classList.add('hidden');
  syncWarmupProgressNav(document.getElementById('s13'));
  if (s13Done) {
    if (s13Answer !== null) { s13View = 'solution'; Object.keys(s13Place).forEach(d => { s13Place[d] = 'source'; }); Object.keys(S13Q.reveal).forEach(t => { s13Place[S13Q.reveal[t]] = t; }); s13Marks = s13MarksFor(s13Place); }
    setNavLabel(document.getElementById('s13-check'), 'متابعة');
    s13Render();
    return;
  }
  s13Pick = null;
  setNavLabel(document.getElementById('s13-check'), 'هل إجابتي صحيحة؟');
  s13Render();
}

/* ===================== Boot ===================== */
window.addEventListener('DOMContentLoaded', () => {
  scaleApp();
  initNavLabels();
  resetScreenState(0);
  Motion.reveal(document.querySelector('.screen.active'));   // animation-system initial-load hook
  if (window.location.hash === '#last') queueMicrotask(() => goTo(TOTAL_SCREENS - 1));
});
scaleApp();

/* ─── Dev mode: postMessage bridge (local development hosts only) ─── */
if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || (location.protocol === 'file:' && window.parent !== window)) {   // file:// only inside the index_dev.html frame
  window.addEventListener('message', (e) => {
    if ((e.origin !== location.origin && !(location.protocol === 'file:' && e.origin === 'null')) || !e.data) return; if (e.data.type === 'DEV_PING') { window.parent.postMessage({ type: 'DEV_READY', total: TOTAL_SCREENS }, location.protocol === 'file:' ? '*' : location.origin); return; } if (e.data.type !== 'DEV_GOTO') return;   // file:// frames post with origin 'null'
    const n = parseInt(e.data.screen, 10);
    if (!isNaN(n)) goTo(n);
  });
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'DEV_READY', total: TOTAL_SCREENS }, location.protocol === 'file:' ? '*' : location.origin);
  }
}
