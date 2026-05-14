import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, ListTree, GripVertical, X, PanelRightClose, PanelRightOpen } from 'lucide-react';
import axios from 'axios';
import UserProfileCard from './UserProfileCard';

const API_URL = 'http://localhost:5005/api';

// Recursive component for hierarchy nodes
const HierarchyNode = ({ person, allPeople, depth = 0, visited = new Set(), onOpenProfile }) => {
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

  const handleRemoveFromProject = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Remove ${person.name} from project? (Record stays in database)`)) return;
    
    try {
      await axios.patch(`${API_URL}/people/${personId}`, {
        project: '',
        managers: [],
        position: { x: 0, y: 0 }
      });
      window.dispatchEvent(new CustomEvent('refreshData'));
    } catch (err) {
      console.error('Failed to remove from project:', err);
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
        className={`flex items-center gap-2 py-2 px-3 hover:bg-slate-700/50 rounded-md transition-all group relative ${depth === 0 ? 'mt-1' : ''} ${isOver ? 'bg-accent-500/20 border-2 border-accent-500/50' : 'border-2 border-transparent'}`}
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
        {/* Clickable name — opens profile card */}
        <div
          className="flex-1 overflow-hidden"
          onClick={(e) => { e.stopPropagation(); onOpenProfile?.(person); }}
          title="View profile"
        >
          <p className="text-sm text-slate-200 truncate hover:text-accent-400 transition-colors cursor-pointer">{person.name}</p>
        </div>
        <button
          onClick={handleRemoveFromProject}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-md transition-all"
          title="Remove from project"
        >
          <X size={14} />
        </button>
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
              onOpenProfile={onOpenProfile}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function RightSidebar({ people }) {
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsCollapsed(true);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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
    <>
      {/* Mobile backdrop */}
      {isMobile && !isCollapsed && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Mobile floating open button */}
      {isMobile && isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="fixed top-4 right-2 z-50 p-2.5 bg-slate-800/90 backdrop-blur-md border border-slate-700 rounded-xl text-accent-400 shadow-xl active:scale-95 transition-transform"
          title="Open Hierarchy"
        >
          <ListTree size={18} />
        </button>
      )}

      <div
        className={[
          'bg-slate-800/90 backdrop-blur-md border-l border-slate-700 flex flex-col shadow-2xl transition-all duration-300 group overflow-hidden',
          isMobile
            ? `fixed top-0 right-0 h-full z-[60] ${isCollapsed ? 'w-0' : 'w-[85vw] max-w-xs'}`
            : `relative h-full z-20 ${isCollapsed ? 'w-14' : 'w-72'}`,
        ].join(' ')}
      >
        {/* Desktop rail (collapsed) */}
        {!isMobile && isCollapsed && (
          <div className="flex flex-col items-center py-4 gap-4 h-full">
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-3 bg-accent-500/10 text-accent-400 hover:bg-accent-500/20 rounded-xl transition-all mb-4 shadow-lg shadow-accent-500/10"
              title="Expand Sidebar"
            >
              <ListTree size={20} />
            </button>
          </div>
        )}

        <div className={`flex flex-col h-full ${isMobile ? 'w-full' : 'w-72'} transition-all duration-300 ${(!isMobile && isCollapsed) ? 'opacity-0 pointer-events-none translate-x-5' : 'opacity-100 translate-x-0'}`}>
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <button
            onClick={() => setIsCollapsed(true)}
            className="flex items-center gap-2 hover:bg-slate-700 p-1.5 -ml-1.5 rounded-lg transition-all"
            title="Collapse Sidebar"
          >
            <ListTree className="text-accent-500" size={20} />
            <h2 className="text-lg font-bold text-white">Hierarchy</h2>
          </button>
          {/* Mobile close button */}
          {isMobile && (
            <button onClick={() => setIsCollapsed(true)} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-all">
              <X size={18} />
            </button>
          )}
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
              <HierarchyNode
                key={root._id || root.id}
                person={root}
                allPeople={people}
                onOpenProfile={setSelectedPerson}
              />
            ))
          )}
        </div>

        {selectedPerson && (
          <UserProfileCard
            mode="view"
            person={selectedPerson}
            onClose={() => setSelectedPerson(null)}
            onRefresh={() => {
              window.dispatchEvent(new CustomEvent('refreshData'));
              setSelectedPerson(null);
            }}
          />
        )}
        </div>
      </div>
    </>
  );
}
