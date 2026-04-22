import React, {useState} from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import {darkTheme} from '../themes/dark';
import {api} from '../services/api';
import {updateProfile} from '../store/slices/authSlice'; // Добавляем action

export default function EditProfileScreen({navigation}: any) {
    const user = useSelector((state: any) => state.auth.user);
    const dispatch = useDispatch();
    const [formData, setFormData] = useState({
        name: user?.name || '',
        username: user?.username || '',
        bio: user?.bio || '',
    });
    const [loading, setLoading] = useState(false);

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
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
                bio: formData.bio
            });

            console.log('✅ Ответ сервера:', response.data);

            // Обновляем Redux store
            dispatch(updateProfile({
                name: formData.name,
                username: formData.username,
                bio: formData.bio
            }));

            Alert.alert('Успех', 'Профиль обновлен');
            navigation.goBack();

        } catch (error: any) {
            console.log('❌ Полная ошибка обновления профиля:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                config: error.config
            });

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
