<template>
  <svg :viewBox="viewBox" @click="handleSvgClick"> <!-- Changed click handler to svg specific -->
    <g v-for="(hex, index) in hexes" :key="index" :transform="getHexTransform(hex)" @click.stop="handleHexClick(hex)" @contextmenu.prevent="handleHexRightClick(hex)">
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
  </svg>
</template>

<script lang="ts">
import { defineComponent, PropType, computed, ref, Ref } from 'vue'; // Added ref
import { World, Terrain, Actor as ServiceActor } from '../../../lib/service/Models'; // Assuming Terrain might still be used or can be cleaned up if not. Renamed Actor to ServiceActor to avoid conflict.
import { Hex, Point, Layout, OffsetCoord } from '../../../lib/Hex';
import { Actor, PlannedMove, Coord } from '../stores/Games.store'; // Added imports
import { hasLineOfSight } from '../../../lib/service/Visibility';

interface HexStyle {
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
  },
  emits: ['move-planned'], // Declare emitted events
  setup(props, { emit }) { // Added emit to setup context
    const offsetType = OffsetCoord.ODD;
    const selectedHexRef = ref<Hex | null>(null); // Will keep for hex selection visualization if needed, or remove if superseded by actor selection
    // const selectedActorId = ref<number | null>(null); // For selected actor ID - Commented out for visibility checker
    // const plannedMoves = ref<PlannedMove[]>([]); // For storing planned moves - Commented out for visibility checker

    const hexToString = (hex: Hex) => `${hex.q},${hex.r},${hex.s}`;

    const visibilitySourceHex: Ref<Hex | null> = ref(null);
    const visibleHexes: Ref<Set<string>> = ref(new Set());
    const localTerrain: Ref<Terrain[][]> = ref([]);

    const initializeLocalTerrain = (rows: number, cols: number) => {
      const terrain: Terrain[][] = [];
      for (let i = 0; i < rows; i++) {
        terrain[i] = [];
        for (let j = 0; j < cols; j++) {
          terrain[i][j] = Terrain.EMPTY;
        }
      }
      localTerrain.value = terrain;
    };

    initializeLocalTerrain(10, 10);

    const hexes = computed(() => {
      const h: Hex[] = [];
      if (!localTerrain.value || localTerrain.value.length === 0) return h;
      // Assuming localTerrain is [row][col] and we want to use 'odd-r' for cube conversion consistent with existing code.
      // r_offset (row index) will be the outer loop for terrain access.
      // q_offset (col index) will be the inner loop.
      for (let r_offset = 0; r_offset < localTerrain.value.length; r_offset++) {
        const rowTerrain = localTerrain.value[r_offset];
        for (let q_offset = 0; q_offset < rowTerrain.length; q_offset++) {
          // Using OffsetCoord.ODD and roffsetToCube as before.
          // new OffsetCoord(col, row) -> new OffsetCoord(q_offset, r_offset)
          h.push(OffsetCoord.roffsetToCube(offsetType, new OffsetCoord(q_offset, r_offset)));
        }
      }
      return h;
    });

    const viewBox = computed(() => {
      if (hexes.value.length === 0) return "0 0 100 100";
      const allPoints: Point[] = [];
      hexes.value.forEach(hex => {
        layout.polygonCorners(hex).forEach(p => allPoints.push(p)); // Changed Layout. to layout.
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
      return layout.polygonCorners(hex).map(p => `${p.x},${p.y}`).join(' '); // Changed Layout. to layout.
    };

    const getHexTransform = (hex: Hex): string => ''; // Points are absolute

    const getTerrainTypeForHex = (hex: Hex): Terrain | null => {
      const offsetCoord = OffsetCoord.roffsetFromCube(offsetType, hex);
      const col = offsetCoord.col;
      const row = offsetCoord.row;
      if (localTerrain.value && row >= 0 && row < localTerrain.value.length && col >= 0 && col < localTerrain.value[row].length) {
        return localTerrain.value[row][col];
      }
      return null;
    };

    const getHexStyle = (hex: Hex): HexStyle => {
      // Fill is now handled by CSS classes based on terrain, visibility, etc.
      // This function can be used for other dynamic styles if needed in the future.
      // For now, return a base style or an empty object if covered by CSS.
      // Let's ensure a default stroke is applied if not specified by other classes.
      return {
        // stroke: '#34495E', // This is already in .hex-polygon CSS
        // strokeWidth: 1,    // This is already in .hex-polygon CSS
      };
    };

    const getHexClass = (hex: Hex): string[] => {
        const classes = ['hex-polygon'];
        const terrainType = getTerrainTypeForHex(hex); // This now uses localTerrain

        // Add class for terrain type
        if (terrainType === Terrain.EMPTY) classes.push('terrain-empty');
        if (terrainType === Terrain.BLOCKED) classes.push('terrain-blocked');

        const sHex = hexToString(hex); // Use the helper
        if (visibilitySourceHex.value &&
            visibilitySourceHex.value.q === hex.q &&
            visibilitySourceHex.value.r === hex.r &&
            visibilitySourceHex.value.s === hex.s) {
            classes.push('visibility-source');
        } else if (visibleHexes.value.has(sHex)) {
            classes.push('visible');
        }

        // Previous selection logic based on selectedHexRef (can be removed or adapted)
        if (selectedHexRef.value && selectedHexRef.value.q === hex.q && selectedHexRef.value.r === hex.r && selectedHexRef.value.s === hex.s) {
            classes.push('selected'); // This might be redundant if selected-actor is more specific
        }
        return classes;
    };

    const getHexText = (hex: Hex): string => {
      return `${hex.q},${hex.r}`;
    }
    const getHexFontSize = (): number => layout.size.x / 3.8;

    const handleHexClick = (clickedHex: Hex) => {
      visibilitySourceHex.value = clickedHex;
      visibleHexes.value.clear();

      const hexToLocalGrid = (h: Hex) => {
        const offset = OffsetCoord.roffsetFromCube(offsetType, h);
        return { x: offset.row, y: offset.col };
      };

      if (visibilitySourceHex.value) {
        const sourceHex = visibilitySourceHex.value;
        hexes.value.forEach(targetHex => {
          if (sourceHex.q === targetHex.q && sourceHex.r === targetHex.r && sourceHex.s === targetHex.s) {
            return;
          }
          if (hasLineOfSight(sourceHex, targetHex, localTerrain.value, [], hexToLocalGrid)) {
            visibleHexes.value.add(hexToString(targetHex));
          }
        });
      }
    };

    const handleHexRightClick = (hex: Hex) => {
      const offsetCoord = OffsetCoord.roffsetFromCube(offsetType, hex);
      const r = offsetCoord.row;
      const c = offsetCoord.col;

      if (localTerrain.value && r >= 0 && r < localTerrain.value.length && c >= 0 && c < localTerrain.value[r].length) {
        const currentTerrain = localTerrain.value[r][c];
        localTerrain.value[r][c] = currentTerrain === Terrain.BLOCKED ? Terrain.EMPTY : Terrain.BLOCKED;

        if (visibilitySourceHex.value) {
          handleHexClick(visibilitySourceHex.value);
        }
      }
    };

    const handleSvgClick = (event: MouseEvent) => {
        if (event.target === event.currentTarget) {
            selectedHexRef.value = null;
            // selectedActorId.value = null; // Also deselect actor on background click
            console.log('Clicked SVG background, deselected hex and actor.');
        }
    };

    return {
      hexes,
      selectedHexRef,
      // selectedActorId, // Expose selectedActorId
      // plannedMoves,    // Expose plannedMoves
      viewBox,
      getHexPoints,
      getHexTransform,
      getHexStyle,
      getHexClass,
      getHexText,
      getHexFontSize,
      handleHexClick,
      handleSvgClick,
      visibilitySourceHex,
      visibleHexes,
      localTerrain,
      handleHexRightClick, // Expose new handler
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
  fill-opacity: 0.8; /* Make hex slightly more transparent on hover */
}

.hex-polygon.selected {
    stroke: #c0392b; /* A strong red for selection stroke */
    stroke-width: 2.5; /* Clearly thicker stroke */
}

.hex-polygon.selected-actor {
  stroke: #2980b9; /* Blue stroke for selected actor */
  stroke-width: 3;
  /* fill: rgba(41, 128, 185, 0.1); Slightly blue fill for the selected actor's hex */
}

.hex-polygon.planned-path {
  /* fill: rgba(230, 126, 34, 0.3); Orangeish fill for planned path hexes */
  stroke: #d35400; /* Darker orange stroke for planned path */
  stroke-dasharray: 4; /* Dashed line for path */
  stroke-width: 1.5;
}


/* Specific terrain styling via classes (alternative to inline styles from getHexStyle) */
.terrain-empty {
  fill: #EAECEE;
}
.terrain-blocked {
  fill: #5D6D7E;
}

.hex-polygon.visibility-source {
  fill: #2980b9; /* Blue for the source hex */
  stroke: #1a5276;
  stroke-width: 2.5;
}

.hex-polygon.visible {
  fill: #abeade; /* Light teal/cyan for visible hexes */
  /* fill-opacity: 0.7; */ /* Optional: make them slightly transparent */
}

.hex-text {
  pointer-events: none; /* Text should not block clicks on the polygon */
  fill: #2c3e50; /* Darker text color for better contrast */
  font-weight: 500; /* Slightly bolder text */
  font-family: 'Arial', sans-serif; /* Consistent font */
}
</style>
