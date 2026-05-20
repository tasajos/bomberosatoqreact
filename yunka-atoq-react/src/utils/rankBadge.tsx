import { useId } from 'react';

export const GRADOS = [
  { value: '',                  label: 'Sin grado'           },
  { value: 'postulante',        label: 'Postulante'          },
  { value: 'vol_inicial',       label: 'Vol. Inicial'        },
  { value: 'vol_2do',           label: 'Vol. 2do'            },
  { value: 'vol_1ro',           label: 'Vol. 1ro'            },
  { value: 'vol_especialista',  label: 'Vol. Especialista'   },
  { value: 'tte_2do',           label: 'Tte. 2do'            },
  { value: 'tte_1ro',           label: 'Tte. 1ro'            },
  { value: 'capitan',           label: 'Capitán'             },
  { value: 'cap_director',      label: 'Cap. Director'       },
  { value: 'comodoro',          label: 'Comodoro'            },
  { value: 'comodoro_brigadier',label: 'Comodoro Brigadier'  },
  { value: 'comodoro_comando',  label: 'Comodoro Comando'    },
];

// Valores iguales a los roles de la DB para comparación directa
export const DIRECTIVA = [
  { value: '',                 label: '— Sin cargo en directiva —' },
  { value: 'presidente',       label: 'Presidente'                  },
  { value: 'coordinador',      label: 'Coordinador'                 },
  { value: 'fundador',         label: 'Fundador'                    },
  { value: 'jefe_operaciones', label: 'Jefe de Operaciones'         },
  { value: 'jefe_personal',    label: 'Jefe de Personal'            },
  { value: 'jefe_logistica',   label: 'Jefe de Logística'           },
  { value: 'jefe_marketing',   label: 'Jefe de Marketing'           },
  { value: 'jefe_enlaces',     label: 'Jefe de Enlaces'             },
  { value: 'jefe_finanzas',   label: 'Jefe de Finanzas'            },
  { value: 'admin',            label: 'Administrador'               },
];

function Tree({ cx, cy, s = 1 }: { cx: number; cy: number; s?: number }) {
  const lv: [number,number][] = [[-7,-6],[-4,-9],[-1,-11],[2,-11],[5,-9],[8,-6],[-9,-3],[9,-3],[-5,-1],[5,-1]];
  return (
    <g transform={`translate(${cx},${cy}) scale(${s})`}>
      <line x1="0" y1="-3" x2="0" y2="10" stroke="#1B5E20" strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="0" y1="10" x2="-5" y2="15" stroke="#1B5E20" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="0" y1="10" x2="5" y2="15" stroke="#1B5E20" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="0" y1="10" x2="0" y2="15" stroke="#1B5E20" strokeWidth="1.5" strokeLinecap="round"/>
      {lv.map(([lx,ly],i) => <ellipse key={i} cx={lx} cy={ly} rx="3.2" ry="2.4" fill="#2E7D32"/>)}
    </g>
  );
}

function Axes({ cx, cy }: { cx:number; cy:number }) {
  return (
    <g transform={`translate(${cx},${cy})`}>
      <line x1="-10" y1="-8" x2="10" y2="8" stroke="#4E342E" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="10" y1="-8" x2="-10" y2="8" stroke="#4E342E" strokeWidth="2.5" strokeLinecap="round"/>
      <ellipse cx="-8" cy="-10" rx="4" ry="3" fill="#C62828" transform="rotate(-40,-8,-10)"/>
      <ellipse cx="8" cy="-10" rx="4" ry="3" fill="#C62828" transform="rotate(40,8,-10)"/>
    </g>
  );
}

function Diamond({ cx, cy }: { cx:number; cy:number }) {
  return (
    <g>
      <polygon points={`${cx},${cy-14} ${cx+11},${cy} ${cx},${cy+14} ${cx-11},${cy}`}
        fill="none" stroke="#1A237E" strokeWidth="4"/>
      <polygon points={`${cx},${cy-6} ${cx+5},${cy} ${cx},${cy+6} ${cx-5},${cy}`}
        fill="#FFE800"/>
    </g>
  );
}

export function RankBadgeSVG({ grado, size = 72 }: { grado: string; size?: number }) {
  const uid = useId().replace(/:/g,'').replace(/\./g,'');
  const W = 56; const H = 80;
  const g = grado ?? '';

  const YELLOW = '#FFE800';
  const NAVY   = '#1A237E';
  const GRAY   = '#9E9E9E';

  interface Cfg {
    bg: string; panel?: boolean;
    bStripes?: number; rStripes?: number;
    trees?: [number,number,number?][];
    axes?: boolean; diamond?: boolean;
    // franjas en orden exacto desde abajo: {color, y relativo desde abajo}
    fixedStripes?: { color: string; fromBottom: number }[];
  }

  const cfgs: Record<string,Cfg> = {
    '':                  { bg: GRAY },
    postulante:          { bg: YELLOW },
    vol_inicial:         { bg: YELLOW, bStripes:1 },
    vol_2do:             { bg: YELLOW, bStripes:2 },
    vol_1ro:             { bg: YELLOW, bStripes:3 },
    vol_especialista:    { bg: YELLOW, diamond:true, bStripes:3 },
    tte_2do:             { bg: YELLOW, trees:[[28,31]], bStripes:1 },
    tte_1ro:             { bg: YELLOW, trees:[[28,31]], bStripes:2 },
    // Capitán: amarillo + árbol + azul/roja/azul intercaladas
    capitan: {
      bg: YELLOW,
      trees:[[28,28]],
      fixedStripes: [
        { color: NAVY,    fromBottom: 2  },  // azul inferior
        { color: '#C62828', fromBottom: 12 }, // roja media
        { color: NAVY,    fromBottom: 22  }, // azul superior
      ],
    },
    cap_director: {
      bg: YELLOW,
      trees:[[28,26]],
      axes: true,
      fixedStripes: [
        { color: NAVY, fromBottom: 2  },  // azul inferior
        { color: NAVY, fromBottom: 22 },  // azul superior (ejes quedan entre ambas)
      ],
    },
    comodoro:            { bg: NAVY, panel:true, trees:[[28,28,0.75],[28,52,0.75]] },
    comodoro_brigadier:  { bg: NAVY, panel:true, trees:[[28,28,0.75],[28,52,0.75]], rStripes:1 },
    comodoro_comando: {
      bg: NAVY, panel: true,
      // Escala 0.38 → árbol ocupa ~11px altura (cy-5 a cy+6)
      // Panel y=16 a y=80 (64px útiles)
      // Árbol1: cy=23 → y=18..29
      // Franja:          y=33..38  → fromBottom = 80-33-5 = 42
      // Árbol2: cy=46 → y=41..52
      // Franja:          y=56..61  → fromBottom = 80-56-5 = 19
      // Árbol3: cy=68 → y=63..74
      trees: [[28,23,0.38],[28,46,0.38],[28,68,0.38]],
      fixedStripes: [
        { color: '#C62828', fromBottom: 42 },
        { color: '#C62828', fromBottom: 19 },
      ],
    },
  };

  const c   = cfgs[g] ?? cfgs[''];
  const sC  = c.bg === NAVY ? YELLOW : NAVY;
  const bs  = c.bStripes ?? 0;
  const rs  = c.rStripes ?? 0;

  // Forma charretera: rectángulo con punta triangular arriba
  const SHAPE = `M 3,${H} L 3,30 Q 3,18 28,8 Q 53,18 53,30 L 53,${H} Z`;

  return (
    <svg width={size} height={size*(H/W)} viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
      <defs>
        <clipPath id={`cp${uid}`}><path d={SHAPE}/></clipPath>
        <filter id={`dr${uid}`} x="-25%" y="-15%" width="150%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000" floodOpacity="0.35"/>
        </filter>
      </defs>

      {/* Fondo de la charretera */}
      <path d={SHAPE} fill={c.bg} stroke="rgba(0,0,0,0.25)" strokeWidth="1"
        filter={`url(#dr${uid})`}/>

      {/* Panel interior amarillo (rangos altos) */}
      {c.panel && (
        <rect x="14" y="16" width="28" height={H-12} fill={YELLOW}
          clipPath={`url(#cp${uid})`}/>
      )}

      {/* Franjas en posición fija — se renderizan ANTES que los árboles */}
      {c.fixedStripes?.map((fs,i)=>(
        <rect key={`fs${i}`}
          x={c.panel ? "13" : "2"}
          y={H - fs.fromBottom - 5}
          width={c.panel ? "30" : "52"}
          height="5" fill={fs.color} rx="0.5"
          clipPath={`url(#cp${uid})`}/>
      ))}

      {/* Árboles — encima de las franjas */}
      {c.trees?.map(([cx,cy,s],i)=><Tree key={i} cx={cx} cy={cy} s={s??1}/>)}

      {/* Ejes */}
      {c.axes && <Axes cx={28} cy={g === 'cap_director' ? H-13 : 55}/>}

      {/* Diamante */}
      {c.diamond && <Diamond cx={28} cy={35}/>}

      {/* Franjas rojas */}
      {!c.fixedStripes && Array.from({length:rs}).map((_,i)=>(
        <rect key={`r${i}`}
          x={c.panel?13:2} y={c.panel ? 34+i*16 : H-22-bs*9-i*10}
          width={c.panel?30:52} height="5.5" fill="#C62828" rx="1"
          clipPath={`url(#cp${uid})`}/>
      ))}

      {/* Franjas azules/amarillas base */}
      {!c.fixedStripes && Array.from({length:bs}).map((_,i)=>(
        <rect key={`b${i}`} x="2" y={H-7-i*9} width="52" height="6"
          fill={sC} rx="1" clipPath={`url(#cp${uid})`}/>
      ))}
    </svg>
  );
}
