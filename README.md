# Velmora v1.0 (esqueleto mínimo funcional)

Velmora es una red social de video vertical construida con HTML, CSS y
JavaScript puro (módulos ES), con Firebase como backend real
(Authentication, Firestore y Storage).

Esta entrega es el **esqueleto mínimo funcional** acordado: autenticación
real, feed vertical con reproducción automática, likes, comentarios y
subida de video. El resto de funciones descritas en la especificación
completa (perfiles editables, seguidores, mensajes, notificaciones en
tiempo real, búsqueda, descubrir) tienen su arquitectura de datos y
reglas de seguridad preparadas, pero **no están implementadas todavía**
— ver la sección "Qué falta" al final.

---

## 1. Qué es Velmora

Una red social centrada en video vertical de formato corto, con
identidad propia (rojo + blanco, sobria, sin neón ni emojis), perfiles,
likes, comentarios y descubrimiento de contenido.

## 2. Estructura del proyecto

```
Velmora/
├── index.html          Splash inicial y redirección según sesión
├── login.html           Inicio de sesión
├── register.html        Registro
├── home.html             Feed vertical (página privada)
├── upload.html           Subida de video (página privada)
│
├── css/
│   ├── reset.css          Base entre navegadores
│   ├── variables.css      Tokens de diseño (colores, tipografía, espaciado)
│   ├── global.css         Componentes compartidos (botones, inputs, tarjetas, toasts)
│   ├── navigation.css     Barra inferior (móvil) y lateral (escritorio)
│   ├── auth.css           Login / registro
│   ├── feed.css           Feed y reproductor de video
│   ├── upload.css         Subida de video
│   └── responsive.css     Ajustes finos por breakpoint
│
├── js/
│   ├── config.js          Constantes de la app (límites, rutas)
│   ├── firebase.js        Inicialización de Firebase — AQUÍ VAN TUS CREDENCIALES
│   ├── auth.js            Registro, login, logout, protección de rutas
│   ├── videos.js          Consultas del feed y paginación
│   ├── likes.js           Sistema de likes (transaccional, sin duplicados)
│   ├── comments.js        Comentarios
│   ├── upload.js          Subida a Firebase Storage + creación de metadatos
│   ├── feed.js            Reproducción automática (IntersectionObserver), UI del feed
│   ├── navigation.js      Renderizado de la navegación
│   ├── security.js        Sanitización, cooldowns, utilidades de seguridad en cliente
│   ├── utils.js           Funciones compartidas (debounce, formateo, validación)
│   └── app.js             Orquestador: splash, sesión, arranque de cada página
│
├── firestore.rules       Reglas de seguridad de Firestore
├── storage.rules         Reglas de seguridad de Storage
├── manifest.json         Manifest de PWA
└── README.md
```

## 3. Cómo configurar Firebase

1. Ve a [https://console.firebase.google.com](https://console.firebase.google.com)
   y crea un proyecto nuevo.
2. Dentro del proyecto: **Configuración del proyecto** (ícono de
   engranaje) → pestaña **General** → sección "Tus apps" → pulsa el
   ícono web (`</>`) para registrar una app web.
3. Firebase te mostrará un objeto `firebaseConfig`. Cópialo.
4. Abre `js/firebase.js` en SPCK Editor y reemplaza estos valores:

```js
const firebaseConfig = {
  apiKey: "PLACEHOLDER_API_KEY",
  authDomain: "PLACEHOLDER_PROJECT.firebaseapp.com",
  projectId: "PLACEHOLDER_PROJECT",
  storageBucket: "PLACEHOLDER_PROJECT.appspot.com",
  messagingSenderId: "PLACEHOLDER_SENDER_ID",
  appId: "PLACEHOLDER_APP_ID",
};
```

con los valores reales que te dio Firebase.

## 4. Cómo crear Authentication

1. En la consola de Firebase: **Build → Authentication → Get started**.
2. En la pestaña **Sign-in method**, activa **Correo electrónico/contraseña**.
3. No hace falta configurar nada más para esta versión.

## 5. Cómo configurar Firestore

1. **Build → Firestore Database → Crear base de datos**.
2. Elige modo de producción (usaremos las reglas de `firestore.rules`).
3. Elige la región más cercana a tus usuarios.
4. Una vez creada, ve a la pestaña **Reglas** y pega el contenido de
   `firestore.rules` (incluido en este proyecto). Publica los cambios.

Colecciones que la app usará (se crean automáticamente al escribir el
primer documento, no hace falta crearlas a mano):

- `usernames/{username}` — reserva de nombres de usuario únicos
- `users/{uid}` — perfiles públicos
- `videos/{videoId}` — metadatos de cada video, con subcolección `comments/`
- `likes/{uid_videoId}` — un documento por like, evita duplicados

Preparadas para fases posteriores (ver reglas ya incluidas):
`followers/`, `following/`, `notifications/`, `conversations/`, `saved/`.

## 6. Cómo configurar Storage

1. **Build → Storage → Comenzar**.
2. Elige la misma región que Firestore si es posible.
3. Ve a la pestaña **Rules** y pega el contenido de `storage.rules`.
   Publica los cambios.

Los videos se guardan en `videos/{uid}/{timestamp}_{nombreArchivo}`.

## 7. Cómo añadir las reglas (resumen)

- `firestore.rules` → pégalas en Firestore Database → Reglas.
- `storage.rules` → pégalas en Storage → Rules.

Ambos archivos ya están escritos pensando en que:
- cualquiera puede **leer** contenido público (perfiles, videos, comentarios, likes),
- pero solo el dueño de un dato puede **crearlo, modificarlo o borrarlo**.

Limitación conocida: los contadores (`likesCount`, `commentsCount`) se
actualizan mediante transacciones del lado del cliente protegidas por
reglas generales de `update`. Para una versión con mayor robustez ante
manipulación del cliente, esto debería migrarse a Cloud Functions
(triggers `onCreate`/`onDelete` sobre `likes/` y `comments/`) — queda
señalado como mejora de v2.

## 8. Cómo ejecutar desde SPCK Editor

1. Abre la carpeta `Velmora/` completa en SPCK Editor.
2. SPCK Editor incluye un servidor de vista previa local: usa la opción
   "Preview" / "Run" sobre `index.html`. Los módulos ES (`type="module"`)
   requieren servirse por HTTP (no `file://`), así que usa siempre la
   vista previa del propio editor, no abrir el archivo directamente.
3. Si SPCK no ofrece servidor propio en tu instalación, cualquier
   servidor estático simple funciona igual de bien (por ejemplo, la
   extensión "Live Server" en otros editores, o `npx serve` desde una
   terminal si tienes Node disponible).

## 9. Cómo probar autenticación

1. Con Firebase ya configurado, abre `register.html`.
2. Crea una cuenta con nombre, username, correo y contraseña.
3. Deberías ser redirigido a `home.html`.
4. Comprueba en la consola de Firebase → Authentication que aparece el
   nuevo usuario, y en Firestore que se crearon los documentos en
   `users/` y `usernames/`.
5. Cierra sesión (pendiente de botón en Settings — ver "Qué falta") y
   vuelve a entrar desde `login.html`.

## 10. Cómo subir videos

1. Inicia sesión y ve a `upload.html` (o pulsa "Crear" en la
   navegación).
2. Selecciona un archivo de video (MP4, WebM o MOV, máx. 100MB).
3. Escribe una descripción (los `#hashtags` se detectan automáticamente).
4. Pulsa "Publicar". Verás una barra de progreso real de la subida a
   Firebase Storage.
5. Al terminar, se crea el documento en `videos/` y vuelves al feed,
   donde el nuevo video aparecerá (puede requerir refrescar si tu
   posición en el feed ya pasó esa página).

## 11. Cómo desplegar posteriormente

Cuando quieras publicar Velmora fuera de SPCK Editor:

1. Instala Firebase CLI (`npm install -g firebase-tools`) en un entorno
   con Node.js.
2. `firebase login`
3. `firebase init hosting` dentro de la carpeta del proyecto, usando
   `.` (la raíz) como directorio público.
4. `firebase deploy`

No es necesario ningún paso de compilación: el proyecto es HTML/CSS/JS
plano.

---

## Qué falta (arquitectura preparada, no implementada en este esqueleto)

Para mantener la calidad por encima de la cantidad, esta primera
entrega se centró en un flujo mínimo pero completamente real y
funcional. Lo siguiente tiene su **estructura de datos y reglas de
seguridad ya definidas**, pero su interfaz e integración quedan para
la siguiente fase:

- **Perfiles editables** (`profile.html`, `settings.html`): el
  documento `users/{uid}` ya guarda todo lo necesario; falta la UI de
  edición y de visualización del perfil de otros usuarios.
- **Seguidores/seguidos**: colecciones `followers/` y `following/` ya
  tienen reglas de seguridad; falta la lógica de `follows.js` y los
  botones "Seguir" (actualmente el botón en el feed es visual, no
  persiste todavía).
- **Guardados**: colección `saved/` con reglas listas; el botón
  "Guardar" del feed cambia de estado visualmente pero no escribe en
  Firestore aún.
- **Notificaciones** (`notifications.html`): colección y reglas
  listas; falta generarlas (al dar like/comentar/seguir) y el listener
  en tiempo real.
- **Mensajes** (`messages.html`): colecciones `conversations/` y
  `messages/` con reglas listas; falta toda la interfaz.
- **Búsqueda** (`search.html`) y **Descubrir** (`discover.html`): no
  implementadas todavía; el feed principal ya sienta las bases de
  consulta y paginación que estas páginas reutilizarán.
- **Cerrar sesión**: la función `logoutUser()` ya existe en
  `js/auth.js`; falta un botón visible (se añadirá con
  `settings.html`).
- **Service worker** para funcionamiento offline completo: el
  `manifest.json` ya está listo para PWA instalable, pero
  `service-worker.js` no se ha creado en esta fase.

Ninguna de estas ausencias rompe lo que sí está construido: registro,
login, feed con reproducción automática, likes, comentarios y subida
de video funcionan de extremo a extremo contra Firebase real.
