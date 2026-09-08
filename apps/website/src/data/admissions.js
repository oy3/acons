export const admissionsConfig = {
  academicSession: "2026/2027",
  activeBatch: "Batch B",
};

export const requirements = [
  "West African Senior School Certificate Examination (WASSCE) with a minimum of five credits, including English, Mathematics, Biology, Chemistry and Physics",
  "Minimum age of 17 years at the time of admission",
  "Medical fitness certificate from a recognised medical practitioner",
  "Valid 2026 JAMB UTME score",
  "Character reference from a recognised religious or community leader",
];

export const admissionSteps = [
  {
    title: "Application submission",
    period: "March - September",
    description:
      "Complete and submit your application form with all required documents.",
    items: [
      "Completed application form",
      "WASSCE / NABTEB certificate",
      "Birth certificate",
      "Passport photographs",
      "Two reference letters",
    ],
  },
  {
    title: "Entrance examination",
    period: "May & September",
    description:
      "Only a valid 2026 JAMB UTME score is accepted for the ALECONS entrance examination.",
    items: [
      "Valid 2026 JAMB UTME score",
      "ALECONS entrance examination",
      "Minimum score requirements",
      "Examination fee payment",
    ],
  },
  {
    title: "Admission offer",
    period: "May & September",
    description:
      "Receive your admission offer and complete registration for the session.",
    items: [
      "Acceptance of offer",
      "Payment of fees",
      "Registration completion",
      "Orientation attendance",
    ],
  },
  {
    title: "Interview & screening",
    period: "May & October",
    description: "Attend the mandatory interview and document verification.",
    items: [
      "Original certificates",
      "Character references",
      "Interview attendance",
      "Document verification",
    ],
  },
];

export const admissionDates = [
  {
    label: "Application opens",
    batchA: "March 28, 2026",
    batchB: "July 15, 2026",
  },
  {
    label: "Application deadline",
    batchA: "April 30, 2026",
    batchB: "September 15, 2026",
  },
  {
    label: "Entrance examination",
    batchA: "May 6, 2026",
    batchB: "September 15, 2026",
  },
  {
    label: "Admission results",
    batchA: "May 13, 2026",
    batchB: "September 18, 2026",
  },
  {
    label: "Clearance period",
    batchA: "May 15-18, 2026",
    batchB: "October 19-23, 2026",
  },
  {
    label: "Course registration begins",
    batchA: "May 18, 2026",
    batchB: "October 19, 2026",
  },
  {
    label: "Orientation week",
    batchA: "May 19-22, 2026",
    batchB: "October 26-30, 2026",
  },
  {
    label: "Classes begin",
    batchA: "May 25, 2026",
    batchB: "November 2, 2026",
  },
];

export const fees = [
  { label: "Application fee", amount: "₦20,000" },
  { label: "Acceptance fee", amount: "₦50,000" },
  { label: "Sundry fees", amount: "₦280,000" },
  { label: "Tuition fee", amount: "₦350,000" },
  { label: "Accommodation fee", amount: "₦105,000" },
];

export const faqs = [
  {
    question: "Which programme is currently accepting applications?",
    answer:
      "Basic Nursing is currently accepting applications. Other listed programmes are marked as coming soon.",
  },
  {
    question: "Can I apply with a JAMB UTME score?",
    answer:
      "Only applicants with a valid JAMB UTME score may apply and sit for the ALECONS entrance examination.",
  },
  {
    question: "What documents must I submit?",
    answer:
      "Prepare your completed form, WASSCE or NABTEB certificate, birth certificate, passport photographs and two reference letters.",
  },
  {
    question: "Is accommodation available?",
    answer:
      "Accommodation is included in the published schedule of charges for the Nursing Programme.",
  },
  {
    question: "How do I check my application status?",
    answer:
      "Sign in to the Applicant Portal with the credentials created during your application.",
  },
];
