export type BlockType = "EMPTY" | "BORDER" | "ORANGE" | "BLUE" | "YELLOW" | "CYAN" | "RED" | "GREEN" | "PURBLE" | "RANDOMPOINT";

export type Row = Array<BlockType>;

export type Point = {
    x: number;
    y: number;
};

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

