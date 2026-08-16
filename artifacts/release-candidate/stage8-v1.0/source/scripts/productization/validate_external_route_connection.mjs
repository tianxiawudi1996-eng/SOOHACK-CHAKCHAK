import fs from 'node:fs/promises';

const root=process.cwd();
const register=JSON.parse(await fs.readFile(`${root}/docs/productization/evidence/EXTERNAL_EXECUTION_READINESS_REGISTER_v1.0.json`,'utf8'));
const evidence=JSON.parse(await fs.readFile(`${root}/docs/productization/evidence/EXTERNAL_ROUTE_CONNECTION_VALIDATION_v1.0.json`,'utf8'));
const status=JSON.parse(await fs.readFile(`${root}/docs/productization/STATUS.json`,'utf8'));
const failures=[];
const route=register.input_confirmations?.approved_submission_route_reference;
const d80=register.workstreams.find(item=>item.id==='D80-10');
const nextInput=register.next_authorized_input;
if(!/^OPS-EVIDENCE-ROUTE-\d{4}-\d{3}$/.test(route?.reference||'')) failures.push('ROUTE_REFERENCE_FORMAT_INVALID');
if(route?.workstream_id!=='D80-10'||route.status!=='FORMAT_AND_BINDING_VALIDATED_PENDING_CONNECTION_EVIDENCE') failures.push('ROUTE_REFERENCE_BINDING_INVALID');
if(d80?.owner_role!=='OPERATIONS_OWNER'||d80?.review_role!=='SECURITY_AND_PRODUCT_REVIEW_BOARD'||d80?.status!=='READY_FOR_EXTERNAL_SUBMISSION') failures.push('D80_10_ROLE_OR_STATUS_INVALID');
if(evidence.status!=='BLOCKED_EXTERNAL_ROUTE_CONNECTION'||evidence.route_reference!==route.reference||evidence.workstream_id!=='D80-10') failures.push('EVIDENCE_STATUS_INVALID');
if(evidence.reference_format_valid!==true||evidence.workstream_binding_valid!==true||evidence.actual_connection_evidence!==0||evidence.connection_verified!==false) failures.push('CONNECTION_CLAIM_INVALID');
if(register.submission_policy?.external_submission_route!=='FORMAT_AND_BINDING_VALIDATED_PENDING_CONNECTION_EVIDENCE') failures.push('SUBMISSION_POLICY_ROUTE_STATUS_INVALID');
if(nextInput?.type!=='EXTERNAL_ROUTE_CONNECTION_EVIDENCE_REFERENCE'||nextInput?.workstream_id!=='D80-10'||JSON.stringify(nextInput?.required_fields)!==JSON.stringify(['internal_reference','evidence_sha256','verified_at','review_role_code'])||nextInput?.required_review_role_code!=='SECURITY_AND_PRODUCT_REVIEW_BOARD'||nextInput?.accepted_evidence_count!==0) failures.push('NEXT_INPUT_CONTRACT_INVALID');
if(evidence.next_required_input?.type!==nextInput?.type||JSON.stringify(evidence.next_required_input?.fields)!==JSON.stringify(nextInput?.required_fields)) failures.push('NEXT_INPUT_EVIDENCE_DRIFT');
for(const key of ['dispatch_performed','evidence_submission_enabled','verification_enabled','production_release_authorized']) if(evidence[key]!==false||register[key]!==false) failures.push(`UNSAFE_FLAG:${key}`);
if(status.external_execution_preparation?.status!=='D80_10_READY_FOR_EXTERNAL_SUBMISSION_PENDING_ROUTE_CONNECTION') failures.push('STATUS_MEMORY_INVALID');
console.log(`EXTERNAL_ROUTE_CONNECTION_STATIC_${failures.length?'FAIL':'PASS'}`);
console.log(`route_reference=${route?.reference||'MISSING'}`);
console.log(`connection_verified=${evidence.connection_verified} dispatch=${evidence.dispatch_performed} submission=${evidence.evidence_submission_enabled}`);
console.log(`next_input=${nextInput?.type||'MISSING'} required_fields=${nextInput?.required_fields?.length||0}`);
if(failures.length){for(const failure of failures) console.error(failure);process.exit(1);}
