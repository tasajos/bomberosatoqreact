import { useState, useEffect } from 'react';
import { opsDptoApi, adminUsersApi, type Operacion, type AdminUser, API_BASE } from '../../services/api';
import styles from './Ops.module.css';

function fmtDate(s: string) {
  return new Intl.DateTimeFormat('es-BO',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(s));
}

const TIPO_COLS: Record<string,string> = { local:'badgeLocal', nacional:'badgeNacional', internacional:'badgeInternacional' };
const PUNTOS_POR_TIPO: Record<string, number> = { local: 2, nacional: 10, internacional: 15 };

// ── Modal validar ─────────────────────────────────────────────────
function ValidarModal({ op, voluntarios, onClose, onDone }:{
  op: Operacion; voluntarios: AdminUser[]; onClose:()=>void; onDone:()=>void;
}) {
  const [estado, setEstado] = useState<'validado'|'rechazado'>('validado');
  const [puntos, setPuntos] = useState(String(PUNTOS_POR_TIPO[op.tipo] ?? 2));
  const [obs,    setObs]    = useState('');
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  // Parsear personal_participante
  let participantesIds: number[] = [];
  try { participantesIds = JSON.parse(op.personal_participante || '[]'); } catch { participantesIds = []; }
  const participantes = voluntarios.filter(v => participantesIds.includes(v.id));

  useEffect(() => {
    const h = (e:KeyboardEvent) => { if(e.key==='Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true); setErr('');
    try {
      await opsDptoApi.validarOp(op.id, {
        estado,
        puntos_asignados: Number(puntos)||0,
        observacion_validacion: obs,
      });
      onDone(); onClose();
    } catch(e:unknown) { setErr(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,
      display:'flex',alignItems:'center',justifyContent:'center',padding:'1.5rem',backdropFilter:'blur(4px)'}}
      onClick={onClose}>
      <div style={{background:'white',borderRadius:'14px',width:'100%',maxWidth:'620px',
        maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column',
        boxShadow:'0 24px 80px rgba(0,0,0,0.2)'}}
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{padding:'1.25rem 1.5rem',borderBottom:'1px solid #F1F5F9',
          display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <span style={{fontFamily:'var(--font-body)',fontSize:'1rem',fontWeight:700,color:'#1E293B'}}>
            Validar operación
          </span>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#64748B',fontSize:'1.1rem'}}>✕</button>
        </div>

        {/* Body scrollable */}
        <div style={{overflowY:'auto',flex:1,padding:'1.25rem 1.5rem',display:'flex',flexDirection:'column',gap:'1rem'}}>
          {err && <div className={styles.errorMsg}>{err}</div>}

          {/* Imagen de respaldo */}
          {op.imagen_respaldo && (
            <div>
              <div style={{fontFamily:'var(--font-body)',fontSize:'0.75rem',fontWeight:700,
                letterSpacing:'0.06em',textTransform:'uppercase',color:'#64748B',marginBottom:'0.5rem'}}>
                🖼️ Imagen de respaldo
              </div>
              <a href={op.imagen_respaldo.startsWith('/uploads/') ? `${API_BASE}${op.imagen_respaldo}` : op.imagen_respaldo}
                target="_blank" rel="noreferrer"
                style={{display:'block',borderRadius:'8px',overflow:'hidden',border:'1px solid #E2E8F0',position:'relative'}}>
                <img
                  src={op.imagen_respaldo.startsWith('/uploads/') ? `${API_BASE}${op.imagen_respaldo}` : op.imagen_respaldo}
                  alt="Imagen de respaldo"
                  style={{width:'100%',maxHeight:'260px',objectFit:'cover',display:'block'}}
                  onError={e=>{(e.target as HTMLImageElement).style.display='none';}}
                />
                <div style={{position:'absolute',bottom:'0.5rem',right:'0.5rem',
                  background:'rgba(0,0,0,0.6)',color:'white',fontSize:'0.7rem',fontFamily:'var(--font-condensed)',
                  fontWeight:700,letterSpacing:'0.06em',padding:'0.25rem 0.625rem',borderRadius:'4px',
                  backdropFilter:'blur(4px)'}}>
                  🔍 Ver imagen completa
                </div>
              </a>
            </div>
          )}

          {/* Info operación */}
          <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'1rem'}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:'0.75rem',marginBottom:'0.5rem',flexWrap:'wrap'}}>
              <span className={`${styles.cellBadge} ${styles[TIPO_COLS[op.tipo]]}`} style={{marginTop:'2px',flexShrink:0}}>
                {op.tipo}
              </span>
              <div style={{fontFamily:'var(--font-body)',fontSize:'0.95rem',fontWeight:700,color:'#1E293B',lineHeight:1.35}}>
                {op.titulo}
              </div>
            </div>
            <div style={{fontSize:'0.78rem',color:'#64748B',display:'flex',gap:'1rem',flexWrap:'wrap'}}>
              {op.lugar && <span>📍 {op.lugar}</span>}
              <span>🕐 {fmtDate(op.fecha)}</span>
              {op.duracion_horas > 0 && <span>⏱ {op.duracion_horas}h</span>}
            </div>
          </div>

          {/* Referencia reglamento */}
          <div style={{background:'#FEF9EC',border:'1px solid #FCD34D',borderRadius:'8px',
            padding:'0.75rem 1rem',fontSize:'0.78rem',color:'#92400E'}}>
            <strong>📋 RO-001/25 Art. 9–12:</strong>{' '}
            {op.tipo==='local'         && 'Operación local → 2 puntos por operación'}
            {op.tipo==='nacional'      && 'Emergencia Nacional → 10 puntos directos (Art. 11)'}
            {op.tipo==='internacional' && 'Emergencia Internacional → 15 puntos directos (Art. 12)'}
          </div>

          {/* Responsables */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.625rem'}}>
            {op.oficial_nombre && (
              <div style={{background:'#F0F9FF',border:'1px solid #BAE6FD',borderRadius:'8px',padding:'0.75rem'}}>
                <div style={{fontFamily:'var(--font-body)',fontSize:'0.7rem',fontWeight:700,
                  letterSpacing:'0.06em',textTransform:'uppercase',color:'#0369a1',marginBottom:'0.3rem'}}>
                  🎖️ Oficial responsable
                </div>
                <div style={{fontFamily:'var(--font-body)',fontSize:'0.9rem',fontWeight:700,color:'#1E293B'}}>
                  {op.oficial_nombre}
                </div>
              </div>
            )}
            {op.voluntario_nombre && (
              <div style={{background:'#F0FDF4',border:'1px solid #86EFAC',borderRadius:'8px',padding:'0.75rem'}}>
                <div style={{fontFamily:'var(--font-body)',fontSize:'0.7rem',fontWeight:700,
                  letterSpacing:'0.06em',textTransform:'uppercase',color:'#16a34a',marginBottom:'0.3rem'}}>
                  🧑‍🚒 Voluntario responsable
                </div>
                <div style={{fontFamily:'var(--font-body)',fontSize:'0.9rem',fontWeight:700,color:'#1E293B'}}>
                  {op.voluntario_nombre}
                </div>
                <div style={{fontSize:'0.68rem',color:'#64748B'}}>{op.matricula}</div>
              </div>
            )}
          </div>

          {/* Personal participante */}
          <div>
            <div style={{fontFamily:'var(--font-body)',fontSize:'0.75rem',fontWeight:700,
              letterSpacing:'0.06em',textTransform:'uppercase',color:'#64748B',
              marginBottom:'0.625rem',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span>👥 Personal que participó</span>
              <span style={{fontWeight:600,color:participantes.length>0?'#C41E1E':'#94A3B8'}}>
                {participantes.length} persona{participantes.length!==1?'s':''}
              </span>
            </div>

            {participantes.length === 0 ? (
              <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'0.875rem',
                fontSize:'0.8rem',color:'#94A3B8',textAlign:'center'}}>
                Sin participantes registrados
              </div>
            ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:'0.5rem'}}>
                {participantes.map(v => (
                  <div key={v.id} style={{
                    padding:'0.625rem 0.875rem',borderRadius:'7px',
                    background:'#C41E1E',
                  }}>
                    <div style={{fontFamily:'var(--font-body)',fontSize:'0.82rem',fontWeight:700,
                      color:'white',lineHeight:1.3,marginBottom:'0.35rem'}}>
                      {v.nombre} {v.apellido_paterno}
                    </div>
                    <div style={{display:'flex',gap:'0.3rem',flexWrap:'wrap'}}>
                      {v.matricula && (
                        <span style={{fontFamily:'var(--font-body)',fontSize:'0.65rem',fontWeight:700,
                          background:'rgba(255,255,255,0.22)',color:'white',
                          padding:'0.18rem 0.45rem',borderRadius:'4px'}}>
                          {v.matricula}
                        </span>
                      )}
                      {v.codigo && (
                        <span style={{fontFamily:'var(--font-body)',fontSize:'0.65rem',fontWeight:700,
                          background:'rgba(255,255,255,0.15)',color:'rgba(255,255,255,0.9)',
                          padding:'0.18rem 0.45rem',borderRadius:'4px'}}>
                          {v.codigo}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Decisión */}
          <div className={styles.field}>
            <label className={styles.label}>Decisión</label>
            <div style={{display:'flex',gap:'0.5rem'}}>
              {(['validado','rechazado'] as const).map(e => (
                <button key={e} onClick={()=>setEstado(e)} style={{
                  flex:1,padding:'0.75rem',borderRadius:'8px',cursor:'pointer',
                  border:`1.5px solid ${estado===e?(e==='validado'?'#16a34a':'#C41E1E'):'#E2E8F0'}`,
                  background:estado===e?(e==='validado'?'rgba(22,163,74,0.08)':'rgba(196,30,30,0.08)'):'transparent',
                  color:estado===e?(e==='validado'?'#16a34a':'#C41E1E'):'#64748B',
                  fontFamily:'var(--font-body)',fontSize:'0.85rem',fontWeight:700,
                  textTransform:'uppercase',letterSpacing:'0.04em',
                }}>
                  {e==='validado'?'✅ Validar':'❌ Rechazar'}
                </button>
              ))}
            </div>
          </div>

          {estado === 'validado' && (
            <div className={styles.field}>
              <label className={styles.label}>Puntos a asignar</label>
              <input className={styles.input} type="number" min="0" max="100"
                value={puntos} onChange={e=>setPuntos(e.target.value)} />
              {Number(puntos) > 0 && (
                <div style={{marginTop:'0.375rem',background:'#EFF6FF',border:'1px solid #BFDBFE',
                  borderRadius:'6px',padding:'0.625rem 0.875rem',fontSize:'0.78rem',color:'#1E40AF'}}>
                  <strong>Se asignarán {puntos} pts a cada participante:</strong>
                  <br/>
                  {participantes.length > 0
                    ? `${participantes.length} participante${participantes.length!==1?'s':''} = ${participantes.length} × ${puntos} = ${participantes.length * Number(puntos)} pts en total`
                    : 'Solo al voluntario responsable'}
                  {op.voluntario_nombre && !participantesIds.includes(op.voluntario_id as number) &&
                    ` + ${op.voluntario_nombre} (responsable)`}
                </div>
              )}
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Observación</label>
            <textarea className={styles.textarea} style={{minHeight:'70px'}}
              placeholder="Comentario de validación…"
              value={obs} onChange={e=>setObs(e.target.value)} />
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:'1rem 1.5rem',borderTop:'1px solid #F1F5F9',
          display:'flex',justifyContent:'flex-end',gap:'0.75rem',flexShrink:0}}>
          <button className={styles.secondaryBtn} onClick={onClose}>Cancelar</button>
          <button className={styles.primaryBtn} onClick={handleSave} disabled={saving}>
            {saving?'Guardando…':'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────
export default function OpsValidar() {
  const [ops,        setOps]        = useState<Operacion[]>([]);
  const [voluntarios,setVoluntarios]= useState<AdminUser[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('pendiente');
  const [selected,   setSelected]   = useState<Operacion|null>(null);

  const load = () => {
    setLoading(true);
    opsDptoApi.listOps({estado: filter, limit:'50'})
      .then(r => setOps(r.data)).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[filter]);
  useEffect(()=>{
    adminUsersApi.list().then(setVoluntarios).catch(()=>{});
  },[]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Validar Operaciones</h1>
          <p className={styles.pageSub}>Revisa y valida las operaciones registradas por los voluntarios</p>
        </div>
        <div style={{display:'flex',gap:'0.5rem'}}>
          {['pendiente','validado','rechazado'].map(f=>(
            <button key={f}
              className={`${styles.secondaryBtn} ${filter===f?styles.primaryBtn:''}`}
              onClick={()=>setFilter(f)}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.tableWrap}>
        <div className={styles.tableHeader}
          style={{gridTemplateColumns:'2fr 1.2fr 0.8fr 0.8fr 0.7fr auto'}}>
          <span>Operación</span>
          <span>Responsable</span>
          <span>Tipo</span>
          <span>Participantes</span>
          <span>Estado</span>
          <span>Acción</span>
        </div>
        {loading && <p className={styles.empty}>Cargando…</p>}
        {!loading && !ops.length && <p className={styles.empty}>No hay operaciones {filter}s.</p>}
        {ops.map(op => {
          let parIds: number[] = [];
          try { parIds = JSON.parse(op.personal_participante || '[]'); } catch { parIds = []; }
          return (
            <div key={op.id} className={styles.tableRow}
              style={{gridTemplateColumns:'2fr 1.2fr 0.8fr 0.8fr 0.7fr auto'}}>
              <div>
                <div className={styles.cellName}>{op.titulo}</div>
                {op.lugar && <div className={styles.cellSub}>📍 {op.lugar}</div>}
              </div>
              <div>
                <div className={styles.cellSub}>{op.voluntario_nombre||'—'}</div>
                <div className={styles.cellSub}>{op.matricula}</div>
              </div>
              <span className={`${styles.cellBadge} ${styles[TIPO_COLS[op.tipo]]}`}>{op.tipo}</span>
              <div style={{display:'flex',alignItems:'center',gap:'0.375rem'}}>
                <span style={{fontFamily:'var(--font-body)',fontSize:'0.9rem',fontWeight:700,
                  color: parIds.length>0?'#C41E1E':'#CBD5E1'}}>
                  {parIds.length}
                </span>
                <span className={styles.cellSub}>{parIds.length!==1?'personas':'persona'}</span>
              </div>
              <span className={`${styles.opsEstado} ${styles['estado_'+op.estado]}`}>{op.estado}</span>
              <div style={{display:'flex',gap:'0.375rem'}}>
                {op.estado === 'pendiente' && (
                  <button className={`${styles.btnSm} ${styles.btnSmGreen}`}
                    onClick={()=>setSelected(op)}>Revisar</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <ValidarModal
          op={selected}
          voluntarios={voluntarios}
          onClose={()=>setSelected(null)}
          onDone={load}
        />
      )}
    </div>
  );
}
