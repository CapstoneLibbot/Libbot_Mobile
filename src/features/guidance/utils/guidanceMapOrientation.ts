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
