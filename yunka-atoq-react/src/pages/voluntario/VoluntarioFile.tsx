import { useEffect, useState } from 'react';
import { voluntarioApi, type VoluntarioDashboardData } from '../../services/api';
import { GRADOS } from '../../utils/rankBadge';
import s from './VoluntarioDashboard.module.css';

function gradoLabel(value: string) {
  return GRADOS.find(g => g.value === value)?.label ?? value ?? '—';
}

function antiguedad(created?: string) {
  if (!created) return '—';
  const d = new Date(created);
  if (isNaN(d.getTime())) return '—';
  const now = new Date();
  let meses = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) meses--;
  if (meses < 0) meses = 0;
  const años = Math.floor(meses / 12);
  const m = meses % 12;
  const pa = años > 0 ? `${años} año${años !== 1 ? 's' : ''}` : '';
  const pm = m > 0 ? `${m} mes${m !== 1 ? 'es' : ''}` : '';
  return [pa, pm].filter(Boolean).join(', ') || 'Menos de 1 mes';
}

export default function VoluntarioFile() {
  const [data, setData] = useState<VoluntarioDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    voluntarioApi.miPerfil()
      .then(setData)
      .catch(e => setError(e.message || 'Error al cargar datos'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={s.loading}>Cargando file…</div>;
  if (error) return <div className={s.errorBox}>{error}</div>;
  if (!data) return null;

  const { usuario, stats, file_caps, cursos_externos } = data;
  const nombre = `${usuario.nombre} ${usuario.apellido_paterno} ${usuario.apellido_materno || ''}`.trim();
  const initials = `${usuario.nombre?.[0] ?? ''}${usuario.apellido_paterno?.[0] ?? ''}`.toUpperCase();
  const disponible = !!usuario.activo;

  const datos: [string, string][] = [
    ['Nombre completo', nombre],
    ['Grado', gradoLabel(usuario.grado)],
    ['Matrícula', usuario.matricula || '—'],
    ['Código', usuario.codigo || '—'],
    ['Especialidad', usuario.especialidad || '—'],
    ...(usuario.cargo_directiva ? [['Cargo en directiva', usuario.cargo_directiva] as [string, string]] : []),
    ['Antigüedad', antiguedad(usuario.created_at)],
    ['Correo', usuario.email || '—'],
    ['Teléfono', usuario.telefono || '—'],
  ];

  const formacion = [
    ...cursos_externos.map(c => c.nombre),
    ...file_caps.map(c => c.nombre),
  ].filter(Boolean);

  const resumen: [string, string | number][] = [
    ['Guardias', stats.guardias],
    ['Operaciones', stats.operaciones],
    ['Capacitaciones', stats.caps_inscritas],
    ['Puntos acumulados', stats.puntos],
  ];

  return (
    <div className={s.page}>
      {/* Cabecera */}
      <section className={s.fileCover}>
        <div className={s.fileBanner} />
        <div className={s.fileHeader}>
          <div className={s.fileAvatar}>{initials}</div>
          <div className={s.fileHeaderInfo}>
            <div className={s.fileName}>{nombre}</div>
            <div className={s.fileSub}>{gradoLabel(usuario.grado)}{usuario.matricula ? ` · ${usuario.matricula}` : ''}</div>
          </div>
          <div className={s.fileStatus}>
            <span className={s.equipoDot} style={{ background: disponible ? '#1F9D6B' : '#E11D48', boxShadow: `0 0 8px ${disponible ? '#1F9D6B' : '#E11D48'}` }} />
            <span className={s.fileStatusText}>{disponible ? 'Disponible' : 'Inactivo'}</span>
          </div>
        </div>
      </section>

      <div className={s.fileGrid}>
        {/* Datos generales */}
        <section className={s.sectionCard}>
          <div className={s.cardKicker} style={{ marginBottom: 16, display: 'block' }}>DATOS GENERALES</div>
          <div>
            {datos.map(([k, v]) => (
              <div key={k} className={s.dataRow}>
                <span className={s.dataKey}>{k}</span>
                <span className={s.dataVal}>{v}</span>
              </div>
            ))}
          </div>
        </section>

        <div className={s.fileCol}>
          {/* Formación */}
          <section className={s.sectionCard}>
            <div className={s.cardKicker} style={{ marginBottom: 14, display: 'block' }}>FORMACIÓN Y CERTIFICACIONES</div>
            {formacion.length === 0 ? (
              <div className={s.empty}><div className={s.emptyIcon}>🎓</div><div className={s.emptyText}>Sin cursos ni certificaciones registrados</div></div>
            ) : (
              <div className={s.chipWrap}>
                {formacion.map((c, i) => (
                  <span key={i} className={s.chipItem}><span className={s.chipDot} />{c}</span>
                ))}
              </div>
            )}
          </section>

          {/* Resumen operativo */}
          <section className={s.sectionCard}>
            <div className={s.cardKicker} style={{ marginBottom: 14, display: 'block' }}>RESUMEN OPERATIVO</div>
            <div>
              {resumen.map(([k, v]) => (
                <div key={k} className={s.dataRow}>
                  <span className={s.dataKey}>{k}</span>
                  <span className={s.dataVal}>{v}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
