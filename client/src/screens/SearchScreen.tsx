// src/screens/SearchScreen.tsx - ПОЛНАЯ ВЕРСИЯ
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { searchUsers, clearSearch, updateUserRelation } from '../store/slices/usersSlice';
import { darkTheme } from '../themes/dark';
import { api } from '../services/api';
import Avatar from '../components/Avatar';

export default function SearchScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const [friends, setFriends] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'search' | 'friends'>('search');
    const [loadingFriends, setLoadingFriends] = useState(true);
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const currentUser = useSelector((state: any) => state.auth.user);
    const { searchResults, searchLoading, searchError } = useSelector((state: any) => state.users);
    const [friendLoading, setFriendLoading] = useState<string | null>(null);

    // Polling для обновления друзей
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        if (searchError) {
            Alert.alert('Ошибка', searchError);
        }
    }, [searchError]);

    const loadFriends = useCallback(async () => {
        try {
            setLoadingFriends(true);
            const response = await api.get('/friends');
            setFriends(response.data.friends);
        } catch (error) {
            console.error('Error loading friends:', error);
        } finally {
            setLoadingFriends(false);
        }
    }, []);

    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            console.log('🛑 Stopping polling for friends...');
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }, []);

    const startPolling = useCallback(() => {
        if (pollingRef.current || !isFocused || activeTab !== 'friends') return;

        console.log('🔄 Starting polling for friends...');
        loadFriends();
        pollingRef.current = setInterval(() => {
            if (isMountedRef.current && isFocused && activeTab === 'friends') {
                loadFriends();
            }
        }, 10000);
    }, [activeTab, isFocused, loadFriends]);

    useEffect(() => {
        isMountedRef.current = true;

        if (isFocused && activeTab === 'friends') {
            startPolling();
        } else {
            stopPolling();
        }

        return () => {
            isMountedRef.current = false;
            stopPolling();
        };
    }, [activeTab, isFocused, startPolling, stopPolling]);

    useEffect(() => {
        if (activeTab === 'friends') {
            loadFriends();
        }
    }, [activeTab, loadFriends]);

    useEffect(() => {
        return () => {
            dispatch(clearSearch());
            stopPolling();
        };
    }, [dispatch, stopPolling]);

    const handleSearch = () => {
        if (searchQuery.trim().length < 2) {
            Alert.alert('Ошибка', 'Введите хотя бы 2 символа для поиска');
            return;
        }
        dispatch(searchUsers(searchQuery.trim()) as any);
    };

    const handleAddFriend = async (userId: string) => {
        setFriendLoading(userId);
        try {
            console.log('📤 Sending friend request to:', userId);
            await api.post(`/friends/${userId}/request`);

            dispatch(updateUserRelation({
                userId,
                relation: {
                    isFriend: false,
                    friendshipStatus: 'pending',
                    friendshipDirection: 'outgoing',
                    friendshipId: null,
                },
            }));

            Alert.alert('Успех', 'Запрос в друзья отправлен');

            if (activeTab === 'friends') {
                loadFriends();
            }

        } catch (error: any) {
            console.error('❌ Add friend error:', error);

            let errorMessage = 'Не удалось отправить запрос';

            if (error.response?.status === 400) {
                errorMessage = error.response.data?.error || 'Невозможно отправить запрос';
            } else if (error.response?.status === 404) {
                errorMessage = 'Пользователь не найден';
            } else if (error.response?.status === 500) {
                errorMessage = 'Ошибка сервера. Попробуйте позже';
            }

            Alert.alert('Ошибка', errorMessage);
        } finally {
            setFriendLoading(null);
        }
    };

    const viewProfile = (user: any) => {
        console.log('👤 Navigating to user profile:', user.id);
        if (String(user.id) === String(currentUser?.id)) {
            navigation.navigate('Main', { screen: 'Profile' });
            return;
        }
        navigation.navigate('UserProfile', { userId: user.id });
    };

    const startChat = (user: any) => {
        navigation.navigate('Chat', {
            chatId: user.id,
            partner: user,
            chatType: 'personal'
        });
    };

    const handleTabChange = (tab: 'search' | 'friends') => {
        stopPolling();
        setActiveTab(tab);

        if (tab === 'friends') {
            setTimeout(() => {
                if (isMountedRef.current && isFocused) {
                    startPolling();
                }
            }, 500);
        }
    };

    const renderSearchItem = ({ item }: { item: any }) => {
        const isLoading = friendLoading === item.id;
        const relation = item.relation || {};
        const isOwnProfile = relation.isOwnProfile || false;
        const isFriend = relation.isFriend || friends.some(f => f.id === item.id);
        const hasOutgoingRequest = relation.friendshipStatus === 'pending' && relation.friendshipDirection === 'outgoing';
        const hasIncomingRequest = relation.friendshipStatus === 'pending' && relation.friendshipDirection === 'incoming';
        const showAddFriendButton = !isOwnProfile && !isFriend;
        const addFriendDisabled = isLoading || hasOutgoingRequest || hasIncomingRequest;
        const addFriendLabel = hasIncomingRequest ? 'Входящая' : hasOutgoingRequest ? 'Отправлена' : '➕';

        return (
            <View style={styles.userCard}>
                <TouchableOpacity
                    style={styles.userInfo}
                    onPress={() => viewProfile(item)}
                >
                    <Avatar
                        avatar={item.avatar}
                        name={item.name}
                        username={item.username}
                        size={50}
                        style={styles.avatar}
                    />
                    <View style={styles.userDetails}>
                        <Text style={styles.userName}>{item.name}</Text>
                        <Text style={styles.userUsername}>@{item.username}</Text>
                        {item.bio ? (
                            <Text style={styles.userBio} numberOfLines={1}>
                                {item.bio}
                            </Text>
                        ) : null}
                    </View>
                </TouchableOpacity>

                <View style={styles.actions}>
                    {showAddFriendButton ? (
                        <TouchableOpacity
                            style={[
                                styles.addFriendButton,
                                (hasOutgoingRequest || hasIncomingRequest) && styles.addFriendButtonMuted
                            ]}
                            onPress={() => handleAddFriend(item.id)}
                            disabled={addFriendDisabled}
                        >
                            {isLoading ? (
                                <ActivityIndicator
                                    size="small"
                                    color={(hasOutgoingRequest || hasIncomingRequest) ? darkTheme.colors.text : '#fff'}
                                />
                            ) : (
                                <Text
                                    style={[
                                        styles.addFriendText,
                                        (hasOutgoingRequest || hasIncomingRequest) && styles.addFriendTextMuted,
                                    ]}
                                >
                                    {addFriendLabel}
                                </Text>
                            )}
                        </TouchableOpacity>
                    ) : isFriend ? (
                        <TouchableOpacity
                            style={styles.chatButton}
                            onPress={() => startChat(item)}
                        >
                            <Text style={styles.chatButtonText}>💬</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>
        );
    };

    const renderFriendItem = ({ item }: { item: any }) => (
        <View style={styles.userCard}>
            <TouchableOpacity
                style={styles.userInfo}
                onPress={() => viewProfile(item)}
            >
                <Avatar
                    avatar={item.avatar}
                    name={item.name}
                    username={item.username}
                    size={50}
                    style={styles.avatar}
                />
                <View style={styles.userDetails}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userUsername}>@{item.username}</Text>
                    {item.bio ? (
                        <Text style={styles.userBio} numberOfLines={1}>
                            {item.bio}
                        </Text>
                    ) : null}
                </View>
            </TouchableOpacity>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => startChat(item)}
                >
                    <Text style={styles.chatButtonText}>💬</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <View style={styles.header}>
                <Text style={styles.title}>Поиск</Text>
            </View>

            {/* Табы */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'search' && styles.activeTab]}
                    onPress={() => handleTabChange('search')}
                >
                    <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
                        Поиск
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
                    onPress={() => handleTabChange('friends')}
                >
                    <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
                        Друзья ({friends.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'search' ? (
                <>
                    {/* Поиск */}
                    <View style={styles.searchContainer}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Введите имя или username..."
                            placeholderTextColor={darkTheme.colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmitEditing={handleSearch}
                            returnKeyType="search"
                        />
                        <TouchableOpacity
                            style={styles.searchButton}
                            onPress={handleSearch}
                            disabled={searchLoading}
                        >
                            {searchLoading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.searchButtonText}>🔍</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Результаты поиска */}
                    {searchResults.length > 0 ? (
                        <FlatList
                            data={searchResults}
                            renderItem={renderSearchItem}
                            keyExtractor={item => item.id}
                            showsVerticalScrollIndicator={false}
                            style={styles.resultsList}
                        />
                    ) : searchQuery.length >= 2 && !searchLoading ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Пользователи не найдены</Text>
                            <Text style={styles.emptySubtext}>
                                Попробуйте изменить запрос поиска
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.initialContainer}>
                            <Text style={styles.initialText}>Найдите друзей</Text>
                            <Text style={styles.initialSubtext}>
                                Введите имя или username пользователя
                            </Text>
                        </View>
                    )}
                </>
            ) : (
                /* Список друзей */
                <FlatList
                    data={friends}
                    renderItem={renderFriendItem}
                    keyExtractor={item => item.friendshipId}
                    showsVerticalScrollIndicator={false}
                    style={styles.resultsList}
                    refreshing={loadingFriends}
                    onRefresh={loadFriends}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>У вас пока нет друзей</Text>
                            <Text style={styles.emptySubtext}>
                                Найдите друзей через поиск и добавьте их!
                            </Text>
                        </View>
                    }
                />
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
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: darkTheme.colors.border,
    },
    title: {
        color: darkTheme.colors.text,
        fontSize: 24,
        fontWeight: 'bold',
    },
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: darkTheme.colors.border,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: darkTheme.colors.primary,
    },
    tabText: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    activeTabText: {
        color: darkTheme.colors.primary,
    },
    searchContainer: {
        flexDirection: 'row',
        padding: 15,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        backgroundColor: darkTheme.colors.card,
        color: darkTheme.colors.text,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: darkTheme.colors.border,
        fontSize: 16,
    },
    searchButton: {
        backgroundColor: darkTheme.colors.primary,
        padding: 12,
        borderRadius: 8,
        width: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchButtonText: {
        color: '#fff',
        fontSize: 18,
    },
    resultsList: {
        flex: 1,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
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
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    userDetails: {
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
    userBio: {
        color: darkTheme.colors.textSecondary,
        fontSize: 12,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    addFriendButton: {
        backgroundColor: darkTheme.colors.primary,
        minWidth: 40,
        height: 40,
        borderRadius: 20,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addFriendButtonMuted: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: darkTheme.colors.border,
    },
    addFriendText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    addFriendTextMuted: {
        color: darkTheme.colors.text,
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
    },
    emptySubtext: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
    },
    initialContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    initialText: {
        color: darkTheme.colors.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    initialSubtext: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
    },
});
