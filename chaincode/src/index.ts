/**
 * Punto de entrada principal del chaincode
 * Food Traceability Blockchain Platform
 */

import { type Contract } from 'fabric-contract-api';
import { FoodTraceabilityContract, UserContract } from './contracts';

// Export estándar para CCAAS según fabric-samples
export const contracts: typeof Contract[] = [FoodTraceabilityContract, UserContract];

// También exportamos las interfaces para TypeScript
export { FoodTraceabilityContract, UserContract } from './contracts';
export * from './models';
export * from './utils';