-- Tables: survey content, submissions and answers. Cascades remove dependent
-- data on survey deletion; choice deletion preserves legacy answer rows.
create table public.surveys (
    id uuid primary key default gen_random_uuid (),
    title text not null check (btrim(title) <> ''),
    description text,
    status text not null default 'draft' check (status in ('draft', 'active', 'closed', 'archived')),
    public_slug text unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.questions (
    id uuid primary key default gen_random_uuid (),
    survey_id uuid not null references public.surveys on delete cascade,
    question_text text not null check (btrim(question_text) <> ''),
    question_type text not null check (question_type in ('multiple_choice', 'true_false')),
    position integer not null check (position >= 0),
    created_at timestamptz not null default now(),
    unique (survey_id, position)
);

create table public.choices (
    id uuid primary key default gen_random_uuid (),
    question_id uuid not null references public.questions on delete cascade,
    choice_text text not null check (btrim(choice_text) <> ''),
    position integer not null check (position >= 0),
    created_at timestamptz not null default now(),
    unique (question_id, position)
);

create table public.responses (
    id uuid primary key default gen_random_uuid (),
    survey_id uuid not null references public.surveys on delete cascade,
    anonymous_token text not null check (btrim(anonymous_token) <> '' and char_length(anonymous_token) <= 128),
    submitted_at timestamptz not null default now()
);

create table public.answers (
    id uuid primary key default gen_random_uuid (),
    response_id uuid not null references public.responses on delete cascade,
    question_id uuid not null references public.questions on delete cascade,
    choice_id uuid references public.choices on delete set null,
    text_answer text,
    created_at timestamptz not null default now(),
    unique (response_id, question_id)
);

-- Indexes: ordered content, results lookups, one active survey, and one
-- response per survey/token. The partial unique index is a final concurrency guard.
create index surveys_status_idx on public.surveys (status);

create unique index only_one_active_survey on public.surveys ((status))
where
    status = 'active';

create index questions_survey_id_idx on public.questions (survey_id, position);

create index choices_question_id_idx on public.choices (question_id, position);

create index responses_survey_id_idx on public.responses (survey_id);

create index responses_submitted_at_idx on public.responses (submitted_at);

create unique index responses_unique_student_per_survey on public.responses (survey_id, anonymous_token);

create index answers_response_id_idx on public.answers (response_id);

create index answers_question_id_idx on public.answers (question_id);

create index answers_choice_id_idx on public.answers (choice_id);

-- Trigger: keep survey updated_at current whenever a survey row changes.
create function public.update_updated_at_column ()
    returns trigger
    language plpgsql
    set search_path = ''
    as $$
begin
    new.updated_at := now();
    return new;
end
$$;

create trigger surveys_updated_at
    before update on public.surveys for each row
    execute function public.update_updated_at_column ();

-- Authorization helper: only trusted JWT app_metadata and a user ID count.
create function public.is_instructor ()
    returns boolean
    language sql
    stable
    set search_path = ''
    as $$
    select
        coalesce(auth.jwt () -> 'app_metadata' ->> 'role' = 'instructor', false)
        and auth.uid () is not null
$$;

revoke all on function public.is_instructor () from public, anon, authenticated;

grant execute on function public.is_instructor () to authenticated;

revoke all on function public.update_updated_at_column () from public, anon, authenticated;

-- RLS and table privileges: no caller writes tables directly. Only
-- authenticated instructors can read; all public reads and writes use RPCs.
do $$
declare
    t text;
begin
    foreach t in array array['surveys', 'questions', 'choices', 'responses', 'answers'] loop
        execute format('alter table public.%I enable row level security', t);
        execute format('revoke all on table public.%I from public, anon, authenticated', t);
        execute format('grant select on table public.%I to authenticated', t);
        execute format('create policy instructor_read on public.%I for select to authenticated using (public.is_instructor())', t);
    end loop;
end
$$;

-- Internal helpers: distinguish missing identity from a non-instructor.
-- Helpers are not exposed to application roles.
create function public.require_instructor ()
    returns void
    language plpgsql
    stable
    set search_path = ''
    as $$
begin
    if auth.uid () is null then
        raise exception 'AUTH_REQUIRED';
    end if;
    if not public.is_instructor () then
        raise exception 'FORBIDDEN';
    end if;
end
$$;

-- Validate the same complete draft shape on save and activation.
create function public.validate_draft (p_draft jsonb)
    returns void
    language plpgsql
    immutable
    set search_path = ''
    as $$
declare
    q jsonb;
    c jsonb;
    seen text[];
    v text;
begin
    if jsonb_typeof(p_draft) is distinct from 'object'
        or jsonb_typeof(p_draft -> 'title') is distinct from 'string'
        or btrim(p_draft ->> 'title') = ''
        or (p_draft ? 'description' and jsonb_typeof(p_draft -> 'description') not in ('string', 'null'))
        or jsonb_typeof(p_draft -> 'questions') is distinct from 'array' then
        raise exception 'INVALID_INPUT';
    end if;
    if jsonb_array_length(p_draft -> 'questions') = 0 then
        raise exception 'INVALID_INPUT';
    end if;
    for q in
    select
        value
    from
        jsonb_array_elements(p_draft -> 'questions')
        loop
            if jsonb_typeof(q) is distinct from 'object'
                or jsonb_typeof(q -> 'question_text') is distinct from 'string'
                or btrim(q ->> 'question_text') = ''
                or q ->> 'question_type' not in ('multiple_choice', 'true_false')
                or q ->> 'question_type' is null
                or jsonb_typeof(q -> 'choices') is distinct from 'array' then
                raise exception 'INVALID_INPUT';
            end if;
            if jsonb_array_length(q -> 'choices') < 2 then
                raise exception 'INVALID_INPUT';
            end if;
            if q ->> 'question_type' = 'true_false' and q -> 'choices' <> '["True", "False"]'::jsonb then
                raise exception 'INVALID_INPUT';
            end if;
            seen := array[]::text[];
            for c in
            select
                value
            from
                jsonb_array_elements(q -> 'choices')
                loop
                    if jsonb_typeof(c) is distinct from 'string' then
                        raise exception 'INVALID_INPUT';
                    end if;
                    v := lower(btrim(c #>> '{}'));
                    if v = '' or v = any (seen) then
                        raise exception 'INVALID_INPUT';
                    end if;
                    seen := array_append(seen, v);
                end loop;
        end loop;
end
$$;

-- Build consistently ordered question and choice arrays.
create function public.survey_questions (p_id uuid)
    returns jsonb
    language sql
    stable
    set search_path = ''
    as $$
    select
        coalesce(jsonb_agg(jsonb_build_object('id',
            q.id,
            'survey_id',
            q.survey_id,
            'question_text',
            q.question_text,
            'question_type',
            q.question_type,
            'position',
            q.position,
            'choices',
            coalesce((
                        select
                            jsonb_agg(jsonb_build_object('id', c.id, 'question_id', c.question_id, 'choice_text', c.choice_text, 'position', c.position)
                        order by c.position)
                        from public.choices c
                        where
                            c.question_id = q.id), '[]'::jsonb))
            order by q.position), '[]'::jsonb)
    from
        public.questions q
    where
        q.survey_id = p_id
$$;

-- RPC: save_draft replaces all draft content in one transaction.
-- SECURITY DEFINER lets this controlled operation write despite table revokes.
-- All definer RPCs use an empty search_path and qualified application objects
-- to prevent caller-controlled schemas from changing which objects execute.
create function public.save_draft (p_survey_id uuid, p_draft jsonb)
    returns jsonb
    language plpgsql
    security definer
    set search_path = ''
    as $$
declare
    s public.surveys%rowtype;
    q jsonb;
    c jsonb;
    qi uuid;
    qp integer := 0;
    cp integer;
begin
    perform
        public.require_instructor ();
    if p_survey_id is not null then
        select
            *
        into
            s
        from
            public.surveys
        where
            id = p_survey_id
        for update;
        if not found then
            raise exception 'NOT_FOUND';
        end if;
        if s.status <> 'draft' then
            raise exception 'INVALID_STATE';
        end if;
    end if;
    perform
        public.validate_draft (p_draft);
    if p_survey_id is null then
        insert into public.surveys (title, description)
            values (btrim(p_draft ->> 'title'), nullif (btrim(p_draft ->> 'description'), ''))
        returning
            id
        into
            p_survey_id;
    else
        update
            public.surveys
        set
            title = btrim(p_draft ->> 'title'),
            description = nullif (btrim(p_draft ->> 'description'), '')
        where
            id = p_survey_id;
        delete from public.questions
        where survey_id = p_survey_id;
    end if;
    for q in
    select
        value
    from
        jsonb_array_elements(p_draft -> 'questions')
        loop
            insert into public.questions (survey_id, question_text, question_type, position)
                values (p_survey_id, btrim(q ->> 'question_text'), q ->> 'question_type', qp)
            returning
                id
            into
                qi;
            qp := qp + 1;
            cp := 0;
            for c in
            select
                value
            from
                jsonb_array_elements(q -> 'choices')
                loop
                    insert into public.choices (question_id, choice_text, position)
                        values (qi, btrim(c #>> '{}'), cp);
                    cp := cp + 1;
                end loop;
        end loop;
    return jsonb_build_object('survey_id', p_survey_id);
end
$$;

-- RPC: duplicate_survey copies content without a slug or responses.
create function public.duplicate_survey (p_survey_id uuid)
    returns jsonb
    language plpgsql
    security definer
    set search_path = ''
    as $$
declare
    s public.surveys%rowtype;
    new_id uuid;
    q record;
    qi uuid;
begin
    perform
        public.require_instructor ();
    select
        *
    into
        s
    from
        public.surveys
    where
        id = p_survey_id;
    if not found then
        raise exception 'NOT_FOUND';
    end if;
    insert into public.surveys (title, description)
        values ('Copy of ' || s.title, s.description)
    returning
        id
    into
        new_id;
    for q in
    select
        *
    from
        public.questions
    where
        survey_id = p_survey_id
    order by
        position loop
            insert into public.questions (survey_id, question_text, question_type, position)
                values (new_id, q.question_text, q.question_type, q.position)
            returning
                id
            into
                qi;
            insert into public.choices (question_id, choice_text, position)
            select
                qi,
                choice_text,
                position
            from
                public.choices
            where
                question_id = q.id;
        end loop;
    return jsonb_build_object('survey_id', new_id);
end
$$;

-- RPC: activate_survey validates a draft and closes the previous active survey.
-- The transaction advisory lock serializes activations and closures; the
-- target row lock also prevents concurrent draft edits during activation.
create function public.activate_survey (p_survey_id uuid)
    returns jsonb
    language plpgsql
    security definer
    set search_path = ''
    as $$
declare
    s public.surveys%rowtype;
    d jsonb;
    slug text;
    bytes bytea;
    i integer;
begin
    perform
        public.require_instructor ();
    perform
        pg_advisory_xact_lock(4194095);
    select
        *
    into
        s
    from
        public.surveys
    where
        id = p_survey_id
    for update;
    if not found then
        raise exception 'NOT_FOUND';
    end if;
    if s.status <> 'draft' then
        raise exception 'INVALID_STATE';
    end if;
    select
        jsonb_build_object('title',
            s.title,
            'description',
            s.description,
            'questions',
            coalesce(jsonb_agg(jsonb_build_object('question_text',
            q.question_text,
            'question_type',
            q.question_type,
            'choices',
            (
                            select
                                coalesce(jsonb_agg(c.choice_text order by c.position), '[]'::jsonb)
                            from public.choices c
                            where
                                c.question_id = q.id))
                    order by q.position) filter (where q.id is not null), '[]'::jsonb))
    into
        d
    from
        public.questions q
    where
        q.survey_id = s.id;
    perform
        public.validate_draft (d);
    update
        public.surveys
    set
        status = 'closed'
    where
        status = 'active';
    slug := s.public_slug;
    if slug is null then
        loop
            bytes := extensions.gen_random_bytes(8);
            slug := '';
            for i in 0..7 loop
                slug := slug || substr('23456789abcdefghijkmnpqrstuvwxyz', (get_byte(bytes, i) % 32) + 1, 1);
            end loop;
            exit
            when not exists (
                    select
                        1
                    from
                        public.surveys
                    where
                        public_slug = slug);
        end loop;
    end if;
    update
        public.surveys
    set
        status = 'active',
        public_slug = slug
    where
        id = s.id;
    return jsonb_build_object('id', s.id, 'status', 'active', 'public_slug', slug);
end
$$;

-- RPC: close_survey shares the lifecycle advisory lock with activation.
-- Its row update waits for submissions holding a shared lock on this survey.
create function public.close_survey (p_survey_id uuid)
    returns jsonb
    language plpgsql
    security definer
    set search_path = ''
    as $$
declare
    s public.surveys%rowtype;
begin
    perform
        public.require_instructor ();
    perform
        pg_advisory_xact_lock(4194095);
    select
        *
    into
        s
    from
        public.surveys
    where
        id = p_survey_id
    for update;
    if not found then
        raise exception 'NOT_FOUND';
    end if;
    if s.status <> 'active' then
        raise exception 'INVALID_STATE';
    end if;
    update
        public.surveys
    set
        status = 'closed'
    where
        id = s.id;
    return jsonb_build_object('id', s.id, 'status', 'closed');
end
$$;

-- RPC: archive_survey preserves content and responses.
create function public.archive_survey (p_survey_id uuid)
    returns jsonb
    language plpgsql
    security definer
    set search_path = ''
    as $$
declare
    s public.surveys%rowtype;
begin
    perform
        public.require_instructor ();
    select
        *
    into
        s
    from
        public.surveys
    where
        id = p_survey_id
    for update;
    if not found then
        raise exception 'NOT_FOUND';
    end if;
    if s.status not in ('draft', 'closed') then
        raise exception 'INVALID_STATE';
    end if;
    update
        public.surveys
    set
        status = 'archived'
    where
        id = s.id;
    return jsonb_build_object('id', s.id, 'status', 'archived');
end
$$;

-- RPC: delete_survey removes non-active surveys and cascades their data.
create function public.delete_survey (p_survey_id uuid)
    returns jsonb
    language plpgsql
    security definer
    set search_path = ''
    as $$
declare
    s public.surveys%rowtype;
begin
    perform
        public.require_instructor ();
    select
        *
    into
        s
    from
        public.surveys
    where
        id = p_survey_id
    for update;
    if not found then
        raise exception 'NOT_FOUND';
    end if;
    if s.status = 'active' then
        raise exception 'INVALID_STATE';
    end if;
    delete from public.surveys
    where id = s.id;
    return jsonb_build_object('id', s.id);
end
$$;

-- RPC: get_public_survey returns content only while a survey is active.
create function public.get_public_survey (p_slug text)
    returns jsonb
    language plpgsql
    stable
    security definer
    set search_path = ''
    as $$
declare
    s public.surveys%rowtype;
begin
    select
        *
    into
        s
    from
        public.surveys
    where
        public_slug = p_slug;
    if not found or s.status = 'draft' then
        return jsonb_build_object('status', 'not_found');
    end if;
    if s.status <> 'active' then
        return jsonb_build_object('status', 'closed', 'title', s.title);
    end if;
    return jsonb_build_object('status',
        'active',
        'survey',
        jsonb_build_object('id',
        s.id,
        'title',
        s.title,
        'description',
        s.description,
        'questions',
        public.survey_questions (s.id)));
end
$$;

-- RPC: submit_survey_response validates all answers before inserting.
-- FOR SHARE holds the survey row until commit, so close must wait; once close
-- commits, later submissions observe the closed status and are rejected.
create function public.submit_survey_response (p_survey_id uuid, p_anonymous_token text, p_answers jsonb)
    returns jsonb
    language plpgsql
    security definer
    set search_path = ''
    as $$
declare
    s public.surveys%rowtype;
    a jsonb;
    qid uuid;
    cid uuid;
    ids uuid[] := array[]::uuid[];
    rid uuid;
begin
    if p_anonymous_token is null
        or btrim(p_anonymous_token) = ''
        or char_length(p_anonymous_token) > 128
        or jsonb_typeof(p_answers) is distinct from 'array' then
        raise exception 'INVALID_INPUT';
    end if;
    select
        *
    into
        s
    from
        public.surveys
    where
        id = p_survey_id for share;
    if not found or s.status <> 'active' then
        raise exception 'SURVEY_NOT_ACTIVE';
    end if;
    for a in
    select
        value
    from
        jsonb_array_elements(p_answers)
        loop
            if jsonb_typeof(a) is distinct from 'object' or jsonb_typeof(a -> 'question_id') is distinct from 'string' then
                raise exception 'INVALID_INPUT';
            end if;
            begin
                qid := (a ->> 'question_id')::uuid;
            exception
                when invalid_text_representation then
                    raise exception 'INVALID_INPUT';
            end;
            if qid = any (ids) or not exists (
            select
                1
            from
                public.questions
            where
                id = qid
                    and survey_id = s.id) then
                raise exception 'INVALID_QUESTION';
                end if;
                ids := array_append(ids, qid);
                if jsonb_typeof(a -> 'choice_id') is distinct from 'string' then
                    raise exception 'INVALID_CHOICE';
                    end if;
                    begin
                        cid := (a ->> 'choice_id')::uuid;
                    exception
                        when invalid_text_representation then
                            raise exception 'INVALID_CHOICE';
                    end;
                    if not exists (
                        select
                            1
                        from
                            public.choices
                        where
                            id = cid
                            and question_id = qid) then
                        raise exception 'INVALID_CHOICE';
                        end if;
end loop;
if exists (
    select
        1
    from
        public.questions
    where
        survey_id = s.id
        and not (id = any (ids))) then
    raise exception 'MISSING_REQUIRED_ANSWER';
    end if;
    begin
        insert into public.responses (survey_id, anonymous_token)
            values (s.id, p_anonymous_token)
        returning
            id
        into
            rid;
    exception
        when unique_violation then
            raise exception 'DUPLICATE_RESPONSE';
    end;
    insert into public.answers (response_id, question_id, choice_id)
    select
        rid,
        (value ->> 'question_id')::uuid,
        (value ->> 'choice_id')::uuid
    from
        jsonb_array_elements(p_answers);
        return jsonb_build_object('success', true, 'response_id', rid);
end
$$;

-- RPC: get_survey_results includes zero-count choices and per-question rates.
create function public.get_survey_results (p_survey_id uuid)
    returns jsonb
    language plpgsql
    stable
    security definer
    set search_path = ''
    as $$
declare
    s public.surveys%rowtype;
    result jsonb;
begin
    perform
        public.require_instructor ();
    select
        *
    into
        s
    from
        public.surveys
    where
        id = p_survey_id;
    if not found then
        raise exception 'NOT_FOUND';
    end if;
    select
        jsonb_build_object('survey_id', s.id, 'title', s.title, 'response_count', (
                select
                    count(*)
                from public.responses
                where
                    survey_id = s.id),
                        'questions',
                        coalesce(jsonb_agg(jsonb_build_object('question_id',
                        q.id,
                        'question_text',
                        q.question_text,
                        'response_count',
                        (
                                select
                                    count(*)
                                from public.answers a
                                join public.responses r on r.id = a.response_id
                                where
                                    a.question_id = q.id
                                    and r.survey_id = s.id), 'choices', (
                                    select
                                        coalesce(jsonb_agg(jsonb_build_object('choice_id',
                                            c.id,
                                            'choice_text',
                                            c.choice_text,
                                            'count',
                                            x.n,
                                            'percentage',
                                            case when x.total = 0 then
                                                        0
                                                    else
                                                        round(100.0 * x.n / x.total, 1)
                                                    end)
                                            order by c.position), '[]'::jsonb)
                                        from public.choices c
                                    cross join lateral (
                                        select
                                            count(*) filter (where a.choice_id = c.id) n, count(*) total
                                        from public.answers a
                                        join public.responses r on r.id = a.response_id
                                    where
                                        a.question_id = q.id
                                        and r.survey_id = s.id) x
                                where
                                    c.question_id = q.id))
                        order by q.position), '[]'::jsonb))
    into
        result
    from
        public.questions q
    where
        q.survey_id = s.id;
    return result;
end
$$;

-- RPC: get_survey_export returns ordered response data without browser tokens.
create function public.get_survey_export (p_survey_id uuid)
    returns jsonb
    language plpgsql
    stable
    security definer
    set search_path = ''
    as $$
declare
    s public.surveys%rowtype;
begin
    perform
        public.require_instructor ();
    select
        *
    into
        s
    from
        public.surveys
    where
        id = p_survey_id;
    if not found then
        raise exception 'NOT_FOUND';
    end if;
    return jsonb_build_object('survey_id', s.id, 'title', s.title, 'questions', (
            select
                coalesce(jsonb_agg(jsonb_build_object('question_id', q.id, 'question_text', q.question_text)
                order by q.position), '[]'::jsonb)
            from public.questions q
            where
                q.survey_id = s.id), 'responses', (
                select
                    coalesce(jsonb_agg(jsonb_build_object('response_id', r.id, 'submitted_at', r.submitted_at, 'answers', (
                                    select
                                        coalesce(jsonb_agg(jsonb_build_object('question_id', a.question_id, 'choice_text', c.choice_text)
                                            order by q.position), '[]'::jsonb)
                                from public.answers a
                                join public.questions q on q.id = a.question_id
                                left join public.choices c on c.id = a.choice_id
                            where
                                a.response_id = r.id))
                    order by r.submitted_at, r.id), '[]'::jsonb)
            from public.responses r
        where
            r.survey_id = s.id));
end
$$;

-- Function grants: revoke PUBLIC and Supabase default role grants explicitly.
-- Public RPCs are callable by both client roles; instructor RPCs require an
-- authenticated role and independently verify instructor claims inside.
revoke all on function public.require_instructor (), public.validate_draft (jsonb), public.survey_questions (uuid) from public, anon, authenticated;

revoke all on function public.get_public_survey (text), public.submit_survey_response (uuid, text, jsonb) from public, anon, authenticated;

grant execute on function public.get_public_survey (text), public.submit_survey_response (uuid, text, jsonb) to anon, authenticated;

revoke all on function public.save_draft (uuid,
    jsonb),
    public.duplicate_survey (uuid),
    public.activate_survey (uuid),
    public.close_survey (uuid),
    public.archive_survey (uuid),
    public.delete_survey (uuid),
    public.get_survey_results (uuid),
    public.get_survey_export (uuid) from public,
    anon,
    authenticated;

grant execute on function public.save_draft (uuid,
    jsonb),
    public.duplicate_survey (uuid),
    public.activate_survey (uuid),
    public.close_survey (uuid),
    public.archive_survey (uuid),
    public.delete_survey (uuid),
    public.get_survey_results (uuid),
    public.get_survey_export (uuid) to authenticated;
