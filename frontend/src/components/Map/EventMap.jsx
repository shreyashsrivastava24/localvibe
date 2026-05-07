import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Calendar, MapPin, Users } from 'lucide-react';

// build a custom div-icon marker — featured events get a bigger golden pin
function createIcon(isFeatured, isSelected) {
  const big = isFeatured || isSelected;
  return L.divIcon({
    className: '',
    html: `<div class="marker-pin-wrap">
      <div class="marker-pin ${isFeatured ? 'featured' : ''} ${isSelected ? 'selected' : ''}"></div>
    </div>`,
    iconSize: big ? [40, 40] : [30, 30],
    iconAnchor: big ? [20, 40] : [15, 30],
    popupAnchor: [0, big ? -44 : -34],
  });
}

const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.25);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// smoothly pan the map to whichever event the user clicked in the sidebar
function MapController({ selectedEventId, events }) {
  const map = useMap();
  useEffect(() => {
    if (!selectedEventId) return;
    const ev = events.find(e => e._id === selectedEventId);
    if (ev?.location?.coordinates) {
      const [lng, lat] = ev.location.coordinates;
      map.setView([lat, lng], 15, { animate: true });
    }
  }, [selectedEventId, events, map]);
  return null;
}

const EventMap = ({ events, userLocation, radiusKm, selectedEventId, onEventClick }) => (
  <MapContainer
    center={[userLocation.lat, userLocation.lng]}
    zoom={12}
    style={{ height: '100%', width: '100%' }}
    zoomControl
  >
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />

    <MapController selectedEventId={selectedEventId} events={events} />

    {/* blue dot for "you are here" */}
    <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
      <Popup>
        <div className="popup-body" style={{ minWidth: 120, textAlign: 'center' }}>
          <strong style={{ color: '#f1f5f9' }}>📍 You are here</strong>
        </div>
      </Popup>
    </Marker>

    <Circle
      center={[userLocation.lat, userLocation.lng]}
      radius={radiusKm * 1000}
      pathOptions={{
        color: '#8b5cf6', fillColor: '#8b5cf6',
        fillOpacity: 0.08, weight: 1.5
      }}
    />

    {/* event markers */}
    {events.map(event => {
      if (!event.location?.coordinates) return null;
      const [lng, lat] = event.location.coordinates;
      const isSelected = selectedEventId === event._id;
      return (
        <Marker
          key={event._id}
          position={[lat, lng]}
          icon={createIcon(event.isFeatured, isSelected)}
          eventHandlers={{ click: () => onEventClick(event._id) }}
        >
          {isSelected && (
            <Tooltip permanent direction="top" offset={[0, -28]}
              className="selected-event-label">
              {event.title}
            </Tooltip>
          )}
          <Popup closeButton maxWidth={270}>
            <img src={event.imageUrl} alt={event.title} className="popup-img" />
            <div style={{ padding: '0.7rem 0.85rem', background: '#1a2236' }}>
              <p style={{
                fontSize: '0.9rem', fontWeight: 700,
                color: '#f8fafc', marginBottom: '0.4rem', lineHeight: 1.3
              }}>{event.title}</p>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: '0.74rem', color: '#94a3b8', marginBottom: '0.25rem'
              }}>
                <Calendar size={11} color="#94a3b8" style={{ flexShrink: 0 }} />
                <span>{new Date(event.startDate).toLocaleDateString('en-IN', {
                  weekday: 'short', day: 'numeric', month: 'short'
                })}</span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: '0.74rem', color: '#94a3b8', marginBottom: '0.5rem'
              }}>
                <MapPin size={11} color="#94a3b8" style={{ flexShrink: 0 }} />
                <span style={{
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>{event.location.address}</span>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', paddingTop: '0.5rem',
                borderTop: '1px solid rgba(255,255,255,0.08)'
              }}>
                <strong style={{
                  color: event.price === 0 ? '#10b981' : '#a78bfa',
                  fontFamily: 'Space Grotesk, sans-serif', fontSize: '0.9rem'
                }}>
                  {event.price === 0 ? 'FREE' : `₹${event.price}`}
                </strong>
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: '0.72rem', color: '#64748b'
                }}>
                  <Users size={11} color="#64748b" /> {event.attendees || 0} going
                </span>
              </div>
            </div>
          </Popup>
        </Marker>
      );
    })}
  </MapContainer>
);

export default EventMap;
