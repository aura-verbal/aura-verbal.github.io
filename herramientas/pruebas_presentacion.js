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
// Conectores: detección, alternativas gramaticales, distractores de otra familia y equivalencia al medir
const txt = "Sin embargo, la economía creció. Aunque el comercio cayó, la minería subió. El índice subió porque la minería creció. Primero veremos el dato. Finalmente, la conclusión. O sea, avanzamos.";
const cs = P.conectores(txt).map(c => c.fn);
["contraste", "concesion", "causa", "orden", "reformulacion"].forEach(f => { if (!cs.includes(f)) err("conector no detectado", f, cs); });
if (P.conectores("Embargaron el auto. Perolito no es pero.").filter(c => c.fn === "contraste").length !== 1) err("límite de palabra en conectores");
const its = P.relevoItems(P.fromGuion("## A\n" + txt + "\n## B\nfin del bloque\n## C\nfin"));
its.filter(x => x.tipo === "con").forEach(x => {
  if (!x.blank.includes("___")) err("sin hueco", x.w);
  if (x.validas.some(v => P.alternativas(x.fn, x.canon).map(a => a.toLowerCase()).indexOf(v.toLowerCase()) < 0)) err("válida rara", x.w);
  if (x.validas.map(v => v.toLowerCase()).includes("o sea")) err("sugiere o sea");
  const fam = P.CONECTORES[x.fn].fam;
  x.opciones.slice(2).forEach(o => { const f = Object.keys(P.CONECTORES).find(k => (P.CONECTORES[k].sug || []).concat(P.CONECTORES[k].w).map(w => w.toLowerCase()).includes(o.toLowerCase())); if (f && P.CONECTORES[f].fam === fam) err("distractor de la misma familia", x.w, o); });
  if (x.fn === "orden" && /finalmente|por último/i.test(x.w) && x.validas.some(v => /primer|empezar/i.test(v))) err("orden mezclado", x.w);
});
if (P.alternativas("causa", "porque").includes("debido a")) err("alternativa no gramatical para causa");
if (its.filter(x => x.tipo === "puente").length !== 2) err("puentes");
if (P.recall("pero la economía creció", "Sin embargo, la economía creció") < 0.99) err("equivalencia de conectores en recall");
if (P.keywords("Sin embargo, no obstante, en consecuencia el IMACEC creció", 4).some(w => /embargo|obstante|consecuencia/i.test(w))) err("conector como palabra clave");
// Cifras dichas sin «%» o con «por ciento» cuentan; una cifra distinta no
const cv = (d, k) => P.cobertura(d, [{ id: "x", titulo: "t", claves: [k] }])[0].ok;
if (!cv("entre un 0,25 o un 0,75", "0,25%") || !cv("cerca de 0,25 por ciento", "0,25%") || !cv("el 4,5%", "4,5%")) err("cifra sin %");
if (cv("cerca de 0,2", "0,25%") || cv("subió 25", "0,25%")) err("cifra distinta aceptada");
if (P.recall("entre 0,25 y 0,75 por ciento", "entre 0,25% y 0,75%") < 0.99) err("recall con cifras");
// Reconocedor que corrige la frase agregando una palabra: no se duplica
const M = require("../js/motor.js");
const tr = M.buildTranscript(["dice que bastante menos entre un 0,25", "dice que es bastante menos entre un 0,25 o un 0,75% es una"]);
if ((tr.match(/bastante/g) || []).length !== 1) err("frase revisada duplicada", tr);
if (M.buildTranscript(["hola a todos", "hoy hablaré del agua"]) !== "hola a todos hoy hablaré del agua") err("segmentos distintos se pierden");
console.log("ERRORS", errors);
