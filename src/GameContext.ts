import { BlockType, Point } from "./Types";
import { Block } from "./Blocks";
import { Playground } from "./Playground";

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
    dirtyDropRow: boolean;
    dirtyInfo: boolean;
    dirtyStatistics: boolean,

    clearPoints: Point[];

    statistic: Map<BlockType, number>;
};