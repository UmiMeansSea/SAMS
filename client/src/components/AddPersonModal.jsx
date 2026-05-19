import { useState } from 'react';
import { X, UserPlus, Mail, Briefcase, FileText, FolderRoot } from 'lucide-react';
import axios from 'axios';

export default function AddPersonModal({ isOpen, onClose, onRefresh, projectId }) {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    email: '',
    project: 'OrgMap',
    bio: '',
    category: 'Other'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.role) {
      alert('Please provide at least a Name and a Role.');
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post('http://localhost:5005/api/people', {
        ...formData,
        projectId,
        position: { x: 0, y: 0 }
      });
      onRefresh();
      onClose();
      setFormData({ name: '', role: '', email: '', project: 'OrgMap', bio: '', category: 'Other' });
    } catch (err) {
      console.error('Error adding person:', err);
      alert('Failed to add person.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-500/20 rounded-lg">
              <UserPlus className="text-accent-500" size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Add New Person</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-700 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
              <div className="relative">
                <input
                  autoFocus
                  required
                  type="text"
                  placeholder="John Doe"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-4 text-sm text-slate-200 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20 transition-all placeholder:text-slate-600"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Role</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                  <input
                    required
                    type="text"
                    placeholder="UX Designer"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20 transition-all placeholder:text-slate-600"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  />
                </div>
              </div>
              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Category</label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-4 text-sm text-slate-200 focus:outline-none focus:border-accent-500 transition-all cursor-pointer"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="Manager">Manager</option>
                  <option value="Senior Developer">Senior</option>
                  <option value="Intern">Intern</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                <input
                  type="email"
                  placeholder="john@example.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20 transition-all placeholder:text-slate-600"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>



            {/* Bio */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Short Bio</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 text-slate-600" size={14} />
                <textarea
                  placeholder="Tell us a bit about their background..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20 transition-all placeholder:text-slate-600 resize-none"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-all border border-transparent hover:border-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-[2] bg-accent-500 hover:bg-accent-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-pure-white py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-accent-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                'Save Person'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
