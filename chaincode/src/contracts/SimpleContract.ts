/**
 * Contrato simplificado basado en el TokenizarContract de referencia
 */

import { Contract, Context, Info, Returns, Transaction } from 'fabric-contract-api';

@Info({
    title: 'SimpleContract',
    description: 'Contrato simple para crear productos'
})
export class SimpleContract extends Contract {

    constructor() {
        super('SimpleContract');
    }

    /**
     * Función ping simplificada
     */
    @Transaction(false)
    @Returns('string')
    public async ping(ctx: Context): Promise<string> {
        return `Pong! SimpleContract funciona. Timestamp: ${new Date().toISOString()}`;
    }

    /**
     * Crear producto simple como token
     */
    @Transaction()
    public async createProduct(
        ctx: Context,
        tokenId: string,
        ownerAddress: string,
        name: string,
        amount: number,
        attributesJSON: string
    ): Promise<string> {

        console.log(`🔧 Creando producto: ${tokenId} para ${ownerAddress}`);

        // Validar parámetros básicos
        if (!tokenId || !ownerAddress || !name || amount <= 0) {
            throw new Error('Parámetros inválidos');
        }

        // Parsear atributos
        let attributes: any;
        try {
            attributes = JSON.parse(attributesJSON);
        } catch (error) {
            throw new Error('JSON de atributos inválido');
        }

        // Crear clave única
        const key = `product:${tokenId}:${ownerAddress}`;
        
        // Verificar existencia
        const existingBytes = await ctx.stub.getState(key);
        if (existingBytes && existingBytes.length > 0) {
            throw new Error(`Producto ${tokenId} ya existe`);
        }

        // Crear producto simple
        const timestamp = ctx.stub.getTxTimestamp();
        const createdAt = new Date(Number(timestamp.seconds) * 1000 + Math.floor(Number(timestamp.nanos) / 1000000)).toISOString();
        
        const product = {
            id: tokenId,
            owner: ownerAddress,
            name: name,
            amount: amount,
            attributes: attributes,
            createdAt: createdAt
        };

        // Guardar
        await ctx.stub.putState(key, Buffer.from(JSON.stringify(product)));

        // Emitir evento
        ctx.stub.setEvent('ProductCreated', Buffer.from(JSON.stringify({
            tokenId,
            ownerAddress,
            name,
            amount,
            timestamp: createdAt
        })));

        console.log(`✅ Producto ${tokenId} creado exitosamente`);
        return `Producto ${name} creado con ID ${tokenId}`;
    }

    /**
     * Leer producto
     */
    @Transaction(false)
    @Returns('string')
    public async readProduct(ctx: Context, tokenId: string, ownerAddress: string): Promise<string> {
        const key = `product:${tokenId}:${ownerAddress}`;
        
        const productBytes = await ctx.stub.getState(key);
        if (!productBytes || productBytes.length === 0) {
            throw new Error(`Producto ${tokenId} no encontrado`);
        }

        return productBytes.toString();
    }

    /**
     * Listar todos los productos
     */
    @Transaction(false)
    @Returns('string')
    public async getAllProducts(ctx: Context): Promise<string> {
        const iterator = await ctx.stub.getStateByRange('product:', 'product:~');
        const products = [];

        while (true) {
            const result = await iterator.next();
            if (result.value && result.value.value.toString()) {
                try {
                    const product = JSON.parse(result.value.value.toString());
                    products.push(product);
                } catch (error) {
                    console.log('Error parsing product:', error);
                }
            }
            if (result.done) {
                await iterator.close();
                break;
            }
        }

        return JSON.stringify(products);
    }

    /**
     * Obtener productos por propietario
     */
    @Transaction(false)
    @Returns('string')
    public async getProductsByOwner(ctx: Context, ownerAddress: string): Promise<string> {
        console.log(`🔍 Buscando productos para propietario: ${ownerAddress}`);
        
        if (!ownerAddress) {
            throw new Error('Dirección del propietario requerida');
        }

        const iterator = await ctx.stub.getStateByRange('product:', 'product:~');
        const products = [];

        while (true) {
            const result = await iterator.next();
            if (result.value && result.value.value.toString()) {
                try {
                    const product = JSON.parse(result.value.value.toString());
                    // Filtrar productos que pertenecen al propietario
                    if (product.owner === ownerAddress) {
                        products.push(product);
                    }
                } catch (error) {
                    console.log('Error parsing product:', error);
                }
            }
            if (result.done) {
                await iterator.close();
                break;
            }
        }

        console.log(`✅ Encontrados ${products.length} productos para ${ownerAddress}`);
        return JSON.stringify(products);
    }

    /**
     * Transferir producto entre organizaciones
     */
    @Transaction()
    public async transferProduct(
        ctx: Context,
        tokenId: string,
        fromOwner: string,
        toOwner: string,
        amount: number,
        transferType: string = 'TRANSFER',
        notes: string = ''
    ): Promise<string> {
        console.log(`🔄 Transfiriendo producto: ${tokenId} de ${fromOwner} a ${toOwner}, cantidad: ${amount}`);

        // Validar parámetros
        if (!tokenId || !fromOwner || !toOwner || amount <= 0) {
            throw new Error('Parámetros de transferencia inválidos');
        }

        // Obtener producto original
        const fromKey = `product:${tokenId}:${fromOwner}`;
        const productBytes = await ctx.stub.getState(fromKey);
        
        if (!productBytes || productBytes.length === 0) {
            throw new Error(`Producto ${tokenId} no encontrado para ${fromOwner}`);
        }

        const product = JSON.parse(productBytes.toString());

        // Verificar cantidad disponible
        if (product.amount < amount) {
            throw new Error(`Cantidad insuficiente. Disponible: ${product.amount}, Solicitado: ${amount}`);
        }

        // Usar timestamp determinístico
        const timestamp = ctx.stub.getTxTimestamp();
        const updatedAt = new Date(Number(timestamp.seconds) * 1000 + Math.floor(Number(timestamp.nanos) / 1000000)).toISOString();
        
        // Si es transferencia total, eliminar producto original
        if (product.amount === amount) {
            await ctx.stub.deleteState(fromKey);
        } else {
            // Transferencia parcial - reducir cantidad original
            product.amount -= amount;
            product.updatedAt = updatedAt;
            await ctx.stub.putState(fromKey, Buffer.from(JSON.stringify(product)));
        }

        // Crear producto para el nuevo propietario
        const toKey = `product:${tokenId}:${toOwner}`;
        
        // Verificar si ya existe producto para el destinatario
        const existingToBytes = await ctx.stub.getState(toKey);
        let transferredProduct;

        if (existingToBytes && existingToBytes.length > 0) {
            // Agregar cantidad al producto existente
            transferredProduct = JSON.parse(existingToBytes.toString());
            transferredProduct.amount += amount;
            transferredProduct.updatedAt = updatedAt;
        } else {
            // Crear nuevo producto para el destinatario
            transferredProduct = {
                ...product,
                id: tokenId,
                owner: toOwner,
                amount: amount,
                transferHistory: product.transferHistory || [],
                createdAt: product.createdAt,
                updatedAt: updatedAt
            };
        }

        // Agregar registro de transferencia
        transferredProduct.transferHistory = transferredProduct.transferHistory || [];
        transferredProduct.transferHistory.push({
            from: fromOwner,
            to: toOwner,
            amount: amount,
            transferType: transferType,
            timestamp: updatedAt,
            notes: notes
        });

        // Guardar producto transferido
        await ctx.stub.putState(toKey, Buffer.from(JSON.stringify(transferredProduct)));

        // Emitir evento de transferencia
        ctx.stub.setEvent('ProductTransferred', Buffer.from(JSON.stringify({
            tokenId,
            from: fromOwner,
            to: toOwner,
            amount,
            transferType,
            timestamp: updatedAt
        })));

        console.log(`✅ Producto ${tokenId} transferido exitosamente de ${fromOwner} a ${toOwner}`);
        return `Producto ${tokenId} transferido: ${amount} unidades de ${fromOwner} a ${toOwner}`;
    }
}