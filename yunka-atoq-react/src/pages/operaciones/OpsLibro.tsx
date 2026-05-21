import { useState, useEffect } from 'react';
import { opsDptoApi, type Guardia } from '../../services/api';
import styles from './Ops.module.css';

function fmtDate(s: string) {
  return new Intl.DateTimeFormat('es-BO',{day:'numeric',month:'long',year:'numeric'}).format(new Date(s+'T12:00:00'));
}

const TURNO_ICON: Record<string,string> = { diurno:'🌞', nocturno:'🌙', '24h':'🕐' };

export default function OpsLibro() {
  const [guardias, setGuardias] = useState<Guardia[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [desde,    setDesde]    = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().slice(0,10);
  });
  const [hasta, setHasta] = useState(() => new Date().toISOString().slice(0,10));

  const load = () => {
    setLoading(true);
    opsDptoApi.listGuardias({ fecha_desde: desde, fecha_hasta: hasta })
      .then(setGuardias).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[desde, hasta]);

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este registro de guardia?')) return;
    await opsDptoApi.deleteGuardia(id);
    load();
  };

  // Agrupar por fecha
  const grouped = guardias.reduce((acc, g) => {
    const key = g.fecha;
    if (!acc[key]) acc[key] = [];
    acc[key].push(g);
    return acc;
  }, {} as Record<string, Guardia[]>);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Libro de Guardia</h1>
          <p className={styles.pageSub}>{guardias.length} registros en el período seleccionado</p>
        </div>
        <div style={{display:'flex',gap:'0.75rem',alignItems:'center',flexWrap:'wrap'}}>
          <div className={styles.field} style={{margin:0}}>
            <label className={styles.label}>Desde</label>
            <input className={styles.input} type="date" value={desde} onChange={e=>setDesde(e.target.value)} style={{width:'145px'}}/>
          </div>
          <div className={styles.field} style={{margin:0}}>
            <label className={styles.label}>Hasta</label>
            <input className={styles.input} type="date" value={hasta} onChange={e=>setHasta(e.target.value)} style={{width:'145px'}}/>
          </div>
        </div>
      </div>

      {loading && <p className={styles.empty}>Cargando libro de guardia…</p>}
      {!loading && !guardias.length && (
        <p className={styles.empty}>No hay registros en el período seleccionado.</p>
      )}

      {Object.entries(grouped).sort(([a],[b])=>b.localeCompare(a)).map(([fecha, items]) => (
        <div key={fecha} className={styles.card} style={{marginBottom:'1rem'}}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>📅 {fmtDate(fecha)}</span>
            <span style={{fontFamily:'var(--font-condensed)',fontSize:'0.72rem',fontWeight:700,color:'#94A3B8',letterSpacing:'0.08em'}}>
              {items.length} voluntario{items.length>1?'s':''} · {items.reduce((s,g)=>s+g.operativos_count,0)} operativos
            </span>
          </div>
          <div className={styles.tableHeader} style={{gridTemplateColumns:'2fr 1.2fr 1fr 2fr auto'}}>
            <span>Voluntario</span><span>Turno</span><span>Rol</span><span>Novedades</span><span></span>
          </div>
          {items.map(g => (
            <div key={g.id} className={styles.tableRow} style={{gridTemplateColumns:'2fr 1.2fr 1fr 2fr auto'}}>
              <div>
                <div className={styles.cellName}>{g.voluntario_nombre}</div>
                <div className={styles.cellSub}>{g.codigo} · {g.matricula}</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'0.375rem'}}>
                <span>{TURNO_ICON[g.turno]}</span>
                <span className={styles.cellSub}>{g.turno}</span>
                {g.operativos_count > 0 && (
                  <span style={{background:'rgba(196,30,30,0.1)',color:'#C41E1E',fontFamily:'var(--font-condensed)',fontSize:'0.6rem',fontWeight:700,padding:'0.15rem 0.4rem',borderRadius:'3px',marginLeft:'0.25rem'}}>
                    {g.operativos_count} ops
                  </span>
                )}
              </div>
              <div className={styles.cellSub}>{g.rol_guardia||'—'}</div>
              <div className={styles.cellSub} style={{fontSize:'0.78rem',lineHeight:1.4}}>
                {g.novedades || <span style={{color:'#CBD5E1'}}>Sin novedades</span>}
              </div>
              <button className={`${styles.btnSm} ${styles.btnSmRed}`} onClick={()=>handleDelete(g.id)}>🗑</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
