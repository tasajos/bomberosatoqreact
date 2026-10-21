export function roleHome(role: string) {
  if(role==='presidente') return '/presidente';
  if(role==='voluntario') return '/voluntario';
  if(role==='jefe_finanzas') return '/finanzas';
  if(role==='jefe_logistica') return '/logistica';
  if(['jefe_operaciones','coordinador'].includes(role)) return '/operaciones';
  return '/admin/dashboard';
}
