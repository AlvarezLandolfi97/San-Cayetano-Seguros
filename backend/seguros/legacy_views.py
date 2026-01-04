from django.shortcuts import redirect
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from common.authentication import SoftJWTAuthentication

LEGACY_DEPRECATION_MESSAGE = {
    "detail": "Endpoint deprecated. Use /api/common/announcements/."
}


@api_view(["GET", "POST", "PUT", "PATCH", "DELETE"])
@authentication_classes([SoftJWTAuthentication])
@permission_classes([AllowAny])
def legacy_announcements_list(request: Request):
    if request.method == "GET":
        return redirect("/api/common/announcements/", permanent=True)
    return Response(LEGACY_DEPRECATION_MESSAGE, status=410)


@api_view(["GET", "POST", "PUT", "PATCH", "DELETE"])
@authentication_classes([SoftJWTAuthentication])
@permission_classes([AllowAny])
def legacy_announcements_detail(request: Request, pk: int):
    if request.method == "GET":
        return redirect(f"/api/common/announcements/{pk}/", permanent=True)
    return Response(LEGACY_DEPRECATION_MESSAGE, status=410)
