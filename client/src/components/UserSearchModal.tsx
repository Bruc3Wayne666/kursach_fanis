// src/components/UserSearchModal.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Modal,
    Alert,
    SafeAreaView
} from 'react-native';
import { useSelector } from 'react-redux';
import { darkTheme } from '../themes/dark';
import { api } from '../services/api';
import Avatar from './Avatar';

interface User {
    id: string;
    name: string;
    username: string;
    avatar?: string;
    isOnline: boolean;
}

interface UserSearchModalProps {
    visible: boolean;
    onClose: () => void;
    onUserSelect: (user: User) => void;
}

export default function UserSearchModal({ visible, onClose, onUserSelect }: UserSearchModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const currentUser = useSelector((state: any) => state.auth.user);

    const searchUsers = useCallback(async () => {
        if (searchQuery.length < 2) return;

        setLoading(true);
        try {
            const response = await api.get(`/users/search?query=${encodeURIComponent(searchQuery)}`);
            // Исключаем текущего пользователя из результатов
            const filteredUsers = response.data.users.filter((user: User) => user.id !== currentUser.id);
            setUsers(filteredUsers);
        } catch (error) {
            console.error('Error searching users:', error);
            Alert.alert('Ошибка', 'Не удалось выполнить поиск');
        } finally {
            setLoading(false);
        }
    }, [currentUser.id, searchQuery]);

    useEffect(() => {
        if (visible && searchQuery.length >= 2) {
            searchUsers();
        } else {
            setUsers([]);
        }
    }, [searchQuery, searchUsers, visible]);

    const handleUserSelect = (user: User) => {
        onUserSelect(user);
        onClose();
        setSearchQuery('');
        setUsers([]);
    };

    const renderUserItem = ({ item }: { item: User }) => (
        <TouchableOpacity
            style={styles.userItem}
            onPress={() => handleUserSelect(item)}
        >
            <View style={styles.avatarContainer}>
                <Avatar
                    avatar={item.avatar}
                    name={item.name}
                    username={item.username}
                    size={40}
                    style={styles.avatar}
                    textStyle={styles.avatarText}
                />
                {item.isOnline && <View style={styles.onlineDot} />}
            </View>

            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userUsername}>@{item.username}</Text>
            </View>

            <Text style={styles.startChatText}>💬</Text>
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                {/* Шапка */}
                <View style={styles.header}>
                    <Text style={styles.title}>Новый чат</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.closeButton}>✕</Text>
                    </TouchableOpacity>
                </View>

                {/* Поиск */}
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Введите имя или username..."
                        placeholderTextColor={darkTheme.colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                    />
                    {loading && (
                        <ActivityIndicator size="small" color={darkTheme.colors.primary} />
                    )}
                </View>

                {/* Результаты поиска */}
                <FlatList
                    data={users}
                    renderItem={renderUserItem}
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            {searchQuery.length >= 2 ? (
                                <>
                                    <Text style={styles.emptyText}>Пользователи не найдены</Text>
                                    <Text style={styles.emptySubtext}>
                                        Попробуйте изменить запрос поиска
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.emptyText}>Найдите пользователя</Text>
                                    <Text style={styles.emptySubtext}>
                                        Введите имя или username для начала чата
                                    </Text>
                                </>
                            )}
                        </View>
                    }
                />
            </SafeAreaView>
        </Modal>
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
    title: {
        color: darkTheme.colors.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        color: darkTheme.colors.text,
        fontSize: 24,
        fontWeight: 'bold',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
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
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: darkTheme.colors.border,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: darkTheme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#10b981',
        borderWidth: 2,
        borderColor: darkTheme.colors.background,
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
    startChatText: {
        fontSize: 20,
        opacity: 0.7,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        color: darkTheme.colors.text,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtext: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
    },
});
