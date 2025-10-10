// src/screens/ChatScreen.tsx - ПОЛНАЯ ВЕРСИЯ
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { darkTheme } from '../themes/dark';
import { api } from '../services/api';
import { addMessage } from '../store/slices/messagesSlice';
import MessageBubble from '../components/MessageBubble';

export default function ChatScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const isFocused = useIsFocused();
    const currentUser = useSelector((state: any) => state.auth.user);
    const { messages } = useSelector((state: any) => state.messages);

    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);

    const params = route.params as any;

    // Функция для получения URL аватара
    const getAvatarUrl = (avatarPath: string | null) => {
        if (!avatarPath) return 'https://via.placeholder.com/50';

        if (avatarPath.startsWith('http')) {
            return avatarPath;
        }

        return `http://192.168.0.116:5000${avatarPath}`;
    };

    if (!params?.partner) {
        console.error('❌ ChatScreen: Missing partner parameter');
        return (
            <SafeAreaView style={styles.container}>
                <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>
                    Ошибка: неверные параметры чата
                </Text>
            </SafeAreaView>
        );
    }

    const { partner, chatType = 'personal' } = params;
    const chatId = partner.id;
    const chatMessages = messages[chatId] || [];

    console.log('💬 ChatScreen params:', { partner, chatType, chatId });

    const getChatTitle = () => {
        if (chatType === 'personal') {
            return partner?.name || 'Пользователь';
        } else {
            return partner?.name || 'Беседа';
        }
    };

    const getChatSubtitle = () => {
        if (chatType === 'personal') {
            return 'Личный чат';
        } else {
            const memberCount = partner?.Members?.length || 0;
            return `Групповой чат • ${memberCount} участников`;
        }
    };

    const getChatAvatar = () => {
        return getAvatarUrl(partner?.avatar);
    };

    // Загрузка сообщений
    const loadMessages = async () => {
        if (!isMountedRef.current) return;

        try {
            console.log('🔄 Loading messages for chat:', chatId);

            let response;
            if (chatType === 'personal') {
                response = await api.get(`/messages/chat/${chatId}`);
            } else {
                response = await api.get(`/messages/conversation/${chatId}`);
            }

            const loadedMessages = response.data.messages || [];
            console.log(`✅ Loaded ${loadedMessages.length} messages`);

            // Обновляем сообщения в Redux
            loadedMessages.forEach((message: any) => {
                dispatch(addMessage({
                    message: {
                        ...message,
                        isRead: message.senderId === currentUser.id ? true : message.isRead
                    },
                    chatId: chatId
                }));
            });

            // Прокручиваем к последнему сообщению
            setTimeout(() => {
                if (isMountedRef.current && flatListRef.current && loadedMessages.length > 0) {
                    flatListRef.current.scrollToEnd({ animated: true });
                }
            }, 100);

        } catch (error: any) {
            console.error('❌ Error loading messages:', error);
        }
    };

    // Polling для новых сообщений
    const startPolling = () => {
        if (pollingRef.current) return;

        console.log('🔄 Starting polling for messages...');
        setLoading(true);
        loadMessages().finally(() => {
            if (isMountedRef.current) {
                setLoading(false);
            }
        });

        pollingRef.current = setInterval(() => {
            if (isMountedRef.current) {
                loadMessages();
            }
        }, 3000);
    };

    const stopPolling = () => {
        if (pollingRef.current) {
            console.log('🛑 Stopping polling for messages...');
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
    }, [isFocused, chatId]);

    // Функция для загрузки изображения на сервер
    const uploadImage = async (imageUri: string): Promise<string | null> => {
        try {
            console.log('📤 Uploading image:', imageUri);

            const formData = new FormData();
            formData.append('image', {
                uri: imageUri,
                type: 'image/jpeg',
                name: 'message-image.jpg'
            } as any);

            const response = await api.post('/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            console.log('✅ Image uploaded:', response.data.url);
            return response.data.url;
        } catch (error) {
            console.error('❌ Error uploading image:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить изображение');
            return null;
        }
    };

    const sendMessage = async (content: string, messageType: 'text' | 'image' = 'text') => {
        if ((!content.trim() && messageType === 'text') || sending) return;

        console.log('📤 Sending message:', { content, messageType, chatType });

        setSending(true);
        try {
            let finalContent = content;

            // Если это изображение - загружаем на сервер
            if (messageType === 'image' && content.startsWith('file://')) {
                const uploadedUrl = await uploadImage(content);
                if (!uploadedUrl) {
                    setSending(false);
                    return;
                }
                finalContent = uploadedUrl;
            }

            const messageData: any = {
                content: finalContent,
                messageType
            };

            if (chatType === 'personal') {
                messageData.receiverId = chatId;
            } else {
                messageData.conversationId = chatId;
            }

            console.log('📤 Final message data:', messageData);

            const response = await api.post('/messages/send', messageData);
            console.log('✅ Message sent response:', response.data);

            // Сразу добавляем сообщение в список
            dispatch(addMessage({
                message: {
                    ...response.data.message,
                    isRead: true
                },
                chatId: chatId
            }));

            if (messageType === 'text') {
                setNewMessage('');
            }

            // Прокручиваем к последнему сообщению
            setTimeout(() => {
                if (flatListRef.current) {
                    flatListRef.current.scrollToEnd({ animated: true });
                }
            }, 100);

        } catch (error: any) {
            console.error('❌ Send message error:', error);

            const errorMessage = error.response?.data?.error || error.message || 'Не удалось отправить сообщение';
            Alert.alert('Ошибка', errorMessage);
        } finally {
            setSending(false);
        }
    };

    const sendImage = async () => {
        try {
            setUploadingImage(true);
            const result = await launchImageLibrary({
                mediaType: 'photo',
                quality: 0.8,
            });

            if (result.assets && result.assets[0]) {
                const imageUri = result.assets[0].uri;
                if (imageUri) {
                    await sendMessage(imageUri, 'image');
                }
            }
        } catch (error) {
            console.error('❌ Image selection error:', error);
            Alert.alert('Ошибка', 'Не удалось выбрать изображение');
        } finally {
            setUploadingImage(false);
        }
    };

    const renderMessage = ({ item }: { item: any }) => (
        <MessageBubble
            message={item}
            isOwn={item.senderId === currentUser.id}
            showSender={chatType === 'group' && item.senderId !== currentUser.id}
        />
    );

    // В ChatScreen.tsx - ЗАМЕНИ viewConversationInfo функцию:
    const viewConversationInfo = () => {
        if (chatType === 'group') {
            navigation.navigate('ConversationInfo', {
                conversationId: chatId,
                conversation: partner
            });
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            {/* Шапка чата */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>← Назад</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.headerInfo}
                    onPress={viewConversationInfo}
                    disabled={chatType === 'personal'}
                >
                    <Image
                        source={{ uri: getChatAvatar() }}
                        style={styles.headerAvatar}
                        defaultSource={{ uri: 'https://via.placeholder.com/40' }}
                    />
                    <View style={styles.headerText}>
                        <Text style={styles.title}>{getChatTitle()}</Text>
                        <Text style={styles.subtitle}>{getChatSubtitle()}</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.placeholder} />
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                {loading && chatMessages.length === 0 ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={darkTheme.colors.primary} />
                        <Text style={styles.loadingText}>Загрузка сообщений...</Text>
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={chatMessages}
                        renderItem={renderMessage}
                        keyExtractor={item => `msg-${item.id}-${item.createdAt}`}
                        style={styles.messagesList}
                        contentContainerStyle={styles.messagesContent}
                        showsVerticalScrollIndicator={false}
                        onContentSizeChange={() => {
                            if (flatListRef.current && chatMessages.length > 0) {
                                flatListRef.current.scrollToEnd({ animated: true });
                            }
                        }}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>Нет сообщений</Text>
                                <Text style={styles.emptySubtext}>
                                    {chatType === 'personal'
                                        ? 'Начните общение первым!'
                                        : 'Начните общение в беседе!'
                                    }
                                </Text>
                            </View>
                        }
                    />
                )}

                <View style={styles.inputContainer}>
                    <TouchableOpacity
                        style={styles.attachButton}
                        onPress={sendImage}
                        disabled={uploadingImage}
                    >
                        {uploadingImage ? (
                            <ActivityIndicator size="small" color={darkTheme.colors.primary} />
                        ) : (
                            <Text style={styles.attachButtonText}>📷</Text>
                        )}
                    </TouchableOpacity>

                    <TextInput
                        style={styles.messageInput}
                        placeholder={
                            chatType === 'personal'
                                ? "Введите сообщение..."
                                : "Введите сообщение в беседу..."
                        }
                        placeholderTextColor={darkTheme.colors.textSecondary}
                        value={newMessage}
                        onChangeText={setNewMessage}
                        multiline
                        maxLength={1000}
                        onSubmitEditing={() => sendMessage(newMessage)}
                    />

                    <TouchableOpacity
                        style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
                        onPress={() => sendMessage(newMessage)}
                        disabled={!newMessage.trim() || sending}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.sendButtonText}>➤</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
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
    headerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    title: {
        color: darkTheme.colors.text,
        fontSize: 18,
        fontWeight: '600',
    },
    subtitle: {
        color: darkTheme.colors.textSecondary,
        fontSize: 12,
    },
    placeholder: {
        width: 60,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: darkTheme.colors.textSecondary,
        marginTop: 10,
        fontSize: 16,
    },
    messagesList: {
        flex: 1,
    },
    messagesContent: {
        paddingVertical: 10,
        paddingHorizontal: 5,
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
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 15,
        paddingBottom: Platform.OS === 'ios' ? 25 : 15,
        borderTopWidth: 1,
        borderTopColor: darkTheme.colors.border,
        backgroundColor: darkTheme.colors.background,
    },
    attachButton: {
        padding: 10,
        marginRight: 10,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    attachButtonText: {
        fontSize: 20,
        color: darkTheme.colors.text,
    },
    messageInput: {
        flex: 1,
        backgroundColor: darkTheme.colors.card,
        color: darkTheme.colors.text,
        paddingHorizontal: 15,
        paddingVertical: Platform.OS === 'ios' ? 12 : 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: darkTheme.colors.border,
        fontSize: 16,
        maxHeight: 100,
    },
    sendButton: {
        backgroundColor: darkTheme.colors.primary,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    sendButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
