import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Image,
    Alert,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { darkTheme } from '../themes/dark';

interface CreatePostModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (title: string, content: string, image?: string) => void;
}

export default function CreatePostModal({ visible, onClose, onSubmit }: CreatePostModalProps) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [image, setImage] = useState<string | null>(null);

    const selectImage = async () => {
        try {
            const result = await launchImageLibrary({
                mediaType: 'photo',
                quality: 0.8,
                maxWidth: 1024,
                maxHeight: 1024,
            });

            if (result.assets && result.assets[0]) {
                const selectedImage = result.assets[0];
                setImage(selectedImage.uri || null);
                console.log('✅ Изображение выбрано:', selectedImage.uri);
            } else {
                console.log('❌ Пользователь отменил выбор');
            }
        } catch (error) {
            console.log('❌ Image selection error:', error);
            Alert.alert('Ошибка', 'Не удалось выбрать изображение');
        }
    };

    const removeImage = () => {
        setImage(null);
    };

    const handleSubmit = () => {
        // ФИКС: Разрешаем публикацию без фото, но с текстом
        if (!title.trim() && !content.trim() && !image) {
            Alert.alert('Ошибка', 'Добавьте текст или изображение');
            return;
        }

        // ФИКС: Передаем image даже если его нет (undefined)
        onSubmit(title, content, image || undefined);

        // Сброс формы
        setTitle('');
        setContent('');
        setImage(null);
        onClose();
    };

    const handleClose = () => {
        setTitle('');
        setContent('');
        setImage(null);
        onClose();
    };

    // ФИКС: Проверяем можно ли опубликовать (текст ИЛИ фото)
    const canSubmit = title.trim() || content.trim() || image;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Создать пост</Text>
                    <TouchableOpacity onPress={handleClose}>
                        <Text style={styles.closeButton}>✕</Text>
                    </TouchableOpacity>
                </View>

                <TextInput
                    style={styles.input}
                    placeholder="Заголовок (необязательно)..."
                    placeholderTextColor={darkTheme.colors.textSecondary}
                    value={title}
                    onChangeText={setTitle}
                    maxLength={100}
                />

                <TextInput
                    style={[styles.input, styles.contentInput]}
                    placeholder="Что у вас нового?..."
                    placeholderTextColor={darkTheme.colors.textSecondary}
                    value={content}
                    onChangeText={setContent}
                    multiline
                    textAlignVertical="top"
                    maxLength={500}
                />

                {/* Блок для фото */}
                <View style={styles.imageSection}>
                    <Text style={styles.sectionTitle}>Изображение (необязательно)</Text>

                    {image ? (
                        <View style={styles.imagePreviewContainer}>
                            <Image
                                source={{ uri: image }}
                                style={styles.imagePreview}
                                resizeMode="cover"
                            />
                            <TouchableOpacity
                                style={styles.removeImageButton}
                                onPress={removeImage}
                            >
                                <Text style={styles.removeImageText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.addImageButton}
                            onPress={selectImage}
                        >
                            <Text style={styles.addImageText}>📷 Добавить фото</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.footer}>
                    <Text style={styles.charCount}>
                        {content.length}/500
                    </Text>
                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            !canSubmit && styles.disabled
                        ]}
                        onPress={handleSubmit}
                        disabled={!canSubmit}
                    >
                        <Text style={styles.submitText}>
                            {image ? '📸 Опубликовать' : 'Опубликовать'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: darkTheme.colors.background,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        color: darkTheme.colors.text,
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeButton: {
        color: darkTheme.colors.text,
        fontSize: 24,
        fontWeight: 'bold',
    },
    input: {
        backgroundColor: darkTheme.colors.card,
        color: darkTheme.colors.text,
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: darkTheme.colors.border,
        fontSize: 16,
    },
    contentInput: {
        height: 120,
        textAlignVertical: 'top',
    },
    imageSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        color: darkTheme.colors.text,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 10,
    },
    addImageButton: {
        backgroundColor: darkTheme.colors.card,
        borderWidth: 2,
        borderColor: darkTheme.colors.border,
        borderStyle: 'dashed',
        padding: 20,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addImageText: {
        color: darkTheme.colors.textSecondary,
        fontSize: 16,
    },
    imagePreviewContainer: {
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: 200,
        borderRadius: 8,
    },
    removeImageButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.7)',
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeImageText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'auto',
    },
    charCount: {
        color: darkTheme.colors.textSecondary,
        fontSize: 14,
    },
    submitButton: {
        backgroundColor: darkTheme.colors.primary,
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 20,
    },
    disabled: {
        opacity: 0.5,
    },
    submitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
