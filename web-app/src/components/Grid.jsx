import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import useGraphData from '../hooks/useGraphData';
import { normalizeCoordinates } from '../utils/projection';
import { Graph, findDijkstraPath, findPathAStar } from '../utils/graph';
import GraphCanvas from './GraphCanvas';
import Tooltip from './Tooltip';
import PlaneAnimation from './PlaneAnimation';
import AlgorithmVisualization from './AlgorithmVisualization';
import AnimationControls from './AnimationControls';
import AlgorithmSelector from './AlgorithmSelector';
import AlgorithmSettingsPanel from './AlgorithmSettingsPanel';
import SimpleAStarVisualization from './SimpleAStarVisualization';
import '../styles/Grid.css';

const Grid = () => {
  const [showAStarVisualization, setShowAStarVisualization] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);
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
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(null);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [isPathfinding, setIsPathfinding] = useState(false);
  const [visualizationMode, setVisualizationMode] = useState('plane'); // 'plane' or 'algorithm'
  const [performanceMetrics, setPerformanceMetrics] = useState({
    executionTime: 0,
    visitedNodes: 0,
    pathCost: 0,
    algorithmSteps: 0,
    memoryUsage: '0 MB'
  });
  
  const containerRef = useRef(null);
  
  // Create a function to get the effective weight of an edge (distance + delay)
  const getEdgeWeight = useCallback((source, target) => {
    // Find the route between source and target
    const route = routes.find(r => 
      (String(r.source) === source && String(r.target) === target) ||
      (String(r.source) === target && String(r.target) === source)
    );
    
    if (!route) return Infinity;
    
    // Get the delay for this edge, default to 0
    const delay = edgeDelays[`${source}-${target}`] || edgeDelays[`${target}-${source}`] || 0;
    
    // Return the distance plus delay
    return (route.distance || 0) + delay;
  }, [routes, edgeDelays]);
  
  // Initialize graph with current airports and routes
  const graph = useMemo(() => {
    const g = new Graph();
    
    // Add all enabled airports as nodes
    airports.forEach(airport => {
      const id = String(airport.id);
      if (!disabledAirports.has(id)) {
        g.addNode(id);
      }
    });
    
    // Add all routes as edges
    routes.forEach(route => {
      const source = String(route.source);
      const target = String(route.target);
      
      if (!disabledAirports.has(source) && !disabledAirports.has(target)) {
        const weight = getEdgeWeight(source, target);
        g.addEdge(source, target, weight);
      }
    });
    
    return g;
  }, [airports, routes, disabledAirports, getEdgeWeight]);
  
  // Toggle visualization mode
  const toggleVisualizationMode = useCallback(() => {
    console.log('--- Toggle visualization called ---');
    console.log('Current state:', {
      selectedAlgorithm,
      selectedAirports: selectedAirports?.map(a => a.id),
      visualizationMode,
      showAStarVisualization,
      showVisualization
    });

    if (!selectedAlgorithm || selectedAirports.length !== 2) {
      console.log('Cannot toggle visualization - missing algorithm or airports');
      console.log('Selected algorithm:', selectedAlgorithm);
      console.log('Selected airports count:', selectedAirports.length);
      console.log('Selected airports:', selectedAirports);
      return;
    }
    
    // For A* algorithm
    if (selectedAlgorithm === 'astar') {
      console.log('Toggling A* visualization');
      
      // Toggle between plane and algorithm mode
      const newMode = visualizationMode === 'plane' ? 'algorithm' : 'plane';
      console.log(`Switching to ${newMode} mode`);
      
      // Clear any existing visualization
      setShowVisualization(false);
      setShowAStarVisualization(false);
      setShortestPath([]);
      
      // Small delay to ensure state updates before showing new visualization
      setTimeout(() => {
        // Update the visualization mode
        setVisualizationMode(newMode);
        
        if (newMode === 'algorithm') {
          // Show A* visualization in algorithm mode
          setShowAStarVisualization(true);
          setShowVisualization(true);
          
          // Recalculate path to ensure we have the latest data
          console.log('Recalculating path for A* visualization...');
          findPath();
        } else {
          // In plane mode, just show the path without visualization
          setShowAStarVisualization(false);
          setShowVisualization(true);
          findPath();
        }
      }, 50);
    } else {
      // For other algorithms (like Dijkstra), toggle between plane and algorithm modes
      const newMode = visualizationMode === 'plane' ? 'algorithm' : 'plane';
      
      // Clear existing visualization first
      setShowVisualization(false);
      setShortestPath([]);
      
      // Small delay to ensure state updates before showing new visualization
      setTimeout(() => {
        setVisualizationMode(newMode);
        
        if (newMode === 'algorithm' && selectedAirports.length === 2) {
          // Show algorithm visualization and find path
          setShowVisualization(true);
          findPath();
        } else if (newMode === 'plane') {
          // Just show the path in plane mode
          setShowVisualization(true);
          findPath();
        }
      }, 50);
      
      // Always hide A* visualization for non-A* algorithms
      setShowAStarVisualization(false);
    }
  }, [selectedAlgorithm, selectedAirports, visualizationMode]);

  // Handle algorithm change
  const handleAlgorithmChange = useCallback((algorithm) => {
    const isSameAlgorithm = algorithm === selectedAlgorithm;
    
    // Always reset all visualization states first
    setShowVisualization(false);
    setShowAStarVisualization(false);
    setVisualizationMode('plane');
    setShortestPath([]);
    
    // Toggle settings panel if clicking the same algorithm
    if (isSameAlgorithm) {
      setShowSettingsPanel(prev => !prev);
    } else {
      // Change algorithm and show settings for a new algorithm
      setSelectedAlgorithm(algorithm);
      setShowSettingsPanel(true);
      
      // For A*, start with plane visualization by default
      if (algorithm === 'astar') {
        setVisualizationMode('plane');
        setShowAStarVisualization(false);
      } else {
        // For other algorithms (like Dijkstra), ensure proper visualization mode
        setVisualizationMode('plane');
        setShowAStarVisualization(false);
      }
      
      // Reset metrics when changing algorithm
      setPerformanceMetrics({
        executionTime: 0,
        visitedNodes: 0,
        pathCost: 0,
        algorithmSteps: 0,
        memoryUsage: '0 MB'
      });
    }
  }, [selectedAlgorithm]);

  // Close settings panel
  const closeSettingsPanel = useCallback(() => {
    setShowSettingsPanel(false);
  }, []);

  // Find path using the selected algorithm
  const findPath = useCallback(async () => {
    // Reset visualization states first
    setShowVisualization(false);
    
    if (selectedAirports.length !== 2) {
      console.log('Not enough airports selected, clearing path');
      setShortestPath([]);
      return;
    }
    
    // Don't proceed if no algorithm is selected
    if (!selectedAlgorithm) {
      console.log('Please select an algorithm first');
      setShortestPath([]);
      return;
    }
    
    // Show settings panel and reset metrics
    setShowSettingsPanel(true);
    setIsPathfinding(true);
    
    // Skip if either selected airport is disabled
    if (disabledAirports.has(selectedAirports[0]?.id) || 
        disabledAirports.has(selectedAirports[1]?.id)) {
      console.log('One or both selected airports are disabled');
      setShortestPath([]);
      setShowAStarVisualization(false);
      setShowVisualization(false);
      setIsPathfinding(false);
      return;
    }
    
    // Record start time and memory for metrics
    const startTime = performance.now();
    const startMemory = window.performance?.memory?.usedJSHeapSize || 0;
    
    try {
      const startNode = String(selectedAirports[0].id);
      const endNode = String(selectedAirports[1].id);
      
      // Use the memoized graph
      
      // Find path using the selected algorithm
      let result;
      if (selectedAlgorithm === 'astar') {
        // For A*, we need to create a map of node positions for the heuristic
        const nodePositions = {};
        airports.forEach(airport => {
          nodePositions[String(airport.id)] = {
            x: airport.longitude,
            y: airport.latitude
          };
        });
        
        result = findPathAStar(graph, startNode, endNode, nodePositions);
      } else {
        // For Dijkstra
        result = findDijkstraPath(graph, startNode, endNode);
      }
      
      // Calculate metrics
      const endTime = performance.now();
      const executionTime = (endTime - startTime).toFixed(2);
      
      // Force garbage collection and wait a bit for memory to stabilize
      if (window.gc) {
        window.gc();
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const endMemory = window.performance.memory?.usedJSHeapSize || 0;
      const memoryUsedMB = ((endMemory - startMemory) / (1024 * 1024));
      const memoryUsed = memoryUsedMB > 0 ? memoryUsedMB.toFixed(2) + ' MB' : 'N/A';
      
      if (result && result.path && result.path.length > 0) {
        console.log('Found shortest path:', result.path, 'with distance:', result.totalDistance);
        
        // Update the path first
        setShortestPath(result.path);
        
        // Set appropriate visualization state based on the selected algorithm and current mode
        if (selectedAlgorithm === 'astar') {
          console.log('A* algorithm selected, setting visualization state', {
            visualizationMode,
            shouldShowAStar: visualizationMode === 'algorithm',
            shouldShowVisualization: true
          });
          
          // For A*, we want to show the visualization when in algorithm mode
          const shouldShowAStar = visualizationMode === 'algorithm';
          
          // Update both states in a single batch
          setShowAStarVisualization(shouldShowAStar);
          setShowVisualization(true);
        } else {
          // For other algorithms (like Dijkstra), show the standard visualization
          setShowAStarVisualization(false);
          setShowVisualization(visualizationMode === 'algorithm');
        }
        
        // Calculate total path cost including delays
        let totalCost = 0;
        for (let i = 0; i < result.path.length - 1; i++) {
          const source = result.path[i];
          const target = result.path[i + 1];
          // Use the same weight calculation as in getEdgeWeight
          const edge = routes.find(r => 
            (String(r.source) === source && String(r.target) === target) ||
            (String(r.source) === target && String(r.target) === source)
          );
          
          if (edge) {
            const delay = edgeDelays[`${source}-${target}`] || edgeDelays[`${target}-${source}`] || 0;
            totalCost += (edge.distance || 0) + delay;
          }
        }
        
        // Update performance metrics
        setPerformanceMetrics({
          executionTime,
          visitedNodes: result.visited ? result.visited.size : 0,
          pathCost: Math.round(totalCost * 100) / 100, // Round to 2 decimal places
          algorithmSteps: result.steps || 0,
          memoryUsage: memoryUsed
        });
      } else {
        console.log('No path found from', startNode, 'to', endNode);
        setShortestPath([]);
        setPerformanceMetrics(prev => ({
          ...prev,
          executionTime,
          visitedNodes: 0,
          pathCost: 0,
          algorithmSteps: 0,
          memoryUsage: memoryUsed
        }));
      }
    } catch (error) {
      console.error('Error finding path:', error);
      setShortestPath([]);
    } finally {
      setIsPathfinding(false);
    }
  }, [selectedAirports, selectedAlgorithm, airports, routes, disabledAirports, getEdgeWeight]);

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
  const handleAirportClick = useCallback((e, airport) => {
    e.stopPropagation();
    
    // If right-click, handle airport enable/disable
    if (e.button === 2) {
      handleAirportRightClick(airport.id, e);
      return;
    }
    
    // Don't allow selection if no algorithm is chosen
    if (!selectedAlgorithm) {
      console.log('Please select an algorithm first');
      return;
    }
    
    // If already selected, deselect it
    const isSelected = selectedAirports.some(a => a.id === airport.id);
    if (isSelected) {
      setSelectedAirports(prev => prev.filter(a => a.id !== airport.id));
      setShortestPath([]); // Clear path when deselecting
      return;
    }
    
    // If we already have 2 airports, replace the second one
    let newSelectedAirports;
    if (selectedAirports.length >= 2) {
      newSelectedAirports = [selectedAirports[0], airport];
    } else {
      newSelectedAirports = [...selectedAirports, airport];
    }
    
    setSelectedAirports(newSelectedAirports);
    
    // If we have 2 airports, find the path
    if (newSelectedAirports.length === 2) {
      findPath();
    } else {
      // If we have less than 2 airports, clear any existing path
      setShortestPath([]);
    }
  }, [selectedAirports, findPath, handleAirportRightClick, shortestPath]);
  
  // Run pathfinding when selectedAirports changes
  useEffect(() => {
    if (selectedAirports.length === 2) {
      findPath();
    } else {
      setShortestPath([]);
    }
  }, [selectedAirports, findPath]);
  
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
          <div className="algorithm-section">
            <AlgorithmSelector 
              selectedAlgorithm={selectedAlgorithm}
              onAlgorithmChange={handleAlgorithmChange}
            />
          </div>
        </div>
      </div>
      
      <AlgorithmSettingsPanel 
        algorithm={selectedAlgorithm} 
        isVisible={showSettingsPanel} 
        onClose={closeSettingsPanel}
        performanceMetrics={performanceMetrics}
        onVisualize={toggleVisualizationMode}
        showVisualizeButton={!showVisualization}
      />
      
      <div className="main-content">
        {showSettingsPanel && (
          <div 
            className="settings-panel-overlay"
            onClick={closeSettingsPanel}
          />
        )}
        <div className="grid-container" ref={containerRef}>
          {error ? (
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
              highlightedPath={visualizationMode === 'plane' ? shortestPath : []}
              selectedAirports={selectedAirports}
              disabledAirports={disabledAirports}
              edgeDelays={edgeDelays}
              onEdgeDelayChange={handleEdgeDelayChange}
            />
            
            {/* Plane Animation - Only show when there's a valid path and not in visualization mode */}
            {shortestPath.length > 1 && !showVisualization && (
              <div 
                key={`plane-animation-${shortestPath.join('-')}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 5
                }}
              >
                <PlaneAnimation
                  key={`plane-${shortestPath.join('-')}`}
                  path={shortestPath}
                  airports={normalizedAirports}
                  speed={2}
                  isPlaying={true}
                  onComplete={() => {
                    console.log('Plane animation completed');
                  }}
                />
              </div>
            )}
            
            {/* A* Visualization - Only shown when toggled on */}
            {console.log('A* Visualization render check:', {
              selectedAlgorithm,
              showAStarVisualization,
              showVisualization,
              selectedAirportsCount: selectedAirports.length,
              visualizationMode,
              rendering: selectedAlgorithm === 'astar' && showVisualization && visualizationMode === 'algorithm' && selectedAirports.length === 2,
              conditions: {
                isAStar: selectedAlgorithm === 'astar',
                hasTwoAirports: selectedAirports.length === 2,
                showVisualization,
                visualizationMode,
                shouldRender: selectedAlgorithm === 'astar' && showVisualization && visualizationMode === 'algorithm' && selectedAirports.length === 2
              }
            })}
            {selectedAlgorithm === 'astar' && showVisualization && visualizationMode === 'algorithm' && selectedAirports.length === 2 && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 6 // Higher than GraphCanvas
              }}>
                <SimpleAStarVisualization 
                  key={`astar-${selectedAirports[0]?.id}-${selectedAirports[1]?.id}`}
                  startPoint={{
                    x: selectedAirports[0].x * 100 / dimensions.width,
                    y: selectedAirports[0].y * 100 / dimensions.height
                  }}
                  endPoint={{
                    x: selectedAirports[1].x * 100 / dimensions.width,
                    y: selectedAirports[1].y * 100 / dimensions.height
                  }}
                  dimensions={dimensions}
                  nodeCount={30}
                  speed={100}
                  onComplete={() => console.log('A* visualization complete')}
                />
              </div>
            )}
            
            {/* Animation Container - For Dijkstra's Visualization */}
            {selectedAlgorithm !== 'astar' && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 5,
                display: shortestPath.length > 1 ? 'block' : 'none'
              }}>
                {visualizationMode === 'plane' ? (
                  <PlaneAnimation
                    key={`plane-${shortestPath.join('-')}`}
                    path={shortestPath}
                    airports={normalizedAirports}
                    speed={2}
                    isPlaying={true}
                    onComplete={() => {
                      console.log('Plane animation completed');
                    }}
                  />
                ) : selectedAirports.length === 2 && shortestPath.length > 1 ? (
                  <AlgorithmVisualization
                    key={`algo-${shortestPath.join('-')}`}
                    path={shortestPath}
                    airports={normalizedAirports}
                    routes={routes}
                    graph={graph}
                    startNode={String(selectedAirports[0].id)}
                    endNode={String(selectedAirports[1].id)}
                    onComplete={() => {
                      console.log('Algorithm visualization completed');
                    }}
                  />
                ) : (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    padding: '20px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                  }}>
                    <p style={{ margin: 0, color: '#333' }}>Select two airports and find a path to visualize the algorithm</p>
                  </div>
                )}
              </div>
            )}
            
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
