from django.db import models


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    location = models.CharField(max_length=100, blank=True)
    manager_name = models.CharField(max_length=50, blank=True)
    manager_phone = models.CharField(max_length=30, blank=True)

    def __str__(self):
        return self.name


class WorkTerm(models.Model):
    name = models.CharField(max_length=30, unique=True)  # 예: 2026-1학기
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Student(models.Model):
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='students')
    name = models.CharField(max_length=50)
    student_no = models.CharField(max_length=20, unique=True)
    major = models.CharField(max_length=100, blank=True)
    grade = models.PositiveSmallIntegerField(default=1)
    min_weekly_hours = models.DecimalField(max_digits=4, decimal_places=1, default=4.0)
    max_weekly_hours = models.DecimalField(max_digits=4, decimal_places=1, default=14.0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name}({self.student_no})'


class TimeSlot(models.Model):
    label = models.CharField(max_length=30)
    start_time = models.TimeField()
    end_time = models.TimeField()
    order = models.PositiveSmallIntegerField(default=0)
    duration_hours = models.DecimalField(max_digits=3, decimal_places=1, default=1.0)
    active_days = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.label


class Availability(models.Model):
    AVAILABLE = 'AVAILABLE'
    CLASS = 'CLASS'
    MEAL = 'MEAL'
    ETC = 'ETC'
    PREFERRED = 'PREFERRED'
    STATUS_CHOICES = [
        (AVAILABLE, '근무 가능'),
        (CLASS, '수업'),
        (MEAL, '식사'),
        (ETC, '기타'),
        (PREFERRED, '근무 희망'),
    ]
    DAYS = [('MON', '월'), ('TUE', '화'), ('WED', '수'), ('THU', '목'), ('FRI', '금'), ('SAT', '토'), ('SUN', '일')]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='availabilities')
    term = models.ForeignKey(WorkTerm, on_delete=models.CASCADE)
    week_no = models.PositiveSmallIntegerField(default=1)
    day = models.CharField(max_length=3, choices=DAYS)
    slot = models.ForeignKey(TimeSlot, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=ETC)

    class Meta:
        unique_together = ('student', 'term', 'week_no', 'day', 'slot')
        indexes = [models.Index(fields=['term', 'week_no', 'day', 'slot'])]


class DepartmentRequirement(models.Model):
    GENERAL = 'GENERAL'
    CRITICAL = 'CRITICAL'
    PRIORITY_CHOICES = [(GENERAL, '일반'), (CRITICAL, '필수 충원')]

    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='requirements')
    term = models.ForeignKey(WorkTerm, on_delete=models.CASCADE)
    week_no = models.PositiveSmallIntegerField(default=1)
    day = models.CharField(max_length=3, choices=Availability.DAYS)
    slot = models.ForeignKey(TimeSlot, on_delete=models.CASCADE)
    required_count = models.PositiveSmallIntegerField(default=1)
    preferred_count = models.PositiveSmallIntegerField(default=2)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default=GENERAL)

    class Meta:
        unique_together = ('department', 'term', 'week_no', 'day', 'slot')
        indexes = [models.Index(fields=['department', 'term', 'week_no'])]


class ScheduleAssignment(models.Model):
    DRAFT = 'DRAFT'
    CONFIRMED = 'CONFIRMED'
    CHANGED = 'CHANGED'
    UNFILLED = 'UNFILLED'
    STATUS_CHOICES = [(DRAFT, '임시 배정'), (CONFIRMED, '확정'), (CHANGED, '변경됨'), (UNFILLED, '미충원')]
    AUTO = 'AUTO'
    MANUAL = 'MANUAL'
    SUBSTITUTE = 'SUBSTITUTE'
    SOURCE_CHOICES = [(AUTO, '자동 생성'), (MANUAL, '수동 수정'), (SUBSTITUTE, '대타 반영')]

    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='assignments')
    term = models.ForeignKey(WorkTerm, on_delete=models.CASCADE)
    week_no = models.PositiveSmallIntegerField(default=1)
    day = models.CharField(max_length=3, choices=Availability.DAYS)
    slot = models.ForeignKey(TimeSlot, on_delete=models.CASCADE)
    student = models.ForeignKey(Student, null=True, blank=True, on_delete=models.SET_NULL, related_name='assignments')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=DRAFT)
    source = models.CharField(max_length=12, choices=SOURCE_CHOICES, default=AUTO)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=['department', 'term', 'week_no', 'day', 'slot'])]
