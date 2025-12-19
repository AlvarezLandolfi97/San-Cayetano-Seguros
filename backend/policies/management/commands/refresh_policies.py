from datetime import date

from django.core.management.base import BaseCommand

from policies.billing import (
    regenerate_installments,
    refresh_installment_statuses,
    update_policy_status_from_installments,
)
from policies.models import Policy
from common.models import AppSettings


class Command(BaseCommand):
    help = "Recalcula cuotas y estado de pólizas. Útil para cron/beat diario."

    def add_arguments(self, parser):
        parser.add_argument(
            "--policy-id",
            type=int,
            help="Limita la ejecución a una póliza específica.",
        )
        parser.add_argument(
            "--refresh-only-status",
            action="store_true",
            help="No regenera cuotas; solo refresca estado desde cuotas existentes.",
        )

    def handle(self, *args, **options):
        qs = Policy.objects.all().select_related("product", "user")
        if options.get("policy_id"):
            qs = qs.filter(id=options["policy_id"])

        settings_obj = AppSettings.get_solo()
        count = 0
        today = date.today()

        for policy in qs.iterator():
            if not options.get("refresh_only_status"):
                regenerate_installments(policy)
            insts = list(policy.installments.all())
            refresh_installment_statuses(insts, persist=True)
            update_policy_status_from_installments(policy, insts, persist=True)
            count += 1

        self.stdout.write(self.style.SUCCESS(f"Políticas procesadas: {count} (fecha: {today})"))
