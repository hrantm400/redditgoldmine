import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const RedditCharts = ({ karmaGrowthData, activityByDay, postKarma, commentKarma, postingTimeAnalysis }) => {
  // Heatmap data (simplified - last 30 days)
  // Using karmaGrowthData if available, otherwise generate placeholder
  const generateHeatmapData = () => {
    const days = [];
    const today = new Date();
    const dataMap = {};
    
    // Map existing karma growth data by date
    if (karmaGrowthData && karmaGrowthData.length > 0) {
      karmaGrowthData.forEach(item => {
        dataMap[item.date] = item.score || 0;
      });
    }
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        day: date.getDate(),
        weekday: date.getDay(),
        count: dataMap[dateStr] || 0,
      });
    }
    return days;
  };

  const heatmapData = generateHeatmapData();
  const maxCount = Math.max(...heatmapData.map(d => d.count), 1);
  const getColorIndex = (count) => {
    if (count === 0) return 0;
    const ratio = count / maxCount;
    if (ratio < 0.2) return 1;
    if (ratio < 0.4) return 2;
    if (ratio < 0.6) return 3;
    return 4;
  };
  const colors = ['#f0f0f0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'];

  return (
    <div className="space-y-6">
      {/* Karma Growth Chart */}
      {karmaGrowthData && karmaGrowthData.length > 0 && (
        <div className="card-neo p-6">
          <h4 className="text-xl font-display font-bold text-neo-black mb-4">Karma Growth Over Time</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={karmaGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="karma" stroke="#FF6B6B" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Activity by Day of Week */}
      {activityByDay && (
        <div className="card-neo p-6">
          <h4 className="text-xl font-display font-bold text-neo-black mb-4">Activity by Day of Week</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={activityByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#4ECDC4" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Posts vs Comments */}
      <div className="card-neo p-6">
        <h4 className="text-xl font-display font-bold text-neo-black mb-4">Posts vs Comments Karma</h4>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={[
                { name: 'Posts', value: postKarma },
                { name: 'Comments', value: commentKarma },
              ]}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              <Cell fill="#FF6B6B" />
              <Cell fill="#4ECDC4" />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Simple Heatmap */}
      <div className="card-neo p-6">
        <h4 className="text-xl font-display font-bold text-neo-black mb-4">Activity Heatmap (Last 30 Days)</h4>
        <div className="grid grid-cols-7 gap-1">
          {heatmapData.map((item, idx) => (
            <div
              key={idx}
              className="aspect-square border-2 border-neo-black"
              style={{ backgroundColor: colors[getColorIndex(item.count)] }}
              title={`${item.date}: ${item.count > 0 ? item.count + ' karma' : 'No activity'}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-4 text-sm">
          <span>Less</span>
          {colors.map((color, idx) => (
            <div key={idx} className="w-4 h-4 border border-neo-black" style={{ backgroundColor: color }} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
};

export default RedditCharts;

