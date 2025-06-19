<template>
  <svg :viewBox="viewBox" @click="handleSvgClick"> <!-- Changed click handler to svg specific -->
    <g v-for="(hex, index) in hexes" :key="index" :transform="getHexTransform(hex)" @click.stop="handleHexClick(hex)"> <!-- Added click per hex, with stop propagation -->
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
import { defineComponent, PropType, computed, ref } from 'vue'; // Added ref
import { World, Terrain } from '../../../lib/service/Models'; // Assuming Terrain might still be used or can be cleaned up if not
import { Hex, Point, Layout, OffsetCoord } from '../../../lib/Hex';
import { Actor, PlannedMove, Coord } from '../../../stores/Games.store'; // Added imports

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
    const selectedActorId = ref<number | null>(null); // For selected actor ID
    const plannedMoves = ref<PlannedMove[]>([]); // For storing planned moves

    const hexes = computed(() => {
      const h: Hex[] = [];
      if (!props.world.terrain) return h;
      for (let r_offset = 0; r_offset < props.world.terrain.length; r_offset++) {
        const rowTerrain = props.world.terrain[r_offset];
        for (let q_offset = 0; q_offset < rowTerrain.length; q_offset++) {
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
      if (props.world.terrain && row >= 0 && row < props.world.terrain.length && col >= 0 && col < props.world.terrain[row].length) {
        return props.world.terrain[row][col];
      }
      return null;
    };

    const getHexStyle = (hex: Hex): HexStyle => {
      const style: HexStyle = {};
      const terrainType = getTerrainTypeForHex(hex);

      // Only set fill based on terrain. Selection styling is handled by CSS class.
      switch (terrainType) {
        case Terrain.BLOCKED:
          style.fill = '#5D6D7E'; // Darker grey for blocked
          break;
        case Terrain.EMPTY:
          style.fill = '#EAECEE'; // Lighter grey for empty
          break;
        default:
          style.fill = 'transparent'; // Should not happen for known terrain
          break;
      }
      return style;
    };

    const getHexClass = (hex: Hex): string[] => {
        const classes = ['hex-polygon'];
        const terrainType = getTerrainTypeForHex(hex);

        // Add class for terrain type
        if (terrainType === Terrain.EMPTY) classes.push('terrain-empty');
        if (terrainType === Terrain.BLOCKED) classes.push('terrain-blocked');

        // Class for selected actor's hex
        if (selectedActorId.value !== null) {
            const actor = props.actors.find(a => a.id === selectedActorId.value);
            if (actor && actor.pos.x === hex.q && actor.pos.y === hex.r) { // Assuming actor.pos.x is q, actor.pos.y is r
                classes.push('selected-actor');
            }
        }

        // Class for planned paths (start and end hexes)
        plannedMoves.value.forEach(move => {
            if ((move.startPos.x === hex.q && move.startPos.y === hex.r) || (move.endPos.x === hex.q && move.endPos.y === hex.r)) {
                classes.push('planned-path');
            }
        });

        // Previous selection logic based on selectedHexRef (can be removed or adapted)
        if (selectedHexRef.value && selectedHexRef.value.q === hex.q && selectedHexRef.value.r === hex.r && selectedHexRef.value.s === hex.s) {
            classes.push('selected'); // This might be redundant if selected-actor is more specific
        }
        return classes;
    };

    const getHexText = (hex: Hex): string => {
      // Display actor ID on hex if present
      const actor = props.actors.find(a => a.pos.x === hex.q && a.pos.y === hex.r); // Assuming actor.pos.x is q, actor.pos.y is r
      if (actor) {
        return `A:${actor.id}`;
      }
      return `${hex.q},${hex.r}`;
    }
    const getHexFontSize = (): number => layout.size.x / 3.8;

    const handleHexClick = (hex: Hex) => {
      // Assuming actor.pos.x is q and actor.pos.y is r for direct comparison with hex.q, hex.r
      const actorAtHex = props.actors.find(actor => actor.pos.x === hex.q && actor.pos.y === hex.r);

      if (selectedActorId.value !== null) {
        const selectedActor = props.actors.find(a => a.id === selectedActorId.value);
        if (!selectedActor) { // Should not happen if selectedActorId is valid
            selectedActorId.value = null;
            return;
        }

        // Case 1: Clicked on the selected actor's hex again (deselect)
        if (actorAtHex && actorAtHex.id === selectedActorId.value) {
          console.log(`Deselected actor ID: ${selectedActorId.value}`);
          selectedActorId.value = null;
        }
        // Case 2: Selected an actor, and clicked on an empty hex (plan move)
        else if (!actorAtHex) {
          const newPlannedMove: PlannedMove = {
            actorId: selectedActorId.value,
            // Assuming selectedActor.pos is already the correct axial Coord {x,y} for {q,r}
            startPos: { x: selectedActor.pos.x, y: selectedActor.pos.y },
            endPos: { x: hex.q, y: hex.r },
          };
          plannedMoves.value.push(newPlannedMove);
          emit('move-planned', newPlannedMove);
          console.log('Planned move:', newPlannedMove);
          selectedActorId.value = null; // Reset selection after planning a move
        }
        // Case 3: Selected an actor, and clicked on another actor's hex (do nothing or switch selection - current: do nothing)
        else if (actorAtHex && actorAtHex.id !== selectedActorId.value) {
            console.log(`Cannot move to hex occupied by another actor (ID: ${actorAtHex.id}). Click actor to select, or empty hex to move.`);
            // Optionally, could switch selectedActorId.value = actorAtHex.id here
        }
      } else {
        // Case 4: No actor selected, try to select one
        if (actorAtHex) {
          selectedActorId.value = actorAtHex.id;
          console.log(`Selected actor ID: ${actorAtHex.id}`);
        } else {
          // Clicked on an empty hex with no actor selected (do nothing or handle as map interaction)
          selectedHexRef.value = hex; // Keep this for general hex selection feedback if needed
          const offsetCoord = OffsetCoord.roffsetFromCube(offsetType, hex);
          console.log('Clicked empty hex (axial):', hex.q, hex.r, hex.s, `- Terrain Index (offset col,row): ${offsetCoord.col},${offsetCoord.row}`);
        }
      }
    };

    const handleSvgClick = (event: MouseEvent) => {
        if (event.target === event.currentTarget) {
            selectedHexRef.value = null;
            selectedActorId.value = null; // Also deselect actor on background click
            console.log('Clicked SVG background, deselected hex and actor.');
        }
    };

    return {
      hexes,
      selectedHexRef,
      selectedActorId, // Expose selectedActorId
      plannedMoves,    // Expose plannedMoves
      viewBox,
      getHexPoints,
      getHexTransform,
      getHexStyle,
      getHexClass,
      getHexText,
      getHexFontSize,
      handleHexClick,
      handleSvgClick,
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
/* If getHexStyle is preferred for fill, these can be removed or be supplementary */
.terrain-empty {
  /* fill: #EAECEE; */ /* Example if using class-based fill */
}
.terrain-blocked {
  /* fill: #5D6D7E; */ /* Example if using class-based fill */
}

.hex-text {
  pointer-events: none; /* Text should not block clicks on the polygon */
  fill: #2c3e50; /* Darker text color for better contrast */
  font-weight: 500; /* Slightly bolder text */
  font-family: 'Arial', sans-serif; /* Consistent font */
}
</style>
