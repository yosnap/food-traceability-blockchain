import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert,
  RefreshControl 
} from 'react-native';
import { 
  Text, 
  Card, 
  Avatar, 
  Button, 
  List, 
  Switch, 
  Divider,
  Surface,
  Dialog,
  Portal,
  RadioButton
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { apiService } from '../services/api';
import { theme, spacing } from '../theme/theme';
import { User, UserRole } from '../types';
import Toast from 'react-native-toast-message';

export default function ProfileScreen() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.CONSUMER);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const response = await apiService.getCurrentUser();
      if (response.success && response.data) {
        setCurrentUser(response.data);
        setSelectedRole(response.data.role);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadUserProfile();
    } finally {
      setRefreshing(false);
    }
  };

  const handleRoleChange = async (newRole: UserRole) => {
    try {
      const response = await apiService.authenticate(newRole);
      if (response.success && response.data) {
        setCurrentUser(response.data.user);
        setSelectedRole(newRole);
        setShowRoleDialog(false);
        Toast.show({
          type: 'success',
          text1: 'Rol actualizado',
          text2: `Ahora eres ${getRoleLabel(newRole)}`,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo cambiar el rol',
      });
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Cerrar Sesión', 
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.logout();
              setCurrentUser(null);
              Toast.show({
                type: 'success',
                text1: 'Sesión cerrada',
                text2: 'Has cerrado sesión exitosamente',
              });
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
  };

  const getRoleIcon = (role: UserRole): string => {
    switch (role) {
      case UserRole.PRODUCER: return 'agriculture';
      case UserRole.PROCESSOR: return 'precision-manufacturing';
      case UserRole.DISTRIBUTOR: return 'local-shipping';
      case UserRole.RETAILER: return 'store';
      case UserRole.CONSUMER: return 'person';
      case UserRole.ADMIN: return 'admin-panel-settings';
      default: return 'person';
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

  const getRoleDescription = (role: UserRole): string => {
    switch (role) {
      case UserRole.PRODUCER: return 'Cultivo y producción de alimentos';
      case UserRole.PROCESSOR: return 'Procesamiento y transformación';
      case UserRole.DISTRIBUTOR: return 'Logística y distribución';
      case UserRole.RETAILER: return 'Venta al por menor';
      case UserRole.CONSUMER: return 'Consumidor final';
      case UserRole.ADMIN: return 'Administración del sistema';
      default: return 'Usuario del sistema';
    }
  };

  const roles = Object.values(UserRole);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Perfil de usuario */}
      <Card style={styles.profileCard}>
        <Card.Content>
          <View style={styles.profileHeader}>
            <Avatar.Icon 
              size={80} 
              icon={currentUser ? getRoleIcon(currentUser.role) : 'person'}
              style={{ backgroundColor: theme.colors.primary }}
            />
            <View style={styles.profileInfo}>
              <Text variant="headlineSmall" style={styles.userName}>
                {currentUser?.name || 'Usuario'}
              </Text>
              <Text variant="bodyLarge" style={styles.userRole}>
                {currentUser ? getRoleLabel(currentUser.role) : 'Cargando...'}
              </Text>
              <Text variant="bodyMedium" style={styles.userLocation}>
                📍 {currentUser?.location || 'Ubicación no disponible'}
              </Text>
              <Text variant="bodySmall" style={styles.userEmail}>
                ✉️ {currentUser?.email || 'Email no disponible'}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Información del rol */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Información del Rol
          </Text>
          
          <Surface style={styles.roleInfo} elevation={1}>
            <Icon 
              name={currentUser ? getRoleIcon(currentUser.role) : 'person'} 
              size={32} 
              color={theme.colors.primary} 
            />
            <View style={styles.roleDetails}>
              <Text variant="titleMedium">
                {currentUser ? getRoleLabel(currentUser.role) : 'Rol'}
              </Text>
              <Text variant="bodyMedium" style={styles.roleDescription}>
                {currentUser ? getRoleDescription(currentUser.role) : 'Descripción del rol'}
              </Text>
            </View>
          </Surface>
          
          <Button 
            mode="outlined" 
            onPress={() => setShowRoleDialog(true)}
            style={styles.changeRoleButton}
            icon="swap-horiz"
          >
            Cambiar Rol
          </Button>
        </Card.Content>
      </Card>

      {/* Configuración */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Configuración
          </Text>
          
          <List.Item
            title="Notificaciones Push"
            description="Recibir alertas de productos próximos a vencer"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
              />
            )}
          />
          
          <Divider />
          
          <List.Item
            title="Modo Oscuro"
            description="Interfaz oscura para menor fatiga visual"
            left={(props) => <List.Icon {...props} icon="dark-mode" />}
            right={() => (
              <Switch
                value={darkModeEnabled}
                onValueChange={setDarkModeEnabled}
              />
            )}
          />
          
          <Divider />
          
          <List.Item
            title="Idioma"
            description="Español"
            left={(props) => <List.Icon {...props} icon="language" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              Toast.show({
                type: 'info',
                text1: 'Próximamente',
                text2: 'Configuración de idioma disponible pronto',
              });
            }}
          />
        </Card.Content>
      </Card>

      {/* Información de la app */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Información
          </Text>
          
          <List.Item
            title="Acerca de Food Traceability"
            description="Versión 1.0.0"
            left={(props) => <List.Icon {...props} icon="information" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              Alert.alert(
                'Food Traceability',
                'Sistema de trazabilidad de alimentos basado en blockchain.\n\nVersión: 1.0.0\nDesarrollado con React Native + Expo\nBlockchain: Hyperledger Fabric'
              );
            }}
          />
          
          <Divider />
          
          <List.Item
            title="Términos y Condiciones"
            left={(props) => <List.Icon {...props} icon="description" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              Toast.show({
                type: 'info',
                text1: 'Próximamente',
                text2: 'Términos y condiciones disponibles pronto',
              });
            }}
          />
          
          <Divider />
          
          <List.Item
            title="Política de Privacidad"
            left={(props) => <List.Icon {...props} icon="privacy-tip" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              Toast.show({
                type: 'info',
                text1: 'Próximamente',
                text2: 'Política de privacidad disponible pronto',
              });
            }}
          />
        </Card.Content>
      </Card>

      {/* Acciones */}
      <Card style={styles.card}>
        <Card.Content>
          <Button 
            mode="outlined" 
            onPress={handleLogout}
            style={styles.logoutButton}
            icon="logout"
            buttonColor={theme.colors.surface}
            textColor={theme.colors.error}
          >
            Cerrar Sesión
          </Button>
        </Card.Content>
      </Card>

      {/* Dialog para cambio de rol */}
      <Portal>
        <Dialog visible={showRoleDialog} onDismiss={() => setShowRoleDialog(false)}>
          <Dialog.Title>Seleccionar Rol</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogDescription}>
              Elige el rol con el que quieres usar la aplicación:
            </Text>
            
            <RadioButton.Group 
              onValueChange={(value) => setSelectedRole(value as UserRole)} 
              value={selectedRole}
            >
              {roles.map((role) => (
                <View key={role} style={styles.roleOption}>
                  <RadioButton.Item
                    label={getRoleLabel(role)}
                    value={role}
                    style={styles.radioItem}
                  />
                  <Text variant="bodySmall" style={styles.roleOptionDescription}>
                    {getRoleDescription(role)}
                  </Text>
                </View>
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowRoleDialog(false)}>
              Cancelar
            </Button>
            <Button 
              mode="contained" 
              onPress={() => handleRoleChange(selectedRole)}
            >
              Cambiar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  profileCard: {
    margin: spacing.md,
    marginBottom: spacing.sm,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  userRole: {
    color: theme.colors.primary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  userLocation: {
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  userEmail: {
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
  roleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: theme.roundness,
    marginBottom: spacing.md,
  },
  roleDetails: {
    flex: 1,
  },
  roleDescription: {
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  changeRoleButton: {
    alignSelf: 'flex-start',
  },
  logoutButton: {
    borderColor: theme.colors.error,
  },
  dialogDescription: {
    marginBottom: spacing.md,
    color: theme.colors.onSurfaceVariant,
  },
  roleOption: {
    marginBottom: spacing.sm,
  },
  radioItem: {
    paddingHorizontal: 0,
  },
  roleOptionDescription: {
    marginLeft: spacing.xl,
    marginTop: -spacing.sm,
    color: theme.colors.onSurfaceVariant,
  },
  spacer: {
    height: spacing.xl,
  },
});