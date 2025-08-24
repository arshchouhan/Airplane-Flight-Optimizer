import React, { useEffect, useState } from 'react';
import '../styles/AlgorithmSettingsPanel.css';

const AlgorithmSettingsPanel = ({ algorithm, isVisible, onClose, performanceMetrics, onVisualize }) => {
  const [metrics, setMetrics] = useState({
    executionTime: 0,
    visitedNodes: 0,
    pathCost: 0,
    algorithmSteps: 0,
    memoryUsage: '0 MB'
  });

  useEffect(() => {
    if (performanceMetrics) {
      setMetrics(prev => ({
        executionTime: performanceMetrics.executionTime || 0,
        visitedNodes: performanceMetrics.visitedNodes || 0,
        pathCost: performanceMetrics.pathCost || 0,
        algorithmSteps: performanceMetrics.algorithmSteps || 0,
        memoryUsage: performanceMetrics.memoryUsage || '0 MB'
      }));
    }
  }, [performanceMetrics]);

  if (!isVisible) return null;

  const renderSettings = () => {
    switch (algorithm) {
      case 'dijkstra':
        return (
          <div className="algorithm-settings">
            <p>Finds the shortest path from source to all nodes</p>
          </div>
        );
      case 'bellman-ford':
        return (
          <div className="algorithm-settings">
            <p>Handles graphs with negative weights</p>
          </div>
        );
      case 'floyd-warshall':
        return (
          <div className="algorithm-settings">
            <p>Finds shortest paths between all pairs of nodes</p>
          </div>
        );
      default:
        return null;
    }
  };

  const handleVisualize = () => {
    onVisualize?.();
  };

  return (
    <div className={`algorithm-settings-panel ${isVisible ? 'is-visible' : ''}`}>
      <div className="panel-header">
        <h3>{algorithm === 'dijkstra' ? "Start Pathfinding" : 
             algorithm === 'bellman-ford' ? 'Bellman-Ford' : 
             'Floyd-Warshall'} Algorithm</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      
      {renderSettings()}
      
      <div className="visualize-section">
        <button 
          className="visualize-btn"
          onClick={handleVisualize}
          title="Visualize the selected algorithm"
        >
          Visualize
        </button>
      </div>
      
      <div className="metrics-section">
        <h4>Performance Metrics</h4>
        <div className="metrics-grid">
          <div className="metric-item">
            <div className="metric-label">Execution Time</div>
            <div className="metric-value">{metrics.executionTime} ms</div>
            <div className="metric-description">Time complexity: O((V+E)logV)</div>
          </div>
          
          <div className="metric-item">
            <div className="metric-label">Visited Nodes</div>
            <div className="metric-value">{metrics.visitedNodes}</div>
            <div className="metric-description">Efficiency indicator</div>
          </div>
          
          <div className="metric-item">
            <div className="metric-label">Path Cost</div>
            <div className="metric-value">{metrics.pathCost} km</div>
            <div className="metric-description">Total edge weights</div>
          </div>
          
          <div className="metric-item">
            <div className="metric-label">Algorithm Steps</div>
            <div className="metric-value">{metrics.algorithmSteps}</div>
            <div className="metric-description">Search iterations</div>
          </div>
          
          <div className="metric-item">
            <div className="metric-label">Memory Usage</div>
            <div className="metric-value">{metrics.memoryUsage}</div>
            <div className="metric-description">Space complexity: O(V)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlgorithmSettingsPanel;
