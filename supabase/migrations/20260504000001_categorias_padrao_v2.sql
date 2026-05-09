-- =====================================================================
-- Sobra · 20260504000001_categorias_padrao_v2.sql
-- Atualiza categorias_padrao com opções mais ricas alinhadas ao
-- redesign do dashboard (briefing v2 — Marketing, Ferramentas, WhatsApp,
-- Domínio, Internet, Estoque, Funcionários, Impostos, Assinaturas,
-- Transporte, Alimentação, Pix recebido, Comissão, Reembolso, etc).
--
-- Estratégia: replace da function inteira pra incluir as novas. Usuários
-- existentes só recebem o efeito ao chamar completar_onboarding (idempotente —
-- não recria pra quem já tem categorias). Pra adicionar as novas em quem
-- já passou pelo onboarding, criar uma RPC `seed_categorias_extras` (opcional,
-- v3).
-- =====================================================================

create or replace function public.categorias_padrao(p_setor text)
returns table (nome text, tipo text)
language sql
immutable
as $$
  select t.nome, t.tipo
  from (values
    -- ===== ENTRADAS comuns a quase todos =====
    ('servicos',    'Venda',                'entrada'),
    ('servicos',    'Serviço',              'entrada'),
    ('servicos',    'Pix recebido',         'entrada'),
    ('servicos',    'Receita recorrente',   'entrada'),
    ('servicos',    'Comissão',             'entrada'),
    ('servicos',    'Reembolso',            'entrada'),

    -- ===== SAÍDAS comuns a quase todos =====
    ('servicos',    'Marketing',            'saida'),
    ('servicos',    'Ferramentas',          'saida'),
    ('servicos',    'WhatsApp',             'saida'),
    ('servicos',    'Domínio',              'saida'),
    ('servicos',    'Internet',             'saida'),
    ('servicos',    'Assinaturas',          'saida'),
    ('servicos',    'Transporte',           'saida'),
    ('servicos',    'Alimentação',          'saida'),
    ('servicos',    'Impostos',             'saida'),
    ('servicos',    'Funcionários',         'saida'),

    -- ===== ALIMENTAÇÃO (extras específicos do setor) =====
    ('alimentacao', 'Venda no balcão',      'entrada'),
    ('alimentacao', 'Delivery',             'entrada'),
    ('alimentacao', 'Pix recebido',         'entrada'),
    ('alimentacao', 'Ingredientes',         'saida'),
    ('alimentacao', 'Embalagem',            'saida'),
    ('alimentacao', 'Marketing',            'saida'),
    ('alimentacao', 'Aluguel',              'saida'),
    ('alimentacao', 'Funcionários',         'saida'),
    ('alimentacao', 'Impostos',             'saida'),
    ('alimentacao', 'Internet',             'saida'),

    -- ===== COMÉRCIO =====
    ('comercio',    'Venda',                'entrada'),
    ('comercio',    'Pix recebido',         'entrada'),
    ('comercio',    'Comissão',             'entrada'),
    ('comercio',    'Estoque',              'saida'),
    ('comercio',    'Marketing',            'saida'),
    ('comercio',    'Frete',                'saida'),
    ('comercio',    'Aluguel',              'saida'),
    ('comercio',    'Funcionários',         'saida'),
    ('comercio',    'Impostos',             'saida'),
    ('comercio',    'Assinaturas',          'saida'),

    -- ===== CONSTRUÇÃO =====
    ('construcao',  'Recebimento de obra',  'entrada'),
    ('construcao',  'Serviço',              'entrada'),
    ('construcao',  'Material de obra',     'saida'),
    ('construcao',  'Mão de obra',          'saida'),
    ('construcao',  'Equipamentos',         'saida'),
    ('construcao',  'Transporte',           'saida'),
    ('construcao',  'Impostos',             'saida'),

    -- ===== SAÚDE =====
    ('saude',       'Consultas',            'entrada'),
    ('saude',       'Procedimentos',        'entrada'),
    ('saude',       'Pix recebido',         'entrada'),
    ('saude',       'Insumos',              'saida'),
    ('saude',       'Aluguel',              'saida'),
    ('saude',       'Funcionários',         'saida'),
    ('saude',       'Marketing',            'saida'),
    ('saude',       'Assinaturas',          'saida'),

    -- ===== EDUCAÇÃO =====
    ('educacao',    'Mensalidades',         'entrada'),
    ('educacao',    'Aulas avulsas',        'entrada'),
    ('educacao',    'Pix recebido',         'entrada'),
    ('educacao',    'Material didático',    'saida'),
    ('educacao',    'Plataformas',          'saida'),
    ('educacao',    'Marketing',            'saida'),
    ('educacao',    'Internet',             'saida'),

    -- ===== OUTROS (genérico, mas rico) =====
    ('outros',      'Venda',                'entrada'),
    ('outros',      'Serviço',              'entrada'),
    ('outros',      'Pix recebido',         'entrada'),
    ('outros',      'Reembolso',            'entrada'),
    ('outros',      'Marketing',            'saida'),
    ('outros',      'Ferramentas',          'saida'),
    ('outros',      'Internet',             'saida'),
    ('outros',      'Assinaturas',          'saida'),
    ('outros',      'Transporte',           'saida'),
    ('outros',      'Alimentação',          'saida'),
    ('outros',      'Impostos',             'saida')
  ) as t(setor_alvo, nome, tipo)
  where t.setor_alvo = p_setor;
$$;
