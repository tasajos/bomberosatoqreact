// src/pages/HistoryPage.tsx
import styles from "./HistoryPage.module.css";

// Aquí defines los hitos de la historia de la fundación
const historyData = [
  {
    year: "2023",
    title: "Nacimiento de una Idea",
    description: "Un grupo de voluntarios con pasión por el servicio se reúne para formar las bases de lo que se convertiría la Fundacion",
    image: "/history/atoq.png", 
  },
  {
    year: "2023",
    title: "Primer Apoyo Oficial",
    description: "Realizamos nuestro primer apoyo exitoso, consolidando al equipo y definiendo nuestro propósito.",
    image: "/history/2.jpg",
  },
  {
    year: "2023",
    title: "Primera Convocatoria",
    description: "Lanzamos la primera convocatoria para postulantes voluntarios",
    image: "/history/3.png",
  },
  {
    year: "30 de Junio 2023",
    title: "Simulacro Incendio Aeropuerto Internacional Jorge Wilstermann. ",
    description: "Participamos como Equipo de Primera Respuesta en el Simulacro del aeropuerto",
    image: "/history/4.jpg",
  },
  {
    year: "1 de Julio 2023",
    title: "Emergencia derrame aceite laguna corani",
    description: "Participamos como Equipo de Primera Respuesta en la emergencia por derrame de aceite en laguna Corani",
    image: "/history/5.jpg",
  },
   {
    year: "5 de Agosto 2023",
    title: "Participacion de apoyo y practicas en espacios confinados Laguna Corani",
    description: "Instruccion y capacitaciond en espacions confinados",
    image: "/history/6.jpg",
  },
  {
    year: "16 de Septiembre 2023",
    title: "Iniciamos la capacitacion y certificacion en el Curso de CPI , S130 , S190",
    description: "nuestros #bomberosvoluntarios en capacitación #conjunta con otras unidades de bomberos voluntarios dieron inicio al curso CPI para posteriormente continuar con S190 y S130",
    image: "/history/7.jpg",
  },
  {
    year: "15 de Noviembre 2023 - La Paz",
    title: "Iniciamos la 1ra Emergencia Nacional en San Buenaventura - La Paz por incendios forestales",
    description: "Mision #Rurrenabaque #SalvemosNuestrosBosques: Bomberos voluntarios luchan contra los incendios en Rurrenabaque y San Buenaventura",
    image: "/history/8.jpg",
  },
  {
    year: "1 de Diciembre 2023 - ",
    title: "Certificacion Curso CPI - S130 - S190",
    description: "Nuestros #bomberosvoluntarios logran terminar el curso s130/s190 de la mano de Fundación Sedes Sapientiae  UNIVERSIDAD CATÓLICA BOLIVIANA",
    image: "/history/9.jpg",
  },
  {
    year: "5 de Mayo 2024",
    title: "Desafio de la Mochila",
    description: "Nuestros bomberos voluntarios participan del desafio de la mochila, prueba fisica",
    image: "/history/10.jpg",
  },
  {
    year: "18 de Julio 2024 - ",
    title: "Combate Incendio Forestal de Magnitud - Parque Tunari",
    description: "El dia de hoy nuestros Bomberos Voluntarios en coordinacion con enfangados, Brigadistas Voluntarios Thasnuq y bomberos voluntarios de La Resistencia  acudieron al incendio en el Parque Tunari originados despues de medio dia, agradecer el apoyo logistico de Tunari sin Fuego",
    image: "/history/11.png",
  },
   {
    year: "12 de Septiembre 2024 - Santa Cruz",
    title: "2da Emergencia Nacional en Rio Blanco - Santa cruz por incendios forestales",
    description: "La fuerza de tarea #conjunta de nuestros bomberos voluntarios, se encuentran combatiendo en #rioblanco #SantaCruz #incendio chiquitania",
    image: "/history/12.jpg",
  },
   {
    year: "20 de Septiembre 2024 - Beni",
    title: "2da Emergencia Nacional en Riberalta - Beni por incendios forestales",
    description: "𝐋𝐚 𝟑𝐫𝐚 𝐏𝐚𝐭𝐫𝐮𝐥𝐥𝐚 𝐝𝐞 𝐁𝐨𝐦𝐛𝐞𝐫𝐨𝐬 𝐕𝐨𝐥𝐮𝐧𝐭𝐚𝐫𝐢𝐨𝐬 𝐘𝐮𝐧𝐤𝐚 𝐀𝐭𝐨𝐪 𝐫𝐮𝐦𝐛𝐨 𝐚𝐥 #𝐁𝐞𝐧𝐢 𝐜𝐨𝐧 𝐢𝐧𝐬𝐮𝐦𝐨𝐬 𝐞𝐬𝐞𝐧𝐜𝐢𝐚𝐥𝐞𝐬",
    image: "/history/13.jpg",
  },
   {
    year: "24 de Septiembre 2024 - Beni",
    title: "2da Emergencia Nacional en Riberalta - Beni por incendios forestales",
    description: "Combate de Incendio Forestal Riberalta",
    image: "/history/14.png",
  },
  {
    year: "27 de Septiembre 2024 - Beni",
    title: "2da Emergencia Nacional en Riberalta - Beni por incendios forestales",
    description: "Distribucion de Insumos a poblaciones afectadas",
    image: "/history/15.jpg",
  },
  {
    year: "18 de Diciembre 2024 ",
    title: "Reconocimiento por las tareas de sofocacion en el Oriente Boliviano",
    description: "Agradecemos profundamente a la Fundación Sedes Sapientiae y a la UCB - Sede Cochabamba por su valioso reconocimiento por las operaciones realizadas en el Oriente Boliviano",
    image: "/history/16.jpg",
  },
  {
    year: "27 de Marzo 2025 ",
    title: "Curso de Seguridad en Incendios Forestales",
    description: "Agradecemos profundamente a la Fundación Sedes Sapientiae y a la UCB - Sede Cochabamba por su valioso reconocimiento por las operaciones realizadas en el Oriente Boliviano",
    image: "/history/17.png",
  },
  {
    year: "18 de Abril 2025 ",
    title: "Plaqueta de Reconocimiento en Viernes Santo",
    description: "Reconocimiento en el Muro de la Voluntad, un símbolo de unidad, sacrificio y compromiso con Cochabamba. Cada ladrillo representa la fuerza de quienes trabajan por el bien común, y estamos orgullosos de ser parte de esta obra inspiradora.",
    image: "/history/18.jpg",
  },
  {
    year: "11 de Julio 2025 ",
    title: "Reconocimiento en la Asamblea Legislativa Plurinacional",
    description: "Queremos celebrar el  #reconocimiento a la institución de Bomberos Voluntarios Yunka Atoq - Bolivia 🇧🇴, quienes fueron honrados por su invaluable labor durante la 2da Convención Nacional de #Voluntariados en Bolivia",
    image: "/history/19.png",
  },
  {
    year: "18 de Julio 2025 ",
    title: "Obtencion Personalidad Juridica",
    description: "La Fundación de Voluntarios de Salvamento, Rescate y Protección Ambiental Yunka Atoq 🧑‍🚒🌱 ya cuenta oficialmente con Personería Jurídica",
    image: "/history/20.png",
  },
];

export default function HistoryPage() {
  return (
    <main className={styles.pageContainer}>
      <div className={styles.heroSection}>
        <h1 className={styles.title}>Nuestra Historia</h1>
        <p className={styles.subtitle}>Un viaje de compromiso, rescate y protección.</p>
      </div>

      <div className={styles.timeline}>
        {historyData.map((item, index) => (
          <div key={index} className={styles.timelineItem}>
            <div className={styles.timelineContent}>
              <span className={styles.year}>{item.year}</span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <img src={item.image} alt={item.title} className={styles.timelineImage} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}