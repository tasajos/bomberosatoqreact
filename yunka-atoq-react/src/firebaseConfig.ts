// src/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database"; 

// ¡IMPORTANTE! Reemplaza esto con la configuración de tu propio proyecto de Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyApaHz7BVQa0z8HkR28m7qWiKg82PdID9M",
  authDomain: "fir-login2-c7a59.firebaseapp.com",
  projectId: "fir-login2-c7a59",
  databaseURL: "https://fir-login2-c7a59-default-rtdb.firebaseio.com",
  storageBucket: "fir-login2-c7a59.appspot.com",
  messagingSenderId: "306570664024",
  appId: "1:306570664024:web:d1b8bc3c30f1fa771a522d"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

const storage = getStorage(app);
const db = getDatabase(app);


export { storage, db};