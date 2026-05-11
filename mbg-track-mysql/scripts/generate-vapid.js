// Jalankan sekali: node scripts/generate-vapid.js
// Salin output ke .env
const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();
console.log('\nVAPID Keys generated — salin ke file .env Anda:\n');
console.log(`VAPID_PUBLIC_KEY="${keys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${keys.privateKey}"`);
console.log(`VAPID_SUBJECT="mailto:admin@mbg.go.id"\n`);
