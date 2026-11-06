import { randomUUID } from "node:crypto";
import { client, signIn } from "./common.mjs";

let failures = 0;

function check(label, passed, detail = "") {
  console.log(
    `${passed ? "PASS" : "FAIL"} ${label}${detail ? `: ${detail}` : ""}`,
  );
  if (!passed) failures++;
}

function permissionDenied(error) {
  return error?.code === "42501" && /permission denied/i.test(error.message);
}

async function probe(label, request, details) {
  const { error } = await request();
  if (permissionDenied(error)) {
    check(label, true);
  } else if (error) {
    check(
      label,
      false,
      `expected permission denied (42501), got ${error.code}: ${error.message}`,
    );
  } else {
    check(
      label,
      false,
      `request succeeded; operation: ${JSON.stringify(details)}`,
    );
  }
}

async function main() {
  const anon = client();
  const tables = ["surveys", "questions", "choices", "responses", "answers"];
  for (const table of tables) {
    await probe(
      `anon select ${table}`,
      () => anon.from(table).select("*").limit(1),
      { table, operation: "select" },
    );
  }

  const id = randomUUID();
  const draft = {
    title: "RLS verification",
    description: null,
    questions: [
      {
        question_text: "Test?",
        question_type: "multiple_choice",
        choices: ["Yes", "No"],
      },
    ],
  };
  const calls = {
    save_draft: { p_survey_id: id, p_draft: draft },
    duplicate_survey: { p_survey_id: id },
    activate_survey: { p_survey_id: id },
    close_survey: { p_survey_id: id },
    archive_survey: { p_survey_id: id },
    delete_survey: { p_survey_id: id },
    get_survey_results: { p_survey_id: id },
    get_survey_export: { p_survey_id: id },
  };
  for (const [name, args] of Object.entries(calls)) {
    await probe(`anon RPC ${name}`, () => anon.rpc(name, args), {
      rpc: name,
      args,
    });
  }
  const { data, error } = await anon.rpc("get_public_survey", {
    p_slug: randomUUID(),
  });
  check("unknown public survey", !error && data?.status === "not_found");

  const marker = randomUUID();
  const surveyId = randomUUID();
  const questionId = randomUUID();
  const responseId = randomUUID();
  const inserts = {
    surveys: { id: surveyId, title: `RLS probe ${marker}`, status: "draft" },
    questions: {
      id: questionId,
      survey_id: surveyId,
      question_text: `RLS probe ${marker}`,
      question_type: "multiple_choice",
      position: 0,
    },
    choices: {
      id: randomUUID(),
      question_id: questionId,
      choice_text: `RLS probe ${marker}`,
      position: 0,
    },
    responses: { id: responseId, survey_id: surveyId, anonymous_token: marker },
    answers: {
      id: randomUUID(),
      response_id: responseId,
      question_id: questionId,
    },
  };
  for (const [table, row] of Object.entries(inserts)) {
    await probe(`anon insert ${table}`, () => anon.from(table).insert(row), {
      table,
      operation: "insert",
      row,
    });
  }

  const changes = {
    surveys: { title: `RLS probe ${marker}` },
    questions: { question_text: `RLS probe ${marker}` },
    choices: { choice_text: `RLS probe ${marker}` },
    responses: { anonymous_token: marker },
    answers: { text_answer: `RLS probe ${marker}` },
  };
  for (const table of tables) {
    const targetId = randomUUID();
    await probe(
      `anon update ${table}`,
      () => anon.from(table).update(changes[table]).eq("id", targetId),
      {
        table,
        operation: "update",
        filter: { id: targetId },
        changes: changes[table],
      },
    );
    await probe(
      `anon delete ${table}`,
      () => anon.from(table).delete().eq("id", targetId),
      { table, operation: "delete", filter: { id: targetId } },
    );
  }

  if (process.env.INSTRUCTOR_EMAIL || process.env.INSTRUCTOR_PASSWORD) {
    const instructor = client();
    await signIn(instructor);
    const list = await instructor.from("surveys").select("id").limit(1);
    check("instructor list surveys", !list.error && Array.isArray(list.data));
    if (list.data?.length) {
      const result = await instructor.rpc("get_survey_results", {
        p_survey_id: list.data[0].id,
      });
      check(
        "instructor read results",
        !result.error && result.data?.survey_id === list.data[0].id,
      );
    } else {
      check(
        "instructor read results",
        false,
        "No survey available to check results.",
      );
    }
    // Preserve instructor sessions in browsers and on other devices.
    await instructor.auth.signOut({ scope: "local" });
  } else {
    console.log(
      "SKIP instructor checks: INSTRUCTOR_EMAIL and INSTRUCTOR_PASSWORD are not set.",
    );
  }
}

try {
  await main();
} catch (error) {
  console.error(`FAIL ${error.message}`);
  failures++;
}
if (failures) process.exitCode = 1;
