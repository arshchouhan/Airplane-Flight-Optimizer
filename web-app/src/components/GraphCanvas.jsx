import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FaPlane, FaPlaneArrival, FaPlaneDeparture, FaInfoCircle } from 'react-icons/fa';
import { normalizeCoordinates } from '../utils/projection';
import EdgeDetailsModal from './EdgeDetailsModal';
import '../styles/GraphCanvas.css';
import '../styles/HeuristicVisualization.css';

// Heuristic function - Euclidean distance between two points
function calculateHeuristic(pointA, pointB) {
  if (!pointA || !pointB) return 0;
  const dx = pointA.x - pointB.x;
  const dy = pointA.y - pointB.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * GraphCanvas component for rendering airports and routes
 * @param {Object} props - Component props
 * @param {Array} props.airports - List of airports
 * @param {Array} props.routes - List of routes
 * @param {Object} props.dimensions - Container dimensions {width, height}
 * @param {Function} props.onAirportHover - Callback when hovering over an airport
 * @param {Function} props.onAirportClick - Callback when clicking an airport
 * @param {Array} props.highlightedPath - List of airport IDs in the highlighted path
 * @returns {JSX.Element} GraphCanvas component
 */
// Function to get color based on heuristic value
const getHeuristicColor = (value) => {
  // Colors from close (green) to far (red)
  const colors = [
    '#10B981', // Green (close)
    '#34D399',
    '#6EE7B7',
    '#A7F3D0',
    '#FDE68A', // Yellow (medium)
    '#FCD34D',
    '#FBBF24',
    '#F59E0B',
    '#F97316', // Orange
    '#EF4444'  // Red (far)
  ];
  
  // Normalize value between 0-1
  const normalized = Math.min(Math.max(value / 100, 0), 1);
  const index = Math.floor(normalized * (colors.length - 1));
  return colors[index];
};

const GraphCanvas = ({
  airports = [],
  routes = [],
  dimensions = { width: 0, height: 0 },
  onAirportHover = () => {},
  onAirportClick = () => {},
  onAirportRightClick = () => {},
  highlightedPath = [],
  selectedAirports = [],
  disabledAirports = new Set(),
  edgeDelays = {},
  onEdgeDelayChange = () => {},
  onEdgeFrequencyChange = () => {},
  visualizationMode = 'plane', // 'plane' or 'algorithm'
  selectedAlgorithm = null // Add selectedAlgorithm prop
}) => {
  // Normalize airport coordinates to fit the container
  const normalizedAirports = useMemo(() => {
    if (!airports.length) return [];
    return normalizeCoordinates(
      airports.map(airport => ({
        ...airport,
        lat: airport.position?.lat,
        lng: airport.position?.lon
      })),
      dimensions
    );
  }, [airports, dimensions]);

  // State for selected edge and hovered airport
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [hoveredAirport, setHoveredAirport] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [edgeTimes, setEdgeTimes] = useState({});
  const tooltipRef = useRef(null);
  
  // Update tooltip position based on mouse movement
  const handleMouseMove = useCallback((e) => {
    if (hoveredAirport) {
      setTooltipPosition({
        x: e.clientX + 10,
        y: e.clientY + 10
      });
    }
  }, [hoveredAirport]);
  
  // Add/remove mousemove event listener
  useEffect(() => {
    if (hoveredAirport) {
      window.addEventListener('mousemove', handleMouseMove);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [hoveredAirport, handleMouseMove]);

  // Handle edge click
  const handleEdgeClick = useCallback((e, route) => {
    e.stopPropagation();
    console.log('Edge clicked:', route);
    setSelectedEdge({
      ...route,
      // Add source and target names for the modal
      sourceName: airports.find(a => a.id === route.source)?.name || `Airport ${route.source}`,
      targetName: airports.find(a => a.id === route.target)?.name || `Airport ${route.target}`,
      // Initialize delay if it exists, otherwise default to 0
      delay: edgeDelays[route.id] || 0,
      // Initialize times if they exist
      departureTime: edgeTimes[route.id]?.departureTime || '08:00',
      arrivalTime: edgeTimes[route.id]?.arrivalTime || '10:00'
    });
  }, [airports, edgeDelays, edgeTimes]);
  
  // Handle delay changes from the modal
  const handleDelayChange = useCallback((edgeId, delay) => {
    onEdgeDelayChange(edgeId, delay);
    console.log(`Delay for edge ${edgeId} changed to ${delay} minutes`);
  }, [onEdgeDelayChange]);

  // Handle time updates from the modal
  const handleTimeUpdate = useCallback((edgeId, times) => {
    setEdgeTimes(prev => ({
      ...prev,
      [edgeId]: {
        ...prev[edgeId],
        ...times
      }
    }));
    
    console.log(`Times updated for edge ${edgeId}:`, times);
    
    // You can add additional logic here to trigger path recalculation
    // based on the new times if needed
  }, []);
  
  // Handle frequency changes from the modal
  const handleFrequencyChange = useCallback((edgeId, frequency) => {
    if (onEdgeFrequencyChange) {
      onEdgeFrequencyChange(edgeId, frequency);
      console.log(`Frequency for edge ${edgeId} changed to ${frequency} flights/day`);
    }
  }, [onEdgeFrequencyChange]);

  // Close modal
  const closeModal = useCallback(() => {
    setSelectedEdge(null);
  }, []);

  // Get delay class based on delay value
  const getDelayClass = useCallback((delay) => {
    if (!delay || delay === 0) return '';
    if (delay < 15) return 'delay-low';
    if (delay < 30) return 'delay-medium';
    return 'delay-high';
  }, []);
  
  // Prevent animation on highlighted elements
  useEffect(() => {
    // Add a global style to ensure no animations on highlighted paths
    const style = document.createElement('style');
    style.textContent = `
      .route.highlighted {
        animation: none !important;
        transition: stroke-width 0.3s ease !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Get frequency class based on frequency value
  const getFrequencyClass = useCallback((frequency) => {
    if (!frequency || frequency <= 0) return 'frequency-none';
    if (frequency <= 3) return 'frequency-low';
    if (frequency <= 7) return 'frequency-medium';
    return 'frequency-high';
  }, []);

  // Memoize route paths
  const routePaths = useMemo(() => {
    if (!normalizedAirports.length || !routes || !routes.length) return [];
    
    // Create a map for quick lookup
    const airportMap = new Map(normalizedAirports.map(ap => [ap.id, ap]));
    
    return routes
      .filter(route => {
        if (!route || !route.source || !route.target) return false;
        const source = airportMap.get(route.source);
        const target = airportMap.get(route.target);
        return source && target && 
               typeof source.x === 'number' && 
               typeof source.y === 'number' &&
               typeof target.x === 'number' &&
               typeof target.y === 'number';
      })
      .map(route => {
        const source = airportMap.get(route.source);
        const target = airportMap.get(route.target);
        const routeId = `${route.source}-${route.target}`;
        const delay = edgeDelays[routeId] || 0;
        
        // Check if this route is part of the highlighted path
        const sourceIndex = highlightedPath.indexOf(route.source);
        const targetIndex = highlightedPath.indexOf(route.target);
        const isHighlighted = sourceIndex >= 0 && 
                            targetIndex >= 0 && 
                            Math.abs(sourceIndex - targetIndex) === 1;
        
        // Calculate midpoint for label positioning
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        
        return {
          id: routeId,
          source: route.source,
          target: route.target,
          x1: source.x,
          y1: source.y,
          x2: target.x,
          y2: target.y,
          midX,
          midY,
          distance: route.distance, // Use the distance from graph.json
          frequency: route.frequency || 1, // Default to 1 if not specified
          delay,
          delayClass: getDelayClass(delay),
          frequencyClass: getFrequencyClass(route.frequency || 1),
          isHighlighted
        };
      });
  }, [normalizedAirports, routes, highlightedPath, edgeDelays, getDelayClass]);

  // Check if a point is in the viewport
  const isInViewport = useCallback((x, y) => {
    return x >= 0 && x <= dimensions.width && 
           y >= 0 && y <= dimensions.height;
  }, [dimensions]);

  // Calculate heuristics for airports when A* algorithm is selected// Calculate heuristic values for all nodes to display
  const airportHeuristics = useMemo(() => {
    // Only calculate heuristics for A* algorithm with a selected target
    if (selectedAlgorithm !== 'astar' || selectedAirports.length < 2) {
      return {};
    }
    
    const endAirport = selectedAirports[1]; // Target airport
    const heuristics = {};
    
    // Find min and max heuristic values to normalize for color gradient
    let minH = Infinity;
    let maxH = 0;
    
    // First pass - calculate all values and find min/max
    normalizedAirports.forEach(airport => {
      // Calculate Euclidean distance (heuristic) between this airport and the target
      const h = calculateHeuristic(
        { x: airport.x, y: airport.y },
        { x: endAirport.x, y: endAirport.y }
      );
      
      minH = Math.min(minH, h);
      maxH = Math.max(maxH, h);
      
      // Store the raw value and a formatted value for display
      heuristics[airport.id] = {
        value: h,
        formatted: h.toFixed(0) // Round to integer for display
      };
    });
    
    // Second pass - add normalized value for color gradient
    normalizedAirports.forEach(airport => {
      const h = heuristics[airport.id]?.value || 0;
      if (maxH !== minH) {
        heuristics[airport.id].normalized = (h - minH) / (maxH - minH);
      } else {
        heuristics[airport.id].normalized = 0;
      }
    });
    
    return heuristics;
  }, [selectedAlgorithm, selectedAirports, normalizedAirports]);
  
  // Filter out airports outside the viewport
  const visibleAirports = useMemo(() => {
    return normalizedAirports.filter(airport => 
      isInViewport(airport.x, airport.y)
    );
  }, [normalizedAirports, isInViewport]);

  // Handle airport hover
  const handleAirportHover = useCallback((airport) => {
    onAirportHover(airport);
    setHoveredAirport(airport);
  }, [onAirportHover]);
  
  // Handle mouse leave from airport
  const handleAirportLeave = useCallback(() => {
    setHoveredAirport(null);
  }, []);

  const handleAirportMouseEnter = (e, airport) => {
    onAirportHover(e, airport);
  };

  const handleAirportClick = (e, airport) => {
    e.stopPropagation();
    onAirportClick(e, airport);
  };

  const handleAirportContextMenu = (e, airport) => {
    e.preventDefault();
    onAirportRightClick(airport.id, e);
  };

  if (!dimensions.width || !dimensions.height) {
    return null;
  }

  return (
    <div className="graph-canvas" onMouseLeave={handleAirportLeave}>
      {/* Airport Tooltip */}
      {hoveredAirport && (
        <div 
          ref={tooltipRef}
          className="airport-tooltip"
          style={{
            position: 'fixed',
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            zIndex: 1000,
            pointerEvents: 'none',
            transform: 'translateY(-100%)',
            transition: 'opacity 0.2s, transform 0.1s',
            opacity: hoveredAirport ? 1 : 0
          }}
        >
          <div className="tooltip-content">
            <h4>{hoveredAirport.name || 'Unknown Airport'}</h4>
            <div className="tooltip-details">
              <div className="code-badges">
                <span className="code-badge iata">
                  <strong>IATA</strong>
                  <span className="code-value">{hoveredAirport.iata || 'N/A'}</span>
                </span>
                <span className="code-badge icao">
                  <strong>ICAO</strong>
                  <span className="code-value">{hoveredAirport.icao || 'N/A'}</span>
                </span>
              </div>
              {hoveredAirport.city && <div><strong>City:</strong> {hoveredAirport.city}</div>}
              {hoveredAirport.country && <div><strong>Country:</strong> {hoveredAirport.country}</div>}
              {hoveredAirport.elevation !== undefined && (
                <div><strong>Elevation:</strong> {hoveredAirport.elevation} ft</div>
              )}
            </div>
          </div>
        </div>
      )}
      {selectedEdge && (
        <EdgeDetailsModal
          edge={selectedEdge}
          onClose={() => setSelectedEdge(null)}
          onDelayChange={handleDelayChange}
          onFrequencyChange={handleFrequencyChange}
          onTimeUpdate={handleTimeUpdate}
        />
      )}
      {/* Routes - Rendered first in DOM but visually behind airports */}
      <svg 
        className="routes-layer" 
        width={dimensions.width}
        height={dimensions.height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1
        }}
      >
        {routePaths.map(route => (
          <g key={route.id} className="route-group">
            {/* Thick transparent clickable area */}
            <line
              x1={route.x1}
              y1={route.y1}
              x2={route.x2}
              y2={route.y2}
              className="clickable-route"
              onClick={(e) => handleEdgeClick(e, route)}
              data-route-id={`${route.source}-${route.target}`}
            />
            
            {/* Visual route line */}
            <line
              className={`route ${route.isHighlighted ? 'highlighted' : ''} ${route.delayClass || ''} ${visualizationMode === 'algorithm' ? 'faded' : ''}`}
              x1={route.x1}
              y1={route.y1}
              x2={route.x2}
              y2={route.y2}
              strokeWidth={route.isHighlighted ? 8 : 6}
              strokeLinecap="round"
              style={{
                animation: 'none',
                pointerEvents: 'none'
              }}
            />
            
            {route.distance && (
              <g className="route-label-group">
                {/* Background for better readability */}
                <text
                  x={route.midX}
                  y={route.midY - 10}
                  className={`route-label route-label-bg ${route.delayClass ? route.delayClass + '-bg' : ''}`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {route.distance} km{route.delay > 0 ? ` (+${route.delay}m)` : ''}
                </text>
                <text
                  x={route.midX}
                  y={route.midY - 10}
                  className={`route-label ${route.delayClass ? route.delayClass + '-text' : ''}`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {route.distance} km{route.delay > 0 ? ` (+${route.delay}m)` : ''}
                </text>
                
                {/* Flight frequency indicator */}
                <g className={`frequency-indicator ${route.frequencyClass} ${route.delay > 0 ? 'has-delay' : ''}`}>
                  {Array.from({ length: Math.min(route.frequency || 1, 10) }).map((_, i) => (
                    <circle
                      key={i}
                      cx={route.midX - 15 + (i * 5)}
                      cy={route.midY + 10}
                      r={route.delay > 0 ? 3 : 2}
                      fill={route.delay > 0 ? '#ef4444' : 'currentColor'}
                      stroke={route.delay > 0 ? '#fff' : 'none'}
                      strokeWidth={route.delay > 0 ? 0.5 : 0}
                    />
                  ))}
                  <text
                    x={route.midX + 20}
                    y={route.midY + 12}
                    className={`frequency-text ${route.delay > 0 ? 'has-delay' : ''}`}
                    textAnchor="start"
                    dominantBaseline="middle"
                    style={{
                      fill: route.delay > 0 ? '#ef4444' : 'currentColor',
                      fontWeight: route.delay > 0 ? 'bold' : 'normal'
                    }}
                  >
                    {route.frequency || 1}/day
                    {route.delay > 0 && ` (${route.delay}m)`}
                  </text>
                </g>
                
                {/* Delay indicator */}
                {route.delay > 0 && (
                  <g>
                    <circle 
                      cx={route.midX} 
                      cy={route.midY} 
                      r={10} 
                      fill="rgba(255,0,0,0.7)" 
                    />
                    <text 
                      x={route.midX} 
                      y={route.midY} 
                      textAnchor="middle" 
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="10px"
                      fontWeight="bold"
                    >
                      {route.delay}
                    </text>
                  </g>
                )}
              </g>
            )}
          </g>
        ))}
      </svg>

      {/* Airports - Rendered second in DOM but visually on top */}
      <div className="airports-layer">
        {normalizedAirports.map(airport => {
          const isDisabled = disabledAirports.has(String(airport.id));
          const isHighlighted = highlightedPath.includes(airport.id);
          
          return (
            <div
              key={airport.id}
              className={`airport ${isHighlighted ? 'highlighted' : ''} ${isDisabled ? 'disabled' : ''} ${selectedAirports.some(a => a.id === airport.id) ? 'selected' : ''}`}
              style={{
                left: `${airport.x}px`,
                top: `${airport.y}px`,
                transform: 'translate(-50%, -50%)',
                position: 'absolute',
                zIndex: 10,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.5 : 1,
                filter: isDisabled ? 'grayscale(100%)' : 'none',
              }}
              onMouseEnter={() => handleAirportHover(airport)}
              onMouseLeave={handleAirportLeave}
              onClick={(e) => handleAirportClick(e, airport)}
              onContextMenu={(e) => handleAirportContextMenu(e, airport)}
              title={`${airport.name}${isDisabled ? ' (Right-click to enable)' : ' (Right-click to disable)'}`}
            >
              <FaPlane className="airport-icon" />
              {isHighlighted && (
                <div className="airport-pulse" />
              )}
              
              {/* Enhanced heuristic visualization for A* algorithm */}
              {selectedAlgorithm === 'astar' && airportHeuristics[airport.id] && (
                <div className="heuristic-visualization">
                  {/* Main heuristic label with value */}
                  <div className="heuristic-label" style={{
                    position: 'absolute',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    color: '#FFFFFF',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: 20,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    border: '1px solid #8B5CF6'
                  }}>
                    h={airportHeuristics[airport.id].formatted}
                  </div>
                  
                  {/* Visual line showing estimated distance to target */}
                  {selectedAirports.length >= 2 && (
                    <svg style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                      zIndex: 5,
                      overflow: 'visible'
                    }}>
                      {/* Dashed line showing heuristic distance to target */}
                      <line 
                        x1="0"
                        y1="0"
                        x2={selectedAirports[1].x - airport.x}
                        y2={selectedAirports[1].y - airport.y}
                        className="heuristic-line"
                        style={{
                          stroke: '#8B5CF6',
                          strokeWidth: isHighlighted ? '2px' : '1.5px',
                          strokeDasharray: '3,2',
                          strokeOpacity: isHighlighted ? 0.9 : 0.4,
                          transform: 'translate(0, 0)',
                          transformOrigin: 'center',
                          strokeDashoffset: 0
                        }}
                      />
                      {/* Arrow indicating direction of heuristic */}
                      <polygon 
                        points="0,0 -3,-6 3,-6"
                        style={{
                          fill: '#8B5CF6',
                          opacity: isHighlighted ? 0.9 : 0.6,
                          transform: `translate(${(selectedAirports[1].x - airport.x)/2}px, ${(selectedAirports[1].y - airport.y)/2}px) rotate(${Math.atan2(selectedAirports[1].y - airport.y, selectedAirports[1].x - airport.x) * (180/Math.PI)}deg)`,
                          transformOrigin: 'center'
                        }}
                      />
                    </svg>
                  )}
                  
                  {/* Circular indicator showing heuristic weight */}
                  <div 
                    className="heuristic-dot"
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      left: '-8px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: `radial-gradient(circle, 
                        ${getHeuristicColor(airportHeuristics[airport.id].value)} 0%, 
                        rgba(0,0,0,0.7) 100%)`,
                      boxShadow: `0 0 5px ${getHeuristicColor(airportHeuristics[airport.id].value)}`,
                      border: '1px solid rgba(255,255,255,0.5)',
                      opacity: isHighlighted ? 1 : 0.85,
                      zIndex: 15
                    }} 
                    title={`Heuristic: ${airportHeuristics[airport.id].formatted}`}
                  />
                  
                  {/* Optional: Mini heuristic formula visualization */}
                  {isHighlighted && (
                    <div style={{
                      position: 'absolute',
                      bottom: '-24px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'rgba(0, 0, 0, 0.85)',
                      color: '#FFFFFF',
                      padding: '2px 5px',
                      borderRadius: '3px',
                      fontSize: '9px',
                      whiteSpace: 'nowrap',
                      fontFamily: 'monospace',
                      zIndex: 25,
                      border: '1px solid #8B5CF6'
                    }}>
                      f = g + h({airportHeuristics[airport.id].formatted})
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

GraphCanvas.propTypes = {
  airports: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string,
    position: PropTypes.shape({
      lat: PropTypes.number,
      lon: PropTypes.number
    }),
    routes: PropTypes.array
  })),
  routes: PropTypes.arrayOf(PropTypes.shape({
    source: PropTypes.string.isRequired,
    target: PropTypes.string.isRequired,
    frequency: PropTypes.number
  })),
  dimensions: PropTypes.shape({
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired
  }),
  onAirportHover: PropTypes.func,
  onAirportClick: PropTypes.func,
  onAirportRightClick: PropTypes.func,
  onEdgeDelayChange: PropTypes.func,
  onEdgeFrequencyChange: PropTypes.func,
  selectedAirports: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string
  })),
  highlightedPath: PropTypes.arrayOf(PropTypes.string),
  disabledAirports: PropTypes.instanceOf(Set),
  edgeDelays: PropTypes.object,
  visualizationMode: PropTypes.oneOf(['plane', 'algorithm']),
  selectedAlgorithm: PropTypes.string // Added selectedAlgorithm prop type
};

export default GraphCanvas;
