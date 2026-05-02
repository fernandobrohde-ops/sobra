-- =====================================================================
-- Sobra · 20260501000003_onboarding_function.sql
-- Function chamada pelo client no fim do onboarding (briefing 4.2).
-- Cria perfil + categorias padrão do setor + alertas_config — atômico.
-- =====================================================================

-- ---------------------------------------------------------------------
-- categorias_padrao(setor)
-- Devolve a lista de categorias default daquele setor.
-- Tabela retornada para o caller usar em INSERT...SELECT.
-- ---------------------------------------------------------------------
create or replace function public.categorias_padrao(p_setor text)
returns table (nome text, tipo text)
language sql
immutable
as $$
  select t.nome, t.tipo
  from (values
    -- Serviços (briefing 4.2)
    ('servicos',    'Prestação de serviço', 'entrada'),
    ('servicos',    'Materiais',            'saida'),
    ('servicos',    'Transporte',           'saida'),
    ('servicos',    'Ferramentas',          'saida'),

    -- Alimentação
    ('alimentacao', 'Venda no balcão',      'entrada'),
    ('alimentacao', 'Delivery',             'entrada'),
    ('alimentacao', 'Ingredientes',         'saida'),
    ('alimentacao', 'Embalagem',            'saida'),

    -- Comércio
    ('comercio',    'Venda produto',        'entrada'),
    ('comercio',    'Estoque',              'saida'),
    ('comercio',    'Frete',                'saida'),
    ('comercio',    'Aluguel',              'saida'),

    -- Construção (não estava no briefing — defaults razoáveis)
    ('construcao',  'Recebimento de obra',  'entrada'),
    ('construcao',  'Material de obra',     'saida'),
    ('construcao',  'Mão de obra',          'saida'),
    ('construcao',  'Equipamentos',         'saida'),

    -- Saúde
    ('saude',       'Consultas',            'entrada'),
    ('saude',       'Procedimentos',        'entrada'),
    ('saude',       'Insumos',              'saida'),
    ('saude',       'Aluguel do espaço',    'saida'),

    -- Educação
    ('educacao',    'Mensalidades',         'entrada'),
    ('educacao',    'Aulas avulsas',        'entrada'),
    ('educacao',    'Material didático',    'saida'),
    ('educacao',    'Plataformas',          'saida'),

    -- Outros (genérico)
    ('outros',      'Receitas',             'entrada'),
    ('outros',      'Despesas',             'saida')
  ) as t(setor_alvo, nome, tipo)
  where t.setor_alvo = p_setor;
$$;

comment on function public.categorias_padrao(text) is
  'Retorna as categorias padrão para o setor. Usado por completar_onboarding.';

-- ---------------------------------------------------------------------
-- completar_onboarding(nome_negocio, setor, whatsapp)
-- Roda no fim do onboarding. Cria profile + categorias padrão +
-- alertas_config numa única transação. SECURITY DEFINER para conseguir
-- inserir as categorias mesmo com RLS, mas sempre escrevendo com o
-- auth.uid() do caller.
-- ---------------------------------------------------------------------
create or replace function public.completar_onboarding(
  p_nome_negocio text,
  p_setor text,
  p_whatsapp text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
begin
  -- Sempre exigir um usuário autenticado.
  if v_user_id is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  -- Idempotência: se já existe profile, devolve o que tem (não recria nada).
  select * into v_profile from public.profiles where id = v_user_id;
  if found then
    return v_profile;
  end if;

  -- 1) profile
  insert into public.profiles (id, nome_negocio, setor, whatsapp)
  values (v_user_id, p_nome_negocio, p_setor, p_whatsapp)
  returning * into v_profile;

  -- 2) categorias padrão do setor
  insert into public.categorias (user_id, nome, tipo)
  select v_user_id, c.nome, c.tipo
  from public.categorias_padrao(p_setor) c;

  -- 3) alertas_config (defaults da própria tabela cuidam dos valores)
  insert into public.alertas_config (user_id) values (v_user_id);

  return v_profile;
end;
$$;

comment on function public.completar_onboarding(text, text, text) is
  'Cria profile + categorias padrão do setor + alertas_config numa transação. Idempotente.';

-- Permitir que usuários autenticados chamem a function.
revoke all on function public.completar_onboarding(text, text, text) from public;
grant execute on function public.completar_onboarding(text, text, text) to authenticated;
