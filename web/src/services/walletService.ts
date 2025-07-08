/**
 * Servicio de Wallet con ethers.js
 * Basado en el patrón del repositorio de referencia
 */

import { ethers } from 'ethers';
import { EthersWallet, SignatureRequest, UserRole } from '@/types';

export class WalletService {
    private static instance: WalletService;
    private currentWallet: EthersWallet | null = null;

    private constructor() {}

    public static getInstance(): WalletService {
        if (!WalletService.instance) {
            WalletService.instance = new WalletService();
        }
        return WalletService.instance;
    }

    /**
     * Generar un wallet aleatorio para desarrollo/demo
     * En el repositorio de referencia, esto simularía tener un wallet Ethereum
     */
    generateRandomWallet(): EthersWallet {
        const wallet = ethers.Wallet.createRandom();
        
        const ethersWallet: EthersWallet = {
            address: wallet.address,
            privateKey: wallet.privateKey,
            publicKey: wallet.publicKey
        };

        this.currentWallet = ethersWallet;
        
        console.log('🔑 Wallet generado:', {
            address: ethersWallet.address,
            publicKey: ethersWallet.publicKey
        });

        return ethersWallet;
    }

    /**
     * Importar wallet desde clave privada
     */
    importWallet(privateKey: string): EthersWallet {
        try {
            const wallet = new ethers.Wallet(privateKey);
            
            const ethersWallet: EthersWallet = {
                address: wallet.address,
                privateKey: wallet.privateKey,
                publicKey: wallet.publicKey
            };

            this.currentWallet = ethersWallet;
            
            console.log('📥 Wallet importado:', {
                address: ethersWallet.address,
                publicKey: ethersWallet.publicKey
            });

            return ethersWallet;
        } catch (error) {
            console.error('❌ Error importando wallet:', error);
            throw new Error('Clave privada inválida');
        }
    }

    /**
     * Firmar mensaje siguiendo el patrón del repositorio de referencia
     * Esto es lo que se usa para autenticar operaciones en el chaincode
     */
    async signMessage(message: string): Promise<string> {
        if (!this.currentWallet) {
            throw new Error('No hay wallet activo');
        }

        try {
            const wallet = new ethers.Wallet(this.currentWallet.privateKey);
            const signature = await wallet.signMessage(message);
            
            console.log('✍️ Mensaje firmado:', {
                message,
                signature,
                address: wallet.address
            });

            return signature;
        } catch (error) {
            console.error('❌ Error firmando mensaje:', error);
            throw new Error('Error al firmar el mensaje');
        }
    }

    /**
     * Verificar firma de mensaje (para validación)
     */
    verifySignature(message: string, signature: string, expectedAddress: string): boolean {
        try {
            const recoveredAddress = ethers.verifyMessage(message, signature);
            const isValid = recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
            
            console.log('🔍 Verificación de firma:', {
                message,
                signature,
                expectedAddress,
                recoveredAddress,
                isValid
            });

            return isValid;
        } catch (error) {
            console.error('❌ Error verificando firma:', error);
            return false;
        }
    }

    /**
     * Crear firma para crear usuario (siguiendo patrón del repositorio de referencia)
     */
    async signCreateUser(address: string, role: UserRole): Promise<string> {
        const message = `createUser:${address}:${role}`;
        return await this.signMessage(message);
    }

    /**
     * Crear firma para crear token
     */
    async signCreateToken(tokenId: string, owner: string, name: string, amount: number): Promise<string> {
        const message = `createToken:${tokenId}:${owner}:${name}:${amount}`;
        return await this.signMessage(message);
    }

    /**
     * Crear firma para transferir token
     */
    async signTransferToken(tokenId: string, to: string, amount: number): Promise<string> {
        const message = `transferToken:${tokenId}:${to}:${amount}`;
        return await this.signMessage(message);
    }

    /**
     * Crear firma para actualizar usuario
     */
    async signUpdateUser(address: string, newRole: UserRole): Promise<string> {
        const message = `updateUser:${address}:${newRole}`;
        return await this.signMessage(message);
    }

    /**
     * Crear firma para eliminar usuario
     */
    async signDeleteUser(address: string): Promise<string> {
        const message = `deleteUser:${address}`;
        return await this.signMessage(message);
    }

    /**
     * Crear firma para eliminar token
     */
    async signDeleteToken(tokenId: string): Promise<string> {
        const message = `deleteToken:${tokenId}`;
        return await this.signMessage(message);
    }

    /**
     * Obtener wallet actual
     */
    getCurrentWallet(): EthersWallet | null {
        return this.currentWallet;
    }

    /**
     * Obtener dirección actual
     */
    getCurrentAddress(): string | null {
        return this.currentWallet?.address || null;
    }

    /**
     * Verificar si hay un wallet activo
     */
    hasActiveWallet(): boolean {
        return this.currentWallet !== null;
    }

    /**
     * Limpiar wallet actual (logout)
     */
    clearWallet(): void {
        this.currentWallet = null;
        console.log('🧹 Wallet limpiado');
    }

    /**
     * Obtener wallets predefinidos por rol para demo
     * Siguiendo el patrón del repositorio de referencia
     */
    static getDefaultWallets(): Record<UserRole, EthersWallet> {
        return {
            [UserRole.ADMIN]: {
                address: '0x742d35Cc8C6C330B4E3C2986c9b6C02b4C8B878A',
                privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
                publicKey: '0x048318535b54105d4a7aae60c08fc45f9687181b4fdfc625bd1a753fa7397fed753547f11ca8696646f2f3acb08e31016afac23e630c5d11f59f61fef57b0d2aa5'
            },
            [UserRole.PRODUCER]: {
                address: '0x8ba1f109551bD432803012645Hac136c9125b6e47',
                privateKey: '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97',
                publicKey: '0x04a0beed3b7cac449d29dd9e5b84b62fb0b83b2e0c3d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2'
            },
            [UserRole.FACTORY]: {
                address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
                privateKey: '0x9b9c5a6f85c4c8a4f7b3d2e1c9b8a7f6e5d4c3b2a1908f7e6d5c4b3a2918e7f6',
                publicKey: '0x04b0feed.....' // Truncado por simplicidad
            },
            [UserRole.RETAILER]: {
                address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
                privateKey: '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d8e7f0e1c2d3e4',
                publicKey: '0x04c0deed.....' // Truncado por simplicidad
            },
            [UserRole.CONSUMER]: {
                address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
                privateKey: '0xa267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1',
                publicKey: '0x04d0eed.....' // Truncado por simplicidad
            },
            [UserRole.PROCESSOR]: {
                address: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
                privateKey: '0x8b3a350cf5c34c9194ca85829c2df0ec3153be0318b5e2d3348e872092edffba',
                publicKey: '0x04e0feed.....' // Truncado por simplicidad
            },
            [UserRole.DISTRIBUTOR]: {
                address: '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
                privateKey: '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d8e7f0e1c2d3e4',
                publicKey: '0x04f0deed.....' // Truncado por simplicidad
            }
        };
    }

    /**
     * Cargar wallet por rol (para demo/desarrollo)
     */
    loadWalletByRole(role: UserRole): EthersWallet {
        const defaultWallets = WalletService.getDefaultWallets();
        const wallet = defaultWallets[role];
        
        if (!wallet) {
            throw new Error(`No hay wallet predefinido para el rol: ${role}`);
        }

        this.currentWallet = wallet;
        console.log(`🔑 Wallet cargado para rol ${role}:`, {
            address: wallet.address
        });

        return wallet;
    }

    /**
     * Conectar con MetaMask
     */
    async connectMetaMask(): Promise<EthersWallet> {
        if (typeof window === 'undefined' || !window.ethereum) {
            throw new Error('MetaMask no está instalado. Por favor instala MetaMask para continuar.');
        }

        try {
            // Solicitar permisos para conectar
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (accounts.length === 0) {
                throw new Error('No se pudo conectar con MetaMask');
            }

            const address = accounts[0];
            
            // Para MetaMask, no tenemos acceso a la clave privada por seguridad
            // Solo usamos la dirección para identificación
            const metaMaskWallet: EthersWallet = {
                address: address,
                privateKey: '', // No disponible por seguridad
                publicKey: '' // No disponible por seguridad
            };

            this.currentWallet = metaMaskWallet;
            
            console.log('🦊 MetaMask conectado:', {
                address: address
            });

            return metaMaskWallet;
        } catch (error: any) {
            console.error('❌ Error conectando MetaMask:', error);
            if (error.code === 4001) {
                throw new Error('Conexión rechazada por el usuario');
            }
            throw new Error('Error al conectar con MetaMask: ' + error.message);
        }
    }

    /**
     * Firmar mensaje con MetaMask
     */
    async signMessageWithMetaMask(message: string): Promise<string> {
        if (typeof window === 'undefined' || !window.ethereum) {
            throw new Error('MetaMask no está disponible');
        }

        if (!this.currentWallet || !this.currentWallet.address) {
            throw new Error('No hay wallet conectado');
        }

        try {
            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [message, this.currentWallet.address]
            });

            console.log('✍️ Mensaje firmado con MetaMask:', {
                message,
                signature,
                address: this.currentWallet.address
            });

            return signature;
        } catch (error: any) {
            console.error('❌ Error firmando con MetaMask:', error);
            if (error.code === 4001) {
                throw new Error('Firma rechazada por el usuario');
            }
            throw new Error('Error al firmar con MetaMask: ' + error.message);
        }
    }

    /**
     * Verificar si MetaMask está disponible
     */
    isMetaMaskAvailable(): boolean {
        return typeof window !== 'undefined' && !!window.ethereum;
    }

    /**
     * Verificar si el wallet actual es de MetaMask
     */
    isMetaMaskWallet(): boolean {
        return this.currentWallet !== null && this.currentWallet.privateKey === '';
    }
}

// Exportar instancia singleton
export const walletService = WalletService.getInstance();