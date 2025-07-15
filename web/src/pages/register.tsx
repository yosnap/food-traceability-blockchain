/**
 * Página de registro para Next.js
 * Ruta: /register
 */

import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import RegistrationForm from '../components/RegistrationForm';
import RegistrationSuccess from '../components/RegistrationSuccess';

const RegisterPage: React.FC = () => {
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [registrationData, setRegistrationData] = useState<{
        requestId: string;
        email: string;
        walletAddress: string;
    } | null>(null);

    /**
     * Manejar éxito en el envío del formulario
     */
    const handleRegistrationSuccess = (requestId: string) => {
        // Obtener datos del localStorage si existen
        if (typeof window !== 'undefined') {
            const formData = localStorage.getItem('registrationFormData');
            if (formData) {
                const parsed = JSON.parse(formData);
                setRegistrationData({
                    requestId,
                    email: parsed.personalInfo?.email || '',
                    walletAddress: parsed.walletAddress || ''
                });
                // Limpiar localStorage
                localStorage.removeItem('registrationFormData');
            } else {
                setRegistrationData({
                    requestId,
                    email: '',
                    walletAddress: ''
                });
            }
        }
        setStep('success');
    };

    /**
     * Verificar estado de solicitud
     */
    const handleCheckStatus = async () => {
        if (!registrationData?.walletAddress) {
            alert('No se pudo obtener la dirección de wallet');
            return;
        }

        try {
            const response = await fetch(`/api/registration/status/${registrationData.walletAddress}`);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.status === 'approved') {
                    alert('¡Su solicitud ha sido aprobada! Ya puede iniciar sesión en el sistema.');
                    window.location.href = '/auth';
                } else if (result.status === 'pending') {
                    alert('Su solicitud está siendo revisada. Le notificaremos por email cuando sea procesada.');
                } else if (result.status === 'rejected') {
                    alert('Su solicitud ha sido rechazada. Contacte al administrador para más información.');
                } else {
                    alert('Su solicitud está siendo procesada.');
                }
            } else {
                alert('Error verificando el estado de la solicitud');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error conectando con el servidor');
        }
    };

    return (
        <>
            <Head>
                <title>Registro - Food Traceability System</title>
                <meta name="description" content="Solicita acceso al sistema de trazabilidad alimentaria" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>

            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
                {/* Header */}
                <header className="bg-white shadow-sm border-b">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center h-16">
                            <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                                <ArrowLeftIcon className="w-5 h-5" />
                                <span>Volver al inicio</span>
                            </Link>
                            
                            <div className="flex items-center space-x-3 ml-8">
                                <img src="/icon-logo.jpeg" alt="Food Traceability Logo" className="w-10 h-10 object-contain" />
                                <span className="text-lg font-semibold text-gray-900">Food Traceability</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="py-8">
                    {step === 'form' && (
                        <RegistrationForm
                            onSubmitSuccess={handleRegistrationSuccess}
                            onCancel={() => window.location.href = '/'}
                        />
                    )}

                    {step === 'success' && registrationData && (
                        <RegistrationSuccess
                            requestId={registrationData.requestId}
                            userEmail={registrationData.email}
                            estimatedTime="1-3 días hábiles"
                            onCheckStatus={handleCheckStatus}
                            onContinue={() => window.location.href = '/'}
                        />
                    )}
                </main>
            </div>
        </>
    );
};

export default RegisterPage;