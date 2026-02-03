import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Sparkles, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { api } from "@/lib/api";

export default function KioskHome() {
  const navigate = useNavigate();

  const onStart = async () => {
    try {
      const { data } = await api.post("/sessions");
      navigate(`/kiosk/session/${data.session_id}`);
    } catch (e) {
      toast.error("Não foi possível iniciar uma sessão. Tente novamente.");
    }
  };

  return (
    <div className="kiosk-shell noise bg-background" data-testid="kiosk-home-page">
      <div
        className="absolute inset-x-0 top-0 h-[18vh] bg-gradient-to-b from-primary/15 to-transparent"
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1080px] flex-col px-8 py-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg"
              data-testid="brand-mark"
            >
              <Heart className="h-6 w-6" fill="currentColor" />
            </div>
            <div>
              <div
                className="text-sm font-semibold uppercase tracking-wide text-foreground/60"
                data-testid="brand-kicker"
              >
                Totem
              </div>
              <div className="text-2xl font-bold" data-testid="brand-title">
                Amor por Fotos
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            className="no-print rounded-2xl px-4 py-3 text-base"
            onClick={() => navigate("/admin")}
            data-testid="open-admin-button"
          >
            <Settings className="h-5 w-5" />
            Ajustes
          </Button>
        </div>

        <motion.div
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mt-12"
        >
          <h1
            className="text-6xl font-extrabold tracking-tight"
            data-testid="kiosk-home-headline"
          >
            Suas fotos reveladas
            <span className="text-primary"> na hora</span>.
          </h1>
          <p
            className="mt-5 max-w-[54ch] text-xl text-foreground/70"
            data-testid="kiosk-home-subtitle"
          >
            Toque para gerar um QR Code. Envie do celular e retire as fotos
            impressas junto do comprovante.
          </p>
        </motion.div>

        <div className="mt-10 grid grid-cols-1 gap-6">
          <Card className="glass rounded-[28px] border-black/5 bg-white/70 shadow-xl">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 gap-6">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground shadow-md">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-xl font-bold" data-testid="kiosk-home-step-title">
                      Pronto para começar?
                    </div>
                    <div
                      className="mt-2 text-base text-foreground/70"
                      data-testid="kiosk-home-step-description"
                    >
                      Você vai escanear, enviar e imprimir — sem complicação.
                    </div>
                  </div>
                </div>

                <Button
                  onClick={onStart}
                  className="h-auto w-full rounded-full bg-primary px-10 py-8 text-2xl font-extrabold tracking-wide text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
                  data-testid="kiosk-home-start-button"
                >
                  Toque para começar
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            <div
              className="rounded-3xl border border-black/5 bg-white/80 p-6 shadow-sm"
              data-testid="kiosk-home-tip-1"
            >
              <div className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
                Dica
              </div>
              <div className="mt-1 text-lg font-semibold">
                Envie quantas fotos quiser (quanto mais, mais rápido se organizar).
              </div>
            </div>
            <div
              className="rounded-3xl border border-black/5 bg-white/80 p-6 shadow-sm"
              data-testid="kiosk-home-tip-2"
            >
              <div className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
                Atenção
              </div>
              <div className="mt-1 text-lg font-semibold">
                Fotos HEIC/HEIF serão convertidas automaticamente no celular.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-8 text-sm text-foreground/50" data-testid="kiosk-home-footer">
          Se a janela de impressão aparecer, confirme para iniciar a revelação.
        </div>
      </div>
    </div>
  );
}
