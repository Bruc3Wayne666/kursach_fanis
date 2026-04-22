// src/components/MessageBubble.tsx - ОБНОВЛЕННАЯ ВЕРСИЯ
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
} from 'react-native';
import { darkTheme } from '../themes/dark';
import {API_BASE_URL, API_FILE_URL} from "../utils/constants.ts";

interface MessageBubbleProps {
    message: {
        id: string;
        content: string;
        messageType: 'text' | 'image';
        createdAt: string;
        senderId: string;
        isRead: boolean;
        Sender?: {
            id: string;
            name: string;
            avatar?: string;
        };
    };
    isOwn: boolean;
    showSender?: boolean; // 🔥 НОВЫЙ ПРОПС ДЛЯ ОТОБРАЖЕНИЯ ИМЕНИ ОТПРАВИТЕЛЯ
    onImagePress?: (imageUrl: string) => void;
}

export default function MessageBubble({ message, isOwn, showSender = false, onImagePress }: MessageBubbleProps) {
    const getImageUrl = (url: string) => {
        if (!url) return null;

        if (url.startsWith('http')) {
            return url;
        }

        // return `http://192.168.0.116:5000${url}`;
        return `${API_FILE_URL}${url}`;
    };

    const renderMessageContent = () => {
        if (message.messageType === 'image') {
            const imageUrl = getImageUrl(message.content);

            return (
                <TouchableOpacity
                    onPress={() => onImagePress?.(imageUrl || message.content)}
                    activeOpacity={0.8}
                >
                    <Image
                        source={{ uri: imageUrl || message.content }}
                        style={styles.messageImage}
                        resizeMode="cover"
                    />
                </TouchableOpacity>
            );
        }

        return (
            <Text style={[
                styles.messageText,
                isOwn && styles.ownMessageText
            ]}>
                {message.content}
            </Text>
        );
    };

    return (
        <View style={[
            styles.container,
            isOwn && styles.ownContainer
        ]}>
            {/* 🔥 ОТОБРАЖАЕМ ИМЯ ОТПРАВИТЕЛЯ В ГРУППОВЫХ ЧАТАХ */}
            {showSender && message.Sender && (
                <Text style={styles.senderName}>
                    {message.Sender.name}
                </Text>
            )}

            <View style={[
                styles.bubble,
                isOwn ? styles.ownBubble : styles.otherBubble
            ]}>
                {renderMessageContent()}

                <View style={styles.messageMeta}>
                    <Text style={[
                        styles.time,
                        isOwn && styles.ownTime
                    ]}>
                        {new Date(message.createdAt).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </Text>

                    {isOwn && (
                        <Text style={styles.readStatus}>
                            {message.isRead ? '✓✓' : '✓'}
                        </Text>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginVertical: 4,
        paddingHorizontal: 15,
    },
    ownContainer: {
        justifyContent: 'flex-end',
    },
    // 🔥 СТИЛЬ ДЛЯ ИМЕНИ ОТПРАВИТЕЛЯ
    senderName: {
        color: darkTheme.colors.textSecondary,
        fontSize: 12,
        marginBottom: 2,
        marginLeft: 10,
    },
    bubble: {
        maxWidth: '75%',
        padding: 12,
        borderRadius: 18,
    },
    ownBubble: {
        backgroundColor: darkTheme.colors.primary,
        borderBottomRightRadius: 4,
    },
    otherBubble: {
        backgroundColor: darkTheme.colors.card,
        borderBottomLeftRadius: 4,
    },
    messageText: {
        color: darkTheme.colors.text,
        fontSize: 16,
        lineHeight: 20,
    },
    ownMessageText: {
        color: '#fff',
    },
    messageImage: {
        width: 200,
        height: 150,
        borderRadius: 12,
        marginBottom: 4,
    },
    messageMeta: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 2,
    },
    time: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        marginRight: 4,
    },
    ownTime: {
        color: 'rgba(255,255,255,0.7)',
    },
    readStatus: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
    },
});
