import assert from 'node:assert';
import mongoose from 'mongoose';
import { MongoUserRepository } from '../persistence/adapter/MongoUserRepository';
import { MongoLectureContentRepository } from '../persistence/adapter/MongoLectureContentRepository';
import { MongoQuizRepository } from '../persistence/adapter/MongoQuizRepository';
import { MongoQuizAttemptRepository } from '../persistence/adapter/MongoQuizAttemptRepository';
import { User } from '../../domain/model/User';
import { LectureContent } from '../../domain/model/LectureContent';
import { Quiz } from '../../domain/model/Quiz';
import { QuizAttempt } from '../../domain/model/QuizAttempt';

const TEST_DB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/ytb-quiz-test';

async function runTests() {
  console.log('=== BẮT ĐẦU CHẠY INTEGRATION TEST CHO PERSISTENCE LAYER ===\n');

  try {
    // Thử kết nối tới MongoDB với timeout 2 giây để tránh chờ đợi lâu nếu DB không chạy
    console.log(`Đang cố gắng kết nối tới MongoDB test: ${TEST_DB_URI}...`);
    await mongoose.connect(TEST_DB_URI, {
      serverSelectionTimeoutMS: 2000
    });
    console.log('✓ Kết nối MongoDB thành công!');
  } catch (error) {
    console.warn('\n⚠️ CẢNH BÁO: Không thể kết nối tới MongoDB local.');
    console.warn('Vui lòng chắc chắn rằng MongoDB đang chạy tại localhost:27017 để thực thi đầy đủ integration tests.');
    console.warn('Bỏ qua chạy Integration Test.\n');
    process.exit(0);
  }

  try {
    // Dọn dẹp DB test trước khi chạy
    await mongoose.connection.dropDatabase();

    const userRepo = new MongoUserRepository();
    const lectureRepo = new MongoLectureContentRepository();
    const quizRepo = new MongoQuizRepository();
    const attemptRepo = new MongoQuizAttemptRepository();

    // ==========================================
    // 1. TEST USER REPOSITORY ADAPTER
    // ==========================================
    console.log('\n1. Đang test MongoUserRepository...');
    const domainUser = new User(
      'u-test-1',
      'gg-oauth-1',
      'test@gmail.com',
      'Test User',
      'http://avatar.test/1.png'
    );

    // Test save (insert)
    const savedUser = await userRepo.save(domainUser);
    assert.strictEqual(savedUser.id, 'u-test-1');
    assert.strictEqual(savedUser.displayName, 'Test User');
    assert.strictEqual(savedUser.hasPassword(), false);

    // Test findById
    const foundUser = await userRepo.findById('u-test-1');
    assert.ok(foundUser);
    assert.strictEqual(foundUser?.email, 'test@gmail.com');

    // Test findByGoogleId & findByEmail
    const foundByGg = await userRepo.findByGoogleId('gg-oauth-1');
    assert.ok(foundByGg);
    const foundByEmail = await userRepo.findByEmail('test@gmail.com');
    assert.ok(foundByEmail);

    // Test save (update - hybrid login setup password)
    foundUser?.setPassword('new-hashed-password-123');
    const updatedUser = await userRepo.save(foundUser!);
    assert.strictEqual(updatedUser.hasPassword(), true);
    assert.strictEqual(updatedUser.passwordHash, 'new-hashed-password-123');

    console.log('✓ Test MongoUserRepository thành công!');

    // ==========================================
    // 2. TEST LECTURE CONTENT REPOSITORY ADAPTER
    // ==========================================
    console.log('\n2. Đang test MongoLectureContentRepository...');
    const domainLecture = new LectureContent(
      'lc-test-1',
      'dQw4w9WgXcQ',
      'Video Rick Roll',
      'Refined script details...',
      1,
      9.0
    );

    const savedLecture = await lectureRepo.save(domainLecture);
    assert.strictEqual(savedLecture.id, 'lc-test-1');
    assert.strictEqual(savedLecture.qualityScore, 9.0);

    const foundLecture = await lectureRepo.findByYoutubeId('dQw4w9WgXcQ');
    assert.ok(foundLecture);
    assert.strictEqual(foundLecture?.title, 'Video Rick Roll');

    console.log('✓ Test MongoLectureContentRepository thành công!');

    // ==========================================
    // 3. TEST QUIZ REPOSITORY ADAPTER
    // ==========================================
    console.log('\n3. Đang test MongoQuizRepository...');
    const domainQuiz = new Quiz(
      'qz-test-1',
      'lc-test-1',
      'u-test-1',
      'dQw4w9WgXcQ',
      'Rick Roll Quiz',
      'Rick Roll Description',
      [
        {
          id: 'q-1',
          text: 'Rick Astley has what hair color?',
          options: ['Red', 'Brown', 'Blonde', 'Black'],
          correctOptionIndex: 0,
          explanation: 'He is famous for ginger hair',
          metrics: { upvotes: 10, downvotes: 1, timesAnswered: 30, timesCorrect: 25 }
        }
      ]
    );

    const savedQuiz = await quizRepo.save(domainQuiz);
    assert.strictEqual(savedQuiz.id, 'qz-test-1');
    assert.strictEqual(savedQuiz.questions.length, 1);
    assert.strictEqual(savedQuiz.questions[0].metrics.upvotes, 10);

    const foundQuiz = await quizRepo.findByYoutubeId('dQw4w9WgXcQ');
    assert.ok(foundQuiz);
    assert.strictEqual(foundQuiz?.title, 'Rick Roll Quiz');

    console.log('✓ Test MongoQuizRepository thành công!');

    // ==========================================
    // 4. TEST QUIZ ATTEMPT REPOSITORY ADAPTER
    // ==========================================
    console.log('\n4. Đang test MongoQuizAttemptRepository...');
    const domainAttempt = new QuizAttempt(
      'att-test-1',
      'u-test-1',
      'qz-test-1',
      'full-test',
      1,
      1,
      60,
      [
        { questionId: 'q-1', selectedOptionIndex: 0, isCorrect: true }
      ]
    );

    const savedAttempt = await attemptRepo.save(domainAttempt);
    assert.strictEqual(savedAttempt.id, 'att-test-1');
    assert.strictEqual(savedAttempt.score, 1);

    const attemptsByUser = await attemptRepo.findByUserId('u-test-1');
    assert.strictEqual(attemptsByUser.length, 1);
    assert.strictEqual(attemptsByUser[0].quizId, 'qz-test-1');

    console.log('✓ Test MongoQuizAttemptRepository thành công!');

    // Dọn dẹp sau khi kết thúc test
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    console.log('\n=== TẤT CẢ INTEGRATION TESTS ĐỀU ĐẠT (PASS) ===');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ INTEGRATION TEST THẤT BẠI:');
    console.error(error);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  }
}

runTests();
