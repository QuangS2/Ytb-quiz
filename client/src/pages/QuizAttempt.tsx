import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useQuizAttempt } from '../features/quiz/hooks/useQuizAttempt';
import type { QuizData } from '../features/quiz/hooks/useQuizAttempt';
import { Timer } from '../features/quiz/components/Timer';
import { 
  Loader2, 
  AlertTriangle, 
  ArrowLeft, 
  BookOpen, 
  Award, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Play,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

export const QuizAttempt: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Component states
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [mode, setMode] = useState<'full-test' | 'instant-feedback' | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Elapsed time tracker ref
  const timeTakenRef = useRef(0);

  // Fetch quiz data & restore draft on mount
  useEffect(() => {
    const fetchQuiz = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get(`/api/quizzes/${id}`);
        const quizData = response.data.data;
        setQuiz(quizData);

        // Auto-bypass selection screen if a draft exists in localStorage
        const hasFullTestDraft = localStorage.getItem(`ytb_quiz_draft_${id}_full-test_answers`);
        const hasInstantFeedbackDraft = localStorage.getItem(`ytb_quiz_draft_${id}_instant-feedback_answers`);

        if (hasFullTestDraft) {
          setMode('full-test');
          setHasStarted(true);
        } else if (hasInstantFeedbackDraft) {
          setMode('instant-feedback');
          setHasStarted(true);
        }
      } catch (err: any) {
        console.error('Error fetching quiz:', err);
        const errMsg = err.response?.data?.message || 'Không thể tải thông tin bài trắc nghiệm này. Vui lòng quay lại sau.';
        setError(errMsg);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchQuiz();
    }
  }, [id]);

  // Execute hook only when quiz is loaded and mode selected
  const attempt = useQuizAttempt({
    quiz: quiz || { id: '', title: '', youtubeId: '', questions: [] },
    mode: mode || 'full-test',
    onSuccessSubmit: () => {
      // Optional callback logic
    },
    onQuizUpdate: setQuiz
  });

  const handleTimeChange = (seconds: number) => {
    timeTakenRef.current = seconds;
  };

  const handleExitWithConfirmation = () => {
    if (!attempt.isSubmitted && hasStarted) {
      const confirmExit = window.confirm('Bài thi đang diễn ra. Tiến trình của bạn sẽ được lưu dưới dạng nháp. Bạn có chắc muốn thoát không?');
      if (!confirmExit) return;
    }
    navigate('/');
  };

  // Reset or restart quiz attempt wrapper
  const handleRetry = () => {
    attempt.resetAttempt();
    setHasStarted(false);
    setMode(null);
    timeTakenRef.current = 0;
  };

  // Format elapsed seconds for display in summary
  const formatElapsed = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 1. Loading state view
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <Loader2 style={{ animation: 'spin 1.5s linear infinite' }} size={40} color="var(--color-primary)" />
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Đang tải nội dung câu hỏi...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // 2. Error state view
  if (error || !quiz) {
    return (
      <div className="glass-panel" style={{ maxWidth: '600px', margin: '80px auto', padding: '32px', textAlign: 'center', borderColor: 'rgba(239, 68, 68, 0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <AlertTriangle size={48} color="var(--color-danger)" />
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Tải bài trắc nghiệm thất bại</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5 }}>{error || 'Không tìm thấy bài trắc nghiệm.'}</p>
        </div>
        <button 
          onClick={() => navigate('/')} 
          className="btn-glow"
          style={{ padding: '10px 24px', cursor: 'pointer', borderRadius: 'var(--border-radius-sm)' }}
        >
          Quay lại Bảng điều khiển
        </button>
      </div>
    );
  }

  // 3. Pre-quiz Mode Selector screen
  if (!hasStarted || !mode) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto 0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={() => navigate('/')} 
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '4px', fontSize: '14px' }}
          >
            <ArrowLeft size={16} />
            <span>Quay lại</span>
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>{quiz.title}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '600px', margin: '0 auto' }}>
            {quiz.description || 'Bài tập trắc nghiệm thông minh biên soạn bởi AI giúp củng cố kiến thức.'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Instant Feedback Card */}
          <div 
            className="glass-panel" 
            onClick={() => setMode('instant-feedback')}
            style={{
              padding: '24px',
              borderRadius: 'var(--border-radius-md)',
              cursor: 'pointer',
              borderWidth: '2px',
              borderColor: mode === 'instant-feedback' ? 'var(--color-primary)' : 'var(--glass-border)',
              background: mode === 'instant-feedback' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(31, 42, 64, 0.2)',
              textAlign: 'left',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary)' }}>
                <BookOpen size={24} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Chế độ Luyện tập</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, flexGrow: 1 }}>
              Xem kết quả đúng/sai và lời giải thích chi tiết ngay sau mỗi câu hỏi. Phù hợp để ôn tập và củng cố kiến thức từng bước một.
            </p>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)' }}>Instant Feedback Mode</span>
          </div>

          {/* Full Test Card */}
          <div 
            className="glass-panel" 
            onClick={() => setMode('full-test')}
            style={{
              padding: '24px',
              borderRadius: 'var(--border-radius-md)',
              cursor: 'pointer',
              borderWidth: '2px',
              borderColor: mode === 'full-test' ? 'var(--color-primary)' : 'var(--glass-border)',
              background: mode === 'full-test' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(31, 42, 64, 0.2)',
              textAlign: 'left',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
                <Award size={24} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Chế độ Thi thử</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, flexGrow: 1 }}>
              Làm toàn bộ bài thi trước dưới áp lực thời gian. Kết quả, điểm số và giải thích đáp án chỉ được hiển thị sau khi nộp bài thi.
            </p>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-success)' }}>Full Test Mode</span>
          </div>
        </div>

        <button 
          onClick={() => setHasStarted(true)}
          disabled={!mode}
          className="btn-glow"
          style={{
            marginTop: '12px',
            alignSelf: 'center',
            padding: '14px 48px',
            borderRadius: 'var(--border-radius-sm)',
            fontSize: '16px',
            fontWeight: 700,
            cursor: !mode ? 'not-allowed' : 'pointer',
            opacity: !mode ? 0.6 : 1
          }}
        >
          <Play size={16} style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'text-bottom' }} />
          <span>Bắt đầu làm bài</span>
        </button>
      </div>
    );
  }

  // Current active question detail
  const activeQ = attempt.currentQuestion;

  // 4. Main active quiz attempt screen
  return (
    <div style={{ maxWidth: '1200px', margin: '20px auto 0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Header Row with Timer & Exit */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={handleExitWithConfirmation}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '4px', fontSize: '14px' }}
          >
            <ArrowLeft size={16} />
            <span>Thoát</span>
          </button>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>{quiz.title}</h2>
          <span style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '12px',
            background: mode === 'full-test' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
            color: mode === 'full-test' ? 'var(--color-success)' : 'var(--color-primary)',
            fontWeight: 600
          }}>
            {mode === 'full-test' ? 'Thi thử' : 'Luyện tập'}
          </span>
        </div>

        {/* Isolated Timer Component */}
        <Timer 
          key={`timer-${quiz.id}-${mode}-${hasStarted}`} // Ensure reset on restart
          isActive={hasStarted && !attempt.isSubmitted} 
          onTimeChange={handleTimeChange} 
        />
      </div>

      {/* Split Layout Container */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        
        {/* Column 1: YouTube video player */}
        <div style={{ flex: 1.2, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div 
            style={{ 
              position: 'relative', 
              paddingBottom: '56.25%', // 16:9 Aspect Ratio
              height: 0, 
              overflow: 'hidden', 
              borderRadius: 'var(--border-radius-md)', 
              border: '1px solid var(--glass-border)', 
              background: '#000',
              boxShadow: '0 4px 30px rgba(0, 0, 0, 0.2)'
            }}
          >
            <iframe
              title={quiz.title}
              src={`https://www.youtube.com/embed/${quiz.youtubeId}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-popups"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            />
          </div>
          <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--border-radius-md)', textAlign: 'left' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>Hướng dẫn làm bài</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Hãy xem bài giảng bên trên để đối chiếu kiến thức nếu cần thiết. Bạn có thể sử dụng các phím số ở góc dưới để chuyển đổi câu hỏi.
            </p>
          </div>
        </div>

        {/* Column 2: Quiz interactive panels */}
        <div style={{ flex: 1.5, minWidth: '350px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Summary results card at top if submitted */}
          {attempt.isSubmitted && (
            <div className="glass-panel animate-fadeIn" style={{
              padding: '24px',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--glass-border)',
              background: 'linear-gradient(135deg, rgba(31, 42, 64, 0.6), rgba(15, 23, 42, 0.8))',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              textAlign: 'center'
            }}>
              <Award size={40} color="var(--color-warning)" style={{ filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.4))' }} />
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>Hoàn thành bài Quiz!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Cảm ơn bạn đã thực hiện bài thi ôn tập.</p>
              </div>

              <div style={{ display: 'flex', gap: '32px', margin: '8px 0' }}>
                <div>
                  <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-primary)' }}>
                    {attempt.score}/{attempt.questions.length}
                  </span>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'uppercase' }}>Điểm số</p>
                </div>
                <div style={{ borderLeft: '1px solid var(--glass-border)' }} />
                <div>
                  <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-success)' }}>
                    {Math.round((attempt.score / attempt.questions.length) * 100)}%
                  </span>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'uppercase' }}>Tỉ lệ đúng</p>
                </div>
                <div style={{ borderLeft: '1px solid var(--glass-border)' }} />
                <div>
                  <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-secondary)' }}>
                    {formatElapsed(timeTakenRef.current)}
                  </span>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'uppercase' }}>Thời gian</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '420px', flexWrap: 'wrap' }}>
                <button 
                  onClick={handleRetry} 
                  className="input-glow"
                  style={{ flex: '1 1 100px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', borderRadius: 'var(--border-radius-sm)' }}
                >
                  <RefreshCw size={14} />
                  <span>Làm lại</span>
                </button>
                <button 
                  onClick={() => navigate('/history')} 
                  className="input-glow"
                  style={{ flex: '1 1 100px', padding: '10px', cursor: 'pointer', borderRadius: 'var(--border-radius-sm)', borderColor: 'var(--glass-border)' }}
                >
                  Xem Lịch sử
                </button>
                <button 
                  onClick={() => navigate('/')} 
                  className="btn-glow"
                  style={{ flex: '1.2 1 120px', padding: '10px', cursor: 'pointer', borderRadius: 'var(--border-radius-sm)' }}
                >
                  Bảng điều khiển
                </button>
              </div>
            </div>
          )}

          {/* Question display panel */}
          {activeQ && (
            <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius-md)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Question header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', flexWrap: 'wrap', gap: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                  Câu {attempt.currentQuestionIndex + 1}/{quiz.questions.length}
                </span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
                  {mode === 'instant-feedback' && attempt.isQuestionAnswered(activeQ.id) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, color: attempt.selectedOptions[activeQ.id] === activeQ.correctOptionIndex ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {attempt.selectedOptions[activeQ.id] === activeQ.correctOptionIndex ? (
                        <><CheckCircle2 size={16} /><span>Chính xác</span></>
                      ) : (
                        <><XCircle size={16} /><span>Sai rồi</span></>
                      )}
                    </div>
                  )}

                  {/* Upvote/Downvote actions */}
                  {((mode === 'instant-feedback' && attempt.isQuestionAnswered(activeQ.id)) || attempt.isSubmitted) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '1px solid var(--glass-border)', paddingLeft: '12px' }}>
                      <button
                        onClick={() => attempt.voteQuestion(activeQ.id, 'up')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: attempt.userVotes[activeQ.id] === 'up' ? 'var(--color-success)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          padding: '4px',
                          transition: 'all 0.15s ease'
                        }}
                        title="Hữu ích"
                      >
                        <ThumbsUp size={14} />
                        <span style={{ fontSize: '11px' }}>{activeQ.metrics?.upvotes || 0}</span>
                      </button>
                      <button
                        onClick={() => attempt.voteQuestion(activeQ.id, 'down')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: attempt.userVotes[activeQ.id] === 'down' ? 'var(--color-danger)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          padding: '4px',
                          transition: 'all 0.15s ease'
                        }}
                        title="Không hữu ích"
                      >
                        <ThumbsDown size={14} />
                        <span style={{ fontSize: '11px' }}>{activeQ.metrics?.downvotes || 0}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <h3 style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.5, textAlign: 'left', margin: 0, color: 'var(--text-primary)' }}>
                {activeQ.text}
              </h3>

              {/* Options list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeQ.options.map((opt, idx) => {
                  const isSelected = attempt.selectedOptions[activeQ.id] === idx;
                  const isAnswered = attempt.isQuestionAnswered(activeQ.id);
                  const isCorrectAnswer = idx === activeQ.correctOptionIndex;
                  const isCorrectReveal = (mode === 'instant-feedback' && isAnswered) || attempt.isSubmitted;
                  
                  // Dynamic styles for the option button
                  let optBorderColor = 'var(--glass-border)';
                  let optBackground = 'rgba(31, 42, 64, 0.2)';
                  let optCursor = 'pointer';
                  let optOpacity = 1;
                  
                  if (isSelected) {
                    optBorderColor = 'var(--color-primary)';
                    optBackground = 'rgba(59, 130, 246, 0.1)';
                  }
                  
                  if (isCorrectReveal) {
                    optCursor = 'default';
                    if (isCorrectAnswer) {
                      optBorderColor = 'rgba(16, 185, 129, 0.4)';
                      optBackground = 'rgba(16, 185, 129, 0.1)';
                    } else if (isSelected) {
                      optBorderColor = 'rgba(239, 68, 68, 0.4)';
                      optBackground = 'rgba(239, 68, 68, 0.1)';
                    } else {
                      optOpacity = 0.5;
                    }
                  }

                  return (
                    <button
                      className="option-btn"
                      key={idx}
                      onClick={() => attempt.selectOption(activeQ.id, idx)}
                      disabled={isCorrectReveal}
                      style={{
                        padding: '14px 16px',
                        border: '1px solid',
                        borderColor: optBorderColor,
                        borderRadius: 'var(--border-radius-sm)',
                        background: optBackground,
                        color: isSelected && !isCorrectReveal ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontSize: '13px',
                        fontWeight: isSelected ? 600 : 500,
                        textAlign: 'left',
                        cursor: optCursor,
                        opacity: optOpacity,
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}
                    >
                      <span>{opt}</span>
                      
                      {/* End decoration indicators */}
                      {isCorrectReveal && isCorrectAnswer && (
                        <CheckCircle2 size={16} color="var(--color-success)" style={{ flexShrink: 0 }} />
                      )}
                      {isCorrectReveal && isSelected && !isCorrectAnswer && (
                        <XCircle size={16} color="var(--color-danger)" style={{ flexShrink: 0 }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Instant feedback explanation panel */}
              {((mode === 'instant-feedback' && attempt.isQuestionAnswered(activeQ.id)) || attempt.isSubmitted) && (
                <div 
                  className="glass-panel animate-fadeIn" 
                  style={{ 
                    padding: '16px', 
                    background: 'rgba(59, 130, 246, 0.04)', 
                    borderColor: 'rgba(59, 130, 246, 0.15)', 
                    borderRadius: 'var(--border-radius-sm)', 
                    textAlign: 'left',
                    marginTop: '4px'
                  }}
                >
                  <h5 style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-primary)', margin: '0 0 6px 0' }}>
                    Giải thích chi tiết:
                  </h5>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    {activeQ.explanation}
                  </p>
                </div>
              )}

              {/* Navigation controls row */}
              <div style={{ display: 'flex', justifySelf: 'flex-end', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <button
                  onClick={attempt.prevQuestion}
                  disabled={attempt.currentQuestionIndex === 0}
                  className="input-glow"
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: attempt.currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
                    opacity: attempt.currentQuestionIndex === 0 ? 0.4 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    borderColor: 'var(--glass-border)'
                  }}
                >
                  <ChevronLeft size={14} />
                  <span>Quay lại</span>
                </button>

                {/* Submissions button (Full test Mode only) */}
                {mode === 'full-test' && !attempt.isSubmitted && (
                  <button
                    onClick={() => attempt.submitAttempt(timeTakenRef.current)}
                    disabled={attempt.isLoading}
                    className="btn-glow"
                    style={{
                      padding: '10px 24px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: attempt.isLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {attempt.isLoading ? (
                      <><Loader2 style={{ animation: 'spin 1.5s linear infinite', marginRight: '6px', display: 'inline-block' }} size={14} />Nộp bài...</>
                    ) : (
                      'Nộp bài'
                    )}
                  </button>
                )}

                <button
                  onClick={attempt.nextQuestion}
                  disabled={attempt.currentQuestionIndex === quiz.questions.length - 1}
                  className="input-glow"
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: attempt.currentQuestionIndex === quiz.questions.length - 1 ? 'not-allowed' : 'pointer',
                    opacity: attempt.currentQuestionIndex === quiz.questions.length - 1 ? 0.4 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    borderColor: 'var(--glass-border)'
                  }}
                >
                  <span>Tiếp theo</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Question Navigation Navigator Grid at bottom */}
          <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--border-radius-md)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'left' }}>Sơ đồ câu hỏi</span>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {quiz.questions.map((q, idx) => {
                const isActive = attempt.currentQuestionIndex === idx;
                const isAns = attempt.selectedOptions[q.id] !== undefined;
                const isCor = attempt.selectedOptions[q.id] === q.correctOptionIndex;
                const isReveal = (mode === 'instant-feedback' && isAns) || attempt.isSubmitted;
                
                // Dynamic style parameters
                let bg = 'rgba(31, 42, 64, 0.4)';
                let border = '1px solid var(--glass-border)';
                let color = 'var(--text-secondary)';
                
                if (isAns && !isReveal) {
                  bg = 'rgba(59, 130, 246, 0.2)';
                  border = '1px solid var(--color-primary)';
                  color = 'var(--color-primary)';
                }
                
                if (isReveal) {
                  if (isCor) {
                    bg = 'rgba(16, 185, 129, 0.15)';
                    border = '1px solid var(--color-success)';
                    color = 'var(--color-success)';
                  } else {
                    bg = 'rgba(239, 68, 68, 0.15)';
                    border = '1px solid var(--color-danger)';
                    color = 'var(--color-danger)';
                  }
                }

                if (isActive) {
                  border = '2px solid var(--color-primary)';
                }

                return (
                  <button
                    className="navigator-dot"
                    key={q.id}
                    onClick={() => attempt.goToQuestion(idx)}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: bg,
                      border: border,
                      color: color,
                      fontSize: '13px',
                      fontWeight: isActive ? 800 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>
      
      <style>{`
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .option-btn {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .option-btn:hover:not(:disabled) {
          border-color: var(--color-primary) !important;
          background-color: rgba(59, 130, 246, 0.08) !important;
          box-shadow: 0 0 12px rgba(59, 130, 246, 0.15) !important;
          transform: translateX(4px);
        }
        .navigator-dot {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .navigator-dot:hover {
          transform: scale(1.15);
          box-shadow: 0 0 10px var(--color-primary);
        }
      `}</style>
    </div>
  );
};

export default QuizAttempt;
