import CryptoJS from 'crypto-js';

class EncryptionService {
  constructor() {
    this.keyPairs = new Map(); // Store key pairs for different conversations
    this.publicKeys = new Map(); // Store public keys from other users
  }

  // Generate a new RSA key pair for E2E encryption
  async generateKeyPair() {
    try {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256'
        },
        true,
        ['encrypt', 'decrypt']
      );

      return keyPair;
    } catch (error) {
      console.error('Error generating key pair:', error);
      throw error;
    }
  }

  // Export public key to share with other users
  async exportPublicKey(publicKey) {
    try {
      const exported = await window.crypto.subtle.exportKey('spki', publicKey);
      return btoa(String.fromCharCode(...new Uint8Array(exported)));
    } catch (error) {
      console.error('Error exporting public key:', error);
      throw error;
    }
  }

  // Import public key from another user
  async importPublicKey(base64Key) {
    try {
      const binaryKey = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
      const publicKey = await window.crypto.subtle.importKey(
        'spki',
        binaryKey,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256'
        },
        false,
        ['encrypt']
      );

      return publicKey;
    } catch (error) {
      console.error('Error importing public key:', error);
      throw error;
    }
  }

  // Generate AES key for symmetric encryption
  async generateAESKey() {
    try {
      const key = await window.crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );

      return key;
    } catch (error) {
      console.error('Error generating AES key:', error);
      throw error;
    }
  }

  // Encrypt message with AES key
  async encryptMessage(message, aesKey) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      const encrypted = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        aesKey,
        data
      );

      return {
        encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
        iv: btoa(String.fromCharCode(...iv))
      };
    } catch (error) {
      console.error('Error encrypting message:', error);
      throw error;
    }
  }

  // Decrypt message with AES key
  async decryptMessage(encryptedData, aesKey, iv) {
    try {
      const encrypted = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
      const ivArray = Uint8Array.from(atob(iv), c => c.charCodeAt(0));

      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: ivArray
        },
        aesKey,
        encrypted
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Error decrypting message:', error);
      throw error;
    }
  }

  // Encrypt AES key with RSA public key
  async encryptAESKey(aesKey, publicKey) {
    try {
      const exported = await window.crypto.subtle.exportKey('raw', aesKey);
      const encrypted = await window.crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP'
        },
        publicKey,
        exported
      );

      return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    } catch (error) {
      console.error('Error encrypting AES key:', error);
      throw error;
    }
  }

  // Decrypt AES key with RSA private key
  async decryptAESKey(encryptedKey, privateKey) {
    try {
      const encrypted = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));
      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: 'RSA-OAEP'
        },
        privateKey,
        encrypted
      );

      const aesKey = await window.crypto.subtle.importKey(
        'raw',
        decrypted,
        {
          name: 'AES-GCM'
        },
        false,
        ['encrypt', 'decrypt']
      );

      return aesKey;
    } catch (error) {
      console.error('Error decrypting AES key:', error);
      throw error;
    }
  }

  // Simple password-based encryption for storing key pairs locally
  encryptKeyPair(keyPair, password) {
    try {
      const keyData = JSON.stringify({
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey
      });
      
      return CryptoJS.AES.encrypt(keyData, password).toString();
    } catch (error) {
      console.error('Error encrypting key pair:', error);
      throw error;
    }
  }

  // Decrypt stored key pair
  decryptKeyPair(encryptedKeyPair, password) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedKeyPair, password);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Error decrypting key pair:', error);
      throw error;
    }
  }

  // Generate a secure random password
  generateSecurePassword(length = 32) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  // Store key pair for a conversation
  storeKeyPair(conversationId, keyPair) {
    this.keyPairs.set(conversationId, keyPair);
  }

  // Get key pair for a conversation
  getKeyPair(conversationId) {
    return this.keyPairs.get(conversationId);
  }

  // Store public key from another user
  storePublicKey(userId, publicKey) {
    this.publicKeys.set(userId, publicKey);
  }

  // Get public key for a user
  getPublicKey(userId) {
    return this.publicKeys.get(userId);
  }

  // Clear all stored keys (on logout)
  clearAllKeys() {
    this.keyPairs.clear();
    this.publicKeys.clear();
  }

  // Hash function for key derivation
  async hash(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  // Check if Web Crypto API is available
  isAvailable() {
    return !!(window.crypto && window.crypto.subtle);
  }
}

// Create singleton instance
const encryptionService = new EncryptionService();

export default encryptionService;