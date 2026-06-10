from datetime import date, time
from django.core.management.base import BaseCommand, CommandError
from schedules.models import Department, WorkTerm, Student, TimeSlot, Availability, DepartmentRequirement


class Command(BaseCommand):
    help = 'Create demo data for the SAINT work schedule MVP.'

    default_student_names = [
        '박은빈', '남지현', '박찬욱', '심종혁', '김현서',
        '송형준', '이한나', '이혜주', '남민석', '신우현',
    ]

    def add_arguments(self, parser):
        parser.add_argument(
            '--student-names',
            default='',
            help='Comma-separated student names to use for demo data. Example: "A,B,C"',
        )

    def _student_names(self, options):
        raw = (options.get('student_names') or '').strip()
        if not raw:
            return self.default_student_names
        names = [name.strip() for name in raw.split(',') if name.strip()]
        return names or self.default_student_names

    def handle(self, *args, **options):
        dep, _ = Department.objects.get_or_create(
            name='로욜라도서관',
            defaults={'location': '로욜라도서관 1층', 'manager_name': '김선생', 'manager_phone': '705-8192'},
        )
        term, _ = WorkTerm.objects.get_or_create(
            name='2026-1학기',
            defaults={'start_date': date(2026, 3, 2), 'end_date': date(2026, 6, 21), 'is_active': True},
        )

        weekday_days = ['MON', 'TUE', 'WED', 'THU', 'FRI']
        saturday_days = ['SAT']
        slot_defs = [
            ('08:00~09:00', time(8, 0), time(9, 0), 1.0, weekday_days),
            ('09:00~10:30', time(9, 0), time(10, 30), 1.5, weekday_days),
            ('10:30~12:00', time(10, 30), time(12, 0), 1.5, weekday_days),
            ('12:00~13:30', time(12, 0), time(13, 30), 1.5, weekday_days),
            ('13:30~15:00', time(13, 30), time(15, 0), 1.5, weekday_days),
            ('15:00~16:30', time(15, 0), time(16, 30), 1.5, weekday_days),
            ('16:30~18:00', time(16, 30), time(18, 0), 1.5, weekday_days),
            ('18:00~19:00', time(18, 0), time(19, 0), 1.0, weekday_days),
            ('19:00~20:00', time(19, 0), time(20, 0), 1.0, weekday_days),
            ('20:00~21:00', time(20, 0), time(21, 0), 1.0, weekday_days),
            ('21:00~22:00', time(21, 0), time(22, 0), 1.0, weekday_days),
            ('09:00~13:00', time(9, 0), time(13, 0), 4.0, saturday_days),
            ('13:00~17:00', time(13, 0), time(17, 0), 4.0, saturday_days),
        ]
        slots = []
        for i, (label, start, end, dur, active_days) in enumerate(slot_defs, start=1):
            slot, _ = TimeSlot.objects.update_or_create(
                label=label,
                defaults={
                    'start_time': start,
                    'end_time': end,
                    'duration_hours': dur,
                    'order': i,
                    'active_days': active_days,
                },
            )
            slots.append(slot)

        names = self._student_names(options)
        if len(names) != 10:
            raise CommandError('student names must contain exactly 10 comma-separated names.')
        students = []
        for idx, name in enumerate(names, start=1):
            st, _ = Student.objects.get_or_create(
                student_no=f'2026{idx:04d}',
                defaults={'department': dep, 'name': name, 'major': '경영학', 'grade': 2 + idx % 3, 'min_weekly_hours': 4, 'max_weekly_hours': 14},
            )
            students.append(st)

        days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
        for st_idx, st in enumerate(students):
            for day_idx, day in enumerate(days):
                active_slots = [slot for slot in slots if day in (slot.active_days or [])]
                for slot_idx, slot in enumerate(active_slots):
                    if slot_idx in [3, 7]:
                        status = Availability.MEAL
                    elif (st_idx + day_idx + slot_idx) % 11 == 0:
                        status = Availability.EXAM
                    elif (st_idx + day_idx + slot_idx) % 5 == 0:
                        status = Availability.CLASS
                    elif (st_idx + day_idx + slot_idx) % 7 == 0:
                        status = Availability.ETC
                    elif (st_idx + slot_idx) % 6 == 0:
                        status = Availability.PREFERRED
                    else:
                        status = Availability.AVAILABLE
                    Availability.objects.update_or_create(
                        student=st, term=term, week_no=1, day=day, slot=slot,
                        defaults={'status': status},
                    )

        for day in days:
            active_slots = [slot for slot in slots if day in (slot.active_days or [])]
            for slot in active_slots:
                DepartmentRequirement.objects.update_or_create(
                    department=dep, term=term, week_no=1, day=day, slot=slot,
                    defaults={
                        'required_count': 1,
                        'preferred_count': 2,
                        'max_count': 2,
                        'priority': DepartmentRequirement.GENERAL,
                    },
                )

        self.stdout.write(self.style.SUCCESS('Demo data created.'))
