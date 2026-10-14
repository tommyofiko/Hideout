
"use strict";

// ======================================
// HIDEOUT - GAME.JS
// ======================================

// ELEMENTY

const scene = document.getElementById("scene");
const hint = document.getElementById("hint");
const dialog = document.getElementById("dialog");
const sprite = document.getElementById("player");

const wellElement = document.getElementById("well");
const logElement = document.getElementById("log");
const fireElement = document.getElementById("fire");

const healthFill = document.getElementById("health-fill");
const healthText = document.getElementById("health-text");

const waterFill = document.getElementById("water-fill");
const waterText = document.getElementById("water-text");

const hungerFill = document.getElementById("hunger-fill");
const hungerText = document.getElementById("hunger-text");

const deathScreen = document.getElementById("death-screen");
const restartButton = document.getElementById("restart-button");

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
// POSTAVIČKA - 6 SMĚRŮ
// ======================================

// S       = dolů
// A       = doleva
// W       = nahoru
// D       = doprava
// S + D   = diagonálně dolů doprava
// S + A   = diagonálně dolů doleva

const PLAYER_IMAGES = {
    down: "idle11.png",
    left: "idle12.png",
    up: "idle13.png",
    right: "idle14.png",

    downRight: "idle1.png",
    downLeft: "idle2.png"
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

// ======================================
// HEALTH
// ======================================

const MAX_HEALTH = 100;

let health = MAX_HEALTH;
let isDead = false;

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

function takeDamage(amount) {
    if (isDead) return;
    setHealth(health - amount);
}

function healPlayer(amount) {
    if (isDead) return;
    setHealth(health + amount);
}

// ======================================
// H2O - 20 MINUT
// ======================================

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

// ======================================
// HUNGER - 30 MINUT
// ======================================

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
    const footRadius = 5;

    const dx =
        (x - collision.x) /
        (collision.rx + footRadius);

    const dy =
        (y + 8 - collision.y) /
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

    return distanceToSegment(
        x,
        y + 8,
        LOG.ax,
        LOG.ay,
        LOG.bx,
        LOG.by
    ) < LOG.radius + 5;
}

// ======================================
// VRSTVENÍ OBJEKTŮ
// ======================================

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

// ======================================
// HRANICE OSTROVA
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
// GEOMETRIE
// ======================================

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

// ======================================
// KOLIZE
// ======================================

function isBlocked(x, y) {
    if (!pointInPolygon(x, y, WALKABLE_AREA)) {
        return true;
    }

    for (
        let i = 0;
        i < WALKABLE_AREA.length;
        i++
    ) {
        const [ax, ay] = WALKABLE_AREA[i];

        const [bx, by] =
            WALKABLE_AREA[
                (i + 1) % WALKABLE_AREA.length
            ];

        if (
            distanceToSegment(
                x,
                y,
                ax,
                ay,
                bx,
                by
            ) < player.radius
        ) {
            return true;
        }
    }

    return (
        isTouchingWell(x, y) ||
        isTouchingLog(x, y)
    );
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
// OHEŇ
// ======================================

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

// ======================================
// ZVUKY
// ======================================

const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext;

const audioContext = AudioContextClass
    ? new AudioContextClass()
    : null;

function resumeAudio() {
    if (
        audioContext &&
        audioContext.state === "suspended"
    ) {
        audioContext.resume().catch(() => {});
    }
}

function playTone(
    frequency,
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

    const oscillator =
        audioContext.createOscillator();

    const gain =
        audioContext.createGain();

    const now = audioContext.currentTime;

    oscillator.type = type;

    oscillator.frequency.setValueAtTime(
        frequency,
        now
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
    playTone(95, 0.055, 0.025, "triangle");
}

function playDamageSound() {
    playTone(150, 0.18, 0.08, "sawtooth");
}

function playDeathSound() {
    playTone(85, 0.45, 0.09, "sawtooth");
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
        const oscillator =
            audioContext.createOscillator();

        const gain =
            audioContext.createGain();

        const start =
            audioContext.currentTime +
            index * 0.22;

        oscillator.type = "triangle";
        oscillator.frequency.value = frequency;

        gain.gain.setValueAtTime(
            0.06,
            start
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            start + 0.25
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start(start);
        oscillator.stop(start + 0.25);
    });
}

// ======================================
// KROKY
// ======================================

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

// ======================================
// INTERAKCE
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
// INVENTÁŘ - 5 SLOTŮ
// ======================================

const INVENTORY_SIZE = 5;

const inventoryItems =
    Array(INVENTORY_SIZE).fill(null);

let selectedInventorySlot = 0;

let inventoryElement =
    document.getElementById("inventory");

if (!inventoryElement) {
    inventoryElement =
        document.createElement("div");

    inventoryElement.id = "inventory";

    document
        .getElementById("game")
        .appendChild(inventoryElement);
}

function renderInventory() {
    inventoryElement.replaceChildren();

    inventoryItems.forEach((item, index) => {
        const slot =
            document.createElement("button");

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

        const number =
            document.createElement("span");

        number.className = "slot-number";
        number.textContent = String(index + 1);

        const icon =
            document.createElement("span");

        icon.className = "slot-item";

        icon.textContent = item
            ? (item.icon || "📦")
            : "";

        slot.append(number, icon);

        slot.addEventListener("click", () => {
            if (isDead) return;

            resumeAudio();

            if (
                selectedInventorySlot === index &&
                item &&
                typeof item.use === "function"
            ) {
                item.use();
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

    const emptyIndex =
        inventoryItems.findIndex(
            slot => slot === null
        );

    if (emptyIndex === -1) {
        return false;
    }

    inventoryItems[emptyIndex] = {
        ...item
    };

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

    if (
        item &&
        typeof item.use === "function"
    ) {
        item.use();
    }
}

// ======================================
// KAMERA
// ======================================

function updateCamera() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const scaledWidth =
        WORLD_WIDTH * CAMERA_ZOOM;

    const scaledHeight =
        WORLD_HEIGHT * CAMERA_ZOOM;

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

    resumeAudio();

    // INVENTÁŘ 1-5

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
// SMRT
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
// RESTART
// ======================================

function restartGame() {
    isDead = false;

    player.x = PLAYER_START.x;
    player.y = PLAYER_START.y;

    keys.clear();
    nearbyObject = null;

    lastFireDamage = -Infinity;
    lastFootstep = 0;

    dialog.hidden = true;
    deathScreen.hidden = true;

    setHealth(MAX_HEALTH);

    setWater(MAX_WATER);
    lastWaterUpdate = performance.now();
    lastDehydrationDamage = null;

    setHunger(MAX_HUNGER);
    lastHungerUpdate = performance.now();
    lastStarvationDamage = null;

    // RESET INVENTÁŘE

    inventoryItems.fill(null);
    selectedInventorySlot = 0;
    renderInventory();

    // RESET POSTAVIČKY

    resetPlayerAppearance();

    sprite.style.left = `${player.x}px`;
    sprite.style.top = `${player.y}px`;

    updateDepthSorting();
    updateCamera();
}

restartButton.addEventListener(
    "click",
    restartGame
);

// ======================================
// HLAVNÍ HERNÍ SMYČKA
// ======================================

function update() {
    const previousX = player.x;
    const previousY = player.y;

    let dx = 0;
    let dy = 0;

    // NAHORU

    if (
        keys.has("w") ||
        keys.has("arrowup")
    ) {
        dy--;
    }

    // DOLŮ

    if (
        keys.has("s") ||
        keys.has("arrowdown")
    ) {
        dy++;
    }

    // DOLEVA

    if (
        keys.has("a") ||
        keys.has("arrowleft")
    ) {
        dx--;
    }

    // DOPRAVA

    if (
        keys.has("d") ||
        keys.has("arrowright")
    ) {
        dx++;
    }

    // ======================================
    // OTÁČENÍ POSTAVIČKY - 6 SMĚRŮ
    // ======================================

    if (!isDead && dialog.hidden) {

        // S + D = DOLŮ DOPRAVA
        if (dy > 0 && dx > 0) {
            setPlayerDirection("downRight");

        // S + A = DOLŮ DOLEVA
        } else if (dy > 0 && dx < 0) {
            setPlayerDirection("downLeft");

        // S = DOLŮ
        } else if (dy > 0) {
            setPlayerDirection("down");

        // W = NAHORU
        } else if (dy < 0) {
            setPlayerDirection("up");

        // D = DOPRAVA
        } else if (dx > 0) {
            setPlayerDirection("right");

        // A = DOLEVA
        } else if (dx < 0) {
            setPlayerDirection("left");
        }
    }

    // ======================================
    // DIAGONÁLNÍ POHYB
    // ======================================

    // Stejná rychlost jako při chůzi rovně

    if (dx !== 0 && dy !== 0) {
        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
    }

    // ======================================
    // POHYB A KOLIZE
    // ======================================

    if (dialog.hidden && !isDead) {
        const nextX =
            player.x + dx * player.speed;

        const nextY =
            player.y + dy * player.speed;

        if (canMoveTo(nextX, nextY)) {
            player.x = nextX;
            player.y = nextY;

        } else {

            // KLOUZÁNÍ PODÉL PŘEKÁŽEK

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

    // ======================================
    // OHEŇ A DAMAGE
    // ======================================

    if (!isDead) {
        checkFireDamage();
    }

    // ======================================
    // ZVUK KROKŮ
    // ======================================

    const isMoving =
        !isDead &&
        dialog.hidden &&
        (
            player.x !== previousX ||
            player.y !== previousY
        );

    updateFootsteps(isMoving);

    // ======================================
    // POZICE POSTAVIČKY
    // ======================================

    sprite.style.left = `${player.x}px`;
    sprite.style.top = `${player.y}px`;

    updateDepthSorting();
    updateCamera();

    // ======================================
    // INTERAKCE
    // ======================================

    nearbyObject =
        objects.find(object => {
            return Math.hypot(
                player.x - object.x,
                player.y - object.y
            ) < object.radius;
        }) || null;

    // ======================================
    // NÁPOVĚDA
    // ======================================

    if (isDead) {
        hint.textContent = "YOU DIED";

    } else if (!dialog.hidden) {
        hint.textContent = "ESC · Zavřít";

    } else if (nearbyObject) {
        hint.textContent =
            `${nearbyObject.name} · Stiskni E`;

    } else {
        hint.textContent =
            "WASD / šipky · Pohyb | E · Interakce | 1–5 · Inventář";
    }

    requestAnimationFrame(update);
}

// ======================================
// START HRY
// ======================================

updateWellPosition();
updateLogPosition();

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
