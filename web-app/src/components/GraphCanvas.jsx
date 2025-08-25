import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FaPlane, FaPlaneArrival, FaPlaneDeparture, FaInfoCircle } from 'react-icons/fa';
import { normalizeCoordinates } from '../utils/projection';
import EdgeDetailsModal from './EdgeDetailsModal';
import '../styles/GraphCanvas.css';

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
  edgeFrequencies = {},
  edgeDistances = {},
  onEdgeDelayChange = () => {},
  onEdgeFrequencyChange = () => {},
  onEdgeDistanceChange = () => {},
  onEdgeTimeChange = () => {},
  onEdgeTimeUpdate = () => {},
  isEdgeDrawMode = false,
  selectedAirportsForEdge = [],
  showHeuristics = false,
  selectedAlgorithm = null,
  showToast = () => {},
  isAirportEditMode = false,
  visualizationMode = 'plane',
  isPlaneAnimating = false,
  showVisualization = false
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
    
    if (!selectedAlgorithm) {
      showToast('Please select a pathfinding algorithm first', 'warning');
      return;
    }
    
    console.log('Edge clicked:', route);
    // Block edge selection/modification while plane is animating
    if (isPlaneAnimating) {
      showToast && showToast('Cannot edit/select edges during plane animation', 'warning');
      return;
    }
    // Block edge selection in any network management mode
    if (isAirportEditMode || isEdgeDrawMode) {
      showToast && showToast('Cannot select or edit edges while in Network Management modes', 'warning');
      return;
    }
    // Block edge selection during active algorithm visualization
    if (visualizationMode === 'algorithm' && showVisualization) {
      showToast && showToast('Cannot select or edit edges during visualization', 'warning');
      return;
    }
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
  }, [airports, edgeDelays, selectedAlgorithm, showToast, isPlaneAnimating]);

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

  // Handle distance changes from the modal
  const handleDistanceChange = useCallback((edgeId, distance) => {
    console.log(`Distance for edge ${edgeId} changed to ${distance} km`);
    if (onEdgeDistanceChange) {
      onEdgeDistanceChange(edgeId, distance);
    }
    // Keep the modified edge selected to show its new distance
    // This will hide other edge details but keep the modified edge visible
  }, [onEdgeDistanceChange]);

  // Handle time changes from the modal
  const handleTimeChange = useCallback((edgeId, time) => {
    console.log(`Time for edge ${edgeId} changed to ${time} minutes`);
    if (onEdgeTimeChange) {
      onEdgeTimeChange(edgeId, time);
    }
    // Clear edge selection to hide other edge details
    setSelectedEdge(null);
  }, [onEdgeTimeChange]);

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
    
    // Build directed pairs from the highlighted path to detect true backtracking
    // Example: path A->B->C->B means the pair B->C is a reverse of earlier C->B
    const pathPairs = [];
    for (let i = 0; i < (highlightedPath?.length || 0) - 1; i++) {
      const u = highlightedPath[i];
      const v = highlightedPath[i + 1];
      pathPairs.push(`${u}-${v}`);
    }
    
    const seenDirected = new Set();
    const reverseEdgeSet = new Set(); // holds directed pairs that are true backtracks (reverse of an earlier pair)
    const pathPairSet = new Set(pathPairs); // quick lookup of used directed pairs
    
    for (const pair of pathPairs) {
      const [u, v] = pair.split('-');
      const opposite = `${v}-${u}`;
      if (seenDirected.has(opposite)) {
        // This pair is a reverse traversal of an earlier segment; mark as back edge
        reverseEdgeSet.add(pair);
      }
      seenDirected.add(pair);
    }

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
        
        // Determine highlight classes strictly from directed usage/backtracking
        const dirA = `${route.source}-${route.target}`;
        const dirB = `${route.target}-${route.source}`;
        const usedA = pathPairSet.has(dirA);
        const usedB = pathPairSet.has(dirB);
        // True backtrack means the directed pair was seen as reverse of an earlier pair
        const isReverse = reverseEdgeSet.has(dirA) || reverseEdgeSet.has(dirB);
        // Forward highlight when used in either direction but not marked as reverse backtrack
        const isForward = (usedA && !reverseEdgeSet.has(dirA)) || (usedB && !reverseEdgeSet.has(dirB));
        const isHighlighted = isForward || isReverse;
        
        // Calculate midpoint for label positioning
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        
        // Check if this edge has a custom distance
        const hasCustomDistance = edgeDistances && (edgeDistances[routeId] !== undefined || edgeDistances[`${route.target}-${route.source}`] !== undefined);
        
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
          isHighlighted,
          isHighlightedForward: isForward,
          isHighlightedReverse: isReverse,
          hasCustomDistance
        };
      });
  }, [normalizedAirports, routes, highlightedPath, edgeDelays, edgeDistances, getDelayClass]);

  // Check if a point is in the viewport
  const isInViewport = useCallback((x, y) => {
    return x >= 0 && x <= dimensions.width && 
           y >= 0 && y <= dimensions.height;
  }, [dimensions]);

  // Heuristic calculation for A* algorithm has been removed
  
  // Calculate airport business level based on frequency changes
  const getAirportBusiness = useCallback((airportId) => {
    let totalFrequency = 0;
    let routeCount = 0;
    
    // Check all routes connected to this airport
    Object.entries(edgeFrequencies).forEach(([edgeId, frequency]) => {
      const [source, target] = edgeId.split('-');
      if (source === airportId || target === airportId) {
        totalFrequency += frequency;
        routeCount++;
      }
    });
    
    if (routeCount === 0) return 'normal';
    const avgFrequency = totalFrequency / routeCount;
    
    if (avgFrequency >= 5) return 'very-busy';
    if (avgFrequency >= 3) return 'busy';
    if (avgFrequency >= 2) return 'moderate';
    return 'normal';
  }, [edgeFrequencies]);

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
    <div className={`graph-canvas ${isAirportEditMode ? 'edit-mode' : ''} ${isEdgeDrawMode ? 'edge-draw-mode' : ''} ${visualizationMode === 'algorithm' ? 'algorithm-mode' : ''}`} onMouseLeave={handleAirportLeave}>
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
          onDistanceChange={handleDistanceChange}
          onTimeChange={handleTimeChange}
          onTimeUpdate={handleTimeUpdate}
          showToast={showToast}
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
          zIndex: 1,
          pointerEvents: 'auto'
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
              style={{ pointerEvents: (isPlaneAnimating || isAirportEditMode || isEdgeDrawMode || (visualizationMode === 'algorithm' && showVisualization)) ? 'none' : 'auto' }}
            />
            
            {/* Visual route line */}
            <line
              className={`route ${route.isHighlightedForward ? 'highlighted' : ''} ${route.isHighlightedReverse ? 'highlighted-reverse' : ''} ${route.delayClass || ''} ${visualizationMode === 'algorithm' || visualizationMode === 'plane' ? 'faded' : ''}`}
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
            
            {route.distance && !showHeuristics && !(selectedAlgorithm && selectedAirports.length === 2) && !selectedEdge && (
              // Show all labels when no modifications exist, OR show labels for modified edges only
              (Object.keys(edgeDelays).length === 0 && Object.keys(edgeFrequencies).length === 0 && Object.keys(edgeDistances || {}).length === 0) ||
              (edgeDelays[route.id] !== undefined || edgeFrequencies[route.id] !== undefined || edgeDistances?.[route.id] !== undefined)
            ) && (
              <g className="route-label-group">
                {/* Background for better readability */}
                <text
                  x={route.midX}
                  y={route.midY - 10}
                  className={`route-label route-label-bg ${route.delayClass ? route.delayClass + '-bg' : ''} ${route.hasCustomDistance ? 'custom-distance-bg' : ''}`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {route.delay > 0 ? `${route.distance + (route.delay * 10)} km (${route.delay}m delay)` : `${route.distance} km`}
                </text>
                <text
                  x={route.midX}
                  y={route.midY - 10}
                  className={`route-label ${route.delayClass ? route.delayClass + '-text' : ''} ${route.hasCustomDistance ? 'custom-distance-text' : ''}`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {route.delay > 0 ? `${route.distance + (route.delay * 10)} km (${route.delay}m delay)` : `${route.distance} km`}
                </text>
                
                {/* Flight frequency indicator - text only */}
                <g className={`frequency-indicator ${route.frequencyClass} ${route.delay > 0 ? 'has-delay' : ''}`}>
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
                    {route.frequency}/day
                  </text>
                </g>
                
              </g>
            )}
          </g>
        ))}
        
      </svg>

      {/* Airports - Rendered second in DOM but visually on top */}
      <div className="airports-layer">
        {visibleAirports.map(airport => {
          const isHighlighted = highlightedPath.includes(airport.id);
          const isDisabled = disabledAirports.has(airport.id);
          const businessLevel = getAirportBusiness(airport.id);
          
          return (
            <div
              key={airport.id}
              className={`airport ${isHighlighted ? 'highlighted' : ''} ${isDisabled ? 'disabled' : ''} ${selectedAirports.some(a => a.id === airport.id) ? 'selected' : ''} ${selectedAirportsForEdge.includes(airport.originalId || airport.id) ? 'selected-for-edge' : ''} ${businessLevel}`}
              style={{
                left: `${airport.x}px`,
                top: `${airport.y}px`,
                transform: 'translate(-50%, -50%)',
                position: 'absolute',
                zIndex: 10,
                cursor: isDisabled ? 'not-allowed' : (!selectedAlgorithm ? 'not-allowed' : 'pointer'),
                opacity: isDisabled ? 0.3 : 1,
                filter: isDisabled ? 'grayscale(100%)' : 'none',
                transition: 'all 0.5s ease-in-out',
                pointerEvents: 'auto',
              }}
              onMouseEnter={() => handleAirportHover(airport)}
              onMouseLeave={handleAirportLeave}
              onClick={(e) => handleAirportClick(e, airport)}
              onContextMenu={(e) => handleAirportContextMenu(e, airport)}
              title={`Airport ${airport.id}${isDisabled ? ' (Right-click to enable)' : ' (Right-click to disable)'}`}
            >
              <FaPlane className="airport-icon" />
              {isHighlighted && (
                <div className="airport-pulse" />
              )}
              
              {/* Business level indicators */}
              {businessLevel === 'moderate' && (
                <div className="business-indicator moderate">
                  <div className="crow crow-1">✈</div>
                  <div className="crow crow-2">✈</div>
                </div>
              )}
              {businessLevel === 'busy' && (
                <div className="business-indicator busy">
                  <div className="crow crow-1">✈</div>
                  <div className="crow crow-2">✈</div>
                  <div className="crow crow-3">✈</div>
                  <div className="crow crow-4">✈</div>
                </div>
              )}
              {businessLevel === 'very-busy' && (
                <div className="business-indicator very-busy">
                  <div className="crow crow-1">✈</div>
                  <div className="crow crow-2">✈</div>
                  <div className="crow crow-3">✈</div>
                  <div className="crow crow-4">✈</div>
                  <div className="crow crow-5">✈</div>
                  <div className="crow crow-6">✈</div>
                </div>
              )}
              
              {/* A* heuristic visualization has been removed */}
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
  isPlaneAnimating: PropTypes.bool
};

export default GraphCanvas;
