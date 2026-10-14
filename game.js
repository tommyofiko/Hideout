
"use strict";

// ========================================
// HIDEOUT — GAME.JS
// ========================================

// HTML ELEMENTY
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

// ========================================
// POSTAVIČKA — 8 SMĚRŮ
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
// HEALTH
// ========================================

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

// ========================================
// H2O — 20 MINUT
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
// HUNGER — 30 MINUT
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
// STUDNA — POZICE A KOLIZE
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
// HRANICE OSTROVA
// ========================================

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

// ========================================
// KOLIZE
// ========================================

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

// ========================================
// OHEŇ
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
// PŮVODNÍ ZVUKY
// ========================================

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

    const oscillator =
        audioContext.createOscillator();

    const gain =
        audioContext.createGain();

    const now = audioContext.currentTime;

    oscillator.type = type;

    oscillator.frequency.setValueAtTime(
        startFrequency,
        now
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
    playTone(
        140,
        65,
        0.09,
        0.035,
        "triangle"
    );
}

function playDamageSound() {
    playTone(
        420,
        85,
        0.22,
        0.09,
        "sawtooth"
    );
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
        const oscillator =
            audioContext.createOscillator();

        const gain =
            audioContext.createGain();

        const start =
            audioContext.currentTime +
            index * 0.22;

        const duration =
            index === notes.length - 1
                ? 0.65
                : 0.25;

        oscillator.type = "triangle";

        oscillator.frequency.setValueAtTime(
            frequency,
            start
        );

        gain.gain.setValueAtTime(
            0.06,
            start
        );

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
// KROKY
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
// INVENTÁŘ — 5 SLOTŮ
// ========================================

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

        if (item && item.image) {
            const image =
                document.createElement("img");

            image.src = item.image;
            image.alt = item.name;

            // VĚTŠÍ IKONKY
            image.style.width = "39px";
            image.style.height = "39px";
            image.style.maxWidth = "100%";
            image.style.maxHeight = "100%";
            image.style.objectFit = "contain";
            image.style.imageRendering = "pixelated";

            icon.appendChild(image);
        } else {
            icon.textContent = item
                ? (item.icon || "📦")
                : "";
        }

        slot.append(number, icon);

        slot.addEventListener("click", () => {
            if (isDead) return;

            resumeAudio();

            if (!dialog.hidden) return;

            selectedInventorySlot = index;
            renderInventory();

            const currentItem = inventoryItems[index];

            if (
                currentItem &&
                typeof currentItem.use === "function"
            ) {
                currentItem.use(index);
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
        item.use(selectedInventorySlot);
    }
}

// ========================================
// DIALOGY
// ========================================

function showMessage(title, message) {
    dialog.hidden = false;
    dialog.replaceChildren();

    const heading =
        document.createElement("strong");

    heading.textContent = title;

    const paragraph =
        document.createElement("p");

    paragraph.textContent = message;

    const button =
        document.createElement("button");

    button.type = "button";
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

function showOptions(title, message, options) {
    dialog.hidden = false;
    dialog.replaceChildren();

    const heading =
        document.createElement("strong");

    heading.textContent = title;

    const paragraph =
        document.createElement("p");

    paragraph.textContent = message;

    dialog.append(heading, paragraph);

    options.forEach(option => {
        const button =
            document.createElement("button");

        button.type = "button";
        button.textContent = option.label;

        button.addEventListener("click", () => {
            option.action();
        });

        dialog.appendChild(button);
    });

    const closeButton =
        document.createElement("button");

    closeButton.type = "button";
    closeButton.textContent = "Zavřít [Esc]";

    closeButton.addEventListener("click", () => {
        dialog.hidden = true;
    });

    dialog.appendChild(closeButton);
}

// ========================================
// PAPÍR A KELÍMKY
// ========================================

const ITEM_IMAGES = {
    paper: "papir.png",
    cup: "kelimek.png",
    fullCup: "plnykelimek.png"
};

const CUP_MAX_FILLS = 4;

// ========================================
// PAPÍR NA ZEMI — U BOUDY
// ========================================

const PAPER_POSITION = {
    x: 660,
    y: 580,
    radius: 48
};

let paperOnGround = true;

const paperElement =
    document.createElement("img");

paperElement.id = "ground-paper";
paperElement.src = ITEM_IMAGES.paper;
paperElement.alt = "List papíru";
paperElement.draggable = false;

paperElement.style.position = "absolute";
paperElement.style.left =
    `${PAPER_POSITION.x}px`;

paperElement.style.top =
    `${PAPER_POSITION.y}px`;

paperElement.style.width = "24px";
paperElement.style.height = "24px";
paperElement.style.objectFit = "contain";
paperElement.style.transform =
    "translate(-50%, -50%)";

paperElement.style.imageRendering = "pixelated";
paperElement.style.pointerEvents = "none";
paperElement.style.zIndex = "11";

scene.appendChild(paperElement);

function updatePaperVisibility() {
    paperElement.style.display =
        paperOnGround ? "block" : "none";
}

function isNearPaper() {
    if (!paperOnGround) return false;

    return Math.hypot(
        player.x - PAPER_POSITION.x,
        player.y - PAPER_POSITION.y
    ) < PAPER_POSITION.radius;
}

function createPaperItem() {
    return {
        id: "paper",
        name: "List papíru",
        image: ITEM_IMAGES.paper,

        use: index => {
            openPaperMenu(index);
        }
    };
}

function pickupPaper() {
    if (isDead || !isNearPaper()) return;

    const added =
        addInventoryItem(createPaperItem());

    if (!added) {
        showMessage(
            "Inventář je plný",
            "Nemáš místo na list papíru."
        );

        return;
    }

    paperOnGround = false;
    updatePaperVisibility();

    showMessage(
        "List papíru",
        "Sebrals ze země list papíru."
    );
}

// ========================================
// MENU PAPÍRU
// ========================================

function openPaperMenu(index) {
    const item = inventoryItems[index];

    if (
        isDead ||
        !item ||
        item.id !== "paper"
    ) {
        return;
    }

    showOptions(
        "List papíru",
        "Co chceš s papírem udělat?",
        [
            {
                label: "Prozkoumat",

                action: () => {
                    showMessage(
                        "List papíru",
                        "Obyčejný list papíru."
                    );
                }
            },
            {
                label: "Vyrobit kelímek",

                action: () => {
                    craftPaperCup(index);
                }
            }
        ]
    );
}

// ========================================
// VÝROBA KELÍMKU
// ========================================

function createCupItem(uses = 0, contents = null) {
    return {
        id: "paper_cup",

        name: contents
            ? "Papírový kelímek s vodou"
            : "Papírový kelímek",

        image: contents
            ? ITEM_IMAGES.fullCup
            : ITEM_IMAGES.cup,

        uses,
        contents,

        use: index => {
            openCupMenu(index);
        }
    };
}

function craftPaperCup(index) {
    if (isDead) return;

    const item = inventoryItems[index];

    if (!item || item.id !== "paper") return;

    inventoryItems[index] =
        createCupItem();

    renderInventory();

    showMessage(
        "Papírovej kelímek",
        "Složil jsi papír do tvaru malého kelímku."
    );
}

// ========================================
// JEZÍRKO — ŠPINAVÁ VODA
// ========================================

const POND = {
    x: 745,
    y: 820,
    radius: 45
};

function isNearPond() {
    return Math.hypot(
        player.x - POND.x,
        player.y - POND.y
    ) < POND.radius;
}

// ========================================
// STUDNA — ČISTÁ VODA
// ========================================

const WELL_INTERACTION_RADIUS = 55;

function isNearWell() {
    if (!wellElement) return false;

    const collision = getWellCollision();

    return Math.hypot(
        player.x - collision.x,
        player.y - collision.y
    ) < WELL_INTERACTION_RADIUS;
}

// ========================================
// HLEDÁNÍ KELÍMKU
// ========================================

function findPaperCup() {
    const index =
        inventoryItems.findIndex(
            item =>
                item &&
                item.id === "paper_cup"
        );

    return {
        index,
        item: index >= 0
            ? inventoryItems[index]
            : null
    };
}

// ========================================
// NABÍRÁNÍ VODY
// ========================================

function fillPaperCup(source) {
    if (isDead) return;

    if (
        source === "pond" &&
        !isNearPond()
    ) {
        showMessage(
            "Jezírko",
            "Musíš přijít blíž k jezírku."
        );

        return;
    }

    if (
        source === "well" &&
        !isNearWell()
    ) {
        showMessage(
            "Studna",
            "Musíš přijít blíž ke studni."
        );

        return;
    }

    const result = findPaperCup();

    if (!result.item) {
        showMessage(
            "Voda",
            "Nemáš do čeho nabrat vodu."
        );

        return;
    }

    if (result.item.contents) {
        showMessage(
            "Kelímek je plný",
            "Nejdřív se napij nebo vodu vylij."
        );

        return;
    }

    // Každé nabrání se počítá.
    result.item.uses++;

    // ČTVRTÉ NABRÁNÍ — ROZPAD KELÍMKU
    if (result.item.uses >= CUP_MAX_FILLS) {
        inventoryItems[result.index] = null;

        renderInventory();

        showMessage(
            "Kelímek se rozpadl",
            "Papír nasákl vodou a kelímek se ti v rukách proměnil na MR**U..."
        );

        return;
    }

    // ÚSPĚŠNÉ NABRÁNÍ
    result.item.contents = source;

    result.item.name =
        "Papírový kelímek s vodou";

    result.item.image =
        ITEM_IMAGES.fullCup;

    renderInventory();

    if (source === "well") {
        showMessage(
            "Studna",
            "Nabrals čistou vodu ze studny."
        );
    } else {
        showMessage(
            "Jezírko",
            "Nabrals vodu z jezírka. Nevypadá příliš čistě."
        );
    }
}

// ========================================
// PITÍ VODY
// ========================================

function drinkFromCup(index) {
    if (isDead) return;

    const item = inventoryItems[index];

    if (
        !item ||
        item.id !== "paper_cup" ||
        !item.contents
    ) {
        return;
    }

    const source = item.contents;
    const previousWater = water;

    if (source === "well") {
        // Studna doplní H2O na 100.
        setWater(MAX_WATER);

        if (water > 0) {
            lastDehydrationDamage = null;
        }
    } else {
        // Jezírko ubere 25 H2O.
        loseWater(25);
    }

    const difference =
        water - previousWater;

    // Kelímek zůstane, ale bude prázdný.
    item.contents = null;
    item.name = "Papírový kelímek";
    item.image = ITEM_IMAGES.cup;

    renderInventory();
    showWaterChange(difference);

    if (source === "well") {
        showMessage(
            "Čistá voda",
            "Napil ses čisté vody ze studny."
        );
    } else {
        showMessage(
            "Špinavá voda",
            "Voda z jezírka ti neudělala dobře."
        );
    }
}

// ========================================
// VYLITÍ VODY
// ========================================

function pourOutCup(index) {
    if (isDead) return;

    const item = inventoryItems[index];

    if (
        !item ||
        item.id !== "paper_cup" ||
        !item.contents
    ) {
        return;
    }

    // Vylití nemění H2O hráče.
    // Počet použití kelímku se neresetuje.
    item.contents = null;
    item.name = "Papírový kelímek";
    item.image = ITEM_IMAGES.cup;

    renderInventory();

    showMessage(
        "Vylil jsi vodu",
        "Vylil jsi vodu na zem. Kelímek je zase prázdný."
    );
}

// ========================================
// MENU KELÍMKU
// ========================================

function openCupMenu(index) {
    if (isDead) return;

    const item = inventoryItems[index];

    if (
        !item ||
        item.id !== "paper_cup"
    ) {
        return;
    }

    const options = [
        {
            label: "Prozkoumat",

            action: () => {
                const current =
                    inventoryItems[index];

                if (
                    !current ||
                    current.id !== "paper_cup"
                ) {
                    dialog.hidden = true;
                    return;
                }

                if (current.contents === "well") {
                    showMessage(
                        "Papírový kelímek",
                        "Uvnitř je čistá, studeňoučká voda ze studny."
                    );

                } else if (current.contents === "pond") {
                    showMessage(
                        "Papírový kelímek",
                        "Uvnitř je zakalená voda z jezírka."
                    );

                } else {
                    showMessage(
                        "Papírový kelímek",
                        "Prázdný kelímek složený z papíru."
                    );
                }
            }
        }
    ];

    if (item.contents) {
        options.push({
            label: "Napít se",

            action: () => {
                drinkFromCup(index);
            }
        });

        options.push({
            label: "Vylít vodu",

            action: () => {
                pourOutCup(index);
            }
        });
    }

    showOptions(
        item.name,
        item.contents
            ? "Co chceš udělat s vodou?"
            : "Prázdný papírový kelímek.",
        options
    );
}

// ========================================
// ZMĚNA H2O — BAREVNÝ TEXT
// ========================================

const waterChangeElement =
    document.createElement("div");

waterChangeElement.id = "water-change";

waterChangeElement.style.position = "fixed";
waterChangeElement.style.left = "18px";
waterChangeElement.style.bottom = "205px";
waterChangeElement.style.zIndex = "9999";

waterChangeElement.style.fontSize = "18px";
waterChangeElement.style.fontWeight = "bold";
waterChangeElement.style.fontFamily = "Consolas, monospace";

waterChangeElement.style.textShadow =
    "1px 2px 3px black";

waterChangeElement.style.pointerEvents = "none";
waterChangeElement.style.opacity = "0";
waterChangeElement.style.transition = "opacity 0.3s";

document.body.appendChild(waterChangeElement);

let waterChangeTimeout = null;

function showWaterChange(amount) {
    clearTimeout(waterChangeTimeout);

    const rounded = Math.round(amount);

    waterChangeElement.textContent =
        rounded >= 0
            ? `+${rounded} H2O`
            : `${rounded} H2O`;

    waterChangeElement.style.color =
        rounded >= 0
            ? "#45ff75"
            : "#ff5555";

    waterChangeElement.style.opacity = "1";

    waterChangeTimeout = setTimeout(() => {
        waterChangeElement.style.opacity = "0";
    }, 1800);
}

// ========================================
// INTERAKCE S JEZÍRKEM
// ========================================

function interactWithPond() {
    if (!isNearPond()) return;

    const cup = findPaperCup();

    if (!cup.item) {
        showMessage(
            "Jezírko",
            "Voda v jezírku je trochu zakalená."
        );

        return;
    }

    fillPaperCup("pond");
}

// ========================================
// INTERAKCE SE STUDNOU
// ========================================

function interactWithWell() {
    if (!isNearWell()) return;

    const cup = findPaperCup();

    if (!cup.item) {
        showMessage(
            "Studna",
            "Ve studni je čistá voda, ale nemáš ju čím nabrat!"
        );

        return;
    }

    fillPaperCup("well");
}

// ========================================
// VYHLEDÁNÍ INTERAKCE
// ========================================

function findNearbyObject() {
    if (isDead) return null;

    // 1. Papír na zemi.
    if (isNearPaper()) {
        return {
            name: "List papíru",
            hint: "List papíru · Stiskni E pro sebrání",
            action: pickupPaper
        };
    }

    // 2. Studna.
    if (isNearWell()) {
        return {
            name: "Studna",
            hint: "Studna · Stiskni E pro nabrání vody ze studny",
            action: interactWithWell
        };
    }

    // 3. Jezírko.
    if (isNearPond()) {
        return {
            name: "Jezírko",
            hint: "Jezírko · Stiskni E pro nabrání vody",
            action: interactWithPond
        };
    }

    // OPRAVA:
    // Žádné staré objects.find().
    // Proměnná objects už neexistuje.
    return null;
}

// ========================================
// KAMERA
// ========================================

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

    // ESC zavře dialog.
    if (key === "escape") {
        dialog.hidden = true;
        keys.delete(key);
        return;
    }

    // Inventář 1–5.
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

    // Interakce pouze klávesou E.
    if (
        key === "e" &&
        !event.repeat &&
        dialog.hidden
    ) {
        const target = findNearbyObject();

        if (target) {
            target.action();
        }
    }
});

window.addEventListener("keyup", event => {
    keys.delete(event.key.toLowerCase());
});

window.addEventListener("blur", () => {
    keys.clear();
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
}

// ========================================
// RESTART
// ========================================

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

    inventoryItems.fill(null);
    selectedInventorySlot = 0;

    paperOnGround = true;
    updatePaperVisibility();

    clearTimeout(waterChangeTimeout);
    waterChangeElement.style.opacity = "0";

    renderInventory();
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

// ========================================
// HLAVNÍ HERNÍ SMYČKA
// ========================================

function update() {
    const previousX = player.x;
    const previousY = player.y;

    let dx = 0;
    let dy = 0;

    // POHYB
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

    // SMĚR POSTAVIČKY
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

    // DIAGONÁLNÍ POHYB
    if (dx !== 0 && dy !== 0) {
        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
    }

    // POHYB A KOLIZE
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

    // DAMAGE Z OHNĚ
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

    updateDepthSorting();
    updateCamera();

    // INTERAKCE
    nearbyObject = findNearbyObject();

    // NÁPOVĚDA
    if (isDead) {
        hint.textContent = "YOU DIED";

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
updatePaperVisibility();

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
