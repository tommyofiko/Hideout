// ======================================
// HIDEOUT - GAME.JS
// ======================================

const scene = document.getElementById("scene");
const hint = document.getElementById("hint");
const dialog = document.getElementById("dialog");
const sprite = document.getElementById("player");

const wellElement = document.getElementById("well");
const logElement = document.getElementById("log");

const healthFill = document.getElementById("health-fill");
const healthText = document.getElementById("health-text");

const waterFill = document.getElementById("water-fill");
const waterText = document.getElementById("water-text");

const deathScreen = document.getElementById("death-screen");
const restartButton = document.getElementById("restart-button");

// ======================================
// HEALTH SYSTEM
// ======================================

const MAX_HEALTH = 100;
let health = MAX_HEALTH;
let isDead = false;

function setHealth(value) {
    if (isDead) return;

    health = Math.max(0, Math.min(MAX_HEALTH, value));

    healthFill.style.width =
        `${(health / MAX_HEALTH) * 100}%`;

    healthText.textContent =
        `${health} / ${MAX_HEALTH}`;

    healthFill.style.background = "#e84949";

    if (health <= 0) {
        die();
    }
}

function takeDamage(amount) {
    if (isDead) return;
    setHealth(health - amount);
}

function healPlayer(amount) {
    if (isDead) return;
    setHealth(health + amount);
}

// ======================================
// H2O SYSTEM
// ======================================

const MAX_WATER = 100;

// Za 10 reálných minut klesne H2O na 0
const WATER_DURATION = 10 * 60 * 1000;

// Damage při nedostatku vody
const DEHYDRATION_DAMAGE = 5;
const DEHYDRATION_INTERVAL = 3000;

let water = MAX_WATER;

let lastWaterUpdate = performance.now();
let lastDehydrationDamage = null;

function setWater(value) {
    water = Math.max(0, Math.min(MAX_WATER, value));

    if (waterFill) {
        waterFill.style.width =
            `${(water / MAX_WATER) * 100}%`;
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
        const waterLoss =
            (MAX_WATER / WATER_DURATION) * deltaTime;

        loseWater(waterLoss);

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

// ======================================
// NASTAVENÍ SVĚTA
// ======================================

const WORLD_WIDTH = 1920;
const WORLD_HEIGHT = 1080;
const CAMERA_ZOOM = 2.8;

const BOUNDS = {
    left: 40,
    right: 1880,
    top: 40,
    bottom: 1040
};

const PLAYER_START = {
    x: 800,
    y: 800
};

const player = {
    x: PLAYER_START.x,
    y: PLAYER_START.y,
    speed: 2,
    radius: 12
};

const keys = new Set();
let nearbyObject = null;

// ======================================
// STUDNA
// ======================================

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
        rx: rx,
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

    const footX = x;
    const footY = y + 8;
    const footRadius = 5;

    const dx =
        (footX - collision.x) /
        (collision.rx + footRadius);

    const dy =
        (footY - collision.y) /
        (collision.ry + footRadius);

    return dx * dx + dy * dy < 1;
}

// ======================================
// KLÁDA
// ======================================

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

function isTouchingLog(x, y) {
    if (!logElement) return false;

    const footX = x;
    const footY = y + 8;
    const footRadius = 5;

    return distanceToSegment(
        footX,
        footY,
        LOG.ax,
        LOG.ay,
        LOG.bx,
        LOG.by
    ) < LOG.radius + footRadius;
}

// ======================================
// VRSTVENÍ OBJEKTŮ
// ======================================

function updateDepthSorting() {
    const playerFeetY = player.y + 8;

    if (wellElement) {
        const collision = getWellCollision();

        wellElement.style.zIndex = "10";

        sprite.style.zIndex =
            playerFeetY < collision.y ? "9" : "20";
    } else {
        sprite.style.zIndex = "20";
    }

    if (logElement) {
        logElement.style.zIndex = "10";

        const logDepthY =
            (LOG.ay + LOG.by) / 2;

        if (playerFeetY < logDepthY) {
            sprite.style.zIndex = "9";
        } else if (
            !wellElement ||
            playerFeetY >= getWellCollision().y
        ) {
            sprite.style.zIndex = "20";
        }
    }
}

// ======================================
// OHEŇ - DAMAGE
// ======================================

const FIRE = {
    damage: 12,
    cooldown: 500
};

let lastFireDamage = -Infinity;

function isTouchingFire() {
    const fireElement = document.getElementById("fire");

    if (!fireElement) return false;

    const style = window.getComputedStyle(fireElement);

    if (
        style.display === "none" ||
        style.visibility === "hidden"
    ) {
        return false;
    }

    const width = fireElement.offsetWidth;
    const height = fireElement.offsetHeight;

    const left =
        fireElement.offsetLeft - width * 0.5;

    const top =
        fireElement.offsetTop - height * 0.75;

    const footX = player.x;
    const footY = player.y + 8;
    const footRadius = 4;

    const zones = [
        [0.50, 0.81, 0.33, 0.16],
        [0.50, 0.61, 0.26, 0.19],
        [0.50, 0.41, 0.18, 0.16],
        [0.53, 0.25, 0.10, 0.10]
    ];

    return zones.some(([cx, cy, rx, ry]) => {
        const centerX = left + cx * width;
        const centerY = top + cy * height;

        const radiusX = rx * width + footRadius;
        const radiusY = ry * height + footRadius;

        const dx = (footX - centerX) / radiusX;
        const dy = (footY - centerY) / radiusY;

        return dx * dx + dy * dy <= 1;
    });
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

// ======================================
// RETRO 8-BIT SOUND SYSTEM
// ======================================

const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext;

const audioContext = AudioContextClass
    ? new AudioContextClass()
    : null;

let lastFootstep = 0;
const FOOTSTEP_INTERVAL = 280;

function resumeAudio() {
    if (!audioContext) return;

    if (audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
    }
}

// ======================================
// ZVUK KROKŮ
// ======================================

function playFootstep() {
    if (!audioContext) return;

    resumeAudio();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = "square";

    oscillator.frequency.setValueAtTime(140, now);
    oscillator.frequency.exponentialRampToValueAtTime(
        65,
        now + 0.055
    );

    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + 0.065
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.07);
}

// ======================================
// ZVUK DAMAGE
// ======================================

function playDamageSound() {
    if (!audioContext) return;

    resumeAudio();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = "sawtooth";

    oscillator.frequency.setValueAtTime(420, now);
    oscillator.frequency.exponentialRampToValueAtTime(
        85,
        now + 0.18
    );

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + 0.2
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.2);
}

// ======================================
// RETRO DEATH SOUND
// ======================================

function playDeathSound() {
    if (!audioContext) return;

    resumeAudio();

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sawtooth";

    oscillator.frequency.setValueAtTime(190, now);
    oscillator.frequency.exponentialRampToValueAtTime(
        45,
        now + 0.65
    );

    gain.gain.setValueAtTime(0.13, now);
    gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + 0.75
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.75);
}

// ======================================
// TVOJE 8-BIT ZNĚLKA PŘI SMRTI
// ======================================

function playMyJingle() {
    if (!audioContext) return;

    resumeAudio();

    const notes = [
        { freq: 344, duration: 0.13 },
        { freq: 243, duration: 0.17 },
        { freq: 204, duration: 0.13 },
        { freq: 172, duration: 0.68 }
    ];

    let time = audioContext.currentTime;

    notes.forEach(note => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "square";

        oscillator.frequency.setValueAtTime(
            note.freq,
            time
        );

        gain.gain.setValueAtTime(0.10, time);

        gain.gain.setValueAtTime(
            0.10,
            time + note.duration - 0.01
        );

        gain.gain.linearRampToValueAtTime(
            0,
            time + note.duration
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start(time);
        oscillator.stop(time + note.duration);

        time += note.duration;
    });
}

// ======================================
// UPDATE KROKŮ
// ======================================

function updateFootsteps(isMoving) {
    if (!isMoving || isDead) return;

    const now = performance.now();

    if (now - lastFootstep >= FOOTSTEP_INTERVAL) {
        playFootstep();
        lastFootstep = now;
    }
}

// ======================================
// SMRT HRÁČE
// ======================================

function die() {
    if (isDead) return;

    isDead = true;

    keys.clear();
    nearbyObject = null;

    dialog.hidden = true;
    deathScreen.hidden = false;
}

// ======================================
// RESTART HRY
// ======================================

function restartGame() {
    isDead = false;

    player.x = PLAYER_START.x;
    player.y = PLAYER_START.y;

    lastFireDamage = -Infinity;
    lastFootstep = 0;

    keys.clear();
    nearbyObject = null;

    dialog.hidden = true;
    deathScreen.hidden = true;

    // Obnovení životů
    setHealth(MAX_HEALTH);

    // Obnovení vody
    setWater(MAX_WATER);
    lastWaterUpdate = performance.now();
    lastDehydrationDamage = null;

    sprite.style.left = `${player.x}px`;
    sprite.style.top = `${player.y}px`;

    updateDepthSorting();
    updateCamera();
}

restartButton.addEventListener("click", restartGame);

// ======================================
// PRŮCHOZÍ OBLAST OSTROVA
// ======================================

const WALKABLE_AREA = [
    [1320, 597],
    [1259, 528],
    [1203, 550],
    [1007, 418],
    [1096, 301],
    [1017, 238],
    [983, 254],
    [971, 215],
    [918, 249],
    [946, 250],
    [946, 289],
    [898, 319],
    [950, 363],
    [926, 397],
    [894, 380],
    [624, 494],
    [516, 429],
    [332, 404],
    [207, 488],
    [82, 559],
    [92, 595],
    [231, 706],
    [355, 661],
    [302, 751],
    [312, 824],
    [535, 1003],
    [657, 1045],
    [860, 997],
    [1130, 726]
];

// ======================================
// GEOMETRIE KOLIZÍ
// ======================================

function pointInPolygon(x, y, polygon) {
    let inside = false;

    for (
        let i = 0, j = polygon.length - 1;
        i < polygon.length;
        j = i++
    ) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];

        const intersects =
            (yi > y) !== (yj > y) &&
            x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

        if (intersects) {
            inside = !inside;
        }
    }

    return inside;
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
            ((px - ax) * dx + (py - ay) * dy) / lengthSquared
        )
    );

    const closestX = ax + t * dx;
    const closestY = ay + t * dy;

    return Math.hypot(
        px - closestX,
        py - closestY
    );
}

// ======================================
// KOLIZE OSTROVA + STUDNY + KLÁDY
// ======================================

function isBlocked(x, y) {
    const radius = player.radius;

    if (!pointInPolygon(x, y, WALKABLE_AREA)) {
        return true;
    }

    for (let i = 0; i < WALKABLE_AREA.length; i++) {
        const [ax, ay] = WALKABLE_AREA[i];
        const [bx, by] =
            WALKABLE_AREA[(i + 1) % WALKABLE_AREA.length];

        if (
            distanceToSegment(
                x, y, ax, ay, bx, by
            ) < radius
        ) {
            return true;
        }
    }

    if (isTouchingWell(x, y)) {
        return true;
    }

    if (isTouchingLog(x, y)) {
        return true;
    }

    return false;
}

function canMoveTo(x, y) {
    return (
        x >= BOUNDS.left &&
        x <= BOUNDS.right &&
        y >= BOUNDS.top &&
        y <= BOUNDS.bottom &&
        !isBlocked(x, y)
    );
}

// ======================================
// OBJEKTY A INTERAKCE
// ======================================

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

function showMessage(title, message) {
    dialog.hidden = false;
    dialog.replaceChildren();

    const heading = document.createElement("strong");
    heading.textContent = title;

    const paragraph = document.createElement("p");
    paragraph.textContent = message;

    const button = document.createElement("button");
    button.textContent = "Zavřít [Esc]";

    button.addEventListener("click", () => {
        dialog.hidden = true;
    });

    dialog.append(
        heading,
        paragraph,
        button
    );
}

// ======================================
// KAMERA
// ======================================

function updateCamera() {
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;

    const scaledWidth =
        WORLD_WIDTH * CAMERA_ZOOM;

    const scaledHeight =
        WORLD_HEIGHT * CAMERA_ZOOM;

    let cameraX =
        viewWidth / 2 -
        player.x * CAMERA_ZOOM;

    let cameraY =
        viewHeight / 2 -
        player.y * CAMERA_ZOOM;

    cameraX = Math.min(
        0,
        Math.max(
            viewWidth - scaledWidth,
            cameraX
        )
    );

    cameraY = Math.min(
        0,
        Math.max(
            viewHeight - scaledHeight,
            cameraY
        )
    );

    scene.style.transform =
        `translate(${cameraX}px, ${cameraY}px) scale(${CAMERA_ZOOM})`;
}

// ======================================
// OVLÁDÁNÍ
// ======================================

window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();

    if (
        [
            "w", "a", "s", "d",
            "arrowup", "arrowdown",
            "arrowleft", "arrowright",
            " "
        ].includes(key)
    ) {
        event.preventDefault();
    }

    if (isDead) return;

    resumeAudio();

    keys.add(key);

    if (key === "escape") {
        dialog.hidden = true;
    }

    if (
        key === "e" &&
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
});

// ======================================
// HLAVNÍ UPDATE
// ======================================

function update() {
    const previousX = player.x;
    const previousY = player.y;

    let dx = 0;
    let dy = 0;

    if (
        keys.has("w") ||
        keys.has("arrowup")
    ) {
        dy--;
    }

    if (
        keys.has("s") ||
        keys.has("arrowdown")
    ) {
        dy++;
    }

    if (
        keys.has("a") ||
        keys.has("arrowleft")
    ) {
        dx--;
    }

    if (
        keys.has("d") ||
        keys.has("arrowright")
    ) {
        dx++;
    }

    if (dx !== 0 && dy !== 0) {
        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
    }

    // POHYB + KOLIZE

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

    // OHEŇ

    if (!isDead) {
        checkFireDamage();
    }

    // ZVUK KROKŮ

    const isMoving =
        !isDead &&
        dialog.hidden &&
        (
            player.x !== previousX ||
            player.y !== previousY
        );

    updateFootsteps(isMoving);

    // POZICE HRÁČE

    sprite.style.left = `${player.x}px`;
    sprite.style.top = `${player.y}px`;

    // VRSTVENÍ OBJEKTŮ

    updateDepthSorting();

    // KAMERA

    updateCamera();

    // INTERAKCE

    nearbyObject =
        objects.find(object =>
            Math.hypot(
                player.x - object.x,
                player.y - object.y
            ) < object.radius
        ) || null;

    // HUD

    if (isDead) {
        hint.textContent = "YOU DIED";
    } else if (!dialog.hidden) {
        hint.textContent = "ESC · Zavřít";
    } else if (nearbyObject) {
        hint.textContent =
            `${nearbyObject.name} · Stiskni E`;
    } else {
        hint.textContent =
            "WASD / šipky · Pohyb | E · Interakce";
    }

    requestAnimationFrame(update);
}

// ======================================
// START HRY
// ======================================

updateWellPosition();
updateLogPosition();

setHealth(MAX_HEALTH);
setWater(MAX_WATER);

// H2O se aktualizuje každých 100 ms
lastWaterUpdate = performance.now();
setInterval(updateWater, 100);

update();
