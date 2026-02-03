import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, CloudUpload, Images, Loader2 } from "lucide-react";
import heic2any from "heic2any";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/sonner";
import { api } from "@/lib/api";

const isHeic = (file) => {
  const name = (file?.name || "").toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif") || file?.type === "image/heic";
};

async function convertIfNeeded(file) {
  if (!isHeic(file)) return file;
  try {
    const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    const outBlob = Array.isArray(blob) ? blob[0] : blob;
    const newName = (file.name || "foto").replace(/\.(heic|heif)$/i, ".jpg");
    return new File([outBlob], newName, { type: "image/jpeg" });
  } catch (e) {
    return file;
  }
}

export default function MobileUpload() {
  const { sessionId } = useParams();
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);

  const previews = useMemo(() => {
    return selected.map((f) => ({
      key: `${f.name}-${f.size}-${f.lastModified}`,
      url: URL.createObjectURL(f),
      name: f.name,
    }));
  }, [selected]);

  const onPickFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setBusy(true);
    try {
      const converted = [];
      for (const f of files) {
        // accept maximum possible: try convert HEIC, keep others
        // skip clearly non-images (still allow if browser reports image/*)
        if (!f.type?.startsWith("image/") && !isHeic(f)) continue;
        converted.push(await convertIfNeeded(f));
      }
      if (converted.length === 0) {
        toast.message("Selecione arquivos de imagem (JPG, PNG, HEIC…).");
        return;
      }
      setSelected((prev) => [...prev, ...converted]);
      toast.success(`${converted.length} foto(s) adicionada(s).`);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const onUpload = async () => {
    if (selected.length === 0) {
      toast.message("Selecione uma ou mais fotos.");
      return;
    }

    setBusy(true);
    setProgress(0);

    try {
      const form = new FormData();
      for (const f of selected) form.append("files", f, f.name);

      const { data } = await api.post(`/sessions/${sessionId}/photos`, form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          setProgress(Math.min(100, Math.round((evt.loaded / evt.total) * 100)));
        },
      });

      setUploadedCount((c) => c + (data?.length || 0));
      setSelected([]);
      toast.success("Upload concluído! Você pode enviar mais fotos.");
    } catch (e) {
      toast.error("Falha no upload. Tente novamente.");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-background px-5 py-8" data-testid="mobile-upload-page">
      <div className="mx-auto w-full max-w-md">
        <motion.div
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
            <Images className="h-4 w-4" />
            Upload da sessão
          </div>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight" data-testid="mobile-upload-title">
            Envie suas fotos
          </h1>
          <p className="mt-2 text-base text-foreground/70" data-testid="mobile-upload-subtitle">
            Selecione imagens do seu celular. Pode adicionar mais fotos depois.
          </p>
        </motion.div>

        <Card className="mt-6 rounded-[28px] border-black/5 bg-white/80 shadow-xl">
          <CardContent className="p-6">
            <label
              className="block cursor-pointer rounded-3xl border-2 border-dashed border-primary/25 bg-white px-5 py-10 text-center"
              data-testid="mobile-upload-dropzone"
            >
              <input
                type="file"
                accept="image/*,.heic,.heif"
                multiple
                className="hidden"
                onChange={onPickFiles}
                disabled={busy}
                data-testid="mobile-upload-file-input"
              />
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow">
                <CloudUpload className="h-7 w-7" />
              </div>
              <div className="mt-4 text-lg font-bold" data-testid="mobile-upload-cta">
                Toque para selecionar
              </div>
              <div className="mt-2 text-sm text-foreground/60" data-testid="mobile-upload-hint">
                Aceita JPG, PNG e HEIC (convertido automaticamente).
              </div>
            </label>

            {busy && progress > 0 ? (
              <div className="mt-4" data-testid="mobile-upload-progress-wrapper">
                <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                  <span>Enviando…</span>
                  <span data-testid="mobile-upload-progress-text">{progress}%</span>
                </div>
                <Progress value={progress} data-testid="mobile-upload-progress" />
              </div>
            ) : null}

            <div className="mt-5 flex gap-3">
              <Button
                onClick={onUpload}
                disabled={busy || selected.length === 0}
                className="h-auto flex-1 rounded-full bg-secondary px-6 py-4 text-lg font-extrabold text-secondary-foreground shadow-md transition-colors hover:bg-secondary/90 disabled:opacity-60"
                data-testid="mobile-upload-submit-button"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                Enviar ({selected.length})
              </Button>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-foreground/70" data-testid="mobile-upload-uploaded-count">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Enviadas nesta sessão: <span className="font-extrabold">{uploadedCount}</span>
            </div>
          </CardContent>
        </Card>

        {previews.length > 0 ? (
          <div className="mt-6" data-testid="mobile-upload-previews-section">
            <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground/60">
              Prévia ({previews.length})
            </div>
            <div className="grid grid-cols-3 gap-3" data-testid="mobile-upload-previews-grid">
              {previews.slice(0, 24).map((p) => (
                <div
                  key={p.key}
                  className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm"
                  data-testid={`mobile-upload-preview-${p.key}`}
                >
                  <img src={p.url} alt={p.name} className="h-24 w-full object-cover" />
                </div>
              ))}
            </div>
            {previews.length > 24 ? (
              <div className="mt-3 text-sm text-foreground/60" data-testid="mobile-upload-previews-more">
                Mostrando 24 de {previews.length}.
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 text-center text-xs text-foreground/50" data-testid="mobile-upload-footer">
          Ao finalizar, volte para o totem para imprimir.
        </div>
      </div>
    </div>
  );
}
