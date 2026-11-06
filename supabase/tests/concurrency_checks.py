#!/usr/bin/env python3
"""Exercise lifecycle locks in separate sessions in the disposable container."""
import subprocess
import sys
import time

container = sys.argv[1]
base = ["docker", "exec", "-i", container, "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"]
claims = '{"sub":"00000000-0000-0000-0000-000000000002","app_metadata":{"role":"instructor"}}'
survey = "00000000-0000-0000-0000-000000000101"
question = "00000000-0000-0000-0000-000000000102"
choice = "00000000-0000-0000-0000-000000000103"
draft1 = "00000000-0000-0000-0000-000000000104"
draft2 = "00000000-0000-0000-0000-000000000105"
answers = '[{"question_id":"%s","choice_id":"%s"}]' % (question, choice)


def run(sql, *, check=True):
    return subprocess.run(base, input=sql, text=True, capture_output=True, check=check)


def start(name, sql):
    command = ["docker", "exec", "-i", "-e", f"PGAPPNAME={name}", container, *base[4:]]
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    process.stdin.write(sql)
    process.stdin.close()
    return process


def finish(process):
    process.wait(timeout=20)
    output = process.stdout.read()
    error = process.stderr.read()
    if process.returncode:
        raise RuntimeError(f"session failed: {error}\n{output}")
    return output


def wait_for(name, event_type):
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        sql = f"select count(*) from pg_stat_activity where application_name = '{name}' and wait_event_type = '{event_type}';"
        if run(sql).stdout.strip() == "1":
            return
        time.sleep(0.1)
    raise RuntimeError(f"{name} did not reach wait event type {event_type}")


def require(condition, message):
    if not condition:
        raise AssertionError(message)
    print(f"PASS: {message}")


run(f"""
insert into public.surveys(id,title,status,public_slug) values ('{survey}','Concurrency','active','testlock');
insert into public.questions(id,survey_id,question_text,question_type,position) values ('{question}','{survey}','Question','multiple_choice',0);
insert into public.choices(id,question_id,choice_text,position) values ('{choice}','{question}','Yes',0), ('00000000-0000-0000-0000-000000000106','{question}','No',1);
""")
submit = start("survey_submit_hold", f"""
begin;
set local role anon;
select public.submit_survey_response('{survey}','concurrency-token','{answers}'::jsonb);
select pg_sleep(5);
commit;
""")
wait_for("survey_submit_hold", "Timeout")
close = start("survey_close_wait", f"""
begin;
set local role authenticated;
select set_config('request.jwt.claims','{claims}',true);
select public.close_survey('{survey}');
commit;
""")
wait_for("survey_close_wait", "Lock")
require(close.poll() is None, "close waits for the open submission transaction")
finish(submit)
finish(close)
saved = run(f"select count(*) from public.responses where survey_id='{survey}' and anonymous_token='concurrency-token';").stdout.strip()
require(saved == "1", "the submission committed before close returned")
late = run(f"set role anon; select public.submit_survey_response('{survey}','late-token','{answers}'::jsonb);", check=False)
require(late.returncode != 0 and 'SURVEY_NOT_ACTIVE' in late.stderr, "submission after close returns SURVEY_NOT_ACTIVE")

# Hold the first transaction open after its activation RPC, then start the
# second RPC while the lifecycle advisory lock is still held.
run(f"""
insert into public.surveys(id,title) values ('{draft1}','First'),('{draft2}','Second');
insert into public.questions(id,survey_id,question_text,question_type,position) values
 ('00000000-0000-0000-0000-000000000107','{draft1}','First question','true_false',0),
 ('00000000-0000-0000-0000-000000000108','{draft2}','Second question','true_false',0);
insert into public.choices(question_id,choice_text,position) values
 ('00000000-0000-0000-0000-000000000107','True',0),('00000000-0000-0000-0000-000000000107','False',1),
 ('00000000-0000-0000-0000-000000000108','True',0),('00000000-0000-0000-0000-000000000108','False',1);
""")
first = start("survey_activate_first", f"""
begin;
set local role authenticated;
select set_config('request.jwt.claims','{claims}',true);
select public.activate_survey('{draft1}');
select pg_sleep(5);
commit;
""")
wait_for("survey_activate_first", "Timeout")
second = start("survey_activate_second", f"""
begin;
set local role authenticated;
select set_config('request.jwt.claims','{claims}',true);
select public.activate_survey('{draft2}');
commit;
""")
wait_for("survey_activate_second", "Lock")
require(second.poll() is None, "concurrent activation waits for the lifecycle lock")
first_output = finish(first)
second_output = finish(second)
require('"status": "active"' in first_output and '"status": "active"' in second_output, "both activation calls finish successfully")
statuses = run(f"select string_agg(status, ',' order by id) from public.surveys where id in ('{draft1}','{draft2}');").stdout.strip()
active_count = run("select count(*) from public.surveys where status='active';").stdout.strip()
require(statuses == 'closed,active' and active_count == '1', "exactly one survey remains active")
