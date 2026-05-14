import { useState, useEffect } from 'react';
import { X, FolderPlus, Loader2, CheckCircle2 } from 'lucide-react';

export default function ProjectModal({ isOpen, onClose, onSubmit, mode = 'create', initialData = null }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && mode === 'edit' && initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
    } else if (isOpen && mode === 'create') {
      setName('');
      setDescription('');
    }
  }, [isOpen, mode, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(name.trim(), description.trim());
      if (mode === 'create') {
        setName('');
        setDescription('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => { 
    if (mode === 'create') {
      setName(''); 
      setDescription(''); 
    }
    onClose(); 
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
      <div className="bg-slate-800 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-500/20 rounded-lg">
              <FolderPlus className="text-accent-400" size={18} />
            </div>
            <h2 className="text-base font-bold text-white">
              {mode === 'create' ? 'Create New Project' : 'Edit Project'}
            </h2>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white p-1 hover:bg-slate-700 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Project Name <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus required type="text"
              placeholder="e.g. Engineering Team Q3"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-4 text-sm text-slate-200 focus:outline-none focus:border-accent-500 transition-all placeholder:text-slate-600"
              value={name} onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Description <span className="text-slate-600">(optional)</span>
            </label>
            <textarea
              rows={3} placeholder="What is this project for?"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-4 text-sm text-slate-200 focus:outline-none focus:border-accent-500 transition-all placeholder:text-slate-600 resize-none"
              value={description} onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={handleClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-all border border-slate-700">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || !name.trim()}
              className="flex-[2] bg-accent-500 hover:bg-accent-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2">
              {isSubmitting ? (
                <><Loader2 className="animate-spin" size={16} /> {mode === 'create' ? 'Creating...' : 'Saving...'}</>
              ) : (
                <><CheckCircle2 size={16} /> {mode === 'create' ? 'Create Project' : 'Save Changes'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
