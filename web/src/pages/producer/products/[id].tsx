import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  QrCodeIcon,
  CalendarIcon,
  MapPinIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';
import SafeDate from '@/components/SafeDate';
import Breadcrumb from '@/components/Breadcrumb';

interface ProductDetail {
  id: string;
  name: string;
  owner: string;
  amount: number;
  attributes: {
    batchNumber?: string;
    category?: string;
    description?: string;
    productionDate?: string;
    expirationDate?: string;
    origin?: any;
    storageConditions?: any;
    allergens?: string[];
    weight?: number;
    volume?: number;
    brand?: string;
    certifications?: string[];
    variety?: string;
    [key: string]: any;
  };
  createdAt: string;
}

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Check auth
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('userRole');
      const storedUser = localStorage.getItem('authUser');
      
      if (!storedRole || !storedUser) {
        router.push('/auth');
        return;
      }
      
      if (storedRole !== UserRole.PRODUCER) {
        toast.error('Acceso denegado: Se requiere rol de Productor');
        router.push('/auth');
        return;
      }
    }

    if (id) {
      loadProductDetail();
    }
  }, [id]);

  const loadProductDetail = async () => {
    setIsLoading(true);
    try {
      console.log(`🔍 Cargando detalle del producto: ${id}`);
      
      // Ensure we're in the browser before making API calls
      if (typeof window === 'undefined') {
        console.log('❌ Not in browser, skipping API call');
        return;
      }
      
      // Dynamically import API functions to avoid SSR issues
      const { getMyProducts } = await import('@/utils/api');
      
      // Get all products and find the one with matching ID
      const response = await getMyProducts();

      if (response.success && response.data) {
        const products = response.data;
        const foundProduct = products.find((p: any) => p.id === id);
        
        if (foundProduct) {
          setProduct(foundProduct);
          console.log('✅ Producto encontrado:', foundProduct);
        } else {
          toast.error('Producto no encontrado');
          router.push('/producer');
        }
      } else {
        toast.error('Error al cargar el producto');
        router.push('/producer');
      }
    } catch (error: any) {
      console.error('❌ Error cargando producto:', error);
      toast.error(`Error: ${error.message}`);
      router.push('/producer');
    } finally {
      setIsLoading(false);
    }
  };

  const generateQRCode = async () => {
    try {
      console.log(`📱 Generando código QR para producto: ${id}`);
      
      // Create QR data with product information
      const qrData = {
        productId: product?.id,
        name: product?.name,
        batchNumber: product?.attributes.batchNumber,
        productionDate: product?.attributes.productionDate,
        expirationDate: product?.attributes.expirationDate,
        producer: product?.attributes.origin?.farmName || 'Productor',
        verifyUrl: `${window.location.origin}/verify/${product?.id}`
      };

      // For now, create a simple QR code data string
      // In a real implementation, you would use a QR code library
      const qrCodeData = `FOOD_TRACE:${JSON.stringify(qrData)}`;
      setQrCode(qrCodeData);
      setShowQRModal(true);
      
      toast.success('Código QR generado exitosamente');
    } catch (error: any) {
      console.error('❌ Error generando QR:', error);
      toast.error('Error al generar código QR');
    }
  };

  const handleUpdateProduct = async (updatedData: any) => {
    setIsUpdating(true);
    try {
      console.log(`📝 Actualizando producto: ${id}`, updatedData);
      
      // For now, we'll simulate an update by modifying local state
      // In a real implementation, this would call an API endpoint
      if (product) {
        const updatedProduct = {
          ...product,
          name: updatedData.name || product.name,
          attributes: {
            ...product.attributes,
            description: updatedData.description || product.attributes.description,
            storageConditions: updatedData.storageConditions || product.attributes.storageConditions,
            weight: updatedData.weight || product.attributes.weight,
            brand: updatedData.brand || product.attributes.brand,
          }
        };
        
        setProduct(updatedProduct);
        setShowEditModal(false);
        toast.success('Producto actualizado exitosamente');
      }
    } catch (error: any) {
      console.error('❌ Error actualizando producto:', error);
      toast.error('Error al actualizar producto');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteProduct = async () => {
    setIsUpdating(true);
    try {
      console.log(`🗑️ Marcando producto como inactivo: ${id}`);
      
      // In a real implementation, this would mark the product as inactive
      // rather than actually deleting it from the blockchain
      toast.success('Producto marcado como inactivo');
      setShowDeleteModal(false);
      
      // Redirect back to producer dashboard
      setTimeout(() => {
        router.push('/producer');
      }, 1000);
      
    } catch (error: any) {
      console.error('❌ Error desactivando producto:', error);
      toast.error('Error al desactivar producto');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'IN_TRANSIT':
        return 'bg-blue-100 text-blue-800';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'IN_TRANSIT':
        return <ClockIcon className="w-4 h-4" />;
      case 'EXPIRED':
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      default:
        return <DocumentTextIcon className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando producto...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Producto no encontrado</h2>
          <p className="text-gray-600 mb-4">El producto solicitado no existe o no tienes permisos para verlo.</p>
          <Link href="/producer" className="btn-primary">
            Volver al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{product.name} - Detalle del Producto</title>
        <meta name="description" content={`Detalles del producto ${product.name}`} />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link href="/producer" className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                  <ArrowLeftIcon className="w-5 h-5" />
                  <span>Volver al Listado</span>
                </Link>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">📦</span>
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">Detalle del Producto</h1>
                    <p className="text-sm text-gray-500">{product.name}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={generateQRCode}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <QrCodeIcon className="w-4 h-4" />
                  <span>Generar QR</span>
                </button>
                
                <button 
                  onClick={() => setShowEditModal(true)}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <DocumentTextIcon className="w-4 h-4" />
                  <span>Editar</span>
                </button>
                
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center space-x-2"
                >
                  <span>🗑️</span>
                  <span>Desactivar</span>
                </button>
                
                <button className="btn-primary flex items-center space-x-2">
                  <ShareIcon className="w-4 h-4" />
                  <span>Compartir</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Breadcrumb */}
            <div className="mb-6">
              <Breadcrumb 
                items={[
                  { label: 'Productos', href: '/producer' },
                  { label: product?.name || 'Producto', current: true }
                ]}
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Info Card */}
                <div className="card">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h2>
                      <p className="text-gray-600">{product.attributes.description || 'Sin descripción'}</p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor('ACTIVE')}`}>
                      {getStatusIcon('ACTIVE')}
                      <span className="ml-1">Activo</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Información Básica</h3>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">ID del Producto:</dt>
                          <dd className="text-sm font-mono text-gray-900">{product.id}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">Lote:</dt>
                          <dd className="text-sm text-gray-900">{product.attributes.batchNumber || 'N/A'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">Cantidad:</dt>
                          <dd className="text-sm text-gray-900">{product.amount} unidades</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">Categoría:</dt>
                          <dd className="text-sm text-gray-900">{product.attributes.category || 'N/A'}</dd>
                        </div>
                      </dl>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Fechas</h3>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">Producción:</dt>
                          <dd className="text-sm text-gray-900">
                            <SafeDate date={product.attributes.productionDate} />
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">Vencimiento:</dt>
                          <dd className="text-sm text-gray-900">
                            <SafeDate date={product.attributes.expirationDate} />
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">Creado:</dt>
                          <dd className="text-sm text-gray-900">
                            <SafeDate date={product.createdAt} />
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>

                {/* Origin Info */}
                {product.attributes.origin && (
                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de Origen</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Granja/Productor</p>
                        <p className="text-sm font-medium text-gray-900">
                          {product.attributes.origin.farmName || product.attributes.origin.farm || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Ubicación</p>
                        <p className="text-sm font-medium text-gray-900">
                          {product.attributes.origin.location || 'N/A'}
                        </p>
                      </div>
                      {product.attributes.origin.country && (
                        <div>
                          <p className="text-sm text-gray-600">País</p>
                          <p className="text-sm font-medium text-gray-900">{product.attributes.origin.country}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Storage Conditions */}
                {product.attributes.storageConditions && (
                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Condiciones de Almacenamiento</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Temperatura</p>
                        <p className="text-sm font-medium text-gray-900">
                          {product.attributes.storageConditions.temperature || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Humedad</p>
                        <p className="text-sm font-medium text-gray-900">
                          {product.attributes.storageConditions.humidity || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
                  <div className="space-y-3">
                    <button
                      onClick={generateQRCode}
                      className="w-full btn-primary flex items-center justify-center space-x-2"
                    >
                      <QrCodeIcon className="w-4 h-4" />
                      <span>Generar Código QR</span>
                    </button>
                    
                    <button 
                      onClick={() => setShowEditModal(true)}
                      className="w-full btn-secondary flex items-center justify-center space-x-2"
                    >
                      <DocumentTextIcon className="w-4 h-4" />
                      <span>Editar Producto</span>
                    </button>
                    
                    <button className="w-full btn-secondary flex items-center justify-center space-x-2">
                      <ShareIcon className="w-4 h-4" />
                      <span>Transferir Producto</span>
                    </button>
                    
                    <button 
                      onClick={() => setShowDeleteModal(true)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center justify-center space-x-2"
                    >
                      <span>🗑️</span>
                      <span>Desactivar Producto</span>
                    </button>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Adicional</h3>
                  <dl className="space-y-3">
                    {product.attributes.weight && (
                      <div>
                        <dt className="text-sm text-gray-600">Peso</dt>
                        <dd className="text-sm font-medium text-gray-900">{product.attributes.weight} kg</dd>
                      </div>
                    )}
                    {product.attributes.brand && (
                      <div>
                        <dt className="text-sm text-gray-600">Marca</dt>
                        <dd className="text-sm font-medium text-gray-900">{product.attributes.brand}</dd>
                      </div>
                    )}
                    {product.attributes.variety && (
                      <div>
                        <dt className="text-sm text-gray-600">Variedad</dt>
                        <dd className="text-sm font-medium text-gray-900">{product.attributes.variety}</dd>
                      </div>
                    )}
                    {product.attributes.certifications && product.attributes.certifications.length > 0 && (
                      <div>
                        <dt className="text-sm text-gray-600">Certificaciones</dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {product.attributes.certifications.join(', ')}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>
            
            {/* Bottom Navigation */}
            <div className="mt-8 flex justify-center">
              <Link 
                href="/producer" 
                className="btn-secondary flex items-center space-x-2"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span>Volver al Listado de Productos</span>
              </Link>
            </div>
          </div>
        </main>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Código QR del Producto</h3>
              
              {/* QR Code Placeholder */}
              <div className="bg-gray-100 rounded-lg p-8 mb-4">
                <div className="w-48 h-48 bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mx-auto">
                  <div className="text-center">
                    <QrCodeIcon className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Código QR para</p>
                    <p className="text-sm font-medium text-gray-700">{product.name}</p>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Escanea este código para verificar la autenticidad del producto
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowQRModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cerrar
                </button>
                <button className="flex-1 btn-primary">
                  Descargar QR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && product && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Editar Producto</h3>
              <p className="text-sm text-gray-600">Actualiza la información del producto</p>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              handleUpdateProduct({
                name: formData.get('name'),
                description: formData.get('description'),
                weight: formData.get('weight'),
                brand: formData.get('brand'),
                storageConditions: {
                  temperature: formData.get('temperature'),
                  humidity: formData.get('humidity')
                }
              });
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={product.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    name="weight"
                    defaultValue={product.attributes.weight}
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                  <input
                    type="text"
                    name="brand"
                    defaultValue={product.attributes.brand}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temperatura</label>
                  <input
                    type="text"
                    name="temperature"
                    defaultValue={product.attributes.storageConditions?.temperature}
                    placeholder="ej. 4°C"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    name="description"
                    defaultValue={product.attributes.description}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 btn-secondary"
                  disabled={isUpdating}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Actualizando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && product && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🗑️</span>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Desactivar Producto</h3>
              <p className="text-sm text-gray-600 mb-6">
                ¿Estás seguro que deseas desactivar "{product.name}"? 
                Esta acción marcará el producto como inactivo pero mantendrá el historial en el blockchain.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 btn-secondary"
                  disabled={isUpdating}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteProduct}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Desactivando...' : 'Desactivar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}