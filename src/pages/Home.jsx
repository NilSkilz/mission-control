import React from 'react';
import CalendarWidget from '../components/CalendarWidget';
import TodoWidget from '../components/TodoWidget';

const HomePage = () => {
  return (
    <div className="home-page container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Mission Control Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CalendarWidget />
        <TodoWidget />
      </div>
    </div>
  );
};

export default HomePage;