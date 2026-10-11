from django.contrib import admin
from .models import Employee, Department, Leave, Attendance
# Register your models here.

admin.site.register(Employee)
admin.site.register(Department)
admin.site.register(Leave)
admin.site.register(Attendance)