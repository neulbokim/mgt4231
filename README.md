# SAINT 기반 교내근로 근무시간표 조율 MVP

학생별 근무 희망 입력 → 나의 근무시간표 → 관리자용 근무 가능 시간 수합 → 부서별 필요 인원 설정(최소/권장/최대) → 전체 근무시간표까지 구현한 Django 기반 MVP입니다.
상단 헤더의 날짜와 환영 문구는 현재 시각과 선택된 학생을 기준으로 자동 표시됩니다.
사이드바는 학생용 화면과 관리자용 화면으로 나눠서 보여줍니다.

## 1. 기술 스택

- Backend: Django 5
- Frontend: Django Template + Vanilla JavaScript
- DB: SQLite 기본, PostgreSQL 전환 가능
- Scheduling Algorithm: Greedy 기반 MVP 알고리즘

## 2. 프로젝트 구조

```text
saint-work-schedule-system/
├── manage.py
├── requirements.txt
├── .env.example
├── docker-compose.yml
├── config/
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── schedules/
│   ├── models.py
│   ├── views.py
│   ├── urls.py
│   ├── algorithm.py
│   ├── serializers.py
│   ├── admin.py
│   ├── migrations/
│   │   └── 0001_initial.py
│   └── management/commands/
│       ├── seed_demo.py
│       └── reset_demo_students.py
├── templates/
│   └── index.html
└── static/
    ├── css/styles.css
    └── js/
        ├── api.js
        └── app.js
```

## 3. 실행 방법

로컬 개발 환경 기준입니다. `seed_demo`는 데모 데이터(부서, 학기, 학생, 시간대, 필요 인원)를 넣고, `reset_demo_students`는 학생 이름과 가능 시간, 배정 데이터를 다시 초기화합니다. 기본 학생 이름은 `박은빈, 남지현, 박찬욱, 심종혁, 김현서, 송형준, 이한나, 이혜주, 남민석, 신우현`입니다.

```bash
cd saint-work-schedule-system
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

브라우저에서 접속:

```text
http://127.0.0.1:8000
```

### 데모 학생 초기화

학생 이름과 가능 시간, 배정 데이터를 초기화하고 싶으면 아래 명령을 사용합니다.

```bash
python manage.py reset_demo_students
```

학생 이름을 직접 넣고 싶을 때는 `--student-names` 옵션을 사용합니다. 이름은 10개를 콤마로 구분해서 넣어야 합니다. 옵션을 생략하면 위 기본 이름이 사용됩니다.

```bash
python manage.py seed_demo --student-names "박은빈,남지현,박찬욱,심종혁,김현서,송형준,이한나,이혜주,남민석,신우현"
python manage.py reset_demo_students --student-names "박은빈,남지현,박찬욱,심종혁,김현서,송형준,이한나,이혜주,남민석,신우현"
```

## 4. PostgreSQL 사용 방법

```bash
docker compose up -d
```

`.env`를 다음처럼 수정합니다.

```text
DATABASE_URL=postgres://saint:saintpass@localhost:5432/saint_schedule
```

이후:

```bash
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

초기화가 필요하면 위의 `reset_demo_students` 명령을 먼저 실행한 뒤 다시 `seed_demo`를 실행하면 됩니다. `build.sh`도 동일하게 `seed_demo`를 실행하므로, 배포 환경에서도 같은 데모 이름이 들어갑니다.

## 5. Render 배포

Render에 올릴 때는 이 저장소의 `build.sh`를 그대로 쓰면 됩니다.

- Build Command: `./build.sh`
- Start Command: `gunicorn config.wsgi:application`
- Environment Variables: `SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `DATABASE_URL`

Render에서 PostgreSQL을 붙인 경우 `DATABASE_URL`만 맞게 넣어주면 됩니다. 정적 파일은 `collectstatic`으로 자동 처리됩니다.

## 6. 주요 화면

### 학생

1. 근무 희망 입력
2. 나의 근무시간표

### 관리자

1. 근무 가능 시간 수합
2. 부서별 필요 인원 설정
3. 전체 근무시간표

## 7. 주요 API

| Method | URL | 설명 |
|---|---|---|
| GET | `/api/bootstrap/` | 초기 데이터 로드 |
| GET/PUT | `/api/availability/{student_id}/{term_id}/{week_no}/` | 학생별 가능 시간 조회/저장 |
| GET | `/api/availability-summary/{department_id}/{term_id}/{week_no}/` | 직원용 가능 시간 수합 |
| GET/PUT | `/api/requirements/{department_id}/{term_id}/{week_no}/` | 부서 필요 인원 조회/저장 |
| POST | `/api/generate/` | 자동 시간표 생성 |
| GET | `/api/schedule/{department_id}/{term_id}/{week_no}/` | 전체 시간표 조회 |
| PATCH | `/api/assignments/{assignment_id}/` | 배정 학생 수동 변경 |
| POST | `/api/confirm/{department_id}/{term_id}/{week_no}/` | 시간표 확정 |

## 8. DB 설계 요약

### Department
근로 부서 정보입니다. 부서명, 위치, 담당자 정보를 저장합니다.

### WorkTerm
학기 단위 정보입니다. 예: 2026-1학기.

### Student
근로 학생 정보입니다. 실제 SAINT 연동 시 학번, 이름, 학과, 학년은 SAINT 학사 DB에서 가져오면 됩니다.

### TimeSlot
근무 시간대 단위입니다. 예: 09:00~10:30. 요일별 적용 범위를 `active_days`로 함께 저장합니다.

### Availability
학생이 입력한 시간대별 상태입니다. 상태값은 `근무 가능`, `수업`, `식사`, `기타`, `근무 희망`입니다.

### DepartmentRequirement
부서가 시간대별로 필요로 하는 근무 인원 수입니다. `required_count`는 최소 필요 인원, `preferred_count`는 가능하면 채우고 싶은 권장 인원, `max_count`는 최대 허용 인원입니다.

### ScheduleAssignment
자동 생성 또는 수동 수정으로 만들어진 최종 근무 배정 결과입니다.

## 9. 알고리즘 MVP 기준

자동 생성 시 다음 조건을 반영합니다.

- `수업`, `기타` 시간에는 배정하지 않음
- `근무 가능`, `근무 희망` 시간만 후보로 사용
- `근무 희망` 시간을 우선 반영
- 부서 필요 인원은 최소 인원부터 채우고, 가능하면 권장 인원, 최대 인원까지 추가 배정
- 학생별 주당 최대 근무시간 제한 반영
- 하루 8시간 미만 조건 반영
- 학생별 누적 배정 시간이 적은 학생을 우선 배정
- 후보자가 없으면 `#N/A` 미충원으로 표시

## 10. 다음 개발 단계

- 로그인/권한 분리: 학생, 직원, 관리자
- SAINT 학사 DB 연동: 학생정보, 수업시간표 자동 반영
- 수동 수정 UI 고도화: 셀 클릭 후 후보 학생 목록 표시
- 대타 요청/승인 모듈 연동
- Google Calendar API 연동
- OR-Tools 기반 최적화 알고리즘으로 교체
