import assert from 'node:assert';
import express from 'express';
import { z } from 'zod';
import { errorHandler } from '../middleware/ErrorHandler';
import { validateRequest } from '../middleware/validateRequest';
import { BusinessException } from '../../domain/exception/BusinessException';

console.log('=== BẮT ĐẦU CHẠY UNIT TEST CHO PRESENTATION LAYER ===\n');

// 1. Tạo Express App giả lập phục vụ kiểm thử
const app = express();
app.use(express.json());

// Định nghĩa Zod Schema cho kiểm thử validation
const TestSchema = z.object({
  body: z.object({
    email: z.string().email({ message: 'Email không đúng định dạng' }),
    age: z.number({ required_error: 'Tuổi là bắt buộc' }).min(18, { message: 'Tuổi phải lớn hơn hoặc bằng 18' })
  })
});

// Định nghĩa các endpoint kiểm thử
app.get('/test-business-error', (req, res, next) => {
  next(new BusinessException('TEST_BUSINESS_CODE', 'Lỗi nghiệp vụ mô phỏng'));
});

app.post('/test-validation', validateRequest(TestSchema), (req, res) => {
  res.json({ success: true, data: req.body });
});

app.get('/test-system-error', (req, res, next) => {
  next(new Error('Lỗi hệ thống nghiêm trọng xảy ra'));
});

// Đăng ký errorHandler
app.use(errorHandler);

// 2. Chạy Server trên cổng phụ 6001
const PORT = 6001;
const server = app.listen(PORT, async () => {
  console.log(`Server test đang chạy tại http://localhost:${PORT}`);
  
  try {
    // ------------------------------------------
    // Case 1: Kiểm thử ném lỗi nghiệp vụ (BusinessException)
    // ------------------------------------------
    console.log('1. Đang test Business Exception Handler...');
    const resBusiness = await fetch(`http://localhost:${PORT}/test-business-error`);
    assert.strictEqual(resBusiness.status, 400, 'Lỗi nghiệp vụ phải trả về HTTP 400');
    
    const jsonBusiness = await resBusiness.json() as any;
    assert.strictEqual(jsonBusiness.success, false);
    assert.strictEqual(jsonBusiness.code, 'TEST_BUSINESS_CODE');
    assert.strictEqual(jsonBusiness.message, 'Lỗi nghiệp vụ mô phỏng');
    console.log('✓ Test Business Exception Handler thành công!');

    // ------------------------------------------
    // Case 2: Kiểm thử ném lỗi validation (ZodError)
    // ------------------------------------------
    console.log('\n2. Đang test Request Validation (ZodError)...');
    
    // Gửi dữ liệu lỗi (email sai định dạng, thiếu tuổi)
    const resValError = await fetch(`http://localhost:${PORT}/test-validation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid-email', age: 16 })
    });
    
    assert.strictEqual(resValError.status, 400, 'Lỗi validation phải trả về HTTP 400');
    const jsonValError = await resValError.json() as any;
    assert.strictEqual(jsonValError.success, false);
    assert.strictEqual(jsonValError.code, 'VALIDATION_ERROR');
    assert.ok(jsonValError.errors.length >= 2, 'Lẽ ra phải có 2 lỗi validation');
    
    // Gửi dữ liệu đúng
    const resValSuccess = await fetch(`http://localhost:${PORT}/test-validation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@gmail.com', age: 20 })
    });
    
    assert.strictEqual(resValSuccess.status, 200, 'Dữ liệu hợp lệ phải trả về HTTP 200');
    const jsonValSuccess = await resValSuccess.json() as any;
    assert.strictEqual(jsonValSuccess.success, true);
    assert.strictEqual(jsonValSuccess.data.email, 'test@gmail.com');
    assert.strictEqual(jsonValSuccess.data.age, 20);
    
    console.log('✓ Test Request Validation thành công!');

    // ------------------------------------------
    // Case 3: Kiểm thử ném lỗi hệ thống (System Error 500)
    // ------------------------------------------
    console.log('\n3. Đang test System Error Handler...');
    
    // Lưu lại console.error gốc để ẩn output log hệ thống tạm thời khi chạy test
    const originalConsoleError = console.error;
    console.error = () => {};
    
    const resSystem = await fetch(`http://localhost:${PORT}/test-system-error`);
    
    // Khôi phục lại console.error
    console.error = originalConsoleError;
    
    assert.strictEqual(resSystem.status, 500, 'Lỗi hệ thống phải trả về HTTP 500');
    const jsonSystem = await resSystem.json() as any;
    assert.strictEqual(jsonSystem.success, false);
    assert.strictEqual(jsonSystem.code, 'INTERNAL_SERVER_ERROR');
    assert.strictEqual(jsonSystem.message, 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.');
    
    console.log('✓ Test System Error Handler thành công!');

    console.log('\n=== TẤT CẢ PRESENTATION TESTS ĐỀU ĐẠT (PASS) ===');
    
    // Đóng server và thoát 0
    server.close(() => {
      setTimeout(() => {
        process.exit(0);
      }, 100);
    });
  } catch (error) {
    console.error('\n❌ TEST THẤT BẠI:');
    console.error(error);
    server.close(() => {
      setTimeout(() => {
        process.exit(1);
      }, 100);
    });
  }
});
