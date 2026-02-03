import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Clock3, Printer, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { api } from "@/lib/api";

const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_photo-kiosk-5/artifacts/em2ts921_1753098819.amorporfotos.com.br-removebg-preview.png";

export default function KioskSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
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
      navigate("/");
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

  const photosCount =
    session?.photos_count ??
    (Array.isArray(session?.photos) ? session.photos.length : 0);

  const onPrint = async () => {
    resetIdle();
    setCreatingOrder(true);

    // Pre-open a single window in the same gesture (most reliable on the web)
    const win = window.open("about:blank", "_blank");

    try {
      const { data } = await api.post("/sessions/" + sessionId + "/orders", {
        selected_photo_ids: null,
      });

      const combinedUrl =
        "/print/" + data.order_number + "?autoprint=1&combined=1&from=kiosk";

      if (win) {
        win.location.href = combinedUrl;
      } else {
        toast.message("Permita pop-ups para imprimir.");
      }
    } catch (e) {
      try {
        if (win) win.close();
      } catch (err) {
        // ignore
      }
      toast.error("Falha ao gerar impressão.");
    } finally {
      setCreatingOrder(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full bg-background"
      onPointerDown={resetIdle}
      onKeyDown={resetIdle}
      tabIndex={-1}
      data-testid="kiosk-session-page"
    >
      <div
        className="flex min-h-screen w-full flex-col px-14 py-12 2xl:px-20"
        data-testid="kiosk-session-shell"
      >
        <header
          className="flex items-center justify-between"
          data-testid="kiosk-session-header"
        >
          <img
            src={LOGO_URL}
            alt="Amor por Fotos"
            className="h-12 w-auto"
            data-testid="kiosk-session-logo"
          />

          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-semibold text-foreground/70"
              data-testid="kiosk-idle-timer"
            >
              <Clock3 className="h-4 w-4" />
              {idleCountdown}s
            </div>
            <Button
              variant="ghost"
              className="rounded-xl px-3 py-3"
              onClick={() => navigate("/")}
              data-testid="kiosk-back-home-button"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main
          className="flex flex-1 flex-col justify-center gap-10"
          data-testid="kiosk-session-main"
        >
          <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <div
              className="text-xs font-medium uppercase tracking-wide text-foreground/60"
              data-testid="kiosk-session-kicker"
            >
              Etapa 1 · QR
            </div>
            <div
              className="mt-3 text-4xl font-extrabold tracking-tight"
              data-testid="kiosk-session-headline"
            >
              Escaneie
            </div>
          </motion.div>

          <Card
            className="rounded-2xl border border-black/5 bg-white shadow-sm"
            data-testid="kiosk-session-card"
          >
            <CardContent className="p-10">
              <div
                className="grid grid-cols-1 gap-10 md:grid-cols-2"
                data-testid="kiosk-session-grid"
              >
                <div
                  className="flex items-center justify-center"
                  data-testid="kiosk-qr-wrapper"
                >
                  <div className="rounded-2xl border border-black/10 bg-white p-6">
                    <QRCodeSVG value={uploadUrl} size={320} level="H" includeMargin />
                    <div className="sr-only" data-testid="kiosk-qr-code" />
                  </div>
                </div>

                <div
                  className="flex flex-col justify-center gap-6"
                  data-testid="kiosk-session-right"
                >
                  <div
                    className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-semibold"
                    data-testid="kiosk-uploaded-count-badge"
                  >
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                    <span data-testid="uploaded-count-text">{photosCount}</span>
                  </div>

                  <Button
                    onClick={onPrint}
                    disabled={creatingOrder || photosCount === 0}
                    className="h-auto w-full rounded-xl bg-secondary px-6 py-6 text-xl font-bold text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/90 disabled:opacity-60"
                    data-testid="kiosk-print-button"
                  >
                    <Printer className="h-6 w-6" />
                    Imprimir
                  </Button>

                  <div
                    className="text-xs text-foreground/40"
                    data-testid="kiosk-session-sessionid"
                  >
                    {sessionId}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
