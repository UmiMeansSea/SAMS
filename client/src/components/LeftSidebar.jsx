import { useState, useRef } from 'react';
import { Search, ChevronDown, ChevronRight, UserPlus, UploadCloud, FolderDot, GripVertical, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import AddPersonModal from './AddPersonModal';

export default function LeftSidebar({ people, refreshData }) {
  const [expandedCategories, setExpandedCategories] = useState({
    Manager: true,
    'Senior Developer': true,
    Intern: false,
    Other: false,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Expected columns: name, role, category, project, bio
        // Map them to the Person model format
        const formattedData = data.map((item, index) => ({
          name: item.name || 'Unknown',
          role: item.role || 'Employee',
          email: item.email || '',
          category: item.category || 'Other',
          project: item.project || 'General',
          bio: item.bio || '',
          position: { x: index * 100, y: 300 } // Default spread position
        }));

        await axios.post('http://localhost:5005/api/people/batch', formattedData);
        alert(`Successfully imported ${formattedData.length} people!`);
        refreshData();
      } catch (err) {
        console.error('Import failed:', err);
        alert('Failed to import Excel file. Ensure columns match: name, role, category, project, bio');
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const categories = ['Manager', 'Senior Developer', 'Intern', 'Other'];

  const filteredPeople = people.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.role.toLowerCase().includes(searchQuery.toLowerCase()));

  // Drag start for adding a new person to the canvas from the sidebar
  const onDragStart = (event, nodeType, personData) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('personData', JSON.stringify(personData));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-80 h-full bg-slate-800/90 backdrop-blur-md border-r border-slate-700 flex flex-col z-20 overflow-hidden shadow-2xl relative">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">Toolbox</h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search people..."
            className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 pl-9 pr-3 text-sm text-slate-200 focus:outline-none focus:border-accent-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* People Categories */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {categories.map(category => {
          const categoryPeople = filteredPeople.filter(p => p.category === category);
          if (categoryPeople.length === 0 && searchQuery) return null;

          return (
            <div key={category} className="space-y-1">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-2 rounded hover:bg-slate-700/50 text-slate-300 transition-colors"
              >
                <span className="font-semibold text-sm">{category}s ({categoryPeople.length})</span>
                {expandedCategories[category] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              
              {expandedCategories[category] && (
                <div className="pl-2 space-y-2 mt-2">
                  {categoryPeople.map(person => (
                    <div 
                      key={person._id || person.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, 'person', person)}
                      className="group flex items-center gap-3 p-2 bg-slate-900/50 border border-slate-700 rounded-lg cursor-grab active:cursor-grabbing hover:border-accent-500 transition-colors"
                    >
                      <GripVertical size={14} className="text-slate-500 group-hover:text-slate-300" />
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {person.pfpUrl ? <img src={person.pfpUrl} alt={person.name} /> : <span className="text-xs font-bold">{person.name.charAt(0)}</span>}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm text-slate-200 font-medium truncate">{person.name}</p>
                        <p className="text-xs text-slate-400 truncate">{person.role}</p>
                      </div>
                    </div>
                  ))}
                  {categoryPeople.length === 0 && <p className="text-xs text-slate-500 pl-6 italic">No one found.</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Zone (Bottom) */}
      <div className="p-4 border-t border-slate-700 bg-slate-800 space-y-3">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-400 text-white py-2 rounded-md text-sm font-semibold transition-colors shadow-lg shadow-accent-500/10"
        >
          <UserPlus size={16} /> Add Person
        </button>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".xlsx, .xls, .csv" 
          onChange={handleImportExcel} 
        />
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 rounded-md text-sm transition-colors border border-slate-600 disabled:opacity-50"
        >
          {isImporting ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
          {isImporting ? 'Importing...' : 'Import Excel'}
        </button>
        
        <button className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 rounded-md text-sm transition-colors border border-slate-600">
          <FolderDot size={16} /> Switch Project
        </button>
      </div>

      <AddPersonModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onRefresh={refreshData} 
      />
    </div>
  );
}
