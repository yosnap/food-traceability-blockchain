/**
 * Formulario de solicitud de registro
 * Captura datos del usuario + wallet de Metamask
 */

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import { 
    UserPlusIcon,
    WalletIcon,
    EnvelopeIcon,
    PhoneIcon,
    BuildingOfficeIcon,
    GlobeAmericasIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface RegistrationFormData {
    walletAddress: string;
    requestedRole: string;
    personalInfo: {
        fullName: string;
        email: string;
        phone: string;
        organization: string;
        address: string;
        country: string;
    };
    businessInfo: {
        companyName: string;
        businessType: string;
        registrationNumber: string;
        description: string;
    };
}

interface RegistrationFormProps {
    onSubmitSuccess?: (requestId: string) => void;
    onCancel?: () => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ 
    onSubmitSuccess, 
    onCancel 
}) => {
    const [currentStep, setCurrentStep] = useState<'wallet' | 'personal' | 'business' | 'review'>('wallet');
    const [walletConnected, setWalletConnected] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [formData, setFormData] = useState<RegistrationFormData>({
        walletAddress: '',
        requestedRole: 'producer',
        personalInfo: {
            fullName: '',
            email: '',
            phone: '',
            organization: '',
            address: '',
            country: 'España'
        },
        businessInfo: {
            companyName: '',
            businessType: '',
            registrationNumber: '',
            description: ''
        }
    });

    const [errors, setErrors] = useState<any>({});

    const roles = [
        { value: 'producer', label: 'Productor', description: 'Granjas, agricultores, ganaderos' },
        { value: 'factory', label: 'Procesador', description: 'Fábricas de procesamiento' },
        { value: 'distributor', label: 'Distribuidor', description: 'Distribuidores, logística' },
        { value: 'retailer', label: 'Minorista', description: 'Supermercados, tiendas' },
        { value: 'consumer', label: 'Consumidor', description: 'Consumidor final' }
    ];

    const businessTypes = [
        'Agricultura',
        'Ganadería',
        'Procesamiento de alimentos',
        'Distribución',
        'Retail/Supermercado',
        'Restaurante',
        'Otro'
    ];

    const countries = [
        'España', 'Francia', 'Italia', 'Portugal', 'Alemania', 
        'Reino Unido', 'Países Bajos', 'Bélgica', 'Otro'
    ];

    /**
     * Conectar wallet de Metamask
     */
    const connectWallet = async (): Promise<void> => {
        try {
            if (!window.ethereum) {
                toast.error('MetaMask no está instalado');
                return;
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            
            if (accounts.length > 0) {
                const walletAddress = accounts[0];
                setFormData(prev => ({
                    ...prev,
                    walletAddress
                }));
                setWalletConnected(true);
                toast.success('Wallet conectada exitosamente');
                console.log('✅ Wallet conectada:', walletAddress);
            }

        } catch (error: any) {
            console.error('❌ Error conectando wallet:', error);
            toast.error('Error conectando MetaMask');
        }
    };

    /**
     * Validar paso actual
     */
    const validateCurrentStep = (): boolean => {
        const newErrors: any = {};

        switch (currentStep) {
            case 'wallet':
                if (!formData.walletAddress) {
                    newErrors.wallet = 'Debe conectar su wallet de MetaMask';
                }
                if (!formData.requestedRole) {
                    newErrors.role = 'Debe seleccionar un rol';
                }
                break;

            case 'personal':
                if (!formData.personalInfo.fullName.trim()) {
                    newErrors.fullName = 'Nombre completo es obligatorio';
                }
                if (!formData.personalInfo.email.trim()) {
                    newErrors.email = 'Email es obligatorio';
                } else if (!/\S+@\S+\.\S+/.test(formData.personalInfo.email)) {
                    newErrors.email = 'Email no es válido';
                }
                if (!formData.personalInfo.organization.trim()) {
                    newErrors.organization = 'Organización es obligatoria';
                }
                break;

            case 'business':
                // Validaciones opcionales para información de empresa
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /**
     * Ir al siguiente paso
     */
    const nextStep = (): void => {
        if (!validateCurrentStep()) return;

        const steps = ['wallet', 'personal', 'business', 'review'];
        const currentIndex = steps.indexOf(currentStep);
        if (currentIndex < steps.length - 1) {
            setCurrentStep(steps[currentIndex + 1] as any);
        }
    };

    /**
     * Ir al paso anterior
     */
    const prevStep = (): void => {
        const steps = ['wallet', 'personal', 'business', 'review'];
        const currentIndex = steps.indexOf(currentStep);
        if (currentIndex > 0) {
            setCurrentStep(steps[currentIndex - 1] as any);
        }
    };

    /**
     * Enviar solicitud de registro
     */
    const submitRegistration = async (): Promise<void> => {
        if (!validateCurrentStep()) return;

        try {
            setIsSubmitting(true);

            // Crear mensaje para firmar
            const message = `Solicitud de registro en Food Traceability System
Wallet: ${formData.walletAddress}
Rol: ${formData.requestedRole}
Nombre: ${formData.personalInfo.fullName}
Email: ${formData.personalInfo.email}
Timestamp: ${Date.now()}`;

            // Firmar mensaje
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const signature = await signer.signMessage(message);

            // Nota: Simular envío exitoso mientras el backend se configura
            console.log('📝 Datos a enviar:', {
                walletAddress: formData.walletAddress,
                requestedRole: formData.requestedRole,
                personalInfo: formData.personalInfo,
                businessInfo: formData.businessInfo,
                signature,
                message
            });

            // Simulación temporal de respuesta exitosa
            // TODO: Reemplazar con llamada real cuando el backend esté configurado
            const simulatedResponse = {
                success: true,
                requestId: `REQ-${Date.now()}-${formData.walletAddress.slice(2, 8)}`,
                message: 'Solicitud enviada exitosamente (SIMULACIÓN)',
                status: 'pending',
                nextSteps: [
                    'Tu solicitud será revisada por un administrador',
                    'Recibirás una notificación por email cuando sea procesada',
                    'Una vez aprobada, podrás iniciar sesión con tu wallet'
                ],
                estimatedProcessingTime: '1-3 días hábiles',
                timestamp: new Date().toISOString()
            };

            // Guardar datos temporalmente en localStorage para la página de éxito
            localStorage.setItem('registrationFormData', JSON.stringify(formData));
            
            // Guardar también la solicitud completa en localStorage para que aparezca en el admin
            const completeRequest = {
                id: simulatedResponse.requestId,
                walletAddress: formData.walletAddress,
                requestedRole: formData.requestedRole,
                personalInfo: formData.personalInfo,
                businessInfo: formData.businessInfo,
                status: 'pending',
                requestedAt: new Date().toISOString(),
                signature,
                messageHash: message
            };
            
            // Obtener solicitudes existentes y añadir la nueva
            const existingRequests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
            existingRequests.push(completeRequest);
            localStorage.setItem('pendingRequests', JSON.stringify(existingRequests));

            // Simular respuesta exitosa
            if (simulatedResponse.success) {
                toast.success('Solicitud enviada exitosamente (SIMULACIÓN)');
                if (onSubmitSuccess) {
                    onSubmitSuccess(simulatedResponse.requestId);
                }
                return;
            }

            // Código original comentado hasta que el backend esté configurado
            /*
            // Enviar solicitud
            const response = await fetch('/api/registration/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    walletAddress: formData.walletAddress,
                    requestedRole: formData.requestedRole,
                    personalInfo: formData.personalInfo,
                    businessInfo: formData.businessInfo,
                    signature,
                    message
                })
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Solicitud enviada exitosamente');
                if (onSubmitSuccess) {
                    onSubmitSuccess(result.requestId);
                }
            } else {
                toast.error(result.message || 'Error enviando solicitud');
            }
            */

        } catch (error: any) {
            console.error('❌ Error enviando solicitud:', error);
            toast.error('Error enviando la solicitud');
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Actualizar datos del formulario
     */
    const updateFormData = (section: keyof RegistrationFormData, field: string, value: string): void => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl p-6">
            {/* Header */}
            <div className="text-center mb-8">
                <UserPlusIcon className="h-12 w-12 mx-auto text-blue-600 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900">Solicitud de Registro</h2>
                <p className="text-gray-600 mt-2">Complete su información para solicitar acceso al sistema</p>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
                <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-500">
                        Paso {
                            currentStep === 'wallet' ? 1 : 
                            currentStep === 'personal' ? 2 : 
                            currentStep === 'business' ? 3 : 4
                        } de 4
                    </span>
                    <span className="text-sm text-gray-500">
                        {currentStep === 'wallet' ? 'Wallet y Rol' : 
                         currentStep === 'personal' ? 'Información Personal' : 
                         currentStep === 'business' ? 'Información de Empresa' : 'Revisión'}
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                            width: `${
                                currentStep === 'wallet' ? 25 : 
                                currentStep === 'personal' ? 50 : 
                                currentStep === 'business' ? 75 : 100
                            }%` 
                        }}
                    />
                </div>
            </div>

            {/* Paso 1: Wallet y Rol */}
            {currentStep === 'wallet' && (
                <div className="space-y-6">
                    {/* Conectar Wallet */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <WalletIcon className="h-5 w-5 inline mr-2" />
                            Wallet de MetaMask
                        </label>
                        <div className="flex space-x-3">
                            <input
                                type="text"
                                value={formData.walletAddress}
                                placeholder="Conecte su wallet para obtener la dirección"
                                readOnly
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                            />
                            <button
                                onClick={connectWallet}
                                className={`px-4 py-2 rounded-md font-medium ${
                                    walletConnected
                                        ? 'bg-green-100 text-green-800 border border-green-200'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                                disabled={walletConnected}
                            >
                                {walletConnected ? (
                                    <>
                                        <CheckCircleIcon className="h-4 w-4 inline mr-1" />
                                        Conectada
                                    </>
                                ) : (
                                    'Conectar'
                                )}
                            </button>
                        </div>
                        {errors.wallet && (
                            <p className="mt-1 text-sm text-red-600">{errors.wallet}</p>
                        )}
                    </div>

                    {/* Seleccionar Rol */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Rol Solicitado
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {roles.map((role) => (
                                <div
                                    key={role.value}
                                    className={`p-3 border rounded-md cursor-pointer transition-all ${
                                        formData.requestedRole === role.value
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                    onClick={() => setFormData(prev => ({ ...prev, requestedRole: role.value }))}
                                >
                                    <div className="font-medium">{role.label}</div>
                                    <div className="text-sm text-gray-500">{role.description}</div>
                                </div>
                            ))}
                        </div>
                        {errors.role && (
                            <p className="mt-1 text-sm text-red-600">{errors.role}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Paso 2: Información Personal */}
            {currentStep === 'personal' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre Completo *
                            </label>
                            <input
                                type="text"
                                value={formData.personalInfo.fullName}
                                onChange={(e) => updateFormData('personalInfo', 'fullName', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Su nombre completo"
                            />
                            {errors.fullName && (
                                <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <EnvelopeIcon className="h-4 w-4 inline mr-1" />
                                Email *
                            </label>
                            <input
                                type="email"
                                value={formData.personalInfo.email}
                                onChange={(e) => updateFormData('personalInfo', 'email', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="su@email.com"
                            />
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <PhoneIcon className="h-4 w-4 inline mr-1" />
                                Teléfono
                            </label>
                            <input
                                type="tel"
                                value={formData.personalInfo.phone}
                                onChange={(e) => updateFormData('personalInfo', 'phone', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="+34 600 000 000"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <BuildingOfficeIcon className="h-4 w-4 inline mr-1" />
                                Organización *
                            </label>
                            <input
                                type="text"
                                value={formData.personalInfo.organization}
                                onChange={(e) => updateFormData('personalInfo', 'organization', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Nombre de su empresa/organización"
                            />
                            {errors.organization && (
                                <p className="mt-1 text-sm text-red-600">{errors.organization}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Dirección
                        </label>
                        <input
                            type="text"
                            value={formData.personalInfo.address}
                            onChange={(e) => updateFormData('personalInfo', 'address', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Dirección completa"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <GlobeAmericasIcon className="h-4 w-4 inline mr-1" />
                            País
                        </label>
                        <select
                            value={formData.personalInfo.country}
                            onChange={(e) => updateFormData('personalInfo', 'country', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {countries.map(country => (
                                <option key={country} value={country}>{country}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* Paso 3: Información de Empresa */}
            {currentStep === 'business' && (
                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-md mb-4">
                        <p className="text-sm text-blue-800">
                            <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
                            Esta información es opcional pero ayuda a verificar su solicitud
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre de la Empresa
                            </label>
                            <input
                                type="text"
                                value={formData.businessInfo.companyName}
                                onChange={(e) => updateFormData('businessInfo', 'companyName', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Nombre legal de la empresa"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tipo de Empresa
                            </label>
                            <select
                                value={formData.businessInfo.businessType}
                                onChange={(e) => updateFormData('businessInfo', 'businessType', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Seleccione tipo</option>
                                {businessTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Número de Registro
                        </label>
                        <input
                            type="text"
                            value={formData.businessInfo.registrationNumber}
                            onChange={(e) => updateFormData('businessInfo', 'registrationNumber', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="CIF, NIF, número de registro"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Descripción del Negocio
                        </label>
                        <textarea
                            value={formData.businessInfo.description}
                            onChange={(e) => updateFormData('businessInfo', 'description', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Describa brevemente su actividad empresarial"
                        />
                    </div>
                </div>
            )}

            {/* Paso 4: Revisión */}
            {currentStep === 'review' && (
                <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-md">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Revisar Solicitud</h3>
                        
                        <div className="space-y-3">
                            <div>
                                <span className="font-medium">Wallet:</span> {formData.walletAddress}
                            </div>
                            <div>
                                <span className="font-medium">Rol:</span> {roles.find(r => r.value === formData.requestedRole)?.label}
                            </div>
                            <div>
                                <span className="font-medium">Nombre:</span> {formData.personalInfo.fullName}
                            </div>
                            <div>
                                <span className="font-medium">Email:</span> {formData.personalInfo.email}
                            </div>
                            <div>
                                <span className="font-medium">Organización:</span> {formData.personalInfo.organization}
                            </div>
                            {formData.businessInfo.companyName && (
                                <div>
                                    <span className="font-medium">Empresa:</span> {formData.businessInfo.companyName}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-md">
                        <p className="text-sm text-yellow-800">
                            <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
                            Su solicitud será revisada por un administrador. Recibirá una notificación por email cuando sea procesada.
                        </p>
                    </div>
                </div>
            )}

            {/* Botones de Navegación */}
            <div className="flex justify-between mt-8">
                <button
                    onClick={currentStep === 'wallet' ? onCancel : prevStep}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                    {currentStep === 'wallet' ? 'Cancelar' : 'Anterior'}
                </button>

                <button
                    onClick={currentStep === 'review' ? submitRegistration : nextStep}
                    disabled={isSubmitting || (currentStep === 'wallet' && !walletConnected)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                    {isSubmitting ? 'Enviando...' : 
                     currentStep === 'review' ? 'Enviar Solicitud' : 'Siguiente'}
                </button>
            </div>
        </div>
    );
};

export default RegistrationForm;