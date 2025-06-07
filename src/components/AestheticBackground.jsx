// src/components/AestheticBackground.js

import React, { useMemo } from 'react';
import '../styles/AestheticBackground.css'; // Adjust path if needed

const AestheticBackground = ({ particleCount = 50 }) => { // Reduced count for bigger particles
  const particles = useMemo(() => {
    const particleArray = [];
    // Define the two colors you want to use
    const colors = [
      'rgba(0, 255, 255, 0.2)', // Cyan with 20% opacity
      'rgba(192, 132, 252, 0.2)'  // Purple with 20% opacity
    ];

    for (let i = 0; i < particleCount; i++) {
      // Generate a larger size, e.g., between 3px and 10px
      const size = Math.random() * 7 + 3; 
      // Pick a random color from the array
      const color = colors[Math.floor(Math.random() * colors.length)];

      const style = {
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100 + 50}%`,
        width: `${size}px`,
        height: `${size}px`,
        // Set the background color dynamically
        backgroundColor: color, 
        animationDuration: `${Math.random() * 30 + 20}s`,
        animationDelay: `-${Math.random() * 40}s`,
      };
      particleArray.push(<div key={i} className="particle" style={style} />);
    }
    return particleArray;
  }, [particleCount]);

  return <div className="particles-container">{particles}</div>;
};

export { AestheticBackground };