const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const nextCanvas = document.getElementById("nextCanvas");
const nextCtx = nextCanvas.getContext("2d");
const lightningOverlay = document.getElementById("lightningOverlay");

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BLOCK_SIZE = 30;

let board = Array(BOARD_HEIGHT)
  .fill(null)
  .map(() => Array(BOARD_WIDTH).fill(0));
let score = 0;
let level = 1;
let lines = 0;
let dropTime = 0;
let lastTime = 0;
let isHardDropped = false;
let hardDropUsed = false;
let inputLocked = false;

// BGM関連の変数
let bgmAudio = null;
let isBGMEnabled = true;
let hasUserInteracted = false;
let bgmStarted = false;

// 音楽ビジュアライザー関連の変数
let audioContext = null;
let analyser = null;
let dataArray = null;
let bufferLength = 0;
let audioSource = null;

// ビジュアルエフェクト用の変数
let bassLevel = 0;
let midLevel = 0;
let trebleLevel = 0;
let averageLevel = 0;
let beatThreshold = 0.3;
let lastBeatTime = 0;
let backgroundHue = 0;
let pulseIntensity = 0;

// Tetris pieces with glassmorphism colors (ピンク系を青緑系に変更)
const pieces = [
  { shape: [[1, 1, 1, 1]], color: "rgba(255, 107, 107, 0.8)" }, // I - 赤
  {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: "rgba(78, 205, 196, 0.8)",
  }, // O - 青緑
  {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    color: "rgba(69, 183, 209, 0.8)",
  }, // T - 青
  {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    color: "rgba(150, 206, 180, 0.8)",
  }, // S - ライトグリーン
  {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    color: "rgba(254, 202, 87, 0.8)",
  }, // Z - オレンジ
  {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    color: "rgba(100, 200, 255, 0.8)",
  }, // J - ライトブルー (ピンクから変更)
  {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
    color: "rgba(154, 236, 219, 0.8)",
  }, // L - アクアマリン
];

let currentPiece = getRandomPiece();
let nextPiece = getRandomPiece();
let currentX = 3;
let currentY = 0;

// オーディオアナライザーの初期化
function initAudioAnalyzer() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    if (bgmAudio && !audioSource) {
      audioSource = audioContext.createMediaElementSource(bgmAudio);
      audioSource.connect(analyser);
      analyser.connect(audioContext.destination);
    }
  } catch (e) {
    console.log("オーディオアナライザーの初期化に失敗:", e);
  }
}

// 音楽データの分析
function analyzeAudio() {
  if (!analyser || !dataArray) return;

  analyser.getByteFrequencyData(dataArray);

  // 周波数帯域を分析
  const bassRange = Math.floor(bufferLength * 0.1);
  const midRange = Math.floor(bufferLength * 0.5);
  const trebleRange = bufferLength;

  let bassSum = 0,
    midSum = 0,
    trebleSum = 0;

  // 低音域 (0-10%)
  for (let i = 0; i < bassRange; i++) {
    bassSum += dataArray[i];
  }
  bassLevel = bassSum / bassRange / 255;

  // 中音域 (10-50%)
  for (let i = bassRange; i < midRange; i++) {
    midSum += dataArray[i];
  }
  midLevel = midSum / (midRange - bassRange) / 255;

  // 高音域 (50-100%)
  for (let i = midRange; i < trebleRange; i++) {
    trebleSum += dataArray[i];
  }
  trebleLevel = trebleSum / (trebleRange - midRange) / 255;

  // 全体的なレベル
  averageLevel = (bassSum + midSum + trebleSum) / bufferLength / 255;

  // ビート検出
  if (bassLevel > beatThreshold && Date.now() - lastBeatTime > 200) {
    lastBeatTime = Date.now();
    triggerBeatEffect();
  }

  // 背景色の変更
  backgroundHue = (backgroundHue + trebleLevel * 2) % 360;
  pulseIntensity = averageLevel;
}

// ビートエフェクトのトリガー（背景のみ、青緑系）
function triggerBeatEffect() {
  // 背景にフラッシュエフェクト（青緑系）
  if (lightningOverlay) {
    const safeHue = 120 + (backgroundHue % 180); // 青緑系に限定
    lightningOverlay.style.background = `hsla(${safeHue}, 60%, 40%, ${bassLevel * 0.15})`;
    lightningOverlay.style.opacity = "0.2";
    setTimeout(() => {
      lightningOverlay.style.opacity = "0";
    }, 100);
  }

  // 背景パーティクルを増加
  for (let i = 0; i < 3; i++) {
    setTimeout(() => createMusicParticle(), i * 50);
  }
}

// 音楽に合わせた特別なパーティクル（青緑系）
function createMusicParticle() {
  const particle = document.createElement("div");
  particle.className = "music-particle";
  particle.style.position = "absolute";
  particle.style.left = Math.random() * window.innerWidth + "px";
  particle.style.top = window.innerHeight + "px";
  particle.style.pointerEvents = "none";
  particle.style.zIndex = "-1";

  const size = 3 + averageLevel * 5;
  // 青緑系の色相に限定（120-300度）
  const hue = 120 + Math.random() * 180;
  particle.style.width = size + "px";
  particle.style.height = size + "px";
  particle.style.background = `hsl(${hue}, 70%, 55%)`;
  particle.style.borderRadius = "50%";
  particle.style.boxShadow = `0 0 ${size * 3}px hsl(${hue}, 70%, 55%)`;

  const duration = 3000 + Math.random() * 2000;
  particle.style.animation = `musicFloat ${duration}ms linear forwards`;

  document.body.appendChild(particle);
  setTimeout(() => particle.remove(), duration);
}

// 背景の動的更新（ピンク系の色相を除外）
function updateDynamicBackground() {
  const body = document.body;
  const gameContainer = document.querySelector(".game-container");

  if (bgmStarted && analyser) {
    // 音楽に合わせて背景グラデーションを変更（ピンク系を避ける）
    const intensity = pulseIntensity;

    // ピンク系（300-360度, 0-60度）を避けて、青緑系中心に
    let hue1 = 120 + (backgroundHue % 180); // 120-300度の範囲
    let hue2 = 120 + ((backgroundHue + 30) % 180);
    let hue3 = 120 + ((backgroundHue + 60) % 180);
    let hue4 = 120 + ((backgroundHue + 90) % 180);
    let hue5 = 120 + ((backgroundHue + 120) % 180);
    let hue6 = 120 + ((backgroundHue + 150) % 180);

    body.style.background = `linear-gradient(45deg, 
      hsl(${hue1}, ${50 + intensity * 30}%, ${40 + intensity * 15}%), 
      hsl(${hue2}, ${60 + intensity * 25}%, ${35 + intensity * 20}%), 
      hsl(${hue3}, ${55 + intensity * 30}%, ${45 + intensity * 10}%), 
      hsl(${hue4}, ${65 + intensity * 20}%, ${40 + intensity * 15}%), 
      hsl(${hue5}, ${50 + intensity * 35}%, ${35 + intensity * 20}%), 
      hsl(${hue6}, ${60 + intensity * 25}%, ${45 + intensity * 10}%))`;

    // 背景サイズを音楽に合わせて変更
    body.style.backgroundSize = `${300 + intensity * 200}% ${300 + intensity * 200}%`;

    // ゲームコンテナのグロー効果（青緑系）
    if (gameContainer) {
      const glowHue = 120 + (backgroundHue % 180);
      gameContainer.style.boxShadow = `
        0 8px 32px rgba(0, 0, 0, 0.3),
        0 0 ${20 + intensity * 40}px hsla(${glowHue}, 70%, 50%, ${intensity * 0.4})
      `;
    }
  }
}

// BGM初期化と自動開始
function initBGM() {
  bgmAudio = document.getElementById("bgmAudio");
  if (bgmAudio) {
    bgmAudio.volume = 0.2;
    bgmAudio.addEventListener("loadeddata", () => {
      console.log("BGM loaded successfully");
      initAudioAnalyzer();
      setTimeout(() => {
        startBGMAutomatically();
      }, 1000);
    });
    bgmAudio.addEventListener("error", (e) => {
      console.warn("BGM could not be loaded:", e);
      isBGMEnabled = false;
      updateBGMButton();
    });
  }
}

// 自動BGM開始
function startBGMAutomatically() {
  if (bgmAudio && isBGMEnabled && !bgmStarted) {
    // AudioContextの再開
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume();
    }

    bgmAudio
      .play()
      .then(() => {
        console.log("BGM started automatically");
        bgmStarted = true;
        if (!audioSource && audioContext) {
          initAudioAnalyzer();
        }
      })
      .catch((e) => {
        console.log("Auto BGM failed, waiting for user interaction:", e);
      });
  }
}

// BGMを開始（ユーザーインタラクション後）
function startBGM() {
  if (bgmAudio && isBGMEnabled && !bgmStarted) {
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume();
    }

    bgmAudio
      .play()
      .then(() => {
        bgmStarted = true;
        if (!audioSource && audioContext) {
          initAudioAnalyzer();
        }
      })
      .catch((e) => {
        console.warn("BGM playbook failed:", e);
        isBGMEnabled = false;
        updateBGMButton();
      });
  }
}

// BGMトグル
function toggleBGM() {
  if (!bgmAudio) return;

  isBGMEnabled = !isBGMEnabled;

  if (isBGMEnabled) {
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume();
    }

    bgmAudio
      .play()
      .then(() => {
        bgmStarted = true;
        if (!audioSource && audioContext) {
          initAudioAnalyzer();
        }
      })
      .catch((e) => {
        console.warn("BGM playback failed:", e);
        isBGMEnabled = false;
      });
  } else {
    bgmAudio.pause();
    bgmStarted = false;
  }

  updateBGMButton();
}

// BGMボタン更新
function updateBGMButton() {
  const bgmButton = document.getElementById("bgmToggle");
  if (bgmButton) {
    bgmButton.textContent = isBGMEnabled ? "🔊 ON" : "🔇 OFF";
    bgmButton.classList.toggle("muted", !isBGMEnabled);
  }
}

// 音量設定
function setVolume(value) {
  if (bgmAudio) {
    bgmAudio.volume = value / 100;
  }
}

// ユーザーインタラクションの検出とBGM開始
function handleUserInteraction() {
  if (!hasUserInteracted) {
    hasUserInteracted = true;
    if (!bgmStarted) {
      startBGM();
    }
  }
}

function getRandomPiece() {
  return pieces[Math.floor(Math.random() * pieces.length)];
}

function drawBlock(ctx, x, y, color, size = BLOCK_SIZE) {
  // ゲームブロックは音楽に影響されない、クリアで見やすいデザイン
  const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, color.replace("0.8", "0.4"));

  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, size, size);

  // Glass border (固定の明るさ)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, size, size);

  // Inner highlight (固定)
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.fillRect(x + 2, y + 2, size - 4, 8);

  // Shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.fillRect(x + 2, y + size - 6, size - 4, 4);
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw board background with subtle pattern (固定で見やすく)
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      if (board[y][x]) {
        drawBlock(ctx, x * BLOCK_SIZE, y * BLOCK_SIZE, board[y][x]);
      } else {
        // Empty cell with glass effect (固定で見やすく)
        ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      }
    }
  }
}

function drawPiece(piece, x, y) {
  piece.shape.forEach((row, dy) => {
    row.forEach((value, dx) => {
      if (value) {
        drawBlock(
          ctx,
          (x + dx) * BLOCK_SIZE,
          (y + dy) * BLOCK_SIZE,
          piece.color
        );
      }
    });
  });
}

function drawGhostPiece(piece, x, y) {
  // Calculate landing position
  let ghostY = y;
  while (isValidMove(piece, x, ghostY + 1)) {
    ghostY++;
  }

  // Only draw ghost if it's different from current position
  if (ghostY !== y) {
    piece.shape.forEach((row, dy) => {
      row.forEach((value, dx) => {
        if (value) {
          drawGhostBlock(
            ctx,
            (x + dx) * BLOCK_SIZE,
            (ghostY + dy) * BLOCK_SIZE,
            piece.color
          );
        }
      });
    });
  }
}

function drawGhostBlock(ctx, x, y, color, size = BLOCK_SIZE) {
  // Ghost block with subtle glassmorphism effect (固定で見やすく)
  const ghostColor = color.replace("0.8", "0.2");

  // Outer glow effect (固定)
  ctx.save();
  ctx.shadowColor = color.replace("rgba", "rgb").replace(", 0.8)", ")");
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Main ghost block
  ctx.fillStyle = ghostColor;
  ctx.fillRect(x, y, size, size);

  ctx.restore();

  // Dotted border for ghost effect (固定)
  ctx.strokeStyle = color.replace("0.8", "0.6");
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(x, y, size, size);
  ctx.setLineDash([]);

  // Inner highlight (very subtle, 固定)
  ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
  ctx.fillRect(x + 2, y + 2, size - 4, 4);
}

function drawNextPiece() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);

  const blockSize = 20;
  const offsetX =
    (nextCanvas.width - nextPiece.shape[0].length * blockSize) / 2;
  const offsetY = (nextCanvas.height - nextPiece.shape.length * blockSize) / 2;

  nextPiece.shape.forEach((row, dy) => {
    row.forEach((value, dx) => {
      if (value) {
        drawBlock(
          nextCtx,
          offsetX + dx * blockSize,
          offsetY + dy * blockSize,
          nextPiece.color,
          blockSize
        );
      }
    });
  });
}

function isValidMove(piece, x, y) {
  return piece.shape.every((row, dy) => {
    return row.every((value, dx) => {
      if (!value) return true;
      const newX = x + dx;
      const newY = y + dy;
      return (
        newX >= 0 &&
        newX < BOARD_WIDTH &&
        newY >= 0 &&
        newY < BOARD_HEIGHT &&
        !board[newY][newX]
      );
    });
  });
}

function rotatePiece(piece) {
  const rotated = piece.shape[0].map((_, index) =>
    piece.shape.map((row) => row[index]).reverse()
  );
  return { ...piece, shape: rotated };
}

function rotatePieceCounterClockwise(piece) {
  const rotated = piece.shape[0].map((_, index) =>
    piece.shape.map((row) => row[row.length - 1 - index])
  );
  return { ...piece, shape: rotated };
}

function placePiece() {
  if (inputLocked) return;

  inputLocked = true;

  currentPiece.shape.forEach((row, dy) => {
    row.forEach((value, dx) => {
      if (value) {
        board[currentY + dy][currentX + dx] = currentPiece.color;
      }
    });
  });

  playPieceLockSFX();
  clearLines();
  currentPiece = nextPiece;
  nextPiece = getRandomPiece();
  currentX = 3;
  currentY = 0;
  isHardDropped = false;
  hardDropUsed = false;

  if (!isValidMove(currentPiece, currentX, currentY)) {
    gameOver();
  }

  setTimeout(() => (inputLocked = false), 100);
}

function clearLines() {
  const fullRows = [];
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    if (board[y].every((cell) => cell !== 0)) {
      fullRows.push(y);
    }
  }

  if (fullRows.length > 0) {
    playLineClearSound(fullRows.length);

    animateLineClear(fullRows, () => {
      fullRows.forEach((row) => {
        board.splice(row, 1);
        board.unshift(Array(BOARD_WIDTH).fill(0));
      });

      lines += fullRows.length;
      score +=
        fullRows.length *
        100 *
        level *
        (fullRows.length > 1 ? fullRows.length : 1);
      level = Math.floor(lines / 10) + 1;
      updateUI();

      if (typeof window.discord !== "undefined") {
        const details = "レベル: " + level;
        const state = "スコア: " + score;
        window.discord.updateStatus({ details, state });
      }
    });
  }
}

function animateLineClear(fullRows, callback) {
  const duration = 800;
  let startTime = null;

  // Lightning flash effect (音楽に合わせて強化)
  const flashIntensity = bgmStarted ? 0.5 + bassLevel * 0.3 : 0.5;
  lightningOverlay.style.background = `hsla(${backgroundHue}, 80%, 70%, ${flashIntensity})`;
  lightningOverlay.style.animation = "lightningFlash 0.5s ease-in-out";
  setTimeout(() => {
    lightningOverlay.style.animation = "";
    lightningOverlay.style.background = "";
  }, 500);

  function animate(currentTime) {
    if (!startTime) startTime = currentTime;
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < BOARD_HEIGHT; y++) {
      if (!fullRows.includes(y)) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
          if (board[y][x]) {
            drawBlock(ctx, x * BLOCK_SIZE, y * BLOCK_SIZE, board[y][x]);
          } else {
            // 固定の見やすいデザイン
            ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
            ctx.fillRect(
              x * BLOCK_SIZE,
              y * BLOCK_SIZE,
              BLOCK_SIZE,
              BLOCK_SIZE
            );
            ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
            ctx.lineWidth = 1;
            ctx.strokeRect(
              x * BLOCK_SIZE,
              y * BLOCK_SIZE,
              BLOCK_SIZE,
              BLOCK_SIZE
            );
          }
        }
      }
    }

    fullRows.forEach((row) => {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (board[row][x]) {
          drawGlowingExplodingBlock(
            ctx,
            x * BLOCK_SIZE,
            row * BLOCK_SIZE,
            board[row][x],
            progress
          );
        }
      }

      drawLightningWave(row, progress);
      drawElectricArcs(row, progress);
    });

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      callback();
    }
  }

  requestAnimationFrame(animate);
}

function drawGlowingExplodingBlock(
  ctx,
  x,
  y,
  color,
  progress,
  size = BLOCK_SIZE
) {
  const scale = 1 + progress * 0.3;
  const alpha = Math.max(0, (1 - progress) * 0.9);
  const newSize = size * scale;
  const offset = (size - newSize) / 2;

  ctx.save();

  // 音楽に合わせてグロー効果を強化
  const glowIntensity = 30 + progress * 50 + (bgmStarted ? bassLevel * 40 : 0);
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = glowIntensity;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  const glowColor = `rgba(255, 255, 255, ${alpha * 0.8})`;
  ctx.fillStyle = glowColor;
  ctx.fillRect(x + offset, y + offset, newSize, newSize);

  ctx.shadowColor = color.replace("rgba", "rgb").replace(", 0.8)", ")");
  ctx.shadowBlur = 20 + progress * 30 + (bgmStarted ? midLevel * 25 : 0);

  const mainColor = color.replace("0.8", alpha.toString());
  ctx.fillStyle = mainColor;
  ctx.fillRect(x + offset + 2, y + offset + 2, newSize - 4, newSize - 4);

  ctx.restore();

  if (progress > 0.2) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 3 + progress * 5 + (bgmStarted ? trebleLevel * 3 : 0);
    ctx.setLineDash([Math.floor(progress * 15), Math.floor(progress * 8)]);
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 15 + (bgmStarted ? averageLevel * 10 : 0);
    ctx.strokeRect(x + offset, y + offset, newSize, newSize);
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
  }

  if (progress > 0.4) {
    const coreSize = newSize * (0.3 + progress * 0.4);
    const coreOffset = (newSize - coreSize) / 2;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
    ctx.fillRect(
      x + offset + coreOffset,
      y + offset + coreOffset,
      coreSize,
      coreSize
    );
  }
}

function drawLightningWave(row, progress) {
  const waveWidth = canvas.width;
  const baseIntensity = Math.sin(progress * Math.PI) * 0.8;
  const musicIntensity = bgmStarted ? bassLevel * 0.5 : 0;
  const intensity = baseIntensity + musicIntensity;

  const gradient = ctx.createLinearGradient(0, 0, waveWidth, 0);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
  gradient.addColorStop(0.3, `rgba(255, 255, 255, ${intensity})`);
  gradient.addColorStop(0.7, `rgba(135, 206, 250, ${intensity * 0.8})`);
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, row * BLOCK_SIZE - 5, waveWidth, BLOCK_SIZE + 10);

  const electricGradient = ctx.createLinearGradient(0, 0, waveWidth, 0);
  electricGradient.addColorStop(0, "rgba(0, 191, 255, 0)");
  electricGradient.addColorStop(0.5, `rgba(0, 191, 255, ${intensity * 0.6})`);
  electricGradient.addColorStop(1, "rgba(0, 191, 255, 0)");

  ctx.fillStyle = electricGradient;
  ctx.fillRect(
    0,
    row * BLOCK_SIZE + 2,
    waveWidth * (0.5 + progress * 0.5),
    BLOCK_SIZE - 4
  );
}

function drawElectricArcs(row, progress) {
  if (progress < 0.3) return;

  const arcIntensity =
    Math.sin(progress * Math.PI) * 0.7 + (bgmStarted ? trebleLevel * 0.3 : 0);
  ctx.strokeStyle = `rgba(255, 255, 255, ${arcIntensity})`;
  ctx.lineWidth = 2 + progress * 3 + (bgmStarted ? midLevel * 2 : 0);
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 10 + (bgmStarted ? bassLevel * 15 : 0);

  const numArcs = 5 + Math.floor(bgmStarted ? averageLevel * 5 : 0);
  for (let i = 0; i < numArcs; i++) {
    const startX = Math.random() * canvas.width;
    const endX = Math.random() * canvas.width;
    const y = row * BLOCK_SIZE + BLOCK_SIZE / 2;
    const midY =
      y + (Math.random() - 0.5) * (20 + (bgmStarted ? bassLevel * 30 : 0));

    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.quadraticCurveTo((startX + endX) / 2, midY, endX, y);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
}

// Enhanced Audio system
function initAudio() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  } catch (e) {
    console.log("オーディオコンテキストの作成に失敗:", e);
  }
}

function createOscillator(
  frequency,
  type = "sine",
  duration = 0.1,
  volume = 0.1
) {
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const filterNode = audioContext.createBiquadFilter();

  oscillator.connect(filterNode);
  filterNode.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  oscillator.type = type;

  filterNode.type = "highpass";
  filterNode.frequency.setValueAtTime(
    frequency * 0.5,
    audioContext.currentTime
  );

  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + duration
  );

  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
  oscillator.onended = () => {
    oscillator.disconnect();
    gainNode.disconnect();
    filterNode.disconnect();
  };
}

function playLineClearSound(lineCount) {
  initAudio();
  if (!audioContext) return;

  switch (lineCount) {
    case 1:
      createOscillator(523.25, "square", 0.15);
      setTimeout(() => createOscillator(659.25, "square", 0.15), 50);
      break;
    case 2:
      createOscillator(523.25, "square", 0.1);
      setTimeout(() => createOscillator(659.25, "square", 0.1), 40);
      setTimeout(() => createOscillator(783.99, "square", 0.15), 80);
      break;
    case 3:
      createOscillator(523.25, "square", 0.08);
      setTimeout(() => createOscillator(659.25, "square", 0.08), 30);
      setTimeout(() => createOscillator(783.99, "square", 0.08), 60);
      setTimeout(() => createOscillator(1046.5, "square", 0.2), 90);
      break;
    case 4:
      const frequencies = [523.25, 659.25, 783.99, 1046.5];
      frequencies.forEach((freq, i) => {
        setTimeout(() => createOscillator(freq, "sawtooth", 0.1), i * 40);
      });
      setTimeout(() => createOscillator(1318.51, "sawtooth", 0.3), 160);
      break;
  }
}

function playMoveSFX() {
  initAudio();
  createOscillator(400, "square", 0.03, 0.05);
}

function playRotateSFX() {
  initAudio();
  createOscillator(600, "triangle", 0.05, 0.06);
  setTimeout(() => createOscillator(800, "triangle", 0.05, 0.04), 25);
}

function playDropSFX() {
  initAudio();
  createOscillator(800, "sawtooth", 0.02, 0.08);
  setTimeout(() => createOscillator(400, "sawtooth", 0.02, 0.08), 20);
  setTimeout(() => createOscillator(200, "sawtooth", 0.08, 0.1), 40);
}

function playHardDropSFX() {
  initAudio();
  createOscillator(1000, "sawtooth", 0.02, 0.12);
  setTimeout(() => createOscillator(600, "sawtooth", 0.02, 0.12), 15);
  setTimeout(() => createOscillator(300, "sawtooth", 0.02, 0.12), 30);
  setTimeout(() => createOscillator(150, "sawtooth", 0.15, 0.15), 45);
}

function playPieceLockSFX() {
  initAudio();
  createOscillator(300, "square", 0.06, 0.06);
  setTimeout(() => createOscillator(200, "square", 0.08, 0.06), 30);
}

function playGameOverSFX() {
  initAudio();
  if (!audioContext) return;

  const frequencies = [523.25, 466.16, 415.3, 369.99, 329.63];
  frequencies.forEach((freq, i) => {
    setTimeout(() => createOscillator(freq, "triangle", 0.3), i * 200);
  });
}

function gameOver() {
  playGameOverSFX();
  if (bgmAudio && isBGMEnabled) {
    bgmAudio.pause();
  }
  document.getElementById("finalScore").textContent = score;
  document.getElementById("gameOver").style.display = "block";

  if (typeof window.discord !== "undefined") {
    const details = "ゲームオーバー: " + "レベル " + level;
    const state = "最終スコア: " + score;
    window.discord.updateStatus({ details, state });
  }
}

function restartGame() {
  board = Array(BOARD_HEIGHT)
    .fill(null)
    .map(() => Array(BOARD_WIDTH).fill(0));
  score = 0;
  level = 1;
  lines = 0;
  currentPiece = getRandomPiece();
  nextPiece = getRandomPiece();
  currentX = 3;
  currentY = 0;
  isHardDropped = false;
  document.getElementById("gameOver").style.display = "none";
  updateUI();
  startBGM();
  gameLoop();
}

function updateUI() {
  document.getElementById("score").textContent = score;
  document.getElementById("level").textContent = level;
  document.getElementById("lines").textContent = lines;
}

function gameLoop(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;
  dropTime += deltaTime;

  // 音楽データの分析（毎フレーム実行）
  if (bgmStarted) {
    analyzeAudio();
    updateDynamicBackground();
  }

  if (dropTime > 1000 / level) {
    if (isValidMove(currentPiece, currentX, currentY + 1)) {
      currentY++;
    } else {
      placePiece();
    }
    dropTime = 0;
  }

  drawBoard();
  drawGhostPiece(currentPiece, currentX, currentY);
  drawPiece(currentPiece, currentX, currentY);
  drawNextPiece();

  requestAnimationFrame(gameLoop);
}

// Enhanced Controls with hard drop fix
document.addEventListener("keydown", (e) => {
  handleUserInteraction();

  if (
    isHardDropped &&
    (e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "x" ||
      e.key === "X" ||
      e.key === "z" ||
      e.key === "Z" ||
      e.key === " ")
  ) {
    return;
  }

  switch (e.key) {
    case "ArrowLeft":
      if (isValidMove(currentPiece, currentX - 1, currentY)) {
        currentX--;
        playMoveSFX();
      }
      break;
    case "ArrowRight":
      if (isValidMove(currentPiece, currentX + 1, currentY)) {
        currentX++;
        playMoveSFX();
      }
      break;
    case "ArrowDown":
      if (isValidMove(currentPiece, currentX, currentY + 1)) {
        currentY++;
        playMoveSFX();
      }
      break;
    case "ArrowUp":
      if (!hardDropUsed) {
        while (isValidMove(currentPiece, currentX, currentY + 1)) {
          currentY++;
        }
        setTimeout(() => {}, 400);
        playHardDropSFX();
        isHardDropped = true;
        hardDropUsed = true;
        setTimeout(() => {
          placePiece();
        }, 50);
      }
      break;
    case "x":
    case "X":
      const rotatedCW = rotatePiece(currentPiece);
      if (isValidMove(rotatedCW, currentX, currentY)) {
        currentPiece = rotatedCW;
        playRotateSFX();
      }
      break;
    case "z":
    case "Z":
      const rotatedCCW = rotatePieceCounterClockwise(currentPiece);
      if (isValidMove(rotatedCCW, currentX, currentY)) {
        currentPiece = rotatedCCW;
        playRotateSFX();
      }
      break;
    case " ":
      const rotatedSpace = rotatePiece(currentPiece);
      if (isValidMove(rotatedSpace, currentX, currentY)) {
        currentPiece = rotatedSpace;
        playRotateSFX();
      }
      break;
    case "m":
    case "M":
      toggleBGM();
      break;
  }
});

// ハードドロップフラグをリセット
document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowUp") {
    hardDropUsed = false;
  }
});

// Create floating particles with music reactivity (背景のみ、青緑系)
function createFloatingParticles() {
  setInterval(
    () => {
      const particle = document.createElement("div");
      particle.className = "particle";
      particle.style.left = Math.random() * window.innerWidth + "px";
      particle.style.animationDelay = Math.random() * 2 + "s";
      particle.style.zIndex = "-1"; // 背景に配置

      // 音楽に合わせてパーティクルのサイズと色を変更（青緑系）
      if (bgmStarted) {
        const size = 2 + averageLevel * 6;
        const hue = 120 + Math.random() * 180; // 120-300度の青緑系
        particle.style.width = size + "px";
        particle.style.height = size + "px";
        particle.style.background = `hsl(${hue}, 60%, 50%)`;
        particle.style.boxShadow = `0 0 ${size * 2}px hsl(${hue}, 60%, 50%)`;
      }

      document.body.appendChild(particle);

      setTimeout(() => particle.remove(), 10000);
    },
    400 + Math.random() * 600
  );
}

// Initialize game
document.addEventListener("DOMContentLoaded", () => {
  initBGM();
  updateUI();
  initAudio();
  createFloatingParticles();
  updateBGMButton();
  gameLoop();

  if (typeof window.discord !== "undefined") {
    const details = "レベル: " + level;
    const state = "スコア: " + score;
    window.discord.updateStatus({ details, state });
  }
});
