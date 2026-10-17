# Aura

Entrena cómo suenas. Aura es una app web para practicar vocabulario según el contexto y ponerlo a prueba en conversaciones simuladas que reaccionan a tus respuestas, adaptadas al país de cada usuario.

**App:** https://aura-verbal.github.io

## Cómo funciona
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
- `data/paises.json`: países, voz del reconocedor, trato, muletillas por país y frases del reto «caza la muletilla».
- `data/escenarios/index.json`: catálogo de escenarios (disponibles y próximos).
- `data/escenarios/<id>.json`: contenido de cada escenario. Un texto puede ser `"texto"` o `{"base": "neutro", "AR": "...", "MX": "..."}`.
- `sw.js`: permite abrir la app sin conexión.
- `herramientas/`: scripts que generan el contenido (`contenido_paises.py`, `contenido_escenarios.py`, `escenarios_nuevos.py`) y sus pruebas (`pruebas_contenido.js`).

## Estado del contenido
- Chile: capa completa.
- México, Colombia y Argentina: borrador redactado con IA, pendiente de revisión por hablantes nativos.
- Resto de países hispanohablantes: español neutro.

## Detalles técnicos
- Sin servidor ni APIs pagadas: voz con la Web Speech API del navegador (mejor en Chrome), sonidos con Web Audio y grabación con MediaRecorder.
- El progreso se guarda en el navegador de cada usuario.
- Se puede instalar como app desde el navegador (`manifest.webmanifest`).

## Estado
Prototipo en etapa de validación.
