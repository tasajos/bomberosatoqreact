import { useState, useEffect } from 'react';
import styles from './ContactAdminPage.module.css';
import { contactoApi, type ContactoItem } from '../../services/api';

function fmtDate(s: string) {
  return new Intl.DateTimeFormat('es-BO', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date(s));
}

export default function ContactAdminPage() {
  const [items,     setItems]     = useState<ContactoItem[]>([]);
  const [total,     setTotal]     = useState(0);
  const [noLeidos,  setNoLeidos]  = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState<'todos'|'no_leidos'|'leidos'>('todos');

  const load = () => {
    setLoading(true);
    contactoApi.list()
      .then(r => { setItems(r.data); setTotal(r.total); setNoLeidos(r.no_leidos); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleRead = async (item: ContactoItem) => {
    await contactoApi.markRead(item.id);
    load();
  };

  const handleDelete = async (item: ContactoItem) => {
    if (!confirm(`¿Eliminar mensaje de ${item.nombre}?`)) return;
    await contactoApi.delete(item.id);
    load();
  };

  const visible = items.filter(i =>
    filter === 'todos'     ? true :
    filter === 'no_leidos' ? i.leido === 0 :
    i.leido === 1
  );

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
            <div className={styles.pageTitle}>Solicitudes de contacto</div>
            {noLeidos > 0 && <span className={styles.unreadBadge}>{noLeidos} nuevas</span>}
          </div>
          <p className={styles.pageDesc}>Mensajes enviados desde el formulario de contacto del sitio.</p>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statNum}>{total}</div>
          <div className={styles.statLabel}>Total recibidos</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNum} style={{ color:'var(--color-red)' }}>{noLeidos}</div>
          <div className={styles.statLabel}>Sin leer</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNum} style={{ color:'#16a34a' }}>{total - noLeidos}</div>
          <div className={styles.statLabel}>Leídos</div>
        </div>
      </div>

      {/* Filtros */}
      <div className={styles.controls}>
        {([['todos','Todos'], ['no_leidos','Sin leer'], ['leidos','Leídos']] as const).map(([val, label]) => (
          <button key={val}
            className={`${styles.tabBtn} ${filter === val ? styles.tabBtnActive : ''}`}
            onClick={() => setFilter(val)}>{label}</button>
        ))}
      </div>

      {/* Lista */}
      <div className={styles.cards}>
        {loading && <p className={styles.empty}>Cargando mensajes…</p>}
        {!loading && visible.length === 0 && (
          <p className={styles.empty}>No hay mensajes{filter !== 'todos' ? ' en esta categoría' : ''}.</p>
        )}

        {visible.map(item => (
          <div key={item.id} className={`${styles.card} ${!item.leido ? styles.cardUnread : ''}`}>
            <div className={styles.cardHeader}>
              <div className={styles.cardLeft}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.625rem' }}>
                  {!item.leido && <span className={styles.unreadDot} />}
                  <span className={styles.cardName}>{item.nombre}</span>
                  {item.tema && <span className={styles.temaBadge}>{item.tema}</span>}
                </div>
                <div className={styles.cardMeta}>
                  <a href={`mailto:${item.correo}`}>{item.correo}</a>
                  {item.telefono && <span>{item.telefono}</span>}
                </div>
              </div>
              <span className={styles.cardDate}>{fmtDate(item.created_at)}</span>
            </div>

            <p className={styles.cardMsg}>{item.mensaje}</p>

            <div className={styles.cardActions}>
              {!item.leido && (
                <button className={styles.btnRead} onClick={() => handleRead(item)}>
                  ✓ Marcar como leído
                </button>
              )}
              <a href={`mailto:${item.correo}?subject=Re: ${item.tema || 'Contacto'}`}
                className={styles.btnRead} style={{ textDecoration:'none' }}>
                ✉ Responder
              </a>
              <button className={styles.btnDelete} onClick={() => handleDelete(item)}>
                🗑 Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
