from django.urls import path
from . import views

urlpatterns = [
    path('bootstrap/', views.bootstrap),
    path('availability/<int:student_id>/<int:term_id>/<int:week_no>/', views.availability_detail),
    path('availability-summary/<int:department_id>/<int:term_id>/<int:week_no>/', views.availability_summary),
    path('requirements/<int:department_id>/<int:term_id>/<int:week_no>/', views.requirements_detail),
    path('generate/', views.generate_schedule_view),
    path('schedule/<int:department_id>/<int:term_id>/<int:week_no>/', views.schedule_detail),
    path('assignments/<int:assignment_id>/', views.assignment_update),
    path('confirm/<int:department_id>/<int:term_id>/<int:week_no>/', views.confirm_schedule),
]
