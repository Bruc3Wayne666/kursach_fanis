// src/screens/CommentsScreen.tsx - ИСПРАВЛЕННЫЙ КОД
import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    RefreshControl // 🔥 ДОБАВЛЯЕМ ИМПОРТ
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { darkTheme } from '../themes/dark';
import { api } from '../services/api';
import Avatar from '../components/Avatar';
import { formatPostDateTime } from '../utils/format';

interface Comment {
    id: string;
    content: string;
    createdAt: string;
    User: {
        id: string;
        username: string;
        name: string;
        avatar?: string;
    };
}

interface CommentsScreenProps {
    route: {
        params: {
            postId: string;
            onCommentAdded?: () => void;
        };
    };
    navigation: any;
}

export default function CommentsScreen({ route, navigation }: CommentsScreenProps) {
    const { postId, onCommentAdded } = route.params;

    const [comments, setComments] = useState<Comment[]>([]);
    const [commentText, setCommentText] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const loadComments = useCallback(async () => {
        try {
            const response = await api.get(`/posts/${postId}/comments`);
            setComments(response.data.comments || []);
        } catch (error) {
            console.error('Error loading comments:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить комментарии');
        } finally {
            setLoading(false);
        }
    }, [postId]);

    useEffect(() => {
        loadComments();
    }, [loadComments]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadComments();
        setRefreshing(false);
    };

    const handleSubmitComment = async () => {
        if (!commentText.trim()) return;

        setSubmitting(true);
        try {
            const response = await api.post(`/posts/${postId}/comments`, {
                content: commentText
            });

            const newComment = response.data.comment;
            setComments(prev => [newComment, ...prev]);
            setCommentText('');

            if (onCommentAdded) {
                onCommentAdded();
            }

            Alert.alert('Успех', 'Комментарий добавлен');
        } catch (error) {
            console.error('Error creating comment:', error);
            Alert.alert('Ошибка', 'Не удалось отправить комментарий');
        } finally {
            setSubmitting(false);
        }
    };

    const renderCommentItem = ({ item }: { item: Comment }) => (
        <View style={styles.commentItem}>
            <View style={styles.commentHeader}>
                <Avatar
                    avatar={item.User.avatar}
                    name={item.User.name}
                    username={item.User.username}
                    size={36}
                    style={styles.avatarContainer}
                    textStyle={styles.avatarText}
                />
                <View style={styles.commentInfo}>
                    <Text style={styles.commentAuthor}>{item.User.name}</Text>
                    <Text style={styles.commentTime}>{formatPostDateTime(item.createdAt)}</Text>
                </View>
            </View>
            <Text style={styles.commentContent}>{item.content}</Text>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.centerContainer} edges={['left', 'right', 'bottom']}>
                <ActivityIndicator size="large" color={darkTheme.colors.primary} />
                <Text style={styles.loadingText}>Загрузка комментариев...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            {/* Шапка */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>← Назад</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Комментарии</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            {/* Список комментариев */}
            <FlatList
                data={comments}
                renderItem={renderCommentItem}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl // 🔥 ТЕПЕРЬ РАБОТАЕТ
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={darkTheme.colors.primary}
                        colors={[darkTheme.colors.primary]}
                    />
                }
                contentContainerStyle={styles.commentsList}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Пока нет комментариев</Text>
                        <Text style={styles.emptySubtext}>
                            Будьте первым, кто оставит комментарий!
                        </Text>
                    </View>
                }
            />

            {/* Поле ввода комментария */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.inputContainer}
            >
                <TextInput
                    style={styles.commentInput}
                    placeholder="Напишите комментарий..."
                    placeholderTextColor={darkTheme.colors.textSecondary}
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                    maxLength={500}
                    editable={!submitting}
                />
                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        (!commentText.trim() || submitting) && styles.submitButtonDisabled
                    ]}
                    onPress={handleSubmitComment}
                    disabled={!commentText.trim() || submitting}
                >
                    {submitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.submitButtonText}>Отправить</Text>
                    )}
                </TouchableOpacity>
            </KeyboardAvoidingView>
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
    commentsList: {
        flexGrow: 1,
        padding: 15,
    },
    commentItem: {
        backgroundColor: darkTheme.colors.card,
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: darkTheme.colors.border,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    avatarContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: darkTheme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    avatarText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    commentInfo: {
        flex: 1,
    },
    commentAuthor: {
        color: darkTheme.colors.text,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    commentTime: {
        color: darkTheme.colors.textSecondary,
        fontSize: 12,
    },
    commentContent: {
        color: darkTheme.colors.text,
        fontSize: 14,
        lineHeight: 20,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyText: {
        color: darkTheme.colors.text,
        fontSize: 16,
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
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: darkTheme.colors.border,
        backgroundColor: darkTheme.colors.background,
    },
    commentInput: {
        flex: 1,
        backgroundColor: darkTheme.colors.card,
        color: darkTheme.colors.text,
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: darkTheme.colors.border,
        fontSize: 16,
        maxHeight: 100,
        marginRight: 10,
    },
    submitButton: {
        backgroundColor: darkTheme.colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});
