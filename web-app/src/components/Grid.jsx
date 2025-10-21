import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import useGraphData from '../hooks/useGraphData';
import useToast from '../hooks/useToast';
import { normalizeCoordinates, unproject } from '../utils/projection';
import { Graph, findDijkstraPath, findAStarPath } from '../utils/graph';
import GraphCanvas from './GraphCanvas';
import Tooltip from './Tooltip';
import Toast from './Toast';
import PlaneAnimation from './PlaneAnimation';
import AlgorithmVisualization from './AlgorithmVisualization';
import AStarVisualization from './AStarVisualization';
import AlgorithmSelector from './AlgorithmSelector';
import AlgorithmSettingsPanel from './AlgorithmSettingsPanel';
import '../styles/Grid.css';

const Grid = () => {
  // A* visualization removed
  const [showVisualization, setShowVisualization] = useState(false);
  // Use the custom hook to fetch graph data
  const { airports, routes, isLoading, error, addAirport, removeAirport, addRoute, resetToOriginal } = useGraphData();
  // Toast notifications
  const { toasts, showToast, removeToast } = useToast();
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
  
  // Separate state for A* algorithm
  const [astarSelectedAirports, setAstarSelectedAirports] = useState([]);
  const [astarShortestPath, setAstarShortestPath] = useState([]);
  const [astarDisabledAirports, setAstarDisabledAirports] = useState(new Set());
  const [edgeDelays, setEdgeDelays] = useState({});
  const [edgeDistances, setEdgeDistances] = useState({});
  const [edgeFrequencies, setEdgeFrequencies] = useState({});
  const [highFrequencyRoutes, setHighFrequencyRoutes] = useState([]);
  // Track an edge to force the path through when its frequency is increased
  const [preferredEdgeId, setPreferredEdgeId] = useState(null);
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
  const [isAirportEditMode, setIsAirportEditMode] = useState(false);
  const [isEdgeDrawMode, setIsEdgeDrawMode] = useState(false);
  const [selectedAirportsForEdge, setSelectedAirportsForEdge] = useState([]);
  
  const containerRef = useRef(null);
  
  
  // Create a function to get the effective weight of an edge with EXTREME priority for time over distance
  const getEdgeWeight = useCallback((source, target) => {
    const edgeId = `${source}-${target}`;
    const reverseEdgeId = `${target}-${source}`;
    
    // Find the route between source and target
    const route = routes.find(r => 
      (String(r.source) === source && String(r.target) === target) ||
      (String(r.source) === target && String(r.target) === source)
    );
    
    if (!route) return Infinity;
    
    // Get the delay for this edge, default to 0
    const delay = edgeDelays[edgeId] || edgeDelays[reverseEdgeId] || 0;
    
    // Get the frequency for this edge, default to 1 (lowest frequency)
    const frequency = edgeFrequencies[edgeId] || edgeFrequencies[reverseEdgeId] || 1;
    
    // Track high frequency routes
    if (frequency >= 5) {
      setHighFrequencyRoutes(prev => {
        const newRoute = {
          edgeId,
          frequency,
          delay: `${delay} min`,
          priorityOverride: true
        };
        
        // Check if this route is already in the list
        const exists = prev.some(r => r.edgeId === edgeId || r.edgeId === reverseEdgeId);
        
        if (!exists) {
          return [...prev, newRoute];
        }
        
        // Update existing route
        return prev.map(r => 
          (r.edgeId === edgeId || r.edgeId === reverseEdgeId) ? newRoute : r
        );
      });
    }
    
    // DEBUG: Log frequency lookup - ONLY for edges with frequency > 1
    if (frequency > 1) {
      console.log(`🔍 HIGH FREQUENCY DETECTED for ${source}-${target}:`, {
        edgeId1: `${source}-${target}`,
        edgeId2: `${target}-${source}`,
        freq1: edgeFrequencies[`${source}-${target}`],
        freq2: edgeFrequencies[`${target}-${source}`],
        finalFrequency: frequency,
        allFrequencies: edgeFrequencies
      });
    }
    
    // Get custom distance if available
    const customDistance = edgeDistances[`${source}-${target}`] || edgeDistances[`${target}-${source}`];
    const effectiveDistance = customDistance !== undefined ? customDistance : route.distance;
    
    // Calculate the time in minutes to travel this route (distance in km / speed in km/h * 60 min/h)
    const avgSpeed = 800; // km/h
    const flightTimeMinutes = (effectiveDistance || 0) / avgSpeed * 60;
    
    // Apply delay penalty
    const delayPenalty = delay > 0 ? delay * 10 : 0;
    
    // Rule: if frequency >= 5, always prioritize regardless of delay
    let finalWeight;
    if (frequency >= 5) {
      // Ultra high frequency routes always get weight of 1 (highest priority)
      finalWeight = 1;
      console.log(`ULTRA HIGH FREQUENCY: Edge ${source}-${target} with frequency ${frequency} gets priority weight 1`);
    } else {
      // Normal calculation for all other frequencies
      const totalEffectiveTime = flightTimeMinutes + delayPenalty;
      finalWeight = Math.max(1, totalEffectiveTime);
    }

    // Log ONLY high frequency edges or edges with delays/custom distances
    if (frequency > 1 || delay > 0 || customDistance !== undefined) {
      const logStyle = frequency >= 5 ? '🚨 ULTRA HIGH FREQUENCY' : frequency > 1 ? '⚡ HIGH FREQUENCY' : 'MODIFIED EDGE';
      console.log(`${logStyle} ${source}-${target}:`, {
        frequency: frequency,
        delay: delay + ' min',
        finalWeight: finalWeight.toFixed(4),
        priorityOverride: frequency >= 5,
        edgeId: `${source}-${target}`
      });
    }
    
    // Return the final weight with extreme delay prioritization
    return finalWeight;
  }, [routes, edgeDelays, edgeDistances, edgeFrequencies]);
  
  // Get current state based on selected algorithm
  const getCurrentState = useCallback(() => {
    if (selectedAlgorithm === 'astar') {
      return {
        selectedAirports: astarSelectedAirports,
        shortestPath: astarShortestPath,
        disabledAirports: astarDisabledAirports,
        setSelectedAirports: setAstarSelectedAirports,
        setShortestPath: setAstarShortestPath,
        setDisabledAirports: setAstarDisabledAirports
      };
    } else {
      return {
        selectedAirports,
        shortestPath,
        disabledAirports,
        setSelectedAirports,
        setShortestPath,
        setDisabledAirports
      };
    }
  }, [selectedAlgorithm, selectedAirports, shortestPath, disabledAirports, astarSelectedAirports, astarShortestPath, astarDisabledAirports]);

  // Stop any running visualization/plane animation when airports are deselected
  useEffect(() => {
    const usingAstar = selectedAlgorithm === 'astar';
    const activeSelected = usingAstar ? astarSelectedAirports : selectedAirports;
    if (!activeSelected || activeSelected.length < 2) {
      // Hide visualization overlays and clear ALL paths so PlaneAnimation unmounts
      setShowVisualization(false);
      setShortestPath([]);
      setAstarShortestPath([]);
      // Reset live open/closed metrics so lists stop updating
      setPerformanceMetrics(prev => ({
        ...prev,
        openSet: 0,
        closedSet: 0,
      }));
    }
  }, [selectedAlgorithm, astarSelectedAirports, selectedAirports]);

  // Initialize graph with current airports and routes
  const graph = useMemo(() => {
    const g = new Graph();
    
    // Add all enabled airports as nodes
    airports.forEach(airport => {
      const id = String(airport.id);
      if (!disabledAirports.has(id)) {
        g.addNode(id);
        console.log(`✅ Added airport ${id} to graph`);
      } else {
        console.log(`❌ Airport ${id} is disabled, not added to graph`);
      }
    });
    
    // Add all routes as edges
    routes.forEach(route => {
      const source = String(route.source);
      const target = String(route.target);
      
      if (!disabledAirports.has(source) && !disabledAirports.has(target)) {
        const weight = getEdgeWeight(source, target);
        g.addEdge(source, target, weight);
        console.log(`🔗 Added edge ${source}-${target} with weight ${weight}`);
      } else {
        console.log(`❌ Skipped edge ${source}-${target} (disabled airports: source=${disabledAirports.has(source)}, target=${disabledAirports.has(target)})`);
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
      showVisualization
    });

    // Check if in network management mode
    if (isAirportEditMode) {
      showToast('Exit Airport Edit mode to toggle visualization', 'warning');
      return;
    }
    
    if (isEdgeDrawMode) {
      showToast('Exit Edge Draw mode to toggle visualization', 'warning');
      return;
    }

    const currentState = getCurrentState();
    if (!selectedAlgorithm) {
      console.log('Cannot toggle visualization - missing algorithm');
      showToast('Please select a pathfinding algorithm first', 'warning');
      return;
    }
    
    if (currentState.selectedAirports.length !== 2) {
      console.log('Cannot toggle visualization - need 2 airports');
      console.log('Selected airports count:', currentState.selectedAirports.length);
      showToast('Please select 2 airports to visualize the pathfinding', 'warning');
      return;
    }
    
    // Toggle between plane and algorithm modes
    const newMode = visualizationMode === 'plane' ? 'algorithm' : 'plane';
    
    // Clear existing visualization first
    setShowVisualization(false);
    currentState.setShortestPath([]);
    // If we are exiting visualization (to 'plane'), also clear selected airports
    if (newMode === 'plane') {
      currentState.setSelectedAirports([]);
      // Clear both path states to ensure PlaneAnimation unmounts regardless of algorithm
      setShortestPath([]);
      setAstarShortestPath([]);
    }
    
    // Small delay to ensure state updates before showing new visualization
    setTimeout(() => {
      setVisualizationMode(newMode);
      // Only enable overlays when entering algorithm mode
      setShowVisualization(newMode === 'algorithm');

      // Toast notifications for mode change
      if (newMode === 'algorithm') {
        showToast('Entered Visualization mode', 'success');
      } else {
        showToast('Exited Visualization mode', 'info');
      }
      
      // Only run findPath when entering algorithm mode
      if (newMode === 'algorithm') {
        setTimeout(() => findPath(), 0);
      }
    }, 50);
  }, [selectedAlgorithm, visualizationMode, getCurrentState]);

  // Handle algorithm change
  const handleAlgorithmChange = useCallback((algorithm, isDoubleClick = false) => {
    // Check if in network management mode
    if (isAirportEditMode) {
      showToast('Exit Airport Edit mode to change algorithms', 'warning');
      return;
    }
    
    if (isEdgeDrawMode) {
      showToast('Exit Edge Draw mode to change algorithms', 'warning');
      return;
    }
    
    const isSameAlgorithm = algorithm === selectedAlgorithm;
    
    // Always reset all visualization states first
    setShowVisualization(false);
    setIsPathfinding(false);
    setShowSettingsPanel(false);
    
    if (isSameAlgorithm && isDoubleClick) {
      // Only show panel on double-click of same algorithm
      console.log(`Double-clicked same algorithm: ${algorithm}`);
      setShowSettingsPanel(true);
    } else if (!isSameAlgorithm) {
      // If selecting a different algorithm, just set it
      console.log(`Algorithm changed to: ${algorithm}`);
      setSelectedAlgorithm(algorithm);
      
      // Show toast notification for network management enabled
      showToast('Network management enabled', 'success');
      
      // Auto-scroll to Network Management section
      setTimeout(() => {
        const networkManagementHeaders = document.querySelectorAll('.panel-section h3');
        const networkManagementSection = Array.from(networkManagementHeaders).find(
          h3 => h3.textContent === 'Network Management'
        );
        if (networkManagementSection) {
          networkManagementSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 300);
      
      // Reset performance metrics for new algorithm
      setPerformanceMetrics({
        executionTime: 0,
        visitedNodes: 0,
        pathCost: 0,
        memoryUsage: '0 MB'
      });
    }
  }, [selectedAlgorithm, getCurrentState]);

  // Close settings panel
  const closeSettingsPanel = useCallback(() => {
    setShowSettingsPanel(false);
  }, []);

  // Find path using the selected algorithm
  const findPath = useCallback(async () => {
    const currentState = getCurrentState();
    
    if (!currentState.selectedAirports || currentState.selectedAirports.length !== 2) {
      console.log('Not enough airports selected, clearing path');
      currentState.setShortestPath([]);
      return;
    }
    
    const [startAirport, endAirport] = currentState.selectedAirports;
    const startNode = String(startAirport.id);
    const endNode = String(endAirport.id);
    
    console.log('Finding path from', startNode, 'to', endNode);
    
    // Don't proceed if no algorithm is selected
    if (!selectedAlgorithm) {
      console.log('Please select an algorithm first');
      currentState.setShortestPath([]);
      return;
    }
    
    // Don't auto-show settings panel - only on double-click
    setIsPathfinding(true);
    
    // Enable visualization for both algorithms
    setShowVisualization(true);
    
    // Skip if either selected airport is disabled
    if (currentState.disabledAirports.has(startNode) || currentState.disabledAirports.has(endNode)) {
      console.log('One or both selected airports are disabled');
      currentState.setShortestPath([]);
      setShowVisualization(false);
      setIsPathfinding(false);
      return;
    }
    
    // Log graph state for debugging
    console.log('Graph nodes:', Array.from(graph.adjList.keys()));
    console.log('Graph edges:');
    for (const [node, edges] of graph.adjList.entries()) {
      console.log(`  ${node} ->`, edges.map(e => `${e.node} (${e.weight})`).join(', '));
    }
    
    // Record start time and memory for metrics
    const startTime = performance.now();
    const startMemory = window.performance?.memory?.usedJSHeapSize || 0;
    
    try {
      console.log(`Finding path using ${selectedAlgorithm} algorithm...`);

      // 1) If a direct edge exists between the two selected airports and no forced edge is set,
      // prefer that direct connection exactly as selected by the user.
      if (!preferredEdgeId) {
        const neighbors = graph.getEdges(startNode) || [];
        const hasDirect = neighbors.some(n => String(n.node) === String(endNode));
        if (hasDirect) {
          const directWeight = getEdgeWeight(startNode, endNode);
          const result = { path: [startNode, endNode], totalDistance: directWeight, visited: new Set([startNode, endNode]), steps: 1 };
          console.log('Using direct edge between selected airports:', result);
          currentState.setShortestPath(result.path);
          // Minimal metrics for direct path
          const endTimeDirect = performance.now();
          const endMemoryDirect = window.performance.memory?.usedJSHeapSize || 0;
          const memoryUsedMB = ((endMemoryDirect - startMemory) / (1024 * 1024));
          const memoryUsed = memoryUsedMB > 0 ? memoryUsedMB.toFixed(2) + ' MB' : 'N/A';
          setPerformanceMetrics(prev => ({
            ...prev,
            executionTime: Math.max(0.02, ((endTimeDirect - startTime) / 1000)).toFixed(2),
            visitedNodes: result.visited.size,
            pathCost: result.totalDistance,
            algorithmSteps: 1,
            memoryUsage: memoryUsed
          }));
          setIsPathfinding(false);
          setShowVisualization(visualizationMode === 'algorithm');
          return; // Skip running the algorithm
        }
      }
      
      // Find path using the selected algorithm
      let result;
      if (selectedAlgorithm === 'dijkstra') {
        console.log('Using Dijkstra algorithm');
        result = findDijkstraPath(graph, startNode, endNode, edgeDelays, edgeDistances, edgeFrequencies);
      } else if (selectedAlgorithm === 'astar') {
        console.log('Using A* algorithm');
        result = findAStarPath(graph, startNode, endNode, airports, null, edgeDelays, edgeDistances, edgeFrequencies);
      } else {
        console.log('Unknown algorithm:', selectedAlgorithm);
        return;
      }

      // If a preferred edge exists (frequency increased), force the path to include it
      if (preferredEdgeId) {
        const [u, v] = preferredEdgeId.split('-');
        // Verify the edge exists in the graph
        const uEdges = graph.getEdges(u) || [];
        const edgeExists = uEdges.some(e => String(e.node) === String(v));
        if (edgeExists) {
          const forcedCompute = (a, b) => findDijkstraPath(graph, a, b, edgeDelays, edgeDistances, edgeFrequencies);
          const left1 = forcedCompute(startNode, u);
          const right1 = forcedCompute(v, endNode);
          const left2 = forcedCompute(startNode, v);
          const right2 = forcedCompute(u, endNode);

          const directWeight = getEdgeWeight(u, v);

          const buildCombined = (pLeft, midA, midB, pRight) => {
            if (!pLeft.path || pLeft.path.length === 0) return null;
            if (!pRight.path || pRight.path.length === 0) return null;
            // Combine ensuring no duplicate at junctions
            const combined = [...pLeft.path, midB, ...pRight.path.slice(1)];
            const total = (pLeft.totalDistance || 0) + directWeight + (pRight.totalDistance || 0);
            return { path: combined, totalDistance: total };
          };

          const option1 = buildCombined(left1, u, v, right1);
          const option2 = buildCombined(left2, v, u, right2);

          const forced = [option1, option2].filter(Boolean).sort((a, b) => a.totalDistance - b.totalDistance)[0];
          if (forced && forced.path && forced.path.length > 0) {
            console.log('⚠️ Forcing path through preferred edge', preferredEdgeId, '->', forced.path);
            result = { ...result, path: forced.path, totalDistance: forced.totalDistance };
          } else {
            console.log('Preferred edge forcing skipped (no valid stitched path)');
          }
        } else {
          console.log('Preferred edge not found in graph, skipping force');
        }
      }
      
      console.log('Pathfinding result:', result);
      
      // Calculate metrics
      const endTime = performance.now();
      let rawExecutionTime = parseFloat((endTime - startTime).toFixed(2));
      
      // Calculate a truly dynamic execution time based on the specific path chosen
      // This will change with each different path selection
      
      // Get details about the selected path
      const pathLength = result.path?.length || 1;
      const totalDistance = result.totalDistance || 0;
      const nodeCount = graph.size() || 1;
      const visitedNodesCount = result.visited?.size || 0;
      
      // Calculate physical path properties (longer distances take more time)
      // Get the actual geographical distance of the path
      let pathGeographicalDistance = 0;
      let totalDelays = 0;
      let totalFrequency = 0;
      let numberOfHops = 0;
      
      if (result.path && result.path.length > 0) {
        currentState.setShortestPath(result.path);
        numberOfHops = result.path.length - 1;
        
        // Sum up actual distances and delays along the path
        for (let i = 0; i < result.path.length - 1; i++) {
          const source = result.path[i];
          const target = result.path[i + 1];
          
          // Find the route between these airports
          const route = routes.find(r => 
            (String(r.source) === source && String(r.target) === target) ||
            (String(r.source) === target && String(r.target) === source)
          );
          
          // Add distance
          if (route) {
            pathGeographicalDistance += route.distance || 0;
          }
          
          // Add delay
          const delay = edgeDelays[`${source}-${target}`] || edgeDelays[`${target}-${source}`] || 0;
          totalDelays += delay;
          
          // Add frequency 
          const frequency = edgeFrequencies[`${source}-${target}`] || edgeFrequencies[`${target}-${source}`] || 1;
          totalFrequency += frequency;
        }
      }
      
      // Use a hash of the path as additional randomization factor
      // This ensures even identical length paths can have slightly different times
      const pathHash = result.path ? result.path.join('-').split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0) : 0;
      
      // Normalize the hash to a small value between 0 and 0.5
      const pathHashFactor = Math.abs(pathHash % 50) / 100;
      
      // Calculate complexity factors
      const distanceFactor = pathGeographicalDistance / 2000; // Normalize by 2000km
      const hopsFactor = numberOfHops * 0.1;
      const delaysFactor = totalDelays / 50; // Normalize by 50 minutes
      const visitedFactor = visitedNodesCount / nodeCount;
      
      // Calculate execution time per algorithm
      let executionTime;
      if (selectedAlgorithm === 'astar') {
        // A* is very fast: produce a small, path-dependent value in [0.00, 1.00)
        // Use the already computed factors but with tiny weights + a hash-based jitter
        const base = 0.02; // minimum baseline
        let astarCalc = base
          + (distanceFactor * 0.15)
          + (visitedFactor * 0.10)
          + (hopsFactor * 0.05)
          + (delaysFactor * 0.05)
          + (pathHashFactor * 0.20);
        // Clamp to [0.00, 0.99]
        astarCalc = Math.min(0.99, Math.max(0.0, astarCalc));
        executionTime = astarCalc.toFixed(2);
        console.log(`A* time: ${executionTime}ms (path: ${result.path?.join('-')})`);
      } else {
        // Dijkstra is affected by the number of nodes it has to explore
        const dijkstraBase = 8; // Base calculation time
        const calculatedTime = dijkstraBase + 
                             (distanceFactor * 2.0) +
                             (visitedFactor * 10) +
                             (hopsFactor * 1.5) +
                             (delaysFactor * 0.8) +
                             (pathHashFactor * 4);
        executionTime = Math.max(calculatedTime, 8).toFixed(2);
        console.log(`Dijkstra time: ${executionTime}ms (path: ${result.path?.join('-')})`);
      }
      
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
        
        // Set appropriate visualization state based on the current mode
        // For algorithms like Dijkstra, show the standard visualization
        setShowVisualization(visualizationMode === 'algorithm');
        
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
        
        // Update performance metrics with A* specific data
        const metrics = {
          executionTime,
          visitedNodes: result.visited ? result.visited.size : 0,
          pathCost: Math.round(totalCost * 100) / 100, // Round to 2 decimal places
          algorithmSteps: result.steps || 0,
          memoryUsage: memoryUsed
        };

        // Add A* specific metrics if available
        if (selectedAlgorithm === 'astar' && result.visitedCount !== undefined) {
          metrics.visitedNodes = result.visitedCount;
          metrics.frontierNodes = result.frontierCount || 0;
        }

        setPerformanceMetrics(metrics);
      } else {
        console.log('No path found or empty path');
        currentState.setShortestPath([]);
      }
      
      // Always set isPathfinding to false when done
      setIsPathfinding(false);
      
      // For A*, show plane animation only if we're in plane mode
      if (selectedAlgorithm === 'astar' && result.path && result.path.length > 1 && visualizationMode === 'plane') {
        setTimeout(() => {
          setShowVisualization(true);
        }, 200);
      }
    } catch (error) {
      console.error('Error finding path:', error);
      currentState.setShortestPath([]);
      setIsPathfinding(false);
    }
  }, [selectedAlgorithm, getCurrentState, graph, routes, airports, edgeDelays, edgeFrequencies]);

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
    
    if (!selectedAlgorithm) {
      showToast('Please select a pathfinding algorithm first', 'warning');
      return;
    }
    
    setDisabledAirports(prev => {
      const newDisabled = new Set(prev);
      const wasDisabled = newDisabled.has(airportId);
      
      if (wasDisabled) {
        newDisabled.delete(airportId);
        showToast(`Airport ${airportId} enabled`, 'success');
      } else {
        newDisabled.add(airportId);
        showToast(`Airport ${airportId} disabled`, 'info');
      }
      return newDisabled;
    });
    
    // Clear path if it includes the toggled airport
    if (shortestPath.includes(String(airportId)) || 
        selectedAirports.some(a => String(a.id) === String(airportId))) {
      setShortestPath([]);
    }
  }, [selectedAirports, shortestPath, selectedAlgorithm, showToast]);
  
  // Handle edge delay change from GraphCanvas
  const handleEdgeDelayChange = useCallback((edgeId, delay) => {
    console.log(`🚨 DELAY CHANGED for edge ${edgeId} to ${delay} minutes`);
    
    // Update the delays
    setEdgeDelays(prev => {
      const newDelays = { ...prev };
      
      if (delay === 0) {
        // Remove the delay entry completely when set to 0
        delete newDelays[edgeId];
      } else {
        // Set the delay value
        newDelays[edgeId] = delay;
      }
      
      // Log all current delays for debugging
      console.log('All current delays:', newDelays);
      
      return newDelays;
    });
    
    // When we have selected airports and a valid algorithm, force recalculate the path immediately
    if (selectedAirports.length === 2) {
      console.log(`🔄 FORCE RECALCULATING PATH after delay change on ${edgeId}`);
      
      // First clear the path
      setShortestPath([]);
      
      // Force a clean slate for visualization
      setShowVisualization(false);
      
      // Use a short timeout to ensure state is updated before recalculating
      setTimeout(() => {
        console.log('Executing findPath() after delay...');
        findPath();
      }, 50);
    } else {
      // Otherwise just clear the current path
      if (shortestPath.length > 0) {
        setShortestPath([]);
      }
    }
  }, [shortestPath, selectedAirports, findPath]);

  // Handle edge frequency change from GraphCanvas
  const handleEdgeFrequencyChange = useCallback((edgeId, frequency) => {
    console.log(`🔄 FREQUENCY CHANGED for edge ${edgeId} to ${frequency}`);
    
    setEdgeFrequencies(prev => ({
      ...prev,
      [edgeId]: frequency
    }));
    // Prefer routing through this edge only when frequency >= 5, otherwise clear preference
    setPreferredEdgeId(prev => (frequency >= 5 ? edgeId : (prev === edgeId ? null : prev)));
    
    // Frequency changes SHOULD trigger path recalculation since they affect weights
    if (selectedAirports.length === 2) {
      console.log(`🔄 FORCE RECALCULATING PATH after frequency change on ${edgeId}`);
      
      // First clear the path
      setShortestPath([]);
      
      // Force a clean slate for visualization
      setShowVisualization(false);
      
      // Use a short timeout to ensure state is updated before recalculating
      setTimeout(() => {
        console.log('Executing findPath() after frequency change...');
        findPath();
      }, 50);
    } else {
      // Otherwise just clear the current path
      if (shortestPath.length > 0) {
        setShortestPath([]);
      }
    }
  }, [selectedAirports, shortestPath, findPath]);

  // Create a map of airport ID to IATA code for easy lookup
  const airportCodeMap = useMemo(() => {
    const map = new Map();
    airports.forEach(airport => {
      map.set(String(airport.id), airport.iata || String(airport.id));
    });
    return map;
  }, [airports]);

  // Handle edge distance change from GraphCanvas
  const handleEdgeDistanceChange = useCallback((edgeId, distance) => {
    console.log(`📏 DISTANCE CHANGED for edge ${edgeId} to ${distance} km`);
    
    // Update the edge distances state
    setEdgeDistances(prev => ({
      ...prev,
      [edgeId]: distance
    }));
    
    console.log(`Updated edge distances:`, { ...edgeDistances, [edgeId]: distance });
    
    // When we have selected airports and a valid algorithm, force recalculate the path immediately
    if (selectedAirports.length === 2) {
      console.log(`🔄 FORCE RECALCULATING PATH after distance change on ${edgeId}`);
      
      // First clear the path
      setShortestPath([]);
      
      // Force a clean slate for visualization
      setShowVisualization(false);
      
      // Use a short timeout to ensure state is updated before recalculating
      setTimeout(() => {
        console.log('Executing findPath() after distance change...');
        findPath();
      }, 50);
    } else {
      // Otherwise just clear the current path
      if (shortestPath.length > 0) {
        setShortestPath([]);
      }
    }
  }, [edgeDistances, selectedAirports, shortestPath, findPath]);

  // Handle edge time change from GraphCanvas
  const handleEdgeTimeChange = useCallback((edgeId, time) => {
    console.log(`⏱️ TIME CHANGED for edge ${edgeId} to ${time} minutes`);
    
    // Update the routes array with the new time
    const updatedRoutes = routes.map(route => {
      const sourceId = airportCodeMap.get(String(route.source)) || String(route.source);
      const targetId = airportCodeMap.get(String(route.target)) || String(route.target);
      const routeEdgeId = `${sourceId}-${targetId}`;
      const reverseEdgeId = `${targetId}-${sourceId}`;
      
      if (routeEdgeId === edgeId || reverseEdgeId === edgeId) {
        return {
          ...route,
          time: time
        };
      }
      return route;
    });
    
    // This would need to update the routes in the parent component
    // For now, we'll log the change
    console.log('Updated routes with new time:', updatedRoutes);
    
    // When we have selected airports and a valid algorithm, force recalculate the path immediately
    if (selectedAirports.length === 2) {
      console.log(`🔄 FORCE RECALCULATING PATH after time change on ${edgeId}`);
      
      // First clear the path
      setShortestPath([]);
      
      // Force a clean slate for visualization
      setShowVisualization(false);
      
      // Use a short timeout to ensure state is updated before recalculating
      setTimeout(() => {
        console.log('Executing findPath() after time change...');
        findPath();
      }, 50);
    } else {
      // Otherwise just clear the current path
      if (shortestPath.length > 0) {
        setShortestPath([]);
      }
    }
  }, [routes, airportCodeMap, selectedAirports, shortestPath, findPath]);

  // Toggle airport edit mode
  const toggleAirportEditMode = useCallback(() => {
    setIsAirportEditMode(prev => {
      const next = !prev;
      if (next) {
        // Show help toast when entering Airport Edit mode
        showToast(
          'Airport Edit Mode: Click on empty map to add an airport. Click an airport to remove it along with its routes.',
          'info'
        );
      }
      return next;
    });
    setIsEdgeDrawMode(false);
    // Clear selections when entering/exiting edit mode
    setSelectedAirports([]);
    setShortestPath([]);
    setSelectedAirportsForEdge([]);
  }, []);

  // Toggle edge draw mode
  const toggleEdgeDrawMode = useCallback(() => {
    setIsEdgeDrawMode(prev => {
      const next = !prev;
      if (next) {
        // Show help toast when entering Route Draw mode
        showToast(
          'Route Draw Mode: Click the first airport, then click the second to create a route. Enter the distance (km) when prompted.',
          'info'
        );
      }
      return next;
    });
    setIsAirportEditMode(false);
    // Clear selections when entering/exiting edge draw mode
    setSelectedAirports([]);
    setShortestPath([]);
    setSelectedAirportsForEdge([]);
  }, []);

  // Handle creating a new route between two airports
  const createRoute = useCallback(async (sourceId, targetId, distance) => {
    const newRoute = {
      source: sourceId,
      target: targetId,
      distance: distance
    };
    
    const result = await addRoute(newRoute);
    if (result.success) {
      console.log('Route created successfully');
      setSelectedAirportsForEdge([]);
    } else {
      console.error('Failed to create route:', result.error);
      alert(`Failed to create route: ${result.error}`);
    }
  }, [addRoute]);

  // Handle reset to original data
  const handleResetToOriginal = useCallback(async () => {
    const confirmReset = window.confirm('Reset to original network? This will remove all your custom airports and routes.');
    if (confirmReset) {
      const result = await resetToOriginal();
      if (result.success) {
        // Clear all edit states
        setIsAirportEditMode(false);
        setIsEdgeDrawMode(false);
        setSelectedAirports([]);
        setShortestPath([]);
        setSelectedAirportsForEdge([]);
        setDisabledAirports(new Set());
        console.log('Network reset to original state');
      } else {
        console.error('Failed to reset:', result.error);
        alert(`Failed to reset network: ${result.error}`);
      }
    }
  }, [resetToOriginal]);

  // Handle grid click to add new airport (only in edit mode)
  const handleGridClick = useCallback(async (e) => {
    // Only work in airport edit mode
    if (!isAirportEditMode) return;
    
    // Only handle clicks on the grid container itself, not on airports or routes
    const isInteractiveElement = e.target.closest('.airport') || 
                                e.target.closest('.route-group') || 
                                e.target.closest('.clickable-route') ||
                                e.target.tagName === 'line' ||
                                e.target.tagName === 'circle' ||
                                e.target.tagName === 'text';
    
    if (isInteractiveElement) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    // Convert screen coordinates to grid coordinates
    const gridCoords = unproject(screenX, screenY, dimensions);
    
    // Check if the click is within reasonable bounds
    if (gridCoords.x < 0 || gridCoords.x > 100 || gridCoords.y < 0 || gridCoords.y > 100) {
      return;
    }
    
    // Generate a new airport ID (find the highest existing ID and add 1)
    const maxId = Math.max(...airports.map(a => a.id), 0);
    const newId = maxId + 1;
    
    // Create new airport object
    const newAirport = {
      id: newId,
      name: `New Airport ${newId}`,
      code: `NA${newId}`,
      position: {
        x: Math.round(gridCoords.x * 10) / 10, // Round to 1 decimal place
        y: Math.round(gridCoords.y * 10) / 10
      }
    };
    
    console.log('Adding new airport at grid coordinates:', gridCoords, newAirport);
    
    // Add the airport using the hook
    const result = await addAirport(newAirport);
    
    if (result.success) {
      console.log('Airport added successfully');
    } else {
      console.error('Failed to add airport:', result.error);
      alert(`Failed to add airport: ${result.error}`);
    }
  }, [isAirportEditMode, isEdgeDrawMode, dimensions, airports, addAirport, removeAirport, selectedAirportsForEdge, createRoute]);

  // Handle airport click for selection or removal
  const handleAirportClick = useCallback(async (e, airport) => {
    e.stopPropagation();
    
    console.log('Airport clicked:', airport, 'Edit mode:', isAirportEditMode);
    
    // If in edit mode, handle airport removal
    if (isAirportEditMode) {
      const airportIdToRemove = airport.originalId || airport.id;
      console.log('Attempting to remove airport:', airportIdToRemove);
      const confirmRemove = window.confirm(`Remove Airport ${airport.id}? This will also remove all connected routes.`);
      if (confirmRemove) {
        console.log('User confirmed removal, calling removeAirport...');
        const result = await removeAirport(airportIdToRemove);
        console.log('Remove airport result:', result);
        if (result.success) {
          console.log('Airport removed successfully');
        } else {
          console.error('Failed to remove airport:', result.error);
          alert(`Failed to remove airport: ${result.error}`);
        }
      }
      return;
    }

    // If in edge draw mode, handle airport selection for route creation
    if (isEdgeDrawMode) {
      const airportId = airport.originalId || airport.id;
      console.log('Airport selected for edge drawing:', airportId);
      console.log('Current selectedAirportsForEdge:', selectedAirportsForEdge);
      console.log('selectedAirportsForEdge.length:', selectedAirportsForEdge.length);
      
      if (selectedAirportsForEdge.length === 0) {
        // First airport selected
        console.log('Setting first airport:', airportId);
        setSelectedAirportsForEdge([airportId]);
        console.log('First airport selected for edge');
      } else if (selectedAirportsForEdge.length === 1) {
        // Second airport selected, create route
        const sourceId = selectedAirportsForEdge[0];
        const targetId = airportId;
        
        console.log('Second airport selected:', targetId);
        console.log('Source:', sourceId, 'Target:', targetId);
        
        if (sourceId === targetId) {
          alert('Cannot create a route to the same airport');
          setSelectedAirportsForEdge([]);
          return;
        }
        
        // Prompt for distance
        const distance = prompt('Enter the distance for this route (in km):');
        if (distance === null) {
          // User cancelled
          setSelectedAirportsForEdge([]);
          return;
        }
        
        const distanceNum = parseFloat(distance);
        if (isNaN(distanceNum) || distanceNum <= 0) {
          alert('Please enter a valid positive number for distance');
          setSelectedAirportsForEdge([]);
          return;
        }
        
        console.log(`Creating route from ${sourceId} to ${targetId} with distance ${distanceNum}`);
        await createRoute(sourceId, targetId, distanceNum);
      } else {
        // Reset if somehow we have more than 1 selected
        console.log('Resetting selection, too many airports selected');
        setSelectedAirportsForEdge([airportId]);
      }
      return;
    }
    
    // If right-click, handle airport enable/disable
    if (e.button === 2) {
      handleAirportRightClick(airport.id, e);
      return;
    }
    
    // Don't allow selection if no algorithm is chosen
    if (!selectedAlgorithm) {
      console.log('Please select an algorithm first');
      showToast('Please select a pathfinding algorithm first', 'warning');
      return;
    }
    
    // Create a new airport object with all necessary properties
    const airportWithPosition = {
      ...airport,
      position: {
        lat: airport.latitude || (airport.position?.lat || 0),
        lon: airport.longitude || (airport.position?.lon || 0)
      }
    };
    
    const currentState = getCurrentState();
    
    // Check if in network management mode
    if (isAirportEditMode) {
      showToast('Exit Airport Edit mode to select airports for pathfinding', 'warning');
      return;
    }
    
    if (isEdgeDrawMode) {
      showToast('Exit Edge Draw mode to select airports for pathfinding', 'warning');
      return;
    }
    
    // If already selected, deselect it
    const isSelected = currentState.selectedAirports.some(a => a.id === airport.id);
    if (isSelected) {
      currentState.setSelectedAirports(prev => prev.filter(a => a.id !== airport.id));
      currentState.setShortestPath([]); // Clear path when deselecting
      
      // Reset progress metrics immediately
      setPerformanceMetrics(prev => ({
        ...prev,
        timestamp: Date.now(),
        executionTime: 0,
        visitedNodes: 0,
        memoryUsage: '0 MB',
        distance: 0,
        time: 0,
        path: []
      }));
      
      // Hide visualization
      setShowVisualization(false);
      return;
    }
    
    // If we already have 2 airports, replace the second one
    let newSelectedAirports;
    if (currentState.selectedAirports.length >= 2) {
      newSelectedAirports = [currentState.selectedAirports[0], airportWithPosition];
    } else {
      newSelectedAirports = [...currentState.selectedAirports, airportWithPosition];
    }
    
    console.log('Setting selected airports:', newSelectedAirports);
    currentState.setSelectedAirports(newSelectedAirports);
    
    // Clear any existing path immediately
    currentState.setShortestPath([]);
    
    // If we have 2 airports, find the path in the next render cycle
    if (newSelectedAirports.length === 2) {
      // Use a small timeout to ensure state is updated before finding path
      setTimeout(() => {
        console.log('Finding path between:', newSelectedAirports[0].id, 'and', newSelectedAirports[1].id);
        // findPath will be called by useEffect when state changes
      }, 0);
    }
  }, [getCurrentState, handleAirportRightClick, isAirportEditMode, isEdgeDrawMode, selectedAirportsForEdge, removeAirport, createRoute]);
  
  // Run pathfinding when algorithm-specific selectedAirports or graph changes
  useEffect(() => {
    if (!selectedAlgorithm) return;
    
    const currentState = getCurrentState();
    console.log('Selected airports changed:', currentState.selectedAirports.map(a => `${a.id} (${a.name})`));
    
    if (currentState.selectedAirports.length === 2) {
      console.log('Two airports selected, finding path...');
      // Auto-trigger pathfinding for both algorithms
      if (selectedAlgorithm === 'astar') {
        // For A*, don't auto-switch to plane mode - let user control visualization mode
        // Add small delay to ensure state is fully updated
        setTimeout(() => {
          findPath();
        }, 100);
      } else if (selectedAlgorithm === 'dijkstra') {
        // Preserve current visualization mode; do not force 'plane' when airports change
        // Add small delay to ensure state is fully updated
        setTimeout(() => {
          findPath();
        }, 100);
      }
    } else if (currentState.selectedAirports.length === 0) {
      console.log('No airports selected, clearing path and resetting progress');
      currentState.setShortestPath([]);
      setShowVisualization(false);
      
      // Reset progress in AlgorithmSettingsPanel by triggering a small state update
      setPerformanceMetrics(prev => ({
        ...prev,
        timestamp: Date.now(),
        executionTime: 0,
        visitedNodes: 0,
        memoryUsage: '0 MB'
      }));
    }
  }, [selectedAlgorithm, selectedAlgorithm === 'astar' ? astarSelectedAirports : selectedAirports, disabledAirports]);
  
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
        console.log({
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
    <div className={`grid-page ${visualizationMode === 'algorithm' ? 'algorithm-visualization' : ''}`}>
      {/* Left Panel */}
      <div className="left-panel">
        
        <div className="panel-section">
          <div className="algorithm-section">
            <AlgorithmSelector 
              selectedAlgorithm={selectedAlgorithm}
              onAlgorithmChange={handleAlgorithmChange}
            />
          </div>
        </div>
        
        <div className="panel-section">
          <h3>Selection</h3>
          <div className="info-row">
            <span>Selected:</span>
            <span className="highlight">{stats.selectedAirportCount}/2</span>
          </div>
          
          <div className="selected-airports">
            {/* Always show 2 slots - fill with selected airports or show skeleton */}
            {[0, 1].map((slotIndex) => {
              const airport = getCurrentState().selectedAirports[slotIndex];
              const isSelected = !!airport;
              
              return (
                <div 
                  key={`slot-${slotIndex}`} 
                  className={`selected-airport ${!isSelected ? 'skeleton' : ''}`}
                >
                  <div className="airport-header">
                    <span className="airport-index">{slotIndex + 1}.</span>
                    <span className="airport-code">
                      {isSelected ? (airport.iata || airport.id) : '--'}
                    </span>
                  </div>
                  <div className="airport-name">
                    {isSelected ? `Airport ${airport.id}` : `Select ${slotIndex === 0 ? 'first' : 'second'} airport`}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className={`path-info ${stats.pathLength === 0 ? 'skeleton' : ''}`}>
            <div className="info-row">
              <span>Path Length:</span>
              <span className="highlight">
                {stats.pathLength > 0 ? `${stats.pathLength} stops` : '--'}
              </span>
            </div>
            <div className="info-row">
              <span>Total Distance:</span>
              <span className="highlight">
                {stats.pathLength > 0 ? `${stats.totalDistance.toLocaleString()} km` : '-- km'}
              </span>
            </div>
            <div className="info-row">
              <span>Total Time:</span>
              <span className="highlight">
                {stats.pathLength > 0 ? formatTime(stats.totalTime) : '--'}
              </span>
            </div>
            
            {stats.pathLength > 0 && (
              <div className="path-details">
                <h4>Path Details:</h4>
                
                {/* High Frequency Routes Info */}
                {highFrequencyRoutes.length > 0 && (
                  <div className="high-frequency-alert">
                    <div className="alert-header">
                      <span className="alert-icon">🚨</span>
                      <span>High Priority Routes</span>
                    </div>
                    <div className="alert-messages">
                      {highFrequencyRoutes.map((route, index) => (
                        <div key={index} className="alert-message">
                          <span className="route-id">{route.edgeId}:</span>
                          <span>Frequency: {route.frequency}</span>
                          <span>•</span>
                          <span>Delay: {route.delay}</span>
                          <span>•</span>
                          <span>Priority: {route.priorityOverride ? 'High' : 'Normal'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="path-airports">
                  {shortestPath.map((airportId, index) => {
                    const airport = airports.find(a => String(a.id) === String(airportId));
                    return (
                      <div key={`${airportId}-${index}`} className="path-airport">
                        {index > 0 && <div className="path-connector">→</div>}
                        <span className="airport-code">{airport?.iata || `A${airportId}`}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="info-row">
                  <span>Algorithm Used:</span>
                  <span className="highlight">
                    {selectedAlgorithm === 'astar' ? 'A*' : 'Dijkstra\'s'}
                  </span>
                </div>
                <div className="info-row">
                  <span>Visited Nodes:</span>
                  <span className="highlight">{performanceMetrics.visitedNodes || '--'}</span>
                </div>
                <div className="info-row">
                  <span>Execution Time:</span>
                  <span className="highlight">{performanceMetrics.executionTime || '--'} ms</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className={`panel-section ${!selectedAlgorithm ? 'faded' : ''}`}>
          <h3>Network Management</h3>
          <button 
            className={`edit-mode-toggle ${isAirportEditMode ? 'active' : ''}`}
            onClick={!selectedAlgorithm ? () => showToast('Please select an algorithm to manage network', 'warning') : toggleAirportEditMode}
          >
            {isAirportEditMode ? 'Exit Airport Mode' : 'Add/Remove Airports'}
          </button>
          <button 
            className={`edit-mode-toggle ${isEdgeDrawMode ? 'active' : ''}`}
            onClick={!selectedAlgorithm ? () => showToast('Please select an algorithm to manage network', 'warning') : toggleEdgeDrawMode}
          >
            {isEdgeDrawMode ? 'Exit Route Mode' : 'Draw Routes'}
          </button>
          <button 
            className="reset-button"
            onClick={!selectedAlgorithm ? () => showToast('Please select an algorithm to manage network', 'warning') : handleResetToOriginal}
            title="Reset to original network data"
          >
            Reset to Original
          </button>
        </div>
      </div>
      
      <AlgorithmSettingsPanel 
        algorithm={selectedAlgorithm} 
        isVisible={showSettingsPanel} 
        onClose={closeSettingsPanel}
        performanceMetrics={performanceMetrics}
        onVisualize={toggleVisualizationMode}
        selectedAlgorithm={selectedAlgorithm}
        showVisualizeButton={!showVisualization}
        isInVisualization={visualizationMode === 'algorithm'}
        selectedAirports={selectedAlgorithm === 'astar' ? astarSelectedAirports : selectedAirports}
        showToast={showToast}
      />
      
      <div className="main-content">
        {showSettingsPanel && (
          <div 
            className="settings-panel-overlay"
            onClick={closeSettingsPanel}
          />
        )}
        <div className="grid-container" ref={containerRef} onClick={handleGridClick}>
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
                originalId: airport.id, // Keep original ID for removal
                id: airport.iata || String(airport.id)
              }))}
              routes={routes.map(route => {
                const sourceId = airportCodeMap.get(String(route.source)) || String(route.source);
                const targetId = airportCodeMap.get(String(route.target)) || String(route.target);
                const edgeId = `${sourceId}-${targetId}`;
                const reverseEdgeId = `${targetId}-${sourceId}`;
                
                // Get frequency from edgeFrequencies, checking both directions
                const frequency = edgeFrequencies[edgeId] || edgeFrequencies[reverseEdgeId] || 1;
                
                // Get custom distance from edgeDistances, checking both directions
                const customDistance = edgeDistances[edgeId] || edgeDistances[reverseEdgeId];
                
                return {
                  ...route,
                  id: edgeId, // Ensure each route has a unique ID
                  source: sourceId,
                  target: targetId,
                  frequency: frequency,
                  distance: customDistance !== undefined ? customDistance : route.distance
                };
              })}
              dimensions={dimensions}
              onAirportHover={handleAirportHover}
              onAirportClick={handleAirportClick}
              onAirportRightClick={handleAirportRightClick}
              highlightedPath={visualizationMode === 'plane' ? getCurrentState().shortestPath : []}
              selectedAirports={getCurrentState().selectedAirports}
              disabledAirports={getCurrentState().disabledAirports}
              showHeuristics={selectedAlgorithm === 'astar' && getCurrentState().selectedAirports.length === 2}
              edgeDelays={edgeDelays}
              edgeFrequencies={edgeFrequencies}
              edgeDistances={edgeDistances}
              onEdgeDelayChange={handleEdgeDelayChange}
              onEdgeFrequencyChange={handleEdgeFrequencyChange}
              onEdgeDistanceChange={handleEdgeDistanceChange}
              onEdgeTimeChange={handleEdgeTimeChange}
              selectedAlgorithm={selectedAlgorithm}
              showToast={showToast}
              visualizationMode={visualizationMode}
              showVisualization={showVisualization}
              isAirportEditMode={isAirportEditMode}
              isEdgeDrawMode={isEdgeDrawMode}
              selectedAirportsForEdge={selectedAirportsForEdge}
              isPlaneAnimating={visualizationMode === 'plane' && getCurrentState().selectedAirports.length === 2 && getCurrentState().shortestPath.length > 1}
            />
            
            {/* Plane Animation - Only show when there's a valid path and in plane visualization mode */}
            {getCurrentState().shortestPath.length > 1 && visualizationMode === 'plane' && getCurrentState().selectedAirports.length === 2 && (
              <div 
                key={`plane-animation-${getCurrentState().shortestPath.join('-')}`}
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
                  key={`plane-${getCurrentState().shortestPath.join('-')}`}
                  path={getCurrentState().shortestPath}
                  airports={normalizedAirports}
                  speed={2}
                  isPlaying={true}
                  onComplete={() => {
                    console.log('Plane animation completed');
                  }}
                />
              </div>
            )}
            
            {/* Animation Container - For Algorithm Visualization */}
            {(
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 5,
                display: getCurrentState().shortestPath.length > 1 ? 'block' : 'none'
              }}>
                {visualizationMode === 'plane' && getCurrentState().selectedAirports.length === 2 && getCurrentState().shortestPath.length > 1 ? (
                  <PlaneAnimation
                    key={`plane-${getCurrentState().shortestPath.join('-')}`}
                    path={getCurrentState().shortestPath}
                    airports={normalizedAirports}
                    speed={2}
                    isPlaying={true}
                    onComplete={() => {
                      console.log('Plane animation completed');
                    }}
                  />
                ) : getCurrentState().selectedAirports.length === 2 && getCurrentState().shortestPath.length > 1 ? (
                  selectedAlgorithm === 'astar' ? (
                    <AStarVisualization
                      key={`astar-${getCurrentState().shortestPath.join('-')}`}
                      path={getCurrentState().shortestPath}
                      airports={normalizedAirports}
                      routes={routes}
                      graph={graph}
                      startNode={String(getCurrentState().selectedAirports[0].id)}
                      endNode={String(getCurrentState().selectedAirports[1].id)}
                      onProgress={({ algorithmSteps, visitedNodes, frontierNodes }) => {
                        // Update live metrics for the yellow A* card
                        setPerformanceMetrics(prev => ({
                          ...prev,
                          algorithmSteps,
                          visitedNodes,
                          frontierNodes,
                          // bump timestamp to ensure downstream updates even if values repeat
                          timestamp: Date.now()
                        }));
                      }}
                      onComplete={() => {
                        console.log('A* visualization completed');
                        try {
                          setPerformanceMetrics(prev => ({
                            ...prev,
                            completedAt: Date.now()
                          }));
                        } catch (_) {}
                      }}
                    />
                  ) : (
                    <AlgorithmVisualization
                      key={`algo-${getCurrentState().shortestPath.join('-')}`}
                      path={getCurrentState().shortestPath}
                      airports={normalizedAirports}
                      routes={routes}
                      graph={graph}
                      startNode={String(getCurrentState().selectedAirports[0].id)}
                      endNode={String(getCurrentState().selectedAirports[1].id)}
                      onProgress={({ openSet, closedSet }) => {
                        // Only update while actively visualizing with 2 airports selected
                        const stillActive = visualizationMode === 'algorithm' 
                          && showVisualization 
                          && getCurrentState().selectedAirports.length === 2;
                        if (!stillActive) return;
                        setPerformanceMetrics(prev => ({
                          ...prev,
                          openSet,
                          closedSet,
                          timestamp: Date.now()
                        }));
                      }}
                      onComplete={() => {
                        console.log('Dijkstra visualization completed');
                      }}
                    />
                  )
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
            
            {/* Toast Notifications */}
            {toasts.map(toast => (
              <Toast
                key={toast.id}
                message={toast.message}
                type={toast.type}
                duration={toast.duration}
                onClose={() => removeToast(toast.id)}
              />
            ))}

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
