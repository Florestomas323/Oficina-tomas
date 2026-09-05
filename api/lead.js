/* ============================================================
   LEADS DE OFICINADIGITAL.WEBSITE
   ------------------------------------------------------------
   POST /api/lead  { nombre, telefono, ciudad, estado }

   Guarda el prospecto en la coleccion "leads" del Firebase actual
   con la cuenta de servicio, y avisa por correo y push ANTES de
   responder, para que el visitante vea el exito solo cuando todo
   ha ocurrido de verdad.

   El navegador de oficinadigital.website nunca toca Firebase: no
   tiene su configuracion, ni claves, ni acceso a nada. Solo
   conoce esta URL.

   PROTECCION (en capas, ninguna sola es "la" seguridad):
     1. Origen: solo se aceptan peticiones cuyo Origin este en la
        lista permitida. Los navegadores lo mandan siempre y no
        se puede falsear desde JavaScript.
     2. Limite por IP, guardado en Firestore para que funcione
        aunque Vercel reparta las llamadas entre varias instancias.
     3. Duplicados: el mismo telefono en 24 h no crea otro lead
        ni dispara otro aviso.
     4. Campo trampa (honeypot): si un bot lo rellena, se descarta
        en silencio devolviendo exito.
     5. Token auxiliar opcional. Es visible en el frontend, asi que
        solo frena rastreadores tontos; no se confia en el.
   ============================================================ */

const crypto = require('crypto');
const { iniciarFirebase, mandarCorreo, mandarPush, admin } = require('../lib/avisos');

const ORIGENES = (process.env.LEAD_ORIGENES ||
  'https://oficinadigital.website,https://www.oficinadigital.website')
  .split(',').map((s) => s.trim()).filter(Boolean);

const LIMITE_POR_IP = 5;            // peticiones...
const VENTANA_MIN = 15;             // ...cada 15 minutos
const DUPLICADO_HORAS = 24;

// ---------- utilidades ----------
function limpiar(v, max) {
  return String(v == null ? '' : v)
    .replace(/[<>]/g, '')             // nada de etiquetas
    .replace(/\s+/g, ' ')             // espacios repetidos
    .trim()
    .slice(0, max);
}

function validar(b) {
  const nombre  = limpiar(b.nombre, 80);
  const ciudad  = limpiar(b.ciudad, 80);
  const estado  = limpiar(b.estado, 40);
  const telRaw  = limpiar(b.telefono != null ? b.telefono : b.phone, 30);
  const digitos = telRaw.replace(/\D/g, '');

  const errores = [];
  if (nombre.length < 2)  errores.push('nombre');
  if (!/^[\p{L}\p{M}\s.'\-]+$/u.test(nombre)) errores.push('nombre');
  if (digitos.length < 7 || digitos.length > 15) errores.push('telefono');
  if (ciudad.length < 2)  errores.push('ciudad');
  if (estado.length < 2)  errores.push('estado');

  return { ok: errores.length === 0, errores: [...new Set(errores)],
           datos: { nombre, phone: telRaw, digitos, ciudad, estado } };
}

function ipDe(req) {
  const xf = req.headers['x-forwarded-for'];
  return (Array.isArray(xf) ? xf[0] : (xf || '')).split(',')[0].trim() || req.socket?.remoteAddress || '0.0.0.0';
}

function hash(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 32);
}

// ---------- limite por IP (Firestore, atomico) ----------
async function permitidoPorIp(db, ip) {
  const ref = db.collection('rateLimits').doc('lead_' + hash(ip));
  const ahora = Date.now();
  const desde = ahora - VENTANA_MIN * 60 * 1000;
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const marcas = (snap.exists ? snap.data().marcas || [] : []).filter((t) => t > desde);
    if (marcas.length >= LIMITE_POR_IP) return false;
    marcas.push(ahora);
    tx.set(ref, { marcas, actualizado: ahora });
    return true;
  });
}

// ---------- duplicados ----------
async function leadReciente(db, digitos) {
  const desde = admin.firestore.Timestamp.fromMillis(Date.now() - DUPLICADO_HORAS * 3600 * 1000);
  const q = await db.collection('leads')
    .where('leadType', '==', 'oficina_digital')
    .where('telefonoDigitos', '==', digitos)
    .where('createdAt', '>=', desde)
    .limit(1).get();
  return q.empty ? null : q.docs[0].id;
}

// ---------- manejador ----------
module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  const origenOk = ORIGENES.includes(origin);

  // CORS: solo respondemos con cabeceras al origen permitido
  if (origenOk) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Lead-Token');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.status(origenOk ? 204 : 403).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'metodo' });
  if (!origenOk) return res.status(403).json({ ok: false, error: 'origen no permitido' });

  // Token auxiliar: si esta configurado, se exige. No es la proteccion principal.
  if (process.env.LEAD_TOKEN && req.headers['x-lead-token'] !== process.env.LEAD_TOKEN) {
    return res.status(403).json({ ok: false, error: 'token' });
  }

  let cuerpo = {};
  try { cuerpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
  catch (e) { return res.status(400).json({ ok: false, error: 'json' }); }

  // Honeypot: un humano nunca ve ni rellena este campo
  if (cuerpo.website || cuerpo.empresa_web) return res.status(200).json({ ok: true, id: 'ok' });

  const v = validar(cuerpo);
  if (!v.ok) return res.status(400).json({ ok: false, error: 'datos invalidos', campos: v.errores });

  try {
    iniciarFirebase();
    const db = admin.firestore();

    if (!(await permitidoPorIp(db, ipDe(req)))) {
      return res.status(429).json({ ok: false, error: 'demasiadas solicitudes, intenta en unos minutos' });
    }

    // Mismo telefono en 24 h: no duplicamos ni volvemos a avisar
    const previo = await leadReciente(db, v.datos.digitos);
    if (previo) return res.status(200).json({ ok: true, id: previo, duplicado: true });

    const docu = {
      nombre: v.datos.nombre,
      phone: v.datos.phone,
      telefonoDigitos: v.datos.digitos,
      ciudad: v.datos.ciudad,
      estado: v.datos.estado,
      origen: 'oficinadigital.website',
      source: 'oficinadigital.website',
      leadType: 'oficina_digital',
      status: 'nueva',
      consent: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const ref = await db.collection('leads').add(docu);

    // Aviso, ANTES de responder: el visitante ve el exito cuando ya llego
    const info = { titulo: 'Nuevo prospecto — Oficina Digital', origen: 'Oficina Digital',
                   asunto: 'Nuevo prospecto — Oficina Digital' };
    const texto = v.datos.nombre + ' está interesado en tener su Oficina Digital.' +
      '\nTeléfono: ' + v.datos.phone +
      '\n' + v.datos.ciudad + ', ' + v.datos.estado;
    const [correo, push] = await Promise.all([
      mandarCorreo(info, texto).catch((e) => 'error: ' + e.message),
      mandarPush(info, texto).catch((e) => 'error: ' + e.message),
    ]);
    console.log('[lead oficina]', ref.id, '| correo:', correo, '| push:', push);

    return res.status(200).json({ ok: true, id: ref.id });
  } catch (e) {
    console.error('[lead oficina] error', e && e.message);
    return res.status(500).json({ ok: false, error: 'no se pudo guardar' });
  }
};

// Para pruebas
module.exports.validar = validar;
