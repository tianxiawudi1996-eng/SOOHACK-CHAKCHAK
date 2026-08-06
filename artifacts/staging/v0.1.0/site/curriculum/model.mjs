export const GRADE_CODES=Object.freeze(['E1','E2','E3','E4','E5','E6','M1','M2','M3','H1','H2','H3']);
export const STRAND_KEYS=Object.freeze({NUMBER_OPERATION:'strand.number',CHANGE_RELATION:'strand.change',GEOMETRY_MEASURE:'strand.geometry',DATA_CHANCE:'strand.data'});
export function normalizeGrade(value){return GRADE_CODES.includes(value)?value:'E1';}
export function createIdempotencyKey(scope,randomUuid=crypto.randomUUID()){return `${scope}-${randomUuid}`;}
export function groupGrades(grades){return {ELEMENTARY:grades.filter((g)=>g.school_level==='ELEMENTARY'),MIDDLE:grades.filter((g)=>g.school_level==='MIDDLE'),HIGH:grades.filter((g)=>g.school_level==='HIGH')};}
