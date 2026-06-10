from django.db import migrations, models


def populate_max_count(apps, schema_editor):
    DepartmentRequirement = apps.get_model('schedules', 'DepartmentRequirement')
    for req in DepartmentRequirement.objects.all():
        req.max_count = max(req.max_count or 0, req.preferred_count or 0, req.required_count or 0, 2)
        req.save(update_fields=['max_count'])


class Migration(migrations.Migration):

    dependencies = [
        ('schedules', '0002_time_slot_days_preferred_count'),
    ]

    operations = [
        migrations.AddField(
            model_name='departmentrequirement',
            name='max_count',
            field=models.PositiveSmallIntegerField(default=2),
        ),
        migrations.RunPython(populate_max_count, migrations.RunPython.noop),
    ]
