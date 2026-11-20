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
import { useVaultStore } from '../../src/store/useVaultStore';
import { getSectionPalette, getThemeColors } from '../../src/theme/colors';

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
          height: Platform.OS === 'android' ? 68 : 82,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'android' ? 10 : 22,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarInactiveTintColor: theme.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: settings.language === 'ne' ? 'गृह (Home)' : 'Home',
          tabBarActiveTintColor: dashboardPalette.accent,
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconPill,
                focused && { backgroundColor: dashboardPalette.accentSoft },
              ]}
            >
              <Home size={20} color={color} strokeWidth={focused ? 2.4 : 1.9} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="money"
        options={{
          title: settings.language === 'ne' ? 'रकम (Money)' : 'Money',
          tabBarActiveTintColor: moneyPalette.accent,
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconPill,
                focused && { backgroundColor: moneyPalette.accentSoft },
              ]}
            >
              <Wallet
                size={20}
                color={color}
                strokeWidth={focused ? 2.4 : 1.9}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="items"
        options={{
          title: settings.language === 'ne' ? 'सामान (Items)' : 'Items',
          tabBarActiveTintColor: itemsPalette.accent,
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconPill,
                focused && { backgroundColor: itemsPalette.accentSoft },
              ]}
            >
              <Package
                size={20}
                color={color}
                strokeWidth={focused ? 2.4 : 1.9}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="tracker"
        options={{
          title: settings.language === 'ne' ? 'दैनिकी (Tracker)' : 'Tracker',
          tabBarActiveTintColor: trackerPalette.accent,
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconPill,
                focused && { backgroundColor: trackerPalette.accentSoft },
              ]}
            >
              <Activity
                size={20}
                color={color}
                strokeWidth={focused ? 2.4 : 1.9}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="reminders"
        options={{
          title:
            settings.language === 'ne' ? 'रिमाइन्डर' : 'Reminders',
          tabBarActiveTintColor: remindersPalette.accent,
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconPill,
                focused && { backgroundColor: remindersPalette.accentSoft },
              ]}
            >
              <Bell size={20} color={color} strokeWidth={focused ? 2.4 : 1.9} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconPill: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
