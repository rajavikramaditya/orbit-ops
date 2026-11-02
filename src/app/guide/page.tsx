'use client';

import { useState } from 'react';
import Link from 'next/link';

const SECTIONS = [
  {
    id: 'today',
    title: 'Today',
    titleHi: 'आज',
    en: 'Your daily starting point. Shows open tasks, clients that are behind schedule, and clients you have not worked on for 7+ days. Tap Done when you finish something. Tap Snooze to move it to tomorrow.',
    hi: 'Roz subah yahi se shuru karo. Yahan dikhega: open tasks, kaunse clients behind hain, aur kaunse clients pe 7+ din se koi kaam nahi hua. Kaam ho jaye to Done dabao. Kal karna ho to Snooze.',
  },
  {
    id: 'clients',
    title: 'Clients',
    titleHi: 'क्लाइंट्स',
    en: 'All your retainer clients. Each card shows package (8 or 12 videos), how many are posted this cycle, last activity date, and a health colour. Green = on track. Amber = needs attention. Red = falling behind. Tap a client to edit notes, package, or update progress.',
    hi: 'Saare monthly clients yahan hain. Har card pe dikhega: package (8 ya 12 videos), is cycle mein kitne post ho gaye, last activity, aur health colour. Green = theek chal raha hai. Amber = dhyan do. Red = peeche ho raha hai. Client pe tap karke notes, package ya progress update kar sakte ho.',
  },
  {
    id: 'requests',
    title: 'Requests',
    titleHi: 'रिक्वेस्ट्स',
    en: 'Log every call, WhatsApp, or meeting here first. Do not start work from memory. The manager triages each request: sets priority, assigns someone, and converts it into a task or content item. Anything left as “New” for too long is a problem.',
    hi: 'Har call, WhatsApp ya meeting pehle yahan log karo. Yaad se kaam mat shuru karo. Manager yahan se priority set karegi, kisi ko assign karegi, aur task ya content mein convert karegi. Jo request “New” mein zyada der tak rahe, woh problem hai.',
  },
  {
    id: 'content',
    title: 'Content',
    titleHi: 'कंटेंट',
    en: 'The heart of production. Every video, reel or poster is a content item with a stage: Idea → Planned → Shot → Editing → Ready → Approved → Scheduled → Posted. Use List view for stages, Calendar view to see what is due when. Moving to “Posted” updates the client’s progress automatically.',
    hi: 'Production ka main hissa. Har video, reel ya poster ek content item hai. Stages: Idea → Planned → Shot → Editing → Ready → Approved → Scheduled → Posted. List view se stage change karo, Calendar se dekho kya kab due hai. “Posted” karne se client ka progress auto update hota hai.',
  },
  {
    id: 'tasks',
    title: 'Tasks',
    titleHi: 'टास्क',
    en: 'Anything that is not a video. Ad setup, client call, report, design job, follow-up. Assign to someone, set priority (P1 urgent, P2 normal, P3 low) and due date. Done items disappear from Today.',
    hi: 'Jo video nahi hai, woh task hai. Ad setup, client call, report, design job, follow-up. Kisi ko assign karo, priority set karo (P1 urgent, P2 normal, P3 low) aur due date. Done hone pe Today se hat jata hai.',
  },
];

export default function GuidePage() {
  const [lang, setLang] = useState<'en' | 'hi'>('hi');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">How to use Orbit Ops</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {lang === 'hi'
            ? 'Naye team member ke liye. Har tab ka kaam samajh lo.'
            : 'For new team members. Understand what each tab is for.'}
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setLang('hi')}
            className={`px-3 py-1 text-sm rounded-full border ${lang === 'hi' ? 'bg-foreground text-background' : ''}`}
          >
            हिन्दी
          </button>
          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1 text-sm rounded-full border ${lang === 'en' ? 'bg-foreground text-background' : ''}`}
          >
            English
          </button>
        </div>
      </header>

      <div className="space-y-4">
        {SECTIONS.map((s) => (
          <section key={s.id} className="rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{lang === 'hi' ? s.titleHi : s.title}</h2>
              <Link href={`/${s.id}`} className="text-xs text-muted-foreground underline">
                {lang === 'hi' ? 'Kholo →' : 'Open →'}
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {lang === 'hi' ? s.hi : s.en}
            </p>
          </section>
        ))}
      </div>

      <section className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        {lang === 'hi' ? (
          <>
            <p className="font-medium text-foreground">Roz ka flow</p>
            <ol className="mt-2 space-y-1 list-decimal list-inside">
              <li>Subah Today kholo — kya karna hai dekho</li>
              <li>Call aaye to pehle Requests mein log karo</li>
              <li>Video ka stage Content mein update karo</li>
              <li>Kaam khatam hone pe Done dabao</li>
            </ol>
          </>
        ) : (
          <>
            <p className="font-medium text-foreground">Daily flow</p>
            <ol className="mt-2 space-y-1 list-decimal list-inside">
              <li>Open Today in the morning — see what needs doing</li>
              <li>Log every call in Requests first</li>
              <li>Update video stages in Content</li>
              <li>Mark Done when finished</li>
            </ol>
          </>
        )}
      </section>
    </div>
  );
}
