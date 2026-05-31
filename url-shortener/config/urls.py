from django.urls import path

from shortener import views

urlpatterns = [
    path("", views.index, name="index"),
    path("healthz", views.healthz, name="healthz"),
    path("shorten", views.shorten, name="shorten"),
    path("<str:code>", views.follow, name="follow"),
]
