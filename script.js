// Canvas setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// Constants
const PIPE_WIDTH = 52;
const PIPE_HEIGHT = 320;
const GAP = 100;
const BASE_HEIGHT = 112; 
const BASE_SPEED = 2;
const PIPE_INTERVAL = 150;

// Backgrounds
const backgrounds = ["background-day.png", "background-night.png"];
let selectedBg = backgrounds[Math.floor(Math.random() * backgrounds.length)];
const bg = new Image();
bg.src = `assets/sprites/${selectedBg}`;

// Base
const base = new Image();
base.src = "assets/sprites/base.png";
let baseX = 0;

// Bird colors and frames
const birdColors = ["blue", "red", "yellow"];
let selectedColor = birdColors[Math.floor(Math.random() * birdColors.length)];
let birdFrames = ["upflap","midflap","downflap"].map(frame => {
    const img = new Image();
    img.src = `assets/sprites/${selectedColor}bird-${frame}.png`;
    return img;
});

// Pipes
const pipeColors = ["green","red"];
let selectedPipe = pipeColors[Math.floor(Math.random() * pipeColors.length)];

// Audio
const audioWing = new Audio("assets/audio/wing.wav");
const audioPoint = new Audio("assets/audio/point.wav");
const audioHit = new Audio("assets/audio/hit.wav");
const audioDie = new Audio("assets/audio/die.wav");
const audioSwoosh = new Audio("assets/audio/swoosh.wav");

// Message (Get Ready)
const messageImg = new Image();
messageImg.src = "assets/sprites/Message.png";

// Number images for scoring
const numberImages = [];
for (let i = 0; i <= 9; i++) {
    const img = new Image();
    img.src = `assets/sprites/${i}.png`;
    numberImages.push(img);
}

// Game Over assets
const gameOverImg = new Image();
gameOverImg.src = "assets/sprites/gameover.png";
const scoreBoardImg = new Image();
scoreBoardImg.src = "assets/sprites/score_board.png";
const medalBronze = new Image(); medalBronze.src = "assets/sprites/medal_bronze.png";
const medalSilver = new Image(); medalSilver.src = "assets/sprites/medal_silver.png";
const medalGold = new Image(); medalGold.src = "assets/sprites/medal_gold.png";
const medalPlatinum = new Image(); medalPlatinum.src = "assets/sprites/medal_platinum.png";

// Game variables
let bird = { x:50, y:HEIGHT/2, width:34, height:24, frame:0, velocity:0, dead:false };
let gravity = 0.25;
let lift = -4.5;
let pipes = [];
let frameCount = 0;
let score = 0;
let gameOver = false;
let deathSoundPlayed = false;
let birdAnimationFrame = 0;
let gameStarted = false;
let tilt = 0;
const maxUpTilt = -25 * Math.PI/180;
const maxDownTilt = 45 * Math.PI/180;
let gameOverY = HEIGHT + 50; // start below screen
let gameOverAlpha = 0;

// NEW: Separate Y positions so Game Over is above, scoreboard lowered
const gameOverTargetY = HEIGHT/2 - gameOverImg.height - 100; // Game Over image
const scoreBoardTargetY = gameOverTargetY + gameOverImg.height + 60; // scoreboard below Game Over

// Create pipe
function createPipe() {
    const minPipeHeight = 50;
    const maxPipeHeight = HEIGHT - GAP - BASE_HEIGHT - 50;
    const pipeHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1)) + minPipeHeight;
    pipes.push({ x: WIDTH, y: pipeHeight, scored:false });
}

// Draw pipes
function drawPipes() {
    pipes.forEach(pipe => {
        const topPipe = new Image();
        topPipe.src = `assets/sprites/pipe-${selectedPipe}-down.png`;
        ctx.drawImage(topPipe, pipe.x, pipe.y - GAP - PIPE_HEIGHT);
        const bottomPipe = new Image();
        bottomPipe.src = `assets/sprites/pipe-${selectedPipe}-up.png`;
        ctx.drawImage(bottomPipe, pipe.x, pipe.y + GAP);
    });
}

// Collision check
function checkCollision(pipe) {
    const b = { x: bird.x, y: bird.y, width: bird.width, height: bird.height };
    const topRect = { x: pipe.x, y: pipe.y - GAP - PIPE_HEIGHT, width: PIPE_WIDTH, height: PIPE_HEIGHT };
    const bottomRect = { x: pipe.x, y: pipe.y + GAP, width: PIPE_WIDTH, height: PIPE_HEIGHT };
    const horizontalOverlap = b.x + b.width > topRect.x && b.x < topRect.x + topRect.width;
    const hitTop = horizontalOverlap && b.y < topRect.y + topRect.height;
    const hitBottom = horizontalOverlap && b.y + b.height > bottomRect.y;
    return hitTop || hitBottom;
}

// Draw everything
function draw() {
    ctx.drawImage(bg,0,0,WIDTH,HEIGHT);
    if (gameStarted) drawPipes();

    let birdImg = bird.dead ? birdFrames[1] : birdFrames[bird.frame];
    ctx.save();
    ctx.translate(bird.x + bird.width/2, bird.y + bird.height/2);
    ctx.rotate(tilt);
    ctx.drawImage(birdImg, -bird.width/2, -bird.height/2);
    ctx.restore();

    if (!bird.dead || !gameStarted) {
        baseX -= BASE_SPEED;
        if (baseX <= -WIDTH) baseX = 0;
    }
    ctx.drawImage(base, baseX, HEIGHT - BASE_HEIGHT);
    ctx.drawImage(base, baseX + WIDTH, HEIGHT - BASE_HEIGHT);

    // Score (only if game started)
    if (gameStarted) {
        const scoreStr = score.toString();
        const digitWidth = 24;
        const totalWidth = scoreStr.length * digitWidth;
        let startX = WIDTH/2 - totalWidth/2;
        for (let i = 0; i < scoreStr.length; i++) {
            ctx.drawImage(numberImages[parseInt(scoreStr[i])], startX + i * digitWidth, 20);
        }
    }

    if (!gameStarted) {
        ctx.drawImage(messageImg, WIDTH/2 - messageImg.width/2, HEIGHT/2 - messageImg.height/2 - 50);
        ctx.fillStyle = "white";
        ctx.font = "20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Tap or Space to Start", WIDTH / 2, HEIGHT / 2 + 50);
    }

    if (gameOver) drawGameOver();
}

// Game Over animation & scoreboard
function drawGameOver() {
    gameOverY = gameOverTargetY; // Instant placement
    ctx.drawImage(gameOverImg, WIDTH/2 - gameOverImg.width/2, gameOverY);

    ctx.globalAlpha = gameOverAlpha; // Fade in scoreboard
    if (gameOverAlpha < 1) gameOverAlpha += 0.05;

    // Scale down the scoreboard
    const scale = 0.35;
    const sbWidth = scoreBoardImg.width * scale;
    const sbHeight = scoreBoardImg.height * scale;
    ctx.drawImage(scoreBoardImg, WIDTH/2 - sbWidth/2, scoreBoardTargetY, sbWidth, sbHeight);

    // Current score
    const scoreStr = score.toString();
    const digitWidth = 24 * scale;
    let scoreX = WIDTH/2 - scoreStr.length * digitWidth / 2;
    let scoreY = scoreBoardTargetY + 20 * scale;
    for (let i = 0; i < scoreStr.length; i++) {
        ctx.drawImage(numberImages[parseInt(scoreStr[i])], scoreX + i * digitWidth, scoreY, 24*scale, 24*scale);
    }

    // Best score
    let bestScore = localStorage.getItem("bestScore") || 0;
    if (score > bestScore) bestScore = score;
    localStorage.setItem("bestScore", bestScore);
    let bestStr = bestScore.toString();
    let bestX = WIDTH/2 - bestStr.length * digitWidth / 2;
    let bestY = scoreY + 30 * scale;
    for (let i = 0; i < bestStr.length; i++) {
        ctx.drawImage(numberImages[parseInt(bestStr[i])], bestX + i * digitWidth, bestY, 24*scale, 24*scale);
    }

    // Medal
    let medal = null;
    if (score >= 10 && score < 20) medal = medalBronze;
    else if (score >= 20 && score < 30) medal = medalSilver;
    else if (score >= 30 && score < 50) medal = medalGold;
    else if (score >= 50) medal = medalPlatinum;

    if (medal) {
        const medalScale = 0.3;
        ctx.drawImage(
            medal,
            WIDTH/2 - (medal.width * medalScale) - 50,
            scoreBoardTargetY + 10,
            medal.width * medalScale,
            medal.height * medalScale
        );
    }

    ctx.globalAlpha = 1; // Reset alpha
}

// Update game
function update() {
    birdAnimationFrame++;
    bird.frame = Math.floor(birdAnimationFrame / 5) % birdFrames.length;

    if (!gameStarted) {
        bird.y = HEIGHT/2 + Math.sin(birdAnimationFrame / 10) * 5;
        tilt = 0;
        return;
    }

    if (!bird.dead) bird.velocity += gravity;
    bird.y += bird.velocity;

    if (!bird.dead) {
        const targetTilt = bird.velocity < 0 ? maxUpTilt : Math.min(maxDownTilt, bird.velocity / 10);
        tilt = tilt + (targetTilt - tilt) * 0.1; // Smooth transition
    } else tilt = maxDownTilt;

    if (pipes.length === 0 || WIDTH - pipes[pipes.length - 1].x >= PIPE_INTERVAL) createPipe();

    pipes.forEach(pipe => {
        if (!bird.dead) pipe.x -= BASE_SPEED;
        if (!bird.dead && checkCollision(pipe)) {
            bird.dead = true;
            if (!deathSoundPlayed) { 
                audioHit.play(); 
                setTimeout(() => audioDie.play(), 200); 
                deathSoundPlayed = true; 
            }
            bird.velocity = 5;
            gameOver = true;
        }
        if (!pipe.scored && pipe.x + PIPE_WIDTH < bird.x) {
            score++; pipe.scored = true; audioPoint.play();
        }
    });

    pipes = pipes.filter(pipe => pipe.x + PIPE_WIDTH > 0);

    if (bird.y + bird.height >= HEIGHT - BASE_HEIGHT) {
        bird.y = HEIGHT - BASE_HEIGHT - bird.height;
        if (!bird.dead) {
            bird.dead = true;
            if (!deathSoundPlayed) { 
                audioHit.play(); 
                setTimeout(() => audioDie.play(), 200); 
                deathSoundPlayed = true; 
            }
            bird.velocity = 0; gameOver = true;
        }
    }

    frameCount++;
}

// Flap bird
function flap() {
    if (!gameStarted) { gameStarted = true; return; }
    if (!gameOver) { bird.velocity = lift; audioWing.play(); }
    else resetGame();
}

document.addEventListener("keydown", e => { if (e.code === "Space") flap(); });
document.addEventListener("click", flap);

// Reset game
function resetGame() {
    selectedColor = birdColors[Math.floor(Math.random()*birdColors.length)];
    birdFrames = ["upflap","midflap","downflap"].map(frame=>{
        const img = new Image();
        img.src = `assets/sprites/${selectedColor}bird-${frame}.png`;
        return img;
    });

    selectedBg = backgrounds[Math.floor(Math.random()*backgrounds.length)];
    bg.src = `assets/sprites/${selectedBg}`;

    selectedPipe = pipeColors[Math.floor(Math.random()*pipeColors.length)];

    bird = { x:50, y:HEIGHT/2, width:34, height:24, frame:0, velocity:0, dead:false };
    pipes = []; score = 0; frameCount = 0; gameOver = false; baseX = 0; deathSoundPlayed = false;
    birdAnimationFrame = 0; tilt = 0; gameStarted = false; gameOverY = HEIGHT + 50; gameOverAlpha = 0;
    audioSwoosh.play();
}

// Game loop
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();