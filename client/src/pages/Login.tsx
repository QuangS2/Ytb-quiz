import React from 'react';
import { GoogleLoginButton } from '../features/auth/components/GoogleLoginButton';
import { Video } from 'lucide-react';

export const Login: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        padding: '48px 40px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px'
      }}>
        <div style={{
          background: 'var(--gradient-neon)',
          borderRadius: 'var(--border-radius-md)',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--gradient-glow)'
        }}>
          <Video size={36} color="#fff" />
        </div>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
            Chào mừng bạn đến
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
            Đăng nhập để tạo quiz, theo dõi lịch sử thi và lưu trữ tiến trình học tập của bạn.
          </p>
        </div>
        <GoogleLoginButton />
      </div>
    </div>
  );
};

export default Login;
