import { Handle, Position } from '@xyflow/react';
import { Edit2, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

export default function PersonNode({ data }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentPfp, setCurrentPfp] = useState(data.pfpUrl);
  const fileInputRef = useRef(null);

  // Sync with incoming data from props (e.g. when updated via sidebar)
  useEffect(() => {
    setCurrentPfp(data.pfpUrl);
  }, [data.pfpUrl]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('pfp', file);

    setIsUploading(true);
    try {
      // 1. Upload to server
      const uploadRes = await axios.post('http://localhost:5005/api/upload', formData);
      const newUrl = uploadRes.data.url;

      // 2. Update person in DB
      await axios.patch(`http://localhost:5005/api/people/${data.id}`, { pfpUrl: newUrl });

      setCurrentPfp(newUrl);
      window.dispatchEvent(new CustomEvent('refreshData'));
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload image.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div 
      className="relative flex flex-col items-center group cursor-grab"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Target handle for incoming vertical connections */}
      <Handle type="target" position={Position.Top} className="opacity-0" />

      {/* Avatar Container */}
      <div className={`relative w-16 h-16 rounded-full border-2 bg-slate-800 overflow-hidden flex items-center justify-center transition-all duration-300 shadow-lg ${data.isMagnetized ? 'border-accent-400 scale-110 ring-4 ring-accent-500/30 shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'border-slate-700 group-hover:border-accent-500'}`}>
        {currentPfp ? (
          <img src={currentPfp} alt={data.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xl font-bold text-slate-400">{data.name?.charAt(0)}</span>
        )}
        
        {data.isMagnetized && (
          <div className="absolute inset-0 bg-accent-500/10 animate-pulse" />
        )}

        {/* Edit Overlay on Hover */}
        {(isHovered || isUploading) && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity">
            {isUploading ? (
              <Loader2 className="animate-spin text-white" size={20} />
            ) : (
              <button 
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="p-1.5 rounded-full bg-accent-500 hover:bg-accent-400 text-white transition-colors shadow-md"
              >
                <Edit2 size={16} />
              </button>
            )}
          </div>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleUpload}
        />
      </div>

      {/* Name and Role */}
      <div className={`mt-2 text-center bg-navy-800/80 backdrop-blur-sm px-3 py-1 rounded-full border transition-colors ${data.isMagnetized ? 'border-accent-400 bg-accent-900/30' : 'border-slate-700/50'}`}>
        <h3 className="text-sm font-semibold text-slate-200">{data.name}</h3>
        <p className="text-xs text-slate-400">{data.role}</p>
      </div>

      {/* Bio Tooltip – shown above on mobile, to the right on desktop */}
      {isHovered && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 sm:bottom-auto sm:top-0 sm:left-full sm:translate-x-0 sm:ml-4 sm:-translate-y-0 w-44 sm:w-48 bg-slate-800/95 backdrop-blur-md border border-slate-700 p-3 rounded-xl shadow-xl z-50 pointer-events-none">
          <h4 className="text-sm font-bold text-white mb-1 truncate">{data.name}</h4>
          <p className="text-xs text-slate-300 mb-2 truncate">{data.role}</p>
          <div className="w-full h-px bg-slate-700 mb-2" />
          <p className="text-xs text-slate-400 mb-1"><span className="text-slate-300 font-medium">Project:</span> {data.project || 'Unassigned'}</p>
          <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{data.bio || 'No bio provided.'}</p>
        </div>
      )}

      {/* Source handle for outgoing vertical connections */}
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}
