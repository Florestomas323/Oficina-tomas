/* ============================================================
   EL SOMBRERO ENCANTADO × REGALA Y GANA
   ------------------------------------------------------------
   Usa el mismo sistema de Regala y Gana del sitio (las mismas
   colecciones giftLinks, giftParticipants y giftClaims), así que
   todo aparece en el panel y en "Mi progreso".

   /sombreroencantado.html            → quien escanea crea su enlace
   /sombreroencantado.html?ref=CODIGO → quien lo recibe juega y reclama
   /sombreroencantado.html?demo=1     → prueba del juego, sin guardar nada
   ============================================================ */
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const DEMO = params.get('demo') === '1';
const CODE = (params.get('ref') || '').trim().toUpperCase();

function show(view){
  ['loadingView','creatorView','stateView','gameScreen'].forEach(v => { const el = $(v); if (el) el.hidden = (v !== view); });
  window.scrollTo({ top: 0 });
}
function showState(title, body){
  $('stateTitle').textContent = title;
  $('stateBody').textContent = body;
  show('stateView');
}

const CFG = window.GIFT_CONFIG;
if (DEMO) {
  show('gameScreen');
} else if (!CFG || !CFG.firebase || !CFG.firebase.projectId) {
  showState('No se pudo cargar el regalo', 'Intenta abrir el enlace de nuevo en unos minutos.');
} else {
  start().catch(() => showState('No se pudo cargar el regalo', 'Revisa tu conexión a internet e intenta abrir el enlace de nuevo.'));
}

async function start(){
  const D = CFG.distributor;
  const SITE = String(D.siteUrl || location.origin).replace(/\/$/, '');
  const firstName = String(D.name || 'Tomás').split(' ')[0];

  const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
  const { getAuth, signInAnonymously, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
  const { getFirestore, doc, getDoc, setDoc, writeBatch, serverTimestamp, Timestamp, collection, addDoc } =
    await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const app  = getApps().length ? getApps()[0] : initializeApp(CFG.firebase);
  const auth = getAuth(app);
  const db   = getFirestore(app);

  let uid = null;
  const authReady = new Promise(res => {
    onAuthStateChanged(auth, u => { if (u) { uid = u.uid; res(); } });
    signInAnonymously(auth).catch(() => {});
  });
  async function ensureAuth(){
    try { await Promise.race([authReady, new Promise((_, rej) => setTimeout(() => rej(new Error('auth')), 12000))]); }
    catch (_) { await signInAnonymously(auth); await authReady; }
  }

  function track(label){
    try {
      addDoc(collection(db, 'analytics_clicks'), {
        label: String(label).slice(0, 90), action: 'click', page: 'sombrero-encantado', createdAt: serverTimestamp()
      }).catch(() => {});
    } catch (_) {}
  }

  const link = code => SITE + '/sombreroencantado.html?ref=' + code;
  const fmt = d => d.toLocaleDateString('es-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const toDate = v => (v && v.toDate) ? v.toDate() : new Date(v);
  function msg(el, text, ok){ el.textContent = text; el.className = 'rg-msg' + (ok ? ' ok' : ''); }
  function busy(btn, on){ btn.disabled = on; btn.classList.toggle('loading', on); }

  if (CODE) return recipient();
  return creator();

  /* ---------------- QUIEN ESCANEA: crea su enlace ---------------- */
  async function creator(){
    // Mismo enlace que Regala y Gana: un teléfono queda atado a un solo enlace mientras esté vigente.
    const LS_KEY = 'ryg_code_' + D.id;
    show('creatorView');
    track('Sombrero: abrir crear enlace');

    let saved = '';
    try { saved = localStorage.getItem(LS_KEY) || ''; } catch (_) {}
    if (saved) {
      try {
        const snap = await getDoc(doc(db, 'giftLinks', saved));
        if (snap.exists()) {
          const d = snap.data();
          const vigente = d.status === 'active' && !(d.expiresAt && Date.now() > toDate(d.expiresAt).getTime());
          if (vigente) renderDone(saved, d);
          else try { localStorage.removeItem(LS_KEY); } catch (_) {}
        } else try { localStorage.removeItem(LS_KEY); } catch (_) {}
      } catch (_) {}
    }

    function secureCode(len){
      const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const buf = new Uint32Array(len); crypto.getRandomValues(buf);
      let out = ''; for (let i = 0; i < len; i++) out += A[buf[i] % A.length];
      return out;
    }

    function renderDone(code, data){
      const url = link(code);
      $('formCard').hidden = true;
      $('doneCard').hidden = false;
      $('whoLine').textContent = 'A nombre de ' + data.participantName + ' · ' + data.city;
      $('linkBox').textContent = url;
      const end = toDate(data.expiresAt);
      $('vEnd').textContent = fmt(end);
      $('vDays').textContent = String(Math.max(0, Math.ceil((end - Date.now()) / 86400000)));
      const texto =
        '🎩 Te envié El Sombrero Encantado.\n\n' +
        'Elige uno de los cinco sombreros y descubre tu regalo para la cocina. ¡Aquí todos ganan!\n\n' +
        'Sin costo y sin obligación de compra:';
      const completo = texto + '\n\n' + url;
      $('btnWa').href = 'https://wa.me/?text=' + encodeURIComponent(completo);
      $('btnWa').onclick = () => track('Sombrero: enviar por WhatsApp');
      $('btnShare').onclick = async () => {
        track('Sombrero: compartir');
        if (navigator.share) {
          try { await navigator.share({ title: 'El Sombrero Encantado', text: texto, url }); }
          catch (err) { if (!err || err.name !== 'AbortError') copiar(completo); }
        } else copiar(completo);
      };
      $('btnCopy').onclick = () => copiar(url);
      $('btnProgress').href = '/regalo/mi-progreso.html?c=' + code;
    }
    async function copiar(text){
      try { await navigator.clipboard.writeText(text); msg($('doneMsg'), 'Enlace copiado. Ya puedes pegarlo donde quieras.', true); }
      catch (_) { msg($('doneMsg'), 'No se pudo copiar. Mantén presionado el enlace para copiarlo.'); }
    }

    $('btnCreate').addEventListener('click', async () => {
      const btn = $('btnCreate'), el = $('formMsg');
      const name = $('fName').value.trim().replace(/\s+/g, ' ');
      const city = $('fCity').value.trim().replace(/\s+/g, ' ');
      msg(el, '');
      if (name.length < 2) { msg(el, 'Escribe tu nombre (mínimo 2 letras).'); $('fName').focus(); return; }
      if (city.length < 2) { msg(el, 'Escribe tu ciudad.'); $('fCity').focus(); return; }
      if (!$('fTerms').checked) { msg(el, 'Para continuar, acepta los términos del programa.'); return; }
      busy(btn, true);
      try { await ensureAuth(); }
      catch (_) { busy(btn, false); msg(el, 'No se pudo conectar. Revisa tu internet e inténtalo de nuevo.'); return; }

      const now = new Date();
      const ends = new Date(now.getTime() + CFG.campaign.durationDays * 86400000);
      const grace = new Date(ends.getTime() + CFG.campaign.graceDays * 86400000);
      const linkData = {
        ownerUid: uid, distributorId: D.id, participantName: name, city, status: 'active',
        startsAt: Timestamp.fromDate(now), expiresAt: Timestamp.fromDate(ends), createdAt: serverTimestamp()
      };
      const partData = {
        ...linkData, consentTerms: true, giftsDelivered: 0, salesConfirmed: 0, claimsTotal: 0,
        currentLevel: 0, rewardStatus: null, maskedContacts: [],
        graceEndsAt: Timestamp.fromDate(grace), updatedAt: serverTimestamp()
      };
      let code = '', ok = false;
      for (let i = 0; i < 5 && !ok; i++) {
        code = secureCode(12);
        try {
          if ((await getDoc(doc(db, 'giftLinks', code))).exists()) continue;
          const batch = writeBatch(db);
          batch.set(doc(db, 'giftParticipants', code), partData);
          batch.set(doc(db, 'giftLinks', code), linkData);
          await batch.commit();
          ok = true;
        } catch (_) {}
      }
      busy(btn, false);
      if (!ok) { msg(el, 'No se pudo crear tu enlace en este momento. Inténtalo de nuevo en unos minutos.'); return; }
      try { localStorage.setItem(LS_KEY, code); } catch (_) {}
      track('Sombrero: enlace creado');
      renderDone(code, { ...linkData, expiresAt: ends });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------------- QUIEN RECIBE: juega y reclama ---------------- */
  async function recipient(){
    if (!/^[A-Z0-9]{10,14}$/.test(CODE)) {
      return showState('Este enlace no es válido', 'Revisa que el enlace esté completo tal como te lo enviaron, o crea el tuyo para regalar.');
    }
    const snap = await getDoc(doc(db, 'giftLinks', CODE));
    if (!snap.exists()) {
      return showState('Este enlace no es válido', 'Revisa que el enlace esté completo tal como te lo enviaron. Si sigue fallando, pide que te lo compartan de nuevo.');
    }
    const LINK = snap.data();
    const vencido = LINK.status !== 'active' || (LINK.expiresAt && Date.now() > toDate(LINK.expiresAt).getTime());
    if (vencido) {
      return showState('Esta campaña ya terminó',
        (LINK.participantName || 'Tu contacto') + ' compartió este regalo, pero su campaña ya finalizó. Tú puedes crear tu propio enlace y regalar también.');
    }
    $('senderName').textContent = LINK.participantName;
    $('senderLine').hidden = false;
    document.title = LINK.participantName + ' te envió El Sombrero Encantado';
    show('gameScreen');
    track('Sombrero: enlace abierto');

    const LS_CLAIMED = 'ryg_claimed_' + CODE;
    let prize = null;

    document.addEventListener('sombrero:premio', ev => {
      prize = ev.detail.prize;
      if (ev.detail.demo) return;
      let claimed = null;
      try { claimed = JSON.parse(localStorage.getItem(LS_CLAIMED + '_sombrero') || 'null'); } catch (_) {}
      if (!claimed) { try { const n = localStorage.getItem(LS_CLAIMED); if (n) claimed = { name: n }; } catch (_) {} }
      if (claimed) showClaimed(claimed.name);
      else { $('claimBox').hidden = false; $('doneBox').hidden = true; }
    });

    function showClaimed(name){
      $('claimBox').hidden = true;
      $('doneBox').hidden = false;
      const texto = 'Hola ' + firstName + ', soy ' + name + '. Jugué El Sombrero Encantado que me envió ' +
        LINK.participantName + ' y gané: ' + (prize ? prize.name : 'un regalo') + '. Mi código es ' + CODE +
        '. ¿Cuándo coordinamos la entrega?';
      $('btnWaConfirm').href = 'https://wa.me/' + (D.whatsapp || D.phone) + '?text=' + encodeURIComponent(texto);
      $('btnWaConfirm').onclick = () => track('Sombrero: WhatsApp confirmar');
    }

    function normalizePhone(raw){
      let d = String(raw || '').replace(/\D/g, '');
      if (d.length === 10) d = '1' + d;
      if (d.length < 10 || d.length > 15 || /^(\d)\1+$/.test(d)) return null;
      return d;
    }

    $('btnClaim').addEventListener('click', async () => {
      const btn = $('btnClaim'), el = $('claimMsg');
      const name = $('cName').value.trim().replace(/\s+/g, ' ');
      const city = $('cCity').value.trim().replace(/\s+/g, ' ');
      const zip = $('cZip').value.trim();
      const phone = normalizePhone($('cPhone').value);
      msg(el, '');
      if (name.length < 2) { msg(el, 'Escribe tu nombre completo.'); $('cName').focus(); return; }
      if (!phone) { msg(el, 'Escribe un número telefónico válido de 10 dígitos.'); $('cPhone').focus(); return; }
      if (city.length < 2) { msg(el, 'Escribe tu ciudad.'); $('cCity').focus(); return; }
      if (zip && !/^[0-9]{4,10}$/.test(zip)) { msg(el, 'El código postal solo lleva números, o déjalo vacío.'); $('cZip').focus(); return; }
      if (!$('cConsent').checked) { msg(el, 'Para coordinar tu entrega necesitamos tu autorización de contacto.'); return; }
      busy(btn, true);
      try { await ensureAuth(); }
      catch (_) { busy(btn, false); msg(el, 'No se pudo conectar. Revisa tu internet e inténtalo de nuevo.'); return; }

      const claimId = CODE + '__' + phone;
      const base = {
        claimId, distributorId: LINK.distributorId, participantId: CODE, referralCode: CODE,
        recipientName: name, normalizedPhone: phone, recipientCity: city, consent: true,
        status: 'claimed', claimedAt: serverTimestamp(), createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(), adminNotes: ''
      };
      if (zip) base.zipCode = zip;
      // El premio viaja en "source" para que se vea en el panel; si las reglas no lo aceptan, se guarda sin él.
      const fuentes = ['Sombrero · ' + (prize ? prize.name : 'regalo'), 'Sombrero'];
      let ok = false, err = null;
      for (const source of fuentes) {
        try { await setDoc(doc(db, 'giftClaims', claimId), { ...base, source }); ok = true; break; }
        catch (e) { err = e; }
      }
      busy(btn, false);
      if (!ok) {
        if (err && err.code === 'permission-denied') {
          msg(el, 'Este número ya reclamó un regalo con este enlace. Un regalo por persona y por número.');
        } else msg(el, 'No se pudo registrar tu regalo en este momento. Inténtalo de nuevo en unos minutos.');
        return;
      }
      try {
        localStorage.setItem(LS_CLAIMED, name);
        localStorage.setItem(LS_CLAIMED + '_sombrero', JSON.stringify({ name, prize: prize && prize.name }));
      } catch (_) {}
      track('Sombrero: regalo reclamado');
      showClaimed(name);
    });
  }
}
