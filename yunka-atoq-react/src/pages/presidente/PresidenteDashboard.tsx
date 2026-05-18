import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './PresidenteDashboard.module.css';
import { resumenApi, contactoApi, type ResumenData } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function fmt(n: number) { return new Intl.NumberFormat('es-BO').format(n); }

function fmtDate(s: string) {
  return new Intl.DateTimeFormat('es-BO', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }).format(new Date(s));
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

const DEPT_EMOJI: Record<string, string> = {
  jefe_operaciones: '🚒', jefe_personal: '👥', jefe_logistica: '📦',
  jefe_marketing: '📢', jefe_enlaces: '🤝', coordinador: '📋', presidente: '🏅',
};
const DEPT_LABEL: Record<string, string> = {
  jefe_operaciones: 'Jefe de Operaciones', jefe_personal: 'Jefe de Personal',
  jefe_logistica: 'Jefe de Logística', jefe_marketing: 'Jefe de Marketing',
  jefe_enlaces: 'Jefe de Enlaces', coordinador: 'Coordinador', presidente: 'Presidente',
};
const DEPT_COLOR: Record<string, string> = {
  jefe_operaciones: '#c41e1e', jefe_personal: '#0369a1', jefe_logistica: '#047857',
  jefe_marketing: '#b45309', jefe_enlaces: '#6d28d9', coordinador: '#0f766e', presidente: '#b91c1c',
};

const KPI_CONFIGS = [
  { key: 'voluntarios', label: 'Voluntarios activos',  icon: '🧑‍🚒', color: 'rgba(139,92,246,0.15)', accent: '#8b5cf6' },
  { key: 'operativos',  label: 'Operativos en el año', icon: '🔥', color: 'rgba(196,30,30,0.15)',    accent: '#ef4444' },
  { key: 'campanias',   label: 'Campañas activas',     icon: '💰', color: 'rgba(217,119,6,0.15)',    accent: '#d97706' },
  { key: 'contacto',    label: 'Mensajes sin leer',    icon: '✉️', color: 'rgba(34,197,94,0.1)',      accent: '#22c55e' },
];

export default function PresidenteDashboard() {
  const { user } = useAuth();
  const [data, setData]         = useState<ResumenData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [contacts, setContacts] = useState<{ nombre: string; tema: string | null; mensaje: string; leido: number; created_at: string }[]>([]);
  const [lastUpdate, setLastUpdate] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      resumenApi.get(),
      contactoApi.list(),
    ]).then(([res, ct]) => {
      setData(res);
      setContacts(ct.data.slice(0, 5));
      setLastUpdate(new Date().toLocaleTimeString('es-BO'));
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-BO', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  const kpiValues: Record<string, number> = {
    voluntarios: data?.voluntarios.total ?? 0,
    operativos:  data?.operativos.anio   ?? 0,
    campanias:   data?.campanias.length  ?? 0,
    contacto:    data?.contacto.no_leidos ?? 0,
  };

  return (
    <div className={styles.page}>
      {/* Greeting */}
      <div className={styles.greeting}>
        <div>
          <div className={styles.greetTitle}>
            {greeting()}, {user?.nombre?.split(' ')[0]}.
          </div>
          <div className={styles.greetSub}>{dateStr} {lastUpdate && `· Actualizado ${lastUpdate}`}</div>
        </div>
        <button className={styles.refreshBtn} onClick={load} disabled={loading}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>
      </div>

      {/* KPIs */}
      <div className={styles.kpiGrid}>
        {KPI_CONFIGS.map(cfg => (
          <div key={cfg.key} className={styles.kpiCard}
            style={{ background: `linear-gradient(135deg, ${cfg.color} 0%, rgba(255,255,255,0.03) 100%)`, border: `1px solid ${cfg.accent}30` }}>
            <div className={styles.kpiGlow} style={{ '--kpi-color': `${cfg.accent}20` } as React.CSSProperties} />
            <span className={styles.kpiIcon}>{cfg.icon}</span>
            <div className={styles.kpiValue} style={{ color: cfg.accent }}>
              {loading ? '—' : fmt(kpiValues[cfg.key])}
            </div>
            <div className={styles.kpiLabel}>{cfg.label}</div>
            {cfg.key === 'contacto' && kpiValues[cfg.key] > 0 && (
              <span className={`${styles.kpiBadge} ${styles.urgente}`}>Atención requerida</span>
            )}
            {cfg.key === 'operativos' && data && (
              <div className={styles.kpiSub}>{fmt(data.operativos.total)} histórico total</div>
            )}
          </div>
        ))}
      </div>

      {/* Fila 1: Departamentos + Campañas */}
      <div className={styles.twoCol}>
        {/* Departamentos */}
        <div className={styles.sCard}>
          <div className={styles.sCardHeader}>
            <span className={styles.sCardTitle}>🏛️ Comandancia y jefaturas</span>
            <Link to="/admin/usuarios" className={styles.sCardLink}>Ver todos →</Link>
          </div>
          {loading && <p className={styles.loading}>Cargando…</p>}
          {!loading && (!data?.jefes.length) && <p className={styles.empty}>Sin jefaturas asignadas</p>}
          <div className={styles.deptList}>
            {(data?.jefes ?? []).map((j, i) => (
              <div key={i} className={styles.deptItem}>
                <div className={styles.deptAvatar}
                  style={{ background: `linear-gradient(135deg, ${DEPT_COLOR[j.role] ?? '#374151'}, #0B1729)` }}>
                  {DEPT_EMOJI[j.role] ?? '👤'}
                </div>
                <div>
                  <div className={styles.deptName}>{j.nombre} {j.apellido_paterno}</div>
                  <div className={styles.deptRole}>{DEPT_LABEL[j.role] ?? j.role}</div>
                  {j.especialidad && <div className={styles.deptSpec}>{j.especialidad}</div>}
                </div>
                {j.telefono && <span className={styles.deptPhone}>{j.telefono}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Campañas */}
        <div className={styles.sCard}>
          <div className={styles.sCardHeader}>
            <span className={styles.sCardTitle}>💰 Campañas activas</span>
            <Link to="/admin/campanias" className={styles.sCardLink}>Gestionar →</Link>
          </div>
          {loading && <p className={styles.loading}>Cargando…</p>}
          {!loading && !data?.campanias.length && <p className={styles.empty}>Sin campañas activas</p>}
          <div className={styles.campList}>
            {(data?.campanias ?? []).map(c => {
              const pct = Math.min(100, Math.round((Number(c.recaudado) / Number(c.meta)) * 100));
              const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#d97706' : '#ef4444';
              return (
                <div key={c.id} className={styles.campItem}>
                  <div className={styles.campHeader}>
                    <div className={styles.campName}>{c.nombre}</div>
                    <div className={styles.campPct}>{pct}%</div>
                  </div>
                  <div className={styles.campBar}>
                    <div className={styles.campFill} style={{ width:`${pct}%`, background: color }} />
                  </div>
                  <div className={styles.campMeta}>
                    <span>Bs {fmt(Number(c.recaudado))} recaudado</span>
                    <span>Meta: Bs {fmt(Number(c.meta))}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fila 2: Voluntarios por código + Contactos + Noticias */}
      <div className={styles.threeCol}>
        {/* Por código */}
        <div className={styles.sCard}>
          <div className={styles.sCardHeader}>
            <span className={styles.sCardTitle}>🧑‍🚒 Voluntarios por código</span>
          </div>
          <div className={styles.codeGrid}>
            {[
              { code:'VF', label:'Voluntario Fundador',    emoji:'🦊', color:'#d97706' },
              { code:'VC', label:'Voluntario Colaborador', emoji:'🤝', color:'#0369a1' },
              { code:'VR', label:'Voluntario Rescatista',  emoji:'🧑‍🚒', color:'#c41e1e' },
            ].map(({ code, label, emoji, color }) => {
              const count = data?.voluntarios.por_codigo.find(x => x.codigo === code)?.total ?? 0;
              return (
                <div key={code} className={styles.codeCard}>
                  <span className={styles.codeEmoji}>{emoji}</span>
                  <div className={styles.codeNum} style={{ color }}>{loading ? '—' : count}</div>
                  <div className={styles.codeLabel}>{code}</div>
                  <div className={styles.codeLabelFull}>{label}</div>
                </div>
              );
            })}
          </div>
          {data && (
            <div className={styles.miniStats}>
              <div className={styles.miniStat}>
                <div className={styles.miniNum}>{data.voluntarios.total}</div>
                <div className={styles.miniLabel}>Total activos</div>
              </div>
              <div className={styles.miniStat}>
                <div className={styles.miniNum} style={{ color:'#22c55e' }}>{data.noticias.publicadas}</div>
                <div className={styles.miniLabel}>Noticias pub.</div>
              </div>
              <div className={styles.miniStat}>
                <div className={styles.miniNum} style={{ color:'#d97706' }}>{data.contacto.total}</div>
                <div className={styles.miniLabel}>Mensajes total</div>
              </div>
            </div>
          )}
        </div>

        {/* Últimos contactos */}
        <div className={styles.sCard} style={{ gridColumn: 'span 2' }}>
          <div className={styles.sCardHeader}>
            <span className={styles.sCardTitle}>✉️ Últimas solicitudes de contacto</span>
            <Link to="/admin/contactos" className={styles.sCardLink}>
              {data?.contacto.no_leidos ? `${data.contacto.no_leidos} sin leer →` : 'Ver todas →'}
            </Link>
          </div>
          {loading && <p className={styles.loading}>Cargando…</p>}
          {!loading && !contacts.length && <p className={styles.empty}>No hay mensajes</p>}
          <div className={styles.msgList}>
            {contacts.map((c, i) => (
              <div key={i} className={styles.msgItem}>
                <div className={`${styles.msgDot} ${c.leido ? styles.msgDotRead : ''}`} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flexWrap:'wrap' }}>
                    <span className={styles.msgName}>{c.nombre}</span>
                    {c.tema && <span className={styles.msgTema}>{c.tema}</span>}
                  </div>
                  <div className={styles.msgPreview}>{c.mensaje}</div>
                </div>
                <span className={styles.msgDate}>{fmtDate(c.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
