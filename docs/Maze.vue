<template>
  <div>
    <canvas ref="canvas" :width="canvasWidth" :height="canvasHeight"></canvas>
    <button @click="generateMaze">Generate Maze</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      mazeSize: 184,
      cellSize: 4,
      maze: [],
      canvasWidth: 0,
      canvasHeight: 0
    }
  },
  mounted() {
    this.canvasWidth = this.mazeSize * this.cellSize;
    this.canvasHeight = this.mazeSize * this.cellSize;
    this.$refs.canvas.width = this.canvasWidth;
    this.$refs.canvas.height = this.canvasHeight;
    this.generateMaze();
  },
  methods: {
    generateMaze() {
      // Set start and end points
      const startX = 0;
      const startY = 0;
      const endX = this.mazeSize - 1;
      const endY = this.mazeSize - 1;
      
      // Initialize maze
      this.maze = new Array(this.mazeSize).fill(null).map(() => new Array(this.mazeSize).fill(1));
      this.maze[startX][startY] = 0;
      this.maze[endX][endY] = 0;
      
      // Generate maze using depth-first search
      const stack = [ [startX, startY] ];
      while (stack.length > 0) {
        const [x, y] = stack.pop();
        if (this.maze[x][y] === 1) {
          this.maze[x][y] = 0;
          const neighbors = this.getUnvisitedNeighbors(x, y);
          if (neighbors.length > 0) {
            stack.push([x, y]);
            const [nextX, nextY] = neighbors[Math.floor(Math.random() * neighbors.length)];
            stack.push([nextX, nextY]);
          }
        }
      }
      
      // Draw maze on canvas
      const canvas = this.$refs.canvas;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < this.mazeSize; i++) {
        for (let j = 0; j < this.mazeSize; j++) {
          if (this.maze[i][j] === 1) {
            ctx.fillStyle = '#000000';
          } else {
            ctx.fillStyle = '#ffffff';
          }
          ctx.fillRect(i * this.cellSize, j * this.cellSize, this.cellSize, this.cellSize);
        }
      }
    },
    getUnvisitedNeighbors(x, y) {
      const neighbors = [];
      if (x > 0 && this.maze[x-1][y] === 1) {
        neighbors.push([x-1, y]);
      }
      if (x < this.mazeSize-1 && this.maze[x+1][y] === 1) {
        neighbors.push([x+1, y]);
      }
      if (y > 0 && this.maze[x][y-1] === 1) {
        neighbors.push([x, y-1]);
      }
      if (y < this.mazeSize-1 && this.maze[x][y+1] === 1) {
        neighbors.push([x, y+1]);
      }
      return neighbors;
    }
  }
}
</script>
