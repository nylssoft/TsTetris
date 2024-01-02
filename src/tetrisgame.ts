import Controls from "./controls.js";

import {
    Block,
    BlockColor, BlockType,
    IBlock,
    JBlock,
    LBlock,
    OBlock,
    Playground,
    Point,
    SBlock,
    State,
    TBlock,
    ZBlock
} from "./tetristypes.js";

var tetrisGame = (() => {

    let canvas: HTMLCanvasElement;
    let scoreDiv: HTMLDivElement;
    let levelDiv: HTMLDivElement;
    let linesDiv: HTMLDivElement;
    let gameOverDiv: HTMLDivElement;
    let newGameButton: HTMLButtonElement;
    let canvasNextBlock: HTMLCanvasElement;

    // --- state

    let block: Block | undefined;
    let nextBlock: Block | undefined;
    let blockMoveDownCount: number;
    let isPaused: boolean;
    let playground: Playground;
    let score: number;
    let lines: number;
    let level: number;
    let state: State;
    let blockTouchY: number | undefined;

    let speed: number[];
    let clearPoints: Point[];
    let moveDownFrameCount: number;
    let lastMoveDown: boolean;
    let keyPressedCount: number;
    let keyPressedMax: number;
    let keyPressed: string | undefined;
    let dirtyBorder: boolean;
    let dirtyPlayground: boolean;
    let dirtyBlock: boolean;
    let dirtyNextBlock: boolean;

    let pixelPerField: number;
    let borderWidth: number;

    const blockColors = {
        "EMPTY": { center: "#000000", leftright: "#000000", top: "#000000", bottom: "#000000" },
        "BORDER": { center: "#787878", leftright: "#a1a2a1", top: "#d7d7d7", bottom: "#373737" },
        "ORANGE": { center: "#f0a000", leftright: "#d89000", top: "#fbe3b3", bottom: "#795000" },
        "BLUE": { center: "#0000f0", leftright: "#0000d8", top: "#b3b3fb", bottom: "#000078" },
        "YELLOW": { center: "#f0f000", leftright: "#d8d800", top: "#fbfbb3", bottom: "#787800" },
        "CYAN": { center: "#00f0f0", leftright: "#00d8d8", top: "#b3fbfb", bottom: "#007878" },
        "RED": { center: "#f00000", leftright: "#d80000", top: "#fbb3b3", bottom: "#780000" },
        "GREEN": { center: "#00f000", leftright: "#00d800", top: "#b3fbb3", bottom: "#007800" },
        "PURBLE": { center: "#a000f0", leftright: "#9000d8", top: "#e3b3fb", bottom: "#500078" }
    };

    const increaseLevel = (): void => {
        level += 1;
        levelDiv.textContent = `Level ${level}`;
    };

    // --- drawing canvas

    const drawRect = (ctx: CanvasRenderingContext2D, x: number, y: number, blockType: BlockType): void => {
        const blockColor: BlockColor = blockColors[blockType];

        ctx.fillStyle = blockColor.center;
        ctx.beginPath();
        ctx.fillRect(x + borderWidth, y + borderWidth, pixelPerField - borderWidth * 2, pixelPerField - borderWidth);

        ctx.fillStyle = blockColor.top;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + borderWidth, y + borderWidth);
        ctx.lineTo(x + pixelPerField - borderWidth, y + borderWidth);
        ctx.lineTo(x + pixelPerField, y);
        ctx.fill();

        ctx.fillStyle = blockColor.bottom;
        ctx.beginPath();
        ctx.moveTo(x, y + pixelPerField);
        ctx.lineTo(x + borderWidth, y + pixelPerField - borderWidth);
        ctx.lineTo(x + pixelPerField - borderWidth, y + pixelPerField - borderWidth);
        ctx.lineTo(x + pixelPerField, y + pixelPerField);
        ctx.fill();

        ctx.fillStyle = blockColor.leftright;
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

    const drawNextBlock = (ctx: CanvasRenderingContext2D): void => {
        const nextTetrisBlock: Block | undefined = nextBlock;
        if (nextTetrisBlock) {
            const offx: number = pixelPerField;
            const offy: number = offx;
            const points: Point[] = nextTetrisBlock.getRelativePoints(nextTetrisBlock.orientation);
            points.forEach(p => {
                const x: number = offx + (nextTetrisBlock.x + p.x) * pixelPerField;
                const y: number = offy + (nextTetrisBlock.y + p.y) * pixelPerField;
                drawRect(ctx, x, y, nextTetrisBlock.blockType);
            });
        }
    };

    const drawBlock = (ctx: CanvasRenderingContext2D): void => {
        clearPoints.forEach(p => {
            ctx.clearRect(p.x, p.y, pixelPerField, pixelPerField);
        });
        clearPoints = [];
        const offx: number = pixelPerField;
        const offy: number = offx;
        const tetrisBlock: Block | undefined = block;
        if (tetrisBlock) {
            const points: Point[] = tetrisBlock.getRelativePoints(tetrisBlock.orientation);
            points.forEach(p => {
                const x: number = offx + (tetrisBlock.x + p.x) * pixelPerField;
                const y: number = offy + (tetrisBlock.y + p.y) * pixelPerField;
                drawRect(ctx, x, y, tetrisBlock.blockType);
                clearPoints.push({ "x": x, "y": y });
            });
        }
    };

    const drawBorder = (ctx: CanvasRenderingContext2D): void => {
        for (let y: number = 0; y <= pixelPerField * (playground.height + 1); y += pixelPerField) {
            drawRect(ctx, 0, y, "BORDER");
            drawRect(ctx, pixelPerField * (playground.width + 1), y, "BORDER");
        }
        for (let x: number = 1; x < pixelPerField * (playground.width + 1); x += pixelPerField) {
            drawRect(ctx, x, 0, "BORDER");
            drawRect(ctx, x, pixelPerField * (playground.height + 1), "BORDER");
        }
    };

    const drawPlayground = (ctx: CanvasRenderingContext2D): void => {
        const offx: number = pixelPerField;
        const offy: number = offx;
        ctx.clearRect(offx, offy, playground.width * pixelPerField, playground.height * pixelPerField);
        for (let y: number = 0; y < playground.height; y++) {
            for (let x: number = 0; x < playground.width; x++) {
                const blockType: BlockType = playground.getBlockType(x, y);
                if (blockType != "EMPTY") {
                    drawRect(ctx, offx + x * pixelPerField, offy + y * pixelPerField, blockType);
                }
            }
        }
    };

    const moveDown = (): void => {
        const tetrisBlock: Block | undefined = block;
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
        const scores: number[] = [40, 100, 300, 1200];
        const fullRows: number = playground.clearFullRows();
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

    const draw = (): void => {
        const tetrisBlock: Block | undefined = block;
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
        const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;
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
            const ctxnext: CanvasRenderingContext2D = canvasNextBlock.getContext("2d")!;
            ctxnext.clearRect(0, 0, canvas.width, canvas.height);
            drawNextBlock(ctxnext);
            dirtyNextBlock = false;
        }
        window.requestAnimationFrame(draw);
    };

    // --- block methods

    const createNewBlock = (): Block => {
        const idx: number = Math.floor(Math.random() * 7);
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

    const placeNewBlock = (): void => {
        block = undefined;
        let newBlock: Block;
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

    const createImage = (parent: HTMLElement, url: string, size: number, action: string, title: string): void => {
        const img: HTMLImageElement = Controls.create(parent, "img") as HTMLImageElement;
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

    const onCanvasTouchStart = (e: TouchEvent): void => {
        e.preventDefault();
        const canvas: HTMLCanvasElement = document.querySelector(".playground") as HTMLCanvasElement;
        const touches: TouchList = e.changedTouches;
        const tetrisBlock: Block | undefined = block;
        if (touches.length === 1 && state != "GAMEOVER" && tetrisBlock) {
            const touch: Touch = touches[0];
            const rect: DOMRect = canvas.getBoundingClientRect();
            const tx: number = touch.clientX - rect.x;
            const ty: number = touch.clientY - rect.y;
            const offx: number = pixelPerField;
            const offy: number = offx;
            const points: Point[] = tetrisBlock.getRelativePoints(tetrisBlock.orientation);
            let pminx: number = Number.MAX_SAFE_INTEGER,
                pminy: number = Number.MAX_SAFE_INTEGER,
                pmaxx: number = 0,
                pmaxy: number = 0;
            points.forEach(p => {
                const x: number = offx + (tetrisBlock.x + p.x) * pixelPerField;
                const y: number = offy + (tetrisBlock.y + p.y) * pixelPerField;
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

    const onCanvasTouchEnd = (e: TouchEvent): void => {
        e.preventDefault();
        keyPressed = undefined;
        const touches: TouchList = e.changedTouches;
        if (blockTouchY && blockTouchY > 0 && touches.length === 1 && state != "GAMEOVER") {
            const touch: Touch = touches[0];
            const diff: number = touch.clientY - blockTouchY;
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

    const renderTetris = (parent: HTMLElement): void => {
        const info: HTMLDivElement = Controls.createDiv(parent, "info");
        scoreDiv = Controls.createDiv(info);
        scoreDiv.textContent = `Score: ${score}`;
        levelDiv = Controls.createDiv(info);
        levelDiv.textContent = `Level: ${level}`;
        linesDiv = Controls.createDiv(info);
        linesDiv.textContent = `Lines: ${lines}`;
        const nextDiv: HTMLDivElement = Controls.createDiv(info);
        nextDiv.textContent = "Next";

        gameOverDiv = Controls.createDiv(parent, "gameover");
        gameOverDiv.style.visibility = "hidden";

        newGameButton = Controls.createButton(parent, "New Game", () => { render(); }, "newgame", "newgame");
        newGameButton.style.visibility = "hidden";

        Controls.createDiv(parent, "arrow-div");
        const arrowDivLeft: HTMLDivElement = Controls.createDiv(parent, "arrow-left");
        createImage(arrowDivLeft, "/images/arrow-left-3.png", 32, "ArrowLeft", "Left");
        const arrowDivRight: HTMLDivElement = Controls.createDiv(parent, "arrow-right");
        createImage(arrowDivRight, "/images/arrow-right-3.png", 32, "ArrowRight", "Right");
        const arrowDivUp: HTMLDivElement = Controls.createDiv(parent, "arrow-up");
        createImage(arrowDivUp, "/images/arrow-up-3.png", 32, "ArrowUp", "Rotate");
        const arrowDivDown: HTMLDivElement = Controls.createDiv(parent, "arrow-down");
        createImage(arrowDivDown, "/images/arrow-down-3.png", 32, "ArrowDown", "Drop");

        canvas = Controls.create(parent, "canvas", "playground") as HTMLCanvasElement;
        canvas.width = pixelPerField * (playground.width + 2);
        canvas.height = pixelPerField * (playground.height + 2);

        canvas.addEventListener("touchstart", onCanvasTouchStart, { passive: false });
        canvas.addEventListener("touchend", onCanvasTouchEnd, { passive: false });
        canvas.addEventListener("touchcancel", onCanvasTouchEnd, { passive: false });
        canvas.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

        canvasNextBlock = Controls.create(info, "canvas", "nextblock") as HTMLCanvasElement;
        canvasNextBlock.width = pixelPerField * 6;
        canvasNextBlock.height = pixelPerField * 6;
    };

    const render = () => {
        playground = new Playground(10, 20);

        speed = [
            48, // level 0
            43, // level 1
            38, // level 2
            33, // level 3
            28, // level 4
            23, // level 5
            18, // level 6
            13, // level 7
            8,  // level 8
            6,  // level 9
            5, 5, 5, // level 10 - 12
            4, 4, 4, // level 13 - 15
            3, 3, 3, // level 16-18
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2, // level 19-28
            1]; // level 29+

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
        renderTetris(Controls.createDiv(document.body));
    };

    const renderInit = () => {
        render();
        window.requestAnimationFrame(draw);
    };

    // --- initialization

    const initKeyDownEvent = (): void => {
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

    const init = (): void => {
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

window.onload = () => tetrisGame.init();

