export type AudioMessagePayload = {
    url: string;
    durationMs?: number;
};

export const parseAudioMessage = (value?: string | null): AudioMessagePayload | null => {
    if (!value) {
        return null;
    }

    try {
        const parsed = JSON.parse(value);

        if (parsed && typeof parsed.url === 'string') {
            return {
                url: parsed.url,
                durationMs: typeof parsed.durationMs === 'number' ? parsed.durationMs : undefined,
            };
        }
    } catch {
        return {
            url: value,
        };
    }

    return null;
};

export const formatAudioDuration = (durationMs?: number | null) => {
    const totalSeconds = Math.max(0, Math.floor((durationMs || 0) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
