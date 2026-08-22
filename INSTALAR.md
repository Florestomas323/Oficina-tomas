# Cómo instalar una oficina digital nueva

Guía para poner en marcha el sitio de un distribuidor. Toda la parte de código
la resuelve el instalador; lo demás son pasos de configuración que se hacen una
sola vez.

Tiempo estimado: **una hora**, la mayor parte esperando a que Firebase y el
dominio se activen.

-----

## Antes de empezar: qué pedirle al distribuidor

Sin estos datos no se puede instalar. Conviene pedirlos todos de una vez.

|Dato                         |Ejemplo                                  |Para qué                   |
|-----------------------------|-----------------------------------------|---------------------------|
|Nombre y apellido            |María González                           |Toda la página             |
|WhatsApp con código de país  |12145559876                              |Los botones de contacto    |
|Dominio propio               |mariagonzalez.com                        |Enlaces y vistas previas   |
|Correo de Google             |[maria@gmail.com](mailto:maria@gmail.com)|Entrar a su panel          |
|Nombre de su empresa         |Su corporación dentro de Royal Prestige  |Tarjeta de contacto        |
|Usuario de Instagram         |maria_rp                                 |Sección de contacto        |
|Usuario de TikTok            |mariagonzalez_rp                         |Sección de contacto        |
|Enlace de Facebook           |el que comparte su perfil                |Sección de contacto        |
|Ciudades que atiende         |Los Ángeles, San Diego…                  |Textos y datos para Google |
|Prefijo telefónico de su zona|626                                      |Ejemplos de los formularios|

**Y dos textos suyos, que ningún programa puede inventar:**

- **Su lema** — una frase corta que lo represente
- **Su historia** — dos o tres frases sobre cómo trabaja, para la sección «Sobre mí»

Además, **sus fotos**: una del hero (cocinando, **en vertical**), un retrato,
y cuatro de demostraciones o clientes.

> La foto del hero debe ser vertical. Una horizontal pierde el 70% del ancho
> en el teléfono y solo se ve el centro.

-----

## Paso 1 · Crear su proyecto de Firebase

Es donde vivirán sus clientes. Cada distribuidor necesita el suyo: así sus
datos quedan separados de los demás.

1. Entrar en **console.firebase.google.com** y crear un proyecto.
   Nombre sugerido: `oficina-digital-maria`.
1. Activar **Firestore Database** en modo producción.
1. En **Authentication → Sign-in method**, activar **dos** métodos:
- **Google** → para que el distribuidor entre a su panel
- **Anónimo** → para Regala y Gana, el Pasaporte y la Agenda
1. En **Configuración del proyecto → Tus apps**, crear una app web
   y copiar el bloque de configuración. Son seis valores.
1. En **Firestore → Reglas**, pegar el contenido de `firestore-PLANTILLA.rules.txt`
   y publicar.
1. Dentro de esas reglas, cambiar el correo del administrador por el suyo.

> **El acceso anónimo es fácil de olvidar y rompe tres sistemas.** Sin él, nadie
> puede crear un enlace de Regala y Gana, registrarse en el Pasaporte ni
> reservar una demostración. El síntoma es «No se pudo conectar».

-----

## Paso 2 · Preparar los archivos

1. Copiar la carpeta completa del maestro.
1. Abrir `instalador.py` y rellenar el bloque **DISTRIBUIDOR** con los datos
   del paso anterior, incluidos los seis valores de Firebase.
1. Ejecutar:
   
   ```
   python3 instalador.py  /ruta/de/la/copia
   ```
1. Leer el informe final. **Debe decir `0 restos`.**
   Si aparece cualquier resto, no continuar hasta resolverlo.

El instalador cambia unas 440 cosas repartidas en 22 archivos: el nombre en el
texto, el nombre dentro de los enlaces codificados, el nombre partido por
etiquetas, el teléfono, el dominio, las ciudades, el estado, el huso horario,
los ejemplos de los formularios, las redes y Firebase.

**Lo que el instalador NO puede hacer:** su lema y su sección «Sobre mí».
Esos textos hay que cambiarlos a mano en `index.html` y `config.js`, o
arrastrarás los del maestro.

-----

## Paso 3 · Sus fotos

Reemplazar con las suyas, **conservando exactamente los mismos nombres**:

- `foto-hero.jpg` — portada, **vertical**
- `foto-about.jpg` — su retrato
- `foto-galeria-1.jpg` … `foto-galeria-4.jpg`
- `og-image.jpeg` — la que se ve al compartir el enlace (1200 × 630)
- `apple-touch-icon.png`, `icono-oficina-192.png`, `icono-oficina-512.png` — su logo
- `icono-panel.png`, `favicon-oficina.png` — su logo, para el panel

Las fotos de recetas y de premios **no se cambian**: son las mismas para todos.

-----

## Paso 4 · Publicar

1. Crear un repositorio nuevo en GitHub, **privado**, y subir la copia.
1. En Vercel, importar ese repositorio.
1. En **Settings → Domains**, añadir su dominio.
   Si lo compran dentro de Vercel, se conecta solo.
   **Desmarcar** «Redirect apex domains to www»: el dominio principal va sin www.
1. Añadir también `www.sudominio.com`, que Vercel redirige al principal.
1. En **Settings → Deployment Protection**, dejarlo **desactivado**.
   Si queda activo, quien reciba un enlace verá una pantalla de acceso.

-----

## Paso 5 · Configurar su agenda

Antes de entregarle el sitio, entrar a su panel → **Agenda** → **Mi disponibilidad**:

- Marcar los días que atiende y su franja horaria
- Ajustar duración, minutos de traslado y máximo de citas por día
- **Publicar disponibilidad**

Sin esto la agenda funciona con los valores por defecto (lunes a viernes 10–20,
sábado 9–18), que probablemente no sean los suyos.

-----

## Paso 6 · Comprobar antes de entregar

Recorrer esta lista con el sitio ya publicado:

- [ ] La portada carga y muestra su nombre, no el del maestro
- [ ] Su foto se ve completa, sin cortarle la cabeza
- [ ] Un botón de WhatsApp abre con **su** número y su nombre en el mensaje
- [ ] «Guardar mi contacto» descarga su tarjeta
- [ ] El panel abre con **su** cuenta de Google
- [ ] Entrar al panel con **otra** cuenta: debe rechazarla
- [ ] Reservar una demostración de prueba desde `agendar.html`
- [ ] Esa cita aparece en su panel → Agenda
- [ ] Enviar una solicitud desde el Centro de ayuda y ver que llega
- [ ] Dejar una reseña de prueba y aprobarla desde el panel
- [ ] Crear un enlace de Regala y Gana y abrirlo
- [ ] Entrar al Pasaporte y ganar un sello
- [ ] Compartir el enlace por WhatsApp: la vista previa muestra imagen

Si algo de esta lista falla, casi siempre es Firebase: reglas sin publicar,
correo de administrador equivocado, o **acceso anónimo sin activar**.

-----

## Actualizar un sitio ya instalado

Cuando se mejore algo en el maestro:

1. Ejecutar el instalador sobre una copia nueva del maestro, con los datos de
   ese distribuidor.
1. Subir a su repositorio **solo los archivos que cambiaron**.
1. No tocar `config.js` si sus datos no han cambiado.
1. Si el cambio incluye colecciones nuevas de Firebase, publicar también las
   reglas actualizadas en su proyecto.

Nunca editar el código directamente en el sitio de un distribuidor: si se hace,
la próxima actualización lo pisará.

-----

## Lo que el instalador no hace

Requiere atención manual:

- Crear el proyecto de Firebase, activar los dos métodos de acceso y publicar
  sus reglas
- Cambiar las fotos y los iconos
- Conectar el dominio en Vercel
- Escribir su lema y su sección «Sobre mí»
- Configurar su disponibilidad en la Agenda