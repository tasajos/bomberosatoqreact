import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ordenesApi, API_BASE, type OrdenOperacion, type NivelDificultad, type EstadoOrden } from '../services/api';
import EmergenciaMap, { type MapImage } from '../components/EmergenciaMap';
import styles from './OrdenesEmergencia.module.css';

const NIVEL: Record<NivelDificultad, { label: string; color: string; icon: string }> = {
  baja:    { label: 'Dificultad baja',    color: '#16a34a', icon: '🟢' },
  media:   { label: 'Dificultad media',   color: '#d97706', icon: '🟡' },
  alta:    { label: 'Dificultad alta',    color: '#ea580c', icon: '🟠' },
  critica: { label: 'Dificultad crítica', color: '#C41E1E', icon: '🔴' },
};
const ESTADO: Record<EstadoOrden, { label: string; color: string }> = {
  activa:     { label: 'Activa',     color: '#16a34a' },
  en_curso:   { label: 'En curso',   color: '#2563eb' },
  finalizada: { label: 'Finalizada', color: '#64748B' },
  cancelada:  { label: 'Cancelada',  color: '#C41E1E' },
};

function homeForRole(role?: string): string {
  switch (role) {
    case 'presidente': return '/presidente';
    case 'voluntario': return '/voluntario';
    case 'admin': return '/admin/dashboard';
    case 'jefe_operaciones':
    case 'coordinador': return '/operaciones';
    default: return '/';
  }
}

/** Contenido reutilizable (sin barra superior ni shell) — se monta
 *  dentro de un layout con sidebar/topbar, o dentro de la página standalone. */
export function OrdenesEmergenciaView() {
  const [ordenes, setOrdenes] = useState<OrdenOperacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<EstadoOrden | 'todas'>('activa');
  const [busy, setBusy] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    ordenesApi.list().then(r => setOrdenes(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const visibles = useMemo(
    () => filtro === 'todas' ? ordenes : ordenes.filter(o => o.estado === filtro),
    [ordenes, filtro]
  );

  const toggleInscripcion = async (o: OrdenOperacion) => {
    setBusy(o.id);
    try {
      if (o.ya_inscrito) await ordenesApi.desinscribir(o.id);
      else await ordenesApi.inscribir(o.id);
      load();
    } catch { /* noop */ } finally { setBusy(null); }
  };

  return (
    <>
      <div className={styles.content}>
        <h1 className={styles.heading}>🚨 Órdenes de Operación y Emergencia</h1>
        <p className={styles.subheading}>
          Solicitudes activas de la institución. Inscríbete en las operaciones donde puedas participar.
        </p>

        <div className={styles.filters}>
          {(['activa', 'en_curso', 'finalizada', 'todas'] as const).map(f => (
            <button key={f}
              className={`${styles.filterBtn} ${filtro === f ? styles.filterBtnActive : ''}`}
              onClick={() => setFiltro(f)}>
              {f === 'todas' ? 'Todas' : f === 'activa' ? 'Activas' : f === 'en_curso' ? 'En curso' : 'Finalizadas'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.empty}>Cargando órdenes…</div>
        ) : visibles.length === 0 ? (
          <div className={styles.empty}>No hay órdenes de operación en esta categoría.</div>
        ) : (
          <div className={styles.grid}>
            {visibles.map(o => {
              const niv = NIVEL[o.nivel_dificultad];
              const est = ESTADO[o.estado];
              const puedeInscribirse = o.estado === 'activa' || o.estado === 'en_curso';
              const mapImages: MapImage[] = o.imagenes
                .filter(im => im.lat != null && im.lng != null)
                .map(im => ({ id: im.id, url: im.url, lat: im.lat, lng: im.lng, descripcion: im.descripcion }));
              return (
                <div key={o.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <div className={styles.cardBadges}>
                      <span className={styles.badge} style={{ background: `${niv.color}1A`, color: niv.color }}>{niv.icon} {niv.label}</span>
                      <span className={styles.badge} style={{ background: `${est.color}1A`, color: est.color }}>{est.label}</span>
                    </div>
                    <div className={styles.cardTitle}>{o.titulo}</div>
                    <div className={styles.cardMeta}>
                      {o.direccion || 'Sin dirección registrada'}
                      {o.creado_nombre ? ` · Publicado por ${o.creado_nombre}` : ''}
                    </div>
                    {o.descripcion && <div className={styles.cardDesc}>{o.descripcion}</div>}

                    <div className={styles.infoRow}>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Voluntarios requeridos</span>
                        <span className={styles.infoVal}>{o.voluntarios_requeridos || '—'}</span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Inscritos</span>
                        <span className={styles.infoVal}>{o.inscritos}</span>
                      </div>
                    </div>

                    {o.equipos_necesarios && (
                      <div className={styles.equipos}>
                        <div className={styles.equiposLabel}>🧰 Equipos / recursos necesarios</div>
                        <div className={styles.equiposText}>{o.equipos_necesarios}</div>
                      </div>
                    )}
                  </div>

                  {o.lat != null && o.lng != null && (
                    <div className={styles.mapWrap}>
                      <EmergenciaMap
                        emergencia={{ lat: o.lat, lng: o.lng }}
                        center={[o.lat, o.lng]}
                        images={mapImages}
                        height="300px"
                      />
                    </div>
                  )}

                  {o.imagenes.length > 0 && (
                    <div className={styles.gallery}>
                      {o.imagenes.map(im => (
                        <img key={im.id} className={styles.galleryImg}
                          src={`${API_BASE}${im.url}`} alt={im.descripcion || ''}
                          onClick={() => setLightbox(`${API_BASE}${im.url}`)} />
                      ))}
                    </div>
                  )}

                  <div className={styles.cardFooter}>
                    <div>
                      <div className={styles.inscritos}>
                        <span className={styles.inscritosNum}>{o.inscritos}</span>
                        <span className={styles.inscritosLabel}>
                          voluntario{o.inscritos !== 1 ? 's' : ''} inscrito{o.inscritos !== 1 ? 's' : ''}
                          {o.voluntarios_requeridos ? ` de ${o.voluntarios_requeridos}` : ''}
                        </span>
                      </div>
                      {o.voluntarios.length > 0 && (
                        <div className={styles.avatars}>
                          {o.voluntarios.slice(0, 8).map(v => (
                            <span key={v.voluntario_id} className={styles.avatarChip}>{v.nombre}</span>
                          ))}
                          {o.voluntarios.length > 8 && <span className={styles.avatarChip}>+{o.voluntarios.length - 8}</span>}
                        </div>
                      )}
                    </div>
                    <button
                      className={`${styles.btn} ${!puedeInscribirse ? styles.btnDisabled : o.ya_inscrito ? styles.btnLeave : styles.btnJoin}`}
                      disabled={!puedeInscribirse || busy === o.id}
                      onClick={() => toggleInscripcion(o)}>
                      {busy === o.id ? '…' : o.ya_inscrito ? '✓ Inscrito — Salir' : !puedeInscribirse ? 'Cerrada' : '🙋 Inscribirme'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {lightbox && (
        <div className={styles.lightbox} onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" />
        </div>
      )}
    </>
  );
}

/** Página standalone con barra superior propia — para roles que no usan
 *  el sidebar del voluntario (presidencia, admin, operaciones). */
export default function OrdenesEmergencia() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className={styles.shell}>
      <div className={styles.topBar}>
        <Link to="/" className={styles.logo}>
          <img src="/yunka_atoq_log.png" alt="Yunka Atoq" />
          <span>
            <div className={styles.logoName}>Yunka Atoq</div>
            <div className={styles.logoSub}>Órdenes de operación</div>
          </span>
        </Link>
        <div className={styles.topRight}>
          {user && <span className={styles.topUser}>{user.nombre} · {user.role.replace(/_/g, ' ')}</span>}
          <Link to={homeForRole(user?.role)} className={styles.topBtn}>← Mi panel</Link>
          <button className={styles.topBtn} onClick={handleLogout}>Salir</button>
        </div>
      </div>
      <OrdenesEmergenciaView />
    </div>
  );
}
