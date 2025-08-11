class PriorityQueue {
  constructor() {
    this.elements = [];
  }

  enqueue(element, priority) {
    this.elements.push({ element, priority });
    this.elements.sort((a, b) => a.priority - b.priority);
  }

  dequeue() {
    return this.elements.shift();
  }

  isEmpty() {
    return this.elements.length === 0;
  }
}

/**
 * Finds the shortest path between two nodes in a graph using Dijkstra's algorithm
 * @param {Graph} graph - The graph to search
 * @param {string} sourceId - The starting node ID
 * @param {string} targetId - The target node ID
 * @returns {Object} An object containing the path and total distance
 */
function findShortestPath(graph, sourceId, targetId) {
  // Initialize metrics
  const metrics = {
    visited: new Set(),
    steps: 0
  };

  const result = {
    path: [],
    totalDistance: Infinity,
    visited: metrics.visited,
    steps: metrics.steps
  };

  // Check if source and target nodes exist
  if (!graph.hasNode(sourceId) || !graph.hasNode(targetId)) {
    console.error('Error: Source or target node not found in graph');
    return result;
  }

  const distances = new Map();
  const previous = new Map();
  const priorityQueue = new PriorityQueue();

  // Initialize distances and previous nodes
  for (const node of graph.getNodes()) {
    distances.set(node, Infinity);
    previous.set(node, null);
  }
  distances.set(sourceId, 0);
  priorityQueue.enqueue(sourceId, 0);

  // Main algorithm loop
  while (!priorityQueue.isEmpty()) {
    metrics.steps++;
    const { element: currentId, priority: currentDistance } = priorityQueue.dequeue();
    metrics.visited.add(currentId);

    // If we've already found a shorter path to this node, skip it
    if (currentDistance > distances.get(currentId)) {
      continue;
    }

    // If we've reached the target, we're done
    if (currentId === targetId) {
      break;
    }

    // Check all neighbors
    for (const { node: neighbor, weight } of graph.getEdges(currentId)) {
      const distance = currentDistance + weight;

      // If we found a shorter path to the neighbor
      if (distance < distances.get(neighbor)) {
        distances.set(neighbor, distance);
        previous.set(neighbor, currentId);
        priorityQueue.enqueue(neighbor, distance);
      }
    }
  }

  // Reconstruct the path if we found one
  if (previous.get(targetId) !== null || targetId === sourceId) {
    const path = [];
    let current = targetId;
    while (current !== null) {
      path.unshift(current);
      current = previous.get(current);
    }
    result.path = path;
    result.totalDistance = distances.get(targetId);
    result.steps = metrics.steps;
  } else {
    // If no path found, still update the steps and visited nodes
    result.steps = metrics.steps;
  }

  return result;
}

export { findShortestPath, PriorityQueue };
