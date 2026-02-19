const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const crypto = require('crypto');

const APP_KEY = process.env.SPEECHSUPER_APP_KEY;
const SECRET_KEY = process.env.SPEECHSUPER_SECRET_KEY;
const API_URL = process.env.SPEECHSUPER_API_URL;

function createHash(content) {
  return crypto.createHash('sha1').update(content).digest('hex');
}

function getConnectSig(timestamp) {
  return createHash(APP_KEY + timestamp + SECRET_KEY);
}

function getStartSig(timestamp, userId) {
  return createHash(APP_KEY + timestamp + userId + SECRET_KEY);
}

exports.evaluateSpeech = async (refText, audioPath, tokenId) => {
  const audioData = fs.readFileSync(audioPath);
  const timestamp = Date.now().toString();

  const payload = {
    connect: {
      cmd: "connect",
      param: {
        sdk: { version: 16777472, source: 9, protocol: 2 },
        app: {
          applicationId: APP_KEY,
          sig: getConnectSig(timestamp),
          timestamp
        }
      }
    },
    start: {
      cmd: "start",
      param: {
        app: {
          applicationId: APP_KEY,
          userId: "uid",
          timestamp,
          sig: getStartSig(timestamp, "uid")
        },
        audio: {
          audioType: "wav",
          sampleRate: "16000",
          channel: 1,
          sampleBytes: 2
        },
        request: {
          coreType: "sent.eval.promax",
          refText,
          tokenId
        }
      }
    }
  };

  const form = new FormData();
  form.append("text", JSON.stringify(payload));
  form.append("audio", audioData, { filename: `${tokenId}.wav` });

  const response = await axios.post(API_URL, form, {
    headers: { ...form.getHeaders(), 'Request-Index': '0' },
    maxBodyLength: Infinity,
    timeout: 30000
  });

  return response.data;
};
