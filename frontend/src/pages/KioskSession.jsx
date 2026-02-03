import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import QRCode from "qrcode.react";
import { Camera, CheckCircle2, Clock3, Images, Printer, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import { absoluteFromPath, api } from "@/lib/api";

export default function KioskSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);

  const pollRef = useRef(null);

  const uploadUrl = useMemo(() => {
    const origin = window.location.origin;
    return `${origin}/upload/${sessionId}`;
  }, [sessionId]);

  const kioskAutoReturnSec = 5 * 60;
  const [idleCountdown, setIdleCountdown] = useState(kioskAutoReturnSec);

  const fetchSession = async () => {
    try {
      const { data } = await api.get(`/sessions/${sessionId}`);
      setSession(data);
    } catch (e) {
      toast.error("Sessão inválida ou expirada.");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    pollRef.current = setInterval(fetchSession, 1500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    const t = setInterval(() => {
      setIdleCountdown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (idleCountdown <= 0) navigate("/");
  }, [idleCountdown, navigate]);

  const resetIdle = () => setIdleCountdown(kioskAutoReturnSec);

  const onPrint = async () => {
    resetIdle();
    setCreatingOrder(true);
    try {
      const { data } = await api.post(`/sessions/${sessionId}/orders`, {
        selected_photo_ids: null,
      });

      const url = `/print/${data.order_number}?autoprint=1&from=kiosk`;
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) toast.message("Permita pop-ups para imprimir automaticamente.");

      toast.success("Pedido gerado. Confirme a impressão.");
    } catch (e) {
      toast.error("Não foi possível gerar o comprovante.");
    } finally {
      setCreatingOrder(false);
    }
  };

  const photos = session?.photos || [];

  const priceText = useMemo(() => {
    const p = searchParams.get("price");
    return p;
  }, [searchParams]);

  return (
    <div
      className="kiosk-shell noise bg-background"
      onPointerDown={resetIdle}
      onKeyDown={resetIdle}
      tabIndex={-1}
      data-testid="kiosk-session-page"
    >
      <div className="absolute inset-x-0 top-0 h-[18vh] bg-gradient-to-b from-secondary/15 to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1080px] flex-col px-8 py-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
              Sessão
            </div>
            <div
              className="text-2xl font-extrabold tracking-tight"
              data-testid="kiosk-session-id-text"
            >
              {sessionId}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold shadow-sm"
              data-testid="kiosk-idle-timer"
            >
              <Clock3 className="h-4 w-4 text-foreground/70" />
              {idleCountdown}s
            </div>
            <Button
              variant="secondary"
              className="h-auto rounded-full px-6 py-4 text-base font-bold"
              onClick={() => navigate("/")}
              data-testid="kiosk-back-home-button"
            >
              <RotateCcw className="h-5 w-5" />
              Nova sessão
            </Button>
          </div>
        </div>

        <motion.div
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="mt-8"
        >
          <h1 className="text-5xl font-extrabold tracking-tight" data-testid="kiosk-session-headline">
            Escaneie e envie suas fotos
          </h1>
          <p className="mt-3 text-lg text-foreground/70" data-testid="kiosk-session-subtitle">
            Aponte a câmera do celular para o QR Code e selecione as imagens.
          </p>
        </motion.div>

        <div className="mt-8 grid grid-cols-1 gap-6">
          <Card className="glass rounded-[28px] border-black/5 bg-white/75 shadow-xl">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 gap-8">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow">
                        <Camera className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
                          Passo 1
                        </div>
                        <div className="text-xl font-bold">Escaneie o QR Code</div>
                      </div>
                    </div>
                    <div className="text-base text-foreground/70" data-testid="kiosk-step-1-text">
                      Abra a câmera do seu celular e aponte para o código.
                    </div>
                    <div
                      className="rounded-2xl border border-black/5 bg-white p-4 text-sm text-foreground/70"
                      data-testid="kiosk-upload-url"
                    >
                      {uploadUrl}
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="rounded-3xl border-2 border-primary/30 bg-white p-6 shadow-sm">
                      <QRCode value={uploadUrl} size={300} level="H" includeMargin />
                      <div className="mt-4 text-center text-sm font-semibold text-foreground/70" data-testid="kiosk-qr-label">
                        Escaneie para começar
                      </div>
                      <div className="sr-only" data-testid="kiosk-qr-code" />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground shadow">
                        <Images className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
                          Passo 2
                        </div>
                        <div className="text-xl font-bold">Envie suas fotos</div>
                      </div>
                    </div>

                    <div
                      className="text-base text-foreground/70"
                      data-testid="kiosk-step-2-text"
                    >
                      Assim que o envio terminar, as miniaturas aparecem aqui.
                    </div>

                    <div
                      className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary"
                      data-testid="kiosk-uploaded-count-badge"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span data-testid="uploaded-count-text">{photos.length}</span> foto(s) recebida(s)
                    </div>

                    {priceText ? (
                      <div className="text-sm text-foreground/60" data-testid="kiosk-price-hint">
                        Preço configurado: {priceText}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <Button
                      onClick={onPrint}
                      disabled={creatingOrder || photos.length === 0}
                      className="h-auto w-full rounded-full bg-secondary px-10 py-8 text-2xl font-extrabold tracking-wide text-secondary-foreground shadow-lg transition-colors hover:bg-secondary/90 disabled:opacity-60"
                      data-testid="kiosk-print-button"
                    >
                      <Printer className="h-7 w-7" />
                      Imprimir + comprovante
                    </Button>

                    <div className="mt-3 text-sm text-foreground/60" data-testid="kiosk-print-helper">
                      Uma janela de impressão será aberta. Confirme para revelar.
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground/60">
                    Prévia
                  </div>
                  {loading ? (
                    <div className="text-base text-foreground/60" data-testid="kiosk-loading-text">
                      Carregando...
                    </div>
                  ) : photos.length === 0 ? (
                    <div
                      className="rounded-3xl border border-dashed border-black/10 bg-white/70 p-8 text-base text-foreground/60"
                      data-testid="kiosk-empty-photos"
                    >
                      Aguardando upload do celular…
                    </div>
                  ) : (
                    <div
                      className="grid grid-cols-3 gap-3 md:grid-cols-4"
                      data-testid="kiosk-photos-grid"
                    >
                      {photos.slice(-12).map((p) => (
                        <div
                          key={p.photo_id}
                          className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm"
                          data-testid={`kiosk-photo-thumb-${p.photo_id}`}
                        >
                          <img
                            src={absoluteFromPath(p.url_path)}
                            alt={p.file_name}
                            className="h-36 w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div
            className="rounded-3xl border border-black/5 bg-white/70 p-6 text-sm text-foreground/60"
            data-testid="kiosk-security-note"
          >
            Dica: mantenha esta tela aberta durante o envio. A sessão volta para o início automaticamente.
          </div>
        </div>
      </div>
    </div>
  );
}
