const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('scoreValue');
const startButton = document.getElementById('startButton');
const octopusHead = document.getElementById('octopusHead');
const startOctopus = document.getElementById('startOctopus');
const foodImage = document.getElementById('foodImage');
const twiterLink = document.querySelector('.twiter');



const GRID_SIZE = 12; 
let currentGridPixelSize; 


function calculateCanvasSize() {
    const maxSize = 600;
    const padding = 20; 
    const screenWidth = window.innerWidth - padding * 2;
    const screenHeight = window.innerHeight - padding * 2;
    
    const size = Math.min(maxSize, screenWidth, screenHeight);
    

    currentGridPixelSize = Math.floor(size / GRID_SIZE);
    
 
    return currentGridPixelSize * GRID_SIZE;
}

const canvasSize = calculateCanvasSize();
canvas.width = canvasSize;
canvas.height = canvasSize;


const tileCount = GRID_SIZE;


window.addEventListener('resize', () => {
    const newSize = calculateCanvasSize();
    canvas.width = newSize;
    canvas.height = newSize;
    draw();
    updateHighscoresPosition();
});

const twitterLink = document.querySelector('.twitter-link');
let lastFrameTime = 0;
const targetFrameRate = 60;
const frameDelay = 1000 / targetFrameRate;
const spawn = generateSnakeSpawn();
let snake = [spawn.pos];
let food = generateFood();
let dx = 1;
let dy = 0;
let score = 0;
let gameSpeed = 250; 
let gameLoop;
let gameStarted = false;


const HIGHSCORE_KEY = 'snake_highscores_v1';
let highscoresEl = null;

function loadHighscores() {
    try {
        const raw = localStorage.getItem(HIGHSCORE_KEY);
        if (!raw) return { best: 0 };
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'number') return { best: parsed };
        if (parsed && typeof parsed.best === 'number') return { best: parsed.best };
        if (parsed && Array.isArray(parsed.last)) {
            const maxFromLast = parsed.last.length ? Math.max(...parsed.last) : 0;
            return { best: Math.max(parsed.best || 0, maxFromLast) };
        }
        return { best: 0 };
    } catch (e) {
        return { best: 0 };
    }
}

function saveHighscores(data) {
    try {
        
        localStorage.setItem(HIGHSCORE_KEY, JSON.stringify({ best: data.best || 0 }));
    } catch (e) {
        
    }
}

function addScoreToHighscores(value) {
    const data = loadHighscores();
    data.best = Math.max(data.best || 0, value);
    saveHighscores(data);
    renderHighscores();
}

function initHighscores() {
    const container = document.querySelector('.game-container');
    highscoresEl = document.createElement('div');
    highscoresEl.className = 'highscores';
    highscoresEl.innerHTML = '<h3>Highscores</h3><div class="best"></div>';
    container.appendChild(highscoresEl);
    renderHighscores();
    updateHighscoresPosition();
}

function renderHighscores() {
    if (!highscoresEl) return;
    const data = loadHighscores();
    const bestEl = highscoresEl.querySelector('.best');
    bestEl.textContent = 'Best: ' + (data.best || 0);
}

function updateHighscoresPosition() {
    if (!highscoresEl) return;
   
    const style = getComputedStyle(highscoresEl);
    
    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = document.querySelector('.game-container').getBoundingClientRect();
    const viewportWidth = window.innerWidth;
  
    if (viewportWidth < 900) {
        highscoresEl.style.left = '';
        highscoresEl.style.top = '';
 
        highscoresEl.style.display = 'none';
        return;
    }

    
    const gap = 100;
  
    highscoresEl.style.position = 'fixed';
  
    highscoresEl.style.display = 'block';
    const panelRect = highscoresEl.getBoundingClientRect();
    let left = Math.round(canvasRect.left - panelRect.width - gap);
    const top = Math.round(canvasRect.top + 20);

    
    if (left < 8) {
        left = Math.round(canvasRect.right + gap);
    }


    left = Math.max(8, Math.min(left, window.innerWidth - panelRect.width - 8));

    highscoresEl.style.left = left + 'px';
    highscoresEl.style.top = top + 'px';
}

draw();


initHighscores();


let lastKeyPressed = '';
let lastUpdateTime = 0;
let directionQueue = [];


let touchStartX = 0;
let touchStartY = 0;
const minSwipeDistance = 30;


document.addEventListener('keydown', handleKeyPress);

canvas.addEventListener('touchstart', handleTouchStart);
canvas.addEventListener('touchmove', handleTouchMove);
canvas.addEventListener('touchend', handleTouchEnd);

function handleKeyPress(e) {
    if (e.repeat) return;

    const key = e.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        e.preventDefault();
        
        if (directionQueue.length < 2) {
            directionQueue.push(key);
        }
        
        if (directionQueue.length === 1) {
            processNextDirection();
        }
    }
}

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}

function handleTouchMove(e) {
    e.preventDefault();
}

function handleTouchEnd(e) {
    e.preventDefault();
    if (!gameStarted) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    

    if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) {
        return; 
    }

    if (Math.abs(deltaX) > Math.abs(deltaY)) {

        if (deltaX > 0) {
            directionQueue.push('ArrowRight');
        } else {
            directionQueue.push('ArrowLeft');
        }
    } else {

        if (deltaY > 0) {
            directionQueue.push('ArrowDown');
        } else {
            directionQueue.push('ArrowUp');
        }
    }

    if (directionQueue.length === 1) {
        processNextDirection();
    }
}

function processNextDirection() {
    if (directionQueue.length === 0) return;
    
    const key = directionQueue[0];
    const currentTime = Date.now();
    

    if (currentTime - lastUpdateTime < gameSpeed * 0.8) return;


    let newDx = dx;
    let newDy = dy;
    
    switch(key) {
        case 'ArrowUp':
            if (dy === 0 || directionQueue.length === 1) {
                newDx = 0;
                newDy = -1;
            }
            break;
        case 'ArrowDown':
            if (dy === 0 || directionQueue.length === 1) {
                newDx = 0;
                newDy = 1;
            }
            break;
        case 'ArrowLeft':
            if (dx === 0 || directionQueue.length === 1) {
                newDx = -1;
                newDy = 0;
            }
            break;
        case 'ArrowRight':
            if (dx === 0 || directionQueue.length === 1) {
                newDx = 1;
                newDy = 0;
            }
            break;
    }

    if (newDx !== dx || newDy !== dy) {
        dx = newDx;
        dy = newDy;
        lastUpdateTime = currentTime;
        lastKeyPressed = key;
        directionQueue.shift(); 
    } else if (currentTime - lastUpdateTime > gameSpeed) {
        directionQueue.shift(); 
    }
}


function generateSnakeSpawn() {
    
    const margin = 2;
    const x = Math.floor(Math.random() * (tileCount - margin * 2) + margin);
    const y = Math.floor(Math.random() * (tileCount - margin * 2) + margin);
    const randomDir = Math.random() < 0.5 ? { dx: 1, dy: 0 } : { dx: 0, dy: 1 };
    return { pos: { x, y }, dir: randomDir };
}

function generateFood() {
    let newFood;
    do {
        newFood = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };

        var onSnake = snake.some(segment => 
            segment.x === newFood.x && segment.y === newFood.y
        );
    } while (onSnake); 
    
    return newFood;
}

function gameOver() {

    clearInterval(gameLoop);
    gameStarted = false;
    

    const gameOverMessage = document.createElement('div');
    gameOverMessage.className = 'game-over';
    gameOverMessage.innerHTML = `
        <div class="game-over-text">GAME</div>
        <div class="final-score">Score: ${score}</div>
    `;
    document.querySelector('.game-container').appendChild(gameOverMessage);

    
    if (twiterLink) {
        try {
        
            gameOverMessage.appendChild(twiterLink);
           
            twiterLink.style.display = 'block';
            twiterLink.style.opacity = '0';
            twiterLink.style.transform = 'translateY(12px)';


            void twiterLink.offsetWidth;


            setTimeout(() => {
                twiterLink.style.opacity = '1';
                twiterLink.style.transform = 'translateY(0)';
            }, 30);
        } catch (err) {

            twiterLink.style.display = 'block';
            twiterLink.style.opacity = '1';
            twiterLink.style.transform = 'translateY(0)';
        }
    }

    startButton.style.display = 'block';
    startButton.textContent = 'Play Again';

    addScoreToHighscores(score);
    

    directionQueue = [];
    

    startButton.style.display = 'block';
    startButton.textContent = 'Play Again';
    

    directionQueue = [];

   
    food = { x: -1, y: -1 };

    draw();

  
   
}

function update() {
    
    const currentTime = performance.now();
    if (currentTime - lastFrameTime < frameDelay) {
        return;
    }
    lastFrameTime = currentTime;

    
    processNextDirection();
    
   
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        gameOver();
        return;
    }

    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
            return;
        }
    }

    snake.unshift(head);


    if (head.x === food.x && head.y === food.y) {
        score += 1;
        scoreElement.textContent = score;
        
        food = generateFood();
        
        if (score % 10 === 0) {
            const message = document.createElement('div');
            message.className = 'message';
            message.textContent = 'gRE';
            document.querySelector('.game-container').appendChild(message);
            
            
            setTimeout(() => {
                message.remove();
            }, 1000);
        }
        
        
        clearInterval(gameLoop);
        gameSpeed = Math.max(100, 200 - Math.floor(score * 0.5));
        gameLoop = setInterval(update, gameSpeed);
        
        canvas.style.boxShadow = "0 0 20px #ffffffff";
        setTimeout(() => {
            canvas.style.boxShadow = "0 0 20px rgba(0,0,0,0.3)";
        }, 300);
    } else {
        snake.pop();
    }

    draw();
}

function draw() {

    ctx.fillStyle = '#34495e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);


    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1;
    for(let i = 0; i < GRID_SIZE; i++) {
        const pixelPos = i * currentGridPixelSize;
        
        ctx.beginPath();
        ctx.moveTo(pixelPos, 0);
        ctx.lineTo(pixelPos, canvas.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, pixelPos);
        ctx.lineTo(canvas.width, pixelPos);
        ctx.stroke();
    }
    
    if (!gameStarted) {
        return;
    }


    snake.forEach((segment, index) => {
        ctx.save();
        ctx.translate(
            segment.x * currentGridPixelSize + currentGridPixelSize/2, 
            segment.y * currentGridPixelSize + currentGridPixelSize/2
        );
        
        let angle = 0;
        if (index === 0) {

            if (dx === 1) angle = 0;
            if (dx === -1) angle = Math.PI;
            if (dy === -1) angle = -Math.PI/2;
            if (dy === 1) angle = Math.PI/2;
        } else {

            const nextSegment = snake[index - 1];
            const dx = nextSegment.x - segment.x;
            const dy = nextSegment.y - segment.y;
            angle = Math.atan2(dy, dx);
        }
        
        ctx.rotate(angle);
        
        if (octopusHead.complete) {
            if (index === 0) {
                ctx.drawImage(octopusHead, 
                    -currentGridPixelSize/2, 
                    -currentGridPixelSize/2, 
                    currentGridPixelSize, 
                    currentGridPixelSize
                );
            } else {
                ctx.globalAlpha = 0.7;
                ctx.drawImage(octopusHead, 
                    -currentGridPixelSize/2, 
                    -currentGridPixelSize/2, 
                    currentGridPixelSize, 
                    currentGridPixelSize
                );
                ctx.globalAlpha = 1.0;
            }
        } else {
            ctx.fillStyle = index === 0 ? '#9b59b6' : '#b8a2ce';
            ctx.fillRect(
                -currentGridPixelSize/2, 
                -currentGridPixelSize/2, 
                currentGridPixelSize, 
                currentGridPixelSize
            );
        }
        
        ctx.restore();
    });


    if (foodImage.complete) {
        ctx.drawImage(foodImage, 
            food.x * currentGridPixelSize, 
            food.y * currentGridPixelSize, 
            currentGridPixelSize, 
            currentGridPixelSize
        );
    } else {
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(
            food.x * currentGridPixelSize + 1, 
            food.y * currentGridPixelSize + 1, 
            currentGridPixelSize - 2, 
            currentGridPixelSize - 2
        );
    }
}


startButton.addEventListener('click', () => {
    if (!gameStarted) {
        gameStarted = true;
        startButton.style.display = 'none';
        if (startOctopus) startOctopus.classList.add('hidden');
        
        
        if (twiterLink) {
            
            twiterLink.style.opacity = '0';
            twiterLink.style.transform = 'translateY(12px)';
            twiterLink.style.display = 'none';
        }
        
        const gameOverMessage = document.querySelector('.game-over');
        if (gameOverMessage && twiterLink) {
            gameOverMessage.remove();

            twiterLink.style.display = 'none';
            twiterLink.style.opacity = '0';
            twiterLink.style.transform = 'translateY(12px)';
        }
    
        if (gameLoop) {
            clearInterval(gameLoop);
        }
        
        const spawn = generateSnakeSpawn();
        snake = [spawn.pos];
        dx = spawn.dir.dx;
        dy = spawn.dir.dy;
        
        food = generateFood();
        score = 0;
        scoreElement.textContent = '0';
        gameSpeed = 200;
        directionQueue = []; 
        lastUpdateTime = 0; 
        
        lastFrameTime = performance.now();
        gameLoop = setInterval(update, gameSpeed);
    }
});