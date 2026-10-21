/* Aura · Mi presentación (motor)
   Funciones puras: dividir un guion en bloques, extraer palabras clave, repartir el tiempo,
   generar el plan de estudio según los días que faltan, desvanecer el texto para memorizar
   y medir qué ideas se dijeron en un ensayo. Se usa en la app (window.AuraPres) y en Node. */
(function (root) {
  "use strict";
  const M = root.AuraMotor || (typeof require !== "undefined" ? require("./motor.js") : null);
  const PPM = 130;   // ritmo ideal para presentar (palabras por minuto)

  const STOP = new Set(("a al algo algun alguna algunas alguno algunos ante antes aqui asi aun bajo bien cada casi como con contra cual cuales cuando de del desde donde dos durante e el ella ellas ellos en entre era eran es esa esas ese eso esos esta estaba estan estar este esto estos fue fueron gran ha habia han hasta hay la las le les lo los mas me mi mis mucho muy nada ni no nos nosotros o otra otras otro otros para pero poco por porque que quien se sea segun ser si sin sobre solo son su sus tambien tan tanto te tiene tienen todo todos tu tus un una unas uno unos y ya yo vamos voy va van hoy aqui ahi tener hacer puede pueden debe deben cual cuales hemos hace cosa cosas parte forma manera tipo vez veces ademas entonces luego primero segundo tercero ultimo final bueno gracias diapositiva slide presentacion tema apertura cierre introduccion conclusion conclusiones resumen verificar idea ideas hola todos").split(" "));

  /* ---------- texto ---------- */
  function words(t) { return String(t || "").split(/\s+/).filter(Boolean); }
  function countWords(t) { return words(t).length; }
  function secsFor(t, ppm) { return Math.round(countWords(t) / (ppm || PPM) * 60); }
  function clean(t) { return String(t || "").replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim(); }
  function firstWords(t, n) { const w = words(t.replace(/^[#*\-•\d.)\s]+/, "")); return w.slice(0, n).join(" ") + (w.length > n ? "…" : ""); }
  /* Primera frase con contenido: junta oraciones hasta tener unas 8 palabras («Buenos días.» sola no sirve). */
  function firstSentence(t) {
    const sents = String(t || "").match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [String(t || "")];
    let out = ""; for (const x of sents) { out += (out ? " " : "") + x.trim(); if (countWords(out) >= 8) break; }
    return out.trim();
  }


  /* ---------- conectores ----------
     Se aprenden por función: si se olvida «no obstante», cualquier conector de contraste sirve.
     «o sea» se detecta pero nunca se sugiere, porque suele ser muletilla. */
  /* w: formas que se detectan · sug: alternativas que encajan gramaticalmente en la misma frase · fam: familia
     (las opciones «incorrectas» del ejercicio vienen siempre de otra familia, para no confundir casi-sinónimos). */
  const CONECTORES = {
    contraste: { nombre: "Contraste", para: "marcar una idea opuesta", fam: "A", w: ["sin embargo", "no obstante", "pero", "aun así", "por otro lado", "en cambio", "por el contrario", "ahora bien", "a diferencia de"], sug: ["sin embargo", "no obstante", "aun así", "por otro lado", "en cambio"] },
    concesion: { nombre: "Concesión", para: "reconocer algo y seguir con tu idea", fam: "A", w: ["aunque", "a pesar de que", "a pesar de", "si bien", "pese a que", "pese a"], sug: ["aunque", "si bien", "a pesar de que"] },
    causa: { nombre: "Causa", para: "explicar por qué", fam: "C", w: ["porque", "ya que", "debido a", "dado que", "puesto que", "gracias a", "a causa de"], sug: ["porque", "ya que", "dado que", "puesto que"] },
    consecuencia: { nombre: "Consecuencia", para: "decir qué provoca algo", fam: "D", w: ["por lo tanto", "por eso", "así que", "en consecuencia", "por ende", "por esta razón", "de modo que", "entonces"], sug: ["por lo tanto", "por eso", "en consecuencia", "por esta razón"] },
    adicion: { nombre: "Agregar", para: "sumar otra idea", fam: "B", w: ["además", "también", "a esto se suma", "más aún", "asimismo", "incluso"], sug: ["además", "también", "asimismo", "más aún"] },
    ejemplo: { nombre: "Ejemplo", para: "bajar la idea a un caso", fam: "F", w: ["por ejemplo", "un caso concreto es", "pensemos en", "tal como"], sug: ["por ejemplo", "en concreto", "como ejemplo"] },
    orden: { nombre: "Orden", para: "ordenar los pasos", fam: "G", w: ["en primer lugar", "en segundo lugar", "para empezar", "primero", "luego", "después", "a continuación", "por último", "finalmente"],
      grupos: [["en primer lugar", "para empezar", "primero"], ["en segundo lugar", "luego", "después", "a continuación"], ["por último", "finalmente", "para terminar"]] },
    reformulacion: { nombre: "Aclarar", para: "decir lo mismo más claro", fam: "E", w: ["es decir", "dicho de otro modo", "en otras palabras", "o sea"], sug: ["es decir", "dicho de otro modo", "en otras palabras"] },
    cierre: { nombre: "Cerrar", para: "anunciar el final", fam: "E", w: ["en resumen", "en conclusión", "para cerrar", "en síntesis", "para terminar", "en definitiva", "para concluir"], sug: ["en resumen", "en conclusión", "en síntesis", "para cerrar"] },
    enfasis: { nombre: "Destacar", para: "subrayar lo importante", fam: "B", w: ["sobre todo", "de hecho", "en particular", "especialmente", "lo más importante es"], sug: ["sobre todo", "en particular", "especialmente"] },
    comparacion: { nombre: "Comparar", para: "relacionar dos cosas parecidas", fam: "B", w: ["al igual que", "del mismo modo", "de la misma manera"], sug: ["del mismo modo", "de la misma manera", "igualmente"] }
  };
  const NO_SUGERIR = new Set(["o sea"]);
  /* Frases comodín para ganar tiempo si te quedas en blanco (no suenan a muletilla). */
  const SALVAVIDAS = ["Ahora bien…", "Dicho esto…", "Lo que nos lleva a…", "Vamos al siguiente punto:"];
  const CON_LIST = Object.entries(CONECTORES).flatMap(([fn, o]) => o.w.map(w => ({ fn, w }))).sort((a, b) => b.w.length - a.w.length);
  const ACC = { a: "[aá]", e: "[eé]", i: "[ií]", o: "[oó]", u: "[uúü]", n: "[nñ]" };
  const CON_RE = CON_LIST.map(c => ({ fn: c.fn, w: c.w,
    re: new RegExp("(^|[^\\p{L}])(" + M.norm(c.w).split("").map(ch => ACC[ch] || ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("").replace(/ /g, "\\s+") + ")(?=[^\\p{L}]|$)", "giu") }));
  /* Encuentra los conectores de un texto: [{fn, w (como está escrito), canon, start, end}] sin superponerse. */
  function conectores(text) {
    const t = String(text || ""), found = [], taken = [];
    CON_RE.forEach(c => {
      c.re.lastIndex = 0; let m;
      while ((m = c.re.exec(t))) {
        const start = m.index + m[1].length, end = start + m[2].length;
        if (!taken.some(([a, b]) => start < b && end > a)) { taken.push([start, end]); found.push({ fn: c.fn, w: m[2], canon: c.w, start, end }); }
        if (m[0].length === 0) c.re.lastIndex++;
      }
    });
    return found.sort((a, b) => a.start - b.start);
  }
  function alternativas(fn, sin) {
    const c = CONECTORES[fn], n = M.norm(sin || "");
    let base = c.sug;
    if (c.grupos) base = c.grupos.find(g => g.some(w => M.norm(w) === n)) || c.grupos[1];
    return base.filter(w => !NO_SUGERIR.has(w) && M.norm(w) !== n);
  }
  function sugDe(fn) { const c = CONECTORES[fn]; return c.sug || c.grupos[1]; }
  /* Reemplaza cada conector por su función: así «pero» y «sin embargo» cuentan igual al medir lo dicho. */
  function canonConn(text) {
    let t = String(text || ""); const cs = conectores(t);
    for (let i = cs.length - 1; i >= 0; i--) t = t.slice(0, cs[i].start) + " zconn" + cs[i].fn + " " + t.slice(cs[i].end);
    return t;
  }
  function sinConectores(text) {
    let t = String(text || ""); const cs = conectores(t);
    for (let i = cs.length - 1; i >= 0; i--) t = t.slice(0, cs[i].start) + " " + t.slice(cs[i].end);
    return t;
  }
  function oraciones(text) {
    const t = String(text || ""), out = [], re = /[^.!?\n]+[.!?]*/g; let m;
    while ((m = re.exec(t))) { const s0 = m[0]; if (s0.trim()) out.push({ t: s0.trim(), start: m.index + (s0.length - s0.trimStart().length), end: m.index + s0.trimEnd().length }); }
    return out;
  }
  function mapaConectores(bs) {
    const m = {};
    bs.forEach(b => conectores(b.texto).forEach(c => { (m[c.fn] = m[c.fn] || { fn: c.fn, nombre: CONECTORES[c.fn].nombre, usos: [] }).usos.push({ w: c.w, bloque: b.titulo }); }));
    return Object.values(m).sort((a, b) => b.usos.length - a.usos.length);
  }
  function capFirst(w) { return w.charAt(0).toUpperCase() + w.slice(1); }
  /* Ítems del ejercicio Relevo: conectores del guion (variados por función), palabras que el usuario
     marcó como difíciles y los saltos entre bloques. */
  function relevoItems(bs, max) {
    max = max || 10;
    const porFn = {};
    bs.forEach(b => {
      const sents = oraciones(b.texto);
      conectores(b.texto).forEach(c => {
        const s0 = sents.find(x => c.start >= x.start && c.end <= x.end); if (!s0) return;
        const rel = c.start - s0.start, inicio = rel === 0;
        const blank = s0.t.slice(0, rel) + "___" + s0.t.slice(rel + (c.end - c.start));
        (porFn[c.fn] = porFn[c.fn] || []).push({ tipo: "con", fn: c.fn, w: c.w, canon: c.canon, frase: s0.t, blank, inicio, bloque: b.titulo });
      });
    });
    const fns = Object.keys(porFn), items = [], usados = new Set();
    for (let r = 0; items.length < max && fns.some(f => porFn[f].length > r); r++)
      fns.forEach(f => { const it = porFn[f][r]; if (it && items.length < max && !usados.has(M.norm(it.w) + it.frase)) { usados.add(M.norm(it.w) + it.frase); items.push(it); } });
    items.forEach((it, k) => {
      const ok = alternativas(it.fn, it.canon), fam = CONECTORES[it.fn].fam;
      const otros = Object.keys(CONECTORES).filter(f => CONECTORES[f].fam !== fam && f !== "orden" && !(it.fn === "orden" && CONECTORES[f].fam === "E"));
      const malos = [otros[k % otros.length], otros[(k + 2) % otros.length]].map((f, j) => sugDe(f)[j % sugDe(f).length]);
      const fmt = w => it.inicio ? capFirst(w) : w;
      it.validas = ok.map(fmt); it.opciones = [ok[0], ok[1] || ok[0], malos[0], malos[1]].map(fmt);
    });
    bs.forEach(b => (b.dificiles || []).forEach(d => items.push({ tipo: "dif", w: d.w, alt: d.alt, bloque: b.titulo,
      frase: (oraciones(b.texto).find(x => M.norm(x.t).includes(M.norm(d.w))) || {}).t || "" })));
    for (let i = 0; i < bs.length - 1; i++) items.push({ tipo: "puente", de: bs[i].titulo, a: bs[i + 1].titulo, texto: (bs[i].puente || "").trim() || puenteSugerido(bs[i], bs[i + 1]) });
    return items;
  }
  function puenteSugerido(a, b) {
    const gen = t => /^(apertura|introducci[oó]n|inicio|cierre|conclusi[oó]n|conclusiones|final|portada|gracias)$/i.test(String(t || "").replace(/[¿?¡!:.]/g, "").trim());
    if (b.tipo === "cierre") return gen(a.titulo) ? "Para cerrar, quiero dejarles una idea." : `Ya vimos ${minusTit(a.titulo)}; para cerrar, quiero dejarles una idea.`;
    if (a.tipo === "apertura" || gen(a.titulo)) return gen(b.titulo) ? "Partamos por lo central." : `Para entenderlo, partamos por ${minusTit(b.titulo)}.`;
    return `Ya vimos ${minusTit(a.titulo)}; ahora veamos ${minusTit(b.titulo)}.`;
  }
  function minusTit(t) { t = String(t || "").replace(/[¿?¡!:.]+/g, "").trim(); return /^[A-ZÁÉÍÓÚÑ]{2,}/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1); }

  /* ---------- palabras clave ----------
     Prioriza cifras (2,3%, 2025), nombres propios y palabras largas o repetidas; ignora palabras vacías. */
  function stemOf(w) { const n = M.norm(w); return n.length <= 5 ? n : n.slice(0, Math.max(5, n.length - 2)); }
  function keywords(text, n) {
    n = n || 4;
    const raw = sinConectores(text).replace(/[«»“”"()\[\]]/g, " ");
    const toks = raw.split(/\s+/).filter(Boolean);
    const score = new Map(), show = new Map();
    toks.forEach((tok, i) => {
      const t = tok.replace(/^[¿¡,.;:]+|[,.;:!?]+$/g, "");
      if (!t) return;
      const nrm = M.norm(t); if (!nrm || STOP.has(nrm)) return;
      if (/^\d$/.test(nrm)) return;
      const isNum = /\d/.test(t), isProper = /^[A-ZÁÉÍÓÚÑ]/.test(t) && i > 0 && !/[.!?:]$/.test(toks[i - 1] || "");
      if (!isNum && nrm.length < 4) return;
      const key = isNum ? nrm : stemOf(t);
      const isYear = /^(19|20)\d\d$/.test(nrm);
      const s = (isNum ? (isYear ? 1 : 4) : 0) + (isProper ? 2.5 : 0) + Math.min(3, nrm.length / 4) + (/^[A-ZÁÉÍÓÚÑ]{2,}$/.test(t) ? 2 : 0);
      score.set(key, (score.get(key) || 0) + s + (score.has(key) ? 1.5 : 0));
      if (!show.has(key)) show.set(key, t);
    });
    return Array.from(score.entries()).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => show.get(k));
  }

  /* ---------- bloques ---------- */
  let seq = 0;
  function bid() { seq++; return "b" + Date.now().toString(36) + seq; }
  function mkBlock(titulo, texto, apoyo) {
    const base = (texto || apoyo || titulo || "");
    return { id: bid(), tipo: "idea", titulo: titulo || firstWords(base, 5), texto: clean(texto), apoyo: clean(apoyo), claves: keywords((texto || "") + " " + (apoyo || "") + " " + (titulo || ""), 4) };
  }
  function marcarTipos(bs) {
    bs.forEach((b, i) => { b.tipo = i === 0 ? "apertura" : i === bs.length - 1 && bs.length > 1 ? "cierre" : "idea"; });
    return bs;
  }
  const HEAD = /^\s*(#{1,4}\s+.+|(diapositiva|lámina|lamina|slide|bloque|parte|sección|seccion)\s*\d*\s*[:.\-–—].*|\d{1,2}[.)]\s+[^\s].{0,60})\s*$/i;
  /* Guion escrito → bloques: por títulos (## Título, «Diapositiva 2:», «1. Introducción») o por párrafos. */
  function fromGuion(text) {
    const t = clean(text); if (!t) return [];
    const lines = t.split("\n"), heads = lines.filter(l => HEAD.test(l));
    let bs = [];
    if (heads.length >= 2) {
      let cur = null;
      lines.forEach(l => {
        if (HEAD.test(l)) { if (cur) bs.push(cur); cur = { titulo: l.replace(/^\s*#+\s*/, "").replace(/^(diapositiva|lámina|lamina|slide|bloque|parte|sección|seccion)\s*\d*\s*[:.\-–—]\s*/i, "").replace(/^\d{1,2}[.)]\s+/, "").trim(), texto: "" }; }
        else { if (!cur) cur = { titulo: "", texto: "" }; cur.texto += (cur.texto ? "\n" : "") + l; }
      });
      if (cur) bs.push(cur);
      bs = bs.filter(b => b.titulo || b.texto.trim()).map(b => mkBlock(b.titulo, b.texto, ""));
    } else {
      let paras = t.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
      if (paras.length === 1) paras = splitEven(paras[0]);
      paras = mergeSmall(paras, 7);
      bs = paras.map(p => mkBlock("", p, ""));
    }
    return marcarTipos(bs);
  }
  /* Un párrafo único y largo se corta en grupos de oraciones (~70 palabras). */
  function splitLong(p) {
    const sents = p.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [p], out = []; let cur = "";
    sents.forEach(s => { if (countWords(cur + " " + s) > 70 && cur) { out.push(cur.trim()); cur = s; } else cur += " " + s; });
    if (cur.trim()) out.push(cur.trim()); return out;
  }
  /* Un solo párrafo: se reparte en 3 a 6 bloques de oraciones seguidas. */
  function splitEven(p) {
    const sents = (p.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [p]).map(x => x.trim()).filter(Boolean);
    const k = Math.max(1, Math.min(sents.length, Math.min(6, Math.max(3, Math.round(countWords(p) / 45)))));
    const out = []; for (let i = 0; i < k; i++) out.push(sents.slice(Math.round(i * sents.length / k), Math.round((i + 1) * sents.length / k)).join(" "));
    return out.filter(Boolean);
  }
  function mergeSmall(paras, max) {
    paras = paras.slice();
    while (paras.length > max) {
      let k = 0, best = Infinity;
      for (let i = 0; i < paras.length - 1; i++) { const w = countWords(paras[i]) + countWords(paras[i + 1]); if (w < best) { best = w; k = i; } }
      paras.splice(k, 2, paras[k] + "\n" + paras[k + 1]);
    }
    return paras;
  }
  /* Diapositivas → bloques: título de la lámina, su texto como apoyo y las notas del orador como guion. */
  function fromSlides(slides) {
    const bs = (slides || []).map((s, i) => {
      const lines = clean(s.texto).split("\n").map(x => x.trim()).filter(Boolean);
      const titulo = (s.titulo || lines[0] || "Lámina " + (i + 1)).trim();
      const apoyo = (s.titulo ? lines : lines.slice(1)).join("\n");
      const b = mkBlock(titulo.slice(0, 80), clean(s.notas), apoyo);
      b.lamina = i + 1; return b;
    }).filter(b => b.titulo || b.apoyo || b.texto);
    return marcarTipos(bs);
  }

  /* ---------- tiempo ---------- */
  function presWords(b) { return countWords(b.texto || b.apoyo); }
  function asignarTiempo(bs, minutos) {
    const total = minutos * 60, ws = bs.map(b => Math.max(12, presWords(b))), sum = ws.reduce((a, x) => a + x, 0) || 1;
    const secs = ws.map(w => Math.max(10, Math.round(total * w / sum)));
    const guionWords = bs.reduce((a, b) => a + countWords(b.texto), 0);
    const estimado = Math.round(guionWords / PPM * 60);
    const faltan = bs.filter(b => !b.texto.trim()).length;
    let aviso = null;
    if (!faltan && estimado > total * 1.15) aviso = { tipo: "largo", texto: `Tu guion dura cerca de ${fmt(estimado)} a ritmo normal y tienes ${fmt(total)}. Recorta unas ${Math.round((estimado - total) / 60 * PPM)} palabras.` };
    else if (!faltan && estimado < total * 0.7) aviso = { tipo: "corto", texto: `Tu guion dura cerca de ${fmt(estimado)} y tienes ${fmt(total)}. Agrega un ejemplo o un dato en alguna idea.` };
    return { secs, total, estimado, metaPalabras: Math.round(minutos * PPM), aviso, faltan };
  }
  function fmt(s) { s = Math.round(s); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0") + " min"; }

  /* ---------- plan de estudio ----------
     Técnicas: bloques (chunking), práctica espaciada, recuerdo activo con el texto que se borra,
     ensayos cronometrados y calentamiento el mismo día. La intensidad depende de los días que faltan. */
  const SES = {
    lectura: { titulo: "Lee tu presentación en voz alta", min: 5, desc: "Con el guion completo, para que tu boca se acostumbre a las frases." },
    bloques: { titulo: "Aprende bloque por bloque", min: 10, desc: "Cada bloque: lo lees, lo dices con menos texto y terminas solo con las palabras clave." },
    ancla: { titulo: "Memoriza la apertura y el cierre", min: 8, desc: "Son las únicas partes que vale la pena saber casi palabra por palabra: ahí se notan los nervios." },
    tarjetas: { titulo: "Repaso rápido con tarjetas", min: 4, desc: "Ves el título del bloque, recuerdas sus ideas y compruebas." },
    relevo: { titulo: "Relevo de conectores", min: 3, desc: "Si se te olvida un conector, tienes 3 segundos para encontrar otro que cumpla la misma función." },
    ensayo: { titulo: "Ensayo completo cronometrado", min: 6, desc: "De principio a fin, por voz, sin mirar el guion. Medimos tiempo, ideas y muletillas." },
    preguntas: { titulo: "Preguntas del profesor", min: 6, desc: "Respondes en voz alta las preguntas que podrían hacerte." },
    calentamiento: { titulo: "Calentamiento antes de presentar", min: 5, desc: "Respiración, voz y tu primera frase dicha tres veces." }
  };
  function addDays(iso, n) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  function diasEntre(a, b) { return Math.round((Date.parse(b + "T12:00:00") - Date.parse(a + "T12:00:00")) / 864e5); }
  function plan(fecha, hoy, minDia) {
    const d = diasEntre(hoy, fecha); if (d < 0) return null;
    const reps = minDia >= 60 ? 3 : minDia >= 30 ? 2 : 1;
    const S = (tipo, extra) => Object.assign({ tipo }, extra || {});
    const ens = n => Array.from({ length: n }, (_, i) => S("ensayo", { n: i + 1 }));
    let tipo, dias = [];
    if (d === 0) {
      tipo = "expres";
      dias = [{ f: hoy, etiqueta: "Hoy, antes de presentar", ses: [S("lectura"), S("ancla"), S("bloques"), S("relevo"), ...ens(Math.max(2, reps)), S("calentamiento")] }];
    } else if (d === 1) {
      tipo = "expres";
      dias = [{ f: hoy, etiqueta: "Hoy", ses: [S("lectura"), S("ancla"), S("bloques"), S("ensayo", { n: 1 })] },
              { f: hoy, etiqueta: "Hoy en la noche", parte: "noche", ses: [S("tarjetas"), S("relevo"), ...ens(Math.max(2, reps)).map((s, i) => Object.assign(s, { n: i + 2 }))] },
              { f: fecha, etiqueta: "Mañana, antes de presentar", ses: [S("tarjetas"), S("calentamiento")] }];
    } else if (d <= 4) {
      tipo = "estructurado";
      const base = [
        [S("lectura"), S("bloques"), S("ancla")],
        [S("ancla"), S("relevo"), S("tarjetas"), ...ens(reps)],
        [S("tarjetas"), S("relevo"), ...ens(reps), S("preguntas")],
        [S("tarjetas"), S("ensayo", { n: 1 })]];
      const n = d;     // días de práctica antes del día de la presentación
      const pick = n === 2 ? [base[0], [S("ancla"), S("relevo"), S("tarjetas"), ...ens(reps), S("preguntas")]] : n === 3 ? base.slice(0, 3) : base;
      dias = pick.map((ses, i) => ({ f: addDays(hoy, i), etiqueta: i === 0 ? "Hoy" : i === 1 ? "Mañana" : null, ses }));
      dias.push({ f: fecha, etiqueta: "Día de la presentación", ses: [S("tarjetas"), S("calentamiento")] });
    } else {
      tipo = "espaciado";
      const start = d > 14 ? addDays(fecha, -14) : hoy, n = diasEntre(start, fecha);
      for (let i = 0; i < n; i++) {
        const left = n - i;            // días que faltan desde ese día
        let ses;
        if (i === 0) ses = [S("lectura"), S("bloques")];
        else if (left === 1) ses = [S("tarjetas"), S("relevo"), ...ens(reps), S("preguntas")];     // simulacro el día anterior
        else if (left === 2) ses = [S("ancla"), S("relevo"), S("ensayo", { n: 1 }), S("preguntas")];
        else if (left === 3) ses = [S("ancla"), ...ens(reps)];
        else if (i === 1) ses = [S("tarjetas")];
        else if (i % 2 === 0) ses = [S("bloques"), S("ancla")];
        else ses = [S("tarjetas"), S("relevo")];                                       // día liviano: espaciar ayuda a recordar
        dias.push({ f: addDays(start, i), etiqueta: i === 0 && start === hoy ? "Hoy" : null, ses });
      }
      dias.push({ f: fecha, etiqueta: "Día de la presentación", ses: [S("tarjetas"), S("calentamiento")] });
    }
    dias.forEach((dia, k) => dia.ses.forEach((s, j) => { s.id = dia.f + (dia.parte ? "-" + dia.parte : "") + "-" + j + "-" + s.tipo; s.min = SES[s.tipo].min; }));
    return { tipo, dias, d };
  }
  const PLAN_TXT = {
    expres: "Plan exprés: te quedan horas, así que vamos a lo que más rinde. Apertura y cierre casi de memoria, el medio como esqueleto de palabras clave y varios ensayos completos. Dormir bien también es parte del plan: el sueño fija lo practicado.",
    estructurado: "Plan estructurado: primero aprendes bloque por bloque, después quitas el apoyo del texto y terminas con ensayos generales y preguntas.",
    espaciado: "Plan espaciado: sesiones cortas repartidas en varios días, con días livianos entre medio. Así se recuerda mejor que estudiando todo de una vez."
  };

  /* ---------- memorizar: desvanecer el texto ----------
     nivel 0: todo · 1: se ocultan ~45% de las palabras · 2: solo la primera letra · 3: solo palabras clave */
  function fade(text, nivel, claves) {
    const ks = (claves || []).map(stemOf);
    let i = 0;
    return String(text || "").split(/(\s+)/).map(tok => {
      if (/^\s+$/.test(tok) || !tok) return { t: tok, sp: true };
      i++;
      const core = tok.replace(/^[¿¡«"(]+|[.,;:!?»")]+$/g, ""), pre = tok.slice(0, tok.indexOf(core)), post = tok.slice(tok.indexOf(core) + core.length);
      const isKey = core && ks.some(k => M.norm(core).startsWith(k));
      if (nivel === 0 || isKey || !core) return { t: tok, key: isKey };
      if (nivel === 1) return (i % 9 === 2 || i % 9 === 4 || i % 9 === 6 || i % 9 === 8) ? { t: tok, hid: true, pre, core, post } : { t: tok };
      if (nivel === 2) return { t: tok, ini: true, pre, core, post };
      return { t: tok, hid: true, pre, core, post, gone: true };
    });
  }
  /* Cuánto del texto se recordó al decirlo: palabras con contenido que aparecen en lo dicho. */
  function recall(dicho, texto) {
    dicho = canonConn(dicho); texto = canonConn(texto);
    const content = M.tokens(texto).filter(w => w.length >= 4 && !STOP.has(w));
    if (!content.length) return 1;
    const said = new Set(M.tokens(dicho).map(w => w.slice(0, 5)));
    const hit = content.filter(w => said.has(w.slice(0, 5))).length;
    return hit / content.length;
  }
  function cobertura(dicho, bs) {
    return bs.map(b => {
      const ks = (b.claves || []);
      const ok = ks.filter(k => M.hasStem(dicho, stemOf(k)));
      return { id: b.id, titulo: b.titulo, total: ks.length, ok: ok.length, faltan: ks.filter(k => !ok.includes(k)) };
    });
  }

  /* ---------- preguntas del profesor (plantillas, sin IA) ---------- */
  function preguntas(bs, tema) {
    const ideas = bs.filter(b => b.tipo === "idea");
    const num = bs.map(b => (b.claves || []).find(k => /\d/.test(k))).find(Boolean);
    const qs = [`En 30 segundos: ¿cuál es la idea principal de tu presentación${tema ? " sobre " + tema : ""}?`];
    if (ideas[0]) qs.push(`¿Por qué es importante «${ideas[0].titulo}»?`);
    if (num) qs.push(`Mencionaste «${num}». ¿De dónde sale ese dato y qué significa?`);
    if (ideas[1]) qs.push(`¿Cómo se relaciona «${ideas[1].titulo}» con lo anterior?`);
    qs.push("¿Qué conclusión sacas tú, personalmente, de este tema?");
    qs.push("Si tuvieras que quitar una parte por tiempo, ¿cuál sería y por qué?");
    return qs.slice(0, 4);
  }

  /* ---------- puente: prompt para que la IA del usuario escriba el guion ---------- */
  function promptGuion(o) {
    const pal = Math.round((o.minutos || 5) * PPM);
    return [
      `Actúa como un coach de oratoria. Ayúdame a preparar una presentación oral${o.curso ? " para el ramo/curso " + o.curso : ""}.`,
      ``,
      `Tema: ${o.tema || "(escribe tu tema)"}`,
      `Duración: ${o.minutos} minutos (unas ${pal} palabras habladas en total).`,
      o.fecha ? `Fecha de la presentación: ${o.fecha}.` : ``,
      o.instrucciones ? `Instrucciones del profesor:\n${o.instrucciones}` : ``,
      o.material ? `Mi material y datos (usa SOLO esto para las cifras):\n${o.material}` : ``,
      ``,
      `Reglas:`,
      `- Escribe el guion de lo que voy a DECIR, en primera persona, en español de ${o.pais || "Latinoamérica"}, claro y natural, sin sonar a texto leído.`,
      `- Estructura: una apertura con una pregunta o un dato que capte la atención, entre 2 y 4 ideas centrales y un cierre con la idea principal.`,
      `- No inventes datos. Si falta una cifra, escribe [VERIFICAR: qué dato buscar y dónde].`,
      `- Respeta la duración: unas ${pal} palabras en total.`,
      ``,
      `Formato de respuesta, exactamente así, sin nada más:`,
      `## Apertura`,
      `(texto)`,
      `## (título de la idea 1)`,
      `(texto)`,
      `## (título de la idea 2)`,
      `(texto)`,
      `## Cierre`,
      `(texto)`
    ].filter((x, i, a) => !(x === "" && a[i - 1] === "")).join("\n");
  }

  const API = { CONECTORES, SALVAVIDAS, conectores, alternativas, canonConn, sinConectores, oraciones, mapaConectores, relevoItems, puenteSugerido, PPM, SES, PLAN_TXT, words, countWords, secsFor, clean, firstSentence, keywords, stemOf, mkBlock, marcarTipos, fromGuion, fromSlides,
    asignarTiempo, fmt, plan, diasEntre, addDays, fade, recall, cobertura, preguntas, promptGuion };
  root.AuraPres = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
