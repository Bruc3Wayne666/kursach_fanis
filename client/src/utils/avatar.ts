import { API_FILE_URL } from './constants';

export const getAvatarUrl = (avatarPath?: string | null) => {
    if (!avatarPath) {
        return null;
    }

    if (
        avatarPath.startsWith('http://') ||
        avatarPath.startsWith('https://') ||
        avatarPath.startsWith('data:')
    ) {
        return avatarPath;
    }

    return `${API_FILE_URL}${avatarPath}`;
};

export const getUserInitial = (name?: string | null, username?: string | null) => {
    const source = name?.trim() || username?.trim() || '?';
    return source.charAt(0).toUpperCase();
};
