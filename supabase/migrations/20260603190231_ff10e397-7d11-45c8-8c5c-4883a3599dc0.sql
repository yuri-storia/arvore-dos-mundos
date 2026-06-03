UPDATE public.subscriptions
SET status='active', plan='pro', plan_code='idriel_anual', has_idriel=true, billing_cycle='yearly',
    asaas_customer_id='cus_000008087515', asaas_subscription_id='sub_bytrhjua03qcw1va',
    started_at=now(), expires_at=now() + interval '366 days', cancelled_at=NULL, updated_at=now()
WHERE user_id='7a3b64f2-f710-4e19-a7a9-a23d9d400746';