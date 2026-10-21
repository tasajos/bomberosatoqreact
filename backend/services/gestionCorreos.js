import nodemailer from 'nodemailer';
import { hoyBolivia } from './gestion.js';

// Cola persistente. GET_LOCK evita envíos simultáneos desde varios procesos.
// SMTP es entrega al menos una vez: un corte después de enviar puede repetir un correo.
export function crearProcesadorCorreos(pool, gestion, enviar) {
  let ocupado = false;
  return async function procesar() {
    if (ocupado) return;
    ocupado = true;
    let db, locked = false;
    try {
      await gestion.init(); db = await pool.getConnection();
      const [[lock]] = await db.query("SELECT GET_LOCK(CONCAT(DATABASE(), ':gestion_correo'),0) adquirido");
      if (!lock.adquirido) return;
      locked = true;
      const dias = Math.max(1, Math.min(30, Number(process.env.PRESTAMOS_AVISO_DIAS) || 3));
      const [prestamos] = await db.query(`SELECT p.id,p.voluntario_id,p.fecha_devolucion,e.nombre,
        CASE WHEN p.fecha_devolucion < ? THEN 'vencido' ELSE 'proximo' END aviso
        FROM log_prestamos p JOIN log_equipos e ON e.id=p.equipo_id
        WHERE p.estado='autorizado' AND p.fecha_devolucion<=DATE_ADD(?, INTERVAL ? DAY)`,[hoyBolivia(),hoyBolivia(),dias]);
      for(const p of prestamos) {
        const fecha = p.fecha_devolucion instanceof Date ? p.fecha_devolucion.toLocaleDateString('es-BO') : String(p.fecha_devolucion).slice(0,10);
        await gestion.notificar(db,`prestamo:${p.id}:aviso-${p.aviso}`,'jefe_logistica',p.voluntario_id,
          `Devolución ${p.aviso==='vencido'?'vencida':'próxima'} · ${p.nombre}`,
          `Préstamo #${p.id}\nEquipo: ${p.nombre}\nFecha de devolución: ${fecha}\nCoordine la devolución con logística y registre la recepción en el sistema.`);
      }
      if(!enviar) return; // Sin SMTP, permanece visible y pendiente; nunca se marca como enviado.
      const [pendientes]=await db.query('SELECT * FROM gestion_correos WHERE enviado_at IS NULL AND proximo_intento<=NOW() ORDER BY id LIMIT 25');
      for(const c of pendientes) {
        try {
          await enviar(c);
          await db.query('UPDATE gestion_correos SET enviado_at=NOW(),intentos=intentos+1,ultimo_error=NULL WHERE id=?',[c.id]);
        } catch {
          const espera=Math.min(360,2**Math.min(c.intentos+1,9));
          await db.query("UPDATE gestion_correos SET intentos=intentos+1,ultimo_error='No se pudo entregar. Revise SMTP y el destinatario.',proximo_intento=DATE_ADD(NOW(),INTERVAL ? MINUTE) WHERE id=?",[espera,c.id]);
        }
      }
    } catch(e) { console.error('Cola de gestión:',e.code || e.message); }
    finally {
      if(db) { if(locked) await db.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':gestion_correo'))").catch(()=>{}); db.release(); }
      ocupado=false;
    }
  };
}

export function iniciarCorreosGestion(pool,gestion) {
  const configurado=process.env.SMTP_USER && process.env.SMTP_PASS;
  const transporter=configurado?nodemailer.createTransport(process.env.SMTP_HOST?{
    host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT)||587,secure:process.env.SMTP_SECURE==='true',
    auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},connectionTimeout:10000,socketTimeout:20000,
  }:{service:'gmail',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},connectionTimeout:10000,socketTimeout:20000}):null;
  const procesar=crearProcesadorCorreos(pool,gestion,transporter ? c=>transporter.sendMail({
    from:`"Yunka Atoq" <${process.env.SMTP_USER}>`,to:c.destinatario,subject:c.asunto,text:c.cuerpo,
  }):null);
  void procesar();
  const timer=setInterval(procesar,60000);timer.unref();
  return ()=>clearInterval(timer);
}
