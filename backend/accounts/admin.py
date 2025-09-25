from django.contrib import admin
from .models import User
from django.contrib.auth.admin import UserAdmin as BaseAdmin

@admin.register(User)
class UserAdmin(BaseAdmin):
    fieldsets = (
        (None, {'fields': ('dni','password')}),
        ('Personal info', {'fields': ('first_name','last_name','email','phone','birth_date')}),
        ('Permissions', {'fields': ('is_active','is_staff','is_superuser','groups','user_permissions')}),
        ('Important dates', {'fields': ('last_login','date_joined')}),
    )
    add_fieldsets = ((None, {'classes': ('wide',),'fields': ('dni','password1','password2'),}),)
    list_display = ('id','dni','email','is_staff')
    search_fields = ('dni','email')
    ordering = ('-id',)
