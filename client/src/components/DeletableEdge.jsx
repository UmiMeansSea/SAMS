import { useContext } from 'react';
import {
  BaseEdge,
  getStraightPath,
  useReactFlow,
} from '@xyflow/react';
import axios from 'axios';
import { HoverContext } from '../App';

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
  const hoveredEdgeId = useContext(HoverContext);
  const isHovered = hoveredEdgeId === id;
  
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
      {/* Visual Path (Dotted Blue/Red Line) */}
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{ 
          ...style, 
          cursor: 'pointer',
          strokeWidth: isHovered ? 4 : 2, 
          stroke: isHovered ? '#ff4d4d' : (style.stroke || '#3b82f6'),
          strokeDasharray: '6,4',
          transition: 'stroke 0.2s ease, stroke-width 0.2s ease',
          pointerEvents: 'all' // Enable click on the edge itself
        }} 
        onClick={onEdgeDelete}
      />
    </>
  );
}
