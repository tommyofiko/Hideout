
const scene = document.getElementById("scene");
const hint = document.getElementById("hint");
const dialog = document.getElementById("dialog");
const sprite = document.getElementById("player");
const healthFill = document.getElementById("health-fill");
const healthText = document.getElementById("health-text");
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

const player = {
    x: 800,
    y: 800,
    speed: 2,
    radius: 12
};

const keys = new Set();
let nearbyObject = null;


// ======================================
// OHEŇ - DAMAGE KOLIZE
// ======================================

const FIRE = {
    x: 225,
    y: 550,
    radius: 30,
    damage: 10,
    cooldown: 1000
};

let lastFireDamage = -Infinity;

function checkFireDamage() {
    if (isDead) return;

    const distance = Math.hypot(
        player.x - FIRE.x,
        player.y - FIRE.y
    );

    const now = performance.now();

    if (
        distance < FIRE.radius + player.radius &&
        now - lastFireDamage >= FIRE.cooldown
    ) {
        lastFireDamage = now;

        takeDamage(FIRE.damage);
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


// ======================================
// ZVUK KROKŮ
// ======================================

function playFootstep() {
    if (!audioContext) return;

    if (audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "square";

    const now = audioContext.currentTime;

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
// ZVUK POŠKOZENÍ OD OHNĚ
// ======================================

function playDamageSound() {
    if (!audioContext) return;

    if (audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
    }

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

    player.x = 800;
    player.y = 800;

    lastFireDamage = -Infinity;
    lastFootstep = 0;

    keys.clear();
    nearbyObject = null;

    dialog.hidden = true;
    deathScreen.hidden = true;

    setHealth(MAX_HEALTH);

    sprite.style.left = `${player.x}px`;
    sprite.style.top = `${player.y}px`;

    updateCamera();
}

restartButton.addEventListener("click", restartGame);


// ======================================
// PRŮCHOZÍ OBLAST
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

    return Math.hypot(px - closestX, py - closestY);
}


// ======================================
// KOLIZE
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
                x,
                y,
                ax,
                ay,
                bx,
                by
            ) < radius
        ) {
            return true;
        }
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

    // Stejná rychlost diagonálně i rovně.
    if (dx !== 0 && dy !== 0) {
        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
    }

    if (dialog.hidden && !isDead) {
        const nextX =
            player.x + dx * player.speed;

        const nextY =
            player.y + dy * player.speed;

        if (canMoveTo(nextX, nextY)) {
            player.x = nextX;
            player.y = nextY;
        } else {
            // Pohyb podél překážky
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


    // ==================================
    // OHEŇ - DAMAGE
    // ==================================

    if (!isDead) {
        checkFireDamage();
    }


    // ==================================
    // RETRO FOOTSTEPS
    // ==================================

    const isMoving =
        !isDead &&
        dialog.hidden &&
        (
            player.x !== previousX ||
            player.y !== previousY
        );

    updateFootsteps(isMoving);


    // ==================================
    // PLAYER
    // ==================================

    sprite.style.left =
        `${player.x}px`;

    sprite.style.top =
        `${player.y}px`;


    // ==================================
    // CAMERA
    // ==================================

    updateCamera();


    // ==================================
    // INTERAKCE
    // ==================================

    nearbyObject =
        objects.find(object =>
            Math.hypot(
                player.x - object.x,
                player.y - object.y
            ) < object.radius
        ) || null;


    // ==================================
    // HUD
    // ==================================

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

setHealth(MAX_HEALTH);
update();
