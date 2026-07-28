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
    "nombre":        "Oscar Navarro",
    "nombreCorto":   "Oscar",
    "apellido":      "Navarro",
    "telefono":      "16265579943",
    "dominio":       "oficina-oscar.vercel.app",
    "correoAdmin":   "unanuevavida85503@gmail.com",
    "calendly":      "PENDIENTE-CALENDARIO",
    "instagram":     "oscar_navarro85503",
    "tiktok":        "SIN-TIKTOK",
    "facebook":      "https://www.facebook.com/oscar.escobar.80531",
    "idDistribuidor":"oscar-ca",
    "repo":          "oficina-digital-oscar",     # repositorio y subdominio de Vercel
    # --- Zona de trabajo ---
    "zonaCorta":     "California",                 # aparece en el pie y en las fichas
    "ciudadBase":    "Los Angeles",                # desde donde se mide el radio de entrega
    "region":        "CA",                         # dos letras del estado
    "areaLarga":     "California",                 # nombre largo de la zona
    "ciudades":      ["Los Angeles","San Diego","San Jose","San Francisco",
                      "Fresno","Sacramento","Long Beach","Anaheim"],
    "estado":        "California",
    "siglaEstado":   "CA",
    "abrevZona":     "California",        # como se abrevia la zona (DFW, SoCal...)
    "husoHorario":   "Hora del Pacifico",
    "prefijoTel":    "626",                        # prefijo de su zona, para los ejemplos
    "cpEjemplo":     "91731",                      # codigo postal de ejemplo
    # Textos tal como se leen en la página. Se escriben completos para que
    # no salgan repeticiones del tipo "California - California".
    "textoPie":      "California",                 # junto al icono de ubicacion
    "textoArea":     "otras ciudades de California",
    "firebase": {
        "apiKey":            "AIzaSyDIHJbgYBLRHa-BAel8bI4GFvtwfvClGP0",
        "authDomain":        "oficina-digital-oscar.firebaseapp.com",
        "projectId":         "oficina-digital-oscar",
        "storageBucket":     "oficina-digital-oscar.firebasestorage.app",
        "messagingSenderId": "373900646510",
        "appId":             "1:373900646510:web:10e6cc6aecb90771eaae7f",
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
    "repo":          "oficina-tomas",
    "zonaCorta":     "DFW, Texas",
    "ciudadBase":    "Dallas",
    "region":        "TX",
    "areaLarga":     "Dallas-Fort Worth",
    "ciudades":      ["Dallas","Irving","Arlington","Grand Prairie",
                      "Farmers Branch","Addison","Plano","Fort Worth"],
    "estado":        "Texas",
    "siglaEstado":   "TX",
    "abrevZona":     "DFW",
    "husoHorario":   "Hora del Centro",
    "prefijoTel":    "682",
    "cpEjemplo":     "76039",
    "textoPie":      "DFW \u2014 Texas",
    "textoArea":     "otras ciudades del \u00e1rea DFW",
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

    # --- El dominio escrito a secas, sin https ni terminacion ---
    # Aparece en la analitica: r.indexOf("tomasflores")
    def raiz(dom):
        d = dom.replace("https://","").replace("http://","").replace("www.","")
        return d.split(".")[0]
    rm, rd = raiz(MAESTRO["dominio"]), raiz(DISTRIBUIDOR["dominio"])
    if rm and rm != rd:
        R.append(('"' + rm + '"', '"' + rd + '"'))
        R.append(("'" + rm + "'", "'" + rd + "'"))

    # --- Ejemplos dentro de los formularios ---
    # "Ej. 682 381 1576" / "Ej. 682 555 0134" -> prefijo de su zona
    R.append(('Ej. ' + MAESTRO["telefono"][1:4] + ' ' + MAESTRO["telefono"][4:7] + ' ' + MAESTRO["telefono"][7:],
              'Ej. ' + DISTRIBUIDOR["telefono"][1:4] + ' ' + DISTRIBUIDOR["telefono"][4:7] + ' ' + DISTRIBUIDOR["telefono"][7:]))
    R.append(('Ej. ' + MAESTRO["prefijoTel"] + ' 555 0134',
              'Ej. ' + DISTRIBUIDOR["prefijoTel"] + ' 555 1234'))
    R.append(('Ej. ' + MAESTRO["cpEjemplo"], 'Ej. ' + DISTRIBUIDOR["cpEjemplo"]))

    # --- Textos de zona escritos completos: van primero de todo ---
    for k in ["textoPie", "textoArea"]:
        R.append((MAESTRO[k], DISTRIBUIDOR[k]))
        for vv, nn in variantes(MAESTRO[k], DISTRIBUIDOR[k])[1:]:
            R.append((vv, nn))

    # --- Geografía: primero las frases compuestas, que son las que más fallan ---
    ME, DE = MAESTRO, DISTRIBUIDOR
    compuestas = [
        # "Dallas-Fort Worth, Texas"  /  "Dallas–Fort Worth"
        (f'{ME["areaLarga"]}, {ME["estado"]}',      f'{DE["areaLarga"]}, {DE["estado"]}'),
        (ME["areaLarga"].replace("-", "\u2013"),    DE["areaLarga"].replace("-", "\u2013")),
        # "DFW — Texas"  /  "DFW, Texas"  /  "area DFW"  /  "DFW"
        (f'{ME["abrevZona"]} \u2014 {ME["estado"]}', f'{DE["abrevZona"]} \u2014 {DE["estado"]}'),
        (f'{ME["abrevZona"]}, {ME["estado"]}',      f'{DE["abrevZona"]}, {DE["estado"]}'),
        (f'\u00e1rea {ME["abrevZona"]}',            f'\u00e1rea {DE["abrevZona"]}'),
        (f'&aacute;rea {ME["abrevZona"]}',          f'&aacute;rea {DE["abrevZona"]}'),
        # "Dallas, Texas"  (ciudad base con estado)
        (f'{ME["ciudadBase"]}, {ME["estado"]}',     f'{DE["ciudadBase"]}, {DE["estado"]}'),
        # Huso horario
        (ME["husoHorario"],                          DE["husoHorario"]),
    ]
    for v, n in compuestas:
        R.append((v, n))
        for vv, nn in variantes(v, n)[1:]:
            R.append((vv, nn))

    # --- Geografía: listas de ciudades, zona y región ---
    cM, cD = MAESTRO["ciudades"], DISTRIBUIDOR["ciudades"]
    # Lista separada por comas dentro de un texto
    R.append((", ".join(cM[:-1]) + " y " + cM[-1],
              ", ".join(cD[:-1]) + " y " + cD[-1]))
    R.append((", ".join(cM), ", ".join(cD)))
    # Lista en formato JSON de los datos estructurados
    R.append(('"' + '","'.join(cM) + '"', '"' + '","'.join(cD) + '"'))
    # Ciudades sueltas que puedan quedar
    for i, ciudad in enumerate(cM):
        destino = cD[i] if i < len(cD) else cD[0]
        R.append((ciudad, destino))
    # Zona, region y area
    for k in ["zonaCorta", "areaLarga", "ciudadBase"]:
        R.extend(variantes(MAESTRO[k], DISTRIBUIDOR[k]))
    R.append(('"addressRegion":"' + MAESTRO["region"] + '"',
              '"addressRegion":"' + DISTRIBUIDOR["region"] + '"'))
    R.append((", " + MAESTRO["region"], ", " + DISTRIBUIDOR["region"]))
    R.append(("area " + MAESTRO["zonaCorta"].split(",")[0], "area " + DISTRIBUIDOR["zonaCorta"]))

    # Estado y sigla, ya sueltos
    R.extend(variantes(MAESTRO["estado"], DISTRIBUIDOR["estado"]))
    R.append((MAESTRO["abrevZona"], DISTRIBUIDOR["abrevZona"]))
    R.append(('placeholder="' + MAESTRO["siglaEstado"] + '"',
              'placeholder="' + DISTRIBUIDOR["siglaEstado"] + '"'))

    # --- Datos sueltos, del más largo al más corto ---
    simples = ["calendly", "facebook", "correoAdmin", "nombre", "dominio",
               "telefono", "repo", "instagram", "tiktok", "idDistribuidor", "nombreCorto"]
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
        "ciudad base":      MAESTRO["ciudadBase"],
        "zona":             MAESTRO["zonaCorta"],
        "nombre del repo":  MAESTRO["repo"],
        "prefijo telefónico": "Ej. " + MAESTRO["prefijoTel"],
        "raiz del dominio":   MAESTRO["dominio"].replace("https://","").split(".")[0],
        "estado":           MAESTRO["estado"],
        "abreviatura zona": MAESTRO["abrevZona"],
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
