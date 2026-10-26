/**
 * Types for Chess Move Calculator & Engine Analysis
 */

export type Square =
  | 'a8' | 'b8' | 'c8' | 'd8' | 'e8' | 'f8' | 'g8' | 'h8'
  | 'a7' | 'b7' | 'c7' | 'd7' | 'e7' | 'f7' | 'g7' | 'h7'
  | 'a6' | 'b6' | 'c6' | 'd6' | 'e6' | 'f6' | 'g6' | 'h6'
  | 'a5' | 'b5' | 'c5' | 'd5' | 'e5' | 'f5' | 'g5' | 'h5'
  | 'a4' | 'b4' | 'c4' | 'd4' | 'e4' | 'f4' | 'g4' | 'h4'
  | 'a3' | 'b3' | 'c3' | 'd3' | 'e3' | 'f3' | 'g3' | 'h3'
  | 'a2' | 'b2' | 'c2' | 'd2' | 'e2' | 'f2' | 'g2' | 'h2'
  | 'a1' | 'b1' | 'c1' | 'd1' | 'e1' | 'f1' | 'g1' | 'h1';

export type PieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

export interface ChessEngineMoveLine {
  id: number;
  multipv: number;
  depth: number;
  scoreCp: number | null; // Centipawns from White's perspective
  mate: number | null;    // Mate in N moves (positive = White wins, negative = Black wins)
  nodes: number;
  nps: number;
  pv: string[];           // Array of UCI moves e.g. ['e2e4', 'e7e5', 'g1f3']
  pvSan: string[];        // Array of SAN moves e.g. ['e4', 'e5', 'Nf3']
  fromSquare: Square;
  toSquare: Square;
  promotion?: string;
  bestMoveUci: string;
  bestMoveSan: string;
}

export interface EngineStatus {
  isCalculating: boolean;
  depth: number;
  maxDepth: number;
  nps: number;
  nodes: number;
  timeMs: number;
  engineName: string;
  isStockfish: boolean;
}

export interface MoveRecord {
  san: string;
  uci: string;
  from: Square;
  to: Square;
  captured?: PieceSymbol;
  promotion?: string;
  fenBefore: string;
  fenAfter: string;
  turn: PieceColor;
  moveNumber: number;
  evalScore?: number | null;
  evalMate?: number | null;
  isBlunder?: boolean;
  evalDrop?: number;
}

export interface OpeningInfo {
  eco: string;
  name: string;
  moves: string;
  description?: string;
}

export type BoardTheme = 'classic' | 'emerald' | 'wood' | 'midnight' | 'ocean';
export type PieceStyle = 'neo' | 'classic' | 'modern';

export interface PresetPosition {
  title: string;
  category: 'opening' | 'tactics' | 'endgame' | 'famous';
  description: string;
  fen: string;
  toMove: 'w' | 'b';
}
