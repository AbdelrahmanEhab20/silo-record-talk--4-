import React from "react";
import { Link } from "react-router-dom";
import { Ear, ArrowLeft } from "lucide-react";

const Section = ({ number, title, children }) => (
  <div className="mb-8">
    <h2 className="text-lg font-bold text-white mb-3">{number}. {title}</h2>
    <div className="text-[#A1A1A6] text-sm leading-relaxed space-y-2">{children}</div>
  </div>
);

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-lg mx-auto px-5 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#A1A1A6]" />
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #A855F7, #6366F1, #22D3EE)" }}
            >
              <Ear className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">SILO AI Notes</h1>
              <p className="text-xs text-[#A1A1A6]">Privacy Policy</p>
            </div>
          </div>
        </div>

        <div className="mb-8 pb-6 border-b border-white/10">
          <h1 className="text-2xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-xs text-[#A1A1A6]">Last Updated: April 16, 2026 · Effective Date: April 16, 2026</p>
        </div>

        <Section number="1" title="Introduction">
          <p>SILO AI Notes ("SILO", "we", "our", or "us") is an AI-powered note-taking application designed to record, transcribe, analyze, and structure conversations into actionable insights.</p>
          <p>This Privacy Policy explains how we collect, use, store, and protect your data, including any Google user data, when you use our services via our website or application.</p>
          <p>By using SILO, you agree to the practices described in this Privacy Policy.</p>
        </Section>

        <Section number="2" title="Information We Collect">
          <p className="font-semibold text-white/70">2.1 Information You Provide</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Name and email address (e.g., via Google Sign-In)</li>
            <li>Account credentials</li>
            <li>Uploaded or recorded audio files</li>
            <li>Notes, transcripts, and session data</li>
          </ul>
          <p className="font-semibold text-white/70 mt-3">2.2 Automatically Collected Data</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Device and browser information</li>
            <li>Usage data (sessions, duration, interactions)</li>
            <li>Log data (IP address, timestamps)</li>
          </ul>
          <p className="font-semibold text-white/70 mt-3">2.3 Google User Data</p>
          <p>If you sign in using Google or grant access via Google OAuth, we may access:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Basic profile information (name, email)</li>
            <li>Google account identifier</li>
          </ul>
          <p>We only request the minimum necessary scopes to provide authentication and related functionality.</p>
        </Section>

        <Section number="3" title="How We Use Your Data">
          <p>We use your data strictly to provide and improve SILO's functionality, including:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Processing audio into transcripts</li>
            <li>Generating summaries, insights, and structured notes</li>
            <li>Providing export formats (PDF, DOCX, PPTX, etc.)</li>
            <li>Managing your account and usage</li>
            <li>Improving product performance and reliability</li>
          </ul>
        </Section>

        <Section number="4" title="Use of Google User Data">
          <p>We use Google user data only for the following purposes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Authentication (sign-in and account management)</li>
            <li>Associating your account with SILO services</li>
          </ul>
          <p className="mt-2">We do <strong className="text-white">NOT</strong> use Google user data for:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Advertising or marketing purposes</li>
            <li>Selling to third parties</li>
            <li>Training AI models outside your direct usage</li>
            <li>Building user profiles or databases</li>
          </ul>
        </Section>

        <Section number="5" title="Data Sharing and Disclosure">
          <p>We do <strong className="text-white">NOT</strong> sell your data.</p>
          <p className="font-semibold text-white/70 mt-3">5.1 Service Providers</p>
          <p>We may share data with trusted third-party providers strictly to operate SILO, such as:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Cloud hosting providers</li>
            <li>AI processing services</li>
            <li>Infrastructure providers</li>
          </ul>
          <p>All providers are bound by confidentiality and data protection obligations.</p>
          <p className="font-semibold text-white/70 mt-3">5.2 Legal Requirements</p>
          <p>We may disclose data if required by law or to comply with legal obligations, protect rights and safety, or prevent fraud or misuse.</p>
        </Section>

        <Section number="6" title="Data Storage and Security">
          <p>We implement industry-standard security measures, including:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Encryption (in transit and at rest where applicable)</li>
            <li>Secure cloud infrastructure</li>
            <li>Access controls and authentication safeguards</li>
          </ul>
        </Section>

        <Section number="7" title="Data Retention">
          <p>We retain your data only as long as necessary to provide our services, comply with legal obligations, and resolve disputes.</p>
          <p className="font-semibold text-white/70 mt-3">Data Deletion</p>
          <p>You may request deletion of your data at any time by contacting us at <a href="mailto:info@gravitonventures.com" className="text-purple-400 underline">info@gravitonventures.com</a>. Your account and associated data will be deleted within a reasonable timeframe. Some data may be retained if required by law.</p>
        </Section>

        <Section number="8" title="Your Rights">
          <p>Depending on your location, you may have rights to access, correct, delete, or restrict processing of your data. Contact us at <a href="mailto:info@gravitonventures.com" className="text-purple-400 underline">info@gravitonventures.com</a> to exercise your rights.</p>
        </Section>

        <Section number="9" title="Third-Party Services">
          <p>SILO integrates with third-party services (e.g., cloud providers, AI services). These providers process data only on our behalf and in accordance with this policy.</p>
        </Section>

        <Section number="10" title="Advertising">
          <p>SILO may display limited advertisements to free users. Ads are non-personalized where possible. We do not use Google user data for advertising. Users may upgrade to remove ads.</p>
        </Section>

        <Section number="11" title="Children's Privacy">
          <p>SILO is not intended for users under the age of 13 (or applicable minimum age in your jurisdiction). We do not knowingly collect data from children.</p>
        </Section>

        <Section number="12" title="Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. If we make significant changes, we will notify users within the app or via email and update the "Last Updated" date.</p>
        </Section>

        <Section number="13" title="Contact Information">
          <p>For any questions regarding this Privacy Policy:</p>
          <div className="mt-2 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <p className="font-semibold text-white">SILO AI Notes</p>
            <p>📧 <a href="mailto:info@gravitonventures.com" className="text-purple-400 underline">info@gravitonventures.com</a></p>
            <p>🌐 <a href="https://www.siloainotes.com" className="text-purple-400 underline">www.siloainotes.com</a></p>
          </div>
        </Section>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-white/10 text-center space-y-3">
          <div className="flex justify-center gap-6 text-xs text-[#A1A1A6]">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
          <p className="text-xs text-[#636366]">© 2026 SILO AI Notes. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}