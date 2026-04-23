import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Image,
    Alert,
    ActivityIndicator,
    ScrollView,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { launchImageLibrary } from 'react-native-image-picker';
import { darkTheme } from '../themes/dark';
import { api } from '../services/api';
import { API_FILE_URL } from "../utils/constants.ts";
import Avatar from '../components/Avatar';
import { getChats } from '../store/slices/messagesSlice';

export default function ConversationInfoScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const dispatch = useDispatch();
    const currentUser = useSelector((state: any) => state.auth.user);
    const { conversationId, conversation: routeConversation } = route.params as any;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [memberActionLoading, setMemberActionLoading] = useState<string | null>(null);
    const [friends, setFriends] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentConversation, setCurrentConversation] = useState<any>(routeConversation || null);
    const [form, setForm] = useState({
        name: routeConversation?.name || '',
        description: routeConversation?.description || '',
    });
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const accessLostHandledRef = useRef(false);

    const getAvatarUrl = (avatarPath: string | null) => {
        if (!avatarPath) return 'https://via.placeholder.com/100';
        if (avatarPath.startsWith('http')) return avatarPath;
        return `${API_FILE_URL}${avatarPath}`;
    };

    const isAdmin = useMemo(() => currentConversation?.Members?.some((member: any) =>
        String(member.id) === String(currentUser?.id) && member.ConversationMember?.role === 'admin'
    ), [currentConversation?.Members, currentUser?.id]);

    const handleConversationAccessLost = useCallback(() => {
        if (accessLostHandledRef.current) {
            return;
        }

        accessLostHandledRef.current = true;
        dispatch(getChats() as any);

        Alert.alert('Беседа обновлена', 'Вы больше не участник этой беседы', [
            {
                text: 'OK',
                onPress: () => navigation.goBack()
            }
        ]);
    }, [dispatch, navigation]);

    const loadConversation = useCallback(async (silent = false) => {
        try {
            if (!silent) {
                setLoading(true);
            }
            const response = await api.get(`/conversations/${conversationId}`);
            const conversation = response.data.conversation;
            setCurrentConversation(conversation);
            setForm((prev) => silent && isAdmin ? prev : {
                name: conversation?.name || '',
                description: conversation?.description || '',
            });
        } catch (error: any) {
            console.error('Load conversation error:', error);

            if (error.response?.status === 403 || error.response?.status === 404) {
                handleConversationAccessLost();
                return;
            }

            if (!silent) {
                Alert.alert('Ошибка', error.response?.data?.error || 'Не удалось загрузить беседу');
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, [conversationId, handleConversationAccessLost, isAdmin]);

    const loadFriends = useCallback(async () => {
        try {
            const response = await api.get('/friends');
            setFriends(response.data.friends || []);
        } catch (error) {
            console.error('Load friends for conversation error:', error);
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

        pollingRef.current = setInterval(() => {
            loadConversation(true);
        }, 4000);
    }, [isFocused, loadConversation]);

    useEffect(() => {
        accessLostHandledRef.current = false;

        if (isFocused) {
            loadConversation();
            loadFriends();
            startPolling();
        } else {
            stopPolling();
        }

        return () => {
            stopPolling();
        };
    }, [isFocused, loadConversation, loadFriends, startPolling, stopPolling]);

    const availableFriends = useMemo(() => {
        const memberIds = new Set((currentConversation?.Members || []).map((member: any) => String(member.id)));

        return friends.filter((friend) => {
            const matchesSearch = !searchQuery.trim()
                || friend.name?.toLowerCase().includes(searchQuery.toLowerCase())
                || friend.username?.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesSearch && !memberIds.has(String(friend.id));
        });
    }, [currentConversation?.Members, friends, searchQuery]);

    const changeConversationAvatar = async () => {
        if (!isAdmin) {
            Alert.alert('Ошибка', 'Только администратор может менять аватар беседы');
            return;
        }

        try {
            setUploadingAvatar(true);
            const result = await launchImageLibrary({
                mediaType: 'photo',
                quality: 0.8,
                maxWidth: 500,
                maxHeight: 500,
            });

            if (!result.assets?.[0]) {
                return;
            }

            const selectedImage = result.assets[0];
            const uploadFormData = new FormData();
            uploadFormData.append('image', {
                uri: selectedImage.uri,
                type: selectedImage.type || 'image/jpeg',
                name: 'conversation-avatar.jpg'
            } as any);

            const uploadResponse = await api.post('/upload', uploadFormData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const updateResponse = await api.put(`/conversations/${conversationId}`, {
                avatar: uploadResponse.data.url
            });

            setCurrentConversation(updateResponse.data.conversation);
            dispatch(getChats() as any);
            Alert.alert('Успех', 'Аватар беседы обновлен');
        } catch (error) {
            console.error('Conversation avatar change error:', error);
            Alert.alert('Ошибка', 'Не удалось изменить аватар беседы');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const saveConversation = async () => {
        if (!isAdmin) {
            return;
        }

        if (!form.name.trim()) {
            Alert.alert('Ошибка', 'Введите название беседы');
            return;
        }

        try {
            setSaving(true);
            const response = await api.put(`/conversations/${conversationId}`, {
                name: form.name,
                description: form.description,
            });
            setCurrentConversation(response.data.conversation);
            dispatch(getChats() as any);
            Alert.alert('Успех', 'Беседа обновлена');
        } catch (error: any) {
            console.error('Save conversation error:', error);
            Alert.alert('Ошибка', error.response?.data?.error || 'Не удалось сохранить изменения');
        } finally {
            setSaving(false);
        }
    };

    const addMember = async (memberId: string) => {
        try {
            setMemberActionLoading(memberId);
            const response = await api.post(`/conversations/${conversationId}/members`, {
                memberIds: [memberId],
            });
            setCurrentConversation(response.data.conversation);
            dispatch(getChats() as any);
        } catch (error: any) {
            console.error('Add member error:', error);
            Alert.alert('Ошибка', error.response?.data?.error || 'Не удалось добавить участника');
        } finally {
            setMemberActionLoading(null);
        }
    };

    const removeMember = async (memberId: string, memberName: string) => {
        Alert.alert(
            'Удалить участника',
            `Удалить ${memberName} из беседы?`,
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setMemberActionLoading(memberId);
                            const response = await api.delete(`/conversations/${conversationId}/members/${memberId}`);
                            setCurrentConversation(response.data.conversation);
                            dispatch(getChats() as any);
                        } catch (error: any) {
                            console.error('Remove member error:', error);
                            Alert.alert('Ошибка', error.response?.data?.error || 'Не удалось удалить участника');
                        } finally {
                            setMemberActionLoading(null);
                        }
                    }
                }
            ]
        );
    };

    const handleLeaveConversation = () => {
        Alert.alert(
            'Покинуть беседу',
            'Вы уверены что хотите покинуть беседу?',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Покинуть',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLeaving(true);
                            await api.delete(`/conversations/${conversationId}/leave`);
                            dispatch(getChats() as any);
                            Alert.alert('Успех', 'Вы покинули беседу', [
                                {
                                    text: 'OK',
                                    onPress: () => {
                                        navigation.goBack();
                                        navigation.goBack();
                                    }
                                }
                            ]);
                        } catch (error: any) {
                            console.error('Leave conversation error:', error);
                            Alert.alert('Ошибка', error.response?.data?.error || 'Не удалось покинуть беседу');
                        } finally {
                            setLeaving(false);
                        }
                    }
                }
            ]
        );
    };

    const renderMemberItem = ({ item }: { item: any }) => {
        const isCurrentUser = String(item.id) === String(currentUser?.id);
        const roleLabel = item.ConversationMember?.role === 'admin' ? '👑 Админ' : '👤 Участник';

        return (
            <View style={styles.memberItem}>
                <Avatar
                    avatar={item.avatar}
                    name={item.name}
                    username={item.username}
                    size={40}
                    style={styles.memberAvatar}
                />
                <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{item.name}</Text>
                    <Text style={styles.memberUsername}>@{item.username}</Text>
                    <Text style={styles.memberRole}>{roleLabel}</Text>
                </View>
                {isCurrentUser ? (
                    <Text style={styles.youBadge}>Вы</Text>
                ) : isAdmin ? (
                    <TouchableOpacity
                        style={styles.memberRemoveButton}
                        onPress={() => removeMember(item.id, item.name)}
                        disabled={memberActionLoading === item.id}
                    >
                        {memberActionLoading === item.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.memberRemoveButtonText}>Удалить</Text>
                        )}
                    </TouchableOpacity>
                ) : null}
            </View>
        );
    };

    const renderAvailableFriend = ({ item }: { item: any }) => (
        <View style={styles.memberItem}>
            <Avatar
                avatar={item.avatar}
                name={item.name}
                username={item.username}
                size={40}
                style={styles.memberAvatar}
            />
            <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.name}</Text>
                <Text style={styles.memberUsername}>@{item.username}</Text>
            </View>
            <TouchableOpacity
                style={styles.addMemberButton}
                onPress={() => addMember(item.id)}
                disabled={memberActionLoading === item.id}
            >
                {memberActionLoading === item.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Text style={styles.addMemberButtonText}>Добавить</Text>
                )}
            </TouchableOpacity>
        </View>
    );

    if (loading && !currentConversation) {
        return (
            <SafeAreaView style={styles.centerContainer} edges={['left', 'right', 'bottom']}>
                <ActivityIndicator size="large" color={darkTheme.colors.primary} />
                <Text style={styles.loadingText}>Загрузка беседы...</Text>
            </SafeAreaView>
        );
    }

    if (!currentConversation) {
        return (
            <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
                <Text style={styles.errorText}>Беседа не найдена</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>← Назад</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Информация о беседе</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
                <View style={styles.avatarSection}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={{ uri: getAvatarUrl(currentConversation.avatar) }}
                            style={styles.conversationAvatar}
                            defaultSource={{ uri: 'https://via.placeholder.com/100' }}
                        />
                        {isAdmin && (
                            <TouchableOpacity
                                style={styles.changeAvatarButton}
                                onPress={changeConversationAvatar}
                                disabled={uploadingAvatar}
                            >
                                {uploadingAvatar ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.changeAvatarIcon}>📷</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={styles.card}>
                    {isAdmin ? (
                        <>
                            <Text style={styles.sectionTitle}>Настройки беседы</Text>
                            <TextInput
                                style={styles.input}
                                value={form.name}
                                onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
                                placeholder="Название беседы"
                                placeholderTextColor={darkTheme.colors.textSecondary}
                            />
                            <TextInput
                                style={[styles.input, styles.descriptionInput]}
                                value={form.description}
                                onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
                                placeholder="Описание беседы"
                                placeholderTextColor={darkTheme.colors.textSecondary}
                                multiline
                            />
                            <TouchableOpacity
                                style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
                                onPress={saveConversation}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>Сохранить изменения</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={styles.conversationName}>{currentConversation.name}</Text>
                            <Text style={styles.conversationDescription}>
                                {currentConversation.description || 'Описание отсутствует'}
                            </Text>
                        </>
                    )}

                    <Text style={styles.metaText}>Участников: {currentConversation.Members?.length || 0}</Text>
                    <Text style={styles.metaText}>
                        Создана: {new Date(currentConversation.createdAt).toLocaleDateString('ru-RU')}
                    </Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Участники</Text>
                    <FlatList
                        data={currentConversation.Members || []}
                        renderItem={renderMemberItem}
                        keyExtractor={(item) => item.id}
                        scrollEnabled={false}
                    />
                </View>

                {isAdmin && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Добавить участников</Text>
                        <TextInput
                            style={styles.input}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Поиск по друзьям"
                            placeholderTextColor={darkTheme.colors.textSecondary}
                        />
                        <FlatList
                            data={availableFriends}
                            renderItem={renderAvailableFriend}
                            keyExtractor={(item) => item.id}
                            scrollEnabled={false}
                            ListEmptyComponent={
                                <Text style={styles.emptyTextSmall}>Нет друзей для добавления</Text>
                            }
                        />
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.leaveButton, leaving && styles.leaveButtonDisabled]}
                    onPress={handleLeaveConversation}
                    disabled={leaving}
                >
                    {leaving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.leaveButtonText}>Покинуть беседу</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: darkTheme.colors.background,
    },
    centerContainer: {
        flex: 1,
        backgroundColor: darkTheme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: darkTheme.colors.textSecondary,
        marginTop: 10,
        fontSize: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: darkTheme.colors.border,
    },
    backButton: {
        color: darkTheme.colors.primary,
        fontSize: 16,
    },
    title: {
        color: darkTheme.colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    placeholder: {
        width: 48,
    },
    content: {
        flex: 1,
    },
    contentInner: {
        padding: 12,
        paddingBottom: 24,
        gap: 15,
    },
    errorText: {
        color: darkTheme.colors.text,
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
    },
    avatarSection: {
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
    },
    conversationAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: darkTheme.colors.card,
    },
    changeAvatarButton: {
        position: 'absolute',
        right: -4,
        bottom: -4,
        backgroundColor: darkTheme.colors.primary,
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: darkTheme.colors.background,
    },
    changeAvatarIcon: {
        fontSize: 18,
        color: '#fff',
    },
    card: {
        backgroundColor: darkTheme.colors.card,
        borderRadius: 12,
        padding: 14,
    },
    sectionTitle: {
        color: darkTheme.colors.text,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
    },
    conversationName: {
        color: darkTheme.colors.text,
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
    },
    conversationDescription: {
        color: darkTheme.colors.textSecondary,
        fontSize: 15,
        lineHeight: 20,
        marginBottom: 12,
    },
    metaText: {
        color: darkTheme.colors.textSecondary,
        fontSize: 13,
        marginTop: 4,
    },
    input: {
        backgroundColor: darkTheme.colors.background,
        color: darkTheme.colors.text,
        borderWidth: 1,
        borderColor: darkTheme.colors.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        marginBottom: 12,
    },
    descriptionInput: {
        minHeight: 92,
        textAlignVertical: 'top',
    },
    primaryButton: {
        backgroundColor: darkTheme.colors.primary,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    primaryButtonDisabled: {
        opacity: 0.7,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: darkTheme.colors.border,
    },
    memberAvatar: {
        marginRight: 12,
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        color: darkTheme.colors.text,
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    memberUsername: {
        color: darkTheme.colors.textSecondary,
        fontSize: 13,
        marginBottom: 2,
    },
    memberRole: {
        color: darkTheme.colors.primary,
        fontSize: 12,
    },
    youBadge: {
        color: darkTheme.colors.primary,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        fontSize: 12,
        fontWeight: '700',
    },
    memberRemoveButton: {
        backgroundColor: '#ef4444',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 78,
        alignItems: 'center',
    },
    memberRemoveButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    addMemberButton: {
        backgroundColor: darkTheme.colors.primary,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 88,
        alignItems: 'center',
    },
    addMemberButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    leaveButton: {
        backgroundColor: '#ef4444',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    leaveButtonDisabled: {
        opacity: 0.7,
    },
    leaveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    emptyTextSmall: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        paddingVertical: 8,
    },
});
