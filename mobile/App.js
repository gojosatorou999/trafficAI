import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ShieldAlert, Map, Activity } from 'lucide-react-native';

import SOSScreen from './screens/SOSScreen';
import MapScreen from './screens/MapScreen';
import StatusScreen from './screens/StatusScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#ef4444',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#f1f5f9',
            paddingBottom: 5,
            paddingTop: 5,
          },
          headerStyle: {
            backgroundColor: '#ef4444',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Tab.Screen 
          name="SOS" 
          component={SOSScreen} 
          options={{
            tabBarIcon: ({ color, size }) => <ShieldAlert color={color} size={size} />,
            headerTitle: 'Emergency SOS'
          }}
        />
        <Tab.Screen 
          name="Map" 
          component={MapScreen} 
          options={{
            tabBarIcon: ({ color, size }) => <Map color={color} size={size} />,
            headerTitle: 'Nearby Hazards'
          }}
        />
        <Tab.Screen 
          name="Status" 
          component={StatusScreen} 
          options={{
            tabBarIcon: ({ color, size }) => <Activity color={color} size={size} />,
            headerTitle: 'Dispatch Status'
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
