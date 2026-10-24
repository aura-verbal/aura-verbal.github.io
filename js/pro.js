/* Aura Pro (bloqueado)
   Funciones con IA que se habilitarán con la suscripción de pago. Quedan programadas, pero no se pueden usar:
   - `activo` es false y no hay `ENDPOINT`, así que la app solo muestra las tarjetas con candado.
   - La llave de la API de IA NO puede vivir en el navegador (cualquiera la podría copiar). Para activar Pro
     hace falta un servidor propio pequeño que: 1) verifique que el usuario pagó, 2) agregue la llave y llame
     a la IA, 3) devuelva el texto. Este archivo solo arma el pedido y lo envía a ese servidor.
   - Antes de enviar un CV a un servidor hay que pedir consentimiento explícito: tiene datos personales.
   Mientras tanto, todo lo gratuito sigue funcionando dentro del celular. */
(function (root) {
  "use strict";
  const REGLAS = "Responde en español de Chile, claro y profesional. No inventes experiencias, cifras, empresas ni estudios: " +
    "usa solo lo que está en los datos. Si falta un número, deja [COMPLETAR]. Nunca incluyas debilidades en un CV.";
  const FUNCIONES = {
    cvReescribir: { nombre: "Reescribir mi CV completo", desc: "La IA reescribe tu CV con tu autodiagnóstico, tus logros y tu pitch: perfil, viñetas con verbos y cifras, y orden por relevancia.",
      prompt: d => `${REGLAS}\nReescribe este CV para el cargo que busca la persona. Mantén sus datos, mejora la redacción, empieza cada viñeta con un verbo de acción, ` +
        `destaca resultados medibles y agrega un perfil profesional de 3 líneas.\n\nCV ACTUAL:\n${d.cv}\n\nLO QUE BUSCA: ${d.busco || "[no indicado]"}\n` +
        `FORTALEZAS CONFIRMADAS: ${(d.fortalezas || []).join("; ")}\nLOGROS: ${(d.logros || []).join(" | ")}` },
    cvOferta: { nombre: "Adaptar mi CV a una oferta", desc: "Pegas la oferta de trabajo y la IA te dice qué destacar, qué palabras clave faltan y cómo reordenar tu CV para esa empresa.",
      prompt: d => `${REGLAS}\nCompara el CV con la oferta. Entrega: 1) palabras clave de la oferta que faltan en el CV, 2) qué experiencias destacar y cómo, ` +
        `3) 3 viñetas reescritas para esta oferta, 4) una línea de perfil adaptada.\n\nOFERTA:\n${d.oferta || "[falta la oferta]"}\n\nCV:\n${d.cv}` },
    cvProfunda: { nombre: "Revisión profunda con IA", desc: "Una lectura completa de tu CV, tu pitch y tus respuestas: contradicciones, lo que no aprovechas y cómo contarlo en la entrevista.",
      prompt: d => `${REGLAS}\nRevisa en conjunto el CV, el pitch y las respuestas de entrevista de esta persona. Señala contradicciones entre ellos, ` +
        `experiencias del CV que no aprovecha al hablar y 3 mejoras concretas para cada uno.\n\nCV:\n${d.cv}\n\nPITCH:\n${d.pitch || ""}\n\nRESPUESTAS:\n${d.respuestas || ""}` }
  };
  const AuraPro = {
    activo: false, ENDPOINT: null, FUNCIONES,
    prompt(id, datos) { const f = FUNCIONES[id]; return f ? f.prompt(datos || {}) : ""; },
    async pedir(id, datos) {
      if (!this.activo || !this.ENDPOINT) throw new Error("pro-inactivo");
      const r = await fetch(this.ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ funcion: id, prompt: this.prompt(id, datos) }) });
      if (!r.ok) throw new Error("pro-" + r.status); return (await r.json()).texto;
    }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = AuraPro;
  else root.AuraPro = AuraPro;
})(typeof window !== "undefined" ? window : globalThis);
