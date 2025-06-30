import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  Alert 
} from 'react-native';
import { 
  Text, 
  Card, 
  Button, 
  Avatar, 
  Badge,
  Chip,
  ProgressBar,
  Divider
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { theme, spacing } from '../theme/theme';
import { User, UserRole } from '../types';
import { getNotificationColor, formatDaysToExpire } from '../utils/notificationUtils';

export default function HomeScreen() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const { 
    notifications, 
    stats, 
    refreshNotifications,
    requestPermissions 
  } = useNotifications();

  // Query para obtener estadísticas del usuario
  const { data: userStats, refetch: refetchStats } = useQuery({
    queryKey: ['userStats'],
    queryFn: () => apiService.getUserStats(),
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });

  // Cargar usuario actual
  useEffect(() => {
    loadCurrentUser();
    requestPermissions();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const response = await apiService.getCurrentUser();
      if (response.success && response.data) {
        setCurrentUser(response.data);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshNotifications(),
        refetchStats(),
        loadCurrentUser()
      ]);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleQuickScan = () => {
    Alert.alert(
      'Escaneo Rápido',
      '¿Deseas abrir el escáner QR?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Abrir Escáner', onPress: () => console.log('Navigate to scanner') }
      ]
    );
  };

  const getRoleIcon = (role: UserRole): string => {
    switch (role) {
      case UserRole.PRODUCER: return 'agriculture';
      case UserRole.PROCESSOR: return 'precision-manufacturing';
      case UserRole.DISTRIBUTOR: return 'local-shipping';
      case UserRole.RETAILER: return 'store';
      case UserRole.CONSUMER: return 'account-circle';
      case UserRole.ADMIN: return 'admin-panel-settings';
      default: return 'account-circle';
    }
  };

  const getRoleLabel = (role: UserRole): string => {
    switch (role) {
      case UserRole.PRODUCER: return 'Productor';
      case UserRole.PROCESSOR: return 'Procesador';
      case UserRole.DISTRIBUTOR: return 'Distribuidor';
      case UserRole.RETAILER: return 'Minorista';
      case UserRole.CONSUMER: return 'Consumidor';
      case UserRole.ADMIN: return 'Administrador';
      default: return 'Usuario';
    }
  };

  const urgentNotifications = notifications.filter(n => 
    n.type === 'critical' && !n.isRead
  ).slice(0, 3);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Usuario Header */}
      <Card style={styles.userCard}>
        <Card.Content>
          <View style={styles.userHeader}>
            <Avatar.Icon 
              size={60} 
              icon={currentUser ? getRoleIcon(currentUser.role) : 'person'}
              style={{ backgroundColor: theme.colors.primary }}
            />
            <View style={styles.userInfo}>
              <Text variant="headlineSmall">
                {currentUser?.name || 'Usuario'}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {currentUser ? getRoleLabel(currentUser.role) : 'Cargando...'}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                📍 {currentUser?.location || 'Ubicación no disponible'}
              </Text>
            </View>
            <Badge 
              style={{ backgroundColor: getNotificationColor('critical') }}
              visible={stats.unread > 0}
            >
              {stats.unread}
            </Badge>
          </View>
        </Card.Content>
      </Card>

      {/* Acciones Rápidas */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Acciones Rápidas
          </Text>
          <View style={styles.quickActions}>
            <Button 
              mode="contained" 
              onPress={handleQuickScan}
              style={styles.quickButton}
              icon="qrcode"
            >
              Escanear QR
            </Button>
            <Button 
              mode="outlined" 
              onPress={() => console.log('Search products')}
              style={styles.quickButton}
              icon="magnify"
            >
              Buscar
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Resumen de Notificaciones */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.notificationHeader}>
            <Text variant="titleMedium">Resumen de Alertas</Text>
            <Chip 
              icon="notifications"
              style={{ backgroundColor: theme.colors.primaryContainer }}
            >
              {stats.total} total
            </Chip>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Icon name="error" size={24} color={getNotificationColor('critical')} />
              <Text variant="titleLarge" style={{ color: getNotificationColor('critical') }}>
                {stats.critical}
              </Text>
              <Text variant="bodySmall">Críticas</Text>
            </View>
            
            <View style={styles.statItem}>
              <Icon name="warning" size={24} color={getNotificationColor('warning')} />
              <Text variant="titleLarge" style={{ color: getNotificationColor('warning') }}>
                {stats.warning}
              </Text>
              <Text variant="bodySmall">Advertencias</Text>
            </View>
            
            <View style={styles.statItem}>
              <Icon name="info" size={24} color={getNotificationColor('info')} />
              <Text variant="titleLarge" style={{ color: getNotificationColor('info') }}>
                {stats.info}
              </Text>
              <Text variant="bodySmall">Informativas</Text>
            </View>
          </View>

          {stats.unread > 0 && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.progressSection}>
                <Text variant="bodyMedium">
                  Notificaciones sin leer: {stats.unread} de {stats.total}
                </Text>
                <ProgressBar 
                  progress={1 - (stats.unread / Math.max(stats.total, 1))} 
                  color={theme.colors.primary}
                  style={styles.progressBar}
                />
              </View>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Alertas Urgentes */}
      {urgentNotifications.length > 0 && (
        <Card style={[styles.card, styles.urgentCard]}>
          <Card.Content>
            <View style={styles.urgentHeader}>
              <Icon name="priority-high" size={24} color={getNotificationColor('critical')} />
              <Text variant="titleMedium" style={{ color: getNotificationColor('critical') }}>
                Atención Urgente Requerida
              </Text>
            </View>
            
            {urgentNotifications.map(notification => (
              <View key={notification.id} style={styles.urgentNotification}>
                <View style={styles.urgentContent}>
                  <Text variant="bodyMedium" style={styles.urgentTitle}>
                    {notification.productName}
                  </Text>
                  <Text variant="bodySmall" style={styles.urgentSubtitle}>
                    {formatDaysToExpire(notification.daysToExpire)}
                  </Text>
                  <Text variant="bodySmall" style={styles.urgentLocation}>
                    📍 {notification.currentLocation}
                  </Text>
                </View>
                <Icon name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
              </View>
            ))}
            
            <Button 
              mode="contained" 
              style={styles.urgentButton}
              buttonColor={getNotificationColor('critical')}
              onPress={() => console.log('Navigate to notifications')}
            >
              Ver Todas las Alertas
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Estado del Sistema */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Estado del Sistema
          </Text>
          
          <View style={styles.systemStatus}>
            <View style={styles.statusItem}>
              <Icon name="cloud-done" size={20} color={theme.colors.primary} />
              <Text variant="bodyMedium">API Conectada</Text>
            </View>
            
            <View style={styles.statusItem}>
              <Icon name="notifications-active" size={20} color={theme.colors.primary} />
              <Text variant="bodyMedium">Notificaciones Activas</Text>
            </View>
            
            <View style={styles.statusItem}>
              <Icon name="security" size={20} color={theme.colors.primary} />
              <Text variant="bodyMedium">Blockchain Seguro</Text>
            </View>
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
  userCard: {
    margin: spacing.md,
    marginBottom: spacing.sm,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  card: {
    margin: spacing.md,
    marginBottom: spacing.sm,
  },
  urgentCard: {
    borderLeftWidth: 4,
    borderLeftColor: getNotificationColor('critical'),
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickButton: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  progressSection: {
    gap: spacing.xs,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  urgentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  urgentNotification: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  urgentContent: {
    flex: 1,
  },
  urgentTitle: {
    fontWeight: '600',
  },
  urgentSubtitle: {
    color: getNotificationColor('critical'),
    fontWeight: '500',
  },
  urgentLocation: {
    color: theme.colors.onSurfaceVariant,
  },
  urgentButton: {
    marginTop: spacing.md,
  },
  systemStatus: {
    gap: spacing.sm,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  divider: {
    marginVertical: spacing.md,
  },
  spacer: {
    height: spacing.xl,
  },
});