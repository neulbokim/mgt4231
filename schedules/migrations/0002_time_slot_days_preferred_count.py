from datetime import time

from django.db import migrations, models


def populate_time_slots(apps, schema_editor):
    TimeSlot = apps.get_model('schedules', 'TimeSlot')

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

    for order, (label, start, end, duration, active_days) in enumerate(slot_defs, start=1):
        TimeSlot.objects.update_or_create(
            label=label,
            defaults={
                'start_time': start,
                'end_time': end,
                'duration_hours': duration,
                'order': order,
                'active_days': active_days,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ('schedules', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='timeslot',
            name='active_days',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='departmentrequirement',
            name='preferred_count',
            field=models.PositiveSmallIntegerField(default=2),
        ),
        migrations.RunPython(populate_time_slots, migrations.RunPython.noop),
    ]
