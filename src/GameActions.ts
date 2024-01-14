import { Screen, State } from "./Types.js";
import { Block, IBlock, JBlock, LBlock, OBlock, SBlock, TBlock, ZBlock } from "./Blocks.js";
import { Levels } from "./Levels.js";
import { GameContext } from "./GameContext.js";

export interface GameAction {

    getState(): State;

    execute(gameContext: GameContext): GameAction;
}

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
            return new MoveDownAction();
        }
        // cannot place block => game over
        gc.remainingLines = 0;
        gc.dirtyInfo = true;
        return new GameOverAction();
    }

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
    }

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
                return new SoftDropAction();
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

}

export class DropOneRowAction extends BlockAction {

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

    override getState(): State {
        return "SOFTDROP";
    }

    override execute(gc: GameContext): GameAction {
        if (gc.keyPressed && gc.keyPressed != "ArrowDown") {
            if (gc.keyPressed != "ArrowLeft" && gc.keyPressed != "ArrowRight") {
                gc.keyPressed = undefined;
            }
            return new MoveDownAction();
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