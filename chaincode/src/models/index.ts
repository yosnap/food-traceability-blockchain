/**
 * Exportación central de todos los modelos de datos
 * Food Traceability Blockchain Platform
 */

// Exportar todas las interfaces y enums desde FoodModels
export {
    // Enumeraciones
    FoodCategory,
    FoodStatus,
    UserRole,
    TransferType,
    
    // Interfaces principales
    FoodAsset,
    User,
    Transfer,
    
    // Interfaces de información
    Location,
    OriginInfo,
    StorageConditions,
    TemperatureRecord,
    NutritionalInfo,
    Certification,
    NotificationSettings,
    
    // Interfaces de consulta y respuesta
    ExpiryQuery,
    ExpiringProduct,
    SupplyChainStats,
    ChaincodResponse
} from './FoodModels';

// Re-exportar tipos útiles para TypeScript
export type {
    FoodAsset as IFoodAsset,
    User as IUser,
    Transfer as ITransfer,
    Location as ILocation,
    OriginInfo as IOriginInfo,
    StorageConditions as IStorageConditions,
    TemperatureRecord as ITemperatureRecord,
    NutritionalInfo as INutritionalInfo,
    Certification as ICertification,
    NotificationSettings as INotificationSettings,
    ExpiryQuery as IExpiryQuery,
    ExpiringProduct as IExpiringProduct,
    SupplyChainStats as ISupplyChainStats,
    ChaincodResponse as IChaincodResponse
} from './FoodModels';