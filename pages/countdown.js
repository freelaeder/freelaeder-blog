import { useEffect, useMemo, useState } from 'react';
import Footer from '../components/Footer';
import Header from '../components/Header';
import Layout, { GradientBackground } from '../components/Layout';
import SEO from '../components/SEO';
import countdownEvents from '../utils/countdown-events.json';
import { getGlobalData } from '../utils/global-data';

const DATA_SERVER_URL = 'http://127.0.0.1:3789';
const emptyForm = {
  id: '',
  title: '',
  date: '',
  hint: '',
  backgroundColor: '#f3e3d6',
};

const getTodayStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
};

const getDateStart = (dateValue) => {
  const [year, month, day] = `${dateValue}`.split('-').map(Number);
  return new Date(year, month - 1, day).getTime();
};

const getDayDistance = (dateValue) => {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.round((getDateStart(dateValue) - getTodayStart()) / dayMs);
};

const getCountdownMeta = (dateValue) => {
  const days = getDayDistance(dateValue);

  if (days === 0) {
    return {
      days,
      label: '就是今天',
      status: 'TODAY',
      displayDays: '0',
    };
  }

  if (days > 0) {
    return {
      days,
      label: `还剩 ${days} 天`,
      status: 'UPCOMING',
      displayDays: `${days}`,
    };
  }

  return {
    days,
    label: `已过 ${Math.abs(days)} 天`,
    status: 'PAST',
    displayDays: `${Math.abs(days)}`,
  };
};

const sortEvents = (events) =>
  [...events].sort((firstEvent, secondEvent) => {
    const firstDays = getDayDistance(firstEvent.date);
    const secondDays = getDayDistance(secondEvent.date);
    const firstIsPast = firstDays < 0;
    const secondIsPast = secondDays < 0;

    if (firstIsPast !== secondIsPast) {
      return firstIsPast ? 1 : -1;
    }

    if (firstIsPast) {
      return secondDays - firstDays;
    }

    return firstDays - secondDays;
  });

const createEventId = (title) => {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  const fallback = base || 'event';

  return `${fallback}-${Date.now().toString(36)}`.replace(/[^\w-]/g, '');
};

const getTextColor = (hexColor) => {
  const normalizedColor = hexColor.replace('#', '');
  const red = parseInt(normalizedColor.slice(0, 2), 16);
  const green = parseInt(normalizedColor.slice(2, 4), 16);
  const blue = parseInt(normalizedColor.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.58 ? '#161614' : '#ffffff';
};

const isValidHexColor = (value) => /^#[0-9a-fA-F]{6}$/.test(value);
const isValidDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

function CountdownCard({ event, canEdit, onEdit, onDelete }) {
  const meta = getCountdownMeta(event.date);
  const textColor = getTextColor(event.backgroundColor);

  return (
    <article
      className="animate-fade-up relative min-h-[18rem] overflow-hidden rounded-[0.5rem] border border-black/8 p-5 shadow-[0_18px_44px_-34px_rgba(0,0,0,0.42)] dark:border-white/10 sm:p-6"
      style={{
        backgroundColor: event.backgroundColor,
        color: textColor,
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.34),rgba(255,255,255,0.02)_44%,rgba(0,0,0,0.1))]"
      />
      <div className="relative flex min-h-[15.5rem] flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold tracking-[0.2em] uppercase opacity-70">
              {event.hint}
            </p>
            <h2 className="mt-3 text-[1.65rem] leading-tight sm:text-[2rem]">
              {event.title}
            </h2>
          </div>
          <span className="shrink-0 rounded-full border border-current/18 px-3 py-1.5 text-[0.64rem] font-semibold tracking-[0.16em] uppercase opacity-80">
            {meta.status}
          </span>
        </div>

        <div className="mt-auto">
          <div className="flex items-end gap-3">
            <span className="font-primary text-[clamp(4.2rem,18vw,7.5rem)] leading-none tracking-[-0.05em] tabular-nums">
              {meta.displayDays}
            </span>
            <span className="mb-3 text-[0.72rem] font-semibold tracking-[0.2em] uppercase opacity-72">
              Days
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-current/18 pt-4">
            <div>
              <p className="text-sm font-semibold">{meta.label}</p>
              <time className="mt-1 block text-[0.72rem] tracking-[0.16em] opacity-72">
                {event.date}
              </time>
            </div>

            {canEdit && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(event)}
                  className="min-h-11 rounded-full border border-current/24 px-4 text-[0.68rem] font-semibold tracking-[0.16em] uppercase hover:bg-white/18 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(event)}
                  className="min-h-11 rounded-full border border-current/24 px-4 text-[0.68rem] font-semibold tracking-[0.16em] uppercase hover:bg-black/12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function EventForm({
  form,
  formError,
  isSaving,
  isEditing,
  onCancel,
  onChange,
  onSubmit,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="glass-panel animate-fade-up mt-8 rounded-[0.5rem] p-5 sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-neutral-700 dark:text-white/72">
          主题
          <input
            required
            value={form.title}
            onChange={(event) => onChange('title', event.target.value)}
            className="mt-2 h-12 w-full rounded-[0.5rem] border border-black/10 bg-white/72 px-4 text-base text-neutral-950 outline-none focus:border-black/24 dark:border-white/10 dark:bg-white/7 dark:text-white dark:focus:border-white/24"
          />
        </label>

        <label className="block text-sm font-medium text-neutral-700 dark:text-white/72">
          日期
          <input
            required
            type="date"
            value={form.date}
            onChange={(event) => onChange('date', event.target.value)}
            className="mt-2 h-12 w-full rounded-[0.5rem] border border-black/10 bg-white/72 px-4 text-base text-neutral-950 outline-none focus:border-black/24 dark:border-white/10 dark:bg-white/7 dark:text-white dark:focus:border-white/24"
          />
        </label>

        <label className="block text-sm font-medium text-neutral-700 dark:text-white/72 sm:col-span-2">
          距离提示
          <input
            required
            value={form.hint}
            onChange={(event) => onChange('hint', event.target.value)}
            className="mt-2 h-12 w-full rounded-[0.5rem] border border-black/10 bg-white/72 px-4 text-base text-neutral-950 outline-none focus:border-black/24 dark:border-white/10 dark:bg-white/7 dark:text-white dark:focus:border-white/24"
          />
        </label>

        <label className="block text-sm font-medium text-neutral-700 dark:text-white/72">
          背景色
          <div className="mt-2 flex gap-3">
            <input
              aria-label="选择背景色"
              type="color"
              value={isValidHexColor(form.backgroundColor) ? form.backgroundColor : '#f3e3d6'}
              onChange={(event) => onChange('backgroundColor', event.target.value)}
              className="h-12 w-14 rounded-[0.5rem] border border-black/10 bg-transparent p-1 dark:border-white/10"
            />
            <input
              required
              value={form.backgroundColor}
              onChange={(event) => onChange('backgroundColor', event.target.value)}
              className="h-12 min-w-0 flex-1 rounded-[0.5rem] border border-black/10 bg-white/72 px-4 text-base text-neutral-950 outline-none focus:border-black/24 dark:border-white/10 dark:bg-white/7 dark:text-white dark:focus:border-white/24"
            />
          </div>
        </label>
      </div>

      {formError && (
        <p className="mt-4 rounded-[0.5rem] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {formError}
        </p>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-full border border-black/10 px-5 text-[0.7rem] font-semibold tracking-[0.16em] text-neutral-600 uppercase hover:border-black/18 hover:text-neutral-950 dark:border-white/10 dark:text-white/58 dark:hover:border-white/18 dark:hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="min-h-11 rounded-full border border-neutral-950 bg-neutral-950 px-5 text-[0.7rem] font-semibold tracking-[0.16em] text-white uppercase disabled:cursor-not-allowed disabled:opacity-45 dark:border-white dark:bg-white dark:text-neutral-950"
        >
          {isSaving ? 'Saving' : isEditing ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}

export default function Countdown({ globalData, initialEvents }) {
  const [events, setEvents] = useState(initialEvents);
  const [isEditorAvailable, setIsEditorAvailable] = useState(false);
  const [isCheckingEditor, setIsCheckingEditor] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const sortedEvents = useMemo(() => sortEvents(events), [events]);

  useEffect(() => {
    const controller = new AbortController();

    const checkEditor = async () => {
      try {
        const response = await fetch(`${DATA_SERVER_URL}/events`, {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('本地写入服务不可用。');
        }

        const payload = await response.json();

        if (Array.isArray(payload.events)) {
          setEvents(payload.events);
        }

        setIsEditorAvailable(true);
        setStatusMessage('本地写入服务已连接，保存会直接更新事件文件。');
      } catch {
        if (!controller.signal.aborted) {
          setIsEditorAvailable(false);
          setStatusMessage('当前是只读展示模式。使用 npm run dev:countdown 启动本地写入服务后可编辑。');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsCheckingEditor(false);
        }
      }
    };

    checkEditor();

    return () => {
      controller.abort();
    };
  }, []);

  const saveEvents = async (nextEvents) => {
    setIsSaving(true);
    setStatusMessage('');

    try {
      const response = await fetch(`${DATA_SERVER_URL}/events`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: nextEvents }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || '保存事件失败。');
      }

      setEvents(payload.events);
      setStatusMessage('已保存到 utils/countdown-events.json。');
      return true;
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '保存事件失败。');
      setStatusMessage('保存失败，请确认本地写入服务仍在运行。');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const openCreateForm = () => {
    setEditingId('');
    setForm(emptyForm);
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditForm = (event) => {
    setEditingId(event.id);
    setForm(event);
    setFormError('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setEditingId('');
    setForm(emptyForm);
    setFormError('');
    setIsFormOpen(false);
  };

  const updateForm = (field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: field === 'backgroundColor' ? value.toLowerCase() : value,
    }));
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      return '请填写事件主题。';
    }

    if (!isValidDate(form.date)) {
      return '日期需要使用 YYYY-MM-DD。';
    }

    if (!form.hint.trim()) {
      return '请填写距离提示。';
    }

    if (!isValidHexColor(form.backgroundColor)) {
      return '背景色需要使用 #RRGGBB。';
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextError = validateForm();

    if (nextError) {
      setFormError(nextError);
      return;
    }

    const normalizedEvent = {
      id: editingId || createEventId(form.title),
      title: form.title.trim(),
      date: form.date,
      hint: form.hint.trim(),
      backgroundColor: form.backgroundColor.toLowerCase(),
    };
    const nextEvents = editingId
      ? events.map((currentEvent) =>
          currentEvent.id === editingId ? normalizedEvent : currentEvent
        )
      : [...events, normalizedEvent];
    const didSave = await saveEvents(nextEvents);

    if (didSave) {
      closeForm();
    }
  };

  const handleDelete = async (event) => {
    const shouldDelete = window.confirm(`确定删除「${event.title}」吗？`);

    if (!shouldDelete) {
      return;
    }

    setFormError('');
    await saveEvents(events.filter((currentEvent) => currentEvent.id !== event.id));
  };

  return (
    <Layout contentClassName="max-w-[1180px]">
      <SEO
        title={`事件倒计时 | ${globalData.name}`}
        description="集中管理和查看多个事件的倒计时。"
      />
      <Header name={globalData.name} />

      <main className="mx-auto w-full pb-8 pt-4 sm:pt-8">
        <section className="animate-fade-up">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[42rem]">
              <p className="section-kicker w-fit">Countdown</p>
              <h1 className="mt-5 text-[clamp(2.7rem,8vw,5.4rem)] leading-[0.92]">
                事件倒计时
              </h1>
              <p className="mt-5 text-[15px] leading-8 text-neutral-600 dark:text-white/60 sm:text-lg">
                把重要日子放在同一屏里，随时看到主题、距离提示和还剩多少天。
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <p className="max-w-[24rem] text-sm leading-7 text-neutral-500 dark:text-white/48">
                {isCheckingEditor ? '正在检测本地写入服务...' : statusMessage}
              </p>
              {isEditorAvailable && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="min-h-11 rounded-full border border-neutral-950 bg-neutral-950 px-5 text-[0.7rem] font-semibold tracking-[0.16em] text-white uppercase hover:-translate-y-0.5 dark:border-white dark:bg-white dark:text-neutral-950"
                >
                  New Event
                </button>
              )}
            </div>
          </div>
        </section>

        {isEditorAvailable && isFormOpen && (
          <EventForm
            form={form}
            formError={formError}
            isEditing={Boolean(editingId)}
            isSaving={isSaving}
            onCancel={closeForm}
            onChange={updateForm}
            onSubmit={handleSubmit}
          />
        )}

        <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sortedEvents.map((event, index) => (
            <div key={event.id} style={{ animationDelay: `${Math.min(index * 45, 270)}ms` }}>
              <CountdownCard
                event={event}
                canEdit={isEditorAvailable && !isSaving}
                onDelete={handleDelete}
                onEdit={openEditForm}
              />
            </div>
          ))}
        </section>

        {sortedEvents.length === 0 && (
          <section className="glass-panel mt-10 rounded-[0.5rem] p-8 text-center">
            <h2 className="text-2xl">还没有事件</h2>
            <p className="mx-auto mt-3 max-w-[28rem] text-sm leading-7 text-neutral-500 dark:text-white/50">
              使用本地写入服务打开编辑能力后，可以在这里添加第一个倒计时事件。
            </p>
          </section>
        )}
      </main>

      <Footer copyrightText={globalData.footerText} />
      <GradientBackground variant="large" className="fixed top-0 opacity-80" />
      <GradientBackground
        variant="small"
        className="absolute bottom-0 opacity-70"
      />
    </Layout>
  );
}

export function getStaticProps() {
  const globalData = getGlobalData();

  return {
    props: {
      globalData,
      initialEvents: countdownEvents,
    },
  };
}
