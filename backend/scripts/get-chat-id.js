const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function autoDetectChatId() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('ERROR: TELEGRAM_BOT_TOKEN is not set in backend/.env');
    process.exit(1);
  }

  console.log('===========================================================');
  console.log(' Telegram Auto Chat ID Detector for @EMa20obot');
  console.log('===========================================================');
  console.log('Checking Telegram servers for messages sent to your bot...\n');

  try {
    const url = `https://api.telegram.org/bot${token}/getUpdates`;
    const resp = await axios.get(url);

    if (!resp.data || !resp.data.ok) {
      console.error('Telegram API Error:', resp.data);
      process.exit(1);
    }

    const updates = resp.data.result;
    if (updates.length === 0) {
      console.log('⚠️  No messages found yet!');
      console.log('--> ACTION REQUIRED: Open Telegram on your phone or PC, search for @EMa20obot, click START or send "hello", then run this command again!\n');
      process.exit(0);
    }

    // Get latest message
    const lastUpdate = updates[updates.length - 1];
    const message = lastUpdate.message || lastUpdate.channel_post || lastUpdate.my_chat_member;
    const chat = message?.chat || message?.from;

    if (!chat || !chat.id) {
      console.log('Could not extract chat ID from updates:', lastUpdate);
      process.exit(1);
    }

    const detectedChatId = chat.id.toString();
    const userName = chat.first_name || chat.username || 'User';

    console.log(`✅ SUCCESS! Detected User Chat ID: ${detectedChatId} (${userName})`);

    // Auto-update .env file
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent.replace(/TELEGRAM_CHAT_ID=.*/g, `TELEGRAM_CHAT_ID=${detectedChatId}`);
      fs.writeFileSync(envPath, envContent);
      console.log(`\n🎉 Updated backend/.env automatically with TELEGRAM_CHAT_ID=${detectedChatId}!`);
      console.log('You can now restart your backend server (npm start) and Telegram alerts will work perfectly!');
    }
  } catch (err) {
    console.error('Failed querying Telegram API:', err.message);
  }
}

autoDetectChatId();
