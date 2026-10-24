// Aura · pruebas del motor de entrevistas (js/entrevista.js). Uso: node herramientas/pruebas_entrevista.js
const E = require("../js/entrevista.js");
let errors = 0; const err = (...a) => { errors++; console.log("ERR", ...a); };
// Estilo: 12 preguntas, 4 opciones cada una, orden rotado, puntaje y tarjetas
if (E.PREG_ESTILO.length !== 12) err("12 preguntas");
E.PREG_ESTILO.forEach((p, i) => { const o = E.opcionesEstilo(i); if (o.length !== 4 || ["E", "C", "B", "A"].some(k => !p.o[k] || !o.includes(k))) err("opciones", i); });
if (new Set(E.PREG_ESTILO.map((_, i) => E.opcionesEstilo(i)[0])).size < 4) err("rotación de opciones");
const resp = {}; for (let i = 0; i < 12; i++) resp[i] = i < 7 ? "A" : i < 10 ? "E" : "B";
const pt = E.puntajeEstilo(resp);
if (pt.principal !== "A" || pt.secundario !== "E" || pt.s.A !== 7) err("puntaje", JSON.stringify(pt));
const tj = E.tarjetasEstilo(pt);
if (tj.filter(x => x.tipo === "fort").length !== 9 || tj.filter(x => x.tipo === "deb").length !== 8) err("tarjetas", tj.length);
if (new Set(tj.map(x => x.id)).size !== tj.length) err("ids de tarjetas repetidos");
Object.values(E.ESTILOS).forEach(s => { if (s.fort.length < 6 || s.deb.length < 6) err("estilo incompleto", s.nombre); });
// Competencias
if (Object.keys(E.COMP_IDX).length !== 24) err("24 competencias");
const rc = E.resumenCompetencias({ resp: 4, datos: 4, equipo: 3, negociar: 1, delegar: 2, nada: 4 });
if (rc.altas[0].id !== "resp" || rc.altas.length !== 3 || rc.bajas[0].id !== "negociar" || rc.n !== 5) err("resumen competencias", JSON.stringify(rc));
if (E.conArticulo("Trabajo en equipo") !== "el trabajo en equipo" || E.conArticulo("Delegar") !== "delegar" || E.conArticulo("Negociación") !== "la negociación") err("artículos");
// Logros
const l = { m: "La ruta de despacho no alcanzaba a cubrir a todos los clientes.", a: "Rediseñé la ruta según las zonas.", r: "el 100% de los clientes recibió a tiempo", comps: ["Planificación y organización"] };
if (E.fraseLogro(l) !== "Rediseñé la ruta según las zonas, logrando el 100% de los clientes recibió a tiempo." && E.fraseLogro(l) !== "Rediseñé la ruta según las zonas, logrando que el 100% de los clientes recibió a tiempo.") {
  if (!/^Rediseñé la ruta según las zonas, logrando /.test(E.fraseLogro(l))) err("frase de logro", E.fraseLogro(l)); }
if (E.revisarLogro(l).length) err("logro completo con avisos", E.revisarLogro(l));
const rl = E.revisarLogro({ a: "hacer la ruta", r: "mejoró" }); if (rl.length !== 3) err("avisos de logro", rl);
// Respuestas
const f = E.respuesta("fortaleza", { compId: "plan", aporte: "ordenar la operación desde el primer día" }, { logro: l });
if (!/^Una de mis principales fortalezas es la planificación y organización: ordeno tareas/.test(f) || !/Por ejemplo, rediseñé la ruta/.test(f) || /\.\./.test(f)) err("fortaleza", f);
const f2 = E.respuesta("fortaleza", { fort: "Soy constante y confiable" }, {}); if (f2 !== "Una de mis principales fortalezas es que soy constante y confiable.") err("fortaleza frase", f2);
const d = E.respuesta("debilidad", { deb: "Me cuesta decir que no", ejemplo: "acepté tres turnos extra la misma semana", accion: "ahora reviso mi carga antes de comprometerme", avance: "aviso con tiempo cuando no alcanzo" });
if (d !== "Algo que estoy trabajando es que me cuesta decir que no. Lo noté cuando acepté tres turnos extra la misma semana. Para mejorarlo, ahora reviso mi carga antes de comprometerme. Hoy aviso con tiempo cuando no alcanzo.") err("debilidad", d);
if (!E.revisarRespuesta("debilidad", { deb: "Soy perfeccionista" }, "x").some(r => r.n === "no")) err("debilidad sin acción");
if (!E.revisarRespuesta("debilidad", { deb: "Soy perfeccionista", accion: "x" }, "x").some(r => /más usada/.test(r.txt))) err("aviso perfeccionista");
const pq = E.respuesta("porque", { cargo: "analista de operaciones", empresa: "Ripley", atrae: "están invirtiendo en logística" }, { motiv: ["aprender", "crecer"] });
if (!/^Me interesa el cargo de analista de operaciones en Ripley porque me permitiría seguir aprendiendo y tiene un camino claro para crecer\. Además, me atrae que están invirtiendo/.test(pq)) err("por qué", pq);
const lg = E.respuesta("logro", {}, { logro: l }); if (!/Entonces rediseñé la ruta/.test(lg) || !/puse en práctica planificación y organización/.test(lg)) err("logro", lg);
if (E.respuesta("preguntas", { sel: ["¿A?", "¿B?"] }) !== "Sí, me gustaría saber: ¿A? ¿B?") err("preguntas");
if (E.preguntasSugeridas({ motiv: ["aprender"], ideal: { jefe: "Que enseñe" } }).length !== 3) err("preguntas sugeridas", E.preguntasSugeridas({ motiv: ["aprender"], ideal: { jefe: "Que enseñe" } }));
if (E.ORDEN_PREG.some(k => !E.PREGUNTAS[k])) err("orden de preguntas");
// Opciones para tocar: cada debilidad del estilo tiene tema, y cada opción arma frases sin dobles puntos ni mayúsculas a mitad
Object.values(E.ESTILOS).forEach(s => s.deb.forEach(deb => { if (!E.temaDebilidad({ deb })) err("debilidad sin tema", deb);
  const o = E.opcionesDebilidad({ deb }); if (o.ej.length < 3 || o.acc.length < 3 || o.av.length < 2) err("pocas opciones", deb);
  o.ej.concat(o.acc, o.av).forEach(x => { const r = E.respuesta("debilidad", { deb, ejemplo: x, accion: x, avance: x }); if (/\.\.|[a-z] [A-ZÁÉ]/.test(r.replace(/Para mejorarlo|Hoy|Lo noté/g, ""))) err("frase opción", r); }); }));
Object.keys(E.COMP_IDX).forEach(id => { const o = E.opcionesDebilidad({ compId: id }); if (o.ej.length < 3 || o.acc.length < 3) err("comp sin opciones", id); if (E.opcionesFortaleza({ compId: id }).length < 3) err("fort sin aporte", id); });
if (E.temaDebilidad({ deb: "Soy muy desordenado" }) !== "dispersion") err("tema por palabras");
if (E.opcionesDebilidad({ deb: "Algo raro" }).acc.length < 3) err("opciones genéricas");
if (E.OPC.accM.length !== E.OPC.m.length) err("acciones por momento");
E.OPC.accM.flat().forEach(a => { if (E.revisarLogro({ m: "x", a, r: "5" }).length) err("acción sin verbo en pasado", a); });
E.VERBOS.forEach(v => { if (!E.VERBO_RE.test(v + " algo")) err("verbo no reconocido", v); });
if (E.VERBO_RE.test("Diseño una ruta") || E.VERBO_RE.test("Soy bueno")) err("verbo en presente aceptado");
if (!E.revisarLogro({ m: "x", a: "Mejoré", r: "que bajara un __%" }).some(r => /__/.test(r))) err("aviso de __");
const lr = E.respuesta("logro", {}, { logro: { m: "x", a: "Mejoré algo", r: "que el tiempo bajara un 20%" } }); if (!/Como resultado, logré que el tiempo/.test(lr)) err("resultado con que", lr);
["sit", "acc", "res", "apr", "atrae"].forEach(k => { if (E.OPC[k].length < 4) err("opciones de", k); });
if (E.opcionesAporte({ clave: ["plan"] })[0] !== "la planificación y organización") err("aporte desde competencias clave", E.opcionesAporte({ clave: ["plan"] }));
console.log("ERRORS", errors);
