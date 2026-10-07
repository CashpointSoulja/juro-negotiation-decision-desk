import type { Playbook } from './types';

const LIABILITY_STD =
  "Each party's total aggregate liability arising out of or in connection with this Agreement shall not exceed 100% of the fees paid or payable in the twelve (12) months preceding the claim.";
const INDEMNITY_STD =
  'Each party shall indemnify the other against third-party claims that its materials infringe intellectual property rights, subject to the limitation of liability in clause 11.';
const JURISDICTION_STD =
  'This Agreement is governed by the laws of England and Wales, and the courts of England and Wales have exclusive jurisdiction.';

export const PLAYBOOKS: Playbook[] = [
  {
    id: 'fernbrook',
    name: 'Fernbrook Software',
    owner: 'Fernbrook legal (fictional)',
    version: 'v4',
    stance: 'Balanced SaaS seller',
    summary: 'Mid-market SaaS seller. Allows modest deviations with commercial counsel approval.',
    rules: [
      {
        id: 'FB-LC-01', version: 'v4', clause: 'liability_cap', title: 'Liability cap at 12 months of fees',
        guidance: 'Cap total liability at 1x the fees paid or payable in the prior 12 months. Never accept uncapped liability.',
        acceptableDeviation: 'Up to 2x annual fees with Commercial Counsel approval.',
        approver: 'Commercial Counsel', standardClause: LIABILITY_STD,
        terms: { kind: 'liability_cap', preferredMax: 1, acceptableMax: 2 },
      },
      {
        id: 'FB-IN-01', version: 'v4', clause: 'indemnity', title: 'Mutual, capped indemnities',
        guidance: 'Indemnities must be mutual and sit inside the liability cap. Only an IP infringement indemnity may sit outside the cap.',
        acceptableDeviation: 'An uncapped IP infringement indemnity, with Commercial Counsel approval.',
        approver: 'Commercial Counsel', standardClause: INDEMNITY_STD,
        terms: { kind: 'indemnity', requireMutual: true, uncapped: 'ip_with_approval' },
      },
      {
        id: 'FB-RN-01', version: 'v4', clause: 'renewal_notice', title: 'Auto-renewal with 60 days notice',
        guidance: 'Auto-renew for 12-month periods. Customer must give at least 60 days notice to stop renewal.',
        acceptableDeviation: 'Notice down to 30 days with Deal Desk approval.',
        approver: 'Deal Desk',
        standardClause: "This Agreement renews automatically for successive 12-month periods unless either party gives at least 60 days' written notice before the end of the current term.",
        terms: { kind: 'renewal_notice', preferredMinNoticeDays: 60, acceptableMinNoticeDays: 30, maxRenewalMonths: 12 },
      },
      {
        id: 'FB-JU-01', version: 'v4', clause: 'jurisdiction', title: 'English law',
        guidance: 'Governing law and courts of England and Wales.',
        acceptableDeviation: 'Ireland, Scotland or New York law with Commercial Counsel approval.',
        approver: 'Commercial Counsel', standardClause: JURISDICTION_STD,
        terms: { kind: 'jurisdiction', preferred: ['England and Wales'], acceptable: ['Ireland', 'Scotland', 'New York'] },
      },
    ],
  },
  {
    id: 'quayside',
    name: 'Quayside Payments',
    owner: 'Quayside legal ops (fictional)',
    version: 'v2',
    stance: 'Speed-first seller',
    summary: 'High-volume seller that optimises for close speed. Has no governing-law rule yet.',
    rules: [
      {
        id: 'QP-LC-01', version: 'v2', clause: 'liability_cap', title: 'Liability cap at 2x fees',
        guidance: 'Cap total liability at up to 2x annual fees. Never accept uncapped liability.',
        acceptableDeviation: 'Up to 3x annual fees with Legal Ops approval.',
        approver: 'Legal Ops',
        standardClause: "Each party's total aggregate liability shall not exceed 200% of the fees paid or payable in the twelve (12) months preceding the claim.",
        terms: { kind: 'liability_cap', preferredMax: 2, acceptableMax: 3 },
      },
      {
        id: 'QP-IN-01', version: 'v2', clause: 'indemnity', title: 'Capped indemnities',
        guidance: 'Indemnities may be one-way but must sit inside the cap, except IP infringement.',
        acceptableDeviation: 'An uncapped IP infringement indemnity, with Legal Ops approval.',
        approver: 'Legal Ops', standardClause: INDEMNITY_STD,
        terms: { kind: 'indemnity', requireMutual: false, uncapped: 'ip_with_approval' },
      },
      {
        id: 'QP-RN-01', version: 'v2', clause: 'renewal_notice', title: 'Auto-renewal with 30 days notice',
        guidance: 'Auto-renew for up to 24-month periods with at least 30 days notice.',
        acceptableDeviation: 'Notice down to 14 days with Legal Ops approval.',
        approver: 'Legal Ops',
        standardClause: "This Agreement renews automatically for successive 12-month periods unless either party gives at least 30 days' written notice before the end of the current term.",
        terms: { kind: 'renewal_notice', preferredMinNoticeDays: 30, acceptableMinNoticeDays: 14, maxRenewalMonths: 24 },
      },
    ],
  },
  {
    id: 'alder',
    name: 'Alder Health',
    owner: 'Alder Health legal & DPO (fictional)',
    version: 'v7',
    stance: 'Regulated, strict',
    summary: 'Health-data seller. No liability deviations. The data addendum carries its own indemnity rule.',
    rules: [
      {
        id: 'AH-LC-01', version: 'v7', clause: 'liability_cap', title: 'Liability cap fixed at 1x fees',
        guidance: 'Cap total liability at 1x annual fees. No deviations.',
        acceptableDeviation: 'None. Any change goes to the General Counsel.',
        approver: 'General Counsel', standardClause: LIABILITY_STD,
        terms: { kind: 'liability_cap', preferredMax: 1, acceptableMax: 1 },
      },
      {
        id: 'AH-IN-01', version: 'v7', clause: 'indemnity', title: 'Mutual indemnities, never uncapped',
        guidance: 'Indemnities must be mutual and must always sit inside the liability cap.',
        acceptableDeviation: 'None.',
        approver: 'General Counsel', standardClause: INDEMNITY_STD,
        terms: { kind: 'indemnity', requireMutual: true, uncapped: 'never' },
      },
      {
        id: 'AH-IN-07', version: 'v7', clause: 'indemnity', title: 'Data addendum indemnity',
        guidance: 'For data-protection breaches, an indemnity outside the cap may be offered to NHS-style buyers.',
        acceptableDeviation: 'Uncapped data-protection indemnity with Data Protection Officer approval.',
        approver: 'Data Protection Officer', standardClause: INDEMNITY_STD,
        terms: { kind: 'indemnity', requireMutual: true, uncapped: 'data_with_approval', appliesTo: 'data' },
      },
      {
        id: 'AH-RN-01', version: 'v7', clause: 'renewal_notice', title: 'Auto-renewal with 90 days notice',
        guidance: 'Auto-renew for 12-month periods with at least 90 days notice.',
        acceptableDeviation: 'Notice down to 60 days with General Counsel approval.',
        approver: 'General Counsel',
        standardClause: "This Agreement renews automatically for successive 12-month periods unless either party gives at least 90 days' written notice before the end of the current term.",
        terms: { kind: 'renewal_notice', preferredMinNoticeDays: 90, acceptableMinNoticeDays: 60, maxRenewalMonths: 12 },
      },
      {
        id: 'AH-JU-01', version: 'v7', clause: 'jurisdiction', title: 'English law only',
        guidance: 'Governing law and courts of England and Wales only.',
        acceptableDeviation: 'None.',
        approver: 'General Counsel', standardClause: JURISDICTION_STD,
        terms: { kind: 'jurisdiction', preferred: ['England and Wales'], acceptable: [] },
      },
    ],
  },
];

export function getPlaybook(id: string): Playbook {
  const p = PLAYBOOKS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown playbook ${id}`);
  return p;
}
