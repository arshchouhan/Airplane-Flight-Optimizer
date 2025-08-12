class Graph {
  constructor() {
    this.adjList = new Map();
    console.log('New Graph instance created');
  }

  // Add a node to the graph
  addNode(node) {
    if (node === null || node === undefined) {
      console.warn('Attempted to add null or undefined node');
      return false;
    }
    
    const nodeStr = String(node);
    if (!this.adjList.has(nodeStr)) {
      this.adjList.set(nodeStr, []);
      console.log(`Added node: ${nodeStr}`);
      return true;
    } else {
      console.log(`Node ${nodeStr} already exists`);
      return false;
    }
  }

  // Add an edge between two nodes with a weight
  addEdge(source, target, weight = 1) {
    if (!source || !target) {
      console.warn('Invalid edge - missing source or target', { source, target });
      return false;
    }
    
    const sourceStr = String(source);
    const targetStr = String(target);
    const weightNum = Number(weight) || 1;
    
    // Ensure nodes exist
    this.addNode(sourceStr);
    this.addNode(targetStr);
    
    // Check if edge already exists
    const existingEdgeIndex = this.adjList.get(sourceStr).findIndex(edge => edge.node === targetStr);
    
    if (existingEdgeIndex >= 0) {
      // Update existing edge weight
      this.adjList.get(sourceStr)[existingEdgeIndex].weight = weightNum;
      console.log(`Updated edge: ${sourceStr} -> ${targetStr} (weight: ${weightNum})`);
    } else {
      // Add new edge
      this.adjList.get(sourceStr).push({ node: targetStr, weight: weightNum });
      console.log(`Added edge: ${sourceStr} -> ${targetStr} (weight: ${weightNum})`);
    }
    
    // For undirected graphs, add the reverse edge as well
    const reverseEdgeIndex = this.adjList.get(targetStr).findIndex(edge => edge.node === sourceStr);
    if (reverseEdgeIndex < 0) {
      this.adjList.get(targetStr).push({ node: sourceStr, weight: weightNum });
      console.log(`Added reverse edge: ${targetStr} -> ${sourceStr} (weight: ${weightNum})`);
    }
    
    return true;
  }

  // Get all nodes in the graph
  getNodes() {
    return Array.from(this.adjList.keys());
  }

  // Get all edges from the graph
  getAllEdges() {
    const edges = [];
    const addedEdges = new Set();
    
    for (const [source, targets] of this.adjList.entries()) {
      for (const { node: target, weight } of targets) {
        // Use a consistent key to avoid duplicates in undirected graphs
        const edgeKey = [source, target].sort().join('_');
        
        if (!addedEdges.has(edgeKey)) {
          edges.push({ 
            source, 
            target, 
            weight,
            id: `${source}_${target}` // Add an ID for React keys
          });
          addedEdges.add(edgeKey);
        }
      }
    }
    
    return edges;
  }

  // Get all edges from a specific node
  getEdges(node) {
    const nodeStr = String(node);
    if (!this.adjList.has(nodeStr)) {
      console.warn(`Node ${nodeStr} not found`);
      return [];
    }
    return [...this.adjList.get(nodeStr)];
  }

  // Check if a node exists in the graph
  hasNode(node) {
    if (node === null || node === undefined) return false;
    return this.adjList.has(String(node));
  }
  
  // Check if an edge exists between two nodes
  hasEdge(source, target) {
    const sourceStr = String(source);
    const targetStr = String(target);
    
    if (!this.adjList.has(sourceStr)) return false;
    return this.adjList.get(sourceStr).some(edge => edge.node === targetStr);
  }
  
  // Get the weight of an edge between two nodes
  getEdgeWeight(source, target) {
    const sourceStr = String(source);
    const targetStr = String(target);
    
    if (!this.adjList.has(sourceStr)) return null;
    
    const edge = this.adjList.get(sourceStr).find(edge => edge.node === targetStr);
    return edge ? edge.weight : null;
  }
  
  // Get the number of nodes in the graph
  size() {
    return this.adjList.size;
  }
  
  // Print the graph for debugging
  print() {
    console.log('Graph:');
    for (const [node, edges] of this.adjList.entries()) {
      const edgeList = edges.map(e => `${e.node}(${e.weight})`).join(', ');
      console.log(`${node} -> ${edgeList}`);
    }
  }
}

export default Graph;
