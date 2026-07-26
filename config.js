/* ============================================================
   CONFIGURACIÓN DE LA OFICINA DIGITAL
   ------------------------------------------------------------
   Este es el ÚNICO archivo que cambia de un distribuidor a otro.
   Todo lo demás del sitio es idéntico para todos.

   Para instalar una oficina nueva:
     1. Copia todos los archivos del proyecto.
     2. Edita solo este archivo con los datos del distribuidor.
     3. Reemplaza las fotos propias (hero, retrato, galería).
     4. Sube las reglas a su proyecto de Firebase.

   No hace falta tocar ningún otro archivo de código.
   ============================================================ */

window.OFICINA = {

  /* ---------- Datos del distribuidor ---------- */
  nombre:       "Tomas Flores",
  nombreCorto:  "Tomas",
  lema:         "Más que vender, sirvo.",
  empresa:      "Impact Enterprises",
  zona:         "DFW — Texas",

  /* Teléfono en formato internacional, solo dígitos.
     De aquí salen TODOS los enlaces de WhatsApp y de llamada. */
  telefono:     "16823811576",

  /* Dominio propio, sin barra final */
  dominio:      "https://tomasflores.com",

  /* Correo con el que entra al panel administrativo */
  correoAdmin:  "florestomas323@gmail.com",

  /* Calendario de reservas */
  calendly:     "https://calendly.com/florestomas/demo-royal",

  /* ---------- Redes sociales (solo el usuario, sin @) ---------- */
  redes: {
    instagram: "tomasflores_23",
    tiktok:    "titoflores45",
    facebook:  "https://www.facebook.com/share/1E2SByaNAR/",
    threads:   "tomasflores_23"
  },

  /* ---------- Proyecto de Firebase propio ----------
     Cada distribuidor necesita el suyo, para que sus clientes
     y sus datos queden separados de los demás.
     Se copia de: Firebase → Configuración del proyecto → Tus apps */
  firebase: {
    apiKey:            "AIzaSyD5EuL7wMb95SRafwcvmBThK5jv-d6H_jA",
    authDomain:        "oficina-digital-tomas.firebaseapp.com",
    projectId:         "oficina-digital-tomas",
    storageBucket:     "oficina-digital-tomas.firebasestorage.app",
    messagingSenderId: "898342341243",
    appId:             "1:898342341243:web:7ee15b8b3533f3889570de"
  }
};

/* ============================================================
   A partir de aquí no hace falta cambiar nada.
   ============================================================ */
(function(){
  var O = window.OFICINA;
  if(!O) return;

  /* El teléfono, siempre en dígitos */
  var tel = String(O.telefono || "").replace(/\D/g, "");
  O.tel = tel;

  /* Formato legible: +1 (682) 381-1576 */
  O.telBonito = (function(){
    if(tel.length === 11 && tel[0] === "1")
      return "+1 (" + tel.slice(1,4) + ") " + tel.slice(4,7) + "-" + tel.slice(7);
    if(tel.length === 10)
      return "+1 (" + tel.slice(0,3) + ") " + tel.slice(3,6) + "-" + tel.slice(6);
    return "+" + tel;
  })();

  /* Enlace de WhatsApp con un mensaje ya escrito */
  O.wa = function(mensaje){
    return "https://wa.me/" + tel + (mensaje ? "?text=" + encodeURIComponent(mensaje) : "");
  };

  /* Deja todos los enlaces del sitio apuntando al distribuidor correcto.
     Se ejecuta en cuanto la página está lista, antes de que nadie toque nada. */
  function aplicar(){
    try{
      document.querySelectorAll('a[href*="wa.me/"]').forEach(function(a){
        a.href = a.href.replace(/wa\.me\/\d+/, "wa.me/" + tel);
      });
      document.querySelectorAll('a[href^="tel:"]').forEach(function(a){
        a.href = "tel:+" + tel;
      });
      if(O.calendly) window.CAL_URL = O.calendly;
    }catch(e){}
  }
  if(document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", aplicar);
  else
    aplicar();
})();
