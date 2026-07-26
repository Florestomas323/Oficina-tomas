#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
INSTALADOR DE OFICINA DIGITAL
=============================

Prepara una copia completa del sitio para un distribuidor nuevo.

Resuelve los tres casos que una búsqueda normal deja escapar:
  1. El nombre escrito de forma corriente        ->  Tomas Flores
  2. El nombre codificado dentro de un enlace    ->  Hola%20Tomas%20
  3. El nombre partido por una etiqueta HTML     ->  Tomas<br>Flores

CÓMO SE USA
-----------
  1. Rellena el bloque DISTRIBUIDOR de más abajo.
  2. Ejecuta:  python3 instalador.py  /ruta/de/la/copia
  3. Revisa el informe final: debe decir "0 restos".

El instalador NO toca el sitio original: trabaja sobre la carpeta que le indiques.
"""

import os, re, sys, glob
from urllib.parse import quote

# ============================================================
#  DATOS DEL DISTRIBUIDOR NUEVO — lo único que se edita
# ============================================================
DISTRIBUIDOR = {
    "nombre":        "María González",
    "nombreCorto":   "María",
    "apellido":      "González",
    "telefono":      "12145559876",
    "dominio":       "mariagonzalez.com",
    "correoAdmin":   "maria.gonzalez@gmail.com",
    "calendly":      "https://calendly.com/mariagonzalez/demo-royal",
    "instagram":     "maria_rp",
    "tiktok":        "mariagonzalez_rp",
    "facebook":      "https://www.facebook.com/share/EJEMPLO/",
    "idDistribuidor":"maria-dfw",
    "firebase": {
        "apiKey":            "PENDIENTE",
        "authDomain":        "oficina-digital-maria.firebaseapp.com",
        "projectId":         "oficina-digital-maria",
        "storageBucket":     "oficina-digital-maria.firebasestorage.app",
        "messagingSenderId": "000000000000",
        "appId":             "1:000000000000:web:0000000000000000000000",
    },
}

# ============================================================
#  DATOS DEL MAESTRO — no se cambian
# ============================================================
MAESTRO = {
    "nombre":        "Tomas Flores",
    "nombreCorto":   "Tomas",
    "apellido":      "Flores",
    "telefono":      "16823811576",
    "dominio":       "tomasflores.com",
    "correoAdmin":   "florestomas323@gmail.com",
    "calendly":      "https://calendly.com/florestomas/demo-royal",
    "instagram":     "tomasflores_23",
    "tiktok":        "titoflores45",
    "facebook":      "https://www.facebook.com/share/1E2SByaNAR/",
    "idDistribuidor":"tomas-dfw",
    "firebase": {
        "apiKey":            "AIzaSyD5EuL7wMb95SRafwcvmBThK5jv-d6H_jA",
        "authDomain":        "oficina-digital-tomas.firebaseapp.com",
        "projectId":         "oficina-digital-tomas",
        "storageBucket":     "oficina-digital-tomas.firebasestorage.app",
        "messagingSenderId": "898342341243",
        "appId":             "1:898342341243:web:7ee15b8b3533f3889570de",
    },
}


def variantes(viejo, nuevo):
    """Todas las formas en que un texto puede aparecer dentro del sitio."""
    v = []
    # 1. Tal cual
    v.append((viejo, nuevo))
    # 2. Codificado para un enlace:  Tomas Flores -> Tomas%20Flores
    if quote(viejo) != viejo:
        v.append((quote(viejo), quote(nuevo)))
    # 3. Codificado con + en lugar de espacio
    if " " in viejo:
        v.append((viejo.replace(" ", "+"), nuevo.replace(" ", "+")))
    # 4. Escapado dentro de JavaScript:  \u00e1 etc.
    esc_v = viejo.encode("unicode_escape").decode("ascii")
    esc_n = nuevo.encode("unicode_escape").decode("ascii")
    if esc_v != viejo:
        v.append((esc_v, esc_n))
    # 5. Entidades HTML para los acentos
    ent_v = viejo.encode("ascii", "xmlcharrefreplace").decode("ascii")
    ent_n = nuevo.encode("ascii", "xmlcharrefreplace").decode("ascii")
    if ent_v != viejo:
        v.append((ent_v, ent_n))
    return v


def construir_reglas():
    """Lista ordenada de sustituciones. Lo más largo primero, siempre."""
    R = []

    # --- Nombre partido por una etiqueta: Tomas<br>Flores, Tomas<b>Flores</b> ---
    for etiqueta in ["br", "b", "span", "strong", "wbr"]:
        R.append((
            f'{MAESTRO["nombreCorto"]}<{etiqueta}>{MAESTRO["apellido"]}',
            f'{DISTRIBUIDOR["nombreCorto"]}<{etiqueta}>{DISTRIBUIDOR["apellido"]}'
        ))
        R.append((
            f'{MAESTRO["nombreCorto"]}<{etiqueta}/>{MAESTRO["apellido"]}',
            f'{DISTRIBUIDOR["nombreCorto"]}<{etiqueta}/>{DISTRIBUIDOR["apellido"]}'
        ))

    # --- Nombre de archivo de la tarjeta de contacto ---
    # Sin espacios ni acentos, para que ningún teléfono lo rechace
    def sin_espacios(t):
        import unicodedata
        t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode("ascii")
        return re.sub(r"[^A-Za-z0-9]+", "-", t).strip("-")
    R.append((
        f'{MAESTRO["nombreCorto"]}-{MAESTRO["apellido"]}-Royal-Prestige.vcf',
        f'{sin_espacios(DISTRIBUIDOR["nombreCorto"])}-{sin_espacios(DISTRIBUIDOR["apellido"])}-Royal-Prestige.vcf'
    ))
    # --- Tarjeta de contacto: apellido;nombre ---
    R.append((
        f'N:{MAESTRO["apellido"]};{MAESTRO["nombreCorto"]};;;',
        f'N:{DISTRIBUIDOR["apellido"]};{DISTRIBUIDOR["nombreCorto"]};;;'
    ))

    # --- Firebase, campo por campo ---
    for k in MAESTRO["firebase"]:
        R.append((MAESTRO["firebase"][k], DISTRIBUIDOR["firebase"][k]))

    # --- Datos sueltos, del más largo al más corto ---
    simples = ["calendly", "facebook", "correoAdmin", "nombre", "dominio",
               "telefono", "instagram", "tiktok", "idDistribuidor", "nombreCorto"]
    for k in simples:
        R.extend(variantes(MAESTRO[k], DISTRIBUIDOR[k]))

    # Ordenar por longitud descendente evita que una regla corta
    # destroce una larga (por ejemplo "Tomas" dentro de "Tomas Flores")
    R.sort(key=lambda x: len(x[0]), reverse=True)
    return R


def instalar(carpeta):
    if not os.path.isdir(carpeta):
        print("No existe la carpeta:", carpeta); return 1

    reglas = construir_reglas()
    archivos = []
    for raiz, _, ficheros in os.walk(carpeta):
        if ".git" in raiz: continue
        for f in ficheros:
            if f.endswith((".html", ".js", ".json", ".txt", ".xml", ".md")):
                archivos.append(os.path.join(raiz, f))

    print(f"INSTALANDO OFICINA PARA: {DISTRIBUIDOR['nombre']}")
    print(f"  carpeta : {carpeta}")
    print(f"  archivos: {len(archivos)}")
    print(f"  reglas  : {len(reglas)}\n")

    total, tocados = 0, 0
    for ruta in sorted(archivos):
        with open(ruta, encoding="utf-8") as fh:
            texto = fh.read()
        original, n = texto, 0
        for viejo, nuevo in reglas:
            if viejo and viejo in texto:
                n += texto.count(viejo)
                texto = texto.replace(viejo, nuevo)
        if texto != original:
            with open(ruta, "w", encoding="utf-8") as fh:
                fh.write(texto)
            tocados += 1; total += n
            print(f"  {os.path.relpath(ruta, carpeta):<34} {n:>4} cambios")

    print(f"\n  {tocados} archivos actualizados · {total} sustituciones\n")
    return revisar(carpeta, archivos)


def revisar(carpeta, archivos):
    """Busca cualquier rastro del maestro que se haya quedado atrás."""
    print("REVISIÓN FINAL")
    rastros = {
        "nombre completo":  MAESTRO["nombre"],
        "nombre corto":     MAESTRO["nombreCorto"],
        "teléfono":         MAESTRO["telefono"],
        "dominio":          MAESTRO["dominio"],
        "correo":           MAESTRO["correoAdmin"],
        "clave de Firebase":MAESTRO["firebase"]["apiKey"],
        "proyecto Firebase":MAESTRO["firebase"]["projectId"],
        "Instagram":        MAESTRO["instagram"],
        "TikTok":           MAESTRO["tiktok"],
    }
    problemas = 0
    for etiqueta, aguja in rastros.items():
        # También en sus formas codificadas
        formas = [a for a, _ in variantes(aguja, aguja)]
        encontrados = []
        for ruta in archivos:
            with open(ruta, encoding="utf-8") as fh:
                t = fh.read()
            for forma in formas:
                if forma in t:
                    encontrados.append((os.path.relpath(ruta, carpeta), t.count(forma)))
                    break
        if encontrados:
            problemas += sum(n for _, n in encontrados)
            print(f"  {etiqueta:<20} RESTOS: " + ", ".join(f"{f} ({n})" for f, n in encontrados[:4]))
        else:
            print(f"  {etiqueta:<20} limpio")

    print()
    if problemas:
        print(f"  RESULTADO: {problemas} restos. NO instalar hasta resolverlos.")
        return 1
    print("  RESULTADO: 0 restos. La copia está lista.")
    print("\n  Falta a mano: fotos propias, dominio en Vercel y reglas en su Firebase.")
    return 0


if __name__ == "__main__":
    sys.exit(instalar(sys.argv[1] if len(sys.argv) > 1 else "."))
