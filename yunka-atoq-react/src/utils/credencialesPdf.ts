import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { Credencial } from '../services/credencialesApi';
import { cargarLogoBase64, cargarImagenBase64 } from './documentosPdf';
import { GRADOS } from './rankBadge';
import { especialidadesCredencial, NOMBRE_FUNDACION } from './especialidadesCredencial';

const NAVY:[number,number,number]=[20,33,61],RED:[number,number,number]=[176,30,60];
export const TEXTO_RESPALDO_CREDENCIAL='Se solicita respetuosamente a las autoridades civiles, policiales, militares y de emergencias brindar las facilidades, garantías y colaboración necesarias al portador de la presente credencial para el libre cumplimiento de sus funciones operativas de salvamento, rescate y protección ambiental.';
export const MEDIDA_CREDENCIAL={ancho:54,alto:85.6,sangrado:3};
export const gradoCredencial=(value:string)=>GRADOS.find(g=>g.value===value)?.label??value;
export function fechaCredencial(value:string){return value.slice(0,10).split('-').reverse().join('/');}

export async function prepararFotoCredencial(file:File):Promise<string> {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw new Error('Seleccione una fotografía JPG, PNG o WebP de hasta 10 MB.');
  const bitmap=await createImageBitmap(file);
  try {
    const canvas=document.createElement('canvas');canvas.width=480;canvas.height=600;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('No se pudo preparar la fotografía.');
    const escala=Math.max(480/bitmap.width,600/bitmap.height),w=bitmap.width*escala,h=bitmap.height*escala;
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,480,600);ctx.drawImage(bitmap,(480-w)/2,(600-h)/2,w,h);
    const jpg=canvas.toDataURL('image/jpeg',0.85);if(jpg.length>350000)throw new Error('La foto es demasiado pesada. Use una imagen más sencilla.');return jpg;
  }finally{bitmap.close();}
}

export async function crearCredencialPDF(r:Credencial,urlVerificacion:string,recursos?:{logo:string;especialidades?:Record<string,string>}) {
  const url=new URL(urlVerificacion);
  if(!['http:','https:'].includes(url.protocol)||url.pathname!==r.verificacion_path)throw new Error('Enlace de verificación inválido.');
  const logo=recursos?.logo??await cargarLogoBase64();if(!logo)throw new Error('No se pudo cargar el escudo institucional. Intente nuevamente.');
  const insignias=await Promise.all(especialidadesCredencial(r.datos.especialidad).map(async e=>{
    const imagen=recursos?.especialidades?.[e.slug]??await cargarImagenBase64(e.img);
    if(!imagen)throw new Error(`No se pudo cargar el logo de ${e.name}. Intente nuevamente.`);
    return {...e,imagen};
  }));
  const qr=await QRCode.toDataURL(url.href,{errorCorrectionLevel:'M',margin:4,width:700,color:{dark:'#14213D',light:'#ffffff'}});
  const W=60,H=91.6,B=3,CW=54,CH=85.6,d=r.datos;
  const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:[W,H],compress:true});
  pdf.setProperties({title:`Credencial ${r.codigo}`,subject:'Credencial institucional · frente y reverso · corte 54 × 85,6 mm · sangrado 3 mm',author:NOMBRE_FUNDACION});
  function texto(t:string,x:number,y:number,size:number,color=NAVY,align:'left'|'center'|'right'='left',weight:'normal'|'bold'='normal'){
    pdf.setFont('helvetica',weight);pdf.setFontSize(size);pdf.setTextColor(...color);pdf.text(t,x+B,y+B,{align});
  }
  function ajustar(t:string,x:number,y:number,ancho:number,size:number,lineas:number,alinear:'left'|'center'='center') {
    pdf.setFont('helvetica','bold');let font=size,parts:string[]=[];
    while(font>=4.5){pdf.setFontSize(font);parts=pdf.splitTextToSize(t,ancho);if(parts.length<=lineas)break;font-=0.25;}
    if(parts.length>lineas)throw new Error('Los datos no caben en la credencial. Abrevie la función o especialidad.');
    pdf.setTextColor(...NAVY);pdf.text(parts,x+B,y+B,{align:alinear,lineHeightFactor:1.15});
    return parts.length*font*0.3528*1.15;
  }
  function poligono(puntos:number[][],color:[number,number,number]){
    pdf.setFillColor(...color);const [first,...rest]=puntos;
    pdf.lines(rest.map((p,i)=>[p[0]-(i?rest[i-1][0]:first[0]),p[1]-(i?rest[i-1][1]:first[1])]),first[0]+B,first[1]+B,[1,1],'F',true);
  }
  function imagenFit(datos:string,x:number,y:number,w:number,h:number,id:string){
    const props=pdf.getImageProperties(datos),factor=Math.min(w/props.width,h/props.height);
    const iw=props.width*factor,ih=props.height*factor;
    pdf.addImage(datos,'PNG',B+x+(w-iw)/2,B+y+(h-ih)/2,iw,ih,id,'SLOW');
  }
  function base(){
    pdf.setFillColor(249,250,253);pdf.rect(0,0,W,H,'F');
    // Trama fina y geometría vectorial: permanecen nítidas a escala de imprenta.
    pdf.setDrawColor(230,236,244);pdf.setLineWidth(.1);
    for(let n=-45;n<90;n+=2.8)pdf.line(B+n,B+18,B+n+35,B+79.8);
    pdf.setFillColor(255,255,255);pdf.roundedRect(B+2.7,B+19,48.6,60,2.5,2.5,'F');
    pdf.setFillColor(...NAVY);pdf.rect(0,0,W,B+18.1,'F');
    poligono([[34,-3],[57,-3],[57,18.1],[47,18.1]],[28,50,78]);
    poligono([[-3,15.8],[14,18.1],[57,18.1],[57,19.2],[-3,17]],[176,30,60]);
    texto('Fundación de Voluntarios de Salvamento,',27,4.3,5.1,[236,241,249],'center');
    texto('Rescate y Protección Ambiental',27,7.4,5.1,[236,241,249],'center');
    texto('"YUNKA ATOQ"',27,13.8,10.5,[255,255,255],'center','bold');
    pdf.setFillColor(...NAVY);pdf.rect(0,B+79.8,W,H,'F');
    poligono([[-3,79.8],[36,79.8],[41,88.6],[-3,88.6]],RED);
    texto('Bomberos Voluntarios',27,83.4,7,[255,255,255],'center','bold');
    for(const [i,color] of ([[205,45,46],[245,206,56],[40,140,83]] as [number,number,number][]).entries()){
      pdf.setFillColor(...color);pdf.rect(B+44+i*1.6,B+78.5,1.6,.65,'F');
    }
  }
  function corte(){
    pdf.setDrawColor(110);pdf.setLineWidth(.12);
    for(const x of [B,B+CW])for(const y of [B,B+CH]){
      const dx=x===B?-1:1,dy=y===B?-1:1;
      pdf.line(x+dx*.6,y,x+dx*2.5,y);pdf.line(x,y+dy*.6,x,y+dy*2.5);
    }
    const page=pdf.getCurrentPageInfo().pageContext as unknown as Record<string,unknown>;
    page.trimBox={bottomLeftX:B*72/25.4,bottomLeftY:B*72/25.4,topRightX:(B+CW)*72/25.4,topRightY:(B+CH)*72/25.4};
    page.bleedBox={bottomLeftX:0,bottomLeftY:0,topRightX:W*72/25.4,topRightY:H*72/25.4};
  }
  base();
  imagenFit(logo,4.2,20,15.5,14,'logo');
  if(insignias.length){
    const columnas=Math.min(3,insignias.length),cell=insignias.length>3?8.2:Math.min(13,27/columnas),gap=1.1;
    const inicio=36-(columnas*cell+(columnas-1)*gap)/2;
    insignias.forEach((e,i)=>imagenFit(e.imagen,inicio+(i%columnas)*(cell+gap),insignias.length>3?20+(Math.floor(i/columnas)*(cell+.8)):21.2,cell,cell,`esp-${e.slug}`));
  }else{
    texto('IDENTIFICACIÓN',36,26,5.1,NAVY,'center','bold');texto('INSTITUCIONAL',36,29.2,4.5,NAVY,'center');
  }
  // Retrato asimétrico con marco técnico y panel de identificación.
  pdf.setFillColor(223,230,239);pdf.roundedRect(B+5.1,B+35.9,21.4,26.8,1.7,1.7,'F');
  pdf.setFillColor(255,255,255);pdf.roundedRect(B+4.5,B+35.2,21.4,26.8,1.7,1.7,'F');
  pdf.addImage(d.foto,'JPEG',B+5.5,B+36.2,19.2,24,'foto','FAST');
  pdf.setDrawColor(...RED);pdf.setLineWidth(.55);
  pdf.line(B+4.6,B+39.7,B+4.6,B+35.4);pdf.line(B+4.6,B+35.4,B+8.9,B+35.4);
  pdf.line(B+25.6,B+57.4,B+25.6,B+61.7);pdf.line(B+25.6,B+61.7,B+21.3,B+61.7);
  texto('CÓDIGO / MATRÍCULA',29,40.6,4.1,RED,'left','bold');
  ajustar(d.codigo_voluntario,29,44.4,21,8,1,'left');
  texto('FUNCIÓN',29,48.1,4.1,RED,'left','bold');
  ajustar(d.funcion,29,51.4,21,5.9,3,'left');
  pdf.setFillColor(249,235,240);pdf.roundedRect(B+29,B+58.3,20.5,4.2,1,1,'F');
  texto(`SANGRE  ${d.tipo_sangre}`,39.25,61.1,5.8,RED,'center','bold');
  ajustar(d.nombre.toUpperCase(),27,68,46,8.3,2);
  pdf.setFillColor(236,241,248);pdf.roundedRect(B+4.5,B+74.3,45,4.8,1,1,'F');
  texto('VÁLIDA HASTA',7,77.5,4.4,NAVY,'left','bold');
  texto(fechaCredencial(r.fecha_vencimiento),47,77.7,7.2,RED,'right','bold');
  corte();

  pdf.addPage([W,H],'portrait');base();
  texto('CÓDIGO DEL VOLUNTARIO',4.5,22.5,4.5,RED,'left','bold');
  ajustar(d.codigo_voluntario,4.5,26.5,26,8,1,'left');
  texto('GRADO',40,22.5,4.2,RED,'center','bold');
  ajustar(gradoCredencial(d.grado)||'Voluntario',40,26.2,20,5.7,1);
  pdf.setFillColor(238,242,248);pdf.roundedRect(B+4,B+29,46,16.2,1.3,1.3,'F');
  pdf.setDrawColor(...RED);pdf.setLineWidth(.55);pdf.line(B+4,B+31,B+4,B+43.2);
  pdf.setFont('helvetica','normal');pdf.setFontSize(5.2);pdf.setTextColor(...NAVY);
  const respaldo:string[]=pdf.splitTextToSize(TEXTO_RESPALDO_CREDENCIAL,43.8);
  if(respaldo.length>7)throw new Error('El texto de respaldo no cabe en la credencial.');
  pdf.text(respaldo,B+5.1,B+31.8,{lineHeightFactor:1.16});
  if(d.especialidad?.trim()){
    texto('ESPECIALIDADES',4.5,47.8,4.3,RED,'left','bold');
    ajustar(d.especialidad.trim().replace(/\s*[,;\n]+\s*/g,' · '),4.5,50.6,45,5.3,3,'left');
  }
  pdf.setDrawColor(222,229,239);pdf.setLineWidth(.2);pdf.roundedRect(B+4,B+55.9,23,23,1.3,1.3,'S');
  pdf.addImage(qr,'PNG',B+4.5,B+56.4,22,22,'qr','FAST');
  texto('EMISIÓN',29,58.5,4.2,RED,'left','bold');
  texto(fechaCredencial(r.fecha_emision),29,62.1,6.6,NAVY,'left','bold');
  texto('VENCIMIENTO',29,66.6,4.2,RED,'left','bold');
  texto(fechaCredencial(r.fecha_vencimiento),29,70.2,6.6,NAVY,'left','bold');
  pdf.setFillColor(238,242,248);pdf.roundedRect(B+29,B+73.2,20.5,4.2,1,1,'F');
  texto('DURACIÓN: 1 AÑO',39.25,76,4.7,NAVY,'center','bold');
  corte();return pdf;
}
