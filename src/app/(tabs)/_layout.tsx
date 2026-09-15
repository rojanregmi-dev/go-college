import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { getSessionToken, subscribeSession } from '../../services/api';

export default function TabLayout() {
  const token = useSyncExternalStore(subscribeSession, getSessionToken, () => null);
  if (!token) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: '#16A34A',
        tabBarInactiveTintColor: '#6E88A3',
        tabBarHideOnKeyboard: true,
        tabBarLabelPosition: 'below-icon',

        tabBarStyle: {
          height: 86,
          paddingTop: 7,
          paddingBottom: 20,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#C9E9ED',
          shadowColor: '#071C4D',
          shadowOffset: { width: 0, height: -5 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 12,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          title: 'Post',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.postIcon, focused && styles.postIconFocused]}>
              <Ionicons name="add" size={25} color={focused ? '#FFFFFF' : '#049B43'} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  postIcon: {
    width: 38,
    height: 38,
    marginTop: -4,
    borderRadius: 19,
    backgroundColor: '#E4FDEB',
    borderWidth: 1,
    borderColor: '#64F58C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postIconFocused: {
    backgroundColor: '#049B43',
    borderColor: '#049B43',
    shadowColor: '#03606E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
});
