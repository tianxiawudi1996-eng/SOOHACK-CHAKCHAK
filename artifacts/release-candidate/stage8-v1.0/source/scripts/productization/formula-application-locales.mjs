export const APPLICATION_LOCALES=Object.freeze(['ko','zh-CN','ja','en','es','fr','it','ru']);

const templates={
  ko:{
    CALCULATION:'다음을 계산하세요: {exercise}',
    WORD_PROBLEM:'주어진 관계를 실제 상황에 적용하세요: {exercise}',
    UNIT_REASONING:'단위를 포함하여 답하세요: {exercise}',
    REPRESENTATION_REASONING:'공식을 적용하여 빈칸이나 결과를 구하세요: {exercise}',
    value:'답',unit:'단위'
  },
  'zh-CN':{
    CALCULATION:'计算：{exercise}',
    WORD_PROBLEM:'把给出的关系应用到实际情境：{exercise}',
    UNIT_REASONING:'请写出包含单位的答案：{exercise}',
    REPRESENTATION_REASONING:'应用公式求空格或结果：{exercise}',
    value:'答案',unit:'单位'
  },
  ja:{
    CALCULATION:'計算してください：{exercise}',
    WORD_PROBLEM:'与えられた関係を実際の場面に適用してください：{exercise}',
    UNIT_REASONING:'単位を付けて答えてください：{exercise}',
    REPRESENTATION_REASONING:'公式を使って空欄または結果を求めてください：{exercise}',
    value:'答え',unit:'単位'
  },
  en:{
    CALCULATION:'Calculate: {exercise}',
    WORD_PROBLEM:'Apply the given relation to the situation: {exercise}',
    UNIT_REASONING:'Include the unit in your answer: {exercise}',
    REPRESENTATION_REASONING:'Apply the formula to find the blank or result: {exercise}',
    value:'Answer',unit:'Unit'
  },
  es:{
    CALCULATION:'Calcula: {exercise}',
    WORD_PROBLEM:'Aplica la relación dada a la situación: {exercise}',
    UNIT_REASONING:'Incluye la unidad en tu respuesta: {exercise}',
    REPRESENTATION_REASONING:'Aplica la fórmula para hallar el espacio o el resultado: {exercise}',
    value:'Respuesta',unit:'Unidad'
  },
  fr:{
    CALCULATION:'Calcule : {exercise}',
    WORD_PROBLEM:'Applique la relation donnée à la situation : {exercise}',
    UNIT_REASONING:'Indique l’unité dans ta réponse : {exercise}',
    REPRESENTATION_REASONING:'Applique la formule pour trouver la case vide ou le résultat : {exercise}',
    value:'Réponse',unit:'Unité'
  },
  it:{
    CALCULATION:'Calcola: {exercise}',
    WORD_PROBLEM:'Applica la relazione data alla situazione: {exercise}',
    UNIT_REASONING:'Includi l’unità nella risposta: {exercise}',
    REPRESENTATION_REASONING:'Applica la formula per trovare lo spazio vuoto o il risultato: {exercise}',
    value:'Risposta',unit:'Unità'
  },
  ru:{
    CALCULATION:'Вычисли: {exercise}',
    WORD_PROBLEM:'Примени данное соотношение к ситуации: {exercise}',
    UNIT_REASONING:'Укажи единицу измерения в ответе: {exercise}',
    REPRESENTATION_REASONING:'Примени формулу и найди пропуск или результат: {exercise}',
    value:'Ответ',unit:'Единица'
  }
};

export function localizeApplicationTask(task,locale){
  const messages=templates[locale]??templates.en;
  return {
    prompt:messages[task.kind].replace('{exercise}',task.exercise),
    value_label:messages.value,
    unit_label:messages.unit
  };
}
