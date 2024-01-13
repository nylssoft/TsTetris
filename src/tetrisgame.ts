import Controls from "./controls.js";

import {
    Block,
    BlockAction,
    BlockColor, BlockType,
    GameAction,
    GameContext,
    InitLevelAction,
    Levels,
    MoveBonusAction,
    NewBlockAction,
    Playground,
    Point,
    StartScreenAction
} from "./tetristypes.js";

var tetrisGame = (() => {

    let canvas: HTMLCanvasElement;
    let scoreDiv: HTMLDivElement;
    let levelDiv: HTMLDivElement;
    let linesDiv: HTMLDivElement;
    let gameOverDiv: HTMLDivElement;
    let newGameButton: HTMLButtonElement;
    let canvasNextBlock: HTMLCanvasElement;
    let remainingDiv: HTMLDivElement;

    // --- state

    let gameAction: GameAction;
    let gameContext: GameContext;

    let isPaused: boolean;
    let blockTouchY: number | undefined;

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
        "PURBLE": { center: "#a000f0", leftright: "#9000d8", top: "#e3b3fb", bottom: "#500078" },
        "RANDOMPOINT": { center: "#787878", leftright: "#a1a2a1", top: "#d7d7d7", bottom: "#373737" }
    };

    // --- drawing canvas

    const drawRect = (ctx: CanvasRenderingContext2D, x: number, y: number, blockType: BlockType): void => {
        const blockColor: BlockColor = blockColors[blockType];

        ctx.fillStyle = blockColor.center;
        ctx.beginPath();
        ctx.fillRect(x + borderWidth, y + borderWidth, pixelPerField - borderWidth * 2, pixelPerField - borderWidth * 2);

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
        const nextTetrisBlock: Block | undefined = gameContext.nextBlock;
        if (nextTetrisBlock) {
            const points: Point[] = nextTetrisBlock.getRelativePoints(nextTetrisBlock.orientation);
            const xoff = -Math.min(...points.map(p => p.x));
            const yoff = -Math.min(...points.map(p => p.y));
            points.forEach(p => {
                const x: number = (p.x + xoff) * pixelPerField;
                const y: number = (p.y + yoff) * pixelPerField;
                drawRect(ctx, x, y, nextTetrisBlock.blockType);
            });
        }
    };

    const drawBlock = (ctx: CanvasRenderingContext2D): void => {
        gameContext.clearPoints.forEach(p => {
            ctx.clearRect(p.x, p.y, pixelPerField, pixelPerField);
        });
        gameContext.clearPoints = [];
        const offx: number = pixelPerField;
        const offy: number = offx;
        const tetrisBlock: Block | undefined = gameContext.block;
        if (tetrisBlock) {
            const points: Point[] = tetrisBlock.getRelativePoints(tetrisBlock.orientation);
            points.forEach(p => {
                const x: number = offx + (tetrisBlock.x + p.x) * pixelPerField;
                const y: number = offy + (tetrisBlock.y + p.y) * pixelPerField;
                drawRect(ctx, x, y, tetrisBlock.blockType);
                gameContext.clearPoints.push({ "x": x, "y": y });
            });
        }
    };

    const drawBorder = (ctx: CanvasRenderingContext2D): void => {
        for (let y: number = 0; y <= pixelPerField * (gameContext.playground.height + 1); y += pixelPerField) {
            drawRect(ctx, 0, y, "BORDER");
            drawRect(ctx, pixelPerField * (gameContext.playground.width + 1), y, "BORDER");
        }
        for (let x: number = 1; x < pixelPerField * (gameContext.playground.width + 1); x += pixelPerField) {
            drawRect(ctx, x, 0, "BORDER");
            drawRect(ctx, x, pixelPerField * (gameContext.playground.height + 1), "BORDER");
        }
    };

    const drawPlayground = (ctx: CanvasRenderingContext2D): void => {
        const offx: number = pixelPerField;
        const offy: number = offx;
        ctx.clearRect(offx, offy, gameContext.playground.width * pixelPerField, gameContext.playground.height * pixelPerField);
        for (let y: number = 0; y < gameContext.playground.height; y++) {
            for (let x: number = 0; x < gameContext.playground.width; x++) {
                const blockType: BlockType = gameContext.playground.getBlockType(x, y);
                if (blockType != "EMPTY") {
                    const xrect: number = offx + x * pixelPerField;
                    const yrect: number = offy + y * pixelPerField;
                    drawRect(ctx, xrect, yrect, blockType);
                    if (blockType === "RANDOMPOINT") {
                        drawRandomPoint(ctx, xrect, yrect);
                    }
                }
            }
        }
    };

    const drawRandomPoint = (ctx: CanvasRenderingContext2D, xrect: number, yrect: number): void => {
        const xgray: number = xrect + borderWidth;
        const ygray: number = yrect + borderWidth;
        const wgray: number = pixelPerField - 2 * borderWidth;
        const hgray: number = pixelPerField - 2 * borderWidth;
        const lineargradient: CanvasGradient = ctx.createLinearGradient(xgray, ygray, xgray, ygray + hgray);
        lineargradient.addColorStop(0, "white");
        lineargradient.addColorStop(1, "black");
        ctx.fillStyle = lineargradient;
        ctx.beginPath();
        ctx.fillRect(xgray, ygray, wgray, hgray);
    };

    const drawBonus = (ctx: CanvasRenderingContext2D): void => {
        if (gameAction.getState() !== "MOVEBONUS") {
            return;
        }
        const moveBonusAction: MoveBonusAction = gameAction as MoveBonusAction;
        const offx: number = pixelPerField;
        const offy: number = offx;
        const x: number = offx;
        const y: number = offy + moveBonusAction.bonusY * pixelPerField;
        const w: number = gameContext.playground.width * pixelPerField;
        const h: number = pixelPerField;
        const lineargradient: CanvasGradient = ctx.createLinearGradient(x, y, x, y + h);
        lineargradient.addColorStop(0, "white");
        lineargradient.addColorStop(1, "black");
        ctx.fillStyle = lineargradient;
        ctx.beginPath();
        ctx.fillRect(x, y, w, h);
    };

    const draw = (): void => {
        if (isPaused || !gameContext || !gameAction) {
            window.requestAnimationFrame(draw);
            return;
        }
        gameAction = gameAction.execute(gameContext);
        const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;
        if (gameContext.dirtyBorder) {
            drawBorder(ctx);
            gameContext.dirtyBorder = false;
        }
        if (gameContext.dirtyPlayground && gameContext.playground) {
            drawPlayground(ctx);
            gameContext.dirtyPlayground = false;
        }
        if (gameContext.dirtyBlock && gameContext.block) {
            drawBlock(ctx);
            gameContext.dirtyBlock = false;
        }
        if (gameContext.dirtyBonus) {
            drawBonus(ctx);
            gameContext.dirtyBonus = false;
        }
        if (gameContext.dirtyNextBlock && gameContext.nextBlock) {
            const ctxnext: CanvasRenderingContext2D = canvasNextBlock.getContext("2d")!;
            ctxnext.clearRect(0, 0, canvas.width, canvas.height);
            drawNextBlock(ctxnext);
            gameContext.dirtyNextBlock = false;
        }
        if (gameContext.dirtyInfo) {
            scoreDiv.textContent = `Score ${gameContext.score}`;
            levelDiv.textContent = `Level ${gameContext.level}`;
            linesDiv.textContent = `Lines ${gameContext.lines}`;
            remainingDiv.textContent = gameContext.remainingLines > 0 ? `${gameContext.remainingLines}` : "";
            if (gameAction.getState() == "GAMEOVER") {
                gameOverDiv.textContent = "GAME OVER";
                gameOverDiv.style.visibility = "visible";
                newGameButton.style.visibility = "visible";
            }
            gameContext.dirtyInfo = false;
        }
        window.requestAnimationFrame(draw);
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
            gameContext.keyPressed = action;
            gameContext.keyPressedMax = 100;
            gameContext.keyPressedCount = gameContext.keyPressedMax;
        });
        img.addEventListener("mouseup", e => {
            e.preventDefault();
            gameContext.keyPressed = undefined;
        });
        img.addEventListener("touchstart", e => {
            e.preventDefault();
            gameContext.keyPressed = action;
            gameContext.keyPressedMax = 100;
            gameContext.keyPressedCount = gameContext.keyPressedMax;
        });
        img.addEventListener("touchend", e => {
            e.preventDefault();
            gameContext.keyPressed = undefined;
        });
        img.addEventListener("touchcancel", e => {
            e.preventDefault();
            gameContext.keyPressed = undefined;
        });
    };

    const onCanvasTouchStart = (e: TouchEvent): void => {
        e.preventDefault();
        const canvas: HTMLCanvasElement = document.querySelector(".playground") as HTMLCanvasElement;
        const touches: TouchList = e.changedTouches;
        const tetrisBlock: Block | undefined = gameContext.block;
        if (touches.length === 1 && isGameRunning() && tetrisBlock) {
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
            gameContext.keyPressed = undefined;
            blockTouchY = undefined;
            if (tx >= pminx - pixelPerField && tx <= pmaxx + 2 * pixelPerField &&
                ty >= pminy - pixelPerField && ty <= pmaxy + 2 * pixelPerField) {
                blockTouchY = touch.clientY;
            }
            else if (tx < pminx) {
                gameContext.keyPressed = "ArrowLeft";
            }
            else if (tx > pmaxx + pixelPerField) {
                gameContext.keyPressed = "ArrowRight";
            }
            if (gameContext.keyPressed) {
                gameContext.keyPressedMax = 100;
                gameContext.keyPressedCount = gameContext.keyPressedMax;
            }
        }
    };

    const onCanvasTouchEnd = (e: TouchEvent): void => {
        e.preventDefault();
        gameContext.keyPressed = undefined;
        const touches: TouchList = e.changedTouches;
        if (blockTouchY && blockTouchY > 0 && touches.length === 1 && isGameRunning()) {
            const touch: Touch = touches[0];
            const diff: number = touch.clientY - blockTouchY;
            if (diff < pixelPerField) {
                gameContext.keyPressed = "ArrowUp";
                gameContext.canvasArrowUp = true;
            }
            else if (diff > 3 * pixelPerField) {
                gameContext.keyPressed = "ArrowDown";
            }
            if (gameContext.keyPressed) {
                gameContext.keyPressedMax = 100;
                gameContext.keyPressedCount = gameContext.keyPressedMax;
            }
        }
        blockTouchY = undefined;
    };

    const renderTetris = (parent: HTMLElement): void => {
        const info: HTMLDivElement = Controls.createDiv(parent, "info");
        scoreDiv = Controls.createDiv(info);
        scoreDiv.textContent = `Score ${gameContext.score}`;
        levelDiv = Controls.createDiv(info);
        levelDiv.textContent = `Level ${gameContext.level + 1}`;
        linesDiv = Controls.createDiv(info);
        linesDiv.textContent = `Lines ${gameContext.lines}`;

        gameOverDiv = Controls.createDiv(parent, "gameover");
        gameOverDiv.style.visibility = "hidden";

        newGameButton = Controls.createButton(parent, "New Game", () => { render(new NewBlockAction()); }, "newgame", "newgame");
        newGameButton.style.visibility = "hidden";

        const arrowDivLeft: HTMLDivElement = Controls.createDiv(parent, "arrow-left");
        createImage(arrowDivLeft, "/images/arrow-left-3.png", 32, "ArrowLeft", "Left");
        const arrowDivRight: HTMLDivElement = Controls.createDiv(parent, "arrow-right");
        createImage(arrowDivRight, "/images/arrow-right-3.png", 32, "ArrowRight", "Right");
        const arrowDivUp: HTMLDivElement = Controls.createDiv(parent, "arrow-up");
        createImage(arrowDivUp, "/images/arrow-up-3.png", 32, "ArrowUp", "Rotate");
        const arrowDivDown: HTMLDivElement = Controls.createDiv(parent, "arrow-down");
        createImage(arrowDivDown, "/images/arrow-down-3.png", 32, "ArrowDown", "Drop");

        canvas = Controls.create(parent, "canvas", "playground") as HTMLCanvasElement;
        canvas.width = pixelPerField * (gameContext.playground.width + 2);
        canvas.height = pixelPerField * (gameContext.playground.height + 2);

        canvas.addEventListener("touchstart", onCanvasTouchStart, { passive: false });
        canvas.addEventListener("touchend", onCanvasTouchEnd, { passive: false });
        canvas.addEventListener("touchcancel", onCanvasTouchEnd, { passive: false });
        canvas.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

        canvasNextBlock = Controls.create(info, "canvas", "nextblock") as HTMLCanvasElement;
        canvasNextBlock.width = pixelPerField * 6;
        canvasNextBlock.height = pixelPerField * 6;

        const remainingDivInfo: HTMLDivElement = Controls.createDiv(info, "remainingInfo");
        remainingDiv = Controls.createDiv(remainingDivInfo);
    };

    const render = (startGameAction: GameAction): void => {

        isPaused = startGameAction.getState() === "NEWBLOCK";

        gameAction = startGameAction;

        gameContext = {
            playground: new Playground(10, 20),

            block: undefined,
            nextBlock: undefined,
            nextRandomPoint: undefined,
            nextRandomRow: undefined,

            clearPoints: [],

            keyPressed: undefined,
            keyPressedCount: 0,
            keyPressedMax: 100,
            canvasArrowUp: false,

            dirtyBlock: true,
            dirtyBonus: true,
            dirtyBorder: true,
            dirtyInfo: true,
            dirtyNextBlock: true,
            dirtyPlayground: true,

            level: 0,
            lines: 0,
            score: 0,
            remainingLines: 0,
        };

        Controls.removeAllChildren(document.body);
        renderTetris(Controls.createDiv(document.body));

        if (gameAction.getState() === "STARTSCREEN") {
            showStartScreen();
        }
        else {
            gameContext.remainingLines = Levels.getRemaingLines(0);
        }

        isPaused = false;
    };

    const showStartScreen = (): void => {
        gameContext.nextBlock = BlockAction.createNewBlock();
        const colors: BlockType[] = ["BLUE", "CYAN", "GREEN", "ORANGE", "PURBLE", "RED", "YELLOW"];
        for (let y: number = 0; y < gameContext.playground.height; y++) {
            const t: number = Math.floor(Math.random() * colors.length);
            const x: number = Math.floor(Math.random() * gameContext.playground.width);
            gameContext.playground.setBlockType(x, y, colors[t]);
        }
        newGameButton.style.visibility = "visible";
        gameContext.dirtyPlayground = true;
        gameContext.dirtyNextBlock = true;
    };

    const renderInit = (): void => {
        render(new StartScreenAction());
        window.requestAnimationFrame(draw);
    };

    // --- initialization

    const isGameRunning = (): boolean => {
        return gameAction.getState() != "GAMEOVER" && gameAction.getState() != "STARTSCREEN";
    }

    const initKeyDownEvent = (): void => {
        document.addEventListener("keydown", e => {
            if (isGameRunning()) {
                if (e.key.startsWith("Arrow")) {
                    e.preventDefault();
                }
                if (gameContext.keyPressed != e.key) {
                    gameContext.keyPressed = e.key;
                    gameContext.keyPressedMax = 100;
                    gameContext.keyPressedCount = gameContext.keyPressedMax;
                }
            }
        });
        document.addEventListener("keyup", (e) => {
            if (isGameRunning()) {
                if (e.key.startsWith("Arrow")) {
                    e.preventDefault();
                }
                if (e.key == "l") {
                    gameContext.level += 1;
                    gameContext.score = 0;
                    gameContext.lines = 0;
                    gameAction = new InitLevelAction(0);
                }
                gameContext.keyPressed = undefined;
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

