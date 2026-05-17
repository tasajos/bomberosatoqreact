import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

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

import { AuthProvider } from './context/AuthContext.tsx';
import ProtectedRoute from './auth/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';

import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<HomePage />} />
            <Route path="nosotros"      element={<AboutPage />} />
            <Route path="historia"      element={<HistoryPage />} />
            <Route path="reconocimientos" element={<AwardsPage />} />
            <Route path="proyectos"     element={<ProjectsPage />} />
            <Route path="donaciones"    element={<DonationsPage />} />
            <Route path="convenios"     element={<PartnershipsPage />} />
            <Route path="apoyos"        element={<SupportPage />} />
            <Route path="voluntarios"   element={<RecruitmentPage />} />
            <Route path="contacto"      element={<ContactPage />} />
            <Route path="notas/:notaId" element={<NotePage />} />
            <Route path="login"         element={<LoginPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['voluntario', 'admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="dashboard" element={<DashboardPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
