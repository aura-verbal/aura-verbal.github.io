/* Aura · Entrevistas (motor)
   Autodiagnóstico propio (estilo de trabajo, competencias, motivadores, trabajo ideal), logros guiados
   y constructores de respuestas. Funciones puras: window.AuraEnt en la app y module.exports en Node.
   Todo el contenido es propio de Aura. Se inspira en ideas generales de orientación laboral
   (cuatro estilos de comportamiento, autoevaluación de competencias, logros con resultados medibles),
   no reproduce ítems, tablas ni textos de tests comerciales. No es un test psicológico validado:
   es una guía para reflexionar, y por eso el usuario confirma o descarta cada resultado. */
(function (root) {
  "use strict";
  const PPM = 130;
  const t = s => String(s || "").replace(/\s+/g, " ").trim();
  const frag = s => { s = t(s).replace(/[.;,\s]+$/, ""); return s && /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s; };
  const cap = s => { s = t(s); return s ? s[0].toUpperCase() + s.slice(1) : s; };
  const lista = xs => { xs = xs.filter(Boolean); return xs.length <= 1 ? (xs[0] || "") : xs.slice(0, -1).join(", ") + " y " + xs[xs.length - 1]; };
  const words = s => t(s) ? t(s).split(" ").length : 0;
  const segundos = s => Math.round(words(s) / PPM * 60);

  /* ---------- 1. Estilo de trabajo: 4 estilos, 12 situaciones, una opción por estilo ---------- */
  const ESTILOS = {
    E: { nombre: "Ejecutor", foco: "los resultados", desc: "Te mueven los desafíos y las metas. Decides rápido, vas al grano y te gusta tener el control de lo que haces.",
      fort: ["Tomo decisiones con rapidez", "Me orientan los resultados", "Asumo desafíos difíciles", "Soy directo al comunicar", "Trabajo con autonomía", "Persisto ante los obstáculos"],
      deb: ["Me impaciento cuando las cosas van lentas", "Puedo sonar brusco al comunicar", "Me cuesta delegar o pedir ayuda", "A veces decido sin tener toda la información", "Me cuesta seguir procesos muy rígidos", "Puedo ser muy exigente con los demás"] },
    C: { nombre: "Comunicador", foco: "las personas y las ideas", desc: "Te mueven la gente y las ideas nuevas. Contagias entusiasmo, conectas con facilidad y te gusta convencer.",
      fort: ["Me comunico con facilidad", "Genero buen ambiente en el equipo", "Propongo ideas nuevas", "Convenzo y motivo a otros", "Me adapto a personas muy distintas", "Hago contactos con facilidad"],
      deb: ["Me disperso cuando tengo varias cosas a la vez", "Me cuesta el trabajo repetitivo o de detalle", "A veces prometo más de lo que alcanzo", "Me afecta cuando no reconocen mi trabajo", "Hablo más de lo necesario", "Me cuesta hacer seguimiento a lo que empiezo"] },
    B: { nombre: "Colaborador", foco: "la armonía y la constancia", desc: "Te mueven el buen equipo y la estabilidad. Eres constante, sabes escuchar y la gente confía en ti.",
      fort: ["Soy constante y confiable", "Sé escuchar", "Trabajo bien en equipo", "Mantengo la calma bajo presión", "Soy leal con mi equipo", "Ayudo a otros sin que me lo pidan"],
      deb: ["Me cuesta decir que no", "Me incomodan los cambios bruscos", "Evito los conflictos aunque sean necesarios", "Me cuesta dar mi opinión si no coincide con la del grupo", "Tardo en adaptarme a algo nuevo", "Me cargo de trabajo por no pedir ayuda"] },
    A: { nombre: "Analítico", foco: "la calidad y la precisión", desc: "Te mueven hacer las cosas bien y entender a fondo. Eres cuidadoso, ordenado y te apoyas en datos.",
      fort: ["Soy preciso y cuidadoso", "Analizo antes de decidir", "Cumplo normas y estándares", "Organizo bien la información", "Detecto errores que otros no ven", "Planifico con detalle"],
      deb: ["Puedo ser perfeccionista y demorarme", "Me cuesta decidir sin todos los datos", "Puedo ser muy crítico", "Me cuesta mostrar cercanía al principio", "Me incomoda improvisar", "Comparto poco lo que pienso"] }
  };
  const PREG_ESTILO = [
    { q: "En un trabajo en grupo, lo más natural para ti es…", o: { E: "tomar el mando y repartir tareas", C: "animar al grupo y proponer ideas", B: "apoyar a los demás y mantener la buena onda", A: "revisar que todo quede correcto y ordenado" } },
    { q: "Cuando aparece un problema inesperado…", o: { E: "actúo rápido para resolverlo", C: "busco a alguien con quien conversarlo", B: "mantengo la calma y sigo paso a paso", A: "analizo la causa antes de hacer algo" } },
    { q: "Lo que más te molesta en un trabajo es…", o: { E: "que todo sea lento y nadie decida", C: "estar aislado, sin hablar con nadie", B: "los cambios bruscos y los conflictos", A: "el desorden y los errores evitables" } },
    { q: "Tus compañeros dirían que eres…", o: { E: "directo y decidido", C: "simpático y entusiasta", B: "paciente y leal", A: "cuidadoso y preciso" } },
    { q: "Cuando te dan una tarea nueva…", o: { E: "parto al tiro y voy ajustando", C: "pienso cómo hacerla más entretenida o distinta", B: "pregunto bien qué se espera y la hago con constancia", A: "leo todas las instrucciones y planifico cada paso" } },
    { q: "Te sientes mejor cuando…", o: { E: "logras una meta difícil", C: "reconocen tu trabajo frente a otros", B: "el equipo trabaja tranquilo y unido", A: "entregas algo impecable" } },
    { q: "En una discusión de trabajo…", o: { E: "defiendo mi punto con firmeza", C: "trato de convencer con entusiasmo", B: "busco que todos queden conformes", A: "me apoyo en datos y hechos" } },
    { q: "Bajo presión…", o: { E: "me pongo más exigente", C: "hablo más y busco apoyo", B: "trabajo más, pero me guardo el estrés", A: "me fijo todavía más en los detalles" } },
    { q: "Prefieres un jefe que…", o: { E: "te dé metas claras y libertad para lograrlas", C: "valore tus ideas y te motive", B: "te dé estabilidad y te apoye", A: "te dé instrucciones claras y estándares" } },
    { q: "Al tomar una decisión importante…", o: { E: "decido rápido, aunque me falte información", C: "me guío por mi intuición y por la gente", B: "lo pienso con calma y consulto", A: "reúno toda la información antes" } },
    { q: "Lo que más disfrutas de un trabajo es…", o: { E: "los desafíos y superar metas", C: "conocer gente y comunicar", B: "ayudar y sentir que perteneces", A: "hacer las cosas bien y aprender a fondo" } },
    { q: "Algo que podrían criticarte es que…", o: { E: "eres impaciente o brusco", C: "hablas mucho o te dispersas", B: "te cuesta decir que no", A: "eres muy detallista o te demoras" } }
  ];
  /* El orden de las opciones cambia de pregunta en pregunta, para que no se elija siempre «la primera». */
  function opcionesEstilo(i) { const k = ["E", "C", "B", "A"], r = i % 4; return k.slice(r).concat(k.slice(0, r)); }
  function puntajeEstilo(resp) {
    const s = { E: 0, C: 0, B: 0, A: 0 }; Object.values(resp || {}).forEach(v => { if (s[v] != null) s[v]++; });
    const orden = Object.keys(s).sort((a, b) => s[b] - s[a] || "ECBA".indexOf(a) - "ECBA".indexOf(b));
    return { s, principal: orden[0], secundario: s[orden[1]] > 0 ? orden[1] : null, orden };
  }
  /* Tarjetas para confirmar: las del estilo principal completas y algunas del secundario. */
  function tarjetasEstilo(pt) {
    const out = [], add = (k, tipo, n) => ESTILOS[k][tipo].slice(0, n).forEach((txt, i) => out.push({ id: k + "-" + tipo + i, tipo, txt, estilo: k }));
    add(pt.principal, "fort", 6); if (pt.secundario) add(pt.secundario, "fort", 3);
    add(pt.principal, "deb", 6); if (pt.secundario) add(pt.secundario, "deb", 2);
    return out;
  }

  /* ---------- 2. Competencias: 24 en 4 grupos, autoevaluación de 1 a 4 ---------- */
  const COMPETENCIAS = [
    { g: "Contigo mismo", items: [["resp", "Responsabilidad", "Cumplo lo que me comprometo, a tiempo"], ["presion", "Manejo de la presión", "Mantengo la calma y el rendimiento con apuro o problemas"], ["adapt", "Adaptabilidad", "Me ajusto rápido a cambios de planes o de tareas"], ["inic", "Iniciativa", "Actúo sin esperar a que me digan qué hacer"], ["tiempo", "Organización del tiempo", "Priorizo y uso bien mi tiempo"], ["aprend", "Aprendizaje continuo", "Busco aprender cosas nuevas por mi cuenta"]] },
    { g: "Con el trabajo", items: [["problemas", "Resolución de problemas", "Encuentro soluciones con lo que tengo a mano"], ["datos", "Análisis de datos", "Ordeno e interpreto información para decidir"], ["detalle", "Atención al detalle", "Trabajo con cuidado y pocos errores"], ["plan", "Planificación y organización", "Ordeno tareas, recursos y plazos para cumplir una meta"], ["anticipar", "Anticipar problemas", "Veo antes que otros lo que puede fallar"], ["calidad", "Orientación a la calidad", "Me importa que el resultado quede bien hecho"]] },
    { g: "Con otros", items: [["oral", "Comunicación oral", "Explico mis ideas con claridad al hablar"], ["escrita", "Comunicación escrita", "Escribo de forma clara y correcta"], ["equipo", "Trabajo en equipo", "Colaboro para lograr metas en conjunto"], ["cliente", "Orientación al cliente", "Atiendo bien y busco que el cliente quede satisfecho"], ["negociar", "Negociación", "Busco acuerdos que sirvan a ambas partes"], ["escucha", "Escucha activa", "Escucho con atención antes de responder"]] },
    { g: "Liderando", items: [["lider", "Liderazgo", "Guío a otros hacia una meta"], ["decidir", "Toma de decisiones", "Decido a tiempo y con buen criterio"], ["conflictos", "Manejo de conflictos", "Ayudo a resolver desacuerdos entre personas"], ["motivar", "Motivar a otros", "Contagio energía y ganas al equipo"], ["delegar", "Delegar", "Reparto el trabajo según lo que cada uno sabe hacer"], ["recursos", "Gestión de recursos", "Uso bien el tiempo, la plata y los materiales"]] }
  ];
  const COMP_IDX = {}; COMPETENCIAS.forEach(g => g.items.forEach(([id, n, d]) => { COMP_IDX[id] = { id, nombre: n, desc: d, grupo: g.g }; }));
  const NIVEL_COMP = ["", "Me cuesta", "Normal", "Bien", "Es mi fuerte"];
  /* «la responsabilidad», «el trabajo en equipo», «delegar»: para usar una competencia dentro de una oración. */
  function conArticulo(nombre) {
    const n = t(nombre).toLowerCase(), w = n.split(" ")[0];
    if (/(ar|er|ir)$/.test(w)) return n;
    return (/^(manejo|aprendizaje|análisis|trabajo|liderazgo)$/.test(w) ? "el " : "la ") + n;
  }
  function resumenCompetencias(rat) {
    const xs = Object.entries(rat || {}).filter(([id]) => COMP_IDX[id]).map(([id, v]) => ({ ...COMP_IDX[id], v: +v }));
    return { altas: xs.filter(x => x.v >= 4).concat(xs.filter(x => x.v === 3)).slice(0, 8), bajas: xs.filter(x => x.v <= 1).concat(xs.filter(x => x.v === 2)).slice(0, 6), n: xs.length };
  }

  /* ---------- 3. Motivadores y trabajo ideal ---------- */
  const MOTIVADORES = [
    ["aprender", "Aprender cosas nuevas", "me permitiría seguir aprendiendo"], ["reconoc", "Que reconozcan mi trabajo", "valora el buen desempeño"],
    ["equipo", "Un buen equipo", "podría trabajar con un equipo del que aprender"], ["autonomia", "Autonomía", "tendría autonomía para proponer y hacer"],
    ["estabilidad", "Estabilidad", "me da la estabilidad para proyectarme"], ["sueldo", "Un buen sueldo", "ofrece condiciones que me permiten proyectarme"],
    ["crecer", "Crecer y ascender", "tiene un camino claro para crecer"], ["impacto", "Que mi trabajo sirva", "podría ver el impacto real de mi trabajo"],
    ["variedad", "Variedad de tareas", "tendría desafíos variados"], ["liderar", "Liderar personas", "me daría la oportunidad de liderar más adelante"]
  ];
  const MOT_IDX = {}; MOTIVADORES.forEach(([id, n, f]) => { MOT_IDX[id] = { id, nombre: n, frase: f }; });
  const IDEAL = {
    tam: { q: "Tamaño de empresa", ops: ["Grande", "Mediana", "Pequeña o startup", "Me da igual"] },
    jefe: { q: "Jefe ideal", ops: ["Que enseñe", "Que dé libertad", "Claro con las metas", "Cercano"] },
    amb: { q: "Ambiente", ops: ["Colaborativo", "Dinámico", "Tranquilo y ordenado", "Competitivo"] }
  };
  /* Preguntas para el entrevistador según lo que el usuario valora. */
  const PREG_ENTREV = {
    aprender: "¿Qué capacitación o formación tiene alguien que entra a este cargo?",
    reconoc: "¿Cómo se evalúa el desempeño y cada cuánto se conversa sobre eso?",
    equipo: "¿Cómo es el equipo con el que trabajaría día a día?",
    autonomia: "¿Qué decisiones toma por su cuenta alguien en este cargo?",
    estabilidad: "¿Cómo ha cambiado el área en el último año?",
    sueldo: "¿Cómo funciona la estructura de beneficios del cargo?",
    crecer: "¿Cómo ha sido el camino de las personas que antes tuvieron este cargo?",
    impacto: "¿Cómo se ve el aporte de este cargo en los resultados del área?",
    variedad: "¿Cómo es un día típico en este cargo?",
    liderar: "¿Qué oportunidades hay de liderar proyectos o personas?",
    "Que enseñe": "¿Cómo es la inducción y quién acompaña a las personas nuevas?",
    "Que dé libertad": "¿Cómo se organiza el trabajo: por metas o con tareas definidas?",
    "Claro con las metas": "¿Cuáles serían las metas de los primeros tres meses?",
    "Cercano": "¿Cada cuánto se reúne el equipo con su jefatura?"
  };
  function preguntasSugeridas(perfil) {
    const m = (perfil && perfil.motiv) || [], j = perfil && perfil.ideal && perfil.ideal.jefe;
    const out = m.map(id => PREG_ENTREV[id]).concat(j ? [PREG_ENTREV[j]] : []).concat(["¿Cuáles son los próximos pasos del proceso?"]);
    return out.filter((x, i) => x && out.indexOf(x) === i).slice(0, 5);
  }

  /* ---------- 4. Logros: Momento, Acción, Resultado, Competencias y una frase ---------- */
  const VERBOS = ["Organicé", "Mejoré", "Reduje", "Aumenté", "Resolví", "Coordiné", "Diseñé", "Implementé", "Lideré", "Propuse", "Analicé", "Negocié", "Capacité", "Simplifiqué", "Logré", "Creé", "Planifiqué", "Detecté", "Gestioné", "Optimicé"];
  const IDEAS_LOGRO = ["¿Mejoraste algo que funcionaba mal?", "¿Ahorraste tiempo, plata o materiales?", "¿Resolviste un problema con un cliente?", "¿Te dieron más responsabilidad por tu desempeño?",
    "¿Enseñaste a alguien o ayudaste a un compañero nuevo?", "¿Cumpliste una meta difícil o un plazo apretado?", "¿Detectaste un error a tiempo?", "¿Organizaste algo en la universidad, un voluntariado o un emprendimiento?"];
  function fraseLogro(l) {
    if (!l) return ""; const a = t(l.a).replace(/[.;,\s]+$/, ""), r = frag(l.r);
    if (!a) return ""; return cap(a) + (r ? (/^(logr|consigu|obten)/i.test(r) ? ", " : ", logrando ") + r : "") + ".";
  }
  function revisarLogro(l) {
    const out = [];
    if (!t(l.m)) out.push("Falta el momento: ¿cuál era el problema o desafío?");
    if (!t(l.a)) out.push("Falta la acción: ¿qué hiciste tú?");
    else if (!/^[A-ZÁÉÍÓÚa-záéíóúñ]+(é|í)(?=[\s,.;]|$)/.test(t(l.a))) out.push("Empieza la acción con un verbo en pasado («Organicé…», «Reduje…»): suena más concreto.");
    if (!t(l.r)) out.push("Falta el resultado: ¿qué cambió gracias a lo que hiciste?");
    else if (!/\d/.test(l.r)) out.push("¿Puedes ponerle un número al resultado? (%, minutos, plata, personas, clientes)");
    return out;
  }

  /* ---------- 5. Respuestas a las preguntas típicas ---------- */
  const PREGUNTAS = {
    cuentame: { q: "Cuéntame de ti.", desc: "Tu pitch de 2 minutos." },
    fortaleza: { q: "¿Cuál es tu principal fortaleza?", desc: "Una fortaleza con un ejemplo que la pruebe." },
    debilidad: { q: "¿Cuál es tu mayor debilidad?", desc: "Una debilidad real, un ejemplo y qué haces para mejorarla." },
    porque: { q: "¿Por qué quieres trabajar con nosotros?", desc: "Lo que te atrae del cargo y la empresa, conectado con lo que buscas." },
    logro: { q: "Cuéntame de un logro del que te sientas orgulloso.", desc: "Momento, acción, resultado y lo que pusiste en práctica." },
    conflicto: { q: "Cuéntame de una vez que tuviste un conflicto con alguien.", desc: "Qué pasó, qué hiciste, cómo terminó y qué aprendiste." },
    preguntas: { q: "¿Tienes alguna pregunta para nosotros?", desc: "2 o 3 preguntas que muestran interés de verdad." }
  };
  const ORDEN_PREG = ["cuentame", "fortaleza", "debilidad", "porque", "logro", "conflicto", "preguntas"];
  function respuesta(k, c, ctx) {
    c = c || {}; ctx = ctx || {};
    if (k === "fortaleza") {
      const l = ctx.logro, comp = c.compId && COMP_IDX[c.compId]; if (!t(c.fort) && !comp) return "";
      return `Una de mis principales fortalezas es ${comp ? conArticulo(comp.nombre) + ": " + frag(comp.desc) : "que " + frag(c.fort)}.${l ? " Por ejemplo, " + frag(fraseLogro(l)) : ""}${t(c.aporte) ? ` Creo que eso me permitiría ${frag(c.aporte)} en este cargo.` : ""}`.replace(/\.\./g, ".");
    }
    if (k === "debilidad") {
      const comp = c.compId && COMP_IDX[c.compId]; if (!t(c.deb) && !comp) return "";
      return [comp ? `Algo que estoy trabajando es ${conArticulo(comp.nombre)}.` : `Algo que estoy trabajando es que ${frag(c.deb)}.`, t(c.ejemplo) ? `Lo noté cuando ${frag(c.ejemplo)}.` : "",
        t(c.accion) ? `Para mejorarlo, ${frag(c.accion)}.` : "", t(c.avance) ? `Hoy ${frag(c.avance)}.` : ""].filter(Boolean).join(" ");
    }
    if (k === "porque") {
      const ms = (ctx.motiv || []).slice(0, 2).map(id => MOT_IDX[id] && MOT_IDX[id].frase).filter(Boolean);
      if (!t(c.cargo) && !t(c.empresa)) return "";
      return [`Me interesa ${t(c.cargo) ? "el cargo de " + frag(c.cargo) : "esta oportunidad"}${t(c.empresa) ? " en " + t(c.empresa) : ""} porque ${ms.length ? lista(ms) : "calza con lo que busco"}.`,
        t(c.atrae) ? `Además, me atrae que ${frag(c.atrae)}.` : "", t(c.aporte) ? `Y creo que puedo aportar ${frag(c.aporte)}.` : ""].filter(Boolean).join(" ");
    }
    if (k === "logro") {
      const l = ctx.logro; if (!l) return "";
      return [t(l.m) ? `Un logro del que me siento orgulloso fue cuando ${frag(l.m)}.` : "", t(l.a) ? `Entonces ${frag(l.a)}.` : "",
        t(l.r) ? `Como resultado, ${frag(l.r)}.` : "", (l.comps || []).length ? `Ahí puse en práctica ${lista(l.comps.map(x => frag(x)))}.` : ""].filter(Boolean).join(" ");
    }
    if (k === "conflicto") {
      if (!t(c.sit)) return "";
      return [`Una vez ${frag(c.sit)}.`, t(c.acc) ? `Lo que hice fue ${frag(c.acc)}.` : "", t(c.res) ? `Al final, ${frag(c.res)}.` : "", t(c.apr) ? `De eso aprendí que ${frag(c.apr)}.` : ""].filter(Boolean).join(" ");
    }
    if (k === "preguntas") { const ps = (c.sel || []).filter(Boolean); return ps.length ? "Sí, me gustaría saber: " + ps.join(" ") : ""; }
    return "";
  }
  function revisarRespuesta(k, c, texto) {
    c = c || {}; const out = [], s = segundos(texto);
    if (k === "debilidad") {
      if ((t(c.deb) || c.compId) && !t(c.accion)) out.push({ n: "no", txt: "Falta qué estás haciendo para mejorar. Es la parte que más mira el entrevistador." });
      if (/perfeccion/i.test(c.deb || "")) out.push({ n: "mid", txt: "«Perfeccionista» es la respuesta más usada. Si es tu caso, cuéntalo con un ejemplo concreto para que no suene a frase hecha." });
      if (t(c.deb) && !t(c.ejemplo)) out.push({ n: "tip", txt: "Un ejemplo real hace la respuesta creíble." });
    }
    if (k === "fortaleza" && (t(c.fort) || c.compId) && !c.logro) out.push({ n: "mid", txt: "Respalda tu fortaleza con un logro: sin ejemplo, es solo una opinión sobre ti." });
    if (k === "porque" && !t(c.atrae)) out.push({ n: "tip", txt: "Menciona algo concreto de la empresa: muestra que la investigaste." });
    if (k === "conflicto" && t(c.sit) && !t(c.apr)) out.push({ n: "tip", txt: "Cierra con lo que aprendiste: es lo que más cuenta en esta pregunta." });
    if (k !== "preguntas" && texto && s > 90) out.push({ n: "mid", txt: `Dura cerca de ${s} s. Para una respuesta de entrevista, apunta a 30–75 segundos.` });
    return out;
  }

  /* Palabras fijas de las plantillas: no cuentan como «ideas clave» al practicar. */
  const PLANTILLA = "una de mis principales fortalezas es que por ejemplo creo que eso me permitiría en este cargo algo que estoy trabajando lo noté cuando para mejorarlo hoy " +
    "me interesa el cargo de esta oportunidad porque además me atrae que y creo que puedo aportar un logro del que me siento orgulloso fue entonces como resultado ahí puse en práctica " +
    "una vez lo que hice fue al final de eso aprendí sí me gustaría saber logrando buenos días mi nombre es gusto presentarme soy he trabajado en distintos rubros competencias que me definen " +
    "esa experiencia me mostró algo que hoy guía mi carrera lo viví cuando donde pueda muchas gracias";
  const API = { PLANTILLA, PPM, words, segundos, ESTILOS, PREG_ESTILO, opcionesEstilo, puntajeEstilo, tarjetasEstilo, COMPETENCIAS, COMP_IDX, NIVEL_COMP, resumenCompetencias, conArticulo,
    MOTIVADORES, MOT_IDX, IDEAL, preguntasSugeridas, VERBOS, IDEAS_LOGRO, fraseLogro, revisarLogro, PREGUNTAS, ORDEN_PREG, respuesta, revisarRespuesta };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.AuraEnt = API;
})(typeof window !== "undefined" ? window : globalThis);
