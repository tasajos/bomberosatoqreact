// src/auth/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/UserContext';

interface ProtectedRouteProps {
  allowedRoles: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Cargando...</div>;
  }

  // --- CORRECCIÓN CLAVE ---
  // Convertimos el rol del usuario a minúsculas antes de comparar
  if (!user || !allowedRoles.includes(user.rol?.toLowerCase() || '')) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}