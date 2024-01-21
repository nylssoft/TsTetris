import { Screen, ScreenPoint } from "./Types";

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
    }

}