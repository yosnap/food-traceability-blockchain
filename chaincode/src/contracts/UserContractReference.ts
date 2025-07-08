/**
 * UserContract - Gestión de usuarios con autenticación por firma
 * Basado exactamente en el repositorio de referencia
 */

import { Contract, Context, Info, Returns, Transaction } from 'fabric-contract-api';
import { ethers } from 'ethers';

// Interface para usuarios del sistema
interface User {
    address: string;    // Dirección Ethereum del usuario
    role: string;       // Rol del usuario (producer, factory, retailer, consumer)
    createdAt: string;  // Timestamp de creación
    updatedAt: string;  // Timestamp de última actualización
}

@Info({ title: 'UserContract', description: 'Contrato para gestión de usuarios con autenticación por firma' })
export class UserContractReference extends Contract {

    /**
     * Inicializar el contrato con un usuario administrador
     */
    @Transaction()
    public async initLedger(ctx: Context): Promise<void> {
        console.log('🔧 Inicializando UserContract...');

        // Crear usuario administrador inicial
        const adminUser: User = {
            address: '0x742d35Cc8C6C330B4E3C2986c9b6C02b4C8B878A',
            role: 'admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await ctx.stub.putState(adminUser.address, Buffer.from(JSON.stringify(adminUser)));
        console.log('✅ Usuario administrador creado:', adminUser.address);
    }

    /**
     * Crear un nuevo usuario (requiere firma del administrador)
     * Siguiendo el patrón del repositorio de referencia con ethers.js
     */
    @Transaction()
    public async createUser(
        ctx: Context,
        address: string,
        role: string,
        adminSignature: string = ''
    ): Promise<string> {
        console.log(`👤 Creando usuario: ${address} con rol: ${role}`);

        // Validar que la dirección no esté vacía
        if (!address || address.trim() === '') {
            throw new Error('La dirección del usuario es requerida');
        }

        // Validar que el rol sea válido
        const validRoles = ['producer', 'factory', 'retailer', 'consumer', 'admin'];
        if (!validRoles.includes(role.toLowerCase())) {
            throw new Error(`Rol inválido. Roles válidos: ${validRoles.join(', ')}`);
        }

        // Verificar que el usuario no exista
        const userExists = await this.userExists(ctx, address);
        if (userExists) {
            throw new Error(`Usuario con dirección ${address} ya existe`);
        }

        // Validar firma del administrador (siguiendo patrón del repositorio de referencia)
        if (adminSignature && adminSignature.trim() !== '') {
            try {
                // Recrear el mensaje que debería haber sido firmado
                const message = `createUser:${address}:${role}`;
                const messageHash = ethers.hashMessage(message);
                
                // Recuperar la dirección del firmante
                const signerAddress = ethers.recoverAddress(messageHash, adminSignature);
                console.log(`🔐 Firma verificada de: ${signerAddress}`);

                // Verificar que el firmante es un administrador
                const signerUser = await this.getUser(ctx, signerAddress);
                if (!signerUser || JSON.parse(signerUser).role !== 'admin') {
                    throw new Error('Solo administradores pueden crear usuarios');
                }
            } catch (error) {
                console.error('❌ Error verificando firma:', error);
                throw new Error('Firma de administrador inválida');
            }
        }

        // Crear el nuevo usuario
        const newUser: User = {
            address: address,
            role: role.toLowerCase(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Guardar en el ledger
        await ctx.stub.putState(address, Buffer.from(JSON.stringify(newUser)));

        console.log(`✅ Usuario creado exitosamente: ${address}`);
        return JSON.stringify(newUser);
    }

    /**
     * Obtener un usuario por su dirección
     */
    @Transaction(false)
    @Returns('string')
    public async getUser(ctx: Context, address: string): Promise<string> {
        console.log(`🔍 Obteniendo usuario: ${address}`);

        const userBytes = await ctx.stub.getState(address);
        if (!userBytes || userBytes.length === 0) {
            throw new Error(`Usuario con dirección ${address} no existe`);
        }

        const user = JSON.parse(userBytes.toString());
        console.log(`✅ Usuario encontrado: ${address} - ${user.role}`);
        return userBytes.toString();
    }

    /**
     * Actualizar un usuario existente (requiere firma del propietario o admin)
     */
    @Transaction()
    public async updateUser(
        ctx: Context,
        address: string,
        newRole: string,
        signature: string = ''
    ): Promise<string> {
        console.log(`📝 Actualizando usuario: ${address} a rol: ${newRole}`);

        // Verificar que el usuario existe
        const userExists = await this.userExists(ctx, address);
        if (!userExists) {
            throw new Error(`Usuario con dirección ${address} no existe`);
        }

        // Validar el nuevo rol
        const validRoles = ['producer', 'factory', 'retailer', 'consumer', 'admin'];
        if (!validRoles.includes(newRole.toLowerCase())) {
            throw new Error(`Rol inválido. Roles válidos: ${validRoles.join(', ')}`);
        }

        // Validar firma (usuario propietario o admin)
        if (signature && signature.trim() !== '') {
            try {
                const message = `updateUser:${address}:${newRole}`;
                const messageHash = ethers.hashMessage(message);
                const signerAddress = ethers.recoverAddress(messageHash, signature);

                // Verificar que el firmante es el propietario o un admin
                if (signerAddress !== address) {
                    const signerUser = await this.getUser(ctx, signerAddress);
                    if (!signerUser || JSON.parse(signerUser).role !== 'admin') {
                        throw new Error('Solo el propietario o un administrador pueden actualizar el usuario');
                    }
                }
            } catch (error) {
                console.error('❌ Error verificando firma de actualización:', error);
                throw new Error('Firma de autorización inválida');
            }
        }

        // Obtener el usuario actual
        const currentUserBytes = await ctx.stub.getState(address);
        const currentUser: User = JSON.parse(currentUserBytes.toString());

        // Actualizar el usuario
        const updatedUser: User = {
            ...currentUser,
            role: newRole.toLowerCase(),
            updatedAt: new Date().toISOString()
        };

        // Guardar en el ledger
        await ctx.stub.putState(address, Buffer.from(JSON.stringify(updatedUser)));

        console.log(`✅ Usuario actualizado exitosamente: ${address}`);
        return JSON.stringify(updatedUser);
    }

    /**
     * Eliminar un usuario (requiere firma de administrador)
     */
    @Transaction()
    public async deleteUser(
        ctx: Context,
        address: string,
        adminSignature: string = ''
    ): Promise<string> {
        console.log(`🗑️ Eliminando usuario: ${address}`);

        // Verificar que el usuario existe
        const userExists = await this.userExists(ctx, address);
        if (!userExists) {
            throw new Error(`Usuario con dirección ${address} no existe`);
        }

        // Validar firma del administrador
        if (adminSignature && adminSignature.trim() !== '') {
            try {
                const message = `deleteUser:${address}`;
                const messageHash = ethers.hashMessage(message);
                const signerAddress = ethers.recoverAddress(messageHash, adminSignature);

                // Verificar que el firmante es un administrador
                const signerUser = await this.getUser(ctx, signerAddress);
                if (!signerUser || JSON.parse(signerUser).role !== 'admin') {
                    throw new Error('Solo administradores pueden eliminar usuarios');
                }
            } catch (error) {
                console.error('❌ Error verificando firma de eliminación:', error);
                throw new Error('Firma de administrador inválida para eliminación');
            }
        }

        // Eliminar del ledger
        await ctx.stub.deleteState(address);

        console.log(`✅ Usuario eliminado exitosamente: ${address}`);
        return `Usuario ${address} eliminado correctamente`;
    }

    /**
     * Obtener todos los usuarios del sistema
     */
    @Transaction(false)
    @Returns('string')
    public async getAllUsers(ctx: Context): Promise<string> {
        console.log('📋 Obteniendo todos los usuarios...');

        const allResults = [];
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();

        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
                // Verificar que es un objeto de usuario válido
                if (record.address && record.role) {
                    allResults.push(record);
                }
            } catch (err) {
                console.log('⚠️ Error parseando registro:', err);
            }
            result = await iterator.next();
        }

        console.log(`✅ Encontrados ${allResults.length} usuarios`);
        return JSON.stringify(allResults);
    }

    /**
     * Obtener usuarios por rol específico
     */
    @Transaction(false)
    @Returns('string')
    public async getUsersByRole(ctx: Context, role: string): Promise<string> {
        console.log(`🔍 Obteniendo usuarios con rol: ${role}`);

        const allUsersResult = await this.getAllUsers(ctx);
        const allUsers = JSON.parse(allUsersResult);

        const usersByRole = allUsers.filter((user: User) => 
            user.role.toLowerCase() === role.toLowerCase()
        );

        console.log(`✅ Encontrados ${usersByRole.length} usuarios con rol ${role}`);
        return JSON.stringify(usersByRole);
    }

    /**
     * Verificar si un usuario existe
     */
    @Transaction(false)
    @Returns('boolean')
    public async userExists(ctx: Context, address: string): Promise<boolean> {
        const userBytes = await ctx.stub.getState(address);
        return userBytes && userBytes.length > 0;
    }

    /**
     * Ping de prueba para el contrato
     */
    @Transaction(false)
    @Returns('string')
    public async ping(ctx: Context): Promise<string> {
        const timestamp = new Date().toISOString();
        return `Pong! UserContract está funcionando. Timestamp: ${timestamp}`;
    }
}