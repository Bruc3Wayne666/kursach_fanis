import React, { useEffect, useState } from 'react';
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
import { logout } from '../store/slices/authSlice';
import {fetchPosts, createPost, unlikePost, likePost, toggleLike} from '../store/slices/postsSlice';
import { darkTheme } from '../themes/dark';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import {useNavigation} from "@react-navigation/core";

export default function FeedScreen() {
    const dispatch = useDispatch();
    const { posts, loading, error } = useSelector((state: any) => state.posts);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const navigation = useNavigation();

    useEffect(() => {
        loadPosts();
    }, [dispatch]);

    useEffect(() => {
        if (error) {
            Alert.alert('Ошибка', error);
        }
    }, [error]);

    const loadPosts = () => {
        dispatch(fetchPosts() as any);
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadPosts();
        setTimeout(() => setRefreshing(false), 1000);
    };

    const handleLogout = () => {
        dispatch(logout());
    };

    const handleCreatePost = (title: string, content: string, image?: string) => {
        const postContent = title ? `${title}\n\n${content}` : content;

        console.log('📤 Создание поста:', {
            content: postContent,
            hasImage: !!image,
            image: image
        });

        dispatch(createPost({ content: postContent, image }) as any);
        setIsModalVisible(false);
    };


    const handleLike = (postId: string, isCurrentlyLiked: boolean) => {
        // Сначала мгновенно обновляем UI
        dispatch(toggleLike(postId));

        // Потом отправляем запрос на сервер
        if (isCurrentlyLiked) {
            dispatch(unlikePost(postId) as any);
        } else {
            dispatch(likePost(postId) as any);
        }
    };

    const handleComment = (postId: string) => {
        navigation.navigate('Comments', { postId });
    };

    if (loading && posts.length === 0) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color={darkTheme.colors.primary} />
                <Text style={styles.loadingText}>Загрузка ленты...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Шапка */}
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
                        onPress={() => setIsModalVisible(true)}
                    >
                        <Text style={styles.createButtonText}>+ Создать</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Список постов */}
            <FlatList
                data={posts}
                renderItem={({ item }) => (
                    <PostCard
                        post={{
                            id: item.id,
                            title: item.content.split('\n')[0],
                            content: item.content,
                            author: item.User?.name || item.User?.username || 'Аноним',
                            createdAt: new Date(item.createdAt).toLocaleDateString('ru-RU'),
                            likesCount: item.likesCount || 0,
                            commentsCount: item.commentsCount || 0, // 🔥 ТЕПЕРЬ БУДЕТ РЕАЛЬНОЕ ЧИСЛО
                            image: item.image,
                            isLiked: item.isLiked || false
                        }}
                        onLike={handleLike}
                        onComment={handleComment}
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
                            onPress={() => setIsModalVisible(true)}
                        >
                            <Text style={styles.emptyButtonText}>Создать первый пост</Text>
                        </TouchableOpacity>
                    </View>
                }
                contentContainerStyle={posts.length === 0 ? { flex: 1 } : null}
            />

            {/* Модальное окно создания поста */}
            <CreatePostModal
                visible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                onSubmit={handleCreatePost}
            />

            {/* Временная кнопка разлогина */}
            <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
            >
                <Text style={styles.logoutButtonText}>Выйти</Text>
            </TouchableOpacity>
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
        paddingTop: 10, // Уменьшаем отступ сверху
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
    logoutButton: {
        backgroundColor: '#ef4444',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        margin: 20,
        alignItems: 'center',
    },
    logoutButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
