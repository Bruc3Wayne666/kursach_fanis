import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../store/slices/authSlice';
import { darkTheme } from '../themes/dark';

export default function LoginScreen({ navigation }: any) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const dispatch = useDispatch();
    const { isLoading, error } = useSelector((state: any) => state.auth);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Ошибка', 'Заполните все поля');
            return;
        }

        try {
            // @ts-ignore
            const result = await dispatch(loginUser({ email, password }));
            if (result.error) {
                Alert.alert('Ошибка', 'Неверные данные');
            }
        } catch (err) {
            Alert.alert('Ошибка', 'Что-то пошло не так');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Вход</Text>

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

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
                style={styles.button}
                onPress={handleLogin}
                disabled={isLoading}
            >
                <Text style={styles.buttonText}>
                    {isLoading ? 'Вход...' : 'Войти'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.link}
                onPress={() => navigation.navigate('Register')}
            >
                <Text style={styles.linkText}>Нет аккаунта? Зарегистрироваться</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: darkTheme.colors.background,
        padding: darkTheme.spacing.xl,
        justifyContent: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: darkTheme.colors.text,
        marginBottom: darkTheme.spacing.xl,
        textAlign: 'center',
    },
    input: {
        backgroundColor: darkTheme.colors.surface,
        color: darkTheme.colors.text,
        padding: darkTheme.spacing.md,
        borderRadius: darkTheme.borderRadius.md,
        marginBottom: darkTheme.spacing.md,
        borderWidth: 1,
        borderColor: darkTheme.colors.border,
    },
    button: {
        backgroundColor: darkTheme.colors.primary,
        padding: darkTheme.spacing.md,
        borderRadius: darkTheme.borderRadius.md,
        alignItems: 'center',
        marginTop: darkTheme.spacing.md,
    },
    buttonText: {
        color: darkTheme.colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    link: {
        marginTop: darkTheme.spacing.md,
        alignItems: 'center',
    },
    linkText: {
        color: darkTheme.colors.primary,
        fontSize: 14,
    },
    error: {
        color: darkTheme.colors.error,
        textAlign: 'center',
        marginBottom: darkTheme.spacing.md,
    },
});
