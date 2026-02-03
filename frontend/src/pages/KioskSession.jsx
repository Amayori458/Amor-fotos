import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  Camera,
  CheckCircle2,
  Clock3,
  Images,
  Printer,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import { absoluteFromPath, api } from "@/lib/api";

const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_photo-kiosk-5/artifacts/em2ts921_1753098819.amorporfotos.com.br-removebg-preview.png";

export default function KioskSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);

  const pollRef = useRef(null);

  const uploadUrl = useMemo(() => {
    const origin = window.location.origin;
    return origin + "/upload/" + sessionId;
  }, [sessionId]);

  const kioskAutoReturnSec = 5 * 60;
  const [idleCountdown, setIdleCountdown] = useState(kioskAutoReturnSec);

  const fetchSession = async () => {
    try {
      const { data } = await api.get("/sessions/" + sessionId);
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
      const { data } = await api.post("/sessions/" + sessionId + "/orders", {
        selected_photo_ids: null,
      });

      const url = "/print/" + data.order_number + "?autoprint=1&from=kiosk";
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) toast.message("Permita pop-ups para imprimir automaticamente.");

      toast.success("Pedido gerado. Confirme a impressão.");
    } catch (e) {
      toast.error("Não foi possível gerar o comprovante.");
    } finally {
      setCreatingOrder(false);
    }
  };

  const photos = (session && Array.isArray(session.photos) ? session.photos : []) || [];

  return (
    <div
      className="min-h-screen w-full bg-background"
      onPointerDown={resetIdle}
      onKeyDown={resetIdle}
      tabIndex={-1}
      data-testid="kiosk-session-page"
    >
      <div className="flex min-h-screen w-full flex-col px-14 py-12 2xl:px-20" data-testid="kiosk-session-shell">
        <header className="flex items-center justify-between" data-testid="kiosk-session-header">
          <div className="flex items-center gap-5">
            <img
              src={LOGO_URL}
              alt="Amor por Fotos"
              className="h-12 w-auto"
              data-testid="kiosk-session-logo"
            />
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-foreground/60">
                Sessão
              </div>
              <div className="text-lg font-bold" data-testid="kiosk-session-id-text">
                {sessionId}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div
              className="flex items-center gap-2 rounded-full bg-muted px-5 py-3 text-sm font-semibold text-foreground/70"
              data-testid="kiosk-idle-timer"
            >
              <Clock3 className="h-4 w-4" />
              {idleCountdown}s
            </div>
            <Button
              variant="secondary"
              className="h-auto rounded-full px-7 py-3 text-base font-bold"
              onClick={() => navigate("/")}
              data-testid="kiosk-back-home-button"
            >
              <RotateCcw className="h-5 w-5" />
              Nova sessão
            </Button>
          </div>
        </header>

        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="mt-10"
        >
          <h1 className="text-5xl font-extrabold tracking-tight" data-testid="kiosk-session-headline">
            Escaneie e envie suas fotos
          </h1>
          <p className="mt-4 text-lg text-foreground/70" data-testid="kiosk-session-subtitle">
            Use o celular para enviar. As miniaturas aparecem automaticamente.
          </p>
        </motion.div>

        <div className="mt-10 flex flex-1 flex-col gap-8" data-testid="kiosk-session-content">
          <Card className="w-full rounded-2xl border border-black/5 bg-white shadow-sm" data-testid="kiosk-session-card">
            <CardContent className="p-10">
              <div className="grid gap-10">
                <div className="grid grid-cols-1 gap-10 md:grid-cols-2" data-testid="kiosk-qr-and-url">
                  <div className="space-y-5">
                    <div className="flex items-center gap-4">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                        <Camera className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-foreground/60">
                          Passo 1
                        </div>
                        <div className="text-xl font-bold">Escaneie o QR Code</div>
                      </div>
                    </div>

                    <div className="text-base text-foreground/60" data-testid="kiosk-step-1-text">
                      Abra a câmera do seu celular e aponte para o código.
                    </div>

                    <div
                      className="rounded-xl border border-black/10 bg-background px-5 py-4 text-sm text-foreground/70"
                      data-testid="kiosk-upload-url"
                    >
                      {uploadUrl}
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="rounded-2xl border border-black/10 bg-white p-7" data-testid="kiosk-qr-wrapper">
                      <QRCodeSVG value={uploadUrl} size={320} level="H" includeMargin />
                      <div className="mt-4 text-center text-sm font-semibold text-foreground/60" data-testid="kiosk-qr-label">
                        Escaneie para começar
                      </div>
                      <div className="sr-only" data-testid="kiosk-qr-code" />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 gap-10 md:grid-cols-2" data-testid="kiosk-upload-and-print">
                  <div className="space-y-5">
                    <div className="flex items-center gap-4">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                        <Images className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-foreground/60">
                          Passo 2
                        </div>
                        <div className="text-xl font-bold">Envie suas fotos</div>
                      </div>
                    </div>

                    <div className="text-base text-foreground/60" data-testid="kiosk-step-2-text">
                      Assim que o envio terminar, a prévia aparece aqui.
                    </div>

                    <div
                      className="inline-flex items-center gap-2 rounded-full bg-muted px-5 py-3 text-sm font-semibold"
                      data-testid="kiosk-uploaded-count-badge"
                    >
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      <span data-testid="uploaded-count-text">{photos.length}</span> foto(s) recebida(s)
                    </div>
                  </div>

                  <div className="flex flex-col justify-center">
                    <Button
                      onClick={onPrint}
                      disabled={creatingOrder || photos.length === 0}
                      className="h-auto w-full rounded-xl bg-secondary px-8 py-8 text-2xl font-bold text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/90 disabled:opacity-60"
                      data-testid="kiosk-print-button"
                    >
                      <Printer className="h-7 w-7" />
                      Imprimir + comprovante
                    </Button>
                    <div className="mt-4 text-sm text-foreground/50" data-testid="kiosk-print-helper">
                      Será aberta uma janela de impressão do navegador.
                    </div>
                  </div>
                </div>

                <div data-testid="kiosk-preview-section">
                  <div className="mb-4 text-xs font-medium uppercase tracking-wide text-foreground/60">
                    Prévia
                  </div>
                  {loading ? (
                    <div className="text-base text-foreground/60" data-testid="kiosk-loading-text">
                      Carregando...
                    </div>
                  ) : photos.length === 0 ? (
                    <div
                      className="rounded-2xl border border-dashed border-black/15 bg-background p-7 text-base text-foreground/60"
                      data-testid="kiosk-empty-photos"
                    >
                      Aguardando upload do celular…
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-4" data-testid="kiosk-photos-grid">
                      {photos.slice(-12).map((p) => {
                        const photoId = p.photo_id;
                        const urlPath = p.url_path;
                        const fileName = p.file_name;
                        return (
                          <div
                            key={photoId}
                            className="overflow-hidden rounded-xl border border-black/5 bg-white"
                            data-testid={"kiosk-photo-thumb-" + photoId}
                          >
                            <img
                              src={absoluteFromPath(urlPath)}
                              alt={fileName}
                              className="h-32 w-full object-cover"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div
            className="rounded-2xl border border-black/5 bg-muted/50 p-6 text-sm text-foreground/60"
            data-testid="kiosk-security-note"
          >
            Mantenha esta tela aberta durante o envio. A sessão volta ao início automaticamente.
          </div>
        </div>
      </div>
    </div>
  );
}
