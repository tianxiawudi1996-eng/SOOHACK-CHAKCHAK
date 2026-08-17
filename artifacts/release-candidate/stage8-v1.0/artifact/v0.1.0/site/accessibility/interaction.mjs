export function installSkipLinkFocus(root=document){
  root.querySelectorAll('.skip-link[href^="#"]').forEach((link)=>{
    link.addEventListener('click',()=>{
      const target=root.querySelector(link.getAttribute('href'));
      if(!target)return;
      requestAnimationFrame(()=>target.focus({preventScroll:true}));
    });
  });
}
