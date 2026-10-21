import { request } from './api';

export interface Solicitud {
  id:number; solicitante_nombre:string; tipo:'ingreso'|'egreso'; concepto:string; detalle:string; monto:string;
  estado:string; finanzas_nombre:string|null; presidencia_nombre:string|null; finanzas_fecha:string|null;
  presidencia_fecha:string|null; rechazo_motivo:string|null; movimiento_id:number|null; comprobante:string|null; correos_pendientes:number;
}
export interface Movimiento { id:number; comprobante:string; tipo:'ingreso'|'egreso'; concepto:string|null; deuda_id:number|null; deuda_acreedor:string|null; monto:string; detalle:string; referencia:string; created_at:string; solicitud_id:number|null; registrado_nombre:string; beneficiario:string }
export interface Reserva { id:number; comprobante:string; destino:string; destino_nombre:string; detalle:string; monto:string; estado:string; campania_nombre:string|null; creado_nombre:string; created_at:string; liberada_at:string|null; liberada_motivo:string|null }
export interface Concepto { clave:string; nombre:string; tipo:'ingreso'|'egreso'|'ambos'; manual:boolean }
export interface ResumenCaja { saldo:number; ingresos:number; egresos:number; reservado:number; comprometido:number; disponible:number }
export interface FinanzasData { resumen:ResumenCaja; movimientos:Movimiento[]; reservas:Reserva[]; conceptos:Concepto[] }
export interface PagoDeuda { id:number; comprobante:string; monto:string; referencia:string; created_at:string; registrado_nombre:string }
export interface Deuda {
  id:number; tipo:'prestamo'|'proveedor'|'otro'; acreedor:string; detalle:string; monto:string; fecha:string; vencimiento:string|null;
  ingreso_comprobante:string|null; creado_nombre:string; created_at:string; pagado:number; saldo:number; estado:'pendiente'|'pagada'; pagos:PagoDeuda[];
}
export interface ReporteFinanzas {
  generado:string; hoy:string; desde:string|null; hasta:string|null; resumen:ResumenCaja; conceptos:Concepto[];
  movimientos:{id:number;comprobante:string;tipo:'ingreso'|'egreso';concepto:string|null;concepto_nombre:string;monto:string;detalle:string;referencia:string;created_at:string;solicitud_id:number|null;registrado_nombre:string;beneficiario:string;deuda_acreedor:string|null}[];
  deudas:Deuda[];
  mensualidades:{pagos:{periodo:string;monto:string;comprobante:string;created_at:string;voluntario:string;ci:string|null}[];voluntarios:ResumenMensualidad[]};
}
export interface Equipo { id:number; codigo:string; nombre:string; tipo:string; estado:string; observaciones:string; prestamo_activo:number|null; prestamo_estado:string|null; fecha_devolucion:string|null; asignado_a:string|null; acta_baja:string|null; created_at:string }
export interface LogisticaData { hoy:string; equipos:Equipo[]; resumen:{tipo:string;total:number;buenos:number;regulares:number;mantenimiento:number;danados:number;bajas:number;prestados:number;disponibles:number}[] }
export interface Prestamo { id:number; equipo_id:number; codigo:string; equipo_nombre:string; voluntario_nombre:string; fecha_devolucion:string; estado:string; motivo:string; autorizado_nombre:string|null; estado_salida:string; estado_devolucion:string|null; observacion_devolucion:string|null; rechazo_motivo:string|null; correos_pendientes:number; acta_entrega:string|null; acta_devolucion:string|null }
export interface TipoEquipo { id:number; nombre:string; activo:number; equipos:number }
/** Acta LOG de entrega, devolución o baja de un equipo. */
export interface Acta {
  codigo:string; tipo:'entrega'|'devolucion'|'baja'; fecha:string; estado_equipo:string|null; motivo:string|null; prestamo_id:number|null; registrado_nombre:string;
  equipo_codigo:string; equipo_nombre:string; equipo_tipo:string; voluntario:string|null; voluntario_ci:string|null; voluntario_grado:string|null;
  prestamo_motivo:string|null; fecha_devolucion:string|null; solicitud_fecha:string|null; solicitado_nombre:string|null; autorizado_nombre:string|null; autorizado_at:string|null;
  estado_salida:string|null; devuelto_nombre:string|null; devuelto_at:string|null; estado_devolucion:string|null; observacion_devolucion:string|null;
  acta_entrega:string|null; acta_devolucion:string|null;
}
export interface ReporteLogistica {
  generado:string; hoy:string; desde:string|null; hasta:string|null; equipos:Equipo[];
  prestamos:{id:number;estado:string;motivo:string;fecha_devolucion:string;created_at:string;autorizado_at:string|null;devuelto_at:string|null;estado_salida:string;estado_devolucion:string|null;observacion_devolucion:string|null;rechazo_motivo:string|null;equipo_codigo:string;equipo_nombre:string;equipo_tipo:string;voluntario:string;voluntario_ci:string|null;autorizado_nombre:string|null;devuelto_nombre:string|null;acta_entrega:string|null;acta_devolucion:string|null}[];
  actas:{codigo:string;tipo:string;created_at:string;estado_equipo:string|null;motivo:string|null;equipo_codigo:string;equipo_nombre:string;equipo_tipo:string;registrado_nombre:string;voluntario:string|null}[];
}
/** Un voucher por cada ingreso, egreso o reserva; los de solicitudes llevan sus dos autorizaciones. */
export interface Voucher {
  codigo:string; clase:'ingreso'|'egreso'|'reserva'; monto:string; detalle:string; fecha:string; registrado_nombre:string;
  referencia?:string; solicitud_id?:number|null; concepto?:string|null; solicitud_fecha?:string|null;
  beneficiario?:string|null; beneficiario_ci?:string|null; beneficiario_grado?:string|null; beneficiario_email?:string|null;
  finanzas_nombre?:string|null; finanzas_fecha?:string|null; presidencia_nombre?:string|null; presidencia_fecha?:string|null;
  periodos?:{periodo:string;monto:string}[]; concepto_nombre?:string;
  deuda_id?:number|null; deuda_acreedor?:string|null; deuda_tipo?:string|null; deuda_monto?:string|null; deuda_pagado_antes?:string|number|null;
  destino?:string; destino_nombre?:string; estado?:string; campania_nombre?:string|null; liberada_at?:string|null; liberada_motivo?:string|null; liberada_nombre?:string|null;
}
export interface Destino { clave:string; nombre:string; requiere_campania:number; activo:number; reservas:number }
export type EstadoMes = 'pagado'|'exento'|'sin_cobro'|'vencido'|'pendiente'|'adelanto';
export interface MesMensualidad { periodo:string; monto:number; vence:string|null; estado:EstadoMes; comprobante?:string; pagado_at?:string; motivo?:string }
export interface Exencion { id:number; desde:string; hasta:string|null; motivo:string; created_at:string }
export interface ResumenMensualidad {
  voluntario:{id:number;nombre:string;ci:string|null;grado:string|null;email:string;estado_personal:string;cobrable:boolean}; configuracion:{inicio:string|null}; inicio:string|null;
  estado:'al_dia'|'debe'; meses_vencidos:number; deuda:number; mes_actual:{periodo:string;estado:EstadoMes;monto:number;vence:string|null}|null;
  ultimo_pago:{periodo:string;comprobante:string}|null; exenciones:Exencion[];
}
export interface EstadoMensualidad extends ResumenMensualidad { meses:MesMensualidad[]; por_cobrar:{periodo:string;monto:number;estado:EstadoMes}[] }
export interface Tarifa { id:number; desde:string; monto:string; dia_vencimiento:number; creado_nombre:string; created_at:string }
export interface MensualidadesData { hoy:string; tarifas:Tarifa[]; voluntarios:ResumenMensualidad[] }
export interface MiFile { documentos:{id:number;nombre:string;categoria:string;descripcion:string;archivo_url:string}[]; resoluciones:{id:number;tipo:string;numero:number;anio:number;titulo:string;fecha:string}[]; memos:{id:number;tipo:string;titulo:string;descripcion:string;fecha:string}[] }
export interface Correo {id:number;destinatario:string;asunto:string;intentos:number;enviado_at:string|null;ultimo_error:string|null}
// ── Jefatura de personal ──
export type EstadoPersona = 'activo'|'pasiva'|'cooperador'|'comision'|'baja';
export interface PersonaLista {
  id:number; nombre:string; apellido_paterno:string; apellido_materno:string; nombre_completo:string; codigo:string; matricula:string; grado:string|null;
  cargo_directiva:string|null; role:string; email:string; telefono:string|null; carnet_identidad:string|null; estado:EstadoPersona; activo:number; total_puntos:number;
  created_at:string; asist_presentes:number; asist_faltas:number; llamadas:number; meritos:number; demeritos:number; documentos:number; comision_destino:string|null;
}
export interface Comision { id:number; voluntario_id:number; motivo:string; destino:string; desde:string; hasta:string|null; estado:'activa'|'finalizada'; estado_anterior:string; creado_nombre:string; created_at:string; finalizada_at:string|null; observacion_cierre:string|null; persona?:string; matricula?:string; grado?:string|null; finalizada_nombre?:string|null }
export interface Llamada { id:number; codigo:string; voluntario_id:number; tipo:'verbal'|'escrita'; gravedad:'leve'|'grave'|'muy_grave'; motivo:string; descripcion:string; fecha:string; puntos:number; registrado_nombre:string; created_at:string; reglamento_id?:number|null; reglamento_codigo?:string|null; reglamento_descripcion?:string|null; reglamento_sancion?:string|null; persona?:string; matricula?:string; grado?:string|null; carnet_identidad?:string|null }
export interface Merito { id:number; tipo:'merito'|'demerito'|'antiguedad'; titulo:string; descripcion:string; puntos_extra:number; fecha:string; registrado_nombre:string|null; reglamento_id?:number|null; reglamento_codigo?:string|null; reglamento_gravedad?:string|null; reglamento_sancion?:string|null }
/** Artículo del reglamento de méritos y deméritos (puntos en valor absoluto). */
export interface ArticuloReglamento { id:number; tipo:'merito'|'demerito'; codigo:string; descripcion:string; gravedad:'leve'|'grave'|'muy_grave'|null; puntos:number; sancion:string|null; activo:number }
export interface Bitacora { id:number; voluntario_id?:number; accion:string; detalle:string; created_at:string; registrado_nombre:string|null; persona?:string; matricula?:string; registrado_rol?:string }
export interface DocumentoFile { id:number; nombre:string; categoria:string; descripcion:string; archivo_url:string; mime:string|null; tamano:number|null; created_at:string; registrado_nombre:string|null }
export interface FilePersonal {
  persona:{ id:number; nombre:string; apellido_paterno:string; apellido_materno:string; nombre_completo:string; carnet_identidad:string; fecha_nacimiento:string; tipo_sangre:string;
    telefono:string; email:string; domicilio:string; contacto_nombre:string; contacto_telefono:string; especialidad:string; codigo:string; matricula:string; grado:string|null;
    cargo_directiva:string|null; role:string; estado:EstadoPersona; total_puntos:number; created_at:string };
  codigos:Record<string,string>; comisiones:Comision[]; llamadas:Llamada[]; meritos:Merito[];
  asistencia:{ resumen:Record<string,number>; registros:{id:number;fecha:string;estado:string;observacion:string|null;registrado_nombre:string|null}[] };
  documentos:DocumentoFile[]; certificados:{codigo:string;numero:number;curso:string;horas:string;emitido_at:string}[];
  resoluciones:{id:number;tipo:string;numero:number;anio:number;titulo:string;fecha:string;rol:string|null}[];
  capacitaciones:{nombre:string;tipo:string;fecha:string;horas:string;estado:string}[]; cursos:{nombre:string;institucion:string;tipo:string;fecha:string;horas:string;archivo_url:string|null}[];
  equipos:{id:number;estado:string;fecha_devolucion:string;created_at:string;codigo:string;nombre:string;tipo:string}[]; actividad:{operaciones:number;guardias:number}; bitacora:Bitacora[];
}
export interface ListaAsistencia {
  fecha:string; personal:{id:number;nombre_completo:string;matricula:string;codigo:string;grado:string|null;estado:EstadoPersona;comision_destino:string|null}[];
  registros:{id:number;voluntario_id:number;estado:string;observacion:string|null;created_at:string;registrado_nombre:string|null;nombre_completo:string;matricula:string;grado:string|null}[];
}
type ConteoAsistencia = { presente:number; tarde:number; falta:number; permiso:number; comision:number; porcentaje:number|null };
export interface ReporteAsistencia {
  desde:string; hasta:string; personas:({voluntario_id:number;nombre_completo:string;matricula:string;grado:string|null;estado_personal:string}&ConteoAsistencia)[];
  dias:({fecha:string}&ConteoAsistencia)[]; detalle:{fecha:string;estado:string;observacion:string|null;voluntario_id:number;nombre_completo:string;matricula:string;grado:string|null}[];
}
const qs=(o:Record<string,string|number|undefined>)=>new URLSearchParams(Object.entries(o).filter(e=>e[1]!==undefined&&e[1]!=='').map(([k,v])=>[k,String(v)]));

export const gestionApi = {
  finanzas:()=>request<FinanzasData>('/gestion/finanzas'),
  solicitudes:()=>request<Solicitud[]>('/gestion/solicitudes'),
  logistica:()=>request<LogisticaData>('/gestion/logistica'),
  prestamos:()=>request<Prestamo[]>('/gestion/prestamos'),
  voluntarios:()=>request<{id:number;nombre:string;apellido_paterno:string}[]>('/gestion/voluntarios'),
  voucher:(codigo:string)=>request<Voucher>(`/gestion/vouchers/${encodeURIComponent(codigo)}`),
  file:()=>request<MiFile>('/gestion/mi-file'),
  destinos:()=>request<Destino[]>('/gestion/destinos'),
  mensualidades:()=>request<MensualidadesData>('/gestion/mensualidades'),
  mensualidadVoluntario:(id:number)=>request<EstadoMensualidad>(`/gestion/mensualidades/voluntarios/${id}`),
  miMensualidad:()=>request<EstadoMensualidad>('/gestion/mi-mensualidad'),
  deudas:()=>request<Deuda[]>('/gestion/deudas'),
  tiposEquipo:()=>request<TipoEquipo[]>('/gestion/tipos-equipo'),
  personal:()=>request<{codigos:Record<string,string>;personal:PersonaLista[]}>('/gestion/personal'),
  filePersonal:(id:number)=>request<FilePersonal>(`/gestion/personal/${id}/file`),
  miFileCompleto:()=>request<FilePersonal>('/gestion/mi-file-completo'),
  reglamento:()=>request<ArticuloReglamento[]>('/gestion/personal/reglamento'),
  comisiones:()=>request<Comision[]>('/gestion/personal/comisiones'),
  llamadas:()=>request<Llamada[]>('/gestion/personal/llamadas'),
  llamada:(codigo:string)=>request<Llamada>(`/gestion/personal/llamadas/${encodeURIComponent(codigo)}`),
  listaAsistencia:(fecha?:string)=>request<ListaAsistencia>(`/gestion/personal/asistencia?${qs({fecha})}`),
  reporteAsistencia:(desde?:string,hasta?:string)=>request<ReporteAsistencia>(`/gestion/personal/asistencia/reporte?${qs({desde,hasta})}`),
  bitacora:(f:{voluntario_id?:number;accion?:string;desde?:string;hasta?:string}={})=>request<Bitacora[]>(`/gestion/personal/bitacora?${qs(f)}`),
  acta:(codigo:string)=>request<Acta>(`/gestion/actas/${encodeURIComponent(codigo)}`),
  reporteLogistica:(desde?:string,hasta?:string)=>request<ReporteLogistica>(`/gestion/reportes/logistica?${new URLSearchParams(Object.entries({desde,hasta}).filter((e):e is [string,string]=>!!e[1]))}`),
  reporte:(desde?:string,hasta?:string)=>request<ReporteFinanzas>(`/gestion/reportes/finanzas?${new URLSearchParams(Object.entries({desde,hasta}).filter((e):e is [string,string]=>!!e[1]))}`),
  correos:()=>request<Correo[]>('/gestion/correos'),
  guardar:(path:string,body:unknown,clave:string)=>request<{id?:number;ok?:boolean;comprobante?:string;saldo_deuda?:number;matricula?:string;registrados?:number;omitidos?:number;cambios?:number}>(`/gestion${path}`,{method:'POST',headers:{'Idempotency-Key':clave},body:JSON.stringify(body)}),
};
