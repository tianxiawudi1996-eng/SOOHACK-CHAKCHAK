BEGIN;

INSERT INTO mathchakchak.math_concept
  (id, topic_id, semantic_key, grade_band, content_version, prerequisite_keys)
VALUES
  ('77777777-7777-4777-8777-777777777777', '33333333-3333-4333-8333-333333333333',
   'concept.fraction.unlike_denominator_addition', 'ELEMENTARY_5_6', 1,
   '["concept.fraction.equivalent", "concept.multiple.common"]');

INSERT INTO mathchakchak.formula_definition
  (id, concept_id, semantic_key, notation, variable_definitions, derivation_steps, misconception_rules)
VALUES
  ('88888888-8888-4888-8888-888888888888', '77777777-7777-4777-8777-777777777777',
   'formula.fraction.add.unlike', 'a/b + c/d = (a*d + b*c) / (b*d)',
   '{"a":"first numerator","b":"first nonzero denominator","c":"second numerator","d":"second nonzero denominator"}',
   '["Fractions can be added only after the pieces have the same size.","Use b*d as a common denominator.","Scale each numerator by the other denominator.","Add the scaled numerators and simplify."]',
   '[{"code":"ADD_DENOMINATORS","meaning":"The learner added both denominators instead of making equal-sized pieces."}]');

INSERT INTO mathchakchak.formula_localization
  (formula_id, locale, title, plain_language, memory_cue, worked_example_intro)
VALUES
  ('88888888-8888-4888-8888-888888888888','ko','분모가 다른 분수의 덧셈','조각의 크기인 분모를 먼저 같게 만든 뒤 분자끼리 더하고 약분합니다.','조각 크기를 같게, 조각 수를 더하기','1/2과 1/3을 같은 크기의 여섯 조각으로 바꿔 봅시다.'),
  ('88888888-8888-4888-8888-888888888888','zh-CN','异分母分数加法','先把分母变成相同大小的份，再把分子相加并约分。','先统一每份大小，再相加份数','把1/2和1/3都改写成六等份。'),
  ('88888888-8888-4888-8888-888888888888','ja','異分母の分数のたし算','分母をそろえて同じ大きさの部分にしてから、分子をたして約分します。','部分の大きさをそろえ、数をたす','1/2と1/3を6等分の表し方に変えます。'),
  ('88888888-8888-4888-8888-888888888888','en','Adding fractions with unlike denominators','First make equal-sized pieces with a common denominator, then add the numerators and simplify.','Match piece size, then add piece count','Rewrite 1/2 and 1/3 as sixths.'),
  ('88888888-8888-4888-8888-888888888888','es','Suma de fracciones con distinto denominador','Primero iguala el tamaño de las partes con un denominador común; luego suma los numeradores y simplifica.','Iguala el tamaño y suma la cantidad','Convierte 1/2 y 1/3 en sextos.'),
  ('88888888-8888-4888-8888-888888888888','fr','Addition de fractions de dénominateurs différents','Commence par obtenir des parts de même taille, puis additionne les numérateurs et simplifie.','Même taille de part, puis addition des parts','Écris 1/2 et 1/3 en sixièmes.'),
  ('88888888-8888-4888-8888-888888888888','it','Somma di frazioni con denominatori diversi','Prima rendi uguale la dimensione delle parti, poi somma i numeratori e semplifica.','Stessa dimensione, poi somma le parti','Riscrivi 1/2 e 1/3 in sesti.'),
  ('88888888-8888-4888-8888-888888888888','ru','Сложение дробей с разными знаменателями','Сначала приведи части к одинаковому размеру, затем сложи числители и сократи результат.','Одинаковый размер частей, затем их сумма','Представь 1/2 и 1/3 в шестых долях.');

INSERT INTO mathchakchak.worked_example
  (id, formula_id, sequence_no, problem_context, solution_steps, final_answer)
VALUES
  ('99999999-9999-4999-8999-999999999999', '88888888-8888-4888-8888-888888888888', 1,
   '{"expression":"1/2 + 1/3","visual_model":{"whole":"rectangle","parts":6}}',
   '[{"expression":"1/2 = 3/6","reason":"equivalent fraction"},{"expression":"1/3 = 2/6","reason":"equivalent fraction"},{"expression":"3/6 + 2/6 = 5/6","reason":"same-sized pieces"}]',
   '{"value":"5/6","numerator":5,"denominator":6}');

INSERT INTO mathchakchak.lesson_definition
  (id, concept_id, semantic_key, content_version, mastery_threshold)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '77777777-7777-4777-8777-777777777777',
   'lesson.fraction.add.unlike.v1', 1, 0.800);

INSERT INTO mathchakchak.lesson_step
  (id, lesson_definition_id, sequence_no, stage, interaction_type, content, expected_response, scoring_rule, hint_ladder)
VALUES
  ('b1111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,'UNDERSTAND','CONCEPT_CHOICE',
   '{"prompt":{"ko":"분수의 분모를 먼저 같게 만드는 이유는 무엇일까요?","zh-CN":"为什么要先统一分母？","ja":"なぜ先に分母をそろえますか？","en":"Why do we make denominators the same first?","es":"¿Por qué igualamos primero los denominadores?","fr":"Pourquoi met-on d’abord les fractions au même dénominateur ?","it":"Perché rendiamo prima uguali i denominatori?","ru":"Почему сначала нужно привести дроби к общему знаменателю?"},"choices":["same_size_pieces","add_all_numbers","make_numbers_bigger"]}',
   '{"type":"choice","value":"same_size_pieces"}','{}','["Think about the size of each piece.","Only equal-sized pieces can be counted together."]'),
  ('b2222222-2222-4222-8222-222222222222','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',2,'CONNECT','VISUAL_CHOICE',
   '{"prompt":{"ko":"1/2과 1/3을 함께 나타내기에 알맞은 공통 분모를 고르세요.","zh-CN":"选择适合表示1/2和1/3的公分母。","ja":"1/2と1/3に合う共通分母を選びましょう。","en":"Choose a common denominator for 1/2 and 1/3.","es":"Elige un denominador común para 1/2 y 1/3.","fr":"Choisis un dénominateur commun pour 1/2 et 1/3.","it":"Scegli un denominatore comune per 1/2 e 1/3.","ru":"Выбери общий знаменатель для 1/2 и 1/3."},"choices":["common_denominator_5","common_denominator_6","common_denominator_8"],"visual_model":{"whole":"rectangle","parts":6}}',
   '{"type":"choice","value":"common_denominator_6"}','{}','["Find a number divisible by both 2 and 3.","Six is divisible by both denominators."]'),
  ('b3333333-3333-4333-8333-333333333333','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',3,'REPEAT','GUIDED_FRACTION',
   '{"prompt":{"ko":"3/6 + 2/6의 합을 기약분수로 입력하세요.","zh-CN":"输入3/6 + 2/6的最简结果。","ja":"3/6 + 2/6の答えを既約分数で入力しましょう。","en":"Enter 3/6 + 2/6 in simplest form.","es":"Escribe 3/6 + 2/6 en su forma más simple.","fr":"Écris 3/6 + 2/6 sous forme irréductible.","it":"Inserisci 3/6 + 2/6 in forma ridotta.","ru":"Запиши 3/6 + 2/6 в несократимом виде."},"expression":"3/6 + 2/6"}',
   '{"type":"fraction","numerator":5,"denominator":6}',
   '{"misconceptions":[{"type":"fraction","value":"2/5","code":"ADD_DENOMINATORS"}]}',
   '["The denominators already match.","Keep denominator 6 and add 3 + 2."]'),
  ('b4444444-4444-4444-8444-444444444444','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',4,'RECALL','FORMULA_RECALL',
   '{"prompt":{"ko":"공식을 기억해 빈칸을 채우세요: 분자는 무엇을 더하고, 분모는 무엇을 곱하나요?","zh-CN":"回忆公式：分子相加什么，分母相乘什么？","ja":"公式を思い出そう。分子では何を足し、分母では何を掛けますか？","en":"Recall the rule: what is added in the numerator and multiplied in the denominator?","es":"Recuerda la regla: ¿qué se suma en el numerador y qué se multiplica en el denominador?","fr":"Rappelle la règle : qu’additionne-t-on au numérateur et que multiplie-t-on au dénominateur ?","it":"Ricorda la regola: cosa si somma al numeratore e cosa si moltiplica al denominatore?","ru":"Вспомни правило: что складывают в числителе и перемножают в знаменателе?"},"notation":"a/b + c/d = (a*d + b*c)/(b*d)"}',
   '{"type":"formula_terms","fields":[{"name":"numerator_rule","value":"cross_products_sum"},{"name":"denominator_rule","value":"product"}]}',
   '{}','["Scale each numerator by the other denominator.","The numerator is a*d + b*c; the denominator is b*d."]'),
  ('b5555555-5555-4555-8555-555555555555','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',5,'APPLY','APPLICATION_FRACTION',
   '{"prompt":{"ko":"새 문제 1/2 + 1/5를 풀어 기약분수로 입력하세요.","zh-CN":"解决新问题1/2 + 1/5，并输入最简分数。","ja":"新しい問題1/2 + 1/5を解き、既約分数で入力しましょう。","en":"Solve 1/2 + 1/5 and enter the simplest fraction.","es":"Resuelve 1/2 + 1/5 y escribe la fracción simplificada.","fr":"Calcule 1/2 + 1/5 et écris la fraction irréductible.","it":"Risolvi 1/2 + 1/5 e inserisci la frazione ridotta.","ru":"Реши 1/2 + 1/5 и запиши несократимую дробь."},"expression":"1/2 + 1/5"}',
   '{"type":"fraction","numerator":7,"denominator":10}',
   '{"misconceptions":[{"type":"fraction","value":"2/7","code":"ADD_DENOMINATORS"}]}',
   '["Use a common denominator for 2 and 5.","Rewrite as 5/10 + 2/10."]');

COMMIT;
