import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import App from './App.tsx';
import HomePage from './pages/HomePage.tsx';
import DonationsPage from './pages/DonationsPage.tsx';
import PartnershipsPage from './pages/PartnershipsPage.tsx';
import SupportPage from './pages/SupportPage.tsx';
import ProjectsPage from './pages/ProjectsPage.tsx';
import AboutPage from './pages/AboutPage.tsx';
import ContactPage from './pages/ContactPage.tsx';
import NotePage from './pages/NotePage.tsx';
import HistoryPage from './pages/HistoryPage.tsx';
import AwardsPage from './pages/AwardsPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import ServicesPage from './pages/ServicesPage.tsx';
import StatsPage from './pages/StatsPage.tsx';
import GalleryPage from './pages/GalleryPage.tsx';
import VolunteeringPage from './pages/VolunteeringPage.tsx';
import NewsPage from './pages/NewsPage.tsx';

import { AuthProvider } from './context/AuthContext.tsx';
import ProtectedRoute from './auth/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import SliderPage from './pages/admin/SliderPage';
import CampaignsPage from './pages/admin/CampaignsPage';
import RecognitionsAdminPage from './pages/admin/RecognitionsAdminPage';
import ServicesAdminPage from './pages/admin/ServicesAdminPage';
import GalleryAdminPage from './pages/admin/GalleryAdminPage';
import NewsAdminPage from './pages/admin/NewsAdminPage';
import SubscribersPage from './pages/admin/SubscribersPage';
import ContactAdminPage from './pages/admin/ContactAdminPage';
import SiteConfigPage from './pages/admin/SiteConfigPage';
import UsersAdminPage from './pages/admin/UsersAdminPage';
import PresidenteLayout from './layouts/PresidenteLayout';
import PresidenteDashboard from './pages/presidente/PresidenteDashboard';
import PresidenteVolunteers     from './pages/presidente/PresidenteVolunteers';
import PresidentePersonal       from './pages/presidente/PresidentePersonal';
import PresidenteCapacitaciones from './pages/presidente/PresidenteCapacitaciones';
import DocumentosPresidencia from './pages/presidente/DocumentosPresidencia';
import OperacionesLayout from './layouts/OperacionesLayout';
import OpsTabsLayout from './layouts/OpsTabsLayout';
import OpsDashboard     from './pages/operaciones/OpsDashboard';
import OpsRegistrar     from './pages/operaciones/OpsRegistrar';
import OpsValidar       from './pages/operaciones/OpsValidar';
import OpsPuntos        from './pages/operaciones/OpsPuntos';
import OpsGuardia       from './pages/operaciones/OpsGuardia';
import OpsVerGuardia    from './pages/operaciones/OpsVerGuardia';
import OpsLibro         from './pages/operaciones/OpsLibro';
import OpsMeritos       from './pages/operaciones/OpsMeritos';
import OpsVoluntarios   from './pages/operaciones/OpsVoluntarios';
import OpsOrdenOperacion from './pages/operaciones/OpsOrdenOperacion';
import OrdenesEmergencia, { OrdenesEmergenciaView } from './pages/OrdenesEmergencia';
import MisCapacitaciones from './pages/MisCapacitaciones';
import PostulacionesPage  from './pages/admin/PostulacionesPage';
import MilestonesPage     from './pages/admin/MilestonesPage';
import VoluntarioLayout     from './layouts/VoluntarioLayout';
import VoluntarioDashboard  from './pages/voluntario/VoluntarioDashboard';
import VoluntarioMeritos    from './pages/voluntario/VoluntarioMeritos';
import VoluntarioFile       from './pages/voluntario/VoluntarioFile';

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
            <Route path="contacto"      element={<ContactPage />} />
            <Route path="notas/:notaId" element={<NotePage />} />
            <Route path="servicios"      element={<ServicesPage />} />
            <Route path="estadisticas"   element={<StatsPage />} />
            <Route path="galeria"        element={<GalleryPage />} />
            <Route path="voluntarios"    element={<VolunteeringPage />} />
            <Route path="noticias"       element={<NewsPage />} />
          </Route>

          {/* Login standalone — sin header/footer */}
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute allowedRoles={['voluntario', 'admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="dashboard"        element={<DashboardPage />} />
              <Route path="mis-capacitaciones" element={<MisCapacitaciones />} />
              <Route path="slider"           element={<SliderPage />} />
              <Route path="campanias"        element={<CampaignsPage />} />
              <Route path="reconocimientos"  element={<RecognitionsAdminPage />} />
              <Route path="servicios"        element={<ServicesAdminPage />} />
              <Route path="galeria"          element={<GalleryAdminPage />} />
              <Route path="noticias"         element={<NewsAdminPage />} />
              <Route path="suscriptores"     element={<SubscribersPage />} />
              <Route path="contactos"        element={<ContactAdminPage />} />
              <Route path="configuracion"    element={<SiteConfigPage />} />
              <Route path="usuarios"         element={<UsersAdminPage />} />
              <Route path="postulaciones"    element={<PostulacionesPage />} />
              <Route path="milestones"       element={<MilestonesPage />} />
            </Route>
          </Route>

          {/* Vista del voluntario */}
          <Route element={<ProtectedRoute allowedRoles={['voluntario']} />}>
            <Route path="/voluntario" element={<VoluntarioLayout />}>
              <Route index element={<VoluntarioDashboard />} />
              <Route path="capacitaciones" element={<MisCapacitaciones />} />
              <Route path="meritos" element={<VoluntarioMeritos />} />
              <Route path="file" element={<VoluntarioFile />} />
              <Route path="ordenes" element={<OrdenesEmergenciaView />} />
            </Route>
          </Route>

          {/* Vista presidencial */}
          <Route element={<ProtectedRoute allowedRoles={['presidente']} />}>
            <Route path="/presidente" element={<PresidenteLayout />}>
              <Route index element={<PresidenteDashboard />} />
              <Route path="voluntarios"        element={<PresidenteVolunteers />} />
              <Route path="personal"           element={<PresidentePersonal />} />
              <Route path="capacitaciones"     element={<PresidenteCapacitaciones />} />
              <Route path="mis-capacitaciones" element={<MisCapacitaciones />} />
              <Route path="postulaciones"      element={<PostulacionesPage />} />
              <Route path="ordenes"            element={<OrdenesEmergenciaView />} />
              <Route path="resoluciones"    element={<DocumentosPresidencia tipo="resolucion" />} />
              <Route path="procedimientos"  element={<DocumentosPresidencia tipo="procedimiento" />} />
              <Route path="protocolos"      element={<DocumentosPresidencia tipo="protocolo" />} />
              <Route path="comunicados"     element={<DocumentosPresidencia tipo="comunicado" />} />
              {/* Operaciones con sub-opciones como pestañas, dentro del shell presidencial */}
              <Route path="operaciones" element={<OpsTabsLayout />}>
                <Route index element={<OpsDashboard />} />
                <Route path="orden-operacion"     element={<OpsOrdenOperacion />} />
                <Route path="registrar"           element={<OpsRegistrar />} />
                <Route path="validar"             element={<OpsValidar />} />
                <Route path="puntos"              element={<OpsPuntos />} />
                <Route path="guardia"             element={<OpsGuardia />} />
                <Route path="ver-guardia"         element={<OpsVerGuardia />} />
                <Route path="libro"               element={<OpsLibro />} />
                <Route path="meritos"             element={<OpsMeritos />} />
                <Route path="voluntarios-ranking" element={<OpsVoluntarios />} />
                <Route path="capacitaciones"      element={<MisCapacitaciones />} />
              </Route>
            </Route>
          </Route>

          {/* Órdenes de operación — visible para todos los usuarios autenticados */}
          <Route element={<ProtectedRoute allowedRoles={['admin','presidente','coordinador','fundador','voluntario','postulante','jefe_operaciones','jefe_personal','jefe_logistica','jefe_marketing','jefe_enlaces','jefe_finanzas']} />}>
            <Route path="/ordenes-emergencia" element={<OrdenesEmergencia />} />
          </Route>

          {/* Departamento de Operaciones */}
          <Route element={<ProtectedRoute allowedRoles={['admin','presidente','jefe_operaciones','coordinador']} />}>
            <Route path="/operaciones" element={<OperacionesLayout />}>
              <Route index element={<OpsDashboard />} />
              <Route path="orden-operacion" element={<OpsOrdenOperacion />} />
              <Route path="registrar" element={<OpsRegistrar />} />
              <Route path="validar"   element={<OpsValidar />} />
              <Route path="puntos"    element={<OpsPuntos />} />
              <Route path="guardia"     element={<OpsGuardia />} />
              <Route path="ver-guardia" element={<OpsVerGuardia />} />
              <Route path="libro"       element={<OpsLibro />} />
              <Route path="meritos"              element={<OpsMeritos />} />
              <Route path="voluntarios-ranking"  element={<OpsVoluntarios />} />
              <Route path="capacitaciones"       element={<MisCapacitaciones />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
