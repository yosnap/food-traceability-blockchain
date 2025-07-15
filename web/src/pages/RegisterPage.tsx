/**
 * Página principal para registro de usuarios
 * Maneja el flujo completo desde solicitud hasta confirmación
 */

import React, { useState } from 'react';
import RegistrationForm from '../components/RegistrationForm';
import RegistrationSuccess from '../components/RegistrationSuccess';

const RegisterPage: React.FC = () => {
    const [step, setStep] = useState<'form' | 'success' | 'check-status'>('form');
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
        setStep('success');
    };

    /**
     * Verificar estado de solicitud
     */
    const handleCheckStatus = async () => {
        if (!registrationData?.walletAddress) {
            alert('No se encontró información de la solicitud');
            return;
        }

        try {
            const response = await fetch(`/api/registration/status/${registrationData.walletAddress}`);
            const data = await response.json();

            if (data.success) {
                if (data.status === 'approved') {
                    alert('¡Tu solicitud ha sido aprobada! Ya puedes iniciar sesión.');
                    // Redirigir al login
                    window.location.href = '/login';
                } else if (data.status === 'not_found') {
                    alert('Tu solicitud está pendiente de revisión por el administrador.');
                } else {
                    alert(`Estado de tu solicitud: ${data.status}`);
                }
            } else {
                alert('Error verificando el estado de la solicitud');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error conectando con el servidor');
        }
    };

    /**
     * Volver al formulario
     */
    const handleBackToForm = () => {
        setStep('form');
        setRegistrationData(null);
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
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
        </div>
    );
};

export default RegisterPage;