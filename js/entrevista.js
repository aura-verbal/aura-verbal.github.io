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
  const frag = s => { s = t(s).replace(/[.;,\s]+$/, ""); return s && /^(?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ]|[AYOE] [a-záéíóúñ])/.test(s) ? s[0].toLowerCase() + s.slice(1) : s; };
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
  /* Verbo en pasado al inicio: regulares (-é, -í) e irregulares frecuentes (propuse, reduje, hice…). */
  const VERBO_RE = /^(?:[A-ZÁÉÍÓÚa-záéíóúñ]+(?:é|í)|(?:pro|dis|com|im|su)?puse|(?:re|con|pro|intro|tra)duje|(?:ob|man|con|de|re)?tuve|hice|rehice|dije|traje|estuve|anduve|supe|quise|pude|vine|fui|di|vi)(?=[\s,.;]|$)/i;
  function fraseLogro(l) {
    if (!l) return ""; const a = t(l.a).replace(/[.;,\s]+$/, ""), r = frag(l.r).replace(/^que ([A-ZÁÉÍÓÚÑ])(?=[a-záéíóúñ])/, (m, c) => "que " + c.toLowerCase());
    if (!a) return "";
    // «…, logrando que…» solo si el resultado no empieza con un verbo en pasado («conseguí…» → «…, y conseguí…»).
    const union = /^(logr|consigu|conseg|obten|obtuv)/i.test(r) && !VERBO_RE.test(r) ? ", " : VERBO_RE.test(r) ? ", y " : ", logrando ";
    return cap(a) + (r ? union + r : "") + ".";
  }
  /* «ingeniería civil industrial» es el nombre de la carrera: la persona es «estudiante de…» (o «egresado de…»). */
  const CARRERA_NOMBRE = /^(ingenier[ií]a|t[eé]cnico en|t[eé]cnica en|licenciatura|pedagog[ií]a|administraci[oó]n|contabilidad|contador[ae]? auditor|derecho|medicina|psicolog[ií]a|enfermer[ií]a|arquitectura|dise[ñn]o|periodismo|kinesiolog[ií]a|nutrici[oó]n|odontolog[ií]a|trabajo social|publicidad|econom[ií]a|agronom[ií]a|bachillerato|programa de)/i;
  /* Nombres propios escritos en minúscula: «ingenieria civil industrial» → «Ingeniería Civil Industrial»,
     «universidad mayor» → «la Universidad Mayor». Solo se toca si todo venía en minúscula. */
  const TILDES = { ingenieria: "ingeniería", tecnico: "técnico", tecnica: "técnica", administracion: "administración", psicologia: "psicología", economia: "economía",
    pedagogia: "pedagogía", enfermeria: "enfermería", kinesiologia: "kinesiología", nutricion: "nutrición", odontologia: "odontología", informatica: "informática",
    mecanica: "mecánica", electrica: "eléctrica", electronica: "electrónica", quimica: "química", logistica: "logística", gestion: "gestión", comunicacion: "comunicación",
    construccion: "construcción", agronomia: "agronomía", biologia: "biología", matematica: "matemática", fisica: "física", catolica: "católica", tecnologica: "tecnológica" };
  const MENORES = /^(de|del|la|el|las|los|y|en|e)$/;
  function nombrePropio(s) {
    s = t(s); if (!s || s !== s.toLowerCase()) return s;
    return s.split(" ").map((w, i) => { w = TILDES[w] || w; return i && MENORES.test(w) ? w : w[0].toUpperCase() + w.slice(1); }).join(" ");
  }
  function institucion(s) {
    s = nombrePropio(s); return /^(universidad|pontificia|instituto|centro|escuela|academia)\b/i.test(s) ? "la " + s : s;
  }
  function carreraFrase(carrera, etapa) {
    const c = frag(carrera); if (!c || !CARRERA_NOMBRE.test(c)) return c;
    return (/egres|titul|licenciad/i.test(t(etapa)) ? "egresado de " : "estudiante de ") + nombrePropio(c).replace(/^([a-záéíóúñ])/, m => m.toUpperCase());
  }
  function revisarLogro(l) {
    const out = [];
    if (!t(l.m)) out.push("Falta el momento: ¿cuál era el problema o desafío?");
    if (!t(l.a)) out.push("Falta la acción: ¿qué hiciste tú?");
    else if (!VERBO_RE.test(t(l.a))) out.push("Empieza la acción con un verbo en pasado («Organicé…», «Reduje…»): suena más concreto.");
    if (!t(l.r)) out.push("Falta el resultado: ¿qué cambió gracias a lo que hiciste?");
    else if (/__/.test(l.r)) out.push("Completa los números del resultado (donde dice __).");
    else if (!/\d/.test(l.r) && !/__/.test(l.r)) out.push("¿Puedes ponerle un número al resultado? (%, minutos, plata, personas, clientes)");
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
        t(l.r) ? `Como resultado, ${/^que\b/i.test(frag(l.r)) ? "logré " : ""}${frag(l.r)}.` : "", (l.comps || []).length ? `Ahí puse en práctica ${lista(l.comps.map(x => frag(x)))}.` : ""].filter(Boolean).join(" ");
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

  /* ---------- 6. Opciones para tocar (para no tener que escribir desde cero) ----------
     Cada debilidad pertenece a un tema; cada tema trae situaciones típicas, acciones y avances
     redactados para encajar en «Lo noté cuando…», «Para mejorarlo, …» y «Hoy …». Son ideas para
     gatillar el recuerdo: el usuario elige la que se parezca a algo que de verdad le pasó. */
  const TEMAS = {
    impaciencia: { ej: ["un trámite se demoraba y terminé presionando más de la cuenta a un compañero", "en un trabajo en grupo quise avanzar antes de que todos estuvieran listos", "esperaba una respuesta de mi jefe o de un profesor y me frustré en vez de avanzar en otra cosa", "un proceso nuevo era lento y me costó tener paciencia para aprenderlo"],
      acc: ["avanzo en otra tarea mientras espero lo que no depende de mí", "acuerdo plazos claros al inicio para no estar presionando", "reviso los tiempos reales antes de reclamar", "anoto lo que me frustra y lo converso en el momento adecuado"],
      av: ["manejo mejor los tiempos de espera", "mis compañeros me ven más tranquilo cuando algo se atrasa", "aprovecho esos tiempos para adelantar otras tareas"] },
    comunicar: { ej: ["le di una opinión muy directa a un compañero y se sintió mal", "corregí el trabajo de mi grupo sin explicar por qué y se generó tensión", "le exigí a un compañero mi mismo ritmo y se desmotivó", "un jefe o un profesor me comentó que mi tono podía sonar duro"],
      acc: ["antes de criticar, parto por lo que está bien y luego propongo mejoras", "pregunto cómo lo ve la otra persona antes de dar mi opinión", "cuido el tono y explico el porqué de cada comentario", "le pido a alguien de confianza que me diga cómo comunico"],
      av: ["mis comentarios se reciben mejor y el equipo me consulta más", "doy feedback con más tacto sin dejar de ser claro", "ajusto lo que espero según lo que cada persona puede aportar"] },
    delegar: { ej: ["en un trabajo en grupo terminé haciendo casi todo para que quedara bien", "acumulé tareas en el trabajo por no pedir ayuda a tiempo", "me quedé hasta tarde resolviendo algo que un compañero podía hacer", "me atrasé en una entrega por querer hacerlo todo yo"],
      acc: ["reparto las tareas al inicio según lo que cada uno hace mejor", "pido ayuda apenas veo que no voy a alcanzar", "confío en el trabajo de otros y reviso solo lo importante", "uso una lista de tareas compartida para que todos sepan qué hace cada uno"],
      av: ["los trabajos en grupo salen más equilibrados", "llego con menos carga a las entregas", "el equipo participa más y aprendo de lo que hacen otros"] },
    rapido: { ej: ["elegí una solución rápida en el trabajo y después tuve que corregirla", "respondí un correo importante sin revisar todos los antecedentes", "pedí materiales sin comparar opciones y salió más caro", "contesté rápido en una prueba y me equivoqué en algo que sabía"],
      acc: ["me tomo unos minutos para revisar los datos clave antes de decidir algo importante", "uso una lista corta de preguntas antes de decidir", "consulto a alguien con más experiencia cuando la decisión tiene impacto", "separo las decisiones urgentes de las importantes"],
      av: ["me equivoco menos en las decisiones importantes", "sigo siendo rápido, pero con menos correcciones después"] },
    rutina: { ej: ["tenía tareas repetitivas en el trabajo y me costó mantener la concentración", "me salté un paso de un procedimiento porque me parecía innecesario", "se me pasaron errores de detalle en un informe largo", "me costó seguir un formato muy estricto en un trabajo de la universidad"],
      acc: ["divido las tareas repetitivas en bloques cortos con pausas", "uso una lista de verificación para no saltarme pasos", "reviso mi trabajo con calma antes de entregarlo", "pregunto el porqué de cada paso para entender su sentido"],
      av: ["cometo menos errores de detalle", "sigo los procedimientos sin que me cueste tanto"] },
    dispersion: { ej: ["empecé varias tareas al mismo tiempo y dejé una a medias", "me comprometí con más cosas de las que podía cumplir en una semana", "dejé de hacerle seguimiento a un pendiente y se atrasó", "tuve buenas ideas en un proyecto, pero no las terminé"],
      acc: ["uso una lista de prioridades y termino una tarea antes de empezar otra", "reviso mi calendario antes de comprometerme", "me pongo recordatorios para hacer seguimiento", "divido los proyectos en pasos con fecha"],
      av: ["cumplo lo que prometo con más frecuencia", "termino lo que empiezo"] },
    reconoc: { ej: ["hice un trabajo extra, nadie lo mencionó y me desmotivé", "otra persona se llevó el crédito de un trabajo en grupo", "no recibía comentarios en el trabajo y no sabía si lo estaba haciendo bien"],
      acc: ["pido feedback de forma directa en vez de esperarlo", "me pongo metas propias para medir mi avance", "comparto mis avances con mi jefe o con el equipo de forma natural"],
      av: ["me motivo con mis propias metas", "sé mejor cómo me ven, porque pregunto"] },
    hablar: { ej: ["me extendí en una presentación y me pasé del tiempo", "hablé más que los demás en una reunión y no dejé espacio a otras ideas", "di demasiados detalles al explicar algo y se perdió el mensaje"],
      acc: ["preparo la idea principal antes de hablar", "me pongo un límite de tiempo para cada intervención", "pregunto la opinión de otros antes de seguir"],
      av: ["mis intervenciones son más cortas y claras", "me ajusto mejor al tiempo en las presentaciones"] },
    decirno: { ej: ["acepté turnos extra la misma semana de mis pruebas", "dije que sí a una tarea que no me correspondía y me atrasé con lo mío", "ayudé a un compañero con su parte y no alcancé a terminar la mía"],
      acc: ["reviso mi carga antes de comprometerme", "ofrezco alternativas en vez de decir que sí a todo", "aviso con tiempo cuando no voy a alcanzar"],
      av: ["cumplo mejor con lo mío sin dejar de ayudar", "pongo límites sin que se vea mal"] },
    cambios: { ej: ["me cambiaron el horario o las funciones de un día para otro y me costó adaptarme", "llegó un sistema nuevo al trabajo y tardé en acostumbrarme", "un profesor cambió las reglas de un trabajo a mitad de semestre"],
      acc: ["busco entender el motivo del cambio para adaptarme más rápido", "me enfoco en lo que sí puedo controlar", "pido una explicación o una capacitación apenas hay un cambio"],
      av: ["me adapto más rápido a los cambios del día a día", "veo los cambios como una oportunidad de aprender"] },
    conflicto: { ej: ["no dije que no estaba de acuerdo con una decisión del grupo y después salió mal", "dejé pasar un problema con un compañero y se hizo más grande", "me guardé una idea en una reunión que después resultó útil", "me costó plantearle a mi jefe algo que me molestaba"],
      acc: ["digo mi opinión con respeto aunque sea distinta", "converso los problemas apenas aparecen", "preparo lo que quiero decir antes de una conversación difícil", "propongo mis ideas por escrito si me cuesta decirlas en el momento"],
      av: ["participo más en las reuniones", "los problemas se resuelven antes de crecer"] },
    perfeccion: { ej: ["revisé tantas veces un informe que lo entregué tarde", "me demoré en elegir entre dos opciones porque quería más información", "me tocó presentar sin preparación y me bloqueé", "retrasé la entrega de un trabajo en grupo por corregir detalles"],
      acc: ["me pongo un plazo máximo para cada tarea", "decido con la información que tengo cuando ya es suficiente", "distingo qué tareas necesitan perfección y cuáles no", "practico improvisar en situaciones de bajo riesgo"],
      av: ["entrego a tiempo sin perder calidad", "decido más rápido en las cosas del día a día"] },
    cercania: { ej: ["me costó integrarme al equipo las primeras semanas de mi primer trabajo", "me vieron distante al principio en un grupo nuevo de la universidad", "me costaba romper el hielo con clientes nuevos"],
      acc: ["me presento y le pregunto a los demás por su trabajo", "participo en las instancias informales del equipo", "practico iniciar conversaciones cortas"],
      av: ["me integro más rápido a los equipos nuevos", "los clientes me encuentran más cercano"] }
  };
  const DEB_TEMA = {
    "Me impaciento cuando las cosas van lentas": "impaciencia", "Puedo sonar brusco al comunicar": "comunicar", "Me cuesta delegar o pedir ayuda": "delegar",
    "A veces decido sin tener toda la información": "rapido", "Me cuesta seguir procesos muy rígidos": "rutina", "Puedo ser muy exigente con los demás": "comunicar",
    "Me disperso cuando tengo varias cosas a la vez": "dispersion", "Me cuesta el trabajo repetitivo o de detalle": "rutina", "A veces prometo más de lo que alcanzo": "dispersion",
    "Me afecta cuando no reconocen mi trabajo": "reconoc", "Hablo más de lo necesario": "hablar", "Me cuesta hacer seguimiento a lo que empiezo": "dispersion",
    "Me cuesta decir que no": "decirno", "Me incomodan los cambios bruscos": "cambios", "Evito los conflictos aunque sean necesarios": "conflicto",
    "Me cuesta dar mi opinión si no coincide con la del grupo": "conflicto", "Tardo en adaptarme a algo nuevo": "cambios", "Me cargo de trabajo por no pedir ayuda": "delegar",
    "Puedo ser perfeccionista y demorarme": "perfeccion", "Me cuesta decidir sin todos los datos": "perfeccion", "Puedo ser muy crítico": "comunicar",
    "Me cuesta mostrar cercanía al principio": "cercania", "Me incomoda improvisar": "perfeccion", "Comparto poco lo que pienso": "conflicto"
  };
  const COMP_TEMA = { delegar: "delegar", conflictos: "conflicto", tiempo: "dispersion", adapt: "cambios", detalle: "rutina", decidir: "rapido", escucha: "hablar", oral: "hablar", presion: "impaciencia" };
  /* Si la debilidad se escribió a mano, se busca el tema por palabras. */
  const PALABRAS_TEMA = [[/impacien|paciencia|lento/i, "impaciencia"], [/brusc|direct|crític|critic|exigent|tono/i, "comunicar"], [/delega|ayuda|cargo de trabajo/i, "delegar"],
    [/rápid|rapid|apur|sin pensar/i, "rapido"], [/rutina|repetit|detalle|procedimiento/i, "rutina"], [/dispers|seguimiento|prometo|organiz|desorden|procrastin/i, "dispersion"],
    [/reconoc/i, "reconoc"], [/hablo|habl/i, "hablar"], [/decir que no|decir no|límite/i, "decirno"], [/cambio|adapt/i, "cambios"], [/conflict|opini|reservad|tímid|timid/i, "conflicto"],
    [/perfecc|datos|improvis|decid/i, "perfeccion"], [/cercan|distant|integr/i, "cercania"]];
  function temaDebilidad(c) {
    c = c || {}; if (c.compId && COMP_TEMA[c.compId]) return COMP_TEMA[c.compId];
    if (c.compId) return null; const d = t(c.deb); if (DEB_TEMA[d]) return DEB_TEMA[d];
    const hit = PALABRAS_TEMA.find(([re]) => re.test(d)); return hit ? hit[1] : null;
  }
  function opcionesDebilidad(c) {
    const tema = temaDebilidad(c); if (tema) return TEMAS[tema];
    const comp = c && c.compId && COMP_IDX[c.compId];
    if (comp) { const x = conArticulo(comp.nombre);
      return { ej: [`me tocó encargarme de ${x} en un proyecto de la universidad y me costó más que a mis compañeros`, `una tarea del trabajo dependía de ${x} y necesité ayuda`, `un profesor o un jefe me hizo un comentario sobre ${x}`],
        acc: [`practico ${x} en los proyectos de la universidad, asumiendo esa parte a propósito`, "le pido feedback a alguien que lo hace bien", `estoy haciendo un curso o leyendo sobre ${x}`],
        av: ["me siento más seguro cuando me toca", "recibí mejores comentarios en mi último proyecto"] }; }
    return { ej: [], acc: ["le pido feedback a alguien de confianza", "me pongo una meta concreta para mejorar cada semana", "estoy haciendo un curso o leyendo sobre el tema"], av: ["noto avances en mi día a día"] };
  }
  /* Aporte de una fortaleza según su tipo (estilo, o grupo de la competencia). */
  const APORTE_FORT = {
    E: ["sacar adelante los proyectos aunque haya obstáculos", "tomar decisiones a tiempo cuando el equipo lo necesite", "cumplir las metas del área"],
    C: ["generar buena relación con clientes y compañeros", "comunicar con claridad las ideas del equipo", "proponer ideas nuevas para mejorar"],
    B: ["ser alguien confiable con quien el equipo pueda contar", "mantener un trabajo constante también bajo presión", "apoyar al equipo para que todos cumplan"],
    A: ["detectar errores antes de que se conviertan en problemas", "ordenar la información para tomar mejores decisiones", "asegurar la calidad de lo que entrega el área"]
  };
  const GRUPO_ESTILO = { "Contigo mismo": "B", "Con el trabajo": "A", "Con otros": "C", "Liderando": "E" };
  function opcionesFortaleza(c) {
    c = c || {}; let k = null;
    if (c.compId && COMP_IDX[c.compId]) k = GRUPO_ESTILO[COMP_IDX[c.compId].grupo];
    else Object.keys(ESTILOS).forEach(e => { if (ESTILOS[e].fort.includes(t(c.fort))) k = e; });
    return (k ? APORTE_FORT[k] : []).concat(k ? [] : APORTE_FORT.B.slice(0, 1).concat(APORTE_FORT.A.slice(0, 1), APORTE_FORT.C.slice(0, 1)));
  }
  const OPC = {
    atrae: ["forma a los profesionales que recién empiezan", "tiene un camino claro de crecimiento para quienes entran", "está creciendo e innovando en su rubro", "trabaja con equipos colaborativos", "quienes trabajan ahí hablan bien del ambiente", "su propósito coincide con lo que me importa"],
    aporteBase: ["mi experiencia en atención a clientes", "mis ganas de aprender rápido", "mi experiencia en la operación"],
    sit: ["un compañero de grupo no cumplía con su parte del trabajo", "un compañero y yo no estábamos de acuerdo en cómo hacer una tarea", "un cliente estaba molesto y me culpaba de un error", "mi jefe y yo teníamos prioridades distintas para el mismo día", "dos compañeros discutían y eso afectaba al equipo"],
    acc: ["conversar a solas con la persona para entender qué pasaba", "proponer repartir las tareas de nuevo, con plazos claros", "escuchar al cliente con calma y ofrecerle una solución concreta", "llevar datos para decidir con hechos y no con opiniones", "pedirle a alguien neutral que nos ayudara a ponernos de acuerdo"],
    res: ["entregamos el trabajo a tiempo", "llegamos a un acuerdo que funcionó para los dos", "el cliente se fue conforme", "la relación con mi compañero mejoró"],
    apr: ["es mejor hablar los problemas apenas aparecen", "los desacuerdos se resuelven mejor con datos que con opiniones", "escuchar primero baja la tensión", "poner reglas claras al inicio evita conflictos"],
    m: ["un proceso tomaba más tiempo del necesario", "había errores frecuentes en el inventario o en los registros", "teníamos un plazo muy apretado para entregar", "un cliente estaba molesto con el servicio", "el equipo estaba desordenado y se repetían tareas", "teníamos una meta de ventas difícil de alcanzar"],
    /* Acciones sugeridas para cada momento de OPC.m (mismo orden); empiezan con verbo en pasado. */
    accM: [["Ordené los pasos del proceso y eliminé los que no aportaban", "Propuse una planilla para registrar el avance y detectar las demoras"],
      ["Creé una planilla de control y revisé el inventario cada semana", "Organicé la bodega por categorías para encontrar los productos más rápido"],
      ["Dividí el trabajo en tareas con fecha y las repartí según lo que cada uno sabía hacer", "Coordiné reuniones cortas cada día para revisar el avance"],
      ["Escuché su reclamo con calma y le ofrecí una solución concreta en el momento", "Seguí el caso hasta que su problema quedó resuelto"],
      ["Armé una lista compartida con las tareas y los responsables", "Propuse funciones fijas para cada persona del equipo"],
      ["Aprendí bien los productos para recomendarlos según lo que buscaba cada cliente", "Propuse una promoción para los productos que menos se vendían"]],
    lejos: ["hasta 30 minutos", "hasta 1 hora", "hasta 1 hora y media", "no tengo problema con la distancia"],
    no: ["que no se valore el esfuerzo", "un mal ambiente de trabajo", "no tener posibilidades de aprender", "horarios que no me dejen estudiar", "que no haya orden ni procesos claros"],
    nota: ["me pasa solo a veces", "antes era así, pero ya lo mejoré", "en mi caso es al revés", "no me pasa en el trabajo, solo en otros ámbitos"],
    r: ["que el tiempo bajara de __ a __ minutos", "que los errores bajaran en un __%", "que entregáramos __ días antes del plazo", "que el cliente volviera a comprar", "que las ventas subieran un __%", "que atendiéramos a __ clientes más por día"]
  };
  function opcionesAccion(m) {
    const i = OPC.m.indexOf(t(m)); return i >= 0 ? OPC.accM[i] : OPC.accM.map(x => x[0]).slice(0, 4);
  }
  function opcionesAporte(perfil) {
    const cs = ((perfil && perfil.clave) || []).map(id => COMP_IDX[id] && conArticulo(COMP_IDX[id].nombre)).filter(Boolean);
    return cs.concat(OPC.aporteBase).slice(0, 6);
  }

  /* Palabras fijas de las plantillas: no cuentan como «ideas clave» al practicar. */
  const PLANTILLA = "una de mis principales fortalezas es que por ejemplo creo que eso me permitiría en este cargo algo que estoy trabajando lo noté cuando para mejorarlo hoy " +
    "me interesa el cargo de esta oportunidad porque además me atrae que y creo que puedo aportar un logro del que me siento orgulloso fue entonces como resultado ahí puse en práctica " +
    "una vez lo que hice fue al final de eso aprendí sí me gustaría saber logrando buenos días mi nombre es gusto presentarme soy he trabajado en distintos rubros competencias que me definen " +
    "esa experiencia me mostró algo que hoy guía mi carrera lo viví cuando donde pueda muchas gracias";
  const API = { carreraFrase, nombrePropio, institucion, VERBO_RE, TEMAS, temaDebilidad, opcionesDebilidad, opcionesAccion, opcionesFortaleza, opcionesAporte, OPC, PLANTILLA, PPM, words, segundos, ESTILOS, PREG_ESTILO, opcionesEstilo, puntajeEstilo, tarjetasEstilo, COMPETENCIAS, COMP_IDX, NIVEL_COMP, resumenCompetencias, conArticulo,
    MOTIVADORES, MOT_IDX, IDEAL, preguntasSugeridas, VERBOS, IDEAS_LOGRO, fraseLogro, revisarLogro, PREGUNTAS, ORDEN_PREG, respuesta, revisarRespuesta };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.AuraEnt = API;
})(typeof window !== "undefined" ? window : globalThis);
