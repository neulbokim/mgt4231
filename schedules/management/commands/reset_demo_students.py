from django.core.management.base import BaseCommand
from django.db import transaction

from schedules.models import Availability, ScheduleAssignment, Student


class Command(BaseCommand):
    help = 'Reset demo student names and clear availability/assignment data.'

    def handle(self, *args, **options):
        with transaction.atomic():
            deleted_availability, _ = Availability.objects.all().delete()
            deleted_assignments, _ = ScheduleAssignment.objects.all().delete()

            students = list(Student.objects.select_related('department').order_by('department_id', 'id'))
            for idx, student in enumerate(students, start=1):
                student.name = f'데모학생 {idx}'
                student.major = '데모'
                student.save(update_fields=['name', 'major'])

        self.stdout.write(self.style.SUCCESS(
            f'Reset complete: deleted {deleted_availability} availabilities, {deleted_assignments} assignments, renamed {len(students)} students.'
        ))
