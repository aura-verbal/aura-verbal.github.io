/* Aura · interfaz. Requiere js/motor.js (window.AuraMotor).
   El contenido vive en data/: paises.json y escenarios/*.json. */
(function () {
"use strict";
const M = window.AuraMotor;

/* ===================== CONSTANTES ===================== */
const KEY = "aura.v1";
const DEFAULT_SETTINGS = { sound: true, clicks: true, autoSpeak: false, dark: false, narra: true };
const TABS = ["inicio", "presentaciones", "entrevistas", "progreso", "ajustes"];
/* Dos pilares: cada escenario conversacional vuelve a su pilar; los demás quedan como «Práctica extra» en Progreso. */
const PILAR = { presentacion: "presentaciones", disertacion: "presentaciones", entrevista: "entrevistas", practica: "entrevistas" };
const PILAR_NOM = { presentaciones: "Presentaciones", entrevistas: "Entrevistas", progreso: "Progreso", inicio: "Inicio" };
const pilarDe = id => PILAR[id] || "progreso";
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
const FOCOS = [["muletillas", "Las muletillas", "m"], ["palabras", "Encontrar la palabra precisa", "v"], ["ritmo", "El ritmo: hablo muy rápido o muy lento", "p"], ["ninguno", "Nada en particular", null]];
const RETO_VOCAB = 4;   // reto diario: 4 preguntas de vocabulario + 1 de «caza la muletilla»

/* ===================== ESTADO Y PERSISTENCIA ===================== */
function freshProgress(keep) {
  return {
    words: {}, sims: {}, history: [], days: [], baselines: [], pers: {}, dismiss: {}, retos: {}, prep: {},
    profile: (keep && keep.profile) || null, pais: (keep && keep.pais) || null,
    settings: Object.assign({}, DEFAULT_SETTINGS, (keep && keep.settings) || {})
  };
}
function load() {
  let raw = null; try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  const p = freshProgress();
  if (raw && typeof raw === "object") Object.assign(p, raw);
  p.settings = Object.assign({}, DEFAULT_SETTINGS, p.settings || {});
  ["words", "sims", "pers", "dismiss", "retos", "prep"].forEach(k => { if (!p[k] || typeof p[k] !== "object" || Array.isArray(p[k])) p[k] = {}; });
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
function bestStreak() {
  const ds = Array.from(new Set(progress.days)).sort(); let best = 0, run = 0;
  ds.forEach((d, i) => { run = i && daysBetween(ds[i - 1], d) === 1 ? run + 1 : 1; best = Math.max(best, run); });
  return best;
}
function levelOf(g) { let cur = LEVELS[0], next = null; LEVELS.forEach((l, i) => { if (g >= l[0]) { cur = l; next = LEVELS[i + 1] || null; } }); return { name: cur[1], next }; }
async function getJSON(url) { const r = await fetch(url, { cache: "no-cache" }); if (!r.ok) throw new Error(url + " " + r.status); return r.json(); }

/* ===================== TEMA (marfil o modo oscuro, elegido en Ajustes) ===================== */
function applyTheme() {
  const dark = !!progress.settings.dark, root = document.documentElement;
  if (dark) root.setAttribute("data-theme", "dark"); else root.removeAttribute("data-theme");
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", dark ? "#13110f" : "#f7f3ec");
}
/* Color por área: cada área tiene su tono (definido en index.html como --area-*). */
const AREA_KEY = { "Académico": "acad", "Laboral": "lab", "Ventas": "ven", "Social": "soc", "Cotidiano": "cot" };
function arCls(area) { return AREA_KEY[area] ? "ar-" + AREA_KEY[area] : ""; }

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
  let r = M.deepL(raw, paisId());
  const ps = M.prepSlots(r.prep, progress.prep[id]);
  r = M.fillSlots(r, ps.slots);
  if (ps.propio && r.simPropio) { r.sim = r.simPropio; r.propio = true; }
  delete r.simPropio; r.prepNota = ps.nota;
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

/* ===================== PREPARA TU ESCENARIO ===================== */
function focoOf() { return (progress.profile && progress.profile.foco) || null; }
/* El foco que eligió el usuario pesa 0,15 más en el puntaje de las respuestas libres. */
function weightsFoco(w) {
  const f = FOCOS.find(x => x[0] === focoOf()); if (!f || !f[2]) return w;
  const o = Object.assign({}, w); o[f[2]] += 0.15; const t = o.v + o.m + o.p;
  return { v: o.v / t, m: o.m / t, p: o.p / t };
}
function cuenta(fecha) {
  if (!fecha) return null; const d = daysBetween(today(), fecha);
  return d < 0 ? null : d === 0 ? "es hoy" : d === 1 ? "es mañana" : "en " + d + " días";
}
/* Próximo evento real (disertación, entrevista...) que el usuario anotó en algún escenario. */
function proximoEvento(maxDias) {
  let best = null;
  Object.entries(progress.prep).forEach(([sid, st]) => {
    if (!st || !st.fecha || !meta(sid) || !meta(sid).ready) return;
    const d = daysBetween(today(), st.fecha);
    if (d >= 0 && d <= (maxDias || 60) && (!best || d < best.d)) best = { sid, d, st };
  });
  return best;
}
function prepResumen(s) {
  const st = progress.prep[s.id] || {}, parts = [];
  if (st.skip) parts.push("Usando el ejemplo");
  else (s.prep || []).forEach(q => {
    if (q.tipo === "chips") { const o = q.opts.find(x => x.v === String(st[q.id] != null ? st[q.id] : q.def)) || q.opts[0]; parts.push(o.t); }
    else if (q.tipo === "texto") { const v = M.cleanSlot(st[q.id]); parts.push(v ? v : (q.modo === "propio" ? "tema de ejemplo" : q.def)); }
    else if (q.tipo === "fecha") { const c = cuenta(st[q.id]); if (c) parts.push(c.charAt(0).toUpperCase() + c.slice(1)); }
  });
  const f = FOCOS.find(x => x[0] === focoOf()); if (f && f[2]) parts.push("foco: " + f[1].toLowerCase().split(":")[0]);
  return parts;
}
/* Asistente conversacional: Aura pregunta de a una, el usuario toca su respuesta y Aura le contesta
   con lo que cambia (meta de palabras, cómo lo dirá el interlocutor...). */
const FOCO_ICON = {
  muletillas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5z"/><path d="M10 9l4 4M14 9l-4 4"/></svg>',
  palabras: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19l5-14 5 14M6 14h6"/><path d="M15 13.5c0-1.5 1.2-2.5 2.7-2.5s2.3.9 2.3 2.3V19M20 16c-3 0-5 .4-5 1.8 0 .9.7 1.4 1.7 1.4 1.8 0 3.3-1.3 3.3-3.2"/></svg>',
  ritmo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/><circle cx="12" cy="18" r="1.2"/></svg>',
  ninguno: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3z"/></svg>'
};
const FOCO_ECO = { muletillas: "Voy a ser más estricto con las muletillas.", palabras: "El vocabulario pesará más en tu puntaje.",
  ritmo: "Tu ritmo pesará más cuando respondas por voz.", ninguno: "Evaluación equilibrada, entonces." };
function addDays(n) { const d = new Date(); d.setDate(d.getDate() + n); return dayKey(d); }
function prepSteps(s) { return (s.prep || []).map(q => ({ id: q.id, q })).concat([{ id: "foco", foco: true }]); }
function prepStart(sid, edit) {
  const s = scenData(sid), st = progress.prep[sid] || {}, ans = {};
  (s.prep || []).forEach(q => { ans[q.id] = st[q.id] != null && !st.skip ? String(st[q.id]) : (q.tipo === "chips" ? q.def : ""); });
  ans.foco = focoOf() || "ninguno";
  S.prepW = { sid, step: edit ? 0 : -1, ans, eco: null, typing: false, otra: false, fresh: true };
}
function prepAnswerLabel(st, W) {
  const v = W.ans[st.id];
  if (st.foco) return FOCOS.find(f => f[0] === v)[1];
  const q = st.q;
  if (q.tipo === "chips") return (q.opts.find(o => o.v === v) || q.opts[0]).t;
  if (q.tipo === "texto") return v ? v : "Usar el ejemplo";
  const c = cuenta(v); return c ? c.charAt(0).toUpperCase() + c.slice(1) : "Sin fecha";
}
function prepEco(st, W) {
  const v = W.ans[st.id];
  if (st.foco) return esc(FOCO_ECO[v]);
  const q = st.q;
  if (q.tipo === "chips") {
    const o = q.opts.find(x => x.v === v) || q.opts[0]; if (!q.eco) return null;
    let t = q.eco.replace("{t}", o.t).replace(/\{([a-z_]+)\}/g, (m, k) => o[k] !== undefined && typeof o[k] !== "object" ? (k === "palabras" ? "§" : o[k]) : (o.slots && o.slots[k]) || m);
    t = esc(t);
    if (o.palabras) t = t.replace("§", `<b class="count" data-to="${o.palabras}">${o.palabras.toLocaleString("es-CL")}</b>`);
    return t;
  }
  if (q.tipo === "texto") return v ? esc((q.eco || "Anotado.").replace("{v}", v)) : (q.ecoVacio ? esc(q.ecoVacio) : null);
  return v ? `Anotado: ${esc(cuenta(v))}. Te aviso en Inicio con una cuenta regresiva y enfoco tu reto diario en esto.` : "Sin problema: puedes agregarla después.";
}
function prepCard(s) {
  if (!progress.prep[s.id] && (!S.prepW || S.prepW.sid !== s.id)) prepStart(s.id, false);
  const W = S.prepW && S.prepW.sid === s.id ? S.prepW : null;
  if (!W) return `<div class="prep-sum"><span class="eyebrow">Tu escenario</span><span class="prep-chips">${prepResumen(s).map(x => `<span class="tag quiet">${esc(x)}</span>`).join("")}</span><button class="linkish" data-act="prepEdit">Editar</button></div>`;
  const steps = prepSteps(s), n = steps.length, A = W.fresh ? " a" : "";
  const av = `<span class="pw-av" aria-hidden="true">Aa</span>`;
  const coach = (t, cls, id) => `<div class="pw-msg${cls || ""}"${id ? ` id="${id}"` : ""}>${av}<div class="bubble">${t}</div></div>`;
  const dots = `<span class="pw-dots" aria-label="Pregunta ${Math.min(n, Math.max(1, W.step + 1))} de ${n}">${steps.map((_, i) => `<i class="${i < W.step || W.step >= n ? "on" : i === W.step ? "cur" : ""}"></i>`).join("")}</span>`;
  let body = "";
  if (W.step === -1) {
    body = coach(`Antes de empezar, cuéntame de tu situación real y adapto la conversación a ti. Son ${n} preguntas rápidas.`, A, "pwNow")
      + `<div class="pw-opts${A}"><button class="pw-opt on" style="--i:0" data-act="pwGo" data-i="0">Vamos</button><button class="pw-opt" style="--i:1" data-act="pwSkip">Usar el ejemplo</button></div>`;
  } else {
    for (let i = 0; i < Math.min(W.step, n); i++) {
      const st = steps[i], last = i === W.step - 1;
      body += `<div class="pw-me${last && W.typing ? " a" : ""}"><small>${esc(st.foco ? "¿Qué te cuesta más al hablar?" : st.q.q)}</small><button data-act="pwGo" data-i="${i}" aria-label="Cambiar respuesta">${esc(prepAnswerLabel(st, W))}</button></div>`;
      if (last && W.eco) body += coach(W.eco, " eco" + (W.typing ? " a" : ""));
    }
    if (W.typing) body += `<div class="pw-msg a" id="pwNow">${av}<div class="bubble"><span class="typing" aria-label="Aura está escribiendo"><i></i><i></i><i></i></span></div></div>`;
    else if (W.step < n) {
      const st = steps[W.step], v = W.ans[st.id];
      if (st.foco) {
        body += coach("Última: ¿qué te cuesta más al hablar? Eso pesará más en tu puntaje, en todos los escenarios.", A, "pwNow")
          + `<div class="pw-focos${A}">${FOCOS.map((f, k) => `<button class="pw-foco${f[0] === v ? " on" : ""}" style="--i:${k}" data-act="pwPick" data-v="${f[0]}">${FOCO_ICON[f[0]]}<span>${esc(f[1])}</span></button>`).join("")}</div>`;
      } else if (st.q.tipo === "chips") {
        body += coach(esc(st.q.q), A, "pwNow") + `<div class="pw-opts${A}">${st.q.opts.map((o, k) => `<button class="pw-opt${o.v === v ? " on" : ""}" style="--i:${k}" data-act="pwPick" data-v="${esc(o.v)}">${esc(o.t)}</button>`).join("")}</div>`;
      } else if (st.q.tipo === "texto") {
        const prev = st.q.preview ? `<p class="pw-prev">${esc(s.person)} dirá: «${esc(st.q.preview).replace("{v}", `<b id="pwPrev">${esc(v || st.q.def)}</b>`)}»</p>` : "";
        body += coach(esc(st.q.q) + (st.q.ayuda ? `<span class="pw-sub">${esc(st.q.ayuda)}</span>` : ""), A, "pwNow")
          + `<div class="pw-input${A}"><input type="text" id="pwText" data-id="${st.id}" maxlength="60" placeholder="${esc(st.q.ph || "")}" value="${esc(v)}" enterkeyhint="next">${prev}
            ${st.q.sug ? `<div class="pw-opts flat">${st.q.sug.map((x, k) => `<button class="pw-opt sm" style="--i:${k}" data-act="pwSug" data-v="${esc(x)}">${esc(x)}</button>`).join("")}</div>` : ""}
            <div class="row"><button class="btn primary" data-act="pwText">Siguiente</button>${st.q.modo === "propio" || st.q.def ? `<button class="btn ghost" data-act="pwText" data-empty="1">${st.q.modo === "propio" ? "Usar el ejemplo" : "Omitir"}</button>` : ""}</div></div>`;
      } else {
        const quick = [["Mañana", addDays(1)], ["En una semana", addDays(7)], ["En dos semanas", addDays(14)]];
        body += coach(esc(st.q.q), A, "pwNow")
          + `<div class="pw-opts${A}">${quick.map(([t, d], k) => `<button class="pw-opt${v === d ? " on" : ""}" style="--i:${k}" data-act="pwPick" data-v="${d}">${t}</button>`).join("")}
              <button class="pw-opt${W.otra ? " on" : ""}" style="--i:3" data-act="pwOtra">Otra fecha</button><button class="pw-opt" style="--i:4" data-act="pwPick" data-v="">Sin fecha</button></div>
             ${W.otra ? `<div class="pw-input"><input type="date" id="pwDate" min="${addDays(0)}" value="${esc(v)}"><div class="row"><button class="btn primary" data-act="pwDate">Listo</button></div><p class="err" id="pwErr"></p></div>` : ""}`;
      }
    } else {
      const sum = prepResumenAns(s, W);
      body += `<div class="pw-final${A}" id="pwNow">${coach("¡Listo! Así quedó tu escenario:", "")}
        <div class="pw-tags">${sum.map((x, k) => `<span class="tag" style="--i:${k}">${esc(x)}</span>`).join("")}</div>
        <div class="row"><button class="btn primary" data-act="pwSave">Guardar y ver mi ficha</button><button class="btn ghost" data-act="pwGo" data-i="0">Revisar respuestas</button></div></div>`;
    }
  }
  return `<div class="panel prep pw" aria-live="polite"><div class="pw-head"><div><span class="eyebrow">Prepara tu escenario</span>${W.step >= 0 ? dots : ""}</div>
      ${W.step >= 0 ? `<button class="linkish" data-act="pwSkip">${progress.prep[s.id] ? "Cancelar" : "Saltar"}</button>` : ""}</div>${body}</div>`;
}
function prepResumenAns(s, W) {
  return prepSteps(s).map(st => { const l = prepAnswerLabel(st, W); return st.foco ? (W.ans.foco === "ninguno" ? null : "Foco: " + l.toLowerCase().split(":")[0]) : (st.q.tipo === "texto" && !W.ans[st.id] ? (st.q.modo === "propio" ? "Tema de ejemplo" : null) : (st.q.tipo === "fecha" && !W.ans[st.id] ? null : l)); }).filter(Boolean);
}
let pwTimer = null;
function pwAdvance(eco) {
  const W = S.prepW; W.eco = eco; W.step++; W.otra = false; W.typing = true; W.fresh = true; render();
  clearTimeout(pwTimer);
  pwTimer = setTimeout(() => { if (S.prepW !== W) return; W.typing = false; W.fresh = true; render(); const t = document.getElementById("pwText"); if (t) t.focus({ preventScroll: true }); }, eco ? 900 : 550);
}
function pwAnswer(v) {
  const W = S.prepW, s = scenData(W.sid), st = prepSteps(s)[W.step];
  W.ans[st.id] = v; pwAdvance(prepEco(st, W));
}
function prepSaveW() {
  const W = S.prepW, s = scenData(W.sid), st = {};
  (s.prep || []).forEach(q => {
    const v = W.ans[q.id] || "";
    if (q.tipo === "texto") st[q.id] = M.cleanSlot(v);
    else if (q.tipo === "fecha") { st[q.id] = v && daysBetween(today(), v) >= 0 ? v : ""; if (st[q.id]) st.evento = q.evento; }
    else st[q.id] = v || q.def;
  });
  const tq = (s.prep || []).find(q => q.tipo === "texto" && q.modo === "propio"); if (tq) st.tema = st[tq.id];
  progress.prep[W.sid] = st;
  if (progress.profile) progress.profile.foco = W.ans.foco === "ninguno" ? null : W.ans.foco;
  save(); delete DATA.esc[W.sid]; S.prepW = null; clearTimeout(pwTimer); fanfare();
  S.toast = "Listo: la conversación se adaptó a tu situación."; render();
}
function animateCounts() {
  document.querySelectorAll(".count[data-to]:not([data-done])").forEach(el => {
    el.dataset.done = "1"; const to = +el.dataset.to, t0 = performance.now(), dur = 900;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const step = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(to * e).toLocaleString("es-CL"); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

/* ===================== ICONOS ===================== */
const SVG_ATTR = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const S_ICONS = {
  presentacion: `<svg ${SVG_ATTR}><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20l4-4 4 4"/><path d="M7 12l3-3 2 2 4-4"/></svg>`,
  entrevista: `<svg ${SVG_ATTR}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></svg>`,
  venta: `<svg ${SVG_ATTR}><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg>`,
  cita: `<svg ${SVG_ATTR}><path d="M4 10h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-5z"/><path d="M16 12h2a2 2 0 0 1 0 4h-2"/><path d="M8 3c0 2 2 2 2 4M12 3c0 2 2 2 2 4"/></svg>`,
  disertacion: `<svg ${SVG_ATTR}><circle cx="12" cy="4.5" r="1.8"/><path d="M12 6.5V9"/><path d="M6 9h12l-1.5 8h-9L6 9z"/><path d="M12 17v4M8 21h8"/></svg>`,
  practica: `<svg ${SVG_ATTR}><path d="M2 9l10-5 10 5-10 5-10-5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/><path d="M22 9v6"/></svg>`,
  primerdia: `<svg ${SVG_ATTR}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M10 3v2h4V3"/><circle cx="12" cy="11" r="2.8"/><path d="M7.5 18c1-2.2 8-2.2 9 0"/></svg>`,
  devolucion: `<svg ${SVG_ATTR}><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>`,
  networking: `<svg ${SVG_ATTR}><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M14.5 15c.8-.6 1.6-1 2.5-1 2.8 0 5 2.2 5 5"/></svg>`,
  callcenter: `<svg ${SVG_ATTR}><path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/><path d="M19 20c0 1.1-1.8 2-4 2h-2"/></svg>`
};
const ICON_BOLT = `<svg ${SVG_ATTR}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>`;
const ICON_CHECK = `<svg ${SVG_ATTR}><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>`;
const AREA_ICONS = {
  "Académico": S_ICONS.presentacion, "Laboral": S_ICONS.entrevista, "Ventas": S_ICONS.venta, "Social": S_ICONS.cita,
  "Cotidiano": `<svg ${SVG_ATTR}><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>`
};
function iconFor(id, area) { return S_ICONS[id] || AREA_ICONS[area] || S_ICONS.cita; }
const ICON_SPEAK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
const ICON_SIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/></svg>';
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

/* ===================== ESCÚCHATE (grabar y reproducir) =====================
   En Android, pedir el micrófono "por defecto" activa el modo llamada (cancelación de eco y
   supresión de ruido), que recorta la voz y la deja entrecortada. Para grabarse no hace falta:
   se pide el audio sin ese procesamiento, se espera a que el dictado suelte el micrófono y se
   pausan los sonidos de la app mientras se graba. */
const Rec = { mr: null, stream: null, chunks: [], url: null, timer: null, t0: 0, msg: "", prep: false, stopping: false };
function recSupported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder); }
function recMime() {
  const c = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  try { return c.find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || ""; } catch (e) { return ""; }
}
function waitDictadoOff(ms) {
  return new Promise(res => { const t0 = Date.now(); (function chk() { if (!dict || !dict.active || Date.now() - t0 > ms) res(); else setTimeout(chk, 50); })(); });
}
async function recStart() {
  if (Rec.prep || Rec.mr) return;
  if (!recSupported()) { Rec.msg = "Tu navegador no permite grabar audio."; paintRec(); return; }
  Rec.prep = true; Rec.msg = ""; paintRec();
  stopDictado(); try { speechSynthesis.cancel(); } catch (e) {}
  await waitDictadoOff(800);
  await new Promise(r => setTimeout(r, 250));   // el reconocedor de Android tarda un poco en soltar el micrófono
  try { if (actx && actx.state === "running") await actx.suspend(); } catch (e) {}
  const raw = { echoCancellation: false, noiseSuppression: false, autoGainControl: true, channelCount: 1 };
  try { Rec.stream = await navigator.mediaDevices.getUserMedia({ audio: raw }); }
  catch (e) {
    try { Rec.stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e2) { Rec.prep = false; Rec.msg = "No pudimos usar el micrófono. Revisa el permiso del navegador."; recRelease(); paintRec(); return; }
  }
  Rec.chunks = [];
  const mime = recMime(), o = { audioBitsPerSecond: 96000 }; if (mime) o.mimeType = mime;
  try { Rec.mr = new MediaRecorder(Rec.stream, o); }
  catch (e) { try { Rec.mr = new MediaRecorder(Rec.stream); } catch (e2) { Rec.prep = false; Rec.msg = "No se pudo iniciar la grabación."; recRelease(); paintRec(); return; } }
  Rec.mr.ondataavailable = e => { if (e.data && e.data.size) Rec.chunks.push(e.data); };
  Rec.mr.onstart = () => { Rec.prep = false; Rec.t0 = Date.now(); paintRec(); };
  Rec.mr.onstop = () => {
    const type = (Rec.mr && Rec.mr.mimeType) || mime || "audio/webm";
    if (Rec.url) URL.revokeObjectURL(Rec.url);
    Rec.url = Rec.chunks.length ? URL.createObjectURL(new Blob(Rec.chunks, { type })) : null;
    if (!Rec.url) Rec.msg = "No se grabó audio. Intenta de nuevo, más cerca del micrófono.";
    recRelease(); paintRec();
  };
  Rec.mr.start(500);   // entrega el audio en trozos de medio segundo: si algo falla, no se pierde todo
  Rec.timer = setInterval(() => {
    if (!Rec.t0) return;
    const s = (Date.now() - Rec.t0) / 1000, el = document.getElementById("recTime");
    if (el) el.textContent = fmtSec(s);
    if (s >= 45) recStop();
  }, 250);
}
/* Al tocar «Detener» se graba medio segundo más para no cortar la última palabra. */
function recStop(now) {
  if (!Rec.mr || Rec.mr.state === "inactive" || Rec.stopping) return;
  const mr = Rec.mr;
  const fin = () => { Rec.stopping = false; try { if (mr.state !== "inactive") mr.stop(); } catch (e) {} };
  if (now) { fin(); return; }
  Rec.stopping = true; paintRec(); setTimeout(fin, 500);
}
function recRelease() {
  clearInterval(Rec.timer); Rec.timer = null;
  if (Rec.stream) Rec.stream.getTracks().forEach(t => t.stop());
  Rec.stream = null; Rec.mr = null; Rec.prep = false; Rec.stopping = false; Rec.t0 = 0;
  try { if (actx && actx.state === "suspended") actx.resume(); } catch (e) {}
}
function recReset() { if (Rec.mr) { Rec.mr.onstop = null; recStop(true); } recRelease(); if (Rec.url) URL.revokeObjectURL(Rec.url); Rec.url = null; Rec.msg = ""; }
function escuchateHTML() {
  const live = !!Rec.mr || Rec.prep;
  return `<p class="hint"><b>Escúchate:</b> di la respuesta modelo en voz alta, grábate y compárate.</p>
    <div class="row">${live && !Rec.t0
      ? `<button class="btn" disabled>${ICON_MIC} Preparando micrófono...</button>`
      : live
      ? `<button class="btn" data-act="recStop" ${Rec.stopping ? "disabled" : ""}>${ICON_STOP} ${Rec.stopping ? "Guardando..." : "Detener"} <span class="rec-dot" aria-hidden="true"></span> <span class="mono" id="recTime">${fmtSec((Date.now() - (Rec.t0 || Date.now())) / 1000)}</span></button>`
      : `<button class="btn" data-act="recStart">${ICON_MIC} ${Rec.url ? "Grabar de nuevo" : "Grabarme"}</button>`}
      <button class="btn ghost" data-act="speakModel">${ICON_SPEAK} Escuchar modelo</button></div>
    ${Rec.url && !live ? `<audio controls src="${Rec.url}"></audio>` : ""}
    ${live && Rec.t0 ? `<p class="note">Grabando. Habla a unos 20 cm del celular.</p>` : ""}
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
  const P = progress.settings.dark
    ? { bg: "#13110f", glow: "rgba(224,138,92,.24)", glow0: "rgba(224,138,92,0)", g: ["#f3b993", "#e08a5c", "#a84d24"], acc: "#e08a5c", fg: "#f3ede4", muted: "#a9a093" }
    : { bg: "#f7f3ec", glow: "rgba(227,154,114,.30)", glow0: "rgba(227,154,114,0)", g: ["#e39a72", "#a84d24", "#7a3211"], acc: "#a84d24", fg: "#1c1a17", muted: "#6b6358" };
  g.fillStyle = P.bg; g.fillRect(0, 0, W, H);
  const rg = g.createRadialGradient(540, 600, 40, 540, 600, 760); rg.addColorStop(0, P.glow); rg.addColorStop(1, P.glow0);
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  const gold = g.createLinearGradient(330, 390, 750, 810); gold.addColorStop(0, P.g[0]); gold.addColorStop(.55, P.g[1]); gold.addColorStop(1, P.g[2]);
  g.strokeStyle = gold; g.lineWidth = 16; g.beginPath(); g.arc(540, 600, 200, 0, Math.PI * 2); g.stroke();
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = gold; g.font = '700 160px "Playfair Display", Georgia, serif'; g.fillText("Aa", 540, 612);
  g.fillStyle = P.acc; g.font = '700 46px "Atkinson Hyperlegible", sans-serif';
  if ("letterSpacing" in g) g.letterSpacing = "14px";
  g.fillText("AURA", 547, 880);
  if ("letterSpacing" in g) g.letterSpacing = "0px";
  g.fillStyle = P.fg; g.font = '700 86px "Playfair Display", Georgia, serif';
  const lines = wrapLines(g, end.title, 900);
  let y = 1040; lines.forEach(l => { g.fillText(l, 540, y); y += 104; });
  g.fillStyle = P.muted; g.font = '400 42px "Atkinson Hyperlegible", sans-serif';
  g.fillText(s.name + " · " + PERS.find(p => p[0] === R.pers)[1], 540, y + 20);
  const sg = g.createLinearGradient(400, 1390, 680, 1610); sg.addColorStop(0, P.g[0]); sg.addColorStop(1, P.g[1]);
  g.fillStyle = sg; g.font = '800 230px "Playfair Display", Georgia, serif'; g.fillText(String(R.simScore), 540, 1500);
  g.fillStyle = P.acc; g.font = '700 44px "Atkinson Hyperlegible", sans-serif'; g.fillText("puntos de 100", 540, 1660);
  g.fillStyle = P.muted; g.font = '400 36px "Atkinson Hyperlegible", sans-serif'; g.fillText("Entrena cómo suenas · aura-verbal.github.io", 540, 1820);
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
let rendering = false;
function render() {
  if (!DATA.index || rendering) return;
  rendering = true;
  try { renderNow(); } finally { rendering = false; }
}
function renderNow() {
  const onb = !progress.profile || !!S.obPrueba;
  document.body.classList.toggle("onboarding", onb);
  let html;
  if (onb) html = vOnboarding();
  else if (S.sub === "prueba") html = vPrueba(false);
  else if (S.sub === "pais") html = vPais(false);
  else if (S.sub === "reto") html = vReto();
  else if (S.sub === "pres") html = vPres();
  else if (S.sub === "video") html = vVideo();
  else if (S.sub === "pitch") html = vPitch();
  else if (S.sub === "ent") html = vEnt();
  else if (S.tab === "inicio") html = vInicio();
  else if (S.tab === "presentaciones") html = vPresHub();
  else if (S.tab === "entrevistas") html = vEntrevistas();
  else if (S.tab === "progreso") html = vProgreso();
  else if (S.tab === "ajustes") html = vAjustes();
  else html = S.view === "list" ? vList() : S.view === "loading" ? vLoading() : S.view === "scenario" ? vScenario()
    : S.view === "practice" ? vPractice() : S.view === "sim" ? vSim() : vResults();
  app.innerHTML = `<div class="view${S.anim ? " anim-" + S.anim : ""}">${html}</div>`;
  const scrollTurn = S.scrollTurn; S.scrollTurn = false;
  if (S.anim) window.scrollTo({ top: 0 });
  S.anim = null; S.toast = null;
  const nt = navTab();
  document.querySelectorAll(".nav button, .top [data-tab]").forEach(b => { const on = b.dataset.tab === nt; b.classList.toggle("on", on); if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  if (S.tab === "practica" && S.view === "results") requestAnimationFrame(() => requestAnimationFrame(() => { const b = document.getElementById("newBar"); if (b) b.style.width = b.dataset.w + "%"; }));
  if (scrollTurn) { const el = document.getElementById("turnoActual"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }
  if (S.sub === "prueba" || S.ob === "prueba") paintPrueba();
  if (S.sub === "video") vidAfterRender(); else if (Vid.stream) vidStop();
  if (S.prepW && S.prepW.fresh) {
    S.prepW.fresh = false;
    const now = document.getElementById("pwNow");
    if (now && S.prepW.step >= 0) { const r = now.getBoundingClientRect(); if (r.bottom > innerHeight - 90 || r.top < 70) now.scrollIntoView({ behavior: "smooth", block: "center" }); }
  }
  animateCounts();
}
/* Pestaña que se marca en la barra: el flujo de presentación es de Presentaciones; un escenario, de su pilar. */
function navTab() {
  if (S.sub === "pitch" || S.sub === "ent" || S.sub === "video" && ["pitch", "entrevistas"].includes(S.vidFrom)) return "entrevistas";
  if (S.sub === "pres" || S.sub === "video") return "presentaciones";
  if (S.sub === "prueba") return "progreso";
  if (S.tab === "practica") return pilarDe(S.sid);
  return S.tab;
}
function go(patch, anim) { S.cvHecho = null; S.ptOk = false; Object.assign(S, patch); S.anim = anim || "up"; render(); }
function setTab(t) {
  if (t === S.tab && !S.sub) { if (t === "practica" && S.view !== "list") { leaveSim(); go({ view: "list" }, "left"); } return; }
  const dir = TABS.indexOf(t) >= TABS.indexOf(S.tab) ? "right" : "left";
  leaveSim(); S.confirm = null;
  if (t === "practica" && (S.view === "results" || S.view === "loading")) S.view = "list";
  go({ tab: t, sub: null }, dir);
}
function leaveSim() { vidStop(); presMicStop(); entMicStop(); escStop(); clearTimeout(pwTimer); stopDictado(); recReset(); stopPrueba(); try { speechSynthesis.cancel(); } catch (e) {} }

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

/* ===================== ESCENA DE APERTURA =====================
   4 imágenes con movimiento suave (efecto Ken Burns), subtítulos con los datos del usuario y
   narración opcional con la voz del celular. Las imágenes se descargan solo al reproducir. */
const Esc = { sid: null, i: 0, playing: false, done: false, timer: null };
const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
const ICON_MUTE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>';
function escDur(f) {
  const words = String(f.t || "").split(/\s+/).length;
  return Math.max((f.dur || 4.2), progress.settings.narra ? words / 2.4 + 1.2 : words / 3.2 + 1.6) * 1000;
}
function escStop() { clearTimeout(Esc.timer); Esc.timer = null; if (Esc.playing) { try { speechSynthesis.cancel(); } catch (e) {} } Esc.playing = false; }
function escenaCard(s) {
  const E = s.escena; if (!E || !E.frames || !E.frames.length) return "";
  const n = E.frames.length, mine = Esc.sid === s.id, secs = Math.round(E.frames.reduce((a, f) => a + escDur(f), 0) / 1000);
  const state = mine && Esc.playing ? "play" : mine && Esc.done ? "done" : "idle";
  const frames = E.frames.map((f, i) => `<div class="esc-f mov-${esc(f.mov || "in")}${state !== "idle" && i === Esc.i ? " on kb" : state === "done" && i === Esc.i ? " on" : ""}" data-i="${i}" style="--d:${escDur(f)}ms">
      <img src="${esc(f.img)}" alt="" ${i === 0 ? 'loading="lazy"' : 'loading="lazy" data-later="1"'} decoding="async"></div>`).join("");
  const segs = E.frames.map((f, i) => `<i class="${state === "done" || (state === "play" && i < Esc.i) ? "done" : state === "play" && i === Esc.i ? "cur" : ""}" style="--d:${escDur(f)}ms"></i>`).join("");
  const sub = state === "play" ? esc(E.frames[Esc.i].t) : "";
  const overlay = state === "idle"
    ? `<button class="esc-cover" data-act="escPlay"><span class="esc-playbtn">${ICON_PLAY}</span><span><b>Mira tu escena</b><small>${secs} segundos · así empieza tu situación</small></span></button>`
    : state === "done"
    ? `<div class="esc-cover end"><div class="row"><button class="btn primary" data-act="startPractice">Empezar práctica</button><button class="btn" data-act="escPlay">Volver a ver</button></div></div>` : "";
  return `<div class="esc ${state}" id="esc" data-sid="${s.id}">
    <div class="esc-stage">${frames}<div class="esc-shade"></div>
      <div class="esc-segs" aria-hidden="true">${segs}</div>
      ${state === "play" ? `<button class="esc-tap prev" data-act="escPrev" aria-label="Cuadro anterior"></button><button class="esc-tap next" data-act="escNext" aria-label="Cuadro siguiente"></button>
        <div class="esc-tools"><button class="esc-ic" data-act="escVoz" aria-pressed="${!!progress.settings.narra}" aria-label="${progress.settings.narra ? "Silenciar narración" : "Activar narración"}">${progress.settings.narra ? ICON_SPEAK : ICON_MUTE}</button><button class="esc-skip" data-act="escSkip">Saltar</button></div>` : ""}
      <p class="esc-sub" id="escSub" aria-live="polite">${sub}</p>
      ${overlay}</div></div>`;
}
function escGo(i) {
  const s = scenData(Esc.sid); if (!s || !s.escena) return;
  const fr = s.escena.frames; clearTimeout(Esc.timer); try { speechSynthesis.cancel(); } catch (e) {}
  if (i >= fr.length) { Esc.playing = false; Esc.done = true; Esc.i = fr.length - 1; render(); return; }
  Esc.i = Math.max(0, i); Esc.playing = true; Esc.done = false;
  const root = document.getElementById("esc");
  if (!root || root.dataset.sid !== Esc.sid || !root.classList.contains("play")) render();
  else {
    root.querySelectorAll(".esc-f").forEach((el, k) => { el.classList.toggle("on", k === Esc.i); if (k === Esc.i) { el.classList.remove("kb"); void el.offsetWidth; el.classList.add("kb"); } });
    root.querySelectorAll(".esc-segs i").forEach((el, k) => { el.className = k < Esc.i ? "done" : k === Esc.i ? "cur" : ""; if (k === Esc.i) { void el.offsetWidth; } });
    const sub = document.getElementById("escSub"); if (sub) { sub.classList.remove("in"); void sub.offsetWidth; sub.textContent = fr[Esc.i].t; sub.classList.add("in"); }
  }
  const nx = fr[Esc.i + 1]; if (nx) { const im = new Image(); im.src = nx.img; }
  if (progress.settings.narra) speak(fr[Esc.i].t);
  Esc.timer = setTimeout(() => { if (Esc.playing && Esc.sid === s.id) escGo(Esc.i + 1); }, escDur(fr[Esc.i]));
}
function escPlay(sid) {
  const s = scenData(sid); if (!s || !s.escena) return;
  Esc.sid = sid; Esc.i = 0; Esc.playing = true; Esc.done = false;
  s.escena.frames.forEach(f => { const im = new Image(); im.src = f.img; });
  render(); escGo(0);
}

/* ===================== RETO DIARIO ===================== */
/* 5 preguntas al día: 4 de vocabulario (primero las palabras a medio dominar, luego las nuevas,
   máximo una por escenario) y 1 de «caza la muletilla» de tu país. Las preguntas dependen de la fecha
   y del país, así que el reto del día es el mismo aunque cierres y vuelvas a abrir la app. */
function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { return function () { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function sShuffle(a, r) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function retoHoy() { return progress.retos[today()] || null; }
function retosCount() { return Object.keys(progress.retos).length; }
function frasesCazar() { const c = DATA.paises.cazar || {}; return c[paisId()] || c.base || []; }
async function startReto() {
  S.reto = { loading: true }; go({ sub: "reto" }, "right");
  try { await Promise.all(listReady().map(x => ensureScen(x.id))); }
  catch (e) { S.reto = { error: true }; render(); return; }
  const ev = proximoEvento(14), foco = ev ? ev.sid : null;
  const r = rng(hashStr(today() + "|" + paisId() + "|" + (foco || "")));
  const all = []; listReady().forEach(x => { const s = scenData(x.id); s.words.forEach(w => all.push({ w, s })); });
  const lvl = it => progress.words[it.w.id] || 0;
  const pri = it => { const l = lvl(it); return l === 1 || l === 2 ? 0 : l === 0 ? 1 : 2; };
  const pool = sShuffle(all, r).sort((a, b) => pri(a) - pri(b));
  const picks = [], used = new Set();
  if (foco) for (const it of pool) { if (picks.length >= RETO_VOCAB - 1) break; if (it.s.id === foco) picks.push(it); }
  if (foco) used.add(foco);
  for (const it of pool) { if (picks.length >= RETO_VOCAB) break; if (!used.has(it.s.id)) { used.add(it.s.id); picks.push(it); } }
  for (const it of pool) { if (picks.length >= RETO_VOCAB) break; if (!picks.includes(it)) picks.push(it); }
  const qs = picks.map((it, i) => ({ kind: i % 2 === 0 ? "context" : "fill", w: it.w, s: it.s, opts: sShuffle([it.w.pro].concat(it.w.d), r) }));
  const fr = frasesCazar();
  if (fr.length) { const f = fr[Math.floor(r() * fr.length)]; qs.splice(1 + Math.floor(r() * qs.length), 0, { kind: "mul", f, opts: sShuffle([f.m].concat(f.o), r) }); }
  S.reto = { qs, i: 0, answered: null, correct: 0 };
  if (S.sub === "reto") { S.anim = "right"; render(); }
}
function weekStrip() {
  const L = ["D", "L", "M", "M", "J", "V", "S"], d = new Date(); d.setDate(d.getDate() - 6); let out = "";
  for (let i = 0; i < 7; i++) {
    const k = dayKey(d), r = progress.retos[k], t = k === today(), pr = !r && progress.days.includes(k);
    out += `<span class="wd${r ? " on" : pr ? " prac" : ""}${t ? " today" : ""}"><i>${r ? "✓" : pr ? "•" : ""}</i><small>${t ? "Hoy" : L[d.getDay()]}</small></span>`;
    d.setDate(d.getDate() + 1);
  }
  const n = Object.keys(progress.retos).filter(k => daysBetween(k, today()) < 7).length;
  return `<div class="week" role="img" aria-label="Retos de los últimos 7 días: ${n} de 7">${out}</div>`;
}
function eventoCard() {
  const ev = proximoEvento(60); if (!ev) return "";
  const m = meta(ev.sid), t = ev.st.tema ? M.cleanSlot(ev.st.tema) : "";
  const title = ev.d === 0 ? `Hoy es ${ev.st.evento}` : ev.d === 1 ? `Mañana es ${ev.st.evento}` : `Faltan ${ev.d} días para ${ev.st.evento}`;
  return `<button class="card evento ${arCls(m.area)}" data-act="open" data-id="${ev.sid}"><span class="tag">${ev.d <= 1 ? "Último ensayo" : "Cuenta regresiva"}</span>
    <span class="card-head"><span class="s-icon">${iconFor(ev.sid, m.area)}</span><span><h3>${esc(title)}</h3><span class="meta">${esc(t ? "Tema: " + t : tx(m.name))}. ${ev.d <= 14 ? "Tu reto diario ya está enfocado en esto." : "Ensaya un poco cada día."}</span></span></span>
    <span class="cta">Ensayar →</span></button>`;
}
function retoCard() {
  const rh = retoHoy();
  if (rh) return `<div class="card reto done"><span class="card-head"><span class="s-icon">${ICON_CHECK}</span><span><h3>Reto de hoy completado</h3><span class="meta">${rh.ok} de ${rh.n} correctas. Vuelve mañana por uno nuevo.</span></span></span>${weekStrip()}</div>`;
  return `<button class="card reto" data-act="retoStart"><span class="tag">Reto diario · ${RETO_VOCAB + 1} preguntas</span>
    <span class="card-head"><span class="s-icon">${ICON_BOLT}</span><span><h3>Tu reto de hoy</h3><span class="meta">${(() => { const ev = proximoEvento(14); return ev ? "Hoy enfocado en " + esc(ev.st.evento) + " (" + esc(cuenta(ev.st.fecha)) + ")." : "Repasa palabras que aún no dominas y caza una muletilla."; })()} Menos de 5 minutos.</span></span></span>
    ${weekStrip()}<span class="cta">${streak() > 0 ? "Mantén tu racha" : "Empezar"} →</span></button>`;
}
function vReto() {
  const R = S.reto, head = `<button class="back" data-act="subBack">← Inicio</button>`;
  if (!R || R.loading) return vLoading();
  if (R.error) return `<section class="section">${head}<p class="fb no">No se pudo preparar el reto. Revisa tu conexión e intenta de nuevo.</p></section>`;
  const n = R.qs.length;
  if (R.done) {
    const ok = R.correct, st = streak();
    const msg = ok === n ? "Perfecto. Así se entrena." : ok >= n - 1 ? "Muy bien, casi perfecto." : "Las palabras que fallaste volverán a aparecer en los próximos retos: así se aprenden.";
    return `<section class="section">${head}
      <div class="panel"><span class="eyebrow">Reto de hoy</span><h2><span class="mono">${ok}/${n}</span> correctas</h2><p class="lead">${msg}</p>
        <div class="kpis two"><div class="kpi"><b>${st}</b><span>${st === 1 ? "día seguido" : "días seguidos"}</span></div><div class="kpi"><b>${retosCount()}</b><span>${retosCount() === 1 ? "reto completado" : "retos completados"}</span></div></div>
        ${weekStrip()}</div>
      <div class="row"><button class="btn primary" data-act="tab" data-tab="inicio">Volver al inicio</button><button class="btn" data-act="tab" data-tab="presentaciones">Ir a los escenarios</button></div></section>`;
  }
  const q = R.qs[R.i], answered = R.answered !== null;
  const right = q.kind === "mul" ? q.f.m : q.w.pro;
  const start = q.kind === "fill" && atSentenceStart(q.w.ex);
  const optsHTML = q.opts.map((o, k) => {
    let cls = "opt"; if (answered) { if (o === right) cls += " ok"; else if (k === R.answered) cls += " no"; }
    return `<button class="${cls}" data-act="rAnswer" data-k="${k}" ${answered ? "disabled" : ""}>${esc(start ? cap(o) : o)}</button>`; }).join("");
  let tag, prompt, fb = "";
  if (q.kind === "mul") {
    tag = "Caza la muletilla";
    prompt = `<p class="hint">¿Qué palabra sobra en esta frase?</p><h3 class="frase">«${esc(q.f.t)}»</h3>`;
  } else if (q.kind === "context") {
    tag = "Sube el registro";
    prompt = `<p class="hint">En ${esc(q.s.short)}, ¿qué usarías en lugar de…</p><h2>«${esc(q.w.col)}»</h2>`;
  } else {
    tag = "Completa la frase";
    prompt = `<p class="hint">${esc(q.s.name)} · completa la frase:</p><h3 class="frase">${fillHTML(q.w.ex, answered ? (start ? cap(q.w.pro) : q.w.pro) : null)}</h3>`;
  }
  if (answered) {
    const ok = q.opts[R.answered] === right;
    const body = q.kind === "mul"
      ? `<b>${ok ? "Exacto." : "Era «" + esc(q.f.m) + "»."}</b> «${esc(q.f.m)}» es una muletilla: no aporta información. En su lugar, haz una pausa breve; se escucha más seguro.`
      : `<b>${ok ? "Correcto." : "Mejor: «" + esc(q.w.pro) + "»."}</b> ${esc(q.w.why)} <span class="muted">Escenario: ${esc(q.s.name)}.</span>`;
    fb = `<div class="fb ${ok ? "ok" : "no"}">${body}</div>
      <div class="row"><button class="btn primary" data-act="rNext">${R.i < n - 1 ? "Siguiente" : "Ver resultado"}</button></div>`;
  }
  return `<section class="section">${head}
    <div><p class="eyebrow">Reto diario</p><h2>5 minutos para sonar mejor</h2></div>
    <div class="panel">
      <div class="qmeta"><span class="tag">${tag}</span><span class="mono muted">${R.i + 1} / ${n}</span></div>
      <div class="dotsprog">${R.qs.map((x, k) => `<i class="${k < R.i || (k === R.i && answered) ? "done" : ""}"></i>`).join("")}</div>
      ${prompt}
      <div class="opts">${optsHTML}</div>
      ${fb}
    </div></section>`;
}

/* ===================== MI PRESENTACIÓN =====================
   Plan gratis: el usuario trae su presentación (PowerPoint, PDF, Word o guion pegado) y Aura
   arma un plan de estudio según los días que faltan, con sesiones guiadas. Motor en js/pres.js. */
const PR = window.AuraPres;
const PRES_TIPO = { apertura: "Apertura", idea: "Idea", cierre: "Cierre" };
const MIN_OPTS = [3, 5, 7, 10, 15, 20];
const PLAN_NOM = { expres: "exprés", estructurado: "estructurado", espaciado: "espaciado" };
const DIA_OPTS = [[15, "15 min"], [30, "30 min"], [60, "1 hora o más"]];
const NIVELES = ["Léelo en voz alta", "Con huecos", "Solo primeras letras", "Solo palabras clave", "Sin ayuda"];
const TRABA = ["Tres tristes tigres tragaban trigo en un trigal.", "Pablito clavó un clavito en la calva de un calvito.", "El perro de San Roque no tiene rabo porque Ramón Ramírez se lo ha robado."];
const SES_ICON = {
  lectura: `<svg ${SVG_ATTR}><path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4z"/><path d="M20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z"/></svg>`,
  bloques: `<svg ${SVG_ATTR}><rect x="3" y="4" width="18" height="4" rx="1.5"/><rect x="3" y="10" width="18" height="4" rx="1.5"/><rect x="3" y="16" width="11" height="4" rx="1.5"/></svg>`,
  ancla: `<svg ${SVG_ATTR}><circle cx="12" cy="5" r="2"/><path d="M12 7v14M5 13a7 7 0 0 0 14 0M8 11h8"/></svg>`,
  tarjetas: `<svg ${SVG_ATTR}><rect x="6" y="3" width="13" height="16" rx="2"/><path d="M4 7v12a2 2 0 0 0 2 2h10"/></svg>`,
  ensayo: `<svg ${SVG_ATTR}><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>`,
  preguntas: `<svg ${SVG_ATTR}><path d="M4 5h16v11H9l-5 4V5z"/><path d="M10 9a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.2M12 14h.01"/></svg>`,
  calentamiento: `<svg ${SVG_ATTR}><path d="M12 3c2 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.6 1.2 2.5 2.2 2.5C11 7 11 5 12 3z"/></svg>`,
  relevo: `<svg ${SVG_ATTR}><path d="M4 12h11"/><path d="M11 7l5 5-5 5"/><path d="M20 5v14"/></svg>`
};
/* Texto con los conectores resaltados (y sus alternativas al pasar el dedo o el mouse). */
function conHTML(text) {
  const t = String(text || ""), cs = PR.conectores(t); let out = "", last = 0;
  cs.forEach(c => { const alt = PR.alternativas(c.fn, c.canon).slice(0, 3).join(", ");
    out += esc(t.slice(last, c.start)) + `<mark class="con" title="${esc(PR.CONECTORES[c.fn].nombre + (alt ? " · también: " + alt : ""))}">${esc(t.slice(c.start, c.end))}</mark>`; last = c.end; });
  return (out + esc(t.slice(last))).replace(/\n/g, "<br>");
}
function pres() { return progress.pres || null; }
function presPlan(p) { p = p || pres(); return p && p.fecha && p.bloques && p.bloques.length ? PR.plan(p.fecha, today(), p.minDia || 30) : null; }
function presSesiones(pl) { return pl ? pl.dias.reduce((a, d) => a.concat(d.ses.map(s => Object.assign({ dia: d }, s))), []) : []; }
function presHoy(p) { const pl = presPlan(p); if (!pl) return null; return presSesiones(pl).filter(s => s.dia.f === today()).find(s => !p.done[s.id]) || null; }
function presCuenta(p) { const d = daysBetween(today(), p.fecha); return d < 0 ? "ya pasó" : d === 0 ? "es hoy" : d === 1 ? "es mañana" : "en " + d + " días"; }
/* Revisa el último intento del bloque actual (con las palabras que el usuario marcó «Lo dije»). */
function presEval() {
  const P = S.ps, p = pres(), b = pbFind(P.blocks[P.i]);
  P.res = PR.revisar(P.dicho || "", presTxt(b), b.claves, p.alias, P.oidas);
}
function revHTML() {
  const P = S.ps; if (!P.res || !P.res.toks) return "";
  const pend = P.res.miss, marc = (P.oidas || []);
  if (P.escrito) return pend.length ? `<div class="rev"><p class="eyebrow">Revisión</p><p class="fd rev-t">${P.res.toks.map(x => x.miss ? `<mark class="miss">${esc(x.t)}</mark>` : esc(x.t)).join(" ")}</p><p class="note">En rojo, lo que no escribiste.</p></div>` : "";
  if (!pend.length && !marc.length) return "";
  const chips = pend.map(x => ({ ...x, on: false })).concat(marc.map(w => ({ w, label: (P.oLabel || {})[w] || w, on: true })));
  return `<div class="rev"><p class="eyebrow">Revisión</p>
    ${pend.length ? `<p class="fd rev-t">${P.res.toks.map(x => x.miss ? `<mark class="miss">${esc(x.t)}</mark>` : esc(x.t)).join(" ")}</p>` : ""}
    <p class="note">${pend.length ? "En rojo, lo que no escuché. " : ""}¿Lo dijiste y el micrófono no lo captó? Toca la palabra y la cuento.</p>
    <div class="miss-chips">${chips.map(x => `<button class="miss-chip${x.on ? " on" : ""}" data-act="psOida" data-w="${esc(x.w)}" data-l="${esc(x.label)}" aria-pressed="${x.on}">${x.on ? "✓ " : ""}${esc(x.label)}${x.on ? " · lo dije" : ""}</button>`).join("")}</div>
    ${P.aprendi ? `<p class="note good-note">${esc(P.aprendi)}</p>` : ""}
    <details class="heard"><summary>Lo que escuché</summary><p class="transcript">${esc(P.dicho || "")}</p></details></div>`;
}
/* Navegación libre entre bloques (y niveles): el usuario salta a cualquiera, hacia adelante o atrás. */
function blockNav() {
  const P = S.ps, n = P.blocks.length, h = P.hechos || {};
  return `<nav class="bnav" aria-label="Bloques">
    <button class="bnav-arr" data-act="psGo" data-i="${P.i - 1}" ${P.i === 0 ? "disabled" : ""} aria-label="Bloque anterior">‹</button>
    <div class="bnav-dots">${P.blocks.map((id, k) => { const b = pbFind(id);
      return `<button class="bnav-dot${k === P.i ? " cur" : ""}${h[k] ? " done" : ""}" data-act="psGo" data-i="${k}" aria-label="Bloque ${k + 1}${b ? ": " + esc(b.titulo) : ""}${h[k] ? " (listo)" : ""}" ${k === P.i ? 'aria-current="step"' : ""}><i></i></button>`; }).join("")}</div>
    <button class="bnav-arr" data-act="psGo" data-i="${P.i + 1}" ${P.i === n - 1 ? "disabled" : ""} aria-label="Bloque siguiente">›</button></nav>`;
}
function lvlNav(maxN, nombre) {
  const P = S.ps;
  return `<div class="qmeta lnav"><button class="lnav-arr" data-act="psLvl" data-d="-1" ${P.nivel === 0 ? "disabled" : ""} aria-label="Nivel anterior (más ayuda)">‹</button>
    <span class="tag">Nivel ${P.nivel + 1} de ${maxN + 1} · ${esc(nombre)}</span>
    <button class="lnav-arr" data-act="psLvl" data-d="1" ${P.nivel >= maxN ? "disabled" : ""} aria-label="Nivel siguiente (menos ayuda)">›</button></div>`;
}
function nextLbl(maxN) {
  const P = S.ps, h = P.hechos || {};
  return P.nivel < maxN ? "Siguiente nivel" : P.blocks.some((_, k) => k !== P.i && !h[k]) ? "Siguiente bloque" : "Terminar";
}
function psReset(P) { presMicStop(); P.res = null; P.micErr = null; P.hz = null; P.escVal = ""; P.escrito = false; P.phase = "idle"; }
function presTxt(b) { return b.texto && b.texto.trim() ? b.texto : (b.apoyo || b.titulo); }
function presGo(pv, extra, anim) { if (S.sub !== "pres") S.presFrom = ["inicio", "presentaciones"].includes(S.tab) ? S.tab : "presentaciones"; leaveSim(); presMicStop(); go(Object.assign({ sub: "pres", pv }, extra || {}), anim || "right"); }
function presSave() { clearTimeout(presSave.t); presSave.t = setTimeout(save, 300); }
function chipBtn(act, v, label, on, extra) { return `<button class="pw-opt${on ? " on" : ""}" data-act="${act}" data-v="${esc(v)}"${extra || ""}>${esc(label)}</button>`; }
function fechaLarga(iso) { try { return new Date(iso + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }); } catch (e) { return iso; } }

/* ---------- Inicio: tarjeta principal ---------- */
function presCard() {
  const p = pres();
  if (!p) return `<button class="card pres-hero" data-act="presNew">
      <span class="tag">Gratis</span>
      <span class="card-head"><span class="s-icon">${SES_ICON.ensayo}</span><span><h3>¿Tienes que presentar?</h3><span class="meta">Sube tu PowerPoint, PDF o guion y Aura te arma un plan para dominarla antes de la fecha, aunque sea mañana.</span></span></span>
      <span class="cta">Preparar mi presentación →</span></button>`;
  if (!p.bloques || !p.bloques.length) return `<button class="card pres-hero" data-act="presOpen" data-pv="cargar"><span class="tag">Falta un paso</span><h3>${esc(p.tema || "Mi presentación")}</h3><span class="meta">Carga tu presentación o tu guion para crear el plan.</span><span class="cta">Continuar →</span></button>`;
  const d = daysBetween(today(), p.fecha);
  if (d < 0) return `<button class="card pres-hero" data-act="presOpen" data-pv="plan"><span class="tag">Ya presentaste</span><h3>${esc(p.tema)}</h3><span class="meta">Cuéntanos cómo te fue y prepara la siguiente.</span><span class="cta">Ver →</span></button>`;
  const pl = presPlan(p), all = presSesiones(pl), hechas = all.filter(s => p.done[s.id]).length, hoy = presHoy(p), pc = all.length ? Math.round(hechas / all.length * 100) : 0;
  return `<button class="card pres-hero" data-act="presOpen" data-pv="${hoy ? "sesion" : "plan"}" ${hoy ? `data-ses="${hoy.id}"` : ""}>
      <span class="tag">${d === 0 ? "Hoy presentas" : d === 1 ? "Presentas mañana" : "Faltan " + d + " días"}</span>
      <span class="card-head"><span class="s-icon">${SES_ICON.ensayo}</span><span><h3>${esc(p.tema)}</h3><span class="meta">${p.minutos} min · ${p.bloques.length} bloques · plan ${esc(PLAN_NOM[pl.tipo])}</span></span></span>
      <span class="barlabel"><span>Plan</span><span class="mono">${hechas}/${all.length}</span></span><span class="bar" aria-hidden="true"><i style="width:${pc}%"></i></span>
      <span class="cta">${hoy ? "Sesión de hoy: " + esc(PR.SES[hoy.tipo].titulo.toLowerCase()) + " · " + hoy.min + " min →" : "Hoy ya cumpliste. Ver mi plan →"}</span></button>`;
}

/* ---------- Paso 1: datos ---------- */
function presStartNew(edit) {
  const p = pres();
  S.pd = edit && p ? { tema: p.tema, fecha: p.fecha, minutos: p.minutos, minDia: p.minDia, formato: p.formato || "vivo", otra: false, edit: true }
    : { tema: "", fecha: addDays(2), minutos: 5, minDia: 30, formato: null, otra: false };
  presGo(edit ? "crear" : "tipo");
}
/* Paso 0: lo primero es qué tipo de presentación es (en vivo o en video), antes del tema y la fecha. */
function vPresTipo() {
  return `<section class="section"><button class="back" data-act="presBack">← ${PILAR_NOM[S.presFrom || "presentaciones"]}</button>
    <div><p class="eyebrow">Nueva presentación</p><h2>¿Qué vas a preparar?</h2></div>
    <button class="card pilar tipo ar-acad" data-act="pdTipo" data-v="vivo">
      <span class="card-head"><span class="s-icon big">${ICON_PRES}</span><span><span class="eyebrow ar">En vivo</span><h3>Una disertación</h3></span></span>
      <span class="meta">La presentas frente al curso o a una comisión. Aura arma tu plan para memorizarla y ensayarla hasta el día.</span>
      <span class="pill-cta solid">Preparar mi presentación ${ICON_GO}</span></button>
    <div class="card pilar tipo ar-acad">
      <span class="card-head"><span class="s-icon big">${ICON_CAM}</span><span><span class="eyebrow ar">Grabada</span><h3>Un video</h3></span></span>
      <span class="meta">Una tarea en video, por ejemplo para un ramo de inglés. La grabas en Aura con el guion en un teleprompter.</span>
      <div class="row"><button class="btn primary" data-act="pdTipo" data-v="video">Preparar y grabar</button><button class="btn" data-act="vidOpen" data-from="presentaciones">Solo grabar ahora</button></div>
      <span class="note" style="margin:0">«Preparar y grabar» arma un plan para aprenderte el guion; «Solo grabar ahora» va directo al teleprompter.</span>
    </div>
  </section>`;
}
function vPresCrear() {
  const d = S.pd || (S.pd = { tema: "", fecha: addDays(2), minutos: 5, minDia: 30, formato: "vivo" });
  const quick = [["Hoy", addDays(0)], ["Mañana", addDays(1)], ["En 3 días", addDays(3)], ["En una semana", addDays(7)]];
  const isQuick = quick.some(q => q[1] === d.fecha);
  return `<section class="section"><button class="back" data-act="presBack">← ${d.edit ? "Mi plan" : "Tipo de presentación"}</button>
    <div><p class="eyebrow">${d.edit ? "Editar" : "Paso 1 de 3"}</p><h2>Tu presentación</h2><p class="lead">Con esto Aura calcula cuánto debes hablar y arma tu plan.</p></div>
    <div class="panel">
      <div class="field"><label for="pdTema">¿Sobre qué es?</label><input type="text" id="pdTema" maxlength="90" placeholder="Ej: El IMACEC de los últimos 6 meses" value="${esc(d.tema)}"></div>
      ${d.edit ? `<div class="field"><span class="lbl">¿Cómo la presentas?</span><div class="pw-opts flat">${chipBtn("pdSet", "vivo", "En vivo", d.formato !== "video", ' data-k="formato"')}${chipBtn("pdSet", "video", "Grabada en video", d.formato === "video", ' data-k="formato"')}</div></div>`
        : `<p class="tipo-sel">${d.formato === "video" ? ICON_CAM + " <b>Video grabado</b> · al final lo grabas con teleprompter" : ICON_PRES + " <b>Presentación en vivo</b>"} <button class="linkish" data-act="presBack">Cambiar</button></p>`}
      <div class="field"><span class="lbl">¿Cuándo presentas?</span><div class="pw-opts flat">${quick.map(q => chipBtn("pdSet", q[1], q[0], d.fecha === q[1], ' data-k="fecha"')).join("")}${chipBtn("pdOtra", "", "Otra fecha", d.otra || !isQuick)}</div>
        ${d.otra || !isQuick ? `<input type="date" id="pdFecha" min="${today()}" value="${esc(d.fecha)}">` : ""}
        <span class="note">${esc(fechaLarga(d.fecha))}</span></div>
      <div class="field"><span class="lbl">¿Cuántos minutos tienes para hablar?</span><div class="pw-opts flat">${MIN_OPTS.map(m => chipBtn("pdSet", m, m + " min", d.minutos === m, ' data-k="minutos"')).join("")}</div>
        <span class="note">Unas ${Math.round(d.minutos * PR.PPM).toLocaleString("es-CL")} palabras habladas a ritmo ideal.</span></div>
      <div class="field"><span class="lbl">¿Cuánto tiempo puedes practicar al día?</span><div class="pw-opts flat">${DIA_OPTS.map(o => chipBtn("pdSet", o[0], o[1], d.minDia === o[0], ' data-k="minDia"')).join("")}</div></div>
      <p class="err" id="pdErr"></p>
      <button class="btn primary wide" data-act="pdOk">${d.edit ? "Guardar cambios" : "Siguiente"}</button>
    </div></section>`;
}

/* ---------- Paso 2: cargar ---------- */
function vPresCargar() {
  const p = pres(), mode = S.pc || null;
  const head = `<button class="back" data-act="${mode && mode !== "leyendo" ? "pcBack" : "presBack"}">← ${mode && mode !== "leyendo" ? "Opciones" : "Volver"}</button>
    <div><p class="eyebrow">Paso 2 de 3</p><h2>Carga tu presentación</h2><p class="lead">${esc(p.tema)} · ${p.minutos} min · ${esc(presCuenta(p))}</p></div>`;
  const err = S.perr ? `<p class="fb no">${esc(S.perr)}</p>` : "";
  if (mode === "leyendo") return `<section class="section">${head}<div class="panel"><div class="loading" style="padding:30px 0"><span class="mark" aria-hidden="true">Aa</span></div><p class="note" style="text-align:center">Leyendo tu archivo…</p></div></section>`;
  if (mode === "pegar") return `<section class="section">${head}${err}<div class="panel">
      <div class="field"><label for="pcText">Pega tu guion</label><textarea id="pcText" rows="12" placeholder="Pega aquí lo que vas a decir. Si usas títulos (## Apertura, ## Idea 1…) o separas por párrafos, Aura arma los bloques solo.">${esc(S.pcText || "")}</textarea></div>
      <button class="btn primary wide" data-act="pcUse">Usar este guion</button></div></section>`;
  if (mode === "puente") {
    const prm = PR.promptGuion({ tema: p.tema, minutos: p.minutos, fecha: fechaLarga(p.fecha), instrucciones: S.pbIns || "", material: S.pbMat || "", pais: paisObj().nombre });
    return `<section class="section">${head}${err}
      <div class="panel"><h3>1 · Cuéntale a la IA lo que tienes</h3>
        <div class="field"><label for="pbIns">Instrucciones del profesor <span class="muted">(opcional)</span></label><textarea id="pbIns" rows="3" placeholder="Ej: máximo 5 minutos, incluir al menos dos datos y una conclusión personal.">${esc(S.pbIns || "")}</textarea></div>
        <div class="field"><label for="pbMat">Tu material y datos <span class="muted">(muy recomendado)</span></label><textarea id="pbMat" rows="5" placeholder="Pega tus apuntes, datos y fuentes. La IA usará solo esto para las cifras.">${esc(S.pbMat || "")}</textarea></div></div>
      <div class="panel"><h3>2 · Copia el prompt y pégalo en tu IA</h3>
        <p class="note">Sirve ChatGPT, Gemini o Claude en su versión gratis. El prompt le pide no inventar datos y marcar con [VERIFICAR] lo que falte.</p>
        <textarea id="pbPrompt" rows="8" readonly>${esc(prm)}</textarea>
        <button class="btn" data-act="pbCopy">Copiar prompt</button></div>
      <div class="panel"><h3>3 · Pega aquí la respuesta</h3>
        <textarea id="pcText" rows="8" placeholder="Pega la respuesta completa de la IA.">${esc(S.pcText || "")}</textarea>
        <button class="btn primary wide" data-act="pcUse">Usar este guion</button>
        <p class="note">Revisa los datos marcados con [VERIFICAR] antes de presentar.</p></div></section>`;
  }
  return `<section class="section">${head}${err}
    <label class="card load-opt" for="pcFileA"><span class="card-head"><span class="s-icon">${SES_ICON.tarjetas}</span><span><h3>Subir mi presentación</h3><span class="meta">PowerPoint (.pptx) o PDF. Si tiene notas del orador, se usan como guion.</span></span></span></label>
    <input type="file" id="pcFileA" accept=".pptx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation" class="sr-only">
    <label class="card load-opt" for="pcFileB"><span class="card-head"><span class="s-icon">${SES_ICON.lectura}</span><span><h3>Subir mi guion</h3><span class="meta">Word (.docx) o texto (.txt).</span></span></span></label>
    <input type="file" id="pcFileB" accept=".docx,.txt,.md,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" class="sr-only">
    <button class="card load-opt" data-act="pcMode" data-v="pegar"><span class="card-head"><span class="s-icon">${SES_ICON.bloques}</span><span><h3>Pegar mi guion</h3><span class="meta">Copia y pega lo que vas a decir.</span></span></span></button>
    <button class="card load-opt" data-act="pcMode" data-v="puente"><span class="card-head"><span class="s-icon">${SES_ICON.preguntas}</span><span><h3>Todavía no tengo guion</h3><span class="meta">Aura te arma un prompt para que tu IA lo escriba con tu material, gratis.</span></span></span></button>
    <div class="pro-card"><span class="tag">Aura Pro · próximamente</span><p><b>Aura arma tu presentación completa.</b> Escribes el tema y las instrucciones, y Aura genera el guion, los datos y las láminas, listo para entrenar.</p></div>
    <p class="note">En Canva: <b>Compartir → Descargar</b> y elige <b>PowerPoint</b> o <b>PDF</b>.</p></section>`;
}
async function presImport(file) {
  S.pc = "leyendo"; S.perr = null; render();
  try {
    const r = await window.AuraImport.importFile(file);
    let bs = null, fuente = (file.name.split(".").pop() || "").toLowerCase();
    if (r.kind === "slides") bs = PR.fromSlides(r.slides);
    else if (r.kind === "guion") bs = PR.fromGuion(r.text);
    else if (r.kind === "vacio") throw new Error("Tu PDF no tiene texto que se pueda leer. Pasa con algunos PDF de Canva, que guardan el texto como dibujo. Descárgalo como PowerPoint o pega tu guion.");
    else if (r.kind === "antiguo") throw new Error("Ese formato es antiguo (.ppt o .doc). Ábrelo y guárdalo como .pptx o .docx, o expórtalo a PDF.");
    else throw new Error("Ese tipo de archivo no lo podemos leer. Sube .pptx, .pdf, .docx o .txt.");
    if (!bs || !bs.length) throw new Error("No encontramos texto en el archivo. Prueba pegando tu guion.");
    presSetBloques(bs, fuente, file.name);
  } catch (e) {
    S.pc = null; S.perr = e && e.message && !/^No se pudo cargar|JSZip|Invalid|zip/i.test(e.message) ? e.message
      : "No pudimos leer el archivo. Si tiene contraseña, quítala; si no, exporta a PDF o pega tu guion. Para subir archivos por primera vez necesitas conexión.";
    render();
  }
}
function presSetBloques(bs, fuente, archivo) {
  const p = pres(); p.bloques = bs; p.fuente = fuente; p.archivo = archivo || ""; p.done = p.done || {};
  save(); S.pc = null; S.pcText = ""; chime(); presGo("bloques");
}

/* ---------- Paso 3: revisar bloques ---------- */
function vPresBloques() {
  const p = pres(), bs = p.bloques, t = PR.asignarTiempo(bs, p.minutos);
  const mapa = PR.mapaConectores(bs);
  const rows = bs.map((b, i) => `<div class="panel pb ${b.tipo}" data-bid="${b.id}">
      <div class="pb-top"><span class="tag ${b.tipo === "idea" ? "quiet" : ""}">${PRES_TIPO[b.tipo]}${b.lamina ? " · lámina " + b.lamina : ""}</span><span class="mono muted">≈ ${t.secs[i]} s</span>
        <span class="pb-tools"><button class="icon-btn sm" data-act="pbMove" data-bid="${b.id}" data-dir="-1" aria-label="Subir" ${i === 0 ? "disabled" : ""}>↑</button><button class="icon-btn sm" data-act="pbMove" data-bid="${b.id}" data-dir="1" aria-label="Bajar" ${i === bs.length - 1 ? "disabled" : ""}>↓</button><button class="icon-btn sm" data-act="pbDel" data-bid="${b.id}" aria-label="Eliminar bloque">×</button></span></div>
      <input type="text" class="pb-tit" data-bid="${b.id}" data-f="titulo" value="${esc(b.titulo)}" aria-label="Título del bloque">
      ${b.apoyo ? `<details class="pb-apoyo"><summary>Texto de la lámina</summary><p>${esc(b.apoyo).replace(/\n/g, "<br>")}</p></details>` : ""}
      <div class="field"><span class="lbl">Lo que vas a decir</span>
        <textarea data-bid="${b.id}" data-f="texto" rows="${Math.min(8, Math.max(3, Math.ceil((b.texto || "").length / 48)))}" placeholder="${b.apoyo ? "La lámina solo tiene viñetas: escribe o dicta cómo lo vas a explicar con tus palabras." : "Escribe o dicta lo que vas a decir."}">${esc(b.texto)}</textarea>
        <div class="row"><button class="btn ghost sm" data-act="pbMic" data-bid="${b.id}" id="mic-${b.id}">${ICON_MIC} Dictar</button>${!b.texto ? `<span class="note warn">Sin guion: practicarás con el texto de la lámina.</span>` : ""}</div></div>
      <div class="field"><span class="lbl">Palabras clave <span class="muted">(tu ayuda memoria)</span></span>
        <div class="pb-keys">${(b.claves || []).map(k => `<span class="kchip">${esc(k)}<button data-act="pbKeyDel" data-bid="${b.id}" data-k="${esc(k)}" aria-label="Quitar ${esc(k)}">×</button></span>`).join("")}
          <input type="text" class="pb-key" data-bid="${b.id}" placeholder="+ agregar" maxlength="30" enterkeyhint="done"></div></div>
      <details class="pb-dif"${(b.dificiles || []).length ? " open" : ""}><summary>Palabras que se te olvidan <span class="muted">(${(b.dificiles || []).length})</span></summary>
        <p class="note">Anota una palabra que se te suele escapar y otra forma de decirla. Entra al Relevo.</p>
        ${(b.dificiles || []).map((d, k) => `<span class="kchip">${esc(d.w)} → ${esc(d.alt)}<button data-act="pbDifDel" data-bid="${b.id}" data-k="${k}" aria-label="Quitar">×</button></span>`).join(" ")}
        <div class="dif-add"><input type="text" id="dw-${b.id}" placeholder="Palabra (ej: estacionalidad)" maxlength="40"><input type="text" id="da-${b.id}" placeholder="Otra forma (ej: los cambios según la época)" maxlength="80"><button class="btn sm" data-act="pbDifAdd" data-bid="${b.id}">Agregar</button></div></details>
    </div>
    ${i < bs.length - 1 ? `<div class="puente"><span class="puente-l">${SES_ICON.relevo} Puente hacia «${esc(bs[i + 1].titulo)}»</span>
      <input type="text" data-bid="${b.id}" data-f="puente" maxlength="160" value="${esc(b.puente || "")}" placeholder="${esc(PR.puenteSugerido(b, bs[i + 1]))}" aria-label="Frase para pasar al siguiente bloque"></div>` : ""}`).join("");
  return `<section class="section"><button class="back" data-act="presBack">← Volver</button>
    <div><p class="eyebrow">${p.planCreado ? "Editar" : "Paso 3 de 3"}</p><h2>Revisa tu presentación</h2>
      <p class="lead">${bs.length} bloques. ${t.faltan ? `${t.faltan} sin guion.` : `Tu guion dura cerca de ${PR.fmt(t.estimado)}; tienes ${p.minutos}:00 min.`}</p></div>
    ${t.aviso ? `<p class="fb mid">${esc(t.aviso.texto)}</p>` : ""}
    <div class="panel"><h3>Tus conectores ${mapa.length ? `<span class="muted">(${mapa.reduce((a, m) => a + m.usos.length, 0)})</span>` : ""}</h3>
      ${mapa.length ? `<p class="note">Son los puentes entre tus ideas y donde más se suele quedar en blanco. En el <b>Relevo</b> entrenas otras salidas para cada uno: si se te olvida uno, cualquiera de la misma función sirve.</p>
        <div class="con-map">${mapa.map(m => `<div><b>${esc(m.nombre)}</b><span>${m.usos.map(u => esc(u.w.toLowerCase())).filter((x, i, a) => a.indexOf(x) === i).join(", ")}</span><small>también: ${esc(PR.alternativas(m.fn, m.usos[0].w).filter(a => !m.usos.some(u => M.norm(u.w) === M.norm(a))).slice(0, 3).join(", "))}</small></div>`).join("")}</div>`
        : `<p class="note">Tu guion casi no tiene conectores. Agregar algunos («además», «por eso», «en resumen») hace que tus ideas se sigan mejor. Entre bloques, usa las frases puente.</p>`}</div>
    <p class="note">La primera parte es tu <b>apertura</b> y la última tu <b>cierre</b>: son las que vas a saber casi de memoria. Lo del medio lo vas a dominar con palabras clave.</p>
    ${rows}
    <button class="btn wide" data-act="pbAdd">+ Agregar bloque</button>
    <button class="btn primary wide" data-act="pbOk">${p.planCreado ? "Guardar y volver al plan" : "Crear mi plan"}</button></section>`;
}
function pbFind(id) { const p = pres(); return p.bloques.find(b => b.id === id); }

/* ---------- Plan ---------- */
function vPresPlan() {
  const p = pres(), d = daysBetween(today(), p.fecha);
  if (d < 0) return `<section class="section"><button class="back" data-act="presBack">← ${PILAR_NOM[S.presFrom || "presentaciones"]}</button>
    <div><p class="eyebrow">Ya presentaste</p><h2>${esc(p.tema)}</h2><p class="lead">¿Cómo te fue?</p></div>
    <div class="pw-opts flat">${chipBtn("presFin", "bien", "Me fue bien")}${chipBtn("presFin", "regular", "Más o menos")}${chipBtn("presFin", "mal", "Me costó")}</div>
    <p class="note">Se guarda en tu historial y puedes preparar la siguiente.</p></section>`;
  const pl = presPlan(p), all = presSesiones(pl), hechas = all.filter(s => p.done[s.id]).length, hoy = presHoy(p);
  const days = pl.dias.map(dia => {
    const isToday = dia.f === today(), past = dia.f < today();
    return `<div class="pday${isToday ? " today" : ""}"><p class="pday-h"><b>${esc(dia.etiqueta || fechaLarga(dia.f))}</b>${dia.etiqueta && !/Hoy/.test(dia.etiqueta) ? `<span class="muted"> · ${esc(fechaLarga(dia.f))}</span>` : ""}</p>
      ${dia.ses.map(s => { const ok = !!p.done[s.id];
        return `<button class="pses${ok ? " ok" : ""}" data-act="presSes" data-ses="${s.id}"><span class="s-icon">${ok ? ICON_CHECK : SES_ICON[s.tipo]}</span><span class="pses-t"><b>${esc(PR.SES[s.tipo].titulo)}${s.n ? " " + s.n : ""}</b><small>${s.min} min${past && !ok ? " · pendiente" : ""}</small></span><span class="arrow">›</span></button>`; }).join("")}</div>`;
  }).join("");
  const last = (p.ensayos || []).slice(-1)[0];
  return `<section class="section"><button class="back" data-act="presBack">← ${PILAR_NOM[S.presFrom || "presentaciones"]}</button>
    <div><p class="eyebrow">Mi presentación · ${esc(presCuenta(p))}</p><h2>${esc(p.tema)}</h2><p class="lead">${p.minutos} min · ${p.bloques.length} bloques · ${esc(fechaLarga(p.fecha))}</p></div>
    ${S.toast ? `<p class="toast">${esc(S.toast)}</p>` : ""}
    <div class="panel"><span class="tag">Plan ${esc(PLAN_NOM[pl.tipo])}</span><p style="margin:0">${esc(PR.PLAN_TXT[pl.tipo])}</p>
      <span class="barlabel"><span>Sesiones completadas</span><span class="mono">${hechas}/${all.length}</span></span><span class="bar" aria-hidden="true"><i style="width:${all.length ? Math.round(hechas / all.length * 100) : 0}%"></i></span>
      ${last ? `<p class="note">Último ensayo: ${PR.fmt(last.secs)} de ${p.minutos}:00 · ${last.cov}% de las ideas clave${last.mpm != null ? " · " + last.mpm + " muletillas/min" : ""}.</p>` : ""}</div>
    <div class="panel sil-panel">${sw("silencio", "Modo silencioso", "Para el metro, la micro o la biblioteca: en vez de hablar, escribes de memoria. El ensayo completo sigue siendo en voz alta.")}</div>
    ${hoy ? `<button class="btn primary wide" data-act="presSes" data-ses="${hoy.id}">Empezar: ${esc(PR.SES[hoy.tipo].titulo.toLowerCase())}</button>` : `<p class="fb ok">Hoy ya cumpliste tu plan. Si quieres, haz un ensayo extra.</p>`}
    ${p.formato === "video" ? `<div class="panel vid-cta"><div><h3>Tu presentación es un video</h3><p class="note">Cuando te sientas listo, grábala con tu guion en el teleprompter. Puedes grabar todas las veces que quieras.</p></div><button class="btn wide" data-act="vidOpen" data-from="pres">${SES_ICON.ensayo} Grabar con teleprompter</button></div>` : ""}
    ${days}
    <div class="row"><button class="btn" data-act="presSes" data-ses="libre-ensayo">Ensayo libre</button><button class="btn" data-act="presOpen" data-pv="bloques">Editar bloques</button><button class="btn" data-act="presEdit">Fecha y duración</button></div>
    ${S.confirm === "presDel" ? `<div class="confirm"><span>¿Borrar esta presentación y su plan?</span><button class="btn danger" data-act="presDelYes">Sí, borrar</button><button class="btn ghost" data-act="cancelConfirm">Cancelar</button></div>`
      : `<button class="linkish" data-act="presDelAsk" style="align-self:flex-start">Borrar presentación</button>`}
  </section>`;
}

/* ---------- Sesiones ---------- */
function presFindSes(id) {
  if (/^libre-/.test(id)) return { id, tipo: id.split("-")[1], libre: true, min: 6 };
  return presSesiones(presPlan()).find(s => s.id === id) || null;
}
function presStartSes(id) {
  const s = presFindSes(id); if (!s) { presGo("plan"); return; }
  const p = pres();
  const blocks = s.tipo === "ancla" ? p.bloques.filter(b => b.tipo !== "idea") : p.bloques;
  S.ps = { id, tipo: s.tipo, n: s.n, libre: s.libre, i: 0, nivel: 0, blocks: blocks.map(b => b.id), res: null, phase: "idle", flip: false, sabe: 0, step: 0, frase: 0, cues: s.tipo === "ensayo" && presPlan() && presPlan().tipo === "expres" && (s.n || 1) === 1 };
  if (s.tipo === "preguntas") S.ps.qs = PR.preguntas(p.bloques, p.tema);
  if (s.tipo === "relevo") { S.ps.items = PR.relevoItems(p.bloques, 10); S.ps.phase = "intro"; S.ps.ok = 0; S.ps.rapidas = 0; S.ps.nCon = S.ps.items.filter(x => x.tipo === "con").length; }
  presGo("sesion");
}
function psHead(titulo, sub) {
  const se = PR.SES[S.ps.tipo];
  return `<button class="back" data-act="psExit">← Mi plan</button>
    <div class="card-head"><span class="s-icon">${SES_ICON[S.ps.tipo]}</span><div><p class="eyebrow">${esc(sub || "Sesión · " + se.min + " min")}</p><h2>${esc(titulo || se.titulo)}</h2></div></div>
    ${sub ? "" : `<p class="lead" style="margin-top:0">${esc(se.desc)}</p>`}
    ${["lectura", "bloques", "ancla", "tarjetas", "preguntas", "ensayo"].includes(S.ps.tipo) ? silTog() : ""}`;
}
/* ---------- modo silencioso: escribir en vez de hablar (metro, micro, biblioteca) ---------- */
const sil = () => !!progress.settings.silencio;
function silTog() {
  const on = sil();
  return `<button class="sil-tog${on ? " on" : ""}" data-act="toggle" data-key="silencio" aria-pressed="${on}">${on ? ICON_SIL + " Modo silencioso: escribes en vez de hablar" : ICON_MIC + " ¿No puedes hablar? Pasa a modo silencioso"}</button>`;
}
const NIVELES_SIL = ["Léelo con calma", "Completa los huecos", "Más huecos", "De memoria, con pistas", "De memoria"];
const TXT_ATTR = 'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"';
function vEscrito(b, maxN, txt, resFb) {
  const P = S.ps, n = P.nivel; let body = "", acts = "", extra = "";
  const next = `<button class="btn" data-act="psNext">${nextLbl(maxN)}</button>`;
  if (n === 0) {
    body = `${fadeHTML(txt, 0, b.claves)}<p class="note">Léelo mentalmente, como si lo estuvieras diciendo. En el siguiente nivel lo completas de memoria.</p>`;
    acts = next.replace('class="btn"', 'class="btn primary"');
  } else if (n <= 2) {
    const segs = PR.huecos(txt, b.claves, n === 2); let gi = 0;
    if (!segs.some(x => x.gap)) body = `${fadeHTML(txt, 0, b.claves)}<p class="note">Este bloque no tiene palabras clave ni conectores que ocultar. Pasa al siguiente nivel para escribirlo de memoria.</p>`;
    else body = `<p class="fd hz">${segs.map(x => {
        if (!x.gap) return esc(x.t);
        const i = gi++, r = P.hz && P.hz.res[i], v = P.hz ? (P.hz.vals[i] || "") : "";
        if (r === "ok") return `${esc(x.pre)}<span class="hz-r ok">${esc(x.ans)}</span>${esc(x.post)}`;
        if (r === "equiv") return `${esc(x.pre)}<span class="hz-r equiv" title="Otro conector de la misma función: vale">${esc(v)}</span>${esc(x.post)}`;
        if (r === "no") return `${esc(x.pre)}<span class="hz-r no">${v ? `<s>${esc(v)}</s> ` : ""}${esc(x.ans)}</span>${esc(x.post)}`;
        return `${esc(x.pre)}<input class="hz-in" data-g="${i}" style="width:${Math.min(16, Math.max(4, x.ans.length + 1))}ch" ${TXT_ATTR} aria-label="Hueco ${i + 1}">${esc(x.post)}`;
      }).join("")}</p>
      <p class="note">${P.hz ? (P.res.equiv ? `En ${P.res.equiv} hueco${P.res.equiv > 1 ? "s" : ""} usaste otro conector de la misma función: vale igual.` : P.res.faltan.length ? "En rojo, la palabra que iba." : "¡Todos los huecos bien!") : "Escribe las palabras que faltan. Las tildes y un error de tipeo no importan; con un conector de la misma función, vale."}</p>`;
    acts = P.hz ? `<button class="btn primary" data-act="psHzReset">Repetir</button>${next}` : `<button class="btn primary" data-act="psHzCheck">Revisar</button>${next}`;
  } else {
    body = (n >= 4 ? `<p class="fd-none">Escríbelo sin ayuda. Si te trabas, toca aquí para ver las palabras clave.</p>` : fadeHTML(txt, 3, b.claves))
      + (n === 3 ? `<div class="pb-keys">${b.claves.map(k => `<span class="kchip">${esc(k)}</span>`).join("")}</div>` : "");
    extra = `<label class="sr-only" for="psEsc">Escribe el bloque de memoria</label><textarea id="psEsc" class="esc-ta" rows="6" placeholder="Escribe el bloque de memoria…" ${TXT_ATTR}>${esc(P.escVal || "")}</textarea>`
      + (b.tipo !== "idea" ? `<p class="note">${PRES_TIPO[b.tipo]}: apunta a escribirla tal cual, porque la vas a decir de memoria.</p>` : `<p class="note">En las ideas centrales basta con las ideas y palabras clave, no hace falta que sea literal.</p>`);
    acts = `<button class="btn primary" data-act="psEscCheck">${P.res ? "Revisar de nuevo" : "Revisar"}</button>${next}`;
  }
  return `<section class="section">${psHead(b.titulo, `${PRES_TIPO[b.tipo]} · bloque ${P.i + 1} de ${P.blocks.length}`)}
      ${blockNav()}
      <div class="panel">${lvlNav(maxN, NIVELES_SIL[n])}
        <div class="fd-wrap" data-act="fdPeek">${body}</div>${extra}
        ${resFb}<div class="row">${acts}</div>
        ${n >= 3 ? `<p class="note">Toca una palabra oculta para verla.</p>` : ""}</div></section>`;
}
function fadeHTML(text, nivel, claves) {
  if (nivel >= 4) return `<p class="fd-none">Dilo sin ayuda. Si te trabas, toca aquí para ver las palabras clave.</p>`;
  return `<p class="fd">${PR.fade(text, nivel, claves).map(t => t.sp ? t.t : t.key ? `<b class="fd-k">${esc(t.t)}</b>`
    : t.ini ? `${esc(t.pre)}<span class="fd-i" data-w="${esc(t.core)}">${esc(t.core.charAt(0))}<i>${"_".repeat(Math.max(1, t.core.length - 1))}</i></span>${esc(t.post)}`
    : t.hid ? `${esc(t.pre)}<span class="fd-h" data-w="${esc(t.core)}">${"_".repeat(Math.max(2, t.core.length))}</span>${esc(t.post)}` : esc(t.t)).join("")}</p>`;
}
let presDict = null, presT0 = 0, presTimer = null, presCb = null;
function presMicStop() { relStop(); clearInterval(presTimer); presTimer = null; if (presDict && presDict.active) presDict.stop(); }
function presMic(onEnd, liveId) {
  presMicStop(); presCb = onEnd;
  presDict = Dictado({ lang: paisObj().voz, keepAlive: true,
    onText: t => { S.ps.live = t; const el = document.getElementById(liveId || "psLive"); if (el) el.textContent = t; },
    onError: code => { S.ps.phase = "idle"; S.ps.micErr = micMsg(code); clearInterval(presTimer); render(); },
    onEnd: d => { clearInterval(presTimer); if (S.ps && S.ps.phase === "fin") onEnd((S.ps.live || "").trim(), (Date.now() - presT0) / 1000); } });
  S.ps.live = ""; S.ps.micErr = null; presT0 = Date.now(); S.ps.phase = "rec";
  presDict.start();
  if (!presDict.supported) { S.ps.phase = "idle"; S.ps.micErr = micMsg("unsupported"); render(); return false; }
  return true;
}
function presMicFinish() {
  if (!S.ps) return; S.ps.phase = "fin"; clearInterval(presTimer);
  const secs = (Date.now() - presT0) / 1000;
  if (S.ps.timerOnly) { S.ps.timerOnly = false; presEnsayoFin("", secs); return; }
  if (presDict && presDict.active) presDict.stop(); else if (presCb) presCb((S.ps.live || "").trim(), secs);
}
function vPresSesion() {
  const P = S.ps, p = pres(); if (!P || !p) return "";
  const t = P.tipo;
  if (t === "lectura") {
    return `<section class="section">${psHead()}
      <div class="panel"><p class="note">${sil() ? "Léela completa mentalmente, a ritmo de presentación: imagina que la estás diciendo frente al curso. Con audífonos, puedes escuchar cómo suena." : "Léela completa en voz alta, a ritmo de presentación (no de lectura en silencio). Si quieres, escucha cómo suena primero."}</p>
        <p class="note">Los <mark class="con">conectores</mark> van resaltados: fíjate en ellos, son los puentes entre tus ideas.</p>
        ${p.bloques.map(b => `<div class="read-b"><p class="eyebrow">${PRES_TIPO[b.tipo]} · ${esc(b.titulo)}</p><p>${conHTML(presTxt(b))}</p><button class="btn ghost sm" data-act="psSpeak" data-bid="${b.id}">${ICON_SPEAK} Escuchar</button></div>`).join("")}</div>
      <button class="btn primary wide" data-act="psDone">${sil() ? "La leí" : "La leí en voz alta"}</button></section>`;
  }
  if (t === "bloques" || t === "ancla") {
    const b = pbFind(P.blocks[P.i]), maxN = t === "ancla" ? 4 : 3, txt = presTxt(b);
    const res = P.res ? `<div class="fb ${P.res.r >= .7 ? "ok" : P.res.r >= .45 ? "mid" : "no"}"><b>Recordaste ${Math.round(P.res.r * 100)}% del contenido.</b> ${P.res.faltan.length ? "Te faltó: " + P.res.faltan.map(esc).join(", ") + "." : (sil() ? "Escribiste" : "Dijiste") + " todas las palabras clave."} ${P.res.r < .6 ? "Repite este nivel una vez más." : P.nivel < maxN ? "Bien, quitemos más ayuda." : ""}</div>` + revHTML() : "";
    if (sil()) return vEscrito(b, maxN, txt, res);
    return `<section class="section">${psHead(b.titulo, `${PRES_TIPO[b.tipo]} · bloque ${P.i + 1} de ${P.blocks.length}`)}
      ${blockNav()}
      <div class="panel">${lvlNav(maxN, NIVELES[P.nivel])}
        <div class="fd-wrap" data-act="fdPeek">${fadeHTML(txt, P.nivel, b.claves)}</div>
        ${P.nivel >= 3 ? `<div class="pb-keys">${b.claves.map(k => `<span class="kchip">${esc(k)}</span>`).join("")}</div>` : ""}
        ${P.phase === "rec" ? `<p class="transcript" id="psLive">${esc(P.live || "")}</p><button class="btn primary" data-act="psMicStop">${ICON_STOP} Listo, lo dije</button>`
          : `${res}<div class="row">${P.res && P.res.r >= .6 || !P.res ? `<button class="btn primary" data-act="psMicGo">${ICON_MIC} Decirlo en voz alta</button>` : `<button class="btn primary" data-act="psMicGo">${ICON_MIC} Repetir</button>`}
            <button class="btn" data-act="psNext">${nextLbl(maxN)}</button></div>`}
        ${P.micErr ? `<p class="note warn">${esc(P.micErr)} Puedes decirlo igual y tocar «Siguiente».</p>` : ""}
        <p class="note">Toca una palabra oculta para verla.</p></div></section>`;
  }
  if (t === "tarjetas") {
    const b = pbFind(P.blocks[P.i]);
    if (!b) return `<section class="section">${psHead()}<div class="panel"><h3>Repaso listo</h3><p>Recordaste bien ${P.sabe} de ${P.blocks.length} bloques.${P.sabe < P.blocks.length ? " Los que te costaron vuelven a aparecer primero en tu próximo ensayo." : ""}</p></div><button class="btn primary wide" data-act="psDone">Terminar</button></section>`;
    return `<section class="section">${psHead("Tarjetas", `Tarjeta ${P.i + 1} de ${P.blocks.length}`)}
      <button class="flash${P.flip ? " flip" : ""}" data-act="psFlip">
        <span class="flash-in"><span class="tag ${b.tipo === "idea" ? "quiet" : ""}">${PRES_TIPO[b.tipo]}</span><h3>${esc(b.titulo)}</h3>
        ${P.flip ? `<span class="pb-keys">${b.claves.map(k => `<span class="kchip">${esc(k)}</span>`).join("")}</span><span class="note">«${esc(PR.firstSentence(presTxt(b)))}»</span>` : `<span class="note">¿Qué ideas van en este bloque? ${sil() ? "Recuérdalas mentalmente" : "Dilas en voz alta"} y toca para comprobar.</span>`}</span></button>
      ${P.flip ? `<div class="row"><button class="btn primary" data-act="psSabe" data-v="1">La sabía</button><button class="btn" data-act="psSabe" data-v="0">Me costó</button></div>` : ""}
      ${P.i > 0 ? `<button class="linkish" data-act="psPrev" style="align-self:flex-start">‹ Tarjeta anterior</button>` : ""}</section>`;
  }
  if (t === "ensayo") return vPresEnsayo();
  if (t === "relevo") return vRelevo();
  if (t === "preguntas") {
    const q = P.qs[P.i];
    if (!q) return `<section class="section">${psHead()}<div class="panel"><h3>¡Bien!</h3><p>Respondiste ${P.qs.length} preguntas. Una buena respuesta tiene tres partes: la respuesta directa, un dato o ejemplo y una conclusión.</p></div><button class="btn primary wide" data-act="psDone">Terminar</button></section>`;
    const r = P.res;
    return `<section class="section">${psHead("Preguntas del profesor", `Pregunta ${P.i + 1} de ${P.qs.length}`)}
      <div class="panel"><div class="msg them"><div class="who"><span>Profesor</span></div>${esc(q)}</div><button class="btn ghost sm" data-act="psSpeakQ">${ICON_SPEAK} Escuchar</button>
        ${P.phase === "rec" ? `<p class="transcript" id="psLive">${esc(P.live || "")}</p><button class="btn primary" data-act="psMicStop">${ICON_STOP} Terminé de responder</button>`
          : r ? `<div class="fb ${r.ok ? "ok" : "mid"}"><b>${r.est ? `${r.words} palabras · unos ${Math.round(r.secs)} s dicha en voz alta` : `${r.words} palabras en ${Math.round(r.secs)} s`}${r.mul ? " · " + r.mul + " muletillas" : ""}.</b> ${r.words < 25 ? "Muy corta: agrega un dato o un ejemplo." : r.secs > 75 ? "Bien desarrollada, pero larga: en una ronda de preguntas, apunta a 30–60 segundos." : "Buen largo para una respuesta."}</div>
               <div class="row"><button class="btn primary" data-act="psNextQ">Siguiente pregunta</button><button class="btn" data-act="${sil() ? "psQRe" : "psMicGo"}">Responder de nuevo</button></div>`
          : sil() ? `<p class="note">Escribe tu respuesta: respuesta directa → un dato o ejemplo → conclusión.</p><label class="sr-only" for="psQEsc">Tu respuesta</label><textarea id="psQEsc" class="esc-ta" rows="5" placeholder="Mi respuesta…" ${TXT_ATTR}></textarea><div class="row"><button class="btn primary" data-act="psQEscOk">Listo</button><button class="btn" data-act="psNextQ">Saltar</button></div>`
          : `<p class="note">Responde en voz alta: respuesta directa → un dato o ejemplo → conclusión.</p><div class="row"><button class="btn primary" data-act="psMicGo">${ICON_MIC} Responder</button><button class="btn" data-act="psNextQ">Saltar</button></div>`}
        ${P.micErr ? `<p class="note warn">${esc(P.micErr)}</p>` : ""}</div>
      ${P.i > 0 && P.phase !== "rec" ? `<button class="linkish" data-act="psPrev" style="align-self:flex-start">‹ Pregunta anterior</button>` : ""}</section>`;
  }
  if (t === "calentamiento") {
    const ap = p.bloques[0], frase = PR.firstSentence(presTxt(ap));
    const steps = [
      `<h3>1 · Respira</h3><p class="note">Inhala 4 segundos, sostén 4 y exhala lento en 6. Tres veces. Baja el pulso y afirma la voz.</p>
        <div class="breath${P.breath ? " go" : ""}" aria-hidden="true"><span id="brTxt">${P.breath ? "Inhala" : "Listo"}</span></div>
        <button class="btn primary" data-act="psBreath" ${P.breath ? "disabled" : ""}>${P.breath ? "Respirando…" : "Empezar"}</button>`,
      `<h3>2 · Despierta la voz</h3><p class="note">Dilos en voz alta, exagerando cada sílaba.</p>${TRABA.map(x => `<p class="traba">«${esc(x)}»</p>`).join("")}`,
      `<h3>3 · Tu primera frase</h3><p class="note">Dila tres veces, mirando al frente. Es la que marca el tono de todo lo demás.</p><p class="traba big">«${esc(frase)}»</p>
        <button class="btn primary" data-act="psFrase">La dije · ${P.frase}/3</button>`];
    return `<section class="section">${psHead()}
      <div class="dotsprog">${steps.map((_, k) => `<i class="${k <= P.step ? "done" : ""}"></i>`).join("")}</div>
      <div class="panel">${steps[P.step]}</div>
      ${P.step < 2 ? `<button class="btn wide" data-act="psStep">Siguiente</button>` : P.frase >= 3 ? `<button class="btn primary wide" data-act="psDone">Estoy listo</button>` : ""}</section>`;
  }
  return "";
}
let relTimer = null;
function relStop() { clearInterval(relTimer); relTimer = null; }
function relStart() {
  relStop(); S.ps.t0 = Date.now(); S.ps.lento = false;
  relTimer = setInterval(() => {
    const P = S.ps; if (!P || P.tipo !== "relevo") { relStop(); return; }
    const k = Math.min(1, (Date.now() - P.t0) / 3000), b = document.getElementById("relBar");
    if (b) b.style.width = (100 - k * 100) + "%";
    if (k >= 1) { P.lento = true; relStop(); const l = document.getElementById("relLbl"); if (l) l.textContent = "Tómate un segundo y elige. El objetivo es bajar de 3 segundos."; if (b) b.parentElement.classList.add("over"); }
  }, 60);
}
function relShuffle(arr, seed) { const a = arr.slice(); let x = seed + 7; for (let i = a.length - 1; i > 0; i--) { x = (x * 9301 + 49297) % 233280; const j = Math.floor(x / 233280 * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function vRelevo() {
  const P = S.ps, items = P.items;
  if (!items.length) return `<section class="section">${psHead()}<div class="panel"><p>Tu guion todavía no tiene conectores ni saltos entre bloques para practicar. Agrega bloques o frases puente en «Editar bloques».</p></div><button class="btn primary wide" data-act="psDone">Terminar</button></section>`;
  const salv = `<div class="salv"><b>Tu salvavidas si te quedas en blanco</b><p>Haz una pausa de 2 segundos: el público la siente como énfasis, solo tú la sientes eterna. Luego usa una frase comodín y mira tu siguiente palabra clave:</p><div class="pb-keys">${PR.SALVAVIDAS.map(x => `<span class="kchip">${esc(x)}</span>`).join("")}</div></div>`;
  if (P.phase === "intro") return `<section class="section">${psHead()}
    <div class="panel"><p style="margin:0">Vas a ver frases de tu guion con el conector borrado. Tienes <b>3 segundos</b> para elegir otro que cumpla la misma función. Dila en voz alta con tu opción.</p>
      <p class="note">${P.nCon} conectores · ${items.filter(x => x.tipo === "dif").length} palabras tuyas · ${items.filter(x => x.tipo === "puente").length} saltos entre bloques</p></div>
    ${salv}
    <button class="btn primary wide" data-act="relGo">Empezar relevo</button></section>`;
  const it = items[P.i];
  if (!it) return `<section class="section">${psHead("Relevo listo")}
    <div class="panel"><div class="kpis two"><div class="kpi"><b>${P.ok}/${P.nCon}</b><span>conectores con una buena alternativa</span></div><div class="kpi"><b>${P.rapidas}</b><span>en menos de 3 segundos</span></div></div>
      <p class="note">${P.ok === P.nCon ? "Excelente: ya no dependes de una sola palabra." : "Los que fallaste vuelven en el próximo relevo. Recuerda: no buscas la palabra exacta, buscas la función."}</p></div>
    ${salv}<button class="btn primary wide" data-act="psDone">Terminar</button></section>`;
  const head = psHead("Relevo", `${P.i + 1} de ${items.length} · ${it.tipo === "con" ? PR.CONECTORES[it.fn].nombre : it.tipo === "dif" ? "Tu palabra difícil" : "Salto entre bloques"}`);
  const dots = `<div class="dotsprog">${items.map((_, k) => `<i class="${k < P.i ? "done" : ""}"></i>`).join("")}</div>`;
  if (it.tipo === "con") {
    const opts = relShuffle(it.opciones, P.i), ans = P.ans;
    const valid = o => it.validas.map(M.norm).includes(M.norm(o));
    let fb = "";
    if (ans != null) {
      const o = opts[ans], ok = valid(o), other = !ok && Object.keys(PR.CONECTORES).find(f => (PR.CONECTORES[f].w.concat(PR.CONECTORES[f].sug || [])).map(M.norm).includes(M.norm(o)));
      fb = ok ? `<div class="fb ok"><b>¡Bien${P.lento ? "" : ", y rápido"}!</b> También sirven: ${esc(it.validas.filter(v => M.norm(v) !== M.norm(o)).slice(0, 3).join(", "))}. Tu guion dice «${esc(it.w)}».</div>`
        : `<div class="fb no"><b>«${esc(o)}» sirve para ${esc(other ? PR.CONECTORES[other].para : "otra cosa")}.</b> Aquí necesitas ${esc(PR.CONECTORES[it.fn].para)}: ${esc(it.validas.slice(0, 3).join(", "))}. Tu guion dice «${esc(it.w)}».</div>`;
    }
    return `<section class="section">${head}${dots}
      <div class="panel"><p class="eyebrow">${esc(it.bloque)}</p>
        <p class="rel-frase">${esc(it.blank).replace("___", `<span class="rel-blank${ans != null ? " fill" : ""}">${ans != null ? esc(opts[ans]) : "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"}</span>`)}</p>
        ${ans == null ? `<div class="bar tbar rel-bar" aria-hidden="true"><i id="relBar" style="width:100%"></i></div><p class="note" id="relLbl">Elige un conector para ${esc(PR.CONECTORES[it.fn].para)}. Dila en voz alta con tu opción.</p>` : ""}
        <div class="opts">${opts.map((o, k) => { let c = "opt"; if (ans != null) { if (valid(o)) c += " ok"; else if (k === ans) c += " no"; } return `<button class="${c}" data-act="relPick" data-k="${k}" ${ans != null ? "disabled" : ""}>${esc(o)}</button>`; }).join("")}</div>
        ${fb}${ans != null ? `<button class="btn primary" data-act="relNext">Siguiente</button>` : ""}</div></section>`;
  }
  if (it.tipo === "dif") return `<section class="section">${head}${dots}
      <div class="panel"><p class="eyebrow">${esc(it.bloque)}</p><p class="rel-frase">Si se te olvida <b>«${esc(it.w)}»</b>…</p>
        ${it.frase ? `<p class="note">${esc(it.frase).replace(new RegExp(esc(it.w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), '<span class="rel-blank">&nbsp;&nbsp;&nbsp;&nbsp;</span>')}</p>` : ""}
        ${P.ver ? `<div class="fb ok"><b>Di:</b> «${esc(it.alt)}»</div><button class="btn primary" data-act="relNext">La tengo</button>` : `<p class="note">¿Qué dirías en su lugar? Dilo en voz alta y luego compara.</p><button class="btn primary" data-act="relVer">Ver mi alternativa</button>`}</div></section>`;
  return `<section class="section">${head}${dots}
      <div class="panel"><p class="rel-frase">Terminaste <b>«${esc(it.de)}»</b>. ¿Con qué frase pasas a <b>«${esc(it.a)}»</b>?</p>
        ${P.ver ? `<div class="fb ok">«${esc(it.texto)}»</div><button class="btn primary" data-act="relNext">La dije</button>` : `<p class="note">Dila en voz alta y toca para ver tu puente.</p><button class="btn primary" data-act="relVer">Ver mi puente</button>`}</div></section>`;
}
function vPresEnsayo() {
  const P = S.ps, p = pres(), meta = p.minutos * 60;
  if (P.phase === "done") {
    const r = P.res, dif = r.secs - meta, okT = Math.abs(dif) <= meta * 0.1;
    const largo = r.cov.slice().sort((a, b) => (b.total - b.ok) - (a.total - a.ok))[0];
    return `<section class="section">${psHead("Resultado del ensayo", P.libre ? "Ensayo libre" : "Ensayo " + (P.n || 1))}
      <div class="panel"><div class="kpis">
        <div class="kpi"><b class="${okT ? "good" : "warn"}">${PR.fmt(r.secs).replace(" min", "")}</b><span>de ${p.minutos}:00 · ${okT ? "justo a tiempo" : dif > 0 ? "te pasaste " + Math.round(dif) + " s" : "te faltaron " + Math.round(-dif) + " s"}</span></div>
        <div class="kpi"><b>${r.covPct}%</b><span>ideas clave dichas</span></div>
        <div class="kpi"><b>${r.mpm != null ? r.mpm : "—"}</b><span>muletillas por minuto</span></div></div>
        ${r.ppm ? `<p class="note">Ritmo: ${r.ppm} palabras por minuto ${r.ppm > 170 ? "(rápido: haz pausas al cambiar de bloque)" : r.ppm < 100 ? "(lento: está bien hacer pausas, pero no alargues las frases)" : "(buen ritmo)"}.</p>` : ""}
        ${r.mulFound ? `<p class="note">Muletillas: ${esc(r.mulFound)}.</p>` : ""}</div>
      <div class="panel"><h3>Bloque por bloque</h3>${r.cov.map(c => `<div class="cov-row"><span class="cov-ic ${c.ok === c.total ? "ok" : c.ok ? "mid" : "no"}">${c.ok === c.total ? "✓" : c.ok + "/" + c.total}</span><span><b>${esc(c.titulo)}</b>${c.faltan.length ? `<small>Te faltó: ${c.faltan.map(esc).join(", ")}</small>` : ""}</span></div>`).join("")}
        ${largo && largo.ok < largo.total ? `<p class="note">Para el próximo ensayo, repasa «${esc(largo.titulo)}» con tarjetas.</p>` : ""}</div>
      ${r.noVoz ? `<p class="note">Sin micrófono solo medimos el tiempo.</p>` : ""}
      <div class="row"><button class="btn primary" data-act="psDone">Guardar y terminar</button><button class="btn" data-act="psEnsayoAgain">Repetir ensayo</button></div></section>`;
  }
  const rec = P.phase === "rec" || P.phase === "fin";
  if (sil() && !rec) return `<section class="section">${psHead(P.libre ? "Ensayo libre" : "Ensayo completo" + (P.n ? " " + P.n : ""))}
    <div class="panel"><h3>Este ensayo es en voz alta</h3>
      <p class="note">El ensayo completo entrena lo que no se puede escribir: el tiempo, el ritmo, las pausas y los nervios. Por eso no cuenta por escrito: déjalo para cuando puedas hablar.</p>
      <p class="note">Mientras, practica en silencio:</p>
      <div class="row"><button class="btn primary" data-act="presSes" data-ses="libre-bloques">Escribir bloque por bloque</button><button class="btn" data-act="presSes" data-ses="libre-relevo">Relevo de conectores</button></div></div></section>`;
  return `<section class="section">${psHead(P.libre ? "Ensayo libre" : "Ensayo completo" + (P.n ? " " + P.n : ""))}
    <div class="panel ensayo">
      <div class="timer"><b class="mono" id="psClock">0:00</b><span>de ${p.minutos}:00</span></div>
      <div class="bar tbar" aria-hidden="true"><i id="psBar" style="width:0%"></i></div>
      ${rec ? `<div class="rec-wrap"><button class="rec-btn live" data-act="psMicStop" aria-label="Terminar ensayo"><span>${ICON_STOP}</span></button><p class="note" style="text-align:center">Presenta de principio a fin. Toca para terminar.</p></div>`
        : `<div class="rec-wrap"><button class="rec-btn" data-act="psMicGo" aria-label="Empezar ensayo"><span>${ICON_MIC}</span></button><p class="note" style="text-align:center">Ponte de pie, imagina al curso y empieza con tu apertura.</p></div>`}
      <label class="row" style="align-items:center;gap:8px"><input type="checkbox" id="psCues" ${P.cues ? "checked" : ""}> <span class="note" style="margin:0">Ver palabras clave mientras ensayo</span></label>
      ${P.cues ? `<div class="cues">${p.bloques.map((b, i) => `<p><b>${esc(b.titulo)}</b> · ${b.claves.map(esc).join(" · ")}</p>${i < p.bloques.length - 1 && b.puente ? `<p class="cue-p">→ ${esc(b.puente)}</p>` : ""}`).join("")}</div>` : ""}
      ${!rec ? `<p class="note salv-mini"><b>Si te quedas en blanco:</b> pausa de 2 segundos, «${esc(PR.SALVAVIDAS[0])}» y mira tu siguiente palabra clave.</p>` : ""}
      ${rec ? `<p class="transcript small" id="psLive">${esc(P.live || "")}</p>` : ""}
      ${P.micErr ? `<p class="note warn">${esc(P.micErr)}</p><button class="btn" data-act="psTimerOnly">Ensayar solo con cronómetro</button>` : ""}</div></section>`;
}
function presTick() {
  const p = pres(); if (!p || !S.ps) return;
  const s = (Date.now() - presT0) / 1000, meta = p.minutos * 60;
  const c = document.getElementById("psClock"), b = document.getElementById("psBar");
  if (c) c.textContent = fmtSec(s);
  if (b) { b.style.width = Math.min(100, s / meta * 100) + "%"; b.parentElement.classList.toggle("over", s > meta * 1.1); }
}
function presEnsayoFin(text, secs) {
  const p = pres(), cov = PR.cobertura(text, p.bloques, p.alias);
  const tot = cov.reduce((a, c) => a + c.total, 0), ok = cov.reduce((a, c) => a + c.ok, 0);
  const m = text ? M.speechMetrics(text, secs, mulList()) : null;
  S.ps.res = { secs, cov, covPct: tot ? Math.round(ok / tot * 100) : 0, ppm: m && m.ppm, mpm: m ? m.mpm : null,
    mulFound: m ? Object.entries(m.mul.found).map(([k, n]) => `«${k}»${n > 1 ? " ×" + n : ""}`).join(", ") : "", noVoz: !text };
  S.ps.phase = "done"; chime(); render();
}
function presDone() {
  const P = S.ps, p = pres();
  if (P.tipo === "ensayo" && P.res) { p.ensayos = (p.ensayos || []).concat([{ at: today(), secs: Math.round(P.res.secs), cov: P.res.covPct, ppm: P.res.ppm, mpm: P.res.mpm }]).slice(-30); }
  if (!P.libre) p.done[P.id] = { at: today() };
  p.planCreado = true; markDay(); save(); fanfare();
  S.toast = "Sesión completada. " + (presHoy(p) ? "Sigue con la próxima cuando quieras." : "Por hoy, listo.");
  S.ps = null; presGo("plan", null, "left");
}
function vPres() {
  const p = pres();
  if (!p && S.pv !== "crear" && S.pv !== "tipo") { S.pv = "tipo"; }
  if (S.pv === "tipo") return vPresTipo();
  if (S.pv === "crear") return vPresCrear();
  if (S.pv === "cargar") return vPresCargar();
  if (S.pv === "bloques") return p.bloques && p.bloques.length ? vPresBloques() : vPresCargar();
  if (S.pv === "sesion" && S.ps) return vPresSesion();
  return p.bloques && p.bloques.length ? vPresPlan() : vPresCargar();
}
function presAct(a, el, ev) {
  const p = pres();
  switch (a) {
    case "presNew": presStartNew(false); return true;
    case "pdTipo": if (!S.pd) presStartNew(false); S.pd.formato = el.dataset.v; presGo("crear"); return true;
    case "presNewAsk": S.confirm = "presNueva"; render(); return true;
    case "presNewYes": if (p && p.bloques && p.bloques.length) progress.presHist = (progress.presHist || []).concat([{ tema: p.tema, fecha: p.fecha, minutos: p.minutos, resultado: "", ensayos: (p.ensayos || []).length }]).slice(-30);
      progress.pres = null; S.confirm = null; save(); presStartNew(false); return true;
    case "presEdit": presStartNew(true); return true;
    case "presOpen": if (el.dataset.ses) presStartSes(el.dataset.ses); else { if (el.dataset.pv === "cargar") { S.pd = null; S.pc = null; S.perr = null; } presGo(el.dataset.pv || "plan"); } return true;
    case "presBack": {
      if (S.pv === "sesion" || S.pv === "bloques" && p && p.planCreado) presGo("plan", null, "left");
      else if (S.pv === "cargar" && S.pd && !S.pd.edit) presGo("crear", null, "left");
      else if (S.pv === "crear" && S.pd && S.pd.edit) presGo("plan", null, "left");
      else if (S.pv === "crear" && S.pd && !S.pd.edit) presGo("tipo", null, "left");
      else { presMicStop(); go({ sub: null, tab: S.presFrom || "presentaciones" }, "left"); }
      return true; }
    case "pdSet": { const d = S.pd, k = el.dataset.k, v = el.dataset.v; d[k] = k === "fecha" || k === "formato" ? v : +v; if (k === "fecha") d.otra = false; render(); return true; }
    case "pdOtra": S.pd.otra = true; render(); { const f = document.getElementById("pdFecha"); if (f) f.focus(); } return true;
    case "pdOk": {
      const d = S.pd, tema = (document.getElementById("pdTema").value || "").trim();
      if (!tema) { document.getElementById("pdErr").textContent = "Escribe el tema de tu presentación."; return true; }
      if (!d.fecha || daysBetween(today(), d.fecha) < 0) { document.getElementById("pdErr").textContent = "Elige una fecha de hoy en adelante."; return true; }
      if (d.edit && p) { Object.assign(p, { tema, fecha: d.fecha, minutos: d.minutos, minDia: d.minDia, formato: d.formato || "vivo" }); save(); S.toast = "Plan actualizado a tu nueva fecha y duración."; presGo("plan", null, "left"); }
      else { progress.pres = { id: "p" + Date.now().toString(36), tema, fecha: d.fecha, minutos: d.minutos, minDia: d.minDia, formato: d.formato === "video" ? "video" : "vivo", bloques: [], done: {}, ensayos: [], creado: today() }; save(); S.pc = null; S.perr = null; presGo("cargar"); }
      return true; }
    case "pcMode": S.pc = el.dataset.v; S.perr = null; render(); return true;
    case "pcBack": S.pc = null; S.perr = null; render(); return true;
    case "pcUse": {
      const t = (document.getElementById("pcText") || {}).value || "";
      if (PR.countWords(t) < 15) { S.perr = "El guion es muy corto. Pega al menos un par de párrafos."; S.pcText = t; render(); return true; }
      presSetBloques(PR.fromGuion(t), S.pc === "puente" ? "ia" : "texto", ""); return true; }
    case "pbCopy": {
      const ta = document.getElementById("pbPrompt");
      const ok = () => { el.textContent = "¡Copiado! Pégalo en tu IA"; };
      try { navigator.clipboard.writeText(ta.value).then(ok, () => { ta.select(); document.execCommand("copy"); ok(); }); } catch (e) { ta.select(); try { document.execCommand("copy"); ok(); } catch (e2) {} }
      return true; }
    case "pbMove": { const bs = p.bloques, i = bs.findIndex(b => b.id === el.dataset.bid), j = i + +el.dataset.dir; if (j < 0 || j >= bs.length) return true; [bs[i], bs[j]] = [bs[j], bs[i]]; PR.marcarTipos(bs); save(); render(); return true; }
    case "pbDel": { if (p.bloques.length <= 1) return true; p.bloques = p.bloques.filter(b => b.id !== el.dataset.bid); PR.marcarTipos(p.bloques); save(); render(); return true; }
    case "pbAdd": { const b = PR.mkBlock("Nueva idea", "", ""); p.bloques.splice(Math.max(1, p.bloques.length - 1), 0, b); PR.marcarTipos(p.bloques); save(); render(); return true; }
    case "pbKeyDel": { const b = pbFind(el.dataset.bid); b.claves = b.claves.filter(k => k !== el.dataset.k); b.kEdit = true; save(); render(); return true; }
    case "pbMic": {
      const b = pbFind(el.dataset.bid), ta = document.querySelector(`textarea[data-bid="${b.id}"]`);
      if (presDict && presDict.active) { presDict.stop(); return true; }
      const base = (ta.value || "").trim();
      presDict = Dictado({ lang: paisObj().voz, keepAlive: true,
        onText: t => { ta.value = (base ? base + " " : "") + t; },
        onError: code => { el.innerHTML = ICON_MIC + " Dictar"; alertNote(ta, micMsg(code)); },
        onEnd: () => { el.innerHTML = ICON_MIC + " Dictar"; b.texto = ta.value.trim(); if (!b.kEdit) b.claves = PR.keywords(b.texto + " " + b.apoyo + " " + b.titulo, 4); save(); render(); } });
      presDict.start(); if (presDict.active) el.innerHTML = ICON_STOP + " Detener";
      return true; }
    case "pbOk": {
      const t = PR.asignarTiempo(p.bloques, p.minutos);
      p.planCreado = true; save(); S.toast = t.faltan ? `Plan creado. ${t.faltan} bloques sin guion: practicarás con el texto de la lámina.` : "Plan creado. Empieza por la sesión de hoy.";
      presGo("plan"); return true; }
    case "presSes": presStartSes(el.dataset.ses); return true;
    case "presDelAsk": S.confirm = "presDel"; render(); return true;
    case "presDelYes": progress.pres = null; save(); S.confirm = null; go({ sub: null, tab: "inicio" }, "left"); return true;
    case "presFin": progress.presHist = (progress.presHist || []).concat([{ tema: p.tema, fecha: p.fecha, minutos: p.minutos, resultado: el.dataset.v, ensayos: (p.ensayos || []).length }]).slice(-30); progress.pres = null; save(); S.toast = "Guardado. ¡A preparar la siguiente!"; go({ sub: null, tab: "inicio" }, "left"); return true;
    case "psExit": presMicStop(); try { speechSynthesis.cancel(); } catch (e) {} S.ps = null; presGo("plan", null, "left"); return true;
    case "psDone": presDone(); return true;
    case "psSpeak": speak(presTxt(pbFind(el.dataset.bid))); return true;
    case "psSpeakQ": speak(S.ps.qs[S.ps.i]); return true;
    case "fdPeek": { const w = ev && ev.target.closest(".fd-h,.fd-i"); if (w) w.classList.add("peek"); else if (S.ps.nivel >= 4) { S.ps.nivel = 3; render(); } return true; }
    case "psMicGo": {
      const P = S.ps;
      if (P.tipo === "ensayo") {
        const ok = presMic((text, secs) => presEnsayoFin(text, secs));
        render(); if (ok) { presTimer = setInterval(presTick, 250); presTick(); }
      } else {
        const ok = presMic((text, secs) => {
          if (P.tipo === "preguntas") { const m = M.speechMetrics(text, secs, mulList()); P.res = { words: m.words, secs, mul: m.mul.count, ok: m.words >= 25 && secs <= 75 }; }
          else { P.oidas = []; P.aprendi = null; P.dicho = text; presEval(); }
          P.phase = "idle"; render(); });
        if (ok) render();
      }
      return true; }
    case "psMicStop": presMicFinish(); return true;
    case "psHzCheck": {
      const P = S.ps, b = pbFind(P.blocks[P.i]), gaps = PR.huecos(presTxt(b), b.claves, P.nivel === 2).filter(x => x.gap);
      const vals = gaps.map((_, i) => { const n = document.querySelector(`.hz-in[data-g="${i}"]`); return n ? n.value.trim() : ""; });
      const res = gaps.map((g, i) => PR.checkHueco(vals[i], g)), ok = res.filter(r => r !== "no").length;
      P.hz = { vals, res }; P.res = { r: gaps.length ? ok / gaps.length : 1, faltan: gaps.filter((_, i) => res[i] === "no").map(g => g.ans), equiv: res.filter(r => r === "equiv").length };
      if (P.res.r >= .7) chime(); render(); return true; }
    case "psHzReset": S.ps.hz = null; S.ps.res = null; render(); { const n = document.querySelector(".hz-in"); if (n) n.focus(); } return true;
    case "psEscCheck": {
      const P = S.ps, n = document.getElementById("psEsc"), v = n ? n.value.trim() : "";
      if (!v) { if (n) n.focus(); return true; }
      P.escVal = v; P.dicho = v; P.oidas = []; P.escrito = true; presEval(); if (P.res.r >= .7) chime(); render(); return true; }
    case "psQEscOk": {
      const n = document.getElementById("psQEsc"), v = n ? n.value.trim() : "";
      if (!v) { if (n) n.focus(); return true; }
      const words = PR.countWords(v), secs = words / PR.PPM * 60, m = M.speechMetrics(v, secs, mulList());
      S.ps.res = { words, secs, mul: m.mul.count, ok: words >= 25 && secs <= 75, est: true }; render(); return true; }
    case "psQRe": S.ps.res = null; render(); return true;
    case "psOida": {   /* «Lo dije»: cuenta la palabra en este intento y aprende cómo la escribe el micrófono */
      const P = S.ps, p = pres(), w = el.dataset.w, b = pbFind(P.blocks[P.i]);
      P.oidas = P.oidas || []; P.oLabel = P.oLabel || {}; p.alias = p.alias || {};
      if (P.oidas.includes(w)) {
        P.oidas = P.oidas.filter(x => x !== w); P.aprendi = null;
        const nuevos = (P.oAlias || {})[w] || []; if (p.alias[w]) { p.alias[w] = p.alias[w].filter(f => !nuevos.includes(f)); if (!p.alias[w].length) delete p.alias[w]; }
      } else {
        P.oidas.push(w); P.oLabel[w] = el.dataset.l || w;
        const forms = PR.escuchadoComo(P.dicho || "", presTxt(b), w).filter(f => !(p.alias[w] || []).includes(f));
        if (forms.length) { p.alias[w] = (p.alias[w] || []).concat(forms); (P.oAlias = P.oAlias || {})[w] = forms; P.aprendi = `Aprendido: cuando el micrófono escriba «${forms.join(" ")}», contaré «${P.oLabel[w]}».`; }
      }
      save(); presEval(); render(); return true; }
    case "psTimerOnly": { const P = S.ps; P.micErr = null; P.phase = "rec"; P.timerOnly = true; presT0 = Date.now(); render(); presTimer = setInterval(presTick, 250); presTick(); return true; }
    case "psGo": {   /* saltar a un bloque: cada bloque recuerda el nivel en que lo dejaste */
      const P = S.ps, i = +el.dataset.i; if (!(i >= 0 && i < P.blocks.length) || i === P.i) return true;
      P.niv = P.niv || {}; P.niv[P.i] = P.nivel; psReset(P);
      S.anim = i > P.i ? "right" : "left"; P.i = i; P.nivel = P.niv[i] || 0; render(); return true; }
    case "psLvl": {
      const P = S.ps, maxN = P.tipo === "ancla" ? 4 : 3, nv = P.nivel + (+el.dataset.d);
      if (nv < 0 || nv > maxN) return true;
      psReset(P); S.anim = nv > P.nivel ? "right" : "left"; P.nivel = nv; render(); return true; }
    case "psNext": {
      const P = S.ps, maxN = P.tipo === "ancla" ? 4 : 3;
      P.res = null; P.micErr = null; P.hz = null; P.escVal = ""; P.escrito = false;
      P.niv = P.niv || {}; P.hechos = P.hechos || {};
      if (P.nivel < maxN) P.nivel++;
      else { P.hechos[P.i] = true; P.niv[P.i] = P.nivel;
        const sig = P.blocks.findIndex((_, k) => k > P.i && !P.hechos[k]), otro = sig >= 0 ? sig : P.blocks.findIndex((_, k) => !P.hechos[k]);
        if (otro >= 0) { P.i = otro; P.nivel = P.niv[otro] || 0; } else { presDone(); return true; } }
      S.anim = "right"; render(); return true; }
    case "psFlip": S.ps.flip = true; render(); return true;
    case "psSabe": { const P = S.ps, b = pbFind(P.blocks[P.i]), v = el.dataset.v === "1"; P.sab = P.sab || {};
      if (!v && P.sab[P.i] !== false) { p.dif = p.dif || {}; p.dif[b.id] = (p.dif[b.id] || 0) + 1; save(); }
      if (v && P.sab[P.i] === false && p.dif && p.dif[b.id]) { p.dif[b.id]--; save(); }
      P.sab[P.i] = v; P.sabe = Object.values(P.sab).filter(Boolean).length;
      P.i++; P.flip = false; S.anim = "right"; render(); return true; }
    case "psPrev": { const P = S.ps; if (P.i > 0) { P.i--; P.flip = false; P.res = null; P.phase = "idle"; presMicStop(); S.anim = "left"; render(); } return true; }
    case "psNextQ": S.ps.i++; S.ps.res = null; S.ps.phase = "idle"; S.anim = "right"; render(); return true;
    case "psStep": S.ps.step++; S.anim = "right"; render(); return true;
    case "psFrase": S.ps.frase = Math.min(3, S.ps.frase + 1); if (S.ps.frase === 3) chime(); render(); return true;
    case "psBreath": {
      const P = S.ps; P.breath = true; render();
      const seq = [["Inhala", 4], ["Sostén", 4], ["Exhala", 6]], plan = [].concat(seq, seq, seq); let k = 0;
      const stepB = () => { const el2 = document.getElementById("brTxt"); if (!S.ps || S.ps !== P) return;
        if (k >= plan.length) { P.breath = false; if (el2) el2.textContent = "¡Bien!"; P.step = 1; chime(); render(); return; }
        const [txt, secs] = plan[k++]; if (el2) { el2.textContent = txt; el2.parentElement.dataset.ph = txt; } setTimeout(stepB, secs * 1000); };
      stepB(); return true; }
    case "relGo": S.ps.phase = "item"; S.ps.i = 0; S.ps.ans = null; S.ps.ver = false; S.anim = "right"; render(); if (S.ps.items[0] && S.ps.items[0].tipo === "con") relStart(); return true;
    case "relPick": {
      const P = S.ps, it = P.items[P.i]; if (P.ans != null) return true;
      relStop(); P.ans = +el.dataset.k; const o = relShuffle(it.opciones, P.i)[P.ans];
      const ok = it.validas.map(M.norm).includes(M.norm(o));
      if (ok) { P.ok++; if (!P.lento) P.rapidas++; chime(); } else softMiss();
      render(); return true; }
    case "relVer": S.ps.ver = true; tick(); render(); return true;
    case "relNext": { const P = S.ps; P.i++; P.ans = null; P.ver = false; P.lento = false; S.anim = "right"; render(); const n = P.items[P.i]; if (n && n.tipo === "con") relStart(); return true; }
    case "pbDifAdd": { const b = pbFind(el.dataset.bid), w = (document.getElementById("dw-" + b.id).value || "").trim(), alt = (document.getElementById("da-" + b.id).value || "").trim();
      if (!w || !alt) { alertNote(el, "Escribe la palabra y otra forma de decirla."); return true; }
      b.dificiles = (b.dificiles || []).concat([{ w, alt }]).slice(0, 8); save(); render(); return true; }
    case "pbDifDel": { const b = pbFind(el.dataset.bid); b.dificiles.splice(+el.dataset.k, 1); save(); render(); return true; }
    case "psEnsayoAgain": S.ps.phase = "idle"; S.ps.res = null; S.ps.live = ""; render(); return true;
  }
  return false;
}
function alertNote(near, msg) { const n = document.createElement("p"); n.className = "note warn"; n.textContent = msg; near.insertAdjacentElement("afterend", n); }

/* ===================== VIDEO CON TELEPROMPTER =====================
   Para tareas en video (y, más adelante, el video currículum): el guion avanza solo arriba de la pantalla,
   cerca del lente, mientras la cámara graba. Todo queda en el celular: el video nunca sale de ahí.
   El texto no sigue la voz: en Android el reconocimiento y la grabación pelean por el micrófono. */
const Vid = { stream: null, mr: null, chunks: [], blob: null, url: null, mime: "", t0: 0, timer: null, raf: 0, pos: 0, run: false, last: 0, cd: 0, cdTimer: null };
function vidCfg() { const c = progress.video || (progress.video = { texto: "", wpm: 130, size: "m", mirror: true, cam: "user" }); return c; }
function vidMime() {
  const c = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  try { return c.find(x => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(x)) || ""; } catch (e) { return ""; }
}
function vidSupported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder); }
function guionDePres(p) { return (p.bloques || []).map(b => presTxt(b)).filter(Boolean).join("\n\n"); }
function vidOpen(from) {
  const c = vidCfg(), p = pres();
  if (from === "pres" && p && p.bloques && p.bloques.length) c.texto = guionDePres(p);
  if (from === "pitch") c.texto = pitchTexto(pitchData());
  S.vidFrom = from || (["inicio", "presentaciones", "entrevistas"].includes(S.tab) ? S.tab : "presentaciones");
  S.vid = { fase: "editor", err: null };
  leaveSim(); go({ sub: "video" }, "right");
}
function vidRelease() {
  cancelAnimationFrame(Vid.raf); Vid.raf = 0; Vid.run = false; clearInterval(Vid.timer); clearInterval(Vid.cdTimer); Vid.cd = 0;
  try { if (Vid.mr && Vid.mr.state !== "inactive") { Vid.mr.onstop = null; Vid.mr.stop(); } } catch (e) {}
  Vid.mr = null;
  if (Vid.stream) { Vid.stream.getTracks().forEach(tr => tr.stop()); Vid.stream = null; }
  document.body.classList.remove("vid-full");
}
function vidStop() { vidRelease(); if (Vid.url) { URL.revokeObjectURL(Vid.url); Vid.url = null; } Vid.blob = null; }
async function vidCamara() {
  const c = vidCfg(), ta = document.getElementById("vidTxt");
  if (ta) c.texto = ta.value; save();
  if (PR.countWords(c.texto) < 5) { S.vid.err = "Pega tu guion primero (al menos unas frases)."; render(); return; }
  if (!vidSupported()) { S.vid.err = "Este navegador no puede grabar video. Prueba con Chrome en Android o Safari en iPhone."; render(); return; }
  vidRelease();
  try {
    Vid.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: c.cam, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } });
  } catch (e) {
    try { Vid.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: c.cam }, audio: true }); }
    catch (e2) { S.vid.err = e2 && e2.name === "NotAllowedError" ? "Aura necesita permiso para usar la cámara y el micrófono. Actívalo en el candado de la barra de direcciones." : "No pudimos abrir la cámara."; render(); return; }
  }
  if (Vid.url) { URL.revokeObjectURL(Vid.url); Vid.url = null; } Vid.blob = null;
  Vid.pos = 0; S.vid = { fase: "camara", err: null, rec: false }; document.body.classList.add("vid-full"); render();
}
function vidAfterRender() {
  if (S.sub !== "video" || !S.vid) return;
  const v = document.getElementById("vidCam"); if (v && Vid.stream && v.srcObject !== Vid.stream) { v.srcObject = Vid.stream; v.muted = true; v.play().catch(() => {}); }
  const box = document.getElementById("tpBox"); if (box) box.scrollTop = Vid.pos;
  const pv = document.getElementById("vidPlay"); if (pv && Vid.url && !pv.src) pv.src = Vid.url;
}
/* Velocidad: el texto recorre todo su alto en el tiempo que tomaría decirlo a ese ritmo. */
function tpSpeed() {
  const box = document.getElementById("tpBox"), c = vidCfg(); if (!box) return 0;
  const alto = Math.max(1, box.scrollHeight - box.clientHeight), secs = Math.max(5, PR.countWords(c.texto) / c.wpm * 60);
  return alto / secs;
}
function tpLoop(now) {
  const box = document.getElementById("tpBox");
  if (!box || !Vid.run) { Vid.raf = 0; return; }
  const dt = Vid.last ? (now - Vid.last) / 1000 : 0; Vid.last = now;
  Vid.pos = Math.min(box.scrollHeight - box.clientHeight, Vid.pos + tpSpeed() * dt); box.scrollTop = Vid.pos;
  Vid.raf = requestAnimationFrame(tpLoop);
}
function tpRun(on) { Vid.run = on; Vid.last = 0; cancelAnimationFrame(Vid.raf); if (on) Vid.raf = requestAnimationFrame(tpLoop); const b = document.getElementById("tpBox"); if (b) b.classList.toggle("paused", !on); }
function vidCuenta() {
  if (!Vid.stream) return;
  Vid.pos = 0; const box = document.getElementById("tpBox"); if (box) box.scrollTop = 0;
  Vid.cd = 3; const el = document.getElementById("vidCd"); if (el) { el.textContent = "3"; el.hidden = false; }
  clearInterval(Vid.cdTimer);
  Vid.cdTimer = setInterval(() => { Vid.cd--; const e2 = document.getElementById("vidCd");
    if (Vid.cd > 0) { if (e2) e2.textContent = Vid.cd; return; }
    clearInterval(Vid.cdTimer); if (e2) e2.hidden = true; vidGrabar(); }, 1000);
}
function vidGrabar() {
  const mime = vidMime(), o = { videoBitsPerSecond: 2500000, audioBitsPerSecond: 128000 }; if (mime) o.mimeType = mime;
  Vid.chunks = [];
  try { Vid.mr = new MediaRecorder(Vid.stream, o); } catch (e) { try { Vid.mr = new MediaRecorder(Vid.stream); } catch (e2) { S.vid.err = "No se pudo iniciar la grabación."; render(); return; } }
  Vid.mime = Vid.mr.mimeType || mime || "video/webm";
  Vid.mr.ondataavailable = e => { if (e.data && e.data.size) Vid.chunks.push(e.data); };
  Vid.mr.onstop = () => {
    Vid.blob = new Blob(Vid.chunks, { type: Vid.mime.split(";")[0] }); Vid.url = URL.createObjectURL(Vid.blob);
    const secs = (Date.now() - Vid.t0) / 1000; vidRelease(); markDay(); save();
    S.vid = { fase: "revision", secs, err: null }; S.anim = "up"; render();
  };
  Vid.mr.start(1000); Vid.t0 = Date.now(); S.vid.rec = true;
  const b = document.getElementById("vidRecBtn"); if (b) { b.disabled = false; b.classList.add("live"); b.setAttribute("aria-label", "Terminar grabación"); b.dataset.act = "vidFin"; }
  const lbl = document.getElementById("vidClock"); if (lbl) lbl.hidden = false;
  clearInterval(Vid.timer); Vid.timer = setInterval(() => { const l = document.getElementById("vidClock"); if (l) l.textContent = "● " + fmtSec((Date.now() - Vid.t0) / 1000); }, 250);
  tpRun(true);
}
function vidExt() { return /mp4/.test(Vid.mime) ? "mp4" : "webm"; }
function vidNombre() { const d = new Date(), z = n => String(n).padStart(2, "0"); return `aura-video-${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}.${vidExt()}`; }
async function vidGuardar() {
  if (!Vid.blob) return;
  const file = new File([Vid.blob], vidNombre(), { type: Vid.blob.type });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "Mi video" }); return; } }
  catch (e) { if (e && e.name === "AbortError") return; }
  vidDescargar();
}
function vidDescargar() {
  if (!Vid.url) return;
  const a = document.createElement("a"); a.href = Vid.url; a.download = vidNombre(); document.body.appendChild(a); a.click(); a.remove();
  S.vid.bajado = true; render();
}
const TP_SIZE = { s: "Pequeña", m: "Mediana", l: "Grande" };
function vVideo() {
  const c = vidCfg(), V = S.vid || (S.vid = { fase: "editor" }), words = PR.countWords(c.texto), back = S.vidFrom === "pres" ? "Mi plan" : S.vidFrom === "pitch" ? "Mi pitch" : PILAR_NOM[S.vidFrom] || "Presentaciones";
  if (V.fase === "camara") {
    const parr = String(c.texto).split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
    return `<div class="vid-stage" role="dialog" aria-label="Grabar video con teleprompter">
      <video id="vidCam" class="${c.mirror && c.cam === "user" ? "mirror" : ""}" playsinline muted autoplay></video>
      <div id="tpBox" class="tp tp-${c.size}" data-act="tpToggle" aria-label="Teleprompter: toca para pausar o seguir"><div class="tp-pad"></div>${parr.map(x => `<p>${esc(x)}</p>`).join("")}<div class="tp-pad end"></div></div>
      <div id="vidCd" class="vid-cd" hidden>3</div>
      <div class="vid-bar">
        <button class="vid-ic" data-act="vidCerrar" aria-label="Cerrar cámara">×</button>
        <button class="vid-ic" data-act="vidFlip" aria-label="Cambiar cámara" ${V.rec ? "disabled" : ""}>⟲</button>
      </div>
      <div class="vid-speed"><button class="vid-ic sm" data-act="tpVel" data-d="-10" aria-label="Más lento">−</button><span id="tpVel">${c.wpm} ppm</span><button class="vid-ic sm" data-act="tpVel" data-d="10" aria-label="Más rápido">+</button></div>
      <span id="vidClock" class="vid-clock" ${V.rec ? "" : "hidden"}>● 0:00</span>
      <button id="vidRecBtn" class="vid-rec${V.rec ? " live" : ""}" data-act="${V.rec ? "vidFin" : "vidGo"}" aria-label="${V.rec ? "Terminar grabación" : "Empezar a grabar"}"><span></span></button>
      ${V.err ? `<p class="vid-err">${esc(V.err)}</p>` : ""}
    </div>`;
  }
  if (V.fase === "revision") {
    const mb = Vid.blob ? (Vid.blob.size / 1048576).toFixed(1) : "0";
    return `<section class="section"><button class="back" data-act="vidBack">← ${esc(back)}</button>
      <div><p class="eyebrow">Tu video</p><h2>¿Cómo quedó?</h2><p class="lead">${fmtSec(V.secs || 0)} min · ${mb} MB · ${vidExt().toUpperCase()}</p></div>
      <video id="vidPlay" class="vid-play" controls playsinline></video>
      <div class="row"><button class="btn primary" data-act="vidGuardar">Guardar o compartir</button><button class="btn" data-act="vidOtra">Grabar otra vez</button></div>
      <p class="note">${navigator.canShare ? "En Android elige Google Fotos o Drive para que quede en tu galería; en iPhone, «Guardar video»." : "Se descargará el archivo a tu celular."} <button class="linkish" data-act="vidBajar">Descargar el archivo</button></p>
      ${vidExt() === "webm" ? `<p class="note warn">Tu celular grabó en formato WebM. Se ve bien en Google Fotos y Drive, pero algunas apps, como WhatsApp o Instagram, podrían no aceptarlo.</p>` : ""}
      ${V.bajado ? `<p class="toast">Descargado. Búscalo en la carpeta Descargas o en tu galería.</p>` : ""}
      <p class="note">El video queda solo en tu celular: Aura no lo sube a ninguna parte. Si sales de esta pantalla sin guardarlo, se pierde.</p>
    </section>`;
  }
  return `<section class="section"><button class="back" data-act="vidBack">← ${esc(back)}</button>
    <div><p class="eyebrow">Video con teleprompter</p><h2>Grabar un video</h2><p class="lead">Pega tu guion. Mientras grabas, el texto avanza solo arriba de la pantalla, cerca de la cámara, para que no se note que lees.</p></div>
    <div class="panel">
      <div class="field"><label for="vidTxt">Tu guion</label><textarea id="vidTxt" class="esc-ta" rows="8" placeholder="Pega aquí lo que vas a decir. Deja una línea en blanco entre párrafos.">${esc(c.texto)}</textarea>
        <span class="note" id="vidInfo">${words ? `${words} palabras · unos ${PR.fmt(words / c.wpm * 60)} a ${c.wpm} palabras por minuto` : "Funciona con guiones en cualquier idioma, por ejemplo para un ramo de inglés."}</span></div>
      <div class="field"><span class="lbl">Velocidad del texto</span><div class="pw-opts flat">${[[110, "Lenta"], [130, "Normal"], [150, "Rápida"]].map(o => chipBtn("vidSet", o[0], o[1] + " · " + o[0], c.wpm === o[0], ' data-k="wpm"')).join("")}</div>
        <span class="note">Durante la grabación puedes ajustarla con − y +, y tocar el texto para pausarlo.</span></div>
      <div class="field"><span class="lbl">Tamaño de letra</span><div class="pw-opts flat">${Object.entries(TP_SIZE).map(([k, l]) => chipBtn("vidSet", k, l, c.size === k, ' data-k="size"')).join("")}</div></div>
      <div class="field"><span class="lbl">Cámara</span><div class="pw-opts flat">${chipBtn("vidSet", "user", "Frontal", c.cam === "user", ' data-k="cam"')}${chipBtn("vidSet", "environment", "Trasera", c.cam === "environment", ' data-k="cam"')}</div></div>
      ${V.err ? `<p class="fb no">${esc(V.err)}</p>` : ""}
      <button class="btn primary wide" data-act="vidCam">${ICON_PLAY} Abrir la cámara</button>
      <p class="note">Consejo: apoya el celular a la altura de los ojos, con luz de frente, y mira el lente al empezar y al cerrar cada idea.</p>
    </div></section>`;
}
function vidAct(a, el) {
  const c = vidCfg();
  switch (a) {
    case "vidOpen": vidOpen(el.dataset.from); return true;
    case "vidBack": { const f = S.vidFrom; vidStop(); S.vid = null; if (f === "pitch") { S.pt = { paso: PT_PASOS.length }; go({ sub: "pitch" }, "left"); return true; } if (f === "pres" && pres()) presGo("plan", null, "left"); else go({ sub: null, tab: PILAR_NOM[f] ? f : "presentaciones" }, "left"); return true; }
    case "vidSet": { const ta = document.getElementById("vidTxt"); if (ta) c.texto = ta.value; const k = el.dataset.k; c[k] = k === "wpm" ? +el.dataset.v : el.dataset.v; save(); render(); return true; }
    case "vidCam": vidCamara(); return true;
    case "vidGo": vidCuenta(); el.disabled = true; return true;
    case "vidFin": { try { if (Vid.mr && Vid.mr.state !== "inactive") Vid.mr.stop(); } catch (e) {} tpRun(false); return true; }
    case "vidCerrar": vidRelease(); S.vid = { fase: "editor", err: null }; render(); return true;
    case "vidFlip": c.cam = c.cam === "user" ? "environment" : "user"; save(); vidCamara(); return true;
    case "tpToggle": if (S.vid && S.vid.rec) tpRun(!Vid.run); else if (!Vid.cd) { Vid.pos = Math.max(0, Vid.pos - 80); const b = document.getElementById("tpBox"); if (b) b.scrollTop = Vid.pos; } return true;
    case "tpVel": { c.wpm = Math.max(80, Math.min(200, c.wpm + (+el.dataset.d))); save(); const l = document.getElementById("tpVel"); if (l) l.textContent = c.wpm + " ppm"; return true; }
    case "vidGuardar": vidGuardar(); return true;
    case "vidBajar": vidDescargar(); return true;
    case "vidOtra": vidCamara(); return true;
  }
  return false;
}

/* ===================== PITCH Y VIDEO CURRÍCULUM (Entrevistas · paso 4) =====================
   Asistente de 7 partes (pasado → transición → futuro). El guion se arma solo con las respuestas,
   se puede editar a mano y se graba con el teleprompter. Motor en js/pitch.js. */
const PT = window.AuraPitch;
function pitchData() {
  const p = progress.pitch || (progress.pitch = { tipo: "video", saludo: "Buenos días", nombre: (progress.profile && progress.profile.name) || "", exp: [{}, {}, {}], comps: [], check: {} });
  if (!p.exp) p.exp = [{}, {}, {}]; if (!p.comps) p.comps = []; if (!p.check) p.check = {};
  return p;
}
function pitchTexto(p) { return p.editado && p.guion ? p.guion : PT.guion(p); }
/* Edición a mano del guion: lo escrito queda como borrador (no se pierde) y solo pasa a ser «tu pitch»
   (el que usan el teleprompter, el video y «Escucharlo») cuando aprietas Guardar. */
const ptSucio = p => p.guionBorrador != null && p.guionBorrador.trim() !== pitchTexto(p).trim();
function ptSaveHTML(p) {
  if (ptSucio(p)) return `<div class="pt-save"><span class="note" style="margin:0"><b>Tienes cambios sin guardar.</b> El teleprompter usa la última versión guardada.</span>
    <div class="row"><button class="btn primary" data-act="ptGuardar">${ICON_CHECK} Guardar cambios</button><button class="btn" data-act="ptDescartar">Descartar</button></div></div>`;
  if (S.ptOk) return `<p class="fb ok" style="margin:0">${ICON_CHECK} Guardado. Este es ahora tu pitch.</p><span class="note"><button class="linkish" data-act="ptRegen">Volver a armarlo desde tus respuestas</button></span>`;
  return p.editado ? `<span class="note">Editado a mano y guardado. <button class="linkish" data-act="ptRegen">Volver a armarlo desde tus respuestas</button></span>`
    : `<span class="note">Puedes cambiarlo aquí mismo; aparecerá el botón «Guardar cambios».</span>`;
}
const PT_PASOS = [
  { k: "tipo", t: "¿Para qué es tu pitch?", why: "El mismo relato sirve para tres cosas; cambia cuánto dura y cómo termina." },
  { k: "saludo", t: "Saludo y nombre", why: "Empieza simple: un saludo formal y tu nombre completo." },
  { k: "formacion", t: "Tu formación", why: "Qué estudias o estudiaste y dónde. Una sola oración." },
  { k: "experiencia", t: "Tu experiencia, en síntesis", why: "Solo rubros y áreas donde has trabajado. Sin tareas ni logros: eso es para la entrevista." },
  { k: "competencias", t: "Tus competencias clave", why: "Entre 3 y 5, las que más sirven para lo que buscas y que puedas respaldar con un ejemplo." },
  { k: "transicion", t: "La transición", why: "Lo que une tu pasado con lo que quieres: qué te mostró tu experiencia y un momento concreto que lo pruebe." },
  { k: "futuro", t: "Lo que buscas", why: "Di claro qué buscas y qué quieres aportar. Así el que escucha sabe cómo ayudarte." }
];
function ptField(id, label, val, ph, path) {
  return `<div class="field"><label for="${id}">${label}</label><input type="text" id="${id}" data-pf="${path || id.replace(/^pf-/, "")}" value="${esc(val || "")}" placeholder="${esc(ph)}" maxlength="220"></div>`;
}
/* Campo con opciones para tocar: la opción elegida llena el cuadro, que sigue siendo editable. */
function optList(act, path, opts, cur, attr) {
  cur = t2(cur);
  /* Con una opción elegida se muestra solo esa (la pantalla queda corta); «Ver otras» la suelta y vuelve a mostrar todas. */
  if (opts.includes(cur)) return `<div class="tipo-list opt-list"><button class="pw-opt tipo-opt on" data-act="${act}" data-p="${path}" data-v="${esc(cur)}"${attr || ""}>${esc(cur)}</button>
    <button class="linkish opt-more" data-act="${act}" data-p="${path}" data-v="${esc(cur)}"${attr || ""}>Ver otras opciones</button></div>`;
  return opts.length ? `<div class="tipo-list opt-list">${opts.map(o => `<button class="pw-opt tipo-opt${cur === o ? " on" : ""}" data-act="${act}" data-p="${path}" data-v="${esc(o)}"${attr || ""}>${esc(o)}</button>`).join("")}</div>` : "";
}
function ptChoice(id, label, val, opts, ph, path) {
  path = path || id.replace(/^pf-/, "");
  return `<div class="field"><span class="lbl">${label}</span>${optList("ptOpt", path, opts, val)}
    <label class="opt-own" for="${id}">${!opts.length ? "" : opts.includes(t2(val)) ? "Ajústala con un detalle tuyo si quieres" : "O escríbelo tú"}</label><input type="text" id="${id}" data-pf="${path}" value="${esc(val || "")}" placeholder="${esc(ph)}" maxlength="220"></div>`;
}
function ptPasoHTML(k, p) {
  if (k === "tipo") return `<div class="tipo-list">${Object.entries(PT.TIPOS).map(([id, x]) => `<button class="pw-opt tipo-opt${p.tipo === id ? " on" : ""}" data-act="ptSet" data-k="tipo" data-v="${id}"><b>${esc(x.nombre)}</b><small>${esc(x.desc)} Meta: ${PR.fmt(x.secs)}.</small></button>`).join("")}</div>
      ${ptChoice("pf-audiencia", "¿Quién lo va a ver o escuchar? (opcional)", p.audiencia, ["empresas que buscan practicantes", "reclutadores de mi área", "un profesional que admiro"], "Ej: empresas que buscan practicantes de logística")}`;
  if (k === "saludo") return `<div class="field"><span class="lbl">Saludo</span><div class="pw-opts flat">${["Buenos días", "Buenas tardes", "Hola"].map(s => chipBtn("ptSet", s, s, p.saludo === s, ' data-k="saludo"')).join("")}</div></div>
      ${ptField("pf-nombre", "Tu nombre y apellido", p.nombre, "Ej: Camila Soto")}`;
  if (k === "formacion") return ptField("pf-carrera", "¿Qué estudias o estudiaste?", p.carrera, "Ej: estudiante de Ingeniería Comercial")
      + ptField("pf-inst", "¿Dónde?", p.inst, "Ej: la Universidad de Chile")
      + ptChoice("pf-etapa", "¿En qué etapa vas? (opcional)", p.etapa, PT.OPC.etapa, "Ej: en el último año de la carrera")
      + ptField("pf-enfasis", "Formación en… (opcional)", p.enfasis, "Ej: finanzas y análisis de datos");
  if (k === "experiencia") return [0, 1, 2].map(i => `<div class="pt-exp"><span class="eyebrow">Experiencia ${i + 1}${i ? " (opcional)" : ""}</span>
      ${ptChoice("pf-exp" + i + "r", "Rubro o tipo de empresa", (p.exp[i] || {}).rubro, i && !t2((p.exp[i - 1] || {}).rubro) ? [] : PT.OPC.rubro, i === 0 ? "Ej: retail" : i === 1 ? "Ej: una agencia de marketing" : "Ej: el comercio", "exp." + i + ".rubro")}
      ${ptChoice("pf-exp" + i + "q", "¿En qué área o rol?", (p.exp[i] || {}).que, i && !t2((p.exp[i - 1] || {}).rubro) ? [] : PT.OPC.que, i === 0 ? "Ej: en bodega, apoyando el control de inventario" : "Ej: en atención al público y ventas", "exp." + i + ".que")}</div>`).join("")
      + `<p class="note">¿Sin experiencia laboral? Usa voluntariados, ayudantías, proyectos de la universidad o un emprendimiento.</p>`;
  if (k === "competencias") {
    const sel = p.comps.map(c => c.toLowerCase()), mias = perfil().clave.map(id => EN.COMP_IDX[id] && EN.COMP_IDX[id].nombre).filter(c => c && !sel.includes(c.toLowerCase()));
    return `${mias.length ? `<div class="field"><span class="lbl">De tu autodiagnóstico</span><div class="pw-opts flat comp-sug">${mias.map(c => chipBtn("ptComp", c, "+ " + c, false)).join("")}</div></div>` : ""}<div class="pb-keys">${p.comps.map((c, i) => `<span class="kchip">${esc(c)}<button class="x" data-act="ptCompDel" data-i="${i}" aria-label="Quitar ${esc(c)}">×</button></span>`).join("") || `<span class="note">Aún no eliges ninguna.</span>`}</div>
      <div class="pw-opts flat comp-sug">${PT.SUG_COMP.filter(c => !sel.includes(c.toLowerCase())).map(c => chipBtn("ptComp", c, "+ " + c, false)).join("")}</div>
      <div class="field"><label for="ptCompNew">¿Otra? Escríbela y presiona Enter</label><input type="text" id="ptCompNew" maxlength="60" placeholder="Ej: Manejo de Excel y Power BI"></div>`;
  }
  if (k === "transicion") return (() => { const ls = perfil().logros.map(l => EN.fraseLogro(l)).filter(Boolean);
      return ls.length ? `<div class="field"><span class="lbl">Usa uno de tus logros como momento concreto</span><div class="tipo-list">${ls.map((f, i) => `<button class="pw-opt tipo-opt${p.momento && f.toLowerCase().startsWith(p.momento.slice(0, 20).toLowerCase()) ? " on" : ""}" data-act="ptLogro" data-i="${i}">${esc(f)}</button>`).join("")}</div></div>` : ""; })()
      + ptChoice("pf-motivo", "¿Qué te mostró tu experiencia o qué te motiva?", p.motivo, PT.OPC.motivo, "Ej: me motiva entender por qué un proceso falla y mejorarlo")
      + ptField("pf-momento", "Un momento concreto que lo muestre (opcional)", p.momento, "Ej: rediseñé una ruta de despacho y todos los clientes recibieron a tiempo")
      + `<p class="note">Si estás cambiando de área, explica el cambio por algo tuyo («descubrí que soy bueno en…»), no por algo externo.</p>`;
  if (k === "futuro") { const ap = EN.opcionesAporte(perfil()).concat(PT.OPC.aporte);
    return `<div class="field"><span class="lbl">¿Qué buscas?</span><div class="pw-opts flat">${PT.OPC.bTipo.map(s => chipBtn("ptBusco", s, s, p.bTipo === s, ' data-k="bTipo"')).join("")}</div></div>
      <div class="field"><span class="lbl">¿En qué área? (opcional)</span><div class="pw-opts flat comp-sug">${PT.OPC.bArea.map(s => chipBtn("ptBusco", s, s, p.bArea === s, ' data-k="bArea"')).join("")}</div></div>
      ${ptField("pf-busco", "Así queda (puedes ajustarlo)", p.busco, "Ej: realizar mi práctica profesional en finanzas")}`
      + ptChoice("pf-aporte", "¿Qué quieres aportar? (opcional)", p.aporte, ap.filter((x, i) => ap.indexOf(x) === i).slice(0, 6), "Ej: mi experiencia en atención a clientes"); }
  return "";
}
function vPitch() {
  const p = pitchData(), P = S.pt || (S.pt = { paso: 0 }), n = PT_PASOS.length;
  if (P.paso >= n) {
    const txt = pitchTexto(p), secs = PT.segundos(txt), meta = (PT.TIPOS[p.tipo] || PT.TIPOS.video).secs, revs = PT.revisar(p, txt);
    const okT = Math.abs(secs - meta) <= meta * 0.15;
    const CHECK = [["fondo", "Fondo claro y ordenado"], ["luz", "Luz de frente (una ventana o lámpara frente a ti, no detrás)"], ["altura", "Celular fijo a la altura de los ojos (trípode o unos libros)"],
      ["ropa", "Ropa acorde a la empresa a la que postulas"], ["mirada", "Miras al lente en el saludo y en el cierre"], ["final", "Pantalla final con tu nombre, teléfono, correo y LinkedIn"]];
    return `<section class="section">${S.toast ? `<p class="toast">${esc(S.toast)}</p>` : ""}<button class="back" data-act="ptPaso" data-d="-1">← Editar respuestas</button>
      <div><p class="eyebrow">${esc((PT.TIPOS[p.tipo] || PT.TIPOS.video).nombre)}</p><h2>Tu pitch</h2></div>
      <div class="kpis two"><div class="kpi"><b class="${okT ? "good" : "warn"}">${PR.fmt(secs)}</b><span>de ${PR.fmt(meta)} recomendados</span></div><div class="kpi"><b>${PT.words(txt)}</b><span>palabras</span></div></div>
      ${revs.length ? `<div class="panel"><h3>Antes de grabar</h3>${revs.map(r => `<p class="fb ${r.nivel === "no" ? "no" : r.nivel === "mid" ? "mid" : "ok"}" style="margin:0">${esc(r.txt)}</p>`).join("")}</div>` : `<p class="fb ok">Tu relato tiene las 7 partes y está dentro del tiempo.</p>`}
      ${(() => { const c = cvData(), sug = c ? cvSugerencias() : [];
        if (!c) return `<p class="note" style="margin:0">¿Tienes CV? <button class="linkish" data-act="entIr" data-v="cv" data-from="pitch">Súbelo</button> y te decimos qué tienes ahí y no estás usando en tu pitch.</p>`;
        return sug.length || S.cvHecho ? `<div class="panel"><h3>De tu CV, y no está en tu pitch</h3>${cvHechoHTML("pitch")}${cvSugHTML(sug, "pitch")}</div>` : ""; })()}
      <div class="field"><label for="ptGuion">Tu guion (puedes editarlo)</label><textarea id="ptGuion" class="esc-ta" rows="12">${esc(p.guionBorrador != null ? p.guionBorrador : txt)}</textarea>
        <div id="ptSave">${ptSaveHTML(p)}</div></div>
      <div class="row"><button class="btn primary" data-act="vidOpen" data-from="pitch">${ICON_CAM} ${p.tipo === "video" ? "Grabar con teleprompter" : "Practicar con teleprompter"}</button>
        <button class="btn" data-act="ptOir">${ICON_SPEAK} Escucharlo</button><button class="btn" data-act="ptCopy">Copiar</button></div>
      <p class="note">Consejo: no lo memorices palabra por palabra. Apréndete el orden de las 7 partes y las palabras clave; así sonarás natural.</p>
      ${p.tipo === "video" ? `<div class="panel"><h3>Checklist de grabación</h3>${CHECK.map(([id, l]) => `<label class="ck-row"><input type="checkbox" data-ptck="${id}" ${p.check[id] ? "checked" : ""}> <span>${esc(l)}</span></label>`).join("")}
        <p class="note">La pantalla final con tus datos va escrita, no dicha: agrégala al editar el video, o muéstrala en una hoja frente a la cámara.</p></div>` : ""}
    </section>`;
  }
  const st = PT_PASOS[P.paso], prev = PT.partes(p)[st.k === "tipo" ? "cierre" : st.k];
  return `<section class="section"><button class="back" data-act="${P.paso === 0 ? "ptSalir" : "ptPaso"}" data-d="-1">← ${P.paso === 0 ? "Entrevistas" : "Atrás"}</button>
    <div><p class="eyebrow">Pitch y video currículum · parte ${P.paso + 1} de ${n}</p><h2>${esc(st.t)}</h2><p class="lead">${esc(st.why)}</p></div>
    <div class="dotsprog">${PT_PASOS.map((_, k) => `<i class="${k <= P.paso ? "done" : ""}"></i>`).join("")}</div>
    <div class="panel">${ptPasoHTML(st.k, p)}</div>
    <div class="pt-prev"><span class="eyebrow">${st.k === "tipo" ? "Así va a terminar" : "Así queda en tu guion"}</span><p id="ptPrev">${esc(prev || "…")}</p></div>
    <button class="btn primary wide" data-act="ptPaso" data-d="1">${P.paso === n - 1 ? "Ver mi pitch completo" : "Siguiente"}</button>
  </section>`;
}
function pitchSet(path, v) {
  const p = pitchData(), ks = path.split("."); let o = p;
  for (let i = 0; i < ks.length - 1; i++) { const k = ks[i]; if (o[k] == null) o[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; o = o[k]; }
  o[ks[ks.length - 1]] = v; save();
}
function ptAct(a, el) {
  const p = pitchData();
  switch (a) {
    case "ptOpen": S.pt = { paso: el.dataset.fin && p.carrera ? PT_PASOS.length : 0 }; leaveSim(); go({ sub: "pitch" }, "right"); return true;
    case "ptSalir": go({ sub: null, tab: "entrevistas" }, "left"); return true;
    case "ptPaso": { const n = S.pt.paso + (+el.dataset.d); S.pt.paso = Math.max(0, Math.min(PT_PASOS.length, n)); S.anim = el.dataset.d > 0 ? "right" : "left"; render(); return true; }
    case "ptSet": p[el.dataset.k] = el.dataset.v; save(); render(); return true;
    case "ptOpt": { const cur = el.dataset.p.split(".").reduce((o, k) => o && o[k], p); pitchSet(el.dataset.p, t2(cur) === el.dataset.v ? "" : el.dataset.v); render(); return true; }
    case "ptBusco": { const k = el.dataset.k; p[k] = p[k] === el.dataset.v ? "" : el.dataset.v; p.busco = [p.bTipo, p.bArea ? "en " + p.bArea : ""].filter(Boolean).join(" ");
      if (!p.bTipo && p.bArea) p.busco = "trabajar en " + p.bArea; save(); render(); return true; }
    case "ptComp": if (p.comps.length < 8) p.comps.push(el.dataset.v); save(); render(); return true;
    case "ptLogro": { const l = perfil().logros.filter(x => EN.fraseLogro(x))[+el.dataset.i]; if (l) { p.momento = EN.fraseLogro(l).replace(/\.$/, ""); p.momento = p.momento[0].toLowerCase() + p.momento.slice(1); save(); render(); } return true; }
    case "ptCompDel": p.comps.splice(+el.dataset.i, 1); save(); render(); return true;
    case "ptRegen": p.editado = false; p.guion = ""; delete p.guionBorrador; S.ptOk = false; save(); render(); return true;
    case "ptGuardar": if (p.guionBorrador != null) { p.guion = p.guionBorrador.trim(); p.editado = true; delete p.guionBorrador; S.ptOk = true; save(); render(); } return true;
    case "ptDescartar": delete p.guionBorrador; S.ptOk = false; save(); render(); return true;
    case "ptOir": speak(pitchTexto(p)); return true;
    case "ptCopy": { const txt = pitchTexto(p), ok = () => { el.textContent = "¡Copiado!"; };
      try { navigator.clipboard.writeText(txt).then(ok, () => {}); } catch (e) {} return true; }
  }
  return false;
}

/* ===================== ENTREVISTAS: CONÓCETE, LOGROS, RESPUESTAS Y SIMULACIÓN =====================
   Autodiagnóstico propio (no es un test validado: el usuario confirma o descarta cada resultado),
   logros con resultados medibles y respuestas armadas con plantillas. Todo queda en el celular.
   Motor y contenidos en js/entrevista.js. */
const EN = window.AuraEnt;
function perfil() {
  const p = progress.perfil || (progress.perfil = {});
  p.estilo = p.estilo || { resp: {}, marca: {}, nota: {} }; p.comps = p.comps || {}; p.clave = p.clave || []; p.motiv = p.motiv || [];
  p.ideal = p.ideal || {}; p.logros = p.logros || []; p.resp = p.resp || {};
  return p;
}
function entGo(v, extra, anim) { leaveSim(); go({ sub: "ent", ev: Object.assign({ v }, extra || {}) }, anim || "right"); }
function entSet(path, v) {
  const p = perfil(), ks = path.split("."); let o = p;
  for (let i = 0; i < ks.length - 1; i++) { const k = ks[i]; if (o[k] == null) o[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; o = o[k]; }
  o[ks[ks.length - 1]] = v; save();
}
function entField(path, label, val, ph, area) {
  const id = "ef-" + path.replace(/\./g, "-");
  return `<div class="field"><label for="${id}">${label}</label>${area ? `<textarea id="${id}" class="esc-ta" rows="3" data-ef="${path}" placeholder="${esc(ph)}" maxlength="400">${esc(val || "")}</textarea>`
    : `<input type="text" id="${id}" data-ef="${path}" value="${esc(val || "")}" placeholder="${esc(ph)}" maxlength="220">`}</div>`;
}
function entChoice(path, label, val, opts, ph, area) {
  const id = "ef-" + path.replace(/\./g, "-");
  return `<div class="field"><span class="lbl">${label}</span>${optList("entOpt", path, opts, val)}
    <label class="opt-own" for="${id}">${!opts.length ? "" : opts.includes(t2(val)) ? "Ajústala con un detalle tuyo si quieres" : "O escríbelo tú"}</label>${area ? `<textarea id="${id}" class="esc-ta" rows="2" data-ef="${path}" placeholder="${esc(ph)}" maxlength="400">${esc(val || "")}</textarea>`
    : `<input type="text" id="${id}" data-ef="${path}" value="${esc(val || "")}" placeholder="${esc(ph)}" maxlength="220">`}</div>`;
}
const NOTA_REAL = `<p class="note real">Toca la opción que se parezca a algo que <b>de verdad</b> te pasó y, si puedes, agrégale un detalle tuyo (dónde, con quién). El entrevistador puede pedirte más detalles.</p>`;
/* Campos que dependen de la debilidad o fortaleza elegida: se rearman si la escribes a mano. */
function respSubCampos(k, c, base, p) {
  if (k === "fortaleza") return logroPicker(c, base, p) + entChoice(base + "aporte", "¿Cómo te ayudaría en el cargo? (opcional)", c.aporte, EN.opcionesFortaleza(c), "Ej: ordenar la operación desde el primer día");
  const o = EN.opcionesDebilidad(c);
  return entChoice(base + "ejemplo", "¿Cuándo lo notaste? Elige una situación parecida", c.ejemplo, o.ej, "Ej: acepté tres turnos extra la misma semana")
    + entChoice(base + "accion", "¿Qué estás haciendo para mejorarlo?", c.accion, o.acc, "Ej: ahora reviso mi carga antes de comprometerme")
    + entChoice(base + "avance", "¿Qué ha cambiado? (opcional)", c.avance, o.av, "Ej: aviso con tiempo cuando no alcanzo");
}
function entHead(titulo, sub, backAct, backLbl) {
  return `<button class="back" data-act="${backAct || "entSalir"}">← ${esc(backLbl || "Entrevistas")}</button><div><p class="eyebrow">${esc(sub)}</p><h2>${esc(titulo)}</h2></div>`;
}
const estiloListo = () => Object.keys(perfil().estilo.resp).length >= EN.PREG_ESTILO.length;
function entTexto(k) {
  const p = perfil(), c = p.resp[k] || {};
  if (c.editado && c.texto) return c.texto;
  if (k === "cuentame") return progress.pitch && progress.pitch.carrera ? pitchTexto(progress.pitch) : "";
  return EN.respuesta(k, c, { logro: c.logro != null ? p.logros[c.logro] : null, motiv: p.motiv });
}
const RESP_LISTA = k => !!t2(entTexto(k));
function t2(s) { return String(s || "").trim(); }

/* ---------- Paso 1 · estilo de trabajo ---------- */
function vEstilo() {
  const e = perfil().estilo, i = S.ev.i || 0, q = EN.PREG_ESTILO[i];
  return `<section class="section">${entHead("Tu estilo de trabajo", `Conócete · pregunta ${i + 1} de ${EN.PREG_ESTILO.length}`)}
    <div class="dotsprog">${EN.PREG_ESTILO.map((_, k) => `<i class="${k <= i ? "done" : ""}"></i>`).join("")}</div>
    <div class="panel"><h3>${esc(q.q)}</h3><p class="note">Elige la que más se parece a ti. No hay respuestas buenas ni malas.</p>
      <div class="tipo-list">${EN.opcionesEstilo(i).map(k => `<button class="pw-opt tipo-opt${e.resp[i] === k ? " on" : ""}" data-act="estPick" data-v="${k}">${esc(q.o[k])}</button>`).join("")}</div></div>
    ${i > 0 ? `<button class="linkish" data-act="estPrev" style="align-self:flex-start">‹ Pregunta anterior</button>` : ""}
  </section>`;
}
function vEstiloRes() {
  const e = perfil().estilo, pt = EN.puntajeEstilo(e.resp), st = EN.ESTILOS[pt.principal], sec = pt.secundario && EN.ESTILOS[pt.secundario];
  const cards = EN.tarjetasEstilo(pt), card = c => { const m = e.marca[c.id];
    return `<div class="id-card${m === "si" ? " si" : m === "no" ? " no" : ""}"><p>${esc(c.txt)}</p>
      <div class="row"><button class="chip-btn${m === "si" ? " on" : ""}" data-act="estMarca" data-id="${c.id}" data-v="si" aria-pressed="${m === "si"}">Me identifico</button><button class="chip-btn${m === "no" ? " on" : ""}" data-act="estMarca" data-id="${c.id}" data-v="no" aria-pressed="${m === "no"}">No tanto</button></div>
      ${m === "no" ? `<div class="field"><span class="lbl">¿Por qué no? (opcional)</span><div class="pw-opts flat comp-sug">${EN.OPC.nota.map(s => chipBtn("entOpt", s, s, e.nota[c.id] === s, ` data-p="estilo.nota.${c.id}"`)).join("")}</div><label class="opt-own" for="nota-${c.id}">O escríbelo tú</label><input type="text" id="nota-${c.id}" data-ef="estilo.nota.${c.id}" value="${esc(e.nota[c.id] || "")}" maxlength="200" placeholder="Ej: soy directo, pero cuido cómo lo digo"></div>` : ""}</div>`; };
  const tot = EN.PREG_ESTILO.length;
  return `<section class="section">${entHead("Tu estilo de trabajo", "Conócete · resultado")}
    <div class="panel"><p class="eyebrow">Tu estilo principal</p><h3 style="font-size:1.5rem">${esc(st.nombre)}${sec ? ` <span class="muted" style="font-size:1rem">con rasgos de ${esc(sec.nombre)}</span>` : ""}</h3>
      <p style="margin:0">${esc(st.desc)}</p>
      <div class="est-bars">${pt.orden.map(k => `<div class="est-bar"><span>${esc(EN.ESTILOS[k].nombre)}</span><span class="bar" aria-hidden="true"><i style="width:${Math.round(pt.s[k] / tot * 100)}%"></i></span><b class="mono">${pt.s[k]}</b></div>`).join("")}</div>
      <p class="note">Es una guía para reflexionar, no un test psicológico. Por eso tú decides qué te representa.</p></div>
    <div><h3>Tus posibles fortalezas</h3><p class="note" style="margin:2px 0 8px">Marca las que de verdad te representan: con esas armas tus respuestas.</p>${cards.filter(c => c.tipo === "fort").map(card).join("")}</div>
    <div><h3>Tus posibles debilidades</h3><p class="note" style="margin:2px 0 8px">Elige las reales. Una debilidad honesta, con un plan para mejorarla, convence más que una disfrazada.</p>${cards.filter(c => c.tipo === "deb").map(card).join("")}</div>
    <div class="row"><button class="btn primary" data-act="entSalir">Listo</button><button class="btn" data-act="estOtra">Responder de nuevo</button></div>
  </section>`;
}
/* ---------- Paso 1 · competencias ---------- */
function vComps() {
  const p = perfil(), r = EN.resumenCompetencias(p.comps), total = Object.keys(EN.COMP_IDX).length;
  if (S.ev.res) {
    return `<section class="section">${entHead("Tus competencias", "Conócete · resultado", "compsEdit", "Volver a evaluar")}
      <div class="panel"><h3>Elige tus competencias clave (3 a 5)</h3><p class="note">Las que mejor puedes respaldar con un ejemplo. Aparecen en tu pitch y en tus respuestas.</p>
        ${r.altas.length ? r.altas.map(c => `<label class="ck-row"><input type="checkbox" data-clave="${c.id}" ${p.clave.includes(c.id) ? "checked" : ""}> <span><b>${esc(c.nombre)}</b> · ${esc(EN.NIVEL_COMP[c.v])}<br><small class="muted">${esc(c.desc)}</small></span></label>`).join("") : `<p class="empty">Marca alguna como «Bien» o «Es mi fuerte».</p>`}
        <p class="note">${p.clave.length} elegidas.</p></div>
      <div class="panel"><h3>Tus áreas de mejora</h3><p class="note">Candidatas para la pregunta de la debilidad, siempre que no sean centrales para el cargo al que postulas.</p>
        ${r.bajas.length ? r.bajas.map(c => `<p class="hist-row" style="margin:0"><span>${esc(c.nombre)}</span><span>${esc(EN.NIVEL_COMP[c.v])}</span></p>`).join("") : `<p class="empty">No marcaste ninguna como «Me cuesta» o «Normal».</p>`}</div>
      <button class="btn primary wide" data-act="entSalir">Listo</button></section>`;
  }
  return `<section class="section">${entHead("Tus competencias", `Conócete · ${r.n} de ${total} evaluadas`)}
    <p class="lead" style="margin:0">¿Qué tan bien haces cada cosa? Piensa en ejemplos reales del trabajo, la universidad o tus proyectos.</p>
    ${EN.COMPETENCIAS.map(g => `<div class="panel comp-g"><h3>${esc(g.g)}</h3>${g.items.map(([id, n, d]) => `<div class="comp-row"><div><b>${esc(n)}</b><small>${esc(d)}</small></div>
      <div class="comp-lv" role="group" aria-label="${esc(n)}">${[1, 2, 3, 4].map(v => `<button class="${(p.comps[id] || 0) === v ? "on" : ""}" data-act="compSet" data-id="${id}" data-v="${v}" aria-pressed="${(p.comps[id] || 0) === v}" title="${EN.NIVEL_COMP[v]}">${v}</button>`).join("")}</div></div>`).join("")}</div>`).join("")}
    <p class="note">1 = me cuesta · 2 = normal · 3 = bien · 4 = es mi fuerte</p>
    <button class="btn primary wide" data-act="compsRes" ${r.n < 6 ? "disabled" : ""}>Ver mi resultado</button>${r.n < 6 ? `<p class="note">Evalúa al menos 6.</p>` : ""}</section>`;
}
/* ---------- Paso 1 · motivadores y trabajo ideal ---------- */
function vMotiv() {
  const p = perfil();
  return `<section class="section">${entHead("Qué te mueve", "Conócete · motivadores y trabajo ideal")}
    <div class="panel"><h3>Elige tus 3 motivadores, en orden</h3><p class="note">Toca en el orden de importancia. Sirven para responder «¿por qué quieres trabajar aquí?».</p>
      <div class="pw-opts flat comp-sug">${EN.MOTIVADORES.map(([id, n]) => { const k = p.motiv.indexOf(id); return `<button class="pw-opt${k >= 0 ? " on" : ""}" data-act="motivTog" data-v="${id}">${k >= 0 ? `<b>${k + 1}</b> · ` : ""}${esc(n)}</button>`; }).join("")}</div></div>
    <div class="panel"><h3>Tu trabajo ideal</h3>
      ${Object.entries(EN.IDEAL).map(([k, x]) => `<div class="field"><span class="lbl">${esc(x.q)}</span><div class="pw-opts flat comp-sug">${x.ops.map(o => chipBtn("idealSet", o, o, p.ideal[k] === o, ` data-k="${k}"`)).join("")}</div></div>`).join("")}
      ${entChoice("ideal.lejos", "¿Cuánto es lo máximo que viajarías al trabajo?", p.ideal.lejos, EN.OPC.lejos, "Ej: hasta 1 hora")}
      ${entChoice("ideal.no", "Algo que NO quieres en un trabajo", p.ideal.no, EN.OPC.no, "Ej: que no se valore el esfuerzo")}</div>
    <button class="btn primary wide" data-act="entSalir">Listo</button></section>`;
}
/* ---------- Paso 2 · logros ---------- */
function vLogros() {
  const p = perfil();
  return `<section class="section">${entHead("Tus logros", "Arma tus respuestas")}
    <p class="lead" style="margin:0">Un logro es algo que hiciste y que cambió algo: con números si se puede. Son la prueba de tus fortalezas.</p>
    ${p.logros.length ? p.logros.map((l, i) => `<button class="card mini ar-lab logro-card" data-act="logroEdit" data-i="${i}"><b>${esc(EN.fraseLogro(l) || l.m || "Logro sin terminar")}</b>${(l.comps || []).length ? `<span class="note" style="margin:0">${esc(l.comps.join(" · "))}</span>` : ""}</button>`).join("")
      : `<p class="empty">Aún no tienes logros. Parte por uno: con 2 o 3 ya puedes responder casi cualquier pregunta de experiencia.</p>`}
    <button class="btn primary wide" data-act="logroNuevo">+ Nuevo logro</button>
    <div class="panel"><h3>¿No se te ocurre ninguno?</h3><p class="note">Piensa en el trabajo, la universidad, un voluntariado o un emprendimiento:</p><ul class="ideas">${EN.IDEAS_LOGRO.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
  </section>`;
}
function logroRevsHTML(l) {
  const revs = EN.revisarLogro(l);
  return revs.length ? `<div class="stack" style="gap:6px">${revs.map(r => `<p class="fb mid" style="margin:0">${esc(r)}</p>`).join("")}</div>` : `<p class="fb ok">Logro completo: momento, acción con verbo, resultado medible.</p>`;
}
function vLogro() {
  const p = perfil(), i = S.ev.i, l = p.logros[i] || {}, revs = EN.revisarLogro(l), base = "logros." + i + ".";
  const sug = p.clave.map(id => EN.COMP_IDX[id] && EN.COMP_IDX[id].nombre).filter(Boolean).concat(["Planificación y organización", "Resolución de problemas", "Trabajo en equipo", "Orientación al cliente", "Iniciativa", "Responsabilidad"]);
  const comps = l.comps || [];
  return `<section class="section">${entHead("Un logro", "Momento · Acción · Resultado · Competencias", "logrosVolver", "Tus logros")}
    <div class="panel">
      ${entChoice(base + "m", "1 · Momento: ¿cuál era el problema, desafío u oportunidad?", l.m, EN.OPC.m, "Ej: la ruta de despacho no alcanzaba a cubrir a todos los clientes", true)}
      ${entChoice(base + "a", "2 · Acción: ¿qué hiciste tú?", l.a, EN.opcionesAccion(l.m), "Ej: Rediseñé la ruta agrupando a los clientes por zona", true)}
      <div class="field"><span class="lbl">¿Lo escribes tú? Empieza con un verbo</span><div class="pw-opts flat comp-sug">${EN.VERBOS.slice(0, 12).map(v => chipBtn("logroVerbo", v, v, false)).join("")}</div></div>
      ${entChoice(base + "r", "3 · Resultado: ¿qué cambió? Completa los números (__)", l.r, EN.OPC.r, "Ej: que el 100% de los clientes recibiera a tiempo")}
      <div class="field"><span class="lbl">4 · Competencias que usaste</span><div class="pw-opts flat comp-sug">${sug.filter((c, k) => sug.indexOf(c) === k).map(c => chipBtn("logroComp", c, (comps.includes(c) ? "✓ " : "+ ") + c, comps.includes(c))).join("")}</div></div>
    </div>
    ${NOTA_REAL}
    <div class="pt-prev"><span class="eyebrow">5 · Tu logro en una frase</span><p id="entPrev">${esc(EN.fraseLogro(l) || "…")}</p></div>
    <div id="logroRevs">${logroRevsHTML(l)}</div>
    <div class="row"><button class="btn primary" data-act="logrosVolver">Guardar</button><button class="btn danger" data-act="logroDel">Borrar</button></div>
  </section>`;
}
/* ---------- Paso 2 · respuestas ---------- */
function vResp() {
  const lista = EN.ORDEN_PREG.filter(k => RESP_LISTA(k)).length;
  return `<section class="section">${entHead("Tus respuestas", `Arma tus respuestas · ${lista} de ${EN.ORDEN_PREG.length} listas`)}
    <p class="lead" style="margin:0">Las preguntas que casi siempre aparecen. Arma cada respuesta con lo que ya sabes de ti y practícala en voz alta.</p>
    ${EN.ORDEN_PREG.map(k => { const ok = RESP_LISTA(k); return `<button class="hoy-row${ok ? " ok-r" : ""}" data-act="respOpen" data-k="${k}"><span class="hoy-ck" aria-hidden="true">${ok ? ICON_CHECK : ""}</span><span class="stack" style="gap:2px;flex-grow:1"><b>${esc(EN.PREGUNTAS[k].q)}</b><small class="muted">${esc(EN.PREGUNTAS[k].desc)}</small></span><span class="arrow">›</span></button>`; }).join("")}
  </section>`;
}
function respOpciones(k, p) {
  const e = p.estilo, marcadas = tipo => EN.tarjetasEstilo(EN.puntajeEstilo(e.resp)).filter(c => c.tipo === tipo && e.marca[c.id] === "si");
  const r = EN.resumenCompetencias(p.comps);
  if (k === "fortaleza") return { frases: estiloListo() ? marcadas("fort").map(c => c.txt) : [], comps: p.clave.length ? p.clave : r.altas.slice(0, 4).map(c => c.id) };
  if (k === "debilidad") return { frases: estiloListo() ? marcadas("deb").map(c => c.txt) : [], comps: r.bajas.slice(0, 4).map(c => c.id) };
  return {};
}
function logroPicker(c, base, p) {
  return `<div class="field"><span class="lbl">Un logro que lo pruebe</span>${p.logros.length ? `<div class="tipo-list">${p.logros.map((l, i) => `<button class="pw-opt tipo-opt${c.logro === i ? " on" : ""}" data-act="respLogro" data-i="${i}">${esc(EN.fraseLogro(l) || l.m || "Logro " + (i + 1))}</button>`).join("")}</div>` : `<p class="note">Aún no tienes logros guardados.</p>`}
    <button class="linkish" data-act="logroNuevo" data-ret="1" style="align-self:flex-start">+ Crear un logro</button></div>`;
}
function vRespEdit() {
  const p = perfil(), k = S.ev.k, c = p.resp[k] || (p.resp[k] = {}), base = "resp." + k + ".", Q = EN.PREGUNTAS[k];
  let campos = "";
  if (k === "cuentame") {
    const pp = progress.pitch;
    campos = `<p>Esta respuesta es tu pitch en versión «Cuéntame de ti» (2 minutos).</p><button class="btn primary" data-act="respPitch">${pp && pp.carrera ? "Abrir mi pitch" : "Armar mi pitch"}</button>`;
  } else if (k === "fortaleza" || k === "debilidad") {
    const o = respOpciones(k, p), key = k === "fortaleza" ? "fort" : "deb";
    campos = `<div class="field"><span class="lbl">${k === "fortaleza" ? "Elige tu fortaleza" : "Elige una debilidad real"}</span>
      ${o.frases.length || o.comps.length ? `<div class="tipo-list">${o.frases.map(f => `<button class="pw-opt tipo-opt${c[key] === f && !c.compId ? " on" : ""}" data-act="respPick" data-v="${esc(f)}">${esc(f)}</button>`).join("")}
        ${o.comps.map(id => `<button class="pw-opt tipo-opt${c.compId === id ? " on" : ""}" data-act="respComp" data-v="${id}">${esc(EN.COMP_IDX[id].nombre)}<small>${k === "fortaleza" ? "De tus competencias" : "De tus áreas de mejora"}</small></button>`).join("")}</div>`
        : `<p class="note">Haz «Conócete» para tener sugerencias, o escribe la tuya abajo.</p>`}</div>
      ${entField(base + key, "O escríbela con tus palabras", c.compId ? "" : c[key], k === "fortaleza" ? "Ej: Soy constante y cumplo lo que prometo" : "Ej: Me cuesta delegar")}`;
    campos += `<div id="respSub" class="stack">${respSubCampos(k, c, base, p)}</div>` + (k === "debilidad" ? NOTA_REAL : "");
  } else if (k === "porque") {
    campos = entField(base + "cargo", "¿A qué cargo postulas?", c.cargo, "Ej: analista de operaciones") + entField(base + "empresa", "¿En qué empresa?", c.empresa, "Ej: Ripley")
      + entChoice(base + "atrae", "¿Qué te atrae de esa empresa?", c.atrae, EN.OPC.atrae, "Ej: están invirtiendo en su centro de distribución")
      + `<p class="note">Si sabes algo concreto de la empresa (una noticia, un proyecto), escríbelo: muestra que la investigaste.</p>`
      + entChoice(base + "aporte", "¿Qué puedes aportar? (opcional)", c.aporte, EN.opcionesAporte(p), "Ej: mi experiencia en la operación")
      + `<p class="note">Tus motivadores: ${p.motiv.length ? esc(p.motiv.map(id => EN.MOT_IDX[id].nombre).join(", ")) : "aún no los eliges"}. <button class="linkish" data-act="entIr" data-v="motiv">${p.motiv.length ? "Cambiar" : "Elegirlos"}</button></p>`;
  } else if (k === "logro") {
    campos = logroPicker(c, base, p);
  } else if (k === "conflicto") {
    campos = entChoice(base + "sit", "¿Qué pasó? (situación)", c.sit, EN.OPC.sit, "Ej: un compañero y yo no estábamos de acuerdo en cómo repartir los turnos")
      + entChoice(base + "acc", "¿Qué hiciste tú?", c.acc, EN.OPC.acc, "Ej: proponerle conversarlo con los datos de ventas de cada día")
      + entChoice(base + "res", "¿Cómo terminó?", c.res, EN.OPC.res, "Ej: armamos un turno rotativo que funcionó para los dos")
      + entChoice(base + "apr", "¿Qué aprendiste?", c.apr, EN.OPC.apr, "Ej: los desacuerdos se resuelven mejor con datos que con opiniones") + NOTA_REAL;
  } else if (k === "preguntas") {
    const sug = EN.preguntasSugeridas(p), sel = c.sel || [];
    campos = `<div class="field"><span class="lbl">Elige 2 o 3</span>${sug.concat(sel.filter(x => !sug.includes(x))).map(q => `<label class="ck-row"><input type="checkbox" data-pq="${esc(q)}" ${sel.includes(q) ? "checked" : ""}> <span>${esc(q)}</span></label>`).join("")}</div>
      <div class="field"><label for="pqNew">¿Otra? Escríbela y presiona Enter</label><input type="text" id="pqNew" maxlength="160" placeholder="Ej: ¿Qué es lo que más valoran de su equipo?"></div>
      <p class="note">Evita preguntar por sueldo o vacaciones en la primera entrevista, salvo que ellos lo mencionen.</p>`;
  }
  const txt = entTexto(k), revs = k === "cuentame" ? [] : EN.revisarRespuesta(k, { ...c, logro: c.logro != null ? p.logros[c.logro] : null }, txt);
  return `<section class="section">${entHead(Q.q, "Arma tu respuesta", "respVolver", "Tus respuestas")}
    <div class="panel">${campos}</div>
    ${k === "cuentame" ? "" : `<div class="field"><label for="entTexto">Tu respuesta (puedes editarla)</label><textarea id="entTexto" class="esc-ta" rows="6" placeholder="Completa los campos de arriba y tu respuesta aparece aquí.">${esc(txt)}</textarea>
      <span class="note" id="entInfo">${txt ? `Cerca de ${EN.segundos(txt)} s en voz alta.` : ""}${c.editado ? ` Editada a mano. <button class="linkish" data-act="respRegen">Volver a armarla</button>` : ""}</span></div>`}
    ${revs.map(r => `<p class="fb ${r.n === "no" ? "no" : r.n === "mid" ? "mid" : "ok"}" style="margin:0">${esc(r.txt)}</p>`).join("")}
    ${txt && k !== "cuentame" ? `<div class="row"><button class="btn primary" data-act="practOpen" data-k="${k}">${ICON_MIC} Practicar en voz alta</button><button class="btn" data-act="respOir">${ICON_SPEAK} Escucharla</button></div>
      <p class="note">No la memorices palabra por palabra: apréndete las ideas y dilas con tus palabras.</p>` : ""}
  </section>`;
}
/* ---------- Práctica por voz y simulación ---------- */
let entDict = null, entT0 = 0;
function entMicStop() { if (entDict && entDict.active) entDict.stop(); }
function entEval(k, dicho, secs) {
  /* Ideas clave: solo palabras que escribió el usuario, no las de la plantilla («principales», «además»…). */
  const ref = entTexto(k), plantilla = M.tokens(EN.PLANTILLA), claves = PR.keywords(ref, 14).filter(w => !plantilla.includes(M.norm(w))).slice(0, 6), cov = PR.cobertura(dicho, [{ id: "r", titulo: "", claves }])[0];
  const m = dicho ? M.speechMetrics(dicho, secs, mulList()) : null;
  return { secs, words: m ? m.words : 0, cov, mul: m ? m.mul.count : 0, mulFound: m ? Object.keys(m.mul.found).join(", ") : "", dicho };
}
function entFeedback(r) {
  const ok = r.secs >= 20 && r.secs <= 90, pc = r.cov.total ? Math.round(r.cov.ok / r.cov.total * 100) : 0;
  return `<div class="kpis"><div class="kpi"><b class="${ok ? "good" : "warn"}">${Math.round(r.secs)} s</b><span>${r.secs < 20 ? "muy corta" : r.secs > 90 ? "larga: apunta a 30–75 s" : "buen largo"}</span></div>
      <div class="kpi"><b>${pc}%</b><span>de tus ideas clave</span></div><div class="kpi"><b>${r.mul}</b><span>muletillas${r.mulFound ? ": " + esc(r.mulFound) : ""}</span></div></div>
    ${r.cov.faltan.length ? `<p class="note">Te faltó mencionar: ${r.cov.faltan.map(esc).join(", ")}.</p>` : `<p class="fb ok" style="margin:0">Dijiste todas tus ideas clave.</p>`}
    <details class="heard"><summary>Lo que escuché</summary><p class="transcript">${esc(r.dicho || "(nada)")}</p></details>`;
}
function vPract() {
  const k = S.ev.k, Q = EN.PREGUNTAS[k], E = S.ev, sim = !!E.sim;
  const cab = sim ? entHead("Simulación de entrevista", `Pregunta ${E.sim.i + 1} de ${E.sim.ks.length}`, "simSalir", "Entrevistas") : entHead("Practica tu respuesta", "Arma tus respuestas", "practVolver", "Tu respuesta");
  if (sim && E.sim.i >= E.sim.ks.length) {
    const rs = E.sim.res.filter(Boolean), cov = rs.length ? Math.round(rs.reduce((a, r) => a + (r.cov.total ? r.cov.ok / r.cov.total : 0), 0) / rs.length * 100) : 0;
    return `<section class="section">${entHead("Simulación terminada", "Paso 3 · Simula la entrevista", "simSalir", "Entrevistas")}
      <div class="kpis"><div class="kpi"><b>${rs.length}</b><span>preguntas respondidas</span></div><div class="kpi"><b>${cov}%</b><span>de tus ideas clave, en promedio</span></div><div class="kpi"><b>${rs.reduce((a, r) => a + r.mul, 0)}</b><span>muletillas en total</span></div></div>
      <div class="panel"><h3>Pregunta por pregunta</h3>${E.sim.ks.map((kk, i) => { const r = E.sim.res[i]; return `<div class="cov-row"><span class="cov-ic ${!r ? "no" : r.cov.ok === r.cov.total ? "ok" : "mid"}">${!r ? "—" : Math.round(r.secs) + "s"}</span><span><b>${esc(EN.PREGUNTAS[kk].q)}</b>${r && r.cov.faltan.length ? `<small>Te faltó: ${r.cov.faltan.map(esc).join(", ")}</small>` : ""}</span></div>`; }).join("")}</div>
      <div class="row"><button class="btn primary" data-act="simGo">Otra simulación</button><button class="btn" data-act="simSalir">Terminar</button></div></section>`;
  }
  const res = sim ? E.sim.res[E.sim.i] : E.res;
  return `<section class="section">${cab}
    <div class="panel"><div class="msg them"><div class="who"><span>Entrevistador</span></div>${esc(Q.q)}</div><button class="btn ghost sm" data-act="entOirQ">${ICON_SPEAK} Escuchar la pregunta</button>
      ${E.rec ? `<p class="transcript" id="entLive">${esc(E.live || "")}</p><button class="btn primary" data-act="entMicStop">${ICON_STOP} Terminé de responder</button>`
        : res ? entFeedback(res) + `<div class="row">${sim ? `<button class="btn primary" data-act="simNext">${E.sim.i < E.sim.ks.length - 1 ? "Siguiente pregunta" : "Ver resumen"}</button>` : ""}<button class="btn${sim ? "" : " primary"}" data-act="entMicGo">${ICON_MIC} Responder de nuevo</button></div>`
        : `<p class="note">Responde en voz alta, como si estuvieras en la entrevista. Mira tus ideas antes si quieres, pero no las leas.</p><button class="btn primary" data-act="entMicGo">${ICON_MIC} Responder</button>${sim ? `<button class="linkish" data-act="simNext" style="align-self:flex-start">Saltar</button>` : ""}`}
      ${E.micErr ? `<p class="note warn">${esc(E.micErr)}</p>` : ""}</div>
    ${!sim ? `<details class="heard"><summary>Ver mi respuesta preparada</summary><p class="transcript">${esc(entTexto(k))}</p></details>` : ""}
  </section>`;
}
function vEnt() {
  const v = S.ev && S.ev.v;
  if (v === "estilo") return estiloListo() && !S.ev.rehacer ? vEstiloRes() : vEstilo();
  if (v === "comps") return vComps();
  if (v === "motiv") return vMotiv();
  if (v === "logros") return vLogros();
  if (v === "logro") return vLogro();
  if (v === "resp") return vResp();
  if (v === "respEdit") return vRespEdit();
  if (v === "pract") return vPract();
  if (v === "cv") return vCv();
  S.sub = null; return vEntrevistas();
}
/* ---------- Tu CV: leerlo, compararlo con el pitch y revisarlo ----------
   El CV se lee y se analiza dentro del celular (js/cv.js). Nada se agrega solo: cada sugerencia se confirma. */
const CVM = window.AuraCV, PRO = window.AuraPro;
const ICON_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
function cvData() { const c = perfil().cv; return c && t2(c.texto) ? c : null; }
function cvInfo() { const c = cvData(); return c ? CVM.extraer(c.texto, { paginas: c.paginas }) : null; }
const cvKey = s => s.id + "|" + s.txt.slice(0, 60);
function cvSugerencias() {
  const c = cvData(); if (!c) return [];
  return CVM.compararPitch(cvInfo(), pitchData(), perfil()).filter(s => !(c.descartes || []).includes(cvKey(s)));
}
/* Sugerencias del CV: el usuario marca lo que quiere sumar (una opción por sugerencia) y luego
   aprieta «Actualizar mi pitch», que aplica todo junto y vuelve a armar el guion. */
function cvSugHTML(list, ctx) {
  const sel = S.cvSel || (S.cvSel = {}), n = list.filter(s => sel[cvKey(s)] != null).length, pp = pitchData();
  const items = list.map((s, i) => { const cur = sel[cvKey(s)];
    return `<div class="cv-sug${cur != null ? " on" : ""}"><p>${esc(s.txt)}</p><div class="cv-opts">${s.acciones.map((a, j) => a.k === "exp"
      ? `<button class="btn sm" data-act="cvAplicar" data-i="${i}" data-j="${j}">${esc(a.lbl)} ›</button>`
      : `<button class="pw-opt cv-pick${cur === j ? " on" : ""}" data-act="cvSel" data-i="${i}" data-j="${j}" aria-pressed="${cur === j}">${cur === j ? "✓ " : "+ "}${esc(a.lbl)}</button>`).join("")}
      <button class="linkish" data-act="cvDescartar" data-i="${i}">No aplica</button></div></div>`; }).join("");
  const barra = n ? `<div class="cv-update"><button class="btn primary wide" data-act="cvActualizar">Actualizar mi pitch (${n} ${n === 1 ? "cambio" : "cambios"})</button>
      ${pp.editado || pp.guionBorrador != null ? `<span class="note" style="margin:0">Editaste tu guion a mano: al actualizar se vuelve a armar desde tus respuestas.</span>` : ""}</div>`
    : list.length ? `<p class="note" style="margin:0">Marca lo que quieres sumar y después actualiza tu pitch de una vez.</p>` : "";
  return items + barra;
}
function cvHechoHTML(ctx) {
  const h = S.cvHecho; if (!h) return "";
  const txt = [h.n ? `Tu pitch se actualizó con ${h.n} ${h.n === 1 ? "cambio" : "cambios"}.` : "", h.logros ? `Guardamos ${h.logros === 1 ? "un logro" : h.logros + " logros"} para que lo${h.logros === 1 ? "" : "s"} completes.` : ""].filter(Boolean).join(" ");
  return `<div class="cv-done" id="cvDone"><p>${ICON_CHECK} ${esc(txt)}</p>${ctx === "pitch" ? `<button class="btn primary wide" data-act="cvVerGuion">Ver el guion actualizado</button>`
    : `<button class="btn primary wide" data-act="ptOpen" data-fin="1">Ver mi pitch actualizado</button>`}</div>`;
}
function proCards(ids) {
  return ids.map(id => { const f = PRO.FUNCIONES[id]; return `<div class="pro-card lock"><span class="tag">${ICON_LOCK} Aura Pro · próximamente</span><p><b>${esc(f.nombre)}.</b> ${esc(f.desc)}</p>
    <button class="btn sm" disabled aria-disabled="true">${ICON_LOCK} Disponible con Aura Pro</button></div>`; }).join("");
}
function vCv() {
  const E = S.ev, c = cvData(), back = E.from === "pitch" ? ["cvVolver", "Tu pitch"] : ["entSalir", "Entrevistas"];
  const head = entHead("Tu CV", "Pitch y video currículum", back[0], back[1]) + (S.toast ? `<p class="toast">${esc(S.toast)}</p>` : "");
  const subir = (lbl, cls) => `<label class="${cls}" for="cvFile">${lbl}</label><input type="file" id="cvFile" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" class="sr-only">`;
  const err = E.err ? `<p class="fb no" style="margin:0">${esc(E.err)}</p>` : "";
  if (E.cargando) return `<section class="section">${head}<p class="lead">Leyendo tu CV…</p></section>`;
  if (!c) return `<section class="section">${head}
    <p class="lead" style="margin:0">Súbelo y Aura busca lo que tienes en tu CV y no estás aprovechando en tu pitch. También te dice qué mejorar en el CV.</p>${err}
    ${subir(`<span class="card-head"><span class="s-icon">${SES_ICON.lectura}</span><span><h3>Subir mi CV</h3><span class="meta">PDF o Word (.docx).</span></span></span>`, "card load-opt")}
    ${E.pegar ? `<div class="field"><label for="cvPegar">Pega el texto de tu CV</label><textarea id="cvPegar" class="esc-ta" rows="10" placeholder="Copia todo el texto de tu CV y pégalo aquí."></textarea></div><button class="btn primary wide" data-act="cvPegarOk">Usar este texto</button>`
      : `<button class="card load-opt" data-act="cvPegar"><span class="card-head"><span class="s-icon">${SES_ICON.bloques}</span><span><h3>Pegar el texto</h3><span class="meta">Si tu CV es una imagen o no se lee bien.</span></span></span></button>`}
    <p class="note">Tu CV se queda en este celular: Aura no lo sube a ningún servidor.</p>
    ${proCards(["cvReescribir", "cvOferta"])}</section>`;
  const cv = cvInfo(), pp = progress.pitch, hayPitch = pp && t2(pp.carrera), sug = cvSugerencias(), revs = CVM.revisar(cv, perfil(), pp), bl = CVM.bloques(perfil(), pp);
  const chips = cv.herramientas.map(h => h.nombre).concat(cv.idiomas.map(i => i.nombre)).map(x => `<span class="kchip">${esc(x)}</span>`).join("");
  const copia = (k, titulo, cuerpo) => `<div class="cv-blk"><div class="cv-blk-h"><b>${titulo}</b><button class="btn sm" data-act="cvCopy" data-b="${k}">Copiar</button></div>${cuerpo}</div>`;
  return `<section class="section">${head}${err}
    <div class="panel"><p style="margin:0"><b>${esc(c.nombre || "Tu CV")}</b><br><span class="note" style="margin:0">${cv.paginas} ${cv.paginas === 1 ? "página" : "páginas"} · ${cv.palabras} palabras · ${cv.cargos.length} ${cv.cargos.length === 1 ? "cargo" : "cargos"} con fechas · ${cv.cifras.length} resultados con números</span></p>
      ${chips ? `<div class="pb-keys">${chips}</div>` : ""}
      ${cv.palabras < 60 ? `<p class="fb mid" style="margin:0">Casi no encontramos texto: tu CV parece una imagen. Expórtalo como PDF con texto (en Canva: Descargar → PDF estándar) o pega el texto.</p>` : `<p class="note" style="margin:0">Si falta algo, puede ser por el diseño del archivo. Puedes pegar el texto en su lugar.</p>`}</div>
    <h3 class="cv-h">Para tu pitch</h3>
    ${!hayPitch ? `<p class="note" style="margin:0">Arma tu pitch y aquí verás lo que tu CV tiene y tu pitch no.</p><button class="btn primary" data-act="ptOpen">Armar mi pitch</button>`
      : cvHechoHTML("cv") + (sug.length ? cvSugHTML(sug, "cv") : S.cvHecho ? "" : `<p class="fb ok" style="margin:0">Tu pitch ya aprovecha lo principal de tu CV.</p>`)}
    <h3 class="cv-h">Revisión de tu CV</h3>
    ${revs.length ? revs.map(r => `<div class="fb ${r.n === "no" ? "no" : r.n === "mid" ? "mid" : "ok"} cv-rev"><span>${esc(r.txt)}</span>${r.ej.length ? `<small>Por ejemplo: ${r.ej.map(x => "«" + esc(x) + "»").join(" · ")}</small>` : ""}</div>`).join("") : `<p class="fb ok" style="margin:0">No encontramos problemas con nuestras reglas. ¡Buen CV!</p>`}
    <p class="note" style="margin:0">La revisión usa reglas simples: puede equivocarse. Tú decides qué cambiar.</p>
    <h3 class="cv-h">Para copiar a tu CV</h3>
    <p class="note" style="margin:0">Armado con tu autodiagnóstico, tus logros y tu pitch. Tus debilidades no van en el CV: son para la entrevista.</p>
    ${bl.perfil ? copia("perfil", "Perfil profesional", `<p>${esc(bl.perfil)}</p>`) : `<p class="note" style="margin:0">Arma tu pitch para generar tu perfil profesional.</p>`}
    ${bl.competencias.length ? copia("competencias", "Competencias", `<p>${esc(bl.competencias.join(" · "))}</p>`) : ""}
    ${bl.logros.length ? copia("logros", "Logros como viñetas", `<ul>${bl.logros.map(l => `<li>${esc(l)}</li>`).join("")}</ul>`) : ""}
    ${proCards(["cvReescribir", "cvOferta", "cvProfunda"])}
    <div class="row">${subir("Cambiar mi CV", "btn")}<button class="btn danger" data-act="cvBorrar">Borrar mi CV</button></div>
  </section>`;
}
async function cvImport(file) {
  const E = S.ev; E.err = null; E.cargando = true; render();
  try {
    const r = await window.AuraImport.readCv(file), txt = t2(r.text);
    if (txt.split(/\s+/).length < 30) E.err = "No pudimos leer el texto de tu CV: parece una imagen. Expórtalo como PDF con texto, súbelo en Word o pega el texto.";
    else { perfil().cv = { nombre: file.name, paginas: r.paginas || 0, texto: r.text.slice(0, 30000), fecha: today(), descartes: [] }; save(); }
  } catch (e) {
    E.err = e.message === "doc" ? "Ese es un Word antiguo (.doc). Guárdalo como .docx o PDF y súbelo de nuevo." : e.message === "formato" ? "Sube tu CV en PDF o Word (.docx)." : "No pudimos leer ese archivo. Prueba con otro formato o pega el texto.";
  }
  E.cargando = false; render();
}
function cvAct(a, el) {
  const p = perfil(), pp = pitchData();
  switch (a) {
    case "cvPegar": S.ev.pegar = true; render(); return true;
    case "cvPegarOk": { const v = (document.getElementById("cvPegar") || {}).value || "";
      if (t2(v).split(/\s+/).length < 30) { S.ev.err = "Pega el texto completo de tu CV (con tus secciones)."; render(); return true; }
      p.cv = { nombre: "CV pegado", paginas: 0, texto: v.slice(0, 30000), fecha: today(), descartes: [] }; S.ev.err = null; S.ev.pegar = false; save(); render(); return true; }
    case "cvBorrar": delete p.cv; S.ev.pegar = false; save(); render(); return true;
    case "cvVolver": S.pt = { paso: PT_PASOS.length }; leaveSim(); go({ sub: "pitch" }, "left"); return true;
    case "cvDescartar": { const s = cvSugerencias()[+el.dataset.i]; if (s) { p.cv.descartes = (p.cv.descartes || []).concat([cvKey(s)]); if (S.cvSel) delete S.cvSel[cvKey(s)]; save(); render(); } return true; }
    case "cvAplicar": { const s = cvSugerencias()[+el.dataset.i], ac = s && s.acciones[+el.dataset.j];
      if (ac && ac.k === "exp") { S.pt = { paso: PT_PASOS.findIndex(x => x.k === "experiencia") }; leaveSim(); go({ sub: "pitch" }, "right"); } return true; }
    case "cvSel": { const s = cvSugerencias()[+el.dataset.i]; if (!s) return true; const sel = S.cvSel || (S.cvSel = {}), k = cvKey(s), j = +el.dataset.j;
      sel[k] = sel[k] === j ? null : j; S.cvHecho = null; render(); return true; }
    case "cvActualizar": { const sel = S.cvSel || {}, list = cvSugerencias(); let n = 0, logros = 0;
      list.forEach(s => { const j = sel[cvKey(s)], ac = j != null && s.acciones[j]; if (!ac) return;
        if (CVM.aplicar(ac, pp, p) === "logro") { logros++; p.cv.descartes = (p.cv.descartes || []).concat([cvKey(s)]); } else n++; });
      if (n) { pp.editado = false; pp.guion = ""; delete pp.guionBorrador; }
      S.cvSel = {}; S.cvHecho = { n, logros }; save(); render();
      const d = document.getElementById("cvDone"); if (d) d.scrollIntoView({ block: "center", behavior: "smooth" }); return true; }
    case "cvVerGuion": { const g = document.getElementById("ptGuion"); if (g) { g.scrollIntoView({ block: "center", behavior: "smooth" }); g.classList.add("flash"); setTimeout(() => g.classList.remove("flash"), 1600); } return true; }
    case "cvCopy": { const bl = CVM.bloques(p, pp), b = el.dataset.b, txt = b === "perfil" ? bl.perfil : b === "competencias" ? bl.competencias.join(" · ") : bl.logros.map(l => "• " + l).join("\n");
      try { navigator.clipboard.writeText(txt).then(() => { el.textContent = "¡Copiado!"; }, () => {}); } catch (e) {} return true; }
  }
  return false;
}
function entMicGo() {
  const E = S.ev; E.live = ""; E.micErr = null; E.rec = true; entT0 = Date.now();
  if (E.sim) E.sim.res[E.sim.i] = null; else E.res = null;
  stopDictado(); entMicStop();
  entDict = Dictado({ lang: paisObj().voz, keepAlive: true,
    onText: txt => { E.live = txt; const el = document.getElementById("entLive"); if (el) el.textContent = txt; },
    onError: code => { E.rec = false; E.micErr = micMsg(code); render(); },
    onEnd: () => { if (!E.fin) return; E.fin = false; E.rec = false; const r = entEval(E.k, (E.live || "").trim(), (Date.now() - entT0) / 1000);
      if (E.sim) E.sim.res[E.sim.i] = r; else E.res = r; markDay(); save(); render(); } });
  E.fin = false; entDict.start();
  if (!entDict.supported) { E.rec = false; E.micErr = micMsg("unsupported"); }
  render();
}
/* Al cambiar la debilidad o fortaleza, se borran las opciones elegidas que eran de la anterior (lo escrito a mano se mantiene). */
function respOptsDe(k, c) {
  if (k === "fortaleza") return { aporte: EN.opcionesFortaleza(c) };
  const o = EN.opcionesDebilidad(c); return { ejemplo: o.ej, accion: o.acc, avance: o.av };
}
function respLimpiar(k, c, old) {
  const nu = respOptsDe(k, c); Object.keys(old).forEach(f => { if (old[f].includes(t2(c[f])) && !nu[f].includes(t2(c[f]))) c[f] = ""; });
}
let respSubT = 0;
function entAct(a, el) {
  const p = perfil();
  switch (a) {
    case "entIr": entGo(el.dataset.v, el.dataset.v === "comps" && Object.keys(p.comps).length >= 6 ? { res: true } : el.dataset.from ? { from: el.dataset.from } : {}); return true;
    case "entSalir": entMicStop(); go({ sub: null, tab: "entrevistas" }, "left"); return true;
    case "estPick": { const E = S.ev, i = E.i || 0; p.estilo.resp[i] = el.dataset.v; save();
      if (i < EN.PREG_ESTILO.length - 1) { E.i = i + 1; S.anim = "right"; } else { E.rehacer = false; chime(); S.anim = "up"; } render(); return true; }
    case "estPrev": S.ev.i = Math.max(0, (S.ev.i || 0) - 1); S.anim = "left"; render(); return true;
    case "estOtra": p.estilo.resp = {}; S.ev.i = 0; S.ev.rehacer = true; save(); render(); return true;
    case "estMarca": { const id = el.dataset.id; p.estilo.marca[id] = p.estilo.marca[id] === el.dataset.v ? null : el.dataset.v; save(); render(); return true; }
    case "compSet": p.comps[el.dataset.id] = +el.dataset.v; save(); render(); return true;
    case "compsRes": S.ev.res = true; S.anim = "right"; render(); return true;
    case "compsEdit": S.ev.res = false; S.anim = "left"; render(); return true;
    case "motivTog": { const v = el.dataset.v, k = p.motiv.indexOf(v); if (k >= 0) p.motiv.splice(k, 1); else if (p.motiv.length < 3) p.motiv.push(v); save(); render(); return true; }
    case "idealSet": p.ideal[el.dataset.k] = p.ideal[el.dataset.k] === el.dataset.v ? null : el.dataset.v; save(); render(); return true;
    case "logroNuevo": p.logros.push({ m: "", a: "", r: "", comps: [] }); save(); entGo("logro", { i: p.logros.length - 1, ret: el.dataset.ret ? S.ev.k : null }); return true;
    case "logroEdit": entGo("logro", { i: +el.dataset.i }); return true;
    case "logrosVolver": { const E = S.ev, l = p.logros[E.i]; if (l && !t2(l.m) && !t2(l.a) && !t2(l.r)) { p.logros.splice(E.i, 1); save(); }
      if (E.ret) { const rk = E.ret; if (l && p.logros.includes(l)) { (p.resp[rk] = p.resp[rk] || {}).logro = p.logros.indexOf(l); save(); } entGo("respEdit", { k: rk }, "left"); }
      else entGo("logros", {}, "left"); return true; }
    case "logroDel": { const i = S.ev.i; p.logros.splice(i, 1); Object.values(p.resp).forEach(c => { if (c.logro === i) delete c.logro; else if (c.logro > i) c.logro--; }); save(); entGo("logros", {}, "left"); return true; }
    case "logroVerbo": { const l = p.logros[S.ev.i], a = t2(l.a).replace(new RegExp(EN.VERBO_RE.source + "\\s*", "i"), ""); l.a = el.dataset.v + " " + a; save(); render(); const n = document.getElementById("ef-logros-" + S.ev.i + "-a"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } return true; }
    case "logroComp": { const l = p.logros[S.ev.i], v = el.dataset.v; l.comps = l.comps || []; const k = l.comps.indexOf(v); if (k >= 0) l.comps.splice(k, 1); else l.comps.push(v); save(); render(); return true; }
    case "respOpen": entGo("respEdit", { k: el.dataset.k }); return true;
    case "respVolver": entGo("resp", {}, "left"); return true;
    case "respPick": { const c = p.resp[S.ev.k], key = S.ev.k === "fortaleza" ? "fort" : "deb", old = respOptsDe(S.ev.k, c); c[key] = el.dataset.v; delete c.compId; c.editado = false; respLimpiar(S.ev.k, c, old); save(); render(); return true; }
    case "respComp": { const c = p.resp[S.ev.k], key = S.ev.k === "fortaleza" ? "fort" : "deb", old = respOptsDe(S.ev.k, c); c.compId = el.dataset.v; c[key] = ""; c.editado = false; respLimpiar(S.ev.k, c, old); save(); render(); return true; }
    case "entOpt": { const path = el.dataset.p, cur = path.split(".").reduce((o, k) => o && o[k], p), v = t2(cur) === el.dataset.v ? "" : el.dataset.v;
      entSet(path, v); if (/^resp\./.test(path)) p.resp[S.ev.k].editado = false; render();
      const n = document.getElementById("ef-" + path.replace(/\./g, "-")), i = n && n.value.indexOf("__");
      if (n && i >= 0) { n.focus(); n.setSelectionRange(i, i + 2); } return true; }
    case "respLogro": { const c = p.resp[S.ev.k]; c.logro = +el.dataset.i; c.editado = false; save(); render(); return true; }
    case "respRegen": { const c = p.resp[S.ev.k]; c.editado = false; c.texto = ""; save(); render(); return true; }
    case "respOir": speak(entTexto(S.ev.k)); return true;
    case "respPitch": { const pp = pitchData(); if (!pp.carrera) pp.tipo = "presentacion"; save(); S.pt = { paso: pp.carrera ? PT_PASOS.length : 0 }; leaveSim(); go({ sub: "pitch" }, "right"); return true; }
    case "practOpen": entGo("pract", { k: el.dataset.k }); return true;
    case "practVolver": entMicStop(); entGo("respEdit", { k: S.ev.k }, "left"); return true;
    case "entOirQ": speak(EN.PREGUNTAS[S.ev.k].q); return true;
    case "entMicGo": entMicGo(); return true;
    case "entMicStop": S.ev.fin = true; entMicStop(); return true;
    case "simGo": { const ks = EN.ORDEN_PREG.filter(k => k !== "preguntas" && RESP_LISTA(k)); for (let i = ks.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ks[i], ks[j]] = [ks[j], ks[i]]; }
      if (!ks.length) { entGo("resp"); return true; } entGo("pract", { k: ks[0], sim: { ks, i: 0, res: [] } }); setTimeout(() => speak(EN.PREGUNTAS[ks[0]].q), 400); return true; }
    case "simNext": { const E = S.ev; entMicStop(); E.sim.i++; E.rec = false; E.micErr = null; if (E.sim.i < E.sim.ks.length) { E.k = E.sim.ks[E.sim.i]; setTimeout(() => speak(EN.PREGUNTAS[E.k].q), 300); } S.anim = "right"; render(); return true; }
    case "simSalir": entMicStop(); go({ sub: null, tab: "entrevistas" }, "left"); return true;
  }
  return false;
}

/* ===================== VISTA: INICIO ===================== */
/* Inicio responde una sola pregunta: ¿qué tienes que preparar? Con un plan en curso, muestra la cuenta regresiva y la sesión de hoy. */
const ICON_PRES = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8M7 12l3-3 2 2 4-4"/></svg>';
const ICON_ENT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/></svg>';
const ICON_CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-3v10l-6-3z"/></svg>';
const ICON_GO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
function presActiva() { const p = pres(); return p && p.bloques && p.bloques.length && daysBetween(today(), p.fecha) >= 0 ? p : null; }
function presBtnAttrs() {
  const p = pres();
  if (!p) return 'data-act="presNew"';
  if (!p.bloques || !p.bloques.length) return 'data-act="presOpen" data-pv="cargar"';
  const hoy = presHoy(p);
  return daysBetween(today(), p.fecha) < 0 || !hoy ? 'data-act="presOpen" data-pv="plan"' : `data-act="presOpen" data-pv="sesion" data-ses="${hoy.id}"`;
}
function pilarCards() {
  const p = pres(), pendiente = p && (!p.bloques || !p.bloques.length), paso = p && !pendiente && daysBetween(today(), p.fecha) < 0;
  return `<button class="card pilar ar-acad" ${presBtnAttrs()}>
      <span class="card-head"><span class="s-icon big">${ICON_PRES}</span><span><span class="eyebrow ar">Presentaciones</span><h3>${pendiente ? esc(p.tema || "Mi presentación") : paso ? "¿Cómo te fue?" : "Una presentación o un video"}</h3></span></span>
      <span class="meta">${pendiente ? "Te falta cargar tu presentación o tu guion para crear el plan." : paso ? `Cuéntanos cómo te fue con «${esc(p.tema)}» y prepara la siguiente.` : "En vivo o grabada. Sube tu PowerPoint, Canva o guion y Aura arma tu plan hasta la fecha."}</span>
      <span class="pill-cta solid">${pendiente ? "Continuar" : paso ? "Contar" : "Empezar"} ${ICON_GO}</span></button>
    <button class="card pilar ar-lab" data-act="tab" data-tab="entrevistas">
      <span class="card-head"><span class="s-icon big">${ICON_ENT}</span><span><span class="eyebrow ar">Entrevistas</span><h3>Una entrevista de trabajo</h3></span></span>
      <span class="meta">Descubre tus fortalezas y debilidades, arma tus respuestas y ensaya por voz.</span>
      <span class="pill-cta">Empezar ${ICON_GO}</span></button>`;
}
function presHomeCard(p) {
  const d = daysBetween(today(), p.fecha), pl = presPlan(p), all = presSesiones(pl), hechas = all.filter(s => p.done[s.id]).length, hoy = presHoy(p);
  const pc = all.length ? Math.round(hechas / all.length * 100) : 0;
  return `<button class="card pres-hero home-plan ar-acad" data-act="presOpen" data-pv="${hoy ? "sesion" : "plan"}" ${hoy ? `data-ses="${hoy.id}"` : ""}>
      <span class="hp-top"><span><span class="eyebrow ar">Tu próxima presentación</span><h2>${esc(p.tema)}</h2><span class="meta">${esc(fechaLarga(p.fecha))} · ${p.minutos} min</span></span>
        <span class="count-ring" aria-label="${d === 0 ? "Hoy presentas" : d === 1 ? "Presentas mañana" : "Faltan " + d + " días"}"><b>${d === 0 ? "Hoy" : d}</b>${d === 0 ? "" : `<small>${d === 1 ? "día" : "días"}</small>`}</span></span>
      <span class="barlabel"><span>Plan ${esc(PLAN_NOM[pl.tipo])}</span><span class="mono">${hechas} de ${all.length} sesiones</span></span><span class="bar" aria-hidden="true"><i style="width:${pc}%"></i></span>
      <span class="hp-go">${hoy ? `${ICON_PLAY} Seguir con la sesión de hoy · ${hoy.min} min` : "Hoy ya cumpliste. Ver mi plan"}</span></button>`;
}
function hoyList(p) {
  const pl = presPlan(p), dia = pl && pl.dias.find(x => x.f === today()); if (!dia) return "";
  const hoy = presHoy(p);
  return `<div class="stack" style="gap:6px"><h3>Hoy</h3>${dia.ses.map(s => { const ok = !!p.done[s.id], cur = hoy && hoy.id === s.id;
    return `<button class="hoy-row${ok ? " ok" : ""}${cur ? " cur" : ""}" data-act="presOpen" data-ses="${s.id}"><span class="hoy-ck" aria-hidden="true">${ok ? ICON_CHECK : ""}</span><span class="hoy-t">${esc(PR.SES[s.tipo].titulo)}${s.n ? " " + s.n : ""}</span><span class="note" style="margin:0">${s.min} min</span></button>`; }).join("")}</div>`;
}
function vInicio() {
  const p = progress.profile, pa = paisObj(), act = presActiva(), st = streak();
  const banner = S.paisAuto && !progress.dismiss.paisBanner
    ? `<div class="banner"><span class="flag" aria-hidden="true">${pa.bandera}</span><p>Aura ahora se adapta a tu país: <b>${esc(pa.nombre)}</b>. <button class="linkish" data-act="paisOpen">Cambiar</button></p><button class="x" data-act="dismissPais" aria-label="Cerrar aviso">×</button></div>` : "";
  const hola = `<p class="note" style="margin:0">Hola, ${esc(p.name)}${st > 0 ? ` · <b style="color:var(--accent)">${st} ${st === 1 ? "día seguido" : "días seguidos"}</b>` : ""}</p>`;
  if (act) return `<section class="section home">${banner}${S.toast ? `<p class="toast">${esc(S.toast)}</p>` : ""}${hola}
      ${presHomeCard(act)}
      ${hoyList(act)}
      <button class="link-card ar-lab" data-act="tab" data-tab="entrevistas"><span class="s-icon">${ICON_ENT}</span><span class="stack" style="gap:2px"><b>¿También tienes una entrevista?</b><span class="note" style="margin:0">Prepárala en paralelo</span></span><span class="arrow">›</span></button>
    </section>`;
  return `<section class="section home">${banner}${S.toast ? `<p class="toast">${esc(S.toast)}</p>` : ""}
      <div class="stack" style="gap:6px">${hola}<h1 class="home-q">¿Qué tienes que preparar?</h1></div>
      ${pilarCards()}
      <ol class="how3"><li><span>1</span>Dinos la fecha</li><li><span>2</span>Aura arma tu plan</li><li><span>3</span>Practica cada día</li></ol>
    </section>`;
}

/* ===================== VISTA: PILARES ===================== */
function vPresHub() {
  const p = pres(), hist = (progress.presHist || []).slice().reverse(), conB = p && p.bloques && p.bloques.length;
  const RES = { bien: "Me fue bien", regular: "Más o menos", mal: "Me costó" };
  const sim = (id, titulo, sub) => { const m = meta(id); if (!m || !m.ready) return "";
    return `<button class="card mini ar-acad" data-act="open" data-id="${id}"><span class="s-icon">${iconFor(id, m.area)}</span><b>${titulo}</b><span class="note" style="margin:0">${sub}</span></button>`; };
  return `<section class="section">${S.toast ? `<p class="toast">${esc(S.toast)}</p>` : ""}
    <div class="hub-head ar-acad"><div><p class="eyebrow ar">Pilar 1</p><h2>Presentaciones</h2></div>
      ${p ? `<button class="btn primary" data-act="presNewAsk">+ Nueva</button>` : ""}</div>
    ${S.confirm === "presNueva" ? `<div class="confirm"><span>¿Empezar una nueva? «${esc(p.tema || "Tu presentación")}» pasa a tu historial.</span><button class="btn primary" data-act="presNewYes">Sí, nueva</button><button class="btn ghost" data-act="cancelConfirm">Cancelar</button></div>` : ""}
    ${presCard()}
    <div class="stack" style="gap:8px"><div><h3>Simula frente al público</h3><p class="note" style="margin:2px 0 0">Practica las preguntas que vienen después de presentar.</p></div>
      <div class="grid2">${sim("disertacion", "Preguntas del profesor", "Disertación en clases")}${sim("presentacion", "Defensa de proyecto", "Presentación ante comisión")}</div></div>
    <div class="stack" style="gap:8px"><h3>Herramientas</h3>
      <div class="panel tools">
        <button class="tool-row" data-act="vidOpen" data-from="presentaciones"><span class="s-icon">${ICON_CAM}</span><span class="hoy-t">Grabar un video con teleprompter</span><span class="note" style="margin:0">Nuevo</span></button>
        <button class="tool-row" data-act="presSes" data-ses="libre-relevo" ${conB ? "" : "disabled"}><span class="s-icon">${SES_ICON.relevo}</span><span class="hoy-t">Relevo de conectores</span><span class="note" style="margin:0">3 min</span></button>
        <button class="tool-row" data-act="presSes" data-ses="libre-ensayo" ${conB ? "" : "disabled"}><span class="s-icon">${SES_ICON.ensayo}</span><span class="hoy-t">Ensayo libre cronometrado</span><span class="note" style="margin:0">${p ? p.minutos : 5} min</span></button>
        ${sw("silencio", "Modo silencioso", "Para el metro, la micro o la biblioteca: escribes en vez de hablar.")}
      </div>
      ${conB ? "" : `<p class="note" style="margin:0">Relevo y Ensayo libre se activan cuando cargas tu presentación.</p>`}</div>
    ${hist.length ? `<div class="stack" style="gap:6px"><h3>Ya presentaste</h3>${hist.slice(0, 5).map(h => `<div class="hist-row"><span>${esc(h.tema)} · ${esc(fechaLarga(h.fecha))}</span><b class="${h.resultado === "bien" ? "good" : h.resultado === "mal" ? "warn" : ""}">${RES[h.resultado] || ""}</b></div>`).join("")}</div>` : ""}
  </section>`;
}
function vEntrevistas() {
  const step = (n, titulo, desc, estado, extra) => `<li class="paso${estado === "on" ? " on" : ""}"><span class="paso-n">${n}</span><div class="stack" style="gap:6px;min-width:0">
      <div class="paso-h"><b>${titulo}</b><span class="badge ${estado === "on" ? "ok" : ""}">${estado === "on" ? "Disponible" : "Próximamente"}</span></div>
      <span class="meta">${desc}</span>${extra || ""}</div></li>`;
  const simBtns = ["entrevista", "practica"].filter(id => meta(id) && meta(id).ready).map((id, i) => { const rec = progress.sims[id] || {};
    return `<button class="btn${i === 0 ? " primary lab" : " lab-ghost"}" data-act="open" data-id="${id}">${id === "entrevista" ? "Entrevista de trabajo" : "Entrevista de práctica"}${rec.best ? ` · mejor ${rec.best}` : ""}</button>`; }).join("");
  return `<section class="section">${S.toast ? `<p class="toast">${esc(S.toast)}</p>` : ""}
    <div class="hub-head ar-lab"><div><p class="eyebrow ar">Pilar 2</p><h2>Entrevistas</h2><p class="lead" style="margin:4px 0 0">Llega a tu entrevista sabiendo qué decir, en cuatro pasos.</p></div></div>
    ${eventoCard()}
    <ol class="pasos ar-lab">
      ${(() => { const pf = perfil(), est = estiloListo(), nc = Object.keys(pf.comps).length, mot = pf.motiv.length;
        const it = (act, v, lbl, ok, det) => `<button class="sub-row" data-act="${act}" data-v="${v}"><span class="hoy-ck" aria-hidden="true">${ok ? ICON_CHECK : ""}</span><span class="stack" style="gap:1px;flex-grow:1"><b>${lbl}</b><small class="muted">${det}</small></span><span class="arrow">›</span></button>`;
        return step(1, "Conócete", "Descubre tus fortalezas, debilidades y lo que te mueve. Tú decides con qué te identificas.", "on",
          `<div class="sub-list">${it("entIr", "estilo", "Tu estilo de trabajo", est, est ? EN.ESTILOS[EN.puntajeEstilo(pf.estilo.resp).principal].nombre + " · 12 preguntas" : "12 preguntas · 3 min")}
            ${it("entIr", "comps", "Tus competencias", pf.clave.length >= 3, pf.clave.length ? pf.clave.length + " clave elegidas" : nc ? nc + " de 24 evaluadas" : "24 competencias · 4 min")}
            ${it("entIr", "motiv", "Qué te mueve", mot === 3, mot ? pf.motiv.map(id => EN.MOT_IDX[id].nombre).join(" · ") : "Motivadores y trabajo ideal · 2 min")}</div>`); })()}
      ${(() => { const pf = perfil(), nl = pf.logros.filter(l => EN.fraseLogro(l)).length, nr = EN.ORDEN_PREG.filter(k => RESP_LISTA(k)).length;
        return step(2, "Arma tus respuestas", "Tus logros con resultados y las respuestas a las preguntas que casi siempre aparecen.", "on",
          `<div class="sub-list"><button class="sub-row" data-act="entIr" data-v="logros"><span class="hoy-ck" aria-hidden="true">${nl ? ICON_CHECK : ""}</span><span class="stack" style="gap:1px;flex-grow:1"><b>Tus logros</b><small class="muted">${nl ? nl + (nl === 1 ? " logro" : " logros") : "Momento · Acción · Resultado"}</small></span><span class="arrow">›</span></button>
            <button class="sub-row" data-act="entIr" data-v="resp"><span class="hoy-ck" aria-hidden="true">${nr >= 5 ? ICON_CHECK : ""}</span><span class="stack" style="gap:1px;flex-grow:1"><b>Tus respuestas</b><small class="muted">${nr} de ${EN.ORDEN_PREG.length} listas</small></span><span class="arrow">›</span></button></div>`); })()}
      ${(() => { const nr = EN.ORDEN_PREG.filter(k => k !== "preguntas" && RESP_LISTA(k)).length;
        return step(3, "Simula la entrevista", "Te hacemos tus preguntas en orden aleatorio y respondes por voz, sin mirar.", "on",
          `<button class="btn primary lab" data-act="simGo" ${nr ? "" : "disabled"}>${ICON_MIC} Simulación con tus respuestas</button>${nr ? "" : `<span class="note" style="margin:0">Arma al menos una respuesta en el paso 2.</span>`}
          <span class="note" style="margin:6px 0 0">O practica con un entrevistador que reacciona a lo que dices:</span><div class="row">${simBtns}</div>`); })()}
      ${step(4, "Pitch y video currículum", "Arma tu presentación personal en 7 partes y grábala con teleprompter. Sirve para el «cuéntame de ti» y para tu video currículum.", "on",
        (() => { const pp = progress.pitch, listo = pp && pp.carrera && pp.busco, c = cvData(), ns = c ? cvSugerencias().length : 0;
          return `<div class="sub-list"><button class="sub-row" data-act="entIr" data-v="cv"><span class="hoy-ck" aria-hidden="true">${c ? ICON_CHECK : ""}</span><span class="stack" style="gap:1px;flex-grow:1"><b>Tu CV</b><small class="muted">${c ? (ns ? ns + (ns === 1 ? " sugerencia" : " sugerencias") + " para tu pitch" : "Revisión y bloques para copiar") : "Súbelo y te decimos qué no estás aprovechando"}</small></span><span class="arrow">›</span></button></div><div class="row"><button class="btn primary lab" data-act="ptOpen"${listo ? ' data-fin="1"' : ""}>${listo ? "Ver mi pitch" : "Armar mi pitch"}</button>${listo ? `<span class="note" style="margin:0">${esc((PT.TIPOS[pp.tipo] || PT.TIPOS.video).nombre)} · ${PR.fmt(PT.segundos(pitchTexto(pp)))}</span>` : ""}</div>`; })())}
    </ol>
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
    return `<button class="card ${arCls(s.area)}" data-act="open" data-id="${s.id}">
      <span class="card-head"><span class="s-icon">${iconFor(s.id, s.area)}</span><span><span class="eyebrow ar">${esc(s.area)} · ${esc(tx(s.who))}</span><h3>${esc(tx(s.name))}</h3></span></span>
      <span class="meta">${esc(tx(s.blurb))}</span>
      ${s.id === r.id ? '<span class="tag">Recomendado</span>' : ""}
      <span class="barlabel"><span>${mastered}/${s.n} palabras dominadas</span><span class="mono">${rec.best ? "mejor: " + rec.best : "sin simular"}</span></span>
      <span class="bar" aria-hidden="true"><i style="width:${p}%"></i></span>
    </button>`;
  }).join("");
  return `<section class="section"><div><p class="eyebrow">Más situaciones</p><h2>Elige una situación</h2>
      <p class="lead">Cada escenario tiene 3 pasos: vocabulario, práctica y una conversación que reacciona a tus respuestas.</p></div>
    <div class="filters" role="toolbar" aria-label="Filtrar por área">${areas.map(x => `<button class="fchip ${x === a ? "on" : ""} ${arCls(x)}" data-act="area" data-area="${esc(x)}" aria-pressed="${x === a}">${esc(x)}</button>`).join("")}</div>
    ${ready.length ? `<div class="grid">${cards}</div>` : `<p class="empty">Todavía no hay escenarios disponibles en ${esc(a)}. Ya vienen en camino.</p>`}
    ${soon.length ? `<div class="stack" style="gap:8px"><p class="eyebrow">Próximamente · ${soon.length}</p><div class="soon">${soon.map(x => `<div class="soon-row"><span>${esc(tx(x.name))}</span><span class="ar-txt ${arCls(x.area)}">${esc(x.area)}</span></div>`).join("")}</div></div>` : ""}
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
  return `<section class="section"><button class="back" data-act="list">← ${PILAR_NOM[pilarDe(S.sid)]}</button>
    <div class="card-head ${arCls(s.area)}"><span class="s-icon">${iconFor(s.id, s.area)}</span><div><p class="eyebrow ar">${esc(s.area)} · ${esc(s.who)}</p><h2>${esc(s.name)}</h2></div></div>
    ${stepper("open")}
    ${S.toast ? `<p class="toast">${esc(S.toast)}</p>` : ""}
    ${s.prep ? prepCard(s) : ""}
    ${S.prepW && S.prepW.sid === s.id ? "" : escenaCard(s)}
    <div class="panel"><dl class="ficha">
      <div><dt>Situación</dt><dd>${esc(s.ficha.situacion)}</dd></div>
      <div><dt>Interlocutor</dt><dd><b>${esc(s.person)}</b> · ${esc(s.who)}. ${esc(s.ficha.pers[pers])}</dd></div>
      <div><dt>Lo que está en juego</dt><dd>${esc(s.ficha.enJuego)}</dd></div>
      <div><dt>Tu objetivo</dt><dd>${esc(s.ficha.objetivo)}</dd></div>
      <div><dt>${s.prep ? "Duración de esta práctica" : "Duración"}</dt><dd>${s.turnos} turnos · unos ${mins} minutos${s.propio ? " · con tu propio tema: se evalúa la estructura, las muletillas y el ritmo" : ""}</dd></div>
      ${s.prepNota && progress.prep[s.id] ? `<div><dt>Tu meta para el día real</dt><dd>${esc(s.prepNota)}</dd></div>` : ""}</dl>
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
          : `<p class="note">Crea una imagen con los colores de Aura, tu final y tu puntaje, lista para tus historias.</p>
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
  const p = progress.profile;
  const sims = Object.values(progress.sims).reduce((a, x) => a + (x.attempts || 0), 0);
  const voiced = progress.history.filter(e => e.ppm);
  const avgPpm = voiced.length ? Math.round(voiced.reduce((a, e) => a + e.ppm, 0) / voiced.length) : null;
  const avgMpm = voiced.length ? (voiced.reduce((a, e) => a + (e.mpm || 0), 0) / voiced.length).toFixed(1) : null;
  const rows = listReady().map(s => {
    const sp = sProg(s.id); let m = 0; for (let i = 0; i < s.n; i++) if ((progress.words[s.id + "-" + i] || 0) >= 3) m++;
    const rec = progress.sims[s.id] || {};
    return `<div class="srow ${arCls(s.area)}"><span class="s-icon">${iconFor(s.id, s.area)}</span><div class="stack" style="gap:6px;min-width:0">
      <span class="barlabel"><span style="color:var(--fg);font-weight:700">${esc(tx(s.name))}</span><span class="mono">${sp}%</span></span>
      <span class="bar" aria-hidden="true"><i style="width:${sp}%"></i></span>
      <span class="barlabel"><span>${m}/${s.n} palabras</span><span>${rec.best ? "mejor: " + rec.best + (rec.lastFin ? " · último: " + FIN_NAME[rec.lastFin].toLowerCase() : "") : "sin simular"}</span></span></div></div>`; }).join("");
  const pr = pres(), hist = progress.presHist || [], nPres = hist.length + (pr && pr.bloques && pr.bloques.length ? 1 : 0);
  const ens = (pr && pr.ensayos || []).slice(-5).reverse();
  const nEnt = ["entrevista", "practica"].reduce((a, id) => a + ((progress.sims[id] || {}).attempts || 0), 0);
  const extra = listReady().filter(s => pilarDe(s.id) === "progreso");
  return `<section class="section"><div><p class="eyebrow">Tu avance</p><h2>Progreso</h2></div>
      <div class="kpis">
        <div class="kpi"><b>${streak()}</b><span>${streak() === 1 ? "día seguido" : "días seguidos"}</span></div>
        <div class="kpi"><b>${nPres}</b><span>${nPres === 1 ? "presentación preparada" : "presentaciones preparadas"}</span></div>
        <div class="kpi"><b>${nEnt}</b><span>${nEnt === 1 ? "entrevista simulada" : "entrevistas simuladas"}</span></div>
      </div>
      <div class="panel"><div><h3>Tus ensayos</h3><p class="note">Ensayos completos de tu presentación actual: tiempo, ideas clave dichas y muletillas.</p></div>
        ${ens.length ? ens.map(e => `<div class="hist-row"><span>${esc(e.at)} · ${PR.fmt(e.secs)}</span><span>${e.cov}% ideas${e.mpm != null ? " · " + e.mpm + " mul/min" : ""}</span></div>`).join("")
          : `<p class="empty">Cuando hagas un ensayo completo de tu presentación, aparece aquí.</p>`}</div>
      <div class="panel"><div><h3>Tu semana</h3><p class="note">Los días que practicaste. Cualquier práctica mantiene tu racha (mejor racha: ${bestStreak()} días).</p></div>${weekStrip()}</div>
      ${baselineCard()}
      <div class="panel"><div><h3>Últimas simulaciones</h3><p class="note">Puntaje de cada intento (0 a 100).</p></div>${scoresChart()}</div>
      <div class="panel"><h3>Simulaciones por escenario</h3>${rows}</div>
      <div class="panel"><h3>Tu voz en las simulaciones</h3>
        ${avgPpm ? `<div class="kpis two"><div class="kpi"><b>${avgPpm}</b><span>palabras por minuto (ideal ${M.PPM_RANGE[0]}–${M.PPM_RANGE[1]})</span></div><div class="kpi"><b>${avgMpm}</b><span>muletillas por minuto</span></div></div>`
        : `<p class="empty">Responde por voz en los turnos libres de una simulación para medir tu ritmo y tus muletillas.</p>`}
      </div>
      ${extra.length ? `<details class="extra"><summary><span class="stack" style="gap:2px"><b>Práctica extra</b><span class="note" style="margin:0">Escenarios con guion fijo · beta</span></span><span class="arrow" aria-hidden="true">›</span></summary>
        <p class="note">Para soltarte en otras situaciones. No se adaptan a tu caso.</p>
        <div class="extra-chips">${extra.map(s => `<button class="fchip ${arCls(s.area)}" data-act="open" data-id="${s.id}">${esc(tx(s.name))}</button>`).join("")}</div></details>` : ""}
      ${p ? `<p class="note">¿Sientes que ganaste confianza (${p.confStart} → ${p.confNow})? Actualízala en <button class="linkish" data-act="tab" data-tab="ajustes">Ajustes</button>.</p>` : ""}
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
    <div class="panel"><h3>Apariencia</h3>
      ${sw("dark", "Modo oscuro", "Fondo carbón con acentos cobre. Por defecto, Aura usa el tema claro marfil.")}</div>
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
app.addEventListener("change", e => {
  if (e.target.dataset && e.target.dataset.clave) { const p = perfil(), id = e.target.dataset.clave; p.clave = p.clave.filter(x => x !== id); if (e.target.checked) { if (p.clave.length < 5) p.clave.push(id); else e.target.checked = false; } save(); render(); return; }
  if (e.target.dataset && e.target.dataset.pq) { const c = perfil().resp.preguntas || (perfil().resp.preguntas = {}), q = e.target.dataset.pq; c.sel = (c.sel || []).filter(x => x !== q); if (e.target.checked) c.sel.push(q); c.editado = false; save(); render(); return; }
  if (e.target.dataset && e.target.dataset.ptck) { const p = pitchData(); p.check[e.target.dataset.ptck] = e.target.checked; save(); return; }
  const t = e.target;
  if ((t.id === "pcFileA" || t.id === "pcFileB") && t.files && t.files[0]) { presImport(t.files[0]); t.value = ""; return; }
  if (t.id === "cvFile" && t.files && t.files[0]) { cvImport(t.files[0]); t.value = ""; return; }
  if (t.id === "pdFecha" && S.pd) { S.pd.fecha = t.value; render(); return; }
  if (t.id === "psCues" && S.ps) { S.ps.cues = t.checked; render(); if (S.ps.phase === "rec") presTick(); return; }
  if (t.dataset && t.dataset.bid && t.dataset.f === "texto") { const b = pbFind(t.dataset.bid); if (b && !b.kEdit) { b.claves = PR.keywords(b.texto + " " + b.apoyo + " " + b.titulo, 4); save(); setTimeout(() => { if (S.sub === "pres" && S.pv === "bloques") render(); }, 0); } }
});
app.addEventListener("keydown", e => {
  if (e.target.classList && e.target.classList.contains("pb-key") && e.key === "Enter") {
    e.preventDefault(); const v = e.target.value.trim(), b = pbFind(e.target.dataset.bid);
    if (v && b && !b.claves.includes(v)) { b.claves.push(v); b.kEdit = true; save(); render(); const n = document.querySelector(`.pb-key[data-bid="${b.id}"]`); if (n) n.focus(); }
    return;
  } if (e.target.classList && e.target.classList.contains("hz-in") && e.key === "Enter") {
    e.preventDefault(); const all = [...document.querySelectorAll(".hz-in")], i = all.indexOf(e.target);
    if (all[i + 1]) all[i + 1].focus(); else { const c = document.querySelector('[data-act="psHzCheck"]'); if (c) c.click(); }
    return;
  } if (e.target.id === "pqNew" && e.key === "Enter") {
    e.preventDefault(); const v = e.target.value.trim(), c = perfil().resp.preguntas || (perfil().resp.preguntas = {});
    if (v) { c.sel = (c.sel || []).concat([/\?$/.test(v) ? v : v + "?"]); c.editado = false; save(); render(); }
    return;
  } if (e.target.id === "ptCompNew" && e.key === "Enter") {
    e.preventDefault(); const v = e.target.value.trim(), p = pitchData();
    if (v && !p.comps.some(c => c.toLowerCase() === v.toLowerCase()) && p.comps.length < 8) { p.comps.push(v); save(); render(); const n = document.getElementById("ptCompNew"); if (n) n.focus(); }
    return;
  } if (e.target.id === "pwText" && e.key === "Enter") { e.preventDefault(); pwAnswer(M.cleanSlot(e.target.value)); } });
app.addEventListener("input", e => {
  const tg = e.target;
  if (tg.dataset && tg.dataset.pf && S.sub === "pitch") {
    pitchSet(tg.dataset.pf, tg.value);
    const pv = document.getElementById("ptPrev"); if (pv && S.pt) { const st = PT_PASOS[S.pt.paso]; if (st) pv.textContent = PT.partes(pitchData())[st.k === "tipo" ? "cierre" : st.k] || "…"; }
  }
  if (tg.dataset && tg.dataset.ef && S.sub === "ent") {
    const E = S.ev, cambiaBase = E.v === "respEdit" && /^resp\.(debilidad\.deb|fortaleza\.fort)$/.test(tg.dataset.ef);
    const oldOpts = cambiaBase ? respOptsDe(E.k, Object.assign({}, perfil().resp[E.k])) : null;
    entSet(tg.dataset.ef, tg.value);
    const pv = document.getElementById("entPrev");
    if (cambiaBase) {
      const c = perfil().resp[E.k]; if (c.compId && tg.value.trim()) { delete c.compId; document.querySelectorAll('[data-act="respComp"].on').forEach(b => b.classList.remove("on")); }
      respLimpiar(E.k, c, oldOpts); save();
      document.querySelectorAll('[data-act="respPick"].on').forEach(b => b.classList.remove("on"));
      clearTimeout(respSubT); respSubT = setTimeout(() => { const box = document.getElementById("respSub"); if (box && S.ev === E) box.innerHTML = respSubCampos(E.k, c, "resp." + E.k + ".", perfil()); }, 500);
    }
    if (pv && E.v === "logro") { const l = perfil().logros[E.i]; pv.textContent = EN.fraseLogro(l) || "…"; const rv = document.getElementById("logroRevs"); if (rv) rv.innerHTML = logroRevsHTML(l); }
    if (E.v === "respEdit" && /^resp\./.test(tg.dataset.ef)) { const c = perfil().resp[E.k]; c.editado = false; const ta = document.getElementById("entTexto"), txt = entTexto(E.k); if (ta) ta.value = txt; const inf = document.getElementById("entInfo"); if (inf) inf.textContent = txt ? `Cerca de ${EN.segundos(txt)} s en voz alta.` : ""; }
  }
  if (tg.id === "entTexto" && S.ev) { const c = perfil().resp[S.ev.k] || (perfil().resp[S.ev.k] = {}); c.texto = tg.value; c.editado = true; save(); }
  if (tg.id === "ptGuion") { const p = pitchData(), antes = ptSucio(p); p.guionBorrador = tg.value; if (!ptSucio(p)) delete p.guionBorrador; S.ptOk = false; save();
    if (antes !== ptSucio(p) || antes === false) { const box = document.getElementById("ptSave"); if (box) box.innerHTML = ptSaveHTML(p); } }
  if (tg.id === "pdTema" && S.pd) S.pd.tema = tg.value;
  if (tg.id === "pcText") S.pcText = tg.value;
  if (tg.id === "pbIns" || tg.id === "pbMat") { S[tg.id] = tg.value; const pp = document.getElementById("pbPrompt"), p0 = pres(); if (pp && p0) pp.value = PR.promptGuion({ tema: p0.tema, minutos: p0.minutos, fecha: fechaLarga(p0.fecha), instrucciones: S.pbIns || "", material: S.pbMat || "", pais: paisObj().nombre }); }
  if (tg.dataset && tg.dataset.bid && tg.dataset.f) { const b = pbFind(tg.dataset.bid); if (b) { b[tg.dataset.f] = tg.value; presSave(); } }
  if (e.target.id === "pwText" && S.prepW) { S.prepW.ans[e.target.dataset.id] = e.target.value; const pv = document.getElementById("pwPrev"); if (pv) { const st = prepSteps(scenData(S.prepW.sid))[S.prepW.step]; pv.textContent = e.target.value.trim() || st.q.def; } }
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
  if (/^(pres|pd|pc|pb|ps)/.test(a) && !["psMicGo", "psMicStop", "psDone", "psFrase", "psSabe"].includes(a)) tick();
  if (vidAct(a, el)) return;
  if (ptAct(a, el)) return;
  if (entAct(a, el)) return;
  if (cvAct(a, el)) return;
  if (presAct(a, el, e)) return;
  if (!["pAnswer", "rAnswer", "sAnswer", "sSubmit", "toggle", "saveProfile", "prToggle", "recStart", "recStop", "pwSave", "escNext", "escPrev", "escVoz"].includes(a)) tick();
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
    case "subBack": stopPrueba(); S.pr = null; S.reto = null; go({ sub: null }, "left"); break;
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
    case "retoStart": leaveSim(); startReto(); break;
    case "prepEdit": prepStart(S.sid, true); render(); break;
    case "pwGo": { const W = S.prepW; if (!W) break; clearTimeout(pwTimer); W.step = +el.dataset.i; W.eco = null; W.typing = false; W.otra = false; W.fresh = true; render(); break; }
    case "pwPick": pwAnswer(el.dataset.v); break;
    case "pwSug": { const t = document.getElementById("pwText"); if (t) { t.value = el.dataset.v; S.prepW.ans[t.dataset.id] = el.dataset.v; const pv = document.getElementById("pwPrev"); if (pv) pv.textContent = el.dataset.v; } break; }
    case "pwText": { const t = document.getElementById("pwText"); pwAnswer(el.dataset.empty ? "" : M.cleanSlot(t ? t.value : "")); break; }
    case "pwOtra": S.prepW.otra = true; S.prepW.fresh = false; render(); { const d = document.getElementById("pwDate"); if (d) d.focus(); } break;
    case "pwDate": { const d = document.getElementById("pwDate"), v = d ? d.value : "";
      if (!v || daysBetween(today(), v) < 0) { document.getElementById("pwErr").textContent = "Elige una fecha de hoy en adelante."; break; }
      pwAnswer(v); break; }
    case "pwSave": prepSaveW(); break;
    case "pwSkip": clearTimeout(pwTimer); if (!progress.prep[S.sid]) { progress.prep[S.sid] = { skip: true }; save(); delete DATA.esc[S.sid]; } S.prepW = null; render(); break;
    case "rAnswer": {
      const R = S.reto; if (!R || R.answered !== null) break;
      const q = R.qs[R.i], k = +el.dataset.k; R.answered = k;
      const ok = q.opts[k] === (q.kind === "mul" ? q.f.m : q.w.pro);
      if (q.w) { const cur = progress.words[q.w.id] || 0; progress.words[q.w.id] = ok ? Math.min(3, cur + 1) : Math.max(0, cur - 1); }
      if (ok) { R.correct++; chime(); } else softMiss();
      markDay(); save(); render(); break; }
    case "rNext": {
      const R = S.reto;
      if (R.i < R.qs.length - 1) { R.i++; R.answered = null; S.anim = "right"; render(); break; }
      R.done = true; progress.retos[today()] = { ok: R.correct, n: R.qs.length };
      const ks = Object.keys(progress.retos).sort(); if (ks.length > 400) ks.slice(0, ks.length - 400).forEach(k => delete progress.retos[k]);
      save(); if (R.correct >= R.qs.length - 1) fanfare(); else chime();
      S.anim = "up"; render(); break; }
    case "area": S.area = el.dataset.area; render(); break;
    case "list": leaveSim(); go({ tab: pilarDe(S.sid), view: "list" }, "left"); break;
    case "open": { const back = ["practice", "sim", "results"].includes(S.view) && S.tab === "practica"; openScen(el.dataset.id || S.sid, back ? "left" : "right"); break; }
    case "pers": progress.pers[S.sid] = el.dataset.p; save(); render(); break;
    case "startPractice": if (el.dataset.id) S.sid = el.dataset.id; leaveSim(); startPractice(); break;
    case "startSim": if (el.dataset.id) S.sid = el.dataset.id; escStop(); startSim(); break;
    case "escPlay": escPlay(S.sid); break;
    case "escNext": escGo(Esc.i + 1); break;
    case "escPrev": escGo(Esc.i - 1); break;
    case "escSkip": escStop(); Esc.done = true; render(); break;
    case "escVoz": progress.settings.narra = !progress.settings.narra; save(); if (!progress.settings.narra) { try { speechSynthesis.cancel(); } catch (e) {} } else speak(scenData(Esc.sid).escena.frames[Esc.i].t);
      { const b = el; b.setAttribute("aria-pressed", String(!!progress.settings.narra)); b.innerHTML = progress.settings.narra ? ICON_SPEAK : ICON_MUTE; } break;
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
      const r = M.scoreFree(node, text, S.voiceMeta, weightsFoco(s.weights), s.words, mulList());
      S.voiceMeta = null;
      answerTurn({ type: "free", say: node.say, text, S: r.S, r, model: node.model, next: M.nextFree(node, r.S) });
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
      if (k === "dark") applyTheme();
      if (k === "silencio" && S.ps) { presMicStop(); S.ps.phase = "idle"; S.ps.res = null; S.ps.hz = null; S.ps.escrito = false; }
      render(); break; }
    case "resetAsk": S.confirm = "reset"; render(); break;
    case "wipeAsk": S.confirm = "wipe"; render(); break;
    case "cancelConfirm": S.confirm = null; render(); break;
    case "resetYes": progress = freshProgress(progress); save(); S.confirm = null; S.toast = "Progreso reiniciado."; S.practiceDone = null; S.view = "list"; render(); break;
    case "wipeYes": leaveSim(); progress = freshProgress(); save(); applyTheme(); DATA.esc = {}; S = { tab: "inicio", view: "list", sub: null, anim: "up", ob: "bienvenida", area: "Todos" }; render(); break;
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
  applyTheme(); render();
}
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); });
}
boot();
})();
