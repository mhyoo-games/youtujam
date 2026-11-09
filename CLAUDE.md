# 이 저장소에서 작업할 때 지킬 것

유민혁(minhyuk94)의 개인 프로젝트 "유튜잼". 사용자는 한국어로 대화합니다. 화면 글자도 한국어.

## 무엇인가

웹 건반 리듬 게임 (4·5·6·7건반). 자체곡(브라우저에서 합성)과 유튜브 영상 음악으로 할 수 있다.
GitHub Pages(`https://minhyuk94.github.io/youtujam/`)에 올린다.

## 지킬 것

- 2000년대 국산 온라인 리듬 게임에서 영감을 받았지만 **새로 만든 게임**이다. 다른 게임의 이름·그림·곡·판정 이름을 쓰지 않고, 다른 회사·게임 이름을 README·화면·이력서에 넣지 않는다.
- 그림: Kenney UI Pack(CC0, `public/assets/KENNEY_LICENSE.txt`) + 코드로 그린 것. 글꼴: 갈무리(OFL), Kenney Future Narrow(CC0).
- 자체곡은 `src/core/music.ts`(작곡 도구)·`songs.ts`(곡)로 코드에서 만든다. 음원 파일을 넣지 않는다. 노트는 곡 소리에서 만들고(키음), 친 순간 그 소리가 난다.
- 규칙(채보·판정·점수·잼 게이지·키 배치)은 `src/core/`에 화면과 분리한 순수 TS (import에 `.ts` → `node --test`로 바로 테스트). 새 규칙에는 `tests/core.test.ts`에 테스트를 더한다.
- 유튜브는 IFrame Player API(키 필요 없음). 소리를 분석할 수 없으므로 채보는 BPM·첫 박으로 만들거나 직접 쳐서 녹음한다. 영상은 화면에 보이게 둔다(약관).
- 시계: 자체곡은 `AudioContext.getOutputTimestamp`로 스피커 시각과 화면 시각을 이어 붙이고, 판정은 키 이벤트의 `timeStamp`로 한다.
- CI(`ci.yml`): 테스트 → 타입 검사 → 빌드 → headless Chrome으로 켜지는지 → Pages 배포.
- 큰 기능이 바뀌면 이력서 저장소(minhyuk94.github.io)의 `games` 카드도 ko/ja/en으로 맞춘다. 소스 코드·저장소 링크는 이력서에 넣지 않는다.

## 이 작업 환경에서 돌려 보기

- npm 설치가 막혀 있을 수 있다. `ln -s /opt/npm-tools/node_modules node_modules` 후 `node scripts/build.mjs`, 타입 검사는 `/opt/npm-tools/node_modules/.bin/tsc --noEmit -p .`
- 화면 확인: `dist`를 로컬 http 서버로 열고 Playwright(`/opt/npm-tools`) + `/usr/bin/google-chrome`. 주소에 `?dev=1`이면 `window.__yj`로 조작할 수 있다.
