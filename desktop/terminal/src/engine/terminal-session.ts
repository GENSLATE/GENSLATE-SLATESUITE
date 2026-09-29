/**
 * One pane's terminal: an xterm.js instance with its add-ons, bound to a shell in the backend.
 * It lives outside React: panes re-parent freely when splits change (the xterm element moves
 * with them) and the shell keeps running until the pane is closed.
 *
 * Shell integration (OSC 133 / 633 / 7) turns the output into command blocks: each finished
 * command gets a gutter mark (green or red, with its duration), an overview-ruler tick, and
 * failed ones a small "Explain" chip (an AI preview).
 */
import type { ThemeId } from '@genslate/tokens';
import { ClipboardAddon, type IClipboardProvider } from '@xterm/addon-clipboard';
import { FitAddon } from '@xterm/addon-fit';
import { ImageAddon } from '@xterm/addon-image';
import { SearchAddon } from '@xterm/addon-search';
import { SerializeAddon } from '@xterm/addon-serialize';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import { type IDecoration, type IMarker, type ITerminalOptions, Terminal } from '@xterm/xterm';
import type { TerminalBackend } from '../ipc/terminal.client';
import type { CursorStyle, HostPlatform, Profile } from '../ipc/terminal.types';
import { binaryBytes, concatBytes, utf8Bytes } from '../model/bytes.util';
import { formatDuration } from '../model/format.util';
import {
  parseCommandLine,
  parseCwdUri,
  parseOsc9Cwd,
  parsePromptMark,
  printable,
} from '../model/osc.util';
import { withoutControlCharacters } from '../model/paste.util';
import { type FinishedCommand, initialPaneState, type PaneStore } from './pane-store';
import { findPaths } from './path-links.util';
import { MONO_FONT_STACK, markColors, xtermTheme } from './xterm-theme.util';

/** Options every pane shares (from settings and the theme). */
export interface TerminalLook {
  readonly theme: ThemeId;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly cursorStyle: CursorStyle;
  readonly cursorBlink: boolean;
  readonly scrollback: number;
}

/** What a session asks of the window around it. */
export interface SessionHost {
  readonly backend: TerminalBackend;
  readonly store: PaneStore;
  readonly platform: HostPlatform;
  /** Keys the app handles (its shortcuts) instead of the shell. */
  isAppShortcut(event: KeyboardEvent): boolean;
  /** Typed input as bytes: the host decides which panes it goes to (broadcast). */
  onInput(paneId: string, bytes: Uint8Array): void;
  /** A paste the host may want to review first. */
  onPaste(paneId: string, text: string): void;
  onCommandFinished(paneId: string, command: FinishedCommand): void;
  /** A `#` typed at an empty prompt: the natural-language bar (a preview). */
  onNaturalLanguage(paneId: string): void;
  onExplain(paneId: string, command: FinishedCommand): void;
  onOpenUrl(url: string): void;
  onOpenPath(paneId: string, path: string): void;
  onFocus(paneId: string): void;
  copyOnSelect(): boolean;
  visualBell(): boolean;
}

interface Block {
  readonly prompt: IMarker;
  output: IMarker | null;
  command: string;
  startedAt: number;
  running: IDecoration | null;
}

/** A completed command block, kept for navigation and "copy output". */
interface DoneBlock {
  readonly prompt: IMarker;
  readonly output: IMarker | null;
  readonly end: IMarker | undefined;
  readonly info: FinishedCommand;
  readonly decorations: readonly IDecoration[];
}

const MAX_BLOCKS = 500;
/** The most text a program may put on the clipboard at once (OSC 52). */
const MAX_CLIPBOARD_WRITE = 1024 * 1024;

export class TerminalSession {
  readonly id: string;
  readonly profile: Profile;
  readonly term: Terminal;
  readonly #host: SessionHost;
  readonly #element: HTMLDivElement;
  readonly #fit = new FitAddon();
  readonly #search = new SearchAddon({ highlightLimit: 2000 });
  readonly #serialize = new SerializeAddon();
  #theme: ThemeId;
  #opened = false;
  #started = false;
  #disposed = false;
  #observer: ResizeObserver | null = null;
  #fitFrame = 0;
  #container: HTMLElement | null = null;
  #block: Block | null = null;
  readonly #blocks: DoneBlock[] = [];
  /** At a prompt with nothing typed yet (for the `#` bar). */
  #atEmptyPrompt = false;
  /** Text echoed after the prompt, the command line when the shell doesn't send OSC 633. */
  #echo = '';
  #inPrompt = false;
  #bellTimer: ReturnType<typeof setTimeout> | undefined;
  #pendingRestore: string | null;

  constructor(
    id: string,
    profile: Profile,
    cwd: string | null,
    look: TerminalLook,
    host: SessionHost,
    restored: string | null,
  ) {
    this.id = id;
    this.profile = profile;
    this.#host = host;
    this.#theme = look.theme;
    this.#pendingRestore = restored;
    this.#element = document.createElement('div');
    this.#element.className = 'gs-term-host';
    this.#element.dataset['paneId'] = id;
    host.store.set(id, initialPaneState(profile.id, profile.name, cwd));
    this.#cwdAtStart = cwd;

    this.term = new Terminal({
      ...lookOptions(look),
      allowProposedApi: true,
      allowTransparency: false,
      drawBoldTextInBrightColors: false,
      fontWeight: 'normal',
      fontWeightBold: '600',
      macOptionIsMeta: host.platform === 'macos',
      rightClickSelectsWord: false,
      overviewRuler: { width: 8 },
      rescaleOverlappingGlyphs: true,
      scrollOnUserInput: true,
      smoothScrollDuration: 0,
      ...(host.platform === 'windows' ? { windowsPty: { backend: 'conpty' } } : {}),
    });
    this.term.loadAddon(this.#fit);
    this.term.loadAddon(this.#search);
    this.term.loadAddon(this.#serialize);
    this.term.loadAddon(new Unicode11Addon());
    this.term.unicode.activeVersion = '11';
    this.term.loadAddon(new ClipboardAddon(undefined, this.#clipboard()));
    this.term.loadAddon(new ImageAddon({ sixelSupport: true, iipSupport: true }));
    this.term.loadAddon(
      new WebLinksAddon((event, uri) => {
        if (event.ctrlKey || event.metaKey) host.onOpenUrl(uri);
      }),
    );
    this.#wire();
  }

  readonly #cwdAtStart: string | null;

  // ── Lifecycle ──────────────────────────────────────────────────────────────────────────

  /** Shows the terminal in `container` (opening it and starting the shell the first time). */
  attach(container: HTMLElement): void {
    if (this.#disposed) return;
    this.#container = container;
    if (this.#element.parentElement !== container) container.append(this.#element);
    if (!this.#opened) {
      this.#opened = true;
      this.term.open(this.#element);
      this.#loadRenderer();
      this.#registerPathLinks();
      this.#element.addEventListener('paste', this.#onPasteEvent, { capture: true });
      this.#element.addEventListener('focusin', () => this.#host.onFocus(this.id));
      if (this.#pendingRestore !== null) {
        this.term.write(this.#pendingRestore);
        this.term.write(`\r\n\x1b[2m── restored session ──\x1b[0m\r\n`);
        this.#pendingRestore = null;
      }
    }
    this.#observer?.disconnect();
    this.#observer = new ResizeObserver(() => this.#scheduleFit());
    this.#observer.observe(container);
    this.#fitNow();
    if (!this.#started) this.#start();
  }

  /** Takes the terminal off screen; the shell keeps running. */
  detach(container: HTMLElement): void {
    if (this.#container !== container) return;
    this.#observer?.disconnect();
    this.#observer = null;
    this.#container = null;
    if (this.#element.parentElement === container) this.#element.remove();
  }

  /** Ends the shell (unless it already ended) and frees the terminal. */
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#observer?.disconnect();
    cancelAnimationFrame(this.#fitFrame);
    clearTimeout(this.#bellTimer);
    // Always: the store may already say exited while the backend still holds the session.
    this.#endShell();
    this.#element.remove();
    this.term.dispose();
    this.#host.store.delete(this.id);
  }

  /** The shell ended (the backend's exit event). */
  markExited(code: number | null): void {
    const state = this.#host.store.get(this.id);
    if (state === undefined || state.status === 'exited') return;
    this.#finishBlock(null);
    this.#host.store.update(this.id, { status: 'exited', exitCode: code, busy: false });
    const tone = code === 0 || code === null ? '2' : '31';
    this.term.write(
      `\r\n\x1b[${tone}m[process exited${code === null ? '' : ` with code ${code}`}]\x1b[0m\r\n`,
    );
  }

  /** Starts the shell again after it exited. */
  restart(): void {
    if (this.#disposed) return;
    const state = this.#host.store.get(this.id);
    if (state?.status === 'running' || state?.status === 'starting') return;
    this.term.write('\r\n');
    this.#started = false;
    this.#host.store.update(this.id, { status: 'starting', exitCode: null, error: null });
    if (this.#container !== null) this.#start();
  }

  #start(): void {
    this.#started = true;
    this.#nonce = null;
    const { cols, rows } = this.term;
    this.#host.backend
      .spawn(
        { id: this.id, profileId: this.profile.id, cwd: this.#cwdAtStart, cols, rows },
        (bytes) => this.#onOutput(bytes),
      )
      .then(
        (info) => {
          // Closed while the shell was starting: nothing will ever end it otherwise.
          if (this.#disposed) {
            this.#endShell();
            return;
          }
          const current = this.#host.store.get(this.id);
          if (current?.status !== 'starting') return;
          this.#nonce = info.nonce;
          this.#host.store.update(this.id, {
            status: 'running',
            pid: info.pid,
            cwd: current.cwd ?? info.cwd,
            shellName: info.shellName,
            title: current.title === this.profile.name ? info.shellName : current.title,
          });
          // The size may have changed while the shell was starting.
          if (this.term.cols !== cols || this.term.rows !== rows) {
            this.#resizeBackend(this.term.cols, this.term.rows);
          }
        },
        (error: unknown) => {
          if (this.#disposed) return;
          const message =
            typeof error === 'object' && error !== null && 'message' in error
              ? String(error.message)
              : String(error);
          this.#host.store.update(this.id, { status: 'failed', error: message });
          this.term.write(`\x1b[31mCouldn’t start ${this.profile.name}: ${message}\x1b[0m\r\n`);
        },
      );
  }

  #endShell(): void {
    this.#host.backend.kill(this.id).catch((error: unknown) => {
      console.warn('could not end the shell', error);
    });
  }

  // ── Output, input and marks ────────────────────────────────────────────────────────────

  #onOutput(bytes: Uint8Array): void {
    if (this.#disposed) return;
    this.term.write(bytes);
    const container = this.#container;
    if (container === null || container.closest('[data-pane-visible="false"]') !== null) {
      this.#host.store.update(this.id, { activity: true });
    }
  }

  #wire(): void {
    const term = this.term;
    term.onData((data) => {
      if (this.#atEmptyPrompt && data === '#') {
        this.#host.onNaturalLanguage(this.id);
        return;
      }
      if (this.#inPrompt && data !== '') this.#atEmptyPrompt = false;
      this.#host.onInput(this.id, utf8Bytes(data));
    });
    term.onBinary((data) => this.#host.onInput(this.id, binaryBytes(data)));
    term.onResize(({ cols, rows }) => {
      this.#host.store.update(this.id, { cols, rows });
      this.#resizeBackend(cols, rows);
    });
    term.onTitleChange((title) => {
      const trimmed = title.trim();
      if (trimmed !== '') this.#host.store.update(this.id, { title: trimmed });
    });
    term.onBell(() => this.#ring());
    term.onSelectionChange(() => {
      if (!this.#host.copyOnSelect()) return;
      const text = term.getSelection();
      if (text !== '') {
        navigator.clipboard?.writeText(text).catch((error: unknown) => {
          console.warn('copy on select failed', error);
        });
      }
    });
    this.#search.onDidChangeResults(({ resultIndex, resultCount }) => {
      this.#host.store.update(this.id, {
        search:
          resultCount === 0 ? { index: -1, count: 0 } : { index: resultIndex, count: resultCount },
      });
    });
    term.attachCustomKeyEventHandler((event) => this.#onKey(event));

    term.parser.registerOscHandler(133, (data) => {
      const mark = parsePromptMark(data);
      if (mark === null) return false;
      this.#host.store.update(this.id, { integrated: true });
      switch (mark.kind) {
        case 'prompt-start':
          this.#finishBlock(null);
          this.#block = null;
          this.#inPrompt = true;
          this.#echo = '';
          this.#promptMarker = term.registerMarker(0) ?? null;
          break;
        case 'prompt-end':
          this.#inPrompt = true;
          this.#atEmptyPrompt = true;
          this.#echo = '';
          this.#echoStart = {
            line: term.buffer.active.baseY + term.buffer.active.cursorY,
            x: term.buffer.active.cursorX,
          };
          break;
        case 'command-start':
          this.#startBlock();
          break;
        case 'command-end':
          this.#finishBlock(mark.exitCode);
          break;
      }
      return true;
    });
    term.parser.registerOscHandler(633, (data) => {
      const report = parseCommandLine(data);
      if (report === null) return false;
      // With our integration, only reports carrying the session's nonce are the shell's own.
      if (this.#nonce !== null && report.nonce !== this.#nonce) return true;
      this.#echo = report.command;
      this.#explicitCommand = true;
      return true;
    });
    // Shells report the folder at the prompt; while a command runs, it's program output.
    term.parser.registerOscHandler(7, (data) => {
      const cwd = parseCwdUri(data);
      if (cwd !== null && this.#block === null) this.#host.store.update(this.id, { cwd });
      return cwd !== null;
    });
    term.parser.registerOscHandler(9, (data) => {
      const cwd = parseOsc9Cwd(data);
      if (cwd !== null && this.#block === null) this.#host.store.update(this.id, { cwd });
      return cwd !== null;
    });
  }

  #promptMarker: IMarker | null = null;
  #echoStart: { line: number; x: number } | null = null;
  #explicitCommand = false;
  /** The secret our integration appends to command reports (`null`: the shell reports none). */
  #nonce: string | null = null;

  /**
   * OSC 52 for programs: they may set the clipboard (vim or tmux over SSH) while their pane
   * has focus, but never read it, since the text would go back to whatever is running.
   */
  #clipboard(): IClipboardProvider {
    return {
      readText: () => '',
      writeText: (_selection, text) => {
        const focused = this.#container?.contains(document.activeElement) === true;
        if (!focused || text.length > MAX_CLIPBOARD_WRITE) return;
        return navigator.clipboard?.writeText(text);
      },
    };
  }

  /** The command line as echoed after the prompt (for shells without OSC 633). */
  #readEcho(): string {
    const start = this.#echoStart;
    if (start === null) return '';
    const buffer = this.term.buffer.active;
    const end = buffer.baseY + buffer.cursorY;
    let text = '';
    for (let line = start.line; line <= end; line += 1) {
      const row = buffer.getLine(line);
      if (row === undefined) break;
      text += row.translateToString(true, line === start.line ? start.x : 0);
      if (!buffer.getLine(line + 1)?.isWrapped) text += '\n';
    }
    return text.trim().split('\n')[0]?.trim() ?? '';
  }

  #startBlock(): void {
    const prompt = this.#promptMarker ?? this.term.registerMarker(0);
    if (prompt === undefined) return;
    // Our integration always reports the line; echoed text could be anything's output.
    const echoed = this.#nonce === null ? printable(this.#readEcho()) : '';
    const command = this.#explicitCommand ? this.#echo.trim() : echoed;
    this.#explicitCommand = false;
    this.#inPrompt = false;
    this.#atEmptyPrompt = false;
    const output = this.term.registerMarker(0) ?? null;
    const running = this.#decorate(
      prompt,
      'running',
      command === '' ? 'Running' : `Running: ${command}`,
    );
    this.#block = { prompt, output, command, startedAt: Date.now(), running };
    this.#host.store.update(this.id, {
      busy: true,
      currentCommand: command === '' ? null : command,
    });
  }

  #finishBlock(exitCode: number | null): void {
    const block = this.#block;
    this.#block = null;
    if (block === null) return;
    block.running?.dispose();
    this.#host.store.update(this.id, { busy: false, currentCommand: null });
    if (block.command === '') return;
    const info: FinishedCommand = {
      command: block.command,
      exitCode,
      durationMs: Date.now() - block.startedAt,
      finishedAt: Date.now(),
    };
    const failed = exitCode !== null && exitCode !== 0;
    const label = `${block.command}\n${failed ? `Failed with exit code ${exitCode}` : 'Succeeded'} · ${formatDuration(info.durationMs)}`;
    const decorations: IDecoration[] = [];
    const mark = this.#decorate(block.prompt, failed ? 'failure' : 'success', label);
    if (mark !== null) decorations.push(mark);
    if (failed) {
      const chip = this.#explainChip(block.prompt, info);
      if (chip !== null) decorations.push(chip);
    }
    this.#blocks.push({
      prompt: block.prompt,
      output: block.output,
      end: this.term.registerMarker(0),
      info,
      decorations,
    });
    if (this.#blocks.length > MAX_BLOCKS) {
      for (const old of this.#blocks.splice(0, this.#blocks.length - MAX_BLOCKS)) {
        for (const decoration of old.decorations) decoration.dispose();
      }
    }
    this.#host.store.update(this.id, { lastCommand: info });
    this.#host.onCommandFinished(this.id, info);
  }

  #decorate(marker: IMarker, status: 'running' | 'success' | 'failure', title: string) {
    const colors = markColors(this.#theme);
    const color =
      status === 'running'
        ? colors.running
        : status === 'success'
          ? colors.success
          : colors.failure;
    const decoration = this.term.registerDecoration({
      marker,
      width: 1,
      overviewRulerOptions: { color, position: 'left' },
    });
    decoration?.onRender((element) => {
      element.classList.add('gs-cmd-mark');
      element.dataset['status'] = status;
      element.title = title;
    });
    return decoration ?? null;
  }

  #explainChip(marker: IMarker, info: FinishedCommand) {
    const decoration = this.term.registerDecoration({ marker, anchor: 'right', x: 1, width: 11 });
    decoration?.onRender((element) => {
      if (element.dataset['ready'] === 'true') return;
      element.dataset['ready'] = 'true';
      element.classList.add('gs-explain-chip');
      element.title = 'Explain this error with AI · coming soon';
      element.setAttribute('role', 'button');
      element.setAttribute('aria-label', 'Explain this error (coming soon)');
      // The label sits in a child: xterm hides off-screen decorations with `display: none` on
      // the element itself, so the element's own display must stay xterm's.
      const label = document.createElement('span');
      label.className = 'gs-explain-chip-label';
      label.textContent = '✦ Explain';
      element.append(label);
      element.addEventListener('mousedown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.#host.onExplain(this.id, info);
      });
    });
    return decoration ?? null;
  }

  #ring(): void {
    if (!this.#host.visualBell()) return;
    clearTimeout(this.#bellTimer);
    this.#host.store.update(this.id, { bell: true });
    this.#bellTimer = setTimeout(() => this.#host.store.update(this.id, { bell: false }), 250);
  }

  #onKey(event: KeyboardEvent): boolean {
    if (event.type !== 'keydown') return !this.#host.isAppShortcut(event);
    if (this.#host.isAppShortcut(event)) return false;
    // Windows Terminal: Ctrl+C copies when there is a selection, else it interrupts.
    const mod = this.#host.platform === 'macos' ? event.metaKey : event.ctrlKey;
    if (
      mod &&
      !event.shiftKey &&
      !event.altKey &&
      event.key.toLowerCase() === 'c' &&
      this.term.hasSelection()
    ) {
      this.copySelection();
      return false;
    }
    // Ctrl+V pastes through the browser's paste event (reviewed by `onPaste`).
    if (mod && !event.altKey && event.key.toLowerCase() === 'v') return false;
    return true;
  }

  readonly #onPasteEvent = (event: ClipboardEvent) => {
    const text = event.clipboardData?.getData('text/plain') ?? '';
    event.preventDefault();
    event.stopPropagation();
    if (text !== '') this.#host.onPaste(this.id, text);
  };

  #registerPathLinks(): void {
    this.term.registerLinkProvider({
      provideLinks: (y, callback) => {
        const line = this.term.buffer.active.getLine(y - 1)?.translateToString(true) ?? '';
        const links = findPaths(line).map((match) => ({
          range: {
            start: { x: match.start + 1, y },
            end: { x: match.start + match.text.length, y },
          },
          text: match.text,
          decorations: { pointerCursor: true, underline: true },
          activate: (event: MouseEvent) => {
            if (event.ctrlKey || event.metaKey) this.#host.onOpenPath(this.id, match.path);
          },
        }));
        callback(links.length === 0 ? undefined : links);
      },
    });
  }

  #loadRenderer(): void {
    try {
      const webgl = new WebglAddon();
      webgl.onContextLoss(() => webgl.dispose());
      this.term.loadAddon(webgl);
    } catch (error) {
      // No WebGL (old GPU, remote desktop): xterm's DOM renderer takes over.
      console.warn('terminal: WebGL unavailable, using the DOM renderer', error);
    }
  }

  // ── Size ───────────────────────────────────────────────────────────────────────────────

  #scheduleFit(): void {
    cancelAnimationFrame(this.#fitFrame);
    this.#fitFrame = requestAnimationFrame(() => this.#fitNow());
  }

  #fitNow(): void {
    const container = this.#container;
    if (container === null || container.clientWidth === 0 || container.clientHeight === 0) return;
    try {
      this.#fit.fit();
    } catch (error) {
      console.warn('terminal fit failed', error);
    }
    this.#host.store.update(this.id, { cols: this.term.cols, rows: this.term.rows });
  }

  #resizeBackend(cols: number, rows: number): void {
    if (this.#host.store.get(this.id)?.status !== 'running') return;
    this.#host.backend.resize(this.id, cols, rows).catch((error: unknown) => {
      console.warn('terminal resize failed', error);
    });
  }

  // ── Commands the window runs ───────────────────────────────────────────────────────────

  /**
   * Writes to the shell (typed input, a snippet, a path). Writes go one at a time, in order:
   * while one is in flight, later input is batched into the next.
   */
  send(text: string): void {
    this.sendBytes(utf8Bytes(text));
  }

  /** Writes raw bytes to the shell, in order with {@link send}. */
  sendBytes(bytes: Uint8Array): void {
    if (this.#host.store.get(this.id)?.status !== 'running' || bytes.length === 0) return;
    this.#queued.push(bytes);
    if (!this.#writing) this.#flush();
  }

  #queued: Uint8Array[] = [];
  #writing = false;

  #flush(): void {
    const chunks = this.#queued;
    this.#queued = [];
    if (chunks.length === 0 || this.#disposed) {
      this.#writing = false;
      return;
    }
    this.#writing = true;
    this.#host.backend
      .write(this.id, concatBytes(chunks))
      .catch((error: unknown) => console.warn('terminal write failed', error))
      .finally(() => this.#flush());
  }

  /**
   * Pastes as if typed, honouring bracketed paste. Control characters are dropped: an
   * embedded `ESC [201~` would end the bracketed paste early and run the rest.
   */
  paste(text: string): void {
    this.term.paste(withoutControlCharacters(text));
  }

  focus(): void {
    this.term.focus();
  }

  hasSelection(): boolean {
    return this.term.hasSelection();
  }

  selection(): string {
    return this.term.getSelection();
  }

  copySelection(): void {
    const text = this.term.getSelection();
    if (text === '') return;
    navigator.clipboard?.writeText(text).catch((error: unknown) => {
      console.warn('copy failed', error);
    });
  }

  selectAll(): void {
    this.term.selectAll();
  }

  /** Clears the screen and scrollback, keeping the prompt line. */
  clear(): void {
    this.term.clear();
    for (const block of this.#blocks.splice(0)) {
      for (const decoration of block.decorations) decoration.dispose();
    }
  }

  reset(): void {
    this.clear();
    this.term.reset();
  }

  scrollToBottom(): void {
    this.term.scrollToBottom();
  }

  /** Scrolls to the previous (`-1`) or next (`1`) command above or below the viewport top. */
  jumpToCommand(direction: -1 | 1): void {
    const top = this.term.buffer.active.viewportY;
    const lines = this.#blocks.map((block) => block.prompt.line).filter((line) => line >= 0);
    const target =
      direction === -1
        ? lines.filter((line) => line < top).at(-1)
        : lines.find((line) => line > top);
    if (target === undefined) {
      if (direction === 1) this.term.scrollToBottom();
      return;
    }
    this.term.scrollToLine(target);
  }

  hasCommands(): boolean {
    return this.#blocks.length > 0;
  }

  /** The text of the last finished command's output. */
  lastOutput(): string | null {
    const block = this.#blocks.at(-1);
    if (block === undefined || block.output === null || block.end === undefined) return null;
    const buffer = this.term.buffer.active;
    const lines: string[] = [];
    for (let line = block.output.line; line < block.end.line; line += 1) {
      const row = buffer.getLine(line);
      if (row === undefined) break;
      const text = row.translateToString(true);
      if (row.isWrapped && lines.length > 0) lines[lines.length - 1] += text;
      else lines.push(text);
    }
    return lines.join('\n').replace(/\s+$/, '');
  }

  /** Selects the last finished command's output. */
  selectLastOutput(): boolean {
    const block = this.#blocks.at(-1);
    if (block === undefined || block.output === null || block.end === undefined) return false;
    const from = block.output.line;
    const to = Math.max(from, block.end.line - 1);
    this.term.selectLines(from, to);
    return true;
  }

  /** The whole scrollback as plain text. */
  text(): string {
    const buffer = this.term.buffer.active;
    const lines: string[] = [];
    for (let line = 0; line < buffer.length; line += 1) {
      const row = buffer.getLine(line);
      if (row === undefined) continue;
      const text = row.translateToString(true);
      if (row.isWrapped && lines.length > 0) lines[lines.length - 1] += text;
      else lines.push(text);
    }
    return lines.join('\n').replace(/\s+$/, '\n');
  }

  /** The last `rows` lines with their colours (for session restore). */
  serialize(rows: number): string {
    return this.#serialize.serialize({ scrollback: rows });
  }

  find(query: string, options: FindOptions, direction: 'next' | 'previous'): void {
    if (query === '') {
      this.clearFind();
      return;
    }
    const colors = markColors(this.#theme);
    const searchOptions = {
      caseSensitive: options.caseSensitive,
      wholeWord: options.wholeWord,
      regex: options.regex,
      incremental: direction === 'next' && options.incremental === true,
      decorations: {
        matchBackground: colors.match,
        matchBorder: colors.matchBorder,
        matchOverviewRuler: colors.matchBorder,
        activeMatchBackground: colors.activeMatch,
        activeMatchBorder: colors.activeMatchBorder,
        activeMatchColorOverviewRuler: colors.activeMatchBorder,
      },
    };
    try {
      if (direction === 'next') this.#search.findNext(query, searchOptions);
      else this.#search.findPrevious(query, searchOptions);
    } catch {
      // An unfinished regular expression while typing: no matches yet.
      this.#host.store.update(this.id, { search: { index: -1, count: 0 } });
    }
  }

  clearFind(): void {
    this.#search.clearDecorations();
    this.term.clearSelection();
    this.#host.store.update(this.id, { search: null });
  }

  /** Applies new settings or a new theme. */
  setLook(look: TerminalLook): void {
    this.#theme = look.theme;
    const options = lookOptions(look);
    for (const key of Object.keys(options) as (keyof typeof options)[]) {
      if (this.term.options[key] !== options[key]) {
        (this.term.options as Record<string, unknown>)[key] = options[key];
      }
    }
    this.#scheduleFit();
  }
}

export interface FindOptions {
  readonly caseSensitive: boolean;
  readonly wholeWord: boolean;
  readonly regex: boolean;
  readonly incremental?: boolean;
}

function lookOptions(look: TerminalLook) {
  return {
    theme: xtermTheme(look.theme),
    fontFamily: look.fontFamily.trim() === '' ? MONO_FONT_STACK : look.fontFamily,
    fontSize: look.fontSize,
    lineHeight: look.lineHeight,
    cursorStyle: look.cursorStyle,
    cursorInactiveStyle: 'outline',
    cursorBlink: look.cursorBlink,
    scrollback: look.scrollback,
  } satisfies ITerminalOptions;
}
