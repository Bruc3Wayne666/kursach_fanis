// src/screens/ProfileScreen.tsx - FIXED VERSION
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    FlatList,
    RefreshControl,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { useIsFocused } from '@react-navigation/native';
import { darkTheme } from '../themes/dark';
import { api } from '../services/api';
import { logout } from '../store/slices/authSlice';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import {createPost, toggleLikeAction, fetchUserPosts, clearUserPosts} from '../store/slices/postsSlice';
import {API_FILE_URL} from "../utils/constants.ts";

export default function ProfileScreen({ navigation, route }: any) {
    const user = useSelector((state: any) => state.auth.user);
    const dispatch = useDispatch();
    const isFocused = useIsFocused();

    const [stats, setStats] = useState({
        followers: 0,
        following: 0,
        posts: 0
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [postsLoading, _setPostsLoading] = useState(false);
    const [isCreatePostModalVisible, setIsCreatePostModalVisible] = useState(false);

    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);

    // Получаем userId из параметров или используем текущего пользователя
    const targetUserId = route.params?.userId || user?.id;
    const isOwnProfile = targetUserId === user?.id;

    // 🔥 ИСПОЛЬЗУЕМ REDUX ДЛЯ ПОСТОВ (ПОСЛЕ ОПРЕДЕЛЕНИЯ targetUserId)
    const userPosts = useSelector((state: any) => state.posts.userPosts[targetUserId] || []);

    // 🔥 FIX 1: Используем useCallback для стабильных функций
    const loadProfileData = useCallback(async () => {
        if (!targetUserId) return;

        try {
            const [followersResponse, followingResponse] = await Promise.all([
                api.get(`/users/${targetUserId}/followers`).catch(() => ({ data: { followers: [] } })),
                api.get(`/users/${targetUserId}/following`).catch(() => ({ data: { following: [] } }))
            ]);

            setStats(prev => ({
                ...prev,
                followers: followersResponse.data.followers?.length || 0,
                following: followingResponse.data.following?.length || 0,
            }));
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    }, [targetUserId]);

    // 🔥 FIX 2: Используем useCallback для loadUserPosts
    const loadUserPosts = useCallback(() => {
        if (!targetUserId) return;
        dispatch(fetchUserPosts(targetUserId) as any);
    }, [targetUserId, dispatch]);

    // 🔥 FIX 3: Правильный useEffect с зависимостями
    // Polling для real-time обновлений
    const startPolling = useCallback(() => {
        if (pollingRef.current) return;

        console.log('🔄 Starting polling for profile...');
        pollingRef.current = setInterval(() => {
            if (isMountedRef.current && !isCreatePostModalVisible) {
                loadUserPosts();
                loadProfileData();
            }
        }, 2000);
    }, [isCreatePostModalVisible, loadUserPosts, loadProfileData]);

    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            console.log('🛑 Stopping polling for profile...');
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }, []);

    useEffect(() => {
        isMountedRef.current = true;

        if (isFocused && targetUserId) {
            loadProfileData();
            loadUserPosts();
            startPolling();
        }

        return () => {
            isMountedRef.current = false;
            stopPolling();
            dispatch(clearUserPosts(targetUserId));
        };
    }, [isFocused, targetUserId, loadProfileData, loadUserPosts, startPolling, stopPolling, dispatch]);

    useEffect(() => {
        setStats(prev => ({
            ...prev,
            posts: userPosts.length
        }));
    }, [userPosts.length]);

    const handleComment = useCallback((postId: string) => {
        navigation.navigate('Comments', {
            postId,
            onCommentAdded: () => {
                setTimeout(() => {
                    loadUserPosts();
                }, 500);
            }
        });
    }, [navigation, loadUserPosts]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([
            loadProfileData()
        ]);
        loadUserPosts();
        setRefreshing(false);
    }, [loadProfileData, loadUserPosts]);

    // 🔥 FIX 6: Стабильная функция для создания поста
    const handleCreatePost = useCallback(async (title: string, content: string, image?: string) => {
        const postContent = title ? `${title}\n\n${content}` : content;

        console.log('📤 Создание поста из профиля:', {
            content: postContent,
            hasImage: !!image
        });

        try {
            await dispatch(createPost({ content: postContent, image }) as any);
            setIsCreatePostModalVisible(false);

            setTimeout(() => {
                loadUserPosts();
            }, 1000);

            Alert.alert('Успех', 'Пост опубликован!');
        } catch (error) {
            console.error('Error creating post:', error);
            Alert.alert('Ошибка', 'Не удалось создать пост');
        }
    }, [dispatch, loadUserPosts]);

    const handleLike = useCallback(async (postId: string) => {
        try {
            return await dispatch(toggleLikeAction(postId) as any).unwrap();
        } catch {
            Alert.alert('Ошибка', 'Не удалось изменить лайк');
        }
    }, [dispatch]);

    const getAvatarUrl = useCallback((avatarPath: string | null) => {
        if (!avatarPath) return 'https://via.placeholder.com/100';

        if (avatarPath.startsWith('http')) {
            return avatarPath;
        }

        return `${API_FILE_URL}${avatarPath}`;
    }, []);

    const navigateToFollowList = useCallback((type: 'followers' | 'following') => {
        navigation.navigate('FollowList', {
            userId: targetUserId,
            type,
            onRelationChanged: loadProfileData,
        });
    }, [navigation, targetUserId, loadProfileData]);

    const handleLogout = useCallback(() => {
        dispatch(logout());
    }, [dispatch]);

    // 🔥 FIX 8: Стабильные функции для модалки
    const handleOpenModal = useCallback(() => {
        stopPolling();
        setIsCreatePostModalVisible(true);
    }, [stopPolling]);

    const handleCloseModal = useCallback(() => {
        setIsCreatePostModalVisible(false);
        setTimeout(() => {
            if (isMountedRef.current && isFocused) {
                startPolling();
            }
        }, 1000);
    }, [isFocused, startPolling]);

    const emptyListContent = styles.emptyListContent;

    // 🔥 FIX 9: Стабильная функция рендеринга постов
    const renderPostItem = useCallback(({ item }: { item: any }) => (
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
            post={item}
            onLike={() => handleLike(item.id)}
            // onLike={handleLike}
            onComment={handleComment}
        />
    ), [handleLike, handleComment]);

    if (loading) {
        return (
            <SafeAreaView style={styles.centerContainer} edges={['left', 'right', 'bottom']}>
                <ActivityIndicator size="large" color={darkTheme.colors.primary} />
                <Text style={styles.loadingText}>Загрузка профиля...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <View style={styles.header}>
                <Text style={styles.title}>
                    {isOwnProfile ? 'Профиль' : 'Профиль пользователя'}
                </Text>
                <View style={styles.headerButtons}>
                    {isOwnProfile && (
                        <TouchableOpacity onPress={handleLogout}>
                            <Text style={styles.logoutButton}>Выйти</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {user && (
                <FlatList
                    data={userPosts}
                    renderItem={renderPostItem}
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
                    ListHeaderComponent={
                        <View style={styles.content}>
                            {/* ... остальной JSX без изменений ... */}
                            <View style={styles.userCard}>
                                <Image
                                    source={{ uri: getAvatarUrl(user.avatar) }}
                                    style={styles.avatar}
                                    defaultSource={{ uri: 'https://via.placeholder.com/100' }}
                                    onError={(e) => console.log('❌ Avatar load error:', e.nativeEvent.error)}
                                />
                                <Text style={styles.userName}>{user.name}</Text>
                                <Text style={styles.userUsername}>@{user.username}</Text>
                                <Text style={styles.userEmail}>{user.email}</Text>

                                {user.bio ? (
                                    <Text style={styles.userBio}>{user.bio}</Text>
                                ) : (
                                    <Text style={styles.noBio}>Добавьте информацию о себе</Text>
                                )}
                            </View>

                            <View style={styles.stats}>
                                <TouchableOpacity
                                    style={styles.statItem}
                                    onPress={() => navigateToFollowList('followers')}
                                >
                                    <Text style={styles.statNumber}>{stats.followers}</Text>
                                    <Text style={styles.statLabel}>Подписчики</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.statItem}
                                    onPress={() => navigateToFollowList('following')}
                                >
                                    <Text style={styles.statNumber}>{stats.following}</Text>
                                    <Text style={styles.statLabel}>Подписки</Text>
                                </TouchableOpacity>

                                <View style={styles.statItem}>
                                    <Text style={styles.statNumber}>{stats.posts}</Text>
                                    <Text style={styles.statLabel}>Посты</Text>
                                </View>
                            </View>

                            {isOwnProfile && (
                                <View style={styles.actionButtons}>
                                    <TouchableOpacity
                                        style={styles.editButton}
                                        onPress={() => navigation.navigate('EditProfile')}
                                    >
                                        <Text style={styles.editButtonText}>✏️ Редактировать</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.friendsButton}
                                        onPress={() => navigation.navigate('Friends')}
                                    >
                                        <Text style={styles.friendsButtonText}>👥 Друзья</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            <View style={styles.postsHeader}>
                                <Text style={styles.postsTitle}>
                                    {isOwnProfile ? 'Мои посты' : 'Посты пользователя'}
                                </Text>
                                {isOwnProfile && (
                                    <TouchableOpacity
                                        style={styles.createInlineButton}
                                        onPress={handleOpenModal}
                                    >
                                        <Text style={styles.createInlineButtonText}>+ Пост</Text>
                                    </TouchableOpacity>
                                )}
                                {postsLoading && (
                                    <ActivityIndicator size="small" color={darkTheme.colors.primary} />
                                )}
                            </View>
                        </View>
                    }
                    ListEmptyComponent={
                        !postsLoading && (
                            <View style={styles.emptyPostsContainer}>
                                <Text style={styles.emptyPostsText}>
                                    {isOwnProfile ? 'Пока нет постов' : 'У пользователя пока нет постов'}
                                </Text>
                                <Text style={styles.emptyPostsSubtext}>
                                    {isOwnProfile
                                        ? 'Создайте свой первый пост и поделитесь им с друзьями!'
                                        : 'Когда пользователь создаст пост, он появится здесь'
                                    }
                                </Text>
                                {isOwnProfile && (
                                    <TouchableOpacity
                                        style={styles.emptyPostsButton}
                                        onPress={handleOpenModal}
                                    >
                                        <Text style={styles.emptyPostsButtonText}>Создать первый пост</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )
                    }
                    contentContainerStyle={userPosts.length === 0 ? emptyListContent : undefined}
                />
            )}

            {isOwnProfile && (
                <CreatePostModal
                    visible={isCreatePostModalVisible}
                    onClose={handleCloseModal}
                    onSubmit={handleCreatePost}
                />
            )}
        </SafeAreaView>
    );
}


// Стили остаются без изменений
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
    logoutButton: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: '600',
    },
    content: {
        padding: 15,
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
    userCard: {
        backgroundColor: darkTheme.colors.card,
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        alignItems: 'center',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 15,
        backgroundColor: darkTheme.colors.border,
    },
    userName: {
        color: darkTheme.colors.text,
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    userUsername: {
        color: darkTheme.colors.primary,
        fontSize: 16,
        marginBottom: 8,
    },
    userEmail: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        marginBottom: 12,
    },
    userBio: {
        color: darkTheme.colors.text,
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
    noBio: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        fontStyle: 'italic',
    },
    stats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: darkTheme.colors.card,
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        flexWrap: 'wrap',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
        minWidth: 80,
        marginBottom: 10,
    },
    statNumber: {
        color: darkTheme.colors.text,
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statLabel: {
        color: darkTheme.colors.textSecondary,
        fontSize: 12,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    editButton: {
        flex: 1,
        backgroundColor: darkTheme.colors.card,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: darkTheme.colors.border,
    },
    editButtonText: {
        color: darkTheme.colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    friendsButton: {
        flex: 1,
        backgroundColor: darkTheme.colors.card,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: darkTheme.colors.border,
    },
    friendsButtonText: {
        color: darkTheme.colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    postsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        gap: 10,
    },
    postsTitle: {
        color: darkTheme.colors.text,
        fontSize: 20,
        fontWeight: 'bold',
        flex: 1,
    },
    createInlineButton: {
        backgroundColor: darkTheme.colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 18,
    },
    createInlineButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    emptyPostsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        flex: 1,
    },
    emptyPostsText: {
        color: darkTheme.colors.text,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptyPostsSubtext: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
    },
    emptyPostsButton: {
        backgroundColor: darkTheme.colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
    },
    emptyPostsButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyListContent: {
        flexGrow: 1,
    },
});
