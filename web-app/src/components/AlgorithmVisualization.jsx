import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlane } from 'react-icons/fa';

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

// Colors for different node states - matching existing dark UI
const colors = {
  start: '#10B981',    // Green (keep)
  end: '#EF4444',      // Red (keep)
  current: '#F59E0B',  // Amber (keep)
  visited: '#475569',  // Dark slate (much less blue)
  path: '#F59E0B',     // Amber instead of purple
  frontier: '#94a3b8', // Light slate
  default: '#64748b',  // Slate gray
  text: '#f8fafc',     // Light text
  background: '#0f172a',// Dark background
  distance: {          // Colors for distance labels
    default: '#1F2937',
    updating: '#F59E0B', // Amber instead of green
    text: '#FFFFFF',
    background: 'rgba(15, 23, 42, 0.9)'
  }
};

const edgeVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (custom) => ({
    pathLength: 1,
    opacity: 0.7,
    transition: {
      delay: custom * 0.2 + 0.3,  // Increased from 0.05 + 0.2
      duration: 0.8,              // Increased from 0.5
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

const AlgorithmVisualization = ({
  path = [],
  airports = [],
  routes = [],
  graph,
  startNode,
  endNode,
  onComplete,
  onProgress = () => {},
  style
}) => {
  const [visitedNodes, setVisitedNodes] = useState(new Set());
  const [visitedEdges, setVisitedEdges] = useState(new Set());
  const [currentNode, setCurrentNode] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [animationStep, setAnimationStep] = useState('exploring'); // 'exploring' or 'path'
  const [pathIndex, setPathIndex] = useState(0);
  const [localShortestPath, setLocalShortestPath] = useState([]); // Local state for shortest path
  const [nodeDistances, setNodeDistances] = useState({}); // Track current known distances to each node
  const [updatingNodes, setUpdatingNodes] = useState(new Set()); // Track nodes being updated
  const animationRef = useRef();
  // Track all timeouts so we can clear them on unmount
  const timeoutsRef = useRef(new Set());
  // Cancellation flag to prevent late callbacks
  const cancelledRef = useRef(false);
  
  // Create a map of node positions for quick lookup
  const nodePositions = useMemo(() => {
    const positions = {};
    airports.forEach(node => {
      positions[String(node.id)] = { x: node.x, y: node.y };
    });
    return positions;
  }, [airports]);
  
  // Generate the exploration order using BFS
  const explorationOrder = useMemo(() => {
    if (!graph || !startNode || !endNode) return [];
    
    const queue = [startNode];
    const visited = new Set([startNode]);
    const order = [];
    const parent = {};
    
    while (queue.length > 0) {
      const current = queue.shift();
      order.push(current);
      
      if (current === endNode) break;
      
      const edges = graph.getEdges(current) || [];
      for (const edge of edges) {
        if (!visited.has(edge.node)) {
          visited.add(edge.node);
          parent[edge.node] = current;
          queue.push(edge.node);
        }
      }
    }
    
    return order;
  }, [graph, startNode, endNode]);
  
  // Use the provided path prop instead of recalculating
  const shortestPath = useMemo(() => {
    if (!path || path.length === 0) return [];
    // Ensure path is an array of node IDs (strings)
    return path.map(node => String(node.id || node));
  }, [path]);

  // Animate Dijkstra's algorithm exploration
  useEffect(() => {
    cancelledRef.current = false;
    if (!startNode || !endNode || !graph) return;
    
    // Reset all states
    setVisitedNodes(new Set([startNode]));
    setVisitedEdges(new Set());
    setCurrentNode(startNode);
    setIsComplete(false);
    setAnimationStep('exploring');
    setPathIndex(0);
    setLocalShortestPath([]);
    
    // Priority queue for Dijkstra's algorithm (using distance as priority)
    const priorityQueue = [{ node: startNode, distance: 0 }];
    const distances = { [startNode]: 0 };
    const parentMap = {}; // To reconstruct the path
    const visited = new Set();
    let targetFound = false;
    const emitProgress = () => {
      try {
        onProgress({ openSet: priorityQueue.length, closedSet: visited.size });
      } catch (_) {}
    };
    
    // Initialize node distances for visualization
    setNodeDistances({ [startNode]: 0 });
    
    // Function to animate the final path
    const animateFinalPath = (path) => {
      if (!path || path.length === 0) {
        setIsComplete(true);
        onComplete?.();
        return;
      }
      
      setLocalShortestPath(path);
      setAnimationStep('path');
      
      // Animate the path step by step
      let currentIndex = 0;
      const animateStep = () => {
        if (cancelledRef.current) return;
        if (currentIndex >= path.length) {
          setIsComplete(true);
          onComplete?.();
          return;
        }
        
        setPathIndex(currentIndex + 1);
        currentIndex++;
        
        if (currentIndex < path.length) {
          animationRef.current = setTimeout(animateStep, 300); // Adjust speed as needed
          timeoutsRef.current.add(animationRef.current);
        } else {
          setIsComplete(true);
          onComplete?.();
        }
      };
      
      // Start the path animation after a short delay
      animationRef.current = setTimeout(animateStep, 500);
      timeoutsRef.current.add(animationRef.current);
    };
    
    // Function to finish the exploration and show the path
    const finishVisualization = () => {
      // Clear any pending timeouts
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
      // Also clear any queued timeouts
      for (const id of timeoutsRef.current) {
        clearTimeout(id);
      }
      timeoutsRef.current.clear();
      
      // Reconstruct path from end to start
      const path = [];
      let current = endNode;
      while (current) {
        path.unshift(current);
        current = parentMap[current];
      }
      
      // If we found a valid path, animate it
      if (path.length > 1) {
        animateFinalPath(path);
      } else {
        // No valid path found
        setIsComplete(true);
        onComplete?.();
      }
    };
    
    // Process one node at a time for visualization
    const processNextNode = () => {
      if (cancelledRef.current) return;
      // If we've already found the target, don't process more nodes
      if (targetFound || !startNode || !endNode) {
        finishVisualization();
        return;
      }
      
      // If queue is empty, we're done
      if (priorityQueue.length === 0) {
        emitProgress();
        finishVisualization();
        return;
      }
      
      // Get the node with minimum distance
      priorityQueue.sort((a, b) => a.distance - b.distance);
      const { node: currentNode, distance: currentDist } = priorityQueue.shift();
      
      // Skip if we already processed this node
      if (visited.has(currentNode)) {
        const t = setTimeout(processNextNode, 10);
        timeoutsRef.current.add(t);
        return;
      }
      
      // Highlight the current node being processed
      setCurrentNode(currentNode);
      
      // Update the current node's distance in the UI
      setNodeDistances(prev => ({
        ...prev,
        [currentNode]: currentDist
      }));
      
      // Mark as visited
      visited.add(currentNode);
      emitProgress();
      
      // Update visualization
      setVisitedNodes(prev => new Set([...prev, currentNode]));
      setCurrentNode(currentNode);
      
      // If we reached the end, mark as found and finish
      if (currentNode === endNode) {
        targetFound = true;
        finishVisualization();
        return;
      }
      
      // Process all edges from current node
      const edges = graph.getEdges(currentNode) || [];
      let processedEdges = 0;
      
      const processNextEdge = (index) => {
        if (cancelledRef.current) return;
        if (index >= edges.length) {
          // All edges processed, move to next node
          const t = setTimeout(processNextNode, 300);
          timeoutsRef.current.add(t);
          return;
        }
        
        const { node: neighbor, weight } = edges[index];
        const distanceToNeighbor = currentDist + weight;
        
        // Skip if already visited
        if (visited.has(neighbor)) {
          processNextEdge(index + 1);
          return;
        }
        
        // Show we're checking this edge
        setVisitedEdges(prev => new Set([...prev, `${currentNode}-${neighbor}`]));
        
        // Check if we found a shorter path to neighbor
        const oldDistance = distances[neighbor] ?? Infinity;
        if (distanceToNeighbor < oldDistance) {
          // Update distance and parent
          distances[neighbor] = distanceToNeighbor;
          parentMap[neighbor] = currentNode;
          
          // Add to priority queue if not already there
          if (!priorityQueue.some(item => item.node === neighbor)) {
            priorityQueue.push({ node: neighbor, distance: distanceToNeighbor });
            emitProgress();
          }
          
          // Visualize the distance update with a highlight effect
          setUpdatingNodes(prev => new Set([...prev, neighbor]));
          setNodeDistances(prev => ({
            ...prev,
            [neighbor]: distanceToNeighbor
          }));
          
          // Remove highlight after animation
          const t = setTimeout(() => {
            if (cancelledRef.current) return;
            setUpdatingNodes(prev => {
              const newSet = new Set(prev);
              newSet.delete(neighbor);
              return newSet;
            });
            processNextEdge(index + 1);
          }, 500);
          timeoutsRef.current.add(t);
        } else {
          // No update, just continue
          processNextEdge(index + 1);
        }
      };
      
      // Start processing edges for this node
      processNextEdge(0);
      if (edges.length === 0) {
        const t = setTimeout(() => { if (cancelledRef.current) return; emitProgress(); processNextNode(); }, 300);
        timeoutsRef.current.add(t);
      }
    };
    
    // Start the algorithm with a small delay for better visualization
    const startTimer = setTimeout(() => {
      if (cancelledRef.current) return;
      processNextNode();
    }, 500);
    timeoutsRef.current.add(startTimer);
    
    // Cleanup function
    return () => {
      cancelledRef.current = true;
      clearTimeout(startTimer);
      if (animationRef.current) {
        if (typeof animationRef.current === 'number') {
          cancelAnimationFrame(animationRef.current);
        } else {
          clearTimeout(animationRef.current);
        }
      }
      for (const id of timeoutsRef.current) {
        clearTimeout(id);
      }
      timeoutsRef.current.clear();
    };
  }, [startNode]);

  // Check if an edge is part of the final path
  const isEdgeInPath = useCallback((sourceId, targetId) => {
    if (!shortestPath) return false;
    const sourceIndex = shortestPath.indexOf(sourceId);
    const targetIndex = shortestPath.indexOf(targetId);
    return Math.abs(sourceIndex - targetIndex) === 1 && sourceIndex !== -1 && targetIndex !== -1;
  }, [shortestPath]);

  // Check if an edge should be highlighted as part of the current path animation
  const isEdgeInAnimatedPath = useCallback((sourceId, targetId) => {
    if (animationStep !== 'path' || !shortestPath) return false;
    
    const sourceIndex = shortestPath.indexOf(sourceId);
    const targetIndex = shortestPath.indexOf(targetId);
    
    return (
      sourceIndex !== -1 && 
      targetIndex !== -1 &&
      Math.abs(sourceIndex - targetIndex) === 1 &&
      sourceIndex < pathIndex &&
      targetIndex < pathIndex
    );
  }, [animationStep, shortestPath, pathIndex]);

  // Render an edge with improved visibility
  const renderEdge = (source, target, index) => {
    const isPathEdge = isEdgeInPath(source.id, target.id);
    const isAnimatedPath = isEdgeInAnimatedPath(source.id, target.id);
    const isVisited = visitedEdges.has(`${source.id}-${target.id}`) || 
                     visitedEdges.has(`${target.id}-${source.id}`);
    
    // Use consistent colors with main UI
    let strokeColor = 'rgba(203, 213, 225, 0.2)';
    let strokeWidth = 1;
    let opacity = 0.3;
    
    if (isAnimatedPath) {
      strokeColor = colors.path;
      strokeWidth = 4;
      opacity = 1;
    } else if (isPathEdge) {
      strokeColor = colors.path;
      strokeWidth = 3.5;
      opacity = 0.9;
    } else if (isVisited) {
      strokeColor = '#475569';
      strokeWidth = 1.5;
      opacity = 0.4;
    }
    
    return (
      <motion.g key={`edge-${source.id}-${target.id}-${index}`}>
        {/* Base edge */}
        <line
          x1={source.x}
          y1={source.y}
          x2={target.x}
          y2={target.y}
          stroke="rgba(203, 213, 225, 0.1)"
          strokeOpacity={0.2}
          strokeWidth={2}
        />
        
        {/* Animated edge */}
        <motion.line
          x1={source.x}
          y1={source.y}
          x2={target.x}
          y2={target.y}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeOpacity={opacity}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: 1, 
            opacity: opacity,
            transition: { duration: 0.5 }
          }}
        />
      </motion.g>
    );
  };

  // Render a node
  const renderNode = (airport) => {
    const nodeId = String(airport.id);
    const isStart = nodeId === String(startNode);
    const isEnd = nodeId === String(endNode);
    const isInPath = localShortestPath.includes(nodeId);
    const isVisited = visitedNodes.has(nodeId);
    const isCurrent = nodeId === currentNode;
    const isUpdating = updatingNodes.has(nodeId);
    const isFrontier = !isVisited && !isCurrent && graph.getEdges(nodeId)?.some(edge => 
      visitedNodes.has(edge.node) || edge.node === currentNode
    );
    
    // Calculate visit order based on when the node was visited
    const visitOrder = isVisited ? Array.from(visitedNodes).indexOf(nodeId) : 0;
    
    // Get current distance for this node
    const distance = nodeDistances[nodeId] !== undefined ? 
      Math.round(nodeDistances[nodeId] * 10) / 10 : '∞';
    
    // Calculate node appearance based on state
    let fill, stroke, strokeWidth, size, labelColor;
    
    if (isStart) {
      fill = colors.start;
      stroke = '#fff';
      strokeWidth = 3;
      size = 16;  // Slightly larger for start/end nodes
      labelColor = '#fff';
    } else if (isEnd) {
      fill = colors.end;
      stroke = '#fff';
      strokeWidth = 3;
      size = 16;  // Slightly larger for start/end nodes
      labelColor = '#fff';
    } else if (isCurrent) {
      fill = colors.current;
      stroke = '#fff';
      strokeWidth = 3;
      size = 18;  // Largest for current node
      labelColor = '#7c2d12';
    } else if (isInPath) {
      fill = colors.path;
      stroke = '#fff';
      strokeWidth = 2.5;
      size = 14;  // Slightly larger for path nodes
      labelColor = '#fff';
    } else if (isFrontier) {
      fill = colors.frontier;
      stroke = '#fff';
      strokeWidth = 2;
      size = 14;  // Slightly larger for frontier nodes
      labelColor = '#7c2d12';
    }
    
    return (
      <g key={`node-${nodeId}`}>
        {/* Node circle */}
        <motion.circle
          cx={airport.x}
          cy={airport.y}
          r={size}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          initial="hidden"
          animate="visible"
          variants={nodeVariants}
          custom={visitOrder}
        />
        
        {/* Current node animation */}
        {isCurrent && (
          <motion.g>
            <motion.circle
              cx={airport.x}
              cy={airport.y}
              r={size * 2}
              fill="rgba(245, 158, 11, 0.2)"
              initial={{ scale: 0.5, opacity: 0.8 }}
              animate={{
                scale: 2.5,
                opacity: 0,
                transition: {
                  duration: 1.5,
                  repeat: Infinity,
                  repeatType: 'loop',
                  ease: 'easeOut'
                }
              }}
            />
            <motion.circle
              cx={airport.x}
              cy={airport.y}
              r={size * 1.5}
              fill="none"
              stroke={colors.current}
              strokeWidth={3}
              strokeDasharray="4 2"
              initial={{ scale: 1, opacity: 0.7, rotate: 0 }}
              animate={{
                scale: 1.8,
                opacity: 0,
                rotate: 360,
                transition: {
                  duration: 2,
                  repeat: Infinity,
                  repeatType: 'loop',
                  ease: 'linear'
                }
              }}
            />
          </motion.g>
        )}
        
        {/* Visited node pulse effect */}
        {isVisited && !isCurrent && (
          <motion.circle
            cx={airport.x}
            cy={airport.y}
            r={size * 1.2}
            fill="rgba(100, 116, 139, 0.2)"
            initial={{ scale: 0.8, opacity: 0.4 }}
            animate={{
              scale: 1.5,
              opacity: 0,
              transition: {
                duration: 1,
                ease: 'easeOut'
              }
            }}
          />
        )}
        
        {/* Node label */}
        <motion.g
          initial={{ opacity: 0, y: -10 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            transition: { delay: visitOrder * 0.05 + 0.3 }
          }}
        >
          {/* Node name */}
          {(isStart || isEnd || isInPath || isCurrent || isFrontier) && (
            <motion.text
              x={airport.x}
              y={airport.y - size - 8}
              textAnchor="middle"
              fill={labelColor}
              fontSize="10px"
              fontWeight="700"
              style={{
                textShadow: '0 0 4px rgba(255,255,255,0.8)',
                pointerEvents: 'none'
              }}
            >
              {isStart ? 'Start' : isEnd ? 'End' : airport.iata || airport.id}
            </motion.text>
          )}
          
          {/* Distance label with background - only show for start, end, current, and updating nodes */}
          {(isStart || isEnd || isCurrent || isUpdating) && (
            <motion.g
              initial={{ opacity: 0, y: 5 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { delay: 0.2 }
              }}
            >
              {/* Background rectangle */}
              <rect
                x={airport.x - 15}
                y={airport.y + size + 2}
                width={30}
                height={16}
                rx={8}
                ry={8}
                fill={isUpdating ? colors.distance.updating : 'rgba(15, 23, 42, 0.9)'}
                stroke={isStart || isEnd ? '#fff' : 'rgba(255, 255, 255, 0.2)'}
                strokeWidth={isStart || isEnd ? 1 : 0.5}
                style={{
                  filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))'
                }}
              />
              {/* Distance text */}
              <motion.text
                x={airport.x}
                y={airport.y + size + 13}
                textAnchor="middle"
                fill={colors.distance.text}
                fontSize="10px"
                fontWeight="700"
                style={{
                  pointerEvents: 'none',
                  userSelect: 'none',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                }}
                animate={isUpdating ? {
                  scale: [1, 1.2, 1],
                  transition: { 
                    duration: 0.3,
                    scale: { duration: 0.5 }
                  }
                } : {}}
              >
                {distance}
              </motion.text>
            </motion.g>
          )}
        </motion.g>
      </g>
    );
  };

  // Render the shortest path
  const renderPath = () => {
    if (shortestPath.length === 0) return null;
    
    const pathElements = [];
    const activeSegment = Math.min(pathIndex - 1, shortestPath.length - 2);
    
    // Render all path segments up to the current index
    for (let i = 0; i <= activeSegment; i++) {
      const sourceId = shortestPath[i];
      const targetId = shortestPath[i + 1];
      
      const source = airports.find(a => String(a.id) === sourceId);
      const target = airports.find(a => String(a.id) === targetId);
      
      if (!source || !target) continue;
      
      // Calculate control points for a slight curve
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const angle = Math.atan2(dy, dx);
      const distance = Math.sqrt(dx * dx + dy * dy);
      const offset = Math.min(20, distance * 0.2);
      
      // Create a curved path
      const pathData = `M ${source.x} ${source.y} 
                       Q ${source.x + Math.cos(angle) * distance/2 + Math.sin(angle) * offset} 
                         ${source.y + Math.sin(angle) * distance/2 - Math.cos(angle) * offset},
                         ${target.x} ${target.y}`;
      
      pathElements.push(
        <motion.path
          key={`path-${i}`}
          d={pathData}
          fill="none"
          stroke="#8B5CF6"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: 1,
            opacity: 1,
            transition: {
              pathLength: { duration: 0.8, ease: 'easeInOut' },
              opacity: { duration: 0.3 }
            }
          }}
        />
      );
      
      // Add a plane icon that moves along the path
      if (i === activeSegment) {
        const segmentProgress = Math.min(1, pathIndex - activeSegment - 1);
        const x = source.x + (target.x - source.x) * segmentProgress;
        const y = source.y + (target.y - source.y) * segmentProgress;
        const rotation = (angle * 180) / Math.PI;
        
        pathElements.push(
          <motion.g
            key="plane"
            initial={false}
            animate={{
              x,
              y,
              opacity: 1,
              transition: {
                x: { duration: 0.5, ease: 'linear' },
                y: { duration: 0.5, ease: 'linear' }
              }
            }}
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center',
            }}
          >
            <FaPlane 
              size={16} 
              color="#8B5CF6"
              style={{
                transform: 'translate(-8px, -8px) rotate(90deg)'
              }}
            />
          </motion.g>
        );
      }
    }
    
    return pathElements;
  };
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
        {/* Filter for distance label glow */}
        <defs>
          <filter id="distance-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(203, 213, 225, 0.05)" strokeWidth="1"/>
          </pattern>
          
          {/* Wave gradient for exploration effect */}
          <radialGradient id="waveGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
            <stop offset="70%" stopColor="#d97706" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#92400e" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Wave effect container */}
        {currentNode && nodePositions[currentNode] && (
          <motion.circle
            cx={nodePositions[currentNode].x}
            cy={nodePositions[currentNode].y}
            r={100}
            fill="url(#waveGradient)"
            initial={{ r: 0, opacity: 0 }}
            animate={{
              r: 300,
              opacity: [0.5, 0.3, 0],
              transition: {
                duration: 1.5,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'easeOut'
              }
            }}
          />
        )}
        
        {/* Render all edges */}
        <g opacity={animationStep === 'path' ? 0.5 : 1}>
          {routes.map((route, index) => {
            const source = airports.find(a => String(a.id) === String(route.source));
            const target = airports.find(a => String(a.id) === String(route.target));
            
            if (source && target) {
              return renderEdge(source, target, index);
            }
            return null;
          })}
        </g>
        
        {/* Render the shortest path */}
        <g>
          {renderPath()}
        </g>
        
        {/* Render all nodes */}
        <AnimatePresence>
          {airports.map(airport => renderNode(airport))}
        </AnimatePresence>
        
        {/* Status indicator removed as per user request */}
        {/* 
        <foreignObject x="10" y="10" width="200" height="60" style={{ overflow: 'visible' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '8px 12px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            fontSize: '14px',
            color: '#1f2937',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: animationStep === 'exploring' ? '#f59e0b' : '#4f46e5',
                flexShrink: 0
              }} />
              {animationStep === 'exploring' ? 'Exploring...' : 'Found Path!'}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {animationStep === 'exploring' 
                ? `Visited ${visitedNodes.size} of ${airports.length} nodes`
                : `Path length: ${(shortestPath.length - 1)} steps`}
            </div>
          </div>
        </foreignObject>
        */}
      </svg>
    </div>
  );
};

export default AlgorithmVisualization;
