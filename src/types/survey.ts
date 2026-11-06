// Shared wire-format types used by the survey API and pages.
export type SurveyStatus = "draft" | "active" | "closed" | "archived";

export type QuestionType = "multiple_choice" | "true_false";

export interface SurveySummary {
  id: string;
  title: string;
  description: string | null;
  status: SurveyStatus;
  public_slug: string | null;
  created_at: string;
  updated_at: string;
  response_count: number;
}

export interface Choice {
  id: string;
  question_id: string;
  choice_text: string;
  position: number;
}

export interface Question {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: QuestionType;
  position: number;
  choices: Choice[];
}

export interface SurveyDetail extends SurveySummary {
  questions: Question[];
}

export interface DraftQuestionInput {
  question_text: string;
  question_type: QuestionType;
  choices: string[];
}

export interface DraftInput {
  title: string;
  description: string | null;
  questions: DraftQuestionInput[];
}

export interface AnswerInput {
  question_id: string;
  choice_id: string;
}

export interface PublicSurvey {
  id: string;
  title: string;
  description: string | null;
  questions: Question[];
}

export type PublicSurveyResult =
  | { status: "active"; survey: PublicSurvey }
  | { status: "closed"; title: string }
  | { status: "not_found" };

export interface SurveyResults {
  survey_id: string;
  title: string;
  response_count: number;
  questions: {
    question_id: string;
    question_text: string;
    response_count: number;
    choices: {
      choice_id: string;
      choice_text: string;
      count: number;
      percentage: number;
    }[];
  }[];
}

export interface ExportData {
  survey_id: string;
  title: string;
  questions: { question_id: string; question_text: string }[];
  responses: {
    response_id: string;
    submitted_at: string;
    answers: { question_id: string; choice_text: string }[];
  }[];
}

export type AppErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "INVALID_STATE"
  | "SURVEY_NOT_ACTIVE"
  | "DUPLICATE_RESPONSE"
  | "INVALID_QUESTION"
  | "INVALID_CHOICE"
  | "MISSING_REQUIRED_ANSWER"
  | "NETWORK_ERROR"
  | "UNEXPECTED_ERROR";

export interface AppError {
  code: AppErrorCode;
  message: string;
}
