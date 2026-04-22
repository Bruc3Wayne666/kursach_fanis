import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { login, setError } from '../store/slices/authSlice';
import { api } from '../services/api';
import { darkTheme } from '../themes/dark';

export default function RegisterScreen({ navigation }: any) {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        name: '',
    });
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();
    const authError = useSelector((state: any) => state.auth.error);

    useEffect(() => {
        if (authError) {
            Alert.alert('Ошибка регистрации', authError);
        }
    }, [authError]);

    const handleRegister = async () => {
        const { username, email, password, name } = formData;

        if (!username || !email || !password || !name) {
            Alert.alert('Ошибка', 'Заполните все поля');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Ошибка', 'Пароль должен быть не менее 6 символов');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/auth/register', {
                username,
                email,
                password,
                name,
            });

            console.log('✅ Успешная регистрация:', response.data);
            dispatch(login({
                user: response.data.user,
                token: response.data.token,
            }));

        } catch (error: any) {
            console.log('❌ Ошибка регистрации:', error);
            let errorMessage = 'Произошла ошибка при регистрации';
            if (error.response) {
                errorMessage = error.response.data?.error || `Ошибка сервера: ${error.response.status}`;
            } else if (error.request) {
                errorMessage = 'Нет ответа от сервера. Проверьте подключение';
            } else {
                errorMessage = error.message;
            }
            dispatch(setError(errorMessage));
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.container}>
                        <Text style={styles.title}>Регистрация</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Имя пользователя"
                            placeholderTextColor={darkTheme.colors.textSecondary}
                            value={formData.username}
                            onChangeText={(value) => updateField('username', value)}
                            autoCapitalize="none"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Полное имя"
                            placeholderTextColor={darkTheme.colors.textSecondary}
                            value={formData.name}
                            onChangeText={(value) => updateField('name', value)}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor={darkTheme.colors.textSecondary}
                            value={formData.email}
                            onChangeText={(value) => updateField('email', value)}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Пароль"
                            placeholderTextColor={darkTheme.colors.textSecondary}
                            value={formData.password}
                            onChangeText={(value) => updateField('password', value)}
                            secureTextEntry
                        />

                        <TouchableOpacity
                            style={styles.button}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Зарегистрироваться</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.link}
                            onPress={() => navigation.navigate('Login')}
                        >
                            <Text style={styles.linkText}>Уже есть аккаунт? Войти</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: darkTheme.colors.background,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        minHeight: '100%',
    },
    title: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 40,
    },
    input: {
        backgroundColor: '#1a1a1a',
        color: '#fff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#404040',
        width: '100%',
        fontSize: 16,
        minHeight: 50,
    },
    button: {
        backgroundColor: '#6366f1',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
        width: '100%',
        minHeight: 50,
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    link: {
        marginTop: 15,
        padding: 10,
    },
    linkText: {
        color: '#6366f1',
        fontSize: 14,
    },
});
