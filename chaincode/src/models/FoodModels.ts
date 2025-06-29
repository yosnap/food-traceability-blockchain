/**
 * Modelos de datos para el sistema de trazabilidad de alimentos
 * Food Traceability Blockchain Platform
 */

// Enumeraciones para tipos de datos

/**
 * Categorías de alimentos
 */
export enum FoodCategory {
    FRUITS = 'FRUITS',
    VEGETABLES = 'VEGETABLES',
    DAIRY = 'DAIRY',
    MEAT = 'MEAT',
    POULTRY = 'POULTRY',
    SEAFOOD = 'SEAFOOD',
    GRAINS = 'GRAINS',
    BAKERY = 'BAKERY',
    BEVERAGES = 'BEVERAGES',
    PROCESSED = 'PROCESSED',
    FROZEN = 'FROZEN',
    CANNED = 'CANNED',
    ORGANIC = 'ORGANIC',
    OTHER = 'OTHER'
}

/**
 * Estados del producto alimentario en su ciclo de vida
 */
export enum FoodStatus {
    PRODUCED = 'PRODUCED',           // Recién producido/cosechado
    IN_TRANSIT = 'IN_TRANSIT',       // En tránsito/transporte
    RECEIVED = 'RECEIVED',           // Recibido por siguiente actor
    PROCESSED = 'PROCESSED',         // Procesado/transformado
    PACKAGED = 'PACKAGED',           // Empaquetado
    STORED = 'STORED',               // Almacenado
    RETAIL_READY = 'RETAIL_READY',   // Listo para venta al público
    ON_SALE = 'ON_SALE',             // En venta
    SOLD = 'SOLD',                   // Vendido al consumidor
    CONSUMED = 'CONSUMED',           // Consumido
    NEAR_EXPIRY = 'NEAR_EXPIRY',     // Próximo a caducar (1-2 días)
    EXPIRED = 'EXPIRED',             // Caducado
    RECALLED = 'RECALLED',           // Retirado del mercado
    DISPOSED = 'DISPOSED'            // Desechado
}

/**
 * Roles de usuarios en la cadena de suministro
 */
export enum UserRole {
    PRODUCER = 'PRODUCER',           // Productor/Agricultor
    PROCESSOR = 'PROCESSOR',         // Procesador/Fábrica
    DISTRIBUTOR = 'DISTRIBUTOR',     // Distribuidor/Mayorista
    RETAILER = 'RETAILER',           // Minorista/Supermercado
    CONSUMER = 'CONSUMER',           // Consumidor final
    INSPECTOR = 'INSPECTOR',         // Inspector de calidad/regulador
    ADMIN = 'ADMIN'                  // Administrador del sistema
}

/**
 * Tipos de transferencia entre actores
 */
export enum TransferType {
    HARVEST_TO_PROCESSOR = 'HARVEST_TO_PROCESSOR',     // Cosecha a procesador
    PROCESS_TO_DISTRIBUTOR = 'PROCESS_TO_DISTRIBUTOR', // Procesador a distribuidor
    DISTRIBUTOR_TO_RETAILER = 'DISTRIBUTOR_TO_RETAILER', // Distribuidor a minorista
    RETAILER_TO_CONSUMER = 'RETAILER_TO_CONSUMER',     // Minorista a consumidor
    RETURN = 'RETURN',                                 // Devolución
    RECALL = 'RECALL'                                  // Retiro del mercado
}

// Interfaces para los modelos de datos

/**
 * Información de ubicación geográfica
 */
export interface Location {
    address: string;
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
}

/**
 * Información de origen del producto
 */
export interface OriginInfo {
    farm?: string;                   // Nombre de la granja/finca
    producer: string;                // Nombre del productor
    location: Location;              // Ubicación de origen
    harvestDate?: string;            // Fecha de cosecha (ISO string)
    certifications?: string[];       // Certificaciones (orgánico, etc.)
    lotNumber?: string;              // Número de lote de producción
}

/**
 * Condiciones de almacenamiento requeridas
 */
export interface StorageConditions {
    temperature?: {
        min: number;                 // Temperatura mínima (°C)
        max: number;                 // Temperatura máxima (°C)
    };
    humidity?: {
        min: number;                 // Humedad mínima (%)
        max: number;                 // Humedad máxima (%)
    };
    specialConditions?: string[];    // Condiciones especiales
}

/**
 * Registro de temperatura para productos que lo requieren
 */
export interface TemperatureRecord {
    timestamp: string;               // Momento del registro (ISO string)
    temperature: number;             // Temperatura registrada (°C)
    location?: string;               // Ubicación donde se registró
    recordedBy: string;              // Quién registró la temperatura
}

/**
 * Información nutricional del producto
 */
export interface NutritionalInfo {
    calories?: number;               // Calorías por 100g
    protein?: number;                // Proteínas (g)
    carbohydrates?: number;          // Carbohidratos (g)
    fat?: number;                    // Grasas (g)
    fiber?: number;                  // Fibra (g)
    sodium?: number;                 // Sodio (mg)
    sugar?: number;                  // Azúcares (g)
    vitamins?: { [key: string]: number }; // Vitaminas
    minerals?: { [key: string]: number }; // Minerales
}

/**
 * Certificación de calidad o seguridad
 */
export interface Certification {
    name: string;                    // Nombre de la certificación
    issuedBy: string;                // Entidad que emite
    issueDate: string;               // Fecha de emisión (ISO string)
    expiryDate?: string;             // Fecha de expiración (ISO string)
    certificateNumber: string;       // Número del certificado
    verified: boolean;               // Si está verificada
}

/**
 * Registro de transferencia entre actores
 */
export interface Transfer {
    transferId: string;              // ID único de la transferencia
    from: string;                    // Dirección del remitente
    to: string;                      // Dirección del destinatario
    fromRole: UserRole;              // Rol del remitente
    toRole: UserRole;                // Rol del destinatario
    transferType: TransferType;      // Tipo de transferencia
    timestamp: string;               // Momento de la transferencia (ISO string)
    location: Location;              // Ubicación de la transferencia
    quantity?: number;               // Cantidad transferida
    price?: number;                  // Precio de la transferencia
    conditions?: string;             // Condiciones de la transferencia
    signature?: string;              // Firma digital de confirmación
    notes?: string;                  // Notas adicionales
}

/**
 * Usuario del sistema con rol en la cadena de suministro
 */
export interface User {
    address: string;                 // Dirección blockchain única
    role: UserRole;                  // Rol en la cadena de suministro
    name: string;                    // Nombre o razón social
    email?: string;                  // Email de contacto
    phone?: string;                  // Teléfono de contacto
    location: Location;              // Ubicación del usuario
    certifications?: Certification[]; // Certificaciones del usuario
    licenseNumber?: string;          // Número de licencia si aplica
    registrationDate: string;        // Fecha de registro (ISO string)
    isActive: boolean;               // Si el usuario está activo
    isVerified: boolean;             // Si el usuario está verificado
    createdBy?: string;              // Quién creó este usuario
}

/**
 * Configuración de notificaciones por usuario
 */
export interface NotificationSettings {
    userId: string;                  // ID del usuario
    enableNotifications: boolean;    // Si las notificaciones están habilitadas
    notificationDays: number;        // Días de anticipación para alertas (1-7)
    enableEmailNotifications: boolean; // Notificaciones por email
    enablePushNotifications: boolean;  // Notificaciones push
    quietHours?: {                   // Horarios sin notificaciones
        start: string;               // Hora de inicio (HH:mm)
        end: string;                 // Hora de fin (HH:mm)
    };
    categorySettings?: {             // Configuración por categoría
        [key in FoodCategory]?: {
            days: number;            // Días de anticipación específicos
            enabled: boolean;        // Si está habilitado para esta categoría
        };
    };
}

/**
 * Activo alimentario principal - El corazón del sistema
 */
export interface FoodAsset {
    // Identificación básica
    id: string;                      // ID único del producto
    batchNumber: string;             // Número de lote
    gtin?: string;                   // Código de barras global (UPC/EAN)
    qrCode?: string;                 // Código QR generado

    // Información del producto
    name: string;                    // Nombre del producto
    category: FoodCategory;          // Categoría alimentaria
    description: string;             // Descripción detallada
    brand?: string;                  // Marca del producto
    weight?: number;                 // Peso en gramos
    volume?: number;                 // Volumen en ml
    quantity: number;                // Cantidad/unidades

    // Información temporal crítica
    productionDate: string;          // Fecha de producción (ISO string)
    expirationDate: string;          // Fecha de caducidad (ISO string)
    bestBeforeDate?: string;         // Fecha de consumo preferente (ISO string)
    shelfLife?: number;              // Vida útil en días

    // Información nutricional y calidad
    nutritionalInfo?: NutritionalInfo; // Información nutricional
    allergens: string[];             // Alérgenos presentes
    ingredients?: string[];          // Lista de ingredientes
    qualityCertifications: Certification[]; // Certificaciones de calidad

    // Trazabilidad y propiedad
    origin: OriginInfo;              // Información de origen
    currentOwner: string;            // Propietario actual (dirección)
    currentOwnerRole: UserRole;      // Rol del propietario actual
    ownershipHistory: Transfer[];    // Historial completo de transferencias
    currentLocation: Location;       // Ubicación actual

    // Estado y condiciones
    status: FoodStatus;              // Estado actual del producto
    storageConditions: StorageConditions; // Condiciones de almacenamiento
    temperatureLog?: TemperatureRecord[]; // Log de temperatura si aplica
    isRecalled: boolean;             // Si el producto ha sido retirado
    recallReason?: string;           // Razón del retiro si aplica

    // Información del consumidor
    consumedBy?: string;             // Quién lo consumió (si aplica)
    consumedDate?: string;           // Fecha de consumo (ISO string)
    rating?: number;                 // Calificación del consumidor (1-5)
    consumerNotes?: string;          // Notas del consumidor

    // Metadatos del sistema
    createdAt: string;               // Fecha de creación (ISO string)
    updatedAt: string;               // Última actualización (ISO string)
    createdBy: string;               // Quién creó el registro
    lastUpdatedBy: string;           // Quién hizo la última actualización
    version: number;                 // Versión del registro

    // Campos adicionales flexibles
    customAttributes?: { [key: string]: any }; // Atributos personalizados
}

/**
 * Consulta para productos próximos a caducar
 */
export interface ExpiryQuery {
    daysAhead: number;               // Días hacia adelante para buscar
    ownerAddress?: string;           // Filtrar por propietario específico
    category?: FoodCategory;         // Filtrar por categoría
    status?: FoodStatus[];           // Filtrar por estados
    location?: string;               // Filtrar por ubicación
}

/**
 * Resultado de consulta de productos próximos a caducar
 */
export interface ExpiringProduct {
    id: string;                      // ID del producto
    name: string;                    // Nombre del producto
    category: FoodCategory;          // Categoría
    expirationDate: string;          // Fecha de caducidad
    daysRemaining: number;           // Días restantes hasta caducidad
    currentOwner: string;            // Propietario actual
    currentLocation: Location;       // Ubicación actual
    quantity: number;                // Cantidad disponible
    status: FoodStatus;              // Estado actual
}

/**
 * Estadísticas de la cadena de suministro
 */
export interface SupplyChainStats {
    totalProducts: number;           // Total de productos en el sistema
    productsByStatus: { [key in FoodStatus]: number }; // Productos por estado
    productsByCategory: { [key in FoodCategory]: number }; // Productos por categoría
    productsByRole: { [key in UserRole]: number }; // Productos por rol del propietario
    productsNearExpiry: number;      // Productos próximos a caducar
    productsExpired: number;         // Productos caducados
    averageShelfLife: number;        // Vida útil promedio
    totalTransfers: number;          // Total de transferencias
    transfersByType: { [key in TransferType]: number }; // Transferencias por tipo
}

/**
 * Respuesta estándar de las operaciones del chaincode
 */
export interface ChaincodResponse {
    success: boolean;                // Si la operación fue exitosa
    message: string;                 // Mensaje descriptivo
    data?: any;                      // Datos de respuesta si aplica
    timestamp: string;               // Momento de la respuesta (ISO string)
    transactionId?: string;          // ID de la transacción blockchain
}
