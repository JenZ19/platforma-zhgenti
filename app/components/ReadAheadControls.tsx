export function ReadAheadControls({reading, step, total, onPreview, onReturn, optionalSetup, onHome}: {reading:boolean; step:number; total:number; onPreview:(step:number)=>void; onReturn:()=>void; optionalSetup:boolean; onHome:()=>void}) {
  return <section className="reading-controls" aria-label="Просмотр без выполнения">
    {reading && <p><strong>Режим просмотра — выполнение не отмечается</strong><br/>Чтобы выполнить задание, вернитесь к сохранённому шагу. Прогресс и награды не изменились.</p>}
    {step < total && <button type="button" onClick={()=>onPreview(step+1)}>Посмотреть следующий шаг без отметки</button>}
    {reading && <button type="button" onClick={onReturn}>Вернуться к моей работе</button>}
    {optionalSetup && <button type="button" onClick={onHome}>Сейчас не требуется — к проектам</button>}
  </section>;
}
