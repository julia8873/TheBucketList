import React from 'react';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-100 bg-[#FAF8F5]">
          <h1 className="text-3xl font-serif text-[#D4AF37] mb-2">TheBucketList Admin</h1>
          <p className="text-gray-500">Manage users, view storage metrics, and moderate content.</p>
        </div>
        
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-orange-50 border border-orange-100">
            <h3 className="text-orange-800 font-semibold mb-1">Total Users</h3>
            <p className="text-3xl font-bold text-orange-600">1,204</p>
          </div>
          
          <div className="p-6 rounded-xl bg-blue-50 border border-blue-100">
            <h3 className="text-blue-800 font-semibold mb-1">Active Buckets</h3>
            <p className="text-3xl font-bold text-blue-600">8,432</p>
          </div>
          
          <div className="p-6 rounded-xl bg-green-50 border border-green-100">
            <h3 className="text-green-800 font-semibold mb-1">Storage Used</h3>
            <p className="text-3xl font-bold text-green-600">142 GB</p>
          </div>
        </div>
        
        <div className="px-8 pb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Users</h2>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-3 font-semibold text-gray-600">Username</th>
                <th className="py-3 font-semibold text-gray-600">Status</th>
                <th className="py-3 font-semibold text-gray-600">Storage Quota</th>
                <th className="py-3 font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-4 text-gray-800">@sarahc_travels</td>
                <td className="py-4"><span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Active</span></td>
                <td className="py-4 text-gray-600">45 MB / 50 MB</td>
                <td className="py-4 text-right"><button className="text-blue-600 hover:underline">Manage</button></td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-4 text-gray-800">@john_doe</td>
                <td className="py-4"><span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">Offline</span></td>
                <td className="py-4 text-gray-600">12 MB / 50 MB</td>
                <td className="py-4 text-right"><button className="text-blue-600 hover:underline">Manage</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
