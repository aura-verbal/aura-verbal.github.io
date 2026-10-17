# Herramientas de contenido

El contenido de `data/` se genera con estos scripts. Para editar un escenario o un país:

1. Cambia el texto en `contenido_escenarios.py`, `escenarios_nuevos.py` o `contenido_paises.py`.
2. Regenera los archivos:
   ```
   python3 herramientas/contenido_paises.py data
   python3 herramientas/contenido_escenarios.py data
   ```
3. Revisa que todo esté bien: `node herramientas/pruebas_contenido.js` (debe terminar en `ERRORS 0`).
