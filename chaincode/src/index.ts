/**
 * Punto de entrada principal del chaincode
 * Food Traceability Blockchain Platform
 */

import { type Contract } from 'fabric-contract-api';
import { SimpleContract } from './contracts/SimpleContract';
import { TokenizarContract } from './contracts/TokenizarContract';
import { FoodTraceabilityContract } from './contracts/FoodTraceabilityContract';

// Export múltiples contratos para transferencias
export const contracts: typeof Contract[] = [
    SimpleContract,
    TokenizarContract,
    FoodTraceabilityContract
];

// Export de contratos
export { SimpleContract } from './contracts/SimpleContract';
export { TokenizarContract } from './contracts/TokenizarContract';
export { FoodTraceabilityContract } from './contracts/FoodTraceabilityContract';