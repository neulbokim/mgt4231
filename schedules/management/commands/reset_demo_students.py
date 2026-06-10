from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from schedules.models import Availability, ScheduleAssignment, Student


class Command(BaseCommand):
    help = 'Reset demo student names and clear availability/assignment data.'

    default_student_names = [
        '박은빈', '남지현', '박찬욱', '심종혁', '김현서',
        '송형준', '이한나', '이혜주', '남민석', '신우현',
    ]

    def add_arguments(self, parser):
        parser.add_argument(
            '--student-names',
            default='',
            help='Comma-separated student names to set. Example: "A,B,C"',
        )

    def _student_names(self, options):
        raw = (options.get('student_names') or '').strip()
        if not raw:
            return self.default_student_names
        names = [name.strip() for name in raw.split(',') if name.strip()]
        return names or self.default_student_names

    def handle(self, *args, **options):
        names = self._student_names(options)
        if len(names) != 10:
            raise CommandError('student names must contain exactly 10 comma-separated names.')

        with transaction.atomic():
            deleted_availability, _ = Availability.objects.all().delete()
            deleted_assignments, _ = ScheduleAssignment.objects.all().delete()

            students = list(Student.objects.select_related('department').order_by('department_id', 'id'))
            if len(students) != 10:
                raise CommandError(f'expected 10 students, found {len(students)}.')

            for student, name in zip(students, names):
                student.name = name
                student.major = '데모'
                student.save(update_fields=['name', 'major'])

        self.stdout.write(self.style.SUCCESS(
            f'Reset complete: deleted {deleted_availability} availabilities, {deleted_assignments} assignments, renamed {len(students)} students.'
        ))
