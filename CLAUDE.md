# 이 저장소에서 작업할 때 지킬 것

유민혁(minhyuk94)의 개인 프로젝트 "유튜잼". 사용자는 한국어로 대화합니다. 화면 글자도 한국어.

## 무엇인가

웹 건반 리듬 게임 (4·5·6·7건반). 자체곡(브라우저에서 합성)과 유튜브 영상 음악으로 할 수 있다.
GitHub Pages(`https://minhyuk94.github.io/youtujam/`)에 올린다.

## 지킬 것

- 2000년대 국산 온라인 리듬 게임에서 영감을 받았지만 **새로 만든 게임**이다. 다른 게임의 이름·그림·곡·판정 이름을 쓰지 않고, 다른 회사·게임 이름을 README·화면·이력서에 넣지 않는다.
- 그림: Kenney UI Pack(CC0, `public/assets/KENNEY_LICENSE.txt`) + 코드로 그린 것. 글꼴: 갈무리(OFL), Kenney Future Narrow(CC0).
- 자체곡은 `src/core/music.ts`(작곡 도구)·`songs.ts`(곡)로 코드에서 만든다. 음원 파일을 넣지 않는다. 노트는 곡 소리에서 만들고(키음), 친 순간 그 소리가 난다.
- 게임 방식 세 가지: 건반·망치·궤도 (`src/core/styles.ts`). 채보·판정은 공통이고 방식마다 칸 수(망치 2, 궤도 1)·입력·그림만 다르다. 궤도 길(`orbitPath`)은 한 박에 반 바퀴, 1.5박 넘게 비면 저절로 지나가는 칸을 넣는다. 녹음은 늘 건반 판.
- 규칙(채보·판정·점수·잼 게이지·키 배치)은 `src/core/`에 화면과 분리한 순수 TS (import에 `.ts` → `node --test`로 바로 테스트). 새 규칙에는 `tests/core.test.ts`에 테스트를 더한다.
- 유튜브는 IFrame Player API(키 필요 없음). 소리를 분석할 수 없으므로 채보는 BPM·첫 박으로 만들거나 직접 쳐서 녹음한다. 영상은 화면에 보이게 둔다(약관).
- 내 영상 목록(`src/core/library.ts`): 불러온 영상·BPM·직접 친 채보(여러 개, 덮어쓰지 않음)를 localStorage `yj_library` 하나에 저장. 모양을 바꾸면 `parse`가 예전 값을 읽을 수 있게 하고 테스트를 더한다. 백업 파일 내보내기·가져오기(`merge`). 리듬 채보(`lanes: 1`)는 박자만 저장하고, 할 때 `arrangeTaps`(chart.ts)로 건반 수·난이도에 맞춰 칸을 정한다.
- 클래식은 작곡가 사후 70년이 지난 곡만, 멜로디를 새로 편곡해 `songs.ts`에 쓴다(악보·음원 파일을 가져오지 않음). 반주는 `music.ts`의 `acc`(broken3/broken8/march), 셋잇단은 길이를 분수(`1/3`)로, 3박자는 구역의 `meter: 3`, 전조·옥타브는 `transpose`. 드럼 없는 곡의 어려움은 왼손 첫 음을 노트로 더한다(`chart.ts`).
- 휴대폰 화면: 가로로 길면 `VW`(실제 폭)를 넓히고, 메뉴는 960 폭을 가운데(`OX`), 하는 중엔 `geo()`가 판을 가로 전체·아래 큰 패드로. 아이폰은 브라우저 전체 화면이 없어 홈 화면에 추가 안내, `#stage`가 안전 영역을 피한다.
- 소리: 곡마다 볼륨 줄(bus)을 새로 만들어, 곡을 바꾸면 예약된 소리까지 바로 끊는다(미리듣기가 겹쳐 밀리지 않게).
- 시계: 자체곡은 `AudioContext.getOutputTimestamp`로 스피커 시각과 화면 시각을 이어 붙이고, 판정은 키 이벤트의 `timeStamp`로 한다.
- CI(`ci.yml`): 테스트 → 타입 검사 → 빌드 → headless Chrome으로 켜지는지 → Pages 배포.
- 큰 기능이 바뀌면 이력서 저장소(minhyuk94.github.io)의 `games` 카드도 ko/ja/en으로 맞춘다. 소스 코드·저장소 링크는 이력서에 넣지 않는다.

## 이 작업 환경에서 돌려 보기

- npm 설치가 막혀 있을 수 있다. `ln -s /opt/npm-tools/node_modules node_modules` 후 `node scripts/build.mjs`, 타입 검사는 `/opt/npm-tools/node_modules/.bin/tsc --noEmit -p .`
- 화면 확인: `dist`를 로컬 http 서버로 열고 Playwright(`/opt/npm-tools`) + `/usr/bin/google-chrome`. 주소에 `?dev=1`이면 `window.__yj`로 조작할 수 있다.
