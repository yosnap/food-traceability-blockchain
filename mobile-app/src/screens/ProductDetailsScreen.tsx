import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  Dimensions 
} from 'react-native';
import { 
  Text, 
  Card, 
  Button, 
  Chip, 
  ActivityIndicator,
  Surface,
  Divider
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { apiService } from '../services/api';
import { theme, spacing } from '../theme/theme';
import { Product, ProductHistory, ProductStatus } from '../types';
import { 
  getNotificationColor, 
  formatDaysToExpire 
} from '../utils/notificationUtils';

const { width: screenWidth } = Dimensions.get('window');

interface ProductDetailsScreenProps {
  route: {
    params: {
      productId: string;
    };
  };
  navigation: any;
}

export default function ProductDetailsScreen({ route, navigation }: ProductDetailsScreenProps) {
  const { productId } = route.params;
  const [refreshing, setRefreshing] = useState(false);

  // Query para obtener detalles del producto
  const { 
    data: productResponse, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => apiService.getProduct(productId),
  });

  // Query para obtener historial del producto
  const { 
    data: historyResponse, 
    refetch: refetchHistory 
  } = useQuery({
    queryKey: ['productHistory', productId],
    queryFn: () => apiService.getProductHistory(productId),
    enabled: !!productResponse?.success,
  });

  const product = productResponse?.success ? productResponse.data : null;
  const history = historyResponse?.success ? historyResponse.data : null;

  useEffect(() => {
    if (product) {
      navigation.setOptions({
        title: product.name,
      });
    }
  }, [product, navigation]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchHistory()]);
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: ProductStatus): string => {
    switch (status) {
      case ProductStatus.ACTIVE:
        return theme.colors.primary;
      case ProductStatus.IN_TRANSIT:
        return theme.colors.secondary;
      case ProductStatus.EXPIRED:
        return getNotificationColor('critical');
      case ProductStatus.RECALLED:
        return getNotificationColor('warning');
      case ProductStatus.CONSUMED:
        return theme.colors.onSurfaceVariant;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const getStatusLabel = (status: ProductStatus): string => {
    switch (status) {
      case ProductStatus.ACTIVE:
        return 'Activo';
      case ProductStatus.IN_TRANSIT:
        return 'En Tránsito';
      case ProductStatus.EXPIRED:
        return 'Vencido';
      case ProductStatus.RECALLED:
        return 'Retirado';
      case ProductStatus.CONSUMED:
        return 'Consumido';
      default:
        return 'Desconocido';
    }
  };

  const calculateDaysToExpire = (expirationDate: string): number => {
    const now = new Date();
    const expiry = new Date(expirationDate);
    const timeDiff = expiry.getTime() - now.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy, HH:mm', { locale: es });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Cargando producto...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.centered}>
        <Icon name="error" size={64} color={theme.colors.error} />
        <Text variant="headlineSmall" style={styles.errorTitle}>
          Error al cargar producto
        </Text>
        <Text variant="bodyMedium" style={styles.errorSubtitle}>
          No se pudo encontrar la información del producto solicitado.
        </Text>
        <Button 
          mode="contained" 
          onPress={() => refetch()}
          style={styles.retryButton}
          icon="refresh"
        >
          Reintentar
        </Button>
      </View>
    );
  }

  const daysToExpire = calculateDaysToExpire(product.expirationDate);
  const isUrgent = daysToExpire <= 3;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header del producto */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.productHeader}>
            <Icon name="inventory" size={48} color={theme.colors.primary} />
            <View style={styles.productInfo}>
              <Text variant="headlineSmall" style={styles.productName}>
                {product.name}
              </Text>
              <Text variant="bodyLarge" style={styles.batchNumber}>
                Lote: {product.batchNumber}
              </Text>
            </View>
          </View>
          
          <View style={styles.statusRow}>
            <Chip 
              icon="circle"
              style={{ backgroundColor: getStatusColor(product.status) + '20' }}
              textStyle={{ color: getStatusColor(product.status) }}
            >
              {getStatusLabel(product.status)}
            </Chip>
            
            {isUrgent && (
              <Chip 
                icon="alert"
                style={{ backgroundColor: getNotificationColor('critical') + '20' }}
                textStyle={{ color: getNotificationColor('critical') }}
              >
                {formatDaysToExpire(daysToExpire)}
              </Chip>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Alerta urgente */}
      {isUrgent && (
        <Card style={[styles.card, styles.urgentCard]}>
          <Card.Content>
            <View style={styles.urgentAlert}>
              <Icon name="priority-high" size={24} color={getNotificationColor('critical')} />
              <Text variant="bodyMedium" style={styles.urgentText}>
                Este producto requiere atención urgente debido a su proximidad de vencimiento.
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Información básica */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Información Básica
          </Text>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Icon name="schedule" size={20} color={theme.colors.onSurfaceVariant} />
              <View>
                <Text variant="bodySmall" style={styles.infoLabel}>Vencimiento</Text>
                <Text variant="bodyMedium" style={[
                  styles.infoValue,
                  isUrgent && { color: getNotificationColor('critical'), fontWeight: '600' }
                ]}>
                  {formatDate(product.expirationDate)}
                </Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <Icon name="today" size={20} color={theme.colors.onSurfaceVariant} />
              <View>
                <Text variant="bodySmall" style={styles.infoLabel}>Producción</Text>
                <Text variant="bodyMedium" style={styles.infoValue}>
                  {formatDate(product.productionDate)}
                </Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <Icon name="place" size={20} color={theme.colors.onSurfaceVariant} />
              <View>
                <Text variant="bodySmall" style={styles.infoLabel}>Ubicación</Text>
                <Text variant="bodyMedium" style={styles.infoValue}>
                  {product.currentLocation}
                </Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <Icon name="category" size={20} color={theme.colors.onSurfaceVariant} />
              <View>
                <Text variant="bodySmall" style={styles.infoLabel}>Variedad</Text>
                <Text variant="bodyMedium" style={styles.infoValue}>
                  {product.metadata.variety}
                </Text>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Condiciones de almacenamiento */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Condiciones Actuales
          </Text>
          
          <View style={styles.conditionsRow}>
            <Surface style={styles.conditionCard} elevation={1}>
              <Icon name="thermostat" size={32} color={theme.colors.secondary} />
              <Text variant="bodySmall" style={styles.conditionLabel}>
                Temperatura
              </Text>
              <Text variant="titleLarge" style={styles.conditionValue}>
                {product.temperature}°C
              </Text>
            </Surface>
            
            <Surface style={styles.conditionCard} elevation={1}>
              <Icon name="water-drop" size={32} color={theme.colors.tertiary} />
              <Text variant="bodySmall" style={styles.conditionLabel}>
                Humedad
              </Text>
              <Text variant="titleLarge" style={styles.conditionValue}>
                {product.humidity}%
              </Text>
            </Surface>
          </View>
        </Card.Content>
      </Card>

      {/* Información del productor */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Productor
          </Text>
          
          <View style={styles.producerInfo}>
            <Icon name="business" size={24} color={theme.colors.primary} />
            <View style={styles.producerDetails}>
              <Text variant="titleSmall" style={styles.producerName}>
                {product.producer.name}
              </Text>
              <Text variant="bodyMedium" style={styles.producerLocation}>
                📍 {product.producer.location}
              </Text>
              <Text variant="bodySmall" style={styles.harvestDate}>
                Cosecha: {formatDate(product.metadata.harvestDate)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Certificaciones y metadata */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Certificaciones y Detalles
          </Text>
          
          <View style={styles.metadataGrid}>
            <Chip icon="verified" style={styles.metadataChip}>
              {product.metadata.certification}
            </Chip>
            <Chip icon="scale" style={styles.metadataChip}>
              {product.metadata.weight}
            </Chip>
          </View>
        </Card.Content>
      </Card>

      {/* Historial de trazabilidad */}
      {history && history.events && history.events.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Historial de Trazabilidad
            </Text>
            
            {history.events.map((event, index) => (
              <View key={index}>
                <View style={styles.historyItem}>
                  <View style={styles.historyDot} />
                  <View style={styles.historyContent}>
                    <Text variant="bodyMedium" style={styles.historyDescription}>
                      {event.description}
                    </Text>
                    <Text variant="bodySmall" style={styles.historyDetails}>
                      {event.actor} • {event.location}
                    </Text>
                    <Text variant="bodySmall" style={styles.historyTimestamp}>
                      {formatDate(event.timestamp)}
                    </Text>
                  </View>
                </View>
                
                {index < history.events.length - 1 && (
                  <View style={styles.historyLine} />
                )}
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Transferencias */}
      {product.metadata.transferHistory && product.metadata.transferHistory.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Transferencias
            </Text>
            
            {product.metadata.transferHistory!.map((transfer, index) => (
              <View key={index}>
                <View style={styles.transferItem}>
                  <Icon name="swap-horiz" size={20} color={theme.colors.primary} />
                  <View style={styles.transferContent}>
                    <Text variant="bodyMedium" style={styles.transferText}>
                      Transferido a {transfer.recipient}
                    </Text>
                    <Text variant="bodySmall" style={styles.transferDate}>
                      {formatDate(transfer.timestamp)} • {transfer.location}
                    </Text>
                  </View>
                </View>
                {index < product.metadata.transferHistory!.length - 1 && (
                  <Divider style={styles.transferDivider} />
                )}
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      <View style={styles.spacer} />
    </ScrollView>
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
  errorTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorSubtitle: {
    textAlign: 'center',
    marginBottom: spacing.xl,
    color: theme.colors.onSurfaceVariant,
  },
  retryButton: {
    marginTop: spacing.md,
  },
  headerCard: {
    margin: spacing.md,
    marginBottom: spacing.sm,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  batchNumber: {
    color: theme.colors.onSurfaceVariant,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  card: {
    margin: spacing.md,
    marginBottom: spacing.sm,
  },
  urgentCard: {
    borderLeftWidth: 4,
    borderLeftColor: getNotificationColor('critical'),
  },
  urgentAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  urgentText: {
    flex: 1,
    color: getNotificationColor('critical'),
    fontWeight: '500',
  },
  sectionTitle: {
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  infoGrid: {
    gap: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  infoLabel: {
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontWeight: '500',
  },
  conditionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  conditionCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: theme.roundness,
    alignItems: 'center',
    gap: spacing.xs,
  },
  conditionLabel: {
    color: theme.colors.onSurfaceVariant,
  },
  conditionValue: {
    fontWeight: '600',
  },
  producerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  producerDetails: {
    flex: 1,
  },
  producerName: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  producerLocation: {
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  harvestDate: {
    color: theme.colors.onSurfaceVariant,
  },
  metadataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metadataChip: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  historyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    marginTop: 6,
  },
  historyContent: {
    flex: 1,
  },
  historyDescription: {
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  historyDetails: {
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  historyTimestamp: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
  },
  historyLine: {
    width: 2,
    height: spacing.md,
    backgroundColor: theme.colors.outline,
    marginLeft: 5,
  },
  transferItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  transferContent: {
    flex: 1,
  },
  transferText: {
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  transferDate: {
    color: theme.colors.onSurfaceVariant,
  },
  transferDivider: {
    marginVertical: spacing.xs,
  },
  spacer: {
    height: spacing.xl,
  },
});