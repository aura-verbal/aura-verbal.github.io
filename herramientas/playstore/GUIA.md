# Aura en Google Play · guía paso a paso

Aura es una app web instalable (PWA). Para publicarla en Play Store se «envuelve» en una app de Android que abre
https://aura-verbal.github.io a pantalla completa (Trusted Web Activity). No hay que reescribir nada: cada cambio
que se publica en GitHub llega solo a la app instalada.

## Lo que ya está listo en el repositorio
- `manifest.webmanifest` completo: nombre, descripción, íconos (normal y adaptable), categorías, atajos del ícono
  (Presentaciones y Entrevistas) y capturas.
- `privacidad.html`: política de privacidad pública (Play la pide como enlace).
- `.nojekyll`: permite que GitHub Pages publique la carpeta `.well-known` (paso 4).
- `herramientas/playstore/capturas/`: 7 capturas de 1080×1920 con datos de ejemplo.
- `herramientas/playstore/imagen-destacada-1024x500.png`: imagen destacada de la ficha.

## Lo que tienes que hacer tú
1. **Cuenta de desarrollador de Google Play** en https://play.google.com/console (pago único; revisa el valor
   actual al registrarte). Necesitas verificar tu identidad.
2. **Generar el paquete de Android** en https://www.pwabuilder.com:
   - Pega `https://aura-verbal.github.io` y espera el análisis.
   - «Package for stores» → **Android** → «Generate package».
   - Package ID sugerido: `io.github.auraverbal.app` (no se puede cambiar después).
   - Descarga el .zip. Trae el archivo `.aab` (lo que se sube a Play), la **llave de firma** (`signing.keystore` +
     contraseñas) y un `assetlinks.json`.
   - **Guarda la llave y sus contraseñas en un lugar seguro y privado** (no en GitHub). Sin ella no podrás
     publicar actualizaciones del paquete.
3. **Crear la app en Play Console** («Crear app»): idioma español (Latinoamérica), app gratuita.
4. **Vincular el sitio con la app** (para que se abra sin barra de navegador):
   - Sube el `assetlinks.json` que te dio PWABuilder a `/.well-known/assetlinks.json` en este repositorio.
   - Si activas «Firma de apps de Google Play», agrega también la huella SHA-256 que muestra Play Console
     (Configuración → Integridad de la app) en ese mismo archivo.
   - Revisa que abra en el navegador: https://aura-verbal.github.io/.well-known/assetlinks.json
5. **Ficha de Play Store** (textos más abajo), con la imagen destacada, el ícono 512×512 (`icon-512.png`) y
   entre 2 y 8 capturas de la carpeta `capturas`.
6. **Contenido de la app**: política de privacidad (https://aura-verbal.github.io/privacidad.html), seguridad de
   los datos (ver la tabla de abajo), público objetivo (mayores de 18 recomendado, por ser para universitarios),
   sin anuncios.
7. **Prueba cerrada**: las cuentas personales nuevas deben hacer una prueba cerrada con un mínimo de personas
   durante varios días antes de poder publicar (hoy Google pide 12 personas durante 14 días; confírmalo en la
   ayuda de Play Console). Coincide con la prueba con usuarios que ya planificamos: invítalos por correo desde
   «Pruebas → Prueba cerrada».
8. Después de la prueba cerrada, solicita el acceso a producción y publica.

## Textos de la ficha
- **Nombre (máx. 30):** Aura · Habla con seguridad
- **Descripción corta (máx. 80):** Prepara tu disertación y tu entrevista con tu material. Practica sin hablar.
- **Descripción completa:**

> ¿Tienes una disertación o una entrevista de trabajo? Aura te prepara para las dos, con tu propio material.
>
> PRESENTACIONES
> • Sube tu PowerPoint, tu PDF de Canva o tu guion y Aura arma un plan hasta el día que presentas.
> • Practica bloque por bloque: el texto se va desvaneciendo hasta que lo dices de memoria.
> • Ensayos cronometrados por voz: tiempo, ideas clave que dijiste y muletillas.
> • Preguntas del profesor armadas con tu presentación, para responder en voz alta o por escrito.
> • Graba tu presentación en video con teleprompter.
>
> ENTREVISTAS
> • Descubre tus fortalezas, tus debilidades y lo que te mueve, y decide con qué te identificas.
> • Arma tus logros y tus respuestas a las preguntas típicas tocando opciones, sin partir de cero.
> • Simula la entrevista por voz con tus propias respuestas.
> • Arma tu pitch y tu video currículum, y sube tu CV para descubrir lo que no estás aprovechando.
>
> PRACTICA EN CUALQUIER LADO
> ¿En la micro, el metro o el gym? Con el modo silencioso completas huecos y escribes de memoria, sin hablar.
>
> PRIVADO Y GRATIS
> Sin registro. Tus presentaciones, tu CV y tu progreso se guardan en tu celular.

## Seguridad de los datos (formulario de Play)
| Dato | ¿Se recopila? | Nota |
| --- | --- | --- |
| Nombre, CV, textos, archivos | No | Quedan en el celular; Aura no tiene servidor. |
| Audio (dictado) | Lo procesa el servicio de voz del sistema/navegador | Aura no guarda audio. Indícalo según lo que pida el formulario. |
| Uso de la app | No (hoy) | Si se activa GoatCounter, declararlo como «Interacciones en la app», sin identificar a la persona. |
| Ubicación, contactos, pagos | No | — |

Revisa estas respuestas antes de enviarlas: el formulario cambia y la responsabilidad es de quien publica.
