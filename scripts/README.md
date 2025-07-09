# Scripts de Inicializaci�n para Demo

Este directorio contiene scripts para poblar la plataforma con datos de ejemplo para presentaciones y pruebas.

## Scripts Disponibles

### 1. Script Bash (`init-demo-data.sh`)
- **Descripci�n**: Script bash que usa curl para hacer peticiones HTTP
- **Ventajas**: No requiere dependencias de Node.js
- **Uso recomendado**: Servidores de producci�n, CI/CD, despliegues simples

### 2. Script Node.js (`init-demo-data.js`)
- **Descripci�n**: Script JavaScript que usa axios y mejor manejo de errores
- **Ventajas**: Mejor manejo de promesas y errores m�s descriptivos
- **Uso recomendado**: Desarrollo local, debugging detallado

## Prerrequisitos

1. **API ejecut�ndose**: La API debe estar corriendo en `http://localhost:3001`
2. **Blockchain activo**: La red de Hyperledger Fabric debe estar funcionando
3. **Wallets registradas**: Las wallets definidas en los scripts deben estar registradas

### Verificar que la API est� funcionando:
```bash
curl -s http://localhost:3001/api/health
```

## Uso

### Opci�n 1: Script Bash (Recomendado)
```bash
# Dar permisos de ejecuci�n
chmod +x init-demo-data.sh

# Ejecutar el script
./init-demo-data.sh
```

### Opci�n 2: Script Node.js
```bash
# Instalar dependencias (si no est�n instaladas)
npm install axios

# Ejecutar el script
node init-demo-data.js
```

## Datos Creados

El script crea aproximadamente **50 productos** distribuidos as�:

### Roles y Wallets (REALES registradas en el sistema)
- **2 Productores**: Fincas y granjas orgánicas
  - `0x844188335Cc64f65B5aA2490E9C1ddC133811e14` - Finca Verde Esperanza
  - `0xA8e7E90d5f7aF7407A08f3EdfE7AF09aCB284ECD` - Granja Orgánica del Valle
- **1 Procesador**: Planta de procesamiento de alimentos
  - `0x6F580F65469dC6C67a5668377132480D376Ddb06` - Procesadora Valle Verde
- **1 Distribuidor**: Empresa de logística y distribución
  - `0x1F2a486F5227fC0CD09B3b2b2F752D50cDdf9878` - Logística Valle Central
- **1 Retailer**: Supermercado
  - `0x8Dc664D838Ad25E9bF260D9E1E76fC377FA11fF5` - SuperMarket Plus
- **1 Consumidor**: Para simular compras finales
  - `0xcA01956A17ABF046b8e7261BF2E6B4F41Ad1FF16` - Consumidor Final

### Productos
- **20 productos frescos**: Frutas y verduras de productores
- **15 transferencias a procesadores**: Productos para procesamiento
- **10 productos procesados**: Jugos, salsas, conservas
- **20 transferencias a distribuidores**: Productos para distribuci�n
- **15 transferencias a retailers**: Productos para venta final
- **5 ventas a consumidores**: Simulaci�n de compras

### Flujo de Transferencias
```
Productor � Procesador � Distribuidor � Retailer � Consumidor
  (20)        (15)         (20)         (15)        (5)
```

## Tiempos de Entrega Simulados

- **Procesamiento**: 0-4 horas
- **Distribuci�n**: 2-10 horas  
- **Retail**: 1-6 horas
- **Venta final**: Inmediata (0 horas)

## Verificaci�n del �xito

Despu�s de ejecutar el script, verifica que los datos se crearon correctamente:

### 1. Verificar productos por rol:
```bash
# Productos de un productor
curl -H "Authorization: Bearer wallet:0x1234567890123456789012345678901234567890" \
     http://localhost:3001/api/food/my-products

# Productos de un retailer
curl -H "Authorization: Bearer wallet:0x4234567890123456789012345678901234567890" \
     http://localhost:3001/api/food/my-products
```

### 2. Verificar transferencias:
```bash
# Transferencias de un distribuidor
curl -H "Authorization: Bearer wallet:0x3234567890123456789012345678901234567890" \
     http://localhost:3001/api/food/my-transfers
```

### 3. Acceder a los dashboards:
- **Productor**: http://localhost:3000/producer
- **Procesador**: http://localhost:3000/processor  
- **Distribuidor**: http://localhost:3000/distributor
- **Retailer**: http://localhost:3000/retailer
- **Consumidor**: http://localhost:3000/consumer

## Soluci�n de Problemas

### Error de conexi�n a la API
```
Error: La API no est� disponible en http://localhost:3001
```
**Soluci�n**: Verificar que la API est� corriendo con `npm run dev` desde el directorio `/api`

### Error de autenticaci�n
```
Error: HTTP 401: Unauthorized
```
**Soluci�n**: Verificar que las wallets est�n registradas en el sistema

### Error de blockchain
```
Error: Error invoking chaincode
```
**Soluci�n**: 
1. Verificar que la red de Hyperledger Fabric est� activa
2. Ejecutar `./restart-api.sh` para reiniciar la API
3. Verificar logs en el directorio `/api/logs`

### Script se detiene prematuramente
**Soluci�n**: 
- Aumentar el tiempo de espera entre peticiones (`SLEEP_TIME`)
- Verificar que no haya productos duplicados
- Revisar logs de la API para errores espec�ficos

## Personalizaci�n

### Modificar productos:
Editar los arrays `FRESH_PRODUCTS` y `PROCESSED_PRODUCTS` en el script

### Cambiar wallets:
Modificar las secciones `PRODUCERS`, `PROCESSORS`, `DISTRIBUTORS`, `RETAILERS`

### Ajustar cantidades:
Cambiar los l�mites en los bucles (ej: `[[ $transfer_count -ge 15 ]]`)

### Tiempos de entrega:
Modificar los valores en las llamadas a `transfer_product`

## Notas Importantes

1. **Idempotencia**: Los scripts NO son idempotentes. Ejecutar m�ltiples veces crear� productos duplicados
2. **Limpieza**: No hay funci�n de limpieza autom�tica. Para limpiar datos, reiniciar la red blockchain
3. **Rendimiento**: El script tarda aproximadamente 2-3 minutos en completarse
4. **Logs**: Ambos scripts proporcionan logs detallados del progreso

## Para Presentaciones

El script est� dise�ado para presentaciones y demos. Despu�s de ejecutarlo:

1. **Dashboard completo**: Cada rol tendr� datos realistas
2. **Trazabilidad**: Productos con historial completo de transferencias
3. **QR codes**: Los retailers pueden generar c�digos QR
4. **Notificaciones**: Productos pr�ximos a vencer mostrar�n alertas
5. **Estad�sticas**: Dashboards con n�meros realistas

---

**�ltimo update**: Julio 2025
**Autor**: Sistema de Trazabilidad Alimentaria
**Versi�n**: 1.0