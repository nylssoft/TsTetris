import { ArrayUtils } from "./ArrayUtils";
import { BlockType, Point, Row } from "./Types"

export class Playground {

    private readonly rows: Row[];

    readonly scroll: number[];

    public static readonly COLORS: BlockType[] = ["BLUE", "CYAN", "GREEN", "ORANGE", "PURBLE", "RED", "YELLOW"];

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
                        return { x: x, y: y - 1 };
                    }
                }
            }
        }
        return undefined;
    }

}
