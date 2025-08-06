#ifndef DIJKSTRA_H
#define DIJKSTRA_H

#include "Graph.h"
#include <vector>
#include <string>

struct PathResult {
    std::vector<std::string> path;
    double totalDistance = 0;
};

PathResult findShortestPath(const Graph& graph, const std::string& sourceId, const std::string& targetId);

#endif
