import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { api } from "@/lib/api";

const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_photo-kiosk-5/artifacts/em2ts921_1753098819.amorporfotos.com.br-removebg-preview.png";

export default function KioskHome() {
  const navigate = useNavigate();

  const onStart = async () => {
    try {
      const { data } = await api.post("/sessions");
      navigate("/kiosk/session/" + data.session_id);
    } catch (e) {
      toast.error("Não foi possível iniciar uma sessão. Tente novamente.");
    }
  };

  return (
    <div className="min-h-screen w-full bg-background" data-testid="kiosk-home-page">
      <div className="flex min-h-screen w-full flex-col px-14 py-12 2xl:px-20" data-testid="kiosk-home-shell">
        <header className="flex items-center justify-between" data-testid="kiosk-home-header">
          <div className="flex items-center gap-5" data-testid="kiosk-home-brand">
            <img
              src={LOGO_URL}
              alt="Amor por Fotos"
              className="h-14 w-auto"
              data-testid="kiosk-home-logo"
            />
            <div className="leading-tight">
              <div
                className="text-xs font-medium uppercase tracking-wide text-foreground/60"
                data-testid="kiosk-home-kicker"
              >
                Totem de revelação
              </div>
              <div className="text-xl font-bold" data-testid="kiosk-home-brand-name">
                Amor por Fotos
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            className="no-print rounded-xl px-5 py-4 text-base"
            onClick={() => navigate("/admin")}
            data-testid="open-admin-button"
          >
            <Settings className="h-5 w-5" />
            Ajustes
          </Button>
        </header>

        <main
          className="flex flex-1 flex-col justify-center gap-10"
          data-testid="kiosk-home-main"
        >
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.35 }}
          >
            <h1
              className="text-6xl font-extrabold tracking-tight"
              data-testid="kiosk-home-headline"
            >
              Suas fotos,
              <span className="text-primary"> impressas agora</span>.
            </h1>
            <p
              className="mt-5 max-w-[64ch] text-xl text-foreground/70"
              data-testid="kiosk-home-subtitle"
            >
              Toque para gerar um QR Code, envie do celular e retire as fotos junto
              do comprovante para pagamento.
            </p>
          </motion.div>

          <Card
            className="w-full rounded-2xl border border-black/5 bg-white shadow-sm"
            data-testid="kiosk-home-start-card"
          >
            <CardContent className="p-10">
              <div className="grid gap-8" data-testid="kiosk-home-card-content">
                <div className="grid gap-3" data-testid="kiosk-home-instructions">
                  <div className="text-base font-semibold text-foreground/80">
                    1) Escaneie o QR Code
                  </div>
                  <div className="text-base text-foreground/60">
                    2) Selecione e envie suas fotos (quantas quiser)
                  </div>
                  <div className="text-base text-foreground/60">
                    3) Volte ao totem e imprima
                  </div>
                </div>

                <Button
                  onClick={onStart}
                  className="h-auto w-full rounded-xl bg-primary px-10 py-8 text-2xl font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                  data-testid="kiosk-home-start-button"
                >
                  Toque para começar
                </Button>

                <div className="text-sm text-foreground/50" data-testid="kiosk-home-note">
                  Fotos HEIC/HEIF serão convertidas automaticamente no celular.
                </div>
              </div>
            </CardContent>
          </Card>
        </main>

        <footer className="pt-10 text-sm text-foreground/40" data-testid="kiosk-home-footer">
          Caso apareça o diálogo de impressão, confirme para iniciar a revelação.
        </footer>
      </div>
    </div>
  );
}
