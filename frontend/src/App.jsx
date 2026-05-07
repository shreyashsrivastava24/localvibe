import React, { useState, useEffect, useRef } from 'react';
import EventList from './components/Events/EventList';
import EventMap from './components/Map/EventMap';
import AddEventForm from './components/Events/AddEventForm';
import { Plus, Compass, CalendarCheck, Sparkles, RefreshCw, Search, MapPin, SlidersHorizontal, X } from 'lucide-react';
import './index.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api/events';
const CATEGORIES = ['All', 'Music', 'Food', 'Art', 'Tech', 'Community', 'Other'];

const App = () => {
  const [events, setEvents] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('discover');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [radiusKm, setRadiusKm] = useState(5);
  const [sortBy, setSortBy] = useState('soonest');
  const [weekendOnly, setWeekendOnly] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const mapContainerRef = useRef(null);

  // on mount: grab location, trigger SERP sync, then load events
  useEffect(() => {
    const init = async (lat, lng) => {
      setUserLocation({ lat, lng });
      try {
        setIsSyncing(true);
        setSyncMessage('Fetching real-time events near you...');
        const res = await fetch(`${API}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng }),
        });
        const data = await res.json();
        setSyncMessage(data.synced ? '✓ Live events loaded from Google!' : '✓ Showing current events');
      } catch {
        setSyncMessage('Showing stored events');
      } finally {
        setIsSyncing(false);
        setTimeout(() => setSyncMessage(''), 4000);
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => init(pos.coords.latitude, pos.coords.longitude),
        () => init(28.4359, 77.3294) // fallback: NCR area
      );
    } else {
      init(28.4359, 77.3294);
    }
  }, []);

  // refetch whenever filters or location change
  const fetchData = async () => {
    if (!userLocation) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        category: selectedCategory,
        search: searchQuery,
        lat: userLocation.lat,
        lng: userLocation.lng,
        radius: String(radiusKm * 1000),
        weekendOnly: String(weekendOnly),
        freeOnly: String(freeOnly),
        featuredOnly: String(featuredOnly),
      });
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const [evRes, recRes, myRes] = await Promise.all([
        fetch(`${API}?${params}`),
        fetch(`${API}/recommendations`),
        fetch(`${API}/my-events`),
      ]);
      const [ev, rec, my] = await Promise.all([evRes.json(), recRes.json(), myRes.json()]);
      setEvents(Array.isArray(ev) ? ev : []);
      setRecommendations(Array.isArray(rec) ? rec : []);
      setMyEvents(Array.isArray(my) ? my : []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userLocation) fetchData();
  }, [userLocation, selectedCategory, searchQuery, dateFrom, dateTo, radiusKm, weekendOnly, freeOnly, featuredOnly]);

  const getActiveEvents = () => {
    let base;
    if (activeTab === 'my-events') base = myEvents;
    else if (activeTab === 'for-you') base = recommendations;
    else base = events;

    const sorted = [...base];
    if (sortBy === 'popular') {
      sorted.sort((a, b) => (b.attendees || 0) - (a.attendees || 0));
    } else if (sortBy === 'price-low') {
      sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else {
      sorted.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    }
    return sorted;
  };

  const activeEvents = getActiveEvents();

  const handleEventClick = (id) => {
    setSelectedEventId(id);
    // on mobile, scroll down to the map when a card is tapped
    if (window.innerWidth <= 768 && mapContainerRef.current) {
      mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="app-container">
      {/* sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="logo">LocalVibe<span className="logo-dot" /></div>
          <div className="header-actions">
            <button className="btn-icon" onClick={fetchData} disabled={isLoading} title="Refresh events">
              <RefreshCw size={15} className={isLoading ? 'spin' : ''} />
            </button>
            <button className="btn" onClick={() => setShowAddForm(true)}>
              <Plus size={16} /> Add Event
            </button>
          </div>
        </div>

        {/* tabs */}
        <div className="tab-bar">
          {[
            { id: 'discover', label: 'Discover', icon: <Compass size={16} /> },
            { id: 'for-you',  label: 'For You',  icon: <Sparkles size={16} /> },
            { id: 'my-events',label: 'My RSVPs', icon: <CalendarCheck size={16} /> },
          ].map(t => (
            <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* sync status */}
        {(isSyncing || syncMessage) && (
          <div className={`status-bar ${syncMessage.startsWith('✓') ? 'success' : 'info'}`}>
            {isSyncing && <div className="spinner-small" />}
            <span>{syncMessage || 'Syncing live events...'}</span>
          </div>
        )}

        <div className="insight-strip">
          <div className="insight-card">
            <span className="insight-label">Visible Events</span>
            <strong>{activeEvents.length}</strong>
          </div>
          <div className="insight-card">
            <span className="insight-label">Search Radius</span>
            <strong>{radiusKm} km</strong>
          </div>
          <div className="insight-card">
            <span className="insight-label">Location</span>
            <strong>{userLocation ? 'Detected' : 'Fallback'}</strong>
          </div>
        </div>

        {/* filters */}
        <div className="filter-section">
          <div className="search-bar">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-row">
            {CATEGORIES.map(cat => (
              <button key={cat} className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}>
                {cat}
              </button>
            ))}
          </div>
          <div className="quick-filter-row">
            <button
              className={`quick-filter-chip ${weekendOnly ? 'active' : ''}`}
              onClick={() => setWeekendOnly(v => !v)}
            >
              This Weekend
            </button>
            <button
              className={`quick-filter-chip ${freeOnly ? 'active' : ''}`}
              onClick={() => setFreeOnly(v => !v)}
            >
              Free Only
            </button>
            <button
              className={`quick-filter-chip ${featuredOnly ? 'active' : ''}`}
              onClick={() => setFeaturedOnly(v => !v)}
            >
              Featured
            </button>
          </div>
          <div className="advanced-controls">
            <div className="range-wrap">
              <label><MapPin size={13} /> Radius: <span>{radiusKm} km</span></label>
              <input
                type="range"
                min="1"
                max="30"
                value={radiusKm}
                onChange={e => setRadiusKm(Number(e.target.value))}
              />
            </div>
            <div className="sort-wrap">
              <label><SlidersHorizontal size={13} /> Sort</label>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="soonest">Soonest</option>
                <option value="popular">Most Popular</option>
                <option value="price-low">Price: Low to High</option>
              </select>
            </div>
          </div>
          {/* date range */}
          <div className="date-filter-wrap">
            <div className="date-filter-title">Date range</div>
            <div className="date-filter">
              <label className="date-input-label">
                <span>From</span>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From date" />
              </label>
              <label className="date-input-label">
                <span>To</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="To date" />
              </label>
            {(dateFrom || dateTo) && (
              <button className="btn-icon" style={{ fontSize: '0.7rem', padding: '0.3rem 0.5rem' }}
                onClick={() => { setDateFrom(''); setDateTo(''); }}>✕</button>
            )}
            </div>
          </div>
          {(searchQuery || selectedCategory !== 'All' || dateFrom || dateTo || radiusKm !== 5 || weekendOnly || freeOnly || featuredOnly) && (
            <button
              className="clear-filters"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setDateFrom('');
                setDateTo('');
                setRadiusKm(5);
                setWeekendOnly(false);
                setFreeOnly(false);
                setFeaturedOnly(false);
              }}
            >
              <X size={14} /> Reset all filters
            </button>
          )}
        </div>

        {/* event cards */}
        {isLoading && activeEvents.length === 0 ? (
          <div className="loading-state">
            <div className="spinner-large" />
            <p>Finding events near you…</p>
          </div>
        ) : (
          <EventList
            events={activeEvents}
            onEventClick={handleEventClick}
            selectedEventId={selectedEventId}
            onRsvp={fetchData}
          />
        )}
      </div>

      {/* map */}
      <div className="map-container" ref={mapContainerRef}>
        {userLocation && (
          <EventMap
            events={activeEvents}
            userLocation={userLocation}
            radiusKm={radiusKm}
            selectedEventId={selectedEventId}
            onEventClick={handleEventClick}
          />
        )}
      </div>

      {/* add event modal */}
      {showAddForm && (
        <AddEventForm onClose={() => setShowAddForm(false)} onEventAdded={() => { fetchData(); setShowAddForm(false); }} />
      )}
    </div>
  );
};

export default App;
