# Aura

Entrena cómo suenas. Aura es una app web para practicar vocabulario según el contexto y ponerlo a prueba en conversaciones simuladas que reaccionan a tus respuestas, adaptadas al país de cada usuario.

**App:** https://aura-verbal.github.io

## Mi presentación (función principal)
1. **Datos:** tema, fecha, minutos para hablar y tiempo de práctica al día.
2. **Carga:** PowerPoint (.pptx, con notas del orador), PDF (Canva, Google Slides), Word (.docx), texto, o guion pegado. Si no hay guion, Aura arma un prompt para que la IA gratuita del usuario lo escriba con su material (sin inventar datos).
3. **Bloques:** apertura, ideas y cierre, con lo que se va a decir, palabras clave y tiempo estimado por bloque.
4. **Plan según los días que faltan:** exprés (hoy o mañana), estructurado (2 a 4 días) o espaciado (5 o más).
5. **Sesiones:** lectura en voz alta, aprender bloque por bloque con el texto que se va borrando, memorizar apertura y cierre, tarjetas, ensayo completo cronometrado por voz (tiempo, ideas clave dichas, muletillas, ritmo), preguntas del profesor y calentamiento antes de presentar.
6. **Pro (próximamente):** Aura genera la presentación completa con IA.

## Más situaciones
1. **País:** el usuario elige su país; cambian las muletillas que se detectan, los modismos, el trato (tú, vos o usted) y la voz del reconocedor.
2. **Prueba inicial:** se presenta por voz en 60 segundos y queda su punto de partida (palabras y muletillas por minuto).
3. **Escenario:** ficha de contexto, personalidad del interlocutor (amable, neutral o difícil) y 10 palabras clave.
4. **Práctica:** mini-juegos para elegir la palabra adecuada y completar frases.
5. **Simulación ramificada:** 8 turnos; un medidor de interés sube o baja con cada respuesta y decide uno de tres finales.
6. **Resultado:** puntaje, recomendaciones, Escúchate (grabar y reproducir la respuesta modelo) y tarjeta para compartir.
7. **Reto diario:** 5 preguntas en menos de 5 minutos (4 de vocabulario priorizando lo que aún no dominas y 1 de «caza la muletilla» de tu país). Alimenta la racha.

## Escenarios disponibles (10)
- Académico: Presentación de proyecto, Disertación en clases.
- Laboral: Entrevista de trabajo, Entrevista de práctica profesional, Primer día: presentarte al equipo.
- Ventas: Cliente molesto en tienda, Reclamo y devolución.
- Social: Primera cita, Networking en un evento.
- Cotidiano: Reclamo en un call center.

## Estructura
- `index.html`: estructura y estilos.
- `js/motor.js`: funciones puras (muletillas, puntaje, medidor de interés, contenido por país). Se puede probar con Node.
- `js/app.js`: interfaz.
- `js/pres.js`: motor de «Mi presentación» (bloques, palabras clave, plan por días, memorización, cobertura del ensayo).
- `js/pres-import.js`: lectura de .pptx, .pdf, .docx y .txt en el navegador; usa `js/vendor/` (JSZip y PDF.js, ver licencias).
- `data/paises.json`: países, voz del reconocedor, trato, muletillas por país y frases del reto «caza la muletilla».
- `data/escenarios/index.json`: catálogo de escenarios (disponibles y próximos).
- `data/escenarios/<id>.json`: contenido de cada escenario. Un texto puede ser `"texto"` o `{"base": "neutro", "AR": "...", "MX": "..."}`.
- `sw.js`: permite abrir la app sin conexión.
- `herramientas/`: scripts que generan el contenido (`contenido_paises.py`, `contenido_escenarios.py`, `escenarios_nuevos.py`) y sus pruebas (`pruebas_contenido.js`, `pruebas_presentacion.js`).

## Estado del contenido
- Chile: capa completa.
- México, Colombia y Argentina: borrador redactado con IA, pendiente de revisión por hablantes nativos.
- Resto de países hispanohablantes: español neutro.

## Detalles técnicos
- Sin servidor ni APIs pagadas: voz con la Web Speech API del navegador (mejor en Chrome), sonidos con Web Audio y grabación con MediaRecorder.
- El progreso se guarda en el navegador de cada usuario.
- Se puede instalar como app desde el navegador (`manifest.webmanifest`).
- Diseño: tema claro marfil y cobre, con un color por área (Académico índigo, Laboral petróleo, Ventas ocre, Social ciruela, Cotidiano oliva). El modo oscuro se activa en Ajustes. Íconos generados con `herramientas/iconos.py`.

## Estado
Prototipo en etapa de validación.
