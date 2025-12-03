const express = require('express');
const multer = require('multer');
const { Octokit } = require('octokit');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const TEST_MODE = process.env.TEST_MODE === 'true';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

if (TEST_MODE) {
  app.use('/uploads', express.static('uploads'));
}

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      return cb(null, false); // 에러 대신 false 반환
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB 제한
});

const octokit = TEST_MODE ? null : new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function ensureUploadDir() {
  if (TEST_MODE) {
    try {
      await fs.access('uploads');
    } catch {
      await fs.mkdir('uploads', { recursive: true });
    }
  }
}

async function uploadToGitHub(file, fileName, filePath) {
  const content = file.buffer.toString('base64');
  
  const response = await octokit.rest.repos.createOrUpdateFileContents({
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
    path: filePath,
    message: `Add image: ${fileName}`,
    content,
  });

  return {
    url: response.data.content.download_url,
    htmlUrl: response.data.content.html_url,
    fileName
  };
}

async function uploadToLocal(file, fileName, req) {
  await ensureUploadDir();
  const filePath = path.join('uploads', fileName);
  await fs.writeFile(filePath, file.buffer);
  
  const url = `${req.protocol}://${req.get('host')}/uploads/${fileName}`;
  return {
    url,
    htmlUrl: url,
    fileName
  };
}

app.post('/upload', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '이미지 파일을 선택해주세요.' });
    }

    // 이미지 파일만 필터링
    const imageFiles = req.files.filter(file => {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      return mimetype && extname;
    });

    if (imageFiles.length === 0) {
      return res.status(400).json({ error: '유효한 이미지 파일을 선택해주세요.' });
    }

    if (!TEST_MODE && (!process.env.GITHUB_TOKEN || !process.env.GITHUB_OWNER || !process.env.GITHUB_REPO)) {
      return res.status(400).json({ error: 'GitHub 설정이 완료되지 않았습니다.' });
    }

    const results = [];
    const folder = process.env.GITHUB_FOLDER || '';

    for (const file of imageFiles) {
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.originalname}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      try {
        let result;
        if (TEST_MODE) {
          result = await uploadToLocal(file, fileName, req);
        } else {
          result = await uploadToGitHub(file, fileName, filePath);
        }

        const owner = process.env.GITHUB_OWNER;
        const repo = process.env.GITHUB_REPO;
        const branch = 'main';
        const markdownUrl = TEST_MODE 
          ? result.url
          : `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;

        results.push({
          success: true,
          fileName,
          url: result.url,
          htmlUrl: result.htmlUrl,
          markdownUrl,
          markdown: `![${fileName}](${markdownUrl})`
        });
      } catch (error) {
        results.push({
          success: false,
          fileName,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `${results.filter(r => r.success).length}개 이미지가 성공적으로 업로드되었습니다.`,
      results,
      testMode: TEST_MODE
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    if (error.status === 401) {
      res.status(401).json({ error: 'GitHub 토큰이 유효하지 않습니다.' });
    } else if (error.status === 404) {
      res.status(404).json({ error: '레포지토리를 찾을 수 없습니다.' });
    } else {
      res.status(500).json({ error: '업로드 중 오류가 발생했습니다.' });
    }
  }
});

app.post('/upload-clipboard', async (req, res) => {
  try {
    const { imageData } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ error: '클립보드 이미지 데이터가 없습니다.' });
    }

    if (!TEST_MODE && (!process.env.GITHUB_TOKEN || !process.env.GITHUB_OWNER || !process.env.GITHUB_REPO)) {
      return res.status(400).json({ error: 'GitHub 설정이 완료되지 않았습니다.' });
    }

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    const fileName = `clipboard_${Date.now()}.png`;
    const folder = process.env.GITHUB_FOLDER || '';
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    const file = {
      buffer,
      originalname: fileName
    };

    let result;
    if (TEST_MODE) {
      result = await uploadToLocal(file, fileName, req);
    } else {
      result = await uploadToGitHub(file, fileName, filePath);
    }

    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = 'main';
    const markdownUrl = TEST_MODE 
      ? result.url
      : `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;

    res.json({
      success: true,
      message: '클립보드 이미지가 성공적으로 업로드되었습니다.',
      fileName,
      url: result.url,
      htmlUrl: result.htmlUrl,
      markdownUrl,
      markdown: `![${fileName}](${markdownUrl})`,
      testMode: TEST_MODE
    });

  } catch (error) {
    console.error('Clipboard upload error:', error);
    res.status(500).json({ error: '클립보드 업로드 중 오류가 발생했습니다.' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`http://localhost:${PORT}에서 접속하세요.`);
  if (TEST_MODE) {
    console.log('🧪 테스트 모드: 이미지가 로컬 폴더에 저장됩니다.');
  } else {
    console.log(`📁 GitHub 업로드: ${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/${process.env.GITHUB_FOLDER || 'root'}`);
  }
});