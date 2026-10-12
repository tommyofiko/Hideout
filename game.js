
const scene = document.getElementById("scene");
const hint = document.getElementById("hint");
const dialog = document.getElementById("dialog");
const sprite = document.getElementById("player");

const WORLD_WIDTH = 1920;
const WORLD_HEIGHT = 1080;


const BOUNDS = {
    left: 40,
    right: 1880,
    top: 40,
    bottom: 1040
};

// Zakázané oblasti podle house.png.
// Souřadnice odpovídají mapě 1920 × 1080.
const BLOCKED_AREAS = [
    // Hlavní potok, vodopády a skalní sráz napravo
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

    // Malé jezírko dole na louce
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

        if (intersects) inside = !inside;
    }

    return inside;
}

function isBlocked(x, y) {
    // Kontrolujeme i okolí postavičky, nejen její střed.
    const radius = 12;
    const checks = [
        [x, y],
        [x - radius, y],
        [x + radius, y],
        [x, y - radius],
        [x, y + radius]
    ];

    return BLOCKED_AREAS.some(polygon =>
        checks.some(([px, py]) =>
            pointInPolygon(px, py, polygon)
        )
    );
}


const CAMERA_ZOOM = 2.8;

const player = {
    x: 960,
    y: 900,
    speed: 2
};

const keys = new Set();
let nearbyObject = null;

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

function updateCamera() {
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;

    const scaledWidth = WORLD_WIDTH * CAMERA_ZOOM;
    const scaledHeight = WORLD_HEIGHT * CAMERA_ZOOM;

    let cameraX = viewWidth / 2 - player.x * CAMERA_ZOOM;
    let cameraY = viewHeight / 2 - player.y * CAMERA_ZOOM;

    cameraX = Math.min(0, Math.max(viewWidth - scaledWidth, cameraX));
    cameraY = Math.min(0, Math.max(viewHeight - scaledHeight, cameraY));

    scene.style.transform =
        `translate(${cameraX}px, ${cameraY}px) scale(${CAMERA_ZOOM})`;
}

window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    if (
        ["w", "a", "s", "d", "arrowup", "arrowdown",
         "arrowleft", "arrowright", " "].includes(key)
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

window.addEventListener("keyup", (event) => {
    keys.delete(event.key.toLowerCase());
});

window.addEventListener("blur", () => {
    keys.clear();
});

function update() {
    let dx = 0;
    let dy = 0;

    if (keys.has("w") || keys.has("arrowup")) dy--;
    if (keys.has("s") || keys.has("arrowdown")) dy++;
    if (keys.has("a") || keys.has("arrowleft")) dx--;
    if (keys.has("d") || keys.has("arrowright")) dx++;

    if (dx && dy) {
        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
    }

    
if (dialog.hidden) {
    const nextX = player.x + dx * player.speed;
    const nextY = player.y + dy * player.speed;

    // Pohyb oběma směry, pokud je místo volné.
    if (!isBlocked(nextX, nextY)) {
        player.x = nextX;
        player.y = nextY;
    } else {
        // Když narazí do břehu, může se pohybovat podél něj.
        if (!isBlocked(nextX, player.y)) {
            player.x = nextX;
        }

        if (!isBlocked(player.x, nextY)) {
            player.y = nextY;
        }
    }
}


    
    player.x = Math.max(BOUNDS.left, Math.min(BOUNDS.right, player.x));
    player.y = Math.max(BOUNDS.top, Math.min(BOUNDS.bottom, player.y));
    

    sprite.style.left = `${player.x}px`;
    sprite.style.top = `${player.y}px`;

    updateCamera();

    nearbyObject = objects.find((object) =>
        Math.hypot(player.x - object.x, player.y - object.y)
        < object.radius
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
