/* ============================================
   VELMORA — Utilidades compartidas
   ============================================ */

/**
 * Debounce: retrasa la ejecución de fn hasta que
 * pasen `delay` ms sin nuevas llamadas.
 */
export function debounce(fn, delay = 300) {
  let timeoutId = null;
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Cooldown simple para evitar doble-click / doble envío.
 * Devuelve una función que ignora llamadas repetidas
 * durante `ms` milisegundos.
 */
export function withCooldown(fn, ms = 600) {
  let locked = false;
  return async function cooled(...args) {
    if (locked) return;
    locked = true;
    try {
      await fn.apply(this, args);
    } finally {
      setTimeout(() => {
        locked = false;
      }, ms);
    }
  };
}

/** Escapa HTML para insertar texto de usuario de forma segura. */
export function escapeHtml(str) {
  if (typeof str !== "string") return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/** Valida formato básico de email. */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Valida username: letras, números, guion bajo y punto. */
export function isValidUsername(username) {
  return /^[a-zA-Z0-9_.]{3,20}$/.test(username);
}

/** Normaliza un username a minúsculas para comparación única. */
export function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

/** Extrae hashtags (#palabra) de un texto. */
export function extractHashtags(text) {
  if (!text) return [];
  const matches = text.match(/#[\p{L}0-9_]+/gu) || [];
  return [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))];
}

/** Formatea números grandes: 1200 -> 1.2K, 1500000 -> 1.5M */
export function formatCount(num) {
  if (num == null) return "0";
  if (num < 1000) return String(num);
  if (num < 1_000_000) return `${(num / 1000).toFixed(num % 1000 >= 100 ? 1 : 0)}K`;
  return `${(num / 1_000_000).toFixed(1)}M`;
}

/** Formatea una fecha relativa breve: "hace 2h", "hace 3d", etc. */
export function formatRelativeTime(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "ahora";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin}min`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `hace ${diffHour}h`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `hace ${diffDay}d`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 5) return `hace ${diffWeek}sem`;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

/** Genera iniciales a partir de un nombre para avatares sin foto. */
export function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Valida un archivo de video contra tipo y tamaño permitidos. */
export function validateVideoFile(file, { maxSizeMb, allowedTypes }) {
  const errors = [];
  if (!file) {
    errors.push("No se seleccionó ningún archivo.");
    return errors;
  }
  if (!allowedTypes.includes(file.type)) {
    errors.push("Formato no compatible. Usa MP4, WebM o MOV.");
  }
  const sizeMb = file.size / (1024 * 1024);
  if (sizeMb > maxSizeMb) {
    errors.push(`El archivo supera el límite de ${maxSizeMb}MB.`);
  }
  return errors;
}

/** Muestra un toast simple. Requiere un contenedor #toast-container en la página. */
export function showToast(message, type = "default") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast${type !== "default" ? ` toast-${type}` : ""}`;
  toast.textContent = message;
  toast.setAttribute("role", "status");
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3200);
}

/** Query param helper. */
export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
