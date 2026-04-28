const CryptoJS = require("crypto-js");

const SECRET_KEY = process.env.CRYPTO_SECRET || "mySecretKey123";

// encrypt password
exports.encryptPassword = (password) => {
  return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
};

// decrypt password
exports.decryptPassword = (encryptedPassword) => {
  const bytes = CryptoJS.AES.decrypt(encryptedPassword, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};