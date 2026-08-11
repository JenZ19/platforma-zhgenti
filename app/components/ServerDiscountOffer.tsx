"use client";

/* eslint-disable @next/next/no-img-element -- supplied AdminVPS checkout screenshot is lesson evidence */

import { useState } from "react";

const PROMO_CODE = "SUBMARINE123";

export function ServerDiscountOffer({ mobile = false }: { mobile?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(PROMO_CODE);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className={`server-offer ${mobile ? "mobile" : ""}`} aria-label="Скидка AdminVPS для учениц">
      <div className="server-offer-copy">
        <p>Подарок для вашего проекта</p>
        <h2>Скидка 60% на сервер для ваших проектов</h2>
        <p className="server-offer-lead">AdminVPS — один из крупных хостинг-провайдеров. По нашей партнёрской ссылке вы сможете разместить сайт, сервис или ИИ-агента на VPS на 60% дешевле в первый месяц.</p>
        <div className="server-promo-code"><span>Промокод</span><strong>{PROMO_CODE}</strong><button type="button" onClick={copyCode}>{copied ? "Скопировано ✓" : "Скопировать"}</button></div>
        <ol>
          <li>Перейдите на <a href="https://adminvps.ru/" target="_blank" rel="noreferrer">adminvps.ru ↗</a>.</li>
          <li>Выберите сервер, локацию «Россия» и период оплаты 1 месяц.</li>
          <li>В корзине вставьте промокод и нажмите «Применить» до оплаты.</li>
        </ol>
        <div className="server-offer-terms"><b>Условия без мелкого шрифта</b><span>один сервер</span><span>одна активация</span><span>оплата за 1 месяц</span><span>все тарифы, кроме Lite</span></div>
        <a className="server-pdf-link" href="/materials/adminvps-vps-instruction.pdf" target="_blank" rel="noreferrer">Скачать полную инструкцию в PDF <span>↓</span></a>
      </div>
      <figure><img src="/materials/adminvps-submarine-discount.jpg" alt="Пример применения промокода SUBMARINE123 в корзине AdminVPS" /><figcaption>На примере цена снизилась с 799 ₽ до 319,60 ₽. Всегда проверяйте вашу текущую сумму в корзине перед оплатой.</figcaption></figure>
    </section>
  );
}
