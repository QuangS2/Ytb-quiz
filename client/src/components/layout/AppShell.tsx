import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  History, 
  Settings, 
  Menu, 
  X, 
  Key, 
  Cpu, 
  User, 
  Eye, 
  EyeOff, 
  CheckCircle,
  Video,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../features/auth/context/AuthContext';
import { GoogleLoginButton } from '../../features/auth/components/GoogleLoginButton';

interface AppShellProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const AppShell: React.FC<AppShellProps> = ({ 
  children, 
  activeTab = 'dashboard', 
  onTabChange 
}) => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Gemini API Key State
  const [geminiKey, setGeminiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isKeySaved, setIsKeySaved] = useState(false);
  
  // Performance State
  const [performance, setPerformance] = useState<'low' | 'high'>('low');

  // Load configuration from localStorage on mount
  useEffect(() => {
    const loadSettings = () => {
      setGeminiKey(localStorage.getItem('gemini_api_key') || '');
      setPerformance((localStorage.getItem('device_performance') as 'low' | 'high') || 'low');
    };
    
    loadSettings();
    
    window.addEventListener('geminiKeyUpdated', loadSettings);
    return () => window.removeEventListener('geminiKeyUpdated', loadSettings);
  }, []);

  // Save API Key helper
  const handleSaveKey = (val: string) => {
    setGeminiKey(val);
    localStorage.setItem('gemini_api_key', val);
    window.dispatchEvent(new Event('geminiKeyUpdated'));
    
    // Trigger dynamic Visual Feedback
    setIsKeySaved(true);
    const timer = setTimeout(() => setIsKeySaved(false), 1500);
    return () => clearTimeout(timer);
  };

  // Toggle Performance helper
  const togglePerformance = () => {
    const nextPerf = performance === 'low' ? 'high' : 'low';
    setPerformance(nextPerf);
    localStorage.setItem('device_performance', nextPerf);
  };

  const navItems = [
    { id: 'dashboard', label: 'Tạo Quiz', icon: LayoutDashboard },
    { id: 'history', label: 'Lịch sử làm bài', icon: History },
    { id: 'settings', label: 'Cấu hình', icon: Settings },
  ];

  return (
    <div className="app-container">
      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 45
          }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <aside className={`app-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div style={{
          height: 'var(--header-height)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: '1px solid var(--glass-border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'var(--gradient-neon)',
              borderRadius: 'var(--border-radius-sm)',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Video size={20} color="#fff" />
            </div>
            <span style={{ 
              fontWeight: 800, 
              fontSize: '20px', 
              letterSpacing: '0.5px',
              background: 'linear-gradient(to right, #ffffff, var(--text-secondary))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Ytb-quiz
            </span>
          </div>
          <button 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-primary)', 
              cursor: 'pointer',
              display: 'none' // will show in mobile view only via CSS media queries later
            }}
            className="mobile-close-btn"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="nav-menu">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <a 
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (onTabChange) onTabChange(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </a>
              </li>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', padding: '24px', borderTop: '1px solid var(--glass-border)' }}>
          {user ? (
            <div className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {user.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt={user.displayName}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1px solid var(--glass-border)'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary)'
                  }}>
                    <User size={18} />
                  </div>
                )}
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    {user.displayName}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                    {user.email}
                  </p>
                </div>
              </div>
              <button 
                onClick={logout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 'var(--border-radius-sm)',
                  color: 'var(--color-danger)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <LogOut size={12} />
                <span>Đăng xuất</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="glass-panel" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)'
                }}>
                  <User size={18} />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Khách</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Chưa đăng nhập</p>
                </div>
              </div>
              <GoogleLoginButton />
            </div>
          )}
        </div>
      </aside>

      {/* Main Panel */}
      <div className="app-main">
        {/* Header Component */}
        <header className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={22} style={{ display: 'block' }} />
            </button>
            <h1 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
              {navItems.find(n => n.id === activeTab)?.label || 'Bảng điều khiển'}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Adaptive Performance Settings Toggle */}
            <button 
              onClick={togglePerformance}
              className="input-glow"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                cursor: 'pointer',
                fontSize: '13px',
                padding: '6px 12px',
                background: performance === 'high' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(31, 42, 64, 0.6)',
                borderColor: performance === 'high' ? 'var(--color-success)' : 'var(--glass-border)'
              }}
            >
              <Cpu size={14} color={performance === 'high' ? 'var(--color-success)' : 'var(--text-secondary)'} />
              <span>Hiệu năng: <strong>{performance === 'high' ? 'Cao' : 'Thấp'}</strong></span>
            </button>

            {/* Gemini Key Configuration Fields in Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(31, 42, 64, 0.6)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--glass-border)', paddingRight: '8px' }}>
                <div style={{ padding: '0 8px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                  <Key size={14} />
                </div>
                <input 
                  type={showKey ? 'text' : 'password'}
                  placeholder="Gemini API Key..."
                  value={geminiKey}
                  onChange={(e) => handleSaveKey(e.target.value)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-primary)',
                    padding: '6px 0',
                    fontSize: '13px',
                    width: '180px',
                    outline: 'none',
                    fontFamily: 'monospace'
                  }}
                />
                <button 
                  onClick={() => setShowKey(!showKey)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              
              {/* Dynamic Micro-Feedback Message */}
              {isKeySaved && (
                <div style={{
                  position: 'absolute',
                  bottom: '-24px',
                  right: '0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--color-success)',
                  fontSize: '11px',
                  fontWeight: 500,
                  animation: 'fadeIn 0.2s ease'
                }}>
                  <CheckCircle size={10} />
                  <span>Đã lưu!</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Content Panel */}
        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
};
