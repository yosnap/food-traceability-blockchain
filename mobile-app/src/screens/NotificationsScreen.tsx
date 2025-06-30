import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  RefreshControl,
  TouchableOpacity 
} from 'react-native';
import { 
  Text, 
  Card, 
  Chip, 
  Button, 
  Searchbar,
  SegmentedButtons,
  FAB,
  Badge
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNotifications } from '../context/NotificationContext';
import { theme, spacing } from '../theme/theme';
import { Notification } from '../types';
import { 
  getNotificationColor, 
  getNotificationIcon,
  formatDaysToExpire 
} from '../utils/notificationUtils';

type FilterType = 'all' | 'critical' | 'warning' | 'info';

export default function NotificationsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  
  const { 
    notifications, 
    stats, 
    markAsRead, 
    markAllAsRead, 
    refreshNotifications 
  } = useNotifications();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshNotifications();
    } finally {
      setRefreshing(false);
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.productName
      .toLowerCase()
      .includes(searchQuery.toLowerCase()) ||
      notification.batchNumber
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    
    const matchesFilter = selectedFilter === 'all' || notification.type === selectedFilter;
    
    return matchesSearch && matchesFilter;
  });

  const filterButtons = [
    {
      value: 'all',
      label: `Todas (${stats.total})`,
      icon: 'notifications',
    },
    {
      value: 'critical',
      label: `Críticas (${stats.critical})`,
      icon: 'alert-circle',
    },
    {
      value: 'warning',
      label: `Advertencias (${stats.warning})`,
      icon: 'alert',
    },
    {
      value: 'info',
      label: `Info (${stats.info})`,
      icon: 'information',
    },
  ];

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      onPress={() => markAsRead(item.id)}
      activeOpacity={0.7}
    >
      <Card 
        style={[
          styles.notificationCard,
          !item.isRead && styles.unreadCard,
          item.type === 'critical' && styles.criticalCard
        ]}
      >
        <Card.Content>
          <View style={styles.notificationHeader}>
            <View style={styles.notificationLeft}>
              <Icon 
                name={getNotificationIcon(item.type)} 
                size={24} 
                color={getNotificationColor(item.type)} 
              />
              <View style={styles.notificationContent}>
                <Text variant="titleSmall" style={styles.notificationTitle}>
                  {item.title}
                </Text>
                <Text variant="bodyMedium" style={styles.notificationMessage}>
                  {item.productName}
                </Text>
                <Text variant="bodySmall" style={styles.notificationSubtitle}>
                  {formatDaysToExpire(item.daysToExpire)}
                </Text>
              </View>
            </View>
            {!item.isRead && (
              <Badge style={styles.unreadBadge} />
            )}
          </View>
          
          <View style={styles.notificationDetails}>
            <Chip 
              compact 
              icon="qrcode"
              style={styles.detailChip}
            >
              {item.batchNumber}
            </Chip>
            <Chip 
              compact 
              icon="map-marker"
              style={styles.detailChip}
            >
              {item.currentLocation}
            </Chip>
          </View>
          
          <Text variant="bodySmall" style={styles.notificationTime}>
            {format(new Date(item.timestamp), 'dd MMM yyyy, HH:mm', { locale: es })}
          </Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon 
        name="notifications-none" 
        size={64} 
        color={theme.colors.onSurfaceVariant} 
      />
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        Sin notificaciones
      </Text>
      <Text variant="bodyMedium" style={styles.emptySubtitle}>
        {selectedFilter === 'all' 
          ? 'No tienes notificaciones en este momento'
          : `No hay notificaciones de tipo "${filterButtons.find(b => b.value === selectedFilter)?.label}"`
        }
      </Text>
      <Button 
        mode="outlined" 
        onPress={handleRefresh}
        style={styles.emptyButton}
        icon="refresh"
      >
        Actualizar
      </Button>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header con estadísticas */}
      <Card style={styles.statsCard}>
        <Card.Content>
          <View style={styles.statsHeader}>
            <Text variant="titleMedium">Resumen de Alertas</Text>
            {stats.unread > 0 && (
              <Button 
                mode="text" 
                onPress={markAllAsRead}
                compact
                icon="check-all"
              >
                Marcar todas leídas
              </Button>
            )}
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={{ color: theme.colors.primary }}>
                {stats.total}
              </Text>
              <Text variant="bodySmall">Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={{ color: getNotificationColor('critical') }}>
                {stats.critical}
              </Text>
              <Text variant="bodySmall">Críticas</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={{ color: getNotificationColor('warning') }}>
                {stats.warning}
              </Text>
              <Text variant="bodySmall">Advertencias</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                {stats.unread}
              </Text>
              <Text variant="bodySmall">Sin leer</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Barra de búsqueda */}
      <Searchbar
        placeholder="Buscar por producto o lote..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
        icon="magnify"
        clearIcon="close"
      />

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <SegmentedButtons
          value={selectedFilter}
          onValueChange={(value) => setSelectedFilter(value as FilterType)}
          buttons={filterButtons.map(button => ({
            value: button.value,
            label: button.label,
            icon: button.icon,
            style: selectedFilter === button.value ? styles.activeFilter : undefined,
          }))}
          density="small"
        />
      </View>

      {/* Lista de notificaciones */}
      <FlatList
        data={filteredNotifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          filteredNotifications.length === 0 && styles.emptyContainer
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB para acciones rápidas */}
      {stats.critical > 0 && (
        <FAB
          icon="priority-high"
          label={`${stats.critical} críticas`}
          style={[styles.fab, { backgroundColor: getNotificationColor('critical') }]}
          onPress={() => setSelectedFilter('critical')}
          visible={selectedFilter !== 'critical'}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  statsCard: {
    margin: spacing.md,
    marginBottom: spacing.sm,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  searchbar: {
    margin: spacing.md,
    marginBottom: spacing.sm,
  },
  filtersContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  activeFilter: {
    backgroundColor: theme.colors.primaryContainer,
  },
  listContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyContainer: {
    flex: 1,
  },
  notificationCard: {
    marginBottom: spacing.sm,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  criticalCard: {
    borderLeftColor: getNotificationColor('critical'),
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    flex: 1,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  notificationMessage: {
    marginBottom: spacing.xs,
  },
  notificationSubtitle: {
    color: theme.colors.onSurfaceVariant,
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary,
    alignSelf: 'flex-start',
  },
  notificationDetails: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailChip: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  notificationTime: {
    color: theme.colors.onSurfaceVariant,
    textAlign: 'right',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    marginBottom: spacing.xl,
    color: theme.colors.onSurfaceVariant,
  },
  emptyButton: {
    marginTop: spacing.md,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.md,
  },
});