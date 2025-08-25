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

// Calculate great-circle (haversine) distance heuristic in kilometers
function calculateHeuristic(airport1, airport2, airports) {
  const a1 = airports.find(a => String(a.id) === String(airport1));
  const a2 = airports.find(a => String(a.id) === String(airport2));

  if (!a1 || !a2) return 0;

  const lat1 = a1.latitude ?? a1.position?.lat;
  const lon1 = a1.longitude ?? a1.position?.lon;
  const lat2 = a2.latitude ?? a2.position?.lat;
  const lon2 = a2.longitude ?? a2.position?.lon;

  if (
    typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' || typeof lon2 !== 'number'
  ) {
    return 0;
  }

  const R = 6371; // Earth radius in km
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const a = s1 * s1 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * s2 * s2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // km
}

export function findAStarPath(graph, startNode, endNode, airports, disableAirportsCallback = null, edgeDelays = {}, edgeDistances = {}, edgeFrequencies = {}) {
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

  while (!pq.isEmpty()) {
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
    
    for (const neighbor of neighbors) {
      const neighborNode = neighbor.node;
      
      if (visited.has(neighborNode)) continue;

      // Get the edge ID for custom distance lookup
      const edgeId = `${current}-${neighborNode}`;
      const reverseEdgeId = `${neighborNode}-${current}`;
      
      // Use custom distance if available, otherwise use original weight
      let edgeWeight = neighbor.weight;
      const customDistance = edgeDistances[edgeId] || edgeDistances[reverseEdgeId];
      if (customDistance !== undefined) {
        edgeWeight = customDistance;
      }
      
      // Add delay if present
      const delay = edgeDelays[edgeId] || edgeDelays[reverseEdgeId] || 0;
      if (delay > 0) {
        edgeWeight += delay * 10; // Convert delay minutes to distance penalty
      }

      // Apply frequency override - if frequency >= 5, use weight of 1 (match Dijkstra behavior)
      // Try numeric keys first, then fallback to IATA-based keys if available
      const resolveCode = (id) => {
        const ap = airports.find(a => String(a.id) === String(id));
        return ap?.iata || String(id);
      };
      const iataEdgeId = `${resolveCode(current)}-${resolveCode(neighborNode)}`;
      const iataReverseEdgeId = `${resolveCode(neighborNode)}-${resolveCode(current)}`;
      const frequency = edgeFrequencies[edgeId] || edgeFrequencies[reverseEdgeId] || edgeFrequencies[iataEdgeId] || edgeFrequencies[iataReverseEdgeId] || 1;
      if (frequency >= 5) {
        edgeWeight = 1; // Ultra high frequency gets priority weight
        console.log(`🚨 A* FREQUENCY OVERRIDE: Edge ${edgeId} with frequency ${frequency} gets weight 1`);
      }

      const tentativeG = gScores.get(current) + edgeWeight;
      
      if (tentativeG < gScores.get(neighborNode)) {
        previous.set(neighborNode, current);
        gScores.set(neighborNode, tentativeG);
        distances.set(neighborNode, tentativeG);
        
        const h = calculateHeuristic(neighborNode, endNode, airports);
        const f = tentativeG + h;
        fScores.set(neighborNode, f);
        
        pq.enqueue(neighborNode, f);
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
    steps,
    visitedCount: visited.size,
    frontierCount: 0 // Frontier is empty at completion
  };
}
