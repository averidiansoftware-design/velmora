/* ============================================
   VELMORA — Autenticación
   Registro, inicio de sesión, cierre de sesión,
   recuperación de contraseña y protección de
   páginas privadas.
   ============================================ */

import { auth, db, firebaseIsConfigured } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  query,
  collection,
  where,
  limit,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { normalizeUsername, isValidUsername, isValidEmail } from "./utils.js";
import { PRIVATE_ROUTES, ROUTES } from "./config.js";

/**
 * Comprueba en Firestore si un username ya existe.
 * Se apoya en el documento usernames/{usernameNormalizado}
 * para una consulta de una sola lectura (evita escanear
 * toda la colección de usuarios).
 */
export async function isUsernameTaken(username) {
  const normalized = normalizeUsername(username);
  const ref = doc(db, "usernames", normalized);
  const snap = await getDoc(ref);
  return snap.exists();
}

/**
 * Registra un nuevo usuario:
 * 1. Crea la cuenta en Firebase Authentication.
 * 2. Reserva el username en la colección usernames/.
 * 3. Crea el documento de perfil en users/.
 * Si el username ya existe, lanza un error legible.
 */
export async function registerUser({ email, password, username, displayName }) {
  if (!firebaseIsConfigured) {
    throw new Error("Firebase todavía no está configurado. Revisa js/firebase.js.");
  }
  if (!isValidEmail(email)) {
    throw new Error("El correo electrónico no es válido.");
  }
  if (!isValidUsername(username)) {
    throw new Error("El nombre de usuario debe tener entre 3 y 20 caracteres (letras, números, punto o guion bajo).");
  }
  if (password.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres.");
  }

  const normalizedUsername = normalizeUsername(username);

  const taken = await isUsernameTaken(normalizedUsername);
  if (taken) {
    throw new Error("Ese nombre de usuario ya está en uso.");
  }

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;

  try {
    await updateProfile(credential.user, { displayName });

    // Reserva del username (documento con id = username, lectura O(1) para validar unicidad).
    await setDoc(doc(db, "usernames", normalizedUsername), {
      uid,
      createdAt: serverTimestamp(),
    });

    // Documento de perfil público.
    await setDoc(doc(db, "users", uid), {
      uid,
      username: normalizedUsername,
      displayName: displayName || normalizedUsername,
      bio: "",
      photoURL: "",
      followersCount: 0,
      followingCount: 0,
      videosCount: 0,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // Si falla la creación del perfil tras crear la cuenta de auth,
    // dejamos la cuenta creada (el usuario puede reintentar login),
    // pero propagamos el error para informar claramente.
    console.error("[Velmora] Error creando el perfil tras registro:", err);
    throw new Error("La cuenta se creó, pero hubo un problema al configurar el perfil. Intenta iniciar sesión.");
  }

  return credential.user;
}

/** Inicia sesión con correo y contraseña. */
export async function loginUser({ email, password }) {
  if (!firebaseIsConfigured) {
    throw new Error("Firebase todavía no está configurado. Revisa js/firebase.js.");
  }
  if (!isValidEmail(email)) {
    throw new Error("El correo electrónico no es válido.");
  }
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/** Cierra la sesión actual. */
export async function logoutUser() {
  await signOut(auth);
}

/** Envía un correo de recuperación de contraseña. */
export async function resetPassword(email) {
  if (!isValidEmail(email)) {
    throw new Error("El correo electrónico no es válido.");
  }
  await sendPasswordResetEmail(auth, email);
}

/**
 * Se suscribe a cambios de sesión.
 * callback(user | null) se llama cada vez que cambia el estado.
 * Devuelve la función de "unsubscribe".
 */
export function watchAuthState(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

/**
 * Traduce códigos de error de Firebase Auth a mensajes
 * legibles en español, sin exponer detalles internos.
 */
export function translateAuthError(error) {
  const code = error?.code || "";
  const map = {
    "auth/email-already-in-use": "Ese correo ya está registrado.",
    "auth/invalid-email": "El correo electrónico no es válido.",
    "auth/weak-password": "La contraseña es demasiado débil.",
    "auth/user-not-found": "No existe una cuenta con ese correo.",
    "auth/wrong-password": "Contraseña incorrecta.",
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/too-many-requests": "Demasiados intentos. Intenta más tarde.",
    "auth/network-request-failed": "Problema de conexión. Revisa tu internet.",
  };
  return map[code] || error.message || "Ocurrió un error inesperado.";
}

/**
 * Protección de rutas privadas.
 * Debe llamarse en el <head> o al inicio del <body> de
 * cada página privada, antes de que se muestre contenido.
 * Redirige a login si no hay sesión.
 */
export function guardPrivatePage() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  if (!PRIVATE_ROUTES.includes(currentPage)) return;

  watchAuthState((user) => {
    if (!user) {
      window.location.replace(ROUTES.LOGIN);
    }
  });
}

/** Obtiene el documento de perfil del usuario autenticado actual. */
export async function getCurrentUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}
