import { useState, useEffect } from 'react';
import { opsDptoApi, adminUsersApi, type AdminUser, type Merito } from '../../services/api';
import styles from './Ops.module.css';

function fmtDate(s: string) {
  return new Intl.DateTimeFormat('es-BO',{day:'numeric',month:'short',year:'numeric'}).format(new Date(s+'T12:00:00'));
}

const TIPO_OPTS = [
  { value:'merito',    label:'🏆 Mérito',            desc:'Reconocimiento por desempeño destacado' },
  { value:'demerito',  label:'⚠️ Demérito',          desc:'Nota negativa por conducta inapropiada' },
  { value:'antiguedad',label:'📅 Antigüedad',         desc:'Años de servicio acumulados' },
];

export default function OpsMeritos() {
  const [voluntarios, setVoluntarios] = useState<AdminUser[]>([]);
  const [meritos,     setMeritos]     = useState<Merito[]>([]);
  const [filter,      setFilter]      = useState<number>(0);
  const [loading,     setLoading]     = useState(false);

  const [form, setForm] = useState({
    voluntario_id:'', tipo:'merito', titulo:'', descripcion:'',
    puntos_extra:'5', fecha: new Date().toISOString().slice(0,10),
  });
  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState('');
  const [err,    setErr]    = useState('');

  useEffect(() => {
    adminUsersApi.list().then(r=>setVoluntarios(r.filter(u=>u.activo))).catch(()=>{});
  }, []);

  const loadMeritos = () => {
    setLoading(true);
    opsDptoApi.listMeritos(filter||undefined).then(setMeritos).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(()=>{ loadMeritos(); },[filter]);

  const set = (k: string, v: string) => setForm(f=>({...f,[k]:v}));

  const handleSave = async () => {
    if (!form.voluntario_id || !form.titulo || !form.fecha) { setErr('Voluntario, título y fecha son obligatorios.'); return; }
    setSaving(true); setMsg(''); setErr('');
    try {
      await opsDptoApi.createMerito({
        ...form,
        voluntario_id: Number(form.voluntario_id),
        puntos_extra: Number(form.puntos_extra)||0,
      } as any);
      setMsg('✅ Mérito registrado correctamente.');
      setForm({ voluntario_id:'', tipo:'merito', titulo:'', descripcion:'', puntos_extra:'5', fecha:new Date().toISOString().slice(0,10) });
      loadMeritos();
    } catch(e:unknown) { setErr(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const BADGE: Record<string,string> = { merito:'badgeMerito', demerito:'badgeDemerito', antiguedad:'badgeAntiguedad' };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Méritos y Antigüedad</h1>
          <p className={styles.pageSub}>Registra méritos, deméritos y define la antigüedad por servicio</p>
        </div>
      </div>

      <div className={styles.twoCol}>
        {/* Formulario */}
        <div className={styles.formCard}>
          {msg && <div className={styles.successMsg} style={{marginBottom:'1rem'}}>{msg}</div>}
          {err && <div className={styles.errorMsg} style={{marginBottom:'1rem'}}>{err}</div>}

          {/* Selector de tipo */}
          <div className={styles.field} style={{marginBottom:'1rem'}}>
            <label className={styles.label}>Tipo de registro</label>
            <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
              {TIPO_OPTS.map(t=>(
                <button key={t.value}
                  onClick={()=>set('tipo',t.value)}
                  style={{
                    padding:'0.75rem 1rem',borderRadius:'8px',textAlign:'left',
                    border:`1.5px solid ${form.tipo===t.value?'#C41E1E':'#E2E8F0'}`,
                    background:form.tipo===t.value?'rgba(196,30,30,0.05)':'white',
                    cursor:'pointer',transition:'all 0.2s',
                  }}>
                  <div style={{fontFamily:'var(--font-condensed)',fontSize:'0.82rem',fontWeight:700,color:form.tipo===t.value?'#C41E1E':'#374151'}}>
                    {t.label}
                  </div>
                  <div style={{fontSize:'0.72rem',color:'#94A3B8',marginTop:'0.15rem'}}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formGrid2}>
            <div className={styles.field}>
              <label className={styles.label}>Voluntario *</label>
              <select className={styles.select} value={form.voluntario_id} onChange={e=>set('voluntario_id',e.target.value)}>
                <option value="">— Seleccionar —</option>
                {voluntarios.map(v=>(
                  <option key={v.id} value={v.id}>{v.nombre} {v.apellido_paterno} ({v.matricula||'—'})</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{form.tipo==='antiguedad'?'Años de servicio':'Puntos extra'}</label>
              <input className={styles.input} type="number" min="0"
                value={form.puntos_extra} onChange={e=>set('puntos_extra',e.target.value)} />
            </div>
          </div>

          <div className={styles.formFull}>
            <div className={styles.field}>
              <label className={styles.label}>Título *</label>
              <input className={styles.input} placeholder="Ej. Desempeño excepcional en emergencia nacional"
                value={form.titulo} onChange={e=>set('titulo',e.target.value)} />
            </div>
          </div>

          <div className={styles.formGrid2}>
            <div className={styles.field}>
              <label className={styles.label}>Fecha *</label>
              <input className={styles.input} type="date" value={form.fecha} onChange={e=>set('fecha',e.target.value)} />
            </div>
          </div>

          <div className={styles.formFull} style={{marginBottom:'1rem'}}>
            <div className={styles.field}>
              <label className={styles.label}>Descripción</label>
              <textarea className={styles.textarea} style={{minHeight:'70px'}}
                placeholder="Detalles del mérito/demérito…"
                value={form.descripcion} onChange={e=>set('descripcion',e.target.value)} />
            </div>
          </div>

          <button className={styles.primaryBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Registrando…' : '🏆 Registrar'}
          </button>
        </div>

        {/* Listado */}
        <div>
          <div style={{display:'flex',gap:'0.5rem',marginBottom:'1rem',flexWrap:'wrap'}}>
            <button className={`${styles.secondaryBtn} ${filter===0?styles.primaryBtn:''}`} onClick={()=>setFilter(0)}>Todos</button>
            {voluntarios.slice(0,5).map(v=>(
              <button key={v.id} className={`${styles.secondaryBtn} ${filter===v.id?styles.primaryBtn:''}`}
                onClick={()=>setFilter(v.id)} style={{fontSize:'0.72rem',padding:'0.4rem 0.75rem'}}>
                {v.nombre.split(' ')[0]} {v.apellido_paterno}
              </button>
            ))}
          </div>

          <div className={styles.tableWrap}>
            {loading && <p className={styles.empty}>Cargando…</p>}
            {!loading && !meritos.length && <p className={styles.empty}>Sin registros.</p>}
            {meritos.map(m=>(
              <div key={m.id} style={{padding:'1rem 1.25rem',borderBottom:'1px solid #F8FAFC',display:'flex',gap:'0.875rem',alignItems:'flex-start'}}>
                <span className={`${styles.cellBadge} ${styles[BADGE[m.tipo]]}`} style={{marginTop:'0.25rem',whiteSpace:'nowrap'}}>
                  {m.tipo}
                </span>
                <div style={{flex:1}}>
                  <div className={styles.cellName}>{m.titulo}</div>
                  <div className={styles.cellSub}>{m.voluntario_nombre} · {m.matricula} · {fmtDate(m.fecha)}</div>
                  {m.descripcion && <div style={{fontSize:'0.78rem',color:'#475569',marginTop:'0.25rem'}}>{m.descripcion}</div>}
                </div>
                {m.puntos_extra > 0 && (
                  <div style={{fontFamily:'var(--font-condensed)',fontSize:'0.9rem',fontWeight:900,color:'#7c3aed',whiteSpace:'nowrap'}}>
                    +{m.puntos_extra} {m.tipo==='antiguedad'?'años':'pts'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
