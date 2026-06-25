import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Key, 
  Eye, 
  EyeOff, 
  Cpu, 
  CheckCircle2, 
  XCircle, 
  HelpCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export const Settings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [devicePerformance, setDevicePerformance] = useState<'low' | 'high'>('low');
  
  // Validation States
  const [validationStatus, setValidationStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  // Load configs on mount
  useEffect(() => {
    setApiKey(localStorage.getItem('gemini_api_key') || '');
    setDevicePerformance((localStorage.getItem('device_performance') as 'low' | 'high') || 'low');

    const handleKeyUpdate = () => {
      setApiKey(localStorage.getItem('gemini_api_key') || '');
    };
    window.addEventListener('geminiKeyUpdated', handleKeyUpdate);
    return () => window.removeEventListener('geminiKeyUpdated', handleKeyUpdate);
  }, []);

  // Handle Validation call
  const handleValidateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setValidationStatus('error');
      setValidationMessage('Vui lòng nhập API Key trước khi kiểm tra.');
      return;
    }

    setValidationStatus('testing');
    setValidationMessage(null);

    try {
      // Explicitly pass the key in headers for validation request
      const response = await api.post('/api/config/validate-key', {}, {
        headers: {
          'x-gemini-key': apiKey.trim()
        }
      });
      
      setValidationStatus('success');
      setValidationMessage(response.data.message || 'Khóa API Gemini hoạt động tốt.');
      
      // Save valid key to storage and trigger syncing
      localStorage.setItem('gemini_api_key', apiKey.trim());
      window.dispatchEvent(new Event('geminiKeyUpdated'));
    } catch (err: any) {
      console.error('Validation error:', err);
      setValidationStatus('error');
      const errDetail = err.response?.data?.message || 'Có lỗi kết nối xảy ra khi xác thực API Key.';
      setValidationMessage(errDetail);
    }
  };

  // Handle performance toggle
  const handlePerformanceChange = (perf: 'low' | 'high') => {
    setDevicePerformance(perf);
    localStorage.setItem('device_performance', perf);
    window.dispatchEvent(new Event('geminiKeyUpdated'));
  };

  // Handle manual save
  const handleSaveKey = () => {
    localStorage.setItem('gemini_api_key', apiKey.trim());
    window.dispatchEvent(new Event('geminiKeyUpdated'));
    setValidationStatus('success');
    setValidationMessage('Đã lưu khóa API thành công.');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '8px' }}>
          Cấu Hình Ứng Dụng
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          Quản lý khóa API trí tuệ nhân tạo Gemini cá nhân và cài đặt hiệu suất máy khách.
        </p>
      </div>

      <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Main Configuration Form */}
        <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Gemini Key Input Block */}
          <form onSubmit={handleValidateKey} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={16} color="var(--color-primary)" />
                <span>Google Gemini API Key</span>
              </label>
              
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(31, 42, 64, 0.4)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--glass-border)', paddingRight: '12px' }}>
                <input 
                  type={showKey ? 'text' : 'password'}
                  placeholder="Nhập AI Key của bạn (AIzaSy...)"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    if (validationStatus !== 'idle') setValidationStatus('idle');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-primary)',
                    padding: '14px 16px',
                    fontSize: '14px',
                    width: '100%',
                    outline: 'none',
                    fontFamily: 'monospace'
                  }}
                />
                <button 
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px' }}
                >
                  {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Validation Message Box */}
            {validationStatus !== 'idle' && validationMessage && (
              <div className="glass-panel" style={{ 
                padding: '12px 16px', 
                borderRadius: 'var(--border-radius-sm)',
                background: validationStatus === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                borderColor: validationStatus === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '13px'
              }}>
                {validationStatus === 'success' ? (
                  <CheckCircle2 size={16} color="var(--color-success)" style={{ flexShrink: 0 }} />
                ) : (
                  <XCircle size={16} color="var(--color-danger)" style={{ flexShrink: 0 }} />
                )}
                <span style={{ color: validationStatus === 'success' ? 'var(--text-primary)' : 'var(--text-primary)' }}>
                  {validationMessage}
                </span>
              </div>
            )}

            {/* Form Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
              <button 
                type="submit"
                className="btn-glow"
                disabled={validationStatus === 'testing'}
                style={{
                  padding: '12px 20px',
                  borderRadius: 'var(--border-radius-md)',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexGrow: 1,
                  justifyContent: 'center',
                  opacity: validationStatus === 'testing' ? 0.7 : 1
                }}
              >
                {validationStatus === 'testing' ? 'Đang kiểm tra...' : 'Kiểm tra & Lưu'}
              </button>
              <button 
                type="button"
                onClick={handleSaveKey}
                style={{
                  padding: '12px 20px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--border-radius-md)',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Chỉ lưu
              </button>
            </div>
          </form>

          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)' }} />

          {/* Performance Optimization Switcher */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={16} color="var(--color-success)" />
              <span>Chế độ Tối ưu hóa Hiệu năng (Adaptive Performance)</span>
            </label>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0, lineHeight: 1.4 }}>
              Cài đặt này sẽ gửi gợi ý hiệu năng máy khách đến máy chủ. Chế độ Hiệu năng Cao cho phép server chạy các tiến trình phân tích ngầm nâng cao.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => handlePerformanceChange('low')}
                style={{
                  padding: '14px',
                  background: devicePerformance === 'low' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(31, 42, 64, 0.3)',
                  border: '1px solid',
                  borderColor: devicePerformance === 'low' ? 'var(--color-primary)' : 'var(--glass-border)',
                  color: devicePerformance === 'low' ? '#ffffff' : 'var(--text-secondary)',
                  borderRadius: 'var(--border-radius-md)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Hiệu năng Thấp (Low)
              </button>
              <button
                type="button"
                onClick={() => handlePerformanceChange('high')}
                style={{
                  padding: '14px',
                  background: devicePerformance === 'high' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(31, 42, 64, 0.3)',
                  border: '1px solid',
                  borderColor: devicePerformance === 'high' ? 'var(--color-success)' : 'var(--glass-border)',
                  color: devicePerformance === 'high' ? '#ffffff' : 'var(--text-secondary)',
                  borderRadius: 'var(--border-radius-md)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Hiệu năng Cao (High)
              </button>
            </div>
          </div>
        </div>

        {/* Informative Side Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Guide Box */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-warning)' }}>
              <HelpCircle size={20} />
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Hướng dẫn lấy API Key</h3>
            </div>
            
            <ol style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '10px', lineHeight: 1.4, margin: 0 }}>
              <li>Truy cập Google AI Studio bằng cách nhấn liên kết bên dưới.</li>
              <li>Đăng nhập bằng tài khoản Google.</li>
              <li>Nhấp vào nút <strong>"Get API key"</strong> màu xanh.</li>
              <li>Nhấp vào <strong>"Create API key"</strong>, chọn một dự án Google Cloud và hoàn tất tạo khóa.</li>
              <li>Sao chép khóa đó và dán vào biểu mẫu cấu hình.</li>
            </ol>
            
            <a 
              href="https://aistudio.google.com/" 
              target="_blank" 
              rel="noreferrer" 
              className="input-glow"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px', 
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
                textAlign: 'center',
                background: 'rgba(245, 158, 11, 0.05)',
                borderColor: 'rgba(245, 158, 11, 0.2)',
                color: 'var(--color-warning)',
                marginTop: '4px'
              }}
            >
              <span>AI Studio</span>
              <ExternalLink size={14} />
            </a>
          </div>

          {/* Security Box */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <ShieldCheck size={28} color="var(--color-success)" style={{ flexShrink: 0 }} />
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>Bảo mật API Key</h4>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                Khóa API của bạn được lưu cục bộ trên trình duyệt. Máy chủ Ytb-quiz chỉ nhận khóa này qua các headers được mã hóa HTTPS để gửi trực tiếp đến Google AI và không bao giờ lưu trữ hoặc ghi lại nhật ký khóa này.
              </p>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .settings-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Settings;
