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
EXACTO, DELTA = None, 0
from urllib.parse import quote

# ============================================================
#  DATOS DEL DISTRIBUIDOR NUEVO — lo único que se edita
# ============================================================
DISTRIBUIDOR = {
    "nombre":        "NOMBRE APELLIDO",
    "nombreCorto":   "NOMBRE",
    "apellido":      "APELLIDO",
    "nombreAcento":      "NOMBRE APELLIDO",   # con acentos, si los lleva
    "nombreCortoAcento": "NOMBRE",
    "telefono":      "1XXXXXXXXXX",           # con codigo de pais, sin signos
    "dominio":       "sudominio.com",
    "correoAdmin":   "sucorreo@gmail.com",    # el de Google, para entrar al panel
    "calendly":      "PENDIENTE-CALENDARIO",
    "instagram":     "usuario_ig",
    "tiktok":        "SIN-TIKTOK",
    "facebook":      "https://www.facebook.com/su-perfil",
    "idDistribuidor":"nombre-zona",
    "repo":          "oficina-digital-nombre",
    # --- Marca propia ---
    "empresa":       "SU EMPRESA",            # su corporacion dentro de Royal Prestige
    "socio":         "",                      # pareja o socio; vacio si trabaja solo
    # --- Notificaciones del panel (opcional) ---
    # Se genera con:  npx web-push generate-vapid-keys
    # Vacio = el panel funciona igual, pero sin avisos push.
    "vapidPublica":  "",
    # --- Zona de trabajo ---
    "zonaCorta":     "SU ZONA",
    "ciudadBase":    "SU CIUDAD",
    "region":        "XX",
    "areaLarga":     "SU AREA",
    "ciudades":      ["Ciudad1","Ciudad2","Ciudad3","Ciudad4",
                      "Ciudad5","Ciudad6","Ciudad7","Ciudad8"],
    "estado":        "SU ESTADO",
    "siglaEstado":   "XX",
    "abrevZona":     "SU ZONA",
    "husoHorario":   "Hora del Centro",
    "prefijoTel":    "000",
    "cpEjemplo":     "00000",
    "textoPie":      "SU ZONA",
    "textoArea":     "otras ciudades de SU AREA",
    # --- Paleta. Cambiala entera y el sitio cambia de color sin tocar CSS ---
    # Los tonos que no estan aqui se recalculan solos girando el tono.
    "paleta": {
        "fondo":          "#0A0812",   # fondo general
        "card":           "#171226",   # tarjetas y paneles
        "acento":         "#8B5CF6",   # color principal (marca el giro de tono)
        "acentoBrillante":"#9B6BF5",   # arranque del degradado
        "acentoMedio":    "#7C3AED",   # centro del degradado
        "acentoProfundo": "#5B21B6",   # final del degradado
        "acentoClaro":    "#C9A9FF",   # textos y iconos de acento
        "texto":          "#F5F3FA",   # texto principal
        "textoSuave":     "#A9A3C2",   # texto secundario
        "plata":          "#D8D5E8",   # detalles metalicos
        "borde":          "196,167,255",  # hilo de los bordes, en rgb
    },
    "firebase": {
        "apiKey":            "PEGAR-DE-SU-FIREBASE",
        "authDomain":        "oficina-digital-nombre.firebaseapp.com",
        "projectId":         "oficina-digital-nombre",
        "storageBucket":     "oficina-digital-nombre.firebasestorage.app",
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
    "repo":          "oficina-tomas",
    "empresa":       "Impact Enterprises",
    "socio":         "Angiemar Paredes",
    # El nombre tambien aparece escrito con acento en varias paginas
    "nombreAcento":      "Tom\u00e1s Flores",
    "nombreCortoAcento": "Tom\u00e1s",
    "vapidPublica":  "BEgTY0Dot5hBxapYRjg5E-OJ4AhblzEdt5Zm57D3Uh1pCB4iozk_pj-Bu07H8kIBvAoAQlyuhg24iVudM7eH4Js",
    "paleta": {
        "fondo":          "#0A0812",
        "card":           "#171226",
        "acento":         "#8B5CF6",
        "acentoBrillante":"#9B6BF5",
        "acentoMedio":    "#7C3AED",
        "acentoProfundo": "#5B21B6",
        "acentoClaro":    "#C9A9FF",
        "texto":          "#F5F3FA",
        "textoSuave":     "#A9A3C2",
        "plata":          "#D8D5E8",
        "borde":          "196,167,255",
    },
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


    def rgb(hx):
        hx = hx.lstrip("#")
        return "%d,%d,%d" % (int(hx[0:2],16), int(hx[2:4],16), int(hx[4:6],16))

    # --- El nombre con acento, antes que el nombre a secas ---
    R.extend(variantes(MAESTRO["nombreAcento"], DISTRIBUIDOR["nombreAcento"]))
    R.extend(variantes(MAESTRO["nombreCortoAcento"], DISTRIBUIDOR["nombreCortoAcento"]))

    # --- Empresa y socio ---
    R.extend(variantes(MAESTRO["empresa"], DISTRIBUIDOR["empresa"]))
    if MAESTRO["socio"]:
        nuevo_socio = DISTRIBUIDOR["socio"] or DISTRIBUIDOR["nombre"]
        R.extend(variantes(MAESTRO["socio"], nuevo_socio))
        # El socio tambien aparece solo con su nombre de pila
        pila_m = MAESTRO["socio"].split(" ")[0]
        pila_d = nuevo_socio.split(" ")[0]
        R.extend(variantes(pila_m, pila_d))

    # --- Clave publica de notificaciones ---
    if MAESTRO["vapidPublica"]:
        R.append((MAESTRO["vapidPublica"], DISTRIBUIDOR["vapidPublica"]))

    # --- Paleta: se repinta aparte, en recolorear() ---

    # Ordenar por longitud descendente evita que una regla corta
    # destroce una larga (por ejemplo "Tomas" dentro de "Tomas Flores")
    R.sort(key=lambda x: len(x[0]), reverse=True)
    return R



# ============================================================
#  LOGROS PERSONALES
#  Los reconocimientos del maestro no se pueden heredar: son suyos.
#  Dejarlos seria publicidad falsa. Esta funcion los sustituye por
#  textos neutros para que el distribuidor nuevo escriba los propios.
# ============================================================
LOGROS = [
    # (lo que dice el maestro, con que se sustituye)
    ("Blue Network",                       "TU NIVEL AQUI"),
    ("Royal Lion",                         "TU RECONOCIMIENTO AQUI"),
    ("Mejores novatos del territorio de Texas, 2023 \u2014 nuestro primer reconocimiento dentro de Royal Prestige.",
     "TU PRIMER RECONOCIMIENTO AQUI \u2014 sustituye este texto y la foto."),
    ("Mi primera convenci\u00f3n nacional \u2014 The Grand Convention, New Orleans.",
     "TU PRIMERA CONVENCI\u00d3N AQUI \u2014 sustituye este texto y la foto."),
    ("The Grand Convention, New Orleans",  "TU CONVENCION AQUI"),
    ("New Orleans",                        "TU CIUDAD AQUI"),
]

def neutralizar_logros(carpeta):
    """Quita los reconocimientos del maestro de la pagina de reclutamiento."""
    ruta = os.path.join(carpeta, "trabaja-conmigo.html")
    if not os.path.isfile(ruta):
        return 0
    with open(ruta, encoding="utf-8") as fh:
        t = fh.read()
    n = 0
    for viejo, nuevo in LOGROS:
        if viejo in t:
            n += t.count(viejo)
            t = t.replace(viejo, nuevo)
    if n:
        with open(ruta, "w", encoding="utf-8") as fh:
            fh.write(t)
    return n



# ============================================================
#  REPINTADO DE LA PALETA
#  ------------------------------------------------------------
#  El sitio usa unos 40 tonos distintos del mismo morado. Cambiarlos
#  uno a uno seria interminable y se escaparia alguno, asi que en vez
#  de eso se rota el TONO de cada color que caiga en la banda morada,
#  conservando su claridad y su saturacion. Un gris azulado sigue
#  siendo un gris azulado; un morado intenso sigue siendo intenso.
#
#  Los verdes de exito, los rojos de error y los ambar de aviso quedan
#  fuera de la banda, asi que no se tocan: siguen significando lo mismo.
# ============================================================
import colorsys

BANDA = (232, 308)      # grados de tono que se consideran "morado del maestro"

def _hex_a_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def _tono(r, g, b):
    return colorsys.rgb_to_hls(r/255, g/255, b/255)[0] * 360

def _rotar(r, g, b, delta):
    h, l, sat = colorsys.rgb_to_hls(r/255, g/255, b/255)
    h = ((h*360 + delta) % 360) / 360
    rr, gg, bb = colorsys.hls_to_rgb(h, l, sat)
    return round(rr*255), round(gg*255), round(bb*255)

def construir_repintado():
    """Devuelve (mapa_exacto, delta_de_tono) o (None, 0) si no cambia la paleta."""
    pm, pd = MAESTRO["paleta"], DISTRIBUIDOR["paleta"]
    if all(pm[k] == pd.get(k, pm[k]) for k in pm):
        return None, 0
    exacto = {}
    for k, viejo in pm.items():
        if k == "borde":
            continue
        nuevo = pd.get(k, viejo)
        if nuevo != viejo:
            exacto[viejo.upper()] = nuevo.upper()
    delta = _tono(*_hex_a_rgb(pd.get("acento", pm["acento"]))) - _tono(*_hex_a_rgb(pm["acento"]))
    return exacto, delta

def recolorear(texto, exacto, delta):
    if exacto is None:
        return texto, 0
    cambios = [0]

    def en_hex(m):
        crudo = m.group(1).upper()
        if crudo in exacto:
            cambios[0] += 1
            return "#" + exacto[crudo]
        r, g, b = _hex_a_rgb(crudo)
        h, l, sat = colorsys.rgb_to_hls(r/255, g/255, b/255)
        if sat < 0.05 or not (BANDA[0] <= h*360 <= BANDA[1]):
            return m.group(0)
        cambios[0] += 1
        return "#%02X%02X%02X" % _rotar(r, g, b, delta)

    texto = re.sub(r"#([0-9A-Fa-f]{6})\b", en_hex, texto)

    def en_rgba(m):
        r, g, b = int(m.group("r")), int(m.group("g")), int(m.group("b"))
        h, l, sat = colorsys.rgb_to_hls(r/255, g/255, b/255)
        if sat < 0.05 or not (BANDA[0] <= h*360 <= BANDA[1]):
            return m.group(0)
        cambios[0] += 1
        nr, ng, nb = _rotar(r, g, b, delta)
        return "%s(%d,%d,%d" % (m.group("fn"), nr, ng, nb)

    texto = re.sub(r"(?P<fn>rgba?)\(\s*(?P<r>\d{1,3})\s*,\s*(?P<g>\d{1,3})\s*,\s*(?P<b>\d{1,3})",
                   en_rgba, texto)
    return texto, cambios[0]


def instalar(carpeta):
    if not os.path.isdir(carpeta):
        print("No existe la carpeta:", carpeta); return 1

    reglas = construir_reglas()
    global EXACTO, DELTA
    EXACTO, DELTA = construir_repintado()
    archivos = []
    for raiz, _, ficheros in os.walk(carpeta):
        if ".git" in raiz: continue
        for f in ficheros:
            if f.endswith((".html", ".js", ".json", ".txt", ".xml", ".md", ".webmanifest")):
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
        if ruta.endswith((".html", ".css", ".js", ".webmanifest")):
            texto, nc = recolorear(texto, EXACTO, DELTA)
            n += nc
        if texto != original:
            with open(ruta, "w", encoding="utf-8") as fh:
                fh.write(texto)
            tocados += 1; total += n
            print(f"  {os.path.relpath(ruta, carpeta):<34} {n:>4} cambios")

    nl = neutralizar_logros(carpeta)
    if nl:
        print(f"  trabaja-conmigo.html               {nl:>4} logros neutralizados")

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

    # --- Comprobaciones anadidas: marca propia, push y paleta ---
    extras = [("empresa", MAESTRO["empresa"]),
              ("clave push", MAESTRO["vapidPublica"]),
              ("logros del maestro", "Blue Network")]
    for col in MAESTRO["paleta"].values():
        extras.append(("color " + col, col))
    for etiqueta, aguja in extras:
        if not aguja:
            continue
        cuantos = 0
        for ruta in archivos:
            with open(ruta, encoding="utf-8", errors="ignore") as fh:
                cuantos += fh.read().count(aguja)
        print(f"  {etiqueta:<20} {'limpio' if cuantos == 0 else str(cuantos) + ' restos'}")


if __name__ == "__main__":
    sys.exit(instalar(sys.argv[1] if len(sys.argv) > 1 else "."))
