import { useState, useEffect } from 'react';
import { opsDptoApi, adminUsersApi, type AdminUser, type PuntosResponse } from '../../services/api';
import styles from './Ops.module.css';

function fmtDate(s: string) {
  return new Intl.DateTimeFormat('es-BO',{day:'numeric',month:'short',year:'numeric'}).format(new Date(s));
}

// ── Tabla EXACTA RO-001/25 Art. 9 y Art. 10 ──────────────────────
const TABLA_RO: { c: string; p: number }[] = [
  { c: 'Memorándum a favor',                                                  p:  5 },
  { c: 'Memorándum en contra',                                                p: -6 },
  { c: 'Reconocimientos',                                                     p:  4 },
  { c: 'Certificaciones de la institución',                                   p: 10 },
  { c: 'Certificaciones externos nacional',                                   p:  5 },
  { c: 'Certificaciones Internacionales',                                     p:  8 },
  { c: 'Por cada operación',                                                  p:  2 },
  { c: 'Arresto coordinador Departamental',                                   p: -2 },
  { c: 'Arresto coordinador Nacional',                                        p: -3 },
  { c: 'Arresto por oficiales',                                               p: -1 },
  { c: 'Por cada Apoyo (colectas, campañas)',                                 p:  1 },
  { c: 'Por cada Participación de Emergencia Nacional',                       p: 10 },
  { c: 'Por cada Participación de Emergencia Internacional',                  p: 15 },
  { c: 'Por Representar a la Institución con instituciones internacionales',  p: 20 },
  { c: 'Informe Negativo de Finanzas',                                        p:-25 },
];

export default function OpsPuntos() {
  const [voluntarios, setVoluntarios] = useState<AdminUser[]>([]);
  const [selected,    setSelected]    = useState<number>(0);
  const [puntosData,  setPuntosData]  = useState<PuntosResponse|null>(null);
  const [loadPts,     setLoadPts]     = useState(false);
  const [concepto,    setConcepto]    = useState('');
  const [puntos,      setPuntos]      = useState('');
  const [saving,      setSaving]      = useState(false);
  const [msg,         setMsg]         = useState('');

  const loadVoluntarios = () =>
    adminUsersApi.list().then(r => setVoluntarios(r.filter(u => u.activo))).catch(() => {});

  useEffect(() => { loadVoluntarios(); }, []);

  const reloadPts = () => {
    if (!selected) return;
    setLoadPts(true);
    opsDptoApi.getPuntos(selected).then(setPuntosData).catch(()=>{}).finally(()=>setLoadPts(false));
  };

  // Al cambiar voluntario, recargar historial Y datos frescos del voluntario
  const handleSelectVoluntario = async (id: number) => {
    setSelected(id);
    if (!id) { setPuntosData(null); return; }
    setLoadPts(true);
    try {
      const [pts] = await Promise.all([
        opsDptoApi.getPuntos(id),
        loadVoluntarios(), // refresca total_puntos desde la DB
      ]);
      setPuntosData(pts);
    } catch { /* silencioso */ }
    finally { setLoadPts(false); }
  };

  useEffect(() => { if(!selected){setPuntosData(null);return;} reloadPts(); }, [selected]);

  const selectCat = (c: string, p: number) => { setConcepto(c); setPuntos(p !== 0 ? String(p) : ''); };

  const handleRecalculate = async () => {
    try {
      await adminUsersApi.recalculatePoints();
      await loadVoluntarios();
      if (selected) reloadPts();
      setMsg('✅ Puntos recalculados desde el historial real.');
    } catch { setMsg('❌ Error al recalcular.'); }
  };

  const handleAdd = async () => {
    if (!selected || !puntos || !concepto) { setMsg('⚠️ Completa todos los campos.'); return; }
    setSaving(true); setMsg('');
    try {
      await opsDptoApi.addPuntos({ voluntario_id:selected, puntos:Number(puntos), concepto });
      setMsg('✅ Puntos asignados correctamente.');
      setConcepto(''); setPuntos('');
      reloadPts();
      await loadVoluntarios(); // refresca total_puntos en el selector
    } catch(e:unknown) { setMsg('❌ '+(e instanceof Error?e.message:'Error')); }
    finally { setSaving(false); }
  };

  const vol = voluntarios.find(v => v.id === selected);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Asignar Puntos</h1>
          <p className={styles.pageSub}>Sistema de puntuación según Reglamento RO-001/25 de Antigüedad y Jerarquía</p>
        </div>
        <button className={styles.secondaryBtn} onClick={handleRecalculate}
          title="Recalcula total_puntos de todos los voluntarios desde el historial real">
          🔄 Recalcular todos los totales
        </button>
      </div>

      {/* Referencia reglamento */}
      <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:'10px',padding:'0.875rem 1.25rem',fontSize:'0.8rem',color:'#1E40AF'}}>
        <strong>📋 RO-001/25:</strong>&nbsp;
        Local = <strong>2 pts</strong> · Nacional = <strong>10 pts</strong> · Internacional = <strong>15 pts</strong> ·
        Memorándum a favor = <strong>+5</strong> · Certificación institución = <strong>+10</strong> · Informe financiero neg. = <strong>−25</strong> ·
        Puntaje mínimo ascenso = <strong>100 pts/año</strong>
      </div>

      <div className={styles.twoCol}>
        {/* Izquierda: selector + categorías */}
        <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
          <div className={styles.formCard}>
            {/* Voluntario */}
            <div className={styles.field} style={{marginBottom:'1rem'}}>
              <label className={styles.label}>Voluntario</label>
              <select className={styles.select} value={selected} onChange={e=>handleSelectVoluntario(Number(e.target.value))}>
                <option value={0}>— Seleccionar —</option>
                {voluntarios.map(v=>(
                  <option key={v.id} value={v.id}>
                    {v.nombre} {v.apellido_paterno} ({v.matricula||'—'}) · {
                      v.id===selected && puntosData ? puntosData.total : (v.total_puntos??0)
                    } pts
                  </option>
                ))}
              </select>
            </div>

            {/* Chip resumen voluntario — usa puntosData.total que es siempre fresco */}
            {vol && (
              <div style={{background:'#F8FAFC',border:'1px solid #E2E8F0',borderRadius:'8px',padding:'0.875rem 1rem',display:'flex',gap:'1rem',marginBottom:'1.25rem',alignItems:'center'}}>
                <div style={{textAlign:'center',minWidth:'3.5rem'}}>
                  <div style={{fontFamily:'var(--font-condensed)',fontSize:'1.75rem',fontWeight:900,color:'#7c3aed',lineHeight:1}}>
                    {/* puntosData.total viene directo del SUM() de la DB — siempre exacto */}
                    {loadPts ? '…' : (puntosData?.total ?? vol.total_puntos ?? 0)}
                  </div>
                  <div style={{fontFamily:'var(--font-condensed)',fontSize:'0.58rem',fontWeight:700,letterSpacing:'0.1em',color:'#94A3B8',textTransform:'uppercase'}}>pts totales</div>
                </div>
                <div style={{borderLeft:'1px solid #E2E8F0',paddingLeft:'1rem',flex:1}}>
                  <div style={{fontFamily:'var(--font-condensed)',fontSize:'0.9rem',fontWeight:800,color:'#0F172A'}}>{vol.nombre} {vol.apellido_paterno}</div>
                  <div style={{fontSize:'0.72rem',color:'#64748B'}}>{vol.matricula} · {vol.grado||'Sin grado'}</div>
                  <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginTop:'0.25rem'}}>
                    <div style={{flex:1,height:'4px',background:'#E2E8F0',borderRadius:'999px',overflow:'hidden'}}>
                      <div style={{height:'100%',background:'#7c3aed',borderRadius:'999px',
                        width:`${Math.min(100,((puntosData?.total??0)/100)*100)}%`,transition:'width 0.5s'}}/>
                    </div>
                    <span style={{fontSize:'0.65rem',color:'#94A3B8',whiteSpace:'nowrap'}}>
                      {puntosData?.total??0}/100 pts mín.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tabla exacta del reglamento RO-001/25 */}
            <div style={{marginBottom:'1rem'}}>
              <div style={{fontFamily:'var(--font-condensed)',fontSize:'0.62rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'#94A3B8',marginBottom:'0.625rem'}}>
                📋 Calificación según RO-001/25 — haz clic para seleccionar
              </div>
              {/* Encabezado tabla */}
              <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:'0.5rem',padding:'0.5rem 0.875rem',background:'#1E40AF',borderRadius:'6px 6px 0 0',marginBottom:'1px'}}>
                <span style={{fontFamily:'var(--font-condensed)',fontSize:'0.65rem',fontWeight:700,letterSpacing:'0.08em',color:'white',textTransform:'uppercase'}}>Calificación</span>
                <span style={{fontFamily:'var(--font-condensed)',fontSize:'0.65rem',fontWeight:700,letterSpacing:'0.08em',color:'white',textTransform:'uppercase',textAlign:'right'}}>Puntaje</span>
              </div>
              {/* Filas */}
              {TABLA_RO.map((item, i) => {
                const isNeg = item.p < 0;
                const color = isNeg ? '#C41E1E' : '#16a34a';
                const sel   = concepto === item.c;
                return (
                  <button key={item.c} onClick={() => selectCat(item.c, item.p)}
                    style={{
                      display:'grid', gridTemplateColumns:'1fr auto', gap:'0.5rem',
                      width:'100%', padding:'0.625rem 0.875rem', cursor:'pointer',
                      border:'none', borderBottom:'1px solid #F1F5F9',
                      background: sel ? `${color}0E` : (i%2===0?'#FAFBFC':'white'),
                      transition:'background 0.15s',
                      outline: sel ? `1.5px solid ${color}` : 'none',
                      borderRadius: i === TABLA_RO.length-1 ? '0 0 6px 6px' : '0',
                    }}>
                    <span style={{
                      fontFamily:'var(--font-condensed)', fontSize:'0.8rem', fontWeight: sel?800:600,
                      color: sel ? color : '#374151', textAlign:'left',
                    }}>
                      {item.c}
                    </span>
                    <span style={{
                      fontFamily:'var(--font-condensed)', fontSize:'0.875rem', fontWeight:900,
                      color: sel ? color : (isNeg?'#C41E1E':'#16a34a'),
                      whiteSpace:'nowrap',
                    }}>
                      {item.p > 0 ? `+${item.p}` : item.p} pts
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Campos de asignación */}
            <div style={{borderTop:'1px solid #F1F5F9',paddingTop:'1rem',display:'flex',flexDirection:'column',gap:'0.75rem'}}>
              <div className={styles.field}>
                <label className={styles.label}>Concepto</label>
                <input className={styles.input}
                  placeholder="Selecciona arriba o escribe un concepto personalizado"
                  value={concepto} onChange={e=>setConcepto(e.target.value)} />
              </div>
              <div className={styles.formGrid2}>
                <div className={styles.field}>
                  <label className={styles.label}>Puntos (+/-)</label>
                  <input className={styles.input} type="number"
                    placeholder="Ej. 10 ó -6"
                    value={puntos} onChange={e=>setPuntos(e.target.value)} />
                </div>
                <div style={{display:'flex',alignItems:'flex-end'}}>
                  <button className={styles.primaryBtn} style={{width:'100%',justifyContent:'center'}}
                    onClick={handleAdd} disabled={!selected||!puntos||!concepto||saving}>
                    {saving?'Asignando…':'+ Asignar puntos'}
                  </button>
                </div>
              </div>
              {msg && <div className={msg.startsWith('✅')?styles.successMsg:styles.errorMsg}>{msg}</div>}
            </div>
          </div>
        </div>

        {/* Derecha: historial */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>⭐ Historial</span>
            {puntosData && (
              <span style={{fontFamily:'var(--font-condensed)',fontSize:'0.9rem',fontWeight:900,color:'#7c3aed'}}>
                Total: {puntosData.total} pts
              </span>
            )}
          </div>
          {loadPts && <p className={styles.empty}>Cargando…</p>}
          {!loadPts && !selected && <p className={styles.empty}>Selecciona un voluntario</p>}
          {!loadPts && selected && !puntosData?.historial.length && <p className={styles.empty}>Sin puntos registrados.</p>}
          <div>
            {puntosData?.historial.map((p,i) => (
              <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'0.875rem',padding:'0.875rem 1.25rem',borderBottom:'1px solid #F8FAFC'}}>
                <div style={{fontFamily:'var(--font-condensed)',fontSize:'1.05rem',fontWeight:900,color:p.puntos<0?'#C41E1E':'#7c3aed',minWidth:'3.5rem',textAlign:'right',paddingTop:'0.1rem'}}>
                  {p.puntos>0?`+${p.puntos}`:p.puntos}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:'var(--font-condensed)',fontSize:'0.82rem',fontWeight:700,color:'#0F172A',lineHeight:1.3}}>{p.concepto}</div>
                  <div style={{fontSize:'0.72rem',color:'#94A3B8',marginTop:'0.2rem'}}>{fmtDate(p.created_at)} · {p.asignado_nombre}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
