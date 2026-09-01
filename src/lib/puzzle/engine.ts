import { makeGrid, makeRng, pieceMargin, piecePath, type Grid } from "./geometry";

/**
 * Canvas jigsaw engine.
 *
 * World units == image pixels. The board sits at (0, 0)-(BW, BH); pieces are
 * scattered on a larger "table" around it. A single view transform
 * (scale + translate) maps world to screen, so pan / pinch-zoom are free.
 *
 * A piece snaps home when it is dropped near its own slot; snapped pieces are
 * locked and drawn underneath the loose ones.
 */

export type Piece = {
  index: number;
  row: number;
  col: number;
  /** World position of the piece's cell top-left corner. */
  x: number;
  y: number;
  placed: boolean;
  /**
   * Pieces joined to each other share a group id and move as one. Every piece
   * starts in a group of its own; groups only ever merge.
   */
  group: number;
  path: Path2D;
  sprite: HTMLCanvasElement;
};

export type EngineOptions = {
  canvas: HTMLCanvasElement;
  image: HTMLImageElement;
  rows: number;
  cols: number;
  seed: number;
  sound?: boolean;
  onProgress?: (placed: number, total: number) => void;
  onComplete?: () => void;
  onChange?: () => void;
};

const TABLE_PAD = 0.45;

export class PuzzleEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private hit: CanvasRenderingContext2D;
  private image: HTMLImageElement;
  private grid: Grid;

  readonly rows: number;
  readonly cols: number;
  readonly boardW: number;
  readonly boardH: number;
  readonly pieceW: number;
  readonly pieceH: number;
  readonly margin: number;

  private pieces: Piece[] = [];
  private loose: Piece[] = [];
  private placedCount = 0;

  private view = { scale: 1, tx: 0, ty: 0 };
  /** Set once the player pans or zooms; stops automatic refitting on resize. */
  private viewTouched = false;
  private pointers = new Map<number, { x: number; y: number }>();
  /**
   * The whole group is dragged. Member positions are recomputed from their
   * start positions plus the pointer delta, so repeated moves cannot drift.
   */
  private drag: {
    members: Piece[];
    starts: { x: number; y: number }[];
    originX: number;
    originY: number;
  } | null = null;
  private pan: { x: number; y: number; tx: number; ty: number } | null = null;
  private pinch: { dist: number; cx: number; cy: number; scale: number; tx: number; ty: number } | null =
    null;

  private frame = 0;
  private dirty = true;
  private dpr = 1;
  private resizeObserver: ResizeObserver | null = null;

  private startedAt = Date.now();
  private accumulatedMs = 0;
  private running = true;

  private preview = false;
  private soundOn: boolean;
  private audio: AudioContext | null = null;

  private options: EngineOptions;

  constructor(options: EngineOptions) {
    this.options = options;
    this.canvas = options.canvas;
    this.image = options.image;
    this.rows = options.rows;
    this.cols = options.cols;
    this.soundOn = options.sound ?? true;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("2d canvas context unavailable");
    this.ctx = ctx;

    const hitCanvas = document.createElement("canvas");
    hitCanvas.width = 1;
    hitCanvas.height = 1;
    this.hit = hitCanvas.getContext("2d")!;

    this.boardW = options.image.naturalWidth || 1200;
    this.boardH = options.image.naturalHeight || 900;
    this.pieceW = this.boardW / this.cols;
    this.pieceH = this.boardH / this.rows;
    this.margin = pieceMargin(this.pieceW, this.pieceH);
    this.grid = makeGrid(this.rows, this.cols, options.seed);

    this.buildPieces();
    this.scatter(makeRng(options.seed ^ 0x9e3779b9));
    this.attach();
    this.resize();
    this.fit();
    this.loop();
  }

  // ------------------------------------------------------------------ setup

  private buildPieces() {
    const spriteScale = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.pieceW + this.margin * 2;
    const h = this.pieceH + this.margin * 2;

    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const path = piecePath(this.grid, row, col, this.pieceW, this.pieceH);
        const sprite = document.createElement("canvas");
        sprite.width = Math.ceil(w * spriteScale);
        sprite.height = Math.ceil(h * spriteScale);

        const sctx = sprite.getContext("2d")!;
        sctx.scale(spriteScale, spriteScale);
        sctx.translate(this.margin, this.margin);

        sctx.save();
        sctx.clip(path);
        sctx.drawImage(
          this.image,
          -col * this.pieceW,
          -row * this.pieceH,
          this.boardW,
          this.boardH,
        );
        // The cut line is drawn *inside* the clip only. An outer stroke would
        // spill half its width onto the neighbouring piece, and two neighbours
        // together would show a seam between assembled pieces.
        sctx.lineWidth = 2;
        sctx.strokeStyle = "rgba(40, 30, 60, 0.22)";
        sctx.stroke(path);
        sctx.restore();

        this.pieces.push({
          index: this.pieces.length,
          row,
          col,
          x: col * this.pieceW,
          y: row * this.pieceH,
          placed: false,
          group: this.pieces.length,
          path,
          sprite,
        });
      }
    }

    this.loose = [...this.pieces];
  }

  /**
   * Spreads loose pieces over the ring of table around the board. Already
   * joined fragments move as a whole — shuffling must never tear them apart.
   */
  scatter(rng = makeRng(Date.now() & 0xffff)) {
    const padX = this.boardW * TABLE_PAD;
    const padY = this.boardH * TABLE_PAD;

    const spot = () => {
      const side = Math.floor(rng() * 4);
      if (side === 0) {
        return {
          x: -padX + rng() * (padX - this.pieceW * 1.2),
          y: -padY + rng() * (this.boardH + padY * 2 - this.pieceH),
        };
      }
      if (side === 1) {
        return {
          x: this.boardW + rng() * (padX - this.pieceW * 1.2),
          y: -padY + rng() * (this.boardH + padY * 2 - this.pieceH),
        };
      }
      if (side === 2) {
        return {
          x: -padX + rng() * (this.boardW + padX * 2 - this.pieceW),
          y: -padY + rng() * (padY - this.pieceH * 1.2),
        };
      }
      return {
        x: -padX + rng() * (this.boardW + padX * 2 - this.pieceW),
        y: this.boardH + rng() * (padY - this.pieceH * 1.2),
      };
    };

    for (const members of this.looseGroups().values()) {
      const anchor = members[0];
      const target = spot();
      this.moveGroup(members, target.x - anchor.x, target.y - anchor.y);
    }

    this.loose = this.pieces.filter((piece) => !piece.placed);
    shuffleInPlace(this.loose, rng);
    this.requestDraw();
    this.options.onChange?.();
  }

  /** Unplaced pieces bucketed by group id. */
  private looseGroups() {
    const groups = new Map<number, Piece[]>();
    for (const piece of this.pieces) {
      if (piece.placed) continue;
      const members = groups.get(piece.group);
      if (members) members.push(piece);
      else groups.set(piece.group, [piece]);
    }
    return groups;
  }

  private membersOf(group: number) {
    return this.pieces.filter((piece) => piece.group === group);
  }

  /**
   * Re-derives every member's position from the first one. Each join adds a
   * tiny floating-point error; without this it would accumulate over the
   * hundreds of joins in a 300-piece board and open visible gaps.
   */
  private normalize(members: Piece[]) {
    const anchor = members[0];
    for (const member of members) {
      member.x = anchor.x + (member.col - anchor.col) * this.pieceW;
      member.y = anchor.y + (member.row - anchor.row) * this.pieceH;
    }
  }

  private moveGroup(members: Piece[], dx: number, dy: number) {
    for (const member of members) {
      member.x += dx;
      member.y += dy;
    }
  }

  private pieceAt(row: number, col: number) {
    if (row < 0 || col < 0 || row >= this.rows || col >= this.cols) return null;
    return this.pieces[row * this.cols + col];
  }

  private attach() {
    const canvas = this.canvas;
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas);
    }
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    const canvas = this.canvas;
    canvas.removeEventListener("pointerdown", this.onPointerDown);
    canvas.removeEventListener("pointermove", this.onPointerMove);
    canvas.removeEventListener("pointerup", this.onPointerUp);
    canvas.removeEventListener("pointercancel", this.onPointerUp);
    canvas.removeEventListener("wheel", this.onWheel);
    this.resizeObserver?.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.audio?.close().catch(() => {});
  }

  // ------------------------------------------------------------------- view

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    // Until the player pans or zooms themselves, keep everything in view —
    // this is what makes rotating a phone feel right.
    if (!this.viewTouched) this.fit();
    this.requestDraw();
  }

  private get tableRect() {
    return {
      x: -this.boardW * TABLE_PAD,
      y: -this.boardH * TABLE_PAD,
      w: this.boardW * (1 + TABLE_PAD * 2),
      h: this.boardH * (1 + TABLE_PAD * 2),
    };
  }

  fit() {
    const rect = this.canvas.getBoundingClientRect();
    const table = this.tableRect;
    const scale = Math.min(rect.width / table.w, rect.height / table.h) * 0.96;
    this.view.scale = scale;
    this.view.tx = rect.width / 2 - (table.x + table.w / 2) * scale;
    this.view.ty = rect.height / 2 - (table.y + table.h / 2) * scale;
    this.viewTouched = false;
    this.requestDraw();
  }

  zoomBy(factor: number, cx?: number, cy?: number) {
    const rect = this.canvas.getBoundingClientRect();
    const x = cx ?? rect.width / 2;
    const y = cy ?? rect.height / 2;
    const next = clamp(this.view.scale * factor, this.minScale(), 4);
    const ratio = next / this.view.scale;
    this.view.tx = x - (x - this.view.tx) * ratio;
    this.view.ty = y - (y - this.view.ty) * ratio;
    this.view.scale = next;
    this.viewTouched = true;
    this.requestDraw();
  }

  private minScale() {
    const rect = this.canvas.getBoundingClientRect();
    const table = this.tableRect;
    return Math.min(rect.width / table.w, rect.height / table.h) * 0.5;
  }

  private toWorld(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this.view.tx) / this.view.scale,
      y: (clientY - rect.top - this.view.ty) / this.view.scale,
    };
  }

  // ------------------------------------------------------------------ input

  private onPointerDown = (event: PointerEvent) => {
    try {
      this.canvas.setPointerCapture(event.pointerId);
    } catch {
      /* synthetic or already-released pointer */
    }
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size === 2) {
      this.drag = null;
      this.pan = null;
      this.startPinch();
      return;
    }
    if (this.pointers.size > 2) return;

    const world = this.toWorld(event.clientX, event.clientY);
    const piece = this.pickPiece(world.x, world.y);

    if (piece) {
      const members = this.membersOf(piece.group);
      this.drag = {
        members,
        starts: members.map((member) => ({ x: member.x, y: member.y })),
        originX: world.x,
        originY: world.y,
      };
      // The whole fragment comes to the front, keeping its internal order.
      const inGroup = new Set(members);
      this.loose = this.loose.filter((item) => !inGroup.has(item)).concat(members);
      this.requestDraw();
    } else {
      const rect = this.canvas.getBoundingClientRect();
      this.pan = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        tx: this.view.tx,
        ty: this.view.ty,
      };
    }
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pinch && this.pointers.size >= 2) {
      this.updatePinch();
      return;
    }

    if (this.drag) {
      const world = this.toWorld(event.clientX, event.clientY);
      const dx = world.x - this.drag.originX;
      const dy = world.y - this.drag.originY;
      this.drag.members.forEach((member, index) => {
        member.x = this.drag!.starts[index].x + dx;
        member.y = this.drag!.starts[index].y + dy;
      });
      this.requestDraw();
      return;
    }

    if (this.pan) {
      const rect = this.canvas.getBoundingClientRect();
      this.view.tx = this.pan.tx + (event.clientX - rect.left - this.pan.x);
      this.view.ty = this.pan.ty + (event.clientY - rect.top - this.pan.y);
      this.viewTouched = true;
      this.requestDraw();
    }
  };

  private onPointerUp = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId);
    try {
      if (this.canvas.hasPointerCapture(event.pointerId)) {
        this.canvas.releasePointerCapture(event.pointerId);
      }
    } catch {
      /* pointer already gone */
    }

    if (this.pointers.size < 2) this.pinch = null;

    if (this.drag) {
      const members = this.drag.members;
      this.drag = null;
      this.settle(members);
      this.options.onChange?.();
    }
    this.pan = null;
  };

  private onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    this.zoomBy(
      event.deltaY < 0 ? 1.12 : 1 / 1.12,
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
  };

  private onVisibility = () => {
    if (document.hidden) this.pauseTimer();
    else this.resumeTimer();
  };

  private startPinch() {
    const [a, b] = [...this.pointers.values()];
    const rect = this.canvas.getBoundingClientRect();
    this.pinch = {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      cx: (a.x + b.x) / 2 - rect.left,
      cy: (a.y + b.y) / 2 - rect.top,
      scale: this.view.scale,
      tx: this.view.tx,
      ty: this.view.ty,
    };
  }

  private updatePinch() {
    if (!this.pinch) return;
    const [a, b] = [...this.pointers.values()];
    const rect = this.canvas.getBoundingClientRect();
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    const cx = (a.x + b.x) / 2 - rect.left;
    const cy = (a.y + b.y) / 2 - rect.top;

    const next = clamp((dist / this.pinch.dist) * this.pinch.scale, this.minScale(), 4);
    const ratio = next / this.pinch.scale;

    this.view.scale = next;
    this.view.tx = cx - (this.pinch.cx - this.pinch.tx) * ratio;
    this.view.ty = cy - (this.pinch.cy - this.pinch.ty) * ratio;
    this.viewTouched = true;
    this.requestDraw();
  }

  private pickPiece(x: number, y: number): Piece | null {
    for (let i = this.loose.length - 1; i >= 0; i -= 1) {
      const piece = this.loose[i];
      if (piece.placed) continue;
      const lx = x - piece.x;
      const ly = y - piece.y;
      if (
        lx < -this.margin ||
        ly < -this.margin ||
        lx > this.pieceW + this.margin ||
        ly > this.pieceH + this.margin
      ) {
        continue;
      }
      if (this.hit.isPointInPath(piece.path, lx, ly)) return piece;
    }
    return null;
  }

  private get snapTolerance() {
    return Math.max(
      Math.min(this.pieceW, this.pieceH) * 0.4,
      14 / Math.max(this.view.scale, 0.01),
    );
  }

  /**
   * Decides what happens to a just-dropped fragment: it either lands on the
   * board, or clicks onto a neighbouring fragment, or stays where it is.
   * Joining can cascade, so this repeats until nothing more connects.
   */
  private settle(dropped: Piece[]) {
    let members = dropped;
    let joined = false;

    for (let pass = 0; pass < this.pieces.length; pass += 1) {
      if (this.landOnBoard(members)) return;

      const join = this.findJoin(members);
      if (!join) break;

      this.moveGroup(members, join.dx, join.dy);
      for (const member of members) member.group = join.group;
      members = this.membersOf(join.group);
      this.normalize(members);
      joined = true;
    }

    if (joined) {
      this.click();
      this.requestDraw();
    }
  }

  /** Snaps the fragment into its slot on the board if any piece is close. */
  private landOnBoard(members: Piece[]) {
    const tolerance = this.snapTolerance;
    let best: { dx: number; dy: number; dist: number } | null = null;

    for (const piece of members) {
      const dx = piece.col * this.pieceW - piece.x;
      const dy = piece.row * this.pieceH - piece.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= tolerance && (!best || dist < best.dist)) best = { dx, dy, dist };
    }
    if (!best) return false;

    // The fragment is rigid, so one piece being in range means every piece is
    // over its own slot. Assign the slots outright rather than translating —
    // that keeps the placed picture free of any rounding drift.
    const inGroup = new Set(members);
    for (const piece of members) {
      piece.x = piece.col * this.pieceW;
      piece.y = piece.row * this.pieceH;
      piece.placed = true;
    }
    this.loose = this.loose.filter((piece) => !inGroup.has(piece));
    this.placedCount += members.length;

    this.click();
    this.requestDraw();
    this.options.onProgress?.(this.placedCount, this.pieces.length);

    if (this.placedCount === this.pieces.length) {
      this.pauseTimer();
      this.fanfare();
      this.options.onComplete?.();
    }
    return true;
  }

  /** Looks for a loose neighbour sitting close to its correct relative offset. */
  private findJoin(members: Piece[]) {
    const tolerance = this.snapTolerance;
    const sides = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const;

    for (const piece of members) {
      for (const [dr, dc] of sides) {
        const neighbour = this.pieceAt(piece.row + dr, piece.col + dc);
        // Placed neighbours are handled by the board check instead.
        if (!neighbour || neighbour.placed || neighbour.group === piece.group) continue;

        const dx = neighbour.x + (piece.col - neighbour.col) * this.pieceW - piece.x;
        const dy = neighbour.y + (piece.row - neighbour.row) * this.pieceH - piece.y;
        if (Math.hypot(dx, dy) <= tolerance) return { dx, dy, group: neighbour.group };
      }
    }
    return null;
  }

  // ------------------------------------------------------------------- draw

  private requestDraw() {
    this.dirty = true;
  }

  private loop = () => {
    if (this.dirty) {
      this.dirty = false;
      this.draw();
    }
    this.frame = requestAnimationFrame(this.loop);
  };

  private draw() {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.translate(this.view.tx, this.view.ty);
    ctx.scale(this.view.scale, this.view.scale);

    // Board slot: a soft frame with an optional ghost of the finished picture.
    // Square corners on purpose — the corner pieces are square, so a rounded
    // slot would not line up with the finished picture.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.boardW, this.boardH);
    ctx.fillStyle = "rgba(128, 122, 150, 0.16)";
    ctx.fill();
    if (this.preview) {
      ctx.save();
      ctx.clip();
      ctx.globalAlpha = 0.32;
      ctx.drawImage(this.image, 0, 0, this.boardW, this.boardH);
      ctx.restore();
    }
    ctx.lineWidth = 2 / this.view.scale;
    ctx.strokeStyle = "rgba(128, 122, 150, 0.4)";
    ctx.stroke();
    ctx.restore();

    for (const piece of this.pieces) {
      if (piece.placed) this.drawPiece(ctx, piece, false);
    }

    // The whole dragged fragment is lifted, not just the piece under the finger.
    const draggedGroup = this.drag?.members[0].group;
    for (const piece of this.loose) {
      this.drawPiece(ctx, piece, draggedGroup !== undefined && piece.group === draggedGroup);
    }
  }

  private drawPiece(ctx: CanvasRenderingContext2D, piece: Piece, lifted: boolean) {
    const w = this.pieceW + this.margin * 2;
    const h = this.pieceH + this.margin * 2;

    if (lifted) {
      ctx.save();
      ctx.shadowColor = "rgba(30, 20, 50, 0.45)";
      ctx.shadowBlur = 18 / this.view.scale;
      ctx.shadowOffsetY = 8 / this.view.scale;
    }

    ctx.drawImage(piece.sprite, piece.x - this.margin, piece.y - this.margin, w, h);

    if (lifted) ctx.restore();
  }

  // ------------------------------------------------------------------ state

  get total() {
    return this.pieces.length;
  }

  get placed() {
    return this.placedCount;
  }

  /** Puts every piece back on the table and restarts the clock. */
  reset() {
    for (const piece of this.pieces) {
      piece.placed = false;
      piece.group = piece.index;
    }
    this.placedCount = 0;
    this.loose = [...this.pieces];
    this.accumulatedMs = 0;
    this.startedAt = Date.now();
    this.running = true;
    this.scatter();
    this.options.onProgress?.(0, this.pieces.length);
  }

  setPreview(on: boolean) {
    this.preview = on;
    this.requestDraw();
  }

  setSound(on: boolean) {
    this.soundOn = on;
  }

  getSeconds() {
    const live = this.running ? Date.now() - this.startedAt : 0;
    return Math.round((this.accumulatedMs + live) / 1000);
  }

  private pauseTimer() {
    if (!this.running) return;
    this.accumulatedMs += Date.now() - this.startedAt;
    this.running = false;
  }

  private resumeTimer() {
    if (this.running || this.placedCount === this.pieces.length) return;
    this.startedAt = Date.now();
    this.running = true;
  }

  serialize() {
    return {
      v: 1 as const,
      seconds: this.getSeconds(),
      pieces: this.pieces.map((piece) => [
        Math.round(piece.x * 100) / 100,
        Math.round(piece.y * 100) / 100,
        piece.placed ? 1 : 0,
        piece.group,
      ]),
    };
  }

  restore(saved: { v: number; seconds: number; pieces: number[][] }) {
    if (saved.v !== 1 || saved.pieces.length !== this.pieces.length) return false;

    this.placedCount = 0;
    this.pieces.forEach((piece, index) => {
      const [x, y, placed, group] = saved.pieces[index];
      piece.x = x;
      piece.y = y;
      piece.placed = placed === 1;
      // Boards saved before fragments existed have no group column.
      piece.group = group ?? index;
      if (piece.placed) this.placedCount += 1;
    });

    this.loose = this.pieces.filter((piece) => !piece.placed);
    this.accumulatedMs = Math.max(0, saved.seconds) * 1000;
    this.startedAt = Date.now();
    this.running = true;
    this.requestDraw();
    this.options.onProgress?.(this.placedCount, this.pieces.length);
    return true;
  }

  // ------------------------------------------------------------------ sound

  /** Lazily opens the audio context. Always called from a user gesture. */
  private ensureAudio() {
    if (!this.soundOn) return null;
    try {
      type AudioCtor = typeof AudioContext;
      const Ctor: AudioCtor | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
      if (!Ctor) return null;
      this.audio ??= new Ctor();
      if (this.audio.state === "suspended") void this.audio.resume();
      return this.audio;
    } catch {
      return null;
    }
  }

  private tone(
    ctx: AudioContext,
    frequency: number,
    at: number,
    length: number,
    peak: number,
    type: OscillatorType,
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + length + 0.05);
  }

  /** Short pluck when a piece snaps home. */
  private click() {
    const ctx = this.ensureAudio();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.09);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      /* audio is a nicety, never a failure */
    }
  }

  /**
   * Victory fanfare: a rising C major arpeggio with a soft octave sparkle over
   * it, ending on a held chord. Synthesised, so it costs no assets.
   */
  private fanfare() {
    const ctx = this.ensureAudio();
    if (!ctx) return;
    try {
      // Starts after the snap click of the final piece has died away.
      const start = ctx.currentTime + 0.14;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
      notes.forEach((frequency, index) => {
        const at = start + index * 0.11;
        const last = index === notes.length - 1;
        const length = last ? 0.85 : 0.3;
        this.tone(ctx, frequency, at, length, last ? 0.2 : 0.13, "triangle");
        this.tone(ctx, frequency * 2, at, length * 0.5, 0.045, "sine");
      });

      // The lower third and fifth join the final note so it lands as a chord.
      const chordAt = start + notes.length * 0.11;
      this.tone(ctx, 523.25, chordAt, 0.9, 0.1, "triangle");
      this.tone(ctx, 659.25, chordAt, 0.9, 0.08, "triangle");
    } catch {
      /* audio is a nicety, never a failure */
    }
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function shuffleInPlace<T>(list: T[], rng: () => number) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
}

