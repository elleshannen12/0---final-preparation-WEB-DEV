


/* ============================================================
   admin-script.js – Merged scripts for LANDBANK iAccess Admin Portal
   base.js (global) + page-guarded IIFEs
   ============================================================ */

/* ===== base.js ===== */
/* ============================================================
   base.js – Shared chrome, helpers, localStorage utilities
   LANDBANK iAccess Admin Portal
   ============================================================ */

(function () {
  "use strict";

  function escHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const LS_PREFIX = "landbank_admin_";

  /* ---------- localStorage helpers ---------- */
  function lsGet(key, fallback) {
    try {
      const raw = localStorage.getItem(LS_PREFIX + key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function lsSet(key, value) {
    try {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      /* quota or private mode */
    }
  }

  function lsRemove(key) {
    try {
      localStorage.removeItem(LS_PREFIX + key);
    } catch (e) {
      /* ignore */
    }
  }

  /* Expose helpers globally for page scripts */
  window.LB = window.LB || {};
  window.LB.lsGet = lsGet;
  window.LB.lsSet = lsSet;
  window.LB.lsRemove = lsRemove;
  window.LB.LS_PREFIX = LS_PREFIX;

  /* ---------- Theme ---------- */
  function applyTheme() {
    const saved = lsGet("theme", "light");
    let theme = saved;
    if (saved === "system") {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    document.documentElement.setAttribute("data-theme", theme);
  }

  applyTheme();

  window.LB.applyTheme = applyTheme;

  /* ---------- Density ---------- */
  function applyDensity() {
    const density = lsGet("density", "comfortable");
    document.documentElement.setAttribute("data-density", density);
  }

  applyDensity();
  window.LB.applyDensity = applyDensity;

  /* ---------- Maintenance banner ---------- */
  function formatMaintDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      return iso || "—";
    }
  }

  function isMaintenanceCurrentlyActive(maint) {
    if (!maint || !maint.active) return false;
    const now = Date.now();
    if (maint.start) {
      const s = new Date(maint.start).getTime();
      if (!isNaN(s) && now < s) return false;
    }
    if (maint.end) {
      const e = new Date(maint.end).getTime();
      if (!isNaN(e) && now > e) return false;
    }
    return true;
  }

  function checkMaintenance() {
    const maint = lsGet("maintenance", null);
    const banner = document.getElementById("maintenanceBanner");
    if (!banner) return;
    if (isMaintenanceCurrentlyActive(maint)) {
      banner.classList.add("visible");
      const endEl = document.getElementById("maintenanceEndTime");
      if (endEl) {
        const from = maint.start ? formatMaintDate(maint.start) : "—";
        const to = maint.end ? formatMaintDate(maint.end) : "—";
        endEl.textContent = "from " + from + " to " + to;
      }
    } else {
      banner.classList.remove("visible");
    }
  }

  checkMaintenance();
  window.LB.checkMaintenance = checkMaintenance;
  window.LB.formatMaintDate = formatMaintDate;
  window.LB.isMaintenanceCurrentlyActive = isMaintenanceCurrentlyActive;

  /* ---------- Outage banner ---------- */
  /* Driven by backend gateway status in production; demo simulate removed */
  function checkOutage() {
    const banner = document.getElementById("outageBanner");
    if (!banner) return;
    banner.classList.remove("visible");
  }

  checkOutage();
  window.LB.checkOutage = checkOutage;

  /* ---------- Sidebar collapse ---------- */
  function initSidebar() {
    const sidebar = document.getElementById("sidebar");
    const collapseBtn = document.getElementById("sidebarCollapseBtn");
    const menuBtn = document.getElementById("headerMenuBtn");
    const overlay = document.getElementById("sidebarOverlay");

    if (!sidebar) return;

    const collapsed = lsGet("sidebarCollapsed", false);
    if (collapsed) {
      sidebar.classList.add("collapsed");
      if (collapseBtn) {
        collapseBtn.setAttribute("aria-expanded", "false");
        collapseBtn.setAttribute("aria-label", "Expand sidebar");
      }
    }

    if (collapseBtn) {
      collapseBtn.addEventListener("click", function () {
        const isCollapsed = sidebar.classList.toggle("collapsed");
        lsSet("sidebarCollapsed", isCollapsed);
        collapseBtn.setAttribute("aria-expanded", String(!isCollapsed));
        collapseBtn.setAttribute("aria-label", isCollapsed ? "Expand sidebar" : "Collapse sidebar");
      });
    }

    if (menuBtn) {
      menuBtn.addEventListener("click", function () {
        sidebar.classList.toggle("mobile-open");
        if (overlay) {
          overlay.classList.toggle("visible");
        }
      });
    }

    if (overlay) {
      overlay.addEventListener("click", function () {
        sidebar.classList.remove("mobile-open");
        overlay.classList.remove("visible");
      });
    }

    /* Mark active link */
    const path = window.location.pathname.split("/").pop() || "admin-dashboard.html";
    const links = sidebar.querySelectorAll(".nav-link");
    links.forEach(function (link) {
      const href = link.getAttribute("href");
      if (href && href.indexOf(path) !== -1) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      }
    });
  }

  /* ---------- Profile dropdown ---------- */
  function initProfileMenu() {
    const btn = document.getElementById("profileBtn");
    const menu = document.getElementById("profileMenu");
    if (!btn || !menu) return;

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const open = menu.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
      /* Close notif if open */
      const notifMenu = document.getElementById("notifMenu");
      if (notifMenu) notifMenu.classList.remove("open");
    });

    document.addEventListener("click", function (e) {
      if (!menu.contains(e.target) && e.target !== btn) {
        menu.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      }
    });

    /* My Profile – navigate to profile page */
    const profileItems = menu.querySelectorAll(".dropdown-item");
    profileItems.forEach(function (item) {
      if (item.textContent.trim() === "My Profile") {
        item.addEventListener("click", function () {
          window.location.href = "admin-profile.html";
        });
      }
    });

    /* Sign out */
    const signOutBtn = document.getElementById("signOutBtn");
    if (signOutBtn) {
      signOutBtn.addEventListener("click", function () {
        window.LB.showToast("Signed out", "info");
        menu.classList.remove("open");
        setTimeout(function () {
          window.location.href = "homepage.html";
        }, 400);
      });
    }

  }

  /* ---------- Notification panel ---------- */
  function initNotifications() {
    const btn = document.getElementById("notifBtn");
    const menu = document.getElementById("notifMenu");
    const badge = document.getElementById("notifBadge");
    const list = document.getElementById("notifList");
    if (!btn || !menu) return;

    function renderNotifications() {
      const notifs = lsGet("notifications", []);
      const unread = notifs.filter(function (n) {
        return !n.read;
      }).length;

      if (badge) {
        if (unread > 0) {
          badge.textContent = String(unread);
          badge.classList.remove("hidden");
        } else {
          badge.classList.add("hidden");
        }
      }

      if (!list) return;
      list.innerHTML = "";

      if (notifs.length === 0) {
        const empty = document.createElement("div");
        empty.className = "notif-item";
        empty.innerHTML =
          '<div class="notif-body"><div class="notif-text text-muted">No notifications</div></div>';
        list.appendChild(empty);
        return;
      }

      notifs.forEach(function (n) {
        const item = document.createElement("div");
        item.className = "notif-item" + (n.read ? "" : " unread");
        item.setAttribute("data-id", n.id);
        item.innerHTML =
          '<div class="notif-dot"></div>' +
          '<div class="notif-body">' +
          '<div class="notif-text">' +
          n.text +
          "</div>" +
          '<div class="notif-time">' +
          n.time +
          "</div>" +
          "</div>";
        item.addEventListener("click", function () {
          markRead(n.id);
        });
        list.appendChild(item);
      });
    }

    function markRead(id) {
      const notifs = lsGet("notifications", []);
      const updated = notifs.map(function (n) {
        if (n.id === id) {
          return Object.assign({}, n, { read: true });
        }
        return n;
      });
      lsSet("notifications", updated);
      renderNotifications();
    }

    const markAllBtn = document.getElementById("markAllReadBtn");
    if (markAllBtn) {
      markAllBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        const notifs = lsGet("notifications", []);
        const updated = notifs.map(function (n) {
          return Object.assign({}, n, { read: true });
        });
        lsSet("notifications", updated);
        renderNotifications();
      });
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const open = menu.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
      const profileMenu = document.getElementById("profileMenu");
      if (profileMenu) profileMenu.classList.remove("open");
      if (open) renderNotifications();
    });

    document.addEventListener("click", function (e) {
      if (!menu.contains(e.target) && e.target !== btn) {
        menu.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      }
    });

    renderNotifications();
    window.LB.renderNotifications = renderNotifications;
  }

  /* ---------- Toast ---------- */
  function showToast(message, type, duration) {
    type = type || "success";
    if (type === "success") duration = duration || 5000;
    else if (type === "warning") duration = duration || 8000;
    else if (type === "error") duration = duration || 0;
    else duration = duration || 5000;

    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      container.setAttribute("aria-live", "polite");
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "toast toast-" + type;
    toast.setAttribute("role", "status");

    let iconSvg = "";
    if (type === "success") {
      iconSvg =
        '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="#2e7d32" stroke-width="1.5"/><path d="M6 10l3 3 5-5" stroke="#2e7d32" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    } else if (type === "warning") {
      iconSvg =
        '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 3l8 14H2L10 3z" stroke="#f9a825" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 9v3" stroke="#f9a825" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="14.5" r="0.8" fill="#f9a825"/></svg>';
    } else if (type === "error") {
      iconSvg =
        '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="#c62828" stroke-width="1.5"/><path d="M7 7l6 6M13 7l-6 6" stroke="#c62828" stroke-width="1.5" stroke-linecap="round"/></svg>';
    } else {
      iconSvg =
        '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="#1565c0" stroke-width="1.5"/><path d="M10 6v5" stroke="#1565c0" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="14" r="0.8" fill="#1565c0"/></svg>';
    }

    toast.innerHTML =
      '<div class="toast-icon">' +
      iconSvg +
      '</div><div class="toast-body">' +
      message +
      '</div><button type="button" class="toast-close" aria-label="Dismiss">' +
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
      "</button>";

    container.appendChild(toast);

    const closeBtn = toast.querySelector(".toast-close");
    function removeToast() {
      toast.classList.add("removing");
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    }

    closeBtn.addEventListener("click", removeToast);

    if (duration > 0) {
      setTimeout(removeToast, duration);
    }
  }

  window.LB.showToast = showToast;

  /* ---------- Modal helpers ---------- */
  function openModal(modalId, triggerBtn) {
    const backdrop = document.getElementById(modalId);
    if (!backdrop) return;
    backdrop.classList.add("open");
    backdrop.setAttribute("aria-hidden", "false");

    const modal = backdrop.querySelector(".modal");
    if (modal) {
      const focusable = modal.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable) focusable.focus();
    }

    /* Store trigger for focus return */
    backdrop._triggerBtn = triggerBtn || null;

    /* Trap focus */
    function trapFocus(e) {
      if (e.key !== "Tab") return;
      const focusableEls = modal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusableEls.length === 0) return;
      const first = focusableEls[0];
      const last = focusableEls[focusableEls.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    backdrop._trapHandler = trapFocus;
    document.addEventListener("keydown", trapFocus);

    /* Esc to close */
    function escHandler(e) {
      if (e.key === "Escape") {
        closeModal(modalId);
      }
    }
    backdrop._escHandler = escHandler;
    document.addEventListener("keydown", escHandler);
  }

  function closeModal(modalId) {
    const backdrop = document.getElementById(modalId);
    if (!backdrop) return;
    backdrop.classList.remove("open");
    backdrop.setAttribute("aria-hidden", "true");

    if (backdrop._trapHandler) {
      document.removeEventListener("keydown", backdrop._trapHandler);
    }
    if (backdrop._escHandler) {
      document.removeEventListener("keydown", backdrop._escHandler);
    }

    if (backdrop._triggerBtn) {
      backdrop._triggerBtn.focus();
      backdrop._triggerBtn = null;
    }
  }

  window.LB.openModal = openModal;
  window.LB.closeModal = closeModal;

  /* Wire common modal close patterns */
  function initModals() {
    document.querySelectorAll(".modal-backdrop").forEach(function (backdrop) {
      backdrop.addEventListener("click", function (e) {
        if (e.target === backdrop) {
          closeModal(backdrop.id);
        }
      });

      const closeBtns = backdrop.querySelectorAll("[data-modal-close]");
      closeBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
          closeModal(backdrop.id);
        });
      });
    });
  }

  /* ---------- Activity log helper ---------- */
  function addActivity(actor, action, target) {
    const logs = lsGet("activityLog", []);
    const entry = {
      id: "ACT-" + Date.now(),
      actor: actor || "System Administrator",
      action: action,
      target: target || "",
      time: new Date().toISOString(),
    };
    logs.unshift(entry);
    if (logs.length > 50) logs.length = 50;
    lsSet("activityLog", logs);
    if (typeof window.LB.onActivityAdded === "function") {
      window.LB.onActivityAdded(entry);
    }
  }

  window.LB.addActivity = addActivity;

  /* ---------- Relative time ---------- */
  function relativeTime(iso) {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    if (diff < 604800) return Math.floor(diff / 86400) + "d ago";
    return new Date(iso).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
    });
  }

  window.LB.relativeTime = relativeTime;

  /* ---------- Format currency ---------- */
  function formatPHP(amount) {
    const n = Number(amount);
    if (isNaN(n)) return "₱0.00";
    return (
      "₱" +
      n.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  window.LB.formatPHP = formatPHP;

  /* ---------- Init on DOM ready ---------- */
  /* Apply saved profile name/avatar to header */
  function applyHeaderProfile() {
    const profile = lsGet("adminProfile", null);
    if (!profile) return;
    const name = (profile.firstName || "") + " " + (profile.lastName || "");
    const init =
      ((profile.firstName || "S").charAt(0) + (profile.lastName || "A").charAt(0)).toUpperCase();
    const avatar = document.querySelector(".profile-avatar");
    const nameEl = document.querySelector(".profile-name");
    if (avatar) avatar.textContent = init;
    if (nameEl && name.trim()) nameEl.textContent = name.trim();
  }

  /* ---------- Password visibility toggles ---------- */
  function initPasswordToggles() {
    document.querySelectorAll(".password-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const wrap = btn.closest(".password-wrap");
        if (!wrap) return;
        const input = wrap.querySelector("input");
        if (!input) return;
        const icon = btn.querySelector(".eye-icon");
        const isHidden = input.type === "password";
        input.type = isHidden ? "text" : "password";
        if (icon) {
          icon.src = isHidden ? "images/admin-eye-on.png" : "images/admin-eye-off.png";
        }
        btn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
      });
    });
  }

  /* ---------- Cap all date inputs to today (current year) ---------- */
  function setDateInputMax() {
    const yyyy = new Date().getFullYear();
    const maxDate = yyyy + "-12-31";
    document.querySelectorAll('input[type="date"]').forEach(function (input) {
      input.setAttribute("max", maxDate);
    });
  }


  /* ---------- Global header search ---------- */
  function initGlobalSearch() {
    const input = document.getElementById("globalSearch");
    const results = document.getElementById("globalSearchResults");
    if (!input || !results) return;

    let debounceTimer = null;
    let activeIndex = -1;

    function closeResults() {
      results.classList.add("hidden");
      results.innerHTML = "";
      activeIndex = -1;
    }

    function openResults() {
      results.classList.remove("hidden");
    }

    function highlight(text, q) {
      if (!q) return text;
      try {
        const re = new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
        return String(text).replace(re, "<mark>$1</mark>");
      } catch (e) {
        return text;
      }
    }

    function search(query) {
      const q = query.trim().toLowerCase();
      if (q.length < 2) {
        closeResults();
        return;
      }

      const users = lsGet("users", []);
      const transactions = lsGet("transactions", []);
      const auditLogs = lsGet("auditLogs", []);
      const activityLog = lsGet("activityLog", []);

      const userHits = users
        .filter(function (u) {
          const hay = [u.name, u.account, u.mobile, u.email, u.id].join(" ").toLowerCase();
          return hay.indexOf(q) !== -1;
        })
        .slice(0, 5)
        .map(function (u) {
          return {
            type: "user",
            id: u.id,
            title: u.name,
            meta: u.account + " · " + (u.status || ""),
            href: "admin-users.html",
            icon: (u.name || "U").charAt(0).toUpperCase(),
          };
        });

      const txHits = transactions
        .filter(function (t) {
          const hay = [t.id, t.description, t.user, t.account, t.type, t.status, t.rail].join(" ").toLowerCase();
          return hay.indexOf(q) !== -1;
        })
        .slice(0, 6)
        .map(function (t) {
          return {
            type: "transaction",
            id: t.id,
            title: t.description || t.id,
            meta: t.id + " · " + (t.user || "") + " · " + (t.status || ""),
            href: "admin-transactions.html",
            icon: "₱",
          };
        });

      const logHits = []
        .concat(auditLogs || [])
        .concat(activityLog || [])
        .filter(function (l) {
          const hay = [l.action, l.admin || l.actor, l.module, l.target, l.id].join(" ").toLowerCase();
          return hay.indexOf(q) !== -1;
        })
        .slice(0, 5)
        .map(function (l) {
          return {
            type: "log",
            id: l.id,
            title: l.action || "Activity",
            meta: (l.admin || l.actor || "") + (l.module ? " · " + l.module : "") + (l.target && l.target !== "—" ? " · " + l.target : ""),
            href: "admin-security.html",
            icon: "📋",
          };
        });

      const items = userHits.concat(txHits).concat(logHits);
      render(items, q);
    }

    function render(items, q) {
      results.innerHTML = "";
      if (items.length === 0) {
        results.innerHTML = '<div class="gs-empty">No results for “' + escHtml(q) + '”</div>';
        openResults();
        return;
      }

      let html = "";
      let lastType = null;
      const labels = { user: "Accounts / Users", transaction: "Transactions", log: "Logs" };

      items.forEach(function (item, idx) {
        if (item.type !== lastType) {
          html += '<div class="gs-section">' + (labels[item.type] || item.type) + "</div>";
          lastType = item.type;
        }
        html +=
          '<button type="button" class="gs-item" role="option" data-index="' + idx +
          '" data-href="' + item.href + '" data-id="' + (item.id || "") + '">' +
          '<span class="gs-item-icon">' + item.icon + "</span>" +
          '<span class="gs-item-body">' +
          '<div class="gs-item-title">' + highlight(item.title, q) + "</div>" +
          '<div class="gs-item-meta">' + highlight(item.meta, q) + "</div>" +
          "</span></button>";
      });

      html += '<div class="gs-footer">Press Enter to open · Esc to close</div>';
      results.innerHTML = html;
      openResults();
      activeIndex = -1;

      results.querySelectorAll(".gs-item").forEach(function (btn) {
        btn.addEventListener("click", function () {
          navigate(btn.getAttribute("data-href"), btn.getAttribute("data-id"));
        });
      });
    }

    function navigate(href, id) {
      closeResults();
      if (!href) return;
      if (id && href.indexOf("transactions") !== -1) {
        window.location.href = href + (href.indexOf("?") === -1 ? "?" : "&") + "q=" + encodeURIComponent(id);
      } else if (id && href.indexOf("users") !== -1) {
        window.location.href = href + (href.indexOf("?") === -1 ? "?" : "&") + "q=" + encodeURIComponent(id);
      } else {
        window.location.href = href;
      }
    }

    function setActive(idx) {
      const buttons = results.querySelectorAll(".gs-item");
      buttons.forEach(function (b) { b.classList.remove("active"); });
      if (idx >= 0 && idx < buttons.length) {
        buttons[idx].classList.add("active");
        buttons[idx].scrollIntoView({ block: "nearest" });
        activeIndex = idx;
      }
    }

    input.addEventListener("input", function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () { search(input.value); }, 220);
    });

    input.addEventListener("keydown", function (e) {
      if (results.classList.contains("hidden")) {
        if (e.key === "Enter" && input.value.trim().length >= 2) search(input.value);
        return;
      }
      const buttons = results.querySelectorAll(".gs-item");
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive(Math.min(activeIndex + 1, buttons.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive(Math.max(activeIndex - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0 && buttons[activeIndex]) buttons[activeIndex].click();
        else if (buttons.length === 1) buttons[0].click();
      } else if (e.key === "Escape") {
        closeResults();
        input.blur();
      }
    });

    input.addEventListener("focus", function () {
      if (input.value.trim().length >= 2) search(input.value);
    });

    document.addEventListener("click", function (e) {
      if (!input.contains(e.target) && !results.contains(e.target)) closeResults();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initSidebar();
    initProfileMenu();
    initNotifications();
    initModals();
    checkMaintenance();
    checkOutage();
    applyHeaderProfile();
    initPasswordToggles();
    setDateInputMax();
  });
})();

/* ===== admin-dashboard.js ===== */

/* ============================================================
   admin-dashboard.js – Dashboard logic and mock data
   ============================================================ */

(function () {
  "use strict";

  if (!document.body.classList.contains("page-admin-dashboard")) return;

  const LS = window.LB;

  /* ========================================================
     MOCK DATA SEED
     ======================================================== */
  const FILIPINO_FIRST = [
    "Juan", "Maria", "Jose", "Ana", "Pedro", "Rosa", "Carlos", "Elena",
    "Miguel", "Sofia", "Antonio", "Isabel", "Rafael", "Carmen", "Luis",
    "Patricia", "Fernando", "Gloria", "Ricardo", "Teresa", "Andres",
    "Luz", "Manuel", "Angela", "Diego", "Cristina", "Francisco", "Beatriz",
  ];
  const FILIPINO_LAST = [
    "Santos", "Reyes", "Cruz", "Bautista", "Garcia", "Mendoza", "Torres",
    "Flores", "Villanueva", "Ramos", "Gonzales", "Lopez", "Dela Cruz",
    "Aquino", "Castillo", "Navarro", "Perez", "Domingo", "Santiago", "Rivera",
  ];
  const CHANNELS = ["Mobile", "Web", "QR", "Branch"];
  const TYPES = ["Transfer", "Bills", "QR Ph", "Cash In"];
  const STATUSES = ["Success", "Pending", "Failed", "Flagged"];
  const RAILS = ["InstaPay", "PESONet", "Intra-bank", "Biller"];
  const ERROR_CODES = {
    "RJCT-AC04": "Receiving account closed",
    "RJCT-AC06": "Account blocked",
    "RJCT-AM04": "Insufficient funds",
    "RJCT-BE01": "Invalid beneficiary details",
    "RJCT-TM01": "Timeout at receiving bank",
    "RJCT-FF01": "Invalid file format",
  };

  function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function randomAmount() {
    const ranges = [50, 200, 500, 1000, 5000, 15000, 50000, 100000, 150000];
    const base = randomItem(ranges);
    return Math.round((base + Math.random() * base * 0.3) * 100) / 100;
  }

  function maskAccount() {
    const n = String(Math.floor(1000000000 + Math.random() * 9000000000));
    return n.slice(0, 4) + "****" + n.slice(-2);
  }

  function randomName() {
    return randomItem(FILIPINO_FIRST) + " " + randomItem(FILIPINO_LAST);
  }

  function daysAgo(d) {
    const dt = new Date();
    dt.setDate(dt.getDate() - d);
    dt.setHours(Math.floor(Math.random() * 14) + 6);
    dt.setMinutes(Math.floor(Math.random() * 60));
    dt.setSeconds(Math.floor(Math.random() * 60));
    return dt.toISOString();
  }

  function seedTransactions() {
    const existing = LS.lsGet("transactions", null);
    if (existing && existing.length >= 60) return existing;

    const txs = [];
    for (let i = 0; i < 72; i++) {
      const type = randomItem(TYPES);
      const status = i < 4 ? "Flagged" : i < 10 ? "Failed" : i < 16 ? "Pending" : "Success";
      const isCredit = type === "Cash In" || (type === "Transfer" && Math.random() > 0.55);
      const amount = randomAmount();
      const dayOffset = Math.floor(Math.random() * 30);
      const rail = type === "Bills" ? "Biller" : randomItem(RAILS.filter(function (r) { return r !== "Biller"; }));
      const errCode = status === "Failed" ? randomItem(Object.keys(ERROR_CODES)) : null;

      txs.push({
        id: "TXN-" + String(100000 + i),
        description: type === "Transfer"
          ? (isCredit ? "Incoming transfer" : "Outgoing transfer")
          : type === "Bills"
          ? "Bill payment – " + randomItem(["Meralco", "PLDT", "Globe", "Maynilad", "SSS"])
          : type === "QR Ph"
          ? "QR Ph payment"
          : "Cash-in via " + randomItem(["GCash", "Maya", "Branch"]),
        direction: isCredit ? "credit" : "debit",
        user: randomName(),
        account: maskAccount(),
        channel: randomItem(CHANNELS),
        type: type,
        date: daysAgo(dayOffset),
        amount: amount,
        status: status,
        rail: rail,
        fee: status === "Success" ? Math.round(amount * 0.005 * 100) / 100 : 0,
        railRef: rail.substring(0, 3).toUpperCase() + "-" + String(Math.floor(Math.random() * 900000 + 100000)),
        errorCode: errCode,
        riskScore: status === "Flagged" ? Math.floor(Math.random() * 40) + 60 : Math.floor(Math.random() * 30),
        sender: isCredit ? randomName() : "Self",
        receiver: isCredit ? "Self" : randomName(),
        timeline: buildTimeline(status, daysAgo(dayOffset)),
      });
    }

    txs.sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });

    LS.lsSet("transactions", txs);
    return txs;
  }

  function buildTimeline(status, startIso) {
    const start = new Date(startIso).getTime();
    const steps = [
      { label: "Initiated", offset: 0 },
      { label: "Authorized", offset: 12 },
      { label: "Submitted to rail", offset: 45 },
    ];
    if (status === "Failed") {
      steps.push({ label: "Failed", offset: 90, failed: true });
    } else if (status === "Pending") {
      steps.push({ label: "Pending confirmation", offset: 120 });
    } else {
      steps.push({ label: "Confirmed", offset: 90 });
      steps.push({ label: "Settled", offset: 180 });
    }
    return steps.map(function (s) {
      return {
        label: s.label,
        time: new Date(start + s.offset * 1000).toISOString(),
        failed: !!s.failed,
        done: status !== "Pending" || s.offset < 120,
      };
    });
  }

  function seedAlerts() {
    const existing = LS.lsGet("alerts", null);
    if (existing && existing.length >= 5) {
      const filtered = existing.filter(function (alert) {
        const reason = (alert.reason || alert.rule || "").toLowerCase();
        return alert.ruleId !== "R3" && alert.ruleId !== "R4" &&
          reason.indexOf("new device") === -1 &&
          reason.indexOf("different city") === -1 &&
          reason.indexOf("two locations") === -1 &&
          reason.indexOf("unusual location") === -1;
      });
      LS.lsSet("alerts", filtered);
      return filtered;
    }

    const alertSeeds = [
      { id: 2000, risk: "High", reason: "Multiple large transfers within 1 hour" },
      { id: 2002, risk: "Medium", reason: "Transfer amount exceeds daily pattern by 400%" },
      { id: 2003, risk: "Medium", reason: "Failed login attempts followed by successful transfer" },
      { id: 2004, risk: "Medium", reason: "QR payment to high-risk merchant category" },
      { id: 2006, risk: "Low", reason: "Rapid succession of bill payments to new billers" },
      { id: 2007, risk: "High", reason: "Outgoing transfer to newly added beneficiary over ₱50,000" },
    ];
    const alerts = [];
    for (let i = 0; i < alertSeeds.length; i++) {
      alerts.push({
        id: "ALT-" + String(alertSeeds[i].id),
        risk: alertSeeds[i].risk,
        reason: alertSeeds[i].reason,
        user: randomName(),
        account: maskAccount(),
        age: (i + 1) * 2 + "h",
        created: daysAgo(0),
        status: "Open",
      });
    }
    LS.lsSet("alerts", alerts);
    return alerts;
  }

  function seedNotifications() {
    const existing = LS.lsGet("notifications", null);
    if (existing && existing.length >= 3) return existing;

    const notifs = [
      { id: "N1", text: "High-risk alert: Multiple large transfers detected", time: "12m ago", read: false },
      { id: "N2", text: "KYC queue has 4 pending applications", time: "1h ago", read: false },
      { id: "N3", text: "PESONet latency elevated (340 ms)", time: "2h ago", read: false },
      { id: "N4", text: "Daily volume report is ready", time: "5h ago", read: true },
      { id: "N5", text: "System maintenance scheduled for Sunday 02:00", time: "1d ago", read: true },
    ];
    LS.lsSet("notifications", notifs);
    return notifs;
  }

  function seedActivity() {
    const existing = LS.lsGet("activityLog", null);
    if (existing && existing.length >= 5) return existing;

    const logs = [
      { id: "ACT-1", actor: "System Administrator", action: "Reviewed alert ALT-2001", target: "ALT-2001", time: daysAgo(0) },
      { id: "ACT-2", actor: "System Administrator", action: "Approved KYC for Juan Santos", target: "USR-1001", time: daysAgo(0) },
      { id: "ACT-3", actor: "Maria Reyes", action: "Updated transfer limits for KYC Tier 2", target: "Settings", time: daysAgo(1) },
      { id: "ACT-4", actor: "System Administrator", action: "Froze account ****4521", target: "ACC-4521", time: daysAgo(1) },
      { id: "ACT-5", actor: "Carlos Garcia", action: "Exported transaction report", target: "Transactions", time: daysAgo(2) },
      { id: "ACT-6", actor: "System Administrator", action: "Dismissed alert ALT-1998", target: "ALT-1998", time: daysAgo(2) },
      { id: "ACT-7", actor: "Ana Cruz", action: "Enabled biller: Cignal", target: "Gateway", time: daysAgo(3) },
      { id: "ACT-8", actor: "System Administrator", action: "Signed out", target: "System", time: daysAgo(5) },
    ];
    LS.lsSet("activityLog", logs);
    return logs;
  }

  function seedSystemStatus() {
    return [
      { id: "api", name: "API", status: "operational", latency: 42 },
      { id: "gateway", name: "Payment Gateway", status: "operational", latency: 78 },
      { id: "instapay", name: "InstaPay", status: "operational", latency: 115 },
      { id: "pesonet", name: "PESONet", status: "operational", latency: 210 },
    ];
  }

  /* ========================================================
     STATE
     ======================================================== */
  let transactions = [];
  let alerts = [];
  let systemStatus = [];
  let currentRange = "today";
  let customStart = null;
  let customEnd = null;
  let autoRefreshTimer = null;
  let lastUpdated = Date.now();
  let txSort = { col: null, dir: null };
  let txSearchTerm = "";
  let txStatusFilter = "all";
  let txChannelFilter = "all";
  let txTypeFilter = "all";
  let lineMetric = "volume";
  let doughnutHidden = {};
  let activeAlertId = null;
  let freezeAlertId = null;
  let modalOpen = false;

  /* ========================================================
     DATE RANGE HELPERS
     ======================================================== */
  function getRangeBounds(range) {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    let start = new Date(now);

    if (range === "today") {
      start.setHours(0, 0, 0, 0);
    } else if (range === "7d") {
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    } else if (range === "30d") {
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
    } else if (range === "custom" && customStart && customEnd) {
      start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
    } else {
      start.setHours(0, 0, 0, 0);
    }
    return { start: start, end: end };
  }

  function getPreviousBounds(range) {
    const { start, end } = getRangeBounds(range);
    const duration = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - duration);
    return { start: prevStart, end: prevEnd };
  }

  function filterByRange(txs, bounds) {
    return txs.filter(function (t) {
      const d = new Date(t.date);
      return d >= bounds.start && d <= bounds.end;
    });
  }

  /* ========================================================
     KPI CALCULATION
     ======================================================== */
  function calcKPIs(range) {
    const bounds = getRangeBounds(range);
    const prevBounds = getPreviousBounds(range);
    const current = filterByRange(transactions, bounds);
    const previous = filterByRange(transactions, prevBounds);

    const totalUsers = 12840 + Math.floor(Math.random() * 20);
    const prevUsers = totalUsers - Math.floor(Math.random() * 80) - 20;
    const activeAccounts = 9420 + Math.floor(Math.random() * 15);
    const prevActive = activeAccounts - Math.floor(Math.random() * 50) - 10;

    const txToday = current.length;
    const prevTx = previous.length;

    let volume = 0;
    current.forEach(function (t) {
      volume += t.amount;
    });
    let prevVolume = 0;
    previous.forEach(function (t) {
      prevVolume += t.amount;
    });

    const failed = current.filter(function (t) {
      return t.status === "Failed" || t.status === "Flagged";
    }).length;
    const prevFailed = previous.filter(function (t) {
      return t.status === "Failed" || t.status === "Flagged";
    }).length;
    const failRate = current.length ? ((failed / current.length) * 100).toFixed(1) : "0.0";

    /* Pending KYC from users store (matches Users page filter) — not date-scoped */
    const allUsers = LS.lsGet("users", []) || [];
    const pendingUsers = allUsers.filter(function (u) {
      return u.status === "Pending KYC";
    });
    const pendingKyc = pendingUsers.length;
    let oldestKyc = "—";
    if (pendingUsers.length) {
      let oldestMs = Infinity;
      pendingUsers.forEach(function (u) {
        const t = new Date(u.registered || u.lastLogin || 0).getTime();
        if (!isNaN(t) && t < oldestMs) oldestMs = t;
      });
      if (oldestMs < Infinity) {
        const days = Math.floor((Date.now() - oldestMs) / 86400000);
        if (days <= 0) oldestKyc = "today";
        else if (days === 1) oldestKyc = "1d";
        else oldestKyc = days + "d";
      }
    }

    function delta(curr, prev, invert) {
      if (prev === 0) return { pct: 0, up: true, neutral: true };
      const pct = ((curr - prev) / prev) * 100;
      const up = invert ? pct < 0 : pct >= 0;
      return { pct: Math.abs(pct).toFixed(1), up: up, neutral: Math.abs(pct) < 0.1 };
    }

    return {
      totalUsers: { value: totalUsers, delta: delta(totalUsers, prevUsers, false), spark: sparkData(7) },
      activeAccounts: { value: activeAccounts, delta: delta(activeAccounts, prevActive, false), spark: sparkData(7) },
      transactions: { value: txToday, delta: delta(txToday, prevTx, false), spark: sparkData(7) },
      volume: { value: volume, delta: delta(volume, prevVolume, false), spark: sparkData(7) },
      failed: { value: failed, rate: failRate, delta: delta(failed, prevFailed, true), spark: sparkData(7) },
      pendingKyc: { value: pendingKyc, oldest: oldestKyc, delta: { pct: "0", up: true, neutral: true }, spark: sparkData(7) },
    };
  }

  function sparkData(n) {
    const arr = [];
    let v = 40 + Math.random() * 30;
    for (let i = 0; i < n; i++) {
      v += (Math.random() - 0.45) * 15;
      arr.push(Math.max(5, Math.round(v)));
    }
    return arr;
  }

  /* ========================================================
     CHART DATA
     ======================================================== */
  function get7DaySeries() {
    const series = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const dayTxs = transactions.filter(function (t) {
        const td = new Date(t.date);
        return td >= d && td < next;
      });
      let vol = 0;
      dayTxs.forEach(function (t) {
        vol += t.amount;
      });
      series.push({
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
        volume: Math.round(vol),
        count: dayTxs.length,
      });
    }
    return series;
  }

  function getDistribution(range) {
    const bounds = getRangeBounds(range);
    const current = filterByRange(transactions, bounds);
    const dist = { Transfer: 0, Bills: 0, "QR Ph": 0, "Cash In": 0 };
    current.forEach(function (t) {
      if (dist[t.type] !== undefined) dist[t.type]++;
    });
    return dist;
  }

  /* ========================================================
     RENDER KPIs
     ======================================================== */
  function renderKPIs() {
    const kpis = calcKPIs(currentRange);
    const grid = document.getElementById("kpiGrid");
    if (!grid) return;

    const cards = [
      {
        key: "totalUsers",
        label: "Total Users",
        value: kpis.totalUsers.value.toLocaleString(),
        delta: kpis.totalUsers.delta,
        spark: kpis.totalUsers.spark,
        icon: usersIcon(),
        nav: "admin-users.html",
        toast: "Opening Users",
      },
      {
        key: "activeAccounts",
        label: "Active Accounts",
        value: kpis.activeAccounts.value.toLocaleString(),
        delta: kpis.activeAccounts.delta,
        spark: kpis.activeAccounts.spark,
        icon: accountsIcon(),
        nav: "admin-users.html?filter=active",
        toast: "Opening Users, filter: Active",
      },
      {
        key: "transactions",
        label: "Transactions",
        value: kpis.transactions.value.toLocaleString(),
        delta: kpis.transactions.delta,
        spark: kpis.transactions.spark,
        icon: txIcon(),
        nav: "admin-transactions.html",
        toast: "Opening Transactions",
      },
      {
        key: "volume",
        label: "Volume (₱)",
        value: LS.formatPHP(kpis.volume.value),
        delta: kpis.volume.delta,
        spark: kpis.volume.spark,
        icon: volumeIcon(),
        nav: "admin-transactions.html",
        toast: "Opening Transactions",
      },
      {
        key: "failed",
        label: "Failed Transactions",
        value: String(kpis.failed.value),
        sub: kpis.failed.rate + "% failure rate",
        delta: kpis.failed.delta,
        spark: kpis.failed.spark,
        icon: failedIcon(),
        nav: "admin-transactions.html?filter=failed",
        toast: "Opening Transactions, filter: Failed",
      },
      {
        key: "pendingKyc",
        label: "Pending KYC",
        value: String(kpis.pendingKyc.value),
        sub: "oldest " + kpis.pendingKyc.oldest,
        delta: kpis.pendingKyc.delta,
        spark: kpis.pendingKyc.spark,
        icon: kycIcon(),
        nav: "admin-users.html?filter=pending-kyc",
        toast: "Opening Users, filter: Pending KYC",
      },
    ];

    grid.innerHTML = "";
    cards.forEach(function (c) {
      const card = document.createElement("article");
      card.className = "kpi-card";
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", c.label + ": " + c.value);

      let deltaHtml = "";
      if (c.delta.neutral) {
        deltaHtml = '<span class="kpi-delta neutral">0%</span>';
      } else if (c.delta.up) {
        deltaHtml = '<span class="kpi-delta up">↑ ' + c.delta.pct + "%</span>";
      } else {
        deltaHtml = '<span class="kpi-delta down">↓ ' + c.delta.pct + "%</span>";
      }

      card.innerHTML =
        '<div class="kpi-icon">' + c.icon + "</div>" +
        '<div class="kpi-label">' + c.label + "</div>" +
        '<div class="kpi-value">' + c.value + "</div>" +
        '<div class="kpi-meta">' + deltaHtml +
        (c.sub ? '<span class="kpi-sub">' + c.sub + "</span>" : "") +
        "</div>" +
        '<div class="kpi-sparkline">' + sparkSvg(c.spark) + "</div>";

      card.addEventListener("click", function () {
        LS.showToast(c.toast, "info");
        setTimeout(function () {
          window.location.href = c.nav;
        }, 400);
      });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          card.click();
        }
      });
      grid.appendChild(card);
    });
  }

  function sparkSvg(data) {
    const w = 100;
    const h = 28;
    const max = Math.max.apply(null, data) || 1;
    const min = Math.min.apply(null, data) || 0;
    const range = max - min || 1;
    const pts = data.map(function (v, i) {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return x + "," + y;
    });
    return (
      '<svg viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none">' +
      '<polyline points="' + pts.join(" ") + '" fill="none" stroke="#006837" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>"
    );
  }

  function usersIcon() {
    return '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M3 15c0-2.5 2.5-4 6-4s6 1.5 6 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  }
  function accountsIcon() {
    return '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="4" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M2 8h14" stroke="currentColor" stroke-width="1.4"/></svg>';
  }
  function txIcon() {
    return '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5h12M3 9h12M3 13h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  }
  function volumeIcon() {
    return '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v14M5 6l4-4 4 4M5 12l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function failedIcon() {
    return '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.4"/><path d="M6.5 6.5l5 5M11.5 6.5l-5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  }
  function kycIcon() {
    return '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="2" width="12" height="14" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M6 6h6M6 9h6M6 12h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  }

  /* ========================================================
     LINE CHART
     ======================================================== */
  function renderLineChart() {
    const simulateErr = false;
    const errEl = document.getElementById("lineChartError");
    const container = document.getElementById("lineChartContainer");

    if (simulateErr) {
      if (container) container.classList.add("hidden");
      if (errEl) errEl.classList.remove("hidden");
      return;
    }
    if (container) container.classList.remove("hidden");
    if (errEl) errEl.classList.add("hidden");

    const series = get7DaySeries();
    const svg = document.getElementById("lineChartSvg");
    if (!svg) return;

    const W = 560;
    const H = 260;
    const pad = { top: 20, right: 20, bottom: 36, left: 56 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    const values = series.map(function (s) {
      return lineMetric === "volume" ? s.volume : s.count;
    });
    const maxVal = Math.max.apply(null, values) * 1.15 || 1;

    function xScale(i) {
      return pad.left + (i / (series.length - 1)) * plotW;
    }
    function yScale(v) {
      return pad.top + plotH - (v / maxVal) * plotH;
    }

    /* Build path */
    let pathD = "";
    let areaD = "";
    series.forEach(function (s, i) {
      const x = xScale(i);
      const y = yScale(values[i]);
      if (i === 0) {
        pathD = "M" + x + "," + y;
        areaD = "M" + x + "," + yScale(0) + " L" + x + "," + y;
      } else {
        const prevX = xScale(i - 1);
        const prevY = yScale(values[i - 1]);
        const cpx = (prevX + x) / 2;
        pathD += " C" + cpx + "," + prevY + " " + cpx + "," + y + " " + x + "," + y;
        areaD += " C" + cpx + "," + prevY + " " + cpx + "," + y + " " + x + "," + y;
      }
    });
    areaD += " L" + xScale(series.length - 1) + "," + yScale(0) + " Z";

    /* Gridlines */
    let grid = "";
    for (let g = 0; g <= 4; g++) {
      const gy = pad.top + (plotH / 4) * g;
      const gv = maxVal * (1 - g / 4);
      const label = lineMetric === "volume"
        ? (gv >= 1000000 ? "₱" + (gv / 1000000).toFixed(1) + "M" : "₱" + Math.round(gv / 1000) + "K")
        : String(Math.round(gv));
      grid +=
        '<line x1="' + pad.left + '" y1="' + gy + '" x2="' + (W - pad.right) + '" y2="' + gy + '" stroke="#e0e5e2" stroke-width="1"/>' +
        '<text x="' + (pad.left - 8) + '" y="' + (gy + 4) + '" text-anchor="end" font-size="11" fill="#8a8a8a">' + label + "</text>";
    }

    /* X labels */
    let xLabels = "";
    series.forEach(function (s, i) {
      xLabels +=
        '<text x="' + xScale(i) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="11" fill="#8a8a8a">' + s.label + "</text>";
    });

    /* Points */
    let points = "";
    series.forEach(function (s, i) {
      points +=
        '<circle class="chart-point" data-idx="' + i + '" cx="' + xScale(i) + '" cy="' + yScale(values[i]) + '" r="5" fill="#006837" stroke="#fff" stroke-width="2" style="cursor:pointer"/>';
    });

    svg.innerHTML =
      '<defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#D4AF37" stop-opacity="0.35"/>' +
      '<stop offset="100%" stop-color="#D4AF37" stop-opacity="0"/>' +
      "</linearGradient></defs>" +
      grid +
      '<path d="' + areaD + '" fill="url(#areaGrad)"/>' +
      '<path d="' + pathD + '" fill="none" stroke="#006837" stroke-width="2.5" stroke-linecap="round"/>' +
      xLabels +
      points +
      '<line id="crosshair" class="hidden" x1="0" y1="' + pad.top + '" x2="0" y2="' + (pad.top + plotH) + '" stroke="#006837" stroke-width="1" stroke-dasharray="4 3"/>';

    /* Hover */
    const tooltip = document.getElementById("lineChartTooltip");
    const crosshair = svg.querySelector("#crosshair");

    svg.querySelectorAll(".chart-point").forEach(function (pt) {
      pt.addEventListener("mouseenter", function () {
        const idx = Number(pt.getAttribute("data-idx"));
        const s = series[idx];
        const val = values[idx];
        const prev = idx > 0 ? values[idx - 1] : val;
        const change = prev ? (((val - prev) / prev) * 100).toFixed(1) : "0.0";
        const changeStr = (val >= prev ? "+" : "") + change + "% vs prior day";

        tooltip.innerHTML =
          '<div class="tt-date">' + s.label + "</div>" +
          '<div class="tt-value">' +
          (lineMetric === "volume" ? LS.formatPHP(val) : val + " txs") +
          "</div>" +
          '<div class="tt-change">' + changeStr + "</div>";
        tooltip.classList.remove("hidden");

        const rect = svg.getBoundingClientRect();
        const containerRect = document.getElementById("lineChartContainer").getBoundingClientRect();
        const cx = xScale(idx) * (rect.width / W);
        tooltip.style.left = Math.min(cx + 12, containerRect.width - 160) + "px";
        tooltip.style.top = "20px";

        if (crosshair) {
          crosshair.setAttribute("x1", xScale(idx));
          crosshair.setAttribute("x2", xScale(idx));
          crosshair.classList.remove("hidden");
        }
      });

      pt.addEventListener("mouseleave", function () {
        tooltip.classList.add("hidden");
        if (crosshair) crosshair.classList.add("hidden");
      });

      pt.addEventListener("click", function () {
        const idx = Number(pt.getAttribute("data-idx"));
        const s = series[idx];
        LS.showToast("Opening transactions for " + s.label, "info");
        setTimeout(function () {
          window.location.href = "admin-transactions.html?date=" + s.date;
        }, 400);
      });
    });
  }

  /* ========================================================
     DOUGHNUT CHART
     ======================================================== */
  const DOUGHNUT_COLORS = {
    Transfer: "#006837",
    Bills: "#D4AF37",
    "QR Ph": "#1565c0",
    "Cash In": "#2e7d32",
  };

  function renderDoughnut() {
    const dist = getDistribution(currentRange);
    const svg = document.getElementById("doughnutSvg");
    const legend = document.getElementById("doughnutLegend");
    const totalEl = document.getElementById("doughnutTotal");
    if (!svg || !legend) return;

    const keys = Object.keys(dist);
    let total = 0;
    keys.forEach(function (k) {
      if (!doughnutHidden[k]) total += dist[k];
    });

    if (totalEl) totalEl.textContent = total.toLocaleString();

    const cx = 100;
    const cy = 100;
    const r = 70;
    const rInner = 48;
    let angle = -Math.PI / 2;

    let paths = "";
    keys.forEach(function (k) {
      if (doughnutHidden[k] || dist[k] === 0) return;
      const slice = (dist[k] / total) * Math.PI * 2;
      const x1 = cx + r * Math.cos(angle);
      const y1 = cy + r * Math.sin(angle);
      const x2 = cx + r * Math.cos(angle + slice);
      const y2 = cy + r * Math.sin(angle + slice);
      const x3 = cx + rInner * Math.cos(angle + slice);
      const y3 = cy + rInner * Math.sin(angle + slice);
      const x4 = cx + rInner * Math.cos(angle);
      const y4 = cy + rInner * Math.sin(angle);
      const large = slice > Math.PI ? 1 : 0;

      const isFullCircle = slice >= Math.PI * 2 - 1e-6;
      let path;
      if (isFullCircle) {
        const outerMidX = cx + r * Math.cos(angle + Math.PI);
        const outerMidY = cy + r * Math.sin(angle + Math.PI);
        const innerMidX = cx + rInner * Math.cos(angle + Math.PI);
        const innerMidY = cy + rInner * Math.sin(angle + Math.PI);
        path =
          "M" + x1 + "," + y1 +
          " A" + r + "," + r + " 0 0 1 " + outerMidX + "," + outerMidY +
          " A" + r + "," + r + " 0 0 1 " + x1 + "," + y1 +
          " L" + x4 + "," + y4 +
          " A" + rInner + "," + rInner + " 0 0 0 " + innerMidX + "," + innerMidY +
          " A" + rInner + "," + rInner + " 0 0 0 " + x4 + "," + y4 +
          " Z";
      } else {
        path =
          "M" + x1 + "," + y1 +
          " A" + r + "," + r + " 0 " + large + " 1 " + x2 + "," + y2 +
          " L" + x3 + "," + y3 +
          " A" + rInner + "," + rInner + " 0 " + large + " 0 " + x4 + "," + y4 +
          " Z";
      }

      paths +=
        '<path class="doughnut-slice" data-key="' + k + '" d="' + path +
        '" fill="' + DOUGHNUT_COLORS[k] + '" stroke="' + (isFullCircle ? "none" : "#fff") + '" stroke-width="2" style="cursor:pointer;transition:opacity 0.15s"/>';

      angle += slice;
    });

    svg.innerHTML = paths;

    /* Legend */
    legend.innerHTML = "";
    keys.forEach(function (k) {
      const li = document.createElement("li");
      li.className = "legend-item" + (doughnutHidden[k] ? " off" : "");
      li.setAttribute("data-key", k);
      li.innerHTML =
        '<span class="legend-swatch" style="background:' + DOUGHNUT_COLORS[k] + '"></span>' +
        "<span>" + k + "</span>" +
        '<span class="legend-value">' + dist[k] + "</span>";

      li.addEventListener("click", function () {
        doughnutHidden[k] = !doughnutHidden[k];
        renderDoughnut();
      });

      li.addEventListener("mouseenter", function () {
        svg.querySelectorAll(".doughnut-slice").forEach(function (p) {
          if (p.getAttribute("data-key") === k) {
            p.style.opacity = "1";
            li.classList.add("highlight");
          } else {
            p.style.opacity = "0.35";
          }
        });
      });
      li.addEventListener("mouseleave", function () {
        svg.querySelectorAll(".doughnut-slice").forEach(function (p) {
          p.style.opacity = "1";
        });
        li.classList.remove("highlight");
      });

      legend.appendChild(li);
    });

    /* Slice hover */
    svg.querySelectorAll(".doughnut-slice").forEach(function (p) {
      p.addEventListener("mouseenter", function () {
        const key = p.getAttribute("data-key");
        svg.querySelectorAll(".doughnut-slice").forEach(function (s) {
          s.style.opacity = s.getAttribute("data-key") === key ? "1" : "0.35";
        });
        legend.querySelectorAll(".legend-item").forEach(function (li) {
          if (li.getAttribute("data-key") === key) li.classList.add("highlight");
          else li.classList.remove("highlight");
        });
      });
      p.addEventListener("mouseleave", function () {
        svg.querySelectorAll(".doughnut-slice").forEach(function (s) {
          s.style.opacity = "1";
        });
        legend.querySelectorAll(".legend-item").forEach(function (li) {
          li.classList.remove("highlight");
        });
      });
    });
  }

  /* ========================================================
     TRANSACTIONS TABLE
     ======================================================== */
  function getFilteredTxs() {
    const bounds = getRangeBounds(currentRange);
    let list = filterByRange(transactions, bounds);

    if (txSearchTerm) {
      const q = txSearchTerm.toLowerCase();
      list = list.filter(function (t) {
        return (
          t.id.toLowerCase().indexOf(q) !== -1 ||
          t.user.toLowerCase().indexOf(q) !== -1 ||
          t.description.toLowerCase().indexOf(q) !== -1 ||
          t.account.indexOf(q) !== -1
        );
      });
    }
    if (txStatusFilter !== "all") {
      list = list.filter(function (t) {
        return t.status === txStatusFilter;
      });
    }
    if (txChannelFilter !== "all") {
      list = list.filter(function (t) {
        return t.channel === txChannelFilter;
      });
    }
    if (txTypeFilter !== "all") {
      list = list.filter(function (t) {
        return t.type === txTypeFilter;
      });
    }

    if (txSort.col === "date") {
      list.sort(function (a, b) {
        const d = new Date(a.date) - new Date(b.date);
        return txSort.dir === "asc" ? d : -d;
      });
    } else if (txSort.col === "amount") {
      list.sort(function (a, b) {
        const d = a.amount - b.amount;
        return txSort.dir === "asc" ? d : -d;
      });
    }

    return list;
  }

  function renderTxTable() {
    const tbody = document.getElementById("txTableBody");
    const empty = document.getElementById("txEmpty");
    const table = document.getElementById("txTable");
    if (!tbody) return;

    const list = getFilteredTxs().slice(0, 5);
    tbody.innerHTML = "";

    const hasFilters =
      txSearchTerm ||
      txStatusFilter !== "all" ||
      txChannelFilter !== "all" ||
      txTypeFilter !== "all";

    const clearBtn = document.getElementById("txClearFilters");
    if (clearBtn) {
      if (hasFilters) clearBtn.classList.remove("hidden");
      else clearBtn.classList.add("hidden");
    }

    if (list.length === 0) {
      if (table) table.classList.add("hidden");
      if (empty) empty.classList.remove("hidden");
      return;
    }
    if (table) table.classList.remove("hidden");
    if (empty) empty.classList.add("hidden");

    list.forEach(function (t) {
      const tr = document.createElement("tr");
      tr.setAttribute("data-id", t.id);

      const dirClass = t.direction === "credit" ? "credit" : "debit";
      const dirArrow = t.direction === "credit" ? "↓" : "↑";
      const amountStr =
        (t.direction === "credit" ? "+" : "−") + LS.formatPHP(t.amount);

      const statusClass =
        t.status === "Success"
          ? "badge-success"
          : t.status === "Pending"
          ? "badge-pending"
          : t.status === "Flagged"
          ? "badge-flagged"
          : "badge-failed";

      const dateStr = new Date(t.date).toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Manila",
      });

      tr.innerHTML =
        '<td><div class="tx-desc"><span class="tx-dir ' + dirClass + '">' + dirArrow + "</span>" + t.description + "</div></td>" +
        "<td>" + t.id + "</td>" +
        "<td>" + t.user + "<br><span class=\"text-muted\" style=\"font-size:11px\">" + t.account + "</span></td>" +
        "<td>" + t.channel + "</td>" +
        "<td>" + t.type + "</td>" +
        "<td>" + dateStr + "</td>" +
        '<td class="tx-amount ' + dirClass + '">' + amountStr + "</td>" +
        '<td><span class="badge ' + statusClass + '"><span class="badge-dot"></span>' + t.status + "</span></td>";

      tr.addEventListener("click", function () {
        openTxDetail(t);
      });
      tbody.appendChild(tr);
    });
  }

  function openTxDetail(t) {
    const body = document.getElementById("txDetailBody");
    if (!body) return;

    const amountClass = t.direction === "credit" ? "text-success" : "text-failed";
    const amountStr = (t.direction === "credit" ? "+" : "−") + LS.formatPHP(t.amount);
    const statusClass =
      t.status === "Success"
        ? "badge-success"
        : t.status === "Pending"
        ? "badge-pending"
        : t.status === "Flagged"
        ? "badge-flagged"
        : "badge-failed";

    let timelineHtml = '<div class="timeline">';
    (t.timeline || []).forEach(function (step) {
      const cls = step.failed ? "failed" : step.done ? "done" : "";
      const timeStr = new Date(step.time).toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Manila",
      });
      timelineHtml +=
        '<div class="timeline-step ' + cls + '">' +
        '<div class="step-label">' + step.label + "</div>" +
        '<div class="step-time">' + timeStr + "</div></div>";
    });
    timelineHtml += "</div>";

    let errorHtml = "";
    if (t.errorCode && ERROR_CODES[t.errorCode]) {
      errorHtml =
        '<div class="tx-detail-row"><span class="label">Error code</span><span class="value text-failed">' +
        t.errorCode +
        "</span></div>" +
        '<div class="tx-detail-row"><span class="label">Explanation</span><span class="value">' +
        ERROR_CODES[t.errorCode] +
        "</span></div>";
    }

    body.innerHTML =
      '<div class="tx-detail-amount ' + amountClass + '">' + amountStr + "</div>" +
      '<div style="margin-bottom:16px"><span class="badge ' + statusClass + '"><span class="badge-dot"></span>' + t.status + "</span></div>" +
      '<div class="tx-detail-row"><span class="label">Transaction ID</span><span class="value tx-id-copy">' +
      t.id +
      ' <button type="button" class="btn btn-ghost btn-sm" id="copyTxIdBtn" aria-label="Copy transaction ID">Copy</button></span></div>' +
      '<div class="tx-detail-row"><span class="label">Sender</span><span class="value">' + t.sender + "</span></div>" +
      '<div class="tx-detail-row"><span class="label">Receiver</span><span class="value">' + t.receiver + "</span></div>" +
      '<div class="tx-detail-row"><span class="label">Rail</span><span class="value">' + t.rail + "</span></div>" +
      '<div class="tx-detail-row"><span class="label">Rail reference</span><span class="value">' + t.railRef + "</span></div>" +
      '<div class="tx-detail-row"><span class="label">Fee</span><span class="value">' + LS.formatPHP(t.fee) + "</span></div>" +
      '<div class="tx-detail-row"><span class="label">Channel</span><span class="value">' + t.channel + "</span></div>" +
      '<div class="tx-detail-row"><span class="label">Risk score</span><span class="value">' + t.riskScore + "/100</span></div>" +
      errorHtml +
      "<h3 style=\"font-size:14px;margin:16px 0 8px\">Timeline</h3>" +
      timelineHtml;

    LS.openModal("txDetailModal");
    modalOpen = true;

    const copyBtn = document.getElementById("copyTxIdBtn");
    if (copyBtn) {
      copyBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        try {
          navigator.clipboard.writeText(t.id);
        } catch (err) {
          /* fallback */
          const ta = document.createElement("textarea");
          ta.value = t.id;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        LS.showToast("Copied", "success");
      });
    }
  }

  /* ========================================================
     ALERTS
     ======================================================== */
  function renderAlerts() {
    const list = document.getElementById("alertsList");
    const empty = document.getElementById("alertsEmpty");
    const countEl = document.getElementById("alertCount");
    if (!list) return;

    const openAlerts = alerts.filter(function (a) {
      return a.status === "Open";
    });

    if (countEl) countEl.textContent = String(openAlerts.length);

    if (openAlerts.length === 0) {
      list.innerHTML = "";
      if (empty) empty.classList.remove("hidden");
      return;
    }
    if (empty) empty.classList.add("hidden");

    list.innerHTML = "";
    openAlerts.slice(0, 5).forEach(function (a) {
      const riskClass =
        a.risk === "High"
          ? "badge-risk-high"
          : a.risk === "Medium"
          ? "badge-risk-medium"
          : "badge-risk-low";

      const item = document.createElement("div");
      item.className = "alert-item";
      item.innerHTML =
        '<div class="alert-top"><span class="badge ' + riskClass + '"><span class="badge-dot"></span>' + a.risk + "</span></div>" +
        '<div class="alert-reason">' + a.reason + "</div>" +
        '<div class="alert-meta">' + a.user + " · " + a.age + " ago</div>" +
        '<div class="alert-actions">' +
        '<button type="button" class="btn btn-destructive btn-sm alert-freeze-btn" data-id="' + a.id + '">Freeze</button>' +
        '<button type="button" class="btn btn-secondary btn-sm alert-review-btn" data-id="' + a.id + '">Review</button>' +
        "</div>";
      list.appendChild(item);
    });

    list.querySelectorAll(".alert-freeze-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        freezeAlertId = btn.getAttribute("data-id");
        openFreezeModal(freezeAlertId);
      });
    });
    list.querySelectorAll(".alert-review-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeAlertId = btn.getAttribute("data-id");
        openAlertReview(activeAlertId);
      });
    });

    /* Update custom scrollbar after content change */
    requestAnimationFrame(syncAlertsScrollbar);
  }

  /* Custom alerts scrollbar – no native OS arrows */
  function syncAlertsScrollbar() {
    const scroll = document.getElementById("alertsScroll");
    const bar = document.getElementById("alertsScrollbar");
    const thumb = document.getElementById("alertsScrollbarThumb");
    if (!scroll || !bar || !thumb) return;

    const viewH = scroll.clientHeight;
    const contentH = scroll.scrollHeight;

    if (contentH <= viewH + 1) {
      bar.classList.remove("visible");
      bar.style.opacity = "0";
      return;
    }

    bar.classList.add("visible");
    const ratio = viewH / contentH;
    const thumbH = Math.max(32, Math.round(viewH * ratio));
    const maxTop = viewH - thumbH;
    const scrollMax = contentH - viewH;
    const top = scrollMax > 0 ? Math.round((scroll.scrollTop / scrollMax) * maxTop) : 0;

    thumb.style.height = thumbH + "px";
    thumb.style.top = top + "px";
  }

  function initAlertsScrollbar() {
    const scroll = document.getElementById("alertsScroll");
    if (!scroll) return;
    scroll.addEventListener("scroll", syncAlertsScrollbar);
    window.addEventListener("resize", syncAlertsScrollbar);
    syncAlertsScrollbar();
  }

  function openFreezeModal(alertId) {
    const alert = alerts.find(function (a) {
      return a.id === alertId;
    });
    if (!alert) return;

    const summary = document.getElementById("freezeSummary");
    if (summary) {
      summary.innerHTML =
        "<strong>" + alert.user + " · " + alert.account + "</strong>" +
        "Reason: " + alert.reason;
    }

    /* Reset form */
    const form = document.getElementById("freezeForm");
    if (form) form.reset();
    const notify = document.getElementById("freezeNotify");
    if (notify) notify.checked = true;
    clearFormErrors("freeze");
    updateCharCount("freezeReason", "freezeReasonCount", 250);

    LS.openModal("freezeModal");
    modalOpen = true;
  }

  function openAlertReview(alertId) {
    const alert = alerts.find(function (a) {
      return a.id === alertId;
    });
    if (!alert) return;

    const body = document.getElementById("alertReviewBody");
    if (!body) return;

    const riskClass =
      alert.risk === "High"
        ? "badge-risk-high"
        : alert.risk === "Medium"
        ? "badge-risk-medium"
        : "badge-risk-low";

    body.innerHTML =
      '<div style="margin-bottom:12px"><span class="badge ' + riskClass + '"><span class="badge-dot"></span>' + alert.risk + " risk</span></div>" +
      '<div class="tx-detail-row"><span class="label">Alert ID</span><span class="value">' + alert.id + "</span></div>" +
      '<div class="tx-detail-row"><span class="label">User</span><span class="value">' + alert.user + "</span></div>" +
      '<div class="tx-detail-row"><span class="label">Account</span><span class="value">' + alert.account + "</span></div>" +
      '<div class="tx-detail-row"><span class="label">Reason</span><span class="value">' + alert.reason + "</span></div>" +
      '<div class="tx-detail-row"><span class="label">Age</span><span class="value">' + alert.age + "</span></div>";

    LS.openModal("alertReviewModal");
    modalOpen = true;
  }

  function actionAlert(alertId, action) {
    alerts = alerts.map(function (a) {
      if (a.id === alertId) {
        return Object.assign({}, a, { status: action });
      }
      return a;
    });
    LS.lsSet("alerts", alerts);
    renderAlerts();
  }

  /* ========================================================
     SYSTEM STATUS
     ======================================================== */
  function renderStatus() {
    const strip = document.getElementById("statusStrip");
    if (!strip) return;

    const simulateOutage = false;

    strip.innerHTML = "";
    systemStatus.forEach(function (s) {
      let status = s.status;
      let latency = s.latency + Math.floor(Math.random() * 10) - 5;
      if (latency < 10) latency = 10;

      if (s.id === "instapay" && simulateOutage) {
        status = "down";
        latency = 0;
      }

      const item = document.createElement("div");
      item.className = "status-item";
      item.setAttribute("role", "button");
      item.setAttribute("tabindex", "0");
      item.innerHTML =
        '<span class="status-dot ' + status + '"></span>' +
        '<div class="status-info">' +
        '<span class="status-name">' + s.name + "</span>" +
        '<span class="status-latency">' +
        (status === "down" ? "Unavailable" : latency + " ms") +
        "</span></div>";

      item.addEventListener("click", function () {
        LS.showToast("Opening Gateway status for " + s.name, "info");
        setTimeout(function () {
          window.location.href = "admin-gateway.html";
        }, 400);
      });
      strip.appendChild(item);
    });
  }

  /* ========================================================
     ACTIVITY LOG
     ======================================================== */
  function renderActivity() {
    const list = document.getElementById("activityList");
    if (!list) return;

    const logs = LS.lsGet("activityLog", []).slice(0, 8);
    list.innerHTML = "";
    logs.forEach(function (l) {
      const li = document.createElement("li");
      li.className = "activity-item";
      li.innerHTML =
        '<span class="activity-actor">' + l.actor + "</span>" +
        '<span class="activity-action">' + l.action +
        (l.target ? " · " + l.target : "") +
        "</span>" +
        '<span class="activity-time">' + LS.relativeTime(l.time) + "</span>";
      list.appendChild(li);
    });
  }

  window.LB.onActivityAdded = function () {
    renderActivity();
  };

  /* ========================================================
     UPDATED LABEL
     ======================================================== */
  function updateTimestamp() {
    lastUpdated = Date.now();
    const el = document.getElementById("updatedLabel");
    if (!el) return;
    el.textContent = "Updated just now";
    el.classList.remove("stale");
  }

  function checkStale() {
    const el = document.getElementById("updatedLabel");
    if (!el) return;
    const mins = Math.floor((Date.now() - lastUpdated) / 60000);
    if (mins >= 5) {
      el.textContent = "Updated " + mins + " min ago";
      el.classList.add("stale");
    } else if (mins >= 1) {
      el.textContent = "Updated " + mins + " min ago";
      el.classList.remove("stale");
    }
  }

  /* ========================================================
     FULL REFRESH
     ======================================================== */
  function refreshDashboard(showSkeleton) {
    if (showSkeleton) {
      const grid = document.getElementById("kpiGrid");
      if (grid) {
        grid.classList.add("loading");
        grid.innerHTML = "";
        for (let i = 0; i < 6; i++) {
          const sk = document.createElement("div");
          sk.className = "kpi-card kpi-skeleton";
          sk.innerHTML =
            '<div class="skeleton" style="width:32px;height:32px;border-radius:8px"></div>' +
            '<div class="skeleton" style="width:50%"></div>' +
            '<div class="skeleton lg"></div>' +
            '<div class="skeleton" style="width:40%"></div>';
          grid.appendChild(sk);
        }
      }
    }

    const delay = showSkeleton ? 600 : 0;
    setTimeout(function () {
      const grid = document.getElementById("kpiGrid");
      if (grid) grid.classList.remove("loading");
      renderKPIs();
      renderLineChart();
      renderDoughnut();
      renderTxTable();
      renderAlerts();
      renderStatus();
      renderActivity();
      updateTimestamp();
    }, delay);
  }

  /* ========================================================
     FORM HELPERS
     ======================================================== */
  function clearFormErrors(prefix) {
    document.querySelectorAll("[id^='" + prefix + "'][id$='Error']").forEach(function (el) {
      el.classList.remove("visible");
      el.textContent = "";
    });
    document.querySelectorAll("#" + prefix + "Form .error, [id^='" + prefix + "'].error").forEach(function (el) {
      el.classList.remove("error");
    });
  }

  function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = msg;
      el.classList.add("visible");
    }
  }

  function updateCharCount(inputId, countId, max) {
    const input = document.getElementById(inputId);
    const count = document.getElementById(countId);
    if (!input || !count) return;
    function update() {
      const len = input.value.length;
      count.textContent = len + " / " + max;
      if (len > max) count.classList.add("over");
      else count.classList.remove("over");
    }
    input.addEventListener("input", update);
    update();
  }

  /* ========================================================
     EVENT WIRING
     ======================================================== */
  function initEvents() {
    /* Date range segmented control */
    document.querySelectorAll(".dash-title-controls .seg-btn[data-range]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const range = btn.getAttribute("data-range");
        if (range === "custom") {
          LS.openModal("customDateModal");
          modalOpen = true;
          return;
        }
        currentRange = range;
        LS.lsSet("dashRange", range);
        document.querySelectorAll(".dash-title-controls .seg-btn[data-range]").forEach(function (b) {
          b.classList.toggle("active", b.getAttribute("data-range") === range);
        });
        LS.addActivity("System Administrator", "Changed date range to " + range, "Dashboard");
        refreshDashboard(true);
      });
    });

    /* Custom date apply */
    const customApply = document.getElementById("customDateApply");
    if (customApply) {
      customApply.addEventListener("click", function () {
        const startInput = document.getElementById("customStart");
        const endInput = document.getElementById("customEnd");
        clearFormErrors("custom");

        let valid = true;
        const startVal = startInput.value;
        const endVal = endInput.value;
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        if (!startVal) {
          showError("customStartError", "Start date is required");
          startInput.classList.add("error");
          valid = false;
        }
        if (!endVal) {
          showError("customEndError", "End date is required");
          endInput.classList.add("error");
          valid = false;
        }
        if (startVal && endVal) {
          const s = new Date(startVal);
          const e = new Date(endVal);
          if (s > e) {
            showError("customStartError", "Start must be on or before end");
            startInput.classList.add("error");
            valid = false;
          }
          if (e > today) {
            showError("customEndError", "End date cannot be after today");
            endInput.classList.add("error");
            valid = false;
          }
          if (s > today) {
            showError("customStartError", "Start date cannot be after today");
            startInput.classList.add("error");
            valid = false;
          }
          const span = (e - s) / (1000 * 60 * 60 * 24);
          if (span > 366) {
            showError("customEndError", "Range cannot exceed 366 days");
            endInput.classList.add("error");
            valid = false;
          }
        }
        if (!valid) return;

        customStart = startVal;
        customEnd = endVal;
        currentRange = "custom";
        LS.lsSet("dashRange", "custom");
        LS.lsSet("dashCustomStart", startVal);
        LS.lsSet("dashCustomEnd", endVal);

        document.querySelectorAll(".dash-title-controls .seg-btn[data-range]").forEach(function (b) {
          b.classList.toggle("active", b.getAttribute("data-range") === "custom");
        });

        LS.closeModal("customDateModal");
        modalOpen = false;
        LS.addActivity("System Administrator", "Set custom date range", startVal + " to " + endVal);
        refreshDashboard(true);
      });
    }

    /* Chart metric toggle */
    document.querySelectorAll(".chart-toggle .seg-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        lineMetric = btn.getAttribute("data-metric");
        document.querySelectorAll(".chart-toggle .seg-btn").forEach(function (b) {
          b.classList.toggle("active", b.getAttribute("data-metric") === lineMetric);
        });
        renderLineChart();
      });
    });

    /* Line chart retry */
    const retryBtn = document.getElementById("lineChartRetry");
    if (retryBtn) {
      retryBtn.addEventListener("click", function () {
renderLineChart();
      });
    }

    /* Auto refresh */
    const autoSelect = document.getElementById("autoRefreshSelect");
    if (autoSelect) {
      const saved = LS.lsGet("autoRefresh", "0");
      autoSelect.value = saved;
      autoSelect.addEventListener("change", function () {
        LS.lsSet("autoRefresh", autoSelect.value);
        setupAutoRefresh();
      });
    }

    /* Manual refresh */
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", function () {
        refreshDashboard(true);
        LS.showToast("Dashboard updated", "success");
      });
    }

    /* Tx filters */
    let searchTimer = null;
    const searchInput = document.getElementById("txSearch");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
          txSearchTerm = searchInput.value.trim();
          renderTxTable();
        }, 250);
      });
    }

    const statusFilter = document.getElementById("txStatusFilter");
    if (statusFilter) {
      statusFilter.addEventListener("change", function () {
        txStatusFilter = statusFilter.value;
        renderTxTable();
      });
    }
    const channelFilter = document.getElementById("txChannelFilter");
    if (channelFilter) {
      channelFilter.addEventListener("change", function () {
        txChannelFilter = channelFilter.value;
        renderTxTable();
      });
    }
    const typeFilter = document.getElementById("txTypeFilter");
    if (typeFilter) {
      typeFilter.addEventListener("change", function () {
        txTypeFilter = typeFilter.value;
        renderTxTable();
      });
    }

    function clearTxFilters() {
      txSearchTerm = "";
      txStatusFilter = "all";
      txChannelFilter = "all";
      txTypeFilter = "all";
      if (searchInput) searchInput.value = "";
      if (statusFilter) statusFilter.value = "all";
      if (channelFilter) channelFilter.value = "all";
      if (typeFilter) typeFilter.value = "all";
      renderTxTable();
    }

    const clearBtn = document.getElementById("txClearFilters");
    if (clearBtn) clearBtn.addEventListener("click", clearTxFilters);
    const emptyClear = document.getElementById("txEmptyClear");
    if (emptyClear) emptyClear.addEventListener("click", clearTxFilters);

    /* Sortable headers */
    document.querySelectorAll(".sortable").forEach(function (th) {
      th.addEventListener("click", function () {
        const col = th.getAttribute("data-sort");
        if (txSort.col === col) {
          if (txSort.dir === "asc") txSort.dir = "desc";
          else if (txSort.dir === "desc") {
            txSort.col = null;
            txSort.dir = null;
          }
        } else {
          txSort.col = col;
          txSort.dir = "asc";
        }
        document.querySelectorAll(".sortable").forEach(function (h) {
          h.classList.remove("asc", "desc");
        });
        if (txSort.col) {
          th.classList.add(txSort.dir);
        }
        renderTxTable();
      });
    });

    /* Freeze form */
    updateCharCount("freezeReason", "freezeReasonCount", 250);

    const freezeReason = document.getElementById("freezeReason");
    if (freezeReason) {
      freezeReason.addEventListener("blur", function () {
        const v = freezeReason.value.trim();
        const err = document.getElementById("freezeReasonError");
        freezeReason.classList.remove("error");
        if (err) {
          err.classList.remove("visible");
          if (v.length > 0 && v.length < 10) {
            err.textContent = "Enter at least 10 characters";
            err.classList.add("visible");
            freezeReason.classList.add("error");
          }
        }
      });
    }

    const freezeSubmit = document.getElementById("freezeSubmit");
    if (freezeSubmit) {
      freezeSubmit.addEventListener("click", function () {
        clearFormErrors("freeze");
        let valid = true;

        const scope = document.querySelector('input[name="freezeScope"]:checked');
        if (!scope) {
          showError("freezeScopeError", "Select a freeze scope");
          valid = false;
        }

        const reason = document.getElementById("freezeReason");
        const reasonVal = reason ? reason.value.trim() : "";
        if (reasonVal.length < 10) {
          showError("freezeReasonError", "Enter at least 10 characters");
          if (reason) reason.classList.add("error");
          valid = false;
        } else if (reasonVal.length > 250) {
          showError("freezeReasonError", "Maximum 250 characters");
          if (reason) reason.classList.add("error");
          valid = false;
        }

        const pw = document.getElementById("freezePassword");
        if (!pw || pw.value !== "admin123") {
          showError("freezePasswordError", "Incorrect password");
          if (pw) pw.classList.add("error");
          valid = false;
        }

        if (!valid) return;

        const alert = alerts.find(function (a) {
          return a.id === freezeAlertId;
        });
        actionAlert(freezeAlertId, "Actioned");
        LS.addActivity(
          "System Administrator",
          "Froze account " + (alert ? alert.account : ""),
          freezeAlertId
        );
        LS.closeModal("freezeModal");
        modalOpen = false;
        LS.showToast("Account frozen", "success");
      });
    }

    /* Alert dismiss / escalate */
    const dismissBtn = document.getElementById("alertDismissBtn");
    if (dismissBtn) {
      dismissBtn.addEventListener("click", function () {
        LS.closeModal("alertReviewModal");
        /* Reset dismiss form */
        const sel = document.getElementById("dismissReasonSelect");
        if (sel) sel.value = "";
        const note = document.getElementById("dismissNote");
        if (note) note.value = "";
        const noteGroup = document.getElementById("dismissNoteGroup");
        if (noteGroup) noteGroup.classList.add("hidden");
        clearFormErrors("dismiss");
        LS.openModal("dismissReasonModal");
      });
    }

    const dismissReasonSelect = document.getElementById("dismissReasonSelect");
    if (dismissReasonSelect) {
      dismissReasonSelect.addEventListener("change", function () {
        const noteGroup = document.getElementById("dismissNoteGroup");
        if (noteGroup) {
          if (dismissReasonSelect.value === "Other") {
            noteGroup.classList.remove("hidden");
          } else {
            noteGroup.classList.add("hidden");
          }
        }
      });
    }
    updateCharCount("dismissNote", "dismissNoteCount", 250);

    const dismissConfirm = document.getElementById("dismissConfirmBtn");
    if (dismissConfirm) {
      dismissConfirm.addEventListener("click", function () {
        clearFormErrors("dismiss");
        let valid = true;
        const sel = document.getElementById("dismissReasonSelect");
        if (!sel || !sel.value) {
          showError("dismissReasonSelectError", "Select a reason");
          valid = false;
        }
        if (sel && sel.value === "Other") {
          const note = document.getElementById("dismissNote");
          const noteVal = note ? note.value.trim() : "";
          if (noteVal.length < 10) {
            showError("dismissNoteError", "Enter at least 10 characters");
            if (note) note.classList.add("error");
            valid = false;
          }
        }
        if (!valid) return;

        actionAlert(activeAlertId, "Dismissed");
        LS.addActivity("System Administrator", "Dismissed alert", activeAlertId);
        LS.closeModal("dismissReasonModal");
        modalOpen = false;
        LS.showToast("Alert dismissed", "success");
      });
    }

    const escalateBtn = document.getElementById("alertEscalateBtn");
    if (escalateBtn) {
      escalateBtn.addEventListener("click", function () {
        const caseId = "C-" + (1040 + Math.floor(Math.random() * 20));
        actionAlert(activeAlertId, "Escalated");
        LS.addActivity("System Administrator", "Escalated alert to case " + caseId, activeAlertId);
        LS.closeModal("alertReviewModal");
        modalOpen = false;
        LS.showToast("Case " + caseId + " created", "success");
      });
    }

    /* Modal open/close tracking */
    document.querySelectorAll(".modal-backdrop").forEach(function (bd) {
      const obs = new MutationObserver(function () {
        modalOpen = bd.classList.contains("open");
      });
      obs.observe(bd, { attributes: true, attributeFilter: ["class"] });
    });

    /* Outage / error sim callbacks */
    window.LB.onOutageChange = function () {
      renderStatus();
    };
    window.LB.onErrorSimChange = function (on) {
      if (on) renderLineChart();
      else renderLineChart();
    };

    /* Stale check interval */
    setInterval(checkStale, 30000);
  }

  function setupAutoRefresh() {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }
    const val = Number(LS.lsGet("autoRefresh", "0"));
    if (val > 0) {
      autoRefreshTimer = setInterval(function () {
        if (modalOpen) return;
        /* Nudge numbers slightly by re-rendering */
        renderKPIs();
        renderStatus();
        updateTimestamp();
        LS.showToast("Dashboard updated", "success");
      }, val * 1000);
    }
  }

  /* ========================================================
     INIT
     ======================================================== */
  document.addEventListener("DOMContentLoaded", function () {
    transactions = seedTransactions();
    alerts = seedAlerts();
    seedNotifications();
    seedActivity();
    systemStatus = seedSystemStatus();

    /* Restore range */
    currentRange = LS.lsGet("dashRange", "today");
    customStart = LS.lsGet("dashCustomStart", null);
    customEnd = LS.lsGet("dashCustomEnd", null);

    document.querySelectorAll(".dash-title-controls .seg-btn[data-range]").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-range") === currentRange);
    });

    initEvents();
    setupAutoRefresh();
    initAlertsScrollbar();

    /* Initial load with brief skeleton */
    refreshDashboard(true);
  });
})();

/* ===== gateway.js ===== */
/* gateway.js */

(function () {
  "use strict";

  if (!document.body.classList.contains("page-gateway")) return;

  const LS = window.LB;

  function seedProviders() {
    const existing = LS.lsGet("providers", null);
    if (existing) return existing;
    const data = [
      { id: "instapay", name: "InstaPay", env: "Production", health: "operational", uptime: "99.97%", latency: 115, successRate: "99.2%", enabled: true },
      { id: "pesonet", name: "PESONet", env: "Production", health: "operational", uptime: "99.91%", latency: 210, successRate: "98.8%", enabled: true },
      { id: "qrph", name: "QR Ph", env: "Production", health: "operational", uptime: "99.95%", latency: 95, successRate: "99.5%", enabled: true },
      { id: "card", name: "Card Acquirer", env: "Sandbox", health: "operational", uptime: "99.80%", latency: 180, successRate: "97.1%", enabled: true },
      { id: "biller-agg", name: "Biller Aggregator", env: "Production", health: "operational", uptime: "99.88%", latency: 140, successRate: "98.5%", enabled: true },
    ];
    LS.lsSet("providers", data);
    return data;
  }

  function seedBillers() {
    const existing = LS.lsGet("billers", null);
    if (existing && existing.length >= 5) return existing;
    const data = [
      { id: "B1", name: "Meralco", category: "Utilities", fee: "₱15.00", feeModel: "Flat", feeAmt: 15, enabled: true },
      { id: "B2", name: "PLDT", category: "Telecom", fee: "₱10.00", feeModel: "Flat", feeAmt: 10, enabled: true },
      { id: "B3", name: "Globe", category: "Telecom", fee: "₱10.00", feeModel: "Flat", feeAmt: 10, enabled: true },
      { id: "B4", name: "Maynilad", category: "Utilities", fee: "₱12.00", feeModel: "Flat", feeAmt: 12, enabled: true },
      { id: "B5", name: "SSS", category: "Government", fee: "₱0.00", feeModel: "Flat", feeAmt: 0, enabled: true },
      { id: "B6", name: "Cignal", category: "Entertainment", fee: "₱8.00", feeModel: "Flat", feeAmt: 8, enabled: false },
      { id: "B7", name: "Manila Water", category: "Utilities", fee: "₱12.00", feeModel: "Flat", feeAmt: 12, enabled: true },
      { id: "B8", name: "Smart", category: "Telecom", fee: "₱10.00", feeModel: "Flat", feeAmt: 10, enabled: true },
      { id: "B9", name: "Pag-IBIG", category: "Government", fee: "₱0.00", feeModel: "Flat", feeAmt: 0, enabled: true },
      { id: "B10", name: "Sky Cable", category: "Entertainment", fee: "₱8.00", feeModel: "Flat", feeAmt: 8, enabled: false },
    ];
    LS.lsSet("billers", data);
    return data;
  }

  let providers = [];
  let billers = [];
  let pendingToggle = null;
  let billerSearch = "";
  let billerCat = "all";

  function renderProviders() {
    const grid = document.getElementById("providerGrid");
    const simulateOutage = false;
    grid.innerHTML = "";

    providers.forEach(function (p) {
      let health = p.health;
      let latency = p.latency;
      if (p.id === "instapay" && simulateOutage) {
        health = "down";
        latency = 0;
      }

      const card = document.createElement("div");
      card.className = "provider-card";
      card.innerHTML =
        '<div class="provider-header"><span class="provider-name">' + p.name + '</span>' +
        '<span class="env-badge ' + (p.env === "Production" ? "production" : "") + '">' + p.env + '</span></div>' +
        '<div class="health-row"><span class="health-dot ' + health + '"></span>' +
        '<span style="font-size:13px;text-transform:capitalize">' + health + '</span></div>' +
        '<div class="provider-stats">' +
        '<div class="stat-item"><div class="stat-label">Uptime</div><div class="stat-value">' + p.uptime + '</div></div>' +
        '<div class="stat-item"><div class="stat-label">Latency</div><div class="stat-value">' + (health === "down" ? "—" : latency + " ms") + '</div></div>' +
        '<div class="stat-item"><div class="stat-label">Success rate</div><div class="stat-value">' + p.successRate + '</div></div>' +
        '</div>' +
        '<div class="toggle-row"><span style="font-size:13px">Enabled</span>' +
        '<label class="toggle-switch"><input type="checkbox" data-provider="' + p.id + '"' + (p.enabled ? " checked" : "") + '>' +
        '<span class="toggle-slider"></span></label></div>' +
        '<button type="button" class="btn btn-secondary btn-sm test-btn" data-provider="' + p.id + '">Test connection</button>' +
        '<div class="test-result-wrap" id="testResult-' + p.id + '"></div>';

      grid.appendChild(card);
    });

    grid.querySelectorAll('input[data-provider]').forEach(function (input) {
      input.addEventListener("change", function (e) {
        e.preventDefault();
        const id = input.getAttribute("data-provider");
        const p = providers.find(function (x) { return x.id === id; });
        const enabling = input.checked;
        input.checked = !enabling;
        pendingToggle = { type: "provider", id: id, enabling: enabling, input: input };
        document.getElementById("confirmToggleTitle").textContent = enabling ? "Enable " + p.name : "Disable " + p.name;
        document.getElementById("confirmToggleMsg").textContent = enabling
          ? "Enable " + p.name + "? This will route live traffic through this provider."
          : "Disable " + p.name + "? Dependent transfers may fail or use fallback routing.";
        LS.openModal("confirmToggleModal");
      });
    });

    grid.querySelectorAll(".test-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = btn.getAttribute("data-provider");
        const wrap = document.getElementById("testResult-" + id);
        wrap.innerHTML = '<span class="test-result testing">Testing...</span>';
        btn.disabled = true;
        setTimeout(function () {
          const ms = 200 + Math.floor(Math.random() * 400);
          const ok = Math.random() > 0.1;
          wrap.innerHTML = ok
            ? '<span class="test-result ok">Verified in ' + ms + " ms</span>"
            : '<span class="test-result fail">Connection failed</span>';
          btn.disabled = false;
          LS.addActivity("System Administrator", "Tested connection for " + id, id);
        }, 2000);
      });
    });
  }

  function renderBillers() {
    const grid = document.getElementById("billerGrid");
    let list = billers.slice();
    if (billerSearch) {
      const q = billerSearch.toLowerCase();
      list = list.filter(function (b) { return b.name.toLowerCase().indexOf(q) !== -1; });
    }
    if (billerCat !== "all") {
      list = list.filter(function (b) { return b.category === billerCat; });
    }

    grid.innerHTML = "";
    list.forEach(function (b) {
      const card = document.createElement("div");
      card.className = "biller-card";
      card.innerHTML =
        '<div class="biller-name">' + b.name + '</div>' +
        '<div class="biller-meta">' + b.category + " · Fee: " + b.fee + '</div>' +
        '<div class="biller-footer">' +
        '<span class="badge ' + (b.enabled ? "badge-success" : "badge-inactive") + '"><span class="badge-dot"></span>' +
        (b.enabled ? "Enabled" : "Disabled") + '</span>' +
        '<label class="toggle-switch"><input type="checkbox" data-biller="' + b.id + '"' + (b.enabled ? " checked" : "") + '>' +
        '<span class="toggle-slider"></span></label></div>';
      grid.appendChild(card);
    });

    grid.querySelectorAll('input[data-biller]').forEach(function (input) {
      input.addEventListener("change", function (e) {
        e.preventDefault();
        const id = input.getAttribute("data-biller");
        const b = billers.find(function (x) { return x.id === id; });
        const enabling = input.checked;
        input.checked = !enabling;
        pendingToggle = { type: "biller", id: id, enabling: enabling, input: input };
        document.getElementById("confirmToggleTitle").textContent = enabling ? "Enable " + b.name : "Disable " + b.name;
        document.getElementById("confirmToggleMsg").textContent = enabling
          ? "Enable " + b.name + "?"
          : "Disable " + b.name + "? Customers won't be able to pay this biller.";
        LS.openModal("confirmToggleModal");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    providers = seedProviders();
    billers = seedBillers();

    document.querySelectorAll(".tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".tab-btn").forEach(function (b) {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");
        const tab = btn.getAttribute("data-tab");
        document.getElementById("panelProviders").classList.toggle("hidden", tab !== "providers");
        document.getElementById("panelBillers").classList.toggle("hidden", tab !== "billers");
      });
    });

    document.getElementById("confirmToggleOk").addEventListener("click", function () {
      if (!pendingToggle) return;
      if (pendingToggle.type === "provider") {
        const p = providers.find(function (x) { return x.id === pendingToggle.id; });
        p.enabled = pendingToggle.enabling;
        LS.lsSet("providers", providers);
        LS.addActivity("System Administrator", (p.enabled ? "Enabled" : "Disabled") + " provider " + p.name, p.id);
        LS.showToast(p.name + (p.enabled ? " enabled" : " disabled"), "success");
        renderProviders();
      } else {
        const b = billers.find(function (x) { return x.id === pendingToggle.id; });
        b.enabled = pendingToggle.enabling;
        LS.lsSet("billers", billers);
        LS.addActivity("System Administrator", (b.enabled ? "Enabled" : "Disabled") + " biller " + b.name, b.id);
        LS.showToast(b.name + (b.enabled ? " enabled" : " disabled"), "success");
        renderBillers();
      }
      pendingToggle = null;
      LS.closeModal("confirmToggleModal");
    });

    document.getElementById("confirmToggleCancel").addEventListener("click", function () {
      pendingToggle = null;
    });

    let searchTimer = null;
    document.getElementById("billerSearch").addEventListener("input", function (e) {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        billerSearch = e.target.value.trim();
        renderBillers();
      }, 250);
    });
    document.getElementById("billerCategory").addEventListener("change", function (e) {
      billerCat = e.target.value;
      renderBillers();
    });

    document.getElementById("addBillerBtn").addEventListener("click", function () {
      document.getElementById("billerName").value = "";
      document.getElementById("billerCat").value = "";
      document.getElementById("billerFeeModel").value = "Flat";
      document.getElementById("billerFeeAmt").value = "0";
      document.getElementById("billerStatus").value = "Disabled";
      document.querySelectorAll("#addBillerModal .form-error").forEach(function (e) { e.classList.remove("visible"); });
      LS.openModal("addBillerModal");
    });

    document.getElementById("addBillerSubmit").addEventListener("click", function () {
      document.querySelectorAll("#addBillerModal .form-error").forEach(function (e) { e.classList.remove("visible"); });
      let valid = true;
      const name = document.getElementById("billerName").value.trim();
      const cat = document.getElementById("billerCat").value;
      const feeAmt = Number(document.getElementById("billerFeeAmt").value);
      if (!name || name.length < 2) {
        document.getElementById("billerNameError").textContent = "2–60 characters required";
        document.getElementById("billerNameError").classList.add("visible");
        valid = false;
      }
      if (!cat) {
        document.getElementById("billerCatError").textContent = "Select a category";
        document.getElementById("billerCatError").classList.add("visible");
        valid = false;
      }
      if (isNaN(feeAmt) || feeAmt < 0) {
        document.getElementById("billerFeeAmtError").textContent = "Must be 0 or more";
        document.getElementById("billerFeeAmtError").classList.add("visible");
        valid = false;
      }
      if (!valid) return;

      const feeModel = document.getElementById("billerFeeModel").value;
      const enabled = document.getElementById("billerStatus").value === "Enabled";
      const fee = feeModel === "Percentage" ? feeAmt + "%" : "₱" + feeAmt.toFixed(2);
      const newB = {
        id: "B" + (billers.length + 1),
        name: name,
        category: cat,
        fee: fee,
        feeModel: feeModel,
        feeAmt: feeAmt,
        enabled: enabled,
      };
      billers.push(newB);
      LS.lsSet("billers", billers);
      LS.addActivity("System Administrator", "Added biller " + name, newB.id);
      LS.closeModal("addBillerModal");
      LS.showToast("Biller added", "success");
      renderBillers();
    });

    window.LB.onOutageChange = function () { renderProviders(); };

    renderProviders();
    renderBillers();
  });
})();

/* ===== profile.js ===== */

/* profile.js – My Profile page */

(function () {
  "use strict";

  if (!document.body.classList.contains("page-profile")) return;

  const LS = window.LB;

  function defaultProfile() {
    return {
      firstName: "System",
      lastName: "Administrator",
      email: "admin@landbank.gov.ph",
      mobile: "+63 917 123 4567",
      role: "System Administrator",
      employeeId: "EMP-0001",
      department: "Digital Banking Operations",
      branch: "Head Office – Malate",
      created: "2024-01-15",
      lastLogin: new Date().toISOString(),
      password: "admin123",
    };
  }

  function getProfile() {
    const saved = LS.lsGet("adminProfile", null);
    if (saved) return saved;
    const p = defaultProfile();
    LS.lsSet("adminProfile", p);
    return p;
  }

  function initials(first, last) {
    return ((first || "S").charAt(0) + (last || "A").charAt(0)).toUpperCase();
  }

  function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = msg;
      el.classList.add("visible");
    }
  }

  function clearErrors(ids) {
    ids.forEach(function (id) {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = "";
        el.classList.remove("visible");
      }
    });
  }

  function fillForm(profile, editable) {
    document.getElementById("profFirstName").value = profile.firstName;
    document.getElementById("profLastName").value = profile.lastName;
    document.getElementById("profEmail").value = profile.email;
    document.getElementById("profMobile").value = profile.mobile;
    document.getElementById("profRole").value = profile.role;

    ["profFirstName", "profLastName", "profEmail", "profMobile"].forEach(function (id) {
      document.getElementById(id).disabled = !editable;
    });
    document.getElementById("profRole").disabled = true;
  }

  function updateHero(profile) {
    const name = profile.firstName + " " + profile.lastName;
    const init = initials(profile.firstName, profile.lastName);

    document.getElementById("profileAvatar").textContent = init;
    document.getElementById("profileDisplayName").textContent = name;
    document.getElementById("profileDisplayRole").textContent = profile.role;
    document.getElementById("profileDisplayEmail").textContent = profile.email;
    document.getElementById("profileLastLogin").textContent = LS.relativeTime(profile.lastLogin);

    document.getElementById("profEmployeeId").textContent = profile.employeeId;
    document.getElementById("profDepartment").textContent = profile.department;
    document.getElementById("profBranch").textContent = profile.branch;
    document.getElementById("profCreated").textContent = new Date(profile.created).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    document.getElementById("profSessionLogin").textContent = LS.relativeTime(profile.lastLogin);

    /* Header chip */
    const headerAvatar = document.getElementById("headerAvatar");
    const headerName = document.getElementById("headerName");
    if (headerAvatar) headerAvatar.textContent = init;
    if (headerName) headerName.textContent = name;
  }

  function setInfoEditing(on) {
    document.getElementById("editInfoBtn").classList.toggle("hidden", on);
    document.getElementById("cancelInfoBtn").classList.toggle("hidden", !on);
    document.getElementById("saveInfoBtn").classList.toggle("hidden", !on);
  }

  document.addEventListener("DOMContentLoaded", function () {
    let profile = getProfile();
    let snapshot = null;

    updateHero(profile);
    fillForm(profile, false);

    document.getElementById("editInfoBtn").addEventListener("click", function () {
      snapshot = Object.assign({}, profile);
      setInfoEditing(true);
      fillForm(profile, true);
      clearErrors(["profFirstNameError", "profLastNameError", "profEmailError", "profMobileError"]);
    });

    document.getElementById("cancelInfoBtn").addEventListener("click", function () {
      profile = snapshot || profile;
      setInfoEditing(false);
      fillForm(profile, false);
      clearErrors(["profFirstNameError", "profLastNameError", "profEmailError", "profMobileError"]);
    });

    document.getElementById("saveInfoBtn").addEventListener("click", function () {
      clearErrors(["profFirstNameError", "profLastNameError", "profEmailError", "profMobileError"]);
      const first = document.getElementById("profFirstName").value.trim();
      const last = document.getElementById("profLastName").value.trim();
      const email = document.getElementById("profEmail").value.trim();
      const mobile = document.getElementById("profMobile").value.trim();
      let valid = true;

      if (!first || first.length < 2 || !/^[A-Za-z\s]+$/.test(first)) {
        showError("profFirstNameError", "2–50 letters only");
        valid = false;
      }
      if (!last || last.length < 2 || !/^[A-Za-z\s]+$/.test(last)) {
        showError("profLastNameError", "2–50 letters only");
        valid = false;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError("profEmailError", "Enter a valid email");
        valid = false;
      }
      if (mobile && !/^\+63\s?9\d{2}\s?\d{3}\s?\d{4}$/.test(mobile.replace(/-/g, " "))) {
        showError("profMobileError", "Format: +63 9XX XXX XXXX");
        valid = false;
      }
      if (!valid) return;

      profile.firstName = first;
      profile.lastName = last;
      profile.email = email;
      profile.mobile = mobile || profile.mobile;
      LS.lsSet("adminProfile", profile);
      LS.addActivity("System Administrator", "Updated profile information", "Profile");
      setInfoEditing(false);
      fillForm(profile, false);
      updateHero(profile);
      LS.showToast("Profile updated", "success");
    });

    document.getElementById("changePasswordBtn").addEventListener("click", function () {
      clearErrors(["currentPasswordError", "newPasswordError", "confirmPasswordError"]);
      const current = document.getElementById("currentPassword").value;
      const next = document.getElementById("newPassword").value;
      const confirm = document.getElementById("confirmPassword").value;
      let valid = true;

      if (current !== profile.password) {
        showError("currentPasswordError", "Current password is incorrect");
        valid = false;
      }
      if (!next || next.length < 8) {
        showError("newPasswordError", "At least 8 characters");
        valid = false;
      }
      if (next !== confirm) {
        showError("confirmPasswordError", "Passwords do not match");
        valid = false;
      }
      if (next && next === current) {
        showError("newPasswordError", "New password must be different");
        valid = false;
      }
      if (!valid) return;

      profile.password = next;
      LS.lsSet("adminProfile", profile);
      LS.addActivity("System Administrator", "Changed password", "Profile");
      document.getElementById("passwordForm").reset();
      LS.showToast("Password changed", "success");
    });
  });
})();

/* ===== security.js ===== */
/* security.js */

(function () {
  "use strict";

  if (!document.body.classList.contains("page-security")) return;

  const LS = window.LB;
  const FIRST = ["Juan","Maria","Jose","Ana","Pedro","Rosa","Carlos","Elena","Miguel","Sofia"];
  const LAST = ["Santos","Reyes","Cruz","Bautista","Garcia","Mendoza","Torres","Flores"];
  function rand(a) { return a[Math.floor(Math.random() * a.length)]; }
  function daysAgo(d) {
    const dt = new Date();
    dt.setDate(dt.getDate() - d);
    dt.setHours(Math.floor(Math.random() * 12) + 8);
    return dt.toISOString();
  }

  function seedRules() {
    const existing = LS.lsGet("fraudRules", null);
    const rules = (existing || [
      { id: "R1", name: "Flag transfers over ₱50,000", enabled: true },
      { id: "R2", name: "Multiple failed logins", enabled: true },
    ]).filter(function (rule) {
      return rule.id !== "R3" && rule.id !== "R4";
    });
    LS.lsSet("fraudRules", rules);
    return rules;
  }

  function seedSecurityAlerts() {
    let alerts = LS.lsGet("alerts", null);
    if (alerts && alerts.length >= 5) {
      const ruleMap = [
        { key: "transfer", id: "R1" },
        { key: "device", id: "R3" },
        { key: "location", id: "R4" },
        { key: "login", id: "R2" },
        { key: "failed", id: "R2" },
        { key: "beneficiary", id: "R1" },
        { key: "bill", id: "R1" },
        { key: "qr", id: "R1" },
      ];
      alerts = alerts.map(function (a) {
        var ruleId = a.ruleId || "R1";
        var reason = (a.reason || a.rule || "").toLowerCase();
        for (var i = 0; i < ruleMap.length; i++) {
          if (reason.indexOf(ruleMap[i].key) !== -1) { ruleId = ruleMap[i].id; break; }
        }
        return Object.assign({}, a, {
          rule: a.reason ? a.reason.slice(0, 40) : (a.rule || "Fraud rule"),
          ruleId: ruleId,
          amount: a.amount || (Math.round((Math.random() * 80000 + 5000) * 100) / 100),
        });
      }).filter(function (alert) {
        return alert.ruleId !== "R3" && alert.ruleId !== "R4";
      });
      LS.lsSet("alerts", alerts);
      return alerts;
    }
    const reasons = [
      { text: "Multiple large transfers within 1 hour", ruleId: "R1" },
      { text: "Transfer amount exceeds daily pattern", ruleId: "R1" },
      { text: "Failed login attempts then transfer", ruleId: "R2" },
      { text: "QR payment to high-risk merchant", ruleId: "R1" },
      { text: "Rapid bill payments to new billers", ruleId: "R1" },
      { text: "Transfer to new beneficiary over ₱50,000", ruleId: "R1" },
    ];
    const risks = ["High","Medium","Medium","Low","Medium","Low"];
    alerts = [];
    for (let i = 0; i < reasons.length; i++) {
      alerts.push({
        id: "ALT-" + (2000 + (i < 1 ? i : i + 1)),
        risk: risks[i],
        reason: reasons[i].text,
        rule: reasons[i].text.slice(0, 40),
        ruleId: reasons[i].ruleId,
        user: rand(FIRST) + " " + rand(LAST),
        account: "****" + String(1000 + i),
        amount: Math.round((Math.random() * 80000 + 5000) * 100) / 100,
        age: (i + 1) * 2 + "h",
        created: daysAgo(0),
        status: i < 5 ? "Open" : (i === 5 ? "Dismissed" : "Actioned"),
      });
    }
    LS.lsSet("alerts", alerts);
    return alerts;
  }

  function seedAuditLogs() {
    const existing = LS.lsGet("auditLogs", null);
    if (existing && existing.length >= 50) return existing;

    const admins = ["System Administrator", "Maria Reyes", "Carlos Garcia", "Ana Cruz"];
    const actions = [
      "Viewed user profile", "Suspended user", "Approved KYC", "Dismissed alert",
      "Froze account", "Updated transfer limits", "Enabled biller", "Exported report",
      "Changed date range", "Tested connection", "Reset password", "Escalated alert",
      "Disabled provider", "Updated fee schedule", "Login", "Logout",
    ];
    const modules = ["Users", "Transactions", "Gateway", "Security", "Settings", "Dashboard"];
    const results = ["Success", "Success", "Success", "Success", "Failed"];
    const logs = [];
    for (let i = 0; i < 120; i++) {
      const admin = rand(admins);
      const action = rand(actions);
      const mod = rand(modules);
      logs.push({
        id: "AUD-" + (10000 + i),
        timestamp: daysAgo(Math.floor(i / 8)),
        admin: admin,
        action: action,
        module: mod,
        target: mod === "Users" ? "USR-" + (1000 + (i % 40)) : "—",
        ip: "203.177." + (10 + (i % 40)) + "." + (20 + (i % 200)),
        result: rand(results),
        before: action.indexOf("Updated") !== -1 ? { value: "old" } : null,
        after: action.indexOf("Updated") !== -1 ? { value: "new" } : null,
      });
    }
    logs.sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
    LS.lsSet("auditLogs", logs);
    return logs;
  }

  let rules = [];
  let alerts = [];
  let auditLogs = [];
  let alertSearch = "";
  let alertRisk = "all";
  let alertStatus = "all";
  let activeAlertId = null;
  let auditSearch = "";
  let auditFrom = "";
  let auditTo = "";
  let auditAdmin = "all";
  let auditModule = "all";
  let auditResult = "all";

  function getEnabledRuleIds() {
    return rules.filter(function (r) { return r.enabled; }).map(function (r) { return r.id; });
  }

  function alertsFromEnabledRules() {
    const enabled = getEnabledRuleIds();
    return alerts.filter(function (a) {
      return !a.ruleId || enabled.indexOf(a.ruleId) !== -1;
    });
  }

  function renderSummary() {
    const visible = alertsFromEnabledRules();
    const open = visible.filter(function (a) { return a.status === "Open"; });
    const high = open.filter(function (a) { return a.risk === "High"; });
    const resolved = visible.filter(function (a) {
      return a.status !== "Open" && new Date(a.created).toDateString() === new Date().toDateString();
    });
    document.getElementById("fraudSummary").innerHTML =
      '<div class="fraud-stat"><div class="fraud-stat-label">High Risk</div><div class="fraud-stat-value text-failed">' + high.length + '</div></div>' +
      '<div class="fraud-stat"><div class="fraud-stat-label">Open Alerts</div><div class="fraud-stat-value">' + open.length + '</div></div>' +
      '<div class="fraud-stat"><div class="fraud-stat-label">Resolved today</div><div class="fraud-stat-value text-success">' + resolved.length + '</div></div>';
  }

  function renderRules() {
    const el = document.getElementById("fraudRules");
    el.innerHTML = "";
    rules.forEach(function (r) {
      const item = document.createElement("div");
      item.className = "rule-item";
      item.innerHTML =
        "<span>" + r.name + "</span>" +
        '<label class="toggle-switch"><input type="checkbox" data-rule="' + r.id + '"' + (r.enabled ? " checked" : "") + '>' +
        '<span class="toggle-slider"></span></label>';
      el.appendChild(item);
    });
    el.querySelectorAll("input").forEach(function (input) {
      input.addEventListener("change", function () {
        const id = input.getAttribute("data-rule");
        const rule = rules.find(function (x) { return x.id === id; });
        rule.enabled = input.checked;
        LS.lsSet("fraudRules", rules);
        LS.addActivity("System Administrator", (rule.enabled ? "Enabled" : "Disabled") + " rule: " + rule.name, id);
        LS.showToast("Rule " + (rule.enabled ? "enabled" : "disabled"), "success");
        renderSummary();
        renderAlerts();
      });
    });
  }

  function riskBadge(r) {
    const map = { High: "badge-risk-high", Medium: "badge-risk-medium", Low: "badge-risk-low" };
    return '<span class="badge ' + (map[r] || "") + '"><span class="badge-dot"></span>' + r + "</span>";
  }

  function statusBadge(s) {
    const map = { Open: "badge-pending", Dismissed: "badge-inactive", Actioned: "badge-success", Escalated: "badge-info", Success: "badge-success", Failed: "badge-failed" };
    return '<span class="badge ' + (map[s] || "badge-inactive") + '"><span class="badge-dot"></span>' + s + "</span>";
  }

  function renderAlerts() {
    let list = alertsFromEnabledRules();
    if (alertSearch) {
      const q = alertSearch.toLowerCase();
      list = list.filter(function (a) {
        return a.id.toLowerCase().indexOf(q) !== -1 || a.user.toLowerCase().indexOf(q) !== -1 || (a.rule || "").toLowerCase().indexOf(q) !== -1;
      });
    }
    if (alertRisk !== "all") list = list.filter(function (a) { return a.risk === alertRisk; });
    if (alertStatus !== "all") list = list.filter(function (a) { return a.status === alertStatus; });

    const tbody = document.getElementById("alertsTableBody");
    tbody.innerHTML = "";
    list.forEach(function (a) {
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + a.id + "</td>" +
        "<td>" + a.user + "</td>" +
        "<td>" + (a.rule || a.reason || "—") + "</td>" +
        "<td>" + riskBadge(a.risk) + "</td>" +
        "<td>" + LS.formatPHP(a.amount || 0) + "</td>" +
        "<td>" + LS.relativeTime(a.created) + "</td>" +
        "<td>" + statusBadge(a.status) + "</td>" +
        "<td>" + (a.status === "Open"
          ? '<button type="button" class="btn btn-ghost btn-sm sec-review" data-id="' + a.id + '">Review</button>'
          : "—") + "</td>";
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".sec-review").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        openReview(btn.getAttribute("data-id"));
      });
    });
  }

  function openReview(id) {
    activeAlertId = id;
    const a = alerts.find(function (x) { return x.id === id; });
    if (!a) return;
    document.getElementById("alertReviewBody").innerHTML =
      '<div style="margin-bottom:12px">' + riskBadge(a.risk) + '</div>' +
      '<div class="detail-row"><span class="label">Alert ID</span><span class="value">' + a.id + '</span></div>' +
      '<div class="detail-row"><span class="label">User</span><span class="value">' + a.user + '</span></div>' +
      '<div class="detail-row"><span class="label">Rule</span><span class="value">' + (a.rule || a.reason) + '</span></div>' +
      '<div class="detail-row"><span class="label">Amount</span><span class="value">' + LS.formatPHP(a.amount || 0) + '</span></div>' +
      '<div class="detail-row"><span class="label">Status</span><span class="value">' + a.status + '</span></div>';
    LS.openModal("alertReviewModal");
  }

  function renderAudit() {
    let list = auditLogs.slice();
    if (auditSearch) {
      const q = auditSearch.toLowerCase();
      list = list.filter(function (l) {
        return l.action.toLowerCase().indexOf(q) !== -1 || l.admin.toLowerCase().indexOf(q) !== -1 || l.target.toLowerCase().indexOf(q) !== -1;
      });
    }
    if (auditFrom) {
      const from = new Date(auditFrom); from.setHours(0, 0, 0, 0);
      list = list.filter(function (l) { return new Date(l.timestamp) >= from; });
    }
    if (auditTo) {
      const to = new Date(auditTo); to.setHours(23, 59, 59, 999);
      list = list.filter(function (l) { return new Date(l.timestamp) <= to; });
    }
    if (auditAdmin !== "all") list = list.filter(function (l) { return l.admin === auditAdmin; });
    if (auditModule !== "all") list = list.filter(function (l) { return l.module === auditModule; });
    if (auditResult !== "all") list = list.filter(function (l) { return l.result === auditResult; });

    const tbody = document.getElementById("auditTableBody");
    tbody.innerHTML = "";
    list.slice(0, 100).forEach(function (l) {
      const tr = document.createElement("tr");
      const ts = new Date(l.timestamp).toLocaleString("en-PH", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila",
      });
      tr.innerHTML =
        "<td>" + ts + "</td>" +
        "<td>" + l.admin + "</td>" +
        "<td>" + l.action + "</td>" +
        "<td>" + l.module + "</td>" +
        "<td>" + l.target + "</td>" +
        "<td>" + l.ip + "</td>" +
        "<td>" + statusBadge(l.result) + "</td>";
      tr.addEventListener("click", function () {
        document.getElementById("auditDetailBody").innerHTML =
          '<div class="detail-row"><span class="label">ID</span><span class="value">' + l.id + '</span></div>' +
          '<div class="detail-row"><span class="label">Timestamp</span><span class="value">' + ts + '</span></div>' +
          '<div class="detail-row"><span class="label">Admin</span><span class="value">' + l.admin + '</span></div>' +
          '<div class="detail-row"><span class="label">Action</span><span class="value">' + l.action + '</span></div>' +
          '<div class="detail-row"><span class="label">Module</span><span class="value">' + l.module + '</span></div>' +
          '<div class="detail-row"><span class="label">Target</span><span class="value">' + l.target + '</span></div>' +
          '<div class="detail-row"><span class="label">IP</span><span class="value">' + l.ip + '</span></div>' +
          '<div class="detail-row"><span class="label">Result</span><span class="value">' + l.result + '</span></div>' +
          (l.before ? '<div class="detail-row"><span class="label">Before</span><span class="value">' + JSON.stringify(l.before) + '</span></div>' : "") +
          (l.after ? '<div class="detail-row"><span class="label">After</span><span class="value">' + JSON.stringify(l.after) + '</span></div>' : "");
        LS.openModal("auditDetailModal");
      });
      tbody.appendChild(tr);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    rules = seedRules();
    alerts = seedSecurityAlerts();
    auditLogs = seedAuditLogs();

    const admins = [];
    auditLogs.forEach(function (l) {
      if (admins.indexOf(l.admin) === -1) admins.push(l.admin);
    });
    const adminSelect = document.getElementById("auditAdmin");
    admins.forEach(function (a) {
      const opt = document.createElement("option");
      opt.value = a;
      opt.textContent = a;
      adminSelect.appendChild(opt);
    });

    document.querySelectorAll(".tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".tab-btn").forEach(function (b) {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");
        const tab = btn.getAttribute("data-tab");
        document.getElementById("panelFraud").classList.toggle("hidden", tab !== "fraud");
        document.getElementById("panelAudit").classList.toggle("hidden", tab !== "audit");
        if (tab === "audit") renderAudit();
      });
    });

    let t1 = null;
    document.getElementById("alertSearch").addEventListener("input", function (e) {
      clearTimeout(t1);
      t1 = setTimeout(function () { alertSearch = e.target.value.trim(); renderAlerts(); }, 250);
    });
    document.getElementById("alertRiskFilter").addEventListener("change", function (e) {
      alertRisk = e.target.value; renderAlerts();
    });
    document.getElementById("alertStatusFilter").addEventListener("change", function (e) {
      alertStatus = e.target.value; renderAlerts();
    });

    document.getElementById("secDismissBtn").addEventListener("click", function () {
      LS.closeModal("alertReviewModal");
      document.getElementById("dismissReason").value = "";
      document.getElementById("dismissNote").value = "";
      document.getElementById("dismissNoteGroup").classList.add("hidden");
      LS.openModal("dismissModal");
    });

    document.getElementById("dismissReason").addEventListener("change", function () {
      document.getElementById("dismissNoteGroup").classList.toggle("hidden", this.value !== "Other");
    });

    document.getElementById("dismissConfirm").addEventListener("click", function () {
      const reason = document.getElementById("dismissReason").value;
      document.getElementById("dismissReasonError").classList.remove("visible");
      document.getElementById("dismissNoteError").classList.remove("visible");
      if (!reason) {
        document.getElementById("dismissReasonError").textContent = "Select a reason";
        document.getElementById("dismissReasonError").classList.add("visible");
        return;
      }
      if (reason === "Other" && document.getElementById("dismissNote").value.trim().length < 10) {
        document.getElementById("dismissNoteError").textContent = "Enter at least 10 characters";
        document.getElementById("dismissNoteError").classList.add("visible");
        return;
      }
      alerts = alerts.map(function (a) {
        if (a.id === activeAlertId) return Object.assign({}, a, { status: "Dismissed" });
        return a;
      });
      LS.lsSet("alerts", alerts);
      LS.addActivity("System Administrator", "Dismissed alert", activeAlertId);
      LS.closeModal("dismissModal");
      LS.showToast("Alert dismissed", "success");
      renderSummary();
      renderAlerts();
    });

    document.getElementById("secFreezeBtn").addEventListener("click", function () {
      LS.closeModal("alertReviewModal");
      const a = alerts.find(function (x) { return x.id === activeAlertId; });
      document.getElementById("freezeSummary").innerHTML = "<strong>" + (a ? a.user : "") + "</strong><br>" + (a ? a.reason || a.rule : "");
      document.getElementById("freezeReason").value = "";
      document.getElementById("freezePassword").value = "";
      document.querySelectorAll('input[name="freezeScope"]').forEach(function (r) { r.checked = false; });
      document.querySelectorAll("#freezeModal .form-error").forEach(function (e) { e.classList.remove("visible"); });
      LS.openModal("freezeModal");
    });

    const fr = document.getElementById("freezeReason");
    const fc = document.getElementById("freezeReasonCount");
    fr.addEventListener("input", function () { fc.textContent = fr.value.length + " / 250"; });

    document.getElementById("freezeSubmit").addEventListener("click", function () {
      document.querySelectorAll("#freezeModal .form-error").forEach(function (e) { e.classList.remove("visible"); });
      let valid = true;
      if (!document.querySelector('input[name="freezeScope"]:checked')) {
        document.getElementById("freezeScopeError").textContent = "Select a freeze scope";
        document.getElementById("freezeScopeError").classList.add("visible");
        valid = false;
      }
      if (fr.value.trim().length < 10) {
        document.getElementById("freezeReasonError").textContent = "Enter at least 10 characters";
        document.getElementById("freezeReasonError").classList.add("visible");
        valid = false;
      }
      if (document.getElementById("freezePassword").value !== "admin123") {
        document.getElementById("freezePasswordError").textContent = "Incorrect password";
        document.getElementById("freezePasswordError").classList.add("visible");
        valid = false;
      }
      if (!valid) return;
      alerts = alerts.map(function (a) {
        if (a.id === activeAlertId) return Object.assign({}, a, { status: "Actioned" });
        return a;
      });
      LS.lsSet("alerts", alerts);
      LS.addActivity("System Administrator", "Froze account for alert " + activeAlertId, activeAlertId);
      LS.closeModal("freezeModal");
      LS.showToast("Account frozen", "success");
      renderSummary();
      renderAlerts();
    });

    let t2 = null;
    document.getElementById("auditSearch").addEventListener("input", function (e) {
      clearTimeout(t2);
      t2 = setTimeout(function () { auditSearch = e.target.value.trim(); renderAudit(); }, 250);
    });
    ["auditFrom", "auditTo", "auditAdmin", "auditModule", "auditResult"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", function () {
        auditFrom = document.getElementById("auditFrom").value;
        auditTo = document.getElementById("auditTo").value;
        auditAdmin = document.getElementById("auditAdmin").value;
        auditModule = document.getElementById("auditModule").value;
        auditResult = document.getElementById("auditResult").value;
        renderAudit();
      });
    });

    document.getElementById("auditExport").addEventListener("click", function () {
      function fmtDate(iso) {
        try {
          var d = new Date(iso);
          var y = d.getFullYear();
          var m = String(d.getMonth() + 1).padStart(2, "0");
          var day = String(d.getDate()).padStart(2, "0");
          var h = String(d.getHours()).padStart(2, "0");
          var min = String(d.getMinutes()).padStart(2, "0");
          var sec = String(d.getSeconds()).padStart(2, "0");
          return y + "-" + m + "-" + day + " " + h + ":" + min + ":" + sec;
        } catch (e) {
          return iso || "";
        }
      }
      var head = ["Timestamp", "Admin", "Action", "Module", "Target", "IP Address", "Result"];
      var body = auditLogs.map(function (l) {
        var target = (l.target === "\u2014" || l.target === "\u2013" || l.target === "—") ? "-" : (l.target || "-");
        return [
          fmtDate(l.timestamp),
          l.admin || "",
          l.action || "",
          l.module || "",
          target,
          l.ip || "",
          l.result || ""
        ];
      });
      var doc = new window.jspdf.jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.autoTable({
        head: [head],
        body: body,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 4,
          overflow: "linebreak",
          halign: "left",
          lineColor: [208, 208, 208],
          lineWidth: 1
        },
        headStyles: {
          fillColor: [11, 110, 79],
          textColor: 255,
          fontStyle: "bold",
         halign: "left"
        },
        alternateRowStyles: {
          fillColor: [245, 249, 247]
        },
        margin: { top: 30 },
        showHead: "everyPage"
      });
      doc.save("audit-logs.pdf");
      LS.showToast("Export is ready", "success");
    });

    renderSummary();
    renderRules();
    renderAlerts();
  });
})();

/* ===== settings.js ===== */
/* settings.js */

(function () {
  "use strict";

  if (!document.body.classList.contains("page-settings")) return;

  const LS = window.LB;

  function seedLimits() {
    const existing = LS.lsGet("transferLimits", null);
    if (existing) return existing;
    const data = [
      { tier: 1, perTx: 50000, daily: 100000, monthly: 500000 },
      { tier: 2, perTx: 100000, daily: 250000, monthly: 1000000 },
      { tier: 3, perTx: 500000, daily: 1000000, monthly: 5000000 },
    ];
    LS.lsSet("transferLimits", data);
    return data;
  }

  function seedFees() {
    const existing = LS.lsGet("fees", null);
    if (existing) return existing;
    const data = [
      { service: "InstaPay transfer", model: "Flat", amount: 15, min: 0, max: 15 },
      { service: "PESONet transfer", model: "Flat", amount: 25, min: 0, max: 25 },
      { service: "QR Ph payment", model: "Percentage", amount: 0.5, min: 5, max: 50 },
      { service: "Bill payment", model: "Flat", amount: 10, min: 0, max: 10 },
      { service: "Cash in", model: "Flat", amount: 0, min: 0, max: 0 },
    ];
    LS.lsSet("fees", data);
    return data;
  }

  let limits = [];
  let fees = [];
  let editingSection = null;
  let limitsSnapshot = null;
  let feesSnapshot = null;
  let maintSnapshot = null;
  let appearSnapshot = null;
  let pendingSection = null;

  function setEditing(section, on) {
    editingSection = on ? section : null;
    const map = {
      limits: ["editLimitsBtn", "cancelLimitsBtn", "saveLimitsBtn"],
      fees: ["editFeesBtn", "cancelFeesBtn", "saveFeesBtn"],
      maintenance: ["editMaintBtn", "cancelMaintBtn", "saveMaintBtn"],
      appearance: ["editAppearBtn", "cancelAppearBtn", "saveAppearBtn"],
    };
    Object.keys(map).forEach(function (s) {
      const ids = map[s];
      const isThis = s === section && on;
      document.getElementById(ids[0]).classList.toggle("hidden", isThis);
      document.getElementById(ids[1]).classList.toggle("hidden", !isThis);
      document.getElementById(ids[2]).classList.toggle("hidden", !isThis);
    });
  }

  function renderLimits(editable) {
    const tbody = document.getElementById("limitsBody");
    tbody.innerHTML = "";
    limits.forEach(function (row, idx) {
      const tr = document.createElement("tr");
      if (editable) {
        tr.innerHTML =
          "<td>Tier " + row.tier + "</td>" +
          '<td><input type="number" min="1" data-field="perTx" data-idx="' + idx + '" value="' + row.perTx + '"></td>' +
          '<td><input type="number" min="1" data-field="daily" data-idx="' + idx + '" value="' + row.daily + '"></td>' +
          '<td><input type="number" min="1" data-field="monthly" data-idx="' + idx + '" value="' + row.monthly + '"></td>';
      } else {
        tr.innerHTML =
          "<td>Tier " + row.tier + "</td>" +
          "<td>" + LS.formatPHP(row.perTx) + "</td>" +
          "<td>" + LS.formatPHP(row.daily) + "</td>" +
          "<td>" + LS.formatPHP(row.monthly) + "</td>";
      }
      tbody.appendChild(tr);
    });
  }

  function renderFees(editable) {
    const tbody = document.getElementById("feesBody");
    tbody.innerHTML = "";
    fees.forEach(function (row, idx) {
      const tr = document.createElement("tr");
      if (editable) {
        tr.innerHTML =
          "<td>" + row.service + "</td>" +
          '<td><select data-field="model" data-idx="' + idx + '"><option value="Flat"' + (row.model === "Flat" ? " selected" : "") + '>Flat</option><option value="Percentage"' + (row.model === "Percentage" ? " selected" : "") + '>Percentage</option></select></td>' +
          '<td><input type="number" min="0" step="0.01" data-field="amount" data-idx="' + idx + '" value="' + row.amount + '"></td>' +
          '<td><input type="number" min="0" step="0.01" data-field="min" data-idx="' + idx + '" value="' + row.min + '"></td>' +
          '<td><input type="number" min="0" step="0.01" data-field="max" data-idx="' + idx + '" value="' + row.max + '"></td>';
      } else {
        const amt = row.model === "Percentage" ? row.amount + "%" : LS.formatPHP(row.amount);
        tr.innerHTML =
          "<td>" + row.service + "</td>" +
          "<td>" + row.model + "</td>" +
          "<td>" + amt + "</td>" +
          "<td>" + LS.formatPHP(row.min) + "</td>" +
          "<td>" + LS.formatPHP(row.max) + "</td>";
      }
      tbody.appendChild(tr);
    });
  }

  function renderMaint(editable) {
    const maint = LS.lsGet("maintenance", { active: false, start: "", end: "", message: "" });
    const card = document.getElementById("maintStatusCard");
    if (maint.active) {
      card.className = "maint-status on";
      const from = maint.start ? LS.formatMaintDate(maint.start) : "—";
      const to = maint.end ? LS.formatMaintDate(maint.end) : "—";
      const currentlyOn = LS.isMaintenanceCurrentlyActive(maint);
      if (currentlyOn) {
        card.textContent = "Maintenance is active from " + from + " to " + to;
      } else {
        card.textContent = "Maintenance scheduled from " + from + " to " + to;
      }
    } else {
      card.className = "maint-status off";
      card.textContent = "Maintenance is off. System is operating normally.";
    }
    document.getElementById("maintActive").checked = !!maint.active;
    document.getElementById("maintStart").value = maint.start || "";
    document.getElementById("maintEnd").value = maint.end || "";
    document.getElementById("maintMessage").value = maint.message || "";
    document.getElementById("maintMessageCount").textContent = (maint.message || "").length + " / 200";

    ["maintActive", "maintStart", "maintEnd", "maintMessage"].forEach(function (id) {
      document.getElementById(id).disabled = !editable;
    });
  }

  function renderAppear(editable) {
    const theme = LS.lsGet("theme", "light");
    const density = LS.lsGet("density", "comfortable");
    document.querySelectorAll('input[name="theme"]').forEach(function (r) {
      r.checked = r.value === theme;
      r.disabled = !editable;
    });
    document.querySelectorAll('input[name="density"]').forEach(function (r) {
      r.checked = r.value === density;
      r.disabled = !editable;
    });
  }

  function showSection(section) {
    if (editingSection && editingSection !== section) {
      pendingSection = section;
      LS.openModal("discardModal");
      return;
    }
    document.querySelectorAll(".settings-nav-btn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-section") === section);
    });
    document.getElementById("panelLimits").classList.toggle("hidden", section !== "limits");
    document.getElementById("panelFees").classList.toggle("hidden", section !== "fees");
    document.getElementById("panelMaintenance").classList.toggle("hidden", section !== "maintenance");
    document.getElementById("panelAppearance").classList.toggle("hidden", section !== "appearance");
  }

  function validateLimits() {
    const err = document.getElementById("limitsError");
    err.classList.remove("visible");
    err.textContent = "";
    for (let i = 0; i < limits.length; i++) {
      const r = limits[i];
      if (r.perTx < 1 || r.daily < 1 || r.monthly < 1) {
        err.textContent = "Values must be at least 1.";
        err.classList.add("visible");
        return false;
      }
      if (r.perTx > r.daily) {
        err.textContent = "Daily limit can't be lower than the per-transaction limit (Tier " + r.tier + ").";
        err.classList.add("visible");
        return false;
      }
      if (r.daily > r.monthly) {
        err.textContent = "Monthly limit can't be lower than the daily limit (Tier " + r.tier + ").";
        err.classList.add("visible");
        return false;
      }
      if (i > 0) {
        const prev = limits[i - 1];
        if (r.perTx < prev.perTx || r.daily < prev.daily || r.monthly < prev.monthly) {
          err.textContent = "Higher tiers cannot have lower limits than lower tiers.";
          err.classList.add("visible");
          return false;
        }
      }
    }
    return true;
  }

  function validateFees() {
    const err = document.getElementById("feesError");
    err.classList.remove("visible");
    err.textContent = "";
    for (let i = 0; i < fees.length; i++) {
      const r = fees[i];
      if (r.model === "Percentage" && (r.amount < 0 || r.amount > 10)) {
        err.textContent = "Percentage amount must be 0 to 10.";
        err.classList.add("visible");
        return false;
      }
      if (r.min > r.max) {
        err.textContent = "Min cannot be greater than max (" + r.service + ").";
        err.classList.add("visible");
        return false;
      }
    }
    return true;
  }

  function readLimitsFromDom() {
    document.querySelectorAll("#limitsBody input").forEach(function (input) {
      const idx = Number(input.getAttribute("data-idx"));
      const field = input.getAttribute("data-field");
      limits[idx][field] = Number(input.value);
    });
  }

  function readFeesFromDom() {
    document.querySelectorAll("#feesBody input, #feesBody select").forEach(function (el) {
      const idx = Number(el.getAttribute("data-idx"));
      const field = el.getAttribute("data-field");
      if (field === "model") fees[idx][field] = el.value;
      else fees[idx][field] = Number(el.value);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    limits = seedLimits();
    fees = seedFees();

    document.querySelectorAll(".settings-nav-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showSection(btn.getAttribute("data-section"));
      });
    });

    /* Limits */
    document.getElementById("editLimitsBtn").addEventListener("click", function () {
      limitsSnapshot = JSON.parse(JSON.stringify(limits));
      setEditing("limits", true);
      renderLimits(true);
    });
    document.getElementById("cancelLimitsBtn").addEventListener("click", function () {
      limits = JSON.parse(JSON.stringify(limitsSnapshot));
      setEditing("limits", false);
      document.getElementById("limitsError").classList.remove("visible");
      renderLimits(false);
    });
    document.getElementById("saveLimitsBtn").addEventListener("click", function () {
      readLimitsFromDom();
      if (!validateLimits()) return;
      LS.lsSet("transferLimits", limits);
      LS.addActivity("System Administrator", "Updated transfer limits", "Settings");
      setEditing("limits", false);
      renderLimits(false);
      LS.showToast("Transfer limits saved", "success");
    });

    /* Fees */
    document.getElementById("editFeesBtn").addEventListener("click", function () {
      feesSnapshot = JSON.parse(JSON.stringify(fees));
      setEditing("fees", true);
      renderFees(true);
    });
    document.getElementById("cancelFeesBtn").addEventListener("click", function () {
      fees = JSON.parse(JSON.stringify(feesSnapshot));
      setEditing("fees", false);
      document.getElementById("feesError").classList.remove("visible");
      renderFees(false);
    });
    document.getElementById("saveFeesBtn").addEventListener("click", function () {
      readFeesFromDom();
      if (!validateFees()) return;
      LS.lsSet("fees", fees);
      LS.addActivity("System Administrator", "Updated fees and charges", "Settings");
      setEditing("fees", false);
      renderFees(false);
      LS.showToast("Fees saved", "success");
    });

    /* Maintenance */
    document.getElementById("editMaintBtn").addEventListener("click", function () {
      maintSnapshot = LS.lsGet("maintenance", { active: false, start: "", end: "", message: "" });
      setEditing("maintenance", true);
      renderMaint(true);
    });
    document.getElementById("cancelMaintBtn").addEventListener("click", function () {
      LS.lsSet("maintenance", maintSnapshot);
      setEditing("maintenance", false);
      renderMaint(false);
      LS.checkMaintenance();
    });
    document.getElementById("saveMaintBtn").addEventListener("click", function () {
      document.getElementById("maintStartError").classList.remove("visible");
      document.getElementById("maintEndError").classList.remove("visible");
      document.getElementById("maintMessageError").classList.remove("visible");
      const active = document.getElementById("maintActive").checked;
      const start = document.getElementById("maintStart").value;
      const end = document.getElementById("maintEnd").value;
      const message = document.getElementById("maintMessage").value.trim();
      let valid = true;
      if (active) {
        if (!start) {
          document.getElementById("maintStartError").textContent = "Start date is required";
          document.getElementById("maintStartError").classList.add("visible");
          valid = false;
        }
        if (!end) {
          document.getElementById("maintEndError").textContent = "End date is required";
          document.getElementById("maintEndError").classList.add("visible");
          valid = false;
        }
        if (start && end && new Date(end) <= new Date(start)) {
          document.getElementById("maintEndError").textContent = "End must be after Start";
          document.getElementById("maintEndError").classList.add("visible");
          valid = false;
        }
        if (message.length < 20 || message.length > 200) {
          document.getElementById("maintMessageError").textContent = "Message must be 20 to 200 characters";
          document.getElementById("maintMessageError").classList.add("visible");
          valid = false;
        }
      }
      if (!valid) return;
      const data = active
        ? { active: true, start: start, end: end, message: message }
        : { active: false, start: "", end: "", message: "" };
      LS.lsSet("maintenance", data);
      LS.addActivity("System Administrator", active ? "Enabled maintenance mode" : "Disabled maintenance mode", "Settings");
      setEditing("maintenance", false);
      renderMaint(false);
      LS.checkMaintenance();
      LS.showToast(active ? "Maintenance mode enabled" : "Maintenance mode disabled", "success");
    });

    document.getElementById("maintMessage").addEventListener("input", function () {
      document.getElementById("maintMessageCount").textContent = this.value.length + " / 200";
    });

    document.getElementById("maintActive").addEventListener("change", function () {
      if (!this.checked) {
        document.getElementById("maintStart").value = "";
        document.getElementById("maintEnd").value = "";
        document.getElementById("maintMessage").value = "";
        document.getElementById("maintMessageCount").textContent = "0 / 200";
        document.getElementById("maintStartError").classList.remove("visible");
        document.getElementById("maintEndError").classList.remove("visible");
        document.getElementById("maintMessageError").classList.remove("visible");
      }
    });

    /* Appearance */
    document.getElementById("editAppearBtn").addEventListener("click", function () {
      appearSnapshot = {
        theme: LS.lsGet("theme", "light"),
        density: LS.lsGet("density", "comfortable"),
      };
      setEditing("appearance", true);
      renderAppear(true);
    });
    document.getElementById("cancelAppearBtn").addEventListener("click", function () {
      LS.lsSet("theme", appearSnapshot.theme);
      LS.lsSet("density", appearSnapshot.density);
      LS.applyTheme();
      LS.applyDensity();
      setEditing("appearance", false);
      renderAppear(false);
    });
    document.getElementById("saveAppearBtn").addEventListener("click", function () {
      const theme = document.querySelector('input[name="theme"]:checked').value;
      const density = document.querySelector('input[name="density"]:checked').value;
      LS.lsSet("theme", theme);
      LS.lsSet("density", density);
      LS.applyTheme();
      LS.applyDensity();
      LS.addActivity("System Administrator", "Updated appearance settings", "Settings");
      setEditing("appearance", false);
      renderAppear(false);
      LS.showToast("Appearance saved", "success");
    });

    /* Discard */
    document.getElementById("discardConfirmBtn").addEventListener("click", function () {
      if (editingSection === "limits") {
        limits = JSON.parse(JSON.stringify(limitsSnapshot));
        renderLimits(false);
      } else if (editingSection === "fees") {
        fees = JSON.parse(JSON.stringify(feesSnapshot));
        renderFees(false);
      } else if (editingSection === "maintenance") {
        LS.lsSet("maintenance", maintSnapshot);
        renderMaint(false);
        LS.checkMaintenance();
      } else if (editingSection === "appearance") {
        LS.lsSet("theme", appearSnapshot.theme);
        LS.lsSet("density", appearSnapshot.density);
        LS.applyTheme();
        LS.applyDensity();
        renderAppear(false);
      }
      setEditing(null, false);
      LS.closeModal("discardModal");
      if (pendingSection) {
        const s = pendingSection;
        pendingSection = null;
        showSection(s);
      }
    });

    document.getElementById("keepEditingBtn").addEventListener("click", function () {
      pendingSection = null;
    });

    renderLimits(false);
    renderFees(false);
    renderMaint(false);
    renderAppear(false);
  });
})();

/* ===== transactions.js ===== */
/* transactions.js */

(function () {
  "use strict";

  if (!document.body.classList.contains("page-transactions")) return;

  const LS = window.LB;
  const ERROR_CODES = {
    "RJCT-AC04": "Receiving account closed",
    "RJCT-AC06": "Account blocked",
    "RJCT-AM04": "Insufficient funds",
    "RJCT-BE01": "Invalid beneficiary details",
    "RJCT-TM01": "Timeout at receiving bank",
    "RJCT-FF01": "Invalid file format",
  };

  let transactions = [];
  let statusFilter = "all";
  let searchTerm = "";
  let dateFrom = "";
  let dateTo = "";
  let typeFilter = "all";
  let channelFilter = "all";
  let railFilter = "all";
  let amtMin = "";
  let amtMax = "";
  let sortCol = null;
  let sortDir = null;
  let page = 1;
  let pageSize = 10;
  let activeTx = null;

  function getFiltered() {
    let list = transactions.slice();

    if (statusFilter === "Failed") {
      list = list.filter(function (t) { return t.status === "Failed" || t.status === "Flagged"; });
    } else if (statusFilter !== "all") {
      list = list.filter(function (t) { return t.status === statusFilter; });
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(function (t) {
        return t.id.toLowerCase().indexOf(q) !== -1 ||
          t.user.toLowerCase().indexOf(q) !== -1 ||
          t.description.toLowerCase().indexOf(q) !== -1 ||
          t.account.indexOf(q) !== -1;
      });
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      list = list.filter(function (t) { return new Date(t.date) >= from; });
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter(function (t) { return new Date(t.date) <= to; });
    }
    if (typeFilter !== "all") list = list.filter(function (t) { return t.type === typeFilter; });
    if (channelFilter !== "all") list = list.filter(function (t) { return t.channel === channelFilter; });
    if (railFilter !== "all") list = list.filter(function (t) { return t.rail === railFilter; });
    if (amtMin !== "") list = list.filter(function (t) { return t.amount >= Number(amtMin); });
    if (amtMax !== "") list = list.filter(function (t) { return t.amount <= Number(amtMax); });

    if (sortCol === "date") {
      list.sort(function (a, b) {
        const d = new Date(a.date) - new Date(b.date);
        return sortDir === "asc" ? d : -d;
      });
    } else if (sortCol === "amount") {
      list.sort(function (a, b) {
        const d = a.amount - b.amount;
        return sortDir === "asc" ? d : -d;
      });
    } else {
      list.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    }
    return list;
  }

  function renderSummary() {
    const all = transactions;
    document.getElementById("sumTotal").textContent = all.length;
    document.getElementById("sumSuccess").textContent = all.filter(function (t) { return t.status === "Success"; }).length;
    document.getElementById("sumPending").textContent = all.filter(function (t) { return t.status === "Pending"; }).length;
    document.getElementById("sumFailed").textContent = all.filter(function (t) { return t.status === "Failed" || t.status === "Flagged"; }).length;
  }

  function renderChips() {
    const container = document.getElementById("filterChips");
    container.innerHTML = "";
    const chips = [];
    if (statusFilter !== "all") chips.push({ key: "status", label: "Status: " + statusFilter });
    if (typeFilter !== "all") chips.push({ key: "type", label: "Type: " + typeFilter });
    if (channelFilter !== "all") chips.push({ key: "channel", label: "Channel: " + channelFilter });
    if (railFilter !== "all") chips.push({ key: "rail", label: "Rail: " + railFilter });
    if (dateFrom) chips.push({ key: "dateFrom", label: "From: " + dateFrom });
    if (dateTo) chips.push({ key: "dateTo", label: "To: " + dateTo });
    if (amtMin !== "") chips.push({ key: "amtMin", label: "Min: ₱" + amtMin });
    if (amtMax !== "") chips.push({ key: "amtMax", label: "Max: ₱" + amtMax });
    if (searchTerm) chips.push({ key: "search", label: "Search: " + searchTerm });

    chips.forEach(function (c) {
      const el = document.createElement("span");
      el.className = "filter-chip";
      el.innerHTML = c.label + ' <button type="button" aria-label="Remove filter">×</button>';
      el.querySelector("button").addEventListener("click", function () {
        removeFilter(c.key);
      });
      container.appendChild(el);
    });
  }

  function removeFilter(key) {
    if (key === "status") { statusFilter = "all"; document.getElementById("txStatus").value = "all"; document.querySelectorAll(".summary-card").forEach(function (c) { c.classList.toggle("active", c.getAttribute("data-status") === "all"); }); }
    if (key === "type") { typeFilter = "all"; document.getElementById("txType").value = "all"; }
    if (key === "channel") { channelFilter = "all"; document.getElementById("txChannel").value = "all"; }
    if (key === "rail") { railFilter = "all"; document.getElementById("txRail").value = "all"; }
    if (key === "dateFrom") { dateFrom = ""; document.getElementById("txDateFrom").value = ""; }
    if (key === "dateTo") { dateTo = ""; document.getElementById("txDateTo").value = ""; }
    if (key === "amtMin") { amtMin = ""; document.getElementById("txAmtMin").value = ""; }
    if (key === "amtMax") { amtMax = ""; document.getElementById("txAmtMax").value = ""; }
    if (key === "search") { searchTerm = ""; document.getElementById("txSearch").value = ""; }
    page = 1;
    renderTable();
  }

  function resetFilters() {
    statusFilter = "all";
    searchTerm = "";
    dateFrom = "";
    dateTo = "";
    typeFilter = "all";
    channelFilter = "all";
    railFilter = "all";
    amtMin = "";
    amtMax = "";
    document.getElementById("txSearch").value = "";
    document.getElementById("txDateFrom").value = "";
    document.getElementById("txDateTo").value = "";
    document.getElementById("txType").value = "all";
    document.getElementById("txStatus").value = "all";
    document.getElementById("txChannel").value = "all";
    document.getElementById("txRail").value = "all";
    document.getElementById("txAmtMin").value = "";
    document.getElementById("txAmtMax").value = "";
    document.querySelectorAll(".summary-card").forEach(function (c) {
      c.classList.toggle("active", c.getAttribute("data-status") === "all");
    });
    page = 1;
    renderTable();
  }

  function statusBadge(s, refunded) {
    const map = { Success: "badge-success", Pending: "badge-pending", Failed: "badge-failed", Flagged: "badge-flagged" };
    let html = '<span class="badge ' + (map[s] || "badge-inactive") + '"><span class="badge-dot"></span>' + s + "</span>";
    if (refunded) html += '<span class="refunded-badge">Refunded</span>';
    return html;
  }

  function renderTable() {
    const tbody = document.getElementById("txTableBody");
    const empty = document.getElementById("txEmpty");
    const table = document.getElementById("txTable");
    const filtered = getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (page > totalPages) page = totalPages;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    tbody.innerHTML = "";
    if (items.length === 0) {
      table.classList.add("hidden");
      empty.classList.remove("hidden");
    } else {
      table.classList.remove("hidden");
      empty.classList.add("hidden");
      items.forEach(function (t) {
        const dirClass = t.direction === "credit" ? "credit" : "debit";
        const dirArrow = t.direction === "credit" ? "↓" : "↑";
        const amountStr = (t.direction === "credit" ? "+" : "−") + LS.formatPHP(t.amount);
        const dateStr = new Date(t.date).toLocaleString("en-PH", {
          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila",
        });
        const tr = document.createElement("tr");
        tr.innerHTML =
          '<td><div class="tx-desc"><span class="tx-dir ' + dirClass + '">' + dirArrow + '</span>' + t.description + '</div></td>' +
          '<td>' + t.id + '</td>' +
          '<td>' + t.user + '<br><span class="text-muted" style="font-size:11px">' + t.account + '</span></td>' +
          '<td>' + t.channel + '</td>' +
          '<td>' + t.type + '</td>' +
          '<td>' + t.rail + '</td>' +
          '<td>' + dateStr + '</td>' +
          '<td class="tx-amount ' + dirClass + '">' + amountStr + '</td>' +
          '<td>' + LS.formatPHP(t.fee || 0) + '</td>' +
          '<td>' + statusBadge(t.status, t.refunded) + '</td>';
        tr.addEventListener("click", function () { openDetail(t); });
        tbody.appendChild(tr);
      });
    }

    document.getElementById("pageInfo").textContent = "Page " + page + " of " + totalPages + " (" + filtered.length + " results)";
    document.getElementById("prevPage").disabled = page <= 1;
    document.getElementById("nextPage").disabled = page >= totalPages;
    renderChips();
  }

  function openDetail(t) {
    activeTx = t;
    const body = document.getElementById("txDetailBody");
    const amountClass = t.direction === "credit" ? "text-success" : "text-failed";
    const amountStr = (t.direction === "credit" ? "+" : "−") + LS.formatPHP(t.amount);

    let timelineHtml = '<div class="timeline">';
    (t.timeline || []).forEach(function (step) {
      const cls = step.failed ? "failed" : step.done ? "done" : "";
      const timeStr = new Date(step.time).toLocaleString("en-PH", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Manila",
      });
      timelineHtml += '<div class="timeline-step ' + cls + '"><div class="step-label">' + step.label + '</div><div class="step-time">' + timeStr + '</div></div>';
    });
    timelineHtml += "</div>";

    let errorHtml = "";
    if (t.errorCode && ERROR_CODES[t.errorCode]) {
      errorHtml =
        '<div class="tx-detail-row"><span class="label">Error code</span><span class="value text-failed">' + t.errorCode + '</span></div>' +
        '<div class="tx-detail-row"><span class="label">Explanation</span><span class="value">' + ERROR_CODES[t.errorCode] + '</span></div>';
    }

    body.innerHTML =
      '<div class="tx-detail-amount ' + amountClass + '">' + amountStr + '</div>' +
      '<div style="margin-bottom:16px">' + statusBadge(t.status, t.refunded) + '</div>' +
      '<div class="tx-detail-row"><span class="label">Transaction ID</span><span class="value">' + t.id +
      ' <button type="button" class="btn btn-ghost btn-sm" id="copyTxId">Copy</button></span></div>' +
      '<div class="tx-detail-row"><span class="label">Sender</span><span class="value">' + (t.sender || "—") + '</span></div>' +
      '<div class="tx-detail-row"><span class="label">Receiver</span><span class="value">' + (t.receiver || "—") + '</span></div>' +
      '<div class="tx-detail-row"><span class="label">Rail</span><span class="value">' + t.rail + '</span></div>' +
      '<div class="tx-detail-row"><span class="label">Rail reference</span><span class="value">' + (t.railRef || "—") + '</span></div>' +
      '<div class="tx-detail-row"><span class="label">Fee</span><span class="value">' + LS.formatPHP(t.fee || 0) + '</span></div>' +
      '<div class="tx-detail-row"><span class="label">Channel</span><span class="value">' + t.channel + '</span></div>' +
      '<div class="tx-detail-row"><span class="label">Risk score</span><span class="value">' + (t.riskScore || 0) + '/100</span></div>' +
      errorHtml +
      '<h3 style="font-size:14px;margin:16px 0 8px">Timeline</h3>' + timelineHtml;

    const refundBtn = document.getElementById("refundBtn");
    if (t.status === "Success" && !t.refunded) {
      refundBtn.classList.remove("hidden");
    } else {
      refundBtn.classList.add("hidden");
    }

    LS.openModal("txDetailModal");

    const copyBtn = document.getElementById("copyTxId");
    if (copyBtn) {
      copyBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        try { navigator.clipboard.writeText(t.id); } catch (err) {
          const ta = document.createElement("textarea");
          ta.value = t.id;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        LS.showToast("Copied", "success");
      });
    }
  }

  function exportCSV() {
    const filtered = getFiltered();
    function fmtDate(iso) {
      try {
        var d = new Date(iso);
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, "0");
        var day = String(d.getDate()).padStart(2, "0");
        var h = String(d.getHours()).padStart(2, "0");
        var min = String(d.getMinutes()).padStart(2, "0");
        return y + "-" + m + "-" + day + " " + h + ":" + min;
      } catch (e) {
        return iso || "";
      }
    }
    var head = [
      "Transaction ID", "Description", "User", "Account",
      "Channel", "Type", "Rail", "Date",
      "Amount", "Fee", "Status", "Direction"
    ];
    var body = filtered.map(function (t) {
      return [
        t.id || "",
        t.description || "",
        t.user || "",
        t.account || "",
        t.channel || "",
        t.type || "",
        t.rail || "",
        fmtDate(t.date),
        t.amount || "",
        t.fee || 0,
        t.status || "",
        t.direction || ""
      ];
    });
    var doc = new window.jspdf.jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    doc.autoTable({
      head: [head],
      body: body,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 4,
        overflow: "linebreak",
        halign: "left",
        lineColor: [208, 208, 208],
        lineWidth: 1
      },
      headStyles: {
        fillColor: [11, 110, 79],
        textColor: 255,
        fontStyle: "bold",
       halign: "left"
      },
      alternateRowStyles: {
        fillColor: [245, 249, 247]
      },
      margin: { top: 30 },
      showHead: "everyPage"
    });
    doc.save("transactions-export.pdf");
    LS.showToast("Export is ready", "success");
  }

  document.addEventListener("DOMContentLoaded", function () {
    transactions = LS.lsGet("transactions", []);
    if (transactions.length === 0) {
      /* Fallback minimal seed if dashboard never opened */
      transactions = [];
      LS.lsSet("transactions", transactions);
    }

    /* URL params */
    const params = new URLSearchParams(window.location.search);
    if (params.get("filter") === "failed") {
      statusFilter = "Failed";
      document.getElementById("txStatus").value = "Failed";
      document.querySelectorAll(".summary-card").forEach(function (c) {
        c.classList.toggle("active", c.getAttribute("data-status") === "Failed");
      });
    }
    if (params.get("date")) {
      dateFrom = params.get("date");
      dateTo = params.get("date");
      document.getElementById("txDateFrom").value = dateFrom;
      document.getElementById("txDateTo").value = dateTo;
    }

    /* Summary cards as filters */
    document.querySelectorAll(".summary-card").forEach(function (card) {
      card.addEventListener("click", function () {
        statusFilter = card.getAttribute("data-status");
        document.querySelectorAll(".summary-card").forEach(function (c) {
          c.classList.toggle("active", c === card);
        });
        document.getElementById("txStatus").value = statusFilter === "Failed" ? "Failed" : statusFilter;
        page = 1;
        renderTable();
      });
    });

    /* Filters */
    let searchTimer = null;
    document.getElementById("txSearch").addEventListener("input", function (e) {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        searchTerm = e.target.value.trim();
        page = 1;
        renderTable();
      }, 250);
    });

    /* Pre-fill from global search (?q=) */
    (function () {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      if (q) {
        const el = document.getElementById("txSearch");
        if (el) { el.value = q; searchTerm = q; page = 1; }
      }
    })();

    ["txDateFrom", "txDateTo", "txType", "txStatus", "txChannel", "txRail", "txAmtMin", "txAmtMax"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", function () {
        dateFrom = document.getElementById("txDateFrom").value;
        dateTo = document.getElementById("txDateTo").value;
        typeFilter = document.getElementById("txType").value;
        statusFilter = document.getElementById("txStatus").value;
        channelFilter = document.getElementById("txChannel").value;
        railFilter = document.getElementById("txRail").value;
        amtMin = document.getElementById("txAmtMin").value;
        amtMax = document.getElementById("txAmtMax").value;
        if (statusFilter !== "all") {
          document.querySelectorAll(".summary-card").forEach(function (c) {
            const s = c.getAttribute("data-status");
            c.classList.toggle("active", s === statusFilter || (statusFilter === "Failed" && s === "Failed") || (statusFilter === "Flagged" && s === "Failed"));
          });
        }
        page = 1;
        renderTable();
      });
    });

    document.getElementById("txReset").addEventListener("click", resetFilters);
    document.getElementById("txEmptyReset").addEventListener("click", resetFilters);
    document.getElementById("txExport").addEventListener("click", exportCSV);

    /* Sort */
    document.querySelectorAll(".sortable").forEach(function (th) {
      th.addEventListener("click", function () {
        const col = th.getAttribute("data-sort");
        if (sortCol === col) {
          if (sortDir === "asc") sortDir = "desc";
          else { sortCol = null; sortDir = null; }
        } else { sortCol = col; sortDir = "asc"; }
        document.querySelectorAll(".sortable").forEach(function (h) { h.classList.remove("asc", "desc"); });
        if (sortCol) th.classList.add(sortDir);
        renderTable();
      });
    });

    /* Pagination */
    document.getElementById("pageSize").addEventListener("change", function (e) {
      pageSize = Number(e.target.value);
      page = 1;
      renderTable();
    });
    document.getElementById("prevPage").addEventListener("click", function () {
      if (page > 1) { page--; renderTable(); }
    });
    document.getElementById("nextPage").addEventListener("click", function () {
      page++;
      renderTable();
    });

    /* Refund */
    document.getElementById("refundBtn").addEventListener("click", function () {
      LS.closeModal("txDetailModal");
      document.querySelector('input[name="refundType"][value="full"]').checked = true;
      document.getElementById("refundAmtGroup").classList.add("hidden");
      document.getElementById("refundAmount").value = "";
      document.getElementById("refundReason").value = "";
      document.getElementById("refundNotes").value = "";
      document.getElementById("refundNotesGroup").classList.add("hidden");
      document.querySelectorAll("#refundModal .form-error").forEach(function (e) { e.classList.remove("visible"); });
      LS.openModal("refundModal");
    });

    document.querySelectorAll('input[name="refundType"]').forEach(function (r) {
      r.addEventListener("change", function () {
        document.getElementById("refundAmtGroup").classList.toggle("hidden", r.value !== "partial" || !r.checked);
      });
    });

    document.getElementById("refundReason").addEventListener("change", function () {
      document.getElementById("refundNotesGroup").classList.toggle("hidden", this.value !== "Other");
    });

    const notesInput = document.getElementById("refundNotes");
    const notesCount = document.getElementById("refundNotesCount");
    notesInput.addEventListener("input", function () {
      notesCount.textContent = notesInput.value.length + " / 250";
    });

    document.getElementById("refundSubmit").addEventListener("click", function () {
      document.querySelectorAll("#refundModal .form-error").forEach(function (e) { e.classList.remove("visible"); });
      let valid = true;
      const type = document.querySelector('input[name="refundType"]:checked').value;
      let amount = activeTx.amount;
      if (type === "partial") {
        amount = Number(document.getElementById("refundAmount").value);
        if (!amount || amount <= 0 || amount > activeTx.amount) {
          document.getElementById("refundAmountError").textContent = "Must be greater than 0 and not above " + LS.formatPHP(activeTx.amount);
          document.getElementById("refundAmountError").classList.add("visible");
          valid = false;
        }
      }
      const reason = document.getElementById("refundReason").value;
      if (!reason) {
        document.getElementById("refundReasonError").textContent = "Select a reason";
        document.getElementById("refundReasonError").classList.add("visible");
        valid = false;
      }
      if (reason === "Other") {
        const notes = notesInput.value.trim();
        if (notes.length < 10) {
          document.getElementById("refundNotesError").textContent = "Enter at least 10 characters";
          document.getElementById("refundNotesError").classList.add("visible");
          valid = false;
        }
      }
      if (!valid) return;

      activeTx.refunded = true;
      activeTx.refundAmount = amount;
      LS.lsSet("transactions", transactions);
      LS.addActivity("System Administrator", "Refunded " + LS.formatPHP(amount) + " on " + activeTx.id, activeTx.id);
      LS.closeModal("refundModal");
      LS.showToast("Refund of " + LS.formatPHP(amount) + " processed", "success");
      renderTable();
      renderSummary();
    });

    renderSummary();
    renderTable();
  });
})();

/* ===== users.js ===== */
/* users.js – User Management page logic */

(function () {
  "use strict";

  if (!document.body.classList.contains("page-users")) return;

  const LS = window.LB;

  const FIRST = ["Juan","Maria","Jose","Ana","Pedro","Rosa","Carlos","Elena","Miguel","Sofia","Antonio","Isabel","Rafael","Carmen","Luis","Patricia","Fernando","Gloria","Ricardo","Teresa","Andres","Luz","Manuel","Angela","Diego","Cristina","Francisco","Beatriz","Roberto","Julia"];
  const LAST = ["Santos","Reyes","Cruz","Bautista","Garcia","Mendoza","Torres","Flores","Villanueva","Ramos","Gonzales","Lopez","Dela Cruz","Aquino","Castillo","Navarro","Perez","Domingo","Santiago","Rivera"];
  const STATUSES = ["Active","Active","Active","Active","Suspended","Locked","Pending KYC","Pending KYC"];
  const KYC_LEVELS = ["Tier 1","Tier 2","Tier 3"];

  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function maskMobile() {
    const last = String(Math.floor(10 + Math.random() * 90));
    return "09********" + last;
  }
  function maskAcct() {
    return String(Math.floor(1000000000 + Math.random() * 9000000000)).replace(/(\d{4})(\d{4})(\d{2})/, "$1****$3");
  }
  function daysAgo(d) {
    const dt = new Date();
    dt.setDate(dt.getDate() - d);
    return dt.toISOString();
  }
  function initials(name) {
    return name.split(" ").map(function (p) { return p[0]; }).join("").slice(0, 2).toUpperCase();
  }

  function seedUsers() {
    const existing = LS.lsGet("users", null);
    if (existing && existing.length >= 30) return existing;

    const users = [];
    for (let i = 0; i < 42; i++) {
      const name = rand(FIRST) + " " + rand(LAST);
      const status = STATUSES[i % STATUSES.length];
      users.push({
        id: "USR-" + (1001 + i),
        name: name,
        firstName: name.split(" ")[0],
        lastName: name.split(" ").slice(1).join(" "),
        account: maskAcct(),
        mobile: maskMobile(),
        email: name.split(" ")[0].toLowerCase() + (i + 1) + "@email.com",
        kycLevel: status === "Pending KYC" ? "None" : rand(KYC_LEVELS),
        status: status,
        lastLogin: daysAgo(Math.floor(Math.random() * 14)),
        registered: daysAgo(30 + Math.floor(Math.random() * 300)),
        accountType: rand(["Savings", "Current", "Payroll"]),
        dob: (1975 + Math.floor(Math.random() * 30)) + "-0" + (1 + Math.floor(Math.random() * 9)) + "-" + String(10 + Math.floor(Math.random() * 18)),
      });
    }
    LS.lsSet("users", users);
    return users;
  }

  function seedKycQueue(userList) {
    /* Build KYC queue from users with Pending KYC so counts always match */
    const list = userList || LS.lsGet("users", []) || [];
    const pending = list.filter(function (u) { return u.status === "Pending KYC"; });
    const idTypes = ["PhilID", "Passport", "Driver's License"];
    const queue = pending.map(function (u, i) {
      return {
        id: "KYC-" + (5001 + i),
        userId: u.id,
        name: u.name,
        submitted: u.registered || u.lastLogin || daysAgo(i + 1),
        idType: idTypes[i % idTypes.length],
        matchScore: 70 + Math.floor(Math.random() * 28),
        mobile: u.mobile,
        email: u.email,
      };
    });
    LS.lsSet("kycQueue", queue);
    return queue;
  }

  let users = [];
  let kycQueue = [];
  let statusFilter = "all";
  let searchTerm = "";
  let sortCol = null;
  let sortDir = null;
  let page = 1;
  let pageSize = 10;
  let activeUserId = null;
  let selectedKycId = null;

  function getFiltered() {
    let list = users.slice();
    if (statusFilter !== "all") {
      list = list.filter(function (u) { return u.status === statusFilter; });
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(function (u) {
        return u.name.toLowerCase().indexOf(q) !== -1 ||
          u.account.indexOf(q) !== -1 ||
          u.mobile.indexOf(q) !== -1 ||
          u.email.toLowerCase().indexOf(q) !== -1;
      });
    }
    if (sortCol === "name") {
      list.sort(function (a, b) {
        const d = a.name.localeCompare(b.name);
        return sortDir === "asc" ? d : -d;
      });
    } else if (sortCol === "lastLogin") {
      list.sort(function (a, b) {
        const d = new Date(a.lastLogin) - new Date(b.lastLogin);
        return sortDir === "asc" ? d : -d;
      });
    } else if (sortCol === "registered") {
      list.sort(function (a, b) {
        const d = new Date(a.registered) - new Date(b.registered);
        return sortDir === "asc" ? d : -d;
      });
    }
    return list;
  }

  function statusBadge(s) {
    const map = {
      Active: "badge-success",
      Suspended: "badge-failed",
      Locked: "badge-pending",
      "Pending KYC": "badge-info",
    };
    return '<span class="badge ' + (map[s] || "badge-inactive") + '"><span class="badge-dot"></span>' + s + "</span>";
  }

  function kycBadge(level) {
    if (level === "None") return '<span class="badge badge-inactive"><span class="badge-dot"></span>None</span>';
    return '<span class="badge badge-info"><span class="badge-dot"></span>' + level + "</span>";
  }

  function renderTable() {
    const tbody = document.getElementById("usersTableBody");
    const empty = document.getElementById("usersEmpty");
    const table = document.getElementById("usersTable");
    if (!tbody) return;

    const filtered = getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (page > totalPages) page = totalPages;
    const start = (page - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);

    tbody.innerHTML = "";
    if (pageItems.length === 0) {
      if (table) table.classList.add("hidden");
      if (empty) empty.classList.remove("hidden");
    } else {
      if (table) table.classList.remove("hidden");
      if (empty) empty.classList.add("hidden");
      pageItems.forEach(function (u) {
        const tr = document.createElement("tr");
        tr.innerHTML =
          '<td><div class="user-name-cell"><span class="user-avatar">' + initials(u.name) + '</span>' + u.name + '</div></td>' +
          '<td>' + u.account + '</td>' +
          '<td>' + u.mobile + '</td>' +
          '<td>' + kycBadge(u.kycLevel) + '</td>' +
          '<td>' + statusBadge(u.status) + '</td>' +
          '<td>' + LS.relativeTime(u.lastLogin) + '</td>' +
          '<td>' + new Date(u.registered).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) + '</td>' +
          '<td><div class="row-menu-wrap"><button type="button" class="row-menu-btn" aria-label="Actions for ' + u.name + '" data-id="' + u.id + '">⋯</button><div class="row-menu" data-menu="' + u.id + '"></div></div></td>';
        tbody.appendChild(tr);
      });
    }

    document.getElementById("pageInfo").textContent = "Page " + page + " of " + totalPages;
    document.getElementById("prevPage").disabled = page <= 1;
    document.getElementById("nextPage").disabled = page >= totalPages;

    /* Wire row menus */
    tbody.querySelectorAll(".row-menu-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        closeAllMenus();
        const menu = tbody.querySelector('[data-menu="' + id + '"]');
        if (!menu) return;
        const u = users.find(function (x) { return x.id === id; });
        if (!u) return;
        let items = '<button type="button" data-action="view" data-id="' + id + '">View details</button>';
        if (u.status === "Active") {
          items += '<button type="button" class="danger" data-action="suspend" data-id="' + id + '">Suspend</button>';
        }
        if (u.status === "Suspended") {
          items += '<button type="button" data-action="reactivate" data-id="' + id + '">Reactivate</button>';
        }
        if (u.status === "Locked") {
          items += '<button type="button" data-action="unlock" data-id="' + id + '">Unlock account</button>';
        }
        items += '<button type="button" data-action="resetpw" data-id="' + id + '">Reset password</button>';
        menu.innerHTML = items;
        menu.classList.add("open");

        menu.querySelectorAll("button").forEach(function (b) {
          b.addEventListener("click", function (ev) {
            ev.stopPropagation();
            handleAction(b.getAttribute("data-action"), b.getAttribute("data-id"));
            closeAllMenus();
          });
        });
      });
    });
  }

  function closeAllMenus() {
    document.querySelectorAll(".row-menu.open").forEach(function (m) {
      m.classList.remove("open");
    });
  }

  function handleAction(action, id) {
    const u = users.find(function (x) { return x.id === id; });
    if (!u) return;
    activeUserId = id;

    if (action === "view") {
      openUserDetail(u);
    } else if (action === "suspend") {
      document.getElementById("suspendUserName").textContent = "Suspend " + u.name + "?";
      document.getElementById("suspendReason").value = "";
      document.getElementById("suspendReasonError").classList.remove("visible");
      updateChar("suspendReason", "suspendReasonCount", 250);
      LS.openModal("suspendModal");
    } else if (action === "reactivate") {
      u.status = "Active";
      LS.lsSet("users", users);
      LS.addActivity("System Administrator", "Reactivated user " + u.name, u.id);
      LS.showToast("User reactivated", "success");
      renderTable();
    } else if (action === "unlock") {
      u.status = "Active";
      LS.lsSet("users", users);
      LS.addActivity("System Administrator", "Unlocked account " + u.account, u.id);
      LS.showToast("Account unlocked", "success");
      renderTable();
    } else if (action === "resetpw") {
      const masked = u.email.replace(/(.{1}).+(@.+)/, "$1***$2");
      LS.addActivity("System Administrator", "Reset password for " + u.name, u.id);
      LS.showToast("Reset link sent to " + masked, "success");
    }
  }

  function openUserDetail(u) {
    const body = document.getElementById("userDetailBody");
    body.innerHTML =
      '<div class="user-name-cell" style="margin-bottom:16px"><span class="user-avatar" style="width:48px;height:48px;font-size:16px">' + initials(u.name) + '</span><div><strong style="font-size:18px">' + u.name + '</strong><br>' + statusBadge(u.status) + '</div></div>' +
      '<div class="detail-row"><span class="label">User ID</span><span class="value">' + u.id + '</span></div>' +
      '<div class="detail-row"><span class="label">Account</span><span class="value">' + u.account + '</span></div>' +
      '<div class="detail-row"><span class="label">Mobile</span><span class="value">' + u.mobile + '</span></div>' +
      '<div class="detail-row"><span class="label">Email</span><span class="value">' + u.email + '</span></div>' +
      '<div class="detail-row"><span class="label">Account type</span><span class="value">' + u.accountType + '</span></div>' +
      '<div class="detail-row"><span class="label">KYC level</span><span class="value">' + u.kycLevel + '</span></div>' +
      '<div class="detail-row"><span class="label">Date of birth</span><span class="value">' + u.dob + '</span></div>' +
      '<div class="detail-row"><span class="label">Last login</span><span class="value">' + LS.relativeTime(u.lastLogin) + '</span></div>' +
      '<div class="detail-row"><span class="label">Registered</span><span class="value">' + new Date(u.registered).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) + '</span></div>';
    LS.openModal("userDetailModal");
  }

  function renderKycList() {
    const list = document.getElementById("kycList");
    const empty = document.getElementById("kycEmpty");
    if (!list) return;

    if (kycQueue.length === 0) {
      list.innerHTML = "";
      if (empty) empty.classList.remove("hidden");
      document.getElementById("kycReviewContent").classList.add("hidden");
      document.getElementById("kycPlaceholder").classList.remove("hidden");
      return;
    }
    if (empty) empty.classList.add("hidden");

    list.innerHTML = "";
    kycQueue.forEach(function (k) {
      const el = document.createElement("div");
      el.className = "kyc-applicant" + (selectedKycId === k.id ? " selected" : "");
      el.innerHTML =
        '<span class="user-avatar">' + initials(k.name) + '</span>' +
        '<div class="kyc-applicant-info"><div class="kyc-applicant-name">' + k.name + '</div>' +
        '<div class="kyc-applicant-meta">' + k.idType + " · " + LS.relativeTime(k.submitted) + '</div></div>';
      el.addEventListener("click", function () {
        selectedKycId = k.id;
        renderKycList();
        renderKycReview(k);
      });
      list.appendChild(el);
    });
  }

  function renderKycReview(k) {
    document.getElementById("kycPlaceholder").classList.add("hidden");
    const content = document.getElementById("kycReviewContent");
    content.classList.remove("hidden");
    content.innerHTML =
      '<h3 style="margin:0 0 12px;font-size:16px">' + k.name + '</h3>' +
      '<div class="match-score">Match score: ' + k.matchScore + '%' +
      '<span class="score-bar"><span class="score-fill" style="width:' + k.matchScore + '%"></span></span></div>' +
      '<div class="id-placeholder">ID document placeholder (' + k.idType + ')</div>' +
      '<div class="id-placeholder">Selfie placeholder</div>' +
      '<div class="detail-row"><span class="label">Application ID</span><span class="value">' + k.id + '</span></div>' +
      '<div class="detail-row"><span class="label">Mobile</span><span class="value">' + k.mobile + '</span></div>' +
      '<div class="detail-row"><span class="label">Email</span><span class="value">' + k.email + '</span></div>' +
      '<div class="detail-row"><span class="label">Submitted</span><span class="value">' + LS.relativeTime(k.submitted) + '</span></div>' +
      '<div class="kyc-actions">' +
      '<button type="button" class="btn btn-primary" id="kycApproveBtn">Approve</button>' +
      '<button type="button" class="btn btn-secondary" id="kycMoreInfoBtn">Request more info</button>' +
      '<button type="button" class="btn btn-destructive" id="kycRejectBtn">Reject</button>' +
      '</div>';

    document.getElementById("kycApproveBtn").addEventListener("click", function () {
      kycQueue = kycQueue.filter(function (x) { return x.id !== k.id; });
      LS.lsSet("kycQueue", kycQueue);
      LS.addActivity("System Administrator", "Approved KYC for " + k.name, k.id);
      LS.showToast("KYC approved", "success");
      selectedKycId = null;
      renderKycList();
      document.getElementById("kycReviewContent").classList.add("hidden");
      document.getElementById("kycPlaceholder").classList.remove("hidden");
    });

    document.getElementById("kycMoreInfoBtn").addEventListener("click", function () {
      LS.addActivity("System Administrator", "Requested more info for " + k.name, k.id);
      LS.showToast("More info requested", "info");
    });

    document.getElementById("kycRejectBtn").addEventListener("click", function () {
      document.getElementById("kycRejectReason").value = "";
      document.getElementById("kycRejectReasonError").classList.remove("visible");
      LS.openModal("kycRejectModal");
    });
  }

  function updateChar(inputId, countId, max) {
    const input = document.getElementById(inputId);
    const count = document.getElementById(countId);
    if (!input || !count) return;
    function upd() {
      count.textContent = input.value.length + " / " + max;
      count.classList.toggle("over", input.value.length > max);
    }
    input.addEventListener("input", upd);
    upd();
  }

  function showErr(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.add("visible"); }
  }

  function clearErrs(prefix) {
    document.querySelectorAll("[id^='" + prefix + "'][id$='Error']").forEach(function (el) {
      el.classList.remove("visible");
      el.textContent = "";
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    users = seedUsers();
    kycQueue = seedKycQueue(users);

    /* URL filter from dashboard */
    const params = new URLSearchParams(window.location.search);
    const filter = params.get("filter");
    if (filter === "pending-kyc") {
      statusFilter = "Pending KYC";
      document.querySelectorAll(".chip").forEach(function (c) {
        c.classList.toggle("active", c.getAttribute("data-status") === "Pending KYC");
      });
    } else if (filter === "active") {
      statusFilter = "Active";
      document.querySelectorAll(".chip").forEach(function (c) {
        c.classList.toggle("active", c.getAttribute("data-status") === "Active");
      });
    }

    /* Tabs */
    document.querySelectorAll(".tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".tab-btn").forEach(function (b) {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");
        const tab = btn.getAttribute("data-tab");
        document.getElementById("panelUsers").classList.toggle("hidden", tab !== "users");
        document.getElementById("panelKyc").classList.toggle("hidden", tab !== "kyc");
        if (tab === "kyc") {
          kycQueue = seedKycQueue(users);
          renderKycList();
        }
      });
    });

    /* Status chips */
    document.querySelectorAll(".chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        statusFilter = chip.getAttribute("data-status");
        document.querySelectorAll(".chip").forEach(function (c) {
          c.classList.toggle("active", c === chip);
        });
        page = 1;
        renderTable();
      });
    });

    /* Mobile: digits only, max 10, must start with 9 */
    var addMobileEl = document.getElementById("addMobile");
    if (addMobileEl) {
      addMobileEl.addEventListener("input", function () {
        var v = addMobileEl.value.replace(/\D/g, "").slice(0, 10);
        addMobileEl.value = v;
      });
    }

    /* Search */
    let searchTimer = null;
    document.getElementById("userSearch").addEventListener("input", function (e) {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        searchTerm = e.target.value.trim();
        page = 1;
        renderTable();
      }, 250);
    });

    /* Pre-fill from global search (?q=) */
    (function () {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      if (q) {
        const el = document.getElementById("userSearch");
        if (el) { el.value = q; searchTerm = q; page = 1; }
      }
    })();

    /* Sort */
    document.querySelectorAll(".sortable").forEach(function (th) {
      th.addEventListener("click", function () {
        const col = th.getAttribute("data-sort");
        if (sortCol === col) {
          if (sortDir === "asc") sortDir = "desc";
          else { sortCol = null; sortDir = null; }
        } else {
          sortCol = col;
          sortDir = "asc";
        }
        document.querySelectorAll(".sortable").forEach(function (h) { h.classList.remove("asc", "desc"); });
        if (sortCol) th.classList.add(sortDir);
        renderTable();
      });
    });

    /* Pagination */
    document.getElementById("pageSize").addEventListener("change", function (e) {
      pageSize = Number(e.target.value);
      page = 1;
      renderTable();
    });
    document.getElementById("prevPage").addEventListener("click", function () {
      if (page > 1) { page--; renderTable(); }
    });
    document.getElementById("nextPage").addEventListener("click", function () {
      page++;
      renderTable();
    });

    /* Close menus on outside click */
    document.addEventListener("click", closeAllMenus);

    /* Add User */
    document.getElementById("addUserBtn").addEventListener("click", function () {
      document.getElementById("addUserForm").reset();
      clearErrs("add");
      LS.openModal("addUserModal");
    });

    document.getElementById("addUserSubmit").addEventListener("click", function () {
      clearErrs("add");
      let valid = true;
      const first = document.getElementById("addFirstName").value.trim();
      const last = document.getElementById("addLastName").value.trim();
      const dob = document.getElementById("addDob").value;
      const mobile = document.getElementById("addMobile").value.trim();
      const email = document.getElementById("addEmail").value.trim();
      const acctType = document.getElementById("addAccountType").value;

      if (!first || first.length < 2 || !/^[A-Za-z\s]+$/.test(first)) {
        showErr("addFirstNameError", "2–50 letters only");
        valid = false;
      }
      if (!last || last.length < 2 || !/^[A-Za-z\s]+$/.test(last)) {
        showErr("addLastNameError", "2–50 letters only");
        valid = false;
      }
      if (!dob) {
        showErr("addDobError", "Please enter a valid birthdate.");
        valid = false;
      } else {
        const dobDay = new Date(dob);
        dobDay.setHours(0, 0, 0, 0);
        const maxAllowed = new Date();
        maxAllowed.setFullYear(maxAllowed.getFullYear() - 18);
        maxAllowed.setHours(0, 0, 0, 0);
        const age = (Date.now() - dobDay.getTime()) / (365.25 * 24 * 3600 * 1000);
        if (isNaN(dobDay.getTime()) || dobDay.getTime() > maxAllowed.getTime() || age < 18 || age > 120) {
          showErr("addDobError", "Please enter a valid birthdate.");
          valid = false;
        }
      }
      const mobileDigits = mobile.replace(/\D/g, "");
      if (!/^9\d{9}$/.test(mobileDigits)) {
        showErr("addMobileError", "Enter a valid mobile number");
        valid = false;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showErr("addEmailError", "Valid email required");
        valid = false;
      } else if (users.some(function (u) { return u.email.toLowerCase() === email.toLowerCase(); })) {
        showErr("addEmailError", "Email already in use");
        valid = false;
      }
      if (!acctType) {
        showErr("addAccountTypeError", "Select account type");
        valid = false;
      }
      if (!valid) return;

      const newUser = {
        id: "USR-" + (1001 + users.length),
        name: first + " " + last,
        firstName: first,
        lastName: last,
        account: maskAcct(),
        mobile: "+63 " + mobileDigits.slice(0, 3) + " " + mobileDigits.slice(3, 6) + " " + mobileDigits.slice(6),
        email: email,
        kycLevel: "None",
        status: "Pending KYC",
        lastLogin: new Date().toISOString(),
        registered: new Date().toISOString(),
        accountType: acctType,
        dob: dob,
      };
      users.unshift(newUser);
      LS.lsSet("users", users);
      LS.addActivity("System Administrator", "Created user " + newUser.name, newUser.id);
      LS.closeModal("addUserModal");
      LS.showToast("User created. Credentials sent by SMS.", "success");
      renderTable();
    });

    /* Suspend submit */
    updateChar("suspendReason", "suspendReasonCount", 250);
    document.getElementById("suspendSubmit").addEventListener("click", function () {
      const reason = document.getElementById("suspendReason").value.trim();
      const err = document.getElementById("suspendReasonError");
      err.classList.remove("visible");
      if (reason.length < 10) {
        err.textContent = "Enter at least 10 characters";
        err.classList.add("visible");
        return;
      }
      const u = users.find(function (x) { return x.id === activeUserId; });
      if (u) {
        u.status = "Suspended";
        LS.lsSet("users", users);
        LS.addActivity("System Administrator", "Suspended user " + u.name, u.id);
        LS.showToast("User suspended", "success");
        renderTable();
      }
      LS.closeModal("suspendModal");
    });

    /* KYC reject */
    document.getElementById("kycRejectSubmit").addEventListener("click", function () {
      const reason = document.getElementById("kycRejectReason").value;
      const err = document.getElementById("kycRejectReasonError");
      err.classList.remove("visible");
      if (!reason) {
        err.textContent = "Select a reason";
        err.classList.add("visible");
        return;
      }
      const k = kycQueue.find(function (x) { return x.id === selectedKycId; });
      if (k) {
        kycQueue = kycQueue.filter(function (x) { return x.id !== selectedKycId; });
        LS.lsSet("kycQueue", kycQueue);
        LS.addActivity("System Administrator", "Rejected KYC for " + k.name + " (" + reason + ")", k.id);
        LS.showToast("KYC rejected", "success");
        selectedKycId = null;
        renderKycList();
        document.getElementById("kycReviewContent").classList.add("hidden");
        document.getElementById("kycPlaceholder").classList.remove("hidden");
      }
      LS.closeModal("kycRejectModal");
    });

    renderTable();
  });
})();