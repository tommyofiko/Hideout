
const scene = document.getElementById("scene");
const hint = document.getElementById("hint");
const dialog = document.getElementById("dialog");
const sprite = document.getElementById("player");

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
    x: 960,
    y: 900,
    speed: 2,
    radius: 12
};

const keys = new Set();
let nearbyObject = null;

// ======================================
// PRŮCHOZÍ OBLAST
// Souřadnice odpovídají mapě 1920 × 1080
//
// Uvnitř polygonu = hráč může chodit
// Mimo polygon = blokováno
// ======================================

const WALKABLE_AREA = [
    [1310, 591],
    [1249, 542],
    [1203, 565],
    [986, 423],
    [1084, 310],
    [1006, 265],
    [918, 334],
    [963, 359],
    [935, 418],
    [901, 390],
    [805, 451],
    [753, 441],
    [621, 505],
    [513, 439],
    [356, 414],
    [92, 562],
    [238, 695],
    [324, 643],
    [360, 651],
    [379, 677],
    [328, 702],
    [311, 759],
    [338, 794],
    [328, 822],
    [541, 994],
    [630, 1034],
    [745, 1033],
    [852, 989],
    [1125, 717]
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

function isBlocked(x, y) {
    const radius = player.radius;

    // Hráč musí být uvnitř průchozí oblasti.
    if (!pointInPolygon(x, y, WALKABLE_AREA)) {
        return true;
    }

    // Držíme hráče kousek od hranice,
    // aby část postavy nepřesahovala ven.
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

    dialog.append(heading, paragraph, button);
}

// ======================================
// KAMERA
// ======================================

function updateCamera() {
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;

    const scaledWidth = WORLD_WIDTH * CAMERA_ZOOM;
    const scaledHeight = WORLD_HEIGHT * CAMERA_ZOOM;

    let cameraX = viewWidth / 2 - player.x * CAMERA_ZOOM;
    let cameraY = viewHeight / 2 - player.y * CAMERA_ZOOM;

    cameraX = Math.min(
        0,
        Math.max(viewWidth - scaledWidth, cameraX)
    );

    cameraY = Math.min(
        0,
        Math.max(viewHeight - scaledHeight, cameraY)
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
            "arrowleft", "arrowright", " "
        ].includes(key)
    ) {
        event.preventDefault();
    }

    keys.add(key);

    if (key === "escape") {
        dialog.hidden = true;
    }

    if (key === "e" && nearbyObject && dialog.hidden) {
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
    let dx = 0;
    let dy = 0;

    if (keys.has("w") || keys.has("arrowup")) dy--;
    if (keys.has("s") || keys.has("arrowdown")) dy++;
    if (keys.has("a") || keys.has("arrowleft")) dx--;
    if (keys.has("d") || keys.has("arrowright")) dx++;

    // Stejná rychlost diagonálně i rovně.
    if (dx !== 0 && dy !== 0) {
        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
    }

    if (dialog.hidden) {
        const nextX = player.x + dx * player.speed;
        const nextY = player.y + dy * player.speed;

        // Nejdříve zkusíme pohyb v obou osách.
        if (canMoveTo(nextX, nextY)) {
            player.x = nextX;
            player.y = nextY;
        } else {
            // Pokud je cesta zablokovaná, umožníme
            // samostatný pohyb podél překážky.
            if (dx !== 0 && canMoveTo(nextX, player.y)) {
                player.x = nextX;
            }

            if (dy !== 0 && canMoveTo(player.x, nextY)) {
                player.y = nextY;
            }
        }
    }

    sprite.style.left = `${player.x}px`;
    sprite.style.top = `${player.y}px`;

    updateCamera();

    nearbyObject = objects.find(object =>
        Math.hypot(
            player.x - object.x,
            player.y - object.y
        ) < object.radius
    ) || null;

    if (!dialog.hidden) {
        hint.textContent = "ESC · Zavřít";
    } else if (nearbyObject) {
        hint.textContent = `${nearbyObject.name} · Stiskni E`;
    } else {
        hint.textContent = "WASD / šipky · Pohyb | E · Interakce";
    }

    requestAnimationFrame(update);
}

update();
