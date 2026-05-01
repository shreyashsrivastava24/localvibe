import React from 'react';
import { Calendar, MapPin, Users, UserPlus, Star, Heart } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api/events';

const CategoryBadge = ({ category }) => (
  <span className={`badge badge-${category}`}>{category}</span>
);

const categoryFallbackImage = () =>
  `https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80`;

const getSharpImageUrl = (url, category) => {
  if (!url || typeof url !== 'string') return categoryFallbackImage(category);

  let upgraded = url;
  upgraded = upgraded.replace(/=s\d+(-c)?/g, '=s1200');
  upgraded = upgraded.replace(/w\d+-h\d+/g, 'w1200-h800');
  upgraded = upgraded.replace(/([?&])w=\d+/g, '$1w=1200');
  upgraded = upgraded.replace(/([?&])h=\d+/g, '$1h=800');

  return upgraded;
};

const EventList = ({ events, onEventClick, selectedEventId, onRsvp }) => {
  const handleRsvp = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API}/${id}/rsvp`, { method: 'PUT' });
      if (res.ok) onRsvp();
      else { const d = await res.json(); alert(d.message); }
    } catch { console.error('RSVP failed'); }
  };

  const handleInterested = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API}/${id}/interested`, { method: 'PUT' });
      if (res.ok) onRsvp();
      else { const d = await res.json(); alert(d.message); }
    } catch { console.error('Interested failed'); }
  };

  if (events.length === 0) {
    return (
      <div className="empty-state">
        <Calendar size={40} strokeWidth={1.2} />
        <p>No events found.<br />Try adjusting your filters or add one yourself!</p>
      </div>
    );
  }

  return (
    <div className="event-list">
      {events.map(event => (
        <div
          key={event._id}
          className={`event-card ${selectedEventId === event._id ? 'active' : ''} ${event.isFeatured ? 'featured' : ''}`}
          onClick={() => onEventClick(event._id)}
        >
          {/* Image */}
          <div className="event-image-wrap">
            <img
              src={getSharpImageUrl(event.imageUrl, event.category)}
              alt={event.title}
              className="event-image"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.currentTarget.src = categoryFallbackImage(event.category);
              }}
            />
            <div className="event-image-overlay" />
            <div className="event-badges">
              {event.isFeatured && (
                <span className="badge badge-featured"><Star size={9} fill="currentColor" /> Featured</span>
              )}
              <CategoryBadge category={event.category} />
            </div>
          </div>

          {/* Body */}
          <div className="event-body">
            <h3 className="event-title">{event.title}</h3>
            <p className="event-description">
              {event.description?.trim()
                ? event.description
                : 'No description provided yet. Tap to view this event on the map and RSVP.'}
            </p>

            <div className="event-meta">
              <div className="meta-row">
                <Calendar size={12} style={{ flexShrink: 0 }} />
                <span>
                  {new Date(event.startDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
              </div>
              <div className="meta-row event-location-row">
                <MapPin size={12} style={{ flexShrink: 0 }} />
                <span className="event-location-text">{event.location?.address || 'Location TBD'}</span>
              </div>
            </div>

            {/* Friends attending */}
            {event.friendsAttending > 0 && (
              <div className="friends-badge">
                <UserPlus size={11} />
                {event.friendsAttending} {event.friendsAttending === 1 ? 'friend is' : 'friends are'} going
              </div>
            )}

            {/* Footer */}
            <div className="event-footer">
              <span className={`price-tag ${event.price === 0 ? 'free' : ''}`}>
                {event.price === 0 ? 'FREE' : `₹${event.price}`}
              </span>

              <div className="rsvp-actions">
                <div className="attendee-count">
                  <Users size={12} /> <span>{event.attendees || 0}</span>
                </div>
                <button
                  className={`btn ${event.isRsvpd ? 'btn-going' : 'btn-secondary'} btn`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                  onClick={e => handleRsvp(e, event._id)}
                  disabled={event.isRsvpd}
                >
                  {event.isRsvpd ? '✓ Going' : 'Going'}
                </button>
                <button
                  className={`btn btn-interested`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                  onClick={e => handleInterested(e, event._id)}
                  disabled={event.isInterested}
                  title="Mark as Interested"
                >
                  <Heart size={12} fill={event.isInterested ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EventList;
