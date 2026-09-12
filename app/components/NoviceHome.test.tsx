import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {LearningSetup} from './LearningSetup';
import {LearningReset} from './LearningReset';
import {DashboardHome} from './DashboardHome';
import {buildDashboardSnapshot} from '../lib/academy-dashboard';
import {projects} from '../content/projects';
beforeEach(()=>{vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({url:null})})));});
afterEach(()=>{cleanup();localStorage.clear();vi.unstubAllGlobals();});
it('keeps transfer instructions collapsed even when phone setup is open',()=>{
 const {container}=render(<LearningSetup mobile/>);
 expect(container.querySelector('.progress-transfer')).not.toHaveAttribute('open');
 expect(screen.getByText('Продолжить на другом устройстве')).toBeVisible();
 expect(screen.getByText(/Автоматической синхронизации/)).not.toBeVisible();
});
it('does not recommend server and API as extra first-day projects',()=>{
 const snapshot=buildDashboardSnapshot(projects,localStorage,'desktop');
 render(<DashboardHome snapshot={snapshot} format="desktop" onOpen={vi.fn()} onSave={vi.fn()}/>);
 expect(screen.queryByRole('article',{name:'Покупаем сервер по 152-ФЗ'})).not.toBeInTheDocument();
 expect(screen.queryByRole('article',{name:'Добавляем API-ключи'})).not.toBeInTheDocument();
 expect(screen.getByRole('heading',{level:1,name:'С чего начать обучение'})).toBeVisible();
 expect(screen.getByRole('button',{name:'Сбросить всё обучение'})).toBeVisible();
 expect(screen.queryByText('Ваш следующий шаг')).not.toBeInTheDocument();
 expect(screen.queryByText('Добавить Нейропрофи на экран телефона')).not.toBeInTheDocument();
 expect(screen.queryByRole('region',{name:'Ваш прогресс'})).not.toBeInTheDocument();
 expect(screen.getByRole('link',{name:'Установить и проверить Codex'})).toHaveAttribute('href',expect.stringContaining('install-codex'));
});
it('starts phone learners with their helper, not a desktop installation',async()=>{
 const snapshot=buildDashboardSnapshot(projects,localStorage,'mobile');
 render(<DashboardHome snapshot={snapshot} format="mobile" onOpen={vi.fn()} onSave={vi.fn()}/>);
 expect(await screen.findByRole('textbox',{name:'Адрес вашей Феечки'})).toBeVisible();
 expect(screen.queryByRole('link',{name:'Установить и проверить Codex'})).not.toBeInTheDocument();
 expect(screen.getByRole('link',{name:'Помощник уже готов — выбрать проект'})).toHaveAttribute('href','#home-course-route');
 expect(screen.getByText('Добавить Нейропрофи на экран телефона')).toBeVisible();
 expect(screen.getByText('iPhone · Safari')).toBeInTheDocument();
 expect(screen.getByText('Android · Chrome')).toBeInTheDocument();
});
it('asks for the personal bot instead of opening the school fairy',async()=>{
 render(<LearningSetup mobile/>);
 expect(await screen.findByRole('textbox',{name:'Адрес вашей Феечки'})).toBeVisible();
 expect(screen.queryByRole('textbox',{name:'Ссылка от школы'})).not.toBeInTheDocument();
 expect(screen.queryByRole('link',{name:'Открыть Феечку'})).not.toBeInTheDocument();
});
it('uses the account bot rather than another learner’s browser setting',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({url:'https://t.me/account_fairy_bot'})})));
 localStorage.setItem('neiroprofi-personal-bot-v1','https://t.me/student_fairy_bot');
 render(<LearningSetup mobile/>);
 expect(await screen.findByRole('link',{name:'Открыть Феечку'})).toHaveAttribute('href','https://t.me/account_fairy_bot');
});
it('resumes the actual started project without duplicating its card',()=>{
 const snapshot=buildDashboardSnapshot(projects,localStorage,'desktop');
 const item={...snapshot.items.find(item=>item.project.slug==='install-codex')!,status:'started' as const,completedLevels:2};
 snapshot.next=item; snapshot.started=[item]; snapshot.completedLevels=2;
 const onOpen=vi.fn();
 const {container}=render(<DashboardHome snapshot={snapshot} format="desktop" onOpen={onOpen} onSave={vi.fn()}/>);
 expect(screen.getByText('Пройдено шагов: 2 из '+item.totalLevels)).toBeVisible();
 expect(screen.queryByRole('heading',{name:'С чего начать обучение'})).not.toBeInTheDocument();
 expect(container.querySelector('.dashboard-card-grid')).toBeNull();
 fireEvent.click(screen.getByRole('link',{name:'Продолжить проект: '+item.project.title}));
 expect(onOpen).toHaveBeenCalledWith(item.project.slug);
});
it('resets through settings only after confirmation and allows undo',()=>{
 localStorage.setItem('feya-academy-preparation-v1:planner', 'original');
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);
 const onRefresh=vi.fn();
 render(<LearningReset mobile onRefresh={onRefresh}/>);
 fireEvent.click(screen.getByRole('button',{name:'Сбросить всё обучение'}));
 expect(localStorage.getItem('feya-academy-preparation-v1:planner')).toBe('original');
 expect(onRefresh).not.toHaveBeenCalled();
 confirm.mockReturnValue(true);
 fireEvent.click(screen.getByRole('button',{name:'Сбросить всё обучение'}));
 expect(localStorage.getItem('feya-academy-preparation-v1:planner')).toBeNull();
 expect(screen.getByRole('status')).toHaveTextContent('Учебный прогресс сброшен');
 fireEvent.click(screen.getByRole('button',{name:'Отменить последний сброс'}));
 expect(localStorage.getItem('feya-academy-preparation-v1:planner')).toBe('original');
 expect(onRefresh).toHaveBeenCalledTimes(2);
 confirm.mockRestore();
});
