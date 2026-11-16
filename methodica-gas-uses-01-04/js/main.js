/* methodica-gas-uses-01-04 — js/main.js
   Engine + per-screen logic. Part 04 = component 04 of the script (slides 35-37):
   משימת כיתה (class task) — a hands-on task outside the computer. No questions, no scored
   items, no gate (720-templates _learning-journey.md, slot 4).
   Engine blocks (canvas, goTo / advanceScreen, cross-part route stack, image zoom, nav
   labels, dev bridge) are copied from methodica-gas-uses-01-01/js/main.js; the copied
   blocks are marked. Slide 35 (component divider) is structure only, not a screen (as
   slide 2 in part 01 and slide 19 in part 02 - Q-01).
   Screens: S0 (slide 36) TransitionScreen B · S1 (slide 37) TextWithCallout media=image. */
'use strict';

const TOTAL_SCREENS = 2;   // slides 36-37 (docs/component-04.md)
let currentScreen = 0;

/* ===================== Unit / journey constants =====================
   _learning-journey.md 2: משימת כיתה has no scored items and continues unconditionally to
   the next main-path role that exists in this lomda = תרגול מתקדם (part 05, slides 38-48 -
   divider slide 38 "רכיב 5: בואו נאתגר את עצמנו"). It is never a decision point, so nothing
   is recorded on the way out (unlike part 02's ROUTE_KEY).
   Entry: from part 02 when standard A passes (ROUTE.pass in part 02) and from part 03 when
   standard B passes - two predecessors, so Back resolves the actual one from the route
   stack (_global-components "Back navigation in a branched journey"). */
const LOMDA_ID = 'methodica-gas-uses-01';
const PART_ID = 'methodica-gas-uses-01-04';
const NEXT_PART_ID = 'methodica-gas-uses-01-05';
/* Part 05 exists (integration session, Noa approved 2026-10-20). Convention of parts 01-02:
   flip back to false if part 05 is withdrawn, and the last screen's Continue stays inert. */
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

/* ===================== Cross-part Back (session-scoped route stack) — as part 01 =====================
   Same key and shape as parts 01-02: every forward hop pushes the part being left; S0's
   Back pops it and lands on that part's last screen (#last) - part 02 (S5) or part 03,
   whichever this learner actually came from. Opened directly in a fresh session the stack
   is empty and S0's Back stays hidden. */
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

/* ===================== Reporting seam =====================
   A class task has no scored items (_learning-journey.md 4), so there is no SCREEN_RESULT
   entry and no bundle score. The 720 reporting layer (added after QA) sends `completed`
   when the learner leaves S1 forward - goToNextPart() is that single exit. */
const SCREEN_RESULT = {};
window.lomdaState.classTask = { scored: false, exit: NEXT_PART_ID };

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

/* ===================== Navigation — as part 01 (no popups / hints in this part) ===================== */
function goTo(n) {
  if (n < 0 || n >= TOTAL_SCREENS) return;
  closeImgZoom();
  const prev = document.querySelector('.screen.active');
  if (prev) { Motion.cancel(prev); prev.querySelectorAll('video').forEach(v => v.pause()); }
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const next = document.querySelector('.screen[data-screen="' + n + '"]');
  if (next) { next.classList.add('active'); Motion.reveal(next); }
  currentScreen = n;
  resetScreenState(n);
}

function goBack() {
  if (currentScreen === 0) { goToPrevPart(); return; }
  goTo(currentScreen - 1);
}

/* Neither screen has a gate: TransitionScreen's Continue is always enabled, and the class
   task's text screen has nothing to resolve (the task is done in the notebook). */
function advanceScreen() {
  if (currentScreen === TOTAL_SCREENS - 1) { goToNextPart(); return; }   // end of the part
  goTo(currentScreen + 1);
}

/* Arrow keys navigate — but never while the learner is typing. */
document.addEventListener('keydown', (e) => {
  const t = e.target;
  if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.isContentEditable || (t.closest && t.closest('.report-modal-overlay')))) return;
  if (!document.getElementById('img-zoom-modal').classList.contains('hidden')) return;   // zoom open: keys stay in the dialog
  if (e.key === 'ArrowLeft') advanceScreen();
  if (e.key === 'ArrowRight') goBack();
});

/* S0 companion clip (looking): same treatment as part 01 S11 (Noa 2026-10-25). */
function s0Enter() {
  const v = document.getElementById('s0-video');
  if (!v) return;
  v.pause();
  v.currentTime = 0;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const p = v.play();
  if (p && p.catch) p.catch(() => {});
}

/* No screen keeps learner state; re-entry re-syncs S0's Back and restarts its clip. */
function resetScreenState(n) {
  if (n === 0) { syncS0Back(); s0Enter(); }
}

/* ===================== Image zoom (global) — copied from part 01 ===================== */
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

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeImgZoom(); });

/* ===================== Nav labels — copied from part 01 ===================== */
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
