cmake_minimum_required(VERSION 3.10)
project(FlightOptimizer)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find nlohmann_json package
find_package(nlohmann_json 3.7.3 REQUIRED)

# Add executable
add_executable(flight_optimizer 
    main.cpp 
    Graph.cpp 
    Dijkstra.cpp
)

# Link nlohmann_json
target_link_libraries(flight_optimizer PRIVATE 
    nlohmann_json::nlohmann_json
)

# Copy graph.json to build directory
configure_file(
    ${CMAKE_SOURCE_DIR}/web-app/public/graph.json
    ${CMAKE_CURRENT_BINARY_DIR}/graph.json
    COPYONLY
)

# Create a run target for easier execution
add_custom_target(
    run_optimizer
    COMMAND ${CMAKE_CURRENT_BINARY_DIR}/flight_optimizer 1 5
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
    DEPENDS flight_optimizer
    COMMENT "Running flight path optimization..."
)
