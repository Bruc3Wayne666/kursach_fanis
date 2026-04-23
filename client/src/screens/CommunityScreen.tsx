import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import Avatar from '../components/Avatar';
import CreatePostModal from '../components/CreatePostModal';
import PostCard from '../components/PostCard';
import { api } from '../services/api';
import { darkTheme } from '../themes/dark';
import { createPost, toggleLikeAction } from '../store/slices/postsSlice';
import { useDispatch } from 'react-redux';

export default function CommunityScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const dispatch = useDispatch();
    const isFocused = useIsFocused();
    const communityId = route.params?.communityId;
    const [community, setCommunity] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    const loadData = useCallback(async (silent = false) => {
        if (!communityId) {
            return;
        }

        try {
            if (!silent) {
                setLoading(true);
            }

            const [communityResponse, postsResponse] = await Promise.all([
                api.get(`/communities/${communityId}`),
                api.get(`/posts/community/${communityId}?limit=50`),
            ]);

            setCommunity(communityResponse.data.community);
            setPosts(postsResponse.data.posts || []);
        } catch (error) {
            console.error('Load community screen data error:', error);
            if (!silent) {
                Alert.alert('Ошибка', 'Не удалось загрузить паблик');
                navigation.goBack();
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
            setRefreshing(false);
        }
    }, [communityId, navigation]);

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

        pollingRef.current = setInterval(() => {
            loadData(true);
        }, 4000);
    }, [isFocused, loadData]);

    useEffect(() => {
        if (isFocused) {
            loadData();
            startPolling();
        } else {
            stopPolling();
        }

        return () => {
            stopPolling();
        };
    }, [isFocused, loadData, startPolling, stopPolling]);

    const handleSubscribeToggle = async () => {
        if (!community || community.isOwner || actionLoading) {
            return;
        }

        try {
            setActionLoading(true);
            const response = community.isSubscribed
                ? await api.delete(`/communities/${community.id}/subscribe`)
                : await api.post(`/communities/${community.id}/subscribe`);

            setCommunity(response.data.community);
        } catch (error: any) {
            console.error('Toggle community subscribe error:', error);
            Alert.alert('Ошибка', error.response?.data?.error || 'Не удалось обновить подписку');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreatePost = async (title: string, content: string, image?: string) => {
        const postContent = title ? `${title}\n\n${content}` : content;
        await dispatch(createPost({
            content: postContent,
            image,
            communityId,
        }) as any);
        setCreateModalVisible(false);
        loadData(true);
    };

    const handleLike = async (postId: string) => {
        await dispatch(toggleLikeAction(postId) as any).unwrap();
        loadData(true);
    };

    if (loading || !community) {
        return (
            <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={darkTheme.colors.primary} />
                    <Text style={styles.loadingText}>Загрузка паблика...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <PostCard
                        post={item}
                        onLike={() => handleLike(item.id)}
                        onComment={(postId) => navigation.navigate('Comments', { postId })}
                    />
                )}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            loadData();
                        }}
                        tintColor={darkTheme.colors.primary}
                        colors={[darkTheme.colors.primary]}
                    />
                }
                ListHeaderComponent={
                    <View>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => navigation.goBack()}>
                                <Text style={styles.backButton}>← Назад</Text>
                            </TouchableOpacity>
                            <Text style={styles.title}>Паблик</Text>
                            <View style={styles.headerActions}>
                                {community.isOwner ? (
                                    <TouchableOpacity
                                        onPress={() => navigation.navigate('CommunityForm', { communityId: community.id })}
                                    >
                                        <Text style={styles.headerActionText}>Ред.</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <View style={styles.headerSpacer} />
                                )}
                            </View>
                        </View>

                        <View style={styles.topCard}>
                            <Avatar
                                avatar={community.avatar}
                                name={community.name}
                                size={84}
                                style={styles.avatar}
                            />
                            <Text style={styles.communityName}>{community.name}</Text>
                            <Text style={styles.communityOwner}>
                                Админ: {community.Owner?.name || 'Неизвестно'}
                            </Text>
                            <Text style={styles.communityDescription}>
                                {community.description || 'Описание пока не добавлено'}
                            </Text>

                            <View style={styles.stats}>
                                <View style={styles.stat}>
                                    <Text style={styles.statNumber}>{community.subscribersCount || 0}</Text>
                                    <Text style={styles.statLabel}>Подписчики</Text>
                                </View>
                                <View style={styles.stat}>
                                    <Text style={styles.statNumber}>{community.postsCount || 0}</Text>
                                    <Text style={styles.statLabel}>Посты</Text>
                                </View>
                            </View>

                            {community.isOwner ? (
                                <TouchableOpacity
                                    style={styles.primaryButton}
                                    onPress={() => setCreateModalVisible(true)}
                                >
                                    <Text style={styles.primaryButtonText}>Создать пост от паблика</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.primaryButton, community.isSubscribed && styles.secondaryButton]}
                                    onPress={handleSubscribeToggle}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.primaryButtonText}>
                                            {community.isSubscribed ? 'Отписаться' : 'Подписаться'}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.postsHeader}>
                            <Text style={styles.postsTitle}>Посты паблика</Text>
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyTitle}>Пока нет постов</Text>
                        <Text style={styles.emptyText}>
                            {community.isOwner
                                ? 'Создайте первый пост от имени паблика.'
                                : 'Посты появятся здесь, когда админ что-нибудь опубликует.'}
                        </Text>
                    </View>
                }
                contentContainerStyle={posts.length === 0 ? styles.emptyContent : undefined}
            />

            <CreatePostModal
                visible={createModalVisible}
                onClose={() => setCreateModalVisible(false)}
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
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: darkTheme.colors.textSecondary,
        marginTop: 10,
        fontSize: 16,
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
        fontSize: 20,
        fontWeight: '700',
    },
    headerActions: {
        minWidth: 40,
        alignItems: 'flex-end',
    },
    headerSpacer: {
        width: 24,
    },
    headerActionText: {
        color: darkTheme.colors.primary,
        fontSize: 15,
        fontWeight: '700',
    },
    topCard: {
        backgroundColor: darkTheme.colors.card,
        margin: 15,
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
    },
    avatar: {
        marginBottom: 12,
    },
    communityName: {
        color: darkTheme.colors.text,
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 6,
        textAlign: 'center',
    },
    communityOwner: {
        color: darkTheme.colors.primary,
        fontSize: 14,
        marginBottom: 8,
    },
    communityDescription: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 16,
    },
    stats: {
        flexDirection: 'row',
        gap: 24,
        marginBottom: 16,
    },
    stat: {
        alignItems: 'center',
    },
    statNumber: {
        color: darkTheme.colors.text,
        fontSize: 20,
        fontWeight: '700',
    },
    statLabel: {
        color: darkTheme.colors.textSecondary,
        fontSize: 12,
    },
    primaryButton: {
        backgroundColor: darkTheme.colors.primary,
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 12,
        minWidth: 200,
        alignItems: 'center',
    },
    secondaryButton: {
        backgroundColor: '#ef4444',
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    postsHeader: {
        paddingHorizontal: 15,
        paddingBottom: 4,
    },
    postsTitle: {
        color: darkTheme.colors.text,
        fontSize: 18,
        fontWeight: '700',
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 40,
    },
    emptyContent: {
        flexGrow: 1,
    },
    emptyTitle: {
        color: darkTheme.colors.text,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    emptyText: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
});
