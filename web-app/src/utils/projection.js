/**
 * Projects grid coordinates to screen coordinates with increased spacing
 * @param {number} x - X coordinate (0-100)
 * @param {number} y - Y coordinate (0-100)
 * @param {Object} dimensions - Container dimensions {width, height}
 * @returns {Object} Projected coordinates {x, y}
 */
export const project = (x, y, dimensions) => {
  // Increase margin to 20% for better spacing and to prevent cutoff
  const margin = 0.2;
  const marginX = dimensions.width * margin;
  const marginY = dimensions.height * margin;
  
  // Apply a larger scaling factor to spread out points more
  const scaleFactor = 1.5; // Larger factor = more space between points
  
  // Scale from 0-100 to container dimensions with margins and scaling
  const scaleX = ((dimensions.width - 2 * marginX) / 100) * scaleFactor;
  const scaleY = ((dimensions.height - 2 * marginY) / 100) * scaleFactor;
  
  // Center the points in the container
  const offsetX = (dimensions.width - (100 * scaleX)) / 2;
  const offsetY = (dimensions.height - (100 * scaleY)) / 2;
  
  return {
    x: x * scaleX + offsetX,
    y: y * scaleY + offsetY
  };
};

/**
 * Normalizes coordinates to fit within the container
 * @param {Array} coordinates - Array of {position: {x, y}} objects
 * @param {Object} dimensions - Container dimensions {width, height}
 * @returns {Array} Normalized coordinates array with x,y positions
 */
export const normalizeCoordinates = (coordinates, dimensions) => {
  if (!coordinates || coordinates.length === 0) return [];
  
  return coordinates.map(coord => {
    if (!coord.position?.x || !coord.position?.y) {
      console.warn('Coordinate missing position data:', coord);
      return { ...coord, x: 0, y: 0 };
    }
    
    // Project the grid coordinates to screen space
    const { x, y } = project(coord.position.x, coord.position.y, dimensions);
    
    return {
      ...coord,
      x,
      y
    };
  });
};
