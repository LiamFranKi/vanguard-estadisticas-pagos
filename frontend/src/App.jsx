import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ConfigProvider } from './contexts/ConfigContext';
import { AñoProvider } from './contexts/AñoContext';

// Componentes
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Estadisticas from './pages/Estadisticas';
import Archivos from './pages/Archivos';
import Alumnos from './pages/Alumnos';
import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';

// Estilos
import './index.css';

function App() {
  return (
    <AuthProvider>
      <ConfigProvider>
        <AñoProvider>
          <Router>
          <div className="App">
            <Routes>
              {/* Ruta de login */}
              <Route path="/login" element={<Login />} />
              
              {/* Rutas protegidas */}
              <Route path="/*" element={
                <>
                  <Navbar />
                  <main className="main-content">
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/estadisticas" element={<Estadisticas />} />
                      <Route path="/archivos" element={<Archivos />} />
                      <Route path="/alumnos" element={<Alumnos />} />
                      <Route path="/reportes" element={<Reportes />} />
                      <Route path="/configuracion" element={<Configuracion />} />
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
