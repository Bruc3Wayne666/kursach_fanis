import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { darkTheme } from '../themes/dark';
import { api } from '../services/api';
import { followUser, unfollowUser } from '../store/slices/usersSlice';
import Avatar from '../components/Avatar';

export default function FollowListScreen({ route, navigation }: any) {
    const { type, userId } = route.params; // 'followers' или 'following'
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [followLoading, setFollowLoading] = useState<string | null>(null);
    const currentUser = useSelector((state: any) => state.auth.user);
    const dispatch = useDispatch();
    const isFocused = useIsFocused();
    const onRelationChanged = route.params?.onRelationChanged;

    const emptyContentStyle = styles.emptyListContent;

    const loadUsers = useCallback(async () => {
        try {
            setLoading(true);
            const endpoint = type === 'followers' ? 'followers' : 'following';
            const response = await api.get(`/users/${userId}/${endpoint}`);

            // 🔥 ЗАЩИТА ОТ НЕКОРРЕКТНЫХ ДАННЫХ
            const usersData = response.data?.[type] || response.data || [];

            if (!Array.isArray(usersData)) {
                console.error('Invalid users data format:', usersData);
                setUsers([]);
                return;
            }

            // Безопасное преобразование данных
            const usersWithFollowStatus = usersData.map((user: any) => {
                // Проверяем, что user существует и имеет необходимые поля
                if (!user || typeof user !== 'object') {
                    console.warn('Invalid user data:', user);
                    return null;
                }

                return {
                    id: user.id?.toString() || Math.random().toString(),
                    name: user.name || 'Пользователь',
                    username: user.username || 'user',
                    avatar: user.avatar || null,
                    isOnline: Boolean(user.isOnline),
                    isFollowing: type === 'following' ? true : Boolean(user.isFollowing)
                };
            }).filter(Boolean); // Убираем null значения

            setUsers(usersWithFollowStatus);
        } catch (error) {
            console.error('Error loading users:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить список');
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, [type, userId]);

    useEffect(() => {
        if (!isFocused) {
            return;
        }

        loadUsers();
    }, [isFocused, loadUsers]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadUsers();
        setRefreshing(false);
    }, [loadUsers]);

    const handleFollow = async (targetUserId: string, isCurrentlyFollowing: boolean) => {
        if (!targetUserId || targetUserId === currentUser?.id) return;

        setFollowLoading(targetUserId);
        const previousUsers = users;

        try {
            const updatedUsers = type === 'following'
                ? users.filter(user => user && user.id !== targetUserId)
                : users.map(user =>
                    user && user.id === targetUserId
                        ? { ...user, isFollowing: !isCurrentlyFollowing }
                        : user
                );
            setUsers(updatedUsers);

            if (isCurrentlyFollowing) {
                await dispatch(unfollowUser(targetUserId) as any);
            } else {
                await dispatch(followUser(targetUserId) as any);
            }

            onRelationChanged?.();

        } catch (error: any) {
            console.error('Follow error:', error);

            const errorMessage = error?.response?.data?.message || error?.message || 'Не удалось выполнить действие';
            setUsers(previousUsers);
            Alert.alert('Ошибка', errorMessage);
        } finally {
            setFollowLoading(null);
        }
    };

    const getFollowButtonText = (user: any) => {
        if (!user || user.id === currentUser?.id) return null;

        if (type === 'followers') {
            return user.isFollowing ? 'Отписаться' : 'Подписаться';
        } else {
            return 'Отписаться';
        }
    };

    const shouldShowFollowButton = (user: any) => {
        if (!user || user.id === currentUser?.id) return false;
        return true;
    };

    const renderUserItem = ({ item }: { item: any }) => {
        // Защита от некорректных данных
        if (!item || !item.id) {
            return null;
        }

        const isLoading = followLoading === item.id;
        const showButton = shouldShowFollowButton(item);
        const buttonText = getFollowButtonText(item);

        return (
            <View style={styles.userCard}>
                <TouchableOpacity
                    style={styles.userInfo}
                    onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
                >
                    <Avatar
                        avatar={item.avatar}
                        name={item.name}
                        username={item.username}
                        size={50}
                        style={styles.avatar}
                    />
                    <View style={styles.userMeta}>
                        <Text style={styles.userName}>
                            {item.name || 'Пользователь'}
                        </Text>
                        <Text style={styles.userUsername}>
                            @{item.username || 'user'}
                        </Text>
                        <View style={styles.status}>
                            <View style={[
                                styles.statusDot,
                                item.isOnline && styles.statusOnline
                            ]} />
                            <Text style={styles.statusText}>
                                {item.isOnline ? 'Online' : 'Offline'}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {showButton && buttonText && (
                    <TouchableOpacity
                        style={[
                            styles.followButton,
                            (item.isFollowing || type === 'following')
                                ? styles.unfollowButton
                                : styles.followButtonActive,
                            isLoading && styles.loadingButton
                        ]}
                        onPress={() => handleFollow(item.id, item.isFollowing)}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color={
                                (item.isFollowing || type === 'following')
                                    ? darkTheme.colors.text
                                    : '#fff'
                            } />
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
                keyExtractor={(item) => item?.id?.toString() || Math.random().toString()}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={darkTheme.colors.primary}
                        colors={[darkTheme.colors.primary]}
                    />
                }
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
                contentContainerStyle={users.length === 0 ? emptyContentStyle : undefined}
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
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        marginRight: 12,
    },
    userMeta: {
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
    emptyListContent: {
        flex: 1,
    },
    emptyText: {
        color: darkTheme.colors.textSecondary,
        fontSize: 16,
        textAlign: 'center',
    },
});
