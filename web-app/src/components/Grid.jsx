import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import useGraphData from '../hooks/useGraphData';
import { normalizeCoordinates } from '../utils/projection';
import GraphCanvas from './GraphCanvas';
import Tooltip from './Tooltip';
import DijkstraVisualizer from './DijkstraVisualizer';
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(2); // 1-5
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
  
  // Handle airport click for selection
  const handleAirportClick = useCallback((airport) => {
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
      setIsPlaying(false);
    }
  }, [shortestPath.length]);
  
  // Find shortest path between selected airports
  useEffect(() => {
    console.log('Selected airports:', selectedAirports);
    if (selectedAirports.length !== 2) {
      console.log('Not enough airports selected, clearing path');
      setShortestPath([]);
      return;
    }
    
    // Simple BFS to find shortest path (replace with your Dijkstra's implementation)
    const [start, end] = selectedAirports;
    console.log('Finding path from', start, 'to', end);
    
    // Ensure we're using string IDs for the path
    const startNode = String(start.id);
    const endNode = String(end.id);
    const queue = [[startNode]];
    const visited = new Set();
    
    console.log('Starting BFS with queue:', queue);
    
    while (queue.length > 0) {
      const path = queue.shift();
      const node = path[path.length - 1];
      
      console.log('Visiting node:', node, 'with path:', path);
      
      if (node === endNode) {
        console.log('Found path:', path);
        setShortestPath(path);
        return;
      }
      
      if (!visited.has(node)) {
        visited.add(node);
        
        // Find all connected airports
        const outbound = routes.filter(r => String(r.source) === node).map(r => String(r.target));
        const inbound = routes.filter(r => String(r.target) === node).map(r => String(r.source));
        const connections = [...outbound, ...inbound];
        
        console.log('  Connections from', node + ':', connections);
        
        // Add new paths to queue
        connections.forEach(neighbor => {
          if (!visited.has(neighbor)) {
            const newPath = [...path, neighbor];
            console.log('  Adding to queue:', newPath);
            queue.push(newPath);
          }
        });
      }
    }
    
    console.log('No path found from', startNode, 'to', endNode);
    setShortestPath([]);
    
    // If we get here, no path was found
    setShortestPath([]);
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

  // Create a map of airport ID to IATA code for easy lookup
  const airportCodeMap = useMemo(() => {
    const map = new Map();
    airports.forEach(airport => {
      map.set(String(airport.id), airport.iata || String(airport.id));
    });
    return map;
  }, [airports]);

  // Calculate statistics for the info panel
  const stats = useMemo(() => {
    console.log('Updating stats:', { 
      selectedAirportsCount: selectedAirports.length,
      shortestPathLength: shortestPath.length,
      shortestPath: shortestPath
    });
    return {
      totalAirports: airports.length,
      totalRoutes: routes.length,
      selectedAirportCount: selectedAirports.length,
      pathLength: shortestPath.length > 0 ? shortestPath.length - 1 : 0
    };
  }, [airports.length, routes.length, selectedAirports.length, shortestPath]);

  return (
    <div className="grid-page">
      {/* Info Panel */}
      <div className="info-panel">
        <div className="info-section">
          <h4>Airports</h4>
          <div className="info-row">
            <span>Total:</span>
            <span>{stats.totalAirports}</span>
          </div>
          <div className="info-row">
            <span>Selected:</span>
            <span>{stats.selectedAirportCount}/2</span>
          </div>
        </div>
        <div className="info-section">
          <h4>Routes</h4>
          <div className="info-row">
            <span>Total:</span>
            <span>{stats.totalRoutes}</span>
          </div>
          {stats.pathLength > 0 && (
            <div className="info-row">
              <span>Path Length:</span>
              <span>{stats.pathLength} stops</span>
            </div>
          )}
        </div>
        {selectedAirports.length === 2 && (
          <div className="info-section">
            <h4>Selected</h4>
            <div className="selected-airports">
              {selectedAirports.map((airport, index) => (
                <div key={airport.id} className="selected-airport">
                  <span className="airport-index">{index + 1}.</span>
                  <span className="airport-name">{airport.name}</span>
                  <span className="airport-code">({airport.id})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
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
              selectedAirports={selectedAirports.map(airport => ({
                ...airport,
                id: airport.iata || String(airport.id)
              }))}
              highlightedPath={shortestPath.map(id => 
                airportCodeMap.get(String(id)) || String(id)
              )}
            />
            
            <DijkstraVisualizer 
              path={shortestPath.map(id => 
                airportCodeMap.get(String(id)) || String(id)
              )}
              airports={normalizedAirports.map(airport => ({
                ...airport,
                id: airport.iata || String(airport.id)
              }))}
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
                key={`${shortestPath.join('-')}-${isPlaying}`}
                path={shortestPath}
                airports={normalizedAirports}
                speed={animationSpeed}
                isPlaying={isPlaying}
                onComplete={() => {
                  console.log('Animation completed');
                  setIsPlaying(false);
                }}
              />
            </div>
            
            <Tooltip 
              visible={tooltip.visible}
              x={tooltip.x}
              y={tooltip.y}
              airport={tooltip.airport}
            />
            
            {/* Animation Controls */}
            <AnimationControls
              isPlaying={isPlaying}
              onPlayPause={() => setIsPlaying(!isPlaying)}
              onReset={() => {
                setIsPlaying(false);
                // Reset animation by briefly clearing and restoring the path
                const currentPath = [...shortestPath];
                setShortestPath([]);
                setTimeout(() => setShortestPath(currentPath), 10);
              }}
              speed={animationSpeed}
              onSpeedChange={setAnimationSpeed}
              isPathCalculated={shortestPath.length > 1}
            />
          </>
        )}
      </div>
      <div className="watermark">
        <span>Airport Route Visualizer</span>
      </div>
    </div>
  );
};

export default Grid;
