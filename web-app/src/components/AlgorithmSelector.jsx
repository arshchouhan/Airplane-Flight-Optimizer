import React from 'react';
import '../styles/AlgorithmSelector.css';

const algorithms = [
  { id: 'dijkstra', name: 'Dijkstra\'s Algorithm' }
];

const AlgorithmSelector = ({ selectedAlgorithm, onAlgorithmChange }) => {
  return (
    <div className="algorithm-selector">
      <h3>Pathfinding Algorithm <span className="required">*</span></h3>
      <div className="algorithm-options">
        {algorithms.map((algo) => (
          <label 
            key={algo.id} 
            className={`algorithm-option ${!selectedAlgorithm ? 'unselected' : ''}`}
            onClick={(e) => {
              // If this algorithm is already selected, we'll handle the click on the label
              if (selectedAlgorithm === algo.id) {
                e.preventDefault();
                onAlgorithmChange(algo.id);
              }
            }}
          >
            <input
              type="radio"
              name="pathfinding-algorithm"
              value={algo.id}
              checked={selectedAlgorithm === algo.id}
              onChange={() => onAlgorithmChange(algo.id)}
              required
              onClick={(e) => e.stopPropagation()} // Prevent double trigger
            />
            <span>{algo.name}</span>
          </label>
        ))}
        {!selectedAlgorithm && (
          <p className="selection-hint">Please select an algorithm to find paths</p>
        )}
      </div>
    </div>
  );
};

export default AlgorithmSelector;
