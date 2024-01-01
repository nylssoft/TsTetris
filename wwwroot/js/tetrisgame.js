import Controls from "./controls.js";
import { LBlock, TBlock, IBlock, SBlock, ZBlock, OBlock, JBlock, Playground } from "./tetristypes.js";
var tetris = (() => {
    let canvas;
    let scoreDiv;
    let levelDiv;
    let linesDiv;
    let gameOverDiv;
    let newGameButton;
    let canvasNextBlock;
    // --- state
    let block;
    let nextBlock;
    let blockMoveDownCount;
    let isPaused;
    let playground;
    let score;
    let lines;
    let level;
    let state;
    let blockTouchY;
    let speed;
    let clearPoints;
    let moveDownFrameCount;
    let lastMoveDown;
    let keyPressedCount;
    let keyPressedMax;
    let keyPressed;
    let dirtyBorder;
    let dirtyPlayground;
    let dirtyBlock;
    let dirtyNextBlock;
    let pixelPerField;
    let borderWidth;
    let colorMap;
    const increaseLevel = () => {
        level += 1;
        levelDiv.textContent = `Level ${level}`;
    };
    // --- drawing canvas
    const drawRect = (ctx, x, y, c) => {
        ctx.fillStyle = colorMap.get(c).center;
        ctx.beginPath();
        ctx.fillRect(x + borderWidth, y + borderWidth, pixelPerField - borderWidth * 2, pixelPerField - borderWidth);
        const colorEntry = colorMap.get(c);
        ctx.fillStyle = colorEntry.top;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + borderWidth, y + borderWidth);
        ctx.lineTo(x + pixelPerField - borderWidth, y + borderWidth);
        ctx.lineTo(x + pixelPerField, y);
        ctx.fill();
        ctx.fillStyle = colorEntry.bottom;
        ctx.beginPath();
        ctx.moveTo(x, y + pixelPerField);
        ctx.lineTo(x + borderWidth, y + pixelPerField - borderWidth);
        ctx.lineTo(x + pixelPerField - borderWidth, y + pixelPerField - borderWidth);
        ctx.lineTo(x + pixelPerField, y + pixelPerField);
        ctx.fill();
        ctx.fillStyle = colorEntry.leftright;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + borderWidth, y + borderWidth);
        ctx.lineTo(x + borderWidth, y + pixelPerField - borderWidth);
        ctx.lineTo(x, y + pixelPerField);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + pixelPerField, y);
        ctx.lineTo(x + pixelPerField - borderWidth, y + borderWidth);
        ctx.lineTo(x + pixelPerField - borderWidth, y + pixelPerField - borderWidth);
        ctx.lineTo(x + pixelPerField, y + pixelPerField);
        ctx.fill();
    };
    const drawNextBlock = (ctx) => {
        const nextTetrisBlock = nextBlock;
        if (nextTetrisBlock) {
            const offx = pixelPerField;
            const offy = offx;
            const points = nextTetrisBlock.getRelativePoints(nextTetrisBlock.orientation);
            points.forEach(p => {
                let x = offx + (nextTetrisBlock.x + p.x) * pixelPerField;
                let y = offy + (nextTetrisBlock.y + p.y) * pixelPerField;
                drawRect(ctx, x, y, nextTetrisBlock.color);
            });
        }
    };
    const drawBlock = (ctx) => {
        clearPoints.forEach(p => {
            ctx.clearRect(p.x, p.y, pixelPerField, pixelPerField);
        });
        clearPoints = [];
        const offx = pixelPerField;
        const offy = offx;
        const tetrisBlock = block;
        if (tetrisBlock) {
            const points = tetrisBlock.getRelativePoints(tetrisBlock.orientation);
            points.forEach(p => {
                let x = offx + (tetrisBlock.x + p.x) * pixelPerField;
                let y = offy + (tetrisBlock.y + p.y) * pixelPerField;
                drawRect(ctx, x, y, tetrisBlock.color);
                clearPoints.push({ "x": x, "y": y });
            });
        }
    };
    const drawBorder = (ctx) => {
        for (let y = 0; y <= pixelPerField * (playground.height + 1); y += pixelPerField) {
            drawRect(ctx, 0, y, "BORDER");
            drawRect(ctx, pixelPerField * (playground.width + 1), y, "BORDER");
        }
        for (let x = 1; x < pixelPerField * (playground.width + 1); x += pixelPerField) {
            drawRect(ctx, x, 0, "BORDER");
            drawRect(ctx, x, pixelPerField * (playground.height + 1), "BORDER");
        }
    };
    const drawPlayground = (ctx) => {
        const offx = pixelPerField;
        const offy = offx;
        ctx.clearRect(offx, offy, playground.width * pixelPerField, playground.height * pixelPerField);
        for (let y = 0; y < playground.height; y++) {
            for (let x = 0; x < playground.width; x++) {
                let c = playground.getColor(x, y);
                if (c != "EMPTY") {
                    drawRect(ctx, offx + x * pixelPerField, offy + y * pixelPerField, c);
                }
            }
        }
    };
    const moveDown = () => {
        const tetrisBlock = block;
        if (!tetrisBlock) {
            return;
        }
        if (tetrisBlock.moveDown(playground)) {
            dirtyBlock = true;
            return;
        }
        if (state == "SOFTDROP") {
            moveDownFrameCount++;
            if (moveDownFrameCount < speed[Math.min(29, level)]) {
                return;
            }
            moveDownFrameCount = 0;
        }
        if (!lastMoveDown) {
            lastMoveDown = true;
            return;
        }
        lastMoveDown = false;
        keyPressed = undefined;
        tetrisBlock.stop(playground);
        block = undefined;
        clearPoints = [];
        dirtyPlayground = true;
        let scores = [40, 100, 300, 1200];
        let fullRows = playground.clearFullRows();
        if (fullRows > 0) {
            score += scores[fullRows - 1] * (level + 1);
            lines += fullRows;
            if (lines >= (level + 1) * 10) {
                increaseLevel();
            }
        }
        scoreDiv.textContent = `Score: ${score}`;
        linesDiv.textContent = `Lines: ${lines}`;
        if (playground.hasDropRows()) {
            state = "DROPONEROW";
        }
        else {
            placeNewBlock();
        }
    };
    const draw = () => {
        const tetrisBlock = block;
        // game logic
        if (isPaused) {
            window.requestAnimationFrame(draw);
            return;
        }
        if (state == "NEWBLOCK") {
            placeNewBlock();
        }
        else if (state == "SOFTDROP") {
            if (keyPressed && keyPressed != "ArrowDown") {
                state = "MOVEDOWN";
                if (keyPressed != "ArrowLeft" && keyPressed != "ArrowRight") {
                    keyPressed = undefined;
                }
                moveDownFrameCount = 0;
            }
            else {
                moveDown();
            }
        }
        else if (state == "DROPONEROW") {
            if (!playground.dropOneRow()) {
                placeNewBlock();
            }
            else {
                dirtyPlayground = true;
            }
        }
        else if (state == "MOVEDOWN" && tetrisBlock) {
            let speedcnt = speed[Math.min(29, level)];
            if (blockMoveDownCount < 3) {
                speedcnt = speed[Math.min(5, level)];
            }
            let skipMoveDown = false;
            if (keyPressed) {
                keyPressedCount++;
                if (keyPressedCount >= keyPressedMax) {
                    if (keyPressed === "ArrowLeft") {
                        if (tetrisBlock.moveLeft(playground)) {
                            dirtyBlock = true;
                            if (keyPressedMax > 16) {
                                keyPressedMax = 16;
                            }
                            else {
                                keyPressedMax = 6;
                            }
                            keyPressedCount = 0;
                            skipMoveDown = true;
                        }
                    }
                    else if (keyPressed === "ArrowRight") {
                        if (tetrisBlock.moveRight(playground)) {
                            dirtyBlock = true;
                            if (keyPressedMax > 16) {
                                keyPressedMax = 16;
                            }
                            else {
                                keyPressedMax = 6;
                            }
                            keyPressedCount = 0;
                            skipMoveDown = true;
                        }
                    }
                }
                if (keyPressed === "ArrowDown" || keyPressed === " ") {
                    state = "SOFTDROP";
                    keyPressed = undefined;
                    skipMoveDown = true;
                }
                else if (keyPressed === "ArrowUp" || keyPressed === "a") {
                    if (tetrisBlock.rotateRight(playground)) {
                        dirtyBlock = true;
                    }
                    keyPressed = undefined;
                    skipMoveDown = true;
                }
            }
            if (!skipMoveDown) {
                moveDownFrameCount++;
                if (moveDownFrameCount >= speedcnt) {
                    moveDownFrameCount = 0;
                    moveDown();
                    blockMoveDownCount++;
                }
            }
        }
        // drawing
        const ctx = canvas.getContext("2d");
        if (dirtyBorder) {
            drawBorder(ctx);
            dirtyBorder = false;
        }
        if (dirtyPlayground && playground) {
            drawPlayground(ctx);
            dirtyPlayground = false;
        }
        if (dirtyBlock && block) {
            drawBlock(ctx);
            dirtyBlock = false;
        }
        if (dirtyNextBlock && nextBlock) {
            let ctxnext = canvasNextBlock.getContext("2d");
            ctxnext.clearRect(0, 0, canvas.width, canvas.height);
            drawNextBlock(ctxnext);
            dirtyNextBlock = false;
        }
        window.requestAnimationFrame(draw);
    };
    // --- block methods
    const createNewBlock = () => {
        let idx = Math.floor(Math.random() * 7);
        switch (idx) {
            case 0:
                return new LBlock();
            case 1:
                return new JBlock();
            case 2:
                return new IBlock();
            case 3:
                return new TBlock();
            case 4:
                return new ZBlock();
            case 5:
                return new SBlock();
            default:
                return new OBlock();
        }
    };
    const placeNewBlock = () => {
        block = undefined;
        let newBlock;
        clearPoints = [];
        if (nextBlock) {
            newBlock = nextBlock;
            nextBlock = createNewBlock();
        }
        else {
            newBlock = createNewBlock();
            nextBlock = createNewBlock();
        }
        if (newBlock.placeFirstRow(playground)) {
            block = newBlock;
            state = "MOVEDOWN";
            moveDownFrameCount = 0;
            keyPressedCount = 0;
            dirtyBlock = true;
            dirtyNextBlock = true;
            blockMoveDownCount = 0;
        }
        else {
            gameOverDiv.textContent = "GAME OVER";
            gameOverDiv.style.visibility = "visible";
            newGameButton.style.visibility = "visible";
            state = "GAMEOVER";
        }
    };
    // --- rendering HTML elements
    const createImage = (parent, url, size, action, title) => {
        const img = Controls.create(parent, "img");
        if (title) {
            img.title = title;
        }
        img.src = url;
        img.height = size;
        img.width = size;
        img.addEventListener("mousedown", e => {
            e.preventDefault();
            keyPressed = action;
            keyPressedMax = 100;
            keyPressedCount = keyPressedMax;
        });
        img.addEventListener("mouseup", e => {
            e.preventDefault();
            keyPressed = undefined;
        });
        img.addEventListener("touchstart", e => {
            e.preventDefault();
            keyPressed = action;
            keyPressedMax = 100;
            keyPressedCount = keyPressedMax;
        });
        img.addEventListener("touchend", e => {
            e.preventDefault();
            keyPressed = undefined;
        });
        img.addEventListener("touchcancel", e => {
            e.preventDefault();
            keyPressed = undefined;
        });
    };
    const onCanvasTouchStart = (e) => {
        e.preventDefault();
        const canvas = document.querySelector(".playground");
        const touches = e.changedTouches;
        const tetrisBlock = block;
        if (touches.length === 1 && state != "GAMEOVER" && tetrisBlock) {
            const touch = touches[0];
            const rect = canvas.getBoundingClientRect();
            const tx = touch.clientX - rect.x;
            const ty = touch.clientY - rect.y;
            const offx = pixelPerField;
            const offy = offx;
            const points = tetrisBlock.getRelativePoints(tetrisBlock.orientation);
            let pminx = Number.MAX_SAFE_INTEGER, pminy = Number.MAX_SAFE_INTEGER, pmaxx = 0, pmaxy = 0;
            points.forEach(p => {
                const x = offx + (tetrisBlock.x + p.x) * pixelPerField;
                const y = offy + (tetrisBlock.y + p.y) * pixelPerField;
                pminx = Math.min(x, pminx);
                pmaxx = Math.max(x, pmaxx);
                pminy = Math.min(y, pminy);
                pmaxy = Math.max(y, pmaxy);
            });
            keyPressed = undefined;
            blockTouchY = undefined;
            if (tx >= pminx - pixelPerField && tx <= pmaxx + 2 * pixelPerField &&
                ty >= pminy - pixelPerField && ty <= pmaxy + 2 * pixelPerField) {
                blockTouchY = touch.clientY;
            }
            else if (tx < pminx) {
                keyPressed = "ArrowLeft";
            }
            else if (tx > pmaxx + pixelPerField) {
                keyPressed = "ArrowRight";
            }
            if (keyPressed) {
                keyPressedMax = 100;
                keyPressedCount = keyPressedMax;
            }
        }
    };
    const onCanvasTouchEnd = (e) => {
        e.preventDefault();
        keyPressed = undefined;
        const touches = e.changedTouches;
        if (blockTouchY && blockTouchY > 0 && touches.length === 1 && state != "GAMEOVER") {
            const touch = touches[0];
            const diff = touch.clientY - blockTouchY;
            if (diff < pixelPerField) {
                keyPressed = "ArrowUp";
            }
            else if (diff > 3 * pixelPerField) {
                keyPressed = "ArrowDown";
            }
            if (keyPressed) {
                keyPressedMax = 100;
                keyPressedCount = keyPressedMax;
            }
        }
        blockTouchY = undefined;
    };
    const renderTetris = (parent) => {
        const info = Controls.createDiv(parent, "info");
        scoreDiv = Controls.createDiv(info);
        scoreDiv.textContent = `Score: ${score}`;
        levelDiv = Controls.createDiv(info);
        levelDiv.textContent = `Level: ${level}`;
        linesDiv = Controls.createDiv(info);
        linesDiv.textContent = `Lines: ${lines}`;
        let nextDiv = Controls.createDiv(info);
        nextDiv.textContent = "Next";
        gameOverDiv = Controls.createDiv(parent, "gameover");
        gameOverDiv.style.visibility = "hidden";
        newGameButton = Controls.createButton(parent, "New Game", () => { render(); }, "newgame", "newgame");
        newGameButton.style.visibility = "hidden";
        Controls.createDiv(parent, "arrow-div");
        let arrowDivLeft = Controls.createDiv(parent, "arrow-left");
        createImage(arrowDivLeft, "/images/buttons/arrow-left-3.png", 32, "ArrowLeft", "Left");
        let arrowDivRight = Controls.createDiv(parent, "arrow-right");
        createImage(arrowDivRight, "/images/buttons/arrow-right-3.png", 32, "ArrowRight", "Right");
        let arrowDivUp = Controls.createDiv(parent, "arrow-up");
        createImage(arrowDivUp, "/images/buttons/arrow-up-3.png", 32, "ArrowUp", "Rotate");
        let arrowDivDown = Controls.createDiv(parent, "arrow-down");
        createImage(arrowDivDown, "/images/buttons/arrow-down-3.png", 32, "ArrowDown", "Drop");
        canvas = Controls.create(parent, "canvas", "playground");
        canvas.width = pixelPerField * (playground.width + 2);
        canvas.height = pixelPerField * (playground.height + 2);
        canvas.addEventListener("touchstart", onCanvasTouchStart, { passive: false });
        canvas.addEventListener("touchend", onCanvasTouchEnd, { passive: false });
        canvas.addEventListener("touchcancel", onCanvasTouchEnd, { passive: false });
        canvas.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
        canvasNextBlock = Controls.create(info, "canvas", "nextblock");
        canvasNextBlock.width = pixelPerField * 6;
        canvasNextBlock.height = pixelPerField * 6;
    };
    const render = () => {
        playground = new Playground(10, 20);
        colorMap = new Map();
        colorMap.set("ORANGE", { center: "#f0a000", leftright: "#d89000", top: "#fbe3b3", bottom: "#795000" });
        colorMap.set("CYAN", { center: "#00f0f0", leftright: "#00d8d8", top: "#b3fbfb", bottom: "#007878" });
        colorMap.set("RED", { center: "#f00000", leftright: "#d80000", top: "#fbb3b3", bottom: "#780000" });
        colorMap.set("GREEN", { center: "#00f000", leftright: "#00d800", top: "#b3fbb3", bottom: "#007800" });
        colorMap.set("PURBLE", { center: "#a000f0", leftright: "#9000d8", top: "#e3b3fb", bottom: "#500078" });
        colorMap.set("YELLOW", { center: "#f0f000", leftright: "#d8d800", top: "#fbfbb3", bottom: "#787800" });
        colorMap.set("BLUE", { center: "#0000f0", leftright: "#0000d8", top: "#b3b3fb", bottom: "#000078" });
        colorMap.set("BORDER", { center: "#787878", leftright: "#a1a2a1", top: "#d7d7d7", bottom: "#373737" });
        speed = [
            48, // level 0
            43, // level 1
            38, // level 2
            33, // level 3
            28, // level 4
            23, // level 5
            18, // level 6
            13, // level 7
            8, // level 8
            6, // level 9
            5, 5, 5, // level 10 - 12
            4, 4, 4, // level 13 - 15
            3, 3, 3, // level 16-18
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2, // level 19-28
            1
        ]; // level 29+
        state = "NEWBLOCK";
        score = 0;
        level = 0;
        lines = 0;
        blockMoveDownCount = 0;
        isPaused = false;
        keyPressed = undefined;
        keyPressedCount = 0;
        keyPressedMax = 100;
        moveDownFrameCount = 0;
        clearPoints = [];
        block = undefined;
        nextBlock = undefined;
        dirtyBorder = true;
        dirtyPlayground = true;
        dirtyBlock = true;
        dirtyNextBlock = true;
        Controls.removeAllChildren(document.body);
        const wrapBody = Controls.createDiv(document.body, "wrap-body");
        wrapBody.id = "wrap-body-id";
        const all = Controls.createDiv(wrapBody);
        renderTetris(all);
    };
    const renderInit = () => {
        render();
        window.requestAnimationFrame(draw);
    };
    // --- initialization
    const initKeyDownEvent = () => {
        document.addEventListener("keydown", e => {
            if (state != "GAMEOVER") {
                if (e.key.startsWith("Arrow")) {
                    e.preventDefault();
                }
                if (keyPressed != e.key) {
                    keyPressed = e.key;
                    keyPressedMax = 100;
                    keyPressedCount = keyPressedMax;
                }
            }
        });
        document.addEventListener("keyup", (e) => {
            if (state != "GAMEOVER") {
                if (e.key.startsWith("Arrow")) {
                    e.preventDefault();
                }
                if (e.key == "l") {
                    increaseLevel();
                }
                keyPressed = undefined;
            }
            isPaused = !isPaused && e.key == "p";
        });
    };
    const init = () => {
        pixelPerField = 24;
        borderWidth = 3;
        initKeyDownEvent();
        renderInit();
    };
    // --- public API
    return {
        init: init
    };
})();
// --- window loaded event
window.onload = () => tetris.init();
//# sourceMappingURL=tetrisgame.js.map