import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { Text, View } from "react-native";

// Import screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import FeedScreen from '../screens/FeedScreen';
import SearchScreen from '../screens/SearchScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FollowListScreen from '../screens/FollowListScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import CommentsScreen from '../screens/CommentsScreen';
import { darkTheme } from '../themes/dark';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarLabel: ({ focused, color }) => (
                    <Text style={{
                        color,
                        fontSize: 12,
                        fontWeight: focused ? '600' : '400'
                    }}>
                        {route.name}
                    </Text>
                ),
                tabBarActiveTintColor: darkTheme.colors.primary,
                tabBarInactiveTintColor: darkTheme.colors.textSecondary,
                tabBarStyle: {
                    backgroundColor: darkTheme.colors.card,
                    borderTopColor: darkTheme.colors.border,
                },
                headerShown: false,
            })}
        >
            <Tab.Screen name="Feed" component={FeedScreen} />
            <Tab.Screen name="Search" component={SearchScreen} />
            <Tab.Screen name="Messages" component={MessagesScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    const isAuthenticated = useSelector((state: any) => state.auth.token);
    const isLoading = useSelector((state: any) => state.auth.isLoading);

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#fff' }}>Загрузка...</Text>
            </View>
        );
    }

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: {
                    backgroundColor: darkTheme.colors.background,
                },
            }}
        >
            {!isAuthenticated ? (
                // Auth screens
                <>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                </>
            ) : (
                // Main app screens
                <>
                    {/* Main tabs */}
                    <Stack.Screen name="Main" component={MainTabs} />

                    {/* Modal screens */}
                    <Stack.Screen
                        name="FollowList"
                        component={FollowListScreen}
                        options={{
                            presentation: 'modal',
                            headerShown: false
                        }}
                    />
                    <Stack.Screen
                        name="EditProfile"
                        component={EditProfileScreen}
                        options={{
                            presentation: 'modal',
                            headerShown: false
                        }}
                    />
                    <Stack.Screen
                        name="Comments"
                        component={CommentsScreen}
                        options={{
                            presentation: 'modal',
                            headerShown: false
                        }}
                    />
                </>
            )}
        </Stack.Navigator>
    );
}
