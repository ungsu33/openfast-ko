# OpenFAST 한국어 문서

[한국어 문서](https://ungsu33.github.io/openfast-ko/) · [상세 리뷰](https://ungsu33.github.io/openfast-ko/review.html) · [전체 문서 목록](https://ungsu33.github.io/openfast-ko/coverage.html)

OpenFAST 공식 **main / v5.0.0** 문서의 비공식 한국어 자동번역 미러입니다. 원본의 Sphinx Read the Docs 테마, 문서 계층, 번호, 내부 앵커, 수식, 표, 그림, 코드와 첨부자료를 유지합니다. 번역 안내, 문서별 검토 기록, 한국어 검색을 추가했습니다.

- 원문: https://openfast.readthedocs.io/en/main/
- 원문 표시 날짜: 2026-03-12
- 공식 소스 커밋: `2895884d2be01862173c88d70f86b358d2f1a50a`
- 수집·번역 날짜: 2026-11-08 (Asia/Seoul)
- 검색 색인 문서: **158개**
- 본문 기준: 표 **99개**, 그림 참조 **81개**, 수식 요소 **3,239개**, 코드 블록 **233개**

## 번역·리뷰 범위

Google Translate 공개 번역 엔드포인트(gtx)를 이용해 표시 텍스트 노드를 번역하고, 주요 제목·용어·첫 설명과 누락된 구절을 수동 보정했습니다. 번호가 붙은 묶음의 대응 관계를 확인했으며 번역 적용 여부를 별도로 집계했습니다.

**전문 번역자의 전체 감수나 OpenFAST 수치해석 검증을 완료한 자료는 아닙니다.** 전문용어·조건문·인라인 수식 사이의 문장은 원문 대조가 필요할 수 있습니다. 각 페이지의 영문 원문 링크로 대조할 수 있습니다.

명령어, 입력 파일 예제, 기술 식별자, LaTeX 수식, 이미지·도면 내부의 글자, PDF·DOCX 첨부와 원문 RST는 원형을 보존했습니다. 외부 MoorDyn 사이트, dev·과거 버전과 첨부 PDF 전체를 한국어로 번역한 것은 아닙니다.

상세 리뷰는 문서 구조, 설치·재현성, 입력 형식, 연성, 모듈별 사용 범위, 선형화, 문서 공백을 다룹니다. 전체 158개 문서의 도입부·절 구성·주의문과 구성요소 개수는 `coverage.html`에서 확인합니다. 원문의 API 경로 3개가 404였던 사실도 기록했습니다.

## Google Sites 배포 구조

정적 문서는 **GitHub Pages**, 방문 진입점은 **Google Sites 전체 페이지 삽입**으로 제공합니다. Google Sites에 HTML/CSS 파일들을 네이티브 페이지 158개로 업로드한 방식이 아닙니다. GitHub Pages에서 직접 열어도 목차·검색·수식이 작동합니다.

Google Sites 주소와 최종 검증 상태는 `reports/deployment.json`을 참조합니다. 원본 테마를 유지하지만 한국어 줄바꿈·글꼴 대체·번역 안내와 Google Sites의 바깥 탐색 프레임 때문에 모든 픽셀이 동일하지는 않습니다.

## 로컬 실행

Node.js 22 이상이 필요합니다.

```sh
npm ci
npm run serve
# http://127.0.0.1:4387/
```

이미 완성된 `docs/`가 저장되어 있어 실행에 번역 서비스가 필요하지 않습니다. 기존 번역으로 재빌드·검증하려면:

```sh
node scripts/coverage.mjs
npm run build
npm run verify
```

캐시가 없으면 추적된 원문 HTML과 배포 자산에서 복원합니다. `npm run translate`는 필요할 때만 실행하며 영문 공개 텍스트를 외부 번역 서비스에 전송합니다. 기존 번역을 읽는 사이트 방문자에게 번역 API 요청이나 API 키를 요구하지 않습니다.

## 파일 구성

| 경로 | 내용 |
| --- | --- |
| `docs/` | GitHub Pages에서 제공하는 완성된 정적 사이트 |
| `upstream/html/` | 번역 전 원문 HTML 스냅샷 |
| `translations/machine.json` | 텍스트별 자동번역 메모리 |
| `translations/overrides.json` | 수동 보정 |
| `content/review.html` | 원문과 구별되는 한국어 기술 리뷰 |
| `content/coverage.html` | 158개 문서의 구조 검토 기록 |
| `scripts/` | 수집·자산 복구·번역·빌드·검증·로컬 서버 |
| `reports/source-manifest.json` | 출처·SHA-256·수집 실패 기록 |
| `reports/verification.json` | 수식·코드·구조·자산·내부 링크 검증 |
| `reports/translation-effective.json` | 수동 보정 적용 후 누락 여부 |

## 검증의 의미

검증 스크립트는 158개 페이지의 존재, 원문 코드·수식의 텍스트 일치, 표·그림·제목 개수와 앵커 보존, 정적 자산 해시, 로컬 링크를 대조합니다. 원문에 이미 존재하는 잘못된 앵커는 경고로 기록합니다. 번역의 모든 문장이 기술적으로 정확하다는 자동 판정은 수행하지 않습니다.

## 라이선스와 고지

OpenFAST 원문: Apache License 2.0. 저작권 고지를 유지했습니다. 변경된 HTML마다 번역·변경 안내를 추가했습니다. Sphinx Read the Docs 테마·JavaScript·폰트 등은 `licenses/`, `NOTICE`, 원본 파일의 고지를 참조합니다. OpenFAST·NLR·NREL 또는 Read the Docs의 공식 한국어판이나 승인된 배포를 의미하지 않습니다.
