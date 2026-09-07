/* ============================================
   VELMORA — Subida de video
   Sube el archivo a Firebase Storage con
   progreso y crea el documento de metadatos
   en Firestore al finalizar.
   ============================================ */

import { storage } from "./firebase.js";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";
import { createVideoDocument } from "./videos.js";
import { validateVideoFile, extractHashtags } from "./utils.js";
import { sanitizeText } from "./security.js";
import { LIMITS } from "./config.js";

let activeUploadTask = null;

/**
 * Sube un video a Storage bajo videos/{uid}/{timestamp}_{filename}
 * y reporta progreso mediante onProgress(percent).
 * Devuelve la URL de descarga final.
 */
function uploadVideoFile(file, uid, onProgress) {
  return new Promise((resolve, reject) => {
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `videos/${uid}/${Date.now()}_${cleanName}`;
    const storageRef = ref(storage, path);

    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });
    activeUploadTask = task;

    task.on(
      "state_changed",
      (snapshot) => {
        const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress?.(percent);
      },
      (error) => {
        activeUploadTask = null;
        reject(error);
      },
      async () => {
        activeUploadTask = null;
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

/** Cancela la subida en curso, si existe. */
export function cancelUpload() {
  if (activeUploadTask) {
    activeUploadTask.cancel();
    activeUploadTask = null;
  }
}

/**
 * Flujo completo de publicación de un video:
 * valida, sube el archivo, y crea los metadatos.
 * onProgress recibe un número 0-100.
 */
export async function publishVideo({ file, description, author, onProgress }) {
  const validationErrors = validateVideoFile(file, {
    maxSizeMb: LIMITS.VIDEO_MAX_SIZE_MB,
    allowedTypes: LIMITS.VIDEO_ALLOWED_TYPES,
  });
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join(" "));
  }
  if (!author?.uid) {
    throw new Error("Debes iniciar sesión para publicar.");
  }

  const cleanDescription = sanitizeText(description, LIMITS.VIDEO_DESCRIPTION_MAX);
  const hashtags = extractHashtags(cleanDescription);

  const videoUrl = await uploadVideoFile(file, author.uid, onProgress);

  const videoId = await createVideoDocument({
    authorUid: author.uid,
    authorUsername: author.username,
    authorDisplayName: author.displayName,
    authorPhotoURL: author.photoURL,
    videoUrl,
    thumbnailUrl: "",
    description: cleanDescription,
    hashtags,
  });

  return videoId;
}
