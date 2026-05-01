import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Search, Loader2, Star } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api/events';
const CATEGORIES = ['Music', 'Food', 'Art', 'Tech', 'Community', 'Other'];

const AddEventForm = ({ onClose, onEventAdded }) => {
  const [form, setForm] = useState({
    title: '', description: '', startDate: '', endDate: '',
    category: 'Other', price: 0, imageUrl: '', isFeatured: false,
    address: '', lat: null, lng: null,
  });
  const [addressQuery, setAddressQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timer = useRef(null);

  const searchAddress = async (q) => {
    if (q.length < 3) { setSuggestions([]); return; }
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`);
      setSuggestions(await res.json());
    } finally { setIsSearching(false); }
  };

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (addressQuery) timer.current = setTimeout(() => searchAddress(addressQuery), 500);
    else setSuggestions([]);
  }, [addressQuery]);

  const selectSuggestion = (s) => {
    setForm(f => ({ ...f, address: s.display_name, lat: parseFloat(s.lat), lng: parseFloat(s.lon) }));
    setAddressQuery(s.display_name);
    setSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.lat || !form.lng) { alert('Please select an address from suggestions'); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) onEventAdded();
      else { const d = await res.json(); alert(`Error: ${d.message}`); }
    } catch { alert('Failed to connect to server'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Organise an Event</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Event Title *</label>
              <input className="form-control" type="text" required placeholder="e.g. Community Jazz Night"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea className="form-control" rows={3} placeholder="Describe your event..."
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={{ resize: 'vertical' }} />
            </div>

            {/* Address Autocomplete */}
            <div className="form-group relative">
              <label>Location / Address *</label>
              <div style={{ position: 'relative' }}>
                <input className="form-control" type="text" required placeholder="Search for venue address..."
                  value={addressQuery} onChange={e => setAddressQuery(e.target.value)}
                  style={{ paddingRight: '2.5rem' }} />
                <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>
                  {isSearching ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
                </span>
              </div>
              {suggestions.length > 0 && (
                <div className="suggestions-list">
                  {suggestions.map((s, i) => (
                    <div key={i} className="suggestion-item" onClick={() => selectSuggestion(s)}>
                      <MapPin size={11} style={{ display: 'inline', marginRight: 6, flexShrink: 0 }} />
                      {s.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label>Start Date *</label>
                <input className="form-control" type="date" required
                  value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>End Date *</label>
                <input className="form-control" type="date" required
                  value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label>Category</label>
                <select className="form-control" value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Price (₹) — 0 for Free</label>
                <input className="form-control" type="number" min="0" value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>

            <div className="form-group">
              <label>Image URL (optional)</label>
              <input className="form-control" type="url" placeholder="https://..."
                value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} />
            </div>

            <label className="checkbox-row">
              <input type="checkbox" checked={form.isFeatured}
                onChange={e => setForm(f => ({ ...f, isFeatured: e.target.checked }))} />
              <Star size={14} style={{ color: '#f59e0b' }} />
              Feature this event (highlighted pin on map)
            </label>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 size={14} className="spin" /> Creating…</> : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddEventForm;
