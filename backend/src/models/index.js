import mongoose from "mongoose";

const baseOptions = { timestamps: true };

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    full_name: String,
    plan: { type: String, default: "free" },
    minutes_balance: { type: Number, default: 0 },
    credits_balance: { type: Number, default: 0 }
  },
  baseOptions
);

const SessionSchema = new mongoose.Schema(
  {
    user_email: { type: String, required: true, index: true },
    title: String,
    duration: { type: Number, default: 0 },
    transcript_text: String,
    transcript_file_url: String,
    audio_file_url: String,
    video_url: String,
    source: String,
    processing_status: { type: String, default: "pending", index: true },
    tags: [String],
    summary_text: String,
    manual_notes: [String]
  },
  baseOptions
);

const WorkspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    owner_email: { type: String, required: true, index: true },
    member_emails: [String]
  },
  baseOptions
);

const CreditLedgerSchema = new mongoose.Schema(
  {
    user_email: { type: String, required: true, index: true },
    type: { type: String, enum: ["minutes", "credits"], required: true },
    delta: { type: Number, required: true },
    reason: String,
    session_id: String,
    charge_key: { type: String, index: true }
  },
  baseOptions
);

const JobSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, index: true },
    payload: { type: Object, default: {} },
    status: { type: String, enum: ["queued", "running", "done", "failed"], default: "queued", index: true },
    error: String
  },
  baseOptions
);

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
export const Session = mongoose.models.Session || mongoose.model("Session", SessionSchema);
export const Workspace = mongoose.models.Workspace || mongoose.model("Workspace", WorkspaceSchema);
export const CreditLedger = mongoose.models.CreditLedger || mongoose.model("CreditLedger", CreditLedgerSchema);
export const Job = mongoose.models.Job || mongoose.model("Job", JobSchema);

export const entityModels = {
  User,
  Session,
  Workspace,
  CreditLedger
};
