import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  Dimensions,
  Vibration 
} from 'react-native';
import { 
  Text, 
  Button, 
  Card, 
  ActivityIndicator,
  Portal,
  Modal,
  Chip
} from 'react-native-paper';
// import { BarCodeScanner } from 'expo-barcode-scanner';
// import { Camera } from 'expo-camera';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useMutation } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { theme, spacing } from '../theme/theme';
import { Product } from '../types';
import ProductDetailsModal from '../components/ProductDetailsModal';
import Toast from 'react-native-toast-message';

const { width: screenWidth } = Dimensions.get('window');

export default function ScannerScreen() {
  const [scanned, setScanned] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);

  // Mutation para buscar producto
  const searchProductMutation = useMutation({
    mutationFn: (productId: string) => apiService.getProduct(productId),
    onSuccess: (response) => {
      if (response.success && response.data) {
        setScannedProduct(response.data);
        setShowProductModal(true);
        Vibration.vibrate(100); // Vibración corta de éxito
        Toast.show({
          type: 'success',
          text1: 'Producto encontrado',
          text2: response.data.name,
        });
      } else {
        Alert.alert(
          'Producto no encontrado',
          response.error || 'El código QR escaneado no corresponde a un producto válido.',
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
      }
    },
    onError: (error) => {
      Alert.alert(
        'Error de conexión',
        'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
        [{ text: 'Reintentar', onPress: () => setScanned(false) }]
      );
      console.error('Search error:', error);
    },
  });

  // Camera functionality disabled for Expo Go compatibility

  // Camera permissions not needed in demo mode

  // QR scanning functionality disabled for Expo Go

  // Flash controls disabled for demo

  const handleManualInput = () => {
    Alert.prompt(
      'Código Manual',
      'Ingresa el código del producto:',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Buscar', 
          onPress: (text) => {
            if (text?.trim()) {
              searchProductMutation.mutate(text.trim());
            }
          }
        }
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const resetScanner = () => {
    setScanned(false);
    setScannedProduct(null);
    setShowProductModal(false);
  };

  // Demo mode - skip camera permissions

  return (
    <View style={styles.container}>
      {/* Demo Scanner Interface */}
      <View style={styles.cameraContainer}>
        <View style={styles.demoCamera}>
          <Icon name="qr-code-scanner" size={120} color={theme.colors.primary} />
          <Text variant="headlineSmall" style={styles.demoText}>
            Modo Demo
          </Text>
          <Text variant="bodyMedium" style={styles.demoSubtext}>
            Escáner QR no disponible en Expo Go
          </Text>
          <Text variant="bodySmall" style={styles.demoNote}>
            Usa "Código Manual" para probar la funcionalidad
          </Text>
        </View>
        
        {/* Overlay con marco de escaneo */}
        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>
      </View>

      {/* Información y controles */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <View style={styles.infoHeader}>
            <Icon name="qr-code-scanner" size={24} color={theme.colors.primary} />
            <Text variant="titleMedium">Escáner de Trazabilidad</Text>
          </View>
          
          <Text variant="bodyMedium" style={styles.instruction}>
            Apunta la cámara hacia el código QR del producto para obtener su información de trazabilidad completa.
          </Text>

          {scanned && searchProductMutation.isPending && (
            <View style={styles.scanningState}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text variant="bodySmall">Buscando producto...</Text>
            </View>
          )}

          {scanned && !searchProductMutation.isPending && (
            <Chip 
              icon="check-circle"
              style={styles.scannedChip}
              textStyle={{ color: theme.colors.primary }}
            >
              Código escaneado
            </Chip>
          )}

          <View style={styles.buttonRow}>
            <Button 
              mode="outlined" 
              onPress={handleManualInput}
              style={styles.actionButton}
              icon="keyboard"
            >
              Código Manual
            </Button>
            
            {scanned && (
              <Button 
                mode="contained" 
                onPress={resetScanner}
                style={styles.actionButton}
                icon="refresh"
              >
                Escanear Otro
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Modal de detalles del producto */}
      <Portal>
        <Modal
          visible={showProductModal}
          onDismiss={() => setShowProductModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          {scannedProduct && (
            <ProductDetailsModal
              product={scannedProduct}
              onClose={() => setShowProductModal(false)}
              onScanAnother={resetScanner}
            />
          )}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    color: theme.colors.onSurfaceVariant,
  },
  noPermissionTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  noPermissionText: {
    textAlign: 'center',
    marginBottom: spacing.xl,
    color: theme.colors.onSurfaceVariant,
  },
  permissionButton: {
    marginBottom: spacing.md,
  },
  manualButton: {
    marginBottom: spacing.md,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  demoCamera: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    padding: spacing.xl,
  },
  demoText: {
    marginTop: spacing.md,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  demoSubtext: {
    marginTop: spacing.sm,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  demoNote: {
    marginTop: spacing.sm,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: screenWidth * 0.7,
    height: screenWidth * 0.7,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: theme.colors.primary,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  cameraControls: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.md,
  },
  infoCard: {
    margin: spacing.md,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  instruction: {
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  scanningState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    justifyContent: 'center',
  },
  scannedChip: {
    alignSelf: 'center',
    marginBottom: spacing.md,
    backgroundColor: theme.colors.primaryContainer,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    margin: spacing.md,
  },
});