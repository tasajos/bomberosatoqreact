import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import styles from './DonationsPage.module.css';
import { campaniasApi, type Campania, API_BASE } from '../services/api';
import { enlaceWhatsApp } from '../utils/whatsapp';

/** Número que recibe las donaciones por WhatsApp. */
const WA_DONACIONES = '68503758';
const WA_DONACIONES_LABEL = '+591 68503758';

function resolveImg(url: string | null) {
  if (!url) return null;
  return url.startsWith('/uploads/') ? `${API_BASE}${url}` : url;
}

const AMOUNTS = [50, 100, 250, 500, 1000, 2500];

function calcImpact(bs: number) {
  return [
    { num: Math.max(0, Math.floor(bs / 20)),   desc: 'Guantes ignífugos'    },
    { num: Math.max(0, Math.floor(bs / 120)),  desc: 'Máscaras de carbón'   },
    { num: Math.max(0, Math.floor(bs / 350)),  desc: 'Linternas tácticas'   },
    { num: Math.max(0, Math.floor(bs / 800)),  desc: 'Equipos de protección' },
  ].filter(i => i.num > 0).slice(0, 4);
}

const methods = [
  { num: '01', name: 'Transferencia bancaria', desc: 'Te enviamos los datos de la cuenta por WhatsApp.' },
  { num: '02', name: 'Código QR',              desc: 'Te enviamos el QR por WhatsApp. Compatible con todos los bancos.' },
  { num: '03', name: 'Tigo Money',             desc: 'Envía al número 68503758 — recibe confirmación inmediata.' },
];

const FREQ_LABEL = { once: 'Una vez', monthly: 'Mensual (cada mes)' } as const;
type Freq = keyof typeof FREQ_LABEL;

// ── Donación en especie ──────────────────────────────────────────
const TIPOS_DONANTE = ['Persona', 'Empresa', 'Institución'] as const;
const CATEGORIAS = [
  { key: 'Equipos de protección personal', icon: '🧯' },
  { key: 'Equipos de rescate',             icon: '🪢' },
  { key: 'Primeros auxilios y médico',     icon: '🩹' },
  { key: 'Herramientas',                   icon: '🛠️' },
  { key: 'Comunicación e iluminación',     icon: '📻' },
  { key: 'Víveres y agua',                 icon: '🥫' },
  { key: 'Vestimenta',                     icon: '🧥' },
  { key: 'Otros',                          icon: '📦' },
];
const ESTADOS_ITEM = ['Nuevo', 'Usado · buen estado', 'Usado · requiere revisión'];
const GALERIA = [
  { src: '/trabajo/rrblanco.jpg', titulo: 'Incendios forestales', desc: 'Brigadas en primera línea protegiendo bosques y comunidades.' },
  { src: '/history/2.jpg',        titulo: 'Búsqueda y rescate',  desc: 'Equipos preparados para llegar donde nadie más llega.' },
  { src: '/history/15.jpg',       titulo: 'Apoyo a comunidades', desc: 'Agua, víveres y acompañamiento a familias afectadas.' },
  { src: '/history/10.jpg',       titulo: 'Formación continua',  desc: 'Entrenamiento constante para servir mejor.' },
  { src: '/history/4.jpg',        titulo: 'Despliegues',         desc: 'Listos para movilizarnos a donde nos necesiten.' },
];
const CONFIANZA = [
  { icon: '🔥', text: 'Bomberos 100% voluntarios' },
  { icon: '📜', text: 'Personería jurídica Nº 304/2025' },
  { icon: '💬', text: 'Atención directa por WhatsApp' },
];

const NECESIDADES = [
  { icon: '🧤', title: 'Equipo de protección', desc: 'Guantes, cascos, botas, chaquetones, mascarillas.' },
  { icon: '🚑', title: 'Primeros auxilios',     desc: 'Botiquines, vendas, férulas, oxímetros, camillas.' },
  { icon: '🔦', title: 'Rescate e iluminación', desc: 'Cuerdas, mosquetones, linternas, radios.' },
  { icon: '💧', title: 'Víveres para emergencias', desc: 'Agua embotellada, alimentos no perecibles.' },
];

type Item = { descripcion: string; cantidad: string; estado: string };
const ITEM_VACIO: Item = { descripcion: '', cantidad: '', estado: ESTADOS_ITEM[0] };
const ESPECIE_VACIA = {
  tipo: 'Persona' as (typeof TIPOS_DONANTE)[number],
  nombre: '', organizacion: '', telefono: '', email: '',
  categorias: [] as string[],
  items: [{ ...ITEM_VACIO }] as Item[],
  entrega: 'cuartel' as 'cuartel' | 'recojo',
  direccion: '', disponibilidad: '', comentarios: '',
};

function fmt(n: number) { return new Intl.NumberFormat('es-BO').format(n); }

function abrirWhatsApp(texto: string) {
  window.open(enlaceWhatsApp(texto, WA_DONACIONES), '_blank', 'noopener,noreferrer');
}

function WhatsIcon() {
  return (
    <svg className={styles.waIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.93.95-3.48-.22-.36a9.43 9.43 0 0 1-1.45-5.02c0-5.2 4.24-9.44 9.45-9.44a9.4 9.4 0 0 1 6.68 2.77 9.38 9.38 0 0 1 2.76 6.68c0 5.21-4.24 9.44-9.45 9.44zm8.04-17.48A11.3 11.3 0 0 0 12.05.7C5.79.7.69 5.8.69 12.06c0 2 .52 3.96 1.52 5.68L.6 23.3l5.7-1.5a11.33 11.33 0 0 0 5.43 1.38h.01c6.26 0 11.36-5.1 11.36-11.36 0-3.03-1.18-5.89-3.32-8.03z"/>
    </svg>
  );
}

export default function DonationsPage() {
  const [modo, setModo]         = useState<'dinero' | 'especie'>('dinero');
  const [freq, setFreq]         = useState<Freq | null>(null);
  const [selected, setSelected] = useState<number>(100);
  const [custom, setCustom]     = useState('100');
  const [metodo, setMetodo]     = useState(methods[1].name);
  const [donante, setDonante]   = useState('');
  const [campania, setCampania] = useState<Campania | null>(null);
  const [campaigns, setCampaigns] = useState<Campania[]>([]);
  const [especie, setEspecie]   = useState(ESPECIE_VACIA);
  const [intentado, setIntentado] = useState(false);
  const [enviado, setEnviado]   = useState('');
  const donarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    campaniasApi.activas().then(setCampaigns).catch(() => {});
  }, []);

  const amount = Number(custom) > 0 ? Number(custom) : 0;
  const impact = calcImpact(amount);
  const listo  = amount > 0 && freq !== null;

  const handleAmount = (v: number) => { setSelected(v); setCustom(String(v)); };
  const handleCustom = (v: string) => { setCustom(v); setSelected(0); };

  const irADonar = (m: 'dinero' | 'especie') => {
    setModo(m);
    donarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const donarCampania = (c: Campania) => { setCampania(c); irADonar('dinero'); };

  const confirmarEnvio = (texto: string) => {
    setEnviado(texto);
    setTimeout(() => setEnviado(''), 6000);
  };

  const donarDinero = () => {
    if (!listo) return;
    const texto = [
      '🚒 *Donación económica · Yunka Atoq*',
      'Hola, quiero realizar una donación desde el sitio web.',
      '',
      `• *Monto:* Bs ${fmt(amount)}`,
      `• *Frecuencia:* ${FREQ_LABEL[freq!]}`,
      `• *Destino:* ${campania ? `Campaña "${campania.nombre}"` : 'Fondo general'}`,
      `• *Método preferido:* ${metodo}`,
      donante.trim() ? `• *Nombre:* ${donante.trim()}` : null,
      '',
      'Quedo atento(a) a los datos para concretar la donación. ¡Gracias!',
    ].filter(l => l !== null).join('\n');
    abrirWhatsApp(texto);
    confirmarEnvio('Se abrió WhatsApp con el detalle de tu donación. Solo presiona "Enviar" en el chat.');
  };

  // ── Donación en especie ────────────────────────────────────────
  const setE = <K extends keyof typeof ESPECIE_VACIA>(k: K, v: (typeof ESPECIE_VACIA)[K]) =>
    setEspecie(e => ({ ...e, [k]: v }));
  const toggleCategoria = (c: string) =>
    setE('categorias', especie.categorias.includes(c) ? especie.categorias.filter(x => x !== c) : [...especie.categorias, c]);
  const setItem = (i: number, k: keyof Item, v: string) =>
    setE('items', especie.items.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  const addItem = () => setE('items', [...especie.items, { ...ITEM_VACIO }]);
  const removeItem = (i: number) => setE('items', especie.items.filter((_, j) => j !== i));

  const itemsValidos = especie.items.filter(it => it.descripcion.trim());
  const errores = {
    nombre:       !especie.nombre.trim() ? 'Ingresa tu nombre' : '',
    organizacion: especie.tipo !== 'Persona' && !especie.organizacion.trim() ? `Ingresa el nombre de la ${especie.tipo.toLowerCase()}` : '',
    telefono:     especie.telefono.replace(/\D/g, '').length < 7 ? 'Ingresa un teléfono válido' : '',
    items:        !itemsValidos.length ? 'Describe al menos un artículo' : '',
    direccion:    especie.entrega === 'recojo' && !especie.direccion.trim() ? 'Indica la dirección de recojo' : '',
  };
  const hayErrores = Object.values(errores).some(Boolean);
  const err = (k: keyof typeof errores) => (intentado && errores[k] ? <span className={styles.fieldError}>{errores[k]}</span> : null);

  const donarEspecie = (e: FormEvent) => {
    e.preventDefault();
    setIntentado(true);
    if (hayErrores) return;
    const d = especie;
    const texto = [
      '📦 *Donación de materiales y equipos · Yunka Atoq*',
      'Hola, quiero realizar una donación en especie desde el sitio web.',
      '',
      '*Donante*',
      `• Tipo: ${d.tipo}`,
      `• Nombre: ${d.nombre.trim()}`,
      d.tipo !== 'Persona' ? `• ${d.tipo}: ${d.organizacion.trim()}` : null,
      `• Teléfono: ${d.telefono.trim()}`,
      d.email.trim() ? `• Correo: ${d.email.trim()}` : null,
      '',
      ...(d.categorias.length ? [`*Categorías:* ${d.categorias.join(', ')}`, ''] : []),
      '*Artículos a donar*',
      ...itemsValidos.map((it, i) =>
        `${i + 1}. ${it.descripcion.trim()}${it.cantidad.trim() ? ` — ${it.cantidad.trim()}` : ''} — ${it.estado}`),
      '',
      `*Entrega:* ${d.entrega === 'cuartel' ? 'Lo llevaré al cuartel' : 'Necesito que lo recojan'}`,
      d.entrega === 'recojo' ? `• Dirección: ${d.direccion.trim()}` : null,
      d.disponibilidad.trim() ? `• Disponibilidad: ${d.disponibilidad.trim()}` : null,
      ...(d.comentarios.trim() ? ['', `*Comentarios:* ${d.comentarios.trim()}`] : []),
    ].filter(l => l !== null).join('\n');
    abrirWhatsApp(texto);
    confirmarEnvio('Se abrió WhatsApp con el detalle de tu donación. Solo presiona "Enviar" en el chat y coordinaremos contigo.');
    setEspecie(ESPECIE_VACIA);
    setIntentado(false);
  };

  return (
    <main>
      {/* Hero */}
      <section className={styles.hero}>
        <img className={styles.heroImg} src="/trabajo/rr3.jpg" alt="" fetchPriority="high" width="1600" height="1066" />
        <div className={styles.heroOverlay} />
        <div className={styles.heroInner}>
          <div className={styles.breadcrumb}>
            <Link to="/">Inicio</Link><span>/</span>Donaciones
          </div>
          <div className={styles.heroKicker}>Apoya a tus bomberos voluntarios</div>
          <h1 className={styles.heroTitle}>
            Tu donación,<br /><span>nuestra misión.</span>
          </h1>
          <p className={styles.heroDesc}>
            Cada peso boliviano se convierte en equipamiento, formación y servicio para Cochabamba.
            También recibimos materiales, productos y equipos.
          </p>
          <div className={styles.heroCtas}>
            <button className={styles.heroBtnPrimary} onClick={() => irADonar('dinero')}>💰 Donar dinero</button>
            <button className={styles.heroBtnGhost} onClick={() => irADonar('especie')}>📦 Donar materiales y equipos</button>
          </div>
          <ul className={styles.heroTrust}>
            {CONFIANZA.map(c => <li key={c.text}><span>{c.icon}</span>{c.text}</li>)}
          </ul>
        </div>
      </section>

      {/* Selector de tipo de donación */}
      <section className={styles.mainSection} ref={donarRef} id="donar">
        <div className={styles.modeInner}>
          <div className="section-tag">Elige cómo ayudar</div>
          <div className={styles.modeSwitch} role="tablist">
            {([
              ['dinero',  '💰', 'Donación económica',   'Una vez o mensual · QR, transferencia o Tigo Money', '/history/12.jpg'],
              ['especie', '📦', 'Materiales y equipos', 'Productos, insumos y equipamiento',                  '/history/13.jpg'],
            ] as const).map(([m, icon, titulo, sub, img]) => (
              <button key={m} role="tab" aria-selected={modo === m}
                className={`${styles.modeBtn} ${modo === m ? styles.modeBtnActive : ''}`}
                onClick={() => setModo(m)}>
                <img className={styles.modeImg} src={img} alt="" loading="lazy" decoding="async" />
                <span className={styles.modeShade} />
                <span className={styles.modeCheck} aria-hidden="true">✓</span>
                <span className={styles.modeBody}>
                  <span className={styles.modeIcon}>{icon}</span>
                  <span>
                    <span className={styles.modeTitle}>{titulo}</span>
                    <span className={styles.modeSub}>{sub}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>

          {enviado && <div className={styles.sentToast}>✅ {enviado}</div>}
        </div>

        {modo === 'dinero' ? (
          <div className={styles.mainInner}>
            {/* Calculadora */}
            <div>
              <div className="section-tag">Calculadora de impacto</div>
              <h2 className={styles.calcTitle}>
                Convierte tu donación<br />en equipamiento real.
              </h2>

              <div className={styles.stepLabel}><span>1</span> ¿Con qué frecuencia?</div>
              <div className={styles.freqToggle}>
                {(Object.keys(FREQ_LABEL) as Freq[]).map(f => (
                  <button key={f}
                    className={`${styles.freqBtn} ${freq === f ? styles.freqBtnActive : ''}`}
                    onClick={() => setFreq(f)}>
                    {f === 'once' ? 'Una vez' : 'Mensual'}
                  </button>
                ))}
              </div>

              <div className={styles.stepLabel}><span>2</span> Elige un monto</div>
              <div className={styles.amountGrid}>
                {AMOUNTS.map(a => (
                  <button
                    key={a}
                    className={`${styles.amountBtn} ${selected === a && String(a) === custom ? styles.amountBtnActive : ''}`}
                    onClick={() => handleAmount(a)}
                  >
                    Bs {fmt(a)}
                  </button>
                ))}
              </div>

              <label className={styles.customLabel} htmlFor="monto">Otro monto (Bs)</label>
              <input
                id="monto"
                className={styles.customInput}
                type="number"
                inputMode="numeric"
                min="1"
                value={custom}
                onChange={e => handleCustom(e.target.value)}
                placeholder="Ej. 150"
              />

              {/* Resumen + botón: aparece al tener monto y frecuencia */}
              {listo ? (
                <div className={styles.summary}>
                  <div className={styles.summaryHead}>
                    <span className={styles.summaryKicker}>Tu donación</span>
                    <span className={styles.summaryFreq}>{freq === 'monthly' ? '↻ Mensual' : '● Una vez'}</span>
                  </div>
                  <div className={styles.summaryAmount}>
                    Bs {fmt(amount)}{freq === 'monthly' && <small> / mes</small>}
                  </div>
                  <div className={styles.summaryMeta}>
                    <span>Método: <strong>{metodo}</strong></span>
                    {campania && (
                      <span className={styles.summaryCamp}>
                        Destino: <strong>{campania.nombre}</strong>
                        <button type="button" aria-label="Quitar campaña" onClick={() => setCampania(null)}>✕</button>
                      </span>
                    )}
                  </div>
                  <input
                    className={styles.summaryInput}
                    value={donante}
                    onChange={e => setDonante(e.target.value)}
                    placeholder="Tu nombre (opcional)"
                  />
                  <button className={styles.waBtn} onClick={donarDinero}>
                    <WhatsIcon /> Realizar donación
                  </button>
                  <p className={styles.summaryNote}>Se abrirá WhatsApp ({WA_DONACIONES_LABEL}) con tu donación lista para enviar.</p>
                </div>
              ) : (
                <div className={styles.summaryHint}>
                  {!freq ? 'Elige si tu donación es una vez o mensual para continuar.' : 'Ingresa un monto mayor a cero para continuar.'}
                </div>
              )}

              <div className={styles.impactPanel}>
                <div className={styles.impactLabel}>
                  Bs {fmt(amount)} · eso equivale a
                </div>
                <div className={styles.impactGrid}>
                  {impact.length > 0
                    ? impact.map(({ num, desc }) => (
                      <div key={desc}>
                        <div className={styles.impactNum}>{num}</div>
                        <div className={styles.impactDesc}>{desc}</div>
                      </div>
                    ))
                    : <div className={styles.impactEmpty}>Ingresa un monto para ver el impacto.</div>
                  }
                </div>
              </div>
            </div>

            {/* Métodos de pago */}
            <div>
              <figure className={styles.photoCard}>
                <img src="/history/12.jpg" alt="Bomberos voluntarios combatiendo un incendio forestal con herramientas manuales" loading="lazy" decoding="async" style={{ objectPosition: 'center 35%' }} />
                <figcaption>
                  <strong>Tu aporte en acción</strong>
                  <span>Equipo de protección, herramientas y formación para cada brigada.</span>
                </figcaption>
              </figure>
              <div className="section-tag">Método de pago preferido</div>
              <div className={styles.methodList} role="radiogroup">
                {methods.map(({ num, name, desc }) => (
                  <button key={num} type="button" role="radio" aria-checked={metodo === name}
                    className={`${styles.methodItem} ${metodo === name ? styles.methodItemActive : ''}`}
                    onClick={() => setMetodo(name)}>
                    <span className={styles.methodRadio} />
                    <span className={styles.methodText}>
                      <span className={styles.methodName}>{name}</span>
                      <span className={styles.methodDesc}>{desc}</span>
                    </span>
                    <span className={styles.methodNum}>{num}</span>
                  </button>
                ))}
              </div>
              <div className={styles.infoBox}>
                <strong>¿Cómo funciona?</strong> Al presionar <em>Realizar donación</em> se abre WhatsApp con el monto,
                la frecuencia y el método elegidos. Nuestro equipo te responde con los datos para completar el aporte.
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.mainInner}>
            {/* Formulario de donación en especie */}
            <form className={styles.formCard} onSubmit={donarEspecie} noValidate>
              <div className="section-tag">Donación en especie</div>
              <h2 className={styles.formTitle}>Dona materiales, productos y equipos</h2>
              <p className={styles.formSub}>Completa el formulario y envíalo por WhatsApp. Coordinaremos contigo la entrega.</p>

              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Datos del donante</legend>
                <div className={styles.segment}>
                  {TIPOS_DONANTE.map(t => (
                    <button key={t} type="button"
                      className={`${styles.segmentBtn} ${especie.tipo === t ? styles.segmentBtnActive : ''}`}
                      onClick={() => setE('tipo', t)}>{t}</button>
                  ))}
                </div>
                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Nombre completo *</span>
                    <input className={styles.input} value={especie.nombre} onChange={e => setE('nombre', e.target.value)} placeholder="Ej. María Gutiérrez" />
                    {err('nombre')}
                  </label>
                  {especie.tipo !== 'Persona' && (
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>{especie.tipo} *</span>
                      <input className={styles.input} value={especie.organizacion} onChange={e => setE('organizacion', e.target.value)} placeholder={`Nombre de la ${especie.tipo.toLowerCase()}`} />
                      {err('organizacion')}
                    </label>
                  )}
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Teléfono / WhatsApp *</span>
                    <input className={styles.input} type="tel" inputMode="tel" value={especie.telefono} onChange={e => setE('telefono', e.target.value)} placeholder="Ej. 70012345" />
                    {err('telefono')}
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Correo (opcional)</span>
                    <input className={styles.input} type="email" value={especie.email} onChange={e => setE('email', e.target.value)} placeholder="correo@ejemplo.com" />
                  </label>
                </div>
              </fieldset>

              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>¿Qué deseas donar?</legend>
                <div className={styles.catGrid}>
                  {CATEGORIAS.map(c => {
                    const on = especie.categorias.includes(c.key);
                    return (
                      <button key={c.key} type="button" aria-pressed={on}
                        className={`${styles.catChip} ${on ? styles.catChipActive : ''}`}
                        onClick={() => toggleCategoria(c.key)}>
                        <span>{c.icon}</span>{c.key}
                      </button>
                    );
                  })}
                </div>

                <div className={styles.items}>
                  {especie.items.map((it, i) => (
                    <div key={i} className={styles.itemRow}>
                      <span className={styles.itemNum}>{i + 1}</span>
                      <input className={`${styles.input} ${styles.itemDesc}`} value={it.descripcion}
                        onChange={e => setItem(i, 'descripcion', e.target.value)}
                        placeholder="Artículo (ej. Guantes de cuero talla M)" aria-label={`Artículo ${i + 1}`} />
                      <input className={`${styles.input} ${styles.itemQty}`} value={it.cantidad}
                        onChange={e => setItem(i, 'cantidad', e.target.value)}
                        placeholder="Cantidad" aria-label={`Cantidad del artículo ${i + 1}`} />
                      <select className={`${styles.input} ${styles.itemState}`} value={it.estado}
                        onChange={e => setItem(i, 'estado', e.target.value)} aria-label={`Estado del artículo ${i + 1}`}>
                        {ESTADOS_ITEM.map(s => <option key={s}>{s}</option>)}
                      </select>
                      <button type="button" className={styles.itemDel} onClick={() => removeItem(i)}
                        disabled={especie.items.length === 1} aria-label={`Quitar artículo ${i + 1}`}>✕</button>
                    </div>
                  ))}
                  {err('items')}
                  <button type="button" className={styles.addItem} onClick={addItem}>+ Agregar otro artículo</button>
                </div>
              </fieldset>

              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Entrega</legend>
                <div className={styles.deliveryGrid}>
                  {([['cuartel', '🏠', 'Lo llevo al cuartel', 'Coordinamos día y hora de recepción'], ['recojo', '🚚', 'Necesito que lo recojan', 'Pasamos por tu domicilio o empresa']] as const).map(([k, icon, t, d]) => (
                    <button key={k} type="button"
                      className={`${styles.deliveryOpt} ${especie.entrega === k ? styles.deliveryOptActive : ''}`}
                      onClick={() => setE('entrega', k)}>
                      <span className={styles.deliveryIcon}>{icon}</span>
                      <span><strong>{t}</strong><small>{d}</small></span>
                    </button>
                  ))}
                </div>
                <div className={styles.formGrid}>
                  {especie.entrega === 'recojo' && (
                    <label className={`${styles.field} ${styles.fieldFull}`}>
                      <span className={styles.fieldLabel}>Dirección de recojo *</span>
                      <input className={styles.input} value={especie.direccion} onChange={e => setE('direccion', e.target.value)} placeholder="Calle, número, zona, referencia" />
                      {err('direccion')}
                    </label>
                  )}
                  <label className={`${styles.field} ${styles.fieldFull}`}>
                    <span className={styles.fieldLabel}>Disponibilidad (opcional)</span>
                    <input className={styles.input} value={especie.disponibilidad} onChange={e => setE('disponibilidad', e.target.value)} placeholder="Ej. Lunes a viernes por la tarde" />
                  </label>
                  <label className={`${styles.field} ${styles.fieldFull}`}>
                    <span className={styles.fieldLabel}>Comentarios (opcional)</span>
                    <textarea className={`${styles.input} ${styles.textarea}`} value={especie.comentarios} onChange={e => setE('comentarios', e.target.value)} placeholder="Información adicional, fecha de vencimiento, marca, etc." />
                  </label>
                </div>
              </fieldset>

              {intentado && hayErrores && <div className={styles.formError}>Revisa los campos marcados para continuar.</div>}
              <button type="submit" className={styles.waBtn}>
                <WhatsIcon /> Enviar donación por WhatsApp
              </button>
              <p className={styles.summaryNote}>Se abrirá WhatsApp ({WA_DONACIONES_LABEL}) con tu formulario listo para enviar.</p>
            </form>

            {/* Lateral informativo */}
            <aside className={styles.sideCol}>
              <figure className={styles.photoCard}>
                <img src="/history/13.jpg" alt="Agua embotellada, víveres e insumos reunidos para una operación" loading="lazy" decoding="async" style={{ objectPosition: 'center 60%' }} />
                <figcaption>
                  <strong>Cada insumo cuenta</strong>
                  <span>Agua, víveres y equipo llegan a las brigadas y familias que más lo necesitan.</span>
                </figcaption>
              </figure>
              <div className="section-tag">Lo que más necesitamos</div>
              <div className={styles.needGrid}>
                {NECESIDADES.map(n => (
                  <div key={n.title} className={styles.needCard}>
                    <span className={styles.needIcon}>{n.icon}</span>
                    <div>
                      <div className={styles.needTitle}>{n.title}</div>
                      <div className={styles.needDesc}>{n.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.stepsCard}>
                <div className={styles.stepsTitle}>¿Cómo funciona?</div>
                <ol className={styles.steps}>
                  <li><span>1</span>Completa el formulario con lo que deseas donar.</li>
                  <li><span>2</span>Se abre WhatsApp con el detalle listo; presiona enviar.</li>
                  <li><span>3</span>Te contactamos para coordinar la entrega o el recojo.</li>
                </ol>
              </div>
            </aside>
          </div>
        )}
      </section>

      {/* Galería: en acción gracias a ti */}
      <section className={styles.gallery}>
        <div className={styles.galleryInner}>
          <div className={styles.galleryHead}>
            <div>
              <div className="section-tag">Lo que haces posible</div>
              <h2 className={styles.galleryTitle}>En acción<br />gracias a ti.</h2>
            </div>
            <p className={styles.galleryDesc}>
              Somos bomberos voluntarios. Cada donación sostiene directamente el trabajo
              de nuestras brigadas: equipo, formación y respuesta ante emergencias.
            </p>
          </div>
          <div className={styles.galleryGrid}>
            {GALERIA.map(g => (
              <figure key={g.src} className={styles.galleryItem}>
                <img src={g.src} alt={g.titulo} loading="lazy" decoding="async" />
                <figcaption>
                  <strong>{g.titulo}</strong>
                  <span>{g.desc}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Campañas */}
      <section className={styles.campaigns}>
        <div className={styles.campaignsInner}>
          <div className="section-tag">Campañas activas</div>
          <h2 className={styles.campaignsTitle}>
            Donaciones con<br />destino específico.
          </h2>

          {campaigns.length === 0 && (
            <p style={{ color: 'var(--color-gray)', fontSize: '0.9rem' }}>No hay campañas activas en este momento.</p>
          )}
          <div className={styles.campaignGrid}>
            {campaigns.map(c => {
              const pct = Number(c.meta) > 0 ? Math.min(100, Math.round((Number(c.recaudado) / Number(c.meta)) * 100)) : 0;
              return (
                <div key={c.id} className={styles.campaignCard}>
                  {resolveImg(c.imagen_url) && (
                    <img
                      src={resolveImg(c.imagen_url)!}
                      alt={c.nombre}
                      className={styles.campaignImg}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <span className={styles.campaignBadge}>{c.estado}</span>
                  <div className={styles.campaignName}>{c.nombre}</div>
                  <div className={styles.campaignBar}>
                    <div className={styles.campaignFill} style={{ width: `${pct}%` }} />
                  </div>
                  <div>
                    <div className={styles.campaignMeta}>
                      <span className={styles.campaignRaised}>Bs {fmt(Number(c.recaudado))} recaudado</span>
                      <span className={styles.campaignPct}>{pct}%</span>
                    </div>
                    <div className={styles.campaignGoal}>Meta: Bs {fmt(Number(c.meta))}</div>
                  </div>
                  <button className={styles.campaignBtn} onClick={() => donarCampania(c)}>Donar a esta campaña</button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Llamado final */}
      <section className={styles.finalCta}>
        <div className={styles.finalInner}>
          <img className={styles.finalLogo} src="/yunka_atoq_transparente.png" alt="" loading="lazy" decoding="async" />
          <div className={styles.finalText}>
            <h2>¿Prefieres conversar antes de donar?</h2>
            <p>Escríbenos al {WA_DONACIONES_LABEL} y te contamos en qué se usará tu aporte.</p>
          </div>
          <div className={styles.finalActions}>
            <a className={styles.finalWa}
              href={enlaceWhatsApp('Hola Yunka Atoq, quisiera información para realizar una donación.', WA_DONACIONES)}
              target="_blank" rel="noopener noreferrer">
              <WhatsIcon /> Escribir por WhatsApp
            </a>
            <button className={styles.finalBtn} onClick={() => irADonar(modo)}>Donar ahora</button>
          </div>
        </div>
      </section>
    </main>
  );
}
