import json
from collections import defaultdict
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods, require_POST
from django.views.decorators.csrf import ensure_csrf_cookie
from django.db import transaction

from .algorithm import generate_schedule
from .models import Department, WorkTerm, Student, TimeSlot, Availability, DepartmentRequirement, ScheduleAssignment
from .serializers import (
    DAYS, department_to_dict, term_to_dict, student_to_dict, slot_to_dict,
    assignment_to_dict, summarize_assignments,
)


@ensure_csrf_cookie
def index(request):
    return render(request, 'index.html')


def _body(request):
    return json.loads(request.body.decode('utf-8') or '{}')


def bootstrap(request):
    return JsonResponse({
        'departments': [department_to_dict(d) for d in Department.objects.all().order_by('name')],
        'terms': [term_to_dict(t) for t in WorkTerm.objects.all().order_by('-id')],
        'students': [student_to_dict(s) for s in Student.objects.select_related('department').all()],
        'slots': [slot_to_dict(s) for s in TimeSlot.objects.all()],
        'days': DAYS,
        'statuses': [
            {'key': Availability.AVAILABLE, 'label': '근무 가능'},
            {'key': Availability.CLASS, 'label': '수업'},
            {'key': Availability.MEAL, 'label': '식사'},
            {'key': Availability.ETC, 'label': '기타'},
            {'key': Availability.PREFERRED, 'label': '근무 희망'},
        ],
    })


@require_http_methods(['GET', 'PUT'])
def availability_detail(request, student_id, term_id, week_no):
    student = get_object_or_404(Student, id=student_id)
    term = get_object_or_404(WorkTerm, id=term_id)

    if request.method == 'GET':
        rows = Availability.objects.filter(student=student, term=term, week_no=week_no)
        return JsonResponse({'items': [
            {'day': r.day, 'slotId': r.slot_id, 'status': r.status} for r in rows
        ]})

    payload = _body(request)
    items = payload.get('items', [])
    with transaction.atomic():
        for item in items:
            slot = get_object_or_404(TimeSlot, id=item['slotId'])
            Availability.objects.update_or_create(
                student=student,
                term=term,
                week_no=week_no,
                day=item['day'],
                slot=slot,
                defaults={'status': item.get('status', Availability.ETC)},
            )
    return JsonResponse({'ok': True, 'savedCount': len(items)})


def availability_summary(request, department_id, term_id, week_no):
    department = get_object_or_404(Department, id=department_id)
    term = get_object_or_404(WorkTerm, id=term_id)
    rows = Availability.objects.filter(
        student__department=department,
        term=term,
        week_no=week_no,
        status__in=[Availability.AVAILABLE, Availability.PREFERRED],
    ).select_related('student', 'slot')

    summary = defaultdict(list)
    submitted = set()
    for r in rows:
        summary[f'{r.day}:{r.slot_id}'].append({'id': r.student_id, 'name': r.student.name, 'status': r.status})
        submitted.add(r.student_id)

    all_students = list(department.students.filter(is_active=True))
    submitted_all = set(Availability.objects.filter(
        student__department=department, term=term, week_no=week_no
    ).values_list('student_id', flat=True).distinct())

    return JsonResponse({
        'summary': dict(summary),
        'submittedStudentIds': list(submitted_all),
        'notSubmittedStudentIds': [s.id for s in all_students if s.id not in submitted_all],
    })


@require_http_methods(['GET', 'PUT'])
def requirements_detail(request, department_id, term_id, week_no):
    department = get_object_or_404(Department, id=department_id)
    term = get_object_or_404(WorkTerm, id=term_id)

    if request.method == 'GET':
        rows = DepartmentRequirement.objects.filter(department=department, term=term, week_no=week_no)
        return JsonResponse({'items': [
            {
                'day': r.day,
                'slotId': r.slot_id,
                'requiredCount': r.required_count,
                'preferredCount': r.preferred_count,
                'priority': r.priority,
            }
            for r in rows
        ]})

    payload = _body(request)
    items = payload.get('items', [])
    with transaction.atomic():
        for item in items:
            slot = get_object_or_404(TimeSlot, id=item['slotId'])
            DepartmentRequirement.objects.update_or_create(
                department=department,
                term=term,
                week_no=week_no,
                day=item['day'],
                slot=slot,
                defaults={
                    'required_count': int(item.get('requiredCount', 0)),
                    'preferred_count': max(
                        int(item.get('preferredCount', item.get('requiredCount', 0) or 0)),
                        int(item.get('requiredCount', 0)),
                    ),
                    'priority': item.get('priority', DepartmentRequirement.GENERAL),
                },
            )
    return JsonResponse({'ok': True, 'savedCount': len(items)})


@require_POST
def generate_schedule_view(request):
    payload = _body(request)
    department = get_object_or_404(Department, id=payload['departmentId'])
    term = get_object_or_404(WorkTerm, id=payload['termId'])
    week_no = int(payload.get('weekNo', 1))
    result = generate_schedule(department, term, week_no)
    return JsonResponse({'ok': True, 'result': result})


def schedule_detail(request, department_id, term_id, week_no):
    department = get_object_or_404(Department, id=department_id)
    term = get_object_or_404(WorkTerm, id=term_id)
    assignments = list(ScheduleAssignment.objects.filter(
        department=department, term=term, week_no=week_no
    ).select_related('student', 'slot').order_by('day', 'slot__order', 'id'))
    unfilled = sum(1 for a in assignments if a.status == ScheduleAssignment.UNFILLED)
    return JsonResponse({
        'items': [assignment_to_dict(a) for a in assignments],
        'summary': summarize_assignments(assignments),
        'unfilledCount': unfilled,
    })


@require_http_methods(['PATCH'])
def assignment_update(request, assignment_id):
    assignment = get_object_or_404(ScheduleAssignment, id=assignment_id)
    payload = _body(request)
    student_id = payload.get('studentId')
    student = None
    status = ScheduleAssignment.UNFILLED
    if student_id:
        student = get_object_or_404(Student, id=student_id, department=assignment.department)
        # 최소 검증: 해당 학생이 해당 시간에 가능한지 확인
        available = Availability.objects.filter(
            student=student,
            term=assignment.term,
            week_no=assignment.week_no,
            day=assignment.day,
            slot=assignment.slot,
            status__in=[Availability.AVAILABLE, Availability.PREFERRED],
        ).exists()
        if not available:
            return JsonResponse({'ok': False, 'message': '해당 학생은 이 시간대에 근무 가능 상태가 아닙니다.'}, status=400)
        status = ScheduleAssignment.CHANGED

    assignment.student = student
    assignment.status = status
    assignment.source = ScheduleAssignment.MANUAL
    assignment.save()
    return JsonResponse({'ok': True, 'item': assignment_to_dict(assignment)})


@require_POST
def confirm_schedule(request, department_id, term_id, week_no):
    department = get_object_or_404(Department, id=department_id)
    term = get_object_or_404(WorkTerm, id=term_id)
    updated = ScheduleAssignment.objects.filter(
        department=department,
        term=term,
        week_no=week_no,
    ).exclude(status=ScheduleAssignment.UNFILLED).update(status=ScheduleAssignment.CONFIRMED)
    return JsonResponse({'ok': True, 'updatedCount': updated})
