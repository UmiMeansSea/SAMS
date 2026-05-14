import { useState } from 'react';
import {
  BaseEdge,
  getStraightPath,
  useReactFlow,
  useStore,
} from '@xyflow/react';
import axios from 'axios';

export default function DeletableEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerEnd,
}) {
  const { setEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  
  // Get current zoom level to keep the interaction area consistent on screen
  const zoom = useStore((s) => s.transform[2]);
  
  const [edgePath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const onEdgeDelete = async (e) => {
    if (e) e.stopPropagation();
    try {
      setEdges((edges) => edges.filter((edge) => edge.id !== id));
      await axios.patch(`http://localhost:5005/api/people/${target}`, {
        $pull: { managers: source }
      });
      window.dispatchEvent(new CustomEvent('refreshData'));
    } catch (err) {
      console.error('Failed to delete edge:', err);
    }
  };

  // Calculate uniform hit area (e.g. 40 pixels on screen regardless of zoom)
  const interactionWidth = 40 / zoom;

  return (
    <>
      {/* Interaction Path (Thick & Transparent) */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={interactionWidth}
        strokeLinecap="round" // Ensures uniform distance even at the ends
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onEdgeDelete}
        style={{ cursor: 'pointer' }}
      />
      
      {/* Visual Path (Dotted Blue/Red Line) */}
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{ 
          ...style, 
          strokeWidth: isHovered ? 4 : 2, 
          stroke: isHovered ? '#ff4d4d' : (style.stroke || '#3b82f6'),
          strokeDasharray: '6,4',
          transition: 'stroke 0.2s ease, stroke-width 0.2s ease'
        }} 
      />
    </>
  );
}
