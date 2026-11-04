# CDN 복구 가이드 (포켓 에그)

스토어 앱(Play Store)은 **앱 업데이트 없이** 이미지를 복구하려면 **기존 CDN URL**이 다시 200을 반환해야 합니다.

## 현재 상태 (자동 점검)

- Manus CDN (`files.manuscdn.com/.../310519663342761074/...`) — **403**
- CloudFront (`d2xsxph8kpxj0f.cloudfront.net/...`) — **403**
- 원인: [Manus 서비스 변경](https://help.manus.im/en/articles/16147831-service-change-overview-what-s-happening-and-am-i-affected) 이후 세션 에셋 비활성화

로컬에서 복구 패키지 생성:

```powershell
python scripts/restore-cdn-assets.py
```

결과:

- `scripts/cdn-reupload-package/` — Manus에 올릴 **해시 파일명** 그대로 패키징
- `client/public/legacy-cdn/` — Firebase Hosting 미러
- `scripts/cdn-recovery-report.json` — URL별 상태 리포트

---

## 1순위: Manus 데이터 복원 (스토어 앱 즉시 복구)

Manus에서 이 프로젝트를 만들었다면 **Task Data Backup**으로 복원하면 **동일 CDN URL**이 다시 살아날 수 있습니다.

1. [Manus](https://manus.im) 로그인
2. [데이터 복원 안내](https://help.manus.im/en/articles/16147895-service-change-overview-how-to-restore-your-data) 따라 **Task Data Restoration Tool** 실행
3. 예전에 받아 둔 **Task Data Backup** 업로드 (없으면 Manus 지원에 세션 `310519663342761074` 문의)
4. 복원 후 아래 URL이 브라우저에서 열리는지 확인:

   ```
   https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/vYMlLdcWDNYSCvto.png
   ```

5. 200이면 **설치된 Play Store 앱 재시작**만으로 캐릭터·배경 복구

> 복원은 계정당 **1회**만 가능합니다. 백업 파일을 꼭 확인한 뒤 진행하세요.

---

## 2순위: Firebase Hosting 미러 (웹·차기 대비)

Manus 복원이 어려울 때, 동일 파일을 우리 Hosting에 올려 둡니다.

```powershell
python scripts/restore-cdn-assets.py
npm run build
firebase deploy --only hosting:game
```

미러 예시 (Manus URL **대체 아님**, 스토어 앱은 여전히 Manus URL 사용):

```
https://pocket-egg.web.app/legacy-cdn/session_file/310519663342761074/vYMlLdcWDNYSCvto.png
https://pocket-egg.web.app/legacy-cdn/cloudfront/daLuxDLrpRKKbPdxD8Red2/pocket-egg-room-bg-RWqGiSQbzfCq5GS93bZek3.webp
```

---

## 3순위: Play Store AAB 업데이트

Manus 복원이 불가능하면 **로컬 에셋 버전**(이미 코드에 반영)을 새 AAB로 배포해야 합니다.

```powershell
npm run build:android
```

---

## 에셋 매핑 (스토어 앱 ↔ 로컬)

| CDN 해시 | 용도 | 로컬 소스 |
|----------|------|-----------|
| `vYMlLdcWDNYSCvto.png` | 기본몬 | `characters/classic/basicmon.png` |
| `jmaZyvsOnJMvxWkZ.png` | 알 | `characters/classic/egg.png` |
| `EDyFLiIKoVTNidnh.png` | 숲 배경 | `wallpapers/wallpaper_forest.webp` |
| `pocket-egg-room-bg-....webp` | 기본 방 | `wallpapers/wallpaper_default.webp` |
| … | 전체 목록 | `scripts/cdn-legacy-manifest.json` |

---

## 문의 템플릿 (Manus 지원)

> Session ID `310519663342761074` WebDev 프로젝트의 CDN 에셋  
> (`files.manuscdn.com/...` 및 CloudFront)이 403입니다.  
> 모바일 앱(포켓 에그)이 해당 URL을 하드코딩해 사용 중입니다.  
> Task Data 복원 또는 동일 경로 재배포 방법을 안내해 주세요.
