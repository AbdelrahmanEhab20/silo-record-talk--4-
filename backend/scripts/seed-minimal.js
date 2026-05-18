import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { config } from "../src/config/index.js";
import { User, Workspace, Session, CreditLedger } from "../src/models/index.js";
import { ensureDeploymentSettings } from "../src/services/deploymentSettings.js";

async function run() {
  await mongoose.connect(config.mongoUri);

  const seedEmail = (
    process.env.FIRST_SYSTEM_ADMIN_EMAIL ||
    process.env.SEED_USER_EMAIL ||
    "info@gravitonventures.com"
  )
    .trim()
    .toLowerCase();
  const seedName = process.env.SEED_USER_NAME || "System Administrator";
  const seedPassword = process.env.SEED_USER_PASSWORD || "Silo12345!";
  const workspaceName = process.env.SEED_WORKSPACE_NAME || "Silo Demo Workspace";
  const sessionTitle = process.env.SEED_SESSION_TITLE || "Kickoff Meeting Demo";
  const passwordHash = await bcrypt.hash(seedPassword, 12);

  await ensureDeploymentSettings();

  const user = await User.findOneAndUpdate(
    { email: seedEmail },
    {
      $set: {
        email: seedEmail,
        full_name: seedName,
        password_hash: passwordHash,
        plan: "pro",
        role: "system_admin",
        status: "active",
      },
      $setOnInsert: {
        minutes_balance: 300,
        credits_balance: 200,
      },
    },
    { returnDocument: "after", upsert: true }
  );

  const workspace = await Workspace.findOneAndUpdate(
    { owner_email: seedEmail, name: workspaceName },
    {
      $set: {
        owner_email: seedEmail,
        name: workspaceName,
        member_emails: [seedEmail],
      },
    },
    { returnDocument: "after", upsert: true }
  );

  const session = await Session.findOneAndUpdate(
    { user_email: seedEmail, title: sessionTitle },
    {
      $set: {
        user_email: seedEmail,
        title: sessionTitle,
        duration: 1860,
        source: "recording",
        processing_status: "done",
        tags: ["kickoff", "alignment", "next-steps"],
        summary_text: "Team kickoff completed. Scope, milestones, and owners confirmed.",
        manual_notes: ["Define sprint goals", "Prepare onboarding checklist"],
        transcript_text:
          "[00:00] Welcome everyone.\n[04:12] We aligned on milestones.\n[12:30] Next steps and owners confirmed.",
      },
    },
    { returnDocument: "after", upsert: true }
  );

  await CreditLedger.findOneAndUpdate(
    { user_email: seedEmail, reason: "seed-initial-balance", type: "minutes" },
    {
      $set: {
        user_email: seedEmail,
        type: "minutes",
        delta: 300,
        reason: "seed-initial-balance",
      },
    },
    { upsert: true }
  );

  console.log("Seed complete", {
    userId: String(user._id),
    workspaceId: String(workspace._id),
    sessionId: String(session._id),
    email: seedEmail,
    role: user.role,
    password: seedPassword,
  });

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Seed failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
