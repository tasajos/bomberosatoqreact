import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function notificarContacto({ nombre, correo, telefono, tema, mensaje }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.NOTIFY_EMAIL) return;

  const fecha = new Date().toLocaleString('es-BO', {
    timeZone: 'America/La_Paz',
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  await transporter.sendMail({
    from: `"Yunka Atoq · Sistema" <${process.env.SMTP_USER}>`,
    to: process.env.NOTIFY_EMAIL,
    subject: `Nuevo mensaje de contacto: ${nombre}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:linear-gradient(135deg,#0F172A,#1e3a5f);padding:24px 28px;">
          <h2 style="color:white;margin:0;font-size:20px;letter-spacing:0.03em;">
            ✉️ Nuevo mensaje de contacto
          </h2>
          <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px;">${fecha}</p>
        </div>

        <div style="padding:24px 28px;background:white;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 0;color:#94a3b8;font-weight:700;text-transform:uppercase;font-size:11px;width:120px;">Nombre</td>
              <td style="padding:10px 0;color:#0f172a;font-weight:600;">${nombre}</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 0;color:#94a3b8;font-weight:700;text-transform:uppercase;font-size:11px;">Correo</td>
              <td style="padding:10px 0;"><a href="mailto:${correo}" style="color:#1e40af;">${correo}</a></td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 0;color:#94a3b8;font-weight:700;text-transform:uppercase;font-size:11px;">Teléfono</td>
              <td style="padding:10px 0;color:#0f172a;">${telefono || '—'}</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 0;color:#94a3b8;font-weight:700;text-transform:uppercase;font-size:11px;">Tema</td>
              <td style="padding:10px 0;color:#0f172a;">${tema || '—'}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding:14px 0 4px;">
                <div style="color:#94a3b8;font-weight:700;text-transform:uppercase;font-size:11px;margin-bottom:8px;">Mensaje</div>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;color:#334155;line-height:1.6;font-size:13px;">${mensaje}</div>
              </td>
            </tr>
          </table>
        </div>

        <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
          <a href="mailto:${correo}" style="display:inline-block;background:#0F172A;color:white;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:13px;font-weight:700;letter-spacing:0.05em;">
            Responder →
          </a>
        </div>
      </div>
    `,
  });
}

export async function notificarPostulacion({ nombre, email, telefono, edad, mensaje }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.NOTIFY_EMAIL) return;

  const fecha = new Date().toLocaleString('es-BO', {
    timeZone: 'America/La_Paz',
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  await transporter.sendMail({
    from: `"Yunka Atoq · Sistema" <${process.env.SMTP_USER}>`,
    to: process.env.NOTIFY_EMAIL,
    subject: `Nueva postulación: ${nombre}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:linear-gradient(135deg,#C41E1E,#7c3aed);padding:24px 28px;">
          <h2 style="color:white;margin:0;font-size:20px;letter-spacing:0.03em;">
            🔔 Nueva postulación recibida
          </h2>
          <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px;">${fecha}</p>
        </div>

        <div style="padding:24px 28px;background:white;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 0;color:#94a3b8;font-weight:700;text-transform:uppercase;font-size:11px;width:120px;">Nombre</td>
              <td style="padding:10px 0;color:#0f172a;font-weight:600;">${nombre}</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 0;color:#94a3b8;font-weight:700;text-transform:uppercase;font-size:11px;">Correo</td>
              <td style="padding:10px 0;"><a href="mailto:${email}" style="color:#1e40af;">${email}</a></td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 0;color:#94a3b8;font-weight:700;text-transform:uppercase;font-size:11px;">Teléfono</td>
              <td style="padding:10px 0;color:#0f172a;">${telefono || '—'}</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 0;color:#94a3b8;font-weight:700;text-transform:uppercase;font-size:11px;">Edad</td>
              <td style="padding:10px 0;color:#0f172a;">${edad ? edad + ' años' : '—'}</td>
            </tr>
            ${mensaje ? `
            <tr>
              <td colspan="2" style="padding:14px 0 4px;">
                <div style="color:#94a3b8;font-weight:700;text-transform:uppercase;font-size:11px;margin-bottom:8px;">Mensaje</div>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;color:#334155;line-height:1.6;font-size:13px;">${mensaje}</div>
              </td>
            </tr>` : ''}
          </table>
        </div>

        <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
          <a href="mailto:${email}" style="display:inline-block;background:#C41E1E;color:white;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:13px;font-weight:700;letter-spacing:0.05em;">
            Contactar al postulante →
          </a>
        </div>
      </div>
    `,
  });
}
