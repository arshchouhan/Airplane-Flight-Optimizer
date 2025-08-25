import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to fetch and manage graph data
 * @returns {Object} Graph data and loading/error states
 * @property {Array} airports - List of airports with coordinates
 * @property {Array} routes - List of routes between airports
 * @property {boolean} isLoading - Loading state
 * @property {string} error - Error message if any
 * @property {Function} refetch - Function to refetch graph data
 */
const useGraphData = () => {
  const [graph, setGraph] = useState({ airports: [], routes: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGraphData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First try to load from localStorage
      const savedData = localStorage.getItem('airportGraphData');
      if (savedData) {
        const data = JSON.parse(savedData);
        const airports = (data.airports || []).map((airport, index) => ({
          ...airport,
          name: `Airport ${airport.id}`,
          originalName: airport.name
        }));
        const routes = data.routes || [];
        setGraph({ airports, routes });
        return { airports, routes };
      }

      // If no saved data, load from public folder
      const response = await fetch('/graph.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Transform data
      const airports = (data.airports || []).map((airport, index) => ({
        ...airport,
        name: `Airport ${airport.id}`,
        originalName: airport.name
      }));
      
      const routes = data.routes || [];
      
      // Save to localStorage for future use
      localStorage.setItem('airportGraphData', JSON.stringify({ airports, routes }));
      
      setGraph({ airports, routes });
      return { airports, routes };
    } catch (err) {
      console.error('Error fetching graph data:', err);
      setError(err.message || 'Failed to load graph data');
      return { airports: [], routes: [] };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  // Function to add a new airport
  const addAirport = useCallback(async (newAirport) => {
    try {
      const updatedAirports = [...graph.airports, newAirport];
      const updatedGraph = { airports: updatedAirports, routes: graph.routes };
      
      // Save to localStorage
      localStorage.setItem('airportGraphData', JSON.stringify(updatedGraph));
      
      // Update local state
      setGraph(updatedGraph);
      return { success: true };
    } catch (err) {
      console.error('Error adding airport:', err);
      setError(err.message || 'Failed to add airport');
      return { success: false, error: err.message };
    }
  }, [graph]);

  // Function to remove an airport
  const removeAirport = useCallback(async (airportId) => {
    console.log('removeAirport called with ID:', airportId);
    console.log('Current airports:', graph.airports.map(a => ({ id: a.id, name: a.name })));
    
    try {
      const updatedAirports = graph.airports.filter(airport => airport.id !== airportId);
      console.log('Airports after filtering:', updatedAirports.map(a => ({ id: a.id, name: a.name })));
      
      // Also remove any routes connected to this airport
      const updatedRoutes = graph.routes.filter(route => 
        route.source !== airportId && route.target !== airportId
      );
      console.log('Routes before filtering:', graph.routes.length);
      console.log('Routes after filtering:', updatedRoutes.length);
      
      const updatedGraph = { airports: updatedAirports, routes: updatedRoutes };
      
      // Save to localStorage
      localStorage.setItem('airportGraphData', JSON.stringify(updatedGraph));
      console.log('Data saved to localStorage');
      
      // Update local state
      setGraph(updatedGraph);
      console.log('Local state updated');
      
      return { success: true };
    } catch (err) {
      console.error('Error removing airport:', err);
      setError(err.message || 'Failed to remove airport');
      return { success: false, error: err.message };
    }
  }, [graph]);

  // Function to add a new route
  const addRoute = useCallback(async (newRoute) => {
    console.log('addRoute called with:', newRoute);
    
    try {
      // Check if route already exists
      const routeExists = graph.routes.some(route => 
        (route.source === newRoute.source && route.target === newRoute.target) ||
        (route.source === newRoute.target && route.target === newRoute.source)
      );
      
      if (routeExists) {
        return { success: false, error: 'Route already exists between these airports' };
      }
      
      const updatedRoutes = [...graph.routes, newRoute];
      const updatedGraph = { airports: graph.airports, routes: updatedRoutes };
      
      // Save to localStorage
      localStorage.setItem('airportGraphData', JSON.stringify(updatedGraph));
      console.log('Route data saved to localStorage');
      
      // Update local state
      setGraph(updatedGraph);
      console.log('Local state updated with new route');
      
      return { success: true };
    } catch (err) {
      console.error('Error adding route:', err);
      setError(err.message || 'Failed to add route');
      return { success: false, error: err.message };
    }
  }, [graph]);

  // Function to reset to original data
  const resetToOriginal = useCallback(async () => {
    console.log('Resetting to original graph data...');
    
    try {
      // Clear localStorage
      localStorage.removeItem('airportGraphData');
      
      // Reload from graph.json
      const response = await fetch('/graph.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Transform data
      const airports = (data.airports || []).map((airport, index) => ({
        ...airport,
        name: `Airport ${airport.id}`,
        originalName: airport.name
      }));
      
      const routes = data.routes || [];
      
      // Update state
      setGraph({ airports, routes });
      console.log('Reset to original data successful');
      
      return { success: true };
    } catch (err) {
      console.error('Error resetting to original data:', err);
      setError(err.message || 'Failed to reset to original data');
      return { success: false, error: err.message };
    }
  }, []);

  return {
    airports: graph.airports,
    routes: graph.routes,
    isLoading,
    error,
    refetch: fetchGraphData,
    addAirport,
    removeAirport,
    addRoute,
    resetToOriginal
  };
};

export default useGraphData;
