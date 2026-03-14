from django.db import models


class ResourceArticle(models.Model):
    CATEGORY_BLOG = "blog"
    CATEGORY_TUTORIAL = "tutorial"
    CATEGORY_HELP = "help"
    CATEGORY_CHOICES = (
        (CATEGORY_BLOG, "Blog"),
        (CATEGORY_TUTORIAL, "Tutorial"),
        (CATEGORY_HELP, "Help Desk"),
    )

    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    title = models.CharField(max_length=220)
    slug = models.SlugField(max_length=250, unique=True)
    summary = models.CharField(max_length=500, blank=True)
    content = models.TextField()
    is_published = models.BooleanField(default=True)
    published_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-published_at",)

    def __str__(self) -> str:
        return self.title


class FAQItem(models.Model):
    question = models.CharField(max_length=280)
    answer = models.TextField()
    order = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("order", "id")

    def __str__(self) -> str:
        return self.question
