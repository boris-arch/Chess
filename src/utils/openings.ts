import { OpeningInfo } from '../types/chess';

export const OPENINGS_DATABASE: OpeningInfo[] = [
  // E4 openings
  { eco: 'C60', name: 'Ruy Lopez (Spanish Opening)', moves: 'e4 e5 Nf3 Nc6 Bb5' },
  { eco: 'C50', name: 'Italian Game (Giuoco Piano)', moves: 'e4 e5 Nf3 Nc6 Bc4' },
  { eco: 'C55', name: 'Two Knights Defense', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6' },
  { eco: 'C45', name: 'Scotch Game', moves: 'e4 e5 Nf3 Nc6 d4' },
  { eco: 'C42', name: "Petrov's Defense (Russian Game)", moves: 'e4 e5 Nf3 Nf6' },
  { eco: 'C44', name: "King's Knight Opening", moves: 'e4 e5 Nf3' },
  { eco: 'C20', name: "King's Pawn Game", moves: 'e4 e5' },
  { eco: 'C30', name: "King's Gambit", moves: 'e4 e5 f4' },
  { eco: 'C23', name: "Bishop's Opening", moves: 'e4 e5 Bc4' },
  { eco: 'C21', name: 'Center Game', moves: 'e4 e5 d4' },
  { eco: 'C25', name: 'Vienna Game', moves: 'e4 e5 Nc3' },

  // Sicilian Defense
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6' },
  { eco: 'B70', name: 'Sicilian Defense: Dragon Variation', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6' },
  { eco: 'B33', name: 'Sicilian Defense: Sveshnikov Variation', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5' },
  { eco: 'B40', name: 'Sicilian Defense: Paulsen / Kan', moves: 'e4 c5 Nf3 e6' },
  { eco: 'B22', name: 'Sicilian Defense: Alapin Variation (c3)', moves: 'e4 c5 c3' },
  { eco: 'B23', name: 'Sicilian Defense: Closed Sicilian', moves: 'e4 c5 Nc3' },
  { eco: 'B21', name: 'Sicilian Defense: Grand Prix Attack', moves: 'e4 c5 f4' },
  { eco: 'B20', name: 'Sicilian Defense', moves: 'e4 c5' },

  // French Defense
  { eco: 'C10', name: 'French Defense: Winawer / Classical', moves: 'e4 e6 d4 d5 Nc3' },
  { eco: 'C02', name: 'French Defense: Advance Variation', moves: 'e4 e6 d4 d5 e5' },
  { eco: 'C01', name: 'French Defense: Exchange Variation', moves: 'e4 e6 d4 d5 exd5' },
  { eco: 'C03', name: 'French Defense: Tarrasch Variation', moves: 'e4 e6 d4 d5 Nd2' },
  { eco: 'C00', name: 'French Defense', moves: 'e4 e6' },

  // Caro-Kann
  { eco: 'B12', name: 'Caro-Kann Defense: Advance Variation', moves: 'e4 c6 d4 d5 e5' },
  { eco: 'B13', name: 'Caro-Kann Defense: Exchange Variation', moves: 'e4 c6 d4 d5 exd5' },
  { eco: 'B15', name: 'Caro-Kann Defense: Classical / Tartakower', moves: 'e4 c6 d4 d5 Nc3' },
  { eco: 'B10', name: 'Caro-Kann Defense', moves: 'e4 c6' },

  // Other 1.e4
  { eco: 'B01', name: 'Scandinavian Defense', moves: 'e4 d5' },
  { eco: 'B07', name: 'Pirc Defense', moves: 'e4 d6' },
  { eco: 'B02', name: "Alekhine's Defense", moves: 'e4 Nf6' },
  { eco: 'B06', name: 'Modern Defense', moves: 'e4 g6' },

  // 1.d4 Openings
  { eco: 'D30', name: "Queen's Gambit Declined", moves: 'd4 d5 c4 e6' },
  { eco: 'D20', name: "Queen's Gambit Accepted", moves: 'd4 d5 c4 dxc4' },
  { eco: 'D10', name: 'Slav Defense', moves: 'd4 d5 c4 c6' },
  { eco: 'D00', name: "Queen's Pawn Game", moves: 'd4 d5' },
  { eco: 'D02', name: 'London System', moves: 'd4 d5 Nf3 Nf6 Bf4' },
  { eco: 'D02', name: 'London System (Early Bf4)', moves: 'd4 Nf6 Bf4' },
  { eco: 'D06', name: "Queen's Gambit", moves: 'd4 d5 c4' },
  { eco: 'E60', name: "King's Indian Defense", moves: 'd4 Nf6 c4 g6' },
  { eco: 'E20', name: 'Nimzo-Indian Defense', moves: 'd4 Nf6 c4 e6 Nc3 Bb4' },
  { eco: 'E00', name: 'Catalan Opening', moves: 'd4 Nf6 c4 e6 g3' },
  { eco: 'E12', name: "Queen's Indian Defense", moves: 'd4 Nf6 c4 e6 Nf3 b6' },
  { eco: 'A56', name: 'Benoni Defense', moves: 'd4 Nf6 c4 c5' },
  { eco: 'A80', name: 'Dutch Defense', moves: 'd4 f5' },
  { eco: 'A45', name: 'Trompowsky Attack', moves: 'd4 Nf6 Bg5' },

  // Flank Openings
  { eco: 'A10', name: 'English Opening', moves: 'c4' },
  { eco: 'A04', name: 'Réti Opening', moves: 'Nf3' },
  { eco: 'A02', name: "Bird's Opening", moves: 'f4' },
  { eco: 'B00', name: "Nimzowitsch Defense", moves: 'e4 Nc6' },
];

/**
 * Identify opening by matching standard SAN history moves
 */
export function identifyOpening(sanHistory: string[]): OpeningInfo | null {
  if (sanHistory.length === 0) return null;

  const currentMoveStr = sanHistory.join(' ');

  // Look for exact match or longest prefix match
  let bestMatch: OpeningInfo | null = null;
  let maxMatchedLength = 0;

  for (const opening of OPENINGS_DATABASE) {
    if (currentMoveStr === opening.moves) {
      return opening;
    }
    if (currentMoveStr.startsWith(opening.moves + ' ') || currentMoveStr === opening.moves) {
      if (opening.moves.length > maxMatchedLength) {
        maxMatchedLength = opening.moves.length;
        bestMatch = opening;
      }
    }
  }

  return bestMatch;
}
