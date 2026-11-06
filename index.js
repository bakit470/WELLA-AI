const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const axios = require('axios');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.get('/', (req, res) => res.send('Wella Ai Bot Iko Wazi!'));
app.listen(process.env.PORT || 3000);

const GEMINI_KEY = process.env.GEMINI_KEY;
const FAL_KEY = process.env.FAL_KEY;
const PHONE_NUMBER = '255749520061';

// Tafuta Chrome kiotomatiki popote ilipo
function findChrome() {
    const base = '/opt/render/.cache/puppeteer/chrome';
    try {
        if (fs.existsSync(base)) {
            const versions = fs.readdirSync(base);
            for (const v of versions) {
                const p1 = path.join(base, v, 'chrome-linux', 'chrome');
                const p2 = path.join(base, v, 'chrome-linux64', 'chrome');
                if (fs.existsSync(p1)) return p1;
                if (fs.existsSync(p2)) return p2;
            }
        }
    } catch (e) {}
    // Kama haikupatikana, tumia ya puppeteer yenyewe
    try { return require('puppeteer').executablePath(); } catch(e) { return undefined; }
}

const chromePath = findChrome();
console.log('Chrome path found:', chromePath);

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: chromePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-zygote', '--single-process']
    }
});

client.on('qr', (qr) => console.log('QR RECEIVED', qr));
client.on('ready', () => console.log('Wella Ai Iko Tayari!'));
client.on('authenticated', () => console.log('Imeunganika!'));
client.on('auth_failure', (msg) => console.log('Auth imeshindwa:', msg));
client.on('disconnected', (reason) => console.log('Imetoka:', reason));

client.initialize().then(async () => {
    setTimeout(async () => {
        try {
            const code = await client.requestPairingCode(PHONE_NUMBER);
            console.log('PAIRING CODE YAKO NI: ' + code);
        } catch (e) {
            console.log('Code imeshindwa: ' + e.message);
        }
    }, 10000);
}).catch(err => console.log('Initialize error:', err));

async function askAI(userMessage) {
    const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
        contents: [{ parts: [{ text: `Wewe ni Wella Ai, msaidizi kutoka Tanzania. Jibu kwa Kiswahili rahisi, kirafiki. Unasaidia kutengeneza music na kujibu maswali. Swali: ${userMessage}` }] }]
    });
    return res.data.candidates[0].content.parts[0].text;
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
