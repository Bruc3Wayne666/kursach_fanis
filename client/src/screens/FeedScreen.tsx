// src/screens/FeedScreen.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ
import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    RefreshControl
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchPosts, createPost, toggleLikeAction } from '../store/slices/postsSlice';
import { darkTheme } from '../themes/dark';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import { useNavigation, useIsFocused } from "@react-navigation/native";

export default function FeedScreen() {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const { posts, loading, error } = useSelector((state: any) => state.posts);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);

    // Инициализация posts как пустого массива если undefined/null
    const safePosts = posts || [];

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
    }, [isFocused]);

    // Polling для обновления ленты
    const startPolling = () => {
        if (pollingRef.current) return;

        console.log('🔄 Starting polling for feed...');
        loadPosts(); // Первая загрузка
        pollingRef.current = setInterval(() => {
            if (isMountedRef.current && !isModalVisible) { // 🔥 НЕ обновляем когда открыта модалка
                loadPosts();
            }
        }, 5000); // Каждые 5 секунд
    };

    const stopPolling = () => {
        if (pollingRef.current) {
            console.log('🛑 Stopping polling for feed...');
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    const loadPosts = () => {
        dispatch(fetchPosts() as any);
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadPosts();
        setTimeout(() => setRefreshing(false), 1000);
    };

    useEffect(() => {
        if (error) {
            Alert.alert('Ошибка', error);
        }
    }, [error]);

    const handleCreatePost = (title: string, content: string, image?: string) => {
        const postContent = title ? `${title}\n\n${content}` : content;

        console.log('📤 Создание поста:', {
            content: postContent,
            hasImage: !!image,
            image: image
        });

        dispatch(createPost({ content: postContent, image }) as any);

        // 🔥 Закрываем модалку сразу после отправки
        setIsModalVisible(false);

        // 🔥 Обновляем ленту через 2 секунды после создания поста
        setTimeout(() => {
            if (isMountedRef.current) {
                loadPosts();
            }
        }, 2000);
    };

    const handleLike = async (postId: string) => {
        try {
            // Добавь 'as any' вот сюда
            return await dispatch(toggleLikeAction(postId) as any).unwrap();
        } catch (err) {
            Alert.alert('Ошибка', 'Не удалось изменить лайк');
        }
    };

    const handleComment = (postId: string) => {
        navigation.navigate('Comments', { postId });
    };

    // 🔥 Останавливаем polling когда открыта модалка
    const handleOpenModal = () => {
        stopPolling(); // Останавливаем polling
        setIsModalVisible(true);
    };

    // 🔥 Возобновляем polling когда закрыта модалка
    const handleCloseModal = () => {
        setIsModalVisible(false);
        // Запускаем polling с небольшой задержкой
        setTimeout(() => {
            if (isMountedRef.current && isFocused) {
                startPolling();
            }
        }, 1000);
    };

    if (loading && safePosts.length === 0) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color={darkTheme.colors.primary} />
                <Text style={styles.loadingText}>Загрузка ленты...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Шапка БЕЗ КНОПКИ ВЫХОДА */}
            <View style={styles.header}>
                <Text style={styles.title}>Лента</Text>
                <View style={styles.headerButtons}>
                    <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={loadPosts}
                    >
                        <Text style={styles.refreshButtonText}>🔄</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.createButton}
                        onPress={handleOpenModal} // 🔥 Используем новую функцию
                    >
                        <Text style={styles.createButtonText}>+ Создать</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Список постов */}
            <FlatList
                data={safePosts} // Используем safePosts вместо posts
                renderItem={({ item }) => (
                    <PostCard
                        // post={{
                        //     id: item.id,
                        //     title: item.content?.split('\n')[0] || '',
                        //     content: item.content || '',
                        //     author: item.User?.name || item.User?.username || 'Аноним',
                        //     createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString('ru-RU') : 'Неизвестно',
                        //     likesCount: item.likesCount || 0,
                        //     commentsCount: item.commentsCount || 0,
                        //     image: item.image,
                        //     isLiked: item.isLiked || false
                        // }}
                        // onLike={handleLike}
                        // onComment={handleComment}
                        post={item}
                        onLike={() => handleLike(item.id)} // Упрощаем вызов
                        onPress={() => navigation.navigate('PostDetails', { postId: item.id })}
                        onComment={() => navigation.navigate('Comments', { postId: item.id })}
                    />
                )}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={darkTheme.colors.primary}
                        colors={[darkTheme.colors.primary]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Лента пуста</Text>
                        <Text style={styles.emptySubtext}>
                            Будьте первым, кто поделится чем-то интересным!
                        </Text>
                        <TouchableOpacity
                            style={styles.emptyButton}
                            onPress={handleOpenModal} // 🔥 Используем новую функцию
                        >
                            <Text style={styles.emptyButtonText}>Создать первый пост</Text>
                        </TouchableOpacity>
                    </View>
                }
                contentContainerStyle={safePosts.length === 0 ? { flex: 1 } : null}
            />

            {/* Модальное окно создания поста */}
            <CreatePostModal
                visible={isModalVisible}
                onClose={handleCloseModal} // 🔥 Используем новую функцию
                onSubmit={handleCreatePost}
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
        paddingTop: 10,
        borderBottomWidth: 1,
        borderBottomColor: darkTheme.colors.border,
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    title: {
        color: darkTheme.colors.text,
        fontSize: 24,
        fontWeight: 'bold',
    },
    refreshButton: {
        backgroundColor: darkTheme.colors.card,
        padding: 8,
        borderRadius: 20,
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    refreshButtonText: {
        color: darkTheme.colors.text,
        fontSize: 16,
    },
    createButton: {
        backgroundColor: darkTheme.colors.primary,
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: darkTheme.colors.background,
    },
    loadingText: {
        color: darkTheme.colors.textSecondary,
        marginTop: 10,
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
        textAlign: 'center',
    },
    emptySubtext: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    emptyButton: {
        backgroundColor: darkTheme.colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
    },
    emptyButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});
