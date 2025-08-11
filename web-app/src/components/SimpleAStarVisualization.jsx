import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';

// Colors for visualization
const COLORS = {
  start: '#10B981',    // Green
  end: '#EF4444',      // Red
  unvisited: 'rgba(59, 130, 246, 0.8)',
  visited: 'rgba(245, 158, 11, 0.8)',
  visiting: '#8B5CF6',  // Purple
  path: '#10B981',     // Green
  line: 'rgba(99, 102, 241, 0.4)',
  text: '#1F2937',
  background: '#F9FAFB',
};

// Animation keyframes
const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
`;

// Styled components
const Container = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  background: ${COLORS.background};
  border-radius: 8px;
  overflow: hidden;
`;

const Svg = styled.svg`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
`;

const Node = styled.circle`
  cursor: pointer;
  transition: all 0.3s ease;
  stroke: white;
  stroke-width: 2;
  
  &.start {
    fill: ${COLORS.start};
    animation: ${pulse} 1.5s infinite;
  }
  
  &.end {
    fill: ${COLORS.end};
    animation: ${pulse} 1.5s infinite 0.5s;
  }
  
  &.unvisited {
    fill: ${COLORS.unvisited};
  }
  
  &.visited {
    fill: ${COLORS.visited};
  }
  
  &.visiting {
    fill: ${COLORS.visiting};
    filter: drop-shadow(0 0 4px ${COLORS.visiting});
  }
  
  &.path {
    fill: ${COLORS.path};
    animation: ${pulse} 1s infinite;
  }
`;

const Line = styled.line`
  stroke: ${props => props.isPath ? COLORS.path : COLORS.line};
  stroke-width: ${props => props.isPath ? 2 : 1};
  stroke-linecap: round;
  transition: all 0.3s ease;
  opacity: ${props => props.isPath ? 1 : 0.7};
`;

const NodeLabel = styled.text`
  font-size: 10px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: middle;
  pointer-events: none;
  fill: white;
  user-select: none;
`;

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

  // Generate random nodes
  const generateNodes = useCallback(() => {
    if (!dimensions.width || !dimensions.height) return [];

    const newNodes = [];
    const padding = 5;
    const minDistance = 10;
    
    // Add start and end points
    if (startPoint && endPoint) {
      newNodes.push({
        id: 'start',
        x: startPoint.x,
        y: startPoint.y,
        type: 'start',
        gScore: 0,
        fScore: 0,
        cameFrom: null,
      });

      newNodes.push({
        id: 'end',
        x: endPoint.x,
        y: endPoint.y,
        type: 'end',
        gScore: Infinity,
        fScore: Infinity,
        cameFrom: null,
      });
    }

    // Generate random nodes
    for (let i = 0; i < nodeCount; i++) {
      let x, y, isValid;
      let attempts = 0;
      const maxAttempts = 100;
      
      // Ensure nodes are not too close to each other
      do {
        isValid = true;
        x = padding + Math.random() * (100 - 2 * padding);
        y = padding + Math.random() * (100 - 2 * padding);
        
        for (const node of newNodes) {
          const distance = Math.sqrt(
            Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2)
          );
          
          if (distance < minDistance) {
            isValid = false;
            break;
          }
        }
        
        attempts++;
      } while (!isValid && attempts < maxAttempts);
      
      if (isValid) {
        newNodes.push({
          id: `node-${i}`,
          x,
          y,
          type: 'unvisited',
          gScore: Infinity,
          fScore: Infinity,
          cameFrom: null,
        });
      }
    }
    
    return newNodes;
  }, [dimensions, nodeCount, startPoint, endPoint]);

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
  
  // Animate the A* algorithm steps
  const animateSteps = useCallback((steps) => {
    if (!steps.length) return;
    
    let stepIndex = 0;
    const visited = new Set();
    const pathLines = new Set();
    
    const processStep = () => {
      if (stepIndex >= steps.length) {
        setIsRunning(false);
        onComplete();
        return;
      }
      
      const step = steps[stepIndex];
      
      switch (step.type) {
        case 'visit':
          visited.add(step.nodeId);
          setVisitedNodes(new Set(visited));
          setCurrentNode(step.nodeId);
          break;
          
        case 'path':
          pathLines.add(`${step.from}-${step.to}`);
          setPath(Array.from(pathLines));
          break;
          
        case 'complete':
          setPath(step.path);
          setCurrentNode(null);
          break;
      }
      
      stepIndex++;
      setTimeout(processStep, speed);
    };
    
    setIsRunning(true);
    processStep();
  }, [speed, onComplete]);
  
  // Initialize nodes and lines
  useEffect(() => {
    const newNodes = generateNodes();
    const newLines = generateLines(newNodes);
    setNodes(newNodes);
    setLines(newLines);
    
    // Run A* after a short delay to allow rendering
    const timer = setTimeout(() => {
      const steps = runAStar(newNodes, newLines);
      setAnimationSteps(steps);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [generateNodes, generateLines, runAStar]);
  
  // Start animation when steps are ready
  useEffect(() => {
    if (animationSteps.length > 0 && !isRunning) {
      animateSteps(animationSteps);
    }
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

  // Get node class based on its state
  const getNodeClass = (node) => {
    if (node.id === 'start') return 'start';
    if (node.id === 'end') return 'end';
    if (path.includes(node.id)) return 'path';
    if (node.id === currentNode) return 'visiting';
    if (visitedNodes.has(node.id)) return 'visited';
    return 'unvisited';
  };

  return (
    <Container>
      <Svg viewBox="0 0 100 100" preserveAspectRatio="none">
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
        
        {/* Render nodes */}
        {nodes.map(node => (
          <g key={node.id}>
            <Node
              className={getNodeClass(node)}
              cx={`${node.x}%`}
              cy={`${node.y}%`}
              r={node.id === 'start' || node.id === 'end' ? 4 : 3}
            />
            {node.id === 'start' || node.id === 'end' || node.id === currentNode ? (
              <NodeLabel 
                x={`${node.x}%`} 
                y={`${parseFloat(node.y) + 1}%`}
                style={{ fontSize: '4px' }}
              >
                {node.id === 'start' ? 'Start' : node.id === 'end' ? 'End' : 'Current'}
              </NodeLabel>
            ) : null}
          </g>
        ))}
      </Svg>
    </Container>
  );
};

export default React.memo(SimpleAStarVisualization);