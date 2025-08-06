#ifndef GRAPH_H
#define GRAPH_H

#include <unordered_map>
#include <vector>
#include <string>

struct Edge {
    std::string destination;
    double distance;
};

class Graph {
private:
    std::unordered_map<std::string, std::vector<Edge>> adjList;

public:
    // Add a new airport to the graph if it doesn't exist
    void addAirport(const std::string &airportId) {
        if (adjList.find(airportId) == adjList.end()) {
            adjList[airportId] = std::vector<Edge>();
        }
    }
    
    void addRoute(const std::string &source, const std::string &destination, double distance);
    const std::vector<Edge>& getRoutes(const std::string &airportId) const;
    const std::unordered_map<std::string, std::vector<Edge>>& getAdjList() const { return adjList; }
    bool hasAirport(const std::string &airportId) const;
};

#endif
