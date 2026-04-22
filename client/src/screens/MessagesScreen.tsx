// src/screens/MessagesScreen.tsx - ПОЛНАЯ ВЕРСИЯ
import React, {useState, useEffect, useRef, useMemo} from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {useSelector, useDispatch} from 'react-redux';
import {useNavigation, useIsFocused} from '@react-navigation/native';
import {darkTheme} from '../themes/dark';
import {api} from '../services/api';
import {getChats} from '../store/slices/messagesSlice';
import UserSearchModal from '../components/UserSearchModal';
import {API_BASE_URL, API_FILE_URL} from "../utils/constants.ts";

export default function MessagesScreen() {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const isFocused = useIsFocused();
    const currentUser = useSelector((state: any) => state.auth.user);
    const {chats, loading} = useSelector((state: any) => state.messages);

    const [refreshing, setRefreshing] = useState(false);
    const [searchModalVisible, setSearchModalVisible] = useState(false);
    const [friends, setFriends] = useState<any[]>([]);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);

    // Функция для получения URL аватара
    const getAvatarUrl = (avatarPath: string | null) => {
        if (!avatarPath) return 'https://via.placeholder.com/50';

        if (avatarPath.startsWith('http')) {
            return avatarPath;
        }

        // return `http://192.168.0.116:5000${avatarPath}`;
        return `${API_FILE_URL}${avatarPath}`;
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            console.log('🔄 MessagesScreen focused, refreshing chats...');
            loadChatsAndFriends();
        });

        return unsubscribe;
    }, [navigation]);

    const loadChatsAndFriends = async () => {
        if (!isMountedRef.current) return;

        try {
            console.log('🔄 Loading chats and friends...');
            const result = await dispatch(getChats() as any);
            console.log('✅ getChats result:', result);

            console.log('📊 Redux chats state after getChats:', chats);

            try {
                const friendsResponse = await api.get('/friends');
                setFriends(friendsResponse.data.friends || []);
                console.log('✅ Friends loaded for chats:', friendsResponse.data.friends.length);
            } catch (error) {
                console.error('Error loading friends for chats:', error);
            }

        } catch (error) {
            console.error('Error loading chats:', error);
        } finally {
            if (isMountedRef.current) {
                setRefreshing(false);
            }
        }
    };

    const startPolling = () => {
        if (pollingRef.current) return;

        console.log('🔄 Starting polling for chats...');
        loadChatsAndFriends();
        pollingRef.current = setInterval(() => {
            if (isMountedRef.current && isFocused && !searchModalVisible) {
                loadChatsAndFriends();
            }
        }, 8000);
    };

    const stopPolling = () => {
        if (pollingRef.current) {
            console.log('🛑 Stopping polling for chats...');
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    useEffect(() => {
        isMountedRef.current = true;

        if (isFocused) {
            startPolling();
        } else {
            stopPolling();
        }

        return () => {
            isMountedRef.current = false;
            stopPolling();
        };
    }, [isFocused, searchModalVisible]);

    const onRefresh = () => {
        setRefreshing(true);
        loadChatsAndFriends();
    };

    const navigateToChat = (chat: any) => {
        console.log('💬 Navigating to chat:', chat);

        if (chat.type === 'personal') {
            navigation.navigate('Chat', {
                chatId: chat.partner.id,
                partner: chat.partner,
                chatType: 'personal'
            });
        } else {
            navigation.navigate('Chat', {
                chatId: chat.conversation.id,
                partner: chat.conversation,
                chatType: 'group'
            });
        }
    };

    const handleUserSelect = (user: any) => {
        console.log('💬 Starting chat with user:', user);
        setSearchModalVisible(false);
        navigation.navigate('Chat', {
            chatId: user.id,
            partner: user,
            chatType: 'personal'
        });
    };

    const startNewChat = () => {
        stopPolling();
        setSearchModalVisible(true);
    };

    const startNewConversation = () => {
        stopPolling();
        navigation.navigate('CreateConversation');
    };

    const handleCloseSearch = () => {
        setSearchModalVisible(false);
        setTimeout(() => {
            if (isMountedRef.current && isFocused) {
                startPolling();
            }
        }, 1000);
    };

    const getLastMessagePreview = (chat: any) => {
        if (!chat.lastMessage) return 'Нет сообщений';

        if (chat.lastMessage.messageType === 'image') {
            return chat.type === 'group' && chat.lastMessage.Sender?.name
                ? `${chat.lastMessage.Sender.name}: 📷 Фото`
                : '📷 Фото';
        }

        const content = chat.lastMessage.content || '';
        const preview = content.length > 40
            ? content.substring(0, 40) + '...'
            : content;

        if (chat.type === 'group' && chat.lastMessage.Sender?.name) {
            return `${chat.lastMessage.Sender.name}: ${preview}`;
        }

        return preview;
    };

    const getChatTitle = (chat: any) => {
        if (chat.type === 'personal') {
            return chat.partner?.name || 'Пользователь';
        } else {
            return chat.conversation?.name || 'Беседа';
        }
    };

    const getChatAvatar = (chat: any) => {
        if (chat.type === 'personal') {
            return getAvatarUrl(chat.partner?.avatar);
        } else {
            return getAvatarUrl(chat.conversation?.avatar);
        }
    };

    const getFriendsAsChats = () => {
        return friends.map(friend => ({
            type: 'personal',
            partner: friend,
            lastMessage: null,
            unreadCount: 0,
            updatedAt: friend.createdAt || new Date(),
            isFriendChat: true
        }));
    };

    const sortedChats = useMemo(() => {
        const allChats = [
            ...chats,
            ...getFriendsAsChats()
        ];

        const uniqueChats = allChats.filter((chat, index, self) =>
            index === self.findIndex(c => {
                if (chat.type === 'group') {
                    return c.type === 'group' && c.conversation?.id === chat.conversation?.id;
                }
                return c.type === 'personal' && c.partner?.id === chat.partner?.id;
            })
        ).map(chat => {
            if (chat.type === 'personal') {
                const isFriend = friends.some(f => f.id === chat.partner?.id);
                return {
                    ...chat,
                    isFriendChat: isFriend && !chat.lastMessage
                };
            }
            return chat;
        });

        return [...uniqueChats].sort((a, b) => {
            const dateA = a.lastMessage ? new Date(a.updatedAt).getTime() : 0;
            const dateB = b.lastMessage ? new Date(b.updatedAt).getTime() : 0;
            return dateB - dateA;
        });
    }, [chats, friends]);

    const renderChatItem = ({item}: { item: any }) => (
        <TouchableOpacity
            style={styles.chatItem}
            onPress={() => navigateToChat(item)}
        >
            <Image
                source={{uri: getChatAvatar(item)}}
                style={styles.avatar}
                defaultSource={{uri: 'https://via.placeholder.com/50'}}
            />

            <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                    <Text style={styles.chatName}>{getChatTitle(item)}</Text>
                    {item.lastMessage && (
                        <Text style={styles.chatTime}>
                            {new Date(item.lastMessage.createdAt).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </Text>
                    )}
                    {item.isFriendChat && (
                        <View style={styles.friendBadge}>
                            <Text style={styles.friendBadgeText}>👥 Друг</Text>
                        </View>
                    )}
                    {item.type === 'group' && (
                        <View style={styles.groupBadge}>
                            <Text style={styles.groupBadgeText}>👥 Группа</Text>
                        </View>
                    )}
                </View>

                <View style={styles.chatPreview}>
                    <Text
                        style={[
                            styles.previewText,
                            item.unreadCount > 0 && styles.unreadPreview
                        ]}
                        numberOfLines={1}
                    >
                        {item.isFriendChat ? '💬 Начать общение' : getLastMessagePreview(item)}
                    </Text>

                    {item.unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadCount}>
                                {item.unreadCount > 99 ? '99+' : item.unreadCount}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    console.log('📊 Chats state:', {
        totalChats: chats.length,
        friendsCount: friends.length,
        uniqueChats: sortedChats.length,
        sortedChats: sortedChats.length
    });

    if (loading && sortedChats.length === 0 && !refreshing) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Сообщения</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.conversationButton}
                            onPress={startNewConversation}
                        >
                            <Text style={styles.conversationButtonText}>👥</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.searchButton}
                            onPress={startNewChat}
                        >
                            <Text style={styles.searchButtonText}>💬</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={darkTheme.colors.primary}/>
                    <Text style={styles.loadingText}>Загрузка чатов...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <>
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <Text style={styles.title}>Сообщения</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.conversationButton}
                            onPress={startNewConversation}
                        >
                            <Text style={styles.conversationButtonText}>👥</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.searchButton}
                            onPress={startNewChat}
                        >
                            <Text style={styles.searchButtonText}>💬</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <FlatList
                    data={sortedChats}
                    renderItem={renderChatItem}
                    keyExtractor={item =>
                        item.type === 'group'
                            ? `group-${item.conversation?.id || item.id}`
                            : `personal-${item.partner?.id || item.id}`
                    }
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={darkTheme.colors.primary}
                            colors={[darkTheme.colors.primary]}
                        />
                    }
                    ListHeaderComponent={
                        sortedChats.length > 0 && (
                            <View style={styles.buttonsContainer}>
                                <TouchableOpacity
                                    style={styles.newChatButton}
                                    onPress={startNewChat}
                                >
                                    <Text style={styles.newChatButtonText}>💬 Новый диалог</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.newConversationButton}
                                    onPress={startNewConversation}
                                >
                                    <Text style={styles.newConversationButtonText}>👥 Создать беседу</Text>
                                </TouchableOpacity>
                            </View>
                        )
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Нет сообщений</Text>
                            <Text style={styles.emptySubtext}>
                                Начните общение с другими пользователями
                            </Text>
                            <View style={styles.emptyButtons}>
                                <TouchableOpacity
                                    style={styles.emptyButton}
                                    onPress={startNewChat}
                                >
                                    <Text style={styles.emptyButtonText}>Начать диалог</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.emptyButton, styles.emptyConversationButton]}
                                    onPress={startNewConversation}
                                >
                                    <Text style={styles.emptyButtonText}>Создать беседу</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    }
                    contentContainerStyle={sortedChats.length === 0 ? {flex: 1} : null}
                />
            </SafeAreaView>

            <UserSearchModal
                visible={searchModalVisible}
                onClose={handleCloseSearch}
                onUserSelect={handleUserSelect}
            />
        </>
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
    headerActions: {
        flexDirection: 'row',
        gap: 10,
    },
    title: {
        color: darkTheme.colors.text,
        fontSize: 24,
        fontWeight: 'bold',
    },
    conversationButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: darkTheme.colors.card,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    conversationButtonText: {
        fontSize: 18,
        color: darkTheme.colors.text,
    },
    searchButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: darkTheme.colors.card,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchButtonText: {
        fontSize: 18,
        color: darkTheme.colors.text,
    },
    buttonsContainer: {
        gap: 10,
        padding: 15,
    },
    newChatButton: {
        backgroundColor: darkTheme.colors.primary,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    newChatButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    newConversationButton: {
        backgroundColor: '#8b5cf6',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    newConversationButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: darkTheme.colors.textSecondary,
        marginTop: 10,
        fontSize: 16,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: darkTheme.colors.border,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
        backgroundColor: darkTheme.colors.card,
    },
    chatInfo: {
        flex: 1,
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    chatName: {
        color: darkTheme.colors.text,
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    chatTime: {
        color: darkTheme.colors.textSecondary,
        fontSize: 12,
        marginLeft: 8,
    },
    friendBadge: {
        backgroundColor: darkTheme.colors.primary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    friendBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    groupBadge: {
        backgroundColor: '#8b5cf6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    groupBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    chatPreview: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    previewText: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        flex: 1,
    },
    unreadPreview: {
        color: darkTheme.colors.text,
        fontWeight: '500',
    },
    unreadBadge: {
        backgroundColor: darkTheme.colors.primary,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    unreadCount: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        paddingHorizontal: 6,
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
    emptyButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    emptyButton: {
        backgroundColor: darkTheme.colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
    },
    emptyConversationButton: {
        backgroundColor: '#8b5cf6',
    },
    emptyButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});
