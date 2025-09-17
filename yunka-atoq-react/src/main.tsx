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
import NotePage from './pages/NotePage.tsx';
import HistoryPage from './pages/HistoryPage.tsx'; 
import AwardsPage from './pages/AwardsPage.tsx'; 
import LoginPage from './pages/LoginPage.tsx';
import { UserProvider } from './context/UserContext.tsx';
import ProtectedRoute from './auth/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';

import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
    <UserProvider>
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
          <Route path="notas/:notaId" element={<NotePage />} />
          <Route path="historia" element={<HistoryPage />}/>
          <Route path="reconocimientos" element={<AwardsPage />} /> 
          <Route path="login" element={<LoginPage />} />
          {/* Aquí añadiremos más rutas como /galeria, /contacto, etc. */}
        </Route>

{/* === INICIO DE LAS NUEVAS RUTAS PRIVADAS === */}
  <Route element={<ProtectedRoute allowedRoles={['voluntario']} />}>
    <Route path="/admin" element={<AdminLayout />}>
      <Route path="dashboard" element={<DashboardPage />} />
      {/* Aquí añadirías otras páginas del panel, ej: <Route path="tareas" element={<TasksPage />} /> */}
    </Route>
  </Route>
  {/* === FIN DE LAS NUEVAS RUTAS PRIVADAS === */}

      </Routes>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>,
);