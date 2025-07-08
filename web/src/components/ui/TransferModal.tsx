/**
 * Modal de transferencia con validación direccional
 * Implementa las restricciones del repositorio de referencia:
 * Producer → Factory → Retailer → Consumer
 */

import { useState, useEffect } from 'react';
import { XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { UserRole, FoodAsset, User } from '@/types';
import { transferValidationService } from '@/services/transferValidationService';
import { walletService } from '@/services/walletService';
import { transferTokenHLF } from '@/utils/api';
import { getRoleLabel, getRoleColor } from '@/utils/helpers';
import { toast } from 'react-hot-toast';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: FoodAsset;
  currentUser: User;
  onTransferSuccess?: (updatedProduct: FoodAsset) => void;
}

export default function TransferModal({
  isOpen,
  onClose,
  product,
  currentUser,
  onTransferSuccess
}: TransferModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [targetAddress, setTargetAddress] = useState('');
  const [targetRole, setTargetRole] = useState<UserRole | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [transferInfo, setTransferInfo] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<any>(null);

  // Obtener información de transferencia para el rol actual
  useEffect(() => {
    if (currentUser.role) {
      const info = transferValidationService.getTransferInfo(currentUser.role);
      setTransferInfo(info);
    }
  }, [currentUser.role]);

  // Validar transferencia cuando cambia el rol de destino
  useEffect(() => {
    if (currentUser.role && targetRole) {
      const validation = transferValidationService.validateTransfer(
        currentUser.role,
        targetRole as UserRole
      );
      setValidationResult(validation);
    } else {
      setValidationResult(null);
    }
  }, [currentUser.role, targetRole]);

  const handleTransfer = async () => {
    if (!targetAddress || !targetRole || !currentUser.role) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    // Validar transferencia
    const validation = transferValidationService.validateTransfer(
      currentUser.role,
      targetRole as UserRole
    );

    if (!validation.isValid) {
      toast.error(validation.message);
      return;
    }

    if (quantity <= 0 || quantity > product.quantity) {
      toast.error('Cantidad inválida');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔄 Iniciando transferencia con validación direccional:', {
        from: currentUser.role,
        to: targetRole,
        product: product.id,
        quantity,
        targetAddress
      });

      // Generar firma para la transferencia
      const signature = await walletService.signTransferToken(
        product.id,
        targetAddress,
        quantity
      );

      console.log('✍️ Firma generada para transferencia:', signature);

      // Realizar transferencia en el chaincode
      const response = await transferTokenHLF(
        product.id,
        targetAddress,
        quantity,
        signature
      );

      if (response.success) {
        toast.success(`✅ Transferencia exitosa: ${currentUser.role} → ${targetRole}`);
        
        // Actualizar producto con nueva información
        const updatedProduct: FoodAsset = {
          ...product,
          currentOwner: targetAddress,
          currentOwnerRole: targetRole as UserRole,
          quantity: product.quantity - quantity,
          updatedAt: new Date().toISOString()
        };

        onTransferSuccess?.(updatedProduct);
        onClose();
      } else {
        throw new Error(response.message || 'Error en la transferencia');
      }

    } catch (error: any) {
      console.error('❌ Error en transferencia:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleOptions = () => {
    if (!transferInfo) return [];
    return transferInfo.allowedTargets;
  };

  const getDefaultAddressForRole = (role: UserRole): string => {
    const defaultWallets = walletService.constructor.getDefaultWallets();
    return defaultWallets[role]?.address || '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Transferir Producto
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Información del producto */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">{product.name}</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>ID:</strong> {product.id}</div>
              <div><strong>Cantidad disponible:</strong> {product.quantity}</div>
              <div><strong>Propietario actual:</strong> {currentUser.name} ({getRoleLabel(currentUser.role)})</div>
            </div>
          </div>

          {/* Información de cadena de transferencia */}
          {transferInfo && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">
                📋 Reglas de Transferencia
              </h4>
              <div className="text-sm text-blue-800 space-y-2">
                <div><strong>Tu rol:</strong> {getRoleLabel(currentUser.role)}</div>
                <div><strong>Descripción:</strong> {transferInfo.description}</div>
                
                {transferInfo.allowedTargets.length > 0 ? (
                  <div>
                    <strong>Puedes transferir a:</strong> {transferInfo.allowedTargets.map(role => getRoleLabel(role)).join(', ')}
                  </div>
                ) : (
                  <div className="text-orange-700">
                    ⚠️ Este rol no puede realizar transferencias (punto final de la cadena)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Formulario de transferencia */}
          {transferInfo && transferInfo.allowedTargets.length > 0 && (
            <div className="space-y-4">
              {/* Selector de rol destino */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol de destino
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => {
                    const role = e.target.value as UserRole;
                    setTargetRole(role);
                    if (role) {
                      setTargetAddress(getDefaultAddressForRole(role));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar rol...</option>
                  {getRoleOptions().map(role => (
                    <option key={role} value={role}>
                      {getRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dirección de destino */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección de destino
                </label>
                <input
                  type="text"
                  value={targetAddress}
                  onChange={(e) => setTargetAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  La dirección se autocompleta según el rol seleccionado
                </p>
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad a transferir
                </label>
                <input
                  type="number"
                  min="1"
                  max={product.quantity}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Validación de transferencia */}
              {validationResult && (
                <div className={`p-3 rounded-lg border ${
                  validationResult.isValid 
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="flex items-center space-x-2">
                    {validationResult.isValid ? (
                      <ArrowRightIcon className="w-4 h-4 text-green-600" />
                    ) : (
                      <XMarkIcon className="w-4 h-4 text-red-600" />
                    )}
                    <span className="text-sm font-medium">
                      {validationResult.message}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cadena de transferencias */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">
              🔗 Cadena de Transferencias
            </h4>
            <div className="space-y-2">
              {transferValidationService.getTransferChain().map((step, index) => (
                <div 
                  key={index}
                  className="text-sm text-gray-600 flex items-center space-x-2"
                >
                  <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-800">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 btn-secondary"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            onClick={handleTransfer}
            disabled={isLoading || !validationResult?.isValid || !targetAddress || !targetRole}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Transfiriendo...' : 'Transferir'}
          </button>
        </div>
      </div>
    </div>
  );
}