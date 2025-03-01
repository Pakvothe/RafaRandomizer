import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Configuración de Firebase
// IMPORTANTE: Debes reemplazar estos valores con los de tu propio proyecto Firebase
// Puedes obtener estos valores desde la consola de Firebase (https://console.firebase.google.com/)
// 1. Crea un proyecto (o usa uno existente)
// 2. Registra una aplicación web
// 3. Copia el objeto firebaseConfig que te proporciona Firebase
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "tu-messaging-sender-id",
  appId: "tu-app-id",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
