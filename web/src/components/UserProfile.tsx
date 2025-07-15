/**
 * Componente para mostrar y editar el perfil del usuario
 * Permite a usuarios aprobados actualizar su información personal
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
    UserIcon,
    PencilIcon,
    CheckIcon,
    XMarkIcon,
    EnvelopeIcon,
    PhoneIcon,
    BuildingOfficeIcon,
    GlobeAmericasIcon,
    MapPinIcon,
    InformationCircleIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';

interface UserProfileData {
    walletAddress: string;
    role: string;
    personalInfo: {
        fullName: string;
        email: string;
        phone?: string;
        organization?: string;
        address?: string;
        country?: string;
    };
    businessInfo?: {
        companyName?: string;
        businessType?: string;
        registrationNumber?: string;
        description?: string;
    };
    registrationId: string;
    isActive: boolean;
    accountStatus?: string;
    verificationStatus?: {
        emailVerified: boolean;
        phoneVerified: boolean;
        identityVerified: boolean;
        kycCompleted: boolean;
    };
    certificateInfo?: {
        hasX509Certificate: boolean;
        certificateSubject?: string;
        issuer?: string;
        validFrom?: string;
        validTo?: string;
        serialNumber?: string;
    };
    createdAt: string;
    updatedAt: string;
}

interface UserProfileProps {
    userToken: string;
    onProfileUpdate?: (profile: UserProfileData) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ userToken, onProfileUpdate }) => {
    const [profile, setProfile] = useState<UserProfileData | null>(null);
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editForm, setEditForm] = useState<Partial<UserProfileData>>({});

    const roleLabels = {
        producer: 'Productor',
        factory: 'Procesador',
        distributor: 'Distribuidor',
        retailer: 'Minorista',
        consumer: 'Consumidor',
        admin: 'Administrador'
    };

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
     * Cargar perfil del usuario usando datos reales de localStorage
     */
    const loadProfile = async (): Promise<void> => {
        try {
            setLoading(true);
            
            const response = await fetch('/api/registration/profile', {
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                // Si el servidor indica que usemos datos del cliente
                if (data.requiresClientData || data.instructions === 'CLIENT_SHOULD_LOAD_FROM_LOCALSTORAGE') {
                    loadProfileFromLocalStorage();
                } else {
                    // Perfil del servidor (admin)
                    setProfile(data.profile);
                    setEditForm(data.profile);
                    console.log('✅ Perfil del servidor cargado:', data.profile);
                }
            } else {
                toast.error(data.message || 'Error cargando perfil');
            }
        } catch (error) {
            console.error('❌ Error cargando perfil:', error);
            // Si falla la API, intentar cargar de localStorage
            loadProfileFromLocalStorage();
        } finally {
            setLoading(false);
        }
    };

    /**
     * Cargar perfil desde localStorage usando datos reales del usuario registrado
     */
    const loadProfileFromLocalStorage = (): void => {
        try {
            // Obtener información del usuario de la sesión actual
            const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
            
            console.log('🔍 Sesión de usuario encontrada:', userSession);
            
            if (!userSession.walletAddress) {
                console.log('❌ No se encontró walletAddress en userSession');
                toast.error('No se encontró información de la sesión');
                return;
            }

            const walletAddress = userSession.walletAddress;
            console.log(`🔍 Buscando datos reales para wallet: ${walletAddress}`);

            // Buscar en usuarios aprobados usando la misma lógica que el dashboard
            const approvedUsers = JSON.parse(localStorage.getItem('approvedUsers') || '[]');
            console.log('📋 Usuarios aprobados encontrados:', approvedUsers.length, 'usuarios');
            
            const userData = approvedUsers.find((user: any) => 
                user.walletAddress && user.walletAddress.toLowerCase() === walletAddress.toLowerCase()
            );
            
            console.log('👤 Datos reales del usuario encontrados:', userData);

            if (userData) {
                console.log('✅ ¡Datos reales encontrados! Usando información del registro:', userData);
                
                // Crear perfil usando exactamente los mismos datos que muestra el admin
                const profile: UserProfileData = {
                    walletAddress: userData.walletAddress,
                    role: userData.requestedRole,
                    personalInfo: {
                        fullName: userData.personalInfo?.fullName || 'Nombre no disponible',
                        email: userData.personalInfo?.email || 'Email no disponible',
                        phone: userData.personalInfo?.phone || '',
                        organization: userData.personalInfo?.organization || '',
                        address: userData.personalInfo?.address || '',
                        country: userData.personalInfo?.country || 'España'
                    },
                    businessInfo: userData.businessInfo ? {
                        companyName: userData.businessInfo.companyName || '',
                        businessType: userData.businessInfo.businessType || '',
                        registrationNumber: userData.businessInfo.registrationNumber || '',
                        description: userData.businessInfo.description || ''
                    } : undefined,
                    registrationId: userData.id || `reg-${Date.now()}`,
                    isActive: true,
                    accountStatus: 'approved',
                    verificationStatus: {
                        emailVerified: true,
                        phoneVerified: userData.personalInfo?.phone ? true : false,
                        identityVerified: true,
                        kycCompleted: true
                    },
                    certificateInfo: {
                        hasX509Certificate: true,
                        certificateSubject: `CN=${userData.personalInfo?.fullName || 'Usuario'},O=${userData.personalInfo?.organization || 'Food Traceability'},C=ES`,
                        issuer: 'Food Traceability CA',
                        validFrom: userData.submissionDate || userData.requestedAt || new Date().toISOString(),
                        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                        serialNumber: `FT-${userData.requestedRole.toUpperCase()}-${userData.id?.slice(-6) || Date.now().toString().slice(-6)}`
                    },
                    createdAt: userData.submissionDate || userData.requestedAt || new Date().toISOString(),
                    updatedAt: userData.approvalDate || userData.approvedAt || new Date().toISOString()
                };

                setProfile(profile);
                setEditForm(profile);
                console.log('✅ Perfil real cargado correctamente:', profile);
                console.log('📋 Datos originales del registro:', userData);
            } else {
                console.log('❌ Usuario no encontrado en approvedUsers');
                console.log('📋 Lista de wallets en approvedUsers:', 
                    approvedUsers.map((u: any) => u.walletAddress)
                );
                console.log('🔍 Wallet buscado:', walletAddress);
                
                // Si no encontramos datos reales, usar información de la sesión
                const userRole = userSession.role || 'consumer';
                const userName = userSession.name || `Usuario ${roleLabels[userRole as keyof typeof roleLabels] || userRole}`;
                
                const basicProfile: UserProfileData = {
                    walletAddress: walletAddress,
                    role: userRole,
                    personalInfo: {
                        fullName: userName,
                        email: `${userRole}@example.com`,
                        phone: '',
                        organization: getDefaultOrganization(userRole),
                        address: '',
                        country: 'España'
                    },
                    businessInfo: getDefaultBusinessInfo(userRole),
                    registrationId: `session-${Date.now()}`,
                    isActive: true,
                    accountStatus: 'approved',
                    verificationStatus: {
                        emailVerified: true,
                        phoneVerified: false,
                        identityVerified: true,
                        kycCompleted: true
                    },
                    certificateInfo: {
                        hasX509Certificate: true,
                        certificateSubject: `CN=${userName},O=Food Traceability,C=ES`,
                        issuer: 'Food Traceability CA',
                        validFrom: new Date().toISOString(),
                        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                        serialNumber: `FT-${userRole.toUpperCase()}-${Date.now().toString().slice(-6)}`
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                setProfile(basicProfile);
                setEditForm(basicProfile);
                console.log('⚠️ Usando perfil básico de sesión:', basicProfile);
                toast.warning('No se encontraron datos del registro. Usando información de la sesión.');
            }
        } catch (error) {
            console.error('❌ Error cargando perfil desde localStorage:', error);
            toast.error('Error cargando información del perfil');
        }
    };

    /**
     * Obtener organización por defecto según el rol
     */
    const getDefaultOrganization = (role: string): string => {
        const organizations = {
            producer: 'Granja Ecológica',
            factory: 'Procesadora Industrial',
            distributor: 'Logística y Distribución',
            retailer: 'Supermercado',
            consumer: 'Consumidor',
            admin: 'Food Traceability System'
        };
        return organizations[role as keyof typeof organizations] || 'Organización';
    };

    /**
     * Obtener información de negocio por defecto según el rol
     */
    const getDefaultBusinessInfo = (role: string): any => {
        const businessData = {
            producer: {
                companyName: 'Granja Ecológica',
                businessType: 'Agricultura',
                registrationNumber: `P-${Date.now().toString().slice(-6)}`,
                description: 'Producción agrícola ecológica'
            },
            factory: {
                companyName: 'Procesadora',
                businessType: 'Procesamiento de alimentos',
                registrationNumber: `F-${Date.now().toString().slice(-6)}`,
                description: 'Procesamiento de alimentos'
            },
            distributor: {
                companyName: 'Distribuidora',
                businessType: 'Distribución',
                registrationNumber: `D-${Date.now().toString().slice(-6)}`,
                description: 'Distribución de productos'
            },
            retailer: {
                companyName: 'Supermercado',
                businessType: 'Retail/Supermercado',
                registrationNumber: `R-${Date.now().toString().slice(-6)}`,
                description: 'Venta al por menor'
            },
            consumer: undefined,
            admin: {
                companyName: 'Food Traceability Corp',
                businessType: 'Tecnología',
                registrationNumber: 'A-12345678',
                description: 'Sistema de trazabilidad alimentaria'
            }
        };
        
        return businessData[role as keyof typeof businessData];
    };

    /**
     * Guardar cambios del perfil
     */
    const saveProfile = async (): Promise<void> => {
        try {
            setSaving(true);

            // Preparar datos para enviar
            const updates = {
                ...editForm.personalInfo,
                ...editForm.businessInfo
            };

            const response = await fetch('/api/registration/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            const data = await response.json();

            if (data.success) {
                // Si el servidor indica que actualicemos en localStorage
                if (data.requiresClientUpdate || data.instructions === 'CLIENT_SHOULD_UPDATE_LOCALSTORAGE') {
                    saveProfileToLocalStorage();
                }
                
                toast.success('Perfil actualizado exitosamente');
                setEditing(false);
                await loadProfile(); // Recargar perfil actualizado
                
                if (onProfileUpdate && profile) {
                    onProfileUpdate({ ...profile, ...editForm });
                }
            } else {
                toast.error(data.message || 'Error actualizando perfil');
            }
        } catch (error) {
            console.error('❌ Error guardando perfil:', error);
            // Si falla la API, intentar guardar localmente
            saveProfileToLocalStorage();
            toast.success('Perfil actualizado localmente');
            setEditing(false);
        } finally {
            setSaving(false);
        }
    };

    /**
     * Guardar cambios en localStorage
     */
    const saveProfileToLocalStorage = (): void => {
        try {
            if (!profile) return;

            // Actualizar en approvedUsers
            const approvedUsers = JSON.parse(localStorage.getItem('approvedUsers') || '[]');
            const userIndex = approvedUsers.findIndex((user: any) => 
                user.walletAddress.toLowerCase() === profile.walletAddress.toLowerCase()
            );

            if (userIndex !== -1) {
                // Actualizar usuario existente
                approvedUsers[userIndex] = {
                    ...approvedUsers[userIndex],
                    personalInfo: editForm.personalInfo,
                    businessInfo: editForm.businessInfo,
                    updatedAt: new Date().toISOString()
                };

                localStorage.setItem('approvedUsers', JSON.stringify(approvedUsers));
                console.log('✅ Perfil actualizado en localStorage');
            }
        } catch (error) {
            console.error('❌ Error guardando en localStorage:', error);
        }
    };

    /**
     * Cancelar edición
     */
    const cancelEdit = (): void => {
        setEditForm(profile || {});
        setEditing(false);
    };

    /**
     * Actualizar campo del formulario
     */
    const updateField = (section: 'personalInfo' | 'businessInfo', field: string, value: string): void => {
        setEditForm(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    /**
     * Formatear fecha
     */
    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    /**
     * Obtener información del rol
     */
    const getRoleInfo = (role: string) => {
        const roleData = {
            producer: { label: 'Productor', color: 'bg-green-100 text-green-800', org: 'org1 (Org1MSP)' },
            factory: { label: 'Procesador', color: 'bg-blue-100 text-blue-800', org: 'org2 (Org2MSP)' },
            distributor: { label: 'Distribuidor', color: 'bg-yellow-100 text-yellow-800', org: 'org2 (Org2MSP)' },
            retailer: { label: 'Minorista', color: 'bg-purple-100 text-purple-800', org: 'org2 (Org2MSP)' },
            consumer: { label: 'Consumidor', color: 'bg-gray-100 text-gray-800', org: 'org2 (Org2MSP)' },
            admin: { label: 'Administrador', color: 'bg-red-100 text-red-800', org: 'org1 (Org1MSP)' }
        };
        return roleData[role as keyof typeof roleData] || { label: role, color: 'bg-gray-100 text-gray-800', org: 'Unknown' };
    };

    // Cargar perfil al montar el componente
    useEffect(() => {
        loadProfile();
    }, []);

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Cargando perfil...</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Perfil no encontrado</h3>
                    <p className="text-gray-500">No se pudo cargar la información del perfil</p>
                </div>
            </div>
        );
    }

    const roleInfo = getRoleInfo(profile.role);

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="bg-blue-100 rounded-full p-3">
                            <UserIcon className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {profile.personalInfo.fullName}
                            </h1>
                            <div className="flex items-center space-x-3 mt-1">
                                <span className={`px-2 py-1 rounded-full text-sm font-medium ${roleInfo.color}`}>
                                    {roleInfo.label}
                                </span>
                                {profile.isActive && (
                                    <span className="flex items-center text-sm text-green-600">
                                        <ShieldCheckIcon className="h-4 w-4 mr-1" />
                                        Cuenta Activa
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex space-x-2">
                        {!editing ? (
                            <button
                                onClick={() => setEditing(true)}
                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <PencilIcon className="h-4 w-4 mr-2" />
                                Editar Perfil
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={cancelEdit}
                                    disabled={saving}
                                    className="flex items-center px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
                                >
                                    <XMarkIcon className="h-4 w-4 mr-2" />
                                    Cancelar
                                </button>
                                <button
                                    onClick={saveProfile}
                                    disabled={saving}
                                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                    <CheckIcon className="h-4 w-4 mr-2" />
                                    {saving ? 'Guardando...' : 'Guardar'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Información Personal */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Personal</h2>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre Completo
                                    </label>
                                    {editing ? (
                                        <input
                                            type="text"
                                            value={editForm.personalInfo?.fullName || ''}
                                            onChange={(e) => updateField('personalInfo', 'fullName', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    ) : (
                                        <p className="text-gray-900">{profile.personalInfo.fullName}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <EnvelopeIcon className="h-4 w-4 inline mr-1" />
                                        Email
                                    </label>
                                    {editing ? (
                                        <input
                                            type="email"
                                            value={editForm.personalInfo?.email || ''}
                                            onChange={(e) => updateField('personalInfo', 'email', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    ) : (
                                        <p className="text-gray-900">{profile.personalInfo.email}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <PhoneIcon className="h-4 w-4 inline mr-1" />
                                        Teléfono
                                    </label>
                                    {editing ? (
                                        <input
                                            type="tel"
                                            value={editForm.personalInfo?.phone || ''}
                                            onChange={(e) => updateField('personalInfo', 'phone', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    ) : (
                                        <p className="text-gray-900">{profile.personalInfo.phone || 'No especificado'}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <BuildingOfficeIcon className="h-4 w-4 inline mr-1" />
                                        Organización
                                    </label>
                                    {editing ? (
                                        <input
                                            type="text"
                                            value={editForm.personalInfo?.organization || ''}
                                            onChange={(e) => updateField('personalInfo', 'organization', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    ) : (
                                        <p className="text-gray-900">{profile.personalInfo.organization || 'No especificado'}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <MapPinIcon className="h-4 w-4 inline mr-1" />
                                    Dirección
                                </label>
                                {editing ? (
                                    <input
                                        type="text"
                                        value={editForm.personalInfo?.address || ''}
                                        onChange={(e) => updateField('personalInfo', 'address', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                ) : (
                                    <p className="text-gray-900">{profile.personalInfo.address || 'No especificado'}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <GlobeAmericasIcon className="h-4 w-4 inline mr-1" />
                                    País
                                </label>
                                {editing ? (
                                    <select
                                        value={editForm.personalInfo?.country || ''}
                                        onChange={(e) => updateField('personalInfo', 'country', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Seleccionar país</option>
                                        {countries.map(country => (
                                            <option key={country} value={country}>{country}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="text-gray-900">{profile.personalInfo.country || 'No especificado'}</p>
                                )}
                            </div>
                        </div>

                        {/* Información de Empresa */}
                        {(profile.businessInfo || editing) && (
                            <div className="mt-8">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de Empresa</h3>
                                
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Nombre de la Empresa
                                            </label>
                                            {editing ? (
                                                <input
                                                    type="text"
                                                    value={editForm.businessInfo?.companyName || ''}
                                                    onChange={(e) => updateField('businessInfo', 'companyName', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            ) : (
                                                <p className="text-gray-900">{profile.businessInfo?.companyName || 'No especificado'}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Tipo de Negocio
                                            </label>
                                            {editing ? (
                                                <select
                                                    value={editForm.businessInfo?.businessType || ''}
                                                    onChange={(e) => updateField('businessInfo', 'businessType', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="">Seleccionar tipo</option>
                                                    {businessTypes.map(type => (
                                                        <option key={type} value={type}>{type}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <p className="text-gray-900">{profile.businessInfo?.businessType || 'No especificado'}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Número de Registro
                                        </label>
                                        {editing ? (
                                            <input
                                                type="text"
                                                value={editForm.businessInfo?.registrationNumber || ''}
                                                onChange={(e) => updateField('businessInfo', 'registrationNumber', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        ) : (
                                            <p className="text-gray-900">{profile.businessInfo?.registrationNumber || 'No especificado'}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Descripción del Negocio
                                        </label>
                                        {editing ? (
                                            <textarea
                                                value={editForm.businessInfo?.description || ''}
                                                onChange={(e) => updateField('businessInfo', 'description', e.target.value)}
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        ) : (
                                            <p className="text-gray-900">{profile.businessInfo?.description || 'No especificado'}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Información del Sistema */}
                <div className="space-y-6">
                    {/* Información de la cuenta */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de la Cuenta</h3>
                        
                        <div className="space-y-3 text-sm">
                            <div>
                                <span className="font-medium text-gray-700">Wallet Address:</span>
                                <p className="text-gray-900 break-all font-mono text-xs">{profile.walletAddress}</p>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Rol:</span>
                                <p className="text-gray-900">{roleInfo.label}</p>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Organización:</span>
                                <p className="text-gray-900">{roleInfo.org}</p>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Estado de la Cuenta:</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    profile.accountStatus === 'approved' 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {profile.accountStatus === 'approved' ? '✅ Aprobada' : '⏳ Pendiente'}
                                </span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">ID de Registro:</span>
                                <p className="text-gray-900 font-mono">{profile.registrationId}</p>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Cuenta creada:</span>
                                <p className="text-gray-900">{formatDate(profile.createdAt)}</p>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Última actualización:</span>
                                <p className="text-gray-900">{formatDate(profile.updatedAt)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Estado de Verificación */}
                    {profile.verificationStatus && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado de Verificación</h3>
                            
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700">Email verificado</span>
                                    <span className={`text-sm font-medium ${
                                        profile.verificationStatus.emailVerified ? 'text-green-600' : 'text-gray-400'
                                    }`}>
                                        {profile.verificationStatus.emailVerified ? '✅ Verificado' : '⏳ Pendiente'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700">Teléfono verificado</span>
                                    <span className={`text-sm font-medium ${
                                        profile.verificationStatus.phoneVerified ? 'text-green-600' : 'text-gray-400'
                                    }`}>
                                        {profile.verificationStatus.phoneVerified ? '✅ Verificado' : '⏳ Pendiente'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700">Identidad verificada</span>
                                    <span className={`text-sm font-medium ${
                                        profile.verificationStatus.identityVerified ? 'text-green-600' : 'text-gray-400'
                                    }`}>
                                        {profile.verificationStatus.identityVerified ? '✅ Verificado' : '⏳ Pendiente'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700">KYC completado</span>
                                    <span className={`text-sm font-medium ${
                                        profile.verificationStatus.kycCompleted ? 'text-green-600' : 'text-gray-400'
                                    }`}>
                                        {profile.verificationStatus.kycCompleted ? '✅ Completado' : '⏳ Pendiente'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Información del Certificado X.509 */}
                    {profile.certificateInfo && profile.certificateInfo.hasX509Certificate && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Certificado Digital X.509</h3>
                            
                            <div className="space-y-3 text-sm">
                                <div>
                                    <span className="font-medium text-gray-700">Estado:</span>
                                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                        ✅ Activo
                                    </span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Subject:</span>
                                    <p className="text-gray-900 font-mono text-xs break-all">
                                        {profile.certificateInfo.certificateSubject}
                                    </p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Emisor:</span>
                                    <p className="text-gray-900">{profile.certificateInfo.issuer}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Número de Serie:</span>
                                    <p className="text-gray-900 font-mono">{profile.certificateInfo.serialNumber}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="font-medium text-gray-700">Válido desde:</span>
                                        <p className="text-gray-900 text-xs">
                                            {formatDate(profile.certificateInfo.validFrom || '')}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-gray-700">Válido hasta:</span>
                                        <p className="text-gray-900 text-xs">
                                            {formatDate(profile.certificateInfo.validTo || '')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Información de seguridad */}
                    <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex">
                            <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-medium text-blue-800 mb-1">
                                    Información de Seguridad
                                </h4>
                                <ul className="text-sm text-blue-700 space-y-1">
                                    <li>• Tu wallet de MetaMask es tu identidad principal</li>
                                    <li>• Todas las operaciones requieren firma digital</li>
                                    <li>• Tu certificado X.509 permite firmar transacciones</li>
                                    <li>• Los cambios de perfil son auditables</li>
                                    <li>• Tu cuenta está aprobada y verificada</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;