import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, Settings } from "lucide-react";

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
    <div className="relative min-h-screen w-full bg-background" data-testid="kiosk-home-page">
      {/* small decorative wash (<20% viewport) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[18vh] bg-gradient-to-b from-primary/12 to-transparent"
        aria-hidden="true"
      />

      <div className="relative flex min-h-screen w-full flex-col px-14 py-12 2xl:px-20" data-testid="kiosk-home-shell">
        <header className="flex items-center justify-between" data-testid="kiosk-home-header">
          <img src={LOGO_URL} alt="Amor por Fotos" className="h-14 w-auto" data-testid="kiosk-home-logo" />
          <Button
            variant="ghost"
            className="no-print rounded-2xl px-3 py-3"
            onClick={() => navigate("/admin")}
            data-testid="open-admin-button"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </header>

        <main className="flex flex-1 items-center justify-center" data-testid="kiosk-home-main">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[980px]"
            data-testid="kiosk-home-center"
          >
            <div className="mx-auto grid w-full place-items-center text-center">
              <div
                className="grid h-24 w-24 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm"
                data-testid="kiosk-home-icon"
              >
                <Camera className="h-10 w-10" />
              </div>

              <h1
                className="mt-10 text-6xl font-extrabold tracking-tight text-foreground"
                data-testid="kiosk-home-headline"
              >
                Amor por Fotos
                <span className="text-secondary"> ♥</span>
              </h1>

              <p
                className="mt-6 text-3xl font-semibold tracking-tight text-foreground/85"
                data-testid="kiosk-home-subheadline"
              >
                Suas fotos reveladas com amor
              </p>

              <p
                className="mt-6 text-base text-foreground/55"
                data-testid="kiosk-home-kicker"
              >
                Toque para revelar sua história
              </p>

              <Card className="mt-14 w-full max-w-[720px] rounded-[28px] border border-black/5 bg-white shadow-sm" data-testid="kiosk-home-start-card">
                <CardContent className="p-10">
                  <Button
                    onClick={onStart}
                    className="h-auto w-full rounded-full bg-primary px-10 py-7 text-2xl font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                    data-testid="kiosk-home-start-button"
                  >
                    Toque para Começar
                  </Button>

                  <div className="mt-8 flex items-center justify-center gap-3 text-sm text-foreground/45" data-testid="kiosk-home-note">
                    <Camera className="h-4 w-4" />
                    Revelação instantânea de fotos
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </main>

        <footer className="pt-10 text-xs text-foreground/35" data-testid="kiosk-home-footer">
          Totem Amor por Fotos
        </footer>
      </div>
    </div>
  );
}
