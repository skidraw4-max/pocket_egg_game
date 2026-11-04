#!/usr/bin/env node
/**
 * Firebase Auth custom claim (admin: true) 설정
 *
 * 사용법:
 *   node scripts/set-admin-claim.cjs <uid>
 *   node scripts/set-admin-claim.cjs <uid> --key path/to/serviceAccount.json
 *
 * 자격 증명 (우선순위):
 *   1. --key <path>
 *   2. 환경변수 GOOGLE_APPLICATION_CREDENTIALS
 *   3. 프로젝트 루트 serviceAccountKey.json
 *   4. 그 외 Application Default Credentials (gcloud auth application-default login 등)
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const PROJECT_ID =
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  'pocket-egg';

function parseArgs(argv) {
  const positional = [];
  let keyPath = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--key' || arg === '-k') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        console.error('--key 옵션 뒤에 서비스 계정 JSON 파일 경로가 필요합니다.');
        process.exit(1);
      }
      keyPath = next;
      i += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      return { help: true, uid: null, keyPath: null };
    }
    if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  return { help: false, uid: positional[0] ?? null, keyPath };
}

function resolveCredentialPath(explicitKeyPath) {
  if (explicitKeyPath) {
    return path.resolve(process.cwd(), explicitKeyPath);
  }

  const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (fromEnv && fromEnv.trim()) {
    return path.resolve(fromEnv.trim());
  }

  const defaultKey = path.join(PROJECT_ROOT, 'serviceAccountKey.json');
  if (fs.existsSync(defaultKey)) {
    return defaultKey;
  }

  return null;
}

function printCredentialHelp() {
  console.error('');
  console.error('Firebase Admin SDK용 자격 증명을 찾을 수 없습니다.');
  console.error('');
  console.error('Firebase CLI 로그인(firebase login)만으로는 이 스크립트가 동작하지 않습니다.');
  console.error('서비스 계정 JSON 키 또는 Application Default Credentials(ADC)가 필요합니다.');
  console.error('');
  console.error('[권장] 서비스 계정 키 발급');
  console.error('  1. Firebase Console → 프로젝트 설정 → 서비스 계정');
  console.error('  2. 「새 비공개 키 생성」으로 JSON 다운로드');
  console.error('  3. 프로젝트 루트에 serviceAccountKey.json 으로 저장 (git에 커밋하지 마세요)');
  console.error('');
  console.error('[PowerShell] 환경변수로 경로 지정 후 재실행:');
  console.error('  $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\serviceAccountKey.json"');
  console.error('  node scripts/set-admin-claim.cjs <uid>');
  console.error('');
  console.error('또는 CLI 인자:');
  console.error('  node scripts/set-admin-claim.cjs <uid> --key .\\serviceAccountKey.json');
  console.error('');
  console.error('[대안] Google Cloud SDK 설치 후 ADC:');
  console.error('  gcloud auth application-default login');
  console.error('  (프로젝트: pocket-egg)');
  console.error('');
  console.error('참고: Firebase Console UI에서는 custom claims를 직접 편집할 수 없습니다.');
  console.error('      서비스 계정 키로 이 스크립트를 실행하는 방식을 사용하세요.');
  console.error('');
}

function hasApplicationDefaultCredentialsFile() {
  if (process.platform === 'win32' && process.env.APPDATA) {
    return fs.existsSync(
      path.join(process.env.APPDATA, 'gcloud', 'application_default_credentials.json'),
    );
  }
  const home = process.env.HOME || process.env.USERPROFILE;
  if (home) {
    return fs.existsSync(
      path.join(home, '.config', 'gcloud', 'application_default_credentials.json'),
    );
  }
  return false;
}
function loadServiceAccount(credentialPath) {
  if (!fs.existsSync(credentialPath)) {
    console.error(`지정한 키 파일을 찾을 수 없습니다: ${credentialPath}`);
    printCredentialHelp();
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
  } catch (err) {
    console.error(`키 파일 JSON 파싱 실패: ${credentialPath}`);
    console.error(err.message ?? err);
    process.exit(1);
  }

  if (!parsed.client_email || !parsed.private_key) {
    console.error('유효한 Firebase/Google 서비스 계정 JSON이 아닙니다 (client_email, private_key 필요).');
    process.exit(1);
  }

  return parsed;
}

function initializeAdmin(credentialPath) {
  const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

  if (admin.apps.length) {
    return admin;
  }

  if (credentialPath) {
    const serviceAccount = loadServiceAccount(credentialPath);
    const projectId = serviceAccount.project_id || PROJECT_ID;
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId,
    });
    console.log(`자격 증명: ${credentialPath}`);
    console.log(`projectId: ${projectId}`);
    return admin;
  }

  if (!hasApplicationDefaultCredentialsFile()) {
    printCredentialHelp();
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: PROJECT_ID,
  });
  console.log('자격 증명: Application Default Credentials (ADC)');
  console.log(`projectId: ${PROJECT_ID}`);
  return admin;
}

async function main() {
  const { help, uid, keyPath } = parseArgs(process.argv.slice(2));

  if (help) {
    console.log('사용법: node scripts/set-admin-claim.cjs <uid> [--key path/to/serviceAccount.json]');
    process.exit(0);
  }

  if (!uid) {
    console.error('사용법: node scripts/set-admin-claim.cjs <uid> [--key path/to/serviceAccount.json]');
    process.exit(1);
  }

  const credentialPath = resolveCredentialPath(keyPath);
  const admin = initializeAdmin(credentialPath);

  await admin.auth().setCustomUserClaims(uid, { admin: true });
  const user = await admin.auth().getUser(uid);

  console.log('');
  console.log('admin claim 설정 완료');
  console.log(`  uid: ${uid}`);
  console.log(`  email: ${user.email ?? '(없음)'}`);
  console.log('  claims:', user.customClaims);
  console.log('');
  console.log('클라이언트에서 새 ID 토큰을 받으려면 로그아웃 후 다시 로그인하세요.');
}

main().catch((error) => {
  const msg = error.message ?? String(error);
  if (/Could not load the default credentials/i.test(msg) || /default credentials/i.test(msg)) {
    printCredentialHelp();
  }
  console.error('admin claim 설정 실패:', msg);
  process.exit(1);
});
