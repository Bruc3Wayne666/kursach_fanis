// src/screens/UserProfileScreen.tsx - С REDUX
import React, { useEffect, useState, useRef } from 'react';
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
import {fetchPosts, createPost, toggleLikeAction, fetchUserPosts, clearUserPosts} from '../store/slices/postsSlice';
import PostCard from '../components/PostCard';
import {API_BASE_URL, API_FILE_URL} from "../utils/constants.ts";

interface UserProfileScreenProps {
    route: {
        params: {
            userId: string;
        };
    };
    navigation: any;
}

export default function UserProfileScreen({ route, navigation }: UserProfileScreenProps) {
    const { userId } = route.params;
    const currentUser = useSelector((state: any) => state.auth.user);
    const dispatch = useDispatch();
    const isFocused = useIsFocused();

    // 🔥 ИСПОЛЬЗУЕМ REDUX ДЛЯ ПОСТОВ
    const userPosts = useSelector((state: any) => state.posts.userPosts[userId] || []);
    const postsLoading = useSelector((state: any) => state.posts.loading);

    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState({
        followers: 0,
        following: 0,
        posts: 0
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);

    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);

    const isOwnProfile = userId === currentUser?.id;

    useEffect(() => {
        isMountedRef.current = true;

        if (isFocused && userId) {
            loadUserProfile();
            loadUserPosts();
            checkFollowStatus();
            startPolling();
        }

        return () => {
            isMountedRef.current = false;
            stopPolling();
            // 🔥 ОЧИЩАЕМ ПОСТЫ ПРИ ВЫХОДЕ ИЗ ЭКРАНА
            dispatch(clearUserPosts(userId));
        };
    }, [isFocused, userId]);

    const startPolling = () => {
        if (pollingRef.current) return;

        console.log('🔄 Starting polling for user profile...');
        pollingRef.current = setInterval(() => {
            if (isMountedRef.current) {
                loadUserPosts();
                checkFollowStatus();
            }
        }, 2000);
    };

    const stopPolling = () => {
        if (pollingRef.current) {
            console.log('🛑 Stopping polling for user profile...');
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    const loadUserProfile = async () => {
        try {
            const response = await api.get(`/users/${userId}/profile`);
            const userData = response.data.user;
            setUser(userData);

            const [followersResponse, followingResponse] = await Promise.all([
                api.get(`/users/${userId}/followers`).catch(() => ({ data: { followers: [] } })),
                api.get(`/users/${userId}/following`).catch(() => ({ data: { following: [] } }))
            ]);

            setStats(prev => ({
                ...prev,
                followers: followersResponse.data.followers?.length || 0,
                following: followingResponse.data.following?.length || 0,
                posts: userPosts.length
            }));
        } catch (error) {
            console.error('Error loading user profile:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить профиль пользователя');
        } finally {
            setLoading(false);
        }
    };

    // 🔥 ИСПОЛЬЗУЕМ REDUX ACTION
    const loadUserPosts = () => {
        dispatch(fetchUserPosts(userId) as any);
    };

    const checkFollowStatus = async () => {
        if (!currentUser || isOwnProfile) return;

        try {
            const followersResponse = await api.get(`/users/${userId}/followers`);
            const isUserFollowing = followersResponse.data.followers?.some(
                (follower: any) => follower.id === currentUser.id
            );
            setIsFollowing(!!isUserFollowing);
        } catch (error) {
            console.error('Error checking follow status:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            loadUserProfile(),
            checkFollowStatus()
        ]);
        loadUserPosts(); // 🔥 REDUX ACTION
        setRefreshing(false);
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

    const handleFollow = async () => {
        try {
            if (isFollowing) {
                await api.delete(`/users/${userId}/unfollow`);
                setIsFollowing(false);
                setStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
            } else {
                await api.post(`/users/${userId}/follow`);
                setIsFollowing(true);
                setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
            }
        } catch (error: any) {
            console.error('Follow error:', error);
        }
    };

    const getAvatarUrl = (avatarPath: string | null) => {
        if (!avatarPath) return 'https://via.placeholder.com/100';

        if (avatarPath.startsWith('http')) {
            return avatarPath;
        }

        // return `http://192.168.0.116:5000${avatarPath}`;
        return `${API_FILE_URL}${avatarPath}`;
    };

    const navigateToFollowList = (type: 'followers' | 'following') => {
        navigation.navigate('FollowList', {
            userId: userId,
            type
        });
    };

    const renderPostItem = ({ item }: { item: any }) => (
        <PostCard
            post={item}
            onLike={handleLike}
            onComment={handleComment}
        />
    );

    if (loading || !user) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color={darkTheme.colors.primary} />
                <Text style={styles.loadingText}>Загрузка профиля...</Text>
            </SafeAreaView>
        );
    }

    console.log('DEBUG POSTS:', userPosts.map(p => ({id: p.id, liked: p.isLiked})));

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>← Назад</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Профиль</Text>
                <View style={styles.headerPlaceholder} />
            </View>

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
                        <View style={styles.userCard}>
                            <Image
                                source={{ uri: getAvatarUrl(user.avatar) }}
                                style={styles.avatar}
                                defaultSource={{ uri: 'https://via.placeholder.com/100' }}
                                onError={(e) => console.log('❌ Avatar load error:', e.nativeEvent.error)}
                            />
                            <Text style={styles.userName}>{user.name}</Text>
                            <Text style={styles.userUsername}>@{user.username}</Text>

                            {user.bio ? (
                                <Text style={styles.userBio}>{user.bio}</Text>
                            ) : (
                                <Text style={styles.noBio}>Пользователь не добавил информацию о себе</Text>
                            )}

                            {!isOwnProfile && (
                                <TouchableOpacity
                                    style={[
                                        styles.followButton,
                                        isFollowing && styles.unfollowButton
                                    ]}
                                    onPress={handleFollow}
                                >
                                    <Text style={[
                                        styles.followButtonText,
                                        isFollowing && styles.unfollowButtonText
                                    ]}>
                                        {isFollowing ? 'Отписаться' : 'Подписаться'}
                                    </Text>
                                </TouchableOpacity>
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
                                <Text style={styles.statNumber}>{userPosts.length}</Text>
                                <Text style={styles.statLabel}>Посты</Text>
                            </View>
                        </View>

                        <View style={styles.postsHeader}>
                            <Text style={styles.postsTitle}>Посты пользователя</Text>
                            {postsLoading && (
                                <ActivityIndicator size="small" color={darkTheme.colors.primary} />
                            )}
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    !postsLoading && (
                        <View style={styles.emptyPostsContainer}>
                            <Text style={styles.emptyPostsText}>У пользователя пока нет постов</Text>
                            <Text style={styles.emptyPostsSubtext}>
                                Когда пользователь создаст пост, он появится здесь
                            </Text>
                        </View>
                    )
                }
                contentContainerStyle={userPosts.length === 0 ? { flexGrow: 1 } : null}
            />
        </SafeAreaView>
    );
}

// Стили остаются без изменений...
// Стили остаются без изменений...
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
        padding: 5,
    },
    backButtonText: {
        color: darkTheme.colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    title: {
        color: darkTheme.colors.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerPlaceholder: {
        width: 60,
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
    userBio: {
        color: darkTheme.colors.text,
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 15,
    },
    noBio: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        fontStyle: 'italic',
        marginBottom: 15,
    },
    followButton: {
        backgroundColor: darkTheme.colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 10,
    },
    unfollowButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: darkTheme.colors.border,
    },
    followButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    unfollowButtonText: {
        color: darkTheme.colors.text,
    },
    stats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: darkTheme.colors.card,
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
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
    postsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    postsTitle: {
        color: darkTheme.colors.text,
        fontSize: 20,
        fontWeight: 'bold',
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
    },
});
