// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import "slick-carousel/slick/slick.css"; 
import "slick-carousel/slick/slick-theme.css";

import App from './App.tsx';
import HomePage from './pages/HomePage.tsx';

import DonationsPage from './pages/DonationsPage.tsx'; 
import PartnershipsPage from './pages/PartnershipsPage.tsx'; 
import SupportPage from './pages/SupportPage.tsx'; 
import RecruitmentPage from './pages/RecruitmentPage.tsx'; 
import ProjectsPage from './pages/ProjectsPage.tsx'; 
import AboutPage from './pages/AboutPage.tsx'; 
import ContactPage from './pages/ContactPage.tsx'; 

import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* La ruta principal ("/") usa el layout 'App' y dentro renderiza 'HomePage' */}
        <Route path="/" element={<App />}>
          <Route index element={<HomePage />} />
          <Route path="donaciones" element={<DonationsPage />} /> 
          <Route path="convenios" element={<PartnershipsPage />} /> 
          <Route path="apoyos" element={<SupportPage />} /> 
          <Route path="voluntarios" element={<RecruitmentPage />}/>
          <Route path="proyectos" element={<ProjectsPage />} />
          <Route path="nosotros" element={<AboutPage />} />
          <Route path="contacto" element={<ContactPage />} />
          {/* Aquí añadiremos más rutas como /galeria, /contacto, etc. */}
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);