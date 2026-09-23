from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie


def api_health(request):
    return JsonResponse({'status': 'ok', 'service': 'hris-api'})


@ensure_csrf_cookie
def api_csrf(request):
    return JsonResponse({'detail': 'CSRF cookie set'})
