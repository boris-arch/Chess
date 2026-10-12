import { Chess, Square } from 'chess.js';
import { ChessEngineMoveLine, EngineStatus } from '../types/chess';

type EvalCallback = (lines: ChessEngineMoveLine[]) => void;
type StatusCallback = (status: EngineStatus) => void;

class ChessEngineService {
  private worker: Worker | null = null;
  private isCalculating: boolean = false;
  private currentFen: string = '';
  private currentDepth: number = 14;
  private multiPvCount: number = 3;
  private startTime: number = 0;
  private totalNodes: number = 0;
  private currentNps: number = 0;
  private currentCalculatedDepth: number = 0;
  private engineVersionName: string = 'Stockfish 16 (NNUE WebAssembly)';
  private isEngineReady: boolean = false;
  private preferredEngine: 'sf16' | 'sf10' = 'sf16';

  private rawLinesMap: Map<number, {
    depth: number;
    multipv: number;
    scoreCp: number | null;
    mate: number | null;
    nodes: number;
    nps: number;
    pvMoves: string[];
  }> = new Map();

  private throttleTimer: number | null = null;
  private evalCallbacks: Set<EvalCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();

  constructor() {
    this.initEngine(this.preferredEngine);
  }

  public setPreferredEngine(engine: 'sf16' | 'sf10') {
    if (this.preferredEngine === engine && this.worker) return;
    this.preferredEngine = engine;
    this.initEngine(engine);
    if (this.currentFen) {
      this.startAnalysis(this.currentFen, { depth: this.currentDepth, multiPv: this.multiPvCount });
    }
  }

  public getPreferredEngine(): 'sf16' | 'sf10' {
    return this.preferredEngine;
  }

  private initEngine(engineChoice: 'sf16' | 'sf10' = 'sf16') {
    if (typeof window === 'undefined') return;

    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {}
      this.worker = null;
    }

    this.isEngineReady = false;

    if (engineChoice === 'sf16') {
      try {
        // Load Stockfish 16 Single-Threaded NNUE Wasm
        const sf16Worker = new Worker('/stockfish-16.js#stockfish-nnue-16-single.wasm,worker');
        this.engineVersionName = 'Stockfish 16 (NNUE WebAssembly)';

        sf16Worker.onmessage = (event) => {
          this.handleStockfishOutput(event.data);
        };

        sf16Worker.onerror = (err) => {
          console.warn('Stockfish 16 error, falling back to Stockfish 10:', err);
          this.initEngine('sf10');
        };

        sf16Worker.postMessage('uci');
        sf16Worker.postMessage('isready');

        this.worker = sf16Worker;
      } catch (e) {
        console.warn('Failed to start Stockfish 16, falling back to Stockfish 10:', e);
        this.initEngine('sf10');
      }
    } else {
      try {
        // Load Stockfish 10 Wasm
        const sf10Worker = new Worker('/stockfish.js');
        this.engineVersionName = 'Stockfish 10 (WebAssembly)';

        sf10Worker.onmessage = (event) => {
          this.handleStockfishOutput(event.data);
        };

        sf10Worker.onerror = (err) => {
          console.warn('Stockfish 10 worker error:', err);
        };

        sf10Worker.postMessage('uci');
        sf10Worker.postMessage('isready');

        this.worker = sf10Worker;
      } catch (e) {
        console.warn('Failed to start Stockfish 10 worker:', e);
      }
    }
  }

  private handleStockfishOutput(line: string) {
    if (typeof line !== 'string') return;

    if (line.includes('Stockfish 16')) {
      this.engineVersionName = 'Stockfish 16 (NNUE WebAssembly)';
    } else if (line.includes('Stockfish 10')) {
      this.engineVersionName = 'Stockfish 10 (WebAssembly)';
    }

    if (line === 'uciok' || line === 'readyok') {
      this.isEngineReady = true;
      this.broadcastStatus({
        isCalculating: this.isCalculating,
        depth: this.currentCalculatedDepth,
        maxDepth: this.currentDepth,
        nps: this.currentNps,
        nodes: this.totalNodes,
        timeMs: Date.now() - this.startTime,
        engineName: this.engineVersionName,
        isStockfish: true,
      });
      return;
    }

    if (line.startsWith('info depth ')) {
      this.bufferUciLine(line);
    } else if (line.startsWith('bestmove ')) {
      this.flushBufferedUpdates();
      this.isCalculating = false;
      this.broadcastStatus({
        isCalculating: false,
        depth: this.currentCalculatedDepth,
        maxDepth: this.currentDepth,
        nps: this.currentNps,
        nodes: this.totalNodes,
        timeMs: Date.now() - this.startTime,
        engineName: this.engineVersionName,
        isStockfish: true,
      });
    }
  }

  private bufferUciLine(line: string) {
    const depthMatch = line.match(/depth\s+(\d+)/);
    const multiPvMatch = line.match(/multipv\s+(\d+)/);
    const scoreCpMatch = line.match(/score\s+cp\s+(-?\d+)/);
    const scoreMateMatch = line.match(/score\s+mate\s+(-?\d+)/);
    const nodesMatch = line.match(/nodes\s+(\d+)/);
    const npsMatch = line.match(/nps\s+(\d+)/);
    const pvMatch = line.match(/\spv\s+(.+)$/);

    if (!depthMatch || !pvMatch) return;

    const depth = parseInt(depthMatch[1], 10);
    const multiPv = multiPvMatch ? parseInt(multiPvMatch[1], 10) : 1;
    const pvMoves = pvMatch[1].trim().split(/\s+/);
    if (!pvMoves[0] || pvMoves[0].length < 4) return;

    const nodes = nodesMatch ? parseInt(nodesMatch[1], 10) : this.totalNodes;
    const nps = npsMatch ? parseInt(npsMatch[1], 10) : this.currentNps;
    this.totalNodes = nodes;
    this.currentNps = nps;
    this.currentCalculatedDepth = depth;

    let scoreCp: number | null = scoreCpMatch ? parseInt(scoreCpMatch[1], 10) : null;
    let mate: number | null = scoreMateMatch ? parseInt(scoreMateMatch[1], 10) : null;

    this.rawLinesMap.set(multiPv, {
      depth,
      multipv: multiPv,
      scoreCp,
      mate,
      nodes,
      nps,
      pvMoves,
    });

    if (!this.throttleTimer) {
      this.throttleTimer = window.setTimeout(() => {
        this.throttleTimer = null;
        this.flushBufferedUpdates();
      }, 70);
    }
  }

  private flushBufferedUpdates() {
    if (this.rawLinesMap.size === 0) return;

    const sortedRaw = Array.from(this.rawLinesMap.values()).sort((a, b) => a.multipv - b.multipv);

    let isBlackTurn = false;
    try {
      const g = new Chess(this.currentFen);
      isBlackTurn = g.turn() === 'b';
    } catch {}

    const formattedLines: ChessEngineMoveLine[] = [];

    for (const raw of sortedRaw) {
      const bestMoveUci = raw.pvMoves[0];
      const fromSquare = bestMoveUci.substring(0, 2) as Square;
      const toSquare = bestMoveUci.substring(2, 4) as Square;
      const promotion = bestMoveUci.length > 4 ? bestMoveUci[4] : undefined;

      let scoreCp = raw.scoreCp;
      let mate = raw.mate;
      if (isBlackTurn) {
        if (scoreCp !== null) scoreCp = -scoreCp;
        if (mate !== null) mate = -mate;
      }

      const pvSan: string[] = [];
      let bestMoveSan = bestMoveUci;

      try {
        const tempGame = new Chess(this.currentFen);
        for (const mUci of raw.pvMoves.slice(0, 6)) {
          const f = mUci.substring(0, 2) as Square;
          const t = mUci.substring(2, 4) as Square;
          const p = mUci.length > 4 ? mUci[4] : undefined;
          const res = tempGame.move({ from: f, to: t, promotion: p });
          if (res) {
            pvSan.push(res.san);
          } else {
            break;
          }
        }
        if (pvSan.length > 0) {
          bestMoveSan = pvSan[0];
        }
      } catch {}

      formattedLines.push({
        id: raw.multipv,
        multipv: raw.multipv,
        depth: raw.depth,
        scoreCp,
        mate,
        nodes: raw.nodes,
        nps: raw.nps,
        pv: raw.pvMoves,
        pvSan,
        fromSquare,
        toSquare,
        promotion,
        bestMoveUci,
        bestMoveSan,
      });
    }

    this.broadcastEvaluation(formattedLines);

    this.broadcastStatus({
      isCalculating: this.isCalculating,
      depth: this.currentCalculatedDepth,
      maxDepth: this.currentDepth,
      nps: this.currentNps,
      nodes: this.totalNodes,
      timeMs: Date.now() - this.startTime,
      engineName: this.engineVersionName,
      isStockfish: true,
    });
  }

  public startAnalysis(fen: string, options?: { depth?: number; multiPv?: number }) {
    this.stopAnalysis();

    this.currentFen = fen;
    this.currentDepth = options?.depth || 14;
    this.multiPvCount = options?.multiPv || 3;
    this.isCalculating = true;
    this.startTime = Date.now();
    this.totalNodes = 0;
    this.currentCalculatedDepth = 0;
    this.rawLinesMap.clear();

    try {
      const g = new Chess(fen);
      if (g.isGameOver()) {
        this.isCalculating = false;
        let scoreCp: number | null = 0;
        let mate: number | null = null;
        if (g.isCheckmate()) {
          mate = g.turn() === 'w' ? -1 : 1;
          scoreCp = null;
        }
        const dummyLine: ChessEngineMoveLine = {
          id: 1,
          multipv: 1,
          depth: 0,
          scoreCp,
          mate,
          nodes: 0,
          nps: 0,
          pv: [],
          pvSan: [],
          fromSquare: 'e1',
          toSquare: 'e1',
          bestMoveUci: '',
          bestMoveSan: g.isCheckmate() ? 'Checkmate' : 'Draw',
        };
        this.broadcastEvaluation([dummyLine]);
        this.broadcastStatus({
          isCalculating: false,
          depth: 0,
          maxDepth: this.currentDepth,
          nps: 0,
          nodes: 0,
          timeMs: 0,
          engineName: this.engineVersionName,
          isStockfish: true,
        });
        return;
      }
    } catch {}

    if (this.worker) {
      this.worker.postMessage('stop');
      this.worker.postMessage(`setoption name MultiPV value ${this.multiPvCount}`);
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${this.currentDepth}`);
    }
  }

  public stopAnalysis() {
    this.isCalculating = false;
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
    if (this.worker) {
      this.worker.postMessage('stop');
    }
  }

  public async getEngineMove(
    fen: string,
    difficultyLevel: number = 3
  ): Promise<{ from: Square; to: Square; promotion?: string } | null> {
    return new Promise((resolve) => {
      const g = new Chess(fen);
      const moves = g.moves({ verbose: true });
      if (moves.length === 0) {
        resolve(null);
        return;
      }

      if (this.worker && this.isEngineReady) {
        const targetDepth = Math.max(2, Math.min(10, difficultyLevel * 2));
        let resolved = false;

        const handleMsg = (e: MessageEvent) => {
          const text = e.data;
          if (typeof text === 'string' && text.startsWith('bestmove ')) {
            if (resolved) return;
            resolved = true;
            this.worker?.removeEventListener('message', handleMsg);
            const parts = text.split(/\s+/);
            const uci = parts[1];
            if (uci && uci.length >= 4) {
              const from = uci.substring(0, 2) as Square;
              const to = uci.substring(2, 4) as Square;
              const promotion = uci.length > 4 ? uci[4] : undefined;
              resolve({ from, to, promotion });
              return;
            }
            const fallback = moves[Math.floor(Math.random() * moves.length)];
            resolve({ from: fallback.from as Square, to: fallback.to as Square, promotion: fallback.promotion });
          }
        };

        this.worker.addEventListener('message', handleMsg);
        this.worker.postMessage('stop');
        this.worker.postMessage(`position fen ${fen}`);
        this.worker.postMessage(`go depth ${targetDepth}`);

        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            this.worker?.removeEventListener('message', handleMsg);
            const fallback = moves[Math.floor(Math.random() * moves.length)];
            resolve({ from: fallback.from as Square, to: fallback.to as Square, promotion: fallback.promotion });
          }
        }, 1200);
      } else {
        const fallback = moves[Math.floor(Math.random() * moves.length)];
        resolve({ from: fallback.from as Square, to: fallback.to as Square, promotion: fallback.promotion });
      }
    });
  }

  public subscribeEvaluation(cb: EvalCallback) {
    this.evalCallbacks.add(cb);
    return () => this.evalCallbacks.delete(cb);
  }

  public subscribeStatus(cb: StatusCallback) {
    this.statusCallbacks.add(cb);
    return () => this.statusCallbacks.delete(cb);
  }

  private broadcastEvaluation(lines: ChessEngineMoveLine[]) {
    this.evalCallbacks.forEach((cb) => cb(lines));
  }

  private broadcastStatus(status: EngineStatus) {
    this.statusCallbacks.forEach((cb) => cb(status));
  }
}

export const engineService = new ChessEngineService();
