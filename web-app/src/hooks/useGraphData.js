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
      const response = await fetch('/graph.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Transform data
      const airports = (data.airports || []).map((airport, index) => ({
        ...airport,
        name: `Airport ${index + 1}`,
        originalName: airport.name // Keep original name in case it's needed
      }));
      
      const routes = data.routes || [];
      
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

  return {
    airports: graph.airports,
    routes: graph.routes,
    isLoading,
    error,
    refetch: fetchGraphData
  };
};

export default useGraphData;
