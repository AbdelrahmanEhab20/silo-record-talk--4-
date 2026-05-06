import React from "react";
import { Link } from "react-router-dom";
import { Ear, ArrowLeft } from "lucide-react";

const Section = ({ number, title, children }) => (
  <div className="mb-8">
    <h2 className="text-lg font-bold text-white mb-3">{number}. {title}</h2>
    <div className="text-[#A1A1A6] text-sm leading-relaxed space-y-2">{children}</div>
  </div>
);

export default function TermsOfService() {
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
              <p className="text-xs text-[#A1A1A6]">Terms of Service</p>
            </div>
          </div>
        </div>

        <div className="mb-8 pb-6 border-b border-white/10">
          <h1 className="text-2xl font-bold mb-2">Terms of Service</h1>
          <p className="text-xs text-[#A1A1A6]">Last Updated: April 16, 2026 · Effective Date: April 16, 2026</p>
        </div>

        <Section number="1" title="Acceptance of Terms">
          <p>These Terms of Service ("Terms") govern your access to and use of SILO AI Notes ("SILO", "we", "our", or "us"), including our website, applications, and related services (collectively, the "Service").</p>
          <p>By accessing or using SILO, you agree to be legally bound by these Terms and our <Link to="/privacy" className="text-purple-400 underline">Privacy Policy</Link>. If you do not agree, you must discontinue use immediately.</p>
        </Section>

        <Section number="2" title="Description of Service">
          <p>SILO is an AI-powered platform that enables users to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Record, upload, and store audio content</li>
            <li>Convert speech to text (transcription)</li>
            <li>Analyze and structure conversations</li>
            <li>Generate summaries, action items, and insights</li>
            <li>Export content into structured formats (e.g., PDF, DOCX, PPTX)</li>
          </ul>
          <p>SILO may evolve over time, and we reserve the right to add, modify, or discontinue features at our discretion.</p>
        </Section>

        <Section number="3" title="Eligibility and Account Registration">
          <p className="font-semibold text-white/70">3.1 Eligibility</p>
          <p>You must be at least 13 years old or the legal age in your jurisdiction and have the authority to enter into a binding agreement.</p>
          <p className="font-semibold text-white/70 mt-3">3.2 Account Registration</p>
          <p>To access certain features, you must create an account. You agree to provide accurate, current, and complete information, maintain the confidentiality of your login credentials, and notify us immediately of unauthorized access. You are solely responsible for all activities conducted under your account.</p>
        </Section>

        <Section number="4" title="Acceptable Use">
          <p>You agree to use SILO only for lawful purposes. You must <strong className="text-white">NOT</strong>:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Upload or process content without proper consent</li>
            <li>Record individuals without legal authorization (where required)</li>
            <li>Use the Service for illegal, harmful, or abusive activities</li>
            <li>Attempt to hack, disrupt, or interfere with the platform</li>
            <li>Reverse engineer, scrape, or extract data from SILO systems</li>
          </ul>
        </Section>

        <Section number="5" title="User Content and Rights">
          <p className="font-semibold text-white/70">5.1 Ownership</p>
          <p>You retain full ownership of all content you submit, including audio recordings, transcripts, notes, and outputs.</p>
          <p className="font-semibold text-white/70 mt-3">5.2 License to SILO</p>
          <p>You grant SILO a limited, non-exclusive, worldwide license to process, store, analyze, and generate AI outputs from your content solely to operate and improve the Service.</p>
          <p className="font-semibold text-white/70 mt-3">5.3 Responsibility</p>
          <p>You are responsible for ensuring you have rights to all uploaded content and comply with applicable recording and privacy laws.</p>
        </Section>

        <Section number="6" title="AI Services and Limitations">
          <p>SILO uses artificial intelligence to generate outputs. You acknowledge and agree that:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>AI-generated outputs may contain inaccuracies or omissions</li>
            <li>Outputs should not be relied upon as legal, financial, or professional advice</li>
            <li>SILO does not guarantee correctness, completeness, or reliability</li>
          </ul>
          <p>You assume full responsibility for how outputs are used.</p>
        </Section>

        <Section number="7" title="Usage Limits and Plans">
          <p className="font-semibold text-white/70">7.1 Free Plan</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Includes limited daily usage (e.g., minutes per day)</li>
            <li>May include advertisements</li>
            <li>Additional usage may be unlocked via optional ad engagement</li>
          </ul>
          <p className="font-semibold text-white/70 mt-3">7.2 Pro Subscription</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provides expanded monthly usage</li>
            <li>Removes advertisements</li>
            <li>Unlocks advanced features</li>
          </ul>
          <p className="font-semibold text-white/70 mt-3">7.3 Fair Usage Policy</p>
          <p>We reserve the right to apply reasonable limits to prevent abuse, including excessive usage beyond intended scope or automated/non-human usage.</p>
        </Section>

        <Section number="8" title="Payments and Billing">
          <p className="font-semibold text-white/70">8.1 Subscription Billing</p>
          <p>Subscriptions are billed in advance on a recurring basis. Pricing may be updated with prior notice.</p>
          <p className="font-semibold text-white/70 mt-3">8.2 Payment Processing</p>
          <p>Payments are handled by third-party providers (e.g., Stripe). We do not store full payment details.</p>
          <p className="font-semibold text-white/70 mt-3">8.3 Cancellation</p>
          <p>You may cancel your subscription at any time. Access continues until the end of the billing cycle.</p>
          <p className="font-semibold text-white/70 mt-3">8.4 Refunds</p>
          <p>Payments are non-refundable unless required by law.</p>
        </Section>

        <Section number="9" title="Advertising">
          <p>SILO may display advertisements to free users. Ads are designed to be non-intrusive, and some features may be unlocked through user-initiated ad viewing. Pro users will not see ads. We do not use personal data for prohibited advertising practices.</p>
        </Section>

        <Section number="10" title="Enterprise Services">
          <p>Enterprise users may receive white-label deployments, on-premise or private cloud hosting, advanced integrations and APIs, and dedicated support. Enterprise engagements may be governed by separate agreements.</p>
        </Section>

        <Section number="11" title="Data Privacy and Security">
          <p>Your data is handled in accordance with our <Link to="/privacy" className="text-purple-400 underline">Privacy Policy</Link>. We implement reasonable technical and organizational measures to protect user data.</p>
        </Section>

        <Section number="12" title="Service Availability and Modifications">
          <p>We aim to provide reliable service but do not guarantee uninterrupted availability or error-free performance. We may modify or discontinue features, perform maintenance, or restrict access temporarily.</p>
        </Section>

        <Section number="13" title="Intellectual Property">
          <p>All intellectual property related to SILO — including software, design, branding, and algorithms — is owned by SILO or its licensors. You may not copy, modify, distribute, or reverse engineer any part of the Service without permission.</p>
        </Section>

        <Section number="14" title="Limitation of Liability">
          <p>To the maximum extent permitted by law, SILO shall not be liable for indirect or consequential damages, loss of data, revenue, or profits, reliance on AI-generated content, or service interruptions.</p>
        </Section>

        <Section number="15" title="Disclaimer of Warranties">
          <p>The Service is provided "as is" and "as available". We make no warranties regarding accuracy, reliability, availability, or fitness for a particular purpose.</p>
        </Section>

        <Section number="16" title="Indemnification">
          <p>You agree to indemnify and hold harmless SILO from any claims, damages, or liabilities arising from your use of the Service, your content, or your violation of these Terms.</p>
        </Section>

        <Section number="17" title="Termination">
          <p>We may suspend or terminate your account if you violate these Terms, misuse the Service, or pose a risk to the platform or users. You may terminate your use at any time.</p>
        </Section>

        <Section number="18" title="Changes to Terms">
          <p>We may update these Terms periodically. If changes are material, we will notify users and continued use constitutes acceptance.</p>
        </Section>

        <Section number="19" title="Governing Law and Jurisdiction">
          <p>These Terms are governed by the laws of the <strong className="text-white">United Arab Emirates</strong>. Any disputes shall be subject to the jurisdiction of UAE courts.</p>
        </Section>

        <Section number="20" title="Contact Information">
          <p>For any questions regarding these Terms:</p>
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
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          </div>
          <p className="text-xs text-[#636366]">© 2026 SILO AI Notes. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}