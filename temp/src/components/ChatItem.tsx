// src/components/ChatItem.tsx
import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image
} from 'react-native';
import { darkTheme } from '../themes/dark';

interface ChatItemProps {
    chat: {
        partner: {
            id: string;
            name: string;
            username: string;
            avatar?: string;
            isOnline: boolean;
        };
        lastMessage?: {
            content: string;
            createdAt: string;
            senderId: string;
            messageType: 'text' | 'image';
        };
        unreadCount: number;
        updatedAt: string;
    };
    onPress: () => void;
}

export default function ChatItem({ chat, onPress }: ChatItemProps) {
    const { partner, lastMessage, unreadCount } = chat;

    const getLastMessagePreview = () => {
        if (!lastMessage) return 'Нет сообщений';

        if (lastMessage.messageType === 'image') {
            return '📷 Фото';
        }

        return lastMessage.content.length > 40
            ? lastMessage.content.substring(0, 40) + '...'
            : lastMessage.content;
    };

    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                    {partner.avatar ? (
                        <Image source={{ uri: partner.avatar }} style={styles.avatarImage} />
                    ) : (
                        <Text style={styles.avatarText}>
                            {partner.name.charAt(0).toUpperCase()}
                        </Text>
                    )}
                </View>
                {partner.isOnline && <View style={styles.onlineDot} />}
            </View>

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.name}>{partner.name}</Text>
                    {lastMessage && (
                        <Text style={styles.time}>
                            {new Date(lastMessage.createdAt).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </Text>
                    )}
                </View>

                <View style={styles.messagePreview}>
                    <Text
                        style={[
                            styles.previewText,
                            unreadCount > 0 && styles.unreadPreview
                        ]}
                        numberOfLines={1}
                    >
                        {getLastMessagePreview()}
                    </Text>

                    {unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadCount}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: darkTheme.colors.border,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: darkTheme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    avatarText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#10b981',
        borderWidth: 2,
        borderColor: darkTheme.colors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        color: darkTheme.colors.text,
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    time: {
        color: darkTheme.colors.textSecondary,
        fontSize: 12,
    },
    messagePreview: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    previewText: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
        flex: 1,
    },
    unreadPreview: {
        color: darkTheme.colors.text,
        fontWeight: '500',
    },
    unreadBadge: {
        backgroundColor: darkTheme.colors.primary,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    unreadCount: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        paddingHorizontal: 6,
    },
});
