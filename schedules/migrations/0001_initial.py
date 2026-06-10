# Generated manually for MVP project
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Department',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
                ('location', models.CharField(blank=True, max_length=100)),
                ('manager_name', models.CharField(blank=True, max_length=50)),
                ('manager_phone', models.CharField(blank=True, max_length=30)),
            ],
        ),
        migrations.CreateModel(
            name='TimeSlot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('label', models.CharField(max_length=30)),
                ('start_time', models.TimeField()),
                ('end_time', models.TimeField()),
                ('order', models.PositiveSmallIntegerField(default=0)),
                ('duration_hours', models.DecimalField(decimal_places=1, default=1.0, max_digits=3)),
            ],
            options={'ordering': ['order']},
        ),
        migrations.CreateModel(
            name='WorkTerm',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=30, unique=True)),
                ('start_date', models.DateField(blank=True, null=True)),
                ('end_date', models.DateField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
            ],
        ),
        migrations.CreateModel(
            name='Student',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50)),
                ('student_no', models.CharField(max_length=20, unique=True)),
                ('major', models.CharField(blank=True, max_length=100)),
                ('grade', models.PositiveSmallIntegerField(default=1)),
                ('min_weekly_hours', models.DecimalField(decimal_places=1, default=4.0, max_digits=4)),
                ('max_weekly_hours', models.DecimalField(decimal_places=1, default=14.0, max_digits=4)),
                ('is_active', models.BooleanField(default=True)),
                ('department', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='students', to='schedules.department')),
            ],
            options={'ordering': ['name']},
        ),
        migrations.CreateModel(
            name='Availability',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('week_no', models.PositiveSmallIntegerField(default=1)),
                ('day', models.CharField(choices=[('MON', '월'), ('TUE', '화'), ('WED', '수'), ('THU', '목'), ('FRI', '금'), ('SAT', '토'), ('SUN', '일')], max_length=3)),
                ('status', models.CharField(choices=[('AVAILABLE', '근무 가능'), ('CLASS', '수업'), ('MEAL', '식사'), ('ETC', '기타'), ('PREFERRED', '근무 희망')], default='ETC', max_length=20)),
                ('slot', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='schedules.timeslot')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='availabilities', to='schedules.student')),
                ('term', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='schedules.workterm')),
            ],
            options={
                'indexes': [models.Index(fields=['term', 'week_no', 'day', 'slot'], name='schedules_a_term_id_e9b46f_idx')],
                'unique_together': {('student', 'term', 'week_no', 'day', 'slot')},
            },
        ),
        migrations.CreateModel(
            name='DepartmentRequirement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('week_no', models.PositiveSmallIntegerField(default=1)),
                ('day', models.CharField(choices=[('MON', '월'), ('TUE', '화'), ('WED', '수'), ('THU', '목'), ('FRI', '금'), ('SAT', '토'), ('SUN', '일')], max_length=3)),
                ('required_count', models.PositiveSmallIntegerField(default=1)),
                ('priority', models.CharField(choices=[('GENERAL', '일반'), ('CRITICAL', '필수 충원')], default='GENERAL', max_length=10)),
                ('department', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='requirements', to='schedules.department')),
                ('slot', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='schedules.timeslot')),
                ('term', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='schedules.workterm')),
            ],
            options={
                'indexes': [models.Index(fields=['department', 'term', 'week_no'], name='schedules_d_departm_9e75f6_idx')],
                'unique_together': {('department', 'term', 'week_no', 'day', 'slot')},
            },
        ),
        migrations.CreateModel(
            name='ScheduleAssignment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('week_no', models.PositiveSmallIntegerField(default=1)),
                ('day', models.CharField(choices=[('MON', '월'), ('TUE', '화'), ('WED', '수'), ('THU', '목'), ('FRI', '금'), ('SAT', '토'), ('SUN', '일')], max_length=3)),
                ('status', models.CharField(choices=[('DRAFT', '임시 배정'), ('CONFIRMED', '확정'), ('CHANGED', '변경됨'), ('UNFILLED', '미충원')], default='DRAFT', max_length=10)),
                ('source', models.CharField(choices=[('AUTO', '자동 생성'), ('MANUAL', '수동 수정'), ('SUBSTITUTE', '대타 반영')], default='AUTO', max_length=12)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('department', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assignments', to='schedules.department')),
                ('slot', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='schedules.timeslot')),
                ('student', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assignments', to='schedules.student')),
                ('term', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='schedules.workterm')),
            ],
            options={'indexes': [models.Index(fields=['department', 'term', 'week_no', 'day', 'slot'], name='schedules_s_departm_f7e4ff_idx')]},
        ),
    ]
