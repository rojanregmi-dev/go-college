import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { getSessionToken, subscribeSession } from '../../services/api';

export default function TabLayout() {
  const token = useSyncExternalStore(subscribeSession, getSessionToken, () => null);
  if (!token) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: '#16A34A',
        tabBarInactiveTintColor: '#94A3B8',

        tabBarStyle: {
          height: 88,
          paddingTop: 8,
          paddingBottom: 24,
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          title: 'Post',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
