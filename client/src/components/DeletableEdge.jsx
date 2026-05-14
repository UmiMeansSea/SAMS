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
  const [snappedPos, setSnappedPos] = useState({ x: 0, y: 0 });
  
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  // Math to snap a point to the closest point on the straight line segment
  const getClosestPointOnLine = (px, py, x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) return { x: x1, y: y1 };
    
    // Projection of point P onto line AB: t = (AP . AB) / |AB|^2
    const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    const clampedT = Math.max(0, Math.min(1, t));
    
    return {
      x: x1 + clampedT * dx,
      y: y1 + clampedT * dy,
    };
  };

  const onMouseMove = (e) => {
    const container = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    const px = e.clientX - container.left;
    const py = e.clientY - container.top;
    
    const snapped = getClosestPointOnLine(px, py, sourceX, sourceY, targetX, targetY);
    setSnappedPos(snapped);
  };

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
      {/* Interaction Path (Thick & Transparent for 20px hit area) */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={30} // Large hit area for easy selection
        onMouseEnter={() => setIsHovered(true)}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onEdgeDelete}
        style={{ cursor: 'pointer' }}
      />
      
      {/* Visual Path (Dotted Blue Line) */}
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{ 
          ...style, 
          strokeWidth: isHovered ? 4 : 2, 
          stroke: isHovered ? '#ff4d4d' : (style.stroke || '#3b82f6'),
          strokeDasharray: '6,4', // Dotted/Dashed appearance
          transition: 'stroke 0.2s ease, stroke-width 0.2s ease'
        }} 
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            // Snaps exactly to the line segment
            transform: `translate(-50%, -50%) translate(${isHovered ? snappedPos.x : labelX}px,${isHovered ? snappedPos.y : labelY}px)`,
            pointerEvents: isHovered ? 'all' : 'none',
            zIndex: 1000,
          }}
          className="nodrag nopan"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {isHovered && (
            <button
              className="flex items-center justify-center w-7 h-7 bg-red-500 border-2 border-white rounded-full text-white shadow-2xl animate-in zoom-in duration-150 hover:scale-110 active:scale-95 transition-transform"
              onClick={onEdgeDelete}
              title="Delete Connection"
            >
              <X size={16} strokeWidth={3} />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
