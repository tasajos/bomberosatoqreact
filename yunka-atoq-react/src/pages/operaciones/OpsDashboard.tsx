import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { opsDptoApi, type OpsDptoResumen, type Operacion, type Merito } from '../../services/api';

type PuntoHistorial = { id:number; puntos:number; concepto:string; asignado_nombre:string; created_at:string };
import styles from './Ops.module.css';

function fmt(n: number) { return new Intl.NumberFormat('es-BO').format(n); }
function fmtDate(s: string) {
  return new Intl.DateTimeFormat('es-BO',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(s));
}

type VolTop5 = { id:number; nombre:string; apellido_paterno:string; matricula:string; total_puntos:number };

function VolModal({ vol, onClose }: { vol: VolTop5; onClose: () => void }) {
  const [ops,     setOps]     = useState<Operacion[]>([]);
  const [puntos,  setPuntos]  = useState<PuntoHistorial[]>([]);
  const [meritos, setMeritos] = useState<Merito[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      opsDptoApi.porVoluntario(vol.id),
      opsDptoApi.getPuntos(vol.id),
      opsDptoApi.listMeritos(vol.id),
    ]).then(([opsR, ptsR, merR]) => {
      setOps(opsR.data);
      setPuntos(ptsR.historial);
      setMeritos(merR);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [vol.id]);

  const tipoColor = (t: string) =>
    t==='nacional'?'#2563eb':t==='internacional'?'#7c3aed':'#16a34a';

  const meritoColor = (t: string) =>
    t==='merito'?'#16a34a':t==='demerito'?'#C41E1E':'#7c3aed';

  const ptsDesdOps    = ops.filter(o => o.estado === 'validado').reduce((s,o) => s + (o.puntos_asignados||0), 0);
  const ptsDesdPuntos = puntos.reduce((s,p) => s + p.puntos, 0);
  const ptsDesdMer    = meritos.reduce((s,m) => s + (m.puntos_extra||0), 0);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.modalHeader}>
          <div>
            <div className={styles.modalVolName}>{vol.nombre} {vol.apellido_paterno}</div>
            <div className={styles.modalVolMeta}>
              <span className={styles.modalMatTag}>{vol.matricula}</span>
              <span className={styles.modalPtsBadge}>⭐ {fmt(vol.total_puntos)} pts totales</span>
            </div>
          </div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {loading && <p className={styles.empty}>Cargando…</p>}

          {!loading && (
            <>
              {/* Desglose de puntos */}
              {(ptsDesdOps > 0 || ptsDesdPuntos !== 0 || ptsDesdMer > 0) && (
                <div className={styles.modalBreakdown}>
                  {ptsDesdOps > 0 && (
                    <div className={styles.modalBreakdownItem}>
                      <span className={styles.modalBreakdownLabel}>🚒 Operaciones</span>
                      <span className={styles.modalBreakdownPts}>+{ptsDesdOps}</span>
                    </div>
                  )}
                  {ptsDesdMer !== 0 && (
                    <div className={styles.modalBreakdownItem}>
                      <span className={styles.modalBreakdownLabel}>🏅 Méritos / Deméritos</span>
                      <span className={styles.modalBreakdownPts} style={{color: ptsDesdMer < 0 ? '#C41E1E' : '#16a34a'}}>
                        {ptsDesdMer > 0 ? `+${ptsDesdMer}` : ptsDesdMer}
                      </span>
                    </div>
                  )}
                  {ptsDesdPuntos !== 0 && (
                    <div className={styles.modalBreakdownItem}>
                      <span className={styles.modalBreakdownLabel}>⭐ Asignaciones directas</span>
                      <span className={styles.modalBreakdownPts} style={{color: ptsDesdPuntos < 0 ? '#C41E1E' : '#5b21b6'}}>
                        {ptsDesdPuntos > 0 ? `+${ptsDesdPuntos}` : ptsDesdPuntos}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Operaciones ── */}
              <div className={styles.modalSectionTitle}>🚒 Operaciones</div>
              {ops.length === 0 ? (
                <p className={styles.modalEmpty}>Sin operaciones registradas.</p>
              ) : (
                <div className={styles.modalOpsTable}>
                  <div className={styles.modalTableHead}>
                    <span>Tipo</span><span>Título</span><span>Fecha</span><span>Pts</span><span>Estado</span>
                  </div>
                  {ops.map(op => (
                    <div key={op.id} className={styles.modalTableRow}>
                      <span className={styles.opsTipo}
                        style={{ background: tipoColor(op.tipo)+'22', color: tipoColor(op.tipo) }}>
                        {op.tipo}
                      </span>
                      <div>
                        <div className={styles.modalOpTitle}>{op.titulo}</div>
                        {op.lugar && <div className={styles.modalOpSub}>{op.lugar}</div>}
                      </div>
                      <span className={styles.modalOpDate}>{fmtDate(op.fecha)}</span>
                      <span className={styles.modalOpPts}>
                        {op.puntos_asignados > 0 ? `+${op.puntos_asignados}` : '—'}
                      </span>
                      <span className={`${styles.opsEstado} ${styles['estado_'+op.estado]}`}>{op.estado}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Méritos / Reconocimientos ── */}
              {meritos.length > 0 && (
                <>
                  <div className={styles.modalSectionTitle} style={{marginTop:'1.25rem'}}>🏅 Méritos y reconocimientos</div>
                  <div className={styles.modalOpsTable}>
                    <div className={styles.modalTableHead} style={{gridTemplateColumns:'80px 1fr 110px 52px'}}>
                      <span>Tipo</span><span>Título</span><span>Fecha</span><span>Pts</span>
                    </div>
                    {meritos.map(m => (
                      <div key={m.id} className={styles.modalTableRow} style={{gridTemplateColumns:'80px 1fr 110px 52px'}}>
                        <span className={styles.opsTipo}
                          style={{ background: meritoColor(m.tipo)+'22', color: meritoColor(m.tipo) }}>
                          {m.tipo}
                        </span>
                        <div>
                          <div className={styles.modalOpTitle}>{m.titulo}</div>
                          {m.descripcion && <div className={styles.modalOpSub}>{m.descripcion}</div>}
                        </div>
                        <span className={styles.modalOpDate}>{fmtDate(m.fecha)}</span>
                        <span className={styles.modalOpPts} style={{color: meritoColor(m.tipo)}}>
                          {(m.puntos_extra||0) > 0 ? `+${m.puntos_extra}` : m.puntos_extra || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── Asignaciones directas ── */}
              {puntos.length > 0 && (
                <>
                  <div className={styles.modalSectionTitle} style={{marginTop:'1.25rem'}}>⭐ Asignaciones directas</div>
                  <div className={styles.modalOpsTable}>
                    <div className={styles.modalTableHead} style={{gridTemplateColumns:'1fr 130px 52px'}}>
                      <span>Concepto</span><span>Asignado por</span><span>Pts</span>
                    </div>
                    {puntos.map(p => (
                      <div key={p.id} className={styles.modalTableRow} style={{gridTemplateColumns:'1fr 130px 52px'}}>
                        <div className={styles.modalOpTitle}>{p.concepto}</div>
                        <span className={styles.modalOpDate}>{p.asignado_nombre}</span>
                        <span className={styles.modalOpPts} style={{color: p.puntos < 0 ? '#C41E1E' : '#5b21b6'}}>
                          {p.puntos > 0 ? `+${p.puntos}` : p.puntos}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {ops.length === 0 && meritos.length === 0 && puntos.length === 0 && (
                <p className={styles.empty}>Este voluntario no tiene actividad registrada.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const MEDAL = ['#F59E0B', '#94A3B8', '#CD7F32'];

export default function OpsDashboard() {
  const [data, setData] = useState<OpsDptoResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVol, setSelectedVol] = useState<VolTop5 | null>(null);

  useEffect(() => {
    opsDptoApi.resumen().then(setData).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const closeModal = useCallback(() => setSelectedVol(null), []);

  const tipoColor = (t: string) =>
    t==='nacional'?'#2563eb':t==='internacional'?'#7c3aed':'#16a34a';

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard Operativo</h1>
          <p className={styles.pageSub}>Resumen del departamento de operaciones</p>
        </div>
        <Link to="registrar" className={styles.primaryBtn}>+ Nueva operación</Link>
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
            <span style={{fontSize:'1.75rem', lineHeight:'1'}}>{k.icon}</span>
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
            <Link to="voluntarios-ranking" className={styles.cardLink}>Ver todos →</Link>
          </div>
          <div className={styles.rankList}>
            {(data?.top5_puntos ?? []).map((v,i) => (
              <div
                key={i}
                className={`${styles.rankItem} ${styles.rankItemClickable}`}
                onClick={() => setSelectedVol(v)}
                style={i === 0 ? { background: '#FFFBEB' } : undefined}
              >
                <span
                  className={styles.rankNum}
                  style={{ color: MEDAL[i] ?? '#CBD5E1' }}
                >
                  {i+1}
                </span>
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
            <Link to="validar" className={styles.cardLink}>Ver todas →</Link>
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

      {/* Modal de operaciones del voluntario */}
      {selectedVol && <VolModal vol={selectedVol} onClose={closeModal} />}
    </div>
  );
}
