// src/layouts/AdminLayout.tsx
import { Outlet } from 'react-router-dom';
import AdminHeader from '../components/admin/AdminHeader';

export default function AdminLayout() {
  return (
    <div>
      <AdminHeader />
      <main>
        <Outlet />
      </main>
      {/* Aquí podría ir un AdminFooter si lo necesitas */}
    </div>
  );
}