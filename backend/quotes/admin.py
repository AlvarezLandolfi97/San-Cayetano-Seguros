from django.contrib import admin
from .models import QuoteShare


@admin.register(QuoteShare)
class QuoteShareAdmin(admin.ModelAdmin):
    list_display = ("token", "phone", "make", "model", "year", "created_at")
    search_fields = ("token", "phone", "make", "model", "version", "city")
    readonly_fields = ("token", "created_at")
