/* Aura · Pitch y video currículum (motor)
   Arma el relato con la secuencia pasado → presente/transición → futuro en 7 partes:
   saludo, formación, experiencia (síntesis), competencias, transición, futuro y cierre.
   Funciones puras: se usan en la app (window.AuraPitch) y en Node para las pruebas.
   Los textos son propios; la estructura es un método general de relato profesional. */
(function (root) {
  "use strict";
  const PPM = 130;

  /* Tres usos del mismo relato: cambia la duración meta y el cierre. */
  const TIPOS = {
    video: { nombre: "Video currículum", secs: 90, desc: "Lo grabas y lo envías a una empresa. Termina invitando a una entrevista." },
    presentacion: { nombre: "«Cuéntame de ti»", secs: 120, desc: "La presentación de 2 minutos que te piden al empezar una entrevista." },
    contacto: { nombre: "Reunión de contacto", secs: 60, desc: "Para conversar con alguien que te puede orientar o recomendar. Termina pidiendo consejo." }
  };
  const SUG_COMP = ["Planificación y organización", "Trabajo en equipo", "Comunicación", "Orientación al cliente", "Resolución de problemas",
    "Análisis de datos", "Responsabilidad", "Adaptabilidad", "Iniciativa", "Liderazgo", "Atención al detalle", "Aprendizaje rápido",
    "Manejo de la presión", "Negociación", "Creatividad", "Anticipar problemas"];
  /* Opciones para tocar en los campos del pitch. */
  const OPC = {
    etapa: ["en primer año", "a mitad de la carrera", "en el penúltimo año de la carrera", "en el último año de la carrera"],
    rubro: ["retail", "el comercio", "la gastronomía", "una empresa de logística", "atención al cliente", "la universidad, como ayudante"],
    que: ["en atención al público y ventas", "en bodega y control de inventario", "en reparto y logística", "en caja y cuadratura", "en reposición de productos", "en apoyo administrativo", "apoyando a estudiantes de cursos menores"],
    motivo: ["me motiva entender por qué algo falla y mejorarlo", "me gusta trabajar con personas y resolver sus problemas", "me interesa usar datos para tomar mejores decisiones", "disfruto organizar y que las cosas funcionen", "me motiva aprender rápido en lugares exigentes", "me gusta crear cosas nuevas y emprender"],
    bTipo: ["realizar mi práctica profesional", "encontrar mi primer empleo", "un trabajo part-time"],
    bArea: ["logística y operaciones", "finanzas", "marketing", "recursos humanos", "tecnología", "ventas y atención a clientes", "proyectos de ingeniería"],
    aporte: ["mi experiencia en atención a clientes", "mi capacidad de organizar y planificar", "mi manejo de datos y Excel", "mis ganas de aprender rápido", "mi experiencia en la operación"]
  };
  const NUM = ["", "una", "dos", "tres", "cuatro", "cinco", "seis"];

  function t(s) { return String(s || "").replace(/\s+/g, " ").trim(); }
  /* Quita el punto final y la mayúscula inicial para encajar una respuesta dentro de una oración. */
  function frag(s) { s = t(s).replace(/[.;,\s]+$/, ""); return s && /^(?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ]|[AYOE] [a-záéíóúñ])/.test(s) ? s[0].toLowerCase() + s.slice(1) : s; }
  function cap(s) { s = t(s); return s ? s[0].toUpperCase() + s.slice(1) : s; }
  function lista(xs) { xs = xs.filter(Boolean); return xs.length <= 1 ? (xs[0] || "") : xs.slice(0, -1).join(", ") + " y " + xs[xs.length - 1]; }
  function words(s) { return t(s) ? t(s).split(" ").length : 0; }

  /* Cada parte del relato por separado: así la app muestra la frase de cada paso mientras se escribe. */
  function partes(p) {
    p = p || {};
    const exp = (p.exp || []).filter(e => e && (t(e.rubro) || t(e.que)));
    const comps = (p.comps || []).map(t).filter(Boolean);
    const o = {};
    o.saludo = t(p.nombre) ? `${t(p.saludo) || "Buenos días"}. Mi nombre es ${t(p.nombre)}${p.tipo === "video" ? ", y es un gusto presentarme" : ""}.` : "";
    o.formacion = t(p.carrera) ? `Soy ${frag(p.carrera)}${t(p.inst) ? " en " + frag(p.inst) : ""}${t(p.etapa) ? ", " + frag(p.etapa) : ""}${t(p.enfasis) ? ", con formación en " + frag(p.enfasis) : ""}.` : "";
    const VERBO = ["me he desempeñado", "trabajé", "sumé experiencia"];
    o.experiencia = exp.length ? (exp.length > 1 ? "He trabajado en distintos rubros. " : "") + exp.map((e, i) => t(e.rubro)
      ? `En ${frag(e.rubro)} ${VERBO[i % 3]} ${frag(e.que) || "en distintas funciones"}.` : cap(frag(e.que)) + ".").join(" ") : "";
    o.competencias = comps.length ? `En ese camino he desarrollado ${NUM[comps.length] || comps.length} ${comps.length === 1 ? "competencia que me define" : "competencias que me definen"}: ${lista(comps.map(c => frag(c)))}.` : "";
    o.transicion = t(p.motivo) ? `Esa experiencia me mostró algo que hoy guía mi carrera: ${frag(p.motivo)}.${t(p.momento) ? " Lo viví cuando " + frag(p.momento) + "." : ""}` : "";
    o.futuro = t(p.busco) ? `Hoy me interesa ${frag(p.busco)}${t(p.aporte) ? ", donde pueda aportar " + frag(p.aporte) : ""}.` : "";
    o.cierre = p.tipo === "contacto" ? "Ese es mi plan. ¿Qué opinas? ¿Qué consejo me darías para lograrlo?"
      : p.tipo === "presentacion" ? "Por eso esta oportunidad calza con lo que busco, y me encantaría contarles más. Muchas gracias."
      : "Si consideran que cumplo con lo que buscan en un candidato, estoy disponible para una entrevista. Les dejo mis datos de contacto a continuación. Muchas gracias por su tiempo.";
    return o;
  }
  /* El guion en 4 párrafos (el teleprompter separa por líneas en blanco). */
  function guion(p) {
    const o = partes(p);
    return [[o.saludo, o.formacion], [o.experiencia, o.competencias], [o.transicion, o.futuro], [o.cierre]]
      .map(x => x.filter(Boolean).join(" ")).filter(Boolean).join("\n\n");
  }
  function segundos(texto) { return Math.round(words(texto) / PPM * 60); }

  /* Revisiones: las reglas del método, escritas como consejos concretos. */
  function revisar(p, texto) {
    p = p || {}; const out = [], tipo = TIPOS[p.tipo] || TIPOS.video, s = segundos(texto);
    const comps = (p.comps || []).filter(c => t(c));
    if (!t(p.nombre)) out.push({ k: "saludo", nivel: "no", txt: "Falta tu nombre en el saludo." });
    if (!t(p.carrera)) out.push({ k: "formacion", nivel: "no", txt: "Falta qué estudias o estudiaste." });
    if (comps.length < 3) out.push({ k: "competencias", nivel: "mid", txt: `Nombra entre 3 y 5 competencias (llevas ${comps.length}).` });
    if (comps.length > 5) out.push({ k: "competencias", nivel: "mid", txt: `Son ${comps.length} competencias: con 3 a 5 se recuerdan mejor.` });
    const expTxt = (p.exp || []).map(e => t(e && e.que)).join(" ");
    if (/\d|%|logr[éeó]|aument|reduj/i.test(expTxt)) out.push({ k: "experiencia", nivel: "mid", txt: "En la experiencia va solo la síntesis (rubros y áreas). Los logros con cifras guárdalos para la transición o para la entrevista." });
    if (!t(p.motivo)) out.push({ k: "transicion", nivel: "mid", txt: "Falta la transición: qué te mostró tu experiencia o qué te motiva. Es lo que une tu pasado con lo que buscas." });
    else if (!t(p.momento)) out.push({ k: "transicion", nivel: "tip", txt: "Un momento concreto (algo que hiciste) hace creíble tu motivación." });
    if (!t(p.busco)) out.push({ k: "futuro", nivel: "no", txt: "Falta qué buscas: el oyente tiene que saber cómo ayudarte." });
    if (s > tipo.secs * 1.15) out.push({ k: "largo", nivel: "mid", txt: `Dura cerca de ${Math.round(s)} s y la meta es ${tipo.secs} s. Acorta la experiencia o las competencias.` });
    if (s < tipo.secs * 0.8 && t(p.busco)) out.push({ k: "corto", nivel: "tip", txt: `Dura cerca de ${Math.round(s)} s: tienes espacio para agregar un momento concreto o una competencia.` });
    return out;
  }

  const API = { OPC, PPM, TIPOS, SUG_COMP, partes, guion, segundos, revisar, words };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.AuraPitch = API;
})(typeof window !== "undefined" ? window : globalThis);
