import { Fragment } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import t from './OpsTabs.module.css';

const GROUPS: { label: string; items: { to: string; label: string; end?: boolean }[] }[] = [
  { label: 'Principal', items: [
    { to: '', label: '📊 Dashboard', end: true },
  ] },
  { label: 'Operaciones', items: [
    { to: 'orden-operacion', label: '🚨 Orden de Operación' },
    { to: 'registrar',       label: '➕ Registrar' },
    { to: 'validar',         label: '✅ Validar' },
    { to: 'puntos',          label: '⭐ Puntos' },
  ] },
  { label: 'Guardia', items: [
    { to: 'guardia',     label: '🛡️ Rol de Guardia' },
    { to: 'ver-guardia', label: '📋 Ver Guardia' },
    { to: 'libro',       label: '📖 Libro' },
  ] },
  { label: 'Reconocimientos', items: [
    { to: 'meritos',             label: '🏆 Méritos' },
    { to: 'voluntarios-ranking', label: '👥 Ranking' },
  ] },
  { label: 'Formación', items: [
    { to: 'capacitaciones', label: '📚 Capacitaciones' },
  ] },
];

/** Distribuye las opciones de Operaciones como pestañas agrupadas arriba del
 *  contenido. Se monta dentro de un layout con su propio sidebar/topbar. */
export default function OpsTabsLayout() {
  return (
    <div className={t.shell}>
      <div className={t.tabsWrap}>
        <div className={t.tabs}>
          {GROUPS.map((g, gi) => (
            <Fragment key={g.label}>
              <div className={t.group}>
                <span className={t.groupLabel}>{g.label}</span>
                <div className={t.groupTabs}>
                  {g.items.map(tab => (
                    <NavLink key={tab.to || 'index'} to={tab.to} end={tab.end}
                      className={({ isActive }) => `${t.tab} ${isActive ? t.tabActive : ''}`}>
                      {tab.label}
                    </NavLink>
                  ))}
                </div>
              </div>
              {gi < GROUPS.length - 1 && <span className={t.divider} />}
            </Fragment>
          ))}
        </div>
      </div>
      <div className={t.body}>
        <Outlet />
      </div>
    </div>
  );
}
