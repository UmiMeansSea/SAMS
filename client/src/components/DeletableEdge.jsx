import { useContext } from 'react';
import {
  BaseEdge,
  getStraightPath,
  useReactFlow,
} from '@xyflow/react';
import axios from 'axios';
import { HoverContext } from '../App';

const API_URL = 'http://localhost:5005/api';

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
    // Add default values for stability
    sourceX: sourceX || 0,
    sourceY: sourceY || 0,
    targetX: targetX || 0,
    targetY: targetY || 0,
  });

  return (
    <>
      {/* Invisible interaction path (hit area) */}
      <path
        id={id + '-hit'}
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={50}
        className="react-flow__edge-interaction"
        style={{ cursor: 'pointer', pointerEvents: 'all' }}
      />
      {/* Visual Path (Dotted Blue/Red Line) */}
      <BaseEdge 
        id={id}
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{ 
          ...style, 
          strokeWidth: isHovered ? 4 : (style.strokeWidth || 3), 
          stroke: isHovered ? '#ff4d4d' : (style.stroke || '#3b82f6'),
          strokeDasharray: '6,4',
          transition: 'stroke 0.3s ease, stroke-width 0.3s ease',
          pointerEvents: 'none' // Clicks go through to the hit area above
        }} 
      />
    </>
  );
}
