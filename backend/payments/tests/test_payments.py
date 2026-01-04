import importlib
import os
from decimal import Decimal
from unittest import mock
from datetime import date, timedelta

from django.core.exceptions import ValidationError
from django.db import IntegrityError, connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth import get_user_model

from products.models import Product
from policies.models import Policy, PolicyInstallment
from payments.models import Payment, Receipt
from policies.billing import (
    regenerate_installments,
    mark_cycle_installment_paid,
)
from types import SimpleNamespace
from payments.utils import choose_canonical_payment_for_installment, period_from_installment


User = get_user_model()


class CreatePreferenceTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            dni="50000000", email="pay@example.com", password="PayPass123"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.product = Product.objects.create(
            code="PAY",
            name="Plan Pago",
            vehicle_type="AUTO",
            plan_type="TR",
            min_year=1990,
            max_year=2100,
            base_price=15000,
            coverages="",
        )
        self.policy = Policy.objects.create(
            number="SC-PAY-1",
            user=self.user,
            product=self.product,
            premium=15000,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=90),
            status="active",
        )
        regenerate_installments(self.policy)
        self.installment = self.policy.installments.order_by("sequence").first()

    @mock.patch.dict("os.environ", {"MP_ACCESS_TOKEN": "dummy"})
    @mock.patch("payments.views._mp_create_preference")
    def test_create_preference_success(self, mock_mp_create):
        mock_mp_create.return_value = ({"id": "pref-1", "init_point": "http://pay"}, "")
        url = f"/api/payments/policies/{self.policy.id}/create_preference"
        res = self.client.post(
            url,
            {"installment_id": self.installment.id},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(Payment.objects.filter(policy=self.policy).exists())
        payment = Payment.objects.filter(policy=self.policy).latest("id")
        self.assertEqual(payment.mp_preference_id, "pref-1")
        self.assertEqual(payment.installment_id, self.installment.id)

    @mock.patch.dict("os.environ", {"MP_ACCESS_TOKEN": "dummy"})
    @mock.patch("payments.views._mp_create_preference")
    def test_create_preference_failure_marks_payment_rejected(self, mock_mp_create):
        mock_mp_create.return_value = (None, "error de MP")
        url = f"/api/payments/policies/{self.policy.id}/create_preference"
        res = self.client.post(
            url,
            {"installment_id": self.installment.id},
            format="json",
        )
        self.assertEqual(res.status_code, 502)
        self.assertEqual(Payment.objects.filter(policy=self.policy).count(), 1)
        payment = Payment.objects.get(policy=self.policy)
        self.assertEqual(payment.state, "REJ")
        self.assertEqual(payment.mp_preference_id, "")

    @mock.patch.dict("os.environ", {"MP_ACCESS_TOKEN": "dummy"})
    @mock.patch("payments.views._mp_create_preference")
    def test_idempotent_prefers_existing_payment(self, mock_mp_create):
        mock_mp_create.return_value = ({"id": "pref-2", "init_point": "http://pay"}, "")
        url = f"/api/payments/policies/{self.policy.id}/create_preference"
        res1 = self.client.post(
            url,
            {"installment_id": self.installment.id},
            format="json",
        )
        self.assertEqual(res1.status_code, 200)
        payment_id = res1.data["payment_id"]
        res2 = self.client.post(
            url,
            {"installment_id": self.installment.id},
            format="json",
        )
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.data["payment_id"], payment_id)
        self.assertEqual(Payment.objects.filter(policy=self.policy, installment=self.installment).count(), 1)

    @mock.patch.dict("os.environ", {"MP_ACCESS_TOKEN": "dummy"})
    @mock.patch("payments.views._mp_create_preference")
    def test_retry_rejected_payment_reuses_same_row(self, mock_mp_create):
        mock_mp_create.return_value = ({"id": "pref-retry", "init_point": "http://pay"}, "")
        period = f"{self.installment.period_start_date.year}{str(self.installment.period_start_date.month).zfill(2)}"
        payment = Payment.objects.create(
            policy=self.policy,
            installment=self.installment,
            period=period,
            amount=self.installment.amount,
            state="REJ",
            mp_preference_id="old-pref",
            mp_payment_id="old-payment",
        )
        url = f"/api/payments/policies/{self.policy.id}/create_preference"
        res = self.client.post(
            url,
            {"installment_id": self.installment.id},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        payment.refresh_from_db()
        self.assertEqual(payment.state, "PEN")
        self.assertEqual(payment.mp_preference_id, "pref-retry")
        self.assertEqual(payment.mp_payment_id, "")
        self.assertEqual(Payment.objects.filter(policy=self.policy, installment=self.installment).count(), 1)

    def test_rejects_already_paid_installment(self):
        self.installment.mark_paid()
        url = f"/api/payments/policies/{self.policy.id}/create_preference"
        res = self.client.post(
            url,
            {"installment_id": self.installment.id},
            format="json",
        )
        self.assertEqual(res.status_code, 409)
        self.assertIn("ya fue pagada", res.data.get("detail", "").lower())

    def test_rejects_charge_only_request(self):
        url = f"/api/payments/policies/{self.policy.id}/create_preference"
        res = self.client.post(
            url,
            {"charge_ids": [1, 2, 3]},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("charge_ids", res.data.get("detail", ""))

    @mock.patch.dict("os.environ", {"MP_ACCESS_TOKEN": "dummy"})
    @mock.patch("payments.views._mp_create_preference")
    def test_block_paid_installment_preference(self, mock_mp_create):
        self.installment.mark_paid()
        url = f"/api/payments/policies/{self.policy.id}/create_preference"
        res = self.client.post(
            url,
            {"installment_id": self.installment.id},
            format="json",
        )
        self.assertEqual(res.status_code, 409)
        self.assertIn("ya fue pagada", res.data.get("detail", "").lower())
        mock_mp_create.assert_not_called()
        self.assertEqual(Payment.objects.filter(policy=self.policy).count(), 0)

    @mock.patch.dict("os.environ", {"MP_ACCESS_TOKEN": "dummy"})
    @mock.patch("payments.views._mp_create_preference")
    def test_block_existing_apr_payment(self, mock_mp_create):
        period = f"{self.installment.period_start_date.year}{str(self.installment.period_start_date.month).zfill(2)}"
        Payment.objects.create(
            policy=self.policy,
            installment=self.installment,
            period=period,
            amount=self.installment.amount,
            state="APR",
        )
        url = f"/api/payments/policies/{self.policy.id}/create_preference"
        res = self.client.post(
            url,
            {"installment_id": self.installment.id},
            format="json",
        )
        self.assertEqual(res.status_code, 409)
        self.assertIn(
            "ya existe un pago aprobado",
            res.data.get("detail", "").lower(),
        )
        mock_mp_create.assert_not_called()
        self.assertEqual(Payment.objects.filter(policy=self.policy, state="APR").count(), 1)

    def test_block_admin_managed_policy(self):
        self.policy.status = "cancelled"
        self.policy.save(update_fields=["status"])
        url = f"/api/payments/policies/{self.policy.id}/create_preference"
        res = self.client.post(
            url,
            {"installment_id": self.installment.id},
            format="json",
        )
        self.assertEqual(res.status_code, 403)
        self.assertEqual(
            res.data.get("detail"),
            "La póliza está en un estado administrado (cancelada/suspendida) y no acepta pagos online.",
        )
        self.assertEqual(Payment.objects.filter(policy=self.policy).count(), 0)

    def test_duplicate_payments_same_installment_raise(self):
        period = f"{self.installment.period_start_date.year}{str(self.installment.period_start_date.month).zfill(2)}"
        Payment.objects.create(
            policy=self.policy,
            installment=self.installment,
            period=period,
            amount=self.installment.amount,
        )
        with self.assertRaises(IntegrityError):
            Payment.objects.create(
                policy=self.policy,
                installment=self.installment,
                period=period,
                amount=self.installment.amount,
            )

    def test_payment_save_syncs_to_installment_values(self):
        expected_period = f"{self.installment.period_start_date.year}{str(self.installment.period_start_date.month).zfill(2)}"
        wrong_period = "000000"
        wrong_amount = Decimal("1.00")
        payment = Payment.objects.create(
            policy=self.policy,
            installment=self.installment,
            period=wrong_period,
            amount=wrong_amount,
        )
        payment.refresh_from_db()
        self.assertEqual(payment.period, expected_period)
        self.assertEqual(payment.amount, self.installment.amount)


class PendingInstallmentTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            dni="51000000", email="pending@example.com", password="PayPass123"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.product = Product.objects.create(
            code="PAY-PEND",
            name="Plan Cuotas",
            vehicle_type="AUTO",
            plan_type="RC",
            min_year=1990,
            max_year=2100,
            base_price=12000,
            coverages="",
        )
        self.policy = Policy.objects.create(
            number="SC-PEND-1",
            user=self.user,
            product=self.product,
            premium=12000,
            start_date=date.today() - timedelta(days=10),
            end_date=date.today() + timedelta(days=80),
            status="active",
        )
        regenerate_installments(self.policy)

    def _get_response(self):
        return self.client.get("/api/payments/pending", {"policy_id": self.policy.id})

    def test_selects_installment_within_window(self):
        target = self.policy.installments.order_by("sequence").first()
        target.payment_window_start = date.today() - timedelta(days=1)
        target.payment_window_end = date.today() + timedelta(days=1)
        target.save(update_fields=["payment_window_start", "payment_window_end"])

        res = self._get_response()
        self.assertEqual(res.status_code, 200)
        self.assertNotIn("charges", res.data)
        installment = res.data["installment"]
        self.assertIsNotNone(installment)
        self.assertEqual(installment["installment_id"], target.id)
        self.assertEqual(installment["amount"], str(target.amount))

    def test_selects_earliest_when_no_window(self):
        future_start = date.today() + timedelta(days=10)
        future_end = date.today() + timedelta(days=20)
        self.policy.installments.update(
            payment_window_start=future_start,
            payment_window_end=future_end,
        )

        res = self._get_response()
        self.assertEqual(res.status_code, 200)
        self.assertNotIn("charges", res.data)
        installment = res.data["installment"]
        earliest = self.policy.installments.order_by("sequence").first()
        self.assertEqual(installment["installment_id"], earliest.id)

    def test_returns_empty_when_no_unpaid(self):
        now = timezone.now()
        for inst in self.policy.installments.all():
            inst.status = PolicyInstallment.Status.PAID
            inst.paid_at = now
            inst.save(update_fields=["status", "paid_at"])

        res = self._get_response()
        self.assertEqual(res.status_code, 200)
        self.assertNotIn("charges", res.data)
        self.assertIsNone(res.data["installment"])
        self.assertEqual(res.data["detail"], "No hay cuotas pendientes.")


class MpWebhookTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            dni="52000000", email="webhook@example.com", password="WebhookPass123"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.product = Product.objects.create(
            code="PAY-MP",
            name="Plan Webhook",
            vehicle_type="AUTO",
            plan_type="RC",
            min_year=1990,
            max_year=2100,
            base_price=12500,
            coverages="",
        )
        self.policy = Policy.objects.create(
            number="SC-WEB-1",
            user=self.user,
            product=self.product,
            premium=12500,
            start_date=date.today() - timedelta(days=30),
            end_date=date.today() + timedelta(days=90),
            status="active",
        )
        regenerate_installments(self.policy)
        self.installment = self.policy.installments.order_by("sequence").first()
        self.payment = Payment.objects.create(
            policy=self.policy,
            installment=self.installment,
            period=f"{self.installment.period_start_date.year}{str(self.installment.period_start_date.month).zfill(2)}",
            amount=self.installment.amount,
            state="PEN",
        )

    def _call_webhook(self, payload):
        with mock.patch("payments.views._authorize_mp_webhook", return_value=(True, "")):
            return self.client.post("/api/payments/webhook/", payload, format="json")

    def _payload(self):
        return {"payment_id": self.payment.id, "status": "approved"}

    def test_webhook_marks_installment_paid(self):
        res = self._call_webhook(self._payload())
        self.assertEqual(res.status_code, 200)
        self.installment.refresh_from_db()
        self.payment.refresh_from_db()
        self.assertEqual(self.installment.status, PolicyInstallment.Status.PAID)
        self.assertEqual(self.payment.installment_id, self.installment.id)
        self.assertEqual(self.payment.state, "APR")
        self.assertEqual(Receipt.objects.filter(policy=self.policy).count(), 1)

    def test_webhook_is_idempotent(self):
        res1 = self._call_webhook(self._payload())
        res2 = self._call_webhook(self._payload())
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(Receipt.objects.filter(policy=self.policy).count(), 1)

    def test_webhook_keeps_admin_status(self):
        self.policy.status = "cancelled"
        self.policy.save()
        res = self._call_webhook(self._payload())
        self.assertEqual(res.status_code, 200)
        self.policy.refresh_from_db()
        self.assertEqual(self.policy.status, "cancelled")

    def test_webhook_approved_missing_policy_is_rejected(self):
        payload = {
            "payment_id": self.payment.id,
            "status": "approved",
            "mp_payment_id": "mp-missing-policy",
        }
        with mock.patch("payments.views._mp_fetch_payment", return_value=(None, "")):
            with mock.patch("payments.views.Policy.objects.select_for_update") as select_mock:
                select_mock.return_value.get.side_effect = Policy.DoesNotExist
                res = self._call_webhook(payload)
        self.assertEqual(res.status_code, 409)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.state, "PEN")
        self.assertEqual(Receipt.objects.filter(policy=self.policy).count(), 0)

    def test_webhook_approved_without_installment_is_ignored(self):
        orphan_payment = Payment.objects.create(
            policy=self.policy,
            period="202401",
            amount=Decimal("1234.56"),
            state="PEN",
        )
        payload = {
            "payment_id": orphan_payment.id,
            "status": "approved",
        }
        res = self._call_webhook(payload)
        self.assertEqual(res.status_code, 409)
        orphan_payment.refresh_from_db()
        self.assertEqual(orphan_payment.state, "PEN")
        self.assertEqual(Receipt.objects.filter(policy=self.policy).count(), 0)

    def test_webhook_receipt_is_idempotent(self):
        mp_id = "mp-idempotent"
        Receipt.objects.create(
            policy=self.policy,
            amount=self.payment.amount,
            concept="Pago con Mercado Pago",
            method="mercadopago",
            auth_code=mp_id,
        )
        payload = {
            "payment_id": self.payment.id,
            "status": "approved",
            "mp_payment_id": mp_id,
        }
        with mock.patch("payments.views._mp_fetch_payment", return_value=(None, "")):
            res = self._call_webhook(payload)
        self.assertEqual(res.status_code, 200)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.state, "APR")
        self.assertEqual(
            Receipt.objects.filter(policy=self.policy, method="mercadopago", auth_code=mp_id).count(),
            1,
        )


class ManualPaymentFlowTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            dni="53000000",
            email="manual@example.com",
            password="ManualPass123",
            is_staff=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)
        self.product = Product.objects.create(
            code="PAY-MANUAL",
            name="Plan Manual",
            vehicle_type="AUTO",
            plan_type="RC",
            min_year=1990,
            max_year=2100,
            base_price=13000,
            coverages="",
        )
        self.policy = Policy.objects.create(
            number="SC-MANUAL-1",
            user=self.admin,
            product=self.product,
            premium=13000,
            start_date=date.today() - timedelta(days=15),
            end_date=date.today() + timedelta(days=75),
            status="active",
        )
        regenerate_installments(self.policy)

    def test_manual_payment_links_installment(self):
        res = self.client.post(f"/api/payments/manual/{self.policy.id}/")
        self.assertEqual(res.status_code, 200)
        installment_id = res.data.get("installment_id")
        payment = Payment.objects.filter(policy=self.policy, state="APR").latest("id")
        self.assertEqual(payment.installment_id, installment_id)
        installment = PolicyInstallment.objects.get(id=installment_id)
        self.assertEqual(installment.status, PolicyInstallment.Status.PAID)
        self.assertEqual(installment.id, payment.installment_id)


class PaymentInstallmentConstraintsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            dni="54000000", email="constraint@example.com", password="ConstraintPass123"
        )
        self.product = Product.objects.create(
            code="PAY-CONSTRAINT",
            name="Plan Constraints",
            vehicle_type="AUTO",
            plan_type="TR",
            min_year=1990,
            max_year=2100,
            base_price=11000,
            coverages="",
        )
        self.policy = Policy.objects.create(
            number="SC-CONSTRAINT-1",
            user=self.user,
            product=self.product,
            premium=11000,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=120),
            status="active",
        )
        regenerate_installments(self.policy)
        self.installment = self.policy.installments.order_by("sequence").first()
        self.other_installment = self.policy.installments.order_by("-sequence").first()

    def test_unique_constraint_prevents_duplicate_installment_payment(self):
        Payment.objects.create(
            policy=self.policy,
            installment=self.installment,
            period="202401",
            amount=self.installment.amount,
            state="PEN",
        )
        with self.assertRaises(IntegrityError):
            Payment.objects.create(
                policy=self.policy,
                installment=self.installment,
                period="202402",
                amount=self.installment.amount,
                state="PEN",
            )

    @mock.patch("policies.billing.current_payment_cycle")
    def test_mark_cycle_installment_paid_rejects_mismatched_payment(self, mock_cycle):
        mock_cycle.return_value = {"period_start": self.installment.period_start_date}
        payment = Payment.objects.create(
            policy=self.policy,
            installment=self.other_installment,
            period="202403",
            amount=self.other_installment.amount,
            state="PEN",
        )
        with self.assertRaises(ValueError):
            mark_cycle_installment_paid(self.policy, payment=payment)


class PaymentInstallmentBackfillMigrationTests(TransactionTestCase):
    migrate_from = [
        ("payments", "0007_alter_receipt_legacy_charge_amount_and_more"),
        ("policies", "0007_alter_policyinstallment_id"),
    ]

    def setUp(self):
        super().setUp()
        self.executor = MigrationExecutor(connection)
        self.executor.loader.build_graph()
        self.apps = self.executor.loader.project_state(self.migrate_from).apps

    def test_backfill_sets_payment_installment(self):
        module = importlib.import_module("payments.migrations.0008_alter_payment_installment_and_more")
        backfill_fn = module._backfill_payment_installments
        with connection.schema_editor() as schema_editor:
            schema_editor.execute("ALTER TABLE policies_policyinstallment ADD COLUMN payment_id integer")
        try:
            policy = Policy.objects.create(
                number="SC-BACKFILL-1",
                premium=Decimal("12000.00"),
                start_date=date.today(),
                end_date=date.today() + timedelta(days=90),
                status="active",
            )
            installment = PolicyInstallment.objects.create(
                policy=policy,
                sequence=1,
                period_start_date=date.today(),
                period_end_date=date.today() + timedelta(days=30),
                payment_window_start=date.today(),
                payment_window_end=date.today() + timedelta(days=5),
                due_date_display=date.today() + timedelta(days=5),
                due_date_real=date.today() + timedelta(days=5),
                amount=Decimal("4000.00"),
                status=PolicyInstallment.Status.PENDING,
            )
            payment = Payment.objects.create(
                policy=policy,
                period="202501",
                amount=installment.amount,
                state="PEN",
            )
            with connection.cursor() as cursor:
                cursor.execute(
                    "UPDATE policies_policyinstallment SET payment_id = %s WHERE id = %s",
                    [payment.id, installment.id],
                )
            class DummyEditor:
                connection = connection
            backfill_fn(self.apps, DummyEditor())
            payment.refresh_from_db()
            self.assertEqual(payment.installment_id, installment.id)
        finally:
            with connection.schema_editor() as schema_editor:
                schema_editor.execute("ALTER TABLE policies_policyinstallment DROP COLUMN payment_id")


class PaymentDedupHelpersTests(TestCase):
    def test_choose_canonical_payment_orders_by_state_then_mp_pref_then_created(self):
        base = timezone.now()
        payments = [
            SimpleNamespace(pk=1, state="REJ", mp_preference_id="old", created_at=base - timedelta(hours=3)),
            SimpleNamespace(pk=2, state="PEN", mp_preference_id="", created_at=base - timedelta(hours=2)),
            SimpleNamespace(pk=3, state="PEN", mp_preference_id="with-pref", created_at=base - timedelta(hours=1)),
            SimpleNamespace(pk=4, state="APR", mp_preference_id="", created_at=base - timedelta(hours=4)),
        ]
        canonical = choose_canonical_payment_for_installment(payments)
        self.assertEqual(canonical.pk, 4)


class PaymentPolicyIntegrityTests(TestCase):
    def setUp(self):
        self.product = Product.objects.create(
            code="PAY-INTEGRITY",
            name="Integrity Plan",
            vehicle_type="AUTO",
            plan_type="RC",
            min_year=1990,
            max_year=2100,
            base_price=15000,
            coverages="",
        )
        self.policy = Policy.objects.create(
            number="SC-INTEGRITY-1",
            product=self.product,
            premium=15000,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=90),
            status="active",
        )
        regenerate_installments(self.policy)
        self.installment = self.policy.installments.order_by("sequence").first()
        self.expected_period = period_from_installment(self.installment)

    def _create_other_policy(self):
        return Policy.objects.create(
            number="SC-INTEGRITY-ALT",
            product=self.product,
            premium=15000,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=90),
            status="active",
        )

    def test_payment_with_matching_installment_syncs_metadata(self):
        payment = Payment.objects.create(
            policy=self.policy,
            installment=self.installment,
            period="000000",
            amount=Decimal("0.01"),
        )
        payment.refresh_from_db()
        self.assertEqual(payment.policy_id, self.policy.id)
        self.assertEqual(payment.period, self.expected_period)
        self.assertEqual(payment.amount, self.installment.amount)

    def test_payment_with_mismatched_policy_is_rejected(self):
        other_policy = self._create_other_policy()
        with self.assertRaises(ValidationError):
            Payment.objects.create(
                policy=other_policy,
                installment=self.installment,
                period=self.expected_period,
                amount=self.installment.amount,
            )


class PaymentStateTraceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            dni="70000000",
            email="state@example.com",
            password="StatePass123",
        )
        self.product = Product.objects.create(
            code="PAY-TRACE",
            name="Trace Plan",
            vehicle_type="AUTO",
            plan_type="TR",
            min_year=1990,
            max_year=2100,
            base_price=16000,
            coverages="",
        )
        self.policy = Policy.objects.create(
            number="SC-TRACE-1",
            user=self.user,
            product=self.product,
            premium=16000,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=90),
            status="active",
        )
        self.payment = Payment.objects.create(
            policy=self.policy,
            period="202401",
            amount=Decimal("5000.00"),
            state="PEN",
        )

    def test_state_fields_populated_on_create(self):
        self.assertIsNotNone(self.payment.updated_at)
        self.assertIsNotNone(self.payment.last_state_change_at)
        self.assertLessEqual(self.payment.last_state_change_at, self.payment.updated_at)

    def test_non_state_updates_do_not_change_state_timestamp(self):
        prev_last_state = self.payment.last_state_change_at
        prev_updated = self.payment.updated_at
        self.payment.amount = Decimal("5100.00")
        self.payment.save()
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.last_state_change_at, prev_last_state)
        self.assertNotEqual(self.payment.updated_at, prev_updated)

    def test_state_change_updates_timestamp(self):
        prev_last_state = self.payment.last_state_change_at
        self.payment.state = "APR"
        self.payment.save()
        self.payment.refresh_from_db()
        self.assertNotEqual(self.payment.last_state_change_at, prev_last_state)
        self.assertEqual(self.payment.state, "APR")

    def test_state_change_with_update_fields_sticks_timestamp(self):
        prev_last_state = self.payment.last_state_change_at
        self.payment.state = "APR"
        self.payment.save(update_fields=["state"])
        self.payment.refresh_from_db()
        self.assertNotEqual(self.payment.last_state_change_at, prev_last_state)
        self.assertEqual(self.payment.state, "APR")


class PaymentPeriodValidationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            dni="71000000",
            email="period@example.com",
            password="PeriodPass123",
        )
        self.product = Product.objects.create(
            code="PAY-PERIOD",
            name="Period Plan",
            vehicle_type="AUTO",
            plan_type="TR",
            min_year=1990,
            max_year=2100,
            base_price=14000,
            coverages="",
        )
        self.policy = Policy.objects.create(
            number="SC-PERIOD-1",
            user=self.user,
            product=self.product,
            premium=14000,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=90),
            status="active",
        )
        regenerate_installments(self.policy)
        self.installment = self.policy.installments.order_by("sequence").first()

    def test_invalid_period_fails_validation(self):
        with self.assertRaises(ValidationError):
            Payment.objects.create(
                policy=self.policy,
                period="202513",
                amount=Decimal("3000.00"),
                state="PEN",
            )

    def test_installment_derives_valid_period(self):
        derived_period = period_from_installment(self.installment)
        payment = Payment.objects.create(
            policy=self.policy,
            installment=self.installment,
            period="000000",
            amount=self.installment.amount,
            state="PEN",
        )
        payment.refresh_from_db()
        self.assertEqual(payment.period, derived_period)
