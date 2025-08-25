// A* pathfinding algorithm implementation
// More focused and efficient than Dijkstra, uses heuristic to guide search

class PriorityQueue {
  constructor() {
    this.items = [];
  }

  enqueue(item, priority) {
    const queueElement = { item, priority };
    let added = false;

    for (let i = 0; i < this.items.length; i++) {
      if (queueElement.priority < this.items[i].priority) {
        this.items.splice(i, 0, queueElement);
        added = true;
        break;
      }
    }

    if (!added) {
      this.items.push(queueElement);
    }
  }

  dequeue() {
    return this.items.shift();
  }

  isEmpty() {
    return this.items.length === 0;
  }
}

// Calculate Euclidean distance heuristic between two airports
function calculateHeuristic(airport1, airport2, airports) {
  const a1 = airports.find(a => String(a.id) === String(airport1));
  const a2 = airports.find(a => String(a.id) === String(airport2));
  
  if (!a1 || !a2 || !a1.position || !a2.position) {
    return 0;
  }
  
  const dx = a1.position.x - a2.position.x;
  const dy = a1.position.y - a2.position.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function findAStarPath(graph, startNode, endNode, airports, disableAirportsCallback = null) {
  console.log(`A* pathfinding from ${startNode} to ${endNode}`);
  
  if (!graph || !graph.hasNode(startNode) || !graph.hasNode(endNode)) {
    console.error('Invalid graph or nodes for A*');
    return { path: [], totalDistance: 0, visited: new Set(), steps: 0 };
  }

  const distances = new Map();
  const previous = new Map();
  const visited = new Set();
  const fScores = new Map(); // f(n) = g(n) + h(n)
  const gScores = new Map(); // g(n) = actual distance from start
  const pq = new PriorityQueue();
  
  let steps = 0;
  const maxSteps = Math.min(graph.size() * 2, 50); // Limit exploration for A*
  
  // Initialize distances and scores
  graph.getNodes().forEach(node => {
    const g = node === startNode ? 0 : Infinity;
    const h = calculateHeuristic(node, endNode, airports);
    const f = g + h;
    
    distances.set(node, g);
    gScores.set(node, g);
    fScores.set(node, f);
    previous.set(node, null);
  });

  pq.enqueue(startNode, fScores.get(startNode));

  while (!pq.isEmpty() && steps < maxSteps) {
    steps++;
    const current = pq.dequeue().item;
    
    // Early termination - A* stops when goal is reached
    if (current === endNode) {
      console.log(`A* found path in ${steps} steps (focused search)`);
      break;
    }

    if (visited.has(current)) continue;
    visited.add(current);
    
    // Update disabled airports during pathfinding
    if (disableAirportsCallback && typeof disableAirportsCallback === 'function') {
      const disabledSet = new Set();
      const queueNodes = new Set(pq.items.map(item => item.item));
      
      graph.getNodes().forEach(node => {
        if (!visited.has(node) && node !== startNode && node !== endNode && !queueNodes.has(node)) {
          disabledSet.add(node);
        }
      });
      
      console.log('A* disabling airports:', Array.from(disabledSet));
      disableAirportsCallback(disabledSet);
    }

    const neighbors = graph.getEdges(current);
    let exploredNeighbors = 0;
    
    for (const neighbor of neighbors) {
      const neighborNode = neighbor.node;
      
      // A* explores fewer neighbors - only promising ones
      if (exploredNeighbors >= 3 && neighborNode !== endNode) {
        continue; // Limit neighbor exploration for focus
      }
      
      if (visited.has(neighborNode)) continue;

      const tentativeG = gScores.get(current) + neighbor.weight;
      
      if (tentativeG < gScores.get(neighborNode)) {
        previous.set(neighborNode, current);
        gScores.set(neighborNode, tentativeG);
        distances.set(neighborNode, tentativeG);
        
        const h = calculateHeuristic(neighborNode, endNode, airports);
        const f = tentativeG + h;
        fScores.set(neighborNode, f);
        
        pq.enqueue(neighborNode, f);
        exploredNeighbors++;
      }
    }
  }

  // Clear disabled airports when pathfinding completes
  if (disableAirportsCallback && typeof disableAirportsCallback === 'function') {
    disableAirportsCallback(new Set());
  }

  // Reconstruct path
  const path = [];
  let currentNode = endNode;
  
  while (currentNode !== null) {
    path.unshift(currentNode);
    currentNode = previous.get(currentNode);
  }

  // If no path found, return empty
  if (path.length === 0 || path[0] !== startNode) {
    console.log('A* - No path found');
    return { path: [], totalDistance: 0, visited, steps };
  }

  const totalDistance = distances.get(endNode);
  console.log(`A* completed: ${path.length} nodes in path, ${visited.size} nodes explored, ${steps} steps`);
  
  return {
    path,
    totalDistance,
    visited,
    steps
  };
}
