// src/App.tsx
import { Outlet } from 'react-router-dom';
import Header from './components/Header'; 
function App() {
  return (
    <div>
      <Header /> 
      <main>
        <Outlet /> {/* Aquí se cargará el contenido de cada página */}
      </main>
      {/* El pie de página irá aquí más adelante */}
    </div>
  )
}
export default App;