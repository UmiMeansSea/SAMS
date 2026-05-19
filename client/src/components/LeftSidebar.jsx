import { useState, useRef, useEffect } from 'react';
import {
  UserPlus, Search, Trash2, ChevronDown, FolderPlus,
  Save, LayoutGrid, UploadCloud, GripVertical, Loader2,
  ChevronRight, X, CheckCircle2, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import ProjectModal from './ProjectModal';

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
const LeftSidebar = ({
  people,
  refreshData,
  projects = [],
  currentProject,
  onSwitchProject,
  onSaveProject
}) => {
  const [expandedCategories, setExpandedCategories] = useState({
    'Leadership': true,
    'Manager': true,
    'Engineering': true,
    'Senior Developer': true,
    'Product & Design': true,
    'Data & AI': true,
    'Quality Assurance': true,
    'Intern': true,
    'Operations & HR': true,
    'Other': true,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [profileCard, setProfileCard] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const fileInputRef = useRef(null);

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

  const categories = [
    'Leadership',
    'Manager',
    'Engineering',
    'Senior Developer',
    'Product & Design',
    'Data & AI',
    'Quality Assurance',
    'Intern',
    'Operations & HR',
    'Other'
  ];
  const filteredPeople = people.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async () => {
    setSaveStatus('saving');
    await onSaveProject?.();
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleCreateProject = async (name, description) => {
    try {
      if (currentProject) await axios.put(`${API_URL}/projects/${currentProject._id}/save`);
      const res = await axios.post(`${API_URL}/projects`, { name, description });
      onSwitchProject(res.data);
      setIsNewProjectModalOpen(false);
    } catch (err) {
      console.error('Failed to create project:', err);
      alert('Failed to create project. Check the console for details.');
    }
  };

  const handleUpdateProject = async (name, description) => {
    try {
      const res = await axios.patch(`${API_URL}/projects/${currentProject._id}`, { name, description });
      onSwitchProject(res.data); // Update current local project data
      setIsEditProjectModalOpen(false);
      refreshData(); // Refresh UI to show new name everywhere
    } catch (err) {
      console.error('Failed to update project:', err);
      alert('Failed to update project.');
    }
  };

  const handleSwitchProject = async (proj) => {
    if (currentProject && currentProject._id !== proj._id) {
      try { await axios.put(`${API_URL}/projects/${currentProject._id}/save`); } catch (_) {}
    }
    onSwitchProject(proj);
    setIsProjectDropdownOpen(false);
  };

  const toggleCategory = (cat) =>
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));

  const onDragStart = (event, nodeType, personData) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('personData', JSON.stringify(personData));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDeleteFromProject = async (e, personId, personName) => {
    e.stopPropagation();
    if (!window.confirm(`Remove ${personName} from this project? They stay in the database.`)) return;
    try {
      await axios.patch(`${API_URL}/people/${personId}`, {
        projectId: null, 
        project: '', 
        removeProjectId: currentProject?._id,
        managers: [], 
        position: { x: 0, y: 0 }
      });
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        const formatted = data.map((item, i) => ({
          name: item.name || 'Unknown', role: item.role || 'Employee',
          email: item.email || '', category: item.category || 'Other',
          bio: item.bio || '', projectId: currentProject?._id || null,
          position: { x: i * 120, y: 300 }
        }));
        await axios.post(`${API_URL}/people/batch`, formatted);
        alert(`Imported ${formatted.length} people!`);
        refreshData();
      } catch (err) {
        console.error(err);
        alert('Import failed.');
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Sort: active project first
  const sortedProjects = [
    ...(currentProject ? [currentProject] : []),
    ...projects.filter(p => p._id !== currentProject?._id).sort((a, b) => a.name.localeCompare(b.name))
  ];

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
          className="fixed top-4 left-2 z-50 p-2.5 bg-slate-800/90 backdrop-blur-md border border-slate-700 rounded-xl text-accent-400 shadow-xl active:scale-95 transition-transform"
          title="Open Projects"
        >
          <LayoutGrid size={18} />
        </button>
      )}

      <div
        className={[
          'bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl transition-all duration-300 group overflow-hidden',
          isMobile
            ? `fixed top-0 left-0 h-full z-[60] ${isCollapsed ? 'w-0' : 'w-[85vw] max-w-xs'}`
            : `relative h-full z-20 ${isCollapsed ? 'w-14' : 'w-80'}`,
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
              <LayoutGrid size={20} />
            </button>
            <div className="flex-1 flex flex-col items-center gap-4">
              <button onClick={() => setProfileCard({ mode: 'create', person: null })} className="p-2 text-slate-500 hover:text-white" title="Add Person"><UserPlus size={20} /></button>
              <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-500 hover:text-white" title="Import Excel"><UploadCloud size={20} /></button>
            </div>
          </div>
        )}

        <div className={`flex flex-col h-full ${isMobile ? 'w-full' : 'w-80'} transition-all duration-300 ${(!isMobile && isCollapsed) ? 'opacity-0 pointer-events-none -translate-x-5' : 'opacity-100 translate-x-0'}`}>

      {/* ── Project Selector ── */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setIsCollapsed(true)}
            className="flex items-center gap-2 hover:bg-slate-800 p-1.5 -ml-1.5 rounded-lg transition-all"
            title="Collapse Sidebar"
          >
            <LayoutGrid size={16} className="text-accent-400" />
            <span className="font-bold tracking-widest text-white uppercase text-xs">Projects</span>
          </button>
          <div className="flex gap-1">
            <button onClick={handleSave} className="p-1.5 hover:bg-slate-800 rounded-lg transition-all" title="Save">
              {saveStatus === 'saved' ? <CheckCircle2 size={17} className="text-green-400" />
                : saveStatus === 'saving' ? <Loader2 size={17} className="text-slate-400 animate-spin" />
                : <Save size={17} className="text-slate-400 hover:text-white" />}
            </button>
            <button onClick={async () => {
              if (!currentProject) return;
              if (window.confirm(`Delete project "${currentProject.name}"? This will permanently remove all personnel in this project.`)) {
                try {
                  await axios.delete(`${API_URL}/projects/${currentProject._id}`);
                  window.location.reload(); // Hard refresh to reset app state and fetch new project
                } catch (err) {
                  console.error('Delete failed:', err);
                  alert('Failed to delete project');
                }
              }
            }} className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-all" title="Delete Current Project">
              <Trash2 size={17} />
            </button>
            <button onClick={() => setIsNewProjectModalOpen(true)} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all" title="New Project">
              <FolderPlus size={17} />
            </button>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsProjectDropdownOpen(v => !v)}
            className="w-full flex items-center justify-between bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2.5 rounded-xl text-left transition-all"
          >
            <span 
              className="text-sm font-semibold text-white truncate cursor-pointer hover:text-accent-300 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditProjectModalOpen(true);
              }}
              title="Click to edit project details"
            >
              {currentProject?.name || 'Select Project'}
            </span>
            <ChevronDown size={15} className={`text-slate-400 flex-shrink-0 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isProjectDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsProjectDropdownOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                {sortedProjects.length === 0
                  ? <p className="px-4 py-3 text-xs text-slate-500 italic text-center">No projects yet.</p>
                  : sortedProjects.map((proj, idx) => {
                    const isActive = currentProject?._id === proj._id;
                    return (
                      <button key={proj._id} onClick={() => handleSwitchProject(proj)}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${idx > 0 ? 'border-t border-slate-700/50' : ''} ${isActive ? 'bg-accent-500/15 text-accent-300 font-semibold' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-accent-400' : 'bg-slate-600'}`} />
                        <span className="truncate flex-1">{proj.name}</span>
                        {isActive && <span className="ml-auto text-xs bg-accent-500/20 text-accent-400 px-2 py-0.5 rounded-full font-normal">Active</span>}
                      </button>
                    );
                  })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Search ── */}
      <div className="px-4 pt-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
          <input
            type="text" placeholder="Search people..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-sm text-slate-200 focus:outline-none focus:border-accent-500 transition-colors placeholder:text-slate-600"
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ── People List ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {categories.map(category => {
          const catPeople = filteredPeople.filter(p => p.category === category);
          if (catPeople.length === 0 && searchQuery) return null;
          return (
            <div key={category}>
              <button onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between py-1.5 text-slate-400 hover:text-slate-200 transition-colors">
                <span className="text-xs font-bold uppercase tracking-wider">{category}s ({catPeople.length})</span>
                {expandedCategories[category] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {expandedCategories[category] && (
                <div className="space-y-1.5 mt-1">
                  {catPeople.map(person => (
                    <div
                      key={person._id || person.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, 'person', person)}
                      onClick={() => setProfileCard({ mode: 'view', person })}
                      className="group flex items-center gap-2.5 p-2 bg-slate-800/50 border border-slate-700/50 rounded-lg cursor-pointer hover:border-accent-500/50 hover:bg-slate-800 transition-all"
                    >
                      <GripVertical size={13} className="text-slate-600 group-hover:text-slate-400 flex-shrink-0 cursor-grab" />
                      <div 
                        className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-600 to-indigo-600 flex items-center justify-center overflow-hidden flex-shrink-0 text-xs font-bold text-pure-white"
                        title={`Working on: ${person.projectIds?.map(p => p.name).filter(Boolean).join(', ') || 'Unassigned'}`}
                      >
                        {person.pfpUrl
                          ? <img src={person.pfpUrl} alt={person.name} className="w-full h-full object-cover" />
                          : person.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 font-medium truncate leading-tight">{person.name}</p>
                        <p className="text-xs text-slate-500 truncate">{person.role}</p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteFromProject(e, person._id || person.id, person.name)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all flex-shrink-0"
                        title="Remove from Project"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {catPeople.length === 0 && <p className="text-xs text-slate-600 italic pl-2 py-1">No one here.</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bottom Actions ── */}
      <div className="p-4 border-t border-slate-800 bg-slate-900 space-y-2.5">
        <button
          onClick={() => setProfileCard({ mode: 'create', person: null })}
          className="w-full flex items-center justify-center gap-2 bg-accent-600 hover:bg-accent-500 text-pure-white py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-accent-900/20"
        >
          <UserPlus size={15} /> Add Person
        </button>
        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImportExcel} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm transition-colors border border-slate-700 disabled:opacity-50"
        >
          {isImporting ? <Loader2 className="animate-spin" size={15} /> : <UploadCloud size={15} />}
          {isImporting ? 'Importing...' : 'Import Excel'}
        </button>
      </div>

      {/* ── Modals ── */}
      <ProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onSubmit={handleCreateProject}
        mode="create"
      />

      <ProjectModal
        isOpen={isEditProjectModalOpen}
        onClose={() => setIsEditProjectModalOpen(false)}
        onSubmit={handleUpdateProject}
        mode="edit"
        initialData={currentProject}
      />

      {profileCard && (
        <UserProfileCard
          mode={profileCard.mode}
          person={profileCard.person}
          projectId={currentProject?._id}
          onClose={() => setProfileCard(null)}
          onRefresh={() => { refreshData(); setProfileCard(null); }}
        />
      )}
        </div>
      </div>
    </>
  );
};

export default LeftSidebar;
