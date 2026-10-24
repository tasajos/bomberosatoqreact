// Correos del módulo de cursos online: HTML con tablas y estilos en línea (compatible con Gmail y Outlook)
// y una versión en texto plano. Todo dato ingresado por usuarios se escapa.

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const sitio = () => (process.env.SITE_URL || process.env.FRONTEND_URL || 'https://bomberosatoq.org').replace(/\/$/, '');
const AZUL = '#0B2A4E', ROJO = '#C41E1E', TINTA = '#14213D', GRIS = '#65728C';
const TONOS = { rojo: ROJO, verde: '#166E4C', azul: '#2456BD', ambar: '#956415' };
const dinero = n => Number(n) > 0 ? new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(Number(n)) : 'Gratuito';
const fecha = v => v ? new Date(`${String(v).slice(0, 10)}T12:00:00`).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

/**
 * @param {{ asunto: string, etiqueta: string, titulo: string, saludo?: string, parrafos?: string[], filas?: [string, unknown][],
 *   boton?: { texto: string, url: string }, nota?: string, tono?: keyof TONOS, destacado?: string }} c
 * Los párrafos y la nota son texto plano: se escapan aquí.
 */
export function plantilla(c) {
  const color = TONOS[c.tono] || ROJO;
  const filas = (c.filas || []).filter(([, v]) => v !== null && v !== undefined && v !== '');
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.asunto)}</title></head>
<body style="margin:0;padding:0;background:#EEF2F7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(c.parrafos?.[0] || c.titulo)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF2F7;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #DFE6F1;font-family:Arial,Helvetica,sans-serif;">
  <tr><td style="background:${AZUL};background-image:linear-gradient(135deg,#0B1220,${AZUL});padding:22px 28px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:12px;"><img src="${esc(sitio())}/yunka_atoq_log.png" width="44" height="44" alt="Yunka Atoq" style="display:block;border:0;"></td>
      <td><div style="color:#FFFFFF;font-size:18px;font-weight:bold;letter-spacing:1px;">YUNKA ATOQ</div>
        <div style="color:#FF9B9B;font-size:11px;font-weight:bold;letter-spacing:2px;">CURSOS ONLINE · BOMBEROS VOLUNTARIOS</div></td>
    </tr></table>
  </td></tr>
  <tr><td style="height:4px;background:${color};line-height:4px;font-size:0;">&nbsp;</td></tr>
  <tr><td style="padding:28px 28px 8px;">
    <div style="color:${color};font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;">${esc(c.etiqueta)}</div>
    <h1 style="margin:8px 0 16px;color:${TINTA};font-size:22px;line-height:1.3;">${esc(c.titulo)}</h1>
    ${c.saludo ? `<p style="margin:0 0 12px;color:${TINTA};font-size:15px;line-height:1.6;">${esc(c.saludo)}</p>` : ''}
    ${(c.parrafos || []).map(p => `<p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:1.6;">${esc(p)}</p>`).join('')}
    ${c.destacado ? `<div style="margin:16px 0;padding:14px 16px;background:#F7F9FC;border-left:4px solid ${color};border-radius:6px;color:${TINTA};font-size:14px;line-height:1.55;white-space:pre-wrap;">${esc(c.destacado)}</div>` : ''}
  </td></tr>
  ${filas.length ? `<tr><td style="padding:4px 28px 8px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
      ${filas.map(([k, v]) => `<tr><td style="padding:9px 0;border-bottom:1px solid #EEF2F7;color:${GRIS};font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;width:38%;vertical-align:top;">${esc(k)}</td>
        <td style="padding:9px 0;border-bottom:1px solid #EEF2F7;color:${TINTA};font-weight:bold;vertical-align:top;">${esc(v)}</td></tr>`).join('')}
    </table></td></tr>` : ''}
  ${c.boton ? `<tr><td align="center" style="padding:22px 28px 6px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${color};">
      <a href="${esc(c.boton.url)}" target="_blank" style="display:inline-block;padding:13px 28px;color:#FFFFFF;font-size:15px;font-weight:bold;text-decoration:none;letter-spacing:.5px;">${esc(c.boton.texto)}</a>
    </td></tr></table>
    <p style="margin:12px 0 0;color:${GRIS};font-size:12px;line-height:1.5;">Si el botón no funciona, copia este enlace en tu navegador:<br><a href="${esc(c.boton.url)}" style="color:#2456BD;word-break:break-all;">${esc(c.boton.url)}</a></p>
  </td></tr>` : ''}
  ${c.nota ? `<tr><td style="padding:16px 28px 0;"><p style="margin:0;color:${GRIS};font-size:13px;line-height:1.55;">${esc(c.nota)}</p></td></tr>` : ''}
  <tr><td style="padding:24px 28px;"><div style="border-top:1px solid #EEF2F7;padding-top:16px;color:${GRIS};font-size:12px;line-height:1.6;text-align:center;">
    Fundación de Bomberos Voluntarios Yunka Atoq · Cochabamba, Bolivia<br>Mensaje automático de la plataforma de cursos online. No respondas a este correo.
  </div></td></tr>
</table>
</td></tr></table></body></html>`;
  const texto = [c.titulo, '', c.saludo, ...(c.parrafos || []), c.destacado, '', ...filas.map(([k, v]) => `${k}: ${v}`),
    c.boton ? `\n${c.boton.texto}: ${c.boton.url}` : '', c.nota ? `\n${c.nota}` : '', '\n— Fundación de Bomberos Voluntarios Yunka Atoq · Cursos online']
    .filter(v => v !== undefined && v !== null).join('\n').replace(/\n{3,}/g, '\n\n');
  return { asunto: c.asunto, html, texto };
}

export const correoVerificacion = ({ nombre, enlace, horas, curso }) => plantilla({
  asunto: 'Confirma tu correo · Cursos online Yunka Atoq', etiqueta: 'Pre-registro recibido', titulo: 'Confirma tu correo electrónico',
  saludo: `Hola ${nombre}:`,
  parrafos: ['Recibimos tu registro en la plataforma de cursos online de la Fundación de Bomberos Voluntarios Yunka Atoq.',
    'Para activar tu cuenta confirma que este correo te pertenece con el botón de abajo.',
    ...(curso ? [`Después de confirmar, presidencia revisará tu solicitud de inscripción al curso “${curso}” y te avisaremos por correo cuando estés habilitado.`] : [])],
  boton: { texto: 'Confirmar mi correo', url: enlace }, tono: 'rojo',
  nota: `El enlace vence en ${horas} horas. Si no te registraste, ignora este mensaje: la cuenta no se activará.`,
});

export const correoNuevoExterno = ({ cuenta, cursos, enlace }) => plantilla({
  asunto: `Nuevo participante externo: ${cuenta.nombre} ${cuenta.apellidos}`, etiqueta: 'Registro confirmado', tono: 'azul',
  titulo: 'Un participante externo se registró en Cursos online',
  parrafos: ['La persona confirmó su correo electrónico y su cuenta está activa.',
    cursos.length ? 'Su inscripción queda pendiente hasta que la habilites desde la pestaña “Participantes” del curso.' : 'Aún no solicitó inscripción a ningún curso.'],
  filas: [['Nombre', `${cuenta.nombre} ${cuenta.apellidos}`], ['Documento', cuenta.documento], ['Correo', cuenta.email], ['Teléfono', cuenta.telefono],
    ['Institución', cuenta.institucion], ...cursos.map(c => ['Curso solicitado', `${c.titulo}${Number(c.costo) > 0 ? ` · ${dinero(c.costo)}` : ''}`])],
  boton: { texto: cursos.length ? 'Revisar inscripción' : 'Ver cursos online', url: enlace },
});

export const correoSolicitud = ({ participante, tipo, email, curso, referencia, enlace }) => plantilla({
  asunto: `Solicitud de inscripción: ${curso.titulo}`, etiqueta: 'Inscripción por habilitar', tono: 'ambar',
  titulo: `${participante} solicitó inscribirse`,
  parrafos: ['La inscripción queda pendiente hasta que la habilites o la rechaces desde la pestaña “Participantes” del curso.'],
  filas: [['Participante', participante], ['Tipo', tipo === 'externo' ? 'Externo' : 'Miembro de la fundación'], ['Correo', email], ['Curso', curso.titulo],
    ['Fechas', `${fecha(curso.fecha_inicio)} al ${fecha(curso.fecha_fin)}`], ['Costo', dinero(curso.costo)], ['Referencia de pago', referencia]],
  boton: { texto: 'Revisar inscripción', url: enlace },
});

export function correoRevision({ nombre, curso, estado, observacion, enlace }) {
  const base = { saludo: `Hola ${nombre}:`, destacado: observacion || undefined, filas: [['Curso', curso.titulo],
    ['Fechas', `${fecha(curso.fecha_inicio)} al ${fecha(curso.fecha_fin)}`], ['Horas académicas', curso.horas], ['Instructor', curso.instructor_nombre]] };
  if (estado === 'activa') return plantilla({ ...base, asunto: `Inscripción habilitada: ${curso.titulo}`, etiqueta: 'Inscripción habilitada', tono: 'verde',
    titulo: 'Ya puedes ingresar a tu curso', parrafos: [`Presidencia habilitó tu inscripción al curso “${curso.titulo}”. El contenido está disponible desde la fecha de inicio.`],
    boton: { texto: 'Ir al curso', url: enlace } });
  if (estado === 'rechazada') return plantilla({ ...base, asunto: `Inscripción no aprobada: ${curso.titulo}`, etiqueta: 'Inscripción no aprobada', tono: 'rojo',
    titulo: 'Tu inscripción no fue aprobada', parrafos: [`Presidencia no aprobó tu inscripción al curso “${curso.titulo}”.`, 'Si tienes dudas, comunícate con la fundación.'] });
  return plantilla({ ...base, asunto: `Baja del curso: ${curso.titulo}`, etiqueta: 'Baja del curso', tono: 'ambar',
    titulo: 'Fuiste dado de baja del curso', parrafos: [`Tu inscripción al curso “${curso.titulo}” fue dada de baja.`, 'Si el curso sigue abierto puedes volver a solicitar tu inscripción.'] });
}

export const correoAccesoInstructor = ({ nombre, email, password, enlace }) => plantilla({
  asunto: 'Acceso de instructor · Cursos online Yunka Atoq', etiqueta: 'Acceso de instructor', tono: 'azul',
  titulo: 'Tu acceso a la plataforma de cursos', saludo: `Hola ${nombre}:`,
  parrafos: ['La Fundación de Bomberos Voluntarios Yunka Atoq habilitó tu acceso como instructor en la plataforma de cursos online.',
    'Desde “Cursos que dicto” podrás subir el contenido por módulos, crear los exámenes y revisar las calificaciones.'],
  filas: [['Correo', email], ['Contraseña temporal', password]],
  boton: { texto: 'Ingresar a la plataforma', url: enlace },
  nota: 'Por seguridad, cambia la contraseña desde la opción “Contraseña” después de ingresar.',
});
