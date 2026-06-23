import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { opsDptoApi, type VolRanking, type Operacion, type Merito } from '../../services/api';
import styles from './Ops.module.css';

type PuntoHistorial = { id:number; puntos:number; concepto:string; asignado_nombre:string; created_at:string };

function fmt(n: number) { return new Intl.NumberFormat('es-BO').format(n); }
function fmtDate(s: string) {
  return new Intl.DateTimeFormat('es-BO',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(s));
}
function fmtDateShort(s: string) {
  return new Intl.DateTimeFormat('es-BO',{day:'numeric',month:'short',year:'numeric'}).format(new Date(s));
}

function MeritoTable({ items, color }: { items: Merito[]; color: string }) {
  return (
    <div className={styles.modalOpsTable}>
      <div className={styles.modalTableHead} style={{gridTemplateColumns:'1fr 110px 52px'}}>
        <span>Título</span><span>Fecha</span><span>Pts</span>
      </div>
      {items.map(m => (
        <div key={m.id} className={styles.modalTableRow} style={{gridTemplateColumns:'1fr 110px 52px'}}>
          <div>
            <div className={styles.modalOpTitle}>{m.titulo}</div>
            {m.descripcion && <div className={styles.modalOpSub}>{m.descripcion}</div>}
          </div>
          <span className={styles.modalOpDate}>{fmtDateShort(m.fecha)}</span>
          <span className={styles.modalOpPts} style={{color}}>
            {(m.puntos_extra||0) > 0 ? `+${m.puntos_extra}` : m.puntos_extra || '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

function VolDetalleModal({ vol, onClose }: { vol: VolRanking; onClose: () => void }) {
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
    t === 'nacional' ? '#2563eb' : t === 'internacional' ? '#7c3aed' : '#16a34a';

  const ptsDesdOps    = ops.filter(o => o.estado === 'validado').reduce((s, o) => s + (o.puntos_asignados || 0), 0);
  const ptsDesdPuntos = puntos.reduce((s, p) => s + p.puntos, 0);
  const ptsDesdMer    = meritos.reduce((s, m) => s + (m.puntos_extra || 0), 0);

  const meritosList    = meritos.filter(m => m.tipo === 'merito');
  const demertitosList = meritos.filter(m => m.tipo === 'demerito');
  const antiguedadList = meritos.filter(m => m.tipo === 'antiguedad');

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} style={{maxWidth:780}} onClick={e => e.stopPropagation()}>

        <div className={styles.modalHeader}>
          <div>
            <div className={styles.modalVolName}>{vol.nombre} {vol.apellido_paterno}</div>
            <div className={styles.modalVolMeta}>
              <span className={styles.modalMatTag}>{vol.matricula}</span>
              {vol.grado && (
                <span style={{
                  fontFamily:'var(--font-body)', fontSize:'0.72rem', fontWeight:700,
                  letterSpacing:'0.06em', textTransform:'uppercase',
                  padding:'0.2rem 0.625rem', borderRadius:4,
                  background:'rgba(196,30,30,0.08)', color:'#C41E1E',
                  border:'1px solid rgba(196,30,30,0.2)'
                }}>{vol.grado}</span>
              )}
              <span className={styles.modalPtsBadge}>⭐ {fmt(vol.total_puntos)} pts totales</span>
            </div>
          </div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {/* Perfil rápido */}
          <div className={styles.volProfileRow}>
            {vol.cargo_directiva && (
              <div className={styles.volProfileItem}>
                <span className={styles.volProfileLabel}>Cargo</span>
                <span className={styles.volProfileVal}>{vol.cargo_directiva}</span>
              </div>
            )}
            {vol.especialidad && (
              <div className={styles.volProfileItem}>
                <span className={styles.volProfileLabel}>Especialidad</span>
                <span className={styles.volProfileVal}>{vol.especialidad}</span>
              </div>
            )}
            {vol.antiguedad_anios > 0 && (
              <div className={styles.volProfileItem}>
                <span className={styles.volProfileLabel}>Antigüedad</span>
                <span className={styles.volProfileVal}>{vol.antiguedad_anios} año{vol.antiguedad_anios !== 1 ? 's' : ''}</span>
              </div>
            )}
            <div className={styles.volProfileItem}>
              <span className={styles.volProfileLabel}>Ops validadas</span>
              <span className={styles.volProfileVal}>{vol.ops_validadas}</span>
            </div>
            <div className={styles.volProfileItem}>
              <span className={styles.volProfileLabel}>Méritos</span>
              <span className={styles.volProfileVal} style={{color:'#16a34a'}}>{vol.meritos_count}</span>
            </div>
            <div className={styles.volProfileItem}>
              <span className={styles.volProfileLabel}>Deméritos</span>
              <span className={styles.volProfileVal} style={{color:'#C41E1E'}}>{vol.demeritos_count}</span>
            </div>
          </div>

          {loading && <p className={styles.empty}>Cargando…</p>}

          {!loading && (
            <>
              {/* Desglose de puntos */}
              {(ptsDesdOps > 0 || ptsDesdPuntos !== 0 || ptsDesdMer !== 0) && (
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

              {/* Operaciones */}
              <div className={styles.modalSectionTitle}>🚒 Operaciones ({ops.length})</div>
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
                        style={{background: tipoColor(op.tipo)+'22', color: tipoColor(op.tipo)}}>
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

              {/* Méritos */}
              {meritosList.length > 0 && (
                <>
                  <div className={styles.modalSectionTitle} style={{marginTop:'1.25rem'}}>
                    🏅 Méritos y reconocimientos ({meritosList.length})
                  </div>
                  <MeritoTable items={meritosList} color="#16a34a" />
                </>
              )}

              {/* Deméritos */}
              {demertitosList.length > 0 && (
                <>
                  <div className={styles.modalSectionTitle} style={{marginTop:'1.25rem'}}>
                    ⚠️ Deméritos ({demertitosList.length})
                  </div>
                  <MeritoTable items={demertitosList} color="#C41E1E" />
                </>
              )}

              {/* Antigüedad */}
              {antiguedadList.length > 0 && (
                <>
                  <div className={styles.modalSectionTitle} style={{marginTop:'1.25rem'}}>
                    📅 Antigüedad ({antiguedadList.length})
                  </div>
                  <MeritoTable items={antiguedadList} color="#7c3aed" />
                </>
              )}

              {/* Asignaciones directas */}
              {puntos.length > 0 && (
                <>
                  <div className={styles.modalSectionTitle} style={{marginTop:'1.25rem'}}>
                    ⭐ Asignaciones directas ({puntos.length})
                  </div>
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

export default function OpsVoluntarios() {
  const [voluntarios, setVoluntarios] = useState<VolRanking[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [selected, setSelected]       = useState<VolRanking | null>(null);

  useEffect(() => {
    opsDptoApi.voluntariosRanking()
      .then(setVoluntarios)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const closeModal = useCallback(() => setSelected(null), []);

  const filtered = voluntarios.filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.nombre.toLowerCase().includes(q) ||
      v.apellido_paterno.toLowerCase().includes(q) ||
      v.matricula.toLowerCase().includes(q) ||
      (v.grado || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Ranking de Voluntarios</h1>
          <p className={styles.pageSub}>Todos los voluntarios activos — puntos, operaciones, méritos y deméritos</p>
        </div>
        <Link to=".." className={styles.secondaryBtn}>← Dashboard</Link>
      </div>

      <div style={{display:'flex', gap:'0.75rem', alignItems:'center'}}>
        <input
          type="search"
          className={styles.input}
          style={{maxWidth:360}}
          placeholder="Buscar por nombre, matrícula o grado…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <span style={{fontSize:'0.82rem', color:'#64748B'}}>
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className={styles.tableWrap}>
        <div className={`${styles.tableHeader} ${styles.volGrid}`}>
          <span>#</span>
          <span>Voluntario</span>
          <span>Grado</span>
          <span style={{textAlign:'right'}}>Puntos</span>
          <span style={{textAlign:'center'}}>Ops</span>
          <span style={{textAlign:'center'}}>M / D</span>
        </div>

        {loading && <div className={styles.empty}>Cargando voluntarios…</div>}
        {!loading && filtered.length === 0 && <div className={styles.empty}>Sin resultados.</div>}

        {filtered.map(v => {
          const rankNum = voluntarios.indexOf(v) + 1;
          return (
            <div
              key={v.id}
              className={`${styles.tableRow} ${styles.volGrid} ${styles.rankItemClickable}`}
              onClick={() => setSelected(v)}
              style={rankNum <= 3 ? {background:'#FFFBEB'} : undefined}
            >
              <span
                className={styles.rankNum}
                style={{color: MEDAL[rankNum-1] ?? '#CBD5E1', fontSize:'1rem'}}
              >
                {rankNum}
              </span>
              <div>
                <div className={styles.cellName}>{v.nombre} {v.apellido_paterno}</div>
                <div className={styles.cellSub}>
                  {v.matricula}{v.cargo_directiva ? ` · ${v.cargo_directiva}` : ''}
                </div>
              </div>
              <span>
                {v.grado
                  ? <span className={styles.cellBadge} style={{background:'rgba(196,30,30,0.08)', color:'#C41E1E'}}>
                      {v.grado}
                    </span>
                  : <span style={{color:'#CBD5E1', fontSize:'0.8rem'}}>—</span>
                }
              </span>
              <span style={{textAlign:'right'}}>
                <span className={styles.rankPtsNum} style={{fontSize:'1.05rem'}}>{fmt(v.total_puntos)}</span>
              </span>
              <span style={{textAlign:'center', color:'#475569', fontWeight:700, fontSize:'0.9rem'}}>
                {v.ops_validadas}
              </span>
              <span style={{textAlign:'center', fontSize:'0.88rem'}}>
                <span style={{color:'#16a34a', fontWeight:700}}>{v.meritos_count}</span>
                <span style={{color:'#CBD5E1', margin:'0 0.25rem'}}>/</span>
                <span style={{color:'#C41E1E', fontWeight:700}}>{v.demeritos_count}</span>
              </span>
            </div>
          );
        })}
      </div>

      {selected && <VolDetalleModal vol={selected} onClose={closeModal} />}
    </div>
  );
}
