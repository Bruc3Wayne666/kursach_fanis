import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { api } from '../services/api';
import { darkTheme } from '../themes/dark';
import { getAvatarUrl } from '../utils/avatar';

export default function CommunityFormScreen({ navigation, route }: any) {
    const communityId = route.params?.communityId;
    const isEditMode = Boolean(communityId);
    const [loading, setLoading] = useState(isEditMode);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [form, setForm] = useState({
        name: '',
        description: '',
        avatar: null as string | null,
    });

    const loadCommunity = useCallback(async () => {
        if (!communityId) {
            return;
        }

        try {
            setLoading(true);
            const response = await api.get(`/communities/${communityId}`);
            const community = response.data.community;
            setForm({
                name: community.name || '',
                description: community.description || '',
                avatar: community.avatar || null,
            });
        } catch (error) {
            console.error('Load community for form error:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить паблик');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    }, [communityId, navigation]);

    useEffect(() => {
        loadCommunity();
    }, [loadCommunity]);

    const handlePickAvatar = async () => {
        try {
            setUploadingAvatar(true);
            const result = await launchImageLibrary({
                mediaType: 'photo',
                quality: 0.8,
                maxWidth: 600,
                maxHeight: 600,
            });

            const asset = result.assets?.[0];
            if (!asset?.uri) {
                return;
            }

            const formData = new FormData();
            formData.append('image', {
                uri: asset.uri,
                type: asset.type || 'image/jpeg',
                name: 'community-avatar.jpg',
            } as any);

            const uploadResponse = await api.post('/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setForm((prev) => ({
                ...prev,
                avatar: uploadResponse.data.url,
            }));
        } catch (error) {
            console.error('Upload community avatar error:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить аватар');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            Alert.alert('Ошибка', 'Введите название паблика');
            return;
        }

        try {
            setSaving(true);
            if (isEditMode) {
                const response = await api.put(`/communities/${communityId}`, form);
                navigation.replace('Community', { communityId: response.data.community.id });
            } else {
                const response = await api.post('/communities', form);
                navigation.replace('Community', { communityId: response.data.community.id });
            }
        } catch (error: any) {
            console.error('Save community error:', error);
            Alert.alert('Ошибка', error.response?.data?.error || 'Не удалось сохранить паблик');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={darkTheme.colors.primary} />
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
                <Text style={styles.title}>{isEditMode ? 'Редактировать паблик' : 'Создать паблик'}</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                    {saving ? (
                        <ActivityIndicator size="small" color={darkTheme.colors.primary} />
                    ) : (
                        <Text style={styles.saveButton}>Сохранить</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.avatarBlock}>
                    {form.avatar ? (
                        <Image source={{ uri: getAvatarUrl(form.avatar) || undefined }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarPlaceholderText}>📣</Text>
                        </View>
                    )}
                    <TouchableOpacity
                        style={styles.avatarButton}
                        onPress={handlePickAvatar}
                        disabled={uploadingAvatar}
                    >
                        {uploadingAvatar ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.avatarButtonText}>Изменить аватар</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <Text style={styles.label}>Название</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Например, Новости проекта"
                    placeholderTextColor={darkTheme.colors.textSecondary}
                    value={form.name}
                    onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
                />

                <Text style={styles.label}>Описание</Text>
                <TextInput
                    style={[styles.input, styles.descriptionInput]}
                    placeholder="О чем ваш паблик?"
                    placeholderTextColor={darkTheme.colors.textSecondary}
                    value={form.description}
                    onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
                    multiline
                    textAlignVertical="top"
                />
            </ScrollView>
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
        fontWeight: '700',
    },
    saveButton: {
        color: darkTheme.colors.primary,
        fontSize: 15,
        fontWeight: '700',
    },
    content: {
        padding: 16,
    },
    avatarBlock: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatar: {
        width: 110,
        height: 110,
        borderRadius: 55,
        marginBottom: 12,
    },
    avatarPlaceholder: {
        backgroundColor: darkTheme.colors.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarPlaceholderText: {
        fontSize: 32,
    },
    avatarButton: {
        backgroundColor: darkTheme.colors.primary,
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    avatarButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    label: {
        color: darkTheme.colors.text,
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
    },
    input: {
        backgroundColor: darkTheme.colors.card,
        borderWidth: 1,
        borderColor: darkTheme.colors.border,
        color: darkTheme.colors.text,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 16,
        fontSize: 15,
    },
    descriptionInput: {
        minHeight: 120,
    },
});
