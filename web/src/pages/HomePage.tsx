/**
 * Página principal con navegación entre registro, admin y usuario
 */

import React from 'react';
import { 
    UserPlusIcon,
    CogIcon,
    UserIcon,
    QrCodeIcon,
    ShieldCheckIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';

const HomePage: React.FC = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header */}
            <div className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center space-x-3">
                            <div className="bg-blue-600 rounded-lg p-2">
                                <QrCodeIcon className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Food Traceability System
                                </h1>
                                <p className="text-gray-600">Blockchain para trazabilidad alimentaria</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
                        Trazabilidad
                        <span className="text-blue-600"> Alimentaria</span>
                    </h1>
                    <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-500">
                        Sistema blockchain para rastrear productos alimentarios desde la granja 
                        hasta el consumidor final, garantizando transparencia y seguridad.
                    </p>
                </div>

                {/* Action Cards */}
                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Registro de Usuario */}
                    <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-lg mx-auto mb-6">
                            <UserPlusIcon className="h-8 w-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 text-center mb-4">
                            Solicitar Registro
                        </h3>
                        <p className="text-gray-600 text-center mb-6">
                            Únete al sistema como Productor, Procesador, Minorista o Consumidor. 
                            Solicita acceso y espera la aprobación del administrador.
                        </p>
                        <button
                            onClick={() => window.location.href = '/register'}
                            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center"
                        >
                            Registrarse
                            <ArrowRightIcon className="h-4 w-4 ml-2" />
                        </button>
                        <div className="mt-4 text-sm text-gray-500 text-center">
                            <p><strong>Roles disponibles:</strong></p>
                            <p>Productor • Procesador • Minorista • Consumidor</p>
                        </div>
                    </div>

                    {/* Acceso de Usuario */}
                    <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-lg mx-auto mb-6">
                            <UserIcon className="h-8 w-8 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 text-center mb-4">
                            Acceso de Usuario
                        </h3>
                        <p className="text-gray-600 text-center mb-6">
                            Si ya tienes una cuenta aprobada, conecta tu wallet de MetaMask 
                            para acceder a tu dashboard y realizar operaciones.
                        </p>
                        <button
                            onClick={() => window.location.href = '/dashboard'}
                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center"
                        >
                            Iniciar Sesión
                            <ArrowRightIcon className="h-4 w-4 ml-2" />
                        </button>
                        <div className="mt-4 text-sm text-gray-500 text-center">
                            <p><strong>Requisitos:</strong></p>
                            <p>MetaMask • Cuenta Aprobada</p>
                        </div>
                    </div>

                    {/* Panel de Administración */}
                    <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-lg mx-auto mb-6">
                            <CogIcon className="h-8 w-8 text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 text-center mb-4">
                            Panel de Admin
                        </h3>
                        <p className="text-gray-600 text-center mb-6">
                            Acceso exclusivo para el administrador principal. 
                            Gestiona solicitudes de registro y administra usuarios del sistema.
                        </p>
                        <button
                            onClick={() => window.location.href = '/admin'}
                            className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 flex items-center justify-center"
                        >
                            Panel de Admin
                            <ArrowRightIcon className="h-4 w-4 ml-2" />
                        </button>
                        <div className="mt-4 text-sm text-gray-500 text-center">
                            <p><strong>Wallet requerida:</strong></p>
                            <p className="font-mono text-xs">0xc573...29f8d</p>
                        </div>
                    </div>
                </div>

                {/* Features Section */}
                <div className="mt-20">
                    <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
                        Características del Sistema
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="text-center">
                            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4">
                                <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Seguridad Blockchain
                            </h3>
                            <p className="text-gray-600 text-sm">
                                Datos inmutables y verificables en Hyperledger Fabric
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-4">
                                <QrCodeIcon className="h-6 w-6 text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Códigos QR
                            </h3>
                            <p className="text-gray-600 text-sm">
                                Trazabilidad completa escaneando códigos QR
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-4">
                                <UserIcon className="h-6 w-6 text-purple-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Múltiples Roles
                            </h3>
                            <p className="text-gray-600 text-sm">
                                Productores, procesadores, minoristas y consumidores
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg mx-auto mb-4">
                                <CogIcon className="h-6 w-6 text-yellow-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Gestión Certificada
                            </h3>
                            <p className="text-gray-600 text-sm">
                                Certificados X.509 para firmas digitales
                            </p>
                        </div>
                    </div>
                </div>

                {/* Process Flow */}
                <div className="mt-20">
                    <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
                        ¿Cómo Funciona?
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="text-center">
                            <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                                1
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">Solicitar Registro</h3>
                            <p className="text-gray-600 text-sm">
                                Completa el formulario con tu información y conecta MetaMask
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                                2
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">Aprobación Admin</h3>
                            <p className="text-gray-600 text-sm">
                                El administrador revisa y aprueba tu solicitud
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                                3
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">Acceso al Sistema</h3>
                            <p className="text-gray-600 text-sm">
                                Inicia sesión con MetaMask y accede a tu dashboard
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                                4
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">Operaciones</h3>
                            <p className="text-gray-600 text-sm">
                                Realiza operaciones según tu rol en la cadena
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-white border-t">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center text-gray-500 text-sm">
                        <p>© 2024 Food Traceability System - Powered by Hyperledger Fabric & MetaMask</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;