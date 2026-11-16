/* methodica-gas-uses-01-02 — js/main.js
   Engine + per-screen logic. Part 02 = component 02 of the script (slides 20-25):
   תרגול סטנדרטי א' — 4 questions, the 720 journey's first score gate.
   Engine (canvas, goTo / advanceScreen gates, feedback popup, pointer drag-and-drop, image
   zoom, hint, Progress question, cross-part route stack, dev bridge) is copied from
   methodica-gas-uses-01-01/js/main.js, which ported it from methodica-science-mass-liquid-02-02;
   the copied blocks are marked. Slide 19 (component divider) is structure only, not a
   screen (as slide 2 in part 01 - Q-01).
   Screens: S0 (slide 20) TransitionScreen A · S1 (21) SCQ image options · S2 (22) image-only
   drag-and-drop · S3 (23) SCQ image · S4 (24) SCQ image, Q4 part א · S5 (25) SCQ image, Q4 part ב. */
'use strict';

const TOTAL_SCREENS = 6;   // slides 20-25 (docs/component-02.md)
let currentScreen = 0;

/* ===================== Unit / journey constants =====================
   720-templates _learning-journey.md, slot 2 (תרגול סטנדרטי א'): N = 4 questions; the
   two-part question 4 (slides 24-25) counts once and is correct only if both parts are.
   Pass rule ceil(2N/3) = 3 = the threshold slide 20 states ("צריך לענות נכון על 3 שאלות
   לפחות"). Pass -> the next main-path role = משימת כיתה (part 04, slides 35-37); fail ->
   תרגול בסיסי (part 03, slides 26-34). Reporting / Resume are added after QA by the 720 layer;
   this part keeps per-screen results (SCREEN_RESULT) and the bundle score (bundleScore())
   that such a layer can read. */
const LOMDA_ID = 'methodica-gas-uses-01';
const PART_ID = 'methodica-gas-uses-01-02';
const ROUTE = { pass: 'methodica-gas-uses-01-04', fail: 'methodica-gas-uses-01-03' };
/* Parts 03 and 04 exist (integration session, Noa approved 2026-10-20, I-1): both edges of the
   gate are live together - the gate is one decision. Set a flag to false to keep the last
   screen's Continue inert for a destination that does not exist (part 01 NEXT_PART_AVAILABLE). */
const PART_AVAILABLE = { 'methodica-gas-uses-01-03': true, 'methodica-gas-uses-01-04': true };

/* ===================== Companion character (state contract only) — as part 01 ===================== */
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

/* ===================== Cross-part Back (session-scoped route stack) — as part 01 =====================
   Same key and shape as part 01: every forward hop pushes the part being left; the first
   screen's Back pops it and lands on that part's last screen (#last). Opened directly in a
   fresh session, the stack is empty and S0's Back stays hidden. */
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
/* Decision point "end of standard A". _global-components "Back navigation in a branched
   journey": re-crossing a boundary already crossed replays the recorded destination instead
   of re-evaluating the gate (this part's screen state is not kept across parts). The record
   is session-scoped like the route stack and is written only when the crossing happens. */
const ROUTE_KEY = LOMDA_ID + '_route_' + PART_ID;
function recordedRoute() {
  let r = null;
  try { r = sessionStorage.getItem(ROUTE_KEY); } catch (err) {}
  return (r === ROUTE.pass || r === ROUTE.fail) ? r : null;
}
function goToNextPart() {
  if (leavingPart) return;
  const dest = recordedRoute() || (bundlePassed() ? ROUTE.pass : ROUTE.fail);
  if (!PART_AVAILABLE[dest]) return;
  leavingPart = true;
  try { sessionStorage.setItem(ROUTE_KEY, dest); } catch (err) {}
  const stack = navStackRead();
  stack.push(PART_ID);
  navStackWrite(stack);
  window.location.href = '../' + dest + '/index.html';
}
function syncS0Back() {
  const btn = document.getElementById('s0-back');
  if (btn) btn.hidden = !hasPrevPart();
}

/* ===================== Canvas scaling — as part 01 ===================== */
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
  if (prev) { Motion.cancel(prev); prev.querySelectorAll('video').forEach(v => v.pause()); }
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

/* Per-screen "may we advance" gates — the resolved state, never correctness
   (_global-components "Advance gates"). The score gate is applied only when leaving the
   part (goToNextPart), so the Continue button and the ← key agree everywhere. */
const SCREEN_GATES = {
  1: () => s1q.st.done,
  2: () => s2Done,
  3: () => s3q.st.done,
  4: () => s4q.st.done,
  5: () => s5q.st.done
};
function advanceScreen() {
  const gate = SCREEN_GATES[currentScreen];
  if (gate && !gate()) return;
  if (currentScreen === TOTAL_SCREENS - 1) { goToNextPart(); return; }   // end of the part = decision point
  goTo(currentScreen + 1);
}

/* Back onto a resolved question reopens its feedback (final-wrong DnD: on the solution view). */
function reopenFeedbackIfResolved(n) {
  if (n === 2 && s2Done) { if (s2Outcome === 'wrong2') s2ApplyView(); else s2ShowPopup(s2Outcome); }
  const q = SCQ_BY_SCREEN[n];
  if (q && q.st.done) q.showPopup(q.st.outcome);
}

/* Arrow keys navigate — but never while the learner is typing. */
document.addEventListener('keydown', (e) => {
  const t = e.target;
  if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.isContentEditable || (t.closest && t.closest('.report-modal-overlay')))) return;
  if (e.key === 'ArrowLeft') advanceScreen();
  if (e.key === 'ArrowRight') goBack();
});

/* S0 companion clip (running): decorative muted one-shot from the start on every entry (goTo pauses
   it on leave). Reduced motion: stays on the first frame, static. As part 01 S11 (Noa 2026-10-25). */
function s0Enter() {
  const v = document.getElementById('s0-video');
  if (!v) return;
  v.pause();
  v.currentTime = 0;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const p = v.play();
  if (p && p.catch) p.catch(() => {});
}

function resetScreenState(n) {
  if (n === 0) { syncS0Back(); s0Enter(); }
  else if (n === 2) s2Enter();
  else if (SCQ_BY_SCREEN[n]) SCQ_BY_SCREEN[n].enter();
}

/* ===================== Progress question (standard A, 4 questions) =====================
   _global-components "Progress Question". Slide notes: "שאלה 1 מתוך 4" (21), "שאלה 2 מתוך 4"
   (22), "שאלה 3 מתוך 4" (23), "שאלה 4 מתוך 4, סעיף א'/ב'" (24-25: one item, two screens).
   The slides' six-item bar is the template mock; the notes' count (4) is built. */
const practiceProgress = {
  questions: [
    { number: 1, screens: [1] },
    { number: 2, screens: [2] },
    { number: 3, screens: [3] },
    { number: 4, screens: [4, 5] }
  ]
};
/* Each question screen's own result: null while unresolved, else 'correct' | 'incorrect'.
   Read-only seam for the 720 reporting layer (added after QA). */
const SCREEN_RESULT = {
  1: () => scqResult(s1q),
  2: () => s2Done ? (s2Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  3: () => scqResult(s3q),
  4: () => scqResult(s4q),
  5: () => scqResult(s5q)
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
/* Bundle score: correct on attempt 1 or 2 counts; a revealed solution does not. */
const PASS_THRESHOLD = Math.ceil(2 * practiceProgress.questions.length / 3);   // = 3, as slide 20 states
const bundleScore = () => practiceProgress.questions.filter(q => progressItemResult(q) === 'correct').length;
const bundlePassed = () => bundleScore() >= PASS_THRESHOLD;
window.lomdaState.standardA = { threshold: PASS_THRESHOLD, score: bundleScore, passed: bundlePassed };
/* ---- Progress question rendering — copied from part 01 ---- */
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

/* ===================== Shared engine blocks — copied verbatim from part 01 (popup, DnD, zoom, hint, nav labels) ===================== */
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


/* ===================== SingleChoiceQuestion — one controller per screen (S1, S3, S4, S5) =====================
   720-templates SingleChoiceQuestion, the same state machine as part 01 S12, written once and
   instantiated per screen (four screens here). Two attempts (default; no note authors another):
   retry -> the chosen option red + ✗, correct not revealed, Retry gate (the same option keeps
   "צדקתי?" disabled); final wrong -> correct green + chosen red, locked. A resolved screen enables
   the primary button as "שנמשיך?" (no authored label). The hint, when the screen has one, follows
   the stage default for standard practice — hidden (visibility) until the first wrong attempt,
   reusable until the question resolves. Option elements are [data-id] buttons; their state
   classes go on the .scq-opt pill inside them (S1's image cards) or on the button itself. */
function createScq(cfg) {
  const st = { selected: null, attempts: 0, done: false, lastWrong: null, outcome: null };
  const sec = () => document.getElementById(cfg.sec);
  const popupId = cfg.sec + '-popup';
  const opts = () => sec().querySelectorAll('[data-id]');
  const pill = o => o.classList.contains('scq-opt') ? o : o.querySelector('.scq-opt');
  const hintBtn = () => document.getElementById(cfg.sec + '-hint');
  const hintOverlay = () => document.getElementById(cfg.sec + '-hint-overlay');
  function render() {
    opts().forEach(o => {
      const id = o.dataset.id;
      let cls = '';
      if (st.done) {
        if (id === cfg.correctId) cls = 'correct';
        else if (st.outcome === 'wrong2' && id === st.selected) cls = 'wrong';
      } else if (id === st.lastWrong && id === st.selected) cls = 'wrong';
      else if (id === st.selected) cls = 'selected';
      const p = pill(o);
      ['selected', 'correct', 'wrong'].forEach(c => p.classList.toggle(c, cls === c));
      o.setAttribute('aria-checked', id === st.selected ? 'true' : 'false');
      const verdict = o.querySelector('.vh-verdict');
      if (verdict) verdict.textContent = cls === 'correct' ? '، صحيح' : cls === 'wrong' ? '، غير صحيح' : '';
      o.disabled = st.done;
    });
    const btn = document.getElementById(cfg.sec + '-check');
    setNavLabel(btn, st.done ? 'متابعة' : 'هل إجابتي صحيحة؟');
    btn.disabled = !st.done && (!st.selected || st.selected === st.lastWrong);
    const h = hintBtn();
    if (h) { h.hidden = st.done; h.style.visibility = (!st.done && st.attempts > 0) ? 'visible' : 'hidden'; }
  }
  function select(id) {
    if (st.done) return;
    dismissRetryPopup(popupId, st.done);
    st.selected = id;
    render();
  }
  function showPopup(type) {
    const f = cfg.feedback[type];
    showFeedback(popupId, type, f, f, null);
  }
  function finish(outcome) {
    st.done = true; st.outcome = outcome;
    closeHintOverlay(hintOverlay());
    render();
    syncPracticeProgressNav(sec());
    showPopup(outcome);
  }
  function check() {
    if (!st.selected || st.done || st.selected === st.lastWrong) return;
    st.attempts++;
    if (st.selected === cfg.correctId) { finish('correct'); return; }
    if (st.attempts >= 2) { finish('wrong2'); return; }
    st.lastWrong = st.selected;
    render();
    showPopup('retry');
  }
  function primary() {
    if (st.done) { advanceScreen(); return; }
    check();
  }
  function enter() {
    document.getElementById(popupId).classList.add('hidden');
    syncPracticeProgressNav(sec());
    render();
  }
  function openHint() { if (!st.done && st.attempts > 0) openHintOverlay(cfg.sec + '-hint-overlay', hintBtn()); }
  function closeHint() { closeHintOverlay(hintOverlay()); }
  function closeHintOnBackdrop(e) { if (!e.target.closest('.hint-card')) closeHint(); }
  return { st, select, primary, enter, showPopup, openHint, closeHint, closeHintOnBackdrop };
}
const scqResult = q => q.st.done ? (q.st.outcome === 'correct' ? 'correct' : 'incorrect') : null;
function syncPracticeProgressNav(sectionEl) {
  const nav = sectionEl && sectionEl.querySelector('.progress-question');
  if (nav) updateProgressQuestion(nav, practiceProgress);
}
/* Retry copy = template default (no slide authors one). Final-wrong titles: the slide's own first
   line + the solution line - authored on slides 23-25 ("התשובה לא נכונה. התשובה הנכונה מוצגת." is
   split into its two lines, _question-template-defaults "Anti-duplication"), the fallback on slide
   21 (none authored). Bodies = the slides' boxes; correct and final-wrong share the explanation. */
const SCQ_RETRY = { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مجددًا؟'] };

/* ---- S1 (index 1) — slide 21 — SingleChoiceQuestion, image options (LOCAL VARIANT) ----
   Note: "SingleChoiceQuestion - ImageOptions" (no such frame in "720 - UI Templates"), "סטנדרטי א'
   - שאלה 1 מתוך 4". Three picture options, each a pill (radio + label) over its picture, right to
   left א / ב / ג as on the slide. Correct = ג (the check on the slide). The note says "רמז אחרי
   טעות ראשונה" but the slide carries no hint text -> no hint (hint existence rule; flagged). */
const S1_EXPLAIN = ['الغاز يتمدد ويملأ كامل حجم الوعاء الذي يوجد فيه. لذلك، لا يبقى فقط في قاع الوعاء، ولا يتركز في منطقة واحدة.'];
const s1q = createScq({
  sec: 's1', correctId: 'c',
  feedback: {
    retry: SCQ_RETRY,
    correct: { title: 'صحيح جدًا!', body: S1_EXPLAIN },
    wrong2: { title: 'أخطأتم، وهذا طبيعي تمامًا، فهكذا بالضبط نتعلّم.<br>الإجابة الصحيحة معروضة.', body: S1_EXPLAIN }
  }
});

/* ---- S3 (index 3) — slide 23 — SingleChoiceQuestionImage, standard A 3/4. Correct = option 3
   (the check). Hint = slide 23's box, after the first wrong attempt (note). ---- */
const S3_EXPLAIN = ['في التجربة السليمة نغيّر فقط العامل الذي نريد اختبارَه، وفي هذه الحالة هو ما إذا كانت المادة غازًا أو سائلًا.', 'كل شروط التجربة الأخرى، مثل نوع المحقنة، والحجم الابتدائي، وإحكام إغلاق الفوهة، والقوة المطبّقة، يجب أن تكون متطابقة.', 'علاوة على ذلك، يساعد إجراء عدة تكرارات على التأكد من أن النتائج متسقة وموثوقة.'];
const s3q = createScq({
  sec: 's3', correctId: 'c',
  feedback: {
    retry: SCQ_RETRY,
    correct: { title: 'رائع!', body: S3_EXPLAIN },
    wrong2: { title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S3_EXPLAIN }
  }
});

/* ---- S4 (index 4) — slide 24 — Q4 part א. Correct = option 2. No hint (note "ללא כפתור רמז"). ---- */
const S4_EXPLAIN = ['عندما ننفخ العوامة، يتمدّد الهواء ويملأ حجمها كلّه ويأخذ شكلها.', 'لذلك ينتفخ الرأس والقرن أيضًا.'];
const s4q = createScq({
  sec: 's4', correctId: 'b',
  feedback: {
    retry: SCQ_RETRY,
    correct: { title: 'رائع!', body: S4_EXPLAIN },
    wrong2: { title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S4_EXPLAIN }
  }
});

/* ---- S5 (index 5) — slide 25 — Q4 part ב. Correct = option 3. No hint (note). The last screen:
   its resolved button crosses the part boundary (advanceScreen -> goToNextPart). ---- */
const S5_EXPLAIN = ['في العوامة القابلة للنفخ تظهر خاصيتان من خصائص الغاز:', '1. الغاز يملأ حجم الوعاء كله ويأخذ شكله: لذلك يصل الهواء إلى جميع أجزاء العوامة.', '2. الغاز قابل للانضغاط: لذلك يمكن الاستمرار في إدخال المزيد من الهواء إلى العوامة.'];
const s5q = createScq({
  sec: 's5', correctId: 'c',
  feedback: {
    retry: SCQ_RETRY,
    correct: { title: 'الإجابة صحيحة.', body: S5_EXPLAIN },
    wrong2: { title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S5_EXPLAIN }
  }
});
const SCQ_BY_SCREEN = { 1: s1q, 3: s3q, 4: s4q, 5: s5q };

/* ===================== S2 (index 2) — slide 22 — image-only drag-and-drop (LOCAL VARIANT) =====================
   Note: "ImageOnlyDragAndDropQuestion" (Figma 391:4247-391:4508: picture tiles above, dashed
   picture-sized targets with a caption; no skill spec - Q-20). Mechanic = part 01 S6 (Image Top
   DnD, ported from liquid-02-01 S7) with the roles swapped: the PICTURES are dragged, the three
   property captions are fixed. Each target holds one picture; dropping on an occupied target
   evicts its picture to the bank; Check enables when all three are filled; two attempts: retry ->
   each target ✓ / ✕ until its content changes, Retry gate; final wrong -> solution at once + the
   View My Answer Toggle (the slide's "מעבר לתשובה שלי"). Hint = slide 22's box, after the first
   wrong attempt (note). Solved layout (PPTX positions): right box "אפשר לדחוס גז" <- helium tank,
   middle "גז מקבל את צורת הכלי" <- star balloon, left "גז מתפשט במרחב" <- popcorn.
   Feedback = slide 22's boxes: correct "מעולה!" + the three explanations; final wrong, partly
   right = the authored "התשובה נכונה חלקית." + the authored solution line; nothing right = the
   canonical first line + the same solution line; both with the shared explanation (the slide's
   final-wrong body is that explanation without the praise). */
const S2Q = {
  accept: { 's2-t-compress': ['s2-d-helium'], 's2-t-shape': ['s2-d-star'], 's2-t-spread': ['s2-d-popcorn'] },
  reveal: { 's2-t-compress': 's2-d-helium', 's2-t-shape': 's2-d-star', 's2-t-spread': 's2-d-popcorn' },
  maxAttempts: 2
};
/* Screen-reader names only (the slide's own words for each example and property). */
const S2_LABEL = { 's2-d-helium': 'أسطوانة الهيليوم', 's2-d-star': 'بالون على شكل نجمة', 's2-d-popcorn': 'رائحة الفشار' };
const S2_NAME = { 's2-t-compress': 'يمكن ضغط الغاز', 's2-t-shape': 'الغاز يأخذ شكل الوعاء', 's2-t-spread': 'الغاز يتمدد في الحيّز' };
/* The slide's groups are separated by an empty paragraph; each group = bold label + its line.
   The mid-sentence break "ומגיע / לאזורים שונים." is kept as authored (docs/component-02.md, C2-05). */
const S2_EXPLAIN = [
  '<strong>في أسطوانة الهيليوم:</strong><br>نستفيد من إمكانية ضغط الغاز وإدخال كمية كبيرة منه في حجم صغير.',
  '<strong>في البالون على شكل نجمة:</strong><br>يأخذ الغاز شكل الوعاء الذي يوجد فيه.',
  '<strong>رائحة الفشار:</strong><br>توضّح كيف يتمدّد الغاز في الحيّز ويصل إلى مناطق مختلفة.'
];
const S2_SOLUTION_LINE = 'الإجابة الصحيحة معروضة.';
const S2_FEEDBACK = {
  retry:         { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مجددًا؟'] },
  retryPartial:  { title: 'الإجابة ليست صحيحة بالكامل.', body: ['هل نحاول مجددًا؟'] },
  correct:       { title: 'رائع!', body: S2_EXPLAIN },
  wrong2:        wrong2Config('الإجابة غير صحيحة.', S2_SOLUTION_LINE, S2_EXPLAIN),
  wrong2Partial: wrong2Config('الإجابة صحيحة جزئيًا.', S2_SOLUTION_LINE, S2_EXPLAIN)
};
const s2Place = { 's2-d-helium': 'source', 's2-d-star': 'source', 's2-d-popcorn': 'source' };
let s2Attempts = 0, s2Done = false, s2Outcome = null, s2LastWrong = null;
let s2Marks = null, s2Judged = null;
let s2Answer = null, s2View = 'solution', s2RetryPartial = false;
let s2Pick = null, s2Dnd = null, s2SkipClick = false;
const s2Targets = () => Object.keys(S2Q.accept);
const s2In = t => Object.keys(s2Place).find(d => s2Place[d] === t) || null;
const s2Snap = () => JSON.stringify(s2Place);
function s2MarkOf(t) {
  if (!s2Marks) return null;
  if (s2Done || !s2Judged) return s2Marks[t];
  return s2In(t) === s2Judged[t] ? s2Marks[t] : null;
}
function s2Announce(msg) { const l = document.getElementById('s2-live'); if (l) l.textContent = msg; }
function s2Render() {
  Object.keys(s2Place).forEach(d => {
    const tile = document.getElementById(d), placed = s2Place[d] !== 'source';
    tile.classList.remove('dragging');
    tile.classList.toggle('is-placed', placed);
    tile.classList.toggle('is-selected', s2Pick === d);
    tile.setAttribute('aria-pressed', s2Pick === d ? 'true' : 'false');
    tile.disabled = placed || s2Done;
    tile.setAttribute('aria-hidden', placed ? 'true' : 'false');
  });
  s2Targets().forEach(t => {
    const zone = document.getElementById(t), d = s2In(t), mark = s2MarkOf(t);
    zone.textContent = '';
    zone.classList.toggle('occupied', !!d && !mark);
    zone.classList.toggle('correct', mark === 'correct');
    zone.classList.toggle('wrong', mark === 'wrong');
    zone.classList.toggle('locked', s2Done);
    if (mark) { const m = document.createElement('span'); m.className = 'iod-mark'; m.setAttribute('aria-hidden', 'true'); zone.appendChild(m); }
    if (d) {
      const card = document.createElement('span');
      card.className = 'iod-placed';
      const img = document.getElementById(d).querySelector('img').cloneNode();
      img.alt = '';
      card.appendChild(img);
      zone.appendChild(card);
      if (!s2Done && s2Dnd) s2Dnd.attachSource(card, d);
    }
    const state = mark === 'correct' ? '، صحيح' : mark === 'wrong' ? '، غير صحيح' : '';
    zone.setAttribute('aria-label', S2_NAME[t] + ': ' + (d ? S2_LABEL[d] : 'فارغة') + state);
    zone.tabIndex = s2Done ? -1 : 0;
  });
  s2UpdateCheck();
}
function s2UpdateCheck() {
  const h = document.getElementById('s2-hint');
  h.hidden = s2Done;
  h.style.visibility = (!s2Done && s2Attempts > 0) ? 'visible' : 'hidden';
  const btn = document.getElementById('s2-check');
  if (s2Done) { btn.disabled = false; return; }
  const full = s2Targets().every(t => !!s2In(t));
  btn.disabled = !full || s2Snap() === s2LastWrong;
}
function s2StartEdit() { dismissRetryPopup('s2-popup', s2Done); }
function s2PlaceChip(d, t) {
  const evicted = s2In(t);
  if (evicted && evicted !== d) s2Place[evicted] = 'source';
  s2Place[d] = t;
  s2Pick = null;
  s2Render();
  s2Announce(S2_LABEL[d] + ' في الخانة: ' + S2_NAME[t]);
}
function s2InitDnd() {
  if (s2Dnd) return;
  s2Dnd = createPointerDnd({
    canDrag: () => !s2Done,
    onPick: d => { s2StartEdit(); s2Pick = null; s2Place[d] = 'source'; s2Render(); document.getElementById(d).classList.add('dragging'); },
    onDrop: (d, t) => { s2SkipClick = true; s2PlaceChip(d, t); },
    onCancel: () => { s2SkipClick = true; s2Render(); },
    onTap: (d, src) => { s2SkipClick = true; if (src.classList.contains('iod-placed')) s2ZonePress(s2Place[d]); else s2ChipPress(d); }
  });
  Object.keys(s2Place).forEach(d => s2Dnd.attachSource(document.getElementById(d), d));
  s2Targets().forEach(t => {
    const zone = document.getElementById(t);
    s2Dnd.attachTarget(zone, t);
    zone.addEventListener('click', () => { if (s2SkipClick) { s2SkipClick = false; return; } s2ZonePress(t); });
    zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s2ZonePress(t); } });
  });
  Object.keys(s2Place).forEach(d => document.getElementById(d).addEventListener('click', e => { if (e.detail === 0) s2ChipPress(d); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && currentScreen === 2 && s2Pick) { s2Pick = null; s2Render(); } });
  document.addEventListener('pointerdown', () => { s2SkipClick = false; }, true);
}
function s2ChipPress(d) {
  if (s2Done || s2Place[d] !== 'source') return;
  s2StartEdit();
  s2Pick = (s2Pick === d) ? null : d;
  s2Render();
  if (s2Pick) s2Announce('تم اختيار المثال: ' + S2_LABEL[d] + '. اختاروا خاصية لوضعه فيها.');
}
function s2ZonePress(t) {
  if (s2Done) return;
  if (s2Pick) { s2StartEdit(); s2PlaceChip(s2Pick, t); return; }
  const d = s2In(t);
  if (!d) return;
  s2StartEdit();
  s2Place[d] = 'source'; s2Pick = d;
  s2Render();
  s2Announce('تم اختيار المثال: ' + S2_LABEL[d] + '. اختاروا خاصية لوضعه فيها.');
}
function s2MarksFor(placement) {
  const m = {};
  s2Targets().forEach(t => { const d = Object.keys(placement).find(k => placement[k] === t); m[t] = S2Q.accept[t].includes(d) ? 'correct' : 'wrong'; });
  return m;
}
const s2AnyRight = placement => Object.values(s2MarksFor(placement)).some(v => v === 'correct');
function s2Primary() {
  if (s2Done) { advanceScreen(); return; }
  s2Check();
}
function s2Check() {
  if (s2Done || !s2Targets().every(t => !!s2In(t)) || s2Snap() === s2LastWrong) return;
  s2Pick = null;
  s2Attempts++;
  const marks = s2MarksFor(s2Place);
  if (Object.values(marks).every(v => v === 'correct')) {
    s2Marks = marks; s2Finish('correct');
  } else if (s2Attempts >= S2Q.maxAttempts) {
    s2Answer = Object.assign({}, s2Place);
    s2View = 'solution';
    s2Finish('wrong2');
  } else {
    s2LastWrong = s2Snap();
    s2Marks = marks;
    s2Judged = {}; s2Targets().forEach(t => { s2Judged[t] = s2In(t); });
    s2RetryPartial = s2AnyRight(s2Place);
    s2Targets().forEach(t => { if (marks[t] === 'wrong') { const d = s2In(t); if (d) s2Place[d] = 'source'; } });   // wrong cards go back to the bank (s2 retry), as in the approved יעד 14 build
    s2Render();
    s2ShowPopup('retry');
  }
}
function s2Finish(outcome) {
  s2Done = true; s2Outcome = outcome;
  closeHintOverlay(document.getElementById('s2-hint-overlay'));
  setNavLabel(document.getElementById('s2-check'), 'متابعة');
  syncPracticeProgressNav(document.getElementById('s2'));
  if (outcome === 'wrong2') { s2ApplyView(); return; }
  s2Render();
  s2ShowPopup(outcome);
}
function s2SetSolution() {
  Object.keys(s2Place).forEach(d => { s2Place[d] = 'source'; });
  Object.keys(S2Q.reveal).forEach(t => { s2Place[S2Q.reveal[t]] = t; });
}
function s2ApplyView() {
  if (s2Answer === null) return;
  if (s2View === 'answer') { Object.assign(s2Place, s2Answer); s2Marks = s2MarksFor(s2Answer); }
  else { s2SetSolution(); s2Marks = s2MarksFor(s2Place); }
  s2Render();
  s2ShowPopup('wrong2', s2View);
}
function s2ToggleView() {
  if (s2Answer === null) return;
  s2View = (s2View === 'solution') ? 'answer' : 'solution';
  s2ApplyView();
}
function s2ShowPopup(type, view) {
  const partial = type === 'retry' ? s2RetryPartial : type === 'wrong2' ? s2AnyRight(s2Answer || s2Place) : false;
  const base = S2_FEEDBACK[partial ? type + 'Partial' : type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;
  showFeedback('s2-popup', type, cfg, base, s2ToggleView);
}
function s2Enter() {
  s2InitDnd();
  document.getElementById('s2-popup').classList.add('hidden');
  syncPracticeProgressNav(document.getElementById('s2'));
  if (s2Done) {
    if (s2Answer !== null) { s2View = 'solution'; s2SetSolution(); s2Marks = s2MarksFor(s2Place); }
    setNavLabel(document.getElementById('s2-check'), 'متابعة');
    s2Render();
    return;
  }
  s2Pick = null;
  setNavLabel(document.getElementById('s2-check'), 'هل إجابتي صحيحة؟');
  s2Render();
}
function s2OpenHint() { if (!s2Done && s2Attempts > 0) openHintOverlay('s2-hint-overlay', document.getElementById('s2-hint')); }
function s2CloseHint() { closeHintOverlay(document.getElementById('s2-hint-overlay')); }
function s2CloseHintOnBackdrop(e) { if (!e.target.closest('.hint-card')) s2CloseHint(); }

/* ===================== Boot — as part 01 ===================== */
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
