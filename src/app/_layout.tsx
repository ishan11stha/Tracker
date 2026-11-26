import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useVaultStore } from '../store/useVaultStore';
import { getThemeColors } from '../theme/colors';
import { AppErrorBoundary } from '../components/AppErrorBoundary';

export default function RootLayout() {
  const { isHydrated, hydrateFromDB, settings, error, clearError } =
    useVaultStore();
  const isDark = settings.theme === 'dark';
  const theme = getThemeColors(isDark);

  useEffect(() => {
    hydrateFromDB();
  }, [hydrateFromDB]);

  useEffect(() => {
    if (!error) return;
    Alert.alert('VAULT could not complete that action', error, [
      { text: 'Dismiss', onPress: clearError },
    ]);
  }, [error, clearError]);

  const statusBarBackground = isDark ? '#0F172A' : '#F5F6F8';

  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <StatusBar
          style={isDark ? 'light' : 'dark'}
        />
        {!isHydrated ? (
          <View
            style={[
              styles.loadingContainer,
              { backgroundColor: statusBarBackground },
            ]}
          >
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
            <Text
              style={[styles.brandTagline, { color: theme.textSecondary }]}
            >
              Your life. Your records. Your control.
            </Text>
            <ActivityIndicator
              size="large"
              color={isDark ? '#60A5FA' : '#0F172A'}
              style={{ marginTop: 24 }}
            />
          </View>
        ) : (
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: statusBarBackground },
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
            <Stack.Screen
              name="goals"
              options={{
                headerShown: false,
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
          </Stack>
        )}
      </AppErrorBoundary>
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
