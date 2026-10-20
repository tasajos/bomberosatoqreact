import { randomBytes, createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export class ErrorCertificado extends Error {
  constructor(status, mensaje) { super(mensaje); this.status = status; }
}

export function validarDatosCertificado(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ErrorCertificado(400, 'Datos inválidos.');
  const limites = { participante:180, documento:60, curso:240, horas:10, lugar:100,
    presidente:120, cargoPresidente:100, instructor:120, cargoInstructor:100, temario:6000 };
  const datos = {};
  for (const [campo, maximo] of Object.entries(limites)) {
    if (input[campo] != null && typeof input[campo] !== 'string') throw new ErrorCertificado(400, `Campo inválido: ${campo}.`);
    datos[campo] = (input[campo] || '').trim();
    if (datos[campo].length > maximo) throw new ErrorCertificado(400, `El campo ${campo} es demasiado largo.`);
  }
  for (const campo of ['participante','curso','horas','lugar','presidente','temario']) {
    if (!datos[campo]) throw new ErrorCertificado(400, `Completa el campo ${campo} antes de emitir.`);
  }
  // Segundo firmante opcional: se omite solo si nombre y cargo están vacíos
  if (!datos.instructor && datos.cargoInstructor) {
    throw new ErrorCertificado(400, 'Completa el nombre del instructor o deja vacío también su cargo.');
  }
  for (const campo of ['fechaInicio','fechaFin','fechaEmision']) {
    const value = input[campo];
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
      throw new ErrorCertificado(400, `Fecha inválida: ${campo}.`);
    }
    datos[campo] = value;
  }
  if (datos.fechaFin < datos.fechaInicio) throw new ErrorCertificado(400, 'El fin del curso no puede ser anterior al inicio.');
  if (datos.fechaEmision < datos.fechaFin) throw new ErrorCertificado(400, 'La emisión no puede ser anterior al fin del curso.');
  if (!Number.isFinite(Number(datos.horas)) || Number(datos.horas) <= 0 || Number(datos.horas) > 10000) {
    throw new ErrorCertificado(400, 'La carga horaria debe estar entre 0 y 10000 horas.');
  }
  if (!['participacion','aprobacion'].includes(input.modalidad)) throw new ErrorCertificado(400, 'Modalidad inválida.');
  if (typeof input.incluirQR !== 'boolean') throw new ErrorCertificado(400, 'Selecciona si deseas incluir el QR.');
  return { ...datos, modalidad: input.modalidad, incluirQR: input.incluirQR, codigo: '' };
}

function hidratar(row) {
  const codigo = `CRTYA-${row.numero}`;
  return { id:row.id, numero:row.numero, codigo, estado:row.estado,
    datos: { ...(typeof row.datos === 'string' ? JSON.parse(row.datos) : row.datos), codigo },
    descarga_path: `/certificados/${row.id}/pdf`, verificacion_path: `/certificados/verificar/${row.token}`,
    created_at:row.created_at, emitido_at:row.emitido_at };
}

// La ficha pública solo expone datos académicos, sin documento de identidad ni rutas de archivos.
export function informacionPublicaCertificado(registro) {
  const d = registro.datos;
  return { codigo:registro.codigo, estado:registro.estado, participante:d.participante, curso:d.curso,
    modalidad:d.modalidad, horas:d.horas, fechaInicio:d.fechaInicio, fechaFin:d.fechaFin,
    fechaEmision:d.fechaEmision, lugar:d.lugar, temario:d.temario,
    firmantes:[{nombre:d.presidente,cargo:d.cargoPresidente},{nombre:d.instructor,cargo:d.cargoInstructor}].filter(f => f.nombre),
    libro:'Libro de capacitaciones' };
}

export function crearServicioCertificados({ pool, storageDir }) {
  let inicializando;
  const archivo = token => path.join(storageDir, `${token}.pdf`);
  const init = () => {
    if (!inicializando) inicializando = (async () => {
      const sql = await readFile(fileURLToPath(new URL('../scripts/16_certificados_cursos.sql', import.meta.url)), 'utf8');
      for (const query of sql.split(';').map(s => s.trim()).filter(Boolean)) await pool.query(query);
      await mkdir(storageDir, { recursive:true });
    })().catch(e => { inicializando = undefined; throw e; });
    return inicializando;
  };
  return {
    init,
    async reservar(input, clave, usuario) {
      const datos = validarDatosCertificado(input);
      if (typeof clave !== 'string' || !/^[a-f0-9-]{36}$/i.test(clave)) throw new ErrorCertificado(400, 'Clave de solicitud inválida.');
      await init();
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        // Una fila bloqueada serializa las emisiones, incluso entre procesos distintos.
        const [[secuencia]] = await conn.query('SELECT siguiente_numero FROM certificados_secuencia WHERE id=1 FOR UPDATE');
        const [[existente]] = await conn.query('SELECT * FROM certificados_cursos WHERE clave_solicitud=?', [clave]);
        if (existente) {
          if (existente.creado_por !== usuario) throw new ErrorCertificado(409, 'Solicitud ya utilizada.');
          const previo = hidratar(existente);
          if (Object.keys(datos).some(key => key !== 'codigo' && previo.datos[key] !== datos[key])) throw new ErrorCertificado(409, 'Los datos de esta emisión ya fueron registrados.');
          await conn.commit();
          return previo;
        }
        const numero = secuencia.siguiente_numero;
        const token = randomBytes(32).toString('hex');
        const [r] = await conn.query('INSERT INTO certificados_cursos (numero,token,clave_solicitud,datos,creado_por) VALUES (?,?,?,?,?)',
          [numero,token,clave,JSON.stringify(datos),usuario]);
        await conn.query('UPDATE certificados_secuencia SET siguiente_numero=siguiente_numero+1 WHERE id=1');
        const [[registro]] = await conn.query('SELECT * FROM certificados_cursos WHERE id=?', [r.insertId]);
        await conn.commit();
        return hidratar(registro);
      } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
    },
    async guardarPDF(id, buffer, usuario, admin = false) {
      if (!Buffer.isBuffer(buffer) || buffer.length < 100 || buffer.subarray(0,5).toString() !== '%PDF-') {
        throw new ErrorCertificado(400, 'Adjunta un PDF válido.');
      }
      await init();
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [[row]] = await conn.query('SELECT * FROM certificados_cursos WHERE id=? FOR UPDATE', [id]);
        if (!row) throw new ErrorCertificado(404, 'Certificado no encontrado.');
        if (!admin && row.creado_por !== usuario) throw new ErrorCertificado(403, 'No puedes completar esta emisión.');
        const hash = createHash('sha256').update(buffer).digest('hex');
        if (row.estado === 'emitido') {
          if (row.sha256 !== hash) throw new ErrorCertificado(409, 'El certificado emitido es inmutable. Descarga el PDF registrado.');
        } else {
          // Mientras sigue pendiente el archivo no es público. Un reintento puede
          // reparar una escritura interrumpida, manteniendo bloqueado el registro.
          await writeFile(archivo(row.token), buffer);
          await conn.query("UPDATE certificados_cursos SET estado='emitido', sha256=?, emitido_at=CURRENT_TIMESTAMP WHERE id=?", [hash,id]);
        }
        const [[registro]] = await conn.query('SELECT * FROM certificados_cursos WHERE id=?', [id]);
        await conn.commit();
        return hidratar(registro);
      } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
    },
    async listar() {
      await init();
      const [rows] = await pool.query('SELECT * FROM certificados_cursos ORDER BY numero DESC LIMIT 100');
      return rows.map(hidratar);
    },
    async publico(token) {
      if (!/^[a-f0-9]{64}$/.test(token)) throw new ErrorCertificado(404, 'Certificado no encontrado.');
      await init();
      const [[row]] = await pool.query("SELECT * FROM certificados_cursos WHERE token=? AND estado='emitido'", [token]);
      if (!row) throw new ErrorCertificado(404, 'El certificado aún no está disponible.');
      return { ...hidratar(row), archivo:archivo(token), sha256:row.sha256 };
    },
    async original(id) {
      if (!/^\d+$/.test(String(id))) throw new ErrorCertificado(404,'Certificado no encontrado.');
      await init();
      const [[row]] = await pool.query("SELECT * FROM certificados_cursos WHERE id=? AND estado='emitido'",[id]);
      if (!row) throw new ErrorCertificado(404,'El certificado aún no está disponible.');
      return { ...hidratar(row), archivo:archivo(row.token) };
    },
  };
}
