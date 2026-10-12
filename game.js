
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
// ZAKÁZANÉ OBLASTI
// Souřadnice odpovídají mapě 1920 × 1080
// ======================================

const BLOCKED_AREAS = [
    // Řeka, vodopády a skalní sráz napravo.
    [
        [1730, 0],
        [1920, 0],
        [1920, 1080],
        [1080, 1080],
        [1190, 1015],
        [1320, 940],
        [1420, 850],
        [1490, 750],
        [1540, 650],
        [1580, 550],
        [1620, 450],
        [1670, 350],
        [1710, 250],
        [1740, 150],
        [1760, 70]
    ],

    // Malé jezírko na louce.
    [
        [620, 850],
        [665, 825],
        [715, 830],
        [755, 855],
        [780, 890],
        [765, 920],
        [720, 945],
        [675, 950],
        [635, 925],
        [610, 890]
    ]
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

    return BLOCKED_AREAS.some(polygon => {
        // Hráč nesmí být uvnitř zakázané oblasti.
        if (pointInPolygon(x, y, polygon)) {
            return true;
        }

        // Hráč nesmí zasahovat přes hranu polygonu.
        for (let i = 0; i < polygon.length; i++) {
            const [ax, ay] = polygon[i];
            const [bx, by] = polygon[(i + 1) % polygon.length];

            if (
                distanceToSegment(x, y, ax, ay, bx, by) < radius
            ) {
                return true;
            }
        }

        return false;
    });
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
