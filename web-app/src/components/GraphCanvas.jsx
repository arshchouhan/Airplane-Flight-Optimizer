import React, { useMemo, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { FaPlane, FaPlaneArrival, FaPlaneDeparture } from 'react-icons/fa';
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
  disabledAirports = new Set(),
  edgeDelays = {},
  onEdgeDelayChange = () => {}
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

  // State for selected edge
  const [selectedEdge, setSelectedEdge] = useState(null);

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
      delay: edgeDelays[route.id] || 0
    });
  }, [airports, edgeDelays]);
  
  // Handle delay changes from the modal
  const handleDelayChange = useCallback((edgeId, delay) => {
    onEdgeDelayChange(edgeId, delay);
    
    // You can add additional logic here to trigger path recalculation
    console.log(`Delay for edge ${edgeId} changed to ${delay} minutes`);
  }, [onEdgeDelayChange]);

  // Close modal
  const closeModal = useCallback(() => {
    setSelectedEdge(null);
  }, []);

  // Get delay class based on delay value
  const getDelayClass = useCallback((delay) => {
    if (!delay || delay <= 0) return '';
    if (delay <= 30) return 'delay-low';
    if (delay <= 60) return 'delay-medium';
    return 'delay-high';
  }, []);

  // Memoize route paths
  const routePaths = useMemo(() => {
    if (!normalizedAirports.length || !routes.length) return [];
    
    // Create a map for quick lookup
    const airportMap = new Map(normalizedAirports.map(ap => [ap.id, ap]));
    
    return routes
      .filter(route => {
        const source = airportMap.get(route.source);
        const target = airportMap.get(route.target);
        return source && target && source.x && source.y && target.x && target.y;
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
          delay,
          delayClass: getDelayClass(delay),
          isHighlighted
        };
      });
  }, [normalizedAirports, routes, highlightedPath, edgeDelays, getDelayClass]);

  // Check if a point is in the viewport
  const isInViewport = useCallback((x, y) => {
    return x >= 0 && x <= dimensions.width && 
           y >= 0 && y <= dimensions.height;
  }, [dimensions]);

  // Filter out airports outside the viewport
  const visibleAirports = useMemo(() => {
    return normalizedAirports.filter(airport => 
      isInViewport(airport.x, airport.y)
    );
  }, [normalizedAirports, isInViewport]);

  // Handle mouse events
  const handleAirportMouseEnter = (e, airport) => {
    onAirportHover(e, airport);
  };

  const handleAirportClick = (e, airport) => {
    e.stopPropagation();
    onAirportClick(airport);
  };

  const handleAirportContextMenu = (e, airport) => {
    e.preventDefault();
    onAirportRightClick(airport.id, e);
  };

  if (!dimensions.width || !dimensions.height) {
    return null;
  }

  return (
    <div className="graph-canvas">
      {selectedEdge && (
        <EdgeDetailsModal
          edge={selectedEdge}
          onClose={() => setSelectedEdge(null)}
          onDelayChange={handleDelayChange}
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
              className={`route ${route.isHighlighted ? 'highlighted' : ''} ${route.delayClass || ''}`}
              x1={route.x1}
              y1={route.y1}
              x2={route.x2}
              y2={route.y2}
              strokeWidth={route.isHighlighted ? 8 : 6}
              strokeLinecap="round"
            />
            
            {route.distance && (
              <g className="route-label-group">
                {/* Background for better readability */}
                <text
                  x={route.midX}
                  y={route.midY}
                  className={`route-label route-label-bg ${route.delayClass ? route.delayClass + '-bg' : ''}`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {route.distance} km{route.delay > 0 ? ` (+${route.delay}m)` : ''}
                </text>
                <text
                  x={route.midX}
                  y={route.midY}
                  className={`route-label ${route.delayClass ? route.delayClass + '-text' : ''}`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {route.distance} km{route.delay > 0 ? ` (+${route.delay}m)` : ''}
                </text>
              </g>
            )}
          </g>
        ))}
      </svg>

      {/* Airports - Rendered second in DOM but visually on top */}
      <div className="airports-layer">
        {visibleAirports.map(airport => {
          const isDisabled = disabledAirports.has(String(airport.id));
          const isHighlighted = highlightedPath.includes(airport.id);
          
          return (
            <div
              key={airport.id}
              className={`airport ${isHighlighted ? 'highlighted' : ''} ${isDisabled ? 'disabled' : ''}`}
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
              onMouseEnter={(e) => !isDisabled && handleAirportMouseEnter(e, airport)}
              onMouseLeave={() => onAirportHover(null)}
              onClick={(e) => !isDisabled && handleAirportClick(e, airport)}
              onContextMenu={(e) => handleAirportContextMenu(e, airport)}
              title={`${airport.name}${isDisabled ? ' (Right-click to enable)' : ' (Right-click to disable)'}`}
            >
              <FaPlane className="airport-icon" />
              {isHighlighted && (
                <div className="airport-pulse" />
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
    target: PropTypes.string.isRequired
  })),
  dimensions: PropTypes.shape({
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired
  }),
  onAirportHover: PropTypes.func,
  onAirportClick: PropTypes.func,
  highlightedPath: PropTypes.arrayOf(PropTypes.string)
};

export default GraphCanvas;
