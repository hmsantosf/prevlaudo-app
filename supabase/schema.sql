-- Habilitar extensões necessárias
create extension if not exists "uuid-ossp";

-- Tabela de perfis (espelha auth.users do Supabase)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null unique,
  telefone    text,
  avatar_url  text,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

-- Tabela de clientes (beneficiários cadastrados por um usuário)
create table if not exists public.clientes (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  name            text not null,
  cpf             text,
  data_nascimento date,
  telefone        text,
  email           text,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

-- Tabela de processos / solicitações de revisão
create table if not exists public.processos (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  tipo        text not null,
  descricao   text,
  dados_aerus jsonb,
  status      text not null default 'pendente'
                check (status in ('pendente', 'em_analise', 'concluido', 'cancelado')),
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.clientes enable row level security;
alter table public.processos enable row level security;

-- Policies: profiles
create policy "Usuário vê seu próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuário atualiza seu próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Policies: clientes
create policy "Usuário vê seus próprios clientes"
  on public.clientes for select
  using (auth.uid() = user_id);

create policy "Usuário cria clientes"
  on public.clientes for insert
  with check (auth.uid() = user_id);

create policy "Usuário atualiza seus clientes"
  on public.clientes for update
  using (auth.uid() = user_id);

create policy "Usuário remove seus clientes"
  on public.clientes for delete
  using (auth.uid() = user_id);

-- Policies: processos
create policy "Usuário vê seus próprios processos"
  on public.processos for select
  using (auth.uid() = user_id);

create policy "Usuário cria processos"
  on public.processos for insert
  with check (auth.uid() = user_id);

create policy "Usuário atualiza seus processos"
  on public.processos for update
  using (auth.uid() = user_id);

-- Trigger: atualiza updated_at automaticamente
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profiles_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger on_clientes_updated
  before update on public.clientes
  for each row execute procedure public.handle_updated_at();

create trigger on_processos_updated
  before update on public.processos
  for each row execute procedure public.handle_updated_at();
