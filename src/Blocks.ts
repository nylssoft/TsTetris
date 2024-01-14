import { BlockType, Orientation, Point } from "./Types.js";
import { Playground } from "./Playground.js";

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

}