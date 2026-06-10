from collections import defaultdict
from decimal import Decimal
from .models import Availability, ScheduleAssignment

DAYS = [{'key': key, 'label': label} for key, label in Availability.DAYS]


def department_to_dict(dep):
    return {'id': dep.id, 'name': dep.name, 'location': dep.location, 'managerName': dep.manager_name, 'managerPhone': dep.manager_phone}


def term_to_dict(term):
    return {'id': term.id, 'name': term.name, 'isActive': term.is_active}


def student_to_dict(st):
    return {
        'id': st.id,
        'departmentId': st.department_id,
        'name': st.name,
        'studentNo': st.student_no,
        'major': st.major,
        'grade': st.grade,
        'minWeeklyHours': float(st.min_weekly_hours),
        'maxWeeklyHours': float(st.max_weekly_hours),
    }


def slot_to_dict(slot):
    return {
        'id': slot.id,
        'label': slot.label,
        'startTime': slot.start_time.strftime('%H:%M'),
        'endTime': slot.end_time.strftime('%H:%M'),
        'durationHours': float(slot.duration_hours),
        'order': slot.order,
        'activeDays': slot.active_days or [],
    }


def assignment_to_dict(a):
    return {
        'id': a.id,
        'departmentId': a.department_id,
        'termId': a.term_id,
        'weekNo': a.week_no,
        'day': a.day,
        'slotId': a.slot_id,
        'slotLabel': a.slot.label,
        'studentId': a.student_id,
        'studentName': a.student.name if a.student else '#N/A',
        'status': a.status,
        'source': a.source,
    }


def summarize_assignments(assignments):
    student_hours = defaultdict(Decimal)
    day_hours = defaultdict(Decimal)
    for a in assignments:
        if a.student_id:
            dur = Decimal(str(a.slot.duration_hours))
            student_hours[a.student.name] += dur
            day_hours[(a.student.name, a.day)] += dur
    return {
        'studentHours': {name: float(hours) for name, hours in student_hours.items()},
        'dayHours': {f'{name}:{day}': float(hours) for (name, day), hours in day_hours.items()},
    }
