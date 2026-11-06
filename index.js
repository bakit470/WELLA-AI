const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const OpenAI = require('openai');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Wella Ai Bot Iko Wazi!'));
app.listen(process.env.PORT || 3000);

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
const FAL_KEY = process.env.FAL_KEY;

// Namba yako 0749520061 inakuwa 255749520061
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

client.on('message', async (msg) => {
    const text = msg.body.toLowerCase();
    const chat = await msg.getChat();

    // A + B + C - MUSIC
    if (text.includes('beat') || text.includes('wimbo') || text.includes('gospel') || text.includes('music') || text.includes('nyimbo') || text.includes('song')) {
        await chat.sendMessage('🎵 Sawa, Wella Ai inakutengenezea... subiri sekunde 30...');
        try {
            const music = await axios.post('https://fal.run/fal-ai/suno/v3.5/generate', {
                prompt: msg.body,
                lyrics: msg.body
            }, { headers: { Authorization: `Key ${FAL_KEY}` } });
            const media = await MessageMedia.fromUrl(music.data.audio_url);
            await chat.sendMessage(media, { caption: '🎶 Hapa ni wimbo wako kutoka Wella Ai!' });
        } catch (e) { 
            await chat.sendMessage('Pole, imeshindikana kutengeneza wimbo. Jaribu tena.'); 
        }
        return;
    }

    // MASWALI - ChatGPT
    try {
        const reply = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'Wewe ni Wella Ai, msaidizi kutoka Tanzania. Jibu kwa Kiswahili rahisi, kirafiki. Unasaidia kutengeneza music na kujibu maswali.' },
                { role: 'user', content: msg.body }
            ]
        });
        await chat.sendMessage(reply.choices[0].message.content);
    } catch (e) { 
        await chat.sendMessage('Pole, nimekwama kidogo.'); 
    }
});
