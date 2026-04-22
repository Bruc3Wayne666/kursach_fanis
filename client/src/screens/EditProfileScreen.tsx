// src/screens/EditProfileScreen.tsx - ДОБАВЛЯЕМ АВАТАР
import React, {useState} from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView,
    Image
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import {launchImageLibrary} from 'react-native-image-picker';
import {darkTheme} from '../themes/dark';
import {api} from '../services/api';
import {updateProfile} from '../store/slices/authSlice';
import {API_FILE_URL} from "../utils/constants.ts";

export default function EditProfileScreen({navigation}: any) {
    const user = useSelector((state: any) => state.auth.user);
    const dispatch = useDispatch();
    const [formData, setFormData] = useState({
        name: user?.name || '',
        username: user?.username || '',
        bio: user?.bio || '',
        avatar: user?.avatar || '' // 🔥 ДОБАВЛЯЕМ АВАТАР
    });
    const [loading, setLoading] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // 🔥 ДОБАВЛЯЕМ ВЫБОР АВАТАРА
    const selectAvatar = async () => {
        try {
            setUploadingAvatar(true);
            const result = await launchImageLibrary({
                mediaType: 'photo',
                quality: 0.8,
                maxWidth: 500,
                maxHeight: 500,
            });

            if (result.assets && result.assets[0]) {
                const selectedImage = result.assets[0];
                console.log('📸 Selected avatar:', selectedImage.uri);

                // Загружаем изображение на сервер
                const uploadFormData = new FormData();
                uploadFormData.append('image', {
                    uri: selectedImage.uri,
                    type: selectedImage.type || 'image/jpeg',
                    name: 'avatar.jpg'
                } as any);

                const uploadResponse = await api.post('/upload', uploadFormData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });

                console.log('✅ Avatar uploaded:', uploadResponse.data.url);

                // Обновляем аватар в форме
                updateField('avatar', uploadResponse.data.url);
            }
        } catch (error) {
            console.error('❌ Avatar selection error:', error);
            Alert.alert('Ошибка', 'Не удалось выбрать изображение');
        } finally {
            setUploadingAvatar(false);
        }
    };

    // 🔥 ДОБАВЛЯЕМ УДАЛЕНИЕ АВАТАРА
    const removeAvatar = () => {
        updateField('avatar', '');
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            Alert.alert('Ошибка', 'Имя не может быть пустым');
            return;
        }

        if (!formData.username.trim()) {
            Alert.alert('Ошибка', 'Username не может быть пустым');
            return;
        }

        setLoading(true);
        try {
            console.log('📤 Отправляем обновление профиля:', formData);

            const response = await api.put('/users/profile', {
                name: formData.name,
                username: formData.username,
                bio: formData.bio,
                avatar: formData.avatar // 🔥 ОТПРАВЛЯЕМ АВАТАР
            });

            console.log('✅ Ответ сервера:', response.data);

            // Обновляем Redux store
            dispatch(updateProfile(response.data.user));

            Alert.alert('Успех', 'Профиль обновлен');
            navigation.goBack();

        } catch (error: any) {
            console.log('❌ Полная ошибка обновления профиля:', error);

            let errorMessage = 'Не удалось обновить профиль';
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.message) {
                errorMessage = error.message;
            }

            Alert.alert('Ошибка', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const getAvatarUrl = () => {
        if (!formData.avatar) return null;

        if (formData.avatar.startsWith('http')) {
            return formData.avatar;
        }

        // return `http://192.168.0.116:5000${formData.avatar}`;
        return `${API_FILE_URL}${formData.avatar}`;
    };

    const avatarUrl = getAvatarUrl();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.cancelButton}>Отмена</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Редактировать профиль</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator size="small" color={darkTheme.colors.primary}/>
                    ) : (
                        <Text style={styles.saveButton}>Сохранить</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                {/* 🔥 ДОБАВЛЯЕМ СЕКЦИЮ АВАТАРА */}
                <View style={styles.avatarSection}>
                    <Text style={styles.sectionTitle}>Аватар</Text>

                    <View style={styles.avatarContainer}>
                        {avatarUrl ? (
                            <View style={styles.avatarWithActions}>
                                <Image
                                    source={{ uri: avatarUrl }}
                                    style={styles.avatarImage}
                                />
                                <View style={styles.avatarActions}>
                                    <TouchableOpacity
                                        style={styles.changeAvatarButton}
                                        onPress={selectAvatar}
                                        disabled={uploadingAvatar}
                                    >
                                        {uploadingAvatar ? (
                                            <ActivityIndicator size="small" color={darkTheme.colors.primary} />
                                        ) : (
                                            <Text style={styles.changeAvatarText}>🔄</Text>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.removeAvatarButton}
                                        onPress={removeAvatar}
                                    >
                                        <Text style={styles.removeAvatarText}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.addAvatarButton}
                                onPress={selectAvatar}
                                disabled={uploadingAvatar}
                            >
                                {uploadingAvatar ? (
                                    <ActivityIndicator size="small" color={darkTheme.colors.primary} />
                                ) : (
                                    <>
                                        <Text style={styles.addAvatarIcon}>📷</Text>
                                        <Text style={styles.addAvatarText}>Добавить аватар</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={styles.form}>
                    <View style={styles.field}>
                        <Text style={styles.label}>Имя</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ваше имя"
                            placeholderTextColor={darkTheme.colors.textSecondary}
                            value={formData.name}
                            onChangeText={(value) => updateField('name', value)}
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Username</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ваш username"
                            placeholderTextColor={darkTheme.colors.textSecondary}
                            value={formData.username}
                            onChangeText={(value) => updateField('username', value)}
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>О себе</Text>
                        <TextInput
                            style={[styles.input, styles.bioInput]}
                            placeholder="Расскажите о себе..."
                            placeholderTextColor={darkTheme.colors.textSecondary}
                            value={formData.bio}
                            onChangeText={(value) => updateField('bio', value)}
                            multiline
                            textAlignVertical="top"
                            maxLength={200}
                        />
                        <Text style={styles.charCount}>
                            {formData.bio.length}/200
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// 🔥 ДОБАВЛЯЕМ НОВЫЕ СТИЛИ ДЛЯ АВАТАРА
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
    cancelButton: {
        color: darkTheme.colors.text,
        fontSize: 16,
    },
    title: {
        color: darkTheme.colors.text,
        fontSize: 18,
        fontWeight: '600',
    },
    saveButton: {
        color: darkTheme.colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    avatarSection: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: darkTheme.colors.border,
    },
    sectionTitle: {
        color: darkTheme.colors.text,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 15,
    },
    avatarContainer: {
        alignItems: 'center',
    },
    avatarWithActions: {
        alignItems: 'center',
        position: 'relative',
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 10,
    },
    avatarActions: {
        flexDirection: 'row',
        gap: 10,
    },
    changeAvatarButton: {
        backgroundColor: darkTheme.colors.primary,
        padding: 8,
        borderRadius: 20,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    changeAvatarText: {
        color: '#fff',
        fontSize: 16,
    },
    removeAvatarButton: {
        backgroundColor: '#ef4444',
        padding: 8,
        borderRadius: 20,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeAvatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    addAvatarButton: {
        backgroundColor: darkTheme.colors.card,
        borderWidth: 2,
        borderColor: darkTheme.colors.border,
        borderStyle: 'dashed',
        padding: 30,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        width: 100,
        height: 100,
    },
    addAvatarIcon: {
        fontSize: 24,
        marginBottom: 5,
    },
    addAvatarText: {
        color: darkTheme.colors.textSecondary,
        fontSize: 12,
        textAlign: 'center',
    },
    form: {
        padding: 15,
    },
    field: {
        marginBottom: 20,
    },
    label: {
        color: darkTheme.colors.text,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        backgroundColor: darkTheme.colors.card,
        color: darkTheme.colors.text,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: darkTheme.colors.border,
        fontSize: 16,
    },
    bioInput: {
        height: 100,
        textAlignVertical: 'top',
    },
    charCount: {
        color: darkTheme.colors.textSecondary,
        fontSize: 12,
        textAlign: 'right',
        marginTop: 4,
    },
});
