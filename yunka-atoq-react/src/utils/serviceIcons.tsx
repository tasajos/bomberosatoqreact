import { ReactNode } from 'react';

interface IconProps { size?: number; }

const icons: Record<string, (p: IconProps) => ReactNode> = {
  'building-fire': ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/>
      <path d="M12 3c0 3-3 4-3 7a3 3 0 006 0c0-3-3-4-3-7z"/>
    </svg>
  ),
  'forest-fire': ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 8C8 10 5.9 16.17 3.82 19.34A1 1 0 004.7 21 5.6 5.6 0 008 20c2 0 3.5-1.5 5-1.5S15 20 17 20a5.6 5.6 0 003.3-1 1 1 0 00.38-1.16C18.5 14.5 17 11 17 8z"/>
      <path d="M17 8a5 5 0 00-5-5"/><line x1="12" y1="21" x2="12" y2="10"/>
    </svg>
  ),
  'medical-cross': ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  ),
  'graduation': ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z"/>
      <path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  'command': ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
      <line x1="12" y1="7" x2="12" y2="13"/><line x1="12" y1="13" x2="5" y2="17"/><line x1="12" y1="13" x2="19" y2="17"/>
    </svg>
  ),
  'search-rescue': ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
  ),
  'vehicle': ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11l4 4v8a2 2 0 01-2 2h-2"/>
      <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
    </svg>
  ),
  'water': ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6 10 4 14 4 17a8 8 0 0016 0c0-3-2-7-8-15z"/>
    </svg>
  ),
  'hazmat': ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  'default': ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
};

export const ICON_OPTIONS = [
  { key: 'building-fire',  label: 'Incendio estructural' },
  { key: 'forest-fire',    label: 'Incendio forestal' },
  { key: 'medical-cross',  label: 'Cruz médica / APH' },
  { key: 'graduation',     label: 'Capacitación' },
  { key: 'command',        label: 'Comando de incidentes' },
  { key: 'search-rescue',  label: 'Búsqueda y rescate' },
  { key: 'vehicle',        label: 'Rescate vehicular' },
  { key: 'water',          label: 'Agua / Incendio' },
  { key: 'hazmat',         label: 'Materiales peligrosos' },
  { key: 'default',        label: 'Genérico' },
];

export function ServiceIcon({ name, size = 24 }: { name: string; size?: number }) {
  const fn = icons[name] ?? icons['default'];
  return <>{fn({ size })}</>;
}
