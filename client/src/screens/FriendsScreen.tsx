// src/screens/FriendsScreen.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { darkTheme } from '../themes/dark';
import { api } from '../services/api';
import Avatar from '../components/Avatar';

export default function FriendsScreen() {
    const [friends, setFriends] = useState<any[]>([]);
    const [requestsCount, setRequestsCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);

    const loadFriends = useCallback(async (showLoader = true) => {
        try {
            if (showLoader) {
                setLoading(true);
            }
            console.log('🔄 Loading friends...');
            const [friendsResponse, requestsResponse] = await Promise.all([
                api.get('/friends'),
                api.get('/friends/requests').catch(() => ({ data: { requests: [] } })),
            ]);
            console.log('✅ Friends loaded:', friendsResponse.data.friends.length);
            setFriends(friendsResponse.data.friends || []);
            setRequestsCount(requestsResponse.data.requests?.length || 0);
        } catch (error: any) {
            console.error('❌ Error loading friends:', error);

            let errorMessage = 'Не удалось загрузить список друзей';
            if (error.response?.status === 500) {
                errorMessage = 'Ошибка сервера. Попробуйте позже';
            }

            Alert.alert('Ошибка', errorMessage);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }, []);

    const startPolling = useCallback(() => {
        if (pollingRef.current || !isFocused) {
            return;
        }

        loadFriends(false);
        pollingRef.current = setInterval(() => {
            if (isMountedRef.current && isFocused) {
                loadFriends(false);
            }
        }, 5000);
    }, [isFocused, loadFriends]);

    useEffect(() => {
        isMountedRef.current = true;

        if (isFocused) {
            loadFriends();
            startPolling();
        } else {
            stopPolling();
        }

        return () => {
            isMountedRef.current = false;
            stopPolling();
        };
    }, [isFocused, loadFriends, startPolling, stopPolling]);

    const onRefresh = () => {
        setRefreshing(true);
        loadFriends(false);
    };

    const startChat = (friend: any) => {
        navigation.navigate('Chat', {
            chatId: friend.id,
            partner: friend,
            chatType: 'personal'
        });
    };

    const viewProfile = (friend: any) => {
        navigation.navigate('UserProfile', { userId: friend.id });
    };

    // 🔥 ИСПРАВЛЕННАЯ НАВИГАЦИЯ К ПОИСКУ
    const navigateToSearch = () => {
        // Переходим на Main табы и активируем вкладку Search
        navigation.navigate('Main', {
            screen: 'Search'
        });
    };

    const removeFriend = async (friendshipId: string, friendName: string) => {
        Alert.alert(
            'Удалить из друзей',
            `Вы уверены что хотите удалить ${friendName} из друзей?`,
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/friends/${friendshipId}`);
                            // Удаляем из локального состояния
                            setFriends(prev => prev.filter(f => f.friendshipId !== friendshipId));
                            Alert.alert('Успех', 'Пользователь удален из друзей');
                        } catch (error) {
                            console.error('Remove friend error:', error);
                            Alert.alert('Ошибка', 'Не удалось удалить из друзей');
                        }
                    }
                }
            ]
        );
    };

    const navigateToFriendRequests = () => {
        navigation.navigate('FriendRequests');
    };

    const renderFriendItem = ({ item }: { item: any }) => (
        <View style={styles.friendItem}>
            <TouchableOpacity
                style={styles.friendInfo}
                onPress={() => viewProfile(item)}
            >
                <Avatar
                    avatar={item.avatar}
                    name={item.name}
                    username={item.username}
                    size={50}
                    style={styles.avatar}
                />
                <View style={styles.friendDetails}>
                    <Text style={styles.friendName}>{item.name}</Text>
                    <Text style={styles.friendUsername}>@{item.username}</Text>
                    {item.bio ? (
                        <Text style={styles.friendBio} numberOfLines={1}>
                            {item.bio}
                        </Text>
                    ) : null}
                    <View style={styles.status}>
                        <View style={[styles.statusDot, item.isOnline && styles.statusOnline]} />
                        <Text style={styles.statusText}>
                            {item.isOnline ? 'Online' : 'Offline'}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => startChat(item)}
                >
                    <Text style={styles.chatButtonText}>💬</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeFriend(item.friendshipId, item.name)}
                >
                    <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.centerContainer} edges={['left', 'right', 'bottom']}>
                <ActivityIndicator size="large" color={darkTheme.colors.primary} />
                <Text style={styles.loadingText}>Загрузка друзей...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>← Назад</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Друзья</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.requestsButton}
                        onPress={navigateToFriendRequests}
                    >
                        <Text style={styles.requestsButtonText}>📨</Text>
                        {requestsCount > 0 && (
                            <View style={styles.requestsBadge}>
                                <Text style={styles.requestsBadgeText}>
                                    {requestsCount > 99 ? '99+' : requestsCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Кнопка поиска друзей */}
            <TouchableOpacity
                style={styles.searchFriendsButton}
                onPress={navigateToSearch} // 🔥 Теперь используем исправленную функцию
            >
                <Text style={styles.searchFriendsButtonText}>🔍 Найти друзей</Text>
            </TouchableOpacity>

            <FlatList
                data={friends}
                renderItem={renderFriendItem}
                keyExtractor={item => item.friendshipId}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={darkTheme.colors.primary}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>У вас пока нет друзей</Text>
                        <Text style={styles.emptySubtext}>
                            Найдите друзей через поиск и добавьте их!
                        </Text>
                        <TouchableOpacity
                            style={styles.searchButton}
                            onPress={navigateToSearch} // 🔥 И здесь тоже исправляем
                        >
                            <Text style={styles.searchButtonText}>Найти друзей</Text>
                        </TouchableOpacity>
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
        fontSize: 24,
        fontWeight: 'bold',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 10,
    },
    requestsButton: {
        backgroundColor: darkTheme.colors.card,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    requestsButtonText: {
        fontSize: 18,
        color: darkTheme.colors.text,
    },
    requestsBadge: {
        position: 'absolute',
        top: -4,
        right: -6,
        minWidth: 18,
        height: 18,
        paddingHorizontal: 4,
        borderRadius: 9,
        backgroundColor: '#ef4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    requestsBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    searchFriendsButton: {
        backgroundColor: darkTheme.colors.primary,
        margin: 15,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    searchFriendsButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
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
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: darkTheme.colors.border,
    },
    friendInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
        backgroundColor: darkTheme.colors.card,
    },
    friendDetails: {
        flex: 1,
    },
    friendName: {
        color: darkTheme.colors.text,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    friendUsername: {
        color: darkTheme.colors.primary,
        fontSize: 14,
        marginBottom: 4,
    },
    friendBio: {
        color: darkTheme.colors.textSecondary,
        fontSize: 12,
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
        fontSize: 11,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    chatButton: {
        backgroundColor: darkTheme.colors.primary,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    removeButton: {
        backgroundColor: '#ef4444',
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        color: darkTheme.colors.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtext: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    searchButton: {
        backgroundColor: darkTheme.colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
    },
    searchButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});
