/* ============================================
   VELMORA — Seguridad básica (cliente)
   IMPORTANTE: esto complementa, pero NUNCA
   sustituye, a las reglas de seguridad de
   Firebase (firestore.rules / storage.rules).
   Un cliente modificado puede saltarse todo
   lo que hay aquí; las reglas del servidor
   son la única protección real.
   ============================================ */

const actionTimestamps = new Map();

/**
 * Limita la frecuencia de una acción por clave
 * (ej. "like:videoId123"). Devuelve true si la
 * acción está permitida ahora mismo.
 */
export function isActionAllowed(key, cooldownMs = 600) {
  const now = Date.now();
  const last = actionTimestamps.get(key) || 0;
  if (now - last < cooldownMs) {
    return false;
  }
  actionTimestamps.set(key, now);
  return true;
}

/** Sanitiza texto libre antes de guardarlo (recorta y limita longitud). */
export function sanitizeText(text, maxLength = 500) {
  if (typeof text !== "string") return "";
  return text.trim().slice(0, maxLength);
}

/** Verifica que un objeto de usuario autenticado exista antes de una acción sensible. */
export function requireAuth(currentUser) {
  if (!currentUser) {
    throw new Error("Debes iniciar sesión para realizar esta acción.");
  }
  return currentUser;
}

/** Bloquea el envío doble de un formulario mientras una promesa está en curso. */
export function guardSubmit(formElement, asyncFn) {
  return async (event) => {
    event.preventDefault();
    if (formElement.dataset.submitting === "true") return;
    formElement.dataset.submitting = "true";
    try {
      await asyncFn(event);
    } finally {
      formElement.dataset.submitting = "false";
    }
  };
}
