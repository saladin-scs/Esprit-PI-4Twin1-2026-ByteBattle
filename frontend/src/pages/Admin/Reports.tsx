import React from 'react';

// Example: You can replace MUI with your preferred UI library or use Tailwind classes
// This is a skeleton for the Reports page matching the provided UX

const statusColors = {
  total: 'bg-gray-700',
  open: 'bg-blue-700',
  underReview: 'bg-yellow-700',
  resolved: 'bg-green-700',
  stale: 'bg-red-700',
};

const Reports: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#181e2a] text-white py-6 w-full">
      <h1 className="text-4xl font-bold mb-2 w-full">Reports</h1>
      <p className="mb-8 text-gray-300 w-full">
        Triage the moderation queue, resolve issues faster, and use quick status actions directly from the list.
      </p>
      <div className="flex gap-4 mb-6 w-full">
        <button className="bg-blue-800 text-white px-4 py-2 rounded font-semibold">Queue view</button>
        <button className="bg-gray-800 text-white px-4 py-2 rounded">All reports</button>
        <button className="bg-gray-800 text-white px-4 py-2 rounded">Under review</button>
        <button className="bg-gray-800 text-white px-4 py-2 rounded">Resolved</button>
      </div>
      <div className="flex gap-4 mb-6 w-full">
        <input
          className="flex-1 bg-gray-900 text-white px-4 py-2 rounded"
          placeholder="Search (subject, message, email, username...)"
        />
        <select className="bg-gray-900 text-white px-4 py-2 rounded">
          <option>Pending</option>
        </select>
        <select className="bg-gray-900 text-white px-4 py-2 rounded">
          <option>All categories</option>
        </select>
        <select className="bg-gray-900 text-white px-4 py-2 rounded">
          <option>Oldest first</option>
        </select>
        <button className="bg-blue-700 px-4 py-2 rounded text-white">Search</button>
      </div>
      <div className="flex gap-4 mb-8 w-full">
        <div className={`flex-1 p-4 rounded ${statusColors.total}`}>
          <div className="text-2xl font-bold">2</div>
          <div className="text-gray-300">TOTAL</div>
        </div>
        <div className={`flex-1 p-4 rounded ${statusColors.open}`}>
          <div className="text-2xl font-bold">0</div>
          <div className="text-gray-300">PENDING</div>
        </div>
        <div className={`flex-1 p-4 rounded ${statusColors.underReview}`}>
          <div className="text-2xl font-bold">1</div>
          <div className="text-gray-300">UNDER REVIEW</div>
        </div>
        <div className={`flex-1 p-4 rounded ${statusColors.resolved}`}>
          <div className="text-2xl font-bold">1</div>
          <div className="text-gray-300">RESOLVED</div>
        </div>
        <div className={`flex-1 p-4 rounded ${statusColors.stale}`}>
          <div className="text-2xl font-bold">1</div>
          <div className="text-gray-300">STALE &gt;48H</div>
        </div>
      </div>
      <div className="bg-gray-900 rounded p-6 min-h-[200px] w-full">
        <h2 className="text-lg font-semibold mb-2">Moderation queue</h2>
        <div className="text-gray-400">No reports match these criteria.</div>
        <div className="text-gray-500 text-sm mt-2">Try Queue view for unresolved reports or switch to All reports.</div>
      </div>
    </div>
  );
};

export default Reports;
