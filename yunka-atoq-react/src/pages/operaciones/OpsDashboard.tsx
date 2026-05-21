import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { opsDptoApi, type OpsDptoResumen } from '../../services/api';
import styles from './Ops.module.css';

function fmt(n: number) { return new Intl.NumberFormat('es-BO').format(n); }
function fmtDate(s: string) {
  return new Intl.DateTimeFormat('es-BO',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(s));
}

export default function OpsDashboard() {
  const [data, setData] = useState<OpsDptoResumen | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    opsDptoApi.resumen().then(setData).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const tipoColor = (t: string) =>
    t==='nacional'?'#2563eb':t==='internacional'?'#7c3aed':'#16a34a';

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard Operativo</h1>
          <p className={styles.pageSub}>Resumen del departamento de operaciones</p>
        </div>
        <Link to="/operaciones/registrar" className={styles.primaryBtn}>+ Nueva operación</Link>
      </div>

      {/* KPIs */}
      <div className={styles.kpiRow}>
        {[
          { label:'Operaciones año', value: data?.operaciones.total ?? 0, icon:'🚒', color:'#C41E1E' },
          { label:'Validadas',       value: data?.operaciones.validadas ?? 0, icon:'✅', color:'#16a34a' },
          { label:'Pendientes',      value: data?.operaciones.pendientes ?? 0, icon:'⏳', color:'#d97706' },
          { label:'Guardias año',    value: data?.guardias.total ?? 0, icon:'🛡️', color:'#0369a1' },
          { label:'Puntos entregados',value: data?.puntos_totales ?? 0, icon:'⭐', color:'#7c3aed' },
        ].map(k => (
          <div key={k.label} className={styles.kpiCard} style={{ borderTop:`3px solid ${k.color}` }}>
            <span style={{fontSize:'1.5rem'}}>{k.icon}</span>
            <div className={styles.kpiNum} style={{color:k.color}}>{loading?'—':fmt(k.value)}</div>
            <div className={styles.kpiLabel}>{k.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.twoCol}>
        {/* Top 5 puntos */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>🏆 Top 5 voluntarios por puntos</span>
          </div>
          <div className={styles.rankList}>
            {(data?.top5_puntos ?? []).map((v,i) => (
              <div key={i} className={styles.rankItem}>
                <span className={styles.rankNum}>{i+1}</span>
                <div className={styles.rankInfo}>
                  <div className={styles.rankName}>{v.nombre} {v.apellido_paterno}</div>
                  <div className={styles.rankMat}>{v.matricula}</div>
                </div>
                <div className={styles.rankPts}>
                  <span className={styles.rankPtsNum}>{fmt(v.total_puntos)}</span>
                  <span className={styles.rankPtsLabel}>pts</span>
                </div>
              </div>
            ))}
            {!loading && !data?.top5_puntos?.length && (
              <p className={styles.empty}>Sin datos aún.</p>
            )}
          </div>
        </div>

        {/* Últimas operaciones */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>🕐 Últimas operaciones</span>
            <Link to="/operaciones/validar" className={styles.cardLink}>Ver todas →</Link>
          </div>
          <div className={styles.opsList}>
            {(data?.recientes ?? []).map(op => (
              <div key={op.id} className={styles.opsItem}>
                <div>
                  <span className={styles.opsTipo} style={{background:tipoColor(op.tipo)+'22',color:tipoColor(op.tipo)}}>
                    {op.tipo}
                  </span>
                  <div className={styles.opsTitulo}>{op.titulo}</div>
                  <div className={styles.opsVol}>{op.voluntario_nombre} · {fmtDate(op.fecha)}</div>
                </div>
                <span className={`${styles.opsEstado} ${styles['estado_'+op.estado]}`}>{op.estado}</span>
              </div>
            ))}
            {!loading && !data?.recientes?.length && (
              <p className={styles.empty}>Sin operaciones registradas.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
