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
    ScrollView,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { login, setError } from '../store/slices/authSlice';
import { api } from '../services/api';
import { darkTheme } from '../themes/dark';

export default function LoginScreen({ navigation }: any) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();
    const authError = useSelector((state: any) => state.auth.error);

    useEffect(() => {
        if (authError) {
            Alert.alert('Ошибка авторизации', authError);
        }
    }, [authError]);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Ошибка', 'Заполните все поля');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/auth/login', { email, password });
            console.log('✅ Успешный вход:', response.data);
            dispatch(login({
                user: response.data.user,
                token: response.data.token,
            }));
        } catch (error: any) {
            console.log('❌ Ошибка входа:', error);
            let errorMessage = 'Произошла ошибка при входе';
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

    const testConnection = async () => {
        try {
            await api.get('/health');
            Alert.alert('✅ Сервер доступен', 'Соединение работает!');
        } catch {
            Alert.alert('❌ Сервер недоступен', 'Проверьте IP адрес и порт');
        }
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
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
                        <Image
                            source={require('../assets/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor={darkTheme.colors.textSecondary}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Пароль"
                            placeholderTextColor={darkTheme.colors.textSecondary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />

                        <TouchableOpacity
                            style={styles.button}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Войти</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.link}
                            onPress={() => navigation.navigate('Register')}
                        >
                            <Text style={styles.linkText}>Нет аккаунта? Зарегистрироваться</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.secondaryButton]}
                            onPress={testConnection}
                        >
                            <Text style={styles.buttonText}>Проверить связь с сервером</Text>
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
    logo: {
        width: 192,
        height: 192,
        borderRadius: 24,
        marginBottom: 16,
    },
    appName: {
        color: darkTheme.colors.text,
        fontSize: 26,
        fontWeight: '700',
        marginBottom: 8,
    },
    title: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 32,
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
    secondaryButton: {
        backgroundColor: 'green',
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
