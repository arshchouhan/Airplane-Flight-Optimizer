/**
 * Projects grid coordinates to screen coordinates
 * @param {number} x - X coordinate (0-100)
 * @param {number} y - Y coordinate (0-100)
 * @param {Object} dimensions - Container dimensions {width, height}
 * @returns {Object} Projected coordinates {x, y}
 */
export const project = (x, y, dimensions) => {
  // Add 10% margin
  const margin = 0.1;
  const marginX = dimensions.width * margin;
  const marginY = dimensions.height * margin;
  
  // Scale from 0-100 to container dimensions with margins
  const scaleX = (dimensions.width - 2 * marginX) / 100;
  const scaleY = (dimensions.height - 2 * marginY) / 100;
  
  return {
    x: x * scaleX + marginX,
    y: y * scaleY + marginY
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
