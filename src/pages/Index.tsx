import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import func2url from '../../backend/func2url.json';

const API = func2url.codes;

type Tab = 'codes' | 'bricks' | 'users' | 'stats';

interface PromoCode {
  id: number;
  code: string;
  quantity: number;
  status: 'active' | 'used';
  created: string;
}

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'codes', label: 'Коды', icon: 'Ticket' },
  { id: 'bricks', label: 'Брики', icon: 'Box' },
  { id: 'users', label: 'Пользователи', icon: 'Users' },
  { id: 'stats', label: 'Статистика', icon: 'BarChart3' },
];

const QUICK = [10, 25, 50, 100];

export default function Index() {
  const [tab, setTab] = useState<Tab>('codes');
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [quantity, setQuantity] = useState('10');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadCodes = async () => {
    try {
      const res = await fetch(API);
      const data = await res.json();
      setCodes(data.codes || []);
    } catch {
      toast.error('Не удалось загрузить коды');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCodes();
  }, []);

  const stats = useMemo(
    () => ({
      total: codes.length,
      active: codes.filter((c) => c.status === 'active').length,
      bricks: codes.reduce((s, c) => s + c.quantity, 0),
    }),
    [codes],
  );

  const createCode = async () => {
    const qty = Number(quantity) || 1;
    setCreating(true);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty }),
      });
      const c = await res.json();
      setCodes((prev) => [c, ...prev]);
      toast.success('Код создан', { description: `${c.code} · ${c.quantity} бриков` });
    } catch {
      toast.error('Ошибка создания кода');
    } finally {
      setCreating(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    toast('Скопировано в буфер', { description: code });
  };

  const removeCode = async (id: number) => {
    setCodes((p) => p.filter((c) => c.id !== id));
    try {
      await fetch(`${API}?id=${id}`, { method: 'DELETE' });
    } catch {
      toast.error('Не удалось удалить');
      loadCodes();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white font-sans relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-[hsl(var(--brand))] opacity-25 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-[26rem] w-[26rem] rounded-full bg-[hsl(var(--brand-2))] opacity-20 blur-[120px]" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-5 py-8 md:flex-row md:py-12">
        <aside className="md:w-60 shrink-0">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[hsl(var(--brand))] to-[hsl(var(--brand-2))] animate-glow">
              <Icon name="Boxes" size={22} />
            </div>
            <div>
              <p className="text-lg font-extrabold leading-none">BrickAdmin</p>
              <p className="text-xs text-white/40">панель кодов</p>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto md:flex-col md:gap-1.5">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  tab === n.id
                    ? 'bg-white/10 text-white shadow-lg ring-1 ring-white/10'
                    : 'text-white/50 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon name={n.icon} size={18} />
                {n.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          <header className="mb-8 animate-fade-in">
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              {NAV.find((n) => n.id === tab)?.label}
            </h1>
            <p className="mt-1 text-white/40">Создавай коды на количество бриков — всё хранится на сайте</p>
          </header>

          {tab === 'codes' && (
            <div className="space-y-8">
              <section className="animate-scale-in rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur md:p-8">
                <div className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[hsl(var(--brand-3))]">
                  <Icon name="Sparkles" size={16} />
                  Генератор кодов на брики
                </div>

                <label className="mb-1.5 block text-xs font-semibold text-white/50">Количество бриков</label>
                <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                  <Input
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))}
                    className="h-12 rounded-xl border-white/10 bg-white/5 text-white"
                    placeholder="10"
                  />
                  <Button
                    onClick={createCode}
                    disabled={creating}
                    className="h-12 rounded-xl bg-gradient-to-r from-[hsl(var(--brand))] to-[hsl(var(--brand-2))] px-6 font-bold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <Icon name={creating ? 'Loader2' : 'Plus'} size={18} className={`mr-1 ${creating ? 'animate-spin' : ''}`} />
                    Создать код
                  </Button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {QUICK.map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuantity(String(q))}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      {q} шт
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                {loading && <p className="text-white/40">Загрузка…</p>}
                {!loading && codes.length === 0 && (
                  <p className="text-white/40">Кодов пока нет. Создай первый!</p>
                )}
                {codes.map((c, i) => (
                  <div
                    key={c.id}
                    style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
                    className="animate-fade-in flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.06] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[hsl(var(--brand))]/30 to-[hsl(var(--brand-2))]/30">
                        <Icon name="Ticket" size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-mono text-base font-bold tracking-wide">{c.code}</p>
                        <p className="text-xs text-white/40">
                          {c.quantity} бриков · {c.created}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          c.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-white/10 text-white/40'
                        }`}
                      >
                        {c.status === 'active' ? 'Активен' : 'Использован'}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyCode(c.code)}
                        className="h-9 w-9 rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
                      >
                        <Icon name="Copy" size={16} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeCode(c.id)}
                        className="h-9 w-9 rounded-lg text-white/60 hover:bg-red-500/20 hover:text-red-400"
                      >
                        <Icon name="Trash2" size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </section>
            </div>
          )}

          {tab === 'bricks' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="animate-scale-in rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[hsl(var(--brand))] to-[hsl(var(--brand-2))]">
                  <Icon name="Box" size={26} />
                </div>
                <p className="text-xl font-extrabold">Всего бриков в кодах</p>
                <p className="mt-1 text-4xl font-black text-[hsl(var(--brand-3))]">{stats.bricks}</p>
              </div>
              <div className="animate-scale-in rounded-3xl border border-white/10 bg-white/[0.04] p-6" style={{ animationDelay: '70ms' }}>
                <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[hsl(var(--brand-3))] to-[hsl(var(--brand))]">
                  <Icon name="Boxes" size={26} />
                </div>
                <p className="text-xl font-extrabold">Выпущено кодов</p>
                <p className="mt-1 text-4xl font-black text-[hsl(var(--brand-2))]">{stats.total}</p>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="space-y-3">
              {['Алексей П.', 'Мария К.', 'Дмитрий В.', 'Ольга С.'].map((u, i) => (
                <div
                  key={u}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="animate-fade-in flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[hsl(var(--brand-3))] to-[hsl(var(--brand))] font-bold">
                    {u[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{u}</p>
                    <p className="text-xs text-white/40">Активировал кодов: {i + 1}</p>
                  </div>
                  <Icon name="ChevronRight" size={18} className="text-white/30" />
                </div>
              ))}
            </div>
          )}

          {tab === 'stats' && (
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Всего кодов', value: stats.total, icon: 'Ticket', c: 'var(--brand)' },
                { label: 'Активные', value: stats.active, icon: 'CheckCircle2', c: 'var(--brand-3)' },
                { label: 'Бриков выдано', value: stats.bricks, icon: 'Box', c: 'var(--brand-2)' },
              ].map((s, i) => (
                <div
                  key={s.label}
                  style={{ animationDelay: `${i * 70}ms` }}
                  className="animate-scale-in rounded-3xl border border-white/10 bg-white/[0.04] p-6"
                >
                  <div
                    className="mb-4 grid h-12 w-12 place-items-center rounded-2xl"
                    style={{ background: `hsl(${s.c} / 0.2)`, color: `hsl(${s.c})` }}
                  >
                    <Icon name={s.icon} size={22} />
                  </div>
                  <p className="text-4xl font-black">{s.value}</p>
                  <p className="mt-1 text-sm text-white/40">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
