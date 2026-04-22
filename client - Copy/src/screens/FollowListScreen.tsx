import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { darkTheme } from '../themes/dark';
import { api } from '../services/api';
import { followUser, unfollowUser } from '../store/slices/usersSlice';

export default function FollowListScreen({ route, navigation }: any) {
    const { type, userId } = route.params; // 'followers' или 'following'
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [followLoading, setFollowLoading] = useState<string | null>(null);
    const currentUser = useSelector((state: any) => state.auth.user);
    const dispatch = useDispatch();

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const endpoint = type === 'followers' ? 'followers' : 'following';
            const response = await api.get(`/users/${userId}/${endpoint}`);

            // 🔥 ДОБАВЛЯЕМ isFollowing ДЛЯ КАЖДОГО ПОЛЬЗОВАТЕЛЯ
            const usersWithFollowStatus = (response.data[type] || []).map((user: any) => ({
                ...user,
                isFollowing: type === 'following' ? true : user.isFollowing || false
            }));

            setUsers(usersWithFollowStatus);
        } catch (error) {
            console.error('Error loading users:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить список');
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async (targetUserId: string, isCurrentlyFollowing: boolean) => {
        if (targetUserId === currentUser?.id) return;

        setFollowLoading(targetUserId);

        try {
            // Мгновенно обновляем UI
            const updatedUsers = users.map(user =>
                user.id === targetUserId
                    ? { ...user, isFollowing: !isCurrentlyFollowing }
                    : user
            );
            setUsers(updatedUsers);

            // Отправляем запрос на сервер
            if (isCurrentlyFollowing) {
                await dispatch(unfollowUser(targetUserId) as any);
            } else {
                await dispatch(followUser(targetUserId) as any);
            }

        } catch (error) {
            console.error('Follow error:', error);
            // Возвращаем прежнее состояние при ошибке
            const revertedUsers = users.map(user =>
                user.id === targetUserId
                    ? { ...user, isFollowing: isCurrentlyFollowing }
                    : user
            );
            setUsers(revertedUsers);
            Alert.alert('Ошибка', 'Не удалось выполнить действие');
        } finally {
            setFollowLoading(null);
        }
    };

    const getFollowButtonText = (user: any) => {
        if (user.id === currentUser?.id) return null;

        if (type === 'followers') {
            return user.isFollowing ? 'Отписаться' : 'Подписаться';
        } else {
            // В подписках всегда показываем "Отписаться"
            return 'Отписаться';
        }
    };

    const shouldShowFollowButton = (user: any) => {
        if (user.id === currentUser?.id) return false;

        if (type === 'followers') {
            return true; // В подписчиках всегда показываем кнопку
        } else {
            return true; // В подписках всегда показываем "Отписаться"
        }
    };

    const renderUserItem = ({ item }: { item: any }) => {
        const isLoading = followLoading === item.id;
        const showButton = shouldShowFollowButton(item);
        const buttonText = getFollowButtonText(item);

        return (
            <View style={styles.userCard}>
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userUsername}>@{item.username}</Text>
                    <View style={styles.status}>
                        <View style={[styles.statusDot, item.isOnline && styles.statusOnline]} />
                        <Text style={styles.statusText}>
                            {item.isOnline ? 'Online' : 'Offline'}
                        </Text>
                    </View>
                </View>

                {showButton && buttonText && (
                    <TouchableOpacity
                        style={[
                            styles.followButton,
                            (item.isFollowing || type === 'following') ? styles.unfollowButton : styles.followButtonActive,
                            isLoading && styles.loadingButton
                        ]}
                        onPress={() => handleFollow(item.id, item.isFollowing)}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color={darkTheme.colors.text} />
                        ) : (
                            <Text style={[
                                styles.followButtonText,
                                (item.isFollowing || type === 'following') && styles.unfollowButtonText
                            ]}>
                                {buttonText}
                            </Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color={darkTheme.colors.primary} />
                <Text style={styles.loadingText}>Загрузка...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>← Назад</Text>
                </TouchableOpacity>
                <Text style={styles.title}>
                    {type === 'followers' ? 'Подписчики' : 'Подписки'}
                </Text>
                <View style={styles.placeholder} />
            </View>

            <FlatList
                data={users}
                renderItem={renderUserItem}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            {type === 'followers'
                                ? 'У вас пока нет подписчиков'
                                : 'Вы пока ни на кого не подписаны'
                            }
                        </Text>
                    </View>
                }
            />
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
    backButton: {
        color: darkTheme.colors.primary,
        fontSize: 16,
    },
    title: {
        color: darkTheme.colors.text,
        fontSize: 18,
        fontWeight: '600',
    },
    placeholder: {
        width: 60,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: darkTheme.colors.background,
    },
    loadingText: {
        color: darkTheme.colors.textSecondary,
        marginTop: 10,
        fontSize: 16,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: darkTheme.colors.border,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        color: darkTheme.colors.text,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    userUsername: {
        color: darkTheme.colors.primary,
        fontSize: 14,
        marginBottom: 4,
    },
    status: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#6b7280',
        marginRight: 6,
    },
    statusOnline: {
        backgroundColor: '#10b981',
    },
    statusText: {
        color: darkTheme.colors.textSecondary,
        fontSize: 12,
    },
    followButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 100,
        alignItems: 'center',
        justifyContent: 'center',
        height: 36,
    },
    followButtonActive: {
        backgroundColor: darkTheme.colors.primary,
    },
    unfollowButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: darkTheme.colors.border,
    },
    followButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    unfollowButtonText: {
        color: darkTheme.colors.text,
    },
    loadingButton: {
        opacity: 0.7,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        color: darkTheme.colors.textSecondary,
        fontSize: 16,
        textAlign: 'center',
    },
});
