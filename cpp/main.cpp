#include <iostream>
#include <string>
#include "Dijkstra.h"
#include "Graph.h"

int main(int argc, char* argv[]) {
    if (argc < 3) {
        std::cerr << "Usage: dijkstra <source> <target> [graph_file]\n";
        return 1;
    }

    std::string source = argv[1];
    std::string target = argv[2];
    std::string graphFile = (argc >= 4) ? argv[3] : "graph.json";

    try {
        // Create graph and add sample data
        Graph graph;
        
        // Add airports
        graph.addAirport("JFK");
        graph.addAirport("DFW");
        graph.addAirport("ORD");
        
        // Add routes with distances (in miles)
        graph.addRoute("JFK", "ORD", 800);
        graph.addRoute("ORD", "DFW", 1650);
        
        // Find shortest path
        PathResult result = findShortestPath(graph, source, target);

        // Output JSON for Node.js to parse
        std::cout << "{ \"path\": [";
        for (size_t i = 0; i < result.path.size(); ++i) {
            if (i > 0) std::cout << ",";
            std::cout << "\"" << result.path[i] << "\"";
        }
        std::cout << "], \"totalDistance\": " << result.totalDistance << " }";
        
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    } catch (...) {
        std::cerr << "Unknown error occurred" << std::endl;
        return 1;
    }
    return 0;
}
