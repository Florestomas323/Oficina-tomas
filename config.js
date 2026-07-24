/* ============================================================
   REGALA Y GANA — Configuración central del distribuidor
   ------------------------------------------------------------
   Para usar esta función con OTRO distribuidor, solo se edita
   este archivo y las fotografías en /regalo/img/.
   Si existe el documento settings/giftProgram en Firestore,
   sus valores tienen prioridad sobre este archivo.
   ============================================================ */

window.GIFT_CONFIG = {

  distributor: {
    id: "tomas-dfw",                 // identificador interno (sin espacios)
    name: "Tomas Flores",
    phone: "16823811576",            // solo dígitos, con código de país
    whatsapp: "16823811576",         // solo dígitos, con código de país
    city: "DFW, Texas",
    logo: "../logo-pasaporte.jpeg",
    siteUrl: "https://florestomas323.github.io/Oficina-tomas"
  },

  campaign: {
    durationDays: 30,                // vigencia del enlace de cada participante
    graceDays: 7                     // días administrativos para validar
  },

  theme: {
    bg: "#FBF9F4",                   // blanco cálido
    ink: "#122A46",                  // azul marino
    navy: "#122A46",
    gold: "#B08D4F",
    goldText: "#8A672B",
    card: "#FFFFFF",
    hairline: "#E7E1D6"
  },

  texts: {
    programName: "Regala y Gana",
    heroClaim: "{NOMBRE} te ha enviado un obsequio para tu cocina.",
    subClaim: "Sin costo. Sin obligación de compra. Sujeto a disponibilidad y zona de servicio.",
    claimButton: "Reclamar mi obsequio",
    shareMessage:
      "Te envié un obsequio para tu cocina.\n\n" +
      "Pensé en ti y quise compartir este regalo contigo.\n\n" +
      "Puedes reclamarlo sin costo y sin obligación de compra aquí:\n\n" +
      "{ENLACE}\n\n" +
      "Completa tus datos para verificar disponibilidad en tu ciudad.",
    afterClaimTitle: "¡Listo! Tu obsequio quedó registrado.",
    afterClaimBody: "Muy pronto te contactaremos para coordinar la entrega según disponibilidad en tu ciudad.",
    termsSummary:
      "Programa válido por 30 días desde la creación del enlace. " +
      "Obsequios sujetos a disponibilidad y zona de servicio. " +
      "Solo cuentan obsequios entregados y ventas confirmadas por el distribuidor. " +
      "Se otorga únicamente la recompensa más alta alcanzada; los premios no son acumulativos. " +
      "Un obsequio por persona y por número telefónico."
  },

  /* Escala de recompensas.
     El participante recibe SOLO la recompensa más alta alcanzada. */
  levels: [
    { level: 1, gifts: 4,  sales: 1, prize: "Tabla de cocina",
      img: "img/tabla-cocina.webp" },
    { level: 2, gifts: 5,  sales: 1, prize: "Set de 3 tazones",
      img: "img/tazones-3.webp" },
    { level: 3, gifts: 6,  sales: 1, prize: "Chocolatera",
      img: "img/chocolatera.webp" },
    { level: 4, gifts: 7,  sales: 2, prize: "Paellera de 10 pulgadas, 5 capas",
      img: "img/paellera-10.webp" },
    { level: 5, gifts: 8,  sales: 2, prize: "Paellera Party de 14 pulgadas",
      img: "img/paellera-14.webp" },
    { level: 6, gifts: 9,  sales: 2, prize: "Blender Go",
      img: "img/blender-go.webp" },
    { level: 7, gifts: 10, sales: 3, prize: "Premio mayor: a elegir",
      img: "img/premio-mayor.webp",
      choice: [
        { name: "Set de 5 piezas", img: "img/premio-set-5.webp" },
        { name: "Licuadora",       img: "img/premio-licuadora.webp" },
        { name: "Extractor",       img: "img/premio-extractor.webp" }
      ]
    }
  ],

  fallbackPrizeImg: "img/premio-generico.webp",

  firebase: {
    apiKey: "AIzaSyD5EuL7wMb95SRafwcvmBThK5jv-d6H_jA",
    authDomain: "oficina-digital-tomas.firebaseapp.com",
    projectId: "oficina-digital-tomas",
    storageBucket: "oficina-digital-tomas.firebasestorage.app",
    messagingSenderId: "898342341243",
    appId: "1:898342341243:web:7ee15b8b3533f3889570de"
  }
};
