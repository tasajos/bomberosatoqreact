import { useRef, useState, useCallback, useEffect } from 'react';
import styles from './FocalPointPicker.module.css';

interface Props {
  src: string;            // URL o dataURL de la imagen
  value: string;          // "x% y%" ej: "40% 60%"
  onChange: (v: string) => void;
  aspectRatio?: number;   // Relación de aspecto del contenedor picker (default 16/9)
}

function parsePos(v: string): { x: number; y: number } {
  const parts = v.trim().split(/\s+/);
  const parse = (s: string) => {
    if (s.endsWith('%')) return parseFloat(s);
    const map: Record<string, number> = { left: 0, top: 0, center: 50, right: 100, bottom: 100 };
    return map[s] ?? 50;
  };
  return { x: parse(parts[0] ?? '50%'), y: parse(parts[1] ?? '50%') };
}

export default function FocalPointPicker({ src, value, onChange, aspectRatio = 16 / 9 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging]   = useState(false);
  const pos = parsePos(value);

  const calcPos = useCallback((e: MouseEvent | React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    onChange(`${Math.round(x)}% ${Math.round(y)}%`);
  }, [onChange]);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    calcPos(e);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => calcPos(e);
    const onUp   = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [dragging, calcPos]);

  // Touch support
  const onTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setDragging(true);
    const t = e.touches[0];
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((t.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((t.clientY - rect.top)  / rect.height) * 100));
    onChange(`${Math.round(x)}% ${Math.round(y)}%`);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((t.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((t.clientY - rect.top)  / rect.height) * 100));
      onChange(`${Math.round(x)}% ${Math.round(y)}%`);
    };
    const onEnd = () => setDragging(false);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend',  onEnd);
    return () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onEnd);
    };
  }, [dragging, onChange]);

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>Punto focal — arrastra para reposicionar</span>
      <span className={styles.hint}>Indica el área más importante de la imagen (cara, texto, acción).</span>

      {/* Picker principal */}
      <div
        ref={containerRef}
        className={styles.container}
        style={{ aspectRatio: `${aspectRatio}` }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <img
          src={src}
          alt="focal point picker"
          className={styles.img}
          draggable={false}
          style={{ objectPosition: value }}
        />
        {/* Dot indicador */}
        <div
          className={styles.dot}
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
        />
      </div>

      {/* Preview en proporción del slider */}
      <span className={styles.label}>Vista previa en slider (16:5)</span>
      <div className={styles.preview}>
        <img src={src} alt="preview" style={{ objectPosition: value }} draggable={false} />
        <span className={styles.previewBadge}>Resultado en el sitio</span>
      </div>

      <span className={styles.value}>object-position: {value}</span>
    </div>
  );
}
