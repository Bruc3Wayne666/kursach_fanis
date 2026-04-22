import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image
} from 'react-native';
import { darkTheme } from '../themes/dark';
import {API_BASE_URL, API_FILE_URL} from "../utils/constants.ts";

interface Post {
    id: string;
    title: string;
    content: string;
    author: string;
    createdAt: string;
    likesCount: number;
    commentsCount: number;
    image?: string;
    isLiked?: boolean;
}

// В PostCard.tsx измени интерфейс:
interface PostCardProps {
    post: Post;
    onPress?: () => void;
    // Меняем void на Promise<void> или any
    onLike?: (postId: string, isCurrentlyLiked: boolean) => Promise<any> | void;
    onComment?: (postId: string) => void;
}

export default function PostCard({ post, onPress, onLike, onComment }: PostCardProps) {
    // const handleLike = () => {
    //     onLike?.(post.id, post.isLiked || false);
    // };

    const [isLiking, setIsLiking] = React.useState(false);

    const handleLike = async () => {
        if (isLiking) return; // Защита от двойного клика

        setIsLiking(true);
        try {
            // 2. Ждем выполнения асинхронного экшена
            await onLike?.(post.id, post.isLiked || false);
        } catch (error) {
            console.error('Like error:', error);
        } finally {
            // 3. Разблокируем только когда пришел ответ от сервера
            setIsLiking(false);
        }
    };

    const handleComment = () => {
        onComment?.(post.id);
    };

    // ДЕБАГ - логируем что пришло в пост
    console.log('🎨 PostCard получил пост:', {
        id: post.id,
        author: post.author,
        image: post.image,
        hasImage: !!post.image
    });

    const getImageUrl = () => {
        if (!post.image) return null;

        if (post.image.startsWith('http')) {
            return post.image;
        }

        // return `http://192.168.0.116:5000${post.image}`;
        return `${API_FILE_URL}${post.image}`;
    };

    const imageUrl = getImageUrl();

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={onPress}>
                <Text style={styles.author}>{post.author}</Text>
                <Text style={styles.date}>{post.createdAt}</Text>

                {post.title && (
                    <Text style={styles.title}>{post.title}</Text>
                )}

                {/* ВРЕМЕННО ПОКАЗЫВАЕМ ДАЖЕ ЕСЛИ imageUrl null */}
                {post.image && (
                    <View style={styles.imageSection}>
                        {/*<Text style={styles.debugText}>Image: {post.image}</Text>*/}
                        {/*<Text style={styles.debugText}>URL: {imageUrl || 'NULL'}</Text>*/}
                        {imageUrl ? (
                            <Image
                                source={{ uri: imageUrl }}
                                style={styles.postImage}
                                resizeMode="cover"
                                onError={(e) => console.log('❌ Ошибка загрузки:', e.nativeEvent.error)}
                            />
                        ) : (
                            <View style={styles.placeholder}>
                                <Text>Неверный URL изображения</Text>
                            </View>
                        )}
                    </View>
                )}

                <Text style={styles.content}>{post.content}</Text>
            </TouchableOpacity>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleLike}
                    disabled={isLiking} // Блокируем кнопку физически
                >
                    <Text style={[
                        styles.actionText,
                        post.isLiked && styles.liked,
                        isLiking && { opacity: 0.5 } // Визуальный фидбек
                    ]}>
                        {post.isLiked ? '❤️' : '🤍'} {post.likesCount}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
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
    imageSection: {
        marginBottom: 10,
    },
    postImage: {
        width: '100%',
        height: 200,
        borderRadius: 8,
    },
    placeholder: {
        width: '100%',
        height: 100,
        backgroundColor: '#333',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    debugText: {
        color: 'red',
        fontSize: 10,
        marginBottom: 2,
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
