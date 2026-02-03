import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CloudUpload, Loader2, Plus, CheckCircle2 } from "lucide-react";
import heic2any from "heic2any";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/sonner";
import { api } from "@/lib/api";

const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_photo-kiosk-5/artifacts/em2ts921_1753098819.amorporfotos.com.br-removebg-preview.png";

const isHeic = (file) => {
  const name = (file && file.name ? file.name : "").toLowerCase();
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
  const navigate = useNavigate();

  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);

  const previews = useMemo(() => {
    return selected.map((f) => ({
      key: f.name + "-" + f.size + "-" + f.lastModified,
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
        if (!f.type?.startsWith("image/") && !isHeic(f)) continue;
        converted.push(await convertIfNeeded(f));
      }
      if (converted.length === 0) {
        toast.message("Selecione imagens.");
        return;
      }
      setSelected((prev) => prev.concat(converted));
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const onUpload = async () => {
    if (selected.length === 0) return;

    setBusy(true);
    setProgress(0);

    try {
      const form = new FormData();
      for (const f of selected) form.append("files", f, f.name);

      const { data } = await api.post("/sessions/" + sessionId + "/photos", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          setProgress(Math.min(100, Math.round((evt.loaded / evt.total) * 100)));
        },
      });

      setUploadedCount((c) => c + (data?.length || 0));
      setSelected([]);
      toast.success("Enviado.");
    } catch (e) {
      toast.error("Falha no upload.");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid="mobile-upload-page">
      <div className="mx-auto w-full max-w-md px-5 pb-28 pt-6" data-testid="mobile-upload-shell">
        <header className="flex items-center justify-between" data-testid="mobile-upload-header">
          <img src={LOGO_URL} alt="Amor por Fotos" className="h-10 w-auto" data-testid="mobile-upload-logo" />
          <Button
            variant="ghost"
            className="rounded-xl"
            onClick={() => navigate("/")}
            data-testid="mobile-upload-back-home"
          >
            Totem
          </Button>
        </header>

        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="mt-6"
          data-testid="mobile-upload-hero"
        >
          <div className="text-xs font-medium uppercase tracking-wide text-foreground/60" data-testid="mobile-upload-step">
            Etapa 2 · Upload
          </div>
          <div className="mt-2 text-3xl font-extrabold tracking-tight" data-testid="mobile-upload-title">
            Selecione e envie
          </div>
        </motion.div>

        <Card className="mt-6 rounded-2xl border border-black/5 bg-white shadow-sm" data-testid="mobile-upload-card">
          <CardContent className="p-6">
            <label
              className="block cursor-pointer rounded-2xl border border-dashed border-black/15 bg-background px-5 py-10 text-center"
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
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Plus className="h-6 w-6" />
              </div>
              <div className="mt-4 text-base font-bold" data-testid="mobile-upload-cta">
                Adicionar fotos
              </div>
            </label>

            {busy && progress > 0 ? (
              <div className="mt-4" data-testid="mobile-upload-progress-wrapper">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                  <span>Enviando</span>
                  <span data-testid="mobile-upload-progress-text">{progress}%</span>
                </div>
                <Progress value={progress} data-testid="mobile-upload-progress" />
              </div>
            ) : null}

            <div className="mt-5 flex items-center justify-between text-xs text-foreground/60" data-testid="mobile-upload-stats">
              <div data-testid="mobile-upload-selected-count">{selected.length} selecionada(s)</div>
              <div className="flex items-center gap-2" data-testid="mobile-upload-uploaded-count">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                {uploadedCount} enviada(s)
              </div>
            </div>
          </CardContent>
        </Card>

        {previews.length > 0 ? (
          <div className="mt-6" data-testid="mobile-upload-previews-section">
            <div className="grid grid-cols-3 gap-3" data-testid="mobile-upload-previews-grid">
              {previews.slice(0, 18).map((p) => {
                const key = p.key;
                const url = p.url;
                const name = p.name;
                return (
                  <div
                    key={key}
                    className="overflow-hidden rounded-xl border border-black/5 bg-white"
                    data-testid={"mobile-upload-preview-" + key}
                  >
                    <img src={url} alt={name} className="h-24 w-full object-cover" />
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div
        className="fixed inset-x-0 bottom-0 border-t border-black/5 bg-white/95 px-5 py-3"
        style={{ backdropFilter: "blur(10px)" }}
        data-testid="mobile-upload-bottom-bar"
      >
        <div className="mx-auto w-full max-w-md">
          <Button
            onClick={onUpload}
            disabled={busy || selected.length === 0}
            className="h-auto w-full rounded-xl bg-secondary px-6 py-3 text-base font-bold text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/90 disabled:opacity-60"
            data-testid="mobile-upload-submit-button"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CloudUpload className="h-5 w-5" />}
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
