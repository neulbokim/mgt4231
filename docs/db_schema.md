# DB 설계

## ERD 요약

```text
Department 1 ─── N Student
Department 1 ─── N DepartmentRequirement
Department 1 ─── N ScheduleAssignment
WorkTerm 1 ─── N Availability
WorkTerm 1 ─── N DepartmentRequirement
WorkTerm 1 ─── N ScheduleAssignment
Student 1 ─── N Availability
Student 1 ─── N ScheduleAssignment
TimeSlot 1 ─── N Availability
TimeSlot 1 ─── N DepartmentRequirement
TimeSlot 1 ─── N ScheduleAssignment
```

## 핵심 테이블

### schedules_department
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint | PK |
| name | varchar | 부서명 |
| location | varchar | 근무 장소 |
| manager_name | varchar | 담당자명 |
| manager_phone | varchar | 담당자 연락처 |

### schedules_student
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint | PK |
| department_id | bigint | FK |
| name | varchar | 학생명 |
| student_no | varchar | 학번 |
| major | varchar | 전공 |
| grade | smallint | 학년 |
| min_weekly_hours | decimal | 희망 최소 근무시간 |
| max_weekly_hours | decimal | 주당 최대 근무시간 |
| is_active | boolean | 활성 여부 |

### schedules_availability
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint | PK |
| student_id | bigint | FK |
| term_id | bigint | FK |
| week_no | smallint | 주차 |
| day | varchar | 요일 |
| slot_id | bigint | FK |
| status | varchar | AVAILABLE / CLASS / MEAL / ETC / PREFERRED |

### schedules_timeslot
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint | PK |
| label | varchar | 시간대 라벨 |
| start_time | time | 시작 시각 |
| end_time | time | 종료 시각 |
| order | smallint | 표시 순서 |
| duration_hours | decimal | 근무 시간 길이 |
| active_days | json | 적용 요일 목록 |

### schedules_departmentrequirement
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint | PK |
| department_id | bigint | FK |
| term_id | bigint | FK |
| week_no | smallint | 주차 |
| day | varchar | 요일 |
| slot_id | bigint | FK |
| required_count | smallint | 최소 필요 인원 |
| preferred_count | smallint | 권장 인원 |
| priority | varchar | GENERAL / CRITICAL |

### schedules_scheduleassignment
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint | PK |
| department_id | bigint | FK |
| term_id | bigint | FK |
| week_no | smallint | 주차 |
| day | varchar | 요일 |
| slot_id | bigint | FK |
| student_id | bigint nullable | FK, 미충원 시 null |
| status | varchar | DRAFT / CONFIRMED / CHANGED / UNFILLED |
| source | varchar | AUTO / MANUAL / SUBSTITUTE |
| created_at | datetime | 생성일 |
| updated_at | datetime | 수정일 |
