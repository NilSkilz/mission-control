import React from 'react';
import CalendarWidget from '../components/CalendarWidget';
import TodoWidget from '../components/TodoWidget';

const HomePage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <span>🏠</span> Dashboard
        </h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CalendarWidget />
        <TodoWidget />
      </div>
    </div>
  );
};

export default HomePage;