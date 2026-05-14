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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import PersonNode from './components/PersonNode';
import DeletableEdge from './components/DeletableEdge';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';

const nodeTypes = {
  person: PersonNode,
};

const edgeTypes = {
  deletable: DeletableEdge,
};

const API_URL = 'http://localhost:5005/api';

function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rawPeople, setRawPeople] = useState([]); // Store raw data for Sidebars

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/people`);
      const people = res.data;
      
      setRawPeople(people);

      const fetchedNodes = people.map(p => ({
        id: p._id,
        type: 'person',
        position: p.position || { x: 0, y: 0 },
        data: { id: p._id, name: p.name, role: p.role, project: p.project, pfpUrl: p.pfpUrl, bio: p.bio },
      }));

      const fetchedEdges = [];
      people.forEach(p => {
        if (p.managers && p.managers.length > 0) {
          p.managers.forEach(managerId => {
            fetchedEdges.push({
              id: `e${managerId}-${p._id}`,
              source: managerId,
              target: p._id,
              type: 'deletable',
              style: { stroke: '#1B98E0', strokeWidth: 3 },
              animated: true,
            });
          });
        }
      });

      setNodes(fetchedNodes);
      setEdges(fetchedEdges);
    } catch (err) {
      console.error('Error fetching people:', err);
    }
  }, [setNodes, setEdges]);

  // Fetch data from backend on mount
  useEffect(() => {
    fetchData();
    window.addEventListener('refreshData', fetchData);
    return () => window.removeEventListener('refreshData', fetchData);
  }, [fetchData]);

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

  const { screenToFlowPosition, fitView } = useReactFlow();

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
      <LeftSidebar people={rawPeople} refreshData={fetchData} />
      <div className="flex-1 h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
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
        {/* Title and Controls overlay */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
          <h1 className="text-xl font-bold text-white px-4 py-2 drop-shadow-xl font-sans tracking-wide">
            OrgMap Workspace
          </h1>
          <button 
            onClick={autoAlign}
            className="flex items-center gap-2 bg-accent-600 hover:bg-accent-500 text-white px-4 py-2 rounded-full shadow-lg transition-all text-sm font-semibold border border-accent-400/30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/></svg>
            Auto Align Tree
          </button>
        </div>
      </div>
      <RightSidebar people={rawPeople} />
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
