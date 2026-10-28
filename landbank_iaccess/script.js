/* LANDBANK iAccess client-side behaviour */




/* Page navigation helper */
(function () {
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nativeVT = 'CSSViewTransitionRule' in window;

  
  window.smoothNavigate = function (url) {
    window.location.href = url;
  };
})();

/* Shared modals, login form, hamburger menu */
document.addEventListener('DOMContentLoaded', () => {
  /* Open/close modal helpers */
  function openOverlay(el) {
    if (!el) return;
    el.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeOverlay(el) {
    if (!el) return;
    el.classList.remove('active');
    const anyOpen = document.querySelector('.modal-overlay.active');
    if (!anyOpen) {
      document.body.style.overflow = '';
    }
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay.active').forEach(closeOverlay);
  }

  
  const termsLink = document.getElementById('termsLink');
  const termsModal = document.getElementById('termsModal');
  const modalClose = document.getElementById('modalClose');
  const modalCloseBtn = document.getElementById('modalCloseBtn');

  if (termsLink && termsModal) {
    termsLink.addEventListener('click', (e) => {
      e.preventDefault();
      openOverlay(termsModal);
    });
  }
  
  if (!document.body.classList.contains('registration-page')) {
    if (modalClose) modalClose.addEventListener('click', () => closeOverlay(termsModal));
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', () => closeOverlay(termsModal));
    if (termsModal) {
      termsModal.addEventListener('click', (e) => {
        if (e.target === termsModal) closeOverlay(termsModal);
      });
    }
  }

  
  const featureModal = document.getElementById('featureModal');
  const featureModalTitle = document.getElementById('featureModalTitle');
  const featureModalDesc = document.getElementById('featureModalDesc');
  const featureModalClose = document.getElementById('featureModalClose');

  /* Homepage security feature modal copy */
  const featureContent = {
    'lock-access': {
      title: 'Lock My Access',
      description:
        'Temporarily lock your iAccess login to prevent unauthorized access. You can unlock it later using Unlock ID or by contacting Customer Care.'
    },
    'money-lock': {
      title: 'Money Lock',
      description:
        'Lock a portion of your available funds so they cannot be transferred or withdrawn until you unlock them. Useful for protecting savings.'
    },
    'transaction-limits': {
      title: 'Transaction Limits',
      description:
        'Set daily and per-transaction limits for fund transfers and payments. Limits help control exposure and can be adjusted within bank-allowed ranges.'
    },
    'pause-period': {
      title: 'Pause Period',
      description:
        'Schedule a period during which online banking transactions are temporarily disabled. Ideal when you will be away or inactive.'
    }
  };

  function openFeatureModal(key) {
    const content = featureContent[key];
    if (!content || !featureModal) return;
    if (featureModalTitle) featureModalTitle.textContent = content.title;
    if (featureModalDesc) featureModalDesc.textContent = content.description;
    openOverlay(featureModal);
  }

  function closeFeatureModal() {
    closeOverlay(featureModal);
  }

  document.querySelectorAll('.security-hotspot').forEach((hotspot) => {
    hotspot.addEventListener('click', () => {
      const key = hotspot.getAttribute('data-feature');
      openFeatureModal(key);
    });
  });

  if (featureModalClose) {
    featureModalClose.addEventListener('click', closeFeatureModal);
  }
  if (featureModal) {
    featureModal.addEventListener('click', (e) => {
      if (e.target === featureModal) closeFeatureModal();
    });
  }

  
  const loginBtn = document.getElementById('loginBtn');
  const signupBtnHome = document.getElementById('signupBtn');

  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      
      if (document.body.classList.contains('login-page')) return;
      window.smoothNavigate('login.html');
    });
  }

  if (signupBtnHome && !document.getElementById('loginForm')) {
    
    signupBtnHome.addEventListener('click', (e) => {
      
      if (signupBtnHome.tagName === 'A' && signupBtnHome.getAttribute('href')) return;
      e.preventDefault();
      window.smoothNavigate('registration.html');
    });
  }

  
  /* Unlock ID modal (prototype OTP) */
  const unlockIdBtn = document.getElementById('unlockIdBtn');
  const unlockModal = document.getElementById('unlockModal');
  const unlockModalClose = document.getElementById('unlockModalClose');
  const unlockModalCloseBtn = document.getElementById('unlockModalCloseBtn');
  const unlockSubmitBtn = document.getElementById('unlockSubmitBtn');
  const unlockOtpGroup = document.getElementById('unlockOtpGroup');
  const unlockError = document.getElementById('unlockError');
  const MODAL_EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  const MODAL_MOBILE_RE = /^\+?[\d\s\-()]{10,18}$/;
  const MODAL_USER_IDS = { jose12345: true };
  const MODAL_DEMO_EMAIL = 'jose@gmail.com';
  let otpFailedAttempts = 0;
  const MAX_OTP_ATTEMPTS = 3;
  const OTP_LOCK_MS = 60000;
  let otpLockedUntil = 0;

  function isOtpLocked() {
    return Date.now() < otpLockedUntil;
  }

  function otpLockRemainingSec() {
    return Math.max(1, Math.ceil((otpLockedUntil - Date.now()) / 1000));
  }

  function setModalFieldError(inputId, errorId, msg) {
    const input = document.getElementById(inputId);
    const err = document.getElementById(errorId);
    if (input) input.classList.add('error');
    if (err) {
      err.textContent = msg;
      err.hidden = false;
    }
  }

  function clearModalFieldError(inputId, errorId) {
    const input = document.getElementById(inputId);
    const err = document.getElementById(errorId);
    if (input) input.classList.remove('error');
    if (err) {
      err.textContent = '';
      err.hidden = true;
    }
  }

  function clearUnlockErrors() {
    clearModalFieldError('unlockUserId', 'unlockUserIdError');
    clearModalFieldError('unlockContact', 'unlockContactError');
    clearModalFieldError('unlockOtp', 'unlockOtpError');
    if (unlockError) {
      unlockError.hidden = true;
      unlockError.textContent = '';
      unlockError.style.color = '';
      unlockError.classList.remove('is-success');
    }
  }

  function isValidContact(value) {
    if (value.indexOf('@') !== -1) return MODAL_EMAIL_RE.test(value);
    const digits = value.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15 && MODAL_MOBILE_RE.test(value);
  }

  if (unlockIdBtn && unlockModal) {
    unlockIdBtn.addEventListener('click', () => {
      if (unlockOtpGroup) unlockOtpGroup.hidden = true;
      clearUnlockErrors();
      ['unlockUserId', 'unlockContact', 'unlockOtp'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
      });
      if (unlockSubmitBtn) {
        unlockSubmitBtn.textContent = 'Request OTP';
        unlockSubmitBtn.disabled = false;
      }
      openOverlay(unlockModal);
    });
  }
  if (unlockModalClose) unlockModalClose.addEventListener('click', () => closeOverlay(unlockModal));
  if (unlockModalCloseBtn) unlockModalCloseBtn.addEventListener('click', () => closeOverlay(unlockModal));
  if (unlockModal) {
    unlockModal.addEventListener('click', (e) => {
      if (e.target === unlockModal) closeOverlay(unlockModal);
    });
  }
  if (unlockSubmitBtn) {
    unlockSubmitBtn.addEventListener('click', () => {
      const userIdEl = document.getElementById('unlockUserId');
      const contactEl = document.getElementById('unlockContact');
      const otpEl = document.getElementById('unlockOtp');
      const userId = (userIdEl && userIdEl.value || '').trim();
      const contact = (contactEl && contactEl.value || '').trim();
      clearUnlockErrors();

      if (isOtpLocked()) {
        if (unlockError) {
          unlockError.textContent = 'Too many incorrect OTP attempts. New code requests are temporarily blocked. Try again in ' + otpLockRemainingSec() + ' seconds.';
          unlockError.hidden = false;
          unlockError.classList.remove('is-success');
        }
        if (otpEl) otpEl.classList.add('error');
        return;
      }

      if (unlockOtpGroup && unlockOtpGroup.hidden) {
        let ok = true;
        if (!userId) {
          setModalFieldError('unlockUserId', 'unlockUserIdError', 'User ID is required');
          ok = false;
        } else if (!MODAL_USER_IDS[userId.toLowerCase()]) {
          setModalFieldError('unlockUserId', 'unlockUserIdError', 'User ID not found');
          ok = false;
        }
        if (!contact) {
          setModalFieldError('unlockContact', 'unlockContactError', 'Registered Email / Mobile is required');
          ok = false;
        } else if (contact.toLowerCase() !== MODAL_DEMO_EMAIL) {
          setModalFieldError('unlockContact', 'unlockContactError', 'Email or mobile does not match our records');
          ok = false;
        }
        if (!ok) return;
        unlockOtpGroup.hidden = false;
        unlockSubmitBtn.textContent = 'Verify & Unlock';
        if (unlockError) {
          unlockError.textContent = 'A one-time PIN has been sent to your registered contact.';
          unlockError.hidden = false;
          unlockError.classList.add('is-success');
        }
        return;
      }

      const otp = (otpEl && otpEl.value || '').trim();
      if (!otp) {
        setModalFieldError('unlockOtp', 'unlockOtpError', 'One-Time PIN is required');
        return;
      }
      if (!/^\d{6}$/.test(otp)) {
        setModalFieldError('unlockOtp', 'unlockOtpError', 'Enter the 6-digit One-Time PIN');
        return;
      }
      if (otp !== UNLOCK_OTP) {
        otpFailedAttempts += 1;
        if (otpFailedAttempts >= MAX_OTP_ATTEMPTS) {
          otpLockedUntil = Date.now() + OTP_LOCK_MS;
          otpFailedAttempts = 0;
          setModalFieldError('unlockOtp', 'unlockOtpError', 'Too many incorrect OTP attempts. Your account is temporarily locked. Try again in ' + otpLockRemainingSec() + ' seconds.');
          if (unlockError) {
            unlockError.textContent = 'New OTP requests are blocked until the lock expires.';
            unlockError.hidden = false;
            unlockError.classList.remove('is-success');
          }
          if (unlockSubmitBtn) unlockSubmitBtn.disabled = true;
          setTimeout(function () {
            if (unlockSubmitBtn) unlockSubmitBtn.disabled = false;
            clearModalFieldError('unlockOtp', 'unlockOtpError');
            if (unlockError) {
              unlockError.hidden = true;
              unlockError.textContent = '';
            }
          }, OTP_LOCK_MS);
        } else {
          const left = MAX_OTP_ATTEMPTS - otpFailedAttempts;
          setModalFieldError('unlockOtp', 'unlockOtpError', 'Invalid One-Time PIN. ' + left + ' attempt' + (left === 1 ? '' : 's') + ' remaining.');
        }
        return;
      }
      otpFailedAttempts = 0;
      otpLockedUntil = 0;
      if (unlockError) {
        unlockError.textContent = 'Your iAccess ID has been unlocked. You may now log in.';
        unlockError.hidden = false;
        unlockError.classList.add('is-success');
      }
      failedAttempts = 0;
      setTimeout(() => closeOverlay(unlockModal), 1500);
    });
  }

  /* Forgot password modal (prototype) */
  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
  const forgotModal = document.getElementById('forgotModal');
  const forgotModalClose = document.getElementById('forgotModalClose');
  const forgotModalCloseBtn = document.getElementById('forgotModalCloseBtn');
  const forgotSubmitBtn = document.getElementById('forgotSubmitBtn');
  const forgotError = document.getElementById('forgotError');

  function clearForgotErrors() {
    clearModalFieldError('forgotUserId', 'forgotUserIdError');
    if (forgotError) {
      forgotError.hidden = true;
      forgotError.textContent = '';
      forgotError.style.color = '';
      forgotError.classList.remove('is-success');
    }
  }

  if (forgotPasswordBtn && forgotModal) {
    forgotPasswordBtn.addEventListener('click', () => {
      clearForgotErrors();
      var fi = document.getElementById('forgotUserId');
      if (fi) fi.value = '';
      openOverlay(forgotModal);
    });
  }
  if (forgotModalClose) forgotModalClose.addEventListener('click', () => closeOverlay(forgotModal));
  if (forgotModalCloseBtn) forgotModalCloseBtn.addEventListener('click', () => closeOverlay(forgotModal));
  if (forgotModal) {
    forgotModal.addEventListener('click', (e) => {
      if (e.target === forgotModal) closeOverlay(forgotModal);
    });
  }
  if (forgotSubmitBtn) {
    forgotSubmitBtn.addEventListener('click', () => {
      const forgotInput = document.getElementById('forgotUserId');
      const val = (forgotInput && forgotInput.value || '').trim();
      clearForgotErrors();
      if (!val) {
        setModalFieldError('forgotUserId', 'forgotUserIdError', 'User ID or Email is required');
        return;
      }
      const isEmail = val.indexOf('@') !== -1;
      if (isEmail) {
        if (!MODAL_EMAIL_RE.test(val)) {
          setModalFieldError('forgotUserId', 'forgotUserIdError', 'Enter a valid email address');
          return;
        }
        if (val.toLowerCase() !== MODAL_DEMO_EMAIL) {
          setModalFieldError('forgotUserId', 'forgotUserIdError', 'Email not found');
          return;
        }
      } else if (!MODAL_USER_IDS[val.toLowerCase()]) {
        setModalFieldError('forgotUserId', 'forgotUserIdError', 'User ID not found');
        return;
      }
      if (forgotError) {
        forgotError.textContent = 'If an account exists for that ID, a password reset link has been sent.';
        forgotError.hidden = false;
        forgotError.classList.add('is-success');
      }
      setTimeout(() => closeOverlay(forgotModal), 1800);
    });
  }

  /* Password visibility toggle */
  const eyeToggle = document.getElementById('eyeToggle');
  const passwordInput = document.getElementById('password');
  const eyeIcon = document.getElementById('eyeIcon');

  if (eyeToggle && passwordInput && eyeIcon) {
    eyeToggle.addEventListener('click', () => {
      const isHidden = passwordInput.type === 'password';
      passwordInput.type = isHidden ? 'text' : 'password';
      eyeIcon.src = isHidden
        ? 'images/login-eye-on.png'
        : 'images/login-eye-off.png';
      eyeToggle.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
      eyeToggle.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
    });
  }

  
  /* Login form validation and demo auth */
  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.getElementById('username');
  const usernameGroup = document.getElementById('usernameGroup');
  const passwordGroup = document.getElementById('passwordGroup');
  const usernameError = document.getElementById('usernameError');
  const passwordError = document.getElementById('passwordError');
  const loginAlert = document.getElementById('loginAlert');
  const loginSubmitBtn = document.getElementById('loginSubmitBtn');

  /* Login: juanDela2000 → UserDashboard, admin usernames → AdminDashboard */
  const LOGIN_ACCOUNTS = {
    juandela2000: { password: 'wZB7WYn@nnzrGw4', redirect: 'user-dashboard.html' },
    admin: { password: 'admin12345', redirect: 'admin-dashboard.html' },
    'admin@landbank.gov.ph': { password: 'admin12345', redirect: 'admin-dashboard.html' }
  };
  const UNLOCK_OTP = '123456';
  let failedAttempts = 0;
  const MAX_ATTEMPTS = 3;

  function clearFieldErrors() {
    [usernameGroup, passwordGroup].forEach((g) => {
      if (!g) return;
      const wrapper = g.querySelector('.input-wrapper');
      if (wrapper) wrapper.classList.remove('error');
    });
    if (usernameError) {
      usernameError.hidden = true;
      usernameError.textContent = '';
    }
    if (passwordError) {
      passwordError.hidden = true;
      passwordError.textContent = '';
    }
    if (loginAlert) {
      loginAlert.hidden = true;
      loginAlert.textContent = '';
      loginAlert.className = 'login-alert';
    }
  }

  function setFieldError(group, errorEl, message) {
    if (group) {
      const wrapper = group.querySelector('.input-wrapper');
      if (wrapper) wrapper.classList.add('error');
    }
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }
  }

  function showAlert(message, type = '') {
    if (!loginAlert) return;
    loginAlert.textContent = message;
    loginAlert.className = 'login-alert' + (type ? ' ' + type : '');
    loginAlert.hidden = false;
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearFieldErrors();

      const username = (usernameInput?.value || '').trim();
      const password = (passwordInput?.value || '').trim();
      let hasError = false;

      if (!username) {
        setFieldError(usernameGroup, usernameError, 'Username is required');
        hasError = true;
      } else if (username.length < 3 || username.length > 40) {
        setFieldError(usernameGroup, usernameError, 'Username must be 3–40 characters');
        hasError = true;
      }
      if (!password) {
        setFieldError(passwordGroup, passwordError, 'Password is required');
        hasError = true;
      } else if (password.length < 7 || password.length > 64) {
        setFieldError(passwordGroup, passwordError, 'Password must be 7–64 characters');
        hasError = true;
      }
      if (hasError) return;

      if (failedAttempts >= MAX_ATTEMPTS) {
        showAlert(
          'Your account is locked due to too many failed login attempts. Please use Unlock ID or contact LANDBANK Customer Care at (02) 8405-7000.',
          'warning'
        );
        return;
      }

      const account = LOGIN_ACCOUNTS[username.toLowerCase()];
      if (!account) {
        failedAttempts += 1;
        showAlert('Username does not exist. Please check your username or register.');
        if (failedAttempts >= MAX_ATTEMPTS) {
          showAlert(
            'Your account is locked due to too many failed login attempts. Please use Unlock ID or contact LANDBANK Customer Care at (02) 8405-7000.',
            'warning'
          );
        }
        return;
      }

      if (password !== account.password) {
        failedAttempts += 1;
        setFieldError(passwordGroup, passwordError, 'The password you entered is incorrect.');
        showAlert('The password you entered is incorrect.');
        if (failedAttempts >= MAX_ATTEMPTS) {
          showAlert(
            'Your account is locked due to too many failed login attempts. Please use Unlock ID or contact LANDBANK Customer Care at (02) 8405-7000.',
            'warning'
          );
        }
        return;
      }

      failedAttempts = 0;
      showAlert('Login successful. Redirecting to dashboard…', 'success');
      if (loginSubmitBtn) loginSubmitBtn.disabled = true;
      setTimeout(() => {
        window.smoothNavigate(account.redirect);
      }, 900);
    });
  }

  if (usernameInput) {
    usernameInput.addEventListener('input', () => {
      if (usernameGroup) {
        const w = usernameGroup.querySelector('.input-wrapper');
        if (w) w.classList.remove('error');
      }
      if (usernameError) {
        usernameError.hidden = true;
        usernameError.textContent = '';
      }
    });
  }
  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      if (passwordGroup) {
        const w = passwordGroup.querySelector('.input-wrapper');
        if (w) w.classList.remove('error');
      }
      if (passwordError) {
        passwordError.hidden = true;
        passwordError.textContent = '';
      }
    });
  }

  
  /* Mobile hamburger menu */
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');

  function openMobileMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.add('open');
    if (mobileMenuOverlay) mobileMenuOverlay.classList.add('active');
    if (hamburgerBtn) {
      hamburgerBtn.classList.add('active');
      hamburgerBtn.setAttribute('aria-expanded', 'true');
      hamburgerBtn.setAttribute('aria-label', 'Close menu');
    }
    if (mobileMenu) mobileMenu.setAttribute('aria-hidden', 'false');
  }

  function closeMobileMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.remove('open');
    if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('active');
    if (hamburgerBtn) {
      hamburgerBtn.classList.remove('active');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
      hamburgerBtn.setAttribute('aria-label', 'Open menu');
    }
    if (mobileMenu) mobileMenu.setAttribute('aria-hidden', 'true');
  }

  if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.addEventListener('click', () => {
      if (mobileMenu.classList.contains('open')) closeMobileMenu();
      else openMobileMenu();
    });
  }
  if (mobileMenuOverlay) {
    mobileMenuOverlay.addEventListener('click', closeMobileMenu);
  }
  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMobileMenu);
    });
  }

  
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (featureModal && featureModal.classList.contains('active')) closeFeatureModal();
    closeAllModals();
    if (mobileMenu && mobileMenu.classList.contains('open')) closeMobileMenu();
  });

  
  const pendingBanner = document.getElementById('pendingActivationBanner');
  if (pendingBanner) {
    try {
      if (sessionStorage.getItem('pendingActivation') === 'true') {
        pendingBanner.hidden = false;
        sessionStorage.removeItem('pendingActivation');
      }
    } catch (e) {}
  }


});

/* Registration multi-step wizard */
(function () {
  if (!document.body.classList.contains('registration-page')) return;

  const TOTAL_STEPS = 5;
  let currentStep = 1;
  let termsAccepted = false;
  let recaptchaChecked = false;
  
  const completedSteps = new Set();

  const panels = {
    1: document.getElementById('step1'),
    2: document.getElementById('step2'),
    3: document.getElementById('step3'),
    4: document.getElementById('step4'),
    5: document.getElementById('step5')
  };
  const backBtn = document.getElementById('regBackBtn');
  const continueBtn = document.getElementById('regContinueBtn');
  const stepper = document.getElementById('regStepper');

  const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  const NAME_RE = /^[\p{L}][\p{L}\s.'\-]{0,79}$/u;
  function isValidName(v) {
    const s = (v || '').trim();
    if (!s || s.toUpperCase() === 'N/A') return true;
    return NAME_RE.test(s) && !/\d/.test(s) && s.length >= 2;
  }
  /* Street / Barangay: letters, digits, spaces, and safe address punctuation only */
  const ADDRESS_STREET_RE = /^[\p{L}\d\s.,#\-/'()]{2,120}$/u;
  function isValidStreetAddress(v) {
    const s = (v || '').trim();
    if (!s) return true;
    if (/[<>{}\[\];`$\\]|javascript:|on\w+\s*=/i.test(s)) return false;
    return ADDRESS_STREET_RE.test(s);
  }
  /* City / Province: letters, spaces, hyphens, apostrophes, periods only — no digits */
  const ADDRESS_PLACE_RE = /^[\p{L}][\p{L}\s.\-']{1,79}$/u;
  function isValidPlaceName(v) {
    const s = (v || '').trim();
    if (!s) return true;
    if (/\d/.test(s)) return false;
    if (/[<>{}\[\];`$\\]|javascript:|on\w+\s*=/i.test(s)) return false;
    return ADDRESS_PLACE_RE.test(s);
  }
  /* Security answers: letters, digits, spaces — block scripts / injection symbols */
  const SECURITY_ANSWER_RE = /^[\p{L}\d\s.'\-]{1,80}$/u;
  function isValidSecurityAnswer(v) {
    const s = (v || '').trim();
    if (!s) return true;
    if (/[<>{}\[\];`$\\|&]|javascript:|on\w+\s*=|select\s|drop\s|insert\s|union\s|--/i.test(s)) return false;
    return SECURITY_ANSWER_RE.test(s);
  }
  const ADDRESS_FIELD_LABELS = {
    street: 'No./Street',
    barangay: 'Barangay/Subdivision',
    city: 'City/Municipality',
    province: 'Province',
    zip: 'ZIP code'
  };
  const SECURITY_FIELD_LABELS = {
    secA1: 'Answer',
    secA2: 'Answer',
    secA3: 'Answer',
    secCA1: 'Confirm Answer',
    secCA2: 'Confirm Answer',
    secCA3: 'Confirm Answer'
  };
  const PHONE_RE = /^[\d\s\-()+.]{7,20}$/;

  
  function isIaccessIdTaken(id) {
    
    const RESERVED_DEMO_IDS = []; 
    return RESERVED_DEMO_IDS.map(s => s.toLowerCase()).includes(String(id).toLowerCase());
  }


  
  const ZIP_RULES = {
    'United States':      { re: /^\d{5}(-\d{4})?$/,           msg: 'Enter a valid ZIP code', numeric: true, max: 10 },
    'Philippines':        { re: /^\d{4}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 4 },
    'France':             { re: /^\d{5}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 5 },
    'Germany':            { re: /^\d{5}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 5 },
    'Japan':              { re: /^\d{3}-?\d{4}$/,             msg: 'Enter a valid ZIP code', numeric: false, max: 8 },
    'Australia':          { re: /^\d{4}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 4 },
    'China':              { re: /^\d{6}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 6 },
    'India':              { re: /^\d{6}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 6 },
    'Italy':              { re: /^\d{5}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 5 },
    'Spain':              { re: /^\d{5}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 5 },
    'Brazil':             { re: /^\d{5}-?\d{3}$/,             msg: 'Enter a valid ZIP code', numeric: false, max: 9 },
    'Mexico':             { re: /^\d{5}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 5 },
    'Singapore':          { re: /^\d{6}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 6 },
    'South Korea':        { re: /^\d{5}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 5 },
    'Taiwan':             { re: /^\d{3}(\d{2})?$/,            msg: 'Enter a valid ZIP code', numeric: true, max: 5 },
    'Thailand':           { re: /^\d{5}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 5 },
    'Vietnam':            { re: /^\d{5,6}$/,                  msg: 'Enter a valid ZIP code', numeric: true, max: 6 },
    'Indonesia':          { re: /^\d{5}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 5 },
    'Malaysia':           { re: /^\d{5}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 5 },
    'Russia':             { re: /^\d{6}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 6 },
    'Poland':             { re: /^\d{2}-\d{3}$/,              msg: 'Enter a valid ZIP code', numeric: false, max: 6 },
    'Netherlands':        { re: /^\d{4}\s?[A-Za-z]{2}$/,      msg: 'Enter a valid ZIP code', numeric: false, max: 7 },
    'Sweden':             { re: /^\d{3}\s?\d{2}$/,            msg: 'Enter a valid ZIP code', numeric: false, max: 6 },
    'Norway':             { re: /^\d{4}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 4 },
    'Denmark':            { re: /^\d{4}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 4 },
    'Finland':            { re: /^\d{5}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 5 },
    'Belgium':            { re: /^\d{4}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 4 },
    'Austria':            { re: /^\d{4}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 4 },
    'Switzerland':        { re: /^\d{4}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 4 },
    'Portugal':           { re: /^\d{4}-\d{3}$/,              msg: 'Enter a valid ZIP code', numeric: false, max: 8 },
    'Greece':             { re: /^\d{3}\s?\d{2}$/,            msg: 'Enter a valid ZIP code', numeric: false, max: 6 },
    'Hungary':            { re: /^\d{4}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 4 },
    'Czech Republic':     { re: /^\d{3}\s?\d{2}$/,            msg: 'Enter a valid ZIP code', numeric: false, max: 6 },
    'Turkey':             { re: /^\d{5}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 5 },
    'Saudi Arabia':       { re: /^\d{5}(-\d{4})?$/,           msg: 'Enter a valid ZIP code', numeric: true, max: 10 },
    'United Arab Emirates':{ re: /^[A-Za-z0-9]{3,10}$/,       msg: 'Enter a valid ZIP code', numeric: false, max: 10 },
    'Qatar':              { re: /^\d{0,6}$/,                  msg: 'Enter a valid ZIP code', numeric: true, max: 6 },
    'Kuwait':             { re: /^\d{5}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 5 },
    'Bahrain':            { re: /^\d{3,4}$/,                  msg: 'Enter a valid ZIP code', numeric: true, max: 4 },
    'Oman':               { re: /^\d{3}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 3 },
    'Jordan':             { re: /^\d{5}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 5 },
    'Lebanon':            { re: /^\d{4,8}$/,                  msg: 'Enter a valid ZIP code', numeric: true, max: 8 },
    'Egypt':              { re: /^\d{5}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 5 },
    'South Africa':       { re: /^\d{4}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 4 },
    'Kenya':              { re: /^\d{5}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 5 },
    'Nigeria':            { re: /^\d{6}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 6 },
    'Pakistan':           { re: /^\d{5}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 5 },
    'Bangladesh':         { re: /^\d{4}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 4 },
    'Afghanistan':        { re: /^\d{4}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 4 },
    'Argentina':          { re: /^[A-Za-z]?\d{4}[A-Za-z]{0,3}$/, msg: 'Enter a valid ZIP code', numeric: false, max: 8 },
    'Chile':              { re: /^\d{7}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 7 },
    'Colombia':           { re: /^\d{6}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 6 },
    'Ecuador':            { re: /^\d{6}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 6 },
    'Peru':               { re: /^\d{5}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 5 },
    'Venezuela':          { re: /^\d{4}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 4 },
    'New Zealand':        { re: /^\d{4}$/,                    msg: 'Enter a valid ZIP code', numeric: true, max: 4 },
    'Hong Kong':          { re: /^$/,                         msg: '', numeric: false, max: 0 }, 
    'Macau':              { re: /^$/,                         msg: '', numeric: false, max: 0 },
    'Canada':             { re: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, msg: 'Enter a valid ZIP code', numeric: false, max: 7 },
    'United Kingdom':     { re: /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/, msg: 'Enter a valid ZIP code', numeric: false, max: 8 },
    'Ireland':            { re: /^[A-Za-z\d]{3}\s?[A-Za-z\d]{4}$/, msg: 'Enter a valid ZIP code', numeric: false, max: 8 }
  };

  
  function validateZipForCountry(zipVal, country) {
    if (!zipVal) return { ok: true, msg: '' };
    const rule = ZIP_RULES[country];
    if (!rule || !rule.re || rule.re.source === '(?:)') {
      
      if (!/^[A-Za-z0-9][A-Za-z0-9\\s\\-]{2,9}$/.test(zipVal)) {
        return { ok: false, msg: 'Enter a valid ZIP code' };
      }
      return { ok: true, msg: '' };
    }
    if (!rule.re.test(zipVal)) {
      return { ok: false, msg: rule.msg || 'Enter a valid ZIP code' };
    }
    return { ok: true, msg: '' };
  }


  function showStep(n) {
    currentStep = n;
    Object.keys(panels).forEach((k) => {
      const el = panels[k];
      if (!el) return;
      el.hidden = Number(k) !== n;
    });

    if (stepper) {
      const steps = stepper.querySelectorAll('.reg-step');
      const lines = stepper.querySelectorAll('.reg-step-line');
      steps.forEach((s) => {
        const sn = Number(s.getAttribute('data-step'));
        s.classList.remove('active', 'done', 'clickable');
        if (sn === n) {
          s.classList.add('active');
          if (completedSteps.has(sn)) s.classList.add('done');
        } else if (completedSteps.has(sn)) {
          s.classList.add('done');
        }
        if (completedSteps.has(sn) || (sn === 5 && completedSteps.has(4))) {
          s.classList.add('clickable');
        }
      });
      lines.forEach((line, i) => {
        line.classList.toggle('done', completedSteps.has(i + 1));
      });
    }

    if (continueBtn) {
      if (n === 5) {
        continueBtn.textContent = currentReviewSection === 'login' ? 'Confirm' : 'Next';
      } else {
        continueBtn.textContent = 'Continue';
      }
    }
    if (n === 5) {
      populateReview();
      setReviewSection(currentReviewSection || 'account');
    }


    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* Field error helpers */
  function setError(inputId, errorId, msg) {
    const input = document.getElementById(inputId);
    const err = document.getElementById(errorId);
    if (input) input.classList.add('error');
    if (err) {
      err.textContent = msg;
      err.hidden = false;
    }
  }

  function clearError(inputId, errorId) {
    const input = document.getElementById(inputId);
    const err = document.getElementById(errorId);
    if (input) input.classList.remove('error');
    if (err) {
      err.textContent = '';
      err.hidden = true;
    }
  }

  function clearStepErrors(step) {
    const panel = panels[step];
    if (!panel) return;
    panel.querySelectorAll('.reg-input.error').forEach((el) => el.classList.remove('error'));
    panel.querySelectorAll('.field-error').forEach((el) => {
      el.hidden = true;
      el.textContent = '';
    });
  }

  function val(id) {
    const el = document.getElementById(id);
    return el ? (el.value || '').trim() : '';
  }

  function checked(id) {
    const el = document.getElementById(id);
    return el ? el.checked : false;
  }

  function digitCount(str) {
    return (str.match(/\d/g) || []).length;
  }

  
  function validateStep1() {
    clearStepErrors(1);
    let ok = true;
    const acct = val('atmAccountNo');
    const pin = val('atmPin');
    const jai = val('jaiSelect');

    if (!acct) {
      setError('atmAccountNo', 'atmAccountNoError', 'ATM Account No. is required');
      ok = false;
    } else if (!/^\d{10}$/.test(acct)) {
      setError('atmAccountNo', 'atmAccountNoError', 'Must be exactly 10 digits');
      ok = false;
    }
    if (!pin) {
      setError('atmPin', 'atmPinError', 'ATM PIN is required');
      ok = false;
    } else if (!/^\d{4}$/.test(pin)) {
      setError('atmPin', 'atmPinError', 'Must be exactly 4 digits');
      ok = false;
    }
    if (!jai) {
      setError('jaiSelect', 'jaiError', 'Please select JAI');
      ok = false;
    }
    return ok;
  }

  
  function isSpouseVisible() {
    return val('civilStatus') === 'Married';
  }

  function applySpouseCivilRules() {
    const section = document.getElementById('spouseSection');
    const spouseIds = ['spouseFirstName', 'spouseMiddleName', 'spouseLastName'];
    const show = isSpouseVisible();

    if (section) section.hidden = !show;

    // Spouse fields are always optional — only shown when Married
    if (!show) {
      spouseIds.forEach(function (id) {
        const el = document.getElementById(id);
        if (el) {
          el.value = '';
          el.disabled = false;
        }
        clearError(id, id + 'Error');
        if (window._fieldTouched) window._fieldTouched[id] = false;
      });
    }
  }

  function joinNameParts(firstId, middleId, lastId) {
    return [val(firstId), val(middleId), val(lastId)].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  }

  const NAME_FIELD_LABELS = {
    firstName: 'First Name',
    middleName: 'Middle Name',
    lastName: 'Last Name',
    motherFirstName: 'First Name',
    motherMiddleName: 'Middle Name',
    motherLastName: 'Last Name',
    spouseFirstName: 'First Name',
    spouseMiddleName: 'Middle Name',
    spouseLastName: 'Last Name'
  };

  
  /* Birthday parsing and live age checks */
  function toLocalISODate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  
  function parseBirthday(str) {
    if (!str) return null;
    const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
      const y = Number(iso[1]);
      const mo = Number(iso[2]);
      const day = Number(iso[3]);
      if (mo < 1 || mo > 12 || day < 1 || day > 31) return null;
      const d = new Date(y, mo - 1, day);
      if (Number.isNaN(d.getTime())) return null;
      if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== day) return null;
      return d;
    }
    const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const mo = Number(m[1]);
    const day = Number(m[2]);
    const y = Number(m[3]);
    if (mo < 1 || mo > 12 || day < 1 || day > 31) return null;
    const d = new Date(y, mo - 1, day);
    if (Number.isNaN(d.getTime())) return null;
    if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== day) return null;
    return d;
  }

  
  function ageFromBirthday(dateObj) {
    if (!dateObj) return null;
    const today = new Date();
    let age = today.getFullYear() - dateObj.getFullYear();
    const m = today.getMonth() - dateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dateObj.getDate())) age -= 1;
    return age;
  }

  function isAtLeast18(dateObj) {
    const age = ageFromBirthday(dateObj);
    return age !== null && age >= 18;
  }

  
  /* Birthday rules: 18+, not future (max = today), max age 120 */
  function validateBirthday(str, opts) {
    const requireValue = opts && opts.requireValue;
    const bdayEl = document.getElementById('birthday');
    // Browser empties value for impossible dates (e.g. 30/02/2009) but sets badInput
    if (bdayEl && !bdayEl.value && bdayEl.validity && bdayEl.validity.badInput) {
      return { ok: false, msg: 'The selected date is not valid.' };
    }
    if (!str) {
      if (requireValue) return { ok: false, msg: 'Birthday is required' };
      return { ok: true };
    }

    const dob = parseBirthday(str);
    if (!dob) {
      return { ok: false, msg: 'The selected date is not valid.' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dobDay = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate());

    if (dobDay.getTime() > today.getTime()) {
      return { ok: false, msg: 'Please enter a valid birthdate.' };
    }

    const age = ageFromBirthday(dob);
    if (age === null || age > 120) {
      return { ok: false, msg: 'Please enter a valid birthdate.' };
    }
    if (age < 18) {
      return { ok: false, msg: 'You must be at least 18 years old to register.' };
    }

    return { ok: true };
  }

  
  /* Cap birthday picker at today — no future dates selectable in the calendar */
  function applyBirthdayDateBounds() {
    const el = document.getElementById('birthday');
    if (!el) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxIso = toLocalISODate(today);
    el.setAttribute('max', maxIso);
    el.max = maxIso;

    // Min = 120 years ago (aligns with age validation)
    const minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
    const minIso = toLocalISODate(minDate);
    el.setAttribute('min', minIso);
    el.min = minIso;

    // If a future value was somehow set, clear it so the picker stays consistent
    if (el.value) {
      const selected = parseBirthday(el.value);
      if (selected) {
        const selDay = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());
        if (selDay.getTime() > today.getTime()) {
          el.value = '';
        }
      }
    }
  }
  applyBirthdayDateBounds();
  (function wireBirthdayBoundsRefresh() {
    const el = document.getElementById('birthday');
    if (!el) return;
    el.addEventListener('focus', applyBirthdayDateBounds);
    el.addEventListener('click', applyBirthdayDateBounds);
    el.addEventListener('mousedown', applyBirthdayDateBounds);
    // Keep max in sync if the tab stays open past midnight
    el.addEventListener('change', function () {
      applyBirthdayDateBounds();
      if (window._fieldTouched) window._fieldTouched['birthday'] = true;
    });
    // Live validation as the user types or picks a date (standalone; not in LIVE_INPUT_IDS)
    el.addEventListener('input', function () {
      liveValidateField('birthday');
    });
  })();

  /* Step 2 validation (personal info) */
  function validateStep2() {
    clearStepErrors(2);
    let ok = true;
    const required = [
      ['firstName', 'firstNameError', 'First Name is required'],
      ['lastName', 'lastNameError', 'Last Name is required'],
      ['motherFirstName', 'motherFirstNameError', 'First Name is required'],
      ['motherLastName', 'motherLastNameError', 'Last Name is required'],
      ['gender', 'genderError', 'Gender is required'],
      ['civilStatus', 'civilStatusError', 'Civil Status is required'],
      ['birthday', 'birthdayError', 'Birthday is required'],
      ['street', 'streetError', 'No./Street is required'],
      ['barangay', 'barangayError', 'Barangay/Subdivision is required'],
      ['city', 'cityError', 'City/Municipality is required'],
      ['province', 'provinceError', 'Province is required'],
      ['country', 'countryError', 'Country is required'],
      ['email', 'emailError', 'Primary Email Address is required'],
      ['mobileCountry', 'mobileCountryError', 'Mobile Country Code is required'],
      ['mobileNumber', 'mobileNumberError', 'Mobile Number is required']
    ];
    required.forEach(([id, errId, msg]) => {
      if (id === 'birthday') {
        const bdayEl = document.getElementById('birthday');
        if (bdayEl && bdayEl.validity && bdayEl.validity.badInput) {
          setError(id, errId, 'The selected date is not valid.');
          ok = false;
          return;
        }
      }
      if (!val(id)) {
        setError(id, errId, msg);
        ok = false;
      }
    });

    // Spouse fields are optional (shown only when Married); only validate format if filled

    // Character validation for all name parts that have a value
    ['firstName', 'middleName', 'lastName',
     'motherFirstName', 'motherMiddleName', 'motherLastName',
     'spouseFirstName', 'spouseMiddleName', 'spouseLastName'].forEach((id) => {
      const v = val(id);
      if (v && !isValidName(v)) {
        const label = NAME_FIELD_LABELS[id] || 'This field';
        setError(id, id + 'Error', label + ' contains invalid characters.');
        ok = false;
      }
    });

    // Address field format validation
    [['street', isValidStreetAddress], ['barangay', isValidStreetAddress],
     ['city', isValidPlaceName], ['province', isValidPlaceName]].forEach(function (pair) {
      const id = pair[0];
      const checker = pair[1];
      const v = val(id);
      if (v && !checker(v)) {
        const label = ADDRESS_FIELD_LABELS[id] || 'This field';
        setError(id, id + 'Error', label + ' contains invalid characters.');
        ok = false;
      }
    });

    
    const bdayResult = validateBirthday(val('birthday'), { requireValue: true });
    if (!bdayResult.ok) {
      setError('birthday', 'birthdayError', bdayResult.msg);
      ok = false;
    }

    

    
    const email = val('email');
    if (email && !EMAIL_RE.test(email)) {
      setError('email', 'emailError', 'Enter a valid email address');
      ok = false;
    }

    
    const alt = val('altEmail');
    if (alt) {
      if (!EMAIL_RE.test(alt)) {
        setError('altEmail', 'altEmailError', 'Enter a valid alternate email address');
        ok = false;
      } else if (email && alt.toLowerCase() === email.toLowerCase()) {
        setError(
          'altEmail',
          'altEmailError',
          'Your alternate email address cannot be the same as your primary email address. Please provide a backup account for recovery.'
        );
        ok = false;
      }
    }

    
    const mobile = val('mobileNumber');
    if (mobile) {
      const el = document.getElementById('mobileNumber');
      const maxLen = Number((el && el.maxLength) || 12);
      const allowed = ((el && el.dataset.prefix) || '').split(',').map(s => s.trim()).filter(Boolean);
      const digitsOnly = /^\d+$/.test(mobile);
      const lengthOk = mobile.length >= 7 && mobile.length <= maxLen;
      const prefixOk = !allowed.length || allowed.some(p => mobile.startsWith(p));
      if (!digitsOnly || !lengthOk || !prefixOk) {
        setError('mobileNumber', 'mobileNumberError', 'Enter a valid mobile number');
        ok = false;
      }
    }

    
    ['homeTel', 'officeTel'].forEach((id) => {
      const v = val(id);
      if (!v) return;
      if (!/^\d{7,15}$/.test(v)) {
        setError(id, id + 'Error', 'Enter a valid phone number');
        ok = false;
      }
    });

    
    const zip = val('zip');
    if (zip) {
      const result = validateZipForCountry(zip, val('country'));
      if (!result.ok) {
        setError('zip', 'zipError', result.msg);
        ok = false;
      }
    }

    
    const tin = val('tin');
    if (tin) {
      if (!/^\d+$/.test(tin)) {
        setError('tin', 'tinError', 'TIN must contain digits only');
        ok = false;
      } else if (tin.length !== 9 && tin.length !== 12) {
        setError('tin', 'tinError', 'TIN must be exactly 9 or 12 digits');
        ok = false;
      }
    }

    return ok;
  }

  
  function checkSecurityQuestionUniqueness() {
    const q1 = val('secQ1');
    const q2 = val('secQ2');
    const q3 = val('secQ3');
    const MSG = 'This question is already used. Please choose a different question.';
    let ok = true;

    clearError('secQ1', 'secQ1Error');
    clearError('secQ2', 'secQ2Error');
    clearError('secQ3', 'secQ3Error');

    
    if (q2 && q1 && q2 === q1) {
      setError('secQ2', 'secQ2Error', MSG);
      ok = false;
    }
    if (q3 && ((q1 && q3 === q1) || (q2 && q3 === q2))) {
      setError('secQ3', 'secQ3Error', MSG);
      ok = false;
    }
    return ok;
  }

  function validateStep3() {
    clearStepErrors(3);
    let ok = true;
    for (let i = 1; i <= 3; i++) {
      if (!val('secQ' + i)) {
        setError('secQ' + i, 'secQ' + i + 'Error', 'Please select a question');
        ok = false;
      }
      const ans = val('secA' + i);
      const conf = val('secCA' + i);
      if (!ans) {
        setError('secA' + i, 'secA' + i + 'Error', 'Answer is required');
        ok = false;
      } else if (!isValidSecurityAnswer(ans)) {
        setError('secA' + i, 'secA' + i + 'Error', 'Answer contains invalid characters.');
        ok = false;
      }
      if (!conf) {
        setError('secCA' + i, 'secCA' + i + 'Error', 'Confirm Answer is required');
        ok = false;
      } else if (!isValidSecurityAnswer(conf)) {
        setError('secCA' + i, 'secCA' + i + 'Error', 'Confirm Answer contains invalid characters.');
        ok = false;
      } else if (ans && conf.toLowerCase() !== ans.toLowerCase()) {
        setError('secCA' + i, 'secCA' + i + 'Error', 'Answers do not match');
        ok = false;
      }
    }
    if (!checkSecurityQuestionUniqueness()) ok = false;
    return ok;
  }

  
  function validateStep4() {
    clearStepErrors(4);
    let ok = true;
    const id = val('iaccessId');
    const pw = val('regPassword');
    const cpw = val('regPasswordConfirm');

    if (!id) {
      setError('iaccessId', 'iaccessIdError', 'iAccess ID is required');
      ok = false;
    } else if (!/^[a-zA-Z0-9]{6,20}$/.test(id)) {
      setError('iaccessId', 'iaccessIdError', 'Must be 6–20 alphanumeric characters');
      ok = false;
    } else if (isIaccessIdTaken(id)) {
      setError('iaccessId', 'iaccessIdError', 'iAccessID already exist');
      ok = false;
    }
    if (!pw) {
      setError('regPassword', 'regPasswordError', 'Password is required');
      ok = false;
    } else if (pw.length < 7 || pw.length > 15) {
      setError('regPassword', 'regPasswordError', 'Password must be 7–15 characters');
      ok = false;
    } else if (!/[A-Z]/.test(pw) || !/[a-z]/.test(pw) || !/[0-9]/.test(pw)) {
      setError('regPassword', 'regPasswordError', 'Must include uppercase, lowercase, and a number');
      ok = false;
    } else if (id && pw.toLowerCase().includes(id.toLowerCase())) {
      setError('regPassword', 'regPasswordError', 'Password must not contain your iAccess ID');
      ok = false;
    }
    if (!cpw) {
      setError('regPasswordConfirm', 'regPasswordConfirmError', 'Please confirm your password');
      ok = false;
    } else if (pw !== cpw) {
      setError('regPasswordConfirm', 'regPasswordConfirmError', 'Passwords do not match');
      ok = false;
    }
    return ok;
  }

  function validateStep5() {
    let ok = true;
    const termsErr = document.getElementById('finalTermsError');
    if (termsErr) { termsErr.hidden = true; termsErr.textContent = ''; }

    if (!checkMathCaptcha()) {
      ok = false;
    }
    if (!checked('finalTermsAgree')) {
      if (termsErr) {
        termsErr.textContent = 'You must agree to the Terms and Conditions.';
        termsErr.hidden = false;
      }
      ok = false;
    }
    return ok;
  }

  function na(v) {
    return v && v.trim() ? v.trim() : 'N/A';
  }

  function formatDate(str) {
    if (!str) return 'N/A';
    
    const p = str.split('-');
    if (p.length === 3) return p[1] + '/' + p[2] + '/' + p[0];
    return str;
  }

  function populateReview() {
    const set = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    set('sumAtmAccount', na(val('atmAccountNo')));
    set('sumJai', na(val('jaiSelect')));
    set('sumAtmPin', val('atmPin') ? '••••' : 'N/A');
    set('sumFundTransfer', checked('enableFundTransfer') ? 'Yes' : 'No');

    const name = joinNameParts('firstName', 'middleName', 'lastName');
    set('sumName', na(name));
    set('sumMaiden', na(joinNameParts('motherFirstName', 'motherMiddleName', 'motherLastName')));
    set('sumSpouse', na(joinNameParts('spouseFirstName', 'spouseMiddleName', 'spouseLastName')));
    set('sumGender', na(val('gender')));
    set('sumCivil', na(val('civilStatus')));
    set('sumBirthday', formatDate(val('birthday')));

    const addrParts = [
      val('street'), val('barangay'), val('city'), val('province'), val('zip'), val('country')
    ].filter(Boolean);
    set('sumAddress', addrParts.length ? addrParts.join(', ') : 'N/A');

    set('sumEmail', na(val('email')));
    set('sumAltEmail', na(val('altEmail')));
    const mobile = val('mobileNumber');
    const cc = val('mobileCountry') || '';
    set('sumMobile', mobile ? cc + ' ' + mobile : 'N/A');
    set('sumHomeTel', na(val('homeTel')));
    set('sumOfficeTel', na(val('officeTel')));
    set('sumIaccessId', na(val('iaccessId')));
  }

  
  const REVIEW_ORDER = ['account', 'personal', 'login'];
  let currentReviewSection = 'account';

  function setReviewSection(sec) {
    if (!REVIEW_ORDER.includes(sec)) return;
    currentReviewSection = sec;
    document.querySelectorAll('.reg-review-nav-item').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-review-section') === sec);
    });
    document.querySelectorAll('.reg-summary-panel').forEach((p) => {
      p.hidden = p.getAttribute('data-review-panel') !== sec;
    });
    
    if (continueBtn && currentStep === 5) {
      continueBtn.textContent = sec === 'login' ? 'Confirm' : 'Next';
    }
  }

  document.querySelectorAll('.reg-review-nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      setReviewSection(btn.getAttribute('data-review-section'));
    });
  });

  document.querySelectorAll('.reg-edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const step = Number(btn.getAttribute('data-edit-step'));
      if (step >= 1 && step <= 4) showStep(step);
    });
  });

  
  if (stepper) {
    stepper.querySelectorAll('.reg-step').forEach((s) => {
      s.addEventListener('click', () => {
        const sn = Number(s.getAttribute('data-step'));
        if (sn === currentStep) return;
        if (completedSteps.has(sn) || (sn === 5 && completedSteps.has(4))) {
          showStep(sn);
        }
      });
    });
  }

  
  const civilStatusEl = document.getElementById('civilStatus');
  if (civilStatusEl) {
    civilStatusEl.addEventListener('change', () => {
      applySpouseCivilRules();
      ['spouseFirstName', 'spouseMiddleName', 'spouseLastName'].forEach(function (id) {
        clearError(id, id + 'Error');
      });
      // Re-validate civil status itself on change (touched)
      if (window._fieldTouched) window._fieldTouched['civilStatus'] = true;
      liveValidateField('civilStatus');
    });
  }
  


  


  
  const mobileCountry = document.getElementById('mobileCountry');
  const mobilePrefix = document.getElementById('mobilePrefix');
  const mobileNumber = document.getElementById('mobileNumber');
  if (mobileCountry && mobilePrefix && mobileNumber) {
    
    const syncMobile = () => {
      const opt = mobileCountry.options[mobileCountry.selectedIndex];
      const code = mobileCountry.value || '+63';
      mobilePrefix.textContent = code;
      const ph = (opt && opt.getAttribute('data-placeholder')) || '9123456789';
      const max = (opt && opt.getAttribute('data-max')) || '12';
      const prefix = (opt && opt.getAttribute('data-prefix')) || '';
      mobileNumber.placeholder = ph;
      mobileNumber.maxLength = Number(max) || 12;
      mobileNumber.dataset.prefix = prefix; 
      
      if (mobileNumber.value) {
        liveValidateField('mobileNumber');
      }
    };
    mobileCountry.addEventListener('change', syncMobile);
    syncMobile();
  }

  
  const countrySelect = document.getElementById('country');
  const zipInput = document.getElementById('zip');
  if (countrySelect && zipInput) {
    countrySelect.addEventListener('change', () => {
      const rule = ZIP_RULES[countrySelect.value];
      if (rule && rule.max) {
        zipInput.maxLength = rule.max;
      } else {
        zipInput.maxLength = 10;
      }
      if (zipInput.value) liveValidateField('zip');
    });
  }


  
  ['atmAccountNo', 'atmPin', 'mobileNumber', 'tin', 'homeTel', 'officeTel'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      el.value = el.value.replace(/\D/g, '');
    });
  });

  
  function wireEye(toggleId, inputId, iconId) {
    const toggle = document.getElementById(toggleId);
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!toggle || !input || !icon) return;
    toggle.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      icon.src = show ? 'images/login-eye-on.png' : 'images/login-eye-off.png';
      toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      toggle.setAttribute('aria-pressed', show ? 'true' : 'false');
    });
  }
  wireEye('regEyeToggle', 'regPassword', 'regEyeIcon');
  wireEye('regEyeToggleConfirm', 'regPasswordConfirm', 'regEyeIconConfirm');
  wireEye('atmPinEyeToggle', 'atmPin', 'atmPinEyeIcon');

  
  /* Live field validation on input/blur */
  function liveValidateField(id) {
    const v = val(id);
    const el = document.getElementById(id);
    if (!el) return;

    switch (id) {
      
      case 'atmAccountNo':
        if (!v) { clearError(id, id + 'Error'); return; }
        if (!/^\d{10}$/.test(v)) setError(id, id + 'Error', 'Must be exactly 10 digits');
        else clearError(id, id + 'Error');
        break;
      case 'atmPin':
        if (!v) { clearError(id, id + 'Error'); return; }
        if (!/^\d{4}$/.test(v)) setError(id, id + 'Error', 'Must be exactly 4 digits');
        else clearError(id, id + 'Error');
        break;
      case 'jaiSelect':
        if (!v) setError(id, 'jaiError', 'Please select JAI');
        else clearError(id, 'jaiError');
        break;

      
      case 'firstName':
      case 'middleName':
      case 'lastName':
      case 'motherFirstName':
      case 'motherMiddleName':
      case 'motherLastName':
      case 'spouseFirstName':
      case 'spouseMiddleName':
      case 'spouseLastName':
        if (!v) { clearError(id, id + 'Error'); return; }
        if (!isValidName(v)) {
          const label = NAME_FIELD_LABELS[id] || 'This field';
          setError(id, id + 'Error', label + ' contains invalid characters.');
        } else clearError(id, id + 'Error');
        break;
      case 'street':
      case 'barangay': {
        if (!v) { clearError(id, id + 'Error'); return; }
        if (!isValidStreetAddress(v)) {
          setError(id, id + 'Error', (ADDRESS_FIELD_LABELS[id] || 'This field') + ' contains invalid characters.');
        } else clearError(id, id + 'Error');
        break;
      }
      case 'city':
      case 'province': {
        if (!v) { clearError(id, id + 'Error'); return; }
        if (!isValidPlaceName(v)) {
          setError(id, id + 'Error', (ADDRESS_FIELD_LABELS[id] || 'This field') + ' contains invalid characters.');
        } else clearError(id, id + 'Error');
        break;
      }
      case 'gender':
      case 'civilStatus':
      case 'country':
      case 'mobileCountry':
        if (!v) setError(id, id + 'Error', 'This field is required');
        else clearError(id, id + 'Error');
        break;
      case 'birthday': {
        const bdayEl = document.getElementById('birthday');
        if (bdayEl && bdayEl.validity && bdayEl.validity.badInput) {
          setError(id, id + 'Error', 'The selected date is not valid.');
          break;
        }
        if (!v) { clearError(id, id + 'Error'); return; }
        const result = validateBirthday(v);
        if (!result.ok) setError(id, id + 'Error', result.msg);
        else clearError(id, id + 'Error');
        break;
      }
      case 'email':
        if (!v) { clearError(id, id + 'Error'); return; }
        if (!EMAIL_RE.test(v)) setError(id, id + 'Error', 'Enter a valid email address');
        else clearError(id, id + 'Error');
        
        if (val('altEmail')) liveValidateField('altEmail');
        break;
      case 'altEmail': {
        if (!v) { clearError(id, id + 'Error'); return; }
        if (!EMAIL_RE.test(v)) setError(id, id + 'Error', 'Enter a valid alternate email address');
        else if (val('email') && v.toLowerCase() === val('email').toLowerCase()) {
          setError(id, id + 'Error', 'Your alternate email address cannot be the same as your primary email address. Please provide a backup account for recovery.');
        } else clearError(id, id + 'Error');
        break;
      }
      case 'mobileNumber': {
        if (!v) { clearError(id, id + 'Error'); return; }
        const el = document.getElementById('mobileNumber');
        const maxLen = Number((el && el.maxLength) || 12);
        const allowed = ((el && el.dataset.prefix) || '').split(',').map(s => s.trim()).filter(Boolean);
        const digitsOnly = /^\d+$/.test(v);
        const lengthOk = v.length >= 7 && v.length <= maxLen;
        const prefixOk = !allowed.length || allowed.some(p => v.startsWith(p));
        if (!digitsOnly || !lengthOk || !prefixOk) {
          setError(id, id + 'Error', 'Enter a valid mobile number');
        } else {
          clearError(id, id + 'Error');
        }
        break;
      }
      case 'homeTel':
      case 'officeTel':
        if (!v) { clearError(id, id + 'Error'); return; }
        
        if (!/^\d{7,15}$/.test(v)) setError(id, id + 'Error', 'Enter a valid phone number');
        else clearError(id, id + 'Error');
        break;
      case 'tin':
        if (!v) { clearError(id, id + 'Error'); return; }
        if (!/^\d+$/.test(v)) setError(id, id + 'Error', 'TIN must contain digits only');
        else if (v.length !== 9 && v.length !== 12)
          setError(id, id + 'Error', 'TIN must be exactly 9 or 12 digits');
        else clearError(id, id + 'Error');
        break;
      case 'zip': {
        if (!v) { clearError(id, id + 'Error'); return; }
        const country = val('country');
        const result = validateZipForCountry(v, country);
        if (!result.ok) setError(id, id + 'Error', result.msg);
        else clearError(id, id + 'Error');
        break;
      }
      

      
      case 'secA1':
      case 'secA2':
      case 'secA3':
        if (!v) { clearError(id, id + 'Error'); return; }
        if (!isValidSecurityAnswer(v)) {
          setError(id, id + 'Error', 'Answer contains invalid characters.');
        } else {
          clearError(id, id + 'Error');
          liveValidateField(id.replace('secA', 'secCA'));
        }
        break;
      case 'secCA1':
      case 'secCA2':
      case 'secCA3': {
        const n = id.slice(-1);
        const ans = val('secA' + n);
        if (!v) { clearError(id, id + 'Error'); return; }
        if (!isValidSecurityAnswer(v)) {
          setError(id, id + 'Error', 'Confirm Answer contains invalid characters.');
        } else if (ans && v.toLowerCase() !== ans.toLowerCase()) {
          setError(id, id + 'Error', 'Answers do not match');
        } else clearError(id, id + 'Error');
        break;
      }

      
      case 'iaccessId': {
        if (!v) { clearError(id, id + 'Error'); return; }
        if (!/^[a-zA-Z0-9]{6,20}$/.test(v)) {
          setError(id, id + 'Error', 'Must be 6–20 alphanumeric characters');
        } else if (isIaccessIdTaken(v)) {
          
          setError(id, id + 'Error', 'iAccessID already exist');
        } else {
          clearError(id, id + 'Error');
        }
        break;
      }
      case 'regPassword': {
        if (!v) { clearError(id, id + 'Error'); return; }
        if (v.length < 7 || v.length > 15) setError(id, id + 'Error', 'Password must be 7–15 characters');
        else if (!/[A-Z]/.test(v) || !/[a-z]/.test(v) || !/[0-9]/.test(v))
          setError(id, id + 'Error', 'Must include uppercase, lowercase, and a number');
        else clearError(id, id + 'Error');
        if (val('regPasswordConfirm')) liveValidateField('regPasswordConfirm');
        break;
      }
      case 'regPasswordConfirm': {
        if (!v) { clearError(id, id + 'Error'); return; }
        if (v !== val('regPassword')) setError(id, id + 'Error', 'Passwords do not match');
        else clearError(id, id + 'Error');
        break;
      }
      default:
        break;
    }
  }

  
  function liveValidateRequiredOnBlur(id, message) {
    const v = val(id);
    if (!v) setError(id, id === 'jaiSelect' ? 'jaiError' : id + 'Error', message);
    else liveValidateField(id);
  }

  
  const LIVE_INPUT_IDS = [
    'atmAccountNo', 'atmPin',
    'firstName', 'middleName', 'lastName',
    'motherFirstName', 'motherMiddleName', 'motherLastName',
    'spouseFirstName', 'spouseMiddleName', 'spouseLastName',
    'street', 'barangay', 'city', 'province',
    'email', 'altEmail', 'mobileNumber', 'homeTel', 'officeTel', 'tin', 'zip',
    'secA1', 'secA2', 'secA3', 'secCA1', 'secCA2', 'secCA3',
    'iaccessId', 'regPassword', 'regPasswordConfirm'
  ];
  // Touched tracking: no error until blur or submit; once errored, live-clear on input
  window._fieldTouched = window._fieldTouched || {};

  LIVE_INPUT_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      // Clear red warning the moment the user starts typing
      if (el.classList && el.classList.contains('error')) {
        clearError(id, id === 'jaiSelect' ? 'jaiError' : id + 'Error');
      }
      // If already touched, re-evaluate so a still-invalid value can show error again on next blur;
      // while typing, keep neutral until blur unless they leave an invalid non-empty value after fix attempt
      if (window._fieldTouched[id]) {
        const v = (el.value || '').trim();
        if (!v) {
          // empty while typing: stay clear until blur decides required-or-not
          clearError(id, id === 'jaiSelect' ? 'jaiError' : id + 'Error');
        } else {
          liveValidateField(id);
        }
      }
    });
    el.addEventListener('blur', () => {
      window._fieldTouched[id] = true;
      const requiredMsgs = {
        atmAccountNo: 'ATM Account No. is required',
        atmPin: 'ATM PIN is required',
        firstName: 'First Name is required',
        lastName: 'Last Name is required',
        motherFirstName: 'First Name is required',
        motherLastName: 'Last Name is required',
        street: 'No./Street is required',
        barangay: 'Barangay/Subdivision is required',
        city: 'City/Municipality is required',
        province: 'Province is required',
        email: 'Primary Email Address is required',
        mobileNumber: 'Mobile Number is required',
        secA1: 'Answer is required',
        secA2: 'Answer is required',
        secA3: 'Answer is required',
        secCA1: 'Confirm Answer is required',
        secCA2: 'Confirm Answer is required',
        secCA3: 'Confirm Answer is required',
        iaccessId: 'iAccess ID is required',
        regPassword: 'Password is required',
        regPasswordConfirm: 'Please confirm your password'
      };
      // Optional name fields — format-only when filled (all middle names + spouse parts)
      if (id === 'middleName' || id === 'motherMiddleName' ||
          id === 'spouseFirstName' || id === 'spouseMiddleName' || id === 'spouseLastName') {
        liveValidateField(id);
        return;
      }
      if (requiredMsgs[id] && !val(id)) setError(id, id + 'Error', requiredMsgs[id]);
      else liveValidateField(id);
    });
  });

  
  const LIVE_SELECT_IDS = [
    ['jaiSelect', 'Please select JAI'],
    ['gender', 'Gender is required'],
    ['civilStatus', 'Civil Status is required'],
    ['country', 'Country is required'],
    ['mobileCountry', 'Mobile Country Code is required'],
    ['birthday', 'Birthday is required'],
    ['secQ1', 'Please select a question'],
    ['secQ2', 'Please select a question'],
    ['secQ3', 'Please select a question']
  ];
  LIVE_SELECT_IDS.forEach(([id, reqMsg]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      if (id === 'secQ1' || id === 'secQ2' || id === 'secQ3') {
        if (!val(id)) setError(id, id + 'Error', reqMsg);
        else {
          clearError(id, id + 'Error');
          checkSecurityQuestionUniqueness();
        }
        return;
      }
      if (id === 'birthday') {
        liveValidateField('birthday');
        return;
      }
      if (id === 'civilStatus') {
        applySpouseCivilRules();
        if (!val(id)) setError(id, id + 'Error', reqMsg);
        else clearError(id, id + 'Error');
        return;
      }
      if (!val(id)) setError(id, id === 'jaiSelect' ? 'jaiError' : id + 'Error', reqMsg);
      else liveValidateField(id);
    });
    el.addEventListener('blur', () => {
      if (id === 'secQ1' || id === 'secQ2' || id === 'secQ3') {
        if (!val(id)) setError(id, id + 'Error', reqMsg);
        else checkSecurityQuestionUniqueness();
        return;
      }
      if (id === 'birthday') {
        const bdayEl = document.getElementById('birthday');
        if (bdayEl && bdayEl.validity && bdayEl.validity.badInput) {
          setError(id, id + 'Error', 'The selected date is not valid.');
        } else if (!val(id)) {
          setError(id, id + 'Error', reqMsg);
        } else {
          liveValidateField('birthday');
        }
        return;
      }
      if (!val(id)) setError(id, id === 'jaiSelect' ? 'jaiError' : id + 'Error', reqMsg);
      else liveValidateField(id);
    });
  });


  
  const jaiInfoBtn = document.getElementById('jaiInfoBtn');
  const jaiPopover = document.getElementById('jaiPopover');
  const jaiPopoverClose = document.getElementById('jaiPopoverClose');

  function openJaiPopover() {
    if (!jaiPopover || !jaiInfoBtn) return;
    jaiPopover.hidden = false;
    jaiPopover.classList.add('is-open');
    
    requestAnimationFrame(function () {
      const rect = jaiInfoBtn.getBoundingClientRect();
      const popW = Math.min(440, window.innerWidth - 24);
      const popH = jaiPopover.offsetHeight || 240;
      
      let left = rect.right + 8;
      if (left + popW > window.innerWidth - 12) {
        left = rect.left - popW - 8;
      }
      if (left < 12) left = 12;
      if (left + popW > window.innerWidth - 12) {
        left = window.innerWidth - popW - 12;
      }
      
      let top = rect.top;
      if (top + popH > window.innerHeight - 12) {
        top = Math.max(12, window.innerHeight - popH - 12);
      }
      if (top < 12) top = 12;
      jaiPopover.style.position = 'fixed';
      jaiPopover.style.left = left + 'px';
      jaiPopover.style.top = top + 'px';
      jaiPopover.style.right = 'auto';
      jaiPopover.style.bottom = 'auto';
    });
  }

  function closeJaiPopover() {
    if (!jaiPopover) return;
    jaiPopover.hidden = true;
    jaiPopover.classList.remove('is-open');
  }

  if (jaiInfoBtn && jaiPopover) {
    jaiInfoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (jaiPopover.classList.contains('is-open')) closeJaiPopover();
      else openJaiPopover();
    });
  }
  if (jaiPopoverClose) {
    jaiPopoverClose.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeJaiPopover();
    });
  }
  if (jaiPopover) {
    jaiPopover.addEventListener('click', (e) => e.stopPropagation());
  }
  document.addEventListener('click', () => closeJaiPopover());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeJaiPopover();
  });

  
  let captchaCode = '';
  const captchaRoot = document.getElementById('regCaptcha');
  const captchaBar = document.getElementById('captchaBar');
  const captchaCheckBtn = document.getElementById('captchaCheckBtn');
  const captchaLoading = document.getElementById('captchaLoading');
  const captchaChallenge = document.getElementById('captchaChallenge');
  const captchaCodeEl = document.getElementById('captchaCode');
  const captchaAnswer = document.getElementById('captchaAnswer');
  const captchaRefresh = document.getElementById('captchaRefresh');
  const captchaVerifyBtn = document.getElementById('captchaVerifyBtn');
  const captchaSuccess = document.getElementById('captchaSuccess');

  function randomCaptchaCode(len) {
    // Mixed upper + lower (skip ambiguous I/l/O/o/0/1) and digits
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let out = '';
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  function showCaptchaCode() {
    captchaCode = randomCaptchaCode(5);
    if (captchaCodeEl) captchaCodeEl.textContent = captchaCode;
    if (captchaAnswer) captchaAnswer.value = '';
  }

  function resetCaptchaUi() {
    recaptchaChecked = false;
    if (captchaRoot) captchaRoot.classList.remove('is-verified', 'is-error');
    if (captchaSuccess) captchaSuccess.hidden = true;
    if (captchaChallenge) captchaChallenge.hidden = true;
    if (captchaLoading) captchaLoading.hidden = true;
    if (captchaBar) captchaBar.hidden = false;
    if (captchaCheckBtn) captchaCheckBtn.setAttribute('aria-pressed', 'false');
    const box = document.getElementById('captchaBox');
    if (box) box.textContent = '';
    const err = document.getElementById('recaptchaError');
    if (err) { err.hidden = true; err.textContent = ''; }
  }

  function startCaptchaFlow() {
    if (recaptchaChecked) return;
    
    if (captchaBar) captchaBar.hidden = true;
    if (captchaChallenge) captchaChallenge.hidden = true;
    if (captchaSuccess) captchaSuccess.hidden = true;
    if (captchaLoading) captchaLoading.hidden = false;
    setTimeout(() => {
      
      if (captchaLoading) captchaLoading.hidden = true;
      showCaptchaCode();
      if (captchaChallenge) captchaChallenge.hidden = false;
    }, 900);
  }

  function verifyCaptchaAnswer() {
    const err = document.getElementById('recaptchaError');
    if (err) { err.hidden = true; err.textContent = ''; }
    // Case-sensitive: must match upper and lower characters exactly
    const raw = (captchaAnswer && captchaAnswer.value || '').trim();
    if (!raw) {
      if (err) { err.textContent = 'Please enter the code.'; err.hidden = false; }
      return false;
    }
    if (raw !== captchaCode) {
      if (captchaRoot) captchaRoot.classList.add('is-error');
      if (err) { err.textContent = 'Incorrect code. Try a new one.'; err.hidden = false; }
      showCaptchaCode();
      return false;
    }
    recaptchaChecked = true;
    if (captchaRoot) {
      captchaRoot.classList.remove('is-error');
      captchaRoot.classList.add('is-verified');
    }
    if (captchaChallenge) captchaChallenge.hidden = true;
    if (captchaBar) {
      captchaBar.hidden = false;
      if (captchaCheckBtn) captchaCheckBtn.setAttribute('aria-pressed', 'true');
      const box = document.getElementById('captchaBox');
      if (box) box.textContent = '✓';
    }
    if (captchaSuccess) captchaSuccess.hidden = false;
    return true;
  }

  function checkMathCaptcha() {
    
    if (recaptchaChecked) return true;
    const err = document.getElementById('recaptchaError');
    if (err) {
      err.textContent = 'Please complete the security check.';
      err.hidden = false;
    }
    return false;
  }

  function onCaptchaClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (recaptchaChecked) return;
    startCaptchaFlow();
  }
  if (captchaCheckBtn) captchaCheckBtn.addEventListener('click', onCaptchaClick);
  if (captchaBar) {
    captchaBar.addEventListener('click', (e) => {
      if (recaptchaChecked) return;
      
      onCaptchaClick(e);
    });
  }
  if (captchaRefresh) {
    captchaRefresh.addEventListener('click', (e) => {
      e.preventDefault();
      showCaptchaCode();
    });
  }
  if (captchaVerifyBtn) {
    captchaVerifyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      verifyCaptchaAnswer();
    });
  }
  if (captchaAnswer) {
    captchaAnswer.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        verifyCaptchaAnswer();
      }
    });
  }
  resetCaptchaUi();

  
  const termsModal = document.getElementById('termsModal');
  const tcAgree = document.getElementById('tcAgreeCheckbox');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalClose = document.getElementById('modalClose');
  const reviewTermsLink = document.getElementById('reviewTermsLink');

  function openTermsModal() {
    if (!termsModal) return;
    termsModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (tcAgree) tcAgree.checked = termsAccepted;
    if (typeof syncTcContinueState === 'function') syncTcContinueState();
    else if (modalCloseBtn) modalCloseBtn.disabled = !termsAccepted;
  }

  function closeTermsModal() {
    if (!termsModal) return;
    termsModal.classList.remove('active');
    if (!document.querySelector('.modal-overlay.active')) {
      document.body.style.overflow = '';
    }
  }

  function syncTcContinueState() {
    if (!modalCloseBtn) return;
    const agreed = !!(tcAgree && tcAgree.checked);
    modalCloseBtn.disabled = !agreed;
    modalCloseBtn.setAttribute('aria-disabled', agreed ? 'false' : 'true');
    modalCloseBtn.classList.toggle('is-disabled', !agreed);
  }

  if (tcAgree && modalCloseBtn) {
    syncTcContinueState();
    tcAgree.addEventListener('change', syncTcContinueState);
  }
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', (e) => {
      if (!tcAgree || !tcAgree.checked) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      termsAccepted = true;
      closeTermsModal();
    });
  }
  if (modalClose) {
    modalClose.addEventListener('click', () => {
      if (termsAccepted) closeTermsModal();
    });
  }
  if (termsModal) {
    termsModal.addEventListener('click', (e) => {
      if (e.target === termsModal && termsAccepted) closeTermsModal();
    });
  }
  if (reviewTermsLink) {
    reviewTermsLink.addEventListener('click', (e) => {
      e.preventDefault();
      
      openTermsModal();
    });
  }

  
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (currentStep === 1) {
        if (window.smoothNavigate) window.smoothNavigate('homepage.html');
        else window.location.href = 'homepage.html';
        return;
      }
      
      if (currentStep === 5) {
        const idx = REVIEW_ORDER.indexOf(currentReviewSection);
        if (idx > 0) {
          setReviewSection(REVIEW_ORDER[idx - 1]);
          return;
        }
      }
      showStep(currentStep - 1);
    });
  }

  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      
      if (currentStep === 5) {
        if (currentReviewSection !== 'login') {
          const idx = REVIEW_ORDER.indexOf(currentReviewSection);
          setReviewSection(REVIEW_ORDER[Math.min(idx + 1, REVIEW_ORDER.length - 1)]);
          return;
        }
        if (!validateStep5()) {
          const panel = panels[5];
          const firstErr = panel && panel.querySelector('.field-error:not([hidden])');
          if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        completedSteps.add(5);
        try { sessionStorage.setItem('pendingActivation', 'true'); } catch (e) {}
        const successModal = document.getElementById('regSuccessModal');
        if (successModal) {
          successModal.classList.add('active');
          document.body.style.overflow = 'hidden';
        }
        return;
      }

      let ok = true;
      if (currentStep === 1) ok = validateStep1();
      else if (currentStep === 2) ok = validateStep2();
      else if (currentStep === 3) ok = validateStep3();
      else if (currentStep === 4) ok = validateStep4();

      if (!ok) {
        const panel = panels[currentStep];
        // Mark all errored fields as touched so further typing can clear the error
        if (panel) {
          panel.querySelectorAll('.reg-input.error').forEach(function (el) {
            if (el.id) window._fieldTouched[el.id] = true;
          });
        }
        const firstErr = panel && panel.querySelector('.reg-input.error');
        if (firstErr) {
          firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
          try { firstErr.focus({ preventScroll: true }); } catch (e) { firstErr.focus(); }
        }
        return;
      }

      completedSteps.add(currentStep);
      showStep(currentStep + 1);
    });
  }

  const regSuccessClose = document.getElementById('regSuccessClose');
  if (regSuccessClose) {
    regSuccessClose.addEventListener('click', () => {
      try { sessionStorage.setItem('pendingActivation', 'true'); } catch (e) {}
      if (window.smoothNavigate) window.smoothNavigate('login.html');
      else window.location.href = 'login.html';
    });
  }


  applySpouseCivilRules();
  showStep(1);
  openTermsModal();
})();

/* Homepage embedded section-view router */
(function () {
  if (!document.querySelector('.hero-container')) return;

  const VIEW_IDS = {
    about: 'view-about',
    faqs: 'view-faqs',
    'security-policy': 'view-security-policy',
    'data-privacy': 'view-data-privacy',
    'atm-advisory': 'view-atm-advisory',
    features: 'view-features',
    'find-us': 'view-find-us'
  };

  const hero = document.querySelector('.hero-container');
  const trust = document.querySelector('.trust-section');
  const views = document.querySelectorAll('.sv-view');

  function closeMobileMenuIfOpen() {
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    if (!mobileMenu || !mobileMenu.classList.contains('open')) return;
    mobileMenu.classList.remove('open');
    if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('active');
    if (hamburgerBtn) {
      hamburgerBtn.classList.remove('active');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
      hamburgerBtn.setAttribute('aria-label', 'Open menu');
    }
    mobileMenu.setAttribute('aria-hidden', 'true');
  }

  function setNavActive(viewKey) {
    document.querySelectorAll('[data-view]').forEach((el) => {
      const isActive = viewKey && el.getAttribute('data-view') === viewKey;
      el.classList.toggle('sv-nav-active', isActive);
      if (isActive) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });
  }

  function showHome() {
    document.body.classList.remove('sv-section-active');
    views.forEach((v) => {
      v.hidden = true;
    });
    if (hero) hero.removeAttribute('hidden');
    if (trust) trust.removeAttribute('hidden');
    setNavActive(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* Show one section view; hide hero */
  function showView(key) {
    const id = VIEW_IDS[key];
    if (!id) {
      showHome();
      return;
    }
    const section = document.getElementById(id);
    if (!section) {
      showHome();
      return;
    }

    document.body.classList.add('sv-section-active');
    views.forEach((v) => {
      v.hidden = true;
    });
    section.hidden = false;
    setNavActive(key);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const heading = section.querySelector('h1');
    if (heading) {
      try {
        heading.focus({ preventScroll: true });
      } catch (e) {
        heading.focus();
      }
    }
  }

  /* Sync visible section with URL hash */
  function focusContactPanel() {
    showView('find-us');
    const panel = document.getElementById('sv-contact-panel')
      || document.querySelector('.sv-contact-panel');
    const nameInput = document.getElementById('svContactName');
    const scrollTarget = panel || nameInput;
    if (scrollTarget) {
      var headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'), 10) || 64;
      var nav = document.querySelector('.sv-findus-mobile-nav');
      var navH = (nav && getComputedStyle(nav).display !== 'none') ? nav.offsetHeight + 8 : 0;
      var top = scrollTarget.getBoundingClientRect().top + window.pageYOffset - headerH - navH - 12;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
    if (nameInput) {
      setTimeout(function () {
        try { nameInput.focus({ preventScroll: false }); }
        catch (e) { nameInput.focus(); }
      }, 350);
    }
  }

  function applyHash() {
    const raw = (location.hash || '').replace(/^#/, '').toLowerCase();
    if (!raw || raw === 'home') {
      showHome();
      return;
    }
    if (raw === 'sv-contact-panel' || raw === 'svcontactname' || raw === 'svcontactform') {
      if (location.hash !== '#sv-contact-panel') {
        try { history.replaceState(null, '', '#sv-contact-panel'); } catch (e) {}
      }
      focusContactPanel();
      return;
    }
    if (VIEW_IDS[raw]) {
      showView(raw);
    } else {
      showHome();
    }
  }

  
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-view]');
    if (!target) return;
    const key = target.getAttribute('data-view');
    if (!key) return;

    if (key === 'home') {
      e.preventDefault();
      closeMobileMenuIfOpen();
      if (location.hash) {
        history.pushState(null, '', location.pathname + location.search);
      }
      showHome();
      return;
    }

    if (!VIEW_IDS[key]) return;
    e.preventDefault();
    closeMobileMenuIfOpen();
    const newHash = '#' + key;
    if (location.hash !== newHash) {
      history.pushState(null, '', newHash);
    }
    showView(key);
  });

  window.addEventListener('hashchange', applyHash);
  window.addEventListener('popstate', applyHash);

  
  const faqList = document.getElementById('svFaqList');
  if (faqList) {
    faqList.addEventListener('click', (e) => {
      const btn = e.target.closest('.sv-faq-q');
      if (!btn || !faqList.contains(btn)) return;
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      const panelId = btn.getAttribute('aria-controls');
      const panel = panelId ? document.getElementById(panelId) : null;

      faqList.querySelectorAll('.sv-faq-q').forEach((b) => {
        b.setAttribute('aria-expanded', 'false');
        const icon = b.querySelector('.sv-faq-icon');
        if (icon) icon.textContent = '+';
        const pid = b.getAttribute('aria-controls');
        const p = pid ? document.getElementById(pid) : null;
        if (p) p.hidden = true;
      });

      if (!expanded && panel) {
        btn.setAttribute('aria-expanded', 'true');
        panel.hidden = false;
        const icon = btn.querySelector('.sv-faq-icon');
        if (icon) icon.textContent = '\u2212';
      }
    });
  }

  
  const locatorForm = document.getElementById('svLocatorForm');
  const cityInput = document.getElementById('svCityInput');
  const typeSelect = document.getElementById('svTypeSelect');
  const directory = document.getElementById('svDirectory');
  const noResults = document.getElementById('svNoResults');
  const mapFrame = document.getElementById('svMapFrame');
  const clearBtn = document.getElementById('svClearFilters');
  const resultsCount = document.getElementById('svResultsCount');

  function updateMapFromCard(card) {
    if (!mapFrame || !card) return;
    const lat = parseFloat(card.getAttribute('data-lat'));
    const lon = parseFloat(card.getAttribute('data-lon'));
    if (isNaN(lat) || isNaN(lon)) return;
    const delta = 0.04;
    const bbox = [
      (lon - delta).toFixed(4),
      (lat - delta).toFixed(4),
      (lon + delta).toFixed(4),
      (lat + delta).toFixed(4)
    ].join('%2C');
    mapFrame.src =
      'https://www.openstreetmap.org/export/embed.html?bbox=' +
      bbox +
      '&layer=mapnik&marker=' +
      lat.toFixed(4) +
      '%2C' +
      lon.toFixed(4);
  }

  function setSelectedCard(card) {
    if (!directory) return;
    directory.querySelectorAll('.sv-loc-card').forEach(function (c) {
      c.classList.remove('sv-loc-selected');
    });
    if (card) card.classList.add('sv-loc-selected');
  }

  /* Find Us locator filter and map update */
  function filterLocations() {
    if (!directory) return;
    const cityQ = ((cityInput && cityInput.value) || '').trim().toLowerCase();
    const typeQ = ((typeSelect && typeSelect.value) || 'all').toLowerCase();
    const cards = directory.querySelectorAll('.sv-loc-card');
    let visible = 0;
    let firstVisible = null;
    cards.forEach(function (card) {
      const city = (card.getAttribute('data-city') || '').toLowerCase();
      const type = (card.getAttribute('data-type') || '').toLowerCase();
      const cityMatch =
        !cityQ ||
        city.indexOf(cityQ) !== -1 ||
        (card.textContent || '').toLowerCase().indexOf(cityQ) !== -1;
      const typeMatch = typeQ === 'all' || type === typeQ;
      const show = cityMatch && typeMatch;
      card.hidden = !show;
      if (show) {
        visible += 1;
        if (!firstVisible) firstVisible = card;
      }
    });
    if (noResults) noResults.hidden = visible > 0;
    if (resultsCount) {
      if (cityQ || typeQ !== 'all') {
        resultsCount.textContent = visible + ' result' + (visible === 1 ? '' : 's');
      } else {
        resultsCount.textContent = '';
      }
    }
    if (firstVisible) {
      updateMapFromCard(firstVisible);
      setSelectedCard(firstVisible);
    } else {
      setSelectedCard(null);
    }
  }

  if (locatorForm) {
    locatorForm.addEventListener('submit', function (e) {
      e.preventDefault();
      filterLocations();
    });
  }
  if (cityInput) {
    cityInput.addEventListener('input', function () {
      filterLocations();
    });
  }
  if (typeSelect) {
    typeSelect.addEventListener('change', function () {
      filterLocations();
    });
  }
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      if (cityInput) cityInput.value = '';
      if (typeSelect) typeSelect.value = 'all';
      filterLocations();
    });
  }
  if (directory) {
    directory.addEventListener('click', function (e) {
      const card = e.target.closest('.sv-loc-card');
      if (!card || card.hidden) return;
      setSelectedCard(card);
      updateMapFromCard(card);
      
      var mapWrap = document.querySelector('.sv-map-wrap');
      if (mapWrap) {
        if (typeof smoothScrollToEl === 'function') {
          smoothScrollToEl(mapWrap);
        } else {
          var headerOffset = 120;
          var top = mapWrap.getBoundingClientRect().top + window.pageYOffset - headerOffset;
          window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        }
      }
    });
  }


  
  function getFindUsScrollOffset() {
    var header = document.querySelector('.main-header');
    var headerH = header
      ? header.getBoundingClientRect().height
      : (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'), 10) || 64);
    var nav = document.querySelector('.sv-findus-mobile-nav');
    var navH = (nav && getComputedStyle(nav).display !== 'none') ? nav.offsetHeight + 8 : 0;
    return headerH + navH + 8;
  }

  function smoothScrollToEl(el) {
    if (!el) return;
    var top = el.getBoundingClientRect().top + window.pageYOffset - getFindUsScrollOffset();
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  document.querySelectorAll('.sv-findus-mobile-link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var tab = link.getAttribute('data-findus-tab');
      document.querySelectorAll('.sv-findus-mobile-link').forEach(function (l) {
        l.classList.toggle('is-active', l === link);
      });
      if (tab === 'contact') {
        var target = document.querySelector('.sv-contact-heading')
          || document.getElementById('svContactForm')
          || document.querySelector('.sv-contact-panel');
        smoothScrollToEl(target);
      } else {
        var heading = document.getElementById('findus-heading')
          || document.querySelector('.sv-findus-left');
        smoothScrollToEl(heading);
      }
    });
  });

  
  /* Contact form live validation */
  const contactForm = document.getElementById('svContactForm');
  if (contactForm) {
    const nameEl = document.getElementById('svContactName');
    const emailEl = document.getElementById('svContactEmail');
    const phoneEl = document.getElementById('svContactPhone');
    const msgEl = document.getElementById('svContactMessage');
    const subjectEl = document.getElementById('svContactSubject');
    const concernEl = document.getElementById('svContactConcern');
    const otherWrap = document.getElementById('svOtherSubjectWrap');
    const otherEl = document.getElementById('svContactSubjectOther');
    const successEl = document.getElementById('svContactSuccess');

    function setErr(id, msg) {
      const err = document.getElementById(id);
      const inputId = id.replace('Error', '');
      const input = document.getElementById(inputId);
      if (err) {
        err.textContent = msg || '';
        err.hidden = !msg;
      }
      if (input) input.classList.toggle('error', !!msg);
      
      if (inputId === 'svContactPhone') {
        const row = input && input.closest('.sv-phone-row');
        if (row) row.classList.toggle('sv-phone-error', !!msg);
      }
    }

    function validateName() {
      const v = ((nameEl && nameEl.value) || '').trim();
      if (!v) {
        setErr('svContactNameError', 'Name is required');
        return false;
      }
      setErr('svContactNameError', '');
      return true;
    }

    function validateEmail() {
      const v = ((emailEl && emailEl.value) || '').trim();
      if (!v) {
        setErr('svContactEmailError', 'Email is required');
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        setErr('svContactEmailError', 'Enter a valid email address');
        return false;
      }
      setErr('svContactEmailError', '');
      return true;
    }

    function validatePhone() {
      const v = ((phoneEl && phoneEl.value) || '').trim();
      if (!v) {
        setErr('svContactPhoneError', 'Contact number is required');
        return false;
      }
      if (!/^9\d{9}$/.test(v)) {
        setErr('svContactPhoneError', 'Enter a valid contact number');
        return false;
      }
      setErr('svContactPhoneError', '');
      return true;
    }

    function validateMessage() {
      const v = ((msgEl && msgEl.value) || '').trim();
      if (!v) {
        setErr('svContactMessageError', 'Message is required');
        return false;
      }
      setErr('svContactMessageError', '');
      return true;
    }

    function validateSubject() {
      const v = ((subjectEl && subjectEl.value) || '').trim();
      if (!v) {
        setErr('svContactSubjectError', 'Subject type is required');
        return false;
      }
      setErr('svContactSubjectError', '');
      return true;
    }

    function validateConcern() {
      const v = ((concernEl && concernEl.value) || '').trim();
      if (!v) {
        setErr('svContactConcernError', 'Concern type is required');
        return false;
      }
      setErr('svContactConcernError', '');
      return true;
    }

    function validateOther() {
      if (!subjectEl || subjectEl.value !== 'other') {
        setErr('svContactSubjectOtherError', '');
        return true;
      }
      const v = ((otherEl && otherEl.value) || '').trim();
      if (!v) {
        setErr('svContactSubjectOtherError', 'Please specify the subject');
        return false;
      }
      setErr('svContactSubjectOtherError', '');
      return true;
    }

    function syncOtherField() {
      if (!otherWrap || !subjectEl) return;
      const show = subjectEl.value === 'other';
      otherWrap.hidden = !show;
      if (!show) {
        if (otherEl) otherEl.value = '';
        setErr('svContactSubjectOtherError', '');
      }
    }

    function validateAll() {
      var a = validateName();
      var b = validateEmail();
      var c = validatePhone();
      var d = validateSubject();
      var e = validateConcern();
      var f = validateOther();
      var g = validateMessage();
      return a && b && c && d && e && f && g;
    }

    
    if (nameEl) {
      nameEl.addEventListener('blur', validateName);
      nameEl.addEventListener('input', function () {
        if (nameEl.classList.contains('error') || (document.getElementById('svContactNameError') && !document.getElementById('svContactNameError').hidden)) {
          validateName();
        }
      });
    }
    if (emailEl) {
      emailEl.addEventListener('blur', validateEmail);
      emailEl.addEventListener('input', function () {
        if (emailEl.classList.contains('error')) validateEmail();
      });
    }
    if (phoneEl) {
      phoneEl.addEventListener('blur', validatePhone);
      phoneEl.addEventListener('input', function () {
        
        phoneEl.value = phoneEl.value.replace(/\D/g, '').slice(0, 10);
        if (phoneEl.classList.contains('error')) validatePhone();
      });
    }
    if (msgEl) {
      msgEl.addEventListener('blur', validateMessage);
      msgEl.addEventListener('input', function () {
        if (msgEl.classList.contains('error')) validateMessage();
      });
    }
    if (subjectEl) {
      subjectEl.addEventListener('change', function () {
        syncOtherField();
        validateSubject();
        if (subjectEl.value === 'other' && otherEl) otherEl.focus();
      });
      subjectEl.addEventListener('blur', validateSubject);
    }
    if (concernEl) {
      concernEl.addEventListener('change', validateConcern);
      concernEl.addEventListener('blur', validateConcern);
    }
    if (otherEl) {
      otherEl.addEventListener('blur', validateOther);
      otherEl.addEventListener('input', function () {
        if (otherEl.classList.contains('error')) validateOther();
      });
    }

    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (successEl) successEl.hidden = true;
      if (!validateAll()) {
        const firstErr = contactForm.querySelector('.field-error:not([hidden])');
        if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (successEl) {
        successEl.hidden = false;
        successEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      contactForm.reset();
      syncOtherField();
      ['svContactName', 'svContactEmail', 'svContactPhone', 'svContactMessage', 'svContactSubject', 'svContactConcern', 'svContactSubjectOther'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('error');
      });
      ['svContactNameError', 'svContactEmailError', 'svContactPhoneError', 'svContactMessageError', 'svContactSubjectError', 'svContactConcernError', 'svContactSubjectOtherError'].forEach(function (id) {
        setErr(id, '');
      });
    });

    syncOtherField();
  }

  
  document.querySelectorAll('a.footer-care-email').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var href = link.getAttribute('href') || '';
      if (href.charAt(0) === '#' || href.indexOf('homepage.html#') !== -1) {
        if (document.querySelector('.hero-container')) {
          e.preventDefault();
          try { history.pushState(null, '', '#sv-contact-panel'); } catch (err) {}
          focusContactPanel();
        }
      }
    });
  });

  applyHash();
})();


/* Sub-nav Login/Register visibility when a section is open */
(function () {
  
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('a.footer-care-email').forEach(function (link) {
      link.addEventListener('click', function (e) {
        if (document.querySelector('.hero-container')) return;
        var href = link.getAttribute('href') || '';
        if (href.indexOf('homepage.html') !== -1 && href.indexOf('#') === -1) {
          e.preventDefault();
          window.location.href = 'homepage.html#sv-contact-panel';
        }
      });
    });
  });
})();

var actions = document.getElementById('svSubnavActions');
  if (!actions) return;

  function syncSubnavActions() {
    var active = document.body.classList.contains('sv-section-active');
    actions.hidden = !active;
  }

  var obs = new MutationObserver(syncSubnavActions);
  obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  syncSubnavActions();
})();

/* Terms page scroll-spy and scroll-to-top (all pages) */
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    /* Dynamic back link target */
    const backLink = document.getElementById('tc-back-link');
    if (backLink) {
      let from = null;
      try {
        const params = new URLSearchParams(window.location.search);
        from = params.get('from');
        if (from === 'login' || from === 'registration') {
          sessionStorage.setItem('tcFrom', from);
        } else {
          from = sessionStorage.getItem('tcFrom');
        }
      } catch (e) {
        from = null;
      }
      if (from === 'registration') {
        backLink.href = 'registration.html';
        const textEl = backLink.querySelector('.tc-back-text');
        if (textEl) textEl.textContent = 'Back to Registration';
        else backLink.textContent = 'Back to Registration';
      } else {
        backLink.href = 'login.html';
        const textEl = backLink.querySelector('.tc-back-text');
        if (textEl) textEl.textContent = 'Back to Log In';
        else backLink.textContent = 'Back to Log In';
      }

      
      backLink.addEventListener('click', (e) => {
        if (window.opener && !window.opener.closed) {
          e.preventDefault();
          try {
            window.opener.focus();
          } catch (err) {  }
          try {
            window.close();
          } catch (err) {
            window.location.href = backLink.getAttribute('href') || 'login.html';
          }
          
          setTimeout(function () {
            if (!window.closed) {
              window.location.href = backLink.getAttribute('href') || 'login.html';
            }
          }, 150);
        }
      });
    }

    
    /* Sidebar TOC scroll-spy */
    const tcNav = document.getElementById('tcNav');
    if (tcNav) {
      const links = Array.from(tcNav.querySelectorAll('.tc-nav-link'));
      const sections = links
        .map((a) => {
          const id = a.getAttribute('href');
          return id ? document.querySelector(id) : null;
        })
        .filter(Boolean);

      function setActive(index) {
        links.forEach((link, i) => {
          const on = i === index;
          link.classList.toggle('active', on);
          if (on) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        });
      }

      let spyTicking = false;
      let clickLockUntil = 0;

      function updateSpy() {
        spyTicking = false;
        if (!sections.length) return;
        
        if (Date.now() < clickLockUntil) return;
        const offset = 100;
        let current = 0;
        for (let i = 0; i < sections.length; i++) {
          const top = sections[i].getBoundingClientRect().top;
          if (top - offset <= 0) current = i;
        }
        setActive(current);
      }

      window.addEventListener(
        'scroll',
        () => {
          if (!spyTicking) {
            spyTicking = true;
            requestAnimationFrame(updateSpy);
          }
        },
        { passive: true }
      );
      updateSpy();

      links.forEach((link, index) => {
        link.addEventListener('click', (e) => {
          const href = link.getAttribute('href');
          if (!href || href.charAt(0) !== '#') return;
          const target = document.querySelector(href);
          if (!target) return;
          e.preventDefault();
          
          setActive(index);
          clickLockUntil = Date.now() + 700;
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });

    
    const tocSelect = document.getElementById('tcTocSelect');
    if (tocSelect) {
      tocSelect.addEventListener('change', () => {
        const href = tocSelect.value;
        if (!href) return;
        const target = document.querySelector(href);
        if (!target) return;
        const index = links.findIndex((a) => a.getAttribute('href') === href);
        if (index >= 0) setActive(index);
        clickLockUntil = Date.now() + 700;
        const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'), 10) || 64;
        const sidebar = document.querySelector('.tc-sidebar');
        const tocH = sidebar ? sidebar.offsetHeight : 72;
        const top = target.getBoundingClientRect().top + window.pageYOffset - headerH - tocH - 8;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      });

      
      const origSetActive = setActive;
      setActive = function (index) {
        origSetActive(index);
        if (links[index]) {
          const href = links[index].getAttribute('href');
          if (href && tocSelect.value !== href) tocSelect.value = href;
        }
      };
    }

    }

    
    /* Scroll-to-top button visibility */
    const scrollBtn = document.getElementById('scrollTopBtn');
    if (scrollBtn) {
      let scrollTicking = false;

      function pageCanScroll() {
        return document.documentElement.scrollHeight > window.innerHeight + 20;
      }

      function updateScrollBtn() {
        scrollTicking = false;
        if (!pageCanScroll()) {
          scrollBtn.classList.remove('is-visible');
          scrollBtn.hidden = true;
          return;
        }
        scrollBtn.hidden = false;
        if (window.scrollY > 300) {
          scrollBtn.classList.add('is-visible');
        } else {
          scrollBtn.classList.remove('is-visible');
        }
      }

      window.addEventListener(
        'scroll',
        () => {
          if (!scrollTicking) {
            scrollTicking = true;
            requestAnimationFrame(updateScrollBtn);
          }
        },
        { passive: true }
      );
      window.addEventListener('resize', () => {
        requestAnimationFrame(updateScrollBtn);
      });
      updateScrollBtn();

      scrollBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  });
})();