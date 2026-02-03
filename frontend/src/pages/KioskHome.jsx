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
      toast.error("Falha ao iniciar.");
    }
  };

  return (
    <div className="min-h-screen w-full bg-background" data-testid="kiosk-home-page">
      <div className="flex min-h-screen w-full flex-col px-14 py-12 2xl:px-20" data-testid="kiosk-home-shell">
        <header className="flex items-center justify-between" data-testid="kiosk-home-header">
          <img src={LOGO_URL} alt="Amor por Fotos" className="h-14 w-auto" data-testid="kiosk-home-logo" />
          <Button
            variant="ghost"
            className="no-print rounded-xl px-5 py-4"
            onClick={() => navigate("/admin")}
            data-testid="open-admin-button"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </header>

        <main className="flex flex-1 flex-col justify-center gap-10" data-testid="kiosk-home-main">
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-xs font-medium uppercase tracking-wide text-foreground/60" data-testid="kiosk-home-kicker">
              Etapa 1 · QR
            </div>
            <h1 className="mt-3 text-6xl font-extrabold tracking-tight" data-testid="kiosk-home-headline">
              Começar
            </h1>
          </motion.div>

          <Card className="w-full rounded-2xl border border-black/5 bg-white shadow-sm" data-testid="kiosk-home-start-card">
            <CardContent className="p-10">
              <Button
                onClick={onStart}
                className="h-auto w-full rounded-xl bg-primary px-10 py-10 text-3xl font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                data-testid="kiosk-home-start-button"
              >
                Gerar QR
              </Button>
              <div className="mt-5 text-sm text-foreground/50" data-testid="kiosk-home-note">
                Envie do celular e volte para imprimir.
              </div>
            </CardContent>
          </Card>
        </main>

        <footer className="pt-10 text-xs text-foreground/40" data-testid="kiosk-home-footer">
          Totem Amor por Fotos
        </footer>
      </div>
    </div>
  );
}
