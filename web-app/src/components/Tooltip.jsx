import React from 'react';
import PropTypes from 'prop-types';
import '../styles/Tooltip.css';

/**
 * Tooltip component that displays airport information
 * @param {Object} props - Component props
 * @param {boolean} props.visible - Whether the tooltip is visible
 * @param {number} props.x - X position of the tooltip
 * @param {number} props.y - Y position of the tooltip
 * @param {Object} props.airport - Airport data to display
 * @returns {JSX.Element} Tooltip component
 */
const Tooltip = ({ visible, x, y, airport }) => {
  if (!visible || !airport) return null;

  return (
    <div 
      className="tooltip"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <div className="tooltip-header">
        <h4 className="tooltip-title">{airport.name || 'Unknown Airport'}</h4>
        {airport.id && <span className="tooltip-code">Code: {airport.id}</span>}
      </div>
      
      <div className="tooltip-body">
        {airport.city || airport.country ? (
          <div className="tooltip-row">
            <span className="tooltip-label">Location:</span>
            <span className="tooltip-value">
              {[airport.city, airport.country].filter(Boolean).join(', ')}
            </span>
          </div>
        ) : null}
        
        <div className="tooltip-row">
          <span className="tooltip-label">Coordinates:</span>
          <span className="tooltip-value">
            {airport.position?.lat && airport.position?.lon 
              ? `${airport.position.lat.toFixed(4)}°, ${airport.position.lon.toFixed(4)}°`
              : 'Coordinates not available'}
          </span>
        </div>
        
        {airport.routes && (
          <div className="tooltip-row">
            <span className="tooltip-label">Direct Connections:</span>
            <span className="tooltip-value">
              {airport.routes.length} {airport.routes.length === 1 ? 'route' : 'routes'}
            </span>
          </div>
        )}
        
        {airport.runways && airport.runways > 0 && (
          <div className="tooltip-row">
            <span className="tooltip-label">Runways:</span>
            <span className="tooltip-value">{airport.runways}</span>
          </div>
        )}
        
        {airport.elevation !== undefined && (
          <div className="tooltip-row">
            <span className="tooltip-label">Elevation:</span>
            <span className="tooltip-value">
              {airport.elevation.toLocaleString()} ft
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

Tooltip.propTypes = {
  visible: PropTypes.bool.isRequired,
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  airport: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    city: PropTypes.string,
    country: PropTypes.string,
    position: PropTypes.shape({
      lat: PropTypes.number,
      lon: PropTypes.number
    }),
    routes: PropTypes.array
  })
};

export default Tooltip;
