// Aura · pruebas del motor del pitch (js/pitch.js). Uso: node herramientas/pruebas_pitch.js
const P = require("../js/pitch.js");
let errors = 0; const err = (...a) => { errors++; console.log("ERR", ...a); };
const base = { tipo: "video", saludo: "Buenos días", nombre: "Camila Soto", carrera: "Estudiante de Ingeniería Comercial.", inst: "la Universidad de Chile", etapa: "en el último año",
  exp: [{ rubro: "retail", que: "en bodega" }, { rubro: "una agencia", que: "en ventas" }, {}], comps: ["Comunicación", "Trabajo en equipo", "Análisis de datos"],
  motivo: "Me motiva resolver problemas.", momento: "ordené un inventario desordenado", busco: "realizar mi práctica en finanzas", aporte: "mi experiencia con clientes" };
const g = P.guion(base);
if (g.split("\n\n").length !== 4) err("4 párrafos", g);
if (!/Soy estudiante de Ingeniería Comercial en la Universidad de Chile, en el último año\./.test(g)) err("formación: minúscula y sin punto doble", g);
if (/\.\./.test(g)) err("punto doble", g);
if (!/tres competencias que me definen: comunicación, trabajo en equipo y análisis de datos\./.test(g)) err("lista de competencias", g);
if (!/En retail me he desempeñado en bodega\. En una agencia trabajé en ventas\./.test(g)) err("verbos de experiencia variados", g);
if (!/me motiva resolver problemas\. Lo viví cuando ordené/.test(g)) err("transición", g);
if (!/disponible para una entrevista/.test(g)) err("cierre video");
if (!/consejo/.test(P.guion({ ...base, tipo: "contacto" }))) err("cierre contacto");
if (P.revisar(base, g).some(r => r.nivel === "no")) err("revisión con faltas en un pitch completo", P.revisar(base, g));
const r = P.revisar({ tipo: "video", exp: [{ rubro: "x", que: "aumenté las ventas un 20%" }], comps: ["a"] }, "hola");
["saludo", "formacion", "competencias", "experiencia", "transicion", "futuro"].forEach(k => { if (!r.some(x => x.k === k)) err("revisión falta", k); });
const largo = P.revisar(base, "palabra ".repeat(400)); if (!largo.some(x => x.k === "largo")) err("aviso de largo");
if (P.guion({}) !== P.partes({}).cierre) err("pitch vacío solo con cierre", P.guion({}));
// Carrera e institución escritas en minúscula; momento sin motivación
const pf = P.partes({ carrera: "ingenieria civil industrial", inst: "universidad mayor", etapa: "en el penúltimo año de la carrera", momento: "mejoré la ruta de despacho" });
if (pf.formacion !== "Soy estudiante de Ingeniería Civil Industrial en la Universidad Mayor, en el penúltimo año de la carrera.") err("formación en minúscula", pf.formacion);
if (pf.transicion !== "Un logro que me representa: mejoré la ruta de despacho.") err("momento sin motivo", pf.transicion);
if (P.partes({ carrera: "estudiante de Ingeniería Comercial", inst: "la Universidad de Chile" }).formacion !== "Soy estudiante de Ingeniería Comercial en la Universidad de Chile.") err("formación ya escrita bien");
console.log("ERRORS", errors);
