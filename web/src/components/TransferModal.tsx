import { useState, useEffect } from 'react';
import { XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { Product, UserRole, TransferType } from '@/types';
import { transferProduct, getTransferRecipients } from '@/utils/api';
import { MockUser } from '@/data/mockUsers';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  fromRole: UserRole;
  onTransferComplete: (product: Product, toRole: UserRole, recipient: any) => void;
}

const roleTransitions = {
  [UserRole.PRODUCER]: [UserRole.PROCESSOR],
  [UserRole.PROCESSOR]: [UserRole.DISTRIBUTOR],
  [UserRole.DISTRIBUTOR]: [UserRole.RETAILER],
  [UserRole.RETAILER]: [UserRole.CONSUMER],
  [UserRole.CONSUMER]: [],
  [UserRole.ADMIN]: [UserRole.PRODUCER, UserRole.PROCESSOR, UserRole.DISTRIBUTOR, UserRole.RETAILER]
};

const roleNames = {
  [UserRole.PRODUCER]: 'Productor',
  [UserRole.PROCESSOR]: 'Procesador',
  [UserRole.DISTRIBUTOR]: 'Distribuidor',
  [UserRole.RETAILER]: 'Minorista',
  [UserRole.CONSUMER]: 'Consumidor',
  [UserRole.ADMIN]: 'Administrador'
};

export default function TransferModal({ isOpen, onClose, product, fromRole, onTransferComplete }: TransferModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [selectedRecipient, setSelectedRecipient] = useState<MockUser | null>(null);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableRecipients, setAvailableRecipients] = useState<MockUser[]>([]);
  const [allRecipients, setAllRecipients] = useState<Record<string, MockUser[]>>({});
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);

  // Load available recipients from API
  useEffect(() => {
    const loadRecipients = async () => {
      setIsLoadingRecipients(true);
      try {
        const response = await getTransferRecipients();
        console.log('🔍 API response:', response);
        if (response.success) {
          console.log('🔍 Recipients data:', response.data);
          setAllRecipients(response.data);
        } else {
          console.error('Error loading recipients:', response.message);
          toast.error('Error cargando destinatarios disponibles');
        }
      } catch (error: any) {
        console.error('Error loading recipients:', error);
        toast.error('Error cargando destinatarios');
      } finally {
        setIsLoadingRecipients(false);
      }
    };

    if (isOpen) {
      loadRecipients();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedRole && allRecipients) {
      // Convertir selectedRole a mayúsculas para que coincida con las claves de la API
      const roleKey = selectedRole.toString().toUpperCase();
      const recipients = allRecipients[roleKey] || [];
      console.log('🔍 TransferModal recipients mapping:', {
        selectedRole,
        roleKey,
        availableKeys: Object.keys(allRecipients),
        recipientsCount: recipients.length,
        recipients: recipients.map(r => r.name)
      });
      setAvailableRecipients(recipients);
    } else {
      setAvailableRecipients([]);
    }
  }, [selectedRole, allRecipients]);

  if (!isOpen || !product) return null;

  const availableRoles = roleTransitions[fromRole] || [];

  const handleTransfer = async () => {
    if (!selectedRole || !selectedRecipient) {
      toast.error('Por favor selecciona un destinatario');
      return;
    }

    setIsLoading(true);
    
    try {
      // Preparar datos para la API
      const transferData = {
        newOwner: selectedRecipient.walletAddress, // Usar dirección de wallet real
        transferType: TransferType.PROCESSING, // Tipo de transferencia apropiado
        location: {
          address: selectedRecipient.location,
          city: selectedRecipient.location.split(',')[1]?.trim() || 'Ciudad',
          country: 'Costa Rica'
        },
        quantity: product.quantity || 1,
        conditions: `Transferencia de ${roleNames[fromRole]} a ${roleNames[selectedRole as UserRole]}`,
        notes: notes || `Transferido a ${selectedRecipient.name}`
      };

      console.log('🔄 Enviando transferencia a la API:', transferData);
      
      // Llamar a la API real
      const response = await transferProduct(product.id, transferData);
      
      if (response.success) {
        onTransferComplete(product, selectedRole as UserRole, selectedRecipient);
        toast.success(`Producto transferido exitosamente a ${selectedRecipient.name}`);
        
        // Reset form
        setSelectedRole('');
        setSelectedRecipient(null);
        setNotes('');
        onClose();
      } else {
        throw new Error(response.message || 'Error en la transferencia');
      }
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Error al procesar la transferencia';
      toast.error(errorMessage);
      console.error('❌ Transfer error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Transferir Producto
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Product Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-2">{product.name}</h4>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Lote:</span> {product.batchNumber}
              </div>
              <div>
                <span className="font-medium">Cantidad:</span> {product.metadata.weight}
              </div>
              <div>
                <span className="font-medium">Ubicación actual:</span> {product.currentLocation}
              </div>
              <div>
                <span className="font-medium">Estado:</span> {product.status}
              </div>
            </div>
          </div>

          {/* Transfer Flow */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {roleNames[fromRole]}
              </div>
              <ArrowRightIcon className="w-5 h-5 text-gray-400" />
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                {selectedRole ? roleNames[selectedRole as UserRole] : 'Seleccionar destino'}
              </div>
            </div>
          </div>

          {/* Role Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transferir a:
            </label>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value as UserRole);
                setSelectedRecipient(null);
              }}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar rol de destino</option>
              {availableRoles.map(role => (
                <option key={role} value={role}>
                  {roleNames[role]}
                </option>
              ))}
            </select>
          </div>

          {/* Recipient Selection */}
          {selectedRole && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar destinatario:
              </label>
              {isLoadingRecipients ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                  Cargando destinatarios...
                </div>
              ) : availableRecipients.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No hay destinatarios disponibles para {roleNames[selectedRole as UserRole]}
                </div>
              ) : (
                <div className="space-y-2">
                  {availableRecipients.map(recipient => (
                  <div
                    key={recipient.id}
                    onClick={() => setSelectedRecipient(recipient)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedRecipient?.id === recipient.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{recipient.name}</div>
                    <div className="text-sm text-gray-600">{recipient.location}</div>
                    <div className="text-xs text-gray-500">{recipient.organization}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      <span className="font-mono">{recipient.walletAddress.slice(0, 6)}...{recipient.walletAddress.slice(-4)}</span>
                    </div>
                  </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas adicionales (opcional):
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Instrucciones especiales, condiciones de transporte, etc."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleTransfer}
              disabled={!selectedRole || !selectedRecipient || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Procesando...' : 'Confirmar Transferencia'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}