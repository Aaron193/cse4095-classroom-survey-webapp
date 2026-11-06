import { randomInt, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { client, rpc, signIn } from "./common.mjs";

function options() {
  if (!process.argv.includes("--yes")) {
    throw new Error("Pass --yes to acknowledge the warning and run the test.");
  }

  const countArg = process.argv.find((arg) => arg.startsWith("--count="));
  const count = countArg ? Number(countArg.slice("--count=".length)) : 200;
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new Error("--count must be a positive integer.");
  }

  return { count, keep: process.argv.includes("--keep") };
}

async function createSurvey(instructor) {
  const draft = {
    title: `Load test ${randomUUID()}`,
    description: "Temporary concurrent submission test",
    questions: [1, 2, 3].map((number) => ({
      question_text: `Test question ${number}`,
      question_type: "multiple_choice",
      choices: ["First", "Second"],
    })),
  };

  return rpc(instructor, "save_draft", { p_survey_id: null, p_draft: draft });
}

async function simulateStudent(anon, slug, surveyId) {
  const start = performance.now();
  const token = randomUUID();

  try {
    const loaded = await rpc(anon, "get_public_survey", { p_slug: slug });
    if (
      loaded.status !== "active" ||
      loaded.survey.id !== surveyId ||
      loaded.survey.questions.length !== 3
    ) {
      throw new Error(
        "Public survey did not contain the expected active survey and three questions.",
      );
    }

    const answers = loaded.survey.questions.map((question) => {
      if (question.choices.length !== 2)
        throw new Error("Expected two choices per question.");
      return {
        question_id: question.id,
        choice_id: question.choices[randomInt(question.choices.length)].id,
      };
    });
    const submitted = await rpc(anon, "submit_survey_response", {
      p_survey_id: surveyId,
      p_anonymous_token: token,
      p_answers: answers,
    });
    if (submitted?.success !== true)
      throw new Error("Submission did not report success.");
    return { ok: true, token, answers, latency: performance.now() - start };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      latency: performance.now() - start,
    };
  }
}

function reportSubmissions(submissions) {
  const successes = submissions.filter((submission) => submission.ok);
  const latencies = submissions
    .map((submission) => submission.latency)
    .sort((a, b) => a - b);
  const percentile = (p) =>
    latencies[Math.ceil(p * latencies.length) - 1].toFixed(1);

  console.log(
    `Submissions: ${successes.length} succeeded, ${submissions.length - successes.length} failed.`,
  );
  console.log(
    `Student load + submission latency (ms): min ${latencies[0].toFixed(1)}, median ${percentile(0.5)}, p95 ${percentile(0.95)}, max ${latencies.at(-1).toFixed(1)}.`,
  );

  const errors = new Map();
  for (const submission of submissions.filter((item) => !item.ok)) {
    errors.set(submission.error, (errors.get(submission.error) || 0) + 1);
  }
  for (const [message, count] of errors)
    console.error(`FAIL ${count} student(s): ${message}`);
  if (errors.size) throw new Error("Some student loads or submissions failed.");
  return successes;
}

async function verifyResults(instructor, surveyId, submissions) {
  const expected = new Map();
  for (const submission of submissions) {
    for (const answer of submission.answers) {
      const key = `${answer.question_id}:${answer.choice_id}`;
      expected.set(key, (expected.get(key) || 0) + 1);
    }
  }

  const results = await rpc(instructor, "get_survey_results", {
    p_survey_id: surveyId,
  });
  const responseCount = await instructor
    .from("responses")
    .select("id", { count: "exact", head: true })
    .eq("survey_id", surveyId);
  if (responseCount.error)
    throw new Error(`Response count failed: ${responseCount.error.message}`);
  if (
    responseCount.count !== submissions.length ||
    results.response_count !== submissions.length ||
    results.questions.length !== 3
  ) {
    throw new Error(
      `Response or question counts differ: table=${responseCount.count}, results=${results.response_count}, questions=${results.questions.length}.`,
    );
  }

  for (const question of results.questions) {
    if (
      question.response_count !== submissions.length ||
      question.choices.length !== 2
    )
      throw new Error(
        `Question ${question.question_id} has incorrect response or choice count.`,
      );
    for (const choice of question.choices) {
      const key = `${question.question_id}:${choice.choice_id}`;
      const count = expected.get(key) || 0;
      if (choice.count !== count)
        throw new Error(
          `Choice ${choice.choice_id}: expected ${count}, got ${choice.count}.`,
        );
      expected.delete(key);
    }
  }
  if (expected.size)
    throw new Error("Results omitted choices present in submitted answers.");
  console.log("PASS response count and exact choice tallies");

  const exported = await rpc(instructor, "get_survey_export", {
    p_survey_id: surveyId,
  });
  if (
    !Array.isArray(exported.responses) ||
    exported.responses.length !== submissions.length
  ) {
    throw new Error(
      `Export row count: expected ${submissions.length}, got ${exported.responses?.length ?? "invalid"}.`,
    );
  }
  console.log(
    `PASS export contains ${exported.responses.length} response rows`,
  );
}

async function verifyDuplicate(anon, surveyId, submission) {
  const duplicate = await anon.rpc("submit_survey_response", {
    p_survey_id: surveyId,
    p_anonymous_token: submission.token,
    p_answers: submission.answers,
  });
  if (duplicate.error?.message !== "DUPLICATE_RESPONSE") {
    throw new Error(
      `Duplicate submission: expected DUPLICATE_RESPONSE, got ${duplicate.error?.message || "success"}.`,
    );
  }
  console.log("PASS duplicate submission rejected");
}

async function cleanupSurvey(instructor, surveyId, activationAttempted, keep) {
  // Activation may have succeeded even if its response was lost, so attempt close in either case.
  let closeError;
  if (activationAttempted) {
    const close = await instructor.rpc("close_survey", {
      p_survey_id: surveyId,
    });
    if (close.error && close.error.message !== "INVALID_STATE") {
      closeError = `closing test survey ${surveyId}: ${close.error.message}`;
      console.error(`FAIL ${closeError}`);
    }
  }

  if (keep) {
    console.log(`Retained test survey ${surveyId}.`);
    if (closeError) throw new Error(closeError);
    return;
  }
  await rpc(instructor, "delete_survey", { p_survey_id: surveyId });
  console.log(`Deleted test survey ${surveyId}.`);
  if (closeError) throw new Error(closeError);
}

async function main() {
  console.warn(
    "WARNING: Activating this test survey closes the currently active survey.",
  );
  const { count, keep } = options();
  const anon = client();
  const instructor = client();
  let surveyId;
  let activationAttempted = false;

  await signIn(instructor);
  try {
    const created = await createSurvey(instructor);
    surveyId = created.survey_id;
    activationAttempted = true;
    const activated = await rpc(instructor, "activate_survey", {
      p_survey_id: surveyId,
    });

    // Start every simulated student together; each performs its own public load.
    const submissions = await Promise.all(
      Array.from({ length: count }, () =>
        simulateStudent(anon, activated.public_slug, surveyId),
      ),
    );
    const successes = reportSubmissions(submissions);
    await verifyResults(instructor, surveyId, successes);
    await verifyDuplicate(anon, surveyId, successes[0]);
  } finally {
    try {
      if (surveyId)
        await cleanupSurvey(instructor, surveyId, activationAttempted, keep);
    } finally {
      await instructor.auth.signOut();
    }
  }
}

try {
  await main();
} catch (error) {
  console.error(`FAIL ${error.message}`);
  process.exitCode = 1;
}
