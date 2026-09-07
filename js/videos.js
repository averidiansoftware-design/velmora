/* ============================================
   VELMORA — Videos
   Consultas del feed, paginación y metadatos.
   ============================================ */

import { db } from "./firebase.js";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  getDoc,
  addDoc,
  where,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { LIMITS } from "./config.js";

let lastVisibleDoc = null;
let feedExhausted = false;
let isFetchingPage = false;

/**
 * Obtiene la siguiente página del feed principal,
 * ordenado por fecha de publicación descendente.
 * Evita solicitudes simultáneas y detecta el final
 * del feed para no seguir consultando innecesariamente.
 */
export async function fetchFeedPage() {
  if (isFetchingPage || feedExhausted) return [];
  isFetchingPage = true;

  try {
    const videosRef = collection(db, "videos");
    let q = query(videosRef, orderBy("createdAt", "desc"), limit(LIMITS.FEED_PAGE_SIZE));

    if (lastVisibleDoc) {
      q = query(
        videosRef,
        orderBy("createdAt", "desc"),
        startAfter(lastVisibleDoc),
        limit(LIMITS.FEED_PAGE_SIZE)
      );
    }

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      feedExhausted = true;
      return [];
    }

    lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];

    if (snapshot.docs.length < LIMITS.FEED_PAGE_SIZE) {
      feedExhausted = true;
    }

    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (err) {
    console.error("[Velmora] Error obteniendo el feed:", err);
    throw new Error("No se pudo cargar el feed. Intenta de nuevo.");
  } finally {
    isFetchingPage = false;
  }
}

/** Reinicia el cursor de paginación (ej. al hacer pull-to-refresh). */
export function resetFeedPagination() {
  lastVisibleDoc = null;
  feedExhausted = false;
  isFetchingPage = false;
}

export function isFeedExhausted() {
  return feedExhausted;
}

/** Obtiene un único video por id (ej. para video.html). */
export async function getVideoById(videoId) {
  const snap = await getDoc(doc(db, "videos", videoId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Crea el documento de metadatos de un video en Firestore.
 * Se llama DESPUÉS de subir el archivo a Storage.
 * videoUrl y thumbnailUrl deben ser URLs ya subidas.
 */
export async function createVideoDocument({
  authorUid,
  authorUsername,
  authorDisplayName,
  authorPhotoURL,
  videoUrl,
  thumbnailUrl,
  description,
  hashtags,
}) {
  const docRef = await addDoc(collection(db, "videos"), {
    authorUid,
    authorUsername,
    authorDisplayName,
    authorPhotoURL: authorPhotoURL || "",
    videoUrl,
    thumbnailUrl: thumbnailUrl || "",
    description: description || "",
    hashtags: hashtags || [],
    likesCount: 0,
    commentsCount: 0,
    savesCount: 0,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Obtiene los videos publicados por un usuario específico (para su perfil). */
export async function fetchVideosByUser(uid, pageSize = 12) {
  const videosRef = collection(db, "videos");
  const q = query(
    videosRef,
    where("authorUid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}
