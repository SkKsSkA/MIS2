export type RsvpStatus = "yes" | "maybe" | "no";
export type CoverColor = "coral" | "sun" | "violet";
export type Visibility = "link" | "public";

/** Взнос в общий сбор, как его видят гости (без ключей и подсказок для организатора). */
export interface PublicContribution {
  id: string;
  name: string;
  amount: number;
  confirmed: boolean;
  mine: boolean;
}

export interface BringItem {
  id: string;
  label: string;
  taken_by: string | null;
  mine: boolean;
}

/** Что видит гость: ответ функции get_event_public. */
export interface EventPublic {
  slug: string;
  kind: string;
  title: string;
  description: string;
  starts_at: string;
  location_name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  dress_code: string[];
  cover_color: CoverColor;
  goal_title: string | null;
  goal_amount: number | null;
  pay_phone: string | null;
  pay_recipient: string | null;
  pay_link: string | null;
  counts: { yes: number; maybe: number; no: number };
  raised: number;
  my_rsvp: RsvpStatus | null;
  items: BringItem[];
  contributions: PublicContribution[];
}

/** Строка таблицы events (видит организатор). */
export interface EventRow {
  id: string;
  slug: string;
  host_id: string;
  kind: string;
  title: string;
  description: string;
  starts_at: string;
  location_name: string;
  address: string;
  dress_code: string[];
  visibility: Visibility;
  cover_color: CoverColor;
  goal_title: string | null;
  goal_amount: number | null;
  pay_phone: string | null;
  pay_recipient: string | null;
  pay_link: string | null;
  created_at: string;
}

export interface RsvpRow {
  id: string;
  guest_name: string;
  status: RsvpStatus;
  created_at: string;
}

export interface ContributionRow {
  id: string;
  guest_name: string;
  amount: number;
  confirmed: boolean;
  payer_hint: string | null;
  created_at: string;
}

export interface BringItemRow {
  id: string;
  label: string;
  taken_by: string | null;
}

/** Черновик встречи от ИИ-помощника. */
export interface AiDraft {
  kind: string;
  title: string;
  description: string;
  starts_at: string | null; // значение для <input type="datetime-local">
  location_name: string;
  dress_code: string[];
  bring: string[];
}
