import type { EventPublic } from "./types";

/** Демо-встреча: открывается по /e/demo без базы данных. Ответы живут только в браузере. */
export function demoEvent(): EventPublic {
  const start = new Date();
  start.setDate(start.getDate() + 4);
  start.setHours(19, 0, 0, 0);
  return {
    slug: "demo",
    kind: "День рождения",
    title: "День рождения Дины",
    description:
      "Отмечаем день рождения Дины. Приходи в яркой одежде: будет музыка, торт и много хорошего настроения.",
    starts_at: start.toISOString(),
    location_name: "Лофт на набережной",
    address: "Алматы, набережная, 12",
    lat: null,
    lng: null,
    dress_code: ["Яркое", "Без чёрного", "Удобная обувь"],
    cover_color: "coral",
    goal_title: "Скидываемся на подарок",
    goal_amount: 20000,
    pay_phone: "+77000000000",
    pay_recipient: "Дина К.",
    pay_link: null,
    counts: { yes: 12, maybe: 3, no: 1 },
    raised: 12000,
    my_rsvp: null,
    items: [
      { id: "d1", label: "Торт", taken_by: "Айдана", mine: false },
      { id: "d2", label: "Шары и гирлянды", taken_by: "Данияр", mine: false },
      { id: "d3", label: "Напитки", taken_by: null, mine: false },
      { id: "d4", label: "Колонка", taken_by: null, mine: false },
    ],
    contributions: [
      { id: "c1", name: "Айдана", amount: 5000, confirmed: true, mine: false },
      { id: "c2", name: "Данияр", amount: 7000, confirmed: true, mine: false },
    ],
  };
}
