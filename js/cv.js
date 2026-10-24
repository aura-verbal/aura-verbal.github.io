/* Aura · Currículum (motor)
   Lee el texto de un CV (ya extraído del PDF o Word), lo ordena por secciones y detecta herramientas,
   idiomas, cursos, cifras y cargos. Con eso:
   1) compara el CV con el pitch y sugiere lo que el usuario tiene y no usó;
   2) revisa el CV con reglas simples (verbos, cifras, largo, contacto, perfil);
   3) arma bloques para copiar al CV desde el autodiagnóstico (perfil profesional, competencias, logros).
   Todo con reglas, sin IA: por eso nada se agrega solo, el usuario confirma cada sugerencia.
   Funciones puras: window.AuraCV en la app y module.exports en Node. */
(function (root) {
  "use strict";
  const EN = typeof module !== "undefined" && module.exports ? require("./entrevista.js") : root.AuraEnt;
  const t = s => String(s || "").replace(/\s+/g, " ").trim();
  const norm = s => t(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const cap = s => { s = t(s); return s ? s[0].toUpperCase() + s.slice(1) : s; };
  const frag = s => { s = t(s).replace(/[.;,\s]+$/, ""); return s && /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s; };
  const lista = xs => { xs = xs.filter(Boolean); return xs.length <= 1 ? (xs[0] || "") : xs.slice(0, -1).join(", ") + " y " + xs[xs.length - 1]; };
  const VIN = /^[\s•●▪◦‣∙·\-–—*►✓✔→]+/;           // marcas de viñeta
  const limpia = s => t(String(s || "").replace(VIN, ""));

  /* ---------- 1. Secciones ---------- */
  const SECC = [
    ["perfil", /^(perfil( profesional)?|resumen( profesional)?|sobre m[ií]|acerca de m[ií]|objetivo( profesional| laboral)?|presentaci[oó]n|summary|profile)$/],
    ["experiencia", /^(experiencia( laboral| profesional)?|trayectoria( laboral| profesional)?|historial laboral|antecedentes laborales|experience|work experience)$/],
    ["formacion", /^(formaci[oó]n( acad[eé]mica)?|educaci[oó]n|estudios|antecedentes acad[eé]micos|education)$/],
    ["habilidades", /^(habilidades( t[eé]cnicas| blandas)?|competencias|conocimientos( t[eé]cnicos| inform[aá]ticos)?|herramientas|skills|software|inform[aá]tica)$/],
    ["idiomas", /^(idiomas?|languages)$/],
    ["cursos", /^(cursos|certificaciones|cursos y certificaciones|capacitaciones|diplomados|formaci[oó]n complementaria|certifications)$/],
    ["proyectos", /^(proyectos( acad[eé]micos| destacados)?|projects)$/],
    ["voluntariado", /^(voluntariado|actividades( extracurriculares| extraprogram[aá]ticas)?|extraprogram[aá]ticas?)$/],
    ["logros", /^(logros|premios|reconocimientos|premios y reconocimientos)$/],
    ["referencias", /^(referencias( laborales)?|references)$/],
    ["contacto", /^(contacto|datos personales|informaci[oó]n personal|datos de contacto)$/]
  ];
  function tipoSeccion(linea) {
    const s = norm(limpia(linea)).replace(/[:.]+$/, "").trim();
    if (!s || s.split(" ").length > 5) return null;
    const hit = SECC.find(([, re]) => re.test(s)); return hit ? hit[0] : null;
  }
  function secciones(texto) {
    const out = { _inicio: [] }; let cur = "_inicio";
    String(texto || "").split(/\r?\n/).map(x => x.replace(/^#+\s*/, "")).forEach(l => {
      if (!t(l)) return; const s = tipoSeccion(l);
      if (s) { cur = s; out[s] = out[s] || []; return; }
      (out[cur] = out[cur] || []).push(t(l));
    });
    return out;
  }

  /* ---------- 2. Qué tiene el CV ---------- */
  const HERRAMIENTAS = [
    ["Excel", /\bexcel\b/i], ["Power BI", /\bpower ?bi\b/i], ["Python", /\bpython\b/i], ["SQL", /\b(sql|mysql|postgres(ql)?)\b/i], ["SAP", /\bsap\b/i],
    ["Tableau", /\btableau\b/i], ["R", /\b(rstudio|lenguaje r|programaci[oó]n en r)\b/i], ["AutoCAD", /\bautocad\b/i], ["SolidWorks", /\bsolidworks\b/i], ["MATLAB", /\bmatlab\b/i],
    ["AMPL", /\bampl\b/i], ["Minitab", /\bminitab\b/i], ["Arduino", /\barduino\b/i], ["Java", /\bjava\b(?!script)/i], ["JavaScript", /\bjavascript\b/i],
    ["Google Workspace", /\b(google (workspace|sheets|docs|drive)|g ?suite)\b/i], ["Microsoft Office", /\b(microsoft office|ms office|office 365|paquete office)\b/i],
    ["Word", /\bword\b/i], ["PowerPoint", /\bpower ?point\b/i], ["Canva", /\bcanva\b/i], ["Photoshop", /\bphotoshop\b/i], ["Figma", /\bfigma\b/i],
    ["Salesforce", /\bsalesforce\b/i], ["HubSpot", /\bhubspot\b/i], ["Jira", /\bjira\b/i], ["Trello", /\btrello\b/i], ["WMS", /\bwms\b/i], ["ERP", /\berp\b/i],
    ["Defontana", /\bdefontana\b/i], ["Softland", /\bsoftland\b/i], ["Looker Studio", /\b(looker|data studio)\b/i], ["Power Apps", /\bpower ?apps\b/i]
  ];
  const IDIOMAS = [["Inglés", /ingl[eé]s/i], ["Portugués", /portugu[eé]s/i], ["Francés", /franc[eé]s/i], ["Alemán", /alem[aá]n/i], ["Italiano", /italiano/i], ["Chino mandarín", /(chino|mandar[ií]n)/i], ["Japonés", /japon[eé]s/i], ["Coreano", /coreano/i]];
  const NIVEL = /(b[aá]sico|intermedio( alto| bajo)?|avanzado|nativo|fluido|bilingüe|biling[uü]e|\b[abc][12]\b|toeic|toefl|ielts|cambridge)/i;
  const MES = "(?:ene|feb|mar|abr|may|jun|jul|ago|sep|sept|oct|nov|dic)[a-záéíóú]*\\.?";
  // «2023 – Actual», «Oct. 2025 – Ene. 2026», «2019 – May. 2023»
  const FECHAS = new RegExp("(?:" + MES + "\\s*)?((19|20)\\d\\d)\\s*(?:[-–—]|a|al|hasta)\\s*(?:" + MES + "\\s*)?((19|20)\\d\\d|actual(idad)?|presente|hoy|la fecha)", "i");
  const CIFRA = /(\d+[.,]?\d*\s*%|\$\s?\d|\d+\s*(clientes|personas|trabajadores|colaboradores|productos|skus?|unidades|horas|d[ií]as|minutos|semanas|meses|ventas|pedidos|despachos|tiendas|locales|proyectos|estudiantes|alumnos|m(illones)?\b|mm\b|uf\b|k\b))/i;
  const ES_FECHA_O_TEL = /^(\+?56)?[\s\d()-]{8,}$|^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/;

  /* Une las líneas cortadas por el ancho de la página: una línea que empieza en minúscula sigue a la anterior. */
  function unir(ls) {
    const out = [];
    ls.forEach(l => { const s = t(l); if (!s) return; const vin = VIN.test(s), c = limpia(s), prev = out[out.length - 1];
      const sigue = prev && !vin && !/[.:]$/.test(prev.s) && !tipoSeccion(s) && !FECHAS.test(s)
        && (/^[a-záéíóúñ(]/.test(c) || (prev.vin && c.replace(/[^A-ZÁÉÍÓÚÑ]/g, "").length < c.replace(/[^A-Za-záéíóúñÁÉÍÓÚÑ]/g, "").length * 0.5));
      if (sigue) prev.s = t(prev.s + " " + c);
      else out.push({ s: c, vin }); });
    return out;
  }
  function extraer(texto, meta) {
    const sec = secciones(texto), todo = String(texto || ""), lineas = todo.split(/\r?\n/).map(t).filter(Boolean);
    const herramientas = HERRAMIENTAS.filter(([, re]) => re.test(todo)).map(([n, re]) => {
      const l = lineas.find(x => re.test(x)) || "", m = l.match(new RegExp(re.source + "[^,.;\\n]{0,20}?(b[aá]sico|intermedio|avanzado)", "i"));
      return { nombre: n, nivel: m ? m[m.length - 1].toLowerCase() : "" };
    });
    // Word/PowerPoint solos no aportan si ya está Office o Excel
    const hs = herramientas.filter(h => !(["Word", "PowerPoint"].includes(h.nombre) && herramientas.some(x => x.nombre === "Microsoft Office")));
    const idiomas = IDIOMAS.map(([n, re]) => { const l = lineas.find(x => re.test(x) && (/idioma|nivel|ingl|portug|franc/i.test(x) || NIVEL.test(x))); if (!l) return null;
      const m = l.slice(l.search(re)).match(NIVEL); return { nombre: n, nivel: m ? m[0].toLowerCase() : "" }; }).filter(Boolean)
      .filter(i => !(i.nombre !== "Inglés" && !(sec.idiomas || []).some(l => norm(l).includes(norm(i.nombre).slice(0, 5))) && !i.nivel));
    const cursos = (sec.cursos || []).map(limpia).filter(l => l.length > 6 && !ES_FECHA_O_TEL.test(l))
      .concat(lineas.filter(l => /\b(curso|certificaci[oó]n|certificado|diplomado|bootcamp)\b/i.test(l) && !tipoSeccion(l)).map(limpia))
      .filter((x, i, a) => a.indexOf(x) === i).slice(0, 8);
    const zona = unir((sec.experiencia || []).concat(sec.proyectos || [], sec.voluntariado || [], sec.logros || []));
    // Si el CV usa viñetas (•, -), solo esas cuentan; si no, cualquier línea larga sin fechas.
    const conMarca = zona.filter(u => u.vin), vinetas = (conMarca.length >= 3 ? conMarca : zona).map(u => u.s).filter(s => s.length > 25 && !FECHAS.test(s));
    const cifras = unir(lineas).map(u => u.s).filter(l => CIFRA.test(l) && !FECHAS.test(l) && !ES_FECHA_O_TEL.test(l) && !/@|tel[eé]fono|celular|\brut\b|\+56/i.test(l)).map(limpia)
      .filter(l => l.split(" ").length >= 4).slice(0, 6);
    const cargos = (sec.experiencia || []).map((l, i, a) => { if (!FECHAS.test(l)) return null;
      let s = t(l.replace(FECHAS, "").replace(/[(|,–—-]+\s*$/, "").replace(/^\s*[)|,–—-]+/, ""));
      if (/\)\s*$/.test(s) && !s.includes("(")) s = s.replace(/\)\s*$/, "");
      if (s.split(" ").length < 2 && a[i - 1] && !FECHAS.test(a[i - 1])) s = t(a[i - 1] + " " + s);
      s = t(s.replace(new RegExp("\\s*\\(?" + MES + "\\s*$", "i"), "").replace(/\s*[|–—-]\s*$/, "").replace(/\s*\(\s*$/, ""));
      return s.length > 3 ? s : null; }).filter(Boolean).slice(0, 6);
    const email = (todo.match(/[\w.+-]+@[\w-]+\.[\w.]+/) || [""])[0];
    const nombre = (lineas.find(l => !/\d|@|http|www/i.test(l) && l.split(" ").length >= 2 && l.split(" ").length <= 5 && !tipoSeccion(l)) || "");
    const palabras = t(todo) ? t(todo).split(" ").length : 0;
    return {
      sec, lineas, herramientas: hs, idiomas, cursos, vinetas, cifras, cargos, email, nombre, palabras,
      paginas: (meta && meta.paginas) || Math.max(1, Math.round(palabras / 450)),
      telefono: /(\+?56[\s-]?)?9[\s-]?\d{4}[\s-]?\d{4}/.test(todo) || /tel[eé]fono|celular|cel\.?:/i.test(todo),
      linkedin: /linkedin/i.test(todo), estudiante: /(actual(idad)?|en curso|presente|cursando|estudiante|\b[1-9]º? ?(a[ñn]o|semestre))/i.test((sec.formacion || []).join(" ") + " " + (sec.perfil || []).join(" ") + " " + (sec._inicio || []).join(" "))
    };
  }

  /* ---------- 3. Revisión del CV ---------- */
  const esVerbo = s => { const w = limpia(s); return EN.VERBO_RE.test(w) || /^[A-ZÁÉÍÓÚa-záéíóúñ]+(ar|er|ir)(?=[\s,.;]|$)/.test(w) || /^(apoy|atend|gestion|coordin|realiz|lider|organiz|control|elabor|administr|supervis|desarroll|implement|dise[ñn]|analiz|mejor|reduj|aument|prepar|cumpl|asist|ejecut|planific|recib|registr|vend|negoci)[a-záéíóú]*(o|a|é|ó|í|aba|ía)\b/i.test(w); };
  const RELLENO = /\b(proactiv[oa]|responsable|trabajo en equipo|orientad[oa] a (resultados|objetivos)|alta capacidad|capacidad de adaptaci[oó]n|motivad[oa]|apasionad[oa]|comprometid[oa]|din[aá]mic[oa])\b/gi;
  function revisar(cv, perfil, pitch) {
    const out = [], P = perfil || {}, add = (n, id, txt, ej) => out.push({ n, id, txt, ej: ej || [] });
    if (!cv.email) add("no", "email", "No encontramos tu correo. Ponlo arriba, junto a tu nombre y teléfono.");
    else { const loc = norm(cv.email.split("@")[0]), nom = norm(cv.nombre).split(" ").filter(w => w.length >= 3);
      if ((nom.length && !nom.some(w => loc.includes(w.slice(0, 4)))) || /\d{4,}|xx|love|bebe|kpo|gamer|crack|lind[oa]|princes|killer|69|420/.test(loc))
        add("mid", "email2", `Tu correo (${cv.email}) no se parece a tu nombre. Uno tipo nombre.apellido@… se ve más profesional.`); }
    if (!cv.telefono) add("mid", "tel", "No encontramos tu teléfono.");
    if (!cv.linkedin) add("tip", "linkedin", "Agrega el enlace a tu LinkedIn: los reclutadores lo revisan casi siempre.");
    if (!cv.sec.perfil) add("mid", "perfil", "No tiene perfil profesional: 3 o 4 líneas arriba que digan quién eres y qué buscas. Es lo primero que lee el reclutador. Abajo te dejamos uno armado con tus respuestas.");
    else { const rel = ((cv.sec.perfil || []).join(" ").match(RELLENO) || []).map(x => x.toLowerCase());
      if (rel.length >= 2) add("tip", "relleno", `Tu perfil usa palabras que pone casi todo el mundo (${lista([...new Set(rel)].slice(0, 3).map(x => "«" + x + "»"))}). Cámbialas por algo que puedas probar: un logro, una cifra, una herramienta.`); }
    if (!cv.sec.experiencia) add("tip", "exp", "No encontramos una sección de experiencia. Si aún no trabajas, agrega proyectos de la universidad, ayudantías, voluntariados o un emprendimiento.");
    const vin = cv.vinetas;
    if (vin.length >= 3) {
      const sinCifra = vin.filter(v => !CIFRA.test(v) && !/\d/.test(v));
      if (sinCifra.length / vin.length >= 0.6) add("mid", "cifras", `Solo ${vin.length - sinCifra.length} de tus ${vin.length} viñetas tiene un número. Agrega cifras donde puedas: cuánto, cuántos, en cuánto tiempo, qué porcentaje.`, sinCifra.slice(0, 2));
      const sinVerbo = vin.filter(v => !esVerbo(v));
      if (sinVerbo.length / vin.length >= 0.5) add("tip", "verbos", `${sinVerbo.length} viñetas empiezan con un sustantivo («Encargado de…», «Gestión de…»). Empezar con un verbo de acción (Organicé, Reduje, Coordiné) deja claro qué hiciste tú.`, sinVerbo.slice(0, 2));
    }
    if (cv.paginas > 2) add("mid", "largo", `Tiene ${cv.paginas} páginas. Para quien está empezando, 1 página es lo ideal y 2 el máximo.`);
    else if (cv.paginas === 2 && cv.estudiante) add("tip", "largo", "Tiene 2 páginas. Si estás estudiando o recién egresado, intenta dejarlo en 1.");
    if (cv.palabras < 150) add("tip", "corto", "Tu CV es bastante corto. Suma proyectos, cursos, herramientas o voluntariados.");
    cv.idiomas.filter(i => !i.nivel).forEach(i => add("tip", "nivel-" + i.nombre, `Indica tu nivel de ${i.nombre.toLowerCase()} (básico, intermedio, avanzado o B1, B2…).`));
    if ((cv.sec.referencias || []).some(l => /solicitud|disponibles|pedido/i.test(l))) add("tip", "refs", "«Referencias a solicitud» se puede quitar: se da por hecho y ocupa espacio.");
    const pers = ["rut", "estado civil", "fecha de nacimiento", "nacionalidad", "edad"].filter(x => new RegExp("\\b" + x + "\\b", "i").test(norm(cv.lineas.join(" "))));
    if (pers.length >= 2) add("tip", "personales", `Datos como ${lista(pers)} no son obligatorios en un CV. Quitarlos ahorra espacio y evita que te juzguen por algo que no es tu trabajo.`);
    // Lo que sabes de ti y no está en tu CV
    const hay = norm(cv.lineas.join(" ")), compsFalta = (P.clave || []).map(id => EN.COMP_IDX[id]).filter(c => c && !hay.includes(norm(c.nombre).split(" ")[0]));
    if (compsFalta.length) add("mid", "comps", `Tus competencias clave no aparecen en tu CV: ${lista(compsFalta.map(c => c.nombre.toLowerCase()))}. Mejor aún si cada una se nota en una viñeta con un logro.`);
    const logrosFalta = (P.logros || []).filter(l => EN.fraseLogro(l) && !enCV(hay, l.a));
    if (logrosFalta.length) add("tip", "logros", `Tienes ${logrosFalta.length === 1 ? "un logro" : logrosFalta.length + " logros"} en Aura que no está${logrosFalta.length === 1 ? "" : "n"} en tu CV. Abajo están redactados para copiarlos como viñetas.`);
    const orden = { no: 0, mid: 1, tip: 2 }; return out.sort((a, b) => orden[a.n] - orden[b.n]);
  }
  // ¿Una frase ya está en el CV? Se buscan sus palabras con contenido.
  function enCV(hayNorm, frase) {
    const ws = norm(frase).split(/[^a-z0-9ñ]+/).filter(w => w.length >= 5).slice(0, 6); if (!ws.length) return true;
    return ws.filter(w => hayNorm.includes(w.slice(0, 6))).length / ws.length >= 0.6;
  }

  /* ---------- 4. Comparación con el pitch ---------- */
  function textoPitch(p) {
    p = p || {};
    // Si el guion se editó a mano, lo que cuenta es lo que de verdad dice el guion guardado.
    if (p.editado && t(p.guion)) return norm(p.guion);
    return norm([p.carrera, p.inst, p.etapa, p.enfasis, (p.exp || []).map(e => e && (e.rubro + " " + e.que)).join(" "), (p.comps || []).join(" "), p.motivo, p.momento, p.busco, p.aporte].join(" "));
  }
  function compararPitch(cv, pitch, perfil) {
    const P = pitch || {}, hay = textoPitch(P), out = [], add = (id, txt, acciones) => out.push({ id, txt, acciones });
    const herr = cv.herramientas.filter(h => !["Word", "PowerPoint", "Microsoft Office", "Google Workspace", "Canva"].includes(h.nombre) && !hay.includes(norm(h.nombre)));
    if (herr.length) { const top = herr.slice(0, 3), comp = "Manejo de " + lista(top.map(h => h.nombre + (h.nivel === "avanzado" ? " avanzado" : "")));
      add("herr", `Manejas ${lista(top.map(h => h.nombre + (h.nivel ? " (" + h.nivel + ")" : "")))} y no lo dices en tu pitch. Para muchos cargos es justo lo que buscan.`,
        [{ k: "comp", v: comp, lbl: "Agregar a competencias" }, { k: "aporte", v: "mi manejo de " + lista(top.map(h => h.nombre)), lbl: "Agregar a lo que aportas" }]); }
    const idi = cv.idiomas.filter(i => !hay.includes(norm(i.nombre).slice(0, 5)) && (!i.nivel || !/b[aá]sico|a[12]/i.test(i.nivel)));
    if (idi.length) add("idioma", `Tu CV dice ${lista(idi.map(i => i.nombre.toLowerCase() + (i.nivel ? " " + i.nivel : "")))} y tu pitch no lo menciona.`,
      [{ k: "aporte", v: "mi " + lista(idi.map(i => i.nombre.toLowerCase() + (i.nivel ? " " + i.nivel : ""))), lbl: "Agregar a lo que aportas" }]);
    cv.cifras.filter(c => !enCV(hay, c)).slice(0, 2).forEach((c, i) => {
      const acc = [{ k: "logro", v: c, lbl: "Guardarlo en mis logros" }];
      if (!t(P.momento)) acc.unshift({ k: "momento", v: frag(c), lbl: "Usarlo como momento concreto" });
      add("cifra" + i, `Tienes un resultado con números que no aprovechas: «${c}».`, acc);
    });
    // El pitch resume la experiencia por rubro y área: basta con que una palabra del cargo ya esté para darlo por cubierto.
    const GEN = /^(asistente|ayudante|apoyo|encargad[oa]|practica|practicante|analista|trabajador[a]?|part|time|empresa)$/;
    cv.cargos.filter(c => !norm(c).split(/[^a-z0-9ñ]+/).some(w => w.length >= 4 && !GEN.test(w) && hay.includes(w.length >= 7 ? w.slice(0, 5) : w))).slice(0, 2).forEach((c, i) => add("cargo" + i, `Tu CV menciona «${c}» y no aparece en tu experiencia del pitch.`, [{ k: "exp", v: c, lbl: "Revisar mi experiencia" }]));
    if (!t(P.enfasis) && cv.cursos.length) add("curso", `Tienes cursos o certificaciones (${cv.cursos.slice(0, 2).map(x => "«" + x.slice(0, 50) + "»").join(", ")}) que pueden ir en «formación en…».`,
      [{ k: "enfasis", v: cursoCorto(cv.cursos[0]), lbl: "Usar el primero" }]);
    return out;
  }
  function cursoCorto(c) { return frag(t(c).replace(/\(?\b(19|20)\d\d\b\)?/g, "").replace(/^(curso|certificaci[oó]n|certificado|diplomado)( de| en)?\s+/i, "").replace(/[–—|-].*$/, "")); }
  /* Aplica una sugerencia al pitch (o a los logros). Devuelve qué cambió. */
  function aplicar(acc, pitch, perfil) {
    const v = t(acc.v);
    if (acc.k === "comp") { pitch.comps = pitch.comps || []; if (pitch.comps.some(c => norm(c) === norm(v))) return "comps";
      // Herramientas: si ya hay un «Manejo de …», se suman ahí para no repetir «manejo de» dos veces en el guion.
      const i = /^manejo de /i.test(v) ? pitch.comps.findIndex(c => /^manejo de /i.test(t(c))) : -1;
      if (i >= 0) { const ya = t(pitch.comps[i]).replace(/^manejo de /i, "").split(/,\s*|\s+y\s+/).map(t).filter(Boolean),
          nu = v.replace(/^manejo de /i, "").split(/,\s*|\s+y\s+/).map(t).filter(x => x && !ya.some(y => norm(y) === norm(x)));
        pitch.comps[i] = "Manejo de " + lista(ya.concat(nu)); }
      else pitch.comps.push(v); return "comps"; }
    if (acc.k === "aporte") { pitch.aporte = t(pitch.aporte) ? t(pitch.aporte) + " y " + v : v; return "aporte"; }
    if (acc.k === "momento") { pitch.momento = v; return "momento"; }
    if (acc.k === "enfasis") { pitch.enfasis = t(pitch.enfasis) ? t(pitch.enfasis) + ", " + v : v; return "enfasis"; }
    if (acc.k === "logro") { perfil.logros = perfil.logros || []; perfil.logros.push({ m: "", a: cap(v.replace(/[.;]+$/, "")), r: "", comps: [] }); return "logro"; }
    return acc.k;
  }

  /* ---------- 5. Bloques para copiar al CV ---------- */
  function bloques(perfil, pitch) {
    const P = perfil || {}, p = pitch || {}, out = {};
    const comps = (P.clave || []).map(id => EN.COMP_IDX[id] && EN.COMP_IDX[id].nombre).filter(Boolean)
      .concat((p.comps || []).map(t)).filter((c, i, a) => c && a.findIndex(x => norm(x) === norm(c)) === i).slice(0, 6);
    const rubros = (p.exp || []).map(e => e && frag(e.rubro)).filter(Boolean);
    out.fortalezas = comps.slice(0, 3);
    if (t(p.carrera)) out.perfil = [cap(EN.carreraFrase(p.carrera, p.etapa)) + (t(p.inst) ? " en " + EN.institucion(t(p.inst)) : "") + (t(p.etapa) ? ", " + frag(p.etapa) : "") + (rubros.length ? ", con experiencia en " + lista(rubros) : "") + ".",
      comps.length ? `Entre mis fortalezas están ${lista(comps.slice(0, 3).map(c => EN.conArticulo(c)))}.` : "",
      t(p.busco) ? `Busco ${frag(p.busco)}${t(p.aporte) ? ", donde pueda aportar " + frag(p.aporte) : ""}.` : ""].filter(Boolean).join(" ");
    out.competencias = comps;
    out.logros = (P.logros || []).map(l => EN.fraseLogro(l)).filter(Boolean);
    return out;
  }

  const API = { unir, textoPitch, secciones, tipoSeccion, extraer, revisar, compararPitch, aplicar, bloques, enCV, norm, HERRAMIENTAS };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.AuraCV = API;
})(typeof window !== "undefined" ? window : globalThis);
