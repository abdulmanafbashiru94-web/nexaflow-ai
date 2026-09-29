/* ============================================================
   NexaFlow AI — Interactions
   ES5 for maximum browser compatibility (IE11+).
   ============================================================ */

(function () {
  'use strict';

  /* Helper: turn a NodeList into a real Array for safe iteration */
  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  /* ---- Sticky header shadow ---- */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      if (y > 8) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll);
  }

  /* ---- Mobile nav ---- */
  var nav = document.querySelector('.nav');
  var toggle = document.querySelector('.nav-toggle');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
    });
    var navLinks = qsa('.nav-links a', nav);
    for (var i = 0; i < navLinks.length; i++) {
      navLinks[i].addEventListener('click', function () {
        nav.classList.remove('open');
      });
    }
  }

  /* ---- FAQ accordion ---- */
  var faqItems = qsa('.faq-item');
  for (var f = 0; f < faqItems.length; f++) {
    (function (item) {
      var q = item.querySelector('.faq-q');
      var a = item.querySelector('.faq-a');
      if (!q || !a) return;
      q.addEventListener('click', function () {
        var isOpen = item.classList.contains('open');
        var siblings = qsa('.faq-item.open', item.parentElement);
        for (var s = 0; s < siblings.length; s++) {
          siblings[s].classList.remove('open');
          siblings[s].querySelector('.faq-a').style.maxHeight = null;
        }
        if (!isOpen) {
          item.classList.add('open');
          a.style.maxHeight = a.scrollHeight + 'px';
        }
      });
    })(faqItems[f]);
  }

  /* ---- Reveal on scroll (progressive) ----
     Only hide elements if IntersectionObserver is supported, so
     content is always visible in older browsers or with JS off. */
  var revealEls = qsa('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window) {
    document.documentElement.className += ' js-anim';
    var io = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            entries[i].target.classList.add('in');
            io.unobserve(entries[i].target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    for (var j = 0; j < revealEls.length; j++) {
      io.observe(revealEls[j]);
    }
  }

  /* ---- Hero chat simulation ---- */
  var chatBody = document.getElementById('chatBody');
  if (chatBody) {
    var messages = [
      { kind: 'user', text: 'Hi! Do you have availability this week?' },
      { kind: 'ai', text: 'Yes! We have Thursday at 2:00 PM open — want me to book you in? 😊' },
      { kind: 'user', text: 'Perfect, book it!' },
      { kind: 'ai', text: 'Done ✅ Your spot is saved. I\u2019ll send the confirmation on WhatsApp.' },
      { kind: 'wa', text: 'Continue on WhatsApp' }
    ];

    var waSvg =
      '<svg width="16" height="16" viewBox="0 0 24 24">' +
      '<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.7.8-.8 1-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.5-1.5-1.8-.1-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s1 2.5 1.1 2.7c.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.3z"/>' +
      '</svg>';

    var index = 0;
    var typing = document.createElement('div');
    typing.className = 'msg msg-ai typing';
    typing.innerHTML = '<span></span><span></span><span></span>';

    function typeMessage(msg, onDone) {
      if (msg.kind === 'wa') {
        var wa = document.createElement('a');
        wa.className = 'msg-wa';
        wa.href = 'https://wa.me/233545886354';
        wa.target = '_blank';
        wa.rel = 'noopener';
        wa.innerHTML = waSvg + '<span>' + msg.text + '</span>';
        chatBody.appendChild(wa);
        onDone();
        return;
      }
      var el = document.createElement('div');
      el.className = 'msg ' + (msg.kind === 'user' ? 'msg-user' : 'msg-ai');
      chatBody.appendChild(el);
      var i = 0;
      function tick() {
        el.textContent = msg.text.slice(0, i);
        i++;
        if (i <= msg.text.length) {
          setTimeout(tick, 18);
        } else {
          onDone();
        }
      }
      tick();
    }

    function next() {
      if (index >= messages.length) {
        setTimeout(function () {
          chatBody.innerHTML = '';
          index = 0;
          next();
        }, 4200);
        return;
      }
      var msg = messages[index];
      index++;
      if (msg.kind === 'ai') {
        chatBody.appendChild(typing);
        setTimeout(function () {
          typing.remove();
          typeMessage(msg, function () { setTimeout(next, 700); });
        }, 800);
      } else {
        typeMessage(msg, function () { setTimeout(next, 650); });
      }
    }

    next();
  }

  /* ---- Contact form (static demo) ---- */
  /* ---- WhatsApp auto-delivery ----
     Sends a client's request straight into the owner's WhatsApp.
     Paste a free CallMeBot key below (docs/WHATSAPP-SETUP.md) and every
     form submission appears in WhatsApp automatically — no client action.
     Without a key it falls back to opening WhatsApp with the text pre-filled. */
  var WHATSAPP = {
    number: '233545886354',
    callMeBotKey: ''
  };

  // Free email backup (Web3Forms) — every enquiry/review also lands in your
  // inbox automatically. Get a key at https://web3forms.com (2 min, free),
  // then paste it below. Works immediately, no third-party bot queue.
  var web3formsKey = '513d8cb3-d626-4742-92c3-61d85fe46b93';

  function buildEnquiryText(fields) {
    var NL = '\n';
    var t = 'New enquiry from ' + fields.name;
    if (fields.business) { t += NL + '\u2022 Business: ' + fields.business; }
    if (fields.phone) { t += NL + '\u2022 Phone/WhatsApp: ' + fields.phone; }
    if (fields.email) { t += NL + '\u2022 Email: ' + fields.email; }
    t += NL + '\u2022 Needs: ' + (fields.service || 'General enquiry');
    if (fields.message) { t += NL + '\u2022 Details: ' + fields.message; }
    var ref = null;
    try { ref = window.localStorage.getItem('nexaflow_ref'); } catch (e) {}
    if (ref) { t += NL + '\u2022 Referred by: ' + ref + ' (10% off both)'; }
    t += NL + NL + '(Sent from the NexaFlow AI website)';
    return t;
  }

  function sendToWhatsApp(number, text, key) {
    var url = 'https://api.callmebot.com/whatsapp.php?phone=' + encodeURIComponent(number) +
      '&text=' + encodeURIComponent(text) + '&apikey=' + encodeURIComponent(key);
    try {
      if (window.fetch) {
        window.fetch(url, { mode: 'no-cors' }).catch(function () {});
      } else {
        var img = new Image();
        img.src = url;
      }
    } catch (e) {
      try { var img2 = new Image(); img2.src = url; } catch (e2) {}
    }
  }

  function sendEmailBackup(fields, text) {
    if (!web3formsKey) { return; }
    var body = 'access_key=' + encodeURIComponent(web3formsKey) +
      '&subject=' + encodeURIComponent('New enquiry from ' + (fields.name || 'website visitor')) +
      '&from_name=' + encodeURIComponent(fields.name + (fields.business ? ' (' + fields.business + ')' : '')) +
      '&name=' + encodeURIComponent(fields.name || '') +
      '&email=' + encodeURIComponent(fields.email || '') +
      '&replyto=' + encodeURIComponent(fields.email || '') +
      '&phone=' + encodeURIComponent(fields.phone || '') +
      '&business=' + encodeURIComponent(fields.business || '') +
      '&service=' + encodeURIComponent(fields.service || '') +
      '&message=' + encodeURIComponent(text);
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://api.web3forms.com/submit', true);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      xhr.send(body);
    } catch (e) {}
  }

  window.NexaFlowWhatsApp = {
    config: WHATSAPP,
    web3formsKey: web3formsKey,
    build: buildEnquiryText,
    send: sendToWhatsApp,
    sendEmail: sendEmailBackup
  };

  var form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var g = function (id) {
        var el = document.getElementById(id);
        return el ? String(el.value || '').replace(/^\s+|\s+$/g, '') : '';
      };
      var fields = {
        name: g('name'),
        business: g('business'),
        email: g('email'),
        phone: g('phone'),
        service: g('service'),
        message: g('message')
      };

      if (!fields.name || !fields.email) {
        showToast('Please enter your name and email so we can reply.');
        return;
      }

      var text = buildEnquiryText(fields);

      // Email backup — guaranteed arrival in the owner's inbox, no client action.
      sendEmailBackup(fields, text);

      if (WHATSAPP.callMeBotKey) {
        // Real delivery — the request lands in your WhatsApp automatically.
        sendToWhatsApp(WHATSAPP.number, text, WHATSAPP.callMeBotKey);
        showToast('\u2713 Request sent to our WhatsApp \u2014 we\u2019ll reply shortly.');
        form.reset();
        return;
      }

      // Fallback (no WhatsApp auto key) — open WhatsApp pre-filled for the client to send.
      var url = 'https://wa.me/' + WHATSAPP.number + '?text=' + encodeURIComponent(text);
      var opened = window.open(url, '_blank');
      if (!opened) { window.location.href = url; }
      showToast(web3formsKey
        ? '\u2713 Request sent to our inbox \u2014 WhatsApp is open if you\u2019d like to chat now.'
        : 'Opening WhatsApp \u2014 press send and we\u2019ll get back to you.');
      form.reset();
    });
  }

  /* ---- Toast helper ---- */
  function showToast(message) {
    var toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML =
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M20 6 9 17l-5-5"/></svg>' +
        '<span class="toast-text"></span>';
      document.body.appendChild(toast);
    }
    toast.querySelector('.toast-text').textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      toast.classList.remove('show');
    }, 4200);
  }

  /* ---- Beta banner ----
     Shown at the very top of every page during the public testing phase.
     Dismissible; the choice is remembered for this browser. */
  (function () {
    if (/feedback\.html/.test(window.location.pathname)) { return; }
    var dismissed = false;
    try { dismissed = window.localStorage && window.localStorage.getItem('nexaflow_beta_closed') === '1'; } catch (e) {}
    if (dismissed) { return; }

    var bar = document.createElement('div');
    bar.setAttribute('role', 'banner');
    bar.style.cssText =
      'background:#4f46e5;background:linear-gradient(90deg,#4f46e5,#7c3aed);' +
      'color:#fff;font-size:13.5px;line-height:1.55;padding:9px 44px 9px 16px;' +
      'text-align:center;position:relative;';
    bar.innerHTML =
      '<strong>\ud83d\udea7 Public beta</strong> \u2014 everything is free to try right now. ' +
      'Found a problem? <a href="feedback.html" style="color:#fff;font-weight:700;text-decoration:underline;">Report a problem</a> and help us improve. ' +
      '<span style="opacity:.9;">Early testers: mention <strong>BETA</strong> when you book for a launch discount.</span>';

    var close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss banner');
    close.style.cssText =
      'position:absolute;right:12px;top:9px;background:rgba(255,255,255,.22);border:0;' +
      'color:#fff;border-radius:50%;width:22px;height:22px;cursor:pointer;' +
      'font-size:13px;line-height:1;padding:0;';
    close.textContent = '\u2715';
    close.onclick = function () {
      if (bar.parentNode) { bar.parentNode.removeChild(bar); }
      try { window.localStorage.setItem('nexaflow_beta_closed', '1'); } catch (e) {}
    };
    bar.appendChild(close);
    document.body.insertBefore(bar, document.body.firstChild);
  })();

  /* ---- Referral capture + banner ----
     When someone lands with ?ref=NAME, we remember it and tell them their
     friend sent them — both get 10% off. The code rides along on enquiries. */
  (function () {
    if (/feedback\.html/.test(window.location.pathname)) { return; }
    var m = /[?&]ref=([^&#]+)/.exec(window.location.search || '');
    var ref = m ? decodeURIComponent(m[1].replace(/\+/g, ' ')).replace(/^\s+|\s+$/g, '') : '';
    if (!ref) { return; }
    try { window.localStorage.setItem('nexaflow_ref', ref); } catch (e) {}
    var seen = false;
    try { seen = window.localStorage.getItem('nexaflow_ref_seen') === '1'; } catch (e) {}
    if (seen) { return; }
    try { window.localStorage.setItem('nexaflow_ref_seen', '1'); } catch (e) {}

    var bar = document.createElement('div');
    bar.setAttribute('role', 'banner');
    bar.style.cssText =
      'background:#065f46;background:linear-gradient(90deg,#065f46,#047857);' +
      'color:#fff;font-size:13.5px;line-height:1.55;padding:9px 44px 9px 16px;' +
      'text-align:center;position:relative;';
    bar.innerHTML =
      '<strong>\ud83c\udf81 You were invited!</strong> Your friend sent you to NexaFlow AI \u2014 ' +
      'you <em>both</em> get <strong>10% off</strong> any package. Just mention code ' +
      '<strong style="letter-spacing:.04em;">' + ref.replace(/[<>&"']/g, '') + '</strong> when you book.';
    var close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss');
    close.style.cssText =
      'position:absolute;right:12px;top:9px;background:rgba(255,255,255,.22);border:0;' +
      'color:#fff;border-radius:50%;width:22px;height:22px;cursor:pointer;' +
      'font-size:13px;line-height:1;padding:0;';
    close.textContent = '\u2715';
    close.onclick = function () { if (bar.parentNode) { bar.parentNode.removeChild(bar); } };
    bar.appendChild(close);
    document.body.insertBefore(bar, document.body.firstChild);
  })();

  /* ---- Floating "Report a problem" button ----
     Appears on every page (skipped only on the feedback page itself) so
     testers and clients can send bug reports and ideas straight to us. */
  if (!/feedback\.html/.test(window.location.pathname)) {
    var fb = document.createElement('a');
    fb.className = 'fb-float';
    fb.href = 'feedback.html';
    fb.setAttribute('aria-label', 'Report a problem or leave feedback');
    fb.innerHTML = '<span class="star">\ud83d\udcac</span><span>Report a problem</span>';
    document.body.appendChild(fb);
  }
})();
