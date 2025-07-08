/**
 * Contrato principal para trazabilidad de alimentos
 * Food Traceability Blockchain Platform
 */

import { Contract, Context, Info, Returns, Transaction } from 'fabric-contract-api';
import {
    FoodAsset,
    User,
    Transfer,
    FoodCategory,
    FoodStatus,
    UserRole,
    TransferType,
    ExpiringProduct,
    SupplyChainStats,
    ChaincodResponse,
    Location,
    OriginInfo,
    NotificationSettings
} from '../models';
import { ValidationUtils, ChainUtils, DateUtils } from '../utils';

@Info({
    title: 'FoodTraceabilityContract',
    description: 'Smart contract para trazabilidad de alimentos con gestión de fechas de caducidad'
})
export class FoodTraceabilityContract extends Contract {

    constructor() {
        super('FoodTraceabilityContract');
    }

    // ==========================================
    // FUNCIONES DE INICIALIZACIÓN
    // ==========================================

    /**
     * Inicializa el ledger con datos básicos
     */
    @Transaction()
    public async initLedger(ctx: Context): Promise<void> {
        console.log('Inicializando ledger de trazabilidad de alimentos...');

        // Crear registro de inicialización
        const initRecord = {
            contract: 'FoodTraceabilityContract',
            version: '1.0.0',
            initialized: DateUtils.getCurrentISOString(),
            description: 'Sistema de trazabilidad de alimentos con gestión de caducidad'
        };

        await ChainUtils.putAssetToLedger(ctx, 'INIT_RECORD', initRecord);

        ChainUtils.emitEvent(ctx, 'LedgerInitialized', {
            message: 'Ledger de trazabilidad de alimentos inicializado',
            timestamp: DateUtils.getCurrentISOString()
        });

        console.log('Ledger inicializado exitosamente');
    }

    // ==========================================
    // GESTIÓN DE USUARIOS
    // ==========================================

    /**
     * Registra un nuevo usuario en el sistema
     */
    @Transaction()
    public async registerUser(
        ctx: Context,
        address: string,
        name: string,
        role: string,
        email: string,
        phone: string,
        locationData: string,
        licenseNumber?: string
    ): Promise<string> {

        // Validar parámetros básicos
        if (!ValidationUtils.isValidBlockchainAddress(address)) {
            throw new Error('Dirección blockchain inválida');
        }

        if (!Object.values(UserRole).includes(role as UserRole)) {
            throw new Error(`Rol inválido: ${role}`);
        }

        // Verificar que el usuario no existe
        const userExists = await ChainUtils.assetExists(ctx, `USER_${address}`);
        if (userExists) {
            throw new Error(`Usuario ${address} ya existe`);
        }

        // Parsear ubicación
        let location: Location;
        try {
            location = JSON.parse(locationData);
        } catch (error) {
            throw new Error('Datos de ubicación inválidos');
        }

        // Crear usuario
        const user: User = {
            address,
            role: role as UserRole,
            name: ValidationUtils.sanitizeString(name),
            email: email ? ValidationUtils.sanitizeString(email) : undefined,
            phone: phone ? ValidationUtils.sanitizeString(phone) : undefined,
            location,
            certifications: [],
            licenseNumber: licenseNumber ? ValidationUtils.sanitizeString(licenseNumber) : undefined,
            registrationDate: DateUtils.getCurrentISOString(),
            isActive: true,
            isVerified: false, // Requiere verificación posterior
            createdBy: ChainUtils.getClientId(ctx)
        };

        // Validar usuario completo
        if (!ValidationUtils.isValidUser(user)) {
            throw new Error('Datos de usuario inválidos');
        }

        // Guardar usuario
        await ChainUtils.putAssetToLedger(ctx, `USER_${address}`, user);

        // Emitir evento
        ChainUtils.emitEvent(ctx, 'UserRegistered', {
            address,
            name,
            role,
            timestamp: DateUtils.getCurrentISOString()
        });

        return `Usuario ${name} registrado exitosamente con dirección ${address}`;
    }

    /**
     * Obtiene información de un usuario
     */
    @Transaction(false)
    @Returns('string')
    public async getUser(ctx: Context, address: string): Promise<string> {
        if (!ValidationUtils.isValidBlockchainAddress(address)) {
            throw new Error('Dirección blockchain inválida');
        }

        const user = await ChainUtils.getAssetFromLedger<User>(ctx, `USER_${address}`);
        return JSON.stringify(user);
    }

    /**
     * Actualiza información de un usuario
     */
    @Transaction()
    public async updateUser(
        ctx: Context,
        address: string,
        name?: string,
        email?: string,
        phone?: string,
        locationData?: string
    ): Promise<string> {

        const user = await ChainUtils.getAssetFromLedger<User>(ctx, `USER_${address}`);

        // Solo el propio usuario o un admin puede actualizar
        const clientId = ChainUtils.getClientId(ctx);
        if (user.address !== clientId && !ChainUtils.hasRole(ctx, 'admin')) {
            throw new Error('No tienes permisos para actualizar este usuario');
        }

        // Actualizar campos si se proporcionan
        if (name) user.name = ValidationUtils.sanitizeString(name);
        if (email) user.email = ValidationUtils.sanitizeString(email);
        if (phone) user.phone = ValidationUtils.sanitizeString(phone);
        if (locationData) {
            try {
                user.location = JSON.parse(locationData);
            } catch (error) {
                throw new Error('Datos de ubicación inválidos');
            }
        }

        // Validar usuario actualizado
        if (!ValidationUtils.isValidUser(user)) {
            throw new Error('Datos actualizados inválidos');
        }

        await ChainUtils.putAssetToLedger(ctx, `USER_${address}`, user);

        ChainUtils.emitEvent(ctx, 'UserUpdated', {
            address,
            updatedBy: clientId,
            timestamp: DateUtils.getCurrentISOString()
        });

        return `Usuario ${address} actualizado exitosamente`;
    }

    /**
     * Verifica un usuario (solo para administradores)
     */
    @Transaction()
    public async verifyUser(ctx: Context, address: string): Promise<string> {
        // Solo administradores pueden verificar usuarios
        ChainUtils.validateClientPermissions(ctx, 'admin');

        const user = await ChainUtils.getAssetFromLedger<User>(ctx, `USER_${address}`);
        user.isVerified = true;

        await ChainUtils.putAssetToLedger(ctx, `USER_${address}`, user);

        ChainUtils.emitEvent(ctx, 'UserVerified', {
            address,
            verifiedBy: ChainUtils.getClientId(ctx),
            timestamp: DateUtils.getCurrentISOString()
        });

        return `Usuario ${address} verificado exitosamente`;
    }

    // ==========================================
    // GESTIÓN DE PRODUCTOS ALIMENTARIOS
    // ==========================================

    /**
     * Crea un nuevo producto alimentario con estructura simplificada
     */
    @Transaction()
    public async createFoodAsset(
        ctx: Context,
        tokenId: string,
        ownerAddress: string,
        name: string,
        amount: number,
        attributesJSON: string // JSON string con todos los atributos del producto
    ): Promise<string> {

        console.log(`🏭 Creando producto ${tokenId} para ${ownerAddress}`);

        // Validar parámetros básicos
        if (!tokenId || !ownerAddress || !name || amount <= 0) {
            throw new Error('Parámetros de producto inválidos');
        }

        // Parsear atributos del producto
        let attributes: any;
        try {
            attributes = JSON.parse(attributesJSON);
        } catch (error) {
            throw new Error('Atributos JSON inválidos');
        }

        // Crear clave única para el producto
        const productKey = `product:${tokenId}:${ownerAddress}`;
        
        // Verificar que el producto no existe
        const existingProductBytes = await ctx.stub.getState(productKey);
        if (existingProductBytes && existingProductBytes.length > 0) {
            throw new Error(`Producto ${tokenId} ya existe para el propietario ${ownerAddress}`);
        }

        // Crear estructura simplificada del producto basada en TokenizarContract
        const product = {
            id: tokenId,
            owner: ownerAddress,
            name: name,
            amount: amount,
            attributes: attributes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Guardar producto en el ledger
        await ctx.stub.putState(productKey, Buffer.from(JSON.stringify(product)));

        // Emitir evento
        ctx.stub.setEvent('ProductCreated', Buffer.from(JSON.stringify({
            tokenId,
            ownerAddress,
            name,
            amount,
            timestamp: new Date().toISOString()
        })));

        console.log(`✅ Producto ${tokenId} creado exitosamente`);
        return `Producto ${name} creado exitosamente con ID ${tokenId}`;
    }

    /**
     * Obtiene información de un producto alimentario (simplificado)
     */
    @Transaction(false)
    @Returns('string')
    public async getFoodAsset(ctx: Context, tokenId: string, ownerAddress: string): Promise<string> {
        const productKey = `product:${tokenId}:${ownerAddress}`;
        
        const productBytes = await ctx.stub.getState(productKey);
        if (!productBytes || productBytes.length === 0) {
            throw new Error(`Producto ${tokenId} no encontrado para ${ownerAddress}`);
        }

        return productBytes.toString();
    }

    /**
     * Actualiza el estado de un producto alimentario
     */
    @Transaction()
    public async updateFoodAssetStatus(
        ctx: Context,
        id: string,
        newStatus: string,
        notes?: string
    ): Promise<string> {

        // Validar estado
        if (!Object.values(FoodStatus).includes(newStatus as FoodStatus)) {
            throw new Error(`Estado inválido: ${newStatus}`);
        }

        const foodAsset = await ChainUtils.getAssetFromLedger<FoodAsset>(ctx, `FOOD_${id}`);
        const currentUserId = ChainUtils.getClientId(ctx);

        // Verificar permisos (solo el propietario actual puede actualizar)
        if (foodAsset.currentOwner !== currentUserId) {
            throw new Error('Solo el propietario actual puede actualizar el estado');
        }

        // Actualizar estado
        foodAsset.status = newStatus as FoodStatus;
        foodAsset.updatedAt = DateUtils.getCurrentISOString();
        foodAsset.lastUpdatedBy = currentUserId;
        foodAsset.version++;

        await ChainUtils.putAssetToLedger(ctx, `FOOD_${id}`, foodAsset);

        ChainUtils.emitEvent(ctx, 'FoodAssetStatusUpdated', {
            id,
            oldStatus: foodAsset.status,
            newStatus,
            updatedBy: currentUserId,
            notes,
            timestamp: DateUtils.getCurrentISOString()
        });

        return `Estado del producto ${id} actualizado a ${newStatus}`;
    }

    /**
     * Transfiere un producto alimentario entre actores
     */
    @Transaction()
    public async transferFoodAsset(
        ctx: Context,
        assetId: string,
        newOwner: string,
        transferType: string,
        locationData: string, // JSON string de Location
        quantity?: number,
        price?: number,
        conditions?: string,
        notes?: string
    ): Promise<string> {

        // Validar parámetros
        if (!ValidationUtils.isValidId(assetId)) {
            throw new Error('ID de activo inválido');
        }

        if (!ValidationUtils.isValidBlockchainAddress(newOwner)) {
            throw new Error('Dirección del nuevo propietario inválida');
        }

        if (!Object.values(TransferType).includes(transferType as TransferType)) {
            throw new Error(`Tipo de transferencia inválido: ${transferType}`);
        }

        // Obtener activo y usuarios
        const foodAsset = await ChainUtils.getAssetFromLedger<FoodAsset>(ctx, `FOOD_${assetId}`);
        const currentUserId = ChainUtils.getClientId(ctx);
        const currentUser = await ChainUtils.getAssetFromLedger<User>(ctx, `USER_${currentUserId}`);
        const newOwnerUser = await ChainUtils.getAssetFromLedger<User>(ctx, `USER_${newOwner}`);

        // Verificar permisos
        if (foodAsset.currentOwner !== currentUserId) {
            throw new Error('Solo el propietario actual puede transferir el activo');
        }

        // Validar tipo de transferencia para los roles
        if (!ValidationUtils.isValidTransferTypeForRoles(
            transferType as TransferType,
            currentUser.role,
            newOwnerUser.role
        )) {
            throw new Error(`Transferencia ${transferType} no válida entre ${currentUser.role} y ${newOwnerUser.role}`);
        }

        // Parsear ubicación
        let location: Location;
        try {
            location = JSON.parse(locationData);
        } catch (error) {
            throw new Error('Datos de ubicación inválidos');
        }

        // Crear registro de transferencia
        const transfer: Transfer = {
            transferId: ChainUtils.generateUniqueId('TXF_'),
            from: currentUserId,
            to: newOwner,
            fromRole: currentUser.role,
            toRole: newOwnerUser.role,
            transferType: transferType as TransferType,
            timestamp: DateUtils.getCurrentISOString(),
            location,
            quantity: quantity || foodAsset.quantity,
            price,
            conditions: conditions ? ValidationUtils.sanitizeString(conditions) : undefined,
            notes: notes ? ValidationUtils.sanitizeString(notes) : undefined
        };

        // Validar transferencia
        if (!ValidationUtils.isValidTransfer(transfer)) {
            throw new Error('Datos de transferencia inválidos');
        }

        // Actualizar activo
        foodAsset.currentOwner = newOwner;
        foodAsset.currentOwnerRole = newOwnerUser.role;
        foodAsset.currentLocation = newOwnerUser.location;
        foodAsset.ownershipHistory.push(transfer);
        foodAsset.updatedAt = DateUtils.getCurrentISOString();
        foodAsset.lastUpdatedBy = currentUserId;
        foodAsset.version++;

        // Actualizar estado según el tipo de transferencia
        switch (transferType as TransferType) {
            case TransferType.HARVEST_TO_PROCESSOR:
                foodAsset.status = FoodStatus.IN_TRANSIT;
                break;
            case TransferType.PROCESS_TO_DISTRIBUTOR:
                foodAsset.status = FoodStatus.PROCESSED;
                break;
            case TransferType.DISTRIBUTOR_TO_RETAILER:
                foodAsset.status = FoodStatus.RETAIL_READY;
                break;
            case TransferType.RETAILER_TO_CONSUMER:
                foodAsset.status = FoodStatus.SOLD;
                break;
        }

        await ChainUtils.putAssetToLedger(ctx, `FOOD_${assetId}`, foodAsset);

        // Emitir evento
        ChainUtils.emitEvent(ctx, 'FoodAssetTransferred', {
            assetId,
            from: currentUserId,
            to: newOwner,
            transferType,
            transferId: transfer.transferId,
            timestamp: DateUtils.getCurrentISOString()
        });

        return `Producto ${assetId} transferido exitosamente de ${currentUser.name} a ${newOwnerUser.name}`;
    }

    // ==========================================
    // CONSULTAS DE CADUCIDAD
    // ==========================================

    /**
     * Obtiene productos próximos a caducar
     */
    @Transaction(false)
    @Returns('string')
    public async getExpiringProducts(
        ctx: Context,
        daysAhead: number = 2,
        ownerAddress?: string,
        category?: string
    ): Promise<string> {

        if (!ValidationUtils.isValidNotificationDays(daysAhead)) {
            throw new Error('Días de anticipación inválidos (1-30)');
        }

        // Construir consulta
        const { startDate, endDate } = DateUtils.getExpiryQueryDates(daysAhead);

        const queryFilters: any = {
            expirationDate: {
                operator: '$gte',
                value: startDate
            },
            status: {
                operator: '$ne',
                value: FoodStatus.EXPIRED
            }
        };

        if (ownerAddress) {
            if (!ValidationUtils.isValidBlockchainAddress(ownerAddress)) {
                throw new Error('Dirección de propietario inválida');
            }
            queryFilters.currentOwner = ownerAddress;
        }

        if (category && Object.values(FoodCategory).includes(category as FoodCategory)) {
            queryFilters.category = category;
        }

        const queryString = ChainUtils.buildQuerySelector(queryFilters);

        try {
            const assets = await ChainUtils.executeRichQuery<FoodAsset>(ctx, queryString);

            const expiringProducts: ExpiringProduct[] = assets
                .filter(asset => {
                    const daysRemaining = DateUtils.daysUntil(asset.expirationDate);
                    return daysRemaining >= 0 && daysRemaining <= daysAhead;
                })
                .map(asset => ({
                    id: asset.id,
                    name: asset.name,
                    category: asset.category,
                    expirationDate: asset.expirationDate,
                    daysRemaining: DateUtils.daysUntil(asset.expirationDate),
                    currentOwner: asset.currentOwner,
                    currentLocation: asset.currentLocation,
                    quantity: asset.quantity,
                    status: asset.status
                }))
                .sort((a, b) => a.daysRemaining - b.daysRemaining);

            return JSON.stringify(expiringProducts);

        } catch (error: any) {
            throw new Error(`Error al consultar productos próximos a caducar: ${error.message}`);
        }
    }

    /**
     * Marca un producto como caducado
     */
    @Transaction()
    public async markAsExpired(ctx: Context, assetId: string): Promise<string> {
        const foodAsset = await ChainUtils.getAssetFromLedger<FoodAsset>(ctx, `FOOD_${assetId}`);
        const currentUserId = ChainUtils.getClientId(ctx);

        // Verificar permisos
        if (foodAsset.currentOwner !== currentUserId) {
            throw new Error('Solo el propietario actual puede marcar como caducado');
        }

        // Verificar que realmente está caducado
        if (!DateUtils.isExpired(foodAsset.expirationDate)) {
            throw new Error('El producto aún no ha caducado');
        }

        foodAsset.status = FoodStatus.EXPIRED;
        foodAsset.updatedAt = DateUtils.getCurrentISOString();
        foodAsset.lastUpdatedBy = currentUserId;
        foodAsset.version++;

        await ChainUtils.putAssetToLedger(ctx, `FOOD_${assetId}`, foodAsset);

        ChainUtils.emitEvent(ctx, 'FoodAssetExpired', {
            id: assetId,
            name: foodAsset.name,
            owner: currentUserId,
            expirationDate: foodAsset.expirationDate,
            timestamp: DateUtils.getCurrentISOString()
        });

        return `Producto ${assetId} marcado como caducado`;
    }

    /**
     * Marca un producto como consumido
     */
    @Transaction()
    public async markAsConsumed(
        ctx: Context,
        assetId: string,
        consumedDate?: string,
        rating?: number,
        consumerNotes?: string
    ): Promise<string> {

        const foodAsset = await ChainUtils.getAssetFromLedger<FoodAsset>(ctx, `FOOD_${assetId}`);
        const currentUserId = ChainUtils.getClientId(ctx);

        // Verificar permisos
        if (foodAsset.currentOwner !== currentUserId) {
            throw new Error('Solo el propietario actual puede marcar como consumido');
        }

        const consumptionDate = consumedDate || DateUtils.getCurrentISOString();

        // Validar fecha de consumo
        if (!ValidationUtils.isValidISODate(consumptionDate)) {
            throw new Error('Fecha de consumo inválida');
        }

        // Validar calificación
        if (rating !== undefined && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
            throw new Error('Calificación debe ser entre 1 y 5');
        }

        foodAsset.status = FoodStatus.CONSUMED;
        foodAsset.consumedBy = currentUserId;
        foodAsset.consumedDate = consumptionDate;
        foodAsset.rating = rating;
        foodAsset.consumerNotes = consumerNotes ? ValidationUtils.sanitizeString(consumerNotes) : undefined;
        foodAsset.updatedAt = DateUtils.getCurrentISOString();
        foodAsset.lastUpdatedBy = currentUserId;
        foodAsset.version++;

        await ChainUtils.putAssetToLedger(ctx, `FOOD_${assetId}`, foodAsset);

        ChainUtils.emitEvent(ctx, 'FoodAssetConsumed', {
            id: assetId,
            name: foodAsset.name,
            consumer: currentUserId,
            consumedDate: consumptionDate,
            rating,
            timestamp: DateUtils.getCurrentISOString()
        });

        return `Producto ${assetId} marcado como consumido`;
    }

    // ==========================================
    // CONSULTAS Y ESTADÍSTICAS
    // ==========================================

    /**
     * Obtiene todos los productos de un propietario
     */
    @Transaction(false)
    @Returns('string')
    public async getProductsByOwner(ctx: Context, ownerAddress: string): Promise<string> {
        if (!ValidationUtils.isValidBlockchainAddress(ownerAddress)) {
            throw new Error('Dirección de propietario inválida');
        }

        const queryString = ChainUtils.buildQuerySelector({
            currentOwner: ownerAddress
        });

        const assets = await ChainUtils.executeRichQuery<FoodAsset>(ctx, queryString);
        return JSON.stringify(assets);
    }

    /**
     * Obtiene productos por categoría
     */
    @Transaction(false)
    @Returns('string')
    public async getProductsByCategory(ctx: Context, category: string): Promise<string> {
        if (!Object.values(FoodCategory).includes(category as FoodCategory)) {
            throw new Error(`Categoría inválida: ${category}`);
        }

        const queryString = ChainUtils.buildQuerySelector({
            category
        });

        const assets = await ChainUtils.executeRichQuery<FoodAsset>(ctx, queryString);
        return JSON.stringify(assets);
    }

    /**
     * Obtiene el historial completo de un producto
     */
    @Transaction(false)
    @Returns('string')
    public async getProductHistory(ctx: Context, assetId: string): Promise<string> {
        if (!ValidationUtils.isValidId(assetId)) {
            throw new Error('ID de producto inválido');
        }

        const history = await ChainUtils.getAssetHistory(ctx, `FOOD_${assetId}`);
        return JSON.stringify(history);
    }

    /**
     * Obtiene estadísticas de la cadena de suministro
     */
    @Transaction(false)
    @Returns('string')
    public async getSupplyChainStats(ctx: Context): Promise<string> {
        // Esta función requeriría consultas más complejas
        // Por ahora retornamos un placeholder
        const stats: SupplyChainStats = {
            totalProducts: 0,
            productsByStatus: {} as any,
            productsByCategory: {} as any,
            productsByRole: {} as any,
            productsNearExpiry: 0,
            productsExpired: 0,
            averageShelfLife: 0,
            totalTransfers: 0,
            transfersByType: {} as any
        };

        // TODO: Implementar consultas para obtener estadísticas reales
        return JSON.stringify(stats);
    }

    // ==========================================
    // FUNCIONES DE UTILIDAD
    // ==========================================

    /**
     * Verifica si existe un asset
     */
    @Transaction(false)
    @Returns('boolean')
    public async assetExists(ctx: Context, assetId: string): Promise<boolean> {
        return await ChainUtils.assetExists(ctx, assetId);
    }

    /**
     * Función ping para verificar conectividad (simplificada)
     */
    @Transaction(false)
    @Returns('string')
    public async ping(ctx: Context): Promise<string> {
        return `Pong! FoodTraceabilityContract está funcionando. Timestamp: ${new Date().toISOString()}`;
    }
}
