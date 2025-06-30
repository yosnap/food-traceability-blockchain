import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { MaterialIcons } from '@expo/vector-icons';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import ProductDetailsScreen from './src/screens/ProductDetailsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

// Components and Services
import { NotificationProvider } from './src/context/NotificationContext';
import { theme } from './src/theme/theme';

const Tab = createBottomTabNavigator();
const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <NotificationProvider>
          <NavigationContainer>
            <Tab.Navigator
              screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                  let iconName: string;

                  if (route.name === 'Home') {
                    iconName = 'home';
                  } else if (route.name === 'Scanner') {
                    iconName = 'qr-code';
                  } else if (route.name === 'Notifications') {
                    iconName = 'notifications';
                  } else if (route.name === 'Profile') {
                    iconName = 'person';
                  } else {
                    iconName = 'help';
                  }

                  return <MaterialIcons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: 'gray',
                headerStyle: {
                  backgroundColor: theme.colors.primary,
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              })}
            >
              <Tab.Screen 
                name="Home" 
                component={HomeScreen}
                options={{ 
                  title: 'Inicio',
                  headerTitle: 'Food Traceability'
                }}
              />
              <Tab.Screen 
                name="Scanner" 
                component={ScannerScreen}
                options={{ 
                  title: 'Escanear',
                  headerTitle: 'Escanear Producto'
                }}
              />
              <Tab.Screen 
                name="Notifications" 
                component={NotificationsScreen}
                options={{ 
                  title: 'Alertas',
                  headerTitle: 'Notificaciones'
                }}
              />
              <Tab.Screen 
                name="Profile" 
                component={ProfileScreen}
                options={{ 
                  title: 'Perfil',
                  headerTitle: 'Mi Perfil'
                }}
              />
            </Tab.Navigator>
          </NavigationContainer>
          <StatusBar style="light" />
          <Toast />
        </NotificationProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}