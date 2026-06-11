import mongoose from "mongoose";

const baseOptions = { timestamps: true };

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    full_name: String,
    password_hash: { type: String, select: false },
    plan: { type: String, default: "free" },
    minutes_balance: { type: Number, default: 0 },
    credits_balance: { type: Number, default: 0 },
    role: {
      type: String,
      enum: ["member", "org_admin", "system_admin"],
      default: "member",
      index: true,
    },
    status: {
      type: String,
      enum: ["invited", "active", "disabled"],
      default: "active",
      index: true,
    },
    google_id: { type: String, sparse: true, index: true },
    apple_id: { type: String, sparse: true, index: true },
    last_active_at: Date,
    profile_photo_url: String,
    profile_photo_file_id: String,
    bio: { type: String, maxlength: 500 },
    phone: { type: String, maxlength: 32 },
    location: { type: String, maxlength: 120 },
    job_title: { type: String, maxlength: 120 },
  },
  baseOptions
);

const DeploymentSettingsSchema = new mongoose.Schema(
  {
    singleton_key: { type: String, default: "default", unique: true },
    app_name: { type: String, default: "Silo" },
    logo_url: String,
    favicon_url: String,
    primary_color: { type: String, default: "#6366F1" },
    accent_color: { type: String, default: "#A855F7" },
    support_email: String,
    default_locale: { type: String, default: "en" },
    email_from_name: { type: String, default: "Silo" },
  },
  baseOptions
);

const InviteSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: ["member", "org_admin", "system_admin"],
      default: "member",
    },
    token_hash: { type: String, required: true },
    token_lookup: { type: String, index: true },
    expires_at: { type: Date, required: true, index: true },
    invited_by: { type: String, required: true },
    accepted_at: Date,
    revoked_at: Date,
  },
  baseOptions
);

const EmailLogSchema = new mongoose.Schema(
  {
    to: { type: String, required: true, index: true },
    template: { type: String, required: true, index: true },
    subject: String,
    status: { type: String, enum: ["sent", "failed"], required: true },
    provider_id: String,
    error: String,
    sent_at: Date,
  },
  baseOptions
);

const AISettingsSchema = new mongoose.Schema(
  {
    setting_key: { type: String, default: "global", unique: true },
    llm_providers: { type: [mongoose.Schema.Types.Mixed], default: [] },
    live_transcription: { type: Object, default: {} },
    chunk_processing: { type: Object, default: {} },
    ai_analysis: { type: Object, default: {} },
    full_retranscription: { type: Object, default: {} },
    video_url_processing: { type: Object, default: {} },
    audio_upload_processing: { type: Object, default: {} },
    image_processing: { type: Object, default: {} },
    text_processing: { type: Object, default: {} },
    org_usage_limits: { type: Object, default: {} },
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
    audio_file_id: String,
    audio_mime_type: String,
    video_url: String,
    source: String,
    processing_status: { type: String, default: "pending", index: true },
    transcription_provider: String,
    assemblyai_job_id: { type: String, index: true },
    transcript_language: String,
    is_multilingual: { type: Boolean, default: false },
    transcription_error: String,
    tags: [String],
    summary_text: String,
    action_items: { type: [mongoose.Schema.Types.Mixed], default: [] },
    manual_notes: [String],
    parent_session_id: { type: String, index: true },
    is_subsession: { type: Boolean, default: false },
    is_flagged: { type: Boolean, default: false },
    folder: String,
    created_date: { type: Date, default: Date.now },
    storage_tier: { type: String, enum: ["hot", "cold", "archived"], default: "hot" },
    source_classification: String,
    processed_at: Date
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

const PlanSubscriptionSchema = new mongoose.Schema(
  {
    user_email: { type: String, required: true, index: true },
    plan: { type: String, default: "free" },
    status: { type: String, default: "active" },
    monthly_minutes_used: { type: Number, default: 0 }
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

const WorkspaceMemberSchema = new mongoose.Schema(
  {
    workspace_id: { type: String, required: true, index: true },
    user_email: { type: String, required: true, index: true },
    role: { type: String, enum: ["owner", "member"], default: "member" },
    status: { type: String, enum: ["active", "invited"], default: "active" }
  },
  baseOptions
);

const SharedSessionSchema = new mongoose.Schema(
  {
    session_id: { type: String, required: true, index: true },
    workspace_id: { type: String, required: true, index: true },
    permission: { type: String, enum: ["view", "edit"], default: "view" },
    shared_by_email: { type: String, required: true },
    shared_at: { type: Date, default: Date.now }
  },
  baseOptions
);

const PublicSessionShareSchema = new mongoose.Schema(
  {
    session_id: { type: String, required: true, index: true },
    share_token: { type: String, required: true, unique: true, index: true },
    expiration_date: Date,
    access_count: { type: Number, default: 0 }
  },
  baseOptions
);

const StudyRecordSchema = new mongoose.Schema(
  {
    user_email: { type: String, required: true, index: true },
    session_id: { type: String, index: true },
    topic: String,
    answer: String,
    spaced_rep_score: { type: Number, default: 0 },
    next_review_date: Date,
    review_count: { type: Number, default: 0 }
  },
  baseOptions
);

const KeywordSchema = new mongoose.Schema(
  {
    workspace_id: { type: String, required: true, index: true },
    keyword: { type: String, required: true },
    search_volume: Number,
    difficulty: Number,
    status: { type: String, default: "pending" }
  },
  baseOptions
);

const GoogleIntegrationSchema = new mongoose.Schema(
  {
    user_email: { type: String, required: true, unique: true, index: true },
    google_user_id: { type: String, index: true },
    google_email: String,
    access_token: { type: String, select: false },
    refresh_token: { type: String, select: false },
    token_type: String,
    scope: String,
    expires_at: Date,
    connected_at: { type: Date, default: Date.now },
    last_refreshed_at: Date,
    last_sync_at: Date,
    revoked_at: Date,
  },
  baseOptions
);

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
export const DeploymentSettings =
  mongoose.models.DeploymentSettings || mongoose.model("DeploymentSettings", DeploymentSettingsSchema);
export const Invite = mongoose.models.Invite || mongoose.model("Invite", InviteSchema);
export const AISettings = mongoose.models.AISettings || mongoose.model("AISettings", AISettingsSchema);
export const EmailLog = mongoose.models.EmailLog || mongoose.model("EmailLog", EmailLogSchema);
export const Session = mongoose.models.Session || mongoose.model("Session", SessionSchema);
export const Workspace = mongoose.models.Workspace || mongoose.model("Workspace", WorkspaceSchema);
export const CreditLedger = mongoose.models.CreditLedger || mongoose.model("CreditLedger", CreditLedgerSchema);
export const PlanSubscription =
  mongoose.models.PlanSubscription || mongoose.model("PlanSubscription", PlanSubscriptionSchema);
export const Job = mongoose.models.Job || mongoose.model("Job", JobSchema);
export const WorkspaceMember = mongoose.models.WorkspaceMember || mongoose.model("WorkspaceMember", WorkspaceMemberSchema);
export const SharedSession = mongoose.models.SharedSession || mongoose.model("SharedSession", SharedSessionSchema);
export const PublicSessionShare = mongoose.models.PublicSessionShare || mongoose.model("PublicSessionShare", PublicSessionShareSchema);
export const StudyRecord = mongoose.models.StudyRecord || mongoose.model("StudyRecord", StudyRecordSchema);
export const Keyword = mongoose.models.Keyword || mongoose.model("Keyword", KeywordSchema);
export const GoogleIntegration =
  mongoose.models.GoogleIntegration || mongoose.model("GoogleIntegration", GoogleIntegrationSchema);

const MicrosoftIntegrationSchema = new mongoose.Schema(
  {
    user_email: { type: String, required: true, unique: true, index: true },
    ms_user_id: { type: String, index: true },
    ms_email: String,
    ms_display_name: String,
    tenant: String,
    access_token: { type: String, select: false },
    refresh_token: { type: String, select: false },
    token_type: String,
    scope: String,
    expires_at: Date,
    connected_at: { type: Date, default: Date.now },
    last_refreshed_at: Date,
    last_sync_at: Date,
    revoked_at: Date,
  },
  baseOptions
);

export const MicrosoftIntegration =
  mongoose.models.MicrosoftIntegration ||
  mongoose.model("MicrosoftIntegration", MicrosoftIntegrationSchema);

export const entityModels = {
  User,
  Session,
  Workspace,
  CreditLedger,
  PlanSubscription,
  WorkspaceMember,
  SharedSession,
  PublicSessionShare,
  StudyRecord,
  Keyword,
  AISettings,
  DeploymentSettings,
  Invite,
};
