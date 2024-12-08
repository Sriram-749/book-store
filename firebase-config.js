require("dotenv").config();
var admin = require("firebase-admin");

var serviceAccount = JSON.parse(process.env.serviceAccountKey);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

module.exports = { db };
