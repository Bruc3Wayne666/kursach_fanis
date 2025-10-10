// src/screens/ProfileScreen.tsx - ИСПРАВЛЯЕМ ОТОБРАЖЕНИЕ АВАТАРА
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { darkTheme } from '../themes/dark';
import { api } from '../services/api';
import { logout } from '../store/slices/authSlice';

export default function ProfileScreen({ navigation }: any) {
    const user = useSelector((state: any) => state.auth.user);
    const dispatch = useDispatch();
    const [stats, setStats] = useState({
        followers: 0,
        following: 0,
        posts: 0
    });
    const [loading, setLoading] = useState(true);
    const [refreshCount, setRefreshCount] = useState(0);

    useEffect(() => {
        if (user) {
            loadStats();
        }
    }, [user, refreshCount]);

    const loadStats = async () => {
        if (!user) return;

        try {
            const [followersResponse, followingResponse, postsResponse] = await Promise.all([
                api.get(`/users/${user.id}/followers`).catch(() => ({ data: { followers: [] } })),
                api.get(`/users/${user.id}/following`).catch(() => ({ data: { following: [] } })),
                api.get(`/posts/user/${user.id}?limit=100`).catch(() => ({ data: { posts: [] } }))
            ]);

            setStats({
                followers: followersResponse.data.followers?.length || 0,
                following: followingResponse.data.following?.length || 0,
                posts: postsResponse.data.posts?.length || 0
            });
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    };

    // 🔥 ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ URL АВАТАРА
    const getAvatarUrl = (avatarPath: string | null) => {
        if (!avatarPath) return 'https://via.placeholder.com/100';

        if (avatarPath.startsWith('http')) {
            return avatarPath;
        }

        return `http://192.168.0.116:5000${avatarPath}`;
    };

    const navigateToFollowList = (type: 'followers' | 'following') => {
        navigation.navigate('FollowList', {
            userId: user.id,
            type
        });
    };

    const handleLogout = () => {
        dispatch(logout());
    };

    const refreshStats = () => {
        setRefreshCount(prev => prev + 1);
    };

    React.useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            refreshStats();
        });

        return unsubscribe;
    }, [navigation]);

    if (loading) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color={darkTheme.colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Профиль</Text>
                <TouchableOpacity onPress={handleLogout}>
                    <Text style={styles.logoutButton}>Выйти</Text>
                </TouchableOpacity>
            </View>

            {user && (
                <View style={styles.content}>
                    {/* Информация о пользователе */}
                    <View style={styles.userCard}>
                        {/* 🔥 ИСПРАВЛЯЕМ ОТОБРАЖЕНИЕ АВАТАРА */}
                        <Image
                            source={{ uri: getAvatarUrl(user.avatar) }}
                            style={styles.avatar}
                            defaultSource={{ uri: 'https://via.placeholder.com/100' }}
                            onError={(e) => console.log('❌ Avatar load error:', e.nativeEvent.error)}
                        />
                        <Text style={styles.userName}>{user.name}</Text>
                        <Text style={styles.userUsername}>@{user.username}</Text>
                        <Text style={styles.userEmail}>{user.email}</Text>

                        {user.bio ? (
                            <Text style={styles.userBio}>{user.bio}</Text>
                        ) : (
                            <Text style={styles.noBio}>Добавьте информацию о себе</Text>
                        )}
                    </View>

                    {/* Статистика */}
                    <View style={styles.stats}>
                        <TouchableOpacity
                            style={styles.statItem}
                            onPress={() => navigateToFollowList('followers')}
                        >
                            <Text style={styles.statNumber}>{stats.followers}</Text>
                            <Text style={styles.statLabel}>Подписчики</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.statItem}
                            onPress={() => navigateToFollowList('following')}
                        >
                            <Text style={styles.statNumber}>{stats.following}</Text>
                            <Text style={styles.statLabel}>Подписки</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.friendsButton}
                            onPress={() => navigation.navigate('Friends')}
                        >
                            <Text style={styles.friendsButtonText}>👥 Мои друзья</Text>
                        </TouchableOpacity>

                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{stats.posts}</Text>
                            <Text style={styles.statLabel}>Посты</Text>
                        </View>
                    </View>

                    {/* Действия */}
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => navigation.navigate('EditProfile')}
                    >
                        <Text style={styles.editButtonText}>Редактировать профиль</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: darkTheme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: darkTheme.colors.border,
    },
    title: {
        color: darkTheme.colors.text,
        fontSize: 24,
        fontWeight: 'bold',
    },
    logoutButton: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 15,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: darkTheme.colors.background,
    },
    userCard: {
        backgroundColor: darkTheme.colors.card,
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        alignItems: 'center',
    },
    // 🔥 ОБНОВЛЯЕМ СТИЛЬ АВАТАРА
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 15,
        backgroundColor: darkTheme.colors.border,
    },
    userName: {
        color: darkTheme.colors.text,
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    userUsername: {
        color: darkTheme.colors.primary,
        fontSize: 16,
        marginBottom: 8,
    },
    userEmail: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        marginBottom: 12,
    },
    userBio: {
        color: darkTheme.colors.text,
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
    noBio: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        fontStyle: 'italic',
    },
    stats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: darkTheme.colors.card,
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        flexWrap: 'wrap',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
        minWidth: 80,
        marginBottom: 10,
    },
    statNumber: {
        color: darkTheme.colors.text,
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statLabel: {
        color: darkTheme.colors.textSecondary,
        fontSize: 12,
    },
    editButton: {
        backgroundColor: darkTheme.colors.primary,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    editButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    friendsButton: {
        backgroundColor: darkTheme.colors.card,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
        minWidth: 120,
    },
    friendsButtonText: {
        color: darkTheme.colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
});
