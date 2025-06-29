import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  ShieldCheckIcon, 
  DevicePhoneMobileIcon,
  QrCodeIcon,
  BellIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { UserRole } from '@/types';

const features = [
  {
    icon: CheckCircleIcon,
    title: 'Trazabilidad Completa',
    description: 'Seguimiento desde el productor hasta el consumidor final con registros inmutables en blockchain.'
  },
  {
    icon: ClockIcon,
    title: 'Gestión de Caducidad',
    description: 'Control automático de fechas de vencimiento con alertas personalizables.'
  },
  {
    icon: DevicePhoneMobileIcon,
    title: 'Aplicación Móvil',
    description: 'App nativa con notificaciones push para productores y consumidores.'
  },
  {
    icon: BellIcon,
    title: 'Alertas Inteligentes',
    description: 'Notificaciones automáticas 1-2 días antes del vencimiento.'
  },
  {
    icon: QrCodeIcon,
    title: 'Códigos QR',
    description: 'Escaneo rápido para acceder a toda la información de trazabilidad.'
  },
  {
    icon: ShieldCheckIcon,
    title: 'Blockchain Seguro',
    description: 'Powered by Hyperledger Fabric para máxima seguridad y transparencia.'
  }
];

const roles = [
  {
    role: UserRole.PRODUCER,
    title: 'Productores',
    description: 'Agricultores y productores primarios',
    features: ['Registro de lotes', 'Gestión de productos', 'Transferencias a procesadores'],
    color: 'green',
    icon: '🌱'
  },
  {
    role: UserRole.PROCESSOR,
    title: 'Procesadores',
    description: 'Industrias de procesamiento de alimentos',
    features: ['Recepción de materias primas', 'Procesamiento', 'Nuevos productos'],
    color: 'blue',
    icon: '🏭'
  },
  {
    role: UserRole.DISTRIBUTOR,
    title: 'Distribuidores',
    description: 'Empresas de distribución y logística',
    features: ['Gestión de inventario', 'Transporte', 'Control de temperatura'],
    color: 'purple',
    icon: '🚛'
  },
  {
    role: UserRole.RETAILER,
    title: 'Minoristas',
    description: 'Supermercados y tiendas',
    features: ['Venta al público', 'Control de stock', 'Información al consumidor'],
    color: 'orange',
    icon: '🏪'
  },
  {
    role: UserRole.CONSUMER,
    title: 'Consumidores',
    description: 'Usuarios finales',
    features: ['Escaneo QR', 'Historial completo', 'Alertas de caducidad'],
    color: 'gray',
    icon: '👥'
  }
];

export default function HomePage() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  return (
    <>
      <Head>
        <title>Food Traceability - Trazabilidad de Alimentos con Blockchain</title>
        <meta 
          name="description" 
          content="Sistema completo de trazabilidad de alimentos basado en Hyperledger Fabric con gestión inteligente de fechas de caducidad y notificaciones automáticas." 
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">🍎</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Food Traceability</h1>
                  <p className="text-xs text-gray-500">Blockchain Food Safety</p>
                </div>
              </div>
              
              <nav className="hidden md:flex space-x-8">
                <a href="#features" className="text-gray-700 hover:text-primary-600 font-medium">
                  Características
                </a>
                <a href="#roles" className="text-gray-700 hover:text-primary-600 font-medium">
                  Usuarios
                </a>
                <a href="#demo" className="text-gray-700 hover:text-primary-600 font-medium">
                  Demo
                </a>
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative py-20 lg:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
                Trazabilidad de Alimentos
                <span className="block text-primary-600">con Blockchain</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Sistema completo de trazabilidad desde el productor hasta el consumidor final, 
                con gestión inteligente de fechas de caducidad y notificaciones automáticas.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/auth"
                  className="btn-primary inline-flex items-center px-8 py-3 text-lg"
                >
                  Comenzar Demo
                  <ArrowRightIcon className="ml-2 w-5 h-5" />
                </Link>
                
                <button className="btn-secondary inline-flex items-center px-8 py-3 text-lg">
                  Ver Documentación
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">100%</div>
                <div className="text-gray-600 mt-2">Trazabilidad Completa</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">24/7</div>
                <div className="text-gray-600 mt-2">Monitoreo Automático</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">5</div>
                <div className="text-gray-600 mt-2">Tipos de Usuarios</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Características Principales
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Un sistema completo diseñado para toda la cadena de suministro alimentaria
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="card hover:shadow-lg transition-shadow duration-300">
                  <feature.icon className="w-12 h-12 text-primary-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Roles Section */}
        <section id="roles" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Sistema Multi-Actor
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Diseñado para todos los participantes de la cadena de suministro
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {roles.map((roleItem) => (
                <div
                  key={roleItem.role}
                  className={`card cursor-pointer transition-all duration-300 hover:scale-105 ${
                    selectedRole === roleItem.role
                      ? `ring-2 ring-${roleItem.color}-500 bg-${roleItem.color}-50`
                      : 'hover:shadow-lg'
                  }`}
                  onClick={() => setSelectedRole(
                    selectedRole === roleItem.role ? null : roleItem.role
                  )}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-3">{roleItem.icon}</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {roleItem.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {roleItem.description}
                    </p>
                    
                    {selectedRole === roleItem.role && (
                      <div className="space-y-2 animate-fade-in">
                        {roleItem.features.map((feature, index) => (
                          <div
                            key={index}
                            className={`text-xs px-3 py-1 rounded-full bg-${roleItem.color}-100 text-${roleItem.color}-800`}
                          >
                            {feature}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <Link
                      href={`/${roleItem.role.toLowerCase()}`}
                      className={`mt-4 inline-block text-sm font-medium text-${roleItem.color}-600 hover:text-${roleItem.color}-700`}
                    >
                      Acceder como {roleItem.title} →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Demo Section */}
        <section id="demo" className="py-20 bg-primary-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              ¿Listo para probar el sistema?
            </h2>
            <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
              Explora todas las funcionalidades con nuestra demo interactiva
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth"
                className="bg-white text-primary-600 hover:bg-gray-50 font-medium py-3 px-8 rounded-md transition-colors duration-200 inline-flex items-center"
              >
                Iniciar Demo
                <ArrowRightIcon className="ml-2 w-5 h-5" />
              </Link>
              
              <a
                href="https://github.com/tu-usuario/food-traceability-blockchain"
                className="border-2 border-white text-white hover:bg-white hover:text-primary-600 font-medium py-3 px-8 rounded-md transition-colors duration-200"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver Código
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">🍎</span>
                </div>
                <span className="text-white text-lg font-semibold">Food Traceability</span>
              </div>
              
              <p className="text-gray-400 mb-6">
                Sistema de trazabilidad de alimentos basado en Hyperledger Fabric
              </p>
              
              <div className="flex justify-center space-x-6 text-gray-400">
                <span>Versión 1.0.0</span>
                <span>•</span>
                <span>Powered by Blockchain</span>
                <span>•</span>
                <span>© 2025 Food Traceability</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}