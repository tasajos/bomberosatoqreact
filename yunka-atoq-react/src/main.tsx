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
import VerificarCertificadoPage from './pages/VerificarCertificadoPage';

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
import CertificadosPresidencia from './pages/presidente/CertificadosPresidencia';
import CredencialesPresidencia from './pages/presidente/CredencialesPresidencia';
import VerificarCredencialPage from './pages/VerificarCredencialPage';
import ConveniosPresidencia from './pages/presidente/ConveniosPresidencia';
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
import Finanzas from './pages/gestion/Finanzas';
import Solicitudes from './pages/gestion/Solicitudes';
import Logistica from './pages/gestion/Logistica';
import Prestamos from './pages/gestion/Prestamos';
import Voucher from './pages/gestion/Voucher';
import Mensualidades, { MensualidadVoluntario, MiMensualidad } from './pages/gestion/Mensualidades';
import Deudas from './pages/gestion/Deudas';
import Acta from './pages/gestion/Acta';
import Personal, { PersonalNuevo } from './pages/gestion/Personal';
import PersonalFile from './pages/gestion/PersonalFile';
import Asistencia, { ReporteAsistencia } from './pages/gestion/Asistencia';
import Comisiones from './pages/gestion/Comisiones';
import Llamadas, { LlamadaDoc } from './pages/gestion/Llamadas';
import Bitacora from './pages/gestion/Bitacora';
import Reglamento from './pages/gestion/Reglamento';
import { MiFile } from './pages/gestion/PersonalFile';
import Correos from './pages/gestion/Correos';
import ActividadVoluntario from './pages/gestion/ActividadVoluntario';
import DocumentosVoluntario from './pages/gestion/DocumentosVoluntario';
import { CursosZona } from './pages/cursos/CursosZona';
import { rutasPortal, rutasPresidencia } from './pages/cursos/zona';
import CursosGestion from './pages/cursos/CursosGestion';
import UsuariosExternos from './pages/presidente/UsuariosExternos';
import CursoEditor from './pages/cursos/CursoEditor';
import CursosCatalogo from './pages/cursos/CursosCatalogo';
import CursosDictar from './pages/cursos/CursosDictar';
import Aula from './pages/cursos/Aula';
import CursosPublico from './pages/cursos/CursosPublico';
import CursosAcceso from './pages/cursos/CursosAcceso';
import CursosVerificar from './pages/cursos/CursosVerificar';
import CursosExternoLayout from './pages/cursos/CursosExternoLayout';

import './index.css';

// Cursos online dentro de cada portal institucional: tomar cursos y, si es instructor, dictarlos.
const rutasCursosPortal = (base: string) => (
  <Route element={<CursosZona modo="interno" rutas={rutasPortal(base)} />}>
    <Route path="cursos-online"     element={<CursosCatalogo />} />
    <Route path="cursos-online/:id" element={<Aula />} />
    <Route path="dictar"            element={<CursosDictar />} />
    <Route path="dictar/:id"        element={<CursoEditor />} />
  </Route>
);

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
            <Route path="certificados/verificar/:token" element={<VerificarCertificadoPage />} />
            <Route path="credenciales/verificar/:token" element={<VerificarCredencialPage />} />
            <Route path="cursos"          element={<CursosPublico />} />
            <Route path="cursos/registro" element={<CursosAcceso modo="registro" />} />
            <Route path="cursos/ingresar" element={<CursosAcceso modo="ingresar" />} />
            <Route path="cursos/verificar/:token" element={<CursosVerificar />} />
          </Route>

          {/* Portal de cursos para participantes e instructores externos (sesión propia de cursos) */}
          <Route element={<CursosExternoLayout />}>
            <Route path="/cursos/aula"           element={<CursosCatalogo />} />
            <Route path="/cursos/aula/:id"       element={<Aula />} />
            <Route path="/cursos/instructor"     element={<CursosDictar />} />
            <Route path="/cursos/instructor/:id" element={<CursoEditor />} />
          </Route>

          {/* Login standalone — sin header/footer */}
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute allowedRoles={['admin', 'presidente']} />}>
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
          <Route element={<ProtectedRoute allowedRoles={['jefe_finanzas']} />}>
            <Route path="/finanzas" element={<PresidenteLayout portal="finanzas" />}>
              <Route index element={<Finanzas />} />
              <Route path="ingresos" element={<Finanzas vista="ingreso" />} />
              <Route path="egresos" element={<Finanzas vista="egreso" />} />
              <Route path="reservas" element={<Finanzas vista="reservas" />} />
              <Route path="deudas" element={<Deudas />} />
              <Route path="mensualidades" element={<Mensualidades />} />
              <Route path="mensualidades/:id" element={<MensualidadVoluntario />} />
              <Route path="solicitar-ingreso" element={<Solicitudes tipo="ingreso" />} />
              <Route path="solicitar-egreso" element={<Solicitudes tipo="egreso" />} />
              <Route path="solicitudes" element={<Solicitudes />} />
              <Route path="voucher/:codigo" element={<Voucher />} />
              <Route path="capacitaciones" element={<MisCapacitaciones />} />
              <Route path="correos" element={<Correos />} />
              {rutasCursosPortal('/finanzas')}
            </Route>
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['jefe_personal']} />}>
            <Route path="/personal" element={<PresidenteLayout portal="personal" />}>
              <Route index element={<Personal />} />
              <Route path="nuevo" element={<PersonalNuevo />} />
              <Route path="file/:id" element={<PersonalFile />} />
              <Route path="asistencia" element={<Asistencia />} />
              <Route path="reporte" element={<ReporteAsistencia />} />
              <Route path="comisiones" element={<Comisiones />} />
              <Route path="llamadas" element={<Llamadas />} />
              <Route path="llamada/:codigo" element={<LlamadaDoc />} />
              <Route path="bitacora" element={<Bitacora />} />
              <Route path="reglamento" element={<Reglamento />} />
              <Route path="capacitaciones" element={<MisCapacitaciones />} />
              <Route path="correos" element={<Correos />} />
              {rutasCursosPortal('/personal')}
            </Route>
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['jefe_logistica']} />}>
            <Route path="/logistica" element={<PresidenteLayout portal="logistica" />}>
              <Route index element={<Logistica />} />
              <Route path="inventario" element={<Logistica vista="inventario" />} />
              <Route path="estados" element={<Logistica vista="estados" />} />
              <Route path="acta/:codigo" element={<Acta />} />
              <Route path="prestamos" element={<Prestamos />} />
              <Route path="capacitaciones" element={<MisCapacitaciones />} />
              <Route path="correos" element={<Correos />} />
              {rutasCursosPortal('/logistica')}
            </Route>
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['voluntario']} />}>
            <Route path="/voluntario" element={<VoluntarioLayout />}>
              <Route index element={<VoluntarioDashboard />} />
              <Route path="capacitaciones" element={<MisCapacitaciones />} />
              <Route path="meritos" element={<VoluntarioMeritos />} />
              <Route path="file" element={<MiFile />} />
              <Route path="llamada/:codigo" element={<LlamadaDoc />} />
              <Route path="operaciones" element={<ActividadVoluntario tipo="operaciones" />} />
              <Route path="guardias" element={<ActividadVoluntario tipo="guardias" />} />
              <Route path="solicitudes" element={<Solicitudes />} />
              <Route path="mensualidades" element={<MiMensualidad />} />
              <Route path="voucher/:codigo" element={<Voucher />} />
              <Route path="equipos" element={<Prestamos />} />
              <Route path="acta/:codigo" element={<Acta />} />
              <Route path="documentos" element={<DocumentosVoluntario />} />
              <Route path="ordenes" element={<OrdenesEmergenciaView />} />
              {rutasCursosPortal('/voluntario')}
            </Route>
          </Route>

          {/* Vista presidencial */}
          <Route element={<ProtectedRoute allowedRoles={['presidente']} />}>
            <Route path="/presidente" element={<PresidenteLayout />}>
              <Route index element={<PresidenteDashboard />} />
              <Route path="finanzas" element={<Finanzas />} />
              <Route path="deudas" element={<Deudas />} />
              <Route path="mensualidades" element={<Mensualidades />} />
              <Route path="mensualidades/:id" element={<MensualidadVoluntario />} />
              <Route path="solicitudes" element={<Solicitudes />} />
              <Route path="voucher/:codigo" element={<Voucher />} />
              <Route path="prestamos" element={<Prestamos />} />
              <Route path="logistica" element={<Logistica />} />
              <Route path="acta/:codigo" element={<Acta />} />
              <Route path="correos" element={<Correos />} />
              <Route path="voluntarios"        element={<PresidenteVolunteers />} />
              <Route path="personal"           element={<PresidentePersonal />} />
              <Route path="usuarios-externos"  element={<UsuariosExternos />} />
              <Route path="capacitaciones"     element={<PresidenteCapacitaciones />} />
              <Route path="mis-capacitaciones" element={<MisCapacitaciones />} />
              <Route path="postulaciones"      element={<PostulacionesPage />} />
              <Route path="ordenes"            element={<OrdenesEmergenciaView />} />
              <Route path="resoluciones"    element={<DocumentosPresidencia tipo="resolucion" />} />
              <Route path="procedimientos"  element={<DocumentosPresidencia tipo="procedimiento" />} />
              <Route path="protocolos"      element={<DocumentosPresidencia tipo="protocolo" />} />
              <Route path="comunicados"     element={<DocumentosPresidencia tipo="comunicado" />} />
              <Route path="cartas"          element={<DocumentosPresidencia tipo="carta" />} />
              <Route path="certificados"    element={<CertificadosPresidencia />} />
              <Route path="credenciales"    element={<CredencialesPresidencia />} />
              <Route path="convenios"       element={<ConveniosPresidencia />} />
              <Route element={<CursosZona modo="interno" rutas={rutasPresidencia} />}>
                <Route path="cursos"          element={<CursosGestion />} />
                <Route path="cursos/:id"      element={<CursoEditor />} />
                <Route path="cursos/:id/aula" element={<Aula />} />
              </Route>
              {rutasCursosPortal('/presidente')}
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
              {rutasCursosPortal('/operaciones')}
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
