// src/context/UserContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';

interface UserData {
  uid: string;
  email: string | null;
  rol?: string;
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userRef = ref(db, `Atoqweb/usuarios/${firebaseUser.uid}`);
        const unsubscribeDB = onValue(userRef, (snapshot) => {
          const userData = snapshot.val();
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            // --- CORRECCIÓN CLAVE ---
            // Guardamos el rol siempre en minúsculas
            rol: userData?.rol?.toLowerCase() || 'visitante',
          });
          setLoading(false);
        });
        return () => unsubscribeDB();
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a UserProvider');
  }
  return context;
};