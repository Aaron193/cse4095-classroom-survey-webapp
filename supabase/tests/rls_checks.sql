-- Paste the whole script into the SQL Editor. Application data is rolled back.
-- Temporary sequences preserve the pass/fail bits across the rollback.
drop table if exists pg_temp.check_names, pg_temp.test_context;

drop sequence if exists pg_temp.checks_seen, pg_temp.checks_passed;

-- Results use sequence bits because sequence updates survive the rollback below.
create temporary table check_names (
    id integer generated always as identity,
    name text unique
);

insert into check_names (name)
values
    ('unknown slug'),
    ('non-instructor reads nothing'),
    ('non-instructor forbidden'),
    ('missing identity'),
    ('save trims and stores draft'),
    ('instructor can read all tables'),
    ('save existing draft'),
    ('activation slug format'),
    ('active cannot edit'),
    ('active cannot delete'),
    ('active lookup includes questions'),
    ('submit works'),
    ('duplicate token'),
    ('bad question'),
    ('duplicate question'),
    ('bad choice'),
    ('missing answer'),
    ('second submit'),
    ('token length 128 accepted'),
    ('token length 129 rejected'),
    ('table rejects oversized token'),
    ('results counts and percentages'),
    ('export excludes token'),
    ('duplicate is independent draft'),
    ('second activation'),
    ('one active and previous closed'),
    ('closed cannot edit'),
    ('closed lookup leaks no questions'),
    ('submit after close'),
    ('close'),
    ('archive'),
    ('archived public lookup'),
    ('delete cascade'),
    ('delete closed'),
    ('anon SELECT surveys'),
    ('anon INSERT surveys'),
    ('anon UPDATE surveys'),
    ('anon DELETE surveys'),
    ('anon SELECT questions'),
    ('anon INSERT questions'),
    ('anon UPDATE questions'),
    ('anon DELETE questions'),
    ('anon SELECT choices'),
    ('anon INSERT choices'),
    ('anon UPDATE choices'),
    ('anon DELETE choices'),
    ('anon SELECT responses'),
    ('anon INSERT responses'),
    ('anon UPDATE responses'),
    ('anon DELETE responses'),
    ('anon SELECT answers'),
    ('anon INSERT answers'),
    ('anon UPDATE answers'),
    ('anon DELETE answers'),
    ('anon cannot execute save_draft(uuid,jsonb)'),
    ('anon cannot execute duplicate_survey(uuid)'),
    ('anon cannot execute activate_survey(uuid)'),
    ('anon cannot execute close_survey(uuid)'),
    ('anon cannot execute archive_survey(uuid)'),
    ('anon cannot execute delete_survey(uuid)'),
    ('anon cannot execute get_survey_results(uuid)'),
    ('anon cannot execute get_survey_export(uuid)');

create temporary sequence checks_seen
    minvalue 0 start 0;

create temporary sequence checks_passed
    minvalue 0 start 0;

grant select on check_names to anon, authenticated;

grant usage, select, update on checks_seen, checks_passed to anon, authenticated;

create temporary table test_context (
    key text primary key,
    value text
) on commit preserve rows;

grant all on test_context to anon, authenticated;

-- Record a named assertion and capture expected error codes.
create or replace function pg_temp.check_it (n text, ok boolean, detail text default null)
    returns void
    language plpgsql
    as $$
declare
    bit_value bigint;
    old_value bigint;
begin
    select
        (1::bigint << (id - 1))
    into
        strict bit_value
    from
        check_names
    where
        name = n;
    select
        last_value
    into
        old_value
    from
        checks_seen;
    perform
        setval('pg_temp.checks_seen', old_value | bit_value);
    if coalesce(ok, false) then
        select
            last_value
        into
            old_value
        from
            checks_passed;
        perform
            setval('pg_temp.checks_passed', old_value | bit_value);
    end if;
end
$$;

create or replace function pg_temp.expect_error (n text, command text, expected text)
    returns void
    language plpgsql
    as $$
begin
    execute command;
    perform
        pg_temp.check_it (n, false, 'No error');
exception
    when others then
        perform
            pg_temp.check_it (n, sqlerrm = expected, 'Expected ' || expected || '; got ' || sqlerrm);
end
$$;

create or replace function pg_temp.ctx (k text)
    returns text
    language sql
    as $$
    select
        value
    from
        test_context
    where
        key = k
$$;

begin;
-- Anonymous callers have no direct table access or instructor RPC execution.
set local role anon;
select
    set_config('request.jwt.claims', '{}', true);
do $$
declare
    t text;
    op text;
    cmd text;
begin
    foreach t in array array['surveys', 'questions', 'choices', 'responses', 'answers'] loop
        foreach op in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] loop
            cmd := case op
            when 'SELECT' then
                format('select * from public.%I', t)
            when 'INSERT' then
                format('insert into public.%I default values', t)
            when 'UPDATE' then
                format('update public.%I set id=id', t)
            else
                format('delete from public.%I', t)
            end;
            begin
                execute cmd;
                perform
                    pg_temp.check_it ('anon ' || op || ' ' || t, false, 'Unexpectedly allowed');
            exception
                when insufficient_privilege then
                    perform
                        pg_temp.check_it ('anon ' || op || ' ' || t, true);
                when others then
                    perform
                        pg_temp.check_it ('anon ' || op || ' ' || t, false, sqlerrm);
            end;
        end loop;
    end loop;
end
$$;
do $$
declare
    f text;
begin
    foreach f in array array['save_draft(uuid,jsonb)',
        'duplicate_survey(uuid)',
        'activate_survey(uuid)',
        'close_survey(uuid)',
        'archive_survey(uuid)',
        'delete_survey(uuid)',
        'get_survey_results(uuid)',
        'get_survey_export(uuid)'] loop
        perform
            pg_temp.check_it ('anon cannot execute ' || f, not has_function_privilege('anon', 'public.' || f, 'EXECUTE'));
    end loop;
end
$$;
select
    pg_temp.check_it ('unknown slug', public.get_public_survey ('not-a-real-slug') = '{"status":"not_found"}'::jsonb);
-- Check non-instructors, then use an instructor JWT for lifecycle tests.
set local role authenticated;
select
    set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","app_metadata":{}}', true);
select
    pg_temp.check_it ('non-instructor reads nothing', not exists (
            select
                1
            from public.surveys)
    and not exists (
        select
            1
        from public.questions)
and not exists (
    select
        1
    from public.choices)
and not exists (
    select
        1
    from public.responses)
and not exists (
    select
        1
    from public.answers));
select
    pg_temp.expect_error ('non-instructor forbidden', 'select public.save_draft(null, ''{}''::jsonb)', 'FORBIDDEN');
select
    set_config('request.jwt.claims', '{}', true);
select
    pg_temp.expect_error ('missing identity', 'select public.get_survey_results(null)', 'AUTH_REQUIRED');
select
    set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","app_metadata":{"role":"instructor"}}', true);
-- Create and exercise a draft, then retain its IDs in session-local context.
insert into test_context
    values ('draft',
        '{"title":" Test survey ","description":" ","questions":[{"question_text":" First? ","question_type":"multiple_choice","choices":[" A ","B"]},{"question_text":"Second?","question_type":"true_false","choices":["True","False"]}]}');
insert into test_context
select
    'survey',
    public.save_draft (null, pg_temp.ctx ('draft')::jsonb) ->> 'survey_id';
select
    pg_temp.check_it ('save trims and stores draft', exists (
            select
                1
            from public.surveys
            where
                id = pg_temp.ctx ('survey')::uuid
            and title = 'Test survey'
            and description is null
            and status = 'draft'));
select
    pg_temp.check_it ('instructor can read all tables', (
            select
                count(*)
            from public.questions
            where
                survey_id = pg_temp.ctx ('survey')::uuid) = 2
            and (
                select
                    count(*)
                from public.choices c
                join public.questions q on q.id = c.question_id
                where
                    q.survey_id = pg_temp.ctx ('survey')::uuid) = 4);
select
    pg_temp.check_it ('save existing draft',
        public.save_draft (pg_temp.ctx ('survey')::uuid,
        pg_temp.ctx ('draft')::jsonb) ->> 'survey_id' = pg_temp.ctx ('survey'));
insert into test_context
select
    'q1',
    id::text
from
    public.questions
where
    survey_id = pg_temp.ctx ('survey')::uuid
    and position = 0;
insert into test_context
select
    'q2',
    id::text
from
    public.questions
where
    survey_id = pg_temp.ctx ('survey')::uuid
    and position = 1;
insert into test_context
select
    'c1',
    id::text
from
    public.choices
where
    question_id = pg_temp.ctx ('q1')::uuid
    and position = 0;
insert into test_context
select
    'c2',
    id::text
from
    public.choices
where
    question_id = pg_temp.ctx ('q1')::uuid
    and position = 1;
insert into test_context
select
    'c3',
    id::text
from
    public.choices
where
    question_id = pg_temp.ctx ('q2')::uuid
    and position = 0;
insert into test_context
select
    'answers',
    jsonb_build_array(jsonb_build_object('question_id',
        pg_temp.ctx ('q1'),
        'choice_id',
        pg_temp.ctx ('c1')),
        jsonb_build_object('question_id',
        pg_temp.ctx ('q2'),
        'choice_id',
        pg_temp.ctx ('c3')))::text;
insert into test_context
select
    'slug',
    public.activate_survey (pg_temp.ctx ('survey')::uuid) ->> 'public_slug';
select
    pg_temp.check_it ('activation slug format', pg_temp.ctx ('slug') ~ '^[23456789abcdefghijkmnpqrstuvwxyz]{8}$');
select
    pg_temp.expect_error ('active cannot edit',
        format('select public.save_draft(%L::uuid,%L::jsonb)',
        pg_temp.ctx ('survey'),
        pg_temp.ctx ('draft')),
        'INVALID_STATE');
select
    pg_temp.expect_error ('active cannot delete', format('select public.delete_survey(%L::uuid)', pg_temp.ctx ('survey')), 'INVALID_STATE');
set local role anon;
select
    pg_temp.check_it ('active lookup includes questions', public.get_public_survey (pg_temp.ctx ('slug')) ->> 'status' = 'active'
        and jsonb_array_length(public.get_public_survey (pg_temp.ctx ('slug')) -> 'survey' -> 'questions') = 2);
select
    pg_temp.check_it ('submit works',
        (public.submit_survey_response (pg_temp.ctx ('survey')::uuid,
        'test-token-1',
        pg_temp.ctx ('answers')::jsonb) ->> 'success')::boolean);
select
    pg_temp.expect_error ('duplicate token',
        format('select public.submit_survey_response(%L::uuid,%L,%L::jsonb)',
        pg_temp.ctx ('survey'),
        'test-token-1',
        pg_temp.ctx ('answers')),
        'DUPLICATE_RESPONSE');
select
    pg_temp.expect_error ('bad question',
        format('select public.submit_survey_response(%L::uuid,%L,%L::jsonb)',
        pg_temp.ctx ('survey'),
        'bad-q',
        jsonb_build_array(jsonb_build_object('question_id',
        '00000000-0000-0000-0000-000000000099',
        'choice_id',
        pg_temp.ctx ('c1')))),
        'INVALID_QUESTION');
select
    pg_temp.expect_error ('duplicate question',
        format('select public.submit_survey_response(%L::uuid,%L,%L::jsonb)',
        pg_temp.ctx ('survey'),
        'dup-q',
        jsonb_build_array(jsonb_build_object('question_id',
        pg_temp.ctx ('q1'),
        'choice_id',
        pg_temp.ctx ('c1')),
        jsonb_build_object('question_id',
        pg_temp.ctx ('q1'),
        'choice_id',
        pg_temp.ctx ('c1')))),
        'INVALID_QUESTION');
select
    pg_temp.expect_error ('bad choice',
        format('select public.submit_survey_response(%L::uuid,%L,%L::jsonb)',
        pg_temp.ctx ('survey'),
        'bad-c',
        jsonb_build_array(jsonb_build_object('question_id',
        pg_temp.ctx ('q1'),
        'choice_id',
        pg_temp.ctx ('c3')))),
        'INVALID_CHOICE');
select
    pg_temp.expect_error ('missing answer',
        format('select public.submit_survey_response(%L::uuid,%L,%L::jsonb)',
        pg_temp.ctx ('survey'),
        'missing',
        jsonb_build_array(jsonb_build_object('question_id',
        pg_temp.ctx ('q1'),
        'choice_id',
        pg_temp.ctx ('c1')))),
        'MISSING_REQUIRED_ANSWER');
select
    pg_temp.check_it ('second submit',
        (public.submit_survey_response (pg_temp.ctx ('survey')::uuid,
        'test-token-2',
        jsonb_build_array(jsonb_build_object('question_id',
        pg_temp.ctx ('q1'),
        'choice_id',
        pg_temp.ctx ('c2')),
        jsonb_build_object('question_id',
        pg_temp.ctx ('q2'),
        'choice_id',
        pg_temp.ctx ('c3')))) ->> 'success')::boolean);
set local role authenticated;
select
    pg_temp.check_it ('results counts and percentages', (public.get_survey_results (pg_temp.ctx ('survey')::uuid) ->> 'response_count')::int = 2
        and (public.get_survey_results (pg_temp.ctx ('survey')::uuid) #>> '{questions,0,response_count}')::int = 2
        and (public.get_survey_results (pg_temp.ctx ('survey')::uuid) #>> '{questions,0,choices,0,count}')::int = 1
        and (public.get_survey_results (pg_temp.ctx ('survey')::uuid) #>> '{questions,0,choices,0,percentage}')::numeric = 50
        and (public.get_survey_results (pg_temp.ctx ('survey')::uuid) #>> '{questions,1,choices,0,percentage}')::numeric = 100);
select
    pg_temp.check_it ('export excludes token', jsonb_array_length(public.get_survey_export (pg_temp.ctx ('survey')::uuid) -> 'responses') = 2
        and position('token' in public.get_survey_export (pg_temp.ctx ('survey')::uuid)::text) = 0);
-- Even privileged direct inserts are constrained by the table itself.
reset role;
do $$
begin
    insert into public.responses (survey_id, anonymous_token)
    values (pg_temp.ctx('survey')::uuid, repeat('x', 129));
    perform pg_temp.check_it('table rejects oversized token', false);
exception
    when check_violation then
        perform pg_temp.check_it('table rejects oversized token', true);
end
$$;

-- Check token boundaries after the two-response results assertions.
set local role anon;
select pg_temp.check_it(
    'token length 128 accepted',
    (public.submit_survey_response(
        pg_temp.ctx('survey')::uuid, repeat('x', 128), pg_temp.ctx('answers')::jsonb
    ) ->> 'success')::boolean
);
select pg_temp.expect_error(
    'token length 129 rejected',
    format('select public.submit_survey_response(%L::uuid,%L,%L::jsonb)',
        pg_temp.ctx('survey'), repeat('x', 129), pg_temp.ctx('answers')),
    'INVALID_INPUT'
);
set local role authenticated;

insert into test_context
select
    'copy',
    public.duplicate_survey (pg_temp.ctx ('survey')::uuid) ->> 'survey_id';
select
    pg_temp.check_it ('duplicate is independent draft', exists (
            select
                1
            from public.surveys
            where
                id = pg_temp.ctx ('copy')::uuid
            and status = 'draft'
            and title = 'Copy of Test survey'
            and public_slug is null)
        and (
            select
                count(*)
            from public.questions
            where
                survey_id = pg_temp.ctx ('copy')::uuid) = 2);
select
    pg_temp.check_it ('second activation', public.activate_survey (pg_temp.ctx ('copy')::uuid) ->> 'status' = 'active');
select
    pg_temp.check_it ('one active and previous closed', (
            select
                count(*)
            from public.surveys
            where
                status = 'active') = 1
            and (
                select
                    status
                from public.surveys
                where
                    id = pg_temp.ctx ('survey')::uuid) = 'closed');
select
    pg_temp.expect_error ('closed cannot edit',
        format('select public.save_draft(%L::uuid,%L::jsonb)',
        pg_temp.ctx ('survey'),
        pg_temp.ctx ('draft')),
        'INVALID_STATE');
set local role anon;
select
    pg_temp.check_it ('closed lookup leaks no questions',
        public.get_public_survey (pg_temp.ctx ('slug')) = jsonb_build_object('status',
        'closed',
        'title',
        'Test survey'));
select
    pg_temp.expect_error ('submit after close',
        format('select public.submit_survey_response(%L::uuid,%L,%L::jsonb)',
        pg_temp.ctx ('survey'),
        'late',
        pg_temp.ctx ('answers')),
        'SURVEY_NOT_ACTIVE');
set local role authenticated;
select
    pg_temp.check_it ('close', public.close_survey (pg_temp.ctx ('copy')::uuid) ->> 'status' = 'closed');
select
    pg_temp.check_it ('archive', public.archive_survey (pg_temp.ctx ('survey')::uuid) ->> 'status' = 'archived');
select
    pg_temp.check_it ('archived public lookup',
        public.get_public_survey (pg_temp.ctx ('slug')) = jsonb_build_object('status',
        'closed',
        'title',
        'Test survey'));
select
    public.delete_survey (pg_temp.ctx ('survey')::uuid);
select
    pg_temp.check_it ('delete cascade', not exists (
            select
                1
            from public.responses
            where
                survey_id = pg_temp.ctx ('survey')::uuid)
        and not exists (
            select
                1
            from public.questions
            where
                survey_id = pg_temp.ctx ('survey')::uuid));
select
    pg_temp.check_it ('delete closed', public.delete_survey (pg_temp.ctx ('copy')::uuid) ->> 'id' = pg_temp.ctx ('copy'));
-- Roll back survey changes; sequence values retain the check results.
rollback;
select
    n.name as check_name,
    case when (s.last_value & (1::bigint << (n.id - 1))) = 0 then
        'NOT RUN'
    when (p.last_value & (1::bigint << (n.id - 1))) <> 0 then
        'PASS'
    else
        'FAIL'
    end as result
from
    check_names n
    cross join checks_seen s
    cross join checks_passed p
order by
    n.name;
