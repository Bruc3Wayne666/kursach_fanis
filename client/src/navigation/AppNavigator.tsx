// src/navigation/AppNavigator.tsx - ДОБАВЛЯЕМ ConversationInfo
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { View, Text } from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import FeedScreen from '../screens/FeedScreen';
import SearchScreen from '../screens/SearchScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FollowListScreen from '../screens/FollowListScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import CommentsScreen from '../screens/CommentsScreen';
import ChatScreen from '../screens/ChatScreen';
import FriendsScreen from '../screens/FriendsScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import FriendRequestsScreen from '../screens/FriendRequestScreen';
import CreateConversationScreen from '../screens/CreateConversationScreen';
import ConversationInfoScreen from '../screens/ConversationInfoScreen';
import {darkTheme} from "../themes/dark.ts"; // 🔥 ДОБАВЛЯЕМ

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const getTabIconName = (routeName: string, focused: boolean) => {
    if (routeName === 'Feed') {
        return focused ? 'newspaper' : 'newspaper-outline';
    }

    if (routeName === 'Search') {
        return focused ? 'search' : 'search-outline';
    }

    if (routeName === 'Messages') {
        return focused ? 'chatbubbles' : 'chatbubbles-outline';
    }

    if (routeName === 'Profile') {
        return focused ? 'person' : 'person-outline';
    }

    return 'ellipse-outline';
};

const getMainTabScreenOptions = ({ route }: any) => ({
    tabBarActiveTintColor: darkTheme.colors.primary,
    tabBarInactiveTintColor: darkTheme.colors.textSecondary,
    tabBarStyle: {
        backgroundColor: darkTheme.colors.card,
        borderTopColor: darkTheme.colors.border,
        height: 58,
        paddingTop: 4,
    },
    tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 4,
    },
    tabBarIcon: ({ color, size, focused }: any) => {
        const iconName = getTabIconName(route.name, focused);
        return <Ionicons name={iconName} size={size} color={color} />;
    },
    headerShown: false,
});

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={getMainTabScreenOptions}
        >
            <Tab.Screen name="Feed" component={FeedScreen} options={{ tabBarLabel: 'Лента' }} />
            <Tab.Screen name="Search" component={SearchScreen} options={{ tabBarLabel: 'Поиск' }} />
            <Tab.Screen name="Messages" component={MessagesScreen} options={{ tabBarLabel: 'Чаты' }} />
            <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Профиль' }} />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    const isAuthenticated = useSelector((state: any) => state.auth.token);
    const isLoading = useSelector((state: any) => state.auth.isLoading);

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Загрузка...</Text>
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
                <>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                </>
            ) : (
                <>
                    <Stack.Screen name="Main" component={MainTabs} />
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
                    <Stack.Screen
                        name="Chat"
                        component={ChatScreen}
                        options={{
                            presentation: 'card',
                            headerShown: false
                        }}
                    />
                    <Stack.Screen
                        name="Friends"
                        component={FriendsScreen}
                        options={{
                            presentation: 'card',
                            headerShown: false
                        }}
                    />
                    <Stack.Screen
                        name="UserProfile"
                        component={UserProfileScreen}
                        options={{
                            presentation: 'card',
                            headerShown: false
                        }}
                    />
                    <Stack.Screen
                        name="FriendRequests"
                        component={FriendRequestsScreen}
                        options={{
                            presentation: 'card',
                            headerShown: false
                        }}
                    />
                    <Stack.Screen
                        name="CreateConversation"
                        component={CreateConversationScreen}
                        options={{
                            presentation: 'card',
                            headerShown: false
                        }}
                    />
                    {/* 🔥 ДОБАВЛЯЕМ ЭКРАН ИНФОРМАЦИИ О БЕСЕДЕ */}
                    <Stack.Screen
                        name="ConversationInfo"
                        component={ConversationInfoScreen}
                        options={{
                            presentation: 'card',
                            headerShown: false
                        }}
                    />
                </>
            )}
        </Stack.Navigator>
    );
}

const styles = {
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0f0f0f',
        justifyContent: 'center',
        alignItems: 'center',
    } as const,
    loadingText: {
        color: '#fff',
    } as const,
};
