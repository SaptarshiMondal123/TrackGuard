import React, { useEffect, useState } from "react";

interface DashboardProps {
  artifacts: {
    csv?: string;
    map?: string;
    video?: string;
  };
}

const Dashboard: React.FC<DashboardProps> = ({ artifacts }) => {
  const [csvData, setCsvData] = useState<string[][]>([]);

  useEffect(() => {
    const fetchCsv = async () => {
      if (!artifacts.csv) return;
      try {
        const res = await fetch(artifacts.csv);
        const text = await res.text();
        const rows = text.trim().split("\n").map(r => r.split(","));
        setCsvData(rows);
      } catch (err) {
        console.error("❌ Failed to fetch CSV:", err);
      }
    };

    fetchCsv();
  }, [artifacts.csv]);

  return (
    <section className="py-16 bg-gradient-to-b from-gray-900 to-black min-h-screen">
      <div className="container mx-auto px-6 space-y-12">
        <h2 className="text-4xl font-bold text-white mb-8">
          📊 TrackGuard <span className="text-green-400">Dashboard</span>
        </h2>

        {/* CSV Results */}
        {csvData.length > 0 ? (
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 shadow-lg overflow-x-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">
                Alerts (CSV - first 8 rows)
              </h3>
              {artifacts.csv && (
                <a
                  href={artifacts.csv}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 underline hover:text-blue-300"
                >
                  View Full CSV
                </a>
              )}
            </div>
            <table className="table-auto w-full text-sm text-left text-gray-300 border-collapse">
              <thead className="bg-gray-700 text-gray-200">
                <tr>
                  {csvData[0]?.map((col, i) => (
                    <th
                      key={i}
                      className="px-4 py-2 border-b border-gray-600"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvData.slice(1, 9).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-700/50">
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className="px-4 py-2 border-b border-gray-700"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400">
            No analysis results yet. Upload a video first.
          </p>
        )}

        {/* Map View */}
        {artifacts.map && (
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 shadow-lg">
            <h3 className="text-xl font-semibold text-white mb-4">
              Geospatial Map
            </h3>
            <iframe
              src={artifacts.map}
              className="w-full h-[500px] rounded-xl border border-gray-600"
              title="Analysis Map"
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default Dashboard;
