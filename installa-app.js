/*
 * FMFixApp · invito a installare l'app sul telefono.
 * - Registra il service worker minimo (sw.js).
 * - Android (Chrome, Edge, Samsung Internet): pulsante "Installa" che apre la conferma di sistema.
 * - iPhone/iPad: istruzioni per "Aggiungi alla schermata Home" (Safari non consente l'installazione da sito).
 * - Nessun avviso su computer, se l'app è già aperta dall'icona o se l'utente ha scelto "Non ora" negli ultimi 30 giorni.
 * L'avviso compare all'apertura della pagina, già sulla schermata di accesso, e resta finché l'utente non lo chiude.
 * Uso nella pagina: <script src="./installa-app.js" data-nome-app="FMFixApp Ordini" defer></script>
 */
(function () {
  'use strict';

  var script = document.currentScript;
  var NOME_APP = (script && script.getAttribute('data-nome-app')) || 'FMFixApp';
  var CHIAVE_RINVIO = 'fmfix_invito_installazione_' + location.pathname.split('/').pop().toLowerCase();
  var GIORNI_RINVIO = 30;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () { /* l'app funziona anche senza */ });
    });
  }

  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/i.test(ua);
  // Su iPhone l'aggiunta alla Home non è disponibile nei browser interni di WhatsApp, Gmail, ecc.
  var isIOSBrowserInterno = isIOS && !/Safari\//.test(ua);

  var richiestaInstallazione = null;
  var banner = null;
  var invitoAttivo = false;

  function giaApertaComeApp() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  }
  function leggi(chiave) { try { return localStorage.getItem(chiave); } catch (e) { return null; } }
  function scrivi(chiave, valore) { try { localStorage.setItem(chiave, valore); } catch (e) { /* storage non disponibile */ } }
  function rinviata() {
    var t = Number(leggi(CHIAVE_RINVIO) || 0);
    return t > 0 && Date.now() - t < GIORNI_RINVIO * 24 * 60 * 60 * 1000;
  }

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    richiestaInstallazione = event;
    // Chrome può segnalare l'installabilità qualche istante dopo l'apertura della pagina.
    if (invitoAttivo) mostra('android');
  });
  window.addEventListener('appinstalled', function () { richiestaInstallazione = null; nascondi(); });

  var ICONA_CONDIVIDI = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-3px"><path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';

  function aggiungiStile() {
    if (document.getElementById('fm-installa-stile')) return;
    var s = document.createElement('style');
    s.id = 'fm-installa-stile';
    s.textContent =
      '.fm-installa{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:9000;max-width:560px;margin:0 auto;' +
      'background:#fff;color:#1e293b;border:1px solid #cbd5e1;border-radius:14px;box-shadow:0 10px 30px rgba(15,23,42,.22);padding:14px 16px;' +
      'display:flex;gap:12px;align-items:flex-start;font:15px/1.45 Arial,Helvetica,sans-serif}' +
      '.fm-installa img{width:44px;height:44px;border-radius:10px;flex:none;border:1px solid #e2e8f0}' +
      '.fm-installa-testo{flex:1;min-width:0}.fm-installa-titolo{font-weight:bold;margin:0 0 2px}.fm-installa-msg{margin:0;color:#475569;font-size:14px}' +
      '.fm-installa-azioni{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}' +
      '.fm-installa button{font:inherit;font-size:14px;font-weight:bold;border-radius:8px;padding:8px 14px;cursor:pointer}' +
      '.fm-installa-si{background:#1e40af;color:#fff;border:1px solid #1e40af}' +
      '.fm-installa-no{background:#fff;color:#334155;border:1px solid #cbd5e1}';
    document.head.appendChild(s);
  }

  function mostra(tipo) {
    if (banner || giaApertaComeApp() || rinviata()) return;
    aggiungiStile();
    var titolo, messaggio, pulsanteSi = '';
    if (tipo === 'android') {
      titolo = 'Installa ' + NOME_APP;
      messaggio = 'Aggiungila alla schermata Home per aprirla al volo dal telefono, a schermo intero.';
      pulsanteSi = '<button type="button" class="fm-installa-si" data-fm-installa>Installa</button>';
    } else if (tipo === 'ios-interno') {
      titolo = 'Aggiungi ' + NOME_APP + ' alla Home';
      messaggio = 'Apri questa pagina in Safari, poi tocca Condividi ' + ICONA_CONDIVIDI + ' e scegli “Aggiungi alla schermata Home”.';
    } else {
      titolo = 'Aggiungi ' + NOME_APP + ' alla Home';
      messaggio = 'Tocca Condividi ' + ICONA_CONDIVIDI + ' nella barra del browser e scegli “Aggiungi alla schermata Home”.';
    }
    banner = document.createElement('div');
    banner.className = 'fm-installa';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Installazione app');
    banner.innerHTML =
      '<img src="./icona-192.png" alt="">' +
      '<div class="fm-installa-testo"><p class="fm-installa-titolo"></p><p class="fm-installa-msg">' + messaggio + '</p>' +
      '<div class="fm-installa-azioni">' + pulsanteSi + '<button type="button" class="fm-installa-no" data-fm-rinvia>' + (pulsanteSi ? 'Non ora' : 'Ho capito') + '</button></div></div>';
    banner.querySelector('.fm-installa-titolo').textContent = titolo;
    banner.querySelector('[data-fm-rinvia]').addEventListener('click', function () {
      scrivi(CHIAVE_RINVIO, String(Date.now()));
      nascondi();
    });
    var si = banner.querySelector('[data-fm-installa]');
    if (si) si.addEventListener('click', function () {
      var richiesta = richiestaInstallazione;
      if (!richiesta) { nascondi(); return; }
      richiestaInstallazione = null;
      richiesta.prompt();
      richiesta.userChoice.then(function (scelta) {
        if (scelta && scelta.outcome !== 'accepted') scrivi(CHIAVE_RINVIO, String(Date.now()));
      }).catch(function () {}).then(nascondi);
    });
    document.body.appendChild(banner);
    // Lascia spazio in fondo, così l'avviso non copre i pulsanti dei moduli.
    document.body.style.paddingBottom = (banner.offsetHeight + 24) + 'px';
  }

  function nascondi() {
    if (!banner) return;
    banner.remove();
    banner = null;
    document.body.style.paddingBottom = '';
  }

  function avvia() {
    if (giaApertaComeApp() || rinviata()) return;
    if (isIOS) { mostra(isIOSBrowserInterno ? 'ios-interno' : 'ios'); return; }
    if (!isAndroid) return; // computer: nessun avviso
    // Android: l'avviso compare quando Chrome conferma che l'app è installabile.
    // Se non lo conferma (app già installata o browser non compatibile) non compare nulla.
    invitoAttivo = true;
    if (richiestaInstallazione) mostra('android');
  }

  // Lo script è caricato con "defer": la pagina è già pronta.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
  else avvia();
})();
