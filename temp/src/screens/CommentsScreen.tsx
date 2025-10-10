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
import { useSelector } from 'react-redux';
import { darkTheme } from '../themes/dark';
import { api } from '../services/api';

export default function CommentsScreen({ route, navigation }: any) {
    const { postId } = route.params;
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const user = useSelector((state: any) => state.auth.user);

    useEffect(() => {
        loadComments();
    }, []);

    const loadComments = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/posts/${postId}/comments`);
            setComments(response.data.comments || []);
        } catch (error) {
            console.error('Error loading comments:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить комментарии');
        } finally {
            setLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        console.log('📤 Sending comment:', { postId, content: newComment });

        setSending(true);
        try {
            const response = await api.post(`/posts/${postId}/comments`, {
                content: newComment
            });

            console.log('✅ Comment response:', response.data);

            setComments(prev => [...prev, response.data.comment]);
            setNewComment('');

        } catch (error: any) {
            console.error('❌ Error adding comment:', error);
            console.error('❌ Error response:', error.response?.data);
            Alert.alert('Ошибка', error.response?.data?.error || 'Не удалось добавить комментарий');
        } finally {
            setSending(false);
        }
    };

    const renderComment = ({ item }: { item: any }) => (
        <View style={styles.commentCard}>
            <Text style={styles.commentAuthor}>
                {item.User?.name || item.User?.username || 'Аноним'}
            </Text>
            <Text style={styles.commentText}>{item.content}</Text>
            <Text style={styles.commentTime}>
                {new Date(item.createdAt).toLocaleString('ru-RU')}
            </Text>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color={darkTheme.colors.primary} />
                <Text style={styles.loadingText}>Загрузка комментариев...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>← Назад</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Комментарии</Text>
                <View style={styles.placeholder} />
            </View>

            <FlatList
                data={comments}
                renderItem={renderComment}
                keyExtractor={item => item.id}
                style={styles.commentsList}
                refreshing={loading}
                onRefresh={loadComments}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Пока нет комментариев</Text>
                        <Text style={styles.emptySubtext}>Будьте первым!</Text>
                    </View>
                }
            />

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.commentInput}
                    placeholder="Добавить комментарий..."
                    placeholderTextColor={darkTheme.colors.textSecondary}
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                    maxLength={500}
                />
                <TouchableOpacity
                    style={[
                        styles.sendButton,
                        (!newComment.trim() || sending) && styles.sendButtonDisabled
                    ]}
                    onPress={handleAddComment}
                    disabled={!newComment.trim() || sending}
                >
                    {sending ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.sendButtonText}>➤</Text>
                    )}
                </TouchableOpacity>
            </View>
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
    title: {
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
    commentsList: {
        flex: 1,
        padding: 15,
    },
    commentCard: {
        backgroundColor: darkTheme.colors.card,
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
    },
    commentAuthor: {
        color: darkTheme.colors.primary,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 5,
    },
    commentText: {
        color: darkTheme.colors.text,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 5,
    },
    commentTime: {
        color: darkTheme.colors.textSecondary,
        fontSize: 12,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        color: darkTheme.colors.text,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptySubtext: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: darkTheme.colors.border,
        alignItems: 'flex-end',
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
    sendButton: {
        backgroundColor: darkTheme.colors.primary,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    sendButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
