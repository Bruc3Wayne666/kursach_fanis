// src/screens/FriendRequestsScreen.tsx
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
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { darkTheme } from '../themes/dark';
import { api } from '../services/api';
import Avatar from '../components/Avatar';

export default function FriendRequestsScreen() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);

    const loadRequests = useCallback(async (showLoader = true) => {
        try {
            if (showLoader) {
                setLoading(true);
            }
            console.log('🔄 Loading friend requests...');
            const response = await api.get('/friends/requests');
            console.log('✅ Requests loaded:', response.data.requests.length);
            setRequests(response.data.requests || []);
        } catch (error: any) {
            console.error('❌ Error loading friend requests:', error);

            let errorMessage = 'Не удалось загрузить запросы в друзья';
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

        loadRequests(false);
        pollingRef.current = setInterval(() => {
            if (isMountedRef.current && isFocused) {
                loadRequests(false);
            }
        }, 5000);
    }, [isFocused, loadRequests]);

    useEffect(() => {
        isMountedRef.current = true;

        if (isFocused) {
            loadRequests();
            startPolling();
        } else {
            stopPolling();
        }

        return () => {
            isMountedRef.current = false;
            stopPolling();
        };
    }, [isFocused, loadRequests, startPolling, stopPolling]);

    const onRefresh = () => {
        setRefreshing(true);
        loadRequests(false);
    };

    const acceptRequest = async (requestId: string, userName: string) => {
        try {
            await api.put(`/friends/${requestId}/accept`);
            // Удаляем из локального списка
            setRequests(prev => prev.filter(req => req.id !== requestId));
            Alert.alert('Успех', `Вы приняли запрос от ${userName}`);
        } catch (error) {
            console.error('Accept request error:', error);
            Alert.alert('Ошибка', 'Не удалось принять запрос');
        }
    };

    const rejectRequest = async (requestId: string, userName: string) => {
        Alert.alert(
            'Отклонить запрос',
            `Вы уверены что хотите отклонить запрос от ${userName}?`,
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Отклонить',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.put(`/friends/${requestId}/reject`);
                            setRequests(prev => prev.filter(req => req.id !== requestId));
                            Alert.alert('Успех', 'Запрос отклонен');
                        } catch (error) {
                            console.error('Reject request error:', error);
                            Alert.alert('Ошибка', 'Не удалось отклонить запрос');
                        }
                    }
                }
            ]
        );
    };

    const viewProfile = (user: any) => {
        navigation.navigate('UserProfile', { userId: user.id });
    };

    const renderRequestItem = ({ item }: { item: any }) => (
        <View style={styles.requestItem}>
            <TouchableOpacity
                style={styles.userInfo}
                onPress={() => viewProfile(item.User)}
            >
                <Avatar
                    avatar={item.User?.avatar}
                    name={item.User?.name}
                    username={item.User?.username}
                    size={50}
                    style={styles.avatar}
                />
                <View style={styles.userDetails}>
                    <Text style={styles.userName}>{item.User?.name}</Text>
                    <Text style={styles.userUsername}>@{item.User?.username}</Text>
                    <Text style={styles.requestText}>хочет добавить вас в друзья</Text>
                </View>
            </TouchableOpacity>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => acceptRequest(item.id, item.User?.name)}
                >
                    <Text style={styles.acceptButtonText}>✓ Принять</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => rejectRequest(item.id, item.User?.name)}
                >
                    <Text style={styles.rejectButtonText}>✕</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color={darkTheme.colors.primary} />
                <Text style={styles.loadingText}>Загрузка запросов...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>← Назад</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Запросы в друзья</Text>
                <View style={styles.placeholder} />
            </View>

            <FlatList
                data={requests}
                renderItem={renderRequestItem}
                keyExtractor={item => item.id}
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
                        <Text style={styles.emptyText}>Нет запросов в друзья</Text>
                        <Text style={styles.emptySubtext}>
                            Когда вам пришлют запрос в друзья, он появится здесь
                        </Text>
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
    requestItem: {
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
    requestText: {
        color: darkTheme.colors.textSecondary,
        fontSize: 12,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    acceptButton: {
        backgroundColor: darkTheme.colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
    },
    acceptButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    rejectButton: {
        backgroundColor: '#ef4444',
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rejectButtonText: {
        color: '#fff',
        fontSize: 12,
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
        lineHeight: 20,
    },
});
