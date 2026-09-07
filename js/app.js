/* ============================================
   VELMORA — app.js
   Punto de entrada común a todas las páginas.
   Comprueba sesión, gestiona el splash inicial,
   y arranca los módulos que correspondan según
   la página actual.
   ============================================ */

import { watchAuthState, getCurrentUserProfile } from "./auth.js";
import { renderNavigation, setNotificationBadge } from "./navigation.js";
import { ROUTES, PRIVATE_ROUTES } from "./config.js";
import { showToast, getInitials } from "./utils.js";
import { initFeed } from "./feed.js";

function getCurrentPage() {
  return window.location.pathname.split("/").pop() || "index.html";
}

function removeSplash() {
  const splash = document.getElementById("splash-screen");
  if (!splash) return;
  splash.style.opacity = "0";
  setTimeout(() => splash.remove(), 200);
}

function setupOfflineIndicator() {
  window.addEventListener("offline", () => showToast("Sin conexión.", "error"));
  window.addEventListener("online", () => showToast("Conexión restaurada.", "success"));
}

function hydrateSideNavUser(profile, firebaseUser) {
  const nameEl = document.getElementById("side-nav-username");
  const avatarEl = document.getElementById("side-nav-avatar");
  if (nameEl) {
    nameEl.textContent = profile?.displayName || firebaseUser?.displayName || "Cuenta";
  }
  if (avatarEl) {
    avatarEl.textContent = getInitials(profile?.displayName || firebaseUser?.displayName);
  }
}

async function bootstrap() {
  setupOfflineIndicator();
  renderNavigation();

  const currentPage = getCurrentPage();
  const isPrivatePage = PRIVATE_ROUTES.includes(currentPage);

  watchAuthState(async (firebaseUser) => {
    if (!firebaseUser) {
      if (isPrivatePage || currentPage === "index.html") {
        window.location.replace(ROUTES.LOGIN);
        return;
      }
      removeSplash();
      return;
    }

    let profile = null;
    try {
      profile = await getCurrentUserProfile(firebaseUser.uid);
    } catch (err) {
      console.error("[Velmora] No se pudo cargar el perfil:", err);
    }

    hydrateSideNavUser(profile, firebaseUser);

    // Placeholder de notificaciones no leídas: la colección notifications/
    // está preparada en Firestore, pero el listener en tiempo real se
    // implementará en una fase posterior (ver README, sección "Qué falta").
    setNotificationBadge(0);

    if (currentPage === "index.html") {
      // index.html es solo splash + comprobación de sesión: si hay
      // usuario autenticado, entra directamente al feed.
      window.location.replace(ROUTES.HOME);
      return;
    }

    removeSplash();

    if (currentPage === ROUTES.HOME) {
      const sessionUser = {
        uid: firebaseUser.uid,
        displayName: profile?.displayName || firebaseUser.displayName,
        username: profile?.username,
        photoURL: profile?.photoURL,
      };
      initFeed(sessionUser);
    }
  });
}

document.addEventListener("DOMContentLoaded", bootstrap);
