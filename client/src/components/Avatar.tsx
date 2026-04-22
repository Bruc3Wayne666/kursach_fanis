import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { darkTheme } from '../themes/dark';
import { getAvatarUrl, getUserInitial } from '../utils/avatar';

interface AvatarProps {
    avatar?: string | null;
    name?: string | null;
    username?: string | null;
    size?: number;
    style?: any;
    textStyle?: any;
}

export default function Avatar({
    avatar,
    name,
    username,
    size = 40,
    style,
    textStyle,
}: AvatarProps) {
    const avatarUrl = getAvatarUrl(avatar);
    const initials = getUserInitial(name, username);

    return (
        <View
            style={[
                styles.avatar,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                },
                style,
            ]}
        >
            {avatarUrl ? (
                <Image
                    source={{ uri: avatarUrl }}
                    style={{
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                    }}
                />
            ) : (
                <Text
                    style={[
                        styles.avatarText,
                        { fontSize: Math.max(14, size * 0.38) },
                        textStyle,
                    ]}
                >
                    {initials}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    avatar: {
        backgroundColor: darkTheme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarText: {
        color: '#fff',
        fontWeight: '700',
    },
});
