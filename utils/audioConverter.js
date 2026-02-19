const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

exports.convertToWav = (srcPath, dstPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(srcPath)
      .audioChannels(1)
      .audioFrequency(16000)
      .audioCodec("pcm_s16le")
      .output(dstPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
};
