/* ============================================
   VELMORA — Navegación
   Inserta la barra inferior (móvil) y la barra
   lateral (escritorio) en cualquier página que
   incluya un <div id="nav-root"></div>.
   ============================================ */

import { ROUTES } from "./config.js";

const ICONS = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9a1 1 0 0 0 1 1H17.5a1 1 0 0 0 1-1v-9"/></svg>`,
  compass: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m14.5 9.5-2 5-5 2 2-5 5-2Z"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M10.5 20a1.5 1.5 0 0 0 3 0"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.5" r="3.5"/><path d="M4.5 20c1.5-4 5-5.5 7.5-5.5s6 1.5 7.5 5.5"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`,
  message: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H7l-3 3V5Z"/></svg>`,
};

const NAV_ITEMS = [
  { route: ROUTES.HOME, icon: "home", label: "Inicio" },
  { route: ROUTES.DISCOVER, icon: "compass", label: "Descubrir" },
  { route: ROUTES.UPLOAD, icon: "plus", label: "Crear", isCreate: true },
  { route: ROUTES.NOTIFICATIONS, icon: "bell", label: "Notificaciones", badgeId: "nav-notif-badge" },
  { route: ROUTES.PROFILE, icon: "user", label: "Perfil" },
];

function getCurrentPage() {
  return window.location.pathname.split("/").pop() || "index.html";
}

function buildBottomNav(currentPage) {
  const items = NAV_ITEMS.map((item) => {
    const isActive = item.route === currentPage;
    if (item.isCreate) {
      return `
        <a href="${item.route}" class="nav-item" aria-label="${item.label}">
          <span class="nav-item-create">${ICONS[item.icon]}</span>
        </a>`;
    }
    return `
      <a href="${item.route}" class="nav-item${isActive ? " is-active" : ""}" aria-label="${item.label}" aria-current="${isActive ? "page" : "false"}">
        <span class="nav-item-wrap">
          ${ICONS[item.icon]}
          ${item.badgeId ? `<span class="nav-badge hidden" id="${item.badgeId}">0</span>` : ""}
        </span>
      </a>`;
  }).join("");

  return `<nav class="bottom-nav" role="navigation" aria-label="Navegación principal">${items}</nav>`;
}

function buildSideNav(currentPage) {
  const items = NAV_ITEMS.map((item) => {
    const isActive = item.route === currentPage;
    return `
      <a href="${item.route}" class="side-nav-item${isActive ? " is-active" : ""}${item.isCreate ? " side-nav-item-create" : ""}">
        ${ICONS[item.icon]}
        <span>${item.label}</span>
      </a>`;
  }).join("");

  return `
    <aside class="side-nav" aria-label="Navegación principal">
      <div class="side-nav-top">
        <div class="side-nav-logo">Vel<span>mora</span></div>
        ${items}
      </div>
      <div class="side-nav-user" id="side-nav-user">
        <span class="avatar avatar-md" id="side-nav-avatar">?</span>
        <div>
          <div class="side-nav-user-name" id="side-nav-username">Cuenta</div>
          <div class="side-nav-user-handle">Ver perfil</div>
        </div>
      </div>
    </aside>`;
}

/** Renderiza la navegación en #nav-root, si existe en la página. */
export function renderNavigation() {
  const root = document.getElementById("nav-root");
  if (!root) return;

  const currentPage = getCurrentPage();
  root.innerHTML = buildBottomNav(currentPage) + buildSideNav(currentPage);
}

/** Actualiza el badge de notificaciones no leídas en la navegación. */
export function setNotificationBadge(count) {
  const badge = document.getElementById("nav-notif-badge");
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}
