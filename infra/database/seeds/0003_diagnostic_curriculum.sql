BEGIN;

INSERT INTO mathchakchak.topic (id, curriculum_code, grade_band, semantic_key, version)
VALUES
  ('c0000000-0000-4000-8000-000000000001','KR-E5-FRACTION-EQUIV','ELEMENTARY_5_6','topic.fraction.equivalent',1),
  ('d0000000-0000-4000-8000-000000000001','KR-E5-FRACTION-MULT','ELEMENTARY_5_6','topic.fraction.multiplication',1);

INSERT INTO mathchakchak.problem_item
  (id, topic_id, content_version, difficulty, answer_schema, scoring_rule)
VALUES
  ('c0000000-0000-4000-8000-000000000101','c0000000-0000-4000-8000-000000000001',1,1,'{"correct":{"value":"2/4"}}','{"type":"exact"}'),
  ('d0000000-0000-4000-8000-000000000101','d0000000-0000-4000-8000-000000000001',1,2,'{"correct":{"value":"1/2"}}','{"type":"exact"}');

INSERT INTO mathchakchak.diagnostic_item_localization
  (problem_item_id, locale, sequence_no, prompt, choices)
VALUES
  ('c0000000-0000-4000-8000-000000000101','ko',1,'1/2과 크기가 같은 분수는 무엇일까요?','[{"value":"2/4","label":"2/4"},{"value":"2/3","label":"2/3"},{"value":"3/4","label":"3/4"}]'),
  ('c0000000-0000-4000-8000-000000000101','zh-CN',1,'哪个分数和 1/2 相等？','[{"value":"2/4","label":"2/4"},{"value":"2/3","label":"2/3"},{"value":"3/4","label":"3/4"}]'),
  ('c0000000-0000-4000-8000-000000000101','ja',1,'1/2と同じ大きさの分数はどれですか？','[{"value":"2/4","label":"2/4"},{"value":"2/3","label":"2/3"},{"value":"3/4","label":"3/4"}]'),
  ('c0000000-0000-4000-8000-000000000101','en',1,'Which fraction has the same value as 1/2?','[{"value":"2/4","label":"2/4"},{"value":"2/3","label":"2/3"},{"value":"3/4","label":"3/4"}]'),
  ('c0000000-0000-4000-8000-000000000101','es',1,'¿Qué fracción tiene el mismo valor que 1/2?','[{"value":"2/4","label":"2/4"},{"value":"2/3","label":"2/3"},{"value":"3/4","label":"3/4"}]'),
  ('c0000000-0000-4000-8000-000000000101','fr',1,'Quelle fraction a la même valeur que 1/2 ?','[{"value":"2/4","label":"2/4"},{"value":"2/3","label":"2/3"},{"value":"3/4","label":"3/4"}]'),
  ('c0000000-0000-4000-8000-000000000101','it',1,'Quale frazione ha lo stesso valore di 1/2?','[{"value":"2/4","label":"2/4"},{"value":"2/3","label":"2/3"},{"value":"3/4","label":"3/4"}]'),
  ('c0000000-0000-4000-8000-000000000101','ru',1,'Какая дробь равна 1/2?','[{"value":"2/4","label":"2/4"},{"value":"2/3","label":"2/3"},{"value":"3/4","label":"3/4"}]'),
  ('44444444-4444-4444-8444-444444444444','ko',2,'1/2 + 1/3의 값은 무엇일까요?','[{"value":"2/5","label":"2/5"},{"value":"5/6","label":"5/6"},{"value":"2/6","label":"2/6"}]'),
  ('44444444-4444-4444-8444-444444444444','zh-CN',2,'1/2 + 1/3 等于多少？','[{"value":"2/5","label":"2/5"},{"value":"5/6","label":"5/6"},{"value":"2/6","label":"2/6"}]'),
  ('44444444-4444-4444-8444-444444444444','ja',2,'1/2 + 1/3はいくつですか？','[{"value":"2/5","label":"2/5"},{"value":"5/6","label":"5/6"},{"value":"2/6","label":"2/6"}]'),
  ('44444444-4444-4444-8444-444444444444','en',2,'What is 1/2 + 1/3?','[{"value":"2/5","label":"2/5"},{"value":"5/6","label":"5/6"},{"value":"2/6","label":"2/6"}]'),
  ('44444444-4444-4444-8444-444444444444','es',2,'¿Cuánto es 1/2 + 1/3?','[{"value":"2/5","label":"2/5"},{"value":"5/6","label":"5/6"},{"value":"2/6","label":"2/6"}]'),
  ('44444444-4444-4444-8444-444444444444','fr',2,'Combien font 1/2 + 1/3 ?','[{"value":"2/5","label":"2/5"},{"value":"5/6","label":"5/6"},{"value":"2/6","label":"2/6"}]'),
  ('44444444-4444-4444-8444-444444444444','it',2,'Quanto fa 1/2 + 1/3?','[{"value":"2/5","label":"2/5"},{"value":"5/6","label":"5/6"},{"value":"2/6","label":"2/6"}]'),
  ('44444444-4444-4444-8444-444444444444','ru',2,'Чему равно 1/2 + 1/3?','[{"value":"2/5","label":"2/5"},{"value":"5/6","label":"5/6"},{"value":"2/6","label":"2/6"}]'),
  ('d0000000-0000-4000-8000-000000000101','ko',3,'2/3 × 3/4의 값은 무엇일까요?','[{"value":"6/7","label":"6/7"},{"value":"1/2","label":"1/2"},{"value":"5/12","label":"5/12"}]'),
  ('d0000000-0000-4000-8000-000000000101','zh-CN',3,'2/3 × 3/4 等于多少？','[{"value":"6/7","label":"6/7"},{"value":"1/2","label":"1/2"},{"value":"5/12","label":"5/12"}]'),
  ('d0000000-0000-4000-8000-000000000101','ja',3,'2/3 × 3/4はいくつですか？','[{"value":"6/7","label":"6/7"},{"value":"1/2","label":"1/2"},{"value":"5/12","label":"5/12"}]'),
  ('d0000000-0000-4000-8000-000000000101','en',3,'What is 2/3 × 3/4?','[{"value":"6/7","label":"6/7"},{"value":"1/2","label":"1/2"},{"value":"5/12","label":"5/12"}]'),
  ('d0000000-0000-4000-8000-000000000101','es',3,'¿Cuánto es 2/3 × 3/4?','[{"value":"6/7","label":"6/7"},{"value":"1/2","label":"1/2"},{"value":"5/12","label":"5/12"}]'),
  ('d0000000-0000-4000-8000-000000000101','fr',3,'Combien font 2/3 × 3/4 ?','[{"value":"6/7","label":"6/7"},{"value":"1/2","label":"1/2"},{"value":"5/12","label":"5/12"}]'),
  ('d0000000-0000-4000-8000-000000000101','it',3,'Quanto fa 2/3 × 3/4?','[{"value":"6/7","label":"6/7"},{"value":"1/2","label":"1/2"},{"value":"5/12","label":"5/12"}]'),
  ('d0000000-0000-4000-8000-000000000101','ru',3,'Чему равно 2/3 × 3/4?','[{"value":"6/7","label":"6/7"},{"value":"1/2","label":"1/2"},{"value":"5/12","label":"5/12"}]');

INSERT INTO mathchakchak.math_concept
  (id, topic_id, semantic_key, grade_band, content_version, prerequisite_keys)
VALUES
  ('c0000000-0000-4000-8000-000000000201','c0000000-0000-4000-8000-000000000001','concept.fraction.equivalent','ELEMENTARY_5_6',1,'[]'),
  ('d0000000-0000-4000-8000-000000000201','d0000000-0000-4000-8000-000000000001','concept.fraction.multiplication','ELEMENTARY_5_6',1,'["concept.fraction.equivalent"]');

INSERT INTO mathchakchak.formula_definition
  (id, concept_id, semantic_key, notation, variable_definitions, derivation_steps, misconception_rules)
VALUES
  ('c0000000-0000-4000-8000-000000000301','c0000000-0000-4000-8000-000000000201','formula.fraction.equivalent','a/b = (a×n)/(b×n)',
   '{"a":"numerator","b":"nonzero denominator","n":"same nonzero multiplier"}',
   '["Choose the same nonzero number.","Multiply numerator and denominator by it.","The fraction value stays the same."]',
   '[{"code":"ONE_SIDE_ONLY","meaning":"Only one part of the fraction was scaled."}]'),
  ('d0000000-0000-4000-8000-000000000301','d0000000-0000-4000-8000-000000000201','formula.fraction.multiply','a/b × c/d = (a×c)/(b×d)',
   '{"a":"first numerator","b":"first nonzero denominator","c":"second numerator","d":"second nonzero denominator"}',
   '["Multiply the numerators.","Multiply the denominators.","Simplify the result."]',
   '[{"code":"CROSS_ADD","meaning":"The learner added instead of multiplying."}]');

INSERT INTO mathchakchak.formula_localization
  (formula_id, locale, title, plain_language, memory_cue, worked_example_intro)
VALUES
  ('c0000000-0000-4000-8000-000000000301','ko','동치분수 만들기','분자와 분모에 같은 0이 아닌 수를 곱하면 값이 같은 분수가 됩니다.','위아래에 같은 수','1/2을 2/4로 바꾸어 봅시다.'),
  ('c0000000-0000-4000-8000-000000000301','zh-CN','认识等值分数','分子和分母乘同一个非零数，分数值不变。','上下乘同一个数','把 1/2 改写成 2/4。'),
  ('c0000000-0000-4000-8000-000000000301','ja','同値分数を作る','分子と分母に同じ0でない数を掛けると値は変わりません。','上下に同じ数','1/2を2/4に変えます。'),
  ('c0000000-0000-4000-8000-000000000301','en','Equivalent fractions','Multiply top and bottom by the same nonzero number to keep the value.','Same number on top and bottom','Turn 1/2 into 2/4.'),
  ('c0000000-0000-4000-8000-000000000301','es','Fracciones equivalentes','Multiplica arriba y abajo por el mismo número distinto de cero.','El mismo número arriba y abajo','Convierte 1/2 en 2/4.'),
  ('c0000000-0000-4000-8000-000000000301','fr','Fractions équivalentes','Multiplie le haut et le bas par le même nombre non nul.','Le même nombre en haut et en bas','Transforme 1/2 en 2/4.'),
  ('c0000000-0000-4000-8000-000000000301','it','Frazioni equivalenti','Moltiplica sopra e sotto per lo stesso numero diverso da zero.','Lo stesso numero sopra e sotto','Trasforma 1/2 in 2/4.'),
  ('c0000000-0000-4000-8000-000000000301','ru','Равные дроби','Умножь числитель и знаменатель на одно ненулевое число.','Одно число сверху и снизу','Преобразуй 1/2 в 2/4.'),
  ('d0000000-0000-4000-8000-000000000301','ko','분수의 곱셈','분자는 분자끼리, 분모는 분모끼리 곱한 뒤 약분합니다.','위끼리 곱하고 아래끼리 곱하기','2/3 × 3/4를 풀어 봅시다.'),
  ('d0000000-0000-4000-8000-000000000301','zh-CN','分数乘法','分子相乘，分母相乘，最后约分。','上面乘上面，下面乘下面','计算 2/3 × 3/4。'),
  ('d0000000-0000-4000-8000-000000000301','ja','分数のかけ算','分子どうし、分母どうしを掛けて約分します。','上どうし、下どうし','2/3 × 3/4を計算します。'),
  ('d0000000-0000-4000-8000-000000000301','en','Multiplying fractions','Multiply numerator by numerator and denominator by denominator, then simplify.','Top times top, bottom times bottom','Solve 2/3 × 3/4.'),
  ('d0000000-0000-4000-8000-000000000301','es','Multiplicación de fracciones','Multiplica numeradores y denominadores, y simplifica.','Arriba por arriba, abajo por abajo','Resuelve 2/3 × 3/4.'),
  ('d0000000-0000-4000-8000-000000000301','fr','Multiplication de fractions','Multiplie les numérateurs et les dénominateurs, puis simplifie.','Haut par haut, bas par bas','Calcule 2/3 × 3/4.'),
  ('d0000000-0000-4000-8000-000000000301','it','Moltiplicazione di frazioni','Moltiplica numeratori e denominatori, poi semplifica.','Sopra per sopra, sotto per sotto','Calcola 2/3 × 3/4.'),
  ('d0000000-0000-4000-8000-000000000301','ru','Умножение дробей','Перемножь числители и знаменатели, затем сократи.','Верх на верх, низ на низ','Вычисли 2/3 × 3/4.');

INSERT INTO mathchakchak.worked_example
  (id, formula_id, sequence_no, problem_context, solution_steps, final_answer)
VALUES
  ('c0000000-0000-4000-8000-000000000401','c0000000-0000-4000-8000-000000000301',1,'{"expression":"1/2 = ?/4"}','[{"expression":"1×2=2"},{"expression":"2×2=4"}]','{"value":"2/4","numerator":2,"denominator":4}'),
  ('d0000000-0000-4000-8000-000000000401','d0000000-0000-4000-8000-000000000301',1,'{"expression":"2/3 × 3/4"}','[{"expression":"2×3=6"},{"expression":"3×4=12"},{"expression":"6/12=1/2"}]','{"value":"1/2","numerator":1,"denominator":2}');

INSERT INTO mathchakchak.lesson_definition
  (id, concept_id, semantic_key, content_version, mastery_threshold)
VALUES
  ('c0000000-0000-4000-8000-000000000501','c0000000-0000-4000-8000-000000000201','lesson.fraction.equivalent.v1',1,0.800),
  ('d0000000-0000-4000-8000-000000000501','d0000000-0000-4000-8000-000000000201','lesson.fraction.multiply.v1',1,0.800);

INSERT INTO mathchakchak.lesson_step
  (id, lesson_definition_id, sequence_no, stage, interaction_type, content, expected_response, scoring_rule, hint_ladder)
VALUES
  ('c0000000-0000-4000-8000-000000000601','c0000000-0000-4000-8000-000000000501',1,'UNDERSTAND','CONCEPT_CHOICE',
   '{"prompt":{"ko":"동치분수에서 그대로인 것은 무엇일까요?","zh-CN":"等值分数中什么保持不变？","ja":"同値分数で変わらないものは？","en":"What stays the same in equivalent fractions?","es":"¿Qué permanece igual en fracciones equivalentes?","fr":"Que reste identique dans des fractions équivalentes ?","it":"Cosa resta uguale nelle frazioni equivalenti?","ru":"Что остается одинаковым в равных дробях?"},"choices":[{"value":"same_value","label":{"ko":"분수의 값","zh-CN":"分数的值","ja":"分数の値","en":"The value","es":"El valor","fr":"La valeur","it":"Il valore","ru":"Значение"}},{"value":"same_numbers","label":{"ko":"적힌 숫자","zh-CN":"写出的数字","ja":"書かれた数字","en":"The written numbers","es":"Los números escritos","fr":"Les nombres écrits","it":"I numeri scritti","ru":"Записанные числа"}}]}',
   '{"type":"choice","value":"same_value"}','{}','[{"ko":"전체에서 차지하는 크기를 생각하세요.","zh-CN":"想一想占整体的大小。","ja":"全体に対する大きさを考えよう。","en":"Think about the amount of the whole.","es":"Piensa en la parte del total.","fr":"Pense à la part du tout.","it":"Pensa alla parte del tutto.","ru":"Подумай о доле целого."}]'),
  ('c0000000-0000-4000-8000-000000000602','c0000000-0000-4000-8000-000000000501',2,'CONNECT','VISUAL_CHOICE',
   '{"prompt":{"ko":"1/2과 같은 그림을 나타내는 분수를 고르세요.","zh-CN":"选择与 1/2 相同的图。","ja":"1/2と同じ図を表す分数を選ぼう。","en":"Choose the fraction showing the same picture as 1/2.","es":"Elige la fracción que muestra lo mismo que 1/2.","fr":"Choisis la fraction qui montre la même part que 1/2.","it":"Scegli la frazione che mostra la stessa parte di 1/2.","ru":"Выбери дробь, показывающую ту же часть, что 1/2."},"choices":[{"value":"two_four","label":"2/4"},{"value":"two_three","label":"2/3"},{"value":"one_four","label":"1/4"}],"visual_model":{"whole":"rectangle","parts":4}}',
   '{"type":"choice","value":"two_four"}','{}','[{"ko":"2조각 중 1조각을 4조각으로 다시 나눠 보세요.","zh-CN":"把二等份再分成四等份。","ja":"2等分を4等分に分け直そう。","en":"Split the two halves into four equal parts.","es":"Divide las dos mitades en cuatro partes.","fr":"Partage les deux moitiés en quatre parts.","it":"Dividi le due metà in quattro parti.","ru":"Раздели две половины на четыре части."}]'),
  ('c0000000-0000-4000-8000-000000000603','c0000000-0000-4000-8000-000000000501',3,'REPEAT','GUIDED_FRACTION',
   '{"prompt":{"ko":"1/2의 분자와 분모에 3을 곱한 분수를 입력하세요.","zh-CN":"输入 1/2 的分子分母都乘 3 后的分数。","ja":"1/2の分子と分母に3を掛けた分数を入力しよう。","en":"Multiply the top and bottom of 1/2 by 3.","es":"Multiplica arriba y abajo de 1/2 por 3.","fr":"Multiplie le haut et le bas de 1/2 par 3.","it":"Moltiplica sopra e sotto di 1/2 per 3.","ru":"Умножь числитель и знаменатель 1/2 на 3."},"expression":"1/2 × 3/3"}',
   '{"type":"fraction","numerator":3,"denominator":6}','{}','[{"ko":"분자와 분모 모두에 3을 곱하세요.","zh-CN":"分子和分母都乘 3。","ja":"分子と分母の両方に3を掛けます。","en":"Multiply both numerator and denominator by 3.","es":"Multiplica numerador y denominador por 3.","fr":"Multiplie le numérateur et le dénominateur par 3.","it":"Moltiplica numeratore e denominatore per 3.","ru":"Умножь числитель и знаменатель на 3."}]'),
  ('c0000000-0000-4000-8000-000000000604','c0000000-0000-4000-8000-000000000501',4,'RECALL','CONCEPT_CHOICE',
   '{"prompt":{"ko":"동치분수를 만드는 규칙을 고르세요.","zh-CN":"选择生成等值分数的规则。","ja":"同値分数を作る規則を選ぼう。","en":"Choose the rule for making an equivalent fraction.","es":"Elige la regla para crear una fracción equivalente.","fr":"Choisis la règle pour créer une fraction équivalente.","it":"Scegli la regola per creare una frazione equivalente.","ru":"Выбери правило получения равной дроби."},"choices":[{"value":"multiply_both","label":{"ko":"분자와 분모에 같은 수를 곱한다","zh-CN":"分子分母乘同一个数","ja":"分子と分母に同じ数を掛ける","en":"Multiply top and bottom by the same number","es":"Multiplicar arriba y abajo por el mismo número","fr":"Multiplier le haut et le bas par le même nombre","it":"Moltiplicare sopra e sotto per lo stesso numero","ru":"Умножить верх и низ на одно число"}},{"value":"add_bottom","label":{"ko":"분모에만 수를 더한다","zh-CN":"只给分母加数","ja":"分母だけに数を足す","en":"Add only to the denominator","es":"Sumar solo al denominador","fr":"Ajouter seulement au dénominateur","it":"Aggiungere solo al denominatore","ru":"Прибавить только к знаменателю"}}]}',
   '{"type":"choice","value":"multiply_both"}','{}','[{"ko":"값을 그대로 유지해야 합니다.","zh-CN":"分数值必须保持不变。","ja":"値を同じに保ちます。","en":"The value must stay unchanged.","es":"El valor debe mantenerse.","fr":"La valeur doit rester identique.","it":"Il valore deve restare uguale.","ru":"Значение должно сохраниться."}]'),
  ('c0000000-0000-4000-8000-000000000605','c0000000-0000-4000-8000-000000000501',5,'APPLY','APPLICATION_FRACTION',
   '{"prompt":{"ko":"2/3과 같은 값이고 분모가 6인 분수를 입력하세요.","zh-CN":"输入与 2/3 相等且分母为 6 的分数。","ja":"2/3と同じ値で分母が6の分数を入力しよう。","en":"Enter a fraction equal to 2/3 with denominator 6.","es":"Escribe una fracción igual a 2/3 con denominador 6.","fr":"Écris une fraction égale à 2/3 avec dénominateur 6.","it":"Inserisci una frazione uguale a 2/3 con denominatore 6.","ru":"Запиши дробь, равную 2/3, со знаменателем 6."},"expression":"2/3 = ?/6"}',
   '{"type":"fraction","numerator":4,"denominator":6}','{}','[{"ko":"3에 2를 곱해 6을 만들었어요.","zh-CN":"3 乘 2 得到 6。","ja":"3に2を掛けて6にしました。","en":"Three was multiplied by 2 to make 6.","es":"Se multiplicó 3 por 2 para obtener 6.","fr":"On a multiplié 3 par 2 pour obtenir 6.","it":"Abbiamo moltiplicato 3 per 2 per ottenere 6.","ru":"3 умножили на 2 и получили 6."}]'),
  ('d0000000-0000-4000-8000-000000000601','d0000000-0000-4000-8000-000000000501',1,'UNDERSTAND','CONCEPT_CHOICE',
   '{"prompt":{"ko":"분수의 곱셈은 무엇을 뜻할까요?","zh-CN":"分数乘法表示什么？","ja":"分数のかけ算は何を表しますか？","en":"What does multiplying fractions mean?","es":"¿Qué significa multiplicar fracciones?","fr":"Que signifie multiplier des fractions ?","it":"Cosa significa moltiplicare frazioni?","ru":"Что означает умножение дробей?"},"choices":[{"value":"part_of_part","label":{"ko":"어떤 부분의 또 한 부분","zh-CN":"一部分中的一部分","ja":"ある部分のさらに一部分","en":"A part of another part","es":"Una parte de otra parte","fr":"Une partie dune autre partie","it":"Una parte di un altra parte","ru":"Часть другой части"}},{"value":"add_denominators","label":{"ko":"분모끼리 더하기","zh-CN":"分母相加","ja":"分母を足す","en":"Adding denominators","es":"Sumar denominadores","fr":"Additionner les dénominateurs","it":"Sommare i denominatori","ru":"Сложение знаменателей"}}]}',
   '{"type":"choice","value":"part_of_part"}','{}','[{"ko":"1/2의 1/3처럼 생각하세요.","zh-CN":"想一想 1/2 的 1/3。","ja":"1/2の1/3と考えよう。","en":"Think of one third of one half.","es":"Piensa en un tercio de una mitad.","fr":"Pense à un tiers de la moitié.","it":"Pensa a un terzo di una metà.","ru":"Представь треть от половины."}]'),
  ('d0000000-0000-4000-8000-000000000602','d0000000-0000-4000-8000-000000000501',2,'CONNECT','VISUAL_CHOICE',
   '{"prompt":{"ko":"1/2의 1/3을 나타내는 분수를 고르세요.","zh-CN":"选择表示 1/2 的 1/3 的分数。","ja":"1/2の1/3を表す分数を選ぼう。","en":"Choose the fraction that is one third of one half.","es":"Elige la fracción que es un tercio de una mitad.","fr":"Choisis la fraction égale à un tiers de la moitié.","it":"Scegli la frazione che è un terzo di una metà.","ru":"Выбери дробь, равную трети от половины."},"choices":[{"value":"one_sixth","label":"1/6"},{"value":"two_fifths","label":"2/5"},{"value":"one_fifth","label":"1/5"}],"visual_model":{"whole":"rectangle","parts":6}}',
   '{"type":"choice","value":"one_sixth"}','{}','[{"ko":"전체를 2×3개의 같은 칸으로 나누세요.","zh-CN":"把整体分成 2×3 个相同格子。","ja":"全体を2×3個の同じ区画に分けよう。","en":"Split the whole into 2×3 equal cells.","es":"Divide el total en 2×3 partes iguales.","fr":"Partage le tout en 2×3 cases égales.","it":"Dividi il tutto in 2×3 parti uguali.","ru":"Раздели целое на 2×3 равных частей."}]'),
  ('d0000000-0000-4000-8000-000000000603','d0000000-0000-4000-8000-000000000501',3,'REPEAT','GUIDED_FRACTION',
   '{"prompt":{"ko":"2/3 × 3/4를 계산해 기약분수로 입력하세요.","zh-CN":"计算 2/3 × 3/4，并输入最简分数。","ja":"2/3 × 3/4を計算し、既約分数で入力しよう。","en":"Calculate 2/3 × 3/4 in simplest form.","es":"Calcula 2/3 × 3/4 en forma simplificada.","fr":"Calcule 2/3 × 3/4 sous forme irréductible.","it":"Calcola 2/3 × 3/4 in forma ridotta.","ru":"Вычисли 2/3 × 3/4 и сократи."},"expression":"2/3 × 3/4"}',
   '{"type":"fraction","numerator":1,"denominator":2}','{}','[{"ko":"분자는 2×3, 분모는 3×4예요.","zh-CN":"分子是 2×3，分母是 3×4。","ja":"分子は2×3、分母は3×4です。","en":"The numerator is 2×3 and the denominator is 3×4.","es":"El numerador es 2×3 y el denominador 3×4.","fr":"Le numérateur est 2×3 et le dénominateur 3×4.","it":"Il numeratore è 2×3 e il denominatore 3×4.","ru":"Числитель 2×3, знаменатель 3×4."}]'),
  ('d0000000-0000-4000-8000-000000000604','d0000000-0000-4000-8000-000000000501',4,'RECALL','CONCEPT_CHOICE',
   '{"prompt":{"ko":"분수 곱셈의 규칙을 고르세요.","zh-CN":"选择分数乘法规则。","ja":"分数のかけ算の規則を選ぼう。","en":"Choose the fraction multiplication rule.","es":"Elige la regla de multiplicación de fracciones.","fr":"Choisis la règle de multiplication des fractions.","it":"Scegli la regola della moltiplicazione di frazioni.","ru":"Выбери правило умножения дробей."},"choices":[{"value":"top_bottom","label":{"ko":"분자는 분자끼리, 분모는 분모끼리 곱한다","zh-CN":"分子相乘，分母相乘","ja":"分子どうし、分母どうしを掛ける","en":"Multiply tops and multiply bottoms","es":"Multiplicar numeradores y denominadores","fr":"Multiplier les numérateurs et les dénominateurs","it":"Moltiplicare numeratori e denominatori","ru":"Перемножить числители и знаменатели"}},{"value":"cross_add","label":{"ko":"엇갈려 더한다","zh-CN":"交叉相加","ja":"交差して足す","en":"Cross and add","es":"Cruzar y sumar","fr":"Croiser et additionner","it":"Incrociare e sommare","ru":"Перекрестно сложить"}}]}',
   '{"type":"choice","value":"top_bottom"}','{}','[{"ko":"위의 수끼리와 아래의 수끼리를 보세요.","zh-CN":"看上面的数和下面的数。","ja":"上の数どうしと下の数どうしを見よう。","en":"Look at the top numbers and the bottom numbers.","es":"Mira los números de arriba y de abajo.","fr":"Regarde les nombres du haut et du bas.","it":"Guarda i numeri sopra e sotto.","ru":"Смотри на верхние и нижние числа."}]'),
  ('d0000000-0000-4000-8000-000000000605','d0000000-0000-4000-8000-000000000501',5,'APPLY','APPLICATION_FRACTION',
   '{"prompt":{"ko":"새 문제 2/3 × 3/5를 풀어 기약분수로 입력하세요.","zh-CN":"计算新题 2/3 × 3/5，并输入最简分数。","ja":"新しい問題2/3 × 3/5を解き、既約分数で入力しよう。","en":"Solve 2/3 × 3/5 in simplest form.","es":"Resuelve 2/3 × 3/5 en forma simplificada.","fr":"Calcule 2/3 × 3/5 sous forme irréductible.","it":"Risolvi 2/3 × 3/5 in forma ridotta.","ru":"Реши 2/3 × 3/5 и сократи."},"expression":"2/3 × 3/5"}',
   '{"type":"fraction","numerator":2,"denominator":5}','{}','[{"ko":"먼저 6/15를 만든 뒤 3으로 약분하세요.","zh-CN":"先得到 6/15，再除以 3。","ja":"まず6/15にしてから3で約分しよう。","en":"First get 6/15, then simplify by 3.","es":"Primero obtén 6/15 y simplifica entre 3.","fr":"Obtiens 6/15 puis simplifie par 3.","it":"Ottieni 6/15 e semplifica per 3.","ru":"Сначала получи 6/15, затем сократи на 3."}]');

COMMIT;
