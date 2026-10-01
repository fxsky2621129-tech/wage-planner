(()=>{
  let installPrompt;
  const button=document.getElementById('install-app'),help=document.getElementById('install-help');
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
  window.addEventListener('appinstalled',()=>{installPrompt=null;button.hidden=true;});
  if(window.matchMedia('(display-mode: standalone)').matches||navigator.standalone)button.hidden=true;
  button.addEventListener('click',async()=>{if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();await prompt.userChoice;}else help.showModal();});
  document.getElementById('close-install-help').addEventListener('click',()=>help.close());
  if('serviceWorker' in navigator&&['https:','http:'].includes(location.protocol))navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
