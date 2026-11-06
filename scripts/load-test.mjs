import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { client, rpc, signIn } from "./common.mjs";

console.warn(
  "WARNING: Activating this test survey closes the currently active survey.",
);
let failed = false;
let surveyId;
let active = false;
let instructor;
const cleanup = process.argv.includes("--cleanup");

try {
  const anon = client();
  if (!process.argv.includes("--yes"))
    throw new Error("Pass --yes to acknowledge the warning and run the test.");
  const countArg = process.argv.find((arg) => arg.startsWith("--count="));
  const count = countArg ? Number(countArg.slice("--count=".length)) : 200;
  if (!Number.isSafeInteger(count) || count < 1)
    throw new Error("--count must be a positive integer.");
  instructor = client();
  await signIn(instructor);
  const draft = {
    title: `Load test ${randomUUID()}`,
    description: "Temporary concurrent submission test",
    questions: [1, 2, 3].map((number) => ({
      question_text: `Test question ${number}`,
      question_type: "multiple_choice",
      choices: ["First", "Second"],
    })),
  };
  const created = await rpc(instructor, "save_draft", {
    p_survey_id: null,
    p_draft: draft,
  });
  surveyId = created.survey_id;
  const activated = await rpc(instructor, "activate_survey", {
    p_survey_id: surveyId,
  });
  active = true;
  const publicResult = await rpc(anon, "get_public_survey", {
    p_slug: activated.public_slug,
  });
  if (
    publicResult.status !== "active" ||
    publicResult.survey.questions.length !== 3
  )
    throw new Error("Could not retrieve the three active test questions.");
  const answers = publicResult.survey.questions.map((question) => ({
    question_id: question.id,
    choice_id: question.choices[0].id,
  }));
  const tokens = Array.from({ length: count }, () => randomUUID());
  const submissions = await Promise.all(
    tokens.map(async (token) => {
      const start = performance.now();
      try {
        const result = await anon.rpc("submit_survey_response", {
          p_survey_id: surveyId,
          p_anonymous_token: token,
          p_answers: answers,
        });
        return {
          ok: !result.error && result.data?.success === true,
          latency: performance.now() - start,
        };
      } catch {
        return { ok: false, latency: performance.now() - start };
      }
    }),
  );
  const successes = submissions.filter((submission) => submission.ok).length;
  const latencies = submissions
    .map((submission) => submission.latency)
    .sort((a, b) => a - b);
  const percentile = (p) =>
    latencies[Math.ceil(p * latencies.length) - 1].toFixed(1);
  console.log(
    `Submissions: ${successes} succeeded, ${count - successes} failed.`,
  );
  console.log(
    `Latency (ms): min ${latencies[0].toFixed(1)}, median ${percentile(0.5)}, p95 ${percentile(0.95)}, max ${latencies.at(-1).toFixed(1)}.`,
  );
  if (successes !== count) throw new Error("Some submissions failed.");
  const results = await rpc(instructor, "get_survey_results", {
    p_survey_id: surveyId,
  });
  const responseCount = await instructor
    .from("responses")
    .select("id", { count: "exact", head: true })
    .eq("survey_id", surveyId);
  if (
    responseCount.error ||
    responseCount.count !== count ||
    results.response_count !== count ||
    results.questions.length !== 3 ||
    results.questions.some(
      (question) =>
        question.response_count !== count ||
        question.choices.reduce((sum, choice) => sum + choice.count, 0) !==
          count ||
        question.choices[0].count !== count,
    )
  ) {
    throw new Error(
      "Response count or result totals do not match submissions.",
    );
  }
  const duplicate = await anon.rpc("submit_survey_response", {
    p_survey_id: surveyId,
    p_anonymous_token: tokens[0],
    p_answers: answers,
  });
  if (duplicate.error?.message !== "DUPLICATE_RESPONSE")
    throw new Error(
      "Duplicate submission was not rejected with DUPLICATE_RESPONSE.",
    );
  console.log("PASS response totals and duplicate rejection");
} catch (error) {
  console.error(`FAIL ${error.message}`);
  failed = true;
} finally {
  if (surveyId && instructor) {
    try {
      if (active)
        await rpc(instructor, "close_survey", { p_survey_id: surveyId });
      if (cleanup)
        await rpc(instructor, "delete_survey", { p_survey_id: surveyId });
      console.log(
        `${cleanup ? "Deleted" : "Closed or retained draft"} test survey ${surveyId}.`,
      );
    } catch (error) {
      console.error(
        `FAIL cleanup of test survey ${surveyId}: ${error.message}`,
      );
      failed = true;
    }
    await instructor.auth.signOut();
  }
}
if (failed) process.exitCode = 1;
