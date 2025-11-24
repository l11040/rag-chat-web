import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import { config } from 'dotenv';
import http from 'http';
import https from 'https';
import { URL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// .env 파일 로드
const envPath = resolve(rootDir, '.env');
if (existsSync(envPath)) {
  config({ path: envPath });
}

// URL 연결 및 스펙 형식 확인 함수
async function checkUrl(url) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const req = client.get(url, { timeout: 5000 }, (res) => {
        const contentType = res.headers['content-type'] || '';
        let data = '';
        
        // 응답 데이터 수집
        res.on('data', (chunk) => {
          data += chunk.toString();
          // 처음 1KB만 확인 (성능을 위해)
          if (data.length > 1024) {
            res.destroy();
          }
        });
        
        res.on('end', () => {
          const isJson = contentType.includes('application/json') || 
                        contentType.includes('application/yaml') ||
                        contentType.includes('text/yaml') ||
                        contentType.includes('text/x-yaml');
          
          // JSON 형식인지 확인 (첫 문자가 { 또는 [)
          const looksLikeJson = data.trim().startsWith('{') || data.trim().startsWith('[');
          
          // YAML 형식인지 확인 (openapi: 또는 swagger: 키워드)
          const looksLikeYaml = data.includes('openapi:') || data.includes('swagger:');
          
          if (res.statusCode >= 200 && res.statusCode < 400) {
            if (isJson || looksLikeJson || looksLikeYaml) {
              resolve({ success: true, isSpec: true });
            } else {
              // HTML 응답인 경우 (Swagger UI일 수 있음)
              resolve({ success: true, isSpec: false, isHtml: data.trim().startsWith('<!') });
            }
          } else {
            resolve({ success: false, isSpec: false });
          }
        });
      });
      
      req.on('error', (err) => {
        resolve({ success: false, isSpec: false, error: err.message });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, isSpec: false, error: 'timeout' });
      });
    } catch (err) {
      resolve({ success: false, isSpec: false, error: err.message });
    }
  });
}

// 환경 변수에서 OpenAPI 스펙 URL 또는 경로 가져오기
const specUrl = process.env.VITE_OPENAPI_SPEC_URL;
const specPath = process.env.VITE_OPENAPI_SPEC_PATH;

if (!specUrl && !specPath) {
  console.error('❌ 오류: VITE_OPENAPI_SPEC_URL 또는 VITE_OPENAPI_SPEC_PATH 환경 변수를 설정해주세요.');
  console.error('   .env 파일에 다음 중 하나를 추가하세요:');
  console.error('   VITE_OPENAPI_SPEC_URL=http://localhost:3001/api-json  (NestJS)');
  console.error('   또는 VITE_OPENAPI_SPEC_URL=http://localhost:3001/openapi.json');
  console.error('   또는 VITE_OPENAPI_SPEC_PATH=./openapi.json');
  process.exit(1);
}

const inputSpec = specUrl || specPath;
const outputDir = resolve(rootDir, 'src/api/generated');
const configPath = resolve(rootDir, 'openapi-generator-config.yaml');

console.log('🚀 OpenAPI Generator 실행 중...');
console.log(`📄 입력 스펙: ${inputSpec}`);

// 입력 스펙 유효성 검사
if (specUrl) {
  // URL인 경우 연결 확인
  console.log('🔍 서버 연결 및 OpenAPI 스펙 확인 중...');
  const urlCheck = await checkUrl(specUrl);
  
  if (!urlCheck.success) {
    console.error('❌ 오류: 서버에 연결할 수 없습니다.');
    console.error(`   URL: ${specUrl}`);
    if (urlCheck.error) {
      console.error(`   에러: ${urlCheck.error}`);
    }
    console.error('');
    console.error('가능한 원인:');
    console.error('   1. API 서버가 실행 중이 아닙니다.');
    console.error('   2. 서버 포트가 다릅니다.');
    console.error('   3. 네트워크 연결 문제');
    console.error('');
    console.error('해결 방법:');
    console.error('   - API 서버를 실행하세요.');
    console.error('   - 브라우저에서 해당 URL을 열어 확인하세요.');
    console.error(`   - curl "${specUrl}" 명령어로 테스트하세요.`);
    process.exit(1);
  }
  
  if (!urlCheck.isSpec) {
    console.warn('⚠️  경고: URL이 OpenAPI 스펙(JSON/YAML)을 반환하지 않는 것 같습니다.');
    console.warn(`   URL: ${specUrl}`);
    if (urlCheck.isHtml) {
      console.warn('   응답이 HTML 형식입니다. (Swagger UI일 수 있음)');
      console.warn('');
      console.warn('일반적인 OpenAPI 스펙 경로:');
      console.warn('   - /openapi.json');
      console.warn('   - /openapi.yaml');
      console.warn('   - /swagger.json');
      console.warn('   - /api-docs');
      console.warn('');
      console.warn('계속 진행하시겠습니까? (실패할 수 있습니다)');
    } else {
      console.warn('   응답 형식을 확인할 수 없습니다.');
    }
    // 경고만 표시하고 계속 진행
  } else {
    console.log('✅ 서버 연결 및 OpenAPI 스펙 확인 완료');
  }
} else if (specPath) {
  // 로컬 파일인 경우 존재 확인
  const fullPath = resolve(rootDir, specPath);
  if (!existsSync(fullPath)) {
    console.error('❌ 오류: OpenAPI 스펙 파일을 찾을 수 없습니다.');
    console.error(`   경로: ${fullPath}`);
    console.error('');
    console.error('해결 방법:');
    console.error('   - 파일 경로가 올바른지 확인하세요.');
    console.error('   - .env 파일의 VITE_OPENAPI_SPEC_PATH를 확인하세요.');
    process.exit(1);
  }
  console.log('✅ 파일 존재 확인 완료');
}

console.log(`📁 출력 디렉토리: ${outputDir}`);

try {
  const command = `openapi-generator-cli generate -g typescript-axios -i "${inputSpec}" -o "${outputDir}" -c "${configPath}"`;
  execSync(command, { 
    stdio: 'inherit',
    cwd: rootDir 
  });
  console.log('✅ API 생성 완료!');
} catch (error) {
  console.error('');
  console.error('❌ API 생성 실패');
  if (specUrl) {
    console.error('');
    console.error('추가 확인 사항:');
    console.error('   - 서버가 실행 중인지 확인하세요.');
    console.error('   - URL이 올바른 OpenAPI 스펙을 반환하는지 확인하세요.');
    console.error('   - 브라우저에서 해당 URL을 열어 JSON/YAML이 표시되는지 확인하세요.');
  }
  process.exit(1);
}

