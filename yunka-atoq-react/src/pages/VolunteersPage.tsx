// src/pages/VolunteersPage.tsx
import VolunteerActivitiesFeed from "../components/VolunteerActivitiesFeed";
// import Sidebar from "../components/Sidebar"; // Lo añadiremos en el futuro
import styles from "./VolunteersPage.module.css";

function VolunteersPage() {
  return (
    <div className={styles.pageContainer}>
      <div className={styles.mainContent}>
        <VolunteerActivitiesFeed />
      </div>
      <aside className={styles.sidebar}>
        {/* <Sidebar /> */}
        <h2>Información</h2>
        <p>Aquí irá el contenido de la barra lateral, como filtros o noticias.</p>
      </aside>
    </div>
  );
}

export default VolunteersPage;