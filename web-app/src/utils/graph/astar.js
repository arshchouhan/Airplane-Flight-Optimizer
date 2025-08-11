import { PriorityQueue } from './dijkstra';

/**
 * Heuristic function for A* - Euclidean distance between two points
 * @param {Object} nodeA - First node with x, y coordinates
 * @param {Object} nodeB - Second node with x, y coordinates
 * @returns {number} The Euclidean distance between the nodes
 */
function heuristic(nodeA, nodeB) {
  const dx = nodeA.x - nodeB.x;
  const dy = nodeA.y - nodeB.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Finds the shortest path between two nodes in a graph using A* algorithm
 * @param {Graph} graph - The graph to search
 * @param {string} sourceId - The starting node ID
 * @param {string} targetId - The target node ID
 * @param {Object} nodePositions - Map of node IDs to their positions {x, y}
 * @returns {Object} An object containing the path, total distance, and metrics
 */
function findPathAStar(graph, sourceId, targetId, nodePositions) {
  // Initialize metrics
  const metrics = {
    visited: new Set(),
    steps: 0,
    exploredNodes: new Set()
  };

  const result = {
    path: [],
    totalDistance: Infinity,
    visited: metrics.visited,
    steps: metrics.steps,
    exploredNodes: metrics.exploredNodes
  };

  // Check if source and target nodes exist
  if (!graph.hasNode(sourceId) || !graph.hasNode(targetId)) {
    console.error('Error: Source or target node not found in graph');
    return result;
  }

  // For A*, we need positions for the heuristic
  if (!nodePositions || !nodePositions[sourceId] || !nodePositions[targetId]) {
    console.error('Error: Node positions are required for A* algorithm');
    return result;
  }

  const gScore = new Map(); // Cost from start to node
  const fScore = new Map(); // Estimated total cost from start to end through node
  const cameFrom = new Map();
  const openSet = new PriorityQueue();

  // Initialize scores
  for (const node of graph.getNodes()) {
    gScore.set(node, Infinity);
    fScore.set(node, Infinity);
    cameFrom.set(node, null);
  }

  gScore.set(sourceId, 0);
  fScore.set(sourceId, heuristic(nodePositions[sourceId], nodePositions[targetId]));
  openSet.enqueue(sourceId, fScore.get(sourceId));

  while (!openSet.isEmpty()) {
    metrics.steps++;
    const current = openSet.dequeue().element;
    metrics.visited.add(current);
    metrics.exploredNodes.add(current);

    if (current === targetId) {
      // Reconstruct path
      const path = [];
      let currentInPath = current;
      while (currentInPath !== null) {
        path.unshift(currentInPath);
        currentInPath = cameFrom.get(currentInPath);
      }
      
      // Calculate total distance
      let totalDistance = 0;
      for (let i = 0; i < path.length - 1; i++) {
        const edge = graph.getEdges(path[i]).find(e => e.node === path[i + 1]);
        if (edge) totalDistance += edge.weight;
      }

      result.path = path;
      result.totalDistance = totalDistance;
      result.steps = metrics.steps;
      return result;
    }

    for (const { node: neighbor, weight } of graph.getEdges(current)) {
      // Tentative gScore is the distance from start to the neighbor through current
      const tentativeGScore = gScore.get(current) + weight;

      if (tentativeGScore < gScore.get(neighbor)) {
        // This path to neighbor is better than any previous one
        cameFrom.set(neighbor, current);
        gScore.set(neighbor, tentativeGScore);
        fScore.set(neighbor, tentativeGScore + heuristic(nodePositions[neighbor], nodePositions[targetId]));
        
        // Add to open set if not already there
        if (!openSet.elements.some(item => item.element === neighbor)) {
          openSet.enqueue(neighbor, fScore.get(neighbor));
        }
      }
    }
  }

  // If we get here, no path was found
  result.steps = metrics.steps;
  return result;
}

export { findPathAStar };
