# NoColorCSV

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

NoColorCSV는 색각 장애가 있거나 색상만으로 열을 구분하기 어려운 사용자를 위한 VS Code CSV 읽기 확장입니다. 열 번호, 헤더, 셀 내용 미리 보기와 키보드 탐색으로 텍스트 데이터의 위치를 파악할 수 있습니다.

## VS Code 실행 화면

다음 화면은 포함된 [예제 파일](examples/sample.csv)을 VS Code에서 열고 확장을 실제로 실행해 촬영했습니다.

**현재 열:** 커서가 `hello, world`에 있으면 상태 표시줄에 3열과 `note` 헤더가 표시됩니다.

![VS Code에서 커서가 3열에 있고 확대 상자에 상태 표시줄의 CSV: column 3 of 3 · note가 표시된 화면](docs/images/column-status.png)

**셀 상세 정보:** 커서가 `London, UK`에 있을 때 상태 표시줄 항목을 선택하면 행 번호, 열 번호, 헤더, 셀 값이 텍스트로 표시됩니다. 따옴표 안의 쉼표는 구분자로 처리되지 않습니다.

![VS Code에서 2열의 London, UK 셀 상세 정보를 표시하고 확대 상자에 상태 표시줄의 CSV: column 2 of 3 · city가 표시된 화면](docs/images/cell-details.png)

## Rainbow CSV와의 차이

[Rainbow CSV](https://github.com/mechatroner/vscode_rainbow_csv)는 열을 서로 다른 색으로 강조하며 상태 표시줄과 마우스 올리기 정보, 열 정렬, 쿼리 등도 제공합니다. NoColorCSV는 열 색상을 구분하지 않고 CSV를 읽는 작업에 초점을 맞춥니다.

| | NoColorCSV | Rainbow CSV |
| --- | --- | --- |
| 열 식별 | 열 번호, 헤더, 셀 미리 보기를 텍스트로 표시 | 색상 강조와 상태 표시줄 및 마우스 올리기 정보 |
| 키보드 작업 | 인접한 열 또는 같은 열의 다른 행으로 이동 | 열 추적과 다중 커서 편집 등 |
| 파일 형식 | 쉼표로 구분된 `.csv` | CSV, TSV 및 기타 구분 형식 |
| 데이터 도구 | 셀 읽기와 위치 확인 | 정렬, CSVLint, RBQL 쿼리 등 |

NoColorCSV는 CSV 내용을 수정하거나 열에 색상을 추가하지 않습니다.

## 설치

[최신 릴리스](https://github.com/EETKILLER/NoColorCSV/releases/latest)에서 `.vsix` 파일을 다운로드합니다. VS Code의 **확장** 보기에서 `…` → **VSIX에서 설치...**를 선택하고 다운로드한 파일을 지정합니다.

## 사용 방법

`.csv` 파일을 열고 커서를 이동하면 상태 표시줄에 현재 열 번호, 해당 행의 열 수, 헤더가 표시됩니다. 상태 표시줄 항목을 선택하면 현재 셀의 텍스트 정보를 볼 수 있습니다. 명령 팔레트에서도 다음 명령을 사용할 수 있습니다.

| 명령 | Windows / Linux | macOS |
| --- | --- | --- |
| NoColorCSV: 현재 열 정보 표시 | — | — |
| NoColorCSV: 다음 열로 이동 | Ctrl+Alt+Shift+→ | Cmd+Alt+Shift+→ |
| NoColorCSV: 이전 열로 이동 | Ctrl+Alt+Shift+← | Cmd+Alt+Shift+← |
| NoColorCSV: 같은 열의 다음 행으로 이동 | Ctrl+Alt+Shift+↓ | Cmd+Alt+Shift+↓ |
| NoColorCSV: 같은 열의 이전 행으로 이동 | Ctrl+Alt+Shift+↑ | Cmd+Alt+Shift+↑ |

단축키는 VS Code의 **바로 가기 키**에서 `NoColorCSV`를 검색해 변경할 수 있습니다. 행 이동은 대상 열이 없는 행을 건너뜁니다.

`nocolorcsv.hasHeader` 설정은 기본적으로 첫 번째 CSV 레코드를 헤더로 사용합니다. 헤더가 없는 파일에서는 이 설정을 끄세요. 행 번호는 항상 첫 번째 레코드부터 계산합니다.

따옴표로 묶인 필드, 필드 안의 쉼표와 줄바꿈, 이중 따옴표 이스케이프, UTF-8 BOM을 처리합니다. 구분자는 반각 쉼표 `,`이며 전각 쉼표 `，`는 일반 텍스트로 취급합니다.

## 개발

[Visual Studio Code](https://code.visualstudio.com/)와 Node.js 24가 필요합니다.

```sh
npm ci
npm test
```

VS Code에서 저장소를 열고 **F5**를 누르면 확장 개발 호스트가 실행됩니다. 실행 전에 TypeScript를 컴파일합니다. `examples/sample.csv`로 열 인식과 탐색을 확인할 수 있습니다.

설치 가능한 VSIX를 만들려면 다음을 실행합니다.

```sh
npm run package
```

개발 규칙은 [AGENTS.md](AGENTS.md), 라이선스는 [LICENSE](LICENSE)를 참고하세요.

## AI 지원 개발

NoColorCSV는 EETKILLER가 개발하고 유지 관리하며, OpenAI Codex가 코딩을 지원합니다.
