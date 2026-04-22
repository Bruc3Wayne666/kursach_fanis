import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { searchUsers, followUser, unfollowUser, clearSearch } from '../store/slices/usersSlice';
import { darkTheme } from '../themes/dark';

export default function SearchScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const dispatch = useDispatch();
    const { searchResults, searchLoading, searchError } = useSelector((state: any) => state.users);
    const [followLoading, setFollowLoading] = useState<string | null>(null);

    useEffect(() => {
        if (searchError) {
            Alert.alert('Ошибка', searchError);
        }
    }, [searchError]);

    useEffect(() => {
        return () => {
            dispatch(clearSearch());
        };
    }, [dispatch]);

    const handleSearch = () => {
        if (searchQuery.trim().length < 2) {
            Alert.alert('Ошибка', 'Введите хотя бы 2 символа для поиска');
            return;
        }
        dispatch(searchUsers(searchQuery.trim()) as any);
    };

    const handleFollow = async (userId: string, isCurrentlyFollowing: boolean) => {
        console.log('🔔 Follow button clicked:', { userId, isCurrentlyFollowing });

        setFollowLoading(userId);

        try {
            if (isCurrentlyFollowing) {
                console.log('🔔 Unfollowing user:', userId);
                const result = await dispatch(unfollowUser(userId) as any);
                console.log('🔔 Unfollow result:', result);
            } else {
                console.log('🔔 Following user:', userId);
                const result = await dispatch(followUser(userId) as any);
                console.log('🔔 Follow result:', result);
            }

        } catch (error: any) {
            console.error('❌ Follow error:', error);
            Alert.alert('Ошибка', error.message || 'Не удалось выполнить действие');
        } finally {
            setFollowLoading(null);
        }
    };

    const renderUserItem = ({ item }: { item: any }) => {
        const isLoading = followLoading === item.id;

        console.log('🔔 Rendering user:', { id: item.id, name: item.name, isFollowing: item.isFollowing });

        return (
            <View style={styles.userCard}>
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userUsername}>@{item.username}</Text>
                    {item.bio ? (
                        <Text style={styles.userBio}>{item.bio}</Text>
                    ) : null}
                </View>

                <TouchableOpacity
                    style={[
                        styles.followButton,
                        item.isFollowing ? styles.unfollowButton : styles.followButtonActive,
                        isLoading && styles.loadingButton
                    ]}
                    onPress={() => handleFollow(item.id, item.isFollowing)}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color={darkTheme.colors.text} />
                    ) : (
                        <Text style={[
                            styles.followButtonText,
                            item.isFollowing && styles.unfollowButtonText
                        ]}>
                            {item.isFollowing ? 'Отписаться' : 'Подписаться'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Поиск</Text>
            </View>

            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Введите имя или username..."
                    placeholderTextColor={darkTheme.colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                />
                <TouchableOpacity
                    style={styles.searchButton}
                    onPress={handleSearch}
                    disabled={searchLoading}
                >
                    {searchLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.searchButtonText}>🔍</Text>
                    )}
                </TouchableOpacity>
            </View>

            {searchResults.length > 0 ? (
                <FlatList
                    data={searchResults}
                    renderItem={renderUserItem}
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={false}
                    style={styles.resultsList}
                />
            ) : searchQuery.length >= 2 && !searchLoading ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Пользователи не найдены</Text>
                    <Text style={styles.emptySubtext}>
                        Попробуйте изменить запрос поиска
                    </Text>
                </View>
            ) : (
                <View style={styles.initialContainer}>
                    <Text style={styles.initialText}>Найдите друзей</Text>
                    <Text style={styles.initialSubtext}>
                        Введите имя или username пользователя
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
}

// Стили остаются теми же...
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: darkTheme.colors.background,
    },
    header: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: darkTheme.colors.border,
    },
    title: {
        color: darkTheme.colors.text,
        fontSize: 24,
        fontWeight: 'bold',
    },
    searchContainer: {
        flexDirection: 'row',
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
    searchButton: {
        backgroundColor: darkTheme.colors.primary,
        padding: 12,
        borderRadius: 8,
        width: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchButtonText: {
        color: '#fff',
        fontSize: 18,
    },
    resultsList: {
        flex: 1,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: darkTheme.colors.border,
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
        color: darkTheme.colors.primary,
        fontSize: 14,
        marginBottom: 4,
    },
    userBio: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
    },
    followButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 100,
        alignItems: 'center',
        justifyContent: 'center',
        height: 36,
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
    },
    emptySubtext: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
    },
    initialContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    initialText: {
        color: darkTheme.colors.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    initialSubtext: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
    },
});
