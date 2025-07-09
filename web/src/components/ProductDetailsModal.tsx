import { useState, useEffect } from 'react';
import { XMarkIcon, ClockIcon, MapPinIcon, BeakerIcon, CheckCircleIcon, TruckIcon } from '@heroicons/react/24/outline';
import { Product } from '@/types';
import SafeDate from '@/components/SafeDate';

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export default function ProductDetailsModal({ isOpen, onClose, product }: ProductDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');

  useEffect(() => {
    if (isOpen) {
      setActiveTab('info');
    }
  }, [isOpen]);

  if (!isOpen || !product) return null;

  // Mock transfer history - in a real app this would come from the blockchain
  const transferHistory = product.transferHistory || [
    {
      from: 'Productor Original',
      to: 'Procesador Actual',
      timestamp: new Date().toISOString(),
      transferType: 'PROCESSING',
      notes: 'Transferencia para procesamiento'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Detalles del Producto
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'info'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Información General
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'history'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Historial de Transferencias
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'info' ? (
            <div className="space-y-6">
              {/* Product Header */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BeakerIcon className="w-8 h-8 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">{product.name}</h4>
                    <p className="text-gray-600">Lote: {product.batchNumber}</p>
                  </div>
                  <div className="ml-auto">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      <CheckCircleIcon className="w-4 h-4 mr-1" />
                      {product.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Basic Information */}
              <div>
                <h5 className="text-lg font-medium text-gray-900 mb-4">Información Básica</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">ID del Producto</p>
                    <p className="font-medium">{product.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Categoría</p>
                    <p className="font-medium">{product.metadata.category || 'Procesado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Peso</p>
                    <p className="font-medium">{product.metadata.weight}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cantidad</p>
                    <p className="font-medium">{product.quantity || 1} unidades</p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div>
                <h5 className="text-lg font-medium text-gray-900 mb-4">Fechas Importantes</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Fecha de Producción</p>
                    <p className="font-medium"><SafeDate date={product.productionDate} /></p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fecha de Vencimiento</p>
                    <p className="font-medium"><SafeDate date={product.expirationDate} /></p>
                  </div>
                </div>
              </div>

              {/* Storage Conditions */}
              <div>
                <h5 className="text-lg font-medium text-gray-900 mb-4">Condiciones de Almacenamiento</h5>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600">Temperatura</p>
                    <p className="text-2xl font-semibold text-blue-600">{product.temperature}°C</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600">Humedad</p>
                    <p className="text-2xl font-semibold text-green-600">{product.humidity}%</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600">Ubicación</p>
                    <p className="text-sm font-semibold text-purple-600">{product.currentLocation}</p>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div>
                <h5 className="text-lg font-medium text-gray-900 mb-4">Información Adicional</h5>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-600">Certificación</p>
                    <p className="font-medium">{product.metadata.certification}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Descripción</p>
                    <p className="font-medium">{product.metadata.description || 'Producto procesado de alta calidad'}</p>
                  </div>
                  {product.metadata.brand && (
                    <div>
                      <p className="text-sm text-gray-600">Marca</p>
                      <p className="font-medium">{product.metadata.brand}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h5 className="text-lg font-medium text-gray-900 mb-4">Historial de Transferencias</h5>
              {transferHistory.length > 0 ? (
                <div className="space-y-4">
                  {transferHistory.map((transfer, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <TruckIcon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {transfer.transferType === 'PROCESSING' ? 'Transferencia para Procesamiento' : 'Transferencia'}
                            </p>
                            <div className="mt-1 text-sm text-gray-600">
                              <p>De: <span className="font-medium">{transfer.from}</span></p>
                              <p>A: <span className="font-medium">{transfer.to}</span></p>
                              {transfer.notes && (
                                <p className="mt-1">Notas: {transfer.notes}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            <SafeDate date={transfer.timestamp} />
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">No hay transferencias registradas</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t px-6 py-4">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}