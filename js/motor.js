/* Aura · motor
   Funciones puras (sin pantalla): normalizar texto, contar muletillas, puntuar respuestas,
   mover el medidor de interés y resolver el contenido según el país.
   Se usan en la app (window.AuraMotor) y en las pruebas con Node (module.exports). */
(function (root) {
  "use strict";

  const PPM_RANGE = [110, 160];
  const PPM_MAX_RELIABLE = 260;   // sobre ~260 palabras/min el dato es un error de medición

  /* ---------- texto ---------- */
  function norm(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[¿?¡!.,;:"“”«»()\[\]…]/g, " ").replace(/\s+/g, " ").trim();
  }
  function tokens(s) { const n = norm(s); return n ? n.split(" ") : []; }
  function hasStem(text, stem) {
    const st = norm(stem);
    if (!st) return false;
    if (st.includes(" ") || st.includes("-")) return (" " + norm(text) + " ").includes(" " + st);
    return tokens(text).some(t => t.startsWith(st));
  }
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }

  /* ---------- contenido por país ----------
     Un texto puede ser "texto" o {"base": "texto neutro", "AR": "texto argentino", ...}. */
  function isLoc(v) { return v && typeof v === "object" && !Array.isArray(v) && Object.prototype.hasOwnProperty.call(v, "base"); }
  function L(v, pais) { return isLoc(v) ? (pais && v[pais] !== undefined ? v[pais] : v.base) : v; }
  function deepL(v, pais) {
    v = L(v, pais);
    if (Array.isArray(v)) return v.map(x => deepL(x, pais));
    if (v && typeof v === "object") { const o = {}; for (const k in v) o[k] = deepL(v[k], pais); return o; }
    return v;
  }

  /* ---------- preguntas previas («Prepara tu escenario») ----------
     Cada pregunta puede ser "chips" (opciones con espacios {slot} y una nota), "texto" (el usuario
     escribe un dato que se inserta en el guion) o "fecha". Un texto con modo "propio" cambia el guion
     por la versión genérica (simPropio). */
  function cleanSlot(t) { return String(t == null ? "" : t).replace(/[{}<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 60); }
  function prepSlots(prep, st) {
    st = st || {}; const slots = {}; let propio = false, nota = null;
    (prep || []).forEach(q => {
      if (q.tipo === "chips") {
        const v = st[q.id] != null ? String(st[q.id]) : q.def;
        const o = q.opts.find(x => x.v === v) || q.opts.find(x => x.v === q.def) || q.opts[0];
        Object.assign(slots, o.slots || {}); if (o.nota) nota = o.nota;
      } else if (q.tipo === "texto") {
        const v = cleanSlot(st[q.id]); slots[q.slot] = v || q.def;
        if (v && q.modo === "propio") propio = true;
      }
    });
    return { slots, propio, nota };
  }
  function fillSlots(v, slots) {
    if (typeof v === "string") return v.replace(/\{([a-z_]+)\}/g, (m, k) => slots[k] !== undefined ? slots[k] : m);
    if (Array.isArray(v)) return v.map(x => fillSlots(x, slots));
    if (v && typeof v === "object") { const o = {}; for (const k in v) o[k] = k === "prep" ? v[k] : fillSlots(v[k], slots); return o; }
    return v;
  }
  /* Siguiente nodo: una respuesta libre con "branch" lleva a un camino u otro según su puntaje. */
  function nextFree(node, S) { return node.branch ? (S >= node.branch.umbral ? node.branch.alto : node.branch.bajo) : node.next; }

  /* ---------- muletillas ----------
     Cada entrada es "palabra o frase" o un objeto con reglas:
       {w, noSigue:[...]}   no cuenta si la palabra siguiente está en la lista ("tipo de")
       {w, siSigue:[...], fin}  solo cuenta si sigue alguna de esas palabras o va al final ("este...")
       {w, inicio, fin}     solo cuenta al inicio y/o al final de la respuesta ("pues", "nada") */
  function mergeMuletillas() {
    const map = new Map();
    Array.prototype.slice.call(arguments).forEach(list => (list || []).forEach(e => {
      const w = norm(typeof e === "string" ? e : e.w); if (w) map.set(w, e);
    }));
    return Array.from(map.values());
  }
  function countMuletillas(text, lista) {
    const toks = tokens(text), found = {}; let count = 0;
    (lista || []).forEach(e => {
      const ent = typeof e === "string" ? { w: e } : e;
      const parts = norm(ent.w).split(" ").filter(Boolean);
      if (!parts.length) return;
      for (let i = 0; i <= toks.length - parts.length; i++) {
        let ok = true;
        for (let j = 0; j < parts.length; j++) if (toks[i + j] !== parts[j]) { ok = false; break; }
        if (!ok) continue;
        const next = toks[i + parts.length], first = i === 0, last = i + parts.length === toks.length;
        if (ent.noSigue && next !== undefined && ent.noSigue.includes(next)) continue;
        if (ent.siSigue) {
          if (!((next !== undefined && ent.siSigue.includes(next)) || (ent.fin && last))) continue;
        } else if (ent.inicio || ent.fin) {
          if (!((ent.inicio && first) || (ent.fin && last))) continue;
        }
        found[ent.w] = (found[ent.w] || 0) + 1; count++;
      }
    });
    return { count, found };
  }

  /* ---------- voz: unir resultados del reconocedor ----------
     Chrome en Android entrega la frase ACUMULADA en cada resultado; si un fragmento nuevo
     empieza igual que el anterior, lo reemplaza en vez de sumarse. */
  function sameStart(a, b) {
    const aw = a.split(" "), bw = b.split(" ");
    if (bw.length < aw.length) return false;
    const k = Math.max(1, Math.floor(aw.length * 0.7));
    let same = 0; for (let i = 0; i < k; i++) if (aw[i] === bw[i]) same++;
    return same >= Math.ceil(k * 0.8);
  }
  function mergePart(parts, t) {
    const last = parts[parts.length - 1];
    if (!last) { if (t) parts.push(t); return parts; }
    const a = norm(last), b = norm(t);
    if (!b) return parts;
    if (b.startsWith(a) || sameStart(a, b)) { parts[parts.length - 1] = t; return parts; }
    if (a.startsWith(b) || sameStart(b, a)) return parts;
    parts.push(t); return parts;
  }
  function buildTranscript(chunks) { return chunks.reduce((parts, t) => mergePart(parts, (t || "").trim()), []).join(" "); }

  /* ---------- métricas de habla ---------- */
  function paceScore(ppm) {
    if (ppm >= PPM_RANGE[0] && ppm <= PPM_RANGE[1]) return 1;
    return ppm < PPM_RANGE[0] ? clamp01((ppm - 60) / (PPM_RANGE[0] - 60)) : clamp01((220 - ppm) / (220 - PPM_RANGE[1]));
  }
  /* Prueba inicial: palabras por minuto, muletillas por minuto y variedad de vocabulario. */
  function speechMetrics(text, seconds, lista) {
    const toks = tokens(text), n = toks.length, mul = countMuletillas(text, lista);
    const min = seconds > 0 ? seconds / 60 : null;
    let ppm = min ? n / min : null;
    const reliable = ppm !== null && ppm <= PPM_MAX_RELIABLE;
    return {
      words: n, uniq: new Set(toks).size, seconds: seconds || null,
      ppm: reliable ? Math.round(ppm) : null,
      mpm: min && reliable ? +(mul.count / min).toFixed(1) : null,
      mul, reliable
    };
  }

  /* S = w1·vocabulario + w2·(1 − min(1, muletillas/umbral)) + w3·f(PPM)
     Sin voz se omite el ritmo y se renormalizan los pesos. */
  function scoreFree(turn, text, meta, weights, words, lista) {
    const matched = [], missing = [];
    turn.groups.forEach((g, i) => { (g.some(st => hasStem(text, st)) ? matched : missing).push((turn.hint && turn.hint[i]) || g[0]); });
    const v = turn.groups.length ? matched.length / turn.groups.length : 0;
    const mul = countMuletillas(text, lista);
    const nWords = tokens(text).length;
    const notes = [];
    let m, ppm = null, p = null;
    let voice = !!(meta && meta.voice && meta.seconds && meta.seconds >= 3);
    if (voice) {
      ppm = nWords / (meta.seconds / 60);
      if (ppm > PPM_MAX_RELIABLE) { voice = false; ppm = null; notes.push("El ritmo medido no fue confiable (posible error del micrófono), así que se evaluó sin ritmo."); }
    }
    if (voice) { const tm = mul.count / (meta.seconds / 60); m = 1 - Math.min(1, tm / 4); p = paceScore(ppm); }
    else { m = 1 - Math.min(1, mul.count / 3); }
    let S = voice ? (weights.v * v + weights.m * m + weights.p * p) : (weights.v * v + weights.m * m) / (weights.v + weights.m);
    if (nWords < 5) { S = Math.min(S, .5); notes.push("Respuesta muy corta: intenta desarrollar la idea en una o dos frases."); }
    const uniq = new Set(tokens(text)).size;
    if (nWords >= 20 && uniq / nWords < 0.35) { S = Math.min(S, .5); notes.push("Detectamos muchas palabras repetidas. Revisa que la transcripción refleje lo que dijiste."); }
    const colloquial = [];
    (words || []).forEach(w => (w.det || []).forEach(d => {
      if (hasStem(text, d) && !colloquial.find(c => c.col === w.col)) colloquial.push({ col: w.col, pro: w.pro });
    }));
    return { S: clamp01(S), v, m, p, ppm, nWords, mul, matched, missing, colloquial, notes, voice };
  }

  /* ---------- medidor de interés ----------
     Cada turno mueve el interés según la calidad de la respuesta (S de 0 a 1).
     El punto neutro es 0,65: una respuesta solo "correcta" no alcanza para subir.
     La personalidad del interlocutor cambia cuánto premia o castiga. */
  const PERSONALIDAD = { amable: { pos: 1.15, neg: 0.6 }, neutral: { pos: 1, neg: 1 }, dificil: { pos: 0.85, neg: 1.4 } };
  const INTERES_INICIAL = 50;
  function deltaInteres(S, pers) {
    const raw = (S - 0.65) * 30, k = PERSONALIDAD[pers] || PERSONALIDAD.neutral;
    return Math.round(raw >= 0 ? raw * k.pos : raw * k.neg);
  }
  function aplicarInteres(i, d) { return Math.max(0, Math.min(100, i + d)); }
  function finalPorInteres(i) { return i >= 70 ? "alto" : i >= 40 ? "medio" : "bajo"; }

  /* Turnos del camino más largo de la conversación. */
  function maxTurnos(sim) {
    const memo = {};
    const depth = id => {
      if (!id || !sim.nodes[id]) return 0;
      if (memo[id] !== undefined) return memo[id];
      memo[id] = 0;
      const n = sim.nodes[id];
      const nexts = new Set([n.next].concat((n.opts || []).map(o => (o && typeof o === "object" && o.next !== undefined) ? o.next : n.next),
        n.branch ? [n.branch.alto, n.branch.bajo] : []));
      let best = 0; nexts.forEach(x => { best = Math.max(best, depth(x)); });
      return (memo[id] = 1 + best);
    };
    return depth(sim.start);
  }

  /* ---------- progreso ---------- */
  function scenarioProgress(prog, sid, nWords) {
    let sum = 0;
    for (let i = 0; i < nWords; i++) sum += Math.min(3, (prog.words || {})[sid + "-" + i] || 0) / 3;
    const mastery = nWords ? sum / nWords : 0;
    const best = ((prog.sims || {})[sid] && prog.sims[sid].best) || 0;
    return Math.round((0.6 * mastery + 0.4 * best / 100) * 100);
  }
  function globalProgress(prog, list) {
    if (!list.length) return 0;
    return Math.round(list.reduce((a, s) => a + scenarioProgress(prog, s.id, s.n), 0) / list.length);
  }

  const API = {
    PPM_RANGE, PPM_MAX_RELIABLE, PERSONALIDAD, INTERES_INICIAL,
    norm, tokens, hasStem, L, deepL, isLoc, cleanSlot, prepSlots, fillSlots, nextFree,
    mergeMuletillas, countMuletillas, sameStart, buildTranscript,
    paceScore, speechMetrics, scoreFree,
    deltaInteres, aplicarInteres, finalPorInteres, maxTurnos,
    scenarioProgress, globalProgress
  };
  root.AuraMotor = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
