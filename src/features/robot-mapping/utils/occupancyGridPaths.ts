import type { LiveOccupancyGrid } from "../types/robotMapping.types";

export interface OccupancyGridPaths {
  free: string;
  occupied: string;
}

/** Convert ROS's bottom-up row-major cells into compact SVG paths. */
export function buildOccupancyGridPaths(grid: LiveOccupancyGrid): OccupancyGridPaths {
  let free = "";
  let occupied = "";

  for (let screenY = 0; screenY < grid.height; screenY += 1) {
    const sourceRow = (grid.height - screenY - 1) * grid.width;
    let runStart = 0;
    let runKind = cellKind(grid.data[sourceRow] ?? -1);

    for (let x = 1; x <= grid.width; x += 1) {
      const nextKind = x === grid.width
        ? "unknown"
        : cellKind(grid.data[sourceRow + x] ?? -1);
      if (nextKind === runKind) continue;

      if (runKind !== "unknown") {
        const runWidth = x - runStart;
        const path = `M${runStart} ${screenY}h${runWidth}v1h-${runWidth}z`;
        if (runKind === "free") free += path;
        else occupied += path;
      }

      runStart = x;
      runKind = nextKind;
    }
  }

  return { free, occupied };
}

function cellKind(value: number): "unknown" | "free" | "occupied" {
  if (value < 0) return "unknown";
  return value >= 50 ? "occupied" : "free";
}
