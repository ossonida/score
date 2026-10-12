# Android 첫 실행 — Windows

현재 단계: Capacitor 8 기반 Android 프로젝트를 생성하는 기본 구조. APK 빌드·실기기 검증·스토어 출시는 아직 진행하지 않았습니다.

## 1. 설치

- Android Studio: https://developer.android.com/studio
- Node.js LTS (22 이상): https://nodejs.org/

Android Studio 설치 마법사에서 Android SDK, Android SDK Platform, Android Virtual Device를 설치하세요. 초기 프로젝트 동기화에는 SDK Platform 36, Java 21 이상이 필요합니다. Android Studio에 포함된 JDK를 사용하면 됩니다.

## 2. 저장소 받기

https://github.com/ossonida/score/archive/refs/heads/main.zip 를 내려받고 압축을 풉니다. `package.json`이 있는 폴더에서 터미널을 열고 실행합니다.

```powershell
npm ci
npm run android:setup
npm run android:open
```

`android:setup`은 허용된 웹 파일만 `dist`로 복사하고 Android 프로젝트를 생성·동기화합니다. SDK가 있는 컴퓨터에서 Android Studio의 Gradle 동기화를 완료하세요. 생성 플랫폼은 이 프로토타입 단계에서는 저장소에 포함하지 않습니다. 이후 네이티브 로그인 구현 시 Android 소스를 버전 관리할 예정입니다.

## 3. 테스트

에뮬레이터를 만들거나 휴대폰의 USB 디버깅을 켜 연결한 뒤 Android Studio의 Run 버튼으로 실행합니다. 플레이어 추가·점수 조정·순위 애니메이션·앱 재실행 후 점수 복원을 확인합니다. Android 전용 서비스 워커·홈화면 설치 링크는 사용하지 않습니다.

현재 Android에서는 Google 로그인 버튼을 누르면 다음 단계에서 연결한다는 안내가 표시됩니다. 기존 브라우저용 Google 팝업 로그인을 Android WebView에서 그대로 사용하는 방식은 지원하지 않습니다. 웹사이트의 로그인은 변경하지 않습니다.

앱 식별자는 프로토타입용 `io.github.ossonida.score`, 표시 이름은 `Score Counter`입니다. Play 등록 전에 식별자를 확정합니다. 현재 런처 아이콘·시작 화면은 Capacitor 기본값입니다.

첫 실행 이후 순서: 네이티브 Google 로그인 / Firebase Android 등록 및 SHA 인증서 → 앱 아이콘·실기기 테스트 → 개인정보·계정 삭제 흐름 → Play 테스트 배포. Firebase 서버·보안 규칙과 BGG 서버는 별도 배포가 필요합니다.
