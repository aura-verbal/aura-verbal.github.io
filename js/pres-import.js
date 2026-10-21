/* Aura · Mi presentación (importar archivos)
   Lee PowerPoint (.pptx), PDF, Word (.docx) y texto en el navegador, sin servidor.
   Las librerías (js/vendor) se cargan solo cuando el usuario sube un archivo de ese tipo. */
(function (root) {
  "use strict";
  const loaded = {};
  function loadScript(src) {
    if (loaded[src]) return loaded[src];
    loaded[src] = new Promise((res, rej) => {
      const s = document.createElement("script"); s.src = src; s.async = true;
      s.onload = () => res(); s.onerror = () => { delete loaded[src]; rej(new Error("No se pudo cargar " + src)); };
      document.head.appendChild(s);
    });
    return loaded[src];
  }
  const xml = str => new DOMParser().parseFromString(str, "application/xml");
  const byTag = (node, tag) => Array.from(node.getElementsByTagName(tag));
  function paraTexts(node, pTag, tTag) {
    return byTag(node, pTag).map(p => byTag(p, tTag).map(t => t.textContent).join("").replace(/\s+/g, " ").trim()).filter(Boolean);
  }
  function relsMap(str) {
    const m = {}; if (!str) return m;
    byTag(xml(str), "Relationship").forEach(r => { m[r.getAttribute("Id")] = { target: r.getAttribute("Target"), type: r.getAttribute("Type") || "" }; });
    return m;
  }
  function resolve(base, target) {   // "ppt/slides/" + "../notesSlides/n1.xml" → "ppt/notesSlides/n1.xml"
    const parts = (base + target).split("/"), out = [];
    parts.forEach(p => { if (p === "..") out.pop(); else if (p && p !== ".") out.push(p); });
    return out.join("/");
  }

  /* ---------- PowerPoint (también lo que exporta Canva) ---------- */
  async function readPptx(file) {
    await loadScript("js/vendor/jszip.min.js");
    const zip = await root.JSZip.loadAsync(file);
    const pres = zip.file("ppt/presentation.xml"), presRels = zip.file("ppt/_rels/presentation.xml.rels");
    let order = [];
    if (pres && presRels) {
      const rels = relsMap(await presRels.async("string"));
      order = byTag(xml(await pres.async("string")), "p:sldId").map(n => rels[n.getAttribute("r:id")]).filter(Boolean).map(r => resolve("ppt/", r.target));
    }
    if (!order.length) order = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]);
    const slides = [];
    for (const path of order) {
      const f = zip.file(path); if (!f) continue;
      const doc = xml(await f.async("string"));
      let titulo = "", resto = [];
      byTag(doc, "p:sp").forEach(sp => {
        const ph = byTag(sp, "p:ph")[0], t = ph ? (ph.getAttribute("type") || "") : "";
        const lines = paraTexts(sp, "a:p", "a:t");
        if (!lines.length || t === "sldNum" || t === "dt" || t === "ftr") return;
        if (!titulo && (t === "title" || t === "ctrTitle")) titulo = lines.join(" ");
        else resto.push(...lines);
      });
      // tablas y grupos que no son p:sp
      byTag(doc, "a:tbl").forEach(tb => resto.push(...paraTexts(tb, "a:p", "a:t")));
      let notas = "";
      const relF = zip.file(path.replace(/slides\/(slide\d+\.xml)$/, "slides/_rels/$1.rels"));
      if (relF) {
        const rel = Object.values(relsMap(await relF.async("string"))).find(r => /notesSlide/.test(r.type) || /notesSlide/.test(r.target));
        const nf = rel && zip.file(resolve("ppt/slides/", rel.target));
        if (nf) {
          const nd = xml(await nf.async("string"));
          notas = byTag(nd, "p:sp").filter(sp => { const ph = byTag(sp, "p:ph")[0]; return ph && ph.getAttribute("type") === "body"; })
            .map(sp => paraTexts(sp, "a:p", "a:t").join("\n")).join("\n").trim();
        }
      }
      slides.push({ titulo, texto: resto.join("\n"), notas });
    }
    return { kind: "slides", slides };
  }

  /* ---------- PDF (Canva, Google Slides o PowerPoint exportados) ---------- */
  async function readPdf(file) {
    await loadScript("js/vendor/pdf.min.js");
    const lib = root.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = "js/vendor/pdf.worker.min.js";
    const pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];
    for (let i = 1; i <= Math.min(pdf.numPages, 60); i++) {
      const pg = await pdf.getPage(i), tc = await pg.getTextContent();
      const rows = [];
      tc.items.forEach(it => {
        const s = (it.str || "").trim(); if (!s) return;
        const y = Math.round(it.transform[5]), h = Math.abs(it.transform[3]) || it.height || 10;
        let r = rows.find(r => Math.abs(r.y - y) <= Math.max(2, h * 0.4));
        if (!r) { r = { y, h, parts: [] }; rows.push(r); }
        r.parts.push({ x: it.transform[4], s }); r.h = Math.max(r.h, h);
      });
      rows.sort((a, b) => b.y - a.y);
      const lines = rows.map(r => ({ h: r.h, t: r.parts.sort((a, b) => a.x - b.x).map(p => p.s).join(" ").replace(/\s+/g, " ").trim() })).filter(l => l.t);
      pages.push(lines);
    }
    const words = pages.reduce((a, ls) => a + ls.reduce((b, l) => b + l.t.split(" ").length, 0), 0);
    if (!words) return { kind: "vacio", pages: pdf.numPages };
    // Un PDF con mucho texto por página es un guion o informe, no una presentación.
    if (words / pages.length > 140) return { kind: "guion", text: pages.map(ls => ls.map(l => l.t).join("\n")).join("\n\n") };
    const slides = pages.map(ls => {
      if (!ls.length) return { titulo: "", texto: "", notas: "" };
      const maxH = Math.max(...ls.map(l => l.h)), ti = ls.findIndex(l => l.h >= maxH * 0.92);
      return { titulo: ls[ti].t.slice(0, 90), texto: ls.filter((_, k) => k !== ti).map(l => l.t).join("\n"), notas: "" };
    });
    return { kind: "slides", slides, sinTexto: slides.filter(s => !s.titulo && !s.texto).length };
  }

  /* ---------- Word (.docx) y texto ---------- */
  async function readDocx(file) {
    await loadScript("js/vendor/jszip.min.js");
    const zip = await root.JSZip.loadAsync(file), f = zip.file("word/document.xml");
    if (!f) throw new Error("docx");
    const doc = xml(await f.async("string"));
    const lines = byTag(doc, "w:p").map(p => {
      const st = byTag(p, "w:pStyle")[0], style = st ? (st.getAttribute("w:val") || "") : "";
      const t = byTag(p, "w:t").map(x => x.textContent).join("").trim();
      if (!t) return "";
      return /heading|t[ií]tulo|title/i.test(style) ? "\n## " + t : t;
    });
    return { kind: "guion", text: lines.join("\n").replace(/\n{3,}/g, "\n\n") };
  }
  async function importFile(file) {
    const name = (file.name || "").toLowerCase();
    if (name.endsWith(".pptx")) return readPptx(file);
    if (name.endsWith(".pdf") || file.type === "application/pdf") return readPdf(file);
    if (name.endsWith(".docx")) return readDocx(file);
    if (name.endsWith(".txt") || name.endsWith(".md") || /^text\//.test(file.type)) return { kind: "guion", text: await file.text() };
    if (name.endsWith(".ppt") || name.endsWith(".doc") || name.endsWith(".key")) return { kind: "antiguo" };
    return { kind: "desconocido" };
  }
  root.AuraImport = { importFile, readPptx, readPdf, readDocx };
})(typeof window !== "undefined" ? window : globalThis);
