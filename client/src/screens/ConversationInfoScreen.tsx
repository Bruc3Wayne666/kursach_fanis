// src/screens/ConversationInfoScreen.tsx - ПОЛНАЯ ВЕРСИЯ С ВЫХОДОМ ИЗ БЕСЕДЫ
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Image,
    Alert,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { launchImageLibrary } from 'react-native-image-picker';
import { darkTheme } from '../themes/dark';
import { api } from '../services/api';
import { leaveConversation } from '../../store/slices/conversationsSlice';
import {API_BASE_URL, API_FILE_URL} from "../utils/constants.ts";

export default function ConversationInfoScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const currentUser = useSelector((state: any) => state.auth.user);
    const { conversationId, conversation } = route.params as any;
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [currentConversation, setCurrentConversation] = useState(conversation);

    // Функция для получения URL аватара
    const getAvatarUrl = (avatarPath: string | null) => {
        if (!avatarPath) return 'https://via.placeholder.com/100';
        if (avatarPath.startsWith('http')) return avatarPath;
        // return `http://192.168.0.116:5000${avatarPath}`;
        return `${API_FILE_URL}${avatarPath}`;
    };

    // Проверяем является ли пользователь админом
    const isAdmin = currentConversation.Members?.some((member: any) =>
        member.id === currentUser.id && member.ConversationMember?.role === 'admin'
    );

    // 🔥 ФУНКЦИЯ ДЛЯ СМЕНЫ АВАТАРА БЕСЕДЫ
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

            if (result.assets && result.assets[0]) {
                const selectedImage = result.assets[0];
                console.log('📸 Selected conversation avatar:', selectedImage.uri);

                const uploadFormData = new FormData();
                uploadFormData.append('image', {
                    uri: selectedImage.uri,
                    type: selectedImage.type || 'image/jpeg',
                    name: 'conversation-avatar.jpg'
                } as any);

                const uploadResponse = await api.post('/upload', uploadFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });

                console.log('✅ Conversation avatar uploaded:', uploadResponse.data.url);

                // Обновляем аватар на сервере
                await api.put(`/conversations/${conversationId}`, {
                    avatar: uploadResponse.data.url
                });

                // Обновляем локальное состояние
                setCurrentConversation({
                    ...currentConversation,
                    avatar: uploadResponse.data.url
                });

                Alert.alert('Успех', 'Аватар беседы обновлен');
            }
        } catch (error) {
            console.error('❌ Conversation avatar change error:', error);
            Alert.alert('Ошибка', 'Не удалось изменить аватар беседы');
        } finally {
            setUploadingAvatar(false);
        }
    };

    // ConversationInfoScreen.tsx - ИСПРАВЛЯЕМ НАВИГАЦИЮ
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
                            console.log('🚪 Leaving conversation:', conversationId);

                            const response = await api.delete(`/conversations/${conversationId}/leave`);
                            console.log('✅ Leave success:', response.data);

                            Alert.alert('Успех', 'Вы покинули беседу', [
                                {
                                    text: 'OK',
                                    onPress: () => {
                                        // 🔥 ИСПРАВЛЯЕМ НАВИГАЦИЮ
                                        navigation.goBack(); // Сначала назад с экрана информации
                                        navigation.goBack(); // Потом назад с экрана чата (если нужно)
                                        // ИЛИ если есть вкладка с чатами:
                                        // navigation.navigate('Main', { screen: 'Chats' });
                                    }
                                }
                            ]);

                        } catch (error: any) {
                            console.error('❌ Leave error:', error.response?.data);
                            Alert.alert('Ошибка', error.response?.data?.error || 'Не удалось покинуть беседу');
                        } finally {
                            setLeaving(false);
                        }
                    }
                }
            ]
        );
    };

    const renderMemberItem = ({ item }: { item: any }) => (
        <View style={styles.memberItem}>
            <Image
                source={{ uri: getAvatarUrl(item.avatar) }}
                style={styles.avatar}
                defaultSource={{ uri: 'https://via.placeholder.com/50' }}
            />
            <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.name}</Text>
                <Text style={styles.memberUsername}>@{item.username}</Text>
                <Text style={styles.memberRole}>
                    {item.ConversationMember?.role === 'admin' ? '👑 Админ' : '👤 Участник'}
                </Text>
            </View>
            {item.id === currentUser.id && (
                <Text style={styles.youBadge}>Вы</Text>
            )}
        </View>
    );

    if (!currentConversation) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.errorText}>Беседа не найдена</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Шапка */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>← Назад</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Информация о беседе</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content}>
                {/* Аватар беседы с возможностью изменения */}
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
                    {isAdmin && (
                        <Text style={styles.changeAvatarHint}>
                            Нажмите на камеру чтобы изменить аватар
                        </Text>
                    )}
                </View>

                {/* Информация о беседе */}
                <View style={styles.conversationInfo}>
                    <Text style={styles.conversationName}>{currentConversation.name}</Text>
                    <Text style={styles.conversationDescription}>
                        {currentConversation.description || 'Описание отсутствует'}
                    </Text>
                    <Text style={styles.membersCount}>
                        👥 Участников: {currentConversation.Members?.length || 0}
                    </Text>
                    <Text style={styles.createdInfo}>
                        Создана: {new Date(currentConversation.createdAt).toLocaleDateString('ru-RU')}
                    </Text>
                </View>

                {/* Список участников */}
                <View style={styles.membersSection}>
                    <Text style={styles.sectionTitle}>Участники</Text>
                    <FlatList
                        data={currentConversation.Members || []}
                        renderItem={renderMemberItem}
                        keyExtractor={item => item.id}
                        scrollEnabled={false}
                        showsVerticalScrollIndicator={false}
                    />
                </View>

                {/* Действия */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.leaveButton, leaving && styles.leaveButtonDisabled]}
                        onPress={handleLeaveConversation}
                        disabled={leaving}
                    >
                        {leaving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.leaveButtonText}>🚪 Покинуть беседу</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
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
    content: {
        flex: 1,
    },
    errorText: {
        color: darkTheme.colors.text,
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
    },
    avatarSection: {
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: darkTheme.colors.border,
    },
    avatarContainer: {
        position: 'relative',
        alignItems: 'center',
    },
    conversationAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 10,
    },
    changeAvatarButton: {
        position: 'absolute',
        bottom: 5,
        right: -5,
        backgroundColor: darkTheme.colors.primary,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: darkTheme.colors.background,
    },
    changeAvatarIcon: {
        fontSize: 18,
        color: '#fff',
    },
    changeAvatarHint: {
        color: darkTheme.colors.textSecondary,
        fontSize: 12,
        marginTop: 5,
        textAlign: 'center',
    },
    conversationInfo: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: darkTheme.colors.border,
    },
    conversationName: {
        color: darkTheme.colors.text,
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    conversationDescription: {
        color: darkTheme.colors.textSecondary,
        fontSize: 16,
        marginBottom: 12,
        lineHeight: 20,
    },
    membersCount: {
        color: darkTheme.colors.primary,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    createdInfo: {
        color: darkTheme.colors.textSecondary,
        fontSize: 12,
    },
    membersSection: {
        padding: 15,
    },
    sectionTitle: {
        color: darkTheme.colors.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: darkTheme.colors.card,
        borderRadius: 8,
        marginBottom: 8,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        color: darkTheme.colors.text,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    memberUsername: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        marginBottom: 2,
    },
    memberRole: {
        color: darkTheme.colors.primary,
        fontSize: 12,
    },
    youBadge: {
        color: darkTheme.colors.primary,
        fontSize: 12,
        fontWeight: '600',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    actions: {
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: darkTheme.colors.border,
    },
    leaveButton: {
        backgroundColor: '#ef4444',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    leaveButtonDisabled: {
        backgroundColor: '#9ca3af',
        opacity: 0.7,
    },
    leaveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
