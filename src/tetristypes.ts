// types

export type BlockType = "EMPTY" | "BORDER" | "ORANGE" | "BLUE" | "YELLOW" | "CYAN" | "RED" | "GREEN" | "PURBLE" | "RANDOMPOINT";

export type Row = Array<BlockType>;

export type Point = {
    x: number;
    y: number;
}

export type Orientation = 0 | 1 | 2 | 3;

export type BlockColor = {
    center: string;
    leftright: string;
    top: string;
    bottom: string;
};

export type State =
    "DROPONEROW" |
    "DROPONEROW_MOVEBONUS" |
    "STARTSCREEN" |
    "GAMEOVER" |
    "INITLEVEL" |
    "MOVEDOWN" |
    "MOVEBONUS" |
    "NEWBLOCK" |
    "SOFTDROP";

export type ScreenPoint = [number, number, BlockType];

export type Screen = ScreenPoint[];

export type GameContext = {

    playground: Playground;

    level: number;

    remainingLines: number;

    score: number;
    lines: number;

    block: Block | undefined;
    nextBlock: Block | undefined;

    nextRandomRow: number | undefined;
    nextRandomPoint: number | undefined;

    keyPressed: string | undefined;
    keyPressedCount: number;
    keyPressedMax: number;

    canvasArrowUp: boolean;

    dirtyBorder: boolean;
    dirtyPlayground: boolean;
    dirtyBlock: boolean;
    dirtyNextBlock: boolean;
    dirtyBonus: boolean;
    dirtyInfo: boolean;

    clearPoints: Point[];

};

// game actions

export interface GameAction {

    getState(): State;

    execute(gameContext: GameContext): GameAction;
};

export abstract class BlockAction implements GameAction {

    abstract getState(): State;

    abstract execute(gameContext: GameContext): GameAction;

    protected placeNewBlock(gc: GameContext): GameAction {
        gc.block = undefined;
        gc.clearPoints = [];
        let newBlock: Block;
        if (gc.nextBlock) {
            newBlock = gc.nextBlock;
            gc.nextBlock = BlockAction.createNewBlock();
        }
        else {
            newBlock = BlockAction.createNewBlock();
            gc.nextBlock = BlockAction.createNewBlock();
        }
        if (newBlock.placeFirstRow(gc.playground)) {
            gc.block = newBlock;
            gc.keyPressedCount = 0;
            gc.dirtyBlock = true;
            gc.dirtyNextBlock = true;
            return new MoveDownAction(gc.level);
        }
        // cannot place block => game over
        gc.remainingLines = 0;
        gc.dirtyInfo = true;
        return new GameOverAction();
    };

    static createNewBlock(): Block {
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

}

export class GameOverAction implements GameAction {

    getState(): State {
        return "GAMEOVER";
    }

    execute(gc: GameContext): GameAction {
        return this;
    }

}

export class StartScreenAction implements GameAction {

    getState(): State {
        return "STARTSCREEN";
    }

    execute(gc: GameContext): GameAction {
        return this;
    }

}

export class MoveDownAction extends BlockAction {

    private blockMoveDownCount: number = 0;
    private moveDownFrameCount: number = 0;

    constructor(level: number) {
        super();
    }

    getState(): State {
        return "MOVEDOWN";
    }

    execute(gc: GameContext): GameAction {
        const tetrisBlock = gc.block!;
        let speedcnt = Levels.getSpeed(gc.level);
        if (this.blockMoveDownCount < 3) {
            speedcnt = Levels.getSpeed(Math.min(5, gc.level));
        }
        let skipMoveDown = false;
        if (gc.keyPressed) {
            gc.keyPressedCount++;
            if (gc.keyPressedCount >= gc.keyPressedMax) {
                let update = false;
                if (gc.keyPressed === "ArrowLeft") {
                    update = tetrisBlock.moveLeft(gc.playground);
                }
                else if (gc.keyPressed === "ArrowRight") {
                    update = tetrisBlock.moveRight(gc.playground);
                }
                else if (gc.keyPressed === "ArrowUp" || gc.keyPressed === "a") {
                    update = tetrisBlock.rotate(gc.playground);
                    if (gc.canvasArrowUp) {
                        gc.keyPressed = undefined;
                        gc.canvasArrowUp = false;
                    }
                }
                if (update) {
                    gc.dirtyBlock = true;
                    if (gc.keyPressedMax > 16) {
                        gc.keyPressedMax = 16;
                    }
                    else {
                        gc.keyPressedMax = 6;
                    }
                    gc.keyPressedCount = 0;
                    skipMoveDown = true;
                }
            }
            if (gc.keyPressed === "ArrowDown" || gc.keyPressed === " ") {
                gc.keyPressed = undefined;
                return new SoftDropAction(gc.level);
            }
        }
        if (!skipMoveDown) {
            this.moveDownFrameCount++;
            if (this.moveDownFrameCount >= speedcnt) {
                this.moveDownFrameCount = 0;
                return this.moveDown(gc);
            }
        }
        return this;
    }

    protected moveDown(gc: GameContext): GameAction {
        const tetrisBlock = gc.block!;
        if (tetrisBlock.moveDown(gc.playground)) {
            this.blockMoveDownCount += 1;
            gc.dirtyBlock = true;
            if (gc.nextRandomPoint && Date.now() > gc.nextRandomPoint && gc.playground.getHighestRow() >= gc.playground.height / 2) {
                gc.playground.insertRandomPoint();
                gc.nextRandomPoint = Levels.getNextRandomDate();
                gc.dirtyPlayground = true;
            }
            if (gc.nextRandomRow && Date.now() > gc.nextRandomRow && gc.playground.getHighestRow() >= gc.playground.height / 2) {
                gc.playground.insertRandomRow();
                gc.nextRandomRow = Levels.getNextRandomDate();
                gc.dirtyPlayground = true;
            }
            return this;
        }
        // cannot move down anymore
        // delay stop for soft drop to allow moving block on last line
        if (this.getState() == "SOFTDROP" && gc.keyPressed != "ArrowDown") {
            this.moveDownFrameCount++;
            if (this.moveDownFrameCount < Levels.getSpeed(gc.level)) {
                return this;
            }
            this.moveDownFrameCount = 0;
        }
        gc.keyPressed = undefined;
        tetrisBlock.stop(gc.playground);
        gc.block = undefined;
        gc.clearPoints = [];
        gc.dirtyPlayground = true;
        const scores: number[] = [40, 100, 300, 1200];
        const fullRows: number = gc.playground.clearFullRows();
        if (fullRows > 0) {
            gc.score += scores[fullRows - 1] * (gc.level + 1);
            gc.lines += fullRows;
            gc.remainingLines -= fullRows;
            gc.remainingLines = Math.max(0, gc.remainingLines);
            gc.dirtyInfo = true;
            if (gc.remainingLines === 0) {
                if (gc.playground.hasDropRows()) {
                    return new DropOneRowMoveBonusAction();
                }
                gc.dirtyBonus = true;
                return new MoveBonusAction(gc.playground.getHighestRow() - 1)
            }
        }
        if (gc.playground.hasDropRows()) {
            return new DropOneRowAction();
        }
        return this.placeNewBlock(gc);
    }
};

export class DropOneRowAction extends BlockAction {
    constructor() {
        super();
    }

    getState(): State {
        return "DROPONEROW";
    }

    execute(gc: GameContext): GameAction {
        if (!gc.playground.dropOneRow()) {
            return this.placeNewBlock(gc);
        }
        gc.dirtyPlayground = true;
        return this;
    }
}

export class DropOneRowMoveBonusAction extends DropOneRowAction {

    constructor() {
        super();
    }

    override getState(): State {
        return "DROPONEROW_MOVEBONUS";
    }

    execute(gc: GameContext): GameAction {
        if (!gc.playground.dropOneRow()) {
            return new MoveBonusAction(gc.playground.getHighestRow() - 1);
        }
        gc.dirtyPlayground = true;
        return this;
    }
}
export class SoftDropAction extends MoveDownAction {

    constructor(level: number) {
        super(level);
    }

    override getState(): State {
        return "SOFTDROP";
    }

    override execute(gc: GameContext): GameAction {
        if (gc.keyPressed && gc.keyPressed != "ArrowDown") {
            if (gc.keyPressed != "ArrowLeft" && gc.keyPressed != "ArrowRight") {
                gc.keyPressed = undefined;
            }
            return new MoveDownAction(gc.level);
        }
        return this.moveDown(gc);
    }

}

export class MoveBonusAction extends BlockAction {

    private bonusMaxY: number;
    private moveDownFrameCount: number = 0;
    constructor(maxY: number, public bonusY: number = -1) {
        super();
        this.bonusMaxY = maxY;
    }

    getState(): State {
        return "MOVEBONUS";
    }

    execute(gc: GameContext): GameAction {
        this.moveDownFrameCount++;
        if (this.moveDownFrameCount >= 10) {
            this.moveDownFrameCount = 0;
            if (this.bonusY >= this.bonusMaxY) {
                gc.level += 1;
                return new InitLevelAction(60);
            }
            gc.dirtyBonus = true;
            gc.score += (gc.level + 1) * 50;
            gc.dirtyInfo = true;
            this.bonusY++;
        }
        return this;
    }
}

export class NewBlockAction extends BlockAction {
    constructor() {
        super();
    }

    getState(): State {
        return "NEWBLOCK";
    }

    execute(gc: GameContext): GameAction {
        return this.placeNewBlock(gc);
    }

}
export class InitLevelAction implements GameAction {

    private delayCnt: number;

    constructor(delayCnt: number) {
        this.delayCnt = delayCnt;
    }

    getState(): State {
        return "INITLEVEL";
    }

    execute(gc: GameContext): GameAction {
        this.delayCnt -= 1;
        if (this.delayCnt <= 0) {
            gc.remainingLines = Levels.getRemaingLines(gc.level);
            gc.nextRandomPoint = Levels.getNextDateRandomPoint(gc.level);
            gc.nextRandomRow = Levels.getNextDateRandomRow(gc.level);
            gc.playground.clear();
            const screen: Screen | undefined = Levels.getScreen(gc.level);
            if (screen) {
                screen.forEach(t => gc.playground.setBlockType(t[0], t[1], t[2]));
            }
            gc.dirtyPlayground = true;
            gc.dirtyInfo = true;
            return new NewBlockAction();
        }
        return this;
    }

}

// classes

export class ArrayUtils {

    static shuffle(arr: number[]): void {
        let ridx;
        let tmp;
        let cidx = arr.length;
        while (0 !== cidx) {
            ridx = Math.floor(Math.random() * cidx);
            cidx -= 1;
            tmp = arr[cidx];
            arr[cidx] = arr[ridx];
            arr[ridx] = tmp;
        }
    }

    static buildRange(start: number, stop: number): number[] {
        return Array.from({ length: (stop - start) + 1 }, (_value, index) => start + index);
    }
}

export class Playground {

    private readonly rows: Row[];

    private readonly scroll: number[];

    private static readonly COLORS: BlockType[] = ["BLUE", "CYAN", "GREEN", "ORANGE", "PURBLE", "RED", "YELLOW"];

    constructor(public readonly width: number, public readonly height: number) {
        this.rows = new Array<Row>(this.height);
        this.scroll = [];
        for (let i: number = 0; i < height; i++) {
            this.rows[i] = new Array<BlockType>(this.width).fill("EMPTY");
        }
    }

    getRows(): Row[] {
        return this.rows;
    }

    isFree(x: number, y: number): boolean {
        return this.getBlockType(x, y) === "EMPTY";
    }

    getBlockType(x: number, y: number): BlockType {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.rows[y][x];
        }
        return "BORDER";
    }

    setBlockType(x: number, y: number, c: BlockType): void {
        this.rows[y][x] = c;
    }

    clearFullRows(): number {
        let fullRows: number = 0;
        for (let y: number = 0; y < this.height; y++) {
            let hasFree: boolean = this.rows[y].some(c => c === "EMPTY");
            if (!hasFree) {
                fullRows += 1;
                this.scroll.push(y);
                for (let x: number = 0; x < this.width; x++) {
                    this.rows[y][x] = "EMPTY";
                }
            }
        }
        return fullRows;
    }

    hasDropRows(): boolean {
        return this.scroll.length > 0;
    }

    dropOneRow(): boolean {
        let y: number | undefined = this.scroll.shift();
        if (y) {
            while (y > 0) {
                for (let x: number = 0; x < this.width; x++) {
                    this.rows[y][x] = this.rows[y - 1][x];
                }
                y -= 1;
            }
            return true;
        }
        return false;
    }

    clear(): void {
        for (let y: number = 0; y < this.height; y++) {
            for (let x: number = 0; x < this.width; x++) {
                this.rows[y][x] = "EMPTY";
            }
        }
    }

    insertRandomRow(): void {
        for (let y: number = 1; y < this.height; y++) {
            for (let x: number = 0; x < this.width; x++) {
                this.rows[y - 1][x] = this.rows[y][x];
            }
        }
        for (let x: number = 0; x < this.width; x++) {
            this.rows[this.height - 1][x] = "EMPTY";
        }
        let arr: number[] = ArrayUtils.buildRange(0, this.width - 1);
        ArrayUtils.shuffle(arr);
        arr = arr.slice(0, arr.length - 1 - Math.floor(Math.random() * 3));
        arr.forEach(x => this.rows[this.height - 1][x] = Playground.getRandomColor());
    }

    insertRandomPoint(): void {
        const p: Point | undefined = this.getRandomPoint();
        if (p) {
            this.rows[p.y][p.x] = "RANDOMPOINT";
        }
    }

    getHighestRow(): number {
        for (let y: number = 0; y < this.height; y++) {
            for (let x: number = 0; x < this.width; x++) {
                if (this.rows[y][x] != "EMPTY") {
                    return y;
                }
            }
        }
        return 0;
    }

    static getRandomColor(): BlockType {
        return Playground.COLORS[Math.floor(Math.random() * this.COLORS.length)];
    }

    private getRandomPoint(): Point | undefined {
        const arr: number[] = ArrayUtils.buildRange(0, this.width - 1);
        ArrayUtils.shuffle(arr);
        while (arr.length > 0) {
            const x: number = arr.pop()!;
            for (let y: number = 1; y <= this.height; y++) {
                if (y === this.height || this.rows[y][x] !== "EMPTY") {
                    if (x > 0 && this.rows[y - 1][x - 1] === "EMPTY" || x < this.width - 1 && this.rows[y - 1][x + 1] === "EMPTY") {
                        return { x: x, y: y - 1};
                    }
                }
            }
        }
        return undefined;
    }

}

export abstract class Block {
    constructor(public readonly blockType: BlockType, public x: number, public y: number, public orientation: Orientation) { }

    abstract getRelativePoints(orientation: number): Point[];

    placeFirstRow(playground: Playground): boolean {
        const firstRowsOccupied = playground.getRows()[0].some(c => c !== "EMPTY");
        return !firstRowsOccupied && this._place(playground, this.x, this.y, this.orientation);
    }

    rotate(playground: Playground): boolean {
        return this.move(playground, this.x, this.y, this._getNextOrientation());
    }

    move(playground: Playground, x?: number, y?: number, o?: Orientation): boolean {
        if (o === undefined) {
            o = this.orientation;
        }
        if (y === undefined) {
            y = this.y;
        }
        x = (x === undefined) ? this.x : x;
        if (this._place(playground, x, y, o)) {
            return true;
        }
        return false;
    }

    moveLeft(playground: Playground): boolean {
        return this._place(playground, this.x - 1, this.y, this.orientation);
    }

    moveRight(playground: Playground): boolean {
        return this._place(playground, this.x + 1, this.y, this.orientation);
    }

    moveDown(playground: Playground): boolean {
        return this._place(playground, this.x, this.y + 1, this.orientation);
    }

    stop(playground: Playground) {
        const points: Point[] = this.getRelativePoints(this.orientation);
        points.forEach(p => playground.setBlockType(this.x + p.x, this.y + p.y, this.blockType));
    }

    protected _place(playground: Playground, x: number, y: number, orientation: Orientation): boolean {
        if (this._canPlace(playground, x, y, orientation)) {
            this.x = x;
            this.y = y;
            this.orientation = orientation;
            return true;
        }
        return false;
    }

    protected _canPlace(playground: Playground, x: number, y: number, orientation: Orientation) {
        const points = this.getRelativePoints(orientation);
        const isBlocked = points.some(p => !playground.isFree(x + p.x, y + p.y));
        return !isBlocked;
    }

    protected _getNextOrientation(): Orientation {
        switch (this.orientation) {
            case 0:
                return 3;
            case 1:
                return 0;
            case 2:
                return 1;
            case 3:
                return 2;
        }
    }

}

export class LBlock extends Block {

    constructor() {
        super("PURBLE", 3, 0, 3);
    }

    rotate(playground: Playground): boolean {
        if (!super.rotate(playground)) {
            console.log(this);
            if (this.orientation == 2 && this.x == 0) {
                return this.move(playground, this.x + 1, this.y, this._getNextOrientation());
            }
            else if (this.orientation == 0 && this.x == playground.width - 2) {
                if (this.move(playground, this.x - 1, this.y, this._getNextOrientation())) {
                    this.move(playground, this.x + 1, this.y);
                    return true;
                }
            }
            return false;
        }
        return true;
    }

    getRelativePoints(o: Orientation): Point[] {
        switch (o) {
            case 0:
                return [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }];
            case 1:
                return [{ x: -1, y: 2 }, { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 1, y: 1 }];
            case 2:
                return [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }];
            case 3:
                return [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }];
        }
    }
}

export class JBlock extends Block {
    constructor() {
        super("YELLOW", 5, 0, 1);
    }

    rotate(playground: Playground): boolean {
        if (!super.rotate(playground)) {
            console.log(this);
            if (this.orientation == 2 && this.x == 1) {
                if (this.move(playground, this.x + 1, this.y, this._getNextOrientation())) {
                    this.move(playground, this.x - 1, this.y);
                    return true;
                }
            }
            else if (this.orientation == 0 && this.x == playground.width - 1) {
                return this.move(playground, this.x - 1, this.y, this._getNextOrientation());
            }
            return false;
        }
        return true;
    }

    getRelativePoints(o: Orientation): Point[] {
        switch (o) {
            case 0:
                return [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: -1, y: 1 }, { x: -1, y: 2 }];
            case 1:
                return [{ x: -2, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }];
            case 2:
                return [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: -1, y: 2 }];
            case 3:
                return [{ x: -1, y: 1 }, { x: -1, y: 2 }, { x: 0, y: 2 }, { x: 1, y: 2 }];
        }
    }
}

export class OBlock extends Block {
    constructor() {
        super("BLUE", 4, 0, 0);
    }

    getRelativePoints(o: Orientation): Point[] {
        return [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
    }
}

export class ZBlock extends Block {
    constructor() {
        super("ORANGE", 4, 0, 0);
    }

    rotate(playground: Playground): boolean {
        if (!super.rotate(playground)) {
            if ((this.orientation == 1 || this.orientation == 3) && this.x == playground.width - 1) {
                if (this.move(playground, this.x - 1, this.y, this._getNextOrientation())) {
                    this.move(playground, this.x + 1, this.y);
                    return true;
                }
            }
            return false;
        }
        return true;
    }

    getRelativePoints(o: Orientation): Point[] {
        switch (o) {
            case 0:
            case 2:
                return [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
            case 1:
            case 3:
                return [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 2 }];
        }
    }
}

export class SBlock extends Block {
    constructor() {
        super("CYAN", 4, 0, 0);
    }

    rotate(playground: Playground): boolean {
        if (!super.rotate(playground)) {
            if ((this.orientation == 1 || this.orientation == 3) && this.x == 0) {
                if (this.move(playground, this.x + 1, this.y, this._getNextOrientation())) {
                    this.move(playground, this.x - 1, this.y);
                    return true;
                }
            }
            return false;
        }
        return true;
    }

    getRelativePoints(o: Orientation): Point[] {
        switch (o) {
            case 0:
            case 2:
                return [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }];
            case 1:
            case 3:
                return [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }];
        }
    }
}

export class TBlock extends Block {
    constructor() {
        super("GREEN", 4, -1, 3);
    }

    rotate(playground: Playground): boolean {
        if (!super.rotate(playground)) {
            if (this.orientation == 0 && this.x == playground.width - 1) {
                return this.move(playground, this.x - 1, this.y, this._getNextOrientation());
            }
            else if (this.orientation == 2 && this.x == 0) {
                return this.move(playground, this.x + 1, this.y, this._getNextOrientation());
            }
            else if (this.orientation == 3 && this.y == -1) {
                return this.move(playground, this.x, this.y + 1, this._getNextOrientation());
            }
            return false;
        }
        return true;
    }

    getRelativePoints(o: Orientation): Point[] {
        switch (o) {
            case 0:
                return [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: -1, y: 1 }];
            case 1:
                return [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 1 }, { x: 1, y: 1 }];
            case 2:
                return [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 2 }];
            case 3:
                return [{ x: 0, y: 1 }, { x: -1, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 2 }];
        }
    }

}

export class IBlock extends Block {
    constructor() {
        super("RED", 5, -2, 1);
    }

    rotate(playground: Playground): boolean {
        if (!super.rotate(playground)) {
            if ((this.orientation == 2 || this.orientation == 0) && this.x < 2) {
                return this.move(playground, 2, this.y, this._getNextOrientation());
            }
            else if ((this.orientation == 2 || this.orientation == 0) && this.x == playground.width - 1) {
                return this.move(playground, this.x - 1, this.y, this._getNextOrientation());
            }
            else if ((this.orientation == 1 || this.orientation == 3) && this.y < 0) {
                return this.move(playground, this.x, 0, this._getNextOrientation());
            }
            return false;
        }
        return true;
    }

    getRelativePoints(o: Orientation): Point[] {
        switch (o) {
            case 0:
            case 2:
                return [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }];
            case 1:
            case 3:
                return [{ x: 0, y: 2 }, { x: -1, y: 2 }, { x: -2, y: 2 }, { x: 1, y: 2 }];
        }
    }
};

export class Levels {

    private static readonly SCREEN_LEFT_RIGHT: ScreenPoint[] = [
        [0, 19, "RED"],
        [0, 18, "CYAN"],
        [0, 17, "YELLOW"],
        [0, 16, "GREEN"],
        [0, 15, "ORANGE"],
        [0, 14, "PURBLE"],
        [0, 13, "BLUE"],
        [0, 12, "RED"],
        [9, 19, "GREEN"],
        [9, 18, "ORANGE"],
        [9, 17, "PURBLE"],
        [9, 16, "BLUE"],
        [9, 15, "RED"],
        [9, 14, "CYAN"],
        [9, 13, "YELLOW"],
        [9, 12, "GREEN"]];

    private static readonly SCREEN_CHAOS: ScreenPoint[] = [
        [1, 19, "GREEN"], [6, 19, "BLUE"],
        [3, 18, "ORANGE"], [8, 18, "RED"],
        [5, 17, "CYAN"],
        [2, 16, "BLUE"], [6, 16, "YELLOW"], [7, 16, "PURBLE"],
        [0, 15, "RED"], [4, 15, "GREEN"]
    ];

    private static readonly SCREEN_PYRAMID: ScreenPoint[] = [
        [0, 19, "BLUE"], [1, 19, "YELLOW"], [3, 19, "PURBLE"], [4, 19, "CYAN"], [5, 19, "ORANGE"], [6, 19, "RED"], [8, 19, "GREEN"], [9, 19, "BLUE"],
        [1, 18, "YELLOW"], [2, 18, "PURBLE"], [4, 18, "CYAN"], [5, 18, "ORANGE"], [7, 18, "RED"], [8, 18, "GREEN"],
        [2, 17, "ORANGE"], [3, 17, "RED"], [6, 17, "GREEN"], [7, 17, "BLUE"],
        [3, 16, "BLUE"], [4, 16, "YELLOW"], [5, 16, "PURBLE"], [6, 16, "CYAN"],
        [4, 15, "RED"], [5, 15, "GREEN"]
    ];

    private static readonly SCREEN_ARROWS: ScreenPoint[] = [
        [0, 19, "GREEN"], [9, 19, "PURBLE"],
        [0, 18, "ORANGE"], [1, 18, "RED"], [8, 18, "RED"], [9, 18, "BLUE"],
        [0, 17, "YELLOW"], [1, 17, "PURBLE"], [2, 17, "CYAN"], [7, 17, "GREEN"], [8, 17, "YELLOW"], [9, 17, "CYAN"],
        [0, 16, "GREEN"], [1, 16, "BLUE"], [8, 16, "PURBLE"], [9, 16, "ORANGE"],
        [0, 15, "RED"], [9, 15, "BLUE"]
    ];

    private static readonly SCREEN_BALL: ScreenPoint[] = [
        [4, 18, "BLUE"], [5, 18, "PURBLE"],
        [2, 16, "CYAN"], [7, 16, "RED"],
        [4, 14, "GREEN"], [5, 14, "YELLOW"]
    ];

    private static readonly SCREEN_STAIRS: ScreenPoint[] = [
        [0, 19, "BLUE"], [7, 19, "YELLOW"],
        [1, 18, "BLUE"], [8, 18, "YELLOW"],
        [2, 17, "BLUE"], [9, 17, "YELLOW"],
        [3, 16, "BLUE"], [6, 16, "GREEN"],
        [7, 15, "GREEN"],
        [0, 14, "RED"], [8, 14, "GREEN"],
        [1, 13, "RED"]
    ];

    private static readonly SCREEN_TET: ScreenPoint[] = [
        [1, 19, "RED"], [3, 19, "GREEN"], [4, 19, "GREEN"], [5, 19, "GREEN"], [7, 19, "BLUE"],
        [1, 18, "RED"], [3, 18, "GREEN"], [7, 18, "BLUE"],
        [1, 17, "RED"], [3, 17, "GREEN"], [4, 17, "GREEN"], [7, 17, "BLUE"],
        [1, 16, "RED"], [3, 16, "GREEN"], [7, 16, "BLUE"],
        [0, 15, "RED"], [1, 15, "RED"], [2, 15, "RED"], [3, 15, "GREEN"], [4, 15, "GREEN"], [5, 15, "GREEN"], [6, 15, "BLUE"], [7, 15, "BLUE"], [8, 15, "BLUE"]
    ];

    private static readonly SCREEN_RIS: ScreenPoint[] = [
        [0, 19, "RED"], [2, 19, "RED"], [3, 19, "GREEN"], [4, 19, "GREEN"], [5, 19, "GREEN"], [6, 19, "BLUE"], [7, 19, "BLUE"],
        [0, 18, "RED"], [1, 18, "RED"], [4, 18, "GREEN"], [8, 18, "BLUE"],
        [0, 17, "RED"], [1, 17, "RED"], [2, 17, "RED"], [4, 17, "GREEN"], [7, 17, "BLUE"],
        [0, 16, "RED"], [2, 16, "RED"], [4, 16, "GREEN"], [6, 16, "BLUE"],
        [0, 15, "RED"], [1, 15, "RED"], [2, 15, "RED"], [3, 15, "GREEN"], [4, 15, "GREEN"], [5, 15, "GREEN"], [7, 15, "BLUE"], [8, 15, "BLUE"]
    ];

    private static readonly SCREENS: Screen[] = [
        Levels.SCREEN_LEFT_RIGHT,
        Levels.SCREEN_CHAOS,
        Levels.SCREEN_PYRAMID,
        Levels.SCREEN_ARROWS,
        Levels.SCREEN_BALL,
        Levels.SCREEN_STAIRS,
        Levels.SCREEN_TET,
        Levels.SCREEN_RIS];

    private static readonly LINES_PER_LEVEL: number[] = [5, 10, 12, 10, 13, 16, 12, 15, 18];

    private static readonly SPEEDS: number[] = [
        48, // level 1
        43, // level 2
        38, // level 3
        33, // level 4
        28, // level 5
        23, // level 6
        18, // level 7
        13, // level 8
        8,  // level 9
        6, 6, 6, 6, 6, 6, 6, 6, 6, // level 10 - 18
        5, 5, 5, 5, 5, 5, 5, 5, // level 19 - 27
        4, 4, 4, 4, 4, 4, 4, 4, // level 28 - 36
        3, 3, 3, 3, 3, 3, 3, 3, // level 37 - 45
    ];

    static getSpeed(level: number): number {
        return level < Levels.SPEEDS.length ? Levels.SPEEDS[level] : 2;
    }

    static getRemaingLines(level: number): number {
        if (level < Levels.LINES_PER_LEVEL.length) {
            return Levels.LINES_PER_LEVEL[level];
        }
        return Levels.LINES_PER_LEVEL[level % 3 + 6];
    }

    static getScreen(level: number): Screen | undefined {
        if (level >= 3 && level <= 5) {
            return Levels.SCREENS[level - 3];
        }
        if (level >= 12 && level < 17) {
            return Levels.SCREENS[level - 9];
        }
        if (level === 17) {
            return Levels.SCREEN_TET;
        }
        if (level > 17) {
            return Levels.SCREENS[(level - 18) % Levels.SCREENS.length];
        }
        return undefined;
    }

    static getNextDateRandomPoint(level: number): number | undefined {
        if (level >= 6 && level <= 8 || level > 17) {
            return this.getNextRandomDate();
        }
        return undefined;
    }

    static getNextDateRandomRow(level: number): number | undefined {
        if (level >= 9 && level <= 11 || level >= 26) {
            return this.getNextRandomDate();
        }
        return undefined;
    }

    static getNextRandomDate = (): number => {
        return Date.now() + Math.floor(Math.random() * 5000) + 5000; // 5 to 10 seconds
    };

}