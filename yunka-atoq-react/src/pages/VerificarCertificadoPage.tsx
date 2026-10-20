import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { consultarCertificadoPublico, type CertificadoPublico } from '../services/certificadosApi';
import styles from './VerificarCertificadoPage.module.css';

function fecha(value: string): string {
  return new Date(`${value.slice(0,10)}T12:00:00`).toLocaleDateString('es-BO',{day:'numeric',month:'long',year:'numeric'});
}

export default function VerificarCertificadoPage() {
  const { token = '' } = useParams();
  const [intento,setIntento] = useState(0);
  const [estado,setEstado] = useState<{ datos:CertificadoPublico | null; cargando:boolean; error:string }>({datos:null,cargando:true,error:''});

  useEffect(() => {
    const controller = new AbortController();
    setEstado({datos:null,cargando:true,error:''});
    const cargar = async () => {
      try {
        if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('El enlace de verificación no es válido. Revisa el QR del certificado.');
        const datos = await consultarCertificadoPublico(token,controller.signal);
        if (!controller.signal.aborted) setEstado({datos,cargando:false,error:''});
      } catch (e) {
        if (!controller.signal.aborted) setEstado({datos:null,cargando:false,error:e instanceof TypeError ? 'No se pudo conectar con el registro. Comprueba tu conexión e intenta nuevamente.' : e instanceof Error ? e.message : 'No se pudo consultar el registro.'});
      }
    };
    void cargar();
    return () => controller.abort();
  }, [token,intento]);

  useEffect(() => {
    const titulo = document.title;
    document.title = `${estado.datos?.codigo || 'Verificación de certificados'} | Yunka Atoq`;
    const existente = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const robots = existente || document.createElement('meta');
    const anterior = robots.getAttribute('content');
    robots.name = 'robots'; robots.content = 'noindex, nofollow';
    if (!existente) document.head.appendChild(robots);
    return () => {
      document.title = titulo;
      if (!existente) robots.remove();
      else if (anterior === null) robots.removeAttribute('content');
      else robots.content = anterior;
    };
  }, [estado.datos?.codigo]);

  const d = estado.datos;
  const temas = (d?.temario || '').split('\n').map(s=>s.trim().replace(/^(?:[-•]\s*|\d+[.)]\s+)/,'')).filter(Boolean);
  return <div className={styles.page}>
    <div className={styles.container}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>YUNKA ATOQ · REGISTRO ACADÉMICO</p>
        <h1>Verificación de certificados</h1>
        <p>Consulta de la información registrada en el libro de capacitaciones de la institución.</p>
      </header>

      {estado.cargando && <div className={styles.notice} role="status">Consultando el registro del certificado…</div>}
      {estado.error && <section className={styles.notice} role="alert">
        <h2>Registro no disponible</h2><p>{estado.error}</p>
        <div className={styles.actions}><button onClick={()=>setIntento(i=>i+1)}>Volver a consultar</button><Link to="/contacto">Contactar a la institución</Link></div>
      </section>}

      {d && <article className={styles.record}>
        <div className={styles.recordHeader}>
          <div className={styles.brand}><img src="/yunka_atoq_transparente.png" alt="Escudo Yunka Atoq" /><div>
            <p className={styles.label}>CERTIFICADO REGISTRADO</p><h2>{d.codigo}</h2><p>{d.libro}</p>
          </div></div>
          <div className={styles.verified}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10" /></svg><span>Registro verificado</span></div>
        </div>
        <div className={styles.identity}>
          <span className={styles.label}>TITULAR DEL CERTIFICADO</span><h3>{d.participante}</h3>
          <span className={styles.label}>CURSO / CAPACITACIÓN</span><p>{d.curso}</p>
        </div>
        <dl className={styles.details}>
          <div><dt>Estado</dt><dd>Emitido</dd></div>
          <div><dt>Tipo de certificado</dt><dd>{d.modalidad === 'aprobacion' ? 'Aprobación' : 'Participación'}</dd></div>
          <div><dt>Carga horaria</dt><dd>{d.horas} horas</dd></div>
          <div><dt>Inicio del curso</dt><dd>{fecha(d.fechaInicio)}</dd></div>
          <div><dt>Finalización del curso</dt><dd>{fecha(d.fechaFin)}</dd></div>
          <div><dt>Fecha de emisión</dt><dd>{fecha(d.fechaEmision)}</dd></div>
          <div><dt>Lugar de emisión</dt><dd>{d.lugar}</dd></div>
          <div><dt>Institución emisora</dt><dd>Fundación Yunka Atoq</dd></div>
        </dl>
        <section className={styles.section}>
          <h3>Contenido académico</h3><p className={styles.description}>Temario registrado para esta capacitación.</p>
          <ol className={styles.topics}>{temas.map((tema,i)=><li key={i}>{tema}</li>)}</ol>
        </section>
        <section className={styles.section}>
          <h3>Responsables de la certificación</h3>
          <div className={styles.signers}>{d.firmantes.map((firma,i)=><div key={i}><strong>{firma.nombre}</strong><span>{firma.cargo}</span></div>)}</div>
        </section>
        <footer className={styles.recordFooter}><p>Información consultada directamente del registro institucional. Para consultas sobre este certificado, indica el código <strong>{d.codigo}</strong>.</p>
          <Link to="/contacto">Contactar a Yunka Atoq →</Link></footer>
      </article>}
      <Link className={styles.back} to="/">← Volver al sitio institucional</Link>
    </div>
  </div>;
}
