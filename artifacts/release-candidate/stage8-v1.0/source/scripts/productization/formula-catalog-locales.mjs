export const FORMULA_CONTENT_LOCALES=Object.freeze(['ko','zh-CN','ja','en','es','fr','it','ru']);
const translated=(zh,ja,en,es,fr,it,ru)=>({'zh-CN':zh,ja,en,es,fr,it,ru});

export const FORMULA_TITLE_TRANSLATIONS={
  'kr.e1.number.compose':translated('数的合成与分解','数の合成と分解','Composing and decomposing numbers','Composición y descomposición de números','Composition et décomposition des nombres','Composizione e scomposizione dei numeri','Состав и разложение чисел'),
  'kr.e1.addition.meaning':translated('加法的意义','たし算の意味','Meaning of addition','Significado de la suma','Sens de l’addition','Significato dell’addizione','Смысл сложения'),
  'kr.e1.subtraction.meaning':translated('减法的意义','ひき算の意味','Meaning of subtraction','Significado de la resta','Sens de la soustraction','Significato della sottrazione','Смысл вычитания'),
  'kr.e1.equality':translated('等号与相等的量','等号と等しい量','Equality and equal quantities','Igualdad y cantidades iguales','Égalité et quantités égales','Uguaglianza e quantità uguali','Равенство и равные величины'),
  'kr.e1.repeating.pattern':translated('重复规律','くり返しの規則','Repeating patterns','Patrones repetitivos','Suites répétitives','Schemi ripetitivi','Повторяющиеся закономерности'),
  'kr.e1.length.compare':translated('长度比较','長さの比較','Comparing lengths','Comparación de longitudes','Comparaison des longueurs','Confronto delle lunghezze','Сравнение длин'),
  'kr.e2.place.value':translated('三位数的位值','3桁の数の位取り','Place value in three-digit numbers','Valor posicional de números de tres cifras','Valeur de position des nombres à trois chiffres','Valore posizionale nei numeri di tre cifre','Разряды трёхзначных чисел'),
  'kr.e2.addition.algorithm':translated('两位数加法','2桁のたし算','Two-digit addition','Suma de números de dos cifras','Addition de nombres à deux chiffres','Addizione di numeri a due cifre','Сложение двузначных чисел'),
  'kr.e2.subtraction.algorithm':translated('两位数减法','2桁のひき算','Two-digit subtraction','Resta de números de dos cifras','Soustraction de nombres à deux chiffres','Sottrazione di numeri a due cifre','Вычитание двузначных чисел'),
  'kr.e2.multiplication':translated('乘法与重复相加','かけ算と同じ数のくり返し','Multiplication as repeated addition','Multiplicación como suma repetida','Multiplication comme addition répétée','Moltiplicazione come addizione ripetuta','Умножение как повторное сложение'),
  'kr.e2.length.unit':translated('米和厘米','メートルとセンチメートル','Metres and centimetres','Metros y centímetros','Mètres et centimètres','Metri e centimetri','Метры и сантиметры'),
  'kr.e2.table.graph':translated('用表格和图表示','表とグラフで表す','Representing data with tables and graphs','Representación con tablas y gráficos','Représentation par tableaux et graphiques','Rappresentazione con tabelle e grafici','Представление таблицами и графиками'),
  'kr.e3.multiplication.algorithm':translated('乘法计算原理','かけ算の計算原理','Multiplication algorithm','Algoritmo de multiplicación','Algorithme de multiplication','Algoritmo della moltiplicazione','Алгоритм умножения'),
  'kr.e3.division.remainder':translated('除法的商和余数','わり算の商と余り','Quotient and remainder','Cociente y resto','Quotient et reste','Quoziente e resto','Частное и остаток'),
  'kr.e3.fraction.partwhole':translated('分数与部分整体','分数と部分・全体','Fractions as part and whole','Fracciones como parte y todo','Fractions comme partie et tout','Frazioni come parte e intero','Дроби как часть и целое'),
  'kr.e3.decimal.tenths':translated('小数与0.1','小数と0.1','Decimals and tenths','Decimales y décimas','Décimaux et dixièmes','Decimali e decimi','Десятичные дроби и десятые'),
  'kr.e3.length.convert':translated('千米和米','キロメートルとメートル','Kilometres and metres','Kilómetros y metros','Kilomètres et mètres','Chilometri e metri','Километры и метры'),
  'kr.e3.time.convert':translated('时间单位的关系','時間単位の関係','Relationships between time units','Relaciones entre unidades de tiempo','Relations entre unités de temps','Relazioni tra unità di tempo','Связи между единицами времени'),
  'kr.e4.large.place.value':translated('大数的位值','大きな数の位取り','Place value in large numbers','Valor posicional de números grandes','Valeur de position des grands nombres','Valore posizionale nei grandi numeri','Разряды больших чисел'),
  'kr.e4.long.division':translated('除以两位数','2桁の数でわる計算','Division by two-digit numbers','División entre números de dos cifras','Division par des nombres à deux chiffres','Divisione per numeri di due cifre','Деление на двузначные числа'),
  'kr.e4.fraction.same.denominator':translated('同分母分数的加减法','同分母分数のたし算とひき算','Adding and subtracting like fractions','Suma y resta de fracciones con igual denominador','Addition et soustraction de fractions de même dénominateur','Addizione e sottrazione di frazioni con lo stesso denominatore','Сложение и вычитание дробей с одинаковым знаменателем'),
  'kr.e4.decimal.add.subtract':translated('小数的加减法','小数のたし算とひき算','Adding and subtracting decimals','Suma y resta de decimales','Addition et soustraction des décimaux','Addizione e sottrazione dei decimali','Сложение и вычитание десятичных дробей'),
  'kr.e4.angle.turn':translated('角度与旋转','角度と回転','Angles and turns','Ángulos y giros','Angles et rotations','Angoli e rotazioni','Углы и повороты'),
  'kr.e4.bar.line.graph':translated('条形图与折线图','棒グラフと折れ線グラフ','Bar and line graphs','Gráficos de barras y de líneas','Diagrammes en barres et courbes','Grafici a barre e a linee','Столбчатые и линейные графики'),
  'kr.e5.factor.multiple':translated('因数与倍数','約数と倍数','Factors and multiples','Divisores y múltiplos','Diviseurs et multiples','Divisori e multipli','Делители и кратные'),
  'kr.e5.fraction.unlike.add':translated('异分母分数加法','異分母分数のたし算','Adding unlike fractions','Suma de fracciones con distinto denominador','Addition de fractions de dénominateurs différents','Addizione di frazioni con denominatori diversi','Сложение дробей с разными знаменателями'),
  'kr.e5.fraction.multiply':translated('分数乘法','分数のかけ算','Multiplying fractions','Multiplicación de fracciones','Multiplication des fractions','Moltiplicazione delle frazioni','Умножение дробей'),
  'kr.e5.decimal.multiply':translated('小数乘法','小数のかけ算','Multiplying decimals','Multiplicación de decimales','Multiplication des décimaux','Moltiplicazione dei decimali','Умножение десятичных дробей'),
  'kr.e5.plane.area':translated('多边形的面积','多角形の面積','Area of polygons','Área de polígonos','Aire des polygones','Area dei poligoni','Площадь многоугольников'),
  'kr.e5.average':translated('平均数','平均','Mean','Media','Moyenne','Media','Среднее арифметическое'),
  'kr.e6.fraction.divide':translated('分数除法','分数のわり算','Dividing fractions','División de fracciones','Division des fractions','Divisione delle frazioni','Деление дробей'),
  'kr.e6.decimal.divide':translated('小数除法','小数のわり算','Dividing decimals','División de decimales','Division des décimaux','Divisione dei decimali','Деление десятичных дробей'),
  'kr.e6.ratio.rate':translated('比和比率','比と割合','Ratio and rate','Razón y tasa','Rapport et taux','Rapporto e tasso','Отношение и доля'),
  'kr.e6.proportion':translated('比例式','比例式','Proportion','Proporción','Proportion','Proporzione','Пропорция'),
  'kr.e6.circle':translated('圆的周长和面积','円周と面積','Circumference and area of a circle','Longitud y área del círculo','Circonférence et aire du cercle','Circonferenza e area del cerchio','Длина окружности и площадь круга'),
  'kr.e6.prism.volume':translated('长方体与棱柱的体积','直方体と角柱の体積','Volume of cuboids and prisms','Volumen de ortoedros y prismas','Volume des pavés droits et prismes','Volume di parallelepipedi e prismi','Объём прямоугольных параллелепипедов и призм'),
  'kr.m1.prime.factorization':translated('质因数分解与因数','素因数分解と約数','Prime factorization and divisors','Factorización prima y divisores','Décomposition en facteurs premiers et diviseurs','Scomposizione in fattori primi e divisori','Разложение на простые множители и делители'),
  'kr.m1.integer.rational.ops':translated('整数与有理数的四则运算','整数と有理数の四則計算','Operations with integers and rational numbers','Operaciones con enteros y racionales','Opérations sur les entiers et les rationnels','Operazioni con interi e razionali','Действия с целыми и рациональными числами'),
  'kr.m1.linear.equation':translated('一元一次方程','一次方程式','Linear equations','Ecuaciones lineales','Équations linéaires','Equazioni lineari','Линейные уравнения'),
  'kr.m1.direct.inverse':translated('正比例与反比例','比例と反比例','Direct and inverse proportion','Proporcionalidad directa e inversa','Proportionnalité directe et inverse','Proporzionalità diretta e inversa','Прямая и обратная пропорциональность'),
  'kr.m1.polygon.angle':translated('多边形的角','多角形の角','Angles in polygons','Ángulos de polígonos','Angles des polygones','Angoli dei poligoni','Углы многоугольников'),
  'kr.m1.solid.measure':translated('立体图形的表面积与体积','立体図形の表面積と体積','Surface area and volume of solids','Área y volumen de sólidos','Aire et volume des solides','Area e volume dei solidi','Площадь поверхности и объём тел'),
  'kr.m2.repeating.decimal':translated('循环小数与分数','循環小数と分数','Repeating decimals and fractions','Decimales periódicos y fracciones','Décimaux périodiques et fractions','Decimali periodici e frazioni','Периодические десятичные дроби и обыкновенные дроби'),
  'kr.m2.exponent.laws':translated('指数定律','指数法則','Laws of exponents','Leyes de los exponentes','Règles des puissances','Proprietà delle potenze','Свойства степеней'),
  'kr.m2.linear.inequality.system':translated('一次不等式与二元一次方程组','一次不等式と連立一次方程式','Linear inequalities and simultaneous equations','Inecuaciones lineales y sistemas de ecuaciones','Inéquations linéaires et systèmes d’équations','Disequazioni lineari e sistemi di equazioni','Линейные неравенства и системы уравнений'),
  'kr.m2.linear.function':translated('一次函数','一次関数','Linear functions','Funciones lineales','Fonctions affines','Funzioni lineari','Линейные функции'),
  'kr.m2.pythagoras.similarity':translated('勾股定理与相似','三平方の定理と相似','Pythagorean theorem and similarity','Teorema de Pitágoras y semejanza','Théorème de Pythagore et similitude','Teorema di Pitagora e similitudine','Теорема Пифагора и подобие'),
  'kr.m2.probability':translated('计数与概率','場合の数と確率','Counting and probability','Conteo y probabilidad','Dénombrement et probabilités','Calcolo combinatorio e probabilità','Комбинаторика и вероятность'),
  'kr.m3.radical':translated('平方根运算','平方根の計算','Operations with square roots','Operaciones con raíces cuadradas','Calculs avec les racines carrées','Operazioni con le radici quadrate','Действия с квадратными корнями'),
  'kr.m3.identities.factor':translated('乘法公式与因式分解','展開公式と因数分解','Algebraic identities and factorization','Identidades algebraicas y factorización','Identités remarquables et factorisation','Prodotti notevoli e scomposizione','Формулы сокращённого умножения и разложение на множители'),
  'kr.m3.quadratic.equation':translated('二次方程求根公式','二次方程式の解の公式','Quadratic formula','Fórmula cuadrática','Formule quadratique','Formula risolutiva dell’equazione di secondo grado','Формула корней квадратного уравнения'),
  'kr.m3.quadratic.function':translated('二次函数的顶点','二次関数の頂点','Vertex of a quadratic function','Vértice de una función cuadrática','Sommet d’une fonction quadratique','Vertice di una funzione quadratica','Вершина квадратичной функции'),
  'kr.m3.trigonometry.circle':translated('三角比与圆周角','三角比と円周角','Trigonometric ratios and circle angles','Razones trigonométricas y ángulos del círculo','Rapports trigonométriques et angles du cercle','Rapporti trigonometrici e angoli del cerchio','Тригонометрические отношения и углы окружности'),
  'kr.m3.distribution':translated('方差、标准差与分布','分散・標準偏差と分布','Variance, standard deviation, and distribution','Varianza, desviación estándar y distribución','Variance, écart type et distribution','Varianza, deviazione standard e distribuzione','Дисперсия, стандартное отклонение и распределение'),
  'kr.h1.polynomial':translated('多项式运算与恒等式','多項式の演算と恒等式','Polynomial operations and identities','Operaciones e identidades polinómicas','Opérations et identités polynomiales','Operazioni e identità polinomiali','Операции с многочленами и тождества'),
  'kr.h1.remainder.factor':translated('余式定理与因式定理','剰余の定理と因数定理','Remainder and factor theorems','Teoremas del resto y del factor','Théorèmes du reste et du facteur','Teoremi del resto e del fattore','Теоремы об остатке и множителе'),
  'kr.h1.quadratic.complex':translated('复数与二次方程','複素数と二次方程式','Complex numbers and quadratic equations','Números complejos y ecuaciones cuadráticas','Nombres complexes et équations quadratiques','Numeri complessi ed equazioni quadratiche','Комплексные числа и квадратные уравнения'),
  'kr.h1.permutation.combination':translated('排列与组合','順列と組合せ','Permutations and combinations','Permutaciones y combinaciones','Permutations et combinaisons','Permutazioni e combinazioni','Перестановки и сочетания'),
  'kr.h1.matrix':translated('矩阵运算','行列の演算','Matrix operations','Operaciones con matrices','Opérations matricielles','Operazioni con matrici','Операции с матрицами'),
  'kr.h1.coordinate.function':translated('坐标图形与函数','座標図形と関数','Coordinate geometry and functions','Geometría analítica y funciones','Géométrie analytique et fonctions','Geometria analitica e funzioni','Координатная геометрия и функции'),
  'kr.h2.exponential.log':translated('指数与对数','指数と対数','Exponents and logarithms','Exponentes y logaritmos','Exponentielles et logarithmes','Esponenziali e logaritmi','Степени и логарифмы'),
  'kr.h2.trigonometric':translated('三角函数与三角形','三角関数と三角形','Trigonometric functions and triangles','Funciones trigonométricas y triángulos','Fonctions trigonométriques et triangles','Funzioni trigonometriche e triangoli','Тригонометрические функции и треугольники'),
  'kr.h2.sequence':translated('等差、等比数列及其和','等差・等比数列と和','Arithmetic and geometric sequences and sums','Sucesiones aritméticas y geométricas y sus sumas','Suites arithmétiques et géométriques et leurs sommes','Progressioni aritmetiche e geometriche e somme','Арифметические и геометрические прогрессии и суммы'),
  'kr.h2.limit.derivative':translated('函数极限与导数','関数の極限と微分','Limits and derivatives','Límites y derivadas','Limites et dérivées','Limiti e derivate','Пределы и производные'),
  'kr.h2.integral':translated('不定积分与定积分','不定積分と定積分','Indefinite and definite integrals','Integrales indefinidas y definidas','Intégrales indéfinies et définies','Integrali indefiniti e definiti','Неопределённые и определённые интегралы'),
  'kr.h2.probability.statistics':translated('条件概率与概率分布','条件付き確率と確率分布','Conditional probability and probability distributions','Probabilidad condicional y distribuciones','Probabilité conditionnelle et lois de probabilité','Probabilità condizionata e distribuzioni','Условная вероятность и распределения'),
  'kr.h3.sequence.limit':translated('数列极限与级数','数列の極限と級数','Limits of sequences and series','Límites de sucesiones y series','Limites de suites et séries','Limiti di successioni e serie','Пределы последовательностей и ряды'),
  'kr.h3.transcendental.derivative':translated('多种函数的导数','さまざまな関数の微分','Derivatives of various functions','Derivadas de diversas funciones','Dérivées de fonctions usuelles','Derivate di varie funzioni','Производные различных функций'),
  'kr.h3.advanced.integral':translated('换元积分与分部积分','置換積分と部分積分','Integration by substitution and by parts','Integración por sustitución y por partes','Intégration par changement de variable et par parties','Integrazione per sostituzione e per parti','Интегрирование заменой переменной и по частям'),
  'kr.h3.conic':translated('圆锥曲线','二次曲線','Conic sections','Secciones cónicas','Coniques','Sezioni coniche','Конические сечения'),
  'kr.h3.vector':translated('向量与点积','ベクトルと内積','Vectors and dot products','Vectores y producto escalar','Vecteurs et produit scalaire','Vettori e prodotto scalare','Векторы и скалярное произведение'),
  'kr.h3.space.geometry':translated('空间坐标与球面','空間座標と球','Three-dimensional coordinates and spheres','Coordenadas espaciales y esferas','Coordonnées dans l’espace et sphères','Coordinate nello spazio e sfere','Пространственные координаты и сферы')
};

const localeNeutralNotation={
  'kr.e1.equality':'a = b',
  'kr.e1.length.compare':'l₁ > l₂',
  'kr.e2.addition.algorithm':'(10a+b)+(10c+d)',
  'kr.e2.subtraction.algorithm':'(10a+b)−(10c+d)',
  'kr.e2.multiplication':'a×b = Σᵢ₌₁ᵇ a',
  'kr.e2.table.graph':'N = Σnᵢ',
  'kr.e3.fraction.partwhole':'f = p/n',
  'kr.e4.long.division':'a = bq+r, 0≤r<b',
  'kr.e4.decimal.add.subtract':'10ᵏ(x±y)=10ᵏx±10ᵏy',
  'kr.e4.angle.turn':'1/2 = 180°, 1 = 360°',
  'kr.e4.bar.line.graph':'Δy = y₂−y₁',
  'kr.e5.factor.multiple':'a=bk ⇒ b∣a',
  'kr.e5.decimal.multiply':'d(xy)=d(x)+d(y)',
  'kr.e5.plane.area':'A₁=wh; A₂=bh; A₃=bh/2; A₄=(a+b)h/2',
  'kr.e5.average':'x̄ = Σxᵢ/n',
  'kr.e6.decimal.divide':'(10ᵏa)/(10ᵏb)=a/b',
  'kr.e6.ratio.rate':'r = a/b',
  'kr.e6.prism.volume':'V=Bh; V=lwh',
  'kr.m1.prime.factorization':'n=∏pᵢ^aᵢ; τ(n)=∏(aᵢ+1)',
  'kr.m1.polygon.angle':'Σα=(n−2)×180°; Σβ=360°',
  'kr.m1.solid.measure':'V₁=Bh; V₂=Bh/3; V₃=4πr³/3; S₃=4πr²',
  'kr.m2.linear.function':'y=ax+b; a=(y₂−y₁)/(x₂−x₁)',
  'kr.m2.pythagoras.similarity':'a²+b²=c²; a₁/a₂=b₁/b₂=c₁/c₂',
  'kr.m2.probability':'P(A)=|A|/|Ω|',
  'kr.m3.quadratic.function':'y=a(x−p)²+q ⇒ (p,q)',
  'kr.m3.trigonometry.circle':'sinθ=a/c; cosθ=b/c; tanθ=a/b',
  'kr.m3.distribution':'Var(X)=Σ(xᵢ−x̄)²/n; σ=√Var(X)',
  'kr.h1.coordinate.function':'d=√((x₂−x₁)²+(y₂−y₁)²); (x−a)²+(y−b)²=r²',
  'kr.h3.conic':'y²=4px; x²/a²+y²/b²=1; x²/a²−y²/b²=1',
  'kr.h3.space.geometry':'d=√Σ(xᵢ−yᵢ)²; (x−a)²+(y−b)²+(z−c)²=r²'
};

export function displayNotationFor(formula,locale){
  if(locale==='ko')return formula.notation;
  const notation=localeNeutralNotation[formula.semantic_key]??formula.notation;
  if(/[가-힣]/.test(notation))throw new Error(`NON_LOCALIZED_NOTATION:${formula.semantic_key}`);
  return notation;
}

const contentTemplates={
  'zh-CN':{explanation:'理解并应用“{title}”的关系 {notation}，同时检查数值、单位和适用条件。',recall:'请选择最符合“{title}”核心关系的表达式。',steps:['确认已知量和未知量。','用符号和公式表示关系。','代入并检查计算、单位和条件。'],misconceptions:['只记符号而不说明关系。','忽略适用条件或单位。'],chakchaki:'检查先备概念，并用图示和学习者语言连接关系。',gongsickyi:'定义符号、推导公式，并检查代入、计算和单位。'},
  ja:{explanation:'「{title}」の関係 {notation} を理解して適用し、値・単位・適用条件を確認します。',recall:'「{title}」の中心となる関係として正しい式を選んでください。',steps:['既知量と未知量を確認する。','関係を記号と式で表す。','代入し、計算・単位・条件を確認する。'],misconceptions:['記号だけを暗記し、関係を説明できない。','適用条件や単位を確認しない。'],chakchaki:'前提概念を確認し、図と学習者の言葉で関係をつなぎます。',gongsickyi:'記号を定義して公式を導き、代入・計算・単位を確認します。'},
  en:{explanation:'Understand and apply the relationship {notation} for “{title}”, checking values, units, and conditions.',recall:'Choose the expression that best represents the core relationship in “{title}”.',steps:['Identify the known and unknown quantities.','Represent the relationship with symbols and a formula.','Substitute and check the calculation, units, and conditions.'],misconceptions:['Memorizing symbols without explaining the relationship.','Ignoring an application condition or unit.'],chakchaki:'Checks prerequisite ideas and connects the relationship through visuals and learner language.',gongsickyi:'Defines symbols, derives the formula, and verifies substitution, calculation, and units.'},
  es:{explanation:'Comprende y aplica la relación {notation} de «{title}», comprobando valores, unidades y condiciones.',recall:'Elige la expresión que mejor representa la relación principal de «{title}».',steps:['Identifica las cantidades conocidas y desconocidas.','Representa la relación con símbolos y una fórmula.','Sustituye y comprueba el cálculo, las unidades y las condiciones.'],misconceptions:['Memorizar símbolos sin explicar la relación.','Ignorar una condición de aplicación o una unidad.'],chakchaki:'Comprueba los conocimientos previos y conecta la relación con imágenes y el lenguaje del estudiante.',gongsickyi:'Define símbolos, deduce la fórmula y verifica sustitución, cálculo y unidades.'},
  fr:{explanation:'Comprends et applique la relation {notation} de « {title} », en vérifiant les valeurs, les unités et les conditions.',recall:'Choisis l’expression qui représente le mieux la relation essentielle de « {title} ».',steps:['Identifier les quantités connues et inconnues.','Représenter la relation avec des symboles et une formule.','Substituer puis vérifier le calcul, les unités et les conditions.'],misconceptions:['Mémoriser les symboles sans expliquer la relation.','Ignorer une condition d’application ou une unité.'],chakchaki:'Vérifie les prérequis et relie la relation par des visuels et les mots de l’élève.',gongsickyi:'Définit les symboles, établit la formule et vérifie la substitution, le calcul et les unités.'},
  it:{explanation:'Comprendi e applica la relazione {notation} di «{title}», controllando valori, unità e condizioni.',recall:'Scegli l’espressione che rappresenta meglio la relazione fondamentale di «{title}».',steps:['Individua le quantità note e incognite.','Rappresenta la relazione con simboli e una formula.','Sostituisci e controlla calcolo, unità e condizioni.'],misconceptions:['Memorizzare i simboli senza spiegare la relazione.','Ignorare una condizione di applicazione o un’unità.'],chakchaki:'Controlla i prerequisiti e collega la relazione con immagini e parole dello studente.',gongsickyi:'Definisce i simboli, ricava la formula e verifica sostituzione, calcolo e unità.'},
  ru:{explanation:'Пойми и примени соотношение {notation} для темы «{title}», проверяя значения, единицы и условия.',recall:'Выбери выражение, которое лучше всего передаёт основное соотношение темы «{title}».',steps:['Определи известные и неизвестные величины.','Запиши соотношение символами и формулой.','Подставь значения и проверь вычисления, единицы и условия.'],misconceptions:['Запоминать символы, не объясняя соотношение.','Игнорировать условие применимости или единицу.'],chakchaki:'Проверяет предварительные знания и связывает соотношение с наглядностью и языком ученика.',gongsickyi:'Определяет символы, выводит формулу и проверяет подстановку, вычисления и единицы.'}
};

const fill=(template,values)=>template.replaceAll('{title}',values.title).replaceAll('{notation}',values.notation);
export function localizeFormulaContent({semantic_key,notation},locale){
  const title=FORMULA_TITLE_TRANSLATIONS[semantic_key]?.[locale];
  const template=contentTemplates[locale];
  if(!title||!template)throw new Error(`MISSING_FORMULA_TRANSLATION:${semantic_key}:${locale}`);
  const display_notation=displayNotationFor({semantic_key,notation},locale);
  return {title,display_notation,explanation:fill(template.explanation,{title,notation:display_notation}),recall_prompt:fill(template.recall,{title,notation:display_notation}),derivation_steps:template.steps,misconception_notes:template.misconceptions,chakchaki_strategy:template.chakchaki,gongsickyi_strategy:template.gongsickyi};
}

export function assertFormulaTitleTranslations(formulas){
  if(formulas.length!==72||Object.keys(FORMULA_TITLE_TRANSLATIONS).length!==72)throw new Error('FORMULA_TRANSLATION_COVERAGE');
  for(const formula of formulas)for(const locale of FORMULA_CONTENT_LOCALES.filter((item)=>item!=='ko'))localizeFormulaContent(formula,locale);
}
