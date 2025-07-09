import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  QrCodeIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  CalendarIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import SafeDate from '@/components/SafeDate';
import { calculateExpirationInfo } from '@/utils/expirationUtils';

interface QRProductData {
  productId: string;
  productName: string;
  batchNumber: string;
  retailerId: string;
  retailerName: string;
  timestamp: string;
  traceability: {
    producer: {
      name: string;
      location: string;
    };
    currentLocation: string;
    expirationDate: string;
    certifications: string;
  };
}

export default function ProductScanPage() {
  const router = useRouter();
  const [productData, setProductData] = useState<QRProductData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data } = router.query;
    
    if (data && typeof data === 'string') {
      try {
        const parsedData = JSON.parse(decodeURIComponent(data));
        setProductData(parsedData);
        setIsLoading(false);
      } catch (error) {
        console.error('Error parsing QR data:', error);
        setError('Código QR inválido');
        setIsLoading(false);
      }
    } else if (router.isReady) {
      setError('No se encontraron datos del producto');
      setIsLoading(false);
    }
  }, [router.query, router.isReady]);

  const getExpirationStatus = (expirationDate: string) => {
    const expiry = new Date(expirationDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { status: 'expired', message: 'Producto vencido', color: 'text-red-600 bg-red-50' };
    } else if (diffDays <= 3) {
      return { status: 'warning', message: `Vence en ${diffDays} días`, color: 'text-orange-600 bg-orange-50' };
    } else {
      return { status: 'good', message: `Vence en ${diffDays} días`, color: 'text-green-600 bg-green-50' };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información del producto...</p>
        </div>
      </div>
    );
  }

  if (error || !productData) {
    return (
      <>
        <Head>
          <title>Error - Código QR</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <QrCodeIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error al escanear QR</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link href="/" className="btn-primary">
              Volver al inicio
            </Link>
          </div>
        </div>
      </>
    );
  }

  const expirationStatus = getExpirationStatus(productData.traceability.expirationDate);

  return (
    <>
      <Head>
        <title>{productData.productName} - Información del Producto</title>
        <meta name="description" content={`Información de trazabilidad para ${productData.productName}`} />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                  <ArrowLeftIcon className="w-5 h-5" />
                  <span>Inicio</span>
                </Link>
                <div className="flex items-center space-x-3">
                  <QrCodeIcon className="w-8 h-8 text-blue-600" />
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">Información del Producto</h1>
                    <p className="text-sm text-gray-500">Escaneado desde {productData.retailerName}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Product Header */}
            <div className="bg-white rounded-lg shadow-sm border mb-6">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{productData.productName}</h2>
                    <p className="text-gray-600 mt-1">Lote: {productData.batchNumber}</p>
                  </div>
                  <div className={`px-4 py-2 rounded-full ${expirationStatus.color}`}>
                    <div className="flex items-center space-x-2">
                      {expirationStatus.status === 'expired' && <ClockIcon className="w-5 h-5" />}
                      {expirationStatus.status === 'warning' && <ClockIcon className="w-5 h-5" />}
                      {expirationStatus.status === 'good' && <CheckCircleIcon className="w-5 h-5" />}
                      <span className="font-medium">{expirationStatus.message}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Basic Info */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Básica</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <CalendarIcon className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Fecha de vencimiento</p>
                      <p className="font-medium"><SafeDate date={productData.traceability.expirationDate} /></p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <MapPinIcon className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Ubicación actual</p>
                      <p className="font-medium">{productData.traceability.currentLocation}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <ShieldCheckIcon className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Certificaciones</p>
                      <p className="font-medium">{productData.traceability.certifications}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Traceability */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Trazabilidad</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-semibold text-sm">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Productor</p>
                      <p className="text-sm text-gray-600">{productData.traceability.producer.name}</p>
                      <p className="text-xs text-gray-500">{productData.traceability.producer.location}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Retailer</p>
                      <p className="text-sm text-gray-600">{productData.retailerName}</p>
                      <p className="text-xs text-gray-500">Disponible para venta</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <InformationCircleIcon className="w-6 h-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Información del QR</h3>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p><strong>ID del Producto:</strong> {productData.productId}</p>
                    <p><strong>Generado por:</strong> {productData.retailerName}</p>
                    <p><strong>Fecha de generación:</strong> <SafeDate date={productData.timestamp} /></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Consumer Actions */}
            <div className="mt-6 text-center">
              <Link href="/consumer" className="btn-primary">
                Ir a Dashboard Consumidor
              </Link>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}