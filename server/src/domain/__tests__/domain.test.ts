import assert from 'node:assert';
import { YoutubeUrl } from '../valueobject/YoutubeUrl';
import { InvalidYoutubeUrlException } from '../exception/InvalidYoutubeUrlException';
import { Quiz, Question } from '../model/Quiz';
import { QuizAttempt } from '../model/QuizAttempt';
import { LectureContent } from '../model/LectureContent';
import { User } from '../model/User';

console.log('=== BẮT ĐẦU CHẠY UNIT TEST CHO DOMAIN LAYER ===\n');

try {
  // ==========================================
  // 1. TEST YOUTUBE URL VALUE OBJECT
  // ==========================================
  console.log('1. Đang test YoutubeUrl Value Object...');

  // Test trích xuất ID từ các dạng URL hợp lệ
  const validUrls = [
    { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { url: 'https://youtu.be/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { url: 'https://youtube.com/shorts/dQw4w9WgXcQ?feature=share', expected: 'dQw4w9WgXcQ' },
    { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s', expected: 'dQw4w9WgXcQ' }
  ];

  for (const item of validUrls) {
    const ytUrl = new YoutubeUrl(item.url);
    assert.strictEqual(ytUrl.youtubeId, item.expected, `Thất bại khi trích xuất ID từ URL: ${item.url}`);
  }

  // Test ném exception với URL không hợp lệ
  const invalidUrls = [
    'https://google.com',
    'https://www.youtube.com/watch',
    'https://youtu.be/',
    '',
    null as any
  ];

  for (const url of invalidUrls) {
    assert.throws(() => {
      new YoutubeUrl(url);
    }, InvalidYoutubeUrlException, `Lẽ ra phải ném lỗi InvalidYoutubeUrlException cho URL: ${url}`);
  }

  // Test equals
  const url1 = new YoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const url2 = new YoutubeUrl('https://youtu.be/dQw4w9WgXcQ');
  const url3 = new YoutubeUrl('https://youtu.be/abcde123456');

  assert.ok(url1.equals(url2), 'Hai URL có cùng youtubeId phải bằng nhau');
  assert.ok(!url1.equals(url3), 'Hai URL khác youtubeId không được bằng nhau');

  // Test getCleanUrl
  assert.strictEqual(url1.getCleanUrl(), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'getCleanUrl phải trả về URL chuẩn hóa');
  assert.strictEqual(url2.getCleanUrl(), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'getCleanUrl phải trả về URL chuẩn hóa dù đầu vào viết tắt');

  console.log('✓ Test YoutubeUrl Value Object thành công!');

  // ==========================================
  // 1b. TEST USER HYBRID LOGIN
  // ==========================================
  console.log('\n1b. Đang test User Hybrid Login...');
  const user = new User(
    'user-1',
    'google-id-123',
    'user@gmail.com',
    'User Name',
    'http://avatar.url'
  );

  assert.strictEqual(user.hasPassword(), false, 'Mặc định User đăng ký qua Google không được có mật khẩu');
  assert.strictEqual(user.passwordHash, undefined);

  user.setPassword('hashed-password-string');
  assert.strictEqual(user.hasPassword(), true, 'User phải có mật khẩu sau khi setPassword');
  assert.strictEqual(user.passwordHash, 'hashed-password-string');

  console.log('✓ Test User Hybrid Login thành công!');

  // ==========================================
  // 2. TEST LECTURE CONTENT
  // ==========================================
  console.log('\n2. Đang test LectureContent Entity...');
  const lecture = new LectureContent(
    'lc-1',
    'dQw4w9WgXcQ',
    'Never Gonna Give You Up',
    'Original script here...',
    1,
    8.5
  );

  assert.strictEqual(lecture.version, 1);
  lecture.updateScript('Updated script here...', 9.2);
  assert.strictEqual(lecture.refinedScript, 'Updated script here...');
  assert.strictEqual(lecture.qualityScore, 9.2);
  assert.strictEqual(lecture.version, 2);

  console.log('✓ Test LectureContent thành công!');

  // ==========================================
  // 3. TEST QUIZ & SELF-HEALING LOGIC
  // ==========================================
  console.log('\n3. Đang test Quiz Entity & Self-healing...');

  const questions: Question[] = [
    {
      id: 'q-1',
      text: 'Câu hỏi số 1?',
      options: ['A', 'B', 'C', 'D'],
      correctOptionIndex: 0,
      explanation: 'Giải thích 1',
      metrics: { upvotes: 0, downvotes: 0, timesAnswered: 0, timesCorrect: 0 }
    },
    {
      id: 'q-2',
      text: 'Câu hỏi số 2?',
      options: ['A', 'B', 'C', 'D'],
      correctOptionIndex: 1,
      explanation: 'Giải thích 2',
      metrics: { upvotes: 5, downvotes: 0, timesAnswered: 10, timesCorrect: 8 }
    }
  ];

  const quiz = new Quiz(
    'quiz-1',
    'lc-1',
    'user-123',
    'dQw4w9WgXcQ',
    'Quiz Title',
    'Quiz Description',
    questions
  );

  assert.strictEqual(quiz.getQuestionCount(), 2);

  // Test voting
  quiz.voteQuestion('q-1', 'up');
  assert.strictEqual(quiz.questions[0].metrics.upvotes, 1);
  quiz.voteQuestion('q-1', 'down');
  assert.strictEqual(quiz.questions[0].metrics.downvotes, 1);

  // Test answering
  quiz.answerQuestion('q-1', true);
  assert.strictEqual(quiz.questions[0].metrics.timesAnswered, 1);
  assert.strictEqual(quiz.questions[0].metrics.timesCorrect, 1);

  // Test logic tự phục hồi (Self-Healing Triggers)
  // Case A: Downvote > 30%
  // Hiện tại q-1 có: 1 upvote, 1 downvote => 1/(1+1) = 50% downvote (> 30%)
  assert.ok(quiz.isQuestionFaulty('q-1'), 'Câu hỏi q-1 phải bị đánh dấu lỗi vì tỷ lệ downvote > 30%');

  // Case B: Trả lời 20 lượt nhưng đúng 0%
  // Thiết lập lại metrics cho q-1 để tránh bị tính downvote
  quiz.questions[0].metrics = { upvotes: 0, downvotes: 0, timesAnswered: 0, timesCorrect: 0 };
  assert.ok(!quiz.isQuestionFaulty('q-1'), 'q-1 không được coi là lỗi khi chưa có tương tác');

  for (let i = 0; i < 20; i++) {
    quiz.answerQuestion('q-1', false);
  }
  assert.ok(quiz.isQuestionFaulty('q-1'), 'Câu hỏi q-1 phải bị đánh dấu lỗi sau 20 lượt trả lời sai liên tiếp (đúng 0%)');
  assert.ok(quiz.hasFaultyQuestions(), 'Quiz phải có câu hỏi bị lỗi');

  // Test replaceQuestion (Vá lỗi)
  const newQuestionData = {
    id: 'q-1',
    text: 'Câu hỏi mới thay thế?',
    options: ['X', 'Y', 'Z', 'W'],
    correctOptionIndex: 2,
    explanation: 'Giải thích câu hỏi mới'
  };

  quiz.replaceQuestion('q-1', newQuestionData);
  assert.strictEqual(quiz.questions[0].text, 'Câu hỏi mới thay thế?');
  assert.strictEqual(quiz.questions[0].metrics.timesAnswered, 0, 'Metrics của câu hỏi mới phải được reset về 0');
  assert.strictEqual(quiz.questions[0].metrics.timesCorrect, 0);
  assert.ok(!quiz.isQuestionFaulty('q-1'), 'Câu hỏi mới thay thế không được coi là lỗi');
  assert.ok(!quiz.hasFaultyQuestions(), 'Quiz không còn câu hỏi nào lỗi sau khi đã được vá');

  console.log('✓ Test Quiz & Self-healing thành công!');

  // ==========================================
  // 4. TEST QUIZ ATTEMPT
  // ==========================================
  console.log('\n4. Đang test QuizAttempt Entity...');

  const attempt = new QuizAttempt(
    'att-1',
    'user-123',
    'quiz-1',
    'full-test',
    0,
    2,
    120,
    [
      { questionId: 'q-1', selectedOptionIndex: 2, isCorrect: true },
      { questionId: 'q-2', selectedOptionIndex: 0, isCorrect: false }
    ]
  );

  const calculatedScore = attempt.calculateScore();
  assert.strictEqual(calculatedScore, 1, 'Điểm số tính được phải bằng 1');
  assert.strictEqual(attempt.score, 1, 'Thuộc tính score của attempt phải được cập nhật');

  console.log('✓ Test QuizAttempt thành công!');

  console.log('\n=== TẤT CẢ UNIT TESTS ĐỀU ĐẠT (PASS) ===');
} catch (error) {
  console.error('\n❌ UNIT TEST THẤT BẠI:');
  console.error(error);
  process.exit(1);
}
