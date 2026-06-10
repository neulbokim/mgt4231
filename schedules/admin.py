from django.contrib import admin
from .models import Department, WorkTerm, Student, TimeSlot, Availability, DepartmentRequirement, ScheduleAssignment

admin.site.register(Department)
admin.site.register(WorkTerm)
admin.site.register(Student)
admin.site.register(TimeSlot)
admin.site.register(Availability)
admin.site.register(DepartmentRequirement)
admin.site.register(ScheduleAssignment)
