/* Aura · interfaz. Requiere js/motor.js (window.AuraMotor).
   El contenido vive en data/: paises.json y escenarios/*.json. */
(function () {
"use strict";
const M = window.AuraMotor;

/* ===================== CONSTANTES ===================== */
const KEY = "aura.v1";
const DEFAULT_SETTINGS = { sound: true, clicks: true, autoSpeak: false };
const TABS = ["inicio", "practica", "progreso", "ajustes"];
const GOALS = [
  { id: "presentacion", label: "Presentar con seguridad" },
  { id: "entrevista", label: "Brillar en entrevistas" },
  { id: "venta", label: "Atender y vender mejor" },
  { id: "cita", label: "Conversar con naturalidad" }];
const CONF_LABELS = ["", "Muy baja", "Baja", "Regular", "Buena", "Muy buena"];
const LEVELS = [[0, "Aprendiz"], [20, "Comunicador"], [45, "Orador"], [70, "Persuasivo"], [90, "Maestro del Aura"]];
const PERS = [["amable", "Amable"], ["neutral", "Neutral"], ["dificil", "Difícil"]];
const FIN_NAME = { alto: "Mejor final", medio: "Final intermedio", bajo: "Final difícil" };
const CAPA_TXT = { completa: "Modismos locales", borrador: "Modismos en borrador", neutra: "Español neutro" };
const PRUEBA_SEG = 60;

/* ===================== ESTADO Y PERSISTENCIA ===================== */
function freshProgress(keep) {
  return {
    words: {}, sims: {}, history: [], days: [], baselines: [], pers: {}, dismiss: {},
    profile: (keep && keep.profile) || null, pais: (keep && keep.pais) || null,
    settings: Object.assign({}, DEFAULT_SETTINGS, (keep && keep.settings) || {})
  };
}
function load() {
  let raw = null; try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  const p = freshProgress();
  if (raw && typeof raw === "object") Object.assign(p, raw);
  p.settings = Object.assign({}, DEFAULT_SETTINGS, p.settings || {});
  ["words", "sims", "pers", "dismiss"].forEach(k => { if (!p[k] || typeof p[k] !== "object" || Array.isArray(p[k])) p[k] = {}; });
  ["history", "days", "baselines"].forEach(k => { if (!Array.isArray(p[k])) p[k] = []; });
  try { if (localStorage.getItem("aura.sound") === "off") { p.settings.sound = false; localStorage.removeItem("aura.sound"); } } catch (e) {}
  return p;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (e) {} }
let progress = load();
let S = { tab: "inicio", view: "list", sub: null, anim: "up", ob: "bienvenida", area: "Todos" };
const DATA = { paises: null, index: null, raw: {}, esc: {} };
const app = document.getElementById("app");

/* ===================== UTILIDADES ===================== */
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function cap(s) { return s.charAt(0) === "¿" || s.charAt(0) === "¡" ? s.charAt(0) + s.charAt(1).toUpperCase() + s.slice(2) : s.charAt(0).toUpperCase() + s.slice(1); }
function atSentenceStart(tpl) { const before = tpl.slice(0, tpl.indexOf("___")).trim(); return before === "" || /[.!?¡¿:]$/.test(before); }
function fillHTML(tpl, filled) { return esc(tpl).replace("___", `<span class="blank">${filled ? esc(filled) : "&nbsp;&nbsp;&nbsp;&nbsp;"}</span>`); }
function pct(x) { return Math.round(x * 100); }
function dayKey(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function today() { return dayKey(new Date()); }
function daysBetween(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 864e5); }
function fmtSec(s) { return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0"); }
function initials(n) { return (n || "").trim().split(/\s+/).slice(0, 2).map(x => x.charAt(0).toUpperCase()).join("") || "Aa"; }
function markDay() { const t = today(); if (!progress.days.includes(t)) { progress.days.push(t); if (progress.days.length > 400) progress.days = progress.days.slice(-400); } }
function streak() {
  const set = new Set(progress.days), d = new Date(); let n = 0;
  if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (set.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function levelOf(g) { let cur = LEVELS[0], next = null; LEVELS.forEach((l, i) => { if (g >= l[0]) { cur = l; next = LEVELS[i + 1] || null; } }); return { name: cur[1], next }; }
async function getJSON(url) { const r = await fetch(url, { cache: "no-cache" }); if (!r.ok) throw new Error(url + " " + r.status); return r.json(); }

/* ===================== PAÍS ===================== */
function paisId() { return progress.pais || "CL"; }
function paisObj(id) { const ps = DATA.paises.paises; return ps.find(p => p.id === (id || paisId())) || ps[0]; }
function mulList() { return M.mergeMuletillas(DATA.paises.comunes, paisObj().muletillas); }
function tx(v) { return M.L(v, paisId()); }
function guessPais() {
  try {
    const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    for (const l of langs) { const m = /^es[-_]([A-Za-z]{2})/.exec(l || ""); if (m) { const id = m[1].toUpperCase(); if (DATA.paises.paises.some(p => p.id === id)) return id; } }
  } catch (e) {}
  return null;
}
function setPais(id) { progress.pais = id; DATA.esc = {}; save(); }

/* ===================== ESCENARIOS ===================== */
function listReady() { return DATA.index.list.filter(x => x.ready); }
function progList() { return listReady().map(x => ({ id: x.id, n: x.n })); }
function meta(id) { return DATA.index.list.find(x => x.id === id); }
function gProg() { return M.globalProgress(progress, progList()); }
function sProg(id) { const m = meta(id); return M.scenarioProgress(progress, id, m ? m.n : 10); }
function masteredCount() { return listReady().reduce((a, s) => { let n = 0; for (let i = 0; i < s.n; i++) if ((progress.words[s.id + "-" + i] || 0) >= 3) n++; return a + n; }, 0); }
function totalWords() { return listReady().reduce((a, s) => a + s.n, 0); }
function resolveScen(id) {
  const raw = DATA.raw[id]; if (!raw) return null;
  const r = M.deepL(raw, paisId());
  r.words.forEach((w, i) => { w.id = id + "-" + i; });
  r.turnos = M.maxTurnos(r.sim);
  DATA.esc[id] = r; return r;
}
function scenData(id) { return DATA.esc[id] || (DATA.raw[id] ? resolveScen(id) : null); }
function scen() { return scenData(S.sid); }
async function ensureScen(id) { if (!DATA.raw[id]) DATA.raw[id] = await getJSON("data/escenarios/" + id + ".json"); return scenData(id); }
function recommend() {
  const ready = listReady(), g = progress.profile && progress.profile.goal;
  const goal = ready.find(x => x.id === g);
  if (goal && sProg(goal.id) < 100) return goal;
  return ready.slice().sort((a, b) => sProg(a.id) - sProg(b.id))[0];
}
function persOf(id) { return progress.pers[id] || "neutral"; }

/* ===================== ICONOS ===================== */
const SVG_ATTR = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const S_ICONS = {
  presentacion: `<svg ${SVG_ATTR}><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20l4-4 4 4"/><path d="M7 12l3-3 2 2 4-4"/></svg>`,
  entrevista: `<svg ${SVG_ATTR}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></svg>`,
  venta: `<svg ${SVG_ATTR}><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg>`,
  cita: `<svg ${SVG_ATTR}><path d="M4 10h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-5z"/><path d="M16 12h2a2 2 0 0 1 0 4h-2"/><path d="M8 3c0 2 2 2 2 4M12 3c0 2 2 2 2 4"/></svg>`
};
const AREA_ICONS = {
  "Académico": S_ICONS.presentacion, "Laboral": S_ICONS.entrevista, "Ventas": S_ICONS.venta, "Social": S_ICONS.cita,
  "Cotidiano": `<svg ${SVG_ATTR}><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>`
};
function iconFor(id, area) { return S_ICONS[id] || AREA_ICONS[area] || S_ICONS.cita; }
const ICON_SPEAK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
const ICON_MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>';
const ICON_STOP = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
const ICON_SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v13"/><path d="M7 8l5-5 5 5"/><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>';
function heroPhoto(size) {
  return `<figure class="photo${size ? " " + size : ""}"><picture><source srcset="hero.webp" type="image/webp"><img src="hero.jpg" width="1200" height="800" alt="Dos jóvenes conversando con confianza en un café, con luz dorada de atardecer"></picture></figure>`;
}

/* ===================== SONIDOS (Web Audio API) ===================== */
let actx = null;
function tone(freq, start, dur, vol) {
  const o = actx.createOscillator(), g = actx.createGain(), o2 = actx.createOscillator(), g2 = actx.createGain();
  o.type = "sine"; o.frequency.value = freq; o2.type = "sine"; o2.frequency.value = freq * 2.01;
  [[g, vol], [g2, vol * .22]].forEach(([gn, v]) => { gn.gain.setValueAtTime(0.0001, start); gn.gain.exponentialRampToValueAtTime(v, start + 0.012); gn.gain.exponentialRampToValueAtTime(0.0001, start + dur); });
  o.connect(g).connect(actx.destination); o2.connect(g2).connect(actx.destination);
  o.start(start); o2.start(start); o.stop(start + dur + 0.05); o2.stop(start + dur + 0.05);
}
function playNotes(notes, kind) {
  const st = progress.settings;
  if (!st.sound) return;
  if (kind === "click" && !st.clicks) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    actx = actx || new AC(); if (actx.state === "suspended") actx.resume();
    const t = actx.currentTime + 0.02;
    notes.forEach(([f, dt, dur, vol]) => tone(f, t + dt, dur, vol || 0.16));
  } catch (e) {}
}
function chime() { playNotes([[1046.5, 0, .35], [1568, .09, .5]], "fx"); }
function fanfare() { playNotes([[784, 0, .4], [1046.5, .12, .4], [1318.5, .24, .7]], "fx"); }
function softMiss() { playNotes([[440, 0, .22, .07], [349.2, .11, .32, .07]], "fx"); }
function tick() { playNotes([[660, 0, .06, .045]], "click"); }

/* ===================== VOZ: LEER EN VOZ ALTA ===================== */
function speak(text) {
  try {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices();
    const prefs = [paisObj().voz, "es-419", "es-US", "es-MX", "es-ES"];
    const pick = prefs.map(l => voices.find(v => v.lang && v.lang.replace("_", "-").toLowerCase().startsWith(l.toLowerCase()))).find(Boolean) || voices.find(v => v.lang && v.lang.startsWith("es"));
    if (pick) { u.voice = pick; u.lang = pick.lang; } else u.lang = paisObj().voz;
    u.rate = 1; speechSynthesis.speak(u);
  } catch (e) {}
}

/* ===================== VOZ: DICTADO (Web Speech API) =====================
   keepAlive: si el reconocedor se corta por un silencio, se reinicia solo y sigue sumando texto. */
function Dictado(opts) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const d = { active: false, text: "", t0: null, t1: null, committed: "", supported: !!SR };
  let rec = null;
  function startSession() {
    rec = new SR(); rec.lang = opts.lang || "es-CL"; rec.continuous = true; rec.interimResults = true;
    rec.onresult = e => {
      const now = performance.now(); if (d.t0 === null) d.t0 = now;
      const chunks = []; let anyFinal = false;
      for (let i = 0; i < e.results.length; i++) { const r = e.results[i]; chunks.push(r[0].transcript); if (r.isFinal) anyFinal = true; }
      if (anyFinal) d.t1 = now;
      const sess = M.buildTranscript(chunks);
      d.text = (d.committed ? d.committed + " " : "") + sess;
      opts.onText && opts.onText(d.text.trim());
    };
    rec.onerror = e => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      d.active = false;
      opts.onError && opts.onError(e.error === "not-allowed" || e.error === "service-not-allowed" ? "denied" : e.error);
    };
    rec.onend = () => {
      d.committed = d.text.trim();
      if (d.active && opts.keepAlive) { try { startSession(); return; } catch (e) {} }
      d.active = false; opts.onEnd && opts.onEnd(d);
    };
    rec.start();
  }
  d.start = () => {
    if (!SR) { opts.onError && opts.onError("unsupported"); return; }
    d.active = true; d.text = ""; d.committed = ""; d.t0 = null; d.t1 = null;
    try { startSession(); } catch (e) { d.active = false; opts.onError && opts.onError("start"); }
  };
  d.stop = () => { d.active = false; try { rec && rec.stop(); } catch (e) {} };
  d.seconds = () => (d.t0 !== null && d.t1 !== null ? (d.t1 - d.t0) / 1000 + 1 : null);
  return d;
}
let dict = null;
function stopDictado() { if (dict && dict.active) dict.stop(); }
function micMsg(code) {
  return code === "unsupported" ? "Tu navegador no reconoce voz. Escribe tu respuesta (en Chrome sí funciona)."
    : code === "denied" ? "El micrófono está bloqueado. Revisa el permiso del navegador o escribe tu respuesta."
    : "No se pudo reconocer la voz. Intenta de nuevo o escribe.";
}

/* ===================== ESCÚCHATE (grabar y reproducir) ===================== */
const Rec = { mr: null, stream: null, chunks: [], url: null, timer: null, t0: 0, msg: "" };
function recSupported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder); }
async function recStart() {
  stopDictado(); try { speechSynthesis.cancel(); } catch (e) {}
  if (!recSupported()) { Rec.msg = "Tu navegador no permite grabar audio."; paintRec(); return; }
  try { Rec.stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { Rec.msg = "No pudimos usar el micrófono. Revisa el permiso del navegador."; paintRec(); return; }
  Rec.chunks = []; Rec.msg = "";
  try { Rec.mr = new MediaRecorder(Rec.stream); } catch (e) { Rec.msg = "No se pudo iniciar la grabación."; recRelease(); paintRec(); return; }
  Rec.mr.ondataavailable = e => { if (e.data && e.data.size) Rec.chunks.push(e.data); };
  Rec.mr.onstop = () => {
    const type = (Rec.mr && Rec.mr.mimeType) || "audio/webm";
    if (Rec.url) URL.revokeObjectURL(Rec.url);
    Rec.url = Rec.chunks.length ? URL.createObjectURL(new Blob(Rec.chunks, { type })) : null;
    recRelease(); paintRec();
  };
  Rec.mr.start(); Rec.t0 = Date.now();
  Rec.timer = setInterval(() => {
    const s = (Date.now() - Rec.t0) / 1000, el = document.getElementById("recTime");
    if (el) el.textContent = fmtSec(s);
    if (s >= 45) recStop();
  }, 250);
  paintRec();
}
function recStop() { if (Rec.mr && Rec.mr.state !== "inactive") Rec.mr.stop(); }
function recRelease() { clearInterval(Rec.timer); Rec.timer = null; if (Rec.stream) Rec.stream.getTracks().forEach(t => t.stop()); Rec.stream = null; Rec.mr = null; }
function recReset() { recStop(); recRelease(); if (Rec.url) URL.revokeObjectURL(Rec.url); Rec.url = null; Rec.msg = ""; }
function escuchateHTML() {
  const live = !!Rec.mr;
  return `<p class="hint"><b>Escúchate:</b> di la respuesta modelo en voz alta, grábate y compárate.</p>
    <div class="row">${live
      ? `<button class="btn" data-act="recStop">${ICON_STOP} Detener <span class="rec-dot" aria-hidden="true"></span> <span class="mono" id="recTime">0:00</span></button>`
      : `<button class="btn" data-act="recStart">${ICON_MIC} ${Rec.url ? "Grabar de nuevo" : "Grabarme"}</button>`}
      <button class="btn ghost" data-act="speakModel">${ICON_SPEAK} Escuchar modelo</button></div>
    ${Rec.url && !live ? `<audio controls src="${Rec.url}"></audio>` : ""}
    ${Rec.msg ? `<p class="note">${esc(Rec.msg)}</p>` : ""}`;
}
function paintRec() { const el = document.getElementById("escuchate"); if (el) el.innerHTML = escuchateHTML(); }

/* ===================== TARJETA PARA COMPARTIR ===================== */
let cardBlob = null, cardUrl = null;
function wrapLines(g, text, maxW) {
  const words = text.split(" "), lines = []; let cur = "";
  words.forEach(w => { const t = cur ? cur + " " + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
  if (cur) lines.push(cur); return lines;
}
async function makeCard() {
  const R = S.result, s = scen(), end = s.endings[R.fin];
  const W = 1080, H = 1920, c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  try { await Promise.all([document.fonts.load('700 120px "Playfair Display"'), document.fonts.load('800 120px "Playfair Display"'), document.fonts.load('700 40px "Atkinson Hyperlegible"'), document.fonts.load('400 40px "Atkinson Hyperlegible"')]); } catch (e) {}
  g.fillStyle = "#0a0a0b"; g.fillRect(0, 0, W, H);
  const rg = g.createRadialGradient(540, 600, 40, 540, 600, 760); rg.addColorStop(0, "rgba(212,175,55,.26)"); rg.addColorStop(1, "rgba(212,175,55,0)");
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  const gold = g.createLinearGradient(330, 390, 750, 810); gold.addColorStop(0, "#f6e09a"); gold.addColorStop(.55, "#d4af37"); gold.addColorStop(1, "#8f6b1e");
  g.strokeStyle = gold; g.lineWidth = 16; g.beginPath(); g.arc(540, 600, 200, 0, Math.PI * 2); g.stroke();
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = gold; g.font = '700 160px "Playfair Display", Georgia, serif'; g.fillText("Aa", 540, 612);
  g.fillStyle = "#d4af37"; g.font = '700 46px "Atkinson Hyperlegible", sans-serif';
  if ("letterSpacing" in g) g.letterSpacing = "14px";
  g.fillText("AURA", 547, 880);
  if ("letterSpacing" in g) g.letterSpacing = "0px";
  g.fillStyle = "#f4eee0"; g.font = '700 86px "Playfair Display", Georgia, serif';
  const lines = wrapLines(g, end.title, 900);
  let y = 1040; lines.forEach(l => { g.fillText(l, 540, y); y += 104; });
  g.fillStyle = "#a69f8c"; g.font = '400 42px "Atkinson Hyperlegible", sans-serif';
  g.fillText(s.name + " · " + PERS.find(p => p[0] === R.pers)[1], 540, y + 20);
  g.fillStyle = gold; g.font = '800 230px "Playfair Display", Georgia, serif'; g.fillText(String(R.simScore), 540, 1500);
  g.fillStyle = "#d4af37"; g.font = '700 44px "Atkinson Hyperlegible", sans-serif'; g.fillText("puntos de 100", 540, 1660);
  g.fillStyle = "#a69f8c"; g.font = '400 36px "Atkinson Hyperlegible", sans-serif'; g.fillText("Entrena cómo suenas · aura-verbal.github.io", 540, 1820);
  return new Promise(res => c.toBlob(b => res(b), "image/png"));
}
async function shareCard() {
  if (!cardBlob) return;
  const file = new File([cardBlob], "aura-resultado.png", { type: "image/png" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "Mi resultado en Aura", text: "Entreno cómo sueno con Aura: https://aura-verbal.github.io" });
      return;
    }
  } catch (e) { if (e && e.name === "AbortError") return; }
  const a = document.createElement("a"); a.href = cardUrl; a.download = "aura-resultado.png"; document.body.appendChild(a); a.click(); a.remove();
}

/* ===================== NAVEGACIÓN ===================== */
function render() {
  if (!DATA.index) return;
  document.getElementById("levelPill").textContent = levelOf(gProg()).name;
  const onb = !progress.profile || !!S.obPrueba;
  document.body.classList.toggle("onboarding", onb);
  let html;
  if (onb) html = vOnboarding();
  else if (S.sub === "prueba") html = vPrueba(false);
  else if (S.sub === "pais") html = vPais(false);
  else if (S.tab === "inicio") html = vInicio();
  else if (S.tab === "progreso") html = vProgreso();
  else if (S.tab === "ajustes") html = vAjustes();
  else html = S.view === "list" ? vList() : S.view === "loading" ? vLoading() : S.view === "scenario" ? vScenario()
    : S.view === "practice" ? vPractice() : S.view === "sim" ? vSim() : vResults();
  app.innerHTML = `<div class="view${S.anim ? " anim-" + S.anim : ""}">${html}</div>`;
  const scrollTurn = S.scrollTurn; S.scrollTurn = false;
  if (S.anim) window.scrollTo({ top: 0 });
  S.anim = null; S.toast = null;
  document.querySelectorAll(".nav button").forEach(b => { const on = b.dataset.tab === S.tab; b.classList.toggle("on", on); if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  if (S.tab === "practica" && S.view === "results") requestAnimationFrame(() => requestAnimationFrame(() => { const b = document.getElementById("newBar"); if (b) b.style.width = b.dataset.w + "%"; }));
  if (scrollTurn) { const el = document.getElementById("turnoActual"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }
  if (S.sub === "prueba" || S.ob === "prueba") paintPrueba();
}
function go(patch, anim) { Object.assign(S, patch); S.anim = anim || "up"; render(); }
function setTab(t) {
  if (t === S.tab && !S.sub) { if (t === "practica" && S.view !== "list") { leaveSim(); go({ view: "list" }, "left"); } return; }
  const dir = TABS.indexOf(t) >= TABS.indexOf(S.tab) ? "right" : "left";
  leaveSim(); S.confirm = null;
  if (t === "practica" && (S.view === "results" || S.view === "loading")) S.view = "list";
  go({ tab: t, sub: null }, dir);
}
function leaveSim() { stopDictado(); recReset(); stopPrueba(); try { speechSynthesis.cancel(); } catch (e) {} }

/* ===================== PERFIL ===================== */
function profileForm(p, cta) {
  const goal = p ? p.goal : "", conf = p ? p.confNow : 3;
  return `<div class="field"><label for="profName">¿Cómo te llamas?</label><input type="text" id="profName" maxlength="30" autocomplete="given-name" placeholder="Tu nombre" value="${p ? esc(p.name) : ""}"></div>
    <div class="field"><span class="lbl">¿Qué quieres mejorar primero?</span>
      <div class="chips-opt">${GOALS.map(g => `<label class="chip-opt"><input type="radio" name="goal" value="${g.id}" ${g.id === goal ? "checked" : ""}><span>${S_ICONS[g.id]}${esc(g.label)}</span></label>`).join("")}</div></div>
    <div class="field"><label for="profConf">¿Cuánta confianza sientes hoy al hablar?</label>
      <input type="range" id="profConf" min="1" max="5" step="1" value="${conf}">
      <span class="conf-out" id="confOut">${conf} · ${CONF_LABELS[conf]}</span></div>
    <p class="err" id="profErr"></p>
    <button class="btn primary wide" data-act="saveProfile">${cta}</button>`;
}
function saveProfile() {
  const name = (document.getElementById("profName").value || "").trim();
  const g = document.querySelector('input[name="goal"]:checked');
  const conf = +document.getElementById("profConf").value;
  const err = document.getElementById("profErr");
  if (!name) { err.textContent = "Escribe tu nombre para continuar."; document.getElementById("profName").focus(); return; }
  if (!g) { err.textContent = "Elige qué quieres mejorar primero."; return; }
  const isNew = !progress.profile;
  if (isNew) progress.profile = { name, goal: g.value, confStart: conf, confNow: conf, since: today() };
  else Object.assign(progress.profile, { name, goal: g.value, confNow: conf });
  if (!progress.pais) progress.pais = guessPais() || "CL";
  save(); chime();
  if (isNew) { S.obPrueba = true; S.ob = "prueba"; S.pr = null; go({}, "right"); }
  else { S.toast = "Perfil guardado."; render(); }
}

/* ===================== VISTA: BIENVENIDA Y PAÍS ===================== */
function vOnboarding() {
  if (S.ob === "pais") return vPais(true);
  if (S.ob === "perfil") return `<section class="section"><button class="back" data-act="obBack" data-to="pais">← País</button>
      <div><p class="eyebrow">Paso 2 de 3</p><h2>Crea tu perfil</h2><p class="lead">Así Aura te recomienda por dónde empezar y mide cuánto avanzas.</p></div>
      <div class="panel">${profileForm(null, "Continuar")}</div>
      <p class="note">Tu perfil se guarda solo en este celular. No pedimos correo ni contraseña.</p></section>`;
  if (S.ob === "prueba") return vPrueba(true);
  return `<section class="hero">${heroPhoto()}
      <h1 class="over">Entrena cómo <em>suenas</em>.</h1>
      <p class="lead">Aprende la palabra adecuada para cada situación y ponla a prueba en conversaciones que reaccionan a lo que dices. Con los modismos de tu país.</p></section>
    <section class="section"><button class="btn primary wide" data-act="obNext" data-to="pais">Empezar</button>
      <p class="note" style="text-align:center">Gratis · sin registro · tu progreso se guarda en tu celular</p></section>`;
}
function vPais(ob) {
  const sel = ob ? (S.paisSel || progress.pais || guessPais()) : paisId();
  const card = p => `<button class="pais ${p.id === sel ? "on" : ""}" data-act="pickPais" data-id="${p.id}" aria-pressed="${p.id === sel}">
      <span class="flag" aria-hidden="true">${p.bandera}</span><span class="pn"><b>${esc(p.nombre)}</b><small>${CAPA_TXT[p.capa]}</small></span></button>`;
  const ps = DATA.paises.paises, local = ps.filter(p => p.capa !== "neutra"), neutros = ps.filter(p => p.capa === "neutra");
  return `<section class="section">${ob ? `<button class="back" data-act="obBack" data-to="bienvenida">← Inicio</button>` : `<button class="back" data-act="subBack">← Volver</button>`}
    <div>${ob ? `<p class="eyebrow">Paso 1 de 3</p>` : ""}<h2>¿De dónde eres?</h2>
      <p class="lead">Aura adapta las muletillas que detecta, los modismos y el trato (tú, vos o usted) a tu país.</p></div>
    <p class="eyebrow">Con modismos locales</p><div class="paises">${local.map(card).join("")}</div>
    <p class="eyebrow">Español neutro por ahora</p><div class="paises">${neutros.map(card).join("")}</div>
    <p class="note">Los modismos marcados como borrador los redactó la IA y falta que los revise un hablante nativo; pueden tener errores.</p>
  </section>`;
}

/* ===================== VISTA: PRUEBA INICIAL (60 s) ===================== */
let prTimer = null;
function stopPrueba() { clearInterval(prTimer); prTimer = null; if (S.pr && S.pr.phase === "rec") { S.pr.phase = "idle"; } stopDictado(); }
function vPrueba(ob) {
  const P = S.pr || (S.pr = { phase: "idle", text: "", msg: "" });
  const head = `${ob ? `<p class="eyebrow">Paso 3 de 3</p>` : `<button class="back" data-act="subBack">← Volver</button>`}
    <div><h2>Preséntate en 60 segundos</h2><p class="lead">Es tu punto de partida: medimos tu ritmo y tus muletillas para comparar cuánto avanzas.</p></div>`;
  if (P.phase === "done") {
    const r = P.res, ideal = r.ppm !== null && r.ppm >= M.PPM_RANGE[0] && r.ppm <= M.PPM_RANGE[1];
    const mulList2 = Object.entries(r.mul.found).map(([k, n]) => `«${esc(k)}»${n > 1 ? " ×" + n : ""}`).join(", ");
    return `<section class="section">${head}
      <div class="panel"><span class="eyebrow">Tu punto de partida</span>
        <div class="kpis">
          <div class="kpi"><b>${r.ppm !== null ? r.ppm : "—"}</b><span>palabras por minuto${r.ppm !== null ? (ideal ? " · buen ritmo" : " · ideal " + M.PPM_RANGE[0] + "–" + M.PPM_RANGE[1]) : ""}</span></div>
          <div class="kpi"><b>${r.mpm !== null ? r.mpm : "—"}</b><span>muletillas por minuto</span></div>
          <div class="kpi"><b>${r.words}</b><span>palabras dichas</span></div></div>
        ${mulList2 ? `<p class="hint">Muletillas detectadas: ${mulList2}.</p>` : `<p class="hint">No detectamos muletillas. Excelente.</p>`}
        <p class="muted" style="font-size:.92rem">«${esc(P.text)}»</p></div>
      <div class="row"><button class="btn primary" data-act="prSave">${ob ? "Guardar y empezar" : "Guardar resultado"}</button><button class="btn" data-act="prRetry">Repetir</button></div></section>`;
  }
  const live = P.phase === "rec";
  return `<section class="section">${head}
    <div class="panel">
      <p class="hint">Cuenta <b>quién eres</b>, <b>a qué te dedicas</b> y <b>qué quieres lograr</b>. Habla como lo harías con alguien que recién conoces.</p>
      <div class="rec-wrap"><button class="rec-btn ${live ? "live" : ""}" id="prBtn" data-act="prToggle" aria-label="${live ? "Terminar grabación" : "Empezar a grabar"}">
        <span>${live ? `<b id="prSecs">${PRUEBA_SEG}</b>` : ICON_MIC}</span></button>
        <p class="note" id="prStatus">${live ? "Escuchando... toca para terminar" : "Toca para empezar · " + PRUEBA_SEG + " segundos"}</p></div>
      <div class="transcript" id="prText">${esc(P.text)}</div>
      ${P.msg ? `<p class="fb no">${esc(P.msg)}</p>` : ""}
    </div>
    ${ob ? `<button class="linkish" data-act="prSkip" style="align-self:center">Omitir por ahora</button>` : ""}
  </section>`;
}
function paintPrueba() {
  const P = S.pr; if (!P || P.phase !== "rec") return;
  const el = document.getElementById("prBtn"), secs = document.getElementById("prSecs");
  const elapsed = (Date.now() - P.start) / 1000, left = Math.max(0, PRUEBA_SEG - elapsed);
  if (el) el.style.setProperty("--p", Math.min(100, elapsed / PRUEBA_SEG * 100));
  if (secs) secs.textContent = Math.ceil(left);
}
function prStart() {
  stopDictado(); recReset();
  S.pr = { phase: "rec", text: "", msg: "", start: Date.now() };
  dict = Dictado({
    lang: paisObj().voz, keepAlive: true,
    onText: t => { S.pr.text = t; const el = document.getElementById("prText"); if (el) el.textContent = t; },
    onError: code => { clearInterval(prTimer); S.pr.phase = "idle"; S.pr.msg = micMsg(code); render(); },
    onEnd: d => { if (S.pr && S.pr.phase === "fin") prFinish(d); }
  });
  dict.start();
  if (!dict.supported) return;
  render();
  prTimer = setInterval(() => { paintPrueba(); if ((Date.now() - S.pr.start) / 1000 >= PRUEBA_SEG) prStop(); }, 200);
}
function prStop() { clearInterval(prTimer); prTimer = null; if (!S.pr) return; S.pr.phase = "fin"; S.pr.tStop = performance.now(); if (dict && dict.active) dict.stop(); else prFinish(dict); }
function prFinish(d) {
  const text = (S.pr.text || "").trim();
  const elapsed = Math.min(PRUEBA_SEG, (Date.now() - S.pr.start) / 1000);
  // tiempo hablando: desde la primera palabra reconocida hasta que terminó la prueba
  const secs = d && d.t0 !== null ? Math.min(PRUEBA_SEG, ((S.pr.tStop || performance.now()) - d.t0) / 1000) : elapsed;
  const r = M.speechMetrics(text, secs, mulList());
  if (r.words < 15 || elapsed < 10) { S.pr = { phase: "idle", text, msg: "No alcanzamos a escucharte bien. Intenta hablar al menos 20 segundos, cerca del micrófono." }; render(); return; }
  S.pr = { phase: "done", text, res: r }; chime(); render();
}

/* ===================== VISTA: INICIO ===================== */
function vInicio() {
  const p = progress.profile, g = gProg(), lv = levelOf(g), r = recommend(), rp = sProg(r.id), pa = paisObj();
  const goalLbl = (GOALS.find(x => x.id === p.goal) || {}).label || "";
  const banner = S.paisAuto && !progress.dismiss.paisBanner
    ? `<div class="banner"><span class="flag" aria-hidden="true">${pa.bandera}</span><p>Aura ahora se adapta a tu país: <b>${esc(pa.nombre)}</b>. <button class="linkish" data-act="paisOpen">Cambiar</button></p><button class="x" data-act="dismissPais" aria-label="Cerrar aviso">×</button></div>` : "";
  const bl = progress.baselines;
  const prueba = !bl.length
    ? `<button class="card" data-act="prOpen"><span class="tag">60 segundos</span><h3>Mide tu punto de partida</h3><span class="meta">Preséntate por voz y descubre tu ritmo y tus muletillas. Así verás tu avance real.</span><span class="cta">Hacer la prueba →</span></button>`
    : (daysBetween(bl[bl.length - 1].d, today()) >= 30
      ? `<button class="card" data-act="prOpen"><span class="tag">Ya pasó un mes</span><h3>Mide tu avance</h3><span class="meta">Repite la prueba de 60 segundos y compárala con tu punto de partida.</span><span class="cta">Repetir la prueba →</span></button>` : "");
  return `<section class="greet"><div class="avatar" aria-hidden="true">${esc(initials(p.name))}</div>
      <div><p class="eyebrow">${esc(lv.name)} · ${pa.bandera} ${esc(pa.nombre)}</p><h1 style="font-size:clamp(1.7rem,5vw,2.2rem)">Hola, ${esc(p.name)}.</h1></div></section>
    <section class="section">${banner}${heroPhoto("sm")}
      <div class="kpis">
        <div class="kpi"><b>${streak()}</b><span>${streak() === 1 ? "día seguido" : "días seguidos"}</span></div>
        <div class="kpi"><b>${masteredCount()}/${totalWords()}</b><span>palabras dominadas</span></div>
        <div class="kpi"><b>${g}%</b><span>progreso total</span></div>
      </div>
      <button class="card feature" data-act="open" data-id="${r.id}">
        <span class="tag">${r.id === p.goal ? "Tu objetivo" : "Recomendado"}</span>
        <span class="card-head"><span class="s-icon">${iconFor(r.id, r.area)}</span><span><h3>${esc(tx(r.name))}</h3><span class="meta">${esc(tx(r.blurb))}</span></span></span>
        <span class="barlabel"><span>Dominio</span><span class="mono">${rp}%</span></span>
        <span class="bar" aria-hidden="true"><i style="width:${rp}%"></i></span>
        <span class="cta">${rp > 0 ? "Continuar" : "Empezar"} →</span>
      </button>
      ${prueba}
      <p class="note">Objetivo: ${esc(goalLbl)}. <button class="linkish" data-act="tab" data-tab="ajustes">Editar perfil</button></p>
    </section>`;
}

/* ===================== VISTA: PRÁCTICA ===================== */
function vLoading() { return `<div class="loading"><span class="mark" aria-hidden="true">Aa</span></div>`; }
function vList() {
  const areas = ["Todos"].concat(DATA.index.areas), a = S.area || "Todos", r = recommend();
  const inArea = x => a === "Todos" || x.area === a;
  const ready = listReady().filter(inArea), soon = DATA.index.list.filter(x => !x.ready && inArea(x));
  const cards = ready.map(s => {
    const p = sProg(s.id); let mastered = 0; for (let i = 0; i < s.n; i++) if ((progress.words[s.id + "-" + i] || 0) >= 3) mastered++;
    const rec = progress.sims[s.id] || {};
    return `<button class="card" data-act="open" data-id="${s.id}">
      <span class="card-head"><span class="s-icon">${iconFor(s.id, s.area)}</span><span><span class="eyebrow">${esc(s.area)} · ${esc(tx(s.who))}</span><h3>${esc(tx(s.name))}</h3></span></span>
      <span class="meta">${esc(tx(s.blurb))}</span>
      ${s.id === r.id ? '<span class="tag">Recomendado</span>' : ""}
      <span class="barlabel"><span>${mastered}/${s.n} palabras dominadas</span><span class="mono">${rec.best ? "mejor: " + rec.best : "sin simular"}</span></span>
      <span class="bar" aria-hidden="true"><i style="width:${p}%"></i></span>
    </button>`;
  }).join("");
  return `<section class="section"><div><p class="eyebrow">Panel de práctica</p><h2>Elige un escenario</h2>
      <p class="lead">Cada escenario tiene 3 pasos: vocabulario, práctica y una conversación que reacciona a tus respuestas.</p></div>
    <div class="filters" role="toolbar" aria-label="Filtrar por área">${areas.map(x => `<button class="fchip ${x === a ? "on" : ""}" data-act="area" data-area="${esc(x)}" aria-pressed="${x === a}">${esc(x)}</button>`).join("")}</div>
    ${ready.length ? `<div class="grid">${cards}</div>` : `<p class="empty">Todavía no hay escenarios disponibles en ${esc(a)}. Ya vienen en camino.</p>`}
    ${soon.length ? `<div class="stack" style="gap:8px"><p class="eyebrow">Próximamente · ${soon.length}</p><div class="soon">${soon.map(x => `<div class="soon-row"><span>${esc(tx(x.name))}</span><span>${esc(x.area)}</span></div>`).join("")}</div></div>` : ""}
  </section>`;
}
function stepper(active) {
  const st = [["1", "Vocabulario", "open"], ["2", "Práctica", "startPractice"], ["3", "Simulación", "startSim"]];
  return `<div class="steps">${st.map(([n, l, a]) => `<button class="step ${a === active ? "on" : ""}" data-act="${a}" data-id="${S.sid}"><span class="n">Paso ${n}</span><b>${l}</b></button>`).join("")}</div>`;
}
function vScenario() {
  const s = scen(), pers = persOf(s.id), mins = Math.max(3, Math.round(s.turnos * 0.75));
  const rows = s.words.map(w => { const b = Math.min(3, progress.words[w.id] || 0);
    return `<div class="vrow"><span class="from">${esc(w.col)}</span><span class="arrow">→</span><span class="to">${esc(w.pro)}<span class="alt">también: ${esc(w.alt)}</span></span><span class="dots" title="${b} de 3 aciertos">${[0, 1, 2].map(i => `<i class="${i < b ? "on" : ""}"></i>`).join("")}</span></div>`; }).join("");
  return `<section class="section"><button class="back" data-act="list">← Escenarios</button>
    <div class="card-head"><span class="s-icon">${iconFor(s.id, s.area)}</span><div><p class="eyebrow">${esc(s.area)} · ${esc(s.who)}</p><h2>${esc(s.name)}</h2></div></div>
    ${stepper("open")}
    <div class="panel"><dl class="ficha">
      <div><dt>Situación</dt><dd>${esc(s.ficha.situacion)}</dd></div>
      <div><dt>Interlocutor</dt><dd><b>${esc(s.person)}</b> · ${esc(s.who)}. ${esc(s.ficha.pers[pers])}</dd></div>
      <div><dt>Lo que está en juego</dt><dd>${esc(s.ficha.enJuego)}</dd></div>
      <div><dt>Tu objetivo</dt><dd>${esc(s.ficha.objetivo)}</dd></div>
      <div><dt>Duración</dt><dd>${s.turnos} turnos · unos ${mins} minutos</dd></div></dl>
      <div class="field"><span class="lbl">Personalidad de ${esc(s.person)}</span>
        <div class="seg" role="radiogroup" aria-label="Personalidad del interlocutor">${PERS.map(([k, l]) => `<button role="radio" aria-checked="${k === pers}" class="${k === pers ? "on" : ""}" data-act="pers" data-p="${k}">${l}</button>`).join("")}</div></div>
    </div>
    <p class="crit">${esc(s.crit)}</p>
    <div class="vhead eyebrow"><span>${esc(s.labels[0])}</span><span></span><span>${esc(s.labels[1])}</span><span class="dh">Dominio</span></div>
    <div class="vocab">${rows}</div>
    <p class="note">Una palabra queda dominada con 3 aciertos. Cada error resta uno.</p>
    <div class="row"><button class="btn primary" data-act="startPractice">Empezar práctica</button><button class="btn" data-act="startSim">Ir a la simulación</button></div>
  </section>`;
}
function startPractice() {
  const s = scen();
  const qs = shuffle(s.words).map((w, i) => ({ w, kind: i % 2 === 0 ? "context" : "fill", opts: shuffle([w.pro].concat(w.d)) }));
  S.practice = { qs, i: 0, answered: null, correct: 0 };
  go({ view: "practice" }, "right");
}
function vPractice() {
  const s = scen(), P = S.practice, q = P.qs[P.i], w = q.w;
  const start = q.kind === "fill" && atSentenceStart(w.ex);
  const optsHTML = q.opts.map((o, k) => {
    let cls = "opt"; if (P.answered !== null) { if (o === w.pro) cls += " ok"; else if (k === P.answered) cls += " no"; }
    return `<button class="${cls}" data-act="pAnswer" data-k="${k}" ${P.answered !== null ? "disabled" : ""}>${esc(start ? cap(o) : o)}</button>`; }).join("");
  const prompt = q.kind === "context"
    ? `<p class="hint">En ${esc(s.short)}, ¿qué usarías en lugar de…</p><h2>«${esc(w.col)}»</h2>`
    : `<p class="hint">Completa la frase con la opción más adecuada:</p><h3 style="font-weight:500;font-family:var(--font-body);font-size:1.15rem">${fillHTML(w.ex, P.answered !== null ? (start ? cap(w.pro) : w.pro) : null)}</h3>`;
  let fb = "";
  if (P.answered !== null) {
    const ok = q.opts[P.answered] === w.pro;
    fb = `<div class="fb ${ok ? "ok" : "no"}"><b>${ok ? "Correcto." : "Mejor: «" + esc(w.pro) + "»."}</b> ${esc(w.why)} <span class="muted">También sirve: ${esc(w.alt)}${/[.?!]$/.test(w.alt) ? "" : "."}</span></div>
      <div class="row"><button class="btn primary" data-act="pNext">${P.i < P.qs.length - 1 ? "Siguiente" : "Ir a la simulación"}</button></div>`;
  }
  return `<section class="section"><button class="back" data-act="open" data-id="${s.id}">← ${esc(s.name)}</button>
    ${stepper("startPractice")}
    <div class="panel">
      <div class="qmeta"><span class="tag">${q.kind === "context" ? "Sube el registro" : "Completa la frase"}</span><span class="mono muted">${P.i + 1} / ${P.qs.length}</span></div>
      <div class="dotsprog">${P.qs.map((_, k) => `<i class="${k < P.i || (k === P.i && P.answered !== null) ? "done" : ""}"></i>`).join("")}</div>
      ${prompt}
      <div class="opts">${optsHTML}</div>
      ${fb}
    </div></section>`;
}

/* ---------- simulación ramificada ---------- */
const LEVEL = { choice: "Elige la mejor respuesta", fill: "Completa la frase", free: "Responde con tus palabras" };
function startSim() {
  const s = scen(); recReset(); stopDictado();
  const order = {}; Object.entries(s.sim.nodes).forEach(([id, n]) => { if (n.type !== "free") order[id] = shuffle(n.opts.map((_, k) => k)); });
  S.sim = { node: s.sim.start, interes: M.INTERES_INICIAL, hist: [], answered: false, order, pers: persOf(s.id) };
  S.voiceMeta = null;
  if (!(S.practiceDone && S.practiceDone.sid === s.id)) S.practiceDone = null;
  go({ view: "sim" }, "right");
  if (progress.settings.autoSpeak) speak(s.sim.nodes[s.sim.start].say);
}
function dchip(d) { return `<span class="dchip ${d > 0 ? "up" : d < 0 ? "down" : "flat"}">${d > 0 ? "+" + d : d < 0 ? "−" + Math.abs(d) : "±0"}</span>`; }
function meterHTML(s, M2) {
  return `<div class="sim-head"><div class="avatar sm" aria-hidden="true">${esc(initials(s.person))}</div>
    <div class="meter"><div class="meter-top"><span>Interés de <b>${esc(s.person)}</b> · ${PERS.find(p => p[0] === M2.pers)[1].toLowerCase()}</span><span class="mono">${M2.interes}</span></div>
      <div class="meter-bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${M2.interes}" aria-label="Interés del interlocutor"><i style="width:${M2.interes}%"></i><b style="left:40%"></b><b style="left:70%"></b></div></div></div>`;
}
function vSim() {
  const s = scen(), M2 = S.sim, node = s.sim.nodes[M2.node];
  const past = M2.answered ? M2.hist.slice(0, -1) : M2.hist;
  const turnNum = M2.answered ? M2.hist.length : M2.hist.length + 1;
  const chat = past.map(h => `<div class="msg them"><div class="who"><span>${esc(s.person)}</span></div>${esc(h.say)}</div>
      <div class="msg me"><div class="who"><span>Tú</span>${dchip(h.delta)}</div>${esc(h.text)}</div>`).join("");
  let body = "";
  if (node.type === "choice" || node.type === "fill") {
    const start = node.type === "fill" && atSentenceStart(node.tpl), cur = M2.answered ? M2.hist[M2.hist.length - 1] : null;
    const opts = M2.order[M2.node].map(k => {
      const o = node.type === "choice" ? node.opts[k].t : (start ? cap(node.opts[k]) : node.opts[k]);
      let cls = "opt";
      if (cur) { const good = node.type === "choice" ? node.opts[k].s >= 1 : k === 0; if (good) cls += " ok"; else if (k === cur.k) cls += " no"; }
      return `<button class="${cls}" data-act="sAnswer" data-k="${k}" ${cur ? "disabled" : ""}>${esc(o)}</button>`; }).join("");
    const tplHTML = node.type === "fill" ? `<p style="font-size:1.1rem">${fillHTML(node.tpl, cur ? (start ? cap(node.opts[0]) : node.opts[0]) : null)}</p>` : "";
    const fb = cur ? `<div class="fb ${cur.S >= 1 ? "ok" : cur.S >= .4 ? "mid" : "no"}"><b>${pct(cur.S)} pts</b> ${dchip(cur.delta)} ${esc(cur.fb)}</div>` : "";
    body = `${tplHTML}<div class="opts">${opts}</div>${fb}`;
  } else {
    const cur = M2.answered ? M2.hist[M2.hist.length - 1] : null;
    body = cur ? freeFeedback(cur) : `
      <p class="hint">Intenta usar: ${node.hint.map(h => "<b>" + esc(h) + "</b>").join(", ")}.</p>
      <label for="answer" class="eyebrow">Tu respuesta (escribe o dicta)</label>
      <textarea id="answer" placeholder="Escribe aquí o toca el micrófono..."></textarea>
      <div class="row"><button class="icon-btn" id="micBtn" data-act="mic" aria-label="Dictar con el micrófono" aria-pressed="false">${ICON_MIC}</button>
        <button class="btn primary" data-act="sSubmit">Evaluar respuesta</button></div>
      <p class="note" id="micStatus"></p>`;
  }
  const last = M2.answered && !M2.hist[M2.hist.length - 1].next;
  const next = M2.answered ? `<div class="row"><button class="btn primary" data-act="sNext">${last ? "Ver el final" : "Siguiente turno"}</button></div>` : "";
  return `<section class="section"><button class="back" data-act="open" data-id="${s.id}">← ${esc(s.name)}</button>
    ${meterHTML(s, M2)}
    ${chat ? `<div class="chat">${chat}</div>` : ""}
    <div class="panel" id="turnoActual">
      <div class="qmeta"><span class="tag">${LEVEL[node.type]}</span><span class="mono muted">Turno ${turnNum} de ${s.turnos}</span></div>
      <div class="say-row"><div class="msg them"><div class="who"><span>${esc(s.person)}</span></div>${esc(node.say)}</div>
        <button class="icon-btn" data-act="speak" aria-label="Escuchar en voz alta">${ICON_SPEAK}</button></div>
      ${body}${next}
    </div></section>`;
}
function freeFeedback(h) {
  const r = h.r;
  const chips = r.matched.map(m => `<span class="chip ok">✓ ${esc(m)}</span>`).concat(r.missing.map(m => `<span class="chip no">falta: ${esc(m)}</span>`)).join("");
  const mulList2 = Object.entries(r.mul.found).map(([k, n]) => `«${esc(k)}»${n > 1 ? " ×" + n : ""}`).join(", ");
  return `<div class="fb ${r.S >= .75 ? "ok" : r.S >= .45 ? "mid" : "no"}"><b>${pct(r.S)} pts</b> ${dchip(h.delta)} ${r.voice ? "Evaluado por voz." : "Evaluado por texto (sin ritmo)."}</div>
    <p class="muted" style="font-size:.92rem">Dijiste: «${esc(h.text)}»</p>
    <div class="chips">${chips}</div>
    <div class="kpis">
      <div class="kpi"><b>${pct(r.v)}%</b><span>vocabulario objetivo</span></div>
      <div class="kpi"><b>${r.mul.count}</b><span>muletillas${mulList2 ? ": " + mulList2 : ""}</span></div>
      <div class="kpi"><b>${r.ppm ? Math.round(r.ppm) : "—"}</b><span>palabras/min${r.ppm ? "" : " (solo voz)"}</span></div>
    </div>
    ${r.colloquial.length ? `<p class="hint">Podrías cambiar ${r.colloquial.map(c => "«" + esc(c.col) + "» por <b>" + esc(c.pro) + "</b>").join(", ")}.</p>` : ""}
    ${r.notes.map(n => `<p class="hint">${esc(n)}</p>`).join("")}
    <div class="fb mid"><b>Respuesta modelo:</b> ${esc(h.model)}</div>
    <div class="escuchate" id="escuchate">${escuchateHTML()}</div>`;
}
function answerTurn(entry) {
  const M2 = S.sim;
  entry.delta = M.deltaInteres(entry.S, M2.pers);
  M2.interes = M.aplicarInteres(M2.interes, entry.delta);
  entry.interes = M2.interes;
  M2.hist.push(entry); M2.answered = true;
  if (entry.S >= (entry.type === "free" ? .75 : 1)) chime(); else if (entry.S < (entry.type === "free" ? .45 : 1)) softMiss();
  markDay(); save(); render();
}
function finishSim() {
  const s = scen(), M2 = S.sim;
  const before = sProg(s.id);
  const simScore = Math.round(M2.hist.reduce((a, h) => a + h.S, 0) / M2.hist.length * 100);
  const fin = M.finalPorInteres(M2.interes);
  const rec = progress.sims[s.id] || { best: 0, attempts: 0, last: 0, fins: {} };
  rec.fins = rec.fins || {};
  rec.attempts++; rec.last = simScore; rec.best = Math.max(rec.best, simScore); rec.lastFin = fin; rec.fins[fin] = (rec.fins[fin] || 0) + 1;
  progress.sims[s.id] = rec;
  M2.hist.filter(h => h.type === "free").forEach(h => { s.words.forEach(w => { if (M.hasStem(h.text, w.pro)) progress.words[w.id] = Math.min(3, (progress.words[w.id] || 0) + 1); }); });
  const voiced = M2.hist.filter(h => h.type === "free" && h.r.ppm);
  const avgPpm = voiced.length ? Math.round(voiced.reduce((a, h) => a + h.r.ppm, 0) / voiced.length) : null;
  const avgMpm = voiced.length ? +(voiced.reduce((a, h) => a + (h.r.nWords ? h.r.mul.count * h.r.ppm / h.r.nWords : 0), 0) / voiced.length).toFixed(1) : null;
  progress.history.push({ d: today(), sid: s.id, score: simScore, ppm: avgPpm, mpm: avgMpm, fin, pers: M2.pers, pais: paisId() });
  if (progress.history.length > 100) progress.history = progress.history.slice(-100);
  markDay(); save();
  const pr = S.practiceDone && S.practiceDone.sid === s.id ? S.practiceDone.correct : null;
  S.result = { simScore, before, after: sProg(s.id), pr, hist: M2.hist, fin, interes: M2.interes, pers: M2.pers };
  if (cardUrl) URL.revokeObjectURL(cardUrl); cardBlob = null; cardUrl = null;
  recReset(); stopDictado();
  go({ view: "results" }, "up");
  if (fin === "alto") setTimeout(fanfare, 250);
}
function recommendations(s, R) {
  const out = [], free = R.hist.filter(h => h.type === "free");
  const mul = free.reduce((a, h) => a + h.r.mul.count, 0);
  const miss = Array.from(new Set([].concat.apply([], free.map(h => h.r.missing))));
  const ppms = free.filter(h => h.r.ppm).map(h => h.r.ppm);
  const weak = R.hist.map((h, i) => ({ h, i })).filter(x => x.h.type !== "free" && x.h.S < 1);
  if (miss.length) out.push(`Practica estas expresiones en voz alta: ${miss.map(m => "«" + esc(m) + "»").join(", ")}.`);
  if (mul >= 2) out.push(`Detectamos ${mul} muletillas. Cuando necesites pensar, haz una pausa breve en silencio: suena más seguro que rellenar.`);
  if (ppms.length) {
    const avg = Math.round(ppms.reduce((a, b) => a + b, 0) / ppms.length);
    if (avg > M.PPM_RANGE[1]) out.push(`Hablaste a ${avg} palabras por minuto: un poco rápido. Apunta a ${M.PPM_RANGE[0]}–${M.PPM_RANGE[1]}.`);
    else if (avg < M.PPM_RANGE[0]) out.push(`Hablaste a ${avg} palabras por minuto: algo lento. Apunta a ${M.PPM_RANGE[0]}–${M.PPM_RANGE[1]}.`);
  } else out.push("Prueba la próxima vez respondiendo por voz para medir tu ritmo y tus muletillas al hablar.");
  if (weak.length) out.push(`Revisa ${weak.length > 1 ? "los turnos" : "el turno"} ${weak.map(x => x.i + 1).join(", ")}: había una opción más adecuada para ${esc(s.short)}.`);
  if (R.fin !== "alto") out.push(`Repite la conversación: con otras respuestas llegas a otra rama y a otro final.`);
  if (s.id === "cita") out.push("En una cita, devolver la pregunta («¿y tú?») vale más que cualquier palabra elegante.");
  return out;
}
function vResults() {
  const s = scen(), R = S.result, end = s.endings[R.fin];
  const total = R.pr !== null ? Math.round(0.4 * R.pr * 10 + 0.6 * R.simScore) : R.simScore;
  const delta = R.after - R.before;
  const turns = R.hist.map((h, i) => `<div class="turn"><span class="eyebrow">Turno ${i + 1} · ${h.type === "free" ? "libre" : h.type === "fill" ? "completar" : "elegir"}</span>
      <span class="muted">${esc(s.person)}: «${esc(h.say)}»</span><span>Tú: ${esc(h.text)}</span>
      <span class="chips"><span class="chip ${h.S >= .75 ? "ok" : h.S < .45 ? "no" : ""}">${pct(h.S)} pts</span>${dchip(h.delta)}${h.type === "free" && h.r.mul.count ? `<span class="chip">${h.r.mul.count} muletilla${h.r.mul.count > 1 ? "s" : ""}</span>` : ""}${h.type === "free" && h.r.ppm ? `<span class="chip mono">${Math.round(h.r.ppm)} ppm</span>` : ""}</span></div>`).join("");
  const otherPers = R.pers !== "dificil" ? `<button class="btn" data-act="retryPers" data-p="dificil">Probar con personalidad difícil</button>` : "";
  return `<section class="section"><button class="back" data-act="open" data-id="${s.id}">← ${esc(s.name)}</button>
      <div class="panel">
        <div class="ending ${R.fin}"><div class="medal" aria-hidden="true">Aa</div>
          <span class="eyebrow">${FIN_NAME[R.fin]} · interés final ${R.interes}</span>
          <h2>${esc(end.title)}</h2><p class="muted">${esc(end.text)}</p></div>
        <div class="kpis">
          <div class="kpi"><b>${R.simScore}</b><span>simulación</span></div>
          <div class="kpi"><b>${R.pr !== null ? R.pr + "/10" : "—"}</b><span>práctica</span></div>
          <div class="kpi"><b>${total}</b><span>puntaje total</span></div>
        </div>
        <div class="barlabel"><span>Dominio del escenario</span><span class="mono">${R.after}%${delta > 0 ? ` <span class="delta">+${delta}</span>` : ""}</span></div>
        <div class="bar"><i id="newBar" data-w="${R.after}" style="width:${R.before}%"></i></div>
        <p class="note">${R.pr === null ? "Hiciste solo la simulación. El total combina práctica (40%) y simulación (60%)." : "Total = 40% práctica + 60% simulación."}</p>
      </div>
      <div class="panel"><h3>Comparte tu resultado</h3>
        ${cardUrl ? `<img class="share-img" src="${cardUrl}" alt="Tarjeta con tu resultado: ${esc(end.title)}, ${R.simScore} puntos">
          <button class="btn primary" data-act="shareCard">${ICON_SHARE} Compartir</button>`
          : `<p class="note">Crea una imagen en negro y dorado con tu final y tu puntaje, lista para tus historias.</p>
          <button class="btn" data-act="makeCard">Crear tarjeta</button>`}</div>
      <div class="panel"><h3>Qué mejorar</h3><ul class="recs">${recommendations(s, R).map(x => `<li>${x}</li>`).join("")}</ul></div>
      <div class="panel"><h3>La conversación, turno a turno</h3>${turns}</div>
      <div class="row"><button class="btn primary" data-act="startSim">Repetir simulación</button>${otherPers}<button class="btn" data-act="startPractice">Practicar vocabulario</button><button class="btn ghost" data-act="tab" data-tab="progreso">Ver mi progreso</button></div>
    </section>`;
}

/* ===================== VISTA: PROGRESO ===================== */
function scoresChart() {
  const h = progress.history.slice(-10);
  if (!h.length) return `<p class="empty">Aún no hay simulaciones. Completa una y aquí verás cómo evolucionan tus puntajes.</p>`;
  const W = 320, H = 150, L = 28, B = 22, T = 14, slot = (W - L - 4) / 10, bw = Math.min(18, slot * .62);
  const y = v => T + (H - T - B) * (1 - v / 100);
  const g = [0, 50, 100].map(v => `<line class="grid-l" x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${v}</text>`).join("");
  const bars = h.map((e, i) => {
    const x = L + slot * i + (slot - bw) / 2, top = y(e.score), base = y(0), r = Math.min(4, (base - top) / 2);
    const d = e.score > 0 ? `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${base} Z` : "";
    const sc = meta(e.sid);
    return `<g><title>Intento ${progress.history.length - h.length + i + 1} · ${esc(sc ? tx(sc.name) : "")} · ${e.score} pts${e.fin ? " · " + FIN_NAME[e.fin].toLowerCase() : ""}</title>${d ? `<path class="b" d="${d}"/>` : ""}<rect x="${L + slot * i}" y="${T}" width="${slot}" height="${H - T - B}" fill="transparent"/></g>`;
  }).join("");
  const last = h[h.length - 1], lx = L + slot * (h.length - 1) + slot / 2;
  const lbl = `<text class="val" x="${lx}" y="${y(last.score) - 6}" text-anchor="middle">${last.score}</text>`;
  const ax = `<text class="ax" x="${L}" y="${H - 6}">más antiguo</text><text class="ax" x="${W}" y="${H - 6}" text-anchor="end">más reciente</text>`;
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Puntajes de las últimas ${h.length} simulaciones: ${h.map(e => e.score).join(", ")}">${g}${bars}${lbl}${ax}</svg></div>`;
}
function baselineCard() {
  const bl = progress.baselines;
  if (!bl.length) return `<div class="panel"><h3>Tu punto de partida</h3><p class="empty">Haz la prueba de 60 segundos para medir tu ritmo y tus muletillas, y ver tu avance real.</p><button class="btn primary" data-act="prOpen">Hacer la prueba</button></div>`;
  const a = bl[0], b = bl[bl.length - 1], two = bl.length > 1;
  const dl = (x, y, lowerIsBetter) => { if (x === null || y === null || !two) return ""; const d = +(y - x).toFixed(1); if (!d) return ` <span class="delta">±0</span>`; const good = lowerIsBetter ? d < 0 : d > 0; return ` <span class="delta ${good ? "" : "neg"}">${d > 0 ? "+" : "−"}${Math.abs(d)}</span>`; };
  const since = daysBetween(b.d, today());
  return `<div class="panel"><div><h3>Tu punto de partida${two ? " vs hoy" : ""}</h3><p class="note">${two ? `Primera prueba: ${esc(a.d)} · última: ${esc(b.d)}` : `Prueba del ${esc(a.d)}`}</p></div>
    <div class="kpis two">
      <div class="kpi"><b>${b.ppm !== null ? b.ppm : "—"}${dl(a.ppm, b.ppm, false)}</b><span>palabras por minuto (ideal ${M.PPM_RANGE[0]}–${M.PPM_RANGE[1]})</span></div>
      <div class="kpi"><b>${b.mpm !== null ? b.mpm : "—"}${dl(a.mpm, b.mpm, true)}</b><span>muletillas por minuto (menos es mejor)</span></div></div>
    <div class="row"><button class="btn${since >= 30 ? " primary" : ""}" data-act="prOpen">Repetir la prueba</button>${since < 30 ? `<span class="note">Te recomendamos repetirla en ${30 - since} días.</span>` : ""}</div></div>`;
}
function vProgreso() {
  const g = gProg(), lv = levelOf(g), p = progress.profile;
  const sims = Object.values(progress.sims).reduce((a, x) => a + (x.attempts || 0), 0);
  const voiced = progress.history.filter(e => e.ppm);
  const avgPpm = voiced.length ? Math.round(voiced.reduce((a, e) => a + e.ppm, 0) / voiced.length) : null;
  const avgMpm = voiced.length ? (voiced.reduce((a, e) => a + (e.mpm || 0), 0) / voiced.length).toFixed(1) : null;
  const rows = listReady().map(s => {
    const sp = sProg(s.id); let m = 0; for (let i = 0; i < s.n; i++) if ((progress.words[s.id + "-" + i] || 0) >= 3) m++;
    const rec = progress.sims[s.id] || {};
    return `<div class="srow"><span class="s-icon">${iconFor(s.id, s.area)}</span><div class="stack" style="gap:6px;min-width:0">
      <span class="barlabel"><span style="color:var(--fg);font-weight:700">${esc(tx(s.name))}</span><span class="mono">${sp}%</span></span>
      <span class="bar" aria-hidden="true"><i style="width:${sp}%"></i></span>
      <span class="barlabel"><span>${m}/${s.n} palabras</span><span>${rec.best ? "mejor: " + rec.best + (rec.lastFin ? " · último: " + FIN_NAME[rec.lastFin].toLowerCase() : "") : "sin simular"}</span></span></div></div>`; }).join("");
  return `<section class="ring-row"><div class="ring" style="--p:${g}" role="img" aria-label="Progreso total ${g}%"><span><b class="mono">${g}%</b><small>progreso total</small></span></div>
      <div><p class="eyebrow">Tu nivel</p><h2>${esc(lv.name)}</h2><p class="note" style="margin-top:4px">${lv.next ? `Te faltan ${lv.next[0] - g} puntos para <b style="color:var(--accent)">${esc(lv.next[1])}</b>.` : "Llegaste al nivel máximo."}</p></div></section>
    <section class="section">
      <div class="kpis two">
        <div class="kpi"><b>${masteredCount()}/${totalWords()}</b><span>palabras dominadas</span></div>
        <div class="kpi"><b>${sims}</b><span>simulaciones completadas</span></div>
        <div class="kpi"><b>${streak()}</b><span>${streak() === 1 ? "día seguido practicando" : "días seguidos practicando"}</span></div>
        <div class="kpi"><b>${p ? p.confStart + " → " + p.confNow : "—"}</b><span>confianza (1 a 5): inicio → hoy</span></div>
      </div>
      ${baselineCard()}
      <div class="panel"><div><h3>Últimas simulaciones</h3><p class="note">Puntaje de cada intento (0 a 100).</p></div>${scoresChart()}</div>
      <div class="panel"><h3>Por escenario</h3>${rows}</div>
      <div class="panel"><h3>Tu voz en las simulaciones</h3>
        ${avgPpm ? `<div class="kpis two"><div class="kpi"><b>${avgPpm}</b><span>palabras por minuto (ideal ${M.PPM_RANGE[0]}–${M.PPM_RANGE[1]})</span></div><div class="kpi"><b>${avgMpm}</b><span>muletillas por minuto</span></div></div>`
        : `<p class="empty">Responde por voz en los turnos libres de una simulación para medir tu ritmo y tus muletillas.</p>`}
      </div>
      ${p ? `<p class="note">¿Sientes que ganaste confianza? Actualízala en <button class="linkish" data-act="tab" data-tab="ajustes">Ajustes</button>.</p>` : ""}
    </section>`;
}

/* ===================== VISTA: AJUSTES ===================== */
function sw(key, label, sub, disabled) {
  const on = !!progress.settings[key];
  return `<div class="setting"><div><p>${label}</p>${sub ? `<small>${sub}</small>` : ""}</div>
    <button class="switch" role="switch" aria-checked="${on}" aria-label="${esc(label)}" data-act="toggle" data-key="${key}" ${disabled ? "disabled" : ""}><span class="knob"></span></button></div>`;
}
function vAjustes() {
  const p = progress.profile, st = progress.settings, pa = paisObj();
  return `<section class="section"><div><p class="eyebrow">Configuración</p><h2>Ajustes</h2></div>
    ${S.toast ? `<p class="toast">${esc(S.toast)}</p>` : ""}
    <div class="panel"><h3>País</h3>
      <div class="setting"><div><p>${pa.bandera} ${esc(pa.nombre)}</p><small>${CAPA_TXT[pa.capa]} · trato habitual: ${esc(pa.trato)}${pa.capa === "borrador" ? " · puede tener errores" : ""}</small></div>
        <button class="btn" data-act="paisOpen">Cambiar</button></div></div>
    <div class="panel"><h3>${p ? "Tu perfil" : "Crea tu perfil"}</h3>${profileForm(p, p ? "Guardar cambios" : "Crear perfil")}</div>
    <div class="panel"><h3>Sonido</h3>
      ${sw("sound", "Sonidos de acierto y error", "Campanita al acertar, notas suaves al fallar.")}
      ${sw("clicks", "Sonido al tocar botones", "Un tic corto y neutro.", !st.sound)}</div>
    <div class="panel"><h3>Voz</h3>
      ${sw("autoSpeak", "Leer en voz alta a tu interlocutor", "En la simulación escucharás cada frase automáticamente.")}</div>
    <div class="panel"><h3>Tus datos</h3>
      <p class="note">Todo se guarda solo en este navegador. Si borras los datos del navegador o cambias de celular, se pierde.</p>
      ${S.confirm === "reset" ? `<div class="confirm"><span>¿Borrar tu progreso? Tu perfil se mantiene.</span><button class="btn danger" data-act="resetYes">Sí, borrar progreso</button><button class="btn ghost" data-act="cancelConfirm">Cancelar</button></div>`
        : `<button class="btn" data-act="resetAsk">Reiniciar progreso</button>`}
      ${S.confirm === "wipe" ? `<div class="confirm"><span>¿Borrar perfil, progreso y ajustes? No se puede deshacer.</span><button class="btn danger" data-act="wipeYes">Sí, borrar todo</button><button class="btn ghost" data-act="cancelConfirm">Cancelar</button></div>`
        : `<button class="btn danger" data-act="wipeAsk">Borrar todo</button>`}</div>
    <p class="note" style="text-align:center">Aura · prototipo en validación</p>
  </section>`;
}

/* ===================== EVENTOS ===================== */
document.addEventListener("click", onAct);
app.addEventListener("input", e => {
  if (e.target.id === "profConf") { const v = +e.target.value; const o = document.getElementById("confOut"); if (o) o.textContent = v + " · " + CONF_LABELS[v]; }
});
async function openScen(id, anim) {
  leaveSim(); S.sid = id; S.tab = "practica"; S.sub = null;
  if (!DATA.raw[id]) {
    S.view = "loading"; render();
    try { await ensureScen(id); }
    catch (e) { S.view = "list"; S.anim = "up"; render(); app.insertAdjacentHTML("afterbegin", `<p class="fb no" style="margin-top:16px">No se pudo cargar el escenario. Revisa tu conexión e intenta de nuevo.</p>`); return; }
  }
  go({ view: "scenario" }, anim || "right");
}
function onAct(e) {
  const el = e.target.closest("[data-act]"); if (!el || el.disabled) return;
  const a = el.dataset.act;
  if (!["pAnswer", "sAnswer", "sSubmit", "toggle", "saveProfile", "prToggle"].includes(a)) tick();
  switch (a) {
    case "tab": setTab(el.dataset.tab); break;
    case "brand": if (progress.profile && !S.obPrueba) setTab("inicio"); break;
    case "obNext": go({ ob: el.dataset.to }, "right"); break;
    case "obBack": go({ ob: el.dataset.to }, "left"); break;
    case "pickPais": {
      const id = el.dataset.id;
      if (!progress.profile) { S.paisSel = id; setPais(id); go({ ob: "perfil" }, "right"); }
      else { setPais(id); S.paisAuto = false; progress.dismiss.paisBanner = true; save(); S.toast = "País cambiado a " + paisObj().nombre + "."; go({ sub: null }, "left"); }
      break; }
    case "paisOpen": leaveSim(); go({ sub: "pais" }, "right"); break;
    case "subBack": stopPrueba(); S.pr = null; go({ sub: null }, "left"); break;
    case "dismissPais": progress.dismiss.paisBanner = true; save(); render(); break;
    case "prOpen": leaveSim(); S.pr = null; go({ sub: "prueba" }, "right"); break;
    case "prToggle": if (S.pr && S.pr.phase === "rec") prStop(); else prStart(); break;
    case "prRetry": S.pr = null; render(); break;
    case "prSkip": stopPrueba(); S.obPrueba = false; S.ob = null; S.pr = null; go({ tab: "inicio", sub: null }, "up"); break;
    case "prSave": {
      const r = S.pr.res;
      progress.baselines.push({ d: today(), ppm: r.ppm, mpm: r.mpm, words: r.words, uniq: r.uniq });
      if (progress.baselines.length > 24) progress.baselines = progress.baselines.slice(-24);
      markDay(); save(); chime();
      const wasOb = S.obPrueba; S.obPrueba = false; S.ob = null; S.pr = null;
      go(wasOb ? { tab: "inicio", sub: null } : { sub: null }, "up");
      break; }
    case "area": S.area = el.dataset.area; render(); break;
    case "list": leaveSim(); go({ tab: "practica", view: "list" }, "left"); break;
    case "open": { const back = ["practice", "sim", "results"].includes(S.view) && S.tab === "practica"; openScen(el.dataset.id || S.sid, back ? "left" : "right"); break; }
    case "pers": progress.pers[S.sid] = el.dataset.p; save(); render(); break;
    case "startPractice": if (el.dataset.id) S.sid = el.dataset.id; leaveSim(); startPractice(); break;
    case "startSim": if (el.dataset.id) S.sid = el.dataset.id; startSim(); break;
    case "retryPers": progress.pers[S.sid] = el.dataset.p; save(); startSim(); break;
    case "pAnswer": {
      const P = S.practice, q = P.qs[P.i], k = +el.dataset.k; P.answered = k;
      const ok = q.opts[k] === q.w.pro, cur = progress.words[q.w.id] || 0;
      progress.words[q.w.id] = ok ? Math.min(3, cur + 1) : Math.max(0, cur - 1);
      if (ok) { P.correct++; chime(); } else softMiss();
      markDay(); save(); render(); break; }
    case "pNext": {
      const P = S.practice;
      if (P.i < P.qs.length - 1) { P.i++; P.answered = null; S.anim = "right"; render(); }
      else { S.practiceDone = { sid: S.sid, correct: P.correct }; startSim(); }
      break; }
    case "speak": { const s = scen(); speak(s.sim.nodes[S.sim.node].say); break; }
    case "speakModel": { const h = S.sim.hist[S.sim.hist.length - 1]; if (h && h.model) speak(h.model); break; }
    case "mic": {
      const ta = document.getElementById("answer"), btn = document.getElementById("micBtn"), st = document.getElementById("micStatus");
      if (dict && dict.active) { dict.stop(); break; }
      recReset();
      const base = ta.value.trim();
      dict = Dictado({
        lang: paisObj().voz, keepAlive: false,
        onText: t => { ta.value = (base ? base + " " : "") + t; },
        onError: code => { st.textContent = micMsg(code); btn.classList.remove("rec"); btn.setAttribute("aria-pressed", "false"); },
        onEnd: d => { btn.classList.remove("rec"); btn.setAttribute("aria-pressed", "false"); if (d.text.trim()) { S.voiceMeta = { voice: true, seconds: d.seconds() }; st.textContent = "Listo. Revisa el texto y envía."; } }
      });
      dict.start();
      if (dict.active) { btn.classList.add("rec"); btn.setAttribute("aria-pressed", "true"); st.textContent = "Escuchando... toca de nuevo para terminar."; }
      break; }
    case "sAnswer": {
      const s = scen(), M2 = S.sim, node = s.sim.nodes[M2.node], k = +el.dataset.k;
      if (node.type === "choice") {
        const o = node.opts[k];
        answerTurn({ type: "choice", k, say: node.say, text: o.t, S: o.s, fb: o.fb, next: o.next !== undefined ? o.next : node.next });
      } else {
        const ok = k === 0, start = atSentenceStart(node.tpl);
        answerTurn({ type: "fill", k, say: node.say, S: ok ? 1 : 0, next: node.next,
          fb: (ok ? "Correcto. " : "Lo adecuado era «" + node.opts[0] + "». ") + node.fb,
          text: node.tpl.replace("___", start ? cap(node.opts[k]) : node.opts[k]) });
      }
      break; }
    case "sSubmit": {
      const s = scen(), M2 = S.sim, node = s.sim.nodes[M2.node], ta = document.getElementById("answer"), text = (ta.value || "").trim();
      stopDictado();
      if (!text) { document.getElementById("micStatus").textContent = "Escribe o dicta una respuesta antes de evaluar."; break; }
      const r = M.scoreFree(node, text, S.voiceMeta, s.weights, s.words, mulList());
      S.voiceMeta = null;
      answerTurn({ type: "free", say: node.say, text, S: r.S, r, model: node.model, next: node.next });
      break; }
    case "sNext": {
      const s = scen(), M2 = S.sim, last = M2.hist[M2.hist.length - 1];
      recReset(); stopDictado();
      if (last.next) { M2.node = last.next; M2.answered = false; S.voiceMeta = null; S.scrollTurn = true; render(); if (progress.settings.autoSpeak) speak(s.sim.nodes[M2.node].say); }
      else finishSim();
      break; }
    case "recStart": recStart(); break;
    case "recStop": recStop(); break;
    case "makeCard": el.disabled = true; el.textContent = "Creando..."; makeCard().then(b => { cardBlob = b; if (cardUrl) URL.revokeObjectURL(cardUrl); cardUrl = b ? URL.createObjectURL(b) : null; render(); }).catch(() => { el.disabled = false; el.textContent = "Crear tarjeta"; }); break;
    case "shareCard": shareCard(); break;
    case "saveProfile": saveProfile(); break;
    case "toggle": {
      const k = el.dataset.key; progress.settings[k] = !progress.settings[k]; save();
      if (progress.settings[k] && (k === "sound" || k === "clicks")) chime();
      render(); break; }
    case "resetAsk": S.confirm = "reset"; render(); break;
    case "wipeAsk": S.confirm = "wipe"; render(); break;
    case "cancelConfirm": S.confirm = null; render(); break;
    case "resetYes": progress = freshProgress(progress); save(); S.confirm = null; S.toast = "Progreso reiniciado."; S.practiceDone = null; S.view = "list"; render(); break;
    case "wipeYes": leaveSim(); progress = freshProgress(); save(); DATA.esc = {}; S = { tab: "inicio", view: "list", sub: null, anim: "up", ob: "bienvenida", area: "Todos" }; render(); break;
  }
}

/* ===================== ARRANQUE ===================== */
async function boot() {
  try {
    const [p, i] = await Promise.all([getJSON("data/paises.json"), getJSON("data/escenarios/index.json")]);
    DATA.paises = p; DATA.index = i;
  } catch (e) {
    app.innerHTML = `<section class="section"><h2>No pudimos abrir Aura</h2><p class="lead">Revisa tu conexión a internet y vuelve a intentarlo.</p><button class="btn primary" onclick="location.reload()">Reintentar</button></section>`;
    return;
  }
  if (progress.profile && !progress.pais) { progress.pais = guessPais() || "CL"; S.paisAuto = true; save(); }
  else if (progress.pais && !DATA.paises.paises.some(x => x.id === progress.pais)) { progress.pais = "CL"; save(); }
  try { if ("speechSynthesis" in window) speechSynthesis.getVoices(); } catch (e) {}
  render();
}
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); });
}
boot();
})();
