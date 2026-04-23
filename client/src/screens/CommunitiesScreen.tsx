import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import Avatar from '../components/Avatar';
import { api } from '../services/api';
import { darkTheme } from '../themes/dark';

export default function CommunitiesScreen() {
    const navigation = useNavigation<any>();
    const isFocused = useIsFocused();
    const [activeTab, setActiveTab] = useState<'owned' | 'subscribed'>('owned');
    const [ownedCommunities, setOwnedCommunities] = useState<any[]>([]);
    const [subscribedCommunities, setSubscribedCommunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    const loadCommunities = useCallback(async (silent = false) => {
        try {
            if (!silent) {
                setLoading(true);
            }

            const [ownedResponse, subscribedResponse] = await Promise.all([
                api.get('/communities/my'),
                api.get('/communities/subscribed'),
            ]);

            setOwnedCommunities(ownedResponse.data.communities || []);
            setSubscribedCommunities(subscribedResponse.data.communities || []);
        } catch (error) {
            console.error('Load communities error:', error);
        } finally {
            if (!silent) {
                setLoading(false);
            }
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

        pollingRef.current = setInterval(() => {
            loadCommunities(true);
        }, 5000);
    }, [isFocused, loadCommunities]);

    useEffect(() => {
        if (isFocused) {
            loadCommunities();
            startPolling();
        } else {
            stopPolling();
        }

        return () => {
            stopPolling();
        };
    }, [isFocused, loadCommunities, startPolling, stopPolling]);

    const communities = useMemo(() => (
        activeTab === 'owned' ? ownedCommunities : subscribedCommunities
    ), [activeTab, ownedCommunities, subscribedCommunities]);

    const renderCommunity = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.communityCard}
            onPress={() => navigation.navigate('Community', { communityId: item.id })}
        >
            <Avatar
                avatar={item.avatar}
                name={item.name}
                size={52}
                style={styles.avatar}
            />
            <View style={styles.communityInfo}>
                <Text style={styles.communityName}>{item.name}</Text>
                <Text style={styles.communityMeta}>
                    {item.subscribersCount || 0} подписчиков • {item.postsCount || 0} постов
                </Text>
                <Text style={styles.communityDescription} numberOfLines={2}>
                    {item.description || 'Описание пока не добавлено'}
                </Text>
            </View>
            {item.isOwner && (
                <View style={styles.ownerBadge}>
                    <Text style={styles.ownerBadgeText}>Админ</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={darkTheme.colors.primary} />
                    <Text style={styles.loadingText}>Загрузка пабликов...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>← Назад</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Паблики</Text>
                <TouchableOpacity onPress={() => navigation.navigate('CommunityForm')}>
                    <Text style={styles.createButton}>+ Создать</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'owned' && styles.activeTab]}
                    onPress={() => setActiveTab('owned')}
                >
                    <Text style={[styles.tabText, activeTab === 'owned' && styles.activeTabText]}>
                        Мои ({ownedCommunities.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'subscribed' && styles.activeTab]}
                    onPress={() => setActiveTab('subscribed')}
                >
                    <Text style={[styles.tabText, activeTab === 'subscribed' && styles.activeTabText]}>
                        Подписки ({subscribedCommunities.length})
                    </Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={communities}
                renderItem={renderCommunity}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            loadCommunities();
                        }}
                        tintColor={darkTheme.colors.primary}
                        colors={[darkTheme.colors.primary]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyTitle}>
                            {activeTab === 'owned' ? 'У вас пока нет пабликов' : 'Пока нет подписок на паблики'}
                        </Text>
                        <Text style={styles.emptyText}>
                            {activeTab === 'owned'
                                ? 'Создайте свой первый паблик и публикуйте посты от его имени.'
                                : 'Подпишитесь на интересные паблики, чтобы видеть их посты в ленте.'}
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
    createButton: {
        color: darkTheme.colors.primary,
        fontSize: 15,
        fontWeight: '700',
    },
    tabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: darkTheme.colors.border,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: darkTheme.colors.primary,
    },
    tabText: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    activeTabText: {
        color: darkTheme.colors.primary,
    },
    communityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: darkTheme.colors.border,
    },
    avatar: {
        marginRight: 12,
    },
    communityInfo: {
        flex: 1,
    },
    communityName: {
        color: darkTheme.colors.text,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    communityMeta: {
        color: darkTheme.colors.primary,
        fontSize: 12,
        marginBottom: 4,
    },
    communityDescription: {
        color: darkTheme.colors.textSecondary,
        fontSize: 13,
        lineHeight: 18,
    },
    ownerBadge: {
        backgroundColor: darkTheme.colors.primary,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    ownerBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyTitle: {
        color: darkTheme.colors.text,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyText: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
});
