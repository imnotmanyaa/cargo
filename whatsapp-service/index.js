const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(express.json());

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

let isReady = false;

client.on('qr', (qr) => {
    console.log('\n\n======================================================');
    console.log('СКАНИРУЙТЕ ЭТОТ QR КОД ЧЕРЕЗ WHATSAPP НА ВАШЕМ ТЕЛЕФОНЕ:');
    console.log('======================================================\n');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    isReady = true;
    console.log('WhatsApp Client готов! Сервис может отправлять сообщения.');
});

client.on('auth_failure', msg => {
    console.error('Ошибка авторизации WhatsApp:', msg);
});

client.on('disconnected', (reason) => {
    isReady = false;
    console.log('WhatsApp отключен:', reason);
    // You could decide to destroy and re-initialize the client here
});

client.initialize();

app.post('/api/whatsapp/send', async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'WhatsApp сервис еще не готов. Отсканируйте QR-код в логах.' });
    }

    const { phone, message } = req.body;
    if (!phone || !message) {
        return res.status(400).json({ error: 'phone и message обязательны' });
    }

    // Format phone to WhatsApp format: 77001234567@c.us
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('87')) {
        formattedPhone = '77' + formattedPhone.substring(2);
    }
    const chatId = `${formattedPhone}@c.us`;

    try {
        await client.sendMessage(chatId, message);
        console.log(`[SMS/WA] Отправлено на ${formattedPhone}: ${message}`);
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка отправки сообщения:', error);
        res.status(500).json({ error: 'Не удалось отправить сообщение' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`WhatsApp API запущен на порту ${PORT}`);
});
