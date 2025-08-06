import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { FaPlane } from 'react-icons/fa';
import '../styles/DijkstraVisualizer.css';

/**
 * DijkstraVisualizer component for visualizing the shortest path between airports
 * @param {Object} props - Component props
 * @param {Array} props.path - Array of airport IDs representing the shortest path
 * @param {Array} props.airports - List of all airports with positions
 * @param {boolean} props.isPlaying - Whether the animation is playing
 * @param {number} props.progress - Current progress of the animation (0-1)
 * @param {number} props.currentStep - Current step in the path
 * @param {Object} props.planePosition - Current position of the plane
 * @param {Function} props.onComplete - Callback when animation completes
 * @returns {JSX.Element} DijkstraVisualizer component
 */
const DijkstraVisualizer = ({ 
  path = [], 
  airports = [],
  isPlaying = false,
  progress = 0,
  currentStep = 0,
  planePosition = null,
  onComplete = () => {}
}) => {
  // Create a map for quick lookup of airport positions
  const airportPositions = useMemo(() => {
    const positions = new Map();
    airports.forEach(airport => {
      if (airport.x !== undefined && airport.y !== undefined) {
        positions.set(String(airport.id), { x: airport.x, y: airport.y });
      }
    });
    return positions;
  }, [airports]);

  // Check if animation is complete
  useEffect(() => {
    if (path.length > 0 && currentStep >= path.length - 1) {
      onComplete();
    }
  }, [currentStep, path.length, onComplete]);

  // Calculate the current path to show progress
  const getVisiblePath = () => {
    if (path.length <= 1) return [];
    
    const visiblePath = [];
    
    // Add completed segments
    for (let i = 0; i < currentStep; i++) {
      const start = airportPositions.get(path[i]);
      const end = airportPositions.get(path[i + 1]);
      if (start && end) {
        visiblePath.push({
          id: `segment-${i}`,
          x1: start.x,
          y1: start.y,
          x2: end.x,
          y2: end.y,
          isActive: false,
          isCompleted: true
        });
      }
    }
    
    // Add current active segment
    if (currentStep < path.length - 1) {
      const start = airportPositions.get(path[currentStep]);
      const end = airportPositions.get(path[currentStep + 1]);
      
      if (start && end) {
        // Calculate end point based on progress
        const x2 = start.x + (end.x - start.x) * progress;
        const y2 = start.y + (end.y - start.y) * progress;
        
        visiblePath.push({
          id: 'active-segment',
          x1: start.x,
          y1: start.y,
          x2,
          y2,
          isActive: true,
          isCompleted: false
        });
      }
    }
    
    return visiblePath;
  };

  if (path.length <= 1) {
    return null;
  }

  const visiblePath = getVisiblePath();
  const currentAirport = path[currentStep] ? airportPositions.get(String(path[currentStep])) : null;
  const nextAirport = path[currentStep + 1] ? airportPositions.get(String(path[currentStep + 1])) : null;
  
  // Calculate plane position if not provided
  const planePos = planePosition || (() => {
    if (!currentAirport) return null;
    if (!nextAirport || !isPlaying) return currentAirport;
    
    return {
      x: currentAirport.x + (nextAirport.x - currentAirport.x) * progress,
      y: currentAirport.y + (nextAirport.y - currentAirport.y) * progress
    };
  })();
  
  // Calculate plane rotation
  const rotation = planePos ? getPlaneRotation(planePos, path, currentStep, airportPositions) : 0;
  
  return (
    <div className="dijkstra-visualizer">
      {/* Path visualization */}
      <svg className="path-layer">
        {visiblePath.map((segment, index) => (
          <line
            key={`${segment.id || index}`}
            x1={segment.x1}
            y1={segment.y1}
            x2={segment.x2}
            y2={segment.y2}
            className={`path-segment ${segment.isActive ? 'active' : ''} ${segment.isCompleted ? 'completed' : ''}`}
          />
        ))}
        
        {/* Current segment in progress */}
        {isPlaying && currentAirport && nextAirport && (
          <line
            x1={currentAirport.x}
            y1={currentAirport.y}
            x2={
              nextAirport.x * progress + 
              currentAirport.x * (1 - progress)
            }
            y2={
              nextAirport.y * progress + 
              currentAirport.y * (1 - progress)
            }
            className="path-segment active"
          />
        )}
      </svg>
      
      {/* Plane icon */}
      {planePos && (
        <div 
          className="plane-icon-container"
          style={{
            left: `${planePos.x}px`,
            top: `${planePos.y}px`,
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
            transition: 'transform 0.1s ease-out',
          }}
        >
          <FaPlane className="plane-icon" />
        </div>
      )}
      

    </div>
  );
};

// Helper function to calculate plane rotation based on direction
function getPlaneRotation(planePos, path, currentStep, airportPositions) {
  if (currentStep >= path.length - 1) return 0;
  
  const startId = path[currentStep];
  const endId = path[currentStep + 1];
  
  const start = airportPositions.get(startId);
  const end = airportPositions.get(endId);
  
  if (!start || !end) return 0;
  
  // Calculate angle in radians
  const angleRad = Math.atan2(end.y - start.y, end.x - start.x);
  // Convert to degrees and adjust for plane icon orientation
  return angleRad * (180 / Math.PI) + 45;
}

DijkstraVisualizer.propTypes = {
  path: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  airports: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string,
    x: PropTypes.number,
    y: PropTypes.number
  })),
  onComplete: PropTypes.func
};

export default DijkstraVisualizer;
