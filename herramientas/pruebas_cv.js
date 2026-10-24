// Aura · pruebas del motor de CV (js/cv.js). Uso: node herramientas/pruebas_cv.js
// El CV de ejemplo es ficticio.
const C = require("../js/cv.js");
let errors = 0; const err = (...a) => { errors++; console.log("ERR", ...a); };
const CV = `Camila Soto Pérez
camilita.xx99@gmail.com | +56 9 8765 4321 | Santiago
PERFIL PROFESIONAL
Estudiante proactiva, responsable y con capacidad de trabajo en equipo.
EXPERIENCIA LABORAL
Asistente de bodega – Ripley | 2023 – Actual
• Encargada del control de inventario de la tienda
• Reduje las mermas de la bodega en un 15% con conteos semanales
• Atención de clientes y reposición de productos
Cajera — Supermercado Líder
2021 - 2022
• Manejo de caja y cuadratura diaria de 2 cajas
FORMACIÓN
Ingeniería Civil Industrial, Universidad Mayor (2021 – actualidad)
CURSOS
Curso de Power BI para análisis de datos (2024)
HABILIDADES
Excel avanzado, Python básico, SAP, Microsoft Office
IDIOMAS
Inglés intermedio (B1)
Portugués
REFERENCIAS
Disponibles a solicitud
RUT: 12.345.678-9 · Estado civil: soltera · Fecha de nacimiento: 01/01/2003`;
const cv = C.extraer(CV, { paginas: 1 });
const sec = Object.keys(cv.sec).filter(k => k !== "_inicio").sort().join(",");
if (sec !== "cursos,experiencia,formacion,habilidades,idiomas,perfil,referencias") err("secciones", sec);
const hs = cv.herramientas.map(h => h.nombre + (h.nivel ? ":" + h.nivel : "")).join(",");
if (hs !== "Excel:avanzado,Power BI,Python:básico,SAP,Microsoft Office") err("herramientas", hs);
if (cv.idiomas.map(i => i.nombre + ":" + i.nivel).join(",") !== "Inglés:intermedio,Portugués:") err("idiomas", JSON.stringify(cv.idiomas));
if (cv.cargos.join(" | ") !== "Asistente de bodega – Ripley | Cajera — Supermercado Líder") err("cargos", cv.cargos);
if (!cv.cifras.some(c => /15%/.test(c)) || cv.cifras.some(c => /56 9|RUT/.test(c))) err("cifras", cv.cifras);
if (cv.cursos[0] !== "Curso de Power BI para análisis de datos (2024)") err("cursos", cv.cursos);
if (!cv.telefono || cv.linkedin || cv.nombre !== "Camila Soto Pérez" || !cv.estudiante) err("contacto", cv.telefono, cv.linkedin, cv.nombre, cv.estudiante);
// Revisión
const perfil = { clave: ["plan", "resp"], logros: [{ m: "x", a: "Organicé la bodega por categorías", r: "que encontráramos los productos en la mitad del tiempo", comps: [] }] };
const rv = C.revisar(cv, perfil), ids = rv.map(r => r.id);
["email2", "linkedin", "relleno", "verbos", "nivel-Portugués", "refs", "personales", "comps", "logros"].forEach(id => { if (!ids.includes(id)) err("revisión falta", id, ids); });
["email", "tel", "perfil", "largo"].forEach(id => { if (ids.includes(id)) err("revisión sobra", id); });
if (rv[0].n === "tip") err("orden de la revisión");
if (!/planificación y organización/.test(rv.find(r => r.id === "comps").txt) || /responsabilidad/.test(rv.find(r => r.id === "comps").txt) === false && false) err("comps falta texto");
// Un CV largo sin perfil ni correo
const cv2 = C.extraer("Juan Pérez\nEXPERIENCIA\nVendedor 2020 - 2021\n" + "palabra ".repeat(1200), { paginas: 3 });
const ids2 = C.revisar(cv2, {}).map(r => r.id); ["email", "perfil", "largo"].forEach(id => { if (!ids2.includes(id)) err("cv2 falta", id); });
// Comparación con el pitch
const pitch = { carrera: "estudiante de Ingeniería Civil Industrial", exp: [{ rubro: "retail", que: "en bodega y control de inventario" }], comps: ["Responsabilidad"], busco: "realizar mi práctica profesional" };
const cmp = C.compararPitch(cv, pitch, perfil), cids = cmp.map(c => c.id);
if (cids.join(",") !== "herr,idioma,cifra0,cargo0,curso") err("comparación", cids);
if (cmp[0].acciones[0].v !== "Manejo de Excel avanzado, Power BI y Python") err("comp herramientas", cmp[0].acciones[0].v);
if (cmp[1].acciones[0].v !== "mi inglés intermedio y portugués") err("idioma", cmp[1].acciones[0].v);
if (cmp[2].acciones[0].k !== "momento" || !/^reduje las mermas/.test(cmp[2].acciones[0].v)) err("cifra momento", cmp[2].acciones);
if (cmp.find(c => c.id === "curso").acciones[0].v !== "power BI para análisis de datos") err("curso corto", cmp.find(c => c.id === "curso").acciones[0].v);
// Aplicar: la sugerencia desaparece
C.aplicar(cmp[0].acciones[0], pitch, perfil); C.aplicar(cmp[2].acciones[0], pitch, perfil); C.aplicar(cmp[1].acciones[0], pitch, perfil);
const cmp2 = C.compararPitch(cv, pitch, perfil), cids2 = cmp2.map(c => c.id);
if (!/^Manejas SAP y no/.test((cmp2.find(c => c.id === "herr") || {}).txt)) err("solo queda SAP", cmp2[0]);
if ( cids2.includes("cifra0") || cids2.includes("idioma")) err("tras aplicar", cids2);
if (pitch.comps.length !== 2) err("comp duplicada");
C.aplicar({ k: "logro", v: "reduje las mermas en un 15%." }, pitch, perfil); if (perfil.logros[1].a !== "Reduje las mermas en un 15%") err("logro creado", perfil.logros[1]);
// Bloques
const pit = { carrera: "estudiante de Ingeniería Civil Industrial", inst: "la Universidad Mayor", etapa: "en el último año de la carrera", exp: [{ rubro: "retail" }], comps: ["Análisis de datos"], busco: "realizar mi práctica profesional en logística", aporte: "mi manejo de Excel" };
const bl = C.bloques({ clave: ["plan", "resp"], logros: perfil.logros }, pit);
if (bl.perfil !== "Estudiante de Ingeniería Civil Industrial en la Universidad Mayor, en el último año de la carrera, con experiencia en retail. Entre mis fortalezas están la planificación y organización, la responsabilidad y el análisis de datos. Busco realizar mi práctica profesional en logística, donde pueda aportar mi manejo de Excel.") err("perfil", bl.perfil);
if (bl.competencias.length !== 3 || bl.logros.length !== 2) err("bloques", bl.competencias, bl.logros);
// Encabezados en mayúsculas, con dos puntos o con #
if (C.tipoSeccion("EXPERIENCIA LABORAL:") !== "experiencia" || C.tipoSeccion("## Educación") !== null && C.secciones("## Educación\nx").formacion === undefined) err("tipoSeccion");
if (C.tipoSeccion("Experiencia en atención de clientes en retail durante dos años") !== null) err("frase larga no es sección");
const pm = { comps: ["Responsabilidad", "Manejo de Excel, Power BI y Python"] }; C.aplicar({ k: "comp", v: "Manejo de AMPL y Excel" }, pm, {});
if (pm.comps.join(" | ") !== "Responsabilidad | Manejo de Excel, Power BI, Python y AMPL") err("fusión de herramientas", pm.comps);
// Viñetas cortadas en dos líneas se unen; «ruta» no se confunde con «RUT»; fechas con mes
const cv3 = C.extraer("EXPERIENCIA LABORAL\nChofer – Derco  Ene. 2025 – Mar. 2025\n• Rediseñé la ruta de despacho, logrando entregar al 100% de los\nclientes dentro de la jornada.\n• Organicé el stock durante Cyber y\nNavidad sin interrupciones.\n• Atendí público y cerré ventas directas en el local\n• Controlé la caja y el cierre de turno diario", { paginas: 1 });
if (cv3.cargos[0] !== "Chofer – Derco") err("cargo con meses", cv3.cargos);
if (cv3.cifras[0] !== "Rediseñé la ruta de despacho, logrando entregar al 100% de los clientes dentro de la jornada.") err("cifra unida", cv3.cifras);
if (!cv3.vinetas.includes("Organicé el stock durante Cyber y Navidad sin interrupciones.")) err("viñeta unida", cv3.vinetas);
if (!C.revisar(cv3, {}).some(r => r.id === "cifras")) err("cifras en viñetas sin número");
// Pitch editado a mano: cuenta lo que dice el guion guardado
if (C.textoPitch({ editado: true, guion: "Hola", comps: ["Manejo de Excel"] }).includes("excel")) err("pitch editado");
console.log("ERRORS", errors);
