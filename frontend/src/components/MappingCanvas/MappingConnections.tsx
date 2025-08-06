import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { MappingConnection } from '../../types';

interface MappingConnectionsProps {
  mappings: MappingConnection[];
  containerRef: React.RefObject<HTMLElement>;
}

interface ConnectionLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isHovered: boolean;
}

const MappingConnections: React.FC<MappingConnectionsProps> = ({ mappings, containerRef }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [connections, setConnections] = useState<ConnectionLine[]>([]);
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);

  const updateConnections = () => {
    if (!containerRef.current || !svgRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const newConnections: ConnectionLine[] = [];

    mappings.forEach((mapping) => {
      // Find source element (draggable field)
      const sourceElement = container.querySelector(`[data-field-id="${mapping.sourceField.id}"]`);
      // Find target element (droppable area)
      const targetElement = container.querySelector(`[data-droppable-id="${mapping.targetPath}"]`);

      if (sourceElement && targetElement) {
        const sourceRect = sourceElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();

        // Calculate relative positions within the container
        const x1 = sourceRect.right - containerRect.left;
        const y1 = sourceRect.top + sourceRect.height / 2 - containerRect.top;
        const x2 = targetRect.left - containerRect.left;
        const y2 = targetRect.top + targetRect.height / 2 - containerRect.top;

        newConnections.push({
          id: mapping.id,
          x1,
          y1,
          x2,
          y2,
          isHovered: hoveredConnection === mapping.id
        });
      }
    });

    setConnections(newConnections);
  };

  useEffect(() => {
    updateConnections();
    
    // Update connections on window resize
    const handleResize = () => updateConnections();
    window.addEventListener('resize', handleResize);
    
    // Update connections when mappings change
    const observer = new MutationObserver(updateConnections);
    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true
      });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [mappings, containerRef, hoveredConnection]);

  const createCurvedPath = (x1: number, y1: number, x2: number, y2: number): string => {
    const midX = (x1 + x2) / 2;
    const controlPoint1X = x1 + (midX - x1) * 0.5;
    const controlPoint2X = x2 - (x2 - midX) * 0.5;
    
    return `M ${x1} ${y1} C ${controlPoint1X} ${y1}, ${controlPoint2X} ${y2}, ${x2} ${y2}`;
  };

  if (!containerRef.current) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1
      }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#1976d2"
            />
          </marker>
          <marker
            id="arrowhead-hover"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#ff5722"
            />
          </marker>
        </defs>
        
        {connections.map((connection) => (
          <g key={connection.id}>
            {/* Shadow/glow effect for hovered connections */}
            {connection.isHovered && (
              <path
                d={createCurvedPath(connection.x1, connection.y1, connection.x2, connection.y2)}
                stroke="#ff5722"
                strokeWidth="6"
                fill="none"
                opacity="0.3"
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              />
            )}
            
            {/* Main connection line */}
            <path
              d={createCurvedPath(connection.x1, connection.y1, connection.x2, connection.y2)}
              stroke={connection.isHovered ? "#ff5722" : "#1976d2"}
              strokeWidth={connection.isHovered ? "3" : "2"}
              fill="none"
              markerEnd={connection.isHovered ? "url(#arrowhead-hover)" : "url(#arrowhead)"}
              style={{ 
                pointerEvents: 'auto', 
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={() => setHoveredConnection(connection.id)}
              onMouseLeave={() => setHoveredConnection(null)}
            />
            
            {/* Connection points */}
            <circle
              cx={connection.x1}
              cy={connection.y1}
              r={connection.isHovered ? "6" : "4"}
              fill={connection.isHovered ? "#ff5722" : "#1976d2"}
              style={{ 
                pointerEvents: 'auto',
                transition: 'all 0.2s ease'
              }}
            />
            <circle
              cx={connection.x2}
              cy={connection.y2}
              r={connection.isHovered ? "6" : "4"}
              fill={connection.isHovered ? "#ff5722" : "#1976d2"}
              style={{ 
                pointerEvents: 'auto',
                transition: 'all 0.2s ease'
              }}
            />
          </g>
        ))}
      </svg>
    </Box>
  );
};

export default MappingConnections;
