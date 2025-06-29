/**
 * Utilidades de validación para el sistema de trazabilidad de alimentos
 * Food Traceability Blockchain Platform
 */

import {
    FoodAsset,
    User,
    Transfer,
    FoodCategory,
    FoodStatus,
    UserRole,
    TransferType,
    Location,
    OriginInfo
} from '../models';

/**
 * Clase de utilidades para validación de datos
 */
export class ValidationUtils {
    
    /**
     * Valida si una fecha está en formato ISO válido
     */
    static isValidISODate(dateString: string): boolean {
        if (!dateString) return false;
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date.getTime()) && dateString === date.toISOString();
    }
    
    /**
     * Valida si una fecha de caducidad es válida (no puede ser en el pasado para productos nuevos)
     */
    static isValidExpirationDate(expirationDate: string, productionDate?: string): boolean {
        if (!this.isValidISODate(expirationDate)) return false;
        
        const expiry = new Date(expirationDate);
        const now = new Date();
        
        // La fecha de caducidad debe ser en el futuro
        if (expiry <= now) return false;
        
        // Si hay fecha de producción, la caducidad debe ser después
        if (productionDate && this.isValidISODate(productionDate)) {
            const production = new Date(productionDate);
            if (expiry <= production) return false;
        }
        
        return true;
    }
    
    /**
     * Valida si un email tiene formato válido
     */
    static isValidEmail(email: string): boolean {
        if (!email) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Valida si un teléfono tiene formato válido
     */
    static isValidPhone(phone: string): boolean {
        if (!phone) return false;
        const phoneRegex = /^\+?[\d\s\-\(\)]{7,15}$/;
        return phoneRegex.test(phone);
    }
    
    /**
     * Valida si una dirección blockchain es válida (formato Ethereum)
     */
    static isValidBlockchainAddress(address: string): boolean {
        if (!address) return false;
        const ethereumRegex = /^0x[a-fA-F0-9]{40}$/;
        return ethereumRegex.test(address);
    }
    
    /**
     * Valida si una cantidad es válida
     */
    static isValidQuantity(quantity: number): boolean {
        return typeof quantity === 'number' && quantity > 0 && !isNaN(quantity);
    }
    
    /**
     * Valida si una temperatura está en rango válido (-50°C a 100°C)
     */
    static isValidTemperature(temperature: number): boolean {
        return typeof temperature === 'number' && temperature >= -50 && temperature <= 100 && !isNaN(temperature);
    }
    
    /**
     * Valida si un porcentaje está en rango válido (0-100)
     */
    static isValidPercentage(percentage: number): boolean {
        return typeof percentage === 'number' && percentage >= 0 && percentage <= 100 && !isNaN(percentage);
    }
    
    /**
     * Valida si una ubicación es válida
     */
    static isValidLocation(location: Location): boolean {
        if (!location) return false;
        
        // Campos requeridos
        if (!location.address || !location.city || !location.country) {
            return false;
        }
        
        // Validar coordenadas si están presentes
        if (location.coordinates) {
            const { latitude, longitude } = location.coordinates;
            if (typeof latitude !== 'number' || typeof longitude !== 'number') {
                return false;
            }
            if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Valida si la información de origen es válida
     */
    static isValidOriginInfo(origin: OriginInfo): boolean {
        if (!origin) return false;
        
        // Campos requeridos
        if (!origin.producer || !this.isValidLocation(origin.location)) {
            return false;
        }
        
        // Validar fecha de cosecha si está presente
        if (origin.harvestDate && !this.isValidISODate(origin.harvestDate)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Valida si un usuario es válido
     */
    static isValidUser(user: User): boolean {
        if (!user) return false;
        
        // Campos requeridos
        if (!user.address || !user.name || !user.role || !user.location) {
            return false;
        }
        
        // Validar dirección blockchain
        if (!this.isValidBlockchainAddress(user.address)) {
            return false;
        }
        
        // Validar rol
        if (!Object.values(UserRole).includes(user.role)) {
            return false;
        }
        
        // Validar ubicación
        if (!this.isValidLocation(user.location)) {
            return false;
        }
        
        // Validar email si está presente
        if (user.email && !this.isValidEmail(user.email)) {
            return false;
        }
        
        // Validar teléfono si está presente
        if (user.phone && !this.isValidPhone(user.phone)) {
            return false;
        }
        
        // Validar fecha de registro
        if (!this.isValidISODate(user.registrationDate)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Valida si un activo alimentario es válido
     */
    static isValidFoodAsset(asset: FoodAsset): boolean {
        if (!asset) return false;
        
        // Campos requeridos básicos
        if (!asset.id || !asset.batchNumber || !asset.name || !asset.category) {
            return false;
        }
        
        // Validar categoría
        if (!Object.values(FoodCategory).includes(asset.category)) {
            return false;
        }
        
        // Validar estado
        if (!Object.values(FoodStatus).includes(asset.status)) {
            return false;
        }
        
        // Validar propietario actual
        if (!asset.currentOwner || !this.isValidBlockchainAddress(asset.currentOwner)) {
            return false;
        }
        
        // Validar rol del propietario
        if (!Object.values(UserRole).includes(asset.currentOwnerRole)) {
            return false;
        }
        
        // Validar cantidad
        if (!this.isValidQuantity(asset.quantity)) {
            return false;
        }
        
        // Validar fechas
        if (!this.isValidISODate(asset.productionDate)) {
            return false;
        }
        
        if (!this.isValidExpirationDate(asset.expirationDate, asset.productionDate)) {
            return false;
        }
        
        // Validar información de origen
        if (!this.isValidOriginInfo(asset.origin)) {
            return false;
        }
        
        // Validar ubicación actual
        if (!this.isValidLocation(asset.currentLocation)) {
            return false;
        }
        
        // Validar fechas de metadatos
        if (!this.isValidISODate(asset.createdAt) || !this.isValidISODate(asset.updatedAt)) {
            return false;
        }
        
        // Validar creador
        if (!asset.createdBy || !this.isValidBlockchainAddress(asset.createdBy)) {
            return false;
        }
        
        // Validar versión
        if (typeof asset.version !== 'number' || asset.version < 1) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Valida si una transferencia es válida
     */
    static isValidTransfer(transfer: Transfer): boolean {
        if (!transfer) return false;
        
        // Campos requeridos
        if (!transfer.transferId || !transfer.from || !transfer.to) {
            return false;
        }
        
        // No puede transferir a sí mismo
        if (transfer.from === transfer.to) {
            return false;
        }
        
        // Validar direcciones
        if (!this.isValidBlockchainAddress(transfer.from) || !this.isValidBlockchainAddress(transfer.to)) {
            return false;
        }
        
        // Validar roles
        if (!Object.values(UserRole).includes(transfer.fromRole) || !Object.values(UserRole).includes(transfer.toRole)) {
            return false;
        }
        
        // Validar tipo de transferencia
        if (!Object.values(TransferType).includes(transfer.transferType)) {
            return false;
        }
        
        // Validar timestamp
        if (!this.isValidISODate(transfer.timestamp)) {
            return false;
        }
        
        // Validar ubicación
        if (!this.isValidLocation(transfer.location)) {
            return false;
        }
        
        // Validar cantidad si está presente
        if (transfer.quantity !== undefined && !this.isValidQuantity(transfer.quantity)) {
            return false;
        }
        
        // Validar precio si está presente
        if (transfer.price !== undefined && (typeof transfer.price !== 'number' || transfer.price < 0)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Valida si un ID es válido (no vacío, formato apropiado)
     */
    static isValidId(id: string): boolean {
        if (!id || typeof id !== 'string') return false;
        // ID debe tener al menos 3 caracteres y máximo 50
        return id.length >= 3 && id.length <= 50 && /^[a-zA-Z0-9_-]+$/.test(id);
    }
    
    /**
     * Valida si un número de lote es válido
     */
    static isValidBatchNumber(batchNumber: string): boolean {
        if (!batchNumber || typeof batchNumber !== 'string') return false;
        // Número de lote debe tener al menos 3 caracteres y máximo 30
        return batchNumber.length >= 3 && batchNumber.length <= 30 && /^[a-zA-Z0-9_-]+$/.test(batchNumber);
    }
    
    /**
     * Valida si días de notificación están en rango válido (1-30)
     */
    static isValidNotificationDays(days: number): boolean {
        return typeof days === 'number' && days >= 1 && days <= 30 && Number.isInteger(days);
    }
    
    /**
     * Calcula días restantes hasta una fecha
     */
    static calculateDaysRemaining(expirationDate: string): number {
        if (!this.isValidISODate(expirationDate)) return -1;
        
        const expiry = new Date(expirationDate);
        const now = new Date();
        const diffTime = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    }
    
    /**
     * Verifica si un producto está próximo a caducar
     */
    static isNearExpiry(expirationDate: string, daysAhead: number = 2): boolean {
        const daysRemaining = this.calculateDaysRemaining(expirationDate);
        return daysRemaining >= 0 && daysRemaining <= daysAhead;
    }
    
    /**
     * Verifica si un producto está caducado
     */
    static isExpired(expirationDate: string): boolean {
        const daysRemaining = this.calculateDaysRemaining(expirationDate);
        return daysRemaining < 0;
    }
    
    /**
     * Sanitiza una cadena de texto
     */
    static sanitizeString(input: string): string {
        if (!input || typeof input !== 'string') return '';
        return input.trim().replace(/[<>]/g, '');
    }
    
    /**
     * Valida que un transferType sea apropiado para los roles de origen y destino
     */
    static isValidTransferTypeForRoles(transferType: TransferType, fromRole: UserRole, toRole: UserRole): boolean {
        const validTransitions: { [key in TransferType]: Array<{ from: UserRole, to: UserRole }> } = {
            [TransferType.HARVEST_TO_PROCESSOR]: [
                { from: UserRole.PRODUCER, to: UserRole.PROCESSOR }
            ],
            [TransferType.PROCESS_TO_DISTRIBUTOR]: [
                { from: UserRole.PROCESSOR, to: UserRole.DISTRIBUTOR }
            ],
            [TransferType.DISTRIBUTOR_TO_RETAILER]: [
                { from: UserRole.DISTRIBUTOR, to: UserRole.RETAILER }
            ],
            [TransferType.RETAILER_TO_CONSUMER]: [
                { from: UserRole.RETAILER, to: UserRole.CONSUMER }
            ],
            [TransferType.RETURN]: [
                { from: UserRole.CONSUMER, to: UserRole.RETAILER },
                { from: UserRole.RETAILER, to: UserRole.DISTRIBUTOR },
                { from: UserRole.DISTRIBUTOR, to: UserRole.PROCESSOR },
                { from: UserRole.PROCESSOR, to: UserRole.PRODUCER }
            ],
            [TransferType.RECALL]: [
                { from: UserRole.CONSUMER, to: UserRole.RETAILER },
                { from: UserRole.RETAILER, to: UserRole.DISTRIBUTOR },
                { from: UserRole.DISTRIBUTOR, to: UserRole.PROCESSOR },
                { from: UserRole.PROCESSOR, to: UserRole.PRODUCER }
            ]
        };
        
        const validTransitionsForType = validTransitions[transferType];
        return validTransitionsForType.some(transition => 
            transition.from === fromRole && transition.to === toRole
        );
    }
}