/* ============================================
   VELMORA — Inicialización de Firebase
   ============================================

   INSTRUCCIONES:
   1. Ve a https://console.firebase.google.com
   2. Crea un proyecto nuevo (o usa uno existente).
   3. Dentro del proyecto: Configuración del proyecto
      > General > "Tus apps" > Agregar app > Web (</>).
   4. Copia el objeto de configuración que te entrega
      Firebase y reemplaza los valores de PLACEHOLDER
      de aquí abajo.
   5. Activa en la consola de Firebase:
      - Authentication > Sign-in method > Correo/contraseña
      - Firestore Database > Crear base de datos
      - Storage > Empezar
   6. Sube las reglas incluidas en firestore.rules y
      storage.rules (ver README.md, sección "Firebase").

   NUNCA subas este archivo con credenciales reales a un
   repositorio público si tu proyecto maneja datos
   sensibles de producción. Para un proyecto de Firebase
   orientado a cliente web, estas claves no son secretas
   por sí mismas (están pensadas para exponerse en el
   frontend), pero la seguridad real depende de las
   REGLAS de Firestore/Storage, no de ocultar esta clave.
   ============================================ */

const firebaseConfig = {
  apiKey: "AIzaSyCqndpkt2IeyWDy2uTdMp5g-6QGBt2oXNw",
  authDomain: "velmora-d8cfb.firebaseapp.com",
  databaseURL: "https://velmora-d8cfb-default-rtdb.firebaseio.com",
  projectId: "velmora-d8cfb",
  storageBucket: "velmora-d8cfb.firebasestorage.app",
  messagingSenderId: "736599153867",
  appId: "1:736599153867:web:9a64fbe59de782179bcf4e",
};

// SDKs de Firebase cargados vía CDN modular (ver <script type="module"> en cada HTML).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

let app;
let isConfigured = true;

try {
  if (firebaseConfig.apiKey.startsWith("PLACEHOLDER")) {
    isConfigured = false;
    console.warn(
      "[Velmora] Firebase no está configurado todavía. " +
      "Reemplaza los valores en js/firebase.js con tus credenciales reales."
    );
  }
  app = initializeApp(firebaseConfig);
} catch (err) {
  console.error("[Velmora] Error al inicializar Firebase:", err);
}

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;
export const firebaseIsConfigured = isConfigured;

if (auth) {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.error("[Velmora] No se pudo establecer la persistencia de sesión:", err);
  });
}
