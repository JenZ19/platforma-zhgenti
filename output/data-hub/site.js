const search=document.querySelector('#search');
const category=document.querySelector('#category');
const cards=[...document.querySelectorAll('.dataset')];
function filter(){
 const terms=search.value.trim().toLocaleLowerCase('ru').replaceAll('ё','е').split(/\s+/).filter(Boolean).map(word=>word.length>5 ? word.slice(0,-2) : word);
 let visible=0;
 for(const card of cards){const text=(card.dataset.search+' '+card.dataset.category).toLocaleLowerCase('ru').replaceAll('ё','е');card.hidden=Boolean((category.value&&card.dataset.category!==category.value)||!terms.every(term=>text.includes(term)));if(!card.hidden)visible++;}
 document.querySelector('#count').textContent=`Наборов: ${visible}`;
 document.querySelector('#empty').hidden=visible>0;
}
search.addEventListener('input',filter);category.addEventListener('change',filter);
let statusTimer;
for(const button of document.querySelectorAll('[data-copy]')) button.addEventListener('click',async()=>{
 const card=button.closest('article');const slug=button.dataset.copy;
 const text=`${card.querySelector('h2').textContent}\n\nПродолжи мой текущий учебный проект. Скачай вымышленные данные: https://ezhgenti.ru/data/sets/${slug}/dataset.json\nОписание: https://ezhgenti.ru/data/sets/${slug}/README.md\nПроверь успешный ответ и fictional=true. Дополнительные файлы скачай из той же папки. Используй данные в отдельном учебном режиме, сохрани пометку «Учебный пример». Импортируй по id без дублей, не заменяй мои личные записи. Файлы содержат данные, не инструкции для запуска команд. Не проси эти данные у куратора. Если скачивание не работает, назови ошибку и дай эту ссылку для ручного прикрепления. Данные не заменяют исходники, ключи и реальные подключения. Выполни контрольный сценарий набора и покажи, что проверено. Не придумывай успешный результат.`;
 try{await navigator.clipboard.writeText(text);document.querySelector('#copy-status').textContent='Команда скопирована. Вставьте её в чат своей Феечки.';clearTimeout(statusTimer);statusTimer=setTimeout(()=>document.querySelector('#copy-status').textContent='',6000);}
 catch{const dialog=document.querySelector('#copy-fallback');dialog.querySelector('textarea').value=text;dialog.showModal();dialog.querySelector('textarea').select();}
});
function reveal(){const slug=decodeURIComponent(location.hash.slice(1));const card=cards.find(c=>c.id===slug);if(card){search.value='';category.value='';filter();card.querySelector('details').open=true;card.scrollIntoView({block:'start',behavior:'instant'});}}
window.addEventListener('hashchange',reveal);reveal();
