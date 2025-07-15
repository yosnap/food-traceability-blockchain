/**
 * Servicio para gestionar solicitudes de registro de usuarios
 * Los usuarios solicitan, el admin aprueba/rechaza
 */

import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import nodemailer from 'nodemailer';
import { UserCertificateService } from './UserCertificateService.js';

export interface RegistrationRequest {
    id: string;
    walletAddress: string;
    requestedRole: string;
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
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: string;
    processedAt?: string;
    processedBy?: string;
    adminNotes?: string;
    signature: string;  // Firma del solicitante con Metamask
    messageHash: string;
}

export interface UserProfile {
    walletAddress: string;
    role: string;
    personalInfo: RegistrationRequest['personalInfo'];
    businessInfo?: RegistrationRequest['businessInfo'];
    registrationId: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    certificateGenerated?: boolean;
    fabricUserId?: string;
    mspId?: string;
}

export class RegistrationRequestService {
    private requestsFile: string;
    private profilesFile: string;
    private emailTransporter: nodemailer.Transporter;
    private certificateService: UserCertificateService;

    constructor() {
        this.requestsFile = path.join(process.cwd(), 'data', 'registration-requests.json');
        this.profilesFile = path.join(process.cwd(), 'data', 'user-profiles.json');
        this.certificateService = new UserCertificateService();
        
        // Crear directorio de datos si no existe
        const dataDir = path.dirname(this.requestsFile);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Configurar transporte de email
        this.emailTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER || 'admin@foodtraceability.com',
                pass: process.env.SMTP_PASS || 'password'
            }
        });
    }

    /**
     * Crear nueva solicitud de registro
     */
    async createRegistrationRequest(requestData: {
        walletAddress: string;
        requestedRole: string;
        personalInfo: RegistrationRequest['personalInfo'];
        businessInfo?: RegistrationRequest['businessInfo'];
        signature: string;
        message: string;
    }): Promise<{
        success: boolean;
        requestId?: string;
        error?: string;
    }> {
        console.log(`📝 Nueva solicitud de registro: ${requestData.walletAddress} (${requestData.requestedRole})`);

        try {
            // Verificar firma
            const messageHash = ethers.hashMessage(requestData.message);
            const recoveredAddress = ethers.recoverAddress(messageHash, requestData.signature);

            if (recoveredAddress.toLowerCase() !== requestData.walletAddress.toLowerCase()) {
                return {
                    success: false,
                    error: 'Firma inválida'
                };
            }

            // Verificar que no exista solicitud pendiente
            const existingRequest = await this.findRequestByWallet(requestData.walletAddress);
            if (existingRequest && existingRequest.status === 'pending') {
                return {
                    success: false,
                    error: 'Ya existe una solicitud pendiente para esta wallet'
                };
            }

            // Crear solicitud
            const requestId = `REQ-${Date.now()}-${requestData.walletAddress.slice(2, 8)}`;
            
            const newRequest: RegistrationRequest = {
                id: requestId,
                walletAddress: requestData.walletAddress,
                requestedRole: requestData.requestedRole,
                personalInfo: requestData.personalInfo,
                businessInfo: requestData.businessInfo,
                status: 'pending',
                requestedAt: new Date().toISOString(),
                signature: requestData.signature,
                messageHash
            };

            // Guardar solicitud
            await this.saveRequest(newRequest);

            // Notificar al admin
            await this.notifyAdminNewRequest(newRequest);

            console.log(`✅ Solicitud creada: ${requestId}`);

            return {
                success: true,
                requestId
            };

        } catch (error: any) {
            console.error('❌ Error creando solicitud:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Obtener todas las solicitudes pendientes
     */
    async getPendingRequests(): Promise<RegistrationRequest[]> {
        try {
            const requests = await this.loadRequests();
            return requests.filter(req => req.status === 'pending');
        } catch (error) {
            console.error('❌ Error obteniendo solicitudes:', error);
            return [];
        }
    }

    /**
     * Aprobar solicitud
     */
    async approveRequest(
        requestId: string,
        adminWallet: string,
        adminNotes?: string
    ): Promise<{
        success: boolean;
        userCreated?: boolean;
        error?: string;
    }> {
        console.log(`✅ Aprobando solicitud: ${requestId}`);

        try {
            const request = await this.findRequestById(requestId);
            if (!request) {
                return {
                    success: false,
                    error: 'Solicitud no encontrada'
                };
            }

            if (request.status !== 'pending') {
                return {
                    success: false,
                    error: 'La solicitud ya fue procesada'
                };
            }

            // Actualizar solicitud
            request.status = 'approved';
            request.processedAt = new Date().toISOString();
            request.processedBy = adminWallet;
            request.adminNotes = adminNotes;

            await this.updateRequest(request);

            // Crear perfil de usuario
            const userProfile: UserProfile = {
                walletAddress: request.walletAddress,
                role: request.requestedRole,
                personalInfo: request.personalInfo,
                businessInfo: request.businessInfo,
                registrationId: requestId,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await this.saveUserProfile(userProfile);

            // Notificar al usuario
            await this.notifyUserApproval(request);
            
            // Generar certificado X.509 para el usuario
            try {
                console.log('🔐 Generando certificado X.509 para el usuario...');
                
                // Crear una firma simulada del admin para el proceso
                // En producción, esto debería venir del frontend con la firma real del admin
                const adminMessage = `createUserCertificate:${request.walletAddress}:${request.requestedRole}`;
                const adminSigner = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY || '0x' + '1'.repeat(64));
                const adminSignature = await adminSigner.signMessage(adminMessage);
                
                const certificateRequest = {
                    walletAddress: request.walletAddress,
                    role: request.requestedRole,
                    adminSignature: adminSignature,
                    adminWalletAddress: adminWallet
                };
                
                const certificate = await this.certificateService.createUserCertificate(certificateRequest);
                
                console.log(`✅ Certificado X.509 generado exitosamente para ${request.walletAddress}`);
                console.log(`📄 Usuario ID en Fabric: ${certificate.mspId}`);
                
                // Actualizar el perfil con la información del certificado
                userProfile.certificateGenerated = true;
                userProfile.fabricUserId = `User_${request.walletAddress}@${certificate.organizationId}`;
                userProfile.mspId = certificate.mspId;
                await this.saveUserProfile(userProfile);
                
            } catch (certError) {
                console.error('❌ Error generando certificado:', certError);
                // No fallar la aprobación si falla el certificado
                // El admin puede generar el certificado manualmente más tarde
            }

            console.log(`✅ Solicitud aprobada: ${requestId}`);

            return {
                success: true,
                userCreated: true
            };

        } catch (error: any) {
            console.error('❌ Error aprobando solicitud:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Rechazar solicitud
     */
    async rejectRequest(
        requestId: string,
        adminWallet: string,
        reason: string
    ): Promise<{
        success: boolean;
        error?: string;
    }> {
        console.log(`❌ Rechazando solicitud: ${requestId}`);

        try {
            const request = await this.findRequestById(requestId);
            if (!request) {
                return {
                    success: false,
                    error: 'Solicitud no encontrada'
                };
            }

            if (request.status !== 'pending') {
                return {
                    success: false,
                    error: 'La solicitud ya fue procesada'
                };
            }

            // Actualizar solicitud
            request.status = 'rejected';
            request.processedAt = new Date().toISOString();
            request.processedBy = adminWallet;
            request.adminNotes = reason;

            await this.updateRequest(request);

            // Notificar al usuario
            await this.notifyUserRejection(request, reason);

            console.log(`❌ Solicitud rechazada: ${requestId}`);

            return {
                success: true
            };

        } catch (error: any) {
            console.error('❌ Error rechazando solicitud:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Obtener perfil de usuario por wallet
     */
    async getUserProfile(walletAddress: string): Promise<UserProfile | null> {
        try {
            const profiles = await this.loadUserProfiles();
            return profiles.find(p => p.walletAddress.toLowerCase() === walletAddress.toLowerCase()) || null;
        } catch (error) {
            console.error('❌ Error obteniendo perfil:', error);
            return null;
        }
    }

    /**
     * Actualizar perfil de usuario
     */
    async updateUserProfile(
        walletAddress: string,
        updates: Partial<UserProfile['personalInfo'] & UserProfile['businessInfo']>
    ): Promise<{
        success: boolean;
        error?: string;
    }> {
        console.log(`📝 Actualizando perfil: ${walletAddress}`);

        try {
            const profile = await this.getUserProfile(walletAddress);
            if (!profile) {
                return {
                    success: false,
                    error: 'Perfil no encontrado'
                };
            }

            // Actualizar campos
            if (updates.fullName) profile.personalInfo.fullName = updates.fullName;
            if (updates.email) profile.personalInfo.email = updates.email;
            if (updates.phone) profile.personalInfo.phone = updates.phone;
            if (updates.organization) profile.personalInfo.organization = updates.organization;
            if (updates.address) profile.personalInfo.address = updates.address;
            if (updates.country) profile.personalInfo.country = updates.country;

            if (updates.companyName && profile.businessInfo) {
                profile.businessInfo.companyName = updates.companyName;
            }
            if (updates.businessType && profile.businessInfo) {
                profile.businessInfo.businessType = updates.businessType;
            }
            if (updates.registrationNumber && profile.businessInfo) {
                profile.businessInfo.registrationNumber = updates.registrationNumber;
            }
            if (updates.description && profile.businessInfo) {
                profile.businessInfo.description = updates.description;
            }

            profile.updatedAt = new Date().toISOString();

            await this.saveUserProfile(profile);

            console.log(`✅ Perfil actualizado: ${walletAddress}`);

            return {
                success: true
            };

        } catch (error: any) {
            console.error('❌ Error actualizando perfil:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Cargar solicitudes del archivo
     */
    private async loadRequests(): Promise<RegistrationRequest[]> {
        try {
            if (!fs.existsSync(this.requestsFile)) {
                return [];
            }
            const data = fs.readFileSync(this.requestsFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    }

    /**
     * Guardar solicitud
     */
    private async saveRequest(request: RegistrationRequest): Promise<void> {
        const requests = await this.loadRequests();
        const existingIndex = requests.findIndex(r => r.id === request.id);
        
        if (existingIndex >= 0) {
            requests[existingIndex] = request;
        } else {
            requests.push(request);
        }

        fs.writeFileSync(this.requestsFile, JSON.stringify(requests, null, 2));
    }

    /**
     * Actualizar solicitud
     */
    private async updateRequest(request: RegistrationRequest): Promise<void> {
        const requests = await this.loadRequests();
        const index = requests.findIndex(r => r.id === request.id);
        
        if (index >= 0) {
            requests[index] = request;
            fs.writeFileSync(this.requestsFile, JSON.stringify(requests, null, 2));
        }
    }

    /**
     * Buscar solicitud por ID
     */
    private async findRequestById(requestId: string): Promise<RegistrationRequest | null> {
        const requests = await this.loadRequests();
        return requests.find(r => r.id === requestId) || null;
    }

    /**
     * Buscar solicitud por wallet
     */
    private async findRequestByWallet(walletAddress: string): Promise<RegistrationRequest | null> {
        const requests = await this.loadRequests();
        return requests.find(r => r.walletAddress.toLowerCase() === walletAddress.toLowerCase()) || null;
    }

    /**
     * Cargar perfiles de usuario
     */
    private async loadUserProfiles(): Promise<UserProfile[]> {
        try {
            if (!fs.existsSync(this.profilesFile)) {
                return [];
            }
            const data = fs.readFileSync(this.profilesFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    }

    /**
     * Guardar perfil de usuario
     */
    private async saveUserProfile(profile: UserProfile): Promise<void> {
        const profiles = await this.loadUserProfiles();
        const existingIndex = profiles.findIndex(p => p.walletAddress.toLowerCase() === profile.walletAddress.toLowerCase());
        
        if (existingIndex >= 0) {
            profiles[existingIndex] = profile;
        } else {
            profiles.push(profile);
        }

        fs.writeFileSync(this.profilesFile, JSON.stringify(profiles, null, 2));
    }

    /**
     * Notificar al admin sobre nueva solicitud
     */
    private async notifyAdminNewRequest(request: RegistrationRequest): Promise<void> {
        try {
            const subject = `Nueva solicitud de registro - ${request.personalInfo.fullName}`;
            const html = `
                <h2>Nueva Solicitud de Registro</h2>
                <p><strong>Solicitante:</strong> ${request.personalInfo.fullName}</p>
                <p><strong>Email:</strong> ${request.personalInfo.email}</p>
                <p><strong>Wallet:</strong> ${request.walletAddress}</p>
                <p><strong>Rol solicitado:</strong> ${request.requestedRole}</p>
                <p><strong>Organización:</strong> ${request.personalInfo.organization || 'N/A'}</p>
                <p><strong>Fecha:</strong> ${new Date(request.requestedAt).toLocaleString()}</p>
                
                <h3>Información de Contacto</h3>
                <ul>
                    <li>Teléfono: ${request.personalInfo.phone || 'N/A'}</li>
                    <li>Dirección: ${request.personalInfo.address || 'N/A'}</li>
                    <li>País: ${request.personalInfo.country || 'N/A'}</li>
                </ul>
                
                ${request.businessInfo ? `
                    <h3>Información de Empresa</h3>
                    <ul>
                        <li>Empresa: ${request.businessInfo.companyName || 'N/A'}</li>
                        <li>Tipo: ${request.businessInfo.businessType || 'N/A'}</li>
                        <li>Registro: ${request.businessInfo.registrationNumber || 'N/A'}</li>
                        <li>Descripción: ${request.businessInfo.description || 'N/A'}</li>
                    </ul>
                ` : ''}
                
                <p><a href="${process.env.ADMIN_PANEL_URL || 'http://localhost:3000/admin'}/requests/${request.id}">
                    Ver en panel de administración
                </a></p>
            `;

            await this.emailTransporter.sendMail({
                from: process.env.SMTP_FROM || 'noreply@foodtraceability.com',
                to: process.env.ADMIN_EMAIL || 'admin@foodtraceability.com',
                subject,
                html
            });

            console.log('📧 Notificación enviada al admin');

        } catch (error) {
            console.error('❌ Error enviando notificación:', error);
        }
    }

    /**
     * Notificar al usuario sobre aprobación
     */
    private async notifyUserApproval(request: RegistrationRequest): Promise<void> {
        try {
            const subject = 'Solicitud de registro aprobada';
            const html = `
                <h2>¡Bienvenido al Sistema de Trazabilidad de Alimentos!</h2>
                <p>Hola ${request.personalInfo.fullName},</p>
                <p>Tu solicitud de registro ha sido <strong>aprobada</strong>.</p>
                
                <h3>Detalles de tu cuenta</h3>
                <ul>
                    <li>Wallet: ${request.walletAddress}</li>
                    <li>Rol: ${request.requestedRole}</li>
                    <li>Fecha de aprobación: ${new Date().toLocaleString()}</li>
                </ul>
                
                <p>Ya puedes iniciar sesión conectando tu wallet de Metamask en:</p>
                <p><a href="${process.env.APP_URL || 'http://localhost:3000'}">
                    ${process.env.APP_URL || 'http://localhost:3000'}
                </a></p>
                
                <p>¡Gracias por unirte a nuestro sistema!</p>
            `;

            await this.emailTransporter.sendMail({
                from: process.env.SMTP_FROM || 'noreply@foodtraceability.com',
                to: request.personalInfo.email,
                subject,
                html
            });

            console.log('📧 Notificación de aprobación enviada al usuario');

        } catch (error) {
            console.error('❌ Error enviando notificación de aprobación:', error);
        }
    }

    /**
     * Notificar al usuario sobre rechazo
     */
    private async notifyUserRejection(request: RegistrationRequest, reason: string): Promise<void> {
        try {
            const subject = 'Solicitud de registro rechazada';
            const html = `
                <h2>Solicitud de Registro</h2>
                <p>Hola ${request.personalInfo.fullName},</p>
                <p>Lamentamos informarte que tu solicitud de registro ha sido <strong>rechazada</strong>.</p>
                
                <h3>Motivo del rechazo</h3>
                <p>${reason}</p>
                
                <p>Si tienes preguntas sobre esta decisión, puedes contactarnos respondiendo a este email.</p>
                
                <p>Puedes enviar una nueva solicitud cuando hayas resuelto los problemas mencionados.</p>
            `;

            await this.emailTransporter.sendMail({
                from: process.env.SMTP_FROM || 'noreply@foodtraceability.com',
                to: request.personalInfo.email,
                subject,
                html
            });

            console.log('📧 Notificación de rechazo enviada al usuario');

        } catch (error) {
            console.error('❌ Error enviando notificación de rechazo:', error);
        }
    }
}

export const registrationRequestService = new RegistrationRequestService();