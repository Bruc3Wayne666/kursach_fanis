const GigaChat = require('gigachat').default;
const { Agent } = require('node:https');

const STYLE_PRESETS = {
    official: {
        label: 'official',
        instruction: 'Перепиши сообщение в более официальном, грамотном и собранном тоне. Сохрани смысл, язык сообщения и примерный объем.'
    },
    warm: {
        label: 'warm',
        instruction: 'Перепиши сообщение в более душевном, теплом и человечном тоне. Текст должен звучать естественно и уместно для обычного чата.'
    },
    friendly: {
        label: 'friendly',
        instruction: 'Перепиши сообщение в более живом, дружелюбном и выразительном стиле. Не меняй смысл и не переборщи со сленгом или эмодзи.'
    }
};

const getGigaChatClient = () => {
    const credentials = process.env.GIGACHAT_CREDENTIALS;

    if (!credentials) {
        return null;
    }

    const rejectUnauthorized = process.env.GIGACHAT_ALLOW_INSECURE_TLS === 'true' ? false : true;
    const config = {
        credentials,
        model: process.env.GIGACHAT_MODEL || 'GigaChat',
        scope: process.env.GIGACHAT_SCOPE || 'GIGACHAT_API_PERS',
        timeout: Number(process.env.GIGACHAT_TIMEOUT || 60),
        httpsAgent: new Agent({
            rejectUnauthorized
        })
    };

    if (process.env.GIGACHAT_BASE_URL) {
        config.baseUrl = process.env.GIGACHAT_BASE_URL;
    }

    if (process.env.GIGACHAT_AUTH_URL) {
        config.authUrl = process.env.GIGACHAT_AUTH_URL;
    }

    return new GigaChat(config);
};

exports.rewriteMessage = async (req, res) => {
    try {
        const { text, style = 'friendly' } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const preset = STYLE_PRESETS[style];
        if (!preset) {
            return res.status(400).json({ error: 'Unsupported AI style' });
        }

        const client = getGigaChatClient();
        if (!client) {
            return res.status(503).json({
                error: 'GigaChat is not configured on the server'
            });
        }

        const response = await client.chat({
            messages: [
                {
                    role: 'system',
                    content: 'Ты улучшаешь черновики сообщений для чата. Сохраняй исходный смысл, факты, намерение и язык сообщения. Возвращай только готовый переписанный текст без пояснений, без кавычек и без списков.'
                },
                {
                    role: 'user',
                    content: `Стиль: ${preset.label}\nИнструкция: ${preset.instruction}\n\nИсходное сообщение:\n${text.trim()}`
                }
            ],
            temperature: 0.8,
            max_tokens: 300
        });

        const rewrittenText = response?.choices?.[0]?.message?.content?.trim();

        if (!rewrittenText) {
            return res.status(502).json({
                error: 'GigaChat returned an empty response'
            });
        }

        res.json({
            text: rewrittenText,
            style
        });
    } catch (error) {
        console.error('AI rewrite error:', error);

        res.status(502).json({
            error: 'Failed to rewrite text with GigaChat.'
        });
    }
};
