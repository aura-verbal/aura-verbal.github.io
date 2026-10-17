# Aura · países y muletillas. Genera data/paises.json
# Capas: "completa" (revisada), "borrador" (redactada, falta revisor nativo), "neutra" (solo español neutro).
import json, os, sys
OUT = sys.argv[1]

ESTE_SIGUE = ["yo", "tu", "el", "la", "los", "las", "un", "una", "que", "pues", "o", "no", "si", "en", "de",
              "a", "eh", "este", "bueno", "entonces", "me", "nos", "se", "lo", "le", "como", "mi", "para",
              "por", "con", "y", "mm", "ah", "ya"]

data = {
  "comunes": ["o sea", "osea", "eh", "ehh", "ehhh", "em", "emm", "mm", "mmm", "literal", "basicamente",
              {"w": "tipo", "noSigue": ["de", "del"]}],
  "paises": [
    {"id": "CL", "nombre": "Chile", "bandera": "🇨🇱", "voz": "es-CL", "trato": "tú", "capa": "completa",
     "muletillas": ["cachai", "cachay", "po", "como que", "como onda", "es que nada"]},
    {"id": "MX", "nombre": "México", "bandera": "🇲🇽", "voz": "es-MX", "trato": "tú", "capa": "borrador",
     "muletillas": [{"w": "este", "siSigue": ESTE_SIGUE, "fin": True}, "guey", "wey", {"w": "pues", "inicio": True}]},
    {"id": "CO", "nombre": "Colombia", "bandera": "🇨🇴", "voz": "es-CO", "trato": "usted", "capa": "borrador",
     "muletillas": ["parce", "parcero", "me entiende", "me entiendes", {"w": "pues", "inicio": True, "fin": True}]},
    {"id": "AR", "nombre": "Argentina", "bandera": "🇦🇷", "voz": "es-AR", "trato": "vos", "capa": "borrador",
     "muletillas": ["che", {"w": "viste", "noSigue": ["la", "el", "los", "las", "a", "al", "un", "una"]},
                    {"w": "nada", "inicio": True}, "boludo", "digamos"]},
    {"id": "BO", "nombre": "Bolivia", "bandera": "🇧🇴", "voz": "es-BO", "trato": "tú", "capa": "neutra", "muletillas": []},
    {"id": "CR", "nombre": "Costa Rica", "bandera": "🇨🇷", "voz": "es-CR", "trato": "usted", "capa": "neutra", "muletillas": []},
    {"id": "CU", "nombre": "Cuba", "bandera": "🇨🇺", "voz": "es-US", "trato": "tú", "capa": "neutra", "muletillas": []},
    {"id": "EC", "nombre": "Ecuador", "bandera": "🇪🇨", "voz": "es-EC", "trato": "tú", "capa": "neutra", "muletillas": []},
    {"id": "SV", "nombre": "El Salvador", "bandera": "🇸🇻", "voz": "es-SV", "trato": "vos", "capa": "neutra", "muletillas": []},
    {"id": "ES", "nombre": "España", "bandera": "🇪🇸", "voz": "es-ES", "trato": "tú", "capa": "neutra", "muletillas": []},
    {"id": "US", "nombre": "Estados Unidos", "bandera": "🇺🇸", "voz": "es-US", "trato": "tú", "capa": "neutra", "muletillas": []},
    {"id": "GT", "nombre": "Guatemala", "bandera": "🇬🇹", "voz": "es-GT", "trato": "vos", "capa": "neutra", "muletillas": []},
    {"id": "HN", "nombre": "Honduras", "bandera": "🇭🇳", "voz": "es-HN", "trato": "vos", "capa": "neutra", "muletillas": []},
    {"id": "NI", "nombre": "Nicaragua", "bandera": "🇳🇮", "voz": "es-NI", "trato": "vos", "capa": "neutra", "muletillas": []},
    {"id": "PA", "nombre": "Panamá", "bandera": "🇵🇦", "voz": "es-PA", "trato": "tú", "capa": "neutra", "muletillas": []},
    {"id": "PY", "nombre": "Paraguay", "bandera": "🇵🇾", "voz": "es-PY", "trato": "vos", "capa": "neutra", "muletillas": []},
    {"id": "PE", "nombre": "Perú", "bandera": "🇵🇪", "voz": "es-PE", "trato": "tú", "capa": "neutra", "muletillas": []},
    {"id": "PR", "nombre": "Puerto Rico", "bandera": "🇵🇷", "voz": "es-PR", "trato": "tú", "capa": "neutra", "muletillas": []},
    {"id": "DO", "nombre": "República Dominicana", "bandera": "🇩🇴", "voz": "es-DO", "trato": "tú", "capa": "neutra", "muletillas": []},
    {"id": "UY", "nombre": "Uruguay", "bandera": "🇺🇾", "voz": "es-UY", "trato": "vos", "capa": "neutra", "muletillas": []},
    {"id": "VE", "nombre": "Venezuela", "bandera": "🇻🇪", "voz": "es-VE", "trato": "tú", "capa": "neutra", "muletillas": []},
  ]
}
os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, "paises.json"), "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)
print("paises:", len(data["paises"]))
