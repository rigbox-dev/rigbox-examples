from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Link",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("code", models.CharField(db_index=True, max_length=32, unique=True)),
                ("target", models.URLField(max_length=2000)),
                ("clicks", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
