import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PlusIcon,
  CalendarIcon,
  MapPinIcon,
  TagIcon,
  ScaleIcon,
  FireIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { FoodCategory } from '@/types';

interface CreateProductForm {
  name: string;
  category: FoodCategory;
  description: string;
  quantity: number;
  weight: string;
  productionDate: string;
  expirationDate: string;
  batchNumber: string;
  variety: string;
  farmName: string;
  farmLocation: string;
  temperature: number;
  humidity: number;
  certifications: string[];
  allergens: string[];
}

const initialForm: CreateProductForm = {
  name: '',
  category: FoodCategory.FRUITS,
  description: '',
  quantity: 0,
  weight: '',
  productionDate: '',
  expirationDate: '',
  batchNumber: '',
  variety: '',
  farmName: '',
  farmLocation: '',
  temperature: 4,
  humidity: 85,
  certifications: [],
  allergens: []
};

const categories = [
  { value: FoodCategory.FRUITS, label: 'Frutas', icon: '🍎' },
  { value: FoodCategory.VEGETABLES, label: 'Vegetales', icon: '🥬' },
  { value: FoodCategory.GRAINS, label: 'Cereales', icon: '🌾' },
  { value: FoodCategory.DAIRY, label: 'Lácteos', icon: '🥛' },
  { value: FoodCategory.MEAT, label: 'Carnes', icon: '🥩' },
  { value: FoodCategory.SEAFOOD, label: 'Mariscos', icon: '🐟' },
  { value: FoodCategory.BEVERAGES, label: 'Bebidas', icon: '🥤' },
];

const commonCertifications = [
  'Orgánico',
  'Fair Trade',
  'HACCP',
  'GlobalGAP',
  'Rainforest Alliance',
  'ISO 22000',
  'BRC',
  'Sin Pesticidas'
];

const commonAllergens = [
  'Gluten',
  'Lactosa',
  'Nueces',
  'Soja',
  'Huevos',
  'Pescado',
  'Mariscos',
  'Sulfitos'
];

export default function CreateProduct() {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState<CreateProductForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const generateBatchNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `BATCH-${year}-${timestamp}`;
  };

  const handleInputChange = (field: keyof CreateProductForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCertificationToggle = (cert: string) => {
    setForm(prev => ({
      ...prev,
      certifications: prev.certifications.includes(cert)
        ? prev.certifications.filter(c => c !== cert)
        : [...prev.certifications, cert]
    }));
  };

  const handleAllergenToggle = (allergen: string) => {
    setForm(prev => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter(a => a !== allergen)
        : [...prev.allergens, allergen]
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!form.description.trim()) newErrors.description = 'La descripción es requerida';
    if (form.quantity <= 0) newErrors.quantity = 'La cantidad debe ser mayor a 0';
    if (!form.weight.trim()) newErrors.weight = 'El peso es requerido';
    if (!form.productionDate) newErrors.productionDate = 'La fecha de producción es requerida';
    if (!form.expirationDate) newErrors.expirationDate = 'La fecha de caducidad es requerida';
    if (!form.variety.trim()) newErrors.variety = 'La variedad es requerida';
    if (!form.farmName.trim()) newErrors.farmName = 'El nombre de la finca es requerido';
    if (!form.farmLocation.trim()) newErrors.farmLocation = 'La ubicación es requerida';

    // Validar que la fecha de caducidad sea posterior a la de producción
    if (form.productionDate && form.expirationDate) {
      const prodDate = new Date(form.productionDate);
      const expDate = new Date(form.expirationDate);
      if (expDate <= prodDate) {
        newErrors.expirationDate = 'La fecha de caducidad debe ser posterior a la de producción';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor corrige los errores en el formulario');
      return;
    }

    setIsSubmitting(true);

    try {
      // Generar número de lote si no se proporcionó
      const batchNumber = form.batchNumber.trim() || generateBatchNumber();
      
      // Generar ID único para el producto
      const productId = `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Preparar datos del producto para la API
      const productData = {
        id: productId,
        name: form.name,
        category: form.category,
        description: form.description,
        quantity: form.quantity,
        weight: parseFloat(form.weight) || 0,
        volume: 0, // Calcular si es necesario
        productionDate: form.productionDate,
        expirationDate: form.expirationDate,
        batchNumber,
        origin: {
          farmName: form.farmName,
          location: form.farmLocation,
          country: 'España' // Por defecto
        },
        allergens: form.allergens,
        storageConditions: {
          temperature: form.temperature,
          humidity: form.humidity
        },
        brand: form.farmName, // Usar el nombre de la finca como marca
        certifications: form.certifications,
        variety: form.variety
      };

      console.log('🚀 Creando producto con datos:', productData);

      // Importar y usar la función de creación de productos
      const { createProduct, getWalletService } = await import('@/utils/api');
      
      // Inicializar wallet si no existe
      const walletService = await getWalletService();
      
      // Generar wallet si no hay uno activo
      if (!walletService.hasActiveWallet()) {
        console.log('🔑 Generando nuevo wallet para el usuario...');
        const wallet = walletService.generateRandomWallet();
        console.log('✅ Wallet generado:', wallet.address);
        toast.success(`Wallet generado: ${wallet.address.substring(0, 10)}...`);
        
        // Guardar dirección del wallet en el usuario si no tiene una
        if (user && !user.address) {
          user.address = wallet.address;
          // Actualizar localStorage
          localStorage.setItem('authUser', JSON.stringify(user));
        }
      }
      
      // Obtener dirección del wallet o usuario
      const walletAddress = walletService.getCurrentAddress() || user?.address || '';
      
      console.log('📍 Dirección para firmar:', walletAddress);
      
      // Generar firma para la creación del producto
      const signature = await walletService.signCreateToken(
        productId,
        walletAddress,
        form.name,
        form.quantity
      );

      console.log('✍️ Firma generada para crear producto:', signature);
      console.log('🔗 Creando producto directamente en FoodTraceabilityContract...');

      // Agregar la firma a los datos del producto para demostrar que fue firmado
      const signedProductData = {
        ...productData,
        signature: signature,
        walletAddress: walletAddress
      };

      // Crear producto en el blockchain usando el contrato principal
      const response = await createProduct(signedProductData);
      
      if (response.success) {
        toast.success(`¡Producto "${form.name}" creado exitosamente en blockchain!`);
        toast.success(`Lote: ${batchNumber}`);
        console.log('✅ Producto creado en blockchain:', response.data);
        
        // Redirigir al dashboard del productor
        router.push('/producer');
      } else {
        throw new Error(response.message || 'Error al crear el producto');
      }
      
    } catch (error: any) {
      console.error('❌ Error creating product:', error);
      toast.error(`Error al crear el producto: ${error.message || 'Inténtalo de nuevo'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = categories.find(cat => cat.value === form.category);

  return (
    <>
      <Head>
        <title>Crear Producto - Food Traceability</title>
        <meta name="description" content="Registrar nuevo producto en la cadena de trazabilidad" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link href="/producer" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                  <ArrowLeftIcon className="w-5 h-5" />
                  <span>Volver al Dashboard</span>
                </Link>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                    <PlusIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">Crear Nuevo Producto</h1>
                    <p className="text-sm text-gray-500">Registrar producto en blockchain</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Información Básica */}
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Información Básica del Producto</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label">
                      <TagIcon className="w-4 h-4 inline mr-2" />
                      Nombre del Producto *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`input-field ${errors.name ? 'input-error' : ''}`}
                      placeholder="Ej: Manzanas Red Delicious"
                    />
                    {errors.name && <p className="error-text">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="label">Categoría *</label>
                    <select
                      value={form.category}
                      onChange={(e) => handleInputChange('category', e.target.value as FoodCategory)}
                      className="input-field"
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="label">Descripción *</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className={`input-field ${errors.description ? 'input-error' : ''}`}
                      rows={3}
                      placeholder="Describe las características del producto..."
                    />
                    {errors.description && <p className="error-text">{errors.description}</p>}
                  </div>

                  <div>
                    <label className="label">Variedad *</label>
                    <input
                      type="text"
                      value={form.variety}
                      onChange={(e) => handleInputChange('variety', e.target.value)}
                      className={`input-field ${errors.variety ? 'input-error' : ''}`}
                      placeholder="Ej: Red Delicious, Cherry, etc."
                    />
                    {errors.variety && <p className="error-text">{errors.variety}</p>}
                  </div>

                  <div>
                    <label className="label">Número de Lote</label>
                    <input
                      type="text"
                      value={form.batchNumber}
                      onChange={(e) => handleInputChange('batchNumber', e.target.value)}
                      className="input-field"
                      placeholder="Se generará automáticamente si se deja vacío"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Opcional: Se generará automáticamente un número único
                    </p>
                  </div>
                </div>
              </div>

              {/* Cantidades y Fechas */}
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Cantidades y Fechas</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label">
                      <ScaleIcon className="w-4 h-4 inline mr-2" />
                      Cantidad (unidades) *
                    </label>
                    <input
                      type="number"
                      value={form.quantity || ''}
                      onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
                      className={`input-field ${errors.quantity ? 'input-error' : ''}`}
                      placeholder="Ej: 100"
                      min="1"
                    />
                    {errors.quantity && <p className="error-text">{errors.quantity}</p>}
                  </div>

                  <div>
                    <label className="label">Peso/Volumen Total *</label>
                    <input
                      type="text"
                      value={form.weight}
                      onChange={(e) => handleInputChange('weight', e.target.value)}
                      className={`input-field ${errors.weight ? 'input-error' : ''}`}
                      placeholder="Ej: 50kg, 100L, 2 toneladas"
                    />
                    {errors.weight && <p className="error-text">{errors.weight}</p>}
                  </div>

                  <div>
                    <label className="label">
                      <CalendarIcon className="w-4 h-4 inline mr-2" />
                      Fecha de Producción/Cosecha *
                    </label>
                    <input
                      type="date"
                      value={form.productionDate}
                      onChange={(e) => handleInputChange('productionDate', e.target.value)}
                      className={`input-field ${errors.productionDate ? 'input-error' : ''}`}
                    />
                    {errors.productionDate && <p className="error-text">{errors.productionDate}</p>}
                  </div>

                  <div>
                    <label className="label">
                      <CalendarIcon className="w-4 h-4 inline mr-2" />
                      Fecha de Caducidad *
                    </label>
                    <input
                      type="date"
                      value={form.expirationDate}
                      onChange={(e) => handleInputChange('expirationDate', e.target.value)}
                      className={`input-field ${errors.expirationDate ? 'input-error' : ''}`}
                    />
                    {errors.expirationDate && <p className="error-text">{errors.expirationDate}</p>}
                  </div>
                </div>
              </div>

              {/* Información de Origen */}
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Información de Origen</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label">
                      <MapPinIcon className="w-4 h-4 inline mr-2" />
                      Nombre de la Finca *
                    </label>
                    <input
                      type="text"
                      value={form.farmName}
                      onChange={(e) => handleInputChange('farmName', e.target.value)}
                      className={`input-field ${errors.farmName ? 'input-error' : ''}`}
                      placeholder="Ej: Finca San Pedro"
                    />
                    {errors.farmName && <p className="error-text">{errors.farmName}</p>}
                  </div>

                  <div>
                    <label className="label">Ubicación de la Finca *</label>
                    <input
                      type="text"
                      value={form.farmLocation}
                      onChange={(e) => handleInputChange('farmLocation', e.target.value)}
                      className={`input-field ${errors.farmLocation ? 'input-error' : ''}`}
                      placeholder="Ej: Valle Central, Costa Rica"
                    />
                    {errors.farmLocation && <p className="error-text">{errors.farmLocation}</p>}
                  </div>
                </div>
              </div>

              {/* Condiciones de Almacenamiento */}
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Condiciones de Almacenamiento</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label">
                      <FireIcon className="w-4 h-4 inline mr-2" />
                      Temperatura Recomendada (°C)
                    </label>
                    <input
                      type="number"
                      value={form.temperature}
                      onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value) || 0)}
                      className="input-field"
                      step="0.1"
                      placeholder="Ej: 4.0"
                    />
                  </div>

                  <div>
                    <label className="label">Humedad Recomendada (%)</label>
                    <input
                      type="number"
                      value={form.humidity}
                      onChange={(e) => handleInputChange('humidity', parseInt(e.target.value) || 0)}
                      className="input-field"
                      min="0"
                      max="100"
                      placeholder="Ej: 85"
                    />
                  </div>
                </div>
              </div>

              {/* Certificaciones */}
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Certificaciones</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {commonCertifications.map(cert => (
                    <label key={cert} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.certifications.includes(cert)}
                        onChange={() => handleCertificationToggle(cert)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{cert}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Alérgenos */}
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Alérgenos</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {commonAllergens.map(allergen => (
                    <label key={allergen} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.allergens.includes(allergen)}
                        onChange={() => handleAllergenToggle(allergen)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">{allergen}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="card bg-blue-50 border-blue-200">
                <div className="flex items-start space-x-3">
                  <InformationCircleIcon className="w-6 h-6 text-blue-600 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Vista Previa del Producto</h3>
                    <div className="text-sm text-blue-800">
                      <p><strong>Producto:</strong> {form.name || 'Sin nombre'} ({selectedCategory?.icon} {selectedCategory?.label})</p>
                      <p><strong>Cantidad:</strong> {form.quantity || 0} unidades ({form.weight || 'Sin especificar'})</p>
                      <p><strong>Finca:</strong> {form.farmName || 'Sin especificar'} - {form.farmLocation || 'Sin ubicación'}</p>
                      {form.certifications.length > 0 && (
                        <p><strong>Certificaciones:</strong> {form.certifications.join(', ')}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex justify-end space-x-4">
                <Link href="/producer" className="btn-secondary">
                  Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creando Producto...' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}