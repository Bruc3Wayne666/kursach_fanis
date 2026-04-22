// src/components/CreatePostModal.tsx - УБИРАЕМ АВТОЗАКРЫТИЕ
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
    ActivityIndicator
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { darkTheme } from '../themes/dark';
import { api } from '../services/api';
import {API_BASE_URL, API_FILE_URL} from "../utils/constants.ts";

interface CreatePostModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (title: string, content: string, image?: string) => void;
}

export default function CreatePostModal({ visible, onClose, onSubmit }: CreatePostModalProps) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const selectImage = async () => {
        try {
            const result = await launchImageLibrary({
                mediaType: 'photo',
                quality: 0.8,
            });

            if (result.assets && result.assets[0]) {
                const selectedImage = result.assets[0];
                setUploading(true);

                // ЗАГРУЖАЕМ НА СЕРВЕР
                const formData = new FormData();
                formData.append('image', {
                    uri: selectedImage.uri,
                    type: selectedImage.type || 'image/jpeg',
                    name: 'image.jpg'
                } as any);

                const response = await api.post('/upload', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });

                setImage(response.data.url);
                console.log('✅ Изображение загружено:', response.data.url);
            }
        } catch (error) {
            console.log('❌ Ошибка загрузки:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить изображение');
        } finally {
            setUploading(false);
        }
    };

    const removeImage = () => {
        setImage(null);
    };

    const handleSubmit = async () => {
        if (!title.trim() && !content.trim() && !image) {
            Alert.alert('Ошибка', 'Добавьте текст или изображение');
            return;
        }

        setSubmitting(true);
        try {
            // 🔥 Передаем управление родительскому компоненту
            await onSubmit(title, content, image || undefined);

            // 🔥 Очищаем поля только после успешной отправки
            setTitle('');
            setContent('');
            setImage(null);

        } catch (error) {
            console.error('Error submitting post:', error);
            Alert.alert('Ошибка', 'Не удалось создать пост');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        // 🔥 Очищаем поля при закрытии
        setTitle('');
        setContent('');
        setImage(null);
        onClose();
    };

    const canSubmit = (title.trim() || content.trim() || image) && !submitting;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleClose} disabled={submitting}>
                        <Text style={styles.closeButton}>✕</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Создать пост</Text>
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={!canSubmit}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color={darkTheme.colors.primary}/>
                        ) : (
                            <Text style={[styles.saveButton, !canSubmit && styles.saveButtonDisabled]}>
                                Опубликовать
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                <TextInput
                    style={styles.input}
                    placeholder="Заголовок (необязательно)..."
                    placeholderTextColor={darkTheme.colors.textSecondary}
                    value={title}
                    onChangeText={setTitle}
                    maxLength={100}
                    editable={!submitting}
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
                    editable={!submitting}
                />

                <View style={styles.imageSection}>
                    <Text style={styles.sectionTitle}>Изображение (необязательно)</Text>

                    {image ? (
                        <View style={styles.imagePreviewContainer}>
                            <Image
                                // source={{ uri: `http://192.168.0.116:5000${image}` }}
                                source={{ uri: `${API_FILE_URL}${image}` }}
                                style={styles.imagePreview}
                                resizeMode="cover"
                            />
                            <TouchableOpacity
                                style={styles.removeImageButton}
                                onPress={removeImage}
                                disabled={submitting}
                            >
                                <Text style={styles.removeImageText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.addImageButton}
                            onPress={selectImage}
                            disabled={uploading || submitting}
                        >
                            {uploading ? (
                                <ActivityIndicator color={darkTheme.colors.primary} />
                            ) : (
                                <Text style={styles.addImageText}>📷 Добавить фото</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.footer}>
                    <Text style={styles.charCount}>{content.length}/500</Text>
                </View>
            </View>
        </Modal>
    );
}

// Стили остаются без изменений
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
    saveButton: {
        color: darkTheme.colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    saveButtonDisabled: {
        opacity: 0.5,
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
});
