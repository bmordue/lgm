<template>
  <svg :viewBox="viewBox" @click="handleSvgClick"> <!-- Changed click handler to svg specific -->
    <defs>
      <marker
        id="arrowhead"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#d35400" />
      </marker>
      <marker
        id="arrowhead-hover"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#2196f3" />
      </marker>
    </defs>
    <g
      v-for="(hex, index) in hexes"
      :key="index"
      :transform="getHexTransform(hex)"
      @click.stop="handleHexClick(hex)"
      @contextmenu.prevent="handleHexRightClick(hex)"
      @mouseenter="handleMouseEnter(hex)"
      @mouseleave="handleMouseLeave"
      @focusin="handleMouseEnter(hex)"
      @focusout="handleMouseLeave"
      role="button"
      tabindex="0"
      :aria-label="getAriaLabel(hex)"
      @keydown="handleKeyDown($event, hex)"
    >
      <title>{{ getAriaLabel(hex) }}</title>
      <polygon
        :points="getHexPoints(hex)"
        :class="getHexClass(hex)"
        :style="getHexStyle(hex)" />
      <text
        class="hex-text"
        text-anchor="middle"
        dy=".3em"
        :font-size="getHexFontSize()">{{ getHexText(hex) }}</text>
    </g>
      <g class="planned-moves-layer" style="pointer-events: none">
        <line
          v-for="(move, index) in plannedMoves"
          :key="'move-' + index"
          :x1="getPixelPos(move.startPos.x, move.startPos.y).x"
          :y1="getPixelPos(move.startPos.x, move.startPos.y).y"
          :x2="getPixelPos(move.endPos.x, move.endPos.y).x"
          :y2="getPixelPos(move.endPos.x, move.endPos.y).y"
          class="planned-move-line"
          :class="{ 'is-hovered': isSameMove(move, hoveredMove) }"
          :marker-end="isSameMove(move, hoveredMove) ? 'url(#arrowhead-hover)' : 'url(#arrowhead)'"
        />
      </g>
      <g v-for="(hex, index) in hexes" :key="'hp-' + index" style="pointer-events: none">
        <rect v-if="getActorForHex(hex)"
          :x="getHPBarPos(hex).x" :y="getHPBarPos(hex).y"
          :width="40" :height="4" fill="rgba(0,0,0,0.3)" rx="1" />
        <rect v-if="getActorForHex(hex)"
          :x="getHPBarPos(hex).x" :y="getHPBarPos(hex).y"
          :width="getHPWidth(getActorForHex(hex)!)" :height="4"
          :fill="getHPColor(getActorForHex(hex)!)" rx="1" />
      </g>
  </svg>
</template>

<script lang="ts">
import { defineComponent, computed, type PropType, type CSSProperties } from 'vue'; // Added ref
import { Terrain } from '@lgm/shared-types/models';
import { Hex, Point, Layout, OffsetCoord } from '@lgm/shared-types/hex';
import { useGamesStore, type Actor, type PlannedMove, type World } from '../stores/Games.store'; // Added imports

interface HexStyle extends CSSProperties {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

// Layout configuration
const HEX_SIZE = 50; // Pixels
const layout = new Layout(Layout.pointy, new Point(HEX_SIZE, HEX_SIZE), new Point(0, 0));

export default defineComponent({
  name: 'HexGrid',
  props: {
    world: {
      type: Object as PropType<World>,
      required: true,
    },
    actors: { // New prop for actors
      type: Array as PropType<Actor[]>,
      required: true,
    },
    plannedMoves: {
      type: Array as PropType<PlannedMove[]>,
      default: () => [],
    },
    hoveredMove: {
        type: Object as PropType<PlannedMove | null>,
        default: null,
    },
    hoveredActorId: {
        type: Number as PropType<number | null>,
        default: null,
    },
    hoveredPlayerId: {
        type: Number as PropType<number | null>,
        default: null,
    },
    selectedActorId: {
        type: Number as PropType<number | null>,
        default: null,
    },
    hoveredLegendType: {
        type: String as PropType<string | null>,
        default: null,
    },
  },
  emits: ['move-planned', 'actor-hover', 'player-hover', 'move-hover', 'actor-select'], // Declare emitted events
  setup(props, { emit }) {
    const gamesStore = useGamesStore(); // Get store instance
    const offsetType = OffsetCoord.ODD; // Using ODD as per existing qoffset/roffset logic

    // hexes are now generated based on props.world.terrain
    const hexes = computed(() => {
      const h: Hex[] = [];
      if (!props.world || !props.world.terrain || props.world.terrain.length === 0) {
        return h;
      }
      // props.world.terrain is [row][col]
      // Assuming 'odd-r' offset system for converting grid indices to hex coordinates
      // r_offset (row index) will be the outer loop.
      // q_offset (col index) will be the inner loop.
      for (let r_offset = 0; r_offset < props.world.terrain.length; r_offset++) {
        const rowTerrain = props.world.terrain[r_offset];
        for (let q_offset = 0; q_offset < rowTerrain.length; q_offset++) {
          // OffsetCoord(col, row) -> OffsetCoord(q_offset, r_offset)
          h.push(OffsetCoord.roffsetToCube(offsetType, new OffsetCoord(q_offset, r_offset)));
        }
      }
      return h;
    });

    const viewBox = computed(() => {
      if (hexes.value.length === 0) return "0 0 100 100"; // Default for empty grid
      const allPoints: Point[] = [];
      hexes.value.forEach(hex => {
        layout.polygonCorners(hex).forEach(p => allPoints.push(p));
      });
      if (allPoints.length === 0) return "0 0 100 100";
      const minX = Math.min(...allPoints.map(p => p.x));
      const minY = Math.min(...allPoints.map(p => p.y));
      const maxX = Math.max(...allPoints.map(p => p.x));
      const maxY = Math.max(...allPoints.map(p => p.y));
      const padding = HEX_SIZE * 0.5;
      return `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`;
    });

    const getHexPoints = (hex: Hex): string => {
      return layout.polygonCorners(hex).map(p => `${p.x},${p.y}`).join(' ');
    };

    const getHexTransform = (_hex: Hex): string => ''; // Points are absolute

    const getTerrainTypeForHex = (hex: Hex): Terrain | null => {
      const offsetCoord = OffsetCoord.roffsetFromCube(offsetType, hex);
      const col = offsetCoord.col; // q_offset
      const row = offsetCoord.row; // r_offset

      if (props.world && props.world.terrain &&
          row >= 0 && row < props.world.terrain.length &&
          col >= 0 && col < props.world.terrain[row].length) {
        return props.world.terrain[row][col] as Terrain; // Cast to Terrain enum
      }
      return null;
    };

    const getHexStyle = (_hex: Hex): HexStyle => {
      // Base style, specific fills will be by CSS class
      return {};
    };

    const getHexClass = (hex: Hex): string[] => {
        const classes = ['hex-polygon'];
        const terrainType = getTerrainTypeForHex(hex);

        if (terrainType === Terrain.EMPTY) classes.push('terrain-empty');
        else if (terrainType === Terrain.BLOCKED) {
            classes.push('terrain-blocked');
            classes.push('is-dark-terrain');
        }
        else if (terrainType === Terrain.UNEXPLORED) {
            classes.push('terrain-unexplored'); // New class for unexplored
            classes.push('is-dark-terrain');
        }
        else classes.push('terrain-unknown'); // Fallback for unexpected terrain values

        const hexGridPos = OffsetCoord.roffsetFromCube(offsetType, hex);

        const actorOnHex = props.actors.find(actor => {
            return actor.pos.x === hexGridPos.row && actor.pos.y === hexGridPos.col;
        });
        if (actorOnHex) {
            classes.push('has-actor');
            if (actorOnHex.owner === currentPlayerId.value) {
                classes.push('is-own-actor');
                // Check if this specific actor has any planned moves
                if (props.plannedMoves.some(m => m.actorId === actorOnHex.id)) {
                  classes.push('actor-has-planned-move');
                }
            } else {
                classes.push('is-enemy-actor');
            }
            if (actorOnHex.id === props.selectedActorId) {
                classes.push('selected');
            }
        }

        const isPlannedDestination = props.plannedMoves.some(m => m.endPos.x === hexGridPos.row && m.endPos.y === hexGridPos.col);
        if (isPlannedDestination) {
            classes.push('planned-path');
        }

        if (props.hoveredMove && props.hoveredMove.endPos.x === hexGridPos.row && props.hoveredMove.endPos.y === hexGridPos.col) {
          classes.push('is-hovered-destination');
        }

        // Cross-highlighting logic
        const isHoveredBySidebar = (actorOnHex && actorOnHex.id === props.hoveredActorId) ||
                                  (actorOnHex && actorOnHex.owner === props.hoveredPlayerId) ||
                                  (actorOnHex && props.hoveredMove && actorOnHex.id === props.hoveredMove.actorId);

        if (isHoveredBySidebar) {
            classes.push('is-hovered-actor');
        }

        // Legend highlight logic
        if (props.hoveredLegendType) {
            if (props.hoveredLegendType === 'terrain-empty' && terrainType === Terrain.EMPTY) classes.push('legend-highlight');
            else if (props.hoveredLegendType === 'terrain-blocked' && terrainType === Terrain.BLOCKED) classes.push('legend-highlight');
            else if (props.hoveredLegendType === 'terrain-unexplored' && terrainType === Terrain.UNEXPLORED) classes.push('legend-highlight');
            else if (props.hoveredLegendType === 'is-own' && actorOnHex && actorOnHex.owner === currentPlayerId.value) classes.push('legend-highlight');
            else if (props.hoveredLegendType === 'is-enemy' && actorOnHex && actorOnHex.owner !== currentPlayerId.value) classes.push('legend-highlight');
            else if (props.hoveredLegendType === 'is-selected' && actorOnHex && actorOnHex.id === props.selectedActorId) classes.push('legend-highlight');
            else if (props.hoveredLegendType === 'is-planned' && isPlannedDestination) classes.push('legend-highlight');
        }

        return classes;
    };

    const getHexText = (hex: Hex): string => {
      const hexGridPos = OffsetCoord.roffsetFromCube(offsetType, hex);
      // Display Row,Col coordinates. Could also show actor info if one is present.
      const actorOnHex = props.actors.find(actor => {
        // Actor positions are {x,y} which are grid row,col.
        return actor.pos.x === hexGridPos.row && actor.pos.y === hexGridPos.col;
      });
      if (actorOnHex) {
        return `A:${actorOnHex.id}`; // Show "A" for Actor
      }
      return `${hexGridPos.row},${hexGridPos.col}`;
    };

    const getHexFontSize = (): number => layout.size.x / 3.8;

    const handleHexClick = (clickedHex: Hex) => {
      const clickedHexGridPos = OffsetCoord.roffsetFromCube(offsetType, clickedHex);
      const actorOnClickedHex = props.actors.find(actor => {
        return actor.pos.x === clickedHexGridPos.row && actor.pos.y === clickedHexGridPos.col;
      });

      if (actorOnClickedHex) {
        if (props.selectedActorId === actorOnClickedHex.id) {
          emit('actor-select', null);
          console.log("Deselected actor:", actorOnClickedHex.id);
        } else {
          emit('actor-select', actorOnClickedHex.id);
          console.log("Selected actor:", actorOnClickedHex.id);
        }
        return;
      }

      if (props.selectedActorId) {
        const selectedActor = props.actors.find(a => a.id === props.selectedActorId);
        if (selectedActor && selectedActor.owner === currentPlayerId.value) {
          const move: PlannedMove = {
            actorId: selectedActor.id,
            startPos: { x: selectedActor.pos.x, y: selectedActor.pos.y },
            endPos: { x: clickedHexGridPos.row, y: clickedHexGridPos.col }
          };
          emit('move-planned', move);
          emit('actor-select', null);
          console.log('Move planned:', move);
        }
      } else {
        console.log("Clicked on hex:", clickedHex, ". No player actor selected or on this hex.");
      }
    };

    const handleHexRightClick = (hex: Hex) => {
        const hexGridPos = OffsetCoord.roffsetFromCube(offsetType, hex);
        const actorOnHex = props.actors.find(a => a.pos.x === hexGridPos.row && a.pos.y === hexGridPos.col && a.owner === currentPlayerId.value);

        if (actorOnHex && props.selectedActorId === actorOnHex.id) {
            emit('actor-select', null);
            console.log("Deselected via right click.");
        } else {
            emit('actor-select', null);
            console.log("Selection cleared via right click.");
        }
    };


    const handleSvgClick = (event: MouseEvent) => {
        if (event.target === event.currentTarget) { // Click on SVG background
            emit('actor-select', null);
            console.log('Clicked SVG background, selection cleared.');
        }
    };

    const getAriaLabel = (hex: Hex): string => {
        const terrainType = getTerrainTypeForHex(hex);
        const hexGridPos = OffsetCoord.roffsetFromCube(offsetType, hex);
        let label = `Hex at ${hexGridPos.row}, ${hexGridPos.col}`;

        if (terrainType === Terrain.BLOCKED) label += ", Blocked";
        else if (terrainType === Terrain.UNEXPLORED) label += ", Unexplored";

        const actorOnHex = props.actors.find(actor => {
            return actor.pos.x === hexGridPos.row && actor.pos.y === hexGridPos.col;
        });

        if (actorOnHex) {
            const isOwn = actorOnHex.owner === currentPlayerId.value;
            const health = actorOnHex.health ?? 100;
            const maxHealth = actorOnHex.maxHealth ?? 100;
            label += `, Actor ${actorOnHex.id} (${isOwn ? 'Yours' : 'Enemy'}), Health ${health} of ${maxHealth}`;
            if (props.plannedMoves.some(m => m.actorId === actorOnHex.id)) {
                label += ", Planned move";
            }
            if (actorOnHex.id === props.selectedActorId) {
                label += ", Selected";
            }
        }

        const plannedMove = props.plannedMoves.find(m => m.endPos.x === hexGridPos.row && m.endPos.y === hexGridPos.col);
        if (plannedMove) {
            label += `, Planned destination for Actor ${plannedMove.actorId}`;
        }

        return label;
    };

    const handleKeyDown = (event: KeyboardEvent, hex: Hex) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleHexClick(hex);
        }
    };

    const handleMouseEnter = (hex: Hex) => {
        const hexGridPos = OffsetCoord.roffsetFromCube(offsetType, hex);
        const actor = props.actors.find(a => a.pos.x === hexGridPos.row && a.pos.y === hexGridPos.col);
        const move = props.plannedMoves.find(m => m.endPos.x === hexGridPos.row && m.endPos.y === hexGridPos.col);

        if (actor) {
            emit('actor-hover', actor.id);
            emit('player-hover', actor.owner);
        }
        if (move) {
            emit('move-hover', move);
        }
    };

    const handleMouseLeave = () => {
        emit('actor-hover', null);
        emit('player-hover', null);
        emit('move-hover', null);
    };

    const currentPlayerId = computed(() => gamesStore.getCurrentPlayerId());
    const getActorForHex = (hex: Hex) => {
      const p = OffsetCoord.roffsetFromCube(offsetType, hex);
      return props.actors.find(a => a.pos.x === p.row && a.pos.y === p.col);
    };
    const getHPBarPos = (hex: Hex) => {
      const c = layout.hexToPixel(hex);
      return new Point(c.x - 20, c.y + 25);
    };
    const getHPWidth = (a: Actor) => (40 * Math.min(100, (a.health ?? 100) / (a.maxHealth ?? 100) * 100)) / 100;
    const getHPColor = (a: Actor) => {
      const p = ((a.health ?? 100) / (a.maxHealth ?? 100)) * 100;
      return p > 60 ? '#2ecc71' : p > 25 ? '#f39c12' : '#e74c3c';
    };

    const getPixelPos = (row: number, col: number): Point => {
      const hex = OffsetCoord.roffsetToCube(offsetType, new OffsetCoord(col, row));
      return layout.hexToPixel(hex);
    };

    const isSameMove = (m1: PlannedMove, m2: PlannedMove | null): boolean => {
      if (!m2) return false;
      return m1.actorId === m2.actorId &&
             m1.startPos.x === m2.startPos.x && m1.startPos.y === m2.startPos.y &&
             m1.endPos.x === m2.endPos.x && m1.endPos.y === m2.endPos.y;
    };

    return {
      hexes,
      viewBox,
      getHexPoints,
      getHexTransform,
      getHexStyle,
      getHexClass,
      getHexText,
      getHexFontSize,
      handleHexClick,
      handleSvgClick,
      handleHexRightClick,
      getAriaLabel,
      handleKeyDown,
      handleMouseEnter,
      handleMouseLeave,
      getActorForHex,
      getHPBarPos,
      getHPWidth,
      getHPColor,
      getPixelPos,
      isSameMove,
    };
  },
});
</script>

<style scoped>
svg {
  width: 100%;
  height: auto;
  border: 1px solid #d1d1d1; /* Lighter border for the SVG container */
  background-color: #f8f9fa; /* Light background for the SVG area */
}

.hex-polygon {
  stroke: #34495E; /* Default stroke color for hexes */
  stroke-width: 1;
  cursor: pointer;
  transition: fill-opacity 0.2s ease-in-out, stroke-width 0.2s ease-in-out, fill 0.2s ease-in-out; /* Added fill transition */
}

.hex-polygon:hover {
  fill-opacity: 0.8;
  stroke-width: 1.5;
}

g:focus-visible .hex-polygon {
  stroke: hsla(160, 100%, 37%, 1); /* Brand green stroke for focus */
  stroke-width: 3;
  outline: none;
}


.hex-polygon.selected-actor {
  stroke: #2980b9; /* Blue stroke for selected actor */
  stroke-width: 3;
  /* fill: rgba(41, 128, 185, 0.1); Slightly blue fill for the selected actor's hex */
}

.hex-polygon.planned-path {
  fill: rgba(230, 126, 34, 0.2); /* Subtle orange fill for planned path hexes */
  stroke: #d35400; /* Darker orange stroke for planned path */
  stroke-dasharray: 4; /* Dashed line for path */
  stroke-width: 2;
}

.hex-polygon.is-own-actor {
  stroke: hsla(160, 100%, 37%, 1);
  stroke-width: 2.5;
  fill: hsla(160, 100%, 37%, 0.1);
}

.hex-polygon.is-enemy-actor {
  stroke: #ff9800;
  stroke-width: 2.5;
  fill: rgba(255, 152, 0, 0.1);
}

.hex-polygon.actor-has-planned-move {
  stroke-dasharray: 2; /* Dash it to show it has a pending action */
}

/* Specific selection and hover states take priority */
@keyframes pulse-selection {
  0% { stroke-width: 2.5; }
  50% { stroke-width: 4; }
  100% { stroke-width: 2.5; }
}

.hex-polygon.selected {
    stroke: #c0392b;
    stroke-width: 2.5;
    fill: rgba(192, 57, 43, 0.1);
    animation: pulse-selection 2s infinite ease-in-out;
}

.hex-polygon.is-hovered-destination {
  fill: rgba(230, 126, 34, 0.2); /* Subtle orange fill */
  stroke: #d35400;
  stroke-width: 3;
  stroke-dasharray: none; /* Solid line for clear focus */
}

.hex-polygon.is-hovered-actor {
  stroke: #2196f3; /* Blue highlight */
  stroke-width: 3;
  fill: rgba(33, 150, 243, 0.2);
}

.hex-polygon.legend-highlight {
  stroke: hsla(160, 100%, 37%, 1);
  stroke-width: 3.5;
  filter: drop-shadow(0 0 4px hsla(160, 100%, 37%, 0.5));
  animation: pulse-selection 1s infinite ease-in-out;
  z-index: 10;
}


/* Specific terrain styling via classes (alternative to inline styles from getHexStyle) */
.terrain-empty {
  fill: #EAECEE; /* Light grey for empty, visible hexes */
}
.terrain-blocked {
  fill: #5D6D7E; /* Darker grey for blocked, visible hexes */
}
.terrain-unexplored {
  fill: #2C3E50; /* Very dark (almost black) for unexplored hexes */
  stroke: #1A242F; /* Even darker stroke for unexplored */
}
.terrain-unknown { /* Fallback style */
  fill: #ff00ff; /* Magenta for unknown terrain types, indicates an issue */
}


/* Styles for actor presence or selection, can be expanded */
.hex-polygon.has-actor {
  /* stroke-width: 1.5; */
  /* stroke: #f1c40f; */ /* Example: yellow stroke if an actor is on it */
}

/* .hex-polygon.visibility-source and .hex-polygon.visible are removed as local visibility is gone */

.hex-text {
  pointer-events: none; /* Text should not block clicks on the polygon */
  fill: #2c3e50; /* Darker text color for better contrast */
  font-weight: 500; /* Slightly bolder text */
  font-family: 'Arial', sans-serif; /* Consistent font */
  transition: fill 0.2s ease-in-out;
}

.is-dark-terrain .hex-text {
  fill: #ecf0f1; /* Lighter text color for better contrast on dark terrain */
}

@keyframes marching-ants {
  to {
    stroke-dashoffset: -20;
  }
}

.planned-move-line {
  stroke: #d35400;
  stroke-width: 3;
  stroke-dasharray: 10, 5;
  animation: marching-ants 1s infinite linear;
  transition: stroke 0.2s ease, stroke-width 0.2s ease;
}

.planned-move-line.is-hovered {
  stroke: #2196f3;
  stroke-width: 5;
  stroke-dasharray: none;
  animation: none;
}
</style>
