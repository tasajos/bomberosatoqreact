// src/App.tsx
import { Outlet } from 'react-router-dom';
import Header from './components/Header'; 
import Footer from './components/Footer'; 
import FloatingWhatsAppButton from './components/FloatingWhatsAppButton'; // Importar

function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main style={{ flex: '1' }}>
        <Outlet />
      </main>
      <FloatingWhatsAppButton /> {/* Añadir */}
      <Footer /> {/* Añadir */}
    </div>
  )
}
export default App;