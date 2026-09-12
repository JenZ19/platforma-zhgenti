import {render,screen,cleanup,fireEvent,waitFor} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {LearningSetup} from './LearningSetup';
afterEach(()=>{cleanup();localStorage.clear();vi.unstubAllGlobals();});
it('asks for a personal bot once, saves to the account and reuses it on reopening',async()=>{
 let saved: string|null=null;
 const fetcher=vi.fn(async(_url,options)=>{
   if(options?.method==='POST') saved=JSON.parse(options.body).url;
   return {ok:true,json:async()=>({url:saved})};
 });
 vi.stubGlobal('fetch',fetcher);
 localStorage.setItem('neiroprofi-personal-bot-v1','https://t.me/feyakrestnayasbm_bot');
 const {unmount}=render(<LearningSetup mobile/>);
 const input=await screen.findByRole('textbox',{name:'Адрес вашей Феечки'});
 expect(screen.queryByRole('link',{name:'Открыть Феечку'})).not.toBeInTheDocument();
 fireEvent.change(input,{target:{value:'@student_fairy_bot'}});
 fireEvent.click(screen.getByRole('button',{name:'Сохранить Феечку'}));
 expect(await screen.findByRole('link',{name:'Открыть Феечку'})).toHaveAttribute('href','https://t.me/student_fairy_bot');
 const post=fetcher.mock.calls.find(([,options])=>options?.method==='POST')!;
 expect(post[1].headers['X-Neiroprofi-Request']).toBe('1');
 unmount();render(<LearningSetup mobile/>);
 expect(await screen.findByRole('link',{name:'Открыть Феечку'})).toHaveAttribute('href','https://t.me/student_fairy_bot');
 expect(screen.queryByRole('textbox',{name:'Адрес вашей Феечки'})).not.toBeInTheDocument();
});
it('does not report success on failed save or fall back to the school bot',async()=>{
 vi.stubGlobal('fetch',vi.fn(async(_url,options)=>({ok:options?.method!=='POST',json:async()=>options?.method==='POST'?{error:'Сохранение недоступно'}:{url:null}})));
 render(<LearningSetup mobile/>);
 fireEvent.change(await screen.findByRole('textbox',{name:'Адрес вашей Феечки'}),{target:{value:'@my_fairy_bot'}});
 fireEvent.click(screen.getByRole('button',{name:'Сохранить Феечку'}));
 await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Сохранение недоступно'));
 expect(screen.getByRole('textbox',{name:'Адрес вашей Феечки'})).toHaveValue('@my_fairy_bot');
 expect(screen.queryByRole('link',{name:'Открыть Феечку'})).not.toBeInTheDocument();
});
