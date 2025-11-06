import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ConfigProvider } from './contexts/ConfigContext';
import { AñoProvider } from './contexts/AñoContext';
import { useAuth } from './contexts/AuthContext';

// Componentes
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Archivos from './pages/Archivos';
import Usuarios from './pages/Usuarios';
import Configuracion from './pages/Configuracion';
import MiPerfil from './pages/MiPerfil';

// Estilos
import './index.css';

function App() {
  const RequireAdmin = ({ children }) => {
    const { user } = useAuth();
    if (user?.rol !== 'Administrador') {
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  };

  return (
    <AuthProvider>
      <ConfigProvider>
        <AñoProvider>
          <Router>
            <div className="App">
              <Routes>
                {/* Ruta pública de landing */}
                <Route path="/" element={<Landing />} />
                
                {/* Ruta de login */}
                <Route path="/login" element={<Login />} />
                
                {/* Rutas protegidas */}
                <Route path="/*" element={
                  <>
                    <Navbar />
                    <main className="main-content">
                      <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/mi-perfil" element={<MiPerfil />} />
                        <Route path="/archivos" element={<RequireAdmin><Archivos /></RequireAdmin>} />
                        <Route path="/usuarios" element={<RequireAdmin><Usuarios /></RequireAdmin>} />
                        <Route path="/configuracion" element={<RequireAdmin><Configuracion /></RequireAdmin>} />
                      </Routes>
                    </main>
                  </>
                } />
              </Routes>
            </div>
          </Router>
        </AñoProvider>
      </ConfigProvider>
    </AuthProvider>
  );
}

export default App;
