/* ============================================
   VELMORA — Configuración general de la app
   Constantes que no son secretas y que se
   usan en varios módulos.
   ============================================ */

export const APP_NAME = "Velmora";
export const APP_VERSION = "1.0.0";

export const LIMITS = {
  USERNAME_MIN: 3,
  USERNAME_MAX: 20,
  BIO_MAX: 150,
  DISPLAY_NAME_MAX: 40,
  VIDEO_DESCRIPTION_MAX: 200,
  COMMENT_MAX: 250,
  VIDEO_MAX_SIZE_MB: 100,
  VIDEO_ALLOWED_TYPES: ["video/mp4", "video/webm", "video/quicktime"],
  FEED_PAGE_SIZE: 6,
  SEARCH_DEBOUNCE_MS: 350,
  ACTION_COOLDOWN_MS: 600,
};

export const ROUTES = {
  INDEX: "index.html",
  LOGIN: "login.html",
  REGISTER: "register.html",
  HOME: "home.html",
  DISCOVER: "discover.html",
  UPLOAD: "upload.html",
  PROFILE: "profile.html",
  MESSAGES: "messages.html",
  NOTIFICATIONS: "notifications.html",
  SETTINGS: "settings.html",
  SEARCH: "search.html",
};

// Páginas que requieren sesión iniciada.
export const PRIVATE_ROUTES = [
  ROUTES.HOME,
  ROUTES.DISCOVER,
  ROUTES.UPLOAD,
  ROUTES.PROFILE,
  ROUTES.MESSAGES,
  ROUTES.NOTIFICATIONS,
  ROUTES.SETTINGS,
];

// Claves usadas en localStorage / sessionStorage.
// Solo para preferencias e información no sensible.
export const STORAGE_KEYS = {
  RECENT_SEARCHES: "velmora_recent_searches",
  UI_PREFS: "velmora_ui_prefs",
};
