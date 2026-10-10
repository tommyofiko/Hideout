
const scene = document.getElementById("scene");
const status = document.getElementById("status");
const hint = document.getElementById("hint");
const dialog = document.getElementById("dialog");
const sprite = document.getElementById("player");

const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 540;

const player = {
    x: 480,
    y: 450,
    speed: 3
};

const keys = new Set();
let nearbyObject = null;

const objects = [
    {
        name: "Vchod do domu",
        x: 480,
        y: 290,
        radius: 42,
        action: () => {
            showMessage(
                "Vítej doma.",
                "Interiér teprve postavíme. Tohle místo bude růst podle tebe."
            );
        }
    },
    {
        name: "Starý strom",
        x: 180,
        y: 350,
        radius: 35,
        action: () => {
            showMessage(
                "Pod stromem",
                "Kořeny nadzvedávají staré kameny. Jeden z nich vypadá, že jde odsunout."
            );
        }
    }
];

function resizeScene() {
    const scale = Math.max(
        window.innerWidth / WORLD_WIDTH,
        window.innerHeight / WORLD_HEIGHT
    );

    scene.style.setProperty("--scene-scale", scale);
}

window.addEventListener("resize", resizeScene);
resizeScene();

function showMessage(title, text) {
    dialog.hidden = false;

    dialog.replaceChildren();

    const heading = document.createElement("strong");
    heading.textContent = title;

    const paragraph = document.createElement("p");
    paragraph.textContent = text;

    const button = document.createElement("button");
    button.id = "close-dialog";
    button.textContent = "Zavřít [Esc]";

    button.addEventListener("click", () => {
        dialog.hidden = true;
    });

    dialog.append(heading, paragraph, button);
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

    if (keys.has("w") || keys.has("arrowup")) dy -= 1;
    if (keys.has("s") || keys.has("arrowdown")) dy += 1;
    if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
    if (keys.has("d") || keys.has("arrowright")) dx += 1;

    if (dx !== 0 && dy !== 0) {
        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
    }

    if (dialog.hidden) {
        player.x += dx * player.speed;
        player.y += dy * player.speed;
    }

    player.x = Math.max(12, Math.min(WORLD_WIDTH - 12, player.x));
    player.y = Math.max(12, Math.min(WORLD_HEIGHT - 12, player.y));

    sprite.style.left = `${player.x}px`;
    sprite.style.top = `${player.y}px`;

    nearbyObject = objects.find((object) => {
        const distance = Math.hypot(
            player.x - object.x,
            player.y - object.y
        );

        return distance < object.radius;
    }) || null;

    if (!dialog.hidden) {
        hint.textContent = "ESC · Zavřít";
    } else if (nearbyObject) {
        hint.textContent = `${nearbyObject.name} · Stiskni E`;
    } else {
        hint.textContent = "WASD / šipky · Pohyb   |   E · Interakce";
    }

    requestAnimationFrame(update);
}

update();
