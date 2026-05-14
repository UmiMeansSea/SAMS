import { useState, useEffect, useRef } from 'react';
import {
  X, Edit3, Save, XCircle, UserPlus, Mail, Briefcase,
  FileText, FolderOpen, Camera, Loader2, CheckCircle2, Trash2
} from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:5005/api';

const EMPTY_FORM = {
  name: '',
  role: '',
  email: '',
  bio: '',
  category: 'Other',
  projectsWorkingOn: [],
};

// ── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, pfpUrl, size = 'lg' }) {
  const sizes = {
    sm: 'w-9 h-9 text-sm',
    lg: 'w-20 h-20 text-2xl',
  };
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const colors = [
    'from-violet-500 to-indigo-500',
    'from-cyan-500 to-blue-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-amber-500',
    'from-rose-500 to-pink-500',
  ];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];

  return (
    <div className={`${sizes[size]} rounded-full flex-shrink-0 overflow-hidden ring-2 ring-slate-700`}>
      {pfpUrl ? (
        <img src={pfpUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className={`w-full h-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white`}>
          {initials}
        </div>
      )}
    </div>
  );
}

// ── Tag input for projects list ───────────────────────────────────────────────
function TagInput({ value = [], onChange }) {
  const [input, setInput] = useState('');

  const add = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      if (!value.includes(input.trim())) {
        onChange([...value, input.trim()]);
      }
      setInput('');
    }
  };

  const remove = (tag) => onChange(value.filter(v => v !== tag));

  return (
    <div className="flex flex-wrap gap-1.5 bg-slate-900 border border-slate-700 rounded-xl p-2 focus-within:border-accent-500 transition-colors min-h-[42px]">
      {value.map(tag => (
        <span
          key={tag}
          className="flex items-center gap-1 bg-accent-500/20 text-accent-300 text-xs font-medium px-2.5 py-1 rounded-full"
        >
          {tag}
          <button type="button" onClick={() => remove(tag)} className="hover:text-red-400 transition-colors">
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={add}
        placeholder={value.length === 0 ? 'Type and press Enter...' : ''}
        className="flex-1 min-w-[120px] bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none"
      />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
/**
 * mode: 'view' | 'edit' | 'create'
 * person: the person data object (null for create mode)
 * onClose: called when card should close
 * onRefresh: called after a successful save/create to reload data
 */
export default function UserProfileCard({ mode: initialMode = 'view', person, onClose, onRefresh, projectId }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pfpUrl, setPfpUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPfp, setUploadingPfp] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef(null);

  // Populate form when entering edit or view mode
  useEffect(() => {
    if (person) {
      setForm({
        name: person.name || '',
        role: person.role || '',
        email: person.email || '',
        bio: person.bio || '',
        category: person.category || 'Other',
        projectsWorkingOn: [
          ...(person.projectsWorkingOn || []),
          ...(person.projectIds?.map(p => p.name || 'Unnamed Project') || [])
        ].filter((v, i, a) => a && v && a.indexOf(v) === i),
      });
      setPfpUrl(person.pfpUrl || '');
    } else {
      setForm(EMPTY_FORM);
      setPfpUrl('');
    }
    setMode(initialMode);
  }, [person, initialMode]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handlePfpUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPfp(true);
    const data = new FormData();
    data.append('pfp', file);
    try {
      const res = await axios.post(`${API_URL}/upload`, data);
      setPfpUrl(res.data.url);
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploadingPfp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.role.trim()) return;
    setIsSubmitting(true);

    const payload = { ...form, pfpUrl };
    if (projectId) payload.projectId = projectId;

    try {
      const personId = person?._id || person?.id;
      if (mode === 'create') {
        await axios.post(`${API_URL}/people`, { ...payload, position: { x: 0, y: 0 } });
      } else {
        await axios.patch(`${API_URL}/people/${personId}`, payload);
      }
      setSaved(true);
      onRefresh?.();
      window.dispatchEvent(new CustomEvent('refreshData'));
      setTimeout(() => {
        setSaved(false);
        if (mode === 'create') onClose?.();
        else setMode('view');
      }, 1000);
    } catch (err) {
      console.error('Save failed:', err);
      const msg = err.response?.data?.message || err.message || 'Unknown error';
      alert(`Failed to save: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCreate = mode === 'create';
  const isEdit = mode === 'edit';
  const isView = mode === 'view';
  const isReadonly = isView;

  const displayPerson = isCreate ? { ...form, pfpUrl } : { ...person, ...form, pfpUrl };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* ── Header Banner ── */}
        <div className="relative h-24 bg-gradient-to-r from-accent-700 via-accent-600 to-indigo-600 flex-shrink-0">
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
          {/* Mode label */}
          <div className="absolute top-3 left-4">
            <span className="text-xs font-bold text-white/70 uppercase tracking-widest">
              {isCreate ? 'New Member' : isEdit ? 'Editing Profile' : 'Profile'}
            </span>
          </div>
        </div>

        {/* ── Avatar (overlapping banner) ── */}
        <div className="relative -mt-10 px-6 flex items-end gap-4 flex-shrink-0">
          <div className="relative">
            <Avatar name={displayPerson.name || '?'} pfpUrl={pfpUrl} size="lg" />
            {(isEdit || isCreate) && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPfp}
                className="absolute -bottom-1 -right-1 p-1.5 bg-accent-600 hover:bg-accent-500 text-white rounded-full shadow-lg transition-colors"
              >
                {uploadingPfp ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
              </button>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePfpUpload} />
          </div>
          <div className="pb-2 flex-1 min-w-0">
            {isView ? (
              <>
                <h2 className="text-lg font-bold text-white truncate leading-tight">{person?.name}</h2>
                <p className="text-sm text-accent-400 font-medium truncate">{person?.role}</p>
              </>
            ) : (
              <span className="text-xs text-slate-500 italic">
                {pfpUrl ? 'Photo uploaded ✓' : 'Click camera to upload photo'}
              </span>
            )}
          </div>
          {/* Action buttons top-right */}
          <div className="pb-2 flex gap-2 flex-shrink-0">
            {isView && (
              <button
                onClick={() => setMode('edit')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-600 hover:bg-accent-500 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                <Edit3 size={13} /> Edit
              </button>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pt-4 pb-6 space-y-4">

          {/* Name */}
          <Field
            label="Full Name"
            icon={<UserPlus size={14} />}
            readonly={isReadonly}
            value={form.name}
            display={person?.name}
            placeholder="Jane Smith"
            required
            onChange={v => set('name', v)}
          />

          {/* Role + Category */}
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Role"
              icon={<Briefcase size={14} />}
              readonly={isReadonly}
              value={form.role}
              display={person?.role}
              placeholder="UX Designer"
              required
              onChange={v => set('role', v)}
            />
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</label>
              {isReadonly ? (
                <p className="text-sm text-slate-200 py-1">
                  <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 text-xs font-medium">
                    {person?.category || 'Other'}
                  </span>
                </p>
              ) : (
                <select
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-accent-500 transition-colors"
                >
                  {[
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
                  ].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Email */}
          <Field
            label="Email"
            icon={<Mail size={14} />}
            readonly={isReadonly}
            value={form.email}
            display={person?.email}
            placeholder="jane@company.com"
            type="email"
            onChange={v => set('email', v)}
          />

          {/* Bio */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={13} /> Bio
            </label>
            {isReadonly ? (
              <p className="text-sm text-slate-300 leading-relaxed">
                {person?.bio || <span className="text-slate-600 italic">No bio yet.</span>}
              </p>
            ) : (
              <textarea
                rows={2}
                value={form.bio}
                onChange={e => set('bio', e.target.value)}
                placeholder="A short bio..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-sm text-slate-200 focus:outline-none focus:border-accent-500 transition-colors placeholder:text-slate-600 resize-none"
              />
            )}
          </div>

          {/* Projects */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FolderOpen size={13} /> Projects Working On
            </label>
            {isReadonly ? (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {(() => {
                  const mergedProjects = [
                    ...(person?.projectsWorkingOn || []),
                    ...(person?.projectIds?.map(p => p.name || 'Unnamed Project') || [])
                  ].filter((v, i, a) => v && a.indexOf(v) === i);

                  if (mergedProjects.length > 0) {
                    return mergedProjects.map(p => (
                      <span key={p} className="bg-accent-500/15 text-accent-300 text-xs font-medium px-2.5 py-1 rounded-full border border-accent-500/20">
                        {p}
                      </span>
                    ));
                  }
                  return <span className="text-xs text-slate-600 italic">No projects assigned.</span>;
                })()}
              </div>
            ) : (
              <TagInput value={form.projectsWorkingOn} onChange={v => set('projectsWorkingOn', v)} />
            )}
          </div>

          {/* Divider */}
          {!isView && <div className="border-t border-slate-800" />}

          {/* Form Actions */}
          {(isEdit || isCreate) && (
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => isCreate ? onClose?.() : setMode('view')}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all border border-slate-700"
              >
                <XCircle size={15} /> Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || saved}
                className="flex-[2] flex items-center justify-center gap-2 bg-accent-600 hover:bg-accent-500 disabled:bg-slate-700 text-white py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all"
              >
                {saved ? (
                  <><CheckCircle2 size={15} className="text-green-400" /> Saved!</>
                ) : isSubmitting ? (
                  <><Loader2 size={15} className="animate-spin" /> Saving...</>
                ) : isCreate ? (
                  <><UserPlus size={15} /> Create Member</>
                ) : (
                  <><Save size={15} /> Save Changes</>
                )}
              </button>
            </div>
          )}

          {isView && !isCreate && (
            <div className="pt-2">
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm(`Are you sure you want to PERMANENTLY delete ${person.name} from the database?`)) {
                    try {
                      await axios.delete(`${API_URL}/people/${person._id || person.id}`);
                      onRefresh?.();
                      window.dispatchEvent(new CustomEvent('refreshData'));
                      onClose?.();
                    } catch (err) {
                      console.error('Delete failed:', err);
                      alert('Failed to delete person');
                    }
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all text-xs font-semibold border border-red-500/20"
              >
                <Trash2 size={13} /> Delete Person Permanently
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// ── Reusable Field ─────────────────────────────────────────────────────────
function Field({ label, icon, readonly, value, display, placeholder, onChange, required, type = 'text' }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
        {icon} {label} {required && !readonly && <span className="text-red-400">*</span>}
      </label>
      {readonly ? (
        <p className="text-sm text-slate-200 py-0.5">
          {display || <span className="text-slate-600 italic">—</span>}
        </p>
      ) : (
        <input
          type={type}
          required={required}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-sm text-slate-200 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20 transition-all placeholder:text-slate-600"
        />
      )}
    </div>
  );
}
