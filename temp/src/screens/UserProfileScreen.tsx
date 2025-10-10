// src/screens/UserProfileScreen.tsx - ПОЛНАЯ ВЕРСИЯ
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { useRoute, useNavigation } from '@react-navigation/native';
import { darkTheme } from '../themes/dark';
import { api } from '../services/api';
import PostCard from '../components/PostCard';
import { followUser, unfollowUser } from '../store/slices/usersSlice';
import { likePost, unlikePost } from '../store/slices/postsSlice';

export default function UserProfileScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const { userId } = route.params as any;
    const currentUser = useSelector((state: any) => state.auth.user);

    const [user, setUser] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [isFriend, setIsFriend] = useState(false);
    const [friendshipId, setFriendshipId] = useState<string | null>(null);
    const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'accepted'>('none');
    const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        followers: 0,
        following: 0,
        posts: 0
    });
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    useEffect(() => {
        loadUserProfile();
    }, [userId]);

    const loadUserProfile = async () => {
        try {
            setLoading(true);
            console.log('🔄 Loading profile for user:', userId);

            // Загружаем профиль пользователя
            const profileResponse = await api.get(`/users/${userId}/profile`);
            console.log('✅ Profile response:', profileResponse.data);

            const userData = profileResponse.data.user;
            setUser(userData);

            // Загружаем посты пользователя
            const postsResponse = await api.get(`/posts/user/${userId}?limit=20`);
            const postsWithLikes = await Promise.all(
                (postsResponse.data.posts || []).map(async (post: any) => {
                    const isLiked = post.Likers?.some((liker: any) => liker.id === currentUser.id) || false;
                    return {
                        ...post,
                        isLiked
                    };
                })
            );
            setPosts(postsWithLikes);

            // Проверяем статус дружбы
            await checkFriendshipStatus();

            // Проверяем подписку
            await checkFollowStatus();

            // Загружаем статистику
            await loadStats();

        } catch (error: any) {
            console.error('❌ Error loading user profile:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить профиль пользователя');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const checkFriendshipStatus = async () => {
        try {
            const [sentRequests, receivedRequests, friendsList] = await Promise.all([
                api.get('/friends/requests'),
                api.get('/friends/requests?type=received'),
                api.get('/friends')
            ]);

            console.log('🔍 Checking friendship status:', {
                sentRequests: sentRequests.data.requests,
                receivedRequests: receivedRequests.data.requests,
                friends: friendsList.data.friends
            });

            // Проверяем есть ли принятая дружба
            const acceptedFriend = friendsList.data.friends.find((f: any) => f.id === userId);
            if (acceptedFriend) {
                setIsFriend(true);
                setFriendshipId(acceptedFriend.friendshipId);
                setFriendStatus('accepted');
                return;
            }

            // Проверяем отправленные запросы
            const sentRequest = sentRequests.data.requests.find((r: any) => r.User?.id === userId);
            if (sentRequest) {
                setFriendStatus('pending');
                setPendingRequestId(sentRequest.id);
                return;
            }

            // Проверяем полученные запросы
            const receivedRequest = receivedRequests.data.requests.find((r: any) => r.User?.id === userId);
            if (receivedRequest) {
                setFriendStatus('pending');
                setPendingRequestId(receivedRequest.id);
                return;
            }

            // Если ничего не найдено
            setFriendStatus('none');
            setIsFriend(false);
            setFriendshipId(null);
            setPendingRequestId(null);

        } catch (error) {
            console.error('Error checking friendship status:', error);
        }
    };

    const checkFollowStatus = async () => {
        try {
            const response = await api.get(`/users/${userId}/followers`);
            const followers = response.data.followers || [];

            const isFollowingUser = followers.some((follower: any) => follower.id === currentUser.id);
            setIsFollowing(isFollowingUser);

            console.log('🔍 Follow status:', { isFollowing: isFollowingUser, userId, currentUserId: currentUser.id });
        } catch (error) {
            console.error('Error checking follow status:', error);
        }
    };

    const loadStats = async () => {
        try {
            const [followersResponse, followingResponse] = await Promise.all([
                api.get(`/users/${userId}/followers`),
                api.get(`/users/${userId}/following`)
            ]);

            setStats({
                followers: followersResponse.data.followers?.length || 0,
                following: followingResponse.data.following?.length || 0,
                posts: posts.length
            });
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadUserProfile();
    };

    const handleFollow = async () => {
        if (followLoading) return;

        setFollowLoading(true);
        try {
            if (isFollowing) {
                await dispatch(unfollowUser(userId) as any);
                setIsFollowing(false);
                setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
            } else {
                await dispatch(followUser(userId) as any);
                setIsFollowing(true);
                setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
            }
        } catch (error: any) {
            console.error('Follow/unfollow error:', error);
            Alert.alert('Ошибка', 'Не удалось выполнить действие');
        } finally {
            setFollowLoading(false);
        }
    };

    const handlePostLike = (postId: string, isCurrentlyLiked: boolean) => {
        console.log('❤️ Handling post like:', { postId, isCurrentlyLiked });

        const updatedPosts = posts.map(post =>
            post.id === postId
                ? {
                    ...post,
                    isLiked: !isCurrentlyLiked,
                    likesCount: isCurrentlyLiked ? post.likesCount - 1 : post.likesCount + 1
                }
                : post
        );
        setPosts(updatedPosts);

        if (isCurrentlyLiked) {
            dispatch(unlikePost(postId) as any);
        } else {
            dispatch(likePost(postId) as any);
        }
    };

    const handlePostComment = (postId: string) => {
        navigation.navigate('Comments', { postId });
    };

    const addFriend = async () => {
        try {
            console.log('📤 Sending friend request to:', userId);
            await api.post(`/friends/${userId}/request`);

            setFriendStatus('pending');
            Alert.alert('Успех', 'Запрос в друзья отправлен');

        } catch (error: any) {
            console.error('❌ Add friend error:', error);
            const errorMessage = error.response?.data?.error || 'Не удалось отправить запрос';
            Alert.alert('Ошибка', errorMessage);
        }
    };

    const getAvatarUrl = (avatarPath: string | null) => {
        if (!avatarPath) return 'https://via.placeholder.com/100';

        if (avatarPath.startsWith('http')) {
            return avatarPath;
        }

        return `http://192.168.0.116:5000${avatarPath}`;
    };

    const cancelFriendRequest = async () => {
        if (!pendingRequestId) return;

        try {
            await api.delete(`/friends/${pendingRequestId}`);
            setFriendStatus('none');
            setPendingRequestId(null);
            Alert.alert('Успех', 'Запрос в друзья отменен');
        } catch (error) {
            console.error('Cancel friend request error:', error);
            Alert.alert('Ошибка', 'Не удалось отменить запрос');
        }
    };

    const acceptFriendRequest = async () => {
        if (!pendingRequestId) return;

        try {
            await api.put(`/friends/${pendingRequestId}/accept`);
            setFriendStatus('accepted');
            setIsFriend(true);
            Alert.alert('Успех', 'Пользователь добавлен в друзья');
        } catch (error) {
            console.error('Accept friend request error:', error);
            Alert.alert('Ошибка', 'Не удалось принять запрос');
        }
    };

    const removeFriend = async () => {
        if (!friendshipId) return;

        Alert.alert(
            'Удалить из друзей',
            `Вы уверены что хотите удалить ${user?.name} из друзей?`,
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/friends/${friendshipId}`);
                            setIsFriend(false);
                            setFriendStatus('none');
                            setFriendshipId(null);
                            Alert.alert('Успех', 'Пользователь удален из друзей');
                        } catch (error) {
                            console.error('Remove friend error:', error);
                            Alert.alert('Ошибка', 'Не удалось удалить из друзей');
                        }
                    }
                }
            ]
        );
    };

    const startChat = () => {
        navigation.navigate('Chat', {
            chatId: userId,
            partner: user,
            chatType: 'personal'
        });
    };

    const navigateToFollowers = () => {
        navigation.navigate('FollowList', {
            userId: userId,
            type: 'followers'
        });
    };

    const navigateToFollowing = () => {
        navigation.navigate('FollowList', {
            userId: userId,
            type: 'following'
        });
    };

    const getFollowButton = () => {
        if (userId === currentUser.id) return null;

        return (
            <TouchableOpacity
                style={[
                    styles.followButton,
                    isFollowing ? styles.unfollowButton : styles.followButtonActive,
                    followLoading && styles.loadingButton
                ]}
                onPress={handleFollow}
                disabled={followLoading}
            >
                {followLoading ? (
                    <ActivityIndicator size="small" color={isFollowing ? darkTheme.colors.text : '#fff'} />
                ) : (
                    <Text style={[
                        styles.followButtonText,
                        isFollowing && styles.unfollowButtonText
                    ]}>
                        {isFollowing ? '✓ Подписан' : '➕ Подписаться'}
                    </Text>
                )}
            </TouchableOpacity>
        );
    };

    const getFriendButton = () => {
        if (userId === currentUser.id) return null;

        switch (friendStatus) {
            case 'accepted':
                return (
                    <>
                        <TouchableOpacity style={styles.chatButton} onPress={startChat}>
                            <Text style={styles.chatButtonText}>💬 Написать</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.removeFriendButton} onPress={removeFriend}>
                            <Text style={styles.removeFriendText}>✕ Удалить из друзей</Text>
                        </TouchableOpacity>
                    </>
                );

            case 'pending':
                return (
                    <TouchableOpacity style={styles.pendingButton} onPress={cancelFriendRequest}>
                        <Text style={styles.pendingButtonText}>⏳ Запрос отправлен</Text>
                    </TouchableOpacity>
                );

            case 'none':
            default:
                return (
                    <TouchableOpacity style={styles.addFriendButton} onPress={addFriend}>
                        <Text style={styles.addFriendText}>➕ Добавить в друзья</Text>
                    </TouchableOpacity>
                );
        }
    };

    const renderPostItem = ({ item }: { item: any }) => (
        <PostCard
            post={item}
            onLike={() => handlePostLike(item.id, item.isLiked)}
            onComment={() => handlePostComment(item.id)}
        />
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color={darkTheme.colors.primary} />
                <Text style={styles.loadingText}>Загрузка профиля...</Text>
            </SafeAreaView>
        );
    }

    if (!user) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.backButton}>← Назад</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Профиль</Text>
                    <View style={styles.placeholder} />
                </View>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Пользователь не найден</Text>
                    <Text style={styles.errorSubtext}>
                        Возможно, пользователь удалил аккаунт
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>← Назад</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Профиль</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={darkTheme.colors.primary}
                    />
                }
            >
                <View style={styles.profileHeader}>
                    <Image
                        source={{ uri: getAvatarUrl(user?.avatar) }}
                        style={styles.avatar}
                        defaultSource={{ uri: 'https://via.placeholder.com/100' }}
                        onError={(e) => console.log('❌ Avatar load error:', e.nativeEvent.error)}
                    />
                    <Text style={styles.userName}>{user?.name}</Text>
                    <Text style={styles.userUsername}>@{user?.username}</Text>

                    {user?.bio ? (
                        <Text style={styles.userBio}>{user.bio}</Text>
                    ) : (
                        <Text style={styles.noBio}>Пользователь не добавил информацию о себе</Text>
                    )}

                    <View style={styles.stats}>
                        <TouchableOpacity style={styles.statItem} onPress={navigateToFollowers}>
                            <Text style={styles.statNumber}>{stats.followers}</Text>
                            <Text style={styles.statLabel}>Подписчики</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.statItem} onPress={navigateToFollowing}>
                            <Text style={styles.statNumber}>{stats.following}</Text>
                            <Text style={styles.statLabel}>Подписки</Text>
                        </TouchableOpacity>

                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{stats.posts}</Text>
                            <Text style={styles.statLabel}>Посты</Text>
                        </View>
                    </View>

                    <View style={styles.actions}>
                        {getFollowButton()}
                        {getFriendButton()}
                    </View>
                </View>

                <View style={styles.postsSection}>
                    <Text style={styles.sectionTitle}>Посты</Text>
                    {posts.length > 0 ? (
                        <FlatList
                            data={posts}
                            renderItem={renderPostItem}
                            keyExtractor={item => item.id}
                            scrollEnabled={false}
                            showsVerticalScrollIndicator={false}
                        />
                    ) : (
                        <View style={styles.noPosts}>
                            <Text style={styles.noPostsText}>Пользователь еще не опубликовал посты</Text>
                        </View>
                    )}
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
    headerTitle: {
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    errorText: {
        color: darkTheme.colors.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    errorSubtext: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
    },
    content: {
        flex: 1,
    },
    profileHeader: {
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: darkTheme.colors.border,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 15,
        backgroundColor: darkTheme.colors.card,
    },
    userName: {
        color: darkTheme.colors.text,
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
        textAlign: 'center',
    },
    userUsername: {
        color: darkTheme.colors.primary,
        fontSize: 16,
        marginBottom: 12,
        textAlign: 'center',
    },
    userBio: {
        color: darkTheme.colors.text,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    noBio: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 20,
    },
    stats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 20,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        color: darkTheme.colors.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statLabel: {
        color: darkTheme.colors.textSecondary,
        fontSize: 12,
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
    },
    followButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 120,
    },
    followButtonActive: {
        backgroundColor: darkTheme.colors.primary,
    },
    unfollowButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: darkTheme.colors.border,
    },
    followButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    unfollowButtonText: {
        color: darkTheme.colors.text,
    },
    loadingButton: {
        opacity: 0.7,
    },
    chatButton: {
        flex: 1,
        backgroundColor: darkTheme.colors.primary,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    chatButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    addFriendButton: {
        flex: 1,
        backgroundColor: darkTheme.colors.primary,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    addFriendText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    pendingButton: {
        flex: 1,
        backgroundColor: '#f59e0b',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    pendingButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    removeFriendButton: {
        flex: 1,
        backgroundColor: '#ef4444',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    removeFriendText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    postsSection: {
        padding: 15,
    },
    sectionTitle: {
        color: darkTheme.colors.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    noPosts: {
        alignItems: 'center',
        padding: 40,
    },
    noPostsText: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
    },
});
