/**
 * Aplicación principal con rutas configuradas
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Importar páginas
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';

// Componente para rutas protegidas (opcional)
interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
    // Aquí podrías agregar lógica de verificación de autenticación
    // Por ahora, simplemente renderiza el componente hijo
    return <>{children}</>;
};

const App: React.FC = () => {
    return (
        <Router>
            <div className="App">
                {/* Configuración global de notificaciones */}
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: '#363636',
                            color: '#fff',
                        },
                        success: {
                            duration: 3000,
                            iconTheme: {
                                primary: '#4ade80',
                                secondary: '#fff',
                            },
                        },
                        error: {
                            duration: 5000,
                            iconTheme: {
                                primary: '#ef4444',
                                secondary: '#fff',
                            },
                        },
                    }}
                />

                {/* Rutas de la aplicación */}
                <Routes>
                    {/* Página principal */}
                    <Route path="/" element={<HomePage />} />
                    
                    {/* Registro de usuarios */}
                    <Route path="/register" element={<RegisterPage />} />
                    
                    {/* Dashboard de usuario */}
                    <Route 
                        path="/dashboard" 
                        element={
                            <ProtectedRoute>
                                <UserDashboard />
                            </ProtectedRoute>
                        } 
                    />
                    
                    {/* Panel de administración */}
                    <Route 
                        path="/admin" 
                        element={
                            <ProtectedRoute requireAdmin={true}>
                                <AdminDashboard />
                            </ProtectedRoute>
                        } 
                    />
                    
                    {/* Ruta de inicio de sesión (redirige al dashboard) */}
                    <Route path="/login" element={<Navigate to="/dashboard" replace />} />
                    
                    {/* Ruta catch-all para 404 */}
                    <Route 
                        path="*" 
                        element={
                            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                                <div className="text-center">
                                    <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                                    <p className="text-gray-600 mb-6">Página no encontrada</p>
                                    <button
                                        onClick={() => window.location.href = '/'}
                                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                                    >
                                        Ir al Inicio
                                    </button>
                                </div>
                            </div>
                        } 
                    />
                </Routes>
            </div>
        </Router>
    );
};

export default App;