

/* ===== user-script.js — merged page scripts + libraries ===== */
/* MayaGateway library must be defined first. Page code is guarded. */

/* ===== Combined layout helper (query ?combined=) ===== */
(function () {
  try {
    if (new URLSearchParams(location.search).has("combined")) {
      var style = document.createElement("style");
      style.textContent = ".side{display:none!important}.mb{display:none!important}.app,.main{width:100%!important;height:100%!important;min-height:100%!important}body{height:auto!important;min-height:100%!important;overflow:auto!important}";
      document.head.append(style);
    }
  } catch (e) {}
})();

/* ===== Shared theme / dark mode (runs on every page) ===== */
(function () {
  var THEME_KEY = "landbankThemeMode";
  function applyTheme(dark) {
    document.body.dataset.theme = dark ? "dark" : "light";
    try { localStorage.setItem(THEME_KEY, dark ? "dark" : "light"); } catch (e) {}
    var toggle = document.getElementById("darkModeToggle");
    if (toggle) toggle.checked = !!dark;
    if (window.parent !== window) {
      try { window.parent.postMessage({ type: "landbank-theme", dark: !!dark }, "*"); } catch (e) {}
    }
  }
  function initTheme() {
    var stored = "light";
    try { stored = localStorage.getItem(THEME_KEY) || "light"; } catch (e) {}
    applyTheme(stored === "dark");
    var themeToggle = document.getElementById("darkModeToggle");
    if (themeToggle) {
      themeToggle.addEventListener("change", function (event) {
        applyTheme(event.target.checked);
      });
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTheme);
  } else {
    initTheme();
  }
  // expose for pages that call applyTheme themselves (noop-safe)
  window.__landbankApplyTheme = applyTheme;
})();

/* ===== Shared demo account balance ===== */
(function () {
  var BALANCE_KEY = "iAccessDemoBalance";
  var DEFAULT_BALANCE = 50000;

  window.LandbankDemoBalance = {
    get: function () {
      var stored = localStorage.getItem(BALANCE_KEY);
      if (stored === null) return DEFAULT_BALANCE;
      var balance = Number(stored);
      return Number.isFinite(balance) && balance >= 0 ? balance : DEFAULT_BALANCE;
    },
    set: function (balance) {
      if (!Number.isFinite(balance) || balance < 0) {
        throw new RangeError("Account balance must be a finite, non-negative amount.");
      }
      localStorage.setItem(BALANCE_KEY, String(balance));
    },
    format: function (balance) {
      return "₱" + Number(balance).toLocaleString("en-PH", { maximumFractionDigits: 2 });
    }
  };
})();

/* ===== Shared demo transaction notifications ===== */
(function () {
  var NOTIFICATIONS_KEY = "iAccessDemoNotifications";

  function readNotifications() {
    try {
      var stored = localStorage.getItem(NOTIFICATIONS_KEY);
      var parsed = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(parsed)) throw new TypeError("Stored notifications must be an array.");
      return parsed;
    } catch (error) {
      console.error("Unable to load transaction notifications.", error);
      return [];
    }
  }

  var notifications = readNotifications();

  function saveNotifications() {
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
      return true;
    } catch (error) {
      console.error("Unable to save transaction notifications.", error);
      return false;
    }
  }

  function updateNotificationDot() {
    var bell = document.getElementById("bell");
    if (!bell) return;
    var badge = bell.querySelector(".notification-badge");
    if (badge) {
      var unreadCount = document.querySelectorAll(".np-item.unread").length;
      var unreadText = String(unreadCount);
      if (badge.textContent !== unreadText) badge.textContent = unreadText;
      if (badge.hidden !== (unreadCount === 0)) badge.hidden = unreadCount === 0;
      var legacyDot = bell.querySelector("u");
      if (legacyDot) legacyDot.remove();
      return;
    }
    var hasUnread = notifications.some(function (item) { return item.unread; }) ||
      !!document.querySelector(".np-item.unread:not([data-notification-id])");
    var dot = bell.querySelector("u");
    if (hasUnread && !dot) {
      dot = document.createElement("u");
      bell.appendChild(dot);
    } else if (!hasUnread && dot) {
      dot.remove();
    }
  }

  function renderNotification(item, list, prepend) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "np-item" + (item.unread ? " unread" : "");
    button.dataset.notificationId = item.id;
    var icon = document.createElement("span");
    icon.className = "c";
    icon.innerHTML = '<svg class="ic" width="20" height="20" aria-hidden="true"><use href="#i-up" /></svg>';
    var content = document.createElement("span");
    var title = document.createElement("p");
    title.textContent = item.title;
    var detail = document.createElement("small");
    detail.textContent = item.detail;
    content.append(title, detail);
    button.append(icon, content);
    button.addEventListener("click", function () {
      if (!item.unread) return;
      item.unread = false;
      button.classList.remove("unread");
      saveNotifications();
      updateNotificationDot();
    });
    if (prepend) list.insertBefore(button, list.firstChild);
    else list.appendChild(button);
  }

  window.LandbankDemoNotifications = {
    add: function (title, detail) {
      var item = {
        id: Date.now().toString() + "-" + Math.random().toString(36).slice(2),
        title: String(title),
        detail: String(detail),
        unread: true
      };
      notifications.unshift(item);
      saveNotifications();
      var list = document.querySelector(".np-list");
      if (list) renderNotification(item, list, true);
      updateNotificationDot();
    }
  };

  function initNotifications() {
    var list = document.querySelector(".np-list");
    if (list) notifications.slice().reverse().forEach(function (item) {
      renderNotification(item, list, true);
    });
    var markAll = document.getElementById("markAll");
    if (markAll) markAll.addEventListener("click", function () {
      var changed = false;
      notifications.forEach(function (item) {
        if (item.unread) {
          item.unread = false;
          changed = true;
        }
      });
      if (changed) saveNotifications();
      updateNotificationDot();
    });
    updateNotificationDot();
  }

  function initialize() {
    var list = document.querySelector(".np-list");
    if (!list) return;
    initNotifications();
    new MutationObserver(updateNotificationDot).observe(list, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();

/* ===== Payment gateway notification controls ===== */
(function () {
  var root = document.querySelector(".pg-root");
  if (!root) return;

  function initialize() {
    var bell = root.querySelector("#bell");
    var panel = root.querySelector("#np");
    var list = root.querySelector(".np-list");
    var markAll = root.querySelector("#markAll");
    if (!bell || !panel || !list || !markAll) return;

    function setOpen(open) {
      panel.classList.toggle("open", open);
      bell.setAttribute("aria-expanded", String(open));
    }

    bell.addEventListener("click", function (event) {
      event.stopPropagation();
      setOpen(!panel.classList.contains("open"));
    });
    panel.addEventListener("click", function (event) {
      event.stopPropagation();
    });
    list.addEventListener("click", function (event) {
      var item = event.target.closest(".np-item");
      if (item) item.classList.remove("unread");
    });
    markAll.addEventListener("click", function () {
      list.querySelectorAll(".np-item.unread").forEach(function (item) {
        item.classList.remove("unread");
      });
    });
    document.addEventListener("click", function () {
      setOpen(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setOpen(false);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();

/* ===== from payment-gateway.js (MayaGateway library) ===== */
/* ============================================================
   Maya Payment Gateway — behaviour
   No frameworks, no build step. Expose one global: MayaGateway.

     MayaGateway.init({ merchant, orderId, items, shipping, mobile,
                        onSuccess, onPending, onFailure })
     MayaGateway.reset()          // back to the method picker
     MayaGateway.getTotals()      // { subtotal, shipping, fee, total }

   Demo OTP code is 123456. Swap checkOtp() for a real API call
   when you wire this to a backend.
   ============================================================ */
var MayaGateway = (function () {
  'use strict';

  /* ---------- tiny helpers ---------- */
  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function peso(n) {
    return '\u20B1' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function icon(id) { return '<svg class="pg-icon"><use href="#pg-' + id + '"/></svg>'; }

  /* ---------- configuration ---------- */
  var config = {
    merchant : 'Sample Merchant',
    orderId  : 'ORD-00000',
    items    : [],
    shipping : 0,
    mobile   : '+63 9\u2022\u2022 \u2022\u2022\u2022 \u2022\u2022\u2022\u2022',
    onSuccess: null,
    onPending: null,
    onFailure: null
  };

  /* ---------- the four payment methods ---------- */
  var METHODS = [
    {
      id: 'gcash', kind: 'wallet',
      name: 'GCash',
      sub : 'Pay using your GCash wallet balance',
      fee : 0,
      logo: 'G', bg: '#0A62E0', fg: '#FFFFFF'
    },
    {
      id: 'card', kind: 'card',
      name: 'Credit or debit card',
      sub : 'Visa, Mastercard, JCB',
      fee : 0,
      logo: icon('card'), bg: '#EEF2F6', fg: '#16222E'
    },
    {
      id: 'bank', kind: 'bank',
      name: 'Online banking',
      sub : 'BPI, BDO, UnionBank and 5 more',
      fee : 15,
      logo: icon('bank'), bg: '#EAF1FE', fg: '#2F6FED'
    },
    {
      id: 'otc', kind: 'otc',
      name: 'Over the counter',
      sub : 'Pay in cash at a partner branch',
      fee : 25,
      logo: icon('store'), bg: '#FEF4E4', fg: '#E5890A'
    }
  ];

  var BANKS    = ['BPI', 'BDO', 'UnionBank', 'Metrobank', 'RCBC', 'Landbank', 'PNB', 'Security Bank'];
  var PARTNERS = ['7-Eleven', 'Cebuana', 'Palawan', 'M Lhuillier', 'SM Bills', 'Robinsons'];

  /* ---------- runtime state ---------- */
  var state = {
    method   : null,   // 'gcash' | 'card' | 'bank' | 'otc'
    bank     : null,
    partner  : PARTNERS[0],
    mobile   : '',
    cardLast4: '',
    cardBrand: '',
    resendId : null,
    lastRef  : ''
  };

  /* ============================================================
     MONEY
     ============================================================ */
  function getTotals() {
    var subtotal = config.items.reduce(function (sum, i) { return sum + Number(i.price); }, 0);
    var method   = METHODS.filter(function (m) { return m.id === state.method; })[0];
    var fee      = method ? method.fee : 0;
    return {
      subtotal: subtotal,
      shipping: Number(config.shipping) || 0,
      fee     : fee,
      total   : subtotal + (Number(config.shipping) || 0) + fee
    };
  }

  /* ============================================================
     RENDER — order summary
     ============================================================ */
  function renderSummary() {
    var t = getTotals();
    $('#pgSummary').innerHTML =
      '<div class="pg-merchant">' +
        '<div class="pg-merchant-logo">' + icon('store') + '</div>' +
        '<div><b>' + esc(config.merchant) + '</b>' +
        '<small class="pg-mono">Order ' + esc(config.orderId) + '</small></div>' +
      '</div>' +
      '<div class="pg-items">' +
        config.items.map(function (i) {
          return '<div class="pg-item"><span class="pg-item-name">' + esc(i.name) +
                 '<small>' + esc(i.qty || '') + '</small></span>' +
                 '<b class="pg-num">' + peso(i.price) + '</b></div>';
        }).join('') +
      '</div>' +
      '<div class="pg-totals">' +
        '<div><span>Subtotal</span><span class="pg-num">' + peso(t.subtotal) + '</span></div>' +
        '<div><span>Shipping</span><span class="pg-num">' + peso(t.shipping) + '</span></div>' +
        '<div><span>Convenience fee</span><span class="pg-num">' + (t.fee ? peso(t.fee) : 'None') + '</span></div>' +
      '</div>' +
      '<div class="pg-grand"><span>Amount due</span><b class="pg-num">' + peso(t.total) + '</b></div>';
  }

  /* ============================================================
     RENDER — method list + the open method's form
     ============================================================ */
  function renderMethods() {
    var t = getTotals();
    $('#pgMethods').innerHTML = METHODS.map(function (m) {
      var open = state.method === m.id;
      var row =
        '<button type="button" class="pg-method' + (open ? ' is-selected' : '') + '" ' +
                'data-pg="pick" data-id="' + m.id + '" aria-pressed="' + open + '">' +
          '<span class="pg-method-logo" style="background:' + m.bg + ';color:' + m.fg + '">' + m.logo + '</span>' +
          '<span class="pg-method-text"><b>' + esc(m.name) + '</b><small>' + esc(m.sub) + '</small></span>' +
          (m.fee ? '<span class="pg-method-fee">+' + peso(m.fee) + '</span>' : '') +
          '<span class="pg-radio"></span>' +
        '</button>';
      return open ? row + '<div class="pg-detail">' + methodForm(m, t) + '</div>' : row;
    }).join('');

    bindCardFormatting();
  }

  function methodForm(m, t) {
    var html = '';

    if (m.kind === 'wallet') {
      html =
        '<label class="pg-field">' +
          '<span class="pg-label">GCash mobile number</span>' +
          '<input class="pg-input pg-mono" id="pgMobile" type="tel" autocomplete="tel" ' +
                 'placeholder="+63 9\u2022\u2022 \u2022\u2022\u2022 \u2022\u2022\u2022\u2022" value="' + esc(config.mobile) + '">' +
          '<span class="pg-error" id="pgMobileError" hidden>Enter the 11-digit mobile number linked to your GCash.</span>' +
        '</label>' +
        '<label class="pg-field">' +
          '<span class="pg-label">MPIN</span>' +
          '<span class="pg-holder">' +
            '<input class="pg-input pg-mono" id="pgPin" type="password" inputmode="numeric" maxlength="4" placeholder="\u2022\u2022\u2022\u2022" autocomplete="off">' +
            '<button type="button" class="pg-eye" data-pg="peek" data-target="pgPin" aria-label="Show MPIN">' + icon('eye') + '</button>' +
          '</span>' +
          '<span class="pg-error" id="pgPinError" hidden>Your MPIN is 4 digits.</span>' +
        '</label>';

    } else if (m.kind === 'card') {
      html =
        '<label class="pg-field">' +
          '<span class="pg-label">Card number</span>' +
          '<span class="pg-holder">' +
            '<input class="pg-input pg-mono" id="pgCardNumber" inputmode="numeric" maxlength="19" ' +
                   'placeholder="4111 1111 1111 1111" autocomplete="cc-number">' +
            '<span class="pg-brandtag" id="pgCardBrand">CARD</span>' +
          '</span>' +
          '<span class="pg-error" id="pgCardNumberError" hidden>Enter a valid 16-digit card number.</span>' +
        '</label>' +
        '<div class="pg-row">' +
          '<label class="pg-field">' +
            '<span class="pg-label">Expiry <em>MM/YY</em></span>' +
            '<input class="pg-input pg-mono" id="pgCardExpiry" inputmode="numeric" maxlength="5" placeholder="09/29" autocomplete="cc-exp">' +
            '<span class="pg-error" id="pgCardExpiryError" hidden>Check the expiry date.</span>' +
          '</label>' +
          '<label class="pg-field">' +
            '<span class="pg-label">CVV</span>' +
            '<span class="pg-holder">' +
              '<input class="pg-input pg-mono" id="pgCardCvv" type="password" inputmode="numeric" maxlength="4" placeholder="\u2022\u2022\u2022" autocomplete="cc-csc">' +
              '<button type="button" class="pg-eye" data-pg="peek" data-target="pgCardCvv" aria-label="Show CVV">' + icon('eye') + '</button>' +
            '</span>' +
            '<span class="pg-error" id="pgCardCvvError" hidden>3 digits, on the back of the card.</span>' +
          '</label>' +
        '</div>' +
        '<label class="pg-field">' +
          '<span class="pg-label">Name on card</span>' +
          '<input class="pg-input" id="pgCardName" placeholder="JUAN DELA CRUZ" autocomplete="cc-name">' +
          '<span class="pg-error" id="pgCardNameError" hidden>Type the name printed on the card.</span>' +
        '</label>' +
        '<label class="pg-check"><input type="checkbox" id="pgSaveCard"> Save this card for next time</label>' +
        '<button type="button" class="pg-btn pg-btn--ghost pg-btn--small" data-pg="testcard" style="margin-top:8px">Fill a test card</button>';

    } else if (m.kind === 'bank') {
      html =
        '<span class="pg-label" style="display:block;margin-bottom:8px">Choose your bank</span>' +
        '<div class="pg-tiles">' +
          BANKS.map(function (b) {
            return '<button type="button" class="pg-tile' + (state.bank === b ? ' is-selected' : '') +
                   '" data-pg="bank" data-value="' + esc(b) + '">' + esc(b) + '</button>';
          }).join('') +
        '</div>' +
        '<p class="pg-note">' + icon('info') +
        '<span>You will be taken to your bank to sign in and approve the transfer, then brought straight back here.</span></p>';

    } else {
      html =
        '<span class="pg-label" style="display:block;margin-bottom:8px">Where will you pay?</span>' +
        '<div class="pg-tiles">' +
          PARTNERS.map(function (p) {
            return '<button type="button" class="pg-tile' + (state.partner === p ? ' is-selected' : '') +
                   '" data-pg="partner" data-value="' + esc(p) + '">' + esc(p) + '</button>';
          }).join('') +
        '</div>' +
        '<p class="pg-note">' + icon('clock') +
        '<span>We will give you a payment code. Pay it at the counter within 48 hours or the order is released.</span></p>';
    }

    return html +
      '<button type="button" class="pg-btn pg-btn--primary pg-btn--block" data-pg="pay" style="margin-top:16px">' +
        (m.kind === 'otc' ? 'Get payment code' : 'Pay ' + peso(t.total)) +
      '</button>';
  }

  /* ============================================================
     CARD INPUT — formatting, brand, Luhn
     ============================================================ */
  function luhn(digits) {
    var sum = 0, alt = false;
    for (var i = digits.length - 1; i >= 0; i--) {
      var n = parseInt(digits.charAt(i), 10);
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n; alt = !alt;
    }
    return sum % 10 === 0;
  }
  function brandOf(n) {
    if (/^4/.test(n))           return 'VISA';
    if (/^(5[1-5]|2[2-7])/.test(n)) return 'MASTERCARD';
    if (/^35/.test(n))          return 'JCB';
    if (/^3[47]/.test(n))       return 'AMEX';
    return 'CARD';
  }
  function bindCardFormatting() {
    var num = $('#pgCardNumber'), exp = $('#pgCardExpiry');
    if (num) {
      num.addEventListener('input', function () {
        var v = num.value.replace(/\D/g, '').slice(0, 16);
        num.value = v.replace(/(.{4})/g, '$1 ').trim();
        $('#pgCardBrand').textContent = v ? brandOf(v) : 'CARD';
      });
    }
    if (exp) {
      exp.addEventListener('input', function () {
        var v = exp.value.replace(/\D/g, '').slice(0, 4);
        exp.value = v.length > 2 ? v.slice(0, 2) + '/' + v.slice(2) : v;
      });
    }
  }

  /* ============================================================
     VALIDATION
     ============================================================ */
  function mark(inputId, errorId, valid) {
    var input = $('#' + inputId), error = $('#' + errorId);
    if (input) input.classList.toggle('is-invalid', !valid);
    if (error) error.hidden = valid;
    return valid;
  }

  function validate() {
    var m = METHODS.filter(function (x) { return x.id === state.method; })[0];
    if (!m) { toast('Choose a payment method first.'); return false; }
    var ok = true;

    if (m.kind === 'wallet') {
      var mobile = $('#pgMobile').value.replace(/\D/g, '');
      var pin    = $('#pgPin').value.replace(/\D/g, '');
      ok = mark('pgMobile', 'pgMobileError', mobile.length >= 10) && ok;
      ok = mark('pgPin', 'pgPinError', pin.length === 4) && ok;
      state.mobile = $('#pgMobile').value;
    }

    if (m.kind === 'card') {
      var number = $('#pgCardNumber').value.replace(/\s/g, '');
      var expiry = $('#pgCardExpiry').value;
      var cvv    = $('#pgCardCvv').value.replace(/\D/g, '');
      var name   = $('#pgCardName').value.trim();
      var month  = parseInt(expiry.slice(0, 2), 10);

      ok = mark('pgCardNumber', 'pgCardNumberError', number.length === 16 && luhn(number)) && ok;
      ok = mark('pgCardExpiry', 'pgCardExpiryError', /^\d{2}\/\d{2}$/.test(expiry) && month >= 1 && month <= 12) && ok;
      ok = mark('pgCardCvv', 'pgCardCvvError', cvv.length >= 3) && ok;
      ok = mark('pgCardName', 'pgCardNameError', name.length > 2) && ok;

      state.cardLast4 = number.slice(-4);
      state.cardBrand = brandOf(number);
    }

    if (m.kind === 'bank' && !state.bank) { toast('Pick the bank you want to use.'); return false; }

    if (!ok) toast('Check the highlighted fields.');
    return ok;
  }

  /* ============================================================
     SCREENS
     ============================================================ */
  function showScreen(id) {
    ['pgChoose', 'pgVerify', 'pgProcessing', 'pgResult'].forEach(function (s) {
      $('#' + s).hidden = (s !== id);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function setStep(n) {
    $$('#pgSteps .pg-step').forEach(function (el) {
      var v = Number(el.dataset.step);
      el.classList.toggle('is-active', v === n);
      el.classList.toggle('is-done', v < n);
    });
  }

  /* ---------- pay ---------- */
  function pay() {
    if (!validate()) return;
    var m = METHODS.filter(function (x) { return x.id === state.method; })[0];

    // over the counter never charges now — it issues a code instead
    if (m.kind === 'otc') { setStep(3); finish('pending'); return; }

    setStep(2);
    $('#pgOtpTarget').textContent =
      m.kind === 'wallet' ? 'We sent a 6-digit code to ' + (state.mobile || config.mobile) + '.'
    : m.kind === 'bank'   ? 'Your bank sent a one-time PIN to your registered number.'
                          : 'Your card issuer sent a 3-D Secure code to your registered number.';

    $$('#pgOtp input').forEach(function (i) { i.value = ''; });
    $('#pgOtpError').hidden = true;
    showScreen('pgVerify');
    $$('#pgOtp input')[0].focus();
    startResendTimer();
  }

  /* ---------- otp ---------- */
  function startResendTimer() {
    var left = 30, btn = $('#pgResend');
    btn.disabled = true;
    clearInterval(state.resendId);
    btn.textContent = 'Resend in ' + left + 's';
    state.resendId = setInterval(function () {
      left--;
      btn.textContent = left > 0 ? 'Resend in ' + left + 's' : 'Resend code';
      if (left <= 0) { btn.disabled = false; clearInterval(state.resendId); }
    }, 1000);
  }

  function checkOtp() {
    var code = $$('#pgOtp input').map(function (i) { return i.value; }).join('');
    if (code.length < 6) { toast('Enter all 6 digits.'); return; }

    // Replace this with a real verification request.
    if (code !== '123456') {
      $('#pgOtpError').hidden = false;
      $$('#pgOtp input').forEach(function (i) { i.value = ''; });
      $$('#pgOtp input')[0].focus();
      return;
    }
    clearInterval(state.resendId);
    runProcessing();
  }

  /* ---------- processing ---------- */
  function runProcessing() {
    showScreen('pgProcessing');
    var lines = [
      'Encrypting your payment details',
      'Sending the request to the payment rail',
      'Waiting for the issuer to authorise',
      'Confirming with ' + config.merchant
    ];
    $('#pgLog').innerHTML = lines.map(function (l) {
      return '<div class="pg-log-line">' + icon('check-circle') + '<span>' + esc(l) + '</span></div>';
    }).join('');

    var els = $$('.pg-log-line', $('#pgLog'));
    els.forEach(function (el, i) {
      setTimeout(function () { el.classList.add('is-done'); }, 400 + i * 620);
    });

    setTimeout(function () {
      setStep(3);
      // Decide the outcome here. A real build would use the API response.
      // Test card 4000 0000 0000 0002 is treated as a decline.
      var declined = state.cardLast4 === '0002';
      finish(declined ? 'failed' : 'success');
    }, 400 + els.length * 620 + 500);
  }

  /* ---------- result ---------- */
  function makeReference() {
    return 'TXN-' + Math.floor(100000 + Math.random() * 899999);
  }

  function finish(outcome) {
    var m = METHODS.filter(function (x) { return x.id === state.method; })[0];
    var t = getTotals();
    var reference = makeReference();
    var stamp = new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });

    var label =
        m.kind === 'card' ? state.cardBrand + ' \u2022\u2022\u2022\u2022 ' + state.cardLast4
      : m.kind === 'bank' ? state.bank + ' online banking'
      : m.kind === 'otc'  ? state.partner + ' counter'
                          : 'GCash ' + (state.mobile || config.mobile);

    var head, badge;
    if (outcome === 'success') {
      badge = '<span class="pg-badge pg-badge--ok">Completed</span>';
      head =
        '<div class="pg-seal">' + icon('check') + '</div>' +
        '<h2>Payment successful</h2>' +
        '<p class="pg-amount pg-num">' + peso(t.total) + '</p>' +
        '<p>' + esc(config.merchant) + ' has received your payment. A copy of this receipt was sent to your email.</p>';
    } else if (outcome === 'failed') {
      badge = '<span class="pg-badge pg-badge--fail">Failed</span>';
      head =
        '<div class="pg-seal pg-seal--fail">' + icon('x') + '</div>' +
        '<h2>Payment declined</h2>' +
        '<p class="pg-amount pg-num" style="color:var(--pg-red)">' + peso(t.total) + '</p>' +
        '<p>The issuer turned down this payment and nothing was charged. Try another card or pick a different method.</p>';
    } else {
      badge = '<span class="pg-badge pg-badge--wait">Awaiting payment</span>';
      var code = String(Math.floor(1000000000 + Math.random() * 8999999999));
      head =
        '<div class="pg-seal pg-seal--wait">' + icon('clock') + '</div>' +
        '<h2>Almost there</h2>' +
        '<p class="pg-amount pg-num">' + peso(t.total) + '</p>' +
        '<p>Show this code at any ' + esc(state.partner) + ' branch within 48 hours. Your order ships once payment clears.</p>' +
        '<div class="pg-code"><small>Payment code</small>' +
        '<b class="pg-mono">' + code.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3') + '</b></div>';
    }

    $('#pgResult').innerHTML =
      '<div class="pg-center">' + head +
        '<div class="pg-receipt">' +
          '<dl class="pg-kv">' +
            '<dt>Reference number</dt><dd class="pg-mono">' + reference + '</dd>' +
            '<dt>Merchant</dt><dd>' + esc(config.merchant) + '</dd>' +
            '<dt>Order</dt><dd class="pg-mono">' + esc(config.orderId) + '</dd>' +
            '<dt>Payment method</dt><dd>' + esc(label) + '</dd>' +
            '<dt>Date and time</dt><dd>' + stamp + '</dd>' +
            '<dt>Status</dt><dd>' + badge + '</dd>' +
          '</dl>' +
        '</div>' +
        '<div class="pg-actions">' +
          (outcome === 'failed'
            ? '<button type="button" class="pg-btn pg-btn--primary pg-btn--block" data-pg="restart">Try another method</button>'
            : '<a class="pg-btn pg-btn--primary pg-btn--block" href="user-dashboard.html">Back to Dashboard</a>') +
          '<button type="button" class="pg-btn pg-btn--ghost pg-btn--block" data-pg="copy" data-value="' + reference + '">Copy reference number</button>' +
        '</div>' +
      '</div>';

    showScreen('pgResult');
    state.lastRef = reference;

    var payload = {
      reference: reference,
      orderId  : config.orderId,
      merchant : config.merchant,
      method   : state.method,
      methodLabel: label,
      amount   : t.total,
      fee      : t.fee,
      status   : outcome === 'success' ? 'Completed' : outcome === 'failed' ? 'Failed' : 'Pending',
      paidAt   : new Date().toISOString()
    };
    if (outcome === 'success' && typeof config.onSuccess === 'function') config.onSuccess(payload);
    if (outcome === 'pending' && typeof config.onPending === 'function') config.onPending(payload);
    if (outcome === 'failed'  && typeof config.onFailure === 'function') config.onFailure(payload);
  }

  /* ---------- toast ---------- */
  function toast(message) {
    var el = document.createElement('div');
    el.className = 'pg-toast';
    el.innerHTML = icon('info') + '<span>' + esc(message) + '</span>';
    $('#pgToasts').appendChild(el);
    setTimeout(function () { el.style.transition = '.25s'; el.style.opacity = '0'; }, 2500);
    setTimeout(function () { el.remove(); }, 2850);
  }

  /* ============================================================
     EVENTS — one delegated listener for the whole gateway
     ============================================================ */
  function bindEvents() {
    $('#pgRoot').addEventListener('click', function (e) {
      var el = e.target.closest('[data-pg]');
      if (!el) return;

      switch (el.dataset.pg) {

        case 'pick':
          if (state.method === el.dataset.id) break;   // don't wipe a half-filled form
          state.method = el.dataset.id;
          renderMethods();
          renderSummary();
          break;

        case 'bank':
          state.bank = el.dataset.value;
          renderMethods();
          break;

        case 'partner':
          state.partner = el.dataset.value;
          renderMethods();
          break;

        case 'peek': {
          var field = $('#' + el.dataset.target);
          var shown = field.type === 'text';
          field.type = shown ? 'password' : 'text';
          el.innerHTML = icon(shown ? 'eye' : 'eye-off');
          break;
        }

        case 'testcard':
          $('#pgCardNumber').value = '4111 1111 1111 1111';
          $('#pgCardBrand').textContent = 'VISA';
          $('#pgCardExpiry').value = '09/29';
          $('#pgCardCvv').value = '123';
          $('#pgCardName').value = 'JUAN DELA CRUZ';
          $$('.pg-input.is-invalid', $('#pgRoot')).forEach(function (i) { i.classList.remove('is-invalid'); });
          $$('.pg-error', $('#pgRoot')).forEach(function (i) { i.hidden = true; });
          break;

        case 'pay':         pay(); break;
        case 'otp-submit':  checkOtp(); break;
        case 'otp-resend':  startResendTimer(); toast('A new code is on its way.'); break;

        case 'otp-cancel':
          clearInterval(state.resendId);
          setStep(1);
          showScreen('pgChoose');
          break;

        case 'restart':     reset(); break;

        case 'copy':
          if (navigator.clipboard) {
            navigator.clipboard.writeText(el.dataset.value);
            toast('Reference number copied.');
          }
          break;
      }
    });

    /* OTP boxes: auto-advance, backspace, paste */
    var boxes = $$('#pgOtp input');
    boxes.forEach(function (box, i) {
      box.addEventListener('input', function () {
        box.value = box.value.replace(/\D/g, '');
        if (box.value && i < boxes.length - 1) boxes[i + 1].focus();
        if (boxes.every(function (b) { return b.value; })) setTimeout(checkOtp, 180);
      });
      box.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !box.value && i > 0) boxes[i - 1].focus();
      });
      box.addEventListener('paste', function (e) {
        e.preventDefault();
        var text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
        text.split('').forEach(function (ch, j) { if (boxes[j]) boxes[j].value = ch; });
        if (text.length === 6) setTimeout(checkOtp, 180);
      });
    });
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */
  function reset() {
    state.method = null;
    state.bank = null;
    state.cardLast4 = '';
    state.cardBrand = '';
    clearInterval(state.resendId);
    setStep(1);
    renderMethods();
    renderSummary();
    showScreen('pgChoose');
  }

  function init(options) {
    Object.keys(options || {}).forEach(function (k) { config[k] = options[k]; });
    bindEvents();
    reset();
  }

  return { init: init, reset: reset, getTotals: getTotals };
})();
/* ===== PaymentGateway page init (only on #pgRoot) ===== */
(function () {
  if (!document.getElementById('pgRoot')) return;
  function run() {
    
                (() => {
                    let pendingCashIn;
                    try {
                        pendingCashIn = JSON.parse(localStorage.getItem("pendingCashIn") || "null");
                    } catch {
                        pendingCashIn = null;
                    }
                    const cashInAmount = Number(pendingCashIn?.amount);
                    if (!Number.isFinite(cashInAmount) || cashInAmount <= 0) {
                        window.location.replace("user-dashboard.html");
                        return;
                    }
    
                    MayaGateway.init({
                        merchant: "Maya Banking",
                        orderId: `CASHIN-${Date.now()}`,
                        items: [{ name: "Cash In", qty: "1 transaction", price: cashInAmount }],
                        shipping: 0,
                        mobile: "+63 917 123 4567",
                        onSuccess(payment) {
                            window.LandbankDemoBalance.set(window.LandbankDemoBalance.get() + cashInAmount);
                            localStorage.setItem("completedCashIn", JSON.stringify({
                                amount: cashInAmount,
                                methodLabel: payment.methodLabel,
                                reference: payment.reference,
                            }));
                            localStorage.removeItem("pendingCashIn");
                        },
                        onPending(payment) {
                            console.log("Cash-in payment is awaiting confirmation", payment);
                        },
                        onFailure(payment) {
                            console.log("Cash-in payment failed", payment);
                        },
                    });
                })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

/* ===== Bills Payment page logic (from user-billspayment.html inline) ===== */
(function () {
  if (!(document.querySelector('.bills-page'))) return;
  function run() {
    
          /* ---------- Shared header behaviour (same as dashboard) ---------- */
          var side = document.getElementById("side");
          document.getElementById("menuBtn").onclick = function () { side.classList.toggle("open"); };
    
          var bell = document.getElementById("bell"), np = document.getElementById("np");
          function setNp(open) { np.classList.toggle("open", open); bell.setAttribute("aria-expanded", open); }
          bell.onclick = function (e) { e.stopPropagation(); setNp(!np.classList.contains("open")); };
          np.onclick = function (e) { e.stopPropagation(); };
          document.addEventListener("click", function () { setNp(false); });
          document.addEventListener("keydown", function (e) { if (e.key === "Escape") setNp(false); });
          function clearDot() { var u = bell.querySelector("u"); if (u) u.remove(); }
          document.querySelectorAll(".np-item").forEach(function (i) {
            i.onclick = function () {
              i.classList.remove("unread");
              if (!document.querySelector(".np-item.unread")) clearDot();
            };
          });
          document.getElementById("markAll").onclick = function () {
            document.querySelectorAll(".np-item").forEach(function (i) { i.classList.remove("unread"); });
            clearDot();
          };
    
          /* ---------- Bills Payment ---------- */
          (function () {
            var $ = function (id) { return document.getElementById(id); };
            var root = document.querySelector(".bills-page");
    
            function ic(id, size, cls) {
              return '<svg class="ic' + (cls ? " " + cls : "") + '" width="' + size + '" height="' + size + '"><use href="#' + id + '"/></svg>';
            }
            function esc(s) {
              return String(s)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
            }
            function peso(n) {
              return "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
    
            var CATS = [
              { k: "utilities", n: "Utilities", i: "i-bolt" },
              { k: "telecom", n: "Telecommunications", i: "i-phone" },
              { k: "internet", n: "Internet & Cable", i: "i-wifi" },
              { k: "cards", n: "Credit Cards", i: "i-card" },
              { k: "gov", n: "Government", i: "i-bank" },
              { k: "edu", n: "Education", i: "i-edu" },
              { k: "ins", n: "Insurance", i: "i-shield" },
              { k: "loans", n: "Loans", i: "i-coins" },
              { k: "real", n: "Real Estate", i: "i-house" },
              { k: "others", n: "Others", i: "i-dots" }
            ];
            function getAvailableBalance() {
              return window.LandbankDemoBalance.get();
            }
            var catName = {};
            CATS.forEach(function (c) { catName[c.k] = c.n; });
    
            /* Biller data
               CHANGE: every biller now has a "min" = minimum online payment in pesos.
               Edit the numbers here to change a biller's minimum. */
            var BILLERS = [
              { id: "meralco", n: "Meralco", c: "utilities", l: "Utilities", min: 100, img: "images/meralco.png" },
              { id: "pldt", n: "PLDT", c: "telecom", l: "Telecom", min: 200, img: "images/pldt.png" },
              { id: "globe", n: "Globe", c: "telecom", l: "Telecom", min: 100, img: "images/globe.png" },
              { id: "maynilad", n: "Maynilad", c: "utilities", l: "Utilities", min: 100, img: "images/maynilad.svg" },
              { id: "sss", n: "SSS", c: "gov", l: "Government", min: 100, img: "images/sss.svg" },
              { id: "cignal", n: "Cignal", c: "telecom", l: "Telecom", min: 100, img: "images/cignal.png" },
              { id: "card", n: "Credit Card", c: "cards", l: "Credit Cards", min: 200 },
              { id: "more", n: "More Billers", c: "others", l: "Others", min: 100 }
            ];
    
            var favs = [];
            try { favs = JSON.parse(localStorage.getItem("favoriteBillers")) || []; } catch (e) { favs = []; }
            if (!Array.isArray(favs)) favs = [];
    
            var state = { sel: "meralco", q: "", cat: "", f: "all", step: 1, acct: "", nick: "", amt: 0, paid: false };
            var STEP_DESC = {
              1: "Select a biller and enter the required details.",
              2: "Enter the amount you want to pay.",
              3: "Review your payment before confirming."
            };
    
            function getBiller(id) {
              for (var i = 0; i < BILLERS.length; i++) if (BILLERS[i].id === id) return BILLERS[i];
              return null;
            }
            function logo(b, big) {
              var cls = "bp-logo" + (big ? " lg" : "") + (b.img ? " has-img" : "");
              var inner = b.img
                ? '<img src="' + b.img + '" alt="' + esc(b.n) + '">'
                : b.id === "more" ? ic("i-dots", 20)
                : b.id === "card" ? ic("i-card", 20)
                : esc(b.n.charAt(0));
              return '<span class="' + cls + '">' + inner + "</span>";
            }
    
            function renderBillers() {
              var q = state.q.trim().toLowerCase();
              var list = BILLERS.filter(function (b) {
                if (state.f === "fav" && favs.indexOf(b.id) < 0) return false;
                if (state.cat && b.c !== state.cat) return false;
                if (q && (b.n + " " + b.l + " " + catName[b.c]).toLowerCase().indexOf(q) < 0) return false;
                return true;
              }).sort(function (a, b) {
                var aFav = favs.indexOf(a.id) >= 0;
                var bFav = favs.indexOf(b.id) >= 0;
                if (aFav !== bFav) return aFav ? -1 : 1;
                return BILLERS.indexOf(a) - BILLERS.indexOf(b);
              });
              var html = list.map(function (b) {
                var fav = favs.indexOf(b.id) >= 0;
                return (
                  '<div class="bp-biller-wrap">' +
                  '<button type="button" class="bp-biller' + (state.sel === b.id ? " sel" : "") + '" data-id="' + b.id + '">' +
                  logo(b) +
                  '<span class="bp-binfo"><b>' + esc(b.n) + "</b><small>" + esc(b.l) + "</small></span>" +
                  ic("i-right", 16, "bp-chev") +
                  "</button>" +
                  '<button type="button" class="bp-favorite' + (fav ? " on" : "") + '" data-fav="' + b.id +
                  '" aria-pressed="' + fav + '" aria-label="' + (fav ? "Remove " : "Add ") + esc(b.n) + (fav ? " from" : " to") + ' favorites">' +
                  ic("i-star", 15) + "</button></div>"
                );
              }).join("");
              if (!html) {
                html = '<p class="bp-empty">' +
                  (state.f === "fav" && !state.q && !state.cat
                    ? "No favorites yet. Tap the star on a biller to add one."
                    : "No billers found.") + "</p>";
              }
              $("bpBillers").innerHTML = html;
            }
    
            function renderCats() {
              $("bpCats").innerHTML = CATS.map(function (c) {
                return '<button type="button" class="bp-cat' + (state.cat === c.k ? " on" : "") + '" data-cat="' + c.k + '"><i>' + ic(c.i, 18) + "</i>" + esc(c.n) + "</button>";
              }).join("");
            }
    
            function renderSelected() {
              var b = getBiller(state.sel);
              $("bpSelected").innerHTML = b
                ? logo(b, true) + '<div class="bp-sname"><b>' + esc(b.n) + "</b><small>" + esc(b.l) + "</small></div>"
                : '<div class="bp-sname"><b>No biller selected</b><small>Choose one from the list</small></div>';
            }
    
            function setStep(n) {
              state.step = n;
              $("bpStepText").textContent = "Step " + n + " of 3";
              $("bpStepDesc").textContent = STEP_DESC[n];
              root.querySelectorAll(".bp-step").forEach(function (li) {
                var s = Number(li.getAttribute("data-s"));
                li.classList.toggle("on", s === n);
                li.classList.toggle("done", s < n);
                li.querySelector(".bp-num").innerHTML = s < n ? ic("i-check", 16) : String(s);
              });
              $("bpStep1").hidden = n !== 1;
              $("bpStep2").hidden = n !== 2;
              $("bpStep3").hidden = n !== 3;
    
              var b = getBiller(state.sel);
              if (n === 2 && b) {
                $("d2Biller").textContent = b.n + " (" + b.l + ")";
                $("d2Acct").textContent = state.acct;
                $("d2Nick").textContent = state.nick || "—";
                /* CHANGE: show this biller's minimum payment under the amount box */
                $("bpMinNote").textContent = "Minimum payment for " + b.n + ": " + peso(b.min);
              }
              if (n === 3 && b) {
                $("d3Biller").textContent = b.n + " (" + b.l + ")";
                $("d3Acct").textContent = state.acct;
                $("d3Nick").textContent = state.nick || "—";
                $("d3Amt").textContent = "₱" + state.amt.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                $("bpAvailableBalance").textContent = window.LandbankDemoBalance.format(getAvailableBalance());
              }
            }

            function resetBillPayment() {
              state.sel = null;
              state.q = "";
              state.cat = "";
              state.f = "all";
              state.acct = "";
              state.nick = "";
              state.amt = 0;
              state.paid = false;
              $("bpSearch").value = "";
              $("bpAcct").value = "";
              $("bpNick").value = "";
              $("bpAmount").value = "";
              $("bpAcct").classList.remove("bad");
              $("bpAmount").classList.remove("bad");
              $("bpError").hidden = true;
              $("bpError2").hidden = true;
              $("bpConfirm").disabled = false;
              $("bpConfirm").innerHTML = 'Confirm Payment <svg class="ic" width="16" height="16"><use href="#i-check" /></svg>';
              root.querySelectorAll(".bp-tab").forEach(function (tab) {
                tab.classList.toggle("on", tab.getAttribute("data-f") === "all");
              });
              renderCats();
              renderBillers();
              renderSelected();
              setStep(1);
            }

            function selectBiller(id) {
              state.sel = id;
              state.acct = "";
              $("bpAcct").value = "";
              $("bpAcct").classList.remove("bad");
              $("bpError").hidden = true;
              renderBillers();
              renderSelected();
            }
    
            function toggleFav(id) {
              var i = favs.indexOf(id);
              if (i >= 0) favs.splice(i, 1); else favs.push(id);
              try { localStorage.setItem("favoriteBillers", JSON.stringify(favs)); } catch (e) {}
              renderBillers();
            }
    
            $("bpBillers").addEventListener("click", function (e) {
              var fav = e.target.closest("[data-fav]");
              if (fav) { e.stopPropagation(); toggleFav(fav.getAttribute("data-fav")); return; }
              var card = e.target.closest("[data-id]");
              if (card) selectBiller(card.getAttribute("data-id"));
            });
    
            $("bpCats").addEventListener("click", function (e) {
              var c = e.target.closest("[data-cat]");
              if (!c) return;
              var k = c.getAttribute("data-cat");
              state.cat = state.cat === k ? "" : k;
              renderCats();
              renderBillers();
            });
    
            $("bpSearch").addEventListener("input", function (e) {
              state.q = e.target.value;
              renderBillers();
            });
    
            root.querySelectorAll(".bp-tab").forEach(function (t) {
              t.addEventListener("click", function () {
                state.f = t.getAttribute("data-f");
                root.querySelectorAll(".bp-tab").forEach(function (x) { x.classList.toggle("on", x === t); });
                renderBillers();
              });
            });
    
            $("bpChange").addEventListener("click", function () {
              state.sel = null; state.q = ""; state.cat = ""; state.f = "all";
              $("bpSearch").value = "";
              root.querySelectorAll(".bp-tab").forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-f") === "all"); });
              renderCats(); renderBillers(); renderSelected();
              $("bpSearch").focus();
            });
    
            function checkBillerAccount(billerId, raw) {
              var v = String(raw || "").trim();
              if (!v) return "Account / reference number is required.";
              var digitsOnly = { meralco: 1, pldt: 1, globe: 1, maynilad: 1, card: 1 };
              if (digitsOnly[billerId]) {
                var stripped = v.replace(/[\s-]/g, "");
                if (/[^0-9]/.test(stripped)) return "Invalid format. Use numbers only.";
              }
              if (billerId === "meralco") {
                var m = v.replace(/[\s-]/g, "");
                if (m.length === 10 || m.length === 26) return "";
                return "Enter a 10-digit CAN or 26-digit MRN.";
              }
              if (billerId === "pldt") {
                if (!/^\d{10}$/.test(v.replace(/[\s-]/g, ""))) return "Enter a 10-digit PLDT account number.";
                return "";
              }
              if (billerId === "globe") {
                var g = v.replace(/[\s-]/g, "");
                if (/^\d{8}$/.test(g) || /^\d{9}$/.test(g)) return "";
                return "Please enter a valid 8 or 9-digit Account Number.";
              }
              if (billerId === "maynilad") {
                if (!/^\d{8}$/.test(v.replace(/[\s-]/g, ""))) return "Enter an 8-digit Maynilad CAN.";
                return "";
              }
              if (billerId === "cignal") {
                var c = v.replace(/[\s-]/g, "");
                if (/^\d{12}$/.test(c)) return "";
                if (/^[A-Za-z0-9]{8,16}$/.test(c)) return "";
                return "Enter a 12-digit serial or 8–16 character account.";
              }
              if (billerId === "sss") {
                var s = v.replace(/[\s-]/g, "").toUpperCase();
                if (!/^[A-Z0-9]{14}$/.test(s)) return "Enter a 14-character SSS PRN.";
                return "";
              }
              if (billerId === "card") {
                var d = v.replace(/\s/g, "");
                if (!/^\d{16}$/.test(d)) return "Enter the 16-digit card number.";
                return "";
              }
              if (v.length > 26) return "Must be 26 characters or less.";
              if (!/^[A-Za-z0-9][A-Za-z0-9\s\-]*$/.test(v)) return "Use letters and numbers only.";
              return "";
            }
            function normalizeBillerAccount(billerId, raw) {
              var v = String(raw || "").trim();
              if (billerId === "card") return v.replace(/\s/g, "");
              if (billerId === "meralco" || billerId === "pldt" || billerId === "maynilad" || billerId === "globe" || billerId === "cignal")
                return v.replace(/[\s-]/g, "");
              if (billerId === "sss") return v.replace(/[\s-]/g, "").toUpperCase();
              return v;
            }
            function validateBpAccountField(showError) {
              var err = $("bpError"), inp = $("bpAcct");
              var message = !state.sel ? "Please select a biller first." : checkBillerAccount(state.sel, inp.value);
              if (message) {
                if (showError) { err.textContent = message; err.hidden = false; inp.classList.add("bad"); }
                return false;
              }
              err.hidden = true; inp.classList.remove("bad"); return true;
            }
            $("bpContinue").addEventListener("click", function () {
              var inp = $("bpAcct");
              if (!validateBpAccountField(true)) { inp.focus(); return; }
              state.acct = normalizeBillerAccount(state.sel, inp.value);
              state.nick = $("bpNick").value.trim();
              state.paid = false;
              $("bpConfirm").disabled = false;
              $("bpConfirm").innerHTML = 'Confirm Payment <svg class="ic" width="16" height="16"><use href="#i-check" /></svg>';
              setStep(2);
            });
            $("bpAcct").addEventListener("input", function () {
              if (this.value.length > 26) this.value = this.value.slice(0, 26);
              this.classList.remove("bad");
              $("bpError").hidden = true;
            });
            $("bpAcct").addEventListener("blur", function () {
              if (this.value.trim()) validateBpAccountField(true);
            });
            $("bpBack2").addEventListener("click", function () { setStep(1); });
            $("bpNext2").addEventListener("click", function () {
              var a = $("bpAmount"), err = $("bpError2");
              var raw = String(a.value || "").trim();
              var balance = getAvailableBalance();
              var biller = getBiller(state.sel);
              if (!raw || !/^\d+(\.\d{1,2})?$/.test(raw)) {
                err.textContent = "Enter a valid amount (e.g. 100 or 100.50). No negatives or extra decimals.";
                err.hidden = false;
                a.classList.add("bad");
                a.focus();
                return;
              }
              var n = parseFloat(raw);
              if (!(n > 0) || !Number.isFinite(n)) {
                err.textContent = "Enter an amount greater than ₱0.00.";
                err.hidden = false;
                a.classList.add("bad");
                a.focus();
                return;
              }
              /* CHANGE: minimum payment check for the selected biller */
              if (biller && n < biller.min) {
                err.textContent = "The minimum payment for " + biller.n + " is " + peso(biller.min) + ".";
                err.hidden = false;
                a.classList.add("bad");
                a.focus();
                return;
              }
              if (n > balance) {
                err.textContent = "Amount exceeds your available balance.";
                err.hidden = false;
                a.classList.add("bad");
                a.focus();
                return;
              }
              err.hidden = true;
              a.classList.remove("bad");
              state.amt = n;
              setStep(3);
            });
            $("bpAmount").addEventListener("input", function () {
              var v = this.value.replace(/[^0-9.]/g, "");
              var i = v.indexOf(".");
              if (i >= 0) {
                v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, "");
                var parts = v.split(".");
                if (parts[1] && parts[1].length > 2) {
                  v = parts[0] + "." + parts[1].slice(0, 2);
                }
              }
              if (v.length > 1 && v[0] === "0" && v[1] !== ".") v = v.replace(/^0+/, "") || "0";
              this.value = v;
              this.classList.remove("bad");
              $("bpError2").hidden = true;
            });
    
            $("bpBack3").addEventListener("click", function () { setStep(2); });
            $("bpConfirm").addEventListener("click", function () {
              if (state.paid) {
                resetBillPayment();
                return;
              }
              var balance = getAvailableBalance();
              if (state.amt > balance) {
                var amountInput = $("bpAmount");
                var error = $("bpError2");
                error.textContent = "Amount exceeds your available balance.";
                error.hidden = false;
                amountInput.classList.add("bad");
                setStep(2);
                amountInput.focus();
                return;
              }
              window.LandbankDemoBalance.set(balance - state.amt);
              state.paid = true;
              $("bpAvailableBalance").textContent = window.LandbankDemoBalance.format(getAvailableBalance());
              $("bpConfirm").innerHTML = 'Pay another bill <svg class="ic" width="16" height="16"><use href="#i-arrow" /></svg>';
              var biller = getBiller(state.sel);
              window.LandbankDemoNotifications.add(
                "Bill payment successful",
                (biller ? biller.n : "Biller") + " · " + peso(state.amt) + " was paid · " +
                  new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
              );
            });
    
            renderCats();
            renderBillers();
            renderSelected();
            setStep(1);
          })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

/* ===== Dashboard page logic ===== */
(function () {
  if (!(document.getElementById('accountSummary') || document.querySelector('.bal'))) return;
  function run() {
    
          const side = document.getElementById("side");
          document.getElementById("menuBtn").onclick = () =>
            side.classList.toggle("open");
          document.querySelectorAll(".nav .ni").forEach(
            (b) =>
              (b.onclick = () => {
                document
                  .querySelectorAll(".nav .ni")
                  .forEach((x) => x.classList.remove("on"));
                b.classList.add("on");
                side.classList.remove("open");
              }),
          );
          if (new URLSearchParams(location.search).has("combined")) {
            document.querySelectorAll(".qb[href]").forEach((link) => {
              const target = new URL(link.href);
              target.searchParams.set("combined", "1");
              target.searchParams.set("v", "2");
              link.href = target.href;
            });
          }
          document.querySelectorAll(".qb").forEach((b) => {
            b.onclick = () => {
              b.classList.remove("on");
            };
          });
          const requestMoneyBtn = document.getElementById("requestMoneyBtn");
          const requestQrDialog = document.getElementById("requestQrDialog");
          const requestQrImage = document.getElementById("requestQrImage");
          const requestQrValue = "LANDBANK iAccess Request|Juan De La Cruz|09********38";
          const requestQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(requestQrValue)}`;
          requestMoneyBtn.addEventListener("click", () => {
            requestQrImage.src = requestQrUrl;
            requestQrImage.alt = "QR code for request money";
            requestQrDialog.showModal();
          });
          let currentBalance = window.LandbankDemoBalance.get();
          const balanceEye = document.getElementById("eye");
          const renderBalance = () => {
            document.getElementById("amt").textContent = shown
              ? window.LandbankDemoBalance.format(currentBalance)
              : "₱ • • • • •";
            balanceEye.setAttribute("aria-label", shown ? "Hide balance" : "Show balance");
            balanceEye.setAttribute("aria-pressed", String(shown));
            balanceEye.querySelector("use").setAttribute("href", shown ? "#i-eye" : "#i-eye-off");
          };
          let shown = true;
          renderBalance();
          window.addEventListener("storage", (event) => {
            if (event.key === "iAccessDemoBalance") {
              currentBalance = window.LandbankDemoBalance.get();
              renderBalance();
            }
          });
          balanceEye.onclick = () => {
            shown = !shown;
            renderBalance();
          };
          const cashInDialog = document.getElementById("cashInDialog");
          const cashInForm = document.getElementById("cashInForm");
          const cashInAmountInput = document.getElementById("cashInAmount");
          document.getElementById("cashInBtn").addEventListener("click", () => {
            cashInForm.reset();
            cashInDialog.showModal();
            cashInAmountInput.focus();
          });
          document.getElementById("cancelCashIn").addEventListener("click", () => {
            cashInDialog.close();
          });
          cashInForm.addEventListener("submit", (event) => {
            event.preventDefault();
            if (!cashInForm.reportValidity()) return;
            const amount = Number(cashInAmountInput.value);
            localStorage.setItem("pendingCashIn", JSON.stringify({ amount }));
            window.location.href = "user-paymentgateway.html";
          });
          const bell = document.getElementById("bell"),
            np = document.getElementById("np");
          const setNp = (open) => {
            np.classList.toggle("open", open);
            bell.setAttribute("aria-expanded", open);
          };
          bell.onclick = (e) => {
            e.stopPropagation();
            setNp(!np.classList.contains("open"));
          };
          np.onclick = (e) => e.stopPropagation();
          document.addEventListener("click", () => setNp(false));
          document.addEventListener(
            "keydown",
            (e) => e.key === "Escape" && setNp(false),
          );
          const updateNotificationBadge = () => {
            const badge = bell.querySelector(".notification-badge");
            if (!badge) return;
            const unreadCount = document.querySelectorAll(".np-item.unread").length;
            badge.textContent = String(unreadCount);
            badge.hidden = unreadCount === 0;
          };
          document.querySelectorAll(".np-item").forEach(
            (i) =>
              (i.onclick = () => {
                i.classList.remove("unread");
                updateNotificationBadge();
              }),
          );
          document.getElementById("markAll").onclick = () => {
            document
              .querySelectorAll(".np-item")
              .forEach((i) => i.classList.remove("unread"));
            updateNotificationBadge();
          };
          const txSearch = document.getElementById("txSearch");
          const txEmpty = document.getElementById("txEmpty");
          const txRows = document.querySelectorAll(".tbl .tr");
    
          const filterTransactions = (query) => {
            const q = query.trim().toLowerCase();
            let visible = 0;
            txRows.forEach((row) => {
              const match = !q || row.textContent.toLowerCase().includes(q);
              row.style.display = match ? "" : "none";
              if (match) visible++;
            });
            txEmpty.hidden = visible > 0;
          };
    
          txSearch.addEventListener("input", () => {
            filterTransactions(txSearch.value);
          });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

/* ===== Fund Transfer page logic ===== */
(function () {
  if (!(document.querySelector('.ft-page'))) return;
  function run() {
    
            /* ---------- Shared header / sidebar behaviour (same as dashboard) ---------- */
            var side = document.getElementById("side");
            document.getElementById("menuBtn").onclick = function () { side.classList.toggle("open"); };
    
            var bell = document.getElementById("bell"), np = document.getElementById("np");
            function setNp(open) { np.classList.toggle("open", open); bell.setAttribute("aria-expanded", open); }
            bell.onclick = function (e) { e.stopPropagation(); setNp(!np.classList.contains("open")); };
            np.onclick = function (e) { e.stopPropagation(); };
            document.addEventListener("click", function () { setNp(false); });
            document.addEventListener("keydown", function (e) { if (e.key === "Escape") setNp(false); });
            function clearDot() { var u = bell.querySelector("u"); if (u) u.remove(); }
            document.querySelectorAll(".np-item").forEach(function (i) {
                i.onclick = function () {
                    i.classList.remove("unread");
                    if (!document.querySelector(".np-item.unread")) clearDot();
                };
            });
            document.getElementById("markAll").onclick = function () {
                document.querySelectorAll(".np-item").forEach(function (i) { i.classList.remove("unread"); });
                clearDot();
            };
    
            /* ---------- Fund Transfer (prototype only – demo data, no real transfer) ---------- */
            (function () {
                var $ = function (s, r) { return (r || document).querySelector(s); };
                var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    
                var BALANCE = window.LandbankDemoBalance;
                var REF = "FT-20260930-123456";
                var state = { type: "lb", data: null, done: null };
    
                var views = { lb: $("#ftLb"), ob: $("#ftOb"), qr: $("#ftQr"), review: $("#ftReview"), done: $("#ftDone") };
                var CHECK = '<svg class="ic" width="14" height="14"><use href="#i-check"/></svg>';
    
                function esc(s) {
                    return String(s).replace(/[&<>"]/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]; });
                }
                function money(n) {
                    return "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                }
                function renderAvailableBalance() {
                    $$(".ft-acctwrap .ft-atx small").forEach(function (el) {
                        el.textContent = "Available Balance: " + money(BALANCE.get());
                    });
                }
                function stamp() {
                    var d = new Date();
                    var mo = d.toLocaleString("en-US", { month: "short" });
                    var t = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
                    return mo + " " + d.getDate() + ", " + d.getFullYear() + " • " + t;
                }
    
                function setSteps(n) {
                    $$(".ft-step").forEach(function (li) {
                        var s = Number(li.getAttribute("data-s"));
                        li.classList.toggle("on", s === n);
                        li.classList.toggle("done", s < n);
                        li.querySelector(".ft-num").innerHTML = s < n ? CHECK : String(s);
                    });
                }
                function show(name) {
                    Object.keys(views).forEach(function (k) { views[k].hidden = k !== name; });
                }
                function setType(t) {
                    state.type = t;
                    $$(".ft-option").forEach(function (b) {
                        var on = b.getAttribute("data-type") === t;
                        b.classList.toggle("on", on);
                        b.setAttribute("aria-pressed", on);
                    });
                    setSteps(1);
                    show(t);
                }
    
                $$(".ft-option").forEach(function (b) {
                    b.addEventListener("click", function () { setType(b.getAttribute("data-type")); });
                });
    
                /* account dropdown (visual selector with one demo account) */
                $$(".ft-acctwrap").forEach(function (w) {
                    var btn = $(".ft-acct", w), menu = $(".ft-menu", w);
                    btn.addEventListener("click", function (e) {
                        e.stopPropagation();
                        var open = menu.hidden;
                        menu.hidden = !open;
                        btn.setAttribute("aria-expanded", open);
                    });
                    menu.addEventListener("click", function (e) {
                        e.stopPropagation();
                        menu.hidden = true;
                        btn.setAttribute("aria-expanded", "false");
                    });
                });
                document.addEventListener("click", function () {
                    $$(".ft-menu").forEach(function (m) { m.hidden = true; });
                    $$(".ft-acct").forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
                });
    
                /* Bank-specific Other Bank account lengths */
                var BANK_ACCT_RULES = {
                    "BDO": { lengths: [12], label: "12" },
                    "BPI": { lengths: [10], label: "10" },
                    "Metrobank": { lengths: [13], label: "13" },
                    "UnionBank": { lengths: [12], label: "12" },
                    "Security Bank": { lengths: [10, 12], label: "10 or 12" },
                    "PNB": { lengths: [12], label: "12" },
                    "RCBC": { lengths: [10, 12], label: "10 or 12" },
                    "China Bank": { lengths: [10, 12], label: "10 or 12" }
                };

                function checkAccountName(name) {
                    var letters = "A-Za-z\u00C0-\u00FF";
                    if (!name) return "Account name is required.";
                    if (/\d/.test(name)) return "Account name cannot contain numbers.";
                    if (!new RegExp("^[" + letters + "][" + letters + "\\s.,'\\-]*$").test(name))
                        return "Use letters only. Spaces, periods, commas, hyphens and apostrophes are allowed.";
                    if ((name.match(new RegExp("[" + letters + "]", "g")) || []).length < 2)
                        return "Account name must have at least 2 letters.";
                    if (name.length > 60) return "Account name must be 60 characters or less.";
                    return "";
                }

                function checkFtAccount(type, acct, bank) {
                    if (!acct) return "Recipient account number is required.";
                    if (/[^0-9]/.test(acct)) {
                        return "Invalid format. Recipient Account Number must contain numbers only.";
                    }
                    if (type === "lb") {
                        if (!/^(\d{10}|\d{12})$/.test(acct)) {
                            return "Enter a valid 10 or 12-digit account number.";
                        }
                        return "";
                    }
                    var rule = BANK_ACCT_RULES[bank];
                    if (rule) {
                        if (rule.lengths.indexOf(acct.length) === -1) {
                            return "Invalid length. A typical " + bank + " account number should be exactly " + rule.label + " digits.";
                        }
                        return "";
                    }
                    if (!/^\d{8,16}$/.test(acct)) {
                        return "Enter a valid account number (8 to 16 digits).";
                    }
                    return "";
                }

                function checkFtAmount(raw) {
                    var s = String(raw || "").trim();
                    if (!s) return "Enter an amount greater than \u20B10.00.";
                    if (!/^\d+(\.\d{1,2})?$/.test(s)) {
                        return "Enter a valid amount (e.g. 100 or 100.50). No negatives or extra decimals.";
                    }
                    var n = parseFloat(s);
                    if (!(n > 0) || !Number.isFinite(n)) return "Enter an amount greater than \u20B10.00.";
                    if (n > BALANCE.get()) return "Amount exceeds your available balance.";
                    return "";
                }

                function fail(form, name, msg, state_) {
                    var el = $('[name="' + name + '"]', form);
                    if (!el) return;
                    var f = el.closest(".ft-field");
                    var p = f ? $(".ft-err", f) : null;
                    if (p) {
                        p.textContent = msg;
                        p.hidden = false;
                    }
                    if (f) f.classList.add("bad");
                    if (state_ && !state_.focused) { el.focus(); state_.focused = true; }
                    if (state_) state_.ok = false;
                }

                function clearFieldError(field) {
                    if (!field) return;
                    var p = $(".ft-err", field);
                    if (p) p.hidden = true;
                    field.classList.remove("bad");
                }

                function formType(form) {
                    return form.id === "ftOb" ? "ob" : "lb";
                }

                function validateFtField(form, name, showError) {
                    var type = formType(form);
                    var el = $('[name="' + name + '"]', form);
                    if (!el) return true;
                    var value = el.value.trim();
                    var message = "";
                    var bank = type === "ob" ? ($('[name="bank"]', form).value || "").trim() : "LANDBANK";

                    if (name === "bank") {
                        if (type === "ob" && !value) message = "Please select a recipient bank.";
                    } else if (name === "acct") {
                        message = checkFtAccount(type, value, bank);
                    } else if (name === "name") {
                        if (type === "ob") message = checkAccountName(value.replace(/\s+/g, " "));
                    } else if (name === "amount") {
                        message = checkFtAmount(value);
                    }

                    if (message) {
                        if (showError) fail(form, name, message, { ok: false, focused: true });
                        return false;
                    }
                    clearFieldError(el.closest(".ft-field"));
                    return true;
                }

                /* input helpers + clear account when bank changes */
                $$(".ft-form").forEach(function (form) {
                    form.addEventListener("input", function (e) {
                        var t = e.target;
                        if (t.name === "acct") {
                            var raw = t.value;
                            if (/[^0-9]/.test(raw)) {
                                fail(form, "acct", "Invalid format. Recipient Account Number must contain numbers only.", { ok: false, focused: true });
                                t.value = raw.replace(/\D/g, "");
                                return;
                            }
                            t.value = raw.replace(/\D/g, "");
                        }
                        if (t.name === "amount") {
                            var v = t.value.replace(/[^0-9.]/g, "");
                            var i = v.indexOf(".");
                            if (i >= 0) {
                                v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, "");
                                var parts = v.split(".");
                                if (parts[1] && parts[1].length > 2) {
                                    v = parts[0] + "." + parts[1].slice(0, 2);
                                }
                            }
                            if (v.length > 1 && v[0] === "0" && v[1] !== ".") v = v.replace(/^0+/, "") || "0";
                            t.value = v;
                        }
                        if (t.name === "remarks") $(".ft-count", form).textContent = t.value.length + "/50";
                        clearFieldError(t.closest(".ft-field"));
                    });
                    form.addEventListener("change", function (e) {
                        var t = e.target;
                        /* Changing bank clears account number + its error */
                        if (t.name === "bank") {
                            var acct = $('[name="acct"]', form);
                            if (acct) {
                                acct.value = "";
                                clearFieldError(acct.closest(".ft-field"));
                            }
                            clearFieldError(t.closest(".ft-field"));
                            return;
                        }
                        clearFieldError(t.closest(".ft-field"));
                    });
                    form.addEventListener("blur", function (e) {
                        var t = e.target;
                        if (!t.name || t.name === "remarks") return;
                        if (t.name === "acct" || t.name === "amount" || t.name === "name") {
                            if (!t.value.trim()) return;
                            validateFtField(form, t.name, true);
                        }
                    }, true);
                    var bankSelect = $('[name="bank"]', form);
                    if (bankSelect) {
                        bankSelect.addEventListener("blur", function () {
                            if (formType(form) === "ob") validateFtField(form, "bank", true);
                        });
                    }
                });

                function validate(form, type) {
                    var s = { ok: true, focused: false };
                    var v = function (n) { return $('[name="' + n + '"]', form).value.trim(); };
                    var d = { type: type, remarks: v("remarks") };

                    if (type === "ob") {
                        d.bank = v("bank");
                        if (!d.bank) fail(form, "bank", "Please select a recipient bank.", s);
                    } else {
                        d.bank = "LANDBANK";
                    }

                    d.acct = v("acct");
                    var acctError = checkFtAccount(type, d.acct, d.bank);
                    if (acctError) fail(form, "acct", acctError, s);

                    if (type === "ob") {
                        d.name = v("name").replace(/\s+/g, " ");
                        var nameError = checkAccountName(d.name);
                        if (nameError) fail(form, "name", nameError, s);
                    }

                    var amountError = checkFtAmount(v("amount"));
                    if (amountError) fail(form, "amount", amountError, s);
                    else d.amount = parseFloat(v("amount").replace(/[^0-9.]/g, ""));

                    return s.ok ? d : null;
                }

                function row(k, v) { return "<div><dt>" + esc(k) + "</dt><dd>" + esc(v) + "</dd></div>"; }
    
                function recipientLabel(d) {
                    return d.type === "ob" ? d.name + " (" + d.acct + ")" : d.acct;
                }
    
                function gotoReview(d) {
                    state.data = d;
                    $("#rvRows").innerHTML =
                        row("From Account", "LANDBANK Savings") +
                        row("Recipient", recipientLabel(d)) +
                        row("Bank", d.bank) +
                        row("Amount", money(d.amount)) +
                        row("Remarks", d.remarks || "—");
                    setSteps(2);
                    show("review");
                }
    
                [["#ftLb", "lb"], ["#ftOb", "ob"]].forEach(function (pair) {
                    var form = $(pair[0]);
                    form.addEventListener("submit", function (e) {
                        e.preventDefault();
                        var d = validate(form, pair[1]);
                        if (d) gotoReview(d);
                    });
                });
    
                $("#rvBack").addEventListener("click", function () {
                    setSteps(1);
                    show(state.type);
                });
    
                function addTransferNotification(d, when) {
                    var item = document.createElement("button");
                    item.type = "button";
                    item.className = "np-item unread";
                    item.innerHTML =
                        '<span class="c"><svg class="ic" width="20" height="20"><use href="#i-up"/></svg></span>' +
                        "<span><p>Transfer completed</p><small>" +
                        esc(money(d.amount) + " sent to " + recipientLabel(d) + " · " + when) +
                        "</small></span>";
                    item.addEventListener("click", function () {
                        item.classList.remove("unread");
                        if (!document.querySelector(".np-item.unread")) clearDot();
                    });
    
                    var list = $(".np-list");
                    list.insertBefore(item, list.firstChild);
                    while (list.children.length > 6) list.removeChild(list.lastChild);
                    if (!bell.querySelector("u")) {
                        bell.appendChild(document.createElement("u"));
                    }
                    setTimeout(function () { setNp(true); }, 0);
                }
    
                $("#rvConfirm").addEventListener("click", function () {
                    var d = state.data;
                    var currentBalance = BALANCE.get();
                    if (d.amount > currentBalance) {
                        setSteps(1);
                        show(state.type);
                        fail($(state.type === "ob" ? "#ftOb" : "#ftLb"), "amount", "Amount exceeds your available balance.", { ok: true, focused: false });
                        return;
                    }
                    BALANCE.set(currentBalance - d.amount);
                    renderAvailableBalance();
                    var when = stamp();
                    state.done = { ref: REF, amount: money(d.amount), recipient: recipientLabel(d), bank: d.bank, when: when };
                    $("#dnRows").innerHTML =
                        row("Reference Number", REF) +
                        row("Amount", money(d.amount)) +
                        row("Recipient", recipientLabel(d)) +
                        row("Date & Time", when);
                    addTransferNotification(d, when);
                    setSteps(3);
                    show("done");
                });
    
                function resetForms() {
                    $$(".ft-form").forEach(function (f) {
                        f.reset();
                        $(".ft-count", f).textContent = "0/50";
                        $$(".ft-err", f).forEach(function (p) { p.hidden = true; });
                        $$(".ft-field", f).forEach(function (x) { x.classList.remove("bad"); });
                    });
                }
    
                $("#dnAnother").addEventListener("click", function () {
                    resetForms();
                    setType(state.type);
                });
                $("#dnBack").addEventListener("click", function () {
                    resetForms();
                    setType("lb");
                });
    
                $("#dnReceipt").addEventListener("click", function () {
                    var r = state.done;
                    if (!r) return;
                    var text =
                        "LANDBANK iAccess - Transfer Receipt (school prototype)\n" +
                        "-------------------------------------------\n" +
                        "Reference Number: " + r.ref + "\n" +
                        "From Account: LANDBANK Savings\n" +
                        "Recipient: " + r.recipient + "\n" +
                        "Bank: " + r.bank + "\n" +
                        "Amount: " + r.amount + "\n" +
                        "Date & Time: " + r.when + "\n" +
                        "Status: Completed (demo only)\n";
                    var blob = new Blob([text], { type: "text/plain" });
                    var a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = r.ref + ".txt";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    setTimeout(function () { URL.revokeObjectURL(a.href); }, 500);
                });
    
                /* QR interface */
                var note = $("#qrNote");
                var qrFile = $("#qrFile");
                var qrDrop = $(".ft-qrdrop");
                var unsupportedQrMessage = "Unsupported file format. Please upload your image as a PNG, JPEG, or JPG file.";
                function say(msg, isError) {
                    note.textContent = msg;
                    note.classList.toggle("is-error", Boolean(isError));
                    note.hidden = false;
                }
                function handleQrFile(file) {
                    if (!file) return;
                    var extension = file.name.split(".").pop().toLowerCase();
                    var validExtension = ["png", "jpg", "jpeg"].indexOf(extension) !== -1;
                    var validMimeType = !file.type || ["image/png", "image/jpeg"].indexOf(file.type.toLowerCase()) !== -1;
                    if (!validExtension || !validMimeType) {
                        say(unsupportedQrMessage, true);
                        return false;
                    }
                    say("Selected: " + file.name + ". QR reading is not available in this prototype.");
                    return true;
                }
                $("#qrUpload").addEventListener("click", function () { qrFile.click(); });
                qrFile.addEventListener("change", function () {
                    var file = qrFile.files && qrFile.files[0];
                    if (file && !handleQrFile(file)) qrFile.value = "";
                });
                qrDrop.addEventListener("dragover", function (event) {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "copy";
                });
                qrDrop.addEventListener("drop", function (event) {
                    event.preventDefault();
                    handleQrFile(event.dataTransfer.files && event.dataTransfer.files[0]);
                });
                $("#qrCamera").addEventListener("click", function () { say("Camera scanning is not available in this prototype."); });
                $("#qrGenerate").addEventListener("click", function () { say("QR generation is not available in this prototype."); });
    
                /* Pick the starting transfer option from the dashboard shortcut. */
                var startType = new URLSearchParams(location.search).get("type");
                if (startType !== "ob" && startType !== "qr") startType = "lb";
                renderAvailableBalance();
                setType(startType);
            })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

/* ===== Settings page logic ===== */
(function () {
  if (!(document.querySelector('.ct.st') || document.querySelector('.st-menu'))) return;
  function run() {
    
          const side = document.getElementById("side");
          document.getElementById("menuBtn").onclick = () =>
            side.classList.toggle("open");
          document
            .querySelectorAll(".nav button.ni")
            .forEach((b) => (b.onclick = () => side.classList.remove("open")));
          const settingsItems = document.querySelectorAll(".st-i[data-view]");
          settingsItems.forEach((item) => {
            item.addEventListener("click", () => {
              settingsItems.forEach((other) => {
                other.classList.remove("on");
                other.setAttribute("aria-pressed", "false");
              });
              item.classList.add("on");
              item.setAttribute("aria-pressed", "true");
              document.querySelectorAll(".st-panel").forEach((panel) => {
                panel.hidden = panel.id !== item.dataset.view;
              });
            });
          });
          const PROFILE_KEY = "iAccessDemoProfile";
          const DEFAULT_PROFILE = {
            fullName: "Juan De La Cruz",
            mobile: "09171234538",
            email: "juan.delacruz@gmail.com",
            dob: "2000-01-01",
            address: "123 User St.\nDasmarinas, Cavite"
          };
          const personalInfo = document.getElementById("personalInfoForm");
          const personalInfoStatus = document.getElementById("personalInfoStatus");
          const personalEditButton = document.getElementById("personalEditButton");
          const personalFields = {
            fullName: document.getElementById("editFullName"),
            mobile: document.getElementById("editMobile"),
            email: document.getElementById("editEmail"),
            dob: document.getElementById("editDob"),
            address: document.getElementById("editAddress")
          };
          const fieldErrors = {
            fullName: document.getElementById("fullNameError"),
            mobile: document.getElementById("mobileError"),
            email: document.getElementById("emailError"),
            dob: document.getElementById("dobError"),
            address: document.getElementById("addressError")
          };
          let savedProfile = Object.assign({}, DEFAULT_PROFILE);

          try {
            const storedProfile = localStorage.getItem(PROFILE_KEY);
            if (storedProfile) {
              const parsedProfile = JSON.parse(storedProfile);
              if (parsedProfile && typeof parsedProfile === "object" &&
                  Object.keys(DEFAULT_PROFILE).every((key) => typeof parsedProfile[key] === "string")) {
                savedProfile = Object.assign(savedProfile, parsedProfile);
              } else {
                throw new TypeError("Stored profile data is incomplete or invalid.");
              }
            }
          } catch (error) {
            console.error("Unable to load saved profile details.", error);
            personalInfoStatus.textContent = "Saved profile details could not be loaded. Default details are shown.";
          }

          const formatProfileDate = (value) => {
            const parts = value.split("-");
            return parts.length === 3 ? `${parts[1]}/${parts[2]}/${parts[0]}` : value;
          };
          const maskMobile = (value) =>
            value.length >= 4 ? `${value.slice(0, 2)}********${value.slice(-2)}` : value;
          const initials = (name) =>
            name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase();

          function renderProfile(profile) {
            document.getElementById("profileFullName").textContent = profile.fullName;
            document.getElementById("profileMobile").textContent = maskMobile(profile.mobile);
            document.getElementById("profileEmail").textContent = profile.email;
            document.getElementById("profileDob").textContent = formatProfileDate(profile.dob);
            document.getElementById("profileAddress").textContent = profile.address;
            const profileButton = document.getElementById("profileMenuBtn");
            if (profileButton) {
              profileButton.querySelector(".profile-name b").textContent = profile.fullName;
              profileButton.querySelector(".profile-name small").textContent = maskMobile(profile.mobile);
              profileButton.querySelector(".av").textContent = initials(profile.fullName);
            }
          }

          function populatePersonalForm() {
            Object.keys(personalFields).forEach((key) => {
              personalFields[key].value = savedProfile[key];
              personalFields[key].setCustomValidity("");
              fieldErrors[key].textContent = "";
              personalFields[key].setAttribute("aria-invalid", "false");
            });
            personalInfoStatus.textContent = "";
          }

          function closePersonalForm() {
            personalInfo.hidden = true;
            document.querySelector(".st-info").hidden = false;
            personalEditButton.setAttribute("aria-expanded", "false");
            personalEditButton.setAttribute("aria-pressed", "false");
            personalEditButton.setAttribute("aria-label", "Edit personal information");
          }

          renderProfile(savedProfile);
          const localToday = () => {
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
          };
          document.getElementById("editDob").max = localToday();
          personalEditButton.addEventListener("click", () => {
            if (!personalInfo.hidden) return;
            populatePersonalForm();
            document.querySelector(".st-info").hidden = true;
            personalInfo.hidden = false;
            personalEditButton.setAttribute("aria-expanded", "true");
            personalEditButton.setAttribute("aria-pressed", "true");
            personalEditButton.setAttribute("aria-label", "Editing personal information");
            personalFields.fullName.focus();
          });
          document.getElementById("cancelPersonalEdit").addEventListener("click", closePersonalForm);

          function validatePersonalField(key) {
            const field = personalFields[key];
            const value = field.value.trim();
            let message = "";

            if (key === "fullName") {
              if (!value) message = "Enter your full name.";
              else if (value.length < 2 || value.length > 60) message = "Name must be between 2 and 60 characters.";
              else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ .'-]*$/.test(value) || (value.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) || []).length < 2) {
                message = "Use at least 2 letters. Numbers and special characters are not allowed.";
              }
            } else if (key === "mobile") {
              if (!value) message = "Enter your mobile number.";
              else if (!/^09\d{9}$/.test(value)) message = "Enter an 11-digit Philippine mobile number starting with 09.";
            } else if (key === "email") {
              if (!value) message = "Enter your email address.";
              else if (field.validity.typeMismatch || /\s/.test(value)) message = "Enter a valid email address.";
              else if (value.length > 254) message = "Email address must be 254 characters or fewer.";
            } else if (key === "dob") {
              const today = localToday();
              if (!value) message = "Enter your date of birth.";
              else if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "1900-01-01" || value > today) {
                message = "Enter a valid date of birth that is not in the future.";
              } else {
                const [year, month, day] = value.split("-").map(Number);
                const birthDate = new Date(year, month - 1, day);
                const isRealDate = birthDate.getFullYear() === year
                  && birthDate.getMonth() === month - 1
                  && birthDate.getDate() === day;
                if (!isRealDate) {
                  message = "Enter a valid date of birth.";
                } else {
                  const now = new Date();
                  let age = now.getFullYear() - year;
                  if (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)) age -= 1;
                  if (age < 7) message = "You must be at least 7 years old to open an account. Applicants under 18 need a parent or guardian.";
                }
              }
            } else if (key === "address") {
              if (!value) message = "Enter your address.";
              else if (value.length < 8 || value.length > 120) message = "Address must be between 8 and 120 characters.";
              else if (!/[\p{L}]/u.test(value) || !/^[\p{L}\p{N}\s.,'#/-]+$/u.test(value)) {
                message = "Use letters and numbers with common address punctuation only.";
              }
            }

            field.setCustomValidity(message);
            field.setAttribute("aria-invalid", String(Boolean(message)));
            fieldErrors[key].textContent = message;
            return !message;
          }

          Object.keys(personalFields).forEach((key) => {
            personalFields[key].addEventListener("input", () => validatePersonalField(key));
            personalFields[key].addEventListener("blur", () => validatePersonalField(key));
          });

          personalInfo.addEventListener("submit", (event) => {
            event.preventDefault();
            const valid = Object.keys(personalFields).map(validatePersonalField).every(Boolean);
            if (!valid) {
              const firstInvalid = personalInfo.querySelector('[aria-invalid="true"]');
              if (firstInvalid) firstInvalid.reportValidity();
              return;
            }

            const updatedProfile = {};
            Object.keys(personalFields).forEach((key) => {
              updatedProfile[key] = personalFields[key].value.trim();
            });

            try {
              localStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile));
            } catch (error) {
              console.error("Unable to save profile details.", error);
              personalInfoStatus.textContent = "Profile could not be saved. Please check browser storage and try again.";
              return;
            }

            savedProfile = updatedProfile;
            renderProfile(savedProfile);
            closePersonalForm();
          });

          const credentialForm = document.getElementById("credentialForm");
          const newPassword = document.getElementById("newPassword");
          const confirmPassword = document.getElementById("confirmPassword");
          const credentialStatus = document.getElementById("credentialStatus");
          const validatePasswordMatch = () => {
            confirmPassword.setCustomValidity(
              confirmPassword.value && confirmPassword.value !== newPassword.value
                ? "Passwords do not match."
                : "",
            );
          };
          newPassword.addEventListener("input", validatePasswordMatch);
          confirmPassword.addEventListener("input", validatePasswordMatch);
          credentialForm.addEventListener("submit", (event) => {
            event.preventDefault();
            validatePasswordMatch();
            if (!credentialForm.reportValidity()) return;
            credentialStatus.textContent = "Credentials updated for this demo.";
            credentialForm.reset();
          });
          const bell = document.getElementById("bell"),
            np = document.getElementById("np");
          const setNp = (open) => {
            np.classList.toggle("open", open);
            bell.setAttribute("aria-expanded", open);
          };
          bell.onclick = (e) => {
            e.stopPropagation();
            setNp(!np.classList.contains("open"));
          };
          np.onclick = (e) => e.stopPropagation();
          document.addEventListener("click", () => setNp(false));
          document.addEventListener(
            "keydown",
            (e) => e.key === "Escape" && setNp(false),
          );
          document.getElementById("markAll").onclick = () =>
            document
              .querySelectorAll(".np-item")
              .forEach((i) => i.classList.remove("unread"));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

/* ===== Transaction History page logic ===== */
(function () {
  if (!(document.querySelector('.history') || document.getElementById('transactionRows'))) return;
  function run() {
    
          const side = document.getElementById("side");
          document.getElementById("menuBtn").addEventListener("click", () => {
            side.classList.toggle("open");
          });
          document.querySelectorAll(".nav a.ni").forEach((link) => {
            link.addEventListener("click", () => side.classList.remove("open"));
          });
          const bell = document.getElementById("bell");
          const notifications = document.getElementById("np");
          const setNotificationsOpen = (open) => {
            notifications.classList.toggle("open", open);
            bell.setAttribute("aria-expanded", String(open));
          };
          bell.addEventListener("click", (event) => {
            event.stopPropagation();
            setNotificationsOpen(!notifications.classList.contains("open"));
          });
          notifications.addEventListener("click", (event) => event.stopPropagation());
          document.addEventListener("click", () => setNotificationsOpen(false));
          document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") setNotificationsOpen(false);
          });
          const clearNotificationDot = () => bell.querySelector("u")?.remove();
          document.querySelectorAll(".np-item").forEach((item) => {
            item.addEventListener("click", () => {
              item.classList.remove("unread");
              if (!document.querySelector(".np-item.unread")) clearNotificationDot();
            });
          });
          document.getElementById("markAll").addEventListener("click", () => {
            document.querySelectorAll(".np-item").forEach((item) => item.classList.remove("unread"));
            clearNotificationDot();
          });
          const transactionSearch = document.getElementById("transactionSearch");
          const transactionRows = [...document.querySelectorAll("#transactionRows .tr")];
          const historyEmpty = document.getElementById("historyEmpty");
          const directionButtons = document.querySelectorAll(".history-filter button");
          const previousPage = document.getElementById("previousPage");
          const nextPage = document.getElementById("nextPage");
          const pageCount = document.getElementById("pageCount");
          const pageSize = 6;
          let currentPage = 1;
          let currentDirection = "all";
          const renderTransactions = () => {
            const query = transactionSearch.value.trim().toLowerCase();
            const matchingRows = transactionRows.filter((row) =>
              row.textContent.toLowerCase().includes(query) &&
                (currentDirection === "all" ||
                  (currentDirection === "in" && row.querySelector(".pos")) ||
                  (currentDirection === "out" && row.querySelector(".neg"))),
            );
            const totalPages = Math.ceil(matchingRows.length / pageSize);
            currentPage = Math.min(currentPage, Math.max(totalPages, 1));
            const pageRows = new Set(
              matchingRows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
            );
            transactionRows.forEach((row) => {
              row.hidden = !pageRows.has(row);
            });
            historyEmpty.hidden = matchingRows.length > 0;
            pageCount.textContent = `Page ${totalPages ? currentPage : 0} of ${totalPages}`;
            previousPage.disabled = currentPage <= 1 || totalPages === 0;
            nextPage.disabled = currentPage >= totalPages;
          };
          transactionSearch.addEventListener("input", () => {
            currentPage = 1;
            renderTransactions();
          });
          directionButtons.forEach((button) => {
            button.addEventListener("click", () => {
              currentDirection = button.dataset.direction;
              directionButtons.forEach((option) => {
                const selected = option === button;
                option.classList.toggle("on", selected);
                option.setAttribute("aria-pressed", String(selected));
              });
              currentPage = 1;
              renderTransactions();
            });
          });
          previousPage.addEventListener("click", () => {
            currentPage -= 1;
            renderTransactions();
          });
          nextPage.addEventListener("click", () => {
            currentPage += 1;
            renderTransactions();
          });
          renderTransactions();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

/* ===== Customer support page logic ===== */
(function () {
  if (!document.querySelector(".support-page")) return;

  function run() {
    var side = document.getElementById("side");
    var menuButton = document.getElementById("menuBtn");
    var search = document.getElementById("supportSearch");
    var faqList = document.getElementById("supportFaqList");
    var empty = document.getElementById("supportEmpty");
    var count = document.getElementById("supportFaqCount");
    var faqs = Array.prototype.slice.call(faqList.querySelectorAll(".support-faq"));

    menuButton.addEventListener("click", function () {
      var open = side.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(open));
    });

    var bell = document.getElementById("bell");
    var notifications = document.getElementById("np");
    function setNotificationsOpen(open) {
      notifications.classList.toggle("open", open);
      bell.setAttribute("aria-expanded", String(open));
    }
    bell.addEventListener("click", function (event) {
      event.stopPropagation();
      setNotificationsOpen(!notifications.classList.contains("open"));
    });
    notifications.addEventListener("click", function (event) {
      event.stopPropagation();
    });
    document.addEventListener("click", function () {
      setNotificationsOpen(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setNotificationsOpen(false);
    });
    document.querySelectorAll(".np-item").forEach(function (item) {
      item.addEventListener("click", function () {
        item.classList.remove("unread");
        if (!document.querySelector(".np-item.unread")) {
          var dot = bell.querySelector("u");
          if (dot) dot.remove();
        }
      });
    });
    document.getElementById("markAll").addEventListener("click", function () {
      document.querySelectorAll(".np-item").forEach(function (item) {
        item.classList.remove("unread");
      });
      var dot = bell.querySelector("u");
      if (dot) dot.remove();
    });

    search.addEventListener("input", function () {
      var query = search.value.trim().toLowerCase();
      var visible = 0;

      faqs.forEach(function (faq) {
        var matches = !query || (faq.textContent + " " + faq.dataset.search).toLowerCase().indexOf(query) >= 0;
        faq.hidden = !matches;
        if (matches) visible += 1;
      });

      empty.hidden = visible > 0;
      count.textContent = visible + (visible === 1 ? " topic" : " topics");
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();

/* ===== Header profile menu ===== */
(function () {
  var button = document.getElementById("profileMenuBtn");
  var menu = document.getElementById("profileMenu");
  if (!button || !menu) return;

  var PROFILE_KEY = "iAccessDemoProfile";
  function renderSavedProfile() {
    var stored = localStorage.getItem(PROFILE_KEY);
    if (!stored) return;
    try {
      var profile = JSON.parse(stored);
      if (!profile || typeof profile.fullName !== "string" || typeof profile.mobile !== "string") {
        throw new TypeError("Stored profile details are invalid.");
      }
      button.querySelector(".profile-name b").textContent = profile.fullName;
      button.querySelector(".profile-name small").textContent =
        profile.mobile.length >= 4 ? profile.mobile.slice(0, 2) + "********" + profile.mobile.slice(-2) : profile.mobile;
      button.querySelector(".av").textContent = profile.fullName.trim().split(/\s+/).slice(0, 2).map(function (part) {
        return part.charAt(0);
      }).join("").toUpperCase();
    } catch (error) {
      console.error("Unable to display saved profile details.", error);
    }
  }

  renderSavedProfile();
  window.addEventListener("storage", function (event) {
    if (event.key === PROFILE_KEY) renderSavedProfile();
  });

  function setOpen(open) {
    menu.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
  }

  button.addEventListener("click", function (event) {
    event.stopPropagation();
    setOpen(menu.hidden);
  });

  menu.addEventListener("click", function (event) {
    if (event.target.closest("a")) setOpen(false);
  });

  var signOutLink = menu.querySelector(".profile-signout");
  if (signOutLink) {
    var signOutStarted = false;
    signOutLink.addEventListener("click", function (event) {
      event.preventDefault();
      if (signOutStarted) return;
      signOutStarted = true;
      setOpen(false);

      var toast = document.createElement("div");
      toast.className = "user-signout-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      var icon = document.createElement("span");
      icon.className = "user-signout-toast-icon";
      icon.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="9" stroke="#1565c0" stroke-width="1.5"/><path d="M10 6v5" stroke="#1565c0" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="14" r="0.8" fill="#1565c0"/></svg>';

      var message = document.createElement("span");
      message.className = "user-signout-toast-body";
      message.textContent = "Signed out";

      var dismiss = document.createElement("button");
      dismiss.type = "button";
      dismiss.className = "user-signout-toast-close";
      dismiss.setAttribute("aria-label", "Dismiss");
      dismiss.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
      dismiss.addEventListener("click", function () {
        toast.remove();
      });

      toast.append(icon, message, dismiss);
      document.body.appendChild(toast);

      window.setTimeout(function () {
        window.location.href = signOutLink.href;
      }, 400);
    });
  }

  document.addEventListener("click", function (event) {
    if (!menu.contains(event.target) && !button.contains(event.target)) setOpen(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !menu.hidden) {
      setOpen(false);
      button.focus();
    }
  });
})();

/* ===== Sidebar collapse and mobile navigation control ===== */
(function () {
  var side = document.getElementById("side");
  var menuButton = document.getElementById("menuBtn");
  if (!side || !menuButton) return;

  var collapseStorageKey = "iAccessSidebarCollapsed";
  var desktopNavigation = window.matchMedia("(min-width: 901px)");
  var savedCollapsed = false;
  try {
    savedCollapsed = localStorage.getItem(collapseStorageKey) === "true";
  } catch (error) {
    console.error("Unable to restore sidebar state.", error);
  }

  var collapseButton = document.createElement("button");
  collapseButton.className = "side-collapse";
  collapseButton.type = "button";
  collapseButton.innerHTML = '<svg class="ic" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M11 4l-5 5 5 5" /></svg><span>Collapse</span>';
  side.querySelector(".bot").appendChild(collapseButton);

  function applySavedCollapseState() {
    side.classList.toggle("collapsed", desktopNavigation.matches && savedCollapsed);
    updateCollapseButton();
  }

  function updateCollapseButton() {
    var collapsed = side.classList.contains("collapsed");
    collapseButton.setAttribute("aria-label", collapsed ? "Expand navigation" : "Collapse navigation");
    collapseButton.title = collapsed ? "Expand navigation" : "Collapse navigation";
    collapseButton.querySelector("span").textContent = collapsed ? "Expand" : "Collapse";
    collapseButton.querySelector("path").setAttribute("d", collapsed ? "M7 4l5 5-5 5" : "M11 4l-5 5 5 5");
  }
  applySavedCollapseState();
  document.documentElement.classList.remove("sidebar-collapsed-preload");
  desktopNavigation.addEventListener("change", applySavedCollapseState);

  function closeNavigation() {
    side.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  }

  collapseButton.addEventListener("click", function () {
    if (window.matchMedia("(max-width: 900px)").matches) {
      closeNavigation();
      menuButton.focus();
      return;
    }
    side.classList.toggle("collapsed");
    savedCollapsed = side.classList.contains("collapsed");
    try {
      localStorage.setItem(collapseStorageKey, String(savedCollapsed));
    } catch (error) {
      console.error("Unable to save sidebar state.", error);
    }
    updateCollapseButton();
  });
  menuButton.addEventListener("click", function () {
    menuButton.setAttribute("aria-expanded", String(side.classList.contains("open")));
  });
  side.querySelectorAll(".nav a, .bot a").forEach(function (link) {
    link.addEventListener("click", closeNavigation);
  });
})();