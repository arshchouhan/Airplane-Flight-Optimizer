import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaStar } from 'react-icons/fa';

// Animation variants for A* nodes and edges
const nodeVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: (custom) => ({
    scale: [0, 1.4, 1.1, 1],
    opacity: [0, 0.8, 1, 1],
    transition: {
      delay: custom * 0.1,
      duration: 0.8,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }),
  current: {
    scale: [1, 1.6, 1.2],
    opacity: [1, 0.9, 1],
    boxShadow: [
      '0 0 0px 0px rgba(255, 215, 0, 0)',
      '0 0 20px 8px rgba(255, 215, 0, 0.8)',
      '0 0 15px 5px rgba(255, 215, 0, 0.6)'
    ],
    transition: {
      duration: 0.6,
      ease: 'easeInOut',
      repeat: Infinity,
      repeatType: 'reverse'
    }
  },
  visited: {
    scale: [1, 1.2, 1],
    opacity: [0.7, 1, 0.8],
    transition: {
      duration: 0.4,
      ease: 'easeOut'
    }
  },
  frontier: {
    scale: [1, 1.3, 1.1],
    opacity: [0.6, 1, 0.9],
    boxShadow: [
      '0 0 5px 2px rgba(255, 215, 0, 0.4)',
      '0 0 12px 4px rgba(255, 215, 0, 0.7)',
      '0 0 8px 3px rgba(255, 215, 0, 0.5)'
    ],
    transition: {
      duration: 0.5,
      ease: 'easeInOut'
    }
  }
};

// A* specific colors
const astarColors = {
  start: '#10B981',      // Green
  end: '#EF4444',        // Red
  current: '#FFD700',    // Gold
  visited: '#FF8C00',    // Dark orange
  path: '#8B5CF6',       // Purple
  frontier: '#FFD700',   // Gold
  heuristic: '#FF6B6B',  // Light red for heuristic
  default: '#9CA3AF',    // Gray
  text: '#1F2937',       // Dark gray
  background: '#F9FAFB', // Light gray
  distance: {
    default: '#1F2937',
    updating: '#FFD700',
    text: '#000000',
    background: 'rgba(255, 215, 0, 0.8)'
  }
};

const edgeVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (custom) => ({
    pathLength: 1,
    opacity: 0.6,
    transition: {
      delay: custom * 0.15 + 0.2, // Faster animation
      duration: 0.6,
      ease: 'easeInOut'
    }
  })
};

// Calculate Euclidean distance heuristic
function calculateHeuristic(airport1, airport2, airports) {
  const a1 = airports.find(a => String(a.id) === String(airport1) || a.iata === String(airport1));
  const a2 = airports.find(a => String(a.id) === String(airport2) || a.iata === String(airport2));
  
  if (!a1 || !a2) {
    return 0;
  }
  
  const dx = (a1.x || 0) - (a2.x || 0);
  const dy = (a1.y || 0) - (a2.y || 0);
  return Math.sqrt(dx * dx + dy * dy);
}

const AStarVisualization = ({ 
  path = [], 
  airports = [], 
  routes = [], 
  graph, 
  startNode, 
  endNode, 
  onComplete = () => {} 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [visitedNodes, setVisitedNodes] = useState(new Set());
  const [currentNode, setCurrentNode] = useState(null);
  const [distances, setDistances] = useState(new Map());
  const [heuristics, setHeuristics] = useState(new Map());
  const [fScores, setFScores] = useState(new Map());
  const [isComplete, setIsComplete] = useState(false);
  const [frontierNodes, setFrontierNodes] = useState(new Set());
  const animationRef = useRef(null);

  // Simulate A* algorithm step by step
  const simulateAStar = useCallback(() => {
    if (!graph || !startNode || !endNode || !airports.length) {
      console.log('Missing required data for A* simulation');
      return;
    }

    console.log('Starting A* simulation...');
    
    const visited = new Set();
    const dist = new Map();
    const heur = new Map();
    const fScore = new Map();
    const frontier = new Set();
    const steps = [];
    
    // Initialize
    graph.getNodes().forEach(node => {
      const g = node === startNode ? 0 : Infinity;
      const h = calculateHeuristic(node, endNode, airports);
      const f = node === startNode ? g + h : Infinity;
      
      dist.set(node, g);
      heur.set(node, h);
      fScore.set(node, f);
    });
    
    // Add initial step
    steps.push({
      step: 0,
      currentNode: startNode,
      visited: new Set(),
      distances: new Map(dist),
      heuristics: new Map(heur),
      fScores: new Map(fScore),
      frontier: new Set([startNode])
    });
    
    frontier.add(startNode);
    let current = startNode;
    let stepCount = 1;
    const maxSteps = 15; // Reduced for better visualization
    
    while (frontier.size > 0 && stepCount < maxSteps && current !== endNode) {
      // Find node with lowest f-score in frontier
      let lowestF = Infinity;
      let nextNode = null;
      
      for (const node of frontier) {
        if (fScore.get(node) < lowestF) {
          lowestF = fScore.get(node);
          nextNode = node;
        }
      }
      
      if (!nextNode) break;
      
      current = nextNode;
      frontier.delete(current);
      visited.add(current);
      
      // Early termination for A*
      if (current === endNode) {
        console.log(`A* reached goal in ${stepCount} steps`);
        steps.push({
          step: stepCount,
          currentNode: current,
          visited: new Set(visited),
          distances: new Map(dist),
          heuristics: new Map(heur),
          fScores: new Map(fScore),
          frontier: new Set(frontier)
        });
        break;
      }
      
      // Create updated maps for this step
      const updatedFScores = new Map();
      for (const [node, g] of dist.entries()) {
        const h = heur.get(node);
        updatedFScores.set(node, g === Infinity ? Infinity : g + h);
      }
      
      steps.push({
        step: stepCount,
        currentNode: current,
        visited: new Set(visited),
        distances: new Map(dist),
        heuristics: new Map(heur),
        fScores: updatedFScores,
        frontier: new Set(frontier)
      });
      
      // Explore neighbors (limited for A*)
      const neighbors = graph.getEdges(current);
      let exploredCount = 0;
      
      for (const neighbor of neighbors) {
        if (exploredCount >= 3) break; // Limit exploration
        if (visited.has(neighbor.node)) continue;
        
        const tentativeG = dist.get(current) + neighbor.weight;
        
        if (tentativeG < dist.get(neighbor.node)) {
          dist.set(neighbor.node, tentativeG);
          const h = heur.get(neighbor.node); // h is already calculated in initialization
          fScore.set(neighbor.node, tentativeG + h);
          frontier.add(neighbor.node);
          exploredCount++;
        }
      }
      
      stepCount++;
    }
    
    console.log(`A* simulation complete: ${steps.length} steps`);
    return steps;
  }, [graph, startNode, endNode, airports]);

  const simulationSteps = useMemo(() => {
    if (!graph || !startNode || !endNode || !airports.length) {
      return [];
    }
    return simulateAStar();
  }, [simulateAStar]);

  useEffect(() => {
    if (!simulationSteps || simulationSteps.length === 0) {
      console.log('No simulation steps available');
      return;
    }

    let stepIndex = 0;
    
    const animate = () => {
      if (stepIndex < simulationSteps.length) {
        const step = simulationSteps[stepIndex];
        
        setCurrentStep(stepIndex);
        setCurrentNode(step.currentNode);
        setVisitedNodes(step.visited);
        setDistances(step.distances);
        setHeuristics(step.heuristics);
        setFScores(step.fScores);
        setFrontierNodes(step.frontier);
        
        stepIndex++;
        animationRef.current = setTimeout(animate, 1200); // Slower for better visibility
      } else {
        setIsComplete(true);
        onComplete();
      }
    };

    animationRef.current = setTimeout(animate, 500);

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [simulationSteps, onComplete]);

  // Get node color based on A* state
  const getNodeColor = useCallback((nodeId) => {
    if (nodeId === startNode) return astarColors.start;
    if (nodeId === endNode) return astarColors.end;
    if (nodeId === currentNode) return astarColors.current;
    if (visitedNodes.has(nodeId)) return astarColors.visited;
    if (frontierNodes.has(nodeId)) return astarColors.frontier;
    return astarColors.default;
  }, [startNode, endNode, currentNode, visitedNodes, frontierNodes]);

  // Get node position
  const getNodePosition = useCallback((nodeId) => {
    const airport = airports.find(a => String(a.id) === nodeId || a.iata === nodeId);
    if (!airport) {
      return { x: 0, y: 0 };
    }
    return {
      x: airport.x || 0,
      y: airport.y || 0
    };
  }, [airports]);

  if (!airports.length || !graph) {
    return null;
  }

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 10
    }}>
      <svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {/* A* Nodes */}
        <AnimatePresence>
          {airports.map((airport) => {
            const nodeId = String(airport.id);
            const position = getNodePosition(nodeId);
            const isVisible = visitedNodes.has(nodeId) || frontierNodes.has(nodeId) || 
                             nodeId === startNode || nodeId === endNode;
            
            if (!isVisible || !position) return null;

            const radius = nodeId === startNode || nodeId === endNode ? 12 : 8;
            const gScore = distances.get(nodeId) || 0;
            const hScore = heuristics.get(nodeId) || 0;
            const fScore = fScores.get(nodeId) || 0;

            // Determine animation state
            const getAnimationState = () => {
              if (nodeId === currentNode) return 'current';
              if (visitedNodes.has(nodeId)) return 'visited';
              if (frontierNodes.has(nodeId)) return 'frontier';
              return 'visible';
            };

            return (
              <g key={`astar-node-${nodeId}`}>
                
                {/* Main node circle */}
                <motion.circle
                  cx={position.x}
                  cy={position.y}
                  r={radius}
                  fill={getNodeColor(nodeId)}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  variants={nodeVariants}
                  initial="hidden"
                  animate={getAnimationState()}
                  key={`${nodeId}-${currentStep}`}
                />
                
                {/* A* specific labels: g, h, f scores */}
                {(visitedNodes.has(nodeId) || frontierNodes.has(nodeId)) && (
                  <g>
                    {/* G score background and text (top) */}
                    <motion.rect
                      x={position.x - 15}
                      y={position.y - 30}
                      width={30}
                      height={14}
                      rx={7}
                      fill="rgba(0, 0, 0, 0.8)"
                      stroke="#FFFFFF"
                      strokeWidth="1"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3, duration: 0.3 }}
                    />
                    <motion.text
                      x={position.x}
                      y={position.y - 20}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#FFFFFF"
                      fontWeight="bold"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      g:{Math.round(gScore)}
                    </motion.text>
                    
                    {/* H score background and text (right) */}
                    <motion.rect
                      x={position.x + 15}
                      y={position.y - 7}
                      width={30}
                      height={14}
                      rx={7}
                      fill="rgba(255, 107, 107, 0.9)"
                      stroke="#FFFFFF"
                      strokeWidth="1"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4, duration: 0.3 }}
                    />
                    <motion.text
                      x={position.x + 30}
                      y={position.y + 3}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#FFFFFF"
                      fontWeight="bold"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      h:{Math.round(hScore)}
                    </motion.text>
                    
                    {/* F score background and text (bottom) */}
                    <motion.rect
                      x={position.x - 15}
                      y={position.y + 20}
                      width={30}
                      height={14}
                      rx={7}
                      fill="rgba(0, 0, 0, 0.8)"
                      stroke="#FFFFFF"
                      strokeWidth="1"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5, duration: 0.3 }}
                    />
                    <motion.text
                      x={position.x}
                      y={position.y + 30}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#FFFFFF"
                      fontWeight="bold"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      f:{Math.round(fScore)}
                    </motion.text>
                  </g>
                )}
                
                
              </g>
            );
          })}
        </AnimatePresence>
      </svg>

      {/* A* Status */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        backgroundColor: 'rgba(255, 215, 0, 0.9)',
        padding: '15px',
        borderRadius: '8px',
        color: '#000',
        fontWeight: 'bold',
        fontSize: '14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}>
        <div>A* Algorithm</div>
        <div>Step: {currentStep + 1}</div>
        <div>Visited: {visitedNodes.size}</div>
        <div>Frontier: {frontierNodes.size}</div>
        {isComplete && <div style={{ color: '#10B981' }}>✓ Complete</div>}
      </div>
    </div>
  );
};

export default AStarVisualization;
