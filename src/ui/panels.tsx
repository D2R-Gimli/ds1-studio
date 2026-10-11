import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { decodeCell, isEmptyCell, withFields, type Ds1, type Ds1Object, type TileCell, type WallCell } from '../formats/ds1';
import { Orientation, type Dt1Tile } from '../formats/dt1';
import { PALETTE_NAMES } from '../formats/palette';
import { ColHelp, HelpTip } from './HelpTip';
import { Thumb } from './TilePalette';
import { SubtileEditor } from './TileSettings';
import { isBuiltinPath } from '../game/specialTiles';
import { decodeTile } from '../formats/dt1';
import type { Palette } from '../formats/palette';
import type { LevelLinks } from '../game/warps';
import type { Bindings } from './keybindings';
import { GameData } from '../game/GameData';
import { rectSize, selectionCount, type CellRect, type CellSelection } from '../game/clipboard';
import { layerKey, layerLabel, MapDocument, type Brush, type CellEdit, type LayerRef } from '../game/MapDocument';
import type { MapOverride, OpenMap } from '../game/openMap';
import type { Scene } from '../render/scene';
import type { HoverInfo } from './MapView';
import { ORIENTATION_NAMES, type Visibility } from './state';
import { wallCategory } from '../game/wallCategories';

/** Set by the side column's tabs: a panel there is the whole tab, so it is always open (no fold). */
export const PanelTabContext = createContext(false);

function Panel({ title, extra, children, defaultOpen = true }: { title: string; extra?: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [openState, setOpen] = useState(defaultOpen);
  const inTab = useContext(PanelTabContext);
  const open = inTab || openState;
  if (inTab)
    return (
      <section className="panel">
        <div className="panel-header static">
          <span>{title}</span>
          {extra && <span className="muted small">{extra}</span>}
        </div>
        <div className="panel-body">{children}</div>
      </section>
    );
  return (
    <section className="panel">
      <button className="panel-header" onClick={() => setOpen(!open)}>
        <span>
          <span className="chev">{open ? '▾' : '▸'}</span> {title}
        </span>
        {extra && <span className="muted small">{extra}</span>}
      </button>
      {open && <div className="panel-body">{children}</div>}
    </section>
  );
}

function Toggle({ label, checked, onChange, count, swatch, hotkey }: { label: string; checked: boolean; onChange: (v: boolean) => void; count?: number; swatch?: string; hotkey?: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {swatch && <span className="swatch" style={{ background: swatch }} />}
      <span className="toggle-label">{label}</span>
      {hotkey ? <kbd className="hotkey">{hotkey}</kbd> : null}
      {count !== undefined && <span className="muted small">{count}</span>}
    </label>
  );
}

export function LayersPanel({ map, scene, visibility: v, onChange, keys }: { map: OpenMap; scene: Scene; visibility: Visibility; onChange: (v: Visibility) => void; keys: Bindings }) {
  const { ds1 } = map;
  // One pass over the scene (it has every tile on the map), redone only when the scene or wall categories change.
  const counts = useMemo(() => {
    const byKind = new Map<string, number>();
    const walls = { upper: 0, lower: 0 };
    for (const i of scene.items) {
      byKind.set(i.kind, (byKind.get(i.kind) ?? 0) + 1);
      byKind.set(`${i.kind}:${i.layer}`, (byKind.get(`${i.kind}:${i.layer}`) ?? 0) + 1);
      if (i.kind === 'wall' || i.kind === 'lowerWall') {
        const c = wallCategory(i.tile.orientation, i.sourcePath, v.wallCategories);
        if (c === 'upper' || c === 'lower') walls[c]++;
      }
    }
    return { byKind, walls };
  }, [scene, v.wallCategories]);
  const count = (kind: string, layer?: number) => counts.byKind.get(layer === undefined ? kind : `${kind}:${layer}`) ?? 0;
  const wallCount = (category: 'upper' | 'lower') => counts.walls[category];
  const set = (patch: Partial<Visibility>) => onChange({ ...v, ...patch });
  const setIdx = (key: 'floors' | 'walls', i: number, val: boolean) => {
    const arr = [...v[key]];
    arr[i] = val;
    set({ [key]: arr });
  };
  const npcs = ds1.objects.filter((o) => o.type === 1).length;
  return (
    <Panel title="Layers">
      <div className="toggle-group">
        {ds1.floors.map((_, i) => (
          <Toggle key={`f${i}`} label={`Floor ${i + 1}`} hotkey={keys[(['layer.floor1', 'layer.floor2'] as const)[i]]} checked={v.floors[i]} onChange={(x) => setIdx('floors', i, x)} count={count('floor', i)} />
        ))}
        {/* Wall layers 1-4 always: one the map doesn't have yet is empty until something is put on it. */}
        {Array.from({ length: Math.max(4, ds1.walls.length) }, (_, i) => (
          <Toggle key={`w${i}`} label={`Wall ${i + 1}`} hotkey={keys[(['layer.wall1', 'layer.wall2', 'layer.wall3', 'layer.wall4'] as const)[i]]} checked={v.walls[i] ?? true} onChange={(x) => setIdx('walls', i, x)} count={count('wall', i) + count('roof', i) + count('lowerWall', i)} />
        ))}
        <Toggle label="Shadows" hotkey={keys['layer.shadows']} checked={v.shadows} onChange={(x) => set({ shadows: x })} count={count('shadow')} />
        <Toggle label="Roofs" hotkey={keys['layer.roofs']} checked={v.roofs} onChange={(x) => set({ roofs: x })} count={count('roof')} />
        <Toggle label="Upper walls" checked={v.upperWalls} onChange={(x) => set({ upperWalls: x })} count={wallCount('upper')} />
        <Toggle label="Lower walls" hotkey={keys['layer.lowerWalls']} checked={v.lowerWalls} onChange={(x) => set({ lowerWalls: x })} count={wallCount('lower')} />
      </div>
      <div className="toggle-group">
        <Toggle label="Object markers" hotkey={keys['view.markers']} swatch="rgb(240,80,80)" checked={v.objects} onChange={(x) => set({ objects: x })} count={npcs} />
        <Toggle label="Object sprites" hotkey={keys['view.sprites']} checked={v.sprites} onChange={(x) => set({ sprites: x })} />
        <Toggle label="NPC paths" hotkey={keys['view.paths']} swatch="rgb(255,150,60)" checked={v.paths} onChange={(x) => set({ paths: x })} count={ds1.objects.filter((o) => o.path.length).length} />
        <Toggle label="Special tiles" hotkey={keys['layer.specials']} swatch="rgb(200,140,255)" checked={v.specials} onChange={(x) => set({ specials: x })} />
        {ds1.groups.length > 0 && <Toggle label="Substitution groups" swatch="rgb(120,200,255)" checked={v.groups} onChange={(x) => set({ groups: x })} count={ds1.groups.length} />}
        <Toggle label="Missing tiles" swatch="rgb(255,70,90)" checked={v.missing} onChange={(x) => set({ missing: x })} count={scene.missing.length} />
        <Toggle label="Rooms (8×8)" hotkey={keys['view.rooms']} swatch="rgb(90,200,255)" checked={v.rooms} onChange={(x) => set({ rooms: x })} />
        <Toggle label="Grid" hotkey={keys['view.grid']} checked={v.grid} onChange={(x) => set({ grid: x })} />
        <Toggle label="Walkability" hotkey={keys['view.walkable']} swatch="linear-gradient(90deg, rgb(255,176,40) 50%, rgb(255,60,70) 50%)" checked={v.walkable} onChange={(x) => set({ walkable: x })} />
        <Toggle label="Walkable overview" swatch="linear-gradient(90deg, rgb(60,210,90) 50%, rgb(235,50,50) 50%)" checked={v.overview === 'walkable'} onChange={(x) => set({ overview: x ? 'walkable' : null })} />
        <Toggle label="Monster spawns" swatch="linear-gradient(90deg, rgb(60,210,90) 34%, rgb(70,150,255) 34% 67%, rgb(190,90,255) 67%)" checked={v.overview === 'spawn'} onChange={(x) => set({ overview: x ? 'spawn' : null })} />
        <Toggle label="Level light" swatch="linear-gradient(90deg, #2a2a2a, #d8c9a0)" checked={v.light} onChange={(x) => set({ light: x })} />
        <Toggle label={scene.animated ? 'Animate tiles' : 'Animate tiles (none on this map)'} hotkey={keys['view.animate']} checked={v.animate} onChange={(x) => set({ animate: x })} />
      </div>
      <p className="muted small">
        Objects (blue) share the monster toggle. Walkability: amber marks walking restrictions; red marks jump/flight barriers. Space/right-drag to pan,
        scroll to zoom, Shift+scroll to select an individual tile, F to fit.
      </p>
    </Panel>
  );
}

function hex(n: number): string {
  return n.toString(16).toUpperCase().padStart(2, '0');
}

/** Number input that commits on Enter/blur (one undo step per commit, not per keystroke). */
function NumField({ value, min, max, onCommit, hexMode = false, width = 44, disabled = false }: { value: number; min: number; max: number; onCommit: (v: number) => void; hexMode?: boolean; width?: number | '100%'; disabled?: boolean }) {
  const shown = hexMode ? hex(value) : String(value);
  const [text, setText] = useState(shown);
  const [editing, setEditing] = useState(false);
  const commit = () => {
    setEditing(false);
    const v = hexMode ? parseInt(text, 16) : Number(text);
    if (Number.isFinite(v) && v >= min && v <= max && v !== value) onCommit(v);
    else setText(shown);
  };
  return (
    <input
      className="num-field mono"
      style={{ width }}
      disabled={disabled}
      value={editing ? text : shown}
      onFocus={(e) => {
        setText(shown);
        setEditing(true);
        e.target.select();
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setText(shown);
          setEditing(false);
          (e.target as HTMLInputElement).blur();
        }
        e.stopPropagation();
      }}
    />
  );
}

interface CellPanelProps {
  map: OpenMap;
  doc: MapDocument;
  cell: HoverInfo | null;
  /** True when one cell is selected: fields become editable. */
  editable: boolean;
  /** Changes whenever the document changes, so the panel re-reads cells. */
  revision: number;
  onEdit: (edits: CellEdit[]) => void;
  /** Structural edit (tag values). */
  onMutate: (fn: (ds1: Ds1) => void) => void;
  scene: Scene;
  /** Reveal a tile in the Tiles panel. */
  onFocusTile: (tile: Dt1Tile, layer: LayerRef) => void;
  /** The one layer chosen out of a stack with Shift+wheel (copy/cut/delete only touch it). */
  onlyLayer?: LayerRef | null;
  /** The paint brush, offered for filling an empty layer. */
  brush?: Brush | null;
  /** Editing the sub-tile flags of the tiles in the cell (they belong to the DT1, so saving writes the DT1). */
  tileFlags?: TileFlagsControl;
  /** Where this map's warps lead (Levels.txt), for warp special tiles. */
  warps?: WarpControl;
}

export interface WarpControl {
  /** The map's level and its links; null when the map isn't tied to a level (not in LvlPrest). */
  links: LevelLinks | null;
  onOpen: (path: string) => void;
  onEdit: (vis: number) => void;
}

/** A warp tile's destination: the level its link leads to, how, and that level's maps. */
function WarpInfo({ vis, control }: { vis: number; control: WarpControl }) {
  if (!control.links)
    return (
      <div className="cell-warp">
        <p className="small muted">
          This map isn&apos;t tied to a level (no LvlPrest row with a LevelId), so its warps don&apos;t lead anywhere yet. Add it to the game first (Game → Add to game).
        </p>
      </div>
    );
  const link = control.links.links[vis];
  return (
    <div className="cell-warp">
      <div className="small">
        <b>Warp link {vis}</b> of {control.links.level.name} <HelpTip text={`A warp tile with main index ${vis} uses link ${vis} of its level: Levels.txt column Vis${vis} says which level it leads to, Warp${vis} which kind of warp it is (LvlWarp.txt: stairs, cave entrance…).`} />
      </div>
      {link ? (
        <>
          <div className="small">
            Leads to <b>{link.target.name}</b> <span className="muted">(level {link.target.id})</span>
            {link.warp && <span className="muted"> · {link.warp.name}</span>}
          </div>
          {link.target.maps.length ? (
            <div className="cell-warp-maps">
              {link.target.maps.slice(0, 6).map((p) => (
                <button key={p} className="btn small" onClick={() => control.onOpen(p)} title={`Open ${p}`}>
                  Open {p.split('/').pop()}
                </button>
              ))}
              {link.target.maps.length > 6 && <span className="muted small">+{link.target.maps.length - 6} more</span>}
            </div>
          ) : (
            <div className="small muted">That level is built at random by the game (no preset map to open).</div>
          )}
        </>
      ) : (
        <div className="small warn-text">Link {vis} isn&apos;t set: this warp leads nowhere in game.</div>
      )}
      <button className="link small" onClick={() => control.onEdit(vis)}>
        {link ? 'Change where it leads…' : 'Connect it to a level…'}
      </button>
    </div>
  );
}

export interface TileFlagsControl {
  /** Tiles with unsaved flag changes. */
  pending: number;
  edited: (tile: Dt1Tile) => boolean;
  onEdit: (tiles: Dt1Tile[], fn: (current: Uint8Array) => Uint8Array) => void;
  onSave: () => void;
  onDiscard: () => void;
  canSave: boolean;
  saving: boolean;
  walkabilityShown: boolean;
  onShowWalkability: () => void;
}

/** The clickable 5×5 sub-tile flags of the tile drawn in a cell, optionally for all its random variants. */
function CellSubtiles({ tile, variants, palette, control, source }: { tile: Dt1Tile; variants: Dt1Tile[]; palette: Palette; control: TileFlagsControl; source: string }) {
  const [all, setAll] = useState(true);
  const [open, setOpen] = useState(true);
  const image = useMemo(() => decodeTile(tile), [tile]);
  const targets = all ? variants : [tile];
  const edited = targets.some(control.edited);
  return (
    <div className="cell-flags">
      <button className="cell-flags-head" onClick={() => setOpen(!open)}>
        <span className="chev">{open ? '▾' : '▸'}</span> Sub-tile flags (walkability){edited && <span className="badge">edited</span>}
      </button>
      {open && (
        <>
          <SubtileEditor tiles={[{ index: 0, tile, image }]} palette={palette} flagsOf={() => tile.subTileFlags} onFlags={(fn) => control.onEdit(targets, fn)} maxSize={260} />
          {variants.length > 1 && (
            <label className="small">
              <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> change all {variants.length} variants of {tile.mainIndex}/{tile.subIndex}{' '}
              <HelpTip text="Cells with these numbers show one of several variant tiles, picked at random by the game. Changing them all keeps the walkability the same whichever one it picks." />
            </label>
          )}
          <p className="muted tiny-note">
            These flags belong to the tile in {source}: every cell and map using it changes too. Save writes the DT1 into your mod.
            {!control.walkabilityShown && (
              <>
                {' '}
                <button className="link" onClick={control.onShowWalkability}>
                  Show walkability on the map
                </button>
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
}

/** Plain-language explanations of every field of a DS1 cell (shown on the "?" next to each). */
export const CELL_HELP = {
  kind: 'What kind of wall-layer tile this cell asks for: a left/right wall, corner, door, pillar/tree, roof, lower wall or a special marker. Together with main and sub index it picks the tile from the level’s DT1s.',
  main: 'First part of the tile’s number (0-63). The cell asks for “kind + main + sub” and the game draws the DT1 tile with those numbers.',
  sub: 'Second part of the tile’s number (0-255).',
  prop1:
    'The cell’s first property byte. 00 means the layer is empty here; any other value means a tile is present. The game’s own presets use C2 for floors, 81 for walls and 80 for shadows, and DS1 Studio uses the same for new tiles.',
  hidden: 'Hidden tiles stay in the map but the game doesn’t draw them (bit 0x80 of the fourth byte).',
  raw: 'All four property bytes exactly as stored in the DS1 (prop1 prop2 prop3 prop4, in hex). Main index, sub index and “hidden” are packed into them; the remaining bits have no known use and are kept as they are. Edit here to set every bit by hand.',
  tag: 'The cell’s value in the tag layer (only maps with a tag layer have one): substitution groups use it to mark areas the game may swap for variations.',
} as const;

const byteHex = (c: TileCell) => [c.prop1, c.prop2, c.prop3, c.prop4].map(hex).join(' ');

/** A field with a label and an explanation, laid out like the DT1 editor's tile settings. */
function CellField({ label, help, children }: { label: string; help: string; children: ReactNode }) {
  return (
    <label className="ts-field cell-field">
      <span>
        {label} <HelpTip text={help} />
      </span>
      <span className="cell-field-input">{children}</span>
    </label>
  );
}

/** The four property bytes as editable hex ("C2 00 00 00"). */
function RawBytes({ cell, onCommit }: { cell: TileCell; onCommit: (c: TileCell) => void }) {
  const shown = byteHex(cell);
  const [text, setText] = useState<string | null>(null);
  const commit = () => {
    if (text === null) return;
    const bytes = text.trim().split(/[\s,]+/).map((b) => parseInt(b, 16));
    setText(null);
    if (bytes.length !== 4 || bytes.some((b) => !Number.isInteger(b) || b < 0 || b > 255)) return;
    const next = decodeCell((bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) >>> 0);
    if (byteHex(next) !== shown) onCommit(next);
  };
  return (
    <input
      className="num-field mono"
      style={{ width: '100%' }}
      value={text ?? shown}
      onFocus={(e) => {
        setText(shown);
        e.target.select();
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setText(null);
          (e.target as HTMLInputElement).blur();
        }
        e.stopPropagation();
      }}
    />
  );
}

/** The tile actually drawn for a layer of a cell (the chosen variant), if any. */
function drawnTile(scene: Scene, layer: LayerRef, x: number, y: number): Dt1Tile | null {
  const kinds = layer.kind === 'floor' ? ['floor'] : layer.kind === 'shadow' ? ['shadow'] : ['wall', 'roof', 'lowerWall', 'special'];
  return scene.items.find((it) => it.cellX === x && it.cellY === y && it.layer === layer.index && kinds.includes(it.kind))?.tile ?? null;
}

/** Shows every layer of one cell; editable when that cell is selected. */
export function CellPanel({ map, doc, cell, editable, onEdit, onMutate, scene, onFocusTile, onlyLayer, brush, tileFlags, warps }: CellPanelProps) {
  const { ds1, lib } = map;
  if (!cell) {
    return (
      <Panel title="Cell">
        <p className="muted small">Hover a cell to inspect it; click one with Select (V) to edit it.</p>
      </Panel>
    );
  }
  const { cellX: x, cellY: y } = cell;
  const i = y * ds1.width + x;
  const found = (o: number, c: TileCell) =>
    o === Orientation.SpecialTile1 || o === Orientation.SpecialTile2 || lib.variants(o, c.mainIndex, c.subIndex).length > 0 || (o === Orientation.Floor && c.mainIndex >= 30);

  const rows = doc.editableLayers().map((layer) => {
    const c = doc.cell(layer, x, y);
    const orientation = layer.kind === 'wall' ? (c as WallCell).orientation : layer.kind === 'floor' ? Orientation.Floor : Orientation.Shadow;
    const empty = isEmptyCell(c);
    const set = (next: TileCell | WallCell) => onEdit([{ layer, x, y, cell: next }]);
    /** Moves this cell's tile to another layer of its kind, swapping with the tile there (one undo step). */
    const moveTo = (index: number) => {
      const target = { ...layer, index };
      onEdit([
        { layer, x, y, cell: doc.cell(target, x, y) },
        { layer: target, x, y, cell: c },
      ]);
    };
    const label = layerLabel(layer);
    const drawn = empty ? null : drawnTile(scene, layer, x, y);
    const src = drawn && lib.sourceOf(drawn);
    const source = src && (
      <button className="link mono tile-src" title="Show this tile in its DT1 (Tiles panel)" onClick={() => onFocusTile(drawn, layer)}>
        {src.path.replace(/^data\/global\/tiles\//i, '')} #{src.index}
      </button>
    );
    if (!editable) {
      if (empty) return null;
      return (
        <tr key={layerKey(layer)}>
          <td className="muted">{label}</td>
          <td>
            <code>
              {c.mainIndex}/{c.subIndex}
            </code>
            {layer.kind === 'wall' && <span className="muted"> · {ORIENTATION_NAMES[orientation] ?? `o${orientation}`}</span>}
            {c.hidden && <span className="badge">hidden</span>}
            {!found(orientation, c) && <span className="badge error">missing</span>}
            {source}
          </td>
          <td className="muted mono small">{hex(c.prop1) + hex(c.prop2) + hex(c.prop3) + hex(c.prop4)}</td>
        </tr>
      );
    }
    const focused = !!onlyLayer && layerKey(onlyLayer) === layerKey(layer);
    if (empty) {
      // Empty layers stay one line; "Add" puts the brush here (or tile 0/0 to start from).
      const fits = brush && (layer.kind === 'floor' ? brush.orientation === Orientation.Floor : layer.kind === 'shadow' ? brush.orientation === Orientation.Shadow : brush.orientation !== Orientation.Floor && brush.orientation !== Orientation.Shadow);
      const add = () => set(MapDocument.painted(layer, c, fits ? brush! : { orientation: layer.kind === 'wall' ? 1 : orientation, main: 0, sub: 0 }));
      return (
        <div key={layerKey(layer)} className={`cell-card empty${focused ? ' focus' : ''}`}>
          <span className="muted">{label}</span>
          <span className="muted small">empty</span>
          <button className="btn small" onClick={add} title={fits ? `Put the brush tile (${brush!.main}/${brush!.sub}) here` : 'Put a tile here (0/0), then set its numbers'}>
            {fits ? `Add ${brush!.main}/${brush!.sub}` : 'Add'}
          </button>
        </div>
      );
    }
    const special = orientation === Orientation.SpecialTile1 || orientation === Orientation.SpecialTile2;
    return (
      <div key={layerKey(layer)} className={`cell-card${focused ? ' focus' : ''}`}>
        <div className="cell-card-head">
          <div className="cell-thumb">{drawn ? <Thumb tile={drawn} palette={map.palette} /> : <span className="muted small">{special ? 'marker' : 'no image'}</span>}</div>
          <div className="cell-card-title">
            <b>{label}</b>
            <span className="muted small">
              {c.mainIndex}/{c.subIndex} · {ORIENTATION_NAMES[orientation] ?? `kind ${orientation}`}
            </span>
            <span>
              {c.hidden && <span className="badge">hidden</span>}
              {!found(orientation, c) && <span className="badge error">missing</span>}
            </span>
            {source}
          </div>
          {layer.kind !== 'shadow' && (
            <>
              <button className="icon-btn" disabled={layer.index === 0} title={`Move this tile up a layer, to ${layerLabel({ ...layer, index: layer.index - 1 })} (swaps with the tile there): lower layers are drawn first, behind`} onClick={() => moveTo(layer.index - 1)}>
                ↑
              </button>
              <button className="icon-btn" disabled={layer.index >= (layer.kind === 'wall' ? 3 : 1)} title={layer.index >= (layer.kind === 'wall' ? 3 : 1) ? 'Already on the last layer' : `Move this tile down a layer, to ${layerLabel({ ...layer, index: layer.index + 1 })} (swaps with the tile there): higher layers are drawn later, in front`} onClick={() => moveTo(layer.index + 1)}>
                ↓
              </button>
            </>
          )}
          <button className="icon-btn" title="Clear this layer here" onClick={() => set(MapDocument.painted(layer, c, null))}>
            ×
          </button>
        </div>
        <details className="cell-card-details">
          <summary className="small muted">
            Details{(c.prop3 & 0x02) !== 0 && <span className="badge">unwalkable cell</span>}
          </summary>
        <div className="ts-fields">
          {layer.kind === 'wall' && (
            <CellField label="Kind (orientation)" help={CELL_HELP.kind}>
              <select value={orientation} onChange={(e) => set({ ...(c as WallCell), orientation: Number(e.target.value) })}>
                <option value={0}>0 · (none)</option>
                {Object.entries(ORIENTATION_NAMES)
                  .filter(([o]) => Number(o) !== Orientation.Floor && Number(o) !== Orientation.Shadow)
                  .map(([o, name]) => (
                    <option key={o} value={o}>
                      {o} · {name}
                    </option>
                  ))}
              </select>
            </CellField>
          )}
          <CellField label="Main index" help={CELL_HELP.main}>
            <NumField width="100%" value={c.mainIndex} min={0} max={63} onCommit={(v) => set(withFields(c, { main: v }))} />
          </CellField>
          <CellField label="Sub index" help={CELL_HELP.sub}>
            <NumField width="100%" value={c.subIndex} min={0} max={255} onCommit={(v) => set(withFields(c, { sub: v }))} />
          </CellField>
          <CellField label="Present (prop1)" help={CELL_HELP.prop1}>
            <NumField width="100%" value={c.prop1} min={0} max={255} hexMode onCommit={(v) => set(withFields(c, { prop1: v }))} />
          </CellField>
          <CellField label="Hidden in game" help={CELL_HELP.hidden}>
            <input type="checkbox" checked={c.hidden} onChange={(e) => set(withFields(c, { hidden: e.target.checked }))} />
          </CellField>
          <CellField label="Unwalkable cell (flag)" help="The map’s whole-cell flag on this tile (bit 17, as WinDS1’s Ctrl+Shift+right-click sets): the game blocks walking on the whole cell. Only this cell, no tile file. Ctrl+Shift+right-click the map toggles it too.">
            <input type="checkbox" checked={(c.prop3 & 0x02) !== 0} onChange={(e) => set({ ...c, prop3: e.target.checked ? c.prop3 | 0x02 : c.prop3 & ~0x02 } as TileCell)} />
          </CellField>
          <CellField label="Raw bytes" help={CELL_HELP.raw}>
            <RawBytes cell={c} onCommit={(next) => set(layer.kind === 'wall' ? { ...(c as WallCell), ...next } : next)} />
          </CellField>
        </div>
        {special && warps && c.mainIndex <= 7 && <WarpInfo vis={c.mainIndex} control={warps} />}
        {tileFlags && drawn && src && !isBuiltinPath(src.path) && (
          <CellSubtiles
            tile={drawn}
            variants={lib.variants(drawn.orientation, drawn.mainIndex, drawn.subIndex)}
            palette={map.palette}
            control={tileFlags}
            source={src.path.replace(/^data\/global\/tiles\//i, '')}
          />
        )}
        </details>
      </div>
    );
  });

  const objs = ds1.objects.filter((o) => Math.floor(o.x / 5) === x && Math.floor(o.y / 5) === y);
  const tag = ds1.tags[0]?.[i];
  const visible = rows.filter(Boolean);
  return (
    <Panel title={editable ? 'Cell · editing' : 'Cell'} extra={`${x}, ${y}`}>
      {editable && onlyLayer && (
        <p className="small accent-text">
          Only {layerLabel(onlyLayer)} is selected: copy, cut and Delete leave the other layers alone. Shift+wheel steps through the stacked tiles, Esc
          selects all layers again.
        </p>
      )}
      {editable && !onlyLayer && <p className="small accent-text">All visible tiles in this cell are selected. Shift+scroll selects an individual tile; a normal click selects the combined cell again.</p>}
      {editable && tileFlags && tileFlags.pending > 0 && (
        <div className="cell-flags-bar">
          <span className="small">
            Sub-tile changes to <b>{tileFlags.pending}</b> tile{tileFlags.pending === 1 ? '' : 's'}, not saved
          </span>
          <button className="btn small" onClick={tileFlags.onDiscard} disabled={tileFlags.saving}>
            Discard
          </button>
          <button className="btn small primary" onClick={tileFlags.onSave} disabled={!tileFlags.canSave || tileFlags.saving} title={tileFlags.canSave ? 'Write the changed DT1s into your mod folder (the old file is kept as .bak)' : 'No writable mod folder'}>
            {tileFlags.saving ? 'Saving…' : 'Save DT1s to mod'}
          </button>
        </div>
      )}
      {editable ? (
        <div className="cell-cards">{visible}</div>
      ) : visible.length ? (
        <table className="kv">
          <tbody>{visible}</tbody>
        </table>
      ) : (
        <p className="muted small">Empty cell.</p>
      )}
      {editable && <p className="muted tiny-note">Hover the ? for what each field does. Enter applies a number; every change is one undo step.</p>}
      {tag !== undefined && editable ? (
        <div className="ts-fields">
          <CellField label="Tag value" help={CELL_HELP.tag}>
            <NumField
              width="100%"
              value={tag}
              min={0}
              max={0xffffffff}
              onCommit={(v) =>
                onMutate((d) => {
                  d.tags[0][i] = v;
                })
              }
            />
          </CellField>
        </div>
      ) : (
        tag !== undefined &&
        tag !== 0 && (
          <p className="small">
            Tag: <code>{tag}</code>
          </p>
        )
      )}
      {objs.map((o, n) => (
        <p key={n} className="small">
          {o.type === 1 ? 'Monster/NPC' : 'Object'} <code>#{o.id}</code> at sub-tile ({o.x}, {o.y}){o.path.length ? ` · path of ${o.path.length}` : ''}
          {o.flags ? ` · flags ${o.flags}` : ''}
        </p>
      ))}
    </Panel>
  );
}

interface SelectionPanelProps {
  selection: CellSelection;
  activeLayer: LayerRef;
  brush: Brush | null;
  canPaste: boolean;
  onFill: () => void;
  onClear: (allLayers: boolean) => void;
  onCopy: (cut: boolean) => void;
  onPaste: () => void;
  onDeselect: () => void;
  onReroll: () => void;
  onReplace: () => void;
  /** Makes the selected cells unwalkable (or walkable again) with the map's whole-cell flag. */
  onUnwalkable: (on: boolean) => void;
  /** Objects and NPCs standing in the selection (they move with Cut / Paste). */
  objectCount: number;
  /** Set when one tile of a stack was chosen (Shift+wheel): copy/cut only take that layer. */
  onlyLayer?: LayerRef | null;
}

export function SelectionPanel({ selection, activeLayer, brush, canPaste, onFill, onClear, onCopy, onPaste, onDeselect, onReroll, onReplace, onUnwalkable, objectCount, onlyLayer }: SelectionPanelProps) {
  const [w, h] = rectSize(selection);
  const shape = selection.cells ? `${selectionCount(selection)} cells in ${w} × ${h}` : `${w} × ${h}`;
  const what = onlyLayer ? layerLabel(onlyLayer) : `all tile layers${objectCount ? ` and ${objectCount} object${objectCount === 1 ? '' : 's'}` : ''}`;
  return (
    <Panel title="Selection" extra={`${shape} · from ${selection.x0}, ${selection.y0}`}>
      {onlyLayer && <p className="small accent-text">Only {layerLabel(onlyLayer)} (Shift+wheel to step through the stacked tiles, Esc for all layers)</p>}
      <div className="button-grid">
        <button className="btn" disabled={!brush} onClick={onFill} title="Fill the selection with the brush tile on the active layer">
          Fill {layerLabel(activeLayer)}
        </button>
        <button className="btn" onClick={() => onClear(false)} title="Clear the selected visible tiles (Delete); Shift+wheel limits this to one layer">
          Clear {onlyLayer ? layerLabel(onlyLayer) : 'selected tiles'}
        </button>
        <button className="btn" onClick={() => onClear(true)} title="Clear every tile layer in the selection, and the objects and NPCs in it (Shift+Delete)">
          Clear everything
        </button>
        <button className="btn" onClick={() => onCopy(false)} title={`Copy ${what} (Ctrl+C)`}>
          Copy
        </button>
        <button className="btn" onClick={() => onCopy(true)} title={`Cut ${what} (Ctrl+X); paste to move`}>
          Cut
        </button>
        <button className="btn" disabled={!canPaste} onClick={onPaste} title="Paste; click on the map to place it (Ctrl+V)">
          Paste
        </button>
        <button className="btn" onClick={onReroll} title={activeLayer.kind === 'floor' ? 'Choose floor tiles from any library and reroll the selected cells' : `Mix up ${layerLabel(activeLayer)} using variants already present in the selection`}>
          Re-roll {layerLabel(activeLayer)}
        </button>
        <button className="btn" onClick={onReplace} title="Swap one tile for another in the selection or the whole map">
          Find &amp; replace…
        </button>
        <button className="btn" onClick={() => onUnwalkable(true)} title="Block walking on the selected cells with the map’s whole-cell flag (on Floor 1), as WinDS1 does: only these cells change, no tile file, and it works whatever floor layers they use. Ctrl+Shift+right-click toggles one cell.">
          Make unwalkable
        </button>
        <button className="btn" onClick={() => onUnwalkable(false)} title="Clear the whole-cell unwalkable flag from the selected cells (tiles' own walkability flags stay)">
          Walkable again
        </button>
      </div>
      <p className="muted small">
        Empty cells paste as transparent. Move = Cut, then Paste{objectCount ? ` (the ${objectCount} object${objectCount === 1 ? '' : 's'} here move too)` : ''}. <button className="link" onClick={onDeselect}>Deselect (Esc)</button>
      </p>
    </Panel>
  );
}

/** The open map's level light (Levels.txt), for the Map panel. */
export interface LevelLight {
  levelId: number;
  name: string;
  /** 0 = the act's own daylight (towns and outdoor levels); else a fixed light level 1-255. */
  intensity: number;
  rgb: [number, number, number];
}

/** Levels.txt light as a colour multiplier (null = daylight, drawn as stored). */
export function lightMultiplier(l: LevelLight | null): [number, number, number] | null {
  if (!l || !l.intensity) return null;
  return l.rgb.map((c) => (l.intensity / 255) * (c / 255)) as [number, number, number];
}

const toHex = (rgb: [number, number, number]) => `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
const fromHex = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];

/** The level's light: how bright and what colour the game lights it, previewable on the map and editable. */
export function LevelLightEditor({ light, shown, canWrite, onShow, onApply, onDraft, playerLight, onPlayerLight }: { light: LevelLight; shown: boolean; canWrite: boolean; onShow?: (on: boolean) => void; onApply: (intensity: number, rgb: [number, number, number]) => Promise<void>; onDraft: (d: LevelLight | null) => void; playerLight: number; onPlayerLight: (r: number) => void }) {
  const [intensity, setIntensity] = useState(light.intensity);
  const [rgb, setRgb] = useState(light.rgb);
  const [busy, setBusy] = useState(false);
  const key = `${light.levelId}:${light.intensity}:${light.rgb.join(',')}`;
  const [seen, setSeen] = useState(key);
  if (seen !== key) {
    // Reloaded from the tables (another map, or just applied): start from them again.
    setSeen(key);
    setIntensity(light.intensity);
    setRgb(light.rgb);
  }
  const changed = intensity !== light.intensity || rgb.some((c, i) => c !== light.rgb[i]);
  /**
   * A level lit by the act's daylight (Intensity 0) usually stores colour 0,0,0; a fixed light with that colour would
   * be black, so leaving daylight starts from white light.
   */
  const pickIntensity = (v: number) => {
    if (v > 0 && intensity === 0 && rgb.every((c) => c === 0)) setRgb([255, 255, 255]);
    setIntensity(v);
  };
  // Values being tried out (not applied yet) show on the map while previewing.
  useEffect(() => onDraft(changed ? { ...light, intensity, rgb } : null), [changed, intensity, rgb.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => onDraft(null), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="level-light">
      <div className="field-label">
        <span>
          Level light <HelpTip text="How brightly the game lights this level (Levels.txt Intensity, 1-255) and in what colour (Red/Green/Blue). 0 means the act's own daylight, as towns and outdoor levels use. In game the player's own light radius also brightens the area around them, so the preview is how the level looks away from the player." />
        </span>
        <span className="muted small">level {light.levelId}</span>
      </div>
      {onShow && (
        <label className="mini-check">
          <input type="checkbox" checked={shown} onChange={(e) => onShow(e.target.checked)} /> Preview on the map
        </label>
      )}
      <div className="light-row">
        <span className="small">Intensity</span>
        <input type="range" min={0} max={255} value={intensity} onChange={(e) => pickIntensity(Number(e.target.value))} aria-label="Light intensity" />
        <input
          className="light-num mono"
          type="number"
          min={0}
          max={255}
          value={intensity}
          onChange={(e) => pickIntensity(Math.max(0, Math.min(255, Math.round(Number(e.target.value) || 0))))}
          onKeyDown={(e) => e.stopPropagation()}
          aria-label="Light intensity (0-255)"
        />
        <span className="small mono">{intensity ? '' : 'daylight'}</span>
      </div>
      <div className="light-row" title="While previewing, the area around the mouse is lit as if a player stood there: their light radius, in sub-tiles (5 per cell). Characters start with a small radius; items and skills raise it.">
        <span className="small">Player light</span>
        <input type="range" min={0} max={20} value={playerLight} onChange={(e) => onPlayerLight(Number(e.target.value))} disabled={!shown} />
        <span className="small mono">{playerLight ? `${playerLight} sub-tiles` : 'off'}</span>
      </div>
      <div className="light-row">
        <span className="small">Colour</span>
        <input type="color" value={toHex(rgb)} onChange={(e) => setRgb(fromHex(e.target.value))} />
        <span className="small mono">{rgb.join(', ')}</span>
      </div>
      <div className="small muted">
        In Levels.txt: Intensity {light.intensity || '0 (daylight)'}, colour {light.rgb.join(', ')}
        {changed ? ' · the map shows your new values; Apply saves them' : ''}
      </div>
      {changed && (
        <div className="light-row">
          <button
            className="btn small"
            disabled={!canWrite || busy}
            title={canWrite ? 'Write Intensity, Red, Green and Blue into Levels.txt' : 'No writable mod folder'}
            onClick={async () => {
              setBusy(true);
              await onApply(intensity, rgb);
              setBusy(false);
            }}
          >
            {busy ? 'Saving…' : 'Apply to Levels.txt'}
          </button>
          <button className="btn small" onClick={() => (setIntensity(light.intensity), setRgb(light.rgb))}>
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

export function MapInfoPanel({ map, gd, onReopen, onPalette }: { map: OpenMap; gd: GameData; onReopen: (o?: MapOverride) => void; onPalette: (act: number) => void }) {
  const { ds1, resolution: r, lib } = map;
  const sourceText = {
    lvlprest: 'from LvlPrest.txt',
    guessed: 'guessed (not in LvlPrest.txt)',
    embedded: "from the DS1's own file list",
    manual: 'chosen manually',
  }[r.source];
  const chooseType = (id: string) => {
    const t = gd.lvlType(Number(id));
    if (!t) return onReopen(undefined);
    onReopen({ source: 'manual', lvlType: t, paths: GameData.dt1sFor(t, r.preset?.dt1Mask || 0xffffffff) });
  };
  return (
    <Panel title="Map">
      <table className="kv">
        <tbody>
          <tr><td className="muted">Size</td><td>{ds1.width} × {ds1.height} tiles</td></tr>
          <tr><td className="muted">Version</td><td>{ds1.version}{ds1.trailing ? <span className="muted"> (+{ds1.trailing} padding bytes)</span> : null}</td></tr>
          <tr><td className="muted">Act</td><td>{ds1.act + 1}</td></tr>
          <tr><td className="muted">Layers</td><td>{ds1.floors.length} floor · {ds1.walls.length} wall · {ds1.tags.length ? 'tag' : 'no tag'}</td></tr>
          <tr><td className="muted">Objects</td><td>{ds1.objects.length}</td></tr>
          {r.preset && <tr><td className="muted">Preset</td><td>{r.preset.name} <span className="muted">(Def {r.preset.def})</span><ColHelp table="LvlPrest" col="Def" /></td></tr>}
          <tr><td className="muted">Source</td><td className="small">{gd.fs.locate(map.path) ?? '?'}</td></tr>
        </tbody>
      </table>

      <div className="field">
        <div className="field-label">
          Palette{' '}
          <span className="muted small">
            {{ level: 'from the level type', tiles: 'best match for the tiles', ds1: 'from the DS1 header', manual: 'chosen manually' }[map.paletteSource]}
          </span>
        </div>
        <select value={map.paletteAct} onChange={(e) => onPalette(Number(e.target.value))}>
          {PALETTE_NAMES.map((name, a) => (
            <option key={a} value={a}>
              {name}
              {a === map.ds1.act ? ' (DS1 header)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <div className="field-label">
          <span>
            Level type <ColHelp table="Levels" col="LevelType" />
          </span>
          <span className="muted small">{sourceText}</span>
        </div>
        <select value={r.lvlType?.id ?? ''} onChange={(e) => chooseType(e.target.value)}>
          <option value="">(auto)</option>
          {gd.lvlTypes.filter((t) => t.id > 0).map((t) => (
            <option key={t.id} value={t.id}>
              {t.id} · {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field-label">
        Tile libraries <span className="muted small">{lib.loaded.length}</span>
      </div>
      <ul className="dt1-list">
        {lib.loaded.map((l) => (
          <li key={l.path} className={l.found ? '' : 'error-text'} title={l.path}>
            <span>{l.path.replace(/^data\/global\/tiles\//, '')}</span>
            <span className="muted small">{l.found ? `${l.tiles} tiles` : 'not found'}</span>
          </li>
        ))}
      </ul>
      {ds1.files.length > 0 && (
        <details className="small">
          <summary className="muted">Embedded file list ({ds1.files.length})</summary>
          <ul className="dt1-list">
            {ds1.files.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </details>
      )}
    </Panel>
  );
}

interface GroupsPanelProps {
  ds1: Ds1;
  selection: CellRect | null;
  onMutate: (fn: (ds1: Ds1) => void) => void;
  onShowGroups: () => void;
}

/** Tag layer and substitution groups (areas the level generator may swap for alternative presets). */
export function GroupsPanel({ ds1, selection, onMutate, onShowGroups }: GroupsPanelProps) {
  const hasTag = ds1.tagType === 1 || ds1.tagType === 2;
  const setGroup = (n: number, patch: Partial<Ds1['groups'][number]>) =>
    onMutate((d) => {
      d.groups[n] = { ...d.groups[n], ...patch };
    });
  return (
    <Panel title="Tags & groups" extra={hasTag ? `${ds1.groups.length} groups` : 'none'} defaultOpen={false}>
      {!hasTag ? (
        <>
          <p className="muted small">This map has no tag layer, so it cannot have substitution groups.</p>
          <button
            className="btn"
            onClick={() =>
              onMutate((d) => {
                d.tagType = 1;
                d.tags = [new Uint32Array(d.width * d.height)];
              })
            }
          >
            Add tag layer
          </button>
        </>
      ) : (
        <>
          {ds1.groups.map((g, n) => (
            <div key={n} className="group-row">
              <span className="muted small mono">{n}</span>
              <NumField value={g.x} min={0} max={ds1.width - 1} onCommit={(x) => setGroup(n, { x })} width={36} />
              <NumField value={g.y} min={0} max={ds1.height - 1} onCommit={(y) => setGroup(n, { y })} width={36} />
              <span className="muted small">size</span>
              <NumField value={g.width} min={1} max={ds1.width} onCommit={(width) => setGroup(n, { width })} width={36} />
              <NumField value={g.height} min={1} max={ds1.height} onCommit={(height) => setGroup(n, { height })} width={36} />
              <button
                className="icon-btn"
                title="Delete group"
                onClick={() =>
                  onMutate((d) => {
                    d.groups.splice(n, 1);
                  })
                }
              >
                ×
              </button>
            </div>
          ))}
          <button
            className="btn"
            disabled={!selection}
            title={selection ? 'Create a group covering the selected cells' : 'Select cells first (Select tool, V)'}
            onClick={() => {
              if (!selection) return;
              const [width, height] = rectSize(selection);
              onMutate((d) => {
                d.groups.push({ x: selection.x0, y: selection.y0, width, height, unknown: 0 });
              });
              onShowGroups();
            }}
          >
            Group from selection
          </button>
          <p className="muted small">Tag values are edited per cell: select a single cell. Tag type {ds1.tagType}.</p>
        </>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// History

const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** Every undo step of the map; click one to go back (or forward) to just after it. */
export function HistoryPanel({ doc, revision, onGoTo }: { doc: MapDocument; revision: number; onGoTo: (count: number) => void }) {
  const { done, undone } = useMemo(() => doc.history(), [doc, revision]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Panel title="History" extra={`${done.length} step${done.length === 1 ? '' : 's'}${undone.length ? ` · ${undone.length} undone` : ''}`} defaultOpen={false}>
      <div className="history-list">
        {[...undone].reverse().map((s, i) => (
          <button key={`u${i}`} className="history-row undone" onClick={() => onGoTo(done.length + undone.length - i)} title="Redo up to here">
            <span>{s.label}</span>
            <span className="muted small">{clock(s.time)}</span>
          </button>
        ))}
        {[...done].reverse().map((s, i) => (
          <button key={`d${i}`} className={`history-row${i === 0 ? ' current' : ''}`} onClick={() => onGoTo(done.length - i)} title={i === 0 ? 'The current state' : 'Go back to just after this step'}>
            <span>{s.label}</span>
            <span className="muted small">{clock(s.time)}</span>
          </button>
        ))}
        <button className={`history-row${done.length === 0 ? ' current' : ''}`} onClick={() => onGoTo(0)} title="Undo everything">
          <span>Map as opened</span>
        </button>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Objects in the map

/** Every object and NPC of the map by name, with counts; click a name to jump to the next one. */
export function MapObjectsPanel({ objects, nameOf, onJump }: { objects: Ds1Object[]; nameOf: (type: number, id: number) => string; onJump: (index: number) => void }) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState<Record<string, number>>({});
  const groups = useMemo(() => {
    const byName = new Map<string, { name: string; type: number; id: number; indices: number[] }>();
    objects.forEach((o, i) => {
      const name = nameOf(o.type, o.id);
      const k = `${o.type}:${o.id}`;
      if (!byName.has(k)) byName.set(k, { name, type: o.type, id: o.id, indices: [] });
      byName.get(k)!.indices.push(i);
    });
    return [...byName.values()].sort((a, b) => a.type - b.type || a.name.localeCompare(b.name));
  }, [objects, nameOf]);
  const q = query.trim().toLowerCase();
  const shown = groups.filter((g) => !q || g.name.toLowerCase().includes(q) || `${g.type === 1 ? 'npc' : 'object'} ${g.id}`.includes(q) || String(g.id) === q);
  const npcs = objects.filter((o) => o.type === 1).length;
  return (
    <Panel title="In this map" extra={`${objects.length - npcs} objects · ${npcs} NPCs`}>
      <input className="search small-input" placeholder="Search by name or id…" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
      <div className="mo-list">
        {shown.map((g) => {
          const k = `${g.type}:${g.id}`;
          const at = cursor[k] ?? 0;
          return (
            <button
              key={k}
              className="mo-row"
              title={g.indices.length > 1 ? `Click to jump to each one in turn (${at + 1} of ${g.indices.length} next)` : 'Jump to it'}
              onClick={() => {
                onJump(g.indices[at % g.indices.length]);
                setCursor((c) => ({ ...c, [k]: (at + 1) % g.indices.length }));
              }}
            >
              <span className={`mo-kind ${g.type === 1 ? 'npc' : 'obj'}`}>{g.type === 1 ? 'NPC' : 'OBJ'}</span>
              <span className="mo-name">{g.name}</span>
              <span className="muted small">{g.indices.length > 1 ? `×${g.indices.length}` : ''}</span>
            </button>
          );
        })}
        {!shown.length && <p className="muted small">{objects.length ? 'No match.' : 'No objects or NPCs in this map.'}</p>}
      </div>
    </Panel>
  );
}
