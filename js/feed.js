/* ============================================
   VELMORA — Lógica del feed y reproductor
   Reproduce automáticamente el video visible,
   pausa el resto, y carga más contenido con
   scroll infinito mediante IntersectionObserver.
   ============================================ */

import { fetchFeedPage, isFeedExhausted } from "./videos.js";
import { toggleLike, hasLiked } from "./likes.js";
import { fetchComments, addComment, deleteComment } from "./comments.js";
import { formatCount, formatRelativeTime, getInitials, escapeHtml, showToast, withCooldown } from "./utils.js";
import { LIMITS } from "./config.js";

let currentUser = null;
let viewportEl = null;
let sentinelObserver = null;
let playbackObserver = null;
let isLoadingMore = false;
let activeVideoEl = null;
let openCommentsVideoId = null;

const ICON_HEART = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.5s-7-4.4-9.4-8.8C1 8.2 2.6 5 6 5c2 0 3.4 1.1 4.2 2.3.3.5 1.3.5 1.6 0C12.6 6.1 14 5 16 5c3.4 0 5 3.2 3.4 6.7C19 15.9 12 20.5 12 20.5Z"/></svg>`;
const ICON_HEART_FILLED = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20.5s-7-4.4-9.4-8.8C1 8.2 2.6 5 6 5c2 0 3.4 1.1 4.2 2.3.3.5 1.3.5 1.6 0C12.6 6.1 14 5 16 5c3.4 0 5 3.2 3.4 6.7C19 15.9 12 20.5 12 20.5Z"/></svg>`;
const ICON_COMMENT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5h16v10H8l-4 3.5v-3.5Z"/></svg>`;
const ICON_SAVE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12v16l-6-4-6 4V4Z"/></svg>`;
const ICON_SAVE_FILLED = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h12v16l-6-4-6 4V4Z"/></svg>`;
const ICON_SHARE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.7 7.6-4.4M8.2 13.3l7.6 4.4"/></svg>`;
const ICON_VOLUME_ON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16.5 9a4 4 0 0 1 0 6"/></svg>`;
const ICON_VOLUME_OFF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="m16 9 4 6M20 9l-4 6"/></svg>`;
const ICON_PLAY = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7-11-7Z"/></svg>`;

/** Inicializa el feed dentro de #feed-viewport. Requiere un usuario ya resuelto (puede ser null). */
export function initFeed(user) {
  currentUser = user;
  viewportEl = document.getElementById("feed-viewport");
  if (!viewportEl) return;

  setupPlaybackObserver();
  setupInfiniteScroll();
  loadNextPage().then(() => {
    // Tras la primera página, aseguramos que el sentinel quede
    // siempre al final del contenedor (loadNextPage añade slides
    // con appendChild, así que el sentinel debe reinsertarse detrás).
    moveSentinelToEnd();
  });
}

function moveSentinelToEnd() {
  const sentinel = document.getElementById("feed-sentinel");
  if (sentinel && viewportEl) {
    viewportEl.appendChild(sentinel);
  }
}

function setupPlaybackObserver() {
  playbackObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target.querySelector("video");
        if (!video) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          playVideo(video);
        } else {
          pauseVideo(video);
        }
      });
    },
    { threshold: [0, 0.6, 1] }
  );
}

function playVideo(video) {
  if (activeVideoEl && activeVideoEl !== video) {
    pauseVideo(activeVideoEl);
  }
  activeVideoEl = video;
  video.play().catch(() => {
    // Autoplay puede fallar si el navegador exige interacción previa; se ignora en silencio.
  });
  const slide = video.closest(".video-slide");
  slide?.querySelector(".video-play-indicator")?.classList.remove("is-visible");
}

function pauseVideo(video) {
  video.pause();
}

async function loadNextPage() {
  if (isLoadingMore || isFeedExhausted()) return;
  isLoadingMore = true;

  // El indicador inicial de carga (definido en el HTML) se elimina en
  // cuanto tenemos una respuesta, sea cual sea el resultado, para que
  // no interfiera con el conteo de slides ni con el observer de scroll.
  const initialLoadingEl = document.getElementById("feed-loading");

  try {
    const videos = await fetchFeedPage();
    initialLoadingEl?.remove();

    if (videos.length === 0 && countRenderedSlides() === 0) {
      renderEmptyState();
      return;
    }
    for (const video of videos) {
      const slideEl = await buildVideoSlide(video);
      viewportEl.appendChild(slideEl);
      playbackObserver.observe(slideEl);
    }
  } catch (err) {
    console.error("[Velmora] Error cargando el feed:", err);
    initialLoadingEl?.remove();
    if (countRenderedSlides() === 0) {
      renderErrorState();
    } else {
      showToast("No se pudo cargar más contenido.", "error");
    }
  } finally {
    isLoadingMore = false;
  }
}

function countRenderedSlides() {
  return viewportEl.querySelectorAll(".video-slide").length;
}

function setupInfiniteScroll() {
  const sentinel = document.createElement("div");
  sentinel.id = "feed-sentinel";
  sentinel.style.height = "1px";
  viewportEl.appendChild(sentinel);

  sentinelObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        loadNextPage().then(moveSentinelToEnd);
      }
    },
    { root: viewportEl, threshold: 0 }
  );
  sentinelObserver.observe(sentinel);
}

async function buildVideoSlide(video) {
  const slide = document.createElement("article");
  slide.className = "video-slide";
  slide.dataset.videoId = video.id;

  const liked = currentUser ? await hasLiked(currentUser.uid, video.id).catch(() => false) : false;

  slide.innerHTML = `
    <video src="${escapeHtml(video.videoUrl)}" playsinline loop muted preload="metadata"></video>
    <div class="video-tap-zone"></div>
    <div class="video-play-indicator">${ICON_PLAY}</div>
    <div class="video-progress"><div class="video-progress-fill"></div></div>
    <button class="video-volume-btn" aria-label="Activar sonido" data-action="volume">${ICON_VOLUME_OFF}</button>

    <div class="video-info">
      <div class="video-creator">
        <span class="avatar avatar-sm">${video.authorPhotoURL ? `<img src="${escapeHtml(video.authorPhotoURL)}" alt="">` : getInitials(video.authorDisplayName)}</span>
        <span class="video-creator-name">@${escapeHtml(video.authorUsername || "usuario")}</span>
        <button class="video-follow-chip" data-action="follow">Seguir</button>
      </div>
      ${video.description ? `<p class="video-description">${escapeHtml(video.description)}</p>` : ""}
      ${video.hashtags?.length ? `<p class="video-hashtags">${video.hashtags.map((h) => `#${escapeHtml(h)}`).join(" ")}</p>` : ""}
    </div>

    <div class="video-actions">
      <div class="video-action">
        <button class="video-action-btn${liked ? " is-active" : ""}" data-action="like" aria-label="Me gusta" aria-pressed="${liked}">
          ${liked ? ICON_HEART_FILLED : ICON_HEART}
        </button>
        <span class="video-action-count" data-role="likes-count">${formatCount(video.likesCount)}</span>
      </div>
      <div class="video-action">
        <button class="video-action-btn" data-action="comments" aria-label="Comentarios">${ICON_COMMENT}</button>
        <span class="video-action-count" data-role="comments-count">${formatCount(video.commentsCount)}</span>
      </div>
      <div class="video-action">
        <button class="video-action-btn" data-action="save" aria-label="Guardar">${ICON_SAVE}</button>
      </div>
      <div class="video-action">
        <button class="video-action-btn" data-action="share" aria-label="Compartir">${ICON_SHARE}</button>
      </div>
    </div>
  `;

  attachSlideEvents(slide, video);
  return slide;
}

function attachSlideEvents(slide, video) {
  const videoEl = slide.querySelector("video");
  const tapZone = slide.querySelector(".video-tap-zone");
  const playIndicator = slide.querySelector(".video-play-indicator");
  const volumeBtn = slide.querySelector('[data-action="volume"]');
  const progressFill = slide.querySelector(".video-progress-fill");
  const likeBtn = slide.querySelector('[data-action="like"]');
  const commentsBtn = slide.querySelector('[data-action="comments"]');
  const saveBtn = slide.querySelector('[data-action="save"]');
  const shareBtn = slide.querySelector('[data-action="share"]');

  tapZone.addEventListener("click", () => {
    if (videoEl.paused) {
      videoEl.play();
      playIndicator.classList.remove("is-visible");
    } else {
      videoEl.pause();
      playIndicator.classList.add("is-visible");
    }
  });

  volumeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    videoEl.muted = !videoEl.muted;
    volumeBtn.innerHTML = videoEl.muted ? ICON_VOLUME_OFF : ICON_VOLUME_ON;
  });

  videoEl.addEventListener("timeupdate", () => {
    if (videoEl.duration) {
      progressFill.style.width = `${(videoEl.currentTime / videoEl.duration) * 100}%`;
    }
  });

  likeBtn.addEventListener(
    "click",
    withCooldown(async (e) => {
      e.stopPropagation();
      if (!currentUser) {
        showToast("Inicia sesión para dar like.");
        return;
      }
      try {
        const result = await toggleLike(currentUser.uid, video.id);
        likeBtn.classList.toggle("is-active", result.liked);
        likeBtn.setAttribute("aria-pressed", String(result.liked));
        likeBtn.innerHTML = result.liked ? ICON_HEART_FILLED : ICON_HEART;
        slide.querySelector('[data-role="likes-count"]').textContent = formatCount(result.likesCount);
      } catch (err) {
        showToast(err.message || "No se pudo procesar el like.", "error");
      }
    }, LIMITS.ACTION_COOLDOWN_MS)
  );

  commentsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openComments(video.id, slide);
  });

  saveBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isSaved = saveBtn.classList.toggle("is-active");
    saveBtn.innerHTML = isSaved ? ICON_SAVE_FILLED : ICON_SAVE;
    // Nota: la persistencia de "guardados" en Firestore queda preparada
    // en la arquitectura (colección saved/) pero no implementada en este
    // esqueleto mínimo v1.0. Ver README, sección "Qué falta".
  });

  shareBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    const shareData = {
      title: "Velmora",
      text: video.description || "Mira este video en Velmora",
      url: `${window.location.origin}/video.html?id=${video.id}`,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Usuario canceló el share; no es un error real.
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        showToast("Enlace copiado.");
      } catch (err) {
        showToast("No se pudo copiar el enlace.", "error");
      }
    }
  });
}

/** Abre el panel/bottom-sheet de comentarios para un video. */
async function openComments(videoId, slide) {
  openCommentsVideoId = videoId;
  let sheet = document.getElementById("comments-sheet");
  if (!sheet) {
    sheet = buildCommentsSheetSkeleton();
    document.body.appendChild(sheet);
  }

  sheet.classList.add("is-open");
  const list = sheet.querySelector(".comments-list");
  list.innerHTML = `<div class="spinner" style="margin: var(--space-6) auto;"></div>`;

  try {
    const comments = await fetchComments(videoId);
    renderCommentsList(list, comments, videoId, slide);
  } catch (err) {
    list.innerHTML = `<div class="state-panel"><p class="state-panel-text">No se pudieron cargar los comentarios.</p></div>`;
  }
}

function buildCommentsSheetSkeleton() {
  const sheet = document.createElement("div");
  sheet.id = "comments-sheet";
  sheet.className = "comments-sheet";
  sheet.innerHTML = `
    <div class="comments-backdrop" data-action="close-comments"></div>
    <div class="comments-panel">
      <div class="comments-handle"></div>
      <div class="comments-header">
        <h2>Comentarios</h2>
        <button class="btn-icon btn-ghost" data-action="close-comments" aria-label="Cerrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <div class="comments-list"></div>
      <form class="comments-composer" id="comments-form">
        <input type="text" placeholder="Añade un comentario" maxlength="${LIMITS.COMMENT_MAX}" required aria-label="Escribir comentario" />
        <button type="submit" class="btn-icon btn-primary" aria-label="Publicar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
      </form>
    </div>
  `;

  sheet.querySelectorAll('[data-action="close-comments"]').forEach((el) => {
    el.addEventListener("click", () => sheet.classList.remove("is-open"));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") sheet.classList.remove("is-open");
  });

  sheet.querySelector("#comments-form").addEventListener(
    "submit",
    withCooldown(async (e) => {
      e.preventDefault();
      if (!currentUser) {
        showToast("Inicia sesión para comentar.");
        return;
      }
      const input = sheet.querySelector("#comments-form input");
      const text = input.value.trim();
      if (!text) return;

      try {
        await addComment(openCommentsVideoId, {
          uid: currentUser.uid,
          username: currentUser.username || currentUser.displayName || "usuario",
          displayName: currentUser.displayName || "Usuario",
          text,
        });
        input.value = "";
        const comments = await fetchComments(openCommentsVideoId);
        renderCommentsList(sheet.querySelector(".comments-list"), comments, openCommentsVideoId);
        updateCommentsCountInFeed(openCommentsVideoId, comments.length);
      } catch (err) {
        showToast(err.message || "No se pudo publicar el comentario.", "error");
      }
    }, 500)
  );

  return sheet;
}

function renderCommentsList(listEl, comments, videoId) {
  if (comments.length === 0) {
    listEl.innerHTML = `
      <div class="state-panel">
        <p class="state-panel-title">Sé el primero en comentar</p>
        <p class="state-panel-text">Aún no hay comentarios en este video.</p>
      </div>`;
    return;
  }

  listEl.innerHTML = comments
    .map(
      (c) => `
      <div class="comment-item" data-comment-id="${c.id}">
        <span class="avatar avatar-sm">${getInitials(c.displayName)}</span>
        <div class="comment-body">
          <div class="comment-author">${escapeHtml(c.displayName || c.username || "Usuario")}</div>
          <div class="comment-text">${escapeHtml(c.text)}</div>
          <div class="comment-meta">
            <span>${formatRelativeTime(c.createdAt)}</span>
            ${currentUser && c.uid === currentUser.uid ? `<button class="comment-delete" data-action="delete-comment" data-comment-id="${c.id}">Eliminar</button>` : ""}
          </div>
        </div>
      </div>`
    )
    .join("");

  listEl.querySelectorAll('[data-action="delete-comment"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await deleteComment(videoId, btn.dataset.commentId);
        btn.closest(".comment-item").remove();
      } catch (err) {
        showToast("No se pudo eliminar el comentario.", "error");
      }
    });
  });
}

function updateCommentsCountInFeed(videoId, newCount) {
  const slide = document.querySelector(`.video-slide[data-video-id="${videoId}"]`);
  const countEl = slide?.querySelector('[data-role="comments-count"]');
  if (countEl) countEl.textContent = formatCount(newCount);
}

function renderEmptyState() {
  viewportEl.innerHTML = `
    <div class="state-panel" style="height: 100%; color: #fff;">
      <p class="state-panel-title" style="color:#fff;">Todavía no hay videos</p>
      <p class="state-panel-text" style="color: rgba(255,255,255,0.7);">Sé el primero en publicar contenido en Velmora.</p>
    </div>`;
}

function renderErrorState() {
  viewportEl.innerHTML = `
    <div class="state-panel" style="height: 100%; color: #fff;">
      <p class="state-panel-title" style="color:#fff;">No se pudo cargar el feed</p>
      <p class="state-panel-text" style="color: rgba(255,255,255,0.7);">Revisa tu conexión e intenta de nuevo.</p>
      <button class="btn btn-primary" id="feed-retry">Reintentar</button>
    </div>`;
  document.getElementById("feed-retry")?.addEventListener("click", () => {
    location.reload();
  });
}
