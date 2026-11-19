"use client";

const KEY = "lm_guest_key";
const NAME = "lm_guest_name";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Случайный идентификатор (для взноса, который организатор вносит вручную). */
export const randomKey = uuid;

/** Анонимный ключ гостя: по нему гость меняет свой ответ без аккаунта. Хранится только в браузере. */
export function getGuestKey(): string {
  try {
    let k = localStorage.getItem(KEY);
    if (!k) {
      k = uuid();
      localStorage.setItem(KEY, k);
    }
    return k;
  } catch {
    return uuid();
  }
}

export function getGuestName(): string {
  try {
    return localStorage.getItem(NAME) ?? "";
  } catch {
    return "";
  }
}

export function saveGuestName(name: string): void {
  try {
    localStorage.setItem(NAME, name);
  } catch {
    /* хранилище недоступно — не страшно */
  }
}
