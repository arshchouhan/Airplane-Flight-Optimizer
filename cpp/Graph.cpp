#include "Graph.h"

void Graph::addRoute(const std::string &source, const std::string &destination, double distance) {
    // Add route in both directions for undirected graph
    adjList[source].push_back({destination, distance});
    adjList[destination].push_back({source, distance});
}

const std::vector<Edge>& Graph::getRoutes(const std::string &airportId) const {
    static const std::vector<Edge> empty;
    auto it = adjList.find(airportId);
    return (it != adjList.end()) ? it->second : empty;
}

bool Graph::hasAirport(const std::string &airportId) const {
    return adjList.find(airportId) != adjList.end();
}
