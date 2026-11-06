// Provides the page-facing survey API and translates backend failures.
import { supabase } from "./supabase";
import { appError, mapError } from "./errors";
import type {
  AnswerInput,
  Choice,
  DraftInput,
  ExportData,
  PublicSurveyResult,
  Question,
  SurveyDetail,
  SurveyResults,
  SurveySummary,
} from "../types/survey";

function client() {
  if (!supabase) throw appError("UNEXPECTED_ERROR");
  return supabase;
}

async function guard() {
  const db = client();
  const { data: session, error } = await db.auth.getSession();
  if (error) throw error;
  if (!session.session) throw appError("AUTH_REQUIRED");
  const result = await db.rpc("is_instructor");
  if (result.error) throw result.error;
  if (!result.data) throw appError("FORBIDDEN");
}

async function safe<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      "message" in error &&
      typeof error.code === "string" &&
      typeof error.message === "string" &&
      ["AUTH_REQUIRED", "FORBIDDEN"].includes(error.code)
    )
      throw appError(error.code as "AUTH_REQUIRED" | "FORBIDDEN");
    throw mapError(error);
  }
}

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  return safe(async () => {
    const { data, error } = await client().rpc(name, args);
    if (error) throw error;
    return data as T;
  });
}

const pageSize = 500;

async function allPages<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ;) {
    const { data, error } = await fetchPage(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length === 0) return rows;
    offset += page.length;
  }
}

async function count(id: string): Promise<number> {
  const { count, error } = await client()
    .from("responses")
    .select("*", { count: "exact", head: true })
    .eq("survey_id", id);
  if (error) throw error;
  return count ?? 0;
}

type CountRelation = { count: number }[];

type SurveyRow = Omit<SurveySummary, "response_count"> & {
  responses: CountRelation;
};

type QuestionRow = Omit<Question, "choices"> & {
  choice_rows: Choice[];
  choices_total: CountRelation;
};

type DetailRow = SurveyRow & {
  question_rows: QuestionRow[];
  questions_total: CountRelation;
};

function relationCount(relation: CountRelation): number {
  return Number(relation[0]?.count ?? 0);
}

function requireId(id: string): void {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    throw appError("NOT_FOUND");
  }
}

export function listSurveys(): Promise<SurveySummary[]> {
  return safe(async () => {
    await guard();
    const rows = await allPages<SurveyRow>((from, to) =>
      client()
        .from("surveys")
        .select(
          "id,title,description,status,public_slug,created_at,updated_at,responses(count)",
        )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    );
    return rows.map(({ responses, ...survey }) => ({
      ...survey,
      response_count: relationCount(responses),
    }));
  });
}

export function getSurvey(id: string): Promise<SurveyDetail> {
  return safe(async () => {
    requireId(id);
    await guard();
    const { data, error } = await client()
      .from("surveys")
      .select(
        "id,title,description,status,public_slug,created_at,updated_at,responses(count),questions_total:questions(count),question_rows:questions(id,survey_id,question_text,question_type,position,choices_total:choices(count),choice_rows:choices(id,question_id,choice_text,position))",
      )
      .eq("id", id)
      .order("position", { referencedTable: "question_rows" })
      .order("id", { referencedTable: "question_rows" })
      .order("position", { referencedTable: "question_rows.choice_rows" })
      .order("id", { referencedTable: "question_rows.choice_rows" })
      .maybeSingle();
    if (error) throw error;
    if (!data) throw appError("NOT_FOUND");

    const {
      responses,
      questions_total,
      question_rows: embedded,
      ...survey
    } = data as DetailRow;
    // PostgREST may cap embedded rows; fetch all pages only when a count reveals truncation.
    const questions =
      embedded.length < relationCount(questions_total)
        ? await allPages<QuestionRow>((from, to) =>
            client()
              .from("questions")
              .select(
                "id,survey_id,question_text,question_type,position,choices_total:choices(count),choice_rows:choices(id,question_id,choice_text,position)",
              )
              .eq("survey_id", id)
              .order("position")
              .order("id")
              .order("position", { referencedTable: "choice_rows" })
              .order("id", { referencedTable: "choice_rows" })
              .range(from, to),
          )
        : embedded;
    const complete = await Promise.all(
      questions.map(
        async ({ choices_total, choice_rows: choices, ...question }) => ({
          ...question,
          choices:
            choices.length < relationCount(choices_total)
              ? await allPages<Choice>((from, to) =>
                  client()
                    .from("choices")
                    .select("id,question_id,choice_text,position")
                    .eq("question_id", question.id)
                    .order("position")
                    .order("id")
                    .range(from, to),
                )
              : choices,
        }),
      ),
    );
    return {
      ...survey,
      response_count: relationCount(responses),
      questions: complete,
    } as SurveyDetail;
  });
}

function instructorRpc<T>(
  name: string,
  id: string | null,
  args: Record<string, unknown>,
): Promise<T> {
  return safe(async () => {
    if (id !== null) requireId(id);
    return rpc<T>(name, args);
  });
}

export const saveDraft = (id: string | null, draft: DraftInput) =>
  instructorRpc<{ survey_id: string }>("save_draft", id, {
    p_survey_id: id,
    p_draft: draft,
  });

export const duplicateSurvey = (id: string) =>
  instructorRpc<{ survey_id: string }>("duplicate_survey", id, {
    p_survey_id: id,
  });

export const activateSurvey = (id: string) =>
  instructorRpc<{ id: string; status: "active"; public_slug: string }>(
    "activate_survey",
    id,
    { p_survey_id: id },
  );

export const closeSurvey = (id: string) =>
  instructorRpc<{ id: string; status: "closed" }>("close_survey", id, {
    p_survey_id: id,
  });

export const archiveSurvey = (id: string) =>
  instructorRpc<{ id: string; status: "archived" }>("archive_survey", id, {
    p_survey_id: id,
  });

export const deleteSurvey = (id: string) =>
  instructorRpc<{ id: string }>("delete_survey", id, { p_survey_id: id });

export const getPublicSurvey = (slug: string) =>
  rpc<PublicSurveyResult>("get_public_survey", { p_slug: slug });

export const submitSurveyResponse = (
  surveyId: string,
  anonymousToken: string,
  answers: AnswerInput[],
) =>
  rpc<{ success: true; response_id: string }>("submit_survey_response", {
    p_survey_id: surveyId,
    p_anonymous_token: anonymousToken,
    p_answers: answers,
  });

export const getSurveyResults = (id: string) =>
  instructorRpc<SurveyResults>("get_survey_results", id, { p_survey_id: id });

export const getSurveyExport = (id: string) =>
  instructorRpc<ExportData>("get_survey_export", id, { p_survey_id: id });

export const getResponseCount = (id: string) =>
  safe(async () => {
    requireId(id);
    await guard();
    return count(id);
  });
