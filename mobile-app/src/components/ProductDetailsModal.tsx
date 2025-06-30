import React from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView,
  Dimensions 
} from 'react-native';
import { 
  Text, 
  Card, 
  Button, 
  Chip, 
  Divider,
  Surface
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Product, ProductStatus } from '../types';
import { theme, spacing } from '../theme/theme';
import { 
  getNotificationColor, 
  formatDaysToExpire,
  isUrgentNotification 
} from '../utils/notificationUtils';

const { height: screenHeight } = Dimensions.get('window');

interface ProductDetailsModalProps {
  product: Product;
  onClose: () => void;
  onScanAnother: () => void;
}

export default function ProductDetailsModal({ 
  product, 
  onClose, 
  onScanAnother 
}: ProductDetailsModalProps) {
  
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

  const calculateDaysToExpire = (): number => {
    const now = new Date();
    const expirationDate = new Date(product.expirationDate);
    const timeDiff = expirationDate.getTime() - now.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  };

  const daysToExpire = calculateDaysToExpire();
  const isUrgent = daysToExpire <= 3;

  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy', { locale: es });
    } catch {
      return dateString;
    }
  };

  const renderInfoRow = (icon: string, label: string, value: string, urgent?: boolean) => (
    <View style={styles.infoRow}>
      <Icon 
        name={icon} 
        size={20} 
        color={urgent ? getNotificationColor('critical') : theme.colors.onSurfaceVariant} 
      />
      <View style={styles.infoContent}>
        <Text variant="bodySmall" style={styles.infoLabel}>
          {label}
        </Text>
        <Text 
          variant="bodyMedium" 
          style={[
            styles.infoValue,
            urgent && { color: getNotificationColor('critical'), fontWeight: '600' }
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Surface style={styles.header} elevation={2}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Icon name="inventory" size={32} color={theme.colors.primary} />
            <View>
              <Text variant="headlineSmall" style={styles.productName}>
                {product.name}
              </Text>
              <Text variant="bodyMedium" style={styles.batchNumber}>
                Lote: {product.batchNumber}
              </Text>
            </View>
          </View>
          <Button 
            mode="text" 
            onPress={onClose}
            icon="close"
            compact
          >
            Cerrar
          </Button>
        </View>
      </Surface>

      {/* Estado y alertas */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.statusHeader}>
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

          {isUrgent && (
            <Surface style={styles.urgentAlert} elevation={1}>
              <Icon name="priority-high" size={24} color={getNotificationColor('critical')} />
              <Text variant="bodyMedium" style={styles.urgentText}>
                Este producto requiere atención urgente debido a su proximidad de vencimiento.
              </Text>
            </Surface>
          )}
        </Card.Content>
      </Card>

      {/* Información básica */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Información del Producto
          </Text>
          
          {renderInfoRow(
            'schedule', 
            'Fecha de Vencimiento', 
            formatDate(product.expirationDate),
            isUrgent
          )}
          
          {renderInfoRow(
            'today', 
            'Fecha de Producción', 
            formatDate(product.productionDate)
          )}
          
          {renderInfoRow(
            'place', 
            'Ubicación Actual', 
            product.currentLocation
          )}
          
          {renderInfoRow(
            'category', 
            'Variedad', 
            product.metadata.variety
          )}
          
          {renderInfoRow(
            'scale', 
            'Peso/Cantidad', 
            product.metadata.weight
          )}
          
          {renderInfoRow(
            'verified', 
            'Certificación', 
            product.metadata.certification
          )}
        </Card.Content>
      </Card>

      {/* Condiciones de almacenamiento */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Condiciones de Almacenamiento
          </Text>
          
          <View style={styles.conditionsRow}>
            <Surface style={styles.conditionCard} elevation={1}>
              <Icon name="thermostat" size={24} color={theme.colors.secondary} />
              <Text variant="bodySmall" style={styles.conditionLabel}>
                Temperatura
              </Text>
              <Text variant="titleMedium" style={styles.conditionValue}>
                {product.temperature}°C
              </Text>
            </Surface>
            
            <Surface style={styles.conditionCard} elevation={1}>
              <Icon name="water-drop" size={24} color={theme.colors.tertiary} />
              <Text variant="bodySmall" style={styles.conditionLabel}>
                Humedad
              </Text>
              <Text variant="titleMedium" style={styles.conditionValue}>
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
            Información del Productor
          </Text>
          
          {renderInfoRow(
            'business', 
            'Empresa', 
            product.producer.name
          )}
          
          {renderInfoRow(
            'location-on', 
            'Ubicación', 
            product.producer.location
          )}
          
          {renderInfoRow(
            'agriculture', 
            'Fecha de Cosecha', 
            formatDate(product.metadata.harvestDate)
          )}
        </Card.Content>
      </Card>

      {/* Historial de transferencias */}
      {product.metadata.transferHistory && product.metadata.transferHistory.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Historial de Transferencias
            </Text>
            
            {product.metadata.transferHistory.map((transfer, index) => (
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

      {/* Acciones */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.actionButtons}>
            <Button 
              mode="outlined" 
              onPress={onScanAnother}
              style={styles.actionButton}
              icon="qr-code-scanner"
            >
              Escanear Otro
            </Button>
            
            <Button 
              mode="contained" 
              onPress={() => {
                // Aquí se podría implementar funcionalidad adicional
                console.log('Share product details');
              }}
              style={styles.actionButton}
              icon="share"
            >
              Compartir
            </Button>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  productName: {
    fontWeight: '600',
    flex: 1,
  },
  batchNumber: {
    color: theme.colors.onSurfaceVariant,
  },
  card: {
    margin: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  statusHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  urgentAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: theme.roundness,
    backgroundColor: getNotificationColor('critical') + '10',
    borderColor: getNotificationColor('critical') + '30',
    borderWidth: 1,
  },
  urgentText: {
    flex: 1,
    color: getNotificationColor('critical'),
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  infoContent: {
    flex: 1,
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
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  spacer: {
    height: spacing.xl,
  },
});