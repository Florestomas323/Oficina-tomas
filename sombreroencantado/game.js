'use strict';

/**
 * El Sombrero Encantado - Tomás Flores / Impact Enterprises
 * Five exact independent probabilities; all plays win.
 * Prize is drawn only after selection. Hat choice is cosmetic.
 * Registration data never leaves the phone except in the WhatsApp message the player decides to send.
 */
const PRIZES = Object.freeze([
  { id: 'tazones',    name: 'Set de tazones',          percentage: 5,  image: '/sombreroencantado/assets/tazones.webp' },
  { id: 'tazas',      name: 'Set de tazas de café',     percentage: 5,  image: '/sombreroencantado/assets/tazas.webp' },
  { id: 'espumador',  name: 'Espumador',               percentage: 20, image: '/sombreroencantado/assets/espumador.webp' },
  { id: 'cuchillo',   name: 'Cuchillo Santoku',        percentage: 35, image: '/sombreroencantado/assets/cuchillo.webp' },
  { id: 'utensilios', name: 'Set de utensilios',       percentage: 35, image: '/sombreroencantado/assets/utensilios.webp' }
]);
const STORAGE_KEY = 'tomas-sombrero-premio-v1';
const REG_KEY = 'tomas-sombrero-registro-v1';
const CONFIG = window.SOMBRERO_CONFIG || {};
const DEMO_MODE = new URLSearchParams(location.search).get('demo') === '1';
const $ = id => document.getElementById(id);
const screen = $('gameScreen'), field = $('gameField'), tilesRoot = $('tiles');
const resultDialog = $('resultDialog');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = ms => new Promise(resolve => setTimeout(resolve, reduceMotion ? 80 : ms));
const slotPositions = [
  { x: 30, y: 27 }, { x: 70, y: 27 },
  { x: 20, y: 76 }, { x: 50, y: 76 }, { x: 80, y: 76 }
];
let phase = 'intro';
let round = 0;
let tiles = [];
let currentReceipt = null;
// Music and effects are ON by default; browser audio starts only after a real tap.
let soundEnabled = true;
let audioCtx = null;
let soundBus = null;
const ambientAudio = new Audio('/sombreroencantado/assets/ambiente.mp3');
ambientAudio.preload = 'auto';
ambientAudio.loop = true;
ambientAudio.volume = 0.50;
let noiseBuffer = null;
let toastTimer = null;

function secureRandom() {
  if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    window.crypto.getRandomValues(buf);
    return buf[0] / 4294967296;
  }
  return Math.random();
}

// Call this exactly once after a hat is chosen. Not based on hat identity or position.
function drawPrize() {
  const r = secureRandom() * 100;
  let cumulative = 0;
  for (const prize of PRIZES) {
    cumulative += prize.percentage;
    if (r < cumulative) return prize;
  }
  return PRIZES[PRIZES.length - 1];
}

function shuffleArray(arr) {
  const result = arr.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(secureRandom() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Begin/resume audio inside a direct button or touch interaction (Safari/iPad compatible).
function unlockSound() {
  if (!soundEnabled) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC && !audioCtx) {
      audioCtx = new AC();
      soundBus = audioCtx.createGain();
      soundBus.gain.value = 0.8;
      soundBus.connect(audioCtx.destination);
    }
    if (audioCtx?.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    // A real click is required for background music on iPhone and iPad.
    if (ambientAudio.paused) ambientAudio.play().catch(() => {});
  } catch (_) { /* The game remains playable without audio. */ }
}
function chime(frequency = 600, duration = 0.22, type = 'sine', vol = 0.11, delay = 0) {
  if (!soundEnabled || !audioCtx || !soundBus) return;
  try {
    const now = audioCtx.currentTime + delay;
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(vol, now + 0.013);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(soundBus);
    oscillator.start(now);
    oscillator.stop(now + duration + .025);
  } catch (_) { /* Audio is optional */ }
}
function magicWhoosh(duration = 0.34, frequency = 380) {
  if (!soundEnabled || !audioCtx || !soundBus) return;
  try {
    const now = audioCtx.currentTime;
    if (!noiseBuffer) {
      noiseBuffer = audioCtx.createBuffer(1, Math.ceil(audioCtx.sampleRate * 0.8), audioCtx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass'; filter.Q.value = 0.9;
    filter.frequency.setValueAtTime(frequency, now);
    filter.frequency.exponentialRampToValueAtTime(frequency * 3, now + duration);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(.19, now + duration * .35);
    gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    noise.connect(filter).connect(gain).connect(soundBus);
    noise.start(now); noise.stop(now + duration + .015);
  } catch (_) { /* Audio is optional */ }
}
function startMelody() {
  chime(523.25, .38, 'sine', .12);
  chime(659.25, .38, 'sine', .12, .14);
  chime(783.99, .55, 'sine', .14, .30);
}
function winningMelody() {
  magicWhoosh(.65, 450);
  [523.25,659.25,783.99,1046.5].forEach((freq, index) => {
    chime(freq, 1.1, 'sine', .18, .12 + index*.14);
    chime(freq*2, .45, 'triangle', .025, .13 + index*.14);
  });
}
function setStatus(value) { $('status').textContent = value; }
function toast(message) {
  const element = $('toast');
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('visible'), 2500);
}

function renderTiles() {
  tilesRoot.replaceChildren();
  tiles = PRIZES.map((prize, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hat-tile';
    button.disabled = true;
    button.setAttribute('aria-label', `Sombrero encantado ${index + 1}`);
    button.style.setProperty('--angle', [-3, 4, -5, 2, 5][index] + 'deg');
    button.style.setProperty('--aura', ['#9e42ee', '#b44bf4', '#da89fe', '#8d4bf4', '#ec9b4f'][index]);
    button.innerHTML = `
      <span class="pedestal" aria-hidden="true"></span>
      <span class="product-preview"><img src="${prize.image}" alt="" draggable="false"></span>
      <img class="hat-image" src="/sombreroencantado/assets/sombrero.webp" alt="" draggable="false">
      <span class="star" aria-hidden="true">✦</span>`;
    button.addEventListener('click', () => selectHat(button));
    tilesRoot.appendChild(button);
    return { element: button, slot: index, previewImg: button.querySelector('.product-preview img') };
  });
  positionTiles();
}
function positionTiles() {
  for (const tile of tiles) {
    const slot = slotPositions[tile.slot];
    tile.element.style.setProperty('--x', `${slot.x}%`);
    tile.element.style.setProperty('--y', `${slot.y}%`);
  }
}

// Some published HTML versions predate the eligibility control.
// Always render a working confirmation rather than crashing on a missing element.
function ensureEligibilityControl() {
  let checkbox = $('eligibilityCheck');
  if (checkbox) return checkbox;
  const panel = $('launchPanel');
  if (!panel) return null;
  const label = document.createElement('label');
  label.className = 'eligibility-confirm';
  label.style.cssText = 'display:flex;align-items:flex-start;gap:10px;width:min(100%,660px);margin:10px auto;padding:10px 12px;border:1px solid rgba(243,202,130,.45);border-radius:12px;background:rgba(22,12,27,.86);color:#fff0db;font-size:13px;line-height:1.45;text-align:left;cursor:pointer';
  checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'eligibilityCheck';
  checkbox.style.cssText = 'flex:none;width:21px;height:21px;margin:1px 0 0;accent-color:#eabd6a';
  const explanation = document.createElement('span');
  explanation.innerHTML = 'Confirmo que soy mayor de 18 años, consulté las <a href="/sombreroencantado/bases.html" target="_blank" rel="noopener" style="color:#ffe0a1;text-decoration:underline">bases y premios</a>. La entrega gratuita se coordina en una visita con demostración comercial de unos 40 minutos, sin obligación de compra; el regalo se entrega al inicio.';
  label.append(checkbox, explanation);
  panel.appendChild(label);
  return checkbox;
}

async function startGame() {
  const eligibilityCheck = ensureEligibilityControl();
  if (eligibilityCheck && !eligibilityCheck.checked) {
    toast('Marca la casilla de elegibilidad para comenzar.');
    eligibilityCheck.scrollIntoView({block: 'center', behavior: 'smooth'});
    eligibilityCheck.focus({preventScroll: true});
    return;
  }
  if (phase === 'preview' || phase === 'cover' || phase === 'shuffle' || phase === 'choose' || phase === 'reveal') return;
  unlockSound();
  round += 1;
  const myRound = round;
  if (resultDialog.open) resultDialog.close();
  renderTiles();
  $('startButton').hidden = true;
  $('launchCaption').textContent = '¡La magia está comenzando!';
  phase = 'preview';
  field.classList.remove('can-pick');
  setStatus('Mira los cinco regalos...');
  $('lead').textContent = 'Cinco sombreros · Cinco sorpresas · ¡Todos ganan!';
  $('hint').textContent = 'Los regalos quedarán escondidos detrás de los sombreros.';
  startMelody();
  await sleep(1300);
  if (myRound !== round) return;
  phase = 'cover';
  setStatus('¡Los sombreros esconden los regalos!');
  tiles.forEach(tile => tile.element.classList.add('covering'));
  magicWhoosh(.55, 280);
  chime(392, .34, 'triangle', .08);
  await sleep(750);
  if (myRound !== round) return;
  tiles.forEach(tile => { tile.element.classList.remove('covering'); tile.element.classList.add('covered'); });
  phase = 'shuffle';
  setStatus('¡Los sombreros se están mezclando!');
  await sleep(180);
  for (let step = 0; step < (reduceMotion ? 3 : 9); step++) {
    if (myRound !== round) return;
    const oldSlots = tiles.map(tile => tile.slot);
    let nextSlots;
    do { nextSlots = shuffleArray(oldSlots); }
    while (nextSlots.every((v, i) => v === oldSlots[i]));
    tiles.forEach((tile, index) => { tile.slot = nextSlots[index]; tile.element.classList.add('is-shuffling'); });
    positionTiles();
    if (step % 2 === 0) magicWhoosh(.35, 350 + step * 45);
    chime(420 + step * 44, .15, 'triangle', .07);
    await sleep(reduceMotion ? 90 : (step < 6 ? 365 : 430));
  }
  if (myRound !== round) return;
  tiles.forEach(tile => tile.element.classList.remove('is-shuffling'));
  phase = 'choose';
  setStatus('✨ ¡Elige tu sombrero encantado! ✨');
  $('lead').textContent = '¡Toca el sombrero que prefieras!';
  $('launchCaption').textContent = '¡Llegó el momento de elegir!';
  tiles.forEach(tile => { tile.element.disabled = false; tile.element.classList.add('selectable'); });
  $('hint').textContent = 'Toca uno de los cinco sombreros para revelar tu sorpresa.';
  chime(880, .22, 'sine', .05);
}

async function selectHat(chosenElement) {
  if (phase !== 'choose') return;
  phase = 'reveal';
  const myRound = round;
  tiles.forEach(tile => { tile.element.disabled = true; tile.element.classList.remove('selectable'); });
  const savedPrize = !DEMO_MODE && getSavedReceipt();
  const prize = savedPrize ? PRIZES.find(p => p.id === savedPrize.prizeId) : drawPrize();
  const winningTile = tiles.find(tile => tile.element === chosenElement);
  winningTile.previewImg.src = prize.image;
  tiles.forEach(tile => tile.element.classList.toggle('faded', tile !== winningTile));
  chosenElement.classList.add('selected');
  setStatus('¡Preparando tu sorpresa encantada!');
  magicWhoosh(.4, 380);
  chime(550, .24);
  await sleep(300);
  if (myRound !== round) return;
  chosenElement.classList.add('revealed');
  setStatus('¡Felicidades! ¡Encontraste un regalo!');
  winningMelody();
  const receipt = savedPrize || {prizeId: prize.id, assignedAt: new Date().toISOString()};
  if (!DEMO_MODE && !savedPrize) {
    currentReceipt = receipt;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(receipt)); } catch (_) { /* Almacenamiento opcional del resultado */ }
  }
  await sleep(920);
  if (myRound !== round) return;
  showResult(prize, receipt);
  phase = 'finished';
}

function getSavedReceipt() {
  if (DEMO_MODE) return null;
  if (currentReceipt) return currentReceipt;
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (data && PRIZES.some(p => p.id === data.prizeId)) {
      // Migrar sorteos de la versión anterior eliminando el código antiguo.
      const receipt = {prizeId: data.prizeId, assignedAt: data.assignedAt || null};
      if ('code' in data) localStorage.setItem(STORAGE_KEY, JSON.stringify(receipt));
      return receipt;
    }
  } catch (_) { /* El juego también funciona sin almacenamiento. */ }
  return null;
}
function digits(value) {
  let d = String(value || '').replace(/[^0-9]/g, '');
  if (d.length === 10) d = '1' + d;
  return d;
}
function prettyPhone(value) {
  const d = digits(value);
  return d.length === 11 ? `(${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}` : String(value || '');
}
function validWhatsAppNumber() {
  const number = String(CONFIG.whatsappNumber || '').replace(/[^0-9]/g,'');
  return /^[1-9][0-9]{7,14}$/.test(number) ? number : '';
}
function getRegistration() {
  if (DEMO_MODE) return null;
  try {
    const data = JSON.parse(localStorage.getItem(REG_KEY) || 'null');
    return data && data.nombre ? data : null;
  } catch (_) { return null; }
}
let currentPrize = null;

function showResult(prize, receipt) {
  currentPrize = prize;
  $('winImage').src = prize.image;
  $('winImage').alt = prize.name;
  $('winName').textContent = prize.name;
  $('fError').textContent = '';
  const reg = getRegistration();
  if (reg) showDone(prize, reg);
  else {
    $('shareBox').hidden = false;
    $('doneBox').hidden = true;
    $('claimHelp').textContent = DEMO_MODE ? 'Modo demostración: este resultado no asigna premios ni puede reclamarse.' : '';
  }
  if (!resultDialog.open) resultDialog.showModal();
  phase = 'finished';
}

function showDone(prize, reg) {
  const number = validWhatsAppNumber();
  $('shareBox').hidden = true;
  $('doneBox').hidden = false;
  $('doneTitle').textContent = '¡' + prize.name + ' apartado!';
  $('doneCopy').textContent = `Para ti y para ${reg.invitado}. Envía tu registro y Tomás te escribirá para coordinar la entrega.`;
  const msgTomas =
`🎩 *El Sombrero Encantado* — Halloween
Hola Tomás, gané: *${prize.name}*

👤 Nombre: ${reg.nombre}
📱 WhatsApp: ${prettyPhone(reg.tel)}
📍 Ciudad: ${reg.ciudad}
💌 Lo comparto con: ${reg.invitado}${reg.telInvitado ? ' — ' + prettyPhone(reg.telInvitado) : ''}

¿Cuándo coordinamos la entrega?`;
  const claim = $('claimButton');
  if (number && !DEMO_MODE) {
    claim.hidden = false;
    claim.href = `https://wa.me/${number}?text=${encodeURIComponent(msgTomas)}`;
    $('claimHelp').textContent = 'Se abrirá WhatsApp con tu registro listo. Pulsa Enviar para apartar tu regalo.';
  } else {
    claim.hidden = true;
    claim.removeAttribute('href');
    $('claimHelp').textContent = DEMO_MODE
      ? 'Modo demostración: este resultado no asigna premios ni puede reclamarse.'
      : `Si no puedes usar WhatsApp, escribe a ${CONFIG.email || 'Tomás'} para apartar tu regalo.`;
  }
  const url = CONFIG.urlJuego || location.origin + location.pathname;
  const msgInvite =
`¡Hola ${reg.invitado}! 🎩 Jugué El Sombrero Encantado, gané un regalo (${prize.name}) y te elegí a ti para compartir la experiencia conmigo. Tomás Flores nos va a contactar para coordinar.

Tú también puedes elegir tu sombrero y ganar 👉 ${url}`;
  const dInv = digits(reg.telInvitado);
  const invite = $('inviteButton');
  invite.href = (dInv.length === 11 ? 'https://wa.me/' + dInv : 'https://wa.me/') + '?text=' + encodeURIComponent(msgInvite);
  invite.textContent = '💌 Avisarle a ' + reg.invitado;
  $('inviteStep').textContent = 'PASO 2 · AVÍSALE A ' + reg.invitado.toUpperCase();
}

$('shareForm').addEventListener('submit', event => {
  event.preventDefault();
  const reg = {
    nombre: $('fNombre').value.trim(),
    tel: $('fTel').value.trim(),
    ciudad: $('fCiudad').value,
    invitado: $('fInvitado').value.trim(),
    telInvitado: $('fTelInvitado').value.trim()
  };
  const err = $('fError');
  if (reg.nombre.length < 2) { err.textContent = 'Escribe tu nombre.'; $('fNombre').focus(); return; }
  if (digits(reg.tel).length !== 11) { err.textContent = 'Escribe tu WhatsApp completo (10 dígitos).'; $('fTel').focus(); return; }
  if (!reg.ciudad) { err.textContent = 'Elige tu ciudad.'; $('fCiudad').focus(); return; }
  if (reg.invitado.length < 2) { err.textContent = 'Dinos con quién vas a compartir tu regalo.'; $('fInvitado').focus(); return; }
  if (reg.telInvitado && digits(reg.telInvitado).length !== 11) { err.textContent = 'El WhatsApp de tu invitado(a) está incompleto (o déjalo vacío).'; $('fTelInvitado').focus(); return; }
  if (!$('fAcepto').checked) { err.textContent = 'Marca la casilla para que podamos entregarte tu regalo.'; return; }
  err.textContent = '';
  if (!DEMO_MODE) { try { localStorage.setItem(REG_KEY, JSON.stringify({...reg, at: new Date().toISOString()})); } catch (_) {} }
  showDone(currentPrize, reg);
  $('doneBox').scrollIntoView({block: 'start', behavior: 'smooth'});
  chime(784, .3, 'sine', .1); chime(1046.5, .45, 'sine', .1, .12);
});

function resetToIdle() {
  round += 1;
  if (resultDialog.open) resultDialog.close();
  phase = 'idle';
  renderTiles();
  tiles.forEach(tile => tile.element.classList.add('covered'));
  $('startButton').hidden = false;
  const existing = getSavedReceipt();
  $('startButton').textContent = DEMO_MODE ? '✦ PROBAR EL JUEGO ✦' : existing ? '✦ REPETIR LA MAGIA ✦' : '✦ INICIAR EL JUEGO ✦';
  $('lead').textContent = '¡Cinco sombreros, cinco regalos! Todos ganan.';
  $('launchCaption').textContent = DEMO_MODE ? 'Modo demostración: los premios de prueba no se asignan realmente.' : existing ? 'Puedes volver a ver la animación. Tu regalo guardado no cambiará.' : '¡Mira cómo se mezclan y elige tu sombrero favorito!';
  setStatus('Presiona iniciar para descubrir tu regalo');
  $('hint').textContent = 'Participación gratuita · No se requiere compra';
}
ensureEligibilityControl();
$('startButton').addEventListener('click', startGame);
$('soundButton').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  $('soundButton').setAttribute('aria-pressed', String(soundEnabled));
  $('soundButton').querySelector('span').textContent = soundEnabled ? 'Sonido: sí' : 'Sonido: no';
  $('soundButton').firstChild.textContent = soundEnabled ? '♫ ' : '♪̸ ';
  $('soundButton').title = soundEnabled ? 'Silenciar el juego' : 'Activar sonido';
  if (soundEnabled) {
    unlockSound();
    startMelody();
    toast('Sonido activado');
  } else {
    ambientAudio.pause();
    if (audioCtx && soundBus) soundBus.gain.setTargetAtTime(0, audioCtx.currentTime, .02);
    toast('Sonido desactivado');
  }
  if (soundEnabled && audioCtx && soundBus) soundBus.gain.setTargetAtTime(.8, audioCtx.currentTime, .02);
});
$('fullscreenButton').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) { await document.exitFullscreen(); }
    else if (document.documentElement.requestFullscreen) { await document.documentElement.requestFullscreen(); }
    else { toast('En este navegador, usa “Añadir a pantalla de inicio” para verlo a pantalla completa.'); }
  } catch (_) { toast('Tu navegador no permitió activar pantalla completa.'); }
});
resultDialog.addEventListener('cancel', event => { event.preventDefault(); });
resetToIdle();

// Debug interface. The user's choice does not affect the prize odds.
window.sombreroGame = Object.freeze({ getPrizes: () => PRIZES.map(p => ({...p})), drawPrize });
