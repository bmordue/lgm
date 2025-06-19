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
import { World, Terrain } from '../../../lib/service/Models';
import { Hex, Point, Layout, OffsetCoord } from '../../../lib/Hex';

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
  },
  setup(props) {
    const offsetType = OffsetCoord.ODD;
    const selectedHexRef = ref<Hex | null>(null);

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

        if (selectedHexRef.value && selectedHexRef.value.q === hex.q && selectedHexRef.value.r === hex.r && selectedHexRef.value.s === hex.s) {
            classes.push('selected');
        }
        return classes;
    };


    const getHexText = (hex: Hex): string => `${hex.q},${hex.r}`;
    const getHexFontSize = (): number => layout.size.x / 3.8;

    const handleHexClick = (hex: Hex) => {
      selectedHexRef.value = hex;
      const offsetCoord = OffsetCoord.roffsetFromCube(offsetType, hex);
      console.log('Clicked hex (axial):', hex.q, hex.r, hex.s, `- Terrain Index (offset col,row): ${offsetCoord.col},${offsetCoord.row}`);
    };

    const handleSvgClick = (event: MouseEvent) => {
        // This handler is for clicks on the SVG background, not on a hex
        // It can be used to deselect a hex, for example
        if (event.target === event.currentTarget) { // ensure click was directly on SVG, not propagated from a hex
            selectedHexRef.value = null;
            console.log('Clicked SVG background, deselected hex.');
        }
    };

    return {
      hexes,
      selectedHexRef, // Expose for template if needed, though direct manipulation is via methods
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
  transition: fill-opacity 0.2s ease-in-out, stroke-width 0.2s ease-in-out;
}

.hex-polygon:hover {
  fill-opacity: 0.8; /* Make hex slightly more transparent on hover */
}

.hex-polygon.selected {
    stroke: #c0392b; /* A strong red for selection stroke */
    stroke-width: 2.5; /* Clearly thicker stroke */
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
