import { useState, useEffect, type CSSProperties } from 'react';
import { capacitacionesApi, type Capacitacion } from '../services/api';
import s from './MisCapacitaciones.module.css';

type CapAbierta = Capacitacion & { ya_inscrito: number };
type Filtro = 'todas' | 'disponibles' | 'inscritas';

function parseDate(str?: string) {
  if (!str) return null;
  const d = new Date(str.slice(0, 10) + 'T12:00:00');
  return isNaN(d.getTime()) ? null : d;
}

const TIPO_CFG: Record<string, { label: string; icon: string; color: string; grad: string }> = {
  interna:       { label: 'Interna',       icon: '🚒', color: '#1741B8', grad: 'linear-gradient(135deg,#2F6BFF,#1741B8)' },
  externa:       { label: 'Externa',       icon: '🌐', color: '#13795B', grad: 'linear-gradient(135deg,#1F9D6B,#13795B)' },
  certificacion: { label: 'Certificación', icon: '🎓', color: '#5B21B6', grad: 'linear-gradient(135deg,#7C5CFF,#5B21B6)' },
};

function DateBox({ fecha }: { fecha?: string }) {
  const d = parseDate(fecha);
  if (!d) return <div className={s.dateBox}><div className={s.dateNone}>FECHA<br />POR DEFINIR</div></div>;
  return (
    <div className={s.dateBox}>
      <div className={s.dateDay}>{d.getDate()}</div>
      <div className={s.dateMonth}>{new Intl.DateTimeFormat('es-BO', { month: 'short' }).format(d).replace('.', '')}</div>
      <div className={s.dateYear}>{d.getFullYear()}</div>
    </div>
  );
}

export default function MisCapacitaciones() {
  const [lista, setLista]     = useState<CapAbierta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState<number | null>(null);
  const [msg, setMsg]         = useState('');
  const [filtro, setFiltro]   = useState<Filtro>('todas');

  const load = () => {
    setLoading(true);
    capacitacionesApi.getAbiertas()
      .then(data => setLista(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const inscribirse = async (cap: CapAbierta) => {
    setBusy(cap.id);
    try {
      if (cap.ya_inscrito) {
        await capacitacionesApi.desinscribirse(cap.id);
        setMsg(`Te has desinscrito de "${cap.nombre}".`);
      } else {
        await capacitacionesApi.inscribirse(cap.id);
        setMsg(`✅ Te inscribiste en "${cap.nombre}". El responsable verá tu inscripción.`);
      }
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(null);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  const inscritas = lista.filter(c => c.ya_inscrito);
  const visibles  = filtro === 'inscritas' ? inscritas
                  : filtro === 'disponibles' ? lista.filter(c => !c.ya_inscrito)
                  : lista;
  const FILTROS: { key: Filtro; label: string; count: number }[] = [
    { key: 'todas',       label: 'Todas',       count: lista.length },
    { key: 'disponibles', label: 'Disponibles', count: lista.length - inscritas.length },
    { key: 'inscritas',   label: 'Inscritas',   count: inscritas.length },
  ];

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.header}>
        <div>
          <div className={s.kicker}>Formación continua</div>
          <h1 className={s.title}>Capacitaciones disponibles</h1>
          <p className={s.subtitle}>Todas las capacitaciones activas. Inscríbete o cancela tu inscripción desde cada tarjeta.</p>
        </div>
        {lista.length > 0 && (
          <div className={s.filters}>
            {FILTROS.map(f => (
              <button key={f.key}
                className={`${s.filterBtn} ${filtro === f.key ? s.filterActive : ''}`}
                onClick={() => setFiltro(f.key)}>
                {f.label} <span className={s.filterCount}>{f.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {msg && <div className={s.toast}>{msg}</div>}

      {loading && <p className={s.loading}>Cargando capacitaciones…</p>}

      {!loading && !visibles.length && (
        <div className={s.empty}>
          <div className={s.emptyIcon}>📚</div>
          <div className={s.emptyTitle}>
            {lista.length ? 'No hay capacitaciones en este filtro' : 'No hay capacitaciones activas por el momento'}
          </div>
          <p className={s.emptyText}>Cuando se active una capacitación, aparecerá aquí.</p>
        </div>
      )}

      {/* Grid de capacitaciones */}
      <div className={s.grid}>
        {visibles.map(cap => {
          const tc       = TIPO_CFG[cap.tipo] ?? TIPO_CFG.interna;
          const inscrito = !!cap.ya_inscrito;
          const horas    = Number(cap.horas) || 0;
          const lleno    = cap.cupo > 0 && cap.inscritos >= cap.cupo;
          const pct      = cap.cupo > 0 ? Math.min(100, (cap.inscritos / cap.cupo) * 100) : 0;

          return (
            <article key={cap.id}
              className={`${s.card} ${inscrito ? s.cardInscrito : ''}`}
              style={{ '--cap-color': tc.color, '--cap-grad': tc.grad } as CSSProperties}>
              <div className={s.cover}>
                <div>
                  <div className={s.coverIcon}>{tc.icon}</div>
                  <div className={s.coverBadges}>
                    <span className={s.badge}>{tc.label}</span>
                    {inscrito && <span className={`${s.badge} ${s.badgeOk}`}>✓ Inscrito</span>}
                  </div>
                </div>
                <DateBox fecha={cap.fecha} />
              </div>

              <div className={s.body}>
                <h3 className={s.name}>{cap.nombre}</h3>
                {cap.descripcion && <p className={s.desc}>{cap.descripcion}</p>}

                <div className={s.details}>
                  {cap.institucion && (
                    <span className={`${s.detail} ${s.detailInst}`}><span className={s.detailIcon}>🏛</span><span>{cap.institucion}</span></span>
                  )}
                  {cap.instructor && (
                    <span className={s.detail}><span className={s.detailIcon}>👤</span><span>{cap.instructor}</span></span>
                  )}
                  {cap.lugar && (
                    <span className={s.detail}><span className={s.detailIcon}>📍</span><span>{cap.lugar}</span></span>
                  )}
                  {horas > 0 && (
                    <span className={s.detail}><span className={s.detailIcon}>⏱</span><span>{horas} horas académicas</span></span>
                  )}
                </div>

                {cap.cupo > 0 && (
                  <div className={s.cupo}>
                    <div className={s.cupoHead}>
                      <span>CUPO</span>
                      <span><span className={s.cupoNum}>{cap.inscritos}</span> / {cap.cupo}</span>
                    </div>
                    <div className={s.cupoBar}>
                      <div className={`${s.cupoFill} ${lleno ? s.cupoFull : ''}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div className={s.footer}>
                <span className={s.inscritos}>
                  👥 <span className={s.inscritosNum}>{cap.inscritos}</span>
                  inscrito{cap.inscritos !== 1 ? 's' : ''}
                </span>
                <button
                  disabled={busy === cap.id || (lleno && !inscrito)}
                  onClick={() => inscribirse(cap)}
                  className={`${s.btn} ${inscrito ? s.btnLeave : s.btnJoin}`}>
                  {busy === cap.id ? '…' : inscrito ? 'Cancelar inscripción' : lleno ? 'Cupo lleno' : 'Inscribirme'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
