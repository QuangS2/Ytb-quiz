import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import api from '../services/api';
import { AlertTriangle, Loader2 } from 'lucide-react';

export const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    
    if (!code) {
      setError('Không tìm thấy mã xác thực Google (Auth Code).');
      return;
    }

    const exchangeCode = async () => {
      try {
        const redirectUri = `${window.location.origin}/auth/callback`;
        const response = await api.post('/api/auth/google', { 
          code,
          redirectUri
        });

        const { token, user } = response.data.data;
        
        // Save auth state (this sets in-memory token and profiles)
        login(token, user);
        
        // Redirect user back to Dashboard
        navigate('/', { replace: true });
      } catch (err: any) {
        console.error('OAuth exchange error:', err);
        const errMsg = err.response?.data?.message || 'Không thể liên kết tài khoản Google với máy chủ.';
        setError(errMsg);
      }
    };

    exchangeCode();
  }, [searchParams, login, navigate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        padding: '40px 60px',
        maxWidth: '450px',
        width: '100%',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px'
      }}>
        {error ? (
          <>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-danger)'
            }}>
              <AlertTriangle size={28} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Đăng nhập thất bại</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
              {error}
            </p>
            <button 
              className="btn-glow" 
              onClick={() => navigate('/')}
              style={{
                marginTop: '10px',
                padding: '10px 24px',
                borderRadius: 'var(--border-radius-md)',
                fontSize: '14px'
              }}
            >
              Quay lại Bảng điều khiển
            </button>
          </>
        ) : (
          <>
            <Loader2 className="transition-all-ease" size={40} color="var(--color-primary)" style={{
              animation: 'spin 1.5s linear infinite'
            }} />
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Đang xử lý đăng nhập...</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
              Chúng tôi đang xác thực tài khoản Google của bạn với máy chủ. Vui lòng chờ trong giây lát.
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AuthCallback;
