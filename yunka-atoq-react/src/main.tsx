// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import App from './App.tsx';
import HomePage from './pages/HomePage.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* La ruta principal ("/") usa el layout 'App' y dentro renderiza 'HomePage' */}
        <Route path="/" element={<App />}>
          <Route index element={<HomePage />} />
          {/* Aquí añadiremos más rutas como /galeria, /contacto, etc. */}
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);