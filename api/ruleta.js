/* ============================================================
   RULETA "COCINA CON PROPÓSITO" — registro del ganador
   ------------------------------------------------------------
   POST /api/ruleta
   { nombre, telefono, premio, workspaceId, campaignId }

   Guarda al participante en la coleccion "leads" (la misma que
   lee la pestaña Prospectos del panel) con la cuenta de servicio
   que ya usan api/lead.js y api/notify.js, y avisa por correo y
   push con lib/avisos.js ANTES de responder. El navegador solo
   abre WhatsApp cuando esta funcion confirma que quedo guardado.

   Archivo aparte a proposito: no toca api/lead.js (que atiende
   oficinadigital.website) ni ninguna otra seccion del sitio.

   WORKSPACE FIJO: esta Oficina Digital pertenece a un solo
   distribuidor. Su workspace es su proyecto de Firebase: el mismo
   project_id de la cuenta de servicio (FIREBASE_SERVICE_ACCOUNT) con
   la que se escribe en "leads". No hace falta otra variable. Si la
   peticion trae otro workspace, se rechaza y no se guarda nada.

   PROTECCION:
     1. Origen: el mismo dominio que sirve la pagina, o los de
        RULETA_ORIGENES (opcional, separados por coma).
     2. Limite por IP (Firestore). Holgado a proposito: en un
        evento muchas personas comparten el mismo Wi-Fi.
     3. Un registro por telefono y campaña: el ID del documento
        es unico por workspace, campaña y telefono, asi que es atomico. Repetir
        el envio con el mismo premio no duplica nada; con otro
        premio se rechaza.
     4. El premio debe ser uno de la lista oficial.
     5. Campo trampa (honeypot) para bots.
     6. Workspace fijo (project_id de la cuenta de servicio): cualquier
        otro valor se rechaza, y el workspace va tambien dentro del
        ID del documento: ruleta__WORKSPACE__CAMPAÑA__TELEFONO.
   ============================================================ */

const crypto = require('crypto');
const { iniciarFirebase, mandarCorreo, mandarPush, admin } = require('../lib/avisos');

/* Deben coincidir EXACTAMENTE con ruleta/config.js */
const PREMIOS = [
  'Cuchillo Profesional',
  'Utensilios de Cocina',
  'Espumador de Café',
  'Tazas de Café',
  'Bono de descuento de $200',
];

const MARCA = 'Cocina con Propósito';
const LIMITE_POR_IP = 30;           // registros...
const VENTANA_MIN = 10;             // ...cada 10 minutos por IP
const ID_VALIDO = /^[A-Za-z0-9_-]{2,60}$/;

// ---------- utilidades ----------
function limpiar(v, max) {
  return String(v == null ? '' : v)
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/* Workspace fijo: el proyecto de Firebase de la cuenta de servicio */
function workspaceFijo() {
  try {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    return String(sa.project_id || '').trim();
  } catch (e) { return ''; }
}

function validar(b) {
  const nombre      = limpiar(b.nombre, 80);
  const telRaw      = limpiar(b.telefono, 30);
  const premio      = limpiar(b.premio, 60);
  const workspaceId = limpiar(b.workspaceId, 60);
  const campaignId  = limpiar(b.campaignId, 60);
  let digitos = telRaw.replace(/\D/g, '');
  if (digitos.length === 10) digitos = '1' + digitos;   // EE. UU. sin código de país

  const errores = [];
  if (nombre.length < 2 || !/^[\p{L}\p{M}\s.'\-]+$/u.test(nombre)) errores.push('nombre');
  if (digitos.length < 11 || digitos.length > 15) errores.push('telefono');
  if (!PREMIOS.includes(premio)) errores.push('premio');
  if (!ID_VALIDO.test(workspaceId)) errores.push('workspace');
  if (!ID_VALIDO.test(campaignId)) errores.push('campana');

  return { ok: errores.length === 0, errores,
           datos: { nombre, phone: telRaw, digitos, premio, workspaceId, campaignId } };
}

function origenPermitido(req) {
  const origin = req.headers.origin || '';
  if (!origin) return false;
  const extra = (process.env.RULETA_ORIGENES || 'https://tomasflores.com,https://www.tomasflores.com')
    .split(',').map((s) => s.trim()).filter(Boolean);
  if (extra.includes(origin)) return true;
  try { return new URL(origin).host === String(req.headers.host || ''); }  // mismo dominio (tambien vistas previas de Vercel)
  catch (e) { return false; }
}

function ipDe(req) {
  const xf = req.headers['x-forwarded-for'];
  return (Array.isArray(xf) ? xf[0] : (xf || '')).split(',')[0].trim() || req.socket?.remoteAddress || '0.0.0.0';
}

function hash(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 32);
}

async function permitidoPorIp(db, ip) {
  const ref = db.collection('rateLimits').doc('ruleta_' + hash(ip));
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

function conLimite(promesa, ms) {
  return Promise.race([promesa, new Promise((r) => setTimeout(() => r('sin respuesta en ' + ms + ' ms'), ms))]);
}

// ---------- manejador ----------
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'metodo' });
  if (!origenPermitido(req)) return res.status(403).json({ ok: false, error: 'origen no permitido' });

  let cuerpo = {};
  try { cuerpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
  catch (e) { return res.status(400).json({ ok: false, error: 'json' }); }

  // Honeypot: un humano nunca ve ni rellena este campo
  if (cuerpo.website) return res.status(200).json({ ok: true, id: 'ok' });

  const v = validar(cuerpo);
  if (!v.ok) return res.status(400).json({ ok: false, error: 'datos invalidos', campos: v.errores });

  // Workspace fijo: solo se acepta el proyecto de Firebase de esta Oficina.
  const wsFijo = workspaceFijo();
  if (!ID_VALIDO.test(wsFijo)) {
    console.error('[ruleta] FIREBASE_SERVICE_ACCOUNT sin project_id valido');
    return res.status(503).json({ ok: false, error: 'workspace no configurado' });
  }
  if (v.datos.workspaceId !== wsFijo) {
    return res.status(403).json({ ok: false, error: 'workspace no permitido' });
  }

  try {
    iniciarFirebase();
    const db = admin.firestore();

    if (!(await permitidoPorIp(db, ipDe(req)))) {
      return res.status(429).json({ ok: false, error: 'demasiadas solicitudes, intenta en unos minutos' });
    }

    const id = 'ruleta__' + wsFijo + '__' + v.datos.campaignId + '__' + v.datos.digitos;
    const ref = db.collection('leads').doc(id);

    // Mismos nombres de campo que el resto de los prospectos (nombre, phone,
    // origen, status, consent, createdAt) + los datos propios de la ruleta.
    const docu = {
      nombre: v.datos.nombre,
      phone: v.datos.phone,
      telefonoDigitos: v.datos.digitos,
      premio: v.datos.premio,
      campaignId: v.datos.campaignId,
      workspaceId: wsFijo,
      marca: MARCA,
      origen: 'ruleta',
      source: 'ruleta',
      leadType: 'ruleta',
      status: 'nueva',
      consent: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    try {
      await ref.create(docu);            // falla si ese telefono ya participo en esta campaña
    } catch (e) {
      if (e && (e.code === 6 || e.code === 'already-exists' || /already exists/i.test(e.message || ''))) {
        const previo = await ref.get();
        const p = previo.exists ? previo.data() : {};
        if (p.premio === v.datos.premio) return res.status(200).json({ ok: true, id, duplicado: true });
        return res.status(409).json({ ok: false, error: 'telefono ya registrado en esta campaña' });
      }
      throw e;
    }

    const info = { titulo: 'Nuevo ganador — Ruleta', origen: MARCA,
                   asunto: 'Nuevo ganador de la ruleta — ' + v.datos.premio };
    const texto = v.datos.nombre + ' ganó: ' + v.datos.premio +
      '\nTeléfono: ' + v.datos.phone +
      '\nCampaña: ' + v.datos.campaignId + ' · Workspace: ' + v.datos.workspaceId;
    const [correo, push] = await Promise.all([
      conLimite(mandarCorreo(info, texto).catch((e) => 'error: ' + e.message), 5000),
      conLimite(mandarPush(info, texto).catch((e) => 'error: ' + e.message), 5000),
    ]);
    console.log('[ruleta]', id, '| correo:', correo, '| push:', push);

    return res.status(200).json({ ok: true, id });
  } catch (e) {
    console.error('[ruleta] error', e && e.message);
    return res.status(500).json({ ok: false, error: 'no se pudo guardar' });
  }
};

// Para pruebas
module.exports.validar = validar;
module.exports.PREMIOS = PREMIOS;
