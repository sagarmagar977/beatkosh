from django.contrib import admin

from projects.models import Deliverable, Milestone, Project, ProjectRequest, Proposal

admin.site.register(ProjectRequest)
admin.site.register(Proposal)
admin.site.register(Project)
admin.site.register(Milestone)
admin.site.register(Deliverable)
