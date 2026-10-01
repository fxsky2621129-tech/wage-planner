(()=>{
  let installPrompt;
  const button=document.getElementById('install-app'),help=document.getElementById('install-help'),nativeButton=document.getElementById('native-install'),status=document.getElementById('install-status');
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;nativeButton.hidden=false;});
  window.addEventListener('appinstalled',()=>{installPrompt=null;nativeButton.hidden=true;button.hidden=true;status.textContent='インストールが完了しました。ホーム画面またはアプリ一覧を確認してください。';});
  if(window.matchMedia('(display-mode: standalone)').matches||navigator.standalone)button.hidden=true;
  button.addEventListener('click',()=>help.showModal());
  nativeButton.addEventListener('click',async()=>{
    if(!installPrompt){status.textContent='Chrome右上の「︙」から「インストール」を選んでください。';return;}
    const prompt=installPrompt;installPrompt=null;nativeButton.disabled=true;
    try{await prompt.prompt();const choice=await prompt.userChoice;status.textContent=choice.outcome==='accepted'?'インストール処理中です。完了後、ホーム画面またはアプリ一覧をご確認ください。':'インストールをキャンセルしました。Chromeのメニューから再度選択できます。';}
    catch{status.textContent='インストールを開始できませんでした。Chrome右上の「︙」から「インストール」を選んでください。';}
    finally{nativeButton.disabled=false;nativeButton.hidden=!installPrompt;}
  });
  document.getElementById('close-install-help').addEventListener('click',()=>help.close());
  if('serviceWorker' in navigator&&['https:','http:'].includes(location.protocol))navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
