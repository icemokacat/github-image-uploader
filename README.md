# GitHub 이미지 업로더

GitHub 레포지토리의 특정 폴더에 이미지를 업로드할 수 있는 웹 애플리케이션입니다.

## 기능

- 🚀 GitHub API를 통한 이미지 직접 업로드
- 📁 특정 폴더 지정 가능
- 🖼️ 이미지 미리보기
- 🎨 드래그 앤 드롭 지원
- ✅ 업로드 결과 확인 (GitHub 링크, 직접 이미지 링크)
- 🔒 안전한 토큰 기반 인증

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.example` 파일을 `.env`로 복사하고 GitHub 토큰을 설정하세요:

```bash
cp .env.example .env
```

### 3. GitHub Personal Access Token 생성
1. [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)로 이동
2. "Generate new token (classic)" 클릭
3. 토큰 이름 입력 (예: "Image Uploader")
4. 필요한 스코프 선택:
   - `repo`: 전체 레포지토리 접근 (private 포함)
   - `public_repo`: 공개 레포지토리만 접근
5. 생성된 토큰을 `.env` 파일의 `GITHUB_TOKEN`에 입력

### 4. 서버 실행
```bash
# 개발 모드 (nodemon 사용)
npm run dev

# 프로덕션 모드
npm start

# PM2로 운영 서버 실행 (권장)
npm install -g pm2  # PM2 설치 (최초 1회)
npm run pm2:start   # 서버 시작
npm run pm2:logs    # 로그 확인
npm run pm2:restart # 서버 재시작
npm run pm2:stop    # 서버 중지
```

### 5. 접속
브라우저에서 `http://localhost:3000`으로 접속하세요.

## 사용법

1. **GitHub 사용자명/조직명**: 업로드할 레포지토리의 소유자
2. **레포지토리 이름**: 업로드할 레포지토리 이름
3. **업로드 폴더**: 이미지를 저장할 폴더 (선택사항, 비워두면 루트에 저장)
4. **이미지 파일**: 업로드할 이미지 파일 선택 (JPEG, PNG, GIF, WebP 지원)

## 지원 이미지 형식

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

## 파일 크기 제한

- 최대 10MB까지 업로드 가능

## 보안 주의사항

- `.env` 파일을 절대 git에 커밋하지 마세요
- GitHub 토큰은 안전하게 보관하세요
- 필요한 최소한의 권한만 부여하세요

## 문제 해결

### 401 Unauthorized
- GitHub 토큰이 유효하지 않거나 만료되었습니다
- 토큰의 권한(scope)이 부족합니다

### 404 Not Found
- 레포지토리 이름이 잘못되었거나 존재하지 않습니다
- 토큰에 해당 레포지토리 접근 권한이 없습니다

### 403 Forbidden
- API 사용량 제한에 걸렸습니다
- 레포지토리에 쓰기 권한이 없습니다

## API 엔드포인트

### POST /upload
이미지를 GitHub에 업로드합니다.

**Request Body** (multipart/form-data):
- `owner`: GitHub 사용자명/조직명
- `repo`: 레포지토리 이름
- `folder`: 업로드 폴더 (선택사항)
- `image`: 이미지 파일

**Response**:
```json
{
  "success": true,
  "message": "이미지가 성공적으로 업로드되었습니다.",
  "url": "https://raw.githubusercontent.com/...",
  "htmlUrl": "https://github.com/..."
}
```