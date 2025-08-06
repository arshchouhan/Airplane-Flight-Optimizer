import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FaPlane, FaMapMarkerAlt } from 'react-icons/fa';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';

// Inline styles for the components
const styles = {
  planeContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
  },
  airportMarker: {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 10,
    opacity: 0.7,
    transition: 'all 0.3s ease',
    '&:hover': {
      opacity: 1,
      zIndex: 15
    }
  },
  marker: {
    width: '16px',
    height: '16px',
    background: 'rgba(74, 222, 128, 0.9)',
    borderRadius: '50%',
    position: 'relative',
    boxShadow: '0 0 10px rgba(74, 222, 128, 0.5)',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'scale(1.2)'
    }
  },
  markerAfter: {
    content: '""',
    position: 'absolute',
    width: '100%',
    height: '100%',
    background: 'rgba(74, 222, 128, 0.2)',
    borderRadius: '50%',
    top: 0,
    left: 0,
    transform: 'scale(1.5)',
    opacity: 0,
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'scale(2)',
      opacity: 1
    }
  },
  label: {
    marginTop: '10px',
    background: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    whiteSpace: 'nowrap',
    transform: 'translateY(5px)',
    opacity: 0,
    transition: 'all 0.3s ease'
  },
  labelHover: {
    transform: 'translateY(0)',
    opacity: 1
  },
  flightPath: {
    fill: 'none',
    stroke: 'url(#flightGradient)',
    strokeWidth: 2,
    strokeDasharray: '5, 5',
    filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.5))'
  },
  planeIcon: {
    position: 'relative',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  plane: {
    position: 'relative',
    zIndex: 2,
    filter: 'drop-shadow(0 2px 8px rgba(99, 102, 107, 0.7))',
    color: '#6366f1',
    fontSize: '28px'
  },
  glow: {
    position: 'absolute',
    width: '24px',
    height: '24px',
    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 80%)',
    borderRadius: '50%',
    zIndex: 1,
    opacity: 0.7
  },
  // Removing the trail effect completely as it was causing the random green circle
  trail: {
    display: 'none' // Disable the trail effect
  },
  progressIndicator: {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    zIndex: 1000
  }
};

const PlaneAnimation = ({ 
  path = [], 
  airports = [], 
  speed = 1, 
  onComplete,
  style 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [flightPath, setFlightPath] = useState([]);
  const controls = useAnimation();
  const pathRef = useRef(null);

  // Calculate angle between two points for plane rotation
  const calculateRotation = (start, end) => {
    if (!start || !end) return 0;
    const angleRad = Math.atan2(end.y - start.y, end.x - start.x);
    return angleRad * (180 / Math.PI);
  };

  // Get airport position by ID
  const getAirportPosition = useCallback((id) => {
    const airport = airports.find(a => 
      String(a.id) === String(id) || 
      (a.iata && a.iata === id) ||
      (a.code && a.code === id)
    );
    
    if (!airport) {
      console.warn(`Airport with ID ${id} not found`);
      return null;
    }
    
    return {
      x: airport.x ?? airport.position?.x ?? 0,
      y: airport.y ?? airport.position?.y ?? 0,
      id: airport.id,
      name: airport.name || `Airport ${id}`,
      code: airport.iata || airport.code || id
    };
  }, [airports]);

  // Generate flight path with points between airports
  const generateFlightPath = useCallback((start, end, steps = 20) => {
    const path = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Add some curve to the path
      const curve = Math.sin(t * Math.PI) * 30;
      const x = start.x + (end.x - start.x) * t;
      const y = start.y + (end.y - start.y) * t + curve * (1 - 2 * Math.abs(t - 0.5));
      path.push({ x, y });
    }
    return path;
  }, []);

  // Initialize position and flight path when path or airports change
  useEffect(() => {
    if (path.length >= 2 && airports.length > 0) {
      const startPos = getAirportPosition(path[0]);
      const endPos = getAirportPosition(path[1]);
      
      if (startPos && endPos) {
        const pathPoints = generateFlightPath(startPos, endPos);
        setFlightPath(pathPoints);
        setCurrentPosition(pathPoints[0]);
        setCurrentIndex(0);
        setIsPlaying(true);
        
        // Set initial rotation
        const angle = calculateRotation(pathPoints[0], pathPoints[1] || pathPoints[0]);
        setRotation(angle);
      }
    }
  }, [path, airports, getAirportPosition, generateFlightPath]);

  // Handle movement along the flight path
  useEffect(() => {
    if (!isPlaying || flightPath.length <= 1) return;

    const duration = speed * 2; // Total animation duration in seconds
    const startTime = Date.now();
    const totalFrames = flightPath.length;
    let animationFrame;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      
      // Calculate current position along the path
      const pathIndex = Math.min(
        Math.floor(progress * totalFrames),
        totalFrames - 1
      );
      
      const currentPos = flightPath[pathIndex];
      const nextPos = flightPath[Math.min(pathIndex + 1, totalFrames - 1)];
      
      if (currentPos) {
        setCurrentPosition(currentPos);
        
        // Update plane rotation based on direction
        if (nextPos) {
          const angle = calculateRotation(currentPos, nextPos);
          setRotation(angle);
        }
      }

      // Check if we've reached the end of the current segment
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        // Move to next airport in path
        const nextAirportIndex = currentIndex + 1;
        if (nextAirportIndex < path.length - 1) {
          const start = getAirportPosition(path[nextAirportIndex]);
          const end = getAirportPosition(path[nextAirportIndex + 1]);
          if (start && end) {
            const newPath = generateFlightPath(start, end);
            setFlightPath(newPath);
            setCurrentIndex(nextAirportIndex);
            // Restart animation for next segment
            setTimeout(() => {
              setCurrentPosition(newPath[0]);
              setIsPlaying(true);
            }, 300); // Small delay before starting next segment
          }
        } else {
          // Reached the end of the path
          setIsPlaying(false);
          if (onComplete) onComplete();
        }
      }
    };

    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isPlaying, flightPath, path, currentIndex, speed, onComplete, getAirportPosition, generateFlightPath]);

  // Generate SVG path for the flight trail
  const getFlightPathD = useCallback(() => {
    if (flightPath.length < 2) return '';
    
    const start = flightPath[0];
    let d = `M ${start.x} ${start.y}`;
    
    for (let i = 1; i < flightPath.length; i++) {
      const point = flightPath[i];
      d += ` L ${point.x} ${point.y}`;
    }
    
    return d;
  }, [flightPath]);

  // Memoize airport positions to prevent unnecessary recalculations
  const airportPositions = useMemo(() => {
    return path.map(airportId => getAirportPosition(airportId)).filter(Boolean);
  }, [path, getAirportPosition]);

  if (!currentPosition) return null;
  
  // Add keyframes for subtle pulse animation
  const pulseKeyframes = `
    @keyframes subtlePulse {
      0% { transform: scale(1); opacity: 0.9; }
      50% { transform: scale(1.1); opacity: 1; }
      100% { transform: scale(1); opacity: 0.9; }
    }
    
    @keyframes subtlePulseShadow {
      0% { box-shadow: 0 0 10px rgba(74, 222, 128, 0.5); }
      50% { box-shadow: 0 0 15px rgba(74, 222, 128, 0.7); }
      100% { box-shadow: 0 0 10px rgba(74, 222, 128, 0.5); }
    }
  `;

  // Inline styles for better performance and to avoid CSS conflicts
  const containerStyles = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 5, // Ensure it's above the grid but below tooltips/controls
    ...style
  };

  return (
    <div style={containerStyles}>
      {/* SVG Definitions */}
      <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
        <defs>
          <linearGradient id="flightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.2" />
          </linearGradient>
        </defs>
      </svg>

      {/* Flight Path */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        <path
          d={getFlightPathD()}
          style={styles.flightPath}
        />
      </svg>

      {/* Airport Markers */}
      <AnimatePresence>
        {airportPositions.map((pos, index) => (
          <motion.div
            key={`${pos.id}-${index}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            style={{
              ...styles.airportMarker,
              left: `${pos.x}px`,
              top: `${pos.y}px`,
            }}
          >
            <div style={styles.marker} />
            <div style={styles.label}>{pos.name || pos.code}</div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Animated Plane */}
      <motion.div
        initial={false}
        animate={{
          x: currentPosition.x,
          y: currentPosition.y,
          rotate: rotation,
        }}
        transition={{
          type: 'spring',
          damping: 20,
          stiffness: 100,
        }}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          zIndex: 1000,
          pointerEvents: 'none',
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={styles.planeIcon}
        >
          <FaPlane style={styles.plane} />
          <div style={styles.glow} />
          <motion.div 
            style={styles.trail}
            animate={{
              scale: [0, 1.5],
              opacity: [1, 0],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'easeOut'
            }}
          />
        </motion.div>
      </motion.div>

      {/* Add keyframes for pulse animation */}
      <style>{pulseKeyframes}</style>
      
      {/* Progress Indicator */}
      <div style={styles.progressIndicator}>
        {currentIndex + 1} of {path.length} segments
      </div>
    </div>
  );
};

export default PlaneAnimation;
