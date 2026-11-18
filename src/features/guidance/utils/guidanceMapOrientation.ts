export interface MapDisplayBounds {
  width: number;
  height: number;
}

/**
 * Finds the dominant axis of known occupancy cells and rotates that axis to
 * the horizontal display axis. The source grid remains unchanged.
 */
export function inferHorizontalRotationAngle(
  width: number,
  height: number,
  cells?: number[],
): number {
  if (
    width <= 0 ||
    height <= 0 ||
    !cells ||
    cells.length !== width * height
  ) {
    return 0;
  }

  const sampleStep = Math.max(1, Math.ceil(Math.sqrt((width * height) / 40_000)));
  let count = 0;
  let sumX = 0;
  let sumY = 0;

  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      if ((cells[y * width + x] ?? -1) < 0) continue;
      count += 1;
      sumX += x;
      sumY += height - y - 1;
    }
  }

  if (count < 2) return 0;

  const meanX = sumX / count;
  const meanY = sumY / count;
  let varianceX = 0;
  let varianceY = 0;
  let covariance = 0;

  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      if ((cells[y * width + x] ?? -1) < 0) continue;
      const deltaX = x - meanX;
      const deltaY = height - y - 1 - meanY;
      varianceX += deltaX * deltaX;
      varianceY += deltaY * deltaY;
      covariance += deltaX * deltaY;
    }
  }

  varianceX /= count;
  varianceY /= count;
  covariance /= count;

  const spread = Math.sqrt((varianceX - varianceY) ** 2 + 4 * covariance ** 2);
  const largestVariance = (varianceX + varianceY + spread) / 2;
  const smallestVariance = (varianceX + varianceY - spread) / 2;
  if (
    largestVariance <= 0 ||
    (smallestVariance > 0 && largestVariance / smallestVariance < 1.18)
  ) {
    return 0;
  }

  const longAxisAngle = 0.5 * Math.atan2(2 * covariance, varianceX - varianceY);
  // PCA uses occupancy coordinates whose Y axis is inverted from SVG's Y axis.
  // Applying this sign in SVG space aligns the dominant axis horizontally.
  return longAxisAngle;
}

export function getRotatedMapBounds(
  width: number,
  height: number,
  angle: number,
): MapDisplayBounds {
  const cosine = Math.abs(Math.cos(angle));
  const sine = Math.abs(Math.sin(angle));
  return {
    width: cosine * width + sine * height,
    height: sine * width + cosine * height,
  };
}

export function rotateMapPixel(
  point: { x: number; y: number },
  mapWidth: number,
  mapHeight: number,
  angle: number,
  bounds = getRotatedMapBounds(mapWidth, mapHeight, angle),
): { x: number; y: number } {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const deltaX = point.x - mapWidth / 2;
  const deltaY = point.y - mapHeight / 2;
  return {
    x: bounds.width / 2 + cosine * deltaX - sine * deltaY,
    y: bounds.height / 2 + sine * deltaX + cosine * deltaY,
  };
}

export interface ContentBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculates the tight bounding box containing the room walls, landmarks and endpoints,
 * with comfortable padding for labels, avoiding huge empty borders around the room.
 */
export function getContentBoundingBox(
  mapWidth: number,
  mapHeight: number,
  angle: number,
  bounds: MapDisplayBounds,
  cells?: number[],
  obstacles?: { pixelX: number; pixelY: number; pixelWidth: number; pixelHeight: number }[],
  extraPixels?: { x: number; y: number }[],
): ContentBoundingBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const update = (px: number, py: number) => {
    if (Number.isFinite(px) && Number.isFinite(py)) {
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
  };

  // Sample occupied cells (value >= 65)
  if (cells && cells.length === mapWidth * mapHeight) {
    const step = Math.max(1, Math.floor(mapWidth / 120));
    for (let row = 0; row < mapHeight; row += step) {
      const rowOffset = row * mapWidth;
      const y = mapHeight - row - 1;
      for (let col = 0; col < mapWidth; col += step) {
        if ((cells[rowOffset + col] ?? 0) >= 65) {
          const pt = rotateMapPixel({ x: col, y }, mapWidth, mapHeight, angle, bounds);
          update(pt.x, pt.y);
        }
      }
    }
  } else if (obstacles && obstacles.length > 0) {
    for (const obs of obstacles) {
      for (const corner of [
        { x: obs.pixelX, y: obs.pixelY },
        { x: obs.pixelX + obs.pixelWidth, y: obs.pixelY + obs.pixelHeight },
      ]) {
        const pt = rotateMapPixel(corner, mapWidth, mapHeight, angle, bounds);
        update(pt.x, pt.y);
      }
    }
  }

  // Include extra points (endpoints, robot, destination)
  if (extraPixels && extraPixels.length > 0) {
    for (const pixel of extraPixels) {
      const pt = rotateMapPixel(pixel, mapWidth, mapHeight, angle, bounds);
      update(pt.x, pt.y);
    }
  }

  // Fallback if no wall or endpoint points found
  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || maxX <= minX || maxY <= minY) {
    return { x: 0, y: 0, width: bounds.width, height: bounds.height };
  }

  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const padX = Math.max(3, spanX * 0.04);
  const padY = Math.max(3, spanY * 0.04);

  const x = Math.max(0, minX - padX);
  const y = Math.max(0, minY - padY);
  const width = Math.min(bounds.width - x, spanX + padX * 2);
  const height = Math.min(bounds.height - y, spanY + padY * 2);

  return { x, y, width, height };
}
