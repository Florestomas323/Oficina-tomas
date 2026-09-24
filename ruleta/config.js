/* ============================================================
   RULETA "COCINA CON PROPÓSITO" — Configuración de la campaña
   ------------------------------------------------------------
   Igual que /regalo/config.js: para usar esta ruleta con OTRO
   distribuidor o workspace, solo se edita este archivo y las
   imágenes de esta carpeta. No hace falta tocar index.html.

   Los datos del distribuidor (nombre y zona del pie de página)
   salen de /config.js, como en el resto de la Oficina Digital.
   ============================================================ */

window.RULETA_CONFIG = {

  /* FIJO. Workspace de esta Oficina Digital = su proyecto de Firebase
     (window.OFICINA.firebase.projectId en /config.js). Ahí está la
     colección "leads" donde se guarda cada registro. El servidor
     solo acepta este mismo valor. El visitante nunca lo ve. */
  WORKSPACE_ID: (window.OFICINA && window.OFICINA.firebase && window.OFICINA.firebase.projectId) || "oficina-digital-tomas",

  /* SE PUEDE CAMBIAR. Identifica esta campaña de Meta.
     Al cambiarlo empieza una campaña nueva: cada visitante vuelve
     a tener su giro. (letras, números, - o _) */
  CAMPAIGN_ID: "ruleta-cocina-con-proposito",

  /* FIJO. WhatsApp del distribuidor: el mismo teléfono de /config.js,
     de donde salen todos los enlaces de WhatsApp del sitio. */
  WHATSAPP_NUMBER: (window.OFICINA && window.OFICINA.tel) || "16823811576",

  brand: "Cocina con Propósito",

  /* Giros permitidos por participante (en este dispositivo) */
  maxSpins: 1,

  /* Registro del prospecto (función de Vercel de este mismo sitio) */
  endpoint: "/api/ruleta",

  /* Recursos de esta carpeta */
  images: {
    background:     "/ruleta/fondo-ruleta.jpg",
    wheel:          "/ruleta/ruleta.jpg",
    wheelOffsetDeg: 36     // alineación visual del diseño con los segmentos (no cambiar)
  },

  /* PREMIOS — mismos nombres, orden y probabilidades de la ruleta original.
     Si cambias un nombre aquí, cámbialo también en /api/ruleta.js (PREMIOS). */
  prizes: [
    { name: "Cuchillo Profesional", weight: 25, image: "/ruleta/premio-cuchillo.jpg" },
    { name: "Utensilios de Cocina", weight: 50, image: "/ruleta/premio-utensilios.jpg" },
    { name: "Espumador de Café",    weight: 5,  image: "/ruleta/premio-espumador.jpg" },
    { name: "Tazas de Café",        weight: 5,  image: "/ruleta/premio-tazas.jpg" },
    { name: "Bono de descuento de $200", weight: 15, image: "/ruleta/premio-bono-200.jpg", featured: true }
  ],

  /* Animación y sonido (los mismos valores de la ruleta original) */
  settings: {
    minDuration: 4500,
    maxDuration: 5800,
    minSpins: 6,
    maxSpins: 8,
    sound: true
  },

  texts: {
    subtitle:     "¡Todos ganan!",
    spinNote:     "Un giro por participante.",
    intro:        "Déjanos tus datos para registrar tu premio.",
    deliveryBold: "Tu regalo se entrega al recibir la demostración gratuita correspondiente.",
    deliveryRest: "Es una breve experiencia gratuita en tu hogar donde conocerás más sobre el agua que consumes. No hay costo por participar.",
    namePlaceholder:  "Ej. María",
    phonePlaceholder: "(000) 000-0000",
    claimButton:  "🎁 RECLAMA TU REGALO",
    consent:      "Al continuar autorizas que nuestro equipo te contacte por teléfono o WhatsApp para coordinar la entrega.",
    doneTitle:    "¡Listo! Tu regalo quedó registrado.",
    doneBody:     "Muy pronto nuestro equipo te contactará para coordinar tu demostración gratuita, donde recibirás tu regalo.",
    /* {NOMBRE}, {PREMIO} y {TELEFONO} se completan solos */
    whatsappMessage:
      "Hola, soy {NOMBRE}. Participé en la ruleta y gané {PREMIO}. " +
      "Mi teléfono es {TELEFONO}. Quiero coordinar la entrega de mi regalo."
  }
};
