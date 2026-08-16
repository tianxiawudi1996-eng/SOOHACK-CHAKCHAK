const channel=(value)=>{const normalized=value/255;return normalized<=0.04045?normalized/12.92:((normalized+0.055)/1.055)**2.4;};

export function relativeLuminance(hex){
  const value=hex.replace('#','');
  if(!/^[0-9a-f]{6}$/i.test(value))throw new Error(`INVALID_HEX:${hex}`);
  const [red,green,blue]=[0,2,4].map((offset)=>channel(Number.parseInt(value.slice(offset,offset+2),16)));
  return 0.2126*red+0.7152*green+0.0722*blue;
}

export function contrastRatio(foreground,background){
  const values=[relativeLuminance(foreground),relativeLuminance(background)].sort((a,b)=>b-a);
  return (values[0]+0.05)/(values[1]+0.05);
}

export const CRITICAL_CONTRAST_PAIRS=[
  {name:'body ink on canvas',foreground:'#172033',background:'#f5f7ff',minimum:4.5},
  {name:'secondary ink on white',foreground:'#5f6b7d',background:'#ffffff',minimum:4.5},
  {name:'brand button text',foreground:'#ffffff',background:'#2f5bff',minimum:4.5},
  {name:'brand link on white',foreground:'#2046d9',background:'#ffffff',minimum:4.5},
  {name:'mint semantic text on white',foreground:'#087f70',background:'#ffffff',minimum:4.5},
  {name:'mint semantic text on tint',foreground:'#087f70',background:'#e7faf6',minimum:4.5},
  {name:'diagnostic button text',foreground:'#ffffff',background:'#1649d8',minimum:4.5},
  {name:'curriculum source text',foreground:'#5f6a82',background:'#ffffff',minimum:4.5},
  {name:'curriculum pending phase',foreground:'#56627a',background:'#f3f5fa',minimum:4.5},
  {name:'dark text on action yellow',foreground:'#17233d',background:'#ffc83d',minimum:4.5},
  {name:'formula cue on dark card',foreground:'#a9eade',background:'#17264f',minimum:4.5},
  {name:'focus indicator on white',foreground:'#102a73',background:'#ffffff',minimum:3}
];
