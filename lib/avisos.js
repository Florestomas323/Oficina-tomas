/* ============================================================
   AVISOS — compartido por api/notify.js y api/lead.js
   ------------------------------------------------------------
   Una sola implementacion del correo (Resend) y del push (VAPID)
   para que ambos endpoints se comporten exactamente igual.
   ============================================================ */

const webpush = require('web-push');
const admin = require('firebase-admin');

const PERMITIDAS = {
  leads:            { titulo: 'Nuevo prospecto',        origen: 'Trabaja conmigo' },
  appointments:     { titulo: 'Nueva reserva',          origen: 'Agenda' },
  helpRequests:     { titulo: 'Nueva solicitud',        origen: 'Clientes y solicitudes' },
  giftParticipants: { titulo: 'Nuevo participante',     origen: 'Regala y Gana' },
  giftClaims:       { titulo: 'Nuevo participante',     origen: 'Regala y Gana' },
  passportUsers:    { titulo: 'Nuevo en el Pasaporte',  origen: 'Pasaporte de Sabores' },
};

let listo = false;
function iniciarFirebase() {
  if (listo || admin.apps.length) { listo = true; return; }
  const cred = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!cred) throw new Error('Falta FIREBASE_SERVICE_ACCOUNT');
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(cred)) });
  listo = true;
}

function resumen(d) {
  // Arma una linea legible con lo que traiga el documento.
  const partes = [];
  if (d.nombre) partes.push(d.nombre + (d.apellido ? ' ' + d.apellido : ''));
  if (d.name) partes.push(d.name);
  if (d.phone) partes.push(d.phone);
  if (d.ciudad || d.city) partes.push(d.ciudad || d.city);
  if (d.fecha) partes.push(d.fecha + (d.hora ? ' ' + d.hora : ''));
  if (Array.isArray(d.metas) && d.metas.length) partes.push(d.metas.join(', '));
  return partes.filter(Boolean).join(' · ') || 'Sin detalles';
}

async function mandarCorreo(info, texto) {
  const key = process.env.RESEND_API_KEY;
  const para = process.env.CORREO_AVISOS;
  if (!key || !para) return 'sin configurar';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Oficina Digital <onboarding@resend.dev>',
      to: [para],
      subject: info.asunto || (info.titulo + ' — ' + info.origen),
      text: info.titulo + '\n' + info.origen + '\n\n' + texto +
            '\n\nAbrir el panel: https://tomasflores.com/panel.html',
    }),
  });
  return r.ok ? 'enviado' : 'fallo ' + r.status;
}

async function mandarPush(info, texto) {
  const pub = (process.env.VAPID_PUBLICA || '').trim();
  const priv = (process.env.VAPID_PRIVADA || '').trim();
  if (!pub || !priv) return 'sin configurar';
  try {
    webpush.setVapidDetails('mailto:' + (process.env.CORREO_AVISOS || 'admin@tomasflores.com').trim(), pub, priv);
  } catch (e) {
    return 'claves VAPID invalidas: ' + e.message;
  }

  const db = admin.firestore();
  const subs = await db.collection('pushSubs').get();
  if (subs.empty) return 'sin dispositivos';

  let ok = 0, muertas = 0; const fallos = [];
  await Promise.all(subs.docs.map(async (doc) => {
    const s = doc.data();
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: info.titulo, body: texto, url: '/panel.html', tag: info.origen })
      );
      ok++;
    } catch (e) {
      // 404 y 410 significan que el dispositivo ya no existe: se limpia sola.
      if (e.statusCode === 404 || e.statusCode === 410) {
        await doc.ref.delete().catch(() => {});
        muertas++;
      } else {
        fallos.push((e.statusCode || '?') + ' ' + String(e.body || e.message).slice(0, 90));
      }
    }
  }));
  return ok + ' enviadas de ' + subs.size +
         (muertas ? ', ' + muertas + ' caducadas borradas' : '') +
         (fallos.length ? ' | fallos: ' + fallos.join(' ; ') : '');
}

module.exports = { PERMITIDAS, iniciarFirebase, resumen, mandarCorreo, mandarPush, admin };
