import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { extractYoutubeId } from '../utils/youtube';
import { 
  Search, 
  AlertTriangle, 
  Loader2,
  Sparkles,
  Info
} from 'lucide-react';

interface YoutubeIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

const YoutubeIcon: React.FC<YoutubeIconProps> = ({ size = 24, ...props }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} {...props}>
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [urlInput, setUrlInput] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [perfSetting, setPerfSetting] = useState<'low' | 'high'>('low');
  
  // Validation & Error States
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  
  // Loading & Generation States
  const [status, setStatus] = useState<'idle' | 'generating' | 'success'>('idle');
  const [loadingStep, setLoadingStep] = useState(0);

  // Sync settings and check API key presence
  useEffect(() => {
    const checkApiKey = () => {
      const key = localStorage.getItem('gemini_api_key');
      setHasApiKey(!!key && key.trim().length > 0);
    };

    const loadPerformance = () => {
      const perf = (localStorage.getItem('device_performance') as 'low' | 'high') || 'low';
      setPerfSetting(perf);
    };

    checkApiKey();
    loadPerformance();

    // Listen to changes from settings page
    window.addEventListener('geminiKeyUpdated', checkApiKey);
    window.addEventListener('geminiKeyUpdated', loadPerformance);
    return () => {
      window.removeEventListener('geminiKeyUpdated', checkApiKey);
      window.removeEventListener('geminiKeyUpdated', loadPerformance);
    };
  }, []);

  // Animate loading text steps during API call
  useEffect(() => {
    if (status !== 'generating') return;
    
    const steps = [
      'Đang kết nối máy chủ YouTube...',
      'Đang trích xuất dữ liệu âm thanh và transcript...',
      'Đang phân tích bài giảng với mô hình AI Gemini...',
      'Đang biên soạn câu hỏi trắc nghiệm thông minh...',
      'Hoàn tất thiết kế bài Quiz!'
    ];

    const timer = setInterval(() => {
      setLoadingStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 9000);

    return () => clearInterval(timer);
  }, [status]);

  // Handle URL change & live validation
  const handleUrlChange = (val: string) => {
    setUrlInput(val);
    setSubmissionError(null);
    
    if (!val.trim()) {
      setValidationError(null);
      return;
    }

    const videoId = extractYoutubeId(val);
    if (!videoId) {
      setValidationError('Liên kết video YouTube không hợp lệ hoặc sai định dạng.');
    } else {
      setValidationError(null);
    }
  };

  // Submit and trigger Generation
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);

    const videoId = extractYoutubeId(urlInput);
    if (!videoId) {
      setValidationError('Vui lòng nhập một liên kết YouTube hợp lệ.');
      return;
    }

    if (!hasApiKey) {
      setSubmissionError('Bạn cần phải cung cấp Gemini API Key ở góc trên bên phải trước khi tiếp tục.');
      return;
    }

    setStatus('generating');
    setLoadingStep(0);

    try {
      // POST Request calling the API endpoints register
      const response = await api.post('/api/quizzes/generate', {
        url: urlInput.trim()
      });

      const quizData = response.data.data;
      setStatus('success');
      
      // Delay navigation slightly to let success animation play
      setTimeout(() => {
        navigate(`/quiz/${quizData.id}`);
      }, 1000);
    } catch (err: any) {
      console.error('Quiz generation error:', err);
      setStatus('idle');
      const errorMsg = err.response?.data?.message || 'Không thể tạo quiz từ liên kết này. Vui lòng thử lại sau.';
      setSubmissionError(errorMsg);
    }
  };

  const stepsText = [
    'Đang kết nối máy chủ YouTube...',
    'Đang trích xuất dữ liệu âm thanh và transcript...',
    'Đang phân tích bài giảng với mô hình AI Gemini...',
    'Đang biên soạn câu hỏi trắc nghiệm thông minh...',
    'Hoàn tất thiết kế bài Quiz!'
  ];

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto 0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title block */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h2 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '12px' }}>
          Chuyển Video YouTube Thành Bài Quiz
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: 1.5 }}>
          Nhập liên kết bài giảng hoặc video học tập để tự động tạo bộ câu hỏi trắc nghiệm ôn tập thông minh sử dụng Gemini AI.
        </p>
      </div>

      {/* Warning Banner if API Key is missing */}
      {!hasApiKey && (
        <div className="glass-panel" style={{
          padding: '16px 20px',
          borderColor: 'rgba(245, 158, 11, 0.3)',
          background: 'rgba(245, 158, 11, 0.05)',
          borderRadius: 'var(--border-radius-md)',
          display: 'flex',
          gap: '16px',
          alignItems: 'center'
        }}>
          <AlertTriangle size={24} color="var(--color-warning)" style={{ flexShrink: 0 }} />
          <div style={{ textAlign: 'left', flexGrow: 1 }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-warning)', margin: '0 0 4px 0' }}>
              Thiếu cấu hình Gemini API Key
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Bạn cần cung cấp API Key cá nhân để chạy các tác vụ AI. Hãy nhập khóa ở góc trên bên phải hoặc vào mục <strong>Cấu hình</strong>.
            </p>
          </div>
          <button 
            onClick={() => navigate('/settings')}
            className="input-glow"
            style={{ fontSize: '12px', padding: '6px 12px', cursor: 'pointer', borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', fontWeight: 600 }}
          >
            Đi tới Cấu hình
          </button>
        </div>
      )}

      {/* Main Form container */}
      {status === 'generating' ? (
        <div className="glass-panel" style={{
          padding: '48px 32px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          animation: 'fadeIn 0.3s ease'
        }}>
          <Loader2 style={{ animation: 'spin 1.5s linear infinite' }} size={48} color="var(--color-primary)" />
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              {stepsText[loadingStep]}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '400px', margin: '0 auto' }}>
              Việc trích xuất và thiết kế câu hỏi trắc nghiệm có thể mất từ 15 đến 45 giây tùy thuộc độ dài video và cấu hình hiệu năng.
            </p>
          </div>
          
          {/* Progress bar visual indicator */}
          <div style={{ width: '100%', maxWidth: '320px', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
            <div style={{
              width: `${((loadingStep + 1) / stepsText.length) * 100}%`,
              height: '100%',
              background: 'var(--gradient-neon)',
              transition: 'width 0.5s ease',
              borderRadius: '3px'
            }} />
          </div>
        </div>
      ) : (
        <form onSubmit={handleGenerate} className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <YoutubeIcon size={16} color="var(--color-danger)" />
              <span>Liên kết video YouTube</span>
            </label>
            
            <div className="input-group-responsive" style={{ display: 'flex', gap: '12px' }}>
              <div style={{ 
                display: 'flex', 
                flexGrow: 1, 
                alignItems: 'center', 
                background: 'rgba(31, 42, 64, 0.4)', 
                borderRadius: 'var(--border-radius-md)', 
                border: '1px solid',
                borderColor: validationError ? 'var(--color-danger)' : 'var(--glass-border)',
                paddingLeft: '16px',
                transition: 'all 0.2s ease'
              }}>
                <YoutubeIcon size={20} color={validationError ? 'var(--color-danger)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                <input 
                  type="text" 
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={urlInput}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-primary)',
                    padding: '16px 12px',
                    fontSize: '15px',
                    width: '100%',
                    outline: 'none'
                  }}
                />
              </div>
              <button 
                type="submit"
                className="btn-glow"
                disabled={!!validationError || !urlInput.trim()}
                style={{
                  padding: '0 28px',
                  borderRadius: 'var(--border-radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '15px',
                  height: '54px',
                  opacity: (!!validationError || !urlInput.trim()) ? 0.6 : 1,
                  cursor: (!!validationError || !urlInput.trim()) ? 'not-allowed' : 'pointer'
                }}
              >
                <Search size={18} />
                <span>Tạo Quiz</span>
              </button>
            </div>
            
            {/* Validation warning feedback */}
            {validationError && (
              <span style={{ color: 'var(--color-danger)', fontSize: '12px', textAlign: 'left', marginTop: '4px', display: 'block' }}>
                {validationError}
              </span>
            )}

            {/* API Submission Error */}
            {submissionError && (
              <div className="glass-panel" style={{ 
                padding: '12px 16px', 
                borderRadius: 'var(--border-radius-sm)',
                background: 'rgba(239, 68, 68, 0.08)',
                borderColor: 'rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '13px',
                marginTop: '12px'
              }}>
                <AlertTriangle size={16} color="var(--color-danger)" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--text-primary)', textAlign: 'left' }}>
                  {submissionError}
                </span>
              </div>
            )}
          </div>
          
          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)' }} />

          {/* Quick Informational Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '4px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', textAlign: 'left' }}>
              <Sparkles size={18} color="var(--color-primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600 }}>Tạo Quiz Tự Động Với Gemini AI</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Phân tích bài phát biểu, bài giảng dài để chọn lọc những ý trọng tâm và tạo câu hỏi kèm lời giải thích đầy đủ.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', textAlign: 'left' }}>
              <Info size={18} color="var(--color-success)" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600 }}>Đồng Bộ Hiệu Năng: <strong>{perfSetting === 'high' ? 'Cao' : 'Thấp'}</strong></p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Đang chạy ở chế độ cấu hình hiệu năng {perfSetting === 'high' ? 'Cao (hỗ trợ xử lý background và refresh AI ngầm)' : 'Thấp (ưu tiên hiển thị kết quả cache tức thì)'}.</p>
              </div>
            </div>
          </div>
        </form>
      )}
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .btn-glow {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .btn-glow:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
        }
        .btn-glow:active:not(:disabled) {
          transform: translateY(1px);
        }
        @media (max-width: 600px) {
          .input-group-responsive {
            flex-direction: column;
          }
          .input-group-responsive button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
