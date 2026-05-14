import { useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  useReactFlow,
} from '@xyflow/react';
import { X, Trash2 } from 'lucide-react';
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

  return (
    <>
      {/* Interaction Path (Thick & Transparent for 50px hit area) */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={50}
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
