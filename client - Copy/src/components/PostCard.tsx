import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image
} from 'react-native';
import { darkTheme } from '../themes/dark';

interface Post {
    id: string;
    title: string;
    content: string;
    author: string;
    createdAt: string;
    likesCount: number;
    commentsCount: number; // Теперь это реальное число
    image?: string;
    isLiked?: boolean;
}

interface PostCardProps {
    post: Post;
    onPress?: () => void;
    onLike?: (postId: string, isCurrentlyLiked: boolean) => void; // Изменяем сигнатуру
    onComment?: (postId: string) => void;
}

export default function PostCard({ post, onPress, onLike, onComment }: PostCardProps) {
    const handleLike = () => {
        onLike?.(post.id, post.isLiked || false); // Передаем текущее состояние лайка
    };

    const handleComment = () => {
        onComment?.(post.id);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={onPress}>
                <Text style={styles.author}>{post.author}</Text>
                <Text style={styles.date}>{post.createdAt}</Text>

                {post.title ? (
                    <Text style={styles.title}>{post.title}</Text>
                ) : null}

                {post.image && (
                    <Image
                        source={{ uri: post.image }}
                        style={styles.postImage}
                        resizeMode="cover"
                    />
                )}

                <Text style={styles.content}>{post.content}</Text>
            </TouchableOpacity>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleLike}
                >
                    <Text style={[styles.actionText, post.isLiked && styles.liked]}>
                        {post.isLiked ? '❤️' : '🤍'} {post.likesCount}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleComment}
                >
                    <Text style={styles.actionText}>💬 {post.commentsCount || 0}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: darkTheme.colors.card,
        padding: 15,
        marginVertical: 5,
        marginHorizontal: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: darkTheme.colors.border,
    },
    author: {
        color: darkTheme.colors.primary,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    date: {
        color: darkTheme.colors.textSecondary,
        fontSize: 12,
        marginBottom: 10,
    },
    title: {
        color: darkTheme.colors.text,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    content: {
        color: darkTheme.colors.text,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 10,
    },
    postImage: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        marginBottom: 10,
    },
    actions: {
        flexDirection: 'row',
        marginTop: 15,
        borderTopWidth: 1,
        borderTopColor: darkTheme.colors.border,
        paddingTop: 10,
    },
    actionButton: {
        marginRight: 20,
    },
    actionText: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
    },
    liked: {
        color: '#ff375f',
    },
});
