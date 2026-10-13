const scene = document.getElementById("scene");
const hint = document.getElementById("hint");
const dialog = document.getElementById("dialog");
const sprite = document.getElementById("player");

const WORLD_WIDTH = 1920;
const WORLD_HEIGHT = 1080;
const CAMERA_ZOOM = 2.8;

const BOUNDS = {
    left: 0,
    right: WORLD_WIDTH,
    top: 0,
    bottom: WORLD_HEIGHT
};

const player = {
    x: 900,
    y: 600,
    speed: 2,
    radius: 12
};

const keys = new Set();
let nearbyObject = null;

// ========================================
// HRANICE OSTROVA
// Polygon vymezuje travnatou horní plochu.
// Souřadnice odpovídají obrázku 1920 × 1080.
// ========================================

const ISLAND_BOUNDARY = [
    [0, 510],
    [55, 470],
    [135, 410],
    [225, 375],
    [330, 340],
    [420, 310],
    [510, 280],
    [600, 245],
    [700, 205],
    [800, 175],
    [900, 175],
    [1000, 200],
    [1090, 245],
    [1170, 295],
    [1240, 350],
    [1300, 405],
    [1370, 435],
    [1360, 485],
    [1325, 535],
    [1290, 590],
    [1250, 645],
    [1210, 700],
    [1160, 750],
    [1100, 790],
    [1020, 825],
    [930, 855],
    [830, 885],
    [730, 910],
    [630, 920],
    [530, 905],
    [430, 880],
    [330, 845],
    [240, 805],
    [160, 760],
    [90, 705],
    [35, 640],
    [0, 590]
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

function distanceToPolygonEdge(x, y, polygon) {
    let minimumDistance = Infinity;

    for (let i = 0; i < polygon.length; i++) {
        const [ax, ay] = polygon[i];
        const [bx, by] = polygon[(i + 1) % polygon.length];

        const distance = distanceToSegment(
            x, y, ax, ay, bx, by
        );

        minimumDistance = Math.min(
            minimumDistance,
            distance
        );
    }

    return minimumDistance;
}

// ========================================
// KOLIZE S OSTROVEM
// ========================================

function isBlocked(x, y) {
    const radius = player.radius;

    // Hráč musí být uvnitř travnatého ostrova.
    if (!pointInPolygon(x, y, ISLAND_BOUNDARY)) {
        return true;
    }

    // Hráč se nesmí přiblížit příliš blízko
    // k hraně útesu, aby nespadl do řeky.
    if (
        distanceToPolygonEdge(
            x, y, ISLAND_BOUNDARY
        ) < radius
    ) {
        return true;
    }

    // Jezírko záměrně nemá kolizi.
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

// ========================================
// OBJEKTY A INTERAKCE
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

// ========================================
// KAMERA
// ========================================

function updateCamera() {
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;

    const scaledWidth = WORLD_WIDTH * CAMERA_ZOOM;
    const scaledHeight = WORLD_HEIGHT * CAMERA_ZOOM;

    let cameraX =
        viewWidth / 2 - player.x * CAMERA_ZOOM;

    let cameraY =
        viewHeight / 2 - player.y * CAMERA_ZOOM;

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

// ========================================
// OVLÁDÁNÍ
// ========================================

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

// ========================================
// HLAVNÍ UPDATE
// ========================================

function update() {
    let dx = 0;
    let dy = 0;

    if (keys.has("w") || keys.has("arrowup")) dy--;
    if (keys.has("s") || keys.has("arrowdown")) dy++;
    if (keys.has("a") || keys.has("arrowleft")) dx--;
    if (keys.has("d") || keys.has("arrowright")) dx++;

    // Normalizace diagonálního pohybu.
    if (dx !== 0 && dy !== 0) {
        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
    }

    if (dialog.hidden) {
        const nextX = player.x + dx * player.speed;
        const nextY = player.y + dy * player.speed;

        // Zkusíme pohyb v obou směrech.
        if (canMoveTo(nextX, nextY)) {
            player.x = nextX;
            player.y = nextY;
        } else {
            // Umožníme klouzání podél hranice ostrova.
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
        hint.textContent =
            `${nearbyObject.name} · Stiskni E`;
    } else {
        hint.textContent =
            "WASD / šipky · Pohyb | E · Interakce";
    }

    requestAnimationFrame(update);
}

update();
 takto by to melo byt
