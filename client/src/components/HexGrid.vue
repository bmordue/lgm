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
import { World, Terrain, Actor as ServiceActor } from '../../../api/service/Models'; // Assuming Terrain might still be used or can be cleaned up if not. Renamed Actor to ServiceActor to avoid conflict.
import { Hex, Point, Layout, OffsetCoord } from '../../../api/Hex';
import { Actor, PlannedMove, Coord } from '../stores/Games.store'; // Added imports
import { hasLineOfSight } from '../../../api/service/Visibility';

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
  setup(props, { emit }) {
    const gamesStore = useGamesStore(); // Get store instance
    const offsetType = OffsetCoord.ODD; // Using ODD as per existing qoffset/roffset logic
    const selectedHexRef = ref<Hex | null>(null); // For actor selection / move planning start

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

    const getHexTransform = (hex: Hex): string => ''; // Points are absolute

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

    const getHexStyle = (hex: Hex): HexStyle => {
      // Base style, specific fills will be by CSS class
      return {};
    };

    const getHexClass = (hex: Hex): string[] => {
        const classes = ['hex-polygon'];
        const terrainType = getTerrainTypeForHex(hex);

        if (terrainType === Terrain.EMPTY) classes.push('terrain-empty');
        else if (terrainType === Terrain.BLOCKED) classes.push('terrain-blocked');
        else if (terrainType === Terrain.UNEXPLORED) classes.push('terrain-unexplored'); // New class for unexplored
        else classes.push('terrain-unknown'); // Fallback for unexpected terrain values

        // Logic for 'selected' class (e.g., if planning a move from this hex)
        if (selectedHexRef.value && selectedHexRef.value.q === hex.q && selectedHexRef.value.r === hex.r) {
            classes.push('selected');
        }
        // TODO: Add class if an actor (props.actors) is on this hex ('has-actor', 'player-actor', 'enemy-actor')
        const actorOnHex = props.actors.find(actor => {
            const actorOffset = OffsetCoord.roffsetFromCube(offsetType, OffsetCoord.qoffsetToCube(offsetType, new OffsetCoord(actor.pos.y, actor.pos.x))); // convert actor pos to match hex
            const hexOffset = OffsetCoord.roffsetFromCube(offsetType, hex);
            return actorOffset.col === hexOffset.col && actorOffset.row === hexOffset.row;
        });
        if (actorOnHex) {
            classes.push('has-actor');
            // Further classify if it's player's own actor vs enemy, if needed for styling
        }

        return classes;
    };

    const getHexText = (hex: Hex): string => {
      // Display Q,R coordinates. Could also show actor info if one is present.
      const actorOnHex = props.actors.find(actor => {
        // Actor positions are {x,y} which are grid row,col. Convert to hex for comparison or compare grid positions.
        // Assuming actor.pos.x is row (r_offset) and actor.pos.y is col (q_offset)
        const hexGridPos = OffsetCoord.roffsetFromCube(offsetType, hex); // { col: q_offset, row: r_offset }
        return actor.pos.x === hexGridPos.row && actor.pos.y === hexGridPos.col;
      });
      if (actorOnHex) {
        return `A:${actorOnHex.id}`; // Show "A" for Actor
      }
      return `${hex.q},${hex.r}`;
    };

    const getHexFontSize = (): number => layout.size.x / 3.8;

    const handleHexClick = (clickedHex: Hex) => {
      // This handler is now primarily for move planning or selecting actors.
      // The local visibility testing logic has been removed.
      const currentPlayerId = gamesStore.getCurrentPlayerId();
      const actorOnClickedHex = props.actors.find(actor => {
        const hexGridPos = OffsetCoord.roffsetFromCube(offsetType, clickedHex);
        return actor.pos.x === hexGridPos.row && actor.pos.y === hexGridPos.col && actor.owner === currentPlayerId;
      });

      if (selectedHexRef.value && actorOnClickedHex && actorOnClickedHex.owner === currentPlayerId) {
        // Cannot select another actor if one is already selected for a move.
        // Or, this could be logic for targeting if implementing attacks.
        console.log("An actor is already selected for move. Click the destination or deselect.");
        return;
      }

      if (actorOnClickedHex) { // If clicked on one of the current player's actors
        selectedHexRef.value = clickedHex; // Select this actor's hex as start of a move
        console.log("Selected actor on hex:", clickedHex, "Actor ID:", actorOnClickedHex.id);
      } else if (selectedHexRef.value) { // If an actor was previously selected, and now an empty hex is clicked
        const startHexGridPos = OffsetCoord.roffsetFromCube(offsetType, selectedHexRef.value);
        const endHexGridPos = OffsetCoord.roffsetFromCube(offsetType, clickedHex);

        const movingActor = props.actors.find(actor => {
            const actorStartOffset = OffsetCoord.roffsetFromCube(offsetType, selectedHexRef.value);
            return actor.pos.x === actorStartOffset.row && actor.pos.y === actorStartOffset.col;
        });

        if (movingActor) {
            const move: PlannedMove = {
                actorId: movingActor.id,
                startPos: { x: startHexGridPos.row, y: startHexGridPos.col }, // These are grid coords
                endPos: { x: endHexGridPos.row, y: endHexGridPos.col } // These are grid coords
            };
            emit('move-planned', move);
            console.log('Move planned:', move);
        }
        selectedHexRef.value = null; // Deselect after planning the move
      } else {
        // Clicked on an empty hex without prior selection, or an enemy actor's hex
        selectedHexRef.value = null; // Deselect any previously selected hex
        console.log("Clicked on hex:", clickedHex, ". No player actor selected or on this hex.");
      }
    };

    // handleHexRightClick is removed as local terrain editing is gone.
    // It could be repurposed for other actions like deselecting or cancelling a move.
    const handleHexRightClick = (hex: Hex) => {
        if (selectedHexRef.value && selectedHexRef.value.q === hex.q && selectedHexRef.value.r === hex.r) {
            selectedHexRef.value = null; // Deselect if right-clicked on the selected hex
            console.log("Deselected hex:", hex);
        } else {
            selectedHexRef.value = null; // General deselect on any right click for now
             console.log("Deselected via right click.");
        }
    };


    const handleSvgClick = (event: MouseEvent) => {
        if (event.target === event.currentTarget) { // Click on SVG background
            selectedHexRef.value = null;
            console.log('Clicked SVG background, deselected hex.');
        }
    };

    return {
      hexes,
      selectedHexRef,
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
}
</style>
