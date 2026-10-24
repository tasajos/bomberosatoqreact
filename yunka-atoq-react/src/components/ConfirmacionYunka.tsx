import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import s from './ConfirmacionYunka.module.css';

interface Props {
  titulo: string;
  children: ReactNode;
  confirmar: string;
  ocupado: boolean;
  error?: string;
  onCancelar: () => void;
  onConfirmar: () => void;
}

export default function ConfirmacionYunka({ titulo, children, confirmar, ocupado, error, onCancelar, onConfirmar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const tituloId = useId(), contenidoId = useId();
  useEffect(() => {
    const elemento = dialogo.current;
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    elemento?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      elemento?.close();
      document.body.style.overflow = overflow;
      anterior?.focus();
    };
  }, []);

  return createPortal(<dialog ref={dialogo} className={s.dialogo} aria-labelledby={tituloId} aria-describedby={contenidoId}
    aria-modal="true" aria-busy={ocupado} onCancel={e => e.preventDefault()}>
    <div className={s.marca}>
      <img src="/yunka_atoq_log.png" alt="Logo de Yunka Atoq" />
      <div><strong>YUNKA ATOQ</strong><span>Bomberos Voluntarios</span></div>
      <span className={s.portal}>Presidencia</span>
    </div>
    <div className={s.contenido}>
      <span className={s.etiqueta}>CONFIRMAR ELIMINACIÓN</span>
      <h2 id={tituloId}>{titulo}</h2>
      <div id={contenidoId} className={s.descripcion}>{children}</div>
      {error && <div role="alert" className={s.error}>{error}</div>}
    </div>
    <div className={s.pie}>
      <p>Esta acción no se puede deshacer.</p>
      <div className={s.acciones}>
        <button autoFocus className={s.cancelar} disabled={ocupado} onClick={onCancelar}>Cancelar</button>
        <button className={s.eliminar} disabled={ocupado} onClick={onConfirmar}>{ocupado ? 'Eliminando…' : confirmar}</button>
      </div>
    </div>
  </dialog>, document.body);
}
