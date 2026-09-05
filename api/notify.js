/* ============================================================
   AVISOS DE LA OFICINA DIGITAL
   ------------------------------------------------------------
   Recibe { coleccion, id } tras guardarse un registro desde el
   sitio, lee el documento real en Firestore y avisa por correo y
   push. La logica de envio vive en lib/avisos.js, compartida con
   api/lead.js. Nunca devuelve error al visitante.
   ============================================================ */

const { PERMITIDAS, iniciarFirebase, resumen, mandarCorreo, mandarPush, admin } = require('../lib/avisos');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  try {
    const cuerpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { coleccion, id } = cuerpo;
    const info = PERMITIDAS[coleccion];
    if (!info || !id) return res.status(400).json({ ok: false, error: 'peticion invalida' });

    iniciarFirebase();
    const snap = await admin.firestore().collection(coleccion).doc(String(id)).get();
    if (!snap.exists) return res.status(404).json({ ok: false, error: 'no existe' });

    const texto = resumen(snap.data());
    const [correo, push] = await Promise.all([
      mandarCorreo(info, texto).catch((e) => 'error: ' + e.message),
      mandarPush(info, texto).catch((e) => 'error: ' + e.message),
    ]);
    // Queda en los Logs de Vercel: sin esto, un fallo del push es invisible.
    console.log('[aviso]', coleccion, '| correo:', correo, '| push:', push);
    return res.status(200).json({ ok: true, correo, push });
  } catch (e) {
    // Se responde 200 a proposito: un fallo del aviso no debe
    // ensuciar la experiencia de quien acaba de llenar el formulario.
    return res.status(200).json({ ok: false, error: e.message });
  }
};
