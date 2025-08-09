import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import useGraphData from '../hooks/useGraphData';
import { normalizeCoordinates } from '../utils/projection';
import GraphCanvas from './GraphCanvas';
import Tooltip from './Tooltip';
import PlaneAnimation from './PlaneAnimation';
import AnimationControls from './AnimationControls';
import '../styles/Grid.css';

const Grid = () => {
  // Use the custom hook to fetch graph data
  const { airports, routes, isLoading, error } = useGraphData();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    airport: null
  });
  const [selectedAirports, setSelectedAirports] = useState([]);
  const [shortestPath, setShortestPath] = useState([]);
  const [disabledAirports, setDisabledAirports] = useState(new Set());
  const [edgeDelays, setEdgeDelays] = useState({});

  const containerRef = useRef(null);

  // Update container dimensions
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      setDimensions({
        width: newWidth,
        height: newHeight
      });
    }
  }, []);

  // Handle window resize and initial load
  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  // Handle airport hover for tooltip
  const handleAirportHover = (e, airport) => {
    if (!airport) {
      setTooltip(prev => ({ ...prev, visible: false }));
      return;
    }
    
    const rect = e?.target?.getBoundingClientRect();
    if (!rect) return;
    
    setTooltip({
      visible: true,
      x: rect.left + (rect.width / 2) + window.scrollX,
      y: rect.top + window.scrollY - 10, // Position above the pin
      airport: airport
    });
  };
  
  // Handle right-click on airport (toggle disabled state)
  const handleAirportRightClick = useCallback((airportId, event) => {
    event.preventDefault(); // Prevent context menu
    setDisabledAirports(prev => {
      const newDisabled = new Set(prev);
      if (newDisabled.has(airportId)) {
        newDisabled.delete(airportId);
      } else {
        newDisabled.add(airportId);
      }
      return newDisabled;
    });
    
    // Clear path if it includes the toggled airport
    if (shortestPath.includes(String(airportId)) || 
        selectedAirports.some(a => String(a.id) === String(airportId))) {
      setShortestPath([]);
    }
  }, [selectedAirports, shortestPath]);
  
  // Handle edge delay change from GraphCanvas
  const handleEdgeDelayChange = useCallback((edgeId, delay) => {
    setEdgeDelays(prev => ({
      ...prev,
      [edgeId]: delay
    }));
    
    // Clear the current path since delays have changed
    if (shortestPath.length > 0) {
      setShortestPath([]);
    }
  }, [shortestPath]);

  // Handle airport click for selection
  const handleAirportClick = useCallback((airport) => {
    // Don't select disabled airports
    if (disabledAirports.has(String(airport.id))) {
      return;
    }
    
    setSelectedAirports(prev => {
      // If clicking the same airport, deselect it
      if (prev.some(a => a.id === airport.id)) {
        return prev.filter(a => a.id !== airport.id);
      }
      
      // If we already have 2 selected, replace the oldest one
      if (prev.length >= 2) {
        return [...prev.slice(1), airport];
      }
      
      // Add the new selection
      return [...prev, airport];
    });
    
    // Reset animation state when selecting new airports
    if (shortestPath.length > 0) {
      setShortestPath([]);
    }
  }, [shortestPath.length]);
  
  // Create a function to get the effective weight of an edge (distance + delay)
  const getEdgeWeight = useCallback((source, target) => {
    // Find the route between source and target
    const route = routes.find(r => 
      (String(r.source) === source && String(r.target) === target) ||
      (String(r.source) === target && String(r.target) === source)
    );
    
    if (!route) return Infinity;
    
    // Get the delay for this route (in minutes, convert to km equivalent)
    // Assuming an average flight speed of 800 km/h, so 1 minute ≈ 13.33 km
    const delayInKm = (edgeDelays[`${route.source}-${route.target}`] || 0) * 13.33;
    
    // Total weight is distance plus delay converted to km
    return route.distance + delayInKm;
  }, [routes, edgeDelays]);

  // Find shortest path between selected airports
  useEffect(() => {
    console.log('Selected airports:', selectedAirports);
    if (selectedAirports.length !== 2) {
      console.log('Not enough airports selected, clearing path');
      setShortestPath([]);
      return;
    }
    
    // Skip if either selected airport is disabled
    if (disabledAirports.has(selectedAirports[0]?.id) || 
        disabledAirports.has(selectedAirports[1]?.id)) {
      console.log('One or both selected airports are disabled');
      setShortestPath([]);
      return;
    }
    
    // Dijkstra's algorithm to find shortest path based on distance + delay
    const [start, end] = selectedAirports;
    console.log('Finding shortest path from', start, 'to', end);
    
    const startNode = String(start.id);
    const endNode = String(end.id);
    
    // Create a map to store the shortest distance to each node
    const distances = {};
    // Create a map to store the previous node in the optimal path
    const previous = {};
    // Create a priority queue (using an array for simplicity)
    const unvisited = new Set();
    
    // Initialize distances to infinity and previous nodes to null
    airports.forEach(airport => {
      const id = String(airport.id);
      distances[id] = Infinity;
      previous[id] = null;
      unvisited.add(id);
    });
    
    // Distance from start to start is 0
    distances[startNode] = 0;
    
    while (unvisited.size > 0) {
      // Find the unvisited node with the smallest distance
      let current = null;
      let smallestDistance = Infinity;
      
      for (const node of unvisited) {
        if (distances[node] < smallestDistance) {
          smallestDistance = distances[node];
          current = node;
        }
      }
      
      // If we can't find a node or we've reached the end, we're done
      if (current === null || current === endNode) {
        break;
      }
      
      // Remove current node from unvisited set
      unvisited.delete(current);
      
      // Find all neighbors of current node
      const neighbors = [
        ...routes
          .filter(r => String(r.source) === current && !disabledAirports.has(String(r.target)))
          .map(r => ({
            id: String(r.target),
            weight: getEdgeWeight(current, String(r.target))
          })),
        ...routes
          .filter(r => String(r.target) === current && !disabledAirports.has(String(r.source)))
          .map(r => ({
            id: String(r.source),
            weight: getEdgeWeight(current, String(r.source))
          }))
      ];
      
      // Update distances to neighbors
      for (const neighbor of neighbors) {
        if (!unvisited.has(neighbor.id)) continue;
        
        const distance = distances[current] + neighbor.weight;
        
        if (distance < distances[neighbor.id]) {
          distances[neighbor.id] = distance;
          previous[neighbor.id] = current;
        }
      }
    }
    
    // Reconstruct the path
    const path = [];
    let current = endNode;
    
    if (previous[current] || current === startNode) {
      while (current) {
        path.unshift(current);
        current = previous[current];
      }
    }
    
    if (path.length > 0) {
      console.log('Found shortest path:', path, 'with distance:', distances[endNode]);
      setShortestPath(path);
    } else {
      console.log('No path found from', startNode, 'to', endNode);
      setShortestPath([]);
    }
  }, [selectedAirports, routes]);
  
  // Normalize airport coordinates for rendering
  const normalizedAirports = useMemo(() => {
    console.log('Original airports:', airports);
    if (!airports.length) {
      console.log('No airports to normalize');
      return [];
    }
    
    // Add detailed logging for coordinates
    const withCoords = airports.map(airport => {
      const hasPosition = airport.position && 
                        typeof airport.position.lat !== 'undefined' && 
                        typeof airport.position.lon !== 'undefined';
      
      if (!hasPosition) {
        console.warn('Airport missing or invalid position data:', {
          id: airport.id,
          name: airport.name,
          position: airport.position
        });
      } else {
        console.log('Airport coordinates:', {
          id: airport.id,
          name: airport.name,
          lat: airport.position.lat,
          lon: airport.position.lon
        });
      }
      
      return {
        ...airport,
        lat: hasPosition ? airport.position.lat : null,
        lng: hasPosition ? airport.position.lon : null
      };
    });
    
    console.log('Coordinates before normalization:', withCoords.map(a => ({
      id: a.id,
      name: a.name,
      lat: a.lat,
      lng: a.lng
    })));
    
    const normalized = normalizeCoordinates(withCoords, dimensions);
    console.log('Normalized airports:', normalized);
    return normalized;
  }, [airports, dimensions]);

  // Log container dimensions
  useEffect(() => {
    if (dimensions.width && dimensions.height) {
      console.log('Container dimensions:', dimensions);
    }
  }, [dimensions]);

  // Log when routes change
  useEffect(() => {
    console.log('Routes count:', routes.length);
  }, [routes]);
  
  // Auto-play the animation when a path is found
  useEffect(() => {
    if (shortestPath.length > 1) {
      // Auto-play the animation when a new path is set
      const timer = setTimeout(() => {
        // Animation will play automatically
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shortestPath]);

  // Create a map of airport ID to IATA code for easy lookup
  const airportCodeMap = useMemo(() => {
    const map = new Map();
    airports.forEach(airport => {
      map.set(String(airport.id), airport.iata || String(airport.id));
    });
    return map;
  }, [airports]);

  // Helper function to calculate flight time in minutes (including delays)
  const calculateFlightTime = useCallback((distance, delay = 0) => {
    // Assuming 800 km/h average speed
    const flightTime = Math.round((distance / 800) * 60);
    return flightTime + (delay || 0);
  }, []);

  // Format time as "Xh Ym" or "Xm" if less than 60 minutes
  const formatTime = useCallback((minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
  }, []);

  // Calculate statistics for the info panel
  const stats = useMemo(() => {
    console.log('Updating stats:', { 
      selectedAirportsCount: selectedAirports.length,
      shortestPathLength: shortestPath.length,
      shortestPath: shortestPath
    });

    let totalDistance = 0;
    let totalTime = 0;
    
    if (shortestPath.length > 1) {
      totalDistance = shortestPath.slice(1).reduce((sum, targetId, i) => {
        const sourceId = shortestPath[i];
        const route = routes.find(r => 
          (Number(r.source) === Number(sourceId) && Number(r.target) === Number(targetId)) || 
          (Number(r.source) === Number(targetId) && Number(r.target) === Number(sourceId))
        );
        
        if (route) {
          const routeId = `${route.source}-${route.target}`;
          const delay = edgeDelays[routeId] || 0;
          totalTime += calculateFlightTime(route.distance, delay);
          return sum + route.distance;
        }
        return sum;
      }, 0);
    }

    return {
      totalAirports: airports.length,
      totalRoutes: routes.length,
      selectedAirportCount: selectedAirports.length,
      pathLength: shortestPath.length > 0 ? shortestPath.length - 1 : 0,
      totalDistance,
      totalTime
    };
  }, [airports.length, routes, selectedAirports.length, shortestPath, edgeDelays, calculateFlightTime]);

  return (
    <div className="grid-page">
      {/* Left Panel */}
      <div className="left-panel">
        <div className="panel-header">
          <h2>Flight Path Finder</h2>
        </div>
        
        <div className="panel-section">
          <h3>Airport Network</h3>
          <div className="info-row">
            <span>Total Airports:</span>
            <span className="highlight">{stats.totalAirports}</span>
          </div>
          <div className="info-row">
            <span>Total Routes:</span>
            <span className="highlight">{stats.totalRoutes}</span>
          </div>
        </div>

        <div className="panel-section">
          <h3>Selection</h3>
          <div className="info-row">
            <span>Selected:</span>
            <span className="highlight">{stats.selectedAirportCount}/2</span>
          </div>
          
          {selectedAirports.length > 0 && (
            <div className="selected-airports">
              {selectedAirports.map((airport, index) => (
                <div key={airport.id} className="selected-airport">
                  <div className="airport-header">
                    <span className="airport-index">{index + 1}.</span>
                    <span className="airport-code">{airport.iata || airport.id}</span>
                  </div>
                  <div className="airport-name">{airport.name}</div>
                </div>
              ))}
            </div>
          )}
          
          {stats.pathLength > 0 && (
            <div className="path-info">
              <div className="info-row">
                <span>Path Length:</span>
                <span className="highlight">{stats.pathLength} stops</span>
              </div>
              <div className="info-row">
                <span>Total Distance:</span>
                <span className="highlight">{stats.totalDistance.toLocaleString()} km</span>
              </div>
              <div className="info-row">
                <span>Total Time:</span>
                <span className="highlight">{formatTime(stats.totalTime)}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="panel-section">
          <h3>Instructions</h3>
          <ul className="instructions-list">
            <li>• Click to select departure/arrival</li>
            <li>• Right-click to disable/enable airports</li>
            <li>• Select 2 airports to find the shortest path</li>
          </ul>
        </div>
      </div>
      
      <div className="main-content">
        <div className="grid-container" ref={containerRef}>
        {isLoading ? (
          <div className="loading-overlay">
            <div className="loading-spinner" />
            <p>Loading airport data...</p>
          </div>
        ) : error ? (
          <div className="error-message">
            <p>Error loading data: {error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        ) : (
          <>
            <GraphCanvas 
              airports={normalizedAirports.map(airport => ({
                ...airport,
                id: airport.iata || String(airport.id)
              }))}
              routes={routes.map(route => ({
                ...route,
                source: airportCodeMap.get(String(route.source)) || String(route.source),
                target: airportCodeMap.get(String(route.target)) || String(route.target)
              }))}
              dimensions={dimensions}
              onAirportHover={handleAirportHover}
              onAirportClick={handleAirportClick}
              onAirportRightClick={handleAirportRightClick}
              highlightedPath={shortestPath}
              disabledAirports={disabledAirports}
              edgeDelays={edgeDelays}
              onEdgeDelayChange={handleEdgeDelayChange}
            />
            
            {/* Plane Animation - Wrapped in a container with proper z-index */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 5, // Ensure it's above the grid but below tooltips/controls
              display: shortestPath.length > 1 ? 'block' : 'none' // Hide when no path
            }}>
              <PlaneAnimation
                key={shortestPath.join('-')}
                path={shortestPath}
                airports={normalizedAirports}
                speed={2}
                isPlaying={true}
                onComplete={() => {
                  console.log('Animation completed');
                }}
              />
            </div>
            
            <Tooltip 
              visible={tooltip.visible}
              x={tooltip.x}
              y={tooltip.y}
              airport={tooltip.airport}
            />
            

          </>
        )}
        </div>
        <div className="watermark">
          <span>Airport Route Visualizer</span>
        </div>
      </div>
    </div>
  );
};

export default Grid;
