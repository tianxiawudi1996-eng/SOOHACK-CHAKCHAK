const permissions = Object.freeze({
  STUDENT: new Set(['diagnostic:create', 'diagnostic:answer:self', 'learning:write:self', 'progress:read:self', 'review:write:self', 'privacy:request:self']),
  PARENT: new Set(['diagnostic:create:linked', 'learning:read:linked', 'progress:read:linked', 'report:read:linked', 'privacy:request:linked']),
  TEACHER: new Set(['learning:read:linked','progress:read:linked','report:read:linked','academy:assign:linked','intervention:write:linked']),
  ADMIN: new Set(['content:manage', 'support:read:redacted', 'audit:read', 'privacy:operate']),
  SERVICE: new Set(['diagnostic:process', 'learning:process', 'report:generate', 'event:write'])
});

export function authorize({role, permission, actorUserId, ownerUserId, linkedStudentIds = [], studentId, consentActive = false}) {
  if (!permissions[role]?.has(permission)) return {allowed: false, reason: 'PERMISSION_DENIED'};
  if (permission.endsWith(':self') && actorUserId !== ownerUserId) return {allowed: false, reason: 'OWNERSHIP_REQUIRED'};
  if (permission.endsWith(':linked')) {
    if (!linkedStudentIds.includes(studentId)) return {allowed: false, reason: 'ACTIVE_LINK_REQUIRED'};
    if (permission === 'report:read:linked' && !consentActive) return {allowed: false, reason: 'CONSENT_REQUIRED'};
  }
  return {allowed: true, reason: 'AUTHORIZED'};
}
