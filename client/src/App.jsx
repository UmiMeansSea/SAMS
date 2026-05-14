import { useCallback, useState, useEffect } from 'react';
import axios from 'axios';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  useReactFlow,
  useStore,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import PersonNode from './components/PersonNode';
import ProjectModal from './components/ProjectModal';
import DeletableEdge from './components/DeletableEdge';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';

import { createContext, useContext } from 'react';

export const HoverContext = createContext(null);

const nodeTypes = {
  person: PersonNode,
};

const edgeTypes = {
  deletable: DeletableEdge,
};

const API_URL = 'http://localhost:5005/api';

function Flow() {
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rawPeople, setRawPeople] = useState([]); // Store raw data for Sidebars
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);

  // Switching project clears canvas instantly before re-fetching
  const handleSwitchProject = (proj) => {
    setNodes([]);
    setEdges([]);
    setCurrentProject(proj);
  };

  const handleUpdateProject = async (name, description) => {
    try {
      const res = await axios.patch(`${API_URL}/projects/${currentProject._id}`, { name, description });
      setCurrentProject(res.data);
      setProjects(prev => prev.map(p => p._id === res.data._id ? res.data : p));
      setIsEditProjectModalOpen(false);
      fetchData(); // Sync everything
    } catch (err) {
      console.error('Failed to update project:', err);
      alert('Failed to update project.');
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/people`);
      const allPeople = res.data;
      setRawPeople(allPeople);

      // Filter for canvas: show people in the current project,
      // OR people with no projectId at all (legacy/unassigned)
      const activeProjectId = currentProject?._id;
      
      const projectPeople = activeProjectId
        ? allPeople.filter(p =>
            p.projectId === activeProjectId ||
            p.projectId === String(activeProjectId) ||
            (p.projectIds && p.projectIds.some(pid => (pid._id || pid) === activeProjectId || pid === String(activeProjectId))) ||
            (!p.projectId && (p.project === 'OrgMap' || (p.position && (p.position.x !== 0 || p.position.y !== 0))))
          )
        : allPeople; // No project selected → show everyone

      const fetchedNodes = projectPeople.map(p => ({
        id: p._id,
        type: 'person',
        position: p.position || { x: Math.random() * 600, y: Math.random() * 400 },
        data: { 
          id: p._id, 
          name: p.name, 
          role: p.role, 
          projectNames: p.projectIds?.map(pid => pid.name).filter(Boolean).join(', '), 
          pfpUrl: p.pfpUrl, 
          bio: p.bio 
        },
      }));

      const fetchedEdges = [];
      const projectPeopleIds = new Set(projectPeople.map(p => p._id));

      projectPeople.forEach(p => {
        if (p.managers && p.managers.length > 0) {
          p.managers.forEach(managerId => {
            if (projectPeopleIds.has(managerId)) {
              fetchedEdges.push({
                id: `e${managerId}-${p._id}`,
                source: managerId,
                target: p._id,
                type: 'deletable',
                style: { stroke: '#1B98E0', strokeWidth: 3 },
                animated: true,
              });
            }
          });
        }
      });

      setNodes(fetchedNodes);
      setEdges(fetchedEdges);
    } catch (err) {
      console.error('Error fetching people:', err);
    }
  }, [currentProject, setNodes, setEdges]);

  // Handle Save
  const handleSave = async () => {
    if (!currentProject) return;
    setIsSaving(true);
    try {
      await axios.put(`${API_URL}/projects/${currentProject._id}/save`);
      // Update local projects list to refresh timestamps
      const projRes = await axios.get(`${API_URL}/projects`);
      setProjects(projRes.data);
      alert('Project saved successfully!');
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Initialize projects (best-effort) and then fetch people
  useEffect(() => {
    const init = async () => {
      try {
        const res = await axios.get(`${API_URL}/projects`);
        let activeProject = null;
        if (res.data.length === 0) {
          const first = await axios.post(`${API_URL}/projects`, { name: 'Default Project' });
          activeProject = first.data;
          setProjects([activeProject]);
        } else {
          setProjects(res.data);
          activeProject = res.data[0];
        }
        setCurrentProject(activeProject);
      } catch (err) {
        // Projects API not available yet — still show people without project filter
        console.warn('Projects API unavailable, showing all people:', err.message);
        fetchData(); // Fetch people anyway
      }
    };
    init();
  }, []); // eslint-disable-line

  // Re-fetch people whenever currentProject changes
  useEffect(() => {
    fetchData();
    window.addEventListener('refreshData', fetchData);
    return () => window.removeEventListener('refreshData', fetchData);
  }, [currentProject]); // eslint-disable-line

  // Connect manually (e.g. dragging edge from handle to handle)
  const onConnect = useCallback(
    async (params) => {
      setEdges((eds) => addEdge({ ...params, type: 'deletable', style: { stroke: '#1B98E0', strokeWidth: 2 } }, eds));
      try {
        await axios.patch(`${API_URL}/people/${params.target}`, {
          $addToSet: { managers: params.source }
        });
        fetchData(); // Sync sidebars
      } catch (err) {
        console.error('Error saving connection:', err);
      }
    },
    [setEdges, fetchData],
  );

  const [magnetTarget, setMagnetTarget] = useState(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState(null);

  const onEdgeClick = useCallback(async (event, edge) => {
    if (edge.type !== 'deletable') return;
    
    // Check if it's the "hovered" one to match the red highlight visual feedback
    if (edge.id !== hoveredEdgeId) return;

    try {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      await axios.patch(`${API_URL}/people/${edge.target}`, {
        $pull: { managers: edge.source }
      });
      fetchData(); // Sync sidebars
    } catch (err) {
      console.error('Error deleting edge:', err);
    }
  }, [setEdges, fetchData, hoveredEdgeId]);

  // Math for predictive hover (Point-to-Line-Segment distance)
  const getDistanceToEdge = (px, py, x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    const clampedT = Math.max(0, Math.min(1, t));
    const closestX = x1 + clampedT * dx;
    const closestY = y1 + clampedT * dy;
    return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
  };

  const onPointerMove = useCallback((event) => {
    const { x, y } = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    
    let closestId = null;
    let minDistance = 40; // Threshold in flow units (approx 20-40px depending on zoom)

    // Optimization: create a lookup map for nodes
    const nodeMap = new Map(nodes.map(n => [n.id, n.position]));

    edges.forEach((edge) => {
      const srcPos = nodeMap.get(edge.source);
      const tarPos = nodeMap.get(edge.target);

      if (srcPos && tarPos) {
        // Using center of nodes (PersonNode is 120x80 approx)
        const x1 = srcPos.x + 60;
        const y1 = srcPos.y + 40;
        const x2 = tarPos.x + 60;
        const y2 = tarPos.y + 40;

        const dist = getDistanceToEdge(x, y, x1, y1, x2, y2);
        if (dist < minDistance) {
          minDistance = dist;
          closestId = edge.id;
        }
      }
    });

    if (closestId !== hoveredEdgeId) {
      setHoveredEdgeId(closestId);
    }
  }, [nodes, edges, screenToFlowPosition, hoveredEdgeId]);

  // Auto-Magnet logic during drag
  const onNodeDrag = useCallback(
    (event, node) => {
      const SNAP_DISTANCE_X = 180;
      const SNAP_DISTANCE_Y = 220;

      setNodes((nds) => {
        const potentialParent = nds.find((n) => {
          if (n.id === node.id) return false;
          const dx = Math.abs(n.position.x - node.position.x);
          const dy = node.position.y - n.position.y;
          return dx < SNAP_DISTANCE_X && dy > 40 && dy < SNAP_DISTANCE_Y;
        });

        if (potentialParent) {
          if (magnetTarget?.id !== potentialParent.id) {
            setMagnetTarget(potentialParent);
            return nds.map((n) => ({
              ...n,
              data: { ...n.data, isMagnetized: n.id === potentialParent.id },
            }));
          }
        } else if (magnetTarget) {
          setMagnetTarget(null);
          return nds.map((n) => ({
            ...n,
            data: { ...n.data, isMagnetized: false },
          }));
        }
        return nds;
      });
    },
    [magnetTarget, setNodes]
  );

  // Auto-Locking Logic + Backend Sync
  const onNodeDragStop = useCallback(
    async (event, node) => {
      // Clear magnet highlights
      setMagnetTarget(null);
      setNodes((nds) => nds.map(n => ({ ...n, data: { ...n.data, isMagnetized: false } })));

      const SNAP_DISTANCE_X = 180;
      const SNAP_DISTANCE_Y = 220;
      
      const potentialParent = nodes.find((n) => {
        if (n.id === node.id) return false;
        const dx = Math.abs(n.position.x - node.position.x);
        const dy = node.position.y - n.position.y;
        return dx < SNAP_DISTANCE_X && dy > 40 && dy < SNAP_DISTANCE_Y;
      });

      let newX = node.position.x;
      let newY = node.position.y;
      let newManagerId = null;

      if (potentialParent) {
        const edgeExists = edges.some(
          (e) => e.source === potentialParent.id && e.target === node.id
        );
        
        // Snap to parent
        newX = potentialParent.position.x;
        newY = potentialParent.position.y + 160;

        if (!edgeExists) {
          setEdges((eds) => [
            ...eds,
            {
              id: `e${potentialParent.id}-${node.id}`,
              source: potentialParent.id,
              target: node.id,
              type: 'deletable',
              style: { stroke: '#1B98E0', strokeWidth: 3, strokeDasharray: '5,5' },
              animated: true
            },
          ]);
          newManagerId = potentialParent.id;
        }
        
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === node.id) {
              return { ...n, position: { x: newX, y: newY } };
            }
            return n;
          })
        );
      }

      try {
        const updatePayload = { position: { x: newX, y: newY } };
        if (newManagerId) {
          updatePayload.$addToSet = { managers: newManagerId };
        }
        await axios.patch(`${API_URL}/people/${node.id}`, updatePayload);
        fetchData(); // Sync sidebars
      } catch (err) {
        console.error('Error syncing node drag:', err);
      }
    },
    [nodes, edges, setEdges, setNodes, fetchData]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const autoAlign = useCallback(async () => {
    if (rawPeople.length === 0) return;

    const HORIZONTAL_GAP = 300;
    const VERTICAL_GAP = 250;
    const UNCONNECTED_Y_START = 1000;
    
    // 1. Identify roots and build map
    const roots = rawPeople.filter(p => !p.managers || p.managers.length === 0);
    const peopleById = {};
    rawPeople.forEach(p => {
      peopleById[p._id || p.id] = { ...p, children: [] };
    });
    
    rawPeople.forEach(p => {
      if (p.managers && p.managers.length > 0) {
        p.managers.forEach(mId => {
          if (peopleById[mId]) {
            peopleById[mId].children.push(p._id || p.id);
          }
        });
      }
    });

    const newPositions = {};
    let currentX = 0;

    // 2. Recursive function to position tree
    const positionNode = (nodeId, depth, xOffset) => {
      const node = peopleById[nodeId];
      if (!node || newPositions[nodeId]) return 0;

      const children = node.children;
      let width = 0;

      if (children.length === 0) {
        width = HORIZONTAL_GAP;
        newPositions[nodeId] = { x: xOffset, y: depth * VERTICAL_GAP };
      } else {
        let childX = xOffset;
        children.forEach(childId => {
          width += positionNode(childId, depth + 1, childX);
          childX = xOffset + width;
        });
        
        // Parent is centered above children
        const firstChildX = newPositions[children[0]].x;
        const lastChildX = newPositions[children[children.length - 1]].x;
        newPositions[nodeId] = { x: (firstChildX + lastChildX) / 2, y: depth * VERTICAL_GAP };
      }
      return width;
    };

    // Position roots
    roots.forEach(root => {
      currentX += positionNode(root._id || root.id, 0, currentX);
    });

    // 3. Position unconnected nodes (that weren't reached by roots)
    let unconnectedX = 0;
    let unconnectedY = UNCONNECTED_Y_START;
    const maxNodesPerRow = 5;
    let count = 0;

    rawPeople.forEach(p => {
      const id = p._id || p.id;
      if (!newPositions[id]) {
        newPositions[id] = { 
          x: unconnectedX * HORIZONTAL_GAP, 
          y: unconnectedY + (Math.floor(count / maxNodesPerRow) * VERTICAL_GAP) 
        };
        unconnectedX = (unconnectedX + 1) % maxNodesPerRow;
        count++;
      }
    });

    // 4. Update backend in batches or sequentially
    try {
      // For simplicity and to avoid creating a new route, we patch them one by one
      // In a real app, we'd use a bulk update route
      await Promise.all(
        Object.entries(newPositions).map(([id, pos]) => 
          axios.patch(`${API_URL}/people/${id}`, { position: pos })
        )
      );
      
      fetchData();
      setTimeout(() => fitView({ duration: 800 }), 100);
    } catch (err) {
      console.error('Auto-align failed:', err);
    }
  }, [rawPeople, fetchData, fitView]);

  const onDrop = useCallback(
    async (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const personDataStr = event.dataTransfer.getData('personData');

      if (typeof type === 'undefined' || !type || !personDataStr) {
        return;
      }

      const personData = JSON.parse(personDataStr);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      try {
        await axios.patch(`${API_URL}/people/${personData._id || personData.id}`, {
          projectId: currentProject?._id,
          position: { x: position.x - 40, y: position.y - 40 } // Center the node slightly
        });
        fetchData();
      } catch (err) {
        console.error('Error dropping person onto canvas:', err);
      }
    },
    [fetchData, screenToFlowPosition]
  );

  return (
    <div className="w-screen h-screen flex bg-navy-900 overflow-hidden font-sans">
      <LeftSidebar 
        people={rawPeople} 
        refreshData={fetchData} 
        projects={projects}
        currentProject={currentProject}
        onSwitchProject={handleSwitchProject}
        onSaveProject={handleSave}
      />
      <HoverContext.Provider value={hoveredEdgeId}>
        <div className="flex-1 h-full w-0 min-w-0 relative" onPointerMove={onPointerMove}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgeClick={onEdgeClick}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            className="bg-navy-900"
            defaultEdgeOptions={{ 
              type: 'deletable',
              style: { stroke: '#1B98E0', strokeWidth: 3 },
              animated: true
            }}
          >
            <Background color="#1c2b3c" gap={24} size={2} />
            <Controls className="!bg-slate-800 !border-slate-700 !text-slate-300" />
          </ReactFlow>
          {/* Responsive Title and Controls overlay */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 sm:left-4 sm:translate-x-0 z-10 flex items-center gap-2 sm:gap-4 pointer-events-none">
            <div 
              className="pointer-events-auto bg-slate-800/80 backdrop-blur-md border border-slate-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl flex items-center gap-2 shadow-2xl max-w-[40vw] sm:max-w-none cursor-pointer hover:bg-slate-700 transition-all group"
              onClick={() => setIsEditProjectModalOpen(true)}
              title="Click to edit project details"
            >
              <div className="w-2 h-2 rounded-full bg-accent-500 animate-pulse flex-shrink-0" />
              <h1 className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase truncate group-hover:text-accent-300">
                {currentProject?.name || 'OrgMap'}
              </h1>
            </div>
            <button 
              onClick={autoAlign}
              className="pointer-events-auto flex items-center gap-1.5 bg-slate-800/80 backdrop-blur-md hover:bg-slate-700 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl shadow-lg transition-all text-xs sm:text-sm font-semibold border border-slate-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/></svg>
              <span className="hidden xs:inline sm:inline">Auto Align</span>
            </button>
          </div>
        </div>
      </HoverContext.Provider>
      <RightSidebar 
        people={rawPeople.filter(p => 
          !currentProject?._id || 
          p.projectId === currentProject._id || 
          p.projectId === String(currentProject._id) ||
          (p.projectIds && p.projectIds.some(pid => (pid._id || pid) === currentProject._id || pid === String(currentProject._id))) ||
          (!p.projectId && (p.project === 'OrgMap' || (p.position && (p.position.x !== 0 || p.position.y !== 0))))
        )} 
        currentProject={currentProject}
      />
      <ProjectModal
        isOpen={isEditProjectModalOpen}
        onClose={() => setIsEditProjectModalOpen(false)}
        onSubmit={handleUpdateProject}
        mode="edit"
        initialData={currentProject}
      />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}
