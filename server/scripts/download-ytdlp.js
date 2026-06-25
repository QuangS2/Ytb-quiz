const fs = require('fs');
const path = require('path');
const https = require('https');

const isWindows = process.platform === 'win32';
const destDir = path.join(__dirname, '..', 'dist');
const logPath = path.join(destDir, 'download-log.txt');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

function writeLog(msg) {
  console.log(msg);
  fs.appendFileSync(logPath, msg + '\n');
}

// Xóa file log cũ nếu có
if (fs.existsSync(logPath)) {
  fs.unlinkSync(logPath);
}

writeLog(`[Download Ytdlp] Bắt đầu lúc ${new Date().toISOString()}`);
writeLog(`[Download Ytdlp] Platform: ${process.platform}`);

if (isWindows) {
  writeLog('[Download Ytdlp] Đang chạy trên Windows, bỏ qua tải standalone binary.');
  process.exit(0);
}

const destPath = path.join(destDir, 'yt-dlp');
const url = 'https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp';

writeLog(`[Download Ytdlp] Đang tải standalone binary từ ${url}...`);

const file = fs.createWriteStream(destPath);

function download(downloadUrl) {
  https.get(downloadUrl, (response) => {
    writeLog(`[Download Ytdlp] Response status: ${response.statusCode}`);
    if (response.statusCode === 302 || response.statusCode === 301) {
      writeLog(`[Download Ytdlp] Redirect sang: ${response.headers.location}`);
      download(response.headers.location);
      return;
    }

    if (response.statusCode !== 200) {
      writeLog(`[Download Ytdlp] Lỗi tải file: HTTP Status ${response.statusCode}`);
      process.exit(1);
    }

    response.pipe(file);

    file.on('finish', () => {
      file.close(() => {
        writeLog('[Download Ytdlp] Đã tải xong yt-dlp binary.');
        try {
          fs.chmodSync(destPath, '755');
          writeLog('[Download Ytdlp] Đã cấp quyền thực thi (chmod +x) cho yt-dlp.');
          
          // Kiểm tra xem file có thực sự đọc được và có kích thước bao nhiêu
          const stats = fs.statSync(destPath);
          writeLog(`[Download Ytdlp] Đã xác minh file size: ${stats.size} bytes`);
        } catch (chmodErr) {
          writeLog(`[Download Ytdlp] Lỗi khi chmod/verify: ${chmodErr.message}`);
        }
        process.exit(0);
      });
    });
  }).on('error', (err) => {
    fs.unlink(destPath, () => {});
    writeLog(`[Download Ytdlp] Lỗi kết nối: ${err.message}`);
    process.exit(1);
  });
}

download(url);
