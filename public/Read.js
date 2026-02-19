// --- 初期設定 ---
let refText = localStorage.getItem("refText") || "Hello. My name is Takumu. Let's read English sentences together.";
const scriptDiv = document.getElementById("script");
const resultDiv = document.getElementById("resultSummary");
const ttsBtn = document.getElementById("ttsBtn");
const ttsStopBtn = document.getElementById("ttsStopBtn");

let ttsUtter = null;
let ttsWordsArr = [];
let ttsOriginText = "";
let ttsIsReading = false;
let wordIndices = [];

// 連打防止＋クールダウン制御
let isSubmitting = false;
const COOLDOWN_MS = 10_000;
let cooldownUntil = 0;
let cooldownTimer = null;

// 単語ごとの開始インデックス
function getWordStartIndices(text) {
  let indices = [];
  let match;
  const regex = /\S+/g;
  while ((match = regex.exec(text)) !== null) {
    indices.push(match.index);
  }
  return indices;
}

// 初期レンダリング：全単語にspan＋idを振る
function renderScriptSpans(wordsArr) {
  let html = '';
  for (let i = 0; i < wordsArr.length; ++i) {
    html += `<span id="word-${i}" style="color:black;">${wordsArr[i]}</span> `;
  }
  scriptDiv.innerHTML = html.trim();
}

// 指定した単語だけ赤、それ以外は黒に
function highlightWord(idx, wordsArr) {
  for (let i = 0; i < wordsArr.length; ++i) {
    const span = document.getElementById(`word-${i}`);
    if (span) {
      span.style.color = (i === idx) ? "red" : "black";
      span.style.fontWeight = (i === idx) ? "bold" : "normal";
    }
  }
}

// TTS＋ハイライト
function speakTextWithHighlight(text, wordsArr) {
  window.speechSynthesis.cancel();
  ttsOriginText = text;
  ttsWordsArr = wordsArr;
  ttsIsReading = true;
  wordIndices = getWordStartIndices(text);

  renderScriptSpans(wordsArr); // 一度だけ全spanを描画

  let utter = new SpeechSynthesisUtterance(text);
  ttsUtter = utter;
  utter.lang = "en-US";
  utter.rate = 0.85;

  utter.onboundary = (event) => {
    if (event.name === 'word') {
      let charIndex = event.charIndex;
      let activeIdx = 0;
      for (let i = 0; i < wordIndices.length; i++) {
        if (wordIndices[i] > charIndex) break;
        activeIdx = i;
      }
      highlightWord(activeIdx, wordsArr);
    }
  };
  utter.onend = () => {
    highlightWord(-1, wordsArr);
    ttsUtter = null;
    ttsIsReading = false;
    window.getSelection().removeAllRanges();
  };
  utter.onerror = () => {
    highlightWord(-1, wordsArr);
    ttsUtter = null;
    ttsIsReading = false;
    window.getSelection().removeAllRanges();
  };

  highlightWord(0, wordsArr); // 1単語目からハイライト
  window.speechSynthesis.speak(utter);
}

// 再生ボタン（選択範囲あれば部分、なければ全文）
ttsBtn.onclick = () => {
  const sel = window.getSelection();
  let text = sel.toString().trim();
  let wordsArr;
  if (text) {
    wordsArr = text.match(/\S+/g) || [];
  } else {
    text = refText;
    wordsArr = refText.match(/\S+/g) || [];
  }
  speakTextWithHighlight(text, wordsArr);
};

// 停止ボタン
ttsStopBtn.onclick = () => {
  window.speechSynthesis.cancel();
  renderScriptSpans(refText.match(/\S+/g) || []);
  ttsUtter = null;
  ttsIsReading = false;
  window.getSelection().removeAllRanges();
};

// 本文初期描画
renderScriptSpans(refText.match(/\S+/g) || []);

// --------- 録音・評価・色分け ---------

let mediaRecorder, audioChunks = [], audioBlob;

const recordBtn = document.getElementById("recordBtn");
const stopBtn = document.getElementById("stopBtn");
const playBtn = document.getElementById("playBtn");
const submitBtn = document.getElementById("submitBtn");
const audioPreview = document.getElementById("audioPreview");
const recordBlink = document.getElementById("recordBlink");

recordBtn.onclick = async () => {
  audioChunks = [];
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
  mediaRecorder.onstop = () => {
    audioBlob = new Blob(audioChunks, { type: "audio/webm" });
    audioPreview.src = URL.createObjectURL(audioBlob);
    playBtn.disabled = false;
    submitBtn.disabled = false;
    audioPreview.style.display = "block";
  };
  mediaRecorder.start();
  recordBtn.disabled = true;
  stopBtn.disabled = false;
  recordBlink.style.display = "inline-block";
};

stopBtn.onclick = () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    recordBtn.disabled = false;
    stopBtn.disabled = true;
    recordBlink.style.display = "none";
  }
};

playBtn.onclick = () => {
  if (audioPreview.src) audioPreview.play();
};

// 評価色分け関数
function renderScriptColor(words) {
  const wordsArr = refText.match(/\S+/g) || [];
  let html = '';
  for (let i = 0; i < words.length; ++i) {
    const w = words[i];
    const score = w.scores?.overall || 0;
    const missed = (score === 0 || w.span?.start === -1);
    const color = missed ? "black"
      : (score < 60 ? "red"
      : score < 70 ? "orange"
      : "green");
    html += `<span style="color:${color}; font-weight:bold">${wordsArr[i] || ""}</span> `;
  }
  scriptDiv.innerHTML = html.trim();
}

// --- クールダウン開始（ボタンに残り秒数を表示） ---
function startCooldown() {
  cooldownUntil = Date.now() + COOLDOWN_MS;

  submitBtn.disabled = true;
  submitBtn.style.opacity = "0.6";
  submitBtn.style.pointerEvents = "none";

  const tick = () => {
    const remain = Math.max(0, cooldownUntil - Date.now());
    const sec = Math.ceil(remain / 1000);
    submitBtn.textContent = `再送信まで ${sec}秒`;
    if (remain <= 0) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
      submitBtn.disabled = false;
      submitBtn.style.opacity = "";
      submitBtn.style.pointerEvents = "";
      submitBtn.textContent = "評価提出";
    }
  };
  tick();
  cooldownTimer = setInterval(tick, 200);
}

// 送信クリック
submitBtn.onclick = async () => {
  if (!audioBlob) return;

  // 送信中は無視
  if (isSubmitting) return;

  // クールダウン中は無視（軽くメッセ出す）
  if (Date.now() < cooldownUntil) {
    const remain = Math.ceil((cooldownUntil - Date.now()) / 1000);
    resultDiv.innerHTML = `<b>再送信まで ${remain}秒 お待ちください。</b>`;
    return;
  }

  isSubmitting = true;

  const prevSubmitLabel = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "送信中…";
  submitBtn.style.opacity = "0.6";
  submitBtn.style.pointerEvents = "none";

  // 他ボタンもロック（任意）
  const locked = [];
  const lock = (btn) => { if (btn && !btn.disabled) { btn.disabled = true; locked.push(btn); } };
  lock(recordBtn); lock(playBtn); lock(ttsBtn); lock(ttsStopBtn);

  try {
    let fd = new FormData();
    fd.append("audio", audioBlob, "audio.webm");
    fd.append("text", refText);

    resultDiv.innerHTML = "<b>評価中...</b>";
    const resp = await fetch("/api/evaluate", { method: "POST", body: fd });
    const data = await resp.json();

    if (data.result) {
      resultDiv.innerHTML =
        `<div>
          <b>評価サマリー</b>
          <ul>
            <li>全体スコア: ${data.result.overall}</li>
            <li>流暢さ: ${data.result.fluency}</li>
            <li>発音: ${data.result.pronunciation}</li>
            <li>リズム: ${data.result.rhythm}</li>
            <li>速度: ${data.result.speed}</li>
          </ul>
          <details><summary>詳細JSON</summary><pre>${JSON.stringify(data, null, 2)}</pre></details>
        </div>`;
      renderScriptColor(data.result.words); // 評価後は色分け
    } else {
      resultDiv.innerHTML =
        `<span style="color:crimson"><b>エラー発生</b></span><pre>${JSON.stringify(data, null, 2)}</pre>`;
      renderScriptSpans(refText.match(/\S+/g) || []);
    }
  } catch (err) {
    resultDiv.innerHTML =
      `<span style="color:crimson"><b>通信エラー</b></span><pre>${String(err)}</pre>`;
    renderScriptSpans(refText.match(/\S+/g) || []);
  } finally {
    // “送信中”解除
    isSubmitting = false;

    // 一旦表示戻す（startCooldownが上書き）
    submitBtn.textContent = prevSubmitLabel || "評価提出";

    // 他ボタン解放
    locked.forEach(b => b.disabled = false);

    // 成否に関わらずクールダウン開始（連打抑制）
    startCooldown();
  }
};
