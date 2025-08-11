import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlane } from 'react-icons/fa';
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
  stroke-width: ${props => props.isPath ? 0.6 : 0.3};
  stroke-linecap: round;
  opacity: ${props => props.isPath ? 0.7 : 0.15};
  pointer-events: none;
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
  // State
  const [nodes, setNodes] = useState([]);
  const [lines, setLines] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentNode, setCurrentNode] = useState(null);
  const [visitedNodes, setVisitedNodes] = useState(new Set());
  const [path, setPath] = useState([]);
  const [animationSteps, setAnimationSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);

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
    
    // Initialize nodes
    nodes.forEach(node => {
      nodeMap[node.id] = { ...node };
      if (node.id === 'start') {
        openSet.push(node.id);
      }
    });
    
    const endNode = nodeMap['end'];
    
    if (!endNode) {
      console.error('End node not found');
      return [];
    }
    
    // Main A* loop
    while (openSet.length > 0) {
      // Find node with lowest fScore in openSet
      openSet.sort((a, b) => nodeMap[a].fScore - nodeMap[b].fScore);
      const currentId = openSet.shift();
      const current = nodeMap[currentId];
      
      // Add to visited set
      closedSet.add(currentId);
      
      // Record visit step
      if (currentId !== 'start') {
        steps.push({
          type: 'visit',
          nodeId: currentId,
          fScore: current.fScore,
          gScore: current.gScore
        });
      }
      
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
      
      // Process each neighbor
      for (const neighbor of neighbors) {
        const neighborNode = nodeMap[neighbor.id];
        if (!neighborNode) continue;
        
        const tentativeGScore = current.gScore + neighbor.distance;
        
        if (!openSet.includes(neighbor.id)) {
          openSet.push(neighbor.id);
        } else if (tentativeGScore >= neighborNode.gScore) {
          continue; // This is not a better path
        }
        
        // This path is the best so far, record it
        neighborNode.cameFrom = currentId;
        neighborNode.gScore = tentativeGScore;
        neighborNode.fScore = tentativeGScore + heuristic(neighborNode, endNode);
      }
    }
    
    return steps;
  }, [heuristic]);
  
  // Process animation steps one by one
  const processAnimationStep = useCallback((steps, index) => {
    if (index >= steps.length) {
      setIsRunning(false);
      onComplete();
      return;
    }
    
    const step = steps[index];
    setCurrentStep(index);
    
    switch (step.type) {
      case 'visit':
        setVisitedNodes(prev => {
          const newVisited = new Set(prev);
          newVisited.add(step.nodeId);
          return newVisited;
        });
        setCurrentNode(step.nodeId);
        break;
        
      case 'path':
        setPath(prev => [...prev, step.from, step.to]);
        break;
        
      case 'complete':
        setPath(step.path);
        setCurrentNode(null);
        break;
    }
    
    // Schedule next step with appropriate delay
    let delay = speed;
    if (step.type === 'visit') delay = speed * 1.5;
    else if (step.type === 'path') delay = speed * 2;
    else if (step.type === 'complete') delay = speed * 3;
    
    const timer = setTimeout(() => {
      processAnimationStep(steps, index + 1);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [speed, onComplete]);
  
  // Animate the A* algorithm steps
  const animateSteps = useCallback((steps) => {
    if (!steps.length) return;
    
    setIsRunning(true);
    setVisitedNodes(new Set());
    setPath([]);
    setCurrentNode(null);
    
    // Start processing steps
    processAnimationStep(steps, 0);
  }, [processAnimationStep]);
  
  // Initialize nodes and lines and run A* algorithm
  useEffect(() => {
    if (!startPoint || !endPoint) return;
    
    const newNodes = generateNodes();
    const newLines = generateLines(newNodes);
    setNodes(newNodes);
    setLines(newLines);
    
    // Run A* algorithm and start animation
    const timer = setTimeout(() => {
      const steps = runAStar(newNodes, newLines);
      if (steps.length > 0) {
        setAnimationSteps(steps);
        setCurrentStep(0);
        
        // Start animation
        const interval = setInterval(() => {
          setCurrentStep(prev => {
            if (prev >= steps.length - 1) {
              clearInterval(interval);
              setIsRunning(false);
              return prev;
            }
            return prev + 1;
          });
        }, speed);
        
        return () => clearInterval(interval);
      } else {
        console.error('No steps generated by A* algorithm');
      }
    }, 500); // Short delay to ensure nodes are rendered
    
    return () => clearTimeout(timer);
  }, [startPoint, endPoint, generateNodes, generateLines, runAStar, speed]);
  
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
  
  // Start animation when steps are ready
  useEffect(() => {
    if (animationSteps.length > 0 && !isRunning) {
      animateSteps(animationSteps);
    }
    
    // Clean up on unmount
    return () => {
      setIsRunning(false);
    };
  }, [animationSteps, animateSteps, isRunning]);

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
      bgColor: 'rgba(245, 158, 11, 0.3)',
      text: node.name || node.id.toUpperCase(),
      size: 1.7,
      textSize: '1.3px'
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

  return (
    <Container>
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
          
          {/* Glow effects */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        {/* Render lines */}
        {lines.map((line, index) => (
          <Line
            key={`line-${index}`}
            x1={`${line.x1}%`}
            y1={`${line.y1}%`}
            x2={`${line.x2}%`}
            y2={`${line.y2}%`}
            isPath={isLineInPath(line)}
          />
        ))}
        
        {/* Render airport nodes */}
        {nodes.map(node => {
          const { type, color, bgColor, text, size, textSize, opacity = 1 } = getNodeState(node);
          const isStartOrEnd = type === 'start' || type === 'end';
          const isVisited = type === 'visited' || type === 'path' || isStartOrEnd;
          const showHeuristic = isVisited && !isStartOrEnd;
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
              
              {/* Heuristic value */}
              {showHeuristic && (
                <text
                  x={`${node.x}%`}
                  y={`${parseFloat(node.y) + 1.8}%`}
                  textAnchor="middle"
                  style={{
                    fontSize: '1.1px',
                    fill: type === 'path' ? '#8B5CF6' : '#A5B4FC',
                    pointerEvents: 'none',
                    textShadow: '0 0 2px #000',
                    fontWeight: '500',
                    userSelect: 'none',
                    fontFamily: 'monospace',
                    opacity: opacity * 0.9,
                    transition: 'all 0.3s ease'
                  }}
                >
                  {heuristicValue}
                </text>
              )}
            </g>
          );
        })}
      </Svg>
    </Container>
  );
};

export default React.memo(SimpleAStarVisualization);