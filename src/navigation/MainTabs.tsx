import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EarnScreen from '../screens/Earn/EarnScreen';
import HomeScreen from '../screens/Home/HomeScreen';
import MyAdsScreen from '../screens/MyAds/MyAdsScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import { colors } from '../theme/colors';
import { RootStackParamList } from './RootNavigator';

export type MainTabParamList = {
  Home: undefined;
  Ads: undefined;
  CreateAdTab: undefined;
  Earn: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

// Placeholder — the center tab intercepts press and never actually renders.
function CreateAdPlaceholder() {
  return <View />;
}

function CenterTabButton({ onPress }: { onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.centerBtnWrap} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.centerBtn}>
        <Ionicons name="add" size={28} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

export default function MainTabs({ navigation }: NativeStackScreenProps<RootStackParamList, 'MainTabs'>) {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: [styles.tabBar, { paddingBottom: Math.max(10, insets.bottom) }],
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Ads"
        component={MyAdsScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="megaphone-outline" color={color} size={size} /> }}
      />
      <Tab.Screen
        name="CreateAdTab"
        component={CreateAdPlaceholder}
        options={{
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: () => <CenterTabButton onPress={() => navigation.navigate('CreateAd')} />,
        }}
      />
      <Tab.Screen
        name="Earn"
        component={EarnScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="gift-outline" color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 100,
    paddingTop: 8,
    backgroundColor: colors.card,
    borderTopColor: colors.border,
  },
  tabBarLabel: { fontSize: 10, fontWeight: '600' },
  centerBtnWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
