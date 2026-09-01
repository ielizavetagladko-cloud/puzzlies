import type { DifficultyId } from "@/lib/points";

export type SavedBoard = { v: number; seconds: number; pieces: number[][] };

export function boardKey(puzzleId: string, difficulty: DifficultyId) {
  return `puzzlies.board.${puzzleId}.${difficulty}`;
}

export function loadBoard(key: string): SavedBoard | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as SavedBoard;
  } catch {
    return null;
  }
}

export function saveBoard(key: string, board: SavedBoard) {
  try {
    window.localStorage.setItem(key, JSON.stringify(board));
  } catch {
    /* quota or private mode — the game keeps working, it just will not resume */
  }
}

export function clearBoard(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
