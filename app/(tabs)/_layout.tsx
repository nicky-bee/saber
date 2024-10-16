import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#ffd33d',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home-sharp' : 'home-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="receipts"
        options={{
          title: 'Receipts',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'document-text' : 'document-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: 'Camera',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'camera' : 'camera-outline'} color={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}