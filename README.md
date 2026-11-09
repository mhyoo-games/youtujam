# 유튜잼 (YOUTUJAM)

떨어지는 노트를 박자에 맞춰 치는 웹 건반 리듬 게임입니다. 2000년대 PC방에서 하던 온라인 리듬 게임의 손맛을 떠올리며 새로 만들었습니다.

**하러 가기:** https://minhyuk94.github.io/youtujam/

## 할 수 있는 것

- **4·5·6·7건반**, 쉬움·보통·어려움 (곡마다 Lv 숫자)
- **자체곡 3곡**: 브라우저가 실시간으로 연주합니다. 노트를 치면 그 음이 나고(키음), 놓치면 그 소리가 빠집니다.
- **잼 게이지**: 잘 칠수록 차오르고, 가득 차면 잼 콤보가 올라 점수가 더 붙습니다. 한 번 놓치면 처음부터.
- **유튜브 음악으로 하기**: 영상 주소를 넣고 BPM(두드려서 재기)·첫 박을 맞추면 박자 채보가 만들어집니다. 직접 쳐서 나만의 채보를 녹음할 수도 있습니다.
- **판정 자동 맞추기**: 삑 소리에 맞춰 16번 누르면 내 버릇(늦게/일찍)을 재서 판정을 맞춥니다.
- 길게 누르기 노트, 체력, 등급(SS~F), 최고 기록 저장, 터치로도 칠 수 있음

## 조작

| 건반 | 키 |
| --- | --- |
| 4 | D F J K |
| 5 | D F Space J K |
| 6 | S D F J K L |
| 7 | S D F Space J K L |

곡 고르기: ↑↓ 곡, ←→ 난이도, Tab 건반 수, Enter 시작. 하는 중 Esc 잠깐 멈춤.

## 만든 방법

- TypeScript + Canvas 2D + Web Audio, esbuild로 묶음
- 곡·효과는 코드로 합성하고, 그림은 코드와 Kenney UI Pack으로 그립니다
- 채보·판정·점수 규칙은 화면과 떼어 Node 테스트로 확인합니다 (GitHub Actions)

## 쓴 것

- 그림·효과음: [Kenney UI Pack](https://kenney.nl/assets/ui-pack) (CC0)
- 글꼴: [갈무리](https://github.com/quiple/galmuri) (SIL OFL 1.1), Kenney Future Narrow (CC0)
- 유튜브 영상은 YouTube IFrame Player API로 재생하며, 영상과 소리는 각 저작권자의 것입니다.
