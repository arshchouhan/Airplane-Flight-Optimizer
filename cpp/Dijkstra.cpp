#include "Dijkstra.h"
#include <iostream>
#include <queue>
#include <unordered_map>
#include <limits>
#include <algorithm>

struct QueueNode {
    std::string airportId;
    double distance;
    bool operator>(const QueueNode& other) const { return distance > other.distance; }
};

PathResult findShortestPath(const Graph& graph, const std::string& sourceId, const std::string& targetId) {
    PathResult result;

    // Check if source and target airports exist
    if (!graph.hasAirport(sourceId) || !graph.hasAirport(targetId)) {
        std::cerr << "Error: Source or target airport not found in graph\n";
        return result;
    }

    // Priority queue for Dijkstra's algorithm
    std::priority_queue<QueueNode, std::vector<QueueNode>, std::greater<>> pq;
    
    // Distance and previous node tracking
    std::unordered_map<std::string, double> distances;
    std::unordered_map<std::string, std::string> previous;

    // Initialize distances to infinity and previous nodes to empty
    for (const auto &pair : graph.getAdjList()) {
        distances[pair.first] = std::numeric_limits<double>::infinity();
        previous[pair.first] = "";
    }

    // Start from source airport
    distances[sourceId] = 0;
    pq.push({sourceId, 0});

    // Main Dijkstra's algorithm loop
    while (!pq.empty()) {
        // Get the airport with the smallest distance
        QueueNode current = pq.top();
        pq.pop();
        
        // If we've reached the target, we're done
        if (current.airportId == targetId) break;
        
        // If we already found a better path, skip
        if (current.distance > distances[current.airportId]) continue;

        // Check all neighbors
        for (const auto &edge : graph.getRoutes(current.airportId)) {
            double newDist = current.distance + edge.distance;
            
            // If we found a shorter path to this neighbor
            if (newDist < distances[edge.destination]) {
                distances[edge.destination] = newDist;
                previous[edge.destination] = current.airportId;
                pq.push({edge.destination, newDist});
            }
        }
    }

    // Reconstruct the path from source to target
    std::string curr = targetId;
    while (curr != "" && previous.find(curr) != previous.end()) {
        result.path.insert(result.path.begin(), curr);
        curr = previous[curr];
    }
    
    // Add the total distance
    if (distances.find(targetId) != distances.end()) {
        result.totalDistance = distances[targetId];
    }

    return result;
}
