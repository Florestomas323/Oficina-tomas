# Cómo instalar una oficina digital nueva

Guía para poner en marcha el sitio de un distribuidor. Toda la parte de código
la resuelve el instalador; lo demás son pasos de configuración que se hacen una
sola vez.

Tiempo estimado: **una hora**, la mayor parte esperando a que Firebase y el
dominio se activen.

-----

## Antes de empezar: qué pedirle al distribuidor

Sin estos datos no se puede instalar. Convie pedirlos todos de una vez.

|Dato                       |Ejemplo                                  |Para qué                  |
|---------------------------|-----------------------------------------|--------------------------|
|Nombre y apellido          |María González                           |Toda la página            |
|WhatsApp con código de país|12145559876                              |Los 37 botones de contacto|
|Dominio propio             |mariagonzalez.com                        |Enlaces y vistas previas  |
|Correo de Google           |[maria@gmail.com](mailto:maria@gmail.com)|Entrar a su panel         |
|Usuario de Instagram       |maria_rp                                 |Sección de contacto       |
|Usuario de TikTok          |mariagonzalez_rp                         |Sección de contacto       |
|Enlace de Facebook         |(el que comparte su perfil)              |Tarjeta de contacto       |
|Enlace de Calendly         |calendly.com/maria/demo                  |Reservar demostración     |

Además, **sus fotos**: una del hero (cocinando), un retrato para «Sobre mí»,
y cuatro para la galería.

-----

## Paso 1 · Crear su proyecto de Firebase

Es donde vivirán sus clientes. Cada distribuidor necesita el suyo: así sus
datos quedan separados de los demás.

1. Entrar en **console.firebase.google.com** y crear un proyecto.
   Nombre sugerido: `oficina-digital-maria`.
1. Activar **Firestore Database** en modo producción.
1. Activar **Authentication** → método **Google**.
1. En **Configuración del proyecto → Tus apps**, crear una app web
   y copiar el bloque de configuración. Son seis valores.
1. En **Firestore → Reglas**, pegar el contenido de `firestore.rules.txt`
   y publicar.
1. Dentro de esas reglas, cambiar el correo del administrador por el suyo.

> Si este paso se salta o se hace a medias, el sitio carga pero no guarda nada.

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

El instalador cambia unas 365 cosas repartidas en 21 archivos: el nombre en el
texto, el nombre dentro de los enlaces codificados, el nombre partido por
etiquetas, el teléfono, el dominio, el correo, las redes y Firebase.

-----

## Paso 3 · Sus fotos

Reemplazar con las suyas, **conservando exactamente los mismos nombres**:

- `foto-hero.jpg` — la de portada
- `foto-about.jpg` — su retrato
- `foto-galeria-1.jpg` … `foto-galeria-4.jpg`
- `og-image.jpeg` — la que se ve al compartir el enlace (1200 × 630)
- `apple-touch-icon.png`, `icono-oficina-192.png`, `icono-oficina-512.png`

Las fotos de recetas y de premios **no se cambian**: son las mismas para todos.

-----

## Paso 4 · Publicar

1. Crear un repositorio nuevo en GitHub y subir la copia.
1. En Vercel, importar ese repositorio.
1. En **Settings → Domains**, añadir su dominio y seguir las instrucciones
   de DNS que aparezcan.
1. En **Settings → Deployment Protection**, dejarlo **desactivado**.
   Si queda activo, quien reciba un enlace verá una pantalla de acceso.

-----

## Paso 5 · Comprobar antes de entregar

Recorrer esta lista con el sitio ya publicado:

- [ ] La portada carga y muestra su nombre, no el del maestro
- [ ] Un botón de WhatsApp abre con **su** número y su nombre en el mensaje
- [ ] «Guardar mi contacto» descarga su tarjeta
- [ ] El panel abre con **su** cuenta de Google
- [ ] Enviar una solicitud de prueba desde el Centro de ayuda
- [ ] Esa solicitud aparece en su panel
- [ ] Dejar una reseña de prueba y aprobarla desde el panel
- [ ] Crear un enlace de Regala y Gana y abrirlo
- [ ] Entrar al Pasaporte y ganar un sello
- [ ] Compartir el enlace por WhatsApp: la vista previa muestra imagen
- [ ] Reservar demostración abre **su** calendario

Si algo de esta lista falla, casi siempre es Firebase: reglas sin publicar,
correo de administrador equivocado o autenticación de Google sin activar.

-----

## Actualizar un sitio ya instalado

Cuando se mejore algo en el maestro:

1. Ejecutar el instalador sobre una copia nueva del maestro, con los datos de
   ese distribuidor.
1. Subir a su repositorio **solo los archivos que cambiaron**.
1. No tocar `config.js` si sus datos no han cambiado.

Nunca editar el código directamente en el sitio de un distribuidor: si se hace,
la próxima actualización lo pisará.

-----

## Lo que el instalador no hace

Requiere atención manual:

- Crear el proyecto de Firebase y publicar sus reglas
- Cambiar las fotos
- Conectar el dominio en Vercel
- Los textos personales de la sección «Sobre mí», si quiere los suyos propios