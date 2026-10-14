
"use strict";

// ========================================
// HIDEOUT - OPRAVENÝ GAME.JS
// ========================================

const scene = document.getElementById("scene");
const hint = document.getElementById("hint");
const dialog = document.getElementById("dialog");
const sprite = document.getElementById("player");

const wellElement = document.getElementById("well");
const logElement = document.getElementById("log");
const fireElement = document.getElementById("fire");

 // ========================================
 // KRÁLÍK - VYTVOŘENÍ
 // ========================================

const rabbit = {
    x: 700,
    y: 750,
    speed: 1.2,
    radius: 12,
    caught: false,
    friend: false,
    alive: true
};

const rabbitSprite = document.createElement("img");

rabbitSprite.id = "rabbit";
rabbitSprite.src = "kralik.png";
rabbitSprite.alt = "Divoký králík";
rabbitSprite.draggable = false;

rabbitSprite.style.position = "absolute";
rabbitSprite.style.left = `${rabbit.x}px`;
rabbitSprite.style.top = `${rabbit.y}px`;
rabbitSprite.style.width = "23px";
rabbitSprite.style.height = "23px";
rabbitSprite.style.objectFit = "contain";
rabbitSprite.style.imageRendering = "pixelated";
rabbitSprite.style.transform = "translate(-50%, -50%)";
rabbitSprite.style.pointerEvents = "none";
rabbitSprite.style.zIndex = "12";
scene.appendChild(rabbitSprite);


const healthFill = document.getElementById("health-fill");
const healthText = document.getElementById("health-text");
const waterFill = document.getElementById("water-fill");
const waterText = document.getElementById("water-text");
const hungerFill = document.getElementById("hunger-fill");
const hungerText = document.getElementById("hunger-text");

const deathScreen = document.getElementById("death-screen");
const restartButton = document.getElementById("restart-button");

// ========================================
// SVĚT
// ========================================

const WORLD_WIDTH = 1920;
const WORLD_HEIGHT = 1080;
const CAMERA_ZOOM = 2.8;

const BOUNDS = {
    left: 40,
    right: 1880,
    top: 40,
    bottom: 1040
};

const PLAYER_START = { x: 800, y: 800 };

const player = {
    x: PLAYER_START.x,
    y: PLAYER_START.y,
    speed: 2,
    radius: 12
};

const keys = new Set();

let nearbyObject = null;
let isDead = false;

// ========================================
// POSTAVA - 8 SMĚRŮ
// ========================================

const PLAYER_IMAGES = {
    down: "idle11.png",
    left: "idle12.png",
    up: "idle13.png",
    right: "idle14.png",
    upLeft: "idle15.png",
    upRight: "idle16.png",
    downLeft: "idle17.png",
    downRight: "idle18.png"
};

let playerDirection = "down";

function setPlayerDirection(direction) {
    if (!PLAYER_IMAGES[direction]) return;
    if (playerDirection === direction) return;

    playerDirection = direction;
    sprite.style.backgroundImage =
        `url("${PLAYER_IMAGES[direction]}")`;
}

function resetPlayerAppearance() {
    playerDirection = "down";

    sprite.style.backgroundImage =
        `url("${PLAYER_IMAGES.down}")`;

    sprite.style.backgroundRepeat = "no-repeat";
    sprite.style.backgroundPosition = "center";
    sprite.style.backgroundSize = "contain";

    sprite.style.width = "43px";
    sprite.style.height = "64px";

    sprite.style.backgroundColor = "transparent";
    sprite.style.border = "none";
    sprite.style.boxShadow = "none";

    sprite.style.transform = "translate(-50%, -50%)";
    sprite.style.imageRendering = "pixelated";
    sprite.style.pointerEvents = "none";
}

// ========================================
// ZDRAVÍ
// ========================================

const MAX_HEALTH = 100;

let health = MAX_HEALTH;

function setHealth(value) {
    if (isDead) return;

    health = Math.max(0, Math.min(MAX_HEALTH, value));

    if (healthFill) {
        healthFill.style.width = `${health}%`;
    }

    if (healthText) {
        healthText.textContent =
            `${Math.ceil(health)} / ${MAX_HEALTH}`;
    }

    if (health <= 0) {
        die();
    }
}


 // ========================================
 // ČERVENÉ BLIKNUTÍ PŘI DAMAGE
 // ========================================

let damageFlashTimer = null;

function flashPlayerRed() {
    clearTimeout(damageFlashTimer);

    sprite.style.filter =
        "brightness(0) saturate(100%) invert(18%) sepia(100%) saturate(7000%) hue-rotate(0deg)";

    damageFlashTimer = setTimeout(() => {
        sprite.style.filter = "";
        damageFlashTimer = null;
    }, 150);
}



function takeDamage(amount) {
    if (isDead) return;

    flashPlayerRed();
    setHealth(health - amount);
}


// ========================================
// ŽÍZEŇ - 20 MINUT
// ========================================

const MAX_WATER = 100;
const WATER_DURATION = 20 * 60 * 1000;

const DEHYDRATION_DAMAGE = 5;
const DEHYDRATION_INTERVAL = 3000;

let water = MAX_WATER;
let lastWaterUpdate = performance.now();
let lastDehydrationDamage = null;

function setWater(value) {
    water = Math.max(0, Math.min(MAX_WATER, value));

    if (waterFill) {
        waterFill.style.width = `${water}%`;
    }

    if (waterText) {
        waterText.textContent =
            `${Math.ceil(water)} / ${MAX_WATER}`;
    }
}

function drinkWater(amount) {
    if (isDead) return;

    setWater(water + amount);

    if (water > 0) {
        lastDehydrationDamage = null;
    }
}

function loseWater(amount) {
    if (isDead) return;
    setWater(water - amount);
}

function updateWater() {
    const now = performance.now();
    const deltaTime = Math.max(0, now - lastWaterUpdate);

    lastWaterUpdate = now;

    if (isDead) return;

    if (water > 0) {
        loseWater(
            (MAX_WATER / WATER_DURATION) * deltaTime
        );

        if (water > 0) {
            lastDehydrationDamage = null;
        }
    }

    if (water <= 0) {
        if (lastDehydrationDamage === null) {
            lastDehydrationDamage = now;
        }

        if (
            now - lastDehydrationDamage >=
            DEHYDRATION_INTERVAL
        ) {
            takeDamage(DEHYDRATION_DAMAGE);

            if (isDead) {
                playMyJingle();
            } else {
                playDamageSound();
            }

            lastDehydrationDamage = now;
        }
    }
}

// ========================================
// HLAD - 30 MINUT
// ========================================

const MAX_HUNGER = 100;
const HUNGER_DURATION = 30 * 60 * 1000;

const STARVATION_DAMAGE = 5;
const STARVATION_INTERVAL = 3000;

let hunger = MAX_HUNGER;
let lastHungerUpdate = performance.now();
let lastStarvationDamage = null;

function setHunger(value) {
    hunger = Math.max(0, Math.min(MAX_HUNGER, value));

    if (hungerFill) {
        hungerFill.style.width = `${hunger}%`;
    }

    if (hungerText) {
        hungerText.textContent =
            `${Math.ceil(hunger)} / ${MAX_HUNGER}`;
    }
}

function eatFood(amount) {
    if (isDead) return;

    setHunger(hunger + amount);

    if (hunger > 0) {
        lastStarvationDamage = null;
    }
}

function loseHunger(amount) {
    if (isDead) return;
    setHunger(hunger - amount);
}

function updateHunger() {
    const now = performance.now();
    const deltaTime = Math.max(0, now - lastHungerUpdate);

    lastHungerUpdate = now;

    if (isDead) return;

    if (hunger > 0) {
        loseHunger(
            (MAX_HUNGER / HUNGER_DURATION) * deltaTime
        );

        if (hunger > 0) {
            lastStarvationDamage = null;
        }
    }

    if (hunger <= 0) {
        if (lastStarvationDamage === null) {
            lastStarvationDamage = now;
        }

        if (
            now - lastStarvationDamage >=
            STARVATION_INTERVAL
        ) {
            takeDamage(STARVATION_DAMAGE);

            if (isDead) {
                playMyJingle();
            } else {
                playDamageSound();
            }

            lastStarvationDamage = now;
        }
    }
}


 // ========================================
 // STUDNA
 // ========================================

const WELL = {
    x: 1080,
    y: 665,
    width: 165,
    collisionWidthRatio: 34 / 165,
    collisionHeightRatio: 15 / 165,
    baseOffsetRatio: 20 / 165
};

function getWellCollision() {
    const rx =
        WELL.width * WELL.collisionWidthRatio;

    const oldRY =
        WELL.width * WELL.collisionHeightRatio;

    const oldY =
        WELL.y -
        WELL.width * WELL.baseOffsetRatio -
        15;

    const extraTop = 22;

    return {
        x: WELL.x + 15,
        y: oldY - extraTop / 2,
        rx,
        ry: oldRY + extraTop / 2
    };
}

function updateWellPosition() {
    if (!wellElement) return;

    wellElement.style.left = `${WELL.x}px`;
    wellElement.style.top = `${WELL.y}px`;
    wellElement.style.width = `${WELL.width}px`;
}

function isTouchingWell(x, y) {
    if (!wellElement) return false;

    const collision = getWellCollision();
    const footRadius = 5;

    const dx =
        (x - collision.x) /
        (collision.rx + footRadius);

    const dy =
        (y + 8 - collision.y) /
        (collision.ry + footRadius);

    return dx * dx + dy * dy < 1;
}

// ========================================
// KLÁDA
// ========================================

const LOG = {
    x: 265,
    y: 620,
    width: 100,
    ax: 232,
    ay: 635,
    bx: 298,
    by: 605,
    radius: 11
};

function updateLogPosition() {
    if (!logElement) return;

    logElement.style.left = `${LOG.x}px`;
    logElement.style.top = `${LOG.y}px`;
    logElement.style.width = `${LOG.width}px`;
}

function distanceToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;

    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
        return Math.hypot(px - ax, py - ay);
    }

    const t = Math.max(
        0,
        Math.min(
            1,
            (
                (px - ax) * dx +
                (py - ay) * dy
            ) / lengthSquared
        )
    );

    const closestX = ax + t * dx;
    const closestY = ay + t * dy;

    return Math.hypot(
        px - closestX,
        py - closestY
    );
}

function isTouchingLog(x, y) {
    if (!logElement) return false;

    return distanceToSegment(
        x,
        y + 8,
        LOG.ax,
        LOG.ay,
        LOG.bx,
        LOG.by
    ) < LOG.radius + 5;
}

// ========================================
// VRSTVENÍ OBJEKTŮ
// ========================================

function updateDepthSorting() {
    const feetY = player.y + 8;
    let behindObject = false;

    if (wellElement) {
        wellElement.style.zIndex = "10";

        const collision = getWellCollision();

        const nearWell =
            Math.abs(player.x - WELL.x) < WELL.width;

        if (nearWell && feetY < collision.y) {
            behindObject = true;
        }
    }

    if (logElement) {
        logElement.style.zIndex = "10";

        const nearLog =
            Math.abs(player.x - LOG.x) < LOG.width;

        const logDepthY =
            (LOG.ay + LOG.by) / 2;

        if (nearLog && feetY < logDepthY) {
            behindObject = true;
        }
    }

    sprite.style.zIndex = behindObject ? "9" : "20";
}

// ========================================
// HRANICE OSTROVA - NEMĚNĚNÉ
// ========================================

const MAP_X = WORLD_WIDTH / 1648;
const MAP_Y = WORLD_HEIGHT / 928;

const mapPolygon = points =>
    points.map(([x, y]) => [
        x * MAP_X,
        y * MAP_Y
    ]);

// ========================================
// KOLIZE BUDOV PODLE MODRÉ ČÁRY
// ========================================

// Souřadnice původní mapy 1648 × 928.
// Dům je rozdělený na dvě části,
// aby veranda a schody zůstaly průchozí.

const HOUSE_LEFT_BLOCKED_AREA = mapPolygon([
    [345, 335],
    [384, 366],
    [432, 390],
    [483, 414],
    [531, 426],
    [580, 384],
    [651, 378],
    [702, 342],
    [757, 324],
    [773, 335],
    [773, 0],
    [345, 0]
]);

const HOUSE_RIGHT_BLOCKED_AREA = mapPolygon([
    [943, 263],
    [960, 287],
    [952, 318],
    [973, 365],
    [1012, 431],
    [1043, 497],
    [1220, 497],
    [1220, 0],
    [943, 0]
]);

// Malá dřevěná bouda vlevo dole.

const SHED_BLOCKED_AREA = mapPolygon([
    [190, 588],
    [214, 567],
    [289, 538],
    [323, 550],
    [338, 580],
    [339, 614],
    [285, 650],
    [273, 643],
    [302, 615],
    [295, 580],
    [245, 599],
    [201, 610]
]);

// ========================================
// PRŮCHOZÍ PLOCHA OSTROVA, SCHODY, VERANDA
// Body jsou v souřadnicích podkladové mapy 1648 × 928.
// ========================================

const WALKABLE_AREA = mapPolygon([
    [270,385], [310,350], [355,350],
    [403,375], [475,402], [532,433],
    [579,386], [630,369], [676,377],
    [714,349], [751,346], [783,313],
    [801,324], [827,353], [880,388],
    [940,414], [1004,473], [1066,490],
    [1138,466], [1202,470], [1211,481],
    [1080,532], [987,603], [876,706],
    [753,798], [653,849], [533,851],
    [460,820], [332,708], [257,648],
    [258,624], [336,591], [325,557],
    [295,545], [210,596], [185,587],
    [177,572], [150,541], [112,510],
    [118,474], [169,432], [222,407]
]);

const STAIRS_AREA = mapPolygon([
    [777,368], [793,343], [812,319],
    [837,302], [858,281], [872,267],
    [894,257], [915,277], [901,293],
    [878,310], [860,322], [844,338],
    [826,358], [803,390], [787,387]
]);

const PORCH_AREA = mapPolygon([
    [790,316], [801,307], [811,305],
    [821,306], [832,299], [843,288],
    [860,279], [867,282], [872,288],
    [891,295], [909,306], [898,317],
    [893,329], [893,342], [899,351],
    [889,358], [861,346], [856,351],
    [849,360], [836,350], [822,347],
    [823,333], [811,324]
]);

// ========================================
// GEOMETRIE
// ========================================

function pointInPolygon(x, y, polygon) {
    let inside = false;

    for (
        let i = 0, j = polygon.length - 1;
        i < polygon.length;
        j = i++
    ) {
        const xi = polygon[i][0];
        const yi = polygon[i][1];

        const xj = polygon[j][0];
        const yj = polygon[j][1];

        const intersects =
            (yi > y) !== (yj > y) &&
            x <
            ((xj - xi) * (y - yi)) /
            (yj - yi) + xi;

        if (intersects) {
            inside = !inside;
        }
    }

    return inside;
}

// ========================================
// KOLIZE - PŮVODNÍ
// ========================================

function insideWalkable(x, y) {
    return (
        pointInPolygon(x, y, WALKABLE_AREA) ||
        pointInPolygon(x, y, STAIRS_AREA) ||
        pointInPolygon(x, y, PORCH_AREA)
    );
}


function isBlocked(x, y) {
    const r = 5;

    const checks = [
        [0, 0],
        [r, 0],
        [-r, 0],
        [0, r],
        [0, -r]
    ];

    // ====================================
    // HRANICE OSTROVA, SCHODŮ A VERANDY
    // ====================================

    if (checks.some(([dx, dy]) =>
        !insideWalkable(x + dx, y + dy)
    )) {
        return true;
    }

    // ====================================
    // NEPRŮCHOZÍ BUDOVY
    // ====================================

    const blockedBuildings = [
        HOUSE_LEFT_BLOCKED_AREA,
        HOUSE_RIGHT_BLOCKED_AREA,
        SHED_BLOCKED_AREA
    ];

    if (checks.some(([dx, dy]) =>
        blockedBuildings.some(area =>
            pointInPolygon(
                x + dx,
                y + dy,
                area
            )
        )
    )) {
        return true;
    }

    // ====================================
    // STUDNA A KLÁDA
    // ====================================

    return (
        isTouchingWell(x, y) ||
        isTouchingLog(x, y)
    );
}

// ========================================
// KONTROLA POHYBU
// ========================================

function canMoveTo(x, y) {
    return (
        x >= BOUNDS.left &&
        x <= BOUNDS.right &&
        y >= BOUNDS.top &&
        y <= BOUNDS.bottom &&
        !isBlocked(x, y)
    );
}

// ========================================
// OHEŇ - POŠKOZENÍ
// ========================================

const FIRE = {
    damage: 12,
    cooldown: 500
};

let lastFireDamage = -Infinity;

function isTouchingFire() {
    if (!fireElement) return false;

    const fireX = 225;
    const fireY = 550;

    const footX = player.x;
    const footY = player.y + 8;

    const dx = (footX - fireX) / 29;
    const dy = (footY - fireY) / 24;

    return dx * dx + dy * dy < 1;
}

function checkFireDamage() {
    if (isDead || !isTouchingFire()) return;

    const now = performance.now();

    if (now - lastFireDamage < FIRE.cooldown) {
        return;
    }

    lastFireDamage = now;
    takeDamage(FIRE.damage);

    if (isDead) {
        playMyJingle();
    } else {
        playDamageSound();
    }
}

// ========================================
// PŮVODNÍ 8BIT ZVUKY
// ========================================

const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext;

const audioContext = AudioContextClass
    ? new AudioContextClass()
    : null;

function playTone(
    startFrequency,
    endFrequency,
    duration,
    volume,
    type = "square"
) {
    if (
        !audioContext ||
        audioContext.state !== "running"
    ) {
        return;
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = type;

    oscillator.frequency.setValueAtTime(
        startFrequency, now
    );

    oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(1, endFrequency),
        now + duration
    );

    gain.gain.setValueAtTime(volume, now);

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);
}

function playFootstep() {
    playTone(140, 65, 0.09, 0.035, "triangle");
}

function playDamageSound() {
    playTone(420, 85, 0.22, 0.09, "sawtooth");
}

function playDeathSound() {
    playMyJingle();
}

function playMyJingle() {
    if (
        !audioContext ||
        audioContext.state !== "running"
    ) {
        return;
    }

    const notes = [344, 243, 204, 172];

    notes.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        const start =
            audioContext.currentTime +
            index * 0.22;

        const duration =
            index === notes.length - 1
                ? 0.65
                : 0.25;

        oscillator.type = "triangle";

        oscillator.frequency.setValueAtTime(
            frequency, start
        );

        gain.gain.setValueAtTime(0.06, start);

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            start + duration
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start(start);
        oscillator.stop(start + duration);
    });
}

// ========================================
// MP3 ZVUKY
// ========================================

const SOUND_SETTINGS = {
    ambientVolume: 0.23,
    fireVolume: 0.65,
    fireRange: 340,
    waterVolume: 0.55,
    waterStepInterval: 370,
    waterStepDuration: 180
};

function createGameSound(filename, loop, volume) {
    const sound = new Audio(filename);

    sound.loop = loop;
    sound.volume = volume;
    sound.preload = "auto";

    return sound;
}

const ambientSound = createGameSound(
    "ambient.mp3",
    true,
    SOUND_SETTINGS.ambientVolume
);

const campfireSound = createGameSound(
    "campfire.mp3",
    true,
    0
);

const walkingWaterSound = createGameSound(
    "walkingwater.mp3",
    false,
    SOUND_SETTINGS.waterVolume
);

let gameAudioStarted = false;
let currentFireVolume = 0;

function safePlay(sound) {
    const promise = sound.play();

    if (promise && typeof promise.catch === "function") {
        promise.catch(() => {});
    }
}

function startGameAudio() {
    if (gameAudioStarted) return;

    gameAudioStarted = true;

    safePlay(ambientSound);
    safePlay(campfireSound);
}

function resumeAudio() {
    if (
        audioContext &&
        audioContext.state === "suspended"
    ) {
        audioContext.resume().catch(() => {});
    }

    startGameAudio();
}

window.addEventListener(
    "pointerdown",
    resumeAudio,
    { passive: true }
);

// ========================================
// ZVUK OHNĚ - PŮVODNÍ FUNKČNÍ
// ========================================

function updateFireAudio() {
    if (!gameAudioStarted) return;

    if (isDead) {
        currentFireVolume = 0;
        campfireSound.volume = 0;
        return;
    }

    const fireX = 225;
    const fireY = 550;

    const distance = Math.hypot(
        player.x - fireX,
        player.y - fireY
    );

    const proximity = Math.max(
        0,
        1 - distance / SOUND_SETTINGS.fireRange
    );

    const targetVolume =
        SOUND_SETTINGS.fireVolume *
        proximity *
        proximity;

    currentFireVolume +=
        (targetVolume - currentFireVolume) * 0.06;

    campfireSound.volume = Math.max(
        0,
        Math.min(1, currentFireVolume)
    );
}

// ========================================
// MĚLKÁ VODA
// ========================================

// Pouze zvuková oblast.
// NEMĚNÍ kolize ostrova.
//
// Body jsou orientační a bude možné
// je doladit podle skutečné mapy.
//
// Jde o úzkou oblast u pravého břehu
// jezírka, ne o celou okolní trávu.

const SHALLOW_WATER_AREA = mapPolygon([
    [488,709],
    [511,695],
    [544,685],
    [583,687],
    [623,703],
    [642,720],
    [639,744],
    [617,759],
    [583,772],
    [547,778],
    [517,760],
    [495,737]
]);

function isWalkingInShallowWater() {
    return pointInPolygon(
        player.x,
        player.y + 8,
        SHALLOW_WATER_AREA
    );
}

// ========================================
// ZVUK VODY - KRÁTKÉ ŠPLOUCHNUTÍ
// ========================================

let lastWaterStep = -Infinity;
let waterStopTimer = null;
let waterStepToken = 0;

function stopWaterSound() {
    waterStepToken++;

    if (waterStopTimer !== null) {
        clearTimeout(waterStopTimer);
        waterStopTimer = null;
    }

    walkingWaterSound.pause();
}

function playWaterStep() {
    stopWaterSound();

    const sound = walkingWaterSound;

    if (sound.readyState < 1) return;

    const duration = sound.duration;

    if (!Number.isFinite(duration) || duration <= 0) {
        return;
    }

    const clipLength =
        SOUND_SETTINGS.waterStepDuration / 1000;

    const maxStart = Math.max(
        0,
        duration - clipLength - 0.05
    );

    // Náhodný úsek nahrávky.
    sound.currentTime = Math.random() * maxStart;

    sound.volume = SOUND_SETTINGS.waterVolume;

    const token = ++waterStepToken;

    safePlay(sound);

    // Zvuk zastavíme po 180 ms.
    waterStopTimer = setTimeout(() => {
        if (token !== waterStepToken) return;

        sound.pause();
        waterStopTimer = null;
    }, SOUND_SETTINGS.waterStepDuration);
}


 // ========================================
 // KROKY PO TRÁVĚ
 // ========================================

let lastFootstep = 0;

const FOOTSTEP_INTERVAL = 280;

function updateFootsteps(isMoving) {
    if (!isMoving) return;

    const now = performance.now();

    if (
        now - lastFootstep >=
        FOOTSTEP_INTERVAL
    ) {
        playFootstep();
        lastFootstep = now;
    }
}

// ========================================
// KROKY - TRÁVA / VODA
// ========================================

function updateWalkingAudio(isMoving) {
    if (!isMoving || isDead || !dialog.hidden) {
        stopWaterSound();
        return;
    }

    const now = performance.now();

    if (isWalkingInShallowWater()) {
        if (
            now - lastWaterStep >=
            SOUND_SETTINGS.waterStepInterval
        ) {
            playWaterStep();
            lastWaterStep = now;
        }

        return;
    }

    // Mimo vodu nesmí šplouchat.
    stopWaterSound();

    // Na trávě původní 8bit kroky.
    updateFootsteps(true);
}

// ========================================
// PAPÍR, KELÍMEK, JEZÍRKO
// ========================================

const ITEM_IMAGES = {
    paper: "papir.png",
    cup: "kelimek.png",
    full: "plnykelimek.png"
};

// PAPÍR U BOUDY
const PAPER_LOCATION = {
    x: 660,
    y: 580,
    radius: 42
};

const LAKE_SHORE = {
    x: 765,
    y: 800,
    radius: 73
};

const WELL_USE_RADIUS = 105;

let paperAvailable = true;

const paperSprite = document.createElement("img");

paperSprite.id = "ground-paper";
paperSprite.src = ITEM_IMAGES.paper;
paperSprite.alt = "List papíru";
paperSprite.draggable = false;

paperSprite.style.position = "absolute";
paperSprite.style.left = `${PAPER_LOCATION.x}px`;
paperSprite.style.top = `${PAPER_LOCATION.y}px`;
paperSprite.style.width = "24px";
paperSprite.style.height = "24px";
paperSprite.style.transform = "translate(-50%, -50%)";
paperSprite.style.objectFit = "contain";
paperSprite.style.imageRendering = "pixelated";
paperSprite.style.pointerEvents = "none";
paperSprite.style.zIndex = "11";

scene.appendChild(paperSprite);

function refreshGroundPaper() {
    paperSprite.hidden = !paperAvailable;
    paperSprite.style.display =
        paperAvailable ? "block" : "none";
}

function makePaper() {
    return {
        id: "paper",
        name: "List papíru",
        image: ITEM_IMAGES.paper
    };
}

function makeCup(uses = 0, contents = null) {
    return {
        id: "cup",
        name: contents
            ? "Kelímek s vodou"
            : "Papírovovej kelímek",
        image: contents
            ? ITEM_IMAGES.full
            : ITEM_IMAGES.cup,
        uses,
        contents
    };
}

// ========================================
// DIALOGY
// ========================================

function showChoices(title, description, choices) {
    dialog.hidden = false;
    dialog.replaceChildren();

    const heading = document.createElement("strong");
    heading.textContent = title;

    const descriptionNode = document.createElement("p");
    descriptionNode.textContent = description;

    dialog.append(heading, descriptionNode);

    const actions = document.createElement("div");
    actions.className = "dialog-actions";

    for (const choice of choices) {
        const button = document.createElement("button");

        button.type = "button";
        button.textContent = choice.label;

        button.addEventListener(
            "click",
            choice.action
        );

        actions.appendChild(button);
    }

    const close = document.createElement("button");

    close.type = "button";
    close.textContent = "Zavřít [Esc]";

    close.addEventListener("click", () => {
        dialog.hidden = true;
    });

    actions.appendChild(close);
    dialog.appendChild(actions);
}

function showMessage(title, message) {
    dialog.hidden = false;
    dialog.replaceChildren();

    const heading = document.createElement("strong");
    heading.textContent = title;

    const paragraph = document.createElement("p");
    paragraph.textContent = message;

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Zavřít [Esc]";

    button.addEventListener("click", () => {
        dialog.hidden = true;
    });

    dialog.append(heading, paragraph, button);
}

// ========================================
// SEBRÁNÍ PAPÍRU
// ========================================

function pickupPaper() {
    if (isDead || !paperAvailable) return;

    const distance = Math.hypot(
        player.x - PAPER_LOCATION.x,
        player.y - PAPER_LOCATION.y
    );

    if (distance >= PAPER_LOCATION.radius) {
        return;
    }

    if (!addInventoryItem(makePaper())) {
        showMessage(
            "Inventář je plný",
            "Na papír nemáš místo."
        );
        return;
    }

    paperAvailable = false;
    refreshGroundPaper();

    showMessage(
        "List papíru",
        "Sebrals list papíru."
    );
}

// ========================================
// INVENTÁŘ - PŘEDMĚTY
// ========================================

function openInventoryItem(index) {
    if (isDead || !dialog.hidden) return;

    const item = inventoryItems[index];

    if (!item) return;

    if (item.id === "paper") {
        showChoices(
            "List papíru",
            "Co chceš udělat?",
            [
                {
                    label: "Prozkoumat",
                    action: () => {
                        showMessage(
                            "List papíru",
                            "Obyčejná stránka ze sešitu."
                        );
                    }
                },
                {
                    label: "Vyrobit..?",
                    action: () => {
                        if (
                            inventoryItems[index]?.id !==
                            "paper"
                        ) {
                            return;
                        }

                        inventoryItems[index] = makeCup();

                        renderInventory();

                        showMessage(
                            "Papírový kelímek",
                            "Složil sis z papíru provizorní kelímek."
                        );
                    }
                }
            ]
        );

        return;
    }

    if (item.id === "cup") {
        const choices = [
            {
                label: "Prozkoumat",
                action: () => {
                    showMessage(
                        "Papírový kelímek",
                        item.contents
                            ? "V kelímku je voda."
                            : "Prázdný papírový kelímek."
                    );
                }
            }
        ];

        if (item.contents) {
            choices.push(
                {
                    label: "Napít se",
                    action: () => drinkFromCup(index)
                },
                {
                    label: "Vylít vodu",
                    action: () => pourOutCup(index)
                }
            );
        }

        showChoices(
            item.name,
            item.contents
                ? "Co uděláš s vodou?"
                : "Kelímek je prázdný.",
            choices
        );
    }
}


 // ========================================
 // STUDNA A JEZÍRKO - INTERAKCE
 // ========================================

function findCup() {
    return inventoryItems.findIndex(
        item => item?.id === "cup"
    );
}

function nearWell() {
    if (!wellElement) return false;

    const collision = getWellCollision();

    return Math.hypot(
        player.x - collision.x,
        player.y - collision.y
    ) < WELL_USE_RADIUS;
}

function nearLake() {
    return Math.hypot(
        player.x - LAKE_SHORE.x,
        player.y - LAKE_SHORE.y
    ) < LAKE_SHORE.radius;
}

function fillCup(source) {
    if (isDead) return;

    if (source === "well" && !nearWell()) return;
    if (source === "lake" && !nearLake()) return;

    const index = findCup();

    if (index < 0) {
        showMessage(
            source === "well"
                ? "Studna"
                : "Jezírko",
            "Nemáš dočeho nabrat vodu."
        );
        return;
    }

    const cup = inventoryItems[index];

    if (cup.contents) {
        showMessage(
            "Plný kelímek",
            "Nejdřív vodu vypij nebo ju vylej."
        );
        return;
    }

    cup.uses += 1;

    // ČTVRTÉ NABRÁNÍ = ZNIČENÍ
    if (cup.uses >= 4) {
        inventoryItems[index] = null;
        renderInventory();

        showMessage(
            "Rozmočený kelímek",
            "Papír nasákl vodou. Kelímek se ti rozpadl přímo v rukou."
        );

        return;
    }

    cup.contents = source;
    cup.name = "Kelímek s vodou";
    cup.image = ITEM_IMAGES.full;

    renderInventory();

    showMessage(
        source === "well"
            ? "Studna"
            : "Jezírko",
        source === "well"
            ? "Nabral jsi čistou, studenou vodu."
            : "Nabral jsi kalnou vodu z jezírka."
    );
}

function emptyCup(index) {
    const cup = inventoryItems[index];

    if (!cup || cup.id !== "cup") return;

    cup.contents = null;
    cup.name = "Papírový kelímek";
    cup.image = ITEM_IMAGES.cup;

    renderInventory();
}

function pourOutCup(index) {
    const cup = inventoryItems[index];

    if (
        !cup ||
        cup.id !== "cup" ||
        !cup.contents
    ) {
        return;
    }

    emptyCup(index);

    showMessage(
        "Vylít vodu",
        "Vylil jsi vodu. Kelímek je zase prázdný."
    );
}

// ========================================
// BAREVNÝ TEXT H2O
// ========================================

let waterFeedbackTimer = null;

function showWaterFeedback(change) {
    const indicator =
        document.getElementById("water-feedback");

    if (!indicator) return;

    clearTimeout(waterFeedbackTimer);

    const rounded = Math.round(change);

    indicator.textContent =
        `${rounded > 0 ? "+" : ""}${rounded} H2O`;

    indicator.className =
        rounded < 0
            ? "negative visible"
            : "positive visible";

    waterFeedbackTimer = setTimeout(() => {
        indicator.className = "";
    }, 1800);
}

function drinkFromCup(index) {
    const cup = inventoryItems[index];

    if (
        !cup ||
        cup.id !== "cup" ||
        !cup.contents ||
        isDead
    ) {
        return;
    }

    const source = cup.contents;
    const before = water;

    if (source === "well") {
        drinkWater(MAX_WATER);
    } else {
        loseWater(25);
    }

    const change = water - before;

    emptyCup(index);
    showWaterFeedback(change);

    showMessage(
        source === "well"
            ? "Čistá voda"
            : "Špinavá voda",
        source === "well"
            ? "Napil ses čisté vody. Je ti nejlíp."
            : "Voda z jezírka ti neudělala dobře."
    );
}

// ========================================
// INTERAKCE VE SVĚTĚ
// ========================================

const objects = [
    {
        name: "Vchod do domu",
        x: 960,
        y: 580,
        radius: 65,
        action: () => {
            showMessage(
                "Vítej doma.",
                "Interiér teprve postavíme. Tohle místo bude růst podle tebe."
            );
        }
    },
    {
        name: "Starý strom",
        x: 360,
        y: 700,
        radius: 55,
        action: () => {
            showMessage(
                "Pod stromem",
                "Kořeny nadzvedávají staré kameny. Jeden z nich vypadá, že jde odsunout."
            );
        }
    }
];

function resolveNearbyObject() {
    if (
        paperAvailable &&
        Math.hypot(
            player.x - PAPER_LOCATION.x,
            player.y - PAPER_LOCATION.y
        ) < PAPER_LOCATION.radius
    ) {
        return {
            name: "List papíru",
            action: pickupPaper,
            hint: "List papíru · Stiskni E pro sebrání"
        };
    }

    if (nearLake()) {
        return {
            name: "Jezírko",
            action: () => fillCup("lake")
        };
    }

    if (nearWell()) {
        return {
            name: "Studna",
            action: () => fillCup("well")
        };
    }

    return objects.find(
        object =>
            Math.hypot(
                player.x - object.x,
                player.y - object.y
            ) < object.radius
    ) || null;
}

// ========================================
// INVENTÁŘ - 5 SLOTŮ
// ========================================

const INVENTORY_SIZE = 5;

const inventoryItems =
    Array(INVENTORY_SIZE).fill(null);

let selectedInventorySlot = 0;

let inventoryElement =
    document.getElementById("inventory");

if (!inventoryElement) {
    inventoryElement = document.createElement("div");
    inventoryElement.id = "inventory";

    document
        .getElementById("game")
        .appendChild(inventoryElement);
}

function renderInventory() {
    inventoryElement.replaceChildren();

    inventoryItems.forEach((item, index) => {
        const slot = document.createElement("button");

        slot.type = "button";

        slot.className =
            "inventory-slot" +
            (
                index === selectedInventorySlot
                    ? " selected"
                    : ""
            );

        slot.title = item
            ? item.name
            : `Prázdný slot ${index + 1}`;

        const number = document.createElement("span");

        number.className = "slot-number";
        number.textContent = String(index + 1);

        const icon = document.createElement("span");

        icon.className = "slot-item";

        if (item?.image) {
            const image = document.createElement("img");

            image.src = item.image;
            image.alt = item.name;
            image.className = "inventory-item-image";

            icon.appendChild(image);
        } else {
            icon.textContent =
                item ? (item.icon || "📦") : "";
        }

        slot.append(number, icon);

        slot.addEventListener("click", () => {
            if (isDead) return;

            resumeAudio();

            if (
                selectedInventorySlot === index &&
                item
            ) {
                if (typeof item.use === "function") {
                    item.use();
                } else {
                    openInventoryItem(index);
                }
            } else {
                selectInventorySlot(index);
            }
        });

        inventoryElement.appendChild(slot);
    });
}

function selectInventorySlot(index) {
    if (
        isDead ||
        index < 0 ||
        index >= INVENTORY_SIZE
    ) {
        return;
    }

    selectedInventorySlot = index;
    renderInventory();
}

function addInventoryItem(item) {
    if (
        isDead ||
        !item ||
        !item.id
    ) {
        return false;
    }

    const emptyIndex = inventoryItems.findIndex(
        slot => slot === null
    );

    if (emptyIndex === -1) return false;

    inventoryItems[emptyIndex] = { ...item };

    renderInventory();
    return true;
}

function removeInventoryItem(
    index = selectedInventorySlot
) {
    if (
        index < 0 ||
        index >= INVENTORY_SIZE
    ) {
        return null;
    }

    const item = inventoryItems[index];

    inventoryItems[index] = null;
    renderInventory();

    return item;
}

function getSelectedInventoryItem() {
    return inventoryItems[selectedInventorySlot];
}

function useSelectedInventoryItem() {
    if (isDead || !dialog.hidden) return;

    const item = getSelectedInventoryItem();

    if (item && typeof item.use === "function") {
        item.use();
    } else if (item) {
        openInventoryItem(selectedInventorySlot);
    }
}


 // ========================================
 // KAMERA
 // ========================================

function updateCamera() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const scaledWidth = WORLD_WIDTH * CAMERA_ZOOM;
    const scaledHeight = WORLD_HEIGHT * CAMERA_ZOOM;

    let cameraX =
        viewportWidth / 2 -
        player.x * CAMERA_ZOOM;

    let cameraY =
        viewportHeight / 2 -
        player.y * CAMERA_ZOOM;

    if (scaledWidth > viewportWidth) {
        cameraX = Math.min(
            0,
            Math.max(
                viewportWidth - scaledWidth,
                cameraX
            )
        );
    } else {
        cameraX =
            (viewportWidth - scaledWidth) / 2;
    }

    if (scaledHeight > viewportHeight) {
        cameraY = Math.min(
            0,
            Math.max(
                viewportHeight - scaledHeight,
                cameraY
            )
        );
    } else {
        cameraY =
            (viewportHeight - scaledHeight) / 2;
    }

    scene.style.transform =
        `translate(${cameraX}px, ${cameraY}px) scale(${CAMERA_ZOOM})`;
}

// ========================================
// OVLÁDÁNÍ
// ========================================

window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();

    if (
        [
            "w",
            "a",
            "s",
            "d",
            "arrowup",
            "arrowdown",
            "arrowleft",
            "arrowright",
            " "
        ].includes(key)
    ) {
        event.preventDefault();
    }

    if (isDead) return;

    resumeAudio();

    if (
        /^[1-5]$/.test(event.key) &&
        !event.repeat &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey
    ) {
        selectInventorySlot(
            Number(event.key) - 1
        );

        return;
    }

    keys.add(key);

    if (key === "escape") {
        dialog.hidden = true;
    }

    if (
        key === "e" &&
        !event.repeat &&
        nearbyObject &&
        dialog.hidden
    ) {
        nearbyObject.action();
    }
});

window.addEventListener("keyup", event => {
    keys.delete(event.key.toLowerCase());
});

window.addEventListener("blur", () => {
    keys.clear();
    stopWaterSound();
});

// ========================================
// SMRT
// ========================================

function die() {
    if (isDead) return;

    isDead = true;

    keys.clear();
    nearbyObject = null;

    dialog.hidden = true;
    deathScreen.hidden = false;

    stopWaterSound();
    campfireSound.volume = 0;
}

// ========================================
// RESTART
// ========================================

function restartGame() {
    isDead = false;
    clearTimeout(damageFlashTimer);
    sprite.style.filter = "";

    player.x = PLAYER_START.x;
    player.y = PLAYER_START.y;

    keys.clear();
    nearbyObject = null;

    lastFireDamage = -Infinity;
    lastFootstep = 0;
    lastWaterStep = -Infinity;

    stopWaterSound();

    dialog.hidden = true;
    deathScreen.hidden = true;

    setHealth(MAX_HEALTH);

    setWater(MAX_WATER);
    lastWaterUpdate = performance.now();
    lastDehydrationDamage = null;

    setHunger(MAX_HUNGER);
    lastHungerUpdate = performance.now();
    lastStarvationDamage = null;

    inventoryItems.fill(null);
    selectedInventorySlot = 0;

    paperAvailable = true;
    refreshGroundPaper();

    const indicator =
        document.getElementById("water-feedback");

    if (indicator) {
        indicator.className = "";
    }

    renderInventory();
    resetPlayerAppearance();

    sprite.style.left = `${player.x}px`;
    sprite.style.top = `${player.y}px`;

    updateDepthSorting();
    updateCamera();

    resumeAudio();
}

restartButton.addEventListener(
    "click",
    restartGame
);

// ========================================
// HLAVNÍ HERNÍ SMYČKA
// ========================================


 // ========================================
 // KRÁLÍK - NÁHODNÝ POHYB
 // ========================================


function updateRabbit() {
    if (!rabbit.alive) {
        rabbitSprite.style.display = "none";
        return;
    }

    rabbitSprite.style.display = "block";

    const now = performance.now();

    // KRÁLÍK V RUCE
    if (rabbit.caught) {
        rabbit.hopping = false;
        rabbitSprite.style.left = `${player.x + 18}px`;
        rabbitSprite.style.top = `${player.y - 18}px`;
        rabbitSprite.style.transform =
            "translate(-50%, -50%)";
        rabbitSprite.style.zIndex = "21";
        return;
    }

    // NÁHODNÉ ROZHODOVÁNÍ
    if (!rabbit.hopping && now >= rabbit.nextDecision) {
        rabbit.direction = Math.random() * Math.PI * 2;
        rabbit.moving = true;
        rabbit.nextDecision =
            now + 700 + Math.random() * 1600;
    }

    // ZAČÁTEK SKOKU
    if (
        rabbit.moving &&
        !rabbit.hopping &&
        now - rabbit.lastHopEnd >= rabbit.hopCooldown
    ) {
        const nextX =
            rabbit.x +
            Math.cos(rabbit.direction) * rabbit.hopDistance;

        const nextY =
            rabbit.y +
            Math.sin(rabbit.direction) * rabbit.hopDistance;

        // Kontrola celé dráhy skoku
        let pathClear = true;

        for (let i = 1; i <= 6; i++) {
            const t = i / 6;

            if (!canMoveTo(
                rabbit.x + (nextX - rabbit.x) * t,
                rabbit.y + (nextY - rabbit.y) * t
            )) {
                pathClear = false;
                break;
            }
        }

        if (pathClear) {
            rabbit.hopping = true;
            rabbit.hopStart = now;
            rabbit.hopFromX = rabbit.x;
            rabbit.hopFromY = rabbit.y;
            rabbit.hopToX = nextX;
            rabbit.hopToY = nextY;
        } else {
    rabbit.direction = Math.random() * Math.PI * 2;
    rabbit.nextDecision = now + 250;
    rabbit.moving = true;
}
}
    let jumpHeight = 0;

    // PRŮBĚH SKOKU
    if (rabbit.hopping) {
        const progress = Math.min(
            1,
            (now - rabbit.hopStart) / rabbit.hopDuration
        );

        rabbit.x =
            rabbit.hopFromX +
            (rabbit.hopToX - rabbit.hopFromX) * progress;

        rabbit.y =
            rabbit.hopFromY +
            (rabbit.hopToY - rabbit.hopFromY) * progress;

        // Oblouk skoku
        jumpHeight =
            Math.sin(progress * Math.PI) * rabbit.hopHeight;

        if (progress >= 1) {
            rabbit.hopping = false;
            rabbit.lastHopEnd = now;
            jumpHeight = 0;
        }
    }

    // POZICE NA MAPĚ
    rabbitSprite.style.left = `${rabbit.x}px`;
    rabbitSprite.style.top = `${rabbit.y - jumpHeight}px`;

    rabbitSprite.style.transform =
        "translate(-50%, -50%)";

    // SPRÁVNÉ VRSTVENÍ
    rabbitSprite.style.zIndex =
        rabbit.y < player.y ? "9" : "21";
}



function update() {
    const previousX = player.x;
    const previousY = player.y;

    let dx = 0;
    let dy = 0;

    if (keys.has("w") || keys.has("arrowup")) {
        dy--;
    }

    if (keys.has("s") || keys.has("arrowdown")) {
        dy++;
    }

    if (keys.has("a") || keys.has("arrowleft")) {
        dx--;
    }

    if (keys.has("d") || keys.has("arrowright")) {
        dx++;
    }

    // ====================================
    // OTÁČENÍ POSTAVIČKY
    // ====================================

    if (!isDead && dialog.hidden) {
        if (dy < 0 && dx < 0) {
            setPlayerDirection("upLeft");
        } else if (dy < 0 && dx > 0) {
            setPlayerDirection("upRight");
        } else if (dy > 0 && dx < 0) {
            setPlayerDirection("downLeft");
        } else if (dy > 0 && dx > 0) {
            setPlayerDirection("downRight");
        } else if (dy < 0) {
            setPlayerDirection("up");
        } else if (dy > 0) {
            setPlayerDirection("down");
        } else if (dx < 0) {
            setPlayerDirection("left");
        } else if (dx > 0) {
            setPlayerDirection("right");
        }
    }

    // ====================================
    // DIAGONÁLNÍ POHYB
    // ====================================

    if (dx !== 0 && dy !== 0) {
        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
    }

    // ====================================
    // POHYB A KOLIZE
    // ====================================

    if (dialog.hidden && !isDead) {
        const nextX =
            player.x + dx * player.speed;

        const nextY =
            player.y + dy * player.speed;

        if (canMoveTo(nextX, nextY)) {
            player.x = nextX;
            player.y = nextY;
        } else {
            if (
                dx !== 0 &&
                canMoveTo(nextX, player.y)
            ) {
                player.x = nextX;
            }

            if (
                dy !== 0 &&
                canMoveTo(player.x, nextY)
            ) {
                player.y = nextY;
            }
        }
    }

    // ====================================
    // DAMAGE OD OHNĚ
    // ====================================

    if (!isDead) {
        checkFireDamage();
    }

    // ====================================
    // ZVUKY
    // ====================================

    const isMoving =
        !isDead &&
        dialog.hidden &&
        (
            player.x !== previousX ||
            player.y !== previousY
        );

    updateWalkingAudio(isMoving);
    updateFireAudio();

    // ====================================
    // POZICE POSTAVY
    // ====================================

    sprite.style.left = `${player.x}px`;
    sprite.style.top = `${player.y}px`;

    updateDepthSorting();
    updateRabbit();
    updateCamera();

    // ====================================
    // INTERAKCE
    // ====================================

    nearbyObject = resolveNearbyObject();

    // ====================================
    // NÁPOVĚDA
    // ====================================

    if (isDead) {
        hint.textContent = "CHCIPNULS...";
    } else if (!dialog.hidden) {
        hint.textContent = "ESC · Zavřít";
    } else if (nearbyObject) {
        hint.textContent =
            nearbyObject.hint ||
            `${nearbyObject.name} · Stiskni E`;
    } else {
        hint.textContent =
            "WASD / šipky · Pohyb | E · Interakce | 1–5 · Inventář";
    }

    requestAnimationFrame(update);
}

// ========================================
// START HRY
// ========================================

updateWellPosition();
updateLogPosition();
refreshGroundPaper();

resetPlayerAppearance();

setHealth(MAX_HEALTH);
setWater(MAX_WATER);
setHunger(MAX_HUNGER);

renderInventory();

lastWaterUpdate = performance.now();
lastHungerUpdate = performance.now();

setInterval(updateWater, 100);
setInterval(updateHunger, 100);

update();







