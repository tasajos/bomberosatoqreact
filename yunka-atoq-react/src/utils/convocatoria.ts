import { useEffect, useState } from 'react';
import type { Convocatoria } from '../services/api';

export type EstadoConvocatoria = 'sin_fecha' | 'proxima' | 'abierta' | 'cerrada';

// Las fechas se guardan como AAAA-MM-DD y se interpretan en hora de Bolivia
const TZ_OFFSET = '-04:00';

export const inicioDate = (c: Convocatoria) => (c.inicio ? new Date(`${c.inicio}T00:00:00${TZ_OFFSET}`) : null);
export const cierreDate = (c: Convocatoria) => (c.cierre ? new Date(`${c.cierre}T23:59:59${TZ_OFFSET}`) : null);

export function estadoConvocatoria(c: Convocatoria, now = Date.now()): EstadoConvocatoria {
  const fin = cierreDate(c);
  if (!fin || isNaN(fin.getTime())) return 'sin_fecha';
  const ini = inicioDate(c);
  if (ini && now < ini.getTime()) return 'proxima';
  return now <= fin.getTime() ? 'abierta' : 'cerrada';
}

/** Fecha hacia la que corre la cuenta regresiva: la apertura si aún no abre, el cierre si está abierta. */
export function objetivoCuenta(c: Convocatoria, now = Date.now()): Date | null {
  const estado = estadoConvocatoria(c, now);
  if (estado === 'proxima') return inicioDate(c);
  if (estado === 'abierta') return cierreDate(c);
  return null;
}

export const fmtFechaLarga = (d: Date) =>
  d.toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/La_Paz' });

export function partesRestantes(target: Date, now: number) {
  const diff = Math.max(0, target.getTime() - now);
  return {
    days:  Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins:  Math.floor((diff % 3600000) / 60000),
    secs:  Math.floor((diff % 60000) / 1000),
  };
}

/** Hora actual que se actualiza cada `ms` milisegundos. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
