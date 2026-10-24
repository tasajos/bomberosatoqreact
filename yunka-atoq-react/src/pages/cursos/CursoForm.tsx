import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { cursosGestionApi, type CuentaExterna, type CursoOnline, type DatosCurso, type UsuarioInstructor } from '../../services/cursosApi';
import { hoy } from '../gestion/shared';
import s from '../gestion/Gestion.module.css';
import c from './Cursos.module.css';

type Campos = Record<'titulo' | 'descripcion' | 'visibilidad' | 'horas' | 'fecha_inicio' | 'fecha_fin' | 'costo' | 'info_pago' | 'cupo' | 'nota_minima' | 'estado' | 'instructor_user_id' | 'instructor_cuenta_id', string>;
const campos = (k?: CursoOnline): Campos => ({
  titulo: k?.titulo ?? '', descripcion: k?.descripcion ?? '', visibilidad: k?.visibilidad ?? 'interno', horas: k ? String(k.horas) : '',
  fecha_inicio: k?.fecha_inicio ?? hoy(), fecha_fin: k?.fecha_fin ?? '', costo: k ? String(k.costo) : '0', info_pago: k?.info_pago ?? '',
  cupo: k ? String(k.cupo) : '0', nota_minima: k ? String(k.nota_minima) : '51', estado: k?.estado ?? 'borrador',
  instructor_user_id: k?.instructor_user_id ? String(k.instructor_user_id) : '', instructor_cuenta_id: k?.instructor_cuenta_id ? String(k.instructor_cuenta_id) : '',
});
const ROLES: Record<string, string> = { presidente: 'Presidente', voluntario: 'Voluntario', fundador: 'Fundador', coordinador: 'Coordinador', admin: 'Administración' };
type Clave = { email: string; password: string; correo: boolean };

export default function CursoForm({ inicial, onGuardado, onCancelar }: { inicial?: CursoOnline; onGuardado: (curso: CursoOnline) => void; onCancelar?: () => void }) {
  const [f, setF] = useState<Campos>(() => campos(inicial));
  const [tipo, setTipo] = useState<'interno' | 'externo'>(inicial?.instructor_tipo ?? 'interno');
  const [usuarios, setUsuarios] = useState<UsuarioInstructor[]>([]), [externos, setExternos] = useState<CuentaExterna[]>([]);
  const [nuevoExterno, setNuevoExterno] = useState(false), [clave, setClave] = useState<Clave | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [ok, setOk] = useState('');
  useEffect(() => {
    cursosGestionApi.opciones().then(o => { setUsuarios(o.usuarios); setExternos(o.externos); }).catch(e => setError(e.message));
  }, []);
  const set = (k: keyof Campos) => (e: { target: { value: string } }) => { setF(v => ({ ...v, [k]: e.target.value })); setOk(''); };

  async function guardar(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setOk('');
    const datos: DatosCurso = {
      titulo: f.titulo, descripcion: f.descripcion, visibilidad: f.visibilidad as DatosCurso['visibilidad'], horas: Number(f.horas),
      fecha_inicio: f.fecha_inicio, fecha_fin: f.fecha_fin, costo: Number(f.costo || 0), info_pago: Number(f.costo || 0) > 0 ? f.info_pago : '',
      cupo: Number(f.cupo || 0), nota_minima: Number(f.nota_minima || 51), estado: f.estado as DatosCurso['estado'],
      instructor_user_id: tipo === 'interno' && f.instructor_user_id ? Number(f.instructor_user_id) : null,
      instructor_cuenta_id: tipo === 'externo' && f.instructor_cuenta_id ? Number(f.instructor_cuenta_id) : null,
    };
    try {
      const curso = inicial ? await cursosGestionApi.actualizar(inicial.id, datos) : await cursosGestionApi.crear(datos);
      setOk('Curso guardado.'); onGuardado(curso);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el curso.'); }
    finally { setBusy(false); }
  }
  async function restablecer() {
    const cuenta = externos.find(x => String(x.id) === f.instructor_cuenta_id);
    if (!cuenta || !window.confirm(`¿Generar una nueva contraseña temporal para ${cuenta.nombre} ${cuenta.apellidos}? La anterior dejará de funcionar.`)) return;
    try { const r = await cursosGestionApi.restablecerPassword(cuenta.id); setClave({ email: cuenta.email, password: r.password, correo: r.correo_enviado }); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo restablecer la contraseña.'); }
  }

  const externoSel = externos.find(x => String(x.id) === f.instructor_cuenta_id);
  return <form className={s.form} onSubmit={guardar}>
    <label className={`${s.field} ${s.wide}`}>Título del curso<input value={f.titulo} onChange={set('titulo')} maxLength={200} required disabled={busy} /></label>
    <label className={`${s.field} ${s.wide}`}>Descripción y objetivos<textarea value={f.descripcion} onChange={set('descripcion')} maxLength={5000} disabled={busy} /></label>
    <label className={s.field}>Disponible para
      <select value={f.visibilidad} onChange={set('visibilidad')} disabled={busy}>
        <option value="interno">Solo miembros de la fundación (interno)</option>
        <option value="publico">Abierto al público (voluntarios y externos)</option>
      </select></label>
    <label className={s.field}>Estado
      <select value={f.estado} onChange={set('estado')} disabled={busy}>
        <option value="borrador">Borrador · el instructor prepara el contenido</option>
        <option value="publicado">Publicado · abierto a inscripciones</option>
        <option value="finalizado">Finalizado · cierra exámenes y habilita certificación</option>
        <option value="cancelado">Cancelado</option>
      </select></label>

    <fieldset className={`${s.wide} ${s.card}`} style={{ margin: 0 }}>
      <legend className={s.muted} style={{ padding: '0 6px' }}>Instructor</legend>
      <div className={s.tabs} style={{ marginBottom: 12 }}>
        {(['interno', 'externo'] as const).map(t => <button type="button" key={t} aria-pressed={tipo === t} className={tipo === t ? s.tabActive : ''} onClick={() => setTipo(t)}>
          {t === 'interno' ? 'Miembro de la fundación' : 'Instructor externo'}</button>)}
      </div>
      {tipo === 'interno' ? <label className={s.field}>Miembro
        <select value={f.instructor_user_id} onChange={set('instructor_user_id')} required disabled={busy}>
          <option value="">Seleccione…</option>
          {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}{ROLES[u.role] ? ` · ${ROLES[u.role]}` : ` · ${u.role.replace(/_/g, ' ')}`}</option>)}
        </select>
        <span className={s.muted} style={{ fontWeight: 400 }}>Ingresa con sus credenciales y verá la opción “Cursos para dictar”.</span></label>
        : <>
          <label className={s.field}>Instructor externo
            <select value={f.instructor_cuenta_id} onChange={set('instructor_cuenta_id')} required={!nuevoExterno} disabled={busy}>
              <option value="">Seleccione…</option>
              {externos.map(x => <option key={x.id} value={x.id}>{x.nombre} {x.apellidos} · {x.email}{x.institucion ? ` · ${x.institucion}` : ''}</option>)}
            </select>
            <span className={s.muted} style={{ fontWeight: 400 }}>Accede desde el portal de cursos (/cursos/ingresar) con su correo y contraseña.</span></label>
          <div className={s.actions}>
            <button type="button" className={s.secondary} onClick={() => setNuevoExterno(v => !v)}>{nuevoExterno ? 'Cerrar registro' : '+ Registrar instructor externo'}</button>
            {externoSel && <button type="button" className={s.secondary} onClick={restablecer}>Generar nueva contraseña</button>}
          </div>
          {nuevoExterno && <NuevoInstructor onCreado={(cuenta, password, correo) => {
            setExternos(xs => [...xs.filter(x => x.id !== cuenta.id), cuenta]); setF(v => ({ ...v, instructor_cuenta_id: String(cuenta.id) }));
            setNuevoExterno(false); if (password) setClave({ email: cuenta.email, password, correo });
          }} />}
        </>}
      {clave && <div className={s.success} role="status">
        Acceso del instructor externo: <strong>{clave.email}</strong> · contraseña temporal <span className={c.clave}>{clave.password}</span><br />
        {clave.correo ? 'También se envió por correo electrónico.' : 'No se pudo enviar por correo (SMTP no configurado): compártala personalmente. No se volverá a mostrar.'}
      </div>}
    </fieldset>

    <label className={s.field}>Horas académicas<input type="number" min="0.5" step="0.5" value={f.horas} onChange={set('horas')} required disabled={busy} /></label>
    <label className={s.field}>Nota mínima de aprobación (%)<input type="number" min="1" max="100" step="1" value={f.nota_minima} onChange={set('nota_minima')} required disabled={busy} /></label>
    <label className={s.field}>Fecha de inicio<input type="date" value={f.fecha_inicio} onChange={set('fecha_inicio')} required disabled={busy} /></label>
    <label className={s.field}>Fecha de fin<input type="date" value={f.fecha_fin} min={f.fecha_inicio} onChange={set('fecha_fin')} required disabled={busy} /></label>
    <label className={s.field}>Costo (Bs, 0 = gratuito)<input type="number" min="0" step="0.01" value={f.costo} onChange={set('costo')} disabled={busy} /></label>
    <label className={s.field}>Cupo (0 = sin límite)<input type="number" min="0" step="1" value={f.cupo} onChange={set('cupo')} disabled={busy} /></label>
    {Number(f.costo) > 0 && <label className={`${s.field} ${s.wide}`}>Cómo pagar (se muestra al inscribirse)
      <textarea value={f.info_pago} onChange={set('info_pago')} maxLength={1000} required disabled={busy} placeholder="Ej. Depósito a la cuenta 1234567 del Banco Unión a nombre de la Fundación, o pago con QR en secretaría." /></label>}
    {error && <div role="alert" className={`${s.error} ${s.wide}`}>{error}</div>}
    {ok && <div role="status" className={`${s.success} ${s.wide}`}>{ok}</div>}
    <div className={`${s.actions} ${s.wide}`}>
      <button className={s.button} disabled={busy}>{busy ? 'Guardando…' : inicial ? 'Guardar cambios' : 'Crear curso'}</button>
      {onCancelar && <button type="button" className={s.secondary} disabled={busy} onClick={onCancelar}>Cancelar</button>}
    </div>
  </form>;
}

function NuevoInstructor({ onCreado }: { onCreado: (cuenta: CuentaExterna, password: string | null, correo: boolean) => void }) {
  const [d, setD] = useState({ nombre: '', apellidos: '', documento: '', email: '', telefono: '', institucion: '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const set = (k: keyof typeof d) => (e: { target: { value: string } }) => setD(v => ({ ...v, [k]: e.target.value }));
  async function crear() {
    setBusy(true); setError('');
    try { const r = await cursosGestionApi.crearInstructor(d); onCreado(r.cuenta, r.password, !!r.correo_enviado); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo registrar al instructor.'); }
    finally { setBusy(false); }
  }
  // No es un <form> anidado: el registro se envía con su propio botón dentro del formulario del curso.
  return <div className={s.form} style={{ marginTop: 14, padding: 14, background: '#f7f9fc', borderRadius: 12 }}
    onKeyDown={e => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') { e.preventDefault(); if (!busy) void crear(); } }}>
    <label className={s.field}>Nombres<input value={d.nombre} onChange={set('nombre')} maxLength={120} disabled={busy} /></label>
    <label className={s.field}>Apellidos<input value={d.apellidos} onChange={set('apellidos')} maxLength={160} disabled={busy} /></label>
    <label className={s.field}>Documento de identidad<input value={d.documento} onChange={set('documento')} maxLength={40} disabled={busy} /></label>
    <label className={s.field}>Correo electrónico<input type="email" value={d.email} onChange={set('email')} maxLength={180} disabled={busy} /></label>
    <label className={s.field}>Teléfono<input value={d.telefono} onChange={set('telefono')} maxLength={40} disabled={busy} /></label>
    <label className={s.field}>Institución<input value={d.institucion} onChange={set('institucion')} maxLength={200} disabled={busy} /></label>
    {error && <div role="alert" className={`${s.error} ${s.wide}`}>{error}</div>}
    <div className={`${s.actions} ${s.wide}`}><button type="button" className={s.button} disabled={busy} onClick={crear}>{busy ? 'Registrando…' : 'Registrar y generar acceso'}</button></div>
  </div>;
}
