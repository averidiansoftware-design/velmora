/* ============================================
   VELMORA — Comentarios
   ============================================ */

import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { sanitizeText } from "./security.js";
import { LIMITS } from "./config.js";

/** Obtiene los comentarios de un video (subcolección videos/{id}/comments). */
export async function fetchComments(videoId, pageSize = 30) {
  const ref = collection(db, "videos", videoId, "comments");
  const q = query(ref, orderBy("createdAt", "desc"), limit(pageSize));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

/** Publica un comentario y actualiza el contador del video de forma atómica. */
export async function addComment(videoId, { uid, username, displayName, text }) {
  const clean = sanitizeText(text, LIMITS.COMMENT_MAX);
  if (!clean) {
    throw new Error("El comentario no puede estar vacío.");
  }

  const videoRef = doc(db, "videos", videoId);
  const commentsRef = collection(db, "videos", videoId, "comments");
  const newCommentRef = doc(commentsRef);

  await runTransaction(db, async (transaction) => {
    const videoSnap = await transaction.get(videoRef);
    if (!videoSnap.exists()) {
      throw new Error("El video ya no existe.");
    }
    const currentCount = videoSnap.data().commentsCount || 0;

    transaction.set(newCommentRef, {
      uid,
      username,
      displayName,
      text: clean,
      createdAt: serverTimestamp(),
    });
    transaction.update(videoRef, { commentsCount: currentCount + 1 });
  });

  return newCommentRef.id;
}

/** Elimina un comentario propio y decrementa el contador. */
export async function deleteComment(videoId, commentId) {
  const videoRef = doc(db, "videos", videoId);
  const commentRef = doc(db, "videos", videoId, "comments", commentId);

  await runTransaction(db, async (transaction) => {
    const videoSnap = await transaction.get(videoRef);
    if (!videoSnap.exists()) {
      transaction.delete(commentRef);
      return;
    }
    const currentCount = videoSnap.data().commentsCount || 0;
    transaction.delete(commentRef);
    transaction.update(videoRef, { commentsCount: Math.max(0, currentCount - 1) });
  });
}
