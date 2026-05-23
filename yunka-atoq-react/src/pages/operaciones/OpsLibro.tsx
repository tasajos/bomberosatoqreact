import { useState, useEffect } from 'react';
import { opsDptoApi, type Guardia } from '../../services/api';
import styles from './Ops.module.css';

function fmtDate(s: string) {
  const d = new Date(s.slice(0, 10) + 'T12:00:00');
  return isNaN(d.getTime()) ? s : new Intl.DateTimeFormat('es-BO', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(d);
}

const TURNO_ICON: Record<string, string> = { diurno: '🌞', nocturno: '🌙', '24h': '🕐' };

export default function OpsLibro() {
  const [guardias, setGuardias] = useState<Guardia[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [desde, setDesde] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [hasta, setHasta] = useState(() => new Date().toISOString().slice(0, 10));

  const load = () => {
    setLoading(true);
    setErr('');
    opsDptoApi.listGuardias({ fecha_desde: desde, fecha_hasta: hasta })
      .then(data => setGuardias(Array.isArray(data) ? data : []))
      .catch(e => setErr(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [desde, hasta]);

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este registro de guardia?')) return;
    await opsDptoApi.deleteGuardia(id).catch(() => {});
    load();
  };

  const grouped = guardias.reduce((acc, g) => {
    const key = g.fecha.slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(g);
    return acc;
  }, {} as Record<string, Guardia[]>);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Libro de Guardia</h1>
          <p className={styles.pageSub}>
            {loading ? 'Cargando…' : `${guardias.length} registro${guardias.length !== 1 ? 's' : ''} en el período`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className={styles.field} style={{ margin: 0 }}>
            <label className={styles.label}>Desde</label>
            <input className={styles.input} type="date" value={desde}
              onChange={e => setDesde(e.target.value)} style={{ width: '145px' }} />
          </div>
          <div className={styles.field} style={{ margin: 0 }}>
            <label className={styles.label}>Hasta</label>
            <input className={styles.input} type="date" value={hasta}
              onChange={e => setHasta(e.target.value)} style={{ width: '145px' }} />
          </div>
          <button className={styles.secondaryBtn} onClick={load}>Buscar</button>
        </div>
      </div>

      {err && <div className={styles.errorMsg}>{err}</div>}
      {loading && <p className={styles.empty}>Cargando libro de guardia…</p>}
      {!loading && !err && !guardias.length && (
        <p className={styles.empty}>No hay registros en el período seleccionado.</p>
      )}

      {!loading && Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([fecha, items]) => (
        <div key={fecha} className={styles.card} style={{ marginBottom: '1rem' }}>
          <div className={styles.cardHeader} style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            <span className={styles.cardTitle}>📅 {fmtDate(fecha)}</span>
            <span style={{
              fontFamily: 'var(--font-condensed)', fontSize: '0.72rem', fontWeight: 700,
              color: '#94A3B8', letterSpacing: '0.08em',
            }}>
              {items.length} voluntario{items.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Cabecera tabla — oculta en móvil via CSS */}
          <div className={`${styles.tableHeader} ${styles.libroGrid}`}>
            <span>Voluntario</span>
            <span>Turno</span>
            <span>Rol</span>
            <span>Lugar</span>
            <span></span>
          </div>

          {items.map(g => (
            <div key={g.id} className={`${styles.tableRow} ${styles.libroGrid}`}>
              <div>
                <span className={styles.cellMobileLabel}>Voluntario</span>
                <div className={styles.cellName}>{g.voluntario_nombre}</div>
                <div className={styles.cellSub}>{g.codigo} · {g.matricula}</div>
              </div>
              <div>
                <span className={styles.cellMobileLabel}>Turno</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span>{TURNO_ICON[g.turno]}</span>
                  <span className={styles.cellSub}>{g.turno}</span>
                </div>
              </div>
              <div>
                <span className={styles.cellMobileLabel}>Rol</span>
                <div className={styles.cellSub}>{g.rol_guardia || '—'}</div>
              </div>
              <div>
                <span className={styles.cellMobileLabel}>Lugar</span>
                <div className={styles.cellSub} style={{ fontSize: '0.78rem', lineHeight: 1.4 }}>
                  {g.novedades || <span style={{ color: '#CBD5E1' }}>—</span>}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className={`${styles.btnSm} ${styles.btnSmRed}`}
                  onClick={() => handleDelete(g.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
