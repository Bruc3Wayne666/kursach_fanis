import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { darkTheme } from '../themes/dark';
import { API_FILE_URL } from "../utils/constants.ts";
import { formatAudioDuration, parseAudioMessage } from '../utils/audio';

let createSoundModule: null | (() => any) = null;

try {
    const nitroSound = require('react-native-nitro-sound');
    createSoundModule = nitroSound.createSound;
} catch (error) {
    console.warn('Audio module is unavailable until the app is rebuilt:', error);
}

interface MessageBubbleProps {
    message: {
        id: string;
        content: string;
        messageType: 'text' | 'image' | 'audio';
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
    showSender?: boolean;
    onImagePress?: (imageUrl: string) => void;
}

export default function MessageBubble({ message, isOwn, showSender = false, onImagePress }: MessageBubbleProps) {
    const soundRef = useRef<any>(createSoundModule ? createSoundModule() : null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackPosition, setPlaybackPosition] = useState(0);
    const [playbackDuration, setPlaybackDuration] = useState(0);
    const [playbackLoading, setPlaybackLoading] = useState(false);

    const getFileUrl = (url: string) => {
        if (!url) return null;

        if (url.startsWith('http')) {
            return url;
        }

        return `${API_FILE_URL}${url}`;
    };

    const audioPayload = useMemo(() => parseAudioMessage(message.content), [message.content]);
    const audioUrl = audioPayload?.url ? getFileUrl(audioPayload.url) : null;
    const audioDuration = playbackDuration || audioPayload?.durationMs || 0;

    useEffect(() => {
        const sound = soundRef.current;

        return () => {
            if (sound) {
                sound.removePlayBackListener?.();
                sound.removePlaybackEndListener?.();
                sound.stopPlayer?.().catch(() => undefined);
            }
        };
    }, []);

    const stopAudio = async () => {
        if (!soundRef.current) {
            return;
        }

        soundRef.current.removePlayBackListener?.();
        soundRef.current.removePlaybackEndListener?.();
        await soundRef.current.stopPlayer?.().catch(() => undefined);
        setIsPlaying(false);
        setPlaybackLoading(false);
        setPlaybackPosition(0);
    };

    const toggleAudioPlayback = async () => {
        if (!audioUrl) {
            return;
        }

        if (!soundRef.current) {
            return;
        }

        if (isPlaying) {
            await stopAudio();
            return;
        }

        try {
            setPlaybackLoading(true);
            soundRef.current.removePlayBackListener?.();
            soundRef.current.removePlaybackEndListener?.();
            soundRef.current.addPlayBackListener?.((playbackMeta: any) => {
                setPlaybackPosition(playbackMeta.currentPosition || 0);
                setPlaybackDuration(playbackMeta.duration || audioPayload?.durationMs || 0);
            });
            soundRef.current.addPlaybackEndListener?.(() => {
                stopAudio().catch(() => undefined);
            });
            await soundRef.current.startPlayer(audioUrl);
            setIsPlaying(true);
        } catch (error) {
            console.error('Audio playback error:', error);
        } finally {
            setPlaybackLoading(false);
        }
    };

    const renderMessageContent = () => {
        if (message.messageType === 'image') {
            const imageUrl = getFileUrl(message.content);

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

        if (message.messageType === 'audio') {
            return (
                <TouchableOpacity
                    style={[styles.audioCard, !soundRef.current && styles.audioCardDisabled]}
                    onPress={toggleAudioPlayback}
                    activeOpacity={0.85}
                    disabled={!soundRef.current}
                >
                    <View style={[styles.audioButton, isOwn && styles.audioButtonOwn]}>
                        {playbackLoading ? (
                            <ActivityIndicator size="small" color={isOwn ? darkTheme.colors.primary : '#fff'} />
                        ) : (
                            <Text style={[styles.audioButtonText, isOwn && styles.audioButtonTextOwn]}>
                                {isPlaying ? '⏸' : '▶'}
                            </Text>
                        )}
                    </View>
                    <View style={styles.audioContent}>
                        <Text style={[styles.audioTitle, isOwn && styles.ownMessageText]}>
                            Голосовое сообщение
                        </Text>
                        <Text style={[styles.audioDuration, isOwn && styles.audioDurationOwn]}>
                            {formatAudioDuration(isPlaying ? playbackPosition : audioDuration)}
                            {audioDuration > 0 ? ` / ${formatAudioDuration(audioDuration)}` : ''}
                        </Text>
                    </View>
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
    audioCard: {
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: 190,
        gap: 12,
    },
    audioCardDisabled: {
        opacity: 0.7,
    },
    audioButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: darkTheme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    audioButtonOwn: {
        backgroundColor: '#fff',
    },
    audioButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    audioButtonTextOwn: {
        color: darkTheme.colors.primary,
    },
    audioContent: {
        flex: 1,
    },
    audioTitle: {
        color: darkTheme.colors.text,
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    audioDuration: {
        color: darkTheme.colors.textSecondary,
        fontSize: 12,
    },
    audioDurationOwn: {
        color: 'rgba(255,255,255,0.85)',
    },
    messageMeta: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 6,
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
