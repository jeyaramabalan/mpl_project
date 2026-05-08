import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import StandingsScreen from '../screens/StandingsScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import PlayersScreen from '../screens/PlayersScreen';
import MoreScreen from '../screens/MoreScreen';
import MatchDetailScreen from '../screens/MatchDetailScreen';
import PlayerDetailScreen from '../screens/PlayerDetailScreen';
import RecordsScreen from '../screens/RecordsScreen';
import ChampionsScreen from '../screens/ChampionsScreen';
import AuctionScreen from '../screens/AuctionScreen';
import ContactScreen from '../screens/ContactScreen';
import RulesScreen from '../screens/RulesScreen';
import { colors } from '../theme';
import type { RootStackParamList, MainTabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color, size }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: 'home',
            Schedule: 'calendar',
            Standings: 'stats-chart',
            Leaderboard: 'trophy',
            Players: 'people',
            More: 'menu',
          };
          const name = map[route.name] ?? 'ellipse';
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'MPL' }} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} options={{ title: 'Schedule' }} />
      <Tab.Screen name="Standings" component={StandingsScreen} options={{ title: 'Standings' }} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: 'Leaderboard' }} />
      <Tab.Screen name="Players" component={PlayersScreen} options={{ title: 'Players' }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ title: 'More' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="MatchDetail" component={MatchDetailScreen} options={{ title: 'Match' }} />
        <Stack.Screen name="PlayerDetail" component={PlayerDetailScreen} options={{ title: 'Player' }} />
        <Stack.Screen name="Records" component={RecordsScreen} options={{ title: 'Records' }} />
        <Stack.Screen name="Champions" component={ChampionsScreen} options={{ title: 'Champions' }} />
        <Stack.Screen name="Auction" component={AuctionScreen} options={{ title: 'Auction' }} />
        <Stack.Screen name="Contact" component={ContactScreen} options={{ title: 'Contact' }} />
        <Stack.Screen name="Rules" component={RulesScreen} options={{ title: 'Rules' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
