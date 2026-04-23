// src/screens/ChatScreen.tsx - ПОЛНАЯ ВЕРСИЯ
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    PermissionsAndroid,
    ActivityIndicator,
    Image,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSelector, useDispatch } from 'react-redux';
import { useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { darkTheme } from '../themes/dark';
import { api } from '../services/api';
import { addMessage, getChats } from '../store/slices/messagesSlice';
import MessageBubble from '../components/MessageBubble';
import {API_FILE_URL} from "../utils/constants.ts";
import { formatAudioDuration } from '../utils/audio';

let createSoundModule: null | (() => any) = null;

try {
    const nitroSound = require('react-native-nitro-sound');
    createSoundModule = nitroSound.createSound;
} catch (error) {
    console.warn('Audio module is unavailable until the app is rebuilt:', error);
}

const AI_REWRITE_STYLES = [
    { key: 'official', label: 'AI Официально' },
    { key: 'warm', label: 'AI Душевно' },
    { key: 'friendly', label: 'AI Живее' },
];

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
    const [recording, setRecording] = useState(false);
    const [recordingLoading, setRecordingLoading] = useState(false);
    const [recordingDurationMs, setRecordingDurationMs] = useState(0);
    const [aiLoadingStyle, setAiLoadingStyle] = useState<string | null>(null);
    const [aiError, setAiError] = useState('');
    const [groupConversation, setGroupConversation] = useState<any>(null);
    const flatListRef = useRef<FlatList>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);
    const accessLostHandledRef = useRef(false);
    const soundRef = useRef<any>(createSoundModule ? createSoundModule() : null);

    const params = route.params as any;
    const hasPartner = Boolean(params?.partner);
    const partner = params?.partner;
    const chatType = params?.chatType || 'personal';
    const chatId = partner?.id;
    const chatMessages = chatId ? (messages[chatId] || []) : [];
    const activePartner = chatType === 'group' ? (groupConversation || partner) : partner;

    // Функция для получения URL аватара
    const getAvatarUrl = (avatarPath: string | null) => {
        if (!avatarPath) return 'https://via.placeholder.com/50';

        if (avatarPath.startsWith('http')) {
            return avatarPath;
        }

        // return `http://192.168.0.116:5000${avatarPath}`;
        return `${API_FILE_URL}${avatarPath}`;
    };

    const requestAudioPermission = useCallback(async () => {
        if (Platform.OS !== 'android') {
            return true;
        }

        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                {
                    title: 'Доступ к микрофону',
                    message: 'Нужен доступ к микрофону для записи голосовых сообщений.',
                    buttonNeutral: 'Позже',
                    buttonNegative: 'Отмена',
                    buttonPositive: 'Разрешить',
                }
            );

            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (error) {
            console.error('Record permission error:', error);
            return false;
        }
    }, []);

    console.log('💬 ChatScreen params:', { partner, chatType, chatId });

    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            console.log('🛑 Stopping polling for messages...');
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }, []);

    const handleConversationAccessLost = useCallback(() => {
        if (chatType !== 'group' || accessLostHandledRef.current) {
            return;
        }

        accessLostHandledRef.current = true;
        stopPolling();
        dispatch(getChats() as any);

        Alert.alert('Беседа обновлена', 'Вы больше не участник этой беседы', [
            {
                text: 'OK',
                onPress: () => navigation.goBack()
            }
        ]);
    }, [chatType, dispatch, navigation, stopPolling]);

    const loadConversationInfo = useCallback(async () => {
        if (chatType !== 'group' || !isMountedRef.current) {
            return;
        }

        try {
            const response = await api.get(`/conversations/${chatId}`);
            setGroupConversation(response.data.conversation);
        } catch (error: any) {
            console.error('Conversation info sync error:', error);

            if (error.response?.status === 403 || error.response?.status === 404) {
                handleConversationAccessLost();
            }
        }
    }, [chatId, chatType, handleConversationAccessLost]);

    const getChatTitle = () => {
        if (chatType === 'personal') {
            return activePartner?.name || 'Пользователь';
        } else {
            return activePartner?.name || 'Беседа';
        }
    };

    const getChatSubtitle = () => {
        if (chatType === 'personal') {
            return 'Личный чат';
        } else {
            const memberCount = activePartner?.Members?.length || 0;
            return `Групповой чат • ${memberCount} участников`;
        }
    };

    const getChatAvatar = () => {
        return getAvatarUrl(activePartner?.avatar);
    };

    // Загрузка сообщений
    const loadMessages = useCallback(async () => {
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

            if ((error.response?.status === 403 || error.response?.status === 404) && chatType === 'group') {
                handleConversationAccessLost();
            }
        }
    }, [chatId, chatType, currentUser.id, dispatch, handleConversationAccessLost]);

    // Polling для новых сообщений
    const startPolling = useCallback(() => {
        if (pollingRef.current) return;

        console.log('🔄 Starting polling for messages...');
        setLoading(true);
        Promise.all([
            loadMessages(),
            loadConversationInfo(),
        ]).finally(() => {
            if (isMountedRef.current) {
                setLoading(false);
            }
        });

        pollingRef.current = setInterval(() => {
            if (isMountedRef.current) {
                loadMessages();
                loadConversationInfo();
            }
        }, 3000);
    }, [loadConversationInfo, loadMessages]);

    useEffect(() => {
        const sound = soundRef.current;

        isMountedRef.current = true;
        accessLostHandledRef.current = false;

        if (chatType === 'group') {
            setGroupConversation(partner);
        }

        if (isFocused) {
            startPolling();
        } else {
            stopPolling();
        }

        return () => {
            isMountedRef.current = false;
            stopPolling();
            if (sound) {
                sound.removeRecordBackListener?.();
                sound.removePlayBackListener?.();
                sound.removePlaybackEndListener?.();
                sound.stopRecorder?.().catch(() => undefined);
                sound.stopPlayer?.().catch(() => undefined);
            }
        };
    }, [chatId, chatType, isFocused, partner, startPolling, stopPolling]);

    // Функция для загрузки изображения на сервер
    const uploadFile = async (
        fileUri: string,
        fieldName: 'image' | 'file',
        fileName: string,
        fileType: string
    ): Promise<string | null> => {
        try {
            console.log('📤 Uploading file:', { fileUri, fieldName, fileName, fileType });

            const formData = new FormData();
            formData.append(fieldName, {
                uri: fileUri,
                type: fileType,
                name: fileName
            } as any);

            const response = await api.post('/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            console.log('✅ Image uploaded:', response.data.url);
            return response.data.url;
        } catch (error) {
            console.error('❌ Error uploading file:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить файл');
            return null;
        }
    };

    const sendMessage = async (content: string, messageType: 'text' | 'image' | 'audio' = 'text') => {
        if ((!content.trim() && messageType === 'text') || sending) return;

        console.log('📤 Sending message:', { content, messageType, chatType });

        setSending(true);
        try {
            let finalContent = content;

            // Если это изображение - загружаем на сервер
            if (messageType === 'image' && content.startsWith('file://')) {
                const uploadedUrl = await uploadFile(content, 'image', 'message-image.jpg', 'image/jpeg');
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

    const startVoiceRecording = async () => {
        if (recording || recordingLoading || sending) {
            return;
        }

        if (!soundRef.current) {
            Alert.alert('Недоступно', 'Голосовые заработают после полной пересборки приложения.');
            return;
        }

        const hasPermission = await requestAudioPermission();

        if (!hasPermission) {
            Alert.alert('Ошибка', 'Без доступа к микрофону запись голосового недоступна');
            return;
        }

        try {
            setRecordingLoading(true);
            setRecordingDurationMs(0);
            soundRef.current.removeRecordBackListener?.();
            soundRef.current.addRecordBackListener?.((recordMeta: any) => {
                setRecordingDurationMs(recordMeta.currentPosition || 0);
            });
            await soundRef.current.startRecorder();
            setRecording(true);
        } catch (error) {
            console.error('Start recording error:', error);
            Alert.alert('Ошибка', 'Не удалось начать запись');
        } finally {
            setRecordingLoading(false);
        }
    };

    const stopVoiceRecording = async (shouldSend: boolean) => {
        if (!recording && !recordingLoading) {
            return;
        }

        try {
            setRecordingLoading(true);
            const recordedPath = await soundRef.current.stopRecorder();
            soundRef.current.removeRecordBackListener?.();
            setRecording(false);

            if (!shouldSend || !recordedPath) {
                setRecordingDurationMs(0);
                return;
            }

            const uploadedUrl = await uploadFile(
                recordedPath,
                'file',
                'voice-message.m4a',
                Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4'
            );

            if (!uploadedUrl) {
                return;
            }

            await sendMessage(JSON.stringify({
                url: uploadedUrl,
                durationMs: recordingDurationMs,
            }), 'audio');
            setRecordingDurationMs(0);
        } catch (error) {
            console.error('Stop recording error:', error);
            Alert.alert('Ошибка', 'Не удалось завершить запись');
        } finally {
            setRecording(false);
            setRecordingLoading(false);
        }
    };

    const rewriteMessageWithAI = async (style: string) => {
        const sourceText = newMessage.trim();

        if (!sourceText) {
            setAiError('Сначала введите текст сообщения');
            return;
        }

        setAiError('');
        setAiLoadingStyle(style);

        try {
            const response = await api.post('/ai/rewrite-message', {
                text: sourceText,
                style
            });

            setNewMessage(response.data.text || sourceText);
        } catch (error: any) {
            console.error('❌ AI rewrite error:', error);
            setAiError(error.response?.data?.error || 'AI временно недоступен, можно продолжить вручную');
        } finally {
            setAiLoadingStyle(null);
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
                conversation: activePartner
            });
        }
    };

    if (!hasPartner) {
        console.error('❌ ChatScreen: Missing partner parameter');
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.errorStateText}>Ошибка: неверные параметры чата</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            {/* Шапка чата */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={24} color={darkTheme.colors.primary} />
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

                <View style={styles.composerTools}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.aiActionsRow}
                    >
                        {AI_REWRITE_STYLES.map((style) => {
                            const isActive = aiLoadingStyle === style.key;

                            return (
                                <TouchableOpacity
                                    key={style.key}
                                    style={[styles.aiActionButton, isActive && styles.aiActionButtonActive]}
                                    onPress={() => rewriteMessageWithAI(style.key)}
                                    disabled={!!aiLoadingStyle || sending}
                                >
                                    {isActive ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.aiActionButtonText}>{style.label}</Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {!!aiError && (
                    <View style={styles.aiErrorBanner}>
                        <Text style={styles.aiErrorText}>{aiError}</Text>
                    </View>
                )}

                <View style={styles.inputContainer}>
                    {recording ? (
                        <View style={styles.recordingBar}>
                            <View style={styles.recordingInfo}>
                                <Text style={styles.recordingDot}>●</Text>
                                <Text style={styles.recordingText}>
                                    Запись {formatAudioDuration(recordingDurationMs)}
                                </Text>
                            </View>
                            <View style={styles.recordingActions}>
                                <TouchableOpacity
                                    style={styles.recordingCancelButton}
                                    onPress={() => stopVoiceRecording(false)}
                                    disabled={recordingLoading}
                                >
                                    <Text style={styles.recordingCancelText}>Отмена</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.recordingSendButton}
                                    onPress={() => stopVoiceRecording(true)}
                                    disabled={recordingLoading}
                                >
                                    {recordingLoading ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.recordingSendText}>Отправить</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <>
                            <TouchableOpacity
                                style={styles.attachButton}
                                onPress={sendImage}
                                disabled={uploadingImage || recordingLoading}
                            >
                                {uploadingImage ? (
                                    <ActivityIndicator size="small" color={darkTheme.colors.primary} />
                                ) : (
                                    <Ionicons name="image-outline" size={20} color={darkTheme.colors.text} />
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.attachButton}
                                onPress={startVoiceRecording}
                                disabled={recordingLoading || sending}
                            >
                                {recordingLoading ? (
                                    <ActivityIndicator size="small" color={darkTheme.colors.primary} />
                                ) : (
                                    <Ionicons name="mic-outline" size={20} color={darkTheme.colors.text} />
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
                                onChangeText={(value) => {
                                    setNewMessage(value);
                                    if (aiError) {
                                        setAiError('');
                                    }
                                }}
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
                                    <Ionicons name="send" size={18} color="#fff" />
                                )}
                            </TouchableOpacity>
                        </>
                    )}
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
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: darkTheme.colors.border,
    },
    backButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 6,
    },
    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10,
    },
    headerText: {
        flex: 1,
    },
    title: {
        color: darkTheme.colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    subtitle: {
        color: darkTheme.colors.textSecondary,
        fontSize: 11,
    },
    placeholder: {
        width: 36,
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
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 14 : 8,
        borderTopWidth: 1,
        borderTopColor: darkTheme.colors.border,
        backgroundColor: darkTheme.colors.background,
    },
    composerTools: {
        paddingTop: 4,
        paddingHorizontal: 8,
        backgroundColor: darkTheme.colors.background,
    },
    aiActionsRow: {
        gap: 8,
        paddingRight: 15,
    },
    aiActionButton: {
        backgroundColor: darkTheme.colors.card,
        borderWidth: 1,
        borderColor: darkTheme.colors.border,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        minHeight: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    aiActionButtonActive: {
        backgroundColor: darkTheme.colors.primary,
        borderColor: darkTheme.colors.primary,
    },
    aiActionButtonText: {
        color: darkTheme.colors.text,
        fontSize: 13,
        fontWeight: '600',
    },
    aiErrorBanner: {
        paddingHorizontal: 15,
        paddingTop: 8,
        backgroundColor: darkTheme.colors.background,
    },
    aiErrorText: {
        color: '#fca5a5',
        fontSize: 12,
    },
    attachButton: {
        marginRight: 6,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: darkTheme.colors.card,
        borderWidth: 1,
        borderColor: darkTheme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    messageInput: {
        flex: 1,
        backgroundColor: darkTheme.colors.card,
        color: darkTheme.colors.text,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 10 : 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: darkTheme.colors.border,
        fontSize: 15,
        maxHeight: 100,
    },
    sendButton: {
        backgroundColor: darkTheme.colors.primary,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    recordingBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: darkTheme.colors.card,
        borderWidth: 1,
        borderColor: darkTheme.colors.border,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    recordingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    recordingDot: {
        color: '#ef4444',
        fontSize: 14,
    },
    recordingText: {
        color: darkTheme.colors.text,
        fontSize: 14,
        fontWeight: '600',
    },
    recordingActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    recordingCancelButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    recordingCancelText: {
        color: darkTheme.colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    recordingSendButton: {
        backgroundColor: darkTheme.colors.primary,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 8,
        minWidth: 92,
        alignItems: 'center',
    },
    recordingSendText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    errorStateText: {
        color: '#fff',
        textAlign: 'center',
        marginTop: 20,
    },
});
