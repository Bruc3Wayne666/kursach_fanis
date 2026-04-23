// src/screens/UserProfileScreen.tsx - С REDUX
import React, { useCallback, useEffect, useState, useRef } from 'react';
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
import {toggleLikeAction, fetchUserPosts, clearUserPosts} from '../store/slices/postsSlice';
import PostCard from '../components/PostCard';
import {API_FILE_URL} from "../utils/constants.ts";

type UserRelation = {
    isOwnProfile: boolean;
    isFollowing: boolean;
    isFriend: boolean;
    friendshipStatus: 'self' | 'none' | 'pending' | 'accepted' | 'rejected';
    friendshipDirection: 'incoming' | 'outgoing' | null;
    friendshipId: string | null;
};

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
    const [relation, setRelation] = useState<UserRelation | null>(null);
    const [friendActionLoading, setFriendActionLoading] = useState(false);

    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);

    const isOwnProfile = userId === currentUser?.id;

    const loadStats = useCallback(async () => {
        const [followersResponse, followingResponse] = await Promise.all([
            api.get(`/users/${userId}/followers`).catch(() => ({ data: { followers: [] } })),
            api.get(`/users/${userId}/following`).catch(() => ({ data: { following: [] } }))
        ]);

        setStats(prev => ({
            ...prev,
            followers: followersResponse.data.followers?.length || 0,
            following: followingResponse.data.following?.length || 0,
        }));
    }, [userId]);

    const loadUserProfile = useCallback(async () => {
        try {
            const response = await api.get(`/users/${userId}/profile`);
            const userData = response.data.user;
            setUser(userData);
            await loadStats();
        } catch (error) {
            console.error('Error loading user profile:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить профиль пользователя');
        } finally {
            setLoading(false);
        }
    }, [loadStats, userId]);

    // 🔥 ИСПОЛЬЗУЕМ REDUX ACTION
    const loadUserPosts = useCallback(() => {
        dispatch(fetchUserPosts(userId) as any);
    }, [dispatch, userId]);

    const loadRelation = useCallback(async () => {
        try {
            if (!currentUser || isOwnProfile) {
                setRelation({
                    isOwnProfile: true,
                    isFollowing: false,
                    isFriend: false,
                    friendshipStatus: 'self',
                    friendshipDirection: null,
                    friendshipId: null,
                });
                return;
            }

            const response = await api.get(`/users/${userId}/relation`);
            setRelation(response.data.relation);
        } catch (error) {
            console.error('Error loading relation status:', error);
        }
    }, [currentUser, isOwnProfile, userId]);

    const startPolling = useCallback(() => {
        if (pollingRef.current) return;

        console.log('🔄 Starting polling for user profile...');
        pollingRef.current = setInterval(() => {
            if (isMountedRef.current) {
                loadUserPosts();
                loadRelation();
                loadStats();
            }
        }, 2000);
    }, [loadRelation, loadStats, loadUserPosts]);

    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            console.log('🛑 Stopping polling for user profile...');
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }, []);

    useEffect(() => {
        isMountedRef.current = true;

        if (isFocused && userId) {
            loadUserProfile();
            loadUserPosts();
            loadRelation();
            startPolling();
        }

        return () => {
            isMountedRef.current = false;
            stopPolling();
            dispatch(clearUserPosts(userId));
        };
    }, [isFocused, userId, loadUserProfile, loadUserPosts, loadRelation, startPolling, stopPolling, dispatch]);

    useEffect(() => {
        setStats(prev => ({
            ...prev,
            posts: userPosts.length,
        }));
    }, [userPosts.length]);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            loadUserProfile(),
            loadRelation(),
            loadStats(),
        ]);
        loadUserPosts(); // 🔥 REDUX ACTION
        setRefreshing(false);
    };


    const handleLike = async (postId: string) => {
        try {
            return await dispatch(toggleLikeAction(postId) as any).unwrap();
        } catch {
            Alert.alert('Ошибка', 'Не удалось изменить лайк');
        }
    };

    const handleComment = (postId: string) => {
        navigation.navigate('Comments', { postId });
    };

    const handleFollow = async () => {
        try {
            if (relation?.isFollowing) {
                await api.delete(`/users/${userId}/unfollow`);
            } else {
                await api.post(`/users/${userId}/follow`);
            }
            await Promise.all([loadRelation(), loadStats()]);
        } catch (error: any) {
            console.error('Follow error:', error);
        }
    };

    const handleFriendAction = async () => {
        if (isOwnProfile || friendActionLoading) {
            return;
        }

        setFriendActionLoading(true);

        try {
            if (relation?.friendshipStatus === 'accepted' && relation.friendshipId) {
                await api.delete(`/friends/${relation.friendshipId}`);
            } else if (
                relation?.friendshipStatus === 'pending' &&
                relation.friendshipDirection === 'incoming' &&
                relation.friendshipId
            ) {
                await api.put(`/friends/${relation.friendshipId}/accept`);
            } else if (
                relation?.friendshipStatus === 'none' ||
                relation?.friendshipStatus === 'rejected' ||
                !relation
            ) {
                await api.post(`/friends/${userId}/request`);
            }

            await Promise.all([loadRelation(), loadStats()]);
        } catch (error: any) {
            console.error('Friend action error:', error);
            const errorMessage = error.response?.data?.error || 'Не удалось выполнить действие с друзьями';
            Alert.alert('Ошибка', errorMessage);
        } finally {
            setFriendActionLoading(false);
        }
    };

    const handleRejectFriendRequest = async () => {
        if (!relation?.friendshipId || friendActionLoading) {
            return;
        }

        setFriendActionLoading(true);

        try {
            await api.put(`/friends/${relation.friendshipId}/reject`);
            await Promise.all([loadRelation(), loadStats()]);
        } catch (error: any) {
            console.error('Reject friend request error:', error);
            const errorMessage = error.response?.data?.error || 'Не удалось отклонить заявку в друзья';
            Alert.alert('Ошибка', errorMessage);
        } finally {
            setFriendActionLoading(false);
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
            type,
            onRelationChanged: loadUserProfile,
        });
    };

    const renderPostItem = ({ item }: { item: any }) => (
        <PostCard
            post={item}
            onLike={handleLike}
            onComment={handleComment}
        />
    );

    const emptyListContent = styles.emptyListContent;
    const relationStatus = relation?.friendshipStatus || 'none';
    const relationDirection = relation?.friendshipDirection || null;
    const isFollowing = Boolean(relation?.isFollowing);
    const isFriend = relationStatus === 'accepted';
    const hasOutgoingRequest = relationStatus === 'pending' && relationDirection === 'outgoing';
    const hasIncomingRequest = relationStatus === 'pending' && relationDirection === 'incoming';
    const friendButtonText = isFriend
        ? 'Удалить из друзей'
        : hasIncomingRequest
            ? 'Принять в друзья'
            : hasOutgoingRequest
                ? 'Заявка отправлена'
                : 'Добавить в друзья';

    if (loading || !user) {
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
                                <View style={styles.profileActions}>
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

                                    <TouchableOpacity
                                        style={[
                                            styles.friendButton,
                                            (isFriend || hasOutgoingRequest) && styles.friendButtonMuted
                                        ]}
                                        onPress={handleFriendAction}
                                        disabled={friendActionLoading || hasOutgoingRequest}
                                    >
                                        {friendActionLoading ? (
                                            <ActivityIndicator
                                                size="small"
                                                color={(isFriend || hasOutgoingRequest) ? darkTheme.colors.text : '#fff'}
                                            />
                                        ) : (
                                            <Text
                                                style={[
                                                    styles.friendButtonText,
                                                    (isFriend || hasOutgoingRequest) && styles.friendButtonTextMuted
                                                ]}
                                            >
                                                {friendButtonText}
                                            </Text>
                                        )}
                                    </TouchableOpacity>

                                    {hasIncomingRequest && (
                                        <TouchableOpacity
                                            style={styles.rejectFriendButton}
                                            onPress={handleRejectFriendRequest}
                                            disabled={friendActionLoading}
                                        >
                                            <Text style={styles.rejectFriendButtonText}>
                                                Отклонить заявку
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
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
                    !postsLoading ? (
                        <View style={styles.emptyPostsContainer}>
                            <Text style={styles.emptyPostsText}>У пользователя пока нет постов</Text>
                            <Text style={styles.emptyPostsSubtext}>
                                Когда пользователь создаст пост, он появится здесь
                            </Text>
                        </View>
                    ) : null
                }
                contentContainerStyle={userPosts.length === 0 ? emptyListContent : undefined}
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
    profileActions: {
        width: '100%',
        marginTop: 10,
        gap: 10,
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
    friendButton: {
        backgroundColor: darkTheme.colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 42,
    },
    friendButtonMuted: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: darkTheme.colors.border,
    },
    friendButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    friendButtonTextMuted: {
        color: darkTheme.colors.text,
    },
    rejectFriendButton: {
        backgroundColor: '#ef4444',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 42,
    },
    rejectFriendButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
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
    emptyListContent: {
        flexGrow: 1,
    },
});
