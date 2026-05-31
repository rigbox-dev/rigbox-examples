from django.db import models


class Link(models.Model):
    code = models.CharField(max_length=32, unique=True, db_index=True)
    target = models.URLField(max_length=2000)
    clicks = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
