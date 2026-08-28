"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";
import { humanDate } from "@/lib/date";
import type { DayDetail } from "@/lib/types";

export default function EditForm({ date }: { date: string }) {
  const token = useSearchParams().get("token") || "";
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [productName, setProductName] = useState("");
  const [tagline, setTagline] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [url, setUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetch(`/api/day/${date}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: DayDetail) => {
        const l = d.launch;
        if (l) {
          setProductName(l.product_name || "");
          setTagline(l.tagline || "");
          setCategory(l.category || CATEGORIES[0]);
          setUrl(l.url || "");
          setLogoUrl(l.logo_url || "");
          setDescription(l.description || "");
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [date]);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/launch/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          token,
          product_name: productName,
          tagline,
          category,
          url,
          logo_url: logoUrl,
          description,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg({
          kind: "err",
          text:
            res.status === 403
              ? "That edit link is invalid or you no longer hold this day."
              : json.error || "Could not save.",
        });
      } else {
        setMsg({ kind: "ok", text: "Saved. Your launch page is live." });
      }
    } catch {
      setMsg({ kind: "err", text: "Network error." });
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return (
      <Wrap>
        <p className="text-rose-200">
          This page needs your private edit link (with <code>?token=…</code>). Check the
          confirmation you got after paying.
        </p>
      </Wrap>
    );
  }

  return (
    <Wrap>
      <h1 className="text-2xl font-extrabold glow">Your launch page</h1>
      <p className="mt-1 text-sm text-white/50">
        {humanDate(date)} · edits go live immediately at{" "}
        <Link href={`/launch/${date}`} className="text-violet-300 hover:text-white">
          /launch/{date}
        </Link>
      </p>

      {!loaded ? (
        <p className="mt-6 text-white/40">Loading…</p>
      ) : (
        <div className="mt-6 space-y-3">
          <Field label="Product name">
            <input className="field" value={productName} maxLength={80} onChange={(e) => setProductName(e.target.value)} />
          </Field>
          <Field label="Tagline">
            <input className="field" value={tagline} maxLength={140} onChange={(e) => setTagline(e.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category">
              <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Website URL">
              <input className="field" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
            </Field>
          </div>
          <Field label="Logo URL">
            <input
              className="field"
              placeholder="https://…/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </Field>
          <Field label="Launch description">
            <textarea
              className="field min-h-[160px]"
              maxLength={4000}
              placeholder="Tell people what you shipped, why it matters, and what's next."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          {msg && (
            <p
              className={
                msg.kind === "ok"
                  ? "rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200"
                  : "rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
              }
            >
              {msg.text}
            </p>
          )}

          <div className="flex gap-2">
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save launch page"}
            </button>
            <Link href={`/launch/${date}`} className="btn-ghost">
              Preview
            </Link>
          </div>
        </div>
      )}
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-2xl px-4">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-violet-200/70">{label}</span>
      {children}
    </label>
  );
}
