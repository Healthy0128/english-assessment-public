const path = require('path');
const fs = require('fs');
const audioConverter = require('../utils/audioConverter');
const speechsuperApi = require('../api/speechsuperApi');

exports.evaluate = async (req, res) => {
  try {
    const tempWebm = req.file.path;
    const uuid = path.basename(tempWebm, path.extname(tempWebm));
    const wavPath = `uploads/${uuid}.wav`;
    const refText = req.body.text || "こんにちは。私は田中です。";

    await audioConverter.convertToWav(tempWebm, wavPath);
    fs.unlinkSync(tempWebm);

    const result = await speechsuperApi.evaluateSpeech(refText, wavPath, uuid);

    fs.unlinkSync(wavPath); // 終了後削除可能

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
