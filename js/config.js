/* Aura · configuración
   Lo único que tienes que editar a mano para conectar servicios externos. Se puede cambiar desde la web de
   GitHub (botón del lápiz) sin tocar el resto del código. Mientras un valor sea null, esa parte queda apagada
   y la app funciona igual.

   1) FORM_PRO_URL  → enlace del Google Form de lista de espera y precio (Aura Pro).
                      Con el enlace, los candados de Pro pasan a «Avísame cuando esté».
   2) OPINION_URL   → enlace de un Google Form para opiniones. Si queda en null, la opinión se envía por
                      WhatsApp (la persona elige a quién) o se copia.
   3) OPINION_WSP   → (opcional) número de WhatsApp de Aura, solo dígitos con código de país, por ejemplo
                      "56912345678". Si queda en null, WhatsApp pide elegir el contacto. No pongas un número
                      personal si la app va a ser pública.
   4) GOATCOUNTER   → (opcional) código de una cuenta gratuita de GoatCounter (analítica sin cookies), por ejemplo
                      "aura" si tu panel es https://aura.goatcounter.com. Con null, el uso solo se guarda en el
                      celular de cada persona y se puede enviar a mano junto con la opinión.
   5) PRUEBA        → true mientras dure la prueba con usuarios: muestra el botón de opinión en el encabezado. */
(function (root) {
  "use strict";
  root.AuraConfig = {
    FORM_PRO_URL: null,
    OPINION_URL: null,
    OPINION_WSP: null,
    GOATCOUNTER: null,
    PRUEBA: true
  };
})(typeof window !== "undefined" ? window : globalThis);
