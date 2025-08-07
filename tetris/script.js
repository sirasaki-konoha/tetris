const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');
const lightningOverlay = document.getElementById('lightningOverlay');

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BLOCK_SIZE = 30;

let board = Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));
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

// Tetris pieces with glassmorphism colors
const pieces = [
    { shape: [[1,1,1,1]], color: 'rgba(255, 107, 107, 0.8)' }, // I
    { shape: [[1,1],[1,1]], color: 'rgba(78, 205, 196, 0.8)' }, // O
    { shape: [[0,1,0],[1,1,1]], color: 'rgba(69, 183, 209, 0.8)' }, // T
    { shape: [[0,1,1],[1,1,0]], color: 'rgba(150, 206, 180, 0.8)' }, // S
    { shape: [[1,1,0],[0,1,1]], color: 'rgba(254, 202, 87, 0.8)' }, // Z
    { shape: [[1,0,0],[1,1,1]], color: 'rgba(255, 159, 243, 0.8)' }, // J
    { shape: [[0,0,1],[1,1,1]], color: 'rgba(154, 236, 219, 0.8)' }  // L
];

let currentPiece = getRandomPiece();
let nextPiece = getRandomPiece();
let currentX = 3;
let currentY = 0;

// BGM初期化と自動開始
function initBGM() {
    bgmAudio = document.getElementById('bgmAudio');
    if (bgmAudio) {
        bgmAudio.volume = 0.2;
        bgmAudio.addEventListener('loadeddata', () => {
            console.log('BGM loaded successfully');
            // ページロード後に少し遅延してBGM開始を試行
            setTimeout(() => {
                startBGMAutomatically();
            }, 1000);
        });
        bgmAudio.addEventListener('error', (e) => {
            console.warn('BGM could not be loaded:', e);
            isBGMEnabled = false;
            updateBGMButton();
        });
    }
}

// 自動BGM開始
function startBGMAutomatically() {
    if (bgmAudio && isBGMEnabled && !bgmStarted) {
        bgmAudio.play().then(() => {
            console.log('BGM started automatically');
            bgmStarted = true;
        }).catch(e => {
            console.log('Auto BGM failed, waiting for user interaction:', e);
            // ユーザーインタラクションを待つ
        });
    }
}

// BGMを開始（ユーザーインタラクション後）
function startBGM() {
    if (bgmAudio && isBGMEnabled && !bgmStarted) {
        bgmAudio.play().then(() => {
            bgmStarted = true;
        }).catch(e => {
            console.warn('BGM playbook failed:', e);
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
        bgmAudio.play().then(() => {
            bgmStarted = true;
        }).catch(e => {
            console.warn('BGM playback failed:', e);
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
    const bgmButton = document.getElementById('bgmToggle');
    if (bgmButton) {
        bgmButton.textContent = isBGMEnabled ? '🔊 ON' : '🔇 OFF';
        bgmButton.classList.toggle('muted', !isBGMEnabled);
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
    // Glassmorphism effect
    const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color.replace('0.8', '0.4'));

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, size, size);

    // Glass border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, size, size);

    // Inner highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x + 2, y + 2, size - 4, 8);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(x + 2, y + size - 6, size - 4, 4);
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw board background with subtle pattern
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (board[y][x]) {
                drawBlock(ctx, x * BLOCK_SIZE, y * BLOCK_SIZE, board[y][x]);
            } else {
                // Empty cell with glass effect
                ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
                ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
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
                drawBlock(ctx, (x + dx) * BLOCK_SIZE, (y + dy) * BLOCK_SIZE, piece.color);
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
                    drawGhostBlock(ctx, (x + dx) * BLOCK_SIZE, (ghostY + dy) * BLOCK_SIZE, piece.color);
                }
            });
        });
    }
}

function drawGhostBlock(ctx, x, y, color, size = BLOCK_SIZE) {
    // Ghost block with subtle glassmorphism effect
    const ghostColor = color.replace('0.8', '0.2');

    // Outer glow effect
    ctx.save();
    ctx.shadowColor = color.replace('rgba', 'rgb').replace(', 0.8)', ')');
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Main ghost block
    ctx.fillStyle = ghostColor;
    ctx.fillRect(x, y, size, size);

    ctx.restore();

    // Dotted border for ghost effect
    ctx.strokeStyle = color.replace('0.8', '0.6');
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, size, size);
    ctx.setLineDash([]);

    // Inner highlight (very subtle)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(x + 2, y + 2, size - 4, 4);
}

function drawNextPiece() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);

    const blockSize = 20;
    const offsetX = (nextCanvas.width - nextPiece.shape[0].length * blockSize) / 2;
    const offsetY = (nextCanvas.height - nextPiece.shape.length * blockSize) / 2;

    nextPiece.shape.forEach((row, dy) => {
        row.forEach((value, dx) => {
            if (value) {
                drawBlock(nextCtx, offsetX + dx * blockSize, offsetY + dy * blockSize, nextPiece.color, blockSize);
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
            return newX >= 0 && newX < BOARD_WIDTH && 
                   newY >= 0 && newY < BOARD_HEIGHT && 
                   !board[newY][newX];
        });
    });
}

function rotatePiece(piece) {
    const rotated = piece.shape[0].map((_, index) =>
        piece.shape.map(row => row[index]).reverse()
    );
    return { ...piece, shape: rotated };
}

function rotatePieceCounterClockwise(piece) {
    const rotated = piece.shape[0].map((_, index) =>
        piece.shape.map(row => row[row.length - 1 - index])
    );
    return { ...piece, shape: rotated };
}


function placePiece() {
    if (inputLocked) return; // ←入力ロック中なら無視

    inputLocked = true; // 入力を一時ロック

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

    // 少し時間をおいて入力ロックを解除（例：100ms）
    setTimeout(() => inputLocked = false, 100);
}


function clearLines() {
    const fullRows = [];
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        if (board[y].every(cell => cell !== 0)) {
            fullRows.push(y);
        }
    }

    if (fullRows.length > 0) {
        // Play line clear sound
        playLineClearSound(fullRows.length);

        // Enhanced line clear animation with lightning effect
        animateLineClear(fullRows, () => {
            fullRows.forEach(row => {
                board.splice(row, 1);
                board.unshift(Array(BOARD_WIDTH).fill(0));
            });

            lines += fullRows.length;
            score += fullRows.length * 100 * level * (fullRows.length > 1 ? fullRows.length : 1);
            level = Math.floor(lines / 10) + 1;
            updateUI();
        });
    }
}

function animateLineClear(fullRows, callback) {
    const duration = 800;
    let startTime = null;

    // Lightning flash effect
    lightningOverlay.style.animation = 'lightningFlash 0.5s ease-in-out';
    setTimeout(() => {
        lightningOverlay.style.animation = '';
    }, 500);

    function animate(currentTime) {
        if (!startTime) startTime = currentTime;
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Clear canvas and redraw board
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw non-clearing rows normally
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            if (!fullRows.includes(y)) {
                for (let x = 0; x < BOARD_WIDTH; x++) {
                    if (board[y][x]) {
                        drawBlock(ctx, x * BLOCK_SIZE, y * BLOCK_SIZE, board[y][x]);
                    } else {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
                        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    }
                }
            }
        }

        // Draw clearing rows with enhanced lighting effects
        fullRows.forEach(row => {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                if (board[row][x]) {
                    drawGlowingExplodingBlock(ctx, x * BLOCK_SIZE, row * BLOCK_SIZE, board[row][x], progress);
                }
            }

            // Enhanced lightning wave effect
            drawLightningWave(row, progress);
            drawElectricArcs(row, progress);

            // Create intense light particles (removed)
            // if (progress < 0.8) {
            //     for (let x = 0; x < BOARD_WIDTH; x++) {
            //         if (Math.random() < 0.5) {
            //             createLightningSparkle(x * BLOCK_SIZE + BLOCK_SIZE/2, row * BLOCK_SIZE + BLOCK_SIZE/2, progress);
            //         }
            //     }
            // }
        });

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            callback();
        }
    }

    requestAnimationFrame(animate);
}

function drawGlowingExplodingBlock(ctx, x, y, color, progress, size = BLOCK_SIZE) {
    const scale = 1 + progress * 0.3;
    const alpha = Math.max(0, (1 - progress) * 0.9);
    const newSize = size * scale;
    const offset = (size - newSize) / 2;

    ctx.save();
    
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 30 + progress * 50;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    const glowColor = `rgba(255, 255, 255, ${alpha * 0.8})`;
    ctx.fillStyle = glowColor;
    ctx.fillRect(x + offset, y + offset, newSize, newSize);

    ctx.shadowColor = color.replace('rgba', 'rgb').replace(', 0.8)', ')');
    ctx.shadowBlur = 20 + progress * 30;
    
    const mainColor = color.replace('0.8', alpha.toString());
    ctx.fillStyle = mainColor;
    ctx.fillRect(x + offset + 2, y + offset + 2, newSize - 4, newSize - 4);

    ctx.restore();

    if (progress > 0.2) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 3 + progress * 5;
        ctx.setLineDash([Math.floor(progress * 15), Math.floor(progress * 8)]);
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 15;
        ctx.strokeRect(x + offset, y + offset, newSize, newSize);
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
    }

    if (progress > 0.4) {
        const coreSize = newSize * (0.3 + progress * 0.4);
        const coreOffset = (newSize - coreSize) / 2;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
        ctx.fillRect(x + offset + coreOffset, y + offset + coreOffset, coreSize, coreSize);
    }
}

function drawLightningWave(row, progress) {
    const waveWidth = canvas.width;
    const intensity = Math.sin(progress * Math.PI) * 0.8;
    
    const gradient = ctx.createLinearGradient(0, 0, waveWidth, 0);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(0.3, `rgba(255, 255, 255, ${intensity})`);
    gradient.addColorStop(0.7, `rgba(135, 206, 250, ${intensity * 0.8})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, row * BLOCK_SIZE - 5, waveWidth, BLOCK_SIZE + 10);

    const electricGradient = ctx.createLinearGradient(0, 0, waveWidth, 0);
    electricGradient.addColorStop(0, 'rgba(0, 191, 255, 0)');
    electricGradient.addColorStop(0.5, `rgba(0, 191, 255, ${intensity * 0.6})`);
    electricGradient.addColorStop(1, 'rgba(0, 191, 255, 0)');

    ctx.fillStyle = electricGradient;
    ctx.fillRect(0, row * BLOCK_SIZE + 2, waveWidth * (0.5 + progress * 0.5), BLOCK_SIZE - 4);
}

function drawElectricArcs(row, progress) {
    if (progress < 0.3) return;

    ctx.strokeStyle = `rgba(255, 255, 255, ${Math.sin(progress * Math.PI) * 0.7})`;
    ctx.lineWidth = 2 + progress * 3;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;

    for (let i = 0; i < 5; i++) {
        const startX = Math.random() * canvas.width;
        const endX = Math.random() * canvas.width;
        const y = row * BLOCK_SIZE + BLOCK_SIZE / 2;
        const midY = y + (Math.random() - 0.5) * 20;

        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.quadraticCurveTo((startX + endX) / 2, midY, endX, y);
        ctx.stroke();
    }

    ctx.shadowBlur = 0;
}

// Removed sparkle effect function
// function createLightningSparkle(x, y, progress) {
//     for (let i = 0; i < 20; i++) {
//         const sparkle = document.createElement('div');
//         sparkle.className = 'particle';
//         sparkle.style.position = 'absolute';
//         sparkle.style.left = (canvas.offsetLeft + x) + 'px';
//         sparkle.style.top = (canvas.offsetTop + y) + 'px';
//         sparkle.style.width = (Math.random() * 8 + 3) + 'px';
//         sparkle.style.height = sparkle.style.width;
//         sparkle.style.background = Math.random() > 0.5 ? '#ffffff' : `hsl(${Math.random() * 60 + 180}, 100%, 80%)`;
//         sparkle.style.borderRadius = '50%';
//         sparkle.style.boxShadow = `0 0 15px ${sparkle.style.background}`;
//         sparkle.style.pointerEvents = 'none';
//         sparkle.style.zIndex = '1000';

//         const angle = (Math.PI * 2 * i) / 20;
//         const velocity = 80 + Math.random() * 120;
//         const vx = Math.cos(angle) * velocity;
//         const vy = Math.sin(angle) * velocity;

//         sparkle.style.animation = 'sparkleExplode 1s ease-out forwards';
//         sparkle.style.transform = `translate(${vx}px, ${vy}px) scale(0)`;

//         document.body.appendChild(sparkle);
//         setTimeout(() => sparkle.remove(), 1000);
//     }
// }

// Enhanced Audio system
let audioContext = null;

function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.log("オーディオコンテキストの作成に失敗:", e);
    }
}

function createOscillator(frequency, type = 'sine', duration = 0.1, volume = 0.1) {
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filterNode = audioContext.createBiquadFilter();

    oscillator.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = type;

    filterNode.type = 'highpass';
    filterNode.frequency.setValueAtTime(frequency * 0.5, audioContext.currentTime);

    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

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

    switch(lineCount) {
        case 1:
            createOscillator(523.25, 'square', 0.15);
            setTimeout(() => createOscillator(659.25, 'square', 0.15), 50);
            break;
        case 2:
            createOscillator(523.25, 'square', 0.1);
            setTimeout(() => createOscillator(659.25, 'square', 0.1), 40);
            setTimeout(() => createOscillator(783.99, 'square', 0.15), 80);
            break;
        case 3:
            createOscillator(523.25, 'square', 0.08);
            setTimeout(() => createOscillator(659.25, 'square', 0.08), 30);
            setTimeout(() => createOscillator(783.99, 'square', 0.08), 60);
            setTimeout(() => createOscillator(1046.50, 'square', 0.2), 90);
            break;
        case 4:
            const frequencies = [523.25, 659.25, 783.99, 1046.50];
            frequencies.forEach((freq, i) => {
                setTimeout(() => createOscillator(freq, 'sawtooth', 0.1), i * 40);
            });
            setTimeout(() => createOscillator(1318.51, 'sawtooth', 0.3), 160);
            break;
    }
}

function playMoveSFX() {
    initAudio();
    createOscillator(400, 'square', 0.03, 0.05);
}

function playRotateSFX() {
    initAudio();
    createOscillator(600, 'triangle', 0.05, 0.06);
    setTimeout(() => createOscillator(800, 'triangle', 0.05, 0.04), 25);
}

function playDropSFX() {
    initAudio();
    createOscillator(800, 'sawtooth', 0.02, 0.08);
    setTimeout(() => createOscillator(400, 'sawtooth', 0.02, 0.08), 20);
    setTimeout(() => createOscillator(200, 'sawtooth', 0.08, 0.1), 40);
}

function playHardDropSFX() {
    initAudio();
    createOscillator(1000, 'sawtooth', 0.02, 0.12);
    setTimeout(() => createOscillator(600, 'sawtooth', 0.02, 0.12), 15);
    setTimeout(() => createOscillator(300, 'sawtooth', 0.02, 0.12), 30);
    setTimeout(() => createOscillator(150, 'sawtooth', 0.15, 0.15), 45);
}

function playPieceLockSFX() {
    initAudio();
    createOscillator(300, 'square', 0.06, 0.06);
    setTimeout(() => createOscillator(200, 'square', 0.08, 0.06), 30);
}

function playGameOverSFX() {
    initAudio();
    if (!audioContext) return;

    const frequencies = [523.25, 466.16, 415.30, 369.99, 329.63];
    frequencies.forEach((freq, i) => {
        setTimeout(() => createOscillator(freq, 'triangle', 0.3), i * 200);
    });
}

function gameOver() {
    playGameOverSFX();
    if (bgmAudio && isBGMEnabled) {
        bgmAudio.pause();
    }
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').style.display = 'block';
}

function restartGame() {
    board = Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));
    score = 0;
    level = 1;
    lines = 0;
    currentPiece = getRandomPiece();
    nextPiece = getRandomPiece();
    currentX = 3;
    currentY = 0;
    isHardDropped = false;
    document.getElementById('gameOver').style.display = 'none';
    updateUI();
    startBGM();
    gameLoop();
}

function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = lines;
}

function gameLoop(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;
    dropTime += deltaTime;

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
document.addEventListener('keydown', (e) => {
    handleUserInteraction();

    if (isHardDropped && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || 
                          e.key === 'x' || e.key === 'X' || e.key === 'z' || e.key === 'Z' || e.key === ' ')) {
        return;
    }

    switch(e.key) {
        case 'ArrowLeft':
            if (isValidMove(currentPiece, currentX - 1, currentY)) {
                currentX--;
                playMoveSFX();
            }
            break;
        case 'ArrowRight':
            if (isValidMove(currentPiece, currentX + 1, currentY)) {
                currentX++;
                playMoveSFX();
            }
            break;
        case 'ArrowDown':
            if (isValidMove(currentPiece, currentX, currentY + 1)) {
                currentY++;
                playMoveSFX();
            }
            break;
        case 'ArrowUp':
            // ハードドロップ - 1回のキー押下につき1回のみ実行
            if (!hardDropUsed) {
                while (isValidMove(currentPiece, currentX, currentY + 1)) {
                    currentY++;
                }
		setTimeout(() => {}, 400)
                playHardDropSFX();
                isHardDropped = true;
                hardDropUsed = true;
                setTimeout(() => {
                    placePiece();
                }, 50);
            }
            break;
        case 'x':
        case 'X':
            const rotatedCW = rotatePiece(currentPiece);
            if (isValidMove(rotatedCW, currentX, currentY)) {
                currentPiece = rotatedCW;
                playRotateSFX();
            }
            break;
        case 'z':
        case 'Z':
            const rotatedCCW = rotatePieceCounterClockwise(currentPiece);
            if (isValidMove(rotatedCCW, currentX, currentY)) {
                currentPiece = rotatedCCW;
                playRotateSFX();
            }
            break;
        case ' ':
            const rotatedSpace = rotatePiece(currentPiece);
            if (isValidMove(rotatedSpace, currentX, currentY)) {
                currentPiece = rotatedSpace;
                playRotateSFX();
            }
            break;
        case 'm':
        case 'M':
            toggleBGM();
            break;
    }
});

// ハードドロップフラグをリセット
document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp') {
        hardDropUsed = false;
    }
});

// Create floating particles
function createFloatingParticles() {
    setInterval(() => {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * window.innerWidth + 'px';
        particle.style.animationDelay = Math.random() * 2 + 's';
        document.body.appendChild(particle);

        setTimeout(() => particle.remove(), 10000);
    }, 500);
}

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    initBGM();
    updateUI();
    initAudio();
    createFloatingParticles();
    updateBGMButton();
    gameLoop();
});


