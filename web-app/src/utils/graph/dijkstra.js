class PriorityQueue {
  constructor() {
    this.heap = [];
  }

  // Get parent index
  _parent(index) {
    return Math.floor((index - 1) / 2);
  }

  // Get left child index
  _leftChild(index) {
    return 2 * index + 1;
  }

  // Get right child index
  _rightChild(index) {
    return 2 * index + 2;
  }

  // Check if the heap is empty
  isEmpty() {
    return this.heap.length === 0;
  }

  // Get the size of the heap
  size() {
    return this.heap.length;
  }

  // Swap two elements in the heap
  _swap(i, j) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  // Add an element to the priority queue
  enqueue(element, priority) {
    // Create a new node
    const node = { element, priority };
    // Add the new node to the end of the heap
    this.heap.push(node);
    // Move the node up to maintain the heap property
    this._siftUp();
  }

  // Remove and return the element with the highest priority (lowest priority number)
  dequeue() {
    if (this.isEmpty()) {
      return null;
    }
    
    // Get the root element (highest priority)
    const root = this.heap[0];
    // Get the last element
    const last = this.heap.pop();
    
    // If there are remaining elements, put the last element at the root and sift down
    if (!this.isEmpty()) {
      this.heap[0] = last;
      this._siftDown(0);
    }
    
    return root;
  }

  // Move the element at the given index up to maintain the heap property
  _siftUp() {
    let index = this.heap.length - 1;
    
    while (index > 0) {
      const parentIndex = this._parent(index);
      
      // If the parent has lower or equal priority, we're done
      if (this.heap[parentIndex].priority <= this.heap[index].priority) {
        break;
      }
      
      // Otherwise, swap with parent
      this._swap(parentIndex, index);
      index = parentIndex;
    }
  }

  // Move the element at the given index down to maintain the heap property
  _siftDown(index) {
    const left = this._leftChild(index);
    const right = this._rightChild(index);
    let smallest = index;
    
    // Find the index of the node with the smallest priority among the current node and its children
    if (left < this.heap.length && this.heap[left].priority < this.heap[smallest].priority) {
      smallest = left;
    }
    
    if (right < this.heap.length && this.heap[right].priority < this.heap[smallest].priority) {
      smallest = right;
    }
    
    // If the smallest priority is not the current node, swap and continue sifting down
    if (smallest !== index) {
      this._swap(index, smallest);
      this._siftDown(smallest);
    }
  }
}

/**
 * Finds the shortest path between two nodes in a graph using Dijkstra's algorithm
 * @param {Graph} graph - The graph to search
 * @param {string} sourceId - The starting node ID
 * @param {string} targetId - The target node ID
 * @returns {Object} An object containing the path and total distance
 */
function findShortestPath(graph, sourceId, targetId, edgeDelays = {}, edgeDistances = {}, edgeFrequencies = {}) {
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
      // Get the edge ID for custom distance lookup
      const edgeId = `${currentId}-${neighbor}`;
      const reverseEdgeId = `${neighbor}-${currentId}`;
      
      // Use custom distance if available, otherwise use original weight
      let edgeWeight = weight;
      const customDistance = edgeDistances[edgeId] || edgeDistances[reverseEdgeId];
      if (customDistance !== undefined) {
        edgeWeight = customDistance;
      }
      
      // Add delay if present
      const delay = edgeDelays[edgeId] || edgeDelays[reverseEdgeId] || 0;
      if (delay > 0) {
        edgeWeight += delay * 10; // Convert delay minutes to distance penalty
      }
      
      // Apply frequency override - if frequency >= 5, use weight of 1, but only if not disabled
      const frequency = edgeFrequencies[edgeId] || edgeFrequencies[reverseEdgeId] || 1;
      if (frequency >= 5) {
        // Check if this specific edge is disabled
        const isDisabled = edgeDelays[edgeId] === Infinity || edgeDelays[reverseEdgeId] === Infinity;
        if (!isDisabled) {
          edgeWeight = 1; // Ultra high frequency gets priority weight
          console.log(`🚨 DIJKSTRA FREQUENCY OVERRIDE: Edge ${edgeId} with frequency ${frequency} gets weight 1`);
        } else {
          console.log(`⚠️ DIJKSTRA FREQUENCY OVERRIDE SKIPPED: Edge ${edgeId} is disabled`);
        }
      }

      const distance = currentDistance + edgeWeight;

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
