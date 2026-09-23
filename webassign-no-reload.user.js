// ==UserScript==
// @name         WebAssign No-Reload Submit
// @namespace    wakmail.webassign
// @version      2.2
// @description  Per-question Submit/Save without reloading. Patches only the changed parts (marks, score, attempts).
// @match        https://www.webassign.net/web/Student/Assignment-Responses/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

// ================= SETTINGS =================
// ENTER_TO_SUBMIT: pressing Enter in an answer box submits that question
// (same as clicking its "Submit Answer" button). Shift+Enter still types a new line.
// true = on, false = off
const ENTER_TO_SUBMIT = true;

// AUTOFOCUS_NEXT: after you submit from an answer box, if that answer comes back
// correct, the cursor jumps to the next empty answer box on the page.
// If it's wrong, the cursor stays put so you can fix it.
// Only affects typed boxes (numbers/text), not the MathType editor or multiple choice.
// true = on, false = off
const AUTOFOCUS_NEXT = false;

// SCROLL_BACK: backup for anything that still does a full reload (tutorial steps,
// Submit Assignment, or the script's safety fallback). Remembers where the question
// was on screen and jumps straight back to it after the reload, no slow scrolling.
// true = on, false = off
const SCROLL_BACK = true;

// NO_RELOAD_TUTORIALS: tutorial questions ("Click here to begin", step answers) also
// update without a reload. Tutorials change a lot per step, so the script swaps in the
// whole question instead of just the marks. If a tutorial acts weird, set to false:
// tutorials then reload normally (SCROLL_BACK still keeps your place).
// true = on, false = off
const NO_RELOAD_TUTORIALS = true;

// PAD_SEARCH: adds a search box to the Math Pad header. Type a name (pi, sqrt, theta,
// ohm, hbar...), then click a result or press Enter to insert it. Searches every tab
// (Operations, Relations, Other, Trig, Greek, Vectors) at once. Arrow keys move, Esc clears.
// true = on, false = off
const PAD_SEARCH = true;
// ============================================

(function () {
  'use strict';

  const QID = /^question\d+_\d+$/;
  const HANDLED = new Set(['submit', 'save']); // per-question buttons. SubmitAll is left alone.
  const formGet = (f, p) => Object.getOwnPropertyDescriptor(HTMLFormElement.prototype, p).get.call(f);

  let lastBtn = null;
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('input[type=submit], button');
    if (b) lastBtn = b;
  }, true);

  const isTutorial = (q) => !!q.querySelector('[name^=step_button], [id^=step_button]');

  const questionOf = (el) => {
    for (let p = el; p; p = p.parentElement) if (p.id && QID.test(p.id)) return p;
    return null;
  };

  // ---------- Scroll back after a real reload ----------
  const SCROLL_KEY = '__wa_scroll_back';
  function saveScroll(q) {
    if (!SCROLL_BACK) return;
    try {
      sessionStorage.setItem(SCROLL_KEY, JSON.stringify({
        id: q ? q.id : null,
        top: q ? q.getBoundingClientRect().top : 0, // where the question sat in the window
        y: window.scrollY,
        t: Date.now(),
      }));
    } catch (_) {}
  }
  if (SCROLL_BACK) {
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY)); sessionStorage.removeItem(SCROLL_KEY); } catch (_) {}
    if (saved && Date.now() - saved.t < 60000) {
      let userMoved = false;
      ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((ev) =>
        window.addEventListener(ev, () => (userMoved = true), { once: true, capture: true }));
      const go = () => {
        if (userMoved) return;
        const el = saved.id && document.getElementById(saved.id);
        const y = el ? el.getBoundingClientRect().top + window.scrollY - saved.top : saved.y;
        window.scrollTo({ top: y, behavior: 'instant' });
      };
      // WebAssign does its own slow scroll after load, so re-apply a few times to win
      go();
      window.addEventListener('load', go);
      [200, 600, 1200].forEach((ms) => setTimeout(go, ms));
    }
  }

  // ---------- Autofocus next ----------
  const TEXT_BOX = 'input[type=text], input:not([type]), textarea';
  let lastBox = null;
  document.addEventListener('focusin', (e) => {
    if (e.target.matches && e.target.matches(TEXT_BOX) && questionOf(e.target)) lastBox = e.target;
  }, true);

  function usable(el) {
    return el.offsetParent !== null && !el.disabled && !el.readOnly && questionOf(el);
  }

  function afterPatch(qEl) {
    if (!AUTOFOCUS_NEXT) return;
    const box = lastBox;
    if (!box || !document.contains(box) || questionOf(box) !== qEl) return;

    // The blank's container is wherever its mark span lives
    const blank = box.closest('.blank, .input-group') || box.parentElement;
    const correct = !!(blank && blank.querySelector('.waMark.mCorrect'));
    if (!correct) { box.focus(); return; }

    const all = [...document.querySelectorAll(TEXT_BOX)].filter(usable);
    const next = all.slice(all.indexOf(box) + 1).find((el) => !el.value.trim());
    if (next) {
      next.focus();
      next.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  }

  // ---------- Enter to submit ----------
  if (ENTER_TO_SUBMIT) {
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      const t = e.target;
      const typing = t.matches && (t.matches('input[type=text], input:not([type]), textarea') || t.isContentEditable);
      if (!typing) return;
      const q = questionOf(t);
      const btn = q && q.querySelector('input[type=submit][name=submit]');
      if (!btn || btn.disabled) return;
      e.preventDefault();
      e.stopPropagation();
      btn.click(); // goes through WebAssign's normal flow, then the no-reload hook
    }, true);
  }

  // ---------- Math Pad search ----------
  // Extra search words -> text that appears in the pad button's tooltip
  const PAD_ALIASES = {
    sqrt: 'square root', root: 'root', abs: 'vertical bars', absolute: 'vertical bars',
    power: 'superscript', exponent: 'superscript', '^': 'superscript', squared: 'superscript',
    sub: 'subscript', '_': 'subscript', frac: 'fraction', divide: 'fraction', over: 'fraction', '/': 'fraction',
    ln: 'natural logarithm', log: 'logarithm', exp: 'exponential', e: 'exponential',
    inf: 'infinity', hbar: 'h bar', planck: 'h bar', emf: 'emf',
    '!=': 'not equal', '<=': 'less-than or equal', '>=': 'greater-than or equal',
    '<': 'less-than sign', '>': 'greater-than sign', '=': 'equals', '+': 'plus', '-': 'minus',
    x: 'multiplication', '*': 'multiplication', times: 'multiplication', cross: 'multiplication',
    dne: 'does not exist', none: 'no solution', parens: 'parentheses', '(': 'parentheses',
    brackets: 'square brackets', '[': 'square brackets', braces: 'curly brackets', '{': 'curly brackets',
    arrow: 'vector', hat: 'vector', mag: 'vertical bars', magnitude: 'vertical bars',
    ohm: 'omega', ohms: 'omega', micro: 'mu', wavelength: 'lambda', angle: 'theta',
  };

  function padSearchSetup(ov) {
    if (ov.querySelector('.wa-pad-search')) return;
    const header = ov.querySelector('.mathtype-overlay-header');
    const actions = ov.querySelector('.mathtype-overlay-actions');
    if (!header || !actions) return;

    const wrap = document.createElement('div');
    wrap.className = 'wa-pad-search';
    wrap.style.cssText = 'flex:1;margin:0 12px;position:relative;min-width:0;';
    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Search symbols (pi, sqrt, theta...)';
    input.style.cssText = 'width:100%;box-sizing:border-box;padding:5px 9px;border-radius:6px;border:1px solid rgba(255,255,255,.5);background:rgba(255,255,255,.95);color:#222;font:14px sans-serif;';
    const list = document.createElement('div');
    list.style.cssText = 'display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;max-height:260px;overflow:auto;background:#fff;border:1px solid #ccc;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,.2);z-index:99999;';
    wrap.append(input, list);
    header.insertBefore(wrap, actions);
    if (getComputedStyle(header).display !== 'flex') header.style.display = 'flex';
    header.style.alignItems = 'center';

    const tabs = () => [...ov.querySelectorAll('button.wrs_textTab')];
    const panels = () => [...ov.querySelectorAll('.wrs_panelContainer > *')];

    function allButtons() {
      const out = [];
      panels().forEach((p, i) => p.querySelectorAll('button.wrs_imageContainer').forEach((b) => {
        out.push({ b, tab: i, name: (b.title || b.getAttribute('aria-label') || '').replace(/\s*\(.*\)$/, '') });
      }));
      return out;
    }

    function matches(q) {
      q = q.trim().toLowerCase();
      if (!q) return [];
      const alias = Object.keys(PAD_ALIASES).filter((k) => k === q || (q.length > 1 && k.startsWith(q))).map((k) => PAD_ALIASES[k]);
      const scored = [];
      for (const it of allButtons()) {
        const n = it.name.toLowerCase();
        let s = -1;
        if (n === q) s = 0;
        else if (n.split(/\s+/).some((w) => w.startsWith(q))) s = 1;
        else if (n.includes(q)) s = 2;
        else if (alias.some((a) => n.includes(a))) s = 3;
        if (s >= 0) scored.push({ ...it, s });
      }
      return scored.sort((a, b) => a.s - b.s).slice(0, 12);
    }

    function press(it) {
      const t = tabs()[it.tab];
      if (t && !t.classList.contains('wrs_selected')) t.click();
      setTimeout(() => {
        for (const type of ['mousedown', 'mouseup', 'click']) {
          it.b.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
        }
        input.value = '';
        render();
        const fe = ov.querySelector('.wrs_focusElement');
        if (fe) fe.focus();
      }, 30);
    }

    let results = [];
    let sel = 0;
    function render() {
      results = matches(input.value);
      sel = 0;
      list.innerHTML = '';
      if (!results.length) {
        list.style.display = input.value.trim() ? 'block' : 'none';
        if (input.value.trim()) list.innerHTML = '<div style="padding:8px 10px;color:#777;font:13px sans-serif">Not on this pad</div>';
        return;
      }
      results.forEach((it, i) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:6px 10px;cursor:pointer;font:13px sans-serif;color:#222;';
        const img = it.b.querySelector('img');
        if (img) {
          const c = img.cloneNode();
          c.style.cssText = 'width:22px;height:22px;object-fit:contain;';
          row.append(c);
        }
        const tabName = tabs()[it.tab] ? tabs()[it.tab].textContent.trim() : '';
        row.append(document.createTextNode(it.name));
        const tag = document.createElement('span');
        tag.textContent = tabName;
        tag.style.cssText = 'margin-left:auto;color:#999;font-size:11px;';
        row.append(tag);
        row.addEventListener('mousedown', (e) => { e.preventDefault(); press(it); });
        row.addEventListener('mouseenter', () => { sel = i; paint(); });
        list.append(row);
      });
      list.style.display = 'block';
      paint();
    }
    function paint() {
      [...list.children].forEach((r, i) => (r.style.background = i === sel ? '#e8f0fb' : ''));
    }

    input.addEventListener('input', render);
    input.addEventListener('keydown', (e) => {
      e.stopPropagation(); // keep the pad editor from grabbing keys
      if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, results.length - 1); paint(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); paint(); e.preventDefault(); }
      else if (e.key === 'Enter') { if (results[sel]) press(results[sel]); e.preventDefault(); }
      else if (e.key === 'Escape') { input.value = ''; render(); e.preventDefault(); }
    });
    ['keyup', 'keypress'].forEach((t) => input.addEventListener(t, (e) => e.stopPropagation()));
    input.addEventListener('blur', () => setTimeout(() => (list.style.display = 'none'), 150));
    input.addEventListener('focus', render);
  }

  if (PAD_SEARCH) {
    const check = () => {
      const ov = document.getElementById('mathtype-overlay');
      if (ov) padSearchSetup(ov);
    };
    new MutationObserver(check).observe(document.body, { childList: true });
    check();
  }

  // ---------- patching ----------
  function copyAttrs(live, srv, filter) {
    if (!live || !srv) return;
    for (const n of srv.getAttributeNames()) if (!filter || filter(n)) live.setAttribute(n, srv.getAttribute(n));
  }

  function typeset(el) {
    try { if (window.MathJax && MathJax.Hub) MathJax.Hub.Queue(['Typeset', MathJax.Hub, el]); } catch (_) {}
  }

  function patchQuestion(live, srv) {
    // Header data-* (question state, ayt token)
    copyAttrs(live.querySelector('.js-question-header'), srv.querySelector('.js-question-header'), (n) => n.startsWith('data-'));

    // Score + attempts cells
    for (const sel of ['td.questionGrade', 'td.submissions']) {
      const L = live.querySelectorAll(sel), S = srv.querySelectorAll(sel);
      L.forEach((l, i) => {
        if (!S[i]) return;
        l.className = S[i].className;
        if (S[i].hasAttribute('title')) l.title = S[i].title;
        l.innerHTML = S[i].innerHTML;
      });
    }

    // Per-answer-box marks and hints. Answer inputs are never replaced.
    // Each answer blank (typed, multiple choice, etc.) has an <input id="..._settings">;
    // its parent holds the mark/hint spans. Match live vs server by that id.
    const MARKS = ':scope > span.padMark, :scope > span.waMark, :scope > span.correctHint';
    srv.querySelectorAll('input[id$=_settings]').forEach((ss) => {
      const sg = ss.parentElement;
      const ls = document.getElementById(ss.id);
      const lg = ls && ls.parentElement;
      if (!sg || !lg) return;

      lg.querySelectorAll(MARKS).forEach((n) => n.remove());
      const anchor = lg.querySelector(':scope > input.wa_question_box') || ls;
      sg.querySelectorAll(MARKS).forEach((n) => {
        const c = document.importNode(n, true);
        lg.insertBefore(c, anchor);
        typeset(c);
      });

      // hidden state inputs (enabled_ flag, settings): values only
      sg.querySelectorAll('input[type=hidden][id]').forEach((h) => {
        const l = document.getElementById(h.id);
        if (l && l.type === 'hidden') l.value = h.value;
      });
    });

    // Buttons back to the server's state (page may have disabled them while "submitting")
    live.querySelectorAll('input[type=submit], button').forEach((b) => {
      const s = b.id && srv.querySelector('#' + CSS.escape(b.id));
      if (!s) { b.disabled = false; return; }
      b.disabled = s.disabled;
      b.className = s.className;
      if (s.value) b.value = s.value;
    });
  }

  function rerunScripts(root) {
    root.querySelectorAll('script').forEach((old) => {
      if (old.type && !/javascript/i.test(old.type)) return; // leave MathJax/JSON blocks alone
      const s = document.createElement('script');
      [...old.attributes].forEach((a) => s.setAttribute(a.name, a.value));
      s.textContent = old.textContent;
      old.replaceWith(s);
    });
  }

  // Tutorials add whole new steps and answer boxes, so patching marks isn't enough.
  // Swap in the server's version of the question and rebuild WebAssign's question object for it.
  function replaceQuestion(liveQ, srvQ) {
    const oldQo = liveQ.retrieve && liveQ.retrieve('question');
    const a = oldQo && oldQo.assignment;
    const node = document.importNode(srvQ, true);
    liveQ.replaceWith(node);
    rerunScripts(node);
    if (a && a.createQuestion) {
      const nq = a.createQuestion(node, oldQo.options);
      const i = a.questions.indexOf(oldQo);
      if (i >= 0) a.questions[i] = nq;
      if (a.focusedQuestion === oldQo) a.focusedQuestion = nq;
      if (node.retrieve && !node.retrieve('question')) node.store('question', nq);
    }
    typeset(node);
  }

  function patchPage(doc, qId, full) {
    const srvQ = doc.getElementById(qId);
    const liveQ = document.getElementById(qId);
    if (!srvQ || !liveQ) return false;

    // WebAssign sets assignment._posted = true on any post and then blocks every
    // non-submit action (tutorials, Save Progress, etc.) until the page reloads.
    try {
      const qo = liveQ.retrieve && liveQ.retrieve('question');
      if (qo && qo.assignment) qo.assignment._posted = false;
    } catch (_) {}

    if (full) replaceQuestion(liveQ, srvQ);
    else patchQuestion(liveQ, srvQ);

    // WebAssign disables every submit button on the page while it "navigates". Undo that.
    document.querySelectorAll('input[type=submit][id], button[id]').forEach((b) => {
      const s = doc.getElementById(b.id);
      b.disabled = s ? s.disabled : false;
    });

    // Other questions: just keep header data-* in sync
    document.querySelectorAll('[id^=question]').forEach((q) => {
      if (q.id === qId || !QID.test(q.id)) return;
      const s = doc.getElementById(q.id);
      if (s) copyAttrs(q.querySelector('.js-question-header'), s.querySelector('.js-question-header'), (n) => n.startsWith('data-'));
    });

    // Page-level hidden state. #stamp is a submission counter: if it goes stale,
    // the server silently ignores the next submit. Also CSRFToken etc.
    document.querySelectorAll('input[type=hidden]').forEach((i) => {
      if (questionOf(i)) return;
      let s = null;
      if (i.id) s = doc.getElementById(i.id);
      if (!s && i.name) s = doc.querySelector(`input[type=hidden][name="${CSS.escape(i.name)}"]`);
      if (s && s.type === 'hidden') i.value = s.value;
    });
    return true;
  }

  // ---------- interception ----------
  // A GET url for the current page, so a fallback reload never re-POSTs
  function safeReload(res) {
    if (res && res.redirected && /\/last$/.test(new URL(res.url).pathname)) { location.href = res.url; return; }
    const u = new URL(location.href);
    u.pathname = u.pathname.replace(/\/(submit|tutorial)$/, '/last');
    location.href = u.toString();
  }

  async function ajaxSubmit(form, qEl, btn, full) {
    const action = formGet(form, 'action');
    const body = new FormData(form);
    // Don't remove the form: it's WebAssign's persistent #wa form, reused for every submit.
    if (btn) { btn.value = 'Submitting...'; btn.disabled = true; }

    let res;
    try {
      res = await fetch(action, { method: 'POST', body, credentials: 'include' });
    } catch (e) {
      alert('Network error, nothing was submitted. Try again.');
      if (btn) { btn.disabled = false; btn.value = 'Submit Answer'; }
      return;
    }
    // Server has it now. Never resend; on any problem, fall back to a plain reload (GET).
    try {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      if (!patchPage(doc, qEl.id, full)) throw new Error('question missing in response');
      if (!full) { try { afterPatch(qEl); } catch (_) {} }
      window.onbeforeunload = null;
    } catch (e) {
      console.warn('[no-reload] reloading:', e);
      saveScroll(document.getElementById(qEl.id) || qEl);
      safeReload(res);
    }
  }

  const nativeSubmit = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = function () {
    try {
      const b = lastBtn;
      const q = b && questionOf(b);
      const isWaPost = this !== document.forms[0] &&
        /\/Assignment-Responses\/(submit|tutorial)$/.test(new URL(formGet(this, 'action')).pathname) &&
        formGet(this, 'method') === 'post';
      const tut = NO_RELOAD_TUTORIALS && q && isTutorial(q);
      if (isWaPost && q && (HANDLED.has(b.name) || tut)) {
        lastBtn = null;
        ajaxSubmit(this, q, HANDLED.has(b.name) ? b : null, tut);
        return;
      }
    } catch (e) {
      console.warn('[no-reload] passthrough:', e);
    }
    saveScroll(lastBtn && questionOf(lastBtn)); // real reload coming, remember position
    return nativeSubmit.call(this);
  };
})();
