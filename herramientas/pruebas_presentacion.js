// Aura · pruebas del motor de «Mi presentación» (js/pres.js). Uso: node herramientas/pruebas_presentacion.js
const P = require("../js/pres.js");
let errors = 0; const err = (...a) => { errors++; console.log("ERR", ...a); };
const hoy = "2026-10-20";

// Plan: para cada plazo, el último día es la presentación con calentamiento, sin días vacíos ni ids repetidos
for (let d = 0; d <= 30; d++) for (const min of [15, 30, 60]) {
  const pl = P.plan(P.addDays(hoy, d), hoy, min);
  if (!pl) { err("sin plan", d); continue; }
  const esperado = d <= 1 ? "expres" : d <= 4 ? "estructurado" : "espaciado";
  if (pl.tipo !== esperado) err("tipo", d, pl.tipo);
  const last = pl.dias[pl.dias.length - 1];
  if (last.f !== P.addDays(hoy, d) || !last.ses.some(s => s.tipo === "calentamiento")) err("último día", d, last.f);
  const ids = pl.dias.flatMap(x => x.ses.map(s => s.id));
  if (new Set(ids).size !== ids.length) err("ids repetidos", d);
  if (pl.dias.some(x => !x.ses.length)) err("día vacío", d);
  if (!ids.some(i => /ensayo/.test(i))) err("sin ensayo", d);
  if (pl.dias.length > 16) err("plan muy largo", d, pl.dias.length);
  if (pl.dias.some(x => x.f < hoy)) err("día en el pasado", d);
}
if (P.plan(P.addDays(hoy, -1), hoy, 30) !== null) err("fecha pasada debería dar null");

// Guion: distintos formatos se dividen en bloques con apertura y cierre
const casos = {
  titulos: "## Apertura\nHola, hoy hablaré del agua.\n## El problema\nFalta agua en el norte por la sequía.\n## Cierre\nCuidemos el agua. Gracias.",
  diapositivas: "Diapositiva 1: Portada\nHola a todos.\nDiapositiva 2: Datos\nEl 40% del agua se pierde en fugas.\nDiapositiva 3: Cierre\nGracias por escuchar.",
  numerados: "1. Introducción\nHoy veremos la inflación.\n2. Causas\nSube la demanda y los costos.\n3. Conclusión\nHay que mirar el IPC cada mes.",
  parrafos: "Primero quiero contarles algo sobre el reciclaje en Santiago.\n\nCada persona genera más de un kilo de basura al día.\n\nPor eso reciclar en casa sí hace diferencia.",
  unParrafo: "Hola a todos. Hoy les hablaré del metro de Santiago. Es uno de los más extensos de Latinoamérica. Mueve a millones de personas cada día. Sin embargo, en hora punta se satura. Por eso se están construyendo nuevas líneas. Para cerrar, el metro es clave para la ciudad. Gracias."
};
for (const [k, t] of Object.entries(casos)) {
  const bs = P.fromGuion(t);
  if (bs.length < 3) err("pocos bloques", k, bs.length);
  if (bs[0].tipo !== "apertura" || bs[bs.length - 1].tipo !== "cierre") err("tipos", k);
  bs.forEach(b => { if (!b.titulo) err("sin título", k); if (!b.claves.length && b.texto.split(" ").length > 4) err("sin claves", k, b.titulo); });
}
// Palabras clave: sin palabras vacías y con la cifra importante
const kw = P.keywords("El IMACEC creció 2,3% en agosto según el Banco Central, y eso es muy importante para todos", 4);
if (!kw.includes("2,3%")) err("cifra no detectada", kw);
if (kw.some(w => ["el", "en", "muy", "para", "todos", "eso"].includes(w.toLowerCase()))) err("palabra vacía en claves", kw);
// Desvanecer: nivel 0 no oculta nada, nivel 3 solo deja las claves
const f0 = P.fade("La minería explica la caída", 0, ["minería"]), f3 = P.fade("La minería explica la caída", 3, ["minería"]);
if (f0.some(t => t.hid || t.ini)) err("nivel 0 oculta");
if (!f3.find(t => t.key) || f3.filter(t => !t.sp && !t.key && !t.hid).length) err("nivel 3");
// Recuerdo y cobertura
if (P.recall("la minería explica la caída del índice", "La minería explica la caída del índice") < 0.99) err("recall completo");
if (P.recall("", "La minería explica la caída") !== 0) err("recall vacío");
const cov = P.cobertura("el imacec lo publica el banco central", [{ id: "x", titulo: "t", claves: ["IMACEC", "Banco", "minería"] }])[0];
if (cov.ok !== 2 || cov.faltan[0] !== "minería") err("cobertura", JSON.stringify(cov));
// Tiempo: avisa si el guion es muy largo para los minutos
const largo = P.fromGuion("## A\n" + "palabra ".repeat(600) + "\n## B\nfin del texto aquí\n## C\ncierre final del texto");
if (!P.asignarTiempo(largo, 3).aviso || P.asignarTiempo(largo, 3).aviso.tipo !== "largo") err("aviso largo");
// Primera frase con contenido
if (P.firstSentence("Buenos días. ¿Sabían que el agua se acaba en el norte?").split(" ").length < 8) err("primera frase corta");
// Prompt del puente: incluye duración en palabras y la regla de no inventar
const pr = P.promptGuion({ tema: "El IMACEC", minutos: 5, material: "dato X" });
if (!/650 palabras/.test(pr) || !/VERIFICAR/.test(pr) || !/dato X/.test(pr)) err("prompt");
console.log("ERRORS", errors);
