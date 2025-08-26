// Canvas setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// Constants
const PIPE_WIDTH = 52;
const PIPE_HEIGHT = 320;
const GAP = 60;
const BASE_HEIGHT = 112;
const BASE_SPEED = 2;
const PIPE_INTERVAL = 200;

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
let gravity = 0.5;
let lift = -8;
let pipes = [];
let frameCount = 0;
let score = 0;
let gameOver = false;
let deathSoundPlayed = false;
let birdAnimationFrame = 0;
let gameStarted = false;
let tilt = 0;
const maxUpTilt = -25 * Math.PI/180;
const maxDownTilt = 90 * Math.PI/180;
let gameOverY = HEIGHT + 50;
let gameOverAlpha = 0;

// Game Over & scoreboard positions
const gameOverTargetY = HEIGHT/2 - gameOverImg.height - 100;
const scoreBoardTargetY = gameOverTargetY + gameOverImg.height + 60;

// Create pipe
function createPipe() {
    const minPipeHeight = 50;
    const maxPipeHeight = HEIGHT - GAP - BASE_HEIGHT - 50;

    let pipeHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1)) + minPipeHeight;

    if (pipes.length > 0) {
        const lastY = pipes[pipes.length - 1].y;
        const delta = Math.floor(Math.random() * 40) - 20;
        pipeHeight = Math.min(Math.max(minPipeHeight, lastY + delta), maxPipeHeight);
    }

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

    // Live score (top center, original size)
    if (gameStarted && !gameOver) {
        const scoreStr = score.toString();
        const digitWidth = 23;
        const digitHeight = 40;
        const scoreXBase = WIDTH / 2;
        const scoreY = 20;
        const totalWidth = digitWidth * scoreStr.length;
        const startX = scoreXBase - totalWidth / 2;

        for (let i = 0; i < scoreStr.length; i++) {
            ctx.drawImage(numberImages[parseInt(scoreStr[i])], startX + i * digitWidth, scoreY, digitWidth, digitHeight);
        }
    }

    if (!gameStarted) {
        const messageX = WIDTH/2 - messageImg.width/2;
        const messageY = HEIGHT/2 - messageImg.height/2 - 40;
        ctx.drawImage(messageImg, messageX, messageY);

        ctx.fillStyle = "white";
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Tap or Space to Start", WIDTH / 2, messageY + messageImg.height + 20);
    }

    if (gameOver) drawGameOver();
}

// Game Over animation & scoreboard
function drawGameOver() {
    if (gameOverY > gameOverTargetY) {
        gameOverY -= 5;
        if (gameOverY < gameOverTargetY) gameOverY = gameOverTargetY;
    }
    ctx.drawImage(gameOverImg, WIDTH/2 - gameOverImg.width/2, gameOverY);

    if (gameOverY <= gameOverTargetY) {
        if (gameOverAlpha < 1) gameOverAlpha += 0.05;

        const sbScale = 0.35; // smaller scoreboard
        const sbWidth = scoreBoardImg.width * sbScale;
        const sbHeight = scoreBoardImg.height * sbScale;
        const sbX = WIDTH/2 - sbWidth/2;
        ctx.globalAlpha = gameOverAlpha;
        ctx.drawImage(scoreBoardImg, sbX, scoreBoardTargetY, sbWidth, sbHeight);

        // Current score
        const digitScale = 0.35;
        const digitWidth = 30 * digitScale;
        const digitHeight = 48 * digitScale;
        const scoreStr = score.toString();
        const scoreY = scoreBoardTargetY + 40;
        const scoreXBase = sbX + 195;
        let scoreX = scoreXBase - (digitWidth * (scoreStr.length - 1)) / 2;
        for (let i = 0; i < scoreStr.length; i++) {
            ctx.drawImage(numberImages[parseInt(scoreStr[i])], scoreX + i * digitWidth, scoreY, digitWidth, digitHeight);
        }

        // Best score
        const bestScore = Math.max(score, localStorage.getItem("bestScore") || 0);
        const bestStr = bestScore.toString();
        const bestY = scoreY + 43;
        const bestXBase = sbX + 195;
        let bestX = bestXBase - (digitWidth * (bestStr.length - 1)) / 2;
        for (let i = 0; i < bestStr.length; i++) {
            ctx.drawImage(numberImages[parseInt(bestStr[i])], bestX + i * digitWidth, bestY, digitWidth, digitHeight);
        }

        // Medal
        let medal = null;
        if (score >= 1 && score < 40) medal = medalBronze;
        else if (score >= 41 && score < 100) medal = medalSilver;
        else if (score >= 101 && score < 500) medal = medalGold;
        else if (score >= 501) medal = medalPlatinum;

        if (medal) {
            const medalScale = 0.1;
            const medalX = sbX + 30;
            const medalY = scoreBoardTargetY + 45;
            ctx.drawImage(medal, medalX, medalY, medal.width * medalScale, medal.height * medalScale);
        }

        ctx.globalAlpha = 1;
    }
}

// Update game
function update() {
    birdAnimationFrame++;

    if (!gameStarted) {
        bird.y = HEIGHT/2 - 20 + Math.sin(birdAnimationFrame / 8) * 8;
        bird.frame = Math.floor(birdAnimationFrame / 5) % birdFrames.length;
        tilt = 0;
        return;
    }

    bird.frame = Math.floor(birdAnimationFrame / 3) % birdFrames.length;

    if (!bird.dead) {
        bird.velocity += gravity;
        bird.y += bird.velocity;
        const targetTilt = bird.velocity < 0 ? maxUpTilt : Math.min(maxDownTilt, bird.velocity / 10);
        tilt = tilt + (targetTilt - tilt) * 0.1;
    } else {
        bird.velocity += gravity;
        bird.y += bird.velocity;
        tilt += 0.1;
        if (tilt > maxDownTilt) tilt = maxDownTilt;
    }

    if (pipes.length === 0 || WIDTH - pipes[pipes.length - 1].x >= PIPE_INTERVAL) createPipe();

    pipes.forEach(pipe => {
        if (!bird.dead) pipe.x -= BASE_SPEED;

        if (!bird.dead && checkCollision(pipe)) {
            bird.dead = true;
            if (!deathSoundPlayed) {
                audioHit.currentTime = 0;
                audioHit.play();
                setTimeout(() => {
                    audioDie.currentTime = 0;
                    audioDie.play();
                }, 200);
                deathSoundPlayed = true;
            }
            bird.velocity = 5;
            setTimeout(() => gameOver = true, 300);
        }

        if (!pipe.scored && pipe.x + PIPE_WIDTH < bird.x) {
            score++;
            pipe.scored = true;
            audioPoint.currentTime = 0;
            audioPoint.play();
        }
    });

    pipes = pipes.filter(pipe => pipe.x + PIPE_WIDTH > 0);

    // Ground collision
    if (bird.y + bird.height >= HEIGHT - BASE_HEIGHT) {
        bird.y = HEIGHT - BASE_HEIGHT - bird.height;
        bird.velocity = 0;
        tilt = maxDownTilt;
        if (!gameOver) gameOver = true;
    }

    frameCount++;
}

// Flap bird
function flap() {
    if (!gameStarted) { gameStarted = true; return; }
    if (!gameOver) {
        bird.velocity = lift;
        audioWing.currentTime = 0;
        audioWing.play();
    } else resetGame();
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
    audioSwoosh.currentTime = 0; audioSwoosh.play();
}

// Game loop
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
