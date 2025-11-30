import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  useEffect(() => {
    // Configurar cores no Android
    if (Platform.OS === 'android') {
      try {
        const { StatusBar: RNStatusBar } = require('react-native');
        RNStatusBar.setBackgroundColor('#1a1a1a');
        RNStatusBar.setBarStyle('light-content');
        
        // Tentar desabilitar edge-to-edge se disponível
        try {
          const EdgeToEdge = require('react-native-edge-to-edge');
          if (EdgeToEdge?.disable) {
            EdgeToEdge.disable();
          }
        } catch (e) {
          // Ignorar se não estiver disponível
        }
      } catch (error) {
        console.log('Erro ao configurar status bar:', error);
      }
    }
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#1a1a1a' }} edges={["bottom","left","right"]}>
          <StatusBar style="light" backgroundColor="#1a1a1a" translucent={false} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#1a1a1a' },
              animation: 'fade',
              animationDuration: 200,
              navigationBarColor: '#1a1a1a',
              statusBarBackgroundColor: '#1a1a1a',
            }}
          >
            <Stack.Screen 
              name="index" 
              options={{
                animation: 'fade',
                animationDuration: 200,
                contentStyle: { backgroundColor: '#1a1a1a' },
              }}
            />
            <Stack.Screen 
              name="auth/login" 
              options={{
                animation: 'fade',
                animationDuration: 200,
                contentStyle: { backgroundColor: '#1a1a1a' },
              }}
            />
            <Stack.Screen 
              name="auth/register" 
              options={{
                animation: 'fade',
                animationDuration: 200,
                contentStyle: { backgroundColor: '#1a1a1a' },
              }}
            />
            <Stack.Screen 
              name="(app)/home" 
              options={{
                animation: 'fade',
                animationDuration: 200,
                contentStyle: { backgroundColor: '#1a1a1a' },
              }}
            />
          </Stack>
        </SafeAreaView>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
