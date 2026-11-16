/* methodica-gas-uses-01-03 — js/main.js
   Engine + per-screen logic. Part 03 = component 03 of the script (slides 27-34): the 720 journey's
   remediation part, two scored bundles in one part (_learning-journey.md, slot 3):
     תרגול בסיסי   — S1-S4 (slides 28-31), 4 questions, pass = ceil(2*4/3) = 3 (stated on slide 27);
                     pass -> S5 (standard-B transition), fail -> STOP.
     תרגול סטנדרטי ב' — S6-S7 (slides 33-34), 2 questions, pass = ceil(2*2/3) = 2 (slide 32 states the
                     count only; the threshold follows the formula - Q-17); pass -> part 04 (משימת כיתה,
                     the next main-path role), fail -> STOP.
   A learner reaches this part from part 02 after failing standard A (part 02 main.js ROUTE.fail).
   Engine (canvas, goTo / advanceScreen gates, feedback popup, pointer drag-and-drop, image zoom,
   hint, Progress question, cross-part route stack, dev bridge) is copied from
   methodica-gas-uses-01-02/js/main.js (itself from part 01); the copied blocks are marked. Slide 26
   (component divider) is structure only, not a screen (as slide 2 / 19 - Q-01).
   Screens: S0 (slide 27) TransitionScreen A · S1 (28) SCQ image · S2 (29) line-matching question ·
   S3 (30) sentence-blank drag-and-drop · S4 (31) SCQ image · S5 (32) TransitionScreen C ·
   S6 (33) SCQ image · S7 (34) SCQ image. */
'use strict';

const TOTAL_SCREENS = 8;   // slides 27-34 (docs/component-03.md)
let currentScreen = 0;

/* ===================== Unit / journey constants ===================== */
const LOMDA_ID = 'methodica-gas-uses-01';
const PART_ID = 'methodica-gas-uses-01-03';
const NEXT_PART = 'methodica-gas-uses-01-04';   // pass edge of standard B; no other part is a destination
/* Part 04 exists (built in parallel; docs/component-04.md, Development Complete 2026-10-19), so the
   pass edge is live. Set a flag to false to keep the last screen's Continue inert for a destination
   that does not exist (part 01 NEXT_PART_AVAILABLE / part 02 PART_AVAILABLE convention). */
const PART_AVAILABLE = { 'methodica-gas-uses-01-04': true };
const BASIC_LAST = 4;      // S4 (slide 31) — decision point "end of basic"
const STANDARD_B_LAST = 7; // S7 (slide 34) — decision point "end of standard B" = end of the part

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
/* Decision point "end of standard B" (the part boundary). _global-components "Back navigation in a
   branched journey": re-crossing a boundary already crossed replays the recorded destination instead
   of re-evaluating the gate (screen state is not kept across parts) - same key shape as part 02. The
   record is session-scoped like the route stack and is written only when the crossing happens.
   partRoute() is the score decision (null = STOP). For now it feeds only the reporting seam
   (partOutcome): navigation does not stop on score - S7 always continues to part 04 with
   "שנמשיך?" (dev, no reporting layer yet - Noa 2026-10-25; the final behavior follows the
   reporting spec). */
const ROUTE_KEY = LOMDA_ID + '_route_' + PART_ID;
function recordedRoute() {
  let r = null;
  try { r = sessionStorage.getItem(ROUTE_KEY); } catch (err) {}
  return r === NEXT_PART ? r : null;
}
function partRoute() { return recordedRoute() || (bundlePassed(BUNDLES.standardB) ? NEXT_PART : null); }
function goToNextPart() {
  if (leavingPart) return;
  const dest = NEXT_PART;                  // no STOP on score for now (Noa 2026-10-25)
  if (!PART_AVAILABLE[dest]) return;      // part 04 not built yet
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
   (_global-components "Advance gates"). No score gate for now (dev, Noa 2026-10-25): end of basic
   (S4) -> S5 and end of standard B (S7) -> part 04 whatever the score; the button and the ← key both
   go through advanceScreen(). */
const SCREEN_GATES = {
  1: () => s1q.st.done,
  2: () => s2Done,
  3: () => s3Done,
  4: () => s4q.st.done,
  6: () => s6q.st.done,
  7: () => s7q.st.done
};
function advanceScreen() {
  const gate = SCREEN_GATES[currentScreen];
  if (gate && !gate()) return;
  if (currentScreen === STANDARD_B_LAST) { goToNextPart(); return; }           // part boundary
  goTo(currentScreen + 1);
}

/* Back onto a resolved question reopens its feedback (final-wrong DnD: on the solution view). */
function reopenFeedbackIfResolved(n) {
  if (n === 2 && s2Done) { if (s2Outcome === 'wrong2') s2ApplyView(); else s2ShowPopup(s2Outcome); }
  if (n === 3 && s3Done) { if (s3Outcome === 'wrong2') s3ApplyView(); else s3ShowPopup(s3Outcome); }
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

/* S0 companion clip (chair): decorative muted one-shot from the start on every entry (goTo pauses
   it on leave). Reduced motion: stays on the first frame, static. As part 02 S0 (Noa 2026-10-25). */
function s0Enter() {
  const v = document.getElementById('s0-video');
  if (!v) return;
  v.pause();
  v.currentTime = 0;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const p = v.play();
  if (p && p.catch) p.catch(() => {});
}

/* S5 companion clip (rope): same treatment as S0 (Noa 2026-10-25). */
function s5Enter() {
  const v = document.getElementById('s5-video');
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
  else if (n === 3) s3Enter();
  else if (n === 5) s5Enter();
  else if (SCQ_BY_SCREEN[n]) SCQ_BY_SCREEN[n].enter();
}

/* ===================== Progress question — two bundles =====================
   _global-components "Progress Question". Basic: slide notes "בסיסי – שאלה 1 מתוך 4" (28), "שאלה 2/3/4
   מתוך 4" (29-31). Standard B: "שאלה 1/2 מתוך 2" (33-34). The slides' six-item bar is the template
   mock; the notes' counts are built. Every question here is a single screen. */
const BUNDLES = {
  basic: { questions: [
    { number: 1, screens: [1] },
    { number: 2, screens: [2] },
    { number: 3, screens: [3] },
    { number: 4, screens: [4] }
  ] },
  standardB: { questions: [
    { number: 1, screens: [6] },
    { number: 2, screens: [7] }
  ] }
};
/* Each question screen's own result: null while unresolved, else 'correct' | 'incorrect'.
   Read-only seam for the 720 reporting layer (added after QA). */
const SCREEN_RESULT = {
  1: () => scqResult(s1q),
  2: () => s2Done ? (s2Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  3: () => s3Done ? (s3Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  4: () => scqResult(s4q),
  6: () => scqResult(s6q),
  7: () => scqResult(s7q)
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
const bundleThreshold = b => Math.ceil(2 * b.questions.length / 3);   // basic 3 (= slide 27), standard B 2
const bundleScore = b => b.questions.filter(q => progressItemResult(q) === 'correct').length;
const bundlePassed = b => bundleScore(b) >= bundleThreshold(b);
/* Part outcome for a reporting layer: 'pending' until a decision point is reached and resolved. */
function partOutcome() {
  const resolved = b => b.questions.every(q => progressItemResult(q) !== null);
  if (!resolved(BUNDLES.basic)) return 'pending';
  if (!bundlePassed(BUNDLES.basic)) return 'stop-basic';
  if (!resolved(BUNDLES.standardB)) return 'pending';
  return partRoute() ? 'pass' : 'stop-standardB';
}
window.lomdaState.basic = { threshold: bundleThreshold(BUNDLES.basic), score: () => bundleScore(BUNDLES.basic), passed: () => bundlePassed(BUNDLES.basic) };
window.lomdaState.standardB = { threshold: bundleThreshold(BUNDLES.standardB), score: () => bundleScore(BUNDLES.standardB), passed: () => bundlePassed(BUNDLES.standardB) };
window.lomdaState.part03 = { outcome: partOutcome };
function bundleOfScreen(n) {
  return Object.values(BUNDLES).find(b => b.questions.some(q => q.screens.includes(n))) || null;
}
function syncProgressNav(sectionEl) {
  const nav = sectionEl && sectionEl.querySelector('.progress-question');
  const b = sectionEl ? bundleOfScreen(parseInt(sectionEl.dataset.screen, 10)) : null;
  if (nav && b) updateProgressQuestion(nav, b);
}
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
/* Media max = Image Zoom Surface envelope 1200x690 less its 24/72 padding (Figma 4399:22435). */
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
  // No cap at the source resolution: the zoom must visibly enlarge (720 Image Zoom Surface sizing).
  const k = Math.min(ZOOM_MEDIA_MAX_W / uw, ZOOM_MEDIA_MAX_H / uh);
  const clone = wrapper.cloneNode(true);
  clone.querySelectorAll('.img-zoom-btn').forEach(b => b.remove());
  clone.querySelectorAll('[data-reveal]').forEach(el => el.removeAttribute('data-reveal'));
  Object.assign(clone.style, { position: 'absolute', left: '0', top: '0', margin: '0', borderRadius: '0',
    width: uw + 'px', height: uh + 'px', transform: 'scale(' + k + ')', transformOrigin: '0 0' });
  stage.innerHTML = '';
  stage.style.width = (uw * k) + 'px';
  stage.style.height = (uh * k) + 'px';
  // Screen-scoped (#sN) img sizing does not reach the clone; fill the clone box so all four
  // corners meet the stage's rounded clip.
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


/* ===================== SingleChoiceQuestion — one controller per screen (S1, S4, S6, S7) =====================
   Part 02's createScq (720-templates SingleChoiceQuestion, part 01 S12's state machine), copied with
   two documented deltas: (1) cfg.hintFromStart - the basic-practice stage default ("רמז מופיע מיד" on
   slides 28 and 31): the hint is visible and usable from the start until the question resolves;
   without it the hint stays hidden (visibility) until the first wrong attempt (standard B, slides
   33-34); (2) cfg.doneLabel - the resolved button's label follows the learner's route on a decision
   screen ("סיימתי" on a STOP, _global-components "Terminal-path override"); "שנמשיך?" otherwise.
   Two attempts (default; no note authors another): retry -> the chosen option red + ✗, correct not
   revealed, Retry gate (the same option keeps "צדקתי?" disabled); final wrong -> correct green +
   chosen red, locked. */
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
    setNavLabel(btn, st.done ? (cfg.doneLabel ? cfg.doneLabel() : 'متابعة') : 'هل إجابتي صحيحة؟');
    btn.disabled = !st.done && (!st.selected || st.selected === st.lastWrong);
    const h = hintBtn();
    if (h) { h.hidden = st.done; h.style.visibility = (!st.done && (cfg.hintFromStart || st.attempts > 0)) ? 'visible' : 'hidden'; }
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
    syncProgressNav(sec());
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
    syncProgressNav(sec());
    render();
  }
  function openHint() { if (!st.done && (cfg.hintFromStart || st.attempts > 0)) openHintOverlay(cfg.sec + '-hint-overlay', hintBtn()); }
  function closeHint() { closeHintOverlay(hintOverlay()); }
  function closeHintOnBackdrop(e) { if (!e.target.closest('.hint-card')) closeHint(); }
  return { st, select, primary, enter, showPopup, openHint, closeHint, closeHintOnBackdrop };
}
const scqResult = q => q.st.done ? (q.st.outcome === 'correct' ? 'correct' : 'incorrect') : null;
/* Retry copy = template default (no slide authors one). Final-wrong titles: the slide's own first line +
   the solution line - authored as one line on slide 28 ("התשובה לא נכונה. התשובה הנכונה מוצגת.", split
   into its two lines as part 02 did, _question-template-defaults "Anti-duplication"); slides 31, 33,
   34 author only the first line -> + the fallback "התשובה הנכונה מוצגת.". Bodies = the slides' boxes,
   one <p> per authored paragraph; correct and final-wrong share the explanation. */
const SCQ_RETRY = { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مجددًا؟'] };
const SOLUTION_LINE = 'الإجابة الصحيحة معروضة.';

/* ---- S1 (index 1) — slide 28 — basic 1/4. Correct = option 1 (the check). Hint from the start. ---- */
const S1_EXPLAIN = ['الهواء غاز، ولذلك يمكن ضغطه.', 'عندما نطبّق عليه ضغطًا، يصغر حجمه.', 'هذه إحدى الخصائص التي تميّز الغازات.'];
const s1q = createScq({
  sec: 's1', correctId: 'a', hintFromStart: true,
  feedback: {
    retry: SCQ_RETRY,
    correct: { title: 'صحيح جدًا!', body: S1_EXPLAIN },
    wrong2: { title: 'الإجابة غير صحيحة.<br>' + SOLUTION_LINE, body: S1_EXPLAIN }
  }
});

/* ---- S4 (index 4) — slide 31 — basic 4/4. Correct = option 4 (the check). Hint from the start.
   The end of the basic bundle: resolved label "שנמשיך?" whatever the score (no STOP for now,
   Noa 2026-10-25). ---- */
const S4_EXPLAIN = ['تحمي أكياس الهواء المنتج لأن الهواء قابل للانضغاط. عندما يتعرّض الطرد لصدمة، ينضغط الهواء قليلًا ويمتص جزءًا من الصدمة، ثم يعود إلى حجمه. في المقابل، الماء يكاد لا ينضغط، ولذلك لا يوفّر الحماية نفسها.'];
const s4q = createScq({
  sec: 's4', correctId: 'd', hintFromStart: true,
  feedback: {
    retry: SCQ_RETRY,
    correct: { title: 'صحيح!', body: S4_EXPLAIN },
    wrong2: { title: 'أخطأتم، سنتعلّم ونتحسّن ونمضي قدمًا.<br>' + SOLUTION_LINE, body: S4_EXPLAIN }
  }
});

/* ---- S6 (index 6) — slide 33 — standard B 1/2. Correct = option 3 (the check). Hint after the first
   mistake (note). The second body paragraph's leading space is not rendered (HTML whitespace). ---- */
const S6_EXPLAIN = ['من الرسم البياني يمكن أن نرى أنه كلما زدنا الضغط على الهواء، قلّ حجمه.', 'البيانات توضح أن الغاز قابل للانضغاط.'];
const s6q = createScq({
  sec: 's6', correctId: 'c',
  feedback: {
    retry: SCQ_RETRY,
    correct: { title: 'صحيح!', body: S6_EXPLAIN },
    wrong2: { title: 'أخطأتم، سنتعلّم ونتحسّن ونمضي قدمًا.<br>' + SOLUTION_LINE, body: S6_EXPLAIN }
  }
});

/* ---- S7 (index 7) — slide 34 — standard B 2/2. Correct = option 3 (the check). Hint after the first
   mistake (note). The body's "ולראות איזה חומר / נדחס יותר." is two authored paragraphs - kept (as part
   02 C2-05). The last screen: resolved label "שנמשיך?" toward part 04 whatever the score (no STOP for
   now, Noa 2026-10-25). ---- */
const S7_EXPLAIN = ['لمقارنة قابلية الانضغاط للغاز والسائل، يجب الحفاظ على شروط الاختبار نفسها. تطبيق الضغط نفسه يتيح مقارنة التغيّر في الحجم ومعرفة أيّ مادة تنضغط أكثر.'];
const s7q = createScq({
  sec: 's7', correctId: 'c',
  feedback: {
    retry: SCQ_RETRY,
    correct: { title: 'رائع!', body: S7_EXPLAIN },
    wrong2: { title: 'أخطأتم، واصلوا المحاولة، أنتم على الطريق الصحيح.<br>' + SOLUTION_LINE, body: S7_EXPLAIN }
  }
});
const SCQ_BY_SCREEN = { 1: s1q, 4: s4q, 6: s6q, 7: s7q };

/* ===================== S2 (index 2) — slide 29 — line-matching question (basic 2/4, LOCAL VARIANT) =====================
   The slide's MemoryGame is replaced by a two-column line match (C3-01 / Q-07 decided, Noa 2026-10-25):
   in the game every pair was always found, so the item could never be wrong. States on the right in
   the note's order (מוצק / נוזל / גז); descriptions on the left in a fixed order where no description
   faces its own state. Nothing is judged while drawing: the learner learns the result only from the
   "צדקתי?" feedback. Drawing: press a card in one column, then a card in the other (mouse, touch or
   Enter / Space), or drag from one card to the other; joining a card that already has a line replaces
   that line. "צדקתי?" enables once all three lines are drawn.
   Two attempts (default; the note authors none), as S3: retry -> every line stays, each state card
   marked ✓ / ✗ (green / red line) until its line changes, Retry gate (the same three lines keep "צדקתי?"
   disabled); final wrong -> the solution + View My Answer Toggle. Final-wrong titles = the slide's two
   authored titles (approved): one line right -> "התשובה אינה נכונה במלואה", none right -> "טעית, החשוב
   הוא לנסות ולא לוותר." (three cards to three can never have exactly two right), each + the fallback
   solution line. Correct on attempt 1 or 2 counts in the basic gate. Hint = slide 29's box, from the
   start (note). Feedback body = slide 29's box. State survives navigation inside the part. */
const LM = {
  pairs: [
    { id: 'solid',  state: 'مادة صلبة', def: 'يحافظ على شكله وحجمه' },
    { id: 'liquid', state: 'سائل', def: 'يأخذ شكل الوعاء ويحافظ على حجمه' },
    { id: 'gas',    state: 'غاز',   def: 'يملأ كامل حجم الوعاء ويأخذ شكله' }
  ],
  defOrder: ['gas', 'solid', 'liquid'],   // fixed; row i never holds pairs[i]'s description
  maxAttempts: 2,
  /* Board geometry in canvas px — mirrors style.css (.lmq-board / .lmq-item). */
  geom: { w: 798, stateW: 200, defW: 380, rowH: 100, gap: 28, dragPx: 6 }
};
const S2_EXPLAIN = ['يمكن التعرّف على كل حالة من حالات المادة من خلال الطريقة التي تتصرّف بها.', 'المادة الصلبة - تحافظ على الشكل وعلى الحجم.', 'السائل - يغيّر شكله، لكنه يحافظ على حجمه.', 'الغاز - يغيّر شكله وحجمه معًا، ويملأ الوعاء كله.'];
const S2_FEEDBACK = {
  retry:   SCQ_RETRY,
  correct: { title: 'صحيح جدًا!', body: S2_EXPLAIN },
  partial: wrong2Config('الإجابة ليست صحيحة بالكامل', SOLUTION_LINE, S2_EXPLAIN),
  wrong2:  wrong2Config('أخطأتم، المهم أن تحاولوا ولا تستسلموا.', SOLUTION_LINE, S2_EXPLAIN)
};
const s2Links = {};   // state id -> description id (or absent)
let s2Attempts = 0, s2Done = false, s2Outcome = null, s2Final = null, s2LastWrong = null;
let s2Marks = null, s2Judged = null, s2Answer = null, s2View = 'solution';
let s2Pick = null, s2Drag = null, s2SkipClick = false, s2Built = false;
const lmPair = id => LM.pairs.find(p => p.id === id);
const s2StateOf = d => Object.keys(s2Links).find(s => s2Links[s] === d) || null;
const s2Snap = () => JSON.stringify(LM.pairs.map(p => s2Links[p.id] || null));
const s2AllLinked = () => LM.pairs.every(p => !!s2Links[p.id]);
const s2Item = (side, id) => document.querySelector('#s2-board [data-side="' + side + '"][data-id="' + id + '"]');
function s2Announce(msg) { const l = document.getElementById('s2-live'); if (l) l.textContent = msg; }
/* Line end points (the dots on the cards' inner edges), in board px. */
function s2RowY(i) { return i * (LM.geom.rowH + LM.geom.gap) + LM.geom.rowH / 2; }
function s2Dot(side, id) {
  if (side === 'state') return { x: LM.geom.w - LM.geom.stateW, y: s2RowY(LM.pairs.findIndex(p => p.id === id)) };
  return { x: LM.geom.defW, y: s2RowY(LM.defOrder.indexOf(id)) };
}
function s2Build() {
  if (s2Built) return;
  s2Built = true;
  const board = document.getElementById('s2-board');
  const add = (side, id, text, row) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lmq-item lmq-item--' + side;
    b.dataset.side = side; b.dataset.id = id;
    b.style.top = row * (LM.geom.rowH + LM.geom.gap) + 'px';
    b.innerHTML = '<span class="lmq-text"></span><span class="lmq-dot" aria-hidden="true"></span><span class="lmq-icon" aria-hidden="true"></span>';
    b.querySelector('.lmq-text').textContent = text;
    b.addEventListener('click', e => {
      if (s2SkipClick && e.detail !== 0) { s2SkipClick = false; return; }
      s2Press(side, id);
    });
    b.addEventListener('pointerdown', e => s2PointerDown(e, side, id));
    board.appendChild(b);
  };
  LM.pairs.forEach((p, i) => add('state', p.id, p.state, i));
  LM.defOrder.forEach((id, i) => add('def', id, lmPair(id).def, i));
  document.addEventListener('pointerdown', () => { s2SkipClick = false; }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && currentScreen === 2 && s2Pick) { s2Pick = null; s2Render(); } });
}
function s2MarkOf(s) {
  if (!s2Marks) return null;
  const m = s2Marks[s] || null;
  if (s2Done || !s2Judged) return m;
  return s2Links[s] === s2Judged[s] ? m : null;
}
function s2Render() {
  const svg = document.getElementById('s2-lines');
  let lines = '';
  LM.pairs.forEach(p => {
    const d = s2Links[p.id];
    if (!d) return;
    const a = s2Dot('state', p.id), b = s2Dot('def', d), m = s2MarkOf(p.id);
    lines += '<line class="lmq-line' + (m ? ' lmq-line--' + m : '') + '" x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '"/>';
  });
  if (s2Drag && s2Drag.moved) {
    const a = s2Dot(s2Drag.side, s2Drag.id);
    lines += '<line class="lmq-line lmq-line--temp" x1="' + a.x + '" y1="' + a.y + '" x2="' + s2Drag.x + '" y2="' + s2Drag.y + '"/>';
  }
  svg.innerHTML = lines;
  LM.pairs.forEach(p => {
    const b = s2Item('state', p.id), d = s2Links[p.id] || null, m = s2MarkOf(p.id);
    s2SyncItem(b, s2Pick && s2Pick.side === 'state' && s2Pick.id === p.id, !!d, m);
    const verdict = m === 'correct' ? '، صحيح' : m === 'wrong' ? '، غير صحيح' : '';
    b.setAttribute('aria-label', p.state + (d ? '، متصل مع: ' + lmPair(d).def : '، غير متصل') + verdict);
  });
  LM.defOrder.forEach(id => {
    const b = s2Item('def', id), s = s2StateOf(id), m = s ? s2MarkOf(s) : null;
    s2SyncItem(b, s2Pick && s2Pick.side === 'def' && s2Pick.id === id, !!s, m);
    b.setAttribute('aria-label', lmPair(id).def + (s ? '، متصل مع: ' + lmPair(s).state : '، غير متصل'));
  });
  const btn = document.getElementById('s2-check');
  setNavLabel(btn, s2Done ? 'متابعة' : 'هل إجابتي صحيحة؟');
  btn.disabled = !s2Done && (!s2AllLinked() || s2Snap() === s2LastWrong);
  const h = document.getElementById('s2-hint');
  h.hidden = s2Done;
  h.style.visibility = s2Done ? 'hidden' : 'visible';
}
function s2SyncItem(b, picked, linked, mark) {
  b.classList.toggle('is-picked', !!picked && !s2Done);
  b.classList.toggle('is-linked', linked);
  b.classList.toggle('is-correct', mark === 'correct');
  b.classList.toggle('is-wrong', mark === 'wrong');
  b.setAttribute('aria-pressed', picked ? 'true' : 'false');
  b.disabled = s2Done;
}
function s2StartEdit() { dismissRetryPopup('s2-popup', s2Done); }
function s2Link(s, d) {
  const prev = s2StateOf(d);
  if (prev) delete s2Links[prev];
  s2Links[s] = d;
  s2Pick = null;
  s2Render();
  s2Announce('تم رسم خط: ' + lmPair(s).state + ' – ' + lmPair(d).def + '.');
}
function s2Press(side, id) {
  if (s2Done) return;
  s2StartEdit();
  if (s2Pick && s2Pick.side !== side) {
    if (side === 'state') s2Link(id, s2Pick.id); else s2Link(s2Pick.id, id);
    return;
  }
  s2Pick = (s2Pick && s2Pick.id === id) ? null : { side, id };
  s2Render();
  if (s2Pick) s2Announce('تم الاختيار: ' + (side === 'state' ? lmPair(id).state : lmPair(id).def) + '. اختاروا عنصرًا في العمود الثاني لرسم خط.');
}
/* Drag to draw: a press that moves past LM.geom.dragPx draws a dashed line to the pointer; releasing
   over a card in the other column joins them; a press without a move falls through to the click. */
function s2BoardPoint(e) {
  const board = document.getElementById('s2-board'), r = board.getBoundingClientRect(), k = r.width / LM.geom.w;
  return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
}
function s2PointerDown(e, side, id) {
  if (s2Done || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const p = s2BoardPoint(e);
  s2Drag = { side, id, pointerId: e.pointerId, x0: p.x, y0: p.y, x: p.x, y: p.y, moved: false };
  document.addEventListener('pointermove', s2PointerMove, { passive: false });
  document.addEventListener('pointerup', s2PointerUp);
  document.addEventListener('pointercancel', s2PointerUp);
}
function s2PointerMove(e) {
  if (!s2Drag || e.pointerId !== s2Drag.pointerId) return;
  const p = s2BoardPoint(e);
  if (!s2Drag.moved && Math.hypot(p.x - s2Drag.x0, p.y - s2Drag.y0) < LM.geom.dragPx) return;
  e.preventDefault();
  if (!s2Drag.moved) { s2Drag.moved = true; s2StartEdit(); s2Pick = { side: s2Drag.side, id: s2Drag.id }; }
  s2Drag.x = p.x; s2Drag.y = p.y;
  s2Render();
}
function s2PointerUp(e) {
  if (!s2Drag || (e.pointerId !== undefined && e.pointerId !== s2Drag.pointerId)) return;
  document.removeEventListener('pointermove', s2PointerMove);
  document.removeEventListener('pointerup', s2PointerUp);
  document.removeEventListener('pointercancel', s2PointerUp);
  const drag = s2Drag;
  s2Drag = null;
  if (!drag.moved) return;
  s2SkipClick = true;
  const el = e.type === 'pointerup' ? document.elementFromPoint(e.clientX, e.clientY) : null;
  const t = el && el.closest ? el.closest('#s2-board .lmq-item') : null;
  if (t && t.dataset.side !== drag.side) {
    if (drag.side === 'state') s2Link(drag.id, t.dataset.id); else s2Link(t.dataset.id, drag.id);
    return;
  }
  s2Pick = null;
  s2Render();
}
function s2MarksFor(links) {
  const m = {};
  LM.pairs.forEach(p => { m[p.id] = links[p.id] === p.id ? 'correct' : 'wrong'; });
  return m;
}
function s2Primary() {
  if (s2Done) { advanceScreen(); return; }
  s2Check();
}
function s2Check() {
  if (s2Done || !s2AllLinked() || s2Snap() === s2LastWrong) return;
  s2Pick = null;
  s2Attempts++;
  const marks = s2MarksFor(s2Links);
  const right = Object.values(marks).filter(v => v === 'correct').length;
  if (right === LM.pairs.length) {
    s2Marks = marks; s2Finish('correct');
  } else if (s2Attempts >= LM.maxAttempts) {
    s2Answer = Object.assign({}, s2Links);
    s2Final = right > 0 ? 'partial' : 'wrong2';
    s2View = 'solution';
    s2Finish('wrong2');
  } else {
    s2LastWrong = s2Snap();
    s2Marks = marks;
    s2Judged = Object.assign({}, s2Links);
    s2Render();
    s2ShowPopup('retry');
  }
}
function s2Finish(outcome) {
  s2Done = true; s2Outcome = outcome;
  closeHintOverlay(document.getElementById('s2-hint-overlay'));
  syncProgressNav(document.getElementById('s2'));
  if (outcome === 'wrong2') { s2ApplyView(); return; }
  s2Render();
  s2ShowPopup(outcome);
}
function s2SetLinks(links) {
  Object.keys(s2Links).forEach(s => { delete s2Links[s]; });
  Object.assign(s2Links, links);
}
function s2Solution() { const l = {}; LM.pairs.forEach(p => { l[p.id] = p.id; }); return l; }
function s2ApplyView() {
  if (s2Answer === null) return;
  s2SetLinks(s2View === 'answer' ? s2Answer : s2Solution());
  s2Marks = s2MarksFor(s2Links);
  s2Render();
  s2ShowPopup('wrong2', s2View);
}
function s2ToggleView() {
  if (s2Answer === null) return;
  s2View = (s2View === 'solution') ? 'answer' : 'solution';
  s2ApplyView();
}
/* 'wrong2' = the final-wrong popup; its copy is the partial or the wrong one (s2Final). */
function s2ShowPopup(type, view) {
  const base = S2_FEEDBACK[type === 'wrong2' ? s2Final : type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;
  showFeedback('s2-popup', type, cfg, base, s2ToggleView);
}
function s2Enter() {
  s2Build();
  document.getElementById('s2-popup').classList.add('hidden');
  syncProgressNav(document.getElementById('s2'));
  s2Pick = null;
  if (s2Done && s2Answer !== null) { s2View = 'solution'; s2SetLinks(s2Solution()); s2Marks = s2MarksFor(s2Links); }
  s2Render();
}
function s2OpenHint() { if (!s2Done) openHintOverlay('s2-hint-overlay', document.getElementById('s2-hint')); }
function s2CloseHint() { closeHintOverlay(document.getElementById('s2-hint-overlay')); }
function s2CloseHintOnBackdrop(e) { if (!e.target.closest('.hint-card')) s2CloseHint(); }

/* ===================== S3 (index 3) — slide 30 — sentence blank + word bank (basic 3/4) =====================
   Part 01 S13's paragraph-blanks local variant, copied (one blank, labelled bank). Two attempts (default;
   the note authors none): retry -> ✕ on the blank until its word changes, Retry gate; final wrong -> the
   solution + View My Answer Toggle (DnD default). Hint = slide 30's box, from the start (note). Feedback
   = slide 30's boxes; final wrong = the authored "טעית, זו הזדמנות לעצור ולחדד את הרעיון." + the fallback
   solution line (as part 01 S13). */
const S3Q = { accept: { 's3-t1': ['s3-d-none'] }, reveal: { 's3-t1': 's3-d-none' }, maxAttempts: 2 };
const S3_LABEL = { 's3-d-none': 'لا يوجد', 's3-d-has': 'يوجد', 's3-d-maybe': 'يمكن أن يكون' };
const S3_EXPLAIN = ['يتمدد الغاز حتى يملأ كامل حجم الوعاء الذي يوجد فيه، ولذلك يأخذ شكل الوعاء.'];
const S3_FEEDBACK = {
  retry:   SCQ_RETRY,
  correct: { title: 'رائع!', body: S3_EXPLAIN },
  wrong2:  wrong2Config('أخطأتم، وهذه فرصة للتوقف وتوضيح الفكرة.', SOLUTION_LINE, S3_EXPLAIN)
};
const s3Place = {};
Object.keys(S3_LABEL).forEach(d => { s3Place[d] = 'source'; });
let s3Attempts = 0, s3Done = false, s3Outcome = null, s3LastWrong = null;
let s3Marks = null, s3Judged = null, s3Answer = null, s3View = 'solution';
let s3Pick = null, s3Dnd = null, s3SkipClick = false;
const s3Targets = () => Object.keys(S3Q.accept);
const s3In = t => Object.keys(s3Place).find(d => s3Place[d] === t) || null;
const s3Snap = () => JSON.stringify(s3Place);
function s3Announce(msg) { const l = document.getElementById('s3-live'); if (l) l.textContent = msg; }
function s3MarkOf(t) {
  if (!s3Marks) return null;
  const m = s3Marks[t] || null;
  if (s3Done || !s3Judged || m !== 'wrong') return m;
  return s3In(t) === s3Judged[t] ? m : null;
}
function s3Render() {
  Object.keys(s3Place).forEach(d => {
    const chip = document.getElementById(d), placed = s3Place[d] !== 'source';
    chip.classList.toggle('is-placed', placed);
    chip.classList.remove('dragging');
    chip.classList.toggle('is-selected', s3Pick === d);
    chip.setAttribute('aria-pressed', s3Pick === d ? 'true' : 'false');
    chip.disabled = placed || s3Done;
  });
  s3Targets().forEach(t => {
    const zone = document.getElementById(t), d = s3In(t), mark = s3MarkOf(t);
    zone.innerHTML = '';
    zone.classList.toggle('occupied', !!d && !mark);
    zone.classList.toggle('correct', mark === 'correct');
    zone.classList.toggle('wrong', mark === 'wrong');
    zone.classList.toggle('locked', s3Done);
    if (mark) { const m = document.createElement('span'); m.className = 'ddqp-mark'; m.setAttribute('aria-hidden', 'true'); zone.appendChild(m); }
    if (d) {
      const card = document.createElement('span');
      card.className = 'ddqp-placed';
      card.textContent = S3_LABEL[d];
      zone.appendChild(card);
      if (!s3Done && s3Dnd) s3Dnd.attachSource(card, d);
    }
    const verdict = mark === 'correct' ? '، صحيح' : mark === 'wrong' ? '، غير صحيح' : '';
    zone.setAttribute('aria-label', 'مكان فارغ: ' + (d ? S3_LABEL[d] : 'لا توجد كلمة') + verdict);
    zone.tabIndex = s3Done ? -1 : 0;
    if (s3Done) zone.removeAttribute('role'); else zone.setAttribute('role', 'button');
  });
  const btn = document.getElementById('s3-check');
  if (s3Done) btn.disabled = false;
  else btn.disabled = !s3Targets().every(t => !!s3In(t)) || s3Snap() === s3LastWrong;
  const h = document.getElementById('s3-hint');
  h.hidden = s3Done;
  h.style.visibility = s3Done ? 'hidden' : 'visible';
}
function s3StartEdit() { dismissRetryPopup('s3-popup', s3Done); }
function s3PlaceChip(d, t) {
  const evicted = s3In(t);
  if (evicted && evicted !== d) s3Place[evicted] = 'source';
  s3Place[d] = t;
  s3Pick = null;
  s3Render();
  s3Announce('تم وضع الكلمة: ' + S3_LABEL[d] + ' في المكان الفارغ');
}
function s3InitDnd() {
  if (s3Dnd) return;
  s3Dnd = createPointerDnd({
    canDrag: () => !s3Done,
    onPick: d => { s3StartEdit(); s3Pick = null; s3Place[d] = 'source'; s3Render(); document.getElementById(d).classList.add('dragging'); },
    onDrop: (d, t) => { s3SkipClick = true; s3PlaceChip(d, t); },
    onCancel: () => { s3SkipClick = true; s3Render(); },
    onTap: (d, src) => { s3SkipClick = true; if (src.classList.contains('ddqp-placed')) s3ZonePress(s3Place[d]); else s3ChipPress(d); }
  });
  Object.keys(s3Place).forEach(d => s3Dnd.attachSource(document.getElementById(d), d));
  s3Targets().forEach(t => {
    const zone = document.getElementById(t);
    s3Dnd.attachTarget(zone, t);
    zone.addEventListener('click', () => { if (s3SkipClick) { s3SkipClick = false; return; } s3ZonePress(t); });
    zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s3ZonePress(t); } });
  });
  Object.keys(s3Place).forEach(d => document.getElementById(d).addEventListener('click', e => { if (e.detail === 0) s3ChipPress(d); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && currentScreen === 3 && s3Pick) { s3Pick = null; s3Render(); } });
  document.addEventListener('pointerdown', () => { s3SkipClick = false; }, true);
}
function s3ChipPress(d) {
  if (s3Done || s3Place[d] !== 'source') return;
  s3StartEdit();
  s3Pick = (s3Pick === d) ? null : d;
  s3Render();
  if (s3Pick) s3Announce('تم اختيار الكلمة: ' + S3_LABEL[d] + '. اختاروا المكان الفارغ لوضعها.');
}
function s3ZonePress(t) {
  if (s3Done) return;
  if (s3Pick) { s3StartEdit(); s3PlaceChip(s3Pick, t); return; }
  const d = s3In(t);
  if (!d) return;
  s3StartEdit();
  s3Place[d] = 'source'; s3Pick = d;
  s3Render();
  s3Announce('تم اختيار الكلمة: ' + S3_LABEL[d] + '. اختاروا المكان الفارغ لوضعها.');
}
function s3MarksFor(placement) {
  const m = {};
  s3Targets().forEach(t => { const d = Object.keys(placement).find(k => placement[k] === t); m[t] = S3Q.accept[t].includes(d) ? 'correct' : 'wrong'; });
  return m;
}
function s3Primary() {
  if (s3Done) { advanceScreen(); return; }
  s3Check();
}
function s3Check() {
  if (s3Done || !s3Targets().every(t => !!s3In(t)) || s3Snap() === s3LastWrong) return;
  s3Pick = null;
  s3Attempts++;
  const marks = s3MarksFor(s3Place);
  if (Object.values(marks).every(v => v === 'correct')) {
    s3Marks = marks; s3Finish('correct');
  } else if (s3Attempts >= S3Q.maxAttempts) {
    s3Answer = Object.assign({}, s3Place);
    s3View = 'solution';
    s3Finish('wrong2');
  } else {
    s3LastWrong = s3Snap();
    s3Marks = marks;
    s3Judged = {}; s3Targets().forEach(t => { s3Judged[t] = s3In(t); });
    s3Targets().forEach(t => { if (marks[t] === 'wrong') { const d = s3In(t); if (d) s3Place[d] = 'source'; } });   // wrong cards go back to the bank (s3 retry), as in the approved יעד 14 build
    s3Render();
    s3ShowPopup('retry');
  }
}
function s3Finish(outcome) {
  s3Done = true; s3Outcome = outcome;
  closeHintOverlay(document.getElementById('s3-hint-overlay'));
  setNavLabel(document.getElementById('s3-check'), 'متابعة');
  syncProgressNav(document.getElementById('s3'));
  if (outcome === 'wrong2') { s3ApplyView(); return; }
  s3Render();
  s3ShowPopup(outcome);
}
function s3SetSolution() {
  Object.keys(s3Place).forEach(d => { s3Place[d] = 'source'; });
  Object.keys(S3Q.reveal).forEach(t => { s3Place[S3Q.reveal[t]] = t; });
}
function s3ApplyView() {
  if (s3Answer === null) return;
  if (s3View === 'answer') { Object.keys(s3Place).forEach(d => { s3Place[d] = 'source'; }); Object.assign(s3Place, s3Answer); s3Marks = s3MarksFor(s3Answer); }
  else { s3SetSolution(); s3Marks = s3MarksFor(s3Place); }
  s3Render();
  s3ShowPopup('wrong2', s3View);
}
function s3ToggleView() {
  if (s3Answer === null) return;
  s3View = (s3View === 'solution') ? 'answer' : 'solution';
  s3ApplyView();
}
function s3ShowPopup(type, view) {
  const base = S3_FEEDBACK[type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;
  showFeedback('s3-popup', type, cfg, base, s3ToggleView);
}
function s3Enter() {
  s3InitDnd();
  document.getElementById('s3-popup').classList.add('hidden');
  syncProgressNav(document.getElementById('s3'));
  if (s3Done) {
    if (s3Answer !== null) { s3View = 'solution'; s3SetSolution(); s3Marks = s3MarksFor(s3Place); }
    setNavLabel(document.getElementById('s3-check'), 'متابعة');
    s3Render();
    return;
  }
  s3Pick = null;
  setNavLabel(document.getElementById('s3-check'), 'هل إجابتي صحيحة؟');
  s3Render();
}
function s3OpenHint() { if (!s3Done) openHintOverlay('s3-hint-overlay', document.getElementById('s3-hint')); }
function s3CloseHint() { closeHintOverlay(document.getElementById('s3-hint-overlay')); }
function s3CloseHintOnBackdrop(e) { if (!e.target.closest('.hint-card')) s3CloseHint(); }

/* ===================== Boot — as parts 01-02 ===================== */
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
