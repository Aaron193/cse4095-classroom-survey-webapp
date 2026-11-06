-- Run once after the migration; this example remains a draft.
with s as (
    insert into public.surveys (title, description)
        values ('Example classroom survey', 'A sample draft to customize.')
    returning
        id
), q as (
    insert into public.questions (survey_id, question_text, question_type, position)
    select
        id,
        'Which format helps you learn?',
        'multiple_choice',
        0
    from
        s
    union all
    select
        id,
        'Was the pace comfortable?',
        'true_false',
        1
    from
        s
    returning
        id,
        question_type
)
insert into public.choices (question_id, choice_text, position)
select
    id,
    v.choice_text,
    v.position
from
    q
    cross join lateral (
        select
            'Discussion'::text choice_text,
            0 position
        where
            q.question_type = 'multiple_choice'
        union all
        select
            'Practice',
            1
        where
            q.question_type = 'multiple_choice'
        union all
        select
            'True',
            0
        where
            q.question_type = 'true_false'
        union all
        select
            'False',
            1
        where
            q.question_type = 'true_false') v;
