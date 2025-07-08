import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { Product, ProductStatus, UserRole } from '@/types';
import SafeDate from '@/components/SafeDate';
import Breadcrumb from '@/components/Breadcrumb';
import TransferModal from '@/components/TransferModal';
import { calculateExpirationInfo } from '@/utils/expirationUtils';

export default function ProcessorTransferPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    let mounted = true;
    let loadStarted = false;
    
    const checkAuthAndLoad = async () => {
      if (!mounted || loadStarted) return;
      loadStarted = true;
      
      // Check auth
      if (typeof window !== 'undefined') {
        const storedRole = localStorage.getItem('userRole');
        const storedUser = localStorage.getItem('authUser');
        
        if (!storedRole || !storedUser) {
          router.push('/auth');
          return;
        }
        
        if (storedRole !== UserRole.PROCESSOR) {
          toast.error('Acceso denegado: Se requiere rol de Procesador');
          router.push('/auth');
          return;
        }
      }

      if (mounted) {
        await loadProducts();
      }
    };
    
    checkAuthAndLoad();
    
    return () => {
      mounted = false;
    };
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Cargando productos procesados disponibles para transferir...');
      
      // Importar funciones de API para cargar productos reales
      const { getMyProducts } = await import('@/utils/api');
      
      // Cargar productos del usuario autenticado
      const productsResponse = await getMyProducts();
      
      if (productsResponse.success && productsResponse.data) {
        console.log('✅ Productos cargados:', productsResponse.data);
        
        // Convertir FoodAsset[] a Product[] para compatibilidad con la UI
        const convertedProducts = productsResponse.data.map((foodAsset: any) => ({
          id: foodAsset.id,
          name: foodAsset.name,
          batchNumber: foodAsset.batchNumber || foodAsset.attributes?.batchNumber,
          productionDate: foodAsset.productionDate || foodAsset.attributes?.productionDate,
          expirationDate: foodAsset.expirationDate || foodAsset.attributes?.expirationDate,
          status: foodAsset.status || ProductStatus.ACTIVE,
          currentLocation: foodAsset.origin?.farmName || foodAsset.attributes?.origin?.farmName || 'Planta de Procesamiento',
          temperature: foodAsset.storageConditions?.temperature || foodAsset.attributes?.storageConditions?.temperature || 2,
          humidity: foodAsset.storageConditions?.humidity || foodAsset.attributes?.storageConditions?.humidity || 80,
          producer: {
            id: 'current-processor',
            name: foodAsset.origin?.farmName || foodAsset.attributes?.origin?.farmName || 'Procesadora Valle Verde',
            location: foodAsset.origin?.location || foodAsset.attributes?.origin?.location || 'Zona Industrial, San José'
          },
          metadata: {
            variety: foodAsset.variety || foodAsset.attributes?.variety || 'Procesado',
            weight: foodAsset.weight ? `${foodAsset.weight}kg` : (foodAsset.attributes?.weight ? `${foodAsset.attributes.weight}kg` : 'Sin especificar'),
            certification: foodAsset.certifications?.join(', ') || foodAsset.attributes?.certifications?.join(', ') || 'HACCP',
            harvestDate: foodAsset.productionDate || foodAsset.attributes?.productionDate,
            description: foodAsset.description || foodAsset.attributes?.description || 'Producto procesado',
            brand: foodAsset.brand || foodAsset.attributes?.brand || 'Valle Verde',
            category: foodAsset.category || foodAsset.attributes?.category || 'PROCESSED'
          }
        }));
        
        // Filtrar solo productos que se pueden transferir (activos y no vencidos)
        const transferableProducts = convertedProducts.filter(product => {
          const expirationInfo = calculateExpirationInfo(product);
          return product.status === ProductStatus.ACTIVE && expirationInfo.canTransfer;
        });
        
        setProducts(transferableProducts);
        
        if (transferableProducts.length === 0) {
          console.log('ℹ️ No hay productos procesados disponibles para transferir');
        } else {
          console.log(`✅ ${transferableProducts.length} productos procesados disponibles para transferir`);
        }
      } else {
        console.log('ℹ️ No se encontraron productos procesados');
        setProducts([]);
        toast.info('No hay productos procesados disponibles para transferir');
      }
      
    } catch (error: any) {
      console.error('❌ Error al cargar productos procesados:', error);
      toast.error(`Error al cargar productos: ${error.message}`);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: ProductStatus) => {
    switch (status) {
      case ProductStatus.ACTIVE:
        return 'bg-green-100 text-green-800';
      case ProductStatus.IN_TRANSIT:
        return 'bg-blue-100 text-blue-800';
      case ProductStatus.EXPIRED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: ProductStatus) => {
    switch (status) {
      case ProductStatus.ACTIVE:
        return <CheckCircleIcon className="w-4 h-4" />;
      case ProductStatus.IN_TRANSIT:
        return <ClockIcon className="w-4 h-4" />;
      case ProductStatus.EXPIRED:
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      default:
        return <CheckCircleIcon className="w-4 h-4" />;
    }
  };

  const handleTransferClick = (product: Product) => {
    setSelectedProduct(product);
    setShowTransferModal(true);
  };

  const handleTransferComplete = (product: Product, toRole: UserRole, recipient: any) => {
    // Update product status to IN_TRANSIT
    setProducts(prevProducts => 
      prevProducts.filter(p => p.id !== product.id) // Remove from transferable list
    );

    toast.success(`Producto procesado "${product.name}" transferido exitosamente a ${recipient.name}`);
    setShowTransferModal(false);
    setSelectedProduct(null);
  };

  if (isLoading) {
    return (
      <>
        <Head>
          <title>Transferir Productos Procesados - Food Traceability</title>
          <meta name="description" content="Transferir productos procesados a distribuidores y minoristas" />
        </Head>
        
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Cargando Productos Procesados</h2>
            <p className="text-gray-600">Obteniendo productos procesados disponibles para transferir...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Transferir Productos Procesados - Food Traceability</title>
        <meta name="description" content="Transferir productos procesados a distribuidores y minoristas" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link href="/processor" className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                  <ArrowLeftIcon className="w-5 h-5" />
                  <span>Volver al Dashboard</span>
                </Link>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                    <BeakerIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">Transferir Productos Procesados</h1>
                    <p className="text-sm text-gray-500">Envía productos procesados a distribuidores y minoristas</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={loadProducts}
                  disabled={isLoading}
                  className="btn-secondary"
                >
                  {isLoading ? 'Actualizando...' : 'Actualizar'}
                </button>
                
                <Link href="/processor" className="btn-primary">
                  Dashboard
                </Link>
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
                  { label: 'Dashboard', href: '/processor' },
                  { label: 'Transferir Productos', current: true }
                ]}
              />
            </div>

            {/* Info Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Transferir Productos Procesados
              </h2>
              <p className="text-gray-600">
                Selecciona los productos procesados que deseas transferir a distribuidores o minoristas.
                Solo se muestran productos activos y no vencidos listos para distribución.
              </p>
            </div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar productos procesados..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 w-full"
                />
              </div>
            </div>

            {/* Products List */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Productos Procesados Disponibles ({filteredProducts.length})
                </h3>
              </div>

              <div className="space-y-4">
                {filteredProducts.map((product) => {
                  const expirationInfo = calculateExpirationInfo(product);
                  
                  return (
                    <div 
                      key={product.id} 
                      className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                        expirationInfo.urgencyLevel === 'warning'
                          ? 'border-orange-300 bg-orange-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <BeakerIcon className="w-5 h-5 text-purple-600" />
                            <h4 className="text-lg font-medium text-gray-900">{product.name}</h4>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                              {getStatusIcon(product.status)}
                              <span className="ml-1">{product.status}</span>
                            </span>
                            
                            {expirationInfo.urgencyLevel === 'warning' && (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${expirationInfo.urgencyColor}`}>
                                <ClockIcon className="w-3 h-3 mr-1" />
                                {expirationInfo.urgencyMessage}
                              </span>
                            )}
                          </div>
                        
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center">
                              <span className="font-medium mr-2">Lote:</span>
                              <span>{product.batchNumber}</span>
                            </div>
                            <div className="flex items-center">
                              <CalendarIcon className="w-4 h-4 mr-2" />
                              <span>Vence: <SafeDate date={product.expirationDate} /></span>
                            </div>
                            <div className="flex items-center">
                              <span className="font-medium mr-2">Peso:</span>
                              <span>{product.metadata.weight}</span>
                            </div>
                          </div>

                          <div className="text-sm text-gray-500">
                            <span className="mr-4">Ubicación: {product.currentLocation}</span>
                            <span className="mr-4">Temp: {product.temperature}°C</span>
                            <span className="mr-4">Humedad: {product.humidity}%</span>
                            <span>Certificación: {product.metadata.certification}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleTransferClick(product)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors"
                          >
                            <ArrowRightIcon className="w-4 h-4" />
                            <span>Transferir</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-8">
                  <BeakerIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos procesados para transferir</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm ? 'No se encontraron productos con ese término' : 'No tienes productos procesados disponibles para transferir'}
                  </p>
                  <Link href="/processor" className="btn-primary">
                    Volver al Dashboard
                  </Link>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Transfer Modal */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        product={selectedProduct}
        fromRole={UserRole.PROCESSOR}
        onTransferComplete={handleTransferComplete}
      />
    </>
  );
}