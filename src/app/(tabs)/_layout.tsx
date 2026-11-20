import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import {
  Activity,
  Bell,
  Home,
  Package,
  Wallet,
} from 'lucide-react-native';
import { useVaultStore } from '../../store/useVaultStore';
import { getSectionPalette, getThemeColors } from '../../theme/colors';

/**
 * Monekin `AppBottomBar` (from `lib/app/layout/widgets/app_bottom_bar.dart`)
 * NavigationBar with `surfaceContainerHigh` background and 20% opacity pill indicator.
 * Strictly English labels (`Home`, `Money`, `Items`, `Tracker`, `Reminders`).
 */
export default function TabsLayout() {
  const { settings } = useVaultStore();
  const isDark = settings.theme === 'dark';
  const theme = getThemeColors(isDark);

  const dashboardPalette = getSectionPalette('dashboard', isDark);
  const moneyPalette = getSectionPalette('money', isDark);
  const itemsPalette = getSectionPalette('items', isDark);
  const trackerPalette = getSectionPalette('tracker', isDark);
  const remindersPalette = getSectionPalette('reminders', isDark);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'android' ? 70 : 84,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'android' ? 10 : 22,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 3,
        },
        tabBarInactiveTintColor: theme.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarActiveTintColor: dashboardPalette.accent,
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconPill,
                focused && { backgroundColor: `${dashboardPalette.accent}24` },
              ]}
            >
              <Home size={20} color={color} strokeWidth={focused ? 2.5 : 1.9} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="money"
        options={{
          title: 'Money',
          tabBarActiveTintColor: moneyPalette.accent,
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconPill,
                focused && { backgroundColor: `${moneyPalette.accent}24` },
              ]}
            >
              <Wallet
                size={20}
                color={color}
                strokeWidth={focused ? 2.5 : 1.9}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="items"
        options={{
          title: 'Items',
          tabBarActiveTintColor: itemsPalette.accent,
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconPill,
                focused && { backgroundColor: `${itemsPalette.accent}24` },
              ]}
            >
              <Package
                size={20}
                color={color}
                strokeWidth={focused ? 2.5 : 1.9}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="tracker"
        options={{
          title: 'Tracker',
          tabBarActiveTintColor: trackerPalette.accent,
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconPill,
                focused && { backgroundColor: `${trackerPalette.accent}24` },
              ]}
            >
              <Activity
                size={20}
                color={color}
                strokeWidth={focused ? 2.5 : 1.9}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="reminders"
        options={{
          title: 'Reminders',
          tabBarActiveTintColor: remindersPalette.accent,
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconPill,
                focused && { backgroundColor: `${remindersPalette.accent}24` },
              ]}
            >
              <Bell size={20} color={color} strokeWidth={focused ? 2.5 : 1.9} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconPill: {
    width: 56,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
