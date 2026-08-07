const task=(kind,exercise,acceptedValues,{type='NUMBER',units=[],misconceptions=[]}={})=>({
  kind,exercise,response_type:type,accepted_values:acceptedValues,
  ...(units.length?{accepted_units:units}:{}),misconceptions
});
const calc=(exercise,answers,options)=>task('CALCULATION',exercise,answers,options);
const word=(exercise,answers,options)=>task('WORD_PROBLEM',exercise,answers,options);
const reason=(exercise,answers,options)=>task('REPRESENTATION_REASONING',exercise,answers,options);
const unit=(exercise,answers,units,options={})=>task('UNIT_REASONING',exercise,answers,{...options,units});
const wrong=(values,code)=>({values,code});

export const APPLICATION_TASK_BANK={
  'kr.e1.number.compose':[
    reason('7 = 3 + □',['4']),reason('10 = □ + 6',['4']),reason('□ = 5 + 4',['9'])],
  'kr.e1.addition.meaning':[
    calc('2 + 3',['5']),word('7 + 4',['11']),calc('9 + 8',['17'])],
  'kr.e1.subtraction.meaning':[
    calc('8 − 3',['5']),calc('12 − 7',['5']),calc('20 − 13',['7'])],
  'kr.e1.equality':[
    reason('3 + 4 = □ + 2',['5']),reason('8 − 3 = 2 + □',['3']),reason('□ + 6 = 10 + 2',['6'])],
  'kr.e1.repeating.pattern':[
    reason('1, 2, 1, 2, □',['1']),reason('3, 5, 3, 5, □',['3']),reason('2, 4, 6, 2, 4, □',['6'])],
  'kr.e1.length.compare':[
    unit('12 cm − 9 cm',['3'],['cm']),unit('18 cm − 11 cm',['7'],['cm']),unit('25 cm − 16 cm',['9'],['cm'])],

  'kr.e2.place.value':[
    reason('352 = 300 + 50 + □',['2']),reason('274 = 200 + □ + 4',['70']),reason('608 = □ + 8',['600'])],
  'kr.e2.addition.algorithm':[
    calc('36 + 27',['63']),calc('148 + 275',['423']),calc('596 + 387',['983'])],
  'kr.e2.subtraction.algorithm':[
    calc('74 − 28',['46']),calc('402 − 176',['226']),calc('900 − 458',['442'])],
  'kr.e2.multiplication':[
    calc('4 × 3',['12']),calc('7 × 6',['42']),calc('9 × 8',['72'])],
  'kr.e2.length.unit':[
    unit('2 m = □ cm',['200'],['cm']),word('350 cm = □ m',['3.5'],{units:['m']}),unit('4 m 25 cm = □ cm',['425'],['cm'])],
  'kr.e2.table.graph':[
    calc('4 + 7 + 5',['16']),calc('12 + 9 + 14',['35']),reason('40 − (8 + 11 + 7)',['14'])],

  'kr.e3.multiplication.algorithm':[
    calc('23 × 4',['92']),calc('146 × 3',['438']),calc('208 × 7',['1456'])],
  'kr.e3.division.remainder':[
    calc('32 ÷ 4',['8']),word('29 = 4q + 1, q = □',['7']),reason('29 = 4 × 7 + r',['1'],{misconceptions:[wrong(['7'],'QUOTIENT_REMAINDER_CONFUSION')]})],
  'kr.e3.fraction.partwhole':[
    reason('□ = 3/8',['3/8'],{type:'FRACTION'}),reason('□/10 = 0.4',['4']),reason('5/12 = □/12',['5'])],
  'kr.e3.decimal.tenths':[
    reason('7/10 = □',['0.7']),reason('0.9 = □/10',['9']),calc('0.3 + 0.4',['0.7'])],
  'kr.e3.length.convert':[
    unit('3 km = □ m',['3000'],['m']),unit('4500 m = □ km',['4.5'],['km']),unit('2 km 350 m = □ m',['2350'],['m'])],
  'kr.e3.time.convert':[
    unit('2 h = □ min',['120'],['min']),unit('180 s = □ min',['3'],['min']),unit('1 h 25 min = □ min',['85'],['min'])],

  'kr.e4.large.place.value':[
    reason('50,704 = 50,000 + □ + 4',['700']),reason('306,020 = 3×100,000 + □×10,000 + 6×1,000 + 2×10',['0']),reason('8 × 100,000 + 3 × 1,000 + 6',['803006'])],
  'kr.e4.long.division':[
    calc('936 ÷ 6',['156']),reason('725 = 8q + 5, q = □',['90']),reason('725 = 8 × 90 + r',['5'])],
  'kr.e4.fraction.same.denominator':[
    calc('3/8 + 2/8',['5/8'],{type:'FRACTION',misconceptions:[wrong(['5/16'],'ADDED_DENOMINATORS')]}),word('7/10 − 3/10',['2/5','4/10'],{type:'FRACTION'}),reason('□/12 + 5/12 = 11/12',['6'])],
  'kr.e4.decimal.add.subtract':[
    calc('3.45 + 1.2',['4.65']),calc('8.0 − 2.76',['5.24']),calc('12.35 + 0.8 − 4.1',['9.05'])],
  'kr.e4.angle.turn':[
    unit('360° × 1/2',['180'],['°']),unit('360° × 3/4',['270'],['°']),unit('360° × 2.5',['900'],['°'])],
  'kr.e4.bar.line.graph':[
    calc('18 − 12',['6']),calc('35 − 47',['-12']),reason('24 + 17 = □',['41'])],

  'kr.e5.factor.multiple':[
    reason('gcd(12,18)',['6']),reason('lcm(8,12)',['24']),reason('τ(36)',['9'])],
  'kr.e5.fraction.unlike.add':[
    calc('1/2 + 1/3',['5/6'],{type:'FRACTION'}),calc('3/4 − 2/5',['7/20'],{type:'FRACTION'}),calc('5/6 + 7/9',['29/18','1 11/18'],{type:'FRACTION'})],
  'kr.e5.fraction.multiply':[
    calc('2/3 × 3/5',['2/5'],{type:'FRACTION'}),calc('7/8 × 4/21',['1/6'],{type:'FRACTION'}),calc('1 1/2 × 2 2/3',['4'],{type:'FRACTION'})],
  'kr.e5.decimal.multiply':[
    calc('2.4 × 3',['7.2']),calc('1.25 × 0.8',['1']),calc('3.06 × 2.5',['7.65'])],
  'kr.e5.plane.area':[
    unit('A = 8 cm × 5 cm',['40'],['cm²','cm2','㎠'],{misconceptions:[wrong(['26'],'USED_PERIMETER')]}),word('A = 10 cm × 6 cm ÷ 2',['30'],{units:['cm²','cm2','㎠'],misconceptions:[wrong(['60'],'MISSED_HALF')]}),unit('A = (6 cm + 10 cm) × 4 cm ÷ 2',['32'],['cm²','cm2','㎠'],{misconceptions:[wrong(['64'],'MISSED_HALF')]})],
  'kr.e5.average':[
    calc('(6 + 8 + 10) ÷ 3',['8']),calc('(12 + 15 + 18 + 19) ÷ 4',['16']),reason('(7 + 9 + □) ÷ 3 = 10',['14'])],

  'kr.e6.fraction.divide':[
    calc('2/3 ÷ 4/5',['5/6'],{type:'FRACTION'}),calc('7/8 ÷ 14/15',['15/16'],{type:'FRACTION'}),calc('1 1/2 ÷ 3/4',['2'],{type:'FRACTION'})],
  'kr.e6.decimal.divide':[
    calc('7.2 ÷ 0.6',['12']),calc('4.375 ÷ 1.25',['3.5']),calc('12.6 ÷ 0.035',['360'])],
  'kr.e6.ratio.rate':[
    calc('15 ÷ 20',['0.75','.75']),word('18 ÷ 30 × 100',['60'],{units:['%']}),reason('3 : 5 = □ : 20',['12'])],
  'kr.e6.proportion':[
    reason('3 : 5 = x : 20',['12']),reason('7 : x = 21 : 36',['12']),reason('4 : 9 = 28 : x',['63'])],
  'kr.e6.circle':[
    reason('C, r = 3',['6π'],{type:'TEXT'}),reason('A, r = 3',['9π'],{type:'TEXT'}),reason('A, d = 8',['16π'],{type:'TEXT'})],
  'kr.e6.prism.volume':[
    unit('V = 4 cm × 3 cm × 5 cm',['60'],['cm³','cm3','㎤']),unit('V = 18 cm² × 7 cm',['126'],['cm³','cm3','㎤']),unit('V = 2.5 m × 1.2 m × 4 m',['12'],['m³','m3'])],

  'kr.m1.prime.factorization':[
    reason('τ(12), 12 = 2² × 3',['6']),reason('gcd(72,120)',['24']),reason('lcm(84,126)',['252'])],
  'kr.m1.integer.rational.ops':[
    calc('(-7) × 6',['-42']),calc('(-8) × (-9) ÷ 6',['12']),calc('(-3/4) ÷ (9/8)',['-2/3'],{type:'FRACTION'})],
  'kr.m1.linear.equation':[
    reason('3x + 5 = 20',['5']),word('4x + 2000 = 10000',['2000']),reason('-2x + 7 = 15',['-4'],{misconceptions:[wrong(['4'],'SIGN_ERROR')]})],
  'kr.m1.direct.inverse':[
    reason('y = 3x, x = 7',['21']),reason('y = 24/x, x = 6',['4']),reason('y = ax, x = 5, y = 35: a',['7'])],
  'kr.m1.polygon.angle':[
    unit('(5 − 2) × 180°',['540'],['°']),unit('360° ÷ 8',['45'],['°']),unit('180° − 360° ÷ 12',['150'],['°'])],
  'kr.m1.solid.measure':[
    unit('V = Bh, B = 12 cm², h = 5 cm',['60'],['cm³','cm3']),unit('V = Bh/3, B = 27π cm², h = 4 cm',['36π'],['cm³','cm3'],{type:'TEXT'}),unit('V = 4πr³/3, r = 3 cm',['36π'],['cm³','cm3'],{type:'TEXT'})],

  'kr.m2.repeating.decimal':[
    reason('0.333…',['1/3'],{type:'FRACTION'}),reason('0.272727…',['3/11'],{type:'FRACTION'}),reason('0.1666…',['1/6'],{type:'FRACTION'})],
  'kr.m2.exponent.laws':[
    reason('2³ × 2⁴ = 2^□',['7']),reason('x⁹ ÷ x⁴ = x^□',['5']),reason('(a³)⁵ = a^□',['15'])],
  'kr.m2.linear.inequality.system':[
    reason('x∈ℤ, 3x + 2 < 14, max(x) = □',['3']),reason('x + y = 7, x − y = 1: x',['4']),reason('2x + 3y = 13, x + y = 5: x',['2'])],
  'kr.m2.linear.function':[
    reason('y = 3x − 2, x = 5',['13']),reason('(11 − 3) ÷ (5 − 1)',['2']),reason('9 = 4 × 2 + b',['1'])],
  'kr.m2.pythagoras.similarity':[
    reason('√(3² + 4²)',['5']),word('√((6 m)² + (8 m)²)',['10'],{units:['m']}),reason('√(13² − 5²)',['12'])],
  'kr.m2.probability':[
    reason('P({2,4,6} | {1,2,3,4,5,6})',['1/2'],{type:'FRACTION'}),reason('2 ÷ (2 + 3)',['2/5'],{type:'FRACTION'}),reason('2 ÷ 4',['1/2'],{type:'FRACTION'})],

  'kr.m3.radical':[
    reason('√81',['9']),reason('√50 ÷ √2',['5']),reason('√((-7)²)',['7'])],
  'kr.m3.identities.factor':[
    calc('101² − 99²',['400']),reason('(x + 5)² = x² + □x + 25',['10']),reason('x² − 49 = (x − 7)(x + □)',['7'])],
  'kr.m3.quadratic.equation':[
    reason('x² − 5x + 6 = 0',['2,3','3,2'],{type:'TEXT'}),word('x(x + 2) = 48, x > 0',['6']),reason('D = 4² − 4×1×5 = −4, Nℝ = □',['0'])],
  'kr.m3.quadratic.function':[
    reason('y = 2(x − 3)² + 5, (p,q) = (□,5)',['3']),reason('y = −(x + 2)² + 7, max(y) = □',['7']),reason('y = (x − 3)² + 2, min(y) = □',['2'])],
  'kr.m3.trigonometry.circle':[
    reason('20 × 3/5',['12']),reason('26 × 12/13',['24']),reason('16 × 3/4',['12'])],
  'kr.m3.distribution':[
    reason('(2 + 4 + 6) ÷ 3',['4']),reason('((2−4)² + (4−4)² + (6−4)²) ÷ 3',['8/3','2.6666666667'],{type:'TEXT'}),reason('√9',['3'])],

  'kr.h1.polynomial':[
    calc('(2 + 1)³',['27']),reason('(a + b)³ = a³ + □a²b + 3ab² + b³',['3']),reason('(x + 2)³, x = 0',['8'])],
  'kr.h1.remainder.factor':[
    reason('P(x)=x²+3x+2, P(1)',['6']),reason('P(x)=x³−8: P(2)',['0']),reason('P(x)=x³+kx−6, P(2)=0: k',['-1'])],
  'kr.h1.quadratic.complex':[
    reason('i²',['-1']),reason('i⁷',['-i'],{type:'TEXT'}),reason('x² + 1 = 0',['i,-i','-i,i'],{type:'TEXT'})],
  'kr.h1.permutation.combination':[
    reason('5C2',['10']),word('6C3',['20']),reason('7P2',['42'])],
  'kr.h1.matrix':[
    reason('([[1,2],[3,4]] + [[2,0],[1,5]])₂₂',['9']),reason('1×2 + 2×1',['4']),reason('([[2,1],[0,3]]²)₁₂',['5'])],
  'kr.h1.coordinate.function':[
    reason('√((3−0)² + (4−0)²)',['5']),reason('(x−2)²+(y+1)²=25, r=□',['5']),reason('(-2 + 4) ÷ 2',['1'])],

  'kr.h2.exponential.log':[
    reason('log₂ 32',['5']),reason('log₃ 9 + log₃ 27',['5']),reason('2^x = 16',['4'])],
  'kr.h2.trigonometric':[
    reason('a=3, b=4, C=90°: c',['5']),reason('a=5, A=30°, B=90°: b',['10']),reason('a=b=1, C=60°: c',['1'])],
  'kr.h2.sequence':[
    reason('a₁=3, d=4: a₁₀',['39']),reason('1+3+5+…+19',['100']),reason('a₁=2, r=3: a₅',['162'])],
  'kr.h2.limit.derivative':[
    reason("f(x)=x²+3x: f'(2)",['7']),word("s(t)=t²+2t: s'(3)",['8'],{units:['m/s']}),reason("f(x)=x³: f'(2)",['12'])],
  'kr.h2.integral':[
    reason('∫₀² x dx',['2']),reason('∫₁³ 2x dx',['8']),reason("F'(x)=3x², F(0)=2: F(2)",['10'])],
  'kr.h2.probability.statistics':[
    reason('P(A∩B)=0.2, P(B)=0.5: P(A|B)',['0.4','.4']),reason('E(X) = 0×0.3 + 1×0.7',['0.7','.7']),reason('E(X) = np, n=4, p=0.5',['2'])],

  'kr.h3.sequence.limit':[
    reason('1 + 1/2 + 1/4 + …',['2']),reason('3 + 1 + 1/3 + …',['9/2','4.5'],{type:'TEXT'}),reason('10 = 5/(1−r)',['0.5','.5'])],
  'kr.h3.transcendental.derivative':[
    reason("f(x)=e^x: f'(0)",['1']),reason("f(x)=ln x: f'(2)",['1/2','0.5'],{type:'TEXT'}),reason("f(x)=sin x: f'(0)",['1'])],
  'kr.h3.advanced.integral':[
    reason('∫ 2x cos(x²) dx',['sin(x²)+C','sin x²+C'],{type:'TEXT'}),reason('∫ x e^x dx',['e^x(x−1)+C','(x−1)e^x+C'],{type:'TEXT'}),reason('∫₀¹ 3x² dx',['1'])],
  'kr.h3.conic':[
    reason('y²=4px=12x, p=□',['3']),reason('x²/25 + y²/9 = 1, a=□',['5']),reason('x²/16 − y²/9 = 1, a=□',['4'])],
  'kr.h3.vector':[
    reason('(1,2) · (3,4)',['11']),word('(3,4) N · (2,0) m',['6'],{units:['J']}),reason('(2,−1) · (1,2)',['0'])],
  'kr.h3.space.geometry':[
    reason('√((1−0)² + (2−0)² + (2−0)²)',['3']),reason('(x−1)²+(y+2)²+(z−3)²=16, r=□',['4']),reason('(3 + 7) ÷ 2',['5'])]
};

export function assertApplicationTaskBank(formulas){
  const formulaKeys=new Set(formulas.map((item)=>item.semantic_key));
  const bankKeys=Object.keys(APPLICATION_TASK_BANK);
  if(formulaKeys.size!==72||bankKeys.length!==72)throw new Error(`FORMULA_COVERAGE:${formulaKeys.size}/${bankKeys.length}`);
  for(const key of formulaKeys){
    const tasks=APPLICATION_TASK_BANK[key];
    if(!tasks||tasks.length!==3)throw new Error(`TASK_COVERAGE:${key}`);
    tasks.forEach((item,index)=>{
      if(!item.exercise||!item.accepted_values.length)throw new Error(`TASK_SHAPE:${key}:${index+1}`);
      if(item.difficulty!==undefined&&item.difficulty!==index+1)throw new Error(`TASK_DIFFICULTY:${key}:${index+1}`);
      item.difficulty=index+1;
    });
  }
  for(const key of bankKeys)if(!formulaKeys.has(key))throw new Error(`UNKNOWN_FORMULA:${key}`);
  return APPLICATION_TASK_BANK;
}
