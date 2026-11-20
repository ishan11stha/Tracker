import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useVaultStore } from '../store/useVaultStore';
import { getThemeColors } from '../theme/colors';
import { requestNotificationPermissions } from '../utils/notifications';

export default function RootLayout() {
  const { isHydrated, hydrateFromDB, settings } = useVaultStore();
  const isDark = settings.theme === 'dark';
  const theme = getThemeColors(isDark);

  useEffect(() => {
    hydrateFromDB();
    requestNotificationPermissions();
  }, [hydrateFromDB]);

  if (!isHydrated) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: isDark ? '#0F172A' : '#F5F6F8' },
        ]}
      >
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View
          style={[
            styles.logoBadge,
            {
              backgroundColor: isDark ? '#1E293B' : '#0F172A',
              borderColor: isDark ? '#334155' : 'transparent',
              borderWidth: isDark ? 1 : 0,
            },
          ]}
        >
          <Text style={styles.logoBadgeText}>V</Text>
        </View>
        <Text style={[styles.brandTitle, { color: theme.textPrimary }]}>
          VAULT
        </Text>
        <Text style={[styles.brandTagline, { color: theme.textSecondary }]}>
          Your life. Your records. Your control.
        </Text>
        <ActivityIndicator
          size="large"
          color={isDark ? '#60A5FA' : '#0F172A'}
          style={{ marginTop: 24 }}
        />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: {
            backgroundColor: isDark ? '#0F172A' : '#F5F6F8',
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: false,
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    elevation: 6,
  },
  logoBadgeText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 3,
  },
  brandTagline: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
});
