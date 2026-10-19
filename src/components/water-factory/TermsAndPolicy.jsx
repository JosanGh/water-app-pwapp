import React from "react";
import { ArrowLeft, FileText } from "lucide-react";

const policySections = [
  {
    title: "1. Who this policy applies to",
    paragraphs: [
      "These terms explain the use of this business operations application (the “Service”) by a company workspace and its invited users. The company shown above is the workspace you are currently using. Your employer or the business that invited you may have additional workplace rules that also apply.",
      "The company that creates a workspace is responsible for its organization details, invitations, member roles, and business records. If you use the Service as an employee, contractor, or driver, use it only as authorized by that company.",
    ],
  },
  {
    title: "2. Accounts, invitations, and account security",
    paragraphs: [
      "A cloud account is required for first-time registration and online sign-in. Keep your account password private, use a unique password, secure your device, and sign out on shared devices when appropriate. Do not share an account or let another person act as you.",
      "Workspace invitations are intended for the invited email address and may expire. Workspace owners should promptly remove access for people who no longer need it and review roles regularly. Contact your workspace owner or administrator if you suspect an account has been used without permission.",
    ],
  },
  {
    title: "3. Roles and workspace access",
    paragraphs: [
      "The application presents different areas according to a member’s role, such as owner, manager, cashier, or driver. Owners and administrators should assign the least access needed for each person’s work. Role-based screens are not a promise that every individual field or record has a separate permission rule. Members with access to a company workspace may be able to see or change shared company records.",
      "Cloud records are associated with a company workspace and product. Server-side membership policies are intended to prevent one company’s members from accessing another company’s workspace. Do not treat a device, hidden screen, or local role label as a substitute for server-side access control.",
    ],
  },
  {
    title: "4. Information handled by the Service",
    paragraphs: [
      "Depending on how your company uses the Service, information can include account email and profile details; company name and membership role; production, stock, packaging, sales, payments, deposits, expenses, delivery, customer, staff, and audit information; and records entered by other authorized members.",
      "The Service uses this information to authenticate users, show the company workspace, record business activity, maintain local working copies, and synchronize authorized changes with the configured cloud service. Do not enter sensitive personal information unless your company has a legitimate business need and is permitted to do so.",
    ],
  },
  {
    title: "5. Local storage and offline access",
    paragraphs: [
      "The application keeps a working copy in browser storage so it can load and support work during connectivity interruptions. While signed in, some local working data may be readable by someone who can access your unlocked browser profile or device. Protect the device, use its screen lock, and avoid shared or public devices for sensitive company records.",
      "If enabled by a signed-in user, offline access protects a snapshot with encryption using a key derived from a device PIN. New PINs are six letters and/or numbers; obvious repeated or sequential patterns are rejected. Older devices may still accept an existing 8–12 digit PIN. The account password is not saved as the offline PIN, and this feature does not use device biometrics or a passkey.",
      "Offline unlock is local access to the saved copy, not a cloud sign-in. New offline edits stay on that device until you sign in to the same account online. When cloud and device revisions differ, synchronization may be blocked and the local copy retained for reconciliation. First-time registration and sign-in require internet access. Clearing browser/site data, losing the device, or forgetting the PIN can make unsynchronized information unrecoverable. Keep appropriate independent business records.",
    ],
  },
  {
    title: "6. Synchronization, accuracy, and records",
    paragraphs: [
      "When online, the application attempts to synchronize changes with the configured cloud database. A “synced” status means the cloud service acknowledged a write; it does not verify that the entry is complete, legally compliant, or correct. Review important entries, totals, and reports. Correct mistakes promptly using your company’s procedures.",
      "Do not assume a record is backed up until the interface confirms synchronization. Do not overwrite a sync conflict by deleting local data unless the company has reviewed and preserved any needed entries. The Service currently stores operational records in a company/product data document; this design is not a guarantee of capacity for any particular number of users or companies.",
    ],
  },
  {
    title: "7. Providers, security, and service availability",
    paragraphs: [
      "The deployed Service uses database for configured authentication and cloud data functions and uses the hosting provider selected for that deployment to deliver the application. Those providers may process technical information needed to operate their services under their own terms and privacy documentation. The business deploying the Service should identify its actual providers and publish any required privacy notices.",
      "Reasonable technical safeguards include authenticated access, company membership checks, and encrypted PIN-protected offline snapshots when that feature is enabled. No internet-connected service, browser, or local device can be guaranteed to be secure, uninterrupted, error-free, or immune to unauthorized access. The PIN does not encrypt every browser cache while the user is signed in. Keep devices and browsers updated and report suspected incidents promptly.",
    ],
  },
  {
    title: "8. Acceptable use",
    paragraphs: [
      "Use the Service only for lawful, authorized company work. Do not attempt to access another company’s data, bypass access controls, disrupt the Service, upload malicious code, misuse another person’s account, or enter information you are not authorized to handle. Do not use the Service as the only record or backup for critical financial, safety, or regulatory obligations.",
    ],
  },
  {
    title: "9. Company responsibilities and data requests",
    paragraphs: [
      "The company is responsible for deciding what information to enter, who may access it, how long it should be retained, and whether its use meets applicable privacy, employment, accounting, and recordkeeping requirements. Users should send access, correction, export, or deletion requests to their company owner or administrator.",
      "The available controls and retention of cloud backups depend on the specific deployment and its provider configuration. Do not assume that deleting a local copy deletes cloud records or provider backups. The company should contact its service operator for help with cloud data requests and confirm completion.",
    ],
  },
  {
    title: "10. Changes and contact",
    paragraphs: [
      "This notice may be updated as the Service changes. Check the “Last updated” date below. For questions, account access, data corrections, suspected security incidents, or privacy requests, contact your company owner or administrator, who can escalate the request to the person operating the deployment.",
      "This in-app notice describes current product behavior and is not a substitute for a complete, jurisdiction-specific contract or privacy notice. The deployment owner should add its legal business identity, contact details, governing law, and any required local disclosures before offering the Service publicly.",
    ],
  },
];

export function TermsAndPolicy({
  onBack,
  standalone = false,
  companyName = "Company",
}) {
  return (
    <div className={standalone ? "min-h-screen bg-[#F2F4EF] p-4 sm:p-8" : "space-y-6"}>
      <div className={standalone ? "max-w-3xl mx-auto" : "max-w-3xl"}>
        <div className="flex items-center gap-3 mb-6">
          {onBack && (
            <button type="button" onClick={onBack} aria-label="Back" className="w-9 h-9 rounded-lg border border-[#DDE3DA] bg-white flex items-center justify-center text-[#0B3B45]">
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="w-10 h-10 rounded-lg bg-[#DCEEE4] flex items-center justify-center">
            <FileText size={20} className="text-[#0B3B45]" />
          </div>
          <div>
            <h1 className="font-display font-800 text-2xl text-[#0B3B45]">Terms & Policy</h1>
            <p className="text-xs text-[#5B6B68]">{companyName} · Last updated October 2026</p>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-7 rounded-2xl border border-[#DDE3DA] space-y-6 text-sm leading-relaxed text-[#344542]">
          {policySections.map((section) => (
            <section key={section.title}>
              <h2 className="font-bold text-[#0B3B45] text-base mb-2">
                {section.title}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mb-2 last:mb-0">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
