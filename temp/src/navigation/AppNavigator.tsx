import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import Ionicons from 'react-native-vector-icons/Ionicons';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import FeedScreen from '../screens/FeedScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { darkTheme } from '../themes/dark';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: string = '';

                    if (route.name === 'Feed') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Messages') {
                        iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: darkTheme.colors.primary,
                tabBarInactiveTintColor: darkTheme.colors.textSecondary,
                tabBarStyle: {
                    backgroundColor: darkTheme.colors.card,
                    borderTopColor: darkTheme.colors.border,
                },
                headerStyle: {
                    backgroundColor: darkTheme.colors.card,
                },
                headerTintColor: darkTheme.colors.text,
            })}
        >
            <Tab.Screen name="Feed" component={FeedScreen} />
            <Tab.Screen name="Messages" component={MessagesScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    const isAuthenticated = useSelector((state: any) => state.auth.token);

    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: {
                    backgroundColor: darkTheme.colors.card,
                },
                headerTintColor: darkTheme.colors.text,
                contentStyle: {
                    backgroundColor: darkTheme.colors.background,
                },
            }}
        >
            {!isAuthenticated ? (
                <>
                    <Stack.Screen
                        name="Login"
                        component={LoginScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="Register"
                        component={RegisterScreen}
                        options={{ headerShown: false }}
                    />
                </>
            ) : (
                <Stack.Screen
                    name="Main"
                    component={MainTabs}
                    options={{ headerShown: false }}
                />
            )}
        </Stack.Navigator>
    );
}
