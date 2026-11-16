/* methodica-gas-uses-01-05 — js/main.js
   Engine + per-screen logic. Part 05 = component 05 of the script (slides 38-48):
   תרגול מתקדם ("בואו נאתגר את עצמנו") — 5 advanced questions + an enrichment item (3 screens).
   Engine blocks (canvas, goTo / advanceScreen gates, feedback popup, pointer drag-and-drop, image
   zoom, hint, Progress question, cross-part route stack, SingleChoiceQuestion controller, dev
   bridge) are copied verbatim from methodica-gas-uses-01-02/js/main.js (itself copied from part
   01); the copied blocks are marked. The two-bin sort (S5) is ported from part 01 S9. Slide 38
   (component divider) is structure only, not a screen (Q-01).
   Screens: S0 (slide 39) TransitionScreen C · S1 (40) SCQ image · S2 (41) ordered DnD ·
   S3 (42) SCQ image, Q3 part א · S4 (43) SCQ image, Q3 part ב · S5 (44) two-group sort ·
   S6 (45) SCQ image · S7 (46) TextWithCallout image · S8 (47) TextWithCallout video ·
   S9 (48) TextWithCallout video. */
'use strict';

const TOTAL_SCREENS = 10;   // slides 39-48 (docs/component-05.md)
let currentScreen = 0;

/* ===================== Unit / journey constants =====================
   720-templates _learning-journey.md, slot 5 (תרגול מתקדם): N questions, NOT a scored bundle -
   "Questions resolve (right or wrong) and the learner continues"; the count slide 39 announces
   (5) implies no threshold (producer decision 2026-10-06). The part is never a decision point:
   its exit is unconditional to the next main-path role = שאלת שיא מועד א' (part 06, slides 49-56).
   Entry: from part 04 (class task) only, unconditionally. */
const LOMDA_ID = 'methodica-gas-uses-01';
const PART_ID = 'methodica-gas-uses-01-05';
const NEXT_PART_ID = 'methodica-gas-uses-01-06';
/* Part 06 exists in the working tree (built in a parallel session, 2026-10-20; its S0 Back expects
   this part's #last). Convention of parts 01-04: the exit stays inert while the destination is
   missing - flip to false if part 06 is withdrawn. */
const NEXT_PART_AVAILABLE = true;

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

/* ===================== Cross-part Back (session-scoped route stack) — as parts 01-04 =====================
   Same key and shape: every forward hop pushes the part being left; S0's Back pops it and lands on
   that part's last screen (#last) - part 04 S1 for every learner (04 is this part's only
   predecessor). Opened directly in a fresh session the stack is empty and S0's Back stays hidden. */
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
/* Unconditional exit (no gate, nothing recorded - not a decision point). */
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
   (_global-components "Advance gates"). No score gate anywhere in this part. */
const SCREEN_GATES = {
  1: () => s1q.st.done,
  2: () => s2Done,
  3: () => s3q.st.done,
  4: () => s4q.st.done,
  5: () => s5Done,
  6: () => s6q.st.done
};
function advanceScreen() {
  const gate = SCREEN_GATES[currentScreen];
  if (gate && !gate()) return;
  if (currentScreen === TOTAL_SCREENS - 1) { goToNextPart(); return; }   // end of the part (unconditional)
  goTo(currentScreen + 1);
}

/* Back onto a resolved question reopens its feedback (final-wrong DnD: on the solution view). */
function reopenFeedbackIfResolved(n) {
  if (n === 2 && s2Done) { if (s2Outcome === 'wrong2') s2ApplyView(); else s2ShowPopup(s2Outcome); }
  if (n === 5 && s5Done) { if (s5Outcome === 'wrong2') s5ApplyView(); else s5ShowPopup(s5Outcome); }
  const q = SCQ_BY_SCREEN[n];
  if (q && q.st.done) q.showPopup(q.st.outcome);
}

/* Arrow keys navigate — but never while the learner is typing, and never while the zoom is open. */
document.addEventListener('keydown', (e) => {
  const t = e.target;
  if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.isContentEditable || (t.closest && t.closest('.report-modal-overlay')))) return;
  if (!document.getElementById('img-zoom-modal').classList.contains('hidden')) return;
  if (document.querySelector('[id$="-hint-overlay"]:not(.hidden)')) return;
  if (e.key === 'ArrowLeft') advanceScreen();
  if (e.key === 'ArrowRight') goBack();
});

/* S0 companion clip (balloons): decorative muted one-shot from the start on every entry (goTo pauses
   it on leave). Reduced motion: stays on the first frame, static. As part 04 S0 (Noa 2026-10-25). */
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
  else if (n === 5) s5Enter();
  else if (SCQ_BY_SCREEN[n]) SCQ_BY_SCREEN[n].enter();
  else if (n === 8 || n === 9) clipEnter('s' + n);
}

/* ===================== Progress question (advanced practice, 5 questions) =====================
   _global-components "Progress Question". Slide notes: "שאלה 1 מתוך 5" (40), "2 מתוך 5" (41),
   "3 מתוך 5" (42 and 43 - parts א / ב: one item, two screens), "4 מתוך 5" (44), "5 מתוך 5" (45).
   The slides' six-item bar is the template mock; the notes' count (5) is built. The enrichment
   screens (S7-S9) carry no bar (none on slides 46-48). */
const practiceProgress = {
  questions: [
    { number: 1, screens: [1] },
    { number: 2, screens: [2] },
    { number: 3, screens: [3, 4] },
    { number: 4, screens: [5] },
    { number: 5, screens: [6] }
  ]
};
/* Each question screen's own result: null while unresolved, else 'correct' | 'incorrect'.
   Read-only seam for the 720 reporting layer (added after QA). */
const SCREEN_RESULT = {
  1: () => scqResult(s1q),
  2: () => s2Done ? (s2Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  3: () => scqResult(s3q),
  4: () => scqResult(s4q),
  5: () => s5Done ? (s5Outcome === 'correct' ? 'correct' : 'incorrect') : null,
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
/* Advanced practice is not a scored bundle: no threshold, no gate. The item results and their
   count are exposed for reporting only (a correct on attempt 1 or 2 counts; a revealed solution
   does not), never read by the navigation. */
const advancedCorrect = () => practiceProgress.questions.filter(q => progressItemResult(q) === 'correct').length;
window.lomdaState.advanced = {
  scored: false, questions: practiceProgress.questions.length, correct: advancedCorrect,
  items: () => practiceProgress.questions.map(q => ({ number: q.number, result: progressItemResult(q) })),
  exit: NEXT_PART_ID
};
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


/* ===================== SingleChoiceQuestion — one controller per screen (S1, S3, S4, S6) — copied verbatim from part 02 =====================
   720-templates SingleChoiceQuestion, the same state machine as part 01 S12, written once and
   instantiated per screen (four screens here: slides 40, 42, 43, 45). Two attempts (default; no note authors another):
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
/* Retry copy = template default (no slide 40-45 authors one). */
const SCQ_RETRY = { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مجددًا؟'] };

/* Final-wrong titles = each slide's own first line (one or two authored paragraphs) + the solution
   line, fallback "התשובה הנכונה מוצגת." (none authored on slides 40-45). Bodies = the slides' boxes;
   on every slide the correct and final-wrong boxes carry the same explanation (shared-explanation
   convention). Retry = the template default (SCQ_RETRY above). */

/* ---- S1 (index 1) — slide 40 — advanced 1/5. Correct = option 4 (d). Hint after the first mistake. ---- */
const S1_EXPLAIN = ['تعمل علبة الرذاذ بفضل غاز مضغوط. عندما نضغط على الزر، يمارس الغاز المضغوط ضغطًا على السائل ويدفعه إلى الخارج. لو كان داخل العلبة سائل فقط، لما كانت هناك قوة تدفعه إلى الخارج.'];
const s1q = createScq({
  sec: 's1', correctId: 'd',
  feedback: {
    retry: SCQ_RETRY,
    correct: { title: 'صحيح جدًا!', body: S1_EXPLAIN },
    wrong2: { title: 'أخطأتم، أحسنتم المحاولة، والآن يمكننا أن نكون أكثر دقة.<br>الإجابة الصحيحة معروضة.', body: S1_EXPLAIN }
  }
});

/* ---- S3 (index 3) — slide 42 — Q3 part א. Correct = option 1 (a). No hint (note "אין רמז"; C5-04). ---- */
const S3_EXPLAIN = ['الغاز قابل للانضغاط، ولذلك يمكن إدخال كمية كبيرة من الغاز في حجم صغير. وهكذا تستطيع أسطوانة صغيرة نسبيًا أن تحتوي على ما يكفي من الغاز للاستخدام لفترة طويلة.'];
const s3q = createScq({
  sec: 's3', correctId: 'a',
  feedback: {
    retry: SCQ_RETRY,
    correct: { title: 'رائع!', body: S3_EXPLAIN },   // the slide's "رائع! " - trailing space dropped
    wrong2: { title: 'أخطأتم، واصلوا المحاولة، أنتم على الطريق الصحيح.<br>الإجابة الصحيحة معروضة.', body: S3_EXPLAIN }
  }
});

/* ---- S4 (index 4) — slide 43 — Q3 part ב. Correct = option 2 (b). Hint after the first mistake.
   The final-wrong title is two authored paragraphs ("טעית," / "אל תתייאשו, ..."), kept as two lines. ---- */
const S4_EXPLAIN = ['عند نفخ البالونات، يخرج جزء من الهيليوم من الأسطوانة وينتقل إليها.<br>لذلك تقلّ كمية الغاز في الأسطوانة، وبالتالي تقلّ كتلة الأسطوانة أيضًا.'];
const s4q = createScq({
  sec: 's4', correctId: 'b',
  feedback: {
    retry: SCQ_RETRY,
    correct: { title: 'صحيح جدًا!', body: S4_EXPLAIN },
    wrong2: { title: 'أخطأتم،<br>لا تيأسوا، فكل تعلّم يبدأ هكذا.<br>الإجابة الصحيحة معروضة.', body: S4_EXPLAIN }
  }
});

/* ---- S6 (index 6) — slide 45 — advanced 5/5. Correct = option 2 (b). Hint after the first mistake. ---- */
const S6_EXPLAIN = ['لكي نصيغ سؤال بحث مناسبًا، يجب أن نحدد ما نريد تغييره وما نريد فحصه. وفي حالة إياد، الهدف هو فحص العلاقة بين كمية الهواء داخل الكرة ومدى صعوبة في الضغط عليها.'];
const s6q = createScq({
  sec: 's6', correctId: 'b',
  feedback: {
    retry: SCQ_RETRY,
    correct: { title: 'ممتاز!', body: S6_EXPLAIN },
    wrong2: { title: 'أخطأتم،<br>لا بأس، نتقدّم خطوة بخطوة.<br>الإجابة الصحيحة معروضة.', body: S6_EXPLAIN }
  }
});
const SCQ_BY_SCREEN = { 1: s1q, 3: s3q, 4: s4q, 6: s6q };

/* Multi-item boards (S2, S5): several correct answers are revealed at once -> the fallback solution
   line for several answers (_question-template-defaults "Terminal-incorrect title", rule 2; C5-11). */
const MULTI_SOLUTION_LINE = 'الإجابات الصحيحة تظهر الآن.';

/* ===================== S2 (index 2) — slide 41 — ordered drag-and-drop =====================
   720-templates DragAndDropQuestion "Ordered layout" + shared interaction rules: one card per slot;
   a drop on a filled slot evicts its card to the bank; a drop elsewhere returns it; a placed card
   stays draggable (to another slot or back) until the check; Check enables when all three slots are
   filled. Two attempts (default): retry -> each slot ✓ / ✕ until its content changes, the board stays
   interactive (no locking), Retry gate on the slots' VALUES; final wrong -> the solution at once +
   the View My Answer Toggle. Hint = slide 41's box, after the first mistake (note).
   Keyboard: a card (Enter/Space) is picked, then a slot (Enter/Space) receives it; a placed card is
   picked up by Enter/Space on it; Escape drops the pick. correctMap = slot -> card (PPTX solved
   column x 660: 1 / 2 / 3). */
const S2Q = { correctMap: { 's2-t-1': 's2-d-prop', 's2-t-2': 's2-d-tank', 's2-t-3': 's2-d-use' }, maxAttempts: 2 };
const S2_LABEL = {
  's2-d-prop': 'الغاز قابل للانضغاط - يمكن ضغطه إلى حجم أصغر',
  's2-d-tank': 'يمكن ضغط الغاز في أسطوانة صغيرة يمكن حملها على الظهر',
  's2-d-use': 'يستطيع رجل الإطفاء التنفّس لفترة طويلة بمساعدة أسطوانة غاز، حتى في مكان لا يوجد فيه هواء نقي'
};
const S2_SLOT_NAME = { 's2-t-1': '1', 's2-t-2': '2', 's2-t-3': '3' };
const S2_EXPLAIN = ['يبدأ الشرح بخاصية الغاز وينتهي باستخدامها: يمكن ضغط الغاز، ولذلك يمكن تخزين كمية كبيرة من الهواء في أسطوانة صغيرة. وبذلك يستطيع رجل الإطفاء أن يحمل الأسطوانة على ظهره ويتنفّس لفترة طويلة حتى داخل مبنى مملوء بالدخان.'];
const S2_FEEDBACK = {
  retry:         { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مجددًا؟'] },
  retryPartial:  { title: 'الإجابة ليست صحيحة بالكامل.', body: ['هل نحاول مجددًا؟'] },
  correct:       { title: 'ممتاز!', body: S2_EXPLAIN },
  wrong2:        wrong2Config('الإجابة غير صحيحة.', MULTI_SOLUTION_LINE, S2_EXPLAIN),
  wrong2Partial: wrong2Config('الإجابة ليست صحيحة بالكامل', MULTI_SOLUTION_LINE, S2_EXPLAIN)   // the slide's box, verbatim (no period)
};
const s2Place = { 's2-d-prop': 'source', 's2-d-tank': 'source', 's2-d-use': 'source' };
let s2Attempts = 0, s2Done = false, s2Outcome = null, s2LastWrong = null;
let s2Marks = null, s2Judged = null, s2Answer = null, s2View = 'solution', s2RetryPartial = false;
let s2Pick = null, s2Dnd = null, s2SkipClick = false;
const s2Targets = () => Object.keys(S2Q.correctMap);
const s2Cards = () => Object.keys(S2_LABEL);
const s2In = (t, placement) => Object.keys(placement || s2Place).find(d => (placement || s2Place)[d] === t) || null;
/* Retry gate signature: the value each slot holds, in slot order. */
const s2Sig = () => JSON.stringify(s2Targets().map(t => { const d = s2In(t); return d ? S2_LABEL[d] : null; }));
function s2MarksFor(placement) {
  const m = {};
  s2Targets().forEach(t => { const d = s2In(t, placement); m[t] = d === S2Q.correctMap[t] ? 'correct' : 'wrong'; });
  return m;
}
const s2AnyRight = placement => Object.values(s2MarksFor(placement)).some(v => v === 'correct');
/* A slot's mark is shown while its content is the judged one (cleared as soon as it changes). */
function s2MarkOf(t) {
  if (!s2Marks) return null;
  if (s2Done) return s2Marks[t] || null;
  return (s2Judged && s2In(t) === s2Judged[t]) ? s2Marks[t] : null;
}
function s2Announce(msg) { const l = document.getElementById('s2-live'); if (l) l.textContent = msg; }
function s2Render() {
  s2Cards().forEach(d => {
    const card = document.getElementById(d), placed = s2Place[d] !== 'source';
    card.classList.toggle('is-placed', placed);
    card.classList.remove('dragging');
    card.classList.toggle('is-selected', s2Pick === d && !placed);
    card.setAttribute('aria-pressed', s2Pick === d ? 'true' : 'false');
    card.disabled = placed || s2Done;
  });
  s2Targets().forEach(t => {
    const zone = document.getElementById(t), d = s2In(t), mark = s2MarkOf(t);
    zone.innerHTML = '';
    zone.classList.toggle('occupied', !!d && !mark);
    zone.classList.toggle('correct', mark === 'correct');
    zone.classList.toggle('wrong', mark === 'wrong');
    zone.classList.toggle('locked', s2Done);
    if (d) {
      if (mark) { const m = document.createElement('span'); m.className = 'ddqp-mark'; m.setAttribute('aria-hidden', 'true'); zone.appendChild(m); }
      const el = document.createElement('span');
      el.className = 'ord-placed';
      el.classList.toggle('is-selected', s2Pick === d);
      el.textContent = S2_LABEL[d];
      if (!s2Done) {
        el.tabIndex = 0; el.setAttribute('role', 'button');
        el.setAttribute('aria-label', S2_LABEL[d] + ' (في المرحلة ' + S2_SLOT_NAME[t] + ')');
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); s2PlacedPress(d); } });
        if (s2Dnd) s2Dnd.attachSource(el, d);
      }
      zone.appendChild(el);
    }
    zone.setAttribute('aria-label', S2_SLOT_NAME[t] + ': ' + (d ? S2_LABEL[d] : 'فارغة') + (mark === 'correct' ? '، صحيح' : mark === 'wrong' ? '، غير صحيح' : ''));
    zone.tabIndex = s2Done ? -1 : 0;
    if (s2Done) zone.removeAttribute('role'); else zone.setAttribute('role', 'button');
  });
  s2UpdateCheck();
}
function s2UpdateCheck() {
  const btn = document.getElementById('s2-check');
  if (s2Done) { btn.disabled = false; return; }
  const full = s2Targets().every(t => s2In(t));
  btn.disabled = !full || s2Sig() === s2LastWrong;
}
function s2StartEdit() { dismissRetryPopup('s2-popup', s2Done); }
function s2PlaceCard(d, t) {
  const evicted = s2In(t);
  if (evicted && evicted !== d) s2Place[evicted] = 'source';
  s2Place[d] = t;
  s2Pick = null;
  s2Render();
  s2Announce(S2_LABEL[d] + ' — وُضعت في المرحلة ' + S2_SLOT_NAME[t]);
}
function s2InitDnd() {
  if (s2Dnd) return;
  s2Dnd = createPointerDnd({
    canDrag: () => !s2Done,
    onPick: d => { s2StartEdit(); s2Pick = null; s2Place[d] = 'source'; s2Render(); document.getElementById(d).classList.add('dragging'); },
    onDrop: (d, t) => { s2SkipClick = true; s2PlaceCard(d, t); },
    onCancel: () => { s2SkipClick = true; s2Render(); },
    onTap: (d, src) => { s2SkipClick = true; if (src.classList.contains('ord-placed')) s2PlacedPress(d); else s2CardPress(d); }
  });
  s2Cards().forEach(d => s2Dnd.attachSource(document.getElementById(d), d));
  s2Targets().forEach(t => {
    const zone = document.getElementById(t);
    s2Dnd.attachTarget(zone, t);
    zone.addEventListener('click', e => { if (s2SkipClick) { s2SkipClick = false; return; } if (e.target.closest('.ord-placed')) return; s2ZonePress(t); });
    zone.addEventListener('keydown', e => { if (e.target !== zone) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s2ZonePress(t); } });
  });
  s2Cards().forEach(d => document.getElementById(d).addEventListener('click', e => { if (e.detail === 0) s2CardPress(d); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && currentScreen === 2 && s2Pick) { s2Pick = null; s2Render(); } });
  document.addEventListener('pointerdown', () => { s2SkipClick = false; }, true);
}
function s2CardPress(d) {
  if (s2Done || s2Place[d] !== 'source') return;
  s2StartEdit();
  s2Pick = (s2Pick === d) ? null : d;
  s2Render();
  if (s2Pick) s2Announce('تم اختيار الجملة: ' + S2_LABEL[d] + '. اختاروا مرحلة لوضعها فيها.');
}
/* A placed card picked up: it stays in its slot until it lands elsewhere (or Escape). */
function s2PlacedPress(d) {
  if (s2Done) return;
  s2StartEdit();
  s2Pick = (s2Pick === d) ? null : d;
  s2Render();
  if (s2Pick) { s2Announce('تم اختيار الجملة: ' + S2_LABEL[d] + '. اختاروا مرحلة أخرى لنقلها إليها.'); const z = document.getElementById(s2Place[d]); if (z) z.focus(); }
}
function s2ZonePress(t) {
  if (s2Done) return;
  if (!s2Pick) {   // an occupied slot pressed with nothing picked: pick its card
    const d = s2In(t);
    if (d) s2PlacedPress(d);
    return;
  }
  s2StartEdit();
  const d = s2Pick;
  if (s2Place[d] === t) { s2Pick = null; s2Render(); return; }
  s2PlaceCard(d, t);
}
function s2Primary() {
  if (s2Done) { advanceScreen(); return; }
  s2Check();
}
function s2Check() {
  if (s2Done || !s2Targets().every(t => s2In(t)) || s2Sig() === s2LastWrong) return;
  s2Pick = null;
  s2Attempts++;
  const marks = s2MarksFor(s2Place);
  if (Object.values(marks).every(v => v === 'correct')) { s2Marks = marks; s2Finish('correct'); return; }
  if (s2Attempts >= S2Q.maxAttempts) {
    s2Answer = Object.assign({}, s2Place);
    s2View = 'solution';
    s2Finish('wrong2');
    return;
  }
  s2LastWrong = s2Sig();
  s2Marks = marks;
  s2Judged = {};
  s2Targets().forEach(t => { s2Judged[t] = s2In(t); });
  s2RetryPartial = s2AnyRight(s2Place);
  s2Render();
  s2ShowPopup('retry');
  const h = document.getElementById('s2-hint'); if (h) h.style.visibility = 'visible';
}
function s2Finish(outcome) {
  s2Done = true; s2Outcome = outcome;
  closeHintOverlay(document.getElementById('s2-hint-overlay'));
  const h = document.getElementById('s2-hint'); if (h) h.hidden = true;
  setNavLabel(document.getElementById('s2-check'), 'متابعة');
  syncPracticeProgressNav(document.getElementById('s2'));
  if (outcome === 'wrong2') { s2ApplyView(); return; }
  s2Render();
  s2ShowPopup(outcome);
}
function s2SetSolution() { Object.keys(s2Place).forEach(d => { s2Place[d] = 'source'; }); s2Targets().forEach(t => { s2Place[S2Q.correctMap[t]] = t; }); }
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
  const h = document.getElementById('s2-hint');
  if (h) { h.hidden = s2Done; h.style.visibility = (!s2Done && s2Attempts > 0) ? 'visible' : 'hidden'; }
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

/* ===================== S5 (index 5) — slide 44 — two-group sort (LOCAL VARIANT) =====================
   Ported from part 01 S9 (slide 14): boxes that hold several chips in drop order; Check enables when
   all four chips are in a box; one attempt (Noa 2026-11-03). The existing retry branch remains
   inactive with maxAttempts: 1; final wrong -> solution + View My Answer Toggle.
   Hint = slide 44's box, available from the start (Noa 2026-11-03).
   Feedback = slide 44's boxes: correct "נכון מאוד!"; final wrong partly right = the authored
   "התשובה אינה נכונה במלואה" (verbatim), nothing right = the regular title; both + the solution line.
   The final-wrong body is authored identical to the correct one, INCLUDING "לכן המיון שבחרתם מתאים."
   - kept as authored and flagged (Q-09; precedent Q-24 in part 01 S9), never rewritten here. */
const S5Q = {
  accept: {
    's5-b-sci':  ['s5-d-compress', 's5-d-fill'],
    's5-b-tech': ['s5-d-airbag', 's5-d-tank']
  },
  maxAttempts: 1
};
const S5_LABEL = {
  's5-d-compress': 'إلى أيّ مدى ينضغط الهواء مقارنةً بالماء تحت الضغط نفسه؟',
  's5-d-airbag': 'كيف نصمّم وسادة هوائية تنفتح بسرعة وبأمان؟',
  's5-d-fill': 'لماذا يملأ الغاز كامل حجم الوعاء بينما لا يفعل السائل ذلك؟',
  's5-d-tank': 'كيف نبني أسطوانة غوص أخفّ وزنًا تتّسع للكمية نفسها من الهواء؟'
};
const S5_BIN_NAME = { 's5-b-sci': 'سؤال علمي', 's5-b-tech': 'هدف تكنولوجي' };
const S5_EXPLAIN = ['السؤال العلمي يهدف إلى البحث في ظاهرة وفهمها، أما الهدف التكنولوجي فيهدف إلى تطوير حل لحاجة معيّنة. لذلك فإن التصنيف الذي اخترتموه مناسب.'];
const S5_WRONG_BODY = ['السؤال العلمي يهدف إلى البحث في ظاهرة وفهمها، أما الهدف التكنولوجي فيهدف إلى تطوير حل لحاجة معينة.'];
const S5_FEEDBACK = {
  retry:         { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مجددًا؟'] },
  retryPartial:  { title: 'الإجابة ليست صحيحة بالكامل.', body: ['هل نحاول مجددًا؟'] },
  correct:       { title: 'صحيح جدًا!', body: S5_EXPLAIN },
  wrong2:        wrong2Config('الإجابة غير صحيحة.', MULTI_SOLUTION_LINE, S5_WRONG_BODY),
  wrong2Partial: wrong2Config('الإجابة ليست صحيحة بالكامل', MULTI_SOLUTION_LINE, S5_WRONG_BODY)
};
const s5Place = {};
Object.keys(S5_LABEL).forEach(d => { s5Place[d] = 'source'; });
const s5Order = { 's5-b-sci': [], 's5-b-tech': [] };
let s5Attempts = 0, s5Done = false, s5Outcome = null, s5LastWrong = null, s5RetryPartial = false;
let s5Marks = null, s5Judged = null, s5Answer = null, s5View = 'solution';
let s5Pick = null, s5Dnd = null, s5SkipClick = false;
const s5Bins = () => Object.keys(S5Q.accept);
const s5Chips = () => Object.keys(S5_LABEL);
const s5Snap = () => JSON.stringify(s5Place);
function s5Announce(msg) { const l = document.getElementById('s5-live'); if (l) l.textContent = msg; }
function s5MarkOf(d) {
  if (!s5Marks) return null;
  if (s5Done) return s5Marks[d] || null;
  return (s5Judged && s5Place[d] === s5Judged[d]) ? s5Marks[d] : null;
}
function s5SetPlace(d, where) {
  const from = s5Place[d];
  if (from !== 'source') { const i = s5Order[from].indexOf(d); if (i >= 0) s5Order[from].splice(i, 1); }
  s5Place[d] = where;
  if (where !== 'source' && !s5Order[where].includes(d)) s5Order[where].push(d);
}
function s5MarksFor(placement) {
  const m = {};
  s5Chips().forEach(d => { const b = placement[d]; m[d] = (b !== 'source' && S5Q.accept[b].includes(d)) ? 'correct' : 'wrong'; });
  return m;
}
const s5AnyRight = placement => Object.values(s5MarksFor(placement)).some(v => v === 'correct');
function s5Render() {
  s5Chips().forEach(d => {
    const chip = document.getElementById(d), placed = s5Place[d] !== 'source';
    chip.classList.toggle('is-placed', placed);
    chip.classList.remove('dragging');
    chip.classList.toggle('is-selected', s5Pick === d);
    chip.setAttribute('aria-pressed', s5Pick === d ? 'true' : 'false');
    chip.disabled = placed || s5Done;
  });
  s5Bins().forEach(b => {
    const bin = document.getElementById(b), box = bin.querySelector('.ddc-bin__cards');
    box.innerHTML = '';
    const chips = s5Order[b].filter(d => s5Place[d] === b);
    bin.dataset.count = String(chips.length);
    bin.classList.toggle('occupied', chips.length > 0);
    chips.forEach(d => {
      const mark = s5MarkOf(d);
      const el = document.createElement('span');
      el.className = 'ddqp-chip ddc-chip ddc-chip--placed';
      el.classList.toggle('correct', mark === 'correct');
      el.classList.toggle('wrong', mark === 'wrong');
      el.classList.toggle('locked', s5Done);
      if (mark) { const m = document.createElement('span'); m.className = 'ddqp-mark'; m.setAttribute('aria-hidden', 'true'); el.appendChild(m); }
      el.appendChild(document.createTextNode(S5_LABEL[d]));
      el.setAttribute('aria-label', S5_LABEL[d] + (mark === 'correct' ? '، صحيح' : mark === 'wrong' ? '، غير صحيح' : ''));
      if (!s5Done) { el.tabIndex = 0; el.setAttribute('role', 'button'); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); s5PlacedPress(d); } }); if (s5Dnd) s5Dnd.attachSource(el, d); }
      box.appendChild(el);
    });
    bin.setAttribute('aria-label', S5_BIN_NAME[b] + ': ' + (chips.length ? chips.map(d => S5_LABEL[d]).join('، ') : 'لا توجد عبارات'));
    bin.tabIndex = s5Done && bin.scrollHeight <= bin.clientHeight ? -1 : 0;
    if (s5Done) bin.removeAttribute('role'); else bin.setAttribute('role', 'button');
  });
  s5UpdateCheck();
}
function s5UpdateCheck() {
  const btn = document.getElementById('s5-check');
  if (s5Done) { btn.disabled = false; return; }
  const full = s5Chips().every(d => s5Place[d] !== 'source');
  btn.disabled = !full || s5Snap() === s5LastWrong;
}
function s5StartEdit() { dismissRetryPopup('s5-popup', s5Done); }
/* Local variant approved by Noa 2026-11-03: one attempt, all four statements may be
   placed in either group; the hint is available before submitting. */
function s5PlaceChip(d, b) {
  s5SetPlace(d, b);
  s5Pick = null;
  s5Render();
  const bin = document.getElementById(b);
  bin.scrollTop = bin.scrollHeight;
  s5Announce(S5_LABEL[d] + ' — وُضعت في المجموعة ' + S5_BIN_NAME[b]);
}
function s5InitDnd() {
  if (s5Dnd) return;
  s5Dnd = createPointerDnd({
    canDrag: () => !s5Done,
    onPick: d => { s5StartEdit(); s5Pick = null; s5SetPlace(d, 'source'); s5Render(); document.getElementById(d).classList.add('dragging'); },
    onDrop: (d, b) => { s5SkipClick = true; s5PlaceChip(d, b); },
    onCancel: () => { s5SkipClick = true; s5Render(); },
    onTap: (d, src) => { s5SkipClick = true; if (src.classList.contains('ddc-chip--placed')) s5PlacedPress(d); else s5ChipPress(d); }
  });
  s5Chips().forEach(d => s5Dnd.attachSource(document.getElementById(d), d));
  s5Bins().forEach(b => {
    const bin = document.getElementById(b);
    s5Dnd.attachTarget(bin, b);
    bin.addEventListener('click', e => { if (s5SkipClick) { s5SkipClick = false; return; } if (e.target.closest('.ddc-chip--placed')) return; s5BinPress(b); });
    bin.addEventListener('keydown', e => { if (e.target !== bin) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s5BinPress(b); } });
  });
  s5Chips().forEach(d => document.getElementById(d).addEventListener('click', e => { if (e.detail === 0) s5ChipPress(d); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && currentScreen === 5 && s5Pick) { s5Pick = null; s5Render(); } });
  document.addEventListener('pointerdown', () => { s5SkipClick = false; }, true);
}
function s5ChipPress(d) {
  if (s5Done || s5Place[d] !== 'source') return;
  s5StartEdit();
  s5Pick = (s5Pick === d) ? null : d;
  s5Render();
  if (s5Pick) s5Announce('تم اختيار العبارة: ' + S5_LABEL[d] + '— اختاروا مجموعة لوضعها فيها.');
}
function s5PlacedPress(d) {
  if (s5Done) return;
  s5StartEdit();
  s5SetPlace(d, 'source'); s5Pick = d;
  s5Render();
  const chip = document.getElementById(d); if (chip) chip.focus();
  s5Announce('تم اختيار العبارة: ' + S5_LABEL[d] + '— اختاروا مجموعة لوضعها فيها.');
}
function s5BinPress(b) {
  if (s5Done || !s5Pick) return;
  s5StartEdit();
  s5PlaceChip(s5Pick, b);
}
function s5Primary() {
  if (s5Done) { advanceScreen(); return; }
  s5Check();
}
function s5Check() {
  if (s5Done || !s5Chips().every(d => s5Place[d] !== 'source') || s5Snap() === s5LastWrong) return;
  s5Pick = null;
  s5Attempts++;
  const marks = s5MarksFor(s5Place);
  if (Object.values(marks).every(v => v === 'correct')) { s5Marks = marks; s5Finish('correct'); return; }
  if (s5Attempts >= S5Q.maxAttempts) {
    s5Answer = Object.assign({}, s5Place);
    s5View = 'solution';
    s5Finish('wrong2');
    return;
  }
  s5LastWrong = s5Snap();
  s5Marks = marks;
  s5Judged = Object.assign({}, s5Place);
  s5RetryPartial = s5AnyRight(s5Place);
  s5Render();
  s5ShowPopup('retry');
  const h = document.getElementById('s5-hint'); if (h) h.style.visibility = 'visible';
}
function s5Finish(outcome) {
  s5Done = true; s5Outcome = outcome;
  closeHintOverlay(document.getElementById('s5-hint-overlay'));
  const h = document.getElementById('s5-hint'); if (h) h.hidden = true;
  setNavLabel(document.getElementById('s5-check'), 'متابعة');
  syncPracticeProgressNav(document.getElementById('s5'));
  if (outcome === 'wrong2') { s5ApplyView(); return; }
  s5Render();
  s5ShowPopup(outcome);
}
function s5SetBoard(placement) {
  s5Chips().forEach(d => { s5Place[d] = 'source'; });
  s5Bins().forEach(b => { s5Order[b] = []; });
  s5Chips().forEach(d => { if (placement[d] !== 'source') s5SetPlace(d, placement[d]); });
}
function s5Solution() { const p = {}; s5Bins().forEach(b => S5Q.accept[b].forEach(d => { p[d] = b; })); return p; }
function s5ApplyView() {
  if (s5Answer === null) return;
  if (s5View === 'answer') { s5SetBoard(s5Answer); s5Marks = s5MarksFor(s5Answer); }
  else { s5SetBoard(s5Solution()); s5Marks = s5MarksFor(s5Place); }
  s5Render();
  s5ShowPopup('wrong2', s5View);
}
function s5ToggleView() {
  if (s5Answer === null) return;
  s5View = (s5View === 'solution') ? 'answer' : 'solution';
  s5ApplyView();
}
function s5ShowPopup(type, view) {
  const partial = type === 'retry' ? s5RetryPartial : type === 'wrong2' ? s5AnyRight(s5Answer || s5Place) : false;
  const base = S5_FEEDBACK[partial ? type + 'Partial' : type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;
  showFeedback('s5-popup', type, cfg, base, s5ToggleView);
}
function s5Enter() {
  s5InitDnd();
  document.getElementById('s5-popup').classList.add('hidden');
  syncPracticeProgressNav(document.getElementById('s5'));
  const h = document.getElementById('s5-hint');
  if (h) { h.hidden = s5Done; h.style.visibility = !s5Done ? 'visible' : 'hidden'; }
  if (s5Done) {
    if (s5Answer !== null) { s5View = 'solution'; s5SetBoard(s5Solution()); s5Marks = s5MarksFor(s5Place); }
    setNavLabel(document.getElementById('s5-check'), 'متابعة');
    s5Render();
    return;
  }
  s5Pick = null;
  setNavLabel(document.getElementById('s5-check'), 'هل إجابتي صحيحة؟');
  s5Render();
}
function s5OpenHint() { if (!s5Done) openHintOverlay('s5-hint-overlay', document.getElementById('s5-hint')); }
function s5CloseHint() { closeHintOverlay(document.getElementById('s5-hint-overlay')); }
function s5CloseHintOnBackdrop(e) { if (!e.target.closest('.hint-card')) s5CloseHint(); }

/* ===================== S8 / S9 — illustrative clips (Play-only) =====================
   figma-lomda-builder "Non-negotiable video rules", role B: the slide plays the clip on click, so the
   only control is a play button over the poster frame; the clip plays once from the start (no loop,
   no native controls / fullscreen / speed / PiP / download); when it ends the play button returns
   (replay from 0). Leaving the screen pauses it (goTo) and re-entry shows the poster again. */
function playClip(id) {
  const v = document.getElementById(id + '-video'), wrap = document.getElementById(id + '-clip');
  if (!v || !wrap) return;
  v.currentTime = 0;
  wrap.classList.add('is-playing');
  const p = v.play();
  if (p && p.catch) p.catch(() => wrap.classList.remove('is-playing'));
}
function clipEnter(id) {
  const v = document.getElementById(id + '-video'), wrap = document.getElementById(id + '-clip');
  if (!v || !wrap) return;
  /* Back to the poster frame. A seek to 0 would replace the poster with the clip's (dark) first
     frame, so a clip that has been played is reloaded instead; an unplayed one is left alone. */
  if (!v.paused || v.currentTime > 0 || v.ended) { v.pause(); v.load(); }
  wrap.classList.remove('is-playing');
  const b = wrap.querySelector('.twc-video__play'); if (b) b.setAttribute('aria-label', 'تشغيل الفيديو');
}
['s8', 's9'].forEach(id => {
  const v = document.getElementById(id + '-video');
  if (!v) return;
  v.addEventListener('ended', () => {
    const wrap = document.getElementById(id + '-clip');
    wrap.classList.remove('is-playing');
    const b = wrap.querySelector('.twc-video__play'); if (b) b.setAttribute('aria-label', 'إعادة تشغيل الفيديو');
  });
  v.addEventListener('pause', () => { if (!v.ended) document.getElementById(id + '-clip').classList.remove('is-playing'); });
});

/* ===================== Boot — as part 02 ===================== */
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
