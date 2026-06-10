from collections import defaultdict
from decimal import Decimal
from .models import Availability, DepartmentRequirement, ScheduleAssignment


WORKABLE = {Availability.AVAILABLE, Availability.PREFERRED}


def _duration(slot):
    return Decimal(str(slot.duration_hours))


def generate_schedule(department, term, week_no):
    """
    단순 greedy 기반 MVP 알고리즘.
    목표: 미충원 최소화 + 희망시간 우선 + 학생별 배정시간 균형.
    실제 운영에서는 OR-Tools/ILP로 교체 가능하게 service layer로 분리했다.
    """
    ScheduleAssignment.objects.filter(department=department, term=term, week_no=week_no).delete()

    students = list(department.students.filter(is_active=True))
    total_hours = defaultdict(Decimal)
    day_hours = defaultdict(Decimal)
    assigned_slot_student = set()

    # 기존 확정 배정이 있다면 고려하도록 확장 가능. MVP에서는 신규 생성 기준.
    availabilities = Availability.objects.filter(
        student__department=department,
        term=term,
        week_no=week_no,
        status__in=WORKABLE,
    ).select_related('student', 'slot')

    availability_by_key = defaultdict(list)
    for av in availabilities:
        availability_by_key[(av.day, av.slot_id)].append(av)

    requirements = list(DepartmentRequirement.objects.filter(
        department=department,
        term=term,
        week_no=week_no,
        required_count__gt=0,
    ).select_related('slot').order_by('day', 'slot__order'))

    created = []
    unfilled_count = 0
    violation_count = 0

    def pick_candidate(req):
        candidates = []
        dur = _duration(req.slot)
        for av in availability_by_key.get((req.day, req.slot_id), []):
            student = av.student
            if (req.day, req.slot_id, student.id) in assigned_slot_student:
                continue
            if total_hours[student.id] + dur > Decimal(str(student.max_weekly_hours)):
                continue
            if day_hours[(student.id, req.day)] + dur >= Decimal('8.0'):
                continue
            prefer_score = 0 if av.status == Availability.PREFERRED else 1
            candidates.append((prefer_score, total_hours[student.id], day_hours[(student.id, req.day)], student.name, student))

        if not candidates:
            return None

        candidates.sort(key=lambda x: (x[0], x[1], x[2], x[3]))
        return candidates[0][4]

    for req in requirements:
        for _ in range(req.required_count):
            student = pick_candidate(req)
            if student is None:
                created.append(ScheduleAssignment.objects.create(
                    department=department,
                    term=term,
                    week_no=week_no,
                    day=req.day,
                    slot=req.slot,
                    student=None,
                    status=ScheduleAssignment.UNFILLED,
                    source=ScheduleAssignment.AUTO,
                ))
                unfilled_count += 1
                continue

            dur = _duration(req.slot)
            total_hours[student.id] += dur
            day_hours[(student.id, req.day)] += dur
            assigned_slot_student.add((req.day, req.slot_id, student.id))
            created.append(ScheduleAssignment.objects.create(
                department=department,
                term=term,
                week_no=week_no,
                day=req.day,
                slot=req.slot,
                student=student,
                status=ScheduleAssignment.DRAFT,
                source=ScheduleAssignment.AUTO,
            ))

    preferred_extra_assigned_count = 0
    max_extra_assigned_count = 0
    for req in requirements:
        preferred_needed = max(0, int(req.preferred_count) - int(req.required_count))
        for _ in range(preferred_needed):
            student = pick_candidate(req)
            if student is None:
                break

            dur = _duration(req.slot)
            total_hours[student.id] += dur
            day_hours[(student.id, req.day)] += dur
            assigned_slot_student.add((req.day, req.slot_id, student.id))
            created.append(ScheduleAssignment.objects.create(
                department=department,
                term=term,
                week_no=week_no,
                day=req.day,
                slot=req.slot,
                student=student,
                status=ScheduleAssignment.DRAFT,
                source=ScheduleAssignment.AUTO,
            ))
            preferred_extra_assigned_count += 1

        max_needed = max(0, int(req.max_count) - int(req.preferred_count))
        for _ in range(max_needed):
            student = pick_candidate(req)
            if student is None:
                break

            dur = _duration(req.slot)
            total_hours[student.id] += dur
            day_hours[(student.id, req.day)] += dur
            assigned_slot_student.add((req.day, req.slot_id, student.id))
            created.append(ScheduleAssignment.objects.create(
                department=department,
                term=term,
                week_no=week_no,
                day=req.day,
                slot=req.slot,
                student=student,
                status=ScheduleAssignment.DRAFT,
                source=ScheduleAssignment.AUTO,
            ))
            max_extra_assigned_count += 1

    required_total = sum(r.required_count for r in requirements)
    preferred_total = sum(max(r.required_count, r.preferred_count) for r in requirements)
    max_total = sum(max(r.required_count, r.max_count) for r in requirements)
    filled_total = required_total - unfilled_count
    preferred_filled_total = filled_total + preferred_extra_assigned_count
    max_filled_total = preferred_filled_total + max_extra_assigned_count
    fill_rate = round((filled_total / required_total * 100), 1) if required_total else 0
    preferred_fill_rate = round((preferred_filled_total / preferred_total * 100), 1) if preferred_total else 0
    max_fill_rate = round((max_filled_total / max_total * 100), 1) if max_total else 0
    return {
        'created_count': len(created),
        'required_total': required_total,
        'filled_total': filled_total,
        'unfilled_count': unfilled_count,
        'fill_rate': fill_rate,
        'preferred_total': preferred_total,
        'preferred_filled_total': preferred_filled_total,
        'preferred_fill_rate': preferred_fill_rate,
        'max_total': max_total,
        'max_filled_total': max_filled_total,
        'max_fill_rate': max_fill_rate,
        'extra_assigned_count': preferred_extra_assigned_count + max_extra_assigned_count,
        'preferred_extra_assigned_count': preferred_extra_assigned_count,
        'max_extra_assigned_count': max_extra_assigned_count,
        'violation_count': violation_count,
    }
