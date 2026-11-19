import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import type { ReactNode } from "react";

/* Иллюстрации для карточек «Для любой встречи».
 * Если положить настоящее фото в public/photos/<slug>.jpg (или .jpeg/.webp/.png),
 * карточка автоматически покажет его вместо иллюстрации. Имена: birthday, party, outdoors, bookclub, running, boardgames. */

const INK = "#1B1340";
const S = { stroke: INK, strokeWidth: 4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

function Svg({ label, children }: { label: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 400 300" className="block h-full w-full" role="img" aria-label={label} preserveAspectRatio="xMidYMid slice">
      {children}
    </svg>
  );
}

function Birthday() {
  return (
    <Svg label="Иллюстрация: торт со свечами и воздушные шары">
      <rect width="400" height="300" fill="#FF5A3C" />
      {[[50, 50, 6, "#FFD43B"], [335, 40, 5, "#5EE6B8"], [95, 125, 4, "#7CC8FF"], [352, 140, 6, "#FF9BD2"], [205, 28, 5, "#B9A4FF"], [26, 160, 5, "#5EE6B8"]].map(([x, y, r, c], i) => (
        <circle key={i} cx={x as number} cy={y as number} r={r as number} fill={c as string} />
      ))}
      <g {...S}>
        <path d="M78 148 Q66 190 84 232" fill="none" />
        <path d="M134 126 Q146 180 128 232" fill="none" />
        <path d="M322 138 Q310 185 330 232" fill="none" />
        <path d="M268 112 Q280 170 262 232" fill="none" />
        <ellipse cx="78" cy="108" rx="30" ry="38" fill="#FFD43B" />
        <ellipse cx="134" cy="88" rx="28" ry="36" fill="#5EE6B8" />
        <ellipse cx="322" cy="100" rx="30" ry="38" fill="#7CC8FF" />
        <ellipse cx="268" cy="76" rx="28" ry="36" fill="#B9A4FF" />
        <rect x="140" y="190" width="120" height="52" rx="8" fill="#FFD43B" />
        <rect x="165" y="150" width="70" height="40" rx="8" fill="#FF9BD2" />
        <path d="M165 164 q9 14 18 0 q9 14 18 0 q9 14 17 0 q9 14 17 0" fill="none" />
        {[180, 198, 216].map((x) => (
          <rect key={x} x={x} y="126" width="7" height="24" fill="#5EE6B8" />
        ))}
        {[183, 201, 219].map((x) => (
          <ellipse key={x} cx={x} cy="116" rx="5" ry="8" fill="#FFD43B" />
        ))}
      </g>
      <rect x="0" y="240" width="400" height="60" fill={INK} />
      <rect x="0" y="240" width="400" height="6" fill="#B9A4FF" />
    </Svg>
  );
}

function Party() {
  return (
    <Svg label="Иллюстрация: диско-шар и лучи прожекторов">
      <rect width="400" height="300" fill="#B9A4FF" />
      <polygon points="200,110 30,300 120,300" fill="#FFD43B" opacity="0.45" />
      <polygon points="200,110 150,300 250,300" fill="#5EE6B8" opacity="0.45" />
      <polygon points="200,110 280,300 370,300" fill="#FF9BD2" opacity="0.5" />
      <g {...S}>
        <path d="M200 0 V62" fill="none" />
        <circle cx="200" cy="112" r="52" fill="#7CC8FF" />
        <path d="M150 96 H250 M148 114 H252 M154 132 H246" fill="none" strokeWidth="3" />
        <ellipse cx="200" cy="112" rx="22" ry="52" fill="none" strokeWidth="3" />
        <path d="M200 60 V164" fill="none" strokeWidth="3" />
      </g>
      {[[60, 70], [340, 60], [318, 170], [78, 190]].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y - 14} L${x + 4} ${y - 4} L${x + 14} ${y} L${x + 4} ${y + 4} L${x} ${y + 14} L${x - 4} ${y + 4} L${x - 14} ${y} L${x - 4} ${y - 4} Z`} fill={["#FFD43B", "#FF5A3C", "#5EE6B8", "#FF9BD2"][i]} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      ))}
      <rect x="0" y="252" width="400" height="48" fill={INK} />
      {Array.from({ length: 8 }).map((_, i) => (
        <rect key={i} x={i * 50 + 5} y="260" width="40" height="30" fill={["#FFD43B", "#FF5A3C", "#5EE6B8", "#FF9BD2"][i % 4]} opacity="0.9" />
      ))}
    </Svg>
  );
}

function Outdoors() {
  return (
    <Svg label="Иллюстрация: палатка, горы и костёр">
      <rect width="400" height="300" fill="#7CC8FF" />
      <circle cx="326" cy="68" r="34" fill="#FFD43B" stroke={INK} strokeWidth="4" />
      <g {...S}>
        <polygon points="-10,236 100,96 210,236" fill="#B9A4FF" />
        <polygon points="130,236 250,110 410,236" fill="#5EE6B8" />
        <rect x="-5" y="228" width="410" height="80" fill="#2D1B7A" />
        <polygon points="232,236 292,150 352,236" fill="#FF5A3C" />
        <polygon points="292,150 272,236 312,236" fill={INK} />
        <path d="M60 244 L110 262 M110 244 L60 262" fill="none" strokeWidth="7" />
        <path d="M85 246 C62 228 80 206 86 190 C96 208 112 224 85 246 Z" fill="#FFD43B" />
        <polygon points="350,236 366,196 382,236" fill={INK} />
      </g>
    </Svg>
  );
}

function BookClub() {
  return (
    <Svg label="Иллюстрация: стопка книг и чашка кофе">
      <rect width="400" height="300" fill="#FF9BD2" />
      <g {...S}>
        <rect x="100" y="140" width="170" height="36" rx="4" fill="#5EE6B8" />
        <rect x="124" y="176" width="150" height="36" rx="4" fill="#FFD43B" />
        <rect x="84" y="212" width="190" height="36" rx="4" fill="#B9A4FF" />
        <path d="M120 140 V176 M246 140 V176 M146 176 V212 M250 176 V212 M110 212 V248 M250 212 V248" fill="none" strokeWidth="3" />
        <rect x="304" y="196" width="48" height="50" rx="8" fill="#FF5A3C" />
        <path d="M352 208 q22 4 0 26" fill="none" />
        <path d="M318 178 q-8 -12 0 -22 q8 -10 0 -20 M338 178 q-8 -12 0 -22 q8 -10 0 -20" fill="none" strokeWidth="3" />
        <path d="M150 128 q20 -22 40 0 q20 -22 40 0 v12 h-80 z" fill="#7CC8FF" />
      </g>
      <rect x="0" y="248" width="400" height="52" fill={INK} />
      {[[40, 60], [350, 70], [60, 150]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={[6, 5, 4][i]} fill={["#FFD43B", "#7CC8FF", "#5EE6B8"][i]} />
      ))}
    </Svg>
  );
}

function Running() {
  return (
    <Svg label="Иллюстрация: бегун на стадионной дорожке">
      <rect width="400" height="300" fill="#5EE6B8" />
      <circle cx="60" cy="58" r="30" fill="#FFD43B" stroke={INK} strokeWidth="4" />
      <g {...S}>
        <ellipse cx="200" cy="232" rx="190" ry="62" fill="#FF5A3C" />
        <ellipse cx="200" cy="232" rx="152" ry="46" fill="none" />
        <ellipse cx="200" cy="232" rx="114" ry="30" fill="#2D1B7A" />
        <circle cx="214" cy="86" r="17" fill="#FF9BD2" />
        <path d="M206 106 L190 158" fill="none" strokeWidth="11" />
        <path d="M200 124 L232 138 M200 124 L172 134" fill="none" strokeWidth="9" />
        <path d="M190 158 L216 190 L244 184 M190 158 L168 196 L146 212" fill="none" strokeWidth="9" />
        <circle cx="246" cy="184" r="7" fill="#FFD43B" />
        <circle cx="144" cy="212" r="7" fill="#FFD43B" />
      </g>
    </Svg>
  );
}

function BoardGames() {
  return (
    <Svg label="Иллюстрация: настольная игра, кубики и фишки">
      <rect width="400" height="300" fill="#FFD43B" />
      <g {...S}>
        <rect x="60" y="130" width="260" height="130" rx="8" fill={INK} />
        {Array.from({ length: 18 }).map((_, i) => {
          const col = i % 6;
          const row = Math.floor(i / 6);
          return <rect key={i} x={60 + col * 43.3} y={130 + row * 43.3} width="43.3" height="43.3" fill={(col + row) % 2 ? "#FF5A3C" : "#FF9BD2"} strokeWidth="2" />;
        })}
        <rect x="60" y="130" width="260" height="130" rx="8" fill="none" />
        <circle cx="125" cy="150" r="14" fill="#B9A4FF" />
        <path d="M110 188 q15 -34 30 0 z" fill="#B9A4FF" />
        <circle cx="255" cy="194" r="14" fill="#5EE6B8" />
        <path d="M240 232 q15 -34 30 0 z" fill="#5EE6B8" />
        <g transform="rotate(-14 330 80)">
          <rect x="296" y="46" width="64" height="64" rx="10" fill="#7CC8FF" />
          {[[314, 64], [342, 92], [328, 78]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="5" fill={INK} stroke="none" />
          ))}
        </g>
        <g transform="rotate(12 90 60)">
          <rect x="60" y="30" width="56" height="56" rx="10" fill="#5EE6B8" />
          {[[76, 46], [100, 46], [76, 70], [100, 70]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="5" fill={INK} stroke="none" />
          ))}
        </g>
      </g>
    </Svg>
  );
}

const CARDS: { slug: string; label: string; text: string; bg: string; art: ReactNode; link?: string }[] = [
  { slug: "birthday", label: "Дни рождения", text: "Торт, шарики, дресс-код и сбор на подарок. Гости сами берут, что принести.", bg: "bg-sun", art: <Birthday />, link: "/e/demo" },
  { slug: "party", label: "Вечеринки", text: "Время, место на карте и список тех, кто точно придёт.", bg: "bg-pink", art: <Party /> },
  { slug: "outdoors", label: "Выезды на природу", text: "Кто едет, кто берёт палатку и мангал, во сколько встречаемся.", bg: "bg-mint", art: <Outdoors /> },
  { slug: "bookclub", label: "Книжные клубы", text: "Следующая встреча и голосование за книгу, которую читаем дальше.", bg: "bg-violet", art: <BookClub /> },
  { slug: "running", label: "Пробежки", text: "Точка старта, темп и напоминание, чтобы никто не проспал.", bg: "bg-sky", art: <Running /> },
  { slug: "boardgames", label: "Настольные игры", text: "Выбор игр голосованием и распределение, кто что принесёт.", bg: "bg-coral", art: <BoardGames /> },
];

function findPhoto(slug: string): string | null {
  for (const ext of ["jpg", "jpeg", "webp", "png"]) {
    if (fs.existsSync(path.join(process.cwd(), "public", "photos", `${slug}.${ext}`))) return `/photos/${slug}.${ext}`;
  }
  return null;
}

export function KindCards() {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {CARDS.map((c) => {
        const photo = findPhoto(c.slug);
        return (
          <li key={c.slug} className={`overflow-hidden rounded-3xl border-2 border-ink text-ink shadow-pop ${c.bg}`}>
            <div className="aspect-[4/3] overflow-hidden border-b-2 border-ink">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt={c.label} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                c.art
              )}
            </div>
            <div className="p-5">
              <h3 className="h-display text-lg">{c.label}</h3>
              <p className="mt-2 text-[15px] font-medium">{c.text}</p>
              {c.link && (
                <Link href={c.link} className="mt-3 inline-flex min-h-[44px] items-center font-bold underline">
                  Открыть пример приглашения
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
