import { useState } from 'react';
import { ChevronRight, ChevronDown, ListTree, GripVertical } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:5005/api';

// Recursive component for hierarchy nodes
// Recursive component for hierarchy nodes
const HierarchyNode = ({ person, allPeople, depth = 0, visited = new Set() }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isOver, setIsOver] = useState(false);

  const personId = person._id || person.id;
  
  // Cycle protection
  if (visited.has(personId) || depth > 20) {
    return null;
  }
  
  const newVisited = new Set(visited);
  newVisited.add(personId);

  // Find direct reports
  const reports = allPeople.filter(p => p.managers && p.managers.includes(personId));
  const hasReports = reports.length > 0;

  const handleDragStart = (e) => {
    const id = personId;
    e.dataTransfer.setData('reorderPersonId', id);
    e.dataTransfer.setData('text/plain', id); // Fallback
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation(); 
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(true);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
    
    let draggedId = e.dataTransfer.getData('reorderPersonId') || e.dataTransfer.getData('text/plain');
    
    if (!draggedId) {
      const personDataStr = e.dataTransfer.getData('personData');
      if (personDataStr) {
        try {
          const personData = JSON.parse(personDataStr);
          draggedId = personData._id || personData.id;
        } catch (err) {
          console.error('Failed to parse personData from drag:', err);
        }
      }
    }

    const targetId = personId;

    if (!draggedId || draggedId === targetId) {
      return;
    }

    try {
      await axios.patch(`${API_URL}/people/${draggedId}`, {
        managers: [targetId] 
      });
      window.dispatchEvent(new CustomEvent('refreshData'));
    } catch (err) {
      console.error('Failed to reparent person:', err.response?.data || err.message);
    }
  };

  return (
    <div className="w-full">
      <div 
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex items-center gap-2 py-2 px-3 hover:bg-slate-700/50 cursor-pointer rounded-md transition-all group ${depth === 0 ? 'mt-1' : ''} ${isOver ? 'bg-accent-500/20 border-2 border-accent-500/50' : 'border-2 border-transparent'}`}
        style={{ paddingLeft: `${(depth * 16) + 8}px` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="text-slate-600 group-hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
          <GripVertical size={14} />
        </div>
        <div className="w-4 h-4 flex items-center justify-center text-slate-400">
          {hasReports ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="w-1 h-1 rounded-full bg-slate-600"></span>}
        </div>
        <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
          {person.pfpUrl ? <img src={person.pfpUrl} alt={person.name} className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-slate-300">{person.name.charAt(0)}</span>}
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-sm text-slate-200 truncate">{person.name}</p>
        </div>
      </div>

      {isExpanded && hasReports && (
        <div className="w-full">
          {reports.map(report => (
            <HierarchyNode 
              key={report._id || report.id} 
              person={report} 
              allPeople={allPeople} 
              depth={depth + 1} 
              visited={newVisited}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function RightSidebar({ people }) {
  // Find root nodes (people with no managers)
  const rootPeople = people.filter(p => !p.managers || p.managers.length === 0);

  const handleDropOnRoot = async (e) => {
    e.preventDefault();
    let draggedId = e.dataTransfer.getData('reorderPersonId') || e.dataTransfer.getData('text/plain');
    
    if (!draggedId) {
      const personDataStr = e.dataTransfer.getData('personData');
      if (personDataStr) {
        try {
          const personData = JSON.parse(personDataStr);
          draggedId = personData._id || personData.id;
        } catch (err) {
          console.error('Failed to parse personData on root drop:', err);
        }
      }
    }

    if (!draggedId) return;

    try {
      // Make person a root node (remove all managers)
      await axios.patch(`${API_URL}/people/${draggedId}`, {
        managers: []
      });
      window.dispatchEvent(new CustomEvent('refreshData'));
    } catch (err) {
      console.error('Failed to make person root:', err.response?.data || err.message);
    }
  };

  return (
    <div className="w-72 h-full bg-slate-800/90 backdrop-blur-md border-l border-slate-700 flex flex-col z-20 shadow-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-700 flex items-center gap-2">
        <ListTree className="text-accent-500" size={20} />
        <h2 className="text-lg font-bold text-white">Hierarchy</h2>
      </div>

      <div 
        className="flex-1 overflow-y-auto p-2"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropOnRoot}
      >
        {rootPeople.length === 0 ? (
          <p className="text-sm text-slate-500 text-center mt-10">No hierarchy defined.</p>
        ) : (
          rootPeople.map(root => (
            <HierarchyNode key={root._id || root.id} person={root} allPeople={people} />
          ))
        )}
      </div>
      
      <div className="p-4 border-t border-slate-700 text-[10px] text-slate-500 text-center leading-relaxed">
        Drag rows onto each other to re-parent.<br />
        Drag to empty space to make a Root node.
      </div>
    </div>
  );
}
