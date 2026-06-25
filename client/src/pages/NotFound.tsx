import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '60vh', 
      textAlign: 'center',
      gap: '20px'
    }}>
      <div className="glass-panel" style={{ padding: '40px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <HelpCircle size={64} color="var(--color-secondary)" />
        <h1 style={{ fontSize: '48px', fontWeight: 800, margin: 0 }}>404</h1>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>Không tìm thấy trang yêu cầu</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '360px' }}>
          Đường dẫn bạn đang truy cập không tồn tại hoặc đã bị gỡ bỏ. Vui lòng quay về trang chủ.
        </p>
        <Link 
          to="/" 
          className="btn-glow" 
          style={{ 
            marginTop: '12px', 
            padding: '12px 24px', 
            borderRadius: 'var(--border-radius-md)', 
            textDecoration: 'none',
            fontSize: '14px'
          }}
        >
          Quay lại Bảng điều khiển
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
