// server.js  - 409 / 41001 を回避するための最小修正版
require("dotenv").config();
const express  = require("express");
const multer   = require("multer");
const fs       = require("fs");
const path     = require("path");
const axios    = require("axios");
const ffmpeg   = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const FormData = require("form-data");
const { createHash } = require("crypto");

ffmpeg.setFfmpegPath(ffmpegPath);

const app     = express();
const upload  = multer({ dest: "uploads/" });
const PORT    = 3000;

// ---- 署名 (sha1) を作る小さなヘルパー ---------------------------
function sha1(str){
  return createHash("sha1").update(str).digest("hex");
}
function makeSig({ appKey, secretKey, userId = "" }){
  const ts = Date.now().toString();
  return { sig: sha1(appKey + ts + userId + secretKey), timestamp: ts };
}
// -------------------------------------------------------------------

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.post("/api/evaluate", upload.single("audio"), async (req, res) => {
  let webmPath, wavPath;      // 後で掃除するために保持
  try {
    // 1. 受け取ったファイル → wav(16kHz/mono) へ変換 ----------------
    if(!req.file) throw new Error("audio が届いていません");
    if(!req.body.text) throw new Error("text が届いていません");

    webmPath = req.file.path;
    wavPath  = webmPath + ".wav";

    await new Promise((ok, ng)=>{
      ffmpeg(webmPath)
        .audioChannels(1).audioFrequency(16000).audioCodec("pcm_s16le")
        .save(wavPath)
        .on("end", ok).on("error", ng);
    });

    const audioBuf = fs.readFileSync(wavPath);

    // 2. リクエスト組み立て ----------------------------------------
    const { SPEECHSUPER_APP_KEY, SPEECHSUPER_SECRET_KEY, SPEECHSUPER_API_URL } = process.env;
    const userId   = "uid";               // 固定でも OK
    const tokenId  = Date.now().toString();

    const connect = makeSig({ appKey: SPEECHSUPER_APP_KEY, secretKey: SPEECHSUPER_SECRET_KEY });
    const start   = makeSig({ appKey: SPEECHSUPER_APP_KEY, secretKey: SPEECHSUPER_SECRET_KEY, userId });

    const payload = {
      connect : {
        cmd  : "connect",
        param: {
          sdk : { version: 16777472, source: 9, protocol: 2 },
          app : { applicationId: SPEECHSUPER_APP_KEY, sig: connect.sig, timestamp: connect.timestamp }
        }
      },
      start   : {
        cmd  : "start",
        param: {
          app   : { applicationId: SPEECHSUPER_APP_KEY, userId, sig: start.sig, timestamp: start.timestamp },
          audio : { audioType : "wav", sampleRate: "16000", channel: 1, sampleBytes: 2 },
          request: { coreType: "sent.eval.promax", refText: req.body.text, tokenId }
        }
      }
    };

    const form = new FormData();
    form.append("text" , JSON.stringify(payload));
    form.append("audio", audioBuf, { filename: "audio.wav" });

    // 3. API へ POST -------------------------------------------------
    const apiRes = await axios.post(
      SPEECHSUPER_API_URL,     // 例: https://api.speechsuper.com/sent.eval.promax
      form,
      {
        headers: {
          ...form.getHeaders(),          // boundary / Content-Type など
          "Request-Index": "0"           // ← これを忘れると 409
        },
        timeout        : 30000,
        maxBodyLength  : Infinity
      }
    );

    res.json(apiRes.data);               // クライアントへ結果返却
  }
  catch(e){
    console.error(e);
    // API からのエラーでも e.response.data に JSON が入っているので落とす
    res.status(500).json({ error: e.message, data: e?.response?.data ?? null });
  }
  finally{
    // 4. 一時ファイルを掃除 ----------------------------------------
    [webmPath, wavPath].forEach(p=>{
      if(p && fs.existsSync(p)) fs.unlinkSync(p);
    });
  }
});

app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));
