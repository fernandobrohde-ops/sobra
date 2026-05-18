-- Stripe Checkout: assinatura Pro mensal com trial de 7 dias.

alter table public.profiles
  add column if not exists subscription_status text,
  add column if not exists trial_ends_at timestamptz;

alter table public.profiles
  alter column plano set default 'free';

alter table public.profiles
  drop constraint if exists profiles_plano_check;

update public.profiles
set plano = 'free'
where plano <> 'pro';

alter table public.profiles
  add constraint profiles_plano_check check (plano in ('free', 'pro'));

comment on column public.profiles.subscription_status is
  'Status atual da assinatura no Stripe: trialing, active, canceled, past_due, etc.';

comment on column public.profiles.trial_ends_at is
  'Fim do trial da assinatura Stripe, quando houver.';
