export const PRIVACY_REQUEST_TYPES = Object.freeze([
  'ACCESS',
  'EXPORT',
  'CORRECTION',
  'DELETION',
  'PROCESSING_RESTRICTION',
  'CONSENT_WITHDRAWAL'
]);

export const PRIVACY_REQUEST_STATUSES = Object.freeze([
  'RECEIVED',
  'IDENTITY_VERIFIED',
  'IN_REVIEW',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
  'CANCELLED'
]);

const transitions = Object.freeze({
  RECEIVED: new Set(['IDENTITY_VERIFIED', 'CANCELLED']),
  IDENTITY_VERIFIED: new Set(['IN_REVIEW', 'CANCELLED']),
  IN_REVIEW: new Set(['APPROVED', 'REJECTED']),
  APPROVED: new Set(['COMPLETED']),
  REJECTED: new Set(),
  COMPLETED: new Set(),
  CANCELLED: new Set()
});

export function isPrivacyRequestType(value) {
  return PRIVACY_REQUEST_TYPES.includes(value);
}

export function canTransitionPrivacyRequest(fromStatus, toStatus) {
  return transitions[fromStatus]?.has(toStatus) ?? false;
}

export function canRequesterCancel(status) {
  return canTransitionPrivacyRequest(status, 'CANCELLED');
}

export function mapPrivacyRequest(row) {
  return {
    id: row.id,
    request_type: row.request_type,
    status: row.status,
    locale: row.locale,
    source_channel: row.source_channel,
    identity_assurance: row.identity_assurance,
    policy_version: row.policy_version,
    submitted_at: row.submitted_at,
    updated_at: row.updated_at,
    cancelled_at: row.cancelled_at,
    completed_at: row.completed_at
  };
}

export function privacyRequestBoundary() {
  return {
    direct_deletion_performed: false,
    identity_reverification_required_before_fulfilment: true,
    guardian_channel_status: 'BLOCKED_MANAGED_IDENTITY_AND_ACTIVE_LINK',
    legal_compliance_status: 'REQUIRES_COUNSEL_AND_POLICY_OWNER_REVIEW'
  };
}
