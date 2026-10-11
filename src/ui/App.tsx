import { validateAutomapSave } from '../game/automapSafety';
import { errorMessage } from '../util/errorMessage';
import {
  Box,
  Camera,
  Sun,
  Waves,
  Eye,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Fullscreen,
  Search,
  ClipboardPaste,
  Copy,
  Eraser,
  Expand,
  FilePlus2,
  FolderCog,
  FileText,
  Footprints,
  Shapes,
  Grid3x3,
  RefreshCw,
  Info,
  Bug,
  BookOpen,
  Palette as PaletteIcon,
  ScanEye,
  Map as MapIcon,
  Keyboard,
  LayoutGrid,
  Layers,
  Library,
  Maximize,
  MousePointer2,
  Paintbrush,
  Pipette,
  Redo2,
  Save,
  Scissors,
  ShieldCheck,
  FileWarning,
  Sparkles,
  Stamp,
  Table2,
  Trash2,
  Undo2,
  FlaskConical,
  FileOutput,
  Replace,
  ImageDown,
  Clock,
  SquareDashed,
  PaintBucket,
  MapPinned,
  Lightbulb,
  FileInput,
  Grid2x2Plus,
  Blend,
  House,
  BrickWall,
  EyeOff,
  Settings,
  Type as TypeIcon,
  Route,
  Skull,
  SquareMousePointer,
  History as HistoryIcon,
  Tags,
  Layers as LayersIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ds1FileToDt1Path, EMPTY_CELL, isEmptyCell, parseDs1, withTile, writeDs1, WRITE_VERSION, type Ds1, type Ds1Object, type TileCell, type WallCell } from '../formats/ds1';
import { embeddedFileName, newDs1, resizeDs1, type ResizeDelta } from '../formats/ds1ops';
import { Orientation, type Dt1Tile } from '../formats/dt1';
import { ACT0_PALETTE, PALETTE_NAMES, type Palette } from '../formats/palette';
import { act0Convert, dt1Act, loadAct0Palette } from '../game/act0Palette';
import { GameData } from '../game/GameData';
import { customAutomapEdits, planCustomDt1, type CustomDt1Plan } from '../game/customDt1';
import { cellKey, addToSelection, removeFromSelection, fitSelection, clampRect, fillEdits, clearEdits, clipboardSources, copyRect, inSelection, missingForPaste, overlapEdits, pasteEdits, pasteObjects, rectFrom, rectSize, selectionCount, type CellRect, type CellSelection, type Clipboard, type ClipPart } from '../game/clipboard';
import { checkMap, type CheckResult, type Fix, resultKey } from '../game/compat';
import { buildMapPackage, collectMapStrings, collectMapTxtRows, planImport, readMapPackage, tableCoverage, type ImportPlan, type MapPackage, type RecipeSuggestion, type TableCoverage } from '../game/mapPackage';
import { loadPresets, presetPath, presetToClipboard, serializePreset, suggestPresets, type Preset, type SuggestProgress } from '../game/presets';
import { buildPresetPackage, planPresetImport, type PresetImportPlan } from '../game/presetPackage';
import { layerKey, layerLabel, MapDocument, type Brush, type CellEdit, type LayerRef, type FileHistoryChange } from '../game/MapDocument';
import { drawnPalettes, guessDrawnAct, openMap, refreshPalette, rememberPalette, setViewPalette, withPalette, type MapOverride, type OpenMap } from '../game/openMap';
import { blankFillFlags, buildScene, cellToWorld, hitTest, sameItem, subTileToWorld, tilesAt, worldToSubTile, type DrawItem } from '../render/scene';
import type { SceneLight } from '../render/MapRenderer';
import { canPickFolders, loadFromDevServer, sourcesFromDirectory } from '../vfs/loaders';
import { devServerSaveTarget, directorySaveTarget, downloadFile, exportBytes, importMany, importNamed, type SaveTarget } from '../vfs/save';
import { LayeredFs, normalizePath, type FileSource } from '../vfs/vfs';
import { FileBrowser } from './FileBrowser';
import { MapLayerBar, WallCategories } from './MapLayerBar';
import { readWallCategories } from '../game/wallCategories';
import { isVisible, MapView, type GhostTile, type HoverInfo, type StrokeMods, type StrokePhase } from './MapView';
import { CellPanel, GroupsPanel, HistoryPanel, LayersPanel, lightMultiplier, MapInfoPanel, MapObjectsPanel, PanelTabContext, SelectionPanel, type LevelLight } from './panels';
import { allLayersShown, DEFAULT_VISIBILITY, isSolo, modeOf, nextView, oneMode, soloLayer, TOOLS, VIEW_NAMES, withMode, type LayerSlot, type Tool, type ViewMode, type Visibility } from './state';
import { AutomapLegend, LightPanel, ModeFrame, RoofPanel } from './ModePanels';
import { DEFAULT_AUTOMAP_STYLE, kindClassifier, normalizeAutomapStyle, type AutomapStyle } from '../game/automapStyle';
import { ClipboardPanel } from './ClipboardPanel';
import { SavePresetDialog } from './SavePresetDialog';
import { PresetBuilder } from './PresetBuilder';
import { loadPrefs, usePrefs } from './prefs';
import { comparePasteTiles, preparePresetLibrary, resolvePresetSources, type PasteTileClash } from '../game/presetLibrary';
import { CommandPalette, ribbonCommands } from './CommandPalette';
import { ContextMenu, type MenuEntry } from './ContextMenu';
import { comboOf, useKeybindings, type ActionId } from './keybindings';
import { ShortcutsDialog } from './ShortcutsDialog';
import { Splitter, usePersistentSize } from './Splitter';
import { Modal, NewMapDialog, PreferencesDialog, ResizeDialog, SaveAsDialog, ShortenPathsDialog, UnsavedPrompt, type NewMapChoice } from './Dialogs';
import { DataTables, type TableTarget } from './DataTables';
import { Dt1LibraryDialog } from './Dt1Manager';
import { MapDt1Review } from './Dt1Review';
import { AssetCleanup } from './AssetCleanup';
import './assetTools.css';
import { FloorRerollDialog } from './FloorRerollDialog';
import { WaterEditor, type WaterSave } from './WaterEditor';
import { archiveAsset, findManagedAsset, managedAssets } from '../vfs/assetFiles';
import { splitUnusedTiles, tileIdentity, usesOfLibrary } from '../game/assetUsage';
import { smartFloorReroll, type FloorChoice, type RerollOptions } from '../game/floorReroll';
import { prepareFloorLibrary } from '../game/floorLibrary';
import { stackMatchesLayer, stepTileStack, wallClickStack, type TileStack } from '../game/mapSelection';
import { planAutomapClear, planAutomapEdit } from '../game/automapClear';
import { buildDt1, dt1Records } from '../formats/dt1Write';
import { renameInLvlPrest, renameInLvlTypes, suggestShortPath } from '../game/dt1Review';
import { ChangeLevelTypeDialog, LevelTypeFullDialog, RegisterMapDialog, type TableWrite } from './LevelTools';
import { CubeRecipeDialog } from './CubeRecipe';
import { MapRecipeRibbon } from './MapRecipeRibbon';
import { loadLevelTables, loadTable, planCombine, planFreeSlots, planSwapLibraries, setPopSettings, SlotsFullError, syncLevelTables } from '../game/levelTables';
import { applyPopPlan, findPops, planPops, popTargets, removePops, type PopArea } from '../game/pops';
import { AUTOMAP_CODES, applyAutomapEdits, applyAutomapSuggestions, automapColors, referenceTiles, type AutomapColors, type ReferenceTile, AUTOMAP_DC6, AUTOMAP_TXT, automapLevelFor, automapPieces, parseAutomap, parseAutomapCels, setAutomapCel, suggestAutomap, withSuggestions, type AutomapEdit, type AutomapPiece, type AutomapSuggestion, type AutomapTable } from '../game/automap';
import { getCell, parseTxtTable, serializeTxtTable, setCell, type TxtTableDoc } from '../formats/txtTable';
import type { SpriteFrame } from '../formats/dc6';
import { AutomapPanel } from './AutomapPanel';
import { AutomapEditor } from './AutomapEditor';
import { ObjectGallery } from './ObjectGallery';
import { clearSpriteAnimationCache, type SpriteAnimation } from '../game/spriteAnim';
import { GameSizePicker } from './GameSizePicker';
import { AboutDialog, UpdateDialog } from './HelpDialogs';
import { bugReportUrl, checkForUpdate, featureRequestUrl, GUIDE_URL, MANUAL_PDF_URL, openExternal, type UpdateInfo } from '../app/updates';
import { Dt1Editor, type Dt1EditResult } from './Dt1Editor';
import { WalkLegend, WalkPanel, type WalkBrush } from './WalkPanel';
import { planTileFlags, planWalkEdit, unresolvedEdits, type WalkPaint } from '../game/walkEdit';
import { cellMoves } from '../game/reassignTiles';
import { appendTiles, keysOf, ownTilesPath, typeTakenKeys } from '../game/ownTiles';
import { cellFix, ENTRY_IMAGE_DIR, levelSizeFix, MAX_TILE_PATH, rowOfRecord, tilePathProblem } from '../game/addToGame';
import { ActSafeDialog } from './ActSafeDialog';
import { PopsDialog } from './PopsDialog';
import { ObjectPreview } from './ObjectPreview';
import { PresetsPanel } from './PresetsPanel';
import { Ribbon, type RibbonTab } from './Ribbon';
import { ChooseCopiesDialog, ChooseVersionsDialog, CompatDialog, CrashLogDialog, ExportPackageDialog, ImportPackageDialog } from './ToolDialogs';
import type { Sprite } from '../game/sprites';
import { getConfig, isTauri, loadFromTauri, setConfig, tauriSaveTarget, type DesktopConfig } from '../vfs/tauri';
import { DesktopSetup } from './DesktopSetup';
import { ErrorBoundary } from './ErrorBoundary';
import { ObjectPanel } from './ObjectPanel';
import { TypePackageDialog } from './TypePackageDialog';
import { EntryTextDialog } from './EntryTextDialog';
import { CustomObjectDialog } from './CustomObjectDialog';
import { applyTheme, findTheme } from './themes';
import { Thumb, TilePalette, type PaletteFocus } from './TilePalette';
import { arrivalProblem, arrivalText } from '../game/arrival';
import { readAutomapRows, type AutomapSource } from '../game/automapImport';
import { AutomapImportDialog } from './AutomapImport';
import { AREA_BANDS, areaColour, walkableArea } from '../game/walkArea';
import { overlayFlags, spawnLevelOf, spawnOverlay, walkableOverlay, type OverlayKind } from '../game/mapOverlays';
import { OverviewLegend } from './OverviewLegend';
import { isBuiltinPath, PLACEABLE_SPECIALS, SPECIAL_TILES_DT1, specialTileInfo } from '../game/specialTiles';
import { floodRegion, keyOf, objectInRect, paintEdits, rectCells, rerollEdits, stackPaintEdits, type TileKey } from '../game/editTools';
import { cellUnwalkableEdits, emptyCells, isCellUnwalkable } from '../game/cellFlags';
import { addRecentMap, pinnedTiles, recentMaps, recentTiles, reopenLast, setReopenLast, togglePinned, noteTileUse, type RecentMap } from '../app/prefs';
import { deleteRecovery, getRecovery, listRecoveries, saveRecovery, type Recovery } from '../app/recovery';
import { renderMapImage } from '../render/exportImage';
import { writeTileSettings } from '../formats/dt1Header';
import { ExportImageDialog, ImportDs1Dialog, ImportDt1Dialog, ReplaceDialog, WarpLinkDialog, type ImportDs1Choice, type ImportDt1Choice, type ImportDt1File } from './EditDialogs';
import { levelLinks, loadWarpTables, type WarpTables } from '../game/warps';
import { neededDt1s, type NeededDt1 } from '../game/importMatch';
import { parseDt1 } from '../formats/dt1';

type DataState =
  | { status: 'connecting' }
  | { status: 'setup'; error?: string }
  | { status: 'loading'; message: string }
  | { status: 'ready'; gd: GameData; files: string[]; saveTarget: SaveTarget | null };

interface Toast {
  text: string;
  error?: boolean;
}

/** The editable layer a drawn item belongs to. */
/** No brush or paste preview (one array, so the map view sees nothing changed while hovering). */
const NO_GHOSTS: GhostTile[] = [];

function layerOfItem(it: DrawItem): LayerRef {
  return it.kind === 'floor' ? { kind: 'floor', index: it.layer } : it.kind === 'shadow' ? { kind: 'shadow', index: it.layer } : { kind: 'wall', index: it.layer };
}


function isSingleCell(r: CellRect): boolean {
  return r.x0 === r.x1 && r.y0 === r.y1;
}

/** Orientation used when painting a brush on a layer kind. */
/** A map's folder, shortened for lists ("act1/town"). */
const folderOf = (path: string) => path.replace(/^data\/global\/tiles\//i, '').replace(/\/[^/]+$/, '');

/** Compatibility-check questions answered "keep it" ("<map path>|<question key>"), in this browser/app's storage. */
const KEPT_KEY = 'ds1studio.check.kept';
function keptAnswers(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEPT_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

/** Compatibility-check results accepted as intended, per map ({ "<map path>": [result keys] }), in this app's storage. */
const ACCEPTED_KEY = 'ds1studio.check.accepted';
function acceptedResults(mapPath: string): Set<string> {
  try {
    const all = JSON.parse(localStorage.getItem(ACCEPTED_KEY) ?? '{}') as Record<string, string[]>;
    return new Set(all[normalizePath(mapPath)] ?? []);
  } catch {
    return new Set();
  }
}
function setAcceptedResults(mapPath: string, keys: Set<string>): void {
  try {
    const all = JSON.parse(localStorage.getItem(ACCEPTED_KEY) ?? '{}') as Record<string, string[]>;
    all[normalizePath(mapPath)] = [...keys];
    localStorage.setItem(ACCEPTED_KEY, JSON.stringify(all));
  } catch {
    // storage unavailable: accepted for this session only
  }
}

function brushOrientation(layer: LayerRef, brush: Brush): number {
  return layer.kind === 'floor' ? Orientation.Floor : layer.kind === 'shadow' ? Orientation.Shadow : brush.orientation;
}

/** "12×8" for a rectangle, "37 of 12×8" for an irregular selection (its cells and bounding box). */
function selectionLabel(s: CellSelection): string {
  const [w, h] = rectSize(s);
  return s.cells ? `${selectionCount(s)} of ${w}×${h}` : `${w}×${h}`;
}

/** 100%, 300%, 50%, 12.5%… */
const formatZoom = (z: number) => `${+(z * 100).toFixed(z < 0.1 ? 2 : 1)}%`;

/** The right-hand column's panels, one at a time (vertical tabs). */
const SIDE_TABS = [
  { id: 'tiles', title: 'Tiles and presets (Objects & NPCs in Objects mode)', Icon: LayoutGrid },
  { id: 'cell', title: 'Cell: the tiles of the hovered or selected cell, and the selection', Icon: SquareMousePointer },
  { id: 'history', title: 'History: undo steps', Icon: HistoryIcon },
  { id: 'groups', title: 'Tags & groups', Icon: Tags },
  { id: 'layers', title: 'Layers: what the map shows', Icon: LayersIcon },
  { id: 'map', title: 'Map: size, level, tile libraries, palette', Icon: MapIcon },
] as const;
type SideTab = (typeof SIDE_TABS)[number]['id'];

export function App() {
  const [data, setData] = useState<DataState>({ status: 'connecting' });
  const [map, setMap] = useState<OpenMap | null>(null);
  const [doc, setDoc] = useState<MapDocument | null>(null);
  const [revision, setRevision] = useState(0);
  const [historyBusy, setHistoryBusy] = useState(false);
  const historyBusyRef = useRef(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  // The view mode used last comes back next time (per browser/app).
  const [tool, setTool] = useState<Tool>(() => { try { return localStorage.getItem('ds1studio.viewMode') === 'objects' ? 'object' : 'select'; } catch { return 'select'; } });
  const [visibility, setVisibilityRaw] = useState<Visibility>(() => {
    try {
      const saved = localStorage.getItem('ds1studio.viewMode');
      const start = loadPrefs();
      const initial = { ...DEFAULT_VISIBILITY, grid: start.showGrid, minimap: start.showMinimap, wallCategories: readWallCategories(localStorage.getItem('ds1studio.wallCategories')) };
      return saved && ['walk', 'automap', 'light', 'roofs'].includes(saved) ? withMode(initial, saved as ViewMode) : initial;
    } catch {
      return DEFAULT_VISIBILITY;
    }
  });
  /** Every visibility change keeps one view mode at a time (see ViewMode). */
  const setVisibility = useCallback((f: Visibility | ((v: Visibility) => Visibility)) => setVisibilityRaw((prev) => oneMode(prev, typeof f === 'function' ? f(prev) : f)), []);
  /** What the map draws: the Objects switch in the layer bar hides objects (except with the Objects tool). */
  const mapVisibility = useMemo(
    () => (visibility.objectsLayer || tool === 'object' ? visibility : { ...visibility, objects: false, sprites: false, paths: false }),
    [visibility, tool],
  );
  /** Objects go along with area copies, cuts and clears only while they're shown. */
  const objectsTaken = visibility.objectsLayer || tool === 'object';
  const visibilityNow = useRef(visibility);
  visibilityNow.current = visibility;
  /** The layers shown before showing one alone (Shift+number or a middle click in the layer bar). */
  const beforeSolo = useRef<Visibility | null>(null);
  /** Shows only `slot`; again (while it is the only one shown) brings back the layers shown before. */
  const toggleSolo = useCallback((slot: LayerSlot) => {
    const v = visibilityNow.current;
    const back = beforeSolo.current;
    if (isSolo(v, slot) && back) {
      beforeSolo.current = null;
      setVisibility((now) => ({ ...now, floors: back.floors, walls: back.walls, upperWalls: back.upperWalls, lowerWalls: back.lowerWalls, roofs: back.roofs, shadows: back.shadows, specials: back.specials }));
      return;
    }
    // Going from one layer alone to another keeps the layers from before the first.
    if (!back) beforeSolo.current = v;
    setVisibility((now) => soloLayer(now, slot));
  }, [setVisibility]);
  const showAllLayers = useCallback(() => {
    beforeSolo.current = null;
    setVisibility(allLayersShown);
  }, [setVisibility]);
  useEffect(() => { try { localStorage.setItem('ds1studio.wallCategories', JSON.stringify(visibility.wallCategories ?? {})); } catch { /* preferences may be unavailable */ } }, [visibility.wallCategories]);
  const viewMode: ViewMode = tool === 'object' ? 'objects' : modeOf(visibility);
  // Changing view (Tiles, Objects, Walkability…) drops what was selected: tiles, a tile picked from a stack, objects.
  // A selection made by the same action that changed the view (Ctrl+A or "Select this cell" from another view) stays.
  const firstView = useRef(true);
  const seenSelection = useRef<{ selection: unknown; object: unknown }>({ selection: null, object: null });
  useEffect(() => {
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    const madeNow = seenSelection.current.selection !== selection || seenSelection.current.object !== selectedObject;
    if (madeNow) return;
    setSelectedObject(null);
    setObjectGroup(null);
    setSelection(null);
    setStack(null);
  }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps
  // What was selected as of the last render (read by the view-change effect above, which runs first).
  useEffect(() => {
    seenSelection.current = { selection, object: selectedObject };
  });
  /** Switches to a view mode, or back to editing tiles when it is already on. */
  const toggleMode = useCallback((m: ViewMode) => {
    const next = viewMode === m ? 'tiles' : m;
    setTool(next === 'objects' ? 'object' : 'select');
    setVisibility(v => withMode(v, next));
  }, [setVisibility, viewMode]);
  const exitMode = useCallback(() => { setTool('select'); setVisibility((v) => withMode(v, 'tiles')); }, [setVisibility]);
  useEffect(() => {
    try {
      localStorage.setItem('ds1studio.viewMode', viewMode);
    } catch {
      // per-viewer convenience only
    }
  }, [viewMode]);
  const [modeAlert, setModeAlert] = useState<string | null>(null);
  useEffect(() => { if (!modeAlert) return; const t = setTimeout(() => setModeAlert(null), 2500); return () => clearTimeout(t); }, [modeAlert]);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fitSignal, setFitSignal] = useState(0);
  /** During an Alt+brush stroke: the layer each cell went on. */
  const stackPlaced = useRef<Map<string, number> | null>(null);
  const [zoomCommand, setZoomCommand] = useState<{ to: 1 | -1 | '100' | '10'; signal: number } | null>(null);
  const zoomBy = useCallback((to: 1 | -1 | '100' | '10') => setZoomCommand((z) => ({ to, signal: (z?.signal ?? 0) + 1 })), []);
  const [gameView, setGameView] = useState<{ on: boolean; signal: number; center?: [number, number] | null }>({ on: false, signal: 0 });
  /** The game screen size Game view shows (remembered on this computer). */
  const [gameSize, setGameSizeState] = useState<[number, number]>(() => {
    try {
      const v = JSON.parse(localStorage.getItem('ds1studio.gameSize') ?? 'null');
      if (Array.isArray(v) && v.length === 2 && v.every((n) => Number.isFinite(n) && n >= 320 && n <= 7680)) return v as [number, number];
    } catch {
      // per-viewer convenience only
    }
    return [800, 600];
  });
  const setGameSize = useCallback((size: [number, number]) => {
    setGameSizeState(size);
    try {
      localStorage.setItem('ds1studio.gameSize', JSON.stringify(size));
    } catch {
      // ignore
    }
    // Re-frame the view at the new size when Game view is on.
    setGameView((g) => (g.on ? { ...g, signal: g.signal + 1, center: null } : g));
  }, []);

  const [activeLayer, setActiveLayer] = useState<LayerRef>({ kind: 'floor', index: 0 });
  const [brush, setBrush] = useState<Brush | null>(null);
  /** Extra tiles painted at random together with the brush (Ctrl+click in the Tiles panel). */
  const [mix, setMix] = useState<Brush[]>([]);
  /** How Paint and Erase apply: freehand, a dragged rectangle, or a flood fill of the connected area. */
  useEffect(() => {
    const fits = (b: Brush) => activeLayer.kind === 'floor' ? b.orientation === 0 : activeLayer.kind === 'shadow' ? b.orientation === 13 : b.orientation !== 0 && b.orientation !== 13;
    setMix(m => m.filter(fits));
    setBrush(b => b && fits(b) ? b : null);
    setStack(s => s && stackMatchesLayer(s, activeLayer) ? s : null);
  }, [activeLayer.kind, activeLayer.index]);
  const [paintMode, setPaintMode] = useState<'brush' | 'rect' | 'fill'>('brush');
  /** The rectangle being dragged in rectangle mode (previewed as an outline). */
  const [paintRect, setPaintRect] = useState<CellRect | null>(null);
  const paintAnchor = useRef<[number, number] | null>(null);
  const [recentTileList, setRecentTileList] = useState<Brush[]>([]);
  const [pinned, setPinned] = useState<Brush[]>([]);
  const [recentMapList, setRecentMapList] = useState<RecentMap[]>(() => recentMaps());
  const [reopenLastMap, setReopenLastMap] = useState(() => reopenLast());
  const [recoveries, setRecoveries] = useState<Recovery[]>([]);
  /** Autosaved changes found for the map just opened, offered for restoring. */
  const [recoveryOffer, setRecoveryOffer] = useState<Recovery | null>(null);
  const [centerOn, setCenterOn] = useState<{ x: number; y: number; signal: number } | null>(null);
  const [exportingImage, setExportingImage] = useState(false);
  /**
   * Sub-tile flag edits made from the Cell panel, not saved yet. They change the loaded tiles directly (so the map and
   * the walkability overlay show them at once); the original flags are kept to discard. Saving writes the DT1s.
   */
  const flagEdits = useRef(new Map<Dt1Tile, { path: string; index: number; original: Uint8Array }>());
  const [flagEditCount, setFlagEditCount] = useState(0);
  const [savingFlags, setSavingFlags] = useState(false);
  /** Levels / LvlWarp / LvlPrest, for showing and changing where warps lead. */
  const [warpTables, setWarpTables] = useState<WarpTables | null>(null);
  const [warpEdit, setWarpEdit] = useState<number | null>(null);
  /** How the link editor opens from a compatibility fix: the suggested target, and whether to place the warp tile after. */
  const [warpInit, setWarpInit] = useState<{ target: number; place: boolean } | null>(null);
  const [warpBusy, setWarpBusy] = useState(false);
  /** A DT1 or DS1 picked for importing (with what it contains, or why it can't be used). */
  const [importing, setImporting] = useState<
    | { kind: 'dt1'; files: ImportDt1File[] }
    | { kind: 'ds1'; name: string; bytes: Uint8Array; info: { width: number; height: number; act: number } | string; needs: NeededDt1[] }
    | null
  >(null);
  const [importBusy, setImportBusy] = useState(false);
  /** Choices "Add to game" starts with (after importing a map). */
  const [registerInitial, setRegisterInitial] = useState<{ mode?: 'existing' | 'new'; levelId?: number; name?: string; note?: string; path?: string; newType?: boolean } | undefined>(undefined);
  /** New maps' level type choice (by path): Add to game starts from it. typeId null = a new level type. */
  const newMapTypes = useRef(new Map<string, { typeId: number | null }>());
  const [paletteFocus, setPaletteFocus] = useState<PaletteFocus | null>(null);
  /** Shows a tile in the Tiles panel: switches to its layer and DT1, scrolls to it and highlights it. */
  const focusTile = useCallback((tile: Dt1Tile, layer: LayerRef) => {
    setActiveLayer(layer);
    setSidePanel('tiles');
    setPaletteFocus((f) => ({ tile, seq: (f?.seq ?? 0) + 1 }));
  }, []);
  const [selection, setSelection] = useState<CellSelection | null>(null);
  /**
   * Tiles stacked under the last Shift+wheel / click point, frontmost first, and which one is chosen (-1 = none:
   * the selection covers every layer). While one is chosen, copy/cut/delete only touch its layer.
   */
  const [stack, setStack] = useState<TileStack | null>(null);
  const stackRef = useRef(stack);
  stackRef.current = stack;
  const [clipboard, setClipboard] = useState<Clipboard | null>(null);
  const [pasting, setPasting] = useState(false);
  /** The Copied panel: from a copy or cut until Esc. */
  const [clipPane, setClipPane] = useState(false);
  const [selectedObject, setSelectedObject] = useState<number | null>(null);
  /** Every object of one kind, selected together by double-clicking one (Delete / Ctrl+C / Ctrl+X act on all). */
  const [objectGroup, setObjectGroup] = useState<Set<number> | null>(null);
  const [dialog, setDialog] = useState<'new' | 'saveAs' | 'resize' | 'dt1s' | 'tables' | 'register' | 'cube' | 'check' | 'export' | 'import' | 'shortcuts' | 'dt1edit' | 'about' | 'update' | 'automap' | 'replace' | 'image' | 'actsafe' | 'pops' | 'crashes' | 'dt1lib' | 'cleanup' | 'restore' | 'floors' | 'water' | 'lvltype' | 'entrytext' | 'typepkg' | 'customobj' | null>(null);
  const [tableTarget, setTableTarget] = useState<TableTarget | null>(null);
  const [sidePanel, setSidePanel] = useState<'tiles' | 'presets'>('tiles');
  const [resizeMode, setResizeMode] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  /** The Presets panel stays mounted (hidden) once opened, so switching back to it is instant. */
  const [presetsOpened, setPresetsOpened] = useState(false);
  useEffect(() => {
    if (sidePanel === 'presets') setPresetsOpened(true);
  }, [sidePanel]);
  const [presetBuilder, setPresetBuilder] = useState(false);
  const [presetImportBusy, setPresetImportBusy] = useState(false);
  const [presetImportError, setPresetImportError] = useState('');
  const presetImportCache = useRef(new Map<string, Clipboard>());
  const [suggested, setSuggested] = useState<Preset[] | null>(null);
  const [suggesting, setSuggesting] = useState<SuggestProgress | null>(null);
  const [checkResults, setCheckResults] = useState<CheckResult[] | null>(null);
  /** Levels.txt, read when the crash log opens (to name the levels behind a missing loading screen). */
  const [crashLevels, setCrashLevels] = useState<TxtTableDoc | null>(null);
  const [marks, setMarks] = useState<{ x: number; y: number }[] | undefined>(undefined);
  const [exportState, setExportState] = useState<{ building: boolean; result: { files: { path: string; size: number; from: string }[]; missing: string[] } | null }>({ building: false, result: null });
  /** The open map's rows in the tables a package carries (null while reading). */
  const [exportCoverage, setExportCoverage] = useState<TableCoverage[] | null>(null);
  const [importState, setImportState] = useState<{ pkg: MapPackage; plan: ImportPlan } | null>(null);
  /** The imported package's recipe, to start the Cube recipe tool from after an import. */
  const [recipeSuggestion, setRecipeSuggestion] = useState<RecipeSuggestion | null>(null);
  const [sprites, setSprites] = useState<Map<string, Sprite>>(() => new Map());
  const [placing, setPlacing] = useState<{ type: number; id: number } | null>(null);
  /** Objects copied or cut in object mode (positions relative to the first), and whether they're on the cursor. */
  const [objectClip, setObjectClip] = useState<{ objects: Ds1Object[]; cut: boolean } | null>(null);
  const [objectPasting, setObjectPasting] = useState(false);
  // Leaving object mode drops the objects from the cursor (the clipboard keeps them for Ctrl+V).
  useEffect(() => {
    if (tool !== 'object') setObjectPasting(false);
  }, [tool]);
  const [desktopCfg, setDesktopCfg] = useState<DesktopConfig>({ modDirs: [], modMpqs: false });
  /** Desktop app: the folder dialog is open over a loaded workspace. */
  const [changingFolders, setChangingFolders] = useState(false);
  /** Current object drag: what is being moved, and the sub-tile offset from the grab point. */
  const objectDrag = useRef<{ obj: number; point: number | null; dx: number; dy: number } | null>(null);
  /** Walkability mode (the overlay on): the brush, the sub-tiles a stroke is painting, and its result. */
  const [walkBrush, setWalkBrush] = useState<WalkBrush>({ mode: 'block', bits: 0x01, size: 1, target: 'map' });
  const [walkMarks, setWalkMarks] = useState<{ keys: ReadonlySet<number>; mode: 'block' | 'clear' | 'replace' } | null>(null);
  const [walkBusy, setWalkBusy] = useState(false);
  const [walkLast, setWalkLast] = useState<string | null>(null);
  const walkStroke = useRef<{ anchor: [number, number]; last: [number, number]; keys: Set<number>; rect: boolean; mode: 'block' | 'clear' | 'replace' } | null>(null);
  /** The open map's level light (Levels.txt), and light values being tried out in the Map panel (not applied yet). */
  const [levelLight, setLevelLight] = useState<LevelLight | null>(null);
  const [lightDraft, setLightDraft] = useState<LevelLight | null>(null);
  /** The player's light radius previewed around the mouse (sub-tiles, 0 = off). */
  const [playerLight, setPlayerLight] = useState(0);
  /** Applies a finished walkability stroke (set below, once the table helpers it uses exist). */
  const applyWalkRef = useRef<((paint: WalkPaint) => Promise<void>) | null>(null);
  /** The pointer stroke that pasted: its drag does nothing more. */
  const strokeUsed = useRef(false);
  /** Shift+drag that started on a selected cell: takes cells out of the selection. */
  const selectSubtract = useRef(false);
  const selectAnchor = useRef<[number, number] | null>(null);
  /** Shift+click / Shift+drag with the Select tool: the selection being added to (null = a new selection). */
  const selectBase = useRef<CellSelection | null>(null);
  /** The tile tool to return to when Shift+O leaves object editing. */
  const lastTileTool = useRef<Tool>('select');
  const keys = useKeybindings();
  const [leftW, setLeftW] = usePersistentSize('left', 260, 180, 560);
  /** The presets list folded away to a thin strip at the left edge (remembered in this browser/app). */
  const [leftCollapsed, setLeftCollapsed] = useState(() => {
    try {
      return localStorage.getItem('ds1studio.leftCollapsed') === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('ds1studio.leftCollapsed', leftCollapsed ? '1' : '0');
    } catch {
      // per-viewer convenience only
    }
  }, [leftCollapsed]);
  /** The side panels folded away to a thin strip at the right edge (remembered too). */
  /** View → Wall categories… (which libraries' walls are Upper or Lower walls). */
  const [wallCatsOpen, setWallCatsOpen] = useState(false);
  /** The side panel shown in the right-hand column (vertical tabs), remembered between sessions. */
  const [rightTab, setRightTab] = useState<SideTab>(() => {
    try {
      const t = localStorage.getItem('ds1studio.rightTab');
      return SIDE_TABS.some((x) => x.id === t) ? (t as SideTab) : 'tiles';
    } catch {
      return 'tiles';
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('ds1studio.rightTab', rightTab);
    } catch {
      // per-viewer convenience only
    }
  }, [rightTab]);
  const [rightCollapsed, setRightCollapsed] = useState(() => {
    try {
      return localStorage.getItem('ds1studio.rightCollapsed') === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('ds1studio.rightCollapsed', rightCollapsed ? '1' : '0');
    } catch {
      // per-viewer convenience only
    }
  }, [rightCollapsed]);
  const justTheMap = leftCollapsed && rightCollapsed;
  /** "Just the map": both side panels folded away, or both back. */
  const toggleJustTheMap = useCallback(() => {
    const fold = !(leftCollapsed && rightCollapsed);
    setLeftCollapsed(fold);
    setRightCollapsed(fold);
  }, [leftCollapsed, rightCollapsed]);
  const [commandsOpen, setCommandsOpen] = useState(false);
  /** The map's right-click menu: where it opened and the cell under it. */
  const [mapMenu, setMapMenu] = useState<{ at: [number, number]; cell: [number, number]; world: [number, number] } | null>(null);
  const [rightW, setRightW] = usePersistentSize('right', 330, 260, 760);

  const bump = () => setRevision((r) => r + 1);
  const [objectsRevision, setObjectsRevision] = useState(0);
  const shiftHeld = useRef(false);
  useEffect(() => {
    const track = (e: KeyboardEvent | PointerEvent) => (shiftHeld.current = e.shiftKey);
    window.addEventListener('keydown', track);
    window.addEventListener('keyup', track);
    window.addEventListener('pointerdown', track, true);
    return () => {
      window.removeEventListener('keydown', track);
      window.removeEventListener('keyup', track);
      window.removeEventListener('pointerdown', track, true);
    };
  }, []);
  const notify = useCallback((text: string, error = false) => setToast({ text, error }), []);
  useEffect(() => {
    if (!toast || toast.error) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const mountFs = useCallback(async (fs: LayeredFs, saveTarget: SaveTarget | null) => {
    setData({ status: 'loading', message: 'Reading game tables…' });
    const gd = await GameData.load(fs);
    const files = fs.list((p) => p.endsWith('.ds1') && p.startsWith('data/global/tiles/'));
    setData({ status: 'ready', gd, files, saveTarget });
  }, []);

  /** Desktop app: remember the folders and mount them. */
  const openDesktop = useCallback(
    async (cfg: DesktopConfig) => {
      try {
        setData({ status: 'loading', message: 'Opening game archives…' });
        await setConfig(cfg);
        setDesktopCfg(cfg);
        const fs = await loadFromTauri(cfg);
        if (!fs.baseSources.length) throw new Error('No game data found in the chosen folders.');
        setMap(null);
        setDoc(null);
        setChangingFolders(false);
        await mountFs(fs, tauriSaveTarget(cfg));
      } catch (e) {
        setData({ status: 'setup', error: String(e) });
      }
    },
    [mountFs],
  );

  // Desktop app: use the remembered folders. Dev: the Vite plugin serves the local install. Otherwise ask for a folder.
  useEffect(() => {
    (async () => {
      if (isTauri) {
        const cfg = await getConfig();
        setDesktopCfg(cfg);
        if (cfg.gameDir) await openDesktop(cfg);
        else setData({ status: 'setup' });
        return;
      }
      const fs = await loadFromDevServer();
      if (fs) await mountFs(fs, await devServerSaveTarget());
      else setData({ status: 'setup' });
    })().catch((e) => setData({ status: 'setup', error: String(e) }));
  }, [mountFs, openDesktop]);

  const pickFolders = async (withMod: boolean) => {
    try {
      const sources: FileSource[] = [];
      let saveTarget: SaveTarget | null = null;
      const pick = (id: string) =>
        (window as unknown as { showDirectoryPicker(o: object): Promise<FileSystemDirectoryHandle> }).showDirectoryPicker({ id, mode: 'read' });
      if (withMod) {
        const mod = await pick('d2-mod');
        setData({ status: 'loading', message: `Indexing ${mod.name}…` });
        sources.push(...(await sourcesFromDirectory(mod, true)));
        saveTarget = directorySaveTarget(mod);
      }
      const game = await pick('d2-game');
      setData({ status: 'loading', message: `Opening archives in ${game.name}…` });
      sources.push(...(await sourcesFromDirectory(game, false)));
      if (!sources.length) throw new Error('No MPQs or data folder found there.');
      await mountFs(new LayeredFs(sources), saveTarget);
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') setData({ status: 'setup', error: (e as Error).message });
      else setData({ status: 'setup' });
    }
  };

  const gd = data.status === 'ready' ? data.gd : null;
  /** The placed objects that give off light (objects.txt Lit, Red/Green/Blue), where they stand. */
  const objectLights = useMemo((): SceneLight[] => {
    if (!gd || !map) return [];
    const out: SceneLight[] = [];
    for (const o of map.ds1.objects) {
      const l = gd.objectLight(map.ds1.act, o.type, o.id);
      if (!l) continue;
      const [x, y] = subTileToWorld(o.x, o.y);
      out.push({ x, y, radius: l.radius, rgb: l.rgb });
    }
    return out;
  }, [gd, map, revision, objectsRevision]); // eslint-disable-line react-hooks/exhaustive-deps
  const currentContext = useRef({ gd, map, doc });
  currentContext.current = { gd, map, doc };
  const mapRequest = useRef(0);
  const [cleanupPalette, setCleanupPalette] = useState<Uint8Array | null>(null);
  useEffect(() => {
    let live = true;
    if (gd && (dialog === 'cleanup' || dialog === 'restore')) void gd.palette(0).then(p => live && setCleanupPalette(p)).catch(e => notify(String(e), true));
    return () => { live = false; };
  }, [gd, dialog, notify]);
  const objectLabel = useCallback((o: Ds1Object) => (gd && map ? gd.objectName(map.ds1.act, o.type, o.id) : `${o.type},${o.id}`), [gd, map]);
  const nameOf = useCallback((type: number, id: number) => (gd && map ? gd.objectName(map.ds1.act, type, id) : `${type},${id}`), [gd, map]);

  /** The save / discard / cancel prompt, while one is open (its answer resolves the waiting caller). */
  const [unsavedAsk, setUnsavedAsk] = useState<{ closing: boolean; resolve: (c: 'save' | 'discard' | 'cancel') => void } | null>(null);
  const askUnsaved = useCallback((closing: boolean) => new Promise<'save' | 'discard' | 'cancel'>((resolve) => setUnsavedAsk({ closing, resolve })), []);
  const [prefs, setPrefs] = usePrefs();
  // The theme (Preferences → Appearance): its colours go on :root as the stylesheet's variables.
  useEffect(() => applyTheme(findTheme(prefs.theme, prefs.customThemes ?? []), prefs.accent), [prefs.theme, prefs.accent, prefs.customThemes]);
  /** The preferences for callbacks that shouldn't be rebuilt when one changes. */
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  // The Tiles panel's callbacks stay the same functions across renders (it only re-renders when its props change);
  // paletteState is filled in further down, once the layers and tile set are known.
  const paletteState = useRef<{ layers: LayerRef[]; tileSet: string }>({ layers: [], tileSet: '' });
  const paletteLayerKind = useCallback((kind: LayerRef['kind']) => {
    const next = paletteState.current.layers.find((l) => l.kind === kind);
    if (next) {
      setActiveLayer(next);
      setPaletteFocus(null);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const paletteToggleFavourite = useCallback((b: Brush) => {
    const set = paletteState.current.tileSet;
    if (set) setPinned(togglePinned(set, b));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Maps open in the colours the preferences ask for (set before any map opens).
  setViewPalette({ act0: prefs.act0View, magenta: prefs.act0Magenta });
  const firstPrefs = useRef(true);
  useEffect(() => {
    if (firstPrefs.current) {
      firstPrefs.current = false;
      return;
    }
    if (data.status === 'ready' && map) void refreshPalette(data.gd, map).then(setMap);
  }, [prefs.act0View, prefs.act0Magenta]); // eslint-disable-line react-hooks/exhaustive-deps
  const [prefsOpen, setPrefsOpen] = useState(false);
  /**
   * Before leaving the open map (opening another, or closing it): saves it when the preference says so, else asks.
   * false = stay (cancelled, or the save didn't go through).
   */
  const leaveMap = useCallback(
    async (closing: boolean): Promise<boolean> => {
      if (flagEdits.current.size) {
        if (!window.confirm(`Discard the unsaved sub-tile changes to ${flagEdits.current.size} tile${flagEdits.current.size === 1 ? '' : 's'}?`)) return false;
        for (const [t, e] of flagEdits.current) t.subTileFlags = e.original;
        flagEdits.current.clear();
        setFlagEditCount(0);
      }
      if (!doc) return true;
      const choice = !closing && doc.dirty && prefs.saveOnSwitch ? 'save' : !closing && !doc.dirty ? 'discard' : await askUnsaved(closing);
      if (choice === 'cancel') return false;
      if (choice === 'save' && doc.dirty) {
        await handlers.current.save();
        if (doc.dirty) return false; // not saved: stay
      }
      if (choice === 'discard' && doc.dirty) void deleteRecovery(doc.path).then(() => listRecoveries().then(setRecoveries));
      return true;
    },
    [doc, prefs.saveOnSwitch, askUnsaved],
  );

  const confirmDiscard = useCallback(() => {
    if (flagEdits.current.size) {
      if (!window.confirm(`Discard the unsaved sub-tile changes to ${flagEdits.current.size} tile${flagEdits.current.size === 1 ? '' : 's'}?`)) return false;
      for (const [t, e] of flagEdits.current) t.subTileFlags = e.original;
      flagEdits.current.clear();
      setFlagEditCount(0);
    }
    if (!doc?.dirty) return true;
    if (!window.confirm(`Discard unsaved changes to ${doc.path.split('/').pop()}?`)) return false;
    void deleteRecovery(doc.path).then(() => listRecoveries().then(setRecoveries));
    return true;
  }, [doc]);

  const open = useCallback(
    /** `confirmed`: the caller already asked about unsaved changes. `using`: tables just reloaded (see reloadTables). */
    async (path: string, confirmed = false, using?: GameData) => {
      const g = using ?? gd;
      if (!g || (!confirmed && !(await leaveMap(false)))) return;
      const request = ++mapRequest.current;
      setLoadingPath(path);
      try {
        const m = await openMap(g, path);
        if (request !== mapRequest.current) return;
        setMap(m);
        setDoc(new MapDocument(path, m.ds1));
        setRecentMapList(addRecentMap(path, prefsRef.current.recentCount));
        // Autosaved changes from a session that ended without saving: offer them.
        void getRecovery(path).then((r) => setRecoveryOffer(r));
        setHover(null);
        setMix([]);
        setPaintRect(null);
        setActiveLayer((l) => (l.kind === 'wall' && m.ds1.walls.length ? { kind: 'wall', index: 0 } : { kind: 'floor', index: 0 }));
        setBrush(null);
        setSelection(null);
        setStack(null);
        setPasting(false);
        setSelectedObject(null);
        setPlacing(null);
        setSuggested(null);
        setMarks(undefined);
        setTool((t) => (t === 'paint' ? 'select' : t));
      } catch (e) {
        notify(`${path}: ${errorMessage(e)}`, true);
      } finally {
        if (request === mapRequest.current) setLoadingPath(null);
      }
    },
    [gd, leaveMap, notify],
  );

  /** Re-resolve DT1s (level type change) without discarding edits. */
  const reresolve = useCallback(
    async (override?: MapOverride) => {
      if (!gd || !map) return;
      try {
        setMap(await openMap(gd, map.path, override, map.ds1));
      } catch (e) {
        notify(errorMessage(e), true);
      }
    },
    [gd, map, notify],
  );

  // Recent and pinned tiles belong to a tile set (the level type): the same numbers are other tiles elsewhere.
  const tileSet = map ? String(map.resolution.lvlType?.id ?? map.path.toLowerCase()) : '';
  useEffect(() => {
    setRecentTileList(tileSet ? recentTiles(tileSet) : []);
    setPinned(tileSet ? pinnedTiles(tileSet) : []);
  }, [tileSet]);
  const pickBrush = useCallback(
    (b: Brush, add = false) => {
      // An area selected with the Select tool: the tile clicked fills it (one undo step), on its kind of layer.
      if (!add && doc && selection && tool === 'select') {
        const layer: LayerRef =
          b.orientation === Orientation.Floor
            ? activeLayer.kind === 'floor' ? activeLayer : { kind: 'floor', index: 0 }
            : b.orientation === Orientation.Shadow
              ? { kind: 'shadow', index: 0 }
              : activeLayer.kind === 'wall' ? activeLayer : { kind: 'wall', index: 0 };
        const edits = fillEdits(doc, selection, layer, b);
        if (doc.apply(edits, `Fill ${edits.length} cells with ${b.main}/${b.sub}`)) bump();
        setBrush(b);
        setMix([]);
        if (tileSet) setRecentTileList(noteTileUse(tileSet, b));
        notify(`Filled ${edits.length} selected cell${edits.length === 1 ? '' : 's'} with tile ${b.main}/${b.sub} on ${layerLabel(layer)} · Ctrl+Z to undo · Esc to deselect and paint instead`);
        return;
      }
      if (add && brush) {
        // Ctrl+click: add to / remove from the random mix painted together with the brush.
        const same = (x: Brush) => x.orientation === b.orientation && x.main === b.main && x.sub === b.sub;
        if (same(brush)) return;
        setMix((m) => (m.some(same) ? m.filter((x) => !same(x)) : [...m, b]));
      } else {
        setBrush(b);
        setMix([]);
      }
      setTool('paint');
      if (tileSet) setRecentTileList(noteTileUse(tileSet, b));
    },
    [brush, tileSet, doc, selection, tool, activeLayer, notify],
  );

  // Autosave: every 20 s (Preferences), keep a copy of a map with unsaved changes (in the app's own storage) for recovery.
  const autosaved = useRef<{ doc: MapDocument | null; revision: number }>({ doc: null, revision: -1 });
  useEffect(() => {
    if (prefs.autosaveSeconds <= 0) return;
    const t = setInterval(() => {
      if (!doc) return;
      if (!doc.dirty) {
        // Back to the saved state (undone): an autosaved copy of this map is out of date.
        if (autosaved.current.doc === doc && autosaved.current.revision !== -1) void deleteRecovery(doc.path);
        autosaved.current = { doc, revision: -1 };
        return;
      }
      if (autosaved.current.doc === doc && autosaved.current.revision === doc.revision) return;
      autosaved.current = { doc, revision: doc.revision };
      try {
        void saveRecovery(doc.path, writeDs1(doc.ds1));
      } catch {
        // an unsavable state (mid-edit) is caught on the next tick
      }
    }, Math.max(5, prefs.autosaveSeconds) * 1000);
    return () => clearInterval(t);
  }, [doc, prefs.autosaveSeconds]);

  // On start: list autosaved work, and reopen the last map if asked to.
  const started = useRef(false);
  useEffect(() => {
    if (data.status !== 'ready' || started.current) return;
    started.current = true;
    void listRecoveries().then(setRecoveries);
    const last = recentMaps()[0];
    if (reopenLast() && last && data.files.some((f) => f.toLowerCase() === last.path.toLowerCase())) void open(last.path);
  }, [data, open]);
  const restoreRecovery = useCallback(async () => {
    const r = recoveryOffer;
    if (!r || !gd || !map || map.path.toLowerCase() !== r.path.toLowerCase()) return setRecoveryOffer(null);
    try {
      const m = await openMap(gd, map.path, undefined, parseDs1(r.bytes));
      const d = new MapDocument(map.path, m.ds1);
      d.markUnsaved();
      setMap(m);
      setDoc(d);
      setSelection(null);
      setStack(null);
      setPasting(false);
      notify(`Restored the changes autosaved ${new Date(r.time).toLocaleString()}. Save to keep them.`);
    } catch (e) {
      notify(`Couldn't restore: ${errorMessage(e)}`, true);
    }
    setRecoveryOffer(null);
  }, [recoveryOffer, gd, map, notify]);

  /** Changes the sub-tile flags of `tiles` (in their DT1s) with `fn`; shown at once, saved with saveTileFlags. */
  const editTileFlags = useCallback(
    (tiles: Dt1Tile[], fn: (current: Uint8Array) => Uint8Array) => {
      if (!map) return;
      for (const t of tiles) {
        const src = map.lib.sourceOf(t);
        if (!src || isBuiltinPath(src.path)) continue;
        const entry = flagEdits.current.get(t) ?? { path: src.path, index: src.index, original: t.subTileFlags.slice() };
        t.subTileFlags = fn(t.subTileFlags);
        if (t.subTileFlags.every((f, i) => f === entry.original[i])) flagEdits.current.delete(t);
        else flagEdits.current.set(t, entry);
      }
      setFlagEditCount(flagEdits.current.size);
      bump();
    },
    [map],
  );
  const discardTileFlags = useCallback(() => {
    for (const [t, e] of flagEdits.current) t.subTileFlags = e.original;
    flagEdits.current.clear();
    setFlagEditCount(0);
    bump();
  }, []);

  useEffect(() => {
    if (!gd) return;
    let live = true;
    void loadWarpTables(gd.fs).then((t) => live && setWarpTables(t));
    return () => {
      live = false;
    };
  }, [gd]);
  const mapLevelId = map?.resolution.preset?.levelId ?? 0;
  const links = useMemo(() => (warpTables && gd && mapLevelId > 0 ? levelLinks(warpTables, mapLevelId, gd.fs) : null), [warpTables, gd, mapLevelId]);
  const specialLabel = useCallback(
    (main: number, sub: number) => {
      const base = main <= 7 ? `Warp · link ${main}` : null;
      if (base === null) return specialTileInfo(main, sub).label;
      const link = links?.links[main];
      return link ? `${base} → ${link.target.name}` : links ? `${base} (not set)` : specialTileInfo(main, sub).label;
    },
    [links],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps -- `revision` invalidates the scene after in-place edits
  const scene = useMemo(() => (map ? buildScene(map.ds1, map.lib) : null), [map, revision]);
  // Roof/wall hide areas ("pops") and, for "As if inside", the tiles they hide.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const popAreas = useMemo(() => (map ? findPops(map.ds1) : []), [map, revision]);
  const popPreset = map?.resolution.source === 'lvlprest' && map.resolution.preset ? map.resolution.preset : null;
  const popView = useMemo(() => {
    if (!map || (!visibility.pops && !visibility.popsInside)) return undefined;
    const hidden = new Set<string>();
    if (visibility.popsInside) for (const a of popAreas) for (const t of popTargets(map.ds1, a)) hidden.add(`${t.layer}:${t.x}:${t.y}`);
    return { areas: popAreas, popPad: popPreset?.popPad ?? 0, show: visibility.pops, inside: visibility.popsInside, hidden };
  }, [map, popAreas, popPreset, visibility.pops, visibility.popsInside]);
  // The wall-layer tiles hide areas fade ("layer:x:y"; roofs, usually), and per area which layers they are on.
  const { popTargetCells, popAreaTargets } = useMemo(() => {
    const cells = new Set<string>();
    const perArea: { layer: number; x: number; y: number }[][] = [];
    if (map)
      for (const a of popAreas) {
        const list: { layer: number; x: number; y: number }[] = [];
        for (const t of popTargets(map.ds1, a)) {
          cells.add(`${t.layer}:${t.x}:${t.y}`);
          list.push({ layer: t.layer, x: t.x, y: t.y });
        }
        perArea.push(list);
      }
    return { popTargetCells: cells, popAreaTargets: perArea };
  }, [map, popAreas]);
  /**
   * Whether a cell's tile is on screen: its layer is shown in Layers, and it isn't one of the tiles As if inside hides.
   * Copy, cut and clearing everything take what you see, so the roof over a floor you copy stays where it is.
   */
  const drawnWallCells = useMemo(() => {
    const shown = new Map<string, boolean>();
    for (const it of scene?.items ?? []) {
      if (it.kind === 'floor' || it.kind === 'shadow') continue;
      const key = `${it.layer}:${it.cellX}:${it.cellY}`;
      shown.set(key, (shown.get(key) ?? false) || isVisible(it, visibility));
    }
    return shown;
  }, [scene, visibility]);
  const cellShown = useCallback(
    (layer: LayerRef, x: number, y: number, cell: TileCell | WallCell) => {
      if (layer.kind === 'floor') return visibility.floors[layer.index] ?? true;
      if (layer.kind === 'shadow') return visibility.shadows;
      if (!(visibility.walls[layer.index] ?? true)) return false;
      const drawn = drawnWallCells.get(`${layer.index}:${x}:${y}`);
      if (drawn !== undefined) return drawn && !(visibility.popsInside && popTargetCells.has(`${layer.index}:${x}:${y}`));
      const o = (cell as WallCell).orientation;
      if (o === Orientation.Roof && !visibility.roofs) return false;
      if (o >= Orientation.LowerWallsEquivalentToLeftWall && !visibility.lowerWalls) return false;
      if ((o === Orientation.SpecialTile1 || o === Orientation.SpecialTile2) && !visibility.specials) return false;
      if (o !== Orientation.Roof && o < Orientation.LowerWallsEquivalentToLeftWall && o !== Orientation.SpecialTile1 && o !== Orientation.SpecialTile2 && !visibility.upperWalls) return false;
      return !(visibility.popsInside && popTargetCells.has(`${layer.index}:${x}:${y}`));
    },
    [visibility, popTargetCells, drawnWallCells],
  );

  /**
   * Whether a click can land on a tile of this kind/layer/cell: in a hide area only one side of the building is in
   * reach. "As if inside" hides the tiles that fade, so clicks go through to the floors and walls inside; otherwise
   * the roof is on top, so the floors under it can't be picked or selected through it.
   */
  const blockedByPops = useCallback(
    (kind: 'floor' | 'shadow' | 'wall', layer: number, x: number, y: number) => {
      if (!popAreas.length) return false;
      if (visibility.popsInside) return kind === 'wall' && popTargetCells.has(`${layer}:${x}:${y}`);
      if (kind === 'wall') return false;
      // Covered: inside an area whose fading tiles are drawn (not switched off in Layers).
      return popAreas.some(
        (a, i) =>
          x >= a.x0 && x <= a.x1 && y >= a.y0 && y <= a.y1 && popAreaTargets[i].some(t => !!map && cellShown({kind:'wall',index:t.layer}, t.x, t.y, map.ds1.walls[t.layer][t.y * map.ds1.width + t.x])),
      );
    },
    [popAreas, popTargetCells, popAreaTargets, visibility, cellShown, map],
  );
  /** What clicks, picks and Shift+wheel can reach: what is drawn, minus the hidden side of a hide area. */
  const hittable = useCallback(
    (it: DrawItem) => isVisible(it, visibility) && !blockedByPops(it.kind === 'floor' ? 'floor' : it.kind === 'shadow' ? 'shadow' : 'wall', it.layer, it.cellX, it.cellY),
    [visibility, blockedByPops],
  );

  // Preview under the cursor: the pending paste, or the paint brush.
  const pasteRect = useMemo(
    (): CellRect | null =>
      pasting && clipboard && hover
        ? { x0: hover.cellX, y0: hover.cellY, x1: hover.cellX + clipboard.width - 1, y1: hover.cellY + clipboard.height - 1 }
        : paintRect,
    [pasting, clipboard, hover, paintRect],
  );
  const mapInput = useMemo(
    () => ({ zoomSpeed: prefs.zoomSpeed, smoothZoom: prefs.smoothZoom, arrowSpeed: prefs.arrowSpeed, shiftWheel: prefs.shiftWheel, objectLabels: prefs.objectLabels }),
    [prefs.zoomSpeed, prefs.smoothZoom, prefs.arrowSpeed, prefs.shiftWheel, prefs.objectLabels],
  );
  /** While pasting: the cells whose existing tiles the paste would replace (shown red before clicking). */
  const pasteDoomed = useMemo(() => {
    if (!pasting || !clipboard || !hover || !doc || prefs.pasteStack) return null;
    const have = new Set(doc.layers().map(layerKey));
    const out = new Map<number, { x: number; y: number; n: number }>();
    for (const e of pasteEdits(doc, clipboard, hover.cellX, hover.cellY, true)) {
      if (!have.has(layerKey(e.layer))) continue;
      const now = doc.cell(e.layer, e.x, e.y);
      if (isEmptyCell(now)) continue;
      const same = now.mainIndex === e.cell.mainIndex && now.subIndex === e.cell.subIndex && (e.layer.kind !== 'wall' || (now as WallCell).orientation === (e.cell as WallCell).orientation);
      if (same) continue;
      const k = e.y * 65536 + e.x;
      const c = out.get(k);
      if (c) c.n++;
      else out.set(k, { x: e.x, y: e.y, n: 1 });
    }
    return [...out.values()];
  }, [pasting, clipboard, hover, doc, revision, prefs.pasteStack]); // eslint-disable-line react-hooks/exhaustive-deps
  const ghost = useMemo((): GhostTile[] => {
    if (!map || !hover) return NO_GHOSTS;
    if (pasting && clipboard) {
      return clipboard.layers.flatMap(({ layer, cells }) =>
        layer.kind === 'shadow'
          ? []
          : cells.flatMap((c, i) => {
              if (isEmptyCell(c)) return [];
              const o = layer.kind === 'wall' ? (c as WallCell).orientation : Orientation.Floor;
              return tilesAt(map.lib, o, c.mainIndex, c.subIndex, hover.cellX + (i % clipboard.width), hover.cellY + Math.floor(i / clipboard.width));
            }),
      );
    }
    if (tool !== 'paint' || !brush) return NO_GHOSTS;
    const depth = activeLayer.kind === 'wall' ? { cellX: hover.cellX, cellY: hover.cellY, wallLayer: activeLayer.index } : undefined;
    return tilesAt(map.lib, brushOrientation(activeLayer, brush), brush.main, brush.sub, hover.cellX, hover.cellY).map((g) => ({ ...g, depth }));
  }, [map, hover, tool, brush, activeLayer, pasting, clipboard]);

  // The chosen stacked tile, found again in the current scene (edits rebuild it); gone when its tile is gone.
  const focus = useMemo(() => {
    if (!stack || stack.index < 0 || !scene) return null;
    const want = stack.items[stack.index];
    const item = scene.items.find((it) => sameItem(it, want) && hittable(it));
    if (!item) return null;
    return { item, index: stack.index, count: stack.items.length, anchor: stack.anchor, label: `${layerLabel(layerOfItem(item))} ${item.tile.mainIndex}/${item.tile.subIndex}` };
  }, [stack, scene, hittable]);
  /** An area selection narrowed to one layer with Shift+scroll: Copy, Cut and Delete act on that layer only. */
  const [areaLayer, setAreaLayer] = useState<LayerRef | null>(null);
  /** A layer to narrow the next selection to (a double-clicked tile's layer), applied when it arrives. */
  const pendingAreaLayer = useRef<LayerRef | null>(null);
  useEffect(() => {
    setAreaLayer(pendingAreaLayer.current);
    pendingAreaLayer.current = null;
  }, [selection]);
  const onlyLayer = focus ? layerOfItem(focus.item) : areaLayer;
  const cycleStack = useCallback(
    (dir: 1 | -1, world: [number, number]) => {
      if (!doc || !scene || tool === 'object' || pasting) return;
      // A tile ready to paint: Shift+scroll picks the layer it goes on (the preview shows it in front or behind).
      if (tool === 'paint' && brush) {
        const same = doc.editableLayers().filter((l) => l.kind === activeLayer.kind);
        const at = same.findIndex((l) => l.index === activeLayer.index);
        const next = same[Math.min(same.length - 1, Math.max(0, at + dir))];
        if (next && next.index !== activeLayer.index) {
          setActiveLayer(next);
          notify(`Placing on ${layerLabel(next)}${next.kind === 'wall' ? ': drawn behind tiles on higher wall layers at the same spot' : ''} · Shift+scroll to change`);
        } else notify(`Already on ${layerLabel(activeLayer)}${dir > 0 ? ' (the last layer of this kind)' : ' (the first)'}`);
        return;
      }
      // An area selected: Shift+scroll narrows it to one layer at a time (All, then each layer with tiles there).
      if (selection && (!isSingleCell(selection) || (selection.cells?.size ?? 0) > 1)) {
        const present = doc.layers().filter((l) => rectCells(selection).some(([x, y]) => inSelection(selection, x, y) && !isEmptyCell(doc.cell(l, x, y))));
        const order: (LayerRef | null)[] = [null, ...present];
        const at = order.findIndex((l) => (l === null ? areaLayer === null : areaLayer !== null && layerKey(l) === layerKey(areaLayer)));
        const next = order[(Math.max(0, at) + dir + order.length) % order.length];
        setAreaLayer(next);
        const count = next ? rectCells(selection).filter(([x, y]) => inSelection(selection, x, y) && !isEmptyCell(doc.cell(next, x, y))).length : 0;
        notify(next ? `Selection: ${layerLabel(next)} only (${count} tiles) · Copy, Cut and Delete act on it · Shift+scroll for the next layer` : 'Selection: all layers');
        return;
      }
      // Keep stepping through the same stack while the cursor stays near where it started (a pixel of mouse drift
      // would otherwise land on a different set of tiles and start over); farther away, stack up the new spot.
      const next = stepTileStack(scene, stackRef.current, dir, world, zoom, hittable);
      stackRef.current = next;
      setStack(next);
      if (!next) return;
      const item = next.items[next.index];
      setSelection({ x0: item.cellX, y0: item.cellY, x1: item.cellX, y1: item.cellY });
      focusTile(item.tile, layerOfItem(item));
      setTool('select');
    },
    [doc, scene, tool, pasting, hittable, focusTile, zoom, brush, activeLayer, selection, areaLayer, notify],
  );

  const pickAt = useCallback(
    (x: number, y: number, world: [number, number]) => {
      if (!doc || !scene) return;
      // What you see is what you pick: the frontmost tile pixel under the cursor.
      const hit = hitTest(scene, world[0], world[1], hittable);
      if (hit) {
        const layer: LayerRef = { kind: hit.kind === 'floor' ? 'floor' : 'wall', index: hit.layer };
        const orientation = hit.tile.orientation === Orientation.LeftPartOfNorthCornerWall ? Orientation.RightPartOfNorthCornerWall : hit.tile.orientation;
        focusTile(hit.tile, layer);
        setBrush({ orientation, main: hit.tile.mainIndex, sub: hit.tile.subIndex });
        setMix([]);
        setTool('paint');
        notify(`Picked ${hit.tile.mainIndex}/${hit.tile.subIndex} from ${layerLabel(layer)}`);
        return;
      }
      if (!doc.inBounds(x, y)) return;
      // Pick what is visible on top: walls (upper layers first), then floors, then the shadow.
      const layers = doc.layers();
      const byKind = (k: LayerRef['kind']) => layers.filter((l) => l.kind === k).reverse();
      for (const layer of [...byKind('wall'), ...byKind('floor'), ...byKind('shadow')]) {
        const c = doc.cell(layer, x, y);
        if (isEmptyCell(c) || blockedByPops(layer.kind, layer.index, x, y)) continue;
        const orientation = layer.kind === 'wall' ? (c as WallCell).orientation : layer.kind === 'floor' ? Orientation.Floor : Orientation.Shadow;
        setActiveLayer(layer);
        setBrush({ orientation, main: c.mainIndex, sub: c.subIndex });
        setMix([]);
        setTool('paint');
        notify(`Picked ${c.mainIndex}/${c.subIndex} from ${layerLabel(layer)}`);
        return;
      }
      notify('Nothing to pick in that cell.');
    },
    [doc, scene, hittable, blockedByPops, notify, focusTile],
  );

  const onStroke = useCallback(
    (phase: StrokePhase, cells: [number, number][], world: [number, number], mods?: StrokeMods) => {
      if (!doc || historyBusyRef.current) return;
      // Walkability mode: strokes paint sub-tiles (Shift: a rectangle; Ctrl: the opposite of the brush).
      if (visibility.walkable && !pasting) {
        const [fx, fy] = worldToSubTile(world[0], world[1]);
        const at: [number, number] = [Math.round(fx), Math.round(fy)];
        const W = doc.ds1.width * 5;
        const Hh = doc.ds1.height * 5;
        const key = (x: number, y: number) => y * 65536 + x;
        const stamp = (keys: Set<number>, [x, y]: [number, number]) => {
          if (walkBrush.size === 'cell') {
            const [cx, cy] = [Math.floor(x / 5) * 5, Math.floor(y / 5) * 5];
            for (let dy = 0; dy < 5; dy++) for (let dx = 0; dx < 5; dx++) if (cx + dx >= 0 && cx + dx < W && cy + dy >= 0 && cy + dy < Hh) keys.add(key(cx + dx, cy + dy));
            return;
          }
          const r = (walkBrush.size - 1) / 2;
          for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (x + dx >= 0 && x + dx < W && y + dy >= 0 && y + dy < Hh) keys.add(key(x + dx, y + dy));
        };
        if (phase === 'start') {
          const mode = mods?.ctrl ? (walkBrush.mode === 'block' ? 'clear' : 'block') : walkBrush.mode;
          walkStroke.current = { anchor: at, last: at, keys: new Set(), rect: !!mods?.shift, mode };
        }
        const st = walkStroke.current;
        if (!st) return;
        if (st.rect) {
          // A rectangle of sub-tiles (whole cells with the Cell brush).
          st.keys = new Set();
          let [x0, x1] = [Math.min(st.anchor[0], at[0]), Math.max(st.anchor[0], at[0])];
          let [y0, y1] = [Math.min(st.anchor[1], at[1]), Math.max(st.anchor[1], at[1])];
          if (walkBrush.size === 'cell') [x0, y0, x1, y1] = [Math.floor(x0 / 5) * 5, Math.floor(y0 / 5) * 5, Math.floor(x1 / 5) * 5 + 4, Math.floor(y1 / 5) * 5 + 4];
          for (let y = Math.max(0, y0); y <= Math.min(Hh - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) st.keys.add(key(x, y));
        } else {
          // Freehand: every sub-tile on the way from the last point, so fast drags leave no gaps.
          const [ax, ay] = st.last;
          const n = Math.max(Math.abs(at[0] - ax), Math.abs(at[1] - ay), 1);
          for (let i = 0; i <= n; i++) stamp(st.keys, [Math.round(ax + ((at[0] - ax) * i) / n), Math.round(ay + ((at[1] - ay) * i) / n)]);
        }
        st.last = at;
        setWalkMarks({ keys: new Set(st.keys), mode: st.mode });
        if (phase === 'end') {
          walkStroke.current = null;
          setWalkMarks(null);
          const cellMasks = new Map<number, number>();
          for (const k of st.keys) {
            const [x, y] = [k % 65536, Math.floor(k / 65536)];
            const cell = Math.floor(y / 5) * doc.ds1.width + Math.floor(x / 5);
            cellMasks.set(cell, (cellMasks.get(cell) ?? 0) | (1 << ((y % 5) * 5 + (x % 5))));
          }
          if (cellMasks.size && (walkBrush.bits || st.mode === 'replace')) void applyWalkRef.current?.({ mode: st.mode, bits: walkBrush.bits, cells: cellMasks });
          else if (!walkBrush.bits) notify('Tick at least one thing to block or allow (Walkability panel).', true);
        }
        return;
      }
      if (tool === 'object') {
        const [fx, fy] = worldToSubTile(world[0], world[1]);
        const sx = Math.round(fx);
        const sy = Math.round(fy);
        const objs = doc.ds1.objects;
        if (phase === 'start') {
          const near = (x: number, y: number) => {
            const [wx, wy] = subTileToWorld(x, y);
            return Math.hypot(wx - world[0], wy - world[1]) < 10;
          };
          if (objectPasting && objectClip) {
            // Put the copied / cut objects down here (their NPC paths move with them).
            const placed = objectClip.objects.map((o) => ({ ...o, x: o.x + sx, y: o.y + sy, path: o.path.map((p) => ({ ...p, x: p.x + sx, y: p.y + sy })) }));
            doc.setObjects([...objs, ...placed]);
            setSelectedObject(objs.length + placed.length - 1);
            setObjectPasting(false);
            // Once a cut is put down, pasting again makes copies.
            if (objectClip.cut) setObjectClip({ ...objectClip, cut: false });
            notify(`${objectClip.cut ? 'Moved' : 'Pasted'} ${placed.length === 1 ? objectLabel(placed[0]) : `${placed.length} objects`} · Ctrl+V for another copy`);
            bump();
            return;
          }
          if (placing) {
            const next: Ds1Object[] = [...objs, { type: placing.type, id: placing.id, x: sx, y: sy, flags: 0, path: [] }];
            doc.setObjects(next);
            setSelectedObject(next.length - 1);
            setPlacing(null);
            bump();
            return;
          }
          const sel = selectedObject !== null ? objs[selectedObject] : null;
          const point = sel ? sel.path.findIndex((p) => near(p.x, p.y)) : -1;
          if (sel && point >= 0) {
            doc.beginObjectEdit();
            objectDrag.current = { obj: selectedObject!, point, dx: sel.path[point].x - sx, dy: sel.path[point].y - sy };
            return;
          }
          if (sel && shiftHeld.current) {
            doc.setObjects(objs.map((o, i) => (i === selectedObject ? { ...o, path: [...o.path, { x: sx, y: sy, action: 1 }] } : o)));
            bump();
            return;
          }
          // Topmost (last drawn) object under the cursor.
          let hit = -1;
          for (let i = objs.length - 1; i >= 0 && hit < 0; i--) if (near(objs[i].x, objs[i].y)) hit = i;
          setSelectedObject(hit >= 0 ? hit : null);
          setObjectGroup(null);
          if (hit >= 0) {
            doc.beginObjectEdit();
            // Keep where it was grabbed: the object moves with the cursor instead of jumping its centre to it.
            objectDrag.current = { obj: hit, point: null, dx: objs[hit].x - sx, dy: objs[hit].y - sy };
          }
          return;
        }
        const drag = objectDrag.current;
        if (drag && phase === 'move') {
          const tx = Math.max(0, sx + drag.dx);
          const ty = Math.max(0, sy + drag.dy);
          const next = objs.map((o, i) => {
            if (i !== drag.obj) return o;
            if (drag.point === null) return o.x === tx && o.y === ty ? o : { ...o, x: tx, y: ty };
            const p = o.path[drag.point];
            return p.x === tx && p.y === ty ? o : { ...o, path: o.path.map((q, n) => (n === drag.point ? { ...q, x: tx, y: ty } : q)) };
          });
          if (next[drag.obj] !== objs[drag.obj]) {
            doc.liveObjects(next);
            // Only the objects moved: redraw them, and rebuild the rest once the drag ends.
            setObjectsRevision((r) => r + 1);
          }
        }
        if (phase === 'end') {
          doc.endObjectEdit();
          objectDrag.current = null;
          bump();
        }
        return;
      }
      if (pasting) {
        if (phase === 'start' && cells[0] && clipboard) {
          const [x, y] = cells[0];
          // Stack onto the tiles already there (next free wall/floor layer) instead of replacing them: Alt, or the
          // other way round when Preferences make stacking the default.
          const overlap = prefsRef.current.pasteStack !== !!mods?.alt ? overlapEdits(doc, clipboard, x, y) : null;
          const edits = overlap ? overlap.edits : pasteEdits(doc, clipboard, x, y, true);
          const objects = pasteObjects(doc, clipboard, x, y);
          const walls = overlap?.walls ?? edits.reduce((n, e) => e.layer.kind === 'wall' ? Math.max(n, e.layer.index + 1) : n, doc.ds1.walls.length);
          const floors = overlap?.floors ?? edits.reduce((n, e) => e.layer.kind === 'floor' ? Math.max(n, e.layer.index + 1) : n, doc.ds1.floors.length);
          const addsLayers = walls > doc.ds1.walls.length || floors > doc.ds1.floors.length;
          if (overlap) notify(`Stacked onto existing tiles${addsLayers ? ` (now ${overlap.walls} wall / ${overlap.floors} floor layers)` : ''}${overlap.replaced ? ` · ${overlap.replaced} cells had no free layer and were replaced` : ''}`);
          if (objects.length || addsLayers) {
            // Cells, new layers and objects together, as one undo step.
            doc.mutate((d) => {
              const cellCount = d.width * d.height;
              while (d.walls.length < walls) d.walls.push(Array.from({ length: cellCount }, () => ({ ...EMPTY_CELL, orientation: 0, orientationHigh: 0 })));
              while (d.floors.length < floors) d.floors.push(Array.from({ length: cellCount }, () => EMPTY_CELL));
              for (const e of edits) {
                const layers = e.layer.kind === 'floor' ? d.floors : e.layer.kind === 'wall' ? d.walls : d.shadows;
                (layers[e.layer.index] as typeof e.cell[])[e.y * d.width + e.x] = e.cell;
              }
              d.objects = [...d.objects, ...objects];
            }, `Paste ${clipboard.width}×${clipboard.height}${objects.length ? ` + ${objects.length} object${objects.length === 1 ? '' : 's'}` : ''}`);
            bump();
          } else if (doc.apply(edits, `Paste ${clipboard.width}×${clipboard.height}`)) bump();
          setSelection(clampRect({ x0: x, y0: y, x1: x + clipboard.width - 1, y1: y + clipboard.height - 1 }, doc.ds1.width, doc.ds1.height));
          setPasting(false);
          strokeUsed.current = true;
        }
        return;
      }
      // The click that pasted: the rest of its drag paints, erases or selects nothing.
      if (strokeUsed.current) {
        if (phase === 'end') strokeUsed.current = false;
        return;
      }
      if (tool === 'select') {
        const cell = cells[cells.length - 1];
        if (phase === 'start' && cell) {
          selectAnchor.current = cell;
          // Click visible walls, but keep the grid anchor for a subsequent rectangle drag.
          const clicked = scene ? wallClickStack(scene, world, hittable) : null;
          // Only Shift+wheel restricts selection to an individual layer.
          setStack(null);
          stackRef.current = null;
          // Shift adds to the selection: a cell per click, a rectangle per drag (irregular shapes). Starting on a cell
          // that is already selected takes cells out instead.
          selectBase.current = mods?.shift && selection ? selection : null;
          const item = clicked?.items[clicked.index];
          const start: [number, number] = item ? [item.cellX, item.cellY] : cell;
          selectSubtract.current = !!selectBase.current && (inSelection(selectBase.current, start[0], start[1]) || inSelection(selectBase.current, cell[0], cell[1]));
          if (item) focusTile(item.tile, layerOfItem(item));
          const r = clampRect(rectFrom(start, start), doc.ds1.width, doc.ds1.height);
          if (selectBase.current) setStack(null);
          if (selectSubtract.current && selectBase.current) {
            const [ox, oy] = inSelection(selectBase.current, start[0], start[1]) ? start : cell;
            setSelection(removeFromSelection(selectBase.current, { x0: ox, y0: oy, x1: ox, y1: oy }));
            return;
          }
          setSelection(selectBase.current && r ? addToSelection(selectBase.current, r) : r);
          return;
        }
        if (cell && selectAnchor.current) {
          const r = clampRect(rectFrom(selectAnchor.current, cell), doc.ds1.width, doc.ds1.height);
          setStack(null);
          stackRef.current = null;
          if (selectSubtract.current && selectBase.current) setSelection(r ? removeFromSelection(selectBase.current, r) : selectBase.current);
          else setSelection(selectBase.current ? (r ? addToSelection(selectBase.current, r) : selectBase.current) : r);
        }
        if (phase === 'end') {
          selectAnchor.current = null;
          selectBase.current = null;
          selectSubtract.current = false;
        }
        return;
      }
      if (tool === 'pick') {
        if (phase === 'start' && cells[0]) pickAt(cells[0][0], cells[0][1], world);
        return;
      }
      if (tool !== 'paint' && tool !== 'erase') return;
      if (tool === 'paint' && !brush) {
        if (phase === 'start') notify('Choose a tile in the Tiles panel first (or use Pick, I).', true);
        return;
      }
      // The tiles to paint with (the brush plus the random mix), oriented for the active layer; null = erase.
      const tiles = tool === 'paint' && brush ? [brush, ...mix].map((b) => ({ ...b, orientation: brushOrientation(activeLayer, b) })) : null;
      const verb = tool === 'paint' ? 'Paint' : 'Erase';
      const where = ` on ${layerLabel(activeLayer)}`;
      // Alt with the brush: each cell goes on the first free layer of its kind (as Alt does when pasting).
      if (phase === 'start') stackPlaced.current = tiles && mods?.alt && activeLayer.kind !== 'shadow' ? new Map() : null;
      /** Stacked painting; true when it changed the map. Adding a layer is its own undo step. */
      const stackPaint = (at: [number, number][], label: string) => {
        const st = stackPaintEdits(doc, activeLayer, at, tiles!, stackPlaced.current!);
        if (st.replaced && phase !== 'move') notify(`${st.replaced} cell${st.replaced === 1 ? ' had' : 's had'} no free layer: replaced on ${layerLabel(activeLayer)}`);
        if (st.walls <= doc.ds1.walls.length && st.floors <= doc.ds1.floors.length) return doc.apply(st.edits, label);
        doc.mutate((d) => {
          const cellCount = d.width * d.height;
          while (d.walls.length < st.walls) d.walls.push(Array.from({ length: cellCount }, () => ({ ...EMPTY_CELL, orientation: 0, orientationHigh: 0 })));
          while (d.floors.length < st.floors) d.floors.push(Array.from({ length: cellCount }, () => EMPTY_CELL));
          for (const e of st.edits) {
            const layers = e.layer.kind === 'floor' ? d.floors : e.layer.kind === 'wall' ? d.walls : d.shadows;
            (layers[e.layer.index] as typeof e.cell[])[e.y * d.width + e.x] = e.cell;
          }
        }, `${label} (added a layer)`);
        notify(`Stacked onto the tiles there: the map now has ${st.walls} wall / ${st.floors} floor layers`);
        return true;
      };
      if (paintMode === 'rect') {
        const cell = cells[cells.length - 1];
        if (phase === 'start' && cell) paintAnchor.current = cell;
        if (cell && paintAnchor.current) setPaintRect(clampRect(rectFrom(paintAnchor.current, cell), doc.ds1.width, doc.ds1.height));
        if (phase === 'end') {
          const r = paintAnchor.current && hover ? clampRect(rectFrom(paintAnchor.current, [hover.cellX, hover.cellY]), doc.ds1.width, doc.ds1.height) : paintRect;
          paintAnchor.current = null;
          setPaintRect(null);
          if (r && (stackPlaced.current ? stackPaint(rectCells(r), `${verb} rectangle (stacked)`) : doc.apply(paintEdits(doc, activeLayer, rectCells(r), tiles), `${verb} rectangle${where}`))) bump();
        }
        return;
      }
      if (paintMode === 'fill') {
        const cell = cells[0];
        if (phase !== 'start' || !cell) return;
        // Inside the selection, the fill stays within it.
        const within = selection && inSelection(selection, cell[0], cell[1]) ? selection : null;
        const region = floodRegion(doc, activeLayer, cell[0], cell[1], within);
        if (doc.apply(paintEdits(doc, activeLayer, region, tiles), `${tool === 'paint' ? 'Fill' : 'Erase'} area${where}`)) {
          bump();
          notify(`${tool === 'paint' ? 'Filled' : 'Erased'} ${region.length} connected cell${region.length === 1 ? '' : 's'}${within ? ' (inside the selection)' : ''}`);
        }
        return;
      }
      if (phase === 'start') doc.beginStroke(`${verb}${where}`);
      let changed: boolean;
      if (stackPlaced.current) {
        const layers = doc.ds1.walls.length + doc.ds1.floors.length;
        changed = stackPaint(cells, `${verb} (stacked)`);
        // A layer was added (its own undo step): the rest of the stroke goes on.
        if (doc.ds1.walls.length + doc.ds1.floors.length !== layers && phase !== 'end') doc.beginStroke(`${verb} (stacked)`);
      } else changed = doc.apply(paintEdits(doc, activeLayer, cells, tiles));
      if (phase === 'end') {
        doc.endStroke();
        stackPlaced.current = null;
      }
      if (changed || phase === 'end') bump();
    },
    [doc, tool, brush, mix, paintMode, paintRect, hover, selection, activeLayer, pickAt, notify, pasting, clipboard, placing, selectedObject, scene, visibility, hittable, focusTile, walkBrush, objectPasting, objectClip, objectLabel],
  );

  /** Double-clicking an object selects every object of the same kind on the map. */
  /** Double-clicking a tile selects every cell with the same tile on that layer (Delete / Ctrl+C / Ctrl+X act on them). */
  const selectSameTiles = useCallback(
    (world: [number, number]) => {
      if (!doc || !scene || viewMode !== 'tiles') return;
      const item = hitTest(scene, world[0], world[1], hittable);
      if (!item) return;
      const layer = layerOfItem(item);
      const here = doc.cell(layer, item.cellX, item.cellY);
      if (isEmptyCell(here)) return;
      const same = (c: TileCell | WallCell) =>
        !isEmptyCell(c) && c.mainIndex === here.mainIndex && c.subIndex === here.subIndex && (layer.kind !== 'wall' || (c as WallCell).orientation === (here as WallCell).orientation);
      const cells = new Set<number>();
      let [x0, y0, x1, y1] = [Infinity, Infinity, -1, -1];
      for (let y = 0; y < doc.ds1.height; y++)
        for (let x = 0; x < doc.ds1.width; x++)
          if (same(doc.cell(layer, x, y))) {
            cells.add(cellKey(x, y));
            [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
          }
      if (!cells.size) return;
      setTool('select');
      setStack(null);
      pendingAreaLayer.current = layer;
      setSelection({ x0, y0, x1, y1, cells });
      notify(`Selected ${cells.size} × tile ${here.mainIndex}/${here.subIndex} on ${layerLabel(layer)} · Delete removes them, Ctrl+C / Ctrl+X copies or cuts them, Esc deselects`);
    },
    [doc, scene, hittable, notify, viewMode],
  );

  const selectSameObjects = useCallback(
    (world: [number, number]) => {
      if (!doc) return;
      // Outside object editing, a double-click selects tiles, with the Select tool only (Paint / Erase clicks stay clicks).
      if (tool !== 'object' && viewMode !== 'objects') return tool === 'select' ? selectSameTiles(world) : undefined;
      const objs = doc.ds1.objects;
      let hit = -1;
      for (let i = objs.length - 1; i >= 0 && hit < 0; i--) {
        const [wx, wy] = subTileToWorld(objs[i].x, objs[i].y);
        if (Math.hypot(wx - world[0], wy - world[1]) < 10) hit = i;
      }
      if (hit < 0) return;
      const { type, id } = objs[hit];
      const group = new Set(objs.map((o, i) => (o.type === type && o.id === id ? i : -1)).filter((i) => i >= 0));
      setTool('object');
      setSelectedObject(hit);
      setObjectGroup(group.size > 1 ? group : null);
      notify(`Selected ${group.size} × ${objectLabel(objs[hit])}${group.size > 1 ? ' · Delete removes them, Ctrl+C / Ctrl+X copies or cuts them, Esc deselects' : ''}`);
    },
    [doc, notify, objectLabel, tool, viewMode, selectSameTiles],
  );

  // Selection commands.
  const copy = useCallback(
    (cut: boolean) => {
      if (doc && tool === 'object') {
        // Object mode: the selected object goes on the cursor, green (copy) or red (cut: taken off the map now).
        const o = selectedObject !== null ? doc.ds1.objects[selectedObject] : null;
        if (!o) return notify(`Select an object first (click it), then ${cut ? 'cut' : 'copy'} it.`);
        const group = objectGroup && objectGroup.size > 1 ? [...objectGroup].sort((a, b) => a - b) : [selectedObject!];
        const rel: Ds1Object[] = group.map((i) => {
          const g = doc.ds1.objects[i];
          return { ...g, x: g.x - o.x, y: g.y - o.y, path: g.path.map((p) => ({ ...p, x: p.x - o.x, y: p.y - o.y })) };
        });
        setObjectClip({ objects: rel, cut });
        if (cut) {
          const drop = new Set(group);
          setObjects(doc.ds1.objects.filter((_, i) => !drop.has(i)));
          setSelectedObject(null);
          setObjectGroup(null);
        }
        setPlacing(null);
        setObjectPasting(true);
        return notify(`${cut ? 'Cut' : 'Copied'} ${group.length > 1 ? `${group.length} × ${objectLabel(o)}` : objectLabel(o)} · click the map to place ${group.length > 1 ? 'them' : 'it'} · Esc to drop ${group.length > 1 ? 'them' : 'it'} from the cursor`);
      }
      if (!doc || !selection) return;
      const raw = copyRect(doc, selection);
      const clip = map ? { ...raw, ...clipboardSources(raw, map.lib) } : raw;
      const size = selectionLabel(selection);
      if (onlyLayer) {
        // One tile of a stack (Shift+wheel): just its layer, no objects.
        setClipboard({ ...clip, layers: clip.layers.filter((l) => layerKey(l.layer) === layerKey(onlyLayer)), objects: undefined });
        if (cut && doc.apply(clearEdits(doc, selection, [onlyLayer]).filter((e) => cellShown(e.layer, e.x, e.y, doc.cell(e.layer, e.x, e.y))), `Cut ${layerLabel(onlyLayer)} ${size}`)) bump();
        notify(`${cut ? 'Cut' : 'Copied'} ${layerLabel(onlyLayer)} only · move over the map to preview, click to paste, Esc when done`);
        setClipPane(true);
        setPasting(true);
        return;
      }
      // Only what is on screen: tiles hidden by As if inside or switched off in Layers stay behind.
      let left = 0;
      const shown = {
        ...clip,
        layers: clip.layers
          .map(({ layer, cells }) => ({
            layer,
            cells: cells.map((c, i) => {
              if (isEmptyCell(c) || cellShown(layer, selection.x0 + (i % clip.width), selection.y0 + Math.floor(i / clip.width), c)) return c;
              left++;
              return layer.kind === 'wall' ? { ...EMPTY_CELL, orientation: 0, orientationHigh: 0 } : EMPTY_CELL;
            }),
          }))
          .filter((l) => l.cells.some((c) => !isEmptyCell(c))),
      };
      // Objects switched off in the layer bar stay behind.
      const hiddenObjects = objectsTaken ? 0 : (shown.objects?.length ?? 0);
      if (hiddenObjects) shown.objects = undefined;
      setClipboard(shown);
      const objects = shown.objects?.length ?? 0;
      if (cut) clearArea(selection, true, `Cut ${size}`);
      const layerNames = shown.layers.map((l) => layerLabel(l.layer)).join(', ') || 'nothing visible';
      notify(
        `${cut ? 'Cut' : 'Copied'} ${size} (${layerNames}${objects ? ` + ${objects} object${objects === 1 ? '' : 's'}` : ''})${left ? ` · ${left} hidden tile${left === 1 ? '' : 's'} left out` : ''}${hiddenObjects ? ` · ${hiddenObjects} hidden object${hiddenObjects === 1 ? '' : 's'} left out` : ''} · move over the map to preview, click to paste, Esc when done`,
      );
      // Straight into pasting: the copied block follows the mouse to show where it would go.
      setClipPane(true);
      setPasting(true);
    },
    [doc, selection, notify, onlyLayer, cellShown, tool, selectedObject, objectLabel, objectGroup, objectsTaken], // eslint-disable-line react-hooks/exhaustive-deps
  );
  /** Before pasting into a map that lacks the copied tiles' DT1s, offer to load them. */
  const [pasteOffer, setPasteOffer] = useState<{
    clip: Clipboard;
    tiles: number;
    different: number;
    dt1s: string[];
    label: string;
    /** Tile numbers whose map version matches the pasted one pixel for pixel: nothing to add for them. */
    same: string[];
    /** Tile numbers whose map version looks different: the user picks which to keep. */
    clashes: PasteTileClash[];
  } | null>(null);
  /** Per clashing tile number: keep the map's version or bring in the pasted one. */
  const [pasteChoice, setPasteChoice] = useState<Record<string, 'map' | 'pasted'>>({});
  /** New names for pasted DT1s whose file name is already taken by another of the map's DT1s (path → new file name). */
  const [pasteRenames, setPasteRenames] = useState<Record<string, string>>({});
  /** The pasted DT1s named like a different DT1 the map loads: path → the loaded one. */
  const pasteNameClashes = useMemo(() => {
    const out = new Map<string, string>();
    if (!pasteOffer || !map) return out;
    const base = (p: string) => p.split('/').pop()!.toLowerCase();
    const loaded = map.lib.loaded.filter((l) => l.found && !isBuiltinPath(l.path)).map((l) => l.path);
    for (const p of pasteOffer.dt1s) {
      const twin = loaded.find((l) => base(l) === base(p) && normalizePath(l) !== normalizePath(p));
      if (twin) out.set(p, twin);
    }
    return out;
  }, [pasteOffer, map]);
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const p of pasteNameClashes.keys()) {
      const name = p.split('/').pop()!.replace(/\.dt1$/i, '');
      const dir = p.slice(0, p.lastIndexOf('/') + 1);
      let n = 2;
      while (gd?.fs.locate(`${dir}${name}${n}.dt1`)) n++;
      next[p] = `${name}${n}`;
    }
    setPasteRenames(next);
  }, [pasteNameClashes, gd]);
  const beginPaste = useCallback(
    (clip: Clipboard, label: string, skipCheck = false) => {
      const go = (c: Clipboard, note = '') => {
        setClipboard(c);
        setPasting(true);
        notify(`${label}${note} · click the map (hold Alt to stack onto existing tiles) · Esc to cancel`);
      };
      if (!skipCheck && map) {
        const m = missingForPaste(clip, map.lib);
        if (m.tiles || m.different) {
          const offer = { clip, tiles: m.tiles, different: m.different, dt1s: m.dt1s, label, same: [] as string[], clashes: [] as PasteTileClash[] };
          if (!m.different || !gd) {
            setPasteOffer(offer);
            return;
          }
          // Tile numbers the map has from another DT1: identical pictures need nothing, different ones a choice.
          const forMap = map;
          void comparePasteTiles(clip, map.lib, (p) => gd.fs.read(p))
            .then((cmp) => {
              if (currentContext.current.map?.path !== forMap.path) return;
              if (!m.tiles && !cmp.clashes.length) return go(cmp.clip, ' · its tiles match this map’s pixel for pixel');
              const settled = new Set(cmp.same);
              const sources = cmp.clip.tileSources ?? {};
              // DT1s still needed: the ones a missing or clashing tile comes from.
              const needed = new Set(Object.entries(sources).filter(([k]) => !settled.has(k)).map(([, p]) => normalizePath(p)));
              setPasteChoice(Object.fromEntries(cmp.clashes.map((c) => [c.key, 'pasted' as const])));
              setPasteOffer({ ...offer, clip: cmp.clip, different: cmp.clashes.length, dt1s: m.dt1s.filter((p) => needed.has(normalizePath(p))), same: cmp.same, clashes: cmp.clashes });
            })
            .catch(() => setPasteOffer(offer));
          return;
        }
      }
      go(clip);
    },
    [map, gd, notify],
  );
  const startPaste = useCallback(() => {
    if (tool === 'object') {
      if (!objectClip) return notify('Nothing to paste: select an object and copy it first (Ctrl+C).');
      setPlacing(null);
      setObjectPasting(true);
      return notify(`${objectClip.cut ? 'Moving' : 'Pasting'} ${objectClip.objects.length === 1 ? objectLabel(objectClip.objects[0]) : `${objectClip.objects.length} objects`} · click the map to place · Esc to cancel`);
    }
    if (!clipboard) return notify('Nothing to paste: copy a selection first (Ctrl+C).');
    beginPaste(clipboard, 'Pasting');
  }, [clipboard, notify, beginPaste, tool, objectClip, objectLabel]);
  /**
   * Clears `r`: the active layer, or (everything) every tile layer plus the objects and NPCs standing in it, so a
   * cut takes everything with it. One undo step.
   */
  function clearArea(r: CellSelection, everything: boolean, label: string) {
    if (!doc) return;
    // Clearing everything takes what is on screen (see cellShown); the active layer is cleared as it is.
    const edits = clearEdits(doc, r, everything ? doc.layers() : [activeLayer]).filter((e) => !everything || cellShown(e.layer, e.x, e.y, doc.cell(e.layer, e.x, e.y)));
    // Objects switched off in the layer bar stay where they are.
    const inside = everything && objectsTaken ? doc.ds1.objects.filter((o) => objectInRect(o, r)).length : 0;
    if (!inside) {
      if (doc.apply(edits, label)) bump();
      return;
    }
    doc.mutate((d) => {
      for (const e of edits) {
        const layers = e.layer.kind === 'floor' ? d.floors : e.layer.kind === 'wall' ? d.walls : d.shadows;
        (layers[e.layer.index] as typeof e.cell[])[e.y * d.width + e.x] = e.cell;
      }
      d.objects = d.objects.filter((o) => !objectInRect(o, r));
    }, `${label} + ${inside} object${inside === 1 ? '' : 's'}`);
    setSelectedObject(null);
    bump();
  }
  const clearSelection = useCallback(
    (allLayers: boolean) => {
      if (!doc || !selection) return;
      const size = selectionLabel(selection);
      if (allLayers) { clearArea(selection, true, `Clear ${size}`); return; }
      const layers = onlyLayer ? [onlyLayer] : doc.layers();
      const edits = clearEdits(doc, selection, layers).filter(e => cellShown(e.layer, e.x, e.y, doc.cell(e.layer, e.x, e.y)));
      if (doc.apply(edits, `Clear ${onlyLayer ? layerLabel(onlyLayer) : 'visible tiles'} ${size}`)) bump();
    },
    [doc, selection, activeLayer, onlyLayer, cellShown, objectsTaken], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const fillSelection = useCallback(() => {
    if (!doc || !selection) return;
    if (!brush) return notify('Choose a tile in the Tiles panel first.', true);
    const tiles = [brush, ...mix].map((b) => ({ ...b, orientation: brushOrientation(activeLayer, b) }));
    if (doc.apply(paintEdits(doc, activeLayer, rectCells(selection), tiles), `Fill ${layerLabel(activeLayer)}`)) bump();
  }, [doc, selection, brush, mix, activeLayer, notify]);
  const rerollSelection = useCallback(() => {
    if (!doc || !selection) return;
    if (activeLayer.kind === 'floor') { setDialog('floors'); return; }
    const edits = rerollEdits(doc, selection, [activeLayer]);
    if (doc.apply(edits, `Re-roll ${layerLabel(activeLayer)}`)) {
      bump();
      notify(`Re-rolled ${edits.length} tiles on ${layerLabel(activeLayer)}`);
    } else notify(`Nothing to re-roll: ${layerLabel(activeLayer)} here uses one tile per group. Re-roll mixes the tiles of a group (same main index) already in the selection.`);
  }, [doc, selection, activeLayer, notify]);
  /** The tile to find, for Find & replace: the selected cell's on the active layer, else the brush. */
  const replaceFrom = useMemo((): TileKey | null => {
    if (!doc || dialog !== 'replace') return null;
    const c = selection && isSingleCell(selection) ? keyOf(activeLayer, doc.cell(activeLayer, selection.x0, selection.y0)) : null;
    return c ?? (brush ? { ...brush, orientation: brushOrientation(activeLayer, brush) } : null);
  }, [doc, dialog, selection, activeLayer, brush]);
  /** A colour-coded overview of the map (walkable sub-tiles or monster spawns), for the view and image export. */
  const overviewOf = useCallback(
    (kind: OverlayKind | null) => {
      if (!kind || !map || !scene || !gd) return null;
      const flags = overlayFlags(map.ds1, scene, map.lib, map.resolution.preset);
      return kind === 'walkable' ? walkableOverlay(map.ds1, flags) : spawnOverlay(map.ds1, flags, spawnLevelOf(gd, map));
    },
    [map, scene, gd],
  );
  const overview = useMemo(() => overviewOf(visibility.overview), [overviewOf, visibility.overview]);
  const exportImage = useCallback(
    async ({ overview: kind, ...o }: { area: CellRect | null; scale: number; objects: boolean; overview: OverlayKind | null }) => {
      if (!doc || !map || !scene) return;
      setExportingImage(true);
      try {
        const blob = await renderMapImage(scene, doc.ds1.objects, sprites, map.palette, doc.ds1.width, doc.ds1.height, { ...o, overlay: overviewOf(kind), visible: (it) => isVisible(it, visibility) });
        const where = await exportBytes(`${doc.path.split('/').pop()!.replace(/\.ds1$/i, '')}.png`, new Uint8Array(await blob.arrayBuffer()));
        if (where) notify(`Exported ${where}`);
        setDialog(null);
      } catch (e) {
        notify(`Export failed: ${errorMessage(e)}`, true);
      } finally {
        setExportingImage(false);
      }
    },
    [doc, map, scene, sprites, visibility, notify, overviewOf],
  );
  const setObjects = useCallback(
    (next: Ds1Object[]) => {
      if (!doc) return;
      doc.setObjects(next);
      if (selectedObject !== null && selectedObject >= next.length) setSelectedObject(null);
      bump();
    },
    [doc, selectedObject],
  );
  const deleteSelectedObject = useCallback(() => {
    if (!doc || selectedObject === null) return false;
    const drop = objectGroup ?? new Set([selectedObject]);
    if (drop.size > 1 && prefsRef.current.confirmBulkDelete && !window.confirm(`Delete ${drop.size} objects? (Ctrl+Z undoes it)`)) return true;
    setObjects(doc.ds1.objects.filter((_, i) => !drop.has(i)));
    if (drop.size > 1) notify(`Deleted ${drop.size} objects (Ctrl+Z to undo)`);
    setSelectedObject(null);
    setObjectGroup(null);
    return true;
  }, [doc, selectedObject, objectGroup, setObjects, notify]);
  // Load sprites for every distinct object on the map (cached per object id in GameData).
  // (and those on the cursor after a cut, which are off the map but still drawn)
  const objectKeys = map ? [...new Set([...map.ds1.objects, ...(objectClip?.objects ?? [])].map((o) => `${o.type}:${o.id}`))].sort().join(',') : '';
  useEffect(() => {
    if (!gd || !map || !objectKeys) return setSprites(new Map());
    let cancelled = false;
    const act = map.ds1.act;
    Promise.all(
      objectKeys.split(',').map(async (k) => {
        const [type, id] = k.split(':').map(Number);
        return [k, await gd.objectSprite(act, type, id)] as const;
      }),
    ).then((entries) => {
      if (!cancelled) setSprites(new Map(entries.filter((e): e is [string, Sprite] => !!e[1])));
    });
    return () => {
      cancelled = true;
    };
  }, [gd, map, objectKeys]);
  // Animations for the same objects, loaded only while animation and sprites are shown.
  const [animations, setAnimations] = useState<Map<string, SpriteAnimation>>(() => new Map());
  useEffect(() => {
    // Loaded whenever sprites show (not only while animating): they also carry the translucent/glowing layers.
    if (!gd || !map || !objectKeys || !visibility.sprites) return setAnimations(new Map());
    let cancelled = false;
    const act = map.ds1.act;
    Promise.all(
      objectKeys.split(',').map(async (k) => {
        const [type, id] = k.split(':').map(Number);
        return [k, await gd.objectAnimation(act, type, id)] as const;
      }),
    ).then((entries) => {
      if (!cancelled) setAnimations(new Map(entries.filter((e): e is [string, SpriteAnimation] => !!e[1] && e[1].parts.length > 0)));
    });
    return () => {
      cancelled = true;
    };
  }, [gd, map, objectKeys, visibility.sprites]);


  const mutate = useCallback(
    (fn: (ds1: Ds1) => Ds1 | void) => {
      if (!doc) return;
      doc.mutate(fn);
      bump();
    },
    [doc],
  );
  const resize = useCallback(
    (d: ResizeDelta) => {
      mutate((ds1) => resizeDs1(ds1, d));
      setSelection(null);
      setSelectedObject(null);
      setDialog(null);
      setFitSignal((n) => n + 1);
    },
    [mutate],
  );
  const createMap = useCallback(
    async (c: NewMapChoice) => {
      if (!gd || !confirmDiscard()) return;
      // Only the special-tile library to start with (the rest are picked next, from the DT1 library), in the Act 0
      // colours. The game finds special tiles such as the Map entry only in a loaded DT1 that has them.
      const special = gd.fs.locate(SPECIAL_TILES_DT1) ? [gd.fs.exactPath(SPECIAL_TILES_DT1) ?? SPECIAL_TILES_DT1] : [];
      // An existing level type: its tile libraries to start with (the ones found), in its act's colours.
      const type = c.lvlType !== null ? gd.lvlType(c.lvlType) : null;
      const typeFiles = type ? GameData.dt1sFor(type, 0xffffffff).filter((p) => gd.fs.locate(p)).map((p) => gd.fs.exactPath(p) ?? p) : [];
      const paths = [...typeFiles, ...special.filter((s) => !typeFiles.some((p) => normalizePath(p) === normalizePath(s)))];
      const ds1 = newDs1({ ...c, files: paths.map(embeddedFileName) });
      newMapTypes.current.set(normalizePath(c.path), { typeId: type?.id ?? null });
      try {
        if (!type) rememberPalette(c.path, ACT0_PALETTE);
        const m = await openMap(gd, c.path, { source: 'manual', lvlType: type, paths }, ds1);
        const d = new MapDocument(c.path, m.ds1);
        d.markUnsaved();
        setMap(m);
        setDoc(d);
        setSelection(null);
        setSelectedObject(null);
        setActiveLayer({ kind: 'floor', index: 0 });
        if (type) {
          setDialog(null);
          notify(`New ${c.width}×${c.height} map with level type ${type.id} "${type.name}" (${typeFiles.length} tile libraries). Paint (B); Save writes ${c.path}.`);
        } else {
          setDialog('dt1lib');
          notify(`New ${c.width}×${c.height} map, in the Act 0 colours. Choose its tile libraries in the DT1 library, then paint (B); Save writes ${c.path}.`);
        }
      } catch (e) {
        notify(errorMessage(e), true);
      }
    },
    [gd, confirmDiscard, notify],
  );
  const saveAs = useCallback(
    (path: string) => {
      if (!doc || !map) return;
      doc.path = path;
      setMap({ ...map, path });
      setDialog(null);
      // Save on the next render, once `data.files`/`doc.path` reflect the new name.
      setTimeout(() => void handlers.current.save(), 0);
    },
    [doc, map],
  );

  const applyEdits = useCallback(
    (edits: CellEdit[]) => {
      if (doc?.apply(edits)) bump();
    },
    [doc],
  );

  /** Writes files into the mod (via the save target) and makes the app see them right away. */
  const writeFiles = useCallback(
    async (files: { path: string; bytes: Uint8Array }[]) => {
      if (!gd || data.status !== 'ready' || !data.saveTarget) throw new Error('No writable mod folder is configured.');
      for (const f of files) validateAutomapSave(f.path, f.bytes);
      for (const f of files) {
        await data.saveTarget.save(f.path, f.bytes);
        gd.fs.remember(f.path, f.bytes, data.saveTarget.label);
      }
    },
    [gd, data],
  );

  /** After table edits: reloads the game tables and re-resolves the open map (keeping its edits); returns the tables for a map opened right after (the state updates later). */
  const reloadTables = useCallback(async (): Promise<GameData | undefined> => {
    if (!gd || data.status !== 'ready') return;
    const next = await GameData.load(gd.fs);
    const files = gd.fs.list((p) => p.endsWith('.ds1') && p.startsWith('data/global/tiles/'));
    setData({ ...data, gd: next, files });
    if (map) {
      const request = mapRequest.current;
      const refreshed = await openMap(next, map.path, map.resolution.source === 'manual' ? { source: 'manual', paths: map.resolution.paths, lvlType: map.resolution.lvlType } : undefined, map.ds1);
      if (currentContext.current.doc === doc && request === mapRequest.current) setMap(refreshed);
    }
    return next;
  }, [gd, data, map, doc]);

  // The level's light, read again whenever the tables or the map change.
  useEffect(() => {
    const levelId = map?.resolution.preset?.levelId ?? 0;
    if (!gd || !levelId) return setLevelLight(null);
    let live = true;
    void loadTable(gd.fs, 'Levels.txt').then((t) => {
      if (!live) return;
      const r = t ? rowOfRecord(t, levelId) : -1;
      if (!t || r < 0) return setLevelLight(null);
      const n = (c: string, empty: number) => (getCell(t, r, c).trim() === '' ? empty : Number(getCell(t, r, c)) || 0);
      setLevelLight({ levelId, name: getCell(t, r, 'Name'), intensity: n('Intensity', 0), rgb: [n('Red', 255), n('Green', 255), n('Blue', 255)] });
    });
    return () => {
      live = false;
    };
  }, [gd, map]);

  const applyTableWrites = useCallback(
    async (writes: TableWrite[]) => {
      try {
        await writeFiles(writes);
        await reloadTables();
        setDialog(null);
        notify(`Updated ${writes.map((w) => w.table).join(', ')}`);
      } catch (e) {
        notify(errorMessage(e), true);
      }
    },
    [writeFiles, reloadTables, notify],
  );

  /** Level light mode: writes Intensity and Red/Green/Blue into the map's Levels.txt row. */
  const applyLevelLight = useCallback(
    async (intensity: number, rgb: [number, number, number]) => {
      if (!gd || !levelLight) return;
      const t = await loadTable(gd.fs, 'Levels.txt');
      const r = t ? rowOfRecord(t, levelLight.levelId) : -1;
      if (!t || r < 0) return notify('Levels.txt: the level was not found', true);
      const fix = cellFix('Levels.txt', t, 'Level light', [
        { row: r, col: 'Intensity', value: String(intensity) },
        { row: r, col: 'Red', value: String(rgb[0]) },
        { row: r, col: 'Green', value: String(rgb[1]) },
        { row: r, col: 'Blue', value: String(rgb[2]) },
      ]);
      await applyTableWrites(fix.writes);
    },
    [gd, levelLight, notify, applyTableWrites],
  );

  /** DT1s the placed tiles come from, with counts (for the DT1 manager and checks). */
  const dt1Usage = useMemo(() => {
    const usage = new Map<string, number>();
    for (const it of scene?.items ?? []) {
      const src = map?.lib.sourceOf(it.tile);
      if (src) usage.set(normalizePath(src.path), (usage.get(normalizePath(src.path)) ?? 0) + 1);
    }
    return usage;
  }, [scene, map]);

  const libraryDocuments = useRef(new WeakSet<MapDocument>());
  /** Entering text: Levels.txt and the Act 1 palette (the game draws those images with it), loaded when it opens. */
  const [entryTables, setEntryTables] = useState<{ levels: TxtTableDoc; palette: Palette } | null>(null);
  useEffect(() => {
    if (dialog !== 'entrytext' || !gd) return void setEntryTables(null);
    let live = true;
    void Promise.all([loadTable(gd.fs, 'Levels.txt'), gd.palette(0)]).then(([levels, palette]) => {
      if (!live) return;
      if (!levels) return notify('Levels.txt was not found.', true);
      setEntryTables({ levels, palette });
    });
    return () => {
      live = false;
    };
  }, [dialog, gd, notify]);
  /** The map's level type has no free slot for its libraries: the dialog offering ways to make room. */
  const [typeFull, setTypeFull] = useState<{ reason: string | null } | null>(null);
  const applyDt1s = useCallback(
    async (paths: string[], opts: { keepOpen?: boolean; strict?: boolean; floors?: number; edits?: CellEdit[]; file?: FileHistoryChange; label?: string } = {}): Promise<OpenMap | undefined> => {
      if (!gd || !map || !doc) return;
      let note = '';
      if (map.resolution.preset) {
        try {
          const writes = await syncLevelTables(gd.fs, map.path, paths.map(p => gd.fs.exactPath(p) ?? p), map.resolution.lvlType?.id);
          if (writes.length) await writeFiles(writes);
        } catch (e) {
          if (opts.strict) throw e;
          note = ' Game tables could not be updated: ' + String(e);
          if (e instanceof SlotsFullError) setTypeFull({ reason: `The map now lists the tile libraries, but the game tables weren't updated: ${e.message}.` });
        }
      }
      if (currentContext.current.doc !== doc) return;
      libraryDocuments.current.add(doc);
      doc.mutate(d => {
        d.files = [...paths.map(embeddedFileName), ...d.files.filter(f => !/data[\\/]/i.test(f))];
        while (d.floors.length < (opts.floors ?? 0)) d.floors.push(Array.from({ length: d.width * d.height }, () => EMPTY_CELL));
        for (const e of opts.edits ?? []) {
          const layers = e.layer.kind === 'floor' ? d.floors : e.layer.kind === 'wall' ? d.walls : d.shadows;
          layers[e.layer.index][e.y * d.width + e.x] = e.cell;
        }
      }, opts.label ?? (opts.edits ? 'Clear selected automap pieces' : 'Change tile libraries'), opts.file);
      bump();
      const next = await GameData.load(gd.fs);
      const auto = next.resolveDt1s(map.path, doc.ds1);
      const matches = auto.paths.map(normalizePath).join('|') === paths.map(normalizePath).join('|');
      const refreshed = await openMap(next, map.path, matches ? undefined : { source: 'manual', paths, lvlType: next.lvlType(map.resolution.lvlType?.id ?? -1) ?? map.resolution.lvlType }, doc.ds1);
      if (currentContext.current.doc !== doc) return;
      setData(d => d.status === 'ready' ? { ...d, gd: next } : d);
      setMap(refreshed);
      if (!opts.keepOpen) setDialog(null);
      notify('Tile libraries: ' + paths.length + note, !!note);
      return refreshed;
    },
    [gd, map, doc, mutate, writeFiles, notify],
  );

  // Library changes are part of map undo. Restore their previews as the embedded list changes.
  useEffect(() => {
    if (!gd || !map || !doc || !libraryDocuments.current.has(doc)) return;
    const paths = doc.ds1.files.map(ds1FileToDt1Path).filter((p): p is string => !!p);
    if (paths.map(normalizePath).join('|') === map.resolution.paths.map(normalizePath).join('|')) return;
    let live = true;
    void openMap(gd, map.path, { source: 'manual', paths, lvlType: map.resolution.lvlType }, doc.ds1)
      .then(m => { if (live && currentContext.current.doc === doc) setMap(m); })
      .catch(e => live && notify(String(e), true));
    return () => { live = false; };
  }, [gd, map, doc, revision, notify]);

  /** Re-index physical assets without discarding the open document. */
  const refreshAssets = useCallback(async () => {
    if (!isTauri || !desktopCfg || data.status !== 'ready') return;
    const previous = currentContext.current;
    const request = mapRequest.current;
    const fs = await loadFromTauri(desktopCfg);
    const next = await GameData.load(fs);
    setData(d => d.status === 'ready' ? { ...d, gd: next, files: fs.list(p => p.endsWith('.ds1') && p.startsWith('data/global/tiles/')) } : d);
    if (previous.map && previous.doc) {
      const m = previous.map;
      const refreshed = await openMap(next, m.path, m.resolution.source === 'manual' ? { source: 'manual', paths: m.resolution.paths, lvlType: m.resolution.lvlType } : undefined, previous.doc.ds1);
      if (currentContext.current.doc === previous.doc && request === mapRequest.current) setMap(refreshed);
    }
  }, [desktopCfg, data.status]);

  const openCleanup = (restore = false) => {
    if (flagEdits.current.size) { notify('Save or discard the pending walkability changes before managing files.', true); return; }
    setDialog(restore ? 'restore' : 'cleanup');
  };
  const deleteDs1 = async (path: string) => {
    if (!gd || !isTauri) return;
    try {
      const owned = findManagedAsset(await managedAssets(), path, gd.fs.locate(path));
      if (!owned) throw new Error('This map is inside a game archive or a read-only source. Only loose DS1 files can be deleted.');
      const active = doc && normalizePath(doc.path) === normalizePath(path);
      if (!window.confirm('Delete ' + path + '?\n\n' + (active && doc.dirty ? 'Its unsaved edits will also be discarded.\n' : '') +
        'A recoverable backup will be kept in DS1 Studio’s data folder (Asset backups). Game table references are unchanged. If this overrides a base-game map, the base version will become visible.')) return;
      await archiveAsset(owned, await gd.fs.readOrThrow(path), 'delete');
      if (active && currentContext.current.doc === doc) {
        ++mapRequest.current;
        setMap(null); setDoc(null); setSelection(null); setHover(null); setStack(null);
        currentContext.current = { ...currentContext.current, map: null, doc: null };
      }
      await deleteRecovery(path);
      await refreshAssets();
      notify('Deleted ' + path.split('/').pop() + '. Diagnostics → Restore assets can put it back.');
    } catch (e) { notify(String(e), true); }
  };

  const selectMapCells = (cells: { x: number; y: number }[]) => {
    if (!doc || !cells.length) { notify('No matching tiles in the open map.'); return; }
    const valid = cells.filter(c => doc.inBounds(c.x, c.y));
    if (!valid.length) return;
    const mask = new Set<number>();
    const area: CellSelection = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity, cells: mask };
    for (const c of valid) { area.x0 = Math.min(area.x0, c.x); area.y0 = Math.min(area.y0, c.y); area.x1 = Math.max(area.x1, c.x); area.y1 = Math.max(area.y1, c.y); mask.add(cellKey(c.x, c.y)); }
    setSelection(area); setMarks(valid); setStack(null); setDialog(null); exitMode();
    const [x, y] = cellToWorld(valid[0].x + 0.5, valid[0].y + 0.5);
    setCenterOn(c => ({ x, y, signal: (c?.signal ?? 0) + 1 }));
    notify(area.cells!.size + ' matching map cells selected.');
  };
  const showLibraryUses = async (path: string) => {
    if (!gd || !doc || !map) return;
    try {
      if (!map.lib.loaded.some(l => normalizePath(l.path) === normalizePath(path))) { notify('This map does not load that DT1.'); return; }
      selectMapCells(usesOfLibrary(doc.ds1, parseDt1(await gd.fs.readOrThrow(path)).tiles));
    } catch (e) { notify(String(e), true); }
  };
  const detachLibrary = async (path: string) => {
    if (!gd || !doc || !map) return;
    const uses = usesOfLibrary(doc.ds1, parseDt1(await gd.fs.readOrThrow(path)).tiles);
    if (!window.confirm('Clear ' + uses.length + ' matching tile placements and detach ' + path.split('/').pop() +
      ' from this map?\n\nTile numbers shared with other libraries also match. The DT1 file stays on disk. Map changes can be undone; save the map to keep them.')) return;
    const paths = map.lib.loaded.filter(l => !isBuiltinPath(l.path) && normalizePath(l.path) !== normalizePath(path)).map(l => l.path);
    const writes = map.resolution.preset ? await syncLevelTables(gd.fs, map.path, paths, map.resolution.lvlType?.id) : [];
    if (writes.length) await writeFiles(writes);
    libraryDocuments.current.add(doc);
    doc.mutate(d => {
      for (const u of uses) {
        const cells = u.layer.kind === 'floor' ? d.floors[u.layer.index] : u.layer.kind === 'wall' ? d.walls[u.layer.index] : d.shadows[u.layer.index];
        cells[u.y * d.width + u.x] = MapDocument.painted(u.layer, cells[u.y * d.width + u.x], null);
      }
      d.files = [...paths.map(embeddedFileName), ...d.files.filter(f => !/data[\\/]/i.test(f))];
    });
    bump();
    const next = await GameData.load(gd.fs);
    setData(d => d.status === 'ready' ? { ...d, gd: next } : d);
    const refreshed = await openMap(next, map.path, { source: 'manual', paths, lvlType: map.resolution.lvlType }, doc.ds1);
    if (currentContext.current.doc === doc) setMap(refreshed);
    setDialog(null); notify('Cleared matching placements and detached the library. Save the map to keep the changes.');
  };

  const removeDt1Tile = useCallback(async (path: string, index: number) => {
    if (!gd) return;
    if (!isTauri) throw new Error('Deleting DT1 tiles with recovery requires the desktop app.');
    const owned = findManagedAsset(await managedAssets(), path, gd.fs.locate(path));
    if (!owned) throw new Error('Only loose DT1 files can be changed here.');
    const bytes = await gd.fs.readOrThrow(path), tiles = parseDt1(bytes).tiles, tile = tiles[index];
    const expected = (await gd.dt1(path))?.tiles[index];
    if (!tile || !expected || tile.orientation !== expected.orientation || tile.mainIndex !== expected.mainIndex || tile.subIndex !== expected.subIndex)
      throw new Error('That tile changed after the viewer opened. Refresh the libraries before deleting it.');
    const key = tileIdentity(tile.orientation, tile.mainIndex, tile.subIndex);
    const indices = tiles.flatMap((t, i) => tileIdentity(t.orientation, t.mainIndex, t.subIndex) === key ? [i] : []);
    const split = splitUnusedTiles(bytes, indices);
    await archiveAsset(owned, bytes, 'delete', split.remaining, split.removed);
    await refreshAssets();
    notify('Removed ' + indices.length + ' tile record(s). Use Deleted by accident? to restore the original.');
  }, [gd, refreshAssets, notify]);

  const applyFloorReroll = async (choices: FloorChoice[], layer: number, options: RerollOptions) => {
    if (!gd || !doc || !map) return;
    const area = selection ?? { x0: 0, y0: 0, x1: doc.ds1.width - 1, y1: doc.ds1.height - 1 };
    const sources = new Map<string, Uint8Array>();
    for (const path of new Set(choices.map(c => c.path))) sources.set(path, await gd.fs.readOrThrow(path));
    // The copies go into the level type's own-tiles file (see game/ownTiles.ts), numbered free across the type.
    const own = await ownTiles();
    const plan = prepareFloorLibrary(choices, sources, own.taken);
    if (plan.skipped.length || !plan.records.length) throw new Error(plan.skipped.join('\n') || 'No floor tiles could be copied.');
    const path = own.path;
    const { bytes, first } = appendTiles(own.existing, plan.records), tiles = parseDt1(bytes).tiles;
    const selected = plan.tiles.map((t, i) => ({ path, index: first + i, tile: tiles[first + i], brush: { orientation: 0, main: t.newMain, sub: t.newSub } }));
    const result = smartFloorReroll(doc, map.lib, area, layer, selected, options);
    if (!result.edits.length) throw new Error('No eligible floors match these choices. Try other tiles or turn off Preserve walkability.');
    const paths = own.listed ? own.libs : [...own.libs, path];
    if (map.resolution.preset) await syncLevelTables(gd.fs, map.path, paths, map.resolution.lvlType?.id);
    await writeFiles([{ path, bytes }]);
    gd.forgetDt1(path);
    await applyDt1s(paths, { keepOpen: true, strict: true });
    if (currentContext.current.doc !== doc) return;
    doc.apply(result.edits, 'Reroll floors'); bump(); setActiveLayer({ kind: 'floor', index: layer }); setDialog(null);
    notify('Rerolled ' + result.edits.length + ' floors' + (result.skipped ? '; kept ' + result.skipped + ' cells with different walkability' : '') + '. Save the map to keep the changes.');
  };
  const saveWater = async (change: WaterSave) => {
    if (!gd || !map || !doc) return;
    const existing = await gd.fs.read(change.path);
    if (change.expected ? !existing || existing.length !== change.expected.length || existing.some((b, i) => b !== change.expected![i]) : !!existing)
      throw new Error(change.expected ? 'The source changed since opening. Reopen it before saving.' : 'That file already exists. Choose another name.');
    let bytes = change.bytes;
    const paths = map.lib.loaded.filter(l => l.found && !isBuiltinPath(l.path)).map(l => l.path);
    const listed = paths.some(p => normalizePath(p) === normalizePath(change.path));
    if (!change.expected && change.addToMap) {
      const plan = planCustomDt1(dt1Records(bytes).map((_, index) => ({ dt1: change.path, index })), new Map([[change.path, bytes]]), new Set(map.lib.entries().map(e => tileIdentity(e.orientation, e.main, e.sub))));
      if (plan.skipped.length) throw new Error(plan.skipped.join('\n'));
      bytes = buildDt1(plan.records);
    }
    if (change.expected) bytes.set(change.expected.subarray(8, 268), 8);
    if (change.addToMap && !listed && map.resolution.preset) await syncLevelTables(gd.fs, map.path, [...paths, change.path], map.resolution.lvlType?.id);
    await writeFiles([{ path: change.path, bytes }]);
    if (change.addToMap && !listed) await applyDt1s([...paths, change.path], { keepOpen: true, strict: true });
    else await reloadTables();
    notify('Saved water animation in ' + change.path.split('/').pop() + '.');
  };

  /**
   * Tile libraries: renames a mod DT1 in its folder. The file is written under the new name, every level type that
   * loads it (LvlTypes.txt) and this map are pointed at it, and the old file is moved aside to .bak (never deleted).
   */
  const renameDt1 = useCallback(
    async (path: string, name: string): Promise<string> => {
      const target = data.status === 'ready' ? data.saveTarget : null;
      if (!gd || !map || !target) throw new Error('No writable mod folder is configured.');
      const rel = (gd.fs.exactPath(path) ?? path).replace(/^data\/global\/tiles\//i, '');
      const newRel = `${rel.split('/').slice(0, -1).join('/')}/${name}.dt1`;
      const newPath = `data/global/tiles/${newRel}`;
      if (gd.fs.locate(newPath)) throw new Error(`${newRel} already exists.`);
      const bytes = await gd.fs.read(path);
      if (!bytes) throw new Error(`${path} was not found.`);
      const writes: { path: string; bytes: Uint8Array }[] = [{ path: newPath, bytes }];
      const types = await loadTable(gd.fs, 'LvlTypes.txt');
      const renamed = types ? renameInLvlTypes(types, rel, newRel) : null;
      if (renamed?.changed.length) writes.push({ path: 'data/global/excel/LvlTypes.txt', bytes: serializeTxtTable(renamed.doc) });
      await writeFiles(writes);
      let note: string;
      if (target.retire) {
        const moved = await target.retire(`data/global/tiles/${rel}`);
        gd.fs.forget(path);
        note = `the old file is kept as ${moved.split(/[\\/]/).pop()}`;
      } else note = "the old file is still there (nothing loads it any more)";
      const libs = map.lib.loaded.filter((l) => l.found && !isBuiltinPath(l.path)).map((l) => (normalizePath(l.path) === normalizePath(path) ? newPath : l.path));
      await applyDt1s(libs, { keepOpen: true });
      notify(`Renamed ${rel.split('/').pop()} to ${name}.dt1${renamed?.changed.length ? `; level types updated: ${renamed.changed.join(', ')}` : ''}; ${note}.`);
      return newPath;
    },
    [gd, map, data, writeFiles, applyDt1s, notify],
  );

  /**
   * Tile libraries: moves one of the map's libraries up or down in load order (the first loaded wins when two have a
   * tile of the same number). A map in the game trades File slots with its neighbour in LvlTypes (every map of the type
   * keeps its libraries); a map not in the game just lists them in the new order.
   */
  const moveLibrary = useCallback(
    async (path: string, dir: -1 | 1) => {
      if (!gd || !map) return;
      const libs = map.lib.loaded.filter((l) => !isBuiltinPath(l.path)).map((l) => l.path);
      const i = libs.findIndex((p) => normalizePath(p) === normalizePath(path));
      const j = i + dir;
      if (i < 0 || j < 0 || j >= libs.length) return;
      const order = libs.slice();
      [order[i], order[j]] = [order[j], order[i]];
      if (map.resolution.preset) {
        const writes = planSwapLibraries(await loadLevelTables(gd.fs), map.path, gd.fs.exactPath(libs[i]) ?? libs[i], gd.fs.exactPath(libs[j]) ?? libs[j], map.resolution.lvlType?.id);
        if (writes.length) await writeFiles(writes);
      }
      await applyDt1s(order, { keepOpen: true, strict: true, label: 'Change tile library load order' });
      notify(`${path.split('/').pop()} moved ${dir < 0 ? 'up' : 'down'} in load order (now ${j + 1} of ${libs.length}).`);
    },
    [gd, map, writeFiles, applyDt1s, notify],
  );

  /** Which the hide-area dialog sets up by default: roof or wall hiding (the same game feature). */
  const [popsKind, setPopsKind] = useState<'roof' | 'wall'>('roof');
  /** Two copies of the same tiles to choose between (from the compatibility check). */
  const [chooseCopies, setChooseCopies] = useState<{ earlier: string; later: string; keys: number[] }[] | null>(null);
  const [chooseVersions, setChooseVersions] = useState<{ path: string; key: number; indices: number[] }[] | null>(null);
  /** Check results accepted as intended for the open map. */
  const [acceptedChecks, setAcceptedChecks] = useState<Set<string>>(new Set());
  useEffect(() => setAcceptedChecks(map ? acceptedResults(map.path) : new Set()), [map?.path]); // eslint-disable-line react-hooks/exhaustive-deps
  /** Tile files whose paths are too long, being renamed (from the compatibility check). */
  const [shortenPaths, setShortenPaths] = useState<string[] | null>(null);
  /**
   * Moves tile files (paths relative to data/global/tiles) to shorter paths: writes each at its new path, points every
   * LvlTypes / LvlPrest row at it, retires the old file, and reopens the map (at its new path when it moved).
   */
  const moveTileFiles = useCallback(
    async (renames: { from: string; to: string }[]) => {
      const target = data.status === 'ready' ? data.saveTarget : null;
      if (!gd || !map || !doc || !target) throw new Error('No writable mod folder is configured.');
      if (!renames.length) return;
      const full = (rel: string) => `data/global/tiles/${rel}`;
      const movesMap = renames.find((r) => normalizePath(full(r.from)) === normalizePath(map.path));
      if (movesMap && doc.dirty) {
        await handlers.current.save();
        if (doc.dirty) throw new Error('Save the map first (it is one of the files being moved).');
      }
      const writes: { path: string; bytes: Uint8Array }[] = [];
      for (const r of renames) {
        if (gd.fs.locate(full(r.to))) throw new Error(`${r.to} already exists.`);
        const bytes = await gd.fs.read(full(r.from));
        if (!bytes) throw new Error(`${r.from} was not found.`);
        writes.push({ path: full(r.to), bytes });
      }
      let types = await loadTable(gd.fs, 'LvlTypes.txt');
      let prest = await loadTable(gd.fs, 'LvlPrest.txt');
      const changedTypes: string[] = [];
      const changedPrest: string[] = [];
      for (const r of renames) {
        if (types) {
          const t = renameInLvlTypes(types, r.from, r.to);
          types = t.doc;
          changedTypes.push(...t.changed.filter((c) => !changedTypes.includes(c)));
        }
        if (prest) {
          const p = renameInLvlPrest(prest, r.from, r.to);
          prest = p.doc;
          changedPrest.push(...p.changed.filter((c) => !changedPrest.includes(c)));
        }
      }
      if (types && changedTypes.length) writes.push({ path: 'data/global/excel/LvlTypes.txt', bytes: serializeTxtTable(types) });
      if (prest && changedPrest.length) writes.push({ path: 'data/global/excel/LvlPrest.txt', bytes: serializeTxtTable(prest) });
      await writeFiles(writes);
      let retired = 0;
      if (target.retire)
        for (const r of renames) {
          const at = gd.fs.exactPath(full(r.from)) ?? full(r.from);
          await target.retire(full(r.from));
          gd.fs.forget(at);
          retired++;
        }
      const swapped = (p: string) => {
        const r = renames.find((x) => normalizePath(full(x.from)) === normalizePath(p));
        return r ? full(r.to) : p;
      };
      if (movesMap) {
        const next = await reloadTables();
        await open(full(movesMap.to), true, next);
      } else {
        const libs = map.lib.loaded.filter((l) => l.found && !isBuiltinPath(l.path)).map((l) => swapped(l.path));
        await applyDt1s(libs, { keepOpen: true });
      }
      notify(
        `Moved ${renames.length} file${renames.length === 1 ? '' : 's'} to shorter paths` +
          (changedTypes.length ? `; level types updated: ${changedTypes.join(', ')}` : '') +
          (changedPrest.length ? `; presets updated: ${changedPrest.join(', ')}` : '') +
          (retired ? '; the old files are kept aside' : '; the old files are still there (nothing loads them any more)'),
      );
      setTimeout(() => void runCheckRef.current(), 300);
    },
    [gd, map, doc, data, writeFiles, reloadTables, open, applyDt1s, notify],
  );

  /**
   * Import DT1 → From game library → Build a custom DT1: writes the new library, adds it to the map (LvlTypes / Dt1Mask
   * like any added library), then copies each tile's automap pieces into AutoMap.txt for the map's level (whose type
   * is only final once the tables are synced: a shared type is split off first).
   */
  const createCustomDt1 = useCallback(
    async ({ path, plan, bytes: dt1Bytes, actSafe, keepOpen, existing }: { path: string; plan: CustomDt1Plan; bytes: Uint8Array; actSafe: boolean; keepOpen?: boolean; existing?: Uint8Array | null }) => {
      if (!gd || !map) return;
      // `existing` given: the tiles are added to that file (the level type's own-tiles file); else it's a new DT1.
      if (existing === undefined && gd.fs.locate(path)) throw new Error(`${path} already exists.`);
      if (!plan.records.length) throw new Error('No tiles to put in it.');
      await writeFiles([{ path, bytes: existing === undefined ? dt1Bytes : appendTiles(existing, plan.records).bytes }]);
      gd.forgetDt1(path);
      const libs = map.lib.loaded.filter((l) => !isBuiltinPath(l.path)).map((l) => l.path);
      await applyDt1s(libs.some((l) => normalizePath(l) === normalizePath(path)) ? libs : [...libs, path], { keepOpen, strict: true });
      let automapNote = '';
      try {
        const fresh = await GameData.load(gd.fs);
        const type = fresh.resolveDt1s(map.path, map.ds1).lvlType;
        const bytes = await gd.fs.read(AUTOMAP_TXT);
        if (type && bytes) {
          const doc = parseTxtTable(bytes);
          const table = parseAutomap(doc);
          const level = automapLevelFor(table, type.name, map.ds1.act + 1, type.id);
          const rel = (p: string) => normalizePath(p).replace(/^data\/global\/tiles\//, '');
          const sourceLevels = (dt1: string) =>
            fresh.lvlTypes
              .filter((t) => t.files.some((f) => f && normalizePath(f) === rel(dt1)))
              .map((t) => automapLevelFor(table, t.name, t.act || undefined, t.id))
              .filter((l): l is string => !!l);
          const edits = level ? customAutomapEdits(plan, table, sourceLevels) : [];
          if (edits.length) {
            const { doc: next, rows } = applyAutomapEdits(doc, level!, edits);
            await writeFiles([{ path: AUTOMAP_TXT, bytes: serializeTxtTable(next) }]);
            automapNote = `; AutoMap.txt: ${rows} rows for "${level}"`;
          } else automapNote = level ? '; no automap pieces to copy (the automap editor can add them)' : '; the level has no automap entry yet (see the Compatibility check)';
        }
      } catch (e) {
        automapNote = `; AutoMap.txt not updated (${errorMessage(e)})`;
      }
      const renumbered = plan.renumbered.length ? `, ${plan.renumbered.length} renumbered` : '';
      notify(
        existing === undefined
          ? `Created ${path.split('/').pop()} (${plan.records.length} tiles${renumbered}${actSafe ? ', act-safe colours' : ''}) and added it to the map${automapNote}. Find it in the Tiles panel.`
          : `Added ${plan.records.length} tiles${renumbered} to ${path.replace(/^data\/global\/tiles\//i, '')}${normalizePath(path) === normalizePath(ownTilesPath(gd, map.path, map.resolution.lvlType)) ? " (the level type's own tile file)" : ''}${automapNote}.`,
      );
    },
    [gd, map, writeFiles, applyDt1s, notify],
  );

  /**
   * Applies a walkability stroke to this map (see game/walkEdit.ts): writes the map's walkability library when it gets
   * new tiles, adds it to the map's tile libraries (and level type) the first time, and changes the cells as one undo
   * step.
   */
  /**
   * The map's own-tiles file (see game/ownTiles.ts): one per level type, in the type's folder. Returns where it is, what
   * it holds now, the tile numbers new tiles must avoid (every library of the type, the map's own, the file's), and
   * the map's libraries.
   */
  const ownTiles = async () => {
    if (!gd || !map) throw new Error('No map open.');
    const type = map.resolution.lvlType;
    const path = ownTilesPath(gd, map.path, type);
    const existing = await gd.fs.read(path);
    const libs = map.lib.loaded.filter((l) => l.found && !isBuiltinPath(l.path)).map((l) => l.path);
    const taken = await typeTakenKeys(gd, type, libs);
    for (const k of keysOf(existing)) taken.add(k);
    for (const e of map.lib.entries()) taken.add(tileIdentity(e.orientation, e.main, e.sub));
    return { path, existing, taken, libs, listed: libs.some((p) => normalizePath(p) === normalizePath(path)) };
  };
  applyWalkRef.current = async (paint: WalkPaint) => {
    if (!gd || !map || !doc || historyBusyRef.current) return;
    // Nothing ticked: adding or removing no flags changes nothing (only "Set exactly" can set none).
    if (!paint.bits && paint.mode !== 'replace') {
      notify('Walkability: tick the flags to add or remove first (Block walking, …). To make cells walkable, choose Remove flags with Block walking ticked, or the Make walkable quick brush.', true);
      return;
    }
    if (walkBrush.target === 'tile') {
      // Like WinDS1: the tiles' own flags change (shown at once; written with Save tile flags).
      const plan = planTileFlags(doc.ds1, map.lib, paint);
      for (const { tile, flags } of plan.tiles) editTileFlags([tile], () => flags);
      const msg = plan.changed
        ? `${plan.changed} sub-tile${plan.changed === 1 ? '' : 's'} updated in the tiles themselves${plan.alsoAffects ? `; ${plan.alsoAffects} other cell${plan.alsoAffects === 1 ? '' : 's'} of this map use${plan.alsoAffects === 1 ? 's' : ''} them too` : ''}. Save tile flags to keep it.`
        : 'No flags changed by this brush.';
      setWalkLast(`${msg}${plan.skipped.length ? ` Skipped ${plan.skipped.length} cell${plan.skipped.length === 1 ? '' : 's'}: ${plan.skipped.slice(0, 3).join('; ')}` : ''}`);
      return;
    }
    if (!canWrite) return notify('Walkability edits need a writable mod folder: they add tiles to the level type’s own tile file.', true);
    historyBusyRef.current = true; setHistoryBusy(true);
    const expectedRevision = doc.revision;
    setWalkBusy(true);
    try {
      // Blockers and tile copies go into the level type's one own-tiles file (see game/ownTiles.ts).
      const own = await ownTiles();
      const walkPath = own.path;
      const tooLong = tilePathProblem(walkPath.replace(/^data\/global\/tiles\//i, ''));
      if (tooLong) throw new Error(`the level type's own tile file would be ${tooLong}`);
      const preset = map.resolution.preset;
      const voidFlags = preset?.fillBlanks === false ? null : blankFillFlags(map.lib, preset?.levelId ?? 0);
      const plan = await planWalkEdit({ ds1: doc.ds1, lib: map.lib, read: (p) => gd.fs.read(p), walkPath, walk: own.existing, paint, extraTaken: own.taken, voidFlags });
      if (currentContext.current.doc !== doc || doc.revision !== expectedRevision) throw new Error('The map changed during the stroke. Please try again.');
      // Safeguard: every cell the stroke changes must use a tile the map's libraries or the new tile file have, before
      // anything is written. Otherwise those cells would show as missing (and have no collision in game).
      const planned = new Set([...keysOf(plan.dt1 ?? own.existing)]);
      const was = (e: CellEdit) => (e.layer.kind === 'floor' ? doc.ds1.floors : e.layer.kind === 'wall' ? doc.ds1.walls : doc.ds1.shadows)[e.layer.index]?.[e.y * doc.ds1.width + e.x];
      const beforeWrite = unresolvedEdits(plan.edits, (o, m, sub) => map.lib.variants(o, m, sub).length > 0 || planned.has(tileIdentity(o, m, sub)), was);
      if (beforeWrite.length) throw new Error(`stopped before changing anything: ${beforeWrite.length} cell${beforeWrite.length === 1 ? '' : 's'} would use tiles that don't exist (first at ${beforeWrite[0].x},${beforeWrite[0].y}). Please report this.`);
      if (plan.dt1) {
        await writeFiles([{ path: walkPath, bytes: plan.dt1 }]);
        gd.forgetDt1(walkPath);
      }
      const libs = map.lib.loaded.filter((l) => l.found && !isBuiltinPath(l.path)).map((l) => l.path);
      const listed = libs.some((p) => normalizePath(p) === normalizePath(walkPath));
      if (plan.edits.length) {
        const after = await applyDt1s(plan.dt1 && !listed ? [...libs, walkPath] : libs, {
          keepOpen: true, strict: true, floors: plan.floors, edits: plan.edits,
          label: `Paint collision on ${plan.changed} sub-tiles`,
        });
        // Safeguard: read back as the map loads now (its tables and libraries), the changed cells must find their tiles.
        // If not (the tile file didn't load, or the tables don't list it), the stroke is undone at once.
        const lost = after ? unresolvedEdits(plan.edits, (o, m, sub) => after.lib.variants(o, m, sub).length > 0, was) : [];
        if (lost.length) {
          doc.undo();
          bump();
          throw new Error(
            `undone: ${lost.length} cell${lost.length === 1 ? '' : 's'} would have lost ${lost.length === 1 ? 'its' : 'their'} tiles, because ${walkPath.replace(/^data\/global\/tiles\//i, '')} isn't loaded for this map (check that it is in your mod folder and that the level type lists it). Your map is as it was.`,
          );
        }
      }
      const msg = plan.changed ? `${plan.changed} sub-tile${plan.changed === 1 ? '' : 's'} updated. Other flag bits and tile artwork are preserved.` : 'No flags changed by this brush.';
      setWalkLast(`${msg}${plan.skipped.length ? ` Skipped ${plan.skipped.length} cell${plan.skipped.length === 1 ? '' : 's'}: ${plan.skipped.slice(0, 3).join('; ')}` : ''}`);
      if (plan.skipped.length) notify(`Walkability: ${plan.skipped[0]}${plan.skipped.length > 1 ? ` (+${plan.skipped.length - 1} more)` : ''}`, true);
    } catch (e) {
      notify(`Walkability: ${errorMessage(e)}`, true);
    } finally {
      setWalkBusy(false); historyBusyRef.current = false; setHistoryBusy(false);
    }
  };

  // Automap preview: AutoMap.txt + MaxiMap.dc6, loaded the first time the view is turned on (and after table edits).
  const [automapData, setAutomapData] = useState<{ gd: GameData; table: AutomapTable; cels: SpriteFrame[] } | null>(null);
  const [automapLevelOverride, setAutomapLevelOverride] = useState<{ path: string; level: string } | null>(null);
  useEffect(() => {
    if ((!visibility.automap && dialog !== 'automap') || !gd || automapData?.gd === gd) return;
    let live = true;
    void (async () => {
      try {
        const [txt, dc6] = await Promise.all([gd.fs.read(AUTOMAP_TXT), gd.fs.read(AUTOMAP_DC6)]);
        if (!txt || !dc6) throw new Error('AutoMap.txt or MaxiMap.dc6 not found');
        if (live) setAutomapData({ gd, table: parseAutomap(parseTxtTable(txt)), cels: parseAutomapCels(dc6) });
      } catch (e) {
        if (live) { notify(`Automap: ${errorMessage(e)}`, true); setVisibility((v) => ({ ...v, automap: false })); }
      }
    })();
    return () => { live = false; };
  }, [visibility.automap, dialog, gd, automapData, notify]);
  const automapLevel = useMemo(() => {
    if (!automapData || !map) return null;
    if (automapLevelOverride?.path === map.path) return automapLevelOverride.level;
    return automapLevelFor(automapData.table, map.resolution.lvlType?.name, map.ds1.act + 1, map.resolution.lvlType?.id);
  }, [automapData, map, automapLevelOverride]);
  const automapPiecesNow = useMemo(
    () => (visibility.automap && automapData && map && automapLevel ? automapPieces(map.ds1, automapData.table, automapLevel) : null),
    [visibility.automap, automapData, map, automapLevel, revision], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [automapSuggestions, setAutomapSuggestions] = useState<AutomapSuggestion[] | null>(null);
  useEffect(() => setAutomapSuggestions(null), [map?.path, automapLevel]);
  /** How the automap is drawn (kind colours, thickness, opacity…), remembered in this browser/app. */
  const [automapStyle, setAutomapStyleRaw] = useState<AutomapStyle>(() => {
    try {
      return normalizeAutomapStyle(JSON.parse(localStorage.getItem('ds1studio.automapStyle') ?? 'null'));
    } catch {
      return DEFAULT_AUTOMAP_STYLE;
    }
  });
  const setAutomapStyle = useCallback((s: AutomapStyle) => {
    setAutomapStyleRaw(s);
    try {
      localStorage.setItem('ds1studio.automapStyle', JSON.stringify(s));
    } catch {
      // per-viewer convenience only
    }
  }, []);
  /** The automap category of the map's tiles (floors: walkable or water, by the tile). */
  const automapKindOf = useMemo(() => (map ? kindClassifier(map.lib, map.palette) : null), [map]);
  const automapView = useMemo(
    () =>
      automapPiecesNow && automapData && map && automapKindOf
        ? { pieces: automapSuggestions ? withSuggestions(automapPiecesNow, automapSuggestions) : automapPiecesNow, cels: automapData.cels, palette: map.palette, style: automapStyle, kindOf: automapKindOf }
        : null,
    [automapPiecesNow, automapData, map, automapSuggestions, automapStyle, automapKindOf],
  );
  /** Opens the automap editor (loading AutoMap.txt first if the automap view hasn't yet). */
  const openAutomapEditor = useCallback(() => setDialog('automap'), []);
  const saveAutomapEdits = useCallback(
    async (edits: AutomapEdit[]) => {
      if (!gd || !automapLevel || historyBusyRef.current) return;
      historyBusyRef.current = true; setHistoryBusy(true);
      try {
      const bytes = await gd.fs.read(AUTOMAP_TXT);
      if (!bytes) throw new Error('AutoMap.txt not found');
      const { doc: next, rows } = applyAutomapEdits(parseTxtTable(bytes), automapLevel, edits);
      await writeFiles([{ path: AUTOMAP_TXT, bytes: serializeTxtTable(next) }]);
      doc?.recordFileChange({ path: AUTOMAP_TXT, before: bytes, after: serializeTxtTable(next) }, 'Edit automap pieces'); bump();
      setAutomapData((d) => (d ? { ...d, table: parseAutomap(next) } : d));
      notify(`AutoMap.txt: ${edits.length} tile kinds saved as ${rows} rows for ${automapLevel}`);
      } finally { historyBusyRef.current = false; setHistoryBusy(false); }
    },
    [gd, doc, automapLevel, writeFiles, notify],
  );
  const automapLevelLabel = useCallback(
    (l: string) => {
      const t = gd && /^\d+$/.test(l.trim()) ? gd.lvlType(Number(l)) : null;
      return t && t.name !== l.trim() ? `${l} · ${t.name}` : l;
    },
    [gd],
  );
  /** In Automap mode (or with the automap drawn), 100% becomes exactly 10%: one automap pixel per screen pixel. */
  const automapZoom = viewMode === 'automap' || !!automapView;

  // Colours and look-alike references for automap suggestions; game-wide references are built once per level.
  const automapRefCache = useRef(new Map<string, Promise<ReferenceTile[]>>());
  const makeAutomapColors = useCallback(async (): Promise<AutomapColors | undefined> => {
    if (!gd || !map || !automapData || !automapLevel) return undefined;
    const table = automapData.table;
    const act = /^(\d)\s/.exec(automapLevel)?.[1];
    const key = `${automapLevel}|${automapData.gd === gd}`;
    let refs = automapRefCache.current.get(key);
    if (!refs) {
      refs = referenceTiles({
        table,
        types: gd.lvlTypes,
        levels: (l) => l !== automapLevel && (act ? l.startsWith(`${act} `) : true),
        loadDt1: (p) => gd.dt1(p),
        palette: (a) => gd.palette(a),
      });
      automapRefCache.current.set(key, refs);
    }
    return { ...automapColors(map.lib, automapData.cels, map.palette, { table, types: gd.lvlTypes }), extraRefs: await refs };
  }, [gd, map, automapData, automapLevel]);

  const applyAutomapSuggestionsNow = useCallback(async () => {
    if (!gd || !automapLevel || !automapSuggestions || historyBusyRef.current) return;
    historyBusyRef.current = true; setHistoryBusy(true);
    try {
      const bytes = await gd.fs.read(AUTOMAP_TXT);
      if (!bytes) throw new Error('AutoMap.txt not found');
      const { doc: next, rows } = applyAutomapSuggestions(parseTxtTable(bytes), automapLevel, automapSuggestions);
      await writeFiles([{ path: AUTOMAP_TXT, bytes: serializeTxtTable(next) }]);
      doc?.recordFileChange({ path: AUTOMAP_TXT, before: bytes, after: serializeTxtTable(next) }, 'Apply automap suggestions'); bump();
      setAutomapData((d) => (d ? { ...d, table: parseAutomap(next) } : d));
      setAutomapSuggestions(null);
      notify(`AutoMap.txt: added ${rows} rows for ${automapLevel}`);
    } catch (e) {
      notify(errorMessage(e), true);
    }
    finally { historyBusyRef.current = false; setHistoryBusy(false); }
  }, [gd, doc, automapLevel, automapSuggestions, writeFiles, notify]);
  const setAutomapPiece = async (piece: AutomapPiece, cel: number, scope: 'cell' | 'seq' | 'style') => {
    if (scope === 'cell') { await editAutomapSelection(piece, cel); return; }
    if (!gd || !automapLevel || historyBusyRef.current) return;
    historyBusyRef.current = true; setHistoryBusy(true);
    try {
      const bytes = await gd.fs.read(AUTOMAP_TXT);
      if (!bytes) throw new Error('AutoMap.txt not found');
      const { doc: next, summary } = setAutomapCel(parseTxtTable(bytes), automapLevel, piece.orientation, piece.main, piece.sub, cel, scope);
      const out = serializeTxtTable(next);
      await writeFiles([{ path: AUTOMAP_TXT, bytes: out }]);
      doc?.recordFileChange({ path: AUTOMAP_TXT, before: bytes, after: out }, cel < 0 ? 'Clear automap piece' : 'Change automap piece'); bump();
      setAutomapData((d) => (d ? { ...d, table: parseAutomap(next) } : d));
      notify(summary);
    } catch (e) {
      notify(errorMessage(e), true);
    } finally {
      historyBusyRef.current = false; setHistoryBusy(false);
    }
  };

  const [clearingAutomap, setClearingAutomap] = useState(false);
  const editAutomapSelection = async (piece?: AutomapPiece, cel = -1) => {
    if (!gd || !doc || !map || (!piece && !selection) || !automapLevel || clearingAutomap || historyBusyRef.current) return;
    historyBusyRef.current = true; setHistoryBusy(true);
    const expectedRevision = doc.revision;
    setClearingAutomap(true);
    try {
      const table = await loadTable(gd.fs, 'AutoMap.txt');
      if (!table) throw new Error('AutoMap.txt was not found.');
      // The copies go into the level type's own-tiles file (see game/ownTiles.ts).
      const own = await ownTiles();
      const plan = piece
        ? await planAutomapEdit(gd, map.lib, doc.ds1, [piece], table, automapLevel, cel, own)
        : await planAutomapClear(gd, map.lib, doc.ds1, selection!, automapPiecesNow ?? [], table, automapLevel, own);
      if (currentContext.current.doc !== doc || doc.revision !== expectedRevision) throw new Error('The map changed while preparing the automap edit. Select the cells again.');
      if (!plan?.edits.length) { notify('No visible automap pieces in the selection.'); return; }
      const path = own.path;
      const paths = own.listed ? own.libs : [...own.libs, path];
      if (map.resolution.preset) await syncLevelTables(gd.fs, map.path, paths, map.resolution.lvlType?.id);
      if (currentContext.current.doc !== doc) return;
      await writeFiles([{ path, bytes: plan.bytes }, { path: AUTOMAP_TXT, bytes: serializeTxtTable(plan.table) }]);
      gd.forgetDt1(path);
      await applyDt1s(paths, { keepOpen: true, strict: true, edits: plan.edits, label: cel < 0 ? 'Clear selected automap pieces' : 'Change selected automap piece', file: { path: AUTOMAP_TXT, before: serializeTxtTable(table), after: serializeTxtTable(plan.table) } });
      if (currentContext.current.doc !== doc) return;
      setAutomapSuggestions(null);
      notify(`${cel < 0 ? 'Cleared' : 'Changed'} selected automap ${piece ? 'piece' : 'pieces'}. Other cells keep their pieces. Save the map to keep the changes.`);
    } catch (e) { notify(String(e), true); }
    finally { setClearingAutomap(false); historyBusyRef.current = false; setHistoryBusy(false); }
  };
  /** Write an edited DT1 and refresh the map graphics. */
  const saveEditedDt1 = useCallback(
    async (r: Dt1EditResult) => {
      if (!gd) return;
      const overwrote = normalizePath(r.path) === normalizePath(r.original);
      const before = r.moves?.size && overwrote ? await gd.fs.read(r.path) : null;
      await writeFiles([{ path: r.path, bytes: r.bytes }]);
      gd.forgetDt1(r.path);
      const notes: string[] = [`Saved ${r.path.split('/').pop()}`];
      if (r.switchMap && map && doc) {
        const paths = map.lib.loaded
          .filter((l) => l.found && !isBuiltinPath(l.path))
          .map((l) => (normalizePath(l.path) === normalizePath(r.original) ? r.path : l.path));
        mutate((d) => {
          const others = d.files.filter((f) => !/data[\\/]/i.test(f));
          d.files = [...paths.map(embeddedFileName), ...others];
        });
        try {
          const writes = await syncLevelTables(gd.fs, map.path, paths, map.resolution.lvlType?.id);
          if (writes.length) await writeFiles(writes);
          notes.push(writes.length ? 'LvlTypes/Dt1Mask updated' : 'map now uses it');
        } catch (e) {
          notes.push(`game tables not updated: ${errorMessage(e)}`);
        }
      }
      // Reassigned numbers: the map's placed cells move to the tiles' new numbers, as one undo step (which, when the
      // DT1 was overwritten, also puts the DT1 back).
      if (r.moves?.size && doc && currentContext.current.doc === doc) {
        const edits = cellMoves(doc.ds1, r.moves);
        if (edits.length) {
          const label = `Reassign tile numbers in ${r.path.split('/').pop()}`;
          doc.apply(edits, label, before ? { path: r.path, before, after: r.bytes } : undefined);
          bump();
          notes.push(`${edits.length} placed cell${edits.length === 1 ? '' : 's'} moved to the new numbers (Undo puts ${before ? 'them and the DT1' : 'them'} back)`);
        }
      }
      await reloadTables();
      setDialog(null);
      notify(notes.join(' · '));
    },
    [gd, map, doc, writeFiles, mutate, reloadTables, notify],
  );

  /** Writes the DT1s whose sub-tile flags were changed in the Cell panel into the mod (originals kept as .bak). */
  const saveTileFlags = useCallback(async () => {
    if (!gd || !flagEdits.current.size) return;
    setSavingFlags(true);
    try {
      const byPath = new Map<string, Map<number, { flags: Uint8Array }>>();
      for (const [t, e] of flagEdits.current) {
        if (!byPath.has(e.path)) byPath.set(e.path, new Map());
        byPath.get(e.path)!.set(e.index, { flags: t.subTileFlags });
      }
      const writes: { path: string; bytes: Uint8Array }[] = [];
      for (const [path, changes] of byPath) {
        const bytes = await gd.fs.read(path);
        if (!bytes) throw new Error(`${path} could not be read`);
        const next = writeTileSettings(bytes, changes);
        // Safeguard: the rewritten DT1 must read back with the same tiles (only their flags changed) before it's written.
        const was = parseDt1(bytes).tiles, now = parseDt1(next).tiles;
        const same = was.length === now.length && was.every((t, i) => t.orientation === now[i].orientation && t.mainIndex === now[i].mainIndex && t.subIndex === now[i].subIndex && t.blocks.length === now[i].blocks.length);
        if (!same) throw new Error(`${path.split('/').pop()} came out wrong when its flags were written, so nothing was saved. Please report this.`);
        writes.push({ path, bytes: next });
      }
      await writeFiles(writes);
      const n = flagEdits.current.size;
      flagEdits.current.clear();
      setFlagEditCount(0);
      await reloadTables();
      notify(`Saved sub-tile flags of ${n} tile${n === 1 ? '' : 's'} into ${writes.map((w) => w.path.split('/').pop()).join(', ')}`);
    } catch (e) {
      notify(`Couldn't save the DT1: ${errorMessage(e)}`, true);
    } finally {
      setSavingFlags(false);
    }
  }, [gd, writeFiles, reloadTables, notify]);

  /** Arms the brush with the warp tile of link `vis`, on the first wall layer, to click where players leave. */
  const armWarpTile = useCallback(
    (vis: number) => {
      setBrush({ orientation: Orientation.SpecialTile1, main: vis, sub: 0 });
      setMix([]);
      setTool('paint');
      setActiveLayer((l) => (l.kind === 'wall' ? l : { kind: 'wall', index: 0 }));
      notify(`Click the map where players should leave (warp tile for link ${vis}) · Esc to stop`);
    },
    [notify],
  );

  /** Saves a warp link change (Levels.txt) and reloads the tables so labels and panels show it. */
  const applyWarpLink = useCallback(
    async (write: TableWrite) => {
      setWarpBusy(true);
      try {
        await writeFiles([write]);
        await reloadTables();
        const vis = warpEdit;
        setWarpEdit(null);
        notify(`Levels.txt: ${write.summary.join('; ')}`);
        if (warpInit?.place && vis !== null) armWarpTile(vis);
        setWarpInit(null);
      } catch (e) {
        notify(`Couldn't save Levels.txt: ${errorMessage(e)}`, true);
      } finally {
        setWarpBusy(false);
      }
    },
    [writeFiles, reloadTables, notify, warpEdit, warpInit, armWarpTile],
  );

  /** What a DT1 contains (for the import list), or why it can't be used. */
  const describeDt1 = (bytes: Uint8Array): { tiles: number; kinds: string } | string => {
    try {
      const d = parseDt1(bytes);
      if (!d.tiles.length) return 'It has no tiles.';
      const floors = d.tiles.filter((t) => t.orientation === 0).length;
      const shadows = d.tiles.filter((t) => t.orientation === 13).length;
      const walls = d.tiles.length - floors - shadows;
      return { tiles: d.tiles.length, kinds: [floors && `${floors} floors`, walls && `${walls} walls/objects`, shadows && `${shadows} shadows`].filter(Boolean).join(', ') };
    } catch (e) {
      return `This isn't a DT1 DS1 Studio can read (${errorMessage(e)}), so the game couldn't either.`;
    }
  };

  /** Picks DT1s (files, or folders with their subfolders) or a DS1 to import, and checks what they contain. */
  const openPackage = useCallback(
    async (bytes: Uint8Array) => {
      if (!gd) return;
      try {
        const pkg = readMapPackage(bytes);
        // Files may have been moved or replaced since startup. Compare with a fresh disk index.
        const importFs = isTauri ? await loadFromTauri(await getConfig()) : gd.fs;
        setImportState({ pkg, plan: await planImport(pkg, importFs) });
        setDialog('import');
      } catch (e) {
        notify(`Import failed: ${errorMessage(e)}`, true);
      }
    },
    [gd, notify],
  );
  /** Import → AutoMap rows: another mod's rows, with their level types mapped to this mod's. */
  const [automapImport, setAutomapImport] = useState<{ fileName: string; source: AutomapSource; target: Uint8Array } | null>(null);
  const [automapImportBusy, setAutomapImportBusy] = useState(false);
  const pickAutomapRows = useCallback(async () => {
    if (!gd) return;
    const f = await importNamed('txt');
    if (!f) return;
    const source = readAutomapRows(f.bytes);
    if (!source) return notify(`${f.name} has no LevelName and TileName columns: it isn't AutoMap.txt data.`, true);
    const target = await gd.fs.read(AUTOMAP_TXT);
    if (!target) return notify('Your AutoMap.txt could not be read.', true);
    setAutomapImport({ fileName: f.name, source, target });
  }, [gd, notify]);

  const pickImport = useCallback(
    async (kind: 'dt1' | 'ds1', mode: 'file' | 'files' | 'folders' = 'file') => {
      if (!gd) return;
      if (kind === 'dt1') {
        const picked = await importMany('dt1', mode);
        if (!picked.length) {
          if (mode === 'folders') notify('No .dt1 files were chosen (or found in those folders).');
          return;
        }
        notify(`Reading ${picked.length} DT1${picked.length === 1 ? '' : 's'}…`);
        const files: ImportDt1File[] = [];
        for (const p of picked) {
          const bytes = await p.read();
          files.push({ name: p.name, folder: p.folder, bytes, info: describeDt1(bytes) });
        }
        setImporting({ kind, files });
        return;
      }
      let f;
      try { f = await importNamed('ds1,zip'); }
      catch (e) { notify(`Import failed: ${errorMessage(e)}`, true); return; }
      if (!f) return;
      // A map package (Export map) brings its tile libraries and table rows along.
      if (f.bytes[0] === 0x50 && f.bytes[1] === 0x4b) return void openPackage(f.bytes);
      let info: { width: number; height: number; act: number } | string;
      let needs: NeededDt1[] = [];
      try {
        const d = parseDs1(f.bytes);
        needs = neededDt1s(d, (p) => !!gd.fs.locate(p));
        info = { width: d.width, height: d.height, act: d.act };
      } catch (e) {
        info = `This isn't a DS1 DS1 Studio can read (${errorMessage(e)}), so the game couldn't either.`;
      }
      setImporting({ kind, name: f.name, bytes: f.bytes, info, needs });
    },
    [gd, notify, openPackage],
  );

  /** The DT1s just imported, for the library window to show (and choose). */
  const [revealDt1, setRevealDt1] = useState<string[] | null>(null);
  /**
   * Act 0 is the standard: DT1s using colours that change between acts get the nearest colours that are the same in
   * every act, judged in the act they were drawn for (their folder's, else this map's). Returns the files as written.
   */
  const toAct0 = useCallback(
    async (files: { path: string; bytes: Uint8Array }[]): Promise<{ files: { path: string; bytes: Uint8Array }[]; converted: string[] }> => {
      if (!gd || !files.length) return { files, converted: [] };
      const a0 = await loadAct0Palette(gd.fs);
      const converted: string[] = [];
      const out = [];
      for (const f of files) {
        // Judged in the act it was drawn for: its folder's, else the one its art fits, only then this map's.
        let act = dt1Act(f.path);
        if (act === null) {
          try {
            act = guessDrawnAct(parseDt1(f.bytes).tiles, await drawnPalettes(gd));
          } catch {
            act = null;
          }
        }
        const c = act0Convert(f.bytes, await gd.palette(act ?? Math.min(4, map?.ds1.act ?? 0)), a0.usable);
        if (c) converted.push(f.path);
        out.push(c ? { path: f.path, bytes: c.bytes } : f);
      }
      return { files: out, converted };
    },
    [gd, map],
  );
  /** Adds tile libraries to the map, converting `convert` (the new ones) to the Act 0 colours in the mod first. */
  const addLibraries = useCallback(
    async (paths: string[], convert: string[]) => {
      if (!gd) return;
      let converted: string[] = [];
      if (convert.length && data.status === 'ready' && data.saveTarget) {
        try {
          const read = (await Promise.all(convert.map(async (p) => ({ path: gd.fs.exactPath(p) ?? p, bytes: await gd.fs.read(p) })))).filter((f): f is { path: string; bytes: Uint8Array } => !!f.bytes);
          const r = await toAct0(read);
          const writes = r.files.filter((f) => r.converted.includes(f.path));
          if (writes.length) {
            await writeFiles(writes);
            for (const w of writes) gd.forgetDt1(w.path);
          }
          converted = r.converted;
        } catch (e) {
          notify(`Couldn't convert to Act 0 colours: ${errorMessage(e)}`, true);
        }
      }
      await applyDt1s(paths);
      if (converted.length) notify(`Added ${convert.length} tile ${convert.length === 1 ? 'library' : 'libraries'}; converted ${converted.length} to Act 0 colours (the same in every act): ${converted.map((p) => p.split('/').pop()).join(', ')}`);
    },
    [gd, data, toAct0, writeFiles, applyDt1s, notify],
  );

  const importDt1 = useCallback(
    async (c: ImportDt1Choice) => {
      if (!importing || importing.kind !== 'dt1' || !c.files.length) return;
      setImportBusy(true);
      try {
        // Imported DT1s come in Act 0 colours, the standard (so they're stable in every act).
        const act0 = await toAct0(c.files);
        c = { ...c, files: act0.files };
        await writeFiles(c.files);
        try {
          localStorage.setItem('ds1studio.importFolder', c.files[0].path.split('/')[4] ?? 'custom');
        } catch {
          // per-viewer convenience only
        }
        setImporting(null);
        // Shown in the library window; when not added to the map, they come chosen there (one click adds them all).
        setRevealDt1(c.addToMap && map ? [c.files[0].path] : c.files.map((f) => f.path));
        const n = c.files.length;
        const what = `${n === 1 ? c.files[0].path.split('/').pop() : `${n} DT1s`}${act0.converted.length ? ` (${act0.converted.length} converted to Act 0 colours)` : ''}`;
        if (c.addToMap && map) {
          // Same as adding them in Tile libraries: the map's list, LvlTypes File slots and the Dt1Mask.
          await applyDt1s([...map.lib.loaded.filter((l) => l.found && !isBuiltinPath(l.path)).map((l) => l.path), ...c.files.map((f) => f.path)]);
          notify(`Imported ${what} and added ${n === 1 ? 'it' : 'them'} to this map's tile libraries (LvlTypes / Dt1Mask).`);
        } else {
          await reloadTables();
          notify(`Imported ${what} into ${c.files[0].path.split('/').slice(3, 5).join('/')}. Add ${n === 1 ? 'it' : 'them'} to a map with Map → Tile libraries.`);
        }
      } catch (e) {
        notify(`Import failed: ${errorMessage(e)}`, true);
      } finally {
        setImportBusy(false);
      }
    },
    [importing, map, writeFiles, applyDt1s, reloadTables, notify, toAct0],
  );

  const readImportDt1 = useCallback((p: string) => (gd ? gd.dt1(p) : Promise.resolve(null)), [gd]);

  const importDs1 = useCallback(
    async (c: ImportDs1Choice) => {
      if (!importing || importing.kind !== 'ds1' || !gd) return;
      if (!confirmDiscard()) return;
      setImportBusy(true);
      try {
        // Point the map at the tile libraries imported with it (its embedded list), so they are what it loads.
        let bytes = importing.bytes;
        if (c.dt1s.length || c.drop.length) {
          const d = parseDs1(bytes);
          // Leave out the extra copy of a library the map names twice.
          const dropped = new Set(c.drop.map(normalizePath));
          d.files = d.files.filter((f) => {
            const p = ds1FileToDt1Path(f);
            return !p || !dropped.has(normalizePath(p));
          });
          const provided = new Map(c.dt1s.filter((x) => x.replaces).map((x) => [x.replaces!, x.path]));
          d.files = d.files.map((f) => {
            const p = ds1FileToDt1Path(f);
            const to = p && provided.get(normalizePath(p));
            return to ? embeddedFileName(to) : f;
          });
          const listed = new Set(d.files.map((f) => normalizePath(ds1FileToDt1Path(f) ?? '')));
          for (const x of c.dt1s) if (!x.replaces && !listed.has(normalizePath(x.path))) d.files.push(embeddedFileName(x.path));
          bytes = writeDs1(d);
        }
        await writeFiles([...c.dt1s.map((x) => ({ path: x.path, bytes: x.bytes })), { path: c.path, bytes }]);
        setImporting(null);
        const tables = await reloadTables();
        await open(normalizePath(c.path), true, tables);
        if (c.register) {
          // Start "Add to game" from a level that uses the same tile set (a new level cloned from it).
          const m = await openMap(gd, normalizePath(c.path));
          // The level type whose files cover the map's tile libraries best (a map new to the game has none yet).
          let typeId = m.resolution.lvlType?.id;
          if (typeId === undefined) {
            const want = new Set(m.resolution.paths.map(normalizePath));
            let best = 0;
            for (const t of gd.lvlTypes) {
              const score = GameData.dt1sFor(t, 0xffffffff).filter((p) => want.has(p)).length;
              if (score > best) [best, typeId] = [score, t.id];
            }
          }
          const t = warpTables;
          let levelId: number | undefined;
          if (t && typeId !== undefined) {
            const idCol = t.levels.columns.indexOf('Id');
            const typeCol = t.levels.columns.indexOf('LevelType');
            const row = t.levels.rows.find((r) => Number(r[typeCol]) === typeId && Number(r[idCol]) > 0);
            if (row) levelId = Number(row[idCol]);
          }
          setRegisterInitial({
            path: c.path,
            mode: 'new',
            levelId,
            name: c.path.split('/').pop()!.replace(/\.ds1$/i, ''),
            note: `Imported. Now add it to the game: a new level${levelId ? ' is pre-filled from one using the same tiles' : ''}; pick another level to copy settings from if you like, then Apply.`,
          });
          setDialog('register');
        } else notify(`Imported ${c.path}. Use Game → Add to game when you want the game to load it.`);
      } catch (e) {
        notify(`Import failed: ${errorMessage(e)}`, true);
      } finally {
        setImportBusy(false);
      }
    },
    [importing, gd, confirmDiscard, writeFiles, reloadTables, open, warpTables, notify],
  );

  // Desktop app: a quiet update check at most once a day; a newer version is announced, never installed unasked.
  const [pendingUpdate, setPendingUpdate] = useState<UpdateInfo | null>(null);
  useEffect(() => {
    if (!isTauri) return;
    let last = 0;
    try {
      last = Number(localStorage.getItem('ds1studio.updateCheck')) || 0;
    } catch {
      // per-viewer convenience only
    }
    if (Date.now() - last < 86_400_000) return;
    const t = setTimeout(() => {
      checkForUpdate()
        .then((u) => {
          try {
            localStorage.setItem('ds1studio.updateCheck', String(Date.now()));
          } catch {
            // ignore
          }
          if (u) {
            setPendingUpdate(u);
            notify(`DS1 Studio ${u.version} is available: Help → Check for updates`);
          }
        })
        .catch(() => undefined);
    }, 4000);
    return () => clearTimeout(t);
  }, [notify]);

  // Presets: saved ones come from the mod folder.
  useEffect(() => {
    if (gd) void loadPresets(gd).then(setPresets);
  }, [gd]);
  const savePreset = useCallback(
    async (p: Preset, files: { path: string; bytes: Uint8Array }[] = []) => {
      if (!gd) throw new Error('No asset library is open.');
      for (const f of files) {
        const existing = await gd.fs.read(f.path);
        if (existing && (existing.length !== f.bytes.length || existing.some((b, i) => b !== f.bytes[i]))) throw new Error(`A different library already exists at ${f.path}. Please reopen the builder.`);
      }
        const stored = { ...p, id: Math.random().toString(36).slice(2, 10) };
        await writeFiles([...files, { path: presetPath(stored), bytes: serializePreset(stored) }]);
        setPresets(await loadPresets(gd));
        notify(`Saved preset "${p.name}"`);
    },
    [gd, writeFiles, notify],
  );
  /** Presets panel's right-click menu: rename / recategorise (written under the new name, the old file retired), duplicate, delete. */
  const retirePresetFile = useCallback(
    async (p: Preset) => {
      const target = data.status === 'ready' ? data.saveTarget : null;
      const file = p.file ?? presetPath(p);
      if (!gd || !target?.retire) throw new Error('This mod folder cannot move files aside.');
      await target.retire(file);
      gd.fs.forget(gd.fs.exactPath(file) ?? file);
    },
    [gd, data],
  );
  const updatePreset = useCallback(
    async (p: Preset, change: { name?: string; category?: string }) => {
      try {
        if (!gd) return;
        const next: Preset = { ...p, ...change, file: undefined };
        const to = presetPath(next);
        await writeFiles([{ path: to, bytes: serializePreset(next) }]);
        if (normalizePath(to) !== normalizePath(p.file ?? presetPath(p))) await retirePresetFile(p);
        setPresets(await loadPresets(gd));
        notify(change.name ? `Renamed the preset to "${change.name}"` : `Moved "${p.name}" to ${change.category}`);
      } catch (e) {
        notify(errorMessage(e), true);
      }
    },
    [gd, writeFiles, retirePresetFile, notify],
  );
  const duplicatePreset = useCallback(
    async (p: Preset) => {
      try {
        if (!gd) return;
        const copy: Preset = { ...p, name: `${p.name} copy`, id: Math.random().toString(36).slice(2, 10), file: undefined };
        await writeFiles([{ path: presetPath(copy), bytes: serializePreset(copy) }]);
        setPresets(await loadPresets(gd));
        notify(`Duplicated as "${copy.name}"`);
      } catch (e) {
        notify(errorMessage(e), true);
      }
    },
    [gd, writeFiles, notify],
  );
  const deletePreset = useCallback(
    async (p: Preset) => {
      try {
        if (!gd) return;
        await retirePresetFile(p);
        setPresets(await loadPresets(gd));
        notify(`Deleted the preset "${p.name}" (its file is kept aside as a backup)`);
      } catch (e) {
        notify(errorMessage(e), true);
      }
    },
    [gd, retirePresetFile, notify],
  );
  /** Preset packages: export some presets to a file, import presets from one (with a summary to confirm first). */
  const exportPresets = useCallback(
    async (list: Preset[], name: string) => {
      if (!gd || !list.length) return;
      try {
        const built = await buildPresetPackage(gd.fs, list);
        const file = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'presets'}-presets.zip`;
        const where = await exportBytes(file, built.zip);
        if (!where) return;
        notify(
          `Exported ${list.length} preset${list.length === 1 ? '' : 's'}${built.dt1s.length ? ` and ${built.dt1s.length} tile librar${built.dt1s.length === 1 ? 'y' : 'ies'} from your mod` : ''} to ${where}` +
            (built.missing.length ? ` · not found, so not included: ${built.missing.join(', ')}` : ''),
          built.missing.length > 0,
        );
      } catch (e) {
        notify(errorMessage(e), true);
      }
    },
    [gd, notify],
  );
  const [presetImport, setPresetImport] = useState<{ name: string; plan: PresetImportPlan } | null>(null);
  const importPresets = useCallback(async () => {
    if (!gd) return;
    try {
      const f = await importNamed('zip,json');
      if (!f) return;
      setPresetImport({ name: f.name, plan: await planPresetImport(gd.fs, f.bytes, presets) });
    } catch (e) {
      notify(errorMessage(e), true);
    }
  }, [gd, presets, notify]);
  const applyPresetImport = useCallback(async () => {
    if (!gd || !presetImport) return;
    const { plan } = presetImport;
    try {
      await writeFiles([...plan.dt1Writes, ...plan.presets.map((p) => ({ path: presetPath(p), bytes: serializePreset(p) }))]);
      setPresets(await loadPresets(gd));
      setPresetImport(null);
      notify(`Imported ${plan.presets.length} preset${plan.presets.length === 1 ? '' : 's'}${plan.dt1Writes.length ? ` and ${plan.dt1Writes.length} tile librar${plan.dt1Writes.length === 1 ? 'y' : 'ies'}` : ''}`);
    } catch (e) {
      notify(errorMessage(e), true);
    }
  }, [gd, presetImport, writeFiles, notify]);
  /** Save as preset: the block to save (a selection, or what was copied) and its suggested name. */
  const [presetSave, setPresetSave] = useState<{ clip: Clipboard; name: string } | null>(null);
  const saveSelectionPreset = useCallback(async () => {
    if (!doc || !map || !selection) return;
    setPresetSave({
      clip: copyRect(doc, selection),
      name: `${map.path.split('/').pop()!.replace(/\.ds1$/i, '')} ${selection.cells ? `${selectionCount(selection)} cells` : rectSize(selection).join('×')}`,
    });
  }, [doc, map, selection]);
  /** What Save as preset starts with ticked: what the view shows (roofs left out while As if inside is on). */
  const presetParts = useMemo((): Set<ClipPart> => {
    const on = new Set<ClipPart>(['walls', 'objects']);
    if (visibility.floors.some(Boolean)) on.add('floors');
    if (visibility.roofs && !visibility.popsInside) on.add('roofs');
    if (visibility.shadows) on.add('shadows');
    if (visibility.specials) on.add('markers');
    return on;
  }, [visibility]);
  const placePreset = useCallback(async (p: Preset) => {
    if (!gd || presetImportBusy) return;
    setPresetImportBusy(true); setPresetImportError('');
    try {
      const cached = presetImportCache.current.get(p.id);
      const missing = cached && map ? missingForPaste(cached, map.lib) : null;
      const clip = cached && missing && !missing.tiles && !missing.different ? cached : { ...await resolvePresetSources(presetToClipboard(p), path => gd.fs.read(path)), presetId: p.id };
      if (currentContext.current.doc !== doc) return;
      exitMode(); setTool('select');
      beginPaste(clip, `Placing "${p.name}"`);
    } catch (e) { notify(String(e), true); } finally { setPresetImportBusy(false); }
  }, [gd, map, doc, presetImportBusy, beginPaste, notify, exitMode]);
  const importPresetTiles = async () => {
    if (!pasteOffer || !gd || !map || !doc || presetImportBusy) return;
    setPresetImportBusy(true); setPresetImportError('');
    try {
      // The tiles go into the level type's own-tiles file (see game/ownTiles.ts).
      const own = await ownTiles();
      const path = own.path;
      // Kept from the map: identical tiles, and clashing ones the user chose the map's version of.
      const keep = new Set([...pasteOffer.same, ...pasteOffer.clashes.filter((c) => pasteChoice[c.key] === 'map').map((c) => c.key)]);
      const result = await preparePresetLibrary(pasteOffer.clip, map.lib, path, p => gd.fs.read(p), keep, own.taken);
      if (result.bytes) {
        const paths = own.listed ? own.libs : [...own.libs, path];
        // Validate the level's file-slot capacity before writing.
        if (map.resolution.preset) await syncLevelTables(gd.fs, map.path, paths, map.resolution.lvlType?.id);
        await createCustomDt1({ path, plan: result.plan, bytes: result.bytes, actSafe: false, keepOpen: true, existing: own.existing });
      }
      if (currentContext.current.doc !== doc) throw new Error('The active map changed. Select the preset again.');
      if (result.clip.presetId) presetImportCache.current.set(result.clip.presetId, result.clip);
      beginPaste(result.clip, pasteOffer.label, true);
      setPasteOffer(null);
    } catch (e) { setPresetImportError(String(e)); } finally { setPresetImportBusy(false); }
  };
  const suggest = useCallback(async () => {
    if (!gd || !map) return;
    setSuggesting({ phase: 'scan', done: 0, total: 1 });
    try {
      setSuggested(await suggestPresets(gd, { path: map.path, lib: map.lib, dt1Paths: map.lib.loaded.filter((l) => l.found).map((l) => l.path) }, setSuggesting));
    } finally {
      setSuggesting(null);
    }
  }, [gd, map]);

  /** The compatibility check. `quiet` (after saving / Add to game): opens only when it finds a problem. */
  const runCheck = useCallback(async (quiet = false) => {
    if (!gd || !map || !scene) return;
    if (!quiet) {
      setCheckResults(null);
      setDialog('check');
    }
    // The automap part needs AutoMap.txt (read here, so the automap view needn't be open).
    let automap: { pieces: AutomapPiece[] } | undefined;
    try {
      const bytes = await gd.fs.read(AUTOMAP_TXT);
      if (bytes) {
        const table = automapData?.table ?? parseAutomap(parseTxtTable(bytes));
        const level = automapLevel ?? automapLevelFor(table, map.resolution.lvlType?.name, map.ds1.act + 1, map.resolution.lvlType?.id);
        if (level) automap = { pieces: automapPieces(map.ds1, table, level) };
      }
    } catch {
      // the automap check is optional
    }
    const kept = keptAnswers();
    const results = await checkMap(gd, map, scene, automap, (key) => kept.has(`${normalizePath(map.path)}|${key}`));
    if (quiet) {
      const ok = acceptedResults(map.path);
      const problems = results.filter((r) => r.severity === 'error' || (r.severity === 'warning' && !ok.has(resultKey(r)))).length;
      if (!problems) return notify('Compatibility check: no problems found');
      setDialog((d) => d ?? 'check');
    }
    setCheckResults(results);
  }, [gd, map, scene, automapData, automapLevel, notify]);
  const runCheckRef = useRef(runCheck);

  const openCrashLog = () => {
    setDialog('crashes');
    void gd?.fs.read('data/global/excel/Levels.txt').then((b) => setCrashLevels(b ? parseTxtTable(b) : null));
  };
  const levelsWithEntry = (entry: string): string[] => {
    const t = crashLevels;
    if (!t) return [];
    const out: string[] = [];
    for (let r = 0; r < t.rows.length; r++) {
      if (getCell(t, r, 'EntryFile').trim().toLowerCase() === entry.toLowerCase())
        out.push(`${getCell(t, r, 'Id') || r} ${getCell(t, r, 'LevelName') || getCell(t, r, 'Name')}`.trim());
    }
    return out;
  };
  runCheckRef.current = runCheck;
  /** Carries out a compatibility-check fix, then checks again (fixes that edit the map can be undone). */
  const applyFix = useCallback(
    async (fix: Fix) => {
      if (!gd || !map || !doc) return;
      const libs = map.lib.loaded.filter((l) => l.found && !isBuiltinPath(l.path)).map((l) => l.path);
      const recheck = () => {
        setTimeout(() => void runCheckRef.current(), 300);
      };
      try {
        switch (fix.kind) {
          case 'open-table':
            setTableTarget({ table: fix.table.replace(/\.txt$/i, ''), key: fix.key });
            return setDialog('tables');
          case 'register':
            return setDialog('register');
          case 'automap-editor':
            return setDialog('automap');
          case 'warp-link':
            setDialog(null);
            if (!fix.edit) return armWarpTile(fix.vis);
            setWarpInit({ target: fix.toTown ?? 0, place: fix.place });
            return setWarpEdit(fix.vis);
          case 'shorten-paths':
            return setShortenPaths(fix.paths);
          case 'choose-copies':
            return setChooseCopies(fix.pairs);
          case 'choose-versions':
            return setChooseVersions(fix.items);
          case 'keep': {
            // "Keep it as it is": remembered for this map, so the check doesn't ask again.
            const kept = keptAnswers();
            kept.add(`${normalizePath(map.path)}|${fix.key}`);
            try {
              localStorage.setItem(KEPT_KEY, JSON.stringify([...kept]));
            } catch {
              // storage unavailable: asked again next time
            }
            notify('Kept as it is. The check won’t ask again for this map.');
            return recheck();
          }
          case 'place-object':
            setDialog(null);
            setTool('object');
            setPlacing({ type: fix.type, id: fix.id });
            return notify('Click the map to place it · Esc to stop');
          case 'add-dt1s':
            await applyDt1s([...libs, ...fix.paths]);
            return recheck();
          case 'act0-dt1s': {
            const read = (await Promise.all(fix.paths.map(async (p) => ({ path: gd.fs.exactPath(p) ?? p, bytes: await gd.fs.read(p) })))).filter((f): f is { path: string; bytes: Uint8Array } => !!f.bytes);
            const r = await toAct0(read);
            const writes = r.files.filter((f) => r.converted.includes(f.path));
            if (writes.length) {
              await writeFiles(writes);
              for (const w of writes) gd.forgetDt1(w.path);
              await reloadTables();
            }
            notify(`Converted ${writes.length} tile ${writes.length === 1 ? 'library' : 'libraries'} to Act 0 colours: ${writes.map((w) => w.path.split('/').pop()).join(', ')} (originals kept as .bak)`);
            return recheck();
          }
          case 'remove-dt1s': {
            const drop = new Set(fix.paths.map(normalizePath));
            await applyDt1s(libs.filter((p) => !drop.has(normalizePath(p))));
            return recheck();
          }
          case 'table-write': {
            await writeFiles(fix.writes);
            await reloadTables();
            notify(`Updated ${fix.writes.map((w) => `${w.table}: ${w.summary.join('; ')}`).join(' · ')} (the old file is kept as .bak)`);
            return recheck();
          }
          case 'sync-tables': {
            let writes: TableWrite[];
            try {
              writes = await syncLevelTables(gd.fs, map.path, libs, map.resolution.lvlType?.id);
            } catch (e) {
              if (!(e instanceof SlotsFullError)) throw e;
              setDialog(null);
              return setTypeFull({ reason: `${e.message}.` });
            }
            if (writes.length) {
              await writeFiles(writes);
              await reloadTables();
            }
            notify(writes.length ? `Updated ${writes.flatMap((w) => w.summary).join('; ')}` : 'LvlTypes and Dt1Mask already match');
            return recheck();
          }
          case 'clear-cells': {
            const edits: CellEdit[] = fix.cells.map((c) => {
              const layer: LayerRef = { kind: c.layer, index: c.index };
              return { layer, x: c.x, y: c.y, cell: MapDocument.painted(layer, doc.cell(layer, c.x, c.y), null) };
            });
            if (doc.apply(edits)) bump();
            notify(`Cleared ${edits.length} tiles (Ctrl+Z to undo)`);
            return recheck();
          }
          case 'set-special': {
            const edits: CellEdit[] = fix.cells.map((c) => {
              const layer: LayerRef = { kind: 'wall', index: c.index };
              return { layer, x: c.x, y: c.y, cell: withTile(doc.cell(layer, c.x, c.y), c.main, c.sub, 1) };
            });
            if (doc.apply(edits)) bump();
            notify(`Changed ${edits.length} marker${edits.length === 1 ? '' : 's'} (Ctrl+Z to undo; save the map to keep it)`);
            return recheck();
          }
          case 'move-special': {
            const edits: CellEdit[] = [];
            for (const m of fix.moves) {
              const from: LayerRef = { kind: 'wall', index: m.index };
              const marker = doc.cell(from, m.x, m.y);
              // The same wall layer if it is free at the new cell, else another free one (markers pair across layers).
              const layers = [m.index, ...doc.ds1.walls.map((_, i) => i).filter((i) => i !== m.index)];
              const to = layers.find((i) => isEmptyCell(doc.cell({ kind: 'wall', index: i }, m.toX, m.toY)));
              if (to === undefined) return notify(`Every wall layer is taken at (${m.toX},${m.toY}); move the marker in Map → Roof hiding instead`);
              edits.push({ layer: from, x: m.x, y: m.y, cell: MapDocument.painted(from, marker, null) });
              edits.push({ layer: { kind: 'wall', index: to }, x: m.toX, y: m.toY, cell: marker });
            }
            if (doc.apply(edits)) bump();
            notify(`Moved ${fix.moves.length} marker${fix.moves.length === 1 ? '' : 's'} (Ctrl+Z to undo; save the map to keep it)`);
            return recheck();
          }
          case 'move-objects': {
            const to = new Map(fix.moves.map((m) => [m.index, m]));
            setObjects(doc.ds1.objects.map((o, i) => (to.has(i) ? { ...o, x: to.get(i)!.x, y: to.get(i)!.y } : o)));
            notify(`Moved ${fix.moves.length} objects (Ctrl+Z to undo)`);
            return recheck();
          }
          case 'delete-objects': {
            const drop = new Set(fix.indices);
            setObjects(doc.ds1.objects.filter((_, i) => !drop.has(i)));
            notify(`Deleted ${drop.size} objects (Ctrl+Z to undo)`);
            return recheck();
          }
          case 'resize':
            resize(fix.delta);
            notify(`Map cropped to ${doc.ds1.width}×${doc.ds1.height} (Ctrl+Z to undo). Save to update the level's size in Levels.txt.`);
            return recheck();
          case 'set-act':
            mutate((d) => {
              d.act = fix.act;
              d.actRaw = fix.act;
            });
            notify(`DS1 header set to Act ${fix.act + 1} (Ctrl+Z to undo)`);
            return recheck();
        }
      } catch (e) {
        notify(errorMessage(e), true);
      }
    },
    [gd, map, doc, applyDt1s, writeFiles, reloadTables, setObjects, mutate, notify, resize, toAct0],
  );

  const exportPackage = useCallback(
    async (notes: string, includeBaseGame: boolean) => {
      if (!gd || !map || !doc) return;
      setExportState({ building: true, result: null });
      try {
        const objectSpecs = [...new Set(doc.ds1.objects.map((o) => `${o.type}:${o.id}`))]
          .map((k) => {
            const [t, id] = k.split(':').map(Number);
            return gd.objectSpec(doc.ds1.act, t, id);
          })
          .filter((x): x is NonNullable<typeof x> => !!x);
        const built = await buildMapPackage(
          gd.fs,
          { path: doc.path, ds1: doc.ds1, dt1Paths: map.lib.loaded.filter((l) => l.found && !isBuiltinPath(l.path)).map((l) => l.path) },
          await (async () => {
            const txtRows = await collectMapTxtRows(gd.fs, doc.path);
            return { ds1Bytes: writeDs1(doc.ds1), objectSpecs, txtRows, strings: await collectMapStrings(gd.fs, txtRows), notes, includeBaseGameDt1s: includeBaseGame };
          })(),
        );
        setExportState({ building: false, result: { files: built.manifest.files, missing: built.missing } });
        const where = await exportBytes(`${doc.path.split('/').pop()!.replace(/\.ds1$/i, '')}.zip`, built.zip);
        if (where) notify(`Exported ${where}`);
      } catch (e) {
        setExportState({ building: false, result: null });
        notify(`Export failed: ${errorMessage(e)}`, true);
      }
    },
    [gd, map, doc, notify],
  );

  /** Export map: the package dialog, with the map's table rows read for it. */
  const openExport = useCallback(() => {
    if (!gd || !doc) return;
    setExportState({ building: false, result: null });
    setExportCoverage(null);
    setDialog('export');
    void collectMapTxtRows(gd.fs, doc.path).then((rows) => setExportCoverage(tableCoverage(rows)));
  }, [gd, doc]);
  const finishImport = useCallback(
    async (makeRecipe: boolean) => {
      if (!importState) return;
      try {
        const files = importState.plan.writes.filter((w) => w.action !== 'identical');
        await writeFiles([...files, ...importState.plan.txtWrites]);
        const tables = await reloadTables();
        setDialog(null);
        notify(`Imported ${files.length} files${importState.plan.txtWrites.length ? ` and ${importState.plan.txtWrites.length} tables` : ''}`);
        const { pkg, plan } = importState;
        setImportState(null);
        if (makeRecipe) {
          // Open the imported map, then the Cube recipe tool for it: a recipe and map item made for these tables.
          await open(normalizePath(pkg.manifest.map), false, tables);
          setRecipeSuggestion(plan.recipe ?? { inputs: [], itemName: null });
          setDialog('cube');
        }
      } catch (e) {
        notify(errorMessage(e), true);
      }
    },
    [importState, writeFiles, reloadTables, notify, open],
  );

  const replayHistory = useCallback(async (direction: 'undo' | 'redo', count = 1) => {
    if (!doc || !gd || historyBusyRef.current) return;
    historyBusyRef.current = true; setHistoryBusy(true);
    try {
      let dt1Written = false;
      const write = async (path: string, bytes: Uint8Array, expected: Uint8Array) => {
        const isDt1 = /\.dt1$/i.test(path);
        const current = await gd.fs.read(path);
        if (!current || current.length !== expected.length || current.some((v, i) => v !== expected[i])) throw new Error(`${isDt1 ? path.split('/').pop() : 'The automap table'} changed since this edit. Undo was stopped to preserve those changes.`);
        await writeFiles([{ path, bytes }]);
        if (isDt1) {
          gd.forgetDt1(path);
          dt1Written = true;
          return;
        }
        setAutomapData((d) => d ? { ...d, table: parseAutomap(parseTxtTable(bytes)) } : d);
        setAutomapSuggestions(null);
      };
      for (let i = 0; i < count; i++) {
        if (!(await (direction === 'undo' ? doc.undoWithFiles(write) : doc.redoWithFiles(write)))) break;
      }
      if (dt1Written) await reloadTables();
      setSelection((s) => fitSelection(s, doc.ds1.width, doc.ds1.height));
      setStack(null); setHover(null); bump();
    } catch (e) { notify(String(e), true); }
    finally { historyBusyRef.current = false; setHistoryBusy(false); }
  }, [doc, gd, writeFiles, notify, reloadTables]);
  const undo = useCallback(() => { void replayHistory('undo'); }, [replayHistory]);
  const redo = useCallback(() => { void replayHistory('redo'); }, [replayHistory]);

  const savingMap = useRef(false);
  const save = useCallback(async () => {
    if (!doc || !gd || data.status !== 'ready' || savingMap.current) return;
    doc.endStroke(); doc.endObjectEdit();
    const savedRevision = doc.revision, savedPath = doc.path;
    const known = data.files.some((f) => f.toLowerCase() === doc.path.toLowerCase());
    if (!known) setData({ ...data, files: [...data.files, doc.path].sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1)) });
    const bytes = writeDs1(doc.ds1);
    const savedMap = parseDs1(bytes);
    const name = doc.path.split('/').pop()!;
    savingMap.current = true;
    try {
      if (data.saveTarget) {
        notify(await data.saveTarget.save(savedPath, bytes));
        gd.fs.remember(savedPath, bytes, data.saveTarget.label);
        // Then the game tables, when the map's tile libraries changed. The map is saved whatever happens here.
        if (map?.resolution.preset && libraryDocuments.current.has(doc) && prefsRef.current.syncTablesOnSave) {
          const paths = doc.ds1.files.map(ds1FileToDt1Path).filter((p): p is string => !!p);
          try {
            const writes = await syncLevelTables(gd.fs, savedPath, paths, map.resolution.lvlType?.id);
            if (writes.length) await writeFiles(writes);
          } catch (e) {
            if (e instanceof SlotsFullError) setTypeFull({ reason: `Saved ${name}, but the game tables weren't updated: ${e.message}. Make room below, or leave it for now (the Compatibility check lists what the game won't load).` });
            else notify(`Saved ${name}, but the game tables weren't updated: ${errorMessage(e)}. Diagnostics → Compatibility check shows what the game won't load.`, true);
          }
        }
      } else {
        downloadFile(name, bytes);
        notify(`Downloaded ${name} (no writable mod folder configured)`);
      }
      doc.ds1.version = WRITE_VERSION;
      if (doc.revision === savedRevision && doc.path === savedPath) doc.markSaved();
      // A level reached by a map item: warn if portal arrivals would land on empty ground (the game stops there).
      if (map?.resolution.preset) {
        const p = arrivalProblem(savedMap, (type, id) => gd.isWaypoint(savedMap.act, type, id));
        if (p) notify(`Saved ${name}, but a map item's portal into this level would crash the game: ${arrivalText(p)} Diagnostics → Compatibility can crop it.`, true);
      }
      // A whole-level preset must be exactly the level's size (Levels SizeX/SizeY = DS1 size - 1) or the game stops
      // building it: after a resize, keep the level in step.
      if (data.saveTarget) {
        const [prest, levels] = await Promise.all([loadTable(gd.fs, 'LvlPrest.txt'), loadTable(gd.fs, 'Levels.txt')]);
        const fix = prest && levels ? levelSizeFix({ prest, levels }, savedPath.replace(/^data\/global\/tiles\//i, ''), savedMap) : null;
        if (fix) {
          try {
            await writeFiles(fix.writes);
            await reloadTables();
            notify(`Saved ${name}. The map's size changed, so Levels.txt was updated to match: ${fix.writes[0].summary.join('; ')} (the old file is kept as .bak)`);
          } catch (e) {
            notify(`Saved ${name}, but couldn't update the level's size in Levels.txt (${errorMessage(e)}). The game will stop building this level until SizeX/SizeY are ${doc.ds1.width - 1}×${doc.ds1.height - 1}: run the compatibility check.`, true);
          }
        }
      }
      // Saved: the autosaved copy isn't needed any more.
      if (doc.revision === savedRevision && doc.path === savedPath) void deleteRecovery(savedPath).then(() => listRecoveries().then(setRecoveries));
      bump();
      if (prefsRef.current.checkAfterSave) setTimeout(() => void runCheckRef.current(true), 400);
    } catch (e) {
      notify(`Save failed: ${errorMessage(e)}`, true);
    } finally { savingMap.current = false; }
  }, [doc, gd, data, notify, writeFiles, reloadTables, map]);

  const exportFile = useCallback(async () => {
    if (!doc) return;
    const where = await exportBytes(doc.path.split('/').pop()!, writeDs1(doc.ds1));
    if (where) notify(`Exported ${where}`);
  }, [doc, notify]);

  // Keyboard shortcuts: every key goes through the (user-rebindable) keymap.
  const toggleObjects = useCallback(() => {
    setTool((t) => {
      if (t === 'object') return lastTileTool.current;
      lastTileTool.current = t;
      return 'object';
    });
  }, []);
  /** A picture of the map view as it is on screen (see MapView), for Copy view / Print Screen. */
  const snapshotRef = useRef<(() => HTMLCanvasElement | null) | null>(null);
  const copyView = useCallback(async () => {
    const canvas = snapshotRef.current?.();
    if (!canvas) return notify('Open a map first: Copy view pictures the map pane.', true);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return notify("Couldn't make the picture.", true);
    try {
      window.focus();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      notify(`Map view copied (${canvas.width}×${canvas.height}): paste it anywhere with Ctrl+V`);
    } catch (e) {
      // No clipboard (a browser that refuses it): save the picture instead.
      const name = `${(map?.path.split('/').pop() ?? 'map').replace(/\.ds1$/i, '')}-view.png`;
      downloadFile(name, new Uint8Array(await blob.arrayBuffer()));
      notify(`Couldn't use the clipboard (${errorMessage(e)}): saved the picture as ${name} instead.`, true);
    }
  }, [map, notify]);

  /** Tab / Shift+Tab: the next or previous view (each with its own right-hand panel). */
  const cycleView = useCallback(
    (dir: 1 | -1) => {
      const to = nextView(viewMode, dir);
      setTool(to === 'objects' ? 'object' : 'select');
      setModeAlert(VIEW_NAMES[to] + ' mode');
      setVisibility((v) => withMode(v, to));
      notify(`View: ${VIEW_NAMES[to]} · Tab for the next`);
    },
    [viewMode, setVisibility, notify],
  );

  /** F1–F6: straight to a view. */
  const goView = useCallback(
    (to: ViewMode) => {
      setTool(to === 'objects' ? 'object' : 'select');
      setModeAlert(VIEW_NAMES[to] + ' mode');
      setVisibility((v) => withMode(v, to));
    },
    [setVisibility],
  );
  /** Ctrl+number: the layer the tools work on (when the map has it). */
  const workOn = useCallback(
    (layer: LayerRef) => {
      if (!doc) return;
      if (!doc.editableLayers().some((l) => l.kind === layer.kind && l.index === layer.index)) {
        notify(`This map has no ${layerLabel(layer)} layer.`);
        return;
      }
      setActiveLayer(layer);
      notify(`Working on ${layerLabel(layer)}`);
    },
    [doc, notify],
  );

  const toggleGameView = useCallback(() => {
    setGameView((g) => {
      if (g.on) return { ...g, on: false };
      const r = selection;
      const center = r ? (cellToWorld((r.x0 + r.x1 + 1) / 2, (r.y0 + r.y1 + 1) / 2) as [number, number]) : null;
      return { on: true, signal: g.signal + 1, center };
    });
  }, [selection]);
  /** Walkable area in tiles² (updates with every edit). */
  const walkArea = useMemo(() => (map && scene ? walkableArea(map.ds1, scene, map.lib) : null), [map, scene]);
  const actions = useMemo((): Partial<Record<ActionId, () => void>> => {
    const vis = (f: (v: Visibility) => Visibility) => () => setVisibility(f);
    const layerToggle = (key: 'floors' | 'walls', i: number) => vis((v) => ({ ...v, [key]: v[key].map((x, n) => (n === i ? !x : x)) }));
    return {
      'tool.select': () => setTool('select'),
      'tool.paint': () => {
        setTool('paint');
        setPaintMode('brush');
      },
      'tool.rect': () => {
        setPaintMode('rect');
        setTool((t) => (t === 'erase' ? t : 'paint'));
      },
      'tool.fill': () => {
        setPaintMode('fill');
        setTool((t) => (t === 'erase' ? t : 'paint'));
      },
      'edit.replace': () => doc && setDialog('replace'),
      'view.minimap': vis((v) => ({ ...v, minimap: !v.minimap })),
      'view.snapshot': () => void copyView(),
      'view.pops': vis((v) => ({ ...v, pops: !v.pops })),
      'view.next': () => cycleView(1),
      'view.prev': () => cycleView(-1),
      'view.light': vis((v) => ({ ...v, light: !v.light })),
      'view.focus': toggleJustTheMap,
      'app.commands': () => setCommandsOpen(true),
      'view.popsInside': vis((v) => ({ ...v, popsInside: !v.popsInside })),
      'tool.erase': () => setTool('erase'),
      'tool.pick': () => setTool('pick'),
      'tool.object': () => toggleMode('objects'),
      'tool.toggleObjects': toggleObjects,
      'edit.undo': undo,
      'edit.redo': redo,
      'edit.redo2': redo,
      'file.save': () => void save(),
      'edit.copy': () => copy(false),
      'edit.cut': () => copy(true),
      'edit.paste': startPaste,
      'edit.selectAll': () => {
        if (!doc) return;
        setStack(null);
        setSelection({ x0: 0, y0: 0, x1: doc.ds1.width - 1, y1: doc.ds1.height - 1 });
        setTool('select');
      },
      'edit.cancel': () => {
        setResizeMode(false);
        setMarks(undefined);
        paintAnchor.current = null;
        setPaintRect(null);
        // After a copy, Esc stops pasting, closes the Copied panel and deselects: back to normal.
        if (clipPane) {
          setClipPane(false);
          setPasting(false);
          setSelection(null);
          setStack(null);
          return;
        }
        // First Esc frees the cursor: a paste / preset, an object to place, or the tile being painted with.
        if (pasting || placing || objectPasting || (brush && tool === 'paint')) {
          setPasting(false);
          setPlacing(null);
          setObjectPasting(false);
          if (tool === 'paint') {
            setBrush(null);
            setMix([]);
            setTool('select');
          }
          return;
        }
        const nothing = tool === 'object' ? selectedObject === null : !selection && !stack && !areaLayer;
        if (nothing && map && doc) {
          // Nothing left to cancel: offer to close the map.
          void leaveMap(true).then((ok) => {
            if (!ok) return;
            setMap(null);
            setDoc(null);
          });
          return;
        }
        if (tool === 'object') {
          setSelectedObject(null);
          setObjectGroup(null);
        } else if (stack && stack.index >= 0) setStack({ ...stack, index: -1 });
        else if (areaLayer) {
          setAreaLayer(null);
          notify('Selection: all layers');
        } else {
          setSelection(null);
          setStack(null);
        }
      },
      'edit.delete': () => {
        if (tool !== 'object' || !deleteSelectedObject()) clearSelection(false);
      },
      'edit.deleteAll': () => clearSelection(true),
      'view.fit': () => setFitSignal((n) => n + 1),
      'view.game': toggleGameView,
      'view.grid': vis((v) => ({ ...v, grid: !v.grid })),
      'view.rooms': vis((v) => ({ ...v, rooms: !v.rooms })),
      'view.walkable': () => toggleMode('walk'),
      'view.automap': () => toggleMode('automap'),
      'view.markers': vis((v) => ({ ...v, objects: !v.objects })),
      'view.animate': vis((v) => ({ ...v, animate: !v.animate })),
      'view.sprites': vis((v) => ({ ...v, sprites: !v.sprites })),
      'view.paths': vis((v) => ({ ...v, paths: !v.paths })),
      'layer.floor1': layerToggle('floors', 0),
      'layer.floor2': layerToggle('floors', 1),
      'layer.wall1': layerToggle('walls', 0),
      'layer.wall2': layerToggle('walls', 1),
      'layer.wall3': layerToggle('walls', 2),
      'layer.wall4': layerToggle('walls', 3),
      'layer.shadows': vis((v) => ({ ...v, shadows: !v.shadows })),
      'layer.roofs': vis((v) => ({ ...v, roofs: !v.roofs })),
      'layer.lowerWalls': vis((v) => ({ ...v, lowerWalls: !v.lowerWalls })),
      'layer.specials': vis((v) => ({ ...v, specials: !v.specials })),
      'solo.floor1': () => toggleSolo({ floor: 0 }),
      'solo.floor2': () => toggleSolo({ floor: 1 }),
      'solo.wall1': () => toggleSolo({ wall: 0 }),
      'solo.wall2': () => toggleSolo({ wall: 1 }),
      'solo.wall3': () => toggleSolo({ wall: 2 }),
      'solo.wall4': () => toggleSolo({ wall: 3 }),
      'solo.shadows': () => toggleSolo('shadows'),
      'solo.roofs': () => toggleSolo('roofs'),
      'solo.lowerWalls': () => toggleSolo('lowerWalls'),
      'solo.specials': () => toggleSolo('specials'),
      'layer.showAll': showAllLayers,
      'active.floor1': () => workOn({ kind: 'floor', index: 0 }),
      'active.floor2': () => workOn({ kind: 'floor', index: 1 }),
      'active.wall1': () => workOn({ kind: 'wall', index: 0 }),
      'active.wall2': () => workOn({ kind: 'wall', index: 1 }),
      'active.wall3': () => workOn({ kind: 'wall', index: 2 }),
      'active.wall4': () => workOn({ kind: 'wall', index: 3 }),
      'active.shadows': () => workOn({ kind: 'shadow', index: 0 }),
      'mode.tiles': () => goView('tiles'),
      'mode.objects': () => goView('objects'),
      'mode.walk': () => goView('walk'),
      'mode.automap': () => goView('automap'),
      'mode.light': () => goView('light'),
      'mode.roofs': () => goView('roofs'),
      'view.zoom100': () => zoomBy(automapZoom ? '10' : '100'),
      'view.zoomIn': () => zoomBy(1),
      'view.zoomOut': () => zoomBy(-1),
    };
  }, [toggleObjects, undo, redo, save, copy, startPaste, doc, tool, deleteSelectedObject, clearSelection, stack, toggleGameView, pasting, placing, brush, copyView, toggleJustTheMap, clipPane, objectPasting, cycleView, toggleMode, leaveMap, selectedObject, selection, map, toggleSolo, showAllLayers, workOn, goView, zoomBy]);
  const keyState = useRef({ actions, actionFor: keys.actionFor, dialogOpen: false });
  keyState.current = { actions, actionFor: keys.actionFor, dialogOpen: dialog !== null || commandsOpen || !!mapMenu || clearingAutomap || presetBuilder || !!presetSave || !!pasteOffer || presetImportBusy || !!unsavedAsk || prefsOpen };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (keyState.current.dialogOpen || target.closest('[role="dialog"]')) return;
      const combo = comboOf(e);
      if (!combo) return;
      // Windows only reports Print Screen when it is released; take it there on every system (never twice).
      if ((e.key === 'PrintScreen') !== (e.type === 'keyup')) return;
      const id = keyState.current.actionFor(combo);
      const run = id && keyState.current.actions[id];
      if (!run) return;
      if (e.repeat && id === 'edit.cancel') {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      run();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, []);
  // saveAs() saves on the next tick through this ref.
  const handlers = useRef({ save });
  handlers.current = { save };

  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (doc?.dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [doc]);

  if (isTauri && (data.status === 'setup' || data.status === 'loading' || changingFolders)) {
    return (
      <DesktopSetup
        initial={desktopCfg}
        error={data.status === 'setup' ? data.error : undefined}
        busy={data.status === 'loading' ? data.message : undefined}
        onOpen={openDesktop}
        onCancel={changingFolders ? () => setChangingFolders(false) : undefined}
      />
    );
  }
  if (data.status !== 'ready') {
    return <SetupScreen state={data} onPick={pickFolders} />;
  }

  // Wall layers 1-4 are always offered: one the map doesn't have yet is added when something is painted on it.
  const layers = doc?.editableLayers() ?? [];
  paletteState.current = { layers, tileSet };
  const title = map?.path.split('/').pop();
  const noMap = !doc || !map;
  /** Tiles the map plays as animations (lava, animated water), for the Animate toggle's tooltip. */
  const animatedTiles = scene ? scene.items.filter((it) => it.frames).length : 0;
  const canWrite = !!data.saveTarget;
  const openTable = (table: string, key?: string) => {
    setTableTarget({ table, key });
    setDialog('tables');
  };
  const kb = keys.bindings;
  const TOOL_ICONS = { select: <MousePointer2 />, paint: <Paintbrush />, erase: <Eraser />, pick: <Pipette />, object: <Box /> };
  const ribbonTabs: RibbonTab[] = [
    {
      id: 'home',
      label: 'Home',
      groups: [
        {
          label: 'File',
          items: [
            { label: 'Save', icon: <Save />, onClick: () => void save(), disabled: noMap, active: !!doc?.dirty, shortcut: kb['file.save'], title: data.saveTarget ? `Save into ${data.saveTarget.label}` : 'Save (downloads: no mod folder)' },
            { label: 'Save as…', icon: <FilePlus2 />, onClick: () => setDialog('saveAs'), disabled: noMap, size: 'sm' },
            {
              label: 'Recent',
              icon: <Clock />,
              onClick: () => undefined,
              size: 'sm',
              title: 'Recently opened maps',
              emptyMenu: 'No maps opened yet.',
              menu: [
                ...recentMapList.map((m) => ({ label: m.path.split('/').pop()!, hint: folderOf(m.path), title: m.path, onClick: () => void open(m.path) })),
                {
                  label: `${reopenLastMap ? '☑' : '☐'} Reopen the last map on start`,
                  onClick: () => {
                    setReopenLast(!reopenLastMap);
                    setReopenLastMap(!reopenLastMap);
                  },
                },
              ],
            },
            { label: 'Edit a DT1…', icon: <PaletteIcon />, onClick: () => setDialog('dt1edit'), size: 'sm', title: 'Open any DT1 from the game or your mod in the DT1 editor, no map needed: recolour, paint, make act-safe, change tile flags, save a copy' },
            {
              label: 'Import',
              icon: <FileInput />,
              onClick: () => undefined,
              disabled: !canWrite,
              size: 'sm',
              title: canWrite ? 'Bring maps and tile libraries into your mod' : 'No writable mod folder',
              menu: [
                { label: 'Map…', hint: '.ds1, or a map package (.zip)', title: 'A map package brings its tables too; a .ds1 on its own then needs Add to game', onClick: () => void pickImport('ds1') },
                { label: 'AutoMap rows…', hint: "another mod's AutoMap.txt rows, renumbered to your level types", title: "Rows from someone else's AutoMap.txt: their LevelName numbers are that mod's level types, so you choose which of yours each is for", onClick: () => void pickAutomapRows() },
                { label: 'DT1s…', hint: 'the tile library: browse, add your own, build a custom DT1', title: 'Every tile library the game and your mod have; add DT1 files or folders from your computer to it there', onClick: () => (noMap ? notify('Open a map first: the libraries are added to it.', true) : setDialog('dt1lib')) },
              ],
            },
            {
              label: 'Export',
              icon: <FileOutput />,
              onClick: () => undefined,
              disabled: noMap,
              size: 'sm',
              title: 'Share the map',
              menu: [
                { label: 'Map package…', hint: 'map, tile libraries and table rows (.zip), or the .ds1 alone', onClick: openExport },
                {
                  label: 'Level type package…',
                  hint: map?.resolution.lvlType ? `all of level type ${map.resolution.lvlType.id} “${map.resolution.lvlType.name}”: its tile libraries in one folder, every map’s table rows in one file per table (.zip)` : 'needs a map whose level is in the game',
                  onClick: () => map?.resolution.lvlType && setDialog('typepkg'),
                },
                { label: 'Picture…', hint: 'the whole map or the selection (.png)', onClick: () => setDialog('image') },
                { label: 'Copy view', hint: `the map pane as a picture${kb['view.snapshot'] ? ` (${kb['view.snapshot']})` : ''}`, onClick: () => void copyView() },
              ],
            },
            ...(isTauri ? [{ label: 'Folders…', icon: <FolderCog />, onClick: () => confirmDiscard() && setChangingFolders(true), size: 'sm' as const, title: 'The game and mod folders DS1 Studio works with' }] : []),
            { label: 'Preferences…', icon: <Settings />, onClick: () => setPrefsOpen(true), size: 'sm' as const, title: 'Save before opening another map, and other preferences' },
          ],
        },
        {
          label: 'Edit',
          items: [
            { label: 'Paste', icon: <ClipboardPaste />, onClick: startPaste, disabled: noMap || (tool === 'object' ? !objectClip : !clipboard), shortcut: kb['edit.paste'] },
            { label: 'Cut', icon: <Scissors />, onClick: () => copy(true), disabled: tool === 'object' ? selectedObject === null : !selection, size: 'sm', shortcut: kb['edit.cut'] },
            { label: 'Copy', icon: <Copy />, onClick: () => copy(false), disabled: tool === 'object' ? selectedObject === null : !selection, size: 'sm', shortcut: kb['edit.copy'] },
            { label: 'Delete', icon: <Trash2 />, onClick: () => clearSelection(false), disabled: !selection, size: 'sm', shortcut: kb['edit.delete'] },
            { label: 'Undo', icon: <Undo2 />, onClick: undo, disabled: !doc?.canUndo, size: 'sm', shortcut: kb['edit.undo'] },
            { label: 'Redo', icon: <Redo2 />, onClick: redo, disabled: !doc?.canRedo, size: 'sm', shortcut: kb['edit.redo'] },
            { label: 'Replace…', icon: <Replace />, onClick: () => setDialog('replace'), disabled: noMap, size: 'sm', shortcut: kb['edit.replace'], title: 'Find & replace a tile across the map or the selection' },
          ],
        },
        {
          label: 'Tools',
          items: TOOLS.filter(t => t.id !== 'object').map((t) => ({ label: t.label, icon: TOOL_ICONS[t.id], onClick: () => setTool(t.id), active: tool === t.id, disabled: noMap, title: t.hint, shortcut: kb[`tool.${t.id}` as ActionId] })),
        },
        {
          label: 'Paint / erase',
          items: [
            { label: 'Freehand', icon: <Paintbrush />, onClick: () => setPaintMode('brush'), active: paintMode === 'brush', disabled: noMap, size: 'sm', title: 'Paint and Erase follow the mouse' },
            { label: 'Rectangle', icon: <SquareDashed />, onClick: () => { setPaintMode('rect'); setTool((t) => (t === 'erase' ? t : 'paint')); }, active: paintMode === 'rect', disabled: noMap, size: 'sm', shortcut: kb['tool.rect'], title: 'Drag a rectangle to paint (or erase) it all at once' },
            { label: 'Fill area', icon: <PaintBucket />, onClick: () => { setPaintMode('fill'); setTool((t) => (t === 'erase' ? t : 'paint')); }, active: paintMode === 'fill', disabled: noMap, size: 'sm', shortcut: kb['tool.fill'], title: 'Click to fill the connected area of the same tile (kept inside the selection when you click in it)' },
          ],
        },
        {
          label: 'Layer',
          items: [
            {
              custom: (
                <>
                  <span className="muted small">Active layer</span>
                  <select value={layerKey(activeLayer)} disabled={noMap} onChange={(e) => setActiveLayer(layers.find((l) => layerKey(l) === e.target.value)!)}>
                    {layers.map((l) => (
                      <option key={layerKey(l)} value={layerKey(l)}>
                        {layerLabel(l)}
                      </option>
                    ))}
                  </select>
                </>
              ),
            },
          ],
        },
      ],
    },
    {
      id: 'view',
      label: 'View',
      groups: [
        {
          label: 'Cube recipe',
          items: [{ custom: <MapRecipeRibbon key={doc?.path ?? ''} fs={data.gd.fs} mapPath={doc?.path} refresh={data.gd} /> }],
        },
        {
          label: 'Navigate',
          items: [
            { label: 'Fit', icon: <Maximize />, onClick: () => setFitSignal((n) => n + 1), disabled: noMap, shortcut: kb['view.fit'] },
            { label: 'Game view', icon: <ScanEye />, onClick: toggleGameView, active: gameView.on, disabled: noMap, shortcut: kb['view.game'], title: `Zoom to what the character sees in game (${gameSize[0]}×${gameSize[1]}, centred on the selection)` },
            { custom: <GameSizePicker size={gameSize} onChange={setGameSize} /> },
            { label: 'Just the map', icon: <Fullscreen />, onClick: toggleJustTheMap, active: justTheMap, shortcut: kb['view.focus'], title: 'Fold both side panels away for the most room, or bring them back' },
          ],
        },
        {
          label: 'Mode',
          items: [
            { label: 'Tiles', icon: <Paintbrush />, onClick: exitMode, active: viewMode === 'tiles', disabled: noMap, title: 'Edit tiles and objects: the Tiles, Cell, History, Layers and Map panels' },
            { label: 'Objects', icon: <Box />, onClick: () => toggleMode('objects'), active: viewMode === 'objects', disabled: noMap, shortcut: kb['tool.object'], title: 'Select, move and place objects and NPCs' },
            { label: 'Walkability', icon: <Footprints />, onClick: () => toggleMode('walk'), active: viewMode === 'walk', disabled: noMap, shortcut: kb['view.walkable'], title: 'See and paint where units can walk, sub-tile by sub-tile' },
            { label: 'Automap', icon: <MapIcon />, onClick: () => toggleMode('automap'), active: viewMode === 'automap', disabled: noMap, shortcut: kb['view.automap'], title: 'Preview the in-game automap and see/change the AutoMap.txt piece of each tile' },
            { label: 'Level light', icon: <Sun />, onClick: () => toggleMode('light'), active: viewMode === 'light', disabled: noMap, shortcut: kb['view.light'], title: "The map in its level's light (Levels.txt Intensity and colour), with a player's light at the mouse; change and apply it" },
            { label: 'Roof hiding', icon: <House />, onClick: () => toggleMode('roofs'), active: viewMode === 'roofs', disabled: noMap, shortcut: kb['view.pops'], title: 'Where roofs (or other tiles) fade when a player walks in, which tiles fade, and what would stop it' },
          ],
        },
        {
          label: 'Show',
          items: [
            { label: 'Walkable area', icon: <Footprints />, onClick: () => setPrefs({ showWalkArea: !prefs.showWalkArea }), active: prefs.showWalkArea, disabled: noMap, size: 'sm', title: 'The walkable area box in the corner of the map (tiles² a player can stand on)' },
            { label: 'Walkable', icon: <Route />, onClick: () => setVisibility((v) => ({ ...v, overview: v.overview === 'walkable' ? null : 'walkable' })), active: visibility.overview === 'walkable', disabled: noMap, size: 'sm', title: 'Colour where players can walk (green), where only monsters can (yellow) and what is blocked (red), sub-tile by sub-tile' },
            { label: 'Spawns', icon: <Skull />, onClick: () => setVisibility((v) => ({ ...v, overview: v.overview === 'spawn' ? null : 'spawn' })), active: visibility.overview === 'spawn', disabled: noMap, size: 'sm', title: 'Colour where random monsters can spawn (green), and why not elsewhere: blocked, node regions, rooms with a level warp, or a level that spawns none' },
            { label: 'Grid', icon: <Grid3x3 />, onClick: () => setVisibility((v) => ({ ...v, grid: !v.grid })), active: visibility.grid, disabled: noMap, size: 'sm', shortcut: kb['view.grid'] },
            { label: 'Rooms 8×8', icon: <LayoutGrid />, onClick: () => setVisibility((v) => ({ ...v, rooms: !v.rooms })), active: visibility.rooms, disabled: noMap, size: 'sm', shortcut: kb['view.rooms'], title: 'Show the 8×8-tile rooms the game builds the level from' },
            { label: 'Minimap', icon: <MapPinned />, onClick: () => setVisibility((v) => ({ ...v, minimap: !v.minimap })), active: visibility.minimap, disabled: noMap, size: 'sm', shortcut: kb['view.minimap'], title: 'Overview of the whole map in the corner: click it to move there' },
            { label: 'Sprites', icon: <Box />, onClick: () => setVisibility((v) => ({ ...v, sprites: !v.sprites })), active: visibility.sprites, disabled: noMap, size: 'sm', shortcut: kb['view.sprites'], title: 'Draw objects and NPCs as they look in game' },
            {
              label: 'Animate',
              icon: <Waves />,
              onClick: () => setVisibility((v) => ({ ...v, animate: !v.animate })),
              active: visibility.animate,
              disabled: noMap,
              size: 'sm',
              shortcut: kb['view.animate'],
              title: `Play animated tiles (lava, animated water: tiles with frames and the lava flag, as the game plays them at 10 frames a second) and animated objects. ${
                animatedTiles ? `This map has ${animatedTiles} animated tile${animatedTiles === 1 ? '' : 's'}.` : 'This map has no animated tiles; make some with Map → Animated water….'
              }`,
            },
            { label: 'Markers', icon: <Eye />, onClick: () => setVisibility((v) => ({ ...v, objects: !v.objects })), active: visibility.objects, disabled: noMap, size: 'sm', shortcut: kb['view.markers'], title: 'Object and NPC markers' },
            { label: 'As if inside', icon: <EyeOff />, onClick: () => setVisibility((v) => ({ ...v, popsInside: !v.popsInside })), active: visibility.popsInside, disabled: noMap, size: 'sm', shortcut: kb['view.popsInside'], title: 'Hide the roofs of every hide area, as the game does while a player is inside: clicks then reach the floors under them' },
            { label: 'Wall categories…', icon: <BrickWall />, onClick: () => setWallCatsOpen(true), disabled: noMap, size: 'sm', title: 'Which wall tiles count as Upper or Lower walls (the toggles above the map), library by library' },
          ],
        },
        {
          label: 'Colours',
          items: [
            {
              custom: (
                <>
                  <span className="muted small">Palette</span>
                  <select value={map?.paletteAct ?? 0} disabled={noMap} onChange={(e) => map && void withPalette(data.gd, map, Number(e.target.value)).then(setMap)}>
                    {PALETTE_NAMES.map((n, i) => (
                      <option key={i} value={i}>
                        {n}
                      </option>
                    ))}
                  </select>
                </>
              ),
            },
          ],
        },
        {
          label: 'Picture',
          items: [
            { label: 'Copy view', icon: <Camera />, onClick: () => void copyView(), disabled: noMap, shortcut: kb['view.snapshot'], title: 'Copy the map pane exactly as shown, as a picture: paste it anywhere with Ctrl+V' },
            { label: 'Export picture…', icon: <ImageDown />, onClick: () => setDialog('image'), disabled: noMap, size: 'sm', title: 'Save the whole map (or the selection) as a PNG' },
          ],
        },
      ],
    },
    {
      id: 'map',
      label: 'Map',
      groups: [
        {
          label: 'Map',
          items: [
            { label: 'New map', icon: <FilePlus2 />, onClick: () => setDialog('new') },
            { label: 'Resize', icon: <Expand />, onClick: () => setResizeMode((m) => !m), active: resizeMode, disabled: noMap, title: 'Drag the handles on the map edges to add or remove cells' },
            { label: 'Resize…', icon: <Expand />, onClick: () => setDialog('resize'), disabled: noMap, size: 'sm', title: 'Resize by numbers' },
          ],
        },
        {
          label: 'Tile libraries',
          items: [
            { label: 'Tile libraries', icon: <Library />, onClick: () => setDialog('dt1s'), disabled: noMap, title: 'Add or remove DT1 files for this map' },
            { label: 'DT1 library…', icon: <Grid2x2Plus />, onClick: () => setDialog('dt1lib'), disabled: noMap, size: 'sm', title: 'Browse every tile library the game and your mods have, add DT1s from your computer, add whole libraries to the map or build a custom DT1 from single tiles' },
            { label: 'DT1 editor', icon: <PaletteIcon />, onClick: () => setDialog('dt1edit'), size: 'sm', title: 'Duplicate, rename, recolour and paint a DT1, or change its tiles’ flags (whole file, chosen tiles, or the tiles of a preset). Works without a map open too.' },
            { label: 'Reroll floors…', icon: <RefreshCw />, onClick: () => setDialog('floors'), disabled: noMap || !canWrite, size: 'sm', title: 'Choose floor tiles and reroll the selection or whole map' },
            { label: 'Animated water…', icon: <Blend />, onClick: () => setDialog('water'), disabled: noMap || !canWrite, size: 'sm', title: 'Edit water frames or create new animated water' },
            { label: 'Make act-safe', icon: <Blend />, onClick: () => setDialog('actsafe'), disabled: noMap, size: 'sm', title: "Fix tiles drawn for another act (odd red/purple colours): convert this map's DT1s to the colours that look the same in every act" },
          ],
        },
        {
          label: 'Presets',
          items: [
            { label: 'Presets', icon: <Stamp />, onClick: () => { exitMode(); setSidePanel((p) => (p === 'presets' && viewMode === 'tiles' ? 'tiles' : 'presets')); }, active: sidePanel === 'presets' && viewMode === 'tiles', disabled: noMap },
            { label: 'Save selection', icon: <Save />, onClick: () => void saveSelectionPreset(), disabled: !selection || !canWrite, size: 'sm' },
            { label: 'Preset builder', icon: <Grid2x2Plus />, onClick: () => setPresetBuilder(true), disabled: noMap || !canWrite, size: 'sm', title: 'Build a reusable preset on a separate 20×20 grid' },
            { label: 'Suggest', icon: <Sparkles />, onClick: () => { exitMode(); setSidePanel('presets'); void suggest(); }, disabled: noMap || !!suggesting, size: 'sm' },
          ],
        },
        {
          label: 'Buildings',
          items: [
            { label: 'Roof hiding…', icon: <House />, onClick: () => { setPopsKind('roof'); setDialog('pops'); }, disabled: noMap, title: 'Make roofs (or other tiles) disappear when a player walks into a building' },
            { label: 'Wall hiding…', icon: <BrickWall />, onClick: () => { setPopsKind('wall'); setDialog('pops'); }, disabled: noMap, title: 'Make walls in front of a room (the south and east walls) disappear while a player is inside it' },
          ],
        },
      ],
    },
    {
      id: 'game',
      label: 'Game',
      groups: [
        {
          label: 'Level',
          items: [
            { label: 'Add to game', icon: <Layers />, onClick: () => setDialog('register'), disabled: noMap || !canWrite, title: 'Create the LvlPrest/Levels/LvlTypes rows that make the game load this map' },
            { label: 'Level type…', icon: <Shapes />, onClick: () => setDialog('lvltype'), disabled: noMap || !canWrite, title: 'Give the map’s level another level type (LvlTypes), with the File slots, Dt1Mask and automap rows it needs' },
            { label: 'Entering text…', icon: <TypeIcon />, onClick: () => setDialog('entrytext'), disabled: !canWrite, title: 'Make the “Entering …” text image a level shows as players walk in (its EntryFile), drawn with the game’s font as txt2dc6 did' },
            { label: 'Custom object…', icon: <Box />, onClick: () => setDialog('customobj'), disabled: !canWrite, title: 'Make a picture of yours (a PNG, still or animated) into an object you place like the game’s own: it takes over an objects.txt row nothing uses' },
            { label: 'Cube recipe', icon: <FlaskConical />, onClick: () => setDialog('cube'), disabled: noMap || !canWrite, title: 'Create a map item and a cube recipe for it' },
            { label: 'Automap editor', icon: <MapIcon />, onClick: openAutomapEditor, disabled: noMap, title: 'See and change what the in-game automap draws for every tile of this map' },
          ],
        },
        {
          label: 'Tables',
          items: [
            { label: 'Data tables', icon: <Table2 />, onClick: () => openTable('LvlPrest'), title: 'Edit the game’s .txt tables' },
            { label: 'LvlPrest', icon: <Table2 />, onClick: () => openTable('LvlPrest', map?.resolution.preset?.name), size: 'sm' },
            { label: 'LvlTypes', icon: <Table2 />, onClick: () => openTable('LvlTypes', map?.resolution.lvlType?.name), size: 'sm' },
            { label: 'Levels', icon: <Table2 />, onClick: () => openTable('Levels'), size: 'sm' },
            { label: 'Objects', icon: <Table2 />, onClick: () => openTable('Objects'), size: 'sm' },
            { label: 'MonPreset', icon: <Table2 />, onClick: () => openTable('MonPreset'), size: 'sm' },
            { label: 'CubeMain', icon: <Table2 />, onClick: () => openTable('CubeMain'), size: 'sm' },
          ],
        },
      ],
    },
    {
      id: 'diagnostics', label: 'Diagnostics', groups: [
        {
          label: 'Check',
          items: [
            { label: 'Compatibility', icon: <ShieldCheck />, onClick: () => void runCheck(), disabled: noMap, title: 'Check that this map will load and play in game' },
            { label: 'Crash log', icon: <FileWarning />, onClick: openCrashLog, title: "Read the game's crash log and see what the latest crash means for your map" },
            { label: 'Unused DT1s…', icon: <Search />, onClick: () => openCleanup(), title: 'Find unused DT1 files and tile groups across all maps' },
            { label: 'Restore assets…', icon: <Undo2 />, onClick: () => openCleanup(true), title: 'Restore deleted DT1s, tile groups and maps to their original folders' },
          ],
        },
      ],
    },
    {
      id: 'help',
      label: 'Help',
      groups: [
        {
          label: 'Updates',
          items: [
            { label: 'Check for updates', icon: <RefreshCw />, onClick: () => setDialog('update'), title: 'Look for a newer version on GitHub and install it' },
            { label: 'About', icon: <Info />, onClick: () => setDialog('about'), title: 'Version and build information' },
          ],
        },
        {
          label: 'Support',
          items: [
            { label: 'Find a command', icon: <Search />, onClick: () => setCommandsOpen(true), shortcut: kb['app.commands'], title: 'Type any command\u2019s name and run it' },
            { label: 'User guide', icon: <BookOpen />, onClick: () => void openExternal(GUIDE_URL), title: 'The interactive guide: quick start, every tool, searchable shortcuts' },
            { label: 'Manual (PDF)', icon: <FileText />, onClick: () => void openExternal(MANUAL_PDF_URL), size: 'sm', title: 'The printable manual' },
            { label: 'Shortcuts', icon: <Keyboard />, onClick: () => setDialog('shortcuts'), title: 'View and change keyboard shortcuts' },
            { label: 'Suggest a feature', icon: <Lightbulb />, onClick: () => void openExternal(featureRequestUrl({ map: map?.path })), size: 'sm', title: 'Open a pre-filled feature request on GitHub' },
            { label: 'Report a bug', icon: <Bug />, onClick: () => void openExternal(bugReportUrl({ map: map?.path })), size: 'sm', title: 'Open a pre-filled bug report on GitHub' },
          ],
        },
      ],
    },
  ];

  /** The DT1s the map's tiles come from (plus the special-tile library when the map loads it), as Add to game uses. */
  const mapUsedDt1s = [
    ...[...dt1Usage.keys()].filter((p) => !isBuiltinPath(p)).map((p) => data.gd.fs.exactPath(p) ?? p),
    ...((map?.lib.loaded ?? []).some((l) => l.found && normalizePath(l.path) === normalizePath(SPECIAL_TILES_DT1)) && ![...dt1Usage.keys()].some((p) => normalizePath(p) === normalizePath(SPECIAL_TILES_DT1))
      ? [data.gd.fs.exactPath(SPECIAL_TILES_DT1) ?? SPECIAL_TILES_DT1]
      : []),
  ];
  /** The automap tile kinds ("code|style", AutoMap.txt TileName and Style) the map's tiles use. */
  const mapAutomapKinds = (() => {
    const out = new Set<string>();
    if (!doc) return out;
    for (const layer of doc.ds1.floors) for (const c of layer) if (!isEmptyCell(c)) out.add(`fl|${c.mainIndex}`);
    for (const layer of doc.ds1.walls)
      for (const c of layer) {
        const code = !isEmptyCell(c) ? AUTOMAP_CODES[c.orientation] : undefined;
        if (code) out.add(`${code}|${c.mainIndex}`);
      }
    return out;
  })();
  const sourcesText = data.gd.fs.baseSources.map((s) => s.label.split(/[\\/]/).slice(-2).join('/')).join('  ›  ');
  /** What a click on the map does right now, in the status bar. */
  const statusHint = !map
    ? null
    : viewMode === 'walk'
      ? `Walkability: click or drag to ${walkBrush.mode === 'block' ? 'add flags' : walkBrush.mode === 'clear' ? 'remove flags' : 'set exact flags'} (${walkBrush.size === 'cell' ? 'whole cells' : `${walkBrush.size}×${walkBrush.size} sub-tiles`}; the brush is in the panel) · right-drag pans`
      : viewMode === 'automap'
        ? 'Automap: click a cell to see and change its automap pieces in the panel'
        : viewMode === 'light'
          ? playerLight
            ? "Level light: the lit circle at the mouse is a player's own light"
            : "Level light: the map as the game lights it · raise Player light to see a player's light at the mouse"
          : viewMode === 'roofs'
            ? 'Roof hiding: filled = where a player must stand · outlined = the tiles that fade · click an area in the panel to find it'
            : pasting
              ? 'Paste: click to place · Esc to cancel'
              : placing
                ? 'Objects: click the map to place it · Esc to stop'
                : tool === 'paint' && !brush
                  ? 'Paint: choose a tile in the Tiles panel first (or Pick one from the map)'
                  : `${TOOLS.find((t) => t.id === tool)!.hint} · right-click for more`;
  /**
   * Puts a special tile (orientation 10, invisible in game) at a cell, on the first wall layer free there; a new wall
   * layer when all are taken (up to 4).
   */
  const placeSpecial = (x: number, y: number, main: number, sub: number, label: string) => {
    if (!doc) return;
    const walls = doc.ds1.walls.length;
    let index = -1;
    for (let i = 0; i < walls && index < 0; i++) if (isEmptyCell(doc.cell({ kind: 'wall', index: i }, x, y))) index = i;
    if (index < 0 && walls >= 4) return notify(`Cell ${x}, ${y} has a tile on all 4 wall layers: clear one to put ${label} here.`, true);
    const brushed: Brush = { orientation: Orientation.SpecialTile1, main, sub };
    doc.mutate((d) => {
      if (index < 0) {
        index = d.walls.length;
        d.walls.push(Array.from({ length: d.width * d.height }, () => ({ ...EMPTY_CELL, orientation: 0, orientationHigh: 0 })));
      }
      const layer: LayerRef = { kind: 'wall', index };
      (d.walls[index] as unknown[])[y * d.width + x] = MapDocument.painted(layer, d.walls[index][y * d.width + x], brushed);
    }, `Place ${label}`);
    bump();
    notify(`${label} placed at cell ${x}, ${y} (Wall ${index + 1}) · Ctrl+Z to undo`);
  };
  /** The map's right-click menu for a cell. */
  /** The cells a whole-cell action at `cell` works on: the selection when the cell is in it, else just that cell. */
  const actionCells = (cell: [number, number]): [number, number][] =>
    selection && inSelection(selection, cell[0], cell[1]) ? rectCells(selection).filter(([x, y]) => inSelection(selection, x, y)) : [cell];
  /**
   * Makes cells unwalkable (or walkable again) with the map's whole-cell flag, as WinDS1's Ctrl+Shift+right-click: only
   * these cells, no tile file, whatever floor layers they use. One undo step.
   */
  const setUnwalkable = (cells: [number, number][], on: boolean) => {
    if (!doc) return;
    const r = cellUnwalkableEdits(doc, cells, on);
    const label = on ? 'Make unwalkable (cell flag)' : 'Make walkable (cell flag)';
    if (r.edits.length && doc.apply(r.edits, label)) bump();
    const filled = r.filled ? ` · ${r.filled} empty cell${r.filled === 1 ? '' : 's'} given a hidden floor to hold it` : '';
    const skipped = filled + (r.skipped ? ` · ${r.skipped} empty cell${r.skipped === 1 ? '' : 's'} skipped: the map has no floor tile to copy` : '');
    notify(r.cells ? `${r.cells} cell${r.cells === 1 ? '' : 's'} ${on ? 'unwalkable' : 'walkable again'} (cell flag)${skipped}` : `Nothing to change: ${on ? 'already unwalkable' : 'no cell flag here'}${skipped}`, !!r.skipped && !r.cells);
  };
  /** Ctrl+Shift+right-click: toggles the flag on the cell (or the selection it is in), by the cell's current state. */
  const toggleUnwalkableAt = (cell: [number, number]) => {
    if (!doc || !doc.inBounds(cell[0], cell[1])) return;
    setUnwalkable(actionCells(cell), !isCellUnwalkable(doc, cell[0], cell[1]));
  };

  const mapMenuEntries = (m: { cell: [number, number]; world: [number, number] }): (MenuEntry | null)[] => {
    if (!doc || !scene) return [];
    const [x, y] = m.cell;
    const inside = doc.inBounds(x, y);
    const selectCell = () => {
      setTool('select');
      setStack(null);
      setSelection({ x0: x, y0: y, x1: x, y1: y });
      const hit = hitTest(scene, m.world[0], m.world[1], hittable);
      if (hit) focusTile(hit.tile, layerOfItem(hit));
    };
    return [
      ...(inside
        ? [
            { label: 'Select this cell', onClick: selectCell },
            {
              label: 'Cell details',
              onClick: () => {
                selectCell();
                setRightTab('cell');
                exitMode();
                setRightCollapsed(false);
              },
            },
            { label: 'Pick this tile', onClick: () => pickAt(x, y, m.world), shortcut: kb['tool.pick'] },
            {
              label: 'Place a special tile here',
              children: PLACEABLE_SPECIALS.map((sp) => ({ label: sp.label, title: sp.help, onClick: () => placeSpecial(x, y, sp.main, sp.sub, sp.label) })),
            },
            isCellUnwalkable(doc, x, y)
              ? { label: `Make walkable again (cell flag)${actionCells(m.cell).length > 1 ? ', selection' : ''}`, title: 'Clear the whole-cell unwalkable flag (Ctrl+Shift+right-click)', onClick: () => setUnwalkable(actionCells(m.cell), false) }
              : { label: `Make unwalkable (cell flag)${actionCells(m.cell).length > 1 ? ', selection' : ''}`, title: 'Block walking on the whole cell with the map’s cell flag, as WinDS1 does: only these cells, no tile file (Ctrl+Shift+right-click)', onClick: () => setUnwalkable(actionCells(m.cell), true) },
            null,
          ]
        : []),
      { label: 'Copy', onClick: () => copy(false), disabled: tool === 'object' ? selectedObject === null : !selection, shortcut: kb['edit.copy'] },
      { label: 'Cut', onClick: () => copy(true), disabled: tool === 'object' ? selectedObject === null : !selection, shortcut: kb['edit.cut'] },
      { label: 'Paste', onClick: startPaste, disabled: tool === 'object' ? !objectClip : !clipboard, shortcut: kb['edit.paste'] },
      { label: 'Delete', onClick: () => clearSelection(false), disabled: !selection, shortcut: kb['edit.delete'] },
      { label: 'Save as preset…', disabled: !canWrite || (!inside && !selection), onClick: () => {
        if (!map) return;
        const area = selection ?? { x0: x, y0: y, x1: x, y1: y };
        setPresetSave({ clip: copyRect(doc, area), name: `${map.path.split('/').pop()!.replace(/\.ds1$/i, '')} preset` });
      } },
      { label: 'Preset builder…', disabled: !canWrite, onClick: () => setPresetBuilder(true) },
      ...(selection ? [{ label: 'Deselect', onClick: () => setSelection(null) }] : []),
      null,
      { label: 'Centre the view here', onClick: () => setCenterOn((c) => ({ x: m.world[0], y: m.world[1], signal: (c?.signal ?? 0) + 1 })) },
      { label: 'Fit the map', onClick: () => setFitSignal((n) => n + 1), shortcut: kb['view.fit'] },
      { label: justTheMap ? 'Show the side panels' : 'Just the map', onClick: toggleJustTheMap, shortcut: kb['view.focus'] },
      { label: 'Copy view (picture)', onClick: () => void copyView(), shortcut: kb['view.snapshot'] },
    ];
  };

  return (
    <div className="app" style={{ gridTemplateColumns: `${leftCollapsed ? 30 : leftW}px 1fr ${rightCollapsed ? 30 : rightW}px` }}>
      <Ribbon
        tabs={ribbonTabs}
        brand={
          <>
            <span className="brand-mark">◆</span> DS1 Studio
          </>
        }
        right={
          <>
            <button className="topbar-commands" onClick={() => setCommandsOpen(true)} title="Find any command by name">
              <Search size={13} /> Commands <kbd>{kb['app.commands'] || 'Ctrl+K'}</kbd>
            </button>
            <button className="topbar-idea" onClick={() => void openExternal(featureRequestUrl({ map: map?.path }))} title="Suggest a feature: opens a pre-filled idea on GitHub">
              <Lightbulb size={14} /> Suggest a feature
            </button>
            {map ? (
              <>
                <span className="topbar-title">
                  {title}
                  {doc?.dirty && <span className="dirty-dot" title="Unsaved changes" />}
                </span>
                <span className="topbar-path">{map.path}</span>
              </>
            ) : (
              <span className="muted">No map open</span>
            )}
          </>
        }
      />

      {!leftCollapsed && <Splitter axis="x" direction={1} size={leftW} onResize={setLeftW} className="edge-right" title="Drag to widen or narrow the presets list" />}
      <aside className={`sidebar left${leftCollapsed ? ' collapsed' : ''}`}>
        {leftCollapsed ? (
          <button className="sidebar-expand" onClick={() => setLeftCollapsed(false)} title="Show the presets list">
            <PanelLeftOpen size={16} />
            <span className="sidebar-expand-label">Presets</span>
          </button>
        ) : (
          <FileBrowser
            files={data.files}
            current={map?.path ?? null}
            loading={loadingPath}
            onOpen={open}
            onDelete={isTauri ? path => void deleteDs1(path) : undefined}
            collapse={
              <button className="icon-btn" title="Fold the presets list away (more room for the map)" onClick={() => setLeftCollapsed(true)}>
                <PanelLeftClose size={15} />
              </button>
            }
          />
        )}
      </aside>

      <main className="stage">
        {map && <MapLayerBar ds1={map.ds1} layerCount={map.ds1.floors.length * 8 + map.ds1.walls.length} lib={map.lib} visibility={visibility} onChange={setVisibility} onSolo={toggleSolo} />}
        <div className="stage-map">
        {modeAlert && <div className="mode-alert" role="status" aria-live="polite">{modeAlert}</div>}
        {map && scene && visibility.walkable && <WalkLegend floating />}
        {overview && <OverviewLegend overlay={overview} />}
        {map && scene && walkArea !== null && prefs.showWalkArea && (() => {
          const { rgb, band } = areaColour(walkArea);
          const c = `rgb(${rgb.join(',')})`;
          return (
            <div
              className={`walk-area-box ${band}`}
              style={{ borderColor: c, boxShadow: `0 0 0 1px ${c}33, 0 4px 16px rgba(0,0,0,0.5)` }}
              title={`Tiles a player can stand on (floor with no blocking flag), as the Walkability view (W) shows them. Grey below ${AREA_BANDS.min.toLocaleString()}; green ${AREA_BANDS.min.toLocaleString()}-${AREA_BANDS.green.toLocaleString()}; orange ${AREA_BANDS.green.toLocaleString()}-${AREA_BANDS.orange.toLocaleString()}; redder above ${AREA_BANDS.orange.toLocaleString()}.`}
            >
              <span className="walk-area-label">Walkable area</span>
              <span className="walk-area-value" style={{ color: c }}>
                {Math.round(walkArea).toLocaleString()} <span className="walk-area-unit">tiles²</span>
              </span>
            </div>
          );
        })()}
        {map && scene && viewMode === 'automap' && <AutomapLegend style={automapStyle} />}
        {pasteDoomed && (
          <div className={`paste-doomed${pasteDoomed.length ? ' bad' : ''}`} role="status">
            {pasteDoomed.length
              ? `Placing here replaces ${pasteDoomed.reduce((n, c) => n + c.n, 0)} existing tile${pasteDoomed.reduce((n, c) => n + c.n, 0) === 1 ? '' : 's'} (red cells) · hold Alt when clicking to stack instead`
              : 'Placing here replaces no existing tiles'}
          </div>
        )}
        {pasting && prefs.pasteStack && (
          <div className="paste-doomed" role="status">
            Placing stacks onto existing tiles (the next free layer) · hold Alt when clicking to replace them instead
          </div>
        )}
        {map && !rightCollapsed && (
          <button className="stage-fold" onClick={() => setRightCollapsed(true)} title="Fold the side panels away (more room for the map)">
            <PanelRightClose size={15} />
          </button>
        )}
        <ErrorBoundary
          what="the map view"
          resetKey={map}
          context={() => ({ map: map?.path })}
          action={map ? { label: 'Close this map', onClick: () => { if (confirmDiscard()) { setMap(null); setDoc(null); } } } : undefined}
        >
        {map && scene ? (
          <MapView
            map={map}
            scene={scene}
            visibility={mapVisibility}
            hover={hover}
            tool={tool}
            ghost={ghost}
            selection={selection}
            pasteRect={pasteRect}
            objectLabel={objectLabel}
            objectGhost={objectPasting && tool === 'object' ? objectClip : null}
            selectedObject={selectedObject}
            objectsRevision={objectsRevision}
            selectedObjects={objectGroup}
            onDoubleClick={selectSameObjects}
            sprites={sprites}
            animations={animations}
            marks={marks}
            doomed={pasteDoomed}
            input={mapInput}
            resizeMode={resizeMode}
            onResize={(d) => {
              resize(d);
              notify(`Resized to ${doc!.ds1.width}×${doc!.ds1.height}`);
            }}
            onHover={setHover}
            onZoom={setZoom}
            onStroke={onStroke}
            fitSignal={fitSignal}
            zoomCommand={zoomCommand}
            snapshotRef={snapshotRef}
            onContextMenu={(at, cell, world, mods) => (mods?.ctrl && mods.shift ? toggleUnwalkableAt(cell) : setMapMenu({ at, cell, world }))}
            gameView={{ ...gameView, width: gameSize[0], height: gameSize[1] }}
            focus={focus}
            areaLayer={areaLayer}
            hittable={hittable}
            onCycle={cycleStack}
            automap={automapView}
            centerOn={centerOn}
            specialLabel={specialLabel}
            pops={popView}
            walkMarks={walkMarks}
            walkBrush={visibility.walkable ? { size: walkBrush.size, mode: walkBrush.mode } : null}
            light={visibility.light ? lightMultiplier(lightDraft ?? levelLight) : null}
            playerLight={playerLight}
            objectLights={objectLights}
            objectLightsLit={visibility.objectLights}
            lightRings={visibility.lightRings}
            overview={overview}
          />
        ) : (
          <div className="empty-stage">
            <div className="empty-title">Open a map</div>
            <div className="muted">
              Pick a DS1 from the list. {data.files.length.toLocaleString()} presets found across {data.gd.fs.baseSources.length} sources.
            </div>
            {recoveries.length > 0 && (
              <div className="recent-maps">
                <div className="field-label warn-text">Unsaved work kept from an earlier session</div>
                {recoveries.map((r) => (
                  <button key={r.path} className="mo-row" onClick={() => void open(r.path)} title="Open it: you'll be offered the autosaved changes">
                    <Clock size={13} />
                    <span className="mo-name">{r.path.split('/').pop()}</span>
                    <span className="muted small">{new Date(r.time).toLocaleString()}</span>
                  </button>
                ))}
              </div>
            )}
            {recentMapList.length > 0 && (
              <div className="recent-maps">
                <div className="field-label">Recent maps</div>
                {recentMapList.map((m) => (
                  <button key={m.path} className="mo-row" onClick={() => void open(m.path)} title={m.path}>
                    <span className="mo-name">{m.path.split('/').pop()}</span>
                    <span className="muted small">{folderOf(m.path)}</span>
                  </button>
                ))}
                <label className="small muted">
                  <input
                    type="checkbox"
                    checked={reopenLastMap}
                    onChange={(e) => {
                      setReopenLast(e.target.checked);
                      setReopenLastMap(e.target.checked);
                    }}
                  />{' '}
                  Reopen the last map on start
                </label>
              </div>
            )}
          </div>
        )}
        {toast && (
          <div className={`toast${toast.error ? ' error' : ''}`} onClick={() => setToast(null)}>
            {toast.text}
          </div>
        )}
        </ErrorBoundary>
        {loadingPath && <div className="toast">Loading {loadingPath.split('/').pop()}…</div>}
        </div>
      </main>

      {!rightCollapsed && <Splitter axis="x" direction={-1} size={rightW} onResize={setRightW} className="edge-left" title="Drag to widen or narrow the side panel" />}
      <aside className={`sidebar right${rightCollapsed ? ' collapsed' : ''}`}>
        {rightCollapsed && (
          <button className="sidebar-expand" onClick={() => setRightCollapsed(false)} title="Show the side panels">
            <PanelRightOpen size={16} />
            <span className="sidebar-expand-label">{viewMode === 'tiles' ? 'Panels' : { objects: 'Objects', walk: 'Walkability', automap: 'Automap', light: 'Level light', roofs: 'Roof hiding' }[viewMode]}</span>
          </button>
        )}
        {!rightCollapsed && (
        <>
        <ErrorBoundary what="the side panel" resetKey={`${map?.path}:${tool}`} context={() => ({ map: map?.path })} compact>
        {map && scene && doc && viewMode !== 'tiles' && viewMode !== 'objects' && (
          <ModeFrame mode={viewMode} onDone={exitMode}>
            {viewMode === 'walk' && (
              <WalkPanel
                brush={walkBrush}
                ds1={doc.ds1} lib={map.lib} scene={scene} preset={map.resolution.preset} hover={hover} revision={revision}
                onPaint={paint => void applyWalkRef.current?.(paint)}
                onChange={setWalkBrush}
                busy={walkBusy}
                canWrite={canWrite}
                libraryPath={(gd ? ownTilesPath(gd, map.path, map.resolution.lvlType) : '').replace(/^data\/global\/tiles\//i, '')}
                tileFlags={{ pending: flagEditCount, saving: savingFlags, onSave: () => void saveTileFlags(), onDiscard: discardTileFlags }}
                inSelection={!!selection}
                onBlockEmpty={() => setUnwalkable(emptyCells(doc.ds1, selection ? (x, y) => inSelection(selection, x, y) : undefined, overlayFlags(doc.ds1, scene, map.lib, map.resolution.preset)), true)}
                last={walkLast}
                onDone={exitMode}
              />
            )}
            {viewMode === 'automap' &&
              (automapData ? (
                <AutomapPanel
                  style={automapStyle}
                  onStyle={setAutomapStyle}
                  kindOf={automapKindOf ?? undefined}
                  onOpenEditor={openAutomapEditor}
                  table={automapData.table}
                  cels={automapData.cels}
                  palette={map.palette}
                  level={automapLevel}
                  onLevel={(level) => setAutomapLevelOverride({ path: map.path, level })}
                  pieces={automapPiecesNow ?? []}
                  cell={selection && isSingleCell(selection) ? { x: selection.x0, y: selection.y0 } : null}
                  canSave={canWrite}
                  onSet={(p, cel, scope) => void setAutomapPiece(p, cel, scope)}
                  hasSelection={!!selection && !clearingAutomap}
                  onClearSelection={() => void editAutomapSelection()}
                  suggestions={automapSuggestions}
                  onSuggest={(floors) => {
                    if (!automapLevel) return;
                    notify('Analysing tiles for automap suggestions…');
                    void makeAutomapColors().then((colors) => setAutomapSuggestions(suggestAutomap(automapData.table, automapLevel, automapPiecesNow ?? [], { floors, colors })));
                  }}
                  onSuggestionCel={(code, cel) => setAutomapSuggestions((list) => list && list.map((sg) => (sg.code === code ? { ...sg, cel } : sg)))}
                  onSkipCode={(code) => setAutomapSuggestions((list) => list && list.filter((sg) => sg.code !== code))}
                  onApplySuggestions={() => void applyAutomapSuggestionsNow()}
                  onCancelSuggestions={() => setAutomapSuggestions(null)}
                  levelLabel={(l) => {
                    const t = /^\d+$/.test(l.trim()) ? data.gd.lvlType(Number(l)) : null;
                    return t && t.name !== l.trim() ? `${l} · ${t.name}` : l;
                  }}
                />
              ) : (
                <p className="muted small panel-body">Reading AutoMap.txt…</p>
              ))}
            {viewMode === 'light' && (
              <LightPanel
                light={levelLight}
                canWrite={canWrite}
                playerLight={playerLight}
                onPlayerLight={setPlayerLight}
                onDraft={setLightDraft}
                onApply={applyLevelLight}
                onAddToGame={() => setDialog('register')}
                objectLights={objectLights.length}
                lightsOn={visibility.objectLights}
                onLightsOn={(on) => setVisibility((v) => ({ ...v, objectLights: on }))}
                rings={visibility.lightRings}
                onRings={(on) => setVisibility((v) => ({ ...v, lightRings: on }))}
              />
            )}
            {viewMode === 'roofs' && (
              <RoofPanel
                ds1={map.ds1}
                areas={popAreas}
                preset={popPreset ? { pops: popPreset.pops, popPad: popPreset.popPad } : null}
                inside={visibility.popsInside}
                onInside={(on) => setVisibility((v) => ({ ...v, popsInside: on }))}
                onShowCells={(cells) => {
                  setMarks(cells);
                  notify(`${cells.length} markers marked · Esc to clear`);
                }}
                onSetUp={() => {
                  setPopsKind('roof');
                  setDialog('pops');
                }}
              />
            )}
          </ModeFrame>
        )}
        {map && scene && doc && (viewMode === 'tiles' || viewMode === 'objects') && (
          <div className="side-tabbed">
            <div className="side-tab-body">
            {clipPane && clipboard && (
              <ClipboardPanel
                clip={clipboard}
                lib={map.lib}
                palette={map.palette}
                pasting={pasting}
                canSave={canWrite}
                onPaste={startPaste}
                onSaveAsPreset={() => setPresetSave({ clip: clipboard, name: `${map.path.split('/').pop()!.replace(/\.ds1$/i, '')} ${clipboard.width}×${clipboard.height}` })}
                onClose={() => {
                  setClipPane(false);
                  setPasting(false);
                }}
              />
            )}
            <div className="side-tab-pane" hidden={rightTab !== 'tiles'}>
            {tool === 'object' && (
              <section className="panel object-preview-panel">
                <div className="panel-header static">
                  <span>Preview</span>
                </div>
                <div className="panel-body">
                  <ObjectPreview
                    fs={data.gd.fs}
                    palette={map.palette}
                    spec={selectedObject !== null && map.ds1.objects[selectedObject] ? data.gd.objectSpec(map.ds1.act, map.ds1.objects[selectedObject].type, map.ds1.objects[selectedObject].id) : null}
                    name={selectedObject !== null && map.ds1.objects[selectedObject] ? nameOf(map.ds1.objects[selectedObject].type, map.ds1.objects[selectedObject].id) : ''}
                  />
                </div>
              </section>
            )}
            {tool === 'object' && (
              <MapObjectsPanel
                objects={map.ds1.objects}
                nameOf={nameOf}
                onJump={(i) => {
                  const o = map.ds1.objects[i];
                  if (!o) return;
                  setSelectedObject(i);
                  const [x, y] = subTileToWorld(o.x, o.y);
                  setCenterOn((c) => ({ x, y, signal: (c?.signal ?? 0) + 1 }));
                }}
              />
            )}
            {tool === 'object' && (
              <ObjectPanel
                objects={map.ds1.objects}
                selected={selectedObject}
                nameOf={nameOf}
                hasNames={data.gd.hasObjectNames}
                placing={placing}
                onSelect={setSelectedObject}
                onChange={setObjects}
                onStartPlacing={setPlacing}
              />
            )}
            {tool === 'object' && (
              <section className="panel">
                <div className="panel-header static">
                  <span>Objects &amp; NPCs</span>
                  <span className="muted small">{placing ? 'click the map to place · Esc to stop' : 'click one to place it'}</span>
                </div>
                <div className="panel-body">
                  <ObjectGallery
                    gd={data.gd}
                    act={map.ds1.act}
                    palette={map.palette}
                    placing={placing}
                    onPlace={(o) => setPlacing(placing && placing.type === o.type && placing.id === o.id ? null : o)}
                  />
                </div>
              </section>
            )}
            {tool !== 'object' && (
              <div className="side-tabs">
                <button className={sidePanel === 'tiles' ? 'active' : ''} onClick={() => setSidePanel('tiles')}>
                  Tiles
                </button>
                <button className={sidePanel === 'presets' ? 'active' : ''} onClick={() => setSidePanel('presets')}>
                  Presets
                </button>
              </div>
            )}
            {tool !== 'object' && (sidePanel === 'presets' || presetsOpened) && (
              <div hidden={sidePanel !== 'presets'} className="presets-host">
              <PresetsPanel
                gd={data.gd}
                isPrepared={(p) => {
                  const clip = presetImportCache.current.get(p.id);
                  const missing = clip && missingForPaste(clip, map.lib);
                  return !!missing && !missing.tiles && !missing.different;
                }}
                saved={presets}
                suggested={suggested}
                suggesting={suggesting}
                lib={map.lib}
                palette={map.palette}
                dt1Paths={map.lib.loaded.filter((l) => l.found).map((l) => l.path)}
                hasSelection={!!selection}
                canSave={canWrite}
                onPlace={(p) => void placePreset(p)}
                onSaveSelection={() => void saveSelectionPreset()}
                onSavePreset={(p) => void savePreset(p).catch(e => notify(String(e), true))}
                onBuild={() => setPresetBuilder(true)}
                onUpdate={(p, change) => void updatePreset(p, change)}
                onDuplicate={(p) => void duplicatePreset(p)}
                onDelete={(p) => void deletePreset(p)}
                onExport={(list, name) => void exportPresets(list, name)}
                onImport={() => void importPresets()}
                confirmDelete={prefs.confirmBulkDelete}
                onSuggest={() => void suggest()}
              />
              </div>
            )}
            <section className="panel" hidden={tool === 'object' || sidePanel !== 'tiles'}>
              <div className="panel-header static">
                <span>Tiles · {layerLabel(activeLayer)}</span>
                {brush && (
                  <span className="muted small" title={mix.length ? 'Each painted cell gets one of these at random (Ctrl+click tiles to add or remove)' : 'Ctrl+click more tiles to paint a random mix'}>
                    brush {brush.main}/{brush.sub}
                    {mix.length ? ` + ${mix.length} mixed` : ''}
                    {mix.length > 0 && (
                      <button className="link mix-clear" onClick={() => setMix([])}>
                        clear mix
                      </button>
                    )}
                  </span>
                )}
              </div>
              <TilePalette
                lib={map.lib}
                palette={map.palette}
                layerKind={activeLayer.kind}
                onLayerKindChange={paletteLayerKind}
                brush={brush}
                mix={mix}
                focus={paletteFocus}
                onPick={pickBrush}
                recent={recentTileList}
                favourites={pinned}
                onToggleFavourite={paletteToggleFavourite}
              />
            </section>
            </div>
            <PanelTabContext.Provider value={true}>
            <div className="side-tab-pane" hidden={rightTab !== 'cell'}>
            {selection && !isSingleCell(selection) && (
              <SelectionPanel
                selection={selection}
                activeLayer={activeLayer}
                brush={brush}
                canPaste={!!clipboard}
                onFill={fillSelection}
                onClear={clearSelection}
                onCopy={copy}
                onPaste={startPaste}
                onlyLayer={onlyLayer}
                onReroll={rerollSelection}
                onReplace={() => setDialog('replace')}
                onUnwalkable={(on) => setUnwalkable(rectCells(selection).filter(([x, y]) => inSelection(selection, x, y)), on)}
                objectCount={doc.ds1.objects.filter((o) => objectInRect(o, selection)).length}
                onDeselect={() => {
                  setSelection(null);
                  setStack(null);
                }}
              />
            )}
            <CellPanel
              map={map}
              doc={doc}
              cell={selection && isSingleCell(selection) ? { cellX: selection.x0, cellY: selection.y0 } : hover}
              editable={!!selection && isSingleCell(selection)}
              revision={revision}
              onEdit={applyEdits}
              onMutate={mutate}
              scene={scene}
              onFocusTile={(t, l) => {
                focusTile(t, l);
                setRightTab('tiles');
              }}
              onlyLayer={onlyLayer}
              brush={brush}
              tileFlags={{
                pending: flagEditCount,
                edited: (t) => flagEdits.current.has(t),
                onEdit: editTileFlags,
                onSave: () => void saveTileFlags(),
                onDiscard: discardTileFlags,
                canSave: canWrite,
                saving: savingFlags,
                walkabilityShown: visibility.walkable,
                onShowWalkability: () => setVisibility((v) => ({ ...v, walkable: true })),
              }}
              warps={{ links, onOpen: (p) => void open(p), onEdit: (vis) => setWarpEdit(vis) }}
            />
            </div>
            <div className="side-tab-pane" hidden={rightTab !== 'history'}>
            <HistoryPanel
              doc={doc}
              revision={revision}
              onGoTo={(n) => {
                const delta = n - doc.history().done.length;
                void replayHistory(delta < 0 ? 'undo' : 'redo', Math.abs(delta));
              }}
            />
            </div>
            <div className="side-tab-pane" hidden={rightTab !== 'groups'}>
            <GroupsPanel ds1={map.ds1} selection={selection} onMutate={mutate} onShowGroups={() => setVisibility((v) => ({ ...v, groups: true }))} />
            </div>
            <div className="side-tab-pane" hidden={rightTab !== 'layers'}>
            <LayersPanel map={map} scene={scene} visibility={visibility} onChange={setVisibility} keys={kb} />
            </div>
            <div className="side-tab-pane" hidden={rightTab !== 'map'}>
            <MapInfoPanel
              map={map}
              gd={data.gd}
              onReopen={reresolve}
              onPalette={(act) => void withPalette(data.gd, map, act).then(setMap)}
            />
            </div>
            </PanelTabContext.Provider>
            </div>
            <nav className="side-vtabs" aria-label="Side panels">
              {SIDE_TABS.map((t) => (
                <button key={t.id} className={rightTab === t.id ? 'active' : ''} aria-pressed={rightTab === t.id} title={t.id === 'tiles' && tool === 'object' ? 'Objects & NPCs' : t.title} onClick={() => setRightTab(t.id)}>
                  <t.Icon size={17} />
                  {t.id === 'cell' && selection && <span className="side-vtab-dot" title="A selection is active" />}
                </button>
              ))}
            </nav>
          </div>
        )}
        </ErrorBoundary>
        </>
        )}
      </aside>
      {wallCatsOpen && map && (
        <Modal title="Wall categories" onClose={() => setWallCatsOpen(false)}>
          <WallCategories lib={map.lib} visibility={visibility} onChange={setVisibility} />
          <div className="modal-actions">
            <button className="btn primary" onClick={() => setWallCatsOpen(false)}>
              Done
            </button>
          </div>
        </Modal>
      )}
      {presetSave && map && (
        <SavePresetDialog
          clip={presetSave.clip}
          lib={map.lib}
          palette={map.palette}
          defaultName={presetSave.name}
          categories={[...new Set(presets.map((p) => p.category))].sort()}
          initial={presetParts}
          insideNote={visibility.popsInside}
          onSave={(p) => savePreset({ ...p, sourceMap: map.path })}
          onClose={() => setPresetSave(null)}
        />
      )}
      {presetBuilder && map && gd && <PresetBuilder source={map} gd={gd} categories={[...new Set(presets.map((p) => p.category))].sort()} onSave={savePreset} onClose={() => setPresetBuilder(false)} />}
      {commandsOpen && <CommandPalette commands={ribbonCommands(ribbonTabs)} onClose={() => setCommandsOpen(false)} />}
      {mapMenu && map && doc && scene && (
        <ContextMenu
          x={mapMenu.at[0]}
          y={mapMenu.at[1]}
          title={doc.inBounds(...mapMenu.cell) ? `Cell ${mapMenu.cell[0]}, ${mapMenu.cell[1]}` : 'Outside the map'}
          onClose={() => setMapMenu(null)}
          entries={mapMenuEntries(mapMenu)}
        />
      )}

      {dialog === 'new' && <NewMapDialog types={data.status === 'ready' ? data.gd.lvlTypes : []} defaults={prefs.newMap} onCreate={createMap} onClose={() => setDialog(null)} />}
      {shortenPaths && (
        <ShortenPathsDialog
          paths={shortenPaths}
          max={MAX_TILE_PATH}
          suggest={(rel) => suggestShortPath(rel, MAX_TILE_PATH)}
          onApply={moveTileFiles}
          onClose={() => setShortenPaths(null)}
        />
      )}
      {unsavedAsk && doc && (
        <UnsavedPrompt
          name={doc.path.split('/').pop() ?? 'this map'}
          dirty={doc.dirty}
          closing={unsavedAsk.closing}
          onChoose={(c) => {
            unsavedAsk.resolve(c);
            setUnsavedAsk(null);
          }}
        />
      )}
      {presetImport && (
        <Modal title={`Import presets from ${presetImport.name}`} onClose={() => setPresetImport(null)}>
          {(() => {
            const { plan } = presetImport;
            const cats = [...new Set(plan.presets.map((p) => p.category))];
            return (
              <>
                <p className="small">
                  {plan.presets.length
                    ? `${plan.presets.length} preset${plan.presets.length === 1 ? '' : 's'} to add, in ${cats.map((c) => `“${c}”`).join(', ')}.`
                    : 'Nothing new to add.'}
                  {plan.duplicates.length ? ` ${plan.duplicates.length} already here unchanged (skipped).` : ''}
                </p>
                {plan.presets.length > 0 && (
                  <ul className="small">
                    {plan.presets.slice(0, 12).map((p) => (
                      <li key={p.id}>
                        {p.name} <span className="muted">· {p.category} · {p.width}×{p.height}</span>
                      </li>
                    ))}
                    {plan.presets.length > 12 && <li className="muted">and {plan.presets.length - 12} more</li>}
                  </ul>
                )}
                {plan.dt1Writes.length > 0 && (
                  <p className="small">
                    Tile libraries written into your mod: {plan.dt1Writes.map((w) => w.path.replace(/^data\/global\/tiles\//i, '')).join(', ')}.
                  </p>
                )}
                {plan.same.length > 0 && <p className="small muted">Already in your mod exactly: {plan.same.join(', ')}.</p>}
                {plan.renamed.length > 0 && (
                  <p className="small warn-text">
                    A different file with the same name is already in your mod, so the package's copy is saved under a new name (the imported presets use it):{' '}
                    {plan.renamed.map((r) => `${r.from} → ${r.to}`).join(', ')}.
                  </p>
                )}
                {plan.problems.map((p) => (
                  <p key={p} className="small error-text">
                    {p}
                  </p>
                ))}
                <div className="modal-actions">
                  <button className="btn" onClick={() => setPresetImport(null)}>
                    Cancel
                  </button>
                  <button className="btn primary" disabled={!plan.presets.length || !canWrite} onClick={() => void applyPresetImport()}>
                    Import
                  </button>
                </div>
              </>
            );
          })()}
        </Modal>
      )}
      {prefsOpen && <PreferencesDialog prefs={prefs} onChange={setPrefs} notify={notify} onClose={() => setPrefsOpen(false)} />}
      {dialog === 'saveAs' && doc && <SaveAsDialog path={doc.path} onSave={saveAs} onClose={() => setDialog(null)} />}
      {dialog === 'resize' && doc && <ResizeDialog width={doc.ds1.width} height={doc.ds1.height} onResize={resize} onClose={() => setDialog(null)} />}
      {dialog === 'shortcuts' && <ShortcutsDialog bindings={keys.bindings} onBind={keys.bind} onReset={keys.reset} onClose={() => setDialog(null)} />}
      {dialog === 'about' && <AboutDialog onClose={() => setDialog(null)} />}
      {warpEdit !== null && warpTables && mapLevelId > 0 && (
        <WarpLinkDialog
          tables={warpTables}
          levelId={mapLevelId}
          vis={warpEdit}
          busy={warpBusy}
          initialTarget={warpInit?.target}
          onApply={(w) => void applyWarpLink(w)}
          onClose={() => {
            setWarpEdit(null);
            setWarpInit(null);
          }}
        />
      )}
      {importing?.kind === 'ds1' && (
        <ImportDs1Dialog
          file={importing}
          info={importing.info}
          needs={importing.needs}
          exists={(p) => !!data.gd.fs.locate(normalizePath(p))}
          readDt1={readImportDt1}
          busy={importBusy}
          pickDt1s={async (mode) => {
            const found = await importMany('dt1', mode);
            const out: ImportDt1File[] = [];
            for (const f of found) {
              const bytes = await f.read();
              out.push({ name: f.name, folder: f.folder, bytes, info: describeDt1(bytes) });
            }
            if (!found.length && mode === 'folders') notify('No .dt1 files were found there.');
            return out;
          }}
          onImport={(c) => void importDs1(c)}
          onClose={() => setImporting(null)}
        />
      )}
      {dialog === 'replace' && doc && map && (
        <ReplaceDialog
          doc={doc}
          lib={map.lib}
          palette={map.palette}
          activeLayer={activeLayer}
          selection={selection && !isSingleCell(selection) ? selection : null}
          from={replaceFrom}
          brush={brush ? { ...brush, orientation: brushOrientation(activeLayer, brush) } : null}
          onApply={(edits, label) => {
            if (doc.apply(edits, label)) {
              bump();
              notify(`${label}: ${edits.length} cell${edits.length === 1 ? '' : 's'} changed (Ctrl+Z to undo)`);
            }
          }}
          onShow={(cells) => {
            setMarks(cells);
            notify(`${cells.length} cells marked · Esc to clear`);
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'image' && doc && (
        <ExportImageDialog width={doc.ds1.width} height={doc.ds1.height} selection={selection && !isSingleCell(selection) ? selection : null} busy={exportingImage} overview={visibility.overview} onExport={(o) => void exportImage(o)} onClose={() => setDialog(null)} />
      )}
      {recoveryOffer && map && recoveryOffer.path.toLowerCase() === map.path.toLowerCase() && (
        <Modal title="Unsaved changes were kept" onClose={() => setRecoveryOffer(null)}>
          <p>
            <b>{map.path.split('/').pop()}</b> had changes that weren&apos;t saved, autosaved {new Date(recoveryOffer.time).toLocaleString()}. Restore them?
          </p>
          <p className="muted small">Restoring opens the autosaved version; nothing is written to your mod until you save. Discarding deletes the autosaved copy.</p>
          <div className="modal-actions">
            <button
              className="btn"
              onClick={() => {
                void deleteRecovery(recoveryOffer.path).then(() => listRecoveries().then(setRecoveries));
                setRecoveryOffer(null);
              }}
            >
              Discard them
            </button>
            <button className="btn primary" onClick={() => void restoreRecovery()}>
              Restore
            </button>
          </div>
        </Modal>
      )}
      {dialog === 'update' && <UpdateDialog initial={pendingUpdate} onClose={() => setDialog(null)} />}
      {pasteOffer && map && (
        <Modal title={pasteOffer.clashes.length && !pasteOffer.tiles ? 'Some tiles look different in this map' : 'These tiles need other tile libraries'} wide={pasteOffer.clashes.length > 0} onClose={() => { if (!presetImportBusy) setPasteOffer(null); }}>
          {pasteOffer.tiles > 0 && (
            <p className="small">
              {pasteOffer.tiles} of the tiles you&apos;re pasting aren&apos;t in this map&apos;s tile libraries, so they would show as missing here and in game.
            </p>
          )}
          {pasteOffer.clashes.length > 0 && (
            <div className="small">
              <p>
                {pasteOffer.clashes.length} tile number{pasteOffer.clashes.length === 1 ? '' : 's'} this map already has from another DT1 look different from the
                ones you&apos;re pasting. Choose which to use for each: the map&apos;s version keeps the number (nothing added); the pasted version goes into a
                small DT1 of its own under a new number, so the map&apos;s existing tiles keep their look.
                {pasteOffer.same.length > 0 && ` ${pasteOffer.same.length} other${pasteOffer.same.length === 1 ? ' matches' : 's match'} this map's tiles pixel for pixel and need${pasteOffer.same.length === 1 ? 's' : ''} nothing.`}
              </p>
              <p>
                For all:{' '}
                <button className="link" onClick={() => setPasteChoice(Object.fromEntries(pasteOffer.clashes.map((c) => [c.key, 'map' as const])))}>
                  map&apos;s versions
                </button>{' '}
                ·{' '}
                <button className="link" onClick={() => setPasteChoice(Object.fromEntries(pasteOffer.clashes.map((c) => [c.key, 'pasted' as const])))}>
                  pasted versions
                </button>
              </p>
              <div className="paste-clashes">
                {pasteOffer.clashes.map((c) => (
                  <div key={c.key} className="copies-pair">
                    <div className="small">
                      Tile {c.key.split('|').join('/')} · {c.cells} cell{c.cells === 1 ? '' : 's'}
                    </div>
                    {(['map', 'pasted'] as const).map((side) => (
                      <label key={side} className={`copies-side${pasteChoice[c.key] === side ? ' on' : ''}`}>
                        <span className="inline">
                          <input type="radio" name={`paste-${c.key}`} checked={pasteChoice[c.key] === side} onChange={() => setPasteChoice({ ...pasteChoice, [c.key]: side })} />
                          <span>{side === 'map' ? "This map's" : `Pasted (${c.from.split('/').pop()})`}</span>
                        </span>
                        <span className="copies-tiles">
                          {(side === 'map' ? c.ours : c.theirs).slice(0, 4).map((t, i) => (
                            <Thumb key={i} tile={t} palette={map.palette} />
                          ))}
                        </span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          {pasteOffer.different > 0 && !pasteOffer.clashes.length && (
            <p className="small">
              {pasteOffer.different} tile{pasteOffer.different === 1 ? '' : 's'} use numbers this map already has from a different DT1, so they would look like this
              map&apos;s tiles instead. Adding the DT1s makes both versions available (the game then picks between them at random for those numbers).
            </p>
          )}
          {pasteOffer.clashes.length ? null : pasteOffer.dt1s.length ? (
            <>
              <p className="small">They come from:</p>
              <ul className="small mono">
                {pasteOffer.dt1s.map((p) => (
                  <li key={p}>{p.replace(/^data\/global\/tiles\//i, '')}</li>
                ))}
              </ul>
              {pasteNameClashes.size > 0 && (
                <div className="imp-callout small">
                  <span>
                    <b>Same name as a DT1 this map already has.</b> Two tile libraries with one file name get mixed up (a DS1 lists its libraries by name), so
                    tiles can be drawn from the wrong one. Rename the pasted {pasteNameClashes.size === 1 ? 'one' : 'ones'} (a copy is saved next to it under
                    the new name and added instead):
                  </span>
                  {[...pasteNameClashes].map(([p, twin]) => {
                    const v = pasteRenames[p] ?? '';
                    const dir = p.slice(0, p.lastIndexOf('/') + 1);
                    const bad = !/^[A-Za-z0-9_-]+$/.test(v) ? 'letters, digits, - and _ only' : gd?.fs.locate(`${dir}${v}.dt1`) ? 'already exists' : null;
                    return (
                      <label key={p} className="form-row">
                        <span className="mono" title={`clashes with ${twin}`}>
                          {p.split('/').pop()} →
                        </span>
                        <span className="inline">
                          <input className="text-input mono" value={v} spellCheck={false} onKeyDown={(e) => e.stopPropagation()} onChange={(e) => setPasteRenames({ ...pasteRenames, [p]: e.target.value.trim() })} />
                          .dt1 {bad && <span className="error-text">{bad}</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              <p className="muted small">Adding them loads them for this map (and updates LvlTypes.txt / Dt1Mask when the map is in LvlPrest.txt).</p>
            </>
          ) : (
            <p className="muted small">The DT1s they came from aren&apos;t known (copied before this version, or built-in special tiles).</p>
          )}
          <div className="modal-actions">
            <button className="btn" disabled={presetImportBusy} onClick={() => setPasteOffer(null)}>
              Cancel
            </button>
            <button
              className="btn"
              disabled={presetImportBusy}
              onClick={() => {
                const o = pasteOffer;
                setPasteOffer(null);
                beginPaste(o.clip, o.label, true);
              }}
            >
              Paste anyway
            </button>
            {pasteOffer.clashes.length > 0 && (
              <button className="btn primary" disabled={presetImportBusy || (!canWrite && (pasteOffer.tiles > 0 || pasteOffer.clashes.some((c) => pasteChoice[c.key] !== 'map')))} onClick={() => void importPresetTiles()}>
                {presetImportBusy ? 'Preparing tiles…' : 'Paste with the chosen tiles'}
              </button>
            )}
            {pasteOffer.dt1s.length > 0 && !pasteOffer.clashes.length && (
              <button
                className="btn primary"
                disabled={presetImportBusy || !canWrite}
                onClick={async () => {
                  const o = pasteOffer;
                  // Renamed copies for the ones whose name is taken.
                  const add: string[] = [];
                  try {
                    for (const p of o.dt1s) {
                      const to = pasteNameClashes.has(p) ? `${p.slice(0, p.lastIndexOf('/') + 1)}${pasteRenames[p]}.dt1` : null;
                      if (!to) {
                        add.push(p);
                        continue;
                      }
                      if (!/^[A-Za-z0-9_-]+$/.test(pasteRenames[p] ?? '') || gd?.fs.locate(to)) throw new Error(`Choose another name for ${p.split('/').pop()}.`);
                      const bytes = await gd!.fs.read(p);
                      if (!bytes) throw new Error(`${p} was not found.`);
                      await writeFiles([{ path: to, bytes }]);
                      add.push(to);
                    }
                  } catch (e) {
                    return notify(errorMessage(e), true);
                  }
                  setPasteOffer(null);
                  await applyDt1s([...map.lib.loaded.filter((l) => l.found && !isBuiltinPath(l.path)).map((l) => l.path), ...add]);
                  if (add.length !== o.dt1s.length || add.some((a, i) => a !== o.dt1s[i])) notify(`Added ${add.map((a) => a.split('/').pop()).join(', ')}`);
                  beginPaste(o.clip, o.label, true);
                }}
              >
                {pasteNameClashes.size ? 'Rename, add and paste' : `Add ${pasteOffer.dt1s.length} DT1${pasteOffer.dt1s.length === 1 ? '' : 's'} and paste`}
              </button>
            )}
          </div>
          {!pasteOffer.clashes.length && (
            <>
              <p className="muted small">Create a small DT1 containing only the required tiles. Conflicting tile numbers are changed so existing map tiles keep their appearance.</p>
              <button className="btn primary" disabled={presetImportBusy || !canWrite} onClick={() => void importPresetTiles()}>{presetImportBusy ? 'Preparing tiles…' : 'Create DT1 from required tiles and place'}</button>
            </>
          )}
          {presetImportError && <p className="error-text" role="alert">{presetImportError}</p>}
        </Modal>
      )}
           {dialog === 'automap' && map && scene && automapKindOf && (automapData && automapLevel ? (
        <AutomapEditor
          map={map}
          scene={scene}
          kindOf={automapKindOf}
          style={automapStyle}
          onStyle={setAutomapStyle}
          table={automapData.table}
          cels={automapData.cels}
          palette={map.palette}
          level={automapLevel}
          onLevel={(level) => setAutomapLevelOverride({ path: map.path, level })}
          levelLabel={automapLevelLabel}
          canSave={canWrite}
          onSave={saveAutomapEdits}
          makeColors={makeAutomapColors}
          onClose={() => setDialog(null)}
        />
      ) : (
        <Modal title="Automap editor" onClose={() => setDialog(null)}>
          <p className="small">{automapData ? 'Pick the AutoMap.txt level for this map in the Automap panel first.' : 'Loading AutoMap.txt and MaxiMap.dc6…'}</p>
        </Modal>
      ))}
 {dialog === 'pops' && map && doc && (
        <PopsDialog
          kind={popsKind}
          map={map}
          areas={popAreas}
          preset={popPreset ? { pops: popPreset.pops, popPad: popPreset.popPad } : null}
          selection={selection}
          canSave={canWrite}
          onCreate={async (rect, targets, popPad) => {
            const plan = planPops(doc.ds1, rect, targets);
            if (plan.error) throw new Error(plan.error);
            doc.mutate((d) => applyPopPlan(d, rect, plan), `Add hide area (${plan.markers.map((m) => `#${m.target}`).join(', ')})`);
            bump();
            setVisibility((v) => ({ ...v, pops: true }));
            let note = '';
            if (popPreset) {
              // Never lower Pops: a LvlPrest row can list up to six maps (File1-6), and another may have more areas.
              const writes = await setPopSettings(data.gd.fs, map.path, Math.max(popPreset.pops, findPops(doc.ds1).length), popPad);
              if (writes.length) {
                await writeFiles(writes);
                await reloadTables();
                note = ` · ${writes.flatMap((w) => w.summary).join('; ')}`;
              }
            } else note = ' · Game → Add to game sets Pops for it';
            setDialog(null);
            notify(`Hide area added: ${plan.markers.length * 2} corner markers${note}. Save the map, then check it with View → As if inside.`);
          }}
          onRemove={async (areas: PopArea[]) => {
            doc.mutate((d) => removePops(d, areas), `Remove hide area ${areas.map((a) => a.main).join(', ')}`);
            bump();
          }}
          onSetTables={async (pops, popPad) => {
            const writes = await setPopSettings(data.gd.fs, map.path, pops, popPad);
            if (writes.length) {
              await writeFiles(writes);
              await reloadTables();
              notify(`Updated ${writes.flatMap((w) => w.summary).join('; ')}`);
            }
          }}
          onShow={(a) => {
            setSelection({ x0: a.x0, y0: a.y0, x1: a.x1, y1: a.y1 });
            setVisibility((v) => ({ ...v, pops: true }));
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'actsafe' && map && (
        <ActSafeDialog
          map={map}
          gd={data.gd}
          canSave={canWrite}
          onApply={async (files) => {
            await writeFiles(files);
            await reloadTables();
            setDialog(null);
            notify(`Converted ${files.length} DT1${files.length === 1 ? '' : 's'} to act-safe colours: ${files.map((f) => f.path.split('/').pop()).join(', ')} (originals kept as .bak)`);
          }}
          onRemove={async (paths) => {
            const drop = new Set(paths.map(normalizePath));
            await applyDt1s(map.lib.loaded.filter((l) => l.found && !isBuiltinPath(l.path) && !drop.has(normalizePath(l.path))).map((l) => l.path));
            setDialog(null);
          }}
          onChooseVersions={(items) => {
            setDialog(null);
            setChooseVersions(items);
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {clearingAutomap && <div className="modal-backdrop"><div className="modal" role="dialog" aria-label="Updating automap pieces"><p role="status">Updating selected automap pieces…</p></div></div>}
      {dialog === 'dt1edit' && (
        <Dt1Editor
          map={map}
          gd={data.gd}
          presets={[...presets, ...(suggested ?? [])]}
          selection={selection}
          canSave={canWrite}
          onSave={saveEditedDt1}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'dt1lib' && map && (
        <Dt1LibraryDialog
          map={map}
          gd={data.gd}
          usage={dt1Usage}
          onApply={(p, o) => void addLibraries(p, o?.toAct0 ?? [])}
          onMove={canWrite || !map.resolution.preset ? moveLibrary : null}
          onCreateCustom={canWrite ? createCustomDt1 : null}
          onImportFiles={canWrite ? (mode) => void pickImport('dt1', mode) : null}
          reveal={revealDt1}
          onClose={() => setDialog(null)}
        />
      )}
      {automapImport && data.status === 'ready' && (
        <AutomapImportDialog
          fileName={automapImport.fileName}
          source={automapImport.source}
          target={automapImport.target}
          types={data.gd.lvlTypes}
          mapType={map?.resolution.lvlType ?? null}
          busy={automapImportBusy}
          onImport={(bytes, summary) =>
            void (async () => {
              setAutomapImportBusy(true);
              try {
                await writeFiles([{ path: data.gd.fs.exactPath(AUTOMAP_TXT) ?? AUTOMAP_TXT, bytes }]);
                await reloadTables();
                setAutomapImport(null);
                notify(`${summary} (the old file is kept as .bak)`);
              } catch (e) {
                notify(errorMessage(e), true);
              } finally {
                setAutomapImportBusy(false);
              }
            })()
          }
          onClose={() => setAutomapImport(null)}
        />
      )}
      {/* After the library window, which it opens from, so it shows on top. */}
      {importing?.kind === 'dt1' && (
        <ImportDt1Dialog
          files={importing.files}
          exists={(p) => !!data.gd.fs.locate(normalizePath(p))}
          usedBy={(p) => data.gd.lvlTypes.filter((t) => t.files.some((f) => f && normalizePath(`data/global/tiles/${f}`) === normalizePath(p))).map((t) => `${t.id} ${t.name}`)}
          mapOpen={map?.path ?? null}
          freeSlots={map?.resolution.lvlType ? map.resolution.lvlType.files.filter((f) => !f).length : null}
          busy={importBusy}
          onImport={(c) => void importDt1(c)}
          onClose={() => setImporting(null)}
        />
      )}
      {(dialog === 'cleanup' || dialog === 'restore') && (map?.palette || cleanupPalette) && (
        <AssetCleanup gd={data.gd} map={map} palette={(map?.palette ?? cleanupPalette)!} initialRestore={dialog === 'restore'} onChanged={refreshAssets} onShowUses={path => void showLibraryUses(path)} onClose={() => setDialog(null)} />
      )}
      {dialog === 'floors' && map && doc && <FloorRerollDialog gd={data.gd} map={map} selection={selection} initialLayer={activeLayer.kind === 'floor' ? activeLayer.index : 0} onApply={applyFloorReroll} onClose={() => setDialog(null)} />}
      {dialog === 'water' && map && <WaterEditor gd={data.gd} map={map} canSave={canWrite} onSave={saveWater} onClose={() => setDialog(null)} />}
      {dialog === 'dt1s' && map && doc && (
        <MapDt1Review
          map={map}
          gd={data.gd}
          ds1={doc.ds1}
          usage={dt1Usage}
          modRoot={data.saveTarget?.label ?? null}
          onApply={(p) => void applyDt1s(p)}
          onShowCells={selectMapCells}
          onSelectLibrary={path => void showLibraryUses(path)}
          onDetach={detachLibrary}
          onRestore={() => openCleanup(true)}
          onRemoveTile={removeDt1Tile}
          onRename={renameDt1}
          onOpenLibrary={() => setDialog('dt1lib')}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'tables' && (
        <DataTables
          fs={data.gd.fs}
          initial={tableTarget}
          canSave={canWrite}
          onSave={async (path, bytes) => {
            await writeFiles([{ path, bytes }]);
            await reloadTables();
            return `Saved ${path.split('/').pop()} into ${data.saveTarget?.label}`;
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'lvltype' && doc && map && (
        <ChangeLevelTypeDialog
          fs={data.gd.fs}
          mapPath={data.gd.fs.exactPath(doc.path) ?? doc.path}
          levelId={map.resolution.preset?.levelId}
          usedDt1s={mapUsedDt1s}
          automapUsed={mapAutomapKinds}
          canWrite={canWrite}
          onApply={async (plan) => {
            await writeFiles(plan.writes);
            await reloadTables();
            notify(`Level ${plan.levelId} now uses level type ${plan.typeId}${plan.copied ? ' (a copy of its own)' : ''}. Updated ${plan.writes.map((w) => w.table).join(', ')} (old files kept as .bak). Checking the map…`);
            setTimeout(() => void runCheckRef.current(true), 800);
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'register' && doc && (
        <RegisterMapDialog
          fs={data.gd.fs}
          mapPath={data.gd.fs.exactPath(doc.path) ?? doc.path}
          width={doc.ds1.width}
          height={doc.ds1.height}
          usedDt1s={[
            ...[...dt1Usage.keys()].filter((p) => !isBuiltinPath(p)).map((p) => data.gd.fs.exactPath(p) ?? p),
            // The special-tile library stays with the map even before a special tile is placed (a map loading it keeps it).
            ...((map?.lib.loaded ?? []).some((l) => l.found && normalizePath(l.path) === normalizePath(SPECIAL_TILES_DT1)) && ![...dt1Usage.keys()].some((p) => normalizePath(p) === normalizePath(SPECIAL_TILES_DT1))
              ? [data.gd.fs.exactPath(SPECIAL_TILES_DT1) ?? SPECIAL_TILES_DT1]
              : []),
          ]}
          popCount={popAreas.length}
          arrival={arrivalProblem(doc.ds1, (type, id) => data.gd.isWaypoint(doc.ds1.act, type, id))}
          onCrop={() => {
            const p = arrivalProblem(doc.ds1, (type, id) => data.gd.isWaypoint(doc.ds1.act, type, id));
            if (p?.crop) {
              resize(p.crop);
              notify(`Map cropped to ${doc.ds1.width}×${doc.ds1.height} (Ctrl+Z to undo): its centre is on the map's floor now.`);
            }
          }}
          onPlaceWaypoint={(() => {
            const wp = data.gd.waypointFor(doc.ds1.act);
            return wp
              ? () => {
                  setDialog(null);
                  setTool('object');
                  setPlacing({ type: wp.type, id: wp.id });
                  notify(`Click the map where players should arrive to place the waypoint (${wp.name}) · then Game → Add to game again`);
                }
              : null;
          })()}
          onApply={async (writes) => {
            await applyTableWrites(writes);
            if (prefsRef.current.checkAfterAddToGame) setTimeout(() => void runCheckRef.current(true), 600);
          }}
          onFix={async (writes) => {
            await writeFiles(writes);
            await reloadTables();
            notify(`Updated ${writes.map((w) => `${w.table}: ${w.summary.join('; ')}`).join(' · ')} (the old file is kept as .bak)`);
          }}
          onClose={() => {
            setDialog(null);
            setRegisterInitial(undefined);
          }}
          initial={
            registerInitial ??
            (() => {
              const chosen = newMapTypes.current.get(normalizePath(doc.path));
              if (!chosen) return undefined;
              if (chosen.typeId === null) return { mode: 'new' as const, newType: true };
              return { mode: 'new' as const, levelId: data.gd.levelsOfType(chosen.typeId)[0], newType: false };
            })()
          }
        />
      )}
      {historyBusy && <div className="modal-backdrop" role="status" style={{ zIndex: 1000 }}><div className="modal">Updating history…</div></div>}
      {dialog === 'cube' && doc && (
        <CubeRecipeDialog
          fs={data.gd.fs}
          mapName={doc.path.split('/').pop()!.replace(/\.ds1$/i, '')}
          mapPath={doc.path}
          suggested={recipeSuggestion}
          onApply={applyTableWrites}
          onRemove={async (writes) => {
            try {
              await writeFiles(writes);
              await reloadTables();
              notify(`${writes.flatMap((w) => w.summary).join('; ')} (the old file is kept as .bak)`);
            } catch (e) {
              notify(errorMessage(e), true);
            }
          }}
          onAddToGame={() => setDialog('register')}
          onClose={() => {
            setRecipeSuggestion(null);
            setDialog(null);
          }}
        />
      )}
      {dialog === 'crashes' && <CrashLogDialog levelsWithEntry={levelsWithEntry} onCheck={map ? () => void runCheck() : null} onClose={() => setDialog(null)} />}
      {dialog === 'check' && (
        <CompatDialog
          results={checkResults}
          onRerun={() => void runCheck()}
          onShowCells={(cells) => {
            setMarks(cells);
            setDialog(null);
            notify(`${cells.length} cells marked · Esc to clear`);
          }}
          onFix={applyFix}
          onClose={() => setDialog(null)}
          accepted={acceptedChecks}
          onAccept={(r, accept) => {
            if (!map) return;
            const next = new Set(acceptedChecks);
            if (accept) next.add(resultKey(r));
            else next.delete(resultKey(r));
            setAcceptedResults(map.path, next);
            setAcceptedChecks(next);
            notify(accept ? 'Accepted as intended for this map: it no longer shows in the check (see Accepted)' : 'Shown in the check again');
          }}
        />
      )}
      {dialog === 'typepkg' && map?.resolution.lvlType && (
        <TypePackageDialog
          gd={data.gd}
          typeId={map.resolution.lvlType.id}
          canWrite={canWrite}
          onGather={async (plan) => {
            await writeFiles([...plan.copies.map((c) => ({ path: c.to, bytes: c.bytes })), { path: 'data/global/excel/LvlTypes.txt', bytes: serializeTxtTable(plan.types) }]);
            await reloadTables();
            notify(`Gathered ${plan.copies.length} tile libraries into one folder and pointed the level type at them (LvlTypes.txt; the old file kept as .bak). The originals are still there.`);
          }}
          onExport={(name, zip) => exportBytes(name, zip)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'customobj' && data.status === 'ready' && (
        <CustomObjectDialog
          gd={data.gd}
          act0={map?.ds1.act ?? 0}
          canWrite={canWrite}
          onCreate={async (r) => {
            await writeFiles(r.files);
            // An updated object is drawn again from its new files.
            clearSpriteAnimationCache();
            await reloadTables();
            setDialog(null);
            notify(`Saved “${r.name}” as Act ${r.act0 + 1} object id ${r.id}: place it from the Objects gallery (Objects tool, Act ${r.act0 + 1}).`);
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'entrytext' && entryTables && (
        <EntryTextDialog
          fs={data.gd.fs}
          levels={entryTables.levels}
          levelId={map?.resolution.preset?.levelId ?? 0}
          palette={entryTables.palette}
          canWrite={canWrite}
          onApply={async ({ levelId, entryFile, dc6 }) => {
            const levels = await loadTable(data.gd.fs, 'Levels.txt');
            const row = levels ? rowOfRecord(levels, levelId) : -1;
            if (!levels || row < 0) throw new Error(`Levels.txt has no level ${levelId}.`);
            const before = getCell(levels, row, 'EntryFile');
            await writeFiles([
              { path: `${ENTRY_IMAGE_DIR}${entryFile}.dc6`, bytes: dc6 },
              ...(before === entryFile ? [] : [{ path: 'data/global/excel/Levels.txt', bytes: serializeTxtTable(setCell(levels, row, 'EntryFile', entryFile)) }]),
            ]);
            await reloadTables();
            notify(`Saved ${ENTRY_IMAGE_DIR}${entryFile}.dc6${before === entryFile ? '' : ` and set level ${levelId}'s EntryFile (${before || 'empty'} → ${entryFile})`}. The game reads the .bin tables: rebuild them (-direct -txt) to see it.`);
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {typeFull && map && doc && (
        <LevelTypeFullDialog
          fs={data.gd.fs}
          mapPath={map.path}
          dt1s={doc.ds1.files.map(ds1FileToDt1Path).filter((p): p is string => !!p && !isBuiltinPath(p)).map((p) => data.gd.fs.exactPath(p) ?? p)}
          fallbackTypeId={map.resolution.lvlType?.id}
          reason={typeFull.reason}
          canWrite={canWrite}
          onFree={async (remove) => {
            const dt1s = doc.ds1.files.map(ds1FileToDt1Path).filter((p): p is string => !!p && !isBuiltinPath(p)).map((p) => data.gd.fs.exactPath(p) ?? p);
            const writes = planFreeSlots(await loadLevelTables(data.gd.fs), map.path, dt1s, remove, map.resolution.lvlType?.id);
            await writeFiles(writes);
            await reloadTables();
            notify(`Updated ${writes.map((w) => `${w.table}: ${w.summary.join('; ')}`).join(' · ')} (the old files are kept as .bak)`);
          }}
          onCombine={async (members, path) => {
            const dt1s = doc.ds1.files.map(ds1FileToDt1Path).filter((p): p is string => !!p && !isBuiltinPath(p)).map((p) => data.gd.fs.exactPath(p) ?? p);
            // The members' tiles in load order: the same pool of tiles the game builds from them.
            const records = [];
            for (const p of dt1s.filter((d) => members.includes(d))) records.push(...dt1Records(await data.gd.fs.readOrThrow(p)));
            const plan = planCombine(await loadLevelTables(data.gd.fs), map.path, dt1s, members, path, map.resolution.lvlType?.id);
            await writeFiles([{ path, bytes: buildDt1(records) }, ...plan.writes]);
            await applyDt1s(plan.dt1s, { keepOpen: true, label: 'Combine tile libraries' });
            notify(`Combined ${members.length} DT1s into ${path.split('/').pop()} (${records.length} tiles) and updated ${plan.writes.map((w) => w.table).join(', ')}. Save the map to keep its new library list.`);
          }}
          onOwnType={() => {
            setTypeFull(null);
            setDialog('lvltype');
          }}
          onClose={() => setTypeFull(null)}
        />
      )}
      {chooseVersions && map && (
        <ChooseVersionsDialog
          items={chooseVersions}
          lib={map.lib}
          palette={map.palette}
          onApply={async (drop) => {
            const writes: { path: string; bytes: Uint8Array }[] = [];
            for (const [path, gone] of drop) {
              const out = new Set(gone);
              const records = dt1Records(await data.gd.fs.readOrThrow(path));
              writes.push({ path, bytes: buildDt1(records.filter((_, i) => !out.has(i))) });
            }
            await writeFiles(writes);
            await reloadTables();
            const n = [...drop.values()].reduce((s, l) => s + l.length, 0);
            notify(`Removed ${n} wrong-coloured tile version${n === 1 ? '' : 's'} from ${writes.map((w) => w.path.split('/').pop()).join(', ')} (the old file is kept as .bak)`);
            setTimeout(() => void runCheckRef.current(), 300);
          }}
          onClose={() => setChooseVersions(null)}
        />
      )}
      {chooseCopies && map && (
        <ChooseCopiesDialog
          pairs={chooseCopies}
          lib={map.lib}
          palette={map.palette}
          onApply={async (remove) => {
            const drop = new Set(remove.map(normalizePath));
            await applyDt1s(map.lib.loaded.filter((l) => l.found && !isBuiltinPath(l.path) && !drop.has(normalizePath(l.path))).map((l) => l.path));
            notify(`Removed ${remove.map((r) => r.split('/').pop()).join(', ')} from this map (its tables updated)`);
            setTimeout(() => void runCheckRef.current(), 300);
          }}
          onClose={() => setChooseCopies(null)}
        />
      )}
      {dialog === 'export' && doc && (
        <ExportPackageDialog
          mapPath={doc.path}
          building={exportState.building}
          result={exportState.result}
          coverage={exportCoverage}
          onBuild={(n, b) => void exportPackage(n, b)}
          onDs1Only={() => {
            setDialog(null);
            void exportFile();
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'import' && importState && (
        <ImportPackageDialog pkg={importState.pkg} plan={importState.plan} canWrite={canWrite} onImport={finishImport} onClose={() => setDialog(null)} />
      )}

      <footer className="statusbar">
        {statusHint ? (
          <span className="status-hint" title={`Data: ${sourcesText}`}>
            {statusHint}
          </span>
        ) : (
          <span>{sourcesText}</span>
        )}
        <span className="spacer" />
        {map && doc && (
          <>
            <span>
              {TOOLS.find((t) => t.id === tool)!.label} · {layerLabel(activeLayer)}
            </span>
            <span>{hover ? `Cell ${hover.cellX}, ${hover.cellY}` : '—'}</span>
            <button
              className="link status-zoom"
              onClick={() => zoomBy(automapZoom ? '10' : '100')}
              title={automapZoom
                ? `Screen pixels per game pixel. Click (or ${kb['view.zoom100'] || 'a key set in Shortcuts'}) for exactly 10%, where the automap is pixel-perfect: one automap pixel per screen pixel, as in game.`
                : `Screen pixels per game pixel. Click (or ${kb['view.zoom100'] || 'a key set in Shortcuts'}) for 100%, where tiles look as sharp as in game.`}
            >
              {formatZoom(zoom * (window.devicePixelRatio || 1))}
            </button>
            <span>
              {map.ds1.width}×{map.ds1.height} · v{map.ds1.version} · Act {map.ds1.act + 1}
              {map.paletteAct !== map.ds1.act ? ` · ${PALETTE_NAMES[map.paletteAct]} palette` : ''}
            </span>
          </>
        )}
      </footer>
    </div>
  );
}

function SetupScreen({ state, onPick }: { state: Exclude<DataState, { status: 'ready' }>; onPick: (withMod: boolean) => void }) {
  return (
    <div className="setup">
      <div className="setup-card">
        <div className="brand big">
          <span className="brand-mark">◆</span> DS1 Studio
        </div>
        <p className="muted">A map preset viewer and editor for Diablo II (classic 1.13 / 1.14).</p>
        {state.status === 'connecting' && <p>Looking for game data…</p>}
        {state.status === 'loading' && <p>{state.message}</p>}
        {state.status === 'setup' && (
          <>
            {canPickFolders ? (
              <div className="setup-actions">
                <button className="btn primary" onClick={() => onPick(true)}>
                  Open mod folder + Diablo II folder
                </button>
                <button className="btn" onClick={() => onPick(false)}>
                  Diablo II folder only (view)
                </button>
              </div>
            ) : (
              <p>This browser can't open local folders. Use Chrome or Edge, or the desktop app.</p>
            )}
            <p className="muted small">
              The Diablo II folder needs d2data.mpq, d2exp.mpq and patch_d2.mpq. The mod folder may contain an extracted <code>data/</code>{' '}
              tree and/or mod MPQs; its files take priority, and saved maps are written into it. The Diablo II folder is never written to.
            </p>
            {state.error && <p className="error-text">{state.error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
