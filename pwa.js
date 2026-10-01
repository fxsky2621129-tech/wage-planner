(()=>{
  const button=document.getElementById('install-app'),help=document.getElementById('install-help');
  // Use browser-menu instructions so Android users can choose a regular shortcut.
  window.addEventListener('beforeinstallprompt',event=>event.preventDefault());
  window.addEventListener('appinstalled',()=>{button.hidden=true;});
  if(window.matchMedia('(display-mode: standalone)').matches||navigator.standalone)button.hidden=true;
  button.addEventListener('click',()=>help.showModal());
  document.getElementById('close-install-help').addEventListener('click',()=>help.close());
  if('serviceWorker' in navigator&&['https:','http:'].includes(location.protocol))navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();

