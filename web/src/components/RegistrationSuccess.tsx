/**
 * Componente que se muestra después de enviar una solicitud de registro exitosamente
 * Proporciona información sobre los próximos pasos
 */

import React from 'react';
import { 
    CheckCircleIcon,
    ClockIcon,
    EnvelopeIcon,
    InformationCircleIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';

interface RegistrationSuccessProps {
    requestId: string;
    userEmail: string;
    estimatedTime?: string;
    onContinue?: () => void;
    onCheckStatus?: () => void;
}

const RegistrationSuccess: React.FC<RegistrationSuccessProps> = ({
    requestId,
    userEmail,
    estimatedTime = '1-3 días hábiles',
    onContinue,
    onCheckStatus
}) => {
    const nextSteps = [
        {
            icon: EnvelopeIcon,
            title: 'Revisión por administrador',
            description: 'Tu solicitud será revisada por un administrador del sistema',
            status: 'pending'
        },
        {
            icon: EnvelopeIcon,
            title: 'Notificación por email',
            description: `Recibirás una notificación en ${userEmail} cuando sea procesada`,
            status: 'pending'
        },
        {
            icon: CheckCircleIcon,
            title: 'Acceso al sistema',
            description: 'Una vez aprobada, podrás iniciar sesión con tu wallet de MetaMask',
            status: 'pending'
        }
    ];

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl p-8">
            {/* Header de éxito */}
            <div className="text-center mb-8">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                    <CheckCircleIcon className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    ¡Solicitud Enviada Exitosamente!
                </h2>
                <p className="text-gray-600">
                    Tu solicitud de registro ha sido recibida y está siendo procesada
                </p>
            </div>

            {/* Información de la solicitud */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                    <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                    <div>
                        <h3 className="text-sm font-medium text-blue-800 mb-1">
                            Detalles de tu solicitud
                        </h3>
                        <div className="text-sm text-blue-700 space-y-1">
                            <p><strong>ID de solicitud:</strong> {requestId}</p>
                            <p><strong>Email de contacto:</strong> {userEmail}</p>
                            <p><strong>Tiempo estimado de procesamiento:</strong> {estimatedTime}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Próximos pasos */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    ¿Qué sucede ahora?
                </h3>
                <div className="space-y-4">
                    {nextSteps.map((step, index) => (
                        <div key={index} className="flex items-start">
                            <div className="flex-shrink-0 mr-4">
                                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100">
                                    <span className="text-sm font-medium text-gray-600">{index + 1}</span>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center mb-1">
                                    <step.icon className="h-4 w-4 text-gray-500 mr-2" />
                                    <h4 className="text-sm font-medium text-gray-900">
                                        {step.title}
                                    </h4>
                                </div>
                                <p className="text-sm text-gray-600">
                                    {step.description}
                                </p>
                            </div>
                            <div className="flex-shrink-0">
                                <ClockIcon className="h-4 w-4 text-yellow-500" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Información importante */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex">
                    <InformationCircleIcon className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-medium text-yellow-800 mb-1">
                            Información importante
                        </h3>
                        <ul className="text-sm text-yellow-700 space-y-1">
                            <li>• Mantén tu wallet de MetaMask segura y accesible</li>
                            <li>• Revisa tu email regularmente (incluyendo spam)</li>
                            <li>• Guarda el ID de solicitud para futuras consultas</li>
                            <li>• Si no recibes respuesta en {estimatedTime}, contacta al administrador</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {onCheckStatus && (
                    <button
                        onClick={onCheckStatus}
                        className="flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <ClockIcon className="h-4 w-4 mr-2" />
                        Verificar Estado
                    </button>
                )}
                
                {onContinue && (
                    <button
                        onClick={onContinue}
                        className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Continuar
                        <ArrowRightIcon className="h-4 w-4 ml-2" />
                    </button>
                )}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-500">
                    Si tienes preguntas sobre tu solicitud, puedes contactar al administrador
                    respondiendo al email de confirmación que recibirás.
                </p>
            </div>
        </div>
    );
};

export default RegistrationSuccess;