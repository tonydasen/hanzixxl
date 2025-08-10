// 汉字与类型一一对应
const HANZI = ['火', '土', '木', '水', '金', '人', '心'];
const BOARD_SIZE = 8;
const TILE_TYPES = HANZI.length;
let board = [];
let selected = null;
let score = 0;
let moves = 0;
let timer = 0;
let timerInterval = null;
let isAnimating = false;
let gameActive = false;

const boardEl = document.getElementById('game-board');
const scoreEl = document.getElementById('score');
const movesEl = document.getElementById('moves');
const timeEl = document.getElementById('time');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const hintBtn = document.getElementById('hint-btn');
const gameOverEl = document.getElementById('game-over');
const finalScoreEl = document.getElementById('final-score');
const playAgainBtn = document.getElementById('play-again-btn');

function randomType() {
    return Math.floor(Math.random() * TILE_TYPES);
}

function createBoard() {
    board = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
        let row = [];
        for (let j = 0; j < BOARD_SIZE; j++) {
            let type;
            do {
                type = randomType();
                row[j] = type;
            } while (isMatchAt(i, j, row, board));
        }
        board.push(row);
    }
}

function isMatchAt(i, j, row, boardRef) {
    // 检查新生成的格子是否和左/上两个一样，避免初始三连
    let type = row[j];
    if (j >= 2 && row[j - 1] === type && row[j - 2] === type) return true;
    if (i >= 2 && boardRef[i - 1] && boardRef[i - 2] &&
        boardRef[i - 1][j] === type && boardRef[i - 2][j] === type) return true;
    return false;
}

function renderBoard() {
    boardEl.innerHTML = '';
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            const tile = document.createElement('div');
            tile.className = `tile tile-type-${board[i][j]}`;
            tile.textContent = HANZI[board[i][j]];
            tile.dataset.row = i;
            tile.dataset.col = j;
            if (selected && selected[0] === i && selected[1] === j) {
                tile.classList.add('selected');
            }
            tile.onclick = () => handleTileClick(i, j);
            boardEl.appendChild(tile);
        }
    }
}

function updateInfo() {
    scoreEl.textContent = score;
    movesEl.textContent = moves;
    timeEl.textContent = timer;
}

function handleTileClick(i, j) {
    if (!gameActive || isAnimating) return;
    if (selected) {
        const [si, sj] = selected;
        if ((Math.abs(si - i) + Math.abs(sj - j)) === 1) {
            swapTiles(si, sj, i, j);
            renderBoard();
            if (findMatches().length > 0) {
                moves++;
                updateInfo();
                selected = null;
                processMatches();
            } else {
                // 没有消除则换回来
                setTimeout(() => {
                    swapTiles(si, sj, i, j);
                    selected = null;
                    renderBoard();
                }, 200);
            }
        } else {
            selected = [i, j];
            renderBoard();
        }
    } else {
        selected = [i, j];
        renderBoard();
    }
}

function swapTiles(i1, j1, i2, j2) {
    [board[i1][j1], board[i2][j2]] = [board[i2][j2], board[i1][j1]];
}

function findMatches() {
    let matches = [];
    // 横向
    for (let i = 0; i < BOARD_SIZE; i++) {
        let count = 1;
        for (let j = 1; j < BOARD_SIZE; j++) {
            if (board[i][j] === board[i][j - 1]) {
                count++;
            } else {
                if (count >= 3) matches.push({ dir: 'row', i, j: j - count, len: count });
                count = 1;
            }
        }
        if (count >= 3) matches.push({ dir: 'row', i, j: BOARD_SIZE - count, len: count });
    }
    // 纵向
    for (let j = 0; j < BOARD_SIZE; j++) {
        let count = 1;
        for (let i = 1; i < BOARD_SIZE; i++) {
            if (board[i][j] === board[i - 1][j]) {
                count++;
            } else {
                if (count >= 3) matches.push({ dir: 'col', i: i - count, j, len: count });
                count = 1;
            }
        }
        if (count >= 3) matches.push({ dir: 'col', i: BOARD_SIZE - count, j, len: count });
    }
    return matches;
}

function processMatches() {
    isAnimating = true;
    let matches = findMatches();
    if (matches.length === 0) {
        isAnimating = false;
        if (!hasPossibleMove()) {
            setTimeout(() => {
                showGameOver();
            }, 500);
        }
        return;
    }
    // 标记消除
    let toRemove = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false));
    matches.forEach(match => {
        if (match.dir === 'row') {
            for (let k = 0; k < match.len; k++) toRemove[match.i][match.j + k] = true;
        } else {
            for (let k = 0; k < match.len; k++) toRemove[match.i + k][match.j] = true;
        }
    });
    // 动画
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (toRemove[i][j]) {
                const idx = i * BOARD_SIZE + j;
                boardEl.children[idx].classList.add('matched');
            }
        }
    }
    // 分数
    let removedCount = toRemove.flat().filter(Boolean).length;
    score += removedCount * 10;
    updateInfo();
    setTimeout(() => {
        // 消除
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (toRemove[i][j]) board[i][j] = null;
            }
        }
        // 下落
        for (let j = 0; j < BOARD_SIZE; j++) {
            let empty = 0;
            for (let i = BOARD_SIZE - 1; i >= 0; i--) {
                if (board[i][j] === null) {
                    empty++;
                } else if (empty > 0) {
                    board[i + empty][j] = board[i][j];
                    board[i][j] = null;
                }
            }
            for (let i = 0; i < empty; i++) {
                board[i][j] = randomType();
            }
        }
        renderBoard();
        setTimeout(processMatches, 250);
    }, 400);
}

function showHint() {
    if (!gameActive || isAnimating) return;
    clearHints();
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            for (let [di, dj] of [[0, 1], [1, 0]]) {
                let ni = i + di, nj = j + dj;
                if (ni < BOARD_SIZE && nj < BOARD_SIZE) {
                    swapTiles(i, j, ni, nj);
                    if (findMatches().length > 0) {
                        highlightHint(i, j, ni, nj);
                        swapTiles(i, j, ni, nj);
                        return;
                    }
                    swapTiles(i, j, ni, nj);
                }
            }
        }
    }
    alert('没有可消除的组合，请重新开始！');
}

function highlightHint(i1, j1, i2, j2) {
    const idx1 = i1 * BOARD_SIZE + j1;
    const idx2 = i2 * BOARD_SIZE + j2;
    boardEl.children[idx1].classList.add('hint');
    boardEl.children[idx2].classList.add('hint');
}

function clearHints() {
    document.querySelectorAll('.tile.hint').forEach(tile => tile.classList.remove('hint'));
}

function hasPossibleMove() {
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            for (let [di, dj] of [[0, 1], [1, 0]]) {
                let ni = i + di, nj = j + dj;
                if (ni < BOARD_SIZE && nj < BOARD_SIZE) {
                    swapTiles(i, j, ni, nj);
                    if (findMatches().length > 0) {
                        swapTiles(i, j, ni, nj);
                        return true;
                    }
                    swapTiles(i, j, ni, nj);
                }
            }
        }
    }
    return false;
}

function startGame() {
    score = 0;
    moves = 0;
    timer = 0;
    selected = null;
    gameActive = true;
    createBoard();
    renderBoard();
    updateInfo();
    clearHints();
    startBtn.style.display = 'none';
    restartBtn.style.display = '';
    hintBtn.style.display = '';
    gameOverEl.style.display = 'none';
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (gameActive) {
            timer++;
            updateInfo();
        }
    }, 1000);
}

function restartGame() {
    startGame();
}

function showGameOver() {
    gameActive = false;
    clearInterval(timerInterval);
    finalScoreEl.textContent = score;
    gameOverEl.style.display = 'flex';
}

startBtn.onclick = startGame;
restartBtn.onclick = restartGame;
hintBtn.onclick = showHint;
playAgainBtn.onclick = startGame;

// 初始化
renderBoard();
updateInfo();