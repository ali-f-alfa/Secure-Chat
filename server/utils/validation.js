const validator = require('validator');

const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return false;
  }

  const trimmed = username.trim();
  const maxLength = parseInt(process.env.MAX_USERNAME_LENGTH) || 30;

  // Check length
  if (trimmed.length < 2 || trimmed.length > maxLength) {
    return false;
  }

  // Check for valid characters (alphanumeric, underscore, hyphen, space)
  const validPattern = /^[a-zA-Z0-9_\-\s]+$/;
  if (!validPattern.test(trimmed)) {
    return false;
  }

  // Check for profanity or inappropriate words (basic list)
  const profanityFilter = ['admin', 'administrator', 'moderator', 'root', 'system'];
  const lowerUsername = trimmed.toLowerCase();
  
  for (const word of profanityFilter) {
    if (lowerUsername.includes(word)) {
      return false;
    }
  }

  return true;
};

const validateRoomName = (roomName) => {
  if (!roomName || typeof roomName !== 'string') {
    return false;
  }

  const trimmed = roomName.trim();
  const maxLength = parseInt(process.env.MAX_ROOM_NAME_LENGTH) || 50;

  // Check length
  if (trimmed.length < 2 || trimmed.length > maxLength) {
    return false;
  }

  // Check for valid characters
  const validPattern = /^[a-zA-Z0-9_\-\s#]+$/;
  if (!validPattern.test(trimmed)) {
    return false;
  }

  // Check for reserved room names
  const reservedNames = ['general', 'admin', 'system', 'moderator', 'private'];
  const lowerRoomName = trimmed.toLowerCase();
  
  if (reservedNames.includes(lowerRoomName)) {
    return false;
  }

  return true;
};

const validateMessage = (message) => {
  if (!message || typeof message !== 'string') {
    return false;
  }

  const trimmed = message.trim();
  const maxLength = parseInt(process.env.MAX_MESSAGE_LENGTH) || 500;

  // Check length
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    return false;
  }

  // Check for harmful URLs or suspicious patterns
  const suspiciousPatterns = [
    /javascript:/i,
    /data:text\/html/i,
    /onclick=/i,
    /onload=/i,
    /<script/i,
    /<iframe/i,
    /eval\(/i,
    /expression\(/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }

  // Check for spam patterns (repeated characters, excessive caps)
  const repeatedCharsPattern = /(.)\1{10,}/; // More than 10 repeated characters
  if (repeatedCharsPattern.test(trimmed)) {
    return false;
  }

  // Check for excessive uppercase (more than 70% caps)
  const uppercaseRatio = (trimmed.match(/[A-Z]/g) || []).length / trimmed.length;
  if (trimmed.length > 10 && uppercaseRatio > 0.7) {
    return false;
  }

  return true;
};

const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  return validator.isEmail(email);
};

const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags and escape special characters
  return validator.escape(input.trim());
};

const isValidURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Check for common phishing/malicious domains
const isSuspiciousURL = (url) => {
  if (!isValidURL(url)) {
    return true;
  }

  const suspiciousDomains = [
    'bit.ly',
    'tinyurl.com',
    'goo.gl',
    't.co'
  ];

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    
    // Check for suspicious TLDs
    const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf'];
    if (suspiciousTLDs.some(tld => domain.endsWith(tld))) {
      return true;
    }

    // Check for known suspicious domains
    if (suspiciousDomains.includes(domain)) {
      return true;
    }

    // Check for IP addresses instead of domains
    const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    if (ipPattern.test(domain)) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
};

const containsSpam = (text) => {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const spamPatterns = [
    /\b(click here|free money|make money fast|urgent|lottery|congratulations)\b/i,
    /\b(viagra|cialis|pharmacy|casino|gambling)\b/i,
    /\b(download now|limited time|act now|call now)\b/i,
    /([A-Z]){5,}/g, // Excessive capitals
    /(.)\1{4,}/g,   // Repeated characters
    /\$+[\d,]+/g    // Money amounts
  ];

  return spamPatterns.some(pattern => pattern.test(text));
};

const rateLimit = new Map();

const checkRateLimit = (userId, action = 'message', limit = 10, windowMs = 60000) => {
  const key = `${userId}:${action}`;
  const now = Date.now();
  
  if (!rateLimit.has(key)) {
    rateLimit.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  const userData = rateLimit.get(key);
  
  if (now > userData.resetTime) {
    userData.count = 1;
    userData.resetTime = now + windowMs;
    return true;
  }

  if (userData.count >= limit) {
    return false;
  }

  userData.count++;
  return true;
};

module.exports = {
  validateUsername,
  validateRoomName,
  validateMessage,
  validateEmail,
  sanitizeInput,
  isValidURL,
  isSuspiciousURL,
  containsSpam,
  checkRateLimit
};