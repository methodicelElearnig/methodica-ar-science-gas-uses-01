/* methodica-gas-uses-01-06 — js/main.js
   Engine + per-screen logic. Part 06 = component 06 of the script (slides 49-56):
   שאלת שיא מועד א' — one peak question with 4 lettered parts (א-ד), the journey's "end of peak A"
   decision point. Engine (canvas, goTo / advanceScreen gates, feedback popup, image zoom, hint,
   Progress question, cross-part route stack, dev bridge) is copied from
   methodica-gas-uses-01-02/js/main.js (itself copied from part 01); the copied blocks are marked.
   The drag-and-drop helper is not copied (no drag screen here). Slide 49 (component divider) is
   structure only, not a screen (as slides 2 / 19 / 35 - Q-01).
   Screens: S0 (slide 50) TransitionScreen B · S1 (51) / S2 (52) TextWithCallout media=image ·
   S3 (53) SCQ + table, part א · S4 (54) SCQ image, part ב · S5 (55) part ג · S6 (56) part ד. */
'use strict';

const TOTAL_SCREENS = 7;   // slides 50-56 (docs/component-06.md)
let currentScreen = 0;

/* ===================== Unit / journey constants =====================
   720-templates _learning-journey.md, slot 6 (שאלת שיא מועד א'): N = 4 lettered parts, EACH its own
   scored unit (_question-template-defaults "Pass threshold formula": peak). Pass rule ceil(2N/3) = 3
   = the threshold slide 50 states ("יש בה 4 סעיפים. עליכם להצליח ב - 3 לפחות.").
   Pass -> END (unit completed successfully; the learner never sees מועד ב'). Fail -> slot 7, שאלת
   שיא מועד ב' = part 07 (slides 57-64; divider "רכיב 7: שאלת הערכה"). Peak routing confirmed
   2026-10-12 (_learning-journey.md 2).
   Entry: from part 05 (תרגול מתקדם, never gated) - one predecessor, resolved from the route stack.
   Reporting / Resume are added after QA by the 720 layer; this part keeps per-screen results
   (SCREEN_RESULT) and the bundle score (bundleScore()) that such a layer can read. */
const LOMDA_ID = 'methodica-gas-uses-01';
const PART_ID = 'methodica-gas-uses-01-06';
const ROUTE_END = 'END';
const ROUTE = { pass: ROUTE_END, fail: 'methodica-gas-uses-01-07' };
/* Part 07 exists (integration session, Noa approved 2026-10-20). Convention of parts 01-04: flip back
   to false if part 07 is withdrawn, and the fail branch's Continue stays inert. */
const PART_AVAILABLE = { 'methodica-gas-uses-01-07': true };

/* ===================== Companion character (state contract only) — as parts 01-04 ===================== */
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


/* ===================== Cross-part Back (session-scoped route stack) — as parts 01-04 =====================
   Same key and shape as parts 01-04: every forward hop pushes the part being left; S0's Back pops
   it and lands on that part's last screen (#last) - part 05 for every learner who reaches this
   part. Opened directly in a fresh session the stack is empty and S0's Back stays hidden. */
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
function goToPrevPart() {
  if (leavingPart) return;   // see goToNextPart: one hop per page load
  const stack = navStackRead();
  const prev = stack.pop();
  if (!prev) return;
  leavingPart = true;
  navStackWrite(stack);
  window.location.href = '../' + prev + '/index.html#last';
}
/* Decision point "end of peak A" — as part 02's "end of standard A". _global-components "Back
   navigation in a branched journey": re-crossing a boundary already crossed replays the recorded
   destination instead of re-evaluating the gate (screen state is not kept across parts - Q-48,
   owned by the Resume layer; nothing here restores it). Session-scoped like the route stack,
   written only when the crossing happens.
   One decision, two outputs (_global-components "Continue button" -> "Terminal-path override"):
   peakRoute() drives both the last screen's label (S6 doneLabel) and what goToNextPart() does. */
const ROUTE_KEY = LOMDA_ID + '_route_' + PART_ID;
function recordedRoute() {
  let r = null;
  try { r = sessionStorage.getItem(ROUTE_KEY); } catch (err) {}
  return (r === ROUTE.pass || r === ROUTE.fail) ? r : null;
}
const peakRoute = () => recordedRoute() || (bundlePassed() ? ROUTE.pass : ROUTE.fail);
/* A second press while the next part is loading would push this part twice (Q-48 check 10);
   the flag is local to this page load. */
let leavingPart = false;
window.addEventListener('pageshow', (e) => { if (e.persisted) { leavingPart = false; syncS0Back(); } });   // restored from the back-forward cache
function goToNextPart() {
  if (leavingPart || !s6q.st.done || !s6q.st.feedbackShown || s6q.st.submitted) return;
  const dest = peakRoute();
  if (dest !== ROUTE_END && !PART_AVAILABLE[dest]) return;
  s6q.submit();
  if (dest === ROUTE_END) {
    /* END (_learning-journey.md 3): "סיימתי" stays on this screen - no navigation, no popup, no
       finish screen. The reporting layer sends `completed` (success) here. */
    try { sessionStorage.setItem(ROUTE_KEY, dest); } catch (err) {}
    window.lomdaState.peakA.completed = true;
    return;
  }
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

/* ===================== Canvas scaling — as parts 01-04 ===================== */
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

/* ===================== Navigation — as part 02 ===================== */
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
   (_global-components "Advance gates"). The score gate is applied only when leaving the part
   (goToNextPart), so the Continue button and the ← key agree everywhere. S0-S2 have no gate. */
const SCREEN_GATES = {
  3: () => s3q.st.done,
  4: () => s4q.st.done,
  5: () => s5q.st.done,
  6: () => s6q.st.done
};
function advanceScreen() {
  const gate = SCREEN_GATES[currentScreen];
  if (gate && !gate()) return;
  if (currentScreen === TOTAL_SCREENS - 1) { goToNextPart(); return; }   // end of the part = decision point
  goTo(currentScreen + 1);
}

/* Back onto a resolved question reopens its feedback (as parts 01-02). */
function reopenFeedbackIfResolved(n) {
  const q = SCQ_BY_SCREEN[n];
  if (q && q.st.done) q.showPopup(q.st.outcome);
}

/* Arrow keys navigate — but never while the learner is typing or a dialog is open. */
document.addEventListener('keydown', (e) => {
  const t = e.target;
  if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.isContentEditable || (t.closest && t.closest('.report-modal-overlay')))) return;
  if (!document.getElementById('img-zoom-modal').classList.contains('hidden')) return;
  if (document.querySelector('[id$="-hint-overlay"]:not(.hidden)')) return;
  if (e.key === 'ArrowLeft') advanceScreen();
  if (e.key === 'ArrowRight') goBack();
});

/* S0 companion clip (climbing): same treatment as part 04 S0 (Noa 2026-10-26). */
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
  else if (SCQ_BY_SCREEN[n]) SCQ_BY_SCREEN[n].enter();
}

/* ===================== Progress question (peak A, 4 lettered parts) =====================
   _global-components "Progress Question" -> "What one progress item represents": in a peak
   question one item = one lettered sub-part, resolved to ✓/✕ as soon as that part is answered
   (never waiting for the rest). Each part here is one screen. Labels "סעיף א-ד" = the parts'
   own letters (the slides' six-item "שאלה N" bar is the template mock) - C6-02. */
const practiceProgress = {
  questions: [
    { number: 1, screens: [3] },
    { number: 2, screens: [4] },
    { number: 3, screens: [5] },
    { number: 4, screens: [6] }
  ]
};
/* Each part's own result: null while unresolved, else 'correct' | 'incorrect'.
   Read-only seam for the 720 reporting layer (added after QA). */
const SCREEN_RESULT = {
  3: () => scqResult(s3q),
  4: () => scqResult(s4q),
  5: () => scqResult(s5q),
  6: () => scqResult(s6q)
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
const PASS_THRESHOLD = Math.ceil(2 * practiceProgress.questions.length / 3);   // = 3, as slide 50 states
const bundleScore = () => practiceProgress.questions.filter(q => progressItemResult(q) === 'correct').length;
const bundlePassed = () => bundleScore() >= PASS_THRESHOLD;
window.lomdaState.peakA = { threshold: PASS_THRESHOLD, score: bundleScore, passed: bundlePassed, route: () => peakRoute(), completed: false };
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

/* ===================== Shared engine blocks — copied verbatim from part 02 (popup, zoom, hint, nav labels; the DnD helper is not needed here) ===================== */
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


/* ===================== SingleChoiceQuestion — one controller per screen (S3-S6) =====================
   720-templates SingleChoiceQuestion — part 02's createScq() copied verbatim except one delta:
   cfg.doneLabel (optional function) gives the resolved button's label. S6's local finishOnce
   variant (Noa, 2026-11-04) enables "סיימתי" after final feedback and disables it after submission,
   for either route. Every other screen keeps the fallback "שנמשיך?".
   Two attempts (default; no note authors another): retry -> the chosen option red + ✗, correct not
   revealed, Retry gate (the same option keeps "צדקתי?" disabled); final wrong -> correct green +
   chosen red, locked. Hint (S4-S6, per the notes): hidden (visibility) until the first wrong
   attempt, reusable until the part resolves. S3 has none ("אין רמז"). */
function createScq(cfg) {
  const st = { selected: null, attempts: 0, done: false, lastWrong: null, outcome: null, feedbackShown: false, submitted: false };
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
    btn.disabled = st.done
      ? Boolean(cfg.finishOnce && (!st.feedbackShown || st.submitted))
      : (!st.selected || st.selected === st.lastWrong);
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
    if (cfg.finishOnce && st.done) { st.feedbackShown = true; render(); }
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
  function submit() { st.submitted = true; render(); }
  function primary() {
    if (cfg.finishOnce && st.done && (!st.feedbackShown || st.submitted)) return;
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
  return { st, select, primary, enter, showPopup, openHint, closeHint, closeHintOnBackdrop, submit };
}
const scqResult = q => q.st.done ? (q.st.outcome === 'correct' ? 'correct' : 'incorrect') : null;
function syncPracticeProgressNav(sectionEl) {
  const nav = sectionEl && sectionEl.querySelector('.progress-question');
  if (nav) updateProgressQuestion(nav, practiceProgress);
}
/* Feedback copy, verbatim from the slides' off-canvas boxes:
   - retry = template default (no slide authors a retry box);
   - correct = the slide's correct box (bold title + body);
   - final wrong = the slide's wrong box: its bold title paragraph(s) as authored, then the solution
     line - none is authored on slides 53-56, so the fallback "התשובה הנכונה מוצגת." (_question-
     template-defaults "Terminal-incorrect title carries a second line"); body = the slide's own
     wrong-box body (identical to the correct body on every slide - no praise in it).
   The empty paragraph between title and body on every box is the popup's title -> body gap.
   "טעית, המשיכו לנסות..." (slide 55) is final-wrong copy: encouraging wording does not imply more
   attempts (_question-template-defaults "Two traps when reading the source"). */
const SCQ_RETRY = { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مجددًا؟'] };
const SOLUTION_LINE = 'الإجابة الصحيحة معروضة.';

/* ---- S3 (index 3) — slide 53 — part א. Correct = option 1 (the check). No hint ("אין רמז"). ---- */
const S3_EXPLAIN = ['كلما كان الضغط على المكبس أقوى، أصبح حجم الهواء في المحقنة أصغر. ومن الجدول يمكن أن نرى أن الحجم انخفض من 20 مل دون ضغط إلى 6 مل مع ضغط قوي.'];
const s3q = createScq({
  sec: 's3', correctId: 'a',
  feedback: {
    retry: SCQ_RETRY,
    correct: { title: 'رائع!', body: S3_EXPLAIN },
    wrong2: { title: 'أخطأتم،<br>هذا يحدث للجميع في عملية تعلّم حقيقية.<br>' + SOLUTION_LINE, body: S3_EXPLAIN }
  }
});

/* ---- S4 (index 4) — slide 54 — part ב. Correct = option 2 (the check). Hint after the first mistake. ---- */
const S4_EXPLAIN = ['الهواء داخل الإطار يمكن أن ينضغط قليلًا عندما تمر الدراجة على سطح غير مستوٍ. وبهذه الطريقة يغيّر الإطار شكله قليلًا ويساعد على امتصاص الصدمات أثناء الركوب.'];
const s4q = createScq({
  sec: 's4', correctId: 'b',
  feedback: {
    retry: SCQ_RETRY,
    correct: { title: 'أحسنتم!', body: S4_EXPLAIN },
    wrong2: { title: 'ليس تمامًا...<br>' + SOLUTION_LINE, body: S4_EXPLAIN }
  }
});

/* ---- S5 (index 5) — slide 55 — part ג. Correct = option 3 (the check). Hint after the first mistake.
   The body is two authored paragraphs (no empty paragraph between them). ---- */
const S5_EXPLAIN = ['الحجة مبنيّة على البيانات التي قِسناها وعلى التفسير العلمي معًا: عندما زدنا الضغط، انخفض حجم الهواء في المحقنة من 20 إلى 6 مل.', 'أي أن الهواء انضغط إلى حجم أصغر.'];
const s5q = createScq({
  sec: 's5', correctId: 'c',
  feedback: {
    retry: SCQ_RETRY,
    correct: { title: 'رائع!', body: S5_EXPLAIN },
    wrong2: { title: 'أخطأتم، واصلوا المحاولة، أنتم على الطريق الصحيح.<br>' + SOLUTION_LINE, body: S5_EXPLAIN }
  }
});

/* ---- S6 (index 6) — slide 56 — part ד. Correct = option 1 (the check). Hint after the first mistake.
   The last screen: "סיימתי" submits once; peakRoute() still determines the destination. ---- */
const S6_EXPLAIN = ['هذا سؤال علمي: يسعى إلى فهم كيف يتصرّف الهواء مقارنةً بالسائل. أما بقية الخيارات فتتناول تصميم منتج أو تحسينه، ولذلك فهي أهداف تكنولوجية.'];
const s6q = createScq({
  sec: 's6', correctId: 'a',
  doneLabel: () => 'انتهيت',
  finishOnce: true,
  feedback: {
    retry: SCQ_RETRY,
    correct: { title: 'رائع!', body: S6_EXPLAIN },
    wrong2: { title: 'أخطأتم،<br>محاولتكم لا تقلّ أهمية عن الإجابة.<br>' + SOLUTION_LINE, body: S6_EXPLAIN }
  }
});
const SCQ_BY_SCREEN = { 3: s3q, 4: s4q, 5: s5q, 6: s6q };

/* ===================== Boot — as parts 01-04 ===================== */
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
