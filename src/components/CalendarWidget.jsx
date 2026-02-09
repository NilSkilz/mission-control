import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CalendarWidget = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/calendar/events');
        setEvents(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch calendar events:', err);
        setError('Failed to load calendar events');
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) return <div>Loading events...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="calendar-widget">
      <h2>Upcoming Events</h2>
      {events.length === 0 ? (
        <p>No upcoming events</p>
      ) : (
        <ul>
          {events.map((event) => (
            <li key={event.id}>
              <strong>{event.title}</strong>
              <br />
              {new Date(event.start).toLocaleString()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CalendarWidget;