﻿import "./Game.css";
import arrowDown from "./arrow-down-3.png";
import arrowUp from "./arrow-up-3.png";
import arrowLeft from "./arrow-left-3.png";
import arrowRight from "./arrow-right-3.png";
import { BlockColor, BlockType, Point, State } from "./Types";
import { ControlUtils } from "./ControlUtils";
import { Block } from "./Blocks";
import { Playground } from "./Playground";
import { Levels } from "./Levels";
import { GameContext } from "./GameContext";
import { DropOneRowAction, GameAction, InitLevelAction, MoveBonusAction, NewBlockAction, StartScreenAction } from "./GameActions";

type HighScoreEntry = {
    name: string;
    score: number;
    lines: number;
    level: number;
    created: string;
};

class Game {

    private canvas?: HTMLCanvasElement;
    private scoreDiv?: HTMLDivElement;
    private levelDiv?: HTMLDivElement;
    private linesDiv?: HTMLDivElement;
    private gameOverDiv?: HTMLDivElement;
    private newGameButton?: HTMLButtonElement;
    private canvasNextBlock?: HTMLCanvasElement;
    private canvasStatistics?: HTMLCanvasElement;
    private remainingDiv?: HTMLDivElement;

    // --- highscore

    private highScoreDiv?: HTMLElement;
    private addHighScoreDiv?: HTMLElement;
    private inputUsername?: HTMLInputElement;
    private highScores?: HighScoreEntry[];

    // --- state

    private gameAction?: GameAction;
    private gameContext?: GameContext;

    private isPaused: boolean = true;
    private blockTouchY?: number;

    private pixelPerField: number = 0;
    private borderWidth: number = 0;

    private static readonly BLOCK_COLORS = {
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

    private drawRect(ctx: CanvasRenderingContext2D, x: number, y: number, blockType: BlockType): void {
        const blockColor: BlockColor = Game.BLOCK_COLORS[blockType];

        ctx.fillStyle = blockColor.center;
        ctx.beginPath();
        ctx.fillRect(x + this.borderWidth, y + this.borderWidth, this.pixelPerField - this.borderWidth * 2, this.pixelPerField - this.borderWidth * 2);

        ctx.fillStyle = blockColor.top;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + this.borderWidth, y + this.borderWidth);
        ctx.lineTo(x + this.pixelPerField - this.borderWidth, y + this.borderWidth);
        ctx.lineTo(x + this.pixelPerField, y);
        ctx.fill();

        ctx.fillStyle = blockColor.bottom;
        ctx.beginPath();
        ctx.moveTo(x, y + this.pixelPerField);
        ctx.lineTo(x + this.borderWidth, y + this.pixelPerField - this.borderWidth);
        ctx.lineTo(x + this.pixelPerField - this.borderWidth, y + this.pixelPerField - this.borderWidth);
        ctx.lineTo(x + this.pixelPerField, y + this.pixelPerField);
        ctx.fill();

        ctx.fillStyle = blockColor.leftright;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + this.borderWidth, y + this.borderWidth);
        ctx.lineTo(x + this.borderWidth, y + this.pixelPerField - this.borderWidth);
        ctx.lineTo(x, y + this.pixelPerField);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + this.pixelPerField, y);
        ctx.lineTo(x + this.pixelPerField - this.borderWidth, y + this.borderWidth);
        ctx.lineTo(x + this.pixelPerField - this.borderWidth, y + this.pixelPerField - this.borderWidth);
        ctx.lineTo(x + this.pixelPerField, y + this.pixelPerField);
        ctx.fill();
    }

    private drawNextBlock(ctx: CanvasRenderingContext2D): void {
        const nextTetrisBlock: Block | undefined = this.gameContext!.nextBlock;
        if (nextTetrisBlock) {
            const points: Point[] = nextTetrisBlock.getRelativePoints(nextTetrisBlock.orientation);
            const xoff = -Math.min(...points.map(p => p.x));
            const yoff = -Math.min(...points.map(p => p.y));
            points.forEach(p => {
                const x: number = (p.x + xoff) * this.pixelPerField;
                const y: number = (p.y + yoff) * this.pixelPerField;
                this.drawRect(ctx, x, y, nextTetrisBlock.blockType);
            });
        }
    }

    private drawBlock(ctx: CanvasRenderingContext2D): void {
        this.gameContext!.clearPoints.forEach(p => {
            ctx.clearRect(p.x, p.y, this.pixelPerField, this.pixelPerField);
        });
        this.gameContext!.clearPoints = [];
        const offx: number = this.pixelPerField;
        const offy: number = offx;
        const tetrisBlock: Block | undefined = this.gameContext!.block;
        if (tetrisBlock) {
            const points: Point[] = tetrisBlock.getRelativePoints(tetrisBlock.orientation);
            points.forEach(p => {
                const x: number = offx + (tetrisBlock.x + p.x) * this.pixelPerField;
                const y: number = offy + (tetrisBlock.y + p.y) * this.pixelPerField;
                this.drawRect(ctx, x, y, tetrisBlock.blockType);
                this.gameContext!.clearPoints.push({ "x": x, "y": y });
            });
        }
    }

    private drawBorder(ctx: CanvasRenderingContext2D): void {
        let x: number = 0;
        let y: number = 0;
        let w: number = this.pixelPerField * (this.gameContext!.playground.width + 2);
        let h: number = this.pixelPerField - this.borderWidth;

        const colStart = "#FC6600";
        const colMiddle = "#793902";
        const colEnd = "#FFBF00";

        const g: CanvasGradient = ctx.createLinearGradient(x, y, x + w, y + h);
        g.addColorStop(0, colStart);
        g.addColorStop(0.5, colMiddle);
        g.addColorStop(1, colEnd);

        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, h);
        y = this.pixelPerField * (this.gameContext!.playground.height + 1) + this.borderWidth;
        ctx.fillRect(x, y, w, h);
        x = 0;
        y = this.pixelPerField - this.borderWidth;
        w = this.pixelPerField - this.borderWidth;
        h = this.pixelPerField * this.gameContext!.playground.height + 2 * this.borderWidth;
        ctx.fillRect(x, y, w, h);
        x = this.pixelPerField * (this.gameContext!.playground.width + 1) + this.borderWidth;
        ctx.fillRect(x, y, w, h);
    }

    private drawPlayground(ctx: CanvasRenderingContext2D): void {
        const offx: number = this.pixelPerField;
        const offy: number = offx;
        ctx.clearRect(offx, offy, this.gameContext!.playground.width * this.pixelPerField, this.gameContext!.playground.height * this.pixelPerField);
        for (let y: number = 0; y < this.gameContext!.playground.height; y++) {
            for (let x: number = 0; x < this.gameContext!.playground.width; x++) {
                const blockType: BlockType = this.gameContext!.playground.getBlockType(x, y);
                if (blockType != "EMPTY") {
                    const xrect: number = offx + x * this.pixelPerField;
                    const yrect: number = offy + y * this.pixelPerField;
                    this.drawRect(ctx, xrect, yrect, blockType);
                    if (blockType === "RANDOMPOINT") {
                        this.drawRandomPoint(ctx, xrect, yrect);
                    }
                }
            }
        }
    }

    private drawRandomPoint(ctx: CanvasRenderingContext2D, xrect: number, yrect: number): void {
        const xgray: number = xrect + this.borderWidth;
        const ygray: number = yrect + this.borderWidth;
        const wgray: number = this.pixelPerField - 2 * this.borderWidth;
        const hgray: number = this.pixelPerField - 2 * this.borderWidth;
        const lineargradient: CanvasGradient = ctx.createLinearGradient(xgray, ygray, xgray, ygray + hgray);
        lineargradient.addColorStop(0, "white");
        lineargradient.addColorStop(1, "black");
        ctx.fillStyle = lineargradient;
        ctx.beginPath();
        ctx.fillRect(xgray, ygray, wgray, hgray);
    }

    private drawBonus(ctx: CanvasRenderingContext2D): void {
        if (this.gameAction!.getState() !== "MOVEBONUS") {
            return;
        }
        const moveBonusAction: MoveBonusAction = this.gameAction as MoveBonusAction;
        const offx: number = this.pixelPerField;
        const offy: number = offx;
        const x: number = offx;
        const y: number = offy + moveBonusAction.bonusY * this.pixelPerField;
        const w: number = this.gameContext!.playground.width * this.pixelPerField;
        const h: number = this.pixelPerField;
        const lineargradient: CanvasGradient = ctx.createLinearGradient(x, y, x, y + h);
        lineargradient.addColorStop(0, "white");
        lineargradient.addColorStop(1, "black");
        ctx.fillStyle = lineargradient;
        ctx.beginPath();
        ctx.fillRect(x, y, w, h);
    }

    private drawDropRow(ctx: CanvasRenderingContext2D): void {
        if (this.gameAction!.getState() !== "DROPONEROW" && this.gameAction!.getState() !== "DROPONEROW_MOVEBONUS") {
            return;
        }
        const dropOneRowAction: DropOneRowAction = this.gameAction as DropOneRowAction;
        const c = dropOneRowAction.animateColor; 
        if (c >= 0) {
            const offx: number = this.pixelPerField;
            const offy: number = offx;
            this.gameContext!.playground.scroll.forEach(row => {
                const x = offx;
                const y = offy + row * this.pixelPerField;
                const w = this.gameContext!.playground.width * this.pixelPerField;
                const h = this.pixelPerField;
                ctx.fillStyle = `rgb(${c},${c},${c})`;
                ctx.fillRect(x, y, w, h);
            });
        }
    }

    private drawStatistics(): void {
        const ctx: CanvasRenderingContext2D = this.canvasStatistics!.getContext("2d")!;
        ctx.clearRect(0, 0, this.canvasStatistics!.width, this.canvasStatistics!.height);
        const w: number = Math.floor(this.canvasStatistics!.width / Playground.COLORS.length);
        const inc: number = 30;
        let diff: number = 0;
        for (let elem of this.gameContext!.statistic) {
            const h = elem[1] * inc;
            const y = this.canvasStatistics!.height - h;
            if (y < diff) {
                diff = y;
            }
        }
        let scale: number = 1;
        if (diff < 0) {
            scale = (this.canvasStatistics!.height) / (this.canvasStatistics!.height + Math.abs(diff));
        }
        let colCnt = 0;
        for (let col of Playground.COLORS) {
            const cnt:number | undefined = this.gameContext!.statistic.get(col);
            if (cnt) {
                const h: number = cnt * inc * scale;
                const x: number = colCnt * w + this.borderWidth;
                const y: number = this.canvasStatistics!.height - h;
                ctx.fillStyle = Game.BLOCK_COLORS[col].center;
                ctx.fillRect(x, y, w - 2 * this.borderWidth, h);
            }
            colCnt++;
        }
    }

    private draw(): void {
        if (this.isPaused || !this.gameContext || !this.gameAction) {
            window.requestAnimationFrame(() => this.draw());
            return;
        }
        this.gameAction = this.gameAction.execute(this.gameContext);
        const ctx: CanvasRenderingContext2D = this.canvas!.getContext("2d")!;
        if (this.gameContext.dirtyBorder) {
            this.drawBorder(ctx);
            this.gameContext.dirtyBorder = false;
        }
        if (this.gameContext.dirtyPlayground && this.gameContext.playground) {
            this.drawPlayground(ctx);
            this.gameContext.dirtyPlayground = false;
        }
        if (this.gameContext.dirtyBlock && this.gameContext.block) {
            this.drawBlock(ctx);
            this.gameContext.dirtyBlock = false;
        }
        if (this.gameContext.dirtyBonus) {
            this.drawBonus(ctx);
            this.gameContext.dirtyBonus = false;
        }
        if (this.gameContext.dirtyDropRow) {
            this.drawDropRow(ctx);
            this.gameContext.dirtyDropRow = false;
        }
        if (this.gameContext.dirtyNextBlock && this.gameContext.nextBlock) {
            const ctxnext: CanvasRenderingContext2D = this.canvasNextBlock!.getContext("2d")!;
            ctxnext.clearRect(0, 0, this.canvasNextBlock!.width, this.canvasNextBlock!.height);
            this.drawNextBlock(ctxnext);
            this.gameContext.dirtyNextBlock = false;
        }
        if (this.gameContext.dirtyInfo) {
            this.levelDiv!.textContent = `Level ${this.gameContext.level + 1}`;
            this.scoreDiv!.textContent = `Score ${this.gameContext.score}`;
            this.linesDiv!.textContent = `Lines ${this.gameContext.lines}`;
            this.remainingDiv!.textContent = this.gameContext!.remainingLines > 0 ? `Remain ${this.gameContext.remainingLines}` : "";
            if (this.gameAction.getState() == "GAMEOVER") {
                this.gameOverDiv!.textContent = "GAME OVER";
                this.gameOverDiv!.style.visibility = "visible";
                this.newGameButton!.style.visibility = "visible";
                this.showHighscoresAsync();
            }
            else if (this.gameAction.getState() == "MOVEBONUS") {
                this.remainingDiv!.textContent = "Congrats!";
            }
            this.gameContext.dirtyInfo = false;
        }
        if (this.gameContext.dirtyStatistics) {
            this.drawStatistics();
            this.gameContext.dirtyStatistics = false;
        }        
        window.requestAnimationFrame(() => this.draw());
    }

    // --- rendering HTML elements

    private createImage(parent: HTMLElement, url: string, size: number, action: string, title: string): void {
        const img: HTMLImageElement = ControlUtils.create(parent, "img") as HTMLImageElement;
        if (title) {
            img.title = title;
        }
        img.src = url;
        img.height = size;
        img.width = size;
        img.addEventListener("mousedown", e => {
            e.preventDefault();
            this.gameContext!.keyPressed = action;
            this.gameContext!.keyPressedMax = 100;
            this.gameContext!.keyPressedCount = this.gameContext!.keyPressedMax;
        });
        img.addEventListener("mouseup", e => {
            e.preventDefault();
            this.gameContext!.keyPressed = undefined;
        });
        img.addEventListener("touchstart", e => {
            e.preventDefault();
            this.gameContext!.keyPressed = action;
            this.gameContext!.keyPressedMax = 100;
            this.gameContext!.keyPressedCount = this.gameContext!.keyPressedMax;
        });
        img.addEventListener("touchend", e => {
            e.preventDefault();
            this.gameContext!.keyPressed = undefined;
        });
        img.addEventListener("touchcancel", e => {
            e.preventDefault();
            this.gameContext!.keyPressed = undefined;
        });
    }

    private onCanvasTouchStart(e: TouchEvent): void {
        e.preventDefault();
        const canvas: HTMLCanvasElement = document.querySelector(".playground") as HTMLCanvasElement;
        const touches: TouchList = e.changedTouches;
        const tetrisBlock: Block | undefined = this.gameContext!.block;
        if (touches.length === 1 && this.isGameRunning() && tetrisBlock) {
            const touch: Touch = touches[0];
            const rect: DOMRect = canvas.getBoundingClientRect();
            const tx: number = touch.clientX - rect.x;
            const ty: number = touch.clientY - rect.y;
            const offx: number = this.pixelPerField;
            const offy: number = offx;
            const points: Point[] = tetrisBlock.getRelativePoints(tetrisBlock.orientation);
            let pminx: number = Number.MAX_SAFE_INTEGER,
                pminy: number = Number.MAX_SAFE_INTEGER,
                pmaxx: number = 0,
                pmaxy: number = 0;
            points.forEach(p => {
                const x: number = offx + (tetrisBlock.x + p.x) * this.pixelPerField;
                const y: number = offy + (tetrisBlock.y + p.y) * this.pixelPerField;
                pminx = Math.min(x, pminx);
                pmaxx = Math.max(x, pmaxx);
                pminy = Math.min(y, pminy);
                pmaxy = Math.max(y, pmaxy);
            });
            this.gameContext!.keyPressed = undefined;
            this.blockTouchY = undefined;
            if (tx >= pminx - this.pixelPerField && tx <= pmaxx + 2 * this.pixelPerField &&
                ty >= pminy - this.pixelPerField && ty <= pmaxy + 2 * this.pixelPerField) {
                this.blockTouchY = touch.clientY;
            }
            else if (tx < pminx) {
                this.gameContext!.keyPressed = "ArrowLeft";
            }
            else if (tx > pmaxx + this.pixelPerField) {
                this.gameContext!.keyPressed = "ArrowRight";
            }
            if (this.gameContext!.keyPressed) {
                this.gameContext!.keyPressedMax = 100;
                this.gameContext!.keyPressedCount = this.gameContext!.keyPressedMax;
            }
        }
    }

    private onCanvasTouchEnd(e: TouchEvent): void {
        e.preventDefault();
        this.gameContext!.keyPressed = undefined;
        const touches: TouchList = e.changedTouches;
        if (this.blockTouchY && this.blockTouchY > 0 && touches.length === 1 && this.isGameRunning()) {
            const touch: Touch = touches[0];
            const diff: number = touch.clientY - this.blockTouchY;
            if (diff < this.pixelPerField) {
                this.gameContext!.keyPressed = "ArrowUp";
                this.gameContext!.canvasArrowUp = true;
            }
            else if (diff > 3 * this.pixelPerField) {
                this.gameContext!.keyPressed = "ArrowDown";
            }
            if (this.gameContext!.keyPressed) {
                this.gameContext!.keyPressedMax = 100;
                this.gameContext!.keyPressedCount = this.gameContext!.keyPressedMax;
            }
        }
        this.blockTouchY = undefined;
    }

    private renderTetris(parent: HTMLElement): void {
        const info: HTMLDivElement = ControlUtils.createDiv(parent, "info");
        this.levelDiv = ControlUtils.createDiv(info);
        this.levelDiv.textContent = `Level ${this.gameContext!.level + 1}`;
        this.scoreDiv = ControlUtils.createDiv(info);
        this.scoreDiv.textContent = `Score ${this.gameContext!.score}`;
        this.linesDiv = ControlUtils.createDiv(info);
        this.linesDiv.textContent = `Lines ${this.gameContext!.lines}`;

        this.gameOverDiv = ControlUtils.createDiv(parent, "gameover");
        this.gameOverDiv.style.visibility = "hidden";

        this.newGameButton = ControlUtils.createButton(parent, "New Game", () => { this.render(new NewBlockAction()); }, "newgame", "newgame");
        this.newGameButton.style.visibility = "hidden";

        const arrowDivLeft: HTMLDivElement = ControlUtils.createDiv(parent, "arrow-left");
        this.createImage(arrowDivLeft, arrowLeft, 32, "ArrowLeft", "Left");
        const arrowDivRight: HTMLDivElement = ControlUtils.createDiv(parent, "arrow-right");
        this.createImage(arrowDivRight, arrowRight, 32, "ArrowRight", "Right");
        const arrowDivUp: HTMLDivElement = ControlUtils.createDiv(parent, "arrow-up");
        this.createImage(arrowDivUp, arrowUp, 32, "ArrowUp", "Rotate");
        const arrowDivDown: HTMLDivElement = ControlUtils.createDiv(parent, "arrow-down");
        this.createImage(arrowDivDown, arrowDown, 32, "ArrowDown", "Drop");

        this.canvas = ControlUtils.create(parent, "canvas", "playground") as HTMLCanvasElement;
        this.canvas.width = this.pixelPerField * (this.gameContext!.playground.width + 2);
        this.canvas.height = this.pixelPerField * (this.gameContext!.playground.height + 2);

        this.canvas.addEventListener("touchstart", (e: TouchEvent) => this.onCanvasTouchStart(e), { passive: false });
        this.canvas.addEventListener("touchend", (e: TouchEvent) => this.onCanvasTouchEnd(e), { passive: false });
        this.canvas.addEventListener("touchcancel", (e: TouchEvent) => this.onCanvasTouchEnd(e), { passive: false });
        this.canvas.addEventListener("touchmove", (e: TouchEvent) => e.preventDefault(), { passive: false });

        this.canvasNextBlock = ControlUtils.create(info, "canvas", "nextblock") as HTMLCanvasElement;
        this.canvasNextBlock.width = this.pixelPerField * 6;
        this.canvasNextBlock.height = this.pixelPerField * 6;

        const remainingDivInfo: HTMLDivElement = ControlUtils.createDiv(info, "remainingInfo");
        this.remainingDiv = ControlUtils.createDiv(remainingDivInfo);

        this.canvasStatistics = ControlUtils.create(parent, "canvas", "statistics") as HTMLCanvasElement;
    }

    private render(startGameAction: GameAction): void {

        this.isPaused = startGameAction.getState() === "NEWBLOCK";

        this.gameAction = startGameAction;

        this.gameContext = {
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
            dirtyDropRow: true,
            dirtyBorder: true,
            dirtyInfo: true,
            dirtyNextBlock: true,
            dirtyPlayground: true,
            dirtyStatistics: true,

            level: 0,
            lines: 0,
            score: 0,
            remainingLines: 0,

            statistic: new Map<BlockType, number>()
        };

        ControlUtils.removeAllChildren(document.body);
        const mainDiv: HTMLDivElement = ControlUtils.createDiv(document.body);
        this.renderTetris(mainDiv);
        if (this.gameAction.getState() === "STARTSCREEN") {
            this.showStartScreen();
        }
        else {
            this.gameContext.remainingLines = Levels.getRemaingLines(0);
        }

        this.isPaused = false;
        this.renderHighScoresAsync(mainDiv);
    }

    private showStartScreen(): void {
        this.newGameButton!.style.visibility = "visible";
        this.gameContext!.dirtyPlayground = true;
        this.gameContext!.dirtyNextBlock = true;
    }

    private renderInit(): void {
        this.render(new StartScreenAction());
        window.requestAnimationFrame(() => this.draw());
    }

    // --- initialization

    private isGameRunning(): boolean {
        return this.gameAction!.getState() != "GAMEOVER" && this.gameAction!.getState() != "STARTSCREEN";
    }

    private initKeyDownEvent(): void {
        document.addEventListener("keydown", e => {
            if (this.isGameRunning()) {
                if (e.key.startsWith("Arrow")) {
                    e.preventDefault();
                }
                if (this.gameContext!.keyPressed != e.key) {
                    this.gameContext!.keyPressed = e.key;
                    this.gameContext!.keyPressedMax = 100;
                    this.gameContext!.keyPressedCount = this.gameContext!.keyPressedMax;
                }
            }
        });
        document.addEventListener("keyup", (e) => {
            if (this.isGameRunning()) {
                if (e.key.startsWith("Arrow")) {
                    e.preventDefault();
                }
                if (e.key == "l") {
                    this.gameContext!.level += 1;
                    this.gameContext!.score = 0;
                    this.gameContext!.lines = 0;
                    this.gameAction = new InitLevelAction(0);
                }
                this.gameContext!.keyPressed = undefined;
            }
            this.isPaused = !this.isPaused && e.key == "p";
        });
    }

    // --- highscore handling
    
    private async showHighscoresAsync(): Promise<void> {
        const resp: Response = await window.fetch("/api/tstetris/highscore");
        if (resp.ok) {
            const json = await resp.json();
            this.highScores = json as HighScoreEntry[];
            if (this.gameContext!.score > 0 && (this.highScores.length < 10 || this.highScores[9].score < this.gameContext!.score)) {
                this.addHighScoreDiv!.style.visibility = "visible";
                this.inputUsername!.focus();
            }
            else {
                this.highScoreDiv!.style.visibility = this.highScores.length > 0 ? "visible" : "hidden";
            }
        }
    }

    private async addHighScoreAsync(): Promise<void> {
        const name = this.inputUsername!.value.trim();
        if (name.length > 0) {
            const requestInit: RequestInit = {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "Name": name,
                    "Score": this.gameContext!.score,
                    "Lines": this.gameContext!.lines,
                    "Level": this.gameContext!.level
                })
            };
            const resp: Response = await window.fetch("/api/tstetris/highscore", requestInit);
            if (resp.ok) {
                this.addHighScoreDiv!.style.visibility = "hidden";
                await this.renderHighScoreEntriesAsync();
            }
        }
        this.highScoreDiv!.style.visibility = this.highScores!.length > 0 ? "visible" : "hidden";
    }

    private async renderHighScoresAsync(parent: HTMLElement): Promise<void> {
        this.highScoreDiv = ControlUtils.createDiv(parent, "highscores");
        this.highScoreDiv.style.visibility = "hidden";
        this.addHighScoreDiv = ControlUtils.createDiv(parent, "addhighscore");
        this.addHighScoreDiv.style.visibility = "hidden";
        const msgDiv: HTMLDivElement = ControlUtils.createDiv(this.addHighScoreDiv, undefined);
        msgDiv.textContent = "Congrats!";
        this.inputUsername = ControlUtils.createInputField(this.addHighScoreDiv, "Name", () => this.addHighScoreAsync(), "username-input", 10, 10);
        await this.renderHighScoreEntriesAsync();
    }

    private async renderHighScoreEntriesAsync(): Promise<void> {
        ControlUtils.removeAllChildren(this.highScoreDiv!);
        this.highScoreDiv!.style.visibility = "hidden";
        const resp: Response = await window.fetch("/api/tstetris/highscore");
        if (resp.ok) {
            const json = await resp.json();
            this.highScores = json as HighScoreEntry[];
            let pos: number = 1;
            this.highScores.forEach(hs => {
                const e: HTMLDivElement = ControlUtils.createDiv(this.highScoreDiv!, "highscore");
                e.textContent = `${pos}. ${hs.name} - ${hs.score}`;
                let lstr = "Lines";
                if (hs.lines == 1) lstr = "Line";
                const dstr = this.format_date_string(hs.created);
                e.title = `Score ${hs.score}. Level ${hs.level + 1}. ${hs.lines} ${lstr}. Game at ${dstr}.`;
                pos++;
            });
            const state: State = this.gameAction!.getState();
            if (this.highScores.length > 0 && (state === "STARTSCREEN" || state === "GAMEOVER")) {
                this.highScoreDiv!.style.visibility = "visible";
            }
        }
    }

    private format_date(dt: any, options?: any, mode?: string): string {
        let d;
        if (typeof dt === "string" && dt.length > 0) {
            d = new Date(dt);
        }
        else if (typeof dt === "object") {
            d = dt;
        }
        if (d) {
            const locale: string = navigator.language;
            if (mode === "time") {
                return d.toLocaleTimeString(locale, options);
            }
            if (mode === "string") {
                return d.toLocaleString(locale, options);
            }
            return d.toLocaleDateString(locale, options);
        }
        return "";
    }    

    private format_date_string(dt: any, options?: any): string {
        return this.format_date(dt, options, "string");
    }

    // --- public API

    init(): void  {
        if (ControlUtils.isMobile()) {
            this.pixelPerField = 18;
            this.borderWidth = 2;
        }
        else {
            this.pixelPerField = 24;
            this.borderWidth = 3;
        }
        this.initKeyDownEvent();
        this.renderInit();
    }

}

// --- window loaded event

const game: Game = new Game();

window.onload = () => game.init();

