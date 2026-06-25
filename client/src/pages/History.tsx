import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, 
  Loader2, 
  Search, 
  Award, 
  BookOpen, 
  Clock, 
  RefreshCw, 
  Calendar,
  Trophy
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import api from '../services/api';

interface Attempt {
  id: string;
  quizId: string;
  quizTitle: string;
  mode: 'full-test' | 'instant-feedback';
  score: number;
  totalQuestions: number;
  timeTaken: number;
  attemptedAt: string;
}

interface Stats {
  totalAttempts: number;
  totalQuizzes: number;
  averageCorrectRate: number;
  totalTimeTaken: number;
}

interface HistoryData {
  attempts: Attempt[];
  stats: Stats;
}

// Custom Glassmorphic tooltip for the chart
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="glass-panel" style={{ 
        padding: '12px', 
        background: 'var(--glass-bg)', 
        border: '1px solid var(--glass-border)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        borderRadius: 'var(--border-radius-sm)',
        textAlign: 'left'
      }}>
        <p style={{ 
          fontWeight: 700, 
          fontSize: '13px', 
          color: 'var(--text-primary)', 
          margin: '0 0 6px 0', 
          maxWidth: '220px', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap' 
        }}>
          {data.quizTitle}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
          <p style={{ margin: 0, color: 'var(--color-primary)', fontWeight: 600 }}>
            Tỉ lệ đúng: {data.correctRate}%
          </p>
          <p style={{ margin: 0, color: 'var(--color-success)', fontWeight: 600 }}>
            Thời gian: {data.timeTaken} giây
          </p>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '11px' }}>
            Ngày: {data.date}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export const History: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<HistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/users/history');
      if (response.data?.success && response.data?.data) {
        setData(response.data.data);
      } else {
        setError('Dữ liệu phản hồi không hợp lệ.');
      }
    } catch (err: any) {
      console.error('Error fetching history:', err);
      const errMsg = err.response?.data?.message || 'Không thể tải lịch sử làm bài. Vui lòng thử lại sau.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleRetake = (quizId: string) => {
    // Clear draft states for both modes to start fresh
    localStorage.removeItem(`ytb_quiz_draft_${quizId}_full-test_answers`);
    localStorage.removeItem(`ytb_quiz_draft_${quizId}_full-test_index`);
    localStorage.removeItem(`ytb_quiz_draft_${quizId}_instant-feedback_answers`);
    localStorage.removeItem(`ytb_quiz_draft_${quizId}_instant-feedback_index`);
    navigate(`/quiz/${quizId}`);
  };

  const formatTimeTaken = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours} giờ ${minutes} phút ${seconds} giây`;
    }
    if (minutes > 0) {
      return `${minutes} phút ${seconds} giây`;
    }
    return `${seconds} giây`;
  };

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return dateStr;
    }
  };

  // Filter attempts based on search criteria
  const filteredAttempts = data?.attempts.filter(attempt =>
    attempt.quizTitle.toLowerCase().includes(searchTerm.trim().toLowerCase())
  ) || [];

  // Sort attempts from oldest to newest for chronological chart data
  const chartData = data?.attempts
    ? [...data.attempts]
        .sort((a, b) => new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime())
        .map((att, idx) => ({
          name: `Lượt ${idx + 1}`,
          quizTitle: att.quizTitle,
          correctRate: Math.round((att.score / att.totalQuestions) * 100),
          timeTaken: att.timeTaken,
          date: new Date(att.attemptedAt).toLocaleDateString('vi-VN'),
        }))
    : [];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <Loader2 style={{ animation: 'spin 1.5s linear infinite' }} size={40} color="var(--color-primary)" />
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Đang tải lịch sử học tập...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ maxWidth: '600px', margin: '80px auto', padding: '32px', textAlign: 'center', borderColor: 'rgba(239, 68, 68, 0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <AlertCircle size={48} color="var(--color-danger)" />
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Tải lịch sử thất bại</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5 }}>{error}</p>
        </div>
        <button 
          onClick={fetchHistory} 
          className="btn-glow"
          style={{ padding: '10px 24px', cursor: 'pointer', borderRadius: 'var(--border-radius-sm)' }}
        >
          Thử lại
        </button>
      </div>
    );
  }

  const stats = data?.stats || { totalAttempts: 0, totalQuizzes: 0, averageCorrectRate: 0, totalTimeTaken: 0 };
  const hasHistory = data?.attempts && data.attempts.length > 0;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`
        .history-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .history-table th {
          padding: 14px 16px;
          border-bottom: 1px solid var(--glass-border);
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 600;
        }
        .history-table td {
          padding: 16px;
          border-bottom: 1px solid var(--glass-border);
          font-size: 13.5px;
          color: var(--text-secondary);
        }
        .history-row {
          transition: background-color 0.2s ease;
        }
        .history-row:hover {
          background-color: rgba(255, 255, 255, 0.02);
        }
        .mode-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }
        .mode-full-test {
          background: rgba(16, 185, 129, 0.1);
          color: var(--color-success);
        }
        .mode-instant {
          background: rgba(59, 130, 246, 0.1);
          color: var(--color-primary);
        }
        .retake-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          background: rgba(31, 42, 64, 0.6);
          border: 1px solid var(--glass-border);
          border-radius: var(--border-radius-sm);
          color: var(--text-primary);
          transition: all 0.2s ease;
        }
        .retake-btn:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.15);
        }
        .search-container {
          position: relative;
          width: 100%;
          max-width: 400px;
        }
        .search-input {
          width: 100%;
          padding: 10px 16px 10px 40px;
        }
        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .stats-card {
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .stats-card.card-blue:hover {
          transform: translateY(-3px);
          border-color: rgba(59, 130, 246, 0.3);
          box-shadow: 0 8px 30px rgba(59, 130, 246, 0.15);
        }
        .stats-card.card-purple:hover {
          transform: translateY(-3px);
          border-color: rgba(168, 85, 247, 0.3);
          box-shadow: 0 8px 30px rgba(168, 85, 247, 0.15);
        }
        .stats-card.card-amber:hover {
          transform: translateY(-3px);
          border-color: rgba(245, 158, 11, 0.3);
          box-shadow: 0 8px 30px rgba(245, 158, 11, 0.15);
        }
        .stats-card.card-green:hover {
          transform: translateY(-3px);
          border-color: rgba(16, 185, 129, 0.3);
          box-shadow: 0 8px 30px rgba(16, 185, 129, 0.15);
        }
        .stats-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '6px' }}>Lịch Sử Làm Bài</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Xem lại danh sách kết quả học tập và các bài quiz đã thực hiện.</p>
        </div>
        {hasHistory && (
          <div className="search-container">
            <Search className="search-icon" size={16} />
            <input 
              type="text"
              placeholder="Tìm kiếm bài quiz đã thi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-glow search-input"
            />
          </div>
        )}
      </div>

      {!hasHistory ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-primary)',
            margin: '0 auto 16px auto'
          }}>
            <AlertCircle size={24} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>Chưa có lịch sử làm bài</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '300px', margin: '0 auto' }}>
            Bắt đầu tạo bài kiểm tra từ video YouTube để tích lũy dữ liệu tiến trình học tập của bạn.
          </p>
        </div>
      ) : (
        <>
          {/* Stats Grid Dashboard */}
          <div className="stats-grid">
            {/* Stat Card 1: Total Attempts */}
            <div className="glass-panel stats-card card-blue">
              <div className="stats-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary)' }}>
                <Award size={24} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Lượt Làm Bài</span>
                <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.totalAttempts}</span>
              </div>
            </div>

            {/* Stat Card 2: Total Quizzes */}
            <div className="glass-panel stats-card card-purple">
              <div className="stats-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.1)', color: 'var(--color-secondary)' }}>
                <BookOpen size={24} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Bài Quiz Khác Nhau</span>
                <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.totalQuizzes}</span>
              </div>
            </div>

            {/* Stat Card 3: Avg Correct Rate */}
            <div className="glass-panel stats-card card-amber">
              <div className="stats-icon-wrapper" style={{ 
                background: stats.averageCorrectRate >= 80 ? 'rgba(16, 185, 129, 0.1)' : stats.averageCorrectRate >= 50 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: stats.averageCorrectRate >= 80 ? 'var(--color-success)' : stats.averageCorrectRate >= 50 ? 'var(--color-warning)' : 'var(--color-danger)'
              }}>
                <Trophy size={24} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Tỉ lệ đúng TB</span>
                <span style={{ 
                  fontSize: '24px', 
                  fontWeight: 800, 
                  color: stats.averageCorrectRate >= 80 ? 'var(--color-success)' : stats.averageCorrectRate >= 50 ? 'var(--color-warning)' : 'var(--color-danger)'
                }}>
                  {Math.round(stats.averageCorrectRate)}%
                </span>
              </div>
            </div>

            {/* Stat Card 4: Total Time Taken */}
            <div className="glass-panel stats-card card-green">
              <div className="stats-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
                <Clock size={24} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Tổng Thời Gian</span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginTop: '4px', lineHeight: '1.2' }}>{formatTimeTaken(stats.totalTimeTaken)}</span>
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, textAlign: 'left' }}>
              Tiến trình Học tập & Hiệu suất
            </h3>
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="var(--text-muted)" 
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="var(--color-primary)" 
                    fontSize={11}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    tickLine={false}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="var(--color-success)" 
                    fontSize={11}
                    tickFormatter={(value) => `${value}s`}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    height={36}
                    iconSize={12}
                    formatter={(value) => (
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                        {value === 'correctRate' ? 'Tỉ lệ đúng (%)' : 'Thời gian (giây)'}
                      </span>
                    )}
                  />
                  <Bar 
                    yAxisId="right"
                    dataKey="timeTaken" 
                    barSize={30} 
                    fill="rgba(16, 185, 129, 0.15)"
                    stroke="var(--color-success)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="correctRate" 
                    stroke="var(--color-primary)" 
                    strokeWidth={3}
                    dot={{ r: 4, stroke: 'var(--color-primary)', strokeWidth: 2, fill: 'var(--bg-primary)' }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Attempts List */}
          <div className="glass-panel" style={{ overflow: 'hidden', padding: '8px 0' }}>
            {filteredAttempts.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Search size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Không tìm thấy kết quả</p>
                <p style={{ fontSize: '12px', maxWidth: '300px', margin: '0 auto' }}>Không có bài quiz nào khớp với từ khóa "{searchTerm}".</p>
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="input-glow" 
                  style={{ marginTop: '12px', fontSize: '12px', padding: '6px 12px', cursor: 'pointer' }}
                >
                  Xóa bộ lọc
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Tên bài Quiz</th>
                      <th>Chế độ</th>
                      <th>Điểm số</th>
                      <th>Thời gian</th>
                      <th>Ngày thực hiện</th>
                      <th style={{ textAlign: 'right' }}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttempts.map((attempt) => {
                      const correctRate = (attempt.score / attempt.totalQuestions) * 100;
                      let scoreColor = 'var(--text-secondary)';
                      if (correctRate >= 80) scoreColor = 'var(--color-success)';
                      else if (correctRate >= 50) scoreColor = 'var(--color-warning)';
                      else if (attempt.totalQuestions > 0) scoreColor = 'var(--color-danger)';

                      return (
                        <tr key={attempt.id} className="history-row">
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)', minWidth: '200px' }}>
                            {attempt.quizTitle}
                          </td>
                          <td>
                            <span className={`mode-badge ${attempt.mode === 'full-test' ? 'mode-full-test' : 'mode-instant'}`}>
                              {attempt.mode === 'full-test' ? 'Thi thử' : 'Luyện tập'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: scoreColor }}>
                            {attempt.score}/{attempt.totalQuestions} ({Math.round(correctRate)}%)
                          </td>
                          <td>{formatDuration(attempt.timeTaken)}</td>
                          <td style={{ fontSize: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                              <span>{formatDate(attempt.attemptedAt)}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              onClick={() => handleRetake(attempt.quizId)}
                              className="retake-btn"
                              title="Làm lại bài thi này"
                            >
                              <RefreshCw size={12} />
                              <span>Làm lại</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default History;
