import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlane, FaPlay, FaPause, FaStepForward, FaStepBackward } from 'react-icons/fa';
import styled, { keyframes } from 'styled-components';

// Simplified colors for better visibility
const colors = {
  start: '#10B981',    // Green
  end: '#EF4444',      // Red
  current: '#F59E0B',  // Amber
  visited: '#3B82F6',  // Blue
  path: '#8B5CF6',     // Purple
  default: '#6B7280',  // Gray
  line: '#4B5563',     // Dark gray lines
  text: '#E5E7EB'      // Light text
};

// Styled components
const Container = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  pointer-events: none;
`;

const Svg = styled.svg`
  width: 100%;
  height: 100%;
  background-color: ${colors.background};
  border-radius: 8px;
  overflow: visible;
  
  /* Gradient definitions */
  .gradient-defs {
    position: absolute;
    height: 0;
    width: 0;
  }
`;

// Airplane icon node
const AirplaneIcon = styled(FaPlane)`
  width: 100%;
  height: 100%;
  color: ${props => {
    if (props.className?.includes('start')) return '#10B981'; // Green for start
    if (props.className?.includes('end')) return '#EF4444';   // Red for end
    if (props.className?.includes('path')) return '#8B5CF6';  // Purple for path
    if (props.className?.includes('visiting')) return '#F59E0B'; // Amber for visiting
    if (props.className?.includes('visited')) return '#3B82F6'; // Blue for visited
    return '#6B7280'; // Gray for unvisited
  }};
  transition: all 0.3s ease;
  transform: rotate(45deg);
  opacity: ${props => props.className?.includes('unvisited') ? '0.3' : '0.8'};
  
  &:hover {
    transform: rotate(45deg) scale(1.2);
    opacity: 1;
  }
`;

const Line = styled(motion.line)`
  stroke: ${props => props.isPath ? colors.path : colors.line};
  stroke-width: ${props => props.isPath ? 2 : 1};
  stroke-linecap: round;
  opacity: ${props => props.isPath ? 0.9 : 0.3};
  pointer-events: none;
`;

const EdgeLabel = styled.text`
  font-size: 12px;
  fill: white;
  text-anchor: middle;
  dominant-baseline: middle;
  pointer-events: none;
  font-family: Arial, sans-serif;
  font-weight: bold;
  text-shadow: 
    -1px -1px 0 #000,
     0   -1px 0 #000,
     1px -1px 0 #000,
     1px  0   0 #000,
     1px  1px 0 #000,
     0    1px 0 #000,
    -1px  1px 0 #000,
    -1px  0   0 #000;
`;

const NodeLabel = styled.text`
  fill: white;
  font-size: 2.5px;
  text-anchor: middle;
  dominant-baseline: middle;
  pointer-events: none;
  user-select: none;
  font-weight: bold;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.8);
`;

// Animation variants for nodes and edges
const nodeVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: (custom) => ({
    scale: [1, 1.4, 1],
    opacity: 1,
    transition: {
      delay: custom * 0.2,
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1]
    },
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    boxShadow: '0 0 10px 3px rgba(255, 255, 255, 0.8)'
  })
};



const edgeVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (custom) => ({
    pathLength: 1,
    opacity: 0.7,
    transition: {
      delay: custom * 0.2 + 0.3,
      duration: 0.8,
      ease: 'easeInOut'
    }
  })
};

const pathVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (custom) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      delay: custom * 0.1 + 0.3,
      duration: 0.8,
      ease: 'easeInOut'
    }
  })
};

const SimpleAStarVisualization = ({
  startPoint = null,
  endPoint = null,
  dimensions = { width: 100, height: 100 },
  nodeCount = 15,
  speed = 100,
  onComplete = () => {}
}) => {
  // State declarations
  const [nodes, setNodes] = useState([]);
  const [lines, setLines] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentNode, setCurrentNode] = useState(null);
  const [visitedNodes, setVisitedNodes] = useState(new Set());
  const [path, setPath] = useState([]);
  const [animationSteps, setAnimationSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(speed);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState(null);
  
  // New state for enhanced A* visualization
  const [evaluationData, setEvaluationData] = useState({});
  const [frontierNodes, setFrontierNodes] = useState(new Set());
  const [bestFrontierNode, setBestFrontierNode] = useState(null);

  // Main airports data with relative positions (0-100 range)
  const mainAirports = useMemo(() => [
    { id: 'jfk', name: 'JFK', x: 80, y: 25 },
    { id: 'lax', name: 'LAX', x: 15, y: 40 },
    { id: 'ord', name: 'ORD', x: 45, y: 30 },
    { id: 'dfw', name: 'DFW', x: 35, y: 55 },
    { id: 'den', name: 'DEN', x: 30, y: 35 },
    { id: 'sfo', name: 'SFO', x: 10, y: 30 },
    { id: 'sea', name: 'SEA', x: 15, y: 15 },
    { id: 'atl', name: 'ATL', x: 60, y: 60 },
    { id: 'mco', name: 'MCO', x: 70, y: 75 },
    { id: 'las', name: 'LAS', x: 20, y: 45 }
  ]);

  // Generate nodes from main airports
  const generateNodes = useCallback(() => {
    if (!startPoint || !endPoint) return [];

    const newNodes = [];
    
    // Add start and end points
    newNodes.push({
      id: 'start',
      x: startPoint.x,
      y: startPoint.y,
      type: 'start',
      gScore: 0,
      fScore: 0,
      cameFrom: null,
    });

    // Add main airports
    mainAirports.forEach((airport) => {
      newNodes.push({
        id: airport.id,
        name: airport.name,
        x: airport.x,
        y: airport.y,
        type: 'airport',
        gScore: Infinity,
        fScore: Infinity,
        cameFrom: null,
      });
    });
    
    // Add end point
    newNodes.push({
      id: 'end',
      x: endPoint.x,
      y: endPoint.y,
      type: 'end',
      gScore: Infinity,
      fScore: Infinity,
      cameFrom: null,
    });
    
    return newNodes;
  }, [startPoint, endPoint, mainAirports]);
  
  // Initialize nodes when component mounts or when start/end points change
  useEffect(() => {
    if (startPoint && endPoint) {
      const newNodes = generateNodes();
      setNodes(newNodes);
      
      // Generate lines between nodes
      const newLines = [];
      const maxDistance = 30; // Maximum distance to connect nodes
      
      // Connect each node to its nearest neighbors
      newNodes.forEach((node1) => {
        // Find closest nodes within maxDistance
        const nearbyNodes = newNodes
          .filter(n => n.id !== node1.id)
          .map(node2 => ({
            ...node2,
            distance: Math.sqrt(
              Math.pow(node1.x - node2.x, 2) + 
              Math.pow(node1.y - node2.y, 2)
            )
          }))
          .filter(n => n.distance <= maxDistance)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 3); // Connect to up to 3 nearest nodes
        
        // Create lines to nearby nodes
        nearbyNodes.forEach(node2 => {
          // Check if line already exists
          const lineExists = newLines.some(
            line => 
              (line.x1 === node1.x && line.y1 === node1.y && 
               line.x2 === node2.x && line.y2 === node2.y) ||
              (line.x1 === node2.x && line.y1 === node2.y && 
               line.x2 === node1.x && line.y2 === node1.y)
          );
          
          if (!lineExists) {
            newLines.push({
              id: `line-${node1.id}-${node2.id}`,
              x1: node1.x,
              y1: node1.y,
              x2: node2.x,
              y2: node2.y,
              distance: Math.round(node2.distance * 10) / 10,
              isPath: false
            });
          }
        });
      });
      
      setLines(newLines);
    }
  }, [startPoint, endPoint, generateNodes]);

  // Generate lines between nodes
  const generateLines = useCallback((nodes) => {
    const newLines = [];
    const maxDistance = 20; // Maximum distance to connect nodes
    
    nodes.forEach((node1, i) => {
      // Skip if it's the end node
      if (node1.id === 'end') return;
      
      // Find closest nodes within maxDistance
      const nearbyNodes = nodes
        .filter(n => n.id !== node1.id)
        .map(node2 => ({
          ...node2,
          distance: Math.sqrt(
            Math.pow(node1.x - node2.x, 2) + 
            Math.pow(node1.y - node2.y, 2)
          )
        }))
        .filter(n => n.distance <= maxDistance)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3); // Connect to up to 3 nearest nodes
      
      nearbyNodes.forEach(node2 => {
        // Check if line already exists
        const lineExists = newLines.some(
          line => 
            (line.x1 === node1.x && line.y1 === node1.y && 
             line.x2 === node2.x && line.y2 === node2.y) ||
            (line.x1 === node2.x && line.y1 === node2.y && 
             line.x2 === node1.x && line.y2 === node1.y)
        );
        
        if (!lineExists) {
          newLines.push({
            id: `line-${node1.id}-${node2.id}`,
            x1: node1.x,
            y1: node1.y,
            x2: node2.x,
            y2: node2.y,
            distance: Math.round(node2.distance * 10) / 10,
            isPath: false
          });
        }
      });
    });
    
    return newLines;
  }, []);

  // Heuristic function (Euclidean distance)
  const heuristic = useCallback((node1, node2) => {
    return Math.sqrt(
      Math.pow(node1.x - node2.x, 2) + 
      Math.pow(node1.y - node2.y, 2)
    );
  }, []);

  // Calculate heuristic values for all nodes to display
  const nodeHeuristics = useMemo(() => {
    if (!nodes.length) return {};
    
    const endNode = nodes.find(n => n.id === 'end');
    if (!endNode) return {};
    
    const heuristics = {};
    nodes.forEach(node => {
      const h = heuristic(node, endNode);
      // Store both the raw value and formatted string for all nodes
      heuristics[node.id] = {
        value: h,
        formatted: h.toFixed(1)
      };
    });
    return heuristics;
  }, [nodes, heuristic]);

  // A* algorithm implementation
  const runAStar = useCallback((nodes, lines) => {
    const steps = [];
    const openSet = [];
    const closedSet = new Set();
    const nodeMap = {};
    const frontierSet = new Set(); // Track nodes in the frontier
    
    // Initialize nodes
    nodes.forEach(node => {
      nodeMap[node.id] = { ...node };
      if (node.id === 'start') {
        openSet.push(node.id);
        frontierSet.add(node.id);
      }
    });
    
    const endNode = nodeMap['end'];
    
    if (!endNode) {
      console.error('End node not found');
      return [];
    }
    
    // Add initial evaluation step showing heuristic calculation for the start node
    const startNode = nodeMap['start'];
    steps.push({
      type: 'evaluate',
      nodeId: startNode.id,
      gScore: 0,
      hScore: heuristic(startNode, endNode),
      fScore: heuristic(startNode, endNode),
      bestPath: true
    });
    
    // Main A* loop
    while (openSet.length > 0) {
      // Sort open set by fScore and find best node
      openSet.sort((a, b) => nodeMap[a].fScore - nodeMap[b].fScore);
      const currentId = openSet.shift();
      const current = nodeMap[currentId];
      
      // Remove from frontier and add to closed set
      frontierSet.delete(currentId);
      closedSet.add(currentId);
      
      // Record visit step - now with additional info to show focused exploration
      steps.push({
        type: 'visit',
        nodeId: currentId,
        fScore: current.fScore,
        gScore: current.gScore,
        hScore: heuristic(current, endNode),
        frontier: [...frontierSet] // Current frontier nodes
      });
      
      // Check if we've reached the end
      if (currentId === 'end') {
        // Reconstruct path
        const path = [];
        let currentPathId = currentId;
        
        while (currentPathId) {
          path.unshift(currentPathId);
          currentPathId = nodeMap[currentPathId]?.cameFrom;
        }
        
        // Add path steps
        for (let i = 0; i < path.length - 1; i++) {
          steps.push({
            type: 'path',
            from: path[i],
            to: path[i + 1]
          });
        }
        
        steps.push({ type: 'complete', path });
        break;
      }
      
      // Get neighbors from lines
      const neighbors = lines
        .filter(line => 
          (line.x1 === current.x && line.y1 === current.y) ||
          (line.x2 === current.x && line.y2 === current.y)
        )
        .map(line => {
          const isStart = line.x1 === current.x && line.y1 === current.y;
          const neighborId = isStart 
            ? nodes.find(n => n.x === line.x2 && n.y === line.y2)?.id
            : nodes.find(n => n.x === line.x1 && n.y === line.y1)?.id;
          
          return {
            id: neighborId,
            distance: line.distance
          };
        })
        .filter(n => n.id && !closedSet.has(n.id));
      
      // Process each neighbor and record the evaluation steps
      for (const neighbor of neighbors) {
        const neighborNode = nodeMap[neighbor.id];
        if (!neighborNode) continue;
        
        const tentativeGScore = current.gScore + neighbor.distance;
        const previousGScore = neighborNode.gScore;
        const hScore = heuristic(neighborNode, endNode);
        const newFScore = tentativeGScore + hScore;
        const betterPath = tentativeGScore < previousGScore;
        
        // Record the evaluation step for visualization
        steps.push({
          type: 'evaluate',
          nodeId: neighborNode.id,
          parentId: current.id,
          gScore: tentativeGScore,
          previousGScore,
          hScore,
          fScore: newFScore,
          distance: neighbor.distance,
          bestPath: betterPath
        });
        
        if (!openSet.includes(neighborNode.id)) {
          openSet.push(neighborNode.id);
          frontierSet.add(neighborNode.id);
        } else if (tentativeGScore >= neighborNode.gScore) {
          continue; // This is not a better path
        }
        
        // This path is the best so far, record it
        neighborNode.cameFrom = currentId;
        neighborNode.gScore = tentativeGScore;
        neighborNode.fScore = newFScore;
      }
      
      // After processing all neighbors, add a step showing the updated frontier
      if (neighbors.length > 0) {
        steps.push({
          type: 'frontier',
          currentNodeId: currentId,
          frontierNodes: [...frontierSet],
          openSet: [...openSet].map(id => ({
            id,
            fScore: nodeMap[id].fScore,
            gScore: nodeMap[id].gScore,
            hScore: heuristic(nodeMap[id], endNode)
          })).sort((a, b) => a.fScore - b.fScore)
        });
      }
    }
    
    return steps;
  }, [heuristic]);
  
  // Process a single animation step
  const processAnimationStep = useCallback((steps, index, isForward = true) => {
    // Handle step out of bounds
    if (index >= steps.length || index < 0) {
      if (index >= steps.length) {
        setIsRunning(false);
        onComplete();
      }
      return;
    }
    
    // Apply the current step
    const step = steps[index];
    setCurrentStep(index);
    
    if (isForward) {
      // Forward step processing
      switch (step.type) {
        case 'evaluate':
          // Store evaluation data for display
          setEvaluationData(prev => ({
            ...prev,
            [step.nodeId]: {
              gScore: step.gScore,
              hScore: step.hScore,
              fScore: step.fScore,
              parentId: step.parentId,
              bestPath: step.bestPath
            }
          }));
          // Don't change current node during evaluation
          break;
          
        case 'frontier':
          // Update frontier nodes
          setFrontierNodes(new Set(step.frontierNodes));
          // Set best node from the sorted open set
          if (step.openSet && step.openSet.length > 0) {
            setBestFrontierNode(step.openSet[0].id);
          }
          break;
          
        case 'visit':
          // Update visited nodes
          setVisitedNodes(prev => {
            const newVisited = new Set(prev);
            newVisited.add(step.nodeId);
            return newVisited;
          });
          // Update current node
          setCurrentNode(step.nodeId);
          // Update frontier if available
          if (step.frontier) {
            setFrontierNodes(new Set(step.frontier));
          }
          break;
          
        case 'path':
          setPath(prev => [...prev, step.from, step.to]);
          break;
          
        case 'complete':
          setPath(step.path);
          setCurrentNode(null);
          setFrontierNodes(new Set()); // Clear frontier
          break;
      }
    } else {
      // Backward step processing - revert the previous step
      const previousStep = steps[index + 1]; // The step we're undoing
      if (!previousStep) return;
      
      switch (previousStep.type) {
        case 'evaluate':
          // Remove evaluation data for this node
          setEvaluationData(prev => {
            const newData = { ...prev };
            delete newData[previousStep.nodeId];
            return newData;
          });
          break;
          
        case 'frontier':
          // Reconstruct frontier from previous steps
          const prevFrontierStep = steps.slice(0, index + 1)
            .filter(s => s.type === 'frontier' || s.type === 'visit')
            .pop();
          
          if (prevFrontierStep?.frontierNodes) {
            setFrontierNodes(new Set(prevFrontierStep.frontierNodes));
          } else if (prevFrontierStep?.frontier) {
            setFrontierNodes(new Set(prevFrontierStep.frontier));
          } else {
            setFrontierNodes(new Set());
          }
          
          // Update best frontier node
          const prevBestNodeStep = steps.slice(0, index + 1)
            .filter(s => s.type === 'frontier' && s.openSet?.length > 0)
            .pop();
          
          if (prevBestNodeStep) {
            setBestFrontierNode(prevBestNodeStep.openSet[0].id);
          } else {
            setBestFrontierNode(null);
          }
          break;
          
        case 'visit':
          setVisitedNodes(prev => {
            const newVisited = new Set(prev);
            newVisited.delete(previousStep.nodeId);
            return newVisited;
          });
          // Set current node to the last visited node
          const lastVisitStep = steps.slice(0, index + 1)
            .filter(s => s.type === 'visit')
            .pop();
          setCurrentNode(lastVisitStep ? lastVisitStep.nodeId : null);
          break;
          
        case 'path':
          // Remove the last segment from the path
          setPath(prev => {
            const newPath = [...prev];
            newPath.pop(); // Remove to
            newPath.pop(); // Remove from
            return newPath;
          });
          break;
          
        case 'complete':
          // Revert to the path state before completion
          const pathSteps = steps
            .slice(0, index + 1)
            .filter(s => s.type === 'path');
            
          // Reconstruct path from path steps
          const reconstructedPath = [];
          pathSteps.forEach(pathStep => {
            if (!reconstructedPath.includes(pathStep.from)) {
              reconstructedPath.push(pathStep.from);
            }
            if (!reconstructedPath.includes(pathStep.to)) {
              reconstructedPath.push(pathStep.to);
            }
          });
          
          setPath(reconstructedPath);
          // Set current node to last visited
          const lastVisit = steps.slice(0, index + 1)
            .filter(s => s.type === 'visit')
            .pop();
          setCurrentNode(lastVisit ? lastVisit.nodeId : null);
          
          // Restore frontier from last frontier step
          const lastFrontierStep = steps.slice(0, index + 1)
            .filter(s => s.type === 'frontier' || (s.type === 'visit' && s.frontier))
            .pop();
          
          if (lastFrontierStep?.frontierNodes) {
            setFrontierNodes(new Set(lastFrontierStep.frontierNodes));
          } else if (lastFrontierStep?.frontier) {
            setFrontierNodes(new Set(lastFrontierStep.frontier));
          }
          
          break;
      }
    }
  }, [onComplete]);
  
  // Auto-advance to next step during playback
  const autoAdvanceStep = useCallback(() => {
    if (!isPaused && isRunning && currentStep < animationSteps.length - 1) {
      // Calculate delay based on step type
      const step = animationSteps[currentStep];
      let delay = playbackSpeed;
      if (step) {
        if (step.type === 'visit') delay = playbackSpeed * 1.5;
        else if (step.type === 'path') delay = playbackSpeed * 2;
        else if (step.type === 'complete') delay = playbackSpeed * 3;
      }
      
      const timer = setTimeout(() => {
        processAnimationStep(animationSteps, currentStep + 1, true);
        setCurrentStep(prevStep => prevStep + 1);
      }, delay);
      
      setAutoAdvanceTimer(timer);
      
      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [animationSteps, currentStep, isRunning, isPaused, playbackSpeed, processAnimationStep]);
  
  // Control playback functions
  const playAnimation = useCallback(() => {
    if (currentStep >= animationSteps.length - 1) {
      // Reset if at the end
      setVisitedNodes(new Set());
      setPath([]);
      setCurrentNode(null);
      setCurrentStep(0);
    }
    
    setIsPaused(false);
    setIsRunning(true);
  }, [animationSteps.length, currentStep]);
  
  const pauseAnimation = useCallback(() => {
    setIsPaused(true);
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }
  }, [autoAdvanceTimer]);
  
  const goToNextStep = useCallback(() => {
    if (currentStep < animationSteps.length - 1) {
      processAnimationStep(animationSteps, currentStep + 1, true);
      setCurrentStep(prevStep => prevStep + 1);
    }
  }, [animationSteps, currentStep, processAnimationStep]);
  
  const goToPreviousStep = useCallback(() => {
    if (currentStep > 0) {
      processAnimationStep(animationSteps, currentStep - 1, false);
      setCurrentStep(prevStep => prevStep - 1);
    }
  }, [animationSteps, currentStep, processAnimationStep]);
  
  const resetAnimation = useCallback(() => {
    setVisitedNodes(new Set());
    setPath([]);
    setCurrentNode(null);
    setCurrentStep(0);
    setIsPaused(true);
    setIsRunning(false);
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }
  }, [autoAdvanceTimer]);
  
  // Trigger auto-advance during playback
  useEffect(() => {
    if (isRunning && !isPaused) {
      autoAdvanceStep();
    }
    return () => {
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
      }
    };
  }, [isRunning, isPaused, currentStep, autoAdvanceStep, autoAdvanceTimer]);
  
  // Initialize nodes and lines and run A* algorithm
  useEffect(() => {
    if (!startPoint || !endPoint) return;
    
    const newNodes = generateNodes();
    const newLines = generateLines(newNodes);
    setNodes(newNodes);
    setLines(newLines);
    
    // Run A* algorithm but don't auto-start animation
    const timer = setTimeout(() => {
      const steps = runAStar(newNodes, newLines);
      if (steps.length > 0) {
        setAnimationSteps(steps);
        setCurrentStep(0);
        setIsPaused(true);  // Start in paused state
      } else {
        console.error('No steps generated by A* algorithm');
      }
    }, 500); // Short delay to ensure nodes are rendered
    
    return () => clearTimeout(timer);
  }, [startPoint, endPoint, generateNodes, generateLines, runAStar]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clean up any pending timeouts or intervals
      setCurrentNode(null);
      setVisitedNodes(new Set());
      setPath([]);
      setAnimationSteps([]);
      setCurrentStep(0);
    };
  }, []);
  
  // Initialize but don't auto-start animation when steps are ready
  useEffect(() => {
    if (animationSteps.length > 0 && !isInitialized) {
      setIsInitialized(true);
      // Initialize state but don't auto-play
      setVisitedNodes(new Set());
      setPath([]);
      setCurrentNode(null);
      setCurrentStep(0);
    }
    
    // Clean up on unmount
    return () => {
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
      }
      setIsRunning(false);
    };
  }, [animationSteps, isInitialized, autoAdvanceTimer]);

  // Check if a line is part of the path
  const isLineInPath = useCallback((line) => {
    return path.some((nodeId, idx) => {
      if (idx >= path.length - 1) return false;
      
      const nextNodeId = path[idx + 1];
      const node1 = nodes.find(n => n.id === nodeId);
      const node2 = nodes.find(n => n.id === nextNodeId);
      
      if (!node1 || !node2) return false;
      
      return (
        (node1.x === line.x1 && node1.y === line.y1 && 
         node2.x === line.x2 && node2.y === line.y2) ||
        (node1.x === line.x2 && node1.y === line.y2 && 
         node2.x === line.x1 && node2.y === line.y1)
      );
    });
  }, [path, nodes]);

  // Get node class and style based on its state
  const getNodeState = (node) => {
    if (node.id === 'start') return { 
      type: 'start', 
      color: '#10B981', 
      bgColor: 'rgba(16, 185, 129, 0.3)',
      text: 'START',
      size: 1.8,
      textSize: '1.4px'
    };
    if (node.id === 'end') return { 
      type: 'end', 
      color: '#EF4444', 
      bgColor: 'rgba(239, 68, 68, 0.3)',
      text: 'END',
      size: 1.8,
      textSize: '1.4px'
    };
    if (path.includes(node.id)) return { 
      type: 'path', 
      color: '#8B5CF6', 
      bgColor: 'rgba(139, 92, 246, 0.3)',
      text: node.name || node.id.toUpperCase(),
      size: 1.5,
      textSize: '1.2px'
    };
    if (node.id === currentNode) return { 
      type: 'current', 
      color: '#F59E0B', 
      bgColor: 'rgba(245, 158, 11, 0.7)',
      text: node.name || node.id.toUpperCase(),
      size: 1.7,
      textSize: '1.3px',
      pulse: true
    };
    // Special highlight for the best node in frontier (with lowest f-score)
    if (node.id === bestFrontierNode) return {
      type: 'frontier-best',
      color: '#EC4899', // Pink
      bgColor: 'rgba(236, 72, 153, 0.5)',
      text: node.name || node.id.toUpperCase(),
      size: 1.6,
      textSize: '1.2px',
      glow: true
    };
    // Frontier nodes - nodes discovered but not yet processed
    if (frontierNodes.has(node.id)) return {
      type: 'frontier',
      color: '#14B8A6', // Teal
      bgColor: 'rgba(20, 184, 166, 0.4)',
      text: node.name || node.id.toUpperCase(),
      size: 1.5,
      textSize: '1.2px'
    };
    if (visitedNodes.has(node.id)) return { 
      type: 'visited', 
      color: '#3B82F6', 
      bgColor: 'rgba(59, 130, 246, 0.2)',
      text: node.name || node.id.toUpperCase(),
      size: 1.4,
      textSize: '1.1px'
    };
    return { 
      type: 'unvisited', 
      color: '#6B7280', 
      bgColor: 'rgba(107, 114, 128, 0.1)',
      text: node.name || node.id.toUpperCase(),
      size: 1.2,
      textSize: '1px',
      opacity: 0.7
    };
  };

  // Create control panel styling
  const ControlPanel = styled.div`
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(0, 0, 0, 0.8);
    border-radius: 8px;
    padding: 8px;
    display: flex;
    gap: 12px;
    align-items: center;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    z-index: 10;
    pointer-events: auto;
  `;
  
  const ControlButton = styled.button`
    background-color: #1E293B;
    color: white;
    border: none;
    border-radius: 4px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      background-color: #334155;
      transform: translateY(-2px);
    }
    
    &:active {
      transform: translateY(0);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;
  
  const StepCounter = styled.div`
    color: white;
    font-size: 14px;
    font-weight: bold;
    margin: 0 4px;
  `;

  return (
    <Container>
      {showControls && animationSteps.length > 0 && (
        <ControlPanel>
          <ControlButton 
            onClick={goToPreviousStep}
            disabled={currentStep <= 0}
            title="Previous Step"
          >
            <FaStepBackward />
          </ControlButton>
          
          {isRunning && !isPaused ? (
            <ControlButton onClick={pauseAnimation} title="Pause">
              <FaPause />
            </ControlButton>
          ) : (
            <ControlButton onClick={playAnimation} title="Play">
              <FaPlay />
            </ControlButton>
          )}
          
          <ControlButton 
            onClick={goToNextStep}
            disabled={currentStep >= animationSteps.length - 1}
            title="Next Step"
          >
            <FaStepForward />
          </ControlButton>
          
          <StepCounter>
            {currentStep + 1} / {animationSteps.length}
          </StepCounter>
        </ControlPanel>
      )}
      
      <Svg viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="startGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="endGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
          <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
          <linearGradient id="visitingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <linearGradient id="visitedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6B7280" />
            <stop offset="100%" stopColor="#4B5563" />
          </linearGradient>
          <linearGradient id="unvisitedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1F2937" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>
          <linearGradient id="frontierGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14B8A6" />
            <stop offset="100%" stopColor="#0D9488" />
          </linearGradient>
          <linearGradient id="frontierBestGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EC4899" />
            <stop offset="100%" stopColor="#DB2777" />
          </linearGradient>
          
          {/* Glowing effect filter for best frontier node */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          {/* Pulsing animation */}
          <radialGradient id="pulseGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="rgba(245, 158, 11, 0.8)" />
            <stop offset="100%" stopColor="rgba(245, 158, 11, 0)" />
            <animate attributeName="r" values="0%;50%;0%" dur="2s" repeatCount="indefinite" />
          </radialGradient>
        </defs>  
        
        {/* Render lines with labels */}
        {lines.map((line, index) => {
          // Calculate the actual distance in kilometers (scaling the visual distance)
          const visualDistance = Math.sqrt(
            Math.pow(line.x2 - line.x1, 2) + 
            Math.pow(line.y2 - line.y1, 2)
          );
          // Scale the visual distance to get reasonable km values (adjust scale factor as needed)
          const scaleFactor = 20;
          const distanceKm = Math.round(visualDistance * scaleFactor);
          
          const midX = (line.x1 + line.x2) / 2;
          const midY = (line.y1 + line.y2) / 2;
          const angle = Math.atan2(line.y2 - line.y1, line.x2 - line.x1) * (180 / Math.PI);
          const isPath = isLineInPath(line);
          
          // Calculate flight time assuming average speed of 800 km/h
          const timeHours = (distanceKm / 800).toFixed(1);
          const labelText = `${distanceKm} km • ${timeHours}h`;
          
          // Adjust font size based on line length
          const fontSize = Math.min(3, Math.max(1, visualDistance * 0.3));
          
          return (
            <React.Fragment key={`line-${index}`}>
              <Line
                x1={`${line.x1}%`}
                y1={`${line.y1}%`}
                x2={`${line.x2}%`}
                y2={`${line.y2}%`}
                isPath={isPath}
              />
              <text
                x={`${midX}%`}
                y={`${midY}%`}
                style={{
                  fontSize: `${fontSize}px`,
                  fill: isPath ? '#fff' : '#ccc',
                  textAnchor: 'middle',
                  dominantBaseline: 'middle',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  fontWeight: 'bold',
                  fontFamily: 'Arial, sans-serif',
                  textShadow: '0 0 3px rgba(0,0,0,0.8)',
                  transform: `rotate(${angle}deg)`,
                  transformOrigin: `${midX}% ${midY}%`,
                  opacity: isPath ? 1 : 0.7,
                  paintOrder: 'stroke',
                  stroke: 'rgba(0,0,0,0.8)',
                  strokeWidth: '0.5px',
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round'
                }}
              >
                {labelText}
              </text>
            </React.Fragment>
          );
        })}
        
        {/* Render airport nodes */}
        {nodes.map(node => {
          const { type, color, bgColor, text, size, textSize, opacity = 1 } = getNodeState(node);
          const isStartOrEnd = type === 'start' || type === 'end';
          const isVisited = type === 'visited' || type === 'path' || isStartOrEnd;
          // Show heuristics for all nodes except start/end
          const showHeuristic = !isStartOrEnd;
          const heuristicValue = nodeHeuristics[node.id]?.formatted || '';
          const textYOffset = type === 'current' ? -2 : 0;
          
          return (
            <g key={node.id}>
              {/* Connection lines are rendered separately */}
              
              {/* Node outer circle */}
              <circle
                cx={`${node.x}%`}
                cy={`${node.y}%`}
                r={`${size}%`}
                fill={bgColor}
                stroke={color}
                strokeWidth="0.2"
                style={{
                  filter: `drop-shadow(0 0 4px ${color}${isStartOrEnd ? '80' : '40'})`,
                  transition: 'all 0.3s ease',
                  opacity: opacity
                }}
              />
              
              {/* Node inner circle */}
              <circle
                cx={`${node.x}%`}
                cy={`${node.y}%`}
                r={`${size * 0.6}%`}
                fill={color}
                style={{
                  filter: `drop-shadow(0 0 6px ${color}${isStartOrEnd ? 'FF' : '80'})`,
                  transition: 'all 0.3s ease',
                  opacity: opacity
                }}
              />
              
              {/* Airport code/text */}
              <text
                x={`${node.x}%`}
                y={`${parseFloat(node.y) + textYOffset}%`}
                textAnchor="middle"
                style={{
                  fontSize: textSize,
                  fill: color,
                  fontWeight: type === 'current' ? 'bold' : 'normal',
                  pointerEvents: 'none',
                  textShadow: '0 0 3px rgba(0,0,0,0.8)',
                  fontFamily: 'Arial, sans-serif',
                  opacity: opacity,
                  transition: 'all 0.3s ease',
                  userSelect: 'none',
                  letterSpacing: '0.5px'
                }}
              >
                {text}
              </text>
              
              {/* Heuristic value with h= label */}
              {showHeuristic && (
                <g>
                  {/* Background for better readability */}
                  <rect
                    x={`${parseFloat(node.x) - 2.5}%`}
                    y={`${parseFloat(node.y) + 1}%`}
                    width="5%"
                    height="1.8%"
                    rx="0.5%"
                    ry="0.5%"
                    fill="rgba(0,0,0,0.6)"
                    stroke={type === 'path' ? '#8B5CF6' : '#6B7280'}
                    strokeWidth="0.1%"
                  />
                  <text
                    x={`${node.x}%`}
                    y={`${parseFloat(node.y) + 2}%`}
                    textAnchor="middle"
                    style={{
                      fontSize: '1.1px',
                      fill: type === 'path' ? '#8B5CF6' : '#FFFFFF',
                      pointerEvents: 'none',
                      textShadow: '0 0 2px #000',
                      fontWeight: '700',
                      userSelect: 'none',
                      fontFamily: 'monospace',
                      opacity: 1,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    h={heuristicValue}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </Svg>
    </Container>
  );
};

export default React.memo(SimpleAStarVisualization);