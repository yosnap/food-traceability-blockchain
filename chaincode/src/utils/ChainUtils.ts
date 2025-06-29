/**
 * Utilidades específicas para operaciones de blockchain
 * Food Traceability Blockchain Platform
 */

import { Context } from 'fabric-contract-api';

/**
 * Clase de utilidades para operaciones de blockchain
 */
export class ChainUtils {

    /**
     * Obtiene el ID del cliente que está ejecutando la transacción
     */
    static getClientId(ctx: Context): string {
        const clientId = ctx.clientIdentity.getID();
        if (!clientId) {
            throw new Error('No se pudo obtener el ID del cliente');
        }
        return clientId;
    }

    /**
     * Obtiene el MSP ID (Membership Service Provider) del cliente
     */
    static getMSPId(ctx: Context): string {
        const mspId = ctx.clientIdentity.getMSPID();
        if (!mspId) {
            throw new Error('No se pudo obtener el MSP ID');
        }
        return mspId;
    }

    /**
     * Verifica si el cliente actual tiene un atributo específico
     */
    static hasAttribute(ctx: Context, attributeName: string): boolean {
        try {
            const attributeValue = ctx.clientIdentity.getAttributeValue(attributeName);
            return attributeValue !== null;
        } catch (error) {
            return false;
        }
    }

    /**
     * Obtiene el valor de un atributo del cliente
     */
    static getAttributeValue(ctx: Context, attributeName: string): string | null {
        try {
            return ctx.clientIdentity.getAttributeValue(attributeName);
        } catch (error) {
            return null;
        }
    }

    /**
     * Verifica si el cliente actual tiene un rol específico
     */
    static hasRole(ctx: Context, roleName: string): boolean {
        return this.hasAttribute(ctx, 'role') &&
               this.getAttributeValue(ctx, 'role') === roleName;
    }

    /**
     * Genera un ID único basado en timestamp y datos adicionales
     */
    static generateUniqueId(prefix: string = '', suffix: string = ''): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `${prefix}${timestamp}_${random}${suffix}`;
    }

    /**
     * Construye una clave compuesta para consultas
     */
    static createCompositeKey(ctx: Context, objectType: string, attributes: string[]): string {
        return ctx.stub.createCompositeKey(objectType, attributes);
    }

    /**
     * Divide una clave compuesta
     */
    static splitCompositeKey(ctx: Context, compositeKey: string): { objectType: string; attributes: string[] } {
        return ctx.stub.splitCompositeKey(compositeKey);
    }

    /**
     * Obtiene el timestamp de la transacción actual
     */
    static getTransactionTimestamp(ctx: Context): Date {
        const timestamp = ctx.stub.getTxTimestamp();
        return new Date(timestamp.seconds.toNumber() * 1000);
    }

    /**
     * Obtiene el ID de la transacción actual
     */
    static getTransactionId(ctx: Context): string {
        return ctx.stub.getTxID();
    }

    /**
     * Verifica si un asset existe en el ledger
     */
    static async assetExists(ctx: Context, assetId: string): Promise<boolean> {
        try {
            const assetBuffer = await ctx.stub.getState(assetId);
            return !!assetBuffer && assetBuffer.length > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Obtiene un asset del ledger y lo parsea como JSON
     */
    static async getAssetFromLedger<T>(ctx: Context, assetId: string): Promise<T> {
        const assetBuffer = await ctx.stub.getState(assetId);

        if (!assetBuffer || assetBuffer.length === 0) {
            throw new Error(`Asset ${assetId} no existe`);
        }

        try {
            return JSON.parse(assetBuffer.toString()) as T;
        } catch (error: any) {
            throw new Error(`Error al parsear asset ${assetId}: ${error.message}`);
        }
    }

    /**
     * Guarda un asset en el ledger
     */
    static async putAssetToLedger(ctx: Context, assetId: string, asset: any): Promise<void> {
        try {
            const assetBuffer = Buffer.from(JSON.stringify(asset));
            await ctx.stub.putState(assetId, assetBuffer);
        } catch (error: any) {
            throw new Error(`Error al guardar asset ${assetId}: ${error.message}`);
        }
    }

    /**
     * Elimina un asset del ledger
     */
    static async deleteAssetFromLedger(ctx: Context, assetId: string): Promise<void> {
        const exists = await this.assetExists(ctx, assetId);
        if (!exists) {
            throw new Error(`Asset ${assetId} no existe`);
        }

        try {
            await ctx.stub.deleteState(assetId);
        } catch (error: any) {
            throw new Error(`Error al eliminar asset ${assetId}: ${error.message}`);
        }
    }

    /**
     * Ejecuta una consulta rica (rich query) usando CouchDB
     */
    static async executeRichQuery<T>(ctx: Context, queryString: string): Promise<T[]> {
        try {
            const resultsIterator = await ctx.stub.getQueryResult(queryString);
            const results: T[] = [];

            let result = await resultsIterator.next();
            while (!result.done) {
                const record = result.value;
                if (record.value && record.value.toString()) {
                    try {
                        const asset = JSON.parse(record.value.toString()) as T;
                        results.push(asset);
                    } catch (parseError: any) {
                        console.warn(`Error al parsear resultado de consulta: ${parseError.message}`);
                    }
                }
                result = await resultsIterator.next();
            }

            return results;
        } catch (error: any) {
            throw new Error(`Error en consulta rica: ${error.message}`);
        }
    }

    /**
     * Obtiene el historial de cambios de un asset
     */
    static async getAssetHistory(ctx: Context, assetId: string): Promise<any[]> {
        try {
            const resultsIterator = await ctx.stub.getHistoryForKey(assetId);
            const history: any[] = [];

            let result = await resultsIterator.next();
            while (!result.done) {
                const record = result.value;

                const historyRecord = {
                    txId: record.txId,
                    timestamp: new Date(record.timestamp.seconds.toNumber() * 1000),
                    isDelete: record.isDelete,
                    value: record.isDelete ? null : JSON.parse(record.value.toString())
                };

                history.push(historyRecord);
                result = await resultsIterator.next();
            }

            return history;
        } catch (error: any) {
            throw new Error(`Error al obtener historial de ${assetId}: ${error.message}`);
        }
    }

    /**
     * Emite un evento personalizado
     */
    static emitEvent(ctx: Context, eventName: string, payload: any): void {
        try {
            const eventPayload = Buffer.from(JSON.stringify(payload));
            ctx.stub.setEvent(eventName, eventPayload);
        } catch (error: any) {
            console.warn(`Error al emitir evento ${eventName}: ${error.message}`);
        }
    }

    /**
     * Valida que el cliente actual tenga permisos para una operación
     */
    static validateClientPermissions(ctx: Context, requiredRole?: string, requiredMSP?: string): void {
        const clientId = this.getClientId(ctx);
        const mspId = this.getMSPId(ctx);

        if (requiredMSP && mspId !== requiredMSP) {
            throw new Error(`Acceso denegado: se requiere MSP ${requiredMSP}, pero cliente tiene ${mspId}`);
        }

        if (requiredRole && !this.hasRole(ctx, requiredRole)) {
            throw new Error(`Acceso denegado: se requiere rol ${requiredRole}`);
        }
    }

    /**
     * Construye un selector de consulta para CouchDB
     */
    static buildQuerySelector(filters: { [key: string]: any }): string {
        const selector: any = {};

        for (const [key, value] of Object.entries(filters)) {
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    selector[key] = { $in: value };
                } else if (typeof value === 'object' && value.operator) {
                    selector[key] = { [value.operator]: value.value };
                } else {
                    selector[key] = value;
                }
            }
        }

        return JSON.stringify({ selector });
    }

    /**
     * Paginación para consultas grandes
     */
    static async executeQueryWithPagination<T>(
        ctx: Context,
        queryString: string,
        pageSize: number = 25,
        bookmark?: string
    ): Promise<{ results: T[]; bookmark: string; hasMore: boolean }> {
        try {
            const { iterator, metadata } = await ctx.stub.getQueryResultWithPagination(
                queryString,
                pageSize,
                bookmark
            );

            const results: T[] = [];
            let result = await iterator.next();

            while (!result.done) {
                const record = result.value;
                if (record.value && record.value.toString()) {
                    try {
                        const asset = JSON.parse(record.value.toString()) as T;
                        results.push(asset);
                    } catch (parseError: any) {
                        console.warn(`Error al parsear resultado: ${parseError.message}`);
                    }
                }
                result = await iterator.next();
            }

            return {
                results,
                bookmark: metadata.bookmark,
                hasMore: metadata.fetchedRecordsCount === pageSize
            };
        } catch (error:any) {
            throw new Error(`Error en consulta paginada: ${error.message}`);
        }
    }
}
