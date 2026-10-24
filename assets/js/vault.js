/* Локальная библиотека оригиналов. В переносимом HTML файлы встроены без сети. */
window.OfflineVault=(()=>{
let dialog,objectURL,opener;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function normalize(path){if(/^(?:https?:|data:|blob:|#)/i.test(path))return null;return decodeURIComponent(path.split('#')[0].split('?')[0]).replace(/\\/g,'/').replace(/^(?:\.\.\/|\.\/)+/,'');}
function assetBlob(path){const item=window.OFFLINE_INDEX?.[path];if(!item)return null;const el=document.getElementById(item.id),raw=el?.tagName==='A'?el.getAttribute('href').split(',')[1]:el?.textContent.trim();if(!raw)return null;const binary=atob(raw),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return new Blob([bytes],{type:item.mime});}
async function open(path,label,button){
path=normalize(path);if(!path)return;opener=button||document.activeElement;
if(!dialog){dialog=document.createElement('dialog');dialog.id='document-dialog';dialog.setAttribute('aria-labelledby','document-title');document.body.append(dialog);dialog.addEventListener('close',()=>{if(objectURL)URL.revokeObjectURL(objectURL);objectURL=null;document.body.classList.remove('document-open');opener?.focus()});}
if(objectURL)URL.revokeObjectURL(objectURL);objectURL=null;
dialog.dataset.loaded='false';dialog.dataset.path='';
dialog.innerHTML=`<div class="document-head"><div><span>БИБЛИОТЕКА ДОКУМЕНТОВ</span><h2 id="document-title">${esc(label||path.split('/').at(-1))}</h2></div><button type="button" aria-label="Закрыть документ">Закрыть ×</button></div><div class="document-stage"><p role="status">Загрузка сохранённого файла…</p></div><div class="document-footer"><span>${esc(path)}</span><a id="document-download" hidden>Скачать файл</a></div>`;
dialog.querySelector('.document-head button').onclick=()=>dialog.close();document.body.classList.add('document-open');if(!dialog.open)dialog.showModal();SportAnalytics.bindSheet(dialog,dialog.querySelector('.document-head'));
try{
if(path.endsWith('/')&&window.OFFLINE_INDEX){
const files=Object.keys(OFFLINE_INDEX).filter(p=>p.startsWith(path));
const stage=dialog.querySelector('.document-stage');stage.innerHTML=files.map(p=>`<p><a href="./${esc(p)}">${esc(p.slice(path.length))}</a></p>`).join('')||'<p>В этой папке нет встроенных файлов.</p>';dialog.dataset.loaded='true';dialog.dataset.path=path;return;
}
let blob=assetBlob(path);if(!blob){if(window.OFFLINE_INDEX)throw Error('Файл не включён в эту переносимую версию. Оригинал сохранён в папке проекта.');const response=await fetch('./'+path);if(!response.ok)throw Error('Не удалось открыть файл: '+response.status);blob=await response.blob();}
const embedded=window.OFFLINE_INDEX?.[path],nativeURL=embedded?document.getElementById(embedded.id)?.getAttribute('href'):null;
const sourceURL=nativeURL?.startsWith('data:')?nativeURL:new URL('./'+path,document.baseURI).href;const stage=dialog.querySelector('.document-stage'),download=dialog.querySelector('#document-download');stage.replaceChildren();download.href=sourceURL;download.download=path.split('/').at(-1);download.hidden=false;
const isPDF=blob.type.includes('pdf')||/\.pdf$/i.test(path),isImage=blob.type.startsWith('image/')||/\.(?:png|jpe?g|webp)$/i.test(path);
if(isImage){const image=document.createElement('img');image.alt=label||'Исходная фотография';image.src=sourceURL;image.onerror=()=>{const note=document.createElement('p');note.textContent='Просмотрщик не смог показать фотографию. Сохраните оригинал кнопкой «Скачать файл».';stage.replaceChildren(note)};stage.append(image);}
else if(isPDF){const frame=document.createElement('iframe');frame.title='Сохранённый PDF-документ';frame.src=sourceURL;stage.append(frame);const note=document.createElement('p');note.className='muted';note.textContent='Если браузер телефона не показывает PDF внутри окна, скачайте файл кнопкой ниже.';stage.append(note);}
else{const pre=document.createElement('pre');pre.textContent=await blob.text();stage.append(pre);}
dialog.dataset.path=path;dialog.dataset.loaded='true';
}catch(error){dialog.querySelector('.document-stage').textContent=error.message;dialog.dataset.loaded='false';}
}
function mount(){document.addEventListener('click',event=>{const a=event.target.closest('a[href]');if(!a||a.hasAttribute('download'))return;const path=normalize(a.dataset.originalPath||a.getAttribute('href'));if(!path||(!window.OFFLINE_INDEX&&!/^(?:files|sources|reports|events|audit|README)/.test(path)))return;if(window.OFFLINE_INDEX&&!window.OFFLINE_INDEX[path]&&!path.endsWith('/'))return;event.preventDefault();open(path,a.textContent.trim(),a);});}
return {normalize,open,mount};
})();