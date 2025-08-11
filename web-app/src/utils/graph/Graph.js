class Graph {
  constructor() {
    this.adjList = new Map();
  }

  // Add a node to the graph
  addNode(node) {
    if (!this.adjList.has(node)) {
      this.adjList.set(node, []);
    }
  }

  // Add an edge between two nodes with a weight
  addEdge(source, target, weight) {
    if (!this.adjList.has(source)) {
      this.addNode(source);
    }
    if (!this.adjList.has(target)) {
      this.addNode(target);
    }
    
    // Add edge in both directions for undirected graph
    this.adjList.get(source).push({ node: target, weight });
    this.adjList.get(target).push({ node: source, weight });
  }

  // Get all nodes in the graph
  getNodes() {
    return Array.from(this.adjList.keys());
  }

  // Get all edges from a node
  getEdges(node) {
    return this.adjList.get(node) || [];
  }

  // Check if a node exists in the graph
  hasNode(node) {
    return this.adjList.has(node);
  }
}

export default Graph;
