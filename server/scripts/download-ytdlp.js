const fs = require('fs');
const path = require('path');
const https = require('https');

const isWindows = process.platform === 'win32';

// Trên Windows, chúng ta không cần tải standalone binary vì local sử dụng python -m yt_dlp
if (isWindows) {
  console.log('[Download Ytdlp] Đang chạy trên Windows, bỏ qua tải standalone binary.');
  process.exit(0);
}

const destDir = path.join(__dirname, '..', 'dist');
const destPath = path.join(destDir, 'yt-dlp');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const url = 'https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp';

console.log(`[Download Ytdlp] Đang tải standalone binary từ ${url}...`);

const file = fs.createWriteStream(destPath);

function download(downloadUrl) {
  https.get(downloadUrl, (response) => {
    // Xử lý redirect (GitHub releases thường redirect sang codeload hoặc s3)
    if (response.statusCode === 302 || response.statusCode === 301) {
      console.log(`[Download Ytdlp] Redirect sang: ${response.headers.location}`);
      download(response.headers.location);
      return;
    }

    if (response.statusCode !== 200) {
      console.error(`[Download Ytdlp] Lỗi tải file: HTTP Status ${response.statusCode}`);
      process.exit(1);
    }

    response.pipe(file);

    file.on('finish', () => {
      file.close(() => {
        console.log('[Download Ytdlp] Đã tải xong yt-dlp binary.');
        try {
          fs.chmodSync(destPath, '755');
          console.log('[Download Ytdlp] Đã cấp quyền thực thi (chmod +x) cho yt-dlp.');
        } catch (chmodErr) {
          console.error('[Download Ytdlp] Lỗi khi chmod:', chmodErr.message);
        }
        process.exit(0);
      });
    });
  }).on('error', (err) => {
    fs.unlink(destPath, () => {});
    console.error(`[Download Ytdlp] Lỗi kết nối: ${err.message}`);
    process.exit(1);
  });
}

download(url);
