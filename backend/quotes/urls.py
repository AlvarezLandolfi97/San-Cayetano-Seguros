from django.urls import path
from .views import QuoteView, QuoteShareCreateView, QuoteShareDetailView

urlpatterns = [
    path("", QuoteView.as_view(), name="quotes"),
    path("share", QuoteShareCreateView.as_view(), name="quote-share-create"),
    path("share/<str:token>", QuoteShareDetailView.as_view(), name="quote-share-detail"),
]
