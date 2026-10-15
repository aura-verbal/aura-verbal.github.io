# Aura

Entrena cómo suenas. Aura es una app web para practicar vocabulario según el contexto y ponerlo a prueba en conversaciones simuladas.

**App:** https://aura-verbal.github.io

## Cómo funciona
1. **Vocabulario:** 10 palabras clave por escenario, de un registro coloquial a uno adecuado al contexto.
2. **Práctica:** mini-juegos para elegir la palabra adecuada y completar frases.
3. **Simulación:** una conversación de 5 turnos que sube de nivel (elegir → completar → responder libre por texto o voz).
4. **Resultado:** puntaje, recomendaciones y barra de progreso por escenario.

Escenarios: presentación en la universidad, entrevista de trabajo, vendedor con cliente y primera cita.

## Detalles técnicos
- Un solo archivo (`index.html`) sin servidor ni APIs pagadas.
- Voz con la Web Speech API del navegador (funciona mejor en Chrome).
- El progreso se guarda en el navegador de cada usuario.
- Se puede instalar como app desde el navegador (`manifest.webmanifest`).

## Estado
Prototipo en etapa de validación.
