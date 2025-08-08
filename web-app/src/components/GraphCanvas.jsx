import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FaPlane } from 'react-icons/fa';
import { normalizeCoordinates } from '../utils/projection';
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
  disabledAirports = new Set()
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
        const isHighlighted = highlightedPath.includes(route.source) && 
                            highlightedPath.includes(route.target);
        
        // Calculate midpoint for label positioning
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        
        return {
          id: `${route.source}-${route.target}`,
          x1: source.x,
          y1: source.y,
          x2: target.x,
          y2: target.y,
          midX,
          midY,
          distance: route.distance, // Use the distance from graph.json
          isHighlighted
        };
      });
  }, [normalizedAirports, routes, highlightedPath]);

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
      {/* Routes */}
      <svg 
        className="routes-layer" 
        width={dimensions.width} 
        height={dimensions.height}
      >
        {routePaths.map(route => (
          <g key={route.id}>
            <line
              x1={route.x1}
              y1={route.y1}
              x2={route.x2}
              y2={route.y2}
              className={`route ${route.isHighlighted ? 'highlighted' : ''}`}
            />
            {route.distance && (
              <text
                x={route.midX}
                y={route.midY}
                className="route-label"
                textAnchor="middle"
                dy=".3em"
                style={{
                  fill: '#fff',
                  fontSize: '10px',
                  textShadow: '0 0 3px #000',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  fontWeight: 'bold',
                  paintOrder: 'stroke',
                  stroke: '#000',
                  strokeWidth: '2px',
                  strokeLinecap: 'butt',
                  strokeLinejoin: 'miter',
                }}
              >
                {route.distance}km
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Airports */}
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
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                zIndex: 10,
                opacity: isDisabled ? 0.5 : 1,
                filter: isDisabled ? 'grayscale(100%)' : 'none',
              }}
              onMouseEnter={(e) => !isDisabled && handleAirportMouseEnter(e, airport)}
              onMouseLeave={() => onAirportHover(null)}
              onClick={(e) => !isDisabled && handleAirportClick(e, airport)}
              onContextMenu={(e) => handleAirportContextMenu(e, airport)}
              title={isDisabled ? 'Right-click to enable' : 'Right-click to disable'}
            >
              <FaPlane size={24} color="white" />
              {isHighlighted && (
                <div className="airport-pulse" />
              )}
              <span className="airport-code">{airport.id}</span>
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
