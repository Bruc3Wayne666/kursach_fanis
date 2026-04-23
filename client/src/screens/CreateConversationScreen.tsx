// src/screens/CreateConversationScreen.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Alert,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux'; // 🔥 ДОБАВЛЯЕМ useDispatch
import { useNavigation } from '@react-navigation/native';
import { darkTheme } from '../themes/dark';
import { api } from '../services/api';
import { getChats } from '../store/slices/messagesSlice'; // 🔥 ДОБАВЛЯЕМ ИМПОРТ
import Avatar from '../components/Avatar';

interface User {
    id: string;
    name: string;
    username: string;
    avatar?: string;
    isOnline: boolean;
}

export default function CreateConversationScreen() {
    const [conversationName, setConversationName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [friends, setFriends] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const navigation = useNavigation();
    const dispatch = useDispatch(); // 🔥 ДОБАВЛЯЕМ DISPATCH
    const currentUser = useSelector((state: any) => state.auth.user);

    useEffect(() => {
        loadFriends();
    }, []);

    const loadFriends = async () => {
        try {
            const response = await api.get('/friends');
            setFriends(response.data.friends);
        } catch (error) {
            console.error('Error loading friends:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить список друзей');
        }
    };

    const toggleUserSelection = (user: User) => {
        const isSelected = selectedUsers.some(u => u.id === user.id);
        if (isSelected) {
            setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
        } else {
            setSelectedUsers(prev => [...prev, user]);
        }
    };

    // src/screens/CreateConversationScreen.tsx - ПОЛНОСТЬЮ НОВАЯ ВЕРСИЯ
    // В CreateConversationScreen.tsx - УБЕДИСЬ ЧТО НЕТ ОБРАБОТКИ ОШИБКИ existingConversationId
    const createConversation = async () => {
        if (selectedUsers.length < 1) {
            Alert.alert('Ошибка', 'Выберите хотя бы 1 участника для беседы');
            return;
        }

        if (!conversationName.trim()) {
            Alert.alert('Ошибка', 'Введите название беседы');
            return;
        }

        setLoading(true);
        try {
            const memberIds = selectedUsers.map(user => user.id);

            console.log('🔄 Creating NEW conversation with:', {
                name: conversationName,
                members: selectedUsers.length,
                memberIds
            });

            const response = await api.post('/conversations', {
                name: conversationName,
                memberIds,
                description: `Беседа создана ${currentUser.name}`
            });

            console.log('✅ NEW conversation created:', response.data.conversation.id);

            // Очищаем форму
            setConversationName('');
            setSelectedUsers([]);

            Alert.alert('Успех', 'Новая беседа создана!');

            // Обновляем список чатов
            await dispatch(getChats() as any);

            // 🔥 ВСЕГДА ПЕРЕХОДИМ К НОВОЙ БЕСЕДЕ
            navigation.navigate('Chat', {
                chatId: response.data.conversation.id,
                partner: response.data.conversation,
                chatType: 'group'
            });

        } catch (error: any) {
            console.error('❌ Create NEW conversation error:', error);

            // 🔥 УБИРАЕМ ОБРАБОТКУ existingConversationId
            const errorMessage = error.response?.data?.error || 'Не удалось создать беседу';
            Alert.alert('Ошибка', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const filteredFriends = friends.filter(friend =>
        friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        friend.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderUserItem = ({ item }: { item: User }) => {
        const isSelected = selectedUsers.some(u => u.id === item.id);

        return (
            <TouchableOpacity
                style={[styles.userItem, isSelected && styles.selectedUserItem]}
                onPress={() => toggleUserSelection(item)}
            >
                <Avatar
                    avatar={item.avatar}
                    name={item.name}
                    username={item.username}
                    size={40}
                    style={styles.avatar}
                />
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userUsername}>@{item.username}</Text>
                </View>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>← Назад</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Новая беседа</Text>
                <TouchableOpacity onPress={createConversation} disabled={loading || selectedUsers.length < 1}>
                    {loading ? (
                        <ActivityIndicator size="small" color={darkTheme.colors.primary} />
                    ) : (
                        <Text style={[styles.createButton, selectedUsers.length < 1 && styles.createButtonDisabled]}>
                            Создать
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.form}>
                <TextInput
                    style={styles.input}
                    placeholder="Название беседы..."
                    placeholderTextColor={darkTheme.colors.textSecondary}
                    value={conversationName}
                    onChangeText={setConversationName}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Поиск друзей..."
                    placeholderTextColor={darkTheme.colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />

                <View style={styles.selectedUsers}>
                    <Text style={styles.sectionTitle}>Выбранные участники: {selectedUsers.length}</Text>
                    {selectedUsers.length > 0 && (
                        <View style={styles.selectedUsersList}>
                            {selectedUsers.map(user => (
                                <View key={user.id} style={styles.selectedUserTag}>
                                    <Text style={styles.selectedUserText}>{user.name}</Text>
                                    <TouchableOpacity onPress={() => toggleUserSelection(user)}>
                                        <Text style={styles.removeUserText}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                <Text style={styles.sectionTitle}>Друзья ({filteredFriends.length})</Text>

                <FlatList
                    data={filteredFriends}
                    renderItem={renderUserItem}
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Нет друзей для добавления</Text>
                        </View>
                    }
                />
            </View>
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
    createButton: {
        color: darkTheme.colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    createButtonDisabled: {
        opacity: 0.5,
    },
    form: {
        flex: 1,
        padding: 12,
    },
    input: {
        backgroundColor: darkTheme.colors.card,
        color: darkTheme.colors.text,
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: darkTheme.colors.border,
        fontSize: 16,
    },
    selectedUsers: {
        marginBottom: 20,
    },
    sectionTitle: {
        color: darkTheme.colors.text,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 10,
    },
    selectedUsersList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    selectedUserTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: darkTheme.colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    selectedUserText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    removeUserText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: darkTheme.colors.border,
    },
    selectedUserItem: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
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
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: darkTheme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxSelected: {
        backgroundColor: darkTheme.colors.primary,
        borderColor: darkTheme.colors.primary,
    },
    checkmark: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
    },
});
