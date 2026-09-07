/* ============================================
   VELMORA — Likes
   Un like por usuario por video, usando el id
   compuesto `${uid}_${videoId}` como clave del
   documento: evita duplicados sin necesitar una
   consulta extra antes de escribir.
   ============================================ */

import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { isActionAllowed } from "./security.js";
import { LIMITS } from "./config.js";

function likeDocId(uid, videoId) {
  return `${uid}_${videoId}`;
}

/** Comprueba si el usuario actual ya dio like a un video. */
export async function hasLiked(uid, videoId) {
  const snap = await getDoc(doc(db, "likes", likeDocId(uid, videoId)));
  return snap.exists();
}

/**
 * Alterna el like de un video de forma atómica:
 * usa una transacción para mantener likesCount
 * consistente incluso con escrituras concurrentes.
 * Devuelve el nuevo estado: { liked, likesCount }.
 */
export async function toggleLike(uid, videoId) {
  if (!isActionAllowed(`like:${videoId}`, LIMITS.ACTION_COOLDOWN_MS)) {
    throw new Error("Espera un momento antes de repetir esta acción.");
  }

  const likeRef = doc(db, "likes", likeDocId(uid, videoId));
  const videoRef = doc(db, "videos", videoId);

  return runTransaction(db, async (transaction) => {
    const likeSnap = await transaction.get(likeRef);
    const videoSnap = await transaction.get(videoRef);

    if (!videoSnap.exists()) {
      throw new Error("El video ya no existe.");
    }

    const currentCount = videoSnap.data().likesCount || 0;

    if (likeSnap.exists()) {
      transaction.delete(likeRef);
      transaction.update(videoRef, { likesCount: Math.max(0, currentCount - 1) });
      return { liked: false, likesCount: Math.max(0, currentCount - 1) };
    }

    transaction.set(likeRef, {
      uid,
      videoId,
      createdAt: serverTimestamp(),
    });
    transaction.update(videoRef, { likesCount: currentCount + 1 });
    return { liked: true, likesCount: currentCount + 1 };
  });
}
