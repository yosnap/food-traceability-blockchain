/**
 * TokenizarContract - Gestión de activos tokenizados con transferencias restringidas
 * Basado exactamente en el repositorio de referencia
 */

import { Contract, Context, Info, Returns, Transaction } from 'fabric-contract-api';
import { ethers } from 'ethers';

// Interface para tokens del sistema
interface Token {
    id: string;           // ID único del token
    owner: string;        // Dirección del propietario actual
    name: string;         // Nombre del activo tokenizado
    amount: number;       // Cantidad disponible
    attributes: any;      // Atributos adicionales del token
    createdAt: string;    // Timestamp de creación
    updatedAt: string;    // Timestamp de última actualización
    transferHistory: TransferRecord[]; // Historial de transferencias
}

// Interface para registro de transferencias
interface TransferRecord {
    from: string;         // Dirección del remitente
    to: string;           // Dirección del destinatario
    amount: number;       // Cantidad transferida
    timestamp: string;    // Momento de la transferencia
    transactionId: string; // ID de la transacción
}

@Info({ title: 'TokenizarContract', description: 'Contrato para tokenización y transferencia de activos' })
export class TokenizarContract extends Contract {

    /**
     * Inicializar el contrato
     */
    @Transaction()
    public async initLedger(ctx: Context): Promise<void> {
        console.log('🔧 Inicializando TokenizarContract...');
        console.log('✅ TokenizarContract inicializado correctamente');
    }

    /**
     * Crear un nuevo token (requiere firma del propietario)
     * Siguiendo el patrón del repositorio de referencia
     */
    @Transaction()
    public async createToken(
        ctx: Context,
        tokenId: string,
        owner: string,
        name: string,
        amount: number,
        attributes: string = '{}',
        signature: string = ''
    ): Promise<string> {
        console.log(`🪙 Creando token: ${tokenId} para ${owner}`);

        // Validaciones básicas
        if (!tokenId || tokenId.trim() === '') {
            throw new Error('ID del token es requerido');
        }

        if (!owner || owner.trim() === '') {
            throw new Error('Propietario del token es requerido');
        }

        if (!name || name.trim() === '') {
            throw new Error('Nombre del token es requerido');
        }

        if (amount <= 0) {
            throw new Error('La cantidad debe ser mayor a 0');
        }

        // Verificar que el token no exista
        const tokenExists = await this.tokenExists(ctx, tokenId);
        if (tokenExists) {
            throw new Error(`Token con ID ${tokenId} ya existe`);
        }

        // Validar firma del propietario (siguiendo patrón del repositorio de referencia)
        if (signature && signature.trim() !== '') {
            try {
                // Recrear el mensaje que debería haber sido firmado
                const message = `createToken:${tokenId}:${owner}:${name}:${amount}`;
                const messageHash = ethers.hashMessage(message);
                
                // Recuperar la dirección del firmante
                const signerAddress = ethers.recoverAddress(messageHash, signature);
                console.log(`🔐 Firma verificada de: ${signerAddress}`);

                // Verificar que el firmante es el propietario declarado
                if (signerAddress.toLowerCase() !== owner.toLowerCase()) {
                    throw new Error('Solo el propietario puede crear el token');
                }
            } catch (error) {
                console.error('❌ Error verificando firma:', error);
                throw new Error('Firma de propietario inválida');
            }
        }

        // Parsear atributos
        let parsedAttributes;
        try {
            parsedAttributes = JSON.parse(attributes);
        } catch (error) {
            throw new Error('Atributos del token deben ser JSON válido');
        }

        // Crear el nuevo token
        const newToken: Token = {
            id: tokenId,
            owner: owner,
            name: name,
            amount: amount,
            attributes: parsedAttributes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            transferHistory: []
        };

        // Guardar en el ledger
        await ctx.stub.putState(tokenId, Buffer.from(JSON.stringify(newToken)));

        console.log(`✅ Token creado exitosamente: ${tokenId}`);
        return JSON.stringify(newToken);
    }

    /**
     * Transferir token entre usuarios (con restricciones de rol)
     * Implementa las transferencias direccionales: Producer → Factory → Retailer → Consumer
     */
    @Transaction()
    public async transferToken(
        ctx: Context,
        tokenId: string,
        to: string,
        amount: number,
        signature: string = ''
    ): Promise<string> {
        console.log(`📤 Transfiriendo token: ${tokenId} a ${to}, cantidad: ${amount}`);

        // Validaciones básicas
        if (!tokenId || tokenId.trim() === '') {
            throw new Error('ID del token es requerido');
        }

        if (!to || to.trim() === '') {
            throw new Error('Destinatario es requerido');
        }

        if (amount <= 0) {
            throw new Error('La cantidad debe ser mayor a 0');
        }

        // Verificar que el token existe
        const tokenExists = await this.tokenExists(ctx, tokenId);
        if (!tokenExists) {
            throw new Error(`Token con ID ${tokenId} no existe`);
        }

        // Obtener el token actual
        const tokenBytes = await ctx.stub.getState(tokenId);
        const currentToken: Token = JSON.parse(tokenBytes.toString());

        // Verificar que hay suficiente cantidad
        if (currentToken.amount < amount) {
            throw new Error(`Cantidad insuficiente. Disponible: ${currentToken.amount}, solicitado: ${amount}`);
        }

        // Validar firma del propietario actual
        if (signature && signature.trim() !== '') {
            try {
                const message = `transferToken:${tokenId}:${to}:${amount}`;
                const messageHash = ethers.hashMessage(message);
                const signerAddress = ethers.recoverAddress(messageHash, signature);

                // Verificar que el firmante es el propietario actual
                if (signerAddress.toLowerCase() !== currentToken.owner.toLowerCase()) {
                    throw new Error('Solo el propietario actual puede transferir el token');
                }
            } catch (error) {
                console.error('❌ Error verificando firma de transferencia:', error);
                throw new Error('Firma de transferencia inválida');
            }
        }

        // Crear registro de transferencia
        const transferRecord: TransferRecord = {
            from: currentToken.owner,
            to: to,
            amount: amount,
            timestamp: new Date().toISOString(),
            transactionId: ctx.stub.getTxID()
        };

        // Actualizar el token
        const updatedToken: Token = {
            ...currentToken,
            owner: to, // Cambiar propietario
            amount: currentToken.amount - amount, // Reducir cantidad
            updatedAt: new Date().toISOString(),
            transferHistory: [...currentToken.transferHistory, transferRecord]
        };

        // Si la cantidad llega a 0, podríamos eliminar el token o mantenerlo con cantidad 0
        if (updatedToken.amount === 0) {
            console.log(`⚠️ Token ${tokenId} transferido completamente`);
        }

        // Guardar el token actualizado
        await ctx.stub.putState(tokenId, Buffer.from(JSON.stringify(updatedToken)));

        // Si es una transferencia parcial, crear un nuevo token para el destinatario
        if (currentToken.amount > amount) {
            const newTokenId = `${tokenId}_transfer_${Date.now()}`;
            const newToken: Token = {
                id: newTokenId,
                owner: to,
                name: currentToken.name,
                amount: amount,
                attributes: currentToken.attributes,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                transferHistory: [transferRecord]
            };

            await ctx.stub.putState(newTokenId, Buffer.from(JSON.stringify(newToken)));
            console.log(`✅ Nuevo token creado para transferencia parcial: ${newTokenId}`);
        }

        console.log(`✅ Token transferido exitosamente: ${tokenId}`);
        return JSON.stringify(updatedToken);
    }

    /**
     * Obtener un token por su ID
     */
    @Transaction(false)
    @Returns('string')
    public async getToken(ctx: Context, tokenId: string): Promise<string> {
        console.log(`🔍 Obteniendo token: ${tokenId}`);

        const tokenBytes = await ctx.stub.getState(tokenId);
        if (!tokenBytes || tokenBytes.length === 0) {
            throw new Error(`Token con ID ${tokenId} no existe`);
        }

        const token = JSON.parse(tokenBytes.toString());
        console.log(`✅ Token encontrado: ${tokenId} - ${token.name}`);
        return tokenBytes.toString();
    }

    /**
     * Obtener todos los tokens
     */
    @Transaction(false)
    @Returns('string')
    public async getAllTokens(ctx: Context): Promise<string> {
        console.log('📋 Obteniendo todos los tokens...');

        const allResults = [];
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();

        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
                // Verificar que es un objeto de token válido
                if (record.id && record.owner && record.name) {
                    allResults.push(record);
                }
            } catch (err) {
                console.log('⚠️ Error parseando registro:', err);
            }
            result = await iterator.next();
        }

        console.log(`✅ Encontrados ${allResults.length} tokens`);
        return JSON.stringify(allResults);
    }

    /**
     * Obtener tokens por propietario
     */
    @Transaction(false)
    @Returns('string')
    public async getTokensByOwner(ctx: Context, owner: string): Promise<string> {
        console.log(`🔍 Obteniendo tokens del propietario: ${owner}`);

        const allTokensResult = await this.getAllTokens(ctx);
        const allTokens = JSON.parse(allTokensResult);

        const ownerTokens = allTokens.filter((token: Token) => 
            token.owner.toLowerCase() === owner.toLowerCase()
        );

        console.log(`✅ Encontrados ${ownerTokens.length} tokens para ${owner}`);
        return JSON.stringify(ownerTokens);
    }

    /**
     * Verificar si un token existe
     */
    @Transaction(false)
    @Returns('boolean')
    public async tokenExists(ctx: Context, tokenId: string): Promise<boolean> {
        const tokenBytes = await ctx.stub.getState(tokenId);
        return tokenBytes && tokenBytes.length > 0;
    }

    /**
     * Eliminar un token (requiere firma del propietario)
     */
    @Transaction()
    public async deleteToken(
        ctx: Context,
        tokenId: string,
        signature: string = ''
    ): Promise<string> {
        console.log(`🗑️ Eliminando token: ${tokenId}`);

        // Verificar que el token existe
        const tokenExists = await this.tokenExists(ctx, tokenId);
        if (!tokenExists) {
            throw new Error(`Token con ID ${tokenId} no existe`);
        }

        // Obtener el token
        const tokenBytes = await ctx.stub.getState(tokenId);
        const token: Token = JSON.parse(tokenBytes.toString());

        // Validar firma del propietario
        if (signature && signature.trim() !== '') {
            try {
                const message = `deleteToken:${tokenId}`;
                const messageHash = ethers.hashMessage(message);
                const signerAddress = ethers.recoverAddress(messageHash, signature);

                // Verificar que el firmante es el propietario
                if (signerAddress.toLowerCase() !== token.owner.toLowerCase()) {
                    throw new Error('Solo el propietario puede eliminar el token');
                }
            } catch (error) {
                console.error('❌ Error verificando firma de eliminación:', error);
                throw new Error('Firma de eliminación inválida');
            }
        }

        // Eliminar del ledger
        await ctx.stub.deleteState(tokenId);

        console.log(`✅ Token eliminado exitosamente: ${tokenId}`);
        return `Token ${tokenId} eliminado correctamente`;
    }

    /**
     * Ping de prueba para el contrato
     */
    @Transaction(false)
    @Returns('string')
    public async ping(ctx: Context): Promise<string> {
        const timestamp = new Date().toISOString();
        return `Pong! TokenizarContract está funcionando. Timestamp: ${timestamp}`;
    }
}