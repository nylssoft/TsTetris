﻿export type Color = "EMPTY" | "BORDER" | "ORANGE" | "BLUE" | "YELLOW" | "CYAN" | "RED" | "GREEN" | "PURBLE";

export type Row = Array<Color>;

export type Point = {
    x: number;
    y: number;
}

export type Orientation = 0 | 1 | 2 | 3;

export class Playground {
    private readonly rows: Row[];
    private readonly scroll: number[];

    constructor(public readonly width: number, public readonly height: number) {
        this.rows = new Array<Row>(this.height);
        this.scroll = [];
        for (let i: number = 0; i < height; i++) {
            this.rows[i] = new Array<Color>(this.width).fill("EMPTY");
        }
    }

    getRows(): Row[] {
        return this.rows;
    }

    isFree(x: number, y: number): boolean {
        return this.getColor(x, y) === "EMPTY";
    }

    getColor(x: number, y: number): Color {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.rows[y][x];
        }
        return "BORDER";
    }

    setColor(x: number, y: number, c: Color): void {
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
}

export abstract class Block {
    x: number = 0;
    y: number = 0;
    orientation: Orientation = 0;

    constructor(public readonly color: Color) { }

    abstract getRelativePoints(orientation: number): Point[];

    placeFirstRow(playground: Playground): boolean {
        const firstRowsOccupied = playground.getRows()[0].some(c => c !== "EMPTY");
        return !firstRowsOccupied && this._place(playground, 4, 0, 0);
    }

    rotateRight(playground: Playground): boolean {
        return this.move(playground, this.x, this.y, this._getNextRightOrientation());
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
        points.forEach(p => playground.setColor(this.x + p.x, this.y + p.y, this.color));
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

    protected _getNextRightOrientation(): Orientation {
        switch (this.orientation) {
            case 0:
                return 1;
            case 1:
                return 2;
            case 2:
                return 3;
            case 3:
                return 0;
        }
    }
}

export class LBlock extends Block {

    constructor() {
        super("ORANGE");
    }

    rotateRight(playground: Playground): boolean {
        if (!super.rotateRight(playground)) {
            if (this.orientation == 0 && this.x == 0) {
                return this.move(playground, this.x + 1, this.y, this._getNextRightOrientation());
            }
            else if (this.orientation == 2 && this.x == playground.width - 2) {
                if (this.move(playground, this.x - 1, this.y, this._getNextRightOrientation())) {
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
        super("BLUE");
    }

    rotateRight(playground: Playground): boolean {
        if (!super.rotateRight(playground)) {
            if (this.orientation == 0 && this.x == 1) {
                if (this.move(playground, this.x + 1, this.y, this._getNextRightOrientation())) {
                    this.move(playground, this.x - 1, this.y);
                    return true;
                }
            }
            else if (this.orientation == 2 && this.x == playground.width - 1) {
                return this.move(playground, this.x - 1, this.y, this._getNextRightOrientation());
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
        super("YELLOW");
    }

    getRelativePoints(o: Orientation): Point[] {
        return [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
    }
}

export class ZBlock extends Block {
    constructor() {
        super("RED");
    }

    rotateRight(playground: Playground): boolean {
        if (!super.rotateRight(playground)) {
            if ((this.orientation == 1 || this.orientation == 3) && this.x == playground.width - 1) {
                if (this.move(playground, this.x - 1, this.y, this._getNextRightOrientation())) {
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
        super("GREEN");
    }

    rotateRight(playground: Playground): boolean {
        if (!super.rotateRight(playground)) {
            if ((this.orientation == 1 || this.orientation == 3) && this.x == 0) {
                if (this.move(playground, this.x + 1, this.y, this._getNextRightOrientation())) {
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
        super("PURBLE");
    }

    rotateRight(playground: Playground): boolean {
        if (!super.rotateRight(playground)) {
            if (this.orientation == 0 && this.x == playground.width - 1) {
                return this.move(playground, this.x - 1, this.y, this._getNextRightOrientation());
            }
            else if (this.orientation == 2 && this.x == 0) {
                return this.move(playground, this.x + 1, this.y, this._getNextRightOrientation());
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
        super("CYAN");
    }

    rotateRight(playground: Playground): boolean {
        if (!super.rotateRight(playground)) {
            if ((this.orientation == 2 || this.orientation == 0) && this.x < 2) {
                return this.move(playground, 2, this.y, this._getNextRightOrientation());
            }
            else if ((this.orientation == 2 || this.orientation == 0) && this.x == playground.width - 1) {
                return this.move(playground, this.x - 1, this.y, this._getNextRightOrientation());
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

export type ColorEntry = {
    center: string;
    leftright: string;
    top: string;
    bottom: string;
};

export type ColorMap = Map<Color, ColorEntry>;

export type State = "GAMEOVER" | "NEWBLOCK" | "DROPONEROW" | "SOFTDROP" | "MOVEDOWN";