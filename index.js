const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Wella Ai Bot Iko Wazi!'));
app.listen(process.env.PORT || 3000);

const GROQ_KEY = process.env.GROQ_KEY;
const FAL_KEY = process.env.FAL_KEY;
const PHONE_NUMBER = '255749520061';

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('ready', () => console.log('Wella Ai Iko Tayari!'));
client.on('authenticated', () => console.log('Imeunganika!'));

client.initialize().then(async () => {
    setTimeout(async () => {
        try {
            const code = await client.requestPairingCode(PHONE_NUMBER);
            console.log('PAIRING CODE YAKO NI: ' + code);
        } catch (e) {
            console.log('Code imeshindwa: ' + e.message);
        }
    }, 5000);
});

async function askAI(userMessage) {
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: 'Wewe ni Wella Ai, msaidizi kutoka Tanzania. Jibu kwa Kiswahili rahisi, kirafiki. Unasaidia kutengeneza music na kujibu maswali yote.' },
            { role: 'user', content: userMessage }
        ]
    }, { headers: { Authorization: `Bearer ${GROQ_KEY}` } });
    return res.data.choices[0].message.content;
}

client.on('message', async (msg) => {
    if (msg.from === 'status@broadcast') return;
    const text = msg.body.toLowerCase();
    const chat = await msg.getChat();

    if (text.includes('beat') || text.includes('wimbo') || text.includes('gospel') || text.includes('music') || text.includes('nyimbo') || text.includes('song') || text.includes('tengeneza')) {
        await chat.sendMessage('🎵 Sawa, Wella Ai inakutengenezea... subiri sekunde 30...');
        try {
            const music = await axios.post('https://fal.run/fal-ai/suno/v3.5/generate', {
                prompt: msg.body,
                lyrics: msg.body
            }, { headers: { Authorization: `Key ${FAL_KEY}` } });
            const media = await MessageMedia.fromUrl(music.data.audio_url);
            await chat.sendMessage(media, { caption: '🎶 Hapa ni wimbo wako kutoka Wella Ai!' });
        } catch (e) {
            await chat.sendMessage('Pole, imeshindikana kutengeneza wimbo sasa. Jaribu tena.');
        }
        return;
    }

    try {
        const reply = await askAI(msg.body);
        await chat.sendMessage(reply);
    } catch (e) {
        await chat.sendMessage('Pole, nimekwama kidogo. Jaribu tena.');
    }
});
