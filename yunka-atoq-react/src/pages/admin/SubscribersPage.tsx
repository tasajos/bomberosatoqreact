import { useState, useEffect } from 'react';
import { suscriptoresApi, type Suscriptor } from '../../services/api';
import styles from './SubscribersPage.module.css';

function fmtDate(s: string) {
  return new Intl.DateTimeFormat('es-BO', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date(s));
}

export default function SubscribersPage() {
  const [subs,    setSubs]    = useState<Suscriptor[]>([]);
  const [total,   setTotal]   = useState(0);
  const [activos, setActivos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState<'todos'|'activos'|'inactivos'>('activos');

  const load = () => {
    setLoading(true);
    suscriptoresApi.list()
      .then(r => { setSubs(r.data); setTotal(r.total); setActivos(r.activos); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleUnsubscribe = async (s: Suscriptor) => {
    if (!confirm(`¿Dar de baja a ${s.email}?`)) return;
    await suscriptoresApi.delete(s.id);
    load();
  };

  const copyEmails = () => {
    const emails = visible.map(s => s.email).join(', ');
    navigator.clipboard.writeText(emails).then(() => alert(`${visible.length} emails copiados al portapapeles`));
  };

  const visible = subs
    .filter(s => filter === 'todos' ? true : filter === 'activos' ? s.activo === 1 : s.activo === 0)
    .filter(s => s.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>Suscriptores del boletín</div>
          <p className={styles.pageDesc}>Personas que se suscribieron al boletín mensual desde el sitio.</p>
        </div>
        <button className={styles.copyBtn} onClick={copyEmails} disabled={visible.length === 0}>
          📋 Copiar emails ({visible.length})
        </button>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statNum}>{total}</div>
          <div className={styles.statLabel}>Total registrados</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNum} style={{ color: '#16a34a' }}>{activos}</div>
          <div className={styles.statLabel}>Activos</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNum} style={{ color: '#ef4444' }}>{total - activos}</div>
          <div className={styles.statLabel}>Dados de baja</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNum}>{total > 0 ? Math.round((activos/total)*100) : 0}%</div>
          <div className={styles.statLabel}>Tasa de retención</div>
        </div>
      </div>

      {/* Filtros */}
      <div className={styles.controls}>
        <div className={styles.tabs}>
          {([['activos','Activos'], ['todos','Todos'], ['inactivos','Inactivos']] as const).map(([val, label]) => (
            <button key={val}
              className={`${styles.tabBtn} ${filter === val ? styles.tabBtnActive : ''}`}
              onClick={() => setFilter(val)}>{label}</button>
          ))}
        </div>
        <input
          className={styles.search}
          placeholder="Buscar email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Tabla */}
      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span>Email</span>
          <span>Fuente</span>
          <span>Fecha de suscripción</span>
          <span>Estado</span>
          <span>Acción</span>
        </div>

        {loading && <p className={styles.empty}>Cargando suscriptores…</p>}
        {!loading && visible.length === 0 && (
          <p className={styles.empty}>No hay suscriptores{search ? ` con "${search}"` : ''}.</p>
        )}

        {visible.map(s => (
          <div key={s.id} className={`${styles.row} ${!s.activo ? styles.rowInactive : ''}`}>
            <span className={styles.email}>{s.email}</span>
            <span className={styles.fuente}>{s.fuente}</span>
            <span className={styles.date}>{fmtDate(s.created_at)}</span>
            <span>
              {s.activo
                ? <span className={styles.badgeActive}>Activo</span>
                : <span className={styles.badgeInactive}>Dado de baja</span>
              }
            </span>
            <span>
              {s.activo && (
                <button className={styles.btnUnsub} onClick={() => handleUnsubscribe(s)}>
                  Dar de baja
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
